// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import App from '../src/App';
const f=vi.hoisted(()=>({identity:null as unknown,create:vi.fn(),vaultCreate:vi.fn(),vaults:vi.fn(async()=>({list:async()=>[],create:vi.fn()}))}));
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:()=>({identity:f.identity,wallet:null,opening:false,busy:false,error:null,observedAt:null,create:f.create,refresh:async()=>{},forget:async()=>{},importId:vi.fn(),pbi:vi.fn()})}));
vi.mock('../src/features/market/Market',()=>({Market:()=>null}));
vi.mock('../src/features/ledger/Ledger',()=>({Ledger:()=>null}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({catalog:null,status:'loading',refresh:async()=>{}})}));
vi.mock('../src/features/messages/MessagesPanel',()=>({MessagesPanel:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner=(name:string)=>({username:name,binding:{identityOwnerReceizId:name,artifactOwnerReceizId:name+'.receiz.id'},localHistory:{},listDeposits:async()=>[],pendingCardDeposit:async()=>null,vaults:f.vaults});
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
afterEach(()=>{act(()=>root?.unmount());root=undefined;document.body.replaceChildren();history.replaceState(null,'','/');vi.clearAllMocks();vi.restoreAllMocks();});
async function start(identity:unknown){f.identity=identity;history.replaceState(null,'','/#account/profile/vaults/create');host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root!.render(<App/>));await act(async()=>{await vi.dynamicImportSettled();});}
async function route(url:string){history.replaceState(null,'',url);await act(async()=>{dispatchEvent(new Event('receiz-bank:surface'));await vi.dynamicImportSettled();});}
it.each(['button','cancel'])('opens nested Create, consumes once and closes only the top popover through %s',async closeMode=>{
 await start(owner('first'));expect(location.hash).toBe('#account/profile');expect(host.querySelectorAll('dialog')).toHaveLength(2);expect(host.textContent).toContain('Create your vault');expect(f.create).not.toHaveBeenCalled();
 const inner=host.querySelectorAll('dialog')[1];await act(async()=>{if(closeMode==='cancel')inner.dispatchEvent(new Event('cancel',{bubbles:false,cancelable:true}));else inner.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();});expect(host.querySelectorAll('dialog')).toHaveLength(1);expect(host.textContent).not.toContain('Create your vault');
 await route('/#account/profile/vaults/create');expect(host.querySelectorAll('dialog')).toHaveLength(2);expect(host.textContent).toContain('Create your vault');expect(location.hash).toBe('#account/profile');
});
it('retains the nested draft while public navigation suspends both dialogs and prevents owner crossover',async()=>{
 const opened=vi.spyOn(HTMLDialogElement.prototype,'showModal');await start(owner('first'));const nested=host.querySelectorAll('dialog')[1],input=nested.querySelector<HTMLInputElement>('input')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Private plan');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await route('/protect/');expect([...host.querySelectorAll('dialog')].every(d=>!d.open)).toBe(true);expect(document.body.style.position).not.toBe('fixed');
 await route('/#account/profile');expect(host.querySelectorAll('dialog')[1]).toBe(nested);expect(input.value).toBe('Private plan');expect([...host.querySelectorAll('dialog')].every(d=>d.open)).toBe(true);expect(opened.mock.contexts.at(-1)).toBe(nested);
 f.identity=owner('second');await act(async()=>root!.render(<App/>));expect(host.textContent).not.toContain('Create your vault');expect(host.textContent).not.toContain('Private plan');expect(host.textContent).toContain('second');
});
it('retains a signed-out destination without auto-creating an account and opens it after existing admission',async()=>{
 await start(null);expect(f.create).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Create your vault');expect(location.hash).toBe('#account/profile/vaults/create');
 f.identity=owner('admitted');await act(async()=>{root!.render(<App/>);await vi.dynamicImportSettled();});expect(host.textContent).toContain('Create your vault');expect(location.hash).toBe('#account/profile');expect(f.create).not.toHaveBeenCalled();
});
