import {expect,it} from 'vitest';
import {fixture,pulse} from './helpers/market-history-original-addition-fixture';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {globalMarketCapitalizationInputs,prepareGlobalShareCapitalization} from '../src/receiz/market-projection/global-share-capitalization';
import {currentMarketDisplayModel} from '../src/receiz/market-projection/catalog-source';
it('adds the exact zero-issued Original without replaying unchanged historic valuations',async()=>{
 const {source,before,after}=fixture();
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 let samples=0;
 const incremental=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before}} as Parameters<typeof buildMarketHistory>[4]))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1,capitalization:true}))!;
 const scoped=globalMarketCapitalizationInputs(source,after),model=currentMarketDisplayModel(scoped.source,scoped.catalog,pulse+1),exact=prepareGlobalShareCapitalization(model,after);
 for(const points of Object.values(incremental.series))for(const point of points)expect(point.usdCents).toBe(exact.at(point.pulse));
 expect(incremental.summary.shareCapitalization?.covered).toBe(2);
 expect(incremental.summary.shareCapitalization?.outstandingShareQuantityMicro).toBe('1000000');
 expect(parseMarketHistory(incremental)).toBe(incremental);
 for(const period of Object.keys(incremental.series) as (keyof typeof incremental.series)[]){const exact=new Map(full.series[period].map(point=>[point.pulse,point.usdCents]));for(const point of incremental.series[period])if(exact.has(point.pulse))expect(point.usdCents).toBe(exact.get(point.pulse));}
 expect(incremental.summary).toEqual(full.summary);
 expect(samples).toBeLessThan(20);
 let ticks=0;const tick=(await buildMarketHistory(source,incremental,undefined,async()=>{ticks++;},{catalog:after,pulse:pulse+2,capitalization:true,priorInput:{source,catalog:after}}))!;expect(parseMarketHistory(tick).summary.serverPulse).toBe(pulse+2);expect(ticks).toBeLessThan(10);
});
it('rebuilds when a previously admitted operand changes rather than borrowing the former amount',async()=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const changed:PublicMarketCatalog={...after,items:after.items.map((item,index)=>index?item:{...item,livePulseSeed:{...item.livePulseSeed!,creatorVerified:!item.livePulseSeed!.creatorVerified}})};
 let samples=0;const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:changed,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before}} as Parameters<typeof buildMarketHistory>[4]))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:changed,pulse:pulse+1,capitalization:true}))!;
 expect(next).toEqual(full);expect(samples).toBeGreaterThan(20);
});

it('retains the exact previous quantity prefix when a newer quote appends only future observations',async()=>{
 const {source,before,after}=fixture(),item=before.items[0],birth=BigInt(item.shareInventory!.releaseCapitalization!.kaiUPulse),observed=birth+100_000_123n;
 const prior={...item.shareInventory!,observedAtKaiUPulse:String(observed),capitalizationHistory:[{kaiUPulse:String(observed),unitPriceUsdCents:'125',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'1000000'}]};
 before.items[0]={...item,shareInventory:prior};
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const later=String(BigInt(pulse+1)*1000000n+123n);
 after.items[0]={...after.items[0],shareInventory:{...prior,observedAtKaiUPulse:later,availableShareQuantityMicro:'3000000',capitalizationHistory:[...prior.capitalizationHistory,{kaiUPulse:later,unitPriceUsdCents:'150',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'3000000'}]}};
 let samples=0;const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+2,capitalization:true,priorInput:{source,catalog:before}}))!;
 const scoped=globalMarketCapitalizationInputs(source,after),model=currentMarketDisplayModel(scoped.source,scoped.catalog,pulse+2),exact=prepareGlobalShareCapitalization(model,after);
 for(const points of Object.values(next.series))for(const point of points)expect(point.usdCents).toBe(exact.at(point.pulse));
 expect(samples).toBeLessThan(20);expect(next.summary.serverPulse).toBe(pulse+2);
});
it('refuses old quantity changes and a substituted previous basis',async()=>{
 for(const substitute of [false,true]){
  const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
  after.items[0]={...after.items[0],shareInventory:{...after.items[0].shareInventory!,releaseCapitalization:{...after.items[0].shareInventory!.releaseCapitalization!,availableShareQuantityMicro:'9000000'}}};
  let samples=0;const next=(await buildMarketHistory(source,substitute?{...previous,basisSha256:'f'.repeat(64)}:previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before}}))!;
  const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1,capitalization:true}))!;
  expect(samples).toBeGreaterThan(20);expect(next.summary).toEqual(full.summary);
  const scoped=globalMarketCapitalizationInputs(source,after),model=currentMarketDisplayModel(scoped.source,scoped.catalog,pulse+1),exact=prepareGlobalShareCapitalization(model,after);for(const points of Object.values(next.series))for(const point of points)expect(point.usdCents).toBe(exact.at(point.pulse));
 }
});

it('preserves completed historic contributions and the prior closing observation while adding only the new Original',async()=>{
 const sports=(await import('../public/receiz-public-sports.json')).default,{mergePublicSports}=await import('../src/receiz/public-sports');
 const f=fixture(),input={...sports,cards:sports.cards.slice(0,20)},before=mergePublicSports(f.before,input),after=mergePublicSports(f.after,input);
 const previous=(await buildMarketHistory(f.source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const same=(await buildMarketHistory(f.source,previous,undefined,undefined,{catalog:before,pulse:pulse+1,capitalization:true}))!;
 const former=previous.series['1D'].at(-1)!;expect(same.series['1D'].find(point=>point.pulse===former.pulse)?.usdCents).toBe(former.usdCents);
 let samples=0;const next=(await buildMarketHistory(f.source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source:f.source,catalog:before}}))!;
 const scoped=globalMarketCapitalizationInputs(f.source,after),model=currentMarketDisplayModel(scoped.source,scoped.catalog,pulse+1),exact=prepareGlobalShareCapitalization(model,after);
 const targetOnly={...after,items:after.items.filter(item=>item.assetId===f.after.items[1].assetId)},added=prepareGlobalShareCapitalization({...model,valueRows:model.valueRows.filter(row=>row.source!=='sports-economy-card'),unpricedSealedBirths:undefined,sportsHistorySnapshot:undefined,sportsHistoryEvaluationPulse:undefined,sourceEvaluation:undefined,undatedHistory:undefined},targetOnly);
 const old=new Map(Object.values(previous.series).flat().map(point=>[point.pulse,point.usdCents])),checked=new Set<number>();
 for(const points of Object.values(next.series))for(const point of points)if(!checked.has(point.pulse)){const prior=old.get(point.pulse);expect(point.usdCents).toBe(prior===undefined?exact.at(point.pulse):(BigInt(prior)+BigInt(added.at(point.pulse))).toString());checked.add(point.pulse);}
 expect(next.series['1D'].at(-1)?.usdCents).toBe(exact.coverage.usdCents);expect(samples).toBeLessThan(20);expect(next.summary.shareCapitalization?.covered).toBe(22);
});

it.each(['originalDigest','assetId','id'] as const)('refuses reuse after an existing %s binding changes',async key=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const item=after.items[0],changed={...item,[key]:key==='originalDigest'?'f'.repeat(64):item[key]+'-other'};
 if(key!=='originalDigest'){changed.valuationBinding={...changed.valuationBinding!,itemId:changed.id,assetId:changed.assetId};changed.shareInventory={...changed.shareInventory!,marketItemId:changed.id,assetId:changed.assetId};}
 after.items[0]=changed;let samples=0;
 const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before}}))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1,capitalization:true}))!;
 expect(next.summary).toEqual(full.summary);expect(samples).toBeGreaterThan(20);
});

it('advances while the new Original awaits inventory, then adds its quote without replaying held history',async()=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const pending={...after,items:after.items.map((item,index)=>index?{...item,shareInventory:undefined}:item)};
 let pendingSamples=0;const admitted=(await buildMarketHistory(source,previous,undefined,async()=>{pendingSamples++;},{catalog:pending,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before}}))!;
 expect(admitted.summary.shareCapitalization).toMatchObject({listed:2,covered:1,complete:false,outstandingShareQuantityMicro:'1000000'});expect(pending.items[1].shareInventory).toBeUndefined();expect(parseMarketHistory(admitted)).toBe(admitted);expect(pendingSamples).toBeLessThan(20);
 let quoteSamples=0;const quoted=(await buildMarketHistory(source,admitted,undefined,async()=>{quoteSamples++;},{catalog:after,pulse:pulse+2,capitalization:true,priorInput:{source,catalog:pending}}))!;
 expect(quoted.membershipSha256).toBe(admitted.membershipSha256);expect(quoted.summary.shareCapitalization).toMatchObject({listed:2,covered:2,outstandingShareQuantityMicro:'1000000'});expect(quoteSamples).toBeLessThan(20);
 const scoped=globalMarketCapitalizationInputs(source,after),model=currentMarketDisplayModel(scoped.source,scoped.catalog,pulse+2),full=prepareGlobalShareCapitalization(model,after);expect(quoted.series['1D'].at(-1)?.usdCents).toBe(full.coverage.usdCents);expect(parseMarketHistory(quoted)).toBe(quoted);
 const added=prepareGlobalShareCapitalization({...model,valueRows:model.valueRows.filter(row=>row.source!=='sports-economy-card'),unpricedSealedBirths:undefined,sportsHistorySnapshot:undefined,sportsHistoryEvaluationPulse:undefined,sourceEvaluation:undefined,undatedHistory:undefined},{...after,items:[after.items[1]]}),old=new Map(Object.values(admitted.series).flat().map(point=>[point.pulse,point.usdCents]));
 for(const points of Object.values(quoted.series))for(const point of points){const known=old.get(point.pulse);expect(point.usdCents).toBe(known===undefined?full.at(point.pulse):(BigInt(known)+BigInt(added.at(point.pulse))).toString());}
});
it('accepts first genuine quantities for an already listed modeled Original as a contribution addition',async()=>{
 const {source,after}=fixture(),pending={...after,items:after.items.map((item,index)=>index?{...item,shareInventory:undefined}:item)};
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:pending,pulse,capitalization:true}))!;
 let samples=0;const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:pending}}))!;
 expect(next.membershipSha256).toBe(previous.membershipSha256);expect(next.summary.shareCapitalization?.covered).toBe(2);expect(next.summary.serverPulse).toBe(pulse+1);expect(samples).toBeLessThan(20);
});
