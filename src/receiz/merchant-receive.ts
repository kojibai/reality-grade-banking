import {readFixedSale,fixedSalePaymentNote,parseFixedSalePaymentNote,type FixedSale} from './fixed-checkout';
import {readWalletTransferOriginal} from './wallet-transfer-original';
import {privateHistoryPath} from './private-history';
export interface MerchantPaymentEvidence{transferId:string;clientNonce:string;senderUserId:string;recipientUserId:string;amountUsdCents:string;conversationId:string;messageId:string;recordedAt:string|null;source:unknown;}
export async function inspectMerchantPayment(raw:unknown,expected:FixedSale,accountUid:string):Promise<MerchantPaymentEvidence>{
 const sale=await readFixedSale(expected),original=readWalletTransferOriginal(raw),note=fixedSalePaymentNote(sale,original.clientNonce);
 if(accountUid!==sale.recipientUserId||original.recipientUserId!==accountUid||original.senderUserId===accountUid||original.amountUsdCents!==sale.amountUsdCents||original.carried.some(value=>value.note!==note||value.noteVisibility!=='public'))throw Error('MERCHANT_PAYMENT_MISMATCH');
 const{carried:_,...evidence}=original;return evidence;
}
type Candidate={transferId:string;clientNonce:string;sale:FixedSale};
export async function readMerchantResponse(response:Response):Promise<unknown>{
 if(!response.ok||!response.body)throw Error('MERCHANT_RECEIVING_UNAVAILABLE');const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';try{for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8*1024*1024)throw Error('MERCHANT_HISTORY_CAPACITY');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Existing private Ledger rows discover candidates only. Each relevant exact
 * incoming original is read once; no balance, portfolio or proof rebuild runs. */
export function createMerchantReceive(input:{accountUid:string;request(path:string,signal:AbortSignal):Promise<unknown>}){
 const admitted=new Map<string,MerchantPaymentEvidence>(),unacknowledged=new Map<string,{saleId:string;evidence:MerchantPaymentEvidence}>(),pending=new Map<string,Candidate>();let lastHead:string|null=null,backfill:string|undefined,backfillDone=false,unresolved=false;
 return{unresolved:()=>unresolved,remember(evidence:MerchantPaymentEvidence){const key=evidence.transferId+':'+evidence.clientNonce;admitted.set(key,evidence);unacknowledged.delete(key);},async check(sales:readonly FixedSale[],signal:AbortSignal){
  signal.throwIfAborted();unresolved=false;const byDigest=new Map(sales.map(sale=>[sale.digest,sale]));if(sales.some(sale=>sale.recipientUserId!==input.accountUid))throw Error('MERCHANT_ACCOUNT_MISMATCH');
  const found=new Map<string,{saleId:string;evidence:MerchantPaymentEvidence}>(),candidates=new Map<string,Candidate>();
  for(const[key,match]of unacknowledged)if(sales.some(sale=>sale.saleId===match.saleId))found.set(key,match);
  if(found.size)return[...found.values()];
  async function page(cursor?:string){
   const raw=await input.request(privateHistoryPath(cursor),signal);signal.throwIfAborted();if(!raw||typeof raw!=='object')throw Error('MERCHANT_HISTORY_UNAVAILABLE');const body=raw as {ok?:unknown;accountUserId?:unknown;events?:unknown;nextCursor?:unknown};
   if(body.ok!==true||body.accountUserId!==input.accountUid||!Array.isArray(body.events)||body.events.length>100||body.nextCursor!==null&&(typeof body.nextCursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(body.nextCursor)))throw Error('MERCHANT_HISTORY_UNAVAILABLE');
   for(const value of body.events){if(!value||typeof value!=='object')continue;const event=value as {kind?:unknown;transferId?:unknown;publicNote?:unknown;recipient?:{userId?:unknown}};if(event.kind!=='chat_transfer'||event.recipient?.userId!==input.accountUid||typeof event.transferId!=='string'||!/^[a-f0-9-]{36}$/.test(event.transferId))continue;const note=parseFixedSalePaymentNote(event.publicNote),sale=note&&byDigest.get(note.saleDigest);if(!note||!sale)continue;const key=event.transferId+':'+note.clientNonce;if(admitted.has(key))continue;candidates.set(key,{transferId:event.transferId,clientNonce:note.clientNonce,sale});}
   return body as {events:{id?:unknown}[];nextCursor:string|null};
  }
  const head=await page(),newHead=typeof head.events[0]?.id==='string'?head.events[0].id:null;
  // The live head and progressive older history are separate discovery windows.
  // Two bounded pages per check avoid rescanning a large account on every tick.
  if(lastHead===null&&!backfill&&!backfillDone){backfill=head.nextCursor??undefined;backfillDone=head.nextCursor===null;}
  else if(newHead!==lastHead&&!head.events.some(event=>event.id===lastHead)){backfill=head.nextCursor??undefined;backfillDone=head.nextCursor===null;}
  if(backfill){const cursor=backfill,older=await page(cursor);if(older.nextCursor===cursor)throw Error('MERCHANT_HISTORY_INCOMPLETE');backfill=older.nextCursor??undefined;backfillDone=older.nextCursor===null;}
  for(const[key,candidate]of pending)if(!byDigest.has(candidate.sale.digest))pending.delete(key);
  // Insertion order is the retry queue. Re-observing the live head cannot
  // promote the same unavailable originals ahead of later payments.
  for(const[key,candidate]of candidates)if(!pending.has(key))pending.set(key,candidate);
  await Promise.all([...pending].slice(0,4).map(async([key,candidate])=>{
   pending.delete(key);
   try{signal.throwIfAborted();const raw=await input.request(`/api/connect/transfers?clientNonce=${candidate.clientNonce}&transferId=${candidate.transferId}`,signal);signal.throwIfAborted();const evidence=await inspectMerchantPayment(raw,candidate.sale,input.accountUid);signal.throwIfAborted();if(evidence.transferId!==candidate.transferId||evidence.clientNonce!==candidate.clientNonce)throw Error('MERCHANT_PAYMENT_MISMATCH');admitted.set(key,evidence);const match={saleId:candidate.sale.saleId,evidence};unacknowledged.set(key,match);found.set(key,match);}
   catch{signal.throwIfAborted();unresolved=true;pending.set(key,candidate);}
  }));
  if(pending.size)unresolved=true;
  lastHead=newHead??lastHead;return[...found.values()];
 }};
}
export type MerchantReceive=ReturnType<typeof createMerchantReceive>;
