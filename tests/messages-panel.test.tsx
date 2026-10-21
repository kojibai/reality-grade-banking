// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {MessagesPanel} from '../src/features/messages/MessagesPanel';
import {MessagingError,type ChatConversation,type ChatMessage,type ChatPage,type NativeMessaging,type MessageSendOptions} from '../src/receiz/native-messaging';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {NativeTwinAsk,NativeTwinMemory,NativeTwinReply} from '../src/receiz/native-twin';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
const uid='33333333-3333-4333-8333-333333333333',threadId='11111111-1111-4111-8111-111111111111';
const peer={kind:'user' as const,userId:'22222222-2222-4222-8222-222222222222',username:'sam',displayName:'Sam',avatarUrl:null};
const other={...peer,userId:'44444444-4444-4444-8444-444444444444',username:'alex',displayName:'Alex'};
const message:ChatMessage={id:'message-1',conversationId:threadId,senderUserId:peer.userId,senderKind:'user',senderAiId:null,senderDisplay:'Sam',body:'An actual fixture message',createdAt:'2026-10-19T12:00:00Z',receizedAt:'2026-10-19T12:00:00Z',receipt:null,sealedOriginalAvailable:false};
const conversation:ChatConversation={id:threadId,kind:'dm',title:'Sam',members:[peer],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:message,createdAt:message.createdAt,updatedAt:message.createdAt,lastMessageAt:message.createdAt};
const page:ChatPage={conversation,messages:[message],hasMore:true,nextCursor:'2026-10-19T12:00:00Z'};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function fixture(consented=true){
 let approved=consented;
 const twin={readiness:vi.fn(()=>({status:'configured',availability:'unchecked',requires:['business','usage-credits']})),ask:vi.fn(async(input:NativeTwinAsk):Promise<NativeTwinReply>=>({requestId:input.requestId,message:'A generated answer',authority:'generated-interpretation',source:'upstream',memoryScope:'none',memory:[],sourceReferences:[],sharedContext:[],actionHandoffs:[{kind:'pay',label:'Review proposal',href:'https://receiz.com/review',authority:'proposal-only',admitted:false}]}))};
 const api={accountUid:uid,twin,callTransport:{heldFetch:vi.fn(async(_path:string,_init?:RequestInit)=>Response.json({ok:true,calls:[],activeCall:null}))},knownConversations:()=>[conversation],knownMessages:():ChatPage|null=>page,conversations:vi.fn(async(_signal?:AbortSignal)=>[conversation]),messages:vi.fn(async(_id:string,_before?:string,_signal?:AbortSignal)=>page),search:vi.fn(async(_query:string,_signal?:AbortSignal)=>[peer,other]),createConversation:vi.fn(async(_input:{participantUserIds:string[];title?:string})=>threadId),send:vi.fn(async(_id:string,_body:string,_options?:MessageSendOptions)=>({...message,id:'sent-1',senderUserId:uid,body:'My draft'}))};
 const identity={binding:{identityOwnerReceizId:'owner'},knownTwinAccess:()=>true,messaging:vi.fn(async(approve=false)=>{if(!approved&&!approve)throw Error('MESSAGING_CONSENT_REQUIRED');approved=true;return api;})} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host),onClose=vi.fn(),onOpen=vi.fn(),onPreparePayment=vi.fn();
 const render=(active=true,nextIdentity=identity,twinContextRecords?:ReadonlyArray<{id:string;title:string;text:string}>,initialRecipient?:{id:number;person:typeof peer},initialNotification?:import('../src/pwa/notification-target').NotificationTarget)=>act(async()=>root.render(<MessagesPanel identity={nextIdentity} active={active} onClose={onClose} onOpen={onOpen} onPreparePayment={onPreparePayment} twinContextRecords={twinContextRecords} initialRecipient={initialRecipient} initialNotification={initialNotification}/>));
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent===label);expect(button,'button '+label).toBeTruthy();await act(async()=>button!.click());};
 const input=async(label:string,value:string)=>{const field=host.querySelector<HTMLInputElement>('[aria-label="'+label+'"]')!;expect(field,'input '+label).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});};
 const submit=()=>act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 return{api:api as typeof api&NativeMessaging,identity,host,render,click,input,submit,onClose,onOpen,onPreparePayment,unmount(){act(()=>root.unmount());host.remove();}};
}
it('opens Messages first and places Twin second when the existing account has no Twin access',async()=>{
 const f=fixture(),identity={...f.identity,knownTwinAccess:()=>false};
 try{await f.render(true,identity);expect([...f.host.querySelectorAll('.bank-messaging-nav>button')].slice(0,2).map(button=>button.textContent)).toEqual(['Messages','Your assistant']);expect(f.host.querySelector('.sheet-header h2')?.textContent).toBe('Messages');expect(f.host.querySelector('[aria-label="Search messages"]')).not.toBeNull();await f.click('Your assistant');expect(f.host.querySelector('[aria-label="Ask your assistant…"]')).not.toBeNull();expect(f.host.textContent).not.toContain('Explore Twin access');}finally{f.unmount();}
});
it('shows the same Twin view for free and paid accounts, offering an upgrade only on send and preserving the draft',async()=>{
 const free=fixture(),paid=fixture(),upgrade=vi.fn();
 const identity={...free.identity,knownTwinAccess:()=>false,upgradeTwin:upgrade};
 try{
  await free.render(true,identity);await free.click('Your assistant');await paid.render();
  expect(free.host.querySelector('.bank-twin-welcome')?.innerHTML).toBe(paid.host.querySelector('.bank-twin-welcome')?.innerHTML);
  expect(free.host.querySelector('.bank-message-composer')).not.toBeNull();expect(free.host.querySelector('.bank-message-composer')?.innerHTML).toBe(paid.host.querySelector('.bank-message-composer')?.innerHTML);
  expect(free.host.querySelector('.bank-twin-upgrade')).toBeNull();expect(upgrade).not.toHaveBeenCalled();
  await free.input('Ask your assistant…','Explain my last payment');await free.submit();
  expect(free.host.querySelector('.bank-twin-access-reply')?.textContent).toContain('Understand payments');
  expect(free.host.querySelector('.bank-message-own')?.textContent).toBe('Explain my last payment');
  expect(free.host.querySelector('.bank-twin-upgrade')).toBeNull();
  await free.click('Unlock your assistant');await vi.waitFor(()=>expect(free.host.textContent).toContain('Continue to secure payment'));
  expect(free.api.twin.ask).not.toHaveBeenCalled();expect(upgrade).not.toHaveBeenCalled();
  await free.click('Back to conversation');
  expect(free.host.querySelector<HTMLInputElement>('[aria-label="Ask your assistant…"]')?.value).toBe('Explain my last payment');
  expect(free.host.querySelector('.bank-twin-upgrade')).toBeNull();
 }finally{free.unmount();paid.unmount();}
});
it('returns the preserved draft after verified upgrade without automatically submitting or billing a Twin request',async()=>{
 const f=fixture(),upgrade=vi.fn(async()=>({accountUid:uid,twinAccess:true})),identity={...f.identity,knownTwinAccess:()=>false,upgradeTwin:upgrade};
 try{
  await f.render(true,identity);await f.click('Your assistant');await f.input('Ask your assistant…','My saved question');await f.submit();await f.click('Unlock your assistant');
  await vi.waitFor(()=>expect(f.host.textContent).toContain('Continue to secure payment'));await f.click('Continue to secure payment');
  expect(f.api.twin.ask).not.toHaveBeenCalled();expect(f.host.querySelector<HTMLInputElement>('[aria-label="Ask your assistant…"]')?.value).toBe('My saved question');
  await f.submit();expect(f.api.twin.ask).toHaveBeenCalledOnce();expect(f.api.twin.ask.mock.calls[0]?.[0].message).toBe('My saved question');
 }finally{f.unmount();}
});
it('keeps the access reply and upgrade action when returning to Twin or closing and reopening messages',async()=>{
 const f=fixture(),identity={...f.identity,knownTwinAccess:()=>false};
 try{
  await f.render(true,identity);await f.click('Your assistant');await f.input('Ask your assistant…','Help me understand this');await f.submit();
  await f.click('Messages');await f.click('Your assistant');await f.render(false,identity);await f.render(true,identity);
  expect(f.host.querySelector('.bank-message-own')?.textContent).toBe('Help me understand this');expect(f.host.querySelector('.bank-twin-access-reply')).not.toBeNull();
  await f.click('Unlock your assistant');await vi.waitFor(()=>expect(f.host.textContent).toContain('Continue to secure payment'));expect(f.api.twin.ask).not.toHaveBeenCalled();
 }finally{f.unmount();}
});
it('reopens an earlier access reply from existing encrypted display retention without another message or upgrade call',async()=>{
 const f=fixture(),retain=vi.fn(),identity={...f.identity,knownTwinAccess:()=>false,retainTwinAccessQuestions:retain,knownMessagingDisplay:()=>({schema:'bankeiz.messaging-display.v1' as const,accountUid:uid,inbox:[conversation],pages:[page],twinAccessQuestions:[{id:'held-question',question:'My earlier question'}]})};
 try{
  await f.render(true,identity);await f.click('Your assistant');expect(f.host.querySelector('.bank-message-own')?.textContent).toBe('My earlier question');await f.click('Unlock your assistant');await vi.waitFor(()=>expect(f.host.textContent).toContain('Continue to secure payment'));expect(f.api.twin.ask).not.toHaveBeenCalled();
 }finally{f.unmount();}
});
it('allows the local access conversation before a public username is ready',async()=>{
 const f=fixture(),identity={...f.identity,knownTwinAccess:()=>false};f.api.twin.readiness.mockReturnValue({status:'profile-required',availability:'unchecked',requires:['public-username']});
 try{await f.render(true,identity);await f.click('Your assistant');expect(f.host.querySelector<HTMLInputElement>('[aria-label="Ask your assistant…"]')?.disabled).toBe(false);await f.input('Ask your assistant…','What can you help with?');await f.submit();expect(f.host.querySelector('.bank-twin-access-reply')).not.toBeNull();expect(f.api.twin.ask).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('restores the question from the selected access reply instead of a newer question',async()=>{
 const f=fixture(),identity={...f.identity,knownTwinAccess:()=>false};
 try{
  await f.render(true,identity);await f.click('Your assistant');for(const text of ['First question','Second question']){await f.input('Ask your assistant…',text);await f.submit();}
  await act(async()=>f.host.querySelector<HTMLButtonElement>('.bank-twin-access-reply button')!.click());await vi.waitFor(()=>expect(f.host.textContent).toContain('Continue to secure payment'));await f.click('Back to conversation');
  expect(f.host.querySelector<HTMLInputElement>('[aria-label="Ask your assistant…"]')?.value).toBe('First question');
 }finally{f.unmount();}
});
it('uses verified access that finishes after returning from the upgrade, without another upsell or automatic send',async()=>{
 const f=fixture(),pending=deferred<{accountUid:string;twinAccess:boolean}>();let entitled=false;
 const upgrade=vi.fn(async()=>{const result=await pending.promise;entitled=result.twinAccess;return result;}),identity={...f.identity,knownTwinAccess:()=>entitled,upgradeTwin:upgrade};
 try{
  await f.render(true,identity);await f.click('Your assistant');await f.input('Ask your assistant…','Keep my question');await f.submit();await f.click('Unlock your assistant');await vi.waitFor(()=>expect(f.host.textContent).toContain('Continue to secure payment'));await f.click('Continue to secure payment');await f.click('Back to conversation');
  await act(async()=>pending.resolve({accountUid:uid,twinAccess:true}));expect(f.api.twin.ask).not.toHaveBeenCalled();await f.submit();expect(f.api.twin.ask).toHaveBeenCalledOnce();expect(upgrade).toHaveBeenCalledOnce();
 }finally{f.unmount();}
});
it('opens Twin first from held access without waiting for messaging transport',async()=>{
 const f=fixture(),pending=deferred<NativeMessaging>(),identity={...f.identity,messaging:()=>pending.promise};
 try{await f.render(true,identity);expect([...f.host.querySelectorAll('.bank-messaging-nav>button')].slice(0,2).map(button=>button.textContent)).toEqual(['Your assistant','Messages']);expect(f.host.querySelector('.sheet-header h2')?.textContent).toBe('Your assistant');expect(f.host.querySelector('[aria-label="Ask your assistant…"]')).not.toBeNull();}finally{f.unmount();}
});
it('keeps an explicit Twin selection when an unupgraded account connection finishes',async()=>{
 const f=fixture(),pending=deferred<NativeMessaging>(),identity={...f.identity,knownTwinAccess:()=>false,messaging:()=>pending.promise};
 try{await f.render(true,identity);await f.click('Your assistant');await act(async()=>pending.resolve(f.api));expect(f.host.querySelector('.sheet-header h2')?.textContent).toBe('Your assistant');expect([...f.host.querySelectorAll('.bank-messaging-nav>button')].slice(0,2).map(button=>button.textContent)).toEqual(['Messages','Your assistant']);}finally{f.unmount();}
});
it('shows carried participant images in the inbox, conversation and contact choices without another profile lookup',async()=>{
 const f=fixture(),avatar='https://receiz.com/portrait.png',withImage={...conversation,members:[{...peer,avatarUrl:avatar}]};
 f.api.conversations.mockResolvedValue([withImage]);f.api.messages.mockResolvedValue({...page,conversation:withImage});
 try{await f.render();await f.click('Messages');expect(f.host.querySelector('.bank-thread-row img')?.getAttribute('src')).toBe(avatar);await f.click('Open conversation Sam');expect(f.host.querySelector('.bank-message-sender img')?.getAttribute('src')).toBe(avatar);await f.click('Back to messages');await f.click('New conversation');expect(f.host.querySelector('.bank-pick-person img')?.getAttribute('src')).toBe(avatar);expect(f.api.search).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('uses the carried member portrait for a world Twin while preparing, streaming and after reply, leaving outgoing bubbles unchanged',async()=>{
 const f=fixture(),pending=deferred<ChatMessage>(),avatar='https://receiz.com/portrait.png',withImage={...conversation,members:[{...peer,avatarUrl:avatar}]};let options:MessageSendOptions|undefined;
 f.api.conversations.mockResolvedValue([withImage]);f.api.messages.mockResolvedValue({...page,conversation:withImage});f.api.knownMessages=()=>({...page,conversation:withImage});f.api.send.mockImplementation(async(_id,_body,value)=>{options=value;return pending.promise;});
 try{
  await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','Hello');await f.submit();
  const agent='world:'+peer.userId;
  await act(()=>options!.onAiStart?.({id:agent,name:'Sam’s Twin'}));
  expect(f.host.querySelector('[aria-label="Sam’s Twin is responding"] img')?.getAttribute('src')).toBe(avatar);
  await act(()=>options!.onDelta?.(agent,'A live answer'));
  expect([...f.host.querySelectorAll('.bank-message-other')].find(node=>node.textContent?.includes('A live answer'))?.querySelector('img')?.getAttribute('src')).toBe(avatar);
  await act(()=>{options!.onMessage?.({...message,id:'world-reply',senderKind:'ai',senderAiId:agent,body:'A live answer'});options!.onAiDone?.(agent);});
  expect(f.host.querySelector('[aria-label="Sam’s Twin is responding"]')).toBeNull();
  expect([...f.host.querySelectorAll('.bank-message-other')].find(node=>node.textContent?.includes('A live answer'))?.querySelector('img')?.getAttribute('src')).toBe(avatar);
  expect(f.host.querySelector('.bank-message-own img')).toBeNull();expect(f.api.search).not.toHaveBeenCalled();
  await act(()=>pending.resolve({...message,id:'own-ack',senderUserId:uid,body:'Hello'}));
 }finally{f.unmount();}
});
it('requires one explicit permission before private reads, then opens Twin without sending anything',async()=>{
 const outbound=vi.fn(()=>{throw Error('No outbound tests');});vi.stubGlobal('fetch',outbound);const f=fixture(false);
 try{await f.render();expect(f.host.textContent).toContain('Use your existing Receiz messages, groups, calls and assistant through this ID. Nothing sent until you send.');expect(f.api.conversations).not.toHaveBeenCalled();expect(f.api.twin.ask).not.toHaveBeenCalled();await f.click('Enable messages');expect(f.identity.messaging).toHaveBeenLastCalledWith(true);expect(f.host.textContent).toContain('Your money.');expect(f.api.twin.ask).not.toHaveBeenCalled();expect(outbound).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('uses known thread truth immediately and keeps it through a background refresh',async()=>{
 const pending=deferred<ChatPage>(),f=fixture();f.api.messages.mockImplementation(()=>pending.promise);
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('An actual fixture message');expect(f.host.textContent).not.toContain('Loading messages');await act(async()=>pending.resolve({...page,messages:[message,{...message,id:'appended',body:'A verified addition'}]}));expect(f.host.textContent).toContain('A verified addition');}finally{f.unmount();}
});
it('shows the composer and retained conversations before remote admission finishes, without an opening screen',async()=>{
 const f=fixture(),pending=deferred<NativeMessaging>();
 const identity={...f.identity,knownMessagingDisplay:()=>({schema:'bankeiz.messaging-display.v1' as const,accountUid:uid,inbox:[conversation],pages:[page]}),messaging:()=>pending.promise};
 try{await f.render(true,identity);expect(f.host.querySelector('[aria-label="Ask your assistant…"]')).not.toBeNull();expect(f.host.textContent).not.toContain('Opening your');await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('An actual fixture message');expect(f.api.conversations).not.toHaveBeenCalled();await f.input('Message…','Draft before connection');await f.submit();expect(f.api.send).not.toHaveBeenCalled();await act(async()=>pending.resolve(f.api));expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('Draft before connection');expect(f.api.conversations).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('retains an uncertain send draft, refreshes to inspect, and never retries automatically',async()=>{
 const f=fixture();f.api.send.mockRejectedValue(new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN',true));
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','My draft');await f.submit();expect(f.api.send).toHaveBeenCalledTimes(1);expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('My draft');expect(f.host.textContent).toContain('Check the conversation before sending again.');expect(f.api.messages.mock.calls.length).toBeGreaterThan(1);await f.click('Refresh conversation');expect(f.api.send).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('clears a draft only when the message was acknowledged, including a lost AI reply',async()=>{
 const f=fixture();f.api.send.mockRejectedValue(new MessagingError('CHAT_AI_RESPONSE_FAILED',true,'acknowledged-user-message'));
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','My draft');await f.submit();expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('');expect(f.host.textContent).toContain('Your message was received');expect(f.api.send).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('searches after debounce, aborts superseded queries and creates groups using stable user IDs',async()=>{
 vi.useFakeTimers();const f=fixture();
 try{await f.render();await f.click('Messages');await f.click('New conversation');await f.input('Find a person by name or username','sam');await act(async()=>vi.advanceTimersByTimeAsync(300));const signal=f.api.search.mock.calls[0]?.[1] as AbortSignal;await f.click('Select Sam');await f.input('Find a person by name or username','alex');expect(signal.aborted).toBe(true);await act(async()=>vi.advanceTimersByTimeAsync(300));await f.click('Select Alex');await f.input('Group name','Studio');await f.click('Start conversation');expect(f.api.createConversation).toHaveBeenCalledWith({participantUserIds:[peer.userId,other.userId],title:'Studio'});}finally{f.unmount();}
});
it('loads older history with the held cursor and starts a call only after entering call controls',async()=>{
 const f=fixture();
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.click('Load earlier messages');expect(f.api.messages).toHaveBeenCalledWith(threadId,page.nextCursor,expect.any(AbortSignal));expect(f.api.callTransport.heldFetch.mock.calls.every(([,init])=>!init?.method||init.method==='GET')).toBe(true);await f.click('Voice call');await vi.waitFor(()=>expect(f.host.textContent).toContain('Start call'));expect(f.api.callTransport.heldFetch).toHaveBeenCalled();}finally{f.unmount();}
});
it('never overlaps refreshes, aborts hidden reads and does not poll an inactive panel',async()=>{
 vi.useFakeTimers();const f=fixture(),pending=deferred<ChatConversation[]>();f.api.conversations.mockImplementation(()=>pending.promise);
 try{await f.render();expect(f.api.conversations).toHaveBeenCalledTimes(1);const signal=f.api.conversations.mock.calls[0]?.[0] as AbortSignal;await act(async()=>vi.advanceTimersByTimeAsync(36000));expect(f.api.conversations).toHaveBeenCalledTimes(1);await f.render(false);expect(signal.aborted).toBe(true);await act(async()=>vi.advanceTimersByTimeAsync(36000));expect(f.api.conversations).toHaveBeenCalledTimes(1);await act(async()=>pending.resolve([conversation]));}finally{f.unmount();}
});
it('keeps the first inbox request alive when switching from Twin to Messages',async()=>{
 const f=fixture(),pending=deferred<ChatConversation[]>();f.api.knownConversations=()=>[];f.api.conversations.mockImplementation(()=>pending.promise);
 try{await f.render();const signal=f.api.conversations.mock.calls[0]?.[0]as AbortSignal;await f.click('Messages');expect(signal.aborted).toBe(false);await act(async()=>pending.resolve([conversation]));expect(f.host.textContent).toContain('Sam');expect(f.api.conversations).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('discards results and drafts from an identity replaced while its request is unresolved',async()=>{
 const f=fixture(),pending=deferred<NativeMessaging>();const stale={binding:{identityOwnerReceizId:'old-owner'},messaging:()=>pending.promise} as unknown as OpenIdentity;
 try{await f.render(true,stale);await f.render(true,f.identity);await act(async()=>pending.resolve({...f.api,knownConversations:()=>[{...conversation,title:'Foreign private title'}]}));await f.click('Messages');expect(f.host.textContent).not.toContain('Foreign private title');expect(f.host.textContent).toContain('Sam');}finally{f.unmount();}
});
it('submits the existing Twin only explicitly, discloses metering and leaves actions as proposals',async()=>{
 const f=fixture();
 try{await f.render();expect(f.host.textContent).toContain('Business');expect(f.host.textContent).toContain('usage credits');await f.click('Prepare a payment');expect(f.api.twin.ask).not.toHaveBeenCalled();await f.submit();expect(f.api.twin.ask).toHaveBeenCalledTimes(1);expect(f.api.twin.ask.mock.calls[0]?.[0]).toMatchObject({message:'Prepare a payment',requestId:expect.any(String),quoteExpiresAt:expect.any(String)});expect(f.api.twin.ask.mock.calls[0]?.[0]).not.toHaveProperty('context');expect(f.host.textContent).toContain('A generated answer');expect(f.host.textContent).toContain('Proposal');expect(f.host.querySelector('a[href="https://receiz.com/review"]')).toBeNull();}finally{f.unmount();}
});
it('recovers a failed Twin request only explicitly using its original ID, expiry and selected context',async()=>{
 const f=fixture();f.api.twin.ask.mockRejectedValueOnce(Error('network interrupted'));
 try{await f.render();await f.input('Ask your assistant…','A question');await f.submit();const first=f.api.twin.ask.mock.calls[0]![0];expect(f.host.textContent).toContain('response is not confirmed');await f.submit();expect(f.api.twin.ask).toHaveBeenCalledTimes(1);await f.click('Check previous assistant request');const recovered=f.api.twin.ask.mock.calls[1]![0];expect({...recovered,signal:undefined}).toEqual({...first,signal:undefined});expect(f.host.textContent).toContain('A generated answer');}finally{f.unmount();}
});
it('shares only explicitly selected carried records and displays real returned Twin memory',async()=>{
 const f=fixture(),records=[{id:'one',title:'Held payment',text:'The chosen carried excerpt'},{id:'two',title:'Other record',text:'Do not share this'}];
 f.api.twin.ask.mockImplementationOnce(async(input)=>({requestId:input.requestId,message:'A generated answer',authority:'generated-interpretation',source:'upstream',memoryScope:'relationship',memory:[{id:'older-owner-memory',role:'assistant',body:'Existing owner Twin memory',createdAt:'2026-10-18T00:00:00Z',scope:'relationship',channel:'chat'}],sourceReferences:[],sharedContext:[],actionHandoffs:[]}));
 try{await f.render(true,f.identity,records);const boxes=f.host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');expect([...boxes].every(box=>!box.checked)).toBe(true);await act(async()=>boxes[0]!.click());await f.input('Ask your assistant…','Explain this');await f.submit();expect(f.api.twin.ask.mock.calls[0]?.[0].context).toEqual({schema:'receiz.owner-twin.context.v1',ownerUid:uid,disclosure:'owner-approved-for-this-request',records:[records[0]]});expect(f.host.textContent).toContain('Existing owner Twin memory');expect(f.host.textContent).toContain('may remain');}finally{f.unmount();}
});
it('streams real AI deltas and aborts the pending send when the document is hidden',async()=>{
 const f=fixture(),pending=deferred<ChatMessage>();f.api.messages.mockResolvedValue({...page,conversation:{...conversation,aiAgents:['existing-ai']}});
 f.api.send.mockImplementation(async(_id,_body,options)=>{options?.onDelta?.('existing-ai','Actual streamed delta');return pending.promise;});
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','My draft');await f.submit();expect(f.api.send.mock.calls[0]?.[2]?.stream).toBe(true);expect(f.host.textContent).toContain('Actual streamed delta');const signal=f.api.send.mock.calls[0]?.[2]?.signal;Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(signal?.aborted).toBe(true);await act(async()=>pending.resolve({...message,id:'late',body:'A late private result'}));expect(f.host.textContent).not.toContain('A late private result');expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('My draft');}finally{f.unmount();}
});
it('shows an existing call in the active thread without starting media or reading other call lists',async()=>{
 const f=fixture(),media=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:media}});
 const call={id:'55555555-5555-4555-8555-555555555555',conversationId:threadId,mode:'voice',status:'active',topology:'mesh',participants:[],activeParticipantCount:0};f.api.callTransport.heldFetch.mockImplementation(async()=>Response.json({ok:true,activeCall:call,call,calls:[call]}));
 try{await f.render();expect(f.api.callTransport.heldFetch).not.toHaveBeenCalled();await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('Call in progress');expect(media).not.toHaveBeenCalled();await f.click('Call in progress · Open to join');expect(f.host.querySelector('[aria-label="Join call"]')).not.toBeNull();expect(media).not.toHaveBeenCalled();expect(f.api.callTransport.heldFetch.mock.calls.every(([path])=>path.includes('/'+threadId+'/calls'))).toBe(true);}finally{f.unmount();}
});
it('renders returned current Twin pairs once, matches earlier pairs by carried IDs and retains distinct repeated text',async()=>{
 const f=fixture(),original=f.api.twin.ask.getMockImplementation()!;
 const memory=(id:string,role:'user'|'assistant',body:string,persistedId?:string,transportId?:string):NativeTwinMemory=>({id,role,body,createdAt:'2026-10-19T12:00:00Z',scope:'relationship',channel:'chat',...(persistedId?{persistedId}:{}),...(transportId?{transportId}:{})});
 const historical=[memory('old-user','user','Repeated question'),memory('old-assistant','assistant','Repeated answer')];
 const firstPair=[memory('fresh-user-uuid','user','Repeated question','persisted-user','transport-user'),memory('fresh-assistant-uuid','assistant','Repeated answer','persisted-assistant','transport-assistant')];
 const count=(text:string)=>[...f.host.querySelectorAll('p,.bank-twin-exchange>.bank-message-own')].filter(element=>element.textContent===text).length;
 f.api.twin.ask.mockImplementation(async(input)=>{
  const second=input.message==='Second question';
  return {...await original(input),message:second?'Second answer':'Repeated answer',memoryScope:'relationship',memory:[...historical,...(second?[memory('persisted-user','user','Repeated question'),memory('transport-assistant','assistant','Repeated answer')]:firstPair),...(second?[memory('another-user-uuid','user',input.message),memory('another-assistant-uuid','assistant','Second answer')]:[])]};
 });
 try{
  await f.render();await f.input('Ask your assistant…','Repeated question');await f.submit();
  expect(count('Repeated question')).toBe(2);expect(count('Repeated answer')).toBe(2);
  await f.input('Ask your assistant…','Second question');await f.submit();
  expect(count('Repeated question')).toBe(2);expect(count('Repeated answer')).toBe(2);
  expect(count('Second question')).toBe(1);expect(count('Second answer')).toBe(1);
  expect(f.host.querySelectorAll('.bank-twin-proposal')).toHaveLength(2);
 }finally{f.unmount();}
});
it('keeps distinct local Twin exchanges when memory is disabled even if their text repeats',async()=>{
 const f=fixture();
 try{await f.render();for(let i=0;i<2;i++){await f.input('Ask your assistant…','The same question');await f.submit();}expect([...f.host.querySelectorAll('.bank-twin-exchange>.bank-message-own')].filter(element=>element.textContent==='The same question')).toHaveLength(2);expect([...f.host.querySelectorAll('.bank-twin-reply>p')].filter(element=>element.textContent==='A generated answer')).toHaveLength(2);}finally{f.unmount();}
});
it('uses the host stream for ordinary DMs and appends incremental AI chunks exactly once',async()=>{
 const f=fixture(),pending=deferred<ChatMessage>();
 f.api.send.mockImplementation(async(_id,_body,options)=>{options?.onDelta?.('peer-owner-twin','H');options?.onDelta?.('peer-owner-twin','e');return pending.promise;});
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','My draft');await f.submit();expect(f.api.send.mock.calls[0]?.[2]?.stream).toBe(true);expect([...f.host.querySelectorAll('.bank-message-other>p')].some(element=>element.textContent==='He')).toBe(true);expect(f.host.textContent).not.toContain('HHe');await act(async()=>pending.resolve({...message,id:'acknowledged-dm',senderUserId:uid,body:'My draft'}));}finally{f.unmount();}
});

it('opens the existing payment review for the selected person without sending a message or executing money',async()=>{
 const f=fixture();try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.click('Send money');expect(f.onPreparePayment).toHaveBeenCalledWith({userId:peer.userId,username:peer.username});expect(f.api.send).not.toHaveBeenCalled();expect(f.api.twin.ask).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('keeps optional transaction context behind an ordinary closed Add context action',async()=>{
 const f=fixture();try{await f.render(true,f.identity,[{id:'one',title:'Money transfer · $1.00 · Oct 19',text:'Chosen excerpt'}]);const details=f.host.querySelector<HTMLDetailsElement>('.bank-twin-context')!;expect(details.open).toBe(false);expect(details.querySelector('summary')?.textContent).toBe('Add context');}finally{f.unmount();}
});

it('presents a structured money transfer once as a compact payment receipt',async()=>{
 const f=fixture(),payment={...message,body:'Transferred $25.00 to @sam',senderUserId:uid,walletTransfer:{kind:'chat_transfer',senderUserId:uid,recipientUserId:peer.userId,amountUsdCents:'2500',amountPhiMicro:'123456',note:'Lunch',transactionHref:'/transactions/one'}};
 f.api.messages.mockResolvedValue({...page,messages:[payment]});
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('Money sent');expect(f.host.textContent).toContain('$25.00');expect(f.host.textContent).toContain('Lunch');expect(f.host.textContent).not.toContain('Transferred $25.00 to @sam');expect(f.host.querySelector('article[aria-label="Recorded money transfer"] details')?.hasAttribute('open')).toBe(false);expect(f.host.querySelector('a[href="https://receiz.com/transactions/one"]')).not.toBeNull();}finally{f.unmount();}
});

it('paints an outgoing bubble immediately, then replaces it with the exact acknowledgement before the AI stream ends',async()=>{
 const f=fixture(),pending=deferred<ChatMessage>();let options:Parameters<typeof f.api.send>[2];
 f.api.send.mockImplementation(async(_id,_body,value)=>{options=value;return pending.promise;});
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','Instant outgoing');await f.submit();expect(f.host.querySelector('.bank-message-pending')?.textContent).toContain('Instant outgoing');expect(f.host.textContent).toContain('Sending');expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('');
  const sent={...message,id:'real-ack',senderUserId:uid,body:'Instant outgoing'};
  await act(async()=>options!.onMessage?.(sent));expect(f.host.querySelector('.bank-message-pending')).toBeNull();expect([...f.host.querySelectorAll('.bank-message-own>p')].filter(p=>p.textContent==='Instant outgoing')).toHaveLength(1);
  await act(async()=>{options!.onAiStart?.({id:'peer-twin',name:'Sam’s Twin'});});expect(f.host.querySelector('[aria-label="Sam’s Twin is responding"]')).not.toBeNull();
  await act(async()=>options!.onDelta?.('peer-twin','A live reply'));expect(f.host.textContent).toContain('A live reply');
  await act(async()=>{options!.onMessage?.({...message,id:'real-ai',senderKind:'ai',senderAiId:'peer-twin',body:'A live reply'});options!.onAiDone?.('peer-twin');});
  expect(f.host.querySelector('[aria-label="Sam’s Twin is responding"]')).toBeNull();expect([...f.host.querySelectorAll('.bank-message-other>p')].filter(p=>p.textContent==='A live reply')).toHaveLength(1);
  await act(async()=>pending.resolve(sent));expect(f.api.send).toHaveBeenCalledTimes(1);
 }finally{f.unmount();}
});
it('keeps an unacknowledged bubble visibly uncertain without inventing delivery or retrying it',async()=>{
 const f=fixture();f.api.send.mockRejectedValue(new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN',true));
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.input('Message…','Keep this once');await f.submit();expect(f.host.querySelector('.bank-message-pending')?.textContent).toContain('Delivery not confirmed');expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('Keep this once');await f.click('Refresh conversation');expect(f.api.send).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('shows the Twin question as a bubble as soon as it is submitted',async()=>{
 const f=fixture(),pending=deferred<NativeTwinReply>();f.api.twin.ask.mockImplementation(()=>pending.promise);
 try{await f.render();await f.input('Ask your assistant…','Explain this payment');await f.submit();expect(f.host.querySelector('.bank-twin-pending .bank-message-own')?.textContent).toContain('Explain this payment');expect(f.host.querySelector('[aria-label="Your assistant is responding"]')).not.toBeNull();}finally{f.unmount();}
});

it('shows only real peer typing activity and releases it on send and navigation without polling',async()=>{
 const f=fixture(),update=vi.fn(),close=vi.fn();let emit!:(ids:string[])=>void;
 f.api.typing=vi.fn((_id:string,onPeers:(ids:string[])=>void)=>{emit=onPeers;return{update,close};});
 try{await f.render();expect(f.api.typing).not.toHaveBeenCalled();await f.click('Messages');await f.click('Open conversation Sam');expect(f.api.typing).toHaveBeenCalledTimes(1);await act(async()=>emit([peer.userId]));expect(f.host.querySelector('[aria-label="Sam is typing"]')).not.toBeNull();await f.input('Message…','A private draft');expect(update).toHaveBeenLastCalledWith(true);await f.submit();expect(update).toHaveBeenLastCalledWith(false);await f.click('Back to messages');expect(close).toHaveBeenCalledTimes(1);expect(f.api.typing).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});

it('ignores a closed typing subscriber after changing conversations or waking the PWA',async()=>{
 const f=fixture(),callbacks:Array<(ids:string[])=>void>=[],closed=vi.fn();f.api.typing=vi.fn((_id:string,onPeers:(ids:string[])=>void)=>{callbacks.push(onPeers);return{update:vi.fn(),close:closed};});
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');await act(async()=>window.dispatchEvent(new Event('pagehide')));expect(closed).toHaveBeenCalledTimes(1);await act(async()=>window.dispatchEvent(new Event('pageshow')));expect(f.api.typing).toHaveBeenCalledTimes(2);await act(async()=>callbacks[1]([peer.userId]));await act(async()=>callbacks[0]([]));expect(f.host.querySelector('[aria-label="Sam is typing"]')).not.toBeNull();}finally{f.unmount();}
});

it('keeps one joined call while Messages closes, another conversation opens, and the floating window restores it',async()=>{
 const f=fixture(),stop=vi.fn(),track={kind:'audio',id:'held-call-audio',enabled:true,readyState:'live',stop},stream=Object.assign(new MediaStream([track as unknown as MediaStreamTrack]),{getTracks:()=>[track]});
 const media=vi.fn(async()=>stream);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:media}});
 const second={...conversation,id:'66666666-6666-4666-8666-666666666666',title:'Alex',members:[other]};f.api.conversations.mockResolvedValue([conversation,second]);f.api.messages.mockImplementation(async(id)=>({...page,conversation:id===second.id?second:conversation}));
 const call={id:'55555555-5555-4555-8555-555555555555',conversationId:threadId,mode:'voice',status:'active',topology:'mesh',participants:[{participantKind:'user',userId:uid,leftAt:null,displayName:'You'}],activeParticipantCount:1,viewerPermissions:{canEndCall:true}};
 f.api.callTransport.heldFetch.mockImplementation(async(path)=>path.endsWith('/ice')?Response.json({ok:true,iceServers:[{urls:'stun:synthetic.invalid'}],source:'fallback'}):path.includes('/signals?')?Response.json({ok:true,signals:[],lastSignalAt:null}):Response.json({ok:true,call,calls:[call],activeCall:call}));
 const leaves=()=>f.api.callTransport.heldFetch.mock.calls.filter(([,init])=>init?.method==='DELETE');
 try{
  await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.click('Voice call');await vi.waitFor(()=>expect(f.host.querySelector('[aria-label="Join call"]')).not.toBeNull());await f.click('Join call');
  expect(media).toHaveBeenCalledOnce();const video=f.host.querySelector('video');expect(video).not.toBeNull();
  await f.render(false);expect(document.querySelector('.bank-call-minimized')).not.toBeNull();expect(document.querySelector('.bank-call video')).toBe(video);expect(stop).not.toHaveBeenCalled();expect(leaves()).toHaveLength(0);
  await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="Return to call"]')!.click());expect(f.onOpen).toHaveBeenCalledOnce();await f.render(true);expect(f.host.querySelector('.bank-call video')).toBe(video);
  await f.click('Return to conversation');await f.click('Back to messages');await f.click('Open conversation Alex');expect(stop).not.toHaveBeenCalled();expect(leaves()).toHaveLength(0);expect(f.host.querySelector('video')).toBe(video);
  await f.click('Voice call');expect(f.host.querySelector('.bank-call')?.getAttribute('aria-label')).toBe('Call with Sam');expect(f.host.querySelector('video')).toBe(video);expect(media).toHaveBeenCalledOnce();
  await f.click('Leave call');expect(stop).toHaveBeenCalledOnce();expect(leaves()).toHaveLength(1);
 }finally{f.unmount();}expect(leaves()).toHaveLength(1);
});

it('opens a profile recipient in the existing direct conversation without creating a duplicate',async()=>{
 const f=fixture();try{await f.render(true,f.identity,undefined,{id:1,person:peer});expect(f.host.querySelector('.bank-thread-title')?.textContent??f.host.textContent).toContain('Sam');expect(f.api.createConversation).not.toHaveBeenCalled();expect(f.host.querySelector('[aria-label="Message…"]')).not.toBeNull();}finally{f.unmount();}
});
it('creates only once for a new profile Message intent and never sends a message automatically',async()=>{
 const f=fixture();f.api.knownConversations=()=>[];try{await f.render(true,f.identity,undefined,{id:2,person:other});expect(f.api.createConversation).toHaveBeenCalledExactlyOnceWith({participantUserIds:[other.userId]});expect(f.api.send).not.toHaveBeenCalled();await f.render(false,f.identity,undefined,{id:2,person:other});await f.render(true,f.identity,undefined,{id:2,person:other});expect(f.api.createConversation).toHaveBeenCalledTimes(1);}finally{f.unmount();}
});
it('links a direct chat header and sender photo/name to the Bankeiz profile using existing member data',async()=>{
 const f=fixture();try{await f.render(true,f.identity,undefined,{id:40,person:peer});const header=f.host.querySelector<HTMLAnchorElement>('.bank-chat-profile'),sender=f.host.querySelector<HTMLAnchorElement>('.bank-message-sender[href]');expect(header?.getAttribute('href')).toBe('/sam/');expect(sender?.getAttribute('href')).toBe('/sam/');expect(sender?.querySelector('.profile-avatar')).not.toBeNull();expect(f.api.search).not.toHaveBeenCalled();expect(f.api.createConversation).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('opens a compact group people list with local profile links and no member lookup',async()=>{
 const f=fixture(),group={...conversation,kind:'group' as const,title:'Friends',members:[peer,other]};f.api.knownConversations=()=>[group];f.api.conversations.mockResolvedValue([group]);f.api.messages.mockResolvedValue({...page,conversation:group});try{await f.render();await f.click('Messages');await f.click('Open conversation Friends');const before=f.api.conversations.mock.calls.length;await f.click('View group members');expect(f.host.querySelector('[aria-label="Group profiles"] a[href="/sam/"]')).not.toBeNull();expect(f.host.querySelector('[aria-label="Group profiles"] a[href="/alex/"]')).not.toBeNull();expect(f.api.conversations).toHaveBeenCalledTimes(before);expect(f.api.search).not.toHaveBeenCalled();}finally{f.unmount();}
});

it('opens the exact notification conversation without sending or creating anything',async()=>{const f=fixture();try{await f.render(true,f.identity,undefined,undefined,{recipientUserId:uid,conversationId:threadId});expect(f.host.querySelector('[aria-label="Message…"]')).not.toBeNull();expect(f.host.textContent).toContain('An actual fixture message');expect(f.api.send).not.toHaveBeenCalled();expect(f.api.createConversation).not.toHaveBeenCalled();}finally{f.unmount();}});
it('does not fetch a foreign notification thread or answer an expired call',async()=>{const f=fixture();try{await f.render(true,f.identity,undefined,undefined,{recipientUserId:peer.userId,conversationId:threadId});expect(f.host.textContent).toContain('belongs to another ID');expect(f.api.messages).not.toHaveBeenCalled();await f.render(true,f.identity,undefined,undefined,{recipientUserId:uid,conversationId:threadId,callId:other.userId,mode:'voice'});expect(f.host.querySelector('[aria-label="Message…"]')).not.toBeNull();expect(f.api.callTransport.heldFetch.mock.calls.every(([,init])=>!init?.method||init.method==='GET')).toBe(true);}finally{f.unmount();}});


it('notification lifecycle: retries an interrupted notification after foreground',async()=>{
 const f=fixture(),pending=deferred<ChatPage>(),target={recipientUserId:uid,conversationId:threadId};
 f.api.knownMessages=()=>null;
 f.api.messages.mockImplementationOnce(async(_id,_before,signal)=>{await pending.promise;if(signal?.aborted)throw new DOMException('Aborted','AbortError');return page;});
 try{await f.render(true,f.identity,undefined,undefined,target);expect(f.api.messages).toHaveBeenCalledTimes(1);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
 await act(async()=>pending.resolve(page));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(f.api.messages).toHaveBeenCalledTimes(2);expect(f.host.querySelector('[aria-label="Message…"]')).not.toBeNull();
 }finally{f.unmount();}
});
it('notification lifecycle: keeps the latest manual conversation intent while notification fetch is pending',async()=>{
 const f=fixture(),pending=deferred<ChatPage>(),target={recipientUserId:uid,conversationId:threadId},second={...conversation,id:'66666666-6666-4666-8666-666666666666',title:'Alex',members:[other]};
 f.api.knownMessages=()=>null;f.api.conversations.mockResolvedValue([conversation,second]);f.api.messages.mockImplementation(async(id)=>id===threadId?pending.promise:{...page,conversation:second});
 try{await f.render(true,f.identity,undefined,undefined,target);await f.click('Messages');await f.click('Open conversation Alex');expect(f.host.querySelector('.sheet-header h2')?.textContent).toBe('Alex');
 await act(async()=>pending.resolve(page));expect(f.host.querySelector('.sheet-header h2')?.textContent).toBe('Alex');
 }finally{f.unmount();}
});

it('notification lifecycle: does not replace a call joined while notification lookup is pending',async()=>{
 const f=fixture(),pending=deferred<Response>(),stop=vi.fn(),track={kind:'audio',id:'held-call-audio',enabled:true,readyState:'live',stop},stream=Object.assign(new MediaStream([track as unknown as MediaStreamTrack]),{getTracks:()=>[track]});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(async()=>stream)}});
 const second={...conversation,id:'66666666-6666-4666-8666-666666666666',title:'Alex',members:[other]},call={id:'55555555-5555-4555-8555-555555555555',conversationId:threadId,mode:'voice',status:'active',topology:'mesh',participants:[{participantKind:'user',userId:uid,leftAt:null,displayName:'You'}],activeParticipantCount:1,viewerPermissions:{canEndCall:true}},secondCall={...call,id:'77777777-7777-4777-8777-777777777777',conversationId:second.id};
 f.api.knownMessages=((id:string)=>id===second.id?{...page,conversation:second}:page) as typeof f.api.knownMessages;f.api.conversations.mockResolvedValue([conversation,second]);
 f.api.callTransport.heldFetch.mockImplementation(async(path)=>path===('/api/chat/conversations/'+second.id+'/calls')?pending.promise:path.endsWith('/ice')?Response.json({ok:true,iceServers:[{urls:'stun:synthetic.invalid'}],source:'fallback'}):path.includes('/signals?')?Response.json({ok:true,signals:[],lastSignalAt:null}):Response.json({ok:true,call,calls:[call],activeCall:call}));
 try{
 await f.render();await f.click('Messages');await f.click('Open conversation Sam');await f.click('Voice call');await vi.waitFor(()=>expect(f.host.querySelector('[aria-label="Join call"]')).not.toBeNull());
 await f.render(true,f.identity,undefined,undefined,{recipientUserId:uid,conversationId:second.id,callId:secondCall.id,mode:'voice'});
 await f.click('Join call');expect(stop).not.toHaveBeenCalled();
 await act(async()=>pending.resolve(Response.json({ok:true,call:secondCall,calls:[secondCall],activeCall:secondCall})));expect(f.host.querySelector('.bank-call')?.getAttribute('aria-label')).toBe('Call with Sam');
 expect(stop).not.toHaveBeenCalled();
 }finally{f.unmount();}
});
