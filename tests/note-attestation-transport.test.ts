import { expect, it, vi } from 'vitest';
import { createBankNoteAttestationFetch } from '../src/receiz/note-attestation-transport';
import { permittedNativePath } from '../src/receiz/native-transport';
const origin = 'https://bank.receiz.com';
const route = '/api/wallet/notes/custody/attestation';
const nonce = 'a'.repeat(43), otherNonce = 'b'.repeat(43);
it('permits only the exact delegated Bank attestation path, realm and two ceremony methods', () => {
  const path = '/api/connect/offline-notes/custody/attestation?origin=https%3A%2F%2Fbank.receiz.com';
  expect(permittedNativePath(path, 'GET')).toBe(true); expect(permittedNativePath(path, 'POST')).toBe(true);
  for (const candidate of [path + '&origin=https%3A%2F%2Fbank.receiz.com', path + '&extra=1', path.replace('bank.receiz.com', 'foreign.test'), path.replace('https%', 'http%'), path.split('?')[0]]) expect(permittedNativePath(candidate, 'POST')).toBe(false);
  expect(permittedNativePath(path, 'DELETE')).toBe(false);
});
it('routes the canonical ceremony through Receiz and carries its exact private challenge ticket', async () => {
  const request = vi.fn().mockResolvedValueOnce({ ok: true, origin, rpId: 'receiz.com', challengeB64u: nonce, ticket: 'private-fixture-ticket' }).mockResolvedValueOnce({ ok: true, certificate: { fixture: true } });
  const transport = createBankNoteAttestationFetch({ origin, request });
  expect((await (await transport(route, { method: 'GET' })).json()).ticket).toBeUndefined();
  const response = { id: 'fixture-platform-response' };
  expect(await (await transport(route, { method: 'POST', body: JSON.stringify({ challengeB64u: nonce, response }) })).json()).toEqual({ ok: true, certificate: { fixture: true } });
  expect(request.mock.calls[0]).toEqual(['/api/connect/offline-notes/custody/attestation?origin=https%3A%2F%2Fbank.receiz.com', { method: 'GET' }]);
  expect(request.mock.calls[1][1]).toEqual({ method: 'POST', body: { challengeB64u: nonce, response, ticket: 'private-fixture-ticket' } });
});
it('keeps concurrent ceremony tickets separate and never substitutes another challenge', async () => {
  const request = vi.fn().mockImplementation(async (_path, options) => options.method === 'GET' ? { ok: true, origin, rpId: 'receiz.com', challengeB64u: request.mock.calls.length === 1 ? nonce : otherNonce, ticket: request.mock.calls.length === 1 ? 'ticket-a' : 'ticket-b' } : { ok: true });
  const transport = createBankNoteAttestationFetch({ origin, request });
  await Promise.all([transport(route), transport(route)]);
  await transport(route, { method: 'POST', body: JSON.stringify({ challengeB64u: otherNonce, response: {} }) });
  await transport(route, { method: 'POST', body: JSON.stringify({ challengeB64u: nonce, response: {} }) });
  expect(request.mock.calls.slice(2).map(row => row[1].body.ticket)).toEqual(['ticket-b', 'ticket-a']);
});
it('refuses a foreign realm, unexpected network request, unsolicited response and disposed identity', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, origin: 'https://foreign.test', rpId: 'receiz.com', challengeB64u: nonce, ticket: 'fixture-ticket' });
  const controller = new AbortController(), transport = createBankNoteAttestationFetch({ origin, request, signal: controller.signal });
  await expect(transport(route)).rejects.toThrow('CHALLENGE');
  await expect(transport('https://foreign.test/api/wallet/notes/custody/attestation')).rejects.toThrow('TRANSPORT');
  await expect(transport(route, { method: 'POST', body: JSON.stringify({ challengeB64u: nonce, response: {} }) })).rejects.toThrow('CHALLENGE');
  expect(request).toHaveBeenCalledTimes(1);
  controller.abort(); await expect(transport(route)).rejects.toThrow('CLOSED');
  expect(request).toHaveBeenCalledTimes(1);
});
