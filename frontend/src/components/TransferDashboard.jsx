import React, { useState, useEffect } from 'react';
import {
  Send,
  Download,
  Wifi,
  Clock,
  UserCheck,
  Shield,
  AlertCircle,
  ArrowRight,
  Loader2,
  KeyRound,
  FileUp,
  Hash,
  Sparkles,
  History,
  ExternalLink,
  ShieldAlert,
  FileText,
  Lock
} from 'lucide-react';
import FileUploader from './FileUploader';
import FileList from './FileList';
import WebRTCTransfer from './WebRTCTransfer';
import { formatBytes } from '../utils/format';
import { playSuccessChime, playNotificationPing } from '../utils/audio';
import {
  uploadFiles,
  createDirectShare,
  lookupSixDigitCode
} from '../services/api';

export default function TransferDashboard({
  currentUser,
  activeShare,
  onShareCompleted,
  onViewActiveShare,
  onReceiveToken,
  onRequestAuth,
  onOpenRevoke,
  onError,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('send'); // 'send' | 'receive' | 'p2p'
  const [sendMode, setSendMode] = useState('link'); // 'link' | 'direct'

  // Files state
  const [files, setFiles] = useState([]);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(100);
  const [expiryHours, setExpiryHours] = useState(24);

  // Text & Quick Note sharing state
  const [sendContentType, setSendContentType] = useState('files'); // 'files' | 'text'
  const [textNoteContent, setTextNoteContent] = useState('');
  const [textNotePassword, setTextNotePassword] = useState('');

  // Direct share specific state
  const [recipientsInput, setRecipientsInput] = useState('');

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Receive Tab State
  const [inputCode, setInputCode] = useState('');
  const [codeLookupLoading, setCodeLookupLoading] = useState(false);
  const [codeError, setCodeError] = useState(null);

  // Local Recent Transfers (Guest & Authenticated History)
  const [recentTransfers, setRecentTransfers] = useState(() => {
    try {
      const saved = localStorage.getItem('quickshare_recent_transfers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentTransfer = (item) => {
    setRecentTransfers((prev) => {
      const updated = [item, ...prev.filter((t) => t.shareToken !== item.shareToken)].slice(0, 8);
      try {
        localStorage.setItem('quickshare_recent_transfers', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleFilesSelected = (newFiles) => {
    onError(null);
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setFiles([]);
  };

  // Perform upload based on selected mode
  const handleStartSend = async () => {
    if (files.length === 0) {
      onError('Please select at least one file to transfer.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    onError(null);

    try {
      if (sendMode === 'direct') {
        if (!currentUser) {
          onRequestAuth();
          setUploading(false);
          return;
        }

        const rawRecipients = recipientsInput
          .split(/[\s,]+/)
          .map((r) => r.replace(/^@/, '').trim())
          .filter(Boolean);

        if (rawRecipients.length === 0) {
          onError('Please enter at least one recipient username.');
          setUploading(false);
          return;
        }

        const result = await createDirectShare(
          files,
          rawRecipients,
          { expiryHours },
          (progress) => setUploadProgress(progress)
        );

        if (result.success) {
          onSuccess(`Successfully sent files to ${result.recipients.join(', ')}!`);
          setFiles([]);
          setRecipientsInput('');
          onShareCompleted({
            ...result,
            directShare: true
          });
        }
      } else {
        // Standard Link / 6-Digit Code / Group Share
        const options = {
          expiryHours
        };

        const result = await uploadFiles(files, options, (progress) => {
          setUploadProgress(progress);
        });

        if (result.success) {
          saveRecentTransfer({
            shareToken: result.shareToken,
            sixCode: result.sixCode,
            revokeToken: result.revokeToken,
            fileCount: result.fileCount || files.length,
            totalSizeBytes: result.totalSizeBytes,
            expiresAt: result.expiresAt,
            type: 'sent',
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          setFiles([]);
          playSuccessChime();
          onShareCompleted(result);
        } else {
          onError(result.error || 'Failed to upload files.');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error transferring files.';
      onError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Handle Text & Quick Note share without manual file creation
  const handleSendTextNote = async () => {
    if (!textNoteContent.trim()) {
      onError('Please type or paste some text or notes to share.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    onError(null);

    try {
      const noteBlob = new Blob([textNoteContent.trim()], { type: 'text/plain;charset=utf-8' });
      const noteFile = new File([noteBlob], 'Shared_Note.txt', { type: 'text/plain;charset=utf-8' });

      const options = {
        expiryHours,
        password: textNotePassword.trim() || undefined,
        note: textNoteContent.trim()
      };

      const result = await uploadFiles([noteFile], options, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        saveRecentTransfer({
          shareToken: result.shareToken,
          sixCode: result.sixCode,
          revokeToken: result.revokeToken,
          fileCount: 1,
          totalSizeBytes: noteFile.size,
          expiresAt: result.expiresAt,
          type: 'sent',
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        setTextNoteContent('');
        setTextNotePassword('');
        playSuccessChime();
        onShareCompleted(result);
      } else {
        onError(result.error || 'Failed to share text note.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error sharing text note.';
      onError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Handle 6-Digit Code Lookup
  const handleLookupCode = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.replace(/\s+/g, '').trim();
    if (!cleanCode) {
      setCodeError('Please enter a 6-digit transfer code.');
      return;
    }

    setCodeLoadingState(true);
    setCodeError(null);

    try {
      // Check if user pasted a full token or 6-digit code
      if (cleanCode.length > 8) {
        onReceiveToken(cleanCode);
        return;
      }

      const res = await lookupSixDigitCode(cleanCode);
      if (res.success && res.shareToken) {
        saveRecentTransfer({
          shareToken: res.shareToken,
          sixCode: cleanCode,
          type: 'received',
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        playNotificationPing();
        onReceiveToken(res.shareToken);
      } else {
        setCodeError(res.error || 'Invalid or expired transfer code.');
      }
    } catch (err) {
      setCodeError(err.response?.data?.error || 'Transfer code not found or expired.');
    } finally {
      setCodeLoadingState(false);
    }
  };

  const setCodeLoadingState = (loading) => {
    setCodeLookupLoading(loading);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Tabs: Send | Receive | Quick Transfer (P2P) */}
      <div className="flex p-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-2xl max-w-md mx-auto shadow-inner border border-slate-200/50 dark:border-slate-700">
        <button
          onClick={() => {
            setActiveTab('send');
            setCodeError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'send'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Send className="w-4 h-4 text-rose-500" />
          <span>Send</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('receive');
            setCodeError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'receive'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download className="w-4 h-4 text-indigo-500" />
          <span>Receive</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('p2p');
            setCodeError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'p2p'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wifi className="w-4 h-4 text-emerald-500" />
          <span>Quick P2P</span>
        </button>
      </div>

      {/* TAB 1: SEND */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {/* Intro header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Share anything, instantly.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Send via 6-digit code, instant links, or directly to an inbox.
            </p>
          </div>

          {/* Sharing Mode Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setSendMode('link')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                sendMode === 'link'
                  ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>6-Digit Code & Link</span>
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  onRequestAuth();
                } else {
                  setSendMode('direct');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                sendMode === 'direct'
                  ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Direct to Inbox</span>
              {!currentUser && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                  Login
                </span>
              )}
            </button>
          </div>

          {/* Mode-Specific Context Fields */}
          {sendMode === 'direct' && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                  <span>Send directly to registered user(s):</span>
                </label>
                <span className="text-[11px] text-slate-400">Comma separated usernames</span>
              </div>
              <input
                type="text"
                placeholder="e.g. alice, bob, alex_dev"
                value={recipientsInput}
                onChange={(e) => setRecipientsInput(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Transfers directly appear in recipient's in-app <strong>Inbox</strong> with status tracking.
              </p>
            </div>
          )}

          {/* Active Share Re-Access Banner */}
          {activeShare && files.length === 0 && (
            <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-rose-200/90 dark:border-rose-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 text-rose-600 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                      Active Share: {activeShare.sixCode ? `Code ${activeShare.sixCode}` : 'Link Ready'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    View your 6-digit code, share link, QR code, and secret delete key anytime.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onViewActiveShare) onViewActiveShare();
                  else onShareCompleted(activeShare);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all shrink-0"
              >
                <span>View Code, QR & Revoke Key</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dropzone Upload */}
          <div className="flex items-center justify-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl max-w-xs mx-auto border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSendContentType('files')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                sendContentType === 'files'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-rose-500" />
              <span>Share Files</span>
            </button>
            <button
              type="button"
              onClick={() => setSendContentType('text')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                sendContentType === 'text'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text Note</span>
            </button>
          </div>

          {sendContentType === 'files' ? (
            <>
              <FileUploader
                onFilesSelected={handleFilesSelected}
                onError={(msg) => onError(msg)}
                maxFileSizeMb={maxFileSizeMb}
                onMaxFileSizeChange={setMaxFileSizeMb}
              />

              {/* Files List & Upload Controls */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <FileList
                    files={files}
                    onRemoveFile={handleRemoveFile}
                    onClearFiles={handleClearFiles}
                    onUpload={handleStartSend}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    expiryHours={expiryHours}
                    setExpiryHours={setExpiryHours}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Share Text or Note</h3>
                    <p className="text-xs text-slate-400">Share without making a file — recipient can read and copy in 1 click.</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {textNoteContent.length} chars
                </span>
              </div>

              <textarea
                rows={6}
                value={textNoteContent}
                onChange={(e) => setTextNoteContent(e.target.value)}
                placeholder="Type or paste anything here — messages, notes, instructions, links, or code..."
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Link Expiration
                  </label>
                  <select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value={1}>Auto-delete in 1 Hour</option>
                    <option value={6}>Auto-delete in 6 Hours</option>
                    <option value={24}>Auto-delete in 24 Hours (1 Day)</option>
                    <option value={72}>Auto-delete in 3 Days</option>
                    <option value={168}>Auto-delete in 7 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Password Protection (Optional)
                  </label>
                  <input
                    type="password"
                    value={textNotePassword}
                    onChange={(e) => setTextNotePassword(e.target.value)}
                    placeholder="Optional secret password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTextNote}
                disabled={uploading || !textNoteContent.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Note Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Create Note Link & 6-Digit Code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recent Device Transfers (Guest & Authenticated history) */}
          {recentTransfers.length > 0 && files.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recent Device Transfers</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('quickshare_recent_transfers');
                    setRecentTransfers([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear History
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransfers.map((item, idx) => (
                  <div
                    key={`${item.shareToken}-${idx}`}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-xl transition-colors cursor-pointer"
                    onClick={() => onReceiveToken(item.shareToken)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          item.type === 'sent'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                        }`}
                      >
                        {item.type === 'sent' ? <Send className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.sixCode ? `6-Digit Code: ${item.sixCode}` : `Token: ${item.shareToken.slice(0, 12)}...`}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400">
                          {item.fileCount ? `${item.fileCount} file(s) • ` : ''}
                          {item.totalSizeBytes ? `${formatBytes(item.totalSizeBytes)} • ` : ''}
                          {item.date}
                        </p>
                      </div>
                    </div>

                    {item.type === 'sent' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareCompleted(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                          title="View 6-Digit Code, QR Code, and Delete Key"
                        >
                          <KeyRound className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Code & Key</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReceiveToken(item.shareToken);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title="Download view"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                        <span>Retrieve</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVE */}
      {activeTab === 'receive' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Receive Files
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Enter the 6-digit transfer code or paste a share token provided by the sender.
            </p>
          </div>

          <form onSubmit={handleLookupCode} className="space-y-4 max-w-sm mx-auto">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center mb-2">
                6-Digit Transfer Code
              </label>
              <input
                type="text"
                maxLength={32}
                placeholder="e.g. 839 204"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  setCodeError(null);
                }}
                className="w-full text-center font-mono text-2xl tracking-widest font-bold py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all uppercase"
                autoFocus
              />
            </div>

            {codeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={codeLookupLoading || !inputCode.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {codeLookupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <>
                  <span>Retrieve Files</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Brute-force lockout active</span>
            </div>
            {onOpenRevoke && (
              <button
                type="button"
                onClick={onOpenRevoke}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Delete previous upload with secret key</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: QUICK P2P (WEBRTC) */}
      {activeTab === 'p2p' && (
        <div className="space-y-4">
          <WebRTCTransfer
            onError={(msg) => onError(msg)}
            onSuccess={(msg) => onSuccess(msg)}
          />
        </div>
      )}
    </div>
  );
}
