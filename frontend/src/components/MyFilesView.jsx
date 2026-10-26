import React, { useState, useEffect } from 'react';
import {
  getMyFiles,
  getStorageStats,
  renameFile,
  deleteFile,
  restoreFile,
  getSingleFileDownloadUrl
} from '../services/api';
import {
  Folder,
  FileText,
  HardDrive,
  Search,
  Download,
  Trash2,
  RotateCcw,
  Edit2,
  Clock,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  QrCode,
  Copy,
  KeyRound,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Share2
} from 'lucide-react';
import { formatBytes } from '../utils/format';
import { formatTimeRemaining } from '../utils/formatters';

export default function MyFilesView({
  user,
  activeShare,
  onRequireAuth,
  onSelectShare,
  onShowQR,
  onRevoke,
  onOpenActiveShare
}) {
  const [category, setCategory] = useState('all'); // all, images, documents, media, archives, trash
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // Expanded share toolkit per file ID
  const [expandedFileId, setExpandedFileId] = useState(null);
  // Track copied status for buttons: key formatted as `${type}-${id}`
  const [copiedKey, setCopiedKey] = useState(null);
  // Confirm revoke per item ID
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  // Guest / local transfers from localStorage
  const [localTransfers, setLocalTransfers] = useState([]);

  useEffect(() => {
    if (!user) {
      loadLocalTransfers();
      setLoading(false);
      return;
    }
    loadFiles();
    loadStats();
  }, [user, category, sort]);

  const loadLocalTransfers = () => {
    try {
      const raw = localStorage.getItem('quickshare_recent_transfers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalTransfers(parsed);
          return;
        }
      }
    } catch {}
    setLocalTransfers([]);
  };

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyFiles(category, search, sort);
      if (res.success) {
        setFiles(res.files || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await getStorageStats();
      if (res.success) setStats(res);
    } catch {}
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2500);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (user) {
      loadFiles();
    }
  };

  const handleStartRename = (file) => {
    setEditingFileId(file.id);
    setEditName(file.name);
  };

  const handleSaveRename = async (fileId) => {
    if (!editName.trim()) return;
    try {
      const res = await renameFile(fileId, editName.trim());
      if (res.success) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, name: res.newName } : f))
        );
        setEditingFileId(null);
        setMsg('File renamed successfully.');
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename file.');
    }
  };

  const handleDelete = async (fileId, permanent = false) => {
    try {
      const res = await deleteFile(fileId, permanent);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        loadStats();
        setMsg(res.message);
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete file.');
    }
  };

  const handleRestore = async (fileId) => {
    try {
      const res = await restoreFile(fileId);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setMsg('File restored from trash.');
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore file.');
    }
  };

  const handleExecuteRevoke = async (shareToken, revokeToken, targetId) => {
    if (!shareToken || !revokeToken) {
      setError('Cannot delete: Missing delete key.');
      return;
    }
    setRevokingId(targetId);
    try {
      if (onRevoke) {
        const ok = await onRevoke(shareToken, revokeToken);
        if (ok !== false) {
          // If logged in, update list or mark revoked
          setFiles((prev) =>
            prev.map((f) => (f.shareToken === shareToken ? { ...f, isRevoked: true } : f))
          );
          // If in local guest transfers, remove from list
          setLocalTransfers((prev) => prev.filter((t) => t.shareToken !== shareToken));
          setConfirmRevokeId(null);
          setMsg('Sharing session revoked and files deleted permanently.');
          setTimeout(() => setMsg(null), 4000);
          if (user) loadStats();
        }
      }
    } catch (err) {
      setError('Failed to revoke session.');
    } finally {
      setRevokingId(null);
    }
  };

  // ==========================================
  // GUEST MODE (When not logged in)
  // ==========================================
  if (!user) {
    const sentLocal = localTransfers.filter((t) => t.type === 'sent' || t.shareToken);

    return (
      <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
        {/* Guest Banner */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  My Files & Active Transfers
                </h1>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                  Device Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Showing files created from this browser. Sign in or create a free account to access them anywhere with 1 GB cloud storage.
              </p>
            </div>
          </div>

          <button
            onClick={onRequireAuth}
            className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
          >
            Sign In / Register (100% Free)
          </button>
        </div>

        {/* Notifications */}
        {msg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-medium">
            {msg}
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Recent Device Transfers List */}
        {sentLocal.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No transfers on this device yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Files you upload will appear here with instant download links, 6-digit codes, QR codes, and secret delete keys.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Active Device Shares ({sentLocal.length})
            </h2>

            <div className="grid gap-4">
              {sentLocal.map((item, idx) => {
                const targetId = item.shareToken || `local-${idx}`;
                const shareUrl = `${window.location.origin}/?token=${item.shareToken}`;
                const isCopiedLink = copiedKey === `link-${targetId}`;
                const isCopiedCode = copiedKey === `code-${targetId}`;
                const isCopiedKey = copiedKey === `key-${targetId}`;
                const isConfirming = confirmRevokeId === targetId;
                const isRevoking = revokingId === targetId;

                return (
                  <div
                    key={targetId}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {item.fileCount ? `${item.fileCount} File(s) Shared` : 'Shared Transfer'}
                            </span>
                            {item.sixCode && (
                              <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono font-bold px-2 py-0.5 rounded-full">
                                Code: {item.sixCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {item.totalSizeBytes ? (
                              <span>{formatBytes(item.totalSizeBytes)}</span>
                            ) : null}
                            <span>•</span>
                            <span>{item.date || 'Recent'}</span>
                            {item.expiresAt && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeRemaining(item.expiresAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Download / View Button */}
                      <div className="flex items-center gap-2">
                        {onOpenActiveShare && (
                          <button
                            type="button"
                            onClick={() => onOpenActiveShare(item)}
                            className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                            <span>Open Details</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Access Tools: Link, Code, QR, Revocation */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
                      {/* Copy Share Link */}
                      <button
                        type="button"
                        onClick={() => handleCopy(shareUrl, `link-${targetId}`)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                          isCopiedLink
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{isCopiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                      </button>

                      {/* Copy 6-Digit Code */}
                      {item.sixCode && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.sixCode, `code-${targetId}`)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-semibold transition-all border ${
                            isCopiedCode
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <KeyRound className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{isCopiedCode ? 'Code Copied!' : `Code: ${item.sixCode}`}</span>
                        </button>
                      )}

                      {/* QR Code Button */}
                      {onShowQR && (
                        <button
                          type="button"
                          onClick={() => onShowQR(shareUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition-all"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-600" />
                          <span>Show QR</span>
                        </button>
                      )}

                      {/* Copy Revoke Token */}
                      {item.revokeToken && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.revokeToken, `key-${targetId}`)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                            isCopiedKey
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={item.revokeToken}
                        >
                          {isCopiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
                          <span>{isCopiedKey ? 'Revoke Key Copied!' : 'Copy Revoke Key'}</span>
                        </button>
                      )}

                      {/* Revoke and Delete Early */}
                      {item.revokeToken && (
                        <div className="ml-auto">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-rose-700 font-bold">Delete now?</span>
                              <button
                                type="button"
                                disabled={isRevoking}
                                onClick={() => handleExecuteRevoke(item.shareToken, item.revokeToken, targetId)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold"
                              >
                                {isRevoking ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(targetId)}
                              className="text-rose-600 hover:text-rose-700 text-xs font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Delete Files</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // LOGGED-IN USER VIEW
  // ==========================================
  const quotaMB = ((stats?.quotaBytes || 1073741824) / (1024 * 1024)).toFixed(0);
  const usedMB = ((stats?.usedBytes || 0) / (1024 * 1024)).toFixed(1);
  const percentUsed = stats?.percentageUsed || 0;

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
      {/* Top Banner & Storage Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-rose-600" />
              My Files
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your uploaded documents, download links, 6-digit codes, QR codes, and secret delete keys.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="size_desc">Size (Largest)</option>
              <option value="size_asc">Size (Smallest)</option>
            </select>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-rose-600" />
              Free Cloud Storage Quota
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {usedMB} MB / {quotaMB} MB used ({percentUsed}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                percentUsed > 80 ? 'bg-amber-500' : 'bg-rose-600'
              }`}
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter Categories */}
      <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
        {[
          { id: 'all', label: 'All Files' },
          { id: 'images', label: 'Images' },
          { id: 'documents', label: 'Documents' },
          { id: 'media', label: 'Media' },
          { id: 'archives', label: 'Archives' },
          { id: 'trash', label: 'Trash Bin' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              category === cat.id
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by file name..."
          className="w-full pl-11 pr-20 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
        >
          Search
        </button>
      </form>

      {/* Alerts */}
      {msg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-medium">
          {msg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading your files...
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No files found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {category === 'trash'
              ? 'Your trash bin is currently empty.'
              : 'Files you upload will appear here with instant download links, QR codes, and secret delete keys.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {files.map((file) => {
            const shareUrl = `${window.location.origin}/?token=${file.shareToken}`;
            const isExpanded = expandedFileId === file.id;
            const isCopiedLink = copiedKey === `link-${file.id}`;
            const isCopiedCode = copiedKey === `code-${file.id}`;
            const isCopiedKey = copiedKey === `key-${file.id}`;
            const isConfirming = confirmRevokeId === file.id;
            const isRevoking = revokingId === file.id;

            return (
              <div key={file.id} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* File Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      {editingFileId === file.id ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-xs border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(file.id)}
                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingFileId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {file.name || 'File'}
                          </span>
                          {category !== 'trash' && (
                            <button
                              onClick={() => handleStartRename(file)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                              title="Rename file"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono">{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {file.isRevoked ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Revoked</span>
                          ) : file.isExpired ? (
                            <span className="text-slate-500">Expired</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                          )}
                        </span>
                        {file.sixCode && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              Code: {file.sixCode}
                            </span>
                          </>
                        )}
                        {file.downloadCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{file.downloadCount} download(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                    {category === 'trash' ? (
                      <>
                        <button
                          onClick={() => handleRestore(file.id)}
                          className="py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(file.id, true)}
                          className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Toggle Share & Revoke details */}
                        <button
                          type="button"
                          onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
                          className={`py-1.5 px-3 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all border ${
                            isExpanded
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                          title="View share link, QR code, and secret delete key"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Share & Key</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <a
                          href={getSingleFileDownloadUrl(file.shareToken, file.id)}
                          download={file.name}
                          className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>

                        <button
                          onClick={() => handleDelete(file.id, false)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="Move to trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expandable Share & Revocation Details */}
                {isExpanded && category !== 'trash' && (
                  <div className="mt-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3 animate-fade-in">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Share & Delete Controls
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Public Share Link */}
                      <button
                        type="button"
                        onClick={() => handleCopy(shareUrl, `link-${file.id}`)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                          isCopiedLink
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                        <span>{isCopiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                      </button>

                      {/* 6-Digit Code */}
                      {file.sixCode && (
                        <button
                          type="button"
                          onClick={() => handleCopy(file.sixCode, `code-${file.id}`)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-semibold transition-all border ${
                            isCopiedCode
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <KeyRound className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{isCopiedCode ? 'Code Copied!' : `Code: ${file.sixCode}`}</span>
                        </button>
                      )}

                      {/* QR Code */}
                      {onShowQR && (
                        <button
                          type="button"
                          onClick={() => onShowQR(shareUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                          <span>Show QR Code</span>
                        </button>
                      )}

                      {/* Secret Delete Key */}
                      {file.revokeToken && (
                        <button
                          type="button"
                          onClick={() => handleCopy(file.revokeToken, `key-${file.id}`)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                            isCopiedKey
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title={file.revokeToken}
                        >
                          {isCopiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
                          <span>{isCopiedKey ? 'Delete Key Copied!' : 'Copy Delete Key'}</span>
                        </button>
                      )}

                      {/* Revoke and Delete Now */}
                      {file.revokeToken && !file.isRevoked && (
                        <div className="ml-auto">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-rose-700 font-bold">Delete now?</span>
                              <button
                                type="button"
                                disabled={isRevoking}
                                onClick={() => handleExecuteRevoke(file.shareToken, file.revokeToken, file.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold"
                              >
                                {isRevoking ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(file.id)}
                              className="text-rose-600 hover:text-rose-700 text-xs font-semibold px-2.5 py-1 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Delete Files Now</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}