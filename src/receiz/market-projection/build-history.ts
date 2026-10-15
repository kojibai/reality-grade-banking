import { CHART_PERIODS, type ChartPeriod } from '../../core/chart-history';
import { marketCapUsdAtPulse, marketPeriodPulses, marketPulseTime } from './project';
import { marketCapSummary, marketHistoryBasis, retainMarketInterval, type CapitalizationPoint, type MarketHistorySnapshot } from './history';
import type { MarketCapSource } from './source';
/** Run at build time or in the worker; never calculate these curves on the UI thread. */
export async function buildMarketHistory(source: MarketCapSource, previous: MarketHistorySnapshot | null = null, continuing: () => boolean = () => true, yieldSample: () => Promise<void> = async () => {}): Promise<MarketHistorySnapshot | null> {
  const basisSha256 = await marketHistoryBasis(source);
  if (!continuing()) return null;
  const sameBasis = previous?.basisSha256 === basisSha256 && previous.summary.serverPulse <= source.serverPulse;
  if (sameBasis && previous.summary.serverPulse === source.serverPulse && previous.summary.currentUsd === source.currentUsd) return { ...previous, summary: marketCapSummary(source) };
  const memo = new Map<number, CapitalizationPoint>(), series = {} as Record<ChartPeriod, CapitalizationPoint[]>;
  const point = async (pulse: number) => {
    if (!memo.has(pulse)) {
      memo.set(pulse, { at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents: String(Math.round(marketCapUsdAtPulse(source, pulse) * 100)) });
      await yieldSample();
    }
    return memo.get(pulse)!;
  };
  for (const period of CHART_PERIODS) {
    const pulses = marketPeriodPulses(source, period);
    if (sameBasis) series[period] = retainMarketInterval(previous.series[period], await point(pulses[0]), await point(source.serverPulse));
    else {
      series[period] = [];
      for (const pulse of pulses) { if (!continuing()) return null; series[period].push(await point(pulse)); }
    }
    if (!continuing()) return null;
  }
  return { schema: 'bank.public-market-history.v1', basisSha256, summary: marketCapSummary(source), series };
}
