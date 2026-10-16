import { getSupabaseClient } from '../../lib/supabase-admin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query || {};

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID QR code wajib disertakan' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Database belum terkonfigurasi' });
  }

  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'QR Code tidak ditemukan' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching QR item:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem' });
  }
}
