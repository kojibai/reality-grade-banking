// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {it,expect,vi} from 'vitest';
import {QuickProfileEditor} from '../src/features/account/QuickProfileEditor';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens locally, checks a changed name once, and saves through the same account editor',async()=>{
 const availability=vi.fn(async()=>({available:true})),update=vi.fn(async()=>({})),profile=vi.fn(async()=>({availability,update})),identity={profile} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(()=>root.render(<QuickProfileEditor identity={identity} username="alexmorgan"/>));await act(()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(profile).not.toHaveBeenCalled();const input=host.querySelector<HTMLInputElement>('[aria-label="Profile username"]')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'alexnew');input.dispatchEvent(new Event('input',{bubbles:true}));});await vi.waitFor(()=>expect(availability).toHaveBeenCalledExactlyOnceWith('alexnew'));await act(async()=>{});expect(host.textContent).toContain('Available');await act(()=>[...host.querySelectorAll('button')].find(node=>node.textContent==='Save username')!.click());expect(update).toHaveBeenCalledExactlyOnceWith({username:'alexnew'});expect(host.textContent).toContain('Updated');
 }finally{await act(()=>root.unmount());host.remove();}
});
