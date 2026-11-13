import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {createNativeMessaging} from '../src/receiz/native-messaging';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/emailObservationWire.json',import.meta.url),'utf8'));
it('accepts the exact Native producer inbox/thread wire and retains its email presentation on cold reopen',async()=>{
 expect(fixture.producer).toBe('appendChatEmailObservation/projectEmailObservationRow');
 const conversation={id:fixture.conversationId,kind:'group',title:'Sender',members:[],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:fixture.wire,createdAt:fixture.wire.createdAt,updatedAt:fixture.wire.createdAt,lastMessageAt:fixture.wire.createdAt};
 const request=vi.fn(async(path:string)=>Response.json(path==='/api/chat/conversations'?{ok:true,conversations:[conversation]}:{ok:true,conversation,messages:[fixture.wire],hasMore:false,nextCursor:null}));
 const api=createNativeMessaging({accountUid:fixture.owner,request});await api.conversations();const page=await api.messages(fixture.conversationId);
 expect(page.messages[0]).toMatchObject({senderKind:'external-email',senderUserId:null,senderAiId:null,transport:{fromEmail:'sender@example.test',recipientAlias:'alice@receiz.com',subject:'Exact incoming email'}});
 const saved=projectMessagingDisplay({accountUid:fixture.owner,inbox:api.knownConversations(),pages:[page]}),reopened=readMessagingDisplay(JSON.parse(JSON.stringify(saved)),fixture.owner);
 expect(reopened?.pages[0]?.messages[0]).toMatchObject({body:'A delivered email message',transport:{fromEmail:'sender@example.test',recipientAlias:'alice@receiz.com',subject:'Exact incoming email'}});
});

it('downloads through the actual client URL and Bank binary relay with unchanged Native MIME bytes',async()=>{
 const {relayNativeAccount,nativeRequestPath}=await import('../server/native-account');
 const nativePath='/api/chat/messages/'+fixture.wire.id+'/original';
 expect(nativeRequestPath('/api/bank/native'+nativePath,'GET')).toBe(nativePath);
 const upstream=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{expect(String(input)).toBe('https://receiz.com'+nativePath);expect(new Headers(init?.headers).get('authorization')).toBe('Bearer delegated-chat-read');expect(new Headers(init?.headers).has('cookie')).toBe(false);return new Response(Buffer.from(fixture.mimeBase64,'base64'),{headers:{'content-type':'message/rfc822','content-disposition':'attachment; filename="email.eml"'}});});
 vi.stubGlobal('fetch',upstream);
 try{
  const api=createNativeMessaging({accountUid:fixture.owner,request:async(path,init)=>relayNativeAccount(new Request('https://bankeiz.com/api/bank/native'+path,{...init,headers:{Origin:'https://bankeiz.com',Authorization:'Bearer delegated-chat-read'}}))});
  const original=await api.emailOriginal(fixture.conversationId,fixture.wire.id);expect(original.type).toBe('message/rfc822');expect(Buffer.from(await original.arrayBuffer())).toEqual(Buffer.from(fixture.mimeBase64,'base64'));expect(upstream).toHaveBeenCalledOnce();
 }finally{vi.unstubAllGlobals();}
});
it('the Original relay refuses JSON or an unsafe extension and cancels oversized MIME bodies',async()=>{
 const {relayNativeAccount}=await import('../server/native-account'),url='https://bankeiz.com/api/bank/native/api/chat/messages/'+fixture.wire.id+'/original';
 for(const headers of[{'content-type':'application/json','content-disposition':'attachment; filename="email.eml"'},{'content-type':'message/rfc822','content-disposition':'attachment; filename="email.html"'}]){
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{headers})));expect((await relayNativeAccount(new Request(url))).status).toBe(503);
 }
 const cancel=vi.fn();vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(25*1024*1024+1));},cancel}),{headers:{'content-type':'message/rfc822','content-disposition':'attachment; filename="email.eml"'}})));
 try{expect((await relayNativeAccount(new Request(url))).status).toBe(503);expect(cancel).toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
