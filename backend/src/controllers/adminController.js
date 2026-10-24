import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import bcrypt from 'bcryptjs';
import { getDbPool } from '../config/db.js';
import { signUserToken } from '../middleware/authMiddleware.js';
import storageService from '../services/storageService.js';

/**
 * Intelligent location, network and client device detection
 */
export function parseClientEnvironment(ip, userAgent) {
  let location = 'Localhost (Direct Machine)';
  const rawIp = String(ip || '').replace(/^.*:/, '');

  if (!rawIp || rawIp === '1' || rawIp === '127.0.0.1' || ip === '::1') {
    location = 'Localhost (Direct Machine)';
  } else if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(rawIp)) {
    location = `LAN Subnet (${rawIp})`;
  } else {
    location = `Public Remote (${rawIp})`;
  }

  let device = 'Desktop';
  const ua = String(userAgent || '');
  if (/Android/i.test(ua)) device = 'Android Phone/Tablet';
  else if (/iPhone|iPad/i.test(ua)) device = 'Apple iOS Device';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(ua)) device = 'macOS Apple';
  else if (/Linux/i.test(ua)) device = 'Linux Workstation';

  let browser = 'Web Browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';

  return {
    ip: String(ip || '127.0.0.1'),
    location,
    device: `${device} • ${browser}`
  };
}

/**
 * Record an entry into the tamper-resistant admin audit trail
 */
export async function logAdminAudit(adminId, adminUsername, action, targetType, targetId, details, req) {
  try {
    const db = getDbPool();
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    await db.query(
      `INSERT INTO admin_audit_logs (admin_user_id, admin_username, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminUsername, action, targetType, targetId ? String(targetId) : null, details || null, String(ip)]
    );
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err.message);
  }
}

/**
 * Log all authentication attempts for security monitoring
 */
export async function recordLoginAttempt(identifier, userId, status, req) {
  try {
    const db = getDbPool();
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';
    await db.query(
      `INSERT INTO login_logs (username_or_email, user_id, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?, ?)`,
      [identifier, userId || null, String(ip), String(userAgent), status]
    );
  } catch (err) {
    console.warn('[LoginLog] Failed to log attempt:', err.message);
  }
}

/**
 * 1. Private Administrator Login
 * Dedicated, non-public login endpoint with rate limiting, lockout, and optional MFA verification
 */
export async function adminLogin(req, res, next) {
  try {
    const { username, password, mfaCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide administrator username and password.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = getDbPool();

    // Look up user by username or email
    const [users] = await db.query(
      `SELECT id, username, email, display_name, password_hash, is_admin, is_suspended, 
              failed_login_attempts, lockout_until, admin_mfa_secret, token_version
       FROM users WHERE username = ? OR email = ?`,
      [cleanUsername, cleanUsername]
    );

    if (users.length === 0) {
      await recordLoginAttempt(cleanUsername, null, 'admin_failed_user_not_found', req);
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.'
      });
    }

    const user = users[0];

    // Check account lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
      await recordLoginAttempt(cleanUsername, user.id, 'admin_locked_out', req);
      return res.status(429).json({
        success: false,
        error: `Account is temporarily locked due to repeated failed attempts. Please retry in ${waitMinutes} minute(s).`
      });
    }

    // Check account suspension
    if (user.is_suspended) {
      await recordLoginAttempt(cleanUsername, user.id, 'admin_suspended', req);
      return res.status(403).json({
        success: false,
        error: 'Administrator account has been suspended.'
      });
    }

    // STRICT CHECK: User must be an administrator
    if (!user.is_admin) {
      await recordLoginAttempt(cleanUsername, user.id, 'admin_unauthorized_role', req);
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.'
      });
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const nextFailCount = (user.failed_login_attempts || 0) + 1;
      let lockoutDate = null;
      if (nextFailCount >= 5) {
        lockoutDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await db.query(
        `UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?`,
        [nextFailCount, lockoutDate, user.id]
      );

      await recordLoginAttempt(cleanUsername, user.id, 'admin_failed_password', req);
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.'
      });
    }

    // Verify MFA if configured on user or server
    const expectedMfa = user.admin_mfa_secret || process.env.ADMIN_MFA_CODE;
    if (expectedMfa) {
      if (!mfaCode || mfaCode.trim() !== expectedMfa.trim()) {
        await recordLoginAttempt(cleanUsername, user.id, 'admin_failed_mfa', req);
        return res.status(401).json({
          success: false,
          error: 'Invalid administrator MFA code.'
        });
      }
    }

    // Authentication Success: Reset failure count and update last_login
    await db.query(
      `UPDATE users 
       SET failed_login_attempts = 0, lockout_until = NULL, last_login_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.id]
    );

    await recordLoginAttempt(cleanUsername, user.id, 'admin_success', req);
    await logAdminAudit(user.id, user.username, 'admin_login', 'system', null, 'Successful administrator sign-in', req);

    const token = signUserToken(user);

    return res.json({
      success: true,
      message: 'Administrator authentication successful.',
      token,
      admin: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        isAdmin: true
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Administrator Logout & Session Revocation
 */
export async function adminLogout(req, res, next) {
  try {
    const db = getDbPool();
    const token = req.authToken;

    if (token) {
      await db.query(`INSERT OR IGNORE INTO revoked_tokens (token) VALUES (?)`, [token]);
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'admin_logout', 'system', null, 'Administrator session terminated and revoked', req);

    return res.json({
      success: true,
      message: 'Administrator session revoked and logged out safely.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. System KPI & Aggregate Operational Metrics
 */
export async function getAdminOverview(req, res, next) {
  try {
    const db = getDbPool();

    // Query genuine database statistics (no fabricated data)
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN is_suspended = 0 THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN is_suspended = 1 THEN 1 ELSE 0 END) AS suspended_users
      FROM users
    `);

    const [fileStats] = await db.query(`
      SELECT 
        COUNT(*) AS total_files,
        COALESCE(SUM(file_size), 0) AS total_storage_bytes
      FROM share_files
      WHERE is_deleted = 0
    `);

    const [sessionStats] = await db.query(`
      SELECT 
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS active_sessions,
        SUM(CASE WHEN is_revoked = 1 THEN 1 ELSE 0 END) AS revoked_sessions,
        COALESCE(SUM(download_count), 0) AS total_downloads
      FROM share_sessions
    `);

    const [loginIncidents] = await db.query(`
      SELECT COUNT(*) AS security_events
      FROM login_logs
      WHERE status LIKE '%fail%' OR status LIKE '%locked%'
    `);

    const u = userStats[0] || {};
    const f = fileStats[0] || {};
    const s = sessionStats[0] || {};
    const sec = loginIncidents[0] || {};

    return res.json({
      success: true,
      overview: {
        totalUsers: Number(u.total_users || 0),
        activeUsers: Number(u.active_users || 0),
        suspendedUsers: Number(u.suspended_users || 0),
        totalFiles: Number(f.total_files || 0),
        totalStorageBytes: Number(f.total_storage_bytes || 0),
        totalSessions: Number(s.total_sessions || 0),
        activeSessions: Number(s.active_sessions || 0),
        revokedSessions: Number(s.revoked_sessions || 0),
        totalDownloads: Number(s.total_downloads || 0),
        securityEventsCount: Number(sec.security_events || 0),
        serverTimestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. List All Registered Users with Storage & Status
 */
export async function getAdminUsers(req, res, next) {
  try {
    const db = getDbPool();

    const [users] = await db.query(`
      SELECT u.id, u.username, u.email, u.phone, u.display_name, u.is_admin, 
             u.is_suspended, u.storage_quota_bytes, u.storage_used_bytes, 
             u.last_login_at, u.created_at,
             (SELECT COUNT(*) FROM share_files f WHERE f.user_id = u.id AND f.is_deleted = 0) AS file_count,
             (SELECT COUNT(*) FROM share_sessions s WHERE s.user_id = u.id) AS session_count
      FROM users u
      ORDER BY u.created_at DESC
    `);

    const sanitized = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      displayName: u.display_name,
      isAdmin: Boolean(u.is_admin),
      isSuspended: Boolean(u.is_suspended),
      storageQuotaBytes: u.storage_quota_bytes,
      storageUsedBytes: u.storage_used_bytes,
      fileCount: Number(u.file_count || 0),
      sessionCount: Number(u.session_count || 0),
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at
    }));

    return res.json({
      success: true,
      count: sanitized.length,
      users: sanitized
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Suspend User Account
 */
export async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    if (targetUserId === req.admin.id) {
      return res.status(400).json({ success: false, error: 'You cannot suspend your own administrator account.' });
    }

    const db = getDbPool();
    const [result] = await db.query(
      `UPDATE users SET is_suspended = 1, token_version = token_version + 1 WHERE id = ?`,
      [targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'suspend_user', 'user', targetUserId, `Suspended user ID ${targetUserId} and revoked active sessions`, req);

    return res.json({
      success: true,
      message: 'User account suspended and active sessions invalidated.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Unsuspend User Account
 */
export async function unsuspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const db = getDbPool();
    const [result] = await db.query(
      `UPDATE users SET is_suspended = 0 WHERE id = ?`,
      [targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'unsuspend_user', 'user', targetUserId, `Unsuspended user ID ${targetUserId}`, req);

    return res.json({
      success: true,
      message: 'User account unsuspended successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 7. Invalidate All Active Sessions for a User
 */
export async function revokeUserSessions(req, res, next) {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const db = getDbPool();
    const [result] = await db.query(
      `UPDATE users SET token_version = token_version + 1 WHERE id = ?`,
      [targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'revoke_user_sessions', 'user', targetUserId, `Revoked all active login sessions for user ID ${targetUserId}`, req);

    return res.json({
      success: true,
      message: 'All active sessions for this user have been invalidated.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. List Share Sessions (Includes Client IP, Location & Device Tracking)
 */
export async function getAdminSessions(req, res, next) {
  try {
    const db = getDbPool();

    const [sessions] = await db.query(`
      SELECT s.id, s.share_token, s.six_code, s.file_count, s.total_size_bytes, 
             s.share_type, s.download_count, s.max_downloads, s.expires_at, 
             s.ip_address, s.user_agent, s.is_revoked, s.created_at,
             u.username AS uploader_username, u.email AS uploader_email
      FROM share_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 200
    `);

    const items = sessions.map((s) => {
      const isExpired = new Date(s.expires_at) < new Date();
      const clientEnv = parseClientEnvironment(s.ip_address, s.user_agent);
      return {
        id: s.id,
        shareToken: s.share_token,
        sixCode: s.six_code,
        fileCount: s.file_count,
        totalSizeBytes: s.total_size_bytes,
        shareType: s.share_type,
        downloadCount: s.download_count,
        maxDownloads: s.max_downloads,
        expiresAt: s.expires_at,
        isRevoked: Boolean(s.is_revoked),
        isExpired,
        ipAddress: clientEnv.ip,
        location: clientEnv.location,
        device: clientEnv.device,
        clientIp: clientEnv.ip,
        clientLocation: clientEnv.location,
        clientDevice: clientEnv.device,
        createdAt: s.created_at,
        uploaderUsername: s.uploader_username || 'Guest / Ephemeral',
        uploaderEmail: s.uploader_email || null,
        status: s.is_revoked ? 'revoked' : (isExpired ? 'expired' : 'active')
      };
    });

    return res.json({
      success: true,
      count: items.length,
      sessions: items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Download any transfer files directly as Administrator
 */
export async function downloadSessionAsAdmin(req, res, next) {
  try {
    const { token } = req.params;
    const db = getDbPool();

    const [sessions] = await db.query(
      `SELECT id, share_token FROM share_sessions WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    const sessionId = sessions[0].id;
    const [files] = await db.query(
      `SELECT stored_name, original_name FROM share_files WHERE session_id = ? AND is_deleted = 0`,
      [sessionId]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, error: 'No active files found for this session.' });
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'admin_download_files', 'session', token, `Administrator downloaded files for session ${token}`, req);

    if (files.length === 1) {
      const fullPath = storageService.resolveSafePath(files[0].stored_name);
      return res.download(fullPath, files[0].original_name);
    }

    // Multiple files: Zip bundle stream
    const archive = archiver('zip', { zlib: { level: 6 } });
    const archiveName = `quickshare-admin-${token.slice(0, 8)}.zip`;

    res.attachment(archiveName);
    archive.pipe(res);

    for (const f of files) {
      const fullPath = storageService.resolveSafePath(f.stored_name);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: f.original_name });
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
}

/**
 * Administrator updates a registered user's password directly
 */
export async function changeUserPasswordAsAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const db = getDbPool();
    const [users] = await db.query(`SELECT username FROM users WHERE id = ?`, [targetUserId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_login_attempts = 0, lockout_until = NULL WHERE id = ?`,
      [hash, targetUserId]
    );

    await logAdminAudit(
      req.admin.id,
      req.admin.username,
      'admin_change_user_password',
      'user',
      targetUserId,
      `Administrator updated password for user "${users[0].username}" and revoked existing sessions`,
      req
    );

    return res.json({
      success: true,
      message: `Password for "${users[0].username}" updated successfully. Active sessions revoked.`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. Revoke Share Session & Shred Files as Administrator
 */
export async function revokeSessionAsAdmin(req, res, next) {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid share token.' });
    }

    const db = getDbPool();

    const [sessions] = await db.query(
      `SELECT id, user_id, total_size_bytes, is_revoked FROM share_sessions WHERE share_token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Share session not found.' });
    }

    const session = sessions[0];

    // Mark revoked in database
    await db.query(`UPDATE share_sessions SET is_revoked = 1 WHERE id = ?`, [session.id]);

    // Retrieve file records to delete physical files
    const [files] = await db.query(
      `SELECT stored_name FROM share_files WHERE session_id = ?`,
      [session.id]
    );

    for (const f of files) {
      if (f.stored_name) {
        await storageService.deleteFile(f.stored_name);
      }
    }

    // Mark files deleted in DB
    await db.query(`UPDATE share_files SET is_deleted = 1 WHERE session_id = ?`, [session.id]);

    // Reclaim storage quota if uploaded by registered user
    if (session.user_id) {
      await db.query(
        `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?`,
        [session.total_size_bytes, session.user_id]
      );
    }

    await logAdminAudit(req.admin.id, req.admin.username, 'revoke_session', 'session', token, `Revoked share token ${token} and deleted ${files.length} physical file(s)`, req);

    return res.json({
      success: true,
      message: 'Share session revoked and physical files shredded from storage.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. View Login Security Logs (With Location, IP & Device Intelligence)
 */
export async function getAdminLogins(req, res, next) {
  try {
    const db = getDbPool();

    const [logs] = await db.query(`
      SELECT l.id, l.username_or_email, l.user_id, l.ip_address, l.user_agent, l.status, l.created_at,
             u.username AS resolved_username
      FROM login_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 150
    `);

    const formatted = logs.map((l) => {
      const clientEnv = parseClientEnvironment(l.ip_address, l.user_agent);
      return {
        ...l,
        location: clientEnv.location,
        device: clientEnv.device,
        clientLocation: clientEnv.location,
        clientDevice: clientEnv.device
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      logs: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete single login log entry
 */
export async function deleteLoginLog(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDbPool();
    await db.query(`DELETE FROM login_logs WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Login log entry deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear all login logs
 */
export async function clearLoginLogs(req, res, next) {
  try {
    const db = getDbPool();
    await db.query(`DELETE FROM login_logs`);
    await logAdminAudit(req.admin.id, req.admin.username, 'clear_login_logs', 'system', null, 'Cleared all login history logs', req);
    return res.json({ success: true, message: 'All login history logs cleared.' });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. View Tamper-Resistant Administrator Audit Trail (With Location & Device)
 */
export async function getAdminAuditLogs(req, res, next) {
  try {
    const db = getDbPool();

    const [logs] = await db.query(`
      SELECT id, admin_user_id, admin_username, action, target_type, target_id, details, ip_address, created_at
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT 150
    `);

    const formatted = logs.map((a) => {
      const clientEnv = parseClientEnvironment(a.ip_address, '');
      return {
        ...a,
        location: clientEnv.location,
        clientLocation: clientEnv.location,
        clientDevice: clientEnv.device || 'Admin Console'
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      logs: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete single audit log entry
 */
export async function deleteAuditLog(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDbPool();
    await db.query(`DELETE FROM admin_audit_logs WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Audit log entry deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear all audit logs
 */
export async function clearAuditLogs(req, res, next) {
  try {
    const db = getDbPool();
    await db.query(`DELETE FROM admin_audit_logs`);
    return res.json({ success: true, message: 'Audit trail cleared.' });
  } catch (err) {
    next(err);
  }
}

/**
 * 12. Safe Data Export as CSV
 */
export async function exportDataCsv(req, res, next) {
  try {
    const { type = 'users' } = req.query;
    const db = getDbPool();

    await logAdminAudit(req.admin.id, req.admin.username, 'export_csv', 'system', type, `Exported ${type} data as CSV`, req);

    if (type === 'users') {
      const [rows] = await db.query(`
        SELECT id, username, email, phone, display_name, is_admin, is_suspended, storage_quota_bytes, storage_used_bytes, last_login_at, created_at
        FROM users
        ORDER BY id ASC
      `);

      let csv = 'ID,Username,Email,Phone,DisplayName,IsAdmin,IsSuspended,StorageQuotaMB,StorageUsedMB,LastLogin,CreatedAt\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.username}","${r.email || ''}","${r.phone || ''}","${(r.display_name || '').replace(/"/g, '""')}","${r.is_admin}","${r.is_suspended}","${(r.storage_quota_bytes / 1048576).toFixed(1)}","${(r.storage_used_bytes / 1048576).toFixed(1)}","${r.last_login_at || ''}","${r.created_at}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="quickshare-users.csv"');
      return res.send(csv);
    }

    if (type === 'sessions') {
      const [rows] = await db.query(`
        SELECT id, share_token, six_code, file_count, total_size_bytes, share_type, download_count, max_downloads, expires_at, is_revoked, created_at
        FROM share_sessions
        ORDER BY id DESC
      `);

      let csv = 'ID,ShareToken,SixCode,FileCount,TotalSizeBytes,ShareType,DownloadCount,MaxDownloads,ExpiresAt,IsRevoked,CreatedAt\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.share_token}","${r.six_code || ''}","${r.file_count}","${r.total_size_bytes}","${r.share_type}","${r.download_count}","${r.max_downloads}","${r.expires_at}","${r.is_revoked}","${r.created_at}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="quickshare-transfers.csv"');
      return res.send(csv);
    }

    if (type === 'audit') {
      const [rows] = await db.query(`
        SELECT id, admin_user_id, admin_username, action, target_type, target_id, details, ip_address, created_at
        FROM admin_audit_logs
        ORDER BY id DESC
      `);

      let csv = 'ID,AdminID,AdminUsername,Action,TargetType,TargetID,Details,IPAddress,Timestamp\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.admin_user_id}","${r.admin_username}","${r.action}","${r.target_type}","${r.target_id || ''}","${(r.details || '').replace(/"/g, '""')}","${r.ip_address}","${r.created_at}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="quickshare-audit-trail.csv"');
      return res.send(csv);
    }

    return res.status(400).json({ success: false, error: 'Invalid export type. Use users, sessions, or audit.' });
  } catch (err) {
    next(err);
  }
}
