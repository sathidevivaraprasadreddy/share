import path from 'path';
import archiver from 'archiver';
import mime from 'mime-types';
import bcrypt from 'bcryptjs';
import { getDbPool } from '../config/db.js';
import storageService from '../services/storageService.js';
import {
  generateShareToken,
  generateRevokeToken,
  generateSixDigitCode,
  sanitizeFilename,
  calculateFileHash
} from '../utils/fileSecurity.js';

// Allowed expiration periods in hours
const ALLOWED_EXPIRY_HOURS = [1, 6, 24, 72, 168]; // 1 hour, 6 hours, 24 hours (1 day), 3 days, 7 days
const DEFAULT_EXPIRY_HOURS = 24;

/**
 * Create a new sharing session with one or multiple files
 */
export async function createShareSession(req, res, next) {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please select at least one file to upload.'
    });
  }

  // Parse and validate expiry
  let expiryHours = parseInt(req.body.expiryHours, 10);
  if (!ALLOWED_EXPIRY_HOURS.includes(expiryHours)) {
    expiryHours = DEFAULT_EXPIRY_HOURS;
  }

  const { password, maxDownloads, note, burnOnDownload } = req.body;
  let maxDl = parseInt(maxDownloads, 10) || 0;
  if (burnOnDownload === 'true' || burnOnDownload === true) {
    maxDl = 1;
  }
  const passwordHash = password && password.trim().length > 0 ? await bcrypt.hash(password.trim(), 10) : null;

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  const shareToken = generateShareToken();
  const revokeToken = generateRevokeToken();
  const sixCode = generateSixDigitCode();

  let totalSizeBytes = 0;
  for (const f of files) {
    totalSizeBytes += f.size;
  }

  const userId = req.user ? req.user.id : null;

  // Check quota if user is authenticated
  if (req.user) {
    const availableBytes = req.user.storage_quota_bytes - req.user.storage_used_bytes;
    if (totalSizeBytes > availableBytes) {
      // Clean up uploaded files
      for (const f of files) {
        if (f.filename) await storageService.deleteFile(f.filename);
      }
      return res.status(400).json({
        success: false,
        error: `Upload exceeds your available storage quota (${(availableBytes / (1024 * 1024)).toFixed(1)} MB remaining).`
      });
    }
  }

  const db = getDbPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 1. Insert session record
    const [sessionResult] = await connection.query(
      `INSERT INTO share_sessions 
       (user_id, share_token, revoke_token, six_code, password_hash, max_downloads, total_size_bytes, file_count, note, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        shareToken,
        revokeToken,
        sixCode,
        passwordHash,
        maxDl,
        totalSizeBytes,
        files.length,
        note ? note.trim() : null,
        String(clientIp),
        String(userAgent).substring(0, 255),
        expiresAt
      ]
    );

    const sessionId = sessionResult.insertId;

    // 2. Insert file records with SHA-256 calculation
    for (const f of files) {
      const originalName = f.sanitizedOriginalName || sanitizeFilename(f.originalname);
      const storedName = f.filename;
      const mimeType = f.mimetype || mime.lookup(originalName) || 'application/octet-stream';

      let sha256 = null;
      try {
        const fullPath = storageService.resolveSafePath(storedName);
        sha256 = await calculateFileHash(fullPath);
      } catch {}

      await connection.query(
        `INSERT INTO share_files
         (session_id, user_id, original_name, stored_name, file_path, file_size, mime_type, sha256_hash, storage_driver)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          originalName,
          storedName,
          storedName,
          f.size,
          mimeType,
          sha256,
          storageService.driver
        ]
      );

      // Persist to remote S3 storage if configured
      await storageService.persistUploadedFile(storedName, mimeType);
    }

    // 3. Update user storage and log activity if authenticated
    if (userId) {
      await connection.query(
        `UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?`,
        [totalSizeBytes, userId]
      );

      await connection.query(
        `INSERT INTO activity_logs (user_id, session_id, event_type, details)
         VALUES (?, ?, 'upload', ?)`,
        [userId, sessionId, `Uploaded ${files.length} file(s) (${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB)`]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      shareToken,
      revokeToken,
      sixCode,
      expiresAt: expiresAt.toISOString(),
      fileCount: files.length,
      totalSizeBytes,
      isPasswordProtected: Boolean(passwordHash),
      maxDownloads: maxDl
    });
  } catch (err) {
    await connection.rollback();
    // Clean up uploaded files on disk if DB insertion failed
    for (const f of files) {
      if (f.filename) {
        await storageService.deleteFile(f.filename);
      }
    }
    next(err);
  } finally {
    connection.release();
  }
}

/**
 * Get share session metadata and file list by share token
 */
export async function getShareSession(req, res, next) {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid share link.' });
    }

    const db = getDbPool();
    const [sessions] = await db.query(
      `SELECT id, user_id, share_token, six_code, password_hash, max_downloads, 
              total_size_bytes, file_count, note, expires_at, created_at, is_revoked, download_count
       FROM share_sessions
       WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'This sharing link does not exist or has already been deleted.'
      });
    }

    const session = sessions[0];

    // Check if session was revoked by owner
    if (session.is_revoked) {
      return res.status(410).json({
        success: false,
        isRevoked: true,
        error: 'This sharing session has been revoked by the owner.'
      });
    }

    // Check if session has expired
    const isExpired = new Date(session.expires_at) < new Date();
    if (isExpired) {
      return res.status(410).json({
        success: false,
        isExpired: true,
        error: 'This sharing link has expired.'
      });
    }

    // Check download limit
    if (session.max_downloads > 0 && session.download_count >= session.max_downloads) {
      return res.status(410).json({
        success: false,
        error: 'This share link has reached its maximum download limit.'
      });
    }

    // Check password protection
    if (session.password_hash) {
      const providedPassword = req.headers['x-share-password'] || req.query.password;
      if (!providedPassword) {
        return res.json({
          success: true,
          isPasswordRequired: true,
          session: {
            shareToken: session.share_token,
            sixCode: session.six_code,
            fileCount: session.file_count,
            totalSizeBytes: session.total_size_bytes,
            expiresAt: session.expires_at,
            note: session.note
          },
          files: []
        });
      }

      const match = await bcrypt.compare(providedPassword, session.password_hash);
      if (!match) {
        return res.status(401).json({
          success: false,
          isPasswordRequired: true,
          error: 'Incorrect password for this share.'
        });
      }
    }

    // Get files for this session (never expose internal stored_name or file_path)
    const [files] = await db.query(
      `SELECT id, original_name, file_size, mime_type, sha256_hash, created_at
       FROM share_files
       WHERE session_id = ? AND is_deleted = 0
       ORDER BY id ASC`,
      [session.id]
    );

    return res.json({
      success: true,
      isPasswordRequired: false,
      session: {
        shareToken: session.share_token,
        sixCode: session.six_code,
        totalSizeBytes: session.total_size_bytes,
        fileCount: session.file_count,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        downloadCount: session.download_count,
        maxDownloads: session.max_downloads,
        note: session.note
      },
      files: files.map((f) => ({
        id: f.id,
        name: f.original_name,
        size: f.file_size,
        mimeType: f.mime_type,
        sha256: f.sha256_hash,
        createdAt: f.created_at
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Download a single file by file ID within a valid session
 */
export async function downloadSingleFile(req, res, next) {
  try {
    const { token, fileId } = req.params;
    const db = getDbPool();

    // 1. Verify session is active and valid
    const [sessions] = await db.query(
      `SELECT id, user_id, expires_at, is_revoked, max_downloads, download_count, password_hash 
       FROM share_sessions WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Sharing session not found.' });
    }

    const session = sessions[0];
    if (session.is_revoked) {
      return res.status(410).json({ success: false, error: 'Sharing session has been revoked.' });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Sharing link has expired.' });
    }

    if (session.max_downloads > 0 && session.download_count >= session.max_downloads) {
      return res.status(410).json({ success: false, error: 'Maximum download limit reached.' });
    }

    // Check password if set
    if (session.password_hash) {
      const providedPassword = req.headers['x-share-password'] || req.query.password;
      if (!providedPassword || !(await bcrypt.compare(providedPassword, session.password_hash))) {
        return res.status(401).json({ success: false, error: 'Password required or incorrect.' });
      }
    }

    // 2. Fetch file record
    const [files] = await db.query(
      `SELECT id, original_name, stored_name, file_size, mime_type, sha256_hash
       FROM share_files
       WHERE id = ? AND session_id = ? AND is_deleted = 0`,
      [fileId, session.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, error: 'Requested file not found in this session.' });
    }

    const file = files[0];

    // 3. Verify file exists on storage
    const exists = await storageService.fileExists(file.stored_name);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File data is missing from storage.' });
    }

    // 4. Update download count and recipient status
    db.query(`UPDATE share_sessions SET download_count = download_count + 1 WHERE id = ?`, [session.id]).catch(() => {});

    if (req.user) {
      db.query(
        `UPDATE share_recipients SET is_downloaded = 1, downloaded_at = datetime('now') 
         WHERE session_id = ? AND recipient_user_id = ?`,
        [session.id, req.user.id]
      ).catch(() => {});
    }

    // Notify owner if authenticated
    if (session.user_id) {
      db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, 'file_downloaded')`,
        [
          session.user_id,
          'File Downloaded',
          `Your file "${file.original_name}" was downloaded.`
        ]
      ).catch(() => {});
    }

    // 5. Send file with safe content disposition
    const encodedFilename = encodeURIComponent(file.original_name);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (file.sha256_hash) {
      res.setHeader('X-File-SHA256', file.sha256_hash);
    }

    const readStream = await storageService.getFileStream(file.stored_name);
    readStream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream file.' });
      }
    });

    // Auto-purge files immediately if self-destruct limit is reached
    res.on('finish', async () => {
      try {
        if (session.max_downloads > 0 && (session.download_count + 1) >= session.max_downloads) {
          await storageService.deleteFile(file.stored_name);
        }
      } catch (err) {
        console.error('Auto-purge error:', err.message);
      }
    });

    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Download all files in a session bundled into a zip archive
 */
export async function downloadAllFiles(req, res, next) {
  try {
    const { token } = req.params;
    const db = getDbPool();

    // Verify session
    const [sessions] = await db.query(
      `SELECT id, user_id, share_token, expires_at, is_revoked, max_downloads, download_count, password_hash 
       FROM share_sessions WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Sharing session not found.' });
    }

    const session = sessions[0];
    if (session.is_revoked) {
      return res.status(410).json({ success: false, error: 'Sharing session has been revoked.' });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Sharing link has expired.' });
    }

    if (session.max_downloads > 0 && session.download_count >= session.max_downloads) {
      return res.status(410).json({ success: false, error: 'Maximum download limit reached.' });
    }

    // Check password if set
    if (session.password_hash) {
      const providedPassword = req.headers['x-share-password'] || req.query.password;
      if (!providedPassword || !(await bcrypt.compare(providedPassword, session.password_hash))) {
        return res.status(401).json({ success: false, error: 'Password required or incorrect.' });
      }
    }

    // Fetch all files
    const [files] = await db.query(
      `SELECT id, original_name, stored_name, file_size
       FROM share_files
       WHERE session_id = ? AND is_deleted = 0`,
      [session.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, error: 'No files found in this session.' });
    }

    // Update download count
    db.query(`UPDATE share_sessions SET download_count = download_count + 1 WHERE id = ?`, [session.id]).catch(() => {});

    if (req.user) {
      db.query(
        `UPDATE share_recipients SET is_downloaded = 1, downloaded_at = datetime('now') 
         WHERE session_id = ? AND recipient_user_id = ?`,
        [session.id, req.user.id]
      ).catch(() => {});
    }

    const zipFilename = `QuickShare_${token.substring(0, 8)}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const archive = archiver('zip', {
      zlib: { level: 5 } // balanced compression and speed
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to create zip bundle.' });
      }
    });

    archive.pipe(res);

    const seenNames = new Map();

    for (const f of files) {
      const exists = await storageService.fileExists(f.stored_name);
      if (exists) {
        let entryName = f.original_name;
        if (seenNames.has(entryName)) {
          const count = seenNames.get(entryName) + 1;
          seenNames.set(entryName, count);
          const ext = path.extname(entryName);
          const base = path.basename(entryName, ext);
          entryName = `${base} (${count})${ext}`;
        } else {
          seenNames.set(entryName, 0);
        }

        const fileStream = await storageService.getFileStream(f.stored_name);
        archive.append(fileStream, { name: entryName });
      }
    }

    // Auto-purge all files immediately if self-destruct limit is reached
    res.on('finish', async () => {
      try {
        if (session.max_downloads > 0 && (session.download_count + 1) >= session.max_downloads) {
          for (const f of files) {
            if (f.stored_name) await storageService.deleteFile(f.stored_name);
          }
        }
      } catch (err) {
        console.error('Auto-purge error:', err.message);
      }
    });

    await archive.finalize();
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke/delete a share session early using the secret revokeToken or by logged-in owner
 */
export async function revokeShareSession(req, res, next) {
  try {
    let { shareToken, token, revokeToken, code } = req.body;
    let target = (shareToken || token || code || '').trim();
    const cleanRevokeToken = (revokeToken || '').trim();
    const userId = req.user ? req.user.id : null;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'Share link, token, or 6-digit code is required to revoke a session.'
      });
    }

    // Extract token if full URL was pasted
    if (target.includes('/share/')) {
      target = target.split('/share/').pop().split('?')[0].split('#')[0].trim();
    } else if (target.includes('/download/')) {
      target = target.split('/download/').pop().split('/')[0].split('?')[0].trim();
    }

    const db = getDbPool();

    // Query session by share_token OR six_code
    const [sessions] = await db.query(
      `SELECT id, user_id, share_token, revoke_token, is_revoked, total_size_bytes 
       FROM share_sessions 
       WHERE share_token = ? OR six_code = ?`,
      [target, target]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active transfer session found matching this link or code.'
      });
    }

    const session = sessions[0];

    // Check authorization: Must provide matching revokeToken OR be the logged-in session owner
    const isOwner = userId && session.user_id === userId;
    const tokenMatches = cleanRevokeToken && session.revoke_token === cleanRevokeToken;

    if (!tokenMatches && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Invalid authorization token. You do not have permission to revoke this session.'
      });
    }

    if (session.is_revoked) {
      return res.json({
        success: true,
        message: 'This sharing link was already revoked.'
      });
    }

    // Get files to delete from physical storage
    const [files] = await db.query(
      `SELECT stored_name, file_size FROM share_files WHERE session_id = ?`,
      [session.id]
    );

    const storedNames = files.map((f) => f.stored_name);
    await storageService.deleteFiles(storedNames);

    // Mark as revoked in DB
    await db.query(`UPDATE share_sessions SET is_revoked = 1 WHERE id = ?`, [session.id]);

    // Update user storage quota if owned
    if (session.user_id) {
      await db.query(
        `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?`,
        [session.total_size_bytes, session.user_id]
      );

      // Audit log entry
      await db.query(
        `INSERT INTO activity_logs (user_id, session_id, event_type, details)
         VALUES (?, ?, 'revoked', 'Session revoked and files purged from storage')`,
        [session.user_id, session.id]
      );
    }

    return res.json({
      success: true,
      message: 'Sharing link has been revoked and files deleted permanently.'
    });
  } catch (err) {
    next(err);
  }
}
