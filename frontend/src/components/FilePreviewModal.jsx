import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  File,
  Loader2,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { formatFileSize } from '../utils/formatters';

export default function FilePreviewModal({ file, downloadUrl, onClose }) {
  const [textLoading, setTextLoading] = useState(false);
  const [textContent, setTextContent] = useState(null);
  const [textError, setTextError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!file) return null;

  const fileName = file.name || file.original_name || 'File Preview';
  const fileSize = file.size || file.file_size || 0;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'log', 'xml', 'sql', 'sh', 'env'].includes(ext);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch text file content
  useEffect(() => {
    if (isText && downloadUrl) {
      setTextLoading(true);
      setTextError(null);
      fetch(downloadUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Could not load text preview');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch((err) => {
          setTextError(err.message || 'Failed to read file preview');
          setTextLoading(false);
        });
    }
  }, [isText, downloadUrl]);

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              {isImage && <ImageIcon className="w-4 h-4" />}
              {isVideo && <Film className="w-4 h-4" />}
              {isAudio && <Music className="w-4 h-4" />}
              {isPdf && <FileText className="w-4 h-4" />}
              {isText && <FileText className="w-4 h-4" />}
              {!isImage && !isVideo && !isAudio && !isPdf && !isText && <File className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-400">
                {formatFileSize(fileSize)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isText && textContent && (
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Copy entire text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            )}

            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1 text-slate-500">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <a
              href={downloadUrl}
              download={fileName}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/60 min-h-[320px]">
          {/* 1. Image Preview */}
          {isImage && (
            <div className="overflow-auto max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={downloadUrl}
                alt={fileName}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-md transition-transform duration-150"
              />
            </div>
          )}

          {/* 2. Video Player */}
          {isVideo && (
            <div className="w-full flex items-center justify-center">
              <video
                src={downloadUrl}
                controls
                autoPlay
                className="max-w-full max-h-[68vh] rounded-2xl shadow-lg bg-black"
              >
                Your browser does not support playing this video.
              </video>
            </div>
          )}

          {/* 3. Audio Player */}
          {isAudio && (
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 animate-pulse">
                <Music className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{fileName}</h4>
                <p className="text-xs text-slate-400 mt-1">{formatFileSize(fileSize)}</p>
              </div>
              <audio src={downloadUrl} controls autoPlay className="w-full pt-2" />
            </div>
          )}

          {/* 4. PDF Preview */}
          {isPdf && (
            <iframe
              src={downloadUrl}
              title={fileName}
              className="w-full h-[68vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          )}

          {/* 5. Text & Code Preview */}
          {isText && (
            <div className="w-full h-full max-h-[68vh] flex flex-col">
              {textLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span className="text-xs">Loading note preview...</span>
                </div>
              ) : textError ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-center">
                  {textError}
                </div>
              ) : (
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-auto max-h-[65vh] whitespace-pre-wrap leading-relaxed shadow-inner">
                  {textContent || '(Empty file)'}
                </pre>
              )}
            </div>
          )}

          {/* 6. Unsupported / Binary / ZIP */}
          {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 mx-auto flex items-center justify-center text-slate-500">
                <Archive className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{fileName}</h4>
                <p className="text-xs text-slate-400">
                  Direct preview is not available for this file type. Click download to open on your device.
                </p>
              </div>
              <a
                href={downloadUrl}
                download={fileName}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download File ({formatFileSize(fileSize)})</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
          Click outside or press Escape to close preview
        </div>
      </div>
    </div>
  );
}
