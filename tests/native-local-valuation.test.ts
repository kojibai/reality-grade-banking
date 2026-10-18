import { beforeEach, expect, it, vi } from 'vitest';
import { openCanonicalIdentity } from '../src/receiz/native-identity';
import type { WalletObservation } from '../src/receiz/wallet-observation';
import { walletPointTime } from '../src/receiz/wallet-series';

// Canonical admission/storage are isolated. Valuation and history extension
// use the actual published v129 rate and SDK integer quote implementation.
const p = vi.hoisted(() => ({ known: null as WalletObservation | null, now: '10000000', save: vi.fn(), network: vi.fn() }));
vi.mock('../src/receiz/identity-vault', async original => ({ ...await original<typeof import('../src/receiz/identity-vault')>(), loadWalletObservation: async () => p.known, loadAccountLedgerState: async () => null, saveWalletObservation: p.save }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }), createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }), isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ keyId: 'fixture-key', artifactSha256: 'a'.repeat(64), artifactOwnerReceizId: 'owner.receiz.id' }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'owner', username: 'owner' }, issuedAt: '2024-05-10T06:45:41.888Z', keyId: 'fixture-key', crypto: {} }), projectReceizIdentityAccount: async () => ({ authority: 'identity-only' }),
  receizKaiNow: () => ({ pulse: Number(BigInt(p.now) / 1_000_000n), uPulse: Number(p.now) }), createReceizClient: () => ({ identity: { continueReceizId: p.network } }),
}) }));
function source(): WalletObservation {
  const history = [{ userId: 'owner', at: walletPointTime('1000000'), kaiUPulse: '1000000', totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0' }, { userId: 'owner', at: walletPointTime('2000000'), kaiUPulse: '2000000', totalUsdCents: '10148', reserveUsdCents: '100', settlementUsdCents: '10048' }];
  return { walletScope: 'native-full', wallet: { userId: 'owner', totalUsdCents: '10148', reserveUsdCents: '100', settlementUsdCents: '10048', balancePhiMicro: '3000000', portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null, projectionComplete: true, pulse: '2', kaiUpulse: '2000000' }, observedAt: walletPointTime('2000000'), history, historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: '1000000', endKaiUPulse: '2000000', settlementPhiMicro: '2000000', balancePhiMicro: '3000000', reserveUsdCents: '100' } };
}
beforeEach(() => { p.known = source(); p.now = '10000000'; p.save.mockReset().mockResolvedValue(undefined); p.network.mockReset(); });
const open = () => openCanonicalIdentity(new Uint8Array([1]), '', 'fixture.receiz', true);

it('revalues only the unchanged native settlement units at the next coordinate and extends display history', async () => {
  const original = structuredClone(p.known), identity = await open();
  try {
    const next = await identity.refreshLocalValuation?.();
    expect(next?.wallet).toMatchObject({ totalUsdCents: '8285', reserveUsdCents: '100', settlementUsdCents: '8185', balancePhiMicro: '3000000', kaiUpulse: '2000000' });
    expect(next?.historyBasis).toMatchObject({ startKaiUPulse: '1000000', endKaiUPulse: '10000000', settlementPhiMicro: '2000000', balancePhiMicro: '3000000', reserveUsdCents: '100' });
    expect(next?.history?.[0]).toEqual(original?.history?.[0]);
    expect(next?.history?.at(-1)).toMatchObject({ kaiUPulse: '10000000', totalUsdCents: '8285', valuation: 'deterministic-v129' });
    expect(identity.knownWallet()).toBe(next); expect(p.network).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(p.save).toHaveBeenCalledTimes(1));
    expect(p.save.mock.calls[0][7]).toBe('native-full');
    expect(p.known).toEqual(original);
  } finally { identity.dispose(); }
});

it.each(['legacy', 'missing units', 'changed gross', 'changed reserve', 'invalid units', 'incomplete history', 'unsupported aggregate', 'incomplete projection', 'unmarked old cache', 'unknown scope', 'saved note hold'])('does not reprice a %s basis', async reason => {
  const value = p.known!;
  if (reason === 'legacy') value.historyBasis!.kind = 'legacy-wallet-observations';
  if (reason === 'missing units') delete value.historyBasis!.settlementPhiMicro;
  if (reason === 'changed gross') value.historyBasis!.balancePhiMicro = '4000000';
  if (reason === 'changed reserve') value.historyBasis!.reserveUsdCents = '101';
  if (reason === 'invalid units') value.historyBasis!.settlementPhiMicro = '4000000';
  if (reason === 'incomplete history') value.history = value.history!.slice(-1);
  if (reason === 'unsupported aggregate') value.walletScope = 'native-cash-only';
  if (reason === 'incomplete projection') value.wallet.projectionComplete = false;
  if (reason === 'unmarked old cache') delete value.walletScope;
  if (reason === 'saved note hold') Object.assign(value,{quoteHold:{schema:'bank.wallet-quote-hold.v1',userId:value.wallet.userId,balancePhiMicro:value.wallet.balancePhiMicro,reserveUsdCents:value.wallet.reserveUsdCents,kaiUpulse:value.wallet.kaiUpulse,pulse:value.wallet.pulse}});
  if (reason === 'unknown scope') (value as { walletScope: string }).walletScope = 'native-guess';
  const identity = await open(), before = identity.knownWallet();
  try { expect(await identity.refreshLocalValuation?.()).toBeNull(); expect(identity.knownWallet()).toBe(before); expect(p.save).not.toHaveBeenCalled(); expect(p.network).not.toHaveBeenCalled(); }
  finally { identity.dispose(); }
});

it('does not move a retained value backwards or revalue after disposal', async () => {
  p.now = '1000000'; const identity = await open(), before = identity.knownWallet();
  expect(await identity.refreshLocalValuation?.()).toBeNull(); expect(identity.knownWallet()).toBe(before);
  p.now = '10000000'; identity.dispose();
  expect(await identity.refreshLocalValuation?.()).toBeNull(); expect(identity.knownWallet()).toBe(before); expect(p.save).not.toHaveBeenCalled();
});

it('revalues a complete supported retained source before its first account frame', async () => {
  const identity = await open();
  try { expect((await identity.prepareAccountView()).wallet.totalUsdCents).toBe('8285'); expect(p.network).not.toHaveBeenCalled(); }
  finally { identity.dispose(); }
});

it('does not repeat valuation within the same whole Kai pulse', async () => {
  const identity = await open();
  try {
    const first = await identity.refreshLocalValuation?.(); p.now = '10999999';
    expect(await identity.refreshLocalValuation?.()).toBeNull(); expect(identity.knownWallet()).toBe(first);
  } finally { identity.dispose(); }
});

it('permits supported current reconciliation after the held financial head has genuinely advanced',async()=>{
 const value=p.known!,old=value.wallet;
 Object.assign(value,{quoteHold:{schema:'bank.wallet-quote-hold.v1',userId:old.userId,balancePhiMicro:old.balancePhiMicro,reserveUsdCents:old.reserveUsdCents,kaiUpulse:old.kaiUpulse,pulse:old.pulse}});
 value.wallet={...old,kaiUpulse:'3000000',pulse:'3'};value.historyBasis!.endKaiUPulse='3000000';
 value.history![1]={...value.history![1],kaiUPulse:'3000000',at:walletPointTime('3000000')};value.observedAt=walletPointTime('3000000');
 const identity=await open();try{expect((await identity.refreshLocalValuation!())?.wallet.totalUsdCents).toBe('8285');expect(p.network).not.toHaveBeenCalled();}finally{identity.dispose();}
});
