import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const MAX=32*1024*1024,DIGEST=/^[a-f0-9]{64}$/;
const held=new Map<string,string>(),pending=new Map<string,Promise<string>>();
/** Background representation transport only. The fixed Source route admits
 * only an explicitly public-display descriptor; a checksum grants no rights. */
export async function readPreparedPublicMaterial(generation:string,fetchImpl:typeof fetch=fetch):Promise<string>{
 if(!DIGEST.test(generation))throw Error('PUBLIC_MATERIAL_GENERATION_INVALID');
 const shared=fetchImpl===fetch,inflight=shared?pending.get(generation):undefined;if(inflight)return inflight;
 if(shared&&pending.size>=4)throw Error('PUBLIC_MATERIAL_BUSY');
 const cached=shared?held.get(generation):undefined;
 const job=(async()=>{
  const response=await fetchImpl('https://receiz.com/api/market/prepared-material?'+new URLSearchParams({generation}),{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/gzip',...(cached?{'if-none-match':'"'+generation+'"'}:{})}});
  // Source rechecks current public eligibility before a conditional no-op.
  // A completed local cache never bypasses a later withdrawal.
  if(response.status===304){if(cached)return cached;throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  if(!response.ok||response.headers.get('content-encoding')||!/^application\/gzip(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX){await response.body?.cancel();throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX)throw Error('PUBLIC_MATERIAL_CAPACITY');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const decoded=gunzipSync(Buffer.concat(chunks),{maxOutputLength:MAX});if(createHash('sha256').update(decoded).digest('hex')!==generation)throw Error('PUBLIC_MATERIAL_INTEGRITY');const text=new TextDecoder('utf-8',{fatal:true}).decode(decoded);
  if(shared){held.set(generation,text);while(held.size>2)held.delete(held.keys().next().value!);}return text;
 })();
 if(shared){pending.set(generation,job);void job.finally(()=>{if(pending.get(generation)===job)pending.delete(generation);}).catch(()=>{});}
 return job;
}

const checking=new Map<string,Promise<void>>();
/** Recheck permission for bytes already parsed and held by this exact reader.
 * Source qualifies current role/reachability before304. No historical body is
 * requested again and its checksum never substitutes for that qualification. */
export async function recheckPreparedPublicMaterial(generation:string,fetchImpl:typeof fetch=fetch):Promise<void>{
 if(!DIGEST.test(generation))throw Error('PUBLIC_MATERIAL_GENERATION_INVALID');
 const shared=fetchImpl===fetch,held=shared?checking.get(generation):undefined;if(held)return held;
 const job=(async()=>{const response=await fetchImpl('https://receiz.com/api/market/prepared-material?'+new URLSearchParams({generation}),{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{accept:'application/gzip','if-none-match':'"'+generation+'"'}});await response.body?.cancel();if(response.status!==304)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');})();
 if(shared){checking.set(generation,job);void job.finally(()=>{if(checking.get(generation)===job)checking.delete(generation);}).catch(()=>{});}return job;
}
