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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        storage: 'local-memory',
      });
    }

    const { id } = req.query || {};

    // Single item query
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

    // List query
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
    console.error('Error fetching QR:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan sistem saat mengambil data QR',
    });
  }
}
