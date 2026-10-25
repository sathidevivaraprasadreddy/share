# QuickShare 🚀
> **Advanced, 100% Free & Open-Source Ephemeral File-Sharing Platform**  
> Direct peer-to-peer WebRTC data channels, 6-digit transfer codes, cryptographic share links, in-app recipient inboxes, WhatsApp-style group collaboration, PWA mobile installability, and zero-cost cloud deployment.

![QuickShare Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Free Stack](https://img.shields.io/badge/Cost-%E2%82%B90%20Zero%20Paid%20Tiers-rose)
![Node Engine](https://img.shields.io/badge/Node.js-v22%2B%20Native%20SQLite%20Ready-blue)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20DataChannels-indigo)
![Tests](https://img.shields.io/badge/Tests-56%2F56%20Passing-emerald)

---

## 🌐 Live Production Application
- **Frontend Web Application:** [https://quickshare-azure.vercel.app/](https://quickshare-azure.vercel.app/)
- **Backend REST & WebSocket API:** [https://quickshare-api-hbal.onrender.com/](https://quickshare-api-hbal.onrender.com/)
- **WebRTC Signaling Endpoint:** `wss://quickshare-api-hbal.onrender.com/ws`
- **Cloud Database:** Built-in Zero-Config SQLite or TiDB Serverless (Cloud MySQL wire-compatible)
- **Persistent Cloud Storage:** Supabase Object Storage / Cloudflare R2 (S3-compatible) or Local
- **GitHub Repository:** [https://github.com/sathidevivaraprasadreddy/share](https://github.com/sathidevivaraprasadreddy/share)

---

## 📋 Table of Contents
1. [Overview & Product Vision](#-overview--product-vision)
2. [Multiple Sharing Methods](#-multiple-sharing-methods)
3. [Core Feature Areas](#-core-feature-areas)
4. [Technology Architecture](#-technology-architecture)
5. [₹0 Zero-Cost Cloud Stack & Provider Quotas](#-0-zero-cost-cloud-stack--provider-quotas)
6. [Zero-Config Local Development](#-zero-config-local-development)
7. [Production Deployment Guide (1-Click Unified or Split)](#-production-deployment-guide)
8. [Automated Testing Suite (56/56 Tests)](#-automated-testing-suite)
9. [Security, Privacy & Data Lifecycle](#-security-privacy--data-lifecycle)

---

## 🌟 Overview & Product Vision

QuickShare is designed for individual users, students, teams, and communities who need to share files securely across devices without forced signups, intrusive ads, or costly subscriptions.

QuickShare supports **both guests and registered users**:
- **Guest Mode:** No account required. Drop files anywhere, get an instant 6-digit code or share link, and transfer immediately.
- **Registered Account (Free):** Unlocks persistent file management, custom avatars, recipient in-app inboxes, team collaboration groups with live chat, audit logs, and personal cloud storage.

---

## ⚡ Multiple Sharing Methods

Unlike traditional platforms that rely strictly on public URLs, QuickShare provides four distinct transfer mechanisms tailored for different sharing scenarios:

### 1. 🔢 Six-Digit Quick Codes
- **How it works:** Sender gets a random 6-digit transfer code (e.g. `839 204`). The receiver opens QuickShare, navigates to **Receive**, enters the code, and downloads immediately.
- **Security:** Protected against brute-force attacks by progressive attempt throttling and server-side rate limits. Sessions expire automatically.

### 2. ⚡ Browser-to-Browser WebRTC (P2P Direct Transfer)
- **How it works:** Connects sender and receiver directly through encrypted WebRTC DataChannels with real-time WebSocket signaling (`/ws`).
- **Benefits:** Files stream directly from RAM to RAM without passing through or consuming server storage quotas. Perfect for transferring large files across computers, laptops, and smartphones on the same Wi-Fi or across the internet.

### 3. 📥 Direct In-App Inbox Delivery
- **How it works:** Authenticated senders can dispatch files directly into any registered user's inbox (e.g. `@alice`, `@bob`) with username autocomplete suggestions.
- **WhatsApp Checkmarks:** Live delivery status icons: **✓ Sent**, **✓✓ Delivered to Inbox**, **✓✓ (Green) Downloaded**.
- **Privacy & Safety:** Recipients can preview descriptions, and accept or decline transfers. Supports optional password protection and burn-on-download (auto-delete after first download).

### 4. 🔗 Ephemeral Links & Mobile QR Codes
- **How it works:** Generates high-entropy 128-bit unguessable tokens (`crypto.randomBytes(16)`) and high-contrast QR codes for instant smartphone camera scanning.
- **Protection:** Supports optional bcrypt password protection, configurable download limits, and customizable expiry windows (1h, 6h, 24h, 3d, 7d).

---

## 🗂️ Core Feature Areas

```
QuickShare Navigation
├── 📤 Transfer Dashboard
│   ├── Send (Link & 6-Digit Code / Direct to Inbox / Group Share)
│   ├── Receive (6-Digit Code lookup & instant retrieve)
│   ├── Global Drag & Drop Overlay (Drop files anywhere to share)
│   └── Quick P2P (WebRTC Browser-to-Browser Data Channels)
├── 📥 Recipient Inbox (Directly received files with WhatsApp checkmarks, notes & rename)
├── 📁 My Files (Cloud drive, category filters, inline rename, trash bin & restore)
├── 👥 Collaboration Groups (Group chat with emojis, file attachments, rename & delete)
├── 🛡️ Admin Control Center (/control-center - MFA, user moderation, audit logs & CSV export)
├── ⏱️ Activity Timeline (Audit logs for uploads, downloads, and revocations)
├── 🔔 Notifications (Live transfer alerts, audio pings & unread badge)
└── ⚙️ Profile & Quota (Avatar color picker, storage meter, password change, Danger Zone)
```

- **💬 Real-Time Group Chat & File Sharing:**
  - WhatsApp-style chat bubbles with message timestamps, emoji reactions, and delivery checkmarks.
  - Attachment staging drawer allowing senders to preview and **rename files (✏️)** before sending.
  - Dedicated **Files Tab** in groups with individual file deletion (🗑️), file rename, and batch ZIP archive download.
  - Active group **QR Code Modal** with live invite code display and 1-click WhatsApp / Copy Link sharing.
- **📱 Installable Progressive Web App (PWA):**
  - Includes Web App Manifest (`manifest.json`) and vector app icons for installing QuickShare as a native app on Android, iOS Safari, and desktop browsers.
- **🎨 Modern Tactile Micro-Interactions:**
  - Zero-layout-shift floating toasts, smooth button click feedback (`active:scale-[0.98]`), and card hover lifts.
- **📡 Offline / Online Detection:**
  - Detects network disconnects and gracefully queues transfers until reconnected.
- **🔑 Real-World Multi-Option Authentication:**
  - **Official Google OAuth 2.0 (Google Identity Services):** Real Google Sign-In popup with cryptographic JWT token verification.
  - **Real Email OTP (100% Free):** 6-digit one-time codes dispatched directly via SMTP / Nodemailer.
  - **Cellular SMS OTP:** Supports real SMS delivery to mobile phones via Fast2SMS (free signup credits in India) and Twilio.
  - **Standard Email & Password:** Bcrypt hashed credentials with salted rounds.
- **🛡️ Admin Control Center (`/control-center`):**
  - Multi-Factor Authentication (MFA PIN) protected.
  - Real-time user management (suspend, session revoke, password reset).
  - Group and chat moderation (view all messages, delete inappropriate content).
  - Tamper-resistant security logs parsing client IPs, devices (Android, iOS, Windows, Mac), and browsers.
  - One-click CSV export of all database tables.

---

## 🏗️ Technology Architecture

```
[ Client Browsers & Mobile PWA ]
       │                    ▲
       │ HTTPS / REST       │ WebRTC DataChannels (P2P Files)
       ▼                    ▼
[ Node.js + Express Server & WebSocket Hub (Unified or Split) ]
       │                    │
       ├── WebRTC Signaling (/ws)
       ├── Static SPA Hosting (Serves frontend/dist in Unified mode)
       ├── Rate Limiter & Security Headers (Helmet, CORS)
       ├── Storage Driver Adapter (Local Disk / S3 Object Storage)
       └── Dual-Engine Database Adapter
             ├── Built-in Local & Cloud: Node.js Native SQLite (`node:sqlite`)
             └── Production Cloud MySQL: TiDB Serverless / Aiven / Supabase
```

| Layer | Local Development | ₹0 Production Cloud Deployment |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Vercel or Unified on Render / Railway |
| **Backend** | Node.js 22+ (ESM), Express, `ws` (WebSockets) | Render Free Tier (`*.onrender.com`) |
| **Database** | Node.js Native SQLite (`node:sqlite`) | Built-in SQLite with `DB_PATH` or TiDB Serverless |
| **Storage** | Local Filesystem (`backend/uploads`) | Supabase Object Storage / Cloudflare R2 (S3) |
| **Signaling** | Native WebSocket Server (`/ws`) | Render WebSocket Tunneling |

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

### 3. Start Both Servers Concurrently
```bash
# Terminal 1: Backend
npm --prefix backend run dev

# Terminal 2: Frontend
npm --prefix frontend run dev
```

Open your browser at: **`http://localhost:5180`**

---

## 🚀 Production Deployment Guide

### Option A: Unified 1-Click Deploy on Render (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository. Render reads [render.yaml](render.yaml) automatically:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Click **Create Web Service**. Render compiles the frontend, boots the backend, and serves the entire fullstack app on a free `*.onrender.com` URL!

### Option B: Split Deploy (Frontend on Vercel + Backend on Render)
- **Backend on Render:**
  - Build Command: `npm --prefix backend install`
  - Start Command: `node backend/src/server.js`
- **Frontend on Vercel:**
  - Root Directory: `frontend`
  - Environment Variable: `VITE_API_URL=https://your-backend.onrender.com/api`

---

## 🧪 Automated Testing Suite

QuickShare includes a rigorous automated test suite powered by Jest and Supertest verifying critical security and user flows:

```bash
npm --prefix backend test
```

### Verified Test Coverage (56/56 Passing - 100%):
- **User Authentication:** Registration, duplicate checks, bcrypt verification, JWT signing, profile updates, and password changes.
- **Share Sessions & Uploads:** Single/multi-file uploads, mime-type sanitization, SHA-256 hash calculation, quota verification.
- **6-Digit Codes & Direct Transfer:** Code lookup, rate-limiting lockout verification, direct delivery into recipient inboxes.
- **Inbox Operations:** Read/pinned/archived state updates, delivery checkmarks, and non-destructive removal verification.
- **File Management:** Category filtering (`images`, `documents`, `archives`, `trash`), inline rename, soft-delete to trash, restore, and permanent purge.
- **Collaboration Groups:** Group creation, member additions, role checks, group share linking, individual file deletion, and batch revocation.
- **Owner Revocation:** Rejection of unauthorized revokes and verified physical file destruction on valid revocation.

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

### 4. Run Both Servers Concurrently
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
   - `STORAGE_DRIVER`: `s3` *(or `local` if testing)*
   - `S3_ENDPOINT`: *(your Supabase / Cloudflare R2 endpoint)*
   - `S3_REGION`: `auto`
   - `S3_ACCESS_KEY_ID`: *(your S3 Access Key)*
   - `S3_SECRET_ACCESS_KEY`: *(your S3 Secret Key)*
   - `S3_BUCKET_NAME`: `quickshare-files`
   - `FRONTEND_URL`: `https://your-quickshare.vercel.app`
5. Click **Deploy Web Service**. Render assigns a free URL: `https://quickshare-api-hbal.onrender.com`.

### Phase 3: Deploy Frontend to Vercel (₹0)
1. Sign in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2. Import your GitHub repository and configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://quickshare-api-hbal.onrender.com/api`
4. Click **Deploy**. Vercel deploys to edge CDN with SSL at `https://your-quickshare.vercel.app`.

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
