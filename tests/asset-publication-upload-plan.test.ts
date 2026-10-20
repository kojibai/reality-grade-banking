import {createHash} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {createAssetPublicationFetch} from '../src/receiz/asset-publication-runtime';

const scope={publicationVersion:2,ownerReceizId:'owner.receiz.id',username:'owner',profileIdentity:'account-owner',artifactId:'profile-showcase:owner.receiz.id',artifactDigest:'a'.repeat(64)};
const reference={kind:'bytes',sha256:'039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',byteLength:3,contentByteLength:3,height:0};
const scopeHash=createHash('sha256').update(JSON.stringify([2,'owner.receiz.id','owner','account-owner','profile-showcase:owner.receiz.id','a'.repeat(64)])).digest('hex');
const stagingObjectName=`staging/v2/${scopeHash}/${reference.sha256}/00000000-0000-4000-8000-000000000001.bin`;
const invalid='BANK_ASSET_PUBLICATION_TRANSPORT_INVALID';
const control=(action='initialize-blocks',extra:Record<string,unknown>={})=>({method:'POST',headers:{'content-type':'application/json','x-receiz-owner-id':scope.ownerReceizId,'x-receiz-profile-username':scope.username},body:JSON.stringify({action,scope,references:[reference],...extra})});
const crystalUrl=(expires=Date.now()+60_000)=>`https://crystal.example/v1/staging/${stagingObjectName}?expires=${expires}&signature=${'b'.repeat(64)}`;
const plan=(signedUrl:string)=>({status:'uploads',scope,uploads:[{reference,alreadyStored:false,stagingObjectName,signedUrl}]});
function adapter(response:()=>Response,assertCurrent=()=>{}){
 const sent:{url:string;init?:RequestInit}[]=[],controls:{path:string;init?:RequestInit}[]=[];
 const transport=createAssetPublicationFetch({applicationId:'rc_bank',username:'owner',assertCurrent,request:async(path,init)=>{controls.push({path,init});return response();},fetchImpl:async(resource,init)=>{sent.push({url:String(resource),init});return new Response(null,{status:200});}});
 return {transport,sent,controls};
}

it('delivers only the exact native signed plan while preserving response bytes and bounded PUT options',async()=>{
 const url=crystalUrl(),body=plan(url),f=adapter(()=>Response.json(body));
 const response=await f.transport('/api/profile/showcase/publication',control());
 expect(await response.json()).toEqual(body);
 await f.transport(url,{method:'PUT',body:new Uint8Array([1,2,3]),credentials:'include',redirect:'follow'});
 await f.transport(url,{method:'PUT',body:new Uint8Array([1,2,3])});
 expect(f.sent.map(value=>value.url)).toEqual([url,url]);
 expect(f.sent[0].init).toMatchObject({method:'PUT',credentials:'omit',redirect:'error'});
 expect(new Uint8Array(await new Response(f.sent[0].init?.body).arrayBuffer())).toEqual(new Uint8Array([1,2,3]));
 await expect(f.transport(url,{method:'GET'})).rejects.toThrow(invalid);
 expect(f.sent).toHaveLength(2);
});

it('preserves canonical Supabase signed uploads without admitting unissued signed-looking targets',async()=>{
 const url=`https://project.supabase.co/storage/v1/object/upload/sign/public/${stagingObjectName}?token=opaque-provider-token`,f=adapter(()=>Response.json(plan(url)));
 await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
 await f.transport('/api/profile/showcase/publication',control());
 await f.transport(url,{method:'PUT',body:new Uint8Array([1,2,3])});
 expect(f.sent).toHaveLength(1);
 expect(f.sent[0]).toMatchObject({url,init:{credentials:'omit',redirect:'error'}});
 await expect(f.transport(url.replace('opaque-provider-token','other-token'),{method:'PUT'})).rejects.toThrow(invalid);
});

it('refuses unrelated, tampered and cross-adapter targets without dispatching network bytes',async()=>{
 const url=crystalUrl(),f=adapter(()=>Response.json(plan(url)));
 await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
 await f.transport('/api/profile/showcase/publication',control());
 for(const target of [url.replace('crystal.example','other.example'),url.replace('000000000001.bin','000000000002.bin'),url.replace('signature=','signature=a'),url+'&extra=1',url+'#fragment',url.replace('https:','http:'),url.replace('https://','https://user:secret@')]){
  await expect(f.transport(target,{method:'PUT'})).rejects.toThrow(invalid);
 }
 const other=adapter(()=>Response.json(plan(url)));
 await expect(other.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
 expect(f.sent).toHaveLength(0);expect(other.sent).toHaveLength(0);
});

it('learns no targets from other operations, noncanonical routes or unsuccessful responses',async()=>{
 const url=crystalUrl();
 for(const fixture of [
  {path:'/api/profile/showcase/publication',init:control('finalize'),response:()=>Response.json(plan(url))},
  {path:'/api/profile/showcase/accepted-source?username=owner',init:undefined,response:()=>Response.json(plan(url))},
  {path:'/api/profile/owner/originals?source=inventory',init:undefined,response:()=>Response.json(plan(url))},
  {path:'/api/profile/showcase/publication',init:control(),response:()=>Response.json(plan(url),{status:403})},
  {path:'/api/profile/showcase/publication',init:control(),response:()=>Response.json({status:'pending',nested:plan(url)})},
 ]){
  const f=adapter(fixture.response);await f.transport(fixture.path,fixture.init);
  await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);expect(f.sent).toHaveLength(0);
 }
});

it('rejects mismatched scope, block reference and native target coordinates in initialization plans',async()=>{
 const url=crystalUrl(),valid=plan(url),upload=valid.uploads[0];
 for(const value of [
  {...valid,scope:{...scope,artifactDigest:'c'.repeat(64)}},
  {...valid,scope:{...scope,username:'other'}},
  {...valid,uploads:[{...upload,reference:{...reference,byteLength:2,contentByteLength:2}}]},
  {...valid,uploads:[{...upload,alreadyStored:true}]},
  {...valid,uploads:[{...upload,stagingObjectName:stagingObjectName.replace(reference.sha256,'d'.repeat(64))}]},
  {...valid,uploads:[{...upload,signedUrl:url.replace('/v1/staging/','/v1/public/')}]},
  {...valid,uploads:[{...upload,signedUrl:url.replace('https:','http:')}]},
  {...valid,uploads:[{...upload,signedUrl:url+'&expires=1'}]},
  {...valid,uploads:[{...upload,signedUrl:url.replace('signature=','unrelated=')}]},
  {...valid,uploads:[{...upload,signedUrl:url.replace('signature=','signature=g')}]},
 ]){
  const f=adapter(()=>Response.json(value));await f.transport('/api/profile/showcase/publication',control());
  await expect(f.transport(value.uploads[0].signedUrl,{method:'PUT'})).rejects.toThrow(invalid);expect(f.sent).toHaveLength(0);
 }
});

it('keeps other active batch grants and skips already stored references',async()=>{
 const first=crystalUrl(),secondName=stagingObjectName.replace('000000000001.bin','000000000002.bin'),second=first.replace(stagingObjectName,secondName);
 const values=[plan(first),{...plan(second),uploads:[{reference,alreadyStored:true}]} ,{...plan(second),uploads:[{...plan(second).uploads[0],stagingObjectName:secondName}]}];
 const f=adapter(()=>Response.json(values.shift()));
 await f.transport('/api/profile/showcase/publication',control());
 await f.transport('/api/profile/showcase/publication',control());
 await f.transport('/api/profile/showcase/publication',control());
 await f.transport(first,{method:'PUT'});await f.transport(second,{method:'PUT'});
 expect(f.sent.map(value=>value.url)).toEqual([first,second]);
});

it('issues every requested pending member of a bounded batch and no partial grant from an invalid batch',async()=>{
 const first=crystalUrl(),secondReference={...reference,sha256:'c'.repeat(64)},thirdReference={...reference,sha256:'d'.repeat(64)};
 const secondName=stagingObjectName.replace(reference.sha256,secondReference.sha256),second=first.replace(stagingObjectName,secondName);
 const firstUpload=plan(first).uploads[0],secondUpload={reference:secondReference,alreadyStored:false,stagingObjectName:secondName,signedUrl:second};
 const f=adapter(()=>Response.json({status:'uploads',scope,uploads:[firstUpload,secondUpload,{reference:thirdReference,alreadyStored:true}]}));
 await f.transport('/api/profile/showcase/publication',control('initialize-blocks',{references:[reference,secondReference,thirdReference]}));
 await Promise.all([f.transport(first,{method:'PUT'}),f.transport(second,{method:'PUT'})]);
 expect(f.sent.map(value=>value.url)).toEqual([first,second]);
 const malformed=adapter(()=>Response.json({status:'uploads',scope,uploads:[firstUpload,{...secondUpload,reference:thirdReference}]}));
 await malformed.transport('/api/profile/showcase/publication',control('initialize-blocks',{references:[reference,secondReference]}));
 await expect(malformed.transport(first,{method:'PUT'})).rejects.toThrow(invalid);
 await expect(malformed.transport(second,{method:'PUT'})).rejects.toThrow(invalid);
 expect(malformed.sent).toHaveLength(0);
});

it('does not issue grants for initialization bodies outside the current canonical request scope',async()=>{
 const url=crystalUrl();
 for(const init of [
  control('initialize-blocks',{scope:{...scope,username:'other'}}),
  control('initialize-blocks',{references:[{...reference,byteLength:2,contentByteLength:2}]}),
  {...control(),headers:{'content-type':'application/json','x-receiz-owner-id':'other.receiz.id','x-receiz-profile-username':'owner'}},
  {...control(),headers:{'content-type':'application/json','x-receiz-owner-id':scope.ownerReceizId,'x-receiz-profile-username':'other'}},
 ]){
  const f=adapter(()=>Response.json(plan(url)));await f.transport('/api/profile/showcase/publication',init);
  await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);expect(f.sent).toHaveLength(0);
 }
});

it('refuses a native capability at its exact expiry and never renews it from a local retry',async()=>{
 vi.useFakeTimers();
 try{
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  const url=crystalUrl(Date.now()+1000),f=adapter(()=>Response.json(plan(url)));
  await f.transport('/api/profile/showcase/publication',control());
  await f.transport(url,{method:'PUT'});
  vi.setSystemTime(new Date('2026-10-20T12:00:01Z'));
  await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
  await f.transport('/api/profile/showcase/publication',control());
  await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
  expect(f.sent).toHaveLength(1);
 }finally{vi.useRealTimers();}
});

it('retires committed staging grants only after their successful scoped canonical acknowledgement',async()=>{
 const url=crystalUrl();let response:unknown=plan(url);
 const f=adapter(()=>Response.json(response));
 await f.transport('/api/profile/showcase/publication',control());
 response={status:'pending',scope};
 await f.transport('/api/profile/showcase/publication',control('commit-blocks',{blocks:[{reference,stagingObjectName}]}));
 await f.transport(url,{method:'PUT'});
 response={status:'stored',scope};
 await f.transport('/api/profile/showcase/publication',control('commit-blocks',{blocks:[{reference,stagingObjectName}]}));
 await expect(f.transport(url,{method:'PUT'})).rejects.toThrow(invalid);
 expect(f.sent).toHaveLength(1);
});

it('checks current account before accepting a plan and before sending its bytes',async()=>{
 const url=crystalUrl();let current=true;
 const check=()=>{if(!current)throw Error('ACCOUNT_CHANGED');};
 const f=adapter(()=>Response.json(plan(url)),check);
 await f.transport('/api/profile/showcase/publication',control());current=false;
 await expect(f.transport(url,{method:'PUT'})).rejects.toThrow('ACCOUNT_CHANGED');expect(f.sent).toHaveLength(0);
 current=true;
 const switched=adapter(()=>{current=false;return Response.json(plan(url));},check);
 await expect(switched.transport('/api/profile/showcase/publication',control())).rejects.toThrow('ACCOUNT_CHANGED');
 expect(switched.sent).toHaveLength(0);
});

it('returns a selected native upload failure without sending to another provider',async()=>{
 const url=crystalUrl(),sent:string[]=[],controls:string[]=[];
 const transport=createAssetPublicationFetch({applicationId:'rc_bank',username:'owner',assertCurrent:()=>{},request:async path=>{controls.push(path);return Response.json(plan(url));},fetchImpl:async resource=>{sent.push(String(resource));return new Response(null,{status:503});}});
 await transport('/api/profile/showcase/publication',control());
 expect((await transport(url,{method:'PUT'})).status).toBe(503);
 expect(sent).toEqual([url]);expect(controls).toEqual(['/api/connect/profile/showcase/publication?applicationId=rc_bank']);
});
