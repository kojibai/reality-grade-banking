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
