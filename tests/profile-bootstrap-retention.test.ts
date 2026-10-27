// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {parsePublicProfile,retainedPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
it('reuses the adopted public profile while releasing the duplicate serialized bootstrap',()=>{
 forgetPublicProfile('alexmorgan');const profile=parsePublicProfile(profileFixture(),'alexmorgan');
 const seed=document.createElement('script');seed.id='public-profile-seed';seed.type='application/json';seed.textContent=JSON.stringify(profile);document.body.append(seed);
 const fetcher=vi.spyOn(globalThis,'fetch');
 try{
  const first=retainedPublicProfile('alexmorgan');expect(first?.items).toEqual(profile.items);
  expect(seed.isConnected).toBe(false);expect(seed.textContent).toBe('');
  const second=retainedPublicProfile('alexmorgan');expect(second?.items).toBe(first?.items);expect(fetcher).not.toHaveBeenCalled();
 }finally{forgetPublicProfile('alexmorgan');seed.remove();fetcher.mockRestore();}
});
