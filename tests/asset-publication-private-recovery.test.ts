import {expect,it} from 'vitest';
import {createAssetPublication,readAssetPublicationState,readPendingAssetPublicationDigests,hasPendingAssetPublication,type AssetPublicationState} from '../src/receiz/asset-publication';

const owner='author.receiz.id',sha=(value:string)=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)).then(bytes=>Buffer.from(bytes).toString('hex'));
const deferred=()=>{let resolve!:()=>void,reject!:(error:Error)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
// These are checkpoint/transport ports only. The adjacent genuine SDK contract
// owns canonical Source, protected file, UID and private transport validation.
function fixture(){
 let state:AssetPublicationState|null=null,publications=0,seals=0,privateRuns=0;
 const files=new Map<string,File>(),attempts=new Map<File,Promise<void>>(),completion=deferred(),events:string[]=[];
 const ports={ownerReceizId:owner,assertOpen(){},lock:async<T>(run:()=>Promise<T>)=>run(),read:async()=>state,write:async(next:AssetPublicationState,previous:unknown)=>{expect(state).toEqual(previous);state=structuredClone(next);events.push('checkpoint');},
 seal:async(intent:unknown)=>{seals++;return new File([JSON.stringify(intent)],'source.receizbundle');},retain:async(file:File)=>{const digest=await sha(await file.text());files.set(digest,file);return digest;},restore:async(digest:string)=>{const file=files.get(digest);if(!file)throw Error('SOURCE_MISSING');return file;},readIntent:async(file:File)=>JSON.parse(await file.text()),
 privateOriginalDelivery:async(file:File)=>JSON.parse(await file.text()).private?()=>{let job=attempts.get(file);if(!job){const saved=readAssetPublicationState(state,owner)!;const item=[saved,...saved.pendingSources??[]].find(value=>files.get(value.sourceDigest)===file);expect(item).toHaveProperty('privateOriginalDeliveryPending',true);privateRuns++;events.push('private');job=completion.promise;attempts.set(file,job);}return job;}:null,
 publish:async()=>{publications++;events.push('public');return{status:'published' as const,artifactDigest:'b'.repeat(64),operationCount:3,visibleChildCount:2};}};
 const open=()=>createAssetPublication(ports);
 return{open,ports,completion,events,get state(){return state;},set state(value:AssetPublicationState|null){state=value;},get publications(){return publications;},get privateRuns(){return privateRuns;},get seals(){return seals;},files};
}
it('publishes Source while private completion is stalled and preserves its unfinished effect after public acknowledgment',async()=>{
 const f=fixture(),api=f.open(),result=await api.create({private:true,title:'One'});
 expect(result.publication.status).toBe('published');expect(f.state).toMatchObject({status:'published',privateOriginalDeliveryPending:true,receipt:{status:'published'}});
 expect(f.events.indexOf('checkpoint')).toBeLessThan(f.events.indexOf('private'));expect(f.events).toContain('public');
 expect(hasPendingAssetPublication(f.state)).toBe(true);expect(readPendingAssetPublicationDigests(f.state,owner)).toEqual([result.digest]);
 f.completion.reject(Error('PRIVATE_ACK_503'));await Promise.resolve();await Promise.resolve();expect(f.state).toMatchObject({status:'published',privateOriginalDeliveryPending:true});
});
it('retains published private work through later creation and cold private-only resume without publishing or resealing',async()=>{
 const f=fixture(),first=await f.open().create({private:true,title:'Older'}),second=await f.open().create({private:false,title:'Newer'});
 expect(f.state?.pendingSources).toMatchObject([{sourceDigest:first.digest,status:'published',privateOriginalDeliveryPending:true}]);
 expect(readPendingAssetPublicationDigests(f.state,owner)).toEqual([first.digest]);expect(second.publication.status).toBe('published');
 const before={seals:f.seals,publications:f.publications};
 const cold=f.open() as ReturnType<typeof createAssetPublication>&{resumePrivateOriginalDelivery(digest:string):Promise<void>};
 const work=cold.resumePrivateOriginalDelivery(first.digest);f.completion.resolve();await work;
 expect(f.seals).toBe(before.seals);expect(f.publications).toBe(before.publications);expect(f.state?.sourceDigest).toBe(second.digest);expect(f.state?.receipt?.status).toBe('published');expect(f.state?.pendingSources).toBeUndefined();
});
it('private success retires only the unfinished transport and keeps the published receipt',async()=>{
 const f=fixture(),api=f.open(),first=await api.create({private:true,title:'First'});
 const receipt=f.state!.receipt;f.completion.resolve();await (api as any).resumePrivateOriginalDelivery(first.digest);
 expect(f.state?.status).toBe('published');expect(f.state?.receipt).toEqual(receipt);expect(f.state).not.toHaveProperty('privateOriginalDeliveryPending');expect(readPendingAssetPublicationDigests(f.state,owner)).toEqual([]);
});
it('old published checkpoints without a private effect do not invent private work',async()=>{
 const f=fixture(),result=await f.open().create({private:false});const api=f.open() as any;
 await api.resumePrivateOriginalDelivery(result.digest);expect(f.privateRuns).toBe(0);expect(f.publications).toBe(1);expect(f.seals).toBe(1);
});
it.each([false,'pending',{},[],0,null].map(value=>({value})))('refuses malformed private effect $value without treating it as Source authority',async({value})=>{
 const f=fixture();await f.open().create({private:false});const malformed={...f.state,privateOriginalDeliveryPending:value};expect(()=>readAssetPublicationState(malformed,owner)).toThrow('BANK_ASSET_PUBLICATION_STATE_INVALID');
});
