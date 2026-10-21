// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {ProfileEditor} from '../src/features/account/ProfileEditor';
import {parsePublicProfile} from '../src/receiz/public-profile';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('saves only changed fields through the current identity and preserves the separate social and named-link fields',async()=>{
 const raw=profileFixture();raw.profile.profile.avatarUrl='data:image/png;base64,aGVsbG8=';const profile=parsePublicProfile(raw,'alexmorgan'),update=vi.fn(async()=>({accountUid:profile.userId,profilePath:'/alexmorgan',profile:raw.profile})),open=vi.fn(async()=>({update,availability:async()=>({available:true})})),identity={walletReceivingAddress:()=>profile.userId,profile:open} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),close=vi.fn();
 try{await act(()=>root.render(<ProfileEditor identity={identity} profile={profile} onClose={close}/>));expect(open).not.toHaveBeenCalled();const field=host.querySelector('textarea')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'A new public biography');field.dispatchEvent(new Event('input',{bubbles:true}));});await act(()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(update).toHaveBeenCalledExactlyOnceWith({bio:'A new public biography'});expect(close).toHaveBeenCalledTimes(1);}finally{await act(()=>root.unmount());host.remove();}
});
