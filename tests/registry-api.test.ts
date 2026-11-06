import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {createRegistryHandler} from '../server/registry';
import {RegistryStoreError,type RegistryStore} from '../server/registry-store';
import type {RegistryInstitutionState} from '../src/registry/types';
const proof=new Uint8Array(readFileSync('public/conformance/bankeiz-public-conformance.png'));
const request=(path='',init?:RequestInit)=>new Request('https://bankeiz.com/api/bank/registry'+path,init);
const upload=(bytes=proof,headers?:Record<string,string>)=>({method:'POST',headers:{'content-type':'image/png',origin:'https://bankeiz.com',...headers},body:bytes} as RequestInit);
function memoryStore():RegistryStore {
 const records=new Map<string,RegistryInstitutionState>(),originals=new Map<string,Uint8Array>();
 return {list:async()=>[...records.values()],append:async(record,bytes)=>{const entry={institutionId:record.institutionId,revision:1,current:record,history:[]};records.set(record.institutionId,entry);originals.set(record.artifactSha256,bytes.slice());return entry;},original:async(_id,sha)=>originals.get(sha)??null,publishPart:async()=>{},publishProof:async()=>{throw Error('NO_SIGNED_PROOF');}};
}
it('prepares the real Original without publishing or returning an accepted PASS record',async()=>{
 const store=memoryStore(),handler=createRegistryHandler({store:()=>store});
 const prepared=await handler(request('/bankeiz?prepare=1',upload()));expect(prepared.status).toBe(200);
 const result=await prepared.json();expect(result.ok).toBe(true);expect(result.plan.publication.scope).toBe('Public integration contract');
 expect(result.plan.partCount).toBe(2);expect(result.plan.originalBytes).toBe(proof.length);expect(result.entry).toBeUndefined();
 expect(await store.list()).toEqual([]);
 expect((await handler(request('/bankeiz',upload()))).status).toBe(428);
},30000);
it('keeps the published snapshot available when the native publication service is unavailable',async()=>{
 const handler=createRegistryHandler({store:()=>null});
 const listing=await(await handler(request())).json();expect(listing).toMatchObject({publishingAvailable:false,records:[]});
 const response=await handler(request('/bankeiz',upload()));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,code:'REGISTRY_PUBLICATION_UNAVAILABLE'});
});
it('does not return success when native signed publication is unconfirmed',async()=>{
 const store=memoryStore(),publishProof=vi.fn(async():Promise<RegistryInstitutionState>=>{throw Error('private native diagnostic');});
 const handler=createRegistryHandler({store:()=>({...store,publishProof})});
 const response=await handler(request('/bankeiz',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signed:{storeStateRecord:{publication:{institutionId:'bankeiz'}}}})}));expect(response.status).toBe(503);
 const body=await response.text();expect(body).not.toContain('private native diagnostic');expect(JSON.parse(body).ok).toBe(false);expect(publishProof).toHaveBeenCalledOnce();expect(await store.list()).toEqual([]);
},30000);
it('reports a definitive native refusal without promoting PASS or exposing upstream diagnostics',async()=>{
 const store=memoryStore(),publishPart=vi.fn(async()=>{throw new RegistryStoreError('REGISTRY_NATIVE_PUBLICATION_REFUSED',400);});
 const handler=createRegistryHandler({store:()=>({...store,publishPart})});
 const response=await handler(request('/bankeiz/parts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signed:{storeStateRecord:{institutionId:'bankeiz'}}})}));
 expect(response.status).toBe(400);expect(await response.json()).toMatchObject({ok:false,code:'REGISTRY_NATIVE_PUBLICATION_REFUSED',message:'Receiz refused this signed publication. The shared conformance record has not been updated.'});
 expect(publishPart).toHaveBeenCalledOnce();expect(await store.list()).toEqual([]);
});
it('rejects wrong institution, cross-origin, unsupported media, unknown routes and oversized streams without an accepted write',async()=>{
 const store=memoryStore(),append=vi.spyOn(store,'append'),handler=createRegistryHandler({store:()=>store});
 expect((await handler(request('/chase?prepare=1',upload()))).status).toBe(422);
 expect((await handler(request('/bankeiz',upload(proof,{origin:'https://attacker.example'})))).status).toBe(403);
 expect((await handler(request('/bankeiz',upload(proof,{'content-type':'image/jpeg'})))).status).toBe(415);
 expect((await handler(request('/unknown-bank',upload()))).status).toBe(404);
 expect((await handler(request('/bankeiz?prepare=1',upload(new Uint8Array(4*1024*1024+1))))).status).toBe(413);
 expect(append).not.toHaveBeenCalled();
},30000);
it('refuses a missing Original and methods other than the bounded read/upload API',async()=>{
 const handler=createRegistryHandler({store:()=>memoryStore()});
 expect((await handler(request('/original/bankeiz/'+'a'.repeat(64)))).status).toBe(404);
 expect((await handler(request('/original/bankeiz/'+'a'.repeat(64),{method:'HEAD'}))).status).toBe(404);
 expect((await handler(request('/bankeiz',{method:'DELETE'}))).status).toBe(405);
 expect((await handler(request('/original/bankeiz/../../secret'))).status).toBe(404);
});
