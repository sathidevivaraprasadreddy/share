import React, { useState, useEffect } from 'react';
import {
  getInbox,
  updateInboxItem,
  removeInboxItem,
  getSingleFileDownloadUrl,
  getZipDownloadUrl
} from '../services/api';
import {
  Inbox,
  Download,
  Pin,
  Archive,
  Trash2,
  Clock,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Check,
  CheckCheck,
  Pencil,
  X
} from 'lucide-react';
import { formatBytes } from '../utils/format';
import { playSuccessChime } from '../utils/audio';

export default function InboxView({ user, onRequireAuth }) {
  const [filter, setFilter] = useState('all'); // all, unread, pinned, archived
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // File rename state for inbox items
  const [editingFileId, setEditingFileId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [renamedFiles, setRenamedFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('quickshare_inbox_renames');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadInbox();
  }, [user, filter]);

  const loadInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInbox(filter);
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inbox items.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (item) => {
    const newStatus = item.status === 'pinned' ? 'active' : 'pinned';
    try {
      await updateInboxItem(item.id, { status: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
    } catch {}
  };

  const handleToggleArchive = async (item) => {
    const newStatus = item.status === 'archived' ? 'active' : 'archived';
    try {
      await updateInboxItem(item.id, { status: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
    } catch {}
  };

  const handleAcceptTransfer = async (item) => {
    try {
      await updateInboxItem(item.id, { status: 'accepted', isRead: true });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'accepted', isRead: true } : i))
      );
      playSuccessChime();
      setNotice('Transfer accepted! Files are now active and ready to download.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError('Failed to accept transfer.');
    }
  };

  const handleDeclineTransfer = async (item) => {
    if (!window.confirm(`Decline transfer from @${item.sender.username}? It will be removed from your inbox.`)) return;
    try {
      const res = await removeInboxItem(item.id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setNotice('Transfer declined and removed from your inbox.');
        setTimeout(() => setNotice(null), 3000);
      }
    } catch (err) {
      setError('Failed to decline transfer.');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      const res = await removeInboxItem(itemId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setNotice('Removed from your inbox. Sender original file is preserved.');
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove inbox item.');
    }
  };

  const handleStartRename = (fileId, currentName) => {
    setEditingFileId(fileId);
    setRenameInput(renamedFiles[fileId] || currentName);
  };

  const handleSaveRename = (fileId) => {
    const trimmed = renameInput.trim();
    if (trimmed) {
      const updated = { ...renamedFiles, [fileId]: trimmed };
      setRenamedFiles(updated);
      try {
        localStorage.setItem('quickshare_inbox_renames', JSON.stringify(updated));
      } catch {}
      setNotice('File renamed for your inbox view.');
      setTimeout(() => setNotice(null), 2500);
    }
    setEditingFileId(null);
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Inbox className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Private Inbox</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Sign in or create a free account to receive files sent directly to your username.
        </p>
        <button
          onClick={onRequireAuth}
          className="py-2.5 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-500/20 hover:shadow-lg transition-all"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const senderMatch =
      item.sender.username.toLowerCase().includes(q) ||
      item.sender.displayName.toLowerCase().includes(q);
    const noteMatch = item.note && item.note.toLowerCase().includes(q);
    const fileMatch = item.files.some((f) =>
      (renamedFiles[f.id] || f.name).toLowerCase().includes(q)
    );
    return senderMatch || noteMatch || fileMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Filter Pills */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>Direct Transfers Inbox</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Files sent directly to your account <strong>@{user.username}</strong>
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'pinned', label: 'Pinned' },
            { id: 'archived', label: 'Archived' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                filter === f.id
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sender, file name, or description..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
        />
      </div>

      {/* Inbox Items List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading inbox transfers...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No transfers in this view</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When classmates or colleagues send files directly to @{user.username}, they will arrive here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isAccepted = item.status === 'accepted' || item.status === 'pinned' || item.status === 'archived';
            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border transition-all ${
                  item.status === 'pinned'
                    ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-200 dark:ring-indigo-900/40'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {/* Header: Sender Info & WhatsApp Checkmark */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: item.sender.avatarColor }}
                    >
                      {(item.sender.displayName || item.sender.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.sender.displayName}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-normal font-mono text-[11px]">
                          @{item.sender.username}
                        </span>

                        {/* WhatsApp-Style Delivery Checkmark */}
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.isDownloaded
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                              : isAccepted
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                          title={
                            item.isDownloaded
                              ? `Downloaded by you ${item.downloadedAt ? new Date(item.downloadedAt).toLocaleTimeString() : ''}`
                              : isAccepted
                              ? 'Delivered to your Inbox'
                              : 'Pending Accept'
                          }
                        >
                          {item.isDownloaded ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Downloaded</span>
                            </>
                          ) : isAccepted ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                              <span>In Inbox</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span>Sent</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Received {new Date(item.receivedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Expires {new Date(item.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pin / Archive / Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(item)}
                      title={item.status === 'pinned' ? 'Unpin' : 'Pin to top'}
                      className={`p-2 rounded-xl text-xs transition-colors ${
                        item.status === 'pinned'
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleArchive(item)}
                      title={item.status === 'archived' ? 'Unarchive' : 'Archive'}
                      className={`p-2 rounded-xl text-xs transition-colors ${
                        item.status === 'archived'
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Archive className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRemove(item.id)}
                      title="Remove from Inbox"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Accept or Decline Transfer Banner */}
                {!isAccepted && (
                  <div className="mb-4 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>New incoming transfer from <strong>@{item.sender.username}</strong>. Accept to keep in your inbox?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptTransfer(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Save</span>
                      </button>
                      <button
                        onClick={() => handleDeclineTransfer(item)}
                        className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Description / Note from Sender */}
                {item.note && (
                  <div className="mb-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 italic">
                    <span className="font-semibold not-italic text-slate-500 dark:text-slate-400 mr-1.5">Note:</span>
                    "{item.note}"
                  </div>
                )}

                {/* Files Listing with Rename Feature */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 divide-y divide-slate-100 dark:divide-slate-700">
                  {item.files.map((file) => {
                    const isEditing = editingFileId === file.id;
                    const displayName = renamedFiles[file.id] || file.name || 'File';
                    return (
                      <div key={file.id} className="py-2.5 px-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                              <input
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(file.id);
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                                className="px-2 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-white rounded-lg text-xs font-medium w-full focus:outline-none focus:ring-1 focus:ring-rose-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(file.id)}
                                className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Save"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFileId(null)}
                                className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={displayName}>
                                {displayName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartRename(file.id, displayName)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                                title="Rename file in your inbox view"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                                ({formatBytes(file.size)})
                              </span>
                            </div>
                          )}
                        </div>

                        <a
                          href={getSingleFileDownloadUrl(item.shareToken, file.id)}
                          download={displayName}
                          onClick={() => {
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, isDownloaded: true } : i
                              )
                            );
                          }}
                          className="py-1 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-500" />
                          <span>Download</span>
                        </a>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions for Multi-File */}
                {item.files.length > 1 && (
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-mono">
                      Total: {item.fileCount} files ({formatBytes(item.totalSizeBytes)})
                    </span>
                    <a
                      href={getZipDownloadUrl(item.shareToken)}
                      onClick={() => {
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, isDownloaded: true } : i
                          )
                        );
                      }}
                      className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download All as ZIP
                    </a>
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
