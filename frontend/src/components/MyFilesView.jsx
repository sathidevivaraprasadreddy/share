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
  AlertCircle
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function MyFilesView({ user, onRequireAuth }) {
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadFiles();
    loadStats();
  }, [user, category, sort]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadFiles();
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

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Folder className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Personal File Manager</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in or create a free account to view and manage all files you have uploaded.
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

  const quotaMB = ((stats?.quotaBytes || 1073741824) / (1024 * 1024)).toFixed(0);
  const usedMB = ((stats?.usedBytes || 0) / (1024 * 1024)).toFixed(1);
  const percentUsed = stats?.percentageUsed || 0;

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
      {/* Top Banner & Storage Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-5 h-5 text-rose-600" />
              My Files
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your uploaded documents, media, and active shares.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
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
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-rose-600" />
              Free Cloud Storage Quota
            </span>
            <span className="font-bold text-slate-700">
              {usedMB} MB / {quotaMB} MB used ({percentUsed}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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
      <div className="flex overflow-x-auto pb-1 gap-2">
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
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
          className="w-full pl-11 pr-20 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          Search
        </button>
      </form>

      {/* Alerts */}
      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-medium">
          {msg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
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
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No files found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {category === 'trash'
              ? 'Your trash bin is currently empty.'
              : 'Files you upload will appear here with instant download and management controls.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              {/* File Info */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  {editingFileId === file.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 text-xs border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(file.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingFileId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {file.name}
                      </span>
                      {category !== 'trash' && (
                        <button
                          onClick={() => handleStartRename(file)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
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
                        <span className="text-rose-600 font-semibold">Revoked</span>
                      ) : file.isExpired ? (
                        <span className="text-slate-500">Expired</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      )}
                    </span>
                    {file.downloadCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{file.downloadCount} download(s)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {category === 'trash' ? (
                  <>
                    <button
                      onClick={() => handleRestore(file.id)}
                      className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, true)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Forever
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={getSingleFileDownloadUrl(file.shareToken, file.id)}
                      download={file.name}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(file.id, false)}
                      className="py-1.5 px-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors"
                      title="Move to trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
