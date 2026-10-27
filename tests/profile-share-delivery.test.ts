import {it,expect,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {profileGrowthRows,buildProfileGrowth} from '../src/receiz/market-projection/profile-growth';
import {createPublicProfileReader} from '../server/public-profile';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import {withProfileShareHistory} from '../server/profile-share-history';
import type {PublicShareInventory} from '../src/receiz/market-share-inventory';
const raw=profileFixture();raw.profile.originalsPage={hasMore:false,nextCursor:''};raw.profile.originals[0].id='artifact-1';raw.profile.originals[0].pulse='14000000';
const seed={kind:'sigil' as const,claimPulse:14000000,beat:2,stepIndex:3,creatorVerified:true};
const source=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:alexmorgan:artifact-1',receizId:'artifact-1',title:'Original',pulse:'14000000',livePulseSeed:seed,valueUsd:1}]}}).items[0];
const inventory:PublicShareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:source.id,assetId:source.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'15001000000000',outstandingShareQuantityMicro:'2000000',positionsMicro:'2000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'3000000',availability:'quote-capacity',releaseCapitalization:{kaiUPulse:'14000000000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'5000000',modelVersion:'market-share-quote-v1'},capitalizationHistory:[]};
it('carries the existing share tape in the first profile response with no extra source request',async()=>{
 const fetcher=vi.fn(async()=>Response.json(raw));
 const read=createPublicProfileReader(fetcher,async profile=>withProfileShareHistory(profile,[inventory]));
 const profile=await read('alexmorgan');
 expect(profile.items[0].shareInventory).toMatchObject({assetId:'artifact-1',availableShareQuantityMicro:'3000000'});
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('uses canonical asset identity and preserves newer observations rather than replacing them with a shipped capture',async()=>{
 const profile={...parsePublicProfile(raw,'alexmorgan'),items:[source]};
 const first=withProfileShareHistory(profile,[inventory]);
 const history=await buildProfileGrowth(profileGrowthRows(first.items,null)!,15001001);
 expect(history!.series.ALL.every(point=>point.capitalizationUsdCents!==null)).toBe(true);
 expect(withProfileShareHistory(profile,[{...inventory,assetId:'foreign'}]).items[0].shareInventory).toBeUndefined();
 const newer={...inventory,observedAtKaiUPulse:'15002000000000',outstandingShareQuantityMicro:'4000000',positionsMicro:'4000000'};
 const current={...profile,items:[{...source,shareInventory:newer}]};
 expect(withProfileShareHistory(current,[inventory]).items[0].shareInventory?.observedAtKaiUPulse).toBe(newer.observedAtKaiUPulse);
});

it('withholds contradictory captured supply and never replaces a live observation at the same coordinate',()=>{
 const profile={...parsePublicProfile(raw,'alexmorgan'),items:[source]};
 const conflict={...inventory,positionsMicro:'3000000',outstandingShareQuantityMicro:'3000000'};
 expect(withProfileShareHistory(profile,[inventory,conflict]).items[0].shareInventory).toBeUndefined();
 const current={...profile,items:[{...source,shareInventory:conflict}]};
 expect(withProfileShareHistory(current,[inventory]).items[0].shareInventory).toBe(conflict);
});
