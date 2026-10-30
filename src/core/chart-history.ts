export type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
export const CHART_PERIODS: readonly ChartPeriod[] = ['ALL', '1D', '1W', '1M', '3M', '1Y'];
const spans: Record<Exclude<ChartPeriod, 'ALL'>, number> = { '1D': 1, '1W': 7, '1M': 31, '3M': 93, '1Y': 366 };
export interface ChartTimeRange { start: number; end: number; }
/** Keep each selected window distinct, bounded by the actual source beginning. */
export function chartPeriodBounds(points: readonly { at: string }[], period: ChartPeriod): ChartTimeRange | undefined {
  if (!points.length) return undefined;
  const end = Date.parse(points.at(-1)!.at), first = Date.parse(points[0].at);
  const start = period === 'ALL' ? first : Math.max(first, end - spans[period] * 86_400_000);
  return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?{start,end}:undefined;
}
export function chartDateLabel(at: number, period: ChartPeriod, range?: ChartTimeRange): string {
  const intraday = period === '1D' || !!range && range.end - range.start < 86_400_000;
  const options: Intl.DateTimeFormatOptions = intraday ? {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'} : {month:'short',day:'numeric',year:'numeric'};
  if (range && range.end > range.start && range.end - range.start < 60_000) options.second = '2-digit';
  return new Date(at).toLocaleString(undefined, options);
}
export function chartPeriodPoints<T extends { at: string }>(points: readonly T[], period: ChartPeriod): T[] {
  if (period === 'ALL' || points.length < 2) return [...points];
  const start = Date.parse(points.at(-1)!.at) - spans[period] * 86_400_000;
  const first = points.findIndex(point => Date.parse(point.at) >= start);
  if (first <= 0) return [...points];
  return points.slice(first);
}
export function chartChange(from: string, to: string) {
  const opening = BigInt(from), delta = BigInt(to) - opening;
  return { deltaCents: delta.toString(), percent: opening === 0n ? null : Number(delta * 1_000_000n / opening) / 10_000, trend: delta > 0n ? 'up' as const : delta < 0n ? 'down' as const : 'flat' as const };
}
/** Display sampling preserves endpoints and extrema without changing source values.
 * Ordered source times distribute the same budget over elapsed time, so dense
 * recent pulse observations cannot consume the older visible history. */
export function sampleChartIndices(values: readonly number[], limit = 320, times?:readonly number[]): number[] {
  if (values.length <= limit) return values.map((_, i) => i);
  const buckets = Math.max(1, Math.floor((limit - 2) / 2)), indices = new Set([0, values.length - 1]);
  const timed=times?.length===values.length&&Number.isFinite(times[0])&&Number.isFinite(times.at(-1))&&times.at(-1)!>times[0];
  let cursor=1;
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = timed?cursor:1+Math.floor(bucket*(values.length-2)/buckets);
    if(timed){const boundary=times![0]+(times!.at(-1)!-times![0])*(bucket+1)/buckets;while(cursor<values.length-1&&(bucket===buckets-1||times![cursor]<boundary))cursor++;}
    const end=timed?cursor:1+Math.floor((bucket+1)*(values.length-2)/buckets);
    if(start===end)continue;
    let min = start, max = start;
    for (let i = start + 1; i < end; i++) { if (values[i] < values[min]) min = i; if (values[i] > values[max]) max = i; }
    indices.add(min); indices.add(max);
  }
  return [...indices].sort((a, b) => a - b);
}
