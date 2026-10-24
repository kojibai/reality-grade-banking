import {parsePublicProfile,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
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
export function createPublicProfileReader(fetchImpl:typeof fetch=fetch){
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
    const profile=parsePublicProfile(input,username);
    if(cursor&&cursor!=='all:'+profile.userId)throw new PublicProfileError('PROFILE_CHANGED',409);
    if(cursor&&profile.nextCursor)throw Error('PROFILE_COLLECTION_INCOMPLETE');
    return profile;
   }catch(cause){if(cause instanceof PublicProfileError)throw cause;throw new PublicProfileError(cause instanceof Error?cause.message:'PROFILE_UNAVAILABLE',cause instanceof Error&&cause.message==='PROFILE_PRIVATE'?403:503);}
  })();pending.set(key,attempt);void attempt.finally(()=>{if(pending.get(key)===attempt)pending.delete(key);}).catch(()=>{});return attempt;
 };
}
export const readPublicProfile=createPublicProfileReader();
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
 const portrait=url.searchParams.get('view')==='portrait';
 if(!match||url.hash||[...url.searchParams.keys()].some(key=>(portrait?key!=='view':key!=='cursor')||url.searchParams.getAll(key).length!==1))return Response.json({error:'PROFILE_REQUEST_INVALID'},{status:400,headers});
 if(portrait)try{return Response.json(await readPublicPortrait(match[1]),{headers});}catch(cause){return Response.json({error:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
 try{return Response.json(await readPublicProfile(match[1],url.searchParams.get('cursor')??undefined),{headers});}
 catch(cause){return Response.json({error:cause instanceof PublicProfileError?cause.message:'PROFILE_UNAVAILABLE'},{status:cause instanceof PublicProfileError?cause.status:503,headers});}
}
