// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {IdentityProfile} from '../src/features/account/IdentityProfile';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({loaded:vi.fn(),rendered:vi.fn()}));
vi.mock('../src/features/vault/VaultExperience',()=>{p.loaded();return{VaultExperience:()=>{p.rendered();return <p>Your private vaults</p>;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps Vault runtime out of Identity until the owner explicitly opens Your vaults',async()=>{
 const identity={username:'held-account',binding:{identityOwnerReceizId:'owner'},needsPhrase:false,vaults:vi.fn()} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<IdentityProfile identity={identity} onForget={vi.fn()} onRefresh={vi.fn()}/>));
 expect(p.loaded).not.toHaveBeenCalled();expect(identity.vaults).not.toHaveBeenCalled();
 const entry=host.querySelector<HTMLButtonElement>('.identity-vault-entry');expect(entry).not.toBeNull();
 await act(async()=>entry!.click());expect(p.loaded).toHaveBeenCalledOnce();expect(host.textContent).toContain('Your private vaults');
 }finally{act(()=>root.unmount());}
});
