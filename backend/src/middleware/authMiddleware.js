import jwt from 'jsonwebtoken';
import { getDbPool } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'quickshare_jwt_super_secure_dev_secret_key_2026';

/**
 * Generate a signed JWT token for an authenticated user
 */
export function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: Boolean(user.is_admin),
      token_version: user.token_version || 1
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token string
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Middleware: Requires valid authentication
 */
export async function authenticateRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to access this feature.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }

  try {
    const db = getDbPool();

    // Check if token was explicitly revoked
    const [revoked] = await db.query(
      `SELECT token FROM revoked_tokens WHERE token = ?`,
      [token]
    );
    if (revoked.length > 0) {
      return res.status(401).json({
        success: false,
        error: 'Session token has been revoked. Please log in again.'
      });
    }

    const [users] = await db.query(
      `SELECT id, username, email, display_name, avatar_color, storage_quota_bytes, 
              storage_used_bytes, is_admin, is_suspended, token_version, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists.'
      });
    }

    const user = users[0];

    // Check account suspension
    if (user.is_suspended) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by an administrator.'
      });
    }

    // Check token version (session invalidation)
    if (decoded.token_version && user.token_version !== decoded.token_version) {
      return res.status(401).json({
        success: false,
        error: 'Session has expired or was revoked. Please log in again.'
      });
    }

    req.user = user;
    req.authToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Requires Administrator privileges (strict server-side database check)
 */
export async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Administrator authentication required.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired administrator session.'
    });
  }

  try {
    const db = getDbPool();

    // Check if token was explicitly revoked
    const [revoked] = await db.query(
      `SELECT token FROM revoked_tokens WHERE token = ?`,
      [token]
    );
    if (revoked.length > 0) {
      return res.status(401).json({
        success: false,
        error: 'Administrator session has been revoked. Please log in again.'
      });
    }

    // Verify user record directly in the database
    const [users] = await db.query(
      `SELECT id, username, email, display_name, is_admin, is_suspended, token_version, admin_mfa_secret
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Administrator account does not exist.'
      });
    }

    const user = users[0];

    // Account suspension check
    if (user.is_suspended) {
      return res.status(403).json({
        success: false,
        error: 'Administrator account has been suspended.'
      });
    }

    // Token version check
    if (decoded.token_version && user.token_version !== decoded.token_version) {
      return res.status(401).json({
        success: false,
        error: 'Session version expired. Please log in again.'
      });
    }

    // AUTHORITATIVE ROLE VERIFICATION: Must be 1 in database
    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have administrator privileges.'
      });
    }

    req.user = user;
    req.admin = user;
    req.authToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Optional authentication (supports both guest users and authenticated users)
 */
export async function authenticateOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    req.user = null;
    return next();
  }

  try {
    const db = getDbPool();
    const [users] = await db.query(
      `SELECT id, username, email, display_name, avatar_color, storage_quota_bytes, 
              storage_used_bytes, is_admin, is_suspended, token_version, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length > 0 && !users[0].is_suspended) {
      req.user = users[0];
      req.authToken = token;
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}
