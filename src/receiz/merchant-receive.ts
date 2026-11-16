import {readFixedSale,fixedSalePaymentNote,type FixedSale} from './fixed-checkout';
import {readWalletTransferOriginal} from './wallet-transfer-original';
export interface MerchantPaymentEvidence{transferId:string;clientNonce:string;senderUserId:string;recipientUserId:string;amountUsdCents:string;conversationId:string;messageId:string;recordedAt:string|null;source:unknown;}
export async function inspectMerchantPayment(raw:unknown,expected:FixedSale,accountUid:string):Promise<MerchantPaymentEvidence>{
 const sale=await readFixedSale(expected),original=readWalletTransferOriginal(raw),note=fixedSalePaymentNote(sale,original.clientNonce);
 if(accountUid!==sale.recipientUserId||original.recipientUserId!==accountUid||original.senderUserId===accountUid||original.amountUsdCents!==sale.amountUsdCents||original.carried.some(value=>value.note!==note||value.noteVisibility!=='public'))throw Error('MERCHANT_PAYMENT_MISMATCH');
 const{carried:_,...evidence}=original;return evidence;
}
type Candidate={transferId:string;clientNonce:string;saleDigest:string};
type Discovery={signature?:string;anchor?:string;cursor?:string;complete:boolean;seen:Set<string>};
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export interface MerchantReceiveCheckpoint{schema:'bank.merchant-receive-continuation.v1';accountUid:string;nextSale:number;pending:Candidate[];discovery:{saleDigest:string;signature?:string;anchor?:string;cursor?:string;complete:boolean;seen:string[]}[];}
function readCheckpoint(raw:unknown,accountUid:string):MerchantReceiveCheckpoint|undefined{
 if(raw===undefined)return;const v=raw as MerchantReceiveCheckpoint,fail=():never=>{throw Error('MERCHANT_CONTINUATION_INVALID');},digest=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s),cursor=(s:unknown)=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,2048}$/.test(s);
 if(!v||v.schema!=='bank.merchant-receive-continuation.v1'||v.accountUid!==accountUid||!Number.isSafeInteger(v.nextSale)||v.nextSale<0||!Array.isArray(v.pending)||!Array.isArray(v.discovery))return fail();
 if(v.pending.some(c=>!c||!uuid(c.transferId)||!uuid(c.clientNonce)||!digest(c.saleDigest)))return fail();
 for(const d of v.discovery)if(!d||!digest(d.saleDigest)||typeof d.complete!=='boolean'||d.signature!==undefined&&(typeof d.signature!=='string'||d.signature.length>16000)||d.anchor!==undefined&&(typeof d.anchor!=='string'||!/^.{36}:.{36}$/.test(d.anchor))||d.cursor!==undefined&&!cursor(d.cursor)||!Array.isArray(d.seen)||d.seen.some(s=>!cursor(s)))return fail();
 if(new Set(v.discovery.map(d=>d.saleDigest)).size!==v.discovery.length||new Set(v.pending.map(c=>c.transferId+':'+c.clientNonce)).size!==v.pending.length)return fail();
 return structuredClone(v);
}
export async function readMerchantResponse(response:Response):Promise<unknown>{
 if(!response.ok||!response.body)throw Error('MERCHANT_RECEIVING_UNAVAILABLE');const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';try{for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8*1024*1024)throw Error('MERCHANT_HISTORY_CAPACITY');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Recipient-owned fixed-sale discovery supplies references only. Each actual
 * original must still pass the existing exact receiving inspector. */
export function createMerchantReceive(input:{accountUid:string;request(path:string,signal:AbortSignal):Promise<unknown>;checkpoint?:unknown}){
 const restored=readCheckpoint(input.checkpoint,input.accountUid),admitted=new Set<string>(),unacknowledged=new Map<string,{saleId:string;evidence:MerchantPaymentEvidence}>(),pending=new Map<string,Candidate>((restored?.pending??[]).map(c=>[c.transferId+':'+c.clientNonce,c])),discovery=new Map<string,Discovery>((restored?.discovery??[]).map(({saleDigest,seen,...d})=>[saleDigest,{...d,seen:new Set(seen)}]));let nextSale=restored?.nextSale??0,unresolved=false;
 return{checkpoint():MerchantReceiveCheckpoint{return{schema:'bank.merchant-receive-continuation.v1',accountUid:input.accountUid,nextSale,pending:[...pending.values()].map(c=>({...c})),discovery:[...discovery].map(([saleDigest,{seen,...d}])=>({saleDigest,...d,seen:[...seen]}))};},unresolved:()=>unresolved,remember(evidence:MerchantPaymentEvidence){const key=evidence.transferId+':'+evidence.clientNonce;admitted.add(key);unacknowledged.delete(key);pending.delete(key);},async check(sales:readonly FixedSale[],signal:AbortSignal){
  signal.throwIfAborted();if(sales.some(sale=>sale.recipientUserId!==input.accountUid))throw Error('MERCHANT_ACCOUNT_MISMATCH');
  if(sales.some(sale=>!/^[a-f0-9]{64}$/.test(sale.digest)))throw Error('MERCHANT_SALE_INVALID');
  const byDigest=new Map(sales.map(sale=>[sale.digest,sale])),ordered=[...byDigest.values()];
  for(const[key,candidate]of pending)if(!byDigest.has(candidate.saleDigest))pending.delete(key);
  for(const digest of discovery.keys())if(!byDigest.has(digest))discovery.delete(digest);
  unresolved=ordered.some(sale=>!discovery.get(sale.digest)?.complete)||pending.size>0;
  const found=new Map<string,{saleId:string;evidence:MerchantPaymentEvidence}>();
  for(const[key,match]of unacknowledged)if(ordered.some(sale=>sale.saleId===match.saleId))found.set(key,match);
  if(found.size||!ordered.length)return[...found.values()];
  // One sale rotates per check. Its live head plus one older cursor and at most
  // four original reads keep each check bounded without abandoning older sales.
  const sale=ordered[nextSale%ordered.length];nextSale=(nextSale+1)%ordered.length;
  const state=discovery.get(sale.digest)??{complete:false,seen:new Set<string>()};discovery.set(sale.digest,state);
  let discoveryError:unknown;
  async function page(cursor?:string){
   const path=`/api/connect/transfers?saleDigest=${sale.digest}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`;
   const raw=await input.request(path,signal);signal.throwIfAborted();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('MERCHANT_HISTORY_UNAVAILABLE');
   const body=raw as {ok?:unknown;accountUserId?:unknown;saleDigest?:unknown;candidates?:unknown;nextCursor?:unknown};
   if(body.ok!==true||body.accountUserId!==input.accountUid||body.saleDigest!==sale.digest||!Array.isArray(body.candidates)||body.candidates.length>100||body.nextCursor!==null&&(typeof body.nextCursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(body.nextCursor)))throw Error('MERCHANT_HISTORY_UNAVAILABLE');
   const keys:string[]=[];
   for(const value of body.candidates){
    if(!value||typeof value!=='object'||Array.isArray(value)||!uuid(value.transferId)||!uuid(value.clientNonce))throw Error('MERCHANT_HISTORY_UNAVAILABLE');
    const key=value.transferId+':'+value.clientNonce;keys.push(key);if(!admitted.has(key)&&!pending.has(key))pending.set(key,{transferId:value.transferId,clientNonce:value.clientNonce,saleDigest:sale.digest});
   }
   return{keys,nextCursor:body.nextCursor as string|null};
  }
  try{
   const head=await page(),signature=JSON.stringify(head);
   // An overlapping head preserves the older discovery window. A gap restarts
   // that window, never discards admitted originals, and stays unresolved.
   if(state.signature===undefined||signature!==state.signature&&(!state.anchor||!head.keys.includes(state.anchor))){state.cursor=head.nextCursor??undefined;state.complete=head.nextCursor===null;state.seen.clear();}
   state.signature=signature;state.anchor=head.keys[0];
   if(state.cursor){const cursor=state.cursor,older=await page(cursor);if(older.nextCursor&&(older.nextCursor===cursor||state.seen.has(older.nextCursor)))throw Error('MERCHANT_HISTORY_INCOMPLETE');state.seen.add(cursor);state.cursor=older.nextCursor??undefined;state.complete=older.nextCursor===null;}
  }catch(cause){signal.throwIfAborted();discoveryError=cause;}
  // Insertion order is the retry queue. Re-observing a head cannot move the same
  // unavailable originals ahead of later payments or manufacture paid state.
  await Promise.all([...pending].slice(0,4).map(async([key,candidate])=>{
   pending.delete(key);
   try{signal.throwIfAborted();const raw=await input.request(`/api/connect/transfers?clientNonce=${candidate.clientNonce}&transferId=${candidate.transferId}`,signal);signal.throwIfAborted();const selectedSale=byDigest.get(candidate.saleDigest)!;const evidence=await inspectMerchantPayment(raw,selectedSale,input.accountUid);signal.throwIfAborted();if(evidence.transferId!==candidate.transferId||evidence.clientNonce!==candidate.clientNonce)throw Error('MERCHANT_PAYMENT_MISMATCH');admitted.add(key);const match={saleId:selectedSale.saleId,evidence};unacknowledged.set(key,match);found.set(key,match);}
   catch{signal.throwIfAborted();pending.set(key,candidate);}
  }));
  unresolved=!!discoveryError||ordered.some(value=>!discovery.get(value.digest)?.complete)||pending.size>0;
  if(discoveryError&&!found.size)throw discoveryError;
  return[...found.values()];
 }};
}
/** Existing Counter adapters need only their original three-method contract. */
export type MerchantReceive=Pick<ReturnType<typeof createMerchantReceive>,'check'|'remember'|'unresolved'>;
