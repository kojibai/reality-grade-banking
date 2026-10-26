import {readMoneyState,type MoneyState,type MoneyCommitment} from './money-workspace';
import type {FixedSale} from './fixed-checkout';
export type MoneyJournalEvent={schema:'bank.money-planning-event.v1';ownerUid:string;operationId:string;data:string};
export type MoneyJournalPage={events:MoneyJournalEvent[];hasMore:boolean;nextCursor:string|null;resumeCursor:string|null};
export type MoneyJournal={claim(review:{id:string;recipientUserId:string;body:string}):Promise<boolean>;read(cursor?:string):Promise<MoneyJournalPage>;append(event:MoneyJournalEvent):Promise<void>};
export function readMoneyJournalEvent(value:unknown,ownerUid:string):MoneyJournalEvent{
 const e=value as MoneyJournalEvent;
 if(!e||typeof e!=='object'||Object.keys(e).sort().join(',')!=='data,operationId,ownerUid,schema'||e.schema!=='bank.money-planning-event.v1'||e.ownerUid!==ownerUid)throw Error('MONEY_JOURNAL_OWNER_MISMATCH');
 if(typeof e.operationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9:_-]{7,159}$/.test(e.operationId)||typeof e.data!=='string'||e.data.length>24000)throw Error('MONEY_JOURNAL_INVALID');
 return e;
}
export function moneyJournalPayload(event:MoneyJournalEvent){
 const data=JSON.parse(event.data) as {source:import('./money-workspace').MoneyTurn;fingerprint:string;receipt:import('./money-workspace').MoneyReceipt;commitments:MoneyCommitment[];reviews:MoneyState['reviews'];requests:FixedSale[]};
 if(!data||Object.keys(data).sort().join(',')!=='commitments,fingerprint,receipt,requests,reviews,source'||!data.source||typeof data.source.humanText!=='string'||data.source.requestId!==event.operationId||typeof data.fingerprint!=='string'||!data.receipt||data.receipt.id!==event.operationId||!Array.isArray(data.commitments)||!Array.isArray(data.reviews)||!Array.isArray(data.requests))throw Error('MONEY_JOURNAL_INVALID');return data;
}
/** The native journal carries owner-reported planning. It cannot certify a
 * payment, alter account proof or replace a stronger locally terminal fact. */
export function mergeMoneyJournalEvent(current:MoneyState,raw:MoneyJournalEvent):MoneyState{
 const event=readMoneyJournalEvent(raw,current.accountUid),data=moneyJournalPayload(event),next=structuredClone(current);
 for(const candidate of data.commitments){
  const known=next.commitments.find(c=>c.id===candidate.id);
  if(!known){next.commitments.push(candidate);continue;}
  const stable=(c:MoneyCommitment)=>({...c,status:undefined,requests:undefined});if(JSON.stringify(stable(known))!==JSON.stringify(stable(candidate)))throw Error('MONEY_JOURNAL_COMMITMENT_CONFLICT');
  known.requests=[...new Set([...known.requests,...candidate.requests])];
  if(known.status==='open'||candidate.status==='cancelled')known.status=candidate.status;
 }
 for(const candidate of data.reviews){
  const known=next.reviews.find(r=>r.id===candidate.id);
  if(!known){next.reviews.push(candidate);continue;}
  const stable=(r:MoneyState['reviews'][number])=>({...r,status:undefined,messageId:undefined});if(JSON.stringify(stable(known))!==JSON.stringify(stable(candidate)))throw Error('MONEY_JOURNAL_REVIEW_CONFLICT');
  const rank={reviewed:0,sending:1,unknown:2,sent:3};if(rank[candidate.status]>rank[known.status])Object.assign(known,candidate);
 }
 const op=next.operations[event.operationId];if(op&&op.fingerprint!==data.fingerprint)throw Error('MONEY_JOURNAL_OPERATION_CONFLICT');
 if(!op||op.receipt.status==='unknown')next.operations[event.operationId]={fingerprint:data.fingerprint,receipt:data.receipt};
 return readMoneyState(next,current.identityDigest,current.accountUid);
}
