import {expect,it} from 'vitest';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {projectPublicAssetPeriods} from '../src/receiz/market-projection/asset';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
import type {MarketValueRow} from '../src/receiz/market-projection/source';
const at=(pulse:number)=>new Date(marketPulseTime(pulse)).toISOString(),hash='a'.repeat(64),id='rsc_aaaaaaaaaaaaaaaa';
const copy={collectibleId:id,claimHash:hash,sealedAt:at(100),birthUsdValue:10},group={sport:'baseball' as const,cardId:'card',rarity:'Common'};
const model={baseUsdValue:100,birthUsdValue:100,marketUsdValue:110,proofTotalValueUsd:100,scoreDelta:8,seed:hash};
const row:MarketValueRow={id:`card:${hash}`,source:'sports-economy-card',...model,sportsGroup:group,sealedBirths:[copy],historyObservation:{at:at(200),usdValue:100,scope:'single-copy',pricedCopies:1,vaultCopies:1,sourceHash:hash,group,collectibleId:id,claimHash:hash,model}};
const base=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'card',receizId:id,title:'Sealed card'}]}}).items[0];
const item:PublicMarketItem={...base,category:'sports',assetId:id,sportsValuation:row,pulse:null};
it('opens six card chart periods directly from existing individual operands at the exact seal',()=>{
 const periods=projectPublicAssetPeriods(item,null,150)!;
 expect(periods).not.toBeNull();expect(Object.keys(periods)).toHaveLength(6);
 for(const points of Object.values(periods)){expect(points[0]).toMatchObject({pulse:100,usdCents:'1000'});expect(points.at(-1)).toMatchObject({pulse:150,usdCents:'5684'});}
});
it('continues a supported card chart on the next pulse without moving the original seal or earlier samples',()=>{
 const first=projectPublicAssetPeriods(item,null,150)!,next=projectPublicAssetPeriods(item,null,151,first)!;
 expect(next.ALL[0]).toEqual(first.ALL[0]);expect(next.ALL.at(-1)?.pulse).toBe(151);expect(next.ALL.slice(1,-2)).toEqual(first.ALL.slice(1,-1));
});
it('refuses charts for another copy or an aggregate with no bound individual history',()=>{
 expect(projectPublicAssetPeriods({...item,assetId:'rsc_bbbbbbbbbbbbbbbb'},null,150)).toBeNull();
 const {collectibleId,claimHash,...rest}=row.historyObservation!;
 expect(projectPublicAssetPeriods({...item,sportsValuation:{...row,historyObservation:{...rest,scope:'sports-group',pricedCopies:2,vaultCopies:2}}},null,150)).toBeNull();
});
