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
    const { id, pin } = body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID QR code wajib disertakan' });
    }

    const serverPin = (process.env.ACTIVATION_PIN || '140405').trim();
    const inputPin = typeof pin === 'string' ? pin.trim() : '';

    if (!inputPin || inputPin !== serverPin) {
      return res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database belum terkonfigurasi' });
    }

    const { error: deleteErr } = await supabase
      .from('qr_codes')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return res.status(500).json({ success: false, error: deleteErr.message });
    }

    return res.status(200).json({
      success: true,
      message: 'QR code berhasil dihapus permanen',
    });
  } catch (err: any) {
    console.error('Error deleting QR:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat menghapus: ' + (err?.message || '') });
  }
}
