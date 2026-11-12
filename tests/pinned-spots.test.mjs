// Main site <-> dev page link: what the public key can read, how the app maps pinned rows, and the admin menu flag.
// Runs against the local dev backend (PGlite). Never touches Supabase.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createBackend} from '../tools/dev-backend.mjs';
import '../database.js';
import '../auth.js';

let backend, base;
const PUBLIC = {apikey: 'sb_publishable_local_dev_only', 'Content-Type': 'application/json'};
const call = async (path, {method = 'GET', body, token, headers = {}} = {}) => {
  const response = await fetch(base + path, {method, headers: {...PUBLIC, ...(token ? {Authorization: `Bearer ${token}`} : {}), ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
  const text = await response.text();
  return {status: response.status, json: text ? JSON.parse(text) : null};
};
let admin;

before(async () => {
  backend = await createBackend({port: 0});
  base = `http://127.0.0.1:${backend.port}`;
  const login = await call('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: 'admin@nook.test', password: 'DevAdmin#2026'}});
  admin = login.json.access_token;
  await call('/rest/v1/rpc/unlock_admin', {method: 'POST', token: admin, body: {code: '314159'}});
  const spot = extra => call('/rest/v1/StudySpot', {method: 'POST', token: admin, body: {building_id: 1, floor_id: 1, spot_type_id: 1, capacity: 4, group_type: 'group', outlets: true, reservable: false, is_private: false, noise_level: 'low', ...extra}});
  const resource = extra => call('/rest/v1/Resources', {method: 'POST', token: admin, body: {building_id: 2, floor_id: 4, resource_type_id: 1, resource_info: 'Printer', resource_location: 'By the stairs', ...extra}});
  await spot({spot_location: 'Pinned spot', plan_key: 'L3', plan_x: 40, plan_y: 55});
  await spot({spot_location: 'Deleted spot', plan_key: 'L3', plan_x: 10, plan_y: 10, deleted_at: new Date().toISOString()});
  await spot({spot_location: 'Unpinned spot'});
  await resource({plan_key: '1E', plan_x: 20, plan_y: 30});
  await resource({resource_info: 'Deleted printer', plan_key: '1E', plan_x: 5, plan_y: 5, deleted_at: new Date().toISOString()});
  await resource({resource_info: 'Unpinned printer'});
});
after(async () => { await backend.close(); });

test('the public key sees only live, pinned resources', async () => {
  const rows = (await call('/rest/v1/Resources?select=resource_info')).json;
  assert.deepEqual(rows.map(r => r.resource_info), ['Printer']);
  assert.ok((await call('/rest/v1/ResourceType?select=resource_name')).json.length > 0);
});

test('the main site maps pinned rows to spots and resources, skipping deleted and unpinned ones', async () => {
  const db = new globalThis.StudyDatabase();
  db.config = {configured: true, url: base, key: PUBLIC.apikey, table: 'ReportSpotStatus'};
  await db.loadPinned();
  assert.equal(db.pinnedSpots.length, 1);
  const [spot] = db.pinnedSpots;
  assert.equal(spot.name, 'Pinned spot');
  assert.equal(spot.building, 'HBLL');
  assert.equal(spot.floor, 'L3');
  assert.deepEqual(spot.pin, [40, 55]);
  assert.equal(spot.type, 'group');
  assert.equal(spot.noise, 'low');
  assert.equal(db.pinnedResources.length, 1);
  assert.equal(db.pinnedResources[0].building, 'WSC');
  assert.equal(db.pinnedResources[0].type, 'Printer');
  assert.deepEqual(db.pinnedResources[0].pin, [20, 30]);
});

test('report and favorites ids: sample spots keep their numbers, pinned spots use their own', async () => {
  const db = new globalThis.StudyDatabase();
  assert.equal(db.numericOf('hbll-commons'), 1001);
  assert.equal(db.numericOf('jkb-group'), 1025);
  assert.equal(db.numericOf('db-42'), 42);
  assert.equal(db.numericOf('nope'), 0);
  assert.equal(db.spotOf(1001), 'hbll-commons');
  db.pinnedIds = new Set([42]);
  assert.equal(db.spotOf(42), 'db-42');
  assert.equal(db.spotOf(1001), 'hbll-commons');
});

test('a database without the pin columns leaves the sample spots in place', async () => {
  const db = new globalThis.StudyDatabase(async () => new Response(JSON.stringify({code: '42703', message: 'column does not exist'}), {status: 400}));
  db.config = {configured: true, url: 'http://x.test', key: PUBLIC.apikey, table: 'ReportSpotStatus'};
  await assert.rejects(() => db.loadPinned());
  assert.deepEqual(db.pinnedSpots, []);
  assert.deepEqual(db.pinnedResources, []);
});

test('admin menu flag comes from the sign-in token role', () => {
  const token = role => `h.${Buffer.from(JSON.stringify({app_metadata: role ? {role} : {}})).toString('base64url')}.s`;
  const make = role => { const auth = new globalThis.StudyAuth({config: {}}, {getItem() { return null; }, setItem() {}, removeItem() {}}); auth.session = {access_token: token(role)}; return auth; };
  assert.equal(make('admin').isAdmin, true);
  assert.equal(make(null).isAdmin, false);
  assert.equal(make('user').isAdmin, false);
  const none = new globalThis.StudyAuth({config: {}}, {getItem() { return null; }, setItem() {}, removeItem() {}});
  assert.equal(none.isAdmin, false);
});

const can = async (role, table, privilege) => (await backend.pg.query(`select has_table_privilege('${role}', 'public."${table}"', '${privilege}') as ok`)).rows[0].ok;

test('admin CRUD privileges are granted, unneeded ones are revoked', async () => {
  for (const table of ['Buildings', 'StudySpot', 'SpotType']) for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) assert.equal(await can('authenticated', table, privilege), true, `${table} ${privilege}`);
  assert.equal(await can('authenticated', 'Floors', 'SELECT'), true);
  assert.equal(await can('authenticated', 'Floors', 'INSERT'), true);
  assert.equal(await can('authenticated', 'Floors', 'UPDATE'), false);
  assert.equal(await can('authenticated', 'Floors', 'DELETE'), false);
  for (const table of ['Resources', 'ResourceType', 'BuildingHours']) {
    for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) assert.equal(await can('anon', table, privilege), false, `anon ${table} ${privilege}`);
    assert.equal(await can('authenticated', table, 'TRUNCATE'), false, `authenticated ${table} TRUNCATE`);
    assert.equal(await can('authenticated', table, 'DELETE'), true, `authenticated ${table} DELETE`);
  }
  assert.equal(await can('anon', 'Buildings', 'SELECT'), true);
  assert.equal(await can('anon', 'Buildings', 'INSERT'), false);
});

test('guests can report pinned spots; unpinned, deleted and reservable ones stay closed; sample ids still work', async () => {
  const id = async name => (await backend.pg.query('select spot_id from public."StudySpot" where spot_location = $1', [name])).rows[0].spot_id;
  const report = spot_id => call('/rest/v1/ReportSpotStatus', {method: 'POST', body: {spot_id, user_id: 1001, noise_level: 1, crowd_level: 2, notes: 'test'}});
  assert.equal((await report(await id('Pinned spot'))).status, 204);
  assert.equal((await report(await id('Unpinned spot'))).status, 403);
  assert.equal((await report(await id('Deleted spot'))).status, 403);
  // A pinned spot that is reservable cannot be crowd-reported, same rule as the sample spots.
  await backend.pg.query(`insert into public."StudySpot" (spot_location, building_id, floor_id, spot_type_id, capacity, group_type, outlets, reservable, is_private, noise_level, plan_key, plan_x, plan_y) values ('Bookable room', 1, 1, 1, 6, 'group', true, true, true, 'low', 'L3', 50, 50)`);
  assert.equal((await report(await id('Bookable room'))).status, 403);
  // An old sample id (1001-1025) that is not reservable keeps working without any pin.
  await backend.pg.query(`insert into public."StudySpot" (spot_id, spot_location, building_id, reservable) overriding system value values (1001, 'Sample spot', 1, false)`);
  assert.equal((await report(1001)).status, 204);
  // Outside the sample range and unpinned: still rejected.
  assert.equal((await report(1500)).status, 403);
});

test('guests read reports only for sample ids and live pinned spots', async () => {
  const rows = (await call('/rest/v1/latest_report_spot_status?select=spot_id')).json;
  const pinned = (await backend.pg.query(`select spot_id from public."StudySpot" where spot_location = 'Pinned spot'`)).rows[0].spot_id;
  assert.ok(rows.some(r => r.spot_id === pinned));
  assert.ok(rows.some(r => r.spot_id === 1001));
  await backend.pg.query(`update public."StudySpot" set deleted_at = now() where spot_id = ${pinned}`);
  const after = (await call('/rest/v1/latest_report_spot_status?select=spot_id')).json;
  assert.ok(!after.some(r => r.spot_id === pinned));
});

test('noise has two levels: legacy High is stored as Social and nothing else is accepted', async () => {
  const q = text => backend.pg.query(text);
  await q(`insert into public."ReportSpotStatus"(spot_id, noise_level, crowd_level) values (1002, 3, 3)`);
  assert.equal((await q(`select noise_level from public."ReportSpotStatus" where spot_id = 1002`)).rows[0].noise_level, 2);
  await assert.rejects(() => q(`insert into public."ReportSpotStatus"(spot_id, noise_level, crowd_level) values (1002, 0, 1)`), /check/i);
  await q(`insert into public."SpotSubmission"(noise_level) values (3)`);
  assert.equal((await q(`select noise_level from public."SpotSubmission" order by submission_id desc limit 1`)).rows[0].noise_level, 2);
  await q(`insert into public.spot_reports(space_id, self_noise, noise_level) values (1002, 'high', 'high')`);
  const row = (await q(`select self_noise, noise_level from public.spot_reports order by id desc limit 1`)).rows[0];
  assert.deepEqual(row, {self_noise: 'medium', noise_level: 'medium'});
  await q(`update public.spot_reports set noise_level = 'high' where space_id = 1002`);
  assert.equal((await q(`select noise_level from public.spot_reports where space_id = 1002`)).rows[0].noise_level, 'medium');
  const pinned = noise => call('/rest/v1/StudySpot', {method: 'POST', token: admin, body: {spot_location: 'Noise test', building_id: 1, floor_id: 1, spot_type_id: 1, capacity: 2, group_type: 'group', outlets: true, reservable: false, is_private: false, noise_level: noise, plan_key: 'L3', plan_x: 5, plan_y: 5}});
  assert.equal((await pinned('high')).status, 409);
  assert.equal((await pinned('loud')).status, 409);
  assert.equal((await pinned('medium')).status, 204);
});

test('a protected account cannot be deleted by the portal or the database, other edits still work', async () => {
  const fn = body => call('/functions/v1/admin-users', {method: 'POST', token: admin, body});
  const made = await fn({action: 'create', email: 'protected@nook.test', password: 'Protected#2026pw'});
  const id = made.json.user.id;
  await backend.pg.query(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"protected":true}'::jsonb where id = $1`, [id]);
  assert.equal((await fn({action: 'list'})).json.users.find(u => u.id === id).protected, true);
  const refused = await fn({action: 'delete', id});
  assert.equal(refused.status, 409);
  assert.match(refused.json.error, /protected/i);
  await assert.rejects(() => backend.pg.query('delete from auth.users where id = $1', [id]), /protected/i);
  assert.equal((await fn({action: 'update', id, role: 'user', email: 'protected2@nook.test'})).status, 200);
  assert.equal((await fn({action: 'list'})).json.users.find(u => u.id === id).protected, true);
  await backend.pg.query(`update auth.users set raw_app_meta_data = raw_app_meta_data - 'protected' where id = $1`, [id]);
  assert.equal((await fn({action: 'delete', id})).status, 200);
});
