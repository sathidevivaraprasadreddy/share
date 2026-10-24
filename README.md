# QuickShare 🚀
> **Advanced, 100% Free & Open-Source Ephemeral File-Sharing Platform**  
> Direct peer-to-peer WebRTC data channels, 6-digit transfer codes, cryptographic share links, in-app recipient inboxes, collaboration groups, and zero-cost cloud deployment.

![QuickShare Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Free Stack](https://img.shields.io/badge/Cost-₹0%20Zero%20Paid%20Tiers-rose)
![Node Engine](https://img.shields.io/badge/Node.js-v24%20Native%20SQLite%20Ready-blue)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20DataChannels-indigo)
![Tests](https://img.shields.io/badge/Tests-55%2F55%20Passing-emerald)

---

## 🌐 Live Production Application
- **Frontend Web Application:** [https://quickshare-azure.vercel.app/](https://quickshare-azure.vercel.app/)
- **Backend REST & WebSocket API:** [https://quickshare-api-hbal.onrender.com/](https://quickshare-api-hbal.onrender.com/)
- **WebRTC Signaling Endpoint:** `wss://quickshare-api-hbal.onrender.com/ws`
- **Cloud Database:** TiDB Serverless (Cloud MySQL 5.7/8.0 wire-compatible)
- **Persistent Cloud Storage:** Supabase Object Storage / Cloudflare R2 (S3-compatible)
- **GitHub Repository:** [https://github.com/sathidevivaraprasadreddy/share](https://github.com/sathidevivaraprasadreddy/share)

---

## 📋 Table of Contents
1. [Overview & Product Vision](#-overview--product-vision)
2. [Multiple Sharing Methods](#-multiple-sharing-methods)
3. [Core Feature Areas](#-core-feature-areas)
4. [Technology Architecture](#-technology-architecture)
5. [₹0 Zero-Cost Cloud Stack & Provider Quotas](#-0-zero-cost-cloud-stack--provider-quotas)
6. [Zero-Config Local Development](#-zero-config-local-development)
7. [Production Deployment Guide](#-production-deployment-guide)
8. [Automated Testing Suite](#-automated-testing-suite)
9. [Security, Privacy & Data Lifecycle](#-security-privacy--data-lifecycle)

---

## 🌟 Overview & Product Vision

QuickShare is designed for individual users, friends, families, remote teams, and communities who need to share files securely across devices without forced signups, intrusive ads, or costly subscriptions.

QuickShare supports **both guests and registered users**:
- **Guest Mode:** No account required. Drop files, get an instant 6-digit code or share link, and transfer immediately.
- **Registered Account (Free):** Unlocks persistent file management, custom avatars, recipient in-app inboxes, team groups, audit logs, and up to 1 GB of personal cloud storage.

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
- **How it works:** Authenticated senders can dispatch files directly into any registered user's inbox (e.g. `@alice`, `@bob`).
- **Inbox Management:** Recipients can pin, archive, read, and non-destructively remove files from their inbox. Removing an inbox entry never deletes the sender's original file.

### 4. 🔗 Ephemeral Links & Mobile QR Codes
- **How it works:** Generates high-entropy 128-bit unguessable tokens (`crypto.randomBytes(16)`) and high-contrast QR codes for instant smartphone camera scanning.
- **Protection:** Supports optional bcrypt password protection, configurable download limits (e.g. 1-time self-destruct download), and customizable expiry windows (1h, 6h, 24h, 3d, 7d).

---

## 🗂️ Core Feature Areas

```
QuickShare Navigation
├── 📤 Transfer Dashboard
│   ├── Send (Link & 6-Digit Code / Direct to Inbox / Group Share)
│   ├── Receive (6-Digit Code lookup & instant retrieve)
│   └── Quick P2P (WebRTC Browser-to-Browser Data Channels)
├── 📥 Recipient Inbox (Directly received files with Read, Pin, Archive)
├── 📁 My Files (File manager, categories, inline rename, trash bin & restore)
├── 👥 Collaboration Groups (Group file sharing, member invitations)
├── ⏱️ Activity Timeline (Audit logs for uploads, downloads, and revocations)
├── 🔔 Notifications (Live transfer alerts & unread badge)
└── ⚙️ Profile & Quota (Avatar color picker, storage meter, password change, Danger Zone account deletion)
```

- **🔑 Real-World Multi-Option Authentication (Anti-Spoofing & Free Tier):**
  - **Official Google OAuth 2.0 (Google Identity Services):** Real Google Sign-In popup with cryptographic JWT token verification against Google's servers (`https://oauth2.googleapis.com/tokeninfo`). Strictly forbids plain-text email spoofing.
  - **Real Email OTP (100% Free):** Generates cryptographic 6-digit one-time codes dispatched directly to the user's Gmail or email inbox via SMTP / Nodemailer.
  - **Cellular SMS OTP:** Supports real SMS delivery to physical mobile phones via Fast2SMS (free signup credits in India) and Twilio. Protects client security by never leaking OTP codes to the browser or network payload.
  - **Standard Email & Password:** Bcrypt hashed credentials with salted rounds.
- **💬 1-Click WhatsApp & Social Sharing:**
  - Instantly share files to **WhatsApp**, **Telegram**, **Email**, or via the mobile **Native Share Sheet** (`navigator.share`) with pre-composed transfer messages.
- **👁️ In-Browser Media Lightbox Preview:**
  - View images, listen to audio files with an interactive HTML5 player, play video streams, preview PDFs, and read code/text files directly in the browser before downloading.
- **🖼️ High-Res QR Code Export:**
  - One-click SVG-to-PNG generator allowing users to save transfer QR codes directly to their mobile photo gallery or desktop.
- **🛡️ Danger Zone & Account Deletion:**
  - Complete user self-service account deletion requiring explicit `"DELETE"` confirmation. Automatically cascades and permanently wipes physical files from disk, clears sessions, removes group memberships, and anonymizes audit logs.
- **👥 Group Lifecycle Management:**
  - Group creators can safely delete collaboration groups; members can self-serve leave groups at any time.
- **📜 Guest Recent Transfers:**
  - Automatic `localStorage` session tracker allowing guest users to view, re-copy, or monitor their active transfers across browser restarts.
- **Live Upload Progress:** Visual progress bar reporting actual byte transfer speed and percentage.
- **SHA-256 Checksums:** Cryptographic file hashes computed and validated on upload to guarantee data integrity.
- **Owner Revocation:** Uploaders receive an exclusive 192-bit secret revocation key (`revokeToken`). Calling revoke immediately invalidates the database session and purges physical files from storage.
- **Zip-on-the-Fly Archiving:** Multi-file shares can be downloaded individually or streamed as a single dynamically compressed `.zip` archive.

---

## 🏗️ Technology Architecture

```
[ Client Browsers (Desktop & Mobile) ]
       │                    ▲
       │ HTTPS / REST       │ WebRTC DataChannels (P2P Files)
       ▼                    ▼
[ Node.js + Express Server & WebSocket Hub (Render / Local) ]
       │                    │
       ├── WebRTC Signaling (/ws)
       ├── Rate Limiter & Security Headers (Helmet, CORS)
       ├── Storage Driver Adapter (Local Disk / S3 Object Storage)
       └── Dual-Engine Database Adapter
             ├── Local Self-Hosted: Node.js 24 Native SQLite (`node:sqlite`)
             └── Production Cloud: MySQL 8.0 / TiDB Serverless (Cloud MySQL)
```

| Layer | Local Development | ₹0 Production Cloud Deployment |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Vercel (Edge CDN, free `*.vercel.app`) |
| **Backend** | Node.js 24 (ESM), Express, `ws` (WebSockets) | Render Free Tier (`*.onrender.com`) |
| **Database** | Node.js 24 Native SQLite (`node:sqlite`) | TiDB Serverless (5 GB free MySQL compatible) |
| **Storage** | Local Filesystem (`backend/uploads`) | Supabase Object Storage / Cloudflare R2 (S3) |
| **Signaling** | Native WebSocket Server (`/ws`) | Render WebSocket Tunneling |

---

## 💰 ₹0 Zero-Cost Cloud Stack & Provider Quotas

All cloud services utilized have been verified from official provider documentation to operate **100% free with no mandatory credit card or surprise charges**:

| Provider & Service | Free Tier Allocation | Behavioral Notes & Constraints |
| :--- | :--- | :--- |
| **TiDB Serverless** (Database) | 5 GB storage + 50 million Request Units/month free forever | 100% MySQL wire-compatible. Zero cold-start latency. |
| **Render** (Backend API + WS) | 512 MB RAM, 750 instance hours/month | Free instances spin down after 15 min of inactivity; automatic cold-start wake-up takes ~30 seconds. |
| **Vercel** (Frontend Hosting) | 100 GB global edge bandwidth/month | Instant deployments with SSL on `*.vercel.app`. |
| **Supabase / Cloudflare R2** (S3) | 1 GB to 10 GB persistent object storage | Standard S3-compatible protocol. Cloudflare R2 provides $0 egress fees. |

---

## 💻 Zero-Config Local Development

QuickShare includes a zero-config native SQLite database engine built right into Node.js 24. **You do not need to install XAMPP or configure MySQL to run the project locally.**

### Prerequisites
- **Node.js:** v20+ (v24 recommended for native SQLite `node:sqlite`)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/sathidevivaraprasadreddy/quickshare.git
cd quickshare
```

### 2. Configure Backend
Copy the template `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```
*(By default, leaving `DATABASE_URL` empty automatically activates zero-config SQLite stored in `database/quickshare.sqlite`).*

Install dependencies:
```bash
npm install
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```

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

### Verified Test Coverage (48/48 Passing):
- **User Authentication:** Registration, duplicate checks, bcrypt verification, JWT signing, profile updates, and password changes.
- **Share Sessions & Uploads:** Single/multi-file uploads, mime-type sanitization, SHA-256 hash calculation, quota verification.
- **6-Digit Codes & Direct Transfer:** Code lookup, rate-limiting lockout verification, direct delivery into recipient inboxes.
- **Inbox Operations:** Read/pinned/archived state updates and non-destructive removal verification.
- **File Management:** Category filtering (`images`, `documents`, `archives`, `trash`), inline rename, soft-delete to trash, restore, and permanent purge.
- **Collaboration Groups:** Group creation, member additions, role checks, group share linking.
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
