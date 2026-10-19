import type {PublicRecord} from './public-network';
import {readWalletFundingAttribution,walletAttributionFitsRecord} from './ledger-wallet-fifo';
export function ledgerPaymentRole(record:PublicRecord):'movement'|'execution'|null{
 if(record.kind==='wallet.transfer.connect')return 'execution';
 return record.source==='wallet'&&['chat_transfer','transfer'].includes(record.kind)?'movement':null;
}
export function ledgerRecordTitle(record:PublicRecord){
 const role=ledgerPaymentRole(record);
 return role==='movement'?'Value transfer':role==='execution'?'Delegated wallet transfer':record.title;
}
const references=new WeakMap<PublicRecord,string|null>();
/** Exact native FK only. A retained public Wallet witness may carry its
 * original native transfer ID alongside the public endpoint's alias. */
export function ledgerPaymentReference(record:PublicRecord):string|null{
 if(references.has(record))return references.get(record)!;
 let key=record.evidence.transferId??null;
 if(key&&ledgerPaymentRole(record)==='movement'){
  const attribution=readWalletFundingAttribution(record.details?.fundingAttribution);
  if(attribution?.transferId&&record.details?.fundingTransferId===key&&walletAttributionFitsRecord(attribution,record,true))key=attribution.transferId;
 }
 references.set(record,key);return key;
}
export type LedgerPaymentGroup={record:PublicRecord;executionRecords:PublicRecord[]};
/** Presentation grouping only: retain every original row and evidence field.
 * Contradictory amounts and ambiguous movement references stay separate. */
export function groupLedgerPaymentRecords(records:readonly PublicRecord[]):LedgerPaymentGroup[]{
 const movements=new Map<string,PublicRecord|null>(),executions=new Map<PublicRecord,PublicRecord[]>(),included=new Set<PublicRecord>();
 for(const record of records){if(ledgerPaymentRole(record)!=='movement')continue;const key=ledgerPaymentReference(record);if(key)movements.set(key,movements.has(key)?null:record);}
 for(const record of records){if(ledgerPaymentRole(record)!=='execution')continue;const key=ledgerPaymentReference(record),movement=key?movements.get(key):undefined;
  if(!movement||movement.authority!==record.authority||movement.amountUsdCents===null||movement.amountUsdCents!==record.amountUsdCents||movement.valueOperands?.amountPhiMicro&&record.valueOperands?.amountPhiMicro&&movement.valueOperands.amountPhiMicro!==record.valueOperands.amountPhiMicro)continue;
  const group=executions.get(movement);if(group)group.push(record);else executions.set(movement,[record]);included.add(record);
 }
 return records.filter(record=>!included.has(record)).map(record=>({record,executionRecords:executions.get(record)??[]}));
}
