import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ShareInventory} from '../src/features/market/ShareInventory';
import type {PublicMarketItem} from '../src/receiz/public-market';
it('distinguishes zero shares already held from remaining buying capacity',()=>{
 const item={id:'a',assetId:'a',category:'proof',priceUsd:1,shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:'a',assetId:'a',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'9000000',positionsMicro:'0',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'}} as PublicMarketItem;
 const html=renderToStaticMarkup(<ShareInventory item={item}/>);expect(html).toContain('<span>Shares held</span>');expect(html).toContain('<span>Available to buy</span>');expect(html).toContain('>9<small> shares</small>');expect(html).toContain('>0</strong>');
});
it('keeps native issued supply distinct from its open sell offers',()=>{
 const binding={id:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),headSourceSha256:'c'.repeat(64),publicCertificateSha256:'d'.repeat(64)};
 const item={id:'native-one',assetId:'native-one',category:'proof',priceUsd:2,nativeAsset:binding,shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:'native-one',assetId:'native-one',family:'native',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'10000000',availableShareQuantityMicro:'4000000',availability:'open-offers',nativeAssetId:binding.id,issuanceSourceSha256:binding.issuanceSourceSha256,sourceHeadSha256:binding.headSourceSha256}} as PublicMarketItem;
 const html=renderToStaticMarkup(<ShareInventory item={item}/>);expect(html).toContain('<span>Issued shares</span>');expect(html).toContain('<span>Open sell offers</span>');expect(html).toContain('>10</strong>');expect(html).toContain('>4<small> shares</small>');expect(html).toContain('$20.00');
});
