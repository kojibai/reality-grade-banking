// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePrivateHistory } from '../src/receiz/usePrivateHistory';
import { parsePrivateHistoryPage } from '../src/receiz/private-history';
import type { OpenIdentity } from '../src/receiz/native-identity';
const vault = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/identity-vault', () => ({ loadPrivateHistoryCache: vault.load, savePrivateHistoryCache: vault.save }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined, visible: boolean;
const page = (id: string) => parsePrivateHistoryPage({ ok: true, accountUserId: 'A', nextCursor: null, events: [{ id, kind: 'reserve_credit', createdAt: '2026-10-14T12:00:00Z', amountUsdCents: '100' }] }, 'A');
const cache = () => ({ schema: 'bank.private-history-cache.v1', accountUid: 'A', observedAt: '2026-10-18T12:00:00Z', records: page('retained').records, nextCursor: null });
function identity() { return { binding: { artifactSha256: 'a'.repeat(64) }, readPrivateHistory: vi.fn().mockResolvedValue(page('head')) } as unknown as OpenIdentity; }
async function mount(id: OpenIdentity, active = true) {
  let state!: ReturnType<typeof usePrivateHistory>;
  function Probe({ active }: { active: boolean }) { state = usePrivateHistory(id, 'A', active); return null; }
  root = createRoot(document.createElement('div')); await act(async () => root!.render(<Probe active={active} />));
  return { read: () => state, active: async (value: boolean) => { await act(async () => root!.render(<Probe active={value} />)); } };
}
function wake(event: string) { (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)); }
beforeEach(() => {
  visible = true; history.replaceState(null, '', '/'); vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
  vault.load.mockReset().mockResolvedValue(cache()); vault.save.mockReset().mockImplementation(async (_binding, value) => value);
});
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; vi.useRealTimers(); vi.restoreAllMocks(); history.replaceState(null, '', '/'); });
it.each(['focus', 'pageshow', 'visibilitychange', 'online'])('refreshes private head on %s while retained records stay visible through 503', async event => {
  const id = identity(), view = await mount(id); vi.mocked(id.readPrivateHistory).mockRejectedValue(Object.assign(Error('outage'), { status: 503 }));
  await act(async () => wake(event));
  expect(id.readPrivateHistory).toHaveBeenCalledTimes(2); expect(view.read().cache?.records.map(row => row.sourceId)).toContain('retained'); expect(view.read().failureCode).toBe('HTTP_503');
});
it('coalesces wake bursts and overlapping pending reads into one head request', async () => {
  const id = identity(), view = await mount(id); let finish!: (value: ReturnType<typeof page>) => void;
  vi.mocked(id.readPrivateHistory).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await act(async () => { wake('pageshow'); wake('focus'); wake('online'); wake('visibilitychange'); });
  await act(async () => { wake('focus'); wake('pageshow'); });
  expect(id.readPrivateHistory).toHaveBeenCalledTimes(2); expect(view.read().cache?.records.map(row => row.sourceId)).toContain('retained');
  await act(async () => { finish(page('external-activity')); }); expect(view.read().cache?.records.map(row => row.sourceId)).toContain('external-activity');
});
it('queues a committed-action head refresh behind an older in-flight request',async()=>{
 const id=identity(),view=await mount(id);let finish!:(value:ReturnType<typeof page>)=>void;
 vi.mocked(id.readPrivateHistory).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(page('committed-send'));
 await act(async()=>wake('focus'));await act(async()=>view.read().refresh());
 await act(async()=>finish(page('earlier-head')));
 expect(id.readPrivateHistory).toHaveBeenCalledTimes(3);expect(view.read().cache?.records.map(row=>row.sourceId)).toContain('committed-send');expect(view.read().cache?.records.map(row=>row.sourceId)).toContain('retained');
});
it('syncs a recorded Send into an inactive Ledger and refuses events from another identity or account',async()=>{
 const id=identity();await mount(id,false);expect(id.readPrivateHistory).not.toHaveBeenCalled();
 for(const detail of [{identityDigest:'b'.repeat(64),accountUid:'A'},{identityDigest:'a'.repeat(64),accountUid:'B'}])await act(async()=>window.dispatchEvent(new CustomEvent('bankeiz:wallet-send-recorded',{detail})));
 expect(id.readPrivateHistory).not.toHaveBeenCalled();
 await act(async()=>window.dispatchEvent(new CustomEvent('bankeiz:wallet-send-recorded',{detail:{identityDigest:'a'.repeat(64),accountUid:'A'}})));
 expect(id.readPrivateHistory).toHaveBeenCalledTimes(1);
});
it('polls every 60 seconds only on the active visible bank and wakes when its surface returns', async () => {
  vi.useFakeTimers(); const id = identity(), view = await mount(id);
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); }); expect(id.readPrivateHistory).toHaveBeenCalledTimes(2);
  visible = false; await act(async () => { wake('focus'); await vi.advanceTimersByTimeAsync(60_000); }); expect(id.readPrivateHistory).toHaveBeenCalledTimes(2);
  visible = true; await view.active(false); await act(async () => { wake('pageshow'); await vi.advanceTimersByTimeAsync(60_000); }); expect(id.readPrivateHistory).toHaveBeenCalledTimes(2);
  history.replaceState(null, '', '/receipt/'); await view.active(true); await act(async () => { wake('popstate'); await vi.advanceTimersByTimeAsync(60_000); }); expect(id.readPrivateHistory).toHaveBeenCalledTimes(2);
  history.replaceState(null, '', '/'); await act(async () => wake('receiz-bank:surface')); expect(id.readPrivateHistory).toHaveBeenCalledTimes(3);
});
it('does not start an automatic network read if the page hides while local restoration is pending', async () => {
  let restore!: (value: ReturnType<typeof cache>) => void; vault.load.mockReturnValue(new Promise(resolve => { restore = resolve; }));
  const id = identity(), view = await mount(id); visible = false;
  await act(async () => { restore(cache()); }); expect(id.readPrivateHistory).not.toHaveBeenCalled(); expect(view.read().cache?.records).toHaveLength(1);
});
it('cleans up timers and queued wakes and ignores a request completing after unmount', async () => {
  vi.useFakeTimers(); const id = identity(); await mount(id); let finish!: (value: ReturnType<typeof page>) => void;
  vi.mocked(id.readPrivateHistory).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await act(async () => wake('focus')); expect(id.readPrivateHistory).toHaveBeenCalledTimes(2);
  act(() => { wake('pageshow'); root!.unmount(); root = undefined; });
  await act(async () => { finish(page('too-late')); wake('focus'); await vi.advanceTimersByTimeAsync(120_000); });
  expect(id.readPrivateHistory).toHaveBeenCalledTimes(2); expect(vault.save).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});
