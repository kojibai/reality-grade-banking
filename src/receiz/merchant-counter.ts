import {createFixedSale} from './fixed-checkout';
import {inspectMerchantPayment,type MerchantReceive} from './merchant-receive';
import {readMerchantCounterState,type MerchantCounterState,type MerchantSale} from './merchant-counter-state';
export interface MerchantCounterDependencies{identityDigest:string;accountUid:string;username:string;archive?:{retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>};assertCurrent():void;receive:MerchantReceive;store:{read():Promise<unknown>;write(next:MerchantCounterState,expected:unknown):Promise<void>};lock<T>(work:()=>Promise<T>):Promise<T>;}
export function createMerchantCounter(input:MerchantCounterDependencies){
 let closed=false,state:MerchantCounterState={schema:'bank.merchant-counter.v1',identityDigest:input.identityDigest,accountUid:input.accountUid,revision:0,activeSaleId:null,sales:[]},retained:unknown=null,error:string|null=null,checking=false,flight:Promise<'changed'|'unchanged'>|null=null;
 const listeners=new Set<()=>void>(),assert=()=>{if(closed)throw Error('MERCHANT_COUNTER_CLOSED');input.assertCurrent();},publish=()=>{for(const listener of listeners)listener();};
 const active=()=>state.sales.find(sale=>sale.request.saleId===state.activeSaleId)??null;
 const snapshot=()=>({active:active(),sales:state.sales,archives:state.archives??[],phase:active()?.receipts.length?'paid'as const:checking?'checking'as const:error?'attention-required'as const:'waiting'as const,error});
 async function load(){assert();const raw=await input.store.read(),saved=await readMerchantCounterState(raw,input.identityDigest,input.accountUid);assert();retained=raw;if(saved)state=saved;}
 async function save(next:MerchantCounterState){assert();await input.store.write(next,retained);assert();state=next;retained=next;publish();}
 // Only recent checkout bodies stay in the working set. Exact older bodies
 // remain in encrypted immutable custody and their request index stays live.
 async function compact(next:MerchantCounterState){
  const sales=[...next.sales],archives=[...(next.archives??[])];while(sales.length>100){
   if(!input.archive)throw Error('Counter archive is unavailable. Your saved checkouts are unchanged.');const index=sales.findIndex(sale=>sale.request.saleId!==next.activeSaleId);if(index<0)throw Error('MERCHANT_ARCHIVE_INVALID');const sale=sales[index],bytes=new TextEncoder().encode(JSON.stringify(sale)),sourceRef=await input.archive.retain(bytes);assert();if(sourceRef!==await fingerprint(bytes))throw Error('MERCHANT_ARCHIVE_MISMATCH');archives.push({request:sale.request,identityDigest:sale.identityDigest,createdAt:sale.createdAt,sourceRef});sales.splice(index,1);
  }return{...next,sales,archives};
 }
 async function fingerprint(bytes:Uint8Array){return[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
 async function restore(next:MerchantCounterState,saleId:string):Promise<MerchantSale>{
  const current=next.sales.find(sale=>sale.request.saleId===saleId);if(current)return current;const entry=next.archives?.find(sale=>sale.request.saleId===saleId);if(!entry||!input.archive)throw Error('MERCHANT_SALE_NOT_FOUND');const bytes=await input.archive.restore(entry.sourceRef);assert();if(await fingerprint(bytes)!==entry.sourceRef)throw Error('MERCHANT_ARCHIVE_MISMATCH');const sale=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as MerchantSale;
  if(sale.request?.digest!==entry.request.digest||sale.createdAt!==entry.createdAt)throw Error('MERCHANT_ARCHIVE_MISMATCH');await readMerchantCounterState({...next,sales:[sale],archives:[],activeSaleId:saleId},input.identityDigest,input.accountUid);next.sales.push(sale);next.archives=next.archives?.filter(held=>held.request.saleId!==saleId);return sale;
 }
 const ready=load().then(()=>{for(const sale of state.sales)for(const receipt of sale.receipts)input.receive.remember(receipt);publish();});void ready.catch(()=>{});
 async function edit(work:()=>Promise<void>){await ready;return input.lock(async()=>{await load();await work();});}
 return{ready,snapshot,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  create(amountUsdCents:string){return edit(async()=>{const request=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:crypto.randomUUID(),recipientUserId:input.accountUid,username:input.username,currency:'usd',amountUsdCents});assert();error=null;await save(await compact({...state,revision:state.revision+1,activeSaleId:request.saleId,sales:[...state.sales,{request,identityDigest:input.identityDigest,createdAt:new Date().toISOString(),receipts:[]}]}));});},
  async adoptRequest(raw:import('./fixed-checkout').FixedSale){const {readFixedSale}=await import('./fixed-checkout'),request=await readFixedSale(raw);if(request.recipientUserId!==input.accountUid)throw Error('MERCHANT_ACCOUNT_MISMATCH');await edit(async()=>{const known=state.sales.find(s=>s.request.saleId===request.saleId)||state.archives?.find(s=>s.request.saleId===request.saleId);if(known){if(known.request.digest!==request.digest)throw Error('MERCHANT_REQUEST_CHANGED');return;}await save(await compact({...state,revision:state.revision+1,sales:[...state.sales,{request,identityDigest:input.identityDigest,createdAt:new Date().toISOString(),receipts:[]}]}));});},
  async request(saleId:string,amountUsdCents:string){let result!:MerchantSale;await edit(async()=>{const existing=state.sales.find(s=>s.request.saleId===saleId)||state.archives?.find(s=>s.request.saleId===saleId);if(existing){if(existing.request.amountUsdCents!==amountUsdCents)throw Error('MERCHANT_REQUEST_CHANGED');result=await restore({...state,sales:[...state.sales],archives:[...(state.archives??[])]},saleId);return;}const request=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId,recipientUserId:input.accountUid,username:input.username,currency:'usd',amountUsdCents});result={request,identityDigest:input.identityDigest,createdAt:new Date().toISOString(),receipts:[]};await save(await compact({...state,revision:state.revision+1,sales:[...state.sales,result]}));});return result;},
  async sale(saleId:string){await ready;assert();return restore({...state,sales:[...state.sales],archives:[...(state.archives??[])]},saleId);},
  select(saleId:string){return edit(async()=>{const next={...state,sales:[...state.sales],archives:[...(state.archives??[])],revision:state.revision+1,activeSaleId:saleId};await restore(next,saleId);error=null;await save(await compact(next));});},
  check(signal:AbortSignal,saleIds?:readonly string[]):Promise<'changed'|'unchanged'>{
   if(flight)return saleIds?flight.catch(()=>{}).then(()=>this.check(signal,saleIds)):flight;const attempt=(async()=>{await ready;assert();signal.throwIfAborted();checking=true;error=null;publish();
    try{const observed=await input.receive.check([...state.sales,...(state.archives??[])].filter(sale=>!saleIds||saleIds.includes(sale.request.saleId)).map(sale=>sale.request),signal);signal.throwIfAborted();assert();return await input.lock(async()=>{
     await load();signal.throwIfAborted();let changed=false;const sales=state.sales.map(sale=>({...sale,receipts:[...sale.receipts]})),known=new Set(sales.flatMap(sale=>sale.receipts.map(receipt=>receipt.transferId))),next={...state,sales,archives:[...(state.archives??[])]};
     for(const match of observed){if(![...next.sales,...(next.archives??[])].some(sale=>sale.request.saleId===match.saleId))continue;const sale=await restore(next,match.saleId);for(const held of sale.receipts)known.add(held.transferId);const evidence=await inspectMerchantPayment(match.evidence.source,sale.request,input.accountUid);signal.throwIfAborted();assert();if(known.has(evidence.transferId))continue;sale.receipts.push(evidence);known.add(evidence.transferId);changed=true;}
     if(input.receive.unresolved())error='A payment original is not available yet. Your checkout and received evidence are saved. Check again.';
     if(changed)await save(await compact({...next,revision:state.revision+1}));for(const match of observed)if(known.has(match.evidence.transferId))input.receive.remember(match.evidence);return changed?'changed'as const:'unchanged'as const;
    });}catch(cause){if(!closed){error='Automatic confirmation is unavailable. Your checkout and received evidence are saved. Check payment to try again.';}throw cause;}finally{if(!closed){checking=false;publish();}}
   })();flight=attempt;void attempt.finally(()=>{if(flight===attempt)flight=null;}).catch(()=>{});return attempt;
  },
  dispose(){closed=true;listeners.clear();},
 };
}
export type MerchantCounterController=ReturnType<typeof createMerchantCounter>;
