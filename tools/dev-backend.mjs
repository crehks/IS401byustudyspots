// Local stand-in for Supabase, used only by the dev page on the dev-page-implementation branch.
// Real PostgreSQL (PGlite, in memory) plus a small PostgREST/GoTrue/Edge-Function-shaped HTTP layer.
// Nothing here connects to the live project. Data resets each start. Run: npm run dev:backend
import http from 'node:http';
import crypto from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RPC = new Set(['unlock_admin', 'lock_admin', 'is_admin_unlocked']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const b64 = value => Buffer.from(value).toString('base64url');
const ident = name => '"' + String(name).replace(/"/g, '""') + '"';
const jsonSafe = (key, value) => typeof value === 'bigint' ? Number(value) : value;

export async function createBackend({port = 54321} = {}) {
  const pg = await PGlite.create({extensions: {pgcrypto}});
  await pg.exec(await readFile(path.join(root, 'tools/dev/schema.sql'), 'utf8'));
  const migrationDir = path.join(root, 'supabase/migrations/dev-page');
  for (const file of (await readdir(migrationDir)).filter(f => f.endsWith('.sql')).sort()) {
    await pg.exec(await readFile(path.join(migrationDir, file), 'utf8'));
  }
  await pg.exec(await readFile(path.join(root, 'tools/dev/seed.sql'), 'utf8'));

  const columns = new Map();
  for (const row of (await pg.query("select table_name, column_name from information_schema.columns where table_schema='public'")).rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
    columns.get(row.table_name).add(row.column_name);
  }

  const secret = crypto.randomBytes(32);
  const refreshTokens = new Map();
  const sign = claims => {
    const head = b64(JSON.stringify({alg: 'HS256', typ: 'JWT'}));
    const body = b64(JSON.stringify(claims));
    return `${head}.${body}.${crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
  };
  const verify = token => {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    const given = Buffer.from(parts[2], 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return claims.exp > Date.now() / 1000 ? claims : null;
    } catch { return null; }
  };

  let chain = Promise.resolve();
  const serial = fn => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };
  // Run fn as anon or as an authenticated user carrying these JWT claims; one transaction per request.
  const asRole = (claims, fn) => serial(async () => {
    await pg.exec('begin');
    try {
      await pg.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims || {})]);
      await pg.exec(`set local role ${claims ? 'authenticated' : 'anon'}`);
      const result = await fn();
      await pg.exec('commit');
      return result;
    } catch (error) {
      await pg.exec('rollback');
      throw error;
    }
  });
  const asService = fn => serial(async () => fn());

  const issue = async user => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email,
      app_metadata: user.raw_app_meta_data || {}, iat: now, exp: now + 3600};
    const refresh = crypto.randomBytes(24).toString('base64url');
    refreshTokens.set(refresh, user.id);
    return {access_token: sign(claims), token_type: 'bearer', expires_in: 3600, expires_at: claims.exp,
      refresh_token: refresh, user: {id: user.id, email: user.email, app_metadata: claims.app_metadata}};
  };

  function send(res, status, body, extra = {}) {
    const payload = body === undefined ? undefined : JSON.stringify(body, jsonSafe);
    res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra});
    res.end(payload);
  }
  const pgStatus = code => code === '42501' ? 403 : /^23/.test(code || '') ? 409 : 400;
  const pgError = error => ({code: error.code || 'PGRST000', message: error.message, details: error.detail || null, hint: error.hint || null});
  const authError = (res, status, code, msg) => send(res, status, {code: status, error_code: code, msg});

  function filtersFrom(table, params) {
    const cols = columns.get(table), clauses = [], values = [];
    for (const [key, raw] of params) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
      if (key === 'or') {
        const parts = raw.replace(/^\(|\)$/g, '').split(',').map(part => {
          const [col, op, ...rest] = part.split('.');
          if (!cols.has(col) || op !== 'ilike') throw Object.assign(new Error('Unsupported or filter'), {code: 'PGRST100'});
          values.push(rest.join('.').replace(/\*/g, '%'));
          return `${ident(col)}::text ilike $${values.length}`;
        });
        clauses.push(`(${parts.join(' or ')})`);
        continue;
      }
      if (!cols.has(key)) throw Object.assign(new Error(`Unknown column ${key}`), {code: 'PGRST204'});
      const dot = raw.indexOf('.');
      const op = raw.slice(0, dot), val = raw.slice(dot + 1);
      const sql = {eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<='}[op];
      if (sql) { values.push(val); clauses.push(`${ident(key)} ${sql} $${values.length}`); }
      else if (op === 'ilike' || op === 'like') { values.push(val.replace(/\*/g, '%')); clauses.push(`${ident(key)}::text ${op} $${values.length}`); }
      else if (op === 'is') clauses.push(`${ident(key)} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`);
      else throw Object.assign(new Error(`Unsupported operator ${op}`), {code: 'PGRST100'});
    }
    return {where: clauses.length ? ' where ' + clauses.join(' and ') : '', values, has: clauses.length > 0};
  }

  async function rest(req, res, table, url, claims, body) {
    if (!columns.has(table)) return send(res, 404, {code: 'PGRST205', message: `Table ${table} not found`});
    const cols = columns.get(table), t = `public.${ident(table)}`;
    const wantRows = /return=representation/.test(req.headers.prefer || '');
    const checkCols = obj => { for (const k of Object.keys(obj)) if (!cols.has(k)) throw Object.assign(new Error(`Unknown column ${k}`), {code: 'PGRST204'}); };
    const out = await asRole(claims, async () => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        const f = filtersFrom(table, url.searchParams);
        const select = (url.searchParams.get('select') || '*') === '*' ? '*'
          : url.searchParams.get('select').split(',').map(c => { if (!cols.has(c)) throw Object.assign(new Error(`Unknown column ${c}`), {code: 'PGRST204'}); return ident(c); }).join(',');
        const order = (url.searchParams.get('order') || '').split(',').filter(Boolean).map(part => {
          const [c, dir = 'asc'] = part.split('.');
          if (!cols.has(c) || !['asc', 'desc'].includes(dir)) throw Object.assign(new Error('Bad order'), {code: 'PGRST100'});
          return `${ident(c)} ${dir}`;
        });
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 1000), 0), 1000);
        const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
        const rows = (await pg.query(`select ${select} from ${t}${f.where}${order.length ? ' order by ' + order.join(',') : ''} limit ${limit} offset ${offset}`, f.values)).rows;
        let total = null;
        if (/count=exact/.test(req.headers.prefer || '')) total = Number((await pg.query(`select count(*)::int n from ${t}${f.where}`, f.values)).rows[0].n);
        return {status: 200, rows, range: total === null ? null : `${rows.length ? offset : '*'}${rows.length ? '-' + (offset + rows.length - 1) : ''}/${total}`};
      }
      if (req.method === 'POST') {
        const list = Array.isArray(body) ? body : [body || {}];
        const rows = [];
        for (const obj of list) {
          checkCols(obj);
          const keys = Object.keys(obj);
          const sql = keys.length ? `insert into ${t} (${keys.map(ident).join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *` : `insert into ${t} default values returning *`;
          rows.push(...(await pg.query(sql, keys.map(k => obj[k]))).rows);
        }
        return {status: 201, rows};
      }
      const f = filtersFrom(table, url.searchParams);
      if (!f.has) throw Object.assign(new Error('Filter required'), {code: 'PGRST100'});
      if (req.method === 'PATCH') {
        checkCols(body || {});
        const keys = Object.keys(body || {});
        if (!keys.length) throw Object.assign(new Error('Empty body'), {code: 'PGRST102'});
        const set = keys.map((k, i) => `${ident(k)} = $${f.values.length + i + 1}`).join(',');
        return {status: 200, rows: (await pg.query(`update ${t} set ${set}${f.where} returning *`, [...f.values, ...keys.map(k => body[k])])).rows};
      }
      if (req.method === 'DELETE') return {status: 200, rows: (await pg.query(`delete from ${t}${f.where} returning *`, f.values)).rows};
      throw Object.assign(new Error('Method not allowed'), {code: 'PGRST000'});
    });
    const extra = out.range ? {'Content-Range': out.range} : {};
    if (req.method === 'HEAD') { res.writeHead(200, extra); return res.end(); }
    if (out.status === 200 && req.method === 'GET') return send(res, 200, out.rows, extra);
    if (!wantRows) { res.writeHead(204, extra); return res.end(); }
    return send(res, out.status, out.rows, extra);
  }

  async function rpc(res, name, claims, body) {
    if (!RPC.has(name)) return send(res, 404, {code: 'PGRST202', message: `Function ${name} not found`});
    if (!claims) return send(res, 401, {code: '42501', message: 'permission denied for function ' + name});
    const keys = Object.keys(body || {});
    const args = keys.map((k, i) => `${k.replace(/[^a-z_]/g, '')} := $${i + 1}`).join(', ');
    const result = await asRole(claims, async () => (await pg.query(`select public.${name}(${args}) as r`, keys.map(k => body[k]))).rows[0].r);
    return send(res, 200, result ?? null);
  }

  async function adminUsers(res, claims, body) {
    if (!claims) return send(res, 401, {error: 'Sign in first.'});
    const unlocked = await asRole(claims, async () => (await pg.query('select public.is_admin_unlocked() as ok')).rows[0].ok);
    if (!unlocked) return send(res, 403, {error: 'Admin session required. Re-enter your admin code.'});
    const self = claims.sub;
    const adminCount = async excluding => Number((await pg.query(
      "select count(*)::int n from auth.users where raw_app_meta_data->>'role'='admin' and (banned_until is null or banned_until < now()) and id <> $1", [excluding || '00000000-0000-0000-0000-000000000000'])).rows[0].n);
    const fail = (status, error) => send(res, status, {error});
    const action = body?.action;
    if (action === 'list') {
      const rows = (await asService(() => pg.query("select id, email, coalesce(raw_app_meta_data->>'role','user') as role, email_confirmed_at, last_sign_in_at, created_at, (banned_until is not null and banned_until > now()) as disabled, coalesce(raw_app_meta_data->>'protected','') = 'true' as protected from auth.users order by created_at"))).rows;
      return send(res, 200, {users: rows});
    }
    if (action === 'create') {
      const {email, password, role = 'user'} = body;
      if (!EMAIL.test(email || '')) return fail(400, 'Enter a valid email address.');
      if (String(password || '').length < 8) return fail(400, 'Password must be at least 8 characters.');
      if (!['admin', 'user'].includes(role)) return fail(400, 'Role must be admin or user.');
      try {
        const row = (await asService(() => pg.query(
          "insert into auth.users (email, encrypted_password, raw_app_meta_data, email_confirmed_at) values ($1, extensions.crypt($2, extensions.gen_salt('bf')), $3::jsonb, now()) returning id, email",
          [email.toLowerCase(), password, JSON.stringify(role === 'admin' ? {role: 'admin'} : {})]))).rows[0];
        // The live project has a trigger that creates the main-site profile; mirror it here.
        const clean = value => String(value ?? '').trim().slice(0, 60);
        await asService(() => pg.query('insert into public."User" (auth_id, first_name, last_name) values ($1, $2, $3)', [row.id, clean(body.first_name) || email.split('@')[0], clean(body.last_name)]));
        return send(res, 201, {user: row});
      } catch (error) { return fail(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'That email already has an account.' : 'Could not create the user.'); }
    }
    if (action === 'update' || action === 'delete') {
      const id = body.id;
      if (!/^[0-9a-f-]{36}$/.test(id || '')) return fail(400, 'Missing user id.');
      const target = (await asService(() => pg.query("select id, coalesce(raw_app_meta_data->>'role','user') as role, (banned_until is not null and banned_until > now()) as disabled from auth.users where id=$1", [id]))).rows[0];
      if (!target) return fail(404, 'User not found.');
      const wasActiveAdmin = target.role === 'admin' && !target.disabled;
      if (action === 'delete') {
        if (id === self) return fail(400, 'You cannot delete your own account.');
        if ((await pg.query("select coalesce(raw_app_meta_data->>'protected','') = 'true' as p from auth.users where id=$1", [id])).rows[0]?.p) return fail(409, 'This account is protected and cannot be deleted.');
        if (wasActiveAdmin && await adminCount(id) < 1) return fail(400, 'You cannot remove the last admin.');
        const owns = (await pg.query('select exists (select 1 from public."ReportSpotStatus" r join public."User" u on u.user_id = r.user_id where u.auth_id = $1) as b', [id])).rows[0].b;
        if (owns) return fail(409, 'This account has reports or submissions, so it cannot be deleted. Disable it instead.');
        await asService(async () => {
          await pg.query('delete from public."User" where auth_id=$1', [id]);
          await pg.query('delete from auth.users where id=$1', [id]);
        });
        return send(res, 200, {ok: true});
      }
      const nextRole = body.role ?? target.role, nextDisabled = body.disabled ?? target.disabled;
      if (!['admin', 'user'].includes(nextRole)) return fail(400, 'Role must be admin or user.');
      if (id === self && (nextRole !== 'admin' || nextDisabled)) return fail(400, 'You cannot demote or disable yourself.');
      if (wasActiveAdmin && (nextRole !== 'admin' || nextDisabled) && await adminCount(id) < 1) return fail(400, 'You cannot remove the last admin.');
      if (body.email !== undefined && !EMAIL.test(body.email)) return fail(400, 'Enter a valid email address.');
      if (body.password !== undefined && String(body.password).length < 8) return fail(400, 'Password must be at least 8 characters.');
      try {
        await asService(async () => {
          await pg.query("update auth.users set raw_app_meta_data = case when $2 = 'admin' then raw_app_meta_data || '{\"role\":\"admin\"}'::jsonb else raw_app_meta_data - 'role' end, banned_until = case when $3::boolean then now() + interval '100 years' else null end where id=$1", [id, nextRole, nextDisabled]);
          if (body.email !== undefined) await pg.query('update auth.users set email=$2 where id=$1', [id, body.email.toLowerCase()]);
          if (body.password) await pg.query("update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')) where id=$1", [id, body.password]);
        });
      } catch (error) { return fail(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'That email already has an account.' : 'Could not update the user.'); }
      return send(res, 200, {ok: true});
    }
    return fail(400, 'Unknown action.');
  }

  async function auth(req, res, route, url, body) {
    if (route === 'token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const user = (await asService(() => pg.query("select id, email, raw_app_meta_data, email_confirmed_at, (banned_until is not null and banned_until > now()) as disabled, (encrypted_password = extensions.crypt($2, encrypted_password)) as ok from auth.users where email=$1", [String(body?.email || '').toLowerCase(), String(body?.password || '')]))).rows[0];
        if (!user || !user.ok) return authError(res, 400, 'invalid_credentials', 'Invalid login credentials');
        if (!user.email_confirmed_at) return authError(res, 400, 'email_not_confirmed', 'Email not confirmed');
        if (user.disabled) return authError(res, 400, 'user_banned', 'User is banned');
        await asService(() => pg.query('update auth.users set last_sign_in_at=now() where id=$1', [user.id]));
        return send(res, 200, await issue(user));
      }
      if (grant === 'refresh_token') {
        const id = refreshTokens.get(body?.refresh_token);
        const user = id && (await asService(() => pg.query("select id, email, raw_app_meta_data, (banned_until is not null and banned_until > now()) as disabled from auth.users where id=$1", [id]))).rows[0];
        if (!user || user.disabled) return authError(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token');
        refreshTokens.delete(body.refresh_token);
        return send(res, 200, await issue(user));
      }
    }
    if (route === 'logout') {
      const claims = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (claims) for (const [token, id] of refreshTokens) if (id === claims.sub) refreshTokens.delete(token);
      res.writeHead(204); return res.end();
    }
    if (route === 'user') {
      const claims = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
      if (!claims) return authError(res, 401, 'bad_jwt', 'Invalid JWT');
      return send(res, 200, {id: claims.sub, email: claims.email, app_metadata: claims.app_metadata});
    }
    return send(res, 404, {error: 'Not found'});
  }

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const cors = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ? {
      'Access-Control-Allow-Origin': origin, Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer, range, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, HEAD, OPTIONS',
      'Access-Control-Expose-Headers': 'Content-Range'} : {};
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      const url = new URL(req.url, 'http://local');
      let body;
      if (req.method === 'POST' || req.method === 'PATCH') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const text = Buffer.concat(chunks).toString();
        if (text) { try { body = JSON.parse(text); } catch { return send(res, 400, {code: 'PGRST102', message: 'Invalid JSON'}); } }
      }
      const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');
      const claims = verify(bearer);
      const [, service, ...rest] = url.pathname.split('/');
      if (service === 'auth') return await auth(req, res, rest.slice(1).join('/'), url, body);
      if (service === 'rest') {
        if (rest[1] === 'rpc') return await rpc(res, rest[2], claims, body);
        return await rest_(req, res, decodeURIComponent(rest[1] || ''), url, claims, body);
      }
      if (service === 'functions' && rest[1] === 'admin-users' && req.method === 'POST') return await adminUsers(res, claims, body);
      return send(res, 404, {error: 'Not found'});
    } catch (error) {
      return send(res, pgStatus(error.code), pgError(error));
    }
  });
  const rest_ = rest;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {server, pg, port: server.address().port, close: async () => { await new Promise(r => server.close(r)); await pg.close(); }};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.DEV_BACKEND_PORT || 54321);
  const backend = await createBackend({port});
  console.log(`Dev backend (local PGlite, resets on restart): http://127.0.0.1:${backend.port}\nDemo accounts are listed in tools/dev/seed.sql.`);
}
