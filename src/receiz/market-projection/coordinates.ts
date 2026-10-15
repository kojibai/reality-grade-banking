import type { ChartPeriod } from '../../core/chart-history';
import type { MarketCapSource } from './source';
// Same phi-exact UTC presentation bridge as Receiz. UTC is a label, never proof authority.
const T_NUM = 5236067977499789696409173668731276235440618359611525724270897245n, T_DEN = 10n ** 60n;
export function marketPulseTime(pulse: number): number { const n = BigInt(pulse) * T_NUM, q = n / T_DEN, r = n % T_DEN; return Number(1715323541888n + q + (r * 2n > T_DEN || r * 2n === T_DEN && q % 2n === 1n ? 1n : 0n)); }
const daySpans = { '1D': 1, '1W': 7, '1M': 31, '3M': 93, '1Y': 366 };
export function marketPeriodPulses(seed: Pick<MarketCapSource, 'serverPulse' | 'firstIssuancePulse'>, period: ChartPeriod, count = 64): number[] {
  const last = seed.serverPulse, span = period === 'ALL' ? last - seed.firstIssuancePulse : Math.ceil(daySpans[period] * 86400000 / (3 + Math.sqrt(5)) / 1000), first = Math.max(seed.firstIssuancePulse, last - span);
  const size = Math.min(count, last - first + 1);
  return Array.from({ length: size }, (_, i) => size === 1 ? last : Math.round(first + (last - first) * i / (size - 1)));
}
