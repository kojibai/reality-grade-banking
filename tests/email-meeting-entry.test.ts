import {afterEach,expect,it,vi} from 'vitest';
import {relayNativeAccount} from '../server/native-account';
const base='https://bankeiz.com/api/bank/native/email-meeting/';
const eventId='10000000-0000-4000-8000-000000000004',uid='10000000-0000-4000-8000-000000000002',key='existing-meeting-key-1234',email='attendee@example.test';
const query=new URLSearchParams({token:'synthetic-email-token',eventId,key});
const recipient={ok:true,recipient:{userId:uid,email},invitation:{eventId,key}};
const session=()=>`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid,email,iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
const cookies=(r:Response)=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const post=(cookie:string)=>new Request(base+'open',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json',cookie},body:'{}'});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('stages a known-recipient invitation without consuming email proof or creating an identity',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 const staged=await relayNativeAccount(new Request(base+'start?'+query,{headers:{'sec-fetch-user':'?1','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}));
 expect(staged.status).toBe(303);expect(staged.headers.get('location')).toBe('/?emailMeeting=1');expect(await staged.text()).not.toContain('synthetic-email-token');expect(send).not.toHaveBeenCalled();
 const state=await relayNativeAccount(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie:cookies(staged)}}));expect(await state.json()).toEqual({ok:true,pending:true,autoContinue:true});
});
it('consumes canonical email proof then verifies the exact existing attendee before allowing device recovery',async()=>{
 const jwt=session();const send=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  expect(init?.credentials).toBe('omit');expect(init?.redirect).toBe('manual');
  if(String(input).startsWith('https://receiz.com/auth/verify?'))return new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/`}});
  expect(String(input)).toBe(`https://receiz.com/api/calendar/meetings/${eventId}/${key}/recipient`);expect(init?.method??'GET').toBe('GET');expect(init?.headers).toMatchObject({Cookie:`receiz_session=${jwt}`,Origin:'https://bankeiz.com'});return Response.json(recipient);
 });vi.stubGlobal('fetch',send);
 const stage=await relayNativeAccount(new Request(base+'start?'+query));const opened=await relayNativeAccount(post(cookies(stage)));
 expect(opened.status).toBe(200);expect(await opened.json()).toEqual(recipient);expect(opened.headers.getSetCookie().join(';')).toContain('__Secure-bankeiz-pbi=');expect(send).toHaveBeenCalledTimes(2);
 const resumed=await relayNativeAccount(post(cookies(opened)));expect(resumed.status).toBe(200);expect(send.mock.calls.filter(([url])=>String(url).includes('/auth/verify?'))).toHaveLength(1);
});
it('continues an email tap without a second button when the email browser omits fetch-user headers',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 const staged=await relayNativeAccount(new Request(base+'start?'+query));
 const state=await relayNativeAccount(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie:cookies(staged)}}));
 expect(await state.json()).toMatchObject({pending:true,autoContinue:true});expect(send).not.toHaveBeenCalled();
});
it.each(['wrong-recipient','wrong-email','wrong-event','wrong-key','foreign-redirect','invalid-session'])('refuses %s without making the session available to identity binding',async failure=>{
 const jwt=session(),send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:failure==='foreign-redirect'?'https://foreign.example/':'https://receiz.com/account','set-cookie':`receiz_session=${failure==='invalid-session'?'bad':jwt}; HttpOnly; Secure; Path=/`}}):Response.json({...recipient,recipient:{userId:failure==='wrong-recipient'?eventId:uid,email:failure==='wrong-email'?'other@example.test':email},invitation:{eventId:failure==='wrong-event'?uid:eventId,key:failure==='wrong-key'?'other-meeting-key-1234':key}}));vi.stubGlobal('fetch',send);
 const stage=await relayNativeAccount(new Request(base+'start?'+query)),opened=await relayNativeAccount(post(cookies(stage)));expect(opened.ok).toBe(false);expect(opened.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');
});
it('never consumes on HEAD, scanners, unsupported parameters or cross-origin requests',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 const head=await relayNativeAccount(new Request(base+'start?'+query,{method:'HEAD'}));expect(head.status).toBe(303);expect(head.headers.getSetCookie()).toEqual([]);
 const stage=await relayNativeAccount(new Request(base+'start?'+query,{headers:{'sec-purpose':'prefetch','sec-fetch-user':'?1','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}));
 const state=await relayNativeAccount(new Request(base+'state',{headers:{'sec-fetch-site':'same-origin',cookie:cookies(stage)}}));expect(await state.json()).toMatchObject({pending:true,autoContinue:false});
 for(const request of [new Request(base+'start?'+query+'&returnTo=https://foreign.example'),new Request(base+'open',{method:'POST',headers:{origin:'https://foreign.example','content-type':'application/json'},body:'{}'}),new Request(base+'open',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json','sec-purpose':'prefetch'},body:'{}'})])expect((await relayNativeAccount(request)).ok).toBe(false);
 expect(send).not.toHaveBeenCalled();
});
it('keeps a consumed session through a temporary recipient outage without consuming the email token twice',async()=>{
 const jwt=session();let available=false;
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input).includes('/auth/verify?')?new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}}):available?Response.json(recipient):Response.json({ok:false},{status:503}));vi.stubGlobal('fetch',send);
 const stage=await relayNativeAccount(new Request(base+'start?'+query)),first=await relayNativeAccount(post(cookies(stage)));expect(first.ok).toBe(false);expect(first.headers.getSetCookie().join(';')).not.toContain('__Secure-bankeiz-pbi=');
 const jar=new Map<string,string>();
 const retain=(response:Response)=>{for(const cookie of response.headers.getSetCookie()){const raw=cookie.split(';')[0],at=raw.indexOf('=');if(raw.slice(at+1))jar.set(raw.slice(0,at),raw.slice(at+1));else jar.delete(raw.slice(0,at));}},held=()=>[...jar].map(([name,value])=>name+'='+value).join('; ');
 retain(first);retain(await relayNativeAccount(new Request(base+'start?'+query,{headers:{cookie:held()}})));
 available=true;const second=await relayNativeAccount(post(held()));expect(await second.json()).toEqual(recipient);expect(send.mock.calls.filter(([url])=>String(url).includes('/auth/verify?'))).toHaveLength(1);
});
it('a different recipient token for the same meeting cannot reuse the previous account session',async()=>{
 const secondUid='10000000-0000-4000-8000-000000000003',secondEmail='second@example.test';
 const jwt=(userId:string,address:string)=>`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid:userId,email:address,iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
 const firstSession=jwt(uid,email),secondSession=jwt(secondUid,secondEmail),tokens:string[]=[];
 const send=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(String(input).includes('/auth/verify?')){const token=new URL(String(input)).searchParams.get('token')!;tokens.push(token);return new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${token==='second-email-token'?secondSession:firstSession}; HttpOnly; Secure; Path=/`}});}
  const second=new Headers(init?.headers).get('cookie')===`receiz_session=${secondSession}`;return Response.json({...recipient,recipient:second?{userId:secondUid,email:secondEmail}:recipient.recipient});
 });vi.stubGlobal('fetch',send);
 const jar=new Map<string,string>(),retain=(response:Response)=>{for(const cookie of response.headers.getSetCookie()){const raw=cookie.split(';')[0],at=raw.indexOf('=');if(raw.slice(at+1))jar.set(raw.slice(0,at),raw.slice(at+1));else jar.delete(raw.slice(0,at));}},held=()=>[...jar].map(([name,value])=>name+'='+value).join('; ');
 retain(await relayNativeAccount(new Request(base+'start?'+query)));const first=await relayNativeAccount(post(held()));expect(first.status).toBe(200);retain(first);
 retain(await relayNativeAccount(new Request(base+'start?'+new URLSearchParams({token:'second-email-token',eventId,key}),{headers:{cookie:held()}})));
 const second=await relayNativeAccount(post(held()));expect(await second.json()).toEqual({...recipient,recipient:{userId:secondUid,email:secondEmail}});expect(tokens).toEqual(['synthetic-email-token','second-email-token']);
});
