import { getDbPool } from '../config/db.js';

/**
 * Get user's inbox items (files shared directly with them)
 */
export async function getInbox(req, res, next) {
  try {
    const userId = req.user.id;
    const { filter = 'all' } = req.query; // all, unread, pinned, archived
    const db = getDbPool();

    let statusCondition = "r.status IN ('active', 'pinned')";
    if (filter === 'archived') {
      statusCondition = "r.status = 'archived'";
    } else if (filter === 'pinned') {
      statusCondition = "r.status = 'pinned'";
    } else if (filter === 'unread') {
      statusCondition = "r.status IN ('active', 'pinned') AND r.is_read = 0";
    }

    const [rows] = await db.query(
      `SELECT r.id AS inbox_id, r.status, r.is_read, r.is_downloaded, r.downloaded_at, r.created_at AS received_at,
              s.id AS session_id, s.share_token, s.total_size_bytes, s.file_count, s.note, s.expires_at, s.is_revoked,
              s.download_count,
              u.id AS sender_id, u.username AS sender_username, u.display_name AS sender_display_name, u.avatar_color AS sender_avatar
       FROM share_recipients r
       JOIN share_sessions s ON r.session_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE r.recipient_user_id = ? AND ${statusCondition}
       ORDER BY r.status = 'pinned' DESC, r.created_at DESC`,
      [userId]
    );

    // If there are inbox items, retrieve file list for each
    const sessionIds = [...new Set(rows.map((r) => r.session_id))];
    let fileMap = new Map();

    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const [files] = await db.query(
        `SELECT id, session_id, original_name, file_size, mime_type, sha256_hash, created_at
         FROM share_files
         WHERE session_id IN (${placeholders}) AND is_deleted = 0`,
        sessionIds
      );

      for (const f of files) {
        if (!fileMap.has(f.session_id)) {
          fileMap.set(f.session_id, []);
        }
        fileMap.get(f.session_id).push({
          id: f.id,
          name: f.original_name,
          size: f.file_size,
          mimeType: f.mime_type,
          sha256: f.sha256_hash
        });
      }
    }

    const items = rows.map((r) => {
      const isExpired = new Date(r.expires_at) < new Date();
      return {
        id: r.inbox_id,
        shareToken: r.share_token,
        status: r.status,
        isRead: Boolean(r.is_read),
        isDownloaded: Boolean(r.is_downloaded),
        downloadedAt: r.downloaded_at,
        receivedAt: r.received_at,
        expiresAt: r.expires_at,
        isExpired,
        isRevoked: Boolean(r.is_revoked),
        totalSizeBytes: r.total_size_bytes,
        fileCount: r.file_count,
        note: r.note,
        sender: {
          id: r.sender_id,
          username: r.sender_username || 'Guest',
          displayName: r.sender_display_name || 'Guest User',
          avatarColor: r.sender_avatar || '#e11d48'
        },
        files: fileMap.get(r.session_id) || []
      };
    });

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an inbox item (mark as read, pin, archive)
 */
export async function updateInboxItem(req, res, next) {
  try {
    const { id } = req.params;
    const { status, isRead } = req.body;
    const db = getDbPool();

    const updates = [];
    const params = [];

    if (typeof isRead === 'boolean' || typeof isRead === 'number') {
      updates.push('is_read = ?');
      params.push(isRead ? 1 : 0);
    }

    if (status && ['active', 'pinned', 'archived'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided to update.' });
    }

    params.push(id, req.user.id);
    const [result] = await db.query(
      `UPDATE share_recipients SET ${updates.join(', ')} WHERE id = ? AND recipient_user_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Inbox item not found.' });
    }

    return res.json({
      success: true,
      message: 'Inbox item updated.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove an item from the user's Inbox
 * IMPORTANT: This removes ONLY the recipient's view and NEVER deletes the sender's original file!
 */
export async function removeInboxItem(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDbPool();

    // Verify ownership and delete recipient record
    const [result] = await db.query(
      `DELETE FROM share_recipients WHERE id = ? AND recipient_user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Inbox item not found.' });
    }

    return res.json({
      success: true,
      message: 'Item removed from your inbox. The original file remains safe with the sender.'
    });
  } catch (err) {
    next(err);
  }
}
