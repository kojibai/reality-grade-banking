import {expect,it} from 'vitest';
import {mergePublicQuotes,type PublicMarketCatalog,type PublicMarketItem} from '../src/receiz/public-market';
import {shareCapitalizationPoints} from '../src/receiz/market-share-chart';
const item={id:'profile:one:a',assetId:'a',category:'proof',priceUsd:25,chart:[]}as unknown as PublicMarketItem;
const raw=(at:string,quantity='1000000')=>({schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:at,outstandingShareQuantityMicro:quantity,availableShareQuantityMicro:'0',availability:'quote-capacity',positionsMicro:quantity,certificatesMicro:'0',reservedBuyMicro:'0',history:[{kaiUPulse:at,outstandingShareQuantityMicro:quantity,unitPriceUsdCents:'2500'}],capitalizationHistory:[{kaiUPulse:at,unitPriceUsdCents:'2500',outstandingShareQuantityMicro:quantity,availableShareQuantityMicro:'0'}]});
const merge=(catalog:PublicMarketCatalog,inventory?:unknown)=>mergePublicQuotes(catalog,{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:item.id,visibility:'public',priceUsd:25,quoteUsdPerPhi:1,shareInventory:inventory}]}});
it('retains known share observations through weaker quotes and appends quantities at their actual coordinates',()=>{
 const initial=merge({items:[item]}as PublicMarketCatalog,raw('15000000000000'));
 const next=merge(initial,raw('15000002000000','2000000'));
 expect(next.items[0].shareInventory?.history).toHaveLength(2);
 expect(merge(next).items[0].shareInventory).toBe(next.items[0].shareInventory);
 expect(merge(next,raw('14999999000000')).items[0].shareInventory).toBe(next.items[0].shareInventory);
 const chart=shareCapitalizationPoints([{pulse:14999999,at:'2026-10-26T10:00:00Z',usdCents:'2500'},{pulse:15000000,at:'2026-10-26T10:00:01Z',usdCents:'2500'},{pulse:15000002,at:'2026-10-26T10:00:03Z',usdCents:'2500'}],next.items[0].shareInventory);
 expect(chart.map(p=>p.usdCents)).toEqual(['2500','5000']);
});
it('uses historical buying capacity from each recorded quote, never today’s capacity across old prices',()=>{
 const inventory={...raw('15000002000000','2000000'),availableShareQuantityMicro:'9000000',historyBasis:'recorded-transactions',history:[{kaiUPulse:'15000000000000',outstandingShareQuantityMicro:'1000000'},{kaiUPulse:'15000001000000',outstandingShareQuantityMicro:'2000000'}],capitalizationHistory:[{kaiUPulse:'15000000000000',unitPriceUsdCents:'2500',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'4000000'},{kaiUPulse:'15000001000000',unitPriceUsdCents:'3000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'2000000'},{kaiUPulse:'15000002000000',unitPriceUsdCents:'2500',outstandingShareQuantityMicro:'2000000',availableShareQuantityMicro:'9000000'}]} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 const prices=[{pulse:15000000,at:'2026-10-26T10:00:00Z',usdCents:'2500'},{pulse:15000002,at:'2026-10-26T10:00:03Z',usdCents:'2500'}];
 expect(shareCapitalizationPoints(prices,inventory,()=> '2500').map(point=>[point.pulse,point.usdCents])).toEqual([[15000000,'10000'],[15000001,'9000'],[15000002,'27500']]);
 expect(shareCapitalizationPoints(prices,{...inventory,capitalizationHistory:undefined},()=> '2500')).toEqual([]);
 const live=shareCapitalizationPoints([...prices,{pulse:15000003,at:'2026-10-26T10:00:04Z',usdCents:'3000'}],inventory);expect(live.at(-1)?.usdCents).toBe('33000');expect(live.filter(point=>point.pulse<15000002)).toHaveLength(2);
});
it('cannot roll a newer quantity and recorded history back with a delayed full-history capture',()=>{
 const initial=merge({items:[item]}as PublicMarketCatalog,{...raw('15000002000000','2000000'),historyBasis:'recorded-transactions'}),previous=initial.items[0].shareInventory;
 const older=merge(initial,{...raw('15000001000000'),historyBasis:'recorded-transactions'});
 expect(older.items[0].shareInventory).toBe(previous);expect(older.items[0].shareInventory?.outstandingShareQuantityMicro).toBe('2000000');
});
it('preserves a native quantity change at its exact carried subpulse coordinate',()=>{
 const inventory={family:'native',observedAtKaiUPulse:'200000000',outstandingShareQuantityMicro:'2000000',historyBasis:'native-events',history:[{kaiUPulse:'100000000',outstandingShareQuantityMicro:'1000000'},{kaiUPulse:'150500000',outstandingShareQuantityMicro:'2000000'}]} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 const points=shareCapitalizationPoints([{pulse:100,at:'2026-10-26T10:00:00Z',usdCents:'100'},{pulse:200,at:'2026-10-26T10:00:03Z',usdCents:'100'}],inventory,()=> '100')as {kaiUPulse?:string;usdCents:string}[];
 expect(points.find(point=>point.kaiUPulse==='150499999')?.usdCents).toBe('100');expect(points.find(point=>point.kaiUPulse==='150500000')?.usdCents).toBe('200');
});

it('retains recorded capacity observations when a later response has a complete quantity tape only',()=>{
 const initial=merge({items:[item]}as PublicMarketCatalog,raw('15000000000000'));
 const next=merge(initial,{...raw('15000002000000','2000000'),historyBasis:'recorded-transactions'});
 expect(next.items[0].shareInventory?.capitalizationHistory).toHaveLength(2);
});
it('reuses native event pricing at the 10,000-event bound and preserves linear sample projection',()=>{
 const history=Array.from({length:10000},(_,index)=>({kaiUPulse:String(BigInt(100+index)*1000000n+500000n),outstandingShareQuantityMicro:String((index+1)*1000000)}));
 const inventory={family:'native',observedAtKaiUPulse:'10100000000',outstandingShareQuantityMicro:'10000000000',historyBasis:'native-events',history} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 let calls=0;const price=()=>{calls++;return '100';};
 const prices=[{pulse:100,at:'2026-10-26T10:00:00Z',usdCents:'100'},{pulse:10100,at:'2026-10-26T10:00:03Z',usdCents:'100'}];
 const first=shareCapitalizationPoints(prices,inventory,price);expect(first.length).toBe(20000);const priced=calls;expect(priced).toBe(10000);
 expect(shareCapitalizationPoints(prices,inventory,price)).toEqual(first);expect(calls).toBe(priced);
});

it('begins at release value times initial purchasable shares, before the first purchased-share record',()=>{
 const inventory={...raw('15000002000000','2000000'),releaseCapitalization:{kaiUPulse:'14900000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'100000000',modelVersion:'market-share-quote-v1'}} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 const prices=[{pulse:14900000,at:'2026-10-18T00:00:00Z',usdCents:'100'},{pulse:15000002,at:'2026-10-26T10:00:00Z',usdCents:'2500'}];
 const points=shareCapitalizationPoints(prices,inventory);expect(points[0]).toMatchObject({pulse:14900000,usdCents:'10000'});expect(points.at(-1)).toMatchObject({pulse:15000002,usdCents:'5000'});
});

it('shows capitalization from release before any sale is required, including unit-value movement between capacity observations',()=>{
 const release={kaiUPulse:'14900000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'100000000',modelVersion:'market-share-quote-v1'},inventory={...raw('15000002000000','0'),releaseCapitalization:release,capitalizationHistory:[{kaiUPulse:'15000002000000',unitPriceUsdCents:'300',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'90000000'}]} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 const prices=[{pulse:14900000,at:'2026-10-18T00:00:00Z',usdCents:'100'},{pulse:14950000,at:'2026-10-21T10:00:00Z',usdCents:'200'},{pulse:15000002,at:'2026-10-26T10:00:00Z',usdCents:'300'}];
 expect(shareCapitalizationPoints(prices,inventory).map(point=>point.usdCents)).toEqual(['10000','20000','27000']);
});

it('keeps release as the opening anchor when a later quote shares its whole-pulse coordinate',()=>{
 const release={kaiUPulse:'14900000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'100000000',modelVersion:'market-share-quote-v1'},inventory={...raw('15000002000000','0'),releaseCapitalization:release,capitalizationHistory:[{...release,availableShareQuantityMicro:'50000000'}]} as unknown as NonNullable<PublicMarketItem['shareInventory']>;
 const points=shareCapitalizationPoints([{pulse:14900000,at:'2026-10-18T00:00:00Z',usdCents:'100'},{pulse:15000002,at:'2026-10-26T10:00:00Z',usdCents:'300'}],inventory);expect(points[0].usdCents).toBe('10000');expect(points.filter(point=>point.kaiUPulse===release.kaiUPulse)).toHaveLength(1);
});
