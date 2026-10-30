import {expect,it} from 'vitest';
import {readPublicShareInventory,shareCapitalizationUsdCents,shareQuantityAtPulse,publicShareCapitalization} from '../src/receiz/market-share-inventory';
import type {PublicMarketItem,PublicMarketCatalog} from '../src/receiz/public-market';
const item=(extra:Partial<PublicMarketItem>={})=>({id:'profile:one:asset',assetId:'asset',category:'proof',priceUsd:12.34,...extra}) as PublicMarketItem;
const inventory=(extra:Record<string,unknown>={})=>({schema:'receiz.market.share-inventory.v1',marketItemId:'profile:one:asset',assetId:'asset',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15000000000000',outstandingShareQuantityMicro:'2500000',availableShareQuantityMicro:'4000000',positionsMicro:'2000000',certificatesMicro:'500000',reservedBuyMicro:'1000000',availability:'quote-capacity',...extra});
it('retains exact issued quantities while separating unissued buying reservations',()=>{
 const parsed=readPublicShareInventory(inventory(),item());expect(parsed?.outstandingShareQuantityMicro).toBe('2500000');expect(parsed?.reservedBuyMicro).toBe('1000000');expect(shareCapitalizationUsdCents('1234','2500000')).toBe('3085');
 expect(readPublicShareInventory(inventory({outstandingShareQuantityMicro:'3500000'}),item())).toBeNull();
});
it('keeps unknown quantity unknown and rejects a mismatched asset or invented zero',()=>{
 expect(readPublicShareInventory(undefined,item())).toBeNull();expect(readPublicShareInventory(inventory({assetId:'other'}),item())).toBeNull();expect(readPublicShareInventory(inventory({positionsMicro:'invalid'}),item())).toBeNull();
 expect(readPublicShareInventory(inventory({positionsMicro:'0',certificatesMicro:'0',outstandingShareQuantityMicro:'0'}),item())?.outstandingShareQuantityMicro).toBe('0');
});
it('keeps native supply above subordinate Market observations and does not add asks to it',()=>{
 const native=item({nativeAsset:{id:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),headSourceSha256:'c'.repeat(64),publicCertificateSha256:'d'.repeat(64)}});
 expect(readPublicShareInventory(inventory(),native)).toBeNull();
 const raw=inventory({family:'native',nativeAssetId:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),sourceHeadSha256:'c'.repeat(64),outstandingShareQuantityMicro:'100000000',availableShareQuantityMicro:'40000000',availability:'open-offers'});
 expect(readPublicShareInventory(raw,native)?.outstandingShareQuantityMicro).toBe('100000000');expect(readPublicShareInventory({...raw,availableShareQuantityMicro:'101000000'},native)).toBeNull();
});
it('counts each canonical asset once, including all issued fractional shares',()=>{
 const a=item();a.shareInventory=readPublicShareInventory(inventory(),a)!;
 const alias={...a,id:'profile:two:asset'};const catalog={items:[a,alias],complete:true} as PublicMarketCatalog;
 expect(publicShareCapitalization(catalog)).toMatchObject({usdCents:'8021',covered:1,listed:1,complete:true});
});
it('carries the exact operands of the existing sum once per included asset without changing its result',()=>{
 const a=item({title:'An Original'});a.shareInventory=readPublicShareInventory(inventory(),a)!;
 const card=item({id:'card',assetId:'card',title:'A card',category:'sports',priceUsd:9.99,capitalizationUsdCents:'12345',circulationCount:4}),catalog={items:[a,{...a,id:'alias'},card],complete:true,sportsCoverage:'complete'} as PublicMarketCatalog;
 const rows:unknown[]=[];
 const sum=publicShareCapitalization(catalog,(row)=>rows.push(row));
 expect(sum).toEqual(publicShareCapitalization(catalog));expect(sum.usdCents).toBe('20366');
 expect(rows).toHaveLength(2);
 expect(rows[0]).toMatchObject({item:a,unitPriceUsdCents:'1234',quantityMicro:'6500000',usdCents:'8021',runningTotalUsdCents:'8021'});
 expect(rows[1]).toMatchObject({item:card,unitPriceUsdCents:'999',quantityMicro:null,usdCents:'12345',runningTotalUsdCents:'20366',basis:'carried-collectible-aggregate'});
});
it('preserves sports aggregate-copy capitalization and reports missing share coverage',()=>{
 const sports=item({id:'sports:one',assetId:'card',category:'sports',capitalizationUsdCents:'9876',circulationCount:8});
 expect(publicShareCapitalization({items:[sports,item()],complete:true}as PublicMarketCatalog)).toMatchObject({usdCents:'9876',covered:1,listed:2,complete:false});
});
it('does not invent earlier outstanding quantities from the current snapshot',()=>{
 const parsed=readPublicShareInventory(inventory(),item())!;
 expect(shareQuantityAtPulse(parsed,14999999)).toBeNull();expect(shareQuantityAtPulse(parsed,15000000)).toBe('2500000');
 const withHistory=readPublicShareInventory(inventory({history:[{kaiUPulse:'14900000000000',outstandingShareQuantityMicro:'1000000'},{kaiUPulse:'15000000000000',outstandingShareQuantityMicro:'2500000'}]}),item())!;
 expect(shareQuantityAtPulse(withHistory,14950000)).toBeNull();expect(shareQuantityAtPulse(withHistory,14899999)).toBeNull();
});
it('uses exact microshare arithmetic beyond floating point precision',()=>{
 expect(shareCapitalizationUsdCents('123456','9007199254740993')).toBe(((123456n*9007199254740993n+500000n)/1000000n).toString());
});

it('rejects mismatched capacity arithmetic and keeps a missing quote unknown',()=>{
 expect(readPublicShareInventory(inventory({availableShareQuantityMicro:null}),item())?.availableShareQuantityMicro).toBeNull();
 expect(readPublicShareInventory(inventory({capacity:{askPriceUsdCents:'1234',hardCapUsdCents:'1000',openInterestUsdCents:'1000',maxSingleTradeUsdCents:'500'}}),item())).toBeNull();
 expect(readPublicShareInventory(inventory({availableShareQuantityMicro:'0',maxPurchaseShareQuantityMicro:'0',capacity:{askPriceUsdCents:'1234',hardCapUsdCents:'1000',openInterestUsdCents:'1000',maxSingleTradeUsdCents:'500'}}),item())?.availableShareQuantityMicro).toBe('0');
});
it('does not choose an arbitrary capitalization when simultaneous aliases disagree',()=>{
 const a=item();a.shareInventory=readPublicShareInventory(inventory(),a)!;
 const b=item({id:'alias'});b.shareInventory=readPublicShareInventory(inventory({marketItemId:'alias',positionsMicro:'3000000',outstandingShareQuantityMicro:'3500000'}),b)!;
 expect(publicShareCapitalization({items:[a,b],complete:true}as PublicMarketCatalog)).toMatchObject({covered:0,complete:false});
});

it('includes available capacity in generic cap, keeps unknown coverage unknown, and never doubles native asks',()=>{
 const generic=item();generic.shareInventory=readPublicShareInventory(inventory(),generic)!;
 expect(publicShareCapitalization({items:[generic],complete:true}as PublicMarketCatalog).usdCents).toBe('8021');
 generic.shareInventory=readPublicShareInventory(inventory({availableShareQuantityMicro:null}),generic)!;
 expect(publicShareCapitalization({items:[generic],complete:true}as PublicMarketCatalog).covered).toBe(0);
 const native=item({nativeAsset:{id:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),headSourceSha256:'c'.repeat(64),publicCertificateSha256:'d'.repeat(64)}});
 native.shareInventory=readPublicShareInventory(inventory({family:'native',nativeAssetId:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),sourceHeadSha256:'c'.repeat(64),outstandingShareQuantityMicro:'100000000',availableShareQuantityMicro:'40000000',availability:'open-offers'}),native)!;
 expect(publicShareCapitalization({items:[native],complete:true}as PublicMarketCatalog).usdCents).toBe('123400');
});

it('binds release capitalization to the asset’s own release pulse',()=>{
 const release={kaiUPulse:'14900000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'100000000',modelVersion:'market-share-quote-v1'};
 expect(readPublicShareInventory(inventory({releaseCapitalization:release}),item({pulse:'14900000'}))?.releaseCapitalization).toEqual(release);
 expect(readPublicShareInventory(inventory({releaseCapitalization:release}),item({pulse:'14900001'}))).toBeNull();
 expect(readPublicShareInventory(inventory({releaseCapitalization:{...release,unitPriceUsdCents:'0'}}),item({pulse:'14900000'}))).toBeNull();
 expect(readPublicShareInventory(inventory({releaseCapitalization:{...release,availableShareQuantityMicro:'0'}}),item({pulse:'14900000'}))).toBeNull();
});

it('discloses the exact operands of the existing capacity calculation including observation price and cent rounding',async()=>{
 const {prepareShareCapitalizationAtPulse}=await import('../src/receiz/market-share-chart');
 const source=readPublicShareInventory(inventory({capitalizationHistory:[{kaiUPulse:'15000000000000',unitPriceUsdCents:'1234',outstandingShareQuantityMicro:'2500000',availableShareQuantityMicro:'4000000'}]}),item())!;
 let trace:unknown;
 expect(prepareShareCapitalizationAtPulse(source)(15000000,'9999',value=>{trace=value;})).toBe('8021');
 expect(trace).toEqual({sourceKaiUPulse:'15000000000000',unitPriceUsdCents:'1234',outstandingShareQuantityMicro:'2500000',availableShareQuantityMicro:'4000000',quantityMicro:'6500000',usdCents:'8021'});
 expect(prepareShareCapitalizationAtPulse(source)(15000001,'200',value=>{trace=value;})).toBe('1300');
 expect(trace).toMatchObject({unitPriceUsdCents:'200',quantityMicro:'6500000',usdCents:'1300'});
});

it('keeps a known native pre-issuance zero explainable instead of reporting missing share history',async()=>{
 const {prepareShareCapitalizationAtPulse}=await import('../src/receiz/market-share-chart');
 const native=item({nativeAsset:{id:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),headSourceSha256:'c'.repeat(64),publicCertificateSha256:'d'.repeat(64)}}),source=readPublicShareInventory(inventory({family:'native',nativeAssetId:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),sourceHeadSha256:'c'.repeat(64),outstandingShareQuantityMicro:'100000000',availableShareQuantityMicro:'40000000',availability:'open-offers',observedAtKaiUPulse:'15000001000000',history:[{kaiUPulse:'15000000500000',outstandingShareQuantityMicro:'100000000'}]}),native)!;
 let trace:unknown;expect(prepareShareCapitalizationAtPulse(source)(15000000,'1234',value=>{trace=value;})).toBe('0');
 expect(trace).toMatchObject({quantityMicro:'0',usdCents:'0',beforeIssuance:true});
});
