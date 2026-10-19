import {expect,it} from 'vitest';
import {marketCapChartUsdAtPulse} from '../src/receiz/market-projection/interpolated-history';
import {marketCapUsdAtPulse,marketPulseTime} from '../src/receiz/market-projection/project';
import type {MarketCapSource,MarketValueRow} from '../src/receiz/market-projection/source';
const at=(p:number)=>new Date(marketPulseTime(p)).toISOString(),hash='a'.repeat(64);
const birth={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:hash,sealedAt:at(100),birthUsdValue:10};
const group={sport:'baseball' as const,cardId:'card',rarity:'Common'};
const model={baseUsdValue:100,birthUsdValue:100,marketUsdValue:110,proofTotalValueUsd:100,scoreDelta:8,seed:hash};
const record={at:at(200),usdValue:100,scope:'single-copy' as const,pricedCopies:1,vaultCopies:1,sourceHash:hash,group,collectibleId:birth.collectibleId,claimHash:hash,model};
const row:MarketValueRow={id:`card:${hash}`,source:'sports-economy-card',...model,sportsGroup:group,sealedBirths:[birth],historyObservation:record};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:hash,generatedAt:at(200),firstIssuancePulse:0,serverPulse:300,currentUsd:120,cardsInCirculation:1,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row]};
it('matches independent native historical card-chart replay, including pulse motion and rounding',()=>{
 // Replayed directly from Receiz SportsCardPremiumValueChart.tsx's
 // sportsCardHistoricalLivePulseChartPoint and sportsArenaLiveValueMotionAtPulse.
 const golden=[[101,10.9728],[125,33.3468],[150,56.8378],[175,80.3797],[199,102.9483]];
 for(const [pulse,value]of golden)expect(marketCapChartUsdAtPulse(source,pulse)).toBe(value);
 expect(marketCapChartUsdAtPulse(source,99)).toBe(0);expect(marketCapChartUsdAtPulse(source,100)).toBe(10);
 expect(marketCapChartUsdAtPulse(source,200)).toBe(100);expect(marketCapChartUsdAtPulse(source,300)).toBe(120);
 expect(marketCapUsdAtPulse(source,150)).toBe(10);
});
it('keeps multi-copy totals aggregate instead of inventing per-copy pricing operands',()=>{
 const {collectibleId,claimHash,...rest}=record;
 const later={collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:'b'.repeat(64),sealedAt:at(150),birthUsdValue:20};
 const aggregate={...row,sealedBirths:[birth,later],historyObservation:{...rest,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2,usdValue:200}};
 const input={...source,valueRows:[aggregate],cardsInCirculation:2};
 expect(marketCapChartUsdAtPulse(input,99)).toBe(0);expect(marketCapChartUsdAtPulse(input,100)).toBe(10);
 expect(marketCapChartUsdAtPulse(input,150)).toBe(30);expect(marketCapChartUsdAtPulse(input,200)).toBe(200);
});
it('does not admit an unrelated record or use mutable current operands in an earlier source projection',()=>{
 const unrelated={...source,valueRows:[{...row,historyObservation:{...record,collectibleId:'rsc_bbbbbbbbbbbbbbbb'},baseUsdValue:900,proofTotalValueUsd:900}]};
 expect(marketCapChartUsdAtPulse(unrelated,150)).toBe(10);
 expect(marketCapChartUsdAtPulse({...source,valueRows:[{...row,baseUsdValue:900,proofTotalValueUsd:900}]},150)).toBe(56.8378);
 const missing={...source,valueRows:[{...row,historyObservation:{...record,model:undefined}}]};
 expect(marketCapChartUsdAtPulse(missing,150)).toBe(10);
});
