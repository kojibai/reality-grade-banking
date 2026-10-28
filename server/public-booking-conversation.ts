import {createHash,randomUUID} from 'node:crypto';
import {bookingOverrides} from '../src/receiz/booking-link.js';

const ORIGIN='https://receiz.com',MAX_BODY=32*1024,MAX_EVENT=32*1024*1024;
type RecordValue=Record<string,unknown>;
const record=(value:unknown):RecordValue=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const coordinate=(value:unknown):value is string=>text(value,160)&&value.length>=8;

// Same public guest coordinate as the existing cooperative/native conversation.
// No owner session, Identity, authorization header or caller-selected thread.
function visitor(request:Request):string|null{
 const raw=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith('receiz_world_visitor='))?.slice('receiz_world_visitor='.length);
 let value='';try{value=decodeURIComponent(raw??'').trim().toLowerCase().replace(/[^a-z0-9:_-]+/g,'').slice(0,120);}catch{/* Invalid public cookie establishes a new read coordinate. */}
 return value.length>=8?value:null;
}
async function readBody(request:Request):Promise<RecordValue>{
 const reader=request.body?.getReader();if(!reader)throw Error('INVALID_REQUEST');
 let size=0;const parts:Uint8Array[]=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY)throw Error('REQUEST_TOO_LARGE');parts.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const value:unknown=JSON.parse(new TextDecoder().decode(Buffer.concat(parts)));
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_REQUEST');return value as RecordValue;
}
function accepted(value:RecordValue,username:string,messageId:string){
 return record(value.world).username===username&&typeof record(value.reply).message==='string'&&(!value.assistantMessage||record(value.assistantMessage).id===messageId);
}
function textResult(value:RecordValue){const reply=record(value.reply);return Object.hasOwn(reply,'performance')?{...value,reply:{...reply,performance:null}}:value;}
function nativeStream(response:Response,username:string,messageId:string):ReadableStream<Uint8Array>{
 const encoder=new TextEncoder(),decoder=new TextDecoder();let buffer='',complete=false,failed=false;
 const event=(controller:TransformStreamDefaultController<Uint8Array>,value:unknown)=>controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));
 const refuse=(controller:TransformStreamDefaultController<Uint8Array>,error='RECEIZ_RESULT_UNCONFIRMED')=>{if(!failed){failed=true;event(controller,{type:'error',error});}};
 const consume=(controller:TransformStreamDefaultController<Uint8Array>,frame:string)=>{
  if(failed)return;if(frame.length>MAX_EVENT){refuse(controller);return;}
  const data=frame.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;
  let value:RecordValue;try{value=record(JSON.parse(data));}catch{refuse(controller);return;}
  if(['reply_start','reply_delta','reply_preview'].includes(String(value.type))){
   if(complete||value.messageId!==messageId){refuse(controller,'RECEIZ_SOURCE_MISMATCH');return;}
   if(value.type==='reply_delta'&&typeof value.delta!=='string'){refuse(controller);return;}
   if(value.type==='reply_preview')return;
  }else if(value.type==='reply_done'){
   if(complete||!accepted(value,username,messageId)){refuse(controller,'RECEIZ_SOURCE_MISMATCH');return;}complete=true;
  }else if(value.type==='error'){failed=true;}
  else if(value.type==='done'){if(!complete){refuse(controller);return;}}
  else return;
  event(controller,value.type==='reply_done'?textResult(value):value);
 };
 return response.body!.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({
  transform(chunk,controller){buffer+=decoder.decode(chunk,{stream:true});let match;while((match=/\r?\n\r?\n/.exec(buffer))){consume(controller,buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);}if(buffer.length>MAX_EVENT){buffer='';refuse(controller);}},
  flush(controller){buffer+=decoder.decode();if(buffer.trim())consume(controller,buffer);if(!complete&&!failed)refuse(controller);},
 }));
}

export async function handlePublicBookingConversation(request:Request,{fetch:transport=globalThis.fetch}:{fetch?:typeof fetch}={}):Promise<Response>{
 const url=new URL(request.url),route=/^\/api\/bank\/booking\/([a-z0-9_]{3,24})(\/conversation)?$/.exec(url.pathname);
 const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
 const result=(status:number,value:unknown)=>Response.json(value,{status,headers});
 const fail=(status:number,error:string)=>result(status,{ok:false,error});
 if(!route)return fail(404,'BOOKING_PATH_DENIED');
 const username=route[1],conversation=Boolean(route[2]);
 if(request.method!=='POST'&&(request.method!=='GET'||conversation)){headers.set('Allow',conversation?'POST':'GET, POST');return fail(405,'METHOD_NOT_ALLOWED');}
 let options:URLSearchParams;try{options=bookingOverrides(url.searchParams);options.sort();}catch{return fail(400,'BOOKING_LINK_INVALID');}
 const existing=visitor(request);
 if(request.method==='POST'){
  const origin=request.headers.get('origin');
  if(!origin||!new Set(['https://bankeiz.com','https://www.bankeiz.com',url.origin]).has(origin)||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'ORIGIN_REFUSED');
  // Establish this cookie in the existing calendar GET before any operation.
  // A missing cookie must not move a retry to a freshly generated visitor.
  if(!existing)return fail(409,'GUEST_CONTINUITY_REQUIRED');
 }
 const who=existing??'guest_'+randomUUID();
 if(request.method==='GET'&&!existing)headers.set('Set-Cookie',`receiz_world_visitor=${encodeURIComponent(who)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${url.protocol==='https:'?'; Secure':''}`);
 const nativeHeaders=new Headers({'Content-Type':'application/json',Accept:conversation?'text/event-stream':'application/json',Cookie:'receiz_world_visitor='+who});
 const agent=request.headers.get('user-agent');if(agent)nativeHeaders.set('User-Agent',agent.slice(0,512));
 const ip=request.headers.get('x-vercel-forwarded-for');if(ip&&ip.length<128)nativeHeaders.set('X-Forwarded-For',ip);
 try{
  let payload:RecordValue|undefined,messageId='';
  if(request.method==='POST'){
   if(Number(request.headers.get('content-length'))>MAX_BODY)return fail(413,'REQUEST_TOO_LARGE');
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return fail(415,'JSON_REQUIRED');
   let body:RecordValue;try{body=await readBody(request);}catch(cause){return fail(cause instanceof Error&&cause.message==='REQUEST_TOO_LARGE'?413:400,'INVALID_REQUEST');}
   if(conversation){
    if(!text(body.message,6500)||!coordinate(body.clientOperationId)||!coordinate(body.clientUserMessageId)||!coordinate(body.clientAssistantMessageId)||!text(body.quoteExpiresAt,64)||!Number.isFinite(Date.parse(body.quoteExpiresAt))||body.replyToOperationId!==null&&body.replyToOperationId!==undefined&&!coordinate(body.replyToOperationId))return fail(400,'MESSAGE_REQUIRED');
    messageId=body.clientAssistantMessageId;
    const threadKey='booking:'+createHash('sha256').update(JSON.stringify([username,who,Object.fromEntries(options)])).digest('hex').slice(0,40);
    payload={action:'message',message:body.message,clientOperationId:body.clientOperationId,quoteExpiresAt:body.quoteExpiresAt,clientUserMessageId:body.clientUserMessageId,clientAssistantMessageId:messageId,replyToOperationId:body.replyToOperationId??null,visitorKey:who,threadKey,deliveryMode:'text',allowBrowserVoiceFallback:false,clientContext:{applicationName:'Bankeiz',applicationOrigin:'https://bankeiz.com',pagePath:'/book/'+username+'/',pageTitle:'Book a conversation with @'+username,pagePurpose:'Arrange an appointment with this owner using actual availability and an exact accepted review followed by explicit confirmation.',bookingLinkOptions:Object.fromEntries(options),locale:text(body.locale,32)?body.locale:null,timezone:text(body.timezone,120)?body.timezone:null}};
   }else{
    // Preserve the existing native manual booking fields and validators. Never
    // relay settings actions, arbitrary metadata or private account material.
    payload={meeting:true};for(const key of ['slotStartAt','name','email','notes','timezone','questions','scheduleConfig'])if(Object.hasOwn(body,key))payload[key]=body[key];
   }
  }
  const target=conversation?ORIGIN+'/api/world/profile/'+username+'/stream':ORIGIN+'/api/calendar/embed/'+username+(options.size?'?'+options:'');
  const response=await transport(target,{method:request.method,headers:nativeHeaders,credentials:'omit',...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(conversation?110000:30000)])});
  if(conversation&&response.ok&&response.headers.get('content-type')?.includes('text/event-stream')&&response.body){headers.set('Content-Type','text/event-stream; charset=utf-8');headers.set('Cache-Control','no-store, no-transform');headers.set('X-Accel-Buffering','no');return new Response(nativeStream(response,username,messageId),{status:response.status,headers});}
  const data=record(await response.json());
  const retryAfter=response.headers.get('retry-after');if(retryAfter)headers.set('Retry-After',retryAfter);
  if(!response.ok)return result(response.status,data);
  if(data.ok!==true)return result(502,data);
  if(conversation){if(!accepted(data,username,messageId))return fail(502,'RECEIZ_SOURCE_MISMATCH');return result(response.status,textResult(data));}
  if(request.method==='GET'&&record(data.owner).username!==username)return fail(502,'RECEIZ_SOURCE_MISMATCH');
  return result(response.status,data);
 }catch{return fail(502,'RECEIZ_RESULT_UNCONFIRMED');}
}
