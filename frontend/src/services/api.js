import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}` 
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000
});

// Attach JWT token from localStorage automatically if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quickshare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========================================================
// 1. Health & Core
// ========================================================
export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

// ========================================================
// 2. Authentication & Profile
// ========================================================
export async function registerUser(username, email, password, displayName) {
  const response = await api.post('/auth/register', { username, email, password, displayName });
  if (response.data.token) {
    localStorage.setItem('quickshare_token', response.data.token);
  }
  return response.data;
}

export async function loginUser(identifier, password) {
  const response = await api.post('/auth/login', { identifier, password });
  if (response.data.token) {
    localStorage.setItem('quickshare_token', response.data.token);
  }
  return response.data;
}

export function logoutUser() {
  localStorage.removeItem('quickshare_token');
}

export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function updateUserProfile(displayName, avatarColor) {
  const response = await api.put('/auth/profile', { displayName, avatarColor });
  return response.data;
}

export async function changeUserPassword(currentPassword, newPassword) {
  const response = await api.put('/auth/change-password', { currentPassword, newPassword });
  return response.data;
}

export async function sendPhoneOtp(phone) {
  const response = await api.post('/auth/otp/send', { phone });
  return response.data;
}

export async function verifyPhoneOtp(phone, otp, displayName) {
  const response = await api.post('/auth/otp/verify', { phone, otp, displayName });
  if (response.data.token) {
    localStorage.setItem('quickshare_token', response.data.token);
  }
  return response.data;
}

export async function sendEmailOtp(email) {
  const response = await api.post('/auth/email-otp/send', { email });
  return response.data;
}

export async function verifyEmailOtp(email, otp, displayName) {
  const response = await api.post('/auth/email-otp/verify', { email, otp, displayName });
  if (response.data.token) {
    localStorage.setItem('quickshare_token', response.data.token);
  }
  return response.data;
}

export async function loginWithGoogle(credential) {
  // If credential string (Google ID Token) is passed, send as { credential }
  const payload = typeof credential === 'string' ? { credential } : credential;
  const response = await api.post('/auth/google', payload);
  if (response.data.token) {
    localStorage.setItem('quickshare_token', response.data.token);
  }
  return response.data;
}

export async function deleteAccount(confirmation = 'DELETE') {
  const response = await api.delete('/auth/account', { data: { confirmation } });
  localStorage.removeItem('quickshare_token');
  return response.data;
}

// ========================================================
// 3. File Upload & Sharing Sessions
// ========================================================
export async function uploadFiles(files, options = {}, onProgress) {
  const opts = typeof options === 'number' ? { expiryHours: options } : (options || {});
  const formData = new FormData();
  formData.append('expiryHours', opts.expiryHours || 24);
  if (opts.password) formData.append('password', opts.password);
  if (opts.maxDownloads) formData.append('maxDownloads', opts.maxDownloads);
  if (opts.burnOnDownload) formData.append('burnOnDownload', 'true');
  if (opts.note) formData.append('note', opts.note);

  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
      }
    }
  });

  return response.data;
}

export async function getSession(token, password = null) {
  const headers = {};
  if (password) {
    headers['x-share-password'] = password;
  }
  const response = await api.get(`/session/${token}`, { headers });
  return response.data;
}

export async function revokeSession(shareToken, revokeToken = null) {
  const response = await api.post('/revoke', { shareToken, revokeToken });
  return response.data;
}

// ========================================================
// 4. Six-Digit Code & Password Verification
// ========================================================
export async function lookupSixDigitCode(code) {
  const response = await api.post('/transfer/code-lookup', { code });
  return response.data;
}

export async function verifySharePassword(token, password) {
  const response = await api.post(`/transfer/verify-password/${token}`, { password });
  return response.data;
}

// ========================================================
// 5. Direct User Sharing
// ========================================================
export async function createDirectShare(files, recipients, options = {}, onProgress) {
  const formData = new FormData();
  formData.append('recipients', Array.isArray(recipients) ? recipients.join(',') : recipients);
  formData.append('expiryHours', options.expiryHours || 72);
  if (options.note) formData.append('note', options.note);
  if (options.password) formData.append('password', options.password);
  if (options.burnOnDownload) formData.append('burnOnDownload', 'true');

  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await api.post('/transfer/direct', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
      }
    }
  });

  return response.data;
}

export async function searchUsers(query) {
  const response = await api.get('/users/search', { params: { q: query } });
  return response.data;
}

// ========================================================
// 6. User Inbox
// ========================================================
export async function getInbox(filter = 'all') {
  const response = await api.get(`/inbox?filter=${filter}`);
  return response.data;
}

export async function updateInboxItem(id, data) {
  const response = await api.patch(`/inbox/${id}`, data);
  return response.data;
}

export async function removeInboxItem(id) {
  const response = await api.delete(`/inbox/${id}`);
  return response.data;
}

// ========================================================
// 7. My Files (Management)
// ========================================================
export async function getMyFiles(category = 'all', search = '', sort = 'date_desc') {
  const response = await api.get('/my-files', {
    params: { category, search, sort }
  });
  return response.data;
}

export async function getStorageStats() {
  const response = await api.get('/my-files/storage-stats');
  return response.data;
}

export async function renameFile(id, newName) {
  const response = await api.patch(`/my-files/${id}`, { newName });
  return response.data;
}

export async function deleteFile(id, permanent = false) {
  const response = await api.delete(`/my-files/${id}`, {
    params: { permanent }
  });
  return response.data;
}

export async function restoreFile(id) {
  const response = await api.post(`/my-files/${id}/restore`);
  return response.data;
}

// ========================================================
// 8. Collaboration Groups
// ========================================================
export async function getGroups() {
  const response = await api.get('/groups');
  return response.data;
}

export async function createGroup(name, description) {
  const response = await api.post('/groups', { name, description });
  return response.data;
}

export async function getGroupDetails(id) {
  const response = await api.get(`/groups/${id}`);
  return response.data;
}

export async function addGroupMember(id, username) {
  const response = await api.post(`/groups/${id}/members`, { username });
  return response.data;
}

export async function removeGroupMember(id, userId) {
  const response = await api.delete(`/groups/${id}/members/${userId}`);
  return response.data;
}

export async function shareWithGroup(id, shareToken) {
  const response = await api.post(`/groups/${id}/share`, { shareToken });
  return response.data;
}

export async function deleteGroup(id) {
  const response = await api.delete(`/groups/${id}`);
  return response.data;
}

export async function leaveGroup(id) {
  const response = await api.post(`/groups/${id}/leave`);
  return response.data;
}

export async function getGroupByInvite(code) {
  const response = await api.get(`/groups/invite/${encodeURIComponent(code)}`);
  return response.data;
}

export async function joinGroupByInvite(code) {
  const response = await api.post('/groups/join-invite', { inviteCode: code });
  return response.data;
}

export async function getGroupMessages(groupId) {
  const response = await api.get(`/groups/${groupId}/messages`);
  return response.data;
}

export async function sendGroupMessage(groupId, message) {
  const response = await api.post(`/groups/${groupId}/messages`, { message });
  return response.data;
}

export async function deleteGroupMessage(groupId, messageId) {
  const response = await api.delete(`/groups/${groupId}/messages/${messageId}`);
  return response.data;
}

// ========================================================
// 9. Activity & Notifications
// ========================================================
export async function getActivityTimeline() {
  const response = await api.get('/activity');
  return response.data;
}

export async function deleteActivityLog(id) {
  const response = await api.delete(`/activity/${id}`);
  return response.data;
}

export async function clearAllActivityLogs() {
  const response = await api.delete('/activity');
  return response.data;
}

export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.post('/notifications/read-all');
  return response.data;
}

export async function deleteNotification(id) {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
}

export async function clearAllNotifications() {
  const response = await api.delete('/notifications');
  return response.data;
}

// ========================================================
// 10. Direct Download URLs
// ========================================================
export function getSingleFileDownloadUrl(token, fileId, password = null) {
  const base = `${API_BASE}/download/${token}/${fileId}`;
  return password ? `${base}?password=${encodeURIComponent(password)}` : base;
}

export function getZipDownloadUrl(token, password = null) {
  const base = `${API_BASE}/download-all/${token}`;
  return password ? `${base}?password=${encodeURIComponent(password)}` : base;
}

export default {
  checkHealth,
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateUserProfile,
  changeUserPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  loginWithGoogle,
  deleteAccount,
  uploadFiles,
  getSession,
  revokeSession,
  lookupSixDigitCode,
  verifySharePassword,
  createDirectShare,
  getInbox,
  updateInboxItem,
  removeInboxItem,
  getMyFiles,
  getStorageStats,
  renameFile,
  deleteFile,
  restoreFile,
  getGroups,
  createGroup,
  getGroupDetails,
  addGroupMember,
  removeGroupMember,
  shareWithGroup,
  deleteGroup,
  leaveGroup,
  getGroupByInvite,
  joinGroupByInvite,
  getActivityTimeline,
  deleteActivityLog,
  clearAllActivityLogs,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getSingleFileDownloadUrl,
  getZipDownloadUrl
};
