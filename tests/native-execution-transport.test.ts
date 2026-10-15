import { afterEach, expect, it, vi } from 'vitest';
import { createReceizClient } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { nativeFetch, permittedNativePath } from '../src/receiz/native-transport';
import { nativeRequestPath } from '../server/native-account';
import bankApi from '../api/index';

afterEach(() => vi.unstubAllGlobals());
const execution = `/api/sdk/v1/execution/${BANK_APPLICATION_ID}/execution%3Aone`;
const recovery = `/api/sdk/v1/execution/by-idempotency/${BANK_APPLICATION_ID}/value%3Asettlement/atomic/bank%3Apayment%3Aone`;
const appQuery = `?applicationId=${BANK_APPLICATION_ID}`;

it('permits the v129 exact execution outcome and original idempotency lookup routes', () => {
  for (const path of [execution, recovery]) {
    expect(nativeRequestPath(`/api/bank/native${path}`, 'GET')).toBe(path);
    expect(permittedNativePath(path, 'POST')).toBe(false);
    expect(permittedNativePath(`${path}?applicationId=${BANK_APPLICATION_ID}`, 'GET')).toBe(false);
  }
});

it('permits only the named SDK execution and authenticated recipient/replay POST routes', () => {
  for (const path of ['/api/sdk/v1/execution/stage', '/api/sdk/v1/execution/execute', '/api/sdk/v1/execution/cancel']) {
    expect(permittedNativePath(path + appQuery, 'POST')).toBe(true);
    expect(permittedNativePath(path, 'GET')).toBe(false);
    expect(permittedNativePath(path, 'POST')).toBe(false);
  }
  for (const path of ['/api/sdk/v1/identity/public-recipient/resolve', '/api/sdk/v1/domains/verified-additions', '/api/sdk/v1/domains/verified-replay', '/api/sdk/v1/domains/verified-checkpoint', '/api/sdk/v1/domains/verified-private-additions']) {
    expect(permittedNativePath(path + appQuery, 'POST')).toBe(true);
    expect(permittedNativePath(path, 'POST')).toBe(false);
    expect(permittedNativePath(path + appQuery, 'GET')).toBe(false);
    expect(permittedNativePath(path + '?applicationId=foreign', 'POST')).toBe(false);
  }
});

it('forwards the actual SDK stage request with its exact application query and plan', async () => {
  let observed: { url: string; body: unknown } | null = null;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    observed = { url: String(input), body: JSON.parse(String(init?.body)) };
    return Response.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  });
  const client = createReceizClient({ applicationId: BANK_APPLICATION_ID, accessToken: 'transport-test-only', fetchImpl: nativeFetch });
  const edge = await client.value.edge.planSettlement({ applicationId: BANK_APPLICATION_ID, amountPhiMicro: '1', sourceProofObjectId: 'fixture:source', sourceValueHead: 'a'.repeat(64), destinationSubjectId: 'fixture:destination', expectedDestinationHead: 'b'.repeat(64), usdPerPhiMicrocents: '1000000', priceBasis: { fixture: true }, attemptId: 'fixture:attempt', idempotencyKey: 'fixture:key' });
  await expect(client.execution.stage(edge.plan)).rejects.toMatchObject({ status: 401 });
  expect(observed).toEqual({ url: `/api/bank/native/api/sdk/v1/execution/stage${appQuery}`, body: { applicationId: BANK_APPLICATION_ID, plan: edge.plan } });
});

it('refuses foreign, ambiguous and malformed execution coordinates', () => {
  for (const path of [
    execution.replace(BANK_APPLICATION_ID, 'rc_foreign'), recovery.replace(BANK_APPLICATION_ID, 'rc_foreign'),
    `${execution}/extra`, `${recovery}/extra`, recovery.replace('atomic', '..'),
    recovery.replace('atomic', '%2e%2e'), recovery.replace('atomic', '%2F'),
    recovery.replace('atomic', '%5C'), recovery.replace('atomic', '%00'),
    recovery.replace('atomic', '%253A'), recovery.replace('atomic', '%3a'),
    recovery.replace('atomic', 'a'.repeat(257)),
  ]) expect(permittedNativePath(path, 'GET')).toBe(false);
});

it('lets the actual v129 recovery client reach the same-origin read-only transport', async () => {
  const requests: { url: string; method: string }[] = [];
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method ?? 'GET' });
    return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  });
  const client = createReceizClient({ applicationId: BANK_APPLICATION_ID, accessToken: 'transport-test-only', fetchImpl: nativeFetch });
  await expect(client.execution.resolveByIdempotencyKey({ applicationId: BANK_APPLICATION_ID, domainId: 'value:settlement', operationKind: 'atomic', semanticIdempotencyKey: 'bank:payment:one' })).rejects.toMatchObject({ status: 401 });
  expect(requests).toEqual([{ url: `/api/bank/native${recovery}`, method: 'GET' }]);
});

it('preserves an exact recovery lookup and private upstream refusal through the production gateway', async () => {
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401, headers: { 'Set-Cookie': 'ignored=1' } }));
  vi.stubGlobal('fetch', upstream);
  const response = await bankApi.fetch(new Request(`https://bankeiz.com/api/bank/native${recovery}`, { headers: { Authorization: 'Bearer transport-test-only', Cookie: 'do-not-forward' } }));
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(await response.json()).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  expect(upstream).toHaveBeenCalledExactlyOnceWith(`https://receiz.com${recovery}`, expect.objectContaining({ method: 'GET', credentials: 'omit', redirect: 'error', headers: { Accept: 'application/json', Authorization: 'Bearer transport-test-only' } }));
});
