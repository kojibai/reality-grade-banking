// @vitest-environment happy-dom
import {afterEach,it,expect,vi} from 'vitest';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {ProfileCollection} from '../src/public-explorer/ProfileCollection';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
vi.mock('../src/features/media/ProofMedia',()=>({ProofMedia:()=> <div data-reader>Existing media reader</div>}));
let root:Root;let element:HTMLDivElement;afterEach(async()=>{if(root)await act(()=>root.unmount());element?.remove();});
it('changes collection columns without fetching and opens media in place',async()=>{
 element=document.createElement('div');document.body.append(element);root=createRoot(element);const fetcher=vi.spyOn(globalThis,'fetch');
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');
 await act(()=>root.render(<ProfileCollection profile={profile} items={profile.items} active/>));
 expect(element.querySelector('.profile-collection-grid')?.getAttribute('data-columns')).toBe('2');
 await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Single-column view"]')!.click());
 expect(element.querySelector('.profile-collection-grid')?.getAttribute('data-columns')).toBe('1');expect(fetcher).not.toHaveBeenCalled();
 await act(()=>element.querySelector<HTMLButtonElement>('[aria-label="Experience Authored title"]')!.click());
 expect(element.querySelector('[data-reader]')).not.toBeNull();expect(element.querySelector('a[href^="/asset/"]')).not.toBeNull();fetcher.mockRestore();
});
it('restores the selected profile section after opening an asset and returning',async()=>{
 const {PublicProfilePage}=await import('../src/public-explorer/PublicProfilePage'),{retainPublicProfile}=await import('../src/receiz/public-profile');const profile=parsePublicProfile(profileFixture(),'alexmorgan');retainPublicProfile(profile);const source={catalog:null,status:'loading'} as unknown as import('react').ComponentProps<typeof PublicProfilePage>['source'];element=document.createElement('div');document.body.append(element);root=createRoot(element);
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active/>));await act(()=>[...element.querySelectorAll('button')].find(node=>node.textContent==='Public Activity')!.click());await act(()=>root.render(<div>Standalone asset</div>));await act(()=>root.render(<PublicProfilePage username="alexmorgan" source={source} active/>));expect([...element.querySelectorAll('.profile-tabs button')].find(node=>node.getAttribute('aria-selected')==='true')?.textContent).toBe('Public Activity');
});
