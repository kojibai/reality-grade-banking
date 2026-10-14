import { afterEach, expect, it, vi } from 'vitest';
import { probeNativeQualification } from '../server/native-qualification-probe';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { BANK_NATIVE_OPERATIONS } from '../src/receiz/bank-native-readiness';
afterEach(() => { vi.unstubAllGlobals(); });
it('isolates only the exact already-requested native qualification families without exposing private material', async () => {
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return new Response('private-response-must-not-be-retained', { status: body.operations[0] === 'source-publication' ? 503 : 200, headers: { 'x-vercel-id': 'iad1::probe' } });
  });
  vi.stubGlobal('fetch', fetcher);
  const result = await probeNativeQualification(JSON.stringify({ applicationId: BANK_APPLICATION_ID, operations: BANK_NATIVE_OPERATIONS }), 'Bearer private-token');
  expect(result.map(item => [item.operation, item.status])).toEqual(BANK_NATIVE_OPERATIONS.map(operation => [operation, operation === 'source-publication' ? 503 : 200]));
  expect(JSON.stringify(result)).not.toContain('private');
  expect(fetcher).toHaveBeenCalledTimes(BANK_NATIVE_OPERATIONS.length);
  for (const [url, init] of fetcher.mock.calls) {
    expect(url).toBe(`https://receiz.com/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`);
    expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit', headers: { Authorization: 'Bearer private-token' } });
    expect(JSON.parse(init.body as string).operations).toHaveLength(1);
  }
});
it('refuses foreign, extra-field, nonqualification and unauthenticated inputs without any extra request', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const body of [{ applicationId: 'foreign', operations: ['subject-admission'] }, { applicationId: BANK_APPLICATION_ID, operations: ['reserve-transfer'] }, { applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'], artifact: 'private' }, { applicationId: BANK_APPLICATION_ID, operations: ['subject-admission', 'subject-admission'] }]) expect(await probeNativeQualification(JSON.stringify(body), 'Bearer private-token')).toEqual([]);
  expect(await probeNativeQualification('{}', undefined)).toEqual([]); expect(fetcher).not.toHaveBeenCalled();
});
