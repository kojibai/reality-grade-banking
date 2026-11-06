import {expect,it} from 'vitest';
import {mergeShareInventory,type PublicShareInventory} from '../src/receiz/market-share-inventory';

const inventory=():PublicShareInventory=>({schema:'receiz.market.share-inventory.v1',marketItemId:'one',assetId:'asset-one',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15000000000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'4000000',availability:'quote-capacity',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',historyBasis:'recorded-transactions',releaseCapitalization:{kaiUPulse:'14000000000000',unitPriceUsdCents:'1234',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'5000000',modelVersion:'market-share-quote-v1'}});

it('keeps an accepted compatible release checkpoint while adopting the later current quantities',()=>{
 const previous=inventory(),next={...inventory(),observedAtKaiUPulse:'15000001000000',outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',availableShareQuantityMicro:'3000000',releaseCapitalization:{...previous.releaseCapitalization!,availableShareQuantityMicro:'4000000'}};
 const merged=mergeShareInventory(previous,next)!;
 expect(merged.releaseCapitalization).toBe(previous.releaseCapitalization);
 expect(merged).toMatchObject({observedAtKaiUPulse:next.observedAtKaiUPulse,outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',availableShareQuantityMicro:'3000000'});
 expect(next.releaseCapitalization.availableShareQuantityMicro).toBe('4000000');
});

it.each(['kaiUPulse','unitPriceUsdCents','outstandingShareQuantityMicro','modelVersion'] as const)('does not inherit a release with a different %s',key=>{
 const previous=inventory(),release={...previous.releaseCapitalization!,[key]:key==='modelVersion'?'other-model':key==='kaiUPulse'?'14000001000000':key==='unitPriceUsdCents'?'1235':'1'},next={...inventory(),observedAtKaiUPulse:'15000001000000',releaseCapitalization:release};
 expect(mergeShareInventory(previous,next)?.releaseCapitalization).toBe(release);
});

it.each(['marketItemId','assetId','family','nativeAssetId','issuanceSourceSha256'] as const)('does not inherit a release across a changed %s binding',key=>{
 const previous=inventory(),next={...inventory(),[key]:key==='family'?'native':'other',observedAtKaiUPulse:'15000001000000',releaseCapitalization:undefined} as PublicShareInventory;
 expect(mergeShareInventory(previous,next)).toBe(next);
 expect(mergeShareInventory(previous,next)?.releaseCapitalization).toBeUndefined();
});
