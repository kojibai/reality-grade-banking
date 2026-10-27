import { beforeEach, expect, it, vi } from 'vitest';
import { ReceizHttpError } from '@receiz/sdk';
import { BANK_APPLICATION_ID, BANK_READ_SCOPES } from '../src/receiz/config';
import {portfolioFixture} from './fixtures/market-portfolio';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import { openCanonicalIdentity } from '../src/receiz/native-identity';

// Real connection, parsing and adoption choreography; isolate admission,
// encrypted persistence and authenticated HTTP at their external boundaries.
const p = vi.hoisted(() => ({ localUid:'local-owner',recovered:null as unknown, switchRequest:vi.fn(), retainedPortfolio:null as unknown,cachedWallet:null as unknown,portfolioSave:vi.fn(), pulse: 100, scopes: vi.fn(), wallet: vi.fn(), continuation: vi.fn(), grant: vi.fn(), challenge: vi.fn(), request: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/identity-vault', async original => ({ ...await original<typeof import('../src/receiz/identity-vault')>(), loadWalletObservation: async () => p.cachedWallet, loadMarketPortfolioState:async()=>p.retainedPortfolio,saveMarketPortfolioState:p.portfolioSave, loadAccountLedgerState: async () => null, saveWalletObservation: p.save }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  ReceizHttpError,
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }),
  createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }),
  isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ keyId: 'fixture-key', artifactSha256: 'a'.repeat(64), artifactOwnerReceizId: 'owner.receiz.id' }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: p.localUid, username: 'owner' }, issuedAt: '2026-10-13T00:00:00Z', keyId: 'fixture-key', alg:'Ed25519', crypto: {publicKeyRawB64u:'synthetic-public'} }),
  projectReceizIdentityAccount: async () => p.recovered ?? ({ authority: 'identity-only' }),
  receizBase64UrlEncode: (bytes:Uint8Array) => Buffer.from(bytes).toString('base64url'),
  receizKaiNow: () => ({ pulse: p.pulse, uPulse: p.pulse * 1_000_000 }),
  sha256ReceizBytes: async () => 'a'.repeat(64),
  createReceizProofAuthorityChallenge: p.challenge,
  createReceizClient: ({ accessToken, applicationId = BANK_APPLICATION_ID }: { accessToken?: string; applicationId?: string } = {}) => accessToken
    ? { auth: { grantedScopes: () => p.scopes(accessToken) }, connect: { wallet: () => p.wallet(applicationId, accessToken) }, request: p.request }
    : { request:p.switchRequest,identity: { continueReceizId: p.continuation, signLoginProof: async ({challengeB64Url}:{challengeB64Url:string}) => ({challengeB64Url,signatureB64Url:'synthetic-signature'}), exchangeProofAuthority: p.grant } },
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
  p.localUid='local-owner';p.recovered=null;p.switchRequest.mockReset();p.pulse = 100;p.retainedPortfolio=null;p.cachedWallet=null;p.portfolioSave.mockReset().mockResolvedValue(undefined);
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

const recoveredUid='11111111-1111-4111-8111-111111111111';
function recoveredAccount(){return {schema:'receiz.sdk.identity_account_projection.v1',authority:'verified-identity-portable-state',portableStateVerified:true,keyId:'fixture-key',owner:{uid:'local-owner'},verifiedState:{schema:'receiz.account.state.v3',account:{userId:recoveredUid}}};}
it('opens the account carried by the admitted Record instead of whichever same-key account was used last',async()=>{
 p.recovered=recoveredAccount();p.wallet.mockResolvedValue(wallet(recoveredUid));
 p.continuation.mockResolvedValue({ok:true,session:{uid:'empty-primary'}});
 p.switchRequest.mockImplementation(async(path,init)=>{expect(path).toBe('/api/auth/receiz-id/switch');expect(init.method).toBe('POST');const body=init.body;expect(body).toMatchObject({keyId:'fixture-key',localUid:'local-owner',targetUid:recoveredUid,signatureB64Url:'synthetic-signature'});const challenge=Buffer.from(body.challengeB64Url,'base64url').toString();expect(challenge).toContain('RECEIZ_DEVICE_SWITCH_V1\n');expect(challenge).toContain('targetUid='+recoveredUid);return {ok:true,session:{uid:recoveredUid,username:'recovered'}};});
 const identity=await open();try{expect((await identity.readWallet()).userId).toBe(recoveredUid);expect(identity.knownWallet()?.wallet.userId).toBe(recoveredUid);expect(p.switchRequest).toHaveBeenCalledTimes(1);expect(p.continuation).not.toHaveBeenCalled();expect(p.wallet).toHaveBeenCalledTimes(1);expect(p.grant).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('rejects a target-session substitution without adopting or saving a wallet',async()=>{
 p.recovered=recoveredAccount();p.switchRequest.mockResolvedValue({ok:true,session:{uid:'empty-primary'}});
 const identity=await open();try{await expect(identity.readWallet()).rejects.toThrow('same account');expect(identity.knownWallet()).toBeNull();expect(p.save).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('does not fall back to a different account when the carried-account switch is unavailable',async()=>{
 p.recovered=recoveredAccount();p.switchRequest.mockRejectedValue(Error('SWITCH_UNAVAILABLE'));
 const identity=await open();try{await expect(identity.readWallet()).rejects.toThrow('SWITCH_UNAVAILABLE');expect(p.continuation).not.toHaveBeenCalled();expect(identity.knownWallet()).toBeNull();}finally{identity.dispose();}
});

it.each(['identity-only','rejected-portable-state'])('never takes account placement from %s portable state',async authority=>{
 p.recovered={...recoveredAccount(),authority,portableStateVerified:false};
 const identity=await open();try{expect((await identity.readWallet()).userId).toBe('bound-user');expect(p.switchRequest).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('restores the full chart on a fresh identity read without falling through to another history request',async()=>{
 const {projectCompositeWalletAt}=await import('../src/receiz/composite-wallet-history');
 const source={schema:'receiz.wallet.chart-source.v129' as const,authority:'authenticated-display-source' as const,userId:'bound-user',throughKaiUPulse:'14710000000000',objects:[{id:'proof',seed:{kind:'sigil' as const,claimPulse:10825210,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:'10825210000000',toKaiUPulse:null}]}],movements:[{id:'spent',kaiUPulse:'13000000000000',direction:'debit' as const,phiMicro:'1000000',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false}],lawfulValues:[]};
 const point=projectCompositeWalletAt(source,source.throughKaiUPulse),cents=BigInt(point.totalUsdCents);
 p.pulse=14710000;p.request.mockResolvedValue({ok:true,wallet:{userId:'bound-user',balanceUsd:`${cents/100n}.${(cents%100n).toString().padStart(2,'0')}`,balancePhiMicro:point.balancePhiMicro,valueStates:{settledBalanceUsdCents:'0',ecosystemBalanceUsdCents:point.totalUsdCents},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'13000000000000'},chartSource:source}});
 const identity=await open();try{const view=await identity.prepareAccountView();expect(view.history?.[0].kaiUPulse).toBe('10825210000000');expect(view.historyBasis?.kind).toBe('portfolio-model-v129');expect(view.history!.length).toBeGreaterThan(100);expect(p.request).toHaveBeenCalledExactlyOnceWith('/api/connect/wallet/me?history=1',{method:'GET'});expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('retains an unchanged account-only chart through a normal wallet refresh without another history request',async()=>{
 const source={schema:'receiz.wallet.chart-source.v129',composition:'account-only',authority:'authenticated-display-source',userId:'bound-user',throughKaiUPulse:'100000000',objects:[],lawfulValues:[],movements:[{id:'received',kaiUPulse:'50000000',direction:'credit',phiMicro:'1000000',usdCents:'1000',reserveSliceUsdCents:'0',profileSeed:false}]};
 const response={ok:true,wallet:{userId:'bound-user',balanceUsd:'10.00',balancePhiMicro:'42',valueStates:{settledBalanceUsdCents:'0',ecosystemBalanceUsdCents:'1000'},sync:{source:'account_only',profileProjectionKaiPulse:null},rollup:{lastEntryKaiUpulse:'50000000'},chartSource:source}};
 p.request.mockResolvedValue(response);p.wallet.mockResolvedValue({...response,wallet:{...response.wallet,chartSource:undefined}});
 const identity=await open();try{await identity.readWallet();expect(identity.knownWallet()?.historyBasis?.kind).toBe('portfolio-model-v129');expect(identity.knownWallet()?.history?.[0].kaiUPulse).toBe('50000000');await identity.readWallet();expect(identity.knownWallet()?.historyBasis?.kind).toBe('portfolio-model-v129');expect(identity.knownWallet()?.wallet.balancePhiMicro).toBe('42');await identity.prepareAccountView();expect(p.request).toHaveBeenCalledTimes(1);expect(p.wallet).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});

it.each([false,true])('keeps a same-owner Record on its exact account when recency selects another account: %s',async wrongRecent=>{
 p.localUid=recoveredUid;p.recovered={...recoveredAccount(),owner:{uid:recoveredUid}};
 p.continuation.mockResolvedValue({ok:true,session:{uid:wrongRecent?'other-account':recoveredUid}});p.switchRequest.mockResolvedValue({ok:true,session:{uid:recoveredUid}});p.wallet.mockResolvedValue(wallet(recoveredUid));
 const identity=await open();try{expect((await identity.readWallet()).userId).toBe(recoveredUid);expect(p.continuation).toHaveBeenCalledTimes(1);expect(p.switchRequest).toHaveBeenCalledTimes(wrongRecent?1:0);expect(p.wallet).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('restarts only the history source when account composition changes across an existing cursor',async()=>{
 const {compositeWalletObservation}=await import('../src/receiz/composite-wallet-source'),{projectCompositeWalletAt}=await import('../src/receiz/composite-wallet-history');
 const row={id:'seed',kaiUPulse:'11000000000000',direction:'credit' as const,phiMicro:'1000000',usdCents:'1000',reserveSliceUsdCents:'0',profileSeed:false};
 const base={schema:'receiz.wallet.chart-source.v129' as const,authority:'authenticated-display-source' as const,userId:'bound-user',throughKaiUPulse:'14710000000000',objects:[],lawfulValues:[],movements:[row],transport:{after:null,cursor:'2026-01-01T00:00:00Z'}};
 const current={userId:'bound-user',totalUsdCents:'1000',settlementUsdCents:'1000',reserveUsdCents:'0',balancePhiMicro:'42',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:false,pulse:null,kaiUpulse:row.kaiUPulse};
 p.cachedWallet=compositeWalletObservation({wallet:current,observedAt:'2026-10-18T00:00:00Z'},{...base,composition:'account-only'});
 const source={...base,composition:'profile-plus-ledger' as const,objects:[{id:'proof',seed:{kind:'sigil' as const,claimPulse:10825210,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:'10825210000000',toKaiUPulse:null}]}],movements:[{...row,profileSeed:true}]},point=projectCompositeWalletAt(source,source.throughKaiUPulse),cents=BigInt(point.totalUsdCents);
 const response={ok:true,wallet:{userId:'bound-user',balanceUsd:`${cents/100n}.${(cents%100n).toString().padStart(2,'0')}`,balancePhiMicro:point.balancePhiMicro,valueStates:{settledBalanceUsdCents:'0',ecosystemBalanceUsdCents:point.totalUsdCents},sync:{source:'profile_plus_ledger_v1',profileProjectionKaiPulse:14710000},rollup:{lastEntryKaiUpulse:row.kaiUPulse}}};
 p.pulse=14710000;p.wallet.mockResolvedValue(response);p.request.mockImplementation(async path=>({...response,wallet:{...response.wallet,chartSource:path.includes('after=')?{...source,movements:[],transport:{...source.transport,after:base.transport.cursor}}:source}}));
 const identity=await open();try{await identity.readWallet();await vi.waitFor(()=>expect(identity.knownWallet()?.chartSource?.composition).toBe('profile-plus-ledger'));expect(identity.knownWallet()?.historyBasis?.kind).toBe('portfolio-model-v129');expect(identity.knownWallet()?.wallet.balancePhiMicro).toBe(point.balancePhiMicro);expect(p.request.mock.calls.map(call=>call[0])).toEqual(['/api/connect/wallet/me?history=1&after=2026-01-01T00%3A00%3A00Z','/api/connect/wallet/me?history=1']);}finally{identity.dispose();}
});
it('does not first-paint the empty primary wallet retained by an earlier incorrect account selection',async()=>{
 p.recovered=recoveredAccount();const raw=wallet('empty-primary','0');raw.wallet.balancePhiMicro='0';const saved=parseSharedWallet(raw,'empty-primary');
 p.cachedWallet={wallet:saved,observedAt:'2026-10-20T00:00:00Z',source:'account-genesis',history:[{userId:'empty-primary',at:'2026-10-20T00:00:00Z',kaiUPulse:'100000003',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'}]};
 p.switchRequest.mockResolvedValue({ok:true,session:{uid:recoveredUid}});p.wallet.mockResolvedValue(wallet(recoveredUid));
 const identity=await open();try{expect(identity.knownWallet()).toBeNull();expect((await identity.readWallet()).userId).toBe(recoveredUid);}finally{identity.dispose();}
});
it('returns the exact current native display frame stored for the header and trace when the existing Kai clock follows packet capture',async()=>{
 const packet=(await import('./fixtures/current-balance/mixed.json')).default,{readBalanceCalculation}=await import('../src/receiz/balance-calculation');
 p.pulse=packet.wallet.currentBalanceSource.computedPulse+1;p.wallet.mockResolvedValue(packet);p.continuation.mockResolvedValue({ok:true,session:{uid:packet.wallet.userId}});
 const identity=await open();try{const returned=await identity.readWallet(),held=identity.knownWallet()!;expect(held.historyBasis?.kind).toBe('current-valuation-v129');expect(held.historyBasis?.endKaiUPulse).toBe(String(BigInt(p.pulse)*1_000_000n));expect(returned).toBe(held.wallet);expect(readBalanceCalculation(returned,held)?.kaiUPulse).toBe(held.historyBasis?.endKaiUPulse);expect(p.wallet).toHaveBeenCalledTimes(1);
  const before=identity.knownWallet();p.pulse++;p.wallet.mockResolvedValue({...packet,wallet:{...packet.wallet,currentBalanceSource:{...packet.wallet.currentBalanceSource,artifactBaseUsdCents:'1'}}});expect(await identity.readWallet()).toBe(before!.wallet);expect(identity.knownWallet()).toBe(before);
 }finally{identity.dispose();}
});
