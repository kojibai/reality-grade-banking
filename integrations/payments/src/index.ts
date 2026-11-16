import {createFixedSale,readFixedSale,type FixedSale} from '../../../src/receiz/fixed-checkout';
import {buildFixedPaymentTools} from '../../../src/receiz/payment-tools';
import {createMerchantReceive,type MerchantPaymentEvidence} from '../../../src/receiz/merchant-receive';
import type {BankeizPayments,BankeizPaymentsOptions,OrderStatus,OrderTransaction,FulfillmentJob} from './types.js';
import {createOrderWebhookHandler} from './webhook.js';
export type * from './types.js';

interface SavedOrder {schema:'bankeiz.order.v1';orderId:string;sale:FixedSale;revision:number;receipts:MerchantPaymentEvidence[];continuation?:unknown;receiving:OrderStatus['receiving'];error?:string;fulfillment:OrderStatus['fulfillment'];}
interface SavedJob {job:FulfillmentJob;state:'pending'|'processing'|'complete';leaseId?:string;leaseUntil?:number;}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function orderId(value:string){if(typeof value!=='string'||!value.length||value.length>120||value!==value.trim()||/[\x00-\x1f\x7f]/.test(value))throw Error('ORDER_ID_INVALID');try{return encodeURIComponent(value);}catch{throw Error('ORDER_ID_INVALID');}}
function batch(limit=10){if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('ORDER_BATCH_INVALID');return limit;}
/** The installed SDK request options have no signal field. Stop waiting and
 * refuse late commits here; configure fetchImpl timeouts to cancel transport. */
function observe<T>(work:Promise<T>,signal:AbortSignal,timeoutMs:number):Promise<T>{
 return new Promise((resolve,reject)=>{let timer:ReturnType<typeof setTimeout>;const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);},abort=()=>{cleanup();reject(signal.reason);};timer=setTimeout(()=>{cleanup();reject(Error('ORDER_OBSERVATION_TIMEOUT'));},timeoutMs);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();work.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});
}

export function createBankeizPayments(options:BankeizPaymentsOptions):BankeizPayments {
 const merchant=Object.freeze({...options.merchant}),{store,receiz}=options;
 if(!merchant||!uuid.test(merchant.userId)||!/^[a-z0-9_]{3,24}$/.test(merchant.username))throw Error('MERCHANT_INVALID');
 const prefix=`bankeiz:${merchant.userId}:`,orders=prefix+'order:',jobs=prefix+'job:';
 const key=(id:string)=>orders+orderId(id);
 const saved=(tx:OrderTransaction,id:string)=>{const row=tx.get<SavedOrder>(key(id));if(!row)throw Error('ORDER_NOT_FOUND');if(row.schema!=='bankeiz.order.v1'||row.orderId!==id||row.sale.recipientUserId!==merchant.userId||!Array.isArray(row.receipts)||!Number.isSafeInteger(row.revision))throw Error('ORDER_STORAGE_INVALID');return row;};
 const status=(row:SavedOrder):OrderStatus=>{const tools=buildFixedPaymentTools(row.sale);return{orderId:row.orderId,amountUsdCents:row.sale.amountUsdCents,currency:'usd',status:row.receipts.length?'paid':'pending',checkoutUrl:tools.hostedCheckoutLink,buttonHtml:tools.buttonHtml,paymentCount:row.receipts.length,additionalPayments:Math.max(0,row.receipts.length-1),fulfillment:row.fulfillment,receiving:row.receiving,...(row.error?{error:row.error}:{})};};
 const load=(id:string)=>store.transaction(tx=>saved(tx,id));
 async function get(id:string){return status(await load(id));}
 async function checkout(input:{orderId:string;amountUsdCents:string}){
  orderId(input.orderId);if(typeof input.amountUsdCents!=='string'||!/^[1-9]\d{0,19}$/.test(input.amountUsdCents))throw Error('ORDER_AMOUNT_INVALID');
  const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:crypto.randomUUID(),recipientUserId:merchant.userId,username:merchant.username,currency:'usd',amountUsdCents:input.amountUsdCents});
  return store.transaction(tx=>{const candidate:SavedOrder={schema:'bankeiz.order.v1',orderId:input.orderId,sale,revision:0,receipts:[],receiving:'unchecked',fulfillment:'pending'};
   tx.insert(key(input.orderId),candidate);const row=saved(tx,input.orderId);
   if(row.sale.amountUsdCents!==input.amountUsdCents||row.sale.username!==merchant.username)throw Error('ORDER_CHANGED');return status(row);});
 }
 async function check(id:string,input:{signal?:AbortSignal}={}){
  const row=await load(id),sale=await readFixedSale(row.sale),signal=input.signal?AbortSignal.any([input.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
  signal.throwIfAborted();const reader=createMerchantReceive({accountUid:merchant.userId,checkpoint:row.continuation,request:(path,requestSignal)=>{requestSignal.throwIfAborted();return observe(receiz.request(path),requestSignal,3000);}});
  row.receipts.forEach(receipt=>reader.remember(receipt));let matches:{saleId:string;evidence:MerchantPaymentEvidence}[]=[],error:string|undefined;
  try{matches=await reader.check([sale],signal);}catch(cause){signal.throwIfAborted();const code=(cause as {status?:number})?.status;error=code===401||code===403?'MERCHANT_ACCESS_REQUIRED':'MERCHANT_RECEIVING_UNAVAILABLE';}
  signal.throwIfAborted();return store.transaction(tx=>{
   const current=saved(tx,id);if(current.sale.digest!==sale.digest)throw Error('ORDER_CHANGED');
   for(const{evidence}of matches){if(current.receipts.some(r=>r.transferId===evidence.transferId&&r.clientNonce===evidence.clientNonce))continue;
    const paymentKey=prefix+'payment:'+evidence.transferId,owner=tx.get<string>(paymentKey);if(owner!==null&&owner!==id)throw Error('PAYMENT_ALREADY_ASSOCIATED');
    tx.put(paymentKey,id);current.receipts.push(evidence);
    if(current.receipts.length===1){const job:FulfillmentJob={orderId:id,amountUsdCents:sale.amountUsdCents,merchantUserId:merchant.userId,idempotencyKey:`bankeiz:fulfill:${merchant.userId}:${sale.saleId}`,payment:{transferId:evidence.transferId,clientNonce:evidence.clientNonce}};tx.insert(jobs+sale.saleId,{job,state:'pending'} satisfies SavedJob);}
   }
   // A racing observation can merge newly accepted originals, but cannot rewind
   // the winner's discovery continuation or replace its more recent observation.
   if(current.revision===row.revision){current.continuation=reader.checkpoint();current.receiving=error?'unavailable':reader.unresolved()?'incomplete':'complete';current.error=error;}
   current.revision++;tx.put(key(id),current);return status(current);
  });
 }
 function nextRecord<T>(tx:OrderTransaction,recordPrefix:string,cursorKey:string,alreadyExamined:boolean){
  let lap=tx.get<{after:string;through:string}>(cursorKey);
  if(!lap||typeof lap!=='object'||!lap.through||lap.after>=lap.through){if(alreadyExamined)return null;const through=tx.lastKey(recordPrefix);if(!through)return null;lap={after:'',through};}
  const row=tx.scan<T>(recordPrefix,{after:lap.after,limit:1})[0];
  if(!row||row.key>lap.through){tx.put(cursorKey,{...lap,after:lap.through});return null;}
  tx.put(cursorKey,{...lap,after:row.key});return row;
 }
 async function reconcile(input:{limit?:number;signal?:AbortSignal}={}){
  const limit=batch(input.limit);
  const results:OrderStatus[]=[],errors:{orderId:string;error:string}[]=[];
  for(let i=0;i<limit;i++){input.signal?.throwIfAborted();const row=await store.transaction(tx=>nextRecord<SavedOrder>(tx,orders,prefix+'reconcile-cursor',i>0));if(!row)break;const id=row.value.orderId;try{results.push(await check(id,input));}catch{input.signal?.throwIfAborted();errors.push({orderId:id,error:'ORDER_RECONCILIATION_FAILED'});}}
  return{orders:results,errors};
 }
 async function fulfill(deliver:(job:FulfillmentJob)=>Promise<void>,input:{limit?:number;signal?:AbortSignal;leaseMs?:number}={}){
  const limit=batch(input.limit),leaseMs=input.leaseMs??60000;if(!Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>3600000)throw Error('FULFILLMENT_LEASE_INVALID');
  let completed=0,failed=0,examined=0;
  for(let i=0;i<limit;i++){input.signal?.throwIfAborted();const selected=await store.transaction(tx=>nextRecord<SavedJob>(tx,jobs,prefix+'fulfillment-cursor',i>0));if(!selected)break;examined++;const jobKey=selected.key,leaseId=crypto.randomUUID();
   const held=await store.transaction(tx=>{const row=tx.get<SavedJob>(jobKey);if(!row||row.state==='complete'||row.state==='processing'&&(row.leaseUntil??0)>Date.now())return null;row.state='processing';row.leaseId=leaseId;row.leaseUntil=Date.now()+leaseMs;tx.put(jobKey,row);const order=saved(tx,row.job.orderId);order.fulfillment='processing';order.revision++;tx.put(key(order.orderId),order);return row.job;});
   if(!held)continue;let succeeded=false;try{input.signal?.throwIfAborted();await observe(Promise.resolve().then(()=>deliver(Object.freeze({...held,payment:Object.freeze({...held.payment})}))),input.signal??new AbortController().signal,leaseMs);succeeded=true;}catch{/* Retain the original job and stable effect key for retry. */}
   const acknowledged=await store.transaction(tx=>{const row=tx.get<SavedJob>(jobKey);if(!row||row.leaseId!==leaseId||(row.leaseUntil??0)<=Date.now())return false;row.state=succeeded?'complete':'pending';delete row.leaseId;delete row.leaseUntil;tx.put(jobKey,row);const order=saved(tx,held.orderId);order.fulfillment=succeeded?'complete':'pending';order.revision++;tx.put(key(held.orderId),order);return true;});
   if(succeeded&&acknowledged)completed++;else failed++;
  }
  return{completed,failed,examined};
 }
 return{checkout,get,check,reconcile,fulfill,handleWebhook:createOrderWebhookHandler({store,prefix,check})};
}
