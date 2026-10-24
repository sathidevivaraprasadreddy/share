import React, { useState, useEffect } from 'react';
import { getSingleFileDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/format';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  ExternalLink,
  Loader2,
  File
} from 'lucide-react';

export default function FilePreviewModal({ file, token, password, onClose }) {
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);

  if (!file || !token) return null;

  const downloadUrl = getSingleFileDownloadUrl(token, file.id, password);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'csv', 'log', 'env'].includes(ext);

  // If text file, fetch content to display inline
  useEffect(() => {
    if (isText && file.size < 500000) { // Limit inline preview to < 500 KB text
      setLoadingText(true);
      fetch(downloadUrl)
        .then((res) => res.text())
        .then((txt) => setTextContent(txt))
        .catch(() => setTextContent(null))
        .finally(() => setLoadingText(false));
    }
  }, [downloadUrl, isText, file.size]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-600 shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5 text-purple-600" />
              ) : isVideo ? (
                <Film className="w-5 h-5 text-blue-600" />
              ) : isAudio ? (
                <Music className="w-5 h-5 text-amber-600" />
              ) : isText ? (
                <FileText className="w-5 h-5 text-rose-600" />
              ) : (
                <File className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {formatBytes(file.size)} • In-Browser Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={file.name}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Preview Area */}
        <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-slate-950/5 min-h-[300px]">
          {isImage ? (
            <img
              src={downloadUrl}
              alt={file.name}
              className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-md mx-auto"
            />
          ) : isVideo ? (
            <video
              controls
              autoPlay
              src={downloadUrl}
              className="max-h-[65vh] max-w-full rounded-2xl shadow-md mx-auto bg-black"
            >
              Your browser does not support the video tag.
            </video>
          ) : isAudio ? (
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-md border border-slate-100 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">{file.name}</h4>
              <audio controls autoPlay src={downloadUrl} className="w-full" />
            </div>
          ) : isText ? (
            loadingText ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-10">
                <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
                <span>Loading preview...</span>
              </div>
            ) : (
              <pre className="w-full max-h-[60vh] p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-auto leading-relaxed shadow-inner">
                {textContent || 'Could not load text content.'}
              </pre>
            )
          ) : isPdf ? (
            <div className="text-center space-y-3 p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
              <FileText className="w-12 h-12 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">PDF Document</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                PDF previews can be opened directly in a new browser tab or downloaded.
              </p>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open PDF in New Tab</span>
              </a>
            </div>
          ) : (
            <div className="text-center space-y-3 p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
              <File className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Preview not available</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                This file format cannot be rendered inline in the browser. Please download the file to view it.
              </p>
              <a
                href={downloadUrl}
                download={file.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
