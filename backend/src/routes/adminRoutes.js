import express from 'express';
import {
  adminLogin,
  adminLogout,
  getAdminOverview,
  getAdminUsers,
  suspendUser,
  unsuspendUser,
  revokeUserSessions,
  changeUserPasswordAsAdmin,
  getAdminSessions,
  revokeSessionAsAdmin,
  downloadSessionAsAdmin,
  getAdminLogins,
  deleteLoginLog,
  clearLoginLogs,
  getAdminAuditLogs,
  deleteAuditLog,
  clearAuditLogs,
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
router.delete('/logins/:id', authenticateAdmin, deleteLoginLog);
router.delete('/logins', authenticateAdmin, clearLoginLogs);
router.get('/audit-logs', authenticateAdmin, getAdminAuditLogs);
router.delete('/audit-logs/:id', authenticateAdmin, deleteAuditLog);
router.delete('/audit-logs', authenticateAdmin, clearAuditLogs);
router.get('/export/csv', authenticateAdmin, exportDataCsv);

// ==========================================
// 3. User Governance, Password & Suspension (Protected)
// ==========================================
router.get('/users', authenticateAdmin, getAdminUsers);
router.post('/users/:id/suspend', authenticateAdmin, suspendUser);
router.post('/users/:id/unsuspend', authenticateAdmin, unsuspendUser);
router.post('/users/:id/revoke-sessions', authenticateAdmin, revokeUserSessions);
router.post('/users/:id/change-password', authenticateAdmin, changeUserPasswordAsAdmin);

// ==========================================
// 4. Session & Share Governance (Protected)
// ==========================================
router.get('/sessions', authenticateAdmin, getAdminSessions);
router.get('/sessions/:token/download', authenticateAdmin, downloadSessionAsAdmin);
router.post('/sessions/:token/revoke', authenticateAdmin, revokeSessionAsAdmin);

export default router;
