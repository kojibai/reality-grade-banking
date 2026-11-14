// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveActions } from '../src/features/account/LiveActions';
import type { OpenIdentity } from '../src/receiz/native-identity';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([
  { username: 'receiz_public_name', current: 'confirmed_profile', expected: 'confirmed_profile' },
  { username: 'receiz_public_name', current: null, expected: 'receiz_public_name' },
  { username: null, current: null, expected: 'receiz_device_original_owner' },
])('shows the assigned public identity without rewriting its signed ownership coordinate: $expected', ({ username, current, expected }) => {
  const host = document.createElement('div'), root = createRoot(host);
  const identity = {
    username, accountUsername: () => current,
    binding: { identityOwnerReceizId: 'receiz_device_original_owner' },
    needsPhrase: false,
  } as unknown as OpenIdentity;
  try {
    act(() => root.render(<LiveActions action={{ kind: 'profile' }} identity={identity} wallet={null} active={false} onClose={() => {}} onForget={async () => {}} onRefresh={() => {}} />));
    expect(host.querySelector('code')?.textContent).toBe(expected);
    expect(host.textContent).toContain('receiz_device_original_owner');
    expect(identity.binding.identityOwnerReceizId).toBe('receiz_device_original_owner');
  } finally { act(() => root.unmount()); }
});

function profileHarness(identity:OpenIdentity){
 const host=document.createElement('div'),root=createRoot(host);
 const render=(value:OpenIdentity)=>act(()=>root.render(<LiveActions action={{kind:'profile'}} identity={value} wallet={null} active={false} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 render(identity);return {host,render,close:()=>act(()=>root.unmount())};
}
const unresolvedIdentity=(prepareReceivingUsername:()=>Promise<string>)=>({username:null,accountUsername:()=>null,binding:{identityOwnerReceizId:'receiz_device_'+('a'.repeat(64))},needsPhrase:false,prepareReceivingUsername}) as unknown as OpenIdentity;
it.each([null,'receiz_device_'+('b'.repeat(64))])('shows the profile entry on the first frame without connecting and resolves the existing public name only on tap (%s)',async username=>{
 let resolve!:(value:string)=>void;const prepare=vi.fn(()=>new Promise<string>(done=>{resolve=done;})),h=profileHarness({...unresolvedIdentity(prepare),username}),navigate=vi.fn();
 addEventListener('bankeiz:navigate-public',navigate);
 try{
  const entry=h.host.querySelector<HTMLButtonElement>('.identity-public-profile-link');expect(entry).toBeTruthy();expect(entry?.textContent).toContain('Your public profile');expect(prepare).not.toHaveBeenCalled();
  await act(async()=>{entry!.click();entry!.click();});expect(prepare).toHaveBeenCalledTimes(1);
  await act(async()=>{resolve('confirmed_owner');});
  expect(navigate).toHaveBeenCalledTimes(1);expect((navigate.mock.calls[0][0] as CustomEvent).detail).toEqual({path:'/confirmed_owner/'});
  expect(h.host.querySelector<HTMLAnchorElement>('.identity-public-profile-link')?.getAttribute('href')).toBe('/confirmed_owner/');
 }finally{removeEventListener('bankeiz:navigate-public',navigate);h.close();}
});
it('never opens a previous identity profile after the account changes during name preparation',async()=>{
 let resolve!:(value:string)=>void;const first=unresolvedIdentity(()=>new Promise<string>(done=>{resolve=done;})),h=profileHarness(first),navigate=vi.fn();addEventListener('bankeiz:navigate-public',navigate);
 try{await act(async()=>{h.host.querySelector<HTMLButtonElement>('.identity-public-profile-link')!.click();});h.render(unresolvedIdentity(async()=>'new_owner'));await act(async()=>{resolve('previous_owner');});expect(navigate).not.toHaveBeenCalled();expect(h.host.textContent).not.toContain('previous_owner');}
 finally{removeEventListener('bankeiz:navigate-public',navigate);h.close();}
});
it('keeps an unresolved profile entry usable after a failed name read without making up a link',async()=>{
 const prepare=vi.fn().mockRejectedValueOnce(Error('source_unavailable')).mockResolvedValueOnce('confirmed_owner'),h=profileHarness(unresolvedIdentity(prepare)),navigate=vi.fn();addEventListener('bankeiz:navigate-public',navigate);
 try{await act(async()=>{h.host.querySelector<HTMLButtonElement>('.identity-public-profile-link')!.click();});expect(navigate).not.toHaveBeenCalled();expect(h.host.querySelector('.identity-public-profile-link')?.getAttribute('href')).toBeNull();expect(h.host.querySelector<HTMLButtonElement>('.identity-public-profile-link')?.disabled).toBe(false);await act(async()=>{h.host.querySelector<HTMLButtonElement>('.identity-public-profile-link')!.click();});expect(navigate).toHaveBeenCalledTimes(1);}
 finally{removeEventListener('bankeiz:navigate-public',navigate);h.close();}
});
it('uses a known public name immediately without preparing another connection',()=>{
 const prepare=vi.fn(async()=>'unneeded'),identity={...unresolvedIdentity(prepare),accountUsername:()=> 'known_owner'},h=profileHarness(identity);
 try{expect(h.host.querySelector<HTMLAnchorElement>('.identity-public-profile-link')?.getAttribute('href')).toBe('/known_owner/');expect(prepare).not.toHaveBeenCalled();}finally{h.close();}
});

it('links a generated profile by its full public name without another account read',()=>{
 const full='pbahqdfouqyxgsifcy',prepare=vi.fn(async()=>{throw Error('UNNEEDED_READ');});
 const identity={...unresolvedIdentity(prepare),username:'receiz_'+full,accountUsername:()=> 'receiz_'+full.slice(0,-1)};
 const h=profileHarness(identity);
 try{
  expect(h.host.querySelector('.identity-public-profile-link')?.getAttribute('href')).toBe('/'+full+'/');
  expect(h.host.querySelector('code')?.textContent).toBe(full);
  expect(prepare).not.toHaveBeenCalled();
 }finally{h.close();}
});

it('prepares the optional PNG only on backup click, coalesces taps and keeps exact original download after failure',async()=>{
 let finish!:(value:{bytes:Uint8Array;filename:string;phrase:string})=>void;
 const exported=vi.fn(()=>new Promise<{bytes:Uint8Array;filename:string;phrase:string}>(done=>{finish=done;})),backup=vi.fn(()=>({bytes:new Uint8Array([1,2]),filename:'original.receizkey',phrase:''}));
 const identity={...unresolvedIdentity(async()=>'maya'),backup,exportIdentityRecord:exported},h=profileHarness(identity),downloads:string[]=[];
 const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:synthetic-backup'),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download);});
 try{
  expect(exported).not.toHaveBeenCalled();expect(backup).not.toHaveBeenCalled();
  const button=h.host.querySelector<HTMLButtonElement>('.primary-button')!;await act(async()=>{button.click();button.click();});expect(exported).toHaveBeenCalledTimes(1);expect(downloads).toEqual([]);expect(button.disabled).toBe(true);
  await act(async()=>finish({bytes:new Uint8Array([137,80,78,71]),filename:'identity_record_maya.png',phrase:''}));expect(downloads).toEqual(['identity_record_maya.png']);expect(backup).not.toHaveBeenCalled();
  exported.mockRejectedValueOnce(Error('IDENTITY_RECORD_PRESENTATION_REQUIRED'));await act(async()=>button.click());expect(h.host.textContent).toContain('PNG');expect(downloads).toHaveLength(1);
  const original=[...h.host.querySelectorAll('button')].find(node=>node.textContent?.includes('Download original Identity Record'));expect(original).toBeTruthy();await act(async()=>original!.click());expect(backup).toHaveBeenCalledTimes(1);expect(downloads.at(-1)).toBe('original.receizkey');
 }finally{h.close();url.mockRestore();click.mockRestore();}
});

it('does not download a previous identity backup after account selection changes during export',async()=>{
 let finish!:(value:{bytes:Uint8Array;filename:string;phrase:string})=>void;const first={...unresolvedIdentity(async()=>'maya'),backup:vi.fn(),exportIdentityRecord:()=>new Promise<{bytes:Uint8Array;filename:string;phrase:string}>(done=>{finish=done;})},h=profileHarness(first),download=vi.spyOn(URL,'createObjectURL');
 try{await act(async()=>h.host.querySelector<HTMLButtonElement>('.primary-button')!.click());h.render(unresolvedIdentity(async()=>'new_owner'));await act(async()=>finish({bytes:new Uint8Array([1]),filename:'previous.png',phrase:''}));expect(download).not.toHaveBeenCalled();expect(h.host.textContent).not.toContain('original file');}finally{h.close();download.mockRestore();}
});
