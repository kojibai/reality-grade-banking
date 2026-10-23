import type {PublicRecord} from './public-network';
import {readWalletFundingAttribution,walletAttributionFitsRecord,type WalletFundingAttribution} from './ledger-wallet-fifo';
import {linkWalletFundingHistory,readWalletFundingHistory,type WalletFundingHistory} from './ledger-funding-history';
import {readWalletProofCohorts,walletProofCohortForSource,type WalletProofCohort} from './ledger-wallet-cohorts';
type Context={attribution:WalletFundingAttribution;history?:WalletFundingHistory;cohorts?:WalletProofCohort[]};
/** Reuse exact funding sources already held by this view. Public views never
 * inherit private context, and incomplete feeds never become FIFO inputs. */
export function enrichWalletFundingContext(records:readonly PublicRecord[],sources:readonly PublicRecord[]):PublicRecord[]{
 const publicOnly=records.every(record=>record.authority==='public-source-projection');
 const byTransfer=new Map<string,Context|null>(),byNote=new Map<string,Context|null>(),own=new Map<PublicRecord,Context>();
 const sourceCohorts=new Map<string,WalletProofCohort|null>();
 const add=(map:Map<string,Context|null>,key:string|undefined,context:Context)=>{
  if(!key)return;const held=map.get(key);if(held===null)return;
  if(held&&JSON.stringify(held.attribution)!==JSON.stringify(context.attribution)){map.set(key,null);return;}
  map.set(key,held?{...context,history:context.history??held.history,cohorts:context.cohorts??held.cohorts}:context);
 };
 for(const record of new Set([...sources,...records])){
  if(publicOnly&&record.authority!=='public-source-projection')continue;
  // A newly attributed debit can spend the same recorded credit as an older
  // payment. Bind its retained public proof cohort by that exact credit ID and
  // native units below; the earlier payment is not a new funding authority.
  for(const cohort of readWalletProofCohorts(record.details?.fundingCohorts)??[]){
   const before=sourceCohorts.get(cohort.creditSourceId);
   if(before===null||before===cohort)continue;
   sourceCohorts.set(cohort.creditSourceId,before&&JSON.stringify(before)!==JSON.stringify(cohort)?null:cohort);
  }
  const attribution=readWalletFundingAttribution(record.details?.fundingAttribution);
  if(!attribution||!walletAttributionFitsRecord(attribution,record,record.details?.fundingTransferId===record.evidence.transferId))continue;
  const history=readWalletFundingHistory(record.details?.fundingHistory,attribution),cohorts=readWalletProofCohorts(record.details?.fundingCohorts),context={attribution,history,cohorts};
  own.set(record,context);add(byTransfer,attribution.transferId,context);add(byNote,attribution.noteId,context);
  for(const entry of history??[]){const parent={attribution:entry.parent,cohorts};add(byTransfer,entry.parent.transferId,parent);add(byNote,entry.parent.noteId,parent);}
 }
 const transfers=new Map([...byTransfer].flatMap(([key,value])=>value?[[key,value.attribution] as const]:[]));
 const notes=new Map([...byNote].flatMap(([key,value])=>value?[[key,value.attribution] as const]:[]));
 return records.map(record=>{
  const carried=own.get(record),matching=carried?.attribution.transferId?byTransfer.get(carried.attribution.transferId):record.authority==='account-source-projection'&&record.evidence.transferId?byTransfer.get(record.evidence.transferId):undefined;
  const context=carried&&matching&&JSON.stringify(carried.attribution)===JSON.stringify(matching.attribution)?{...carried,history:carried.history??matching.history,cohorts:carried.cohorts??matching.cohorts}:carried??matching;
  if(!context||!walletAttributionFitsRecord(context.attribution,record,record.details?.fundingTransferId===record.evidence.transferId||record.authority==='account-source-projection'&&context.attribution.transferId===record.evidence.transferId))return record;
  const held=readWalletFundingAttribution(record.details?.fundingAttribution);if(held&&held.walletDebitId!==context.attribution.walletDebitId)return record;
  const linked=linkWalletFundingHistory(context.attribution,transfers,notes),history=linked&&linked.length>=(context.history?.length??0)?linked:context.history;
  const cohorts=new Map<string,WalletProofCohort|null>();
  const addCohorts=(values:WalletProofCohort[]|undefined)=>{for(const value of values??[]){const before=cohorts.get(value.creditSourceId);if(before===null||before===value)continue;cohorts.set(value.creditSourceId,before&&JSON.stringify(before)!==JSON.stringify(value)?null:value);}};
  addCohorts(context.cohorts);
  for(const entry of history??[]){const parent=entry.parent;addCohorts(parent.transferId?byTransfer.get(parent.transferId)?.cohorts:parent.noteId?byNote.get(parent.noteId)?.cohorts:undefined);}
  const fundingSources=[context.attribution,...(history??[]).map(entry=>entry.parent)].flatMap(value=>value.parts.flatMap(part=>part.sources));
  for(const source of fundingSources){const known=sourceCohorts.get(source.sourceId);if(known)addCohorts([known]);}
  const selected=[...cohorts.values()].filter((value):value is WalletProofCohort=>!!value);
  const boundCohorts=selected.filter(cohort=>sourceCohorts.get(cohort.creditSourceId)!==null&&fundingSources.some(source=>walletProofCohortForSource([cohort],source)));
  const details:NonNullable<PublicRecord['details']>={...record.details,fundingAttribution:context.attribution as unknown as NonNullable<PublicRecord['details']>,...(record.evidence.transferId?{fundingTransferId:record.evidence.transferId}:{}),...(history?{fundingHistory:history as unknown as NonNullable<PublicRecord['details']>[]} : {})};
  if(boundCohorts.length)details.fundingCohorts=boundCohorts as unknown as NonNullable<PublicRecord['details']>[];
  else delete details.fundingCohorts;
  return {...record,details};
 });
}
