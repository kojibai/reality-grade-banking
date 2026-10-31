import {expect,it} from 'vitest';
import {hostedFixture,checkoutRecipient,checkoutSender} from './fixtures/hosted-checkout';
import {createHostedCheckout} from '../src/receiz/hosted-checkout';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {hasPendingHostedCheckout} from '../src/receiz/checkout-state';
it('records a balance payment once and rejects an unapproved digest',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});
 await expect(c.approve('wrong')).rejects.toThrow();expect(f.transfer).not.toHaveBeenCalled();
 await c.approve(r.digest);expect(c.snapshot().phase).toBe('paid');expect(c.snapshot().receipt).toMatchObject({recipientUserId:checkoutRecipient,amountUsdCents:'1000'});await c.approve(r.digest);expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('keeps the recipient portrait already returned by the required directory read',async()=>{
 const f=hostedFixture(),original=f.request.getMockImplementation()!;
 f.request.mockImplementation(async path=>path.startsWith('/api/chat/users/search')?{ok:true,users:[{kind:'user',username:'merchant',userId:checkoutRecipient,avatarUrl:'https://receiz.com/merchant.png'}]}:original(path));
 const c=f.newController();await c.ready;const approval=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});
 expect(approval.recipient.avatarUrl).toBe('https://receiz.com/merchant.png');expect(f.request.mock.calls.filter(([path])=>path.startsWith('/api/chat/users/search'))).toHaveLength(1);expect(f.transfer).not.toHaveBeenCalled();
});
it('uses full card funding and automatically continues the approved payment on completion',async()=>{
 const f=hostedFixture(3000),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await c.approve(r.digest);expect(c.snapshot().phase).toBe('funding');expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).toHaveBeenCalledTimes(1);
 f.creditCard();await c.check();expect(c.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledTimes(1);expect(f.begin).toHaveBeenCalledTimes(1);
});
it('waits for Note confirmation and continues without another deposit or payment approval',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;await c.inspectNote({}as File);const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});await c.approve(r.digest);expect(c.snapshot().phase).toBe('funding');expect(f.deposit).toHaveBeenCalledTimes(1);expect(f.transfer).not.toHaveBeenCalled();
 await c.check();expect(f.transfer).not.toHaveBeenCalled();f.confirmNote();await c.check();expect(c.snapshot().phase).toBe('paid');expect(f.deposit).toHaveBeenCalledTimes(1);expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('recovers a submitted transfer without submitting it again',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.loseLookup(true);f.loseResponse(true);await c.approve(r.digest);expect(c.snapshot().phase).toBe('confirming');c.dispose();f.loseLookup(false);
 const reopened=f.newController();await reopened.ready;await reopened.check();expect(reopened.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('recovers confirmed Note credit after a journal interruption without depositing again',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;await c.inspectNote({}as File);const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});await c.approve(r.digest);f.confirmNote();f.interruptNoteSave();await expect(c.check()).rejects.toThrow();c.dispose();
 const reopened=f.newController();await reopened.ready;await reopened.check();expect(reopened.snapshot().phase).toBe('paid');expect(f.deposit).toHaveBeenCalledTimes(1);expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('does not silently increase the approved card contribution after a balance change',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.setBalance(0);await c.approve(r.digest);expect(c.snapshot().phase).toBe('not-sent');expect(f.begin).not.toHaveBeenCalled();
});
it('cancels an abandoned card payment locally and releases its identity guard without submitting or checking a payment',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await c.approve(r.digest);
 const reads=f.request.mock.calls.length;await c.back();expect(c.snapshot().phase).toBe('editing');expect(hasPendingHostedCheckout(f.state!)).toBe(false);expect(f.state?.history[0].walletOutcome).toMatchObject({status:'not-sent',reason:'card_cancelled'});expect(f.request).toHaveBeenCalledTimes(reads);
 f.creditCard();await c.check();expect(f.transfer).not.toHaveBeenCalled();expect(await c.inspectReturn(r.checkoutId,'cs_test_hostedoriginal')).toMatchObject({matched:true,status:'not-sent'});
 const next=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});expect(next.clientNonce).not.toBe(r.clientNonce);expect(f.transfer).not.toHaveBeenCalled();
});
it('keeps a submitted payment recoverable when Back is pressed',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.loseLookup(true);f.loseResponse(true);await c.approve(r.digest);await c.back();expect(c.snapshot().phase).toBe('confirming');expect(hasPendingHostedCheckout(f.state!)).toBe(true);
 f.loseLookup(false);await c.check();expect(c.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledOnce();
});
it('keeps an unconfirmed Note deposit recoverable when Back is pressed',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;await c.inspectNote({}as File);const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});await c.approve(r.digest);await c.back();expect(hasPendingHostedCheckout(f.state!)).toBe(true);expect(c.snapshot().notes[0].status).toBe('received');f.confirmNote();await c.check();expect(c.snapshot().phase).toBe('paid');expect(f.deposit).toHaveBeenCalledOnce();expect(f.transfer).toHaveBeenCalledOnce();
});
it('keeps a paid receipt in history while opening and paying a new request',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const one=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});await c.approve(one.digest);await c.back();expect(c.snapshot().phase).toBe('editing');f.setBalance(1000);
 const two=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});expect(two.clientNonce).not.toBe(one.clientNonce);await c.approve(two.digest);expect(c.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.state?.history).toHaveLength(1);
});
it('does not claim a pending result as paid just because a saved receipt field was changed',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.loseLookup(true);f.loseResponse(true);await c.approve(r.digest);expect(c.snapshot().receipt).toBeNull();expect(c.snapshot().phase).toBe('confirming');
});
it('serializes duplicate approvals from independent controller consumers',async()=>{
 const f=hostedFixture(),one=f.newController();await one.ready;const r=await one.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});const two=f.newController();await two.ready;
 await Promise.all([one.approve(r.digest),two.approve(r.digest)]);expect(f.transfer).toHaveBeenCalledTimes(1);expect(two.snapshot().phase).toBe('paid');
});
it('invalidates an unapproved Note review when another Note is selected',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;await c.inspectNote({} as File);const first=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});
 const extra={...c.snapshot().notes[0],sourceDigest:'d'.repeat(64),sourceRef:'d'.repeat(64),noteId:'10000000-0000-4000-8000-000000000009',inspection:{...c.snapshot().notes[0].inspection,noteId:'10000000-0000-4000-8000-000000000009'}};f.deps.notes.inspect.mockResolvedValueOnce(extra);await c.inspectNote({}as File);
 expect(c.snapshot().approval!.noteSourceDigests).toHaveLength(2);expect(c.snapshot().approval!.digest).not.toBe(first.digest);await expect(c.approve(first.digest)).rejects.toThrow();expect(f.deposit).not.toHaveBeenCalled();
});
it('matches card returns to the exact retained session and preserves historical receipts',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await c.approve(a.digest);
 expect(await c.inspectReturn(a.checkoutId,'cs_test_wrongoriginal')).toEqual({matched:false,receipt:null});
 expect(await c.inspectReturn(a.checkoutId,'cs_test_hostedoriginal')).toMatchObject({matched:true,receipt:null});
 f.creditCard();await c.check();await c.back();
 const result=await c.inspectReturn(a.checkoutId,'cs_test_hostedoriginal');expect(result.matched).toBe(true);expect(result.receipt?.checkoutId).toBe(a.checkoutId);expect(c.snapshot().phase).toBe('editing');expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('keeps a definite preflight ownership refusal unsubmitted and allows Back before identity import',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;await c.inspectNote({}as File);const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});f.deps.notes.validate.mockRejectedValueOnce(Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED'));
 await expect(c.approve(a.digest)).rejects.toThrow('IDENTITY_BINDING_REQUIRED');expect(c.snapshot().approvalHistory).toHaveLength(0);expect(f.deposit).not.toHaveBeenCalled();await c.back();expect(c.snapshot().phase).toBe('editing');
});
it('discloses existing balance and Note value before approval, including surplus',async()=>{
 const f=hostedFixture(800),c=f.newController();await c.ready;f.deps.notes.inspect.mockResolvedValueOnce({...f.deps.note,inspection:{...f.deps.note.inspection,amountUsdCents:'200',amountPhiMicro:'2000000'}});await c.inspectNote({}as File);const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});
 expect(a).toMatchObject({noteAmountUsdCents:'200',balanceContributionUsdCents:'800',cardAmountUsdCents:'0',noteSurplusUsdCents:'0'});
});
it('returns the matched historical unpaid outcome rather than substituting the current checkout',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;const one=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await c.approve(one.digest);f.expireCard();await c.check();expect(c.snapshot().phase).toBe('not-sent');await c.back();const two=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});
 const returned=await c.inspectReturn(one.checkoutId,'cs_test_hostedoriginal');expect(returned).toMatchObject({matched:true,checkoutId:one.checkoutId,status:'not-sent'});expect(c.snapshot().approval!.checkoutId).toBe(two.checkoutId);
});

it('uses a retained complete POST original even when the recovery read service is unavailable',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const r=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.loseLookup(true);await c.approve(r.digest);expect(c.snapshot().phase).toBe('paid');expect(f.transfer).toHaveBeenCalledOnce();expect(f.request.mock.calls.some(([path])=>path.includes('clientNonce='))).toBe(false);
});
it('a delayed cancellation of an earlier checkout cannot clear a newer checkout under the shared lock',async()=>{
 const f=hostedFixture(0),one=f.newController();await one.ready;const old=await one.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await one.approve(old.digest);
 const two=f.newController();await two.ready;await two.back();const next=await two.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await two.approve(next.digest);
 expect(await one.back(old.checkoutId)).toBe(false);expect(f.state?.current.approval?.checkoutId).toBe(next.checkoutId);expect(f.state?.current.phase).toBe('funding');expect(f.transfer).not.toHaveBeenCalled();
});
it('checking an earlier displayed payment cannot execute the newer checkout adopted from another tab',async()=>{
 const f=hostedFixture(0),one=f.newController();await one.ready;const old=await one.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await one.approve(old.digest);
 const two=f.newController();await two.ready;await two.back();const next=await two.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await two.approve(next.digest);f.creditCard();
 await one.check(old.checkoutId);expect(f.transfer).not.toHaveBeenCalled();expect(f.state?.current.approval?.checkoutId).toBe(next.checkoutId);expect(f.state?.current.phase).toBe('funding');await two.check(next.checkoutId);expect(f.transfer).toHaveBeenCalledOnce();
});

it.each(['balance','note']as const)('uses the same complete account-only balance accepted by Send for %s checkout',async method=>{
 const f=hostedFixture(970),wallet=parseSharedWallet({ok:true,wallet:{userId:checkoutSender,balanceUsd:'9.70',balancePhiMicro:'9700000',valueStates:{settledBalanceUsdCents:'970',ecosystemBalanceUsdCents:'0'},creationSigilEntitlementEnabled:false,sync:{source:'account_only',lawfulActionProjectionAvailable:true,projectionComplete:false},rollup:{}}},checkoutSender),controller=createHostedCheckout({...f.deps,readWallet:async()=>wallet});await controller.ready;
 if(method==='note'){f.deps.notes.inspect.mockResolvedValueOnce({...f.deps.note,inspection:{...f.deps.note.inspection,amountUsdCents:'20',amountPhiMicro:'200000'}});await controller.inspectNote({}as File);}
 const approved=await controller.prepare({recipient:'merchant',amountUsdCents:'1000',method});expect(approved).toMatchObject({balanceContributionUsdCents:'970',cardAmountUsdCents:'50'});expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
it('does not guess a funding delta from an incomplete profile-backed balance',async()=>{
 const f=hostedFixture(970),wallet=await f.deps.readWallet(),controller=createHostedCheckout({...f.deps,readWallet:async()=>({...wallet,projectionComplete:false})});await controller.ready;
 await expect(controller.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'})).rejects.toThrow('BALANCE_UNAVAILABLE');expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
it('keeps legacy fixed links independent of Counter availability and blocks a new closed Counter before card funding or payment',async()=>{
 const{createFixedSale}=await import('../src/receiz/fixed-checkout');const fixedSale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:'20000000-0000-4000-8000-000000000077',recipientUserId:checkoutRecipient,username:'merchant',currency:'usd',amountUsdCents:'1000'});const{digest:_,...fields}=fixedSale;let checks=0;const f=hostedFixture(),c=createHostedCheckout({...f.deps,checkFixedSale:async()=>{checks++;return'cancelled';}});await c.ready;await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:fields});expect(checks).toBe(0);expect(f.transfer).not.toHaveBeenCalled();await c.back();await expect(c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card',fixedSale:fields,counter:true})).rejects.toThrow('merchant_counter_closed');expect(checks).toBe(1);expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
