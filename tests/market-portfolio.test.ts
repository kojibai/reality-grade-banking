import {afterEach,expect,it,vi} from 'vitest';
import {createMarketPortfolio,parseMarketPortfolio,readSealedMarketPortfolio} from '../src/receiz/market-portfolio';
import {positionValue,portfolioValue,portfolioItem} from '../src/receiz/market-portfolio-value';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
function recordedPosition(quantity='3500000',side='buy',id='new-trade',at='2026-10-21T15:00:00.000001Z'){
 return{ok:true,authority:'market-observation',actorUserId:portfolioUid,found:true,recorded:true,source:{trade:{id,position_id:'position-one',owner_user_id:portfolioUid,market_item_id:'profile:artist:work',market_type:'asset',title:'The First Light',side,share_quantity_micro:'1000000',price_usd_cents:'1000',settlement_usd_cents:'1000',fee_usd_cents:'0',created_at:at},position:{id:'position-one',owner_user_id:portfolioUid,market_item_id:'profile:artist:work',asset_id:'work',title:'The First Light',summary:'An original work.',share_quantity_micro:quantity,cost_basis_usd_cents:quantity==='0'?'0':'3000',last_price_usd_cents:'1000',opened_at:'2026-10-19T10:00:00Z',last_trade_at:at}}};
}
afterEach(()=>vi.restoreAllMocks());
it('reads existing Receiz positions without confusing ownership of a showcase object with purchased shares',()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid);expect(p.positions).toHaveLength(2);expect(p.positions[0]).toMatchObject({marketItemId:'profile:artist:work',shareQuantityMicro:'2500000',costBasisUsdCents:'2000'});expect(p.trades[0].settlementUsdCents).toBe('2000');
 expect(()=>parseMarketPortfolio({...portfolioFixture(),actorUserId:'other-account'},portfolioUid)).toThrow();
 const bad=portfolioFixture();bad.positions[0].shareQuantityMicro='2.5';expect(()=>parseMarketPortfolio(bad,portfolioUid)).toThrow();
});
it('shows a verified sealed-head portfolio without a network read and refuses unverified or foreign account data',()=>{
 const p=portfolioFixture(),snapshot={market:{schema:'receiz.market.account-portable.v1',ownerUserId:portfolioUid,completeAtSealedHead:true,snapshot:{signedIn:true,viewerUserId:portfolioUid,generatedAt:p.observedAt,ownedItems:p.positions.map(position=>({id:position.marketItemId,title:position.title,assetId:position.assetId,position})),shareTradeHistory:p.trades}}};
 expect(readSealedMarketPortfolio({portableStateVerified:true,verifiedState:snapshot} as never,portfolioUid)?.positions[0].shareQuantityMicro).toBe('2500000');
 expect(readSealedMarketPortfolio({portableStateVerified:false,verifiedState:snapshot} as never,portfolioUid)).toBeNull();expect(readSealedMarketPortfolio({portableStateVerified:true,verifiedState:snapshot} as never,'another-account')).toBeNull();
});
it('coalesces the portfolio read and follows a trade committed during an older read with one fresh read',async()=>{
 let finish!:(value:unknown)=>void;const first=portfolioFixture(),second=portfolioFixture();second.positions[0].shareQuantityMicro='3500000';
 const request=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue(second),save=vi.fn();
 const api=createMarketPortfolio({accountUid:portfolioUid,assertOpen:()=>{},request,save});const a=api.refresh(),b=api.refresh();expect(a).toBe(b);api.invalidate();finish(first);await expect(a).rejects.toThrow('SUPERSEDED');await vi.waitFor(()=>expect(api.known()?.positions[0].shareQuantityMicro).toBe('3500000'));expect(request).toHaveBeenCalledTimes(2);await api.refresh();expect(request).toHaveBeenCalledTimes(2);
});
it('retains holdings on a failed sync and never publishes a late response after identity closure',async()=>{
 let closed=false,finish!:(value:unknown)=>void;const initial=parseMarketPortfolio(portfolioFixture(),portfolioUid),request=vi.fn().mockRejectedValueOnce(Error('offline')).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const api=createMarketPortfolio({accountUid:portfolioUid,initial,assertOpen:()=>{if(closed)throw Error('closed');},request});await expect(api.refresh(true)).rejects.toThrow('offline');expect(api.known()).toBe(initial);
 const next=api.refresh(true);closed=true;finish(portfolioFixture());await expect(next).rejects.toThrow('closed');expect(api.known()).toBe(initial);
});
it('values exact owned shares and their cost basis with BigInt, without crediting an account balance',()=>{
 const p=parseMarketPortfolio(portfolioFixture(),portfolioUid),item=portfolioItem(p.positions[0],null);const value=positionValue(p.positions[0],{...item,priceUsd:12});expect(value).toEqual({valueUsdCents:'3000',costBasisUsdCents:'2000',pnlUsdCents:'1000',pnlPct:50,priceUsdCents:'1200'});
 expect(portfolioValue(p,[{...item,priceUsd:12}]).valueUsdCents).toBe('3500');
});
it('paints a confirmed absolute holding and trade immediately without a portfolio request, and removes a fully sold holding',()=>{
 const initial=parseMarketPortfolio(portfolioFixture(),portfolioUid),request=vi.fn(),saved=vi.fn(),api=createMarketPortfolio({accountUid:portfolioUid,initial,assertOpen(){},request,save:saved}),notify=vi.fn();api.subscribe(notify);
 api.adoptRecorded(recordedPosition());expect(api.known()?.positions[0].shareQuantityMicro).toBe('3500000');expect(api.known()?.positions[1]).toEqual(initial.positions[1]);expect(api.known()?.trades[0].id).toBe('new-trade');expect(request).not.toHaveBeenCalled();expect(notify).toHaveBeenCalledOnce();
 api.adoptRecorded(recordedPosition('0','sell','sold-all','2026-10-21T15:01:00Z'));expect(api.known()?.positions.map(row=>row.marketItemId)).toEqual(['profile:artist:other']);expect(api.known()?.trades[0].id).toBe('sold-all');expect(request).not.toHaveBeenCalled();
});
it('rejects foreign or malformed originals and cannot roll a newer holding back by replaying an older result',()=>{
 const initial=parseMarketPortfolio(portfolioFixture(),portfolioUid),api=createMarketPortfolio({accountUid:portfolioUid,initial,assertOpen(){},request:vi.fn()});
 api.adoptRecorded(recordedPosition('4500000','buy','later','2026-10-21T15:00:00.000002Z'));
 api.adoptRecorded(recordedPosition('3500000','buy','earlier','2026-10-21T15:00:00.000001Z'));expect(api.known()?.positions[0].shareQuantityMicro).toBe('4500000');expect(api.known()?.trades).toHaveLength(4);
 const same=api.known();api.adoptRecorded(recordedPosition('3500000','buy','earlier','2026-10-21T15:00:00.000001Z'));expect(api.known()).toBe(same);
 const bad=recordedPosition();bad.source.position.owner_user_id='foreign';expect(()=>api.adoptRecorded(bad)).toThrow();expect(api.known()).toBe(same);
});
it('protects the confirmed inline result from an in-flight older portfolio read, using only one existing successor refresh',async()=>{
 let finish!:(value:unknown)=>void;const initial=parseMarketPortfolio(portfolioFixture(),portfolioUid),later=portfolioFixture();later.positions[0].shareQuantityMicro='3500000';later.observedAt='2026-10-21T16:00:00Z';later.trades.unshift({id:'new-trade',marketItemId:'profile:artist:work',title:'The First Light',side:'buy',shareQuantityMicro:'1000000',executionPriceUsdCents:'1000',settlementUsdCents:'1000',executedAt:'2026-10-21T15:00:00.000001Z'});
 const request=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue(later),api=createMarketPortfolio({accountUid:portfolioUid,initial,assertOpen(){},request});const old=api.refresh(true);
 api.adoptRecorded(recordedPosition());expect(api.known()?.positions[0].shareQuantityMicro).toBe('3500000');api.invalidate();finish(portfolioFixture());await expect(old).rejects.toThrow('SUPERSEDED');await vi.waitFor(()=>expect(request).toHaveBeenCalledTimes(2));expect(api.known()?.positions[0].shareQuantityMicro).toBe('3500000');
});
it('can show a newly confirmed holding before the first whole-account read without claiming the partial portfolio is complete',async()=>{
 const request=vi.fn(async()=>portfolioFixture()),api=createMarketPortfolio({accountUid:portfolioUid,assertOpen(){},request});api.adoptRecorded(recordedPosition());
 expect(api.known()).toMatchObject({complete:false,positions:[{shareQuantityMicro:'3500000'}]});expect(request).not.toHaveBeenCalled();
 const retained=parseMarketPortfolio(api.known(),portfolioUid);expect(retained.complete).toBe(false);
});
