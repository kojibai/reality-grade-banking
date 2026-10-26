import {expect,it} from 'vitest';
const quote={schema:'receiz.usage.reserve-purchase.quote.v1' as const,ownerUserId:'owner',clientOperationId:'approved-operation',credits:'2500',amountUsdCents:'2500',expiresAt:'2099-01-01T00:00:00.000Z',bankContributionUsdCents:'2500',cardShortfallUsdCents:'0',minimumCardDepositUsdCents:'50' as const,exactCardDepositAvailable:true};
const load=async()=>{const api=await import('../src/receiz/twin-credit-purchase-intent').catch(()=>null);expect(api,'Encrypted purchase coordination must bind the existing native quote').not.toBeNull();return api!;};
it('pending intent binds exact owner, identity, operation and native quote without inventing payment authority',async()=>{
 const api=await load(),intent=api.twinCreditPurchaseIntent('owner','identity-digest','approved-operation',quote);
 expect(intent.stage).toBe('dispatching');expect(api.readTwinCreditPurchaseIntent(intent,'identity-digest','owner')).toEqual(intent);
 expect(()=>api.readTwinCreditPurchaseIntent(intent,'foreign-digest','owner')).toThrow('BANK_CREDIT_INTENT_CHANGED');
 expect(()=>api.readTwinCreditPurchaseIntent(intent,'identity-digest','foreign-owner')).toThrow('BANK_CREDIT_INTENT_CHANGED');
 expect(()=>api.readTwinCreditPurchaseIntent({...intent,operationId:'different-operation'},'identity-digest','owner')).toThrow();
 expect(()=>api.readTwinCreditPurchaseIntent({...intent,paid:true},'identity-digest','owner')).toThrow();
});
it('quote comparison preserves all native terms including the PHI conversion while ignoring JSON key order',async()=>{
 const api=await load(),original={...quote,amountPhiMicro:'1250000',usdPerPhiMicrocents:'2000000000'};
 expect(api.sameTwinCreditQuote(original,Object.fromEntries(Object.entries(original).reverse()))).toBe(true);
 expect(api.sameTwinCreditQuote(original,{...original,amountPhiMicro:'1250001'})).toBe(false);
 expect(api.sameTwinCreditQuote(original,{...original,amountUsdCents:'5000',credits:'5000'})).toBe(false);
});
it('an unknown dispatched purchase survives reopen and only its exact operation can continue',async()=>{
 const api=await load();let state:unknown=null,postCount=0;const writes:unknown[]=[];
 const create=()=>api.createTwinCreditPurchaseCoordination({ownerUid:'owner',identityDigest:'identity-digest',read:async()=>structuredClone(state),write:async(next,previous)=>{expect(state).toEqual(previous);state=structuredClone(next);writes.push(next);},request:async input=>{if(input.action==='credits-purchase'){postCount++;expect((state as {stage:string}).stage).toBe('dispatching');throw Error('response lost');}return{accountUid:'owner',twinAccess:true,creditFunding:{quote,purchase:{status:'ready'}}};}});
 await expect(create().execute('approved-operation')).rejects.toThrow('response lost');expect((state as {stage:string}).stage).toBe('unknown');
 const reopened=create();await expect(reopened.execute('different-operation')).rejects.toThrow('BANK_EXECUTION_PENDING');
 const recovered=await reopened.recover();expect(recovered?.operationId).toBe('approved-operation');expect(recovered?.amountUsd).toBe('25.00');expect(recovered?.funding.purchase?.status).toBe('ready');expect((state as {stage:string}).stage).toBe('unknown');expect(postCount).toBe(1);expect(writes).toHaveLength(2);
});
it('native completion clears coordination and publishes only the confirmed source',async()=>{
 const api=await load();let state:unknown=api.twinCreditPurchaseIntent('owner','identity-digest','approved-operation',quote),recorded=0;
 const coordinator=api.createTwinCreditPurchaseCoordination({ownerUid:'owner',identityDigest:'identity-digest',read:async()=>state,write:async(next,previous)=>{expect(state).toEqual(previous);state=next;},onCompleted:async()=>{expect(state).toBeNull();recorded++;},request:async()=>({accountUid:'owner',twinAccess:true,creditFunding:{quote,purchase:{status:'completed',amountUsdCents:'2500',purchasedCredits:'2500',walletDebitId:'native-debit',bucketId:'native-bucket'}}})});
 const recovered=await coordinator.recover();expect(recovered?.funding.purchase?.status).toBe('completed');expect(state).toBeNull();expect(recorded).toBe(1);expect(await coordinator.recover()).toBeNull();
});
it('only serialized native expiry can release a pending intent without a payment claim',async()=>{
 const api=await load();let state:unknown=api.twinCreditPurchaseIntent('owner','identity-digest','approved-operation',quote),recorded=0;
 const coordinator=api.createTwinCreditPurchaseCoordination({ownerUid:'owner',identityDigest:'identity-digest',read:async()=>state,write:async next=>{state=next;},onCompleted:async()=>{recorded++;},request:async()=>({accountUid:'owner',twinAccess:true,creditFunding:{quote,purchase:{status:'quote_expired'}}})});
 expect((await coordinator.recover())?.funding.purchase?.status).toBe('quote_expired');expect(state).toBeNull();expect(recorded).toBe(0);
});
