import bcrypt from 'bcryptjs';
import { getDbPool } from '../config/db.js';
import {
  generateShareToken,
  generateRevokeToken,
  generateSixDigitCode,
  sanitizeFilename,
  calculateFileHash
} from '../utils/fileSecurity.js';
import storageService from '../services/storageService.js';
import path from 'path';

/**
 * Look up a transfer session using a 6-digit transfer code
 */
export async function lookupSixDigitCode(req, res, next) {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit transfer code.'
      });
    }

    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        error: 'Code must be exactly 6 digits.'
      });
    }

    const db = getDbPool();

    // Query session by 6-digit code
    const [sessions] = await db.query(
      `SELECT id, share_token, total_size_bytes, file_count, expires_at, is_revoked, 
              failed_code_attempts, password_hash, download_count, max_downloads, note
       FROM share_sessions
       WHERE six_code = ?`,
      [cleanCode]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer code not found or has expired.'
      });
    }

    const session = sessions[0];

    // Check brute force protection
    if (session.failed_code_attempts >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. This transfer code has been temporarily locked.'
      });
    }

    // Check revocation
    if (session.is_revoked) {
      return res.status(410).json({
        success: false,
        isRevoked: true,
        error: 'This transfer session was revoked by the sender.'
      });
    }

    // Check expiry
    const isExpired = new Date(session.expires_at) < new Date();
    if (isExpired) {
      return res.status(410).json({
        success: false,
        isExpired: true,
        error: 'This transfer session has expired.'
      });
    }

    // Check download limit
    if (session.max_downloads > 0 && session.download_count >= session.max_downloads) {
      return res.status(410).json({
        success: false,
        error: 'This transfer has reached its maximum download limit.'
      });
    }

    return res.json({
      success: true,
      shareToken: session.share_token,
      fileCount: session.file_count,
      totalSizeBytes: session.total_size_bytes,
      expiresAt: session.expires_at,
      note: session.note,
      isPasswordRequired: Boolean(session.password_hash)
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify password for protected share sessions
 */
export async function verifySharePassword(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to unlock this transfer.'
      });
    }

    const db = getDbPool();
    const [sessions] = await db.query(
      `SELECT id, password_hash, is_revoked, expires_at FROM share_sessions WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Transfer not found.' });
    }

    const session = sessions[0];
    if (session.is_revoked || new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Transfer has expired or was revoked.' });
    }

    if (!session.password_hash) {
      return res.json({ success: true, message: 'No password required.' });
    }

    const match = await bcrypt.compare(password, session.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Access denied.'
      });
    }

    return res.json({
      success: true,
      message: 'Password verified successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Direct User Sharing: Send files into recipient users' Inboxes
 */
export async function createDirectShare(req, res, next) {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please select at least one file to share.'
    });
  }

  const { recipients, note, expiryHours, password } = req.body;
  if (!recipients) {
    return res.status(400).json({
      success: false,
      error: 'Please specify at least one recipient username.'
    });
  }

  // Parse recipient usernames (supports array or comma-separated string)
  const recipientList = Array.isArray(recipients)
    ? recipients.map((r) => r.trim().toLowerCase())
    : recipients
        .split(',')
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);

  if (recipientList.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please specify valid recipient usernames.'
    });
  }

  const db = getDbPool();

  // Look up recipient users in database
  const placeholders = recipientList.map(() => '?').join(',');
  const [recipientUsers] = await db.query(
    `SELECT id, username, display_name FROM users WHERE username IN (${placeholders})`,
    recipientList
  );

  if (recipientUsers.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'None of the specified recipient usernames were found.'
    });
  }

  const senderId = req.user ? req.user.id : null;
  const senderName = req.user ? (req.user.display_name || req.user.username) : 'Guest User';

  let expHours = parseInt(expiryHours, 10);
  if (![1, 6, 24, 72, 168].includes(expHours)) {
    expHours = 72; // default 3 days for direct user shares
  }

  const expiresAt = new Date(Date.now() + expHours * 60 * 60 * 1000);
  const shareToken = generateShareToken();
  const revokeToken = generateRevokeToken();
  const sixCode = generateSixDigitCode();
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  let totalSizeBytes = 0;
  for (const f of files) totalSizeBytes += f.size;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Create share_session record
    const [sessionResult] = await connection.query(
      `INSERT INTO share_sessions 
       (user_id, share_token, revoke_token, six_code, password_hash, total_size_bytes, 
        file_count, share_type, note, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'direct', ?, ?)`,
      [
        senderId,
        shareToken,
        revokeToken,
        sixCode,
        passwordHash,
        totalSizeBytes,
        files.length,
        note ? note.trim() : null,
        expiresAt
      ]
    );

    const sessionId = sessionResult.insertId;

    // 2. Insert share_files records with SHA-256 calculation
    for (const f of files) {
      const originalName = f.sanitizedOriginalName || sanitizeFilename(f.originalname);
      const storedName = f.filename;
      const mimeType = f.mimetype || 'application/octet-stream';

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
          senderId,
          originalName,
          storedName,
          storedName,
          f.size,
          mimeType,
          sha256,
          storageService.driver
        ]
      );

      await storageService.persistUploadedFile(storedName, mimeType);
    }

    // 3. Insert share_recipients records and notifications
    for (const recipient of recipientUsers) {
      await connection.query(
        `INSERT INTO share_recipients (session_id, recipient_user_id, status)
         VALUES (?, ?, 'active')`,
        [sessionId, recipient.id]
      );

      // In-app notification for recipient
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'transfer_received', ?)`,
        [
          recipient.id,
          `New file transfer from ${senderName}`,
          `${senderName} shared ${files.length} file(s) with you (${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB).`,
          `/share/${shareToken}`
        ]
      );
    }

    // 4. Update user storage used if authenticated
    if (senderId) {
      await connection.query(
        `UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?`,
        [totalSizeBytes, senderId]
      );

      // Audit log entry
      await connection.query(
        `INSERT INTO activity_logs (user_id, session_id, event_type, details)
         VALUES (?, ?, 'share_created', ?)`,
        [
          senderId,
          sessionId,
          `Direct transfer to ${recipientUsers.map((r) => r.username).join(', ')}`
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      shareToken,
      revokeToken,
      sixCode,
      recipientCount: recipientUsers.length,
      recipients: recipientUsers.map((r) => ({ id: r.id, username: r.username })),
      fileCount: files.length,
      totalSizeBytes,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    await connection.rollback();
    for (const f of files) {
      if (f.filename) await storageService.deleteFile(f.filename);
    }
    next(err);
  } finally {
    connection.release();
  }
}
