import { parseMarketCapSource } from './source';
import { marketCapUsdAtPulse, marketPeriodPulses, marketPulseTime } from './project';
import type { ChartPeriod } from '../../core/chart-history';
let source: ReturnType<typeof parseMarketCapSource> | null = null, latest = 0;
const cache = new Map<string, { at: string; pulse: number; usdCents: string }[]>();
// Yield between exact samples: changing ranges cancels obsolete work; the UI
// receives exact endpoints first and progressively finer points off the main thread.
self.onmessage = async (event: MessageEvent<{ id: number; source?: unknown; period: ChartPeriod; cancel?: boolean }>) => {
  const { id, period } = event.data; latest = id; if (event.data.cancel) return;
  try {
    if (event.data.source) { source = parseMarketCapSource(event.data.source); cache.clear(); }
    const seed = source; if (!seed) throw new Error();
    if (cache.has(period)) { self.postMessage({ id, points: cache.get(period) }); return; }
    const pulses = marketPeriodPulses(seed, period), points = new Map<number, { at: string; pulse: number; usdCents: string }>();
    const pending: number[] = [0, pulses.length - 1], intervals = [[0, pulses.length - 1]];
    for (let i = 0; i < intervals.length; i++) { const [left, right] = intervals[i], middle = (left + right) >>> 1; if (middle > left) { pending.push(middle); intervals.push([left, middle], [middle, right]); } }
    let count = 0;
    for (const index of new Set(pending)) {
      if (latest !== id) return;
      const pulse = pulses[index]; points.set(index, { at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents: String(Math.round(marketCapUsdAtPulse(seed, pulse) * 100)) });
      count++; if (count === 2 || count % 4 === 0 || count === pulses.length) self.postMessage({ id, points: [...points.entries()].sort((a, b) => a[0] - b[0]).map(([, point]) => point) });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (latest !== id || source !== seed) return;
    cache.set(period, [...points.entries()].sort((a, b) => a[0] - b[0]).map(([, point]) => point));
  } catch { if (latest === id) self.postMessage({ id, error: 'Projected market history is unavailable.' }); }
};
