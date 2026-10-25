import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const isUrlConfig = Boolean(process.env.DATABASE_URL);
  let connection;

  try {
    if (isUrlConfig) {
      connection = await mysql.createConnection({
        uri: process.env.DATABASE_URL,
        multipleStatements: true,
        ssl: { rejectUnauthorized: false }
      });
      console.log('✓ Connected using DATABASE_URL.');
    } else {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test',
        multipleStatements: true
      });
      console.log(`✓ Connected to MySQL server at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}`);
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Executing database migrations on TiDB / MySQL...');
    await connection.query(sql);
    console.log('✓ All database tables created successfully.');

    // Provision default administrator account if needed
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@QuickShare';
    const mfaSecret = process.env.ADMIN_MFA_CODE || '850064';

    const [adminRows] = await connection.query(
      'SELECT id FROM users WHERE username = ? OR is_admin = 1 LIMIT 1',
      [adminUsername]
    );

    if (adminRows.length === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPass, salt);
      await connection.query(
        `INSERT INTO users (username, email, display_name, password_hash, is_admin, admin_mfa_secret, avatar_color)
         VALUES (?, 'admin@quickshare.local', 'System Administrator', ?, 1, ?, '#1e293b')`,
        [adminUsername, hash, mfaSecret]
      );
      console.log(`✓ Primary administrator "${adminUsername}" provisioned.`);
    } else {
      console.log(`✓ Administrator "${adminUsername}" verified.`);
    }

    console.log('\n✨ Database migration completed successfully.');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigration();
