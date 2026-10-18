import type {WalletObservation} from './wallet-observation';
import type {SharedWallet} from './shared-wallet';
import {hasSettledAccountView} from './account-view';
import {projectHistoricalWallet} from './historical-wallet';
import {appendWalletPoint,mergeWalletPoints} from './wallet-series';

/** Reprice an admitted movement prefix only after the account read confirms
 * the same financial head and holdings. This supplies display samples, never
 * a credit, transaction, or replacement for missing ownership history. */
export function extendWalletHistory(previous:WalletObservation|null,wallet:SharedWallet,observedAt:string,kaiUPulse:string):WalletObservation{
 const history=appendWalletPoint(previous?.history??[],wallet,observedAt,kaiUPulse);
 const next:WalletObservation={wallet,observedAt,history,...(previous?.quoteHold?.userId===wallet.userId?{quoteHold:previous.quoteHold}:{})},basis=previous?.historyBasis;
 if(!previous||!hasSettledAccountView(previous)||!basis||!/^\d{1,30}$/.test(kaiUPulse)||BigInt(kaiUPulse)<BigInt(basis.endKaiUPulse)
  ||wallet.userId!==previous.wallet.userId||wallet.kaiUpulse!==previous.wallet.kaiUpulse
  ||basis.balancePhiMicro!==wallet.balancePhiMicro||basis.reserveUsdCents!==wallet.reserveUsdCents||!basis.settlementPhiMicro)return next;
 try{
  const extension=projectHistoricalWallet({userId:wallet.userId,endKaiUPulse:kaiUPulse,transactions:[{kaiUPulse:basis.endKaiUPulse,reserveDeltaUsdCents:basis.reserveUsdCents,settlementDeltaPhiMicro:basis.settlementPhiMicro}]});
  next.history=appendWalletPoint(mergeWalletPoints([previous.history??[],extension],wallet.userId),wallet,observedAt,kaiUPulse);
  next.historyBasis={...basis,endKaiUPulse:kaiUPulse};
  next.walletScope=previous.walletScope;
 }catch{ /* An unavailable display extension never changes the account read. */ }
 return next;
}
