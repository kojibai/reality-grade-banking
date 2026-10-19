import type {PublicRecord} from './public-network';
import {readWalletFundingAttribution,walletAttributionFitsRecord,type WalletFundingAttribution} from './ledger-wallet-fifo';
import {readWalletFundingHistory,type WalletFundingHistory} from './ledger-funding-history';
import {readWalletProofCohorts,type WalletProofCohort} from './ledger-wallet-cohorts';
/** Reuse the already loaded public source context for the exact private
 * transaction ID. Never match usernames, actors, times or amounts alone. */
export function enrichWalletFundingContext(records:readonly PublicRecord[],sources:readonly PublicRecord[]):PublicRecord[]{
 const byTransfer=new Map<string,{attribution:WalletFundingAttribution;history?:WalletFundingHistory;cohorts?:WalletProofCohort[]}|null>();
 for(const record of sources){const attribution=readWalletFundingAttribution(record.details?.fundingAttribution);if(!attribution?.transferId||!walletAttributionFitsRecord(attribution,record,record.details?.fundingTransferId===record.evidence.transferId))continue;const history=readWalletFundingHistory(record.details?.fundingHistory,attribution),cohorts=readWalletProofCohorts(record.details?.fundingCohorts),key=attribution.transferId,held=byTransfer.get(key);if(held===null)continue;if(held&&JSON.stringify(held.attribution)!==JSON.stringify(attribution)){byTransfer.set(key,null);continue;}byTransfer.set(key,{attribution,...(history?{history}:{}),...(cohorts?{cohorts}:{})});}
 return records.map(record=>{
  const context=record.authority==='account-source-projection'&&record.evidence.transferId?byTransfer.get(record.evidence.transferId):undefined;
  if(!context||!walletAttributionFitsRecord(context.attribution,record,true))return record;
  const held=readWalletFundingAttribution(record.details?.fundingAttribution);if(held&&held.walletDebitId!==context.attribution.walletDebitId)return record;
  return {...record,details:{...record.details,fundingAttribution:context.attribution as unknown as NonNullable<PublicRecord['details']>,fundingTransferId:record.evidence.transferId,...(context.history?{fundingHistory:context.history as unknown as NonNullable<PublicRecord['details']>[]} : {}),...(context.cohorts?{fundingCohorts:context.cohorts as unknown as NonNullable<PublicRecord['details']>[]}:{})}};
 });
}
