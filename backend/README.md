# QuickShare Backend API

Node.js (ES Modules) + Express REST API service for secure, ephemeral file sharing and group collaboration.

## Tech Stack
- **Runtime:** Node.js v22+ (ES Modules)
- **Framework:** Express.js
- **Database:** Dual-Engine Database Adapter
  - Production: TiDB Cloud Serverless (5 GB Free Forever, MySQL 8 wire-compatible)
  - Local / Tests: Built-in Node.js Native SQLite (`node:sqlite`)
- **Storage Driver:** S3-Compatible Cloud Storage (Supabase Object Storage / Cloudflare R2) or Local Filesystem
- **Security:** Helmet, Express Rate Limiter, Bcrypt, Cryptographic Token Generator, JWT
- **Email Dispatch:** Nodemailer (SMTP)
- **Scheduler:** Node-cron (automatic expired file deletion)
- **Testing:** Jest + Supertest (53 passing automated tests)

## Environment Variables (.env)
```env
PORT=5050
NODE_ENV=development
FRONTEND_URL=https://quickshare-nbkr.vercel.app

# Database Connection (TiDB Serverless Cloud MySQL or SQLite fallback)
# DATABASE_URL=mysql://<user>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/quickshare_db?ssl={"rejectUnauthorized":true}

# Cloud Object Storage (Supabase Storage / Cloudflare R2 / AWS S3)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
S3_REGION=auto
S3_ACCESS_KEY_ID=<your-access-key>
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET_NAME=quickshare-files

# Security & Sessions
JWT_SECRET=your_super_secret_jwt_key_here

# Upload Configuration
MAX_FILE_SIZE_MB=50
MAX_FILES_COUNT=10
DEFAULT_EXPIRY_HOURS=24
CLEANUP_CRON_SCHEDULE=*/15 * * * *
```

## Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Run automated tests (uses fast, zero-config native SQLite)
npm test

# 3. Start development server
npm run dev
```

## Key API Endpoints
- **Health:**
  - `GET /api/health` - Server and database connection status
- **File Sharing & Sessions:**
  - `POST /api/upload` - Upload up to 10 files with customizable expiry, password, and notes
  - `GET /api/session/:token` - Retrieve file listing and metadata for a share link
  - `GET /api/download/:token/:fileId` - Download a specific file
  - `GET /api/download-all/:token` - Download all files bundled in a `.zip` archive
  - `POST /api/revoke` - Revoke link and permanently delete files immediately
- **6-Digit Quick Codes:**
  - `POST /api/transfer/code-lookup` - Lookup and download files using 6-digit code
- **Authentication:**
  - `POST /api/auth/register` - Create a new free user account
  - `POST /api/auth/login` - Authenticate with email/username and password
  - `POST /api/auth/google` - Official Google Sign-In with JWT verification
  - `POST /api/auth/email-otp/send` - Send 6-digit email OTP
  - `POST /api/auth/email-otp/verify` - Verify email OTP and issue session token
  - `GET /api/auth/me` - Current user profile and quota details
- **Direct Inbox:**
  - `GET /api/inbox` - Retrieve received transfers
  - `POST /api/transfer/direct` - Transfer files directly to a user's inbox
  - `PATCH /api/inbox/:id` - Mark as read, pinned, or archived
- **Collaboration Groups:**
  - `GET /api/groups` - List user's groups
  - `POST /api/groups` - Create a new group
  - `GET /api/groups/:id` - Group details, members, and shared files
  - `GET /api/groups/:id/messages` - Real-time chat messages
  - `POST /api/groups/:id/messages` - Send a message or shared file announcement
  - `DELETE /api/groups/:id/messages/:messageId` - Delete a chat message
  - `POST /api/groups/:id/shares` - Link uploaded files to group
  - `DELETE /api/groups/:id/shares/:shareId` - Revoke group share
  - `DELETE /api/groups/:id/files/:fileId` - Delete specific file in group
- **Cloud Drive (My Files):**
  - `GET /api/files` - List files with category filtering (`images`, `documents`, `archives`, `trash`)
  - `PATCH /api/files/:id/rename` - Inline file rename
  - `POST /api/files/:id/trash` - Move file to trash bin
  - `POST /api/files/:id/restore` - Restore file from trash
  - `DELETE /api/files/:id/purge` - Permanently purge file
