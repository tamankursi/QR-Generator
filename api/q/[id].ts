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
  const { id } = req.query || {};

  if (!id || typeof id !== 'string') {
    return res.redirect(302, '/');
  }

  const supabase = getSupabase();
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

    if (item.status === 'aktif' && item.target_url) {
      return res.redirect(302, item.target_url);
    }

    return res.redirect(302, `/?scan=${encodeURIComponent(id)}`);
  } catch (err) {
    console.error('Redirect handler error:', err);
    return res.redirect(302, `/?scan=${encodeURIComponent(id)}`);
  }
}
