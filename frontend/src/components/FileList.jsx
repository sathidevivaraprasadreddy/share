import React from 'react';
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  X,
  Clock,
  ArrowRight,
  Loader2,
  Trash2
} from 'lucide-react';
import { formatFileSize } from '../utils/formatters';

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

export default function FileList({
  files,
  onRemoveFile,
  onClearFiles,
  onUpload,
  uploading,
  uploadProgress,
  expiryHours,
  setExpiryHours
}) {
  const totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-white text-base">
            Selected Files ({files.length})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total size: <span className="font-medium text-slate-700 dark:text-slate-200">{formatFileSize(totalSizeBytes)}</span>
          </p>
        </div>

        {!uploading && (
          <button
            onClick={onClearFiles}
            className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* List of files */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            {!uploading && (
              <button
                onClick={() => onRemoveFile(index)}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Expiry Selector */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Link expires in:</span>
          <select
            value={expiryHours}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
            disabled={uploading}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer font-medium"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours (1 day)</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </div>

        {/* Upload Button */}
        {!uploading && (
          <button
            onClick={onUpload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 active:scale-[0.99] transition-all"
          >
            <span>Create Share Link</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Upload Progress */}
      {uploading && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading files...</span>
            </span>
            <span>{uploadProgress}%</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-rose-600 h-2.5 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
