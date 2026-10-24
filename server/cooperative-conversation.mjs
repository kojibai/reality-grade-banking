import {createHash,randomUUID} from 'node:crypto';
const OWNER='bjklock',ORIGIN='https://receiz.com',MAX=18000;
const address=v=>typeof v==='string'&&v.length<=254&&/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
async function readBody(req){const reader=req.body?.getReader();if(!reader)return '';const chunks=[];let total=0;for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX){await reader.cancel();throw Error('TOO_LARGE');}chunks.push(value);}return new TextDecoder().decode(Buffer.concat(chunks));}
function visitor(req){const raw=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('receiz_world_visitor='))?.split('=').slice(1).join('=');let value='';try{value=decodeURIComponent(raw??'').trim().toLowerCase().replace(/[^a-z0-9:_-]+/g,'').slice(0,120);}catch{}return value.length>=8?value:null;}
export async function handleCooperativeConversation(request,{fetch:transport=globalThis.fetch}={}){
 const existing=visitor(request),who=existing??'guest_'+randomUUID(),thread='cooperatives:'+createHash('sha256').update(who).digest('hex').slice(0,40);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Set-Cookie':`receiz_world_visitor=${encodeURIComponent(who)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${new URL(request.url).protocol==='https:'?'; Secure':''}`};
 const result=(status,value)=>Response.json(value,{status,headers});
 const fail=(status,error)=>result(status,{ok:false,error});
 if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, POST','Cache-Control':'no-store'}});
 if(request.method==='POST'){
  const origin=request.headers.get('origin'),allowed=new Set(['https://bankeiz.com','https://www.bankeiz.com',new URL(request.url).origin]);
  if(!origin||!allowed.has(origin)||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'ORIGIN_REFUSED');
  // The browser must receive guest continuity on a read before any write. A lost
  // first response can therefore never move a retained operation to another guest.
  if(!existing)return fail(409,'GUEST_CONTINUITY_REQUIRED');
 }
 const nativeHeaders={'Content-Type':'application/json',Accept:'application/json',Cookie:'receiz_world_visitor='+who};
 if(request.headers.get('user-agent'))nativeHeaders['User-Agent']=request.headers.get('user-agent').slice(0,512);
 // Only the platform-attested client address is forwarded. Caller-supplied
 // owner/session/authentication headers never cross this public guest boundary.
 const ip=request.headers.get('x-vercel-forwarded-for');if(ip&&ip.length<128)nativeHeaders['X-Forwarded-For']=ip;
 try{
  if(request.method==='GET'){
   const url=new URL(`/api/world/profile/${OWNER}`,ORIGIN);url.searchParams.set('visitorKey',who);url.searchParams.set('threadKey',thread);
   const response=await transport(url,{headers:nativeHeaders,signal:AbortSignal.timeout(20000)}),data=await response.json();
   if(!response.ok||data.ok!==true)return result(response.status>=400?response.status:502,{ok:false,error:typeof data.error==='string'?data.error:'RECEIZ_UNAVAILABLE'});
   if(data.world?.username!==OWNER)return fail(502,'RECEIZ_SOURCE_MISMATCH');
   if(new URL(request.url).searchParams.get('availability')==='1'){
    const availability=await transport(ORIGIN+'/api/calendar/embed/'+OWNER,{headers:nativeHeaders,signal:AbortSignal.timeout(20000)}),calendar=await availability.json();
    if(!availability.ok||calendar.ok!==true)return fail(502,'CALENDAR_UNAVAILABLE');
    return result(200,{...data,availability:{slots:calendar.slots,customQuestions:calendar.customQuestions,slotMinutes:calendar.slotMinutes}});
   }
   return result(200,data);
  }
  if(Number(request.headers.get('content-length'))>MAX)return fail(413,'REQUEST_TOO_LARGE');
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return fail(415,'JSON_REQUIRED');
  let body;try{body=JSON.parse(await readBody(request));}catch(cause){return fail(cause.message==='TOO_LARGE'?413:400,'INVALID_REQUEST');}
  if(!body||body.consent!==true||!['message','book'].includes(body.action))return fail(400,'REVIEW_REQUIRED');
  const common={visitorKey:who,threadKey:thread,allowBrowserVoiceFallback:false};let payload;
  if(body.action==='message'){
   if(!text(body.message,6500)||!text(body.clientOperationId,160)||body.clientOperationId.length<8||!Number.isFinite(Date.parse(body.quoteExpiresAt)))return fail(400,'MESSAGE_REQUIRED');
   payload={...common,action:'message',message:body.message,clientOperationId:body.clientOperationId,quoteExpiresAt:body.quoteExpiresAt,clientContext:{pagePath:typeof body.pagePath==='string'&&/^\/cooperatives\//.test(body.pagePath)?body.pagePath.slice(0,200):'/cooperatives/',locale:typeof body.locale==='string'?body.locale.slice(0,32):null,timezone:typeof body.timezone==='string'?body.timezone.slice(0,120):null}};
  }else{
   if(body.confirmed!==true||!text(body.name,72)||!address(body.email)||!Number.isFinite(Date.parse(body.slotStartAt))||body.notes!==undefined&&(typeof body.notes!=='string'||body.notes.length>900)||body.timezone!==undefined&&(typeof body.timezone!=='string'||body.timezone.length>80))return fail(400,'BOOKING_REVIEW_REQUIRED');
   const questions=body.questions??[];if(!Array.isArray(questions)||questions.length>12||questions.some(q=>!q||!text(q.id,64)||!text(q.label,120)||typeof q.answer!=='string'||q.answer.length>300))return fail(400,'BOOKING_QUESTIONS_REQUIRED');
   payload={...common,action:'book',slotStartAt:body.slotStartAt,name:body.name,email:body.email,notes:body.notes??'',timezone:body.timezone??'',questions:questions.map(q=>({id:q.id,label:q.label,required:q.required===true,answer:q.answer}))};
  }
  const response=await transport(ORIGIN+'/api/world/profile/'+OWNER,{method:'POST',headers:nativeHeaders,body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)}),data=await response.json();
  if(!response.ok||data.ok!==true)return result(response.status>=400?response.status:502,{ok:false,error:typeof data.error==='string'?data.error:'RECEIZ_RESULT_UNCONFIRMED',...(typeof data.operationStatus==='string'?{operationStatus:data.operationStatus}:{})});
  if(data.world?.username!==OWNER||typeof data.reply?.message!=='string')return fail(502,'RECEIZ_SOURCE_MISMATCH');
  if(body.action==='book'){
   const confirmed=data.reply.bookingConfirmation;
   if(!confirmed?.eventId||confirmed.startAt!==body.slotStartAt||confirmed.attendeeEmail?.toLowerCase()!==body.email.toLowerCase())return fail(502,'RECEIZ_RESULT_UNCONFIRMED');
  }
  // Preserve the actual native reply, memory, booking confirmation and source
  // relationships. This relay never fabricates an ownership or calendar result.
  return result(200,data);
 }catch{return fail(502,'RECEIZ_RESULT_UNCONFIRMED');}
}
