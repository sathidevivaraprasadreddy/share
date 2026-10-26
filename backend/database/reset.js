import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAllData() {
  console.log('🔄 [Reset] Initializing complete data wipe...');

  const tables = [
    'group_messages',
    'group_shares',
    'group_members',
    'groups',
    'share_recipients',
    'share_files',
    'share_sessions',
    'activity_logs',
    'notifications',
    'login_logs',
    'admin_audit_logs',
    'revoked_tokens',
    'users'
  ];

  try {
    // 1. Wipe database records
    if (db.client === 'sqlite') {
      await db.query('PRAGMA foreign_keys = OFF');
      for (const table of tables) {
        try {
          await db.query(`DELETE FROM ${table}`);
          console.log(`  ✓ Cleared table: ${table}`);
        } catch (tableErr) {
          console.warn(`  - Skipped table ${table}:`, tableErr.message);
        }
      }
      try {
        await db.query('DELETE FROM sqlite_sequence');
        console.log('  ✓ Reset auto-increment counters (sqlite_sequence)');
      } catch {}
      await db.query('PRAGMA foreign_keys = ON');
    } else {
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of tables) {
        try {
          await db.query(`TRUNCATE TABLE \`${table}\``);
          console.log(`  ✓ Truncated table: ${table}`);
        } catch (tableErr) {
          console.warn(`  - Skipped table ${table}:`, tableErr.message);
        }
      }
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 2. Clear physical uploaded files
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let removedCount = 0;
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(uploadsDir, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            removedCount++;
          }
        } catch (fileErr) {
          console.warn(`  - Could not remove file ${file}:`, fileErr.message);
        }
      }
      console.log(`  ✓ Removed ${removedCount} physical uploaded file(s) from uploads directory`);
    }

    // 3. Re-provision fresh clean administrator account
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@QuickShare';
    const mfaSecret = process.env.ADMIN_MFA_CODE || '850064';

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPass, salt);

    await db.query(
      `INSERT INTO users (username, email, display_name, password_hash, is_admin, admin_mfa_secret, avatar_color)
       VALUES (?, 'admin@quickshare.local', 'System Administrator', ?, 1, ?, '#1e293b')`,
      [adminUsername, hash, mfaSecret]
    );
    console.log(`  ✓ Provisioned clean primary administrator "${adminUsername}" (Password: ${adminPass}, MFA: ${mfaSecret})`);

    console.log('\n✨ [Success] All users, files, shares, and data have been wiped clean.');
    process.exit(0);
  } catch (err) {
    console.error('❌ [Error] Reset failed:', err);
    process.exit(1);
  }
}

resetAllData();
