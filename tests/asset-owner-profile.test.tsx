// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {forgetPublicProfile,parsePublicProfile,retainPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
vi.mock('../src/features/market/PublicAssetChart',()=>({PublicAssetChart:()=>null}));
vi.mock('../src/receiz/market-projection/usePublicAssetPeriods',()=>({usePublicAssetPeriods:()=>null}));
let root:Root|undefined,element:HTMLDivElement;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(document,'readyState','get').mockReturnValue('complete');vi.stubGlobal('requestIdleCallback',undefined);vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>setTimeout(()=>callback(performance.now()),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);});
const fixture=()=>{const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.nextCursor=null;return profile;};
const asset=()=>({...fixture().items[0],originalUrl:null,originalDigest:null,ownerAvatarUrl:undefined});
afterEach(async()=>{if(root)await act(()=>root!.unmount());root=undefined;element?.remove();forgetPublicProfile('alexmorgan');document.querySelectorAll('[data-profile-preload]').forEach(node=>node.remove());vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function settle(){await act(()=>vi.advanceTimersByTimeAsync(32));}
async function render(view:React.ReactNode,settled=true){element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(()=>root!.render(view));if(settled)await settle();}
it('paints a carried portrait before load and prepares the linked profile only after load and a frame',async()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');
 const request=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json(fixture()));
 await render(<PublicAssetDetail item={{...asset(),ownerAvatarUrl:fixture().avatarUrl}} standalone/>,false);
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe(fixture().avatarUrl);expect(element.querySelector('h1')?.textContent).toBe('Authored title');
 await settle();expect(request).not.toHaveBeenCalled();
 await act(()=>window.dispatchEvent(new Event('load')));expect(request).not.toHaveBeenCalled();
 await settle();expect(request).toHaveBeenCalledTimes(1);expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);
});
it('cancels profile preparation when leaving the asset before it settles',async()=>{
 const request=vi.spyOn(globalThis,'fetch');await render(<PublicAssetDetail item={asset()} standalone/>,false);
 await act(()=>root!.render(null));await settle();expect(request).not.toHaveBeenCalled();
});
it('paints the retained owner portrait on the asset with no profile request',async()=>{
 retainPublicProfile(fixture());const request=vi.spyOn(globalThis,'fetch');await render(<PublicAssetDetail item={asset()} standalone/>);
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe('https://receiz.com/artwork/avatar.png');expect(request).not.toHaveBeenCalled();
 await act(()=>root!.render(null));await act(()=>root!.render(<PublicAssetDetail item={asset()} standalone/>));
 expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);expect(request).not.toHaveBeenCalled();
});
it('prepares the one missing owner beside the asset and opens the already-held profile without a second request',async()=>{
 let finish!:(response:Response)=>void;const request=vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const source={catalog:null,status:'loading'} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 function Flow(){const [open,setOpen]=useState(false);return open?<PublicProfilePage username="alexmorgan" source={source} active/>:<div onClick={event=>{if((event.target as Element).closest('.asset-profile-byline')){event.preventDefault();setOpen(true);}}}><PublicAssetDetail item={asset()} standalone/></div>;}
 await render(<Flow/>);expect(element.querySelector('h1')?.textContent).toBe('Authored title');expect(request).toHaveBeenCalledExactlyOnceWith('/api/bank/public-profile/alexmorgan',expect.objectContaining({credentials:'omit'}));
 await act(async()=>finish(Response.json(fixture())));
 expect(element.querySelector('.asset-profile-byline img')?.getAttribute('src')).toBe('https://receiz.com/artwork/avatar.png');
 // Preparing the linked profile must not load its offscreen banner or covers.
 expect(document.querySelectorAll('link[data-profile-preload]')).toHaveLength(0);
 await act(()=>element.querySelector<HTMLAnchorElement>('.asset-profile-byline')!.click());
 expect(element.querySelector('h1')?.textContent).toBe('Alex Morgan');expect(element.textContent).not.toContain('Opening the public profile');expect(element.querySelectorAll('.profile-asset')).toHaveLength(1);expect(request).toHaveBeenCalledTimes(1);
});
it('does not restore an explicitly cleared portrait from an older profile',async()=>{
 retainPublicProfile(fixture());await render(<PublicAssetDetail item={{...asset(),ownerAvatarUrl:null}} standalone/>);expect(element.querySelector('.asset-profile-byline img')).toBeNull();
});
it('removes a retained portrait when the profile refresh refuses public access without retrying in a loop',async()=>{
 retainPublicProfile(fixture());const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+16_000);const request=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'PROFILE_PRIVATE'},{status:403}));
 await render(<PublicAssetDetail item={asset()} standalone/>);expect(element.querySelector('.asset-profile-byline img')).toBeNull();expect(element.querySelector('h1')?.textContent).toBe('Authored title');expect(request).toHaveBeenCalledTimes(1);
});
