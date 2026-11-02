// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {it,expect,vi} from 'vitest';
import {QuickProfileEditor} from '../src/features/account/QuickProfileEditor';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens locally, checks a changed username once, and preserves an untouched display name',async()=>{
 const availability=vi.fn(async()=>({available:true})),update=vi.fn(async()=>({})),profile=vi.fn(async()=>({availability,update})),identity={profile,knownProfile:()=>({userId:'owner',username:'alexmorgan',displayName:'Alex Morgan',avatarUrl:null})} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(()=>root.render(<QuickProfileEditor identity={identity} username="alexmorgan"/>));await act(()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(profile).not.toHaveBeenCalled();expect(host.querySelector<HTMLInputElement>('[aria-label="Display name"]')?.value).toBe('Alex Morgan');const input=host.querySelector<HTMLInputElement>('[aria-label="Profile username"]')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'alexnew');input.dispatchEvent(new Event('input',{bubbles:true}));});await vi.waitFor(()=>expect(availability).toHaveBeenCalledExactlyOnceWith('alexnew'));await act(async()=>{});expect(host.textContent).toContain('Available');await act(()=>[...host.querySelectorAll('button')].find(node=>node.textContent==='Save')!.click());expect(update).toHaveBeenCalledExactlyOnceWith({username:'alexnew'});expect(host.textContent).toContain('Updated');
 }finally{await act(()=>root.unmount());host.remove();}
});

async function harness(metadata:Record<string,unknown>,carried=false,verified=true){
 const availability=vi.fn(async()=>({available:true})),update=vi.fn(async()=>({})),profile=vi.fn(async()=>({availability,update}));
 const identity={profile,knownProfile:()=>carried?null:metadata,localHistory:carried?{authority:'verified-identity-portable-state',portableStateVerified:verified,verifiedState:{account:{userId:'owner'},profileView:{profile:metadata}}}:undefined} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 await act(()=>root.render(<QuickProfileEditor identity={identity} username="alexmorgan"/>));await act(()=>host.querySelector<HTMLButtonElement>('button')!.click());
 const input=async(label:string,value:string)=>{const field=host.querySelector<HTMLInputElement>('[aria-label="'+label+'"]');expect(field,'input '+label).not.toBeNull();await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field!,value);field!.dispatchEvent(new Event('input',{bubbles:true}));});};
 const save=async()=>{const button=[...host.querySelectorAll('button')].find(node=>node.textContent==='Save');expect(button,'Save button').toBeTruthy();expect(button!.disabled).toBe(false);await act(()=>button!.click());};
 return{host,profile,update,availability,input,save,async close(){await act(()=>root.unmount());host.remove();}};
}
const owner={userId:'owner',username:'alexmorgan',displayName:'Alex Morgan',avatarUrl:null};
it('saves only a changed display name without checking usernames or reading a profile',async()=>{
 const f=await harness(owner);
 try{expect(f.profile).not.toHaveBeenCalled();await f.input('Display name','  Alex Rivers  ');expect(f.profile).not.toHaveBeenCalled();await f.save();expect(f.update).toHaveBeenCalledExactlyOnceWith({displayName:'Alex Rivers'});expect(f.profile).toHaveBeenCalledTimes(1);expect(f.availability).not.toHaveBeenCalled();expect(f.host.textContent).toContain('Updated');}finally{await f.close();}
});
it('saves a display name and changed username together in one profile update',async()=>{
 const f=await harness(owner);
 try{await f.input('Display name','Alex Rivers');await f.input('Profile username','alexrivers');await vi.waitFor(()=>expect(f.availability).toHaveBeenCalledExactlyOnceWith('alexrivers'));await f.save();expect(f.update).toHaveBeenCalledExactlyOnceWith({username:'alexrivers',displayName:'Alex Rivers'});expect(f.host.textContent).toContain('Updated');}finally{await f.close();}
});
it('sends an explicit display-name clear through the existing default-name contract',async()=>{
 const f=await harness(owner);
 try{await f.input('Display name','');await f.save();expect(f.update).toHaveBeenCalledExactlyOnceWith({displayName:null});expect(f.availability).not.toHaveBeenCalled();expect(f.host.textContent).toContain('Updated');}finally{await f.close();}
});
it('shows the carried creation-pulse default without turning it into a custom name on a username-only save',async()=>{
 const f=await harness({...owner,displayName:'Receiz ID',displayNameSource:'creation-pulse',createdAt:'2026-02-25T06:44:59.650624Z',creationKaiMicroPulse:'10824603119470'},true);
 try{expect(f.host.querySelector<HTMLInputElement>('[aria-label="Display name"]')?.value).toBe('10,824,603');expect(f.profile).not.toHaveBeenCalled();await f.input('Profile username','alexnew');await vi.waitFor(()=>expect(f.availability).toHaveBeenCalledExactlyOnceWith('alexnew'));await f.save();expect(f.update).toHaveBeenCalledExactlyOnceWith({username:'alexnew'});}finally{await f.close();}
});
it.each([{verified:false,userId:'owner'},{verified:true,userId:'another-account'}])('leaves unverified or foreign carried names unused ($verified, $userId)',async({verified,userId})=>{
 const f=await harness({...owner,userId},true,verified);
 try{expect(f.host.querySelector<HTMLInputElement>('[aria-label="Display name"]')?.value).toBe('');expect(f.profile).not.toHaveBeenCalled();await f.input('Profile username','alexnew');await vi.waitFor(()=>expect(f.availability).toHaveBeenCalledExactlyOnceWith('alexnew'));await f.save();expect(f.update).toHaveBeenCalledExactlyOnceWith({username:'alexnew'});}finally{await f.close();}
});
