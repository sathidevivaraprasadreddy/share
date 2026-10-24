import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/admin` 
  : '/api/admin';

const adminClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

// Attach admin session token from sessionStorage
adminClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('quickshare_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function loginAdmin(username, password, mfaCode) {
  const res = await adminClient.post('/login', { username, password, mfaCode });
  if (res.data.token) {
    sessionStorage.setItem('quickshare_admin_token', res.data.token);
    sessionStorage.setItem('quickshare_admin_user', JSON.stringify(res.data.admin));
  }
  return res.data;
}

export async function logoutAdmin() {
  try {
    await adminClient.post('/logout');
  } catch {}
  sessionStorage.removeItem('quickshare_admin_token');
  sessionStorage.removeItem('quickshare_admin_user');
}

export function getStoredAdmin() {
  try {
    const raw = sessionStorage.getItem('quickshare_admin_user');
    const token = sessionStorage.getItem('quickshare_admin_token');
    return token && raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getAdminOverview() {
  const res = await adminClient.get('/overview');
  return res.data;
}

export async function getAdminUsers() {
  const res = await adminClient.get('/users');
  return res.data;
}

export async function suspendUser(userId) {
  const res = await adminClient.post(`/users/${userId}/suspend`);
  return res.data;
}

export async function unsuspendUser(userId) {
  const res = await adminClient.post(`/users/${userId}/unsuspend`);
  return res.data;
}

export async function revokeUserSessions(userId) {
  const res = await adminClient.post(`/users/${userId}/revoke-sessions`);
  return res.data;
}

export async function changeUserPasswordAsAdmin(userId, newPassword) {
  const res = await adminClient.post(`/users/${userId}/change-password`, { newPassword });
  return res.data;
}

export async function getAdminSessions() {
  const res = await adminClient.get('/sessions');
  return res.data;
}

export async function revokeSessionAsAdmin(shareToken) {
  const res = await adminClient.post(`/sessions/${shareToken}/revoke`);
  return res.data;
}

export async function downloadSessionAsAdmin(shareToken, sessionCode) {
  const token = sessionStorage.getItem('quickshare_admin_token');
  const res = await axios.get(`${API_BASE}/sessions/${shareToken}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });

  // Extract filename if Content-Disposition exists
  let filename = `QuickShare_Admin_${sessionCode || shareToken.slice(0, 8)}.zip`;
  const disposition = res.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function getAdminLogins() {
  const res = await adminClient.get('/logins');
  return res.data;
}

export async function deleteLoginLog(id) {
  const res = await adminClient.delete(`/logins/${id}`);
  return res.data;
}

export async function clearLoginLogs() {
  const res = await adminClient.delete('/logins');
  return res.data;
}

export async function getAdminAuditLogs() {
  const res = await adminClient.get('/audit-logs');
  return res.data;
}

export async function deleteAuditLog(id) {
  const res = await adminClient.delete(`/audit-logs/${id}`);
  return res.data;
}

export async function clearAuditLogs() {
  const res = await adminClient.delete('/audit-logs');
  return res.data;
}

export async function downloadAdminCsv(type) {
  const token = sessionStorage.getItem('quickshare_admin_token');
  const res = await axios.get(`${API_BASE}/export/csv?type=${type}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  
  const blob = new Blob([res.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quickshare-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
