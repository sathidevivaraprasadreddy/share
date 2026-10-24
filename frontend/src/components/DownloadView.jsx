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
  CheckCircle2,
  Eye,
  MessageSquare,
  Flame
} from 'lucide-react';
import FilePreviewModal from './FilePreviewModal';
import {
  getSession,
  getSingleFileDownloadUrl,
  getZipDownloadUrl
} from '../services/api';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';
import { playSuccessChime, playNotificationPing } from '../utils/audio';

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
  const [previewFile, setPreviewFile] = useState(null);
  const [countdown, setCountdown] = useState('');

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
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center animate-fade-in">
        <Loader2 className="w-10 h-10 text-rose-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800">
          Fetching shared files...
        </h3>
        <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
      </div>
    );
  }

  // Password Required View
  if (requiresPassword) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-10 animate-fade-in max-w-md mx-auto text-center space-y-5">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Password Protected
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            The sender has protected these files with a password. Please enter it below to download.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            placeholder="Enter share password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setPasswordError(null);
            }}
            autoFocus
            className="w-full text-center text-sm py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
          />

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={unlocking || !passwordInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
          >
            {unlocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Unlocking...</span>
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
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
    let iconBg = 'bg-slate-100';

    if (errorStatus === 'revoked') {
      title = 'Link Revoked';
      description = 'The owner of these files has cancelled the sharing link and deleted the files.';
      icon = <AlertTriangle className="w-8 h-8 text-amber-500" />;
      iconBg = 'bg-amber-50';
    } else if (errorStatus === 'expired') {
      title = 'Link Expired';
      description = 'This sharing link has passed its expiration time and files were safely removed.';
      icon = <Clock className="w-8 h-8 text-rose-500" />;
      iconBg = 'bg-rose-50';
    } else if (typeof errorStatus === 'string' && errorStatus !== 'notfound') {
      description = errorStatus;
    }

    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-10 text-center animate-fade-in max-w-md mx-auto">
        <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        <button
          onClick={onBackToUpload}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload your own files</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 animate-fade-in space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 mb-2 inline-block">
            QuickShare Transfer
          </span>
          <h2 className="text-2xl font-bold text-slate-900">
            {files.length === 1 ? '1 File Ready to Download' : `${files.length} Files Ready to Download`}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Available until {new Date(session.expiresAt).toLocaleDateString()} ({formatTimeRemaining(session.expiresAt)})
          </p>
        </div>

        {/* Primary Download All Action if multiple files */}
        {files.length > 1 && (
          <a
            href={getZipDownloadUrl(token, activePassword)}
            download
            onClick={() => playSuccessChime()}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg transition-all active:scale-[0.99]"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Download All as ZIP</span>
          </a>
        )}
      </div>

      {/* Message from Sender */}
      {session.note && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
              Message from Sender:
            </span>
            <p className="text-xs sm:text-sm text-amber-950 font-medium whitespace-pre-wrap">
              {session.note}
            </p>
          </div>
        </div>
      )}

      {/* Self-Destruct Warning if maxDownloads === 1 */}
      {session.maxDownloads === 1 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800">
          <Flame className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
          <span>
            <strong>Self-Destruct Active:</strong> This transfer is limited to a single download. The session and files will automatically self-destruct after this download.
          </span>
        </div>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Files</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800">
            {files.length}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Size</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800">
            {formatFileSize(session.totalSizeBytes)}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Time Left</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-rose-600 font-mono tracking-tight">
            {countdown || formatTimeRemaining(session.expiresAt)}
          </p>
        </div>
      </div>

      {/* Files List */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Files in this session
        </h4>
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                  title="In-Browser Preview"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Preview</span>
                </button>

                <a
                  href={getSingleFileDownloadUrl(token, file.id, activePassword)}
                  download={file.name}
                  onClick={() => playSuccessChime()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-semibold transition-colors"
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
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={onBackToUpload}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Upload files</span>
        </button>

        <span className="text-xs text-slate-400">
          Powered by QuickShare
        </span>
      </div>

      {/* In-Browser Preview Lightbox */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          token={token}
          password={activePassword}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
