import type { SharedWallet } from './shared-wallet';
import { chartChange } from '../core/chart-history';
export interface WalletPoint { userId: string; at: string; kaiUPulse: string | null; totalUsdCents: string; reserveUsdCents: string; settlementUsdCents: string; }
// The exact v129 KKS day lattice; the displayed whole-pulse approximation is 17,491.
export const KAI_DAY_UPULSES = 17_491_270_421n;
export function appendWalletPoint(history: readonly WalletPoint[], wallet: SharedWallet, at: string, kaiUPulse: string | null): WalletPoint[] {
  const point = { userId: wallet.userId, at, kaiUPulse, totalUsdCents: wallet.totalUsdCents, reserveUsdCents: wallet.reserveUsdCents, settlementUsdCents: wallet.settlementUsdCents };
  const previous = history.filter(item => item.userId === wallet.userId && Date.parse(item.at) < Date.parse(at));
  return [...previous, point].slice(-4096);
}
export function settlementDayChange(history: readonly WalletPoint[], nowUPulse: string): { deltaCents: string; percent: number | null; startUPulse: string } | null {
  if (!/^\d{1,30}$/.test(nowUPulse)) return null;
  const start = BigInt(nowUPulse) / KAI_DAY_UPULSES * KAI_DAY_UPULSES;
  const latest = history.at(-1);
  const opening = [...history].reverse().find(point => point.kaiUPulse && /^\d{1,30}$/.test(point.kaiUPulse) && BigInt(point.kaiUPulse) <= start && point.userId === latest?.userId);
  if (!latest || !opening || !latest.kaiUPulse || BigInt(latest.kaiUPulse) < start) return null;
  const base = BigInt(opening.settlementUsdCents), delta = BigInt(latest.settlementUsdCents) - base;
  return { deltaCents: delta.toString(), percent: base === 0n ? null : Number(delta * 1_000_000n / base) / 10_000, startUPulse: start.toString() };
}
export function settlementVisibleChange(history: readonly WalletPoint[]) {
  const latest = history.at(-1); if (!latest) return null;
  const day = latest.kaiUPulse ? settlementDayChange(history, latest.kaiUPulse) : null;
  if (day) return { ...day, period: 'kai-day' as const, from: null };
  const first = history.find(point => point.userId === latest.userId);
  if (!first || first.at === latest.at) return null;
  return { ...chartChange(first.settlementUsdCents, latest.settlementUsdCents), period: 'observed' as const, from: first.at };
}
