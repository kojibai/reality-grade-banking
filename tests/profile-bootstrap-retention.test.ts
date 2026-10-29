// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {parsePublicProfile,retainedPublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
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
it('publishes carried profile metadata once navigation is ready and never replays a replaced or removed source',()=>{
 forgetPublicProfile('alexmorgan');const ready=vi.spyOn(document,'readyState','get').mockReturnValue('loading'),seen:any[]=[];
 const listener=(event:Event)=>seen.push((event as CustomEvent).detail);addEventListener('bankeiz:profile-metadata',listener);
 try{
  const first=parsePublicProfile(profileFixture(),'alexmorgan');retainPublicProfile(first);expect(seen).toHaveLength(0);
  retainPublicProfile({...first,displayName:'Current name'});expect(seen).toHaveLength(0);
  document.dispatchEvent(new Event('DOMContentLoaded'));expect(seen.map(row=>row.title)).toEqual(['Current name']);
  retainPublicProfile({...first,displayName:'Removed source'});forgetPublicProfile('alexmorgan');document.dispatchEvent(new Event('DOMContentLoaded'));expect(seen).toHaveLength(1);
 }finally{ready.mockRestore();removeEventListener('bankeiz:profile-metadata',listener);forgetPublicProfile('alexmorgan');}
});
it('keeps metadata through the interactive document stage before the navigation listener is installed',()=>{
 forgetPublicProfile('alexmorgan');const ready=vi.spyOn(document,'readyState','get').mockReturnValue('interactive'),seen:any[]=[];
 const navigation=document.createElement('script');navigation.id='receiz-navigation';navigation.textContent='{"pages":[]}';document.body.append(navigation);
 const listener=(event:Event)=>seen.push((event as CustomEvent).detail);addEventListener('bankeiz:profile-metadata',listener);
 try{
  retainPublicProfile(parsePublicProfile(profileFixture(),'alexmorgan'));expect(seen).toHaveLength(0);
  navigation.textContent='';document.dispatchEvent(new Event('DOMContentLoaded'));expect(seen).toHaveLength(1);
  retainPublicProfile({...parsePublicProfile(profileFixture(),'alexmorgan'),displayName:'After navigation'});expect(seen.map(row=>row.title)).toEqual(['Alex Morgan','After navigation']);
 }finally{ready.mockRestore();navigation.remove();removeEventListener('bankeiz:profile-metadata',listener);forgetPublicProfile('alexmorgan');}
});
