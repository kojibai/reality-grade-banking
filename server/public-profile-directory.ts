import {curatePublicProfileHead,type PublicProfileHead,type PublicProfileHeadRefusal} from '../src/receiz/public-profile-header.js';
import {PROFILE_DIRECTORY_PAGE_SIZE,publicProfileDescriptor,publicProfileDirectoryUid,type PublicProfileDescriptor} from '../src/receiz/public-profile-directory-contract.js';
export interface PublicProfileDirectoryPage {ok:true;schema:'bank.public-profile-directory.v1';profiles:PublicProfileDescriptor[];publicProfileHeads:(PublicProfileHead|PublicProfileHeadRefusal)[];unavailable:PublicProfileDescriptor[];nextCursor:string|null}
const options=()=>({credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{accept:'application/json'}} as const);
async function readJson(response:Response,limit:number):Promise<unknown>{
 if(Number(response.headers.get('content-length'))>limit)throw Error('PROFILE_DIRECTORY_TOO_LARGE');
 const reader=response.body?.getReader();if(!reader)throw Error('PROFILE_DIRECTORY_UNAVAILABLE');
 const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw Error('PROFILE_DIRECTORY_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
/** Fixed anonymous Source reads, with bounded delivery reuse. A directory row
 * never admits a header: the existing public manifest must bind its UID/handle. */
export function createPublicProfileDirectoryReader(fetchImpl:typeof fetch=fetch){
 const pages=new Map<string,Promise<{profiles:PublicProfileDescriptor[];cards:Map<string,PublicProfileHead>;nextCursor:string|null}>>(),pending=new Map<string,Promise<PublicProfileHead|PublicProfileHeadRefusal|null>>();
 const cache=new Map<string,{key:string;head:PublicProfileHead;bytes:number}>();let cacheBytes=0,active=0;const waiters:(()=>void)[]=[];
 async function slot<T>(work:()=>Promise<T>):Promise<T>{if(active>=8)await new Promise<void>(resolve=>waiters.push(resolve));else active++;try{return await work();}finally{const next=waiters.shift();if(next)next();else active--;}}
 function metadata(after?:string){
  const key=after??'',held=pages.get(key);if(held)return held;
  const attempt=(async()=>{
   const url=new URL('https://receiz.com/api/profile/public-directory');url.searchParams.set('limit',String(PROFILE_DIRECTORY_PAGE_SIZE));if(after)url.searchParams.set('after',after);
   const response=await fetchImpl(url.href,options());if(!response.ok){await response.body?.cancel();throw Error('PROFILE_DIRECTORY_UNAVAILABLE');}
   const input=await readJson(response,4*1024*1024) as Record<string,unknown>;
   if(input.ok!==true||input.schema!=='receiz.public-profile-directory.v1'||!Array.isArray(input.profiles)||input.profiles.length>PROFILE_DIRECTORY_PAGE_SIZE||input.nextCursor!==null&&!publicProfileDirectoryUid(input.nextCursor))throw Error('PROFILE_DIRECTORY_INVALID');
   const profiles:PublicProfileDescriptor[]=[];let previous=after??'';const handles=new Set<string>();
   for(const raw of input.profiles){const profile=publicProfileDescriptor(raw);if(!profile||profile.userId<=previous||handles.has(profile.username))throw Error('PROFILE_DIRECTORY_INVALID');profiles.push(profile);previous=profile.userId;handles.add(profile.username);}
   if(input.nextCursor!==null&&(!profiles.length||input.nextCursor!==previous))throw Error('PROFILE_DIRECTORY_INVALID');
   const cards=new Map<string,PublicProfileHead>();
   if(input.cards!==undefined){
    if(!Array.isArray(input.cards)||input.cards.length>PROFILE_DIRECTORY_PAGE_SIZE)throw Error('PROFILE_DIRECTORY_INVALID');const bindings=new Map(profiles.map(p=>[p.userId,p]));
    for(const raw of input.cards){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('PROFILE_DIRECTORY_INVALID');const card=raw as Record<string,unknown>,binding=bindings.get(String(card.userId));
     if(!binding||card.username!==binding.username||card.updatedAt!==binding.updatedAt||card.isPrivate!==false||cards.has(binding.userId))throw Error('PROFILE_DIRECTORY_INVALID');
     const head=curatePublicProfileHead({profile:card,viewer:{canView:true},unavailableDecorators:['profile-details']});if(!head)throw Error('PROFILE_DIRECTORY_INVALID');cards.set(binding.userId,head);
    }
   }
   return{profiles,cards,nextCursor:input.nextCursor as string|null};
  })();pages.set(key,attempt);void attempt.finally(()=>{if(pages.get(key)===attempt)pages.delete(key);}).catch(()=>{});return attempt;
 }
 function header(profile:PublicProfileDescriptor,recheck=false){
  const key=JSON.stringify([profile,recheck]),held=cache.get(profile.userId);if(!recheck&&profile.updatedAt!==null&&held?.key===key){cache.delete(profile.userId);cache.set(profile.userId,held);return Promise.resolve(held.head);}
  const existing=pending.get(key);if(existing)return existing;
  const attempt=slot(async()=>{
   try{
    const response=await fetchImpl(`https://receiz.com/api/profile/${profile.username}/manifest?source=inventory`,options());
    if(!response.ok){await response.body?.cancel();if(response.status===403){const old=cache.get(profile.userId);if(old){cacheBytes-=old.bytes;cache.delete(profile.userId);}return{profile:{userId:profile.userId,username:profile.username},viewer:{canView:false as const}};}return null;}
    const input=await readJson(response,512*1024) as {ok?:unknown;head?:unknown};const head=input.ok===true?curatePublicProfileHead(input.head):null;
    if(!head||head.profile.userId!==profile.userId||head.profile.username!==profile.username||profile.updatedAt!==null&&head.profile.updatedAt!==profile.updatedAt)return null;
    const bytes=new TextEncoder().encode(JSON.stringify(head)).length,old=cache.get(profile.userId);if(old)cacheBytes-=old.bytes;cache.delete(profile.userId);cache.set(profile.userId,{key,head,bytes});cacheBytes+=bytes;
    while(cacheBytes>8*1024*1024){const first=cache.keys().next().value!;cacheBytes-=cache.get(first)!.bytes;cache.delete(first);}return head;
   }catch{return null;}
  });pending.set(key,attempt);void attempt.finally(()=>{if(pending.get(key)===attempt)pending.delete(key);}).catch(()=>{});return attempt;
 }
 return async(after?:string,known:readonly PublicProfileDescriptor[]=[]):Promise<PublicProfileDirectoryPage>=>{
  if(after!==undefined&&!publicProfileDirectoryUid(after)||known.length>PROFILE_DIRECTORY_PAGE_SIZE)throw Error('PROFILE_DIRECTORY_REQUEST_INVALID');
  const page=await metadata(after),hints=known.map(publicProfileDescriptor);if(hints.some(p=>!p||p.userId<=(after??''))||new Set(hints.map(p=>p!.userId)).size!==hints.length)throw Error('PROFILE_DIRECTORY_REQUEST_INVALID');
  hints.sort((a,b)=>a!.userId.localeCompare(b!.userId));let nextCursor=page.nextCursor;
  // Scan held bindings too, so a long run of now-private owners cannot be
  // skipped when the public-only Source cursor advances past them.
  const lastHint=hints.at(-1)?.userId;if(hints.length===PROFILE_DIRECTORY_PAGE_SIZE&&lastHint&&(nextCursor===null||lastHint<nextCursor))nextCursor=lastHint;
  const profiles=page.profiles.filter(p=>nextCursor===null||p.userId<=nextCursor),byUid=new Map(profiles.map(p=>[p.userId,p])),knownByUid=new Map(hints.map(p=>[p!.userId,p!]));
  const requests=profiles.filter(p=>p.updatedAt===null||JSON.stringify(knownByUid.get(p.userId))!==JSON.stringify(p));
  for(const hint of hints){if(hint&&!byUid.has(hint.userId)&&(nextCursor===null||hint.userId<=nextCursor))requests.push(hint);}
  const resolved=await Promise.all(requests.map(async p=>{
   const card=page.cards.get(p.userId);
   // Existing profile cards already carry the public name/portrait. New
   // accounts need no Original or per-profile manifest to enter Discover.
   const head=card&&!knownByUid.has(p.userId)?card:await header(p,!byUid.has(p.userId)||knownByUid.get(p.userId)?.updatedAt===null);
   return{profile:p,head:head??card??null};
  }));
  return{ok:true,schema:'bank.public-profile-directory.v1',profiles,publicProfileHeads:resolved.flatMap(row=>row.head?[row.head]:[]),unavailable:resolved.filter(row=>!row.head).map(row=>row.profile),nextCursor};
 };
}
const readDirectory=createPublicProfileDirectoryReader();
/** Forward only the fixed anonymous public-card stream. No session or cookies. */
export async function handlePublicProfileDirectoryStream(request:Request,read:typeof fetch=fetch):Promise<Response>{
 const headers={'cache-control':'no-store, no-transform','x-content-type-options':'nosniff','x-accel-buffering':'no'};
 if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,allow:'GET'}});
 if(new URL(request.url).search)return new Response(null,{status:400,headers});
 try{const response=await read('https://receiz.com/api/profile/public-directory/stream',{credentials:'omit',cache:'no-store',redirect:'error',signal:request.signal,headers:{accept:'text/event-stream'}});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')||!response.body){void response.body?.cancel();return new Response(null,{status:503,headers});}
  return new Response(response.body,{headers:{...headers,'content-type':'text/event-stream; charset=utf-8'}});
 }catch{return new Response(null,{status:503,headers});}
}
export async function handlePublicProfileDirectory(request:Request,read:ReturnType<typeof createPublicProfileDirectoryReader>=readDirectory):Promise<Response>{
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'},url=new URL(request.url);
 if(request.method!=='GET')return Response.json({ok:false},{status:405,headers:{...headers,allow:'GET'}});
 if([...url.searchParams.keys()].some(key=>key!=='after'||url.searchParams.getAll(key).length!==1)||url.searchParams.has('after')&&!publicProfileDirectoryUid(url.searchParams.get('after')))return Response.json({ok:false},{status:400,headers});
 let known:PublicProfileDescriptor[]=[];try{const raw=request.headers.get('x-receiz-held-profile-heads');if(raw){if(raw.length>16*1024)throw Error();const input=JSON.parse(raw);if(!Array.isArray(input)||input.length>PROFILE_DIRECTORY_PAGE_SIZE)throw Error();const parsed=input.map(publicProfileDescriptor);if(parsed.some(p=>!p))throw Error();known=parsed as PublicProfileDescriptor[];}}catch{return Response.json({ok:false},{status:400,headers});}
 try{const bytes=new TextEncoder().encode(JSON.stringify(await read(url.searchParams.get('after')??undefined,known)));let offset=0;return new Response(new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}const end=Math.min(offset+64*1024,bytes.length);controller.enqueue(bytes.subarray(offset,end));offset=end;}}),{headers:{...headers,'content-type':'application/json; charset=utf-8'}});}catch{return Response.json({ok:false,error:'Public profiles are temporarily unavailable.'},{status:503,headers});}
}
