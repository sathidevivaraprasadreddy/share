import express from 'express';
import {
  createShareSession,
  getShareSession,
  downloadSingleFile,
  downloadAllFiles,
  revokeShareSession
} from '../controllers/shareController.js';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  loginWithGoogle,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  deleteAccount,
  searchUsers
} from '../controllers/authController.js';
import {
  lookupSixDigitCode,
  verifySharePassword,
  createDirectShare
} from '../controllers/transferController.js';
import {
  getInbox,
  updateInboxItem,
  removeInboxItem
} from '../controllers/inboxController.js';
import {
  getMyFiles,
  renameFile,
  deleteFile,
  restoreFile,
  getStorageStats
} from '../controllers/fileController.js';
import {
  getGroups,
  createGroup,
  getGroupDetails,
  addMember,
  removeMember,
  shareWithGroup,
  deleteGroup,
  leaveGroup,
  getGroupByInvite,
  joinGroupByInvite,
  getGroupMessages,
  sendGroupMessage,
  deleteGroupMessage
} from '../controllers/groupController.js';
import {
  getActivityTimeline,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  deleteActivityLog,
  clearAllActivityLogs
} from '../controllers/activityController.js';
import { upload } from '../middleware/upload.js';
import { uploadLimiter, downloadLimiter } from '../middleware/rateLimiter.js';
import { authenticateRequired, authenticateOptional } from '../middleware/authMiddleware.js';
import { testDbConnection } from '../config/db.js';

const router = express.Router();

// ==========================================
// 1. System & Health
// ==========================================
router.get('/health', async (req, res) => {
  const dbStatus = await testDbConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// ==========================================
// 2. Authentication & Profile
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/google', loginWithGoogle);
router.post('/auth/otp/send', sendPhoneOtp);
router.post('/auth/otp/verify', verifyPhoneOtp);
router.post('/auth/email-otp/send', sendEmailOtp);
router.post('/auth/email-otp/verify', verifyEmailOtp);
router.delete('/auth/account', authenticateRequired, deleteAccount);
router.get('/auth/me', authenticateRequired, getMe);
router.put('/auth/profile', authenticateRequired, updateProfile);
router.put('/auth/change-password', authenticateRequired, changePassword);
router.get('/users/search', authenticateRequired, searchUsers);

// ==========================================
// 3. Sharing & Transfers (Guest & Authenticated)
// ==========================================
// Upload multiple files and create sharing session (link / code)
router.post('/upload', uploadLimiter, authenticateOptional, upload.array('files'), createShareSession);

// Lookup 6-digit transfer code
router.post('/transfer/code-lookup', lookupSixDigitCode);

// Verify password for protected shares
router.post('/transfer/verify-password/:token', verifySharePassword);

// Direct User Sharing (into recipient Inbox)
router.post('/transfer/direct', uploadLimiter, authenticateOptional, upload.array('files'), createDirectShare);

// Get sharing session details and file listing (public / with optional auth)
router.get('/session/:token', authenticateOptional, getShareSession);

// Download a single file
router.get('/download/:token/:fileId', downloadLimiter, authenticateOptional, downloadSingleFile);

// Download all files bundled as a ZIP
router.get('/download-all/:token', downloadLimiter, authenticateOptional, downloadAllFiles);

// Revoke a share session (by revoke token or logged-in owner)
router.post('/revoke', authenticateOptional, revokeShareSession);

// ==========================================
// 4. User Inbox (Direct Transfers)
// ==========================================
router.get('/inbox', authenticateRequired, getInbox);
router.patch('/inbox/:id', authenticateRequired, updateInboxItem);
router.delete('/inbox/:id', authenticateRequired, removeInboxItem);

// ==========================================
// 5. File Management ("My Files")
// ==========================================
router.get('/my-files', authenticateRequired, getMyFiles);
router.get('/my-files/storage-stats', authenticateRequired, getStorageStats);
router.patch('/my-files/:id', authenticateRequired, renameFile);
router.delete('/my-files/:id', authenticateRequired, deleteFile);
router.post('/my-files/:id/restore', authenticateRequired, restoreFile);

// ==========================================
// 6. Collaboration Groups
// ==========================================
router.get('/groups', authenticateRequired, getGroups);
router.post('/groups', authenticateRequired, createGroup);
router.get('/groups/invite/:code', authenticateOptional, getGroupByInvite);
router.post('/groups/join-invite', authenticateRequired, joinGroupByInvite);
router.get('/groups/:id', authenticateRequired, getGroupDetails);
router.delete('/groups/:id', authenticateRequired, deleteGroup);
router.post('/groups/:id/members', authenticateRequired, addMember);
router.delete('/groups/:id/members/:userId', authenticateRequired, removeMember);
router.post('/groups/:id/leave', authenticateRequired, leaveGroup);
router.post('/groups/:id/share', authenticateRequired, shareWithGroup);
router.get('/groups/:id/messages', authenticateRequired, getGroupMessages);
router.post('/groups/:id/messages', authenticateRequired, sendGroupMessage);
router.delete('/groups/:id/messages/:messageId', authenticateRequired, deleteGroupMessage);

// ==========================================
// 7. Activity Timeline & Notifications
// ==========================================
router.get('/activity', authenticateRequired, getActivityTimeline);
router.delete('/activity/:id', authenticateRequired, deleteActivityLog);
router.delete('/activity', authenticateRequired, clearAllActivityLogs);
router.get('/notifications', authenticateRequired, getNotifications);
router.patch('/notifications/:id/read', authenticateRequired, markNotificationRead);
router.post('/notifications/read-all', authenticateRequired, markAllNotificationsRead);
router.delete('/notifications/:id', authenticateRequired, deleteNotification);
router.delete('/notifications', authenticateRequired, clearAllNotifications);

export default router;
