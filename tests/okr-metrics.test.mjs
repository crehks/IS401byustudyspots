// Runs the real OKR migration on in-memory Postgres (PGlite). Never touches Supabase.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
let pg;
const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', C = '00000000-0000-4000-8000-00000000000c';
const ADMIN = '00000000-0000-4000-8000-0000000000ad';
const adminClaims = {sub: ADMIN, role: 'authenticated', app_metadata: {role: 'admin'}};
const call = () => pg.query('select public.okr_metrics() as m').then(r => r.rows[0].m);
// The numbers are admin-only, so read them the way the page does: signed in as an admin with an unlocked session.
async function metrics() {
  await pg.exec(`insert into auth.users (id, email, encrypted_password, raw_app_meta_data) values ('${ADMIN}', 'admin@test', 'x', '{"role":"admin"}') on conflict do nothing;
    insert into public.admin_sessions (user_id, expires_at) values ('${ADMIN}', now() + interval '1 hour') on conflict (user_id) do update set expires_at = excluded.expires_at`);
  return as('authenticated', adminClaims, call);
}
const ago = interval => `now() - interval '${interval}'`;

// Run statements as an API role, always restoring the owner role afterwards.
async function as(role, claims, fn) {
  await pg.exec(`set role ${role}`);
  if (claims) await pg.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
  try { return await fn(); } finally { await pg.exec("reset role; select set_config('request.jwt.claims', '', false)"); }
}
const denied = promise => assert.rejects(promise, /permission denied|row-level security|Admin access required/i);

before(async () => {
  pg = await PGlite.create({extensions: {pgcrypto}});
  await pg.exec(await read('tools/dev/schema.sql'));
  await pg.exec(await read('supabase/migrations/dev-page/20261111_001_admin_gate.sql'));
  // Make the stub tables look like the live ones the migration extends.
  await pg.exec(`
    alter table public.spot_reports add column user_id uuid, add column status text not null default 'pending', add column created_at timestamptz not null default now();
    revoke all on public.spot_reports, public."ReportSpotStatus" from anon, authenticated;
    grant select on public.spot_reports to authenticated;
    grant insert (space_id, body, self_noise, self_crowd) on public.spot_reports to authenticated;
    grant insert (spot_id, noise_level, crowd_level, notes) on public."ReportSpotStatus" to anon, authenticated;
    grant insert (user_id) on public."ReportSpotStatus" to authenticated;
    create policy spot_reports_insert_own on public.spot_reports for insert to authenticated with check (user_id = (select auth.uid()));
    alter table public.spot_reports alter column user_id set default auth.uid();
    alter table public."ReportSpotStatus" alter column user_id set default 1001;
    insert into public."StudySpot" (spot_id, reservable) values (1001, false);
  `);
  const migration = await read('supabase/migrations/20261114_001_okr_tracking.sql');
  await pg.exec(migration);
  await pg.exec(migration); // idempotent
});
after(async () => { await pg.close(); });

async function reset() {
  await pg.exec(`truncate public.user_visits, public.spot_choice_events, public.spot_reports, public."ReportSpotStatus", public."User", auth.users restart identity cascade`);
}
async function addUser(authId, email) {
  if (authId) await pg.query("insert into auth.users (id, email, encrypted_password) values ($1, $2, 'x')", [authId, email]);
  return (await pg.query('insert into public."User" (auth_id, first_name) values ($1, $2) returning user_id', [authId, email || 'guest'])).rows[0].user_id;
}

test('no data: every metric is zero and nothing divides by zero', async () => {
  await reset();
  const m = await metrics();
  assert.deepEqual(m.o1k1, {available: 0, answered: 0, pct: 0});
  assert.deepEqual(m.o1k2, {avg_seconds: null, n: 0, progress_pct: 0});
  assert.deepEqual(m.o2k1, {users: 0, registered: 0, pct: 0});
  assert.deepEqual(m.o2k2, {users: 0, registered: 0, pct: 0});
  assert.ok(Date.parse(m.generated_at) > 0);
});

test('O1-KR1 counts guest and signed-in answers and ignores unanswered reports', async () => {
  await reset();
  await pg.exec(`insert into public."ReportSpotStatus" (spot_id, user_id, noise_level, crowd_level, was_available) values (1001,1001,1,1,true),(1001,1001,1,1,false),(1001,1001,1,1,null)`);
  await pg.exec(`insert into public.spot_reports (space_id, user_id, was_available) values (1001,'${A}',true),(1001,'${A}',null)`);
  const {o1k1} = await metrics();
  assert.deepEqual(o1k1, {available: 2, answered: 3, pct: 66.7});
});

test('O1-KR2 averages seconds and the progress is inverse and clamped', async () => {
  await reset();
  await pg.exec('insert into public.spot_choice_events (seconds) values (60), (120)');
  assert.deepEqual((await metrics()).o1k2, {avg_seconds: 90, n: 2, progress_pct: 75});
  await pg.exec('truncate public.spot_choice_events; insert into public.spot_choice_events (seconds) values (10)');
  assert.equal((await metrics()).o1k2.progress_pct, 100);
  await pg.exec('truncate public.spot_choice_events; insert into public.spot_choice_events (seconds) values (600)');
  assert.equal((await metrics()).o1k2.progress_pct, 0);
});

test('O2 metrics: partial data, 14-day window edges, guest exclusion', async () => {
  await reset();
  const u1 = await addUser(A, 'a@test'), u2 = await addUser(B, 'b@test'), u3 = await addUser(C, 'c@test'), guest = await addUser(null);
  // u1: two visits inside the window. u2: one inside, one just outside. u3: none. guest: two (must not count).
  await pg.exec(`insert into public.user_visits (user_id, visited_at) values
    (${u1}, ${ago('1 day')}), (${u1}, ${ago('13 days 23 hours')}),
    (${u2}, ${ago('1 day')}), (${u2}, ${ago('14 days 1 hour')}),
    (${guest}, ${ago('1 day')}), (${guest}, ${ago('2 days')})`);
  // Reports: u1 has two (any status counts); u2 has one inside and one outside; u3 none.
  await pg.exec(`insert into public.spot_reports (space_id, user_id, status, created_at) values
    (1001,'${A}','rejected',${ago('2 days')}), (1001,'${A}','approved',${ago('13 days 23 hours')}),
    (1001,'${B}','approved',${ago('2 days')}), (1001,'${B}','approved',${ago('14 days 1 hour')})`);
  const m = await metrics();
  assert.deepEqual(m.o2k1, {users: 1, registered: 3, pct: 33.3});
  assert.deepEqual(m.o2k2, {users: 1, registered: 3, pct: 33.3});
  // Becoming the second recent visit / report lifts the numbers.
  await pg.exec(`insert into public.user_visits (user_id) values (${u2}); insert into public.spot_reports (space_id, user_id) values (1001,'${B}')`);
  const next = await metrics();
  assert.equal(next.o2k1.users, 2);
  assert.equal(next.o2k2.users, 2);
  assert.equal(u3 > 0, true);
});

test('record_visit: sign-ins always count, returns need a 30 minute gap, refreshes do not count', async () => {
  await reset();
  const id = await addUser(A, 'a@test');
  const member = {sub: A, role: 'authenticated', app_metadata: {}};
  const visit = flag => as('authenticated', member, () => pg.query('select public.record_visit($1)', [flag]));
  const count = async () => Number((await pg.query('select count(*)::int n from public.user_visits where user_id=$1', [id])).rows[0].n);
  await visit(true);
  assert.equal(await count(), 1, 'sign-in');
  await visit(false);
  await visit(true);
  assert.equal(await count(), 1, 'page refresh and a double-clicked login inside the gap');
  await pg.exec(`update public.user_visits set visited_at = now() - interval '2 minutes'`);
  await visit(true);
  assert.equal(await count(), 2, 'logging out and back in again counts');
  await pg.exec(`update public.user_visits set visited_at = now() - interval '10 minutes'`);
  await visit(false);
  assert.equal(await count(), 2, 'returning after only 10 minutes is the same visit');
  await pg.exec(`update public.user_visits set visited_at = now() - interval '31 minutes'`);
  await visit(false);
  assert.equal(await count(), 3, 'a returning user who stayed logged in counts after 30+ minutes away');
  // A caller with no linked User row, or no login at all, records nothing and cannot write for someone else.
  await as('authenticated', {sub: '00000000-0000-4000-8000-0000000000ee', role: 'authenticated', app_metadata: {}}, () => pg.query('select public.record_visit(true)'));
  await as('anon', null, () => denied(pg.query('select public.record_visit(true)')));
  assert.equal(Number((await pg.query('select count(*)::int n from public.user_visits')).rows[0].n), 3);
});

test('anon and authenticated cannot read or write raw event and visit rows', async () => {
  await reset();
  const id = await addUser(A, 'a@test');
  await pg.exec(`insert into public.user_visits (user_id) values (${id}); insert into public.spot_choice_events (seconds) values (45)`);
  for (const [role, claims] of [['anon', null], ['authenticated', {sub: A, role: 'authenticated'}]]) {
    await as(role, claims, async () => {
      await denied(pg.query('select * from public.spot_choice_events'));
      await denied(pg.query('select * from public.user_visits'));
      await denied(pg.query('select seconds from public.spot_choice_events'));
      await denied(pg.query('update public.spot_choice_events set seconds = 1'));
      await denied(pg.query('delete from public.spot_choice_events'));
      await denied(pg.query(`insert into public.user_visits (user_id) values (${id})`));
      await denied(pg.query('insert into public.spot_choice_events (created_at, seconds) values (now(), 30)'));
    });
  }
});

test('anon and authenticated can insert a choice event within bounds', async () => {
  await reset();
  for (const [role, claims] of [['anon', null], ['authenticated', {sub: A, role: 'authenticated'}]]) {
    await as(role, claims, async () => {
      await pg.query('insert into public.spot_choice_events (seconds) values (42)');
      await assert.rejects(pg.query('insert into public.spot_choice_events (seconds) values (0)'), /check constraint/);
      await assert.rejects(pg.query('insert into public.spot_choice_events (seconds) values (3601)'), /check constraint/);
    });
    await pg.exec('truncate public.spot_choice_events');
  }
});

test('okr_metrics is admin-only: anon, members, locked admins and expired sessions are refused', async () => {
  await reset();
  await pg.exec(`insert into auth.users (id, email, encrypted_password, raw_app_meta_data) values ('${ADMIN}', 'admin@test', 'x', '{"role":"admin"}'), ('${A}', 'a@test', 'x', '{}') on conflict do nothing`);
  await pg.exec(`delete from public.admin_sessions`);
  await as('anon', null, () => denied(call()));
  await as('authenticated', {sub: A, role: 'authenticated', app_metadata: {}}, () => denied(call()));
  // Admin role but the code has not been entered: no unlocked session.
  await as('authenticated', adminClaims, () => denied(call()));
  // A session row alone is not enough without the admin role in the token.
  await pg.exec(`insert into public.admin_sessions (user_id, expires_at) values ('${A}', now() + interval '1 hour')`);
  await as('authenticated', {sub: A, role: 'authenticated', app_metadata: {}}, () => denied(call()));
  // Expired admin session.
  await pg.exec(`insert into public.admin_sessions (user_id, expires_at) values ('${ADMIN}', now() - interval '1 minute')`);
  await as('authenticated', adminClaims, () => denied(call()));
  // Unlocked admin session works.
  await pg.exec(`update public.admin_sessions set expires_at = now() + interval '1 hour' where user_id = '${ADMIN}'`);
  assert.equal((await as('authenticated', adminClaims, call)).o1k1.answered, 0);
});

test('was_available can be set by the roles that can already report; other columns stay locked', async () => {
  await reset();
  await as('anon', null, () => pg.query('insert into public."ReportSpotStatus" (spot_id, noise_level, crowd_level, notes, was_available) values (1001,1,1,\'\',true)'));
  const uid = await addUser(A, 'a@test');
  await as('authenticated', {sub: A, role: 'authenticated'}, async () => {
    await pg.query(`insert into public."ReportSpotStatus" (spot_id, user_id, noise_level, crowd_level, notes, was_available) values (1001,${uid},1,1,'',false)`);
    await pg.query('insert into public.spot_reports (space_id, body, self_noise, self_crowd, was_available) values (1001, \'x\', \'low\', \'low\', true)');
    await denied(pg.query("insert into public.spot_reports (space_id, body, status, was_available) values (1001, 'x', 'approved', true)"));
  });
  assert.deepEqual((await metrics()).o1k1, {available: 2, answered: 3, pct: 66.7});
});
