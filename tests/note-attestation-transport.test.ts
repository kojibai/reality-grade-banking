import { expect, it, vi } from 'vitest';
import { createBankNoteAttestationFetch } from '../src/receiz/note-attestation-transport';
import { permittedNativePath } from '../src/receiz/native-transport';
import { noteRegistrationEvidence } from '../src/receiz/note-registration-evidence';
import { unattestedResponse } from './fixtures/note-registration';
const origin = 'https://bank.receiz.com';
const route = '/api/wallet/notes/custody/attestation';
const nonce = 'a'.repeat(43), otherNonce = 'b'.repeat(43);
it('permits only the exact delegated Bank attestation path, realm and two ceremony methods', () => {
  const path = '/api/connect/offline-notes/custody/attestation?origin=https%3A%2F%2Fbank.receiz.com';
  expect(permittedNativePath(path, 'GET')).toBe(true); expect(permittedNativePath(path, 'POST')).toBe(true);
  for (const candidate of [path + '&origin=https%3A%2F%2Fbank.receiz.com', path + '&extra=1', path.replace('bank.receiz.com', 'foreign.test'), path.replace('https%', 'http%'), path.split('?')[0]]) expect(permittedNativePath(candidate, 'POST')).toBe(false);
  expect(permittedNativePath(path, 'DELETE')).toBe(false);
  for (const origin of ['constructor', '__proto__', 'toString']) expect(permittedNativePath('/api/connect/offline-notes/custody/attestation?origin=' + origin, 'GET')).toBe(false);
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

it('binds Bankeiz ceremonies to its own RP and rejects cross-domain certificates', async () => {
  const bankeizOrigin = 'https://bankeiz.com';
  const path = '/api/connect/offline-notes/custody/attestation?origin=https%3A%2F%2Fbankeiz.com';
  expect(permittedNativePath(path, 'GET')).toBe(true); expect(permittedNativePath(path, 'POST')).toBe(true);
  expect(permittedNativePath('/api/connect/offline-notes/funding?origin=https%3A%2F%2Fbankeiz.com', 'POST')).toBe(true);
  expect(permittedNativePath('/api/connect/offline-notes/redemption?origin=https%3A%2F%2Fbankeiz.com', 'POST')).toBe(true);
  const request = vi.fn().mockResolvedValueOnce({ ok: true, origin: bankeizOrigin, rpId: 'bankeiz.com', challengeB64u: nonce, ticket: 'bankeiz-fixture-ticket' }).mockResolvedValueOnce({ ok: true, origin: bankeizOrigin, rpId: 'receiz.com', challengeB64u: otherNonce, ticket: 'wrong-realm' });
  const transport = createBankNoteAttestationFetch({ origin: bankeizOrigin, request });
  expect(await (await transport(route)).json()).toMatchObject({ origin: bankeizOrigin, rpId: 'bankeiz.com' });
  await expect(transport(route)).rejects.toThrow('CHALLENGE');
});
it('preserves the exact missing-attestation failure from Receiz without retrying or substituting a certificate',async()=>{
 const failure=new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED'),request=vi.fn().mockResolvedValueOnce({ok:true,origin,rpId:'receiz.com',challengeB64u:nonce,ticket:'private-fixture-ticket'}).mockRejectedValueOnce(failure);
 const transport=createBankNoteAttestationFetch({origin,request});await transport(route);
 await expect(transport(route,{method:'POST',body:JSON.stringify({challengeB64u:nonce,response:{id:'fixture'}})})).rejects.toBe(failure);
 expect(request).toHaveBeenCalledTimes(2);expect(failure.message).not.toContain('private-fixture-ticket');
});
it('keeps the exact registration response and failure while attaching only bounded browser diagnostics', async () => {
 const failure = new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED'), response = unattestedResponse();
 const request = vi.fn().mockResolvedValueOnce({ok:true,origin,rpId:'receiz.com',challengeB64u:nonce,ticket:'private-fixture-ticket'}).mockRejectedValueOnce(failure);
 const transport = createBankNoteAttestationFetch({origin,request}); await transport(route);
 await expect(transport(route,{method:'POST',body:JSON.stringify({challengeB64u:nonce,response})})).rejects.toBe(failure);
 expect(request.mock.calls[1][1].body.response).toEqual(response);
 expect(failure.message).toBe('OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED');
 expect(noteRegistrationEvidence(failure)).toEqual({format:'none',counter:'0',userVerified:true,backupEligible:true,backedUp:true});
 expect(JSON.stringify(noteRegistrationEvidence(failure))).not.toMatch(/credential|client-data|extension|ticket/);
 expect(noteRegistrationEvidence(new Error(failure.message))).toBeNull();
});
