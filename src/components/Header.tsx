import React from 'react';
import { QrCode, ShieldCheck, Database, RefreshCw } from 'lucide-react';

interface HeaderProps {
  storageType?: string;
  totalCount: number;
  activeCount: number;
  emptyCount: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storageType = 'local-memory',
  totalCount,
  activeCount,
  emptyCount,
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  QR Generator
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  PIN Protected
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate QR kosong &bull; Aktivasi instan dengan PIN &bull; Siap cetak &amp; tempel
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {storageType === 'supabase' ? 'Supabase DB' : 'Local Storage'}
                </span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span>
                Total: <strong className="text-zinc-900 dark:text-zinc-100">{totalCount}</strong>
              </span>
              <span>
                Kosong: <strong className="text-amber-600 dark:text-amber-400">{emptyCount}</strong>
              </span>
              <span>
                Aktif: <strong className="text-emerald-600 dark:text-emerald-400">{activeCount}</strong>
              </span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
