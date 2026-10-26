# QuickShare 🚀
> **Modern, 100% Free & Open-Source Ephemeral File-Sharing Platform**  
> 6-digit transfer codes, cryptographic share links, in-app recipient inboxes, WhatsApp-style collaboration groups with real-time chat, admin moderation control center, PWA mobile installability, and zero-cost cloud deployment.

![QuickShare Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Free Stack](https://img.shields.io/badge/Cost-%E2%82%B90%20Zero%20Paid%20Tiers-rose)
![Node Engine](https://img.shields.io/badge/Node.js-v22%2B%20Native%20SQLite%20Ready-blue)
![Database](https://img.shields.io/badge/Database-TiDB%20Serverless%20%2F%20SQLite-indigo)
![Tests](https://img.shields.io/badge/Tests-56%2F56%20Passing-emerald)

---

## 🌐 Live Production Application
- **Frontend Web Application:** [https://quickshare-nbkr.vercel.app/](https://quickshare-nbkr.vercel.app/)
- **Backend REST API:** [https://share-api-0xvn.onrender.com/api](https://share-api-0xvn.onrender.com/api)
- **API Health Check:** [https://share-api-0xvn.onrender.com/api/health](https://share-api-0xvn.onrender.com/api/health)
- **Cloud Database:** TiDB Serverless (5 GB free forever, MySQL 8 compatible)
- **Cloud Object Storage:** Supabase S3 Object Storage (`quickshare-files`)
- **Admin Control Center:** Accessible via `/admin`, `/control-center`, or user profile & footer menu
- **GitHub Repository:** [https://github.com/sathidevivaraprasadreddy/share](https://github.com/sathidevivaraprasadreddy/share)

---

## 📋 Table of Contents
1. [Overview & Product Vision](#-overview--product-vision)
2. [Active Transfer Mechanisms](#-active-transfer-mechanisms)
3. [Core Feature Areas](#-core-feature-areas)
4. [Technology Architecture](#-technology-architecture)
5. [₹0 Zero-Cost Cloud Stack](#-0-zero-cost-cloud-stack)
6. [Zero-Config Local Development](#-zero-config-local-development)
7. [Production Deployment Guide](#-production-deployment-guide)
8. [Automated Testing Suite (56/56 Tests)](#-automated-testing-suite)
9. [Security, Privacy & Data Lifecycle](#-security-privacy--data-lifecycle)

---

## 🌟 Overview & Product Vision

QuickShare is designed for individuals, students, teams, and organizations who need to share files securely across devices without forced subscriptions, intrusive ads, or paid paywalls.

QuickShare supports **both guests and registered users**:
- **Guest Mode:** No registration required. Upload files instantly, get a secure 6-digit code or encrypted share link, and transfer right away.
- **Registered Account (Free):** Unlocks persistent cloud file management, recipient in-app inboxes, team collaboration groups with live chat, personal storage quotas, custom avatars, and audit history.

---

## ⚡ Active Transfer Mechanisms

QuickShare provides three distinct transfer mechanisms:

### 1. 🔢 Six-Digit Quick Codes
- **How it works:** The sender receives an instant, random 6-digit code (e.g., `839 204`). The receiver navigates to **Receive**, enters the code, and immediately downloads the files.
- **Security:** Protected against brute-force attacks via server-side progressive rate-limiting and session timeouts.

### 2. 📥 Direct In-App Inbox Delivery
- **How it works:** Authenticated senders can dispatch files directly to any registered user's inbox (e.g. `@alice`, `@bob`) with live username autocomplete search.
- **WhatsApp Checkmarks:** Real-time delivery status icons:
  - **✓ Sent**
  - **✓✓ Delivered to Inbox**
  - **✓✓ (Green) Downloaded by Recipient**
- **Safety:** Recipients can view file details and notes, and accept or decline transfers. Supports optional password protection and burn-on-download (auto-delete after first download).

### 3. 🔗 Ephemeral Links & Mobile QR Codes
- **How it works:** Generates high-entropy 128-bit unguessable tokens (`crypto.randomBytes(16)`) and high-contrast QR codes for instant smartphone camera scanning.
- **Protection:** Optional bcrypt password protection, download count limits, and customizable expiry windows (1h, 6h, 24h, 3d, 7d).

---

## 🗂️ Core Feature Areas

```
QuickShare Navigation
├── 📤 Transfer Dashboard
│   ├── Send (Link & 6-Digit Code / Direct to User Inbox / Group Share)
│   ├── Receive (6-Digit Code lookup & instant download)
│   ├── Global Drag & Drop Overlay (Drop files anywhere to share)
│   └── Security Options (Password protection, custom expiry, burn-on-download)
├── 📥 Recipient Inbox (Directly received files with WhatsApp checkmarks, notes & rename)
├── 📁 My Files (Cloud drive, category filters, inline rename, trash bin & restore)
├── 👥 Collaboration Groups (WhatsApp-style group chat, emojis, attachments, rename & files tab)
├── 🛡️ Admin Control Center (/admin or /control-center - MFA, user moderation, audit logs & CSV export)
├── ⏱️ Activity Timeline (Audit logs for uploads, downloads, and revocations)
├── 🔔 Notifications (Live transfer alerts, audio chimes & unread badge)
└── ⚙️ Profile & Quota (Avatar color picker, storage meter, password change, Danger Zone)
```

- **💬 Real-Time Group Chat & File Sharing:**
  - WhatsApp-style chat bubbles with message timestamps, avatar initials, and delivery checkmarks.
  - Attachment staging drawer allowing senders to preview and **rename files (✏️)** before sending.
  - **Smart auto-scroll:** Preserves scroll position when reading earlier messages; scrolls down automatically only when at the bottom or sending a message.
  - **Floating Jump-to-Latest Button:** WhatsApp-style floating pill with unread count indicator when scrolled up.
  - Dedicated **Files Tab** in groups with individual file deletion (🗑️), file rename, and batch ZIP archive download.
  - Active group **QR Code Modal** with live invite code display and 1-click WhatsApp / Copy Link sharing.

- **📱 Installable Progressive Web App (PWA):**
  - Includes Web App Manifest (`manifest.json`) and vector app icons for installing QuickShare as a native app on Android, iOS Safari, Windows, and macOS.

- **🔑 Multi-Option Authentication:**
  - **Google OAuth 2.0 (Google Identity Services):** One-tap Google Sign-In with cryptographic JWT token verification.
  - **Email OTP (100% Free):** 6-digit one-time codes dispatched directly via SMTP / Nodemailer.
  - **Cellular SMS OTP:** Supports real SMS delivery to mobile phones via Fast2SMS and Twilio.
  - **Standard Email & Password:** Bcrypt hashed credentials with salted rounds.

- **🛡️ Admin Control Center (`/admin` or `/control-center`):**
  - Multi-Factor Authentication (MFA PIN) protected.
  - Real-time user management (suspend, session revoke, password reset).
  - Group and chat moderation (view all messages, delete inappropriate content).
  - Tamper-resistant security logs parsing client IPs, devices (Android, iOS, Windows, Mac), and browsers.
  - One-click CSV export of all database tables.

---

## 🏗️ Technology Architecture

```
[ Client Browsers & Mobile PWA ]
       │
       │ HTTPS / REST API
       ▼
[ Node.js + Express Backend on Render ]
       │
       ├── Rate Limiter & Security Headers (Helmet, CORS)
       ├── Storage Driver Adapter (Local Disk / Supabase S3 Object Storage)
       └── Dual-Engine Database Adapter
             ├── Local Development: Built-in Node.js Native SQLite (node:sqlite)
             └── Production Cloud: TiDB Serverless (MySQL 8 wire-compatible)
```

| Layer | Local Development | ₹0 Production Cloud Deployment |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Vercel Edge CDN (`quickshare-nbkr.vercel.app`) |
| **Backend** | Node.js 22+ (ESM), Express | Render Free Tier (`share-api-0xvn.onrender.com`) |
| **Database** | Node.js Native SQLite (`node:sqlite`) | TiDB Serverless (5 GB free forever) |
| **Storage** | Local Filesystem (`backend/uploads`) | Supabase Object Storage (`quickshare-files`) |

---

## 💰 ₹0 Zero-Cost Cloud Stack

| Component | Free Provider | Free Tier Allocation | Credit Card Required? |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | Unlimited bandwidth & continuous deployment | ❌ No |
| **Backend API** | Render | 750 free compute hours/month | ❌ No |
| **Database** | TiDB Cloud Serverless | 5 GB storage + 50M Request Units/month | ❌ No |
| **Object Storage** | Supabase Storage | 1 GB storage + 2 GB bandwidth/month | ❌ No |
| **Google Auth** | Google Cloud Console | Unlimited free OAuth 2.0 logins | ❌ No |

---

## 💻 Zero-Config Local Development

QuickShare includes a zero-config native SQLite database engine built right into Node.js. **You do not need to install XAMPP or configure MySQL to run the project locally.**

### Prerequisites
- **Node.js:** v20+ (v22+ recommended for native SQLite `node:sqlite`)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/sathidevivaraprasadreddy/share.git
cd share
```

### 2. Install Dependencies
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Run Both Servers Concurrently
From the root project directory:
```bash
npm run dev
```
Or start them in separate terminals:
- **Backend:** `cd backend && npm run dev` *(Runs on `http://localhost:5050`)*
- **Frontend:** `cd frontend && npm run dev` *(Runs on `http://localhost:5180`)*

Open your browser at: **`http://localhost:5180`**

---

## 🚀 Production Deployment Guide

### Phase 1: Set up Free Cloud MySQL (TiDB Serverless)
1. Register for a free account at [TiDB Cloud](https://tidbcloud.com/) (no credit card required).
2. Click **Create Cluster** and choose **TiDB Serverless (Free Forever - 5 GB)**.
3. In cluster settings, click **Connect** -> **Connect with URL**.
4. Copy the MySQL connection string:
   ```
   mysql://<user>:<pass>@gateway01.<region>.prod.aws.tidbcloud.com:4000/quickshare_db?ssl={"rejectUnauthorized":true}
   ```
5. Apply database migrations:
   ```bash
   DATABASE_URL="<your-tidb-url>" npm --prefix backend run migrate
   ```

### Phase 2: Deploy Backend to Render (₹0)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository and set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Instance Type:** `Free`
4. Add the following Environment Variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: *(your TiDB connection URL from Phase 1)*
   - `JWT_SECRET`: *(secure random string of 32+ characters)*
   - `STORAGE_DRIVER`: `s3`
   - `S3_ENDPOINT`: *(your Supabase / Cloudflare R2 endpoint)*
   - `S3_REGION`: `auto`
   - `S3_ACCESS_KEY_ID`: *(your S3 Access Key)*
   - `S3_SECRET_ACCESS_KEY`: *(your S3 Secret Key)*
   - `S3_BUCKET_NAME`: `quickshare-files`
   - `FRONTEND_URL`: `https://quickshare-nbkr.vercel.app`
5. Click **Deploy Web Service**.

### Phase 3: Deploy Frontend to Vercel (₹0)
1. Sign in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2. Import your GitHub repository (`share` or `quickshare`) and configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: `https://share-api-0xvn.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID`: *(your Google OAuth Client ID)*
4. Click **Deploy**. Vercel serves the app globally on `https://quickshare-nbkr.vercel.app`.

---

## 🧪 Automated Testing Suite

QuickShare includes a rigorous automated test suite powered by Jest and Supertest. All tests run in isolated environments and verify critical security and user flows:

```bash
npm --prefix backend test
```

### Verified Test Coverage (56/56 Passing - 100%):
- **User Authentication:** Registration, duplicate checks, bcrypt verification, JWT signing, profile updates, and password changes.
- **Share Sessions & Uploads:** Single/multi-file uploads, mime-type sanitization, SHA-256 hash calculation, quota verification.
- **6-Digit Codes & Direct Transfer:** Code lookup, rate-limiting lockout verification, direct delivery into recipient inboxes.
- **Inbox Operations:** Read/pinned/archived state updates, delivery checkmarks, and non-destructive removal verification.
- **File Management:** Category filtering (`images`, `documents`, `archives`, `trash`), inline rename, soft-delete to trash, restore, and permanent purge.
- **Collaboration Groups:** Group creation, member additions, role checks, group share linking, individual file deletion, batch revocation, and real-time chat messages.
- **Owner Revocation & IDOR Security:** Rejection of unauthorized revokes, 404 security checks on file access, and verified physical file destruction on valid revocation.

---

## 🔒 Security, Privacy & Data Lifecycle

- **High-Entropy Tokens:** Share tokens are generated with 16 cryptographically random bytes ($2^{128}$ combinations). Revocation tokens utilize 24 bytes ($2^{192}$ combinations), preventing brute-force enumeration.
- **Path Traversal Guards:** File paths are strictly sanitized with `path.basename()` and verified against upload directory boundaries with `resolveSafePath()`.
- **Remote Execution Prevention:** Uploads are stored outside public web roots and served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
- **Prepared Parameterized Queries:** 100% of database queries use parameterized placeholders (`?`) preventing SQL injection across both SQLite and MySQL engines.
- **Non-Destructive Inbox Deletion:** Removing an item from an inbox deletes only the recipient's view entry; the underlying file remains intact for the owner.
- **Immediate Physical Purge:** Revocation or expiration immediately deletes the file from disk or cloud S3 storage.

---

## 📜 License
This project is open-source and released under the [MIT License](LICENSE).
