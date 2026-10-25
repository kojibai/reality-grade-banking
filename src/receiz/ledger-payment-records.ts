import type {PublicRecord} from './public-network';
import {readWalletFundingAttribution,walletAttributionFitsRecord} from './ledger-wallet-fifo';
const activityTitles:Record<string,string>={
 market_buy:'Asset Purchase',market_sell:'Asset Sale',
 sports_pack_purchase:'Pack Purchase',signal_pack_purchase:'Pack Purchase',signal_card_reward_seal:'Collectible Created',
 prediction_wager:'Prediction Placed',prediction_payout:'Prediction Payout',prediction_refund:'Prediction Refund',
 note_mint:'Note Created',note_claim:'Note Deposited',
 offline_cash_allocate:'Note Created',offline_cash_cancel:'Note Refunded',offline_note_redeem:'Note Deposited',
 chat_transfer_send:'Money Sent',chat_transfer_receive:'Money Received',admin_adjustment:'Balance Adjustment',
};
const fundingTitles:Record<string,string>={
 bank_connected_note_allocate:'Note Created',bank_connected_note_cancel:'Note Refunded',bank_connected_note_redeem:'Note Deposited',
 stripe_checkout_wallet_deposit:'Money Added',stripe_checkout_connect_payment:'Payment Received',stripe_checkout_profile_original_download:'Download Sale',
 sports_arena_pack_purchase:'Pack Purchase',signal_run_pack_purchase:'Pack Purchase',signal_run_rewarded_card_seal:'Collectible Created',
 sigil_upload_claim:'Asset Deposited',profile_rollup_seed:'Opening Balance',
};
// Display names only. Preserve the exact kind, summary and original evidence.
const actionTitles:Record<string,string>={
 'auth.login.receiz_id':'Signed In','auth.login.passkey':'Signed In','auth.login.receiz_key':'Signed In','auth.login.magic_link':'Signed In',
 'auth.login.receiz_id.create':'Account Created','auth.login.receiz_id.switch':'Account Switched','auth.logout':'Signed Out',
 'identity.key.receiz_device_bind':'Device Linked','identity.key.enroll':'Signing Key Added','identity.key.revoke':'Signing Key Revoked',
 'identity.key.export_state':'Account Exported','portable.import.identity_key':'Account Imported',
 'business.account.created':'Business Account Created','business.account.member.added':'Account Member Added',
 'receiz.record.insert':'Record Created','receiz.record.update':'Record Updated','receiz.record.dashboard':'Record Saved','receiz.record.connect':'Delegated Record Action',
 'receiz.seal.document':'Document Sealed','receiz.seal.attachment':'Attachment Sealed','receiz.seal.profile_original':'Original Sealed',
 'receiz.original.transfer':'Asset Transfer','receiz.sports_arena.card_transfer':'Collectible Transfer','signal_run.card.transfer':'Collectible Transfer',
 'signal_run.card.transfer_claim':'Collectible Claimed','signal_run.card.transfer_download':'Collectible Downloaded',
 'receiz.sports_arena.pack_purchase':'Pack Received','receiz.sports_arena.reward_pack':'Reward Pack Received','receiz.sports_arena.pack_derby_reward':'Reward Pack Received',
 'receiz.signal_run.rewarded_card_seal':'Collectible Created','signal_run.vault.global_sync':'Collectibles Registered',
 'receiz.sports_arena.tournament_entry':'Tournament Entry','receiz.sports_arena.entry':'Sports Entry','signal_run.best_score':'Personal Best Updated','signal_run.card.live_battle':'Collectible Match',
 'market.share.buy':'Asset Purchase','market.share.sell':'Asset Sale','market.share.import':'Ownership Imported','market.share.export':'Ownership Exported',
 'market.prediction.wager':'Prediction Placed','market.prediction.payout':'Prediction Payout','market.prediction.refund':'Prediction Refund','market.prediction.export':'Prediction Exported',
 'wallet.reserve.credit':'Money Added',
 'receiz.chat.message':'Message Saved','receiz.chat.conversation':'Conversation Saved',
 'world.agent.profile.welcome':'Profile Greeting','world.agent.profile.reply':'Profile Reply','world.agent.chat.reply':'Agent Reply',
 'world.twin.usage.accepted':'Agent Request Accepted','world.twin.usage.provider_accepted':'Agent Processing Accepted',
 'world.twin.starter.success':'Agent Task Completed','world.twin.starter.durable_result':'Agent Result Saved','world.twin.starter.claim':'Agent Request Recorded',
 'market.twin.mandate.updated':'Agent Instructions Updated','market.twin.intent.executed':'Agent Action Executed',
 'world.campaign.created':'Campaign Created','world.campaign.research':'Campaign Research','world.campaign.sequence':'Campaign Sequence Updated',
 'world.campaign.dispatch':'Campaign Delivery','world.campaign.lifecycle':'Campaign Status Updated','world.campaign.sync':'Campaign Synced','world.campaign.schedule':'Campaign Scheduled',
 'contacts.event.log':'Contact Activity','contacts.import':'Contacts Imported',
 'calendar.event.manual.created':'Calendar Event Created','calendar.event.system.created':'Calendar Event Created','calendar.event.embed.created':'Calendar Event Created',
 'receiz.pre_v4_repair_applied':'Account History Updated',
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
 if(record.source==='actions'&&Object.hasOwn(actionTitles,record.kind))return actionTitles[record.kind];
 if(record.source==='graph'&&record.kind==='card-transfer')return 'Collectible Transfer';
 if(record.source==='wallet'){
  const origin=record.details?.fundingOrigin,source=origin&&typeof origin==='object'&&!Array.isArray(origin)?origin.source:undefined;
  if(typeof source==='string'&&Object.hasOwn(fundingTitles,source))return fundingTitles[source];
  const kind=record.kind==='wallet_ledger_entry'?record.details?.ledgerEntryKind:record.kind;
  if(typeof kind==='string'&&Object.hasOwn(activityTitles,kind))return activityTitles[kind];
  if(record.kind==='reserve_credit')return record.details?.reserveCreditKind==='payment'?'Payment Received':record.details?.reserveCreditKind==='paid_download'?'Download Sale':'Money Added';
  if(/^(sports|signal)_card_transfer$/.test(record.kind))return flow==='in'?'Collectible Received':flow==='out'?'Collectible Sent':'Collectible Transfer';
  if(record.kind==='wallet_ledger_entry'||record.kind==='credit'||record.kind==='debit')return 'Balance Update';
 }
 if(record.source!=='proofs'&&record.title===record.kind.replace(/[._]/g,' '))return 'Recorded Activity';
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
 for(const record of records){if(ledgerPaymentRole(record)!=='movement')continue;for(const key of new Set([ledgerPaymentReference(record),record.evidence.transferId].filter((key):key is string=>!!key)))movements.set(key,movements.has(key)?null:record);}
 for(const record of records){if(ledgerPaymentRole(record)!=='execution')continue;const keys=[ledgerPaymentReference(record),record.evidence.publicTransferId].filter((key):key is string=>!!key),matches=new Set(keys.map(key=>movements.get(key)).filter((row):row is PublicRecord=>!!row)),movement=keys.some(key=>movements.get(key)===null)||matches.size!==1?undefined:[...matches][0];
  if(!movement||movement.authority!==record.authority||movement.amountUsdCents===null||movement.amountUsdCents!==record.amountUsdCents||movement.valueOperands?.amountPhiMicro&&record.valueOperands?.amountPhiMicro&&movement.valueOperands.amountPhiMicro!==record.valueOperands.amountPhiMicro)continue;
  const group=executions.get(movement);if(group)group.push(record);else executions.set(movement,[record]);included.add(record);
 }
 return records.filter(record=>!included.has(record)).map(record=>({record,executionRecords:executions.get(record)??[]}));
}
