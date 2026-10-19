import {expect,it} from 'vitest';
import {marketCapUsdAtPulse,marketRowsUsdAtPulse,marketPulseTime} from '../src/receiz/market-projection/project';
import {currentMarketDisplayModel} from '../src/receiz/market-projection/catalog-source';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {parseMarketCapSource,readPublicSportsValueRow,retainMarketSourceHistory,type MarketCapSource,type MarketValueRow} from '../src/receiz/market-projection/source';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {readFileSync} from 'node:fs';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
import {mergePublicSports,retainPublicSportsInput} from '../src/receiz/public-sports';
import {marketPulseAtOrAfterTime} from '../src/receiz/market-projection/sealed-copies';
import {curatePublicCapitalization} from '../server/public-market';
const at=(p:number)=>new Date(marketPulseTime(p)).toISOString(),hash='a'.repeat(64);
const birth=(id:string,p:number,value:number)=>({collectibleId:`rsc_${id.repeat(16)}`,claimHash:id.repeat(64),sealedAt:at(p),birthUsdValue:value});
const group={sport:'baseball' as const,cardId:'card',rarity:'Common'};
const observation={at:at(200),usdValue:100,scope:'single-copy' as const,pricedCopies:1,vaultCopies:1,sourceHash:hash,group,collectibleId:birth('a',100,10).collectibleId,claimHash:hash,model:{baseUsdValue:100,birthUsdValue:100,marketUsdValue:101,proofTotalValueUsd:100,scoreDelta:0,seed:hash}};
const row:MarketValueRow={id:`card:${hash}`,source:'sports-economy-card',seed:hash,sportsGroup:group,baseUsdValue:100,birthUsdValue:100,marketUsdValue:101,proofTotalValueUsd:100,scoreDelta:0,sealedBirths:[birth('a',100,10)],historyObservation:observation};
const snapshot={at:at(200),totalUsd:100,sourceHash:hash,groups:1,singleCopyGroups:1,aggregateGroups:0,unpricedGroups:0};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:hash,generatedAt:at(200),firstIssuancePulse:0,serverPulse:400,currentUsd:110,cardsInCirculation:1,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row],sportsHistorySnapshot:snapshot,sportsHistoryEvaluationPulse:450};
it('places captured performance at its actual source date instead of the later evaluation pulse',async()=>{
 const model=currentMarketDisplayModel(source,null,500);
 expect(marketCapUsdAtPulse(model,99)).toBe(0);expect(marketCapUsdAtPulse(model,100)).toBe(10);expect(marketCapUsdAtPulse(model,199)).toBe(10);expect(marketCapUsdAtPulse(model,200)).toBe(100);
 for(const p of [201,399,400,401,499])expect(marketCapUsdAtPulse(model,p)).toBe(marketRowsUsdAtPulse(source.valueRows,p));
 expect(model.currentUsd).toBe(marketRowsUsdAtPulse(source.valueRows,500));expect(model.undatedHistory).toBeUndefined();expect(model.sourceEvaluation).toMatchObject({pulse:400,usdValue:110,sourceHash:hash});
 const changed=currentMarketDisplayModel({...source,valueRows:[{...row,baseUsdValue:900,proofTotalValueUsd:900}]},null,500);expect(marketCapUsdAtPulse(changed,201)).toBe(marketCapUsdAtPulse(model,201));
 const history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:null,pulse:500}))!;
 expect(history.observationPulses).toContain(200);expect(history.observationPulses).not.toContain(400);expect(history.series.ALL.find(p=>p.pulse===200)?.usdCents).toBe('10000');
});
it('keeps a multi-copy observation aggregate and adds later copies only at their own seals',async()=>{
 const {collectibleId,claimHash,...aggregate}=observation,multi={...row,sealedBirths:[birth('a',100,10),birth('b',150,20),birth('c',250,30)],historyObservation:{...aggregate,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2,usdValue:200}},input={...source,valueRows:[multi],cardsInCirculation:3,sportsHistorySnapshot:{...snapshot,totalUsd:200,singleCopyGroups:0,aggregateGroups:1}};
 const model=currentMarketDisplayModel(input,null,500);
 expect(marketCapUsdAtPulse(model,149)).toBe(10);expect(marketCapUsdAtPulse(model,150)).toBe(30);expect(marketCapUsdAtPulse(model,200)).toBe(200);
 expect(marketCapUsdAtPulse(model,249)).toBe(marketRowsUsdAtPulse([multi],249));expect(marketCapUsdAtPulse(model,250)).toBeCloseTo(marketRowsUsdAtPulse([multi],250)+30,4);
 expect(model.currentUsd).toBe(marketRowsUsdAtPulse([multi],500));
 const history=(await buildMarketHistory(input,null,undefined,undefined,{catalog:null,pulse:500}))!;
 expect(history.series.ALL.some(point=>point.pulse===450)).toBe(true);expect(history.observationPulses).not.toContain(450);
});
it('rejects another copy, conflicting model seed and mismatched aggregate scope before valuation',()=>{
 const {collectibleId,claimHash,...aggregate}=observation;
 const wrong=[{...observation,collectibleId:birth('b',100,10).collectibleId},{...observation,claimHash:'b'.repeat(64),model:{...observation.model,seed:'b'.repeat(64)}},{...observation,model:{...observation.model,seed:'b'.repeat(64)}},...['sport','cardId','rarity'].map(key=>({...aggregate,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2,group:{...group,[key]:key==='sport'?'soccer':'other'}})),{...aggregate,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2,model:{...observation.model,seed:'b'.repeat(64)}},{...aggregate,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2,group:undefined},{...observation,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2}];
 for(const historyObservation of wrong){const foreign={...row,historyObservation};expect(readPublicSportsValueRow(foreign,hash)).toBeUndefined();expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...source,valueRows:[foreign]}})).toThrow();expect(marketRowsUsdAtPulse([foreign as MarketValueRow],200,true)).toBe(10);}
});
it('revalidates reused source objects for each build instead of retaining a stale binding',async()=>{
 const mutable=structuredClone(source),first=(await buildMarketHistory(mutable))!;
 expect(first.series.ALL.find(point=>point.pulse===200)?.usdCents).toBe('10000');
 mutable.valueRows[0].historyObservation!.collectibleId=birth('b',100,10).collectibleId;
 const changed=(await buildMarketHistory(mutable))!;
 expect(changed.series.ALL.find(point=>point.pulse===200)?.usdCents).toBe('1000');
});
it('retains a dated observation across a representative change only within the same known group and copies',()=>{
 const next={...row,id:`card:${'b'.repeat(64)}`,seed:'b'.repeat(64),sealedBirths:[birth('a',100,10),birth('b',150,20)],historyObservation:undefined},base=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0},publicOriginals:[]}});
 const card={collectibleId:birth('b',150,20).collectibleId,claimHash:next.seed,sport:'baseball',rarity:'Common',athlete:'Card',issuedCount:2,vaultCount:2,pricedCount:2,liveValueUsd:100,totalValueUsd:200,sealedBirths:next.sealedBirths,valuationRow:next};
 const catalog=mergePublicSports(base,{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(350),cards:[card]}),model=currentMarketDisplayModel(source,catalog,500);
 expect(model.valueRows).toHaveLength(1);expect(model.valueRows[0].seed).toBe(next.seed);expect(model.valueRows[0].historyObservation).toEqual(observation);expect(marketCapUsdAtPulse(model,200)).toBe(100);
 const foreign:PublicMarketCatalog={...catalog,items:catalog.items.map(item=>({...item,sportsValuation:{...next,sportsGroup:{...group,rarity:'Rare'}}}))};
 expect(currentMarketDisplayModel(source,foreign,500).valueRows[0].historyObservation).toBeUndefined();
 const poisoned=mergePublicSports(base,{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(350),cards:[{...card,valuationRow:{...row,historyObservation:undefined},claimHash:hash,historyObservation:{...observation,collectibleId:birth('c',100,10).collectibleId}}]});
 expect(poisoned.items[0].sportsValuation?.historyObservation).toBeUndefined();
 const conflict={...row,sportsGroup:{...group,rarity:'Rare'},historyObservation:undefined};
 expect(retainMarketSourceHistory({...source,valueRows:[conflict]},source).valueRows[0].historyObservation).toBeUndefined();
 const held={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(200),cards:[{...card,claimHash:hash,valuationRow:row,historyObservation:observation}]},fresh={...held,generatedAt:at(350),cards:[{...card,claimHash:hash,valuationRow:conflict,historyObservation:undefined}]};
 const retained=retainPublicSportsInput(held,fresh) as typeof held;expect(retained.cards[0].historyObservation).toBeUndefined();expect(retained.cards[0].valuationRow.historyObservation).toBeUndefined();
});
it('prefers complete dated full-copy values over aggregate snapshot coverage',()=>{
 const full={...birth('a',100,10),proofValueUsd:300,currentValueUsd:300,valueHistory:[{at:at(100),usdValue:10,basis:'sealed-birth' as const},{at:at(300),usdValue:300,basis:'source-observation' as const}]},input={...source,valueRows:[{...row,sealedCopies:[full]}]},model=currentMarketDisplayModel(input,null,500);
 expect(marketCapUsdAtPulse(model,200)).toBe(100);expect(marketCapUsdAtPulse(model,299)).toBe(marketRowsUsdAtPulse([row],299));expect(marketCapUsdAtPulse(model,300)).toBe(300);
});
it('rejects malformed or inconsistent captured pricing metadata before cache or worker use',async()=>{
 const history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:null,pulse:500}))!;
 for(const bad of [{...snapshot,totalUsd:-1},{...snapshot,groups:2},{...snapshot,at:'invalid'},{...snapshot,sourceHash:'invalid'}]){
  expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...source,sportsHistorySnapshot:bad}})).toThrow();
  expect(()=>parseMarketHistory({...history,summary:{...history.summary,sportsHistorySnapshot:bad}})).toThrow();
 }
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...source,valueRows:[{...row,historyObservation:{...observation,scope:'sports-group'}}]}})).toThrow();
});
it('retains immutable dated source metadata across a newer feed that only supplies prices',()=>{
 const later= birth('b',450,20),held={...source,unpricedSealedBirths:[later]},incoming={...source,serverPulse:500,currentUsd:220,sportsHistorySnapshot:undefined,sportsHistoryEvaluationPulse:undefined,valueRows:[{...row,baseUsdValue:200,proofTotalValueUsd:200,sealedBirths:undefined,historyObservation:undefined}]};
 const next=retainMarketSourceHistory(incoming,held);
 expect(next.currentUsd).toBe(220);expect(next.valueRows[0].baseUsdValue).toBe(200);expect(next.valueRows[0].historyObservation).toEqual(observation);expect(next.valueRows[0].sealedBirths).toEqual(row.sealedBirths);expect(next.sportsHistorySnapshot).toEqual(snapshot);expect(next.unpricedSealedBirths).toEqual([later]);
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:next})).not.toThrow();
 const priced=retainMarketSourceHistory({...incoming,valueRows:[{...incoming.valueRows[0],sealedBirths:[...row.sealedBirths!,later]}]},held);
 expect(priced.unpricedSealedBirths).toBeUndefined();
});
it('transitions changed aggregate pricing at its supplied capture while preserving the earlier source record',async()=>{
 const updated={...row,baseUsdValue:900,proofTotalValueUsd:900},input={...source,generatedAt:at(350),valueRows:[updated]},model=currentMarketDisplayModel(input,null,500);
 expect(model.valueRows[0].historyEvaluationPulse).toBe(350);expect(marketCapUsdAtPulse(model,200)).toBe(100);expect(marketCapUsdAtPulse(model,349)).toBe(marketRowsUsdAtPulse([row],349));
 for(const pulse of [350,499,500,501,600])expect(marketCapUsdAtPulse(model,pulse)).toBe(marketRowsUsdAtPulse([updated],pulse));
 const held=retainMarketSourceHistory({...input,serverPulse:500,valueRows:[{...updated,historyObservation:undefined,sealedBirths:undefined}]},source);
 expect(held.valueRows[0].historyEvaluationPulse).toBe(350);expect(held.valueRows[0].historyObservation).toEqual(observation);
 const history=(await buildMarketHistory(input,null,undefined,undefined,{catalog:null,pulse:500}))!;expect(history.observationPulses).toContain(350);expect(history.series.ALL.some(point=>point.pulse===350)).toBe(true);
});
it('curates bounded public source provenance without forwarding private fields',()=>{
 const output=curatePublicCapitalization({ok:true,marketCapProjection:{...source,sourceEvaluation:{pulse:400,usdValue:110,sourceHash:hash,privateAccount:'secret'},sportsHistorySnapshot:{...snapshot,privateAccount:'secret'},valueRows:[{...row,historyObservation:{...observation,privateAccount:'secret'},historyEvaluationPulse:450}]}});
 expect(output.marketCapProjection).toMatchObject({sportsHistorySnapshot:snapshot,sportsHistoryEvaluationPulse:450,sourceEvaluation:{pulse:400,usdValue:110,sourceHash:hash}});expect(output.marketCapProjection.valueRows[0]).toMatchObject({historyObservation:observation,historyEvaluationPulse:450});expect(JSON.stringify(output)).not.toContain('secret');
});
it('retains the real May10 birth and June23 source totals without an October14 performance catch-up',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(new URL(`../public/${name}`,import.meta.url),'utf8'));
 const input=parseMarketCapSource(read('receiz-public-capitalization.json')),cards=read('receiz-public-sports.json'),catalog=mergePublicSports(parsePublicMarket(read('receiz-public-market.json')),cards),model=currentMarketDisplayModel(input,catalog,14718387);
 const captured=marketPulseAtOrAfterTime(cards.historySnapshot.at),sports=model.valueRows.filter(row=>row.source==='sports-economy-card');
 expect(model.sportsHistorySnapshot).toMatchObject({at:'2026-06-23T20:01:03.454Z',totalUsd:426947017.33,sourceHash:input.proofObjectHash,singleCopyGroups:1197,aggregateGroups:745,unpricedGroups:20});
 expect(marketRowsUsdAtPulse(sports,captured,true)).toBe(426947017.33);
 const misiorowski=sports.find(row=>row.seed==='7f94f49430098891cd7af0bd9d317d3c042dddd7a621995b99de8eb6ec71bc6f')!;
 expect(marketRowsUsdAtPulse([misiorowski],12057379,true)).toBe(0);expect(marketRowsUsdAtPulse([misiorowski],12057380,true)).toBe(87171058);expect(marketRowsUsdAtPulse([misiorowski],captured,true)).toBe(355860612.49);
 const oldEvaluation=input.serverPulse;
 expect(sports.flatMap(row=>row.sealedBirths??[]).filter(copy=>marketPulseAtOrAfterTime(copy.sealedAt)===oldEvaluation)).toHaveLength(0);
 expect(Math.abs(marketCapUsdAtPulse(model,oldEvaluation)-marketCapUsdAtPulse(model,oldEvaluation-1))).toBeLessThan(1000000);
 expect(model.currentUsd).toBe(marketRowsUsdAtPulse(model.valueRows,model.serverPulse));expect(model.sourceEvaluation?.usdValue).toBe(437773300.9889);expect(model.undatedHistory).toBeUndefined();
});
