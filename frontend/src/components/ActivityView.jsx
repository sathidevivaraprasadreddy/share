import React, { useState, useEffect } from 'react';
import { getActivityTimeline } from '../services/api';
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

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Transfer Activity Log</h2>
        <p className="text-xs sm:text-sm text-slate-500">
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
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-600" />
          Transfer Activity & Audit Log
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive event timeline of uploads, transfers, recipient downloads, and revocations.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading activity timeline...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 space-y-3">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No activity recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your transfer milestones, verified recipient downloads, and security events will be logged here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-3">
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                </div>

                <div className="flex-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white shadow-sm shrink-0">
                      {getEventIcon(log.eventType)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 capitalize">
                        {log.eventType.replace('_', ' ')}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {log.details}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 shrink-0 font-mono flex items-center gap-1 self-end sm:self-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
