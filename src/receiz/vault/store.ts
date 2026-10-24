import {readEncryptedVault,type EncryptedVault} from './encryption';
import {vaultCanonical,vaultDigest} from './encoding';

export type LockedVaultSummary={id:string;ownerKeyId:string;name:string;digest:string;savedAt:string};
export type StoredVault={summary:LockedVaultSummary;envelope:EncryptedVault};
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function owner(value:string){if(typeof value!=='string'||!value.length||value.length>160||value.includes('|'))throw Error('VAULT_OWNER_INVALID');}
function id(value:string){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))throw Error('VAULT_ID_INVALID');}
function scope(key:string,identifier:string){owner(key);id(identifier);return key+'|'+identifier;}
function summary(input:unknown,key:string):LockedVaultSummary{
 const v=input as LockedVaultSummary;
 if(!v||v.ownerKeyId!==key||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!hash(v.digest)||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))throw Error('VAULT_STORAGE_INVALID');
 scope(key,v.id);return{...v};
}
/** Constructing a store does no work. The separate small index is routing and
 * presentation metadata only; listing locked Vaults never reads their payloads.
 * No plaintext custody key or PRF secret is accepted by this interface. */
export function createVaultStore(databaseName='bank-private-vaults-v1'){
 async function database():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
   let failed=false;const request=indexedDB.open(databaseName,1);
   request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('envelopes');db.createObjectStore('blocks');db.createObjectStore('summaries').createIndex('owner','ownerKeyId');};
   request.onsuccess=()=>{if(failed)request.result.close();else resolve(request.result);};
   request.onerror=()=>{failed=true;reject(request.error??Error('VAULT_STORAGE_UNAVAILABLE'));};
   request.onblocked=()=>{failed=true;reject(Error('VAULT_STORAGE_BUSY'));};
  });
 }
 async function get<T>(store:string,key:IDBValidKey):Promise<T|undefined>{const db=await database();try{return await new Promise<T|undefined>((resolve,reject)=>{const request=db.transaction(store).objectStore(store).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}}
 const digest=(envelope:EncryptedVault)=>vaultDigest(new TextEncoder().encode(vaultCanonical(envelope)));
 function admitted(value:unknown,key:string,identifier?:string){const envelope=readEncryptedVault(value);if(envelope.header.purpose!=='vault-private'||envelope.header.owner.keyId!==key||identifier!==undefined&&envelope.header.id!==identifier)throw Error('VAULT_OWNER_MISMATCH');return envelope;}
 return{
  async list(ownerKeyId:string):Promise<LockedVaultSummary[]>{
   owner(ownerKeyId);const db=await database();
   try{return await new Promise((resolve,reject)=>{const read=db.transaction('summaries').objectStore('summaries').index('owner').getAll(ownerKeyId);read.onsuccess=()=>{try{resolve((read.result as unknown[]).map(v=>summary(v,ownerKeyId)).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id)));}catch(error){reject(error);}};read.onerror=()=>reject(read.error);});}finally{db.close();}
  },
  async load(ownerKeyId:string,identifier:string):Promise<StoredVault|null>{
   const key=scope(ownerKeyId,identifier),db=await database();let result:{row?:EncryptedVault;index?:LockedVaultSummary};
   try{result=await new Promise((resolve,reject)=>{const tx=db.transaction(['envelopes','summaries']),a=tx.objectStore('envelopes').get(key),b=tx.objectStore('summaries').get(key);tx.oncomplete=()=>resolve({row:a.result,index:b.result});tx.onabort=tx.onerror=()=>reject(tx.error??Error('VAULT_STORAGE_UNAVAILABLE'));});}finally{db.close();}
   if(!result.row&&!result.index)return null;if(!result.row||!result.index)throw Error('VAULT_STORAGE_INVALID');
   const envelope=admitted(result.row,ownerKeyId,identifier),index=summary(result.index,ownerKeyId);
   if(await digest(envelope)!==index.digest)throw Error('VAULT_STORAGE_INVALID');return{summary:index,envelope};
  },
  async save(ownerKeyId:string,name:string,value:EncryptedVault,expectedDigest:string|null):Promise<LockedVaultSummary>{
   const envelope=admitted(value,ownerKeyId),key=scope(ownerKeyId,envelope.header.id);
   if(typeof name!=='string'||!name.trim()||name.trim().length>80||/[\u0000-\u001f\u007f]/.test(name))throw Error('VAULT_NAME_INVALID');
   if(expectedDigest!==null&&!hash(expectedDigest))throw Error('VAULT_STORAGE_CONFLICT');
   const next:LockedVaultSummary={id:envelope.header.id,ownerKeyId,name:name.trim(),digest:await digest(envelope),savedAt:new Date().toISOString()},db=await database();
   try{await new Promise<void>((resolve,reject)=>{
    let conflict=false,remaining=2;const tx=db.transaction(['envelopes','summaries'],'readwrite',{durability:'strict'}),indices=tx.objectStore('summaries'),objects=tx.objectStore('envelopes'),read=indices.get(key),existing=objects.get(key);
    read.onsuccess=existing.onsuccess=()=>{if(--remaining)return;const current=read.result as LockedVaultSummary|undefined;if((current?.digest??null)!==expectedDigest||Boolean(current)!==Boolean(existing.result)){conflict=true;tx.abort();return;}indices.put(next,key);objects.put(envelope,key);};
    tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error(conflict?'VAULT_STORAGE_CONFLICT':'VAULT_STORAGE_UNAVAILABLE'));
   });}finally{db.close();}return next;
  },
  async retainBlock(ownerKeyId:string,identifier:string,value:EncryptedVault):Promise<string>{
   const envelope=admitted(value,ownerKeyId,identifier),prefix=scope(ownerKeyId,identifier),ref=await digest(envelope),db=await database();
   try{await new Promise<void>((resolve,reject)=>{let conflict=false;const tx=db.transaction('blocks','readwrite',{durability:'strict'}),store=tx.objectStore('blocks'),read=store.get(prefix+'|'+ref);read.onsuccess=()=>{if(read.result===undefined)store.add(envelope,prefix+'|'+ref);else if(vaultCanonical(read.result)!==vaultCanonical(envelope)){conflict=true;tx.abort();}};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(Error(conflict?'VAULT_SOURCE_CHANGED':'VAULT_STORAGE_UNAVAILABLE'));});}finally{db.close();}return ref;
  },
  async restoreBlock(ownerKeyId:string,identifier:string,ref:string):Promise<EncryptedVault>{
   const prefix=scope(ownerKeyId,identifier);if(!hash(ref))throw Error('VAULT_SOURCE_REQUIRED');
   const value=await get<EncryptedVault>('blocks',prefix+'|'+ref);if(!value)throw Error('VAULT_SOURCE_REQUIRED');
   const envelope=admitted(value,ownerKeyId,identifier);if(await digest(envelope)!==ref)throw Error('VAULT_SOURCE_CHANGED');return envelope;
  },
 };
}
export type VaultStore=ReturnType<typeof createVaultStore>;
