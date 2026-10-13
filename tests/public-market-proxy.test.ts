import { afterEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicMarketMiddleware, resolvePublicMarketTarget } from '../server/public-market';
afterEach(() => vi.unstubAllGlobals());
it('allows only fixed public Receiz contracts with bounded query arguments', () => {
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership')?.href).toBe('https://receiz.com/api/market/public-membership');
  expect(resolvePublicMarketTarget('/api/bank/public-market/quotes')?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full');
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership?url=https://evil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/secret')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=https%3A%2F%2Fevil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=%2Fapi%2Fconnect%2Fwallet%2Fme')).toBeNull();
  const path = '/api/profile/originals/download?receizId=a1&kind=original';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`)?.pathname).toBe('/api/profile/originals/download');
});
it('reads only public GET data and never forwards cookies or bearer authority', async () => {
  const fetchSource = vi.fn(async () => new Response(JSON.stringify({ ok: true, transport: { generatedAt: 'now', publicMembership: {}, wallet: { private: true }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', profileOriginal: { longForm: { text: 'Full work' }, media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original' } } }] } }), { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchSource);
  let body = '', status = 0;
  const res = { setHeader: vi.fn(), writeHead: (code: number) => { status = code; }, end: (bytes: Uint8Array) => { body = new TextDecoder().decode(bytes); } } as unknown as ServerResponse;
  await publicMarketMiddleware({ method: 'GET', url: '/api/bank/public-market/membership', headers: { cookie: 'secret-cookie', authorization: 'Bearer secret' } } as IncomingMessage, res, vi.fn());
  expect(status).toBe(200);
  const options = fetchSource.mock.calls[0] as unknown as [URL, RequestInit];
  expect(options[0].origin).toBe('https://receiz.com'); expect(options[1].credentials).toBe('omit'); expect(options[1].redirect).toBe('error');
  expect(JSON.stringify(options[1])).not.toContain('secret'); expect(body).not.toContain('Full work'); expect(body).not.toContain('wallet');
});
it('rejects mutation methods before contacting Receiz', async () => {
  const fetchSource = vi.fn(); vi.stubGlobal('fetch', fetchSource); let status = 0;
  const res = { setHeader: vi.fn(), writeHead: (code: number) => { status = code; }, end: vi.fn() } as unknown as ServerResponse;
  await publicMarketMiddleware({ method: 'POST', url: '/api/bank/public-market/membership' } as IncomingMessage, res, vi.fn());
  expect(status).toBe(405); expect(fetchSource).not.toHaveBeenCalled();
});
