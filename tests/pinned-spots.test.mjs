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
