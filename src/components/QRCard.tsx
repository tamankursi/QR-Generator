import React, { useEffect, useState } from 'react';
import { QRCodeItem } from '../types.js';
import { generateQRCodeDataUrl, downloadSingleQRCodePng } from '../utils/qr.js';
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Sparkles,
  Clock,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';

interface QRCardProps {
  item: QRCodeItem;
  baseUrl: string;
  onEdit: (item: QRCodeItem) => void;
  onActivate: (item: QRCodeItem) => void;
  onDelete: (item: QRCodeItem) => void;
  onCopySuccess?: () => void;
}

export const QRCard: React.FC<QRCardProps> = ({
  item,
  baseUrl,
  onEdit,
  onActivate,
  onDelete,
  onCopySuccess,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(true);

  const shortId = item.id.substring(0, 8);
  const scanUrl = `${baseUrl}/q/${item.id}`;
  const isAktif = item.status === 'aktif';

  useEffect(() => {
    let mounted = true;
    setIsGeneratingImg(true);
    generateQRCodeDataUrl(scanUrl, 256)
      .then((url) => {
        if (mounted) {
          setDataUrl(url);
          setIsGeneratingImg(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR preview:', err);
        if (mounted) setIsGeneratingImg(false);
      });

    return () => {
      mounted = false;
    };
  }, [scanUrl]);

  const handleDownload = () => {
    if (!dataUrl) return;
    downloadSingleQRCodePng(dataUrl, `qr-${shortId}-${item.status}`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      if (onCopySuccess) onCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-xs group">
      <div>
        {/* Top bar: ID and Status badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              #{shortId}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isAktif ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Kosong
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              title="Hapus QR"
              aria-label={`Hapus QR #${shortId}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* QR Code Preview Canvas Container (256x256 display aspect ratio) */}
        <div className="relative aspect-square w-full rounded-xl bg-white border border-zinc-200 dark:border-zinc-700/80 p-3 flex items-center justify-center overflow-hidden mb-3.5 shadow-inner">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR Code ${shortId}`}
              className="w-full h-full object-contain select-none"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-xs">
              <span className="animate-spin mb-1">&#9696;</span>
              Membuat preview...
            </div>
          )}

          {/* Quick test hover overlay */}
          <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] flex items-center justify-center gap-2 p-2 pointer-events-none group-hover:pointer-events-auto">
            <a
              href={scanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold bg-white text-zinc-900 rounded-lg shadow-md hover:bg-zinc-100 flex items-center gap-1 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka / Scan
            </a>
          </div>
        </div>

        {/* Business Name & Target URL Section */}
        <div className="space-y-2 mb-3">
          {/* 3. Nama Bisnis (di atas Link Tujuan) */}
          <div>
            <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
              NAMA BISNIS:
            </span>
            {item.business_name ? (
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.business_name}>
                {item.business_name}
              </p>
            ) : (
              <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">-</p>
            )}
          </div>

          {/* 4. Link Tujuan */}
          <div className="min-h-[38px]">
            <span className="text-zinc-400 dark:text-zinc-500 block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
              LINK TUJUAN:
            </span>
            {isAktif && item.target_url ? (
              <a
                href={item.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block transition"
                title={item.target_url}
              >
                <span className="inline-flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.target_url}</span>
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 italic">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Belum diaktivasi</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-2">
          {/* Download PNG Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl || isGeneratingImg}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition disabled:opacity-50"
            title="Download PNG QR Code"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          {/* Copy Scan Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
            title="Salin Link /q/{id}"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin URL</span>
              </>
            )}
          </button>
        </div>

        {/* Primary State Action: Edit Link (if active) OR Activate Now (if empty) + Hapus */}
        <div className="flex items-center gap-2">
          {isAktif ? (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs active:scale-[0.99]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Link</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate(item)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white transition shadow-xs active:scale-[0.99]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aktivasi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition active:scale-[0.99]"
            title="Hapus QR Code"
            aria-label={`Hapus QR Code ${shortId}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
};
