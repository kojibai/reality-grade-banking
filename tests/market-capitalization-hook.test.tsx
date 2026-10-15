// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { CHART_PERIODS, type ChartPeriod } from '../src/core/chart-history';
import { useMarketCapitalization } from '../src/receiz/market-projection/useMarketCapitalization';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it('switches every range and restores the market instantly without a worker or a network result', async () => {
  vi.stubGlobal('Worker', undefined); const fetch = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetch);
  let state!: ReturnType<typeof useMarketCapitalization>; const root = createRoot(document.createElement('div'));
  function Probe({ period, active }: { period: ChartPeriod; active: boolean }) { state = useMarketCapitalization(period, active); return null; }
  try {
    await act(async () => root.render(<Probe period="ALL" active={false} />));
    const initial = state.points; expect(initial).toHaveLength(64); expect(fetch).not.toHaveBeenCalled();
    for (const period of CHART_PERIODS) { await act(async () => root.render(<Probe period={period} active />)); expect(state.points).toHaveLength(64); }
    await act(async () => root.render(<Probe period="ALL" active={false} />));
    await act(async () => root.render(<Probe period="ALL" active />));
    expect(state.points).toBe(initial); expect(state.status).toBe('unavailable');
  } finally { act(() => root.unmount()); }
});
