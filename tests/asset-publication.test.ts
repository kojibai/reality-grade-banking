import {expect,it} from 'vitest';
import {createAssetPublication, type AssetPublicationState} from '../src/receiz/asset-publication';

const owner='owner.receiz.id', digest='a'.repeat(64), intent={definition:{name:'Original',symbol:'ORG',units:'1',description:'Exact original',linkedProofDigest:null},moment:{text:'Long form stays complete',files:[{filename:'song.wav',bytesB64u:'AQID'}]}};
function fixture(failureCode='LOST_RESPONSE'){
 let state:AssetPublicationState|null=null,seals=0,publications=0,fail=false,closed=false;
 const sources=new Map<string,File>();
 const api=createAssetPublication({ownerReceizId:owner,assertOpen:()=>{if(closed)throw Error('CLOSED');},lock:async run=>run(),read:async()=>state,write:async(next,previous)=>{expect(state).toEqual(previous);state=structuredClone(next);},seal:async()=>{seals++;return new File([new Uint8Array([1,2,3])],'original.receizbundle',{type:'application/vnd.receiz.bundle+json'});},retain:async file=>{sources.set(digest,file);return digest;},restore:async ref=>{const source=sources.get(ref);if(!source)throw Error('SOURCE_MISSING');return source;},readIntent:async()=>intent,publish:async file=>{publications++;expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([1,2,3]);if(fail)throw Error(failureCode);return {status:'published',artifactDigest:'b'.repeat(64),operationCount:2,visibleChildCount:1};}});
 return {api,get state(){return state;},get seals(){return seals;},get publications(){return publications;},set fail(value:boolean){fail=value;},set closed(value:boolean){closed=value;}};
}
it('retains exact intent and sealed original before delivering it to Showcase',async()=>{
 const f=fixture(),result=await f.api.create(intent);
 expect(f.seals).toBe(1);expect(f.publications).toBe(1);
 expect(result).toMatchObject({digest,publication:{status:'published',showcaseArtifactDigest:'b'.repeat(64)}});
 expect(f.state).toMatchObject({schema:'bank.asset-publication.v1',ownerReceizId:owner,sourceDigest:digest,status:'published'});
});
it('reuses retained exact bytes after a lost public response without sealing another original',async()=>{
 const f=fixture();f.fail=true;
 expect((await f.api.create(intent)).publication.status).toBe('pending');
 expect(f.state).toMatchObject({status:'pending',sourceDigest:digest});
 f.fail=false;expect((await f.api.create(intent)).publication.status).toBe('published');
 expect(f.seals).toBe(1);expect(f.publications).toBe(2);
 expect((await f.api.create(intent)).publication.status).toBe('published');expect(f.publications).toBe(2);
});
it('does not seal a different intent while the previous original awaits publication',async()=>{
 const f=fixture();f.fail=true;await f.api.create(intent);
 await expect(f.api.create({...intent,moment:{text:'Different original'}})).rejects.toThrow('BANK_ASSET_PUBLICATION_PENDING');
 expect(f.seals).toBe(1);expect(f.publications).toBe(1);
});
it('refuses stale account access before creating or delivering any original',async()=>{
 const f=fixture();f.closed=true;await expect(f.api.create(intent)).rejects.toThrow('CLOSED');expect(f.seals).toBe(0);expect(f.publications).toBe(0);
});
it('retains a structured publication failure code without exposing arbitrary exception text',async()=>{
 const protocol=fixture('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');protocol.fail=true;
 expect((await protocol.api.create(intent)).publication.code).toBe('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
 const unknown=fixture('private exception details');unknown.fail=true;
 expect((await unknown.api.create(intent)).publication.code).toBe('BANK_ASSET_PUBLICATION_DELIVERY_PENDING');
});
it('reopens a pending original locally after refresh and resumes without the author reselecting files',async()=>{
 const f=fixture();expect(await f.api.pending()).toBeNull();f.fail=true;await f.api.create(intent);
 expect((await f.api.pending())?.publication.status).toBe('pending');expect(f.publications).toBe(1);
 f.fail=false;expect((await f.api.resume()).publication.status).toBe('published');expect(f.seals).toBe(1);expect(f.publications).toBe(2);
});
it('refuses delivery if restored canonical intent differs from its retained request',async()=>{
 const f=fixture();f.fail=true;await f.api.create(intent);f.state!.intentDigest='c'.repeat(64);
 await expect(f.api.resume()).rejects.toThrow('BANK_ASSET_PUBLICATION_SOURCE_INTENT_MISMATCH');expect(f.publications).toBe(1);expect(f.seals).toBe(1);
});

it('returns the durably held Original while delivery is in flight, starts immediately, and coalesces a retry',async()=>{
 let state:AssetPublicationState|null=null,seals=0,publications=0;
 let complete!:(receipt:{status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number})=>void;
 const network=new Promise<{status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number}>(resolve=>{complete=resolve;});
 const file=new File(['exact sealed Original'],'original.receizbundle');
 const api=createAssetPublication({ownerReceizId:'source-first.receiz.id',assertOpen:()=>{},lock:async run=>run(),read:async()=>state,write:async(next,previous)=>{expect(state).toEqual(previous);state=next;},seal:async()=>{seals++;return file;},retain:async()=>digest,restore:async()=>file,readIntent:async()=>intent,publish:async source=>{expect(state?.sourceDigest).toBe(digest);expect(source).toBe(file);publications++;return network;}});
 const result=await api.createLocal(intent);
 expect(result.publication.status).toBe('pending');expect(seals).toBe(1);expect(publications).toBe(1);
 const retry=api.resume();
 await Promise.resolve();expect(publications).toBe(1);
 complete({status:'published',artifactDigest:'b'.repeat(64),operationCount:2,visibleChildCount:1});
 expect((await retry).publication.status).toBe('published');expect(seals).toBe(1);expect(publications).toBe(1);
});

it('settles a stale creation from its exact canonical signed acknowledgment before cold reopening',async()=>{
 const {acknowledgePublishedAssetSource}=await import('../src/receiz/asset-publication');const f=fixture();f.fail=true;await f.api.create(intent);expect((await f.api.pending())?.digest).toBe(digest);
 let state=structuredClone(f.state),writes=0;const ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState,previous:unknown)=>{expect(state).toEqual(previous);state=structuredClone(next);writes++;}};
 const receipt={status:'published' as const,artifactDigest:'d'.repeat(64),operationCount:5,visibleChildCount:2};await acknowledgePublishedAssetSource(ports,digest,receipt);
 expect(state).toMatchObject({status:'published',sourceDigest:digest,receipt});expect(writes).toBe(1);
 await acknowledgePublishedAssetSource(ports,digest,{status:'pending',code:'OLD_REPLY'});await acknowledgePublishedAssetSource(ports,'f'.repeat(64),receipt);expect(writes).toBe(1);
 const cold=createAssetPublication({...ports,seal:async()=>{throw Error('COLD_SEAL_FORBIDDEN');},retain:async()=>digest,restore:async()=>{throw Error('PUBLISHED_REOPEN_FORBIDDEN');},readIntent:async()=>intent,publish:async()=>{throw Error('COLD_PUBLICATION_FORBIDDEN');}});expect(await cold.pending()).toBeNull();
});

it('retains the native PBI admission in the exact checkpoint without acknowledging a pending publication',async()=>{
 const {retainAssetCreationSignature,dismissAssetCreation}=await import('../src/receiz/asset-publication');const f=fixture();f.fail=true;await f.api.create(intent);let state=structuredClone(f.state),writes=0,sourceReads=0;
 const ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState,previous:unknown)=>{expect(previous).toEqual(state);state=structuredClone(next);writes++;}};
 await retainAssetCreationSignature(ports,digest,'e'.repeat(64));expect(state).toMatchObject({status:'pending',pbiReceiptHash:'e'.repeat(64)});expect(writes).toBe(1);
 await retainAssetCreationSignature(ports,'f'.repeat(64),'d'.repeat(64));await dismissAssetCreation(ports,'f'.repeat(64));expect(writes).toBe(1);
 const cold=createAssetPublication({...ports,restore:async()=>{sourceReads++;throw Error('SIGNED_SOURCE_MUST_NOT_REOPEN');},readIntent:async()=>intent,seal:async()=>{throw Error('SEAL_FORBIDDEN');},retain:async()=>digest,publish:async()=>{throw Error('PUBLISH_FORBIDDEN');}});
 expect(await cold.pending()).toBeNull();expect(sourceReads).toBe(0);await dismissAssetCreation(ports,digest);expect(state?.creationDismissed).toBe(true);expect(state?.status).toBe('pending');
});
it('migrates an old checkpoint from the native saved-proof reader once, without signing or publishing',async()=>{
 const {retainAssetCreationSignature}=await import('../src/receiz/asset-publication');const f=fixture();f.fail=true;await f.api.create(intent);let state=structuredClone(f.state),reads=0;
 const ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState)=>{state=structuredClone(next);}};
 const cold=createAssetPublication({...ports,restore:async()=>{reads++;return new File(['source'],'source.receizbundle');},readIntent:async()=>intent,readSignature:async()=>({pbiReceiptHash:'e'.repeat(64)}),seal:async()=>{throw Error('SEAL_FORBIDDEN');},retain:async()=>digest,publish:async()=>{throw Error('PUBLISH_FORBIDDEN');}});
 expect(await cold.pending()).toBeNull();expect(state).toMatchObject({status:'pending',pbiReceiptHash:'e'.repeat(64)});expect(await cold.pending()).toBeNull();expect(reads).toBe(1);
 await retainAssetCreationSignature(ports,digest,'e'.repeat(64));expect(state?.sourceDigest).toBe(digest);
});

it('does not drop native PBI or dismissal when an older unsigned delivery finishes',async()=>{
 const {retainAssetCreationSignature,dismissAssetCreation}=await import('../src/receiz/asset-publication');let state:AssetPublicationState|null=null,finish!:(r:any)=>void;
 const network=new Promise<any>(resolve=>{finish=resolve;}),file=new File(['source'],'source.receizbundle'),ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState)=>{state=structuredClone(next);}};
 const api=createAssetPublication({...ports,seal:async()=>file,retain:async()=>digest,restore:async()=>file,readIntent:async()=>intent,publish:()=>network});
 await api.createLocal(intent);await retainAssetCreationSignature(ports,digest,'e'.repeat(64));await dismissAssetCreation(ports,digest);
 finish({status:'pending',code:'OLD_DELIVERY_REPLY'});await api.resume();expect(state).toMatchObject({pbiReceiptHash:'e'.repeat(64),creationDismissed:true});expect(await api.pending()).toBeNull();
});

it('reconciles only the exact completed predecessor during explicit Create before admitting the next intent',async()=>{
 const {retainAssetCreationSignature}=await import('../src/receiz/asset-publication');let state:AssetPublicationState|null=null,seals=0,publishes=0,fail=true;const files=new Map<string,File>();
 const ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState)=>{state=structuredClone(next);}};
 const api=createAssetPublication({...ports,seal:async intent=>{seals++;return new File([JSON.stringify(intent)],'source.receizbundle');},retain:async file=>{const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');files.set(hash,file);return hash;},restore:async digest=>files.get(digest)!,readIntent:async file=>JSON.parse(await file.text()),publish:async()=>{publishes++;if(fail)throw Error('OLD_ACK_UNAVAILABLE');return{status:'published',artifactDigest:'b'.repeat(64),operationCount:1,visibleChildCount:1};}});
 const first=await api.create({title:'First'});await retainAssetCreationSignature(ports,first.digest,'e'.repeat(64));expect(await api.pending()).toBeNull();expect(publishes).toBe(1);
 fail=false;const second=await api.create({title:'Second'});expect(second.digest).not.toBe(first.digest);expect(seals).toBe(2);expect(publishes).toBe(3);expect(state).not.toHaveProperty('pbiReceiptHash');expect(state).not.toHaveProperty('creationDismissed');
});
