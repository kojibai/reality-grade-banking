import {rememberNativeBalanceCalculation,knownNativeBalanceCalculation,type NativeBalanceCalculation} from './balance-calculation-observation';
import type {WalletRateCalculation} from './historical-wallet';
import { quoteReceizDisplayUsdV122 } from '@receiz/sdk';
import { hasSettledAccountView } from './account-view';
import { extendWalletHistory } from './extend-wallet-history';
import { historicalWalletUsdRate } from './historical-wallet';
import { isWalletQuoteHeld, type WalletObservation } from './wallet-observation';

const uint = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d{0,39})$/.test(value);

/** Revalue only the reconciled unchanged holdings beneath a complete native
 * source. This updates display quotes, never units, a financial head or rights. */
export function revalueKnownWallet(previous: WalletObservation, kaiUPulse: string, observedAt: string, observe?:(value:NativeBalanceCalculation)=>void): WalletObservation | null {
  const { wallet, historyBasis: basis } = previous;
  if (isWalletQuoteHeld(previous) || !basis || basis.kind !== undefined || previous.walletScope !== 'native-full' || wallet.projectionComplete !== true || !hasSettledAccountView(previous)
    || ![basis.settlementPhiMicro, basis.balancePhiMicro, basis.reserveUsdCents].every(uint)
    || basis.balancePhiMicro !== wallet.balancePhiMicro || basis.reserveUsdCents !== wallet.reserveUsdCents
    || BigInt(basis.settlementPhiMicro!) > BigInt(basis.balancePhiMicro!)
    || !/^\d{1,30}$/.test(kaiUPulse) || BigInt(kaiUPulse) / 1_000_000n <= BigInt(basis.endKaiUPulse) / 1_000_000n
    || !Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) <= Date.parse(previous.observedAt)) return null;
  let rateMicrocents:string|null=null,rateCalculation:WalletRateCalculation|undefined;
  const settlement = basis.settlementPhiMicro === '0' ? '0' : quoteReceizDisplayUsdV122(basis.settlementPhiMicro!, rateMicrocents=historicalWalletUsdRate(kaiUPulse,value=>{rateCalculation=value;}));
  const nextWallet = { ...wallet, settlementPhiMicro:basis.settlementPhiMicro!, reservePhiMicro:(BigInt(basis.balancePhiMicro!)-BigInt(basis.settlementPhiMicro!)).toString(), settlementUsdCents: settlement, totalUsdCents: (BigInt(wallet.reserveUsdCents) + BigInt(settlement)).toString() };
  const next = extendWalletHistory(previous, nextWallet, observedAt, kaiUPulse);
  if (!next.historyBasis || !next.history?.length) return null;
  const last = next.history.length - 1;
  const result:WalletObservation={ ...previous, ...next, history: next.history.map((point, index) => index === last ? { ...point, valuation: 'deterministic-v129' as const } : point) };
  const calculation:NativeBalanceCalculation={kind:'native',userId:wallet.userId,kaiUPulse,source:'local-known-valuation',sourceDigest:knownNativeBalanceCalculation(previous)?.sourceDigest,statement:knownNativeBalanceCalculation(previous)?.statement,reserveUsdCents:wallet.reserveUsdCents,settlementPhiMicro:basis.settlementPhiMicro!,balancePhiMicro:basis.balancePhiMicro!,rateMicrocents,output:result.wallet,...(rateCalculation?{rateCalculation}:{})};
  rememberNativeBalanceCalculation(result,calculation);observe?.(calculation);return result;
}
