import React, { useState } from 'react';
import { PlusCircle, Loader2, Sparkles, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface GenerateFormProps {
  onGenerate: (count: number, pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({ onGenerate, isLoading }) => {
  const [count, setCount] = useState<number>(5);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presets = [1, 5, 10, 20];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (count < 1 || count > 20 || isLoading) return;
    if (!pin.trim()) {
      setErrorMessage('PIN keamanan wajib diisi.');
      return;
    }

    const result = await onGenerate(count, pin.trim());
    if (!result.success) {
      setErrorMessage(result.error || 'PIN salah, coba lagi');
    } else {
      setPin('');
      setErrorMessage(null);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Generate QR Code Baru
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Buat batch QR kosong sekaligus (1-20). Masukkan PIN keamanan Anda untuk membuat QR baru.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Slider & Count Picker */}
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Jumlah:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{count} QR</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  className="w-28 sm:w-32 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  disabled={isLoading}
                  aria-label="Slider jumlah QR"
                />
              </div>

              <input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setCount(Math.min(20, Math.max(1, val)));
                }}
                className="w-14 text-center font-semibold text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                disabled={isLoading}
                aria-label="Input angka jumlah QR"
              />

              <div className="hidden sm:flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCount(preset)}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      count === preset
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    disabled={isLoading}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* PIN Input with show/hide toggle */}
            <div className="relative flex-1 sm:w-56">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={12}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="PIN Keamanan (6 Digit)"
                disabled={isLoading}
                className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white font-mono tracking-wider"
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
          </div>

          {/* Submit Button (requires PIN to be entered) */}
          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition shadow-sm active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses {count} QR...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Generate {count} QR</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
