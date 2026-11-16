import {expect,it,vi} from 'vitest';
import {createPublicProfileDirectoryReader,handlePublicProfileDirectory,handlePublicProfileDirectoryStream} from '../server/public-profile-directory';
const uid=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const descriptor=(n:number)=>({userId:uid(n),username:'person_'+n,updatedAt:'2026-11-14T10:00:00+00:00'});
const head=(n:number)=>({profile:{userId:uid(n),username:'person_'+n,isPrivate:false,displayName:'Person '+n,updatedAt:descriptor(n).updatedAt,authorshipVerified:true,authorshipPbiReceiptHash:'a'.repeat(64),email:'never-forward'},viewer:{canView:true,isOwner:false,session:'never-forward'},stats:{originals:0},secret:'never-forward'});
const directory=(profiles:unknown[],nextCursor:string|null=null)=>({ok:true,schema:'receiz.public-profile-directory.v1',profiles,nextCursor});
it('uses fixed anonymous public reads, resolves empty-account headers once, and strips private fields',async()=>{
 const fetcher=vi.fn<typeof fetch>(async(input,options)=>{
  expect(options).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store'});expect(JSON.stringify(options)).not.toMatch(/Cookie|Authorization/);
  const url=new URL(String(input));expect(url.origin).toBe('https://receiz.com');
  if(url.pathname==='/api/profile/public-directory')return Response.json(directory([descriptor(1)]));
  expect(url.pathname).toBe('/api/profile/person_1/manifest');expect(url.searchParams.get('source')).toBe('inventory');return Response.json({ok:true,head:head(1)});
 });
 const read=createPublicProfileDirectoryReader(fetcher),first=await read();expect(first.publicProfileHeads).toHaveLength(1);expect(JSON.stringify(first)).not.toContain('never-forward');
 expect(first.publicProfileHeads[0].profile.userId).toBe(uid(1));expect(first.publicProfileHeads[0].profile).toHaveProperty('authorshipPbiReceiptHash','a'.repeat(64));
 await read();expect(fetcher.mock.calls.filter(([url])=>String(url).includes('/manifest'))).toHaveLength(1);
});
it('does not reopen exact already-held headers and advances the real directory cursor',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json(directory([descriptor(1),descriptor(2)],uid(2))));
 const page=await createPublicProfileDirectoryReader(fetcher)(undefined,[descriptor(1),descriptor(2)]);
 expect(page.nextCursor).toBe(uid(2));expect(page.publicProfileHeads).toEqual([]);expect(page.unavailable).toEqual([]);expect(fetcher).toHaveBeenCalledOnce();
});
it('keeps other profiles and later pages available when one header is unavailable or has the wrong UID',async()=>{
 const fetcher=vi.fn<typeof fetch>(async input=>{
  const path=new URL(String(input)).pathname;
  if(path==='/api/profile/public-directory')return Response.json(directory([descriptor(1),descriptor(2),descriptor(3)],uid(3)));
  if(path.includes('person_1'))return Response.json({ok:false},{status:503});
  if(path.includes('person_2'))return Response.json({ok:true,head:head(999)});
  return Response.json({ok:true,head:head(3)});
 });
 const page=await createPublicProfileDirectoryReader(fetcher)();expect(page.publicProfileHeads.map(h=>h.profile.userId)).toEqual([uid(3)]);expect(page.unavailable.map(p=>p.userId)).toEqual([uid(1),uid(2)]);expect(page.nextCursor).toBe(uid(3));
});
it('carries an exact known-owner refusal only on explicit 403, without turning missing delivery into privacy',async()=>{
 const fetcher=vi.fn<typeof fetch>(async input=>new URL(String(input)).pathname==='/api/profile/public-directory'?Response.json(directory([])):Response.json({ok:false},{status:String(input).includes('person_1')?403:404}));
 const page=await createPublicProfileDirectoryReader(fetcher)(undefined,[descriptor(1),descriptor(2)]);
 expect(page.publicProfileHeads).toEqual([{profile:{userId:uid(1),username:'person_1'},viewer:{canView:false}}]);expect(page.unavailable.map(p=>p.userId)).toEqual([uid(2)]);
});
it('rechecks a held owner omitted from the public directory even after a successful cached header',async()=>{
 let hidden=false;const fetcher=vi.fn<typeof fetch>(async input=>new URL(String(input)).pathname==='/api/profile/public-directory'?Response.json(directory(hidden?[]:[descriptor(1)])):hidden?Response.json({ok:false},{status:403}):Response.json({ok:true,head:head(1)}));
 const read=createPublicProfileDirectoryReader(fetcher);await read();hidden=true;
 const page=await read(undefined,[descriptor(1)]);expect(page.publicProfileHeads).toEqual([{profile:{userId:uid(1),username:'person_1'},viewer:{canView:false}}]);
});
it('coalesces overlapping headers and bounds active manifest reads across pages',async()=>{
 let active=0,max=0;const fetcher=vi.fn<typeof fetch>(async input=>{
  if(new URL(String(input)).pathname==='/api/profile/public-directory')return Response.json(directory(Array.from({length:20},(_,i)=>descriptor(i+1))));
  active++;max=Math.max(max,active);await new Promise(done=>setTimeout(done,1));active--;const n=Number(/person_(\d+)/.exec(String(input))![1]);return Response.json({ok:true,head:head(n)});
 });
 const read=createPublicProfileDirectoryReader(fetcher),[a,b]=await Promise.all([read(),read()]);expect(a.publicProfileHeads).toHaveLength(20);expect(b.publicProfileHeads).toHaveLength(20);expect(max).toBeLessThanOrEqual(8);expect(fetcher.mock.calls.filter(([u])=>String(u).includes('/manifest'))).toHaveLength(20);
});
it('retries a header whose update key does not match the scanned descriptor instead of caching the mismatch',async()=>{
 let stale=true;const fetcher=vi.fn<typeof fetch>(async input=>String(input).includes('/manifest')?Response.json({ok:true,head:stale?{...head(1),profile:{...head(1).profile,updatedAt:'2026-01-01T00:00:00Z'}}:head(1)}):Response.json(directory([descriptor(1)])));
 const read=createPublicProfileDirectoryReader(fetcher);expect((await read()).unavailable).toEqual([descriptor(1)]);stale=false;expect((await read()).publicProfileHeads).toHaveLength(1);expect(fetcher.mock.calls.filter(([u])=>String(u).includes('/manifest'))).toHaveLength(2);
});
it('rejects invalid requests before any remote work and does not forward cookies or authorization',async()=>{
 const read=vi.fn();for(const [url,method] of [['https://bankeiz.com/api/bank/public-profile-directory?after=bad','GET'],['https://bankeiz.com/api/bank/public-profile-directory?url=https://evil.test','GET'],['https://bankeiz.com/api/bank/public-profile-directory','POST']]){
  const response=await handlePublicProfileDirectory(new Request(url,{method,headers:{cookie:'secret',authorization:'Bearer secret'}}),read);expect(response.status).toBe(method==='POST'?405:400);
 }expect(read).not.toHaveBeenCalled();
});
it('lists a new public account directly from its existing public card with no manifest or Original reads',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({...directory([descriptor(1)]),cards:[{...descriptor(1),displayName:'New account',createdAt:'2026-11-14T10:00:00Z',avatarUrl:null,isPrivate:false,email:'never-forward'}]}));
 const page=await createPublicProfileDirectoryReader(fetcher)();expect(fetcher).toHaveBeenCalledOnce();expect(page.publicProfileHeads).toHaveLength(1);expect(page.publicProfileHeads[0]).toMatchObject({profile:{userId:uid(1),displayName:'New account'},unavailableDecorators:['profile-details']});expect(JSON.stringify(page)).not.toContain('never-forward');
});
it('forwards only the fixed public stream, preserving cancellation and omitting account credentials',async()=>{
 const abort=new AbortController(),read=vi.fn<typeof fetch>(async(_url,options)=>{expect(options).toMatchObject({credentials:'omit',redirect:'error',signal:abort.signal,headers:{accept:'text/event-stream'}});return new Response('data: {"type":"ready"}\n\n',{headers:{'content-type':'text/event-stream'}});});
 const response=await handlePublicProfileDirectoryStream(new Request('https://bankeiz.com/api/bank/public-profile-directory/stream',{signal:abort.signal,headers:{cookie:'secret',authorization:'Bearer secret'}}),read);
 expect(read.mock.calls[0][0]).toBe('https://receiz.com/api/profile/public-directory/stream');expect(await response.text()).toContain('"type":"ready"');
 expect((await handlePublicProfileDirectoryStream(new Request('https://bankeiz.com/api/bank/public-profile-directory/stream?url=https://evil.test'),read)).status).toBe(400);expect(read).toHaveBeenCalledOnce();
});
it('bypasses a cached header for an explicit missing-details hint even when the Source timestamp is unchanged',async()=>{
 let biography='Previous',reads=0;const fetcher=vi.fn<typeof fetch>(async input=>String(input).includes('/public-directory')?Response.json(directory([descriptor(1)])):(reads++,Response.json({ok:true,head:{...head(1),profile:{...head(1).profile,bio:biography}}})));
 const read=createPublicProfileDirectoryReader(fetcher);await read();biography='Accepted edit';const next=await read(undefined,[{...descriptor(1),updatedAt:null}]);expect(next.publicProfileHeads[0]).toMatchObject({profile:{bio:'Accepted edit'}});expect(reads).toBe(2);
});
