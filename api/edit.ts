import { getSupabaseClient } from '../lib/supabase-admin';
import { isValidTargetUrl, verifyPin } from '../src/utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { id, target_url, pin } = body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID QR code wajib disertakan' });
    }

    const serverPin = process.env.ACTIVATION_PIN || '140405';
    if (!verifyPin(pin, serverPin)) {
      return res.status(401).json({ success: false, error: 'PIN salah, coba lagi' });
    }

    const urlCheck = isValidTargetUrl(target_url);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      return res.status(400).json({ success: false, error: urlCheck.error || 'URL tujuan tidak valid' });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database belum terkonfigurasi' });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('qr_codes')
      .update({
        target_url: urlCheck.normalizedUrl,
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
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem saat memperbarui link' });
  }
}
