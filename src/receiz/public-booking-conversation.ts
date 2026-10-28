import {bookingOverrides} from './booking-link';

export interface PublicBookingMessage {
 id:string;role:'user'|'assistant';body:string;status:'pending'|'streaming'|'accepted'|'interrupted';
}
export interface PendingBookingMessage {
 readonly message:string;readonly clientOperationId:string;readonly quoteExpiresAt:string;
 readonly clientUserMessageId:string;readonly clientAssistantMessageId:string;
 readonly replyToOperationId:string|null;readonly locale:string;readonly timezone:string;
}
export interface PublicTwinBookingConfirmation {
 eventId:string;title:string;startAt:string;endAt:string;attendeeName:string;attendeeEmail:string;timezone:string|null;location:string;
}
export interface PublicBookingConversationSnapshot {
 draft:string;messages:readonly PublicBookingMessage[];busy:boolean;pending:PendingBookingMessage|null;
 lastAcceptedOperationId:string|null;error:string;bookingConfirmation:PublicTwinBookingConfirmation|null;
 /** Exact accepted native reply retains proposal, memory and proof relationships. */
 reply:Record<string,unknown>|null;
}
export interface PublicBookingConversationController {
 known():PublicBookingConversationSnapshot;subscribe(listener:()=>void):()=>void;
 setDraft(value:string):void;send():Promise<void>;retry():Promise<void>;dispose():void;
}
// Match the existing public native relay; optional carried context is not visible text.
const MAX_NATIVE_EVENT=32*1024*1024;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const validUsername=(username:string)=>/^[a-z0-9_]{3,24}$/.test(username);

export {createPublicBookingRequest} from './public-booking-request';
function confirmation(raw:unknown):PublicTwinBookingConfirmation|null{
 if(raw===undefined||raw===null)return null;
 const value=record(raw);
 if(!['eventId','title','startAt','endAt','attendeeName','attendeeEmail','location'].every(key=>typeof value[key]==='string')||!value.eventId||!Number.isFinite(Date.parse(String(value.startAt)))||!Number.isFinite(Date.parse(String(value.endAt)))||Date.parse(String(value.endAt))<=Date.parse(String(value.startAt))||value.timezone!==null&&typeof value.timezone!=='string')throw Error('RECEIZ_RESULT_UNCONFIRMED');
 return value as unknown as PublicTwinBookingConfirmation;
}

export function createPublicBookingConversation({username,options,request=globalThis.fetch}:{username:string;options:URLSearchParams;request?:typeof fetch}):PublicBookingConversationController{
 if(!validUsername(username))throw Error('BOOKING_USERNAME_REQUIRED');
 const params=bookingOverrides(new URLSearchParams(options));params.sort();
 const path='/api/bank/booking/'+username+'/conversation'+(params.size?'?'+params:'');
 let state:PublicBookingConversationSnapshot={draft:'',messages:[],busy:false,pending:null,lastAcceptedOperationId:null,error:'',bookingConfirmation:null,reply:null};
 const listeners=new Set<()=>void>();let disposed=false,active:AbortController|null=null,work:Promise<void>|null=null;
 const publish=(patch:Partial<PublicBookingConversationSnapshot>)=>{if(disposed)return;state={...state,...patch};for(const listener of listeners)listener();};
 const reviseMessage=(id:string,patch:Partial<PublicBookingMessage>)=>publish({messages:state.messages.map(row=>row.id===id?{...row,...patch}:row)});
 const assertLive=()=>{if(disposed||active?.signal.aborted)throw Error('CONVERSATION_CLOSED');};
 const accept=(event:Record<string,unknown>,pending:PendingBookingMessage)=>{
  const reply=record(event.reply);
  if(record(event.world).username!==username||typeof reply.message!=='string'||event.assistantMessage&&record(event.assistantMessage).id!==pending.clientAssistantMessageId)throw Error('RECEIZ_SOURCE_MISMATCH');
  const booked=confirmation(reply.bookingConfirmation);
  // Preserve prior accepted history; native memory may be a bounded window.
  // UUID transport identities let the current provisional rows become the
  // actual native rows without remounting or comparing message text.
  const rows=new Map(state.messages.map(row=>[row.id,row]));
  const incoming=new Map<string,PublicBookingMessage>();
  if(Array.isArray(reply.memory))for(const raw of reply.memory){const row=record(raw);if(typeof row.id!=='string'||!['user','assistant'].includes(String(row.role))||typeof row.body!=='string')continue;
   const alias=typeof row.transportId==='string'&&rows.has(row.transportId)?row.transportId:row.id;
   const held=rows.get(alias);
   // Match the existing native continuity projection: an accepted text may be
   // extended, never shortened by a later bounded memory representation.
   const body=held?.status==='accepted'&&!row.body.startsWith(held.body)?held.body:row.body;
   incoming.set(alias,{...row,id:alias,role:row.role as 'user'|'assistant',body,status:'accepted'});
  }
  incoming.set(pending.clientUserMessageId,{...rows.get(pending.clientUserMessageId),id:pending.clientUserMessageId,role:'user',body:pending.message,status:'accepted'});
  incoming.set(pending.clientAssistantMessageId,{...rows.get(pending.clientAssistantMessageId),id:pending.clientAssistantMessageId,role:'assistant',body:reply.message,status:'accepted'});
  // Keep held order and DOM identities. Native source order places historical
  // additions before/after their known anchors, including the current turn.
  const order=[...rows.keys()];let nextAnchor:string|undefined;
  for(const [id,row] of [...incoming].reverse()){
   rows.set(id,row);
   if(!order.includes(id)){const at=nextAnchor===undefined?-1:order.indexOf(nextAnchor);order.splice(at<0?order.length:at,0,id);}
   nextAnchor=id;
  }
  publish({messages:order.map(id=>rows.get(id)!),pending:null,lastAcceptedOperationId:pending.clientOperationId,reply,bookingConfirmation:booked??state.bookingConfirmation,error:''});
 };
 const refuse=(value:Record<string,unknown>,pending:PendingBookingMessage)=>{
  const status=value.operationStatus,error=typeof value.error==='string'?value.error:'RECEIZ_RESULT_UNCONFIRMED';
  // A terminal refusal that did not accept the operation allows an explicit
  // new turn. Accepted-without-output and indeterminate results stay locked to
  // the exact operation: neither licenses a fresh confirmation/payment attempt.
  const released=['released','rejected','quote_expired'].includes(String(status));
  publish({error,pending:released?null:pending,...(released&&!state.draft?{draft:pending.message}:{})});
 };
 async function consume(response:Response,pending:PendingBookingMessage){
  if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')){
   const value=record(await response.json());assertLive();
   if(!response.ok||value.ok!==true){refuse(value,pending);return;}accept(value,pending);return;
  }
  if(!response.body)throw Error('RECEIZ_RESULT_UNCONFIRMED');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',complete=false;
  const frame=(raw:string)=>{
   const data=raw.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;
   const value=record(JSON.parse(data));assertLive();
   if(value.type==='error'){refuse(value,pending);complete=true;return;}
   if(['reply_start','reply_delta','reply_preview'].includes(String(value.type))&&value.messageId!==pending.clientAssistantMessageId)throw Error('RECEIZ_SOURCE_MISMATCH');
   if(value.type==='reply_delta'){
    if(typeof value.delta!=='string')throw Error('RECEIZ_RESULT_UNCONFIRMED');
    const previous=state.messages.find(row=>row.id===pending.clientAssistantMessageId)?.body??'';
    if(previous.length+value.delta.length>2_000_000)throw Error('RECEIZ_RESULT_UNCONFIRMED');
    reviseMessage(pending.clientAssistantMessageId,{body:previous+value.delta,status:'streaming'});
   }else if(value.type==='reply_done'){accept(value,pending);complete=true;}
  };
  try{
   for(;;){const {value,done}=await reader.read();assertLive();if(done)break;buffer+=decoder.decode(value,{stream:true});let match;
    while((match=/\r?\n\r?\n/.exec(buffer))){const raw=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);if(raw.length>MAX_NATIVE_EVENT)throw Error('RECEIZ_RESULT_UNCONFIRMED');frame(raw);if(complete)return;}
    if(buffer.length>MAX_NATIVE_EVENT)throw Error('RECEIZ_RESULT_UNCONFIRMED');
   }
   buffer+=decoder.decode();if(buffer.trim())frame(buffer);if(!complete)throw Error('RECEIZ_RESULT_UNCONFIRMED');
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 function dispatch(pending:PendingBookingMessage):Promise<void>{
  if(disposed)return Promise.resolve();if(work)return work;
  active=new AbortController();
  publish({busy:true,error:'',pending,messages:state.messages.map(row=>row.id===pending.clientAssistantMessageId?{...row,body:'',status:'pending'}:row)});
  const run=(async()=>{
   try{const response=await request(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify(pending),signal:AbortSignal.any([active!.signal,AbortSignal.timeout(120000)])});assertLive();await consume(response,pending);}
   catch(error){if(!disposed)publish({error:error instanceof Error?error.message:'RECEIZ_RESULT_UNCONFIRMED'});}
   finally{if(!disposed){publish({busy:false,messages:state.messages.map(row=>(row.id===pending.clientAssistantMessageId||row.id===pending.clientUserMessageId)&&row.status!=='accepted'?{...row,status:'interrupted'}:row)});}active=null;}
  })();work=run;void run.finally(()=>{if(work===run)work=null;});return run;
 }
 return{
  known:()=>state,
  subscribe(listener){if(!disposed)listeners.add(listener);return()=>{listeners.delete(listener);};},
  setDraft(value){publish({draft:value});},
  send(){
   if(disposed||state.pending||state.busy)return work??Promise.resolve();const message=state.draft.trim();
   if(!message)return Promise.resolve();if(message.length>6500){publish({error:'MESSAGE_TOO_LONG'});return Promise.resolve();}
   const pending=Object.freeze({message,clientOperationId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+10*60000).toISOString(),clientUserMessageId:crypto.randomUUID(),clientAssistantMessageId:crypto.randomUUID(),replyToOperationId:state.lastAcceptedOperationId,locale:typeof navigator==='undefined'?'en':navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
   publish({draft:'',pending,messages:[...state.messages,{id:pending.clientUserMessageId,role:'user',body:message,status:'pending'},{id:pending.clientAssistantMessageId,role:'assistant',body:'',status:'pending'}]});return dispatch(pending);
  },
  retry(){return state.pending?dispatch(state.pending):Promise.resolve();},
  dispose(){if(disposed)return;disposed=true;active?.abort();listeners.clear();},
 };
}
