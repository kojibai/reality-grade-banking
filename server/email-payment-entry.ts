import {temporaryPbiSessionCookie} from './pbi-account-transport.js';
const prefix='/api/bank/native/email-payment/',pendingName='__Secure-bankeiz-payment-pending',sessionName='__Secure-bankeiz-payment-session',contextName='__Secure-bankeiz-payment-context';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,NONCE=/^[A-Za-z0-9._:-]{8,120}$/;
const base={'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
type Pending={token:string;transferId:string;clientNonce:string;expiresAt:number;autoContinue:boolean};
type Session={token:string;transferId:string;clientNonce:string;expiresAt:number;verified?:boolean};
const fail=(status:number)=>Response.json({ok:false,error:'EMAIL_PAYMENT_ENTRY_UNAVAILABLE'},{status,headers:base});
const cookie=(name:string,value:unknown,age:number)=>`${name}=${value?Buffer.from(JSON.stringify(value)).toString('base64url'):''}; HttpOnly; Secure; SameSite=Strict; Path=${prefix.slice(0,-1)}; Max-Age=${age}`;
function session(request:Request):Session|null{
 const context=readCookie<Omit<Session,'token'>>(request,contextName),values=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(sessionName+'=')),token=values.length===1?values[0].slice(sessionName.length+1):'';
 return context&&/^[-_A-Za-z0-9.]{1,3800}$/.test(token)?{...context,token}:null;
}
function retainSession(headers:Headers,value:Session){
 const {token,...context}=value,age=Math.max(0,Math.floor((value.expiresAt-Date.now())/1000));
 // Keep the original JWT unexpanded so every existing supported session fits
 // the browser's per-cookie capacity, including carried subscription terms.
 headers.append('Set-Cookie',`${sessionName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=${prefix.slice(0,-1)}; Max-Age=${age}`);
 headers.append('Set-Cookie',cookie(contextName,context,age));
}
function readCookie<T>(request:Request,name:string):T|null{
 const matches=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(name+'='));
 if(matches.length!==1)return null;
 try{const raw=matches[0].slice(name.length+1);if(!/^[A-Za-z0-9_-]{1,6000}$/.test(raw))return null;const value=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));return value&&Number.isSafeInteger(value.expiresAt)&&value.expiresAt>Date.now()&&value.expiresAt<=Date.now()+300000&&UUID.test(value.transferId)&&NONCE.test(value.clientNonce)?value:null;}catch{return null;}
}
function prefetch(request:Request){return /prefetch|prerender/i.test([request.headers.get('sec-purpose'),request.headers.get('purpose')].join(' '));}
async function emptyObjectBody(request:Request){
 const reader=request.body?.getReader();if(!reader)return false;let size=0;const expected=[123,125];
 try{for(;;){const next=await reader.read();if(next.done)return size===2;for(const byte of next.value){if(size>=2||byte!==expected[size++])return false;}}}finally{await reader.cancel().catch(()=>{});}
}
async function boundedJson(response:Response):Promise<Record<string,unknown>>{
 if(response.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw Error('EMAIL_PAYMENT_RESPONSE_INVALID');
 const reader=response.body?.getReader();if(!reader)throw Error('EMAIL_PAYMENT_RESPONSE_INVALID');let size=0;const parts:Uint8Array[]=[];
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>16384)throw Error('EMAIL_PAYMENT_CAPACITY');parts.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function sessionClaims(token:string){
 temporaryPbiSessionCookie(token);
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 if(!UUID.test(claims.uid)||typeof claims.email!=='string'||claims.email.length>254||claims.iss!=='receiz'||claims.aud!=='receiz-web')throw Error('EMAIL_PAYMENT_SESSION_INVALID');
 return claims as {uid:string;email:string;iat:number};
}
async function observe(request:Request,session:Session){
 const claims=sessionClaims(session.token),query=new URLSearchParams({clientNonce:session.clientNonce,transferId:session.transferId});
 const response=await fetch(`https://receiz.com/api/auth/receiz-id/received-payment?${query}`,{headers:{Accept:'application/json',Origin:new URL(request.url).origin,Cookie:`receiz_session=${session.token}`},credentials:'omit',redirect:'manual',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(45000)])});
 if(!response.ok)throw Error('EMAIL_PAYMENT_RECIPIENT_REQUIRED');
 const value=await boundedJson(response),recipient=value.recipient as Record<string,unknown>|undefined,payment=value.payment as Record<string,unknown>|undefined;
 if(value.ok!==true||value.authority!=='wallet-observation'||recipient?.userId!==claims.uid||recipient?.email!==claims.email.trim().toLowerCase()||payment?.id!==session.transferId||payment?.clientNonce!==session.clientNonce||!UUID.test(String(payment?.conversationId))||!UUID.test(String(payment?.messageId))||!UUID.test(String(payment?.senderUserId))||payment?.senderUserId===recipient.userId||!['amountUsdCents','amountPhiMicro','usdPerPhiMicrocents'].every(key=>typeof payment[key]==='string'&&/^[1-9]\d{0,35}$/.test(payment[key] as string))||typeof payment.recordedAt!=='string'||!Number.isFinite(Date.parse(payment.recordedAt)))throw Error('EMAIL_PAYMENT_OBSERVATION_INVALID');
 return{ok:true,authority:'wallet-observation',recipient:{userId:recipient.userId,email:recipient.email},payment:{id:payment.id,clientNonce:payment.clientNonce,conversationId:payment.conversationId,messageId:payment.messageId,senderUserId:payment.senderUserId,amountUsdCents:payment.amountUsdCents,amountPhiMicro:payment.amountPhiMicro,usdPerPhiMicrocents:payment.usdPerPhiMicrocents,recordedAt:payment.recordedAt}};
}
/** GET never consumes email authority. Only the clean page's guarded POST
 * invokes the existing canonical one-shot verifier, then checks the exact payee. */
export async function handleEmailPaymentEntry(request:Request):Promise<Response>{
 const url=new URL(request.url),operation=url.pathname.slice(prefix.length);
 if(!['https://bankeiz.com','https://www.bankeiz.com'].includes(url.origin)||!url.pathname.startsWith(prefix))return fail(403);
 if(operation==='start'&&['GET','HEAD'].includes(request.method)){
  if([...url.searchParams.keys()].length!==3||!['token','transferId','clientNonce'].every(key=>url.searchParams.getAll(key).length===1))return fail(400);
  const token=url.searchParams.get('token')!,transferId=url.searchParams.get('transferId')!,clientNonce=url.searchParams.get('clientNonce')!;
  if(!/^[A-Za-z0-9_-]{1,200}$/.test(token)||!UUID.test(transferId)||!NONCE.test(clientNonce))return fail(400);
  const headers=new Headers({...base,Location:'/receive/'});
  if(request.method==='GET'){
   const previous=session(request);
   if(previous&&(previous.transferId!==transferId||previous.clientNonce!==clientNonce)){headers.append('Set-Cookie',cookie(sessionName,null,0));headers.append('Set-Cookie',cookie(contextName,null,0));}
   headers.append('Set-Cookie',cookie(pendingName,{token,transferId,clientNonce,expiresAt:Date.now()+300000,autoContinue:!prefetch(request)&&request.headers.get('sec-fetch-user')==='?1'&&request.headers.get('sec-fetch-mode')==='navigate'&&request.headers.get('sec-fetch-dest')==='document'},300));
  }
  return new Response(null,{status:303,headers});
 }
 if(url.search||(request.headers.has('origin')?request.headers.get('origin')!==url.origin:request.headers.get('sec-fetch-site')!=='same-origin'))return fail(403);
 if(prefetch(request))return fail(403);
 const names=(request.headers.get('cookie')??'').split(';').map(value=>value.trim().split('=')[0]);
 if([pendingName,sessionName,contextName].some(name=>names.filter(value=>value===name).length>1))return fail(409);
 const pending=readCookie<Pending>(request,pendingName),held=session(request);
 if(pending&&held&&(pending.transferId!==held.transferId||pending.clientNonce!==held.clientNonce))return fail(409);
 if(operation==='state'&&request.method==='GET'){
  if(held?.verified)try{return Response.json({...await observe(request,held),pending:false},{headers:base});}catch{return fail(401);}
  if(held)return Response.json({ok:true,pending:true,autoContinue:true},{headers:base});
  return pending?Response.json({ok:true,pending:true,autoContinue:pending.autoContinue===true},{headers:base}):fail(401);
 }
 if(operation!=='open'||request.method!=='POST'||request.headers.get('origin')!==url.origin)return fail(403);
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json'||request.headers.get('content-length')&&Number(request.headers.get('content-length'))>2)return fail(400);
 if(!await emptyObjectBody(request))return fail(400);
 let verified=held;
 try{
  if(!verified){
   if(!pending)return fail(401);
   const canonical=new URL('https://receiz.com/auth/verify');canonical.searchParams.set('token',pending.token);canonical.searchParams.set('next','/account');
   const response=await fetch(canonical,{headers:{Accept:'text/html'},redirect:'manual',credentials:'omit',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(45000)])});
   await response.body?.cancel();
   const location=response.headers.get('location'),redirect=location?new URL(location,canonical):null;
   if(![302,303,307].includes(response.status)||!redirect||redirect.origin!==canonical.origin)throw Error('EMAIL_PAYMENT_VERIFY_FAILED');
   const values=response.headers.getSetCookie().filter(value=>value.startsWith('receiz_session='));
   if(values.length!==1||!/;\s*HttpOnly(?:;|$)/i.test(values[0])||!/;\s*Secure(?:;|$)/i.test(values[0])||!/;\s*Path=\/(?:;|$)/i.test(values[0]))throw Error('EMAIL_PAYMENT_SESSION_REQUIRED');
   const token=/^receiz_session=([-_A-Za-z0-9.]+);/.exec(values[0])?.[1];if(!token)throw Error('EMAIL_PAYMENT_SESSION_REQUIRED');
   const claims=sessionClaims(token);verified={token,transferId:pending.transferId,clientNonce:pending.clientNonce,expiresAt:Math.min(pending.expiresAt,(claims.iat+300)*1000)};
  }
  const result=await observe(request,verified),headers=new Headers(base);verified={...verified,verified:true};
  headers.append('Set-Cookie',temporaryPbiSessionCookie(verified.token));retainSession(headers,verified);headers.append('Set-Cookie',cookie(pendingName,null,0));
  return Response.json(result,{headers});
 }catch{
  // Preserve the actual canonical session across a later observation outage,
  // isolated from the binding transport until the exact recipient read passes.
  const response=fail(401);
  if(verified)retainSession(response.headers,{...verified,verified:false});
  return response;
 }
}
