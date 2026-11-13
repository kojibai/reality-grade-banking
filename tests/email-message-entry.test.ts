import {afterEach,expect,it,vi} from 'vitest';
import {relayNativeAccount} from '../server/native-account';
const base='https://bankeiz.com/api/bank/native/email-message/';
const conversationId='10000000-0000-4000-8000-000000000004',messageId='10000000-0000-4000-8000-000000000005',uid='10000000-0000-4000-8000-000000000002',email='recipient@example.test';
const query=new URLSearchParams({token:'synthetic-email-token',conversationId,messageId});
const observation={ok:true,recipient:{userId:uid,email},invitation:{conversationId,messageId}};
const jwt=(userId=uid,address=email)=>`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid:userId,email:address,iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
const canonical=(token=jwt())=>new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${token}; HttpOnly; Secure; Path=/`}});
function jar(){const values=new Map<string,string>();return{read:()=>[...values].map(([key,value])=>key+'='+value).join('; '),retain(response:Response){for(const cookie of response.headers.getSetCookie()){const raw=cookie.split(';')[0],at=raw.indexOf('=');if(raw.slice(at+1))values.set(raw.slice(0,at),raw.slice(at+1));else values.delete(raw.slice(0,at));}}};}
const post=(cookie:string,operation='open',body='{}')=>new Request(base+operation,{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json',cookie},body});
const state=(cookie:string)=>new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie}});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('stages the exact message without consuming email proof, leaking the token, or asking for another click',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 const staged=await relayNativeAccount(new Request(base+'start?'+query));
 expect(staged.status).toBe(303);expect(staged.headers.get('location')).toBe('/?emailMessage=1');expect(await staged.text()).not.toContain('synthetic-email-token');
 expect(staged.headers.getSetCookie().every(value=>value.includes('HttpOnly; Secure; SameSite=Strict; Path=/api/bank/native/email-message;'))).toBe(true);
 const held=jar();held.retain(staged);expect(await (await relayNativeAccount(state(held.read()))).json()).toEqual({ok:true,pending:true,autoContinue:true});expect(send).not.toHaveBeenCalled();
});
it('verifies the canonical account and exact message before exposing the closed recovery session, then freshly observes before narrow adoption',async()=>{
 const token=jwt(),calls:string[]=[];vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push(url);expect(init).toMatchObject({credentials:'omit',redirect:'manual',cache:'no-store'});
  if(url.startsWith('https://receiz.com/auth/verify?')){expect(new URL(url).searchParams.get('next')).toBe('/account');return canonical(token);}
  expect(new Headers(init?.headers).get('cookie')).toBe(`receiz_session=${token}`);expect(new Headers(init?.headers).get('origin')).toBe('https://bankeiz.com');
  if(url.endsWith('/adopt')){expect(url).toBe(`https://receiz.com/api/chat/email-entries/${conversationId}/${messageId}/adopt`);expect(init?.method).toBe('POST');expect(init?.body).toBe('{}');return Response.json({...observation,adopted:true});}
  expect(url).toBe(`https://receiz.com/api/chat/email-entries/${conversationId}/${messageId}/recipient`);expect(init?.method).toBe('GET');return Response.json(observation);
 });
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));
 const opened=await relayNativeAccount(post(held.read()));held.retain(opened);expect(await opened.json()).toEqual(observation);expect(opened.headers.getSetCookie().join(';')).toContain('__Secure-bankeiz-pbi=');
 const adopted=await relayNativeAccount(post(held.read(),'adopt'));expect(await adopted.json()).toEqual({...observation,adopted:true});
 expect(calls.map(value=>value.includes('/auth/verify?')?'verify':value.endsWith('/recipient')?'observe':'adopt')).toEqual(['verify','observe','observe','adopt']);
});
it.each(['userId','email','conversationId','messageId'])('rejects a different observed %s before any identity session or membership grant',async field=>{
 const wrong=structuredClone(observation);if(field==='userId')wrong.recipient.userId=messageId;else if(field==='email')wrong.recipient.email='other@example.test';else if(field==='conversationId')wrong.invitation.conversationId=uid;else wrong.invitation.messageId=uid;
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?canonical():Response.json(wrong));vi.stubGlobal('fetch',send);
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));const opened=await relayNativeAccount(post(held.read()));expect(opened.status).toBe(401);expect(opened.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');expect(send.mock.calls.some(([input])=>String(input).endsWith('/adopt'))).toBe(false);
});
it('does not trust a well-shaped decoded JWT when Native rejects its actual session',async()=>{
 vi.stubGlobal('fetch',async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?canonical():Response.json({ok:false},{status:401}));
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));const response=await relayNativeAccount(post(held.read()));expect(response.status).toBe(401);expect(response.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');
});
it('keeps the consumed canonical session across observer and adoption outages without consuming its token again',async()=>{
 let observeReady=false,adoptReady=false;const send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?canonical():String(input).endsWith('/adopt')?adoptReady?Response.json({...observation,adopted:true}):Response.json({ok:false},{status:503}):observeReady?Response.json(observation):Response.json({ok:false},{status:503}));vi.stubGlobal('fetch',send);
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));const first=await relayNativeAccount(post(held.read()));expect(first.status).toBe(401);held.retain(first);
 held.retain(await relayNativeAccount(new Request(base+'start?'+query,{headers:{cookie:held.read()}})));observeReady=true;
 const second=await relayNativeAccount(post(held.read()));expect(second.status).toBe(200);held.retain(second);const outage=await relayNativeAccount(post(held.read(),'adopt'));expect(outage.ok).toBe(false);held.retain(outage);
 adoptReady=true;const reopened=await relayNativeAccount(post(held.read()));expect(reopened.ok).toBe(true);held.retain(reopened);expect(await (await relayNativeAccount(post(held.read(),'adopt'))).json()).toEqual({...observation,adopted:true});expect(send.mock.calls.filter(([input])=>String(input).includes('/auth/verify?'))).toHaveLength(1);
});
it('a different raw token for the same message cannot reuse another recipient session',async()=>{
 const otherUid='10000000-0000-4000-8000-000000000003',otherEmail='second@example.test',firstJwt=jwt(),secondJwt=jwt(otherUid,otherEmail),tokens:string[]=[];
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{if(String(input).includes('/auth/verify?')){const token=new URL(String(input)).searchParams.get('token')!;tokens.push(token);return canonical(token==='second-email-token'?secondJwt:firstJwt);}return Response.json({...observation,recipient:new Headers(init?.headers).get('cookie')===`receiz_session=${secondJwt}`?{userId:otherUid,email:otherEmail}:observation.recipient});});
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));held.retain(await relayNativeAccount(post(held.read())));
 held.retain(await relayNativeAccount(new Request(base+'start?'+new URLSearchParams({token:'second-email-token',conversationId,messageId}),{headers:{cookie:held.read()}})));
 expect(await (await relayNativeAccount(post(held.read()))).json()).toEqual({...observation,recipient:{userId:otherUid,email:otherEmail}});expect(tokens).toEqual(['synthetic-email-token','second-email-token']);
});
it('isolates message purpose from meeting cookies and refuses unstaged message adoption',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 const meeting=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native/email-meeting/start?'+new URLSearchParams({token:'meeting-token',eventId:conversationId,key:'existing-meeting-key-1234'})));const held=jar();held.retain(meeting);
 expect(await (await relayNativeAccount(state(held.read()))).json()).toEqual({ok:true,invitation:false});expect((await relayNativeAccount(post(held.read()))).ok).toBe(false);
 held.retain(await relayNativeAccount(new Request(base+'start?'+query)));expect((await relayNativeAccount(post(held.read(),'adopt'))).ok).toBe(false);expect(send).not.toHaveBeenCalled();
});
it('HEAD and scanner/prefetch requests never consume proof or grant membership',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);const head=await relayNativeAccount(new Request(base+'start?'+query,{method:'HEAD'}));expect(head.status).toBe(303);expect(head.headers.getSetCookie()).toEqual([]);
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query,{headers:{'sec-purpose':'prefetch'}})));expect(await (await relayNativeAccount(state(held.read()))).json()).toMatchObject({pending:true,autoContinue:false});
 for(const operation of ['open','adopt']){const request=post(held.read(),operation);request.headers.set('purpose','prefetch');expect((await relayNativeAccount(request)).ok).toBe(false);}
 expect(send).not.toHaveBeenCalled();
});
it('rejects foreign origins, query injection, duplicate cookies, unsupported bodies and methods before any Native call',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));
 const foreign=post(held.read());foreign.headers.set('origin','https://foreign.example');
 const requests=[foreign,new Request(base+'start?'+query+'&next=/evil'),new Request(base+'start?'+query+'&token=another'),post(held.read()+'; '+held.read()),post(held.read(),'open','{ }'),post(held.read(),'adopt','{"uid":"'+uid+'"}'),new Request(base+'open',{method:'PUT',headers:{origin:'https://bankeiz.com'}}),new Request(base+'state?conversationId='+conversationId,{headers:{'sec-fetch-site':'same-origin'}})];
 for(const request of requests)expect((await relayNativeAccount(request)).ok).toBe(false);expect(send).not.toHaveBeenCalled();
});
it.each(['foreign-redirect','missing-secure','oversized-json','wrong-adopt-recipient'])('refuses %s from the fixed Native boundary',async failure=>{
 vi.stubGlobal('fetch',async(input:RequestInfo|URL)=>{
  if(String(input).includes('/auth/verify?'))return failure==='foreign-redirect'?new Response(null,{status:307,headers:{location:'https://foreign.example/', 'set-cookie':`receiz_session=${jwt()}; HttpOnly; Secure; Path=/`}}):failure==='missing-secure'?new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt()}; HttpOnly; Path=/`}}):canonical();
  if(failure==='oversized-json')return Response.json({...observation,oversized:'x'.repeat(17000)});
  if(String(input).endsWith('/adopt'))return Response.json({...observation,adopted:true,recipient:{userId:messageId,email}});return Response.json(observation);
 });
 const held=jar();held.retain(await relayNativeAccount(new Request(base+'start?'+query)));const opened=await relayNativeAccount(post(held.read()));
 if(failure==='wrong-adopt-recipient'){expect(opened.ok).toBe(true);held.retain(opened);expect((await relayNativeAccount(post(held.read(),'adopt'))).ok).toBe(false);}else{expect(opened.ok).toBe(false);expect(opened.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');}
});
