import {expect,it} from 'vitest';
import {marketCapUsdAtPulse,marketPulseTime,publicSportsQuoteAtPulse} from '../src/receiz/market-projection/project';
import type {MarketCapSource,MarketValueRow} from '../src/receiz/market-projection/source';
import {publicSportsSealedCopies} from '../src/receiz/market-projection/sealed-copies';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {publicSportsValueRow} from '../src/receiz/market-projection/source';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {mergeMarketCopyObservations,validMarketCopyObservationTape} from '../src/receiz/market-projection/copy-observations';
const at=(pulse:number)=>new Date(marketPulseTime(pulse)).toISOString();
const copy=(id:string,pulse:number,birth:number,current:number)=>({collectibleId:`rsc_${id.repeat(16)}`,claimHash:id.repeat(64),sealedAt:at(pulse),birthUsdValue:birth,proofValueUsd:current,currentValueUsd:current,valueHistory:[{at:at(pulse),usdValue:birth,basis:'sealed-birth' as const},{at:at(300),usdValue:current,basis:'source-observation' as const}]});
const row:MarketValueRow={id:'card:aggregate',source:'sports-economy-card',seed:'a'.repeat(64),baseUsdValue:200,birthUsdValue:200,marketUsdValue:250,proofTotalValueUsd:300,scoreDelta:90,sealedCopies:[copy('a',100,10,100),copy('b',200,20,200)]};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:'a'.repeat(64),generatedAt:at(300),firstIssuancePulse:0,serverPulse:400,currentUsd:300,cardsInCirculation:2,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row]};
it('adds each copy at its own seal with its birth value and holds the last actual dated value',()=>{
 expect(marketCapUsdAtPulse(source,99)).toBe(0);expect(marketCapUsdAtPulse(source,100)).toBe(10);
 expect(marketCapUsdAtPulse(source,199)).toBe(10);expect(marketCapUsdAtPulse(source,200)).toBe(30);
 expect(marketCapUsdAtPulse(source,299)).toBe(30);expect(marketCapUsdAtPulse(source,300)).toBe(300);expect(marketCapUsdAtPulse(source,350)).toBe(300);
});
it('does not backcast mutable current valuation operands before their observation',()=>{
 const changed={...source,valueRows:[{...row,baseUsdValue:9000,scoreDelta:999,marketUsdValue:9900}]};
 expect(marketCapUsdAtPulse(changed,299)).toBe(30);
 const model={baseUsdValue:100,birthUsdValue:10,marketUsdValue:110,scoreDelta:1,seed:'a'.repeat(64)};
 const live={...source,valueRows:[{...row,sealedCopies:[{...copy('a',100,10,100),valuationPulse:300,valuation:model}]}]};
 expect(marketCapUsdAtPulse(live,299)).toBe(10);expect(marketCapUsdAtPulse(live,300)).toBe(100);expect(marketCapUsdAtPulse(live,301)).toBeGreaterThan(100);
});
it('omits undated cards from historical totals instead of assigning the capture date as their birth',()=>{
 expect(marketCapUsdAtPulse({...source,valueRows:[{...row,sealedCopies:undefined}]},200)).toBe(0);
});
it('retains undated capitalization as an aggregate observation at its original capture pulse',async()=>{
 const legacy={...source,generatedAt:at(300),serverPulse:300,currentUsd:300,valueRows:[{...row,sealedCopies:undefined}]};
 const history=(await buildMarketHistory(legacy,null,undefined,undefined,{catalog:null,pulse:400}))!;
 expect(history.summary.undatedHistory).toMatchObject({rows:1,observationPulse:300,observationUsd:300,sourceReportedTotalUsd:300,modelPulse:300});
 expect(history.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('30000');
 expect(history.series.ALL.filter(point=>point.pulse<300).every(point=>point.usdCents==='0')).toBe(true);
});
it('subtracts newly dated current members from an original aggregate without double counting them',async()=>{
 const first={...row,id:`card:${'a'.repeat(64)}`,seed:'a'.repeat(64),sealedCopies:undefined,baseUsdValue:100,proofTotalValueUsd:100},second={...first,id:`other:${'b'.repeat(64)}`,seed:'b'.repeat(64)};
 const legacy={...source,generatedAt:at(300),serverPulse:300,currentUsd:200,valueRows:[first,second],sportsCardsPriced:2};
 const dated={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:first.seed,cardId:'card',athlete:'Dated card',sport:'baseball',issuedCount:1,vaultCount:1,pricedCount:1,liveValueUsd:100,totalValueUsd:100,proofValueUsd:100,proofTotalValueUsd:100,sealedCopies:[copy('a',300,100,100)]};
 const catalog=mergePublicSports(parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(350),cards:[{...dated,valuationRow:publicSportsValueRow(dated)}]});
 const history=(await buildMarketHistory(legacy,null,undefined,undefined,{catalog,pulse:400}))!;
 expect(history.summary.undatedHistory?.observationUsd).toBe(100);expect(history.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('20000');
});
it('retains an actual per-copy observation when a later feed adds another sealed copy',async()=>{
 const a=copy('a',100,10,100),first={...source,serverPulse:300,currentUsd:100,cardsInCirculation:1,valueRows:[{...row,sealedCopies:[a]}]};
 const retained=(await buildMarketHistory(first))!;
 const nextA={...a,currentValueUsd:200,valueHistory:[a.valueHistory[0],{at:at(350),usdValue:200,basis:'source-observation' as const}]};
 const b={...copy('b',330,50,50),valueHistory:[{at:at(330),usdValue:50,basis:'sealed-birth' as const},{at:at(350),usdValue:50,basis:'source-observation' as const}]};
 const updated=(await buildMarketHistory({...first,generatedAt:at(350),serverPulse:350,currentUsd:250,cardsInCirculation:2,valueRows:[{...row,sealedCopies:[nextA,b]}]},retained))!;
 expect(updated.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('10000');expect(updated.series.ALL.find(point=>point.pulse===330)?.usdCents).toBe('15000');expect(updated.series.ALL.at(-1)?.usdCents).toBe('25000');
});
it('retains an observation’s canonical valuation pulse when its timestamp falls inside that pulse',async()=>{
 const model={baseUsdValue:100,birthUsdValue:10,marketUsdValue:100,scoreDelta:0,seed:'a'};
 const a={...copy('a',100,10,100),valuationPulse:300,valuation:model,valueHistory:[copy('a',100,10,100).valueHistory[0],{at:new Date(marketPulseTime(300)+1000).toISOString(),usdValue:100,basis:'source-observation' as const}]};
 const first={...source,serverPulse:300,currentUsd:100,cardsInCirculation:1,valueRows:[{...row,sealedCopies:[a]}]},retained=(await buildMarketHistory(first))!;
 const nextA={...a,currentValueUsd:200,valuationPulse:350,valuation:{...model,baseUsdValue:200},valueHistory:[a.valueHistory[0],{at:new Date(marketPulseTime(350)+1000).toISOString(),usdValue:200,basis:'source-observation' as const}]};
 const b={...copy('b',330,50,50),valueHistory:[{at:at(330),usdValue:50,basis:'sealed-birth' as const},{at:at(350),usdValue:50,basis:'source-observation' as const}]};
 const updated=(await buildMarketHistory({...first,generatedAt:at(350),serverPulse:350,currentUsd:250,cardsInCirculation:2,valueRows:[{...row,sealedCopies:[nextA,b]}]},retained))!;
 expect(updated.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('10000');
 expect(updated.copyObservations?.copies[0].observations[0]).toMatchObject({pulse:300});
});
it('uses retained per-copy observations when deriving a mixed undated aggregate',async()=>{
 const a=copy('a',100,10,100),undated={...row,id:`unknown:${'c'.repeat(64)}`,seed:'c'.repeat(64),sealedCopies:undefined};
 const original={...source,serverPulse:300,currentUsd:200,sportsCardsPriced:2,valueRows:[{...row,id:`card:${a.claimHash}`,sealedCopies:[a]},undated]};
 const retained=(await buildMarketHistory(original,null,undefined,undefined,{catalog:null,pulse:300}))!;
 const nextA={...a,currentValueUsd:200,valueHistory:[a.valueHistory[0],{at:at(350),usdValue:200,basis:'source-observation' as const}]},b={...copy('b',330,50,50),valueHistory:[{at:at(330),usdValue:50,basis:'sealed-birth' as const},{at:at(350),usdValue:50,basis:'source-observation' as const}]};
 const card={collectibleId:a.collectibleId,claimHash:a.claimHash,cardId:'card',athlete:'A and B',sport:'baseball',issuedCount:2,vaultCount:2,pricedCount:2,liveValueUsd:200,totalValueUsd:250,proofValueUsd:200,proofTotalValueUsd:250,sealedCopies:[nextA,b]};
 const catalog=mergePublicSports(parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(350),cards:[{...card,valuationRow:publicSportsValueRow(card)}]});
 const updated=(await buildMarketHistory(original,retained,undefined,undefined,{catalog,pulse:400}))!;
 expect(updated.summary.undatedHistory?.observationUsd).toBe(100);expect(updated.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('20000');
});
it('validates bounded observation tapes and binds retained values to the exact sealed copy',async()=>{
 const history=(await buildMarketHistory({...source,serverPulse:300,currentUsd:100,cardsInCirculation:1,valueRows:[{...row,sealedCopies:[copy('a',100,10,100)]}]}))!,tape=history.copyObservations!;
 expect(validMarketCopyObservationTape(tape)).toBe(true);
 for(const bad of [{...tape,copies:[tape.copies[0],tape.copies[0]]},{...tape,copies:[{...tape.copies[0],observations:[{at:at(300),usdValue:-1}]}]},{...tape,copies:[{...tape.copies[0],observations:[{at:at(300),usdValue:100,pulse:-1}]}]},{...tape,copies:[{...tape.copies[0],observations:Array.from({length:33},(_,index)=>({at:at(300+index),usdValue:100}))}]}])expect(()=>parseMarketHistory({...history,copyObservations:bad})).toThrow();
 const unrelated={...tape,copies:[{...tape.copies[0],claimHash:'c'.repeat(64),observations:[{at:at(300),usdValue:999}]}]};
 const merged=mergeMarketCopyObservations({...source,valueRows:[{...row,sealedCopies:[{...copy('a',100,10,200),valueHistory:[{at:at(100),usdValue:10,basis:'sealed-birth'},{at:at(350),usdValue:200,basis:'source-observation'}]}]}]},unrelated);
 expect(marketCapUsdAtPulse(merged.source,300)).toBe(10);
});
it('rejects duplicate copies, invalid dated values and unsafe timing/model operands',()=>{
 const valid=copy('a',100,10,100);
 expect(publicSportsSealedCopies([valid,valid])).toBeUndefined();
 for(const bad of [{...valid,sealedAt:'invalid'},{...valid,birthUsdValue:-1},{...valid,valueHistory:[{at:at(99),usdValue:10,basis:'sealed-birth'}]},{...valid,valuationPulse:300,valuation:{baseUsdValue:100,birthUsdValue:10,marketUsdValue:100,scoreDelta:NaN,seed:'a'}}])expect(publicSportsSealedCopies([bad])).toBeUndefined();
});
it('preserves completed dated samples when a later source supplies a new current observation',async()=>{
 const before={...source,serverPulse:300},retained=(await buildMarketHistory(before))!;
 const updatedRow={...row,sealedCopies:row.sealedCopies!.map(copy=>({...copy,currentValueUsd:copy.currentValueUsd*2,valueHistory:[copy.valueHistory![0],{at:at(350),usdValue:copy.currentValueUsd*2,basis:'source-observation' as const}]}))};
 const updated=(await buildMarketHistory({...source,generatedAt:at(350),serverPulse:350,currentUsd:600,valueRows:[updatedRow]},retained))!;
 expect(updated.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('30000');expect(updated.series.ALL.at(-1)?.usdCents).toBe('60000');
});
it('places a newly supplied observation at its source pulse when local evaluation is already later',async()=>{
 const retained=(await buildMarketHistory({...source,serverPulse:300}))!;
 const updatedRow={...row,sealedCopies:row.sealedCopies!.map(copy=>({...copy,currentValueUsd:copy.currentValueUsd*2,valueHistory:[copy.valueHistory![0],{at:at(350),usdValue:copy.currentValueUsd*2,basis:'source-observation' as const}]}))};
 const refreshed={...source,generatedAt:at(350),serverPulse:350,currentUsd:600,valueRows:[updatedRow]};
 const updated=(await buildMarketHistory(refreshed,retained,undefined,undefined,{catalog:null,pulse:400}))!;
 for(const points of Object.values(updated.series)){
  expect(points.find(point=>point.pulse===300)?.usdCents).toBe('30000');
  expect(points.find(point=>point.pulse===350)?.usdCents).toBe('60000');
  expect(points.at(-1)).toMatchObject({pulse:400,usdCents:'60000'});
  expect(points.length).toBeLessThanOrEqual(96);
 }
});
it.each([400,450])('replaces projected samples after a delayed observation while preserving earlier dated records at pulse %s',async(evaluation)=>{
 const retained=(await buildMarketHistory(source))!;
 const updatedRow={...row,sealedCopies:row.sealedCopies!.map(copy=>({...copy,currentValueUsd:copy.currentValueUsd*2,valueHistory:[copy.valueHistory![0],{at:at(350),usdValue:copy.currentValueUsd*2,basis:'source-observation' as const}]}))};
 const refreshed={...source,generatedAt:at(350),serverPulse:350,currentUsd:600,valueRows:[updatedRow]};
 const updated=(await buildMarketHistory(refreshed,retained,undefined,undefined,{catalog:null,pulse:evaluation}))!;
 for(const points of Object.values(updated.series)){
  expect(points.find(point=>point.pulse===300)?.usdCents).toBe('30000');
  expect(points.find(point=>point.pulse===350)?.usdCents).toBe('60000');
  expect(points.find(point=>point.pulse===400)?.usdCents).toBe('60000');
  expect(points.at(-1)).toMatchObject({pulse:evaluation,usdCents:'60000'});
 }
});
it('uses the exact representative copy for its public card quote rather than another copy’s aggregate base',()=>{
 expect(publicSportsQuoteAtPulse(row,300)).toBe(100);
});
it('matches the host’s per-copy cents rounding when continuing after an observed pulse',()=>{
 // The host rounds the motion's $0.0101 minimum-lift value to $0.01 per copy.
 const tiny={...copy('a',100,.01,.01),valuationPulse:300,valuation:{baseUsdValue:.01,birthUsdValue:.01,marketUsdValue:.01,scoreDelta:0,seed:'tiny-card'}};
 expect(publicSportsQuoteAtPulse({...row,sealedCopies:[tiny]},301)).toBe(.01);
});
it('retains exact seal and dated observation coordinates among bounded chart samples',async()=>{
 const shifted={...source,valueRows:[{...row,sealedCopies:[copy('a',123,10,100),copy('b',217,20,200)]}]};
 const history=(await buildMarketHistory(shifted))!;
 expect(history.series.ALL.find(point=>point.pulse===123)?.usdCents).toBe('1000');expect(history.series.ALL.find(point=>point.pulse===217)?.usdCents).toBe('3000');expect(history.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('30000');expect(history.series.ALL.length).toBeLessThanOrEqual(96);
});
