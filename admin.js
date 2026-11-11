// Dev page: login, admin-code unlock, Maintain Users, Maintain Records (generic CRUD) and map pin-drop.
// UI hiding is convenience only; the database enforces admin access (see supabase/migrations/dev-page).
const cfg = window.NOOK_ADMIN_CONFIG;
const $ = (sel, root = document) => root.querySelector(sel);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// ---- Provo / BYU bounds and map rules (mirrors the database check constraint) ----
const BOUNDS = {latMin: 40.240, latMax: 40.262, lngMin: -111.665, lngMax: -111.635};
const MIN_PIN_ZOOM = 17;
const inBounds = (lat, lng) => lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;

// ---- Per-table config: adding a maintained table is one entry here ----
const COORDS = [
  {key: 'lat', label: 'Latitude', type: 'number', geo: true},
  {key: 'lng', label: 'Longitude', type: 'number', geo: true}
];
const TABLES = [
  {table: 'Buildings', label: 'Buildings', pk: 'building_id', title: r => r.building_name || `Building ${r.building_id}`, geo: true, columns: [
    {key: 'building_name', label: 'Name', type: 'text', required: true},
    {key: 'building_location', label: 'Location', type: 'text'},
    {key: 'opening_hrs', label: 'Opens', type: 'time'},
    {key: 'closing_hrs', label: 'Closes', type: 'time'},
    {key: 'reservation_url', label: 'Reservation URL', type: 'url', list: false},
    ...COORDS]},
  {table: 'Floors', label: 'Floors', locked: true, pk: 'floor_id', title: r => `Floor ${r.floor_number ?? '?'}`, columns: [
    {key: 'building_id', label: 'Building', type: 'fk', ref: 'Buildings', required: true},
    {key: 'floor_number', label: 'Floor number', type: 'int', required: true}]},
  {table: 'StudySpot', label: 'Study Spots', pk: 'spot_id', title: r => r.spot_location || `Spot ${r.spot_id}`, geo: true, plan: true, soft: true, columns: [
    {key: 'spot_location', label: 'Spot / location', type: 'text', required: true},
    {key: 'building_id', label: 'Building', type: 'fk', ref: 'Buildings', required: true},
    {key: 'floor_id', label: 'Floor', type: 'fk', ref: 'Floors'},
    {key: 'spot_type_id', label: 'Type', type: 'fk', ref: 'SpotType', required: true},
    {key: 'capacity', label: 'Capacity', type: 'int', required: true, min: 1, max: 8},
    {key: 'group_type', label: 'Solo or group', type: 'select', required: true, options: [{value: 'solo', label: 'Solo'}, {value: 'group', label: 'Group'}]},
    {key: 'outlets', label: 'Outlets', type: 'bool'},
    {key: 'reservable', label: 'Reservable', type: 'bool'},
    {key: 'is_private', label: 'Private room', type: 'bool', list: false},
    {key: 'noise_level', label: 'Typical noise', type: 'select', required: true, list: false, options: [{value: 'low', label: 'Low'}, {value: 'medium', label: 'Medium'}, {value: 'high', label: 'High'}]},
    ...COORDS]},
  {table: 'SpotType', label: 'Spot Types', pk: 'spot_type_id', title: r => r.type_name || `Type ${r.spot_type_id}`, columns: [
    {key: 'type_name', label: 'Name', type: 'text', required: true}]},
  {table: 'ResourceType', label: 'Resource Types', pk: 'resource_type_id', title: r => r.resource_name || `Type ${r.resource_type_id}`, columns: [
    {key: 'resource_name', label: 'Name', type: 'text', required: true}]},
  {table: 'Resources', label: 'Resources', pk: 'resource_id', title: r => r.resource_info || `Resource ${r.resource_id}`, plan: true, soft: true, columns: [
    {key: 'resource_info', label: 'Description', type: 'text', required: true},
    {key: 'resource_type_id', label: 'Type', type: 'fk', ref: 'ResourceType', required: true},
    {key: 'building_id', label: 'Building', type: 'fk', ref: 'Buildings', required: true},
    {key: 'floor_id', label: 'Floor', type: 'fk', ref: 'Floors', required: true},
    {key: 'resource_location', label: 'Where', type: 'text', required: true}]},
  {table: 'BuildingHours', label: 'Building Hours', pk: 'hours_id', title: r => `Hours ${r.hours_id}`, columns: [
    {key: 'building_id', label: 'Building', type: 'fk', ref: 'Buildings', required: true},
    {key: 'day_of_week', label: 'Day (0=Sun..6=Sat)', type: 'int', min: 0, max: 6},
    {key: 'special_date', label: 'Special date', type: 'date'},
    {key: 'open_time', label: 'Opens', type: 'time'},
    {key: 'close_time', label: 'Closes', type: 'time'},
    {key: 'is_closed', label: 'Closed', type: 'bool'},
    {key: 'note', label: 'Note', type: 'text'}]}
];
const byTable = name => TABLES.find(t => t.table === name);

// ---- Cookie-backed session (cleared on logout). SPA cookies cannot be HttpOnly. ----
const COOKIES = {access: 'nook_admin_at', refresh: 'nook_admin_rt'};
const setCookie = (name, value, maxAge) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
};
const getCookie = name => {
  const hit = document.cookie.split('; ').find(c => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
};
const clearCookies = () => { for (const name of Object.values(COOKIES)) setCookie(name, '', 0); };

const state = {user: null, isAdmin: false, unlocked: false, notice: '', lookups: {}};
let accessToken = '', refreshToken = '';

// The main site keeps its sign-in in localStorage on this same origin. The dev page adopts it, so there is one login.
const MAIN_SESSION_KEY = 'studybyu.auth.v1';
const mainSession = () => { try { return JSON.parse(localStorage.getItem(MAIN_SESSION_KEY) || 'null'); } catch { return null; } };
function storeSession(session) {
  accessToken = session.access_token; refreshToken = session.refresh_token;
  setCookie(COOKIES.access, accessToken, 3600);
  setCookie(COOKIES.refresh, refreshToken, 60 * 60 * 24 * 7);
  // Keep the main site's copy current: refresh tokens rotate, so a stale copy there would stop working.
  try { if (mainSession()) localStorage.setItem(MAIN_SESSION_KEY, JSON.stringify({access_token: accessToken, refresh_token: refreshToken, expires_at: Math.floor(Date.now() / 1000) + (session.expires_in || 3600)})); } catch {}
}
function dropSession() {
  accessToken = ''; refreshToken = '';
  clearCookies();
  Object.assign(state, {user: null, isAdmin: false, unlocked: false, lookups: {}});
}

// ---- HTTP ----
class ApiError extends Error { constructor(status, body) { super(body?.message || body?.msg || body?.error || `Request failed (${status})`); this.status = status; this.body = body || {}; this.code = body?.error_code || (typeof body?.code === 'string' ? body.code : ''); } }
async function raw(path, {method = 'GET', body, headers = {}, auth = true} = {}) {
  const response = await fetch(cfg.url + path, {method, headers: {apikey: cfg.key, 'Content-Type': 'application/json', ...(auth && accessToken ? {Authorization: `Bearer ${accessToken}`} : {}), ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
  const text = await response.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = {message: text}; }
  return {response, json};
}
async function refresh() {
  if (!refreshToken) return false;
  const {response, json} = await raw('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: {refresh_token: refreshToken}, auth: false});
  if (!response.ok) return false;
  storeSession(json); state.user = json.user; state.isAdmin = json.user?.app_metadata?.role === 'admin';
  return true;
}
async function api(path, options = {}) {
  let result = await raw(path, options);
  if (result.response.status === 401 && accessToken && await refresh()) result = await raw(path, options);
  if (!result.response.ok) throw new ApiError(result.response.status, result.json);
  return {...result, count: Number((result.response.headers.get('Content-Range') || '').split('/')[1])};
}
const isDenied = error => error instanceof ApiError && (error.status === 401 || error.status === 403 || error.code === '42501');

// ---- UI helpers ----
function setNotice(message, isError = false) {
  const el = $('#notice');
  el.textContent = message || ''; el.hidden = !message; el.classList.toggle('is-error', !!isError);
}
const VIEWS = ['landing', 'code', 'dash', 'records', 'users', 'table'];
function show(view) {
  for (const name of VIEWS) $(`#view-${name}`).hidden = name !== view;
  $('#nav-login').hidden = !!state.user; $('#nav-features').hidden = !!state.user;
  $('#nav-user').hidden = !state.user; $('#nav-email').textContent = state.user?.email || '';
}
function confirmDialog(title, text, yesLabel = 'Delete') {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm-yes').textContent = yesLabel;
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), {once: true});
    dialog.returnValue = 'no'; dialog.showModal();
  });
}
async function onDenied() {
  state.unlocked = await checkUnlocked().catch(() => false);
  if (!state.unlocked) {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    state.notice = 'Your admin session expired or was not accepted. Enter your admin code again.'; location.hash = '#/'; render(); }
}
async function checkUnlocked() {
  const {json} = await api('/rest/v1/rpc/is_admin_unlocked', {method: 'POST', body: {}});
  return json === true;
}

// ---- Routing ----
function render() {
  const route = location.hash.replace(/^#\/?/, '');
  setNotice(state.notice, !!state.notice);
  if (!state.user) return show('landing');
  if (!state.isAdmin) { setNotice(`Signed in as ${state.user.email}, but this account does not have admin access.`, true); return show('landing'); }
  if (!state.unlocked) { $('#code-email').textContent = state.user.email; return show('code'); }
  const [section, table] = route.split('/');
  if (section === 'users') return openUsers();
  if (section === 'records' && table && byTable(decodeURIComponent(table))) return openTable(byTable(decodeURIComponent(table)));
  if (section === 'records') return openRecords();
  return openDash();
}
function openDash() {
  $('#view-dash').innerHTML = `<h1>Admin dashboard</h1><p class="muted">Choose what to maintain.</p>
    <div class="dash-actions"><a class="btn btn-primary" id="btn-users" href="#/users">Maintain Users</a><a class="btn btn-primary" id="btn-records" href="#/records">Maintain Records</a></div>`;
  show('dash');
}
function openRecords() {
  $('#view-records').innerHTML = `<p class="crumbs"><a href="#/">Dashboard</a> / Records</p><h1>Maintain Records</h1><p class="muted">Pick a table.</p>
    <div class="table-buttons">${TABLES.map(t => `<a class="btn" href="#/records/${encodeURIComponent(t.table)}">Maintain ${esc(t.label)}</a>`).join('')}</div>`;
  show('records');
}
function clearAdminViews() { for (const name of ['dash', 'records', 'users', 'table']) $(`#view-${name}`).innerHTML = ''; }

// ---- Auth flows ----
async function startSession(session) {
  storeSession(session);
  state.user = session.user; state.isAdmin = session.user?.app_metadata?.role === 'admin';
  state.unlocked = state.isAdmin ? await checkUnlocked().catch(() => false) : false;
}
async function tryRestore(access, refreshValue) {
  accessToken = access; refreshToken = refreshValue;
  let result = await raw('/auth/v1/user');
  if (!result.response.ok && !(await refresh())) throw new Error('expired');
  if (!result.response.ok) result = await raw('/auth/v1/user');
  if (!result.response.ok) throw new Error('expired');
  setCookie(COOKIES.access, accessToken, 3600); setCookie(COOKIES.refresh, refreshToken, 60 * 60 * 24 * 7);
  state.user = {id: result.json.id, email: result.json.email, app_metadata: result.json.app_metadata};
  state.isAdmin = state.user.app_metadata?.role === 'admin';
  state.unlocked = state.isAdmin ? await checkUnlocked().catch(() => false) : false;
}
// Prefer the main site's login (one sign-in for both pages), then this page's own cookie from a direct login.
async function restore() {
  const main = mainSession(), own = {access: getCookie(COOKIES.access), refresh: getCookie(COOKIES.refresh)};
  const candidates = [];
  if (main?.access_token) candidates.push([main.access_token, main.refresh_token || '']);
  if ((own.access || own.refresh) && own.access !== main?.access_token) candidates.push([own.access, own.refresh]);
  for (const [access, refreshValue] of candidates) {
    try { await tryRestore(access, refreshValue); return; } catch {}
  }
  dropSession();
}
function loginMessage(error) {
  if (error.code === 'invalid_credentials') return 'That email and password do not match an account.';
  if (error.code === 'email_not_confirmed') return 'Confirm your email first, then log in.';
  if (error.code === 'user_banned') return 'This account is disabled.';
  if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
  return 'Could not log in. Check the connection and try again.';
}
async function logout() {
  try { if (accessToken) await api('/rest/v1/rpc/lock_admin', {method: 'POST', body: {}}); } catch {}
  try { if (accessToken) await raw('/auth/v1/logout', {method: 'POST'}); } catch {}
  try { localStorage.removeItem(MAIN_SESSION_KEY); } catch {}
  dropSession(); clearAdminViews(); state.notice = '';
  location.hash = '#/';
  render();
}

$('#nav-login').addEventListener('click', openLogin);
$('#hero-login').addEventListener('click', () => state.user ? render() : openLogin());
function openLogin() { $('#login-error').hidden = true; $('#login-dialog').showModal(); $('#user_email').focus(); }
for (const btn of document.querySelectorAll('[data-close]')) btn.addEventListener('click', () => btn.closest('dialog').close());
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const email = $('#user_email').value.trim(), password = $('#user_password').value, error = $('#login-error');
  if (!email || !password) { error.textContent = 'Enter your email and password.'; error.hidden = false; return; }
  const submit = $('#login-submit'); submit.disabled = true;
  try {
    const {json} = await raw('/auth/v1/token?grant_type=password', {method: 'POST', body: {email, password}, auth: false}).then(r => { if (!r.response.ok) throw new ApiError(r.response.status, r.json); return r; });
    state.notice = '';
    await startSession(json);
    $('#user_password').value = ''; $('#login-dialog').close();
    location.hash = '#/'; render();
  } catch (e) { error.textContent = loginMessage(e); error.hidden = false; $('#user_password').value = ''; }
  finally { submit.disabled = false; }
});
$('#code-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#admin_code'), error = $('#code-error');
  if (!input.value) { error.textContent = 'Enter your admin code.'; error.hidden = false; return; }
  try {
    const {json} = await api('/rest/v1/rpc/unlock_admin', {method: 'POST', body: {code: input.value}});
    input.value = '';
    if (json !== true) { error.textContent = 'That code was not accepted. Five wrong codes lock the account for 15 minutes.'; error.hidden = false; return; }
    error.hidden = true; state.unlocked = true; state.notice = ''; render();
  } catch (e) { error.textContent = 'Could not check the code. Try again.'; error.hidden = false; }
});
$('#nav-logout').addEventListener('click', logout);
$('#code-logout').addEventListener('click', logout);
window.addEventListener('hashchange', render);

// =====================================================================================
// Generic record maintenance
// =====================================================================================
const PAGE_SIZE = 15;
const view = {sort: null, dir: 'asc', page: 0, search: '', mode: 'table'};
let mapCtl = null;

async function lookup(refName, force = false) {
  if (!force && state.lookups[refName]) return state.lookups[refName];
  const ref = byTable(refName);
  const {json} = await api(`/rest/v1/${encodeURIComponent(refName)}?select=*&order=${ref.pk}.asc&limit=1000`);
  state.lookups[refName] = json;
  return json;
}
function fkLabel(refName, id) {
  if (id === null || id === undefined) return '';
  const row = (state.lookups[refName] || []).find(r => r[byTable(refName).pk] === id);
  if (!row) return String(id);
  if (refName === 'Floors') {
    const building = (state.lookups.Buildings || []).find(b => b.building_id === row.building_id);
    return `${building?.building_name || 'Building ' + row.building_id}, floor ${row.floor_number}`;
  }
  return byTable(refName).title(row);
}
function cellText(col, value) {
  if (value === null || value === undefined || value === '') return '';
  if (col.type === 'bool') return value ? 'Yes' : 'No';
  if (col.type === 'fk') return fkLabel(col.ref, value);
  if (col.type === 'time') return String(value).slice(0, 5);
  if (col.geo) return Number(value).toFixed(6);
  return String(value);
}

async function openTable(cfgTable) {
  const host = $('#view-table');
  show('table');
  if (view.table !== cfgTable.table) Object.assign(view, {table: cfgTable.table, sort: null, dir: 'asc', page: 0, search: '', mode: cfgTable.plan ? 'plan' : 'table'});
  host.innerHTML = `<p class="crumbs"><a href="#/">Dashboard</a> / <a href="#/records">Records</a> / ${esc(cfgTable.label)}</p>
    <h1>Maintain ${esc(cfgTable.label)}</h1>
    ${cfgTable.locked ? '<p class="notice">Floors are locked. They can be added but never edited or deleted here, so existing spots and resources stay attached to the right floor.</p>' : ''}
    <div class="toolbar">
      <input type="search" id="search" placeholder="Search" aria-label="Search ${esc(cfgTable.label)}" value="${esc(view.search)}">
      <button class="btn btn-primary" id="add-btn" type="button">Add ${esc(cfgTable.label.replace(/s$/, ''))}</button>
      ${cfgTable.geo || cfgTable.plan ? `<span class="seg" role="group" aria-label="View"><button type="button" data-mode="table" aria-pressed="${view.mode === 'table'}">Table</button>${cfgTable.geo ? `<button type="button" data-mode="map" aria-pressed="${view.mode === 'map'}">Map</button>` : ''}${cfgTable.plan ? `<button type="button" data-mode="plan" aria-pressed="${view.mode === 'plan'}">Floor plan</button>` : ''}</span>` : ''}
    </div>
    <p class="notice is-error" id="table-error" role="alert" hidden></p>
    <div id="table-body"><p class="loading">Loading...</p></div>`;
  $('#search').addEventListener('input', debounce(event => { view.search = event.target.value.trim(); view.page = 0; loadRows(cfgTable); }, 250));
  $('#add-btn').addEventListener('click', () => openForm(cfgTable, null));
  for (const btn of host.querySelectorAll('[data-mode]')) btn.addEventListener('click', () => { view.mode = btn.dataset.mode; openTable(cfgTable); });
  try {
    for (const ref of new Set(cfgTable.columns.filter(c => c.type === 'fk').map(c => c.ref))) await lookup(ref, true);
    if (cfgTable.table === 'Floors' || cfgTable.columns.some(c => c.ref === 'Floors')) await lookup('Buildings');
  } catch (error) { return tableError(error); }
  if (view.mode === 'map') return openMap(cfgTable);
  if (view.mode === 'plan') return openPlan(cfgTable);
  destroyMap();
  loadRows(cfgTable);
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function tableError(error) {
  if (isDenied(error)) return onDenied();
  const el = $('#table-error'); if (!el) return;
  el.textContent = error.message || 'Something went wrong.'; el.hidden = false;
  const body = $('#table-body'); if (body && body.querySelector('.loading')) body.innerHTML = '';
}
async function loadRows(cfgTable) {
  const body = $('#table-body');
  const cols = cfgTable.columns.filter(c => c.list !== false);
  const sort = view.sort || cfgTable.pk;
  const params = new URLSearchParams({select: '*', order: `${sort}.${view.dir}`, limit: String(PAGE_SIZE), offset: String(view.page * PAGE_SIZE)});
  if (cfgTable.soft) params.set('deleted_at', 'is.null');
  if (view.search) {
    const texts = cfgTable.columns.filter(c => c.type === 'text' || c.type === 'url').map(c => `${c.key}.ilike.*${view.search.replace(/[,()*]/g, ' ')}*`);
    if (texts.length) params.set('or', `(${texts.join(',')})`);
  }
  try {
    const {json: rows, count} = await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?${params}`, {headers: {Prefer: 'count=exact'}});
    $('#table-error').hidden = true;
    if (!rows.length) { body.innerHTML = `<p class="empty">${view.search ? 'No records match that search.' : 'No records yet. Add the first one.'}</p>`; return; }
    const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    body.innerHTML = `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th scope="col" aria-sort="${sort === c.key ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${c.key}">${esc(c.label)}${sort === c.key ? (view.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}<th scope="col">Actions</th></tr></thead>
      <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${esc(cellText(c, r[c.key]))}</td>`).join('')}<td class="actions">${cfgTable.locked ? '<span class="badge">Locked</span>' : `<button class="btn btn-sm" data-edit="${r[cfgTable.pk]}" type="button">Edit</button><button class="btn btn-sm btn-danger" data-del="${r[cfgTable.pk]}" type="button">Delete</button>`}</td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><button class="btn btn-sm" id="prev" ${view.page === 0 ? 'disabled' : ''} type="button">Previous</button><span>Page ${view.page + 1} of ${pages} &middot; ${count} record${count === 1 ? '' : 's'}</span><button class="btn btn-sm" id="next" ${view.page + 1 >= pages ? 'disabled' : ''} type="button">Next</button></div>`;
    const byId = new Map(rows.map(r => [String(r[cfgTable.pk]), r]));
    for (const b of body.querySelectorAll('[data-sort]')) b.addEventListener('click', () => { view.dir = view.sort === b.dataset.sort && view.dir === 'asc' ? 'desc' : 'asc'; view.sort = b.dataset.sort; view.page = 0; loadRows(cfgTable); });
    for (const b of body.querySelectorAll('[data-edit]')) b.addEventListener('click', () => openForm(cfgTable, byId.get(b.dataset.edit)));
    for (const b of body.querySelectorAll('[data-del]')) b.addEventListener('click', () => removeRow(cfgTable, byId.get(b.dataset.del)));
    $('#prev')?.addEventListener('click', () => { view.page--; loadRows(cfgTable); });
    $('#next')?.addEventListener('click', () => { view.page++; loadRows(cfgTable); });
  } catch (error) { tableError(error); }
}
async function removeRow(cfgTable, row) {
  const text = cfgTable.soft ? 'It is hidden everywhere, including the main page. You can restore it from Recently deleted.' : 'This cannot be undone.';
  if (!await confirmDialog(`Delete ${cfgTable.title(row)}?`, text)) return;
  try {
    const target = `/rest/v1/${encodeURIComponent(cfgTable.table)}?${cfgTable.pk}=eq.${row[cfgTable.pk]}`;
    const {json} = cfgTable.soft
      ? await api(target, {method: 'PATCH', body: {deleted_at: new Date().toISOString()}, headers: {Prefer: 'return=representation'}})
      : await api(target, {method: 'DELETE', headers: {Prefer: 'return=representation'}});
    if (!json?.length) return onDenied();
    delete state.lookups[cfgTable.table];
    view.mode === 'map' ? openMap(cfgTable) : view.mode === 'plan' ? openPlan(cfgTable) : loadRows(cfgTable);
  } catch (error) {
    if (error.status === 409) { const el = $('#table-error'); el.textContent = 'This record is still used by other records. Remove or change those first.'; el.hidden = false; return; }
    tableError(error);
  }
}

// ---- Form generated from config; used in a dialog (table view) or a side panel (map view) ----
function fieldHtml(col, value) {
  const id = `f_${col.key}`, req = col.required ? ' required' : '';
  const label = `<label for="${id}">${esc(col.label)}${col.required ? ' *' : ''}</label>`;
  const v = value ?? '';
  if (col.type === 'bool') return `<div class="check"><input type="checkbox" id="${id}" name="${col.key}" ${value ? 'checked' : ''}><label for="${id}">${esc(col.label)}</label></div>`;
  if (col.type === 'select') return `${label}<select id="${id}" name="${col.key}"${req}><option value="">Choose...</option>${col.options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  if (col.type === 'fk') {
    const rows = state.lookups[col.ref] || [];
    return `${label}<select id="${id}" name="${col.key}"${req}><option value="">${col.required ? 'Choose...' : 'None'}</option>${rows.map(r => { const pk = r[byTable(col.ref).pk]; return `<option value="${pk}" ${pk === value ? 'selected' : ''}>${esc(fkLabel(col.ref, pk))}</option>`; }).join('')}</select>`;
  }
  const type = {int: 'number', number: 'number', time: 'time', date: 'date', url: 'url', text: 'text'}[col.type];
  const extra = col.type === 'int' ? ` step="1"${col.min !== undefined ? ` min="${col.min}"` : ''}${col.max !== undefined ? ` max="${col.max}"` : ''}` : col.type === 'number' ? ' step="any"' : '';
  const hint = col.geo ? '<p class="field-hint">Inside the BYU/Provo area. Set both or neither.</p>' : '';
  return `${label}<input id="${id}" name="${col.key}" type="${type}" value="${esc(v)}"${extra}${req}>${hint}`;
}
function readForm(cfgTable, form) {
  const out = {}, problems = [];
  for (const col of cfgTable.columns) {
    const el = form.elements[col.key];
    let value;
    if (col.type === 'bool') value = el.checked;
    else {
      const text = el.value.trim();
      if (text === '') { if (col.required) problems.push(`${col.label} is required.`); value = null; }
      else if (col.type === 'int') { value = Number(text); if (!Number.isInteger(value)) problems.push(`${col.label} must be a whole number.`); else if ((col.min !== undefined && value < col.min) || (col.max !== undefined && value > col.max)) problems.push(`${col.label} must be between ${col.min} and ${col.max}.`); }
      else if (col.type === 'number') { value = Number(text); if (!Number.isFinite(value)) problems.push(`${col.label} must be a number.`); }
      else if (col.type === 'fk') value = Number(text);
      else if (col.type === 'url') { value = text; if (!/^https?:\/\//i.test(text)) problems.push(`${col.label} must start with http:// or https://.`); }
      else value = text;
    }
    out[col.key] = value;
  }
  if (cfgTable.geo) {
    const {lat, lng} = out;
    if ((lat === null) !== (lng === null)) problems.push('Set both latitude and longitude, or leave both empty.');
    else if (lat !== null && Number.isFinite(lat) && Number.isFinite(lng) && !inBounds(lat, lng)) problems.push('That location is outside the BYU/Provo area.');
  }
  return {values: out, problems};
}
// Renders the form into host. Returns {setCoords}. onSaved runs after a successful save.
function buildForm(host, cfgTable, record, {onSaved, onCancel, onCoordsTyped, prefill, extra} = {}) {
  const editing = !!record;
  host.innerHTML = `<form novalidate id="record-form"><h2 id="form-title">${editing ? 'Edit' : 'Add'} ${esc(cfgTable.label.replace(/s$/, ''))}</h2>
    ${cfgTable.columns.map(c => fieldHtml(c, (record || prefill)?.[c.key])).join('')}
    <p class="error" id="form-error" role="alert" hidden></p>
    <div class="row"><button class="btn btn-primary" type="submit" id="form-save">Save</button><button class="btn" type="button" id="form-cancel">Cancel</button></div></form>`;
  const form = $('#record-form', host);
  const showError = message => { const el = $('#form-error', host); el.textContent = message; el.hidden = !message; };
  $('#form-cancel', host).addEventListener('click', () => onCancel?.());
  for (const key of ['lat', 'lng']) form.elements[key]?.addEventListener('input', () => onCoordsTyped?.(Number(form.elements.lat.value), Number(form.elements.lng.value), form.elements.lat.value !== '' && form.elements.lng.value !== ''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const {values, problems} = readForm(cfgTable, form);
    if (problems.length) return showError(problems.join(' '));
    showError('');
    const save = $('#form-save', host); save.disabled = true;
    try {
      const table = encodeURIComponent(cfgTable.table);
      const body = extra ? {...values, ...await extra()} : values;
      const request = editing
        ? api(`/rest/v1/${table}?${cfgTable.pk}=eq.${record[cfgTable.pk]}`, {method: 'PATCH', body, headers: {Prefer: 'return=representation'}})
        : api(`/rest/v1/${table}`, {method: 'POST', body, headers: {Prefer: 'return=representation'}});
      const {json} = await request;
      if (!json?.length) { save.disabled = false; return onDenied(); }
      delete state.lookups[cfgTable.table];
      onSaved?.(json[0]);
    } catch (error) {
      save.disabled = false;
      if (isDenied(error)) return onDenied();
      showError(error.status === 409 || error.status === 400 ? `The database rejected that: ${error.message}` : 'Could not save. Try again.');
    }
  });
  return {
    setCoords(lat, lng) { if (form.elements.lat) { form.elements.lat.value = lat.toFixed(6); form.elements.lng.value = lng.toFixed(6); } },
    focus() { form.querySelector('input,select')?.focus(); }
  };
}
function openForm(cfgTable, record) {
  const dialog = $('#form-dialog');
  const close = () => dialog.close();
  const ctl = buildForm($('#form-host'), cfgTable, record, {onCancel: close, onSaved: () => { close(); view.mode === 'map' ? openMap(cfgTable) : view.mode === 'plan' ? openPlan(cfgTable) : loadRows(cfgTable); }});
  dialog.showModal(); ctl.focus();
}

// =====================================================================================
// Map pin-drop (Leaflet, loaded on demand)
// =====================================================================================
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const CLUSTER = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/';
const loadScript = src => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the map library.')); document.head.append(s); });
const loadCss = href => { if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l); } };
let leafletReady = null;
function ensureLeaflet() {
  leafletReady ??= (async () => {
    loadCss(LEAFLET + 'leaflet.min.css'); loadCss(CLUSTER + 'MarkerCluster.min.css'); loadCss(CLUSTER + 'MarkerCluster.Default.min.css');
    await loadScript(LEAFLET + 'leaflet.min.js'); await loadScript(CLUSTER + 'leaflet.markercluster.min.js');
  })().catch(error => { leafletReady = null; throw error; });
  return leafletReady;
}
function destroyMap() { if (mapCtl) { mapCtl.map.remove(); mapCtl = null; } }

async function openMap(cfgTable) {
  const body = $('#table-body');
  body.innerHTML = '<p class="loading">Loading map...</p>';
  try { await ensureLeaflet(); } catch (error) { return tableError(error); }
  destroyMap();
  let rows;
  try { rows = (await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?select=*&order=${cfgTable.pk}.asc&limit=1000`)).json.filter(r => !r.deleted_at); } catch (error) { return tableError(error); }
  body.innerHTML = `<div class="map-layout"><div><div id="map" role="application" aria-label="Campus map. Click to place a pin when zoomed in."></div>
    <p class="map-hint" id="map-hint"></p><div class="move-bar" id="move-bar" hidden></div></div><aside class="side-panel" id="side-panel" aria-live="polite"></aside></div>
    <p class="field-hint">Imagery can sit a few meters off the street map, and pins are 2D (no floors). Use floor and description fields to tell rooms in one building apart.</p>`;
  const L = window.L;
  const map = L.map('map', {center: [40.2495, -111.6490], zoom: 17, maxZoom: 19});
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 19, attribution: 'Tiles &copy; Esri'});
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'});
  satellite.addTo(map);
  L.control.layers({Satellite: satellite, Street: street}).addTo(map);
  L.rectangle([[BOUNDS.latMin, BOUNDS.lngMin], [BOUNDS.latMax, BOUNDS.lngMax]], {color: '#4aa3df', weight: 1, fill: false, interactive: false}).addTo(map);
  const cluster = L.markerClusterGroup({maxClusterRadius: 30}).addTo(map);
  const pinIcon = cls => L.divIcon({className: '', html: `<div class="pin ${cls}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26]});
  const panel = $('#side-panel'), hint = $('#map-hint'), moveBar = $('#move-bar');
  let temp = null, form = null;
  const updateHint = () => { hint.textContent = map.getZoom() >= MIN_PIN_ZOOM ? 'Click the map to drop a pin. Drag any pin to adjust it.' : `Zoom in to place a precise pin (now ${map.getZoom()}, need ${MIN_PIN_ZOOM}+).`; };
  map.on('zoomend', updateHint); updateHint();
  const closePanel = () => { panel.innerHTML = ''; if (temp) { map.removeLayer(temp); temp = null; } form = null; };
  const refreshMap = () => { openMap(cfgTable); };

  for (const row of rows) {
    if (row.lat === null || row.lng === null) continue;
    const marker = L.marker([row.lat, row.lng], {draggable: true, icon: pinIcon(''), title: cfgTable.title(row), keyboard: true});
    marker.on('click', () => { closePanel(); form = buildForm(panel, cfgTable, row, {onCancel: closePanel, onSaved: refreshMap}); });
    marker.on('dragend', () => {
      const {lat, lng} = marker.getLatLng();
      if (!inBounds(lat, lng)) { marker.setLatLng([row.lat, row.lng]); setNotice('That spot is outside the BYU/Provo area, so the pin moved back.', true); return; }
      moveBar.hidden = false;
      moveBar.innerHTML = `<span>Move <strong>${esc(cfgTable.title(row))}</strong> to ${lat.toFixed(6)}, ${lng.toFixed(6)}?</span><button class="btn btn-primary btn-sm" id="move-save" type="button">Save new position</button><button class="btn btn-sm" id="move-undo" type="button">Undo</button>`;
      $('#move-undo').onclick = () => { marker.setLatLng([row.lat, row.lng]); moveBar.hidden = true; };
      $('#move-save').onclick = async () => {
        try {
          const {json} = await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?${cfgTable.pk}=eq.${row[cfgTable.pk]}`, {method: 'PATCH', body: {lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6))}, headers: {Prefer: 'return=representation'}});
          if (!json?.length) return onDenied();
          refreshMap();
        } catch (error) { if (isDenied(error)) return onDenied(); marker.setLatLng([row.lat, row.lng]); moveBar.hidden = true; setNotice(`Could not move the pin: ${error.message}`, true); }
      };
    });
    cluster.addLayer(marker);
  }
  const fit = rows.filter(r => r.lat !== null).map(r => [r.lat, r.lng]);
  if (fit.length) map.fitBounds(fit, {maxZoom: 18, padding: [40, 40]});

  map.on('click', event => {
    const {lat, lng} = event.latlng;
    if (map.getZoom() < MIN_PIN_ZOOM) { hint.textContent = `Zoom in to ${MIN_PIN_ZOOM} or more to place a precise pin.`; return; }
    if (!inBounds(lat, lng)) { hint.textContent = 'That point is outside the BYU/Provo area.'; return; }
    closePanel(); moveBar.hidden = true;
    temp = L.marker([lat, lng], {draggable: true, icon: pinIcon('temp'), zIndexOffset: 1000}).addTo(map);
    form = buildForm(panel, cfgTable, null, {onCancel: closePanel, onSaved: refreshMap, onCoordsTyped: (la, ln, both) => { if (both && Number.isFinite(la) && Number.isFinite(ln)) temp?.setLatLng([la, ln]); }});
    form.setCoords(lat, lng);
    temp.on('drag', () => { const p = temp.getLatLng(); form?.setCoords(p.lat, p.lng); });
    form.focus();
  });
  mapCtl = {map};
}

// =====================================================================================
// Floor-plan pins: drop study spots on the digitized plans; position is stored as percent of the drawing
// =====================================================================================
const PLAN_SETS = [
  {code: 'HBLL', match: /library|hbll/i, global: 'HBLL_PLANS', file: 'hbll-plans.js'},
  {code: 'WSC', match: /wilkinson|wsc/i, global: 'WSC_PLANS', file: 'wsc-plans.js'},
  {code: 'JKB', match: /knight|jkb/i, global: 'JKB_PLANS', file: 'jkb-plans.js'}
];
const planSetFor = building => PLAN_SETS.find(set => set.match.test(building?.building_name || ''));
const planLoads = {};
const loadPlanSet = set => window[set.global] ? Promise.resolve() : (planLoads[set.code] ??= loadScript(set.file).catch(() => { delete planLoads[set.code]; throw new Error('Could not load the floor plans. Check the connection and try again.'); }));
const planFloorNumber = key => /^B/i.test(key) ? 0 : /^G/i.test(key) ? 1 : Number((key.match(/\d+/) || [1])[0]);
const clampPct = value => Math.min(100, Math.max(0, value));
const pct = value => Number(clampPct(value).toFixed(2));

function nearestRoom(plan, xPct, yPct) {
  const x = xPct / 100 * plan.width, y = yPct / 100 * plan.height;
  let best = null, distance = Infinity;
  for (const room of plan.rooms || []) {
    const d = Math.hypot(room.x - x, room.y - y);
    if (d < distance) { distance = d; best = room; }
  }
  return distance <= 70 ? best : null;
}
async function ensureFloor(buildingId, number) {
  const found = (state.lookups.Floors || []).find(f => f.building_id === buildingId && f.floor_number === number);
  if (found) return found.floor_id;
  const {json} = await api('/rest/v1/Floors', {method: 'POST', body: {building_id: buildingId, floor_number: number}, headers: {Prefer: 'return=representation'}});
  if (!json?.length) throw new ApiError(403, {});
  (state.lookups.Floors ||= []).push(json[0]);
  return json[0].floor_id;
}
function dragPin(pin, stage, {onTap, onMove, onDrop}) {
  const point = event => { const r = stage.getBoundingClientRect(); return [pct((event.clientX - r.left) / r.width * 100), pct((event.clientY - r.top) / r.height * 100)]; };
  pin.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    pin.setPointerCapture(event.pointerId);
    const startX = event.clientX, startY = event.clientY;
    let moved = false;
    const move = e => {
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
      moved = true;
      const [x, y] = point(e);
      pin.style.left = x + '%'; pin.style.top = y + '%';
      onMove?.(x, y);
    };
    const up = e => {
      pin.removeEventListener('pointermove', move); pin.removeEventListener('pointerup', up); pin.removeEventListener('pointercancel', up);
      if (moved) onDrop?.(...point(e)); else onTap?.();
    };
    pin.addEventListener('pointermove', move); pin.addEventListener('pointerup', up); pin.addEventListener('pointercancel', up);
  });
  pin.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTap?.(); } });
}

async function openPlan(cfgTable) {
  const body = $('#table-body');
  destroyMap();
  body.innerHTML = '<p class="loading">Loading floor plans...</p>';
  let spots;
  try {
    await Promise.all([lookup('Buildings', true), lookup('Floors', true), lookup('SpotType', true)]);
    spots = (await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?select=*&order=${cfgTable.pk}.asc&limit=1000`)).json;
    var deleted = spots.filter(s => s.deleted_at && s.plan_key);
    spots = spots.filter(s => !s.deleted_at);
  } catch (error) { return tableError(error); }
  const buildings = state.lookups.Buildings.filter(planSetFor);
  if (!buildings.length) { body.innerHTML = '<p class="empty">No building has a digitized floor plan yet. Floor plans exist for the Library, the Wilkinson Student Center and the Joseph Knight Building. Add one under Buildings first.</p>'; return; }
  if (!buildings.some(b => b.building_id === view.planBuilding)) { view.planBuilding = buildings[0].building_id; view.planKey = null; }
  view.planZoom ||= 1;
  const spotForm = {...cfgTable, columns: cfgTable.columns.filter(c => !c.geo && c.key !== 'building_id' && c.key !== 'floor_id')};

  body.innerHTML = `<div class="toolbar plan-toolbar">
      <span class="inline-field"><label for="plan-building">Building</label><select id="plan-building">${buildings.map(b => `<option value="${b.building_id}" ${b.building_id === view.planBuilding ? 'selected' : ''}>${esc(b.building_name)}</option>`).join('')}</select></span>
      <span class="inline-field"><label for="plan-sheet">Floor plan</label><select id="plan-sheet"></select></span>
      <span class="seg" role="group" aria-label="Zoom"><button type="button" id="zoom-out" aria-label="Zoom out">-</button><button type="button" id="zoom-in" aria-label="Zoom in">+</button></span>
    </div>
    <div class="map-layout"><div><div class="plan-scroll" id="plan-scroll" tabindex="0"></div>
    <p class="map-hint" id="plan-hint"></p><div class="move-bar" id="move-bar" hidden></div></div><aside class="side-panel" id="side-panel" aria-live="polite"></aside></div>
    <details class="deleted-list" id="deleted-list"${deleted.length ? '' : ' hidden'}><summary>Recently deleted (${deleted.length})</summary><ul>${deleted.map(s => `<li><span>${esc(cfgTable.title(s))} <span class="muted">${esc(fkLabel('Buildings', s.building_id))}, ${esc(s.plan_key)}</span></span><button class="btn btn-sm" type="button" data-restore="${s[cfgTable.pk]}">Restore</button></li>`).join('')}</ul></details>`;
  const scroll = $('#plan-scroll'), panel = $('#side-panel'), hint = $('#plan-hint'), moveBar = $('#move-bar');
  const building = () => buildings.find(b => b.building_id === view.planBuilding);
  const redraw = () => openPlan(cfgTable);

  for (const b of body.querySelectorAll('[data-restore]')) b.addEventListener('click', async () => {
    try {
      const {json} = await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?${cfgTable.pk}=eq.${b.dataset.restore}`, {method: 'PATCH', body: {deleted_at: null}, headers: {Prefer: 'return=representation'}});
      if (!json?.length) return onDenied();
      redraw();
    } catch (error) { if (isDenied(error)) return onDenied(); tableError(error); }
  });
  $('#plan-building').addEventListener('change', event => { view.planBuilding = Number(event.target.value); view.planKey = null; redraw(); });
  $('#plan-sheet').addEventListener('change', event => { view.planKey = event.target.value; redraw(); });
  $('#zoom-in').addEventListener('click', () => { view.planZoom = Math.min(3, view.planZoom + 0.5); redraw(); });
  $('#zoom-out').addEventListener('click', () => { view.planZoom = Math.max(1, view.planZoom - 0.5); redraw(); });

  const set = planSetFor(building());
  try { await loadPlanSet(set); } catch (error) { scroll.innerHTML = ''; return tableError(error); }
  const plans = window[set.global], keys = Object.keys(plans);
  if (!plans[view.planKey]) view.planKey = keys[0];
  const plan = plans[view.planKey];
  $('#plan-sheet').innerHTML = keys.map(k => `<option value="${esc(k)}" ${k === view.planKey ? 'selected' : ''}>${esc(plans[k].label)}</option>`).join('');

  const mine = spots.filter(s => s.building_id === view.planBuilding && s.plan_key === view.planKey && s.plan_x !== null && s.plan_y !== null);
  scroll.innerHTML = `<div class="plan-stage" id="plan-stage" style="width:${view.planZoom * 100}%">${plan.svg}${mine.map((s, i) => `<button type="button" class="plan-pin" data-id="${s[cfgTable.pk]}" style="left:${s.plan_x}%;top:${s.plan_y}%" title="${esc(cfgTable.title(s))}" aria-label="${esc(cfgTable.title(s))}">${i + 1}</button>`).join('')}</div>`;
  const stage = $('#plan-stage');
  const noun = cfgTable.label.replace(/s$/, '').toLowerCase();
  const idleHint = `${mine.length} ${noun}${mine.length === 1 ? '' : 's'} on this plan. Click the plan to drop a pin, drag a pin to move it, click a pin to edit.`;
  hint.textContent = idleHint;
  let temp = null;
  const closePanel = () => { panel.innerHTML = ''; temp?.remove(); temp = null; moveBar.hidden = true; hint.textContent = idleHint; };

  for (const pin of stage.querySelectorAll('.plan-pin')) {
    const row = mine.find(s => String(s[cfgTable.pk]) === pin.dataset.id);
    dragPin(pin, stage, {
      onTap() {
        closePanel(); moveBar.hidden = true;
        buildForm(panel, spotForm, row, {onCancel: closePanel, onSaved: redraw});
        const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-danger'; del.textContent = 'Delete';
        del.addEventListener('click', () => removeRow(cfgTable, row));
        $('.row', panel).append(del);
      },
      onDrop(x, y) {
        moveBar.hidden = false;
        moveBar.innerHTML = `<span>Move <strong>${esc(cfgTable.title(row))}</strong> to this position?</span><button class="btn btn-primary btn-sm" id="move-save" type="button">Save new position</button><button class="btn btn-sm" id="move-undo" type="button">Undo</button>`;
        $('#move-undo').onclick = () => { pin.style.left = row.plan_x + '%'; pin.style.top = row.plan_y + '%'; moveBar.hidden = true; };
        $('#move-save').onclick = async () => {
          try {
            const {json} = await api(`/rest/v1/${encodeURIComponent(cfgTable.table)}?${cfgTable.pk}=eq.${row[cfgTable.pk]}`, {method: 'PATCH', body: {plan_x: x, plan_y: y}, headers: {Prefer: 'return=representation'}});
            if (!json?.length) return onDenied();
            redraw();
          } catch (error) { if (isDenied(error)) return onDenied(); $('#move-undo').click(); setNotice(`Could not move the pin: ${error.message}`, true); }
        };
      }
    });
  }

  stage.addEventListener('click', event => {
    if (event.target.closest('.plan-pin')) return;
    const r = stage.getBoundingClientRect();
    let pos = [pct((event.clientX - r.left) / r.width * 100), pct((event.clientY - r.top) / r.height * 100)];
    closePanel();
    temp = document.createElement('button');
    temp.type = 'button'; temp.className = 'plan-pin temp'; temp.textContent = '+'; temp.setAttribute('aria-label', 'New pin (drag to adjust)');
    temp.style.left = pos[0] + '%'; temp.style.top = pos[1] + '%';
    stage.append(temp);
    dragPin(temp, stage, {onMove: (x, y) => { pos = [x, y]; }, onDrop: (x, y) => { pos = [x, y]; }});
    const room = nearestRoom(plan, pos[0], pos[1]);
    buildForm(panel, spotForm, null, {
      prefill: room ? {spot_location: `Room ${room.number}`} : null,
      extra: async () => ({building_id: view.planBuilding, floor_id: await ensureFloor(view.planBuilding, planFloorNumber(view.planKey)), plan_key: view.planKey, plan_x: pos[0], plan_y: pos[1]}),
      onCancel: closePanel, onSaved: redraw
    });
    hint.textContent = room ? `Pin is next to room ${room.number}, so the name was prefilled. Drag the orange pin to adjust it.` : 'Drag the orange pin to adjust it, then fill in the details.';
    $('#record-form input')?.focus();
  });
}

// =====================================================================================
// Maintain Users (calls the admin-users function; the function re-checks the admin session)
// =====================================================================================
let users = [];
async function usersCall(body) {
  const {response, json} = await raw('/functions/v1/admin-users', {method: 'POST', body});
  if (!response.ok) throw new ApiError(response.status, json);
  return json;
}
async function openUsers() {
  show('users');
  const host = $('#view-users');
  host.innerHTML = `<p class="crumbs"><a href="#/">Dashboard</a> / Users</p><h1>Maintain Users</h1>
    <div class="toolbar"><input type="search" id="user-search" placeholder="Search by email" aria-label="Search users"><button class="btn btn-primary" id="user-add" type="button">Add user</button></div>
    <p class="notice is-error" id="users-error" role="alert" hidden></p><div id="users-body"><p class="loading">Loading...</p></div>`;
  $('#user-add').addEventListener('click', () => userForm(null));
  $('#user-search').addEventListener('input', debounce(() => drawUsers(), 150));
  try { users = (await usersCall({action: 'list'})).users; drawUsers(); }
  catch (error) { if (isDenied(error)) return onDenied(); usersError(error.message); $('#users-body').innerHTML = ''; }
}
function usersError(message) { const el = $('#users-error'); if (!el) return; el.textContent = message || ''; el.hidden = !message; }
const fmtDate = value => value ? new Date(value).toLocaleString() : 'Never';
function drawUsers() {
  const q = ($('#user-search')?.value || '').trim().toLowerCase();
  const list = users.filter(u => u.email.toLowerCase().includes(q));
  const body = $('#users-body');
  if (!list.length) { body.innerHTML = `<p class="empty">${q ? 'No users match that search.' : 'No users yet.'}</p>`; return; }
  body.innerHTML = `<div class="table-wrap"><table><thead><tr><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Confirmed</th><th scope="col">Last sign-in</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead><tbody>
    ${list.map(u => `<tr><td>${esc(u.email)}${u.id === state.user.id ? ' <span class="badge">you</span>' : ''}${u.disabled ? ' <span class="badge off">disabled</span>' : ''}</td><td><span class="badge ${u.role === 'admin' ? 'admin' : ''}">${esc(u.role)}</span></td><td>${u.email_confirmed_at ? 'Yes' : 'No'}</td><td>${esc(fmtDate(u.last_sign_in_at))}</td><td>${esc(fmtDate(u.created_at))}</td>
    <td class="actions"><button class="btn btn-sm" data-uedit="${u.id}" type="button">Edit</button><button class="btn btn-sm btn-danger" data-udel="${u.id}" type="button" ${u.id === state.user.id ? 'disabled title="You cannot delete your own account"' : ''}>Delete</button></td></tr>`).join('')}</tbody></table></div>`;
  for (const b of body.querySelectorAll('[data-uedit]')) b.addEventListener('click', () => userForm(users.find(u => u.id === b.dataset.uedit)));
  for (const b of body.querySelectorAll('[data-udel]')) b.addEventListener('click', () => deleteUser(users.find(u => u.id === b.dataset.udel)));
}
async function deleteUser(user) {
  if (!await confirmDialog(`Delete ${user.email}?`, 'This removes their login permanently.')) return;
  const before = users; users = users.filter(u => u.id !== user.id); drawUsers(); usersError('');
  try { await usersCall({action: 'delete', id: user.id}); }
  catch (error) { users = before; drawUsers(); if (isDenied(error)) return onDenied(); usersError(error.message); }
}
function userForm(user) {
  const dialog = $('#form-dialog'), host = $('#form-host'), editing = !!user;
  host.innerHTML = `<form novalidate id="user-form"><h2 id="form-title">${editing ? 'Edit user' : 'Add user'}</h2>
    <label for="u_email">Email</label><input id="u_email" type="email" value="${esc(user?.email || '')}" required>
    <label for="u_password">${editing ? 'New password (leave blank to keep)' : 'Password'}</label><input id="u_password" type="password" autocomplete="new-password" ${editing ? '' : 'required'}>
    <p class="field-hint">At least 8 characters. Passwords are never shown, only replaced.</p>
    <label for="u_role">Role</label><select id="u_role"><option value="user" ${user?.role !== 'admin' ? 'selected' : ''}>User</option><option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option></select>
    ${editing ? `<div class="check"><input type="checkbox" id="u_disabled" ${user.disabled ? 'checked' : ''}><label for="u_disabled">Disable account</label></div>` : ''}
    <p class="error" id="form-error" role="alert" hidden></p>
    <div class="row"><button class="btn btn-primary" type="submit" id="u_save">Save</button><button class="btn" type="button" id="u_cancel">Cancel</button></div></form>`;
  $('#u_cancel').addEventListener('click', () => dialog.close());
  $('#user-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('#u_email').value.trim(), password = $('#u_password').value, role = $('#u_role').value;
    const fail = message => { const el = $('#form-error'); el.textContent = message; el.hidden = false; };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.');
    if ((!editing || password) && password.length < 8) return fail('Password must be at least 8 characters.');
    const save = $('#u_save'); save.disabled = true;
    const before = users;
    try {
      if (editing) {
        const patch = {action: 'update', id: user.id, role, disabled: $('#u_disabled').checked};
        if (email !== user.email) patch.email = email;
        if (password) patch.password = password;
        users = users.map(u => u.id === user.id ? {...u, email, role, disabled: patch.disabled} : u); drawUsers();
        await usersCall(patch);
      } else await usersCall({action: 'create', email, password, role});
      dialog.close();
      users = (await usersCall({action: 'list'})).users; drawUsers();
    } catch (error) {
      users = before; drawUsers(); save.disabled = false;
      if (isDenied(error)) { dialog.close(); return onDenied(); }
      fail(error.message);
    }
  });
  dialog.showModal(); $('#u_email').focus();
}

// ---- Boot ----
await restore();
render();
