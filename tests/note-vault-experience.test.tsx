// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {VaultExperience} from '../src/features/vault/VaultExperience';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
afterEach(()=>{act(()=>root?.unmount());root=undefined;document.body.replaceChildren();vi.restoreAllMocks();});
const click=async(text:string)=>act(async()=>{const element=[...host.querySelectorAll('button')].find(button=>button.textContent===text);expect(element).toBeDefined();element!.click();});
async function setup(initialList?:Promise<{id:string;name:string}[]>){
 const snapshot={id:'10000000-0000-4000-8000-000000000001',name:'My vault',ownerReceizId:'owner.receiz.id',protection:'image',money:[],originals:[],pending:false};
 const session={snapshot:vi.fn(async()=>snapshot),addBalance:vi.fn(),addOriginal:vi.fn(),addNote:vi.fn(),depositNote:vi.fn(async()=>({status:'received'})),exportPrivate:vi.fn(),lock:vi.fn()};
 const manager={list:vi.fn(async()=>initialList??[]),create:vi.fn(async(_:unknown,interaction:{review(value:unknown):Promise<boolean>})=>{if(!await interaction.review({kind:'create',vaultId:snapshot.id,digest:'a'.repeat(64),intent:{name:'My vault',protection:'image'}}))throw Error('VAULT_REVIEW_CANCELLED');return session;})};
 const note={noteId:'stored-note',rail:'reserve',amountUsdCents:'10000',image:new Uint8Array([4,5])},notes={savedNotes:vi.fn(async()=>[note]),pending:vi.fn(async()=>null),create:vi.fn(async()=>note),exportNote:vi.fn(async()=>({...note,image:new Uint8Array([8,9])}))};
 const legacy=vi.fn(),listDeposits=vi.fn(),refresh=vi.fn(),identity={binding:{artifactOwnerReceizId:'owner.receiz.id'},noteVaults:vi.fn(async()=>manager),offlineNotes:async()=>notes,vaults:legacy,listDeposits,knownDeposits:()=>[{digest:'b'.repeat(64),kind:'proof',status:'held-proof',title:'My Original',filename:'original.png',bytes:new Uint8Array([1,2,3])}]} as unknown as OpenIdentity;
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<VaultExperience identity={identity} onClose={vi.fn()} onRefresh={refresh}/>));
 return{session,manager,legacy,listDeposits,notes,note,refresh};
}
it('creates through the Note container without entering the legacy child-account path',async()=>{
 const f=await setup();expect(host.textContent).toContain('funded Notes and Originals');
 await click('Create a vault');await click('Continue');expect(host.textContent).toContain('Review your vault');await click('Approve');
 expect(f.manager.create).toHaveBeenCalledOnce();expect(f.manager.create.mock.calls[0][0]).toEqual({name:'My vault',protection:'image'});
 expect(f.legacy).not.toHaveBeenCalled();expect(host.textContent).toContain('Stored Notes');expect(host.textContent).toContain('Add an Original');expect(host.textContent).not.toContain('Create an account');
});
it('uses the already-held Original without refreshing account inventory',async()=>{
 const f=await setup();await click('Create a vault');await click('Continue');await click('Approve');await click('Add an Original');await click('My Original');
 expect(f.session.addOriginal).toHaveBeenCalledExactlyOnceWith(new Uint8Array([1,2,3]),'original.png');expect(f.listDeposits).not.toHaveBeenCalled();
 expect(f.refresh).not.toHaveBeenCalled();
});
it('keeps funding in the existing Notes flow and shows a retained Note if Vault storage fails',async()=>{
 const f=await setup();f.session.addNote.mockRejectedValueOnce(Error('VAULT_STORAGE_UNAVAILABLE'));
 await click('Create a vault');await click('Continue');await click('Approve');await click('Add money');await click('Create a funded Note');await click('Review note');await click('Create funded note');
 expect(f.notes.create).toHaveBeenCalledOnce();expect(host.textContent).toContain('Your funded Note is saved in Notes.');
 expect(f.session.addNote).toHaveBeenCalledExactlyOnceWith(f.note.image,'note-stored-note.png');
 await act(async()=>host.querySelector<HTMLButtonElement>('button.vault-candidate')!.click());
 expect(f.notes.exportNote).toHaveBeenCalledExactlyOnceWith(f.note.noteId);expect(f.session.addNote).toHaveBeenLastCalledWith(new Uint8Array([8,9]),'note-stored-note.png');expect(f.notes.create).toHaveBeenCalledOnce();
 expect(host.textContent).toContain('Stored Notes');
});
it('locks the local private view when hidden',async()=>{
 const f=await setup();await click('Create a vault');await click('Continue');await click('Approve');
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(f.session.lock).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('Stored Notes');
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
});

it('keeps a newly created Vault in its held local list after locking without reading the index again',async()=>{
 const f=await setup();await click('Create a vault');await click('Continue');await click('Approve');await click('Lock');
 expect(host.querySelector('.vault-locked-list')?.textContent).toContain('My vault');expect(f.manager.list).toHaveBeenCalledOnce();
});

it('does not replace a newly accepted Vault with an earlier index read that completes late',async()=>{
 let finish!:(rows:{id:string;name:string}[])=>void;const f=await setup(new Promise(resolve=>{finish=resolve;}));
 await click('Create a vault');await click('Continue');await click('Approve');await act(async()=>finish([]));await click('Lock');
 expect(host.querySelector('.vault-locked-list')?.textContent).toContain('My vault');expect(f.manager.list).toHaveBeenCalledOnce();
});
