import {expect,it} from 'vitest';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
import {collectibleSealTimes,datedIssuances,visibleHistory} from '../src/observatory/circulation-history';

it('counts each dated issuance once across holders and preserves distinct issuances at the same time',()=>{
 const first=marketPulseTime(10),next=marketPulseTime(11);
 const seal=(id:string,at:number)=>({collectibleId:id,claimHash:'a',sealedAt:new Date(at).toISOString()});
 const original=(assetId:string,claimPulse:number)=>({category:'proof',assetId,livePulseSeed:{claimPulse}});
 const catalog={items:[
  {category:'sports',sealedBirths:[seal('b',first),seal('c',first),seal('d',next)]},
  {category:'sports',sealedCopies:[seal('B',first),seal('d',first)]},
  original('p',10),original('p',10),original('q',11),original('later',20),
 ]} as PublicMarketCatalog;
 const seals=collectibleSealTimes(catalog);
 expect(seals).toEqual([first,first]);
 expect(datedIssuances(catalog,seals,next)).toEqual([{at:first,value:3},{at:next,value:4}]);
 expect(datedIssuances(catalog,seals,marketPulseTime(20)).at(-1)).toEqual({at:marketPulseTime(20),value:5});
});

it('places archived claim dates and carried Original seals at their issue time across claim revisions',()=>{
 const t=marketPulseTime(51),later=marketPulseTime(52);
 const catalog={items:[{category:'sports',sealedBirths:[{collectibleId:'rsc_one',claimHash:'new',sealedAt:new Date(t).toISOString()}]},
  {category:'proof',assetId:'legacy',pulse:'52'}, {category:'proof',assetId:'dated',sealedAt:new Date(t).toISOString()}]} as PublicMarketCatalog;
 const seals=collectibleSealTimes(catalog,[['rsc_one:old',t],['rsc_two:other',later]]);
 expect(seals).toEqual([t,later]);
 expect(datedIssuances(catalog,seals,later)).toEqual([{at:t,value:2},{at:later,value:4}]);
});

it('keeps the known opening value and observation time on both ends of a sparse window',()=>{
 const history=[{at:2,value:8},{at:7,value:6},{at:11,value:9}];
 expect(visibleHistory(history,8,10)).toEqual([{at:8,value:6,observedAt:7},{at:10,value:6,observedAt:7}]);
 expect(visibleHistory(history,1,7)).toEqual(history.slice(0,2));
 expect(visibleHistory(history,7,11)).toEqual(history.slice(1));
 expect(visibleHistory(history,0,1)).toEqual([]);
});
