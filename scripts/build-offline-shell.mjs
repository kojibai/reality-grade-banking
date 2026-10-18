import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fixedResources = [
  '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png',
  '/zk/document-seal.wasm', '/zk/document-seal.zkey', '/zk/kai-sigil.wasm', '/zk/kai-sigil.zkey',
  '/native/offline-notes.v129.mjs', '/native/receiver-verifier.v129.mjs',
  '/native/offline-notes.v129.manifest.json', '/native/receiver-verifier.v129.manifest.json',
  '/notes/banknote-engraving.webp', '/notes/denomination-engraving.png',
  '/notes/reserve-note-masthead.png', '/notes/settlement-note-masthead.png', '/notes/fonts/Cinzel.ttf',
  '/learn/proof-glass.webp', '/learn/reserve-note.webp', '/learn/settlement-note.webp',
  '/receiz-public-market.json', '/receiz-public-capitalization.json', '/receiz-public-sports.json', '/receiz-public-chart-history.json', '/receiz-public-ledger.json.gz.bin',
];

// Run after public/notice generation: their final HTML and embedded navigation
// payloads are part of the same executable build, rather than fetched later.
export async function buildOfflineShell(directory = 'dist', { fixed = fixedResources } = {}) {
  const root = resolve(directory), urls = new Set(['/index.html', ...fixed]);
  const manifest = JSON.parse(await readFile(resolve(root, '.vite/manifest.json'), 'utf8')), visited = new Set();
  function visit(key) {
    if (visited.has(key)) return; visited.add(key);
    const entry = manifest[key]; if (!entry) throw Error(`OFFLINE_ENTRY_MISSING:${key}`);
    for (const path of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) urls.add('/' + path);
    for (const dependency of [...entry.imports ?? [], ...entry.dynamicImports ?? []]) visit(dependency);
  }
  visit('index.html');
  if (manifest['verify/index.html']) { visit('verify/index.html'); urls.add('/verify/'); }
  if (manifest['receipt/index.html']) {visit('receipt/index.html');urls.add('/receipt/');}
  if (manifest['ledger/index.html']) {visit('ledger/index.html');urls.add('/ledger/');}
  // Vite emits module-worker files outside the entry's manifest dependency list.
  for (const name of await readdir(resolve(root, 'assets'))) if (/^worker-[\w-]+\.js$/.test(name)) urls.add('/assets/' + name);
  const index = await readFile(resolve(root, 'index.html'), 'utf8');
  const navigation = JSON.parse(index.match(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
  if (!navigation?.pages) throw Error('OFFLINE_FINAL_NAVIGATION_REQUIRED');
  const pages = { '/': '/index.html', '/index.html': '/index.html', '/receipt/':'/index.html' };
  if (manifest['verify/index.html']) { pages['/verify/'] = '/verify/'; pages['/verify'] = '/verify/'; }
  if (manifest['receipt/index.html']) pages['/receipt/']='/receipt/';
  if (manifest['ledger/index.html']) {pages['/ledger/']='/ledger/';pages['/ledger']='/ledger/';}
  for (const path of Object.keys(navigation.pages)) {
    if (!/^\/learn\/(?:[a-z0-9-]+\/)?$/.test(path) && path !== '/legal/') throw Error('OFFLINE_PUBLIC_ROUTE_INVALID');
    urls.add(path); pages[path] = path; if (path !== '/') pages[path.slice(0, -1)] = path;
  }
  for (const path of ['/index.html', ...Object.keys(navigation.pages)]) {
    const html = await readFile(resolve(root, path.slice(1) + (path.endsWith('/') ? 'index.html' : '')), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/(?:learn\/)[^"<>]+)"/g)) {
      const url = new URL(match[1], 'https://bankeiz.com');
      if (/\.(css|js|webp|png|svg)$/.test(url.pathname)) urls.add(url.pathname + url.search);
    }
  }
  const resources = [];
  for (const url of [...urls].sort()) {
    const path = new URL(url, 'https://bankeiz.com').pathname;
    const bytes = await readFile(resolve(root, path.slice(1) + (path.endsWith('/') ? 'index.html' : '')));
    resources.push({ url, sha256: hash(bytes), bytes: bytes.length });
  }
  const template = await readFile(new URL('../src/pwa/sw.template.js', import.meta.url), 'utf8');
  const version = hash(JSON.stringify({ resources, pages }) + template).slice(0, 24);
  const report = { schema: 'bankeiz.offline-build.v1', version, resources, pages };
  const integrity = Object.fromEntries(resources.map(({ url, ...entry }) => [url, entry]));
  const worker = template.replaceAll('__CACHE_VERSION__', version).replace('__SHELL_ASSETS__', JSON.stringify(resources.map(entry => entry.url)))
    .replace('__RESOURCE_HASHES__', JSON.stringify(integrity)).replace('__PAGE_ROUTES__', JSON.stringify(pages));
  await writeFile(resolve(root, 'sw.js'), worker); await writeFile(resolve(root, 'offline-build.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildOfflineShell(process.argv[2] ?? 'dist');
  console.log(`Built complete offline cache ${result.version}: ${result.resources.length} public resources, ${(result.resources.reduce((sum, entry) => sum + entry.bytes, 0) / 1024 / 1024).toFixed(1)} MiB. Account storage and APIs are excluded.`);
}
