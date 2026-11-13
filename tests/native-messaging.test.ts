import {describe,it,expect,vi} from 'vitest';
import {createNativeMessaging,MessagingError,type ChatConversation,type ChatMessage} from '../src/receiz/native-messaging';
const conversationId='11111111-1111-4111-8111-111111111111';
const userId='22222222-2222-4222-8222-222222222222';
const summary:ChatConversation={id:conversationId,kind:'dm',title:'Mira',members:[{kind:'user',userId,username:'mira',displayName:'Mira',avatarUrl:null}],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:null,createdAt:'2026-10-19T12:00:00Z',updatedAt:'2026-10-19T12:00:00Z',lastMessageAt:null};
const message=(id='m1',body='Hello'):ChatMessage=>({id,conversationId,senderUserId:userId,senderKind:'user',senderAiId:null,senderDisplay:'Mira',body,createdAt:'2026-10-19T12:00:00Z',receizedAt:'2026-10-19T12:00:00Z',sealedOriginalAvailable:true,receipt:{digest:'a'.repeat(64)}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
describe('existing Receiz messaging composition',()=>{
 it('paints a retained inbox and opened thread before transport, then updates them through the same reads',async()=>{
  const request=vi.fn(async()=>json({ok:true,conversations:[{...summary,title:'Updated Mira'}]}));
  const retained={schema:'bankeiz.messaging-display.v1' as const,accountUid:userId,inbox:[summary],pages:[{conversation:summary,messages:[message()],hasMore:false,nextCursor:null}]};
  const changed=vi.fn();const api=createNativeMessaging({request,accountUid:userId,retained,onChange:changed});
  expect(api.knownConversations()[0].title).toBe('Mira');expect(api.knownMessages(conversationId)?.messages[0].body).toBe('Hello');expect(request).not.toHaveBeenCalled();
  await api.conversations();expect(api.knownConversations()[0].title).toBe('Updated Mira');expect(request).toHaveBeenCalledTimes(1);expect(changed).toHaveBeenCalledTimes(1);
 });
 it('never seeds another admitted account from a retained display',()=>{
  const api=createNativeMessaging({request:vi.fn(),accountUid:userId,retained:{schema:'bankeiz.messaging-display.v1',accountUid:conversationId,inbox:[summary],pages:[]}});
  expect(api.knownConversations()).toEqual([]);
 });
 it('uses the existing Receiz directory for full names as well as usernames',async()=>{
  const request=vi.fn(async(_path:string)=>json({ok:true,users:[{kind:'user',userId,username:'mira',displayName:'Mira West',avatarUrl:null}]}));const api=createNativeMessaging({request,accountUid:conversationId});
  expect(await api.search('Mira West')).toHaveLength(1);expect(request.mock.calls[0][0]).toBe('/api/chat/users/search?q=mira%20west');
 });
 it('loads existing conversations once for simultaneous readers and retains them for reopen',async()=>{
  const request=vi.fn(async()=>json({ok:true,conversations:[summary]}));const api=createNativeMessaging({request,accountUid:userId});
  const [first,second]=await Promise.all([api.conversations(),api.conversations()]);expect(first).toEqual(second);expect(first[0].title).toBe('Mira');expect(api.knownConversations()).toEqual(first);expect(request).toHaveBeenCalledTimes(1);
 });
 it('joins older pages by message ID without losing live retained messages or original proof fields',async()=>{
  let page=0;const request=vi.fn(async()=>json({ok:true,conversation:summary,messages:page++?[message('old'),message()]:[message()],hasMore:page===1,nextCursor:page===1?'2026-10-19T12:00:00.000Z':null}));const api=createNativeMessaging({request,accountUid:userId});
  const first=await api.messages(conversationId);const older=await api.messages(conversationId,first.nextCursor!);expect(older.messages.map(m=>m.id)).toEqual(['old','m1']);expect(older.messages[1].receipt).toEqual({digest:'a'.repeat(64)});expect(older.messages[1].sealedOriginalAvailable).toBe(true);
 });
 it('creates one DM or a group through the existing endpoint without a local invented conversation',async()=>{
  const request=vi.fn(async(_path:string,_init?:RequestInit)=>json({ok:true,conversation:{id:conversationId}}));const api=createNativeMessaging({request,accountUid:userId});
  expect(await api.createConversation({participantUserIds:[userId],title:'Studio'})).toBe(conversationId);expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({kind:'dm',participantUserIds:[userId]});expect(api.knownConversations()).toEqual([]);
 });
 it('keeps a lost send ambiguous and never resends it automatically',async()=>{
  const request=vi.fn(async()=>{throw Error('network lost');});const api=createNativeMessaging({request,accountUid:userId});
  await expect(api.send(conversationId,'A single message')).rejects.toMatchObject({ambiguous:true});expect(request).toHaveBeenCalledTimes(1);expect(api.knownMessages(conversationId)).toBeNull();
 });
 it('admits an SSE user message and AI response incrementally and requires the real done event',async()=>{
  let sink!:ReadableStreamDefaultController<Uint8Array>;const source=new ReadableStream<Uint8Array>({start(c){sink=c;}});const request=vi.fn(async()=>new Response(source,{headers:{'content-type':'text/event-stream'}}));const api=createNativeMessaging({request,accountUid:userId});const deltas:string[]=[];
  const sending=api.send(conversationId,'Question',{stream:true,onDelta:(_id,text)=>deltas.push(text)});const emit=(event:unknown)=>sink.enqueue(new TextEncoder().encode('data: '+JSON.stringify(event)+'\n\n'));
  emit({type:'user_message',message:message('sent','Question')});emit({type:'ai_delta',agentId:'agent',delta:'First',text:'First'});emit({type:'ai_delta',agentId:'agent',delta:' second',text:'First second'});await vi.waitFor(()=>expect(deltas).toEqual(['First',' second']));expect(api.knownMessages(conversationId)?.messages[0].id).toBe('sent');
  emit({type:'ai_done',message:{...message('reply','First'),senderKind:'ai'}});emit({type:'done'});sink.close();await sending;expect(api.knownMessages(conversationId)?.messages.map(m=>m.id)).toEqual(['sent','reply']);
 });
 it('reports truncated streaming as uncertain delivery while retaining the acknowledged message',async()=>{
  const source=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({type:'user_message',message:message()})+'\n\n'));c.close();}});const api=createNativeMessaging({accountUid:userId,request:async()=>new Response(source,{headers:{'content-type':'text/event-stream'}})});
  await expect(api.send(conversationId,'Hello',{stream:true})).rejects.toMatchObject({ambiguous:true,acknowledgedMessageId:'m1'});expect(api.knownMessages(conversationId)?.messages).toHaveLength(1);
 });
 it('preserves server refusals and rejects foreign conversation payloads',async()=>{
  const request=vi.fn(async()=>json({ok:false,error:'chat_not_participant'},403));const api=createNativeMessaging({request,accountUid:userId});await expect(api.messages(conversationId)).rejects.toMatchObject({code:'chat_not_participant',ambiguous:false});
  request.mockImplementation(async()=>json({ok:true,conversation:summary,messages:[{...message(),conversationId:userId}],hasMore:false,nextCursor:null}));await expect(api.messages(conversationId)).rejects.toBeInstanceOf(MessagingError);expect(api.knownMessages(conversationId)).toBeNull();
 });
 it('does not initiate transport for unsafe IDs or oversized messages',async()=>{
  const request=vi.fn();const api=createNativeMessaging({request,accountUid:userId});expect(()=>api.messages('../wallet')).toThrow();await expect(api.send(conversationId,'x'.repeat(16385))).rejects.toThrow();expect(request).not.toHaveBeenCalled();
 });
});
it('treats server failures after a non-idempotent write as an unknown outcome',async()=>{
 const api=createNativeMessaging({accountUid:userId,request:async()=>json({ok:false,error:'chat_store_unavailable'},503)});
 await expect(api.send(conversationId,'One message')).rejects.toMatchObject({ambiguous:true});await expect(api.createConversation({participantUserIds:[userId]})).rejects.toMatchObject({ambiguous:true});
});

it('admits first history pagination when an acknowledged send arrived before that read',async()=>{
 let finish!:(response:Response)=>void;const request=async(_path:string,init?:RequestInit)=>init?.method==='POST'?json({ok:true,message:message('sent')}):new Promise<Response>(resolve=>{finish=resolve;});
 const api=createNativeMessaging({request,accountUid:userId});const reading=api.messages(conversationId);await api.send(conversationId,'Hello');finish(json({ok:true,conversation:summary,messages:[message('earlier')],hasMore:true,nextCursor:'2026-10-19T12:00:00.000Z'}));const result=await reading;expect(result.hasMore).toBe(true);expect(result.nextCursor).toBe('2026-10-19T12:00:00.000Z');expect(result.messages.map(v=>v.id)).toContain('sent');
});

it('forwards acknowledged messages and real AI typing lifecycle from the existing SSE stream',async()=>{
 const events=[{type:'user_message',message:message('sent')},{type:'ai_start',agent:{id:'agent',name:'Mira’s Twin'}},{type:'ai_delta',agentId:'agent',delta:'Hi'},{type:'ai_done',agentId:'agent',message:{...message('reply','Hi'),senderKind:'ai',senderAiId:'agent'}},{type:'done'}];
 const request=vi.fn(async()=>new Response(events.map(event=>'data: '+JSON.stringify(event)+'\n\n').join(''),{headers:{'content-type':'text/event-stream'}}));const api=createNativeMessaging({request,accountUid:userId});const onMessage=vi.fn(),onAiStart=vi.fn(),onAiDone=vi.fn();await api.send(conversationId,'Hi',{stream:true,onMessage,onAiStart,onAiDone});
 expect(onMessage.mock.calls.map(([m])=>m.id)).toEqual(['sent','reply']);expect(onAiStart).toHaveBeenCalledWith({id:'agent',name:'Mira’s Twin'});expect(onAiDone).toHaveBeenCalledWith('agent');expect(request).toHaveBeenCalledTimes(1);
});

it('places a newly delivered earlier email between held rows and keeps equal-time order across retention',async()=>{
 const row=(id:string,at:string):ChatMessage=>({...message(id),createdAt:at});
 const early=row('early','2026-10-19T10:00:00Z'),late=row('late','2026-10-19T12:00:00Z');
 const delayed:ChatMessage={...row('delayed','2026-10-19T11:00:00Z'),senderKind:'external-email',senderUserId:null,senderAiId:null,walletTransfer:null,transport:{fromEmail:'sender@example.test',recipientAlias:'alice@receiz.com'}};
 let count=0;const api=createNativeMessaging({accountUid:userId,retained:{schema:'bankeiz.messaging-display.v1',accountUid:userId,inbox:[summary],pages:[{conversation:summary,messages:[early,late],hasMore:false,nextCursor:null}]},request:async()=>json({ok:true,conversation:summary,messages:count++?[row('equal-two',late.createdAt),delayed]:[delayed,row('equal-one',late.createdAt)],hasMore:false,nextCursor:null})});
 expect((await api.messages(conversationId)).messages.map(row=>row.id)).toEqual(['early','delayed','late','equal-one']);
 expect((await api.messages(conversationId)).messages.map(row=>row.id)).toEqual(['early','delayed','late','equal-one','equal-two']);
});
it('learns email creation capability from the existing inbox response and retains it without another opening request',async()=>{
 const request=vi.fn(async()=>json({ok:true,conversations:[],capabilities:{emailConversations:true}})),changed=vi.fn(),api=createNativeMessaging({accountUid:userId,request,onChange:changed});
 expect(api.emailConversationsAvailable()).toBe(false);expect(request).not.toHaveBeenCalled();await api.conversations();expect(api.emailConversationsAvailable()).toBe(true);expect(request).toHaveBeenCalledOnce();expect(changed.mock.calls[0][0].emailConversations).toBe(true);
 const {projectMessagingDisplay,readMessagingDisplay}=await import('../src/receiz/messaging-retention');const held=readMessagingDisplay(projectMessagingDisplay(changed.mock.calls[0][0]),userId)!;expect(createNativeMessaging({accountUid:userId,request:vi.fn(),retained:held}).emailConversationsAvailable()).toBe(true);
});
it('requests a selected missing message through the existing member-authorized thread path and retains held rows',async()=>{
 const selected='55555555-5555-4555-8555-555555555555',request=vi.fn(async(_path:string)=>json({ok:true,conversation:summary,messages:[message(selected,'Selected older message')],hasMore:true,nextCursor:'2026-10-19T12:00:00Z'}));
 const api=createNativeMessaging({accountUid:userId,request,retained:{schema:'bankeiz.messaging-display.v1',accountUid:userId,inbox:[summary],pages:[{conversation:summary,messages:[message('held')],hasMore:true,nextCursor:'2026-10-19T12:00:00Z'}]}});
 const result=await api.messages(conversationId,undefined,undefined,selected);expect(request.mock.calls[0][0]).toBe('/api/chat/conversations/'+conversationId+'/messages?limit=100&messageId='+selected);expect(result.messages.map(row=>row.id)).toEqual(['held',selected]);
 const {permittedNativeChatPath}=await import('../src/receiz/native-chat-paths');expect(permittedNativeChatPath(new URL('https://bankeiz.com'+request.mock.calls[0][0]),'GET')).toBe(true);
 for(const query of['messageId=','messageId='+selected+'&messageId='+selected,'before=2026-10-19T12%3A00%3A00Z&messageId='+selected])expect(permittedNativeChatPath(new URL('https://bankeiz.com/api/chat/conversations/'+conversationId+'/messages?'+query),'GET')).toBe(false);
});
