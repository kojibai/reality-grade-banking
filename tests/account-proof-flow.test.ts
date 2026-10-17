/** Simulated native opening tests UI/transport composition ONLY. Canonical
 * forgery refusal is independently covered using the unmodified v129 SDK. A
 * positive production native source must be supplied by the Crystal task. */
import { beforeEach, expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { verifyAccountProof, exportAccountProof, isVerifiedAccountProof, type AccountStatement } from '../src/receiz/account-proof';
import { createAccountProofSharing } from '../src/receiz/account-proof-sharing';
import { verifyAccountProofContinuation } from '../src/receiz/account-proof-public';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
const state = vi.hoisted(() => ({ now: 100_000_000, statement: null as unknown, payloadDigest: '', sourceDigest: 'a'.repeat(64), writer: 'native.writer.receiz.id' }));
vi.mock('../src/receiz/account-proof-policy', () => ({ ACCOUNT_PROOF_WRITERS: ['native.writer.receiz.id'], ACCOUNT_PROOF_MAX_BYTES: 24 * 1024 * 1024, ACCOUNT_PROOF_EXPORT_AGE_PULSES: 30n }));
vi.mock('../src/receiz/client', async () => {
  const real = await vi.importActual<typeof import('@receiz/sdk')>('@receiz/sdk');
  return { loadReceiz: async () => ({ ...real, receizKaiNow: () => ({ uPulse: state.now }), createReceizClient: () => ({ artifacts: { verifyAndOpen: async () => ({ sealedArtifact: { kind: 'receiz.native-record-seal', artifactSha256: state.sourceDigest, continuity: { ownerReceizId: state.writer } }, verifiedPayload: { bytes: new TextEncoder().encode(JSON.stringify(state.statement)), sha256: state.payloadDigest } }) } }) }) };
});
let statement: AccountStatement;
const h = (c: string) => c.repeat(64);
async function file() {
  state.statement = structuredClone(statement); state.payloadDigest = await sdk.sha256ReceizBytes(new TextEncoder().encode(JSON.stringify(state.statement)));
  return new File([JSON.stringify({ schema: 'bankeiz.account-proof.v1', sdkVersion: '129.0.0', source: { schema: 'receiz.sealed-artifact-bytes.v124', exactBytesB64u: sdk.receizBase64UrlEncode(new TextEncoder().encode('simulation only')), filename: 'simulation.receiz', mimeType: 'application/octet-stream', artifactSha256: state.sourceDigest, payloadSha256: state.payloadDigest } })], 'simulation.json');
}
beforeEach(async () => {
  state.now = 100_000_000; state.writer = 'native.writer.receiz.id'; state.sourceDigest = h('a');
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']), raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const publicKeyRawB64u = sdk.receizBase64UrlEncode(raw), keyId = await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u, 'Ed25519');
  statement = { schema: 'bankeiz.public-account-statement.v1', applicationId: BANK_APPLICATION_ID, account: { receizId: 'example.receiz.id', keyId, alg: 'Ed25519', publicKeyRawB64u }, checkpoint: { accountHead: h('b'), identityBindingDigest: '', genesisHead: h('c'), historyHead: h('d'), transactionCount: 1, kaiUPulse: '100000000', reserveUsdCents: '500', settlementPhiMicro: '1000000', historyDigest: '' }, transactions: [{ sequence: 1, transactionId: 'first', eventDigest: h('d'), previousEventDigest: h('c'), kaiUPulse: '99000000', kind: 'credit', description: 'Simulation credit', reserveDeltaUsdCents: '500', settlementDeltaPhiMicro: '1000000' }] };
  statement.checkpoint.identityBindingDigest = await sdk.digestReceizCanonicalV122(statement.account);
  statement.checkpoint.historyDigest = await sdk.digestReceizCanonicalV122(statement.transactions);
});
it('retains exact read-only export custody and refuses reconstructed handles or stale new exports', async () => {
  const input = await file(), proof = await verifyAccountProof(input, { keyId: statement.account.keyId, artifactOwnerReceizId: statement.account.receizId });
  expect(isVerifiedAccountProof(proof)).toBe(true);
  expect(isVerifiedAccountProof(structuredClone(proof))).toBe(false);
  const saved = await exportAccountProof(proof); expect(saved.bytes).toEqual(new Uint8Array(await input.arrayBuffer()));
  saved.bytes.fill(0); expect((await exportAccountProof(proof)).bytes).not.toEqual(saved.bytes);
  state.now += 31_000_000; await expect(exportAccountProof(proof)).rejects.toThrow('REFRESH_REQUIRED');
  expect(isVerifiedAccountProof(proof)).toBe(true); // historical source, not latest-account authority
});
it('rejects unpinned writers, account substitution, corrupt commitments and future source time', async () => {
  const input = await file(); state.writer = 'unqualified.receiz.id'; await expect(verifyAccountProof(input)).rejects.toThrow('WRITER_NOT_PINNED'); state.writer = 'native.writer.receiz.id';
  await expect(verifyAccountProof(input, { keyId: h('f'), artifactOwnerReceizId: 'foreign.receiz.id' })).rejects.toThrow('OWNER_MISMATCH');
  statement.checkpoint.historyDigest = h('f'); await expect(verifyAccountProof(await file())).rejects.toThrow('HISTORY_DIGEST_MISMATCH');
  statement.checkpoint.historyDigest = await sdk.digestReceizCanonicalV122(statement.transactions); state.now = 1; await expect(verifyAccountProof(await file())).rejects.toThrow('FUTURE_SOURCE');
});
it('does not replace a verified snapshot with a different identity or a rewritten history', async () => {
  const prior = await verifyAccountProof(await file()); statement.account.receizId = 'foreign.receiz.id'; statement.checkpoint.identityBindingDigest = await sdk.digestReceizCanonicalV122(statement.account);
  const foreign = await verifyAccountProof(await file()); expect(() => verifyAccountProofContinuation(prior, foreign)).toThrow('CONTINUITY_MISMATCH');
  statement.account.receizId = 'example.receiz.id'; statement.checkpoint.identityBindingDigest = await sdk.digestReceizCanonicalV122(statement.account);
  statement.transactions = [{ ...statement.transactions[0], description: 'Rewritten old history' }]; statement.checkpoint.historyDigest = await sdk.digestReceizCanonicalV122(statement.transactions);
  const rewritten = await verifyAccountProof(await file()); expect(() => verifyAccountProofContinuation(prior, rewritten)).toThrow('CONTINUITY_MISMATCH');
});
it('requires exact disclosure consent, then confirms anonymous publication; revocation works without a fresh balance proof', async () => {
  const input = await file(), proof = await verifyAccountProof(input);
  let status = { schema: 'bankeiz.account-proof-sharing.v1', sharingHead: h('e'), liveUpdates: false, latestSourceDigest: null as string | null };
  const request = vi.fn(async (_path: string, method: string, body?: Record<string, unknown>) => {
    if (method === 'POST') { expect(body?.expectedSharingHead).toBe(status.sharingHead); status = { ...status, sharingHead: h('f'), liveUpdates: body?.action === 'publish' && body?.liveUpdates === true, latestSourceDigest: proof.sourceDigest }; } return status;
  });
  const signed: string[] = [];
  const api = createAccountProofSharing({ keyId: proof.statement.account.keyId, receizId: proof.statement.account.receizId, assertOpen: () => {}, request,
    signConsent: async challengeB64Url => { signed.push(challengeB64Url); return { schema: 'receiz.identity.login_proof.v1', keyId: proof.statement.account.keyId, alg: 'Ed25519', challengeB64Url, signatureB64Url: 'simulation-only' }; } });
  await expect(api.publish(proof, { approved: false, liveUpdates: true })).rejects.toThrow('CONSENT_REQUIRED'); expect(request).not.toHaveBeenCalled();
  const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(await input.text()));
  try {
    const result = await api.publish(proof, { approved: true, liveUpdates: true }); expect(result.status.liveUpdates).toBe(true); expect(result.url).toContain(`/verify/${proof.sourceDigest}/`);
    const body = request.mock.calls.find(v => v[1] === 'POST')?.[2]; expect(body?.liveUpdates).toBe(true); expect(JSON.stringify(body)).not.toMatch(/privateKey|passphrase|IdentitySeal|accessToken/u);
    expect(body?.consentProof).toMatchObject({ keyId: proof.statement.account.keyId, challengeB64Url: signed[0] });
    expect(JSON.parse(new TextDecoder().decode(sdk.receizBase64UrlDecode(signed[0])))).toMatchObject({ schema: 'bankeiz.account-proof-disclosure-consent.v1', command: { sourceDigest: proof.sourceDigest, accountHead: proof.statement.checkpoint.accountHead, liveUpdates: true } });
    expect(network.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
    state.now += 100_000_000; expect((await api.disable()).liveUpdates).toBe(false);
  } finally { network.mockRestore(); }
});

it('recovers accepted publication and revocation after a lost response without another consent or write', async () => {
  const input = await file(), proof = await verifyAccountProof(input);
  let status = { schema: 'bankeiz.account-proof-sharing.v1', sharingHead: h('e'), liveUpdates: false, latestSourceDigest: null as string | null }, writes = 0, signatures = 0;
  const api = createAccountProofSharing({ keyId: statement.account.keyId, receizId: statement.account.receizId, assertOpen: () => {},
    signConsent: async challengeB64Url => { signatures++; return { schema: 'receiz.identity.login_proof.v1', keyId: statement.account.keyId, alg: 'Ed25519', challengeB64Url, signatureB64Url: 'simulation-only' }; },
    request: async (_path, method, body) => {
      if (method === 'POST') { writes++; status = { ...status, sharingHead: h(writes === 1 ? 'f' : 'd'), liveUpdates: body?.action === 'publish', latestSourceDigest: proof.sourceDigest }; throw Error('response_lost'); }
      return status;
    } });
  const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(await input.text()));
  try {
    expect((await api.publish(proof, { approved: true, liveUpdates: true })).status.liveUpdates).toBe(true);
    expect((await api.publish(proof, { approved: true, liveUpdates: true })).status.liveUpdates).toBe(true);
    expect(writes).toBe(1); expect(signatures).toBe(1);
    state.now += 100_000_000;
    expect((await api.disable()).liveUpdates).toBe(false);
    expect((await api.disable()).liveUpdates).toBe(false);
    expect(writes).toBe(2); expect(signatures).toBe(2);
  } finally { network.mockRestore(); }
});

it('does not report a lost publication as accepted when its exact requested state is absent', async () => {
  const proof = await verifyAccountProof(await file()); let writes = 0;
  const status = { schema: 'bankeiz.account-proof-sharing.v1', sharingHead: h('e'), liveUpdates: true, latestSourceDigest: h('f') };
  const api = createAccountProofSharing({ keyId: statement.account.keyId, receizId: statement.account.receizId, assertOpen: () => {},
    signConsent: async challengeB64Url => ({ schema: 'receiz.identity.login_proof.v1', keyId: statement.account.keyId, alg: 'Ed25519', challengeB64Url, signatureB64Url: 'simulation-only' }),
    request: async (_path, method) => { if (method === 'POST') { writes++; throw Error('response_lost'); } return status; } });
  await expect(api.publish(proof, { approved: true, liveUpdates: true })).rejects.toThrow('response_lost');
  expect(writes).toBe(1);
});
