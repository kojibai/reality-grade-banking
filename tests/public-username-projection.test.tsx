// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {profileFixture} from './fixtures/public-profile';
import {buildDiscoveryIndex} from '../src/public-discover/discovery-index';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {parsePublicMarket} from '../src/receiz/public-market';
import {curatePublicMarketMembership} from '../server/public-market';
import {copyPublicProfileHeader} from '../src/receiz/public-head-cache';
import {ProfileIdentity} from '../src/public-explorer/ProfileIdentity';
import {profilePreviewHtml} from '../server/profile-preview';
import {chatPerson} from '../src/receiz/native-messaging';
import {profileUsernameLabel,publicAccountDisplayName} from '../src/receiz/account-name';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const full='pbahqdfouqyxgsifcy',locator='receiz_'+full.slice(0,17);
function fixture(){const input=profileFixture();Object.assign(input.profile.profile,{username:locator,receivingUsername:full,displayName:locator,displayNameSource:'username'});return input;}
it('carries the source-bound public name through held profile, objects and cold metadata without changing owner or Original IDs',()=>{
 const input=fixture(),profile=parsePublicProfile(input,locator),saved=copyPublicProfileHeader(profile)!;
 expect(saved.receivingUsername).toBe(full);expect(saved.username).toBe(locator);expect(saved.displayName).toBe(full);
 expect(profile.items[0].ownerReceivingUsername).toBe(full);expect(buildDiscoveryIndex(profile.items).people[0].receivingUsername).toBe(full);expect(profile.items[0].ownerUsername).toBe(locator);expect(profile.items[0].id).toBe('profile:'+locator+':work-1');
 const html=profilePreviewHtml('<html><head></head><body><div id="root"></div></body></html>',locator,profile);
 expect(html).toContain('https://bankeiz.com/'+full+'/');expect(html).not.toContain('https://bankeiz.com/'+locator+'/');
 expect(publicAccountDisplayName({username:'custom_name',receivingUsername:full,displayName:'Chosen'})).toBe('Chosen');
 expect(profileUsernameLabel(locator,'q'+full.slice(1))).toBe(locator);
});
it('the same participant projector and profile DOM display every character with no request',async()=>{
 const person=chatPerson({kind:'user',userId:'account-1',username:locator,receivingUsername:full,displayName:locator,displayNameSource:'username'});
 expect(person?.receivingUsername).toBe(full);expect(person?.displayName).toBe(full);
 const profile=parsePublicProfile(fixture(),locator),host=document.createElement('div'),root=createRoot(host),fetcher=vi.spyOn(globalThis,'fetch');document.body.append(host);
 try{await act(()=>root.render(<ProfileIdentity profile={profile}/>));expect(host.querySelector('.profile-identity-handle')?.textContent).toBe('@'+full);await act(()=>host.querySelector<HTMLButtonElement>('.profile-identity-handle')!.click());expect(host.querySelector('.profile-receiz-link')?.getAttribute('href')).toBe('https://receiz.com/'+full);expect(fetcher).not.toHaveBeenCalled();}
 finally{await act(()=>root.unmount());host.remove();fetcher.mockRestore();}
});

it('the real public catalog boundary carries a legacy owner’s full name into held display and Discover',()=>{
 const input=fixture(),owner=input.profile.profile,original=input.profile.originals[0];
 const row={id:'profile:'+locator+':work-1',receizId:'work-1',title:'Original',ownerUsername:locator,ownerReceivingUsername:full,ownerUserId:owner.userId,ownerCreatedAt:'2026-10-20T10:00:00Z',profileOriginal:original};
 const selected=parsePublicMarket(curatePublicMarketMembership({ok:true,transport:{publicOriginals:[row]}}));
 expect(selected.items[0].ownerReceivingUsername).toBe(full);expect(selected.items[0].ownerUsername).toBe(locator);
 expect(buildDiscoveryIndex(selected.items).people[0].receivingUsername).toBe(full);
 expect(parsePublicMarket(curatePublicMarketMembership({ok:true,transport:{publicOriginals:[{...row,ownerReceivingUsername:'x'+full.slice(1)}]}})).items[0].ownerReceivingUsername).toBeUndefined();
});
