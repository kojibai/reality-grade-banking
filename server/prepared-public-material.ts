import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {AsyncLocalStorage} from 'node:async_hooks';
const MAX=32*1024*1024,DIGEST=/^[a-f0-9]{64}$/;
export type PublicMaterialReadContext=Readonly<{root?:string;selection?:string;role?:'root'|'history-predecessor'|'history-transition'}>;
const held=new Map<string,string>(),pending=new Map<string,Promise<string>>();
// The API entry and separately compiled renderer share this request scope.
// They must not create independent caches across the dynamic module boundary.
const materialScopeKey=Symbol.for('bankeiz.public-material.read-scope.v1');
const runtime=globalThis as typeof globalThis&{[materialScopeKey]?:AsyncLocalStorage<Map<string,Map<string,string>>>};
const scope=runtime[materialScopeKey]??=new AsyncLocalStorage<Map<string,Map<string,string>>>();
/** One publication render reuses its already-qualified immutable pack bytes.
 * The enclosing reader still checks the selected root before/after rendering. */
export const withPreparedPublicMaterialScope=<T>(run:()=>Promise<T>)=>scope.run(new Map(),run);
const scopeKey=(root:string,context:PublicMaterialReadContext)=>JSON.stringify([root,context.selection??null,context.role??'root']);
function requestContext(generation:string,context:PublicMaterialReadContext){if(!DIGEST.test(generation)||context.root!==undefined&&!DIGEST.test(context.root)||context.selection!==undefined&&!DIGEST.test(context.selection)||context.role!==undefined&&!['root','history-predecessor','history-transition'].includes(context.role))throw Error('PUBLIC_MATERIAL_GENERATION_INVALID');const parameters=new URLSearchParams({generation,...(context.root?{root:context.root}:{}),...(context.selection?{selection:context.selection}:{}),...(context.role?{role:context.role}:{})});return{key:JSON.stringify([generation,context.root??null,context.selection??null,context.role??'root']),parameters};}
/** Background representation transport only. The fixed Source route admits
 * only an explicitly public-display descriptor; a checksum grants no rights. */
export async function readPreparedPublicMaterial(generation:string,fetchImpl:typeof fetch=fetch,context:PublicMaterialReadContext={}):Promise<string>{
 const {key,parameters}=requestContext(generation,context);
 const local=scope.getStore(),root=context.root??generation,localKey=scopeKey(root,context),part=context.root&&generation!==context.root?local?.get(localKey)?.get(generation):undefined;
 if(part!==undefined)return part;
 if(local)parameters.set('packed','1');
 const shared=fetchImpl===fetch,inflight=shared?pending.get(key):undefined;if(inflight)return inflight;
 if(shared&&pending.size>=4)throw Error('PUBLIC_MATERIAL_BUSY');
 const cached=shared&&!local?held.get(key):undefined;
 const job=(async()=>{
  const response=await fetchImpl('https://receiz.com/api/market/prepared-material?'+parameters,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/gzip',...(cached?{'if-none-match':'"'+generation+'"'}:{})}});
  // Source rechecks current public eligibility before a conditional no-op.
  // A completed local cache never bypasses a later withdrawal.
  if(response.status===304){if(cached)return cached;throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  if(!response.ok||response.headers.get('content-encoding')||!/^application\/gzip(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX){await response.body?.cancel();throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX)throw Error('PUBLIC_MATERIAL_CAPACITY');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const decoded=gunzipSync(Buffer.concat(chunks),{maxOutputLength:MAX});let text=new TextDecoder('utf-8',{fatal:true}).decode(decoded);
  if(local&&text.startsWith('{"schema":"receiz.public-display.selected-pack.v1"')){
   const pack=JSON.parse(text);if(pack.generation!==generation||pack.root!==root||!pack.parts||typeof pack.parts!=='object'||Array.isArray(pack.parts))throw Error('PUBLIC_MATERIAL_INTEGRITY');
   const parts=new Map<string,string>();for(const [id,value]of Object.entries(pack.parts)){if(!DIGEST.test(id)||typeof value!=='string'||createHash('sha256').update(value).digest('hex')!==id)throw Error('PUBLIC_MATERIAL_INTEGRITY');parts.set(id,value);}
   const selected=parts.get(generation);if(selected===undefined)throw Error('PUBLIC_MATERIAL_INTEGRITY');text=selected;
   let selectedParts=local.get(localKey);if(!selectedParts){selectedParts=new Map();local.set(localKey,selectedParts);}for(const [id,value]of parts)selectedParts.set(id,value);
  }
  if(createHash('sha256').update(text).digest('hex')!==generation)throw Error('PUBLIC_MATERIAL_INTEGRITY');
  if(shared){held.set(key,text);while(held.size>2)held.delete(held.keys().next().value!);}return text;
 })();
 if(shared){pending.set(key,job);void job.finally(()=>{if(pending.get(key)===job)pending.delete(key);}).catch(()=>{});}
 return job;
}

const checking=new Map<string,Promise<void>>();
/** Recheck permission for bytes already parsed and held by this exact reader.
 * Source qualifies current role/reachability before304. No historical body is
 * requested again and its checksum never substitutes for that qualification. */
export async function recheckPreparedPublicMaterial(generation:string,fetchImpl:typeof fetch=fetch,context:PublicMaterialReadContext={}):Promise<void>{
 const {key,parameters}=requestContext(generation,context);
 const shared=fetchImpl===fetch,held=shared?checking.get(key):undefined;if(held)return held;
 const job=(async()=>{const response=await fetchImpl('https://receiz.com/api/market/prepared-material?'+parameters,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/gzip','if-none-match':'"'+generation+'"'}});await response.body?.cancel();if(response.status!==304)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');})();
 if(shared){checking.set(key,job);void job.finally(()=>{if(checking.get(key)===job)checking.delete(key);}).catch(()=>{});}return job;
}

/** Parsed immutable parts may be shared only behind the exact root/role check.
 * A permitted historical request cannot satisfy an ordinary render request. */
const selections=new Map<string,Readonly<{read:(generation:string)=>Promise<string>;recheck:(generation:string)=>Promise<void>}>>();
export function preparedPublicMaterialSelection(context:PublicMaterialReadContext){const key=JSON.stringify([context.root??null,context.selection??null,context.role??'root']);let held=selections.get(key);if(!held){held={read:generation=>readPreparedPublicMaterial(generation,fetch,context),recheck:generation=>recheckPreparedPublicMaterial(generation,fetch,context)};selections.set(key,held);while(selections.size>8)selections.delete(selections.keys().next().value!);}return held;}
