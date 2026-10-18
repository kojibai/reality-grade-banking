import {expect,it}from'vitest';
import input from'../public/receiz-public-capitalization.json';
import{parseMarketCapSource}from'../src/receiz/market-projection/source';
import{parsePublicMarket}from'../src/receiz/public-market';
import{buildMarketHistory}from'../src/receiz/market-projection/build-history';
const full=parseMarketCapSource(input),row=full.valueRows.find(row=>row.marketItem?.livePulseSeed)!,seed=row.marketItem!.livePulseSeed!;
const source={...full,valueRows:[row],marketAssetsPriced:1,sportsCardsPriced:0,cardsInCirculation:0};
const original=(id:string,pulse=seed.claimPulse)=>({id,receizId:id,title:id,pulse:String(pulse),livePulseSeed:{...seed,claimPulse:pulse},valueUsd:10});
const catalog=(rows:unknown[],complete=true)=>parsePublicMarket({ok:true,transport:{generatedAt:'2026-10-18T22:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:complete,itemCount:rows.length,revision:'latest-public-collection'},publicOriginals:rows}});
it('rebuilds every capitalization period from the complete current collection and evaluates the current pulse',async()=>{
 const current=14720000,collection=catalog([original('new-a',14700000),original('new-b',14701000)]);
 const result=(await buildMarketHistory(source,null,undefined,undefined,{catalog:collection,pulse:current}))!;
 expect(result.summary.marketAssetsPriced).toBe(2);expect(result.summary.serverPulse).toBe(current);expect(result.summary.generatedAt).toBe(collection.observedAt);
 expect(result.summary.currentUsd).not.toBe(source.currentUsd);
 for(const points of Object.values(result.series)){expect(points).toHaveLength(64);expect(points.at(-1)?.pulse).toBe(current);expect(points.at(-1)?.usdCents).toBe(String(Math.round(result.summary.currentUsd*100)));}
 const {parseMarketHistory}=await import('../src/receiz/market-projection/history');expect(()=>parseMarketHistory(result)).not.toThrow();
});
it('keeps the retained inventory when a partial collection cannot establish a replacement',async()=>{
 const result=(await buildMarketHistory(source,null,undefined,undefined,{catalog:catalog([original('new-a')],false),pulse:14720000}))!;
 expect(result.summary.marketAssetsPriced).toBe(1);expect(result.summary.serverPulse).toBe(14720000);
});
it('counts one asset once across aliases and a retained non-profile market row',async()=>{
 const old={...row,seed:'same-asset',marketItem:{...row.marketItem!,id:'asset:same-asset'}};
 const collection=catalog([{...original('profile:owner:same-asset'),receizId:'same-asset'},{...original('profile:other:same-asset'),receizId:'same-asset'}]);
 const result=(await buildMarketHistory({...source,valueRows:[old]},null,undefined,undefined,{catalog:collection,pulse:14720000}))!;
 expect(result.summary.marketAssetsPriced).toBe(1);
});
it('includes new card valuation sources and replaces matching retained claims once',async()=>{
 const {mergePublicSports}=await import('../src/receiz/public-sports'),{publicSportsValueRow}=await import('../src/receiz/market-projection/source');
 const card={collectibleId:'rsc_0123456789abcdef',claimHash:'a'.repeat(64),athlete:'Public card',sport:'baseball',cardId:'a',proofValueUsd:10,proofTotalValueUsd:20,liveValueUsd:11,totalValueUsd:22,issuedCount:2,vaultCount:2,pricedCount:2};
 const row=publicSportsValueRow(card)!,collection=mergePublicSports(catalog([original('proof')]),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...card,valuationRow:row}]});
 const retained={...source,valueRows:[...source.valueRows,{...row,marketUsdValue:10}],sportsCardsPriced:1,cardsInCirculation:2};
 const result=(await buildMarketHistory(retained,null,undefined,undefined,{catalog:collection,pulse:14720000}))!;expect(result.summary.sportsCardsPriced).toBe(1);
 const second={...card,collectibleId:'rsc_1123456789abcdef',claimHash:'b'.repeat(64),cardId:'b'};
 const two=mergePublicSports(collection,{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{...card,valuationRow:row},{...second,valuationRow:publicSportsValueRow(second)}]});
 const updated=(await buildMarketHistory(retained,result,undefined,undefined,{catalog:two,pulse:14720001}))!;expect(updated.summary.sportsCardsPriced).toBe(2);expect(updated.summary.cardsInCirculation).toBe(4);
});
it('does not replace a fresher capitalization claim with an older sports capture',async()=>{
 const {mergePublicSports}=await import('../src/receiz/public-sports'),{publicSportsValueRow}=await import('../src/receiz/market-projection/source'),{currentMarketDisplayModel}=await import('../src/receiz/market-projection/catalog-source');
 const card={collectibleId:'rsc_0123456789abcdef',claimHash:'a'.repeat(64),athlete:'Public card',sport:'baseball',cardId:'a',proofValueUsd:10,liveValueUsd:11,totalValueUsd:11,issuedCount:1,vaultCount:1,pricedCount:1},row=publicSportsValueRow(card)!;
 const retained={...source,generatedAt:'2026-10-18T22:00:00Z',valueRows:[row],sportsCardsPriced:1,marketAssetsPriced:0,cardsInCirculation:1};
 const feed=(generatedAt:string)=>mergePublicSports(catalog([],false),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt,cards:[{...card,valuationRow:{...row,marketUsdValue:99}}]});
 expect(currentMarketDisplayModel(retained,feed('2026-10-14T00:00:00Z'),14720000).valueRows[0].marketUsdValue).toBe(11);
 expect(currentMarketDisplayModel(retained,feed('2026-10-18T23:00:00Z'),14720000).valueRows[0].marketUsdValue).toBe(99);
});
it('keeps newer profile membership when an older complete discovery cache is retained',async()=>{
 const {currentMarketDisplayModel}=await import('../src/receiz/market-projection/catalog-source');
 const second={...row,id:'second-row',seed:'second',marketItem:{...row.marketItem!,id:'profile:owner:second'}};
 const latest={...source,generatedAt:'2026-10-18T23:00:00Z',marketAssetsPriced:2,valueRows:[row,second]};
 const result=currentMarketDisplayModel(latest,catalog([original('older-cache')]),14720000);
 expect(result.marketAssetsPriced).toBe(2);expect(result.valueRows.map(value=>value.id)).toEqual([row.id,second.id]);
 expect(result.generatedAt).toBe(latest.generatedAt);
});
it('does not regress a newer completed publication while fresher operands are loading',async()=>{
 const latest=(await buildMarketHistory(source,null,undefined,undefined,{catalog:catalog([original('fresh-a'),original('fresh-b')]),pulse:14720000}))!;
 const older={...source,generatedAt:'2026-10-14T00:00:00Z'};
 const result=await buildMarketHistory(older,latest,undefined,undefined,{catalog:null,pulse:14720001});
 expect(result).toBeNull();
});
