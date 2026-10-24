import { getDbPool } from '../config/db.js';

/**
 * Get user activity audit timeline
 */
export async function getActivityTimeline(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getDbPool();

    const [logs] = await db.query(
      `SELECT a.id, a.event_type, a.details, a.created_at,
              s.share_token, s.six_code, s.file_count, s.total_size_bytes
       FROM activity_logs a
       LEFT JOIN share_sessions s ON a.session_id = s.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({
      success: true,
      count: logs.length,
      activity: logs.map((l) => ({
        id: l.id,
        eventType: l.event_type,
        details: l.details,
        createdAt: l.created_at,
        shareToken: l.share_token,
        sixCode: l.six_code,
        fileCount: l.file_count,
        totalSizeBytes: l.total_size_bytes
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get in-app notifications
 */
export async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getDbPool();

    const [notifications] = await db.query(
      `SELECT id, title, message, type, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        linkUrl: n.link_url,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDbPool();

    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    const db = getDbPool();

    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    next(err);
  }
}
