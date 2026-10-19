import {expect,it} from 'vitest';
import {readMessagePayment} from '../src/receiz/message-payment';
import type {ChatMessage} from '../src/receiz/native-messaging';
const sender='11111111-1111-4111-8111-111111111111',recipient='22222222-2222-4222-8222-222222222222';
const message:ChatMessage={id:'one',conversationId:'33333333-3333-4333-8333-333333333333',senderKind:'user',senderAiId:null,senderDisplay:'Sender',createdAt:'2026-10-19T12:00:00Z',receizedAt:'2026-10-19T12:00:00Z',receipt:null,sealedOriginalAvailable:false,senderUserId:sender,body:'Transferred $25.00',walletTransfer:{kind:'chat_transfer',transferId:'transfer-one',senderUserId:sender,recipientUserId:recipient,amountUsdCents:'2500',amountPhiMicro:'123456',note:'Lunch',transactionHref:'/transactions/transfer-one'}};
it('uses the existing structured payment amount and safe receipt link, never parses a prose claim',()=>{
 expect(readMessagePayment(message,recipient)).toMatchObject({direction:'received',amountUsdCents:'2500',amountPhiMicro:'123456',note:'Lunch',href:'https://receiz.com/transactions/transfer-one'});
 expect(readMessagePayment({...message,walletTransfer:null},recipient)).toBeNull();
 expect(readMessagePayment({...message,walletTransfer:{...message.walletTransfer,senderUserId:recipient}},recipient)).toBeNull();
 expect(readMessagePayment({...message,walletTransfer:{...message.walletTransfer,amountUsdCents:'NaN'}},recipient)).toBeNull();
 expect(readMessagePayment({...message,walletTransfer:{...message.walletTransfer,transactionHref:'https://other.example/transactions/one'}},recipient)?.href).toBeNull();
});
