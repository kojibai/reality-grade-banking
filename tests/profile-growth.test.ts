import {expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {CHART_PERIODS} from '../src/core/chart-history';
import {buildProfileGrowth,profileGrowthRows} from '../src/receiz/market-projection/profile-growth';
import {profileCollectionPrices,profileCollectionReturn} from '../src/public-explorer/profile-prices';
import {marketPulseTime} from '../src/receiz/market-projection/project';
import {prepareShareCapitalizationAtPulse} from '../src/receiz/market-share-chart';
import {publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import type {PublicShareInventory} from '../src/receiz/market-share-inventory';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
const seed={kind:'sigil' as const,claimPulse:14_000_000,beat:2,stepIndex:3,creatorVerified:true};
const items=parsePublicMarket({ok:true,transport:{publicOriginals:[
 {id:'a',receizId:'a',title:'First',pulse:String(seed.claimPulse),livePulseSeed:seed,valueUsd:1},
 {id:'b',receizId:'b',title:'Second',pulse:'15000000',livePulseSeed:{...seed,claimPulse:15_000_000},valueUsd:1},
]}}).items;
it('replays the entire current collection and matches the weighted Total without counting new principal as growth',async()=>{
 const rows=profileGrowthRows(items,null)!,end=15_001_000,history=(await buildProfileGrowth(rows,end))!;
 const priced=profileCollectionPrices(items,null,null,end);
 for(const period of CHART_PERIODS){const points=history.series[period];expect(points.length).toBeLessThanOrEqual(64);expect(points.at(-1)?.pulse).toBe(end);expect(points.at(-1)?.percent).toBeCloseTo(profileCollectionReturn(priced,null,period)!,8);expect(points[0].percent).toBeCloseTo(0,8);for(const p of points)expect(Date.parse(p.at)).toBe(marketPulseTime(p.pulse));}
 expect(history.series.ALL[0]).toMatchObject({pulse:seed.claimPulse,percent:0});
 const secondOnly=(await buildProfileGrowth([rows[1]],15_000_000))!;expect(secondOnly.series.ALL).toHaveLength(1);expect(secondOnly.series.ALL[0].percent).toBe(0);
 expect(history.series['1D'][0].pulse).toBeGreaterThan(history.series.ALL[0].pulse);
});
it('retains completed curves when advancing locally, refuses partial sources and stops a superseded build',async()=>{
 const rows=profileGrowthRows(items,null)!,first=(await buildProfileGrowth(rows,15_001_000))!,next=(await buildProfileGrowth(rows,15_001_001,first))!;
 expect(next.series.ALL[20]).toBe(first.series.ALL[20]);expect(next.series.ALL.at(-1)?.pulse).toBe(15_001_001);
 for(const period of CHART_PERIODS)expect(next.series[period].at(-1)?.percent).toBeCloseTo(profileCollectionReturn(profileCollectionPrices(items,null,null,15_001_001),null,period)!,8);
 expect(profileGrowthRows([{...items[0],livePulseSeed:undefined}],null)).toBeNull();
 await expect(buildProfileGrowth(rows,seed.claimPulse)).rejects.toThrow();
 expect(await buildProfileGrowth(rows,15_001_000,null,()=>false)).toBeNull();
});

it('composes capitalization from the same original quotes and held supply history without substituting a partial total',async()=>{
 const inventory:PublicShareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:items[0].id,assetId:items[0].assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15001000000000',outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'3000000',availability:'quote-capacity',releaseCapitalization:{kaiUPulse:'14000000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'5000000',modelVersion:'market-share-quote-v1'},capitalizationHistory:[{kaiUPulse:'15000000000000',unitPriceUsdCents:'200',outstandingShareQuantityMicro:'2000000',availableShareQuantityMicro:'3000000'}]};
 const original={...items[0],shareInventory:inventory},history=(await buildProfileGrowth(profileGrowthRows([original],null)!,15_001_000))!,at=prepareShareCapitalizationAtPulse(inventory);
 for(const point of history.series.ALL){const quote=publicSigilQuoteAtPulse(seed,point.pulse).priceUsd;expect(point.usd).toBe(quote);expect(point.capitalizationUsdCents).toBe(at(point.pulse,String(Math.round(quote*100))));}
 const incomplete=(await buildProfileGrowth(profileGrowthRows([original,items[1]],null)!,15_001_000))!;
 expect(incomplete.series.ALL.at(-1)?.capitalizationUsdCents).toBeNull();
 expect(incomplete.series.ALL[0].capitalizationUsdCents).not.toBeNull();
});

it('reuses canonical asset share records after a public artifact append changes its file digest',()=>{
 const original={...items[0],originalDigest:'a'.repeat(64)},quote={...original,id:'another-public-alias',originalDigest:'b'.repeat(64),livePulseSeed:{...seed,creatorVerified:false}};
 const inventory:PublicShareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:quote.id,assetId:original.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15001000000000',outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'3000000',availability:'quote-capacity'};
 const catalog={items:[{...quote,shareInventory:inventory}]} as PublicMarketCatalog,rows=profileGrowthRows([original],null,catalog)!;
 expect(rows[0].shareInventory).toMatchObject({marketItemId:original.id,assetId:original.assetId,outstandingShareQuantityMicro:'2000000',availableShareQuantityMicro:'3000000'});
 expect(rows[0].seed.creatorVerified).toBe(true);
 expect(profileGrowthRows([original],null,{items:[{...quote,assetId:'different-original',shareInventory:{...inventory,assetId:'different-original'}}]} as PublicMarketCatalog)![0].shareInventory).toBeUndefined();
 const conflicting={...quote,id:'conflicting-alias',shareInventory:{...inventory,marketItemId:'conflicting-alias',positionsMicro:'1000000',outstandingShareQuantityMicro:'1000000'}};
 expect(profileGrowthRows([original],null,{items:[{...quote,shareInventory:inventory},conflicting]} as PublicMarketCatalog)![0].shareInventory).toBeUndefined();
 expect(profileGrowthRows([{...original,shareInventory:{...inventory,marketItemId:original.id}}],null,{items:[{...quote,shareInventory:inventory},conflicting]} as PublicMarketCatalog)![0].shareInventory).toBeUndefined();
});

it('keeps the cap unknown before a first observation when the source supplies no release capacity',async()=>{
 const inventory:PublicShareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:items[0].id,assetId:items[0].assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15001000000000',outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'3000000',availability:'quote-capacity',capitalizationHistory:[{kaiUPulse:'15000000000000',unitPriceUsdCents:'200',outstandingShareQuantityMicro:'2000000',availableShareQuantityMicro:'3000000'}]};
 const history=(await buildProfileGrowth(profileGrowthRows([{...items[0],shareInventory:inventory}],null)!,15001000))!;
 expect(history.series.ALL[0].usd).toBeGreaterThan(0);expect(history.series.ALL[0].capitalizationUsdCents).toBeNull();expect(history.series.ALL.at(-1)?.capitalizationUsdCents).not.toBeNull();
});

it('retains the input fingerprint across pulse-only updates and fingerprints a new input revision once',async()=>{
 const digest=vi.spyOn(crypto.subtle,'digest'),rows=profileGrowthRows(items,null)!;
 try{const first=(await buildProfileGrowth(rows,15001000))!;await buildProfileGrowth(rows,15001001,first);expect(digest).toHaveBeenCalledOnce();await buildProfileGrowth(profileGrowthRows(items,null)!,15001002,first);expect(digest).toHaveBeenCalledTimes(2);}finally{digest.mockRestore();}
});

it('retains the exact current quote and period contributions for independent arithmetic without replaying on disclosure',async()=>{
 const rows=profileGrowthRows(items,null)!,history=(await buildProfileGrowth(rows,15001000))!;
 expect(history.calculation).toBeDefined();
 expect(history.calculation!.summationOrder).toEqual([0,1]);
 for(const period of CHART_PERIODS){
  const exact=history.calculation!,last=history.series[period].at(-1)!;
  expect(exact.current.reduce((sum,row)=>sum+row.usd,0)).toBeCloseTo(last.usd,8);
  expect(exact.startingUsd[period].reduce((sum,value)=>sum+value,0)).toBeCloseTo(last.basisUsd!,8);
  expect((last.usd/last.basisUsd!-1)*100).toBe(last.percent);
  const prefix=exact.startingTotals![period];expect(prefix.openingUsd+prefix.currentBirthPrefixUsd-prefix.openingBirthPrefixUsd).toBe(last.basisUsd);
  for(const quote of exact.current)expect(Math.round(quote.phi*quote.usdPerPhi*100)/100).toBe(quote.usd);
 }
 // New originals contribute their own creation principal, not zero.
 expect(history.calculation!.startingUsd.ALL).toEqual(rows.map(row=>row.birthUsd));
 const next=(await buildProfileGrowth(rows,15001001,history))!;
 expect(next.calculation!.current).toHaveLength(2);
 expect(next.calculation!.current[0].usd).not.toBe(history.calculation!.current[0].usd);
});
