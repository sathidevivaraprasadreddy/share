import React, { useState, useEffect } from 'react';
import {
  getActivityTimeline,
  deleteActivityLog,
  clearAllActivityLogs
} from '../services/api';
import {
  Activity,
  Upload,
  Download,
  Share2,
  Trash2,
  ShieldAlert,
  Clock,
  FileCheck
} from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function ActivityView({ user, onRequireAuth }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadLogs() {
      try {
        const res = await getActivityTimeline();
        if (res.success) setLogs(res.activity || []);
      } catch {}
      setLoading(false);
    }
    loadLogs();
  }, [user]);

  const handleDeleteLog = async (id) => {
    try {
      await deleteActivityLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear your transfer activity history?')) return;
    try {
      await clearAllActivityLogs();
      setLogs([]);
    } catch {}
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transfer Activity Log</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Sign in to view your real-time transfer audit history and download confirmations.
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

  const getEventIcon = (type) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-4 h-4 text-indigo-600" />;
      case 'share_created':
        return <Share2 className="w-4 h-4 text-blue-600" />;
      case 'download':
      case 'download_completed':
        return <Download className="w-4 h-4 text-emerald-600" />;
      case 'revoked':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'file_deleted':
        return <Trash2 className="w-4 h-4 text-slate-500" />;
      default:
        return <FileCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-600" />
            Transfer Activity & Audit Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive event timeline of uploads, transfers, recipient downloads, and revocations.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Activity History
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          Loading activity timeline...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No activity recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your transfer milestones, verified recipient downloads, and security events will be logged here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-3 group">
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm shrink-0">
                      {getEventIcon(log.eventType)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white capitalize">
                        {log.eventType.replace('_', ' ')}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {log.details}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                      title="Delete activity entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
