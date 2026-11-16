import {parseReceizWebhookRequest} from '@receiz/sdk';
import type {OrderStatus,OrderStore,WebhookOptions} from './types.js';
interface Work {digest:string;remaining:string[];}
const maximum=256*1024;
async function rawBody(request:Request){
 if(request.method!=='POST')throw Error('WEBHOOK_POST_REQUIRED');
 if(Number(request.headers.get('content-length'))>maximum)throw Error('WEBHOOK_TOO_LARGE');
 if(!request.body)throw Error('WEBHOOK_BODY_REQUIRED');const reader=request.body.getReader(),parts:Uint8Array[]= [];let length=0;
 try{for(;;){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maximum)throw Error('WEBHOOK_TOO_LARGE');parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}

export function createOrderWebhookHandler(input:{store:OrderStore;prefix:string;check(orderId:string,options:{signal?:AbortSignal}):Promise<OrderStatus>}){
 return async(request:Request,options:WebhookOptions)=>{
  if(typeof options.secret!=='string'||!options.secret)throw Error('WEBHOOK_SECRET_REQUIRED');options.signal?.throwIfAborted();
  const body=await rawBody(request),parsed=await parseReceizWebhookRequest(new Request(request.url,{method:'POST',headers:request.headers,body}),{secret:options.secret,toleranceSeconds:300});
  if(!parsed.event.id||parsed.event.id.length>200)throw Error('WEBHOOK_ID_INVALID');
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))].map(b=>b.toString(16).padStart(2,'0')).join(''),key=input.prefix+'webhook:'+encodeURIComponent(parsed.event.id);
  const existing=await input.store.transaction(tx=>tx.get<Work>(key));
  let remaining=existing?.remaining;
  if(existing&&existing.digest!==digest)throw Error('WEBHOOK_EVENT_CONFLICT');
  if(!remaining){const mapped=await options.resolveOrders(parsed.event);if(!Array.isArray(mapped)||mapped.length>100||mapped.some(id=>typeof id!=='string'||!id.length||id.length>120))throw Error('WEBHOOK_ORDER_MAPPING_INVALID');remaining=[...new Set(mapped)];}
  const work=await input.store.transaction(tx=>{tx.insert(key,{digest,remaining} satisfies Work);const held=tx.get<Work>(key)!;if(held.digest!==digest)throw Error('WEBHOOK_EVENT_CONFLICT');return held;});
  const orders:OrderStatus[]=[];
  for(const id of work.remaining){options.signal?.throwIfAborted();try{const status=await input.check(id,{signal:options.signal});orders.push(status);
   if(status.receiving==='complete')await input.store.transaction(tx=>{const held=tx.get<Work>(key)!;held.remaining=held.remaining.filter(value=>value!==id);tx.put(key,held);});
   }catch{options.signal?.throwIfAborted();/* Leave this exact work pending; continue independent mappings. */}
  }
  const final=await input.store.transaction(tx=>tx.get<Work>(key)!);return{eventId:parsed.event.id,complete:final.remaining.length===0,orders};
 };
}
