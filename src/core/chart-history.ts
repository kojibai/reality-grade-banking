export type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
export const CHART_PERIODS: readonly ChartPeriod[] = ['ALL', '1D', '1W', '1M', '3M', '1Y'];
const spans: Record<Exclude<ChartPeriod, 'ALL'>, number> = { '1D': 1, '1W': 7, '1M': 31, '3M': 93, '1Y': 366 };
export interface ChartTimeRange { start: number; end: number; }
/** Presentation window only. Missing earlier observations remain missing. */
export function chartPeriodBounds(points: readonly { at: string }[], period: ChartPeriod): ChartTimeRange | undefined {
  if (!points.length) return undefined;
  const end=Date.parse(points.at(-1)!.at),start=period==='ALL'?Date.parse(points[0].at):end-spans[period]*86400000;
  return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?{start,end}:undefined;
}
export function chartDateLabel(at: number, period: ChartPeriod): string {
  return new Date(at).toLocaleString(undefined, period==='1D'?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',year:'numeric'});
}
export function chartPeriodPoints<T extends { at: string }>(points: readonly T[], period: ChartPeriod): T[] {
  if (period === 'ALL' || points.length < 2) return [...points];
  const start = Date.parse(points.at(-1)!.at) - spans[period] * 86_400_000;
  const first = points.findIndex(point => Date.parse(point.at) >= start);
  if (first <= 0) return [...points];
  return points.slice(Date.parse(points[first].at) === start ? first : first - 1);
}
export function chartChange(from: string, to: string) {
  const opening = BigInt(from), delta = BigInt(to) - opening;
  return { deltaCents: delta.toString(), percent: opening === 0n ? null : Number(delta * 1_000_000n / opening) / 10_000, trend: delta > 0n ? 'up' as const : delta < 0n ? 'down' as const : 'flat' as const };
}
/** Display sampling preserves endpoints and extrema without changing source values. */
export function sampleChartIndices(values: readonly number[], limit = 320): number[] {
  if (values.length <= limit) return values.map((_, i) => i);
  const buckets = Math.max(1, Math.floor((limit - 2) / 2)), indices = new Set([0, values.length - 1]);
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = 1 + Math.floor(bucket * (values.length - 2) / buckets), end = 1 + Math.floor((bucket + 1) * (values.length - 2) / buckets);
    let min = start, max = start;
    for (let i = start + 1; i < end; i++) { if (values[i] < values[min]) min = i; if (values[i] > values[max]) max = i; }
    indices.add(min); indices.add(max);
  }
  return [...indices].sort((a, b) => a - b);
}
