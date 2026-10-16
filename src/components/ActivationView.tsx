import React, { useState, useEffect } from 'react';
import { QRCodeItem } from '../types.js';
import {
  QrCode,
  Lock,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { isValidTargetUrl } from '../utils/validation.js';

interface ActivationViewProps {
  id: string;
  onBackToHome: () => void;
  onActivated?: (updated: QRCodeItem) => void;
}

export const ActivationView: React.FC<ActivationViewProps> = ({
  id,
  onBackToHome,
  onActivated,
}) => {
  const [qrItem, setQrItem] = useState<QRCodeItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<QRCodeItem | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  // Fetch QR status
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);

    fetch(`/api/qr/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) setNotFound(true);
          }
          throw new Error('QR not found');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.success && data.data) {
          const item: QRCodeItem = data.data;
          setQrItem(item);

          // If already active, auto-redirect if valid target_url
          if (item.status === 'aktif' && item.target_url) {
            window.location.replace(item.target_url);
          }
        }
      })
      .catch((err) => {
        console.error('Fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle countdown redirect on activation success
  useEffect(() => {
    if (!successData || !successData.target_url) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.href = successData.target_url;
    }
  }, [successData, countdown]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = isValidTargetUrl(targetUrl);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'URL tidak valid.');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('PIN wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          business_name: businessName.trim() || null,
          target_url: validation.normalizedUrl || targetUrl.trim(),
          pin: pin.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setErrorMessage(result.error || 'PIN salah, coba lagi');
        setIsSubmitting(false);
        return;
      }

      const updated = result.data as QRCodeItem;
      setQrItem(updated);
      setSuccessData(updated);
      if (onActivated) onActivated(updated);
    } catch {
      setErrorMessage('Gagal menghubungi server. Periksa koneksi internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shortId = id.substring(0, 8);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Memeriksa status QR Code #{shortId}...
        </p>
      </div>
    );
  }

  // 2. 404 Not Found State
  if (notFound || !qrItem) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          QR Code Tidak Ditemukan
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          QR Code dengan ID <code className="font-mono font-semibold">{id}</code> tidak terdaftar di sistem database.
        </p>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>
    );
  }

  // 3. Success State with countdown redirect
  if (successData && successData.target_url) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Aktivasi Berhasil!
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          QR code <span className="font-mono font-bold">#{shortId}</span> sekarang aktif diarahkan ke:
        </p>
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium text-xs text-zinc-800 dark:text-zinc-200 truncate w-full mb-6">
          {successData.target_url}
        </div>

        <p className="text-xs text-zinc-400 mb-6">
          Mengarahkan otomatis dalam <strong className="text-zinc-700 dark:text-zinc-200">{countdown}</strong> detik...
        </p>

        <a
          href={successData.target_url}
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
        >
          <span>Buka Link Sekarang</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // 4. Already Active State (if auto-redirect paused by browser)
  if (qrItem.status === 'aktif' && qrItem.target_url) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
          QR Code Sudah Aktif
        </h2>
        <p className="text-xs text-zinc-500 font-mono mb-4">ID: #{shortId}</p>

        <div className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6 text-left">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Target Tujuan:
          </span>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 break-all">
            {qrItem.target_url}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <a
            href={qrItem.target_url}
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
          >
            <span>Lanjut ke Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onBackToHome}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 transition"
          >
            Kembali ke Generator
          </button>
        </div>
      </div>
    );
  }

  // 5. Activation Form State (status === 'kosong')
  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="mb-6">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Generator</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Aktivasi QR Code
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: #{shortId}</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Status: Kosong
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 p-3.5 mb-6 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
          <QrCode className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            QR code ini masih kosong. Masukkan link tujuan dan PIN rahasia untuk mengaktifkannya.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* 1. Nama Bisnis (opsional, max 100 karakter) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                Nama Bisnis <span className="text-zinc-400 font-normal">(opsional)</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {businessName.length}/100
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Contoh: Toko Kopi Senja (opsional)"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
              autoFocus
            />
          </div>

          {/* 2. Link Tujuan (wajib) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
              Link Tujuan <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://contoh.com"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
              required
            />
            <p className="text-[11px] text-zinc-400">
              Harus dimulai dengan <code>http://</code> atau <code>https://</code>
            </p>
          </div>

          {/* 3. PIN (wajib, 6 digit) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              PIN Keamanan (6 Digit) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white font-mono tracking-wider"
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
              Hanya Anda pemilik PIN yang berhak mengaktifkan QR ini.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 mt-2 px-5 py-3 rounded-xl font-medium text-sm text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi &amp; Mengaktifkan...</span>
              </>
            ) : (
              <span>Aktivasi QR Code</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
