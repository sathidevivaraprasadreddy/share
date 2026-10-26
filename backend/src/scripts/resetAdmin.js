#!/usr/bin/env node
/**
 * QuickShare Safe Administrator Recovery Tool (Server CLI Only)
 * 
 * Usage:
 *   node backend/src/scripts/resetAdmin.js <username> <new_password> [new_mfa_code]
 * 
 * Example:
 *   node backend/src/scripts/resetAdmin.js admin MyNewSecretPassword2026! 849201
 */

import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const [,, username, newPassword, newMfaCode] = process.argv;

if (!username || !newPassword) {
  console.log(`
==============================================================
QuickShare Server Administrator Recovery CLI
==============================================================
Usage:
  node backend/src/scripts/resetAdmin.js <username> <new_password> [new_mfa_code]

Example:
  node backend/src/scripts/resetAdmin.js admin MySecurePass2026! 849201
==============================================================
`);
  process.exit(1);
}

const dbPath = path.resolve(__dirname, '../../database/quickshare.sqlite');
console.log(`[AdminCLI] Connecting to SQLite at: ${dbPath}`);

try {
  const db = new DatabaseSync(dbPath);
  const cleanUsername = username.trim().toLowerCase();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  const mfa = newMfaCode ? newMfaCode.trim() : (process.env.ADMIN_MFA_CODE || '849201');

  const findStmt = db.prepare('SELECT id, username FROM users WHERE username = ?');
  const user = findStmt.get(cleanUsername);

  if (user) {
    const updateStmt = db.prepare(`
      UPDATE users 
      SET password_hash = ?, is_admin = 1, is_suspended = 0, admin_mfa_secret = ?, token_version = token_version + 1, failed_login_attempts = 0, lockout_until = NULL
      WHERE id = ?
    `);
    updateStmt.run(hash, mfa, user.id);
    console.log(`[AdminCLI] ✅ SUCCESS: Administrator credentials for "${cleanUsername}" have been reset.`);
  } else {
    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, display_name, password_hash, is_admin, admin_mfa_secret, avatar_color)
      VALUES (?, 'admin@quickshare.local', 'System Administrator', ?, 1, ?, '#1e293b')
    `);
    insertStmt.run(cleanUsername, hash, mfa);
    console.log(`[AdminCLI] ✅ SUCCESS: New administrator account "${cleanUsername}" has been provisioned.`);
  }

  // Record into audit log
  try {
    const auditStmt = db.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, admin_username, action, target_type, target_id, details, ip_address)
      VALUES (0, 'SERVER_CLI', 'admin_recovery_reset', 'user', ?, 'Administrator credentials updated via safe server CLI', '127.0.0.1')
    `);
    auditStmt.run(cleanUsername);
  } catch {}

  console.log(`[AdminCLI] MFA Code: ${mfa}`);
  console.log(`[AdminCLI] You may now sign in at /control-center`);
  process.exit(0);
} catch (err) {
  console.error('[AdminCLI] ❌ ERROR:', err.message);
  process.exit(1);
}
