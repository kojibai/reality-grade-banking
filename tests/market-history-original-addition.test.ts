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

it('adds late-born unit Originals without replaying held samples and retains zero-delta point identities',async()=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse}))!;
 after.items[1]={...after.items[1],pulse:String(pulse+1),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse+1},shareInventory:undefined};
 const saved=JSON.stringify(previous),birth=Number(after.items[1].pulse),zero=previous.series.ALL.find(point=>point.pulse<birth)!;
 let samples=0;
 const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before},requireRetained:true} as Parameters<typeof buildMarketHistory>[4]))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1}))!;
 expect(samples).toBeLessThan(20);
 expect(next.series.ALL.find(point=>point.pulse===zero.pulse)).toBe(zero);
 expect(next.summary).toEqual(full.summary);
 const model=currentMarketDisplayModel(source,after,pulse+1),{marketAssetUsdAtPulse}=await import('../src/receiz/market-projection/project'),added=model.valueRows.find(row=>row.marketItem?.id===after.items[1].id)!;
 const old=new Map(Object.values(previous.series).flat().map(point=>[point.pulse,point]));
 for(const points of Object.values(next.series))for(const point of points){const held=old.get(point.pulse);if(held){const delta=point.pulse<birth?0:Math.round(marketAssetUsdAtPulse(added,point.pulse)*100);expect(point.usdCents).toBe(String(BigInt(held.usdCents)+BigInt(delta)));if(!delta)expect(point).toBe(held);}}
 expect(JSON.stringify(previous)).toBe(saved);expect(parseMarketHistory(next)).toBe(next);
});

it.each(['before','at'] as const)('refuses unit additions born %s the retained head and preserves canonical fallback with sub-cent Sports',async birth=>{
 const {source,before,after}=fixture(),{parseMarketCapSource}=await import('../src/receiz/market-projection/source'),{marketPulseTime}=await import('../src/receiz/market-projection/project');
 source.valueRows.push({id:'sports-test',source:'sports-economy-card',seed:'sports-test',baseUsdValue:0.005,birthUsdValue:0.005,marketUsdValue:0.005,proofTotalValueUsd:0.005,scoreDelta:0,sealedCopies:[{collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:'a'.repeat(64),sealedAt:new Date(marketPulseTime(source.firstIssuancePulse)).toISOString(),birthUsdValue:0.005,proofValueUsd:0.005,currentValueUsd:0.005}]});
 source.sportsCardsPriced=1;source.cardsInCirculation=1;expect(parseMarketCapSource({ok:true,marketCapProjection:source})).toBe(source);
 after.items[1]={...after.items[1],shareInventory:undefined,...(birth==='at'?{pulse:String(pulse),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse}}:{})};
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse}))!;let retainedSamples=0;
 await expect(buildMarketHistory(source,previous,undefined,async()=>{retainedSamples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before},requireRetained:true})).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 expect(retainedSamples).toBe(0);
 let rebuiltSamples=0;
 const rebuilt=(await buildMarketHistory(source,previous,undefined,async()=>{rebuiltSamples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before}}))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1}))!;
 expect(rebuilt).toEqual(full);expect(rebuiltSamples).toBeGreaterThan(20);
});

it.each(['model','binding','context','basis'] as const)('refuses required unit-prefix retention before sampling after a prior %s change',async change=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse}))!;
 after.items[1]={...after.items[1],pulse:String(pulse+1),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse+1},shareInventory:undefined};
 let nextSource=source;
 if(change==='model')after.items[0]={...after.items[0],livePulseSeed:{...after.items[0].livePulseSeed!,creatorVerified:!after.items[0].livePulseSeed!.creatorVerified}};
 if(change==='binding')after.items[0]={...after.items[0],originalDigest:'f'.repeat(64)};
 if(change==='context')nextSource={...source,sourceEvaluation:{pulse:source.serverPulse,usdValue:source.currentUsd,sourceHash:'f'.repeat(64)}};
 let samples=0;
 await expect(buildMarketHistory(nextSource,change==='basis'?{...previous,basisSha256:'f'.repeat(64)}:previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before},requireRetained:true} as Parameters<typeof buildMarketHistory>[4])).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 expect(samples).toBe(0);
});

it.each([false,true])('requires an existing reusable history before sampling when retention is requested (shares=%s)',async capitalization=>{
 const {source,before,after}=fixture();let samples=0;
 await expect(buildMarketHistory(source,null,undefined,async()=>{samples++;},{catalog:after,pulse,capitalization,priorInput:{source,catalog:before},requireRetained:true} as Parameters<typeof buildMarketHistory>[4])).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 expect(samples).toBe(0);
});

it('refuses required share-prefix retention when an old release changes without weakening ordinary fallback',async()=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 after.items[0]={...after.items[0],shareInventory:{...after.items[0].shareInventory!,releaseCapitalization:{...after.items[0].shareInventory!.releaseCapitalization!,availableShareQuantityMicro:'9000000'}}};
 let samples=0;
 await expect(buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:before},requireRetained:true} as Parameters<typeof buildMarketHistory>[4])).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 expect(samples).toBe(0);
});


it('refuses required unit-prefix retention after an existing Sports row changes',async()=>{
 const sports=(await import('../public/receiz-public-sports.json')).default,{mergePublicSports}=await import('../src/receiz/public-sports');
 const {source,before:originals,after:added}=fixture(),input={...sports,cards:sports.cards.slice(0,1)},before=mergePublicSports(originals,input),after=mergePublicSports(added,input);
 after.items[1]={...after.items[1],pulse:String(pulse+1),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse+1},shareInventory:undefined};
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse}))!;
 after.items=after.items.map(item=>item.sportsValuation?{...item,sportsValuation:{...item.sportsValuation,marketUsdValue:item.sportsValuation.marketUsdValue+1}}:item);
 let samples=0;
 await expect(buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before},requireRetained:true})).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 expect(samples).toBe(0);
});

it('retains an unchanged unit basis when required and preserves the ordinary rebuild fallback for changed models',async()=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse}))!;
 after.items[1]={...after.items[1],pulse:String(pulse+1),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse+1},shareInventory:undefined};
 let retainedSamples=0;
 const retained=(await buildMarketHistory(source,previous,undefined,async()=>{retainedSamples++;},{catalog:before,pulse:pulse+1,requireRetained:true}))!;
 expect(retained.summary.serverPulse).toBe(pulse+1);expect(retainedSamples).toBeLessThan(20);
 after.items[0]={...after.items[0],livePulseSeed:{...after.items[0].livePulseSeed!,creatorVerified:!after.items[0].livePulseSeed!.creatorVerified}};
 let rebuiltSamples=0;
 const rebuilt=(await buildMarketHistory(source,previous,undefined,async()=>{rebuiltSamples++;},{catalog:after,pulse:pulse+1,priorInput:{source,catalog:before}}))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1}))!;
 expect(rebuilt).toEqual(full);expect(rebuiltSamples).toBeGreaterThan(20);
});


it.each([false,true])('retains numeric history across creator key labels while appending an Original: shares=%s',async capitalization=>{
 const {source,before,after}=fixture(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization}))!;
 after.items[1]={...after.items[1],pulse:String(pulse+1),livePulseSeed:{...after.items[1].livePulseSeed!,claimPulse:pulse+1}};
 const existing=after.items[0];after.items[0]={...existing,livePulseSeed:{...existing.livePulseSeed!,userPhiKey:'11111111-1111-4111-8111-111111111111:'+existing.assetId}};
 let samples=0;const next=(await buildMarketHistory(source,previous,undefined,async()=>{samples++;},{catalog:after,pulse:pulse+1,capitalization,priorInput:{source,catalog:before},requireRetained:true}))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog:after,pulse:pulse+1,capitalization}))!;
 expect(next.summary).toEqual(full.summary);
 for(const period of Object.keys(next.series) as (keyof typeof next.series)[]){const exact=new Map(full.series[period].map(point=>[point.pulse,point.usdCents]));for(const point of next.series[period])if(exact.has(point.pulse))expect(point.usdCents).toBe(exact.get(point.pulse));}
 expect(samples).toBeLessThan(20);
 const relabelled={...after,items:after.items.map(item=>({...item,livePulseSeed:{...item.livePulseSeed!,userPhiKey:'chosen.receiz.id:'+item.assetId}}))};
 let restoredSamples=0;const restored=(await buildMarketHistory(source,next,undefined,async()=>{restoredSamples++;},{catalog:relabelled,pulse:pulse+2,capitalization,priorInput:{source,catalog:after},requireRetained:true}))!;
 const old=new Map(Object.values(next.series).flat().map(point=>[point.pulse,point.usdCents]));for(const points of Object.values(restored.series))for(const point of points)if(old.has(point.pulse))expect(point.usdCents).toBe(old.get(point.pulse));
 expect(restoredSamples).toBeLessThan(20);
});


it('updates the current share quote at an already retained closing pulse and preserves every earlier sample',async()=>{
 const {source,before}=fixture(),item=before.items[0],start=BigInt(pulse-1)*1000000n;
 const closing={kaiUPulse:String(start+100n),unitPriceUsdCents:'100',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'1000000'};
 const inventory={...item.shareInventory!,observedAtKaiUPulse:String(start+200n),releaseCapitalization:{...item.shareInventory!.releaseCapitalization!,kaiUPulse:String(start-2000000n)},capitalizationHistory:[closing]};
 before.items[0]={...item,shareInventory:inventory};
 const previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:before,pulse,capitalization:true}))!;
 const catalog={...before,items:[{...before.items[0],shareInventory:{...inventory,observedAtKaiUPulse:String(start+300n),availableShareQuantityMicro:'2000000',capitalizationHistory:[closing,{kaiUPulse:String(start+300n),unitPriceUsdCents:'100',outstandingShareQuantityMicro:inventory.outstandingShareQuantityMicro,availableShareQuantityMicro:'2000000'}]}}]};
 const next=(await buildMarketHistory(source,previous,undefined,undefined,{catalog,pulse,capitalization:true,priorInput:{source,catalog:before},requireRetained:true}))!;
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog,pulse,capitalization:true}))!;
 expect(next.summary).toEqual(full.summary);expect(next.series.ALL.at(-1)).toEqual(full.series.ALL.at(-1));
 const old=new Map(Object.values(previous.series).flat().map(point=>[point.pulse,point.usdCents]));for(const points of Object.values(next.series))for(const point of points)if(point.pulse<pulse&&old.has(point.pulse))expect(point.usdCents).toBe(old.get(point.pulse));
 const altered={...catalog,items:[{...catalog.items[0],shareInventory:{...catalog.items[0].shareInventory,releaseCapitalization:{...inventory.releaseCapitalization,availableShareQuantityMicro:'9000000'}}}]};
 await expect(buildMarketHistory(source,previous,undefined,undefined,{catalog:altered,pulse,capitalization:true,priorInput:{source,catalog:before},requireRetained:true})).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
});
