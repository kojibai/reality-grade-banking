import {parseOriginalsObservation} from '../src/qualification/observation.js';
/** Fixed public, read-only upstream; no credentials, payments or policy writes. */
export async function handleOriginalsQualification(request:Request,fetchImpl:typeof fetch=fetch){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
 const url=new URL(request.url),match=/^\/api\/bank\/originals-qualification\/([a-z0-9_]{3,24})$/.exec(url.pathname);
 if(!match||url.search)return Response.json({ok:false,error:'QUALIFICATION_REQUEST_INVALID'},{status:400,headers});
 try{
  const response=await fetchImpl(`https://receiz.com/api/profile/${match[1]}/originals-qualification`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25_000)});
  if(!response.ok)return Response.json({ok:false,error:'QUALIFICATION_SOURCE_UNAVAILABLE'},{status:503,headers});
  const input=await response.json();
  if(typeof input?.observation?.accountUid!=='string'||input.observation.username!==match[1])throw Error('QUALIFICATION_SOURCE_INVALID');
  const observation=parseOriginalsObservation(input,input.observation.accountUid);
  return Response.json({ok:true,observation},{headers});
 }catch{return Response.json({ok:false,error:'QUALIFICATION_SOURCE_UNAVAILABLE'},{status:503,headers});}
}
