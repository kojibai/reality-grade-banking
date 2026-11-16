import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmailMessage} from '../src/features/messages/EmailMessage';
import type {ChatMessage} from '../src/receiz/native-messaging';
const message={id:'mail',conversationId:'room',senderKind:'external-email',senderUserId:null,senderAiId:null,senderDisplay:'Alex',body:'Code 123456. Open https://example.test/signin?token=secret&one=1',createdAt:'2026-11-13T15:00:00Z',receizedAt:'2026-11-13T15:00:00Z',receipt:null,sealedOriginalAvailable:true,walletTransfer:null,transport:{fromEmail:'alex@example.test',recipientAlias:'alice@receiz.com',subject:'Sign in'}} as ChatMessage;
it('presents email as readable content with usable sign-in links and private original access',()=>{
 const markup=renderToStaticMarkup(<EmailMessage message={message} download={async()=>{}}/>);expect(markup).toContain('Code 123456');expect(markup).toContain('href="https://example.test/signin?token=secret&amp;one=1"');expect(markup).toContain('Open original email');expect(markup).toContain('alex@example.test');expect(markup).not.toContain('innerHTML');expect(markup).not.toContain('Money sent');
});
it('email contents remain inert text and never become active markup',()=>{
 const markup=renderToStaticMarkup(<EmailMessage message={{...message,body:'<script>bad()</script> javascript:bad()'}} download={async()=>{}}/>);expect(markup).not.toContain('<script>');expect(markup).not.toContain('href="javascript:');expect(markup).toContain('&lt;script&gt;');
});

it('recognizes appointment candidates only in the new email reply and preserves the exact Original',()=>{
 const original={...message,body:'Thanks, I will send the brief.\n\nOn Friday, Someone wrote:\n> Could we meet tomorrow at 3pm?',createdAt:'2100-11-15T15:00:00Z',sealedOriginal:{transport:{inReplyTo:'prior-email'}}} as ChatMessage;
 const before=JSON.stringify(original),appointment={identity:{organizer:async()=>{throw Error('No calendar command on rendering');}} as unknown as import('../src/receiz/native-identity').OpenIdentity,accountUid:'owner',attendees:['alex@example.test'],title:'Alex'};
 const markup=renderToStaticMarkup(<EmailMessage message={original} download={async()=>{}} appointment={appointment}/>);
 expect(markup).toContain('Thanks, I will send the brief.');expect(markup).not.toContain('Review appointment from message');expect(JSON.stringify(original)).toBe(before);
 const proposed=renderToStaticMarkup(<EmailMessage message={{...original,body:'Could we meet tomorrow at 3pm?'}} download={async()=>{}} appointment={appointment}/>);expect(proposed).toContain('Review appointment from message');
});
