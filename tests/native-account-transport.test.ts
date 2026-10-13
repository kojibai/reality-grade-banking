import { expect, it, vi, afterEach } from 'vitest';
import { nativeRequestPath } from '../server/native-account';
import { nativeFetch } from '../src/receiz/native-transport';
afterEach(() => vi.unstubAllGlobals());
it('allows only the actual read and identity contracts, with no arbitrary destination or financial mutation', () => {
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'GET')).toBe('/api/connect/wallet/me');
  for (const path of ['/api/bank/native/api/connect/transfers', '/api/bank/nativehttps://other.example', '/api/bank/native/api/connect/wallet/me?user=foreign']) expect(nativeRequestPath(path, 'POST')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'POST')).toBeNull();
});
it('sends the exact SDK request only to the same-origin bank transport without cookies or redirects', async () => {
  const request = vi.fn<typeof fetch>(async () => new Response('{}')); vi.stubGlobal('fetch', request);
  await nativeFetch('https://receiz.com/api/connect/wallet/me', { headers: { Authorization: 'Bearer held-in-test' } });
  expect(request.mock.calls[0][0]).toBe('/api/bank/native/api/connect/wallet/me');
  expect(request.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
  expect(() => nativeFetch('https://foreign.example/api/connect/wallet/me')).toThrow();
});
