import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { nativeAccountMiddleware } from '../server/native-account';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function output() {
  const chunks:Buffer[]=[];
  const response=Object.assign(new Writable({write(chunk,_encoding,done){chunks.push(Buffer.from(chunk));done();}}),{setHeader:vi.fn(),writeHead:vi.fn()});
  return {response:response as unknown as ServerResponse,chunks,status:response.writeHead};
}
it('correlates a refused qualification without logging its private request or response', async () => {
  const request = Object.assign(Readable.from([Buffer.from(JSON.stringify({ applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'] }))]), {
    url: `/api/bank/native/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`, method: 'POST',
    headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173', authorization: 'Bearer private-bearer', 'content-type': 'application/json' },
  }) as IncomingMessage;
  const body = JSON.stringify({ ok: false, code: 'SERVICE_CAPACITY_UNAVAILABLE', privateMaterial: 'private-source' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 503, headers: { 'x-vercel-id': 'iad1::iad1::request-coordinate', 'x-vercel-error': 'private-server-message' } })));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const {response,chunks,status}=output();
  await nativeAccountMiddleware(request, response, vi.fn());
  expect(warn).toHaveBeenCalledWith('receiz-bank native qualification', { status: 503, requestId: 'iad1::iad1::request-coordinate' });
  expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  expect(status).toHaveBeenCalledWith(503, expect.objectContaining({'content-type':'application/json'})); expect(Buffer.concat(chunks)).toEqual(Buffer.from(body));
});
it('discards an arbitrary upstream header instead of logging it', async () => {
  const request = Object.assign(Readable.from(['{}']), { url: `/api/bank/native/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`, method: 'POST', headers: { host: '127.0.0.1:4173', 'content-type': 'application/json' } }) as IncomingMessage;
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503, headers: { 'x-vercel-id': 'Bearer private secret' } })));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  await nativeAccountMiddleware(request, output().response, vi.fn());
  expect(warn).toHaveBeenCalledWith('receiz-bank native qualification', { status: 503, requestId: null });
});
