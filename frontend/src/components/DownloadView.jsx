import React, { useEffect, useState } from 'react';
import {
  Download,
  FolderArchive,
  Clock,
  Layers,
  HardDrive,
  AlertTriangle,
  FileQuestion,
  Loader2,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Flame,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  ShieldCheck
} from 'lucide-react';
import {
  getSession,
  getSingleFileDownloadUrl,
  getZipDownloadUrl
} from '../services/api';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';
import { playSuccessChime, playNotificationPing } from '../utils/audio';
import FilePreviewModal from './FilePreviewModal';

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image className="w-5 h-5 text-purple-500" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <Film className="w-5 h-5 text-blue-500" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return <Music className="w-5 h-5 text-amber-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-5 h-5 text-yellow-600" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx'].includes(ext)) {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  return <File className="w-5 h-5 text-slate-400" />;
}

export default function DownloadView({ token, onBackToUpload }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [errorStatus, setErrorStatus] = useState(null); // 'expired' | 'revoked' | 'notfound' | message
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [activePassword, setActivePassword] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [previewingFile, setPreviewingFile] = useState(null);
  const [copiedNote, setCopiedNote] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCopyNote = async () => {
    if (!session?.note) return;
    try {
      await navigator.clipboard.writeText(session.note);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch {}
  };

  // Live ticking countdown timer
  useEffect(() => {
    if (!session?.expiresAt) return;

    const updateCountdown = () => {
      const diff = new Date(session.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Expired');
        setErrorStatus('expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours}h ${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const fetchSession = async (pwd = null) => {
    if (!token) return;
    setLoading(true);
    setErrorStatus(null);
    setPasswordError(null);
    try {
      const data = await getSession(token, pwd);
      if (data.success) {
        if (data.isPasswordRequired) {
          setRequiresPassword(true);
          setSession(data.session);
          if (pwd) {
            setPasswordError('Incorrect password. Please try again.');
          }
          return;
        }
        setSession(data.session);
        setFiles(data.files || []);
        setRequiresPassword(false);
        if (pwd) setActivePassword(pwd);
        playNotificationPing();
      } else {
        setErrorStatus('notfound');
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401 && (err.response.data?.requiresPassword || err.response.data?.isPasswordRequired)) {
          setRequiresPassword(true);
          if (pwd) {
            setPasswordError(err.response.data?.error || 'Incorrect password. Please try again.');
          }
        } else if (err.response.data?.isRevoked) {
          setErrorStatus('revoked');
        } else if (err.response.data?.isExpired) {
          setErrorStatus('expired');
        } else if (err.response.status === 410) {
          setErrorStatus(err.response.data?.error || 'This link has expired or reached its download limit.');
        } else if (err.response.status === 404) {
          setErrorStatus('notfound');
        } else {
          setErrorStatus(err.response.data?.error || 'Failed to load file session.');
        }
      } else {
        setErrorStatus('Network error connecting to QuickShare server.');
      }
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [token]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError('Please enter a password.');
      return;
    }
    setUnlocking(true);
    await fetchSession(passwordInput.trim());
  };

  // Loading state
  if (loading && !session && !requiresPassword) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-12 text-center animate-fade-in max-w-md mx-auto">
        <Loader2 className="w-10 h-10 text-rose-600 dark:text-rose-400 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Fetching shared files...
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please wait a moment</p>
      </div>
    );
  }

  // Password Required View
  if (requiresPassword) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-8 sm:p-10 animate-fade-in max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-900/40 px-3 py-1 rounded-full">
            Protected Share
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-2.5">
            Password Protected
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            The sender has protected these files with a password. Enter it below to unlock and download.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter share password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(null);
              }}
              autoFocus
              className="w-full text-center text-sm py-3.5 pl-4 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium tracking-wide placeholder:tracking-normal"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={unlocking || !passwordInput.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {unlocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Password...</span>
              </>
            ) : (
              <>
                <span>Unlock Files</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2">
          <button
            onClick={onBackToUpload}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to QuickShare</span>
          </button>
        </div>
      </div>
    );
  }

  // Error: Expired or Revoked or Not Found
  if (errorStatus) {
    let title = 'File Unavailable';
    let description = 'This sharing session could not be found.';
    let icon = <FileQuestion className="w-8 h-8 text-slate-400" />;
    let iconBg = 'bg-slate-100 dark:bg-slate-800';

    if (errorStatus === 'revoked') {
      title = 'Link Revoked';
      description = 'The owner of these files has cancelled the sharing link and deleted the files.';
      icon = <AlertTriangle className="w-8 h-8 text-amber-500" />;
      iconBg = 'bg-amber-50 dark:bg-amber-950/40';
    } else if (errorStatus === 'expired') {
      title = 'Link Expired';
      description = 'This sharing link has passed its expiration time and files were safely removed.';
      icon = <Clock className="w-8 h-8 text-rose-500" />;
      iconBg = 'bg-rose-50 dark:bg-rose-950/40';
    } else if (typeof errorStatus === 'string' && errorStatus !== 'notfound') {
      description = errorStatus;
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-8 sm:p-10 text-center animate-fade-in max-w-md mx-auto">
        <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{description}</p>
        <button
          onClick={onBackToUpload}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload your own files</span>
        </button>
      </div>
    );
  }

  // Guard against null session while loading or in transition
  if (!session) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-12 text-center animate-fade-in max-w-md mx-auto">
        <Loader2 className="w-10 h-10 text-rose-600 dark:text-rose-400 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Loading transfer details...
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please wait a moment</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 animate-fade-in space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-900/50 mb-2 inline-block">
            QuickShare Transfer
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {files.length === 1 ? '1 File Ready to Download' : `${files.length} Files Ready to Download`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Available until {session?.expiresAt ? new Date(session.expiresAt).toLocaleDateString() : 'Expiry'} ({formatTimeRemaining(session?.expiresAt)})
          </p>
        </div>

        {/* Primary Download All Action if multiple files */}
        {files.length > 1 && (
          <a
            href={getZipDownloadUrl(token, activePassword)}
            download
            onClick={() => playSuccessChime()}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg transition-all active:scale-[0.99] w-full sm:w-auto"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Download All as ZIP</span>
          </a>
        )}
      </div>

      {/* Message / Shared Text Note from Sender */}
      {session?.note && (
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Note / Shared Message:</span>
            </div>
            <button
              onClick={handleCopyNote}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Copy note text"
            >
              {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNote ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40">
            {session.note}
          </p>
        </div>
      )}

      {/* Self-Destruct Warning if maxDownloads === 1 */}
      {session?.maxDownloads === 1 && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
          <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
          <span>
            <strong>Self-Destruct Active:</strong> This transfer is limited to a single download. The session and files will automatically self-destruct after this download.
          </span>
        </div>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Files</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
            {files.length}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Size</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
            {formatFileSize(session?.totalSizeBytes || 0)}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Time Left</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {countdown || formatTimeRemaining(session?.expiresAt)}
          </p>
        </div>
      </div>

      {/* Files List */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Files in this session
        </h4>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-0 sm:pr-4 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewingFile({
                    file,
                    downloadUrl: getSingleFileDownloadUrl(token, file.id, activePassword)
                  })}
                  className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                  title="Look at file before downloading"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>Preview</span>
                </button>

                <a
                  href={getSingleFileDownloadUrl(token, file.id, activePassword)}
                  download={file.name}
                  onClick={() => playSuccessChime()}
                  className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white text-xs font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Link to Send files */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={onBackToUpload}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Upload files</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-slate-500">
          Powered by QuickShare
        </span>
      </div>

      {/* In-Browser File Preview Modal */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile.file}
          downloadUrl={previewingFile.downloadUrl}
          onClose={() => setPreviewingFile(null)}
        />
      )}
    </div>
  );
}
