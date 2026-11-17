// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {fetchPublicProfile,forgetPublicProfile,forgetPublicProfilesForAccount,parsePublicProfile,retainedPublicProfile,retainPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
vi.mock('../src/features/market/PublicAssetChart',()=>({PublicAssetChart:()=>null}));
vi.mock('../src/receiz/market-projection/usePublicAssetPeriods',()=>({usePublicAssetPeriods:()=>null}));
let root:Root|undefined,element:HTMLDivElement;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(document,'readyState','get').mockReturnValue('complete');vi.stubGlobal('requestIdleCallback',undefined);vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>setTimeout(()=>callback(performance.now()),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);});
const fixture=()=>{const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.items=profile.items.map(item=>({...item,hasPbiSignature:true}));profile.nextCursor=null;return profile;};
const asset=()=>({...fixture().items[0],originalUrl:null,originalDigest:null,ownerAvatarUrl:undefined});
afterEach(async()=>{if(root)await act(()=>root!.unmount());root=undefined;element?.remove();forgetPublicProfile('alexmorgan');document.querySelectorAll('[data-profile-preload]').forEach(node=>node.remove());vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function settle(){await act(()=>vi.advanceTimersByTimeAsync(32));}
async function render(view:React.ReactNode,settled=true){element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(()=>root!.render(view));if(settled)await settle();}
it('paints a carried portrait without reading an offscreen profile before or after load',async()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');
 const request=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json(fixture()));
 await render(<PublicAssetDetail item={{...asset(),ownerAvatarUrl:fixture().avatarUrl}} standalone/>,false);
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe(fixture().avatarUrl);expect(element.querySelector('h1')?.textContent).toBe('Authored title');
 await settle();expect(request).not.toHaveBeenCalled();
 await act(()=>window.dispatchEvent(new Event('load')));expect(request).not.toHaveBeenCalled();
 await settle();expect(request).not.toHaveBeenCalled();expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);
});
it('leaves an asset without starting speculative profile work',async()=>{
 const request=vi.spyOn(globalThis,'fetch');await render(<PublicAssetDetail item={asset()} standalone/>,false);
 await act(()=>root!.render(null));await settle();expect(request).not.toHaveBeenCalled();
});
it('paints the retained owner portrait on the asset with no profile request',async()=>{
 retainPublicProfile(fixture());const request=vi.spyOn(globalThis,'fetch');await render(<PublicAssetDetail item={asset()} standalone/>);
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe('https://receiz.com/artwork/avatar.png');expect(request).not.toHaveBeenCalled();
 await act(()=>root!.render(null));await act(()=>root!.render(<PublicAssetDetail item={asset()} standalone/>));
 expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);expect(request).not.toHaveBeenCalled();
});
it('reads a genuinely missing owner only on profile selection and reuses that collection on return',async()=>{
 let finish!:(response:Response)=>void;const request=vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const source={catalog:null,status:'loading'} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 function Flow(){const [open,setOpen]=useState(false);return open?<><button onClick={()=>setOpen(false)}>Back to asset</button><PublicProfilePage username="alexmorgan" source={source} active/></>:<div onClick={event=>{if((event.target as Element).closest('.asset-profile-byline')){event.preventDefault();setOpen(true);}}}><PublicAssetDetail item={asset()} standalone/></div>;}
 await render(<Flow/>);expect(element.querySelector('h1')?.textContent).toBe('Authored title');expect(request).not.toHaveBeenCalled();
 expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);
 await act(()=>element.querySelector<HTMLAnchorElement>('.asset-profile-byline')!.click());
 expect(request).toHaveBeenCalledExactlyOnceWith('/api/bank/public-profile/alexmorgan',expect.objectContaining({credentials:'omit'}));
 await act(async()=>finish(Response.json(fixture())));
 expect(element.querySelector('h1')?.textContent).toBe('Alex Morgan');expect(element.querySelectorAll('.profile-asset')).toHaveLength(1);
 await act(()=>[...element.querySelectorAll('button')].find(button=>button.textContent==='Back to asset')!.click());
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe('https://receiz.com/artwork/avatar.png');
 await act(()=>element.querySelector<HTMLAnchorElement>('.asset-profile-byline')!.click());
 expect(element.querySelector('h1')?.textContent).toBe('Alex Morgan');expect(element.querySelectorAll('.profile-asset')).toHaveLength(1);expect(request).toHaveBeenCalledTimes(1);
});
it('does not restore an explicitly cleared portrait from an older profile',async()=>{
 retainPublicProfile(fixture());await render(<PublicAssetDetail item={{...asset(),ownerAvatarUrl:null}} standalone/>);expect(element.querySelector('.asset-profile-byline img')).toBeNull();
});
it.each([403,404,409])('keeps the held owner portrait after HTTP %d without retrying in a loop',async status=>{
 const selected=retainPublicProfile(fixture()),now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+16_000);const request=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'PROFILE_PRIVATE'},{status}));
 await render(<PublicAssetDetail item={asset()} standalone/>);const portrait=element.querySelector('.asset-profile-byline img');expect(portrait?.getAttribute('src')).toBe(selected.avatarUrl);expect(request).not.toHaveBeenCalled();
 await act(async()=>{await expect(fetchPublicProfile('alexmorgan')).rejects.toThrow(status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE');});await settle();
 await act(()=>vi.advanceTimersByTimeAsync(60_000));
 expect(element.querySelector('.asset-profile-byline img')).toBe(portrait);expect(retainedPublicProfile('alexmorgan')).toBe(selected);expect(element.querySelector('h1')?.textContent).toBe('Authored title');expect(request).toHaveBeenCalledTimes(1);
});
it('withdraws the portrait only through the existing accepted privacy callback for that owner',async()=>{
 const selected=retainPublicProfile(fixture()),request=vi.spyOn(globalThis,'fetch');await render(<PublicAssetDetail item={asset()} standalone/>);const portrait=element.querySelector('.asset-profile-byline img');expect(portrait).not.toBeNull();
 // native-identity.profile.publish invokes this callback only after the
 // accepted editor result has passed its account UID and lifetime checks.
 await act(()=>forgetPublicProfilesForAccount('f331b3e8-9f00-45a6-9f21-14588bfcb220'));expect(element.querySelector('.asset-profile-byline img')).toBe(portrait);expect(retainedPublicProfile('alexmorgan')).toBe(selected);
 await act(()=>forgetPublicProfilesForAccount(selected.userId));
 expect(element.querySelector('.asset-profile-byline img')).toBeNull();expect(retainedPublicProfile('alexmorgan')).toBeNull();expect(element.querySelector('h1')?.textContent).toBe('Authored title');await act(()=>vi.advanceTimersByTimeAsync(60_000));expect(request).not.toHaveBeenCalled();
});
