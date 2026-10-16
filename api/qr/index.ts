import { getSupabaseClient } from '../../lib/supabase-admin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query || {};

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(200).json({
      success: true,
      data: id ? null : [],
      count: 0,
      storage: 'not-configured',
    });
  }

  try {
    if (id && typeof id === 'string') {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ success: false, error: 'QR Code tidak ditemukan' });
      }

      return res.status(200).json({ success: true, data });
    }

    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error('Error fetching qr_codes:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil data dari database' });
  }
}
