import {expect,it} from 'vitest';
import {createAssetPublication, type AssetPublicationState} from '../src/receiz/asset-publication';

const owner='owner.receiz.id', digest='a'.repeat(64), intent={definition:{name:'Original',symbol:'ORG',units:'1',description:'Exact original',linkedProofDigest:null},moment:{text:'Long form stays complete',files:[{filename:'song.wav',bytesB64u:'AQID'}]}};
function fixture(){
 let state:AssetPublicationState|null=null,seals=0,publications=0,fail=false,closed=false;
 const sources=new Map<string,File>();
 const api=createAssetPublication({ownerReceizId:owner,assertOpen:()=>{if(closed)throw Error('CLOSED');},lock:async run=>run(),read:async()=>state,write:async(next,previous)=>{expect(state).toEqual(previous);state=structuredClone(next);},seal:async()=>{seals++;return new File([new Uint8Array([1,2,3])],'original.receizbundle',{type:'application/vnd.receiz.bundle+json'});},retain:async file=>{sources.set(digest,file);return digest;},restore:async ref=>{const source=sources.get(ref);if(!source)throw Error('SOURCE_MISSING');return source;},readIntent:async()=>intent,publish:async file=>{publications++;expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([1,2,3]);if(fail)throw Error('LOST_RESPONSE');return {status:'published',artifactDigest:'b'.repeat(64),operationCount:2,visibleChildCount:1};}});
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
it('reopens a pending original locally after refresh and resumes without the author reselecting files',async()=>{
 const f=fixture();expect(await f.api.pending()).toBeNull();f.fail=true;await f.api.create(intent);
 expect((await f.api.pending())?.publication.status).toBe('pending');expect(f.publications).toBe(1);
 f.fail=false;expect((await f.api.resume()).publication.status).toBe('published');expect(f.seals).toBe(1);expect(f.publications).toBe(2);
});
it('refuses delivery if restored canonical intent differs from its retained request',async()=>{
 const f=fixture();f.fail=true;await f.api.create(intent);f.state!.intentDigest='c'.repeat(64);
 await expect(f.api.resume()).rejects.toThrow('BANK_ASSET_PUBLICATION_SOURCE_INTENT_MISMATCH');expect(f.publications).toBe(1);expect(f.seals).toBe(1);
});
