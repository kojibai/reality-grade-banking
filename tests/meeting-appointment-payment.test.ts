// @vitest-environment happy-dom
import {it,expect,vi,afterEach} from 'vitest';
import {createMeetingSession,MeetingPaymentRequired} from '../src/receiz/meeting-session';
import {createFixedSale} from '../src/receiz/fixed-checkout';
import {meetingPaymentReturn,rememberMeetingPaymentReturn} from '../src/receiz/meeting-payment-return';
import {hostedFixture,checkoutRecipient,checkoutSender} from './fixtures/hosted-checkout';
const id='11111111-1111-4111-8111-111111111111',key='abcdefghijklmnopqrstuvwx',path=`/meet/${id}/${key}/`;
afterEach(()=>{sessionStorage.clear();});
it.each([1000,300])('uses the existing Wallet with balance %s, funds only the shortfall, then retries the same room under the same identity',async(balance)=>{
 const f=hostedFixture(balance),checkout=f.newController();await checkout.ready;
 const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:id,recipientUserId:checkoutRecipient,username:'merchant',currency:'usd',amountUsdCents:'1000'});
 const meeting={id,title:'Consultation',host:{displayName:'Merchant',username:'merchant'},url:'https://bankeiz.com'+path,priceUsdCents:'1000'};
 const controller=vi.fn(()=>({close:vi.fn()})),identity={messaging:async()=>({accountUid:checkoutSender,callTransport:{heldFetch:async()=>checkout.snapshot().phase==='paid'?Response.json({ok:true,conversationId:id,viewerId:checkoutSender,hostId:checkoutRecipient,isHost:false,meeting,call:{id:checkoutRecipient,conversationId:id}}):Response.json({ok:false,error:'meeting_payment_required',payment:sale},{status:402})}})};
 const entry={open:vi.fn(async()=>identity),close:vi.fn()},session=createMeetingSession({eventId:id,key,request:async()=>Response.json({ok:true,meeting}),entry:entry as never,controller:controller as never});await session.read();
 await expect(session.join()).rejects.toBeInstanceOf(MeetingPaymentRequired);expect(controller).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
 const payment=session.paymentCheckout();expect(payment.request.fixedSale).toMatchObject({saleId:id,recipientUserId:checkoutRecipient,amountUsdCents:'1000'});expect(payment.request.fixedSale).not.toHaveProperty('digest');expect(await payment.identitySession.open()).toBe(identity);expect(meetingPaymentReturn(sale)).toBe(path);payment.identitySession.close();expect(entry.close).not.toHaveBeenCalled();
 const approval=await checkout.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:payment.request.fixedSale});
 expect(approval.balanceContributionUsdCents).toBe(String(balance));expect(approval.cardAmountUsdCents).toBe(String(1000-balance));await checkout.approve(approval.digest);
 if(balance<1000){expect(checkout.snapshot().walletOutcome?.status).toBe('funding');expect(f.begin.mock.calls[0]?.[0]).toBe('7.00');f.creditCard();await checkout.check();}
 expect(checkout.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledTimes(balance<1000?2:1);expect((await session.join()).viewerId).toBe(checkoutSender);expect(controller).toHaveBeenCalledOnce();await session.close();
});
it('does not route payment to a different appointment or accept an altered listed price',async()=>{
 const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:id,recipientUserId:checkoutRecipient,username:'merchant',currency:'usd',amountUsdCents:'1'}),meeting={id,host:{username:'merchant'},title:'Consultation',url:'https://bankeiz.com'+path,priceUsdCents:'1000'};
 const session=createMeetingSession({eventId:id,key,request:async()=>Response.json({ok:true,meeting}),entry:{open:async()=>({messaging:async()=>({accountUid:checkoutSender,callTransport:{heldFetch:async()=>Response.json({error:'meeting_payment_required',payment:sale},{status:402})}})}),close(){}} as never});await session.read();await expect(session.join()).rejects.toThrow('MEETING_PAYMENT_MISMATCH');
 expect(()=>rememberMeetingPaymentReturn(sale,'https://other.test/')).toThrow();sessionStorage.setItem('bankeiz:meeting-payment:'+sale.digest,'https://other.test/');expect(meetingPaymentReturn(sale)).toBeNull();await session.close();
});
