import {expect,it} from 'vitest';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {marketPulseTime,marketPeriodPulses} from '../src/receiz/market-projection/coordinates';
import {publicSigilUsdAtPulse} from '../src/receiz/market-projection/project';
import {readPublicShareInventory,publicShareCapitalization} from '../src/receiz/market-share-inventory';
import {publicCatalogAtPulse} from '../src/receiz/market-projection/catalog-prices';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import type {MarketCapSource} from '../src/receiz/market-projection/source';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
const issue=14700000,end=14900000,seed={kind:'sigil',claimPulse:issue,beat:2,stepIndex:3,creatorVerified:true};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:'a'.repeat(64),generatedAt:new Date(marketPulseTime(end)).toISOString(),firstIssuancePulse:issue,serverPulse:end,currentUsd:100,cardsInCirculation:0,sportsCardsPriced:0,marketAssetsPriced:1,valueRows:[{id:'public-market:one',source:'market-desk-live-asset',baseUsdValue:100,birthUsdValue:100,marketUsdValue:100,proofTotalValueUsd:100,scoreDelta:0,seed:'asset',marketItem:{id:'one',source:'profile',priceUsd:100,pricePhi:1,quoteUsdPerPhi:100,changePct:0,livePulseSeed:seed}}]};
function catalog(){
 const item={id:'one',assetId:'asset',category:'proof',pulse:String(issue),priceUsd:100,livePulseSeed:seed,valuationBinding:{itemId:'one',assetId:'asset'}} as PublicMarketItem;
 const release={kaiUPulse:String(issue*1000000),unitPriceUsdCents:String(Math.round(publicSigilUsdAtPulse(seed,issue)*100)),outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'100000000',modelVersion:'market-share-quote-v1'};
 item.shareInventory=readPublicShareInventory({schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:String((end-1)*1000000),outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'50000000',availability:'quote-capacity',releaseCapitalization:release,capitalizationHistory:[{kaiUPulse:String((end-1)*1000000),unitPriceUsdCents:'10000',outstandingShareQuantityMicro:'2000000',availableShareQuantityMicro:'50000000'}]},item)!;
 return {items:[item],complete:true,revision:'one',observedAt:source.generatedAt,sourceCount:1} as PublicMarketCatalog;
}
it('publishes the same share-inclusive total in the summary and every chart endpoint, retaining release quantities',async()=>{
 const held=catalog(),history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:held,pulse:end,capitalization:true}))!;
 const expected=publicShareCapitalization(publicCatalogAtPulse(held,source,end));
 expect(history.summary.shareCapitalization?.usdCents).toBe(expected.usdCents);
 expect(history.series.ALL[0].usdCents).toBe(String(BigInt(held.items[0].shareInventory!.releaseCapitalization!.unitPriceUsdCents)*100n));
 for(const points of Object.values(history.series))expect(points.at(-1)?.usdCents).toBe(expected.usdCents);
 expect(()=>parseMarketHistory(history)).not.toThrow();
});
it('fills the elapsed time after a retained head so daily and weekly windows contain valuations throughout the gap',async()=>{
 const oldEnd=end-8*Math.ceil(86400/(3+Math.sqrt(5))),previous=(await buildMarketHistory({...source,serverPulse:oldEnd,currentUsd:100}))!;
 const next=(await buildMarketHistory(source,previous))!;
 for(const period of ['1D','1W'] as const){
  expect(next.series[period].length,period).toBeGreaterThanOrEqual(64);
  expect(next.series[period][0].pulse).toBe(marketPeriodPulses(source,period)[0]);
  expect(next.series[period].filter(point=>point.pulse>oldEnd&&point.pulse<end).length).toBeGreaterThan(50);
 }
});

it('uses historic capacity until its next observation rather than applying the current share count to old prices',async()=>{
 const held=catalog(),history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:held,pulse:end,capitalization:true}))!;
 const point=history.series.ALL.find(point=>point.pulse>issue&&point.pulse<end-1)!;
 expect(point.usdCents).toBe(String(BigInt(Math.round(publicSigilUsdAtPulse(seed,point.pulse)*100))*100n));
 const observed=history.series.ALL.find(point=>point.pulse===end-1)!;expect(observed.usdCents).toBe('520000');
});
it('counts native issued supply once even when some of that supply is offered for sale',async()=>{
 const held=catalog(),item=held.items[0];item.nativeAsset={id:'b'.repeat(64),issuanceSourceSha256:'c'.repeat(64),headSourceSha256:'d'.repeat(64),publicCertificateSha256:'e'.repeat(64)};
 item.shareInventory=readPublicShareInventory({schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'native',nativeAssetId:item.nativeAsset.id,issuanceSourceSha256:item.nativeAsset.issuanceSourceSha256,sourceHeadSha256:item.nativeAsset.headSourceSha256,observedAtKaiUPulse:String((end-1)*1000000),outstandingShareQuantityMicro:'100000000',availableShareQuantityMicro:'40000000',availability:'open-offers',historyBasis:'native-events',history:[{kaiUPulse:String(issue*1000000),outstandingShareQuantityMicro:'100000000'}]},item)!;
 const history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:held,pulse:end,capitalization:true}))!;
 expect(history.summary.shareCapitalization?.usdCents).toBe(String(BigInt(Math.round(publicSigilUsdAtPulse(seed,end)*100))*100n));
});
it('retains a complete share-cap publication when a weaker response omits the known quantities',async()=>{
 const held=catalog(),previous=(await buildMarketHistory(source,null,undefined,undefined,{catalog:held,pulse:end,capitalization:true}))!;
 const weaker={...held,items:held.items.map(({shareInventory:_inventory,...item})=>item)};
 expect(await buildMarketHistory(source,previous,undefined,undefined,{catalog:weaker,pulse:end+1,capitalization:true})).toBeNull();
});
it('preserves the legacy unit-value history separately from the share-cap publication',async()=>{
 const legacy=(await buildMarketHistory(source))!;
 expect(legacy.summary.shareCapitalization).toBeUndefined();expect(legacy.series.ALL.at(-1)?.usdCents).toBe('10000');expect(()=>parseMarketHistory(legacy)).not.toThrow();
});
it('refuses an internally inconsistent cap headline before publishing any interval',async()=>{
 const held=catalog(),history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:held,pulse:end,capitalization:true}))!;
 expect(()=>parseMarketHistory({...history,summary:{...history.summary,shareCapitalization:{...history.summary.shareCapitalization!,usdCents:'1'}}})).toThrow('capitalization summary');
});
