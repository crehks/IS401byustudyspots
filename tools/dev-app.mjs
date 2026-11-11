// Runs the real app server (index.html and admin.html) against the local dev backend instead of .env.
// Test branch only: pair it with `npm run dev:backend`. Reads tools/dev/local.env, never the real .env.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer, APP_ROOT } from '../server.mjs';

const port = Number(process.env.PORT || 3000);
const configFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dev', 'local.env');
const server = createAppServer({ root: APP_ROOT, configFile });
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : 'The dev app server could not start.'); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`Dev app (local backend): http://127.0.0.1:${port}\nMain site: /   Dev page: /admin.html`));
