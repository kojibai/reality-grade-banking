import type {NativeTwinMemory} from './native-twin';
export type TwinConversation={threadKey:string;title:string;preview:string;updatedAt:string};
export type TwinConversationList={threads:TwinConversation[];hasMore:boolean;nextCursor:string|null};
export type TwinConversationPage={threadKey:string;entries:NativeTwinMemory[];hasMore:boolean;nextCursor:string|null;sourceDigest:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function isOwnerTwinThreadKey(key:unknown,ownerUid:string):key is string{const base=`api:${ownerUid}`;return typeof key==='string'&&(key===base||key.startsWith(base+':')&&uuid.test(key.slice(base.length+1)));}
export function permittedTwinConversationRead(url:URL,ownerUid?:string){
 if(!/^\/api\/developers\/twin\/[a-z0-9_]{3,24}\/conversations$/.test(url.pathname))return false;
 const q=url.searchParams,keys=[...q.keys()];if(keys.some(key=>!['threadKey','cursor','query','edge','limit'].includes(key)||q.getAll(key).length!==1))return false;
 const key=q.get('threadKey');if(key!==null&&!(ownerUid?isOwnerTwinThreadKey(key,ownerUid):/^api:[a-f0-9-]{36}(?::[a-f0-9-]{36})?$/.test(key)))return false;
 return(!q.has('cursor')||/^[A-Za-z0-9_-]{1,2048}$/.test(q.get('cursor')??''))&&(!q.has('query')||q.get('query')!.length<=160)&&(!q.has('edge')||['first','recent'].includes(q.get('edge')!))&&(!q.has('limit')||/^(?:[1-9]|1\d|20)$/.test(q.get('limit')??''));
}
function invalid():never{throw Error('BANK_TWIN_CONVERSATION_INVALID');}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return invalid();return value as Record<string,unknown>;}
function page(raw:unknown,ownerUid:string){const v=object(raw);if(v.ok!==true)throw Error('BANK_TWIN_CONVERSATION_UNAVAILABLE');if(v.ownerUid!==ownerUid)throw Error('BANK_TWIN_CONVERSATION_OWNER_MISMATCH');if(typeof v.hasMore!=='boolean'||v.nextCursor!==null&&(typeof v.nextCursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(v.nextCursor))||v.hasMore!==(v.nextCursor!==null))invalid();return v;}
export function parseTwinConversationList(raw:unknown,ownerUid:string):TwinConversationList{
 const v=page(raw,ownerUid);if(!Array.isArray(v.threads)||v.threads.length>20)invalid();const seen=new Set<string>();
 const threads=v.threads.map(value=>{const row=object(value);if(!isOwnerTwinThreadKey(row.threadKey,ownerUid)||seen.has(row.threadKey)||typeof row.title!=='string'||!row.title||row.title.length>100||typeof row.preview!=='string'||row.preview.length>180||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))return invalid();seen.add(row.threadKey);return row as unknown as TwinConversation;});
 return{threads,hasMore:v.hasMore as boolean,nextCursor:v.nextCursor as string|null};
}
export function parseTwinConversationPage(raw:unknown,ownerUid:string,threadKey:string):TwinConversationPage{
 const v=page(raw,ownerUid);if(v.threadKey!==threadKey||!Array.isArray(v.entries)||v.entries.length>20||typeof v.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(v.sourceDigest))invalid();
 const ids=new Set<string>(),entries=v.entries.map(value=>{const row=object(value);if(typeof row.id!=='string'||!uuid.test(row.id)||ids.has(row.id)||row.threadKey!==threadKey||row.coordinate!==`owner-twin-memory:${ownerUid}:${row.id}`||!['user','assistant'].includes(String(row.role))||!['session','relationship','venture'].includes(String(row.scope))||row.channel!=='profile'||typeof row.body!=='string'||!row.body.trim()||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt)))return invalid();ids.add(row.id);return{id:row.id,role:row.role,body:row.body,createdAt:row.createdAt,scope:row.scope,channel:'profile'} as NativeTwinMemory;});
 return{threadKey,entries,hasMore:v.hasMore as boolean,nextCursor:v.nextCursor as string|null,sourceDigest:v.sourceDigest as string};
}
