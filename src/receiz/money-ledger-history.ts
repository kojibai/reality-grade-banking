import type {PrivateHistoryCache} from './identity-vault';
import {readMoneyHistoryQuery,type MoneyHistoryQuery} from './money-history-query';
import {filterLedgerGroups} from './ledger-search';
import {groupLedgerPaymentRecords,ledgerRecordTitle,ledgerPaymentReference,type LedgerPaymentGroup} from './ledger-payment-records';
import {mergePublicRecords} from './public-network';
import {appendPrivateLedgerPage,type PrivateHistoryPage} from './private-history';

/** Explanation only, using the same owner-bound observations as My history.
 * These rows never admit a balance, authorize spending or become a sealed proof. */
export function createMoneyLedgerHistory(input:{accountUid:string;assertOpen():void;retained():Promise<PrivateHistoryCache|null>;read(cursor?:string):Promise<PrivateHistoryPage>;remember(value:PrivateHistoryCache):void}){
 let pending:Promise<PrivateHistoryCache>|null=null;
 let heldRecords:PrivateHistoryCache['records']|null=null,heldGroups:LedgerPaymentGroup[]=[];
 let positions=new Map<PrivateHistoryCache['records'][number],number>();
 const ordered=(value:PrivateHistoryCache)=>{
  if(heldRecords===value.records)return heldGroups;
  heldRecords=value.records;const records=[...value.records].sort((left,right)=>{if(left.kaiUpulse&&right.kaiUpulse&&left.kaiUpulse!==right.kaiUpulse)return BigInt(left.kaiUpulse)>BigInt(right.kaiUpulse)?-1:1;return (right.time?Date.parse(right.time):0)-(left.time?Date.parse(left.time):0);});positions=new Map(records.map((record,index)=>[record,index]));heldGroups=groupLedgerPaymentRecords(records);return heldGroups;
 };
 const append=async(previous:PrivateHistoryCache|null,cursor?:string)=>{
  const page=await input.read(cursor);input.assertOpen();if(page.accountUid!==input.accountUid)throw Error('MONEY_SOURCE_OWNER_MISMATCH');if(cursor&&page.nextCursor===cursor)throw Error('PRIVATE_HISTORY_REPEATED_CURSOR');
  const value:PrivateHistoryCache={schema:'bank.private-history-cache.v1',accountUid:input.accountUid,observedAt:new Date().toISOString(),records:mergePublicRecords(previous?.records??[],page.records),nextCursor:page.nextCursor,pages:appendPrivateLedgerPage(previous?.pages,page,cursor??null)};
  input.remember(value);return value;
 };
 return{async search(query:MoneyHistoryQuery){
  const q=readMoneyHistoryQuery(query);input.assertOpen();let cache=await input.retained();input.assertOpen();
  if(cache&&cache.accountUid!==input.accountUid)throw Error('MONEY_SOURCE_OWNER_MISMATCH');
  if(!cache?.pages?.some(page=>page.cursor===null)){const work=pending??=append(cache);try{cache=await work;}finally{if(pending===work)pending=null;}}
  let groups=ordered(cache),offset=q.offset;
  // The continuation is a scan position, independent of how many rows match.
  // This also advances a query that found nothing on the preceding page.
  if(offset>0&&offset>=cache.records.length&&cache.nextCursor){offset=cache.records.length;const work=pending??=append(cache,cache.nextCursor);try{cache=await work;}finally{if(pending===work)pending=null;}groups=ordered(cache);}
  const matched=filterLedgerGroups(groups,q.query).filter(({record})=>{
   if(q.direction!=='all'&&record.accountFlow!==q.direction)return false;
   if(q.from!==undefined||q.to!==undefined){const at=record.time?Date.parse(record.time):NaN;if(!Number.isFinite(at)||q.from!==undefined&&at<q.from||q.to!==undefined&&at>=q.to)return false;}
   return true;
  });
  const matches=new Set(matched),page:typeof groups=[],indices:number[]=[];let moreLoaded=false;
  for(const group of groups){const index=positions.get(group.record)!;if(index<offset||!matches.has(group))continue;if(page.length===q.limit){moreLoaded=true;break;}page.push(group);indices.push(index);}
  input.assertOpen();
  return{authority:'authenticated-account-history' as const,coverage:{source:'private-account-ledger',observedAt:cache.observedAt,loadedRecordCount:cache.records.length,complete:cache.nextCursor===null,hasMore:cache.nextCursor!==null,pagination:'Pass nextOffset unchanged to continue scanning matching records or the next existing Ledger page.',scope:'Retained account activity only. These authenticated observations explain recorded activity; they do not independently verify settlement or establish a spendable balance.'},matchedCount:matched.length,
   transactions:page.map(({record})=>({transactionId:record.sourceId,recordId:record.id,recordLink:'bank-record:'+encodeURIComponent(record.id),paymentReference:ledgerPaymentReference(record),kind:record.kind,title:ledgerRecordTitle(record),description:[record.title,record.detail].filter((value,index,values)=>value&&values.indexOf(value)===index).join(' · ')||ledgerRecordTitle(record),displayTime:record.time,kaiUPulse:record.kaiUpulse,amountUsdCents:record.amountUsdCents,amountPhiMicro:record.valueOperands?.amountPhiMicro??null,direction:record.accountFlow??'unknown',sender:record.sender??null,recipient:record.recipient??null,references:record.evidence,...(record.details?.assetTrade?{assetTrade:record.details.assetTrade}:{})})),
   nextOffset:moreLoaded?indices.at(-1)!+1:cache.nextCursor?Math.max(cache.records.length,q.offset+1):null};
 }};
}
