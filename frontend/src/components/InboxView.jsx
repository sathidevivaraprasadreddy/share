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
  AlertCircle
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function InboxView({ user, onRequireAuth }) {
  const [filter, setFilter] = useState('all'); // all, unread, pinned, archived
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Inbox className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your Private Inbox</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in or create a free account to receive files sent directly to your username.
        </p>
        <button
          onClick={onRequireAuth}
          className="py-2.5 px-6 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          Sign In or Register (100% Free)
        </button>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchesSender = item.sender.username.toLowerCase().includes(term) || item.sender.displayName.toLowerCase().includes(term);
    const matchesFiles = item.files.some((f) => f.name.toLowerCase().includes(term));
    const matchesNote = item.note && item.note.toLowerCase().includes(term);
    return matchesSender || matchesFiles || matchesNote;
  });

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-rose-600" />
            Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Files sent directly to your username (@{user.username}).
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          {['all', 'unread', 'pinned', 'archived'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
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
          placeholder="Search by sender, file name, or note..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
        />
      </div>

      {/* Inbox Items List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading inbox transfers...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No transfers in this view</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When friends, team members, or colleagues send files directly to @{user.username}, they will arrive here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm border transition-all ${
                item.status === 'pinned'
                  ? 'border-indigo-200 bg-indigo-50/20 ring-1 ring-indigo-200'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Header: Sender Info & Actions */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ backgroundColor: item.sender.avatarColor }}
                  >
                    {(item.sender.displayName || item.sender.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {item.sender.displayName}
                      <span className="text-slate-400 font-normal ml-1.5 font-mono">
                        @{item.sender.username}
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
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleArchive(item)}
                    title={item.status === 'archived' ? 'Unarchive' : 'Archive'}
                    className={`p-2 rounded-xl text-xs transition-colors ${
                      item.status === 'archived'
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleRemove(item.id)}
                    title="Remove from Inbox"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note from Sender */}
              {item.note && (
                <div className="mb-4 p-3 rounded-2xl bg-slate-50 text-xs text-slate-700 border border-slate-100 italic">
                  "{item.note}"
                </div>
              )}

              {/* Files Listing */}
              <div className="bg-slate-50 rounded-2xl p-3 divide-y divide-slate-100">
                {item.files.map((file) => (
                  <div key={file.id} className="py-2.5 px-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        ({formatBytes(file.size)})
                      </span>
                    </div>

                    <a
                      href={getSingleFileDownloadUrl(item.shareToken, file.id)}
                      download={file.name}
                      className="py-1 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              {item.files.length > 1 && (
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {item.fileCount} files ({formatBytes(item.totalSizeBytes)})
                  </span>
                  <a
                    href={getZipDownloadUrl(item.shareToken)}
                    className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All as ZIP
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
