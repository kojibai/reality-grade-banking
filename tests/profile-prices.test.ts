import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import {profileCollectionPrices,profileCollectionReturn,profileCollectionSummary} from '../src/public-explorer/profile-prices';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
import {publicShareCapitalization,readPublicShareInventory} from '../src/receiz/market-share-inventory';

it('weights the whole collection by original values instead of averaging per-asset percentage changes',()=>{
 const seed={kind:'sigil' as const,claimPulse:14_000_000,beat:2,stepIndex:3,creatorVerified:true};
 const a=publicSigilQuoteAtPulse(seed,seed.claimPulse).priceUsd,b=publicSigilQuoteAtPulse({...seed,claimPulse:15_000_000},15_000_000).priceUsd;
 const items=parsePublicMarket({ok:true,transport:{publicOriginals:[
  {id:'a',receizId:'a',title:'First',pulse:String(seed.claimPulse),livePulseSeed:seed,valueUsd:a*2},
  {id:'b',receizId:'b',title:'Second',pulse:'15000000',livePulseSeed:{...seed,claimPulse:15_000_000},valueUsd:b*.5},
 ]}}).items;
 expect(profileCollectionReturn(items,null)).toBeCloseTo(((a*2+b*.5)/(a+b)-1)*100,8);
 expect(profileCollectionReturn([{...items[0],priceUsd:a*.5}],null)).toBeCloseTo(-50,8);
 expect(profileCollectionReturn([{...items[0],livePulseSeed:undefined}],null)).toBeNull();
 expect(profileCollectionReturn([items[0],{...items[1],priceUsd:null}],null)).toBeNull();
 expect(profileCollectionReturn([],null)).toBeNull();
});

it('totals the prepared displayed values without requiring another valuation or inventing missing prices',()=>{
 const [base]=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'summary',receizId:'summary',title:'Original',valueUsd:12.25}]}}).items;
 const items=[{...base,id:'first',priceUsd:12.25,livePulseSeed:undefined},{...base,id:'second',priceUsd:20.50,livePulseSeed:undefined}];
 expect(profileCollectionSummary(items,null)).toEqual({valueUsd:32.75,returnPct:null});
 expect(profileCollectionSummary([{...items[0],priceUsd:0}],null)).toEqual({valueUsd:0,returnPct:null});
 for(const invalid of [null,NaN,Infinity,-1])expect(profileCollectionSummary([items[0],{...items[1],priceUsd:invalid}],null)).toEqual({valueUsd:null,returnPct:null});
 expect(profileCollectionSummary([],null)).toEqual({valueUsd:null,returnPct:null});
});
it('uses the same current canonical share supply in profile and Market after a purchase, including an appended Original digest',()=>{
 const [base]=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:original',receizId:'original',title:'Original',pulse:'14955302',valueUsd:25,profileOriginal:{media:{originalDownloadSha256Hex:'a'.repeat(64)}}}]}}).items;
 const inventory=(at:string,quantity:string)=>readPublicShareInventory({schema:'receiz.market.share-inventory.v1',marketItemId:base.id,assetId:base.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:at,outstandingShareQuantityMicro:quantity,availableShareQuantityMicro:'9000000',positionsMicro:quantity,certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'},base)!;
 const stale={...base,shareInventory:inventory('14955302000000','1000000')},fresh={...base,shareInventory:inventory('14955303000000','2000000')},catalog={items:[fresh],complete:true}as PublicMarketCatalog;
 for(const originalDigest of [base.originalDigest,'b'.repeat(64)]){
  const [profile]=profileCollectionPrices([{...stale,originalDigest}],catalog,null,14955304);
  expect(profile.shareInventory?.outstandingShareQuantityMicro).toBe('2000000');
  expect(publicShareCapitalization({...catalog,items:[profile]}).usdCents).toBe(publicShareCapitalization(catalog).usdCents);
 }
 const [newer]=profileCollectionPrices([fresh],{...catalog,items:[stale]},null,14955304);expect(newer.shareInventory?.outstandingShareQuantityMicro).toBe('2000000');
});
