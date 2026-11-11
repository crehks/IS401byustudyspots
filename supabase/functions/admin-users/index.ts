// DEV PAGE. Admin user management behind the admin gate.
// The service-role key comes from Edge Function secrets (SUPABASE_SERVICE_ROLE_KEY) and never reaches the browser.
// The local dev backend (tools/dev-backend.mjs) implements the same contract for testing.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return reply(401, { error: 'Sign in first.' });

  // 1. Ask the database, as the caller, whether this is an unlocked admin.
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: unlocked, error: gateError } = await caller.rpc('is_admin_unlocked');
  if (gateError || unlocked !== true) return reply(403, { error: 'Admin session required. Re-enter your admin code.' });
  const { data: who } = await caller.auth.getUser();
  const selfId = who.user?.id;

  // 2. Only now use the service-role client.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const body = await req.json().catch(() => ({}));
  const roleOf = (u: { app_metadata?: Record<string, unknown> }) => (u.app_metadata?.role === 'admin' ? 'admin' : 'user');
  const isActive = (u: { banned_until?: string | null }) => !u.banned_until || new Date(u.banned_until) < new Date();
  const listAll = async () => (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users;
  const otherActiveAdmins = async (excluding: string) =>
    (await listAll()).filter((u) => u.id !== excluding && roleOf(u) === 'admin' && isActive(u)).length;
  // Reports and submissions reference the user without cascade, so a hard delete would fail midway. Say so up front.
  const ownsRecords = async (authId: string) => {
    const { data: profile } = await admin.from('User').select('user_id').eq('auth_id', authId).maybeSingle();
    if (!profile) return false;
    for (const table of ['ReportSpotStatus', 'SpotSubmission']) {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('user_id', profile.user_id);
      if ((count ?? 0) > 0) return true;
    }
    return false;
  };
  const cleanName = (value: unknown) => String(value ?? '').trim().slice(0, 60);

  switch (body.action) {
    case 'list': {
      const users = (await listAll()).map((u) => ({
        id: u.id, email: u.email, role: roleOf(u), email_confirmed_at: u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at, created_at: u.created_at, disabled: !isActive(u),
      }));
      return reply(200, { users });
    }
    case 'create': {
      const { email, password, role = 'user' } = body;
      if (!EMAIL.test(email ?? '')) return reply(400, { error: 'Enter a valid email address.' });
      if (String(password ?? '').length < 8) return reply(400, { error: 'Password must be at least 8 characters.' });
      if (!['admin', 'user'].includes(role)) return reply(400, { error: 'Role must be admin or user.' });
      // first_name/last_name feed the database trigger that creates the main-site profile for the new account.
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, app_metadata: role === 'admin' ? { role: 'admin' } : {},
        user_metadata: { first_name: cleanName(body.first_name), last_name: cleanName(body.last_name) },
      });
      if (error) return reply(/already/i.test(error.message) ? 409 : 400, { error: /already/i.test(error.message) ? 'That email already has an account.' : 'Could not create the user.' });
      return reply(201, { user: { id: data.user.id, email: data.user.email } });
    }
    case 'update':
    case 'delete': {
      const id = String(body.id ?? '');
      const { data: found } = await admin.auth.admin.getUserById(id);
      const target = found?.user;
      if (!target) return reply(404, { error: 'User not found.' });
      const wasActiveAdmin = roleOf(target) === 'admin' && isActive(target);
      if (body.action === 'delete') {
        if (id === selfId) return reply(400, { error: 'You cannot delete your own account.' });
        if (wasActiveAdmin && (await otherActiveAdmins(id)) < 1) return reply(400, { error: 'You cannot remove the last admin.' });
        if (await ownsRecords(id)) return reply(409, { error: 'This account has reports or submissions, so it cannot be deleted. Disable it instead.' });
        const { error } = await admin.auth.admin.deleteUser(id);
        return error ? reply(400, { error: 'Could not delete the user.' }) : reply(200, { ok: true });
      }
      const nextRole = body.role ?? roleOf(target);
      const nextDisabled = body.disabled ?? !isActive(target);
      if (!['admin', 'user'].includes(nextRole)) return reply(400, { error: 'Role must be admin or user.' });
      if (id === selfId && (nextRole !== 'admin' || nextDisabled)) return reply(400, { error: 'You cannot demote or disable yourself.' });
      if (wasActiveAdmin && (nextRole !== 'admin' || nextDisabled) && (await otherActiveAdmins(id)) < 1) return reply(400, { error: 'You cannot remove the last admin.' });
      if (body.email !== undefined && !EMAIL.test(body.email)) return reply(400, { error: 'Enter a valid email address.' });
      if (body.password !== undefined && String(body.password).length < 8) return reply(400, { error: 'Password must be at least 8 characters.' });
      const attrs: Record<string, unknown> = {
        app_metadata: { ...target.app_metadata, role: nextRole === 'admin' ? 'admin' : undefined },
        ban_duration: nextDisabled ? '876000h' : 'none',
      };
      if (body.email !== undefined) attrs.email = body.email;
      if (body.password) attrs.password = body.password;
      const { error } = await admin.auth.admin.updateUserById(id, attrs);
      return error ? reply(400, { error: 'Could not update the user.' }) : reply(200, { ok: true });
    }
    default:
      return reply(400, { error: 'Unknown action.' });
  }
});
