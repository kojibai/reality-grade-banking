// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNativeAccount } from '../src/receiz/useNativeAccount';
import { usePrivateHistory } from '../src/receiz/usePrivateHistory';
import { parsePrivateHistoryPage } from '../src/receiz/private-history';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { WalletObservation } from '../src/receiz/wallet-observation';
import type { PrivateHistoryCache } from '../src/receiz/identity-vault';

const custody = vi.hoisted(() => ({ restore: vi.fn(), create: vi.fn(), importId: vi.fn(), forget: vi.fn() }));
const vault = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/native-identity', () => ({ restoreNativeIdentity: custody.restore, createNativeIdentity: custody.create, importNativeIdentity: custody.importId, forgetDeviceIdentity: custody.forget }));
vi.mock('../src/receiz/identity-vault', () => ({ loadPrivateHistoryCache: vault.load, savePrivateHistoryCache: vault.save }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
function retained(uid: string, id = 'retained-older'): PrivateHistoryCache {
  const page = parsePrivateHistoryPage({ ok: true, accountUserId: uid, nextCursor: null, events: [{ id, kind: 'reserve_credit', createdAt: '2026-10-14T12:00:00Z', amountUsdCents: '100' }] }, uid);
  return { schema: 'bank.private-history-cache.v1', accountUid: uid, observedAt: '2026-10-18T12:00:00Z', records: page.records, pages: [{ cursor: null, json: page.sourceJson }], nextCursor: null };
}
function observation(uid = 'A'): WalletObservation {
  const wallet = { userId: uid, totalUsdCents: '100', reserveUsdCents: '100', settlementUsdCents: '0', balancePhiMicro: '1000000', projectionComplete: true, portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null, pulse: '10', kaiUpulse: '10000000' };
  return { wallet, observedAt: '2026-10-18T12:00:00Z', history: [{ userId: uid, at: '2026-10-18T12:00:00Z', kaiUPulse: '10000000', totalUsdCents: '100', reserveUsdCents: '100', settlementUsdCents: '0' }], historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: '10000000', endKaiUPulse: '10000000' } };
}
function identity(uid = 'A', digest = 'a'.repeat(64)) {
  const source = observation(uid);
  return { binding: { keyId: digest, artifactSha256: digest }, dispose: vi.fn(), knownWallet: () => source, prepareAccountView: vi.fn(async () => source), readWallet: vi.fn(async () => source.wallet), readPrivateHistory: vi.fn().mockRejectedValue(Object.assign(Error('source unavailable'), { status: 503 })) } as unknown as OpenIdentity;
}
async function mount() {
  let account!: ReturnType<typeof useNativeAccount>, history!: ReturnType<typeof usePrivateHistory>;
  const frames: { identity: OpenIdentity | null; uid?: string; records: string[] }[] = [];
  function Probe() {
    account = useNativeAccount(); history = usePrivateHistory(account.identity, account.wallet?.userId, !!account.identity);
    frames.push({ identity: account.identity, uid: account.wallet?.userId, records: history.cache?.records.map(row => row.sourceId) ?? [] }); return null;
  }
  root = createRoot(document.createElement('div')); await act(async () => root!.render(<Probe />));
  return { account: () => account, history: () => history, frames };
}
beforeEach(() => {
  custody.restore.mockReset().mockResolvedValue(null); custody.create.mockReset(); custody.importId.mockReset(); custody.forget.mockReset().mockResolvedValue(undefined);
  vault.load.mockReset().mockResolvedValue(null); vault.save.mockReset().mockImplementation(async (_binding, value) => value);
});
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; });
it('publishes retained rows with the first account frame and preserves them through a live 503', async () => {
  const held = identity(); custody.restore.mockResolvedValue(held); vault.load.mockResolvedValue(retained('A'));
  const view = await mount();
  expect(view.account().identity).toBe(held); expect(view.history().failureCode).toBe('HTTP_503');
  expect(view.frames.filter(frame => frame.identity).every(frame => frame.records.includes('retained-older'))).toBe(true);
  expect(vault.load).toHaveBeenCalledTimes(1); expect(held.readPrivateHistory).toHaveBeenCalledTimes(1);
});
it('starts one local restore alongside account preparation and waits only for local admission data', async () => {
  const held = identity(); let prepare!: (value: WalletObservation) => void, restore!: (value: PrivateHistoryCache) => void;
  vi.mocked(held.prepareAccountView).mockReturnValue(new Promise(resolve => { prepare = resolve; }));
  vi.mocked(held.readPrivateHistory).mockReturnValue(new Promise(() => {}));
  custody.restore.mockResolvedValue(held); vault.load.mockReturnValue(new Promise(resolve => { restore = resolve; }));
  const view = await mount();
  expect(held.prepareAccountView).toHaveBeenCalledOnce(); expect(vault.load).toHaveBeenCalledOnce(); expect(view.account().identity).toBeNull();
  await act(async () => { prepare(observation()); }); expect(view.account().identity).toBeNull(); expect(held.readPrivateHistory).not.toHaveBeenCalled();
  await act(async () => { restore(retained('A')); });
  expect(view.account().identity).toBe(held); expect(view.history().cache?.records[0].sourceId).toBe('retained-older');
  expect(held.readPrivateHistory).toHaveBeenCalledOnce(); expect(vault.load).toHaveBeenCalledOnce();
});
it('awaits the final account UID without waiting for an unrelated provisional UID restore', async () => {
  const held = identity('A'); vi.mocked(held.prepareAccountView).mockResolvedValue(observation('B'));
  let old!: (value: PrivateHistoryCache) => void;
  vault.load.mockImplementation((_binding, uid) => uid === 'A' ? new Promise(resolve => { old = resolve; }) : Promise.resolve(retained('B', 'retained-B')));
  custody.restore.mockResolvedValue(held); const view = await mount();
  expect(view.account().wallet?.userId).toBe('B'); expect(view.history().cache?.records[0].sourceId).toBe('retained-B');
  expect(vault.load.mock.calls.map(call => call[1])).toEqual(['A', 'B']);
  await act(async () => { old(retained('A', 'private-A')); });
  expect(view.frames.filter(frame => frame.identity).every(frame => frame.uid === 'B' && !frame.records.includes('private-A'))).toBe(true);
});
it.each(['wrong account', 'restore failure'] as const)('allows a valid account without fabricating rows after %s', async reason => {
  const held = identity(); custody.restore.mockResolvedValue(held);
  if (reason === 'wrong account') vault.load.mockResolvedValue(retained('B', 'foreign'));
  else vault.load.mockRejectedValue(Error('local decrypt unavailable'));
  const view = await mount();
  expect(view.account().identity).toBe(held); expect(view.history().cache).toBeNull();
  expect(view.frames.every(frame => frame.records.length === 0)).toBe(true); expect(vault.load).toHaveBeenCalledOnce();
});
it('cannot publish an account or its late local history after removal wins admission', async () => {
  const held = identity(); custody.restore.mockResolvedValue(held);
  let restore!: (value: PrivateHistoryCache) => void; vault.load.mockReturnValue(new Promise(resolve => { restore = resolve; }));
  const view = await mount();
  expect(view.account().identity).toBeNull();
  await act(async () => { await view.account().forget(); restore(retained('A')); });
  expect(view.account().identity).toBeNull(); expect(view.history().cache).toBeNull(); expect(held.dispose).toHaveBeenCalled(); expect(held.readPrivateHistory).not.toHaveBeenCalled();
});
