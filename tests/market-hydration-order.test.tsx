// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sourceFile from '../public/receiz-public-capitalization.json';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(()=>vi.resetModules()); // Each scenario represents a separate document/store lifetime.
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });
const response = (pulse: number, add = 0) => ({ ok: true, json: async () => ({ ...sourceFile, marketCapProjection: { ...sourceFile.marketCapProjection, serverPulse: pulse, currentUsd: sourceFile.marketCapProjection.currentUsd + add } }) });
it('keeps the completed headline and chart together while retaining a newer source for its worker', async () => {
  const {useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),{retainedMarketDisplaySource}=await import('../src/receiz/market-projection/display-source');
  vi.useFakeTimers(); const pulse = sourceFile.marketCapProjection.serverPulse;
  const fetch = vi.fn().mockResolvedValueOnce(response(pulse)).mockResolvedValueOnce(response(pulse + 20)).mockResolvedValueOnce(response(pulse + 10)); vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('Worker', class { onmessage: unknown; postMessage() {} terminate() {} });
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe() { state = useMarketCapitalization('ALL', true); return null; }
  try {
    await act(async () => root.render(<Probe />)); const completed=state.source;expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(completed.currentUsd*100)));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(state.source).toBe(completed); expect(state.historyUpdating).toBe(true);expect(retainedMarketDisplaySource()?.serverPulse).toBe(pulse+20);
  } finally { act(() => root.unmount()); }
});
it('keeps a same-pulse revised public source visibly retained until its complete curve arrives', async () => {
  const {useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization');
  const pulse = sourceFile.marketCapProjection.serverPulse;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(pulse)).mockResolvedValueOnce(response(pulse, 100)));
  vi.stubGlobal('Worker', class { onmessage: unknown; postMessage() {} terminate() {} });
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe() { state = useMarketCapitalization('ALL', true); return null; }
  try { await act(async () => root.render(<Probe />)); expect(state.historyUpdating).toBe(true);expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(state.source.currentUsd*100))); }
  finally { act(() => root.unmount()); }
});
