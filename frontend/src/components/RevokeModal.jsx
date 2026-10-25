import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Trash2,
  KeyRound,
  Link,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame
} from 'lucide-react';
import { revokeSession } from '../services/api';
import { playSuccessChime } from '../utils/audio';

export default function RevokeModal({ isOpen, onClose, onSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [revokeKey, setRevokeKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revokedSuccess, setRevokedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleRevoke = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanTarget = identifier.trim();
    const cleanKey = revokeKey.trim();

    if (!cleanTarget) {
      setError('Please enter the Share Link, Token, or 6-digit code.');
      return;
    }
    if (!cleanKey) {
      setError('Please enter your secret delete key.');
      return;
    }

    setLoading(true);

    try {
      const res = await revokeSession(cleanTarget, cleanKey);
      if (res.success) {
        setRevokedSuccess(true);
        setSuccessMessage(res.message || 'Transfer revoked and files permanently deleted from storage.');
        playSuccessChime();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to revoke transfer.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error revoking transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIdentifier('');
    setRevokeKey('');
    setError(null);
    setRevokedSuccess(false);
    setSuccessMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Delete Files Early
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Delete your shared files early using your secret delete key.
          </p>
        </div>

        {revokedSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Files Permanently Deleted
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {successMessage}
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Anyone attempting to access this share link or 6-digit code will now be blocked.
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleRevoke} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Explanation Card */}
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>Why is this key needed?</strong> If you closed your browser after uploading, your secret delete key proves you own the files so you can remove them anytime.
              </p>
            </div>

            {/* Input 1: Share Link, Token, or Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-slate-400" />
                <span>Share Link, Token, or 6-Digit Code</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 492015 or paste full share URL"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
              />
            </div>

            {/* Input 2: Secret Delete Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Secret Delete Key</span>
              </label>
              <input
                type="text"
                placeholder="Paste secret delete key here"
                value={revokeKey}
                onChange={(e) => setRevokeKey(e.target.value)}
                disabled={loading}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Files...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Files Permanently Now</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
