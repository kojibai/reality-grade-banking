import type {MessageTransport} from './native-messaging';
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export interface PeerTypingController {update(active:boolean):void;close():void}
/** Ephemeral Receiz activity. Never retains drafts, sends messages, or polls. */
export function createPeerTyping({request,conversationId,accountUid,onPeers}:{request:MessageTransport;conversationId:string;accountUid:string;onPeers:(userIds:string[])=>void}):PeerTypingController {
 if(!uuid.test(conversationId))throw Error('CHAT_INVALID_CONVERSATION');
 const lifetime=new AbortController(),instances=new Map<string,{userId:string;sequence:number;expires:number}>();
 const clientId=crypto.randomUUID();let sequence=0,closed=false,ready=false,wanted=false,lastActive=false,lastSent=-Infinity,posting=false,dirty=false,retries=0;
 let idle:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined,reconnect:ReturnType<typeof setTimeout>|undefined;
 let visible='',streamReader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 function paint(){
  clearTimeout(expiry);const now=Date.now(),users=new Set<string>();let next=Infinity;
  for(const entry of instances.values())if(entry.expires>now){users.add(entry.userId);next=Math.min(next,entry.expires);}
  const values=[...users].sort(),key=values.join(',');if(key!==visible){visible=key;onPeers(values);}
  if(next<Infinity)expiry=setTimeout(paint,next-now+1);
 }
 async function post(){
  if(posting||!dirty)return;posting=true;
  try{while(dirty){dirty=false;const active=wanted;if(active&&(!ready||closed))continue;
   const count=++sequence;lastSent=Date.now();lastActive=active;
   try{await request(`/api/chat/conversations/${conversationId}/typing`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({active,clientId,sequence:count}),signal:AbortSignal.timeout(2500)});}catch{/* Activity failure never affects sending. No automatic write retry. */}
  }}finally{posting=false;}
 }
 function update(active:boolean){
  if(closed)return;clearTimeout(idle);const changed=wanted!==active;wanted=active;
  if(active)idle=setTimeout(()=>update(false),1800);
  if(ready&&(changed||active&&Date.now()-lastSent>=3000)){dirty=true;void post();}
 }
 function event(value:Record<string,unknown>){
  if(value.type==='ready'){ready=true;if(wanted){dirty=true;void post();}return;}
  if(value.type!=='typing'||value.conversationId!==conversationId||value.userId===accountUid||!uuid.test(String(value.userId))||!uuid.test(String(value.clientId))||!Number.isSafeInteger(value.sequence)||Number(value.sequence)<1||typeof value.active!=='boolean'||typeof value.expiresInMs!=='number'||value.expiresInMs<0||value.expiresInMs>6000)return;
  const key=String(value.userId)+':'+String(value.clientId),prior=instances.get(key);if(prior&&Number(value.sequence)<=prior.sequence)return;
  // Keep sequence tombstones for this bounded stream lifetime so delayed starts
  // cannot resurrect a stopped/expired device. Other devices remain independent.
  if(!prior&&instances.size>=1000)return;
  instances.set(key,{userId:String(value.userId),sequence:Number(value.sequence),expires:value.active?Date.now()+value.expiresInMs:0});paint();
 }
 async function connect(){
  if(closed)return;const connectedAt=Date.now();let reader:ReadableStreamDefaultReader<Uint8Array>|undefined,wasReady=false,rotate=false;
  try{
   const response=await request(`/api/chat/conversations/${conversationId}/typing/stream`,{signal:lifetime.signal,cache:'no-store'});
   // Older deployments and denied membership stay quiet; no endpoint probing.
   if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')||!response.body){await response.body?.cancel();return;}
   reader=response.body.getReader();streamReader=reader;const decoder=new TextDecoder();let buffer='',total=0;
   while(!closed){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>1024*1024)throw Error('typing stream capacity');buffer+=decoder.decode(part.value,{stream:true}).replace(/\r\n/g,'\n');if(buffer.length>65536)throw Error('typing event capacity');let at;
    while((at=buffer.indexOf('\n\n'))>=0){const raw=buffer.slice(0,at);buffer=buffer.slice(at+2);const data=raw.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)continue;const value=JSON.parse(data) as Record<string,unknown>;if(value.type==='reconnect')rotate=true;else if(value.type==='ready')wasReady=true;event(value);}
   }
  }catch{/* Reconnection is for a previously established event stream only. */}
  finally{await reader?.cancel().catch(()=>{});reader?.releaseLock();if(streamReader===reader)streamReader=undefined;ready=false;instances.clear();paint();if(wasReady&&Date.now()-connectedAt>=10000||rotate)retries=0;}
  if(!closed&&(rotate||wasReady&&retries++<3))reconnect=setTimeout(()=>{void connect();},rotate?0:Math.min(30000,1000*2**retries));
 }
 void connect();
 return {update,close(){if(closed)return;closed=true;clearTimeout(idle);clearTimeout(expiry);clearTimeout(reconnect);wanted=false;
  if(lastActive){dirty=true;void post();}lifetime.abort();void streamReader?.cancel().catch(()=>{});instances.clear();paint();
 }};
}
