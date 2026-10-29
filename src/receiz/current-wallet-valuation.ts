import {keepsWalletCashComposition} from './wallet-cash-basis';
import {currentBalanceCaptureKai} from './current-balance-source';
import {projectCurrentWalletAt,projectCurrentWalletExtension} from './composite-wallet-history';
import {isWalletQuoteHeld,type WalletObservation} from './wallet-observation';
import type {SharedWallet} from './shared-wallet';
import {mergeWalletPoints} from './wallet-series';
const fields=['userId','totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro'] as const;
/** Current operands can append a future display point. They cannot reconstruct
 * any past interval, authorize execution or displace a held local note head. */
export function currentWalletObservation(wallet:SharedWallet,previous?:WalletObservation|null,evaluationKaiUPulse?:string):WalletObservation|null{
 const source=wallet.currentBalanceSource;if(!source||source.userId!==wallet.userId||previous?.source==='local-note-head'||previous&&isWalletQuoteHeld(previous))return null;
 if(!keepsWalletCashComposition([previous?.wallet.currentBalanceSource,previous?.chartSource],source))return null;
 try{const kai=currentBalanceCaptureKai(source),point=projectCurrentWalletAt(source,kai);
  if(!fields.every(key=>wallet[key]===point[key])||wallet.reservePhiMicro!==source.reservePhiMicro||wallet.settlementPhiMicro!==source.settlementPhiMicro)return null;
  // A current packet cannot rewrite or splice an older coordinate into known
  // history. Its ordinary later capture may append the next exact endpoint.
  const oldSource=previous?.wallet.currentBalanceSource;if(oldSource&&Date.parse(source.computedAt)<Date.parse(oldSource.computedAt))return null;
  let end=point,display=wallet;
  if(evaluationKaiUPulse&&/^\d{1,30}$/.test(evaluationKaiUPulse)&&BigInt(evaluationKaiUPulse)>BigInt(kai)){end=projectCurrentWalletAt(source,evaluationKaiUPulse);const reserve=source.reservePhiMicro;display={...wallet,totalUsdCents:end.totalUsdCents,reserveUsdCents:end.reserveUsdCents,settlementUsdCents:end.settlementUsdCents,balancePhiMicro:end.balancePhiMicro!,...(reserve!==null&&source.settlementPhiMicro!==null&&BigInt(reserve)<=BigInt(end.balancePhiMicro!)?{reservePhiMicro:reserve,settlementPhiMicro:(BigInt(end.balancePhiMicro!)-BigInt(reserve)).toString()}:{reservePhiMicro:null,settlementPhiMicro:null})};}
  if(previous?.historyBasis&&BigInt(end.kaiUPulse!)<=BigInt(previous.historyBasis.endKaiUPulse))return null;
  const history=mergeWalletPoints([previous?.wallet.userId===wallet.userId?previous.history??[]:[],[end]],wallet.userId);
  return {wallet:display,observedAt:end.at,history,historyBasis:{schema:'bank.account-history-display.v1',kind:'current-valuation-v129',startKaiUPulse:history[0].kaiUPulse!,endKaiUPulse:end.kaiUPulse!,balancePhiMicro:display.balancePhiMicro,reserveUsdCents:display.reserveUsdCents}};
 }catch{return null;}
}
export function advanceCurrentWalletObservation(value:WalletObservation,kaiUPulse:string):WalletObservation|null{
 const source=value.wallet.currentBalanceSource,basis=value.historyBasis;
 if(!source||basis?.kind!=='current-valuation-v129'||value.source==='local-note-head'||isWalletQuoteHeld(value)||!/^\d{1,30}$/.test(kaiUPulse)||BigInt(kaiUPulse)/1_000_000n<=BigInt(basis.endKaiUPulse)/1_000_000n)return null;
 try{const prior=projectCurrentWalletAt(source,basis.endKaiUPulse);
  if(!fields.every(key=>value.wallet[key]===prior[key]))return null;
  const previousReserve=source.reservePhiMicro,previousSettlement=source.settlementPhiMicro;
  if(previousReserve!==null&&previousSettlement!==null&&(value.wallet.reservePhiMicro!==previousReserve||value.wallet.settlementPhiMicro!==(BigInt(value.wallet.balancePhiMicro)-BigInt(previousReserve)).toString()))return null;
  const point=projectCurrentWalletAt(source,kaiUPulse),total=point.balancePhiMicro!;
  const split=previousReserve!==null&&previousSettlement!==null&&BigInt(previousReserve)<=BigInt(total)?{reservePhiMicro:previousReserve,settlementPhiMicro:(BigInt(total)-BigInt(previousReserve)).toString()}:{reservePhiMicro:null,settlementPhiMicro:null};
  const wallet={...value.wallet,totalUsdCents:point.totalUsdCents,reserveUsdCents:point.reserveUsdCents,settlementUsdCents:point.settlementUsdCents,balancePhiMicro:total,...split};
  // Ordinary ticks stay endpoint-only. After suspension, calculate the unseen
  // interval once from the same held operands, just as full-history resume does.
  const added=BigInt(kaiUPulse)-BigInt(basis.endKaiUPulse)<=2_000_000n?[point]:projectCurrentWalletExtension(source,basis.endKaiUPulse,kaiUPulse);
  return {...value,wallet,observedAt:point.at,history:mergeWalletPoints([value.history??[],added],wallet.userId),historyBasis:{...basis,endKaiUPulse:kaiUPulse,balancePhiMicro:total,reserveUsdCents:point.reserveUsdCents}};
 }catch{return null;}
}
