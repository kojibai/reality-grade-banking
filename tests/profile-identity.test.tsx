// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {ProfileIdentity} from '../src/public-explorer/ProfileIdentity';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps the main website and branded social icons visible while named links expand locally',async()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.socialLinks=[{label:'Instagram',url:'https://instagram.com/alex'},{label:'GitHub',url:'https://github.com/alex'}];profile.links=[{label:'Studio',url:'https://studio.example/'},{label:'Writing',url:'https://writing.example/'}];
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),fetcher=vi.spyOn(globalThis,'fetch');
 try{await act(()=>root.render(<ProfileIdentity profile={profile}/>));expect(host.querySelector('a[href="https://example.com/"]')).not.toBeNull();expect(host.querySelector('[aria-label="Social profiles"] a[aria-label="Instagram"] svg')).not.toBeNull();expect(host.querySelector('[aria-label="Social profiles"] a[aria-label="GitHub"] svg')).not.toBeNull();expect(host.querySelector('a[href="https://studio.example/"]')).toBeNull();
 expect(host.querySelector('button.profile-id-pill')?.textContent).toBe('More links');
 await act(()=>host.querySelector<HTMLButtonElement>('.profile-identity-handle')!.click());expect(host.querySelector('[aria-label="Receiz identity details"]')).not.toBeNull();
 await act(()=>[...host.querySelectorAll('button')].find(node=>node.textContent==='More links')!.click());expect(host.querySelector('[aria-label="More links"] a')?.textContent).toContain('Studio');expect(fetcher).not.toHaveBeenCalled();
 await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="View PBI authorship evidence"]')!.click());expect(host.textContent).toContain('Authorship verified');expect(host.textContent).not.toContain('device qualified');expect(host.querySelector('[aria-label="More links"]')).toBeNull();
 profile.authorshipVerified=false;await act(()=>root.render(<ProfileIdentity profile={profile}/>));expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).toBeNull();
 await act(()=>host.querySelector<HTMLButtonElement>('.profile-identity-handle')!.click());await act(()=>host.querySelector<HTMLButtonElement>('.profile-identity-handle')!.click());expect(host.querySelector('[aria-label="Receiz identity details"]')?.textContent).toContain('Public identity profile');expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(()=>root.unmount());host.remove();fetcher.mockRestore();}
});
