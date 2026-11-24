import { expect, test, vi } from 'vitest';
import { createFundedWallet } from '../src/receiz/funded-wallet';
import { createLocalFinancialFixtureFactory } from './helpers/local-financial-fixture';

function walletFixture() {
  let connected = true;
  const findSource = vi.fn(async () => null);
  const setupReceiving = vi.fn(async (_mode: 'unlock' | 'resume') => {});
  const unavailable = async () => { throw Error('Unexpected financial operation'); };
  const wallet = createFundedWallet({
    applicationId: 'rc_wallet', accountUid: '11111111-1111-4111-8111-111111111111',
    ownerReceizId: 'owner.receiz.id', ownerKeyId: 'a'.repeat(64),
    read: async () => null, save: unavailable, reopen: unavailable, retain: unavailable,
    lock: work => work(), findSource, setupReceiving,
    assertOpen() {}, online: () => connected,
    originals: { async read() { return null; }, retain: unavailable },
    publish: unavailable, publishPeerRelease: unavailable, signOwner: unavailable, signRecord: unavailable,
  });
  return { wallet, findSource, setupReceiving, offline: () => { connected = false; } };
}

test('the normal Wallet action allows device approval once across overlapping opens', async () => {
  const { wallet, findSource, setupReceiving } = walletFixture();
  await Promise.all([wallet.unlock(), wallet.unlock()]);
  expect(findSource).toHaveBeenCalledTimes(1);
  expect(setupReceiving.mock.calls).toEqual([['unlock']]);
});

test('background resume can recover an existing credential and an offline unlock starts no network work', async () => {
  const { wallet, findSource, setupReceiving, offline } = walletFixture();
  await wallet.warm();
  expect(setupReceiving.mock.calls).toEqual([['resume']]);
  offline();
  await wallet.unlock();
  expect(findSource).toHaveBeenCalledTimes(1);
  expect(setupReceiving).toHaveBeenCalledTimes(1);
});

test('an unavailable online writer never starts a new approval', async () => {
  const { wallet, findSource, setupReceiving } = walletFixture();
  findSource.mockRejectedValueOnce(Error('BANK_WALLET_FUNDED_TRANSPORT_UNAVAILABLE'));
  await expect(wallet.unlock()).rejects.toThrow('BANK_WALLET_FUNDED_TRANSPORT_UNAVAILABLE');
  expect(setupReceiving).not.toHaveBeenCalled();
});

test('a closed Wallet source reopens as closed and does not hide a new source on reconnect', async () => {
  const fixture = await createLocalFinancialFixtureFactory();
  const { options, runtime } = await fixture();
  const { allocationId } = await runtime.admitReceizAccountFinancialSource(options.sourceBytes);
  const read = async () => ({ entries: [{ kind: 'source' as const, digest: 'ab'.repeat(32), allocationId }], send: null });
  const unavailable = async () => { throw Error('Unexpected new financial operation'); };
  const findSource = vi.fn(async () => null);
  let connected = false;
  const reopenWallet = () => createFundedWallet({
    ...options, ownerKeyId: 'a'.repeat(64), lock: work => work(), online: () => connected,
    read, save: unavailable, retain: unavailable, reopen: async () => options.sourceBytes,
    publish: unavailable, publishPeerRelease: unavailable, findSource,
  });
  const initial = reopenWallet();
  expect((await initial.availableFunding())?.allocationId).toBe(allocationId);
  await initial.release(allocationId);
  expect(await initial.availableFunding()).toBeNull();
  initial.dispose();
  const reopened = reopenWallet();
  try {
    await reopened.warm();
    expect(await reopened.availableFunding()).toBeNull();
    expect(findSource).not.toHaveBeenCalled();
    connected = true;
    await reopened.warm();
    expect(findSource).toHaveBeenCalledOnce();
    expect(await reopened.availableFunding()).toBeNull();
  } finally {
    reopened.dispose();
  }
});

test('the Wallet journal returns the same confirmed assertion after reopen and fences a lost reply', async () => {
  const { createWalletDeviceJournal } = await import('../src/receiz/wallet-device-journal');
  type Journal = import('../src/receiz/wallet-device-journal').WalletDeviceJournalState;
  let held: Journal | null = null;
  const journal = () => createWalletDeviceJournal({
    read: async () => structuredClone(held),
    async save(next, prior) { expect(held).toEqual(prior); held = structuredClone(next); },
  });
  const request = { credentialIdB64u: 'credential', challengeB64u: 'challenge-3', expectedSignCount: '3' };
  const header = { kind: 'receive' as const, allocationId: 'a'.repeat(64), commandSha256: 'b'.repeat(64), ownerConsentSha256: 'c'.repeat(64) };
  const assertion = { credentialIdB64u: 'credential', authenticatorDataB64u: 'auth', clientDataJSONB64u: 'client', signatureB64u: 'signature' };
  const signer = vi.fn(async () => assertion);
  expect(await journal().assert(request, header, signer)).toEqual(assertion);
  expect(await journal().assert(request, header, signer)).toEqual(assertion);
  expect(signer).toHaveBeenCalledOnce();
  expect(await journal().nextSignCount('2')).toBe('4');
  expect(await journal().eventsAfter('2')).toEqual([{ header, assertion: {
    authenticatorDataB64u: 'auth', clientDataJSONB64u: 'client', signatureB64u: 'signature',
  } }]);
  const next = { ...request, challengeB64u: 'challenge-4', expectedSignCount: '4' };
  await expect(journal().assert(next, header, async () => { throw Error('reply lost'); })).rejects.toThrow('reply lost');
  await expect(journal().assert({ ...next, challengeB64u: 'different' }, header, signer)).rejects.toThrow('BANK_WALLET_COUNTER_INTENT_PENDING');
  expect(signer).toHaveBeenCalledOnce();
});

test('a stale payment draft leaves a different verified Wallet source usable after reopening', async () => {
  const { options, runtime } = await (await createLocalFinancialFixtureFactory())();
  const first = await runtime.admitReceizAccountFinancialSource(options.sourceBytes);
  const fresh = { ...first, artifactSha256: '41'.repeat(32), allocationId: '42'.repeat(32) };
  const stale = { ...first, artifactSha256: '51'.repeat(32), allocationId: '52'.repeat(32) };
  const recipientUserId='33333333-3333-4333-8333-333333333333';
  const conversationId='44444444-4444-4444-8444-444444444444';
  const executed:string[]=[];
  const fixtureRuntime = {
    ...runtime,
    async admitReceizAccountFinancialSource(bytes:Uint8Array) { return bytes[0]===1 ? fresh : stale; },
    financialSourceApplicationId: () => options.applicationId,
    bankFinancialWalletDevice: () => ({keyId:'key',signerPublicKey:'signer',origin:'https://bank.test',rpId:'bank.test',
      credentialIdB64u:'fixture',received:false,recipients:[{accountUid:recipientUserId,ownerReceizId:'receiver.receiz.id',conversationId,nearby:false}]}),
    assertBankFinancialWalletDevice: async () => { throw Error('Unexpected direct device call'); },
    projectReceizAccountFinancialAction: () => ({effect:{kind:'send',recipientOwnerReceizId:'receiver.receiz.id',
      amountPhiMicro:'10',settledUsdCents:'10',ecosystemUsdCents:'0'}}),
    async createReceizAccountFinancialExecutor({source}:import('../src/receiz/local-financial-runtime').FinancialExecutorOptions) {
      return {
        async current(){return {state:{wallet:{availableUsdCents:'10'}}};},
        async execute(){executed.push(source.allocationId);if(source===stale)throw Error('ACCOUNT_FINANCIAL_WALLET_STALE_ALLOCATION');
          return {status:'committed'};},
        async resolve(){return null;},
      };
    },
    async createReceizAccountFinancialPublisher(){return {dispose(){}};},
  } as unknown as typeof runtime;
  let held:unknown={entries:[
    {kind:'source',digest:fresh.artifactSha256,allocationId:fresh.allocationId},
    {kind:'source',digest:stale.artifactSha256,allocationId:stale.allocationId},
  ],send:null};
  const outside=vi.fn(async()=>{throw Error('Network disabled');});
  const openWallet=()=>createFundedWallet({...options,runtime:fixtureRuntime,ownerKeyId:'aa'.repeat(32),
    lock:work=>work(),read:async()=>structuredClone(held),async save(next,previous){expect(held).toEqual(previous);held=structuredClone(next);},
    reopen:async digest=>Uint8Array.of(digest===fresh.artifactSha256?1:2),retain:outside,findSource:outside,publish:outside,publishPeerRelease:outside,
    bindWalletDevice:()=>outside});
  const request={recipient:recipientUserId,amountUsdCents:'10',nearby:false};
  const old=openWallet();
  await expect(old.confirm(await old.review(request))).rejects.toThrow('ACCOUNT_FINANCIAL_WALLET_STALE_ALLOCATION');
  old.dispose();
  const current=openWallet();
  try {
    await current.confirm(await current.review(request));
    expect(executed).toEqual([stale.allocationId,fresh.allocationId]);
    expect(outside).not.toHaveBeenCalled();
  }finally{current.dispose();}
});
