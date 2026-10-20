import type {PublicRecord} from './public-network';
import {readWalletFundingAttribution,walletAttributionFitsRecord} from './ledger-wallet-fifo';
const activityTitles:Record<string,string>={
 market_buy:'Asset Purchase',market_sell:'Asset Sale',
 sports_pack_purchase:'Pack Purchase',signal_pack_purchase:'Pack Purchase',signal_card_reward_seal:'Collectible Created',
 prediction_wager:'Prediction Placed',prediction_payout:'Prediction Payout',prediction_refund:'Prediction Refund',
 note_mint:'Note Created',note_claim:'Note Deposited',
 chat_transfer_send:'Money Sent',chat_transfer_receive:'Money Received',admin_adjustment:'Balance Adjustment',
};
const fundingTitles:Record<string,string>={
 bank_connected_note_allocate:'Note Created',bank_connected_note_cancel:'Note Refunded',bank_connected_note_redeem:'Note Deposited',
 stripe_checkout_wallet_deposit:'Money Added',stripe_checkout_connect_payment:'Payment Received',stripe_checkout_profile_original_download:'Download Sale',
 sports_arena_pack_purchase:'Pack Purchase',signal_run_pack_purchase:'Pack Purchase',signal_run_rewarded_card_seal:'Collectible Created',
 sigil_upload_claim:'Asset Deposited',profile_rollup_seed:'Opening Balance',
};
export function ledgerPaymentRole(record:PublicRecord):'movement'|'execution'|null{
 if(record.kind==='wallet.transfer.connect')return 'execution';
 return record.source==='wallet'&&['chat_transfer','transfer'].includes(record.kind)?'movement':null;
}
export function ledgerRecordTitle(record:PublicRecord){
 const role=ledgerPaymentRole(record);
 const flow=record.authority==='account-source-projection'?record.accountFlow:undefined;
 if(role==='movement')return flow==='in'?'Money Received':flow==='out'?'Money Sent':'Money Transfer';
 if(role==='execution')return 'Delegated Wallet Transfer';
 if(record.source==='wallet'){
  const origin=record.details?.fundingOrigin,source=origin&&typeof origin==='object'&&!Array.isArray(origin)?origin.source:undefined;
  if(typeof source==='string'&&fundingTitles[source])return fundingTitles[source];
  const kind=record.kind==='wallet_ledger_entry'?record.details?.ledgerEntryKind:record.kind;
  if(typeof kind==='string'&&activityTitles[kind])return activityTitles[kind];
  if(record.kind==='reserve_credit')return record.details?.reserveCreditKind==='payment'?'Payment Received':record.details?.reserveCreditKind==='paid_download'?'Download Sale':'Money Added';
  if(/^(sports|signal)_card_transfer$/.test(record.kind))return flow==='in'?'Collectible Received':flow==='out'?'Collectible Sent':'Collectible Transfer';
  if(record.kind==='wallet_ledger_entry'||record.kind==='credit'||record.kind==='debit')return 'Balance Update';
 }
 return record.title;
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
