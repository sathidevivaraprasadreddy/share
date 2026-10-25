import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  HardDrive,
  RotateCcw,
  Share2,
  MessageCircle,
  Mail,
  Send
} from 'lucide-react';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';

export default function ShareResult({
  result,
  onReset,
  onShowQR,
  onRevoke
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Construct absolute download URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?token=${result.shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (result.sixCode) {
      navigator.clipboard.writeText(result.sixCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyRevokeToken = () => {
    navigator.clipboard.writeText(result.revokeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleConfirmRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke(result.shareToken, result.revokeToken);
    } finally {
      setRevoking(false);
    }
  };

  const formattedSixCode = result.sixCode
    ? `${result.sixCode.slice(0, 3)} ${result.sixCode.slice(3)}`
    : null;

  const shareText = result.sixCode
    ? `Hey! I shared ${result.fileCount} file(s) with you via QuickShare.\n🔢 6-Digit Transfer Code: ${result.sixCode}\n🔗 Download Link: ${shareUrl}\n⏳ Auto-deletes safely after expiry.`
    : `Hey! I shared ${result.fileCount} file(s) with you via QuickShare.\n🔗 Download Link: ${shareUrl}\n⏳ Auto-deletes safely after expiry.`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    `QuickShare: ${result.fileCount} file(s) ready to download`
  )}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `QuickShare: ${result.fileCount} file(s) shared with you`
  )}&body=${encodeURIComponent(shareText)}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QuickShare Transfer',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {}
    } else {
      handleCopyLink();
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 animate-fade-in space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Files Ready to Share!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {result.directShare 
              ? 'Transferred directly to recipient inbox & available via code or link.'
              : 'Share via 6-digit code, instant link, or QR code before expiry.'}
          </p>
        </div>
      </div>

      {/* 6-Digit Code Box (if present) */}
      {result.sixCode && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-900/50 px-2 py-0.5 rounded-full">
                6-Digit Quick Code
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Tell the receiver to enter this code on QuickShare to download instantly:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-wider bg-white dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 shadow-xs">
                {formattedSixCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                title="Copy 6-digit code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Recipients Badge */}
      {result.recipients && result.recipients.length > 0 && (
        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
          <span className="text-xs text-blue-800 dark:text-blue-200 font-medium">
            Sent to recipients: <strong className="font-semibold">{result.recipients.join(', ')}</strong>
          </span>
          <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            In-App Inbox Delivered
          </span>
        </div>
      )}

      {/* Share Link Box */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Public Download Link
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-200 truncate select-all">
            {shareUrl}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => onShowQR(shareUrl)}
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Show QR Code for mobile"
            >
              <QrCode className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Social Sharing (WhatsApp, Telegram, Email, Share Sheet) */}
      <div className="pt-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
          <span>Share directly to</span>
          <button
            onClick={handleCopyMessage}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 normal-case"
          >
            {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedMessage ? 'Message copied!' : 'Copy text message'}</span>
          </button>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Send className="w-4 h-4 fill-white" />
            <span>Telegram</span>
          </a>

          {/* Email */}
          <a
            href={emailUrl}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </a>

          {/* Mobile Native Share Sheet */}
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>More Options</span>
          </button>
        </div>
      </div>

      {/* Session Metadata Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Files</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
            {result.fileCount} {result.fileCount === 1 ? 'file' : 'files'}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Size</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
            {formatFileSize(result.totalSizeBytes)}
          </p>
        </div>

        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Expires</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate" title={new Date(result.expiresAt).toLocaleString()}>
            {formatTimeRemaining(result.expiresAt)}
          </p>
        </div>
      </div>

      {/* Owner Control Section: Revocation */}
      <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
              <span>Delete Files Early (Secret Key)</span>
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
              Want to delete these files early? Only you hold this secret delete key.
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              💡 <strong>Why keep this key?</strong> If you close this browser, you can return anytime, click <strong>"Delete with Key"</strong> at the top, and paste this key to remove your files immediately.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="font-mono text-[11px] bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 px-2 py-1 rounded-lg truncate select-all flex-1">
                {result.revokeToken}
              </span>
              <button
                onClick={handleCopyRevokeToken}
                className="text-xs text-amber-700 dark:text-amber-200 hover:text-amber-900 px-2 py-1 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900/70 rounded-lg transition-colors flex items-center gap-1 font-medium"
                title="Copy Delete Key"
              >
                {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {!showRevokeConfirm ? (
              <button
                onClick={() => setShowRevokeConfirm(true)}
                className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline"
              >
                Delete files and link now
              </button>
            ) : (
              <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-xl">
                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mb-2">
                  Are you sure? Files will be deleted from storage immediately and the download link will stop working.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmRevoke}
                    disabled={revoking}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                  >
                    {revoking ? 'Deleting...' : 'Yes, Delete Now'}
                  </button>
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    disabled={revoking}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset / Share More Button */}
      <div className="pt-2 text-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Upload and share more files</span>
        </button>
      </div>
    </div>
  );
}
