import { getSupabaseClient } from '../../lib/supabase-admin';

export default async function handler(req: any, res: any) {
  const { id } = req.query || {};

  if (!id || typeof id !== 'string') {
    return res.redirect(302, '/');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.redirect(302, `/?scan=${encodeURIComponent(id)}`);
  }

  try {
    const { data: item, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) {
      return res.redirect(302, `/?scan=${encodeURIComponent(id)}&notfound=1`);
    }

    // If QR is already active, direct 302 redirect to the destination URL
    if (item.status === 'aktif' && item.target_url) {
      return res.redirect(302, item.target_url);
    }

    // If QR is empty, redirect to activation page on the frontend
    return res.redirect(302, `/?scan=${encodeURIComponent(id)}`);
  } catch (err) {
    console.error('Redirect handler error:', err);
    return res.redirect(302, `/?scan=${encodeURIComponent(id)}`);
  }
}
