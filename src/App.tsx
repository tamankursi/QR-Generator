import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QRCodeItem } from './types.js';
import { Header } from './components/Header.js';
import { GenerateForm } from './components/GenerateForm.js';
import { QRCard } from './components/QRCard.js';
import { EditLinkModal } from './components/EditLinkModal.js';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.js';
import { ActivationView } from './components/ActivationView.js';
import { ToastContainer, ToastMessage } from './components/Toast.js';
import { downloadAllQRCodesZip } from './utils/qr.js';
import {
  Search,
  Loader2,
  FolderArchive,
  QrCode,
  Sparkles,
  Inbox,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [storageType, setStorageType] = useState<string>('local-memory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tab state: default 'kosong'
  const [activeTab, setActiveTab] = useState<'kosong' | 'aktif'>('kosong');

  // Modals state
  const [editingItem, setEditingItem] = useState<QRCodeItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<QRCodeItem | null>(null);
  const [activatingItem, setActivatingItem] = useState<QRCodeItem | null>(null);

  // Routing state for /q/:id or ?scan=:id
  const [currentRoute, setCurrentRoute] = useState<{ path: string; id?: string }>(() => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const scanId = searchParams.get('scan');
    if (pathname.startsWith('/q/')) {
      const id = pathname.replace('/q/', '').trim();
      return { path: 'scan', id };
    }
    if (scanId) {
      return { path: 'scan', id: scanId.trim() };
    }
    return { path: 'home' };
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const scanId = searchParams.get('scan');
      if (pathname.startsWith('/q/')) {
        const id = pathname.replace('/q/', '').trim();
        setCurrentRoute({ path: 'scan', id });
      } else if (scanId) {
        setCurrentRoute({ path: 'scan', id: scanId.trim() });
      } else {
        setCurrentRoute({ path: 'home' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch QR codes list
  const fetchQRCodes = useCallback(async () => {
    try {
      const [qrRes, healthRes] = await Promise.all([
        fetch('/api/qr'),
        fetch('/api/health').catch(() => null),
      ]);

      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        if (healthData.storage) setStorageType(healthData.storage);
      }

      if (qrRes.ok) {
        const data = await qrRes.json();
        if (data.success && Array.isArray(data.data)) {
          setQrCodes(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQRCodes();
    addToast('info', 'Data QR Code telah diperbarui');
  };

  // Generate batch with PIN verification
  const handleGenerate = async (count: number, pin: string): Promise<{ success: boolean; error?: string }> => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, pin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'PIN salah, coba lagi' };
      }

      // Automatically switch to "Kosong" tab because newly generated QRs are empty
      setActiveTab('kosong');
      addToast('success', `Berhasil membuat ${count} QR Code baru!`);
      await fetchQRCodes();
      return { success: true };
    } catch {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    } finally {
      setIsGenerating(false);
    }
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    if (qrCodes.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const baseUrl = window.location.origin;
      const itemsToZip = qrCodes.map((item) => ({
        id: item.id,
        url: `${baseUrl}/q/${item.id}`,
        status: item.status,
      }));

      await downloadAllQRCodesZip(itemsToZip, `qr-codes-batch-${itemsToZip.length}.zip`);
      addToast('success', `Berhasil mengunduh ZIP berisi ${itemsToZip.length} QR Code`);
    } catch (err) {
      console.error('Zip export error:', err);
      addToast('error', 'Gagal membuat file ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const activeCount = useMemo(() => qrCodes.filter((q) => q.status === 'aktif').length, [qrCodes]);
  const emptyCount = useMemo(() => qrCodes.filter((q) => q.status === 'kosong').length, [qrCodes]);

  // Tab-filtered & search-filtered list
  const tabFilteredList = useMemo(() => {
    return qrCodes.filter((item) => {
      // Must match current active tab
      if (item.status !== activeTab) {
        return false;
      }
      // Search query (matches UUID, short ID, or target URL)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const shortId = item.id.substring(0, 8).toLowerCase();
        const fullId = item.id.toLowerCase();
        const bName = (item.business_name || '').toLowerCase();
        return (
          shortId.includes(query) ||
          fullId.includes(query) ||
          target.includes(query) ||
          bName.includes(query)
        );
      }
      return true;
    });
  }, [qrCodes, activeTab, searchQuery]);

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentRoute({ path: 'home' });
    setActivatingItem(null);
    fetchQRCodes();
  };

  const navigateToScan = (id: string) => {
    window.history.pushState({}, '', `/q/${id}`);
    setCurrentRoute({ path: 'scan', id });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      {/* Toast container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Edit Link Modal */}
      <EditLinkModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSuccess={(updated) => {
          setQrCodes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
          addToast('success', 'Link tujuan QR Code berhasil diperbarui!');
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        item={deletingItem}
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onSuccess={(deletedId) => {
          setQrCodes((prev) => prev.filter((q) => q.id !== deletedId));
          addToast('success', 'QR berhasil dihapus');
        }}
      />

      {/* Top Header */}
      <Header
        storageType={storageType}
        totalCount={qrCodes.length}
        activeCount={activeCount}
        emptyCount={emptyCount}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Route: Scan / Activation Page */}
        {(currentRoute.path === 'scan' && currentRoute.id) || activatingItem ? (
          <ActivationView
            id={currentRoute.id || activatingItem?.id || ''}
            onBackToHome={navigateToHome}
            onActivated={(updated) => {
              setQrCodes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
              addToast('success', 'QR Code berhasil diaktivasi!');
            }}
          />
        ) : (
          /* Route: Dashboard Home Page */
          <div className="space-y-8">
            {/* Top Generate Box (Requires PIN) */}
            <GenerateForm onGenerate={handleGenerate} isLoading={isGenerating} />

            {/* Navigation Tabs (shadcn/ui style) & Batch Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              {/* Tabs: Kosong vs Aktif */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                {/* Shadcn-style Tabs List */}
                <div
                  role="tablist"
                  aria-label="Filter status QR Code"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-kosong"
                    aria-controls="panel-kosong"
                    aria-selected={activeTab === 'kosong'}
                    onClick={() => setActiveTab('kosong')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                      activeTab === 'kosong'
                        ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Kosong</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        activeTab === 'kosong'
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {emptyCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="tab-aktif"
                    aria-controls="panel-aktif"
                    aria-selected={activeTab === 'aktif'}
                    onClick={() => setActiveTab('aktif')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                      activeTab === 'aktif'
                        ? 'bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Aktif</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        activeTab === 'aktif'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {activeCount}
                    </span>
                  </button>
                </div>

                {/* Search in active tab */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Cari di tab ${activeTab === 'kosong' ? 'Kosong' : 'Aktif'}...`}
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              {/* Download All (ZIP) Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={qrCodes.length === 0 || isZipping}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download Semua QR Code dalam format ZIP"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat ZIP...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                      <span>Download Semua (ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR Codes Grid / Tab Panels */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-500">Memuat koleksi QR Code...</p>
              </div>
            ) : tabFilteredList.length === 0 ? (
              /* Friendly Empty State tailored to active tab */
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center max-w-lg mx-auto">
                {activeTab === 'kosong' ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto mb-3 text-amber-600 dark:text-amber-400">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      {searchQuery
                        ? 'Tidak ada QR Kosong yang cocok'
                        : 'Belum ada QR kosong'}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                      {searchQuery
                        ? 'Coba ganti kata kunci pencarian Anda.'
                        : 'Belum ada QR kosong. Generate QR baru di atas.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      {searchQuery
                        ? 'Tidak ada QR Aktif yang cocok'
                        : 'Belum ada QR yang diaktifkan'}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                      {searchQuery
                        ? 'Coba ganti kata kunci pencarian Anda.'
                        : 'Belum ada QR yang diaktifkan. Buka tab "Kosong" lalu klik Aktivasi pada salah satu QR.'}
                    </p>
                  </>
                )}

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
                  >
                    Reset Filter Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
              >
                {tabFilteredList.map((item) => (
                  <QRCard
                    key={item.id}
                    item={item}
                    baseUrl={window.location.origin}
                    onEdit={(selected) => setEditingItem(selected)}
                    onActivate={(selected) => navigateToScan(selected.id)}
                    onDelete={(selected) => setDeletingItem(selected)}
                    onCopySuccess={() => addToast('info', 'Link QR Code berhasil disalin ke clipboard')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        <p>
          QR Generator &bull; Server-Side PIN Verification Protected &bull; Supabase RLS &amp; PostgreSQL Ready
        </p>
      </footer>
    </div>
  );
}
