import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile('dist/offline-build.json', 'utf8'));
assert.equal(manifest.schema, 'bankeiz.offline-build.v1');
assert.match(manifest.version, /^[a-f0-9]{24}$/);
const sw = await readFile('dist/sw.js', 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
assert.deepEqual(shell, manifest.resources.map(entry => entry.url));
assert.equal(new Set(shell).size, shell.length);
assert.ok(!/skipWaiting\s*\(|clients\.claim\s*\(|indexedDB|localStorage/.test(sw), 'Updates must preserve existing client lifetime and private storage.');
assert.ok(!shell.some(url => url.startsWith('/api/') || /source\/|\.map$/.test(url)), 'Never precache private APIs, source downloads or source maps.');
for (const url of ['/index.html', '/native/offline-notes.v129.mjs', '/native/receiver-verifier.v129.mjs', '/notes/banknote-engraving.webp', '/notes/denomination-engraving.png', '/notes/fonts/Cinzel.ttf', '/zk/document-seal.wasm', '/zk/document-seal.zkey', '/zk/kai-sigil.wasm', '/zk/kai-sigil.zkey', '/learn/', '/learn/receiz-id/', '/legal/']) assert.ok(shell.includes(url), `Required offline resource missing: ${url}`);
assert.ok(shell.some(url => url.includes('qr-decoder')), 'The lazy camera decoder must also be available offline.');
assert.ok(shell.includes('/snarkjs.min.js'),'The canonical proof browser verifier must be available at its SDK default URL offline.');
assert.ok(shell.includes('/verify/'), 'The public account-proof reader must be available offline after installation.');
assert.ok(shell.includes('/ledger/'), 'Public Ledger has a complete retained offline read entry.');
assert.equal(manifest.pages['/ledger/'], '/ledger/', 'Public Ledger links reopen their own entry offline.');
for (const entry of manifest.resources) {
  const url = new URL(entry.url, 'https://bankeiz.com');
  assert.equal(url.origin, 'https://bankeiz.com');
  const bytes = await readFile('dist' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
  assert.equal(bytes.length, entry.bytes, entry.url);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.url);
}
const navigation = JSON.parse((await readFile('dist/index.html', 'utf8')).match(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/)[1]);
for (const path of Object.keys(navigation.pages)) assert.equal(manifest.pages[path], path, `Missing offline public route ${path}`);
console.log(`Verified complete offline build ${manifest.version}: ${shell.length} exact public resources, final public routes, lazy decoder and safe waiting updates.`);

assert.equal(manifest.pages['/receipt/'], '/receipt/', 'Receipt links must reopen offline using their retained read-only entry.');
