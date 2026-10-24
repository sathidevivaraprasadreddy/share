import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
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
        'ALTER TABLE users ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0;'
      ];

      for (const alterSql of columnsToAdd) {
        try {
          this.db.exec(alterSql);
        } catch (colErr) {
          // Column already exists or table not yet created, safe to ignore
        }
      }

      // 2. Execute full schema (creates tables and indexes)
      const schemaPath = path.resolve(__dirname, '../../database/schema_sqlite.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schemaSql);
      }
    } catch (err) {
      console.warn('[SQLite] Schema init notice:', err.message);
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
