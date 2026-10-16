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

function isValidUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL tujuan tidak boleh kosong.' };
  }
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { valid: false, error: 'Protokol URL tidak diizinkan.' };
  }
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return { valid: false, error: 'URL harus dimulai dengan http:// atau https://' };
  }
  try {
    const parsed = new URL(trimmed);
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: 'Format URL tidak valid.' };
  }
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
    const { id, target_url, pin } = body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID QR code wajib disertakan' });
    }

    const serverPin = (process.env.ACTIVATION_PIN || '140405').trim();
    const inputPin = typeof pin === 'string' ? pin.trim() : '';

    if (!inputPin || inputPin !== serverPin) {
      return res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
    }

    const urlCheck = isValidUrl(target_url);
    if (!urlCheck.valid || !urlCheck.normalized) {
      return res.status(400).json({ success: false, error: urlCheck.error || 'URL tujuan tidak valid' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database belum terkonfigurasi' });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('qr_codes')
      .update({
        target_url: urlCheck.normalized,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Link tujuan berhasil diperbarui',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error editing QR:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem: ' + (err?.message || '') });
  }
}
