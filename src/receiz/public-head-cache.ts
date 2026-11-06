import {browserPreparedBankCache,type PreparedBankCache} from './prepared-bank-cache.js';
import {profileAvatarUrl} from './profile-avatar.js';
import {curatePublicProfileHead,type PublicProfileHead,type PublicProfileHeader} from './public-profile-header.js';

/** A compact public display continuation, not identity, access, proof or
 * Source-currentness authority. The consumed basis is exact display equality. */
export type StoredPublicHead=({head:PublicProfileHead;header?:never}|{header:PublicProfileHeader;head?:never})&{consumedBasis:string|null};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const optionalText=(v:unknown,max:number)=>v===null||typeof v==='string'&&v.length<=max;
function publicLink(v:unknown):string|null{if(typeof v!=='string'||v.length>8192)return null;try{const url=new URL(v);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
/** Copy the existing normalized public display contract after its reader has
 * accepted the response. This does not create a Source viewer/proof envelope. */
export function copyPublicProfileHeader(input:unknown,username?:string):PublicProfileHeader|null{
 const p=object(input),stats=object(p.stats),hash=p.pbiReceiptHash;
 if(p.schema!=='bankeiz.public-profile.v1'||typeof p.userId!=='string'||!p.userId||p.userId.length>256||typeof p.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(p.username)||username!==undefined&&p.username!==username||typeof p.displayName!=='string'||!p.displayName.trim()||p.displayName.length>500)return null;
 if(!optionalText(p.bio,280)||!optionalText(p.location,100)||!optionalText(p.createdAt,64)||p.websiteUrl!==null&&!publicLink(p.websiteUrl)||p.avatarUrl!==null&&!profileAvatarUrl(p.avatarUrl)||p.bannerUrl!==null&&!profileAvatarUrl(p.bannerUrl)||typeof p.authorshipVerified!=='boolean'||hash!==null&&(typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash))||p.authorshipVerified&&hash===null)return null;
 const statKeys=['originals','views','plays','seconds','completion'] as const;if(statKeys.some(key=>stats[key]!==null&&(typeof stats[key]!=='number'||!Number.isFinite(stats[key])||Number(stats[key])<0)))return null;
 const links=(value:unknown,max:number)=>Array.isArray(value)&&value.length<=max?value.flatMap(raw=>{const row=object(raw),url=publicLink(row.url);return typeof row.label==='string'&&!!row.label.trim()&&row.label.length<=80&&url?[{label:row.label,url}]:[];}):null;
 const social=links(p.socialLinks,5),custom=links(p.links,20);if(!social||!custom)return null;
 return{schema:'bankeiz.public-profile.v1',userId:p.userId,username:p.username,displayName:p.displayName,bio:p.bio as string|null,location:p.location as string|null,createdAt:p.createdAt as string|null,websiteUrl:p.websiteUrl===null?null:publicLink(p.websiteUrl),avatarUrl:p.avatarUrl===null?null:profileAvatarUrl(p.avatarUrl),bannerUrl:p.bannerUrl===null?null:profileAvatarUrl(p.bannerUrl),authorshipVerified:p.authorshipVerified,pbiReceiptHash:hash as string|null,socialLinks:social,links:custom,...(typeof p.bookingEnabled==='boolean'?{bookingEnabled:p.bookingEnabled}:{}),stats:Object.fromEntries(statKeys.map(key=>[key,stats[key]])) as PublicProfileHeader['stats']};
}
const owner=(value:StoredPublicHead)=>value.head?value.head.profile:value.header!;
const prefix='receiz-bank-public-head-v1:',schema='bankeiz.public-head-cache.v1',limit=1024*1024;
interface Entry {value:StoredPublicHead|null;serial:string|null;port?:PreparedBankCache;}
const entries=new Map<string,Entry>();
function decode(serial:string):StoredPublicHead|null|undefined{
 if(serial.length>limit)return;try{const value=JSON.parse(serial) as Record<string,unknown>;if(value.schema!==schema)return;if(value.head===null)return null;
 if(value.consumedBasis!==null&&typeof value.consumedBasis!=='string')return;const consumedBasis=value.consumedBasis as string|null;
 if(value.head){const head=curatePublicProfileHead(value.head);return head?{head,consumedBasis}:undefined;}
 const header=copyPublicProfileHeader(value.header);return header?{header,consumedBasis}:undefined;}catch{return;}
}
async function body(response:Response){
 if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>limit||!response.body)throw Error('PUBLIC_HEAD_CACHE_INVALID');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let serial='',size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit)throw Error('PUBLIC_HEAD_CACHE_CAPACITY');serial+=decoder.decode(next.value,{stream:true});}return serial+decoder.decode();}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
}
function entry(uid:string,onAvailable?:()=>void):Entry{
 const previous=entries.get(uid);if(previous)return previous;
 // This URL is only an internal CacheStorage key; it is never fetched.
 const next:Entry={value:null,serial:null,port:browserPreparedBankCache('/__bankeiz-held-public-head/?uid='+encodeURIComponent(uid))};entries.set(uid,next);
 try{const serial=localStorage.getItem(prefix+uid);if(serial!==null){const value=decode(serial);if(value!==undefined&&(!value||owner(value).userId===uid)){next.value=value;next.serial=serial;return next;}}}catch{/* Optional public display storage. */}
 const selected=next;
 void next.port?.read().then(async response=>{if(!response)return;let serial:string;try{serial=await body(response);}catch{await next.port?.discard(response);return;}const value=decode(serial);
  if(value===undefined||value&&owner(value).userId!==uid){await next.port?.discard(response);return;}
  if(entries.get(uid)!==selected||selected.serial!==null)return;
  selected.value=value;selected.serial=serial;onAvailable?.();
 }).catch(()=>{/* Available RAM and catalog display never wait for this part. */});
 return next;
}
/** Read once per owner; a quota fallback arrives through the existing display
 * subscription without delaying the already available catalog. */
export function storedPublicHead(uid:string,username:string,onAvailable?:()=>void):StoredPublicHead|null{
 const value=entry(uid,onAvailable).value;return value&&owner(value).username===username?value:null;
}
function write(uid:string,value:StoredPublicHead|null){
 const selected=entry(uid),serial=JSON.stringify({schema,...(value??{head:null,consumedBasis:null})});if(selected.serial===serial||new TextEncoder().encode(serial).byteLength>limit)return;
 // Replacing the entry also supersedes an older optional asynchronous read.
 const next:Entry={...selected,value,serial};entries.set(uid,next);
 let previous:string|null|undefined,saved=false;
 try{previous=localStorage.getItem(prefix+uid);localStorage.setItem(prefix+uid,serial);saved=true;}catch{/* CacheStorage handles complete public inputs beyond localStorage quota. */}
 void next.port?.write(new Response(serial,{headers:{'Content-Type':'application/json'}}),()=>{if(!saved&&previous!==undefined&&entries.get(uid)===next)try{if(localStorage.getItem(prefix+uid)===previous)localStorage.removeItem(prefix+uid);}catch{/* Never retire a newer or unavailable copy. */}}).catch(()=>{/* A failed optional save preserves the prior durable display. */});
}
export function retainStoredPublicHead(head:PublicProfileHead,consumedBasis:string|null){write(String(head.profile.userId),{head,consumedBasis});}
export function retainStoredPublicHeader(header:PublicProfileHeader,consumedBasis:string|null){write(header.userId,{header,consumedBasis});}
/** Refusals retire only this public display part, never account custody. A
 * tiny tombstone also prevents an older CacheStorage copy from reappearing. */
export function forgetStoredPublicHead(uid:string){write(uid,null);}
