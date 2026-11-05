import {afterEach,expect,it,vi} from 'vitest';
import {handleEmailPaymentEntry} from '../server/email-payment-entry';
const base='https://bankeiz.com/api/bank/native/email-payment/';
const id='10000000-0000-4000-8000-000000000004',nonce='10000000-0000-4000-8000-000000000005',uid='10000000-0000-4000-8000-000000000002';
const token='synthetic-email-token',query=new URLSearchParams({token,transferId:id,clientNonce:nonce});
const session=()=>`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid,email:'supplier@example.test',iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
const payment={ok:true,authority:'wallet-observation',recipient:{userId:uid,email:'supplier@example.test'},payment:{id,clientNonce:nonce,conversationId:'10000000-0000-4000-8000-000000000003',messageId:id,senderUserId:'10000000-0000-4000-8000-000000000001',amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',recordedAt:'2026-11-04T12:00:00.000Z'}};
const cookies=(response:Response)=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
const post=(cookie:string)=>new Request(base+'open',{method:'POST',headers:{origin:'https://bankeiz.com','sec-fetch-site':'same-origin','content-type':'application/json',cookie},body:'{}'});
afterEach(()=>vi.unstubAllGlobals());
it('stages HEAD, prefetch and ordinary scanner GET without consuming the Source token or exposing it in HTML',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 for(const init of [{method:'HEAD'},{headers:{'sec-purpose':'prefetch','sec-fetch-user':'?1','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}},{}]){
  const result=await handleEmailPaymentEntry(new Request(base+'start?'+query,init));expect(result.status).toBe(303);expect(result.headers.get('location')).toBe('/receive/');expect(await result.text()).not.toContain(token);
  if(init.method==='HEAD')expect(result.headers.getSetCookie()).toHaveLength(0);
  else{const state=await handleEmailPaymentEntry(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie:cookies(result)}}));expect(await state.json()).toMatchObject({ok:true,pending:true,autoContinue:false});}
 }
 expect(send).not.toHaveBeenCalled();
});
it('keeps activation a convenience hint and consumes only on an exact same-origin browser POST',async()=>{
 const jwt=session(),send=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  expect(init?.redirect).toBe('manual');expect(init?.credentials).toBe('omit');
  if(String(input).startsWith('https://receiz.com/auth/verify?')){expect(init?.headers).not.toHaveProperty('Cookie');return new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/`}});}
  expect(String(input)).toBe(`https://receiz.com/api/auth/receiz-id/received-payment?clientNonce=${nonce}&transferId=${id}`);expect(init?.headers).toMatchObject({Cookie:`receiz_session=${jwt}`,Origin:'https://bankeiz.com'});return Response.json(payment);
 });vi.stubGlobal('fetch',send);
 const staged=await handleEmailPaymentEntry(new Request(base+'start?'+query,{headers:{'sec-fetch-user':'?1','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}));expect(send).not.toHaveBeenCalled();
 const cookie=cookies(staged),state=await handleEmailPaymentEntry(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie}}));expect(await state.json()).toMatchObject({pending:true,autoContinue:true});
 const opened=await handleEmailPaymentEntry(post(cookie));expect(opened.status).toBe(200);expect(await opened.json()).toEqual(payment);expect(opened.headers.getSetCookie().join(';')).toContain('__Secure-bankeiz-pbi=');expect(JSON.stringify(await handleEmailPaymentEntry(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie:cookies(opened)}})).then(r=>r.json()))).not.toContain(jwt);
 expect(send.mock.calls.filter(([input])=>String(input).includes('/auth/verify?'))).toHaveLength(1);
});
it.each(['foreign-redirect','wrong-recipient','wrong-reference','expired-cookie','bad-source-cookie'])('refuses %s before staging any PBI session',async failure=>{
 const jwt=session(),send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:failure==='foreign-redirect'?'https://foreign.example/steal':'https://receiz.com/account','set-cookie':`receiz_session=${failure==='bad-source-cookie'?'not-a-jwt':jwt}; HttpOnly; Secure; Path=/`}}):Response.json({...payment,...(failure==='wrong-recipient'?{recipient:{...payment.recipient,userId:payment.payment.senderUserId}}:{}),...(failure==='wrong-reference'?{payment:{...payment.payment,id:payment.payment.senderUserId}}:{})}));vi.stubGlobal('fetch',send);
 const staged=await handleEmailPaymentEntry(new Request(base+'start?'+query));const cookie=cookies(staged);
 if(failure==='expired-cookie'){vi.spyOn(Date,'now').mockReturnValue(Date.now()+301000);}
 try{const opened=await handleEmailPaymentEntry(post(cookie));expect(opened.ok).toBe(false);expect(opened.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');}finally{vi.restoreAllMocks();}
});
it('refuses CSRF, unsupported selectors and prefetch POSTs without upstream calls',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 for(const req of [new Request(base+'start?'+query+'&returnTo=https://foreign.example'),new Request(base+'open',{method:'POST',headers:{origin:'https://foreign.example','content-type':'application/json'},body:'{}'}),new Request(base+'open',{method:'POST',headers:{origin:'https://bankeiz.com','sec-purpose':'prefetch','content-type':'application/json'},body:'{}'})])expect((await handleEmailPaymentEntry(req)).ok).toBe(false);
 expect(send).not.toHaveBeenCalled();
 const oversized=await handleEmailPaymentEntry(new Request(base+'open',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:'x'.repeat(32769)}));expect(oversized.status).toBe(400);expect(send).not.toHaveBeenCalled();
});
it('retains the Source-issued session through a receipt outage without granting bind access or consuming the token again',async()=>{
 const jwt=session();let available=false;
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}}):available?Response.json(payment):Response.json({error:'unavailable'},{status:503}));vi.stubGlobal('fetch',send);
 const staged=await handleEmailPaymentEntry(new Request(base+'start?'+query));
 const unavailable=await handleEmailPaymentEntry(post(cookies(staged)));expect(unavailable.status).toBe(401);expect(unavailable.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');expect(unavailable.headers.getSetCookie().join(';')).toContain('__Secure-bankeiz-payment-session=');
 available=true;const resumed=await handleEmailPaymentEntry(post(cookies(unavailable)));expect(resumed.status).toBe(200);expect(await resumed.json()).toEqual(payment);expect(send.mock.calls.filter(([input])=>String(input).includes('/auth/verify?'))).toHaveLength(1);
});
it('never reuses an older payment stage for a different email link or conflicting selectors',async()=>{
 const jwt=session(),send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}}):Response.json(payment));vi.stubGlobal('fetch',send);
 const staged=await handleEmailPaymentEntry(new Request(base+'start?'+query)),opened=await handleEmailPaymentEntry(post(cookies(staged))),held=cookies(opened);
 const otherQuery=new URLSearchParams({token:'another-synthetic-token',transferId:'10000000-0000-4000-8000-000000000009',clientNonce:'another-synthetic-nonce'});
 const next=await handleEmailPaymentEntry(new Request(base+'start?'+otherQuery,{headers:{cookie:held}}));expect(next.headers.getSetCookie()).toContainEqual(expect.stringContaining('__Secure-bankeiz-payment-session=;'));
 const pending=next.headers.getSetCookie().find(value=>value.startsWith('__Secure-bankeiz-payment-pending='))!.split(';')[0];
 const conflict=await handleEmailPaymentEntry(post(held+'; '+pending));expect(conflict.status).toBe(409);expect(send).toHaveBeenCalledTimes(2);
});
it('keeps a supported long canonical session within browser cookie capacity without re-encoding or exposing it',async()=>{
 const jwt=`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid,email:'supplier@example.test',iss:'receiz',aud:'receiz-web',subscriptionTerm:{syntheticPadding:'x'.repeat(2300)}})).toString('base64url')}.signature`;
 expect(jwt.length).toBeLessThan(3800);const send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}}):Response.json(payment));vi.stubGlobal('fetch',send);
 const staged=await handleEmailPaymentEntry(new Request(base+'start?'+query)),opened=await handleEmailPaymentEntry(post(cookies(staged)));expect(opened.status).toBe(200);expect(opened.headers.getSetCookie().every(value=>value.length<4096)).toBe(true);expect(await opened.text()).not.toContain(jwt);
 const resumed=await handleEmailPaymentEntry(post(cookies(opened)));expect(resumed.status).toBe(200);expect(send.mock.calls.filter(([input])=>String(input).includes('/auth/verify?'))).toHaveLength(1);
});
