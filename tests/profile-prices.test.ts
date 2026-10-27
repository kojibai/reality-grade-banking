import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import {profileCollectionReturn,profileCollectionSummary} from '../src/public-explorer/profile-prices';

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
