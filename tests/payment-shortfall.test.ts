import {expect,it} from 'vitest';
import {hostedFixture} from './fixtures/hosted-checkout';

it.each([1,10,25,49,50])('Send covers a %s-cent shortfall with one minimum card deposit and retains its excess',async shortfall=>{
 const f=hostedFixture(1000-shortfall),api=await f.deps.walletSend(),review=await api.prepare({recipient:'merchant',amountUsdCents:'1000'});
 expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',amountUsdCents:'1000',cardAmountUsdCents:'50',shortfallUsdCents:String(shortfall)});
 expect(f.begin).toHaveBeenCalledExactlyOnceWith('0.50',review.clientNonce);f.creditCard();expect(await api.resumeFunding()).toMatchObject({status:'recorded',clientNonce:review.clientNonce});
 expect((await f.deps.readWallet()).totalUsdCents).toBe(String(50-shortfall));expect(f.transfer.mock.calls[0][0]).toEqual(f.transfer.mock.calls[1][0]);expect(f.transfer.mock.calls[1][0].amountUsd).toBe('10.00');await api.resumeFunding();expect(f.begin).toHaveBeenCalledOnce();expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.request.mock.calls.filter(([path])=>path==='/api/connect/wallet/me')).toHaveLength(1);
});
it('a Note-assisted payment rounds only its residual card shortfall and preserves all surplus',async()=>{
 const f=hostedFixture(970),controller=f.newController();await controller.ready;f.deps.notes.inspect.mockResolvedValueOnce({...f.deps.note,inspection:{...f.deps.note.inspection,amountUsdCents:'20',amountPhiMicro:'200000'}});await controller.inspectNote({}as File);
 const approved=await controller.prepare({recipient:'merchant',amountUsdCents:'1000',method:'note'});expect(approved).toMatchObject({balanceContributionUsdCents:'970',noteAmountUsdCents:'20',cardAmountUsdCents:'50'});await controller.approve(approved.digest);f.confirmNote();f.setBalance(990);await controller.check(approved.checkoutId);
 expect(controller.snapshot().walletOutcome).toMatchObject({status:'funding',cardAmountUsdCents:'50',shortfallUsdCents:'10'});expect(f.begin).toHaveBeenCalledExactlyOnceWith('0.50',approved.clientNonce,{checkoutId:approved.checkoutId,username:'merchant'});f.creditCard();await controller.check(approved.checkoutId);expect(controller.snapshot().phase).toBe('paid');expect((await f.deps.readWallet()).totalUsdCents).toBe('40');await controller.check(approved.checkoutId);expect(f.deposit).toHaveBeenCalledOnce();expect(f.begin).toHaveBeenCalledOnce();expect(f.transfer).toHaveBeenCalledTimes(2);
});

it('Send also covers an entire subminimum payment while retaining the excess card credit',async()=>{
 const f=hostedFixture(0,10),api=await f.deps.walletSend(),review=await api.prepare({recipient:'merchant',amountUsdCents:'10'});expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',amountUsdCents:'10',cardAmountUsdCents:'50',shortfallUsdCents:'10'});expect(f.begin).toHaveBeenCalledExactlyOnceWith('0.50',review.clientNonce);f.creditCard();expect(await api.resumeFunding()).toMatchObject({status:'recorded'});expect((await f.deps.readWallet()).totalUsdCents).toBe('40');expect(f.transfer.mock.calls[1][0].amountUsd).toBe('0.10');expect(f.begin).toHaveBeenCalledOnce();
});
