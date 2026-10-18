import type { SharedWallet } from './shared-wallet';
import { chartChange, chartPeriodPoints, sampleChartIndices, type ChartPeriod } from '../core/chart-history';
export interface WalletPoint { userId: string; at: string; kaiUPulse: string | null; totalUsdCents: string; reserveUsdCents: string; settlementUsdCents: string; valuation?: 'deterministic-v129'|'legacy-model-v129'; }
// The exact v129 KKS day lattice; the displayed whole-pulse approximation is 17,491.
export const KAI_DAY_UPULSES = 17_491_270_421n;
/** The existing phi-exact UTC display bridge, including fractional pulses.
 * UTC labels never establish financial admission or causal order. */
export function walletPointTime(kaiUPulse: string): string {
  const numerator = BigInt(kaiUPulse) * 5236067977499789696409173668731276235440618359611525724270897245n;
  const denominator = 10n ** 66n, whole = numerator / denominator, remainder = numerator % denominator;
  const milliseconds = whole + (remainder * 2n > denominator || remainder * 2n === denominator && whole % 2n === 1n ? 1n : 0n);
  return new Date(Number(1715323541888n + milliseconds)).toISOString();
}
/** Bound the display cache without dropping its real beginning or rail extrema.
 * The complete admitted original remains the retained account source. */
function retainWalletPoints(history: readonly WalletPoint[]): WalletPoint[] {
  if (history.length <= 4096) return [...history];
  const indices = new Set<number>();
  for (const rail of ['totalUsdCents', 'reserveUsdCents', 'settlementUsdCents'] as const) {
    for (const index of sampleChartIndices(history.map(point => Number(point[rail])), 1366)) indices.add(index);
  }
  return [...indices].sort((a, b) => a - b).map(index => history[index]);
}
/** Merge display observations beneath their already-admitted same-account sources. */
export function mergeWalletPoints(histories: readonly (readonly WalletPoint[])[], userId: string): WalletPoint[] {
  const points = new Map<string, WalletPoint>(), observedCoordinates = new Set<string>();
  for (const history of histories) for (const point of history) {
    if (point.userId !== userId) continue;
    const at = Date.parse(point.at);
    if (!Number.isFinite(at)) continue;
    if (!point.valuation) observedCoordinates.add([at, point.kaiUPulse].join(':'));
    const key = [at, point.kaiUPulse, point.totalUsdCents, point.reserveUsdCents, point.settlementUsdCents].join(':');
    // A recomputed sample cannot replace a recorded quote, even when equal.
    if (!point.valuation || points.get(key)?.valuation !== undefined || !points.has(key)) points.set(key, point);
  }
  return retainWalletPoints([...points.values()].filter(point => !point.valuation || !observedCoordinates.has([Date.parse(point.at), point.kaiUPulse].join(':'))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)));
}
export function appendWalletPoint(history: readonly WalletPoint[], wallet: SharedWallet, at: string, kaiUPulse: string | null): WalletPoint[] {
  const point = { userId: wallet.userId, at, kaiUPulse, totalUsdCents: wallet.totalUsdCents, reserveUsdCents: wallet.reserveUsdCents, settlementUsdCents: wallet.settlementUsdCents };
  const previous = history.filter(item => item.userId === wallet.userId && Date.parse(item.at) < Date.parse(at));
  return retainWalletPoints([...previous, point]);
}
/** One display window for the chart and its movement figures; no synthetic opening balance. */
export function selectBalanceChartPoints(history: readonly WalletPoint[], wallet: SharedWallet | null, observedAt: string | null, period: ChartPeriod): WalletPoint[] {
  const full = wallet && observedAt ? appendWalletPoint(history, wallet, observedAt, history.at(-1)?.kaiUPulse ?? null) : history;
  return chartPeriodPoints(full.filter(point => point.userId === wallet?.userId), period);
}
export function settlementDayChange(history: readonly WalletPoint[], nowUPulse: string): { deltaCents: string; percent: number | null; startUPulse: string } | null {
  if (!/^\d{1,30}$/.test(nowUPulse)) return null;
  const start = BigInt(nowUPulse) / KAI_DAY_UPULSES * KAI_DAY_UPULSES;
  const latest = history.at(-1);
  const opening = [...history].reverse().find(point => point.kaiUPulse && /^\d{1,30}$/.test(point.kaiUPulse) && BigInt(point.kaiUPulse) <= start && BigInt(point.kaiUPulse) >= start - KAI_DAY_UPULSES && point.userId === latest?.userId);
  if (!latest || !opening || !latest.kaiUPulse || !/^\d{1,30}$/.test(latest.kaiUPulse) || BigInt(latest.kaiUPulse) < start) return null;
  const base = BigInt(opening.settlementUsdCents), delta = BigInt(latest.settlementUsdCents) - base;
  return { deltaCents: delta.toString(), percent: base === 0n ? null : Number(delta * 1_000_000n / base) / 10_000, startUPulse: start.toString() };
}
export function settlementVisibleChange(history: readonly WalletPoint[]) {
  const latest = history.at(-1); if (!latest) return null;
  const day = latest.kaiUPulse ? settlementDayChange(history, latest.kaiUPulse) : null;
  if (day) return { ...day, period: 'kai-day' as const, from: null };
  const latestKai = latest.kaiUPulse && /^\d{1,30}$/.test(latest.kaiUPulse) ? BigInt(latest.kaiUPulse) : null;
  const localDay = new Date(latest.at); localDay.setHours(0, 0, 0, 0);
  const start = latestKai === null ? localDay.getTime() : latestKai / KAI_DAY_UPULSES * KAI_DAY_UPULSES;
  const first = history.find(point => point.userId === latest.userId && (latestKai === null
    ? Date.parse(point.at) >= Number(start)
    : point.kaiUPulse && /^\d{1,30}$/.test(point.kaiUPulse) && BigInt(point.kaiUPulse) >= start && BigInt(point.kaiUPulse) <= latestKai));
  if (!first || first.at === latest.at) return null;
  return { ...chartChange(first.settlementUsdCents, latest.settlementUsdCents), period: 'observed' as const, from: first.at };
}
