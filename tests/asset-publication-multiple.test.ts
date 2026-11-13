import {afterEach,expect,it,vi} from 'vitest';
import * as publication from '../src/receiz/asset-publication';
import type {AssetPublicationReceipt,AssetPublicationState} from '../src/receiz/asset-publication';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

const owner='multiple-originals.receiz.id';
const receipt:AssetPublicationReceipt={status:'published',artifactDigest:'f'.repeat(64),operationCount:3,visibleChildCount:2};
const releases:(()=>Promise<void>|undefined)[]=[];
afterEach(async()=>{await Promise.all(releases.splice(0).map(release=>release()));vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(){
 let state:AssetPublicationState|null=null,seals=0,closed=false,failed=false;
 let serial:Promise<unknown>=Promise.resolve();
 const sources=new Map<string,File>(),calls:string[]=[],waiting=new Map<string,(value:AssetPublicationReceipt)=>void>();
 const ports={ownerReceizId:owner,assertOpen(){if(closed)throw Error('CLOSED');},
  lock:<T>(run:()=>Promise<T>)=>{const next=serial.then(run);serial=next.catch(()=>{});return next;},
  read:async()=>state,write:async(next:AssetPublicationState,prior:unknown)=>{expect(state).toEqual(prior);state=structuredClone(next);}};
 const dependencies={...ports,seal:async(intent:unknown)=>{seals++;return new File([JSON.stringify(intent)],'exact-original.receizbundle',{type:'application/vnd.receiz.bundle+json'});},
  retain:async(file:File)=>{const digest=await hash(file);sources.set(digest,file);return digest;},
  restore:async(digest:string)=>{const file=sources.get(digest);if(!file)throw Error('SOURCE_MISSING');expect(await hash(file)).toBe(digest);return file;},
  readIntent:async(file:File)=>JSON.parse(await file.text()),publish:async(file:File)=>{const digest=await hash(file);calls.push(digest);if(failed)return{status:'pending' as const,code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'};return new Promise<AssetPublicationReceipt>(resolve=>{waiting.set(digest,resolve);releases.push(()=>{resolve({status:'pending',code:'TEST_FINISHED'});return publication.waitForAssetPublicationDelivery(owner,digest);});});}};
 return{ports,dependencies,api:publication.createAssetPublication(dependencies),sources,calls,waiting,
  get state(){return state;},set state(value:AssetPublicationState|null){state=value;},get seals(){return seals;},set failed(value:boolean){failed=value;},set closed(value:boolean){closed=value;}};
}
async function hash(file:File){return Buffer.from(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())).toString('hex');}

it.each(['unsigned','signed','dismissed'] as const)('locally creates a second Original while the older %s delivery remains stalled',async mode=>{
 const f=fixture(),first=await f.api.createLocal({title:'First exact Original'});
 if(mode==='signed')await publication.retainAssetCreationSignature(f.ports,first.digest,'e'.repeat(64));
 if(mode==='dismissed')await publication.dismissAssetCreation(f.ports,first.digest);
 const second=await f.api.createLocal({title:'Second independent Original'});
 expect(second.digest).not.toBe(first.digest);expect(f.seals).toBe(2);expect(f.state?.sourceDigest).toBe(second.digest);
 expect(f.state?.pendingSources).toHaveLength(1);expect(f.state?.pendingSources?.[0]).toMatchObject({sourceDigest:first.digest,status:'pending',...(mode==='signed'?{pbiReceiptHash:'e'.repeat(64)}:{}),...(mode==='dismissed'?{creationDismissed:true}:{})});
 expect(f.sources.size).toBe(2);expect(await f.api.pendingDeliveries()).toEqual([first.digest,second.digest].sort());
},2500);

it('updates only the archived Original on late PBI, dismissal and delivery, preserving the newer editor result',async()=>{
 const f=fixture(),first=await f.api.createLocal({title:'Old'}),second=await f.api.createLocal({title:'New'});
 await vi.waitFor(()=>expect(f.waiting.has(first.digest)).toBe(true));
 await publication.retainAssetCreationSignature(f.ports,first.digest,'e'.repeat(64));await publication.dismissAssetCreation(f.ports,first.digest);
 const joined=f.api.resume(first.digest);f.waiting.get(first.digest)!({status:'pending',code:'OLD_UNSIGNED_RESPONSE'});
 expect(await joined).toMatchObject({digest:first.digest,pbiSigned:true,publication:{status:'pending'}});
 expect(f.state?.sourceDigest).toBe(second.digest);expect(f.state).not.toHaveProperty('pbiReceiptHash');
 expect(f.state?.pendingSources?.[0]).toMatchObject({sourceDigest:first.digest,pbiReceiptHash:'e'.repeat(64),creationDismissed:true});
 expect(f.calls.filter(digest=>digest===first.digest)).toHaveLength(1);
});

it('retains a confirmed exact receipt for an in-flight result after pruning its archive and rejects a late downgrade',async()=>{
 const f=fixture(),first=await f.api.createLocal({title:'Old confirmed'}),second=await f.api.createLocal({title:'Current'});
 await vi.waitFor(()=>expect(f.waiting.has(first.digest)).toBe(true));
 await publication.retainAssetCreationSignature(f.ports,first.digest,'e'.repeat(64));await publication.dismissAssetCreation(f.ports,first.digest);
 const joined=f.api.resume(first.digest);await vi.waitFor(()=>expect(f.calls.filter(digest=>digest===first.digest)).toHaveLength(1));
 await publication.acknowledgePublishedAssetSource(f.ports,first.digest,receipt);
 expect(f.state?.pendingSources??[]).toEqual([]);expect(f.state?.sourceDigest).toBe(second.digest);
 f.waiting.get(first.digest)!({status:'pending',code:'LATE_UNSIGNED_RESPONSE'});
 expect(await joined).toMatchObject({digest:first.digest,pbiSigned:true,publication:{status:'published',showcaseArtifactDigest:receipt.artifactDigest}});
 expect(f.state?.sourceDigest).toBe(second.digest);expect(f.state?.status).toBe('pending');expect(publication.hasPendingAssetPublication(f.state)).toBe(true);
});

it('cold retries both exact retained Originals without resealing and coalesces duplicate source retries',async()=>{
 const f=fixture();f.failed=true;const first=await f.api.create({title:'Cold old'}),second=await f.api.create({title:'Cold new'});
 await publication.retainAssetCreationSignature(f.ports,first.digest,'e'.repeat(64));await publication.dismissAssetCreation(f.ports,first.digest);
 const snapshot=structuredClone(f.state),calls:string[]=[];
 const cold=publication.createAssetPublication({...f.dependencies,read:async()=>snapshot,write:async(next,prior)=>{expect(snapshot).toEqual(prior);Object.assign(snapshot!,structuredClone(next));if(!next.pendingSources)delete snapshot!.pendingSources;},
  seal:async()=>{throw Error('COLD_RESEAL_FORBIDDEN');},publish:async file=>{calls.push(await hash(file));return receipt;}});
 const [a,b]=await Promise.all([cold.resume(first.digest),cold.resume(first.digest)]);
 expect(a).toMatchObject({digest:first.digest,pbiSigned:true});expect(b.digest).toBe(first.digest);expect(calls).toEqual([first.digest]);
 expect((await cold.resume(second.digest)).digest).toBe(second.digest);expect(calls).toEqual([first.digest,second.digest]);
 expect(f.seals).toBe(2);expect(f.sources.size).toBe(2);expect(snapshot?.pendingSources??[]).toEqual([]);
});

it('shares an explicit cold retry before reopening so a fast accepted receipt cannot retire another caller',async()=>{
 const f=fixture();f.failed=true;const first=await f.api.create({title:'Retained retry'});await f.api.create({title:'Current independent Original'});
 let entered!:()=>void,release!:()=>void,restores=0,publishes=0;
 const started=new Promise<void>(resolve=>{entered=resolve;}),waiting=new Promise<void>(resolve=>{release=resolve;});
 const dependencies={...f.dependencies,restore:async(digest:string)=>{restores++;entered();await waiting;return f.dependencies.restore(digest);},publish:async()=>{publishes++;return receipt;}};
 const left=publication.createAssetPublication(dependencies),right=publication.createAssetPublication(dependencies);
 const a=left.resume(first.digest);await started;const b=right.resume(first.digest);
 releases.push(()=>{release();return Promise.allSettled([a,b]).then(()=>{});});
 await f.ports.lock(async()=>{});
 expect(restores).toBe(1);release();
 const results=await Promise.all([a,b]);
 expect(results.every(result=>result.digest===first.digest&&result.publication.status==='published')).toBe(true);
 expect(publishes).toBe(1);expect(f.seals).toBe(2);expect(f.state?.pendingSources??[]).toEqual([]);
});

it('refuses a closed joined caller while preserving the open caller accepted retry',async()=>{
 const f=fixture();f.failed=true;const first=await f.api.create({title:'Closed joined retry'});
 let entered!:()=>void,release!:()=>void,closed=false;
 const started=new Promise<void>(resolve=>{entered=resolve;}),waiting=new Promise<void>(resolve=>{release=resolve;});
 const dependencies={...f.dependencies,restore:async(digest:string)=>{entered();await waiting;return f.dependencies.restore(digest);},publish:async()=>receipt};
 const a=publication.createAssetPublication(dependencies).resume(first.digest);await started;
 const b=publication.createAssetPublication({...dependencies,assertOpen(){if(closed)throw Error('JOINER_CLOSED');}}).resume(first.digest);
 void b.catch(()=>{});closed=true;release();
 expect((await a).publication.status).toBe('published');await expect(b).rejects.toThrow('JOINER_CLOSED');
});

it('releases a failed exact retry so its retained Original can be resumed again',async()=>{
 const f=fixture();f.failed=true;const first=await f.api.create({title:'Retry after failed restore'});let restores=0;
 const cold=publication.createAssetPublication({...f.dependencies,restore:async(digest:string)=>{if(++restores===1)throw Error('RESTORE_UNAVAILABLE');return f.dependencies.restore(digest);},publish:async()=>receipt});
 await expect(cold.resume(first.digest)).rejects.toThrow('RESTORE_UNAVAILABLE');
 expect((await cold.resume(first.digest)).publication.status).toBe('published');expect(restores).toBe(2);expect(f.seals).toBe(1);
});

it('validates same-owner flat unique archive records and keeps pending removal protection independently of current status',async()=>{
 const f=fixture();f.failed=true;await f.api.create({title:'Older'});await f.api.create({title:'Current'});
 const state=f.state!;expect(state.pendingSources).toHaveLength(1);
 expect(()=>publication.readAssetPublicationState({...state,pendingSources:[{...state.pendingSources![0],ownerReceizId:'foreign.receiz.id'}]},owner)).toThrow('STATE_INVALID');
 expect(()=>publication.readAssetPublicationState({...state,pendingSources:[state.pendingSources![0],state.pendingSources![0]]},owner)).toThrow('STATE_INVALID');
 expect(()=>publication.readAssetPublicationState({...state,pendingSources:[{...state.pendingSources![0],pendingSources:[]}]},owner)).toThrow('STATE_INVALID');
 expect(()=>publication.readAssetPublicationState({...state,pendingSources:[{...state.pendingSources![0],sourceDigest:state.sourceDigest}]},owner)).toThrow('STATE_INVALID');
 expect(publication.hasPendingAssetPublication({...state,status:'published',receipt})).toBe(true);
 const digests=await f.api.pendingDeliveries(1);expect(digests).toHaveLength(1);expect(await f.api.pendingDeliveries(1,digests[0])).toHaveLength(1);
 f.closed=true;await expect(f.api.resume(state.pendingSources![0].sourceDigest)).rejects.toThrow('CLOSED');
});

it('bounds recovery selection without truncating outstanding records or accumulating published history',async()=>{
 const f=fixture();f.failed=true;await f.api.create({title:'A retained source'});
 const state={...f.state!,sourceDigest:'f'.repeat(64),status:'published' as const,receipt,pendingSources:Array.from({length:130},(_,index)=>({...f.state!,sourceDigest:index.toString(16).padStart(64,'0')}))};
 expect(publication.readAssetPublicationState(state,owner)?.pendingSources).toHaveLength(130);
 const first=publication.readPendingAssetPublicationDigests(state,owner);expect(first).toHaveLength(16);
 expect(publication.readPendingAssetPublicationDigests(state,owner,2,first.at(-1))).toEqual([16,17].map(index=>index.toString(16).padStart(64,'0')));
 expect(()=>publication.readPendingAssetPublicationDigests(state,owner,65)).toThrow('STATE_INVALID');
 const delivered=publication.createAssetPublication({...f.dependencies,publish:async()=>receipt});
 await delivered.resume();
 for(let index=0;index<20;index++)await delivered.create({title:`Confirmed source ${index}`});
 expect(f.state?.pendingSources??[]).toEqual([]);expect(f.sources.size).toBe(21);
});

it.each(['restore','verify'] as const)('does not gate a new local Seal on an older suspended %s and confines its integrity refusal to that source',async stage=>{
 const f=fixture();f.failed=true;const first=await f.api.create({title:'Older local recovery'});
 let entered!:()=>void,reject!:()=>void;
 const started=new Promise<void>(resolve=>{entered=resolve;}),blocked=new Promise<never>((_resolve,refuse)=>{reject=()=>refuse(Error('OLD_SOURCE_INTEGRITY_FAILED'));});
 const retry=publication.createAssetPublication({...f.dependencies,
  restore:async digest=>{if(stage==='restore'){entered();await blocked;}return f.dependencies.restore(digest);},
  readIntent:async file=>{if(stage==='verify'){entered();await blocked;}return f.dependencies.readIntent(file);}}).resume(first.digest);
 void retry.catch(()=>{});releases.push(()=>{reject();return retry.then(()=>{},()=>{});});await started;
 const second=await f.api.createLocal({title:'New independently sealed Original'});
 expect(f.seals).toBe(2);expect(second.digest).not.toBe(first.digest);expect(f.state?.sourceDigest).toBe(second.digest);
 reject();await expect(retry).rejects.toThrow('OLD_SOURCE_INTEGRITY_FAILED');
 expect(f.state?.sourceDigest).toBe(second.digest);expect(f.state?.pendingSources?.[0].sourceDigest).toBe(first.digest);
},2500);

it.each(['moment','image'] as const)('seals and canonically admits a second real SDK %s Original while the first publisher awaits unavailable delivery',async kind=>{
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;vi.stubGlobal('indexedDB',new IDBFactory());
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const ownerReceizId=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId;
 const seal=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 let release!:()=>void,requests=0,state:AssetPublicationState|null=null,seals=0,failure:Error|undefined,serial:Promise<unknown>=Promise.resolve();
 const unavailable=new Promise<Response>(resolve=>{release=()=>resolve(Response.json({error:'OFFLINE'},{status:503}));});
 const admissions:{sourceReference:{artifactSha256:string};original:{assetTitle:string;claim:string;longForm:{text:string};originalCreator:{userId:string};media:unknown}}[]=[],sources=new Map<string,File>();
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,
  account:{uid:'778a5fef-85cb-4111-90d1-5479004d932a',username:'held_artist'},sealDocument:seal,assertCurrent(){},
  fetchImpl:async()=>{requests++;return unavailable;},onLocalAdmission:(value:any)=>{admissions.push(value);}});
 const custody=r.createImportedProofSourceCustody(),open=(file:File)=>r.openImportedProofSource(file,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});
 const dependencies:Parameters<typeof publication.createAssetPublication>[0]={ownerReceizId,assertOpen(){},lock:<T>(run:()=>Promise<T>)=>{const next=serial.then(run);serial=next.catch(()=>{});return next;},read:async()=>state,write:async next=>{state=structuredClone(next);},
  seal:async intent=>{seals++;return(await runtime.prepare({title:(intent as {title:string}).title,description:'A retained caption and link: https://example.test/work',kind,longForm:'The complete long-form creation remains local before delivery.',files:kind==='moment'?[]:[{id:'primary',role:'primary',file:new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'original.png',{type:'image/png'})}]})).artifact;},
  retain:async file=>{const digest=await hash(file);sources.set(digest,file);return digest;},restore:async digest=>sources.get(digest)!,
  readIntent:async file=>({title:(await open(file)).projection.bankAsset.composer.title}),publish:async file=>{
   // Match Bank's held-source admission while its connected publisher opens.
   await r.connectedComposer.admitConnectedComposerSource({file,ownerReceizId,username:'held_artist',assertCurrent(){},onLocalAdmission(value:any){expect(value.sourceReference.artifactSha256).toBeDefined();}});
   return runtime.publish(file).catch((cause:Error)=>{failure=cause;throw cause;});
  }};
 const api=publication.createAssetPublication(dependencies);
 const first=await api.createLocal({title:'First actual Original'});await vi.waitFor(()=>expect(requests,failure?.message).toBeGreaterThan(0));
 const second=await api.createLocal({title:'Second actual Original'});
 releases.push(()=>{release();return Promise.all([...sources.keys()].map(digest=>publication.waitForAssetPublicationDelivery(ownerReceizId,digest))).then(()=>{});});
 const saved=publication.readAssetPublicationState(state,ownerReceizId);
 expect(seals).toBe(2);expect(second.digest).not.toBe(first.digest);expect(saved?.sourceDigest).toBe(second.digest);
 expect(saved?.pendingSources?.[0].sourceDigest).toBe(first.digest);
 await vi.waitFor(()=>expect(admissions).toHaveLength(2));
 expect(admissions.map(value=>value.original.assetTitle)).toEqual(['First actual Original','Second actual Original']);
 expect(admissions.every(value=>value.original.originalCreator.userId==='778a5fef-85cb-4111-90d1-5479004d932a')).toBe(true);
 expect(admissions.every(value=>value.original.claim==='A retained caption and link: https://example.test/work'&&value.original.longForm.text==='The complete long-form creation remains local before delivery.')).toBe(true);
 if(kind==='moment')expect(admissions.every(value=>value.original.media===null)).toBe(true);
 let enterRead!:()=>void,refuseRead!:()=>void;
 const reading=new Promise<void>(resolve=>{enterRead=resolve;}),blockedRead=new Promise<never>((_resolve,reject)=>{refuseRead=()=>reject(Error('OLD_SOURCE_INTEGRITY_FAILED'));});
 const oldRetry=publication.createAssetPublication({...dependencies,restore:async()=>{enterRead();return blockedRead;}}).resume(first.digest);
 void oldRetry.catch(()=>{});releases.push(()=>{refuseRead();return oldRetry.then(()=>{},()=>{});});await reading;
 const third=await api.createLocal({title:'Third actual Original during old local recovery'});
 expect(seals).toBe(3);expect(publication.readAssetPublicationState(state,ownerReceizId)?.sourceDigest).toBe(third.digest);
 refuseRead();await expect(oldRetry).rejects.toThrow('OLD_SOURCE_INTEGRITY_FAILED');
 expect(publication.readAssetPublicationState(state,ownerReceizId)?.sourceDigest).toBe(third.digest);
 await vi.waitFor(()=>expect(admissions).toHaveLength(3));
 for(const [digest,file] of sources){const opened=await open(file);expect(opened.descriptor.artifactSha256).toBe(digest);expect(opened.verification.ok).toBe(true);expect(opened.projection.ownerReceizId).toBe(ownerReceizId);}
 const original=sources.get(first.digest)!,exact=new Uint8Array(await original.arrayBuffer()),uid='778a5fef-85cb-4111-90d1-5479004d932a';
 const display=async(module:typeof r,username:string)=>{
  let result:any;
  await module.connectedComposer.admitConnectedComposerSource({file:original,ownerReceizId,profileIdentity:uid,username,assertCurrent(){},onLocalAdmission(value:any){result=value;}});
  expect(result.original.originalCreator.userId).toBe(uid);expect(result.original.originalCreator.username).toBe(username);
  expect(result.sourceReference.artifactSha256).toBe(first.digest);return result;
 };
 const beforeRequests=requests,current=await display(r,'held_artist'),renamed=await display(r,'renamed_artist');
 expect(requests).toBe(beforeRequests);expect(renamed.original.importedSource).toEqual(current.original.importedSource);
 await expect(r.connectedComposer.admitConnectedComposerSource({file:original,ownerReceizId:'foreign.receiz.id',profileIdentity:uid,username:'renamed_artist',assertCurrent(){}})).rejects.toThrow('SOURCE_OWNER_MISMATCH');
 const cold=await f.reloadRuntime(),reopened=await display(cold,'renamed_artist');
 expect(reopened.original).toEqual(renamed.original);expect(requests).toBe(beforeRequests);
 expect(new Uint8Array(await original.arrayBuffer())).toEqual(exact);
},15000);
