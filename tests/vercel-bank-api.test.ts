import { afterEach, expect, it, vi } from 'vitest';
import bankApi from '../api/index';
import { BANK_APPLICATION_ID } from '../src/receiz/config';

afterEach(() => vi.unstubAllGlobals());
const origin = 'https://bank.example';
const request = (path: string, init?: RequestInit) => new Request(`${origin}${path}`, init);

it('routes enrollment through the existing handler with exact bytes and no cookie forwarding', async () => {
  const upstream = vi.fn<typeof fetch>(async () => new Response('{"ok":false,"error":"fixture_refusal"}', { status: 403, headers: { 'Set-Cookie': 'private-session=not-for-bank' } }));
  vi.stubGlobal('fetch', upstream);
  const body = ' { "fixture": "exact bytes Φ", "spaces": [ 1,  2 ] }\n';
  const response = await bankApi.fetch(request('/api/bank/native/api/signer/v4/receiz/enroll', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: 'private-cookie', Authorization: 'Bearer fixture-only' }, body }));
  expect(response.status).toBe(403);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(await response.text()).toBe('{"ok":false,"error":"fixture_refusal"}');
  expect(upstream.mock.calls[0][0]).toBe('https://receiz.com/api/signer/v4/receiz/enroll');
  expect(upstream.mock.calls[0][1]).toMatchObject({ method: 'POST', body, credentials: 'omit', redirect: 'error', headers: { Authorization: 'Bearer fixture-only' } });
  expect(JSON.stringify(upstream.mock.calls[0][1])).not.toContain('private-cookie');
});

it('preserves native query coordinates and upstream refusals without an HTML fallback', async () => {
  const upstream = vi.fn<typeof fetch>(async () => new Response('{"ok":false,"code":"UNAUTHORIZED"}', { status: 401 }));
  vi.stubGlobal('fetch', upstream);
  const path = `/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`;
  const response = await bankApi.fetch(request(`/api/bank/native${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  expect(upstream.mock.calls[0][0]).toBe(`https://receiz.com${path}`);
});

it('serves public proof bytes without changing their contents or carrying private authority', async () => {
  const original = new Uint8Array([0, 255, 254, 13, 10, 128]);
  const upstream = vi.fn<typeof fetch>(async () => new Response(original, { headers: { 'Content-Type': 'application/octet-stream' } }));
  vi.stubGlobal('fetch', upstream);
  const path = '/api/profile/originals/download?receizId=fixture&kind=original';
  const response = await bankApi.fetch(request(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`, { headers: { Cookie: 'private-cookie', Authorization: 'Bearer private-authority' } }));
  expect(response.status).toBe(200);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(original);
  expect(JSON.stringify(upstream.mock.calls[0][1])).not.toContain('private');
});

it('serves the public graph through the existing public ledger handler', async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ public: 'graph-fixture' })); vi.stubGlobal('fetch', upstream);
  const response = await bankApi.fetch(request('/api/bank/public-network?source=graph'));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ public: 'graph-fixture' });
  expect(String(upstream.mock.calls[0][0])).toBe('https://receiz.com/api/proof-graph/ledger');
});

it('streams large public originals in bounded chunks with identical complete bytes', async () => {
  const original = new Uint8Array(5 * 1024 * 1024).map((_, index) => index % 251);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(original, { headers: { 'Content-Type': 'application/octet-stream' } })));
  const path = '/api/profile/originals/download?receizId=large_fixture&kind=original';
  const response = await bankApi.fetch(request(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`));
  expect(response.status).toBe(200);
  const reader = response.body!.getReader(), chunks: Uint8Array[] = [];
  for (;;) { const chunk = await reader.read(); if (chunk.done) break; expect(chunk.value.length).toBeLessThanOrEqual(64 * 1024); chunks.push(chunk.value); }
  expect(Buffer.concat(chunks).equals(Buffer.from(original))).toBe(true);
});

it('refuses unsupported routes, mutation methods, foreign origins and arbitrary upstreams without a fetch', async () => {
  const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
  expect((await bankApi.fetch(request('/api/bank/unknown'))).status).toBe(404);
  expect((await bankApi.fetch(request('/api/bank/public-market/membership', { method: 'POST' }))).status).toBe(405);
  expect((await bankApi.fetch(request('/api/bank/native/api/connect/wallet/me?url=https://evil.example'))).status).toBe(400);
  expect((await bankApi.fetch(request('/api/bank/native/api/signer/v4/receiz/enroll', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }))).status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});
