// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { useNativeAccount } from '../src/receiz/useNativeAccount';
import type { OpenIdentity } from '../src/receiz/native-identity';
const custody = vi.hoisted(() => ({ restore: vi.fn(), fast: vi.fn(), create: vi.fn(), forget: vi.fn() }));
vi.mock('../src/receiz/native-identity', () => ({ restoreNativeIdentity: custody.restore, restoreKnownWalletObservation: custody.fast, createNativeIdentity: custody.create, importNativeIdentity: vi.fn(), forgetDeviceIdentity: custody.forget }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { custody.restore.mockReset().mockResolvedValue(null); custody.fast.mockReset().mockResolvedValue(null); custody.create.mockReset(); custody.forget.mockReset().mockResolvedValue(undefined); });
function held(readWallet: () => Promise<unknown>) { return { readWallet, dispose: vi.fn(), binding: { keyId: 'test-fixture' }, localHistory: { authority: 'identity-only', portableStateVerified: false } } as unknown as OpenIdentity; }
async function observe(run: (read: () => ReturnType<typeof useNativeAccount>) => Promise<void>) {
  let state!: ReturnType<typeof useNativeAccount>; const root = createRoot(document.createElement('div'));
  function Probe() { state = useNativeAccount(); return null; }
  try { await act(async () => root.render(<Probe />)); await run(() => state); } finally { act(() => root.unmount()); }
}
it('restores the device identity and reads updates from its shared wallet rather than local demo storage', async () => {
  localStorage.setItem('receiz-bank-demo-v1', JSON.stringify({ balance: 99999999 }));
  const readWallet = vi.fn().mockResolvedValueOnce({ userId: 'same-user', totalUsdCents: '100' }).mockResolvedValueOnce({ userId: 'same-user', totalUsdCents: '300' });
  custody.restore.mockResolvedValue(held(readWallet));
  await observe(async read => { expect(read().wallet?.totalUsdCents).toBe('100'); await act(async () => { await read().refresh(); }); expect(read().wallet?.totalUsdCents).toBe('300'); expect(readWallet).toHaveBeenCalledTimes(2); });
  localStorage.clear();
});
it('clears private account data and ignores a delayed wallet response after removing the identity', async () => {
  let finish!: (value: unknown) => void; const pending = new Promise(resolve => { finish = resolve; }); const identity = held(() => pending);
  custody.restore.mockResolvedValue(identity);
  await observe(async read => { await act(async () => { await read().forget(); finish({ userId: 'former-user', totalUsdCents: '900' }); }); expect(read().identity).toBeNull(); expect(read().wallet).toBeNull(); expect(identity.dispose).toHaveBeenCalled(); });
});
it('keeps the last genuine observation on read failure without substituting a new balance', async () => {
  const readWallet = vi.fn().mockResolvedValueOnce({ userId: 'same-user', totalUsdCents: '500' }).mockRejectedValueOnce(new Error('Source unavailable'));
  custody.restore.mockResolvedValue(held(readWallet));
  await observe(async read => { await act(async () => { await read().refresh(); }); expect(read().wallet?.totalUsdCents).toBe('500'); expect(read().error).toContain('could not update'); });
});
it('first-paints the exact held wallet while the background read is still pending', async () => {
  let finish!: (value: unknown) => void; const pending = new Promise(resolve => { finish = resolve; });
  const identity = held(() => pending); identity.knownWallet = () => ({ wallet: { userId: 'same-user', totalUsdCents: '321' }, observedAt: '2026-10-13T12:00:00Z' }) as ReturnType<OpenIdentity['knownWallet']>;
  custody.restore.mockResolvedValue(identity);
  await observe(async read => { expect(read().busy).toBe(true); expect(read().wallet?.totalUsdCents).toBe('321'); await act(async () => { finish({ userId: 'same-user', totalUsdCents: '654' }); }); expect(read().wallet?.totalUsdCents).toBe('654'); });
});
it('paints a newly retained native result even when an earlier balance refresh is still pending', async () => {
  let known = { wallet: { userId: 'same-user', totalUsdCents: '321' }, observedAt: '2026-10-17T12:00:00Z' } as NonNullable<ReturnType<OpenIdentity['knownWallet']>>;
  const identity = held(() => new Promise(() => {})); identity.knownWallet = () => known;
  custody.restore.mockResolvedValue(identity);
  await observe(async read => {
    expect(read().wallet?.totalUsdCents).toBe('321');
    known = { ...known, wallet: { ...known.wallet, totalUsdCents: '221' }, observedAt: '2026-10-17T12:01:00Z' };
    await act(async () => { await read().refresh(); });
    expect(read().wallet?.totalUsdCents).toBe('221');
    expect(read().observedAt).toBe(known.observedAt);
  });
});
it('paints the exact historical observation before canonical identity opening finishes, without creating authority', async () => {
  let finish!: (value: unknown) => void; custody.restore.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  custody.fast.mockResolvedValue({ wallet: { userId: 'known-user', totalUsdCents: '321' }, observedAt: '2026-10-13T12:00:00Z' });
  await observe(async read => { expect(read().opening).toBe(true); expect(read().identity).toBeNull(); expect(read().wallet?.totalUsdCents).toBe('321'); await act(async () => { finish(null); }); expect(read().identity).toBeNull(); });
});
it('finishes the initial wallet opening before the new settled account becomes visible', async () => {
  let finish!: (value: unknown) => void, known: ReturnType<OpenIdentity['knownWallet']> = null;
  const initial = new Promise(resolve => { finish = resolve; });
  const identity = held(async () => { const wallet = await initial; known = { wallet, observedAt: '2026-10-13T12:00:00Z' } as ReturnType<OpenIdentity['knownWallet']>; return wallet; }); identity.knownWallet = () => known;
  custody.create.mockResolvedValue(identity);
  await observe(async read => { let opening!: Promise<void>; await act(async () => { opening = read().create(true); }); expect(read().identity).toBeNull(); await act(async () => { finish({ userId: 'new-user', totalUsdCents: '0' }); await opening; }); expect(read().identity).toBe(identity); expect(read().wallet?.totalUsdCents).toBe('0'); });
});
it('preserves the initial wallet source failure while a retry is still pending', async () => {
  const readWallet = vi.fn().mockRejectedValueOnce(new Error('Initial source unavailable')).mockReturnValueOnce(new Promise(() => {}));
  custody.create.mockResolvedValue(held(readWallet));
  await observe(async read => {
    await act(async () => { await read().create(true); });
    expect(read().wallet).toBeNull();
    expect(read().error ?? '').toContain('Initial source unavailable');
    expect(read().busy).toBe(true);
  });
});
it('keeps creation and import/open operations single-flight while the first identity is opening', async () => {
  let finish!: (value: OpenIdentity) => void;
  custody.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await observe(async read => {
    let first!: Promise<void>;
    await act(async () => { first = read().create(true); await read().create(true); });
    expect(custody.create).toHaveBeenCalledTimes(1);
    await act(async () => { finish(held(async () => ({ userId: 'fixture', totalUsdCents: '0' }))); await first; });
    expect(read().identity).not.toBeNull();
  });
});
it('keeps the account open when note custody prevents device removal', async () => {
  const identity = held(async () => ({ userId: 'same-user', totalUsdCents: '200' })); custody.restore.mockResolvedValue(identity);
  custody.forget.mockRejectedValue(new Error('Keep this device while Offline Notes are held or pending.'));
  await observe(async read => {
    await act(async () => { await expect(read().forget()).rejects.toThrow('Offline Notes'); });
    expect(read().identity).toBe(identity); expect(read().wallet?.totalUsdCents).toBe('200'); expect(identity.dispose).not.toHaveBeenCalled();
  });
});

it('opens a new account from its signed genesis immediately and treats a failed background sync separately', async () => {
  const readWallet = vi.fn().mockRejectedValue(new Error('Transport unavailable'));
  const identity = held(readWallet);
  identity.knownWallet = () => ({ source: 'account-genesis', wallet: { userId: 'new-user', totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0', balancePhiMicro: '0' }, observedAt: '2026-10-15T22:00:00Z', history: [{ userId: 'new-user', at: '2026-10-15T22:00:00Z', kaiUPulse: null, totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0' }] }) as ReturnType<OpenIdentity['knownWallet']>;
  custody.create.mockResolvedValue(identity);
  await observe(async read => {
    await act(async () => { await read().create(true); });
    expect(read().identity).toBe(identity); expect(read().wallet?.totalUsdCents).toBe('0');
    expect(read().error).toBeNull(); expect(read().syncPending).toBe(true);
    expect(identity.knownWallet()?.history).toHaveLength(1); expect(readWallet).toHaveBeenCalledTimes(1);
  });
});
