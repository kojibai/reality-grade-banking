// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNativeAccount } from '../src/receiz/useNativeAccount';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { WalletObservation } from '../src/receiz/wallet-observation';

const custody = vi.hoisted(() => ({ restore: vi.fn() }));
vi.mock('../src/receiz/native-identity', () => ({ restoreNativeIdentity: custody.restore, createNativeIdentity: vi.fn(), importNativeIdentity: vi.fn(), forgetDeviceIdentity: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined, visible: boolean;
function observation(cents = '100'): WalletObservation {
  return { wallet: { userId: 'owner', totalUsdCents: cents, reserveUsdCents: cents, settlementUsdCents: '0', balancePhiMicro: '1000000', portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null, projectionComplete: true, pulse: '10', kaiUpulse: '10000000' }, observedAt: '2026-10-18T12:00:00Z', history: [{ userId: 'owner', at: '2024-05-10T06:45:41.888Z', kaiUPulse: '0', totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0' }, { userId: 'owner', at: '2026-10-18T12:00:00Z', kaiUPulse: '10000000', totalUsdCents: cents, reserveUsdCents: cents, settlementUsdCents: '0' }], historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: '0', endKaiUPulse: '10000000' } };
}
function held() {
  let known = observation();
  const identity = { dispose: vi.fn(), knownWallet: () => known, prepareAccountView: vi.fn(async () => known), readWallet: vi.fn(async () => known.wallet), setKnown: (value: WalletObservation) => { known = value; } };
  return identity as unknown as OpenIdentity & { setKnown(value: WalletObservation): void };
}
async function mount(identity: OpenIdentity) {
  let state!: ReturnType<typeof useNativeAccount>;
  const frames: typeof state[] = [];
  function Probe() { state = useNativeAccount(); frames.push({ ...state }); return null; }
  custody.restore.mockResolvedValue(identity);
  root = createRoot(document.createElement('div'));
  await act(async () => root!.render(<Probe />));
  return { read: () => state, frames };
}
function wake(name: string) { (name === 'visibilitychange' ? document : window).dispatchEvent(new Event(name)); }
beforeEach(() => {
  visible = true;
  history.replaceState(null, '', '/');
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
  custody.restore.mockReset();
});
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; vi.useRealTimers(); vi.restoreAllMocks(); history.replaceState(null, '', '/'); });

it.each(['focus', 'pageshow', 'visibilitychange', 'online'])('refreshes on %s without hiding or busying the settled account', async event => {
  const identity = held();
  const { read, frames } = await mount(identity);
  expect(identity.readWallet).not.toHaveBeenCalled();
  await act(async () => wake(event));
  expect(identity.readWallet).toHaveBeenCalledTimes(1);
  expect(read().identity).toBe(identity);
  expect(frames.filter(frame => frame.identity).every(frame => frame.wallet && !frame.opening && !frame.busy)).toBe(true);
});

it('coalesces a foreground event burst and BFCache pageshow into one pending network read', async () => {
  const identity = held();
  let finish!: (value: WalletObservation['wallet']) => void;
  vi.mocked(identity.readWallet).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { read } = await mount(identity);
  await act(async () => {
    const event = new Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event); wake('focus'); wake('online'); wake('visibilitychange');
  });
  expect(identity.readWallet).toHaveBeenCalledTimes(1);
  await act(async () => { wake('focus'); wake('pageshow'); });
  expect(identity.readWallet).toHaveBeenCalledTimes(1);
  expect(read().busy).toBe(false);
  await act(async () => { finish(observation().wallet); });
});

it('does not refresh hidden documents or non-bank routes and refreshes when the bank returns', async () => {
  const identity = held(); await mount(identity);
  visible = false;
  await act(async () => { wake('focus'); wake('pageshow'); wake('visibilitychange'); });
  expect(identity.readWallet).not.toHaveBeenCalled();
  visible = true; history.replaceState(null, '', '/receipt/');
  await act(async () => { wake('focus'); wake('pageshow'); wake('visibilitychange'); wake('receiz-bank:surface'); });
  expect(identity.readWallet).not.toHaveBeenCalled();
  history.replaceState(null, '', '/');
  await act(async () => { wake('popstate'); wake('receiz-bank:surface'); });
  expect(identity.readWallet).toHaveBeenCalledTimes(1);
});

it('paints a supported local valuation before the network starts and retains it through network failure', async () => {
  const identity = held(), order: string[] = [];
  identity.refreshLocalValuation = vi.fn(async () => { order.push('local'); identity.setKnown(observation('300')); return identity.knownWallet(); });
  let fail!: (cause: Error) => void;
  vi.mocked(identity.readWallet).mockImplementation(() => { order.push('network'); return new Promise((_resolve, reject) => { fail = reject; }); });
  const { read } = await mount(identity);
  await act(async () => wake('focus'));
  expect(order).toEqual(['local', 'network']);
  expect(read().wallet?.totalUsdCents).toBe('300'); expect(read().identity).toBe(identity); expect(read().opening).toBe(false); expect(read().busy).toBe(false);
  await act(async () => fail(Error('WALLET_UNAVAILABLE')));
  expect(read().wallet?.totalUsdCents).toBe('300'); expect(read().syncPending).toBe(true); expect(read().error).toContain('balance could not be updated');
});

it('still refreshes the network when optional local valuation is unavailable', async () => {
  const identity = held(); identity.refreshLocalValuation = vi.fn(async () => { throw Error('UNSUPPORTED_LOCAL_SOURCE'); });
  const { read } = await mount(identity);
  await act(async () => wake('focus'));
  expect(identity.readWallet).toHaveBeenCalledTimes(1); expect(read().wallet?.totalUsdCents).toBe('100'); expect(read().error).toBeNull();
});

it('removes foreground listeners and cancels a queued wake when unmounted', async () => {
  const identity = held(); await mount(identity);
  await act(async () => { wake('focus'); root!.unmount(); root = undefined; });
  await act(async () => { wake('focus'); wake('pageshow'); wake('visibilitychange'); wake('online'); wake('popstate'); wake('receiz-bank:surface'); });
  expect(identity.readWallet).not.toHaveBeenCalled(); expect(identity.dispose).toHaveBeenCalledTimes(1);
});

it('checks visible local valuations without increasing the network refresh frequency', async () => {
  vi.useFakeTimers();
  const identity = held(); identity.refreshLocalValuation = vi.fn(async () => null);
  await mount(identity);
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(identity.refreshLocalValuation).toHaveBeenCalledTimes(5); expect(identity.readWallet).not.toHaveBeenCalled();
  visible = false;
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(identity.refreshLocalValuation).toHaveBeenCalledTimes(5);
  visible = true; history.replaceState(null, '', '/receipt/');
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(identity.refreshLocalValuation).toHaveBeenCalledTimes(5); expect(identity.readWallet).not.toHaveBeenCalled();
});
