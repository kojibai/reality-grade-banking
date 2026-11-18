import {expect,it} from 'vitest';
import {governanceLocation,governancePath} from '../src/receiz/governance-links';
import {governanceKinds} from '../src/receiz/governance-documents';
import {permittedNativePath} from '../src/receiz/native-transport';
const digest='a1'.repeat(32);
it('round trips every standalone Original, nested public page and legacy shared link',()=>{
 for(const kind of governanceKinds){const path=governancePath(kind,digest);expect(governanceLocation(new URL(path,'https://bankeiz.com'))).toBe(digest);}
 expect(governanceLocation(new URL('https://bankeiz.com/vote/?original='+digest))).toBe(digest);
 expect(governanceLocation(new URL('https://bankeiz.com/vote/anything/'+digest))).toBeNull();
 expect(governanceLocation(new URL('https://bankeiz.com/vote/charters/short'))).toBeNull();
 expect(permittedNativePath('/api/public-proof/bankeiz-voting-'+digest,'GET')).toBe(true);
 expect(permittedNativePath('/api/public-proof/bankeiz-voting-'+digest,'POST')).toBe(false);
});
