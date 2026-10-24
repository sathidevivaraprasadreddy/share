import express from 'express';
import {
  adminLogin,
  adminLogout,
  getAdminOverview,
  getAdminUsers,
  suspendUser,
  unsuspendUser,
  revokeUserSessions,
  getAdminSessions,
  revokeSessionAsAdmin,
  getAdminLogins,
  getAdminAuditLogs,
  exportDataCsv
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { adminLoginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ==========================================
// 1. Authentication (Strict Rate Limiting)
// ==========================================
router.post('/login', adminLoginLimiter, adminLogin);
router.post('/logout', authenticateAdmin, adminLogout);

// ==========================================
// 2. Monitoring & Metrics (Protected)
// ==========================================
router.get('/overview', authenticateAdmin, getAdminOverview);
router.get('/logins', authenticateAdmin, getAdminLogins);
router.get('/audit-logs', authenticateAdmin, getAdminAuditLogs);
router.get('/export/csv', authenticateAdmin, exportDataCsv);

// ==========================================
// 3. User Governance & Suspension (Protected)
// ==========================================
router.get('/users', authenticateAdmin, getAdminUsers);
router.post('/users/:id/suspend', authenticateAdmin, suspendUser);
router.post('/users/:id/unsuspend', authenticateAdmin, unsuspendUser);
router.post('/users/:id/revoke-sessions', authenticateAdmin, revokeUserSessions);

// ==========================================
// 4. Session & Share Governance (Protected)
// ==========================================
router.get('/sessions', authenticateAdmin, getAdminSessions);
router.post('/sessions/:token/revoke', authenticateAdmin, revokeSessionAsAdmin);

export default router;
