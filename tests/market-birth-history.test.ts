import {expect,it} from 'vitest';
import {marketCapUsdAtPulse,marketRowsUsdAtPulse,marketPulseTime,publicSportsQuoteAtPulse} from '../src/receiz/market-projection/project';
import type {MarketCapSource,MarketValueRow} from '../src/receiz/market-projection/source';
import {parseMarketCapSource,publicSportsValueRow} from '../src/receiz/market-projection/source';
import {currentMarketDisplayModel} from '../src/receiz/market-projection/catalog-source';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {marketHistoryBasis,parseMarketHistory} from '../src/receiz/market-projection/history';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
const at=(pulse:number)=>new Date(marketPulseTime(pulse)).toISOString();
const birth={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:'a'.repeat(64),sealedAt:at(100),birthUsdValue:10};
const row:MarketValueRow={id:`card:${birth.claimHash}`,source:'sports-economy-card',seed:birth.claimHash,baseUsdValue:100,birthUsdValue:100,marketUsdValue:110,proofTotalValueUsd:100,scoreDelta:1};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:'a'.repeat(64),generatedAt:at(300),firstIssuancePulse:0,serverPulse:300,currentUsd:120,cardsInCirculation:1,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row]};
it('overlays fresh matching seal metadata independently of an older catalog price capture',()=>{
 const captured={...source,generatedAt:at(400),serverPulse:400},oldPriced={...row,baseUsdValue:1,birthUsdValue:1,marketUsdValue:1,proofTotalValueUsd:1,scoreDelta:0,sealedBirths:[birth]};
 const card={collectibleId:birth.collectibleId,claimHash:birth.claimHash,cardId:'card',athlete:'Recovered card',sport:'baseball',issuedCount:1,vaultCount:1,pricedCount:1,liveValueUsd:1,totalValueUsd:1,sealedBirths:[birth],valuationRow:oldPriced};
 const catalog=mergePublicSports(parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(300),sealedBirthsObservedAt:at(500),cards:[card]});
 const model=currentMarketDisplayModel(captured,catalog,600);
 expect(model.valueRows[0]).toEqual({...row,sealedBirths:[birth]});expect(marketCapUsdAtPulse(model,100)).toBe(10);expect(model.undatedHistory?.undatedRows).toBe(0);expect(model.currentUsd).toBe(marketRowsUsdAtPulse(captured.valueRows,600));
 const full={...birth,proofValueUsd:100,currentValueUsd:120,valuationPulse:400,valuation:{baseUsdValue:100,birthUsdValue:10,marketUsdValue:110,scoreDelta:1,seed:birth.claimHash}};
 const stronger={...captured,valueRows:[{...row,sealedCopies:[full]}]},retained=currentMarketDisplayModel(stronger,catalog,600);
 expect(retained.valueRows[0].sealedCopies).toEqual([full]);expect(retained.currentUsd).toBe(marketRowsUsdAtPulse(stronger.valueRows,600));
 const stale=mergePublicSports(parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:at(300),sealedBirthsObservedAt:at(350),cards:[card]});
 expect(currentMarketDisplayModel({...captured,valueRows:[{...row,sealedBirths:[{...birth,birthUsdValue:15}]}]},stale,600).valueRows[0].sealedBirths?.[0].birthUsdValue).toBe(15);
 const laterPriceCapture={...captured,generatedAt:at(700),serverPulse:700},recovered=currentMarketDisplayModel(laterPriceCapture,catalog,800);
 expect(recovered.valueRows[0]).toEqual({...row,sealedBirths:[birth]});expect(marketCapUsdAtPulse(recovered,100)).toBe(10);expect(recovered.currentUsd).toBe(marketRowsUsdAtPulse(laterPriceCapture.valueRows,800));
});
it('uses exact sealed births for history without substituting birth values for current aggregate prices',async()=>{
 const enriched={...source,valueRows:[{...row,sealedBirths:[birth]}]};
 expect(marketCapUsdAtPulse(enriched,99)).toBe(0);expect(marketCapUsdAtPulse(enriched,100)).toBe(10);expect(marketCapUsdAtPulse(enriched,299)).toBe(10);
 for(const pulse of [300,301,400]){expect(marketRowsUsdAtPulse(enriched.valueRows,pulse)).toBe(marketRowsUsdAtPulse(source.valueRows,pulse));expect(publicSportsQuoteAtPulse(enriched.valueRows[0],pulse)).toBe(publicSportsQuoteAtPulse(row,pulse));}
 const model=currentMarketDisplayModel(enriched,null,400);
 expect(model.undatedHistory).toMatchObject({rows:1,undatedRows:0,birthOnlyRows:1,observationPulse:300,observationUsd:110});
 expect(marketCapUsdAtPulse(model,300)).toBe(120);expect(model.currentUsd).toBe(marketRowsUsdAtPulse(source.valueRows,400));
 const history=(await buildMarketHistory(enriched,null,undefined,undefined,{catalog:null,pulse:400}))!;
 expect(history.series.ALL.find(point=>point.pulse===100)?.usdCents).toBe('1000');expect(history.series.ALL.find(point=>point.pulse===300)?.usdCents).toBe('12000');
 expect(history.historyPolicy).toBe('sealed-births-and-dated-observations-v2');expect(await marketHistoryBasis(enriched)).not.toBe(await marketHistoryBasis(source));
});
it.each([300,15])('counts mixed full, birth-only and unknown rows once with a signed aggregate adjustment at $%s',total=>{
 const full={...row,id:`full:${'b'.repeat(64)}`,seed:'b'.repeat(64),sealedCopies:[{...birth,collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:'b'.repeat(64),birthUsdValue:20,proofValueUsd:100,currentValueUsd:100,valueHistory:[{at:at(100),usdValue:20,basis:'sealed-birth' as const},{at:at(300),usdValue:100,basis:'source-observation' as const}]}]},unknown={...row,id:`unknown:${'c'.repeat(64)}`,seed:'c'.repeat(64)};
 const enriched={...source,currentUsd:total,cardsInCirculation:3,sportsCardsPriced:3,valueRows:[{...row,sealedBirths:[birth]},full,unknown]},model=currentMarketDisplayModel(enriched,null,400);
 expect(model.undatedHistory).toMatchObject({rows:2,undatedRows:1,birthOnlyRows:1,observationUsd:total-110});
 expect(marketCapUsdAtPulse(model,99)).toBe(0);expect(marketCapUsdAtPulse(model,100)).toBe(30);expect(marketCapUsdAtPulse(model,300)).toBe(total);
 expect(marketCapUsdAtPulse(model,350)).toBe(marketRowsUsdAtPulse(enriched.valueRows,350));
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:model})).not.toThrow();
});
it('validates birth-only metadata and signed aggregate fields before worker/cache use',async()=>{
 const value={...source,valueRows:[{...row,sealedBirths:[birth]}]},history=(await buildMarketHistory(value,null,undefined,undefined,{catalog:null,pulse:400}))!;
 for(const sealedBirths of [[birth,birth],[{...birth,birthUsdValue:-1}],[{...birth,sealedAt:'invalid'}]])expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...value,valueRows:[{...row,sealedBirths}]}})).toThrow();
 for(const observationUsd of [NaN,Infinity,-1e14])expect(()=>parseMarketHistory({...history,summary:{...history.summary,undatedHistory:{...history.summary.undatedHistory,observationUsd}}})).toThrow();
 const curated=publicSportsValueRow({cardId:'card',claimHash:birth.claimHash,proofValueUsd:100,sealedBirths:[{...birth,ownerUsername:'public_holder',owner_user_id:'private'}]});
 expect(curated?.sealedBirths).toEqual([birth]);expect(JSON.stringify(curated)).not.toContain('private');
});
it('includes unmatched verified copies as unpriced birth metadata without adding a fabricated current quote',async()=>{
 const unpriced={...birth,collectibleId:'rsc_dddddddddddddddd',claimHash:'d'.repeat(64),sealedAt:at(150),birthUsdValue:25},input={...source,unpricedSealedBirths:[unpriced]},model=currentMarketDisplayModel(input,null,400);
 expect(marketCapUsdAtPulse(model,149)).toBe(0);expect(marketCapUsdAtPulse(model,150)).toBe(25);expect(marketCapUsdAtPulse(model,300)).toBe(source.currentUsd);
 expect(model.currentUsd).toBe(marketRowsUsdAtPulse(source.valueRows,400));expect(marketCapUsdAtPulse(model,350)).toBe(marketRowsUsdAtPulse(source.valueRows,350));
 const history=(await buildMarketHistory(input,null,undefined,undefined,{catalog:null,pulse:400}))!;
 expect(publicSportsValueRow({cardId:'unpriced',claimHash:unpriced.claimHash,pricedCount:0,liveValueUsd:null,totalValueUsd:null,sealedBirths:[unpriced]})).toBeUndefined();
 expect(history.series.ALL.find(point=>point.pulse===150)?.usdCents).toBe('2500');expect(await marketHistoryBasis(input)).not.toBe(await marketHistoryBasis(source));
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:input})).not.toThrow();
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...input,unpricedSealedBirths:[unpriced,unpriced]}})).toThrow();
 expect(()=>parseMarketCapSource({ok:true,marketCapProjection:{...input,valueRows:[{...row,sealedBirths:[unpriced]}]}})).toThrow();
 expect(()=>parseMarketHistory({...history,summary:{...history.summary,unpricedSealedBirths:[{...unpriced,birthUsdValue:-1}]}})).toThrow();
 expect(()=>parseMarketHistory({...history,summary:{...history.summary,undatedHistory:{...history.summary.undatedHistory,unpricedCopies:2}}})).toThrow();
});
