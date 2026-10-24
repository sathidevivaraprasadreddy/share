import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let activeAdapter = null;

class SqliteAdapter {
  constructor(options = {}) {
    this.client = 'sqlite';
    const isTest = process.env.NODE_ENV === 'test';
    const dbPath = isTest
      ? path.resolve(__dirname, '../../database/quickshare_test.sqlite')
      : options.filePath || path.resolve(__dirname, '../../database/quickshare.sqlite');

    // Dynamic import from node:sqlite
    const { DatabaseSync } = (awaitImportNodeSqlite());
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Register scalar functions so MySQL-compatible functions work identically
    this.db.function('now', () => new Date().toISOString().replace('T', ' ').substring(0, 19));
    this.db.function('greatest', (a, b) => Math.max(Number(a) || 0, Number(b) || 0));

    // Initialize tables from schema_sqlite.sql if needed
    this.initSchema();
  }

  initSchema() {
    try {
      // 1. Safe column migration for existing database tables
      const columnsToAdd = [
        'ALTER TABLE users ADD COLUMN phone TEXT NULL;',
        'ALTER TABLE users ADD COLUMN google_id TEXT NULL;',
        'ALTER TABLE users ADD COLUMN otp_code TEXT NULL;',
        'ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL;',
        'ALTER TABLE users ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;',
        'ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL;',
        'ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN lockout_until DATETIME NULL;',
        'ALTER TABLE users ADD COLUMN admin_mfa_enabled INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN admin_mfa_secret TEXT NULL;',
        'ALTER TABLE groups ADD COLUMN invite_code TEXT NULL;',
        'ALTER TABLE share_sessions ADD COLUMN ip_address TEXT NULL;',
        'ALTER TABLE share_sessions ADD COLUMN user_agent TEXT NULL;'
      ];

      for (const alterSql of columnsToAdd) {
        try {
          this.db.exec(alterSql);
        } catch (colErr) {
          // Column already exists or table not yet created, safe to ignore
        }
      }

      // Backfill missing group invite codes
      try {
        this.db.exec("UPDATE groups SET invite_code = lower(hex(randomblob(8))) WHERE invite_code IS NULL OR invite_code = '';");
      } catch {}

      // Ensure group_messages table exists
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS group_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages (group_id);
          CREATE INDEX IF NOT EXISTS idx_group_messages_user ON group_messages (user_id);
        `);
      } catch {}

      // 2. Execute full schema (creates tables and indexes)
      const schemaPath = path.resolve(__dirname, '../../database/schema_sqlite.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schemaSql);
      }

      // 3. Provision owner-designated initial administrator account
      this.provisionAdmin();
    } catch (err) {
      console.warn('[SQLite] Schema init notice:', err.message);
    }
  }

  provisionAdmin() {
    try {
      const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@QuickShare';
      const mfaSecret = process.env.ADMIN_MFA_CODE || '850064';

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPass, salt);

      // Check if an admin user or user with adminUsername exists
      const userStmt = this.db.prepare('SELECT id FROM users WHERE username = ? OR is_admin = 1');
      const userRow = userStmt.get(adminUsername);

      if (userRow) {
        const updateStmt = this.db.prepare(
          `UPDATE users 
           SET username = ?, is_admin = 1, password_hash = ?, admin_mfa_secret = ?, 
               is_suspended = 0, failed_login_attempts = 0, lockout_until = NULL 
           WHERE id = ?`
        );
        updateStmt.run(adminUsername, hash, mfaSecret, userRow.id);
        console.log(`[Security] Administrator credentials synced for "${adminUsername}".`);
      } else {
        const insertStmt = this.db.prepare(`
          INSERT INTO users (username, email, display_name, password_hash, is_admin, admin_mfa_secret, avatar_color)
          VALUES (?, 'admin@quickshare.local', 'System Administrator', ?, 1, ?, '#1e293b')
        `);
        insertStmt.run(adminUsername, hash, mfaSecret);
        console.log(`[Security] Primary administrator account "${adminUsername}" provisioned from environment.`);
      }
    } catch (err) {
      console.warn('[Security] Admin provisioning notice:', err.message);
    }
  }

  async query(sql, params = []) {
    const trimmed = sql.trim();
    const isSelect = /^SELECT/i.test(trimmed) || /^PRAGMA/i.test(trimmed);

    // Format and sanitize params for SQLite (convert Date to ISO string, boolean to 0/1)
    const flatParams = Array.isArray(params) ? params.flat() : [params];
    const sanitizedParams = flatParams.map((p) => {
      if (p instanceof Date) {
        return p.toISOString().replace('T', ' ').substring(0, 19);
      }
      if (typeof p === 'boolean') {
        return p ? 1 : 0;
      }
      if (p === undefined) {
        return null;
      }
      return p;
    });

    try {
      const stmt = this.db.prepare(trimmed);
      if (isSelect) {
        const rows = stmt.all(...sanitizedParams);
        // Convert to plain JS objects
        const plainRows = rows.map((r) => ({ ...r }));
        return [plainRows, []];
      } else {
        const info = stmt.run(...sanitizedParams);
        return [
          {
            insertId: Number(info.lastInsertRowid),
            affectedRows: info.changes
          },
          []
        ];
      }
    } catch (err) {
      throw err;
    }
  }

  async getConnection() {
    const self = this;
    return {
      query: (sql, params) => self.query(sql, params),
      beginTransaction: async () => {
        self.db.exec('BEGIN');
      },
      commit: async () => {
        try {
          self.db.exec('COMMIT');
        } catch {}
      },
      rollback: async () => {
        try {
          self.db.exec('ROLLBACK');
        } catch {}
      },
      release: () => {}
    };
  }

  async end() {
    try {
      this.db.close();
    } catch {}
  }
}

const require = createRequire(import.meta.url);

function awaitImportNodeSqlite() {
  return require('node:sqlite');
}

class MysqlAdapter {
  constructor(pool) {
    this.client = 'mysql';
    this.pool = pool;
  }

  async query(sql, params) {
    return this.pool.query(sql, params);
  }

  async getConnection() {
    return this.pool.getConnection();
  }

  async end() {
    return this.pool.end();
  }
}

export function getDbPool() {
  if (activeAdapter) return activeAdapter;

  const preferSqlite =
    process.env.DB_CLIENT === 'sqlite' ||
    (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL);

  if (preferSqlite) {
    activeAdapter = new SqliteAdapter();
    console.log('[Database] Using zero-config SQLite database engine.');
    return activeAdapter;
  }

  const isUrlConfig = Boolean(process.env.DATABASE_URL);

  try {
    let pool;
    if (isUrlConfig) {
      pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.DATABASE_URL.includes('ssl=') ? undefined : { rejectUnauthorized: false }
      });
    } else if (process.env.DB_HOST && process.env.DB_CLIENT === 'mysql') {
      pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'quickshare_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    } else {
      // Default fallback to zero-config SQLite
      activeAdapter = new SqliteAdapter();
      console.log('[Database] No MySQL configured. Using zero-config local SQLite engine.');
      return activeAdapter;
    }

    activeAdapter = new MysqlAdapter(pool);
    return activeAdapter;
  } catch (err) {
    console.warn('[Database] MySQL pool creation failed. Falling back to SQLite:', err.message);
    activeAdapter = new SqliteAdapter();
    return activeAdapter;
  }
}

export async function testDbConnection() {
  try {
    const db = getDbPool();
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    return { connected: true, solution: rows[0].solution, client: db.client };
  } catch (error) {
    // If MySQL connection fails, fallback to SQLite
    if (activeAdapter && activeAdapter.client === 'mysql') {
      console.warn('⚠️ MySQL connection failed. Gracefully falling back to SQLite for zero-setup mode.');
      activeAdapter = new SqliteAdapter();
      const [rows] = await activeAdapter.query('SELECT 1 + 1 AS solution');
      return { connected: true, solution: rows[0].solution, client: 'sqlite', fallback: true };
    }
    return { connected: false, error: error.message };
  }
}

export default getDbPool();
