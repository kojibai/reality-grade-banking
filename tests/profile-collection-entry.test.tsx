// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import type {HeldCollection,HeldCollectible} from '../src/receiz/collectibles';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const cleanup:Array<()=>void>=[];afterEach(()=>{cleanup.splice(0).forEach(run=>run());vi.restoreAllMocks();forgetPublicProfile('alexmorgan');});
const card={id:'one',ownerUserId:'account-1',title:'One public card',taxonomy:['Sports'],rarity:'Rare',publiclyVisible:true,facts:[],source:{},claim:{},asset:{},appends:[],acquisitions:[],capabilities:[]} as unknown as HeldCollectible;
it('keeps the collection shortcut beside the portrait, preserves profile tabs and opens only the matching owner public view without a source read',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');retainPublicProfile(profile);
 const collection:HeldCollection={status:'ready',accountUserId:profile.userId,cards:[card,{...card,id:'private',title:'Private card',publiclyVisible:false}]};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanup.push(()=>{act(()=>root.unmount());host.remove();});const fetcher=vi.spyOn(globalThis,'fetch');
 const source={catalog:null,status:'ready',pulse:15000000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 await act(async()=>root.render(<PublicProfilePage username="alexmorgan" source={source} collection={collection} initialProfile={profile} active/>));
 const opener=host.querySelector<HTMLButtonElement>('[aria-label="View Alex Morgan’s collection"]');expect(opener).not.toBeNull();expect(opener!.closest('.profile-hero')).not.toBeNull();expect(host.querySelector('.profile-tabs')?.textContent).toContain('Public Activity');expect(host.querySelector('.collection-grid')).toBeNull();
 await act(async()=>opener!.click());await vi.waitFor(()=>expect(host.querySelector('.collection-grid')).not.toBeNull());
 expect(host.querySelector('dialog h2')?.textContent).toBe('Alex Morgan’s collection');expect(host.querySelector('.collection-grid')?.textContent).toContain('One public card');expect(host.querySelector('.collection-grid')?.textContent).not.toContain('Private card');expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>root.render(<PublicProfilePage key="other" username="alexmorgan" source={source} collection={{...collection,accountUserId:'another-account'}} initialProfile={profile} active/>));expect(host.querySelector('.profile-collection-icon')).toBeNull();
});
