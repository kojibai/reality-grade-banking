import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {createAssetPublicationFetch} from '../src/receiz/asset-publication-runtime';

// Transport qualification only: these controlled responses issue upload
// coordinates. They do not claim proof admission, custody or server execution.
const uid='13c41d48-d844-414f-9f72-efae2db63325',otherUid='23c41d48-d844-414f-9f72-efae2db63325';
const bucket='receiz-profile-originals-private',route='/api/profile/originals/upload-signed';
const invalid='BANK_ASSET_PUBLICATION_TRANSPORT_INVALID';
const bytes=new Uint8Array([1,2,3]),sha=createHash('sha256').update(bytes).digest('hex');
const original={privateOriginal:true,filename:'sealed-work.pdf',mime:'application/pdf',sha256Hex:sha,size:bytes.byteLength};
type Original=typeof original;
type Provider='crystal'|'supabase';
const pathFor=(value:Original)=>`originals/${uid}/${value.sha256Hex}.pdf`;
const control=(body:unknown=original):RequestInit=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
function issued(provider:Provider='crystal',value:Original=original,expires=Date.now()+60_000){
 const path=pathFor(value),scope=createHash('sha256').update(JSON.stringify(['receiz.profile-original-upload.v1',uid,bucket,path,value.sha256Hex,value.size,value.mime])).digest('hex');
 const stagingObjectName=`staging/v2/${scope}/${value.sha256Hex}/00000000-0000-4000-8000-000000000001.bin`;
 const signedUrl=provider==='crystal'?`https://crystal.example/v1/staging/${stagingObjectName}?expires=${expires}&signature=${'b'.repeat(64)}`:`https://project.supabase.co/storage/v1/object/upload/sign/${bucket}/${path}?token=opaque-provider-token`;
 return {ok:true,provider,upload:{name:value.filename,path,sha256Hex:value.sha256Hex,size:value.size,mime:value.mime,storage:{bucket,path},...(provider==='crystal'?{stagingObjectName}:{}),signedUrl}};
}
function adapter(response:()=>Response,options:{profileIdentity?:string;assertCurrent?:()=>void;putStatus?:number}={}){
 const sent:{url:string;init?:RequestInit}[]=[],controls:{path:string;init?:RequestInit}[]=[];
 const transport=createAssetPublicationFetch({applicationId:'rc_Bank',username:'owner',profileIdentity:options.profileIdentity??uid,assertCurrent:options.assertCurrent??(()=>{}),request:async(path,init)=>{controls.push({path,init});return response();},fetchImpl:async(resource,init)=>{sent.push({url:String(resource),init});return new Response(null,{status:options.putStatus??200});}});
 return {transport,sent,controls};
}
afterEach(()=>vi.useRealTimers());

it.each(['crystal','supabase'] as const)('forwards only the selected private upload request and its exact issued %s PUT',async provider=>{
 const plan=issued(provider),f=adapter(()=>Response.json(plan),{profileIdentity:uid.toUpperCase()});
 expect(f.controls).toEqual([]);expect(f.sent).toEqual([]);
 const init=control(),response=await f.transport(route,init);
 expect(await response.json()).toEqual(plan);
 expect(f.controls).toEqual([{path:'/api/connect/profile/showcase/publication?applicationId=rc_Bank&action=private-original-upload',init}]);
 await f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes,headers:{'content-type':original.mime},credentials:'include',redirect:'follow'});
 expect(f.sent).toHaveLength(1);
 expect(f.sent[0]).toMatchObject({url:plan.upload.signedUrl,init:{method:'PUT',credentials:'omit',redirect:'error',headers:{'content-type':original.mime}}});
 expect(new Uint8Array(await new Response(f.sent[0].init?.body).arrayBuffer())).toEqual(bytes);
 await expect(f.transport(plan.upload.signedUrl,{method:'GET'})).rejects.toThrow(invalid);
 expect(f.controls).toHaveLength(1);expect(f.sent).toHaveLength(1);
});

it('does not send bytes to direct private storage, a public bucket, foreign origins or unissued signed targets',async()=>{
 const plan=issued(),f=adapter(()=>Response.json(plan));
 const targets=[plan.upload.signedUrl,`https://crystal.example/v1/private/${bucket}/${pathFor(original)}`,`https://project.supabase.co/storage/v1/object/${bucket}/${pathFor(original)}`,issued('supabase').upload.signedUrl,`/api/profile/originals/upload`,`${route}?privateOriginal=1`];
 for(const target of targets)await expect(f.transport(target,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 expect(f.controls).toEqual([]);expect(f.sent).toEqual([]);
 await f.transport(route,control());
 for(const target of [plan.upload.signedUrl.replace('crystal.example','foreign.example'),plan.upload.signedUrl.replace('000000000001.bin','000000000002.bin'),plan.upload.signedUrl+'&extra=1',plan.upload.signedUrl.replace('signature=','signature=a'),plan.upload.signedUrl+'#fragment',issued('supabase').upload.signedUrl.replace(bucket,'receiz-profile-originals')])await expect(f.transport(target,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 const other=adapter(()=>Response.json(plan));await expect(other.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 expect(f.sent).toEqual([]);expect(other.sent).toEqual([]);
});

it.each([
 {label:'another owner path',change:{path:`originals/${otherUid}/${sha}.pdf`}},
 {label:'another digest',change:{sha256Hex:'c'.repeat(64)}},
 {label:'another size',change:{size:bytes.byteLength+1}},
 {label:'another MIME',change:{mime:'image/png'}},
 {label:'public storage bucket',change:{storage:{bucket:'receiz-profile-originals',path:pathFor(original)}}},
 {label:'another storage path',change:{storage:{bucket,path:`originals/${otherUid}/${sha}.pdf`}}},
])('refuses a private upload response with $label before learning its signed target',async({change})=>{
 const plan=issued(),f=adapter(()=>Response.json({...plan,upload:{...plan.upload,...change}}));
 await expect(f.transport(route,control())).rejects.toThrow(invalid);
 await expect(f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 expect(f.controls).toHaveLength(1);expect(f.sent).toEqual([]);
});

it.each([
 {label:'not explicitly private',body:{...original,privateOriginal:false}},
 {label:'malformed digest',body:{...original,sha256Hex:'not-a-digest'}},
 {label:'empty file',body:{...original,size:0}},
 {label:'fractional size',body:{...original,size:1.5}},
 {label:'over transport capacity',body:{...original,size:64*1024*1024+1}},
 {label:'missing MIME',body:{...original,mime:null}},
 {label:'missing filename',body:{...original,filename:null}},
 {label:'unknown action',body:{...original,action:'publish'}},
 {label:'oversized control body',body:{...original,extra:'x'.repeat(16*1024)}},
])('does not forward a private upload request with $label',async({body})=>{
 const f=adapter(()=>Response.json(issued()));
 await expect(f.transport(route,control(body))).rejects.toThrow(invalid);
 expect(f.controls).toEqual([]);expect(f.sent).toEqual([]);
});

it('requires a current owner UID and the exact canonical POST route',async()=>{
 const plan=issued();
 for(const profileIdentity of ['', 'another-account']){
  const f=adapter(()=>Response.json(plan),{profileIdentity});
  await expect(f.transport(route,control())).rejects.toThrow();expect(f.controls).toEqual([]);expect(f.sent).toEqual([]);
 }
 const f=adapter(()=>Response.json(plan));
 for(const [target,init] of [[route,{method:'GET'}],[route+'?other=1',control()],['https://foreign.example'+route,control()],[route,{method:'POST',body:'{'}]] as const){
  await expect(f.transport(target,init)).rejects.toThrow();
 }
 expect(f.controls).toEqual([]);expect(f.sent).toEqual([]);
});

it.each([
 {label:'unsupported provider',response:{...issued(),provider:'other'}},
 {label:'unsuccessful envelope',response:{...issued(),ok:false}},
 {label:'missing upload tuple',response:{ok:true,provider:'crystal'}},
 {label:'non-JSON success',response:'not-json'},
])('never learns a private target from $label',async({response})=>{
 const f=adapter(()=>typeof response==='string'?new Response(response):Response.json(response));
 await expect(f.transport(route,control())).rejects.toThrow(invalid);
 await expect(f.transport(issued().upload.signedUrl,{method:'PUT'})).rejects.toThrow(invalid);
 expect(f.sent).toEqual([]);
});

it('rejects malformed issued native targets and wrong-bucket Supabase targets without sending bytes',async()=>{
 const plan=issued(),privatePlan=issued('supabase');
 const plans=[...[
  plan.upload.signedUrl.replace('https:','http:'),plan.upload.signedUrl.replace('https://','https://user:secret@'),plan.upload.signedUrl+'#fragment',plan.upload.signedUrl+'&extra=1',plan.upload.signedUrl.replace('signature=','unrelated='),plan.upload.signedUrl.replace('signature=','signature=g'),
 ].map(signedUrl=>({...plan,upload:{...plan.upload,signedUrl}})),{...plan,upload:{...plan.upload,stagingObjectName:plan.upload.stagingObjectName!.replace(sha,'c'.repeat(64))}},{...privatePlan,upload:{...privatePlan.upload,signedUrl:privatePlan.upload.signedUrl.replace(bucket,'receiz-profile-originals')}}];
 for(const response of plans){
  const f=adapter(()=>Response.json(response));await expect(f.transport(route,control())).rejects.toThrow();
  await expect(f.transport(response.upload.signedUrl,{method:'PUT'})).rejects.toThrow(invalid);expect(f.sent).toEqual([]);
 }
});

it('accepts an already retained private tuple without enabling a redundant PUT',async()=>{
 const plan=issued(),response={...plan,upload:{...plan.upload,alreadyStored:true}},f=adapter(()=>Response.json(response));
 expect(await(await f.transport(route,control())).json()).toEqual(response);
 await expect(f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 expect(f.sent).toEqual([]);
});

it('retires only the matching completed tuple and preserves other in-flight private files',async()=>{
 const secondOriginal={...original,sha256Hex:'d'.repeat(64)},first=issued(),second=issued('crystal',secondOriginal);
 let response:unknown=first;const f=adapter(()=>Response.json(response));
 await f.transport(route,control());response=second;await f.transport(route,control(secondOriginal));
 await expect(f.transport(route,control({...original,action:'complete',path:pathFor(original).replace(uid,otherUid)}))).rejects.toThrow(invalid);
 expect(f.controls).toHaveLength(2);
 await f.transport(first.upload.signedUrl,{method:'PUT',body:bytes});await f.transport(second.upload.signedUrl,{method:'PUT',body:bytes});
 response={...first,upload:{...first.upload,size:original.size+1}};
 await expect(f.transport(route,control({...original,action:'complete',path:pathFor(original),stagingObjectName:first.upload.stagingObjectName}))).rejects.toThrow(invalid);
 await f.transport(first.upload.signedUrl,{method:'PUT',body:bytes});
 response={...first,upload:{...first.upload,signedUrl:undefined}};
 const complete=control({...original,action:'complete',path:pathFor(original),stagingObjectName:first.upload.stagingObjectName});
 expect(await(await f.transport(route,complete)).json()).toEqual(JSON.parse(JSON.stringify(response)));
 expect(f.controls.at(-1)?.init).toEqual(complete);
 await expect(f.transport(first.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 await f.transport(second.upload.signedUrl,{method:'PUT',body:bytes});
 expect(f.sent.map(value=>value.url)).toEqual([first.upload.signedUrl,second.upload.signedUrl,first.upload.signedUrl,second.upload.signedUrl]);
});

it.each([403,503])('preserves HTTP %s control failure and keeps a previously issued retry until scoped completion',async status=>{
 const plan=issued();let failure=false;
 const f=adapter(()=>failure?Response.json({ok:false,error:'private_original_unavailable'},{status}):Response.json(plan));
 await f.transport(route,control());failure=true;
 const complete=control({...original,action:'complete',path:pathFor(original),stagingObjectName:plan.upload.stagingObjectName});
 const response=await f.transport(route,complete);expect(response.status).toBe(status);expect(await response.json()).toEqual({ok:false,error:'private_original_unavailable'});
 await f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes});expect(f.sent).toHaveLength(1);
 const unissued=adapter(()=>Response.json(plan,{status}));await unissued.transport(route,control());
 await expect(unissued.transport(plan.upload.signedUrl,{method:'PUT'})).rejects.toThrow(invalid);expect(unissued.sent).toEqual([]);
});

it('returns a private PUT failure without changing provider or issuing another control request',async()=>{
 const plan=issued(),f=adapter(()=>Response.json(plan),{putStatus:503});await f.transport(route,control());
 expect((await f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).status).toBe(503);
 expect(f.controls).toHaveLength(1);expect(f.sent.map(value=>value.url)).toEqual([plan.upload.signedUrl]);
});

it('checks current owner before receiving a grant and before sending private bytes',async()=>{
 let current=true;const check=()=>{if(!current)throw Error('ACCOUNT_CHANGED');},plan=issued();
 const f=adapter(()=>Response.json(plan),{assertCurrent:check});await f.transport(route,control());current=false;
 await expect(f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow('ACCOUNT_CHANGED');expect(f.sent).toEqual([]);
 current=true;const changed=adapter(()=>{current=false;return Response.json(plan);},{assertCurrent:check});
 await expect(changed.transport(route,control())).rejects.toThrow('ACCOUNT_CHANGED');expect(changed.sent).toEqual([]);
});

it('expires a native private target at its issued deadline without local renewal',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
 const plan=issued('crystal',original,Date.now()+1000),f=adapter(()=>Response.json(plan));
 await f.transport(route,control());await f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes});
 vi.setSystemTime(new Date('2026-11-12T12:00:01Z'));
 await expect(f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 await expect(f.transport(route,control())).rejects.toThrow();
 await expect(f.transport(plan.upload.signedUrl,{method:'PUT',body:bytes})).rejects.toThrow(invalid);
 expect(f.sent).toHaveLength(1);
});
