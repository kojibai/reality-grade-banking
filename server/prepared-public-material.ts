import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const MAX=32*1024*1024,DIGEST=/^[a-f0-9]{64}$/;
export type PublicMaterialReadContext=Readonly<{root?:string;selection?:string;role?:'root'|'history-predecessor'|'history-transition'}>;
const held=new Map<string,string>(),pending=new Map<string,Promise<string>>();
function requestContext(generation:string,context:PublicMaterialReadContext){if(!DIGEST.test(generation)||context.root!==undefined&&!DIGEST.test(context.root)||context.selection!==undefined&&!DIGEST.test(context.selection)||context.role!==undefined&&!['root','history-predecessor','history-transition'].includes(context.role))throw Error('PUBLIC_MATERIAL_GENERATION_INVALID');const parameters=new URLSearchParams({generation,...(context.root?{root:context.root}:{}),...(context.selection?{selection:context.selection}:{}),...(context.role?{role:context.role}:{})});return{key:JSON.stringify([generation,context.root??null,context.selection??null,context.role??'root']),parameters};}
/** Background representation transport only. The fixed Source route admits
 * only an explicitly public-display descriptor; a checksum grants no rights. */
export async function readPreparedPublicMaterial(generation:string,fetchImpl:typeof fetch=fetch,context:PublicMaterialReadContext={}):Promise<string>{
 const {key,parameters}=requestContext(generation,context);
 const shared=fetchImpl===fetch,inflight=shared?pending.get(key):undefined;if(inflight)return inflight;
 if(shared&&pending.size>=4)throw Error('PUBLIC_MATERIAL_BUSY');
 const cached=shared?held.get(key):undefined;
 const job=(async()=>{
  const response=await fetchImpl('https://receiz.com/api/market/prepared-material?'+parameters,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/gzip',...(cached?{'if-none-match':'"'+generation+'"'}:{})}});
  // Source rechecks current public eligibility before a conditional no-op.
  // A completed local cache never bypasses a later withdrawal.
  if(response.status===304){if(cached)return cached;throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  if(!response.ok||response.headers.get('content-encoding')||!/^application\/gzip(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX){await response.body?.cancel();throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX)throw Error('PUBLIC_MATERIAL_CAPACITY');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const decoded=gunzipSync(Buffer.concat(chunks),{maxOutputLength:MAX});if(createHash('sha256').update(decoded).digest('hex')!==generation)throw Error('PUBLIC_MATERIAL_INTEGRITY');const text=new TextDecoder('utf-8',{fatal:true}).decode(decoded);
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
