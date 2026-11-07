import {readReceivingInvitationObject,type ReceivingInvitation} from './invitation';

/** Immutable public presentation only. Neither its URL nor digest is payment,
 * identity, acceptance or receiving authority. Publish only the reviewed fields. */
const origin='https://bankeiz.com',maxBytes=12*1024,maxHeld=24;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const valid=(digest:string)=>/^[a-f0-9]{64}$/.test(digest);
const endpoint=(digest:string)=>`https://receiz.com/api/public/display-snapshots/${digest}`;
type Held={value:ReceivingInvitation;bytes:number};
type Memo={held:Map<string,Held>;reads:Map<string,Promise<ReceivingInvitation>>;published:Set<string>;writes:Map<string,Promise<string>>};
const memos=new WeakMap<typeof fetch,Memo>();
function memo(fetcher:typeof fetch){let value=memos.get(fetcher);if(!value){value={held:new Map(),reads:new Map(),published:new Set(),writes:new Map()};memos.set(fetcher,value);}return value;}
function published(memory:Memo,digest:string){memory.published.add(digest);if(memory.published.size>128)memory.published.delete(memory.published.values().next().value!);}
function held(value:unknown){const invitation=readReceivingInvitationObject(value);if(invitation.institution)Object.freeze(invitation.institution);return Object.freeze(invitation);}
async function digest(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function boundedBody(response:Response){
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('INVITATION_TOO_LARGE');
 if(!response.body)throw Error('INVITATION_INVALID');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error('INVITATION_TOO_LARGE');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function invitationSnapshotDigest(link:string):string|null{
 try{const url=new URL(link,origin);return !url.search&&!url.hash?url.pathname.match(/^\/invitation\/([a-f0-9]{64})\/?$/)?.[1]??null:null;}catch{return null;}
}
export function invitationSnapshotUrl(digest:string){if(!valid(digest))throw Error('INVITATION_INVALID');return `${origin}/invitation/${digest}/`;}
export async function saveInvitationSnapshot(invitation:ReceivingInvitation,fetcher:typeof fetch=fetch,knownDigest?:string):Promise<string>{
 const payload=JSON.stringify(readReceivingInvitationObject(invitation)),bytes=encoder.encode(payload);if(bytes.length>maxBytes)throw Error('INVITATION_TOO_LARGE');
 const sha=await digest(bytes),url=invitationSnapshotUrl(sha),memory=memo(fetcher);if(knownDigest===sha){published(memory,sha);return url;}if(memory.published.has(sha))return url;
 const pending=memory.writes.get(sha);if(pending)return pending;
 const work=(async()=>{
  let response:Response;try{response=await fetcher(endpoint(sha),{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:payload,signal:AbortSignal.timeout(15000)});}catch{throw Error('INVITATION_SAVE_UNAVAILABLE');}
  if(!response.ok)throw Error('INVITATION_SAVE_UNAVAILABLE');
  const result:unknown=await response.json().catch(()=>null);if(!result||typeof result!=='object'||!('ok' in result)||result.ok!==true||!('sha256' in result)||result.sha256!==sha)throw Error('INVITATION_SAVE_UNAVAILABLE');
  published(memory,sha);return url;
 })();memory.writes.set(sha,work);try{return await work;}finally{if(memory.writes.get(sha)===work)memory.writes.delete(sha);}
}
export async function readInvitationSnapshot(sha:string,fetcher:typeof fetch=fetch):Promise<ReceivingInvitation>{
 if(!valid(sha))throw Error('INVITATION_INVALID');const memory=memo(fetcher),known=memory.held.get(sha);if(known)return known.value;const pending=memory.reads.get(sha);if(pending)return pending;
 const work=(async()=>{
  let response:Response;try{response=await fetcher(endpoint(sha),{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});}catch{throw Error('INVITATION_READ_UNAVAILABLE');}
  if(!response.ok)throw Error(response.status===404?'INVITATION_NOT_FOUND':'INVITATION_READ_UNAVAILABLE');const bytes=await boundedBody(response);if(await digest(bytes)!==sha)throw Error('INVITATION_INTEGRITY_FAILED');
  const value=held(JSON.parse(decoder.decode(bytes)));while(memory.held.size>=maxHeld)memory.held.delete(memory.held.keys().next().value!);memory.held.set(sha,{value,bytes:bytes.length});published(memory,sha);return value;
 })();memory.reads.set(sha,work);try{return await work;}finally{if(memory.reads.get(sha)===work)memory.reads.delete(sha);}
}
/** Supplied only by the digest-checked short invitation server. Reuse it for
 * first paint rather than reading the same public display again. */
export function initialInvitationSnapshot(link:string):ReceivingInvitation|null{
 const sha=invitationSnapshotDigest(link);if(!sha||typeof document==='undefined')return null;const seed=document.getElementById('receiving-invitation-snapshot');if(seed?.getAttribute('data-digest')!==sha)return null;
 try{if(encoder.encode(seed.textContent??'').length>maxBytes)return null;return held(JSON.parse(seed.textContent??''));}catch{return null;}
}
