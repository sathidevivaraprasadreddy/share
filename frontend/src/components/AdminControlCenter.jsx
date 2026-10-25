import React, { useState, useEffect } from 'react';
import {
  loginAdmin,
  logoutAdmin,
  getStoredAdmin,
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
  downloadAdminCsv,
  getAdminMessages,
  deleteAdminMessage,
  getAdminGroups,
  deleteAdminGroup
} from '../services/adminApi';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Users,
  HardDrive,
  KeyRound,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  Ban,
  Check,
  FileSpreadsheet,
  Activity,
  Layers,
  Clock,
  Trash2,
  Globe,
  Laptop,
  MapPin,
  MessageSquare,
  MessageCircle,
  Hash
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function AdminControlCenter({ onExit }) {
  const [adminUser, setAdminUser] = useState(() => getStoredAdmin());
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, sessions, logins, audit

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Dashboard data states
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [loginsList, setLoginsList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [messagesList, setMessagesList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, title, message, onConfirm }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // User password edit modal
  const [passwordEditUser, setPasswordEditUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordEditLoading, setPasswordEditLoading] = useState(false);

  // Admin download tracking
  const [downloadingSessionToken, setDownloadingSessionToken] = useState(null);

  useEffect(() => {
    if (adminUser) {
      loadDashboardData();
    }
  }, [adminUser, activeTab]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      if (activeTab === 'overview') {
        const res = await getAdminOverview();
        if (res.success) setOverview(res.overview);
      } else if (activeTab === 'users') {
        const res = await getAdminUsers();
        if (res.success) setUsersList(res.users);
      } else if (activeTab === 'sessions') {
        const res = await getAdminSessions();
        if (res.success) setSessionsList(res.sessions);
      } else if (activeTab === 'logins') {
        const res = await getAdminLogins();
        if (res.success) setLoginsList(res.logs);
      } else if (activeTab === 'audit') {
        const res = await getAdminAuditLogs();
        if (res.success) setAuditList(res.logs);
      } else if (activeTab === 'messages') {
        const res = await getAdminMessages();
        if (res.success) setMessagesList(res.messages || []);
      } else if (activeTab === 'groups') {
        const res = await getAdminGroups();
        if (res.success) setGroupsList(res.groups || []);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await loginAdmin(username, password, mfaCode);
      if (res.success) {
        setAdminUser(res.admin);
        setActiveTab('overview');
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
    setOverview(null);
  };

  const handleExecuteSuspend = async (userId) => {
    setActionLoading(true);
    try {
      const res = await suspendUser(userId);
      if (res.success) {
        setActionMessage(res.message);
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuspended: true } : u))
        );
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to suspend user.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleExecuteUnsuspend = async (userId) => {
    setActionLoading(true);
    try {
      const res = await unsuspendUser(userId);
      if (res.success) {
        setActionMessage(res.message);
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuspended: false } : u))
        );
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unsuspend user.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleExecuteRevokeSessions = async (userId) => {
    setActionLoading(true);
    try {
      const res = await revokeUserSessions(userId);
      if (res.success) {
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke sessions.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleExecuteRevokeShareSession = async (shareToken) => {
    setActionLoading(true);
    try {
      const res = await revokeSessionAsAdmin(shareToken);
      if (res.success) {
        setActionMessage(res.message);
        setSessionsList((prev) =>
          prev.map((s) => (s.shareToken === shareToken ? { ...s, isRevoked: true, status: 'revoked' } : s))
        );
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke share session.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleChangeUserPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordEditUser || !newPasswordInput || newPasswordInput.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setPasswordEditLoading(true);
    try {
      const res = await changeUserPasswordAsAdmin(passwordEditUser.id, newPasswordInput);
      if (res.success) {
        setActionMessage(res.message);
        setPasswordEditUser(null);
        setNewPasswordInput('');
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user password.');
    } finally {
      setPasswordEditLoading(false);
    }
  };

  const handleDownloadSession = async (shareToken, sessionCode) => {
    setDownloadingSessionToken(shareToken);
    try {
      await downloadSessionAsAdmin(shareToken, sessionCode);
      setActionMessage(`Files for session ${sessionCode || shareToken.slice(0, 8)} downloaded successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to download session files.');
    } finally {
      setDownloadingSessionToken(null);
    }
  };

  const handleDeleteLoginLog = async (id) => {
    try {
      const res = await deleteLoginLog(id);
      if (res.success) {
        setLoginsList((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete login log.');
    }
  };

  const handleClearLoginLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL login history logs?')) return;
    try {
      const res = await clearLoginLogs();
      if (res.success) {
        setLoginsList([]);
        setActionMessage('All login history logs have been cleared.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to clear login logs.');
    }
  };

  const handleDeleteAuditLog = async (id) => {
    try {
      const res = await deleteAuditLog(id);
      if (res.success) {
        setAuditList((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete audit entry.');
    }
  };

  const handleClearAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL administrative audit logs?')) return;
    try {
      const res = await clearAuditLogs();
      if (res.success) {
        setAuditList([]);
        setActionMessage('All audit trail logs have been cleared.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to clear audit logs.');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this user chat message permanently?')) return;
    try {
      const res = await deleteAdminMessage(id);
      if (res.success) {
        setMessagesList((prev) => prev.filter((m) => m.id !== id));
        setActionMessage('Chat message permanently deleted.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete chat message.');
    }
  };

  const handleDeleteGroup = async (id, groupName) => {
    if (!window.confirm(`Are you sure you want to disband the group "${groupName}"? All chat messages and memberships will be deleted.`)) return;
    try {
      const res = await deleteAdminGroup(id);
      if (res.success) {
        setGroupsList((prev) => prev.filter((g) => g.id !== id));
        setActionMessage(`Group "${groupName}" disbanded.`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to disband group.');
    }
  };

  // ========================================================
  // 1. LOGIN SCREEN (Strictly Private)
  // ========================================================
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans text-slate-100 selection:bg-rose-600 selection:text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6 relative">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-700 to-rose-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-900/40">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Control Center Authentication
            </h1>
            <p className="text-xs text-slate-400">
              Restricted Operations & Infrastructure Portal
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Administrator Identifier
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                MFA Authorization PIN / Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{loginLoading ? 'Authenticating...' : 'Sign In to Control Center'}</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public QuickShare</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 mt-6 max-w-sm text-center">
          Tamper-Resistant Security Logging Active. Unauthorized connection attempts are logged with IP signatures.
        </p>
      </div>
    );
  }

  // Filtered lists for current tab
  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSessions = sessionsList.filter(
    (s) =>
      s.shareToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.sixCode && s.sixCode.includes(searchTerm)) ||
      (s.uploaderUsername && s.uploaderUsername.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-rose-600 selection:text-white">
      {/* Top Admin Header */}
      <header className="border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-900/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  QuickShare Control Center
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  Restricted
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Operator: <span className="font-mono text-slate-200">{adminUser.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadAdminCsv('users')}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Download registered users CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Users CSV</span>
              </button>
              <button
                type="button"
                onClick={() => downloadAdminCsv('sessions')}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Download share sessions CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                <span>Transfers CSV</span>
              </button>
              <button
                type="button"
                onClick={() => downloadAdminCsv('audit')}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Download audit trail CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Portal</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="py-1.5 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Revoke & Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Action feedback alert */}
        {actionMessage && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'overview', label: 'System Overview', icon: Activity },
              { id: 'messages', label: 'User Chats', icon: MessageSquare },
              { id: 'groups', label: 'Groups', icon: MessageCircle },
              { id: 'users', label: 'Registered Users', icon: Users },
              { id: 'sessions', label: 'Share Transfers', icon: Layers },
              { id: 'logins', label: 'Login History', icon: Clock },
              { id: 'audit', label: 'Audit Trail', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {(activeTab === 'users' || activeTab === 'sessions' || activeTab === 'messages' || activeTab === 'groups') && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'messages'
                      ? 'Search chat text / sender...'
                      : activeTab === 'groups'
                      ? 'Search group name / invite code...'
                      : 'Filter by name / token / code...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 w-52 sm:w-64"
                />
              </div>
            )}
            <button
              onClick={loadDashboardData}
              disabled={loadingData}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Registered Users</span>
                  <Users className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-white">{overview.totalUsers}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{overview.activeUsers} active</span>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{overview.suspendedUsers} suspended</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Active Storage</span>
                  <HardDrive className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-white">
                  {formatBytes(overview.totalStorageBytes)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Across {overview.totalFiles} physical files
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Share Sessions</span>
                  <Layers className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-white">{overview.totalSessions}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{overview.activeSessions} active</span>
                  <span>•</span>
                  <span className="text-slate-400">{overview.revokedSessions} revoked</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Downloads Served</span>
                  <Download className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-white">{overview.totalDownloads}</div>
                <div className="text-[11px] text-slate-400">
                  {overview.securityEventsCount} security log events
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 col-span-2 md:col-span-1">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>Groups & Chats</span>
                  <MessageCircle className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">{overview.totalGroups || 0}</div>
                <div className="text-[11px] text-slate-400">
                  {overview.totalMessages || 0} chat messages sent
                </div>
              </div>
            </div>

            {/* Privacy Policy & Architectural Integrity Notice */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Zero-Knowledge Transfer & Privacy Architecture</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                QuickShare is built with strict privacy guarantees. In compliance with applicable privacy laws and zero-knowledge transfer principles, the operator control center has zero visibility into file contents or end-to-end peer communications. Administrator powers are strictly limited to infrastructure health monitoring, abuse mitigation, storage quota governance, and revocation of compromised links.
              </p>
            </div>
          </div>
        )}

        {/* TAB: USER CHATS & MESSAGES */}
        {activeTab === 'messages' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-500" />
                  <span>User Chat Viewing & Moderation</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live monitoring of messages across all collaboration groups. Admin can purge violating content.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-300 rounded-xl">
                {messagesList.length} Messages
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Group</th>
                      <th className="py-3 px-4">Sender</th>
                      <th className="py-3 px-4">Message Content</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {messagesList
                      .filter((m) => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          (m.message || '').toLowerCase().includes(term) ||
                          (m.username || '').toLowerCase().includes(term) ||
                          (m.group_name || '').toLowerCase().includes(term)
                        );
                      })
                      .map((msg) => (
                        <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/70 text-indigo-300 font-sans font-bold text-[11px]">
                              <Hash className="w-3 h-3 text-indigo-400" />
                              <span>{msg.group_name || `Group #${msg.group_id}`}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                                style={{ backgroundColor: msg.avatar_color || '#e11d48' }}
                              >
                                {(msg.username || 'U')[0].toUpperCase()}
                              </div>
                              <div className="font-sans">
                                <div className="text-white font-semibold text-xs leading-none">
                                  {msg.display_name || msg.username}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 leading-none">
                                  @{msg.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-md font-sans">
                            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs break-words leading-relaxed">
                              {msg.message}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(msg.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition-colors"
                              title="Delete this message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {messagesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                          No group messages found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: COLLABORATION GROUPS */}
        {activeTab === 'groups' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-400" />
                  <span>Collaboration Groups Governance</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage active rooms and groups. Disbanding removes group members, messages, and shares.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-300 rounded-xl">
                {groupsList.length} Groups
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Group Name</th>
                      <th className="py-3 px-4">Invite Code</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Members</th>
                      <th className="py-3 px-4">Files / Messages</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {groupsList
                      .filter((g) => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          (g.name || '').toLowerCase().includes(term) ||
                          (g.invite_code || '').toLowerCase().includes(term) ||
                          (g.owner_username || '').toLowerCase().includes(term)
                        );
                      })
                      .map((grp) => (
                        <tr key={grp.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">{grp.name}</div>
                            {grp.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {grp.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                            {grp.invite_code || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            @{grp.owner_username || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">
                            {grp.member_count || 1} members
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            <span className="text-emerald-400 font-semibold">{grp.file_count || 0} files</span>
                            <span className="mx-1">•</span>
                            <span className="text-indigo-400 font-semibold">{grp.message_count || 0} msgs</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(grp.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp.id, grp.name)}
                              className="py-1 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition-colors text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Disband</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    {groupsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No collaboration groups found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED USERS */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Storage Used</th>
                    <th className="py-3 px-4">Files / Shares</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No users match query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span>{u.username}</span>
                            {u.isAdmin && (
                              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email || 'No email registered'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {formatBytes(u.storageUsedBytes)} / {(u.storageQuotaBytes / 1048576).toFixed(0)} MB
                        </td>
                        <td className="py-3 px-4">
                          {u.fileCount} files ({u.sessionCount} shares)
                        </td>
                        <td className="py-3 px-4">
                          {u.isSuspended ? (
                            <span className="text-rose-400 font-bold bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full text-[10px]">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordEditUser(u);
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Reset or edit user password"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Password</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                title: 'Revoke User Sessions',
                                message: `Invalidate all active devices and sessions for "${u.username}"?`,
                                onConfirm: () => handleExecuteRevokeSessions(u.id)
                              })
                            }
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Kick Sessions
                          </button>

                          {u.isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleExecuteUnsuspend(u.id)}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold transition-colors"
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={u.id === adminUser.id}
                              onClick={() =>
                                setConfirmAction({
                                  title: 'Suspend User Account',
                                  message: `Are you sure you want to suspend "${u.username}"? This locks login and immediately invalidates all active sessions.`,
                                  onConfirm: () => handleExecuteSuspend(u.id)
                                })
                              }
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SHARE TRANSFERS */}
        {activeTab === 'sessions' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Transfer / Token</th>
                    <th className="py-3 px-4">Uploader</th>
                    <th className="py-3 px-4">Size & Count</th>
                    <th className="py-3 px-4">Downloads</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Revocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No share sessions match query.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-100 flex items-center gap-2">
                            <span>{s.shareToken.slice(0, 16)}...</span>
                            {s.sixCode && (
                              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                {s.sixCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{new Date(s.createdAt).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                            <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="text-cyan-300">{s.clientIp || '127.0.0.1'}</span>
                            <span>•</span>
                            <span className="text-slate-300">{s.clientLocation || 'Localhost'}</span>
                            <span>•</span>
                            <span className="text-slate-400">{s.clientDevice || 'Desktop'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{s.uploaderUsername}</td>
                        <td className="py-3 px-4">
                          {formatBytes(s.totalSizeBytes)} ({s.fileCount} file(s))
                        </td>
                        <td className="py-3 px-4">{s.downloadCount} download(s)</td>
                        <td className="py-3 px-4">
                          {s.isRevoked ? (
                            <span className="text-rose-400 font-bold bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full text-[10px]">
                              REVOKED
                            </span>
                          ) : s.isExpired ? (
                            <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadSession(s.shareToken, s.sixCode)}
                            disabled={downloadingSessionToken === s.shareToken || s.isRevoked}
                            className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                            title="Download all files in this transfer directly"
                          >
                            <Download className="w-3 h-3" />
                            <span>{downloadingSessionToken === s.shareToken ? 'Downloading...' : 'Download Files'}</span>
                          </button>

                          {!s.isRevoked && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  title: 'Revoke Share Session',
                                  message: `Revoke token "${s.shareToken}" and shred all underlying files from storage?`,
                                  onConfirm: () => handleExecuteRevokeShareSession(s.shareToken)
                                })
                              }
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LOGIN HISTORY */}
        {activeTab === 'logins' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Login Activity Logs ({loginsList.length})
              </span>
              {loginsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLoginLogs}
                  className="px-2.5 py-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Logins
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Identifier / User</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">IP & Network</th>
                    <th className="py-3 px-4">Device & Client</th>
                    <th className="py-3 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {loginsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No login events recorded.
                      </td>
                    </tr>
                  ) : (
                    loginsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-200">
                          {log.username_or_email}
                        </td>
                        <td className="py-2.5 px-4">
                          {log.status === 'success' || log.status === 'admin_success' || log.status === 'google_success' ? (
                            <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                              {log.status}
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded text-[10px]">
                              {log.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-cyan-300 font-bold">{log.ip_address}</div>
                          <div className="text-[10px] text-slate-400">{log.clientLocation || 'Localhost / Direct'}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-300 font-semibold">{log.clientDevice || 'Desktop'}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[220px]" title={log.user_agent}>
                            {log.user_agent}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteLoginLog(log.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="Delete log entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Administrative Audit Trail ({auditList.length})
              </span>
              {auditList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAuditLogs}
                  className="px-2.5 py-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All Audit Logs
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Operator Environment</th>
                    <th className="py-3 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        No administrative actions recorded.
                      </td>
                    </tr>
                  ) : (
                    auditList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-rose-300">{a.admin_username}</td>
                        <td className="py-2.5 px-4 text-amber-300 font-bold">{a.action}</td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {a.target_type} {a.target_id ? `(${a.target_id})` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 max-w-xs">{a.details}</td>
                        <td className="py-2.5 px-4">
                          <div className="text-cyan-300 font-bold">{a.ip_address}</div>
                          <div className="text-[10px] text-slate-400">
                            {a.clientLocation || 'Localhost'} • {a.clientDevice || 'Admin Console'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAuditLog(a.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="Delete audit entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">{confirmAction.title}</h3>
              <p className="text-xs text-slate-400">{confirmAction.message}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmAction.onConfirm}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Edit Modal */}
      {passwordEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Reset User Password</h3>
              <p className="text-xs text-slate-400">
                Set a new password for <span className="text-amber-300 font-bold">"{passwordEditUser.username}"</span>. Their existing sessions will be immediately revoked.
              </p>
            </div>

            <form onSubmit={handleChangeUserPasswordSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordEditUser(null);
                    setNewPasswordInput('');
                  }}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordEditLoading || !newPasswordInput || newPasswordInput.length < 6}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {passwordEditLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
