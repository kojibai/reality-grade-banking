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
 const api={accountUid:uid,twin,callTransport:{heldFetch:vi.fn(async(_path:string,_init?:RequestInit)=>Response.json({ok:true,calls:[],activeCall:null}))},knownConversations:()=>[conversation],knownMessages:()=>page,conversations:vi.fn(async(_signal?:AbortSignal)=>[conversation]),messages:vi.fn(async(_id:string,_before?:string,_signal?:AbortSignal)=>page),search:vi.fn(async(_query:string,_signal?:AbortSignal)=>[peer,other]),createConversation:vi.fn(async(_input:{participantUserIds:string[];title?:string})=>threadId),send:vi.fn(async(_id:string,_body:string,_options?:MessageSendOptions)=>({...message,id:'sent-1',senderUserId:uid,body:'My draft'}))};
 const identity={binding:{identityOwnerReceizId:'owner'},messaging:vi.fn(async(approve=false)=>{if(!approved&&!approve)throw Error('MESSAGING_CONSENT_REQUIRED');approved=true;return api;})} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host),onClose=vi.fn(),onPreparePayment=vi.fn();
 const render=(active=true,nextIdentity=identity,twinContextRecords?:ReadonlyArray<{id:string;title:string;text:string}>)=>act(async()=>root.render(<MessagesPanel identity={nextIdentity} active={active} onClose={onClose} onPreparePayment={onPreparePayment} twinContextRecords={twinContextRecords}/>));
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent===label);expect(button,'button '+label).toBeTruthy();await act(async()=>button!.click());};
 const input=async(label:string,value:string)=>{const field=host.querySelector<HTMLInputElement>('[aria-label="'+label+'"]')!;expect(field,'input '+label).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});};
 const submit=()=>act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 return{api:api as typeof api&NativeMessaging,identity,host,render,click,input,submit,onClose,onPreparePayment,unmount(){act(()=>root.unmount());host.remove();}};
}
it('requires one explicit permission before private reads, then opens Twin without sending anything',async()=>{
 const outbound=vi.fn(()=>{throw Error('No outbound tests');});vi.stubGlobal('fetch',outbound);const f=fixture(false);
 try{await f.render();expect(f.host.textContent).toContain('Use your existing Receiz messages, groups, calls and Twin through this ID. Nothing sent until you send.');expect(f.api.conversations).not.toHaveBeenCalled();expect(f.api.twin.ask).not.toHaveBeenCalled();await f.click('Enable messages');expect(f.identity.messaging).toHaveBeenLastCalledWith(true);expect(f.host.textContent).toContain('Your bank,');expect(f.api.twin.ask).not.toHaveBeenCalled();expect(outbound).not.toHaveBeenCalled();}finally{f.unmount();}
});
it('uses known thread truth immediately and keeps it through a background refresh',async()=>{
 const pending=deferred<ChatPage>(),f=fixture();f.api.messages.mockImplementation(()=>pending.promise);
 try{await f.render();await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('An actual fixture message');expect(f.host.textContent).not.toContain('Loading messages');await act(async()=>pending.resolve({...page,messages:[message,{...message,id:'appended',body:'A verified addition'}]}));expect(f.host.textContent).toContain('A verified addition');}finally{f.unmount();}
});
it('shows the composer and retained conversations before remote admission finishes, without an opening screen',async()=>{
 const f=fixture(),pending=deferred<NativeMessaging>();
 const identity={...f.identity,knownMessagingDisplay:()=>({schema:'bankeiz.messaging-display.v1' as const,accountUid:uid,inbox:[conversation],pages:[page]}),messaging:()=>pending.promise};
 try{await f.render(true,identity);expect(f.host.querySelector('[aria-label="Ask your Twin…"]')).not.toBeNull();expect(f.host.textContent).not.toContain('Opening your');await f.click('Messages');await f.click('Open conversation Sam');expect(f.host.textContent).toContain('An actual fixture message');expect(f.api.conversations).not.toHaveBeenCalled();await f.input('Message…','Draft before connection');await f.submit();expect(f.api.send).not.toHaveBeenCalled();await act(async()=>pending.resolve(f.api));expect(f.host.querySelector<HTMLInputElement>('[aria-label="Message…"]')?.value).toBe('Draft before connection');expect(f.api.conversations).toHaveBeenCalledTimes(1);}finally{f.unmount();}
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
 try{await f.render();await f.input('Ask your Twin…','A question');await f.submit();const first=f.api.twin.ask.mock.calls[0]![0];expect(f.host.textContent).toContain('outcome is not confirmed');await f.submit();expect(f.api.twin.ask).toHaveBeenCalledTimes(1);await f.click('Check previous Twin request');const recovered=f.api.twin.ask.mock.calls[1]![0];expect({...recovered,signal:undefined}).toEqual({...first,signal:undefined});expect(f.host.textContent).toContain('A generated answer');}finally{f.unmount();}
});
it('shares only explicitly selected carried records and displays real returned Twin memory',async()=>{
 const f=fixture(),records=[{id:'one',title:'Held payment',text:'The chosen carried excerpt'},{id:'two',title:'Other record',text:'Do not share this'}];
 f.api.twin.ask.mockImplementationOnce(async(input)=>({requestId:input.requestId,message:'A generated answer',authority:'generated-interpretation',source:'upstream',memoryScope:'relationship',memory:[{id:'older-owner-memory',role:'assistant',body:'Existing owner Twin memory',createdAt:'2026-10-18T00:00:00Z',scope:'relationship',channel:'chat'}],sourceReferences:[],sharedContext:[],actionHandoffs:[]}));
 try{await f.render(true,f.identity,records);const boxes=f.host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');expect([...boxes].every(box=>!box.checked)).toBe(true);await act(async()=>boxes[0]!.click());await f.input('Ask your Twin…','Explain this');await f.submit();expect(f.api.twin.ask.mock.calls[0]?.[0].context).toEqual({schema:'receiz.owner-twin.context.v1',ownerUid:uid,disclosure:'owner-approved-for-this-request',records:[records[0]]});expect(f.host.textContent).toContain('Existing owner Twin memory');expect(f.host.textContent).toContain('may remain');}finally{f.unmount();}
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
  await f.render();await f.input('Ask your Twin…','Repeated question');await f.submit();
  expect(count('Repeated question')).toBe(2);expect(count('Repeated answer')).toBe(2);
  await f.input('Ask your Twin…','Second question');await f.submit();
  expect(count('Repeated question')).toBe(2);expect(count('Repeated answer')).toBe(2);
  expect(count('Second question')).toBe(1);expect(count('Second answer')).toBe(1);
  expect(f.host.querySelectorAll('.bank-twin-proposal')).toHaveLength(2);
 }finally{f.unmount();}
});
it('keeps distinct local Twin exchanges when memory is disabled even if their text repeats',async()=>{
 const f=fixture();
 try{await f.render();for(let i=0;i<2;i++){await f.input('Ask your Twin…','The same question');await f.submit();}expect([...f.host.querySelectorAll('.bank-twin-exchange>.bank-message-own')].filter(element=>element.textContent==='The same question')).toHaveLength(2);expect([...f.host.querySelectorAll('.bank-twin-reply>p')].filter(element=>element.textContent==='A generated answer')).toHaveLength(2);}finally{f.unmount();}
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
 try{await f.render();await f.input('Ask your Twin…','Explain this payment');await f.submit();expect(f.host.querySelector('.bank-twin-pending .bank-message-own')?.textContent).toContain('Explain this payment');expect(f.host.querySelector('[aria-label="Your Twin is responding"]')).not.toBeNull();}finally{f.unmount();}
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
