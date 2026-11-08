// @vitest-environment happy-dom
import {act,type ComponentProps} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {PublicProfilePortal} from '../src/features/account/PublicProfilePortal';
import {parsePublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {beginProfileAssetCreation,publishProfileOwner,readProfileEdit} from '../src/receiz/profile-actions';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:Root,host:HTMLDivElement;
const profile=()=>{const value=parsePublicProfile(profileFixture(),'alexmorgan');value.items=[];value.nextCursor=null;return value;};
function identity(){return {binding:{keyId:'held-owner'},pendingAssetPublication:vi.fn(async()=>null),backedAssetPublication:vi.fn(async()=>({pending:async()=>({state:null,deposit:null})}))} as unknown as OpenIdentity;}
const source:ComponentProps<typeof PublicProfilePage>['source']={catalog:null,historyCatalog:null,status:'stale',pulse:14800001,quoteStatus:'stale',sportsStatus:'missing',error:null,refresh:async()=>{}};
beforeEach(()=>{history.replaceState(null,'','/alexmorgan/');host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(()=>root.unmount());host.remove();publishProfileOwner(null);forgetPublicProfile('alexmorgan');vi.restoreAllMocks();});
it.each([null,'another-account'])('keeps Create an asset absent for a nonowner (%s)',async uid=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_SOURCE_READ')),value=profile();publishProfileOwner(uid);
 await act(()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={value} source={source} active/>));
 expect(host.querySelector('[aria-label="Create an asset"]')).toBeNull();beginProfileAssetCreation(value);expect(readProfileEdit()).toBeNull();expect(fetch).not.toHaveBeenCalled();
});
it('opens the exact existing creator in place for the held owner and closes back to the same profile without navigation or Source reads',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_SOURCE_READ')),navigate=vi.fn(),runtime=vi.fn(),value=profile(),owner=identity(),refresh=vi.fn();
 addEventListener('bankeiz:navigate-bank',navigate);addEventListener('bankeiz:request-bank-runtime',runtime);
 const render=(active=true,uid:string|null=value.userId,opened:OpenIdentity|null=owner)=>root.render(<><PublicProfilePortal identity={opened} userId={uid} onRefresh={refresh}/><PublicProfilePage username="alexmorgan" initialProfile={value} source={source} active={active}/></>);
 try{
  await act(()=>render());const page=host.querySelector('.public-profile-page'),button=host.querySelector<HTMLButtonElement>('[aria-label="Create an asset"]')!,url=location.href;
  expect(button.title).toBe('Create an asset');expect(button.getAttribute('aria-haspopup')).toBe('dialog');expect(owner.pendingAssetPublication).not.toHaveBeenCalled();
  await act(async()=>{button.focus();button.click();});
  const creator=host.querySelector('.asset-creation');expect(creator).not.toBeNull();expect(host.querySelector('dialog.sheet--asset-studio h2')?.textContent).toBe('New original');expect(owner.pendingAssetPublication).toHaveBeenCalledOnce();
  expect(host.querySelector('.public-profile-page')).toBe(page);expect(location.href).toBe(url);expect(fetch).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();expect(runtime).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
  await act(()=>render(false));expect(host.querySelector('.asset-creation')).toBe(creator);expect(host.querySelector<HTMLDialogElement>('dialog.sheet--asset-studio')?.open).toBe(false);
  await act(()=>render());expect(host.querySelector('.asset-creation')).toBe(creator);expect(owner.pendingAssetPublication).toHaveBeenCalledOnce();
  await act(async()=>host.querySelector<HTMLButtonElement>('dialog.sheet--asset-studio [aria-label="Close"]')!.click());
  expect(host.querySelector('.asset-creation')).toBeNull();expect(readProfileEdit()).toBeNull();expect(host.querySelector('.public-profile-page')).toBe(page);expect(location.href).toBe(url);expect(fetch).not.toHaveBeenCalled();
  await act(()=>host.querySelector<HTMLButtonElement>('.profile-owner-tools button')!.click());expect(host.querySelector('.profile-editor')).not.toBeNull();expect(host.querySelector('dialog h2')?.textContent).toBe('Edit profile');expect(host.querySelector('.asset-creation')).toBeNull();await act(()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());
  await act(async()=>button.click());await act(()=>render(true,null,null));expect(host.querySelector('.asset-creation')).toBeNull();expect(host.querySelector('[aria-label="Create an asset"]')).toBeNull();expect(readProfileEdit()).toBeNull();expect(fetch).not.toHaveBeenCalled();
 }finally{removeEventListener('bankeiz:navigate-bank',navigate);removeEventListener('bankeiz:request-bank-runtime',runtime);}
});
