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
  getAdminSessions,
  revokeSessionAsAdmin,
  getAdminLogins,
  getAdminAuditLogs,
  downloadAdminCsv
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
  Clock
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
  const [loadingData, setLoadingData] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState(null); // { type, id, title, message, onConfirm }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

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
                  placeholder="admin"
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
                  placeholder="••••••••••••"
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
                  placeholder="e.g. 849201"
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
            {(activeTab === 'users' || activeTab === 'sessions') && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by name / token / code..."
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <td className="py-3 px-4 text-right">
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
                              Revoke & Shred
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Identifier / User</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {loginsList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        No login events recorded.
                      </td>
                    </tr>
                  ) : (
                    loginsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
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
                        <td className="py-2.5 px-4 text-slate-300">{log.ip_address}</td>
                        <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{log.user_agent}</td>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Operator IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        No administrative actions recorded.
                      </td>
                    </tr>
                  ) : (
                    auditList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-bold text-rose-300">{a.admin_username}</td>
                        <td className="py-2.5 px-4 text-amber-300 font-bold">{a.action}</td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {a.target_type} {a.target_id ? `(${a.target_id})` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{a.details}</td>
                        <td className="py-2.5 px-4 text-slate-500">{a.ip_address}</td>
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
    </div>
  );
}
