import {expect,it,vi} from 'vitest';
import {approveFundedPurchase,confirmPurchaseFunding,completeFundedPurchase} from '../src/receiz/funded-purchase';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {MarketTrade} from '../src/receiz/market-trade';
const identity={}as OpenIdentity,checkout={sessionId:'cs_fixture123456',amountUsdCents:'2500'},itemId='profile:artist:source';
const review={digest:'held-review',body:{marketItemId:itemId,side:'buy',amountUsd:'25.00'},observation:{preview:{settlementUsdCents:'2500'}}};
const result={status:'recorded',tradeId:'trade',side:'buy',settlementUsdCents:'2500',shareQuantityMicro:'1'};
const market=()=>({prepare:vi.fn().mockResolvedValue(review),execute:vi.fn().mockResolvedValue(result),discard:vi.fn()});
it('executes one exact approved purchase only after matching account-bound funding and coalesces repeated UI continuations',async()=>{
 const approval=approveFundedPurchase(identity,itemId,checkout),api=market();
 await expect(completeFundedPurchase(approval,identity,itemId,api as unknown as MarketTrade)).rejects.toThrow();expect(api.prepare).not.toHaveBeenCalled();
 confirmPurchaseFunding(approval,identity,checkout);
 const outcomes=await Promise.all([completeFundedPurchase(approval,identity,itemId,api as unknown as MarketTrade),completeFundedPurchase(approval,identity,itemId,api as unknown as MarketTrade)]);
 expect(outcomes).toEqual([result,result]);expect(api.prepare).toHaveBeenCalledExactlyOnceWith({marketItemId:itemId,side:'buy',amountUsdCents:'2500'});expect(api.execute).toHaveBeenCalledExactlyOnceWith(review,'held-review');
});
it('refuses serialized hints, a different account, session, budget or asset, and changed prepared purchase terms',async()=>{
 const approval=approveFundedPurchase(identity,itemId,checkout),api=market();
 expect(()=>confirmPurchaseFunding(approval,identity,{...checkout,amountUsdCents:'2600'})).toThrow();
 expect(()=>confirmPurchaseFunding(approval,identity,{...checkout,sessionId:'cs_other123456'})).toThrow();
 confirmPurchaseFunding(approval,identity,checkout);
 await expect(completeFundedPurchase({}as typeof approval,identity,itemId,api as unknown as MarketTrade)).rejects.toThrow();
 await expect(completeFundedPurchase(approval,{}as OpenIdentity,itemId,api as unknown as MarketTrade)).rejects.toThrow();
 await expect(completeFundedPurchase(approval,identity,'another-asset',api as unknown as MarketTrade)).rejects.toThrow();
 api.prepare.mockResolvedValue({...review,body:{...review.body,amountUsd:'26.00'}});
 await expect(completeFundedPurchase(approval,identity,itemId,api as unknown as MarketTrade)).rejects.toThrow();expect(api.execute).not.toHaveBeenCalled();expect(api.discard).toHaveBeenCalledOnce();
});
