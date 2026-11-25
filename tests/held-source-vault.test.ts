import {IDBFactory} from 'fake-indexeddb';
import {afterEach,expect,it,vi} from 'vitest';
import {createHeldSourceView} from '../src/receiz/held-source-view';
import {
 forgetDeviceIdentity,loadDepositSources,loadDeviceIdentity,loadDeferredWalletSends,loadNearbyWalletReceipts,
 saveDepositSource,saveDeviceIdentity,saveDeferredWalletSends,saveNearbyWalletReceipts,
} from '../src/receiz/identity-vault';
import {createReceizIdIdentity,signReceizIdentityLoginProof} from '@receiz/sdk';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {createDeferredWalletSend} from '../src/receiz/wallet-send-deferred';
import {createNearbyWalletReceive} from '../src/receiz/wallet-nearby-receive';
import {signNearbyWalletPayment} from '../src/receiz/wallet-nearby-consent';

// Only browser IndexedDB transport is replaced. Owner hashing, saved custody,
// AES-GCM source encryption/decryption and the complete-reader guard are real.
const sha=async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))).toString('hex');
async function fixture(){
 vi.stubGlobal('indexedDB',new IDBFactory());
 const identity=new TextEncoder().encode('synthetic-private-custody'),bytes=new TextEncoder().encode('exact-held-proof');
 const binding={artifactSha256:await sha(identity)},digest=await sha(bytes);
 await saveDeviceIdentity(identity,'synthetic.bin','test-only-local-phrase',true);
 const view=createHeldSourceView({assertOpen(){},read:()=>loadDepositSources(binding,{requireComplete:true})});
 return{identity,binding,bytes,digest,view,save:()=>saveDepositSource(binding,bytes,'proof.receiz',digest)};
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

it.each(['sender','recipient'] as const)('preserves unresolved nearby payment custody when the %s reimports or removes an Identity Record',async side=>{
 const f=await fixture(),passphrase='synthetic-wallet-signer';
 const {keyFile}=await createReceizIdIdentity({passphrase});
 const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002';
 const sign=(clientNonce:string)=>signNearbyWalletPayment({
  applicationId:BANK_APPLICATION_ID,senderUserId:sender,recipientUserId:recipient,clientNonce,
  amountUsdCents:'100',note:null,kaiUPulse:'1000000',keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,
 },challengeB64Url=>signReceizIdentityLoginProof({keyFile,passphrase,challengeB64Url}));
 const offline=()=>false,lock=async<T>(work:()=>Promise<T>)=>work();
 const read=side==='sender'?loadDeferredWalletSends:loadNearbyWalletReceipts;
 if(side==='sender'){
  const send=createDeferredWalletSend({
   account:()=>({accountUid:sender,availableUsdCents:'1000'}),online:offline,lock,
   store:{read:()=>read(f.binding),write:(next,prior)=>saveDeferredWalletSends(f.binding,next,prior)},
   signNearby:review=>sign(review.clientNonce),deliver:async()=>{throw Error('Network forbidden');},
  });
  const review=await send.prepare({recipient,amountUsdCents:'100'},'Recipient',true);
  await send.approve(review,review.confirmationDigest);
 }else{
  const receive=createNearbyWalletReceive({
   accountUid:()=>recipient,applicationId:BANK_APPLICATION_ID,online:offline,lock,
   store:{read:()=>read(f.binding),write:(next,prior)=>saveNearbyWalletReceipts(f.binding,next,prior)},
   confirm:async()=>{throw Error('Network forbidden');},onRecorded(){},
  });
  await receive.receive(await sign('10000000-0000-4000-8000-000000000003'));
 }
 const original=await read(f.binding);
 expect(original).toHaveLength(1);
 await saveDeviceIdentity(f.identity,'same-record.bin','test-only-local-phrase',true);
 expect(await read(f.binding)).toEqual(original);

 await expect(saveDeviceIdentity(new TextEncoder().encode('older-record'),'older.bin','test-only-local-phrase',true))
  .rejects.toThrow('nearby payments');
 await expect(forgetDeviceIdentity()).rejects.toThrow('nearby payments');
 expect((await loadDeviceIdentity())?.bytes).toEqual(f.identity);
 expect(await read(f.binding)).toEqual(original);
});
