import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV_NAMES = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_REPORTS_TABLE'];
const PUBLIC_FILES = new Set(['index.html','styles.css','app.js','database.js','wsc-plans.js']);
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8'};

export function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !ENV_NAMES.includes(match[1])) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { throw new Error('Invalid quotes in .env.'); }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1,-1);
    else value = value.replace(/\s+#.*$/, '').trim();
    result[match[1]] = value;
  }
  return result;
}

export function validateSettings(input) {
  const url = String(input.url || '').trim();
  const key = String(input.key || '').trim();
  const table = String(input.table || 'user_reports').trim();
  if (!url || !key) throw new Error('Enter both the Supabase project URL and its publishable key.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Use a valid Supabase project URL.'); }
  const local = ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || !['','/'].includes(parsed.pathname)) {
    throw new Error('Use the project base URL, such as https://your-project.supabase.co, without an API path.');
  }
  // Reject privileged keys rather than letting one reach browser code.
  if (!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key)) {
    throw new Error('Use an sb_publishable_ key from Supabase Settings → API Keys. Secret and service-role keys are not accepted.');
  }
  if (table!=='ReportSpotStatus' && !/^[a-z][a-z0-9_]{0,62}$/.test(table)) throw new Error('Use ReportSpotStatus or a lowercase table name with letters, numbers, or underscores.');
  return {url:parsed.origin, key, table};
}

export function createAppServer({root=APP_ROOT, configFile=path.join(root,'.env')} = {}) {
  async function loadSettings() {
    let text = '';
    try { text = await readFile(configFile,'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const values = parseEnv(text);
    const input = {url:values.SUPABASE_URL || '', key:values.SUPABASE_PUBLISHABLE_KEY || '', table:values.SUPABASE_REPORTS_TABLE || 'user_reports'};
    if (!input.url && !input.key) return {...input,configured:false};
    return {...validateSettings(input),configured:true};
  }
  function json(response,status,value) {
    response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(JSON.stringify(value));
  }
  return http.createServer(async (request,response) => {
    // Loopback bind plus a Host check prevents remote access and DNS rebinding.
    let host;
    try { host = new URL(`http://${request.headers.host}`); } catch { return json(response,400,{error:'Invalid host.'}); }
    if (!['localhost','127.0.0.1','[::1]'].includes(host.hostname)) return json(response,403,{error:'This setup server is local-only.'});
    response.setHeader('Referrer-Policy','no-referrer');
    const route = new URL(request.url,host).pathname;
    try {
      if (route === '/api/config' && request.method === 'GET') {
        const config = await loadSettings();
        return json(response,200,config);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return json(response,405,{error:'Method not allowed.'});
      let relative;
      try { relative = decodeURIComponent(route).replace(/^\/+/, '') || 'index.html'; } catch { return json(response,400,{error:'Invalid path.'}); }
      if (relative.includes('\\') || relative.split('/').some(part => part.startsWith('.') || part === '..') || (!PUBLIC_FILES.has(relative) && !relative.startsWith('assets/'))) return json(response,404,{error:'Not found.'});
      const rootPath = await realpath(root);
      const filename = await realpath(path.join(rootPath,relative));
      if (!filename.startsWith(rootPath + path.sep) || !(await stat(filename)).isFile()) return json(response,404,{error:'Not found.'});
      const contents = await readFile(filename);
      response.writeHead(200,{'Content-Type':TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      if (error.code === 'ENOENT') return json(response,404,{error:'Not found.'});
      return json(response,500,{error:'Could not load app settings or files. Check the local .env and project folder.'});
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a number from 1 to 65535.');
  const server = createAppServer();
  server.on('error',error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop that server or choose a different PORT.` : 'The local app server could not start.'); process.exitCode=1; });
  server.listen(port,'127.0.0.1',() => console.log(`Study BYU: http://127.0.0.1:${port}\nConnection settings are read only from your local .env.`));
}
