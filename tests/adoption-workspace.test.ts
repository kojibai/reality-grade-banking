import {expect,it,vi} from 'vitest';
import {createReceivingWork,openReceivingWork,type ReceivingDraft,type ReceivingWorkState} from '../src/adoption/workspace';
import {IDBFactory} from 'fake-indexeddb';

const binding={artifactSha256:'a'.repeat(64)};
const draft=(id='draft-1'):ReceivingDraft=>({id,recipient:'supplier@example.com',recipientUserId:'recipient-id',recipientUsername:'supplier',recipientName:'Supplier',amount:'4800.00',purpose:'Invoice #1048',message:'Here is how to receive the money.',includeContext:false,status:'draft',followUp:false});
function storage(initial:unknown=null){
 let held=structuredClone(initial);const writes:ReceivingWorkState[]=[];
 return{load:vi.fn(async()=>structuredClone(held)),save:vi.fn(async(next:ReceivingWorkState,expected:unknown)=>{if(JSON.stringify(held)!==JSON.stringify(expected))throw Error('BANK_NOTE_INTENT_CHANGED');held=structuredClone(next);writes.push(structuredClone(next));}),held:()=>structuredClone(held),writes};
}
it('loads only on explicit open, holds private context and reopens it without any network access',async()=>{
 const store=storage(),fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No network'));
 try{expect(store.load).not.toHaveBeenCalled();const work=await createReceivingWork(binding,store);expect(work.known()).toEqual([]);
  await work.save(draft());expect(work.known()).toEqual([draft()]);expect(store.load).toHaveBeenCalledOnce();
  work.known()[0].recipient='changed';expect(work.known()[0].recipient).toBe('supplier@example.com');
  const reopened=await createReceivingWork(binding,store);expect(reopened.known()).toEqual([draft()]);expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('captures inputs before yielding, serializes local edits and avoids unchanged writes or redundant loads',async()=>{
 const store=storage(),work=await createReceivingWork(binding,store),first=draft();
 const saving=work.save(first);first.recipient='changed';await saving;
 await Promise.all([work.save({...draft(),status:'link-copied'}),work.save(draft('draft-2'))]);
 expect(work.known()).toMatchObject([{id:'draft-1',recipient:'supplier@example.com',status:'link-copied'},{id:'draft-2'}]);
 const count=store.writes.length;await work.save(draft('draft-2'));await work.remove('absent');expect(store.writes).toHaveLength(count);expect(store.load).toHaveBeenCalledOnce();
 await work.remove('draft-1');expect(work.known()).toEqual([draft('draft-2')]);
});
it('fails stale writers instead of overwriting a newer encrypted checkpoint',async()=>{
 const store=storage(),first=await createReceivingWork(binding,store),stale=await createReceivingWork(binding,store);
 await first.save(draft());await expect(stale.save(draft('other'))).rejects.toThrow('BANK_NOTE_INTENT_CHANGED');
 expect(stale.known()).toEqual([]);expect((await createReceivingWork(binding,store)).known()).toEqual([draft()]);
});
it('keeps the last durable draft when saving fails and continues later explicit edits',async()=>{
 const store=storage(),work=await createReceivingWork(binding,store);await work.save(draft());
 store.save.mockRejectedValueOnce(Error('DEVICE_FULL'));
 await expect(work.save({...draft(),status:'closed'})).rejects.toThrow('DEVICE_FULL');expect(work.known()[0].status).toBe('draft');
 await work.save({...draft(),status:'closed'});expect(work.known()[0].status).toBe('closed');
});
it('keeps reported readiness distinct from actual payment, delivery and receiving capability',async()=>{
 const store=storage(),work=await createReceivingWork(binding,store);
 for(const status of ['draft','link-copied','sharing-initiated','closed','declined'] as const)await work.save({...draft(),status,reportedResponse:'ready',followUp:true});
 expect(work.known()[0]).toMatchObject({status:'declined',reportedResponse:'ready',followUp:true});
 for(const changed of [{status:'delivered'},{status:'route-available'},{verified:true},{paymentSent:true},{reportedResponse:'verified-ready'},{reportedResponse:{toString:()=> 'ready'}},{followUp:'yes'}])await expect(work.save({...draft(),...changed} as ReceivingDraft)).rejects.toThrow('RECEIVING_WORK_INVALID');
 expect(store.writes).toHaveLength(5);
});
it('rejects foreign, malformed or oversized saved state without rewriting it',async()=>{
 const good={schema:'bankeiz.receiving-work.v1',identityDigest:binding.artifactSha256,revision:1,drafts:[draft()]};
 for(const changed of [{identityDigest:'b'.repeat(64)},{schema:'other'},{revision:-1},{drafts:[draft(),draft()]},{drafts:new Array(1)},{drafts:[{...draft(),accepted:true}]},{drafts:Array.from({length:101},(_,i)=>draft('d'+i))}]){
  const store=storage({...good,...changed});await expect(createReceivingWork(binding,store)).rejects.toThrow();expect(store.save).not.toHaveBeenCalled();
 }
});
it('uses the actual encrypted vault and exact identity CAS without plaintext storage or transport',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No network'));
 try{
  const source=new TextEncoder().encode('synthetic-private-receiving-work-owner'),wrappingKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(v=>v.toString(16).padStart(2,'0')).join(''),artifactIv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv:artifactIv,additionalData:new TextEncoder().encode('receiz.bank.private-identity-source.v1')},wrappingKey,source);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-bank-private-custody',3);request.onupgradeneeded=()=>{for(const name of ['identity','sources','operations'])request.result.createObjectStore(name);};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('identity','readwrite');tx.objectStore('identity').put({bytes,artifactIv,iv:crypto.getRandomValues(new Uint8Array(12)),wrappingKey},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  const owner={artifactSha256:digest},work=await openReceivingWork(owner),stale=await openReceivingWork(owner);await work.save(draft());
  expect((await openReceivingWork(owner)).known()).toEqual([draft()]);await expect(stale.save(draft('stale'))).rejects.toThrow('BANK_NOTE_INTENT_CHANGED');
  await expect(openReceivingWork({artifactSha256:'f'.repeat(64)})).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
  const rows=await new Promise<Array<{key:string;iv:Uint8Array;bytes:ArrayBuffer}>>((resolve,reject)=>{const request=db.transaction('operations').objectStore('operations').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  expect(rows).toHaveLength(1);expect(rows[0].key).toContain('receiving-work-v1|');expect(new TextDecoder().decode(rows[0].bytes)).not.toContain('supplier@example.com');expect(wrappingKey.extractable).toBe(false);
  await expect(crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(rows[0].iv),additionalData:new TextEncoder().encode(rows[0].key+'foreign')},wrappingKey,rows[0].bytes)).rejects.toThrow();
  db.close();expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();vi.unstubAllGlobals();}
});
it('bounds new drafts without evicting existing work and refuses malformed drafts before writes',async()=>{
 const store=storage(),work=await createReceivingWork(binding,store);
 for(let i=0;i<100;i++)await work.save(draft('d'+i));
 await expect(work.save(draft('overflow'))).rejects.toThrow('RECEIVING_WORK_CAPACITY');expect(work.known()).toHaveLength(100);
 for(const changed of [{message:'x'.repeat(4001)},{recipient:'x'.repeat(255)},{includeContext:undefined},{institution:{name:'Bank',url:'https://foreign.example'}}])await expect(work.save({...draft(),...changed} as ReceivingDraft)).rejects.toThrow('RECEIVING_WORK_INVALID');
 expect(store.writes).toHaveLength(100);
});
