import { getSupabaseClient } from '../lib/supabase-admin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabase = getSupabaseClient();
  let dbConnected = false;

  if (supabase) {
    try {
      const { error } = await supabase.from('qr_codes').select('id').limit(1);
      dbConnected = !error;
    } catch {
      dbConnected = false;
    }
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    storage: dbConnected ? 'supabase' : 'local-memory',
    timestamp: new Date().toISOString(),
  });
}
