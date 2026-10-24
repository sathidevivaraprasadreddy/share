import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ExternalLink, Download } from 'lucide-react';

export default function QRCodeModal({ url, title, description, onClose }) {
  const qrRef = useRef(null);
  if (!url) return null;

  const handleDownloadQr = () => {
    try {
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'quickshare-qrcode.png';
        link.href = pngUrl;
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.warn('QR download fallback:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          {title || 'Scan to Open'}
        </h3>
        <p className="text-xs text-slate-500 mb-5 px-2">
          {description || 'Point your phone camera at this QR code to open the link instantly.'}
        </p>

        {/* QR Code Container */}
        <div ref={qrRef} className="bg-slate-50 p-5 rounded-2xl inline-block border border-slate-200/60 shadow-inner mb-4">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Download QR button */}
        <div className="mb-4">
          <button
            onClick={handleDownloadQr}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save QR Image to Device</span>
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-left">
          <p className="text-xs text-slate-600 truncate font-mono select-all pr-2">
            {url}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:text-rose-700 p-1 rounded-md shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
