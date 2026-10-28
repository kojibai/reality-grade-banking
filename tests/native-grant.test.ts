import { beforeEach, expect, it, vi } from 'vitest';
import { BANK_APPLICATION_ID, BANK_READ_SCOPES, BANK_CARD_SCOPES, BANK_NATIVE_SCOPES } from '../src/receiz/config';
import { openCanonicalIdentity } from '../src/receiz/native-identity';
// Protocol-mechanics fixtures only. They are not canonical SDK admission/live-user evidence.
const protocol = vi.hoisted(() => ({ grant: vi.fn(), scopes: vi.fn(), wallet: vi.fn(), continueId: vi.fn(), client: vi.fn(), qualify: vi.fn(), pendingCard: null as unknown, pendingSend: null as any, saveCard:vi.fn(), request:vi.fn(), checkoutSession: vi.fn() }));
vi.mock('../src/receiz/identity-vault', async importOriginal => ({ ...await importOriginal<typeof import('../src/receiz/identity-vault')>(), loadCardOperation: async () => protocol.pendingCard, loadCardOperations: async () => protocol.pendingCard ? [protocol.pendingCard] : [],loadWalletSendState:async()=>protocol.pendingSend,saveCardOperation:protocol.saveCard }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }), createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }), isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ keyId: 'fixture-key', artifactSha256: 'a'.repeat(64) }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'fixture-owner', username: 'fixture' }, issuedAt: '2026-10-13T00:00:00Z', keyId: 'fixture-key', crypto: {} }), projectReceizIdentityAccount: async () => ({ authority: 'identity-only' }),
  createReceizClient: protocol.client, receizKaiNow: () => ({ pulse: 100 }), sha256ReceizBytes: async () => 'a'.repeat(64),
  createReceizProofAuthorityChallenge: () => ({ challenge: { audience: 'fixture' }, challengeB64Url: 'fixture' }),
}) }));
beforeEach(() => {
  protocol.continueId.mockReset().mockResolvedValue({ ok: true, session: { uid: 'fixture-owner' } });
  protocol.grant.mockReset().mockResolvedValue({ applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_READ_SCOPES], accessToken: 'local-fixture', expiresAtKai: 200 });
  protocol.scopes.mockReset().mockResolvedValue([...BANK_READ_SCOPES]); protocol.wallet.mockReset().mockResolvedValue({ ok: true, wallet: { userId: 'fixture-owner', balanceUsd: '3.00', balancePhiMicro: '2', valueStates: { settledBalanceUsdCents: '100', ecosystemBalanceUsdCents: '200' }, sync: {}, rollup: {} } });
  protocol.qualify.mockReset().mockRejectedValue(new Error('Native scope missing'));
  protocol.pendingCard = null; protocol.pendingSend=null;protocol.saveCard.mockReset(); protocol.checkoutSession.mockReset();protocol.request.mockReset().mockImplementation(async(path:string)=>{if(path==='/api/connect/wallet/me'||path==='/api/connect/wallet/me?history=1')return protocol.wallet();throw Error('Unexpected synthetic request: '+path);});
  protocol.client.mockReset().mockImplementation((options: { accessToken?: string }) => options.accessToken ? {request:protocol.request, auth: { grantedScopes: protocol.scopes }, connect: { wallet: protocol.wallet, checkoutSession: protocol.checkoutSession }, runtime: { qualifyV124: protocol.qualify } } : { identity: { continueReceizId: protocol.continueId, signLoginProof: async () => ({}), exchangeProofAuthority: protocol.grant } });
});
it('checks the original card registration and then reads the upgraded account under its current registration', async () => {
  const checkout = { sessionId: 'cs_test_12345678', clientSecret: 'private-fixture', amountUsdCents: '500' };
  protocol.pendingCard = { schema: 'receiz.bank.card-operation.v1', stage: 'ready', operationId: 'legacy-fixture', amountUsdCents: '500', checkout };
  protocol.grant.mockImplementation(async ({ applicationId, scopes }: { applicationId: string; scopes: string[] }) => ({ applicationId, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: scopes, accessToken: 'local-fixture', expiresAtKai: 200 }));
  protocol.scopes.mockResolvedValue([...BANK_CARD_SCOPES]);
  protocol.checkoutSession.mockResolvedValue({ ok: true, session: { sessionId: checkout.sessionId, currency: 'usd', amountUsdCents: '500', isPaid: false, state: 'open' } });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  try {
    expect((await identity.checkCardDeposit(checkout)).status).toBe('open');
    expect(protocol.grant.mock.calls[0][0].applicationId).toBe('rc_ELkGAUBINd9Nw4bE5zMqUsgc');
    expect((await identity.readWallet()).totalUsdCents).toBe('300');
    expect(protocol.grant.mock.calls.at(-1)?.[0].applicationId).toBe(BANK_APPLICATION_ID);
  } finally { identity.dispose(); }
});
it('a read-only connection check reports missing native access without requesting expanded permissions or qualifying unavailable operations', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  try {
    const report = await identity.nativeReadiness();
    expect(report.status).toBe('permissions-needed'); expect(report.missingScopes).toContain('receiz:reserve.write'); expect(report.readyToTransact).toBe(false);
    expect(protocol.grant.mock.calls[0][0].scopes).toEqual(BANK_READ_SCOPES); expect(protocol.qualify).not.toHaveBeenCalled();
  } finally { identity.dispose(); }
});
it('separates an approved native grant from a refused service and reuses that grant for an ordinary recheck', async () => {
  protocol.grant.mockResolvedValue({ applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_NATIVE_SCOPES], accessToken: 'local-fixture', expiresAtKai: 200 });
  protocol.scopes.mockResolvedValue([...BANK_NATIVE_SCOPES]);
  protocol.qualify.mockRejectedValue(Object.assign(new Error('private response text'), { status: 400, payload: { code: 'APPLICATION_MISMATCH', accessToken: 'private-response' } }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  try {
    await expect(identity.nativeReadiness(true)).rejects.toMatchObject({ stage: 'native-services', status: 400, code: 'APPLICATION_MISMATCH' });
    await expect(identity.nativeReadiness()).rejects.toMatchObject({ stage: 'native-services', status: 400, code: 'APPLICATION_MISMATCH' });
    expect(protocol.grant).toHaveBeenCalledTimes(1); expect(protocol.grant.mock.calls[0][0].scopes).toEqual(BANK_NATIVE_SCOPES);
    expect(protocol.qualify).toHaveBeenCalledTimes(2);
  } finally { identity.dispose(); }
});
it('does not start account transport without actual UI consent', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz');
  await expect(identity.readWallet()).rejects.toThrow('consent'); expect(protocol.continueId).not.toHaveBeenCalled();
});
it.each(['application', 'key', 'artifact', 'scope'])('refuses a foreign or insufficient %s grant before any wallet read', async mismatch => {
  const grant = { applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_READ_SCOPES], accessToken: 'local-fixture', expiresAtKai: 200 };
  if (mismatch === 'application') grant.applicationId = 'foreign'; if (mismatch === 'key') grant.keyId = 'foreign'; if (mismatch === 'artifact') grant.artifactDigest = 'b'.repeat(64); if (mismatch === 'scope') grant.grantedScopes = [];
  protocol.grant.mockResolvedValue(grant);
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  await expect(identity.readWallet()).rejects.toThrow('same identity'); expect(protocol.wallet).not.toHaveBeenCalled();
});
it('rejects a protected wallet denied by the server without adopting its prefetched result', async () => {
  protocol.wallet.mockRejectedValue(Error('Receiz account permission is unavailable.')); const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  try { await expect(identity.readWallet()).rejects.toThrow('permission'); expect(identity.knownWallet()).toBeNull(); expect(protocol.wallet).toHaveBeenCalledTimes(1); }
  finally { identity.dispose(); }
});
it('reads the bound shared wallet and disposes its held bearer/signing transport', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  expect((await identity.readWallet()).totalUsdCents).toBe('300'); expect(protocol.client.mock.calls.every(([options]) => options.applicationId === BANK_APPLICATION_ID)).toBe(true);
  identity.dispose(); await expect(identity.readWallet()).rejects.toThrow('identity was closed'); expect(protocol.wallet).toHaveBeenCalledTimes(1);
});

it('shares one read-access connection across simultaneous balance reads',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{const wallets=await Promise.all([identity.readWallet(),identity.readWallet()]);expect(wallets.every(wallet=>wallet.totalUsdCents==='300')).toBe(true);expect(protocol.continueId).toHaveBeenCalledTimes(1);expect(protocol.grant).toHaveBeenCalledTimes(1);}
 finally{identity.dispose();}
});
it('shares a pending account-access failure without retrying it for another simultaneous reader',async()=>{
 protocol.continueId.mockRejectedValue(Error('proof_replay_guard_unavailable'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{const results=await Promise.allSettled([identity.readWallet(),identity.readWallet()]);expect(results.every(result=>result.status==='rejected')).toBe(true);expect(protocol.continueId).toHaveBeenCalledTimes(1);expect(protocol.grant).toHaveBeenCalledTimes(1);expect(identity.knownWallet()).toBeNull();}
 finally{identity.dispose();}
});

it('does not adopt a wallet if the identity was closed while its connection was opening',async()=>{
 let finish!:(value:unknown)=>void;protocol.continueId.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 const read=identity.readWallet();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));identity.dispose();finish({ok:true,session:{uid:'fixture-owner'}});
 await expect(read).rejects.toThrow('identity was closed');expect(identity.knownWallet()).toBeNull();
});
it('does not borrow a pending read grant for an approved native-scope connection',async()=>{
 protocol.grant.mockImplementation(async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:scopes,accessToken:'local-fixture',expiresAtKai:200}));
 protocol.scopes.mockResolvedValueOnce([...BANK_READ_SCOPES]).mockResolvedValueOnce([...BANK_NATIVE_SCOPES]);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{const results=await Promise.allSettled([identity.readWallet(),identity.nativeReadiness(true)]);expect(results[0].status).toBe('fulfilled');expect(protocol.grant).toHaveBeenCalledTimes(2);expect(protocol.grant.mock.calls.map(([value])=>value.scopes)).toEqual([BANK_READ_SCOPES,BANK_NATIVE_SCOPES]);}
 finally{identity.dispose();}
});
it('keeps a credited Send checkout when its wallet ready-write was interrupted before retaining the session ID',async()=>{
 const nonce='10000000-0000-4000-8000-000000000001',checkout={sessionId:'cs_test_lost_ready123',clientSecret:'synthetic-only',amountUsdCents:'1000'};
 protocol.pendingCard={schema:'receiz.bank.card-operation.v1',applicationId:BANK_APPLICATION_ID,stage:'ready',operationId:nonce,amountUsdCents:'1000',checkout};
 protocol.pendingSend={schema:'bank.wallet-sends.v1',authority:'wallet-observation',history:[],current:{status:'funding',body:{clientNonce:nonce},review:{amountUsdCents:'1000'},funding:{stage:'creating',amountUsdCents:'1000'}}};
 protocol.grant.mockImplementation(async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:scopes,accessToken:'local-fixture',expiresAtKai:200}));protocol.scopes.mockResolvedValue([...BANK_CARD_SCOPES]);
 protocol.checkoutSession.mockResolvedValue({ok:true,session:{sessionId:checkout.sessionId,currency:'usd',amountUsdCents:'1000',isPaid:true,state:'paid'},settlement:{userId:'fixture-owner',amountUsdCents:'1000',amountPhiMicro:'10'}});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{expect((await identity.checkCardDeposit(checkout)).status).toBe('credited');expect(protocol.saveCard).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('keeps a credited shortfall checkout until the saved full Send retains credit',async()=>{
 const nonce='10000000-0000-4000-8000-000000000001',checkout={sessionId:'cs_test_shortfall123',clientSecret:'synthetic-only',amountUsdCents:'700'};
 protocol.pendingCard={schema:'receiz.bank.card-operation.v1',applicationId:BANK_APPLICATION_ID,stage:'ready',operationId:nonce,amountUsdCents:'700',checkout};
 protocol.pendingSend={schema:'bank.wallet-sends.v1',authority:'wallet-observation',history:[],current:{status:'funding',body:{clientNonce:nonce},review:{amountUsdCents:'1000'},funding:{stage:'creating',amountUsdCents:'700',shortfallUsdCents:'700'}}};
 protocol.grant.mockImplementation(async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:scopes,accessToken:'local-fixture',expiresAtKai:200}));protocol.scopes.mockResolvedValue([...BANK_CARD_SCOPES]);
 protocol.checkoutSession.mockResolvedValue({ok:true,session:{sessionId:checkout.sessionId,currency:'usd',amountUsdCents:'700',isPaid:true,state:'paid'},settlement:{userId:'fixture-owner',amountUsdCents:'700',amountPhiMicro:'7'}});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{expect((await identity.checkCardDeposit(checkout)).status).toBe('credited');expect(protocol.saveCard).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it.each(['expired','complete_unpaid','paid'])('cancellation uses the original registration and preserves a %s outcome through the native identity adapter',async state=>{
 const checkout={sessionId:'cs_test_adaptercancel',clientSecret:'synthetic-only',amountUsdCents:'1000'},operationId='adapter-cancel-original';
 protocol.pendingCard={schema:'receiz.bank.card-operation.v1',stage:'ready',operationId,amountUsdCents:'1000',checkout};
 if(state!=='expired')protocol.pendingSend={current:{status:'funding',body:{clientNonce:operationId},funding:{stage:'ready',amountUsdCents:'1000',checkout}}};
 protocol.grant.mockImplementation(async({applicationId,scopes}:{applicationId:string;scopes:string[]})=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:scopes,accessToken:'local-fixture',expiresAtKai:200}));protocol.scopes.mockResolvedValue([...BANK_CARD_SCOPES]);
 protocol.request.mockResolvedValue({ok:true,session:{sessionId:checkout.sessionId,currency:'usd',amountUsdCents:'1000',isPaid:state==='paid',state},settlement:state==='paid'?{userId:'fixture-owner',amountUsdCents:'1000',amountPhiMicro:'10'}:null});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{expect((await identity.cancelCardDeposit!(checkout)).status).toBe(state==='paid'?'credited':state==='complete_unpaid'?'settling':'expired');expect(protocol.request).toHaveBeenCalledExactlyOnceWith('/api/connect/payments/session?sessionId=cs_test_adaptercancel',{method:'DELETE'});expect(protocol.checkoutSession).not.toHaveBeenCalled();expect(protocol.grant.mock.calls[0][0].applicationId).toBe('rc_ELkGAUBINd9Nw4bE5zMqUsgc');if(state==='expired')expect(protocol.saveCard).toHaveBeenCalledExactlyOnceWith(expect.anything(),null,false,operationId);else expect(protocol.saveCard).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('uses the exact returned access grant without a duplicate scope-echo request',async()=>{
 protocol.scopes.mockRejectedValue(Error('DUPLICATE_SCOPE_READ_FORBIDDEN'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture-phrase','fixture.receiz',true);
 try{
  expect((await identity.readWallet()).totalUsdCents).toBe('300');
  expect(protocol.continueId).toHaveBeenCalledTimes(1);
  expect(protocol.grant).toHaveBeenCalledTimes(1);
  expect(protocol.scopes).not.toHaveBeenCalled();
  expect(protocol.wallet).toHaveBeenCalledTimes(1);
 }finally{identity.dispose();}
});
