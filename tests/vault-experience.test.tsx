// @vitest-environment happy-dom
import {act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {VaultExperience} from '../src/features/vault/VaultExperience';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {VaultInteraction,VaultSession,VaultSnapshot} from '../src/receiz/vault/manager';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const native=vi.hoisted(()=>({open:vi.fn()}));
const view:VaultSnapshot={id:'10000000-0000-4000-8000-000000000001',name:'My reserve',ownerReceizId:'owner.receiz.id',phase:'ready',protection:'image',money:[],assets:[],investments:[],pending:false,cards:[]};
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
afterEach(()=>{act(()=>root?.unmount());document.body.replaceChildren();vi.unstubAllGlobals();vi.clearAllMocks();});
const click=async(text:string)=>act(async()=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent===text);expect(button).toBeDefined();button!.click();});
async function setup(create:Function){
 const session={snapshot:async()=>view,lock:vi.fn()} as unknown as VaultSession;
 const list=vi.fn(async()=>[]),manager={list,importPrivate:vi.fn(async()=>session),create:(input:unknown,interaction:VaultInteraction)=>create(input,interaction,session)};
 const identity={vaults:async()=>manager} as unknown as OpenIdentity;
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<VaultExperience identity={identity} onClose={vi.fn()}/>));return{list,session,manager};
}
it('keeps setup behind approval and an actually selected saved original, with optional passkey off by default',async()=>{
 const image={bytes:new Uint8Array([1,2,3]),filename:'private.png',mimeType:'image/png' as const,digest:'a'.repeat(64)},saved=vi.fn();
 const {list}=await setup(async(input:{protection:string},interaction:VaultInteraction,session:VaultSession)=>{
  expect(input.protection).toBe('image');if(!await interaction.review({kind:'create',vaultId:view.id,digest:image.digest,intent:{name:'My reserve',protection:input.protection}}))throw Error('VAULT_REVIEW_CANCELLED');
  saved(await interaction.saveAndReopen(image));return session;
 });
 await click('Create a vault');expect(host.textContent).toContain('Create your vault');
 await click('Continue');expect(host.textContent).toContain('Review your vault');expect(saved).not.toHaveBeenCalled();
 await click('Approve');expect(host.textContent).toContain('Save your private original');expect(saved).not.toHaveBeenCalled();
 const input=host.querySelector<HTMLInputElement>('input[aria-label="Select your saved private original"]')!;
 const file=new File([image.bytes],'private.png',{type:'image/png'});Object.defineProperty(file,'arrayBuffer',{value:async()=>image.bytes.buffer});
 Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
 expect(saved).toHaveBeenCalledExactlyOnceWith(image.bytes);expect(host.textContent).toContain('My reserve');expect(host.textContent).toContain('Share proof');expect(list).toHaveBeenCalledOnce();
});
it('cancels a review without creating an open session',async()=>{
 const opened=vi.fn();await setup(async(_:unknown,interaction:VaultInteraction,session:VaultSession)=>{if(await interaction.review({kind:'create',vaultId:view.id,digest:'a'.repeat(64),intent:{name:'My reserve',protection:'image'}})){opened();return session;}throw Error('VAULT_REVIEW_CANCELLED');});
 await click('Create a vault');await click('Continue');await click('Cancel');expect(opened).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Share proof');
});
it('locks an open private session when the page is hidden',async()=>{
 const {session}=await setup(async(_:unknown,__:unknown,session:VaultSession)=>session);
 await click('Create a vault');await click('Continue');
 expect(host.textContent).toContain('Share proof');Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(session.lock).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('Share proof');
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
});
it('opens a selected private original once under StrictMode without starting a stale opening',async()=>{
 const session={snapshot:async()=>view,lock:vi.fn()};native.open.mockResolvedValue(session);host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<StrictMode><VaultExperience initialBytes={new Uint8Array([1,2,3])} openOriginal={native.open} onClose={vi.fn()}/></StrictMode>));
 await act(async()=>{await vi.dynamicImportSettled();});
 expect(native.open).toHaveBeenCalledOnce();expect(session.lock).not.toHaveBeenCalled();expect(host.textContent).toContain('Share proof');
});
it('shows a retained pending request after a lost money reply and never claims that money moved',async()=>{
 const pending={...view,money:[{noteId:'note',amountUsdCents:'500',amountPhiMicro:'1000',rail:'settlement' as const,sourceRef:'b'.repeat(64)}]};let moved=false;
 await setup(async()=>({snapshot:async()=>({...pending,pending:moved}),lock:vi.fn(),sendMoney:async()=>{moved=true;throw Error('VAULT_RESULT_UNKNOWN');}}));await click('Create a vault');await click('Continue');await click('Send');
 const input=async(label:string,value:string)=>act(()=>{const e=[...host.querySelectorAll('label')].find(l=>l.textContent?.startsWith(label))!.querySelector('input')!,set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));});
 await input('Amount (USD)','1');await input('Recipient Receiz ID','recipient.receiz.id');await click('Review');await click('Back to vault');
 expect(host.textContent).toContain('Continue pending operation');expect(host.textContent).not.toContain('Your value moved');
});
it('reports a native zero-write money result without claiming payment completion',async()=>{
 const snapshot={...view,money:[{noteId:'note',amountUsdCents:'500',amountPhiMicro:'1000',rail:'settlement' as const,sourceRef:'b'.repeat(64)}]};
 await setup(async()=>({snapshot:async()=>snapshot,lock:vi.fn(),returnMoney:async()=>({complete:true,result:'zero-write'})}));await click('Create a vault');await click('Continue');await click('Move to my balance');
 const input=[...host.querySelectorAll('label')].find(l=>l.textContent?.startsWith('Amount (USD)'))!.querySelector('input')!;
 await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'1');input.dispatchEvent(new Event('input',{bubbles:true}));});await click('Review');
 expect(host.textContent).toContain('No value moved');expect(host.textContent).not.toContain('Your value moved');
});
it('does not start a private opening when a selected file finishes reading after the experience closes',async()=>{
 const {manager}=await setup(async()=>{});let finish!:(bytes:ArrayBuffer)=>void;const file=new File(['original'],'vault.png',{type:'image/png'});Object.defineProperty(file,'arrayBuffer',{value:()=>new Promise<ArrayBuffer>(resolve=>{finish=resolve;})});
 const input=host.querySelector<HTMLInputElement>('input[aria-label="Open a saved vault"]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));act(()=>root!.unmount());root=undefined;await act(async()=>finish(new Uint8Array([1,2,3]).buffer));
 expect(manager.importPrivate).not.toHaveBeenCalled();
});

it.each([false,true])('uses admitted financial pending=%s independently of unresolved card coordination',async financialPending=>{
 const snapshot={...view,pending:true,financialPending,money:[{noteId:'note',amountUsdCents:'500',amountPhiMicro:'1000',rail:'settlement' as const,sourceRef:'b'.repeat(64)}],cards:[{id:'card',amountUsdCents:'500',phase:'unknown' as const}]};
 await setup(async()=>({snapshot:async()=>snapshot,lock:vi.fn()}));await click('Create a vault');await click('Continue');
 for(const label of ['Send','Move to my balance','Add from balance','Share proof'])expect([...host.querySelectorAll('button')].find(b=>b.textContent===label)?.disabled).toBe(financialPending);
 expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Add by card')?.disabled).toBe(true);
 expect(host.textContent).toContain('Continue pending operation');expect(host.textContent).toContain('Unfinished funding');
});
