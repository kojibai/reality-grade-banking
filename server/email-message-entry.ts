import {createHash} from 'node:crypto';
import {temporaryPbiSessionCookie} from './pbi-account-transport.js';
const prefix='/api/bank/native/email-message/',pendingName='__Secure-bankeiz-message-pending',sessionName='__Secure-bankeiz-message-session',contextName='__Secure-bankeiz-message-context';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const base={'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
type Context={conversationId:string;messageId:string;linkDigest:string;expiresAt:number};
type Pending=Context&{token:string;autoContinue:boolean};
type Session=Context&{token:string;verified?:boolean};
const fail=(status:number)=>Response.json({ok:false,error:'EMAIL_MESSAGE_ENTRY_UNAVAILABLE'},{status,headers:base});
const cookie=(name:string,value:unknown,age:number)=>`${name}=${value?Buffer.from(JSON.stringify(value)).toString('base64url'):''}; HttpOnly; Secure; SameSite=Strict; Path=${prefix.slice(0,-1)}; Max-Age=${age}`;
function readCookie<T extends Context>(request:Request,name:string):T|null{
 const matches=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(name+'='));
 if(matches.length!==1)return null;
 try{
  const raw=matches[0].slice(name.length+1);if(!/^[A-Za-z0-9_-]{1,6000}$/.test(raw))return null;
  const value=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
  return value&&Number.isSafeInteger(value.expiresAt)&&value.expiresAt>Date.now()&&value.expiresAt<=Date.now()+300000&&UUID.test(value.conversationId)&&UUID.test(value.messageId)&&typeof value.linkDigest==='string'&&/^[a-f0-9]{64}$/.test(value.linkDigest)?value:null;
 }catch{return null;}
}
function session(request:Request):Session|null{
 const context=readCookie<Session>(request,contextName),values=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(sessionName+'=')),token=values.length===1?values[0].slice(sessionName.length+1):'';
 return context&&/^[-_A-Za-z0-9.]{1,3800}$/.test(token)?{...context,token}:null;
}
function retainSession(headers:Headers,value:Session){
 const {token,...context}=value,age=Math.max(0,Math.floor((value.expiresAt-Date.now())/1000));
 headers.append('Set-Cookie',`${sessionName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=${prefix.slice(0,-1)}; Max-Age=${age}`);
 headers.append('Set-Cookie',cookie(contextName,context,age));
}
const sameLink=(left:Context,right:Context)=>left.conversationId===right.conversationId&&left.messageId===right.messageId&&left.linkDigest===right.linkDigest;
function prefetch(request:Request){return /prefetch|prerender/i.test([request.headers.get('sec-purpose'),request.headers.get('purpose')].join(' '));}
async function emptyObjectBody(request:Request){
 const reader=request.body?.getReader();if(!reader)return false;let size=0;const expected=[123,125];
 try{for(;;){const next=await reader.read();if(next.done)return size===2;for(const byte of next.value){if(size>=2||byte!==expected[size++])return false;}}}finally{await reader.cancel().catch(()=>{});}
}
async function boundedJson(response:Response):Promise<Record<string,unknown>>{
 if(response.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw Error('EMAIL_MESSAGE_RESPONSE_INVALID');
 const reader=response.body?.getReader();if(!reader)throw Error('EMAIL_MESSAGE_RESPONSE_INVALID');let size=0;const parts:Uint8Array[]=[];
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>16384)throw Error('EMAIL_MESSAGE_CAPACITY');parts.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function sessionClaims(token:string){
 // This validates shape and lifetime only. No decoded claim is trusted until
 // the fixed Native observer verifies the actual session and message scope.
 temporaryPbiSessionCookie(token);
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 if(!UUID.test(claims.uid)||typeof claims.email!=='string'||claims.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email.trim())||claims.iss!=='receiz'||claims.aud!=='receiz-web')throw Error('EMAIL_MESSAGE_SESSION_INVALID');
 return claims as {uid:string;email:string;iat:number};
}
async function nativeOperation(request:Request,held:Session,operation:'recipient'|'adopt'){
 const claims=sessionClaims(held.token),response=await fetch(`https://receiz.com/api/chat/email-entries/${held.conversationId}/${held.messageId}/${operation}`,{
  method:operation==='adopt'?'POST':'GET',headers:{Accept:'application/json',Origin:new URL(request.url).origin,Cookie:`receiz_session=${held.token}`,...(operation==='adopt'?{'Content-Type':'application/json'}:{})},
  ...(operation==='adopt'?{body:'{}'}:{}),credentials:'omit',redirect:'manual',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(45000)])
 });
 if(!response.ok)throw Error('EMAIL_MESSAGE_RECIPIENT_REQUIRED');
 const value=await boundedJson(response),recipient=value.recipient as Record<string,unknown>|undefined,invitation=value.invitation as Record<string,unknown>|undefined;
 if(value.ok!==true||recipient?.userId!==claims.uid||recipient?.email!==claims.email.trim().toLowerCase()||invitation?.conversationId!==held.conversationId||invitation?.messageId!==held.messageId||operation==='adopt'&&value.adopted!==true)throw Error('EMAIL_MESSAGE_OBSERVATION_INVALID');
 if((invitation.callId!==undefined||invitation.mode!==undefined)&&(!UUID.test(String(invitation.callId))||!['voice','video'].includes(String(invitation.mode))))throw Error('EMAIL_MESSAGE_OBSERVATION_INVALID');
 return{ok:true,recipient:{userId:recipient.userId,email:recipient.email},invitation:{conversationId:invitation.conversationId,messageId:invitation.messageId,...(invitation.callId?{callId:invitation.callId,mode:invitation.mode}:{})},...(operation==='adopt'?{adopted:true}:{})};
}
/** Stage navigation without consuming proof. The clean page opens the observed
 * account, establishes real device custody, then requests narrow adoption. */
export async function handleEmailMessageEntry(request:Request):Promise<Response>{
 const url=new URL(request.url),operation=url.pathname.slice(prefix.length);
 if(!['https://bankeiz.com','https://www.bankeiz.com'].includes(url.origin)||!url.pathname.startsWith(prefix))return fail(403);
 if(operation==='start'&&['GET','HEAD'].includes(request.method)){
  if([...url.searchParams.keys()].length!==3||!['token','conversationId','messageId'].every(key=>url.searchParams.getAll(key).length===1))return fail(400);
  const token=url.searchParams.get('token')!,conversationId=url.searchParams.get('conversationId')!,messageId=url.searchParams.get('messageId')!;
  if(!/^[A-Za-z0-9_-]{1,200}$/.test(token)||!UUID.test(conversationId)||!UUID.test(messageId))return fail(400);
  const linkDigest=createHash('sha256').update(token).digest('hex'),context={conversationId,messageId,linkDigest};
  const headers=new Headers({...base,Location:'/?emailMessage=1'});
  if(request.method==='GET'){
   const previous=session(request);
   if(previous&&!sameLink(previous,{...context,expiresAt:previous.expiresAt})){headers.append('Set-Cookie',cookie(sessionName,null,0));headers.append('Set-Cookie',cookie(contextName,null,0));}
   headers.append('Set-Cookie',cookie(pendingName,{token,...context,expiresAt:Date.now()+300000,autoContinue:!prefetch(request)},300));
  }
  return new Response(null,{status:303,headers});
 }
 if(url.search||(request.headers.has('origin')?request.headers.get('origin')!==url.origin:request.headers.get('sec-fetch-site')!=='same-origin')||prefetch(request))return fail(403);
 const names=(request.headers.get('cookie')??'').split(';').map(value=>value.trim().split('=')[0]);
 if([pendingName,sessionName,contextName].some(name=>names.filter(value=>value===name).length>1))return fail(409);
 const pending=readCookie<Pending>(request,pendingName),held=session(request);
 if(pending&&held&&!sameLink(pending,held))return fail(409);
 if(operation==='state'&&request.method==='GET'){
  if(![pendingName,sessionName,contextName].some(name=>names.includes(name)))return Response.json({ok:true,invitation:false},{headers:base});
  if(held?.verified)try{return Response.json({...await nativeOperation(request,held,'recipient'),pending:false},{headers:base});}catch{return fail(401);}
  if(held)return Response.json({ok:true,pending:true,autoContinue:true},{headers:base});
  return pending?Response.json({ok:true,pending:true,autoContinue:pending.autoContinue===true},{headers:base}):fail(401);
 }
 if(!['open','adopt'].includes(operation)||request.method!=='POST'||request.headers.get('origin')!==url.origin)return fail(403);
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json'||request.headers.get('content-length')&&Number(request.headers.get('content-length'))>2||!await emptyObjectBody(request))return fail(400);
 if(operation==='adopt'){
  if(!held?.verified)return fail(401);
  try{await nativeOperation(request,held,'recipient');return Response.json(await nativeOperation(request,held,'adopt'),{headers:base});}
  catch{const response=fail(401);retainSession(response.headers,{...held,verified:false});return response;}
 }
 let verified=held;
 try{
  if(!verified){
   if(!pending||typeof pending.token!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(pending.token)||createHash('sha256').update(pending.token).digest('hex')!==pending.linkDigest)return fail(401);
   const canonical=new URL('https://receiz.com/auth/verify');canonical.searchParams.set('token',pending.token);canonical.searchParams.set('next','/account');
   const response=await fetch(canonical,{headers:{Accept:'text/html'},redirect:'manual',credentials:'omit',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(45000)])});
   await response.body?.cancel();
   const location=response.headers.get('location'),redirect=location?new URL(location,canonical):null;
   if(![302,303,307].includes(response.status)||!redirect||redirect.origin!==canonical.origin)throw Error('EMAIL_MESSAGE_VERIFY_FAILED');
   const values=response.headers.getSetCookie().filter(value=>value.startsWith('receiz_session='));
   if(values.length!==1||!/;\s*HttpOnly(?:;|$)/i.test(values[0])||!/;\s*Secure(?:;|$)/i.test(values[0])||!/;\s*Path=\/(?:;|$)/i.test(values[0]))throw Error('EMAIL_MESSAGE_SESSION_REQUIRED');
   const token=/^receiz_session=([-_A-Za-z0-9.]+);/.exec(values[0])?.[1];if(!token)throw Error('EMAIL_MESSAGE_SESSION_REQUIRED');
   const claims=sessionClaims(token);verified={token,conversationId:pending.conversationId,messageId:pending.messageId,linkDigest:pending.linkDigest,expiresAt:Math.min(pending.expiresAt,(claims.iat+300)*1000)};
  }
  const result=await nativeOperation(request,verified,'recipient'),headers=new Headers(base);verified={...verified,verified:true};
  headers.append('Set-Cookie',temporaryPbiSessionCookie(verified.token));retainSession(headers,verified);headers.append('Set-Cookie',cookie(pendingName,null,0));
  return Response.json(result,{headers});
 }catch{
  // Keep only the closed canonical session when an observer is unavailable;
  // retries never consume the same one-shot email token a second time.
  const response=fail(401);if(verified)retainSession(response.headers,{...verified,verified:false});return response;
 }
}
