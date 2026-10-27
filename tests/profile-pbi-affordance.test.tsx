// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {ProfileIdentity} from '../src/public-explorer/ProfileIdentity';import type {PublicProfile} from '../src/receiz/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const profile={username:'owner',displayName:'Owner',authorshipVerified:false,pbiReceiptHash:null,links:[],socialLinks:[]} as unknown as PublicProfile;
it('shows a muted signing check only to the owner, with one signing action per click',async()=>{
 const host=document.createElement('div'),root=createRoot(host),sign=vi.fn(async()=>{});
 try{await act(async()=>root.render(<ProfileIdentity profile={profile} onSign={sign}/>));const button=host.querySelector<HTMLButtonElement>('[aria-label="Verify your profile with PBI"]');expect(button).not.toBeNull();await act(async()=>button!.click());expect(sign).toHaveBeenCalledOnce();
 await act(async()=>root.render(<ProfileIdentity profile={profile}/>));expect(host.querySelector('[aria-label="Verify your profile with PBI"]')).toBeNull();
 await act(async()=>root.render(<ProfileIdentity profile={{...profile,authorshipVerified:true,pbiReceiptHash:'a'.repeat(64)}} onSign={sign}/>));expect(host.querySelector('[aria-label="View PBI authorship evidence"]')).not.toBeNull();expect(host.querySelector('[aria-label="Verify your profile with PBI"]')).toBeNull();
 }finally{act(()=>root.unmount());}
});
