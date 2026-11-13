// @vitest-environment node
import {StrictMode,act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {EmailMessageEntry} from '../src/features/account/EmailMessageEntry';
import {relayNativeAccount} from '../server/native-account';
const recovery=vi.hoisted(()=>({open:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedInvitationAccount:recovery.open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const uid='10000000-0000-4000-8000-000000000002',conversationId='10000000-0000-4000-8000-000000000004',messageId='10000000-0000-4000-8000-000000000005',email='recipient@example.test';
const value={ok:true,recipient:{userId:uid,email},invitation:{conversationId,messageId}};
const cleanups:Array<()=>void>=[];
beforeEach(()=>{const page=new Window({url:'https://bankeiz.com/?emailMessage=1'});vi.stubGlobal('window',page);vi.stubGlobal('document',page.document);vi.stubGlobal('location',page.location);});
afterEach(()=>{for(const cleanup of cleanups.splice(0))cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetAllMocks();});
function mount(opened=vi.fn()){
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 return{host,opened,render:()=>act(async()=>root.render(<StrictMode><EmailMessageEntry onOpened={opened}/></StrictMode>))};
}
it('the closed wire handoff opens the selected account then its same conversation with no second page or button',async()=>{
 const token=`e30.${Buffer.from(JSON.stringify({iat:Math.floor(Date.now()/1000),uid,email,iss:'receiz',aud:'receiz-web'})).toString('base64url')}.signature`;
 const jar=new Map<string,string>(),readCookies=()=>[...jar].map(([name,value])=>name+'='+value).join('; '),retain=(response:Response)=>{for(const cookie of response.headers.getSetCookie()){const raw=cookie.split(';')[0],at=raw.indexOf('=');if(raw.slice(at+1))jar.set(raw.slice(0,at),raw.slice(at+1));else jar.delete(raw.slice(0,at));}};
 const order:string[]=[];let release!:()=>void;const custody=new Promise<void>(resolve=>{release=resolve;});
 recovery.open.mockImplementation(async(accountUid:string)=>{expect(accountUid).toBe(uid);order.push('custody-start');await custody;order.push('custody-finished');return{dispose:recovery.dispose};});
 const calls:string[]=[];vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push(url);
  if(url.startsWith('/api/bank/native/email-message/')){const headers=new Headers(init?.headers);headers.set('cookie',readCookies());headers.set('sec-fetch-site','same-origin');if(init?.method==='POST')headers.set('origin','https://bankeiz.com');const response=await relayNativeAccount(new Request('https://bankeiz.com'+url,{...init,headers}));retain(response);return response;}
  if(url.startsWith('https://receiz.com/auth/verify?'))return new Response(null,{status:307,headers:{location:'https://receiz.com/account','set-cookie':`receiz_session=${token}; HttpOnly; Secure; Path=/`}});
  if(url.endsWith('/adopt')){expect(order).toEqual(['custody-start','custody-finished']);expect(url).toBe(`https://receiz.com/api/chat/email-entries/${conversationId}/${messageId}/adopt`);order.push('adopt');return Response.json({...value,adopted:true});}
  expect(url).toBe(`https://receiz.com/api/chat/email-entries/${conversationId}/${messageId}/recipient`);return Response.json(value);
 });
 retain(await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native/email-message/start?'+new URLSearchParams({token:'synthetic-email-token',conversationId,messageId}))));
 const replace=vi.spyOn(window.location,'replace').mockImplementation(()=>{}),page=mount();await page.render();await vi.waitFor(()=>expect(order).toEqual(['custody-start']));expect(page.host.querySelector('[role=status]')).not.toBeNull();expect(page.opened).not.toHaveBeenCalled();
 release();await vi.waitFor(()=>expect(page.opened).toHaveBeenCalledOnce());
 expect(window.location.pathname+window.location.search+window.location.hash).toBe('/?bankNotification=1&conversation=10000000-0000-4000-8000-000000000004&recipient=10000000-0000-4000-8000-000000000002&message=10000000-0000-4000-8000-000000000005#account/messages');expect(replace).not.toHaveBeenCalled();expect(page.host.querySelector('button')).toBeNull();expect(page.host.querySelector('h1')).toBeNull();expect(page.host.textContent).not.toContain('Create account');
 expect(calls.filter(url=>url.includes('/auth/verify?'))).toHaveLength(1);expect(calls.filter(url=>url==='/api/bank/native/email-message/open')).toHaveLength(1);expect(calls.filter(url=>url==='/api/bank/native/email-message/adopt')).toHaveLength(1);expect(calls.filter(url=>url===`https://receiz.com/api/chat/email-entries/${conversationId}/${messageId}/adopt`)).toHaveLength(1);expect(recovery.dispose).toHaveBeenCalledOnce();
});
it('a scanner stage never opens custody, offers an extra button, or adopts a message',async()=>{
 const send=vi.fn(async(_input:RequestInfo|URL)=>Response.json({ok:true,pending:true,autoContinue:false}));vi.stubGlobal('fetch',send);const page=mount();await page.render();expect(page.host.querySelector('button')).toBeNull();expect(page.host.textContent).toContain('Open the message link in your email to continue.');expect(recovery.open).not.toHaveBeenCalled();expect(send.mock.calls.every(([input])=>String(input).endsWith('/state'))).toBe(true);
});
it('keeps saved-account custody refusal in consumer language without adoption or normal account creation',async()=>{
 recovery.open.mockRejectedValue(Error('VERIFIED_EMAIL_ACCOUNT_RETAINED_COLLISION'));
 const send=vi.fn(async(input:RequestInfo|URL)=>String(input).endsWith('/state')?Response.json({ok:true,pending:true,autoContinue:true}):Response.json(value));vi.stubGlobal('fetch',send);
 const page=mount();await page.render();expect(page.host.querySelector('[role=alert]')?.textContent).toContain('Your saved accounts are preserved.');expect(page.host.textContent).not.toContain('VERIFIED_EMAIL_ACCOUNT');expect(page.host.querySelector('button')).toBeNull();expect(page.opened).not.toHaveBeenCalled();expect(send.mock.calls.some(([input])=>String(input).endsWith('/adopt'))).toBe(false);
});
it('reports an unreadable or unavailable staged handoff without exposing transport details or opening an account',async()=>{
 vi.stubGlobal('fetch',async()=>{throw Error('INTERNAL_EMAIL_SESSION_OBSERVER_UNAVAILABLE');});const page=mount();await page.render();expect(page.host.querySelector('[role=alert]')?.textContent).toContain('Your saved accounts are preserved.');expect(page.host.textContent).not.toContain('INTERNAL_EMAIL_SESSION');expect(page.host.querySelector('button')).toBeNull();expect(recovery.open).not.toHaveBeenCalled();expect(page.opened).not.toHaveBeenCalled();
});
