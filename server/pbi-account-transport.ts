/** A closed, temporary transport for the existing canonical PBI ceremony.
 * Canonical account/session admission remains in Receiz. No bearer reaches JS. */
const prefix='/api/bank/native/pbi/';
const cookieName='__Secure-bankeiz-pbi';
const routes:Record<string,{path:string;method:'GET'|'POST';session?:boolean}>={
 finish:{path:'/api/auth/passkey/finish',method:'POST'},
 switch:{path:'/api/auth/receiz-id/switch',method:'POST'},
 enroll:{path:'/api/auth/passkey/enroll/begin',method:'POST',session:true},
 bind:{path:'/api/auth/receiz-id/pbi-account',method:'POST',session:true},
 'credential-source':{path:'/api/auth/receiz-id/pbi-account',method:'GET',session:true},
 credential:{path:'/api/pbi/webauthn/credential',method:'GET',session:true},
 'presence-challenge':{path:'/api/auth/identity-key/challenge',method:'POST',session:true},
 'presence-enroll':{path:'/api/auth/identity-key/enroll',method:'POST',session:true},
};
const base={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
function recentSession(token:string){
 try{if(token.length>3800||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))return false;
  const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')),now=Math.floor(Date.now()/1000);
  // This is only an additional lifetime bound. Receiz verifies the signature,
  // issuer, audience and account on every session-bearing upstream operation.
  return Number.isSafeInteger(payload.iat)&&payload.iat<=now+30&&payload.iat>=now-300;
 }catch{return false;}
}
const cookie=(token:string,age:number)=>`${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/bank/native/pbi; Max-Age=${age}`;
async function bounded(body:ReadableStream<Uint8Array>|null,limit:number){
 if(!body)return new Uint8Array();const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>limit)throw Error('PBI_CAPACITY');parts.push(next.value);}return Buffer.concat(parts);}finally{await reader.cancel().catch(()=>{});}
}
export async function relayPbiAccount(request:Request):Promise<Response>{
 const url=new URL(request.url),fail=(status:number)=>Response.json({ok:false,error:'PBI_ACCOUNT_TRANSPORT_UNAVAILABLE'},{status,headers:base});
 const local=process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(url.hostname);
 if(!['https://bankeiz.com','https://www.bankeiz.com'].includes(url.origin)&&!local)return fail(403);
 if(request.headers.has('origin')?request.headers.get('origin')!==url.origin:request.method!=='GET'||request.headers.get('sec-fetch-site')!=='same-origin')return fail(403);
 if(url.pathname===prefix+'close'&&request.method==='POST'&&!url.search)return Response.json({ok:true},{headers:{...base,'Set-Cookie':cookie('',0)}});
 const operation=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length):'',route=routes[operation];
 if(!route||request.method!==route.method)return fail(400);
 if(operation==='credential-source'){
  if([...url.searchParams.keys()].length!==2||!['accountUid','credentialId'].every(key=>url.searchParams.getAll(key).length===1)||!/^[-_A-Za-z0-9]{1,2048}$/.test(url.searchParams.get('credentialId')??'')||!/^[-A-Za-z0-9]{1,160}$/.test(url.searchParams.get('accountUid')??''))return fail(400);
 }else if(operation==='credential'&&url.search){
  if([...url.searchParams.keys()].length!==1||url.searchParams.getAll('credentialId').length!==1||!/^[-_A-Za-z0-9]{1,2048}$/.test(url.searchParams.get('credentialId')??''))return fail(400);
 }else if(url.search)return fail(400);
 const values=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(cookieName+'='));
 const token=values.length===1?values[0].slice(cookieName.length+1):'';
 if(route.session&&!recentSession(token))return fail(401);
 try{
  const headers:Record<string,string>={Accept:'application/json',Origin:url.origin};
  if(route.session||operation==='finish'){if(recentSession(token))headers.Cookie=`receiz_session=${token}`;}
  let body:Uint8Array|undefined;
  if(route.method==='POST'){
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return fail(415);
   body=await bounded(request.body,32*1024);headers['Content-Type']='application/json';
  }
  const upstream=await fetch(`https://receiz.com${route.path}${url.search}`,{method:route.method,headers,body:body?new Uint8Array(body).buffer:undefined,redirect:'error',credentials:'omit',signal:AbortSignal.any([request.signal,AbortSignal.timeout(45000)])});
  if(upstream.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return fail(502);
  const bytes=await bounded(upstream.body,12*1024*1024),responseHeaders=new Headers({...base,'Content-Type':'application/json'});
  for(const value of operation==='finish'||operation==='switch'?upstream.headers.getSetCookie():[]){
   const match=/^receiz_session=([-_A-Za-z0-9.]+);/.exec(value);
   if(match&&recentSession(match[1]))responseHeaders.set('Set-Cookie',cookie(match[1],300));
  }
  return new Response(bytes,{status:upstream.status,headers:responseHeaders});
 }catch{return fail(503);}
}
