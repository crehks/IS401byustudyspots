// Spam filter for "Report a Spot" submissions. Same Gemini key, models and retry pattern as tag-report.
// Deploy with: supabase functions deploy check-spot-submission   (uses the GEMINI_API_KEY and CRON_SECRET secrets tag-report already has)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { classifySubmission } from './llm.ts';
import { makeHandler, MAX_ATTEMPTS, type Store } from './handler.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const store: Store = {
  async userIdFor(authorization) {
    const token = authorization.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const { data } = await db.auth.getUser(token);
    if (!data?.user) return null;
    const { data: row } = await db.from('User').select('user_id').eq('auth_id', data.user.id).maybeSingle();
    return row?.user_id ?? null;
  },
  async unchecked({ userId, token, olderThanMs, limit, newestFirst }) {
    let q = db.from('SpotSubmission').select('submission_id')
      .eq('status', 'pending').is('ai_checked_at', null).lt('attempts', MAX_ATTEMPTS);
    if (userId !== undefined) q = q.eq('user_id', userId);
    if (token !== undefined) q = q.eq('client_token', token);
    if (olderThanMs) q = q.lt('created_at', new Date(Date.now() - olderThanMs).toISOString());
    const { data } = await q.order('created_at', { ascending: !newestFirst }).limit(limit);
    return (data ?? []).map((r) => Number(r.submission_id));
  },
  async claim(id) {
    const { data: r } = await db.from('SpotSubmission')
      .select('submission_id, spot_name, location_details, building_id, floor_label, spot_type_id, attempts')
      .eq('submission_id', id).eq('status', 'pending').is('ai_checked_at', null).maybeSingle();
    if (!r) return null;
    // Optimistic claim: only one caller can move attempts from n to n+1.
    const { data: won } = await db.from('SpotSubmission').update({ attempts: r.attempts + 1 })
      .eq('submission_id', id).eq('attempts', r.attempts).select('submission_id');
    if (!won?.length) return null;
    return { id, name: r.spot_name, details: r.location_details, buildingId: Number(r.building_id), floor: r.floor_label, typeId: Number(r.spot_type_id), attempts: r.attempts };
  },
  async save(id, patch) {
    const { data, error } = await db.from('SpotSubmission').update(patch)
      .eq('submission_id', id).eq('status', 'pending').is('ai_checked_at', null).select('submission_id');
    return !error && !!data?.length;
  },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// EdgeRuntime.waitUntil lets the sweep of older unchecked reports finish after the student already has their answer.
// deno-lint-ignore no-explicit-any
const edge = (globalThis as any).EdgeRuntime;
const handle = makeHandler({
  store,
  classify: classifySubmission,
  cronSecret: () => Deno.env.get('CRON_SECRET'),
  background: edge?.waitUntil ? (work) => edge.waitUntil(work) : undefined,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const res = await handle(req);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
});
