import type {PublicLedgerFileReview} from './public-ledger-proof';
import type {PublicLedgerSource} from './public-ledger-statement';
import {readPublicLedgerBytes} from './public-ledger-transfer';
import {mergePublicRecords,type PublicRecord} from './public-network';
import {walletPointTime} from './wallet-series';

let pending:Promise<PublicLedgerFileReview|null>|null=null;
export async function readHeldPublicLedger(){
 const {readRetainedPublicLedger}=await import('./public-ledger-retention');
 return readRetainedPublicLedger().catch(()=>null);
}
async function retainDisplay(review:PublicLedgerFileReview|null){
 if(!review?.snapshot)return review;
 const {loadPublicNetworkCache,savePublicNetworkCache}=await import('./public-network-cache'),cache=await loadPublicNetworkCache();
 const records=await publicLedgerDisplayRows(review,cache?.records??[]);
 let capturedAt=cache?.capturedAt??null;
 for(const row of records)if(row.time&&Number.isFinite(Date.parse(row.time))&&(!capturedAt||Date.parse(row.time)>Date.parse(capturedAt)))capturedAt=row.time;
 // The original has already been retained independently. A display-cache
 // failure cannot undo that custody or manufacture successful verification.
 if(await savePublicNetworkCache({...cache,records,capturedAt,coverage:cache?.coverage??[]})===false)throw Error('PUBLIC_LEDGER_DISPLAY_CACHE_UNAVAILABLE');
 return review;
}
/** Shared read-only polling. Accepted originals still pass canonical verification
 * and the retention transaction's full-prefix comparison; rows never seal a source. */
export function synchronizePublicLedger():Promise<PublicLedgerFileReview|null>{
 if(pending)return pending;
 const operation=(async()=>{
  const held=await readHeldPublicLedger();
  let response:Response;
  try{response=await fetch('/api/bank/ledger-proof',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30_000)});}catch{return retainDisplay(held);}
  if(!response.ok)return retainDisplay(held);
  const wire:PublicLedgerSource=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readPublicLedgerBytes(response,24*1024*1024)));
  const {heldPublicLedgerFile,openPublicLedgerSource}=await import('./public-ledger-proof');
  // A claimed digest alone is insufficient. Reuse only the entire exact wire
  // already held beneath canonical verification, including its original bytes.
  const source=held&&heldPublicLedgerFile(held).source;
  if(source&&wire&&typeof wire==='object'&&Object.keys(wire).length===6&&Object.entries(source).every(([key,value])=>wire[key as keyof PublicLedgerSource]===value))return retainDisplay(held);
  const opened=await openPublicLedgerSource(wire),{retainPublicLedgerReview}=await import('./public-ledger-retention');
  let retained:PublicLedgerFileReview;
  try{retained=await retainPublicLedgerReview(opened);}catch(error){
   if(error instanceof Error&&error.message==='PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE')return opened;
   throw error;
  }
  return retainDisplay(retained);
 })();
 pending=operation;
 void operation.finally(()=>{if(pending===operation)pending=null;}).catch(()=>{});
 return operation;
}
/** Display only the action fields actually carried by a verified original.
 * Additional source collections and completeness anchors retain their own reads. */
export async function publicLedgerDisplayRows(review:PublicLedgerFileReview,known:readonly PublicRecord[]):Promise<PublicRecord[]>{
 const {heldPublicLedgerFile}=await import('./public-ledger-proof');heldPublicLedgerFile(review);
 if(!review.snapshot)return [...known];
 const existing=new Map(known.filter(row=>row.source==='actions').map(row=>[row.sourceId,row]));
 const incoming:PublicRecord[]=[];
 for(const record of review.snapshot.records){
  // The retained original may support coordinates larger than this UI cache.
  // Such records remain in the original rather than being truncated or coerced.
  if(record.kaiUpulse.length>30||record.amountUsdCents!==null&&record.amountUsdCents.length>25)continue;
  const previous=existing.get(record.id),compatible=previous&&(!previous.evidence.entryHash||previous.evidence.entryHash===record.entryHash)?previous:undefined;
  let time:string|null=null;try{time=walletPointTime(record.kaiUpulse);}catch{/* The exact coordinate remains available. */}
  incoming.push({...compatible,id:`actions:${record.id}`,sourceId:record.id,source:'actions',kind:record.kind,
   title:compatible?.title??record.kind.replace(/[._]/g,' '),detail:compatible?.detail??'',time:compatible?.time??time,actor:compatible?.actor??null,
   amountUsdCents:record.amountUsdCents,kaiUpulse:record.kaiUpulse,pulse:(BigInt(record.kaiUpulse)/1_000_000n).toString(),sourceUrl:compatible?.sourceUrl??null,
   evidence:{...compatible?.evidence,entryHash:record.entryHash,prevHash:record.previousHash},authority:'public-source-projection'});
 }
 return mergePublicRecords(known,incoming);
}
