-- QuickShare SQLite Schema for Local Self-Hosting & Zero-Setup Testing
PRAGMA foreign_keys = ON;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NULL UNIQUE,
  phone TEXT NULL UNIQUE,
  google_id TEXT NULL UNIQUE,
  password_hash TEXT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#e11d48',
  otp_code TEXT NULL,
  otp_expires_at DATETIME NULL,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  storage_quota_bytes INTEGER NOT NULL DEFAULT 1073741824, -- 1 GB
  storage_used_bytes INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id);

-- Table: share_sessions
CREATE TABLE IF NOT EXISTS share_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  share_token TEXT NOT NULL UNIQUE,
  revoke_token TEXT NOT NULL,
  six_code TEXT NULL,
  password_hash TEXT NULL,
  max_downloads INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  failed_code_attempts INTEGER NOT NULL DEFAULT 0,
  total_size_bytes INTEGER NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 1,
  share_type TEXT NOT NULL DEFAULT 'link',
  note TEXT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_sessions (share_token);
CREATE INDEX IF NOT EXISTS idx_six_code ON share_sessions (six_code);
CREATE INDEX IF NOT EXISTS idx_user_id ON share_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_expires_at ON share_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_is_revoked ON share_sessions (is_revoked);

-- Table: share_files
CREATE TABLE IF NOT EXISTS share_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  user_id INTEGER NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sha256_hash TEXT NULL,
  storage_driver TEXT NOT NULL DEFAULT 'local',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES share_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_session_id ON share_files (session_id);
CREATE INDEX IF NOT EXISTS idx_file_user ON share_files (user_id);
CREATE INDEX IF NOT EXISTS idx_is_deleted ON share_files (is_deleted);

-- Table: share_recipients
CREATE TABLE IF NOT EXISTS share_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  recipient_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_read INTEGER NOT NULL DEFAULT 0,
  is_downloaded INTEGER NOT NULL DEFAULT 0,
  downloaded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES share_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recipient_user ON share_recipients (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_recipient_session ON share_recipients (session_id);

-- Table: groups
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_group_owner ON groups (owner_user_id);

-- Table: group_members
CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_member_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_member_user ON group_members (user_id);

-- Table: group_shares
CREATE TABLE IF NOT EXISTS group_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES share_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gshare_group ON group_shares (group_id);
CREATE INDEX IF NOT EXISTS idx_gshare_session ON group_shares (session_id);

-- Table: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL,
  session_id INTEGER NULL,
  event_type TEXT NOT NULL,
  details TEXT NULL,
  ip_address TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_logs (session_id);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link_url TEXT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON notifications (user_id, is_read);
