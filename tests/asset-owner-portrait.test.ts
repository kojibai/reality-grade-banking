import {expect,it} from 'vitest';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {retainAssetOwnerPortrait} from '../src/receiz/public-asset-page';
import {profileFixture} from './fixtures/public-profile';

it('preserves a carried owner portrait through lighter quote rows without carrying it across owners or explicit clears',()=>{
 const original=parsePublicProfile(profileFixture(),'alexmorgan').items[0],quote={...original,ownerAvatarUrl:undefined,priceUsd:42};
 expect(retainAssetOwnerPortrait(quote,original)).toMatchObject({priceUsd:42,ownerAvatarUrl:original.ownerAvatarUrl});
 for(const changed of [{...quote,ownerUsername:'someoneelse'},{...quote,originalDigest:'c'.repeat(64)},{...quote,ownerAvatarUrl:null}])expect(retainAssetOwnerPortrait(changed,original)).toBe(changed);
});
