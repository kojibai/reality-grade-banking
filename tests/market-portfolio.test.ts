import {afterEach,expect,it,vi} from 'vitest';
import {createMarketPortfolio,parseMarketPortfolio,readSealedMarketPortfolio} from '../src/receiz/market-portfolio';
import {positionValue,portfolioValue,portfolioItem} from '../src/receiz/market-portfolio-value';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
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
