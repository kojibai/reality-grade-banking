import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as vault from '../src/receiz/identity-vault';

// Only IndexedDB transport is substituted. Identity artifacts, verifier,
// nonextractable AES keys and private-source encryption are the real paths.
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>;
let a:{bytes:Uint8Array;phrase:string;uid:string;digest:string},b:typeof a;
const hash=async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))).toString('hex');
async function admit(bytes:Uint8Array,phrase:string,r=fixture.runtime){
 const report=await r.verifyReceizArtifact(new File([new Uint8Array(bytes)],'identity.png'));
 const admitted=await r.createReceizArtifactAdmissionEngine()(report,{profile:'identity',identityPassphrase:phrase});
 expect(admitted.verdict).toBe('canonical-identity');return r.readReceizIdentityPublicBinding(admitted);
}
async function identities(work:(store:IDBObjectStore)=>void){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const read=indexedDB.open('receiz-bank-private-custody',3);read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);});
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('identity','readwrite');work(tx.objectStore('identity'));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('aborted'));});}finally{db.close();}
}
async function current(){let value:any;await identities(store=>{const read=store.get('current');read.onsuccess=()=>{value=read.result;};});return value;}
async function keys(){let value:IDBValidKey[]=[];await identities(store=>{const read=store.getAllKeys();read.onsuccess=()=>{value=read.result;};});return value;}
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture();const other=await fixture.otherIdentity();
 a={bytes:new Uint8Array(fixture.identity.bytes),phrase:fixture.identity.phrase,uid:(await admit(new Uint8Array(fixture.identity.bytes),fixture.identity.phrase)).artifactOwnerReceizId,digest:await hash(new Uint8Array(fixture.identity.bytes))};
 b={bytes:other.bytes,phrase:other.phrase,uid:(await admit(other.bytes,other.phrase)).artifactOwnerReceizId,digest:await hash(other.bytes)};
},60000);
beforeEach(async()=>{vi.stubGlobal('indexedDB',new IDBFactory());await vault.saveDeviceIdentity(a.bytes,'original-a.png',a.phrase,true,{bytes:a.bytes,phrase:a.phrase});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const previous=()=>({accountUid:a.uid,artifactSha256:a.digest});

it('cold-reopens A → B → A with the exact complete old custody and decryptable private sources',async()=>{
 await vault.saveDepositSource({artifactSha256:a.digest},a.bytes,'private-proof-a.png',a.digest);
 await vault.saveMessagingConsent({artifactSha256:a.digest},{approved:true,privateCheckpoint:'retained-a'},null);
 await identities(store=>{const read=store.get('current');read.onsuccess=()=>{store.put({...read.result,privateHistoryScopeId:'exact-private-scope-a',cardArchive:[{operationId:'settled-card',iv:new Uint8Array([1,2,3]),bytes:new Uint8Array([4,5,6]).buffer}]},'current');};});
 const old=await current(),selection=await vault.prepareVerifiedEmailAccountSelection(previous(),b.uid);
 expect(selection.saved).toBeNull();await selection.retainRecovered({bytes:b.bytes,filename:'original-b.png',phrase:b.phrase,readConsent:true,protectedTransport:{bytes:b.bytes,phrase:b.phrase}});
 expect((await vault.loadDeviceIdentity())?.bytes).toEqual(b.bytes);expect(await keys()).toHaveLength(2);
 await vault.saveDepositSource({artifactSha256:b.digest},b.bytes,'private-proof-b.png',b.digest);
 vi.resetModules();const cold=await import('../src/receiz/identity-vault'),r=await fixture.reloadRuntime();
 const restore=await cold.prepareVerifiedEmailAccountSelection({accountUid:b.uid,artifactSha256:b.digest},a.uid);
 expect(restore.saved?.bytes).toEqual(a.bytes);expect(restore.saved?.protectedTransport).toEqual({bytes:a.bytes,phrase:a.phrase});
 expect((await admit(restore.saved!.bytes,restore.saved!.phrase,r)).artifactOwnerReceizId).toBe(a.uid);
 await restore.activateRetained();const selected=await cold.loadDeviceIdentity(),row=await current();
 expect(selected?.bytes).toEqual(a.bytes);expect(selected?.phrase).toBe(a.phrase);expect(row.privateHistoryScopeId).toBe(old.privateHistoryScopeId);expect(row.cardArchive).toEqual(old.cardArchive);expect(new Uint8Array(row.bytes)).toEqual(new Uint8Array(old.bytes));expect(new Uint8Array(row.wrappedPhrase)).toEqual(new Uint8Array(old.wrappedPhrase));expect(row.wrappingKey.extractable).toBe(false);
 expect((await cold.loadDepositSources({artifactSha256:a.digest},{requireComplete:true}))[0].bytes).toEqual(a.bytes);
 expect(await cold.loadMessagingConsent({artifactSha256:a.digest})).toEqual({approved:true,privateCheckpoint:'retained-a'});
 const back=await cold.prepareVerifiedEmailAccountSelection(previous(),b.uid);expect((await admit(back.saved!.bytes,back.saved!.phrase,r)).artifactOwnerReceizId).toBe(b.uid);await back.activateRetained();
 expect((await cold.loadDepositSources({artifactSha256:b.digest},{requireComplete:true}))[0].bytes).toEqual(b.bytes);
});

it('an IDB write failure atomically leaves A active without a partial inactive slot',async()=>{
 const selection=await vault.prepareVerifiedEmailAccountSelection(previous(),b.uid),original=IDBObjectStore.prototype.put;
 const failure=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value:any,key?:IDBValidKey){if(key==='current')throw new DOMException('Synthetic storage capacity','QuotaExceededError');return original.call(this,value,key!);});
 await expect(selection.retainRecovered({bytes:b.bytes,filename:'b.png',phrase:b.phrase,readConsent:true})).rejects.toThrow();failure.mockRestore();
 expect((await vault.loadDeviceIdentity())?.bytes).toEqual(a.bytes);expect(await keys()).toEqual(['current']);
});

it('a concurrent A custody revision cannot be overwritten by a prepared selection',async()=>{
 const selection=await vault.prepareVerifiedEmailAccountSelection(previous(),b.uid);
 await vault.saveDeviceIdentity(a.bytes,'newer-a.png',a.phrase,true);
 await expect(selection.retainRecovered({bytes:b.bytes,filename:'b.png',phrase:b.phrase,readConsent:true})).rejects.toThrow(/CHANGED/);
 expect((await vault.loadDeviceIdentity())?.filename).toBe('newer-a.png');expect(await keys()).toEqual(['current']);
});

it('refuses missing current proof and pending value without changing either identity',async()=>{
 await expect(vault.prepareVerifiedEmailAccountSelection({accountUid:a.uid,artifactSha256:'f'.repeat(64)},b.uid)).rejects.toThrow();
 await identities(store=>{const read=store.get('current');read.onsuccess=()=>store.put({...read.result,bankOperation:{operationId:'pending-actual-operation',state:'unknown',key:'retained-operation'}},'current');});
 await expect(vault.prepareVerifiedEmailAccountSelection(previous(),b.uid)).rejects.toThrow('retained transaction');
 expect((await vault.loadDeviceIdentity())?.bytes).toEqual(a.bytes);expect(await keys()).toEqual(['current']);
});

it('forgetting the active identity leaves no duplicate inactive copy of that identity',async()=>{
 const toB=await vault.prepareVerifiedEmailAccountSelection(previous(),b.uid);await toB.retainRecovered({bytes:b.bytes,filename:'b.png',phrase:b.phrase,readConsent:true});
 const toA=await vault.prepareVerifiedEmailAccountSelection({accountUid:b.uid,artifactSha256:b.digest},a.uid);await toA.activateRetained();await vault.forgetDeviceIdentity();
 expect(await vault.loadDeviceIdentity()).toBeNull();expect(await keys()).toEqual(['verified-email-account:'+b.uid]);
});

it('preserves a distinct inactive Identity Record when a second record for the same account was explicitly imported',async()=>{
 const original=await current();
 await identities(store=>store.put(original,'verified-email-account:'+a.uid));
 await vault.saveDeviceIdentity(b.bytes,'temporary-b.png',b.phrase,true);await vault.saveDeviceIdentity(a.bytes,'second-custody-a.png',a.phrase,true);
 const active=await current();expect(Buffer.from(active.bytes).equals(Buffer.from(original.bytes))).toBe(false);
 await expect(vault.prepareVerifiedEmailAccountSelection(previous(),b.uid)).rejects.toThrow('RETAINED_COLLISION');
 expect((await vault.loadDeviceIdentity())?.filename).toBe('second-custody-a.png');let inactive:any;
 await identities(store=>{const read=store.get('verified-email-account:'+a.uid);read.onsuccess=()=>{inactive=read.result;};});expect(new Uint8Array(inactive.bytes)).toEqual(new Uint8Array(original.bytes));expect(new Uint8Array(inactive.wrappedPhrase)).toEqual(new Uint8Array(original.wrappedPhrase));
});
it('does not replace an existing inactive custody slot even when it carries the same artifact bytes',async()=>{
 const original=await current();await identities(store=>store.put({...original,privateHistoryScopeId:'additional-retained-scope'},'verified-email-account:'+a.uid));
 const preparation=vault.prepareVerifiedEmailAccountSelection(previous(),b.uid);
 await expect(preparation).rejects.toThrow('RETAINED_COLLISION');expect((await vault.loadDeviceIdentity())?.bytes).toEqual(a.bytes);
});
