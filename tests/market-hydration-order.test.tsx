// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useMarketCapitalization } from '../src/receiz/market-projection/useMarketCapitalization';
import sourceFile from '../public/receiz-public-capitalization.json';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });
const response = (pulse: number, add = 0) => ({ ok: true, json: async () => ({ ...sourceFile, marketCapProjection: { ...sourceFile.marketCapProjection, serverPulse: pulse, currentUsd: sourceFile.marketCapProjection.currentUsd + add } }) });
it('never rolls an accepted newer headline back to an older response while a chart job is pending', async () => {
  vi.useFakeTimers(); const pulse = sourceFile.marketCapProjection.serverPulse;
  const fetch = vi.fn().mockResolvedValueOnce(response(pulse)).mockResolvedValueOnce(response(pulse + 20)).mockResolvedValueOnce(response(pulse + 10)); vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('Worker', class { onmessage: unknown; postMessage() {} terminate() {} });
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe() { state = useMarketCapitalization('ALL', true); return null; }
  try {
    await act(async () => root.render(<Probe />)); expect(state.source.serverPulse).toBe(pulse + 20);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(state.source.serverPulse).toBe(pulse + 20); expect(state.historyUpdating).toBe(true);
  } finally { act(() => root.unmount()); }
});
it('keeps a same-pulse revised public source visibly retained until its complete curve arrives', async () => {
  const pulse = sourceFile.marketCapProjection.serverPulse;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(pulse)).mockResolvedValueOnce(response(pulse, 100)));
  vi.stubGlobal('Worker', class { onmessage: unknown; postMessage() {} terminate() {} });
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe() { state = useMarketCapitalization('ALL', true); return null; }
  try { await act(async () => root.render(<Probe />)); expect(state.historyUpdating).toBe(true); expect(state.source.currentUsd).toBe(sourceFile.marketCapProjection.currentUsd + 100); expect(state.points.at(-1)?.usdCents).toBe(String(Math.round(sourceFile.marketCapProjection.currentUsd * 100))); }
  finally { act(() => root.unmount()); }
});
