// Auth matrix for the dev page: anon, normal user, admin locked, admin unlocked, admin expired, lockout.
// Runs the real migration SQL on PGlite through the local dev backend. Never touches Supabase.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBackend} from '../tools/dev-backend.mjs';

let backend, base;
const call = async (path, {method = 'GET', body, token, headers = {}} = {}) => {
  const response = await fetch(base + path, {method, headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {}), ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
  const text = await response.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return {status: response.status, json, headers: response.headers};
};
const login = async (email, password) => (await call('/auth/v1/token?grant_type=password', {method: 'POST', body: {email, password}})).json;
const unlock = (token, code) => call('/rest/v1/rpc/unlock_admin', {method: 'POST', token, body: {code}});
const insertType = (token, name) => call('/rest/v1/SpotType', {method: 'POST', token, headers: {Prefer: 'return=representation'}, body: {type_name: name}});
const ADMIN = ['admin@nook.test', 'DevAdmin#2026'], CODE = '314159', MEMBER = ['member@nook.test', 'DevMember#2026'];

before(async () => { backend = await createBackend({port: 0}); base = `http://127.0.0.1:${backend.port}`; });
after(async () => { await backend.close(); });

test('anon cannot write or call admin functions', async () => {
  assert.ok([401, 403].includes((await insertType(null, 'anon-attempt')).status));
  assert.equal((await call('/rest/v1/rpc/unlock_admin', {method: 'POST', body: {code: CODE}})).status, 401);
  assert.deepEqual((await call('/rest/v1/admin_codes')).json, []);
});

test('wrong password gives invalid_credentials', async () => {
  const result = await login(ADMIN[0], 'nope-nope-nope');
  assert.equal(result.error_code, 'invalid_credentials');
});

test('normal user: unlock fails and writes are rejected', async () => {
  const member = await login(...MEMBER);
  assert.equal((await unlock(member.access_token, CODE)).json, false);
  assert.equal((await call('/rest/v1/rpc/is_admin_unlocked', {method: 'POST', token: member.access_token, body: {}})).json, false);
  assert.equal((await insertType(member.access_token, 'member-attempt')).status, 403);
});

test('admin before unlocking is rejected; wrong code fails; right code opens writes', async () => {
  const admin = await login(...ADMIN);
  assert.equal((await insertType(admin.access_token, 'locked-attempt')).status, 403);
  assert.equal((await unlock(admin.access_token, '000000')).json, false);
  assert.equal((await unlock(admin.access_token, CODE)).json, true);
  const created = await insertType(admin.access_token, 'Test type');
  assert.equal(created.status, 201);
  const id = created.json[0].spot_type_id;
  const patched = await call(`/rest/v1/SpotType?spot_type_id=eq.${id}`, {method: 'PATCH', token: admin.access_token, headers: {Prefer: 'return=representation'}, body: {type_name: 'Renamed'}});
  assert.equal(patched.json[0].type_name, 'Renamed');
  const read = await call(`/rest/v1/SpotType?spot_type_id=eq.${id}`, {token: admin.access_token});
  assert.equal(read.json.length, 1);
  const removed = await call(`/rest/v1/SpotType?spot_type_id=eq.${id}`, {method: 'DELETE', token: admin.access_token, headers: {Prefer: 'return=representation'}});
  assert.equal(removed.json.length, 1);
});

test('lock_admin ends the session; an expired session is rejected', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  assert.equal((await insertType(admin.access_token, 'before-lock')).status, 201);
  await call('/rest/v1/rpc/lock_admin', {method: 'POST', token: admin.access_token, body: {}});
  assert.equal((await insertType(admin.access_token, 'after-lock')).status, 403);
  await unlock(admin.access_token, CODE);
  await backend.pg.query("update public.admin_sessions set expires_at = now() - interval '1 minute'");
  assert.equal((await insertType(admin.access_token, 'expired')).status, 403);
  assert.equal((await call('/rest/v1/rpc/is_admin_unlocked', {method: 'POST', token: admin.access_token, body: {}})).json, false);
});

test('five wrong codes lock the account even for the right code', async () => {
  await backend.pg.query("insert into auth.users (email, encrypted_password, raw_app_meta_data, email_confirmed_at) values ('second@nook.test', extensions.crypt('SecondPass#2026', extensions.gen_salt('bf')), '{\"role\":\"admin\"}', now())");
  await backend.pg.query("insert into public.admin_codes (user_id, code_hash) select id, extensions.crypt('271828', extensions.gen_salt('bf')) from auth.users where email='second@nook.test'");
  const second = await login('second@nook.test', 'SecondPass#2026');
  for (let i = 0; i < 5; i++) assert.equal((await unlock(second.access_token, 'wrong' + i)).json, false);
  assert.equal((await unlock(second.access_token, '271828')).json, false);
  await backend.pg.query("update public.admin_codes set locked_until = now() - interval '1 second' where locked_until is not null");
  assert.equal((await unlock(second.access_token, '271828')).json, true);
});

test('coordinates outside the Provo box are rejected by the database', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  const base_ = {building_name: 'Pin test'};
  const bad = await call('/rest/v1/Buildings', {method: 'POST', token: admin.access_token, body: {...base_, lat: 41.5, lng: -111.65}});
  assert.equal(bad.status, 409);
  const half = await call('/rest/v1/Buildings', {method: 'POST', token: admin.access_token, body: {...base_, lat: 40.25}});
  assert.equal(half.status, 409);
  const good = await call('/rest/v1/Buildings', {method: 'POST', token: admin.access_token, body: {...base_, lat: 40.25, lng: -111.65}});
  assert.equal(good.status, 204);
});

test('floor-plan pin columns are validated by the database', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  const spot = extra => call('/rest/v1/StudySpot', {method: 'POST', token: admin.access_token, body: {spot_location: 'Plan test', building_id: 1, ...extra}});
  assert.equal((await spot({plan_key: 'L1', plan_x: 120, plan_y: 5})).status, 409);
  assert.equal((await spot({plan_key: 'L1', plan_x: 10})).status, 409);
  assert.equal((await spot({plan_x: 10, plan_y: 10})).status, 409);
  assert.equal((await spot({plan_key: 'L1', plan_x: 10.5, plan_y: 42.25})).status, 409);
  const full = {floor_id: 1, spot_type_id: 1, capacity: 4, group_type: 'group', outlets: true, reservable: false, is_private: false, noise_level: 'low'};
  assert.equal((await spot({...full, noise_level: null, plan_key: 'L1', plan_x: 10.5, plan_y: 42.25})).status, 409);
  assert.equal((await spot({...full, noise_level: 'loud', plan_key: 'L1', plan_x: 10.5, plan_y: 42.25})).status, 409);
  for (const missing of ['capacity', 'group_type', 'spot_type_id', 'outlets', 'reservable', 'is_private']) assert.equal((await spot({...full, [missing]: null, plan_key: 'L1', plan_x: 10.5, plan_y: 42.25})).status, 409, `missing ${missing}`);
  assert.equal((await spot({...full, plan_key: 'L1', plan_x: 10.5, plan_y: 42.25, capacity: 20})).status, 409);
  assert.equal((await spot({...full, plan_key: 'L1', plan_x: 10.5, plan_y: 42.25})).status, 204);
  const gone = await call('/rest/v1/StudySpot?spot_location=eq.Plan%20test&plan_key=eq.L1', {method: 'PATCH', token: admin.access_token, headers: {Prefer: 'return=representation'}, body: {deleted_at: new Date().toISOString()}});
  assert.ok(gone.json[0].deleted_at);
});

test('floors are locked: no delete or re-key through the API, adding still works', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  const req = (path, method, body) => call(path, {method, token: admin.access_token, headers: {Prefer: 'return=representation'}, body});
  const floors = (await call('/rest/v1/Floors?order=floor_id.asc&limit=1', {token: admin.access_token})).json;
  const id = floors[0].floor_id;
  // Lock 1: the API role has no UPDATE/DELETE privilege on Floors at all.
  assert.equal((await req(`/rest/v1/Floors?floor_id=eq.${id}`, 'DELETE')).status, 403);
  assert.equal((await req(`/rest/v1/Floors?floor_id=eq.${id}`, 'PATCH', {floor_number: 99})).status, 403);
  // Lock 2: even a privileged path hits the trigger, until the owner sets the override inside a transaction.
  await assert.rejects(() => backend.pg.query(`delete from public."Floors" where floor_id = ${id}`), /locked/i);
  await assert.rejects(() => backend.pg.query(`update public."Floors" set floor_number = 99 where floor_id = ${id}`), /locked/i);
  await backend.pg.exec(`begin; set local nook.allow_floor_change = 'on'; update public."Floors" set floor_number = floor_number where floor_id = ${id}; rollback;`);
  const added = await req('/rest/v1/Floors', 'POST', {building_id: 1, floor_number: 7});
  assert.equal(added.status, 201);
  assert.equal((await call(`/rest/v1/Floors?floor_id=eq.${id}`, {token: admin.access_token})).json.length, 1);
});

test('resource pins need every detail and a valid position', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  const res = extra => call('/rest/v1/Resources', {method: 'POST', token: admin.access_token, body: {building_id: 1, floor_id: 1, ...extra}});
  const full = {resource_type_id: 1, resource_info: 'Printer', resource_location: 'By the stairs'};
  assert.equal((await res({...full, plan_key: 'L1', plan_x: 10})).status, 409);
  assert.equal((await res({plan_key: 'L1', plan_x: 10, plan_y: 10, resource_info: 'Printer'})).status, 409);
  assert.equal((await res({...full, plan_key: 'L1', plan_x: 10, plan_y: 140})).status, 409);
  assert.equal((await res({...full, plan_key: 'L1', plan_x: 10, plan_y: 20})).status, 204);
});

test('admin-users function: 403 unless unlocked admin, with self and password guards', async () => {
  const member = await login(...MEMBER);
  assert.equal((await call('/functions/v1/admin-users', {method: 'POST', token: member.access_token, body: {action: 'list'}})).status, 403);
  assert.equal((await call('/functions/v1/admin-users', {method: 'POST', body: {action: 'list'}})).status, 401);
  const admin = await login(...ADMIN);
  await call('/rest/v1/rpc/lock_admin', {method: 'POST', token: admin.access_token, body: {}});
  assert.equal((await call('/functions/v1/admin-users', {method: 'POST', token: admin.access_token, body: {action: 'list'}})).status, 403);
  await unlock(admin.access_token, CODE);
  const fn = body => call('/functions/v1/admin-users', {method: 'POST', token: admin.access_token, body});
  const list = await fn({action: 'list'});
  assert.equal(list.status, 200);
  assert.ok(list.json.users.every(u => !('encrypted_password' in u) && !('password' in u)));
  const me = list.json.users.find(u => u.email === ADMIN[0]);
  assert.equal((await fn({action: 'delete', id: me.id})).status, 400);
  assert.equal((await fn({action: 'update', id: me.id, role: 'user'})).status, 400);
  assert.equal((await fn({action: 'create', email: 'not-an-email', password: 'longenough1'})).status, 400);
  assert.equal((await fn({action: 'create', email: 'new@nook.test', password: 'short'})).status, 400);
  const created = await fn({action: 'create', email: 'new@nook.test', password: 'NewUser#2026', role: 'user'});
  assert.equal(created.status, 201);
  assert.equal((await fn({action: 'create', email: 'new@nook.test', password: 'NewUser#2026'})).status, 409);
  assert.equal((await fn({action: 'update', id: created.json.user.id, role: 'admin'})).status, 200);
  assert.equal((await fn({action: 'delete', id: created.json.user.id})).status, 200);
});

test('admin-users: names reach the profile; users with reports cannot be deleted, only disabled', async () => {
  const admin = await login(...ADMIN);
  await unlock(admin.access_token, CODE);
  const fn = body => call('/functions/v1/admin-users', {method: 'POST', token: admin.access_token, body});
  const made = await fn({action: 'create', email: 'named@nook.test', password: 'Named#2026pw', first_name: 'Ada', last_name: 'Lovelace'});
  assert.equal(made.status, 201);
  const profile = (await backend.pg.query('select first_name, last_name from public."User" where auth_id = $1', [made.json.user.id])).rows[0];
  assert.deepEqual(profile, {first_name: 'Ada', last_name: 'Lovelace'});
  await backend.pg.query('insert into public."ReportSpotStatus" (spot_id, user_id, noise_level, crowd_level) select 1, user_id, 1, 1 from public."User" where auth_id = $1', [made.json.user.id]);
  const blocked = await fn({action: 'delete', id: made.json.user.id});
  assert.equal(blocked.status, 409);
  assert.match(blocked.json.error, /Disable it instead/);
  assert.equal((await fn({action: 'update', id: made.json.user.id, disabled: true})).status, 200);
  const cleanUser = await fn({action: 'create', email: 'plain@nook.test', password: 'Plain#2026pw'});
  assert.equal((await fn({action: 'delete', id: cleanUser.json.user.id})).status, 200);
  assert.equal((await backend.pg.query('select count(*)::int n from public."User" where auth_id = $1', [cleanUser.json.user.id])).rows[0].n, 0);
});

test('no privileged key appears in browser-facing dev page files', async () => {
  for (const file of ['admin.html', 'admin.js', 'admin.css', 'supabase-config.js']) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(!/service_role|sb_secret_|SERVICE_ROLE/i.test(text), `${file} must not reference a service-role key`);
  }
});
