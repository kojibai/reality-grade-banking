import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {createRegistryHandler} from '../server/registry';
import type {RegistryStore} from '../server/registry-store';
import type {RegistryInstitutionState,RegistryPublication} from '../src/registry/types';
const proof=new Uint8Array(readFileSync('public/conformance/bankeiz-public-conformance.png'));
const request=(path='',init?:RequestInit)=>new Request('https://bankeiz.com/api/bank/registry'+path,init);
const upload=(bytes=proof,headers?:Record<string,string>)=>({method:'POST',headers:{'content-type':'image/png',origin:'https://bankeiz.com',...headers},body:bytes} as RequestInit);
function memoryStore():RegistryStore {
 const records=new Map<string,RegistryInstitutionState>(),originals=new Map<string,Uint8Array>();
 return {list:async()=>[...records.values()],append:async(record,bytes)=>{const entry={institutionId:record.institutionId,revision:1,current:record,history:[]};records.set(record.institutionId,entry);originals.set(record.artifactSha256,bytes.slice());return entry;},original:async(_id,sha)=>originals.get(sha)??null};
}
it('publishes the real verified Original durably before returning a scoped PASS record, readable by another visitor',async()=>{
 const store=memoryStore(),handler=createRegistryHandler({store:()=>store});
 const accepted=await handler(request('/bankeiz',upload()));expect(accepted.status).toBe(200);
 const result=await accepted.json();expect(result.ok).toBe(true);expect(result.entry.current.scope).toBe('Public integration contract');
 const otherVisitor=createRegistryHandler({store:()=>store});
 const listing=await(await otherVisitor(request())).json();expect(listing.records).toEqual([result.entry]);
 const original=await otherVisitor(new Request('https://bankeiz.com'+result.entry.current.url));
 expect(original.status).toBe(200);expect(new Uint8Array(await original.arrayBuffer())).toEqual(proof);
 expect(original.headers.get('content-type')).toBe('image/png');
},30000);
it('keeps static results available but refuses publication when production storage is not configured',async()=>{
 const handler=createRegistryHandler({store:()=>null});
 const listing=await(await handler(request())).json();expect(listing).toMatchObject({publishingAvailable:false,records:[]});
 const response=await handler(request('/bankeiz',upload()));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({ok:false,code:'REGISTRY_PUBLICATION_UNAVAILABLE'});
});
it('does not return success or mutate a record when durable publication fails',async()=>{
 const store=memoryStore(),append=vi.fn(async(_record:RegistryPublication,_bytes:Uint8Array):Promise<RegistryInstitutionState>=>{throw Error('private storage diagnostic');});
 const handler=createRegistryHandler({store:()=>({...store,append})});
 const response=await handler(request('/bankeiz',upload()));expect(response.status).toBe(503);
 const body=await response.text();expect(body).not.toContain('private storage diagnostic');expect(JSON.parse(body).ok).toBe(false);expect(append).toHaveBeenCalledOnce();expect(await store.list()).toEqual([]);
},30000);
it('rejects wrong institution, cross-origin, unsupported media, unknown routes and oversized streams without an accepted write',async()=>{
 const store=memoryStore(),append=vi.spyOn(store,'append'),handler=createRegistryHandler({store:()=>store});
 expect((await handler(request('/chase',upload()))).status).toBe(422);
 expect((await handler(request('/bankeiz',upload(proof,{origin:'https://attacker.example'})))).status).toBe(403);
 expect((await handler(request('/bankeiz',upload(proof,{'content-type':'application/json'})))).status).toBe(415);
 expect((await handler(request('/unknown-bank',upload()))).status).toBe(404);
 expect((await handler(request('/bankeiz',upload(new Uint8Array(4*1024*1024+1))))).status).toBe(413);
 expect(append).not.toHaveBeenCalled();
},30000);
it('refuses a missing Original and methods other than the bounded read/upload API',async()=>{
 const handler=createRegistryHandler({store:()=>memoryStore()});
 expect((await handler(request('/original/bankeiz/'+'a'.repeat(64)))).status).toBe(404);
 expect((await handler(request('/original/bankeiz/'+'a'.repeat(64),{method:'HEAD'}))).status).toBe(404);
 expect((await handler(request('/bankeiz',{method:'DELETE'}))).status).toBe(405);
 expect((await handler(request('/original/bankeiz/../../secret'))).status).toBe(404);
});
