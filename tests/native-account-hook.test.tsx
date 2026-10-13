// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { useNativeAccount } from '../src/receiz/useNativeAccount';
import type { OpenIdentity } from '../src/receiz/native-identity';
const custody = vi.hoisted(() => ({ restore: vi.fn(), create: vi.fn(), forget: vi.fn() }));
vi.mock('../src/receiz/native-identity', () => ({ restoreNativeIdentity: custody.restore, createNativeIdentity: custody.create, importNativeIdentity: vi.fn(), forgetDeviceIdentity: custody.forget }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { custody.restore.mockReset().mockResolvedValue(null); custody.create.mockReset(); custody.forget.mockReset().mockResolvedValue(undefined); });
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
