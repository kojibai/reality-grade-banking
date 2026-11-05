import {createRecordProofExports,type RecordProofExportInput,type RecordProofExportCheckpoint} from './record-proof-export';
import type {createReceizOfflineSealer} from '@receiz/sdk/offline';
import type {ReceizArtifactVerificationResult} from '@receiz/sdk';

/** The existing public Ledger document signer, shared by public export captures.
 * No identity, account, financial mutation or ownership admission is opened. */
let publicSealer:Promise<ReturnType<typeof createReceizOfflineSealer>>|undefined;
export async function sealPublicDocument(input:{bytes:Uint8Array;filename:string;mimeType:string}){
 publicSealer??=(async()=>{
  const [{createReceizOfflineSealer,createReceizIndexedDbSealStore},{loadBankProofResources},{nativeFetch},{certificateTimeSafeStore,certificateTimeSafeFetch}]=await Promise.all([import('@receiz/sdk/offline'),import('./proof-resource-continuity'),import('./native-transport'),import('./device-signer-time')]);
  const resources=await loadBankProofResources(fetch),sealer=createReceizOfflineSealer({store:certificateTimeSafeStore(createReceizIndexedDbSealStore('bankeiz-public-ledger-device-signer')),resources,fetch:certificateTimeSafeFetch(nativeFetch)});
  if(!await sealer.ready())await sealer.enroll();return sealer;
 })().catch(error=>{publicSealer=undefined;throw error;});
 return(await publicSealer).seal(input);
}
type PublicStore={read(key:string):Promise<unknown>;write(key:string,next:RecordProofExportCheckpoint,previous:unknown):Promise<void>;retain(bytes:Uint8Array):Promise<string>;restore(digest:string):Promise<Uint8Array>};
/** Native-domain admission remains with the caller. This retains only a
 * canonical enclosing capture and never upgrades its payload to money rights. */
export function createPublicRecordProofExports(input:{store:PublicStore;seal:ReturnType<typeof createReceizOfflineSealer>['seal'];verify(bytes:Uint8Array):Promise<ReceizArtifactVerificationResult>;exclusive?<T>(key:string,work:()=>Promise<T>):Promise<T>}){
 return createRecordProofExports({assertOpen(){},...input.store,seal:input.seal,exclusive:input.exclusive,
  async read(key){
   const raw=await input.store.read(key);if(!raw)return raw;
   const state=raw as RecordProofExportCheckpoint;
   if(!state.artifact||typeof state.artifact.digest!=='string')throw Error('RECORD_PROOF_CHECKPOINT_INVALID');
   // Public local storage is not trusted admission. On a cold restore, open
   // exactly this saved artifact once before the shared controller reuses it.
   const bytes=await input.store.restore(state.artifact.digest),verified=await input.verify(bytes);
   if(verified.status!=='verified-artifact'||verified.artifactDigest.value!==state.artifact.digest||verified.payloadDigest.value!==state.payloadSha256)throw Error('RECORD_PROOF_SOURCE_MISMATCH');
   return raw;
  }
 });
}
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{try{const r=indexedDB.open('bankeiz.public-record-exports.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('RECORD_PROOF_STORAGE_UNAVAILABLE'));}catch(error){reject(error);}});}
function browserStore():PublicStore{
 const read=async(key:string)=>{const db=await database();try{return await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction('records'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}};
 const write=async(key:string,next:unknown,previous?:unknown)=>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get(key);let conflict=false;r.onsuccess=()=>{if(previous!==undefined&&JSON.stringify(r.result??null)!==JSON.stringify(previous)){conflict=true;tx.abort();return;}store.put(next,key);};r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(conflict?Error('RECORD_PROOF_STORAGE_CONFLICT'):tx.error);});}finally{db.close();}};
 return{read:key=>read('record:'+key),write:(key,next,previous)=>write('record:'+key,next,previous),async retain(bytes){const sha=await digest(bytes);await write('blob:'+sha,new Uint8Array(bytes));return sha;},async restore(sha){const bytes=await read('blob:'+sha);if(!(bytes instanceof Uint8Array)||await digest(bytes)!==sha)throw Error('RECORD_PROOF_SOURCE_MISMATCH');return bytes.slice();}};
}
/** Called only by explicit public Save proof. A reader retains the returned
 * File; a later reader restores its qualified exact bytes instead of sealing. */
export async function exportPublicRecordProof(input:RecordProofExportInput):Promise<File>{
 const captured={bytes:input.bytes instanceof Uint8Array?new Uint8Array(input.bytes):input.bytes,filename:input.filename,mimeType:input.mimeType,recordHash:input.recordHash};
 const {loadReceiz}=await import('./client'),sdk=await loadReceiz(),controller=createPublicRecordProofExports({store:browserStore(),seal:sealPublicDocument,verify:bytes=>sdk.verifyReceizArtifact(bytes),exclusive:async(key,work)=>typeof navigator!=='undefined'&&navigator.locks?await navigator.locks.request('bankeiz.public-record-export:'+key,()=>work()):work()});
 return controller.export(captured);
}
