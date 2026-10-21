// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
const seal='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg">'+' '.repeat(4000)+'</svg>');
async function helpers(){const mod=await import('../src/receiz/profile-avatar').catch(()=>null);expect(typeof mod?.identityProfileAvatar).toBe('function');return mod!;}
it('uses the admitted profile image or carried seal artwork immediately without opening the backup or making a profile request',async()=>{
 const {identityProfileAvatar}=await helpers(),fetch=vi.fn(),backup=vi.fn();vi.stubGlobal('fetch',fetch);
 const identity={backup,localHistory:{portableStateVerified:true,verifiedState:{profile:{avatarUrl:'https://receiz.com/photo.png'},profileView:{profile:{avatarUrl:seal}}}}} as unknown as OpenIdentity;
 expect(identityProfileAvatar(identity)).toBe('https://receiz.com/photo.png');
 (identity.localHistory.verifiedState as {profile:{avatarUrl:string|null}}).profile.avatarUrl=null;
 expect(identityProfileAvatar(identity)).toBe(seal);expect(fetch).not.toHaveBeenCalled();expect(backup).not.toHaveBeenCalled();
 identity.localHistory.portableStateVerified=false;expect(identityProfileAvatar(identity)).toBeNull();
});
it('preserves complete carried seal images and rejects non-image or credential-bearing sources',async()=>{
 const {profileAvatarUrl}=await helpers();expect(profileAvatarUrl(seal)).toBe(seal);expect(profileAvatarUrl('/api/receiz/image/avatar.png')).toBe('https://receiz.com/api/receiz/image/avatar.png');
 const {chatPerson}=await import('../src/receiz/native-messaging');expect(chatPerson({kind:'user',userId:'peer',avatarUrl:seal})?.avatarUrl).toBe(seal);
 for(const source of ['javascript:alert(1)','data:text/html,private','https://user:secret@receiz.com/avatar.png','//other.test/image.png'])expect(profileAvatarUrl(source)).toBeNull();
});
it('keeps a readable fallback after an image fails and clears the failed source when the person changes',async()=>{
 const mod=await import('../src/components/ProfileAvatar').catch(()=>({ProfileAvatar:null}));expect(mod.ProfileAvatar).not.toBeNull();const ProfileAvatar=mod.ProfileAvatar!;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<ProfileAvatar src="https://receiz.com/first.png" name="Mira Chen"/>));
  expect(host.querySelector('img')?.getAttribute('referrerpolicy')).toBe('no-referrer');
  act(()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')).toBeNull();expect(host.textContent).toBe('MC');
  act(()=>root.render(<ProfileAvatar src={seal} name="Noah"/>));expect(host.querySelector('img')?.getAttribute('src')).toBe(seal);
 }finally{act(()=>root.unmount());}
});

it('respects a confirmed removed portrait instead of reviving older messaging or sealed artwork',async()=>{
 const {identityProfileAvatar}=await helpers();const identity={knownProfile:()=>({avatarUrl:null}),localHistory:{portableStateVerified:true,verifiedState:{profile:{avatarUrl:'https://receiz.com/old.png'}}}} as unknown as OpenIdentity;expect(identityProfileAvatar(identity)).toBeNull();
});
