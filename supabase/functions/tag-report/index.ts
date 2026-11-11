import { createClient } from 'npm:@supabase/supabase-js@2';
import { classify } from './llm.ts';

const MAX_ATTEMPTS = 5;
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function tag(id: number): Promise<string> {
  const { data: row } = await db.from('spot_reports')
    .select('id, body, self_noise, self_crowd, attempts').eq('id', id).eq('status', 'pending').maybeSingle();
  if (!row) return 'skipped';
  await db.from('spot_reports').update({ attempts: row.attempts + 1 }).eq('id', id);
  try {
    const v = await classify(row.body, row.self_noise, row.self_crowd);
    const patch = v.valid
      ? { status: 'approved', noise_level: v.noise, crowd_level: v.crowd, ai_reason: v.reason }
      : { status: 'rejected', noise_level: null, crowd_level: null, ai_reason: v.reason };
    const { error } = await db.from('spot_reports')
      .update({ ...patch, tagged_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
    if (error) throw error;
    return patch.status;
  } catch (e) {
    console.error('tag-report failed, left pending', { id, attempt: row.attempts + 1, error: String(e) });
    return 'pending';
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const res = await handle(req);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));

  if (body.retry === true) {
    const secret = Deno.env.get('CRON_SECRET');
    if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('forbidden', { status: 403 });
    const { data } = await db.from('spot_reports').select('id')
      .eq('status', 'pending').lt('attempts', MAX_ATTEMPTS)
      .lt('created_at', new Date(Date.now() - 60_000).toISOString())
      .order('created_at').limit(10);
    const results: Record<number, string> = {};
    for (const r of data ?? []) results[r.id] = await tag(r.id);
    return Response.json(results);
  }

  const id = Number(body.report_id);
  if (!Number.isInteger(id)) return new Response('report_id required', { status: 400 });
  return Response.json({ id, status: await tag(id) });
}
