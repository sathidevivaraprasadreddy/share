import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/app.js';
import { getDbPool } from '../src/config/db.js';

describe('QuickShare Full Platform Advanced Test Suite', () => {
  let user1Token = '';
  let user1 = null;
  let user2Token = '';
  let user2 = null;

  let directShareToken = '';
  let directSessionFileId = null;
  let sixDigitCode = '';
  let inboxItemId = null;
  let groupId = null;

  beforeAll(async () => {
    // Ensure clean test database
    const db = getDbPool();
    await db.query(`DELETE FROM users WHERE username IN ('test_alice', 'test_bob')`);
  });

  afterAll(async () => {
    const db = getDbPool();
    await db.end();

    const testDbPath = path.resolve(process.cwd(), 'database/quickshare_test.sqlite');
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  describe('1. User Authentication & Profile Management', () => {
    it('should register Alice successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'test_alice',
        email: 'alice@example.com',
        password: 'Password123!',
        displayName: 'Alice Wonderland'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('test_alice');

      user1Token = res.body.token;
      user1 = res.body.user;
    });

    it('should register Bob successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'test_bob',
        email: 'bob@example.com',
        password: 'Password123!',
        displayName: 'Bob Builder'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      user2Token = res.body.token;
      user2 = res.body.user;
    });

    it('should reject registration with duplicate username (409)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'test_alice',
        email: 'alice_different@example.com',
        password: 'Password123!'
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/username is already taken/i);
    });

    it('should login Alice with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'test_alice',
        password: 'Password123!'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should reject login with wrong password (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'test_alice',
        password: 'WrongPassword'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return current user profile via /auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('test_alice');
      expect(res.body.user.storageQuotaBytes).toBeGreaterThan(0);
    });

    it('should update display name via /auth/profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ displayName: 'Alice In Wonderland' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Direct User Sharing & Inbox Flow', () => {
    it('Alice sends a file directly to Bobs inbox', async () => {
      const fileContent = Buffer.from('Confidential report from Alice to Bob');
      const res = await request(app)
        .post('/api/transfer/direct')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('recipients', 'test_bob')
        .field('note', 'Here is the project report.')
        .field('expiryHours', '24')
        .attach('files', fileContent, 'annual_report.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.shareToken).toBeDefined();
      expect(res.body.sixCode).toBeDefined();
      expect(res.body.recipientCount).toBe(1);

      directShareToken = res.body.shareToken;
      sixDigitCode = res.body.sixCode;
    });

    it('Bob checks his Inbox and sees the file from Alice', async () => {
      const res = await request(app)
        .get('/api/inbox')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);

      const item = res.body.items.find((i) => i.shareToken === directShareToken);
      expect(item).toBeDefined();
      expect(item.sender.username).toBe('test_alice');
      expect(item.files.length).toBe(1);
      expect(item.files[0].name).toBe('annual_report.txt');

      inboxItemId = item.id;
      directSessionFileId = item.files[0].id;
    });

    it('Bob downloads the file directly from his Inbox', async () => {
      const res = await request(app)
        .get(`/api/download/${directShareToken}/${directSessionFileId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('Confidential report from Alice to Bob');
    });

    it('Bob removes the file from his Inbox; Alices file is NOT deleted', async () => {
      const removeRes = await request(app)
        .delete(`/api/inbox/${inboxItemId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.success).toBe(true);

      // Verify Bobs inbox no longer lists it
      const inboxRes = await request(app)
        .get('/api/inbox')
        .set('Authorization', `Bearer ${user2Token}`);
      const foundInBob = inboxRes.body.items.find((i) => i.id === inboxItemId);
      expect(foundInBob).toBeUndefined();

      // Verify Alice still owns the file in My Files
      const aliceFilesRes = await request(app)
        .get('/api/my-files')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(aliceFilesRes.status).toBe(200);
      const aliceFile = aliceFilesRes.body.files.find((f) => f.name === 'annual_report.txt');
      expect(aliceFile).toBeDefined();
      expect(aliceFile.isDeleted).toBe(false);
    });
  });

  describe('3. Six-Digit Transfer Code Retrieval & Abuse Controls', () => {
    it('Recipient retrieves transfer details using 6-digit code', async () => {
      const res = await request(app)
        .post('/api/transfer/code-lookup')
        .send({ code: sixDigitCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shareToken).toBe(directShareToken);
      expect(res.body.fileCount).toBe(1);
    });

    it('Returns 404 for non-existent 6-digit code', async () => {
      const res = await request(app)
        .post('/api/transfer/code-lookup')
        .send({ code: '999999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Rejects malformed non-6-digit code', async () => {
      const res = await request(app)
        .post('/api/transfer/code-lookup')
        .send({ code: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Password Protected Shares & Limits', () => {
    let pwShareToken = '';
    let pwFileId = null;

    it('Uploads a file with password protection and download limit', async () => {
      const fileContent = Buffer.from('Top secret password protected document');
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('password', 'SecretPass789')
        .field('maxDownloads', '1')
        .field('expiryHours', '24')
        .attach('files', fileContent, 'secret_memo.txt');

      expect(res.status).toBe(201);
      expect(res.body.isPasswordProtected).toBe(true);
      pwShareToken = res.body.shareToken;
    });

    it('Public session view flags isPasswordRequired = true and hides file list', async () => {
      const res = await request(app).get(`/api/session/${pwShareToken}`);
      expect(res.status).toBe(200);
      expect(res.body.isPasswordRequired).toBe(true);
      expect(res.body.files.length).toBe(0);
    });

    it('Verifies correct password unlocks the session metadata', async () => {
      const res = await request(app)
        .post(`/api/transfer/verify-password/${pwShareToken}`)
        .send({ password: 'SecretPass789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Access session passing password header
      const sessionRes = await request(app)
        .get(`/api/session/${pwShareToken}`)
        .set('x-share-password', 'SecretPass789');

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.files.length).toBe(1);
      expect(sessionRes.body.files[0].name).toBe('secret_memo.txt');
      pwFileId = sessionRes.body.files[0].id;
    });

    it('Downloads file with correct password header', async () => {
      const res = await request(app)
        .get(`/api/download/${pwShareToken}/${pwFileId}`)
        .set('x-share-password', 'SecretPass789');

      expect(res.status).toBe(200);
      expect(res.text).toBe('Top secret password protected document');
    });

    it('Enforces 1-time download limit (subsequent download returns 410 Gone)', async () => {
      const res = await request(app)
        .get(`/api/download/${pwShareToken}/${pwFileId}`)
        .set('x-share-password', 'SecretPass789');

      expect(res.status).toBe(410);
      expect(res.body.error).toMatch(/maximum download limit/i);
    });
  });

  describe('5. File Management (My Files, Trash & Storage Stats)', () => {
    let fileToManageId = null;

    it('Alice views My Files with active uploads', async () => {
      const res = await request(app)
        .get('/api/my-files')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.files.length).toBeGreaterThanOrEqual(1);
      fileToManageId = res.body.files[0].id;
    });

    it('Alice renames a file in My Files', async () => {
      const res = await request(app)
        .patch(`/api/my-files/${fileToManageId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ newName: 'renamed_document.txt' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.newName).toBe('renamed_document.txt');
    });

    it('Bob cannot rename Alices file (IDOR protection)', async () => {
      const res = await request(app)
        .patch(`/api/my-files/${fileToManageId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ newName: 'hacked_name.txt' });

      expect(res.status).toBe(404);
    });

    it('Alice moves file to trash', async () => {
      const res = await request(app)
        .delete(`/api/my-files/${fileToManageId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/moved to trash/i);
    });

    it('File appears in trash category filter and can be restored', async () => {
      const trashRes = await request(app)
        .get('/api/my-files?category=trash')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(trashRes.status).toBe(200);
      expect(trashRes.body.files.some((f) => f.id === fileToManageId)).toBe(true);

      const restoreRes = await request(app)
        .post(`/api/my-files/${fileToManageId}/restore`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(restoreRes.status).toBe(200);
    });

    it('Returns accurate storage quota and usage stats', async () => {
      const res = await request(app)
        .get('/api/my-files/storage-stats')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.quotaBytes).toBe(1073741824);
      expect(res.body.usedBytes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('6. Collaboration Groups', () => {
    it('Alice creates a new group', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Core Project Team',
          description: 'Team files and assets'
        });

      expect(res.status).toBe(201);
      expect(res.body.group.name).toBe('Core Project Team');
      groupId = res.body.group.id;
    });

    it('Alice invites Bob to the group', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ username: 'test_bob' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Bob can view group details and members', async () => {
      const res = await request(app)
        .get(`/api/groups/${groupId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.group.members.length).toBe(2);
    });

    it('Alice shares a session with the group', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/share`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ shareToken: directShareToken });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Bob leaves the group and loses access', async () => {
      const leaveRes = await request(app)
        .delete(`/api/groups/${groupId}/members/${user2.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(leaveRes.status).toBe(200);

      // Access should now be forbidden
      const checkRes = await request(app)
        .get(`/api/groups/${groupId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(checkRes.status).toBe(403);
    });
  });

  describe('7. Activity Timeline & Notifications', () => {
    it('Alice retrieves her activity audit timeline', async () => {
      const res = await request(app)
        .get('/api/activity')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.activity.length).toBeGreaterThan(0);
    });

    it('Bob checks notifications for the transfer and group invite', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('Bob marks all notifications as read', async () => {
      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('8. Critical File Revocation Behavior', () => {
    it('Alice revokes the direct transfer session', async () => {
      const res = await request(app)
        .post('/api/revoke')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ shareToken: directShareToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Subsequent download by any user returns 410 Gone', async () => {
      const res = await request(app)
        .get(`/api/download/${directShareToken}/${directSessionFileId}`);

      expect(res.status).toBe(410);
      expect(res.body.error).toMatch(/revoked/i);
    });

    it('6-digit code lookup for revoked session returns 410 Gone', async () => {
      const res = await request(app)
        .post('/api/transfer/code-lookup')
        .send({ code: sixDigitCode });

      expect(res.status).toBe(410);
      expect(res.body.isRevoked).toBe(true);
    });
  });

  describe('9. Phone Number + OTP, Google Sign-In & Deletion Features', () => {
    let phoneOtp = '';
    let phoneUserToken = '';
    let googleUserToken = '';
    let testGroupToDeleteId = null;

    it('should send phone OTP successfully', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+91 9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.devOtp).toBeDefined();
      expect(res.body.devOtp.length).toBe(6);
      phoneOtp = res.body.devOtp;
    });

    it('should reject invalid phone OTP', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+91 9876543210', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should verify correct phone OTP and register new user', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+91 9876543210', otp: phoneOtp, displayName: 'Phone User' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.phone).toBe('+919876543210');
      phoneUserToken = res.body.token;
    });

    it('should send email OTP and verify successfully', async () => {
      // 1. Send OTP
      const sendRes = await request(app)
        .post('/api/auth/email-otp/send')
        .send({ email: 'student_nbkr@gmail.com' });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);
      expect(sendRes.body.devOtp).toBeDefined();

      // 2. Reject incorrect code
      const badRes = await request(app)
        .post('/api/auth/email-otp/verify')
        .send({ email: 'student_nbkr@gmail.com', otp: '111111' });
      expect(badRes.status).toBe(400);

      // 3. Verify correct code
      const verifyRes = await request(app)
        .post('/api/auth/email-otp/verify')
        .send({ email: 'student_nbkr@gmail.com', otp: sendRes.body.devOtp, displayName: 'NBKR Student' });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.email).toBe('student_nbkr@gmail.com');
    });

    it('should sign in or register with Google credentials', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'google_tester@example.com',
          name: 'Google Tester',
          googleId: 'google_id_123456789'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('google_tester@example.com');
      googleUserToken = res.body.token;
    });

    it('should create a group and allow the owner to delete it', async () => {
      // 1. Create group
      const createRes = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${phoneUserToken}`)
        .send({ name: 'Temporary Delete Group', description: 'Testing deletion' });

      expect(createRes.status).toBe(201);
      testGroupToDeleteId = createRes.body.group.id;

      // 2. Non-owner trying to delete fails (403)
      const unauthDelete = await request(app)
        .delete(`/api/groups/${testGroupToDeleteId}`)
        .set('Authorization', `Bearer ${googleUserToken}`);
      expect(unauthDelete.status).toBe(403);

      // 3. Owner deletes successfully (200)
      const deleteRes = await request(app)
        .delete(`/api/groups/${testGroupToDeleteId}`)
        .set('Authorization', `Bearer ${phoneUserToken}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // 4. Group details now returns 404
      const checkRes = await request(app)
        .get(`/api/groups/${testGroupToDeleteId}`)
        .set('Authorization', `Bearer ${phoneUserToken}`);
      expect(checkRes.status).toBe(404);
    });

    it('should allow user to permanently delete their account', async () => {
      // Reject without confirmation keyword
      const badConfirm = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${phoneUserToken}`)
        .send({ confirmation: 'NO' });
      expect(badConfirm.status).toBe(400);

      // Delete with confirmation: 'DELETE'
      const deleteRes = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${phoneUserToken}`)
        .send({ confirmation: 'DELETE' });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Subsequent access returns 401
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${phoneUserToken}`);
      expect(meRes.status).toBe(401);
    });
  });
});
