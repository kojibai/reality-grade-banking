import {describe,it,expect} from 'vitest';
import {emailReplyDisplay} from '../src/receiz/email-reply-display';
import {projectEmailReplyBody} from '../src/receiz/email-reply-body';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmailMessage} from '../src/features/messages/EmailMessage';
import {createNativeMessaging,type ChatMessage,type ChatConversation} from '../src/receiz/native-messaging';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';
const owner='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222',invalid='SYNTHETIC_INVALID_NOT_A_LOGIN_CREDENTIAL';
const url='https://receiz.com/auth/verify?token='+invalid+'&email=other%40example.invalid&next=%2Faccount';
const message:ChatMessage={id:'44444444-4444-4444-8444-444444444444',conversationId:room,senderKind:'external-email',senderUserId:null,senderAiId:null,walletTransfer:null,senderDisplay:'Sender',body:'My new reply.\n\nOn Friday, Someone wrote:\n> Open secure message link: '+url,createdAt:'2026-11-13T15:00:00Z',receizedAt:'2026-11-13T15:00:01Z',receipt:{digest:'a'.repeat(64)},sealedOriginalAvailable:true,sealedOriginal:{body:'Quoted '+url,transport:{inReplyTo:'<sent@example.invalid>',references:[]}},transport:{fromEmail:'sender@example.invalid',recipientAlias:'host@receiz.com',subject:'Reply'}};
const conversation:ChatConversation={id:room,kind:'group',title:'Existing thread',members:[],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:message,createdAt:message.createdAt,updatedAt:message.createdAt,lastMessageAt:message.createdAt};
describe('external reply capability disclosure',()=>{
 it('cleans old wire bodies and drops sensitive raw originals before exposing message state',async()=>{
  const before=JSON.stringify(message),api=createNativeMessaging({accountUid:owner,request:async()=>Response.json({ok:true,conversation,messages:[message],hasMore:false,nextCursor:null})});
  const page=await api.messages(room);expect(page.messages[0].body).toBe('My new reply.');expect(JSON.stringify(page)).not.toContain(invalid);expect(page.messages[0].sealedOriginalAvailable).toBe(false);expect(page.messages[0].sealedOriginal).toBeUndefined();expect(JSON.stringify(message)).toBe(before);
 });
 it('projects and cold-reopens old display retention before first-frame rendering without network',()=>{
  const legacy={schema:'bankeiz.messaging-display.v1',accountUid:owner,inbox:[conversation],pages:[{conversation,messages:[message],hasMore:false,nextCursor:null}]},opened=readMessagingDisplay(legacy,owner);expect(opened).not.toBeNull();expect(JSON.stringify(opened)).not.toContain(invalid);expect(opened!.pages[0].messages[0].body).toBe('My new reply.');expect(JSON.stringify(projectMessagingDisplay(legacy))).not.toContain(invalid);
 });
 it('never emits a recipient capability or Original action from directly supplied legacy email props',()=>{
  const markup=renderToStaticMarkup(<EmailMessage message={message} download={async()=>{throw Error('NO_NETWORK_ALLOWED');}}/>);expect(markup).toContain('My new reply.');expect(markup).not.toContain(invalid);expect(markup).not.toContain('Open original email');
 });
 it('preserves an ordinary unthreaded OTP and unrelated verification link',()=>{
  const clean={...message,body:'Your code is 123456. https://provider.example.invalid/verify?token=SYNTHETIC_PROVIDER_CODE',sealedOriginal:undefined};const markup=renderToStaticMarkup(<EmailMessage message={clean} download={async()=>{}}/>);expect(markup).toContain('123456');expect(markup).toContain('provider.example.invalid/verify?token=SYNTHETIC_PROVIDER_CODE');
 });
});

describe('safe reply projection compatibility',()=>{
 it('removes copied sender and subject capabilities without altering the held source',()=>{const value={...message,body:'My safe reply.',senderDisplay:'Sender '+url,transport:{...message.transport,subject:url}},before=JSON.stringify(value),display=emailReplyDisplay(value);expect(JSON.stringify(display)).not.toContain(invalid);expect(JSON.stringify(value)).toBe(before);expect(display.sealedOriginalAvailable).toBe(false);expect(display.emailReplyDisplay?.displayOnly).toBe(true);});
 it('uses the same HTML quote and encoded-capability rules before cold retention',()=>{for(const value of[url,encodeURIComponent(url),url.replace('https:','')])expect(projectEmailReplyBody({text:'My reply.\n\nCustom quote '+value,html:null})).not.toContain(invalid);expect(projectEmailReplyBody({text:null,html:'<div>My reply.</div><div class="gmail_quote"><a href="'+url+'">Old</a></div>',reply:true})).toBe('My reply.');});
 it('preserves native messages by reference',()=>{const native={...message,senderKind:'user' as const,senderUserId:owner,body:'Native text '+url};expect(emailReplyDisplay(native)).toBe(native);});
});

describe('reviewer URL and unthreaded compatibility regressions',()=>{
 it('detects a capability after an ordinary URL in legacy wire/cache/display copies',()=>{const value={...message,body:'My reply includes https://docs.example.invalid/guide\n\nCustom quoted notification:\nOpen secure message link: '+url},view=emailReplyDisplay(value);expect(JSON.stringify(view)).not.toContain(invalid);expect(view.body).toContain('https://docs.example.invalid/guide');expect(renderToStaticMarkup(<EmailMessage message={value} download={async()=>{}}/>)).not.toContain(invalid);});
 it('preserves unthreaded authored headers, code and provider link',()=>{const text='Use this email template:\nFrom: person@example.invalid\nDate: Friday\nTo: team@example.invalid\nYour OTP is123456.\nhttps://provider.example.invalid/verify?token=SYNTHETIC_PROVIDER_CODE';expect(projectEmailReplyBody({text,html:null,reply:false})).toBe(text);const value={...message,body:text,sealedOriginal:undefined};expect(emailReplyDisplay(value).body).toBe(text);});
});

it('accepts the server display-only DTO with redacted non-mailbox transport labels',async()=>{
 const redacted={...message,body:'My safe reply.',sealedOriginalAvailable:false,sealedOriginal:undefined,transport:{fromEmail:'[Recipient-only sign-in link removed.]',recipientAlias:'[Recipient-only sign-in link removed.]',subject:'Safe subject'},emailReplyDisplay:{schema:'receiz.chat.email-reply-display.v1' as const,displayOnly:true as const,sourcePayloadDigest:'a'.repeat(64),sourceReceiptDigest:'b'.repeat(64),sourceMimeSha256:'c'.repeat(64)}},c={...conversation,previewMessage:redacted},api=createNativeMessaging({accountUid:owner,request:async()=>Response.json({ok:true,conversation:c,messages:[redacted],hasMore:false,nextCursor:null})}),page=await api.messages(room);expect(page.messages[0].body).toBe('My safe reply.');expect(page.messages[0].senderKind).toBe('external-email');expect(JSON.stringify(page)).not.toContain(invalid);expect(page.messages[0].sealedOriginal).toBeUndefined();
});
