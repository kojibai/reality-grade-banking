import {expect,it,vi} from 'vitest';
import {createNativeMessaging} from '../src/receiz/native-messaging';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';
const uid='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222';
const external={id:'email1',conversationId:room,senderKind:'external-email',senderUserId:null,senderAiId:null,senderDisplay:'Alex',body:'Your code is 123456',createdAt:'2026-11-13T15:00:00Z',receizedAt:'2026-11-13T15:00:01Z',receipt:{private:'not display'},sealedOriginalAvailable:true,walletTransfer:null,transport:{fromEmail:'alex@example.test',recipientAlias:'alice@receiz.com',subject:'Sign in'}};
const conversation={id:room,kind:'group',title:'Alex',members:[],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:external,createdAt:external.createdAt,updatedAt:external.createdAt,lastMessageAt:external.createdAt,emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:uid,correspondentUserId:'33333333-3333-4333-8333-333333333333',correspondentEmail:'alex@example.test',displayName:'Alex',subject:'Sign in'}};
const json=(body:unknown)=>Response.json(body);
it('external observations remain in the same inbox and cold display with truthful email identity and no native or financial authority',async()=>{
 const request=vi.fn(async(path:string)=>path.includes('/messages')?json({ok:true,conversation,messages:[external],hasMore:false,nextCursor:null}):json({ok:true,conversations:[conversation]}));
 const api=createNativeMessaging({request,accountUid:uid});await api.conversations();const page=await api.messages(room);expect(page.messages[0].senderUserId).toBeNull();expect(page.messages[0].senderKind).toBe('external-email');
 const held=projectMessagingDisplay({accountUid:uid,inbox:api.knownConversations(),pages:[page]}),reopened=readMessagingDisplay(held,uid);expect(reopened?.pages[0].messages[0]).toMatchObject({senderKind:'external-email',senderUserId:null,senderAiId:null,walletTransfer:null,transport:{fromEmail:'alex@example.test'}});expect(reopened?.pages[0].conversation.emailChannel?.correspondentEmail).toBe('alex@example.test');expect(JSON.stringify(reopened)).not.toContain('not display');
 const offline=createNativeMessaging({request:async()=>{throw Error('stalled');},accountUid:uid,retained:held});expect(offline.knownMessages(room)?.messages[0].body).toBe('Your code is 123456');
});
it('forged external native authorship or payment metadata is refused without dropping held messages',async()=>{
 for(const patch of [{senderUserId:uid},{senderAiId:'world:owner'},{walletTransfer:{kind:'chat_transfer'}}]){
  const api=createNativeMessaging({request:async()=>json({ok:true,conversation,messages:[{...external,...patch}],hasMore:false,nextCursor:null}),accountUid:uid});await expect(api.messages(room)).rejects.toMatchObject({code:'CHAT_RESPONSE_INVALID'});
 }
});
it('the existing compose endpoint accepts a normalized email without creating another chat history or sending an email immediately',async()=>{
 const request=vi.fn(async(_path:string,_init?:RequestInit)=>json({ok:true,conversation:{id:room}})),api=createNativeMessaging({request,accountUid:uid});
 expect(await api.createEmailConversation(' ALEX@Example.Test ')).toBe(room);expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({emailRecipient:'alex@example.test'});expect(request.mock.calls[0][0]).toBe('/api/chat/conversations');expect(request).toHaveBeenCalledTimes(1);
});
