import {expect,it,vi} from 'vitest';
import {syntheticMarketRecord,syntheticMarketQuote} from './fixtures/market-trade';
import {createMarketTrade} from '../src/receiz/market-trade';
const uid='10000000-0000-4000-8000-000000000001',intentId='10000000-0000-4000-8000-000000000002',tradeId='10000000-0000-4000-8000-000000000004';
function fixture(){
 let state:any=null,record:any=null;const write=vi.fn(async(next:any,previous:any)=>{expect(state).toEqual(previous);state=structuredClone(next);});
 const request=vi.fn(async(path:string)=>path.includes('/quote?')?syntheticMarketQuote(new URL(path,'https://test.invalid').searchParams,uid):record??{ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false});
 const submitTrade=vi.fn(async(body:any):Promise<unknown>=>{expect(state.current.body).toEqual(body);
  record=syntheticMarketRecord(body,uid);
  throw Error('response lost');
 });
 const options={ownerReceizId:'owner.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T,>(f:()=>Promise<T>)=>f(),store:{read:async()=>state,write},connect:async()=>({accountUid:uid,client:{request:async(path:string,options:any)=>options.method==='POST'?submitTrade(options.body):request(path)}})};
 return{options,write,request,submitTrade,get state(){return state;},get record(){return record;},set record(v:any){record=v;}};
}
it('retains the approved fixed budget before the SDK manual trade request and resolves a lost response from original rows',async()=>{
 const f=fixture(),api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect(f.state).toBeNull();expect(f.submitTrade).not.toHaveBeenCalled();await expect(api.execute(r,'wrong')).rejects.toThrow();
 const result=await api.execute(r,r.digest);expect(result).toMatchObject({status:'recorded',shareQuantityMicro:'1250000',settlementUsdCents:'1000'});expect(f.submitTrade).toHaveBeenCalledTimes(1);expect(f.state.current.body).toMatchObject({marketItemId:'asset:one',side:'buy',amountUsd:'10.00',clientNonce:r.body.clientNonce});
 const reopened=createMarketTrade(f.options);expect((await reopened.resolve(true))?.status).toBe('recorded');expect(f.submitTrade).toHaveBeenCalledTimes(1);expect(new TextDecoder().decode((await reopened.exportRecord()).bytes)).toContain('market-observation');
});
it('keeps an absent lookup unknown and never repeats the trade',async()=>{const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Error('lost');});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');expect((await api.resolve(true))?.status).toBe('unknown');await expect(api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'})).rejects.toThrow('PENDING');expect(f.submitTrade).toHaveBeenCalledTimes(1);});
it.each(['owner','nonce','item','side','position','ledger','budget'])('refuses a foreign or mismatching original %s',async kind=>{const f=fixture(),original=f.submitTrade.getMockImplementation()!;f.submitTrade.mockImplementation(async body=>{try{await original(body);}catch{};if(kind==='owner')f.record.source.trade.owner_user_id=intentId;if(kind==='nonce')f.record.source.trade.client_nonce='foreign';if(kind==='item')f.record.source.trade.market_item_id='asset:other';if(kind==='side')f.record.source.trade.side='sell';if(kind==='position')f.record.source.position.id=tradeId;if(kind==='ledger')f.record.source.ledgerEntries=[];if(kind==='budget')f.record.source.trade.settlement_usd_cents='2000';return{};});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.state.current.status).toBe('unknown');});
it('does not dispatch when custody retention fails',async()=>{const f=fixture(),api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});f.write.mockRejectedValue(Error('storage failed'));await expect(api.execute(r,r.digest)).rejects.toThrow('storage failed');expect(f.submitTrade).not.toHaveBeenCalled();});
it('sells the exact six-decimal quantity and records the moved units rather than the current position total',async()=>{const f=fixture(),api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'sell',shareQuantityMicro:'1250001'});expect(r.body).toMatchObject({side:'sell',shareQuantity:'1.250001'});expect(r.body).not.toHaveProperty('amountUsd');expect(await api.execute(r,r.digest)).toMatchObject({status:'recorded',shareQuantityMicro:'1250001'});});
it('holds a failed response unknown even when its status claims no trade was written',async()=>{const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Object.assign(Error('failed'),{status:400,payload:{intent:{status:'failed'}}});});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');await expect(api.resolve()).rejects.toThrow('CONSENT');expect(f.submitTrade).toHaveBeenCalledTimes(1);});
it('checks the current Note custody guard again after review before retaining or dispatching',async()=>{const f=fixture(),guard=vi.fn(async()=>{}),api=createMarketTrade({...f.options,assertNoOtherPending:guard}),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});guard.mockRejectedValue(new DOMException('custody','OperationError'));await expect(api.execute(r,r.digest)).rejects.toThrow('custody');expect(f.state).toBeNull();expect(f.submitTrade).not.toHaveBeenCalled();});
it('allows a fresh review after a proven OAuth refusal before the Market route admits the request',async()=>{const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Object.assign(Error('refused'),{status:403,payload:{error:'insufficient_scope'}});});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('not-sent');expect((await createMarketTrade(f.options).status())?.status).toBe('not-sent');await expect(api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'})).resolves.toBeDefined();});
it.each([{marketItemId:'asset:one',side:'buy'as const,amountUsdCents:'1000000000000000000'},{marketItemId:'asset:one',side:'sell'as const,shareQuantityMicro:'1000000000000000000'}])('rejects values outside the original Market integer transport bounds before a quote read',async value=>{const f=fixture();await expect(createMarketTrade(f.options).prepare(value)).rejects.toThrow('REQUEST_INVALID');expect(f.request).not.toHaveBeenCalled();expect(f.submitTrade).not.toHaveBeenCalled();});
it('binds a dollar sale to its exact budget, quoted ownership and original moved units',async()=>{
 const f=fixture();f.request.mockImplementation(async(path:string)=>{const query=new URL(path,'https://test.invalid').searchParams;if(!path.includes('/quote?'))return f.record;return{ok:true,authority:'market-observation',actorUserId:uid,request:Object.fromEntries(query),item:{id:'asset:one',title:'Dollar sale'},quote:{binding:'advisory'},preview:{shareQuantityMicro:'1250000',settlementUsdCents:'1000'},position:{id:intentId,owner_user_id:uid,market_item_id:'asset:one',share_quantity_micro:'2500000'}};});
 f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord({...body,shareQuantity:'1.250000'},uid);return f.record;});
 const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'sell',amountUsdCents:'1000'});
 expect(r.body).toMatchObject({marketItemId:'asset:one',side:'sell',amountUsd:'10.00'});expect(r.body).not.toHaveProperty('shareQuantity');expect(f.request).toHaveBeenCalledOnce();
 expect(await api.execute(r,r.digest)).toMatchObject({status:'recorded',side:'sell',shareQuantityMicro:'1250000',settlementUsdCents:'1000'});expect(f.submitTrade).toHaveBeenCalledOnce();expect(f.submitTrade.mock.calls[0][0]).toEqual(r.body);expect(f.request).toHaveBeenCalledOnce();
});
it.each(['budget','ownership','quote-ownership'])('refuses a dollar sale with mismatching %s',async kind=>{
 const f=fixture();f.request.mockImplementation(async(path:string)=>path.includes('/quote?')?{ok:true,authority:'market-observation',actorUserId:uid,request:{marketItemId:'asset:one',side:'sell',amountUsd:'10.00'},item:{id:'asset:one'},quote:{binding:'advisory'},preview:{shareQuantityMicro:kind==='quote-ownership'?'3000000':'1250000',settlementUsdCents:'1000'},position:{id:intentId,owner_user_id:uid,market_item_id:'asset:one',share_quantity_micro:'2500000'}}:f.record);
 f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord({...body,shareQuantity:kind==='ownership'?'3.000000':'1.250000'},uid);if(kind==='budget')f.record.source.trade.metadata.budgetUsdCents='2000';return{};});
 const api=createMarketTrade(f.options);if(kind==='quote-ownership'){await expect(api.prepare({marketItemId:'asset:one',side:'sell',amountUsdCents:'1000'})).rejects.toThrow('QUOTE_INVALID');expect(f.submitTrade).not.toHaveBeenCalled();}else{const r=await api.prepare({marketItemId:'asset:one',side:'sell',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');}
});
it('refuses ambiguous sell units locally and reports an older service without retrying',async()=>{
 const f=fixture(),api=createMarketTrade(f.options);await expect(api.prepare({marketItemId:'asset:one',side:'sell',amountUsdCents:'1000',shareQuantityMicro:'1000000'})).rejects.toThrow('REQUEST_INVALID');expect(f.request).not.toHaveBeenCalled();
 f.request.mockRejectedValue(Object.assign(Error('market_invalid_amount'),{status:400,payload:{error:'market_invalid_amount',privateAccount:'never display'}}));await expect(api.prepare({marketItemId:'asset:one',side:'sell',amountUsdCents:'1000'})).rejects.toThrow('BANK_MARKET_DOLLAR_SALE_UNAVAILABLE');expect(f.request).toHaveBeenCalledOnce();expect(f.submitTrade).not.toHaveBeenCalled();
});
it.each(['buy','sell']as const)('retains a fully bound %s POST original without another GET',async side=>{
 const f=fixture(),onRecorded=vi.fn(async()=>{});f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord(body,uid);return f.record;});const api=createMarketTrade({...f.options,onRecorded}),r=await api.prepare({marketItemId:'asset:one',side,...(side==='buy'?{amountUsdCents:'1000'}:{shareQuantityMicro:'1250000'})});f.request.mockClear();
 expect(await api.execute(r,r.digest)).toMatchObject({status:'recorded',side,shareQuantityMicro:'1250000'});expect(f.request).not.toHaveBeenCalled();expect(f.submitTrade).toHaveBeenCalledOnce();expect(f.state.current.status).toBe('recorded');expect(f.state.current.record).toEqual(f.record);expect(onRecorded).toHaveBeenCalledExactlyOnceWith(uid,f.state.current.record);
});
it.each(['absent','owner','nonce','budget','ledger'])('checks original GET after a missing or mismatched POST %s without repeating submission',async kind=>{
 const f=fixture();f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord(body,uid);if(kind==='absent')return{ok:true};const returned=structuredClone(f.record);if(kind==='owner')returned.actorUserId=intentId;if(kind==='nonce')returned.source.trade.client_nonce='foreign';if(kind==='budget')returned.source.trade.metadata.budgetUsdCents='2000';if(kind==='ledger')returned.source.ledgerEntries=[];return returned;});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});f.request.mockClear();
 expect((await api.execute(r,r.digest)).status).toBe('recorded');expect(f.request).toHaveBeenCalledExactlyOnceWith(`/api/connect/market/shares/trade?clientNonce=${encodeURIComponent(r.body.clientNonce)}`);expect(f.submitTrade).toHaveBeenCalledOnce();expect(f.state.current.record).toEqual(f.record);
});
it('keeps a valid POST outcome unknown when terminal record retention fails, without another request',async()=>{
 const f=fixture(),write=f.write.getMockImplementation()!;f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord(body,uid);return f.record;});f.write.mockImplementation(async(next:any,previous:any)=>{if(next.current.status==='recorded')throw Error('terminal storage unavailable');return write(next,previous);});
 const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});f.request.mockClear();expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.state.current.status).toBe('unknown');expect(f.request).not.toHaveBeenCalled();expect(f.submitTrade).toHaveBeenCalledOnce();
});

it('retains a safely closed refusal so a failed trade does not block the next review',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async body=>{throw Object.assign(Error('failed'),{status:500,payload:{error:'bigint out of range',outcome:{ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false,closed:true,clientNonce:body.clientNonce,reason:'rejected'}}});});
 const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'10000000'});
 expect(await api.execute(r,r.digest)).toMatchObject({status:'not-sent',reason:'market_trade_rejected'});
 expect((await createMarketTrade(f.options).status())?.status).toBe('not-sent');
 await expect(api.prepare({marketItemId:'asset:two',side:'buy',amountUsdCents:'1000'})).resolves.toBeDefined();
});
it('retains the specific bounded refusal with its closed original, including after reopening, without another request',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async body=>{throw Object.assign(Error('private service context'),{status:409,payload:{error:'market_quote_exposure_cap',secret:'never retain',outcome:{ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false,closed:true,clientNonce:body.clientNonce,reason:'rejected'}}});});
 const api=createMarketTrade(f.options),review=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});f.request.mockClear();
 const result=await api.execute(review,review.digest);
 expect(result).toMatchObject({status:'not-sent',reason:'market_trade_rejected',failure:{code:'market_quote_exposure_cap',status:409}});
 expect(await createMarketTrade(f.options).status()).toEqual(result);expect(JSON.stringify(f.state)).not.toContain('private service context');expect(JSON.stringify(f.state)).not.toContain('never retain');
 expect(f.request).not.toHaveBeenCalled();expect(f.submitTrade).toHaveBeenCalledOnce();
});
it('keeps the submit reason when the existing recovery read supplies the exact rejected closure',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async body=>{f.record={ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false,closed:true,clientNonce:body.clientNonce,reason:'rejected'};throw Object.assign(Error('private context'),{status:409,payload:{error:'market_quote_trade_limit'}});});
 const api=createMarketTrade(f.options),review=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});f.request.mockClear();
 expect(await api.execute(review,review.digest)).toMatchObject({status:'not-sent',failure:{code:'market_quote_trade_limit',status:409}});
 expect(f.request).toHaveBeenCalledOnce();expect(f.submitTrade).toHaveBeenCalledOnce();expect((await createMarketTrade(f.options).status())).toHaveProperty('failure.code','market_quote_trade_limit');
});
it('closes only the displayed original nonce and never submits a trade during cancellation',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Error('lost');});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});await api.execute(r,r.digest);
 f.options.connect=async()=>({accountUid:uid,client:{request:async(path:string,options:any)=>{if(path.endsWith('/cancel'))return{ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false,closed:true,clientNonce:options.body.clientNonce,reason:'canceled'};return f.request(path);}}});
 const reopened=createMarketTrade(f.options);
 await expect(reopened.stop(false,r.body.clientNonce)).rejects.toThrow('CONSENT');
 await expect(reopened.stop(true,intentId)).rejects.toThrow('MISMATCH');
 expect(await reopened.stop(true,r.body.clientNonce)).toMatchObject({status:'not-sent',reason:'market_trade_canceled'});
 expect((await createMarketTrade(f.options).status())?.status).toBe('not-sent');expect(f.submitTrade).toHaveBeenCalledTimes(1);
});
it('does not accept an unfenced or foreign closure as a failed trade',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async body=>{throw Object.assign(Error('failed'),{status:409,payload:{outcome:{ok:true,authority:'market-observation',actorUserId:intentId,found:false,recorded:false,closed:true,clientNonce:body.clientNonce,reason:'rejected'}}});});
 const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');
});
it('recovers a closure saved by the service after the original error response was lost',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Error('lost');});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});await api.execute(r,r.digest);
 f.record={ok:true,authority:'market-observation',actorUserId:uid,found:false,recorded:false,closed:true,clientNonce:r.body.clientNonce,reason:'rejected'};
 expect(await createMarketTrade(f.options).resolve(true)).toMatchObject({status:'not-sent',reason:'market_trade_rejected'});expect(f.submitTrade).toHaveBeenCalledTimes(1);
});
it('retains a committed original when completion wins the cancellation race',async()=>{
 const f=fixture();f.submitTrade.mockImplementation(async()=>{throw Error('lost');});const api=createMarketTrade(f.options),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});await api.execute(r,r.digest);
 f.options.connect=async()=>({accountUid:uid,client:{request:async()=>syntheticMarketRecord(r.body,uid)}});
 expect(await createMarketTrade(f.options).stop(true,r.body.clientNonce)).toMatchObject({status:'recorded',settlementUsdCents:'1000'});expect(f.submitTrade).toHaveBeenCalledTimes(1);
});

it.each(['buy','sell']as const)('publishes %s absolute effects before completion without waiting on optional refresh',async side=>{
 const f=fixture();f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord(body,uid);return f.record;});let finish!:()=>void;const paused=new Promise<void>(resolve=>finish=resolve);let published=false;
 const onRecorded=vi.fn(async(accountUid,original)=>{expect(accountUid).toBe(uid);expect(original).toEqual(f.record);expect(f.state.current.status).toBe('recorded');published=true;});
 const afterRecorded=vi.fn(async()=>{await paused;throw Error('optional refresh failed');});
 const api=createMarketTrade({...f.options,onRecorded,afterRecorded}),r=await api.prepare({marketItemId:'asset:one',side,...(side==='buy'?{amountUsdCents:'1000'}:{shareQuantityMicro:'1250000'})});
 try{expect((await api.execute(r,r.digest)).status).toBe('recorded');expect(published).toBe(true);expect(afterRecorded).toHaveBeenCalledOnce();expect(f.submitTrade).toHaveBeenCalledOnce();}finally{finish();}
});
it.each(['throw','reject']as const)('optional Market refresh %s cannot change the retained result',async mode=>{
 const f=fixture();f.submitTrade.mockImplementation(async(body:any)=>{f.record=syntheticMarketRecord(body,uid);return f.record;});const afterRecorded=vi.fn(()=>{if(mode==='throw')throw Error('optional');return Promise.reject(Error('optional'));});
 const api=createMarketTrade({...f.options,afterRecorded}),r=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('recorded');await Promise.resolve();expect((await api.status())?.status).toBe('recorded');expect(afterRecorded).toHaveBeenCalledOnce();
});
it.each(['buy','sell'] as const)('requests only needed wallet context for %s review',async side=>{
 const f=fixture(),api=createMarketTrade(f.options);
 await api.prepare({marketItemId:'asset:one',side,...(side==='buy'?{amountUsdCents:'1000'}:{shareQuantityMicro:'1250000'})});
 const query=new URL(f.request.mock.calls[0][0],'https://test.invalid').searchParams;
 expect(query.get('balance')).toBe(side==='sell'?'omit':null);expect(f.submitTrade).not.toHaveBeenCalled();
});
it('publishes a read-only share refresh only after retaining a recorded trade, and observer failure cannot change the outcome',async()=>{
 const f=fixture(),observed=vi.fn((_event:Event)=>{expect(f.state.current.status).toBe('recorded');throw Error('display observer failed');});vi.stubGlobal('dispatchEvent',observed);
 try{const api=createMarketTrade(f.options),review=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});expect(observed).not.toHaveBeenCalled();expect((await api.execute(review,review.digest)).status).toBe('recorded');expect(observed).toHaveBeenCalledOnce();expect(observed.mock.calls[0]?.[0]).toMatchObject({type:'bankeiz:market-shares-changed',detail:{clientNonce:review.body.clientNonce}});}finally{vi.unstubAllGlobals();}
});
