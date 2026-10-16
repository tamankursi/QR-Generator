import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  isValidTargetUrl,
  validateGenerateCount,
  verifyPin,
  MemoryRateLimiter,
} from './src/utils/validation.js';
import { QRCodeItem } from './src/types.js';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ACTIVATION_PIN = (process.env.ACTIVATION_PIN || '140405').trim();

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project-id')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    isSupabaseConfigured = true;
    console.log('[Supabase] Initialized with Service Role');
  } catch (err) {
    console.error('[Supabase] Initialization failed, using local store:', err);
  }
}

// In-Memory fallback store so the application is 100% functional out of the box
const localStore: Map<string, QRCodeItem> = new Map();

// Seed initial demo data if local store is empty
if (localStore.size === 0) {
  const initialId1 = crypto.randomUUID();
  const initialId2 = crypto.randomUUID();
  const now = new Date().toISOString();

  localStore.set(initialId1, {
    id: initialId1,
    status: 'kosong',
    business_name: null,
    target_url: null,
    created_at: now,
    activated_at: null,
    updated_at: now,
  });

  localStore.set(initialId2, {
    id: initialId2,
    status: 'aktif',
    business_name: 'Kedai Kopi Senja',
    target_url: 'https://google.com',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    activated_at: now,
    updated_at: now,
  });
}

// Security: Rate limiter for PIN verification (max 10 requests / minute per IP)
const activateRateLimiter = new MemoryRateLimiter(60 * 1000, 10);

app.use(express.json());

// Helper: Get Client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Database helper layer
async function getAllQRCodes(): Promise<QRCodeItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as QRCodeItem[];
    }
    console.warn('[Supabase] Error fetching qr_codes, falling back to local store:', error?.message);
  }
  return Array.from(localStore.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function getQRCodeById(id: string): Promise<QRCodeItem | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as QRCodeItem;
    }
  }
  return localStore.get(id) || null;
}

async function insertQRCodes(items: QRCodeItem[]): Promise<QRCodeItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('qr_codes')
      .insert(items)
      .select('*');

    if (!error && data) {
      return data as QRCodeItem[];
    }
    console.warn('[Supabase] Insert error, fallback to local store:', error?.message);
  }
  for (const item of items) {
    localStore.set(item.id, item);
  }
  return items;
}

async function updateQRCode(
  id: string,
  updates: Partial<QRCodeItem>
): Promise<QRCodeItem | null> {
  const existing = await getQRCodeById(id);
  if (!existing) return null;

  const updated: QRCodeItem = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('qr_codes')
      .update({
        ...updates,
        updated_at: updated.updated_at,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (!error && data) {
      return data as QRCodeItem;
    }
    console.warn('[Supabase] Update error, fallback to local store:', error?.message);
  }

  localStore.set(id, updated);
  return updated;
}

async function deleteQRCode(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('qr_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[Supabase] Delete error, falling back to local store:', error.message);
    }
  }
  return localStore.delete(id);
}

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// System health / status check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    storage: isSupabaseConfigured ? 'supabase' : 'local-memory',
    totalQrs: localStore.size,
  });
});

// GET /api/qr - List all QR codes
app.get('/api/qr', async (req: Request, res: Response) => {
  try {
    const list = await getAllQRCodes();
    res.json({ success: true, data: list });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Gagal mengambil data QR Code' });
  }
});

// GET /api/qr/:id - Get specific QR code
app.get('/api/qr/:id', async (req: Request, res: Response) => {
  try {
    const item = await getQRCodeById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'QR Code tidak ditemukan' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem' });
  }
});

// POST /api/generate - Generate 1-20 QR codes with status 'kosong' (Requires PIN)
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const { count: rawCount, pin } = req.body || {};

    // Validate PIN strictly server-side
    if (!verifyPin(pin, ACTIVATION_PIN)) {
      res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
      return;
    }

    const validation = validateGenerateCount(rawCount);

    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const count = validation.count;
    const now = new Date().toISOString();
    const newItems: QRCodeItem[] = [];

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      newItems.push({
        id,
        status: 'kosong',
        business_name: null,
        target_url: null,
        created_at: now,
        activated_at: null,
        updated_at: now,
      });
    }

    const inserted = await insertQRCodes(newItems);
    res.status(201).json({
      success: true,
      message: `Berhasil generate ${inserted.length} QR Code baru`,
      data: inserted,
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Gagal men-generate QR Code' });
  }
});

// POST /api/activate - Activate QR code with PIN, optional business_name, and target URL
app.post('/api/activate', async (req: Request, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = activateRateLimiter.check(clientIp);

    if (!rateCheck.allowed) {
      const waitSeconds = Math.ceil(rateCheck.resetMs / 1000);
      res.status(429).json({
        success: false,
        error: `Terlalu banyak percobaan aktivasi. Harap tunggu ${waitSeconds} detik sebelum mencoba lagi.`,
      });
      return;
    }

    const { id, business_name, target_url, pin } = req.body || {};

    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'ID QR Code tidak valid.' });
      return;
    }

    // Server-side strict PIN verification
    if (!verifyPin(pin, ACTIVATION_PIN)) {
      res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
      return;
    }

    // Validate target URL
    const urlValidation = isValidTargetUrl(target_url);
    if (!urlValidation.valid) {
      res.status(400).json({ success: false, error: urlValidation.error });
      return;
    }

    // Sanitize business_name: optional, max 100 chars, trimmed, empty becomes null
    let cleanBusinessName: string | null = null;
    if (typeof business_name === 'string') {
      const trimmed = business_name.trim();
      if (trimmed.length > 0) {
        cleanBusinessName = trimmed.substring(0, 100);
      }
    }

    const existing = await getQRCodeById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'QR Code tidak ditemukan di sistem' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await updateQRCode(id, {
      status: 'aktif',
      business_name: cleanBusinessName,
      target_url: urlValidation.normalizedUrl || target_url.trim(),
      activated_at: existing.activated_at || now,
    });

    res.json({
      success: true,
      message: 'QR Code berhasil diaktivasi!',
      data: updated,
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Gagal mengaktivasi QR Code' });
  }
});

// POST /api/edit - Edit target URL on an active QR code
app.post('/api/edit', async (req: Request, res: Response) => {
  try {
    const { id, target_url, pin } = req.body || {};

    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'ID QR Code tidak valid.' });
      return;
    }

    // Verify PIN strictly server-side
    if (!verifyPin(pin, ACTIVATION_PIN)) {
      res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
      return;
    }

    const existing = await getQRCodeById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'QR Code tidak ditemukan' });
      return;
    }

    if (existing.status !== 'aktif') {
      res.status(400).json({
        success: false,
        error: 'QR Code masih kosong. Silakan aktivasi terlebih dahulu.',
      });
      return;
    }

    // Validate new URL
    const urlValidation = isValidTargetUrl(target_url);
    if (!urlValidation.valid) {
      res.status(400).json({ success: false, error: urlValidation.error });
      return;
    }

    const updated = await updateQRCode(id, {
      target_url: urlValidation.normalizedUrl || target_url.trim(),
    });

    res.json({
      success: true,
      message: 'Link tujuan QR Code berhasil diperbarui!',
      data: updated,
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Gagal memperbarui link QR Code' });
  }
});

// POST /api/delete - Delete QR Code with PIN verification (Permanent hard delete)
app.post('/api/delete', async (req: Request, res: Response) => {
  try {
    const { id, pin } = req.body || {};

    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'ID QR Code tidak valid.' });
      return;
    }

    // Verify PIN strictly server-side
    if (!verifyPin(pin, ACTIVATION_PIN)) {
      res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
      return;
    }

    const existing = await getQRCodeById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'QR Code tidak ditemukan' });
      return;
    }

    await deleteQRCode(id);

    res.json({
      success: true,
      message: 'QR Code berhasil dihapus',
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Gagal menghapus QR Code' });
  }
});

// -----------------------------------------------------------------------------
// REDIRECT & SCAN ROUTE: /q/:id
// -----------------------------------------------------------------------------
app.get('/q/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const item = await getQRCodeById(id);

    // If QR is found and status is 'aktif', execute HTTP 302 redirect directly
    if (item && item.status === 'aktif' && item.target_url) {
      // Check accept header: if requested by automated scanner or direct browser
      console.log(`[Redirect] QR ${id.substring(0, 8)} -> ${item.target_url}`);
      return res.redirect(302, item.target_url);
    }

    // Otherwise, allow Vite/React app to handle rendering (shows activation form or 404)
    next();
  } catch (err) {
    next();
  }
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVER
// -----------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ready at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
