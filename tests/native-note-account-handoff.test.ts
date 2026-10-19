import { beforeEach, expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { openCanonicalIdentity } from '../src/receiz/native-identity';
import { BANK_APPLICATION_ID, BANK_NATIVE_SCOPES } from '../src/receiz/config';
import { parseSharedWallet } from '../src/receiz/shared-wallet';
import { walletPointTime } from '../src/receiz/wallet-series';
import { historicalWalletUsdRate } from '../src/receiz/historical-wallet';
import {loadOfflineNoteState,loadPreparedNoteState,loadWalletSendState} from '../src/receiz/identity-vault';

// Boundary choreography only. Native funding/hardware are not qualified by
// this fixture. Portable-state signatures use the unmodified local v129 SDK.
const fixture = vi.hoisted(() => ({ keyFile: null as unknown, initial: null as unknown, ledger: null as unknown, kai: null as number | null, clock: null as (() => void) | null, cancel: vi.fn(), transfer: vi.fn(), deposit: vi.fn(), wallet: vi.fn(), create: vi.fn(), save: vi.fn(), pending: vi.fn(), preparedEnabled:false, preparedWrite:null as null|((next:unknown,previous:unknown,proof?:unknown)=>Promise<void>),preparedSave:vi.fn(),receivingRequest:vi.fn(),prepareResources:vi.fn() }));
vi.mock('../src/receiz/config',async()=>({...await vi.importActual<typeof import('../src/receiz/config')>('../src/receiz/config'),get BANK_PREPARED_NOTE_CREDIT_ENABLED(){return fixture.preparedEnabled;}}));
vi.mock('../src/receiz/identity-vault', () => ({
  loadWalletObservation: async () => fixture.initial,
  saveWalletObservation: fixture.save,
  assertWalletSendCustody:async()=>{},
  loadBankOperation:async()=>null,loadNativePaymentState:async()=>null,loadNativeAssetState:async()=>null,
  loadWalletSendState:vi.fn().mockResolvedValue(null),
  loadPreparedNoteState:vi.fn(),savePreparedNoteState:fixture.preparedSave,
  loadOfflineNoteState: vi.fn(), saveOfflineNoteState: vi.fn(), saveOfflineNoteBlob: vi.fn(), loadOfflineNoteBlob: vi.fn(),
}));
vi.mock('../src/receiz/account-ledger', async original => {
  const actual = await original<typeof import('../src/receiz/account-ledger')>();
  return { ...actual, createLocalAccountLedger: (input: Parameters<typeof actual.createLocalAccountLedger>[0]) => {
    const ledger = actual.createLocalAccountLedger(input);
    return { ...ledger, restore: async (current?: import('../src/receiz/wallet-observation').WalletObservation | null) => fixture.ledger ?? ledger.restore(current) };
  } };
});
vi.mock('@receiz/sdk/offline', () => ({ createReceizOfflineSealer: () => ({ enroll: noteEnrollment }), createReceizIndexedDbSealStore: () => ({ load: async () => ({ privateKey: {} }) }) }));
const noteEnrollment=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/offline-notes', () => ({
  bankNoteArtwork: vi.fn(), loadBankNoteRuntime: async () => ({ createBankNativeNoteSealer: async () => vi.fn(), createBankPreparedBrowserRuntime:(ports:{write:typeof fixture.preparedWrite})=>{fixture.preparedWrite=ports.write;return{savedNotes:async()=>[],receivingRequest:fixture.receivingRequest,prepareResources:fixture.prepareResources,pending:async()=>null,hasPreparedFunding:async()=>true,createNote:async()=>{const result=await fixture.create();await fixture.preparedWrite!({journal:{head:'fixture'}},null,result.successorAccountProof);return result;}};},createBankOfflineNotesRuntime: () => ({ pending: fixture.pending, createNote: fixture.create, cancelUnfunded: fixture.cancel, transferNote: fixture.transfer, depositNote: fixture.deposit, receivingRequest: fixture.receivingRequest }) }),
}));
vi.mock('../src/receiz/client', async () => {
  const actual = await vi.importActual<typeof import('@receiz/sdk')>('@receiz/sdk');
  return { loadReceiz: async () => ({ ...actual,
    receizKaiNow: () => { fixture.clock?.(); return fixture.kai === null ? actual.receizKaiNow() : { pulse: Math.floor(fixture.kai / 1_000_000), uPulse: fixture.kai }; },
    verifyReceizArtifact: async () => ({ status: 'verified-artifact' }), createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }), isSdkIssuedReceizArtifactAdmission: () => true,
    readReceizIdentityPublicBinding: async () => ({ keyId: (fixture.keyFile as sdk.ReceizKeyFile).keyId, artifactSha256: 'a'.repeat(64) }),
    readReceizIdentityArtifact: async () => fixture.keyFile,
    projectReceizIdentityAccount: actual.projectReceizIdentityAccount,
    createReceizClient: (options: { accessToken?: string }) => options.accessToken ? { auth: { grantedScopes: async () => [...BANK_NATIVE_SCOPES] }, connect: { wallet: fixture.wallet } } : { identity: {
      continueReceizId: async () => ({ ok: true, session: { uid: 'connected-account' } }),
      signLoginProof: async () => ({}), exchangeProofAuthority: async () => ({ applicationId: BANK_APPLICATION_ID, keyId: (fixture.keyFile as sdk.ReceizKeyFile).keyId, artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_NATIVE_SCOPES], accessToken: 'local-fixture', expiresAtKai: Number.MAX_SAFE_INTEGER }),
    } },
  }) };
});
function wallet(cents: string) { return { userId: 'connected-account', balanceUsd: `${BigInt(cents) / 100n}.${(BigInt(cents) % 100n).toString().padStart(2, '0')}`, balancePhiMicro: cents, valueStates: { settledBalanceUsdCents: cents, ecosystemBalanceUsdCents: '0' }, sync: {}, rollup: {} }; }
beforeEach(async () => {
  noteEnrollment.mockReset().mockResolvedValue(undefined);
  vi.mocked(loadWalletSendState).mockReset().mockResolvedValue(null);
  vi.mocked(loadOfflineNoteState).mockReset();vi.mocked(loadPreparedNoteState).mockReset();
  fixture.ledger=null;fixture.clock=null;fixture.cancel.mockReset();fixture.transfer.mockReset();fixture.deposit.mockReset();fixture.kai=null;fixture.preparedEnabled=false;fixture.preparedSave.mockReset().mockResolvedValue(undefined);fixture.preparedWrite=null;fixture.prepareResources.mockReset().mockResolvedValue(undefined);fixture.receivingRequest.mockReset();
  vi.restoreAllMocks(); fixture.wallet.mockReset(); fixture.create.mockReset(); fixture.save.mockReset().mockResolvedValue(undefined); fixture.pending.mockReset().mockResolvedValue(null);
  fixture.keyFile = (await sdk.createReceizIdIdentity({ passphrase: 'local-test-passphrase' })).keyFile;
  fixture.initial = { wallet: parseSharedWallet({ ok: true, wallet: wallet('600') }, 'connected-account'), observedAt: '2026-10-17T11:00:00.000Z' };
  fixture.wallet.mockResolvedValue({ ok: true, wallet: wallet('600') });
  const proof = await sdk.appendReceizIdentityPortableState({ keyFile: fixture.keyFile as sdk.ReceizKeyFile, passphrase: 'local-test-passphrase', snapshot: { account: { userId: 'connected-account' }, wallet: { routeSummary: wallet('500') } }, exportedAt: '2026-10-17T12:00:00.000Z' });
  fixture.create.mockResolvedValue({ noteId: 'fixture-note', rail: 'reserve', amountUsdCents: '100', image: new Uint8Array([1]), successorAccountProof: proof });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]))));
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, action: () => Promise<unknown>) => action() } });
  vi.stubGlobal('location', { origin: 'https://bankeiz.com' });
});
it('opening Notes reads local inventory without signer enrollment or wallet transport',async()=>{
 noteEnrollment.mockRejectedValue(new DOMException('operation failed','OperationError'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();expect(await notes.savedNotes()).toEqual([]);expect(await notes.pending()).toBeNull();expect(await identity.offlineNotes!()).toBe(notes);expect(noteEnrollment).not.toHaveBeenCalled();expect(fixture.wallet).not.toHaveBeenCalled();expect(fixture.create).not.toHaveBeenCalled();expect(fixture.preparedSave).not.toHaveBeenCalled();}
 finally{identity.dispose();vi.unstubAllGlobals();}
});
it('refuses unreadable financial state before signer setup and never resets it',async()=>{
 const failure=new DOMException('operation failed','OperationError');vi.mocked(loadOfflineNoteState).mockRejectedValue(failure);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();await expect(notes.savedNotes()).rejects.toBe(failure);await expect(notes.create('100')).rejects.toBe(failure);expect(noteEnrollment).not.toHaveBeenCalled();expect(fixture.create).not.toHaveBeenCalled();expect(fixture.preparedSave).not.toHaveBeenCalled();}finally{identity.dispose();vi.unstubAllGlobals();}
});
it('rechecks a prepared attempt retained during signer setup before the locked legacy allocation',async()=>{
 noteEnrollment.mockImplementationOnce(async()=>{vi.mocked(loadPreparedNoteState).mockResolvedValue({schema:'receiz.bank.prepared-notes-device.v1',keyId:(fixture.keyFile as sdk.ReceizKeyFile).keyId,uid:'connected-account',create:{noteId:'competing',rail:'settlement',amountUsdCents:'200'},notes:{},journal:null,slots:{},components:{},stages:{},proofs:{}});});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();await expect(notes.create('100')).rejects.toThrow('BANK_NOTE_PREPARED_RECOVERY_REQUIRED');expect(fixture.create).not.toHaveBeenCalled();expect(fixture.wallet).not.toHaveBeenCalled();expect(await notes.pending()).toMatchObject({noteId:'competing',rail:'settlement',amountUsdCents:'200'});}finally{identity.dispose();vi.unstubAllGlobals();}
});
it('hands off the completed successor to the balance/chart without a second wallet request', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!();
    const result = await notes.create('100');
    expect(result.accountUpdateWarning).toBeUndefined();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.history?.at(-1)?.reserveUsdCents).toBe('500');
    expect(fixture.wallet).toHaveBeenCalledTimes(1);
    expect(fixture.save).toHaveBeenCalledOnce();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('does not let an earlier delayed wallet read replace the completed note result', async () => {
  let finish!: (value: unknown) => void;
  fixture.wallet.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!();
    const earlier = identity.readWallet();
    await vi.waitFor(() => expect(fixture.wallet).toHaveBeenCalledOnce());
    await notes.create('100');
    finish({ ok: true, wallet: wallet('600') });
    expect((await earlier).totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(fixture.save).toHaveBeenCalledOnce();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('keeps the completed note savable if only the display-cache write fails', async () => {
  fixture.save.mockRejectedValue(new Error('fixture cache failure'));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.image).toEqual(new Uint8Array([1]));
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(fixture.create).toHaveBeenCalledOnce();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('preserves a newer wallet when an old retained note attempt completes', async () => {
  fixture.pending.mockResolvedValue({ noteId: 'fixture-note', amountUsdCents: '100', rail: 'reserve' });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.image).toEqual(new Uint8Array([1]));
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('600');
    expect(fixture.save).toHaveBeenCalledOnce(); expect(identity.knownWallet()?.quoteHold).toBeDefined(); expect(fixture.wallet).not.toHaveBeenCalled();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('preserves an account observation that changed while issuance was running', async () => {
  const completed = await fixture.create(); fixture.create.mockReset();
  let finish!: (value: unknown) => void; fixture.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!(), creating = notes.create('100');
    await vi.waitFor(() => expect(fixture.create).toHaveBeenCalledOnce());
    fixture.wallet.mockResolvedValue({ ok: true, wallet: wallet('650') });
    await identity.readWallet(); const newer = identity.knownWallet(); finish(completed);
    const result = await creating;
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('650'); expect(identity.knownWallet()).toBe(newer);
    expect(fixture.save).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
function completeNativeSource() {
  const source = { ...wallet('600'), sync: { projectionComplete: true }, rollup: { lastEntryKaiPulse: '2', lastEntryKaiUpulse: '2000000' } };
  fixture.initial = {
    walletScope: 'native-full', wallet: parseSharedWallet({ ok: true, wallet: source }, 'connected-account'), observedAt: walletPointTime('2000000'),
    history: [
      { userId: 'connected-account', at: walletPointTime('1000000'), kaiUPulse: '1000000', totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0' },
      { userId: 'connected-account', at: walletPointTime('2000000'), kaiUPulse: '2000000', totalUsdCents: '600', reserveUsdCents: '600', settlementUsdCents: '0' },
    ],
    historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: '1000000', endKaiUPulse: '2000000', settlementPhiMicro: '0', balancePhiMicro: '600', reserveUsdCents: '600' },
  };
  fixture.wallet.mockResolvedValue({ ok: true, wallet: source }); fixture.kai = 2_000_000;
}
function completeSettlementSource() {
  completeNativeSource();
  const initial = fixture.initial as import('../src/receiz/wallet-observation').WalletObservation;
  const raw = { ...wallet('10148'), balancePhiMicro: '3000000', valueStates: { settledBalanceUsdCents: '100', ecosystemBalanceUsdCents: '10048' }, sync: { projectionComplete: true }, rollup: { lastEntryKaiPulse: '2', lastEntryKaiUpulse: '2000000' } };
  initial.wallet = parseSharedWallet({ ok: true, wallet: raw }, 'connected-account');
  initial.history![1] = { ...initial.history![1], totalUsdCents: '10148', reserveUsdCents: '100', settlementUsdCents: '10048' };
  Object.assign(initial.historyBasis!, { settlementPhiMicro: '2000000', balancePhiMicro: '3000000', reserveUsdCents: '100' });
  const settlement = sdk.quoteReceizDisplayUsdV122('2000000', historicalWalletUsdRate('11000000'));
  const total = (BigInt(settlement) + 100n).toString();
  return { ...raw, balanceUsd: `${BigInt(total) / 100n}.${(BigInt(total) % 100n).toString().padStart(2, '0')}`, valueStates: { ...raw.valueStates, ecosystemBalanceUsdCents: settlement } };
}
it('adopts a completed successor after a newer protected quote confirms the same locally repriced financial source', async () => {
  const current = completeSettlementSource();
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    fixture.kai = 10_000_000;
    const repriced = await identity.refreshLocalValuation!();
    expect(repriced?.wallet.settlementUsdCents).not.toBe(current.valueStates.ecosystemBalanceUsdCents);
    fixture.wallet.mockResolvedValue({ ok: true, wallet: current }); fixture.kai = 11_000_000;
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.accountUpdateWarning).toBeUndefined();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.historyBasis).toBeUndefined();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it.each(['uid', 'gross units', 'reserve', 'head', 'pulse', 'projection', 'portfolio', 'pnl', 'withdrawable', 'unmarked cache', 'cash-only scope', 'legacy basis', 'missing units'] as const)('keeps the display guard when a locally repriced source differs in %s', async mismatch => {
  const current = completeSettlementSource();
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    fixture.kai = 10_000_000; await identity.refreshLocalValuation!();
    const baseline = identity.knownWallet()!;
    if (mismatch === 'uid') current.userId = 'foreign-account';
    if (mismatch === 'gross units') current.balancePhiMicro = '3000001';
    if (mismatch === 'reserve') { current.valueStates.settledBalanceUsdCents = '101'; const cents = BigInt(current.valueStates.ecosystemBalanceUsdCents) + 101n; current.balanceUsd = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`; }
    if (mismatch === 'head') current.rollup.lastEntryKaiUpulse = '3000000';
    if (mismatch === 'pulse') current.rollup.lastEntryKaiPulse = '3';
    if (mismatch === 'projection') current.sync.projectionComplete = false;
    if (mismatch === 'portfolio') Object.assign(current.valueStates, { livePortfolioValueUsdCents: '1' });
    if (mismatch === 'pnl') Object.assign(current.valueStates, { unrealizedPnlUsdCents: '1' });
    if (mismatch === 'withdrawable') Object.assign(current.valueStates, { withdrawableNowUsdCents: '1' });
    if (mismatch === 'unmarked cache') delete baseline.walletScope;
    if (mismatch === 'cash-only scope') baseline.walletScope = 'native-cash-only';
    if (mismatch === 'legacy basis') baseline.historyBasis!.kind = 'legacy-wallet-observations';
    if (mismatch === 'missing units') delete baseline.historyBasis!.settlementPhiMicro;
    fixture.wallet.mockResolvedValue({ ok: true, wallet: current });
    const creating = (await identity.offlineNotes!()).create('100');
    if (mismatch === 'uid') await expect(creating).rejects.toThrow('does not belong');
    else { expect((await creating).accountUpdateWarning).toContain('note is saved'); expect(identity.knownWallet()?.wallet).toEqual(baseline.wallet); expect(identity.knownWallet()?.historyBasis).toBeUndefined(); expect(identity.knownWallet()?.walletScope).toBeUndefined(); }
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('drops old quote eligibility after a saved note successor cannot be projected without changing held display amounts', async () => {
  const current = completeSettlementSource();
  const completed = await fixture.create(); fixture.create.mockResolvedValue({ ...completed, successorAccountProof: { invalid: true } });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    fixture.kai = 10_000_000; await identity.refreshLocalValuation!(); const baseline = identity.knownWallet()!;
    fixture.wallet.mockResolvedValue({ ok: true, wallet: current });
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.image).toEqual(new Uint8Array([1])); expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet).toEqual(baseline.wallet);
    expect(identity.knownWallet()?.historyBasis).toBeUndefined(); expect(identity.knownWallet()?.walletScope).toBeUndefined();
    fixture.kai = 12_000_000; expect(await identity.refreshLocalValuation!()).toBeNull();
    expect(fixture.save).toHaveBeenCalledTimes(2);
    expect(fixture.save.mock.calls.at(-1)?.[6]).toBeUndefined(); expect(fixture.save.mock.calls.at(-1)?.[7]).toBeUndefined();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it.each(['same financial head', 'newer financial head'] as const)('keeps a delayed %s read while dropping only stale quote eligibility after saved issuance', async head => {
  const current = completeSettlementSource(), completed = await fixture.create(); fixture.create.mockReset();
  let finishCreate!: (value: unknown) => void; fixture.create.mockReturnValue(new Promise(resolve => { finishCreate = resolve; }));
  let finishRead!: (value: unknown) => void; fixture.wallet.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; })).mockResolvedValue({ ok: true, wallet: current });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    fixture.kai = 10_000_000; await identity.refreshLocalValuation!();
    const notes = await identity.offlineNotes!(), earlier = identity.readWallet();
    await vi.waitFor(() => expect(fixture.wallet).toHaveBeenCalledOnce());
    const creating = notes.create('100'); await vi.waitFor(() => expect(fixture.create).toHaveBeenCalledOnce());
    fixture.kai = 11_000_000;
    const read = head === 'same financial head' ? current : { ...current, rollup: { lastEntryKaiPulse: '3', lastEntryKaiUpulse: '3000000' } };
    finishRead({ ok: true, wallet: read }); await earlier; const observed = identity.knownWallet()!;
    if (head === 'same financial head') expect(observed.walletScope).toBe('native-full');
    finishCreate(completed); const result = await creating;
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet).toEqual(observed.wallet);
    expect(identity.knownWallet()?.source).toBe(observed.source); expect(identity.knownWallet()?.localHeadDigest).toBe(observed.localHeadDigest);
    expect(identity.knownWallet()?.historyBasis).toBeUndefined(); expect(identity.knownWallet()?.walletScope).toBeUndefined();
    if (head === 'newer financial head') expect(identity.knownWallet()).toBe(observed);
    fixture.kai = 12_000_000; expect(await identity.refreshLocalValuation!()).toBeNull();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('keeps saved-note quote invalidation through cache restore and old complete ledger enrichment', async () => {
  const current = completeSettlementSource(), completed = await fixture.create();
  fixture.create.mockResolvedValue({ ...completed, successorAccountProof: { invalid: true } });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  let reopened: Awaited<ReturnType<typeof openCanonicalIdentity>> | undefined;
  try {
    fixture.kai = 10_000_000; await identity.refreshLocalValuation!(); const oldLedger = structuredClone(identity.knownWallet()!);
    fixture.wallet.mockResolvedValue({ ok: true, wallet: current });
    expect((await (await identity.offlineNotes!()).create('100')).accountUpdateWarning).toContain('note is saved');
    const saved = fixture.save.mock.calls.at(-1)!;
    expect(saved[8]).toMatchObject({ schema: 'bank.wallet-quote-hold.v1', userId: 'connected-account', balancePhiMicro: '3000000', reserveUsdCents: '100', kaiUpulse: '2000000', pulse: '2' });
    fixture.initial = { wallet: saved[1], observedAt: saved[2], history: saved[3], source: saved[4], localHeadDigest: saved[5], historyBasis: saved[6], walletScope: saved[7], quoteHold: saved[8] };
    fixture.ledger = { observation: oldLedger, proof: { sourceDigest: 'old-retained-source' } }; identity.dispose();
    reopened = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
    await reopened.prepareAccountView();
    // The real merge can restore old full coverage, but not quote eligibility.
    expect(reopened.knownWallet()?.historyBasis).toBeDefined(); expect(reopened.knownWallet()?.walletScope).toBe('native-full');
    fixture.kai = 12_000_000; const before = reopened.knownWallet();
    expect(await reopened.refreshLocalValuation!()).toBeNull(); expect(reopened.knownWallet()).toBe(before);
    fixture.wallet.mockResolvedValue({ ok: true, wallet: { ...current, rollup: { lastEntryKaiPulse: '3', lastEntryKaiUpulse: '3000000' } } });
    expect((await reopened.readWallet()).kaiUpulse).toBe('3000000');
  } finally { identity.dispose(); reopened?.dispose(); vi.unstubAllGlobals(); }
});
it('suspends a local quote tick until the verified note successor is adopted and remains refreshable', async () => {
  completeNativeSource();
  const completed = await fixture.create(); fixture.create.mockReset();
  let finish!: (value: unknown) => void; fixture.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!(), creating = notes.create('100');
    await vi.waitFor(() => expect(fixture.create).toHaveBeenCalledOnce());
    const baseline = identity.knownWallet(); fixture.kai = 10_000_000;
    expect(await identity.refreshLocalValuation!()).toBeNull();
    expect(identity.knownWallet()).toBe(baseline);
    finish(completed);
    expect((await creating).accountUpdateWarning).toBeUndefined();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.source).toBeUndefined();
    expect(identity.knownWallet()?.historyBasis).toBeUndefined();
    expect(identity.knownWallet()?.history?.at(-1)?.reserveUsdCents).toBe('500');
    expect(await identity.refreshLocalValuation!()).toBeNull();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    fixture.wallet.mockResolvedValue({ ok: true, wallet: wallet('650') });
    expect((await identity.readWallet()).totalUsdCents).toBe('650');
    expect(fixture.wallet).toHaveBeenCalledTimes(2);
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('cannot publish a delayed successor or quote after the identity is disposed during issuance', async () => {
  completeNativeSource(); const completed = await fixture.create(); fixture.create.mockReset();
  let finish!: (value: unknown) => void; fixture.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const creating = (await identity.offlineNotes!()).create('100');
    await vi.waitFor(() => expect(fixture.create).toHaveBeenCalledOnce()); const baseline = identity.knownWallet();
    fixture.kai = 10_000_000; expect(await identity.refreshLocalValuation!()).toBeNull();
    identity.dispose(); finish(completed);
    await expect(creating).rejects.toThrow('identity was closed');
    expect(identity.knownWallet()).toBe(baseline); expect(await identity.refreshLocalValuation!()).toBeNull(); expect(fixture.save).not.toHaveBeenCalled();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('resumes supported quote updates after a native note operation fails', async () => {
  completeNativeSource(); fixture.create.mockRejectedValue(Error('NATIVE_SOURCE_UNAVAILABLE'));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    await expect((await identity.offlineNotes!()).create('100')).rejects.toThrow('NATIVE_SOURCE_UNAVAILABLE');
    fixture.kai = 10_000_000;
    const next = await identity.refreshLocalValuation!();
    expect(next?.historyBasis?.endKaiUPulse).toBe('10000000'); expect(identity.knownWallet()).toBe(next);
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('discards a quote begun before a native operation even when the operation has already failed', async () => {
  completeNativeSource(); fixture.cancel.mockImplementation(() => { throw Error('CANCEL_SOURCE_UNAVAILABLE'); });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!(), baseline = identity.knownWallet();
    let cancellation!: Promise<unknown>;
    fixture.kai = 10_000_000;
    // Begin and end a failed operation after the quote captured its baseline
    // but before the async valuation module returns. Its old epoch must fail.
    fixture.clock = () => { fixture.clock = null; cancellation = notes.cancelUnfunded().catch(cause => cause); };
    expect(await identity.refreshLocalValuation!()).toBeNull();
    expect(await cancellation).toMatchObject({ message: 'CANCEL_SOURCE_UNAVAILABLE' });
    expect(identity.knownWallet()).toBe(baseline);
    expect((await identity.refreshLocalValuation!())?.historyBasis?.endKaiUPulse).toBe('10000000');
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it.each(['transfer', 'deposit', 'prepared create'] as const)('suspends quote publication through %s and its retained write', async operation => {
  completeNativeSource(); fixture.preparedEnabled = operation === 'prepared create';
  const completed = await fixture.create(); fixture.create.mockReset();
  let finish!: (value: unknown) => void;
  const pending = new Promise(resolve => { finish = resolve; });
  if (operation === 'transfer') fixture.transfer.mockReturnValue(pending);
  else if (operation === 'deposit') fixture.deposit.mockReturnValue(pending);
  else fixture.create.mockReturnValue(pending);
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!();
    const running = operation === 'transfer' ? notes.transfer('fixture-note') : operation === 'deposit' ? notes.deposit(new Uint8Array([1])) : notes.create('100');
    const called = operation === 'transfer' ? fixture.transfer : operation === 'deposit' ? fixture.deposit : fixture.create;
    await vi.waitFor(() => expect(called).toHaveBeenCalledOnce());
    const before = identity.knownWallet(); fixture.kai = 10_000_000;
    expect(await identity.refreshLocalValuation!()).toBeNull(); expect(identity.knownWallet()).toBe(before);
    finish(completed); await running;
    if (operation === 'prepared create') {
      expect(identity.knownWallet()).toMatchObject({ source: 'local-note-head', wallet: { totalUsdCents: '500' } });
      expect(await identity.refreshLocalValuation!()).toBeNull();
    }
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('retains a restored local head through refresh without opening an online wallet', async () => {
  fixture.initial = {...fixture.initial as object,source:'local-note-head',localHeadDigest:'b'.repeat(64)};
  fixture.wallet.mockRejectedValue(Error('NETWORK_DISABLED'));
  const identity = await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
  try {expect((await identity.readWallet()).totalUsdCents).toBe('600');expect(fixture.wallet).not.toHaveBeenCalled();expect(identity.knownWallet()?.source).toBe('local-note-head');}
  finally {identity.dispose();vi.unstubAllGlobals();}
});

it('adopts the prepared local account head atomically for balance and chart without a wallet or resource fetch',async()=>{
 fixture.preparedEnabled=true;
 vi.stubGlobal('caches',{match:async()=>new Response(new Uint8Array([1]))});
 const network=vi.fn(async()=>{throw Error('NETWORK_DISABLED');});vi.stubGlobal('fetch',network);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{await (await identity.offlineNotes!()).create('100');expect(identity.knownWallet()?.source).toBe('local-note-head');expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');expect(identity.knownWallet()?.history?.at(-1)?.reserveUsdCents).toBe('500');expect((await identity.readWallet()).totalUsdCents).toBe('500');expect(fixture.prepareResources).toHaveBeenCalledWith({notes:1,receivers:0});expect(fixture.preparedSave).toHaveBeenCalledOnce();expect(fixture.preparedSave.mock.calls[0][3]).toMatchObject({source:'local-note-head',wallet:{totalUsdCents:'500'}});expect(fixture.wallet).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();}
 finally{identity.dispose();vi.unstubAllGlobals();}
});

it('returns an existing prepared receiver offline without replenishing unrelated note slots',async()=>{
 fixture.preparedEnabled=true;fixture.receivingRequest.mockResolvedValue(new Uint8Array([1,2]));fixture.prepareResources.mockRejectedValue(Error('NETWORK_DISABLED'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{expect(await(await identity.offlineNotes!()).receivingRequest()).toEqual(new Uint8Array([1,2]));expect(fixture.prepareResources).not.toHaveBeenCalled();}
 finally{identity.dispose();vi.unstubAllGlobals();}
});

it('refuses a new Note before signing while a Wallet Send outcome is unresolved',async()=>{
 vi.mocked(loadWalletSendState).mockResolvedValue({schema:'bank.wallet-sends.v1',authority:'wallet-observation',current:{status:'unknown'},history:[]});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();await expect(notes.create('100')).rejects.toThrow('BANK_EXECUTION_PENDING');expect(noteEnrollment).not.toHaveBeenCalled();expect(fixture.create).not.toHaveBeenCalled();}finally{identity.dispose();vi.unstubAllGlobals();}
});
function namedDeviceLocks(){
 const tails=new Map<string,Promise<unknown>>();
 vi.stubGlobal('navigator',{locks:{request:(name:string,_options:unknown,run:()=>Promise<unknown>)=>{const task=(tails.get(name)??Promise.resolve()).catch(()=>{}).then(run);tails.set(name,task);return task;}}});
}
it('a fresh Note waits for the Wallet critical section, then refuses its unresolved original before enrollment',async()=>{
 namedDeviceLocks();let release!:(v:unknown)=>void;
 vi.mocked(loadWalletSendState).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{
  const wallet=await identity.walletSend!();const sending=wallet.prepare({recipient:'receiver',amountUsdCents:'100'}).catch(error=>error);
  await vi.waitFor(()=>expect(loadWalletSendState).toHaveBeenCalledTimes(1));
  const notes=await identity.offlineNotes!(),creating=notes.create('100').catch(error=>error);
  await Promise.resolve();expect(noteEnrollment).not.toHaveBeenCalled();expect(fixture.create).not.toHaveBeenCalled();
  const unknown={schema:'bank.wallet-sends.v1',authority:'wallet-observation',current:{status:'unknown'},history:[]};
  vi.mocked(loadWalletSendState).mockResolvedValue(unknown);release(unknown);
  expect((await sending).message).toBe('BANK_EXECUTION_PENDING');expect((await creating).message).toBe('BANK_EXECUTION_PENDING');expect(noteEnrollment).not.toHaveBeenCalled();
 }finally{identity.dispose();vi.unstubAllGlobals();}
});
it('Wallet waits for an active Note allocation and rechecks its saved pending custody',async()=>{
 namedDeviceLocks();let release!:(v:unknown)=>void;const finished=await fixture.create();fixture.create.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{
  const notes=await identity.offlineNotes!(),creating=notes.create('100');await vi.waitFor(()=>expect(fixture.create).toHaveBeenCalledTimes(2));
  vi.mocked(loadOfflineNoteState).mockResolvedValue({schema:'receiz.bank.offline-notes-device.v1',keyId:(fixture.keyFile as sdk.ReceizKeyFile).keyId,uid:'connected-account',create:{phase:'issuing',intent:{noteId:'fixture-note'},rail:'reserve',amountUsdCents:'100'},notes:{},deposits:{}});
  let settled=false;const sending=(await identity.walletSend!()).prepare({recipient:'receiver',amountUsdCents:'100'}).catch(error=>{settled=true;return error;});
  await Promise.resolve();expect(settled).toBe(false);release(finished);await creating;
  expect((await sending).message).toBe('BANK_EXECUTION_PENDING');expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
 }finally{identity.dispose();vi.unstubAllGlobals();}
});

it('keeps an original Note resume and cancellation reachable when another retained Wallet result is unknown',async()=>{
 const pending={schema:'receiz.bank.offline-notes-device.v1',keyId:(fixture.keyFile as sdk.ReceizKeyFile).keyId,uid:'connected-account',create:{phase:'preparing',intent:{noteId:'fixture-note'},rail:'reserve',amountUsdCents:'100'},notes:{},deposits:{}};
 vi.mocked(loadOfflineNoteState).mockResolvedValue(pending);fixture.pending.mockResolvedValue({noteId:'fixture-note',rail:'reserve',amountUsdCents:'100',canCancel:true});
 vi.mocked(loadWalletSendState).mockResolvedValue({schema:'bank.wallet-sends.v1',authority:'wallet-observation',current:{status:'unknown'},history:[]});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'local-test-passphrase','fixture.receiz',true);
 try{const notes=await identity.offlineNotes!();expect((await notes.create('100')).image).toEqual(new Uint8Array([1]));await notes.cancelUnfunded();expect(fixture.cancel).toHaveBeenCalledTimes(1);expect(await loadOfflineNoteState(identity.binding)).toEqual(pending);}finally{identity.dispose();vi.unstubAllGlobals();}
});
