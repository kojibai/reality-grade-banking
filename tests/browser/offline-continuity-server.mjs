// Disposable local-only production build harness. It never proxies financial
// requests, opens a real identity, or modifies a developer's normal browser origin.
import { createServer } from 'node:http';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { createInterface } from 'node:readline';
import { build } from 'esbuild';
import { buildOfflineShell } from '../../scripts/build-offline-shell.mjs';
const directory = await mkdtemp(join(tmpdir(), 'bankeiz-offline-continuity-'));
const versions = {};
for (const name of ['A', 'B']) {
  const target = join(directory, name);
  await cp('dist', target, { recursive: true, filter: path => !path.endsWith('.map') && !path.startsWith(resolve('dist/source')) && !path.startsWith('dist/source') });
  await writeFile(join(target, 'icon.svg'), (await readFile(join(target, 'icon.svg'), 'utf8')) + `\n<!-- disposable build ${name} -->`);
  versions[name] = await buildOfflineShell(target);
}
const helper = join(directory, 'fixture.js');
await build({ entryPoints: ['tests/browser/offline-continuity.ts'], outfile: helper, bundle: true, platform: 'browser', format: 'esm', target: 'es2022', external: ['node:*'], logLevel: 'silent' });
let selected = 'A', offline = false;
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.gz': 'application/gzip' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  try {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (url.pathname === '/__offline_continuity__/config') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(Object.values(versions))); return; }
    if (url.pathname === '/__offline_continuity__/fixture.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(await readFile(helper)); return; }
    if (url.pathname === '/__offline_continuity__/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bankeiz offline continuity test</title><style>body{font:15px system-ui;max-width:850px;margin:40px auto;padding:20px}nav{display:flex;gap:10px;flex-wrap:wrap}button{padding:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Offline continuity checks</h1><p>Isolated test origin. Dummy encrypted storage; no account enrollment, financial admission or funds.</p><nav></nav><pre>Ready</pre><figure></figure><script type="module" src="/__offline_continuity__/fixture.js"></script>'); return; }
    if (offline) { request.socket.destroy(); return; }
    const root = join(directory, selected), path = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path); response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream'); response.setHeader('Cache-Control', 'no-store'); response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
server.listen(5284, '127.0.0.1', () => console.log(JSON.stringify({ origin: 'http://127.0.0.1:5284', A: versions.A.version, B: versions.B.version, selected, offline })));
createInterface({ input: process.stdin }).on('line', line => { if (line === 'A' || line === 'B') selected = line; if (line === 'offline') offline = true; if (line === 'online') offline = false; console.log(JSON.stringify({ selected, offline })); });
async function stop() { server.closeAllConnections(); server.close(); await rm(directory, { recursive: true, force: true }); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
