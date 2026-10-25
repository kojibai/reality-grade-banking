import {expect,it} from 'vitest';
import {createFixedSale,fixedSalePaymentNote,type FixedSaleFields} from '../src/receiz/fixed-checkout';
import {createHostedCheckout} from '../src/receiz/hosted-checkout';
import {checkoutApprovalDigest,readHostedCheckoutState} from '../src/receiz/checkout-state';
import {hostedFixture,checkoutOwner,checkoutRecipient} from './fixtures/hosted-checkout';
const sale:FixedSaleFields={schema:'bank.fixed-checkout.v1',saleId:'20000000-0000-4000-8000-000000000001',recipientUserId:checkoutRecipient,username:'merchant',currency:'usd',amountUsdCents:'1000'};
it.each(['balance','card']as const)('retains the exact fixed %s payment through funding, reopen and repeated checks',async method=>{
 const f=hostedFixture(method==='card'?0:1000),c=f.newController();await c.ready;
 const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method,fixedSale:sale});
 expect(a.fixedSale).toEqual(await createFixedSale(sale));await c.approve(a.digest);
 if(method==='card'){expect(c.snapshot().phase).toBe('funding');f.creditCard();}
 const reopened=f.newController();await reopened.ready;await reopened.check();await reopened.check();
 expect(reopened.snapshot().phase).toBe('paid');expect(reopened.snapshot().receipt?.fixedSale).toEqual(a.fixedSale);
 expect(f.transfer).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0]).toMatchObject({clientNonce:a.clientNonce,note:fixedSalePaymentNote(a.fixedSale!,a.clientNonce),noteVisibility:'public'});
 const returned=method==='card'?await reopened.inspectReturn(a.checkoutId,'cs_test_hostedoriginal'):null;if(returned)expect(returned).toMatchObject({matched:true,fixedSale:a.fixedSale,receipt:{fixedSale:a.fixedSale}});
});
it.each(['reserve','settlement','composite']as const)('preserves the sale through %s Note deposit and its changed funding review',async rail=>{
 const f=hostedFixture(0),c=f.newController();f.deps.notes.inspect.mockResolvedValueOnce({...f.deps.note,rail,inspection:{...f.deps.note.inspection,rail}});await c.ready;await c.inspectNote({}as File);
 const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note',fixedSale:sale});await c.approve(a.digest);expect(c.snapshot().phase).toBe('funding');f.confirmNote();
 const reopened=f.newController();await reopened.ready;await reopened.check();if(reopened.snapshot().phase==='reviewed')await reopened.approve(reopened.snapshot().approval!.digest);
 expect(reopened.snapshot().phase).toBe('paid');expect(f.deposit).toHaveBeenCalledOnce();expect(f.transfer).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0].note).toBe(fixedSalePaymentNote(a.fixedSale!,a.clientNonce));
});
it('uses the existing minimum card delta and leaves the remainder while preserving the fixed total',async()=>{
 const f=hostedFixture(970),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale});expect(a).toMatchObject({cardAmountUsdCents:'50',balanceContributionUsdCents:'970'});await c.approve(a.digest);expect(f.begin).toHaveBeenCalledExactlyOnceWith('0.50',a.clientNonce,{checkoutId:a.checkoutId,username:'merchant'});f.creditCard();await c.check();expect(c.snapshot().phase).toBe('paid');expect((await f.deps.readWallet()).totalUsdCents).toBe('20');expect(f.transfer).toHaveBeenCalledTimes(2);
});
it('leaves Note surplus in the account without changing the fixed payment',async()=>{
 const f=hostedFixture(0),c=f.newController();f.deps.notes.inspect.mockResolvedValueOnce({...f.deps.note,inspection:{...f.deps.note.inspection,amountUsdCents:'1200',amountPhiMicro:'12000000'}});await c.ready;await c.inspectNote({}as File);const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note',fixedSale:sale});expect(a.noteSurplusUsdCents).toBe('200');await c.approve(a.digest);f.confirmNote();f.setBalance(1200);await c.check();expect(c.snapshot().phase).toBe('paid');expect((await f.deps.readWallet()).totalUsdCents).toBe('200');expect(f.transfer).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0].note).toBe(fixedSalePaymentNote(a.fixedSale!,a.clientNonce));
});
it('recovers a lost fixed-payment response after reload without another financial dispatch',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale});f.loseResponse(true);f.loseLookup(true);await c.approve(a.digest);expect(c.snapshot().phase).toBe('confirming');f.loseLookup(false);const reopened=f.newController();await reopened.ready;await reopened.check();expect(reopened.snapshot().phase).toBe('paid');expect(reopened.snapshot().receipt?.fixedSale).toEqual(a.fixedSale);expect(f.transfer).toHaveBeenCalledOnce();
});
it('reopens an already-paid sale from history and refuses another preparation for that same sale',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale});await c.approve(a.digest);await c.back();const reopened=f.newController();await reopened.ready;expect(await reopened.inspectFixedSale(sale)).toMatchObject({clientNonce:a.clientNonce,fixedSale:a.fixedSale});await expect(reopened.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale})).rejects.toThrow('already paid');expect(f.transfer).toHaveBeenCalledOnce();
});
it('rejects edited totals, recipient resolution drift and missing public-note support before any payment',async()=>{
 for(const change of [{amountUsdCents:'999'},{recipient:'another'},{fixedSale:{...sale,recipientUserId:'20000000-0000-4000-8000-000000000002'}}]){
  const f=hostedFixture(),c=f.newController();await c.ready;await expect(c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale,...change})).rejects.toThrow();expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).not.toHaveBeenCalled();
 }
 const f=hostedFixture(),request=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>{const result=await request(path);if(path.includes('amountUsd='))return{...result,capabilities:{publicTransferNotes:false}};return result;});const c=f.newController();await c.ready;await expect(c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale})).rejects.toThrow('PUBLIC_NOTE_UNAVAILABLE');expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).not.toHaveBeenCalled();
});
it('refuses replacing a pending sale and restores an earlier card return from its retained approval',async()=>{
 const f=hostedFixture(0),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card',fixedSale:sale});await c.approve(a.digest);
 const next={...sale,saleId:'20000000-0000-4000-8000-000000000002'};await expect(c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:next})).rejects.toThrow('PENDING');expect(f.transfer).not.toHaveBeenCalled();f.creditCard();await c.check();await c.back();await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:next});
 const returned=await c.inspectReturn(a.checkoutId,'cs_test_hostedoriginal');expect(returned).toMatchObject({matched:true,fixedSale:a.fixedSale,receipt:{fixedSale:a.fixedSale}});expect(c.snapshot().approval?.fixedSale?.saleId).toBe(next.saleId);expect(f.transfer).toHaveBeenCalledOnce();
});
it('rejects retained sale substitution even if the display approval is rehashed to match',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale});await c.approve(a.digest);
 const changed=await createFixedSale({...sale,saleId:'20000000-0000-4000-8000-000000000002'}),raw=f.state!;const{digest:_,...old}=raw.current.approval!,body={...old,fixedSale:changed};raw.current.approval={...body,digest:await checkoutApprovalDigest(body)};raw.current.approvalHistory=[raw.current.approval!];raw.current.receipt!.fixedSale=changed;await f.write(raw,f.state);
 const reopened=createHostedCheckout(f.deps);await expect(reopened.ready).rejects.toThrow('RESULT_MISMATCH');expect(reopened.snapshot().phase).toBe('attention-required');expect(f.transfer).toHaveBeenCalledOnce();
});
it('rejects a paid display receipt whose fixed sale differs from its original approval',async()=>{
 const f=hostedFixture(),c=f.newController();await c.ready;const a=await c.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance',fixedSale:sale});await c.approve(a.digest);const raw=f.state!;raw.current.receipt!.fixedSale=await createFixedSale({...sale,saleId:'20000000-0000-4000-8000-000000000002'});await expect(readHostedCheckoutState(raw,checkoutOwner)).rejects.toThrow('STATE_INVALID');
});
