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
      email: user.email
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
    const [users] = await db.query(
      `SELECT id, username, email, display_name, avatar_color, storage_quota_bytes, storage_used_bytes, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists.'
      });
    }

    req.user = users[0];
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
      `SELECT id, username, email, display_name, avatar_color, storage_quota_bytes, storage_used_bytes, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length > 0) {
      req.user = users[0];
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}
