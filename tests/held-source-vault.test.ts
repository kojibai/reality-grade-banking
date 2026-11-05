import {IDBFactory} from 'fake-indexeddb';
import {afterEach,expect,it,vi} from 'vitest';
import {createHeldSourceView} from '../src/receiz/held-source-view';
import {loadDepositSources,saveDepositSource,saveDeviceIdentity} from '../src/receiz/identity-vault';

// Only browser IndexedDB transport is replaced. Owner hashing, saved custody,
// AES-GCM source encryption/decryption and the complete-reader guard are real.
const sha=async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))).toString('hex');
async function fixture(){
 vi.stubGlobal('indexedDB',new IDBFactory());
 const identity=new TextEncoder().encode('synthetic-private-custody'),bytes=new TextEncoder().encode('exact-held-proof');
 const binding={artifactSha256:await sha(identity)},digest=await sha(bytes);
 await saveDeviceIdentity(identity,'synthetic.bin','test-only-local-phrase',true);
 const view=createHeldSourceView({assertOpen(){},read:()=>loadDepositSources(binding,{requireComplete:true})});
 return{binding,bytes,digest,view,save:()=>saveDepositSource(binding,bytes,'proof.receiz',digest)};
}
async function change(work:(transaction:IDBTransaction)=>void){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('receiz-bank-private-custody',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['identity','sources'],'readwrite');work(tx);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
afterEach(()=>vi.unstubAllGlobals());
it('retains the accepted snapshot after real source decryption fails, then accepts a valid empty removal',async()=>{
 const f=await fixture();await f.save();const held=await f.view.read();expect(held[0].bytes).toEqual(f.bytes);
 const key=`${f.binding.artifactSha256}|${f.digest}`;
 await change(tx=>{const store=tx.objectStore('sources'),read=store.get(key);read.onsuccess=()=>{const row=read.result;new Uint8Array(row.bytes)[0]^=1;store.put(row,key);};});
 f.view.invalidate();await expect(f.view.read()).rejects.toMatchObject({name:'OperationError'});expect(f.view.known()).toBe(held);
 await change(tx=>{tx.objectStore('sources').delete(key);});const removed=await f.view.read();expect(removed).toEqual([]);expect(f.view.known()).toBe(removed);
});
it('accepts a genuinely empty fresh vault and refuses missing or replaced identity custody',async()=>{
 const f=await fixture();expect(await f.view.read()).toEqual([]);await f.save();f.view.invalidate();const held=await f.view.read();
 await change(tx=>{tx.objectStore('identity').delete('current');});f.view.invalidate();await expect(f.view.read()).rejects.toThrow('PROOF_IDENTITY_CLOSED');expect(f.view.known()).toBe(held);
 await saveDeviceIdentity(new TextEncoder().encode('different-custody'),'other.bin','test-only-other-phrase',true);
 await expect(f.view.read()).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');expect(f.view.known()).toBe(held);
});
