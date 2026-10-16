import React, { useState, useEffect } from 'react';
import { QRCodeItem } from '../types.js';
import { X, Lock, Link as LinkIcon, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { isValidTargetUrl } from '../utils/validation.js';

interface EditLinkModalProps {
  item: QRCodeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: QRCodeItem) => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTargetUrl(item.target_url || '');
      setPin('');
      setErrorMessage(null);
    }
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = isValidTargetUrl(targetUrl);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'URL tidak valid.');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('PIN keamanan wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          target_url: validation.normalizedUrl || targetUrl.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Gagal mengubah link tujuan.');
        setIsLoading(false);
        return;
      }

      onSuccess(data.data);
      onClose();
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan. Coba lagi beberapa saat.');
    } finally {
      setIsLoading(false);
    }
  };

  const shortId = item.id.substring(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Link Tujuan
            </h3>
            <p className="text-xs text-zinc-500 font-mono">ID: #{shortId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg transition"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
              Link Tujuan Baru (URL)
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://contoh.com/halaman-baru"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              required
            />
            <p className="text-[11px] text-zinc-400">
              Harus diawali dengan <code>http://</code> atau <code>https://</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              PIN Keamanan (6 Digit)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN Anda"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5"
                tabIndex={-1}
                aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Hanya pemilik PIN yang dapat mengedit link QR ini.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
