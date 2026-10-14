import { expect, it, vi, afterEach } from 'vitest';
import { nativeRequestPath } from '../server/native-account';
import { nativeFetch } from '../src/receiz/native-transport';
import { createReceizClient } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
afterEach(() => vi.unstubAllGlobals());
it('allows only named identity, shared-read and card contracts, with no arbitrary destination or transfer', () => {
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'GET')).toBe('/api/connect/wallet/me');
  for (const path of ['/api/bank/native/api/connect/transfers', '/api/bank/nativehttps://other.example', '/api/bank/native/api/connect/wallet/me?user=foreign']) expect(nativeRequestPath(path, 'POST')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'POST')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/connect/payments/checkout', 'POST')).toBe('/api/connect/payments/checkout');
  expect(nativeRequestPath('/api/bank/native/api/connect/payments/session?sessionId=cs_test_12345678', 'GET')).toBe('/api/connect/payments/session?sessionId=cs_test_12345678');
  for (const suffix of ['?sessionId=cs_test_12345678&sessionId=cs_other_12345678', '?sessionId=bad', '?sessionId=cs_test_12345678&url=https://evil.example']) expect(nativeRequestPath(`/api/bank/native/api/connect/payments/session${suffix}`, 'GET')).toBeNull();
  expect(nativeRequestPath('/api/bank/nativehttps://receiz.com/api/connect/payments/checkout', 'POST')).toBeNull();
});
it('sends the exact SDK request only to the same-origin bank transport without cookies or redirects', async () => {
  const request = vi.fn<typeof fetch>(async () => new Response('{}')); vi.stubGlobal('fetch', request);
  await nativeFetch('https://receiz.com/api/connect/wallet/me', { headers: { Authorization: 'Bearer held-in-test' } });
  expect(request.mock.calls[0][0]).toBe('/api/bank/native/api/connect/wallet/me');
  expect(request.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
  expect(() => nativeFetch('https://foreign.example/api/connect/wallet/me')).toThrow();
});
it('carries the real SDK qualification application coordinate without opening arbitrary native queries', async () => {
  const target = `/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`;
  expect(nativeRequestPath(`/api/bank/native${target}`, 'POST')).toBe(target);
  for (const query of ['', '?applicationId=foreign', `?applicationId=${BANK_APPLICATION_ID}&applicationId=${BANK_APPLICATION_ID}`, `?applicationId=${BANK_APPLICATION_ID}&url=https://evil.example`]) {
    expect(nativeRequestPath(`/api/bank/native/api/sdk/v1/runtime/qualify${query}`, 'POST')).toBeNull();
  }
  expect(nativeRequestPath(`/api/bank/native${target}`, 'GET')).toBeNull();
});
it('forwards the actual SDK qualification wire instead of refusing its application query locally', async () => {
  const target = `/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`;
  // Real SDK wire composition, with a refused transport reply. This admits no
  // identity, session or capability report and exercises no live private ID.
  const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ ok: false, code: 'APPLICATION_MISMATCH', writes: 0 }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', request);
  const client = createReceizClient({ applicationId: BANK_APPLICATION_ID, accessToken: 'boundary-fixture', fetchImpl: nativeFetch });
  await expect(client.runtime.qualifyV124({ applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'] })).rejects.toMatchObject({ status: 400 });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(`/api/bank/native${target}`);
  expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({ applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'] });
});
