import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('reopens an existing native outbox entry after a transport decoder rejection while preserving permanent proof refusals',async()=>{
 const {runtime}=await conformanceOfflineFixture({composer:true}),indexedDB=new IDBFactory(),databaseName='retained-native-transport';
 const create=()=>runtime.showcaseVault.createProfileShowcaseBoundedEdgeVault({indexedDB,databaseName});
 expect(await create().pendingReconciliationAttempts()).toEqual([]);
 // These are persisted delivery observations, never artifact admissions.
 // Exercise the real indexed native reader against the already existing row.
 const base={artifactId:'profile-showcase:held.receiz.id',artifactDigest:'a'.repeat(64),historyHeadDigest:'b'.repeat(64),headKaiUpulse:'15100000000000',status:'rejected',attempts:1,acceptedArtifactDigest:null};
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(databaseName);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('bounded-reconciliation-outbox','readwrite');
  const store=transaction.objectStore('bounded-reconciliation-outbox');
  store.put({...base,attemptId:'retained-transport',lastError:'PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID'});
  store.put({...base,attemptId:'proof-refusal',artifactDigest:'c'.repeat(64),lastError:'PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID'});
  transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);
 });}finally{db.close();}
 const pending=await create().pendingReconciliationAttempts();
 expect(pending.map((entry:{attemptId:string})=>entry.attemptId)).toEqual(['retained-transport']);
 expect(pending[0]).toMatchObject({...base,attemptId:'retained-transport',lastError:'PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID'});
});
