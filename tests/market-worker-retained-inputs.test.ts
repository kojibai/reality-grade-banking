import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {parseMarketHistory,type MarketHistorySnapshot} from '../src/receiz/market-projection/history';
import type {MarketCapSource} from '../src/receiz/market-projection/source';
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:'a'.repeat(64),generatedAt:'2026-10-20T00:00:00Z',firstIssuancePulse:14719900,serverPulse:14720000,currentUsd:100,cardsInCirculation:0,sportsCardsPriced:0,marketAssetsPriced:1,valueRows:[{id:'retained-object',source:'market-desk-live-asset',baseUsdValue:100,birthUsdValue:100,marketUsdValue:100,proofTotalValueUsd:100,scoreDelta:0,seed:'retained-object',marketItem:{id:'retained-object',source:'public',priceUsd:100,pricePhi:1,quoteUsdPerPhi:100,changePct:0,livePulseSeed:{kind:'sigil',claimPulse:14719900,beat:2,stepIndex:3,creatorVerified:true}}}]};
let replies:Record<string,unknown>[],host:{onmessage:((event:{data:Record<string,unknown>})=>Promise<void>)|null;postMessage(value:Record<string,unknown>):void};
beforeEach(async()=>{vi.resetModules();replies=[];host={onmessage:null,postMessage(value){replies.push(structuredClone(value));}};vi.stubGlobal('self',host);await import('../src/receiz/market-projection/worker');});
afterEach(()=>vi.unstubAllGlobals());
it('advances the retained worker inputs to the exact same complete history as a full input resend',async()=>{
 await host.onmessage!({data:{id:1,source:{ok:true,marketCapProjection:source},catalog:null,pulse:14720000}});
 const first=parseMarketHistory(replies.at(-1)!.history);
 await host.onmessage!({data:{id:2,marketTick:true,pulse:14720001}});
 expect(replies.at(-1)?.id).toBe(2);const next=parseMarketHistory(replies.at(-1)!.history);
 expect(next.summary.serverPulse).toBe(14720001);
 const full=(await buildMarketHistory(source,first,undefined,undefined,{catalog:null,pulse:14720001}))!;
 expect(next).toEqual(full);
 for(const points of Object.values(next.series))expect(points.at(-1)?.usdCents).toBe(String(Math.round(next.summary.currentUsd*100)));
});
it('acknowledges a pulse without established inputs as a failure instead of stranding the main-thread queue',async()=>{
 await host.onmessage!({data:{id:1,marketTick:true,pulse:14720001}});
 expect(replies).toEqual([{id:1,error:'Projected market history is unavailable.'}]);
});
it('refuses a pulse after a rejected replacement rather than silently advancing the superseded pricing source',async()=>{
 await host.onmessage!({data:{id:1,source:{ok:true,marketCapProjection:source},catalog:null,pulse:14720000}});
 await host.onmessage!({data:{id:2,source:{ok:true,marketCapProjection:{...source,schema:'invalid'}},catalog:null,pulse:14720001}});
 await host.onmessage!({data:{id:3,marketTick:true,pulse:14720002}});
 expect(replies.at(-1)).toEqual({id:3,error:'Projected market history is unavailable.'});
});
it('replaces an established pricing source and retains only the completed replacement history for subsequent pulses',async()=>{
 await host.onmessage!({data:{id:1,source:{ok:true,marketCapProjection:source},catalog:null,pulse:14720000}});
 const first=replies.at(-1)!.history as MarketHistorySnapshot;
 const replacement={...source,generatedAt:'2026-10-21T00:00:00Z',proofObjectHash:'b'.repeat(64),valueRows:source.valueRows.map(row=>({...row,marketItem:{...row.marketItem!,livePulseSeed:{...row.marketItem!.livePulseSeed!,creatorVerified:false}}}))};
 await host.onmessage!({data:{id:2,source:{ok:true,marketCapProjection:replacement},history:first,catalog:null,pulse:14720001}});
 const second=parseMarketHistory(replies.at(-1)!.history);expect(second.summary.proofObjectHash).toBe('b'.repeat(64));
 await host.onmessage!({data:{id:3,marketTick:true,pulse:14720002}});
 const third=parseMarketHistory(replies.at(-1)!.history),full=(await buildMarketHistory(replacement,second,undefined,undefined,{catalog:null,pulse:14720002}))!;
 expect(third).toEqual(full);expect(third.summary.serverPulse).toBe(14720002);
});
it('publishes one share-cap total and all intervals from retained worker operands without another source read',async()=>{
 const seed=source.valueRows[0].marketItem!.livePulseSeed!;
 const catalog={items:[{id:'retained-object',assetId:'retained-object',category:'proof',hasPbiSignature:true,pulse:String(seed.claimPulse),priceUsd:100,livePulseSeed:seed,valuationBinding:{itemId:'retained-object',assetId:'retained-object'},shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:'retained-object',assetId:'retained-object',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14719900000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'49000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity',releaseCapitalization:{kaiUPulse:'14719900000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'50000000',modelVersion:'market-share-quote-v1'}}}],complete:true,revision:'held',observedAt:source.generatedAt,sourceCount:1} as import('../src/receiz/public-market').PublicMarketCatalog;
 await host.onmessage!({data:{id:1,source:{ok:true,marketCapProjection:source},catalog,pulse:14720000,shareCapitalization:true}});
 const first=parseMarketHistory(replies.at(-1)!.history);expect(first.summary.shareCapitalization?.covered).toBe(1);
 await host.onmessage!({data:{id:2,marketTick:true,pulse:14720001}});
 const next=parseMarketHistory(replies.at(-1)!.history);
 for(const points of Object.values(next.series))expect(points.at(-1)?.usdCents).toBe(next.summary.shareCapitalization?.usdCents);
 const full=await buildMarketHistory(source,first,undefined,undefined,{catalog,pulse:14720001,capitalization:true});expect(next).toEqual(full);
});
it('retains the prepared share-cap publication while membership has not arrived instead of publishing unit values',async()=>{
 await host.onmessage!({data:{id:1,source:{ok:true,marketCapProjection:source},catalog:null,pulse:14720000,shareCapitalization:true}});
 expect(replies).toEqual([{id:1,retained:true}]);
});
