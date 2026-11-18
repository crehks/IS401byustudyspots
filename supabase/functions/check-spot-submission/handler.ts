// Request logic for check-spot-submission. It talks to the database only through `Store`, so it can be tested without Deno or Supabase.
import type { Submission, Verdict } from './llm.ts';

export const MAX_ATTEMPTS = 8;
export type Row = { id: number; name: string; details: string | null; buildingId: number; floor: string; typeId: number; attempts: number };
export type Store = {
  // The signed-in user's "User".user_id for this Authorization header, or null (guest, anon key, bad token).
  userIdFor(authorization: string): Promise<number | null>;
  // Ids of pending submissions the AI has not checked yet (and that have tries left).
  unchecked(opts: { userId?: number; token?: string; olderThanMs?: number; limit: number; newestFirst: boolean }): Promise<number[]>;
  // Take the row if it is still pending and unchecked; counts the attempt. null = someone else already handled it.
  claim(id: number): Promise<Row | null>;
  save(id: number, patch: { status?: 'rejected'; ai_reason: string; ai_checked_at: string }): Promise<boolean>;
};
export type Deps = { store: Store; classify: (s: Submission) => Promise<Verdict>; cronSecret: () => string | undefined };

const BUILDINGS: Record<number, string> = { 1001: 'Harold B. Lee Library', 1002: 'Wilkinson Student Center', 1003: 'Jesse Knight Building' };
const KINDS: Record<number, string> = { 1001: 'individual study spot', 1002: 'group study room', 1003: 'private study space' };

export type Result = { id: number; status: 'rejected' | 'checked' | 'failed'; reason?: string };

// Ask the model about one submission. Spam -> rejected. Genuine -> still pending, marked as checked (the team approves).
// Any model or database failure leaves the row pending and unchecked, so the retry job tries again.
export async function check(deps: Deps, id: number): Promise<Result | null> {
  const row = await deps.store.claim(id);
  if (!row) return null;
  try {
    const v = await deps.classify({ name: row.name, details: row.details, building: BUILDINGS[row.buildingId] ?? 'BYU campus', floor: row.floor, kind: KINDS[row.typeId] ?? 'study spot' });
    const at = new Date().toISOString();
    const ok = await deps.store.save(id, v.valid ? { ai_reason: v.reason, ai_checked_at: at } : { status: 'rejected', ai_reason: v.reason, ai_checked_at: at });
    if (!ok) throw new Error('save failed');
    return { id, status: v.valid ? 'checked' : 'rejected', reason: v.valid ? undefined : v.reason };
  } catch (e) {
    console.error('check-spot-submission failed, left pending', { id, attempt: row.attempts + 1, error: String(e) });
    return { id, status: 'failed' };
  }
}

const json = (status: number, body: unknown) => Response.json(body, { status });

export function makeHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return json(405, { error: 'POST only' });
    const body = await req.json().catch(() => ({}));

    // Scheduled retry: protected by the same shared secret as tag-report.
    if (body.retry === true) {
      const secret = deps.cronSecret();
      if (!secret || req.headers.get('x-cron-secret') !== secret) return json(403, { error: 'forbidden' });
      const ids = await deps.store.unchecked({ olderThanMs: 60_000, limit: 5, newestFirst: false });
      const results: Result[] = [];
      for (const id of ids) { const r = await check(deps, id); if (r) results.push(r); }
      return json(200, { results });
    }

    // From the report page right after sending: check only the caller's own unchecked submissions, newest first.
    if (body.check === 'mine') {
      const userId = await deps.store.userIdFor(req.headers.get('Authorization') ?? '');
      if (userId === null) return json(401, { error: 'Log in first.' });
      const ids = await deps.store.unchecked({ userId, limit: 3, newestFirst: true });
      const results: Result[] = [];
      for (const id of ids) { const r = await check(deps, id); if (r) results.push(r); }
      return json(200, { results });
    }
    // From the report page for a guest: the browser's random token finds only that browser's own unchecked reports.
    if (body.check === 'token') {
      const token = typeof body.token === 'string' ? body.token : '';
      if (token.length < 16 || token.length > 64) return json(400, { error: 'token required' });
      const ids = await deps.store.unchecked({ token, limit: 3, newestFirst: true });
      const results: Result[] = [];
      for (const id of ids) { const r = await check(deps, id); if (r) results.push(r); }
      return json(200, { results });
    }
    return json(400, { error: 'check or retry required' });
  };
}
