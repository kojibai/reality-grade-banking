import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run after `vercel build --prod`. Exercises the emitted Node function, not
// Vite's TS loader. Fixture-only upstreams: no ID, enrollment or funds created.
const root = new URL('../.vercel/output/', import.meta.url);
const config = JSON.parse(await readFile(new URL('config.json', root), 'utf8'));
for (const path of ['/api/bank/native/api/signer/v4/receiz/enroll', '/api/bank/public-market/membership', '/api/bank/public-network', '/api/bank/ledger-proof']) {
  const route = config.routes.find(item => item.src && item.dest && new RegExp(item.src).test(path));
  assert.equal(route?.dest, '/api/index', 'Bank rewrite must reach the emitted function without added query fields.');
}
const { default: api } = await import(new URL('functions/api/index.func/api/index.js', root));
assert.equal(typeof api.fetch, 'function', 'The compiled Node entry must load without Vite.');
const realFetch = globalThis.fetch;
let calls = 0;
const body = ' { "fixture": "original bytes Φ", "spaces": [ 1,  2 ] }\n';
try {
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://receiz.com/api/signer/v4/receiz/enroll');
    assert.equal(init.body, body);
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Cookie, undefined);
    return new Response('{"ok":false,"error":"fixture_refusal"}', { status: 403, headers: { 'Set-Cookie': 'fixture=not-forwarded' } });
  };
  const response = await api.fetch(new Request('https://bank.example/api/bank/native/api/signer/v4/receiz/enroll', { method: 'POST', headers: { Origin: 'https://bank.example', 'Content-Type': 'application/json', Cookie: 'fixture-private-cookie' }, body }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(await response.text(), '{"ok":false,"error":"fixture_refusal"}');
  assert.equal(calls, 1);
  assert.equal((await api.fetch(new Request('https://bank.example/api/bank/unknown'))).status, 404);
  assert.equal(calls, 1);
  const original = new Uint8Array([0, 255, 128, 10, 13]);
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://receiz.com/api/ledger/proof?source=' + 'a'.repeat(64));
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).has('authorization'), false);
    assert.equal(new Headers(init.headers).has('cookie'), false);
    return new Response(original, { headers: { 'Content-Type': 'application/octet-stream' } });
  };
  const ledger = await api.fetch(new Request('https://bank.example/api/bank/ledger-proof?source=' + 'a'.repeat(64), { headers: { Cookie: 'private', Authorization: 'Bearer private' } }));
  assert.equal(ledger.status, 200, 'The emitted production function must contain the public Ledger dispatcher.');
  assert.deepEqual(new Uint8Array(await ledger.arrayBuffer()), original);
  globalThis.fetch = async () => Response.json({ error: 'PUBLIC_LEDGER_SOURCE_UNAVAILABLE' }, { status: 503 });
  const unavailable = await api.fetch(new Request('https://bank.example/api/bank/ledger-proof'));
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: 'PUBLIC_LEDGER_SOURCE_UNAVAILABLE' });
  console.log('PASS: compiled production enrollment and Ledger dispatch, exact source bytes, source refusals, private response isolation and unknown-route refusal.');
} finally { globalThis.fetch = realFetch; }
