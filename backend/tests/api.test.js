import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/app.js';
import { getDbPool } from '../src/config/db.js';

describe('QuickShare API Integration Tests', () => {
  let createdShareToken = '';
  let createdRevokeToken = '';
  let uploadedFileId = null;

  afterAll(async () => {
    // Close db pool to allow jest to exit cleanly
    const db = getDbPool();
    await db.end();

    const testDbPath = path.resolve(process.cwd(), 'database/quickshare_test.sqlite');
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  describe('Health Check', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database.connected).toBe(true);
    });
  });

  describe('File Upload', () => {
    it('should reject requests with no files attached', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/select at least one file/i);
    });

    it('should upload a single text file successfully', async () => {
      const testBuffer = Buffer.from('Hello QuickShare Test Content!');
      const res = await request(app)
        .post('/api/upload')
        .field('expiryHours', '24')
        .attach('files', testBuffer, 'test_document.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.shareToken).toBeDefined();
      expect(res.body.revokeToken).toBeDefined();
      expect(res.body.fileCount).toBe(1);
      expect(res.body.totalSizeBytes).toBe(testBuffer.length);

      createdShareToken = res.body.shareToken;
      createdRevokeToken = res.body.revokeToken;
    });

    it('should upload multiple files in a single session', async () => {
      const file1 = Buffer.from('File One Content');
      const file2 = Buffer.from('File Two Content');

      const res = await request(app)
        .post('/api/upload')
        .field('expiryHours', '6')
        .attach('files', file1, 'file1.txt')
        .attach('files', file2, 'file2.txt');

      expect(res.status).toBe(201);
      expect(res.body.fileCount).toBe(2);
      expect(res.body.totalSizeBytes).toBe(file1.length + file2.length);
    });
  });

  describe('Session Retrieval', () => {
    it('should retrieve session details and file listing using share token', async () => {
      const res = await request(app).get(`/api/session/${createdShareToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.shareToken).toBe(createdShareToken);
      expect(res.body.files.length).toBe(1);
      expect(res.body.files[0].name).toBe('test_document.txt');

      uploadedFileId = res.body.files[0].id;
    });

    it('should return 404 for a non-existent token', async () => {
      const res = await request(app).get('/api/session/nonexistenttoken12345');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('File Download', () => {
    it('should download the original file with correct content and headers', async () => {
      const res = await request(app).get(
        `/api/download/${createdShareToken}/${uploadedFileId}`
      );
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello QuickShare Test Content!');
      expect(res.headers['content-disposition']).toContain('test_document.txt');
    });

    it('should download all files bundled as a ZIP', async () => {
      const res = await request(app).get(`/api/download-all/${createdShareToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
      expect(res.headers['content-disposition']).toContain('QuickShare_');
    });
  });

  describe('Session Revocation', () => {
    it('should reject revocation with incorrect revoke token', async () => {
      const res = await request(app).post('/api/revoke').send({
        shareToken: createdShareToken,
        revokeToken: 'wrong_secret_token'
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow owner to revoke the session using valid revoke token', async () => {
      const res = await request(app).post('/api/revoke').send({
        shareToken: createdShareToken,
        revokeToken: createdRevokeToken
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 410 Gone when accessing revoked session', async () => {
      const res = await request(app).get(`/api/session/${createdShareToken}`);
      expect(res.status).toBe(410);
      expect(res.body.isRevoked).toBe(true);
    });

    it('should prevent downloads from revoked session', async () => {
      const res = await request(app).get(
        `/api/download/${createdShareToken}/${uploadedFileId}`
      );
      expect(res.status).toBe(410);
    });
  });
});
