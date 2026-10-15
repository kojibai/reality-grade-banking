import { bankNoteRpId } from './config';
type JsonRequest = (path: string, options: { method: 'GET' | 'POST'; body?: Record<string, unknown> }) => Promise<unknown>;
const CEREMONY = '/api/wallet/notes/custody/attestation';
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
/** Private transport for the canonical browser custody adapter. Its responses
 * still require SDK certificate verification; no ticket grants note authority. */
export function createBankNoteAttestationFetch(input: { origin: string; request: JsonRequest; signal?: AbortSignal }): typeof fetch {
  const realm = new URL(input.origin);
  const rpId = bankNoteRpId(input.origin);
  if (realm.origin !== input.origin || !rpId) throw new Error('BANK_NOTE_TRANSPORT_REALM_INVALID');
  const target = `/api/connect/offline-notes/custody/attestation?origin=${encodeURIComponent(input.origin)}`;
  const tickets = new Map<string, { value: string; expiresAt: number }>();
  const assertOpen = () => { if (input.signal?.aborted) { tickets.clear(); throw new Error('BANK_NOTE_IDENTITY_CLOSED'); } };
  return async (resource, options) => {
    assertOpen();
    const url = new URL(resource instanceof Request ? resource.url : String(resource), input.origin);
    const method = (options?.method ?? (resource instanceof Request ? resource.method : 'GET')).toUpperCase();
    if (url.origin !== input.origin || url.pathname !== CEREMONY || url.search || url.hash || !['GET', 'POST'].includes(method)) throw new Error('BANK_NOTE_TRANSPORT_REQUEST_INVALID');
    for (const [key, ticket] of tickets) if (ticket.expiresAt <= Date.now()) tickets.delete(key);
    if (method === 'GET') {
      if (tickets.size >= 8) throw new Error('BANK_NOTE_CHALLENGE_LIMIT');
      const reply = object(await input.request(target, { method: 'GET' })); assertOpen();
      if (reply?.ok !== true || reply.origin !== input.origin || reply.rpId !== rpId || typeof reply.challengeB64u !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(reply.challengeB64u) || typeof reply.ticket !== 'string' || !reply.ticket || reply.ticket.length > 8192) throw new Error('BANK_NOTE_CHALLENGE_INVALID');
      tickets.set(reply.challengeB64u, { value: reply.ticket, expiresAt: Date.now() + 300_000 });
      return Response.json({ ok: true, origin: input.origin, rpId, challengeB64u: reply.challengeB64u }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (typeof options?.body !== 'string' || new TextEncoder().encode(options.body).length > 128 * 1024) throw new Error('BANK_NOTE_CHALLENGE_RESPONSE_INVALID');
    let body: Record<string, unknown> | null;
    try { body = object(JSON.parse(options.body)); } catch { throw new Error('BANK_NOTE_CHALLENGE_RESPONSE_INVALID'); }
    const challenge = typeof body?.challengeB64u === 'string' ? body.challengeB64u : '';
    const held = tickets.get(challenge);
    if (!held || !object(body?.response) || Object.keys(body!).some(key => !['challengeB64u', 'response'].includes(key))) throw new Error('BANK_NOTE_CHALLENGE_RESPONSE_INVALID');
    const result = await input.request(target, { method: 'POST', body: { challengeB64u: challenge, response: body!.response, ticket: held.value } }); assertOpen();
    tickets.delete(challenge);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  };
}
