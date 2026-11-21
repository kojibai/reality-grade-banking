// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {IdentityProfile} from '../src/features/account/IdentityProfile';
import {Sheet} from '../src/components/Sheet';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({loaded:vi.fn(),rendered:vi.fn(),votingLoaded:vi.fn(),votingRendered:vi.fn()}));
vi.mock('../src/features/vault/VaultExperience',()=>{p.loaded();return{VaultExperience:()=>{p.rendered();return <p>Your private vaults</p>;}};});
vi.mock('../src/features/voting/VotingBoard',()=>{p.votingLoaded();return{VotingBoard:(props:unknown)=>{p.votingRendered(props);return <p>Your voting records</p>;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps Vault runtime out of Identity until the owner explicitly opens Your vaults',async()=>{
 const identity={username:'held-account',binding:{identityOwnerReceizId:'owner'},needsPhrase:false,vaults:vi.fn()} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<IdentityProfile identity={identity} onForget={vi.fn()} onRefresh={vi.fn()}/>));
 expect(p.loaded).not.toHaveBeenCalled();expect(identity.vaults).not.toHaveBeenCalled();
 const entry=host.querySelector<HTMLButtonElement>('.identity-vault-entry');expect(entry).not.toBeNull();
 await act(async()=>entry!.click());expect(p.loaded).toHaveBeenCalledOnce();expect(host.textContent).toContain('Your private vaults');
 }finally{act(()=>root.unmount());}
});

it('opens the owner voting sheet from Receiz ID and returns to the same ID popover',async()=>{
 const identity={
  username:'held-account',
  binding:{identityOwnerReceizId:'owner'},
  needsPhrase:false,
  prepareReceivingUsername:vi.fn(),
 } as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),onClose=vi.fn();
 document.body.append(host);
 const initialUrl=window.location.href;
 try{
  await act(async()=>root.render(<Sheet title="Your Receiz ID" onClose={onClose}>
   <IdentityProfile identity={identity} accountUid="held-account-uid" onForget={vi.fn()} onRefresh={vi.fn()}/>
  </Sheet>));
  const row=host.querySelector<HTMLButtonElement>('.identity-governance-entry');
  expect(row?.textContent).toContain('Governance');
  expect(p.votingLoaded).not.toHaveBeenCalled();
  await act(async()=>row!.click());
  const voting=host.querySelector<HTMLDialogElement>('dialog.profile-voting-workspace');
  expect(voting?.open).toBe(true);
  expect(voting?.textContent).toContain('Your voting dashboard');
  expect(p.votingLoaded).toHaveBeenCalledOnce();
  expect(p.votingRendered).toHaveBeenLastCalledWith(expect.objectContaining({
   profile:expect.objectContaining({uid:'held-account-uid',ownerIdentity:identity}),
  }));
  expect(identity.prepareReceivingUsername).not.toHaveBeenCalled();
  expect(window.location.href).toBe(initialUrl);
  await act(async()=>voting!.querySelector<HTMLButtonElement>('button[aria-label="Go back"]')!.click());
  expect(host.querySelector('dialog.profile-voting-workspace')).toBeNull();
  expect(host.querySelector('dialog')?.open).toBe(true);
  expect(host.querySelector('.identity-governance-entry')).toBe(row);
  expect(onClose).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
