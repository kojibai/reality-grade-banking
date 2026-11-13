// @vitest-environment node
import {StrictMode,act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {EmailMeetingEntry} from '../src/features/account/EmailMeetingEntry';
import {relayNativeAccount} from '../server/native-account';
const recovery=vi.hoisted(()=>({open:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedInvitationAccount:recovery.open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const uid='10000000-0000-4000-8000-000000000002',eventId='10000000-0000-4000-8000-000000000004',key='exact-meeting-key-1234',email='attendee@example.test';
const cleanups:Array<()=>void>=[];
beforeEach(()=>{const page=new Window({url:'https://bankeiz.com/?emailMeeting=1'});vi.stubGlobal('window',page);vi.stubGlobal('document',page.document);vi.stubGlobal('location',page.location);});
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetAllMocks();});
it('opens the actual closed email handoff UI into the same existing account and original invitation once',async()=>{
 const jwt=`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid,email,iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
 const jar=new Map<string,string>(),readCookies=()=>[...jar].map(([name,value])=>name+'='+value).join('; '),retain=(response:Response)=>{for(const cookie of response.headers.getSetCookie()){const raw=cookie.split(';')[0],index=raw.indexOf('=');if(raw.slice(index+1))jar.set(raw.slice(0,index),raw.slice(index+1));else jar.delete(raw.slice(0,index));}};
 const calls:string[]=[];vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push(url);
  if(url.startsWith('/api/bank/native/email-meeting/')){const headers=new Headers(init?.headers);headers.set('cookie',readCookies());headers.set('sec-fetch-site','same-origin');if(init?.method==='POST')headers.set('origin','https://bankeiz.com');const response=await relayNativeAccount(new Request('https://bankeiz.com'+url,{...init,headers}));retain(response);return response;}
  if(url.startsWith('https://receiz.com/auth/verify?'))return new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}});
  expect(url).toBe(`https://receiz.com/api/calendar/meetings/${eventId}/${key}/recipient`);return Response.json({ok:true,recipient:{userId:uid,email},invitation:{eventId,key}});
 });
 const staged=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native/email-meeting/start?'+new URLSearchParams({token:'synthetic-token',eventId,key}),{headers:{'sec-fetch-user':'?1','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}}));retain(staged);
 recovery.open.mockResolvedValue({dispose:recovery.dispose});const replace=vi.spyOn(window.location,'replace').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 const opened=vi.fn();await act(async()=>root.render(<StrictMode><EmailMeetingEntry onOpened={opened}/></StrictMode>));
 await vi.waitFor(()=>{expect(host.querySelector('[role=alert]')?.textContent).toBeUndefined();expect(opened).toHaveBeenCalledOnce();});
 expect(replace).not.toHaveBeenCalled();expect(window.location.pathname+window.location.search+window.location.hash).toBe('/?'+new URLSearchParams({meeting:eventId,meetingKey:key})+'#account/messages');expect(host.querySelector('button')).toBeNull();expect(host.querySelector('h1')).toBeNull();
 expect(recovery.open).toHaveBeenCalledExactlyOnceWith(uid);expect(recovery.dispose).toHaveBeenCalledOnce();expect(calls.filter(url=>url==='/api/bank/native/email-meeting/open')).toHaveLength(1);expect(calls.filter(url=>url.includes('/auth/verify?'))).toHaveLength(1);expect(host.textContent).not.toContain('Create account');
});
it('a prefetch stage never offers another invitation button or opens an account',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json({ok:true,pending:true,autoContinue:false}));const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<EmailMeetingEntry/>));expect(host.querySelector('button')).toBeNull();expect(host.textContent).toContain('Open the invitation link in your email to continue.');expect(recovery.open).not.toHaveBeenCalled();
});
it('keeps an account recovery refusal in consumer language',async()=>{
 recovery.open.mockRejectedValue(Error('VERIFIED_EMAIL_ACCOUNT_RETAINED_COLLISION'));
 vi.stubGlobal('fetch',async(input:RequestInfo|URL)=>String(input).endsWith('/state')?Response.json({ok:true,pending:true,autoContinue:true}):Response.json({ok:true,recipient:{userId:uid,email},invitation:{eventId,key}}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<EmailMeetingEntry/>));expect(host.querySelector('[role=alert]')?.textContent).toContain('Your saved accounts are preserved.');expect(host.textContent).not.toContain('VERIFIED_EMAIL_ACCOUNT');
});
