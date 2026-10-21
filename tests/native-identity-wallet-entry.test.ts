import { beforeEach, expect, it, vi } from 'vitest';
import { ReceizHttpError } from '@receiz/sdk';
import { BANK_APPLICATION_ID, BANK_READ_SCOPES } from '../src/receiz/config';
import {portfolioFixture} from './fixtures/market-portfolio';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import { openCanonicalIdentity } from '../src/receiz/native-identity';

// Real connection, parsing and adoption choreography; isolate admission,
// encrypted persistence and authenticated HTTP at their external boundaries.
const p = vi.hoisted(() => ({ retainedPortfolio:null as unknown,cachedWallet:null as unknown,portfolioSave:vi.fn(), pulse: 100, scopes: vi.fn(), wallet: vi.fn(), continuation: vi.fn(), grant: vi.fn(), challenge: vi.fn(), request: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/identity-vault', async original => ({ ...await original<typeof import('../src/receiz/identity-vault')>(), loadWalletObservation: async () => p.cachedWallet, loadMarketPortfolioState:async()=>p.retainedPortfolio,saveMarketPortfolioState:p.portfolioSave, loadAccountLedgerState: async () => null, saveWalletObservation: p.save }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  ReceizHttpError,
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }),
  createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }),
  isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ keyId: 'fixture-key', artifactSha256: 'a'.repeat(64), artifactOwnerReceizId: 'owner.receiz.id' }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'local-owner', username: 'owner' }, issuedAt: '2026-10-13T00:00:00Z', keyId: 'fixture-key', crypto: {} }),
  projectReceizIdentityAccount: async () => ({ authority: 'identity-only' }),
  receizKaiNow: () => ({ pulse: p.pulse, uPulse: p.pulse * 1_000_000 }),
  sha256ReceizBytes: async () => 'a'.repeat(64),
  createReceizProofAuthorityChallenge: p.challenge,
  createReceizClient: ({ accessToken, applicationId = BANK_APPLICATION_ID }: { accessToken?: string; applicationId?: string } = {}) => accessToken
    ? { auth: { grantedScopes: () => p.scopes(accessToken) }, connect: { wallet: () => p.wallet(applicationId, accessToken) }, request: p.request }
    : { identity: { continueReceizId: p.continuation, signLoginProof: async () => ({}), exchangeProofAuthority: p.grant } },
}) }));

function wallet(userId = 'bound-user', cents = '800') {
  return { ok: true, wallet: { userId, balanceUsd: `${BigInt(cents) / 100n}.${(BigInt(cents) % 100n).toString().padStart(2, '0')}`, balancePhiMicro: '4000000', valueStates: { settledBalanceUsdCents: cents, ecosystemBalanceUsdCents: '0' }, sync: { projectionComplete: true }, rollup: { lastEntryKaiUpulse: '100000003' } } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  p.pulse = 100;p.retainedPortfolio=null;p.cachedWallet=null;p.portfolioSave.mockReset().mockResolvedValue(undefined);
  p.scopes.mockReset().mockResolvedValue([...BANK_READ_SCOPES]);
  p.wallet.mockReset().mockResolvedValue(wallet());
  p.continuation.mockReset().mockResolvedValue({ ok: true, session: { uid: 'bound-user' }, wallet: wallet('foreign-user').wallet });
  p.challenge.mockReset().mockImplementation(() => ({ challenge: { nonce: `nonce-${p.challenge.mock.calls.length}` }, challengeB64Url: 'fixture' }));
  p.grant.mockReset().mockImplementation(async ({ applicationId, scopes }) => ({ applicationId, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: scopes, accessToken: `grant-${p.pulse}`, expiresAtKai: p.pulse + 100 }));
  p.request.mockReset().mockResolvedValue({ ok: true, accountUserId: 'bound-user', events: [], nextCursor: null });
  p.save.mockReset().mockResolvedValue(undefined);
});
const open = () => openCanonicalIdentity(new Uint8Array([1]), '', 'fixture.receiz', true);

it('starts the first protected wallet read while scopes are pending and adopts only after both succeed', async () => {
  const scopes = deferred<string[]>();
  p.scopes.mockReturnValue(scopes.promise);
  const identity = await open();
  try {
    const reading = identity.readWallet();
    await vi.waitFor(() => expect(p.scopes).toHaveBeenCalledTimes(1));
    expect(p.wallet).toHaveBeenCalledExactlyOnceWith(BANK_APPLICATION_ID, 'grant-100');
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
    scopes.resolve([...BANK_READ_SCOPES]);
    expect((await reading).totalUsdCents).toBe('800');
    expect(identity.knownWallet()?.wallet.userId).toBe('bound-user');
    expect(p.wallet).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it.each(['missing scopes', 'scope request failed'])('rejects %s without adopting a completed prefetched wallet', async failure => {
  const scopes = deferred<string[]>();
  p.scopes.mockReturnValueOnce(scopes.promise);
  const identity = await open();
  try {
    const reading = identity.readWallet();
    void reading.catch(() => {});
    await vi.waitFor(() => expect(p.scopes).toHaveBeenCalledTimes(1));
    expect(p.wallet).toHaveBeenCalledTimes(1);
    if (failure === 'missing scopes') scopes.resolve(['receiz:wallet.read']); else scopes.reject(Error('SCOPES_UNAVAILABLE'));
    await expect(reading).rejects.toThrow(failure === 'missing scopes' ? 'permission is unavailable' : 'SCOPES_UNAVAILABLE');
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
    expect((await identity.readWallet()).totalUsdCents).toBe('800');
    expect(p.grant).toHaveBeenCalledTimes(2);
  } finally { identity.dispose(); }
});

it('does not retry a second zero-write unbound response', async () => {
  const cause = new ReceizHttpError(400, { ok: false, code: 'IDENTITY_NOT_BOUND', writes: 0 });
  p.grant.mockRejectedValue(cause);
  const identity = await open();
  try {
    await expect(identity.readWallet()).rejects.toBe(cause);
    expect(p.grant).toHaveBeenCalledTimes(2);
    expect(p.continuation).toHaveBeenCalledTimes(1);
    expect(p.wallet).not.toHaveBeenCalled();
    expect(identity.knownWallet()).toBeNull();
  } finally { identity.dispose(); }
});

it('rejects a foreign prefetched wallet against the continued account uid', async () => {
  p.wallet.mockResolvedValueOnce(wallet('foreign-user'));
  const identity = await open();
  try {
    await expect(identity.readWallet()).rejects.toThrow('does not belong');
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
    expect((await identity.readWallet()).userId).toBe('bound-user');
    expect(p.wallet).toHaveBeenCalledTimes(2);
  } finally { identity.dispose(); }
});

it('does not adopt or retain a wallet response after identity disposal', async () => {
  const response = deferred<ReturnType<typeof wallet>>();
  p.wallet.mockReturnValue(response.promise);
  const identity = await open();
  const reading = identity.readWallet();
  const rejected = expect(reading).rejects.toThrow('identity was closed');
  await vi.waitFor(() => expect(p.wallet).toHaveBeenCalledTimes(1));
  identity.dispose();
  response.resolve(wallet());
  await rejected;
  expect(identity.knownWallet()).toBeNull();
  expect(p.save).not.toHaveBeenCalled();
});

it('shares concurrent reads but fetches again for a later refresh', async () => {
  const response = deferred<ReturnType<typeof wallet>>();
  p.wallet.mockReturnValueOnce(response.promise);
  const identity = await open();
  try {
    const first = identity.readWallet(), second = identity.readWallet();
    await vi.waitFor(() => expect(p.wallet).toHaveBeenCalledTimes(1));
    expect(first).toBe(second);
    response.resolve(wallet());
    expect((await first).totalUsdCents).toBe('800');
    expect(await second).toBe(await first);
    p.wallet.mockResolvedValueOnce(wallet('bound-user', '900'));
    expect((await identity.readWallet()).totalUsdCents).toBe('900');
    expect(p.wallet).toHaveBeenCalledTimes(2);
    expect(p.grant).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it('falls back to a protected wallet read when a different read opened the client', async () => {
  const identity = await open();
  try {
    await identity.readPrivateHistory('older');
    expect(p.wallet).not.toHaveBeenCalled();
    expect((await identity.readWallet()).totalUsdCents).toBe('800');
    expect(p.wallet).toHaveBeenCalledExactlyOnceWith(BANK_APPLICATION_ID, 'grant-100');
    expect(p.grant).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it('consumes each prefetched response once and binds a renewed grant to its own client', async () => {
  const identity = await open();
  try {
    await identity.readWallet();
    p.pulse = 201;
    p.wallet.mockResolvedValueOnce(wallet('bound-user', '900'));
    expect((await identity.readWallet()).totalUsdCents).toBe('900');
    expect(p.wallet.mock.calls).toEqual([[BANK_APPLICATION_ID, 'grant-100'], [BANK_APPLICATION_ID, 'grant-201']]);
    expect(p.grant).toHaveBeenCalledTimes(2);
  } finally { identity.dispose(); }
});

it('exposes a failed prefetched request once and allows an ordinary later retry', async () => {
  const scopes = deferred<string[]>();
  p.scopes.mockReturnValueOnce(scopes.promise);
  p.wallet.mockRejectedValueOnce(Error('WALLET_UNAVAILABLE'));
  const identity = await open();
  try {
    const reading = identity.readWallet();
    void reading.catch(() => {});
    await vi.waitFor(() => expect(p.scopes).toHaveBeenCalledTimes(1));
    expect(p.wallet).toHaveBeenCalledTimes(1);
    scopes.resolve([...BANK_READ_SCOPES]);
    await expect(reading).rejects.toThrow('WALLET_UNAVAILABLE');
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
    expect((await identity.readWallet()).totalUsdCents).toBe('800');
    expect(p.wallet).toHaveBeenCalledTimes(2);
    expect(p.grant).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it('overlaps continuation with the grant and protected reads without adopting before account binding', async () => {
  const continuation = deferred<{ ok: boolean; session: { uid: string } }>();
  p.continuation.mockReturnValueOnce(continuation.promise);
  const identity = await open();
  try {
    const reading = identity.readWallet();
    await vi.waitFor(() => expect(p.grant).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(p.wallet).toHaveBeenCalledTimes(1));
    expect(p.scopes).toHaveBeenCalledTimes(1);
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
    continuation.resolve({ ok: true, session: { uid: 'bound-user' } });
    expect((await reading).totalUsdCents).toBe('800');
    expect(p.grant).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it('retries an authenticated zero-write unbound-key failure once after successful continuation', async () => {
  const continuation = deferred<{ ok: boolean; session: { uid: string } }>();
  p.continuation.mockReturnValueOnce(continuation.promise);
  p.grant.mockRejectedValueOnce(new ReceizHttpError(400, { ok: false, code: 'IDENTITY_NOT_BOUND', writes: 0 }));
  const identity = await open();
  try {
    const reading = identity.readWallet();
    await vi.waitFor(() => expect(p.grant).toHaveBeenCalledTimes(1));
    expect(p.wallet).not.toHaveBeenCalled();
    continuation.resolve({ ok: true, session: { uid: 'bound-user' } });
    expect((await reading).totalUsdCents).toBe('800');
    expect(p.grant).toHaveBeenCalledTimes(2);
    expect(p.grant.mock.calls[0][0].challenge.nonce).not.toBe(p.grant.mock.calls[1][0].challenge.nonce);
    expect(p.continuation).toHaveBeenCalledTimes(1);
    expect(p.wallet).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); }
});

it.each([
  ['replay', new ReceizHttpError(409, { ok: false, code: 'CHALLENGE_REPLAYED', writes: 0 })],
  ['scope', new ReceizHttpError(403, { ok: false, code: 'SCOPE_NOT_GRANTED', writes: 0 })],
  ['transport', Error('GRANT_RESPONSE_LOST')],
  ['unbound without zero-write evidence', new ReceizHttpError(400, { ok: false, code: 'IDENTITY_NOT_BOUND' })],
  ['an untrusted error-shaped object', { payload: { code: 'IDENTITY_NOT_BOUND', writes: 0 } }],
])('does not retry a %s grant failure', async (_label, cause) => {
  p.grant.mockRejectedValueOnce(cause);
  const identity = await open();
  try {
    await expect(identity.readWallet()).rejects.toBe(cause);
    expect(p.grant).toHaveBeenCalledTimes(1);
    expect(p.wallet).not.toHaveBeenCalled();
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
  } finally { identity.dispose(); }
});

it('does not adopt a prefetched wallet when continuation fails after grant and scope success', async () => {
  const continuation = deferred<{ ok: boolean; session: { uid: string } }>();
  p.continuation.mockReturnValueOnce(continuation.promise);
  const identity = await open();
  try {
    const reading = identity.readWallet();
    void reading.catch(() => {});
    await vi.waitFor(() => expect(p.wallet).toHaveBeenCalledTimes(1));
    const cause = Error('CONTINUATION_UNAVAILABLE');
    continuation.reject(cause);
    await expect(reading).rejects.toBe(cause);
    expect(identity.knownWallet()).toBeNull();
    expect(p.save).not.toHaveBeenCalled();
  } finally { identity.dispose(); }
});

it('does not start protected reads when the identity closes during overlapping grant preparation', async () => {
  const continuation = deferred<{ ok: boolean; session: { uid: string } }>();
  const grant = deferred<{ applicationId: string; keyId: string; artifactDigest: string; grantedScopes: string[]; accessToken: string; expiresAtKai: number }>();
  p.continuation.mockReturnValueOnce(continuation.promise);
  p.grant.mockReturnValueOnce(grant.promise);
  const identity = await open();
  const reading = identity.readWallet();
  void reading.catch(() => {});
  await vi.waitFor(() => expect(p.grant).toHaveBeenCalledTimes(1));
  identity.dispose();
  continuation.resolve({ ok: true, session: { uid: 'bound-user' } });
  grant.resolve({ applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_READ_SCOPES], accessToken: 'grant-100', expiresAtKai: 200 });
  await expect(reading).rejects.toThrow('identity was closed');
  expect(p.wallet).not.toHaveBeenCalled();
  expect(p.scopes).not.toHaveBeenCalled();
  expect(identity.knownWallet()).toBeNull();
});

it('binds the first portfolio read to the continued account instead of a local identity UID',async()=>{
 const raw={...portfolioFixture(),actorUserId:'bound-user'};p.request.mockResolvedValue(raw);const identity=await open();
 try{const api=await identity.marketPortfolio!();await api.refresh();expect(api.known()?.accountUid).toBe('bound-user');expect(api.known()?.positions).toHaveLength(2);expect(p.request).toHaveBeenCalledWith('/api/connect/market/portfolio',{method:'GET'});}finally{identity.dispose();}
});
it('has encrypted same-account holdings available at first identity paint without a connected read',async()=>{
 const raw={...portfolioFixture(),actorUserId:'bound-user'};p.retainedPortfolio={...raw,schema:'bankeiz.market-portfolio.v1',accountUid:'bound-user',source:'connected'};p.cachedWallet={wallet:parseSharedWallet(wallet(),'bound-user'),observedAt:'2026-10-21T12:00:00Z',source:'shared-wallet',history:[]};
 const identity=await open();try{expect(identity.knownMarketPortfolio?.()?.positions).toHaveLength(2);expect(p.continuation).not.toHaveBeenCalled();expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
