import {parsePublicProfile,parsePublicOriginal,profileUsername,type PublicProfile,type PublicProfileHeader} from '../src/receiz/public-profile.js';
import {readPublicShowcaseRelease} from '../src/receiz/public-showcase-release.js';
import {reuseShippedProfileShareHistory} from './profile-share-history.js';
import {profileAvatarUrl} from '../src/receiz/profile-avatar.js';
export class PublicProfileError extends Error {constructor(message:string,public status:number){super(message);}}
const LIMIT=32*1024*1024;
async function readBody(response:Response,limit=LIMIT){
 if(Number(response.headers.get('content-length'))>limit)throw Error('PROFILE_PAGE_TOO_LARGE');
 const reader=response.body?.getReader();if(!reader)throw Error('PROFILE_UNAVAILABLE');const parts:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw Error('PROFILE_PAGE_TOO_LARGE');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
/** Coalesces simultaneous reads only. Fresh named reads enforce current
 * privacy/handle ownership instead of serving a previous owner's response. */
export function createPublicProfileReader(fetchImpl:typeof fetch=fetch,enrich:(profile:PublicProfile)=>Promise<PublicProfile>=reuseShippedProfileShareHistory){
 const pending=new Map<string,Promise<PublicProfile>>();
 return(username:string,cursor?:string):Promise<PublicProfile>=>{
  if(!profileUsername(username)||cursor!==undefined&&(!cursor||cursor.length>4096||/[\x00-\x1f\x7f]/.test(cursor)))return Promise.reject(new PublicProfileError('PROFILE_USERNAME_INVALID',400));
  const key=username+':'+(cursor??'');const previous=pending.get(key);if(previous)return previous;
  const attempt=(async()=>{
   // Legacy Originals cursors carry no immutable account UID. An explicit
   // expansion therefore reads one complete identity-bound snapshot instead
   // of appending rows resolved through a potentially reassigned handle.
   // This is the same canonical public route used by Receiz itself. The
   // generic profile read reconstructs discovery and can stall a cold page.
   // Read the admitted collection once; the UI windows its already-held rows.
   const response=await fetchImpl(`https://receiz.com/api/profile/${username}?surface=public-route&representation=collection-v2`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25_000),headers:{accept:'application/json'}});
   if(!response.ok){await response.body?.cancel().catch(()=>{});throw new PublicProfileError(response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE',[403,404].includes(response.status)?response.status:503);}
   const input=await readBody(response);
   try{
    const profile=parsePublicProfile(input,username),release=readPublicShowcaseRelease(response.headers.get('x-receiz-public-showcase-release'),profile);
    if(release&&release.revision===response.headers.get('x-receiz-profile-public-collection-revision'))profile.publicShowcaseRelease=release;
    if(cursor&&cursor!=='all:'+profile.userId)throw new PublicProfileError('PROFILE_CHANGED',409);
    if(cursor&&profile.nextCursor)throw Error('PROFILE_COLLECTION_INCOMPLETE');
    return enrich(profile);
   }catch(cause){if(cause instanceof PublicProfileError)throw cause;throw new PublicProfileError(cause instanceof Error?cause.message:'PROFILE_UNAVAILABLE',cause instanceof Error&&cause.message==='PROFILE_PRIVATE'?403:503);}
  })();pending.set(key,attempt);void attempt.finally(()=>{if(pending.get(key)===attempt)pending.delete(key);}).catch(()=>{});return attempt;
 };
}
export const readPublicProfile=createPublicProfileReader();
/** Explicit pending-publication observation only. Receiz returns selected
 * display headers without opening Source, Account or the collection body. */
export function createPublicShowcaseReleaseReader(fetchImpl:typeof fetch=(input,init)=>fetch(input,init)){
 const pending=new Map<string,Promise<ReturnType<typeof readPublicShowcaseRelease>>>();
 return(username:string):Promise<ReturnType<typeof readPublicShowcaseRelease>>=>{
  if(!profileUsername(username))return Promise.reject(new PublicProfileError('PROFILE_USERNAME_INVALID',400));
  const held=pending.get(username);if(held)return held;
  const attempt=(async()=>{
   const response=await fetchImpl(`https://receiz.com/api/profile/${username}?surface=public-route&representation=collection-v2`,{method:'HEAD',credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
   await response.body?.cancel().catch(()=>{});
   if(response.status===204||response.status===405)return null;
   if(!response.ok)throw new PublicProfileError(response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE',[403,404].includes(response.status)?response.status:503);
   const raw=response.headers.get('x-receiz-public-showcase-release');if(!raw)return null;
   if(raw.length>1024)throw new PublicProfileError('PROFILE_RELEASE_INVALID',503);
   let value:unknown;try{value=JSON.parse(raw);}catch{throw new PublicProfileError('PROFILE_RELEASE_INVALID',503);}
   const uid=(value as {ownerUserId?:unknown})?.ownerUserId;
   const release=typeof uid==='string'?readPublicShowcaseRelease(value,{userId:uid,username}):null;
   if(!release||release.revision!==response.headers.get('x-receiz-profile-public-collection-revision'))throw new PublicProfileError('PROFILE_RELEASE_INVALID',503);
   return release;
  })();pending.set(username,attempt);void attempt.finally(()=>{if(pending.get(username)===attempt)pending.delete(username);}).catch(()=>{});return attempt;
 };
}
export const readPublicShowcaseReleaseHead=createPublicShowcaseReleaseReader();
/** Public metadata for a collection already held by the caller. The manifest
 * supplies its real viewer and account binding; it does not select membership. */
export function createPublicProfileHeaderReader(fetchImpl:typeof fetch=fetch){
 const pending=new Map<string,Promise<PublicProfileHeader>>();
 return(username:string):Promise<PublicProfileHeader>=>{
  if(!profileUsername(username))return Promise.reject(new PublicProfileError('PROFILE_USERNAME_INVALID',400));
  const held=pending.get(username);if(held)return held;
  const attempt=(async()=>{
   const response=await fetchImpl(`https://receiz.com/api/profile/${username}/manifest`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{accept:'application/json'}});
   if(!response.ok){await response.body?.cancel().catch(()=>{});throw new PublicProfileError(response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE',[403,404].includes(response.status)?response.status:503);}
   const input=await readBody(response,512*1024);
   try{
    const {items:_items,nextCursor:_cursor,...header}=parsePublicProfile({ok:input?.ok,profile:input?.head},username);
    return header;
   }catch(cause){throw new PublicProfileError(cause instanceof Error?cause.message:'PROFILE_UNAVAILABLE',cause instanceof Error&&cause.message==='PROFILE_PRIVATE'?403:503);}
  })();pending.set(username,attempt);void attempt.finally(()=>{if(pending.get(username)===attempt)pending.delete(username);}).catch(()=>{});return attempt;
 };
}
export const readPublicProfileHeader=createPublicProfileHeaderReader();
type OriginalReader<T>=(username:string,originalId:string)=>Promise<T|null>;
export function createPublicOriginalReader(fetchImpl?:typeof fetch):OriginalReader<ReturnType<typeof parsePublicOriginal>>;
export function createPublicOriginalReader<T extends ReturnType<typeof parsePublicOriginal>>(fetchImpl:typeof fetch,project:(input:unknown,username:string,originalId:string)=>T):OriginalReader<T>;
export function createPublicOriginalReader(fetchImpl:typeof fetch=fetch,project:typeof parsePublicOriginal=parsePublicOriginal){
 return async(username:string,originalId:string)=>{
  if(!profileUsername(username)||!/^[A-Za-z0-9_-]{1,128}$/.test(originalId))throw new PublicProfileError('PROFILE_ORIGINAL_INVALID',400);
  const response=await fetchImpl(`https://receiz.com/api/profile/${username}/originals/${originalId}/verified`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12_000),headers:{accept:'application/json'}});
  if(!response.ok){await response.body?.cancel().catch(()=>{});if([403,404].includes(response.status))return null;throw new PublicProfileError('PROFILE_UNAVAILABLE',503);}
  return project(await readBody(response),username,originalId);
 };
}
export const readPublicOriginal=createPublicOriginalReader();
const portraitReads=new Map<string,Promise<{username:string;avatarUrl:string|null}>>();
function readPublicPortrait(username:string){
 const held=portraitReads.get(username);if(held)return held;
 const attempt=(async()=>{
  const response=await fetch(`https://receiz.com/api/profile/${username}/viewer`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{accept:'application/json'}});
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw new PublicProfileError('PROFILE_UNAVAILABLE',[403,404].includes(response.status)?response.status:503);}
  const value=await readBody(response,512*1024);
  if(value?.ok!==true||value.profile?.username!==username||value.profile?.isPrivate!==false||value.viewer?.canView!==true)throw new PublicProfileError('PROFILE_UNAVAILABLE',403);
  return{username,avatarUrl:profileAvatarUrl(value.profile.avatarUrl)};
 })();portraitReads.set(username,attempt);void attempt.finally(()=>{if(portraitReads.get(username)===attempt)portraitReads.delete(username);}).catch(()=>{});return attempt;
}
export async function handlePublicProfile(request:Request){
 const url=new URL(request.url),match=/^\/api\/bank\/public-profile\/([a-z0-9_]{3,24})$/.exec(url.pathname),headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
 if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
 const view=url.searchParams.get('view'),portrait=view==='portrait',head=view==='head',release=view==='release';
 if(!match||url.hash||[...url.searchParams.keys()].some(key=>(portrait||head||release?key!=='view':key!=='cursor')||url.searchParams.getAll(key).length!==1))return Response.json({error:'PROFILE_REQUEST_INVALID'},{status:400,headers});
 if(release)try{return Response.json(await readPublicShowcaseReleaseHead(match[1]),{headers});}catch(cause){return Response.json({error:cause instanceof PublicProfileError?cause.message:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
 if(portrait)try{return Response.json(await readPublicPortrait(match[1]),{headers});}catch(cause){return Response.json({error:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
 if(head)try{return Response.json(await readPublicProfileHeader(match[1]),{headers});}catch(cause){return Response.json({error:cause instanceof PublicProfileError?cause.message:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
 try{return Response.json(await readPublicProfile(match[1],url.searchParams.get('cursor')??undefined),{headers});}
 catch(cause){return Response.json({error:cause instanceof PublicProfileError?cause.message:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
}
