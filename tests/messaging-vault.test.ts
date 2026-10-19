import {afterEach,expect,it,vi} from 'vitest';
import {loadMessagingDisplay,saveMessagingDisplay} from '../src/receiz/identity-vault';
import {openMessagingRetention,type MessagingDisplay} from '../src/receiz/messaging-retention';
import {BANK_STORAGE_APPLICATION_ID} from '../src/receiz/config';
// Real AES-GCM and binding validation; only the IndexedDB transport is in memory.
async function vault(){
 const source=new TextEncoder().encode('synthetic private inbox owner'),wrappingKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const artifactIv=crypto.getRandomValues(new Uint8Array(12)),bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv:artifactIv,additionalData:new TextEncoder().encode('receiz.bank.private-identity-source.v1')},wrappingKey,source);
 let identity:unknown={bytes,artifactIv,iv:crypto.getRandomValues(new Uint8Array(12)),wrappingKey};const rows=new Map<string,unknown>();
 const db={close(){},transaction(_stores:unknown,mode?:string){
  const tx:{oncomplete?:()=>void;onabort?:()=>void;objectStore:(name:string)=>unknown;abort:()=>void}={objectStore:name=>({
   get(key:string){const request:{result:unknown;onsuccess?:()=>void}={result:name==='identity'?identity:rows.get(key)};queueMicrotask(()=>{request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;},
   put(value:unknown,key:string){if(mode!=='readwrite')throw Error('read-only');rows.set(key,value);},
  }),abort(){queueMicrotask(()=>tx.onabort?.());}};return tx;
 }};
 vi.stubGlobal('indexedDB',{open(){const request:{result:unknown;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
 return{binding:{artifactSha256:digest},wrappingKey,rows,key:`messaging-display-v1|${BANK_STORAGE_APPLICATION_ID}|${digest}`,removeIdentity(){identity=undefined;}};
}
afterEach(()=>vi.unstubAllGlobals());
const display={schema:'bankeiz.messaging-display.v1' as const,accountUid:'owner',inbox:[],pages:[]};
it('reopens the encrypted display after a new retention session without plaintext storage or network',async()=>{
 const f=await vault();const storage={load:()=>loadMessagingDisplay(f.binding),save:(value:MessagingDisplay,expected:unknown)=>saveMessagingDisplay(f.binding,value,expected),isOpen:()=>true};
 const first=await openMessagingRetention(storage);first.capture(display);await first.flush();
 const row=f.rows.get(f.key) as {iv:Uint8Array;bytes:ArrayBuffer};expect(row.bytes).toBeInstanceOf(ArrayBuffer);expect(new TextDecoder().decode(row.bytes)).not.toContain('owner');expect(f.wrappingKey.extractable).toBe(false);
 expect((await openMessagingRetention(storage)).known()).toEqual(display);
 await expect(loadMessagingDisplay({artifactSha256:'f'.repeat(64)})).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
 await expect(crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row.iv),additionalData:new TextEncoder().encode(f.key+'foreign')},f.wrappingKey,row.bytes)).rejects.toThrow();
});
it('preserves encrypted rows on stale revisions, corruption and removed identity',async()=>{
 const f=await vault();await saveMessagingDisplay(f.binding,display,null);const row=f.rows.get(f.key) as {bytes:ArrayBuffer};
 await expect(saveMessagingDisplay(f.binding,{...display,accountUid:'other'},null)).rejects.toThrow('BANK_NOTE_INTENT_CHANGED');expect(f.rows.get(f.key)).toBe(row);
 new Uint8Array(row.bytes)[0]^=1;const held=row.bytes.slice(0);await expect(loadMessagingDisplay(f.binding)).rejects.toThrow();await expect(saveMessagingDisplay(f.binding,display,null)).rejects.toThrow();expect(row.bytes).toEqual(held);
 f.removeIdentity();await expect(saveMessagingDisplay(f.binding,display,null)).rejects.toThrow('BANK_NOTE_IDENTITY_UNAVAILABLE');expect(f.rows.get(f.key)).toBe(row);
});
