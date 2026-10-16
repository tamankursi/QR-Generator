import { getSupabaseClient } from '../lib/supabase-admin';
import { validateGenerateCount, verifyPin } from '../src/utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { count: rawCount, pin } = body;

    const serverPin = process.env.ACTIVATION_PIN || '140405';
    if (!verifyPin(pin, serverPin)) {
      return res.status(401).json({
        success: false,
        error: 'PIN salah, coba lagi',
      });
    }

    const validation = validateGenerateCount(rawCount);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const count = validation.count;
    const now = new Date().toISOString();
    const itemsToInsert = Array.from({ length: count }, () => ({
      status: 'kosong',
      business_name: null,
      target_url: null,
      created_at: now,
      activated_at: null,
      updated_at: now,
    }));

    const supabase = getSupabaseClient();
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
      error: 'Terjadi kesalahan sistem saat generate QR code',
    });
  }
}
