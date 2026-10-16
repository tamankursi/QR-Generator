import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}.supabase.co`;
  }

  if (url && key) {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { count: rawCount, pin } = body;

    const serverPin = (process.env.ACTIVATION_PIN || '140405').trim();
    const inputPin = typeof pin === 'string' ? pin.trim() : '';

    if (!inputPin || inputPin !== serverPin) {
      return res.status(401).json({
        success: false,
        error: 'PIN salah, coba lagi',
      });
    }

    const count = typeof rawCount === 'number' ? rawCount : parseInt(String(rawCount), 10);
    if (isNaN(count) || count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        error: 'Jumlah QR code harus antara 1 sampai 20',
      });
    }

    const now = new Date().toISOString();
    const itemsToInsert = Array.from({ length: Math.floor(count) }, () => ({
      status: 'kosong',
      business_name: null,
      target_url: null,
      created_at: now,
      activated_at: null,
      updated_at: now,
    }));

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database Supabase belum terkonfigurasi di Vercel Environment Variables.',
      });
    }

    const { data, error } = await supabase
      .from('qr_codes')
      .insert(itemsToInsert)
      .select('*');

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Gagal menyimpan QR code ke Supabase',
      });
    }

    return res.status(201).json({
      success: true,
      message: `Berhasil generate ${data?.length || count} QR code`,
      data: data || [],
    });
  } catch (err: any) {
    console.error('Error generating QR:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan sistem saat generate QR code: ' + (err?.message || ''),
    });
  }
}
