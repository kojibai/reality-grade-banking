import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,rename,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {REGISTRY_MAX_PROOF_BYTES,type RegistryInstitutionState,type RegistryPublication} from '../src/registry/types.js';

/** Admission belongs to registry admission, never to these persistence adapters. */
export interface RegistryStore {
 list():Promise<RegistryInstitutionState[]>;
 append(record:RegistryPublication,original:Uint8Array):Promise<RegistryInstitutionState>;
 original(institutionId:string,artifactSha256:string):Promise<Uint8Array|null>;
}
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(value);
const validDigest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function fail(code='REGISTRY_STORE_CORRUPT'):never{throw Error(code);}
function secureUrl(value:unknown){try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash;}catch{return false;}}
function validRecord(value:unknown):value is RegistryPublication {
 const record=value as RegistryPublication;
 return !!record&&record.schema==='bank.registry.publication.v1'&&validId(record.institutionId)&&typeof record.name==='string'&&record.name.trim().length>0&&record.name.length<=160&&record.scope==='Public integration contract'&&Number.isSafeInteger(record.cases)&&record.cases>0&&record.cases<=100&&validDigest(record.artifactSha256)&&validDigest(record.evidenceSha256)&&validDigest(record.implementationBuildSha256)&&typeof record.holderReceizId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(record.holderReceizId)&&secureUrl(record.officialProofUrl)&&typeof record.acceptedAt==='string'&&record.acceptedAt.length<=32&&Number.isFinite(Date.parse(record.acceptedAt))&&record.url===`/api/bank/registry/original/${record.institutionId}/${record.artifactSha256}`;
}
function parseState(value:unknown,id?:string):RegistryInstitutionState {
 const state=typeof value==='string'?parseJson(value):value as RegistryInstitutionState;
 if(!state||typeof state!=='object')return fail();
 const entry=state as RegistryInstitutionState;
 if(!validId(entry.institutionId)||id&&entry.institutionId!==id||!Number.isSafeInteger(entry.revision)||entry.revision<1||!validRecord(entry.current)||entry.current.institutionId!==entry.institutionId||!Array.isArray(entry.history)||entry.history.some(record=>!validRecord(record)||record.institutionId!==entry.institutionId)||entry.revision!==entry.history.length+1)return fail();
 const hashes=[entry.current,...entry.history].map(record=>record.artifactSha256);
 if(new Set(hashes).size!==hashes.length)return fail();
 return structuredClone(entry);
}
function parseJson(value:string):unknown{try{return JSON.parse(value);}catch{return fail();}}
function input(record:RegistryPublication,original:Uint8Array){
 if(!validRecord(record)||!(original instanceof Uint8Array)||!original.length||original.length>REGISTRY_MAX_PROOF_BYTES||sha(original)!==record.artifactSha256)return fail('REGISTRY_STORE_INVALID');
 return{record:structuredClone(record),bytes:new Uint8Array(original)};
}
function decode(value:unknown,hash:string){
 if(typeof value!=='string'||value.length>Math.ceil(REGISTRY_MAX_PROOF_BYTES/3)*4||!value.length||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))return fail();
 const bytes=new Uint8Array(Buffer.from(value,'base64'));
 if(!bytes.length||sha(bytes)!==hash)return fail();
 return bytes;
}
function coordinates(id:string,hash:string){if(!validId(id)||!validDigest(hash))return fail('REGISTRY_STORE_INVALID');}

type Snapshot={schema:'bank.registry.saved.v1';entry:RegistryInstitutionState;originals:Record<string,string>};
// Development has one local server process. Share its serialization queue even
// when two independently constructed adapters address the same directory.
const fileQueues=new Map<string,Promise<unknown>>();
function exclusive<T>(key:string,action:()=>Promise<T>):Promise<T>{
 const pending=(fileQueues.get(key)??Promise.resolve()).catch(()=>{}).then(action);
 fileQueues.set(key,pending);void pending.finally(()=>{if(fileQueues.get(key)===pending)fileQueues.delete(key);}).catch(()=>{});
 return pending;
}
/** Development only. A deployed/serverless process must use the durable adapter. */
export function createFileRegistryStore(directory:string):RegistryStore {
 const base=resolve(directory);
 async function load(id:string):Promise<Snapshot|null>{
  let text:string;
  try{text=await readFile(join(base,id+'.json'),'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  const saved=parseJson(text) as Snapshot;
  if(!saved||saved.schema!=='bank.registry.saved.v1'||!saved.originals||typeof saved.originals!=='object'||Array.isArray(saved.originals))return fail();
  saved.entry=parseState(saved.entry,id);
  for(const record of [saved.entry.current,...saved.entry.history])decode(saved.originals[record.artifactSha256],record.artifactSha256);
  return saved;
 }
 return{
  async list(){
   let files:string[];try{files=await readdir(base);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error;}
   const ids=files.filter(file=>file.endsWith('.json')).map(file=>file.slice(0,-5));
   if(ids.some(id=>!validId(id)))return fail();
   const entries=await Promise.all(ids.sort().map(async id=>(await load(id))?.entry??fail()));
   return entries;
  },
  async append(record,original){
   const checked=input(record,original);
   return exclusive(base,async()=>{
    const prior=await load(checked.record.institutionId);
    if(prior&&[prior.entry.current,...prior.entry.history].some(value=>value.artifactSha256===checked.record.artifactSha256))return prior.entry;
    const entry:RegistryInstitutionState={institutionId:checked.record.institutionId,revision:(prior?.entry.revision??0)+1,current:checked.record,history:prior?[prior.entry.current,...prior.entry.history]:[]};
    const snapshot:Snapshot={schema:'bank.registry.saved.v1',entry,originals:{...prior?.originals,[checked.record.artifactSha256]:Buffer.from(checked.bytes).toString('base64')}};
    await mkdir(base,{recursive:true});
    const temporary=join(base,`.pending-${randomUUID()}`);
    try{await writeFile(temporary,JSON.stringify(snapshot),{flag:'wx',mode:0o600});await rename(temporary,join(base,checked.record.institutionId+'.json'));}finally{await rm(temporary,{force:true});}
    return structuredClone(entry);
   });
  },
  async original(id,hash){coordinates(id,hash);const saved=await load(id),value=saved?.originals[hash];return value===undefined?null:decode(value,hash);},
 };
}

// The Original is written before its accepted public state in the same atomic
// script. A retry of any retained hash is a no-op, so an old upload cannot move
// the current record backwards. All keys share one Redis cluster hash tag.
const appendScript=`
local existing = redis.call('HGET', KEYS[1], ARGV[1])
local candidate = cjson.decode(ARGV[2])
local history = {}
local revision = 1
if existing then
  local state = cjson.decode(existing)
  local duplicate = state.current.artifactSha256 == candidate.artifactSha256
  for _, record in ipairs(state.history) do
    if record.artifactSha256 == candidate.artifactSha256 then duplicate = true end
  end
  if duplicate then
    if redis.call('HGET', KEYS[2], ARGV[3]) ~= ARGV[4] then return redis.error_reply('REGISTRY_ORIGINAL_CONFLICT') end
    return existing
  end
  table.insert(history, state.current)
  for _, record in ipairs(state.history) do table.insert(history, record) end
  revision = state.revision + 1
end
local priorOriginal = redis.call('HGET', KEYS[2], ARGV[3])
if priorOriginal and priorOriginal ~= ARGV[4] then return redis.error_reply('REGISTRY_ORIGINAL_CONFLICT') end
local historyJson = #history == 0 and '[]' or cjson.encode(history)
local result = '{"institutionId":' .. cjson.encode(ARGV[1]) .. ',"revision":' .. revision .. ',"current":' .. ARGV[2] .. ',"history":' .. historyJson .. '}'
redis.call('HSET', KEYS[2], ARGV[3], ARGV[4])
redis.call('HSET', KEYS[1], ARGV[1], result)
return result`;

export function createRedisRegistryStore({url,token,fetchImpl=fetch}:{url:string;token:string;fetchImpl?:typeof fetch}):RegistryStore {
 let endpoint:URL;try{endpoint=new URL(url);}catch{return fail('REGISTRY_STORE_CONFIG');}
 if(!secureUrl(url)||endpoint.search||!token.trim()||token.length>8192)return fail('REGISTRY_STORE_CONFIG');
 const states='{bank.registry.v1}:states',originals='{bank.registry.v1}:originals';
 async function command(values:(string|number)[]):Promise<unknown>{
  try{
   const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(values),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
   if(!response.ok)return fail('REGISTRY_STORE_UNAVAILABLE');
   const result=await response.json() as {result?:unknown;error?:unknown};
   if(!result||result.error!==undefined||!Object.hasOwn(result,'result'))return fail('REGISTRY_STORE_UNAVAILABLE');
   return result.result;
  }catch{return fail('REGISTRY_STORE_UNAVAILABLE');}
 }
 return{
  async list(){const values=await command(['HVALS',states]);if(!Array.isArray(values))return fail();const entries=values.map(value=>parseState(value));if(new Set(entries.map(entry=>entry.institutionId)).size!==entries.length)return fail();return entries.sort((a,b)=>a.institutionId.localeCompare(b.institutionId));},
  async append(record,original){const checked=input(record,original);return parseState(await command(['EVAL',appendScript,2,states,originals,checked.record.institutionId,JSON.stringify(checked.record),`${checked.record.institutionId}:${checked.record.artifactSha256}`,Buffer.from(checked.bytes).toString('base64')]),checked.record.institutionId);},
  async original(id,hash){coordinates(id,hash);const value=await command(['HGET',originals,`${id}:${hash}`]);return value===null?null:decode(value,hash);},
 };
}

let configuredKey:string|undefined,configured:RegistryStore|null=null;
export function registryStore():RegistryStore|null {
 const url=process.env.REGISTRY_REDIS_REST_URL??'',token=process.env.REGISTRY_REDIS_REST_TOKEN??'';
 const local=(process.env.NODE_ENV==='development'||process.env.NODE_ENV==='test')&&!process.env.VERCEL;
 const key=JSON.stringify([url,token,local]);
 if(key!==configuredKey){
  configuredKey=key;
  // Partial or invalid production configuration is unavailable, never a local
  // fallback. The HTTP layer returns an honest temporary publication refusal.
  try{configured=url&&token?createRedisRegistryStore({url,token}):!url&&!token&&local?createFileRegistryStore('.registry-data'):null;}catch{configured=null;}
 }
 return configured;
}
