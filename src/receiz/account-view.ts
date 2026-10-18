import type { WalletObservation } from './wallet-observation';

/** Completeness of a retained display frame, never financial authority. */
export function hasSettledAccountView(value: WalletObservation | null): boolean {
  if (!value?.history?.length || !Number.isFinite(Date.parse(value.observedAt))) return false;
  const { wallet, history } = value;
  if (history.some(point => point.userId !== wallet.userId)) return false;
  if (value.source === 'account-genesis' && wallet.totalUsdCents === '0' && wallet.balancePhiMicro === '0') return true;
  const basis = value.historyBasis, last = history.at(-1)!;
  if (!basis || basis.schema !== 'bank.account-history-display.v1' || !/^\d{1,30}$/.test(basis.startKaiUPulse) || !/^\d{1,30}$/.test(basis.endKaiUPulse) || BigInt(basis.startKaiUPulse) > BigInt(basis.endKaiUPulse)) return false;
  if (history[0].kaiUPulse !== basis.startKaiUPulse || last.kaiUPulse !== basis.endKaiUPulse) return false;
  if (wallet.kaiUpulse && (!/^\d{1,30}$/.test(wallet.kaiUpulse) || BigInt(wallet.kaiUpulse) > BigInt(basis.endKaiUPulse))) return false;
  return (['totalUsdCents','reserveUsdCents','settlementUsdCents'] as const).every(key => last[key] === wallet[key]);
}
