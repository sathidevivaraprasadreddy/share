import path from 'path';
import { getDbPool } from '../config/db.js';
import storageService from '../services/storageService.js';
import { sanitizeFilename } from '../utils/fileSecurity.js';

/**
 * Get all files uploaded by the logged-in user
 */
export async function getMyFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const { category = 'all', search = '', sort = 'date_desc' } = req.query;
    const db = getDbPool();

    let isDeletedFilter = 'f.is_deleted = 0';
    if (category === 'trash') {
      isDeletedFilter = 'f.is_deleted = 1';
    }

    let mimeCondition = '';
    if (category === 'images') {
      mimeCondition = "AND (f.mime_type LIKE 'image/%')";
    } else if (category === 'documents') {
      mimeCondition = "AND (f.mime_type LIKE '%pdf%' OR f.mime_type LIKE '%word%' OR f.mime_type LIKE '%text%' OR f.mime_type LIKE '%document%')";
    } else if (category === 'media') {
      mimeCondition = "AND (f.mime_type LIKE 'audio/%' OR f.mime_type LIKE 'video/%')";
    } else if (category === 'archives') {
      mimeCondition = "AND (f.mime_type LIKE '%zip%' OR f.mime_type LIKE '%tar%' OR f.mime_type LIKE '%rar%' OR f.mime_type LIKE '%7z%')";
    }

    let searchCondition = '';
    const params = [userId];

    if (search && search.trim().length > 0) {
      searchCondition = 'AND f.original_name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    let orderClause = 'f.created_at DESC';
    if (sort === 'date_asc') orderClause = 'f.created_at ASC';
    else if (sort === 'name_asc') orderClause = 'f.original_name ASC';
    else if (sort === 'size_desc') orderClause = 'f.file_size DESC';
    else if (sort === 'size_asc') orderClause = 'f.file_size ASC';

    const [files] = await db.query(
      `SELECT f.id, f.session_id, f.original_name, f.stored_name, f.file_size, f.mime_type, 
              f.sha256_hash, f.is_deleted, f.created_at,
              s.share_token, s.revoke_token, s.six_code, s.expires_at, s.is_revoked, s.download_count
       FROM share_files f
       JOIN share_sessions s ON f.session_id = s.id
       WHERE f.user_id = ? AND ${isDeletedFilter} ${mimeCondition} ${searchCondition}
       ORDER BY ${orderClause}`,
      params
    );

    const items = files.map((f) => {
      const isExpired = new Date(f.expires_at) < new Date();
      return {
        id: f.id,
        sessionId: f.session_id,
        name: f.original_name,
        size: f.file_size,
        mimeType: f.mime_type,
        sha256: f.sha256_hash,
        isDeleted: Boolean(f.is_deleted),
        createdAt: f.created_at,
        shareToken: f.share_token,
        revokeToken: f.revoke_token,
        sixCode: f.six_code,
        expiresAt: f.expires_at,
        isExpired,
        isRevoked: Boolean(f.is_revoked),
        downloadCount: f.download_count
      };
    });

    return res.json({
      success: true,
      count: items.length,
      files: items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Rename an uploaded file
 */
export async function renameFile(req, res, next) {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide a valid new file name.' });
    }

    const cleanName = sanitizeFilename(newName.trim());
    const db = getDbPool();

    const [result] = await db.query(
      `UPDATE share_files SET original_name = ? WHERE id = ? AND user_id = ?`,
      [cleanName, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
    }

    return res.json({
      success: true,
      message: 'File renamed successfully.',
      newName: cleanName
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a file (move to trash or permanent delete)
 */
export async function deleteFile(req, res, next) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const db = getDbPool();

    // Check file ownership
    const [files] = await db.query(
      `SELECT id, stored_name, file_size, is_deleted FROM share_files WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
    }

    const file = files[0];

    // If permanent or already in trash, purge completely
    if (permanent === 'true' || file.is_deleted === 1) {
      await storageService.deleteFile(file.stored_name);
      await db.query(`DELETE FROM share_files WHERE id = ?`, [file.id]);
      await db.query(
        `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?`,
        [file.file_size, req.user.id]
      );

      return res.json({
        success: true,
        message: 'File permanently deleted from storage.'
      });
    }

    // Move to trash
    await db.query(`UPDATE share_files SET is_deleted = 1 WHERE id = ?`, [file.id]);

    return res.json({
      success: true,
      message: 'File moved to trash. You can restore it or delete it permanently.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Restore file from trash
 */
export async function restoreFile(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDbPool();

    const [result] = await db.query(
      `UPDATE share_files SET is_deleted = 0 WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'File not found in trash.' });
    }

    return res.json({
      success: true,
      message: 'File restored from trash.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get user storage usage statistics
 */
export async function getStorageStats(req, res, next) {
  try {
    const db = getDbPool();
    const [users] = await db.query(
      `SELECT storage_quota_bytes, storage_used_bytes FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const { storage_quota_bytes, storage_used_bytes } = users[0];
    const percentage = Math.min(
      100,
      Math.round((storage_used_bytes / storage_quota_bytes) * 100)
    );

    return res.json({
      success: true,
      quotaBytes: storage_quota_bytes,
      usedBytes: storage_used_bytes,
      availableBytes: Math.max(0, storage_quota_bytes - storage_used_bytes),
      percentageUsed: percentage
    });
  } catch (err) {
    next(err);
  }
}
