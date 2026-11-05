import {expect,it,vi} from 'vitest';
import {createMarketPortfolio,type MarketPortfolio} from '../src/receiz/market-portfolio';

const uid='synthetic-portfolio-owner',kai='14000100123456',at='2026-10-21T15:00:00.000001Z';
function original(coordinate:unknown=kai){
 return{ok:true,authority:'market-observation',actorUserId:uid,found:true,recorded:true,source:{
  trade:{id:'synthetic-trade',position_id:'synthetic-position',owner_user_id:uid,market_item_id:'synthetic-item',market_type:'asset',title:'Synthetic holding',side:'buy',share_quantity_micro:'1000000',price_usd_cents:'100',settlement_usd_cents:'100',fee_usd_cents:'0',created_at:at,kai_upulse:coordinate,kai_basis:'KKSv1.0',pulse:'14000100'},
  position:{id:'synthetic-position',owner_user_id:uid,market_item_id:'synthetic-item',asset_id:'synthetic-asset',title:'Synthetic holding',summary:'',share_quantity_micro:'1000000',cost_basis_usd_cents:'100',last_price_usd_cents:'100',opened_at:at,last_trade_at:at},
 }};
}
function harness(){
 const request=vi.fn(async()=>{throw Error('Unexpected request');}),save=vi.fn(async(_value:MarketPortfolio)=>{}),api=createMarketPortfolio({accountUid:uid,assertOpen(){},request,save});
 return{api,request,save};
}
it('keeps the exact accepted trade coordinate in the immediate holding and saved display without a request',async()=>{
 const {api,request,save}=harness();api.adoptRecorded(original());
 expect(api.known()?.trades[0].kaiUPulse).toBe('14000100123456');
 expect(api.known()?.positions[0].shareQuantityMicro).toBe('1000000');
 await vi.waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
 expect(save.mock.calls[0][0]).toMatchObject({trades:[{id:'synthetic-trade',kaiUPulse:'14000100123456'}]});
 expect(request).not.toHaveBeenCalled();
});
it('adds newly carried exact timing to the same thin trade without replaying the old ownership observation',async()=>{
 const {api,request,save}=harness();api.adoptRecorded(original(null));await vi.waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
 const held=api.known()!,positions=held.positions,trades=held.trades;expect(trades[0].kaiUPulse).toBeUndefined();
 const exact=original();exact.source.position.share_quantity_micro='999999999';exact.source.position.cost_basis_usd_cents='999999999';
 api.adoptRecorded(exact);
 expect(api.known()?.positions).toBe(positions);expect(api.known()?.positions[0].shareQuantityMicro).toBe('1000000');
 expect(api.known()?.observedAt).toBe(held.observedAt);expect(api.known()?.trades).toHaveLength(1);
 expect(api.known()?.trades[0]).toEqual({...trades[0],kaiUPulse:'14000100123456'});
 await vi.waitFor(()=>expect(save).toHaveBeenCalledTimes(2));expect(save.mock.calls[1][0]).toBe(api.known());expect(request).not.toHaveBeenCalled();
 const enriched=api.known();api.adoptRecorded(exact);expect(api.known()).toBe(enriched);expect(save).toHaveBeenCalledTimes(2);
});
it('keeps an already recorded exact coordinate when a duplicate is thin or carries another coordinate',()=>{
 const {api,request}=harness();api.adoptRecorded(original());const held=api.known();
 api.adoptRecorded(original(null));api.adoptRecorded(original('14000100999999'));
 expect(api.known()).toBe(held);expect(api.known()?.trades[0].kaiUPulse).toBe('14000100123456');expect(request).not.toHaveBeenCalled();
});
it('preserves a safe integer Source coordinate without rounding it',()=>{
 const {api,request}=harness();api.adoptRecorded(original(14000100123456));expect(api.known()?.trades[0].kaiUPulse).toBe('14000100123456');expect(request).not.toHaveBeenCalled();
});
it.each([{kai_basis:'legacy-chronos-projection'},{kai_basis:'unknown'},{pulse:'14000101'},{pulse:'invalid'}])('does not relabel unqualified or inconsistent Source timing as exact: %j',changes=>{
 const {api}=harness(),raw=original();Object.assign(raw.source.trade,changes);api.adoptRecorded(raw);expect(api.known()?.trades[0].kaiUPulse).toBeUndefined();
});
it.each(['market_item_id','side','share_quantity_micro','price_usd_cents','settlement_usd_cents','fee_usd_cents','created_at'] as const)('does not attach duplicate timing when the accepted trade %s differs',key=>{
 const {api}=harness();api.adoptRecorded(original(null));const held=api.known(),different=original();
 if(key==='market_item_id'){different.source.trade.market_item_id='other-item';different.source.position.market_item_id='other-item';}
 else if(key==='side')different.source.trade.side='sell';
 else if(key==='created_at')different.source.trade.created_at='2026-10-21T15:01:00.000001Z';
 else different.source.trade[key]='2000000';
 api.adoptRecorded(different);expect(api.known()).toBe(held);expect(api.known()?.trades[0].kaiUPulse).toBeUndefined();
});
it.each([null,'invalid','123456789012345678',-1,Number.MAX_SAFE_INTEGER+1])('does not invent an exact coordinate from invalid source timing %s',coordinate=>{
 const {api,request}=harness();api.adoptRecorded(original(coordinate));expect(api.known()?.trades[0].kaiUPulse).toBeUndefined();expect(request).not.toHaveBeenCalled();
});
it('keeps the existing original owner checks before adopting timing',()=>{
 const {api,request}=harness(),foreign=original();foreign.source.trade.owner_user_id='different-owner';
 expect(()=>api.adoptRecorded(foreign)).toThrow('MARKET_PORTFOLIO_ORIGINAL_MISMATCH');expect(api.known()).toBeNull();expect(request).not.toHaveBeenCalled();
});
it('retains known exact timing across an equivalent thin refresh and saves the fresh observation without another request',async()=>{
 const first=harness();first.api.adoptRecorded(original());const held=first.api.known()!,thin=structuredClone(held);
 delete thin.trades[0].kaiUPulse;thin.observedAt='2026-10-21T15:01:00Z';
 const request=vi.fn(async()=>thin),save=vi.fn(async(_value:MarketPortfolio)=>{}),api=createMarketPortfolio({accountUid:uid,initial:held,assertOpen(){},request,save});
 const next=await api.refresh();expect(next.trades[0].kaiUPulse).toBe('14000100123456');expect(next.positions).toEqual(thin.positions);expect(next.observedAt).toBe('2026-10-21T15:01:00Z');
 expect(thin.trades[0].kaiUPulse).toBeUndefined();await vi.waitFor(()=>expect(save).toHaveBeenCalledTimes(1));expect(save.mock.calls[0][0]).toBe(next);
 expect(await api.refresh()).toBe(next);expect(request).toHaveBeenCalledTimes(1);
});
it.each(['marketItemId','side','shareQuantityMicro','executionPriceUsdCents','settlementUsdCents','feeUsdCents','executedAt'] as const)('does not borrow timing across a refresh with different trade %s',async key=>{
 const first=harness();first.api.adoptRecorded(original());const held=first.api.known()!,thin=structuredClone(held);delete thin.trades[0].kaiUPulse;
 if(key==='marketItemId')thin.trades[0].marketItemId='other-item';else if(key==='side')thin.trades[0].side='sell';else if(key==='executedAt')thin.trades[0].executedAt='2026-10-21T15:01:00Z';else thin.trades[0][key]='2000000';
 const request=vi.fn(async()=>thin),api=createMarketPortfolio({accountUid:uid,initial:held,assertOpen(){},request});
 expect((await api.refresh()).trades[0].kaiUPulse).toBeUndefined();expect(request).toHaveBeenCalledTimes(1);
});
it('keeps a fresh exact coordinate and refuses foreign account refreshes instead of borrowing retained timing',async()=>{
 const first=harness();first.api.adoptRecorded(original());const held=first.api.known()!,fresh=structuredClone(held);fresh.trades[0].kaiUPulse='14000100999999';
 const api=createMarketPortfolio({accountUid:uid,initial:held,assertOpen(){},request:async()=>fresh});expect((await api.refresh()).trades[0].kaiUPulse).toBe('14000100999999');
 const foreign=structuredClone(held);foreign.accountUid='other-owner';delete foreign.trades[0].kaiUPulse;
 const other=createMarketPortfolio({accountUid:uid,initial:held,assertOpen(){},request:async()=>foreign});await expect(other.refresh()).rejects.toThrow('MARKET_PORTFOLIO_ACCOUNT_MISMATCH');expect(other.known()).toBe(held);
});
it('does not invalidate an existing portfolio read or queue a successor for timing-only duplicate enrichment',async()=>{
 const first=harness();first.api.adoptRecorded(original(null));const thin=first.api.known()!;
 let finish!:(value:MarketPortfolio)=>void;const request=vi.fn(()=>new Promise<MarketPortfolio>(resolve=>{finish=resolve;})),api=createMarketPortfolio({accountUid:uid,initial:thin,assertOpen(){},request});
 const pending=api.refresh();api.adoptRecorded(original());expect(api.known()?.trades[0].kaiUPulse).toBe('14000100123456');
 finish(structuredClone(thin));const next=await pending;expect(next.trades[0].kaiUPulse).toBe('14000100123456');
 expect(next.positions).toEqual(thin.positions);expect(await api.refresh()).toBe(next);expect(request).toHaveBeenCalledTimes(1);
});
it('reuses a fresh portfolio after timing-only enrichment without a redundant refresh request',async()=>{
 const first=harness();first.api.adoptRecorded(original(null));const thin=first.api.known()!;
 const request=vi.fn(async()=>structuredClone(thin)),api=createMarketPortfolio({accountUid:uid,initial:thin,assertOpen(){},request});
 await api.refresh();api.adoptRecorded(original());const held=api.known();
 const reused=await api.refresh();expect(request).toHaveBeenCalledTimes(1);expect(reused).toBe(held);expect(api.known()?.trades[0].kaiUPulse).toBe('14000100123456');
});
