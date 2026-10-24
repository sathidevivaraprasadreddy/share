import React, { useRef, useState } from 'react';
import { UploadCloud, FolderPlus, AlertCircle, FilePlus2, SlidersHorizontal, Sparkles } from 'lucide-react';

const SIZE_PRESETS = [
  { label: '50 MB', value: 50 },
  { label: '100 MB', value: 100 },
  { label: '250 MB', value: 250 },
  { label: '500 MB', value: 500 },
  { label: '1 GB', value: 1024 },
  { label: '2 GB', value: 2048 }
];

const MAX_FILES_COUNT = 10;

export default function FileUploader({
  onFilesSelected,
  onError,
  maxFileSizeMb = 100,
  onMaxFileSizeChange
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentLimitMb, setCurrentLimitMb] = useState(maxFileSizeMb);
  const fileInputRef = useRef(null);

  const activeLimit = onMaxFileSizeChange ? maxFileSizeMb : currentLimitMb;

  const handleSelectLimit = (val, e) => {
    e.stopPropagation(); // prevent clicking dropzone
    if (onMaxFileSizeChange) {
      onMaxFileSizeChange(val);
    } else {
      setCurrentLimitMb(val);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndAddFiles = (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const fileList = Array.from(incomingFiles);

    if (fileList.length > MAX_FILES_COUNT) {
      onError(`You can only upload up to ${MAX_FILES_COUNT} files per session.`);
      return;
    }

    const limitBytes = activeLimit * 1024 * 1024;
    const oversized = fileList.filter((f) => f.size > limitBytes);

    if (oversized.length > 0) {
      const displayLimit = activeLimit >= 1000 ? `${(activeLimit / 1024).toFixed(activeLimit % 1024 === 0 ? 0 : 1)} GB` : `${activeLimit} MB`;
      onError(
        `File "${oversized[0].name}" exceeds the current ${displayLimit} size limit. You can adjust the limit up to 2 GB using the capacity selector above.`
      );
      return;
    }

    onFilesSelected(fileList);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e) => {
    validateAndAddFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Adjustable Capacity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <SlidersHorizontal className="w-3.5 h-3.5 text-rose-500" />
          <span>Upload File Size Limit:</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
          {SIZE_PRESETS.map((preset) => {
            const isSelected = activeLimit === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={(e) => handleSelectLimit(preset.value, e)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-white text-rose-600 shadow-xs scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={`Set file size limit to ${preset.label}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-11 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? 'border-rose-500 bg-rose-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-rose-400 bg-white hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">
          Drag & drop your files here
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          or <span className="text-rose-600 font-semibold hover:underline">browse files</span> from your computer or phone
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 text-xs font-semibold text-slate-600 border border-slate-200/60">
          <span>Up to {MAX_FILES_COUNT} files</span>
          <span className="text-slate-300">•</span>
          <span className="text-rose-600 font-bold">
            Max {activeLimit >= 1000 ? `${(activeLimit / 1024).toFixed(activeLimit % 1024 === 0 ? 0 : 1)} GB` : `${activeLimit} MB`} per file
          </span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Supports all file types: 4K Videos (MP4, MKV, MOV), Photos, Audio, Archives & Documents</span>
        </div>
      </div>
    </div>
  );
}
