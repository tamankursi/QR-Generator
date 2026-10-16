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

  try {
    const supabase = getSupabase();
    let dbConnected = false;

    if (supabase) {
      const { error } = await supabase.from('qr_codes').select('id').limit(1);
      dbConnected = !error;
    }

    return res.status(200).json({
      status: 'ok',
      storage: dbConnected ? 'supabase' : 'local-memory',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'ok',
      storage: 'local-memory',
      error: err?.message || 'DB check failed',
      timestamp: new Date().toISOString(),
    });
  }
}
