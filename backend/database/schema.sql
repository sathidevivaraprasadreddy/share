-- QuickShare Comprehensive Database Schema for MySQL / TiDB / MariaDB

-- Table: users (Registered accounts with personal quota and inboxes)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NULL UNIQUE,
  phone VARCHAR(32) NULL UNIQUE,
  google_id VARCHAR(128) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_color VARCHAR(20) NOT NULL DEFAULT '#e11d48',
  otp_code VARCHAR(16) NULL,
  otp_expires_at DATETIME NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  storage_quota_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB default free tier
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  is_suspended TINYINT(1) NOT NULL DEFAULT 0,
  token_version INT NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  lockout_until DATETIME NULL,
  admin_mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  admin_mfa_secret VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone),
  INDEX idx_users_google (google_id),
  INDEX idx_users_admin (is_admin),
  INDEX idx_users_suspended (is_suspended)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: share_sessions (Upload sessions: link, 6-digit code, direct, or group)
CREATE TABLE IF NOT EXISTS share_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  revoke_token VARCHAR(64) NOT NULL,
  six_code VARCHAR(10) NULL,
  password_hash VARCHAR(255) NULL,
  max_downloads INT NOT NULL DEFAULT 0, -- 0 = unlimited
  download_count INT NOT NULL DEFAULT 0,
  failed_code_attempts INT NOT NULL DEFAULT 0, -- lockout after 5 attempts
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_count INT NOT NULL DEFAULT 1,
  share_type VARCHAR(32) NOT NULL DEFAULT 'link', -- 'link', 'code', 'direct', 'group', 'p2p'
  note TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_share_token (share_token),
  INDEX idx_six_code (six_code),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_revoked (is_revoked),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: share_files (Individual file records with sha256 checksum)
CREATE TABLE IF NOT EXISTS share_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(127) NOT NULL DEFAULT 'application/octet-stream',
  sha256_hash VARCHAR(64) NULL,
  storage_driver VARCHAR(32) NOT NULL DEFAULT 'local',
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_file_user (user_id),
  INDEX idx_is_deleted (is_deleted),
  CONSTRAINT fk_session_files FOREIGN KEY (session_id) 
    REFERENCES share_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_file_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: share_recipients (Direct recipient inboxes)
CREATE TABLE IF NOT EXISTS share_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'archived', 'pinned'
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  is_downloaded TINYINT(1) NOT NULL DEFAULT 0,
  downloaded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient_user (recipient_user_id),
  INDEX idx_recipient_session (session_id),
  CONSTRAINT fk_recipient_session FOREIGN KEY (session_id)
    REFERENCES share_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_recipient_user FOREIGN KEY (recipient_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: groups (User defined collaboration groups)
CREATE TABLE IF NOT EXISTS `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  invite_code VARCHAR(32) NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_owner (owner_user_id),
  INDEX idx_group_invite (invite_code),
  CONSTRAINT fk_group_owner FOREIGN KEY (owner_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: group_members (Members of groups)
CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'member'
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_user (group_id, user_id),
  INDEX idx_member_group (group_id),
  INDEX idx_member_user (user_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id)
    REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_member_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: group_shares (Files shared with a whole group)
CREATE TABLE IF NOT EXISTS group_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  session_id INT NOT NULL,
  shared_by_user_id INT NOT NULL,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gshare_group (group_id),
  INDEX idx_gshare_session (session_id),
  CONSTRAINT fk_gshare_group FOREIGN KEY (group_id)
    REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_gshare_session FOREIGN KEY (session_id)
    REFERENCES share_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_gshare_user FOREIGN KEY (shared_by_user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: group_messages (Real-time group chat messages)
CREATE TABLE IF NOT EXISTS group_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_messages_group (group_id),
  INDEX idx_group_messages_user (user_id),
  INDEX idx_group_messages_created (created_at),
  CONSTRAINT fk_gmsg_group FOREIGN KEY (group_id)
    REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_gmsg_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: activity_logs (Audit timeline for all transfers and security events)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id INT NULL,
  event_type VARCHAR(50) NOT NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications (In-app notification system)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'info',
  link_url VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_unread (user_id, is_read),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: login_logs (Login security monitoring and rate limiting)
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username_or_email VARCHAR(100) NOT NULL,
  user_id INT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  status VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_username (username_or_email),
  INDEX idx_login_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_audit_logs (Tamper-resistant administrative audit trail)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  admin_username VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(50) NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_admin (admin_user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: revoked_tokens (Instant token blacklist on logout / revocation)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  token VARCHAR(500) PRIMARY KEY,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
