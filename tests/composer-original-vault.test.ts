import {afterEach,expect,it,vi} from 'vitest';
import * as vault from '../src/receiz/identity-vault';
import {BANK_STORAGE_APPLICATION_ID} from '../src/receiz/config';

type Row={key:string;iv:Uint8Array;bytes:ArrayBuffer};
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
async function custody(){
 const identity=new TextEncoder().encode('synthetic immutable byte custody owner'),key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const artifactIv=crypto.getRandomValues(new Uint8Array(12)),saved={wrappingKey:key,artifactIv,iv:crypto.getRandomValues(new Uint8Array(12)),bytes:await crypto.subtle.encrypt({name:'AES-GCM',iv:artifactIv,additionalData:new TextEncoder().encode('receiz.bank.private-identity-source.v1')},key,identity)};
 const rows=new Map<string,unknown>([['identity:current',saved]]),hooks={beforeWrite:undefined as (()=>void)|undefined};
 const db={close(){},transaction(_stores:string|string[],mode?:string){
  if(mode==='readwrite')hooks.beforeWrite?.();
  let pending=0,finished=false;const writes=new Map<string,unknown>();
  const tx:{oncomplete?:()=>void;onabort?:()=>void;error:null;abort():void;objectStore(name:string):unknown}={error:null,
   abort(){finished=true;queueMicrotask(()=>tx.onabort?.());},objectStore:name=>({
    get(address:string){pending++;const request:{result?:unknown;onsuccess?:()=>void}={};queueMicrotask(()=>{
     if(!finished){request.result=rows.get(`${name}:${address}`);request.onsuccess?.();}pending--;complete();
    });return request;},
    put(value:unknown,address:string){writes.set(`${name}:${address}`,value);complete();},
   })};
  function complete(){queueMicrotask(()=>{if(!finished&&pending===0){finished=true;for(const [address,value]of writes)rows.set(address,value);tx.oncomplete?.();}});}
  return tx;
 }};
 vi.stubGlobal('indexedDB',{open(){const request:{result:unknown;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
 return {rows,hooks,key,saved,binding:{artifactSha256:await hash(identity)}};
}
afterEach(()=>vi.unstubAllGlobals());
const composer=()=>vault as typeof vault&{
 saveComposerOriginalBlob(binding:{artifactSha256:string},bytes:Uint8Array):Promise<string>;
 loadComposerOriginalBlob(binding:{artifactSha256:string},digest:string):Promise<Uint8Array>;
};
const address=(family:string,identity:string,digest:string)=>`operations:${family}|${BANK_STORAGE_APPLICATION_ID}|${identity}|${digest}`;

it('retains exact composer bytes encrypted and independently from existing Note blobs',async()=>{
 const f=await custody(),api=composer(),bytes=new TextEncoder().encode('PRIVATE_COMPOSER_ORIGINAL_EXACT_BYTES_'.repeat(8));
 expect(typeof api.saveComposerOriginalBlob).toBe('function');
 const digest=await api.saveComposerOriginalBlob(f.binding,bytes),key=address('composer-original-source',f.binding.artifactSha256,digest);
 expect(digest).toBe(await hash(bytes));expect(await api.loadComposerOriginalBlob(f.binding,digest)).toEqual(bytes);
 await expect(vault.loadOfflineNoteBlob(f.binding,digest)).rejects.toThrow('BANK_NOTE_EXACT_SOURCE_UNAVAILABLE');
 const row=f.rows.get(key) as Row;expect(row.key).toBe(key.slice('operations:'.length));expect(row.bytes.byteLength).toBe(bytes.length+16);
 expect(new TextDecoder().decode(row.bytes)).not.toContain('PRIVATE_COMPOSER_ORIGINAL');
 expect([...f.rows.keys()].filter(value=>value.startsWith('operations:'))).toEqual([key]);
 const encrypted=row.bytes.slice(0),iv=row.iv.slice();expect(await api.saveComposerOriginalBlob(f.binding,bytes)).toBe(digest);
 expect((f.rows.get(key) as Row).bytes).toEqual(encrypted);expect((f.rows.get(key) as Row).iv).toEqual(iv);
 const noteDigest=await vault.saveOfflineNoteBlob(f.binding,bytes),noteKey=address('offline-note-source',f.binding.artifactSha256,digest);
 expect(noteDigest).toBe(digest);expect(await vault.loadOfflineNoteBlob(f.binding,digest)).toEqual(bytes);
 const note=f.rows.get(noteKey) as Row;
 expect(new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(note.iv),additionalData:new TextEncoder().encode(noteKey.slice('operations:'.length))},f.key,note.bytes))).toEqual(bytes);
 f.rows.set(key,{...note,key:row.key});await expect(api.loadComposerOriginalBlob(f.binding,digest)).rejects.toMatchObject({name:'OperationError'});
 expect(await vault.loadOfflineNoteBlob(f.binding,digest)).toEqual(bytes);
});
it('refuses foreign identity, wrong digest and tampered composer ciphertext without rewriting custody',async()=>{
 const f=await custody(),api=composer(),bytes=new TextEncoder().encode('private composer block'),digest=await api.saveComposerOriginalBlob(f.binding,bytes);
 await expect(api.loadComposerOriginalBlob({artifactSha256:'f'.repeat(64)},digest)).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
 await expect(api.saveComposerOriginalBlob({artifactSha256:'f'.repeat(64)},bytes)).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
 await expect(api.loadComposerOriginalBlob(f.binding,'not/a/digest')).rejects.toThrow('BANK_NOTE_SOURCE_REFERENCE_INVALID');
 await expect(api.loadComposerOriginalBlob(f.binding,'e'.repeat(64))).rejects.toThrow('BANK_NOTE_EXACT_SOURCE_UNAVAILABLE');
 const key=address('composer-original-source',f.binding.artifactSha256,digest),row=f.rows.get(key) as Row;new Uint8Array(row.bytes)[0]^=1;
 const altered=row.bytes.slice(0);await expect(api.loadComposerOriginalBlob(f.binding,digest)).rejects.toMatchObject({name:'OperationError'});
 expect((f.rows.get(key) as Row).bytes).toEqual(altered);
 const wrong='e'.repeat(64),wrongKey=address('composer-original-source',f.binding.artifactSha256,wrong),iv=crypto.getRandomValues(new Uint8Array(12));
 f.rows.set(wrongKey,{key:wrongKey.slice('operations:'.length),iv,bytes:await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(wrongKey.slice('operations:'.length))},f.key,bytes)});
 await expect(api.loadComposerOriginalBlob(f.binding,wrong)).rejects.toThrow('BANK_NOTE_EXACT_SOURCE_MISMATCH');
});
it('uses the existing identity transaction guard and unchanged per-block capacity',async()=>{
 const f=await custody(),api=composer(),bytes=new TextEncoder().encode('private immutable block');
 for(const save of [api.saveComposerOriginalBlob,vault.saveOfflineNoteBlob]){
  await expect(save(f.binding,new Uint8Array())).rejects.toThrow('BANK_NOTE_DEVICE_CAPACITY');
  await expect(save(f.binding,new Uint8Array(32*1024*1024+1))).rejects.toThrow('BANK_NOTE_DEVICE_CAPACITY');
 }
 f.hooks.beforeWrite=()=>{f.rows.set('identity:current',{...f.saved,bytes:new Uint8Array([9,8,7]).buffer});};
 await expect(api.saveComposerOriginalBlob(f.binding,bytes)).rejects.toThrow('BANK_NOTE_IDENTITY_CHANGED');
 expect([...f.rows.keys()].filter(value=>value.startsWith('operations:'))).toEqual([]);
 f.rows.delete('identity:current');await expect(api.loadComposerOriginalBlob(f.binding,'a'.repeat(64))).rejects.toThrow('BANK_NOTE_IDENTITY_UNAVAILABLE');
});
