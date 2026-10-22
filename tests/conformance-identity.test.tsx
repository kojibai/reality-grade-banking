// @vitest-environment happy-dom
import {act,StrictMode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {createCheckoutIdentitySession} from '../src/checkout/checkout-identity';
import type {OpenIdentity} from '../src/receiz/native-identity';
const files=vi.hoisted(()=>({inspect:vi.fn(),save:vi.fn(),saved:vi.fn()}));
vi.mock('../src/receiz/identity-lock',()=>({inspectIdentityLock:files.inspect}));
vi.mock('../src/checkout/CheckoutIdentity',()=>({saveIdentityRecord:files.save}));
vi.mock('../src/receiz/identity-vault',()=>({loadDeviceIdentity:files.saved}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({sha256ReceizBytes:async(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let frames:Map<number,FrameRequestCallback>,id:number,roots:Root[],hosts:HTMLElement[];
beforeEach(()=>{frames=new Map();id=0;roots=[];hosts=[];files.inspect.mockReset().mockResolvedValue({needsPhrase:false});files.save.mockReset();files.saved.mockReset().mockResolvedValue(null);vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(n:number)=>frames.delete(n));});
afterEach(()=>{act(()=>roots.forEach(r=>r.unmount()));hosts.forEach(h=>h.remove());vi.unstubAllGlobals();});
const identity=(owner:string)=>({binding:{artifactOwnerReceizId:owner,keyId:'a'.repeat(64),artifactSha256:createHash('sha256').update(owner).digest('hex')},username:'editable-name',dispose:vi.fn(),backup:vi.fn()} as unknown as OpenIdentity);
function fixture(current:OpenIdentity|null=identity('receiz.existing-holder')){const restore=vi.fn(async()=>current),create=vi.fn(async()=>identity('receiz.created-holder')),importIdentity=vi.fn(async()=>identity('receiz.imported-holder')),session=createCheckoutIdentitySession({restore,create,importIdentity}),factory=vi.fn(async()=>session);return {restore,create,importIdentity,session,factory};}
async function frame(){await act(async()=>{for(const [n,cb] of [...frames]){frames.delete(n);cb(performance.now());}});}
async function mount(f:{factory:ReturnType<typeof fixture>['factory']},strict=false){const {ConformanceIdentity}=await import('../src/conformance/ConformanceIdentity');const host=document.createElement('div'),root=createRoot(host),onIdentity=vi.fn();document.body.append(host);hosts.push(host);roots.push(root);const render=(activeSurface=true)=>act(()=>root.render(strict?<StrictMode><ConformanceIdentity activeSurface={activeSurface} sessionFactory={f.factory} onIdentity={onIdentity}/></StrictMode>:<ConformanceIdentity activeSurface={activeSurface} sessionFactory={f.factory} onIdentity={onIdentity}/>));render();return {host,root,onIdentity,render};}
async function choose(host:HTMLElement,name='identity.png'){const input=host.querySelector<HTMLInputElement>('input[type=file]')!;const file=new File(['original'],name);Object.defineProperty(input,'files',{value:[file],configurable:true});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));return file;}
it('defers session import/open until after first paint and restores the native public holder without creating another identity',async()=>{
 const f=fixture(),{host,onIdentity}=await mount(f,true);expect(f.factory).not.toHaveBeenCalled();await frame();expect(f.factory).not.toHaveBeenCalled();await frame();expect(f.factory).toHaveBeenCalledOnce();expect(f.restore).toHaveBeenCalledOnce();expect(f.create).not.toHaveBeenCalled();expect(host.textContent).toContain('receiz.existing-holder');expect(host.textContent).not.toContain('editable-name');expect(onIdentity).toHaveBeenLastCalledWith(await f.session.open());
});
it('does not replace unreadable saved custody or display a verified holder on bootstrap failure, and permits retry',async()=>{
 const f=fixture();f.restore.mockRejectedValueOnce(Error('saved custody unreadable'));const {host}=await mount(f);await frame();await frame();expect(host.querySelector('[role=alert]')).not.toBeNull();expect(host.textContent).not.toContain('receiz.existing-holder');expect(f.create).not.toHaveBeenCalled();await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Retry identity')!.click());expect(host.textContent).toContain('receiz.existing-holder');expect(f.create).not.toHaveBeenCalled();
});
it('creates only when the canonical gate finds no saved device identity',async()=>{
 const f=fixture(null),{host,onIdentity}=await mount(f);await frame();await frame();expect(f.restore).toHaveBeenCalledOnce();expect(f.create).toHaveBeenCalledWith(true);expect(host.textContent).toContain('receiz.created-holder');expect(onIdentity).toHaveBeenLastCalledWith(await f.session.open());
});
it('uses the existing native save primitive and imports an original through the shared custody gate',async()=>{
 const f=fixture(),{host,onIdentity}=await mount(f);await frame();await frame();const held=await f.session.open();await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Save Identity Record')!.click());expect(files.save).toHaveBeenCalledWith(held);const file=await choose(host);expect(f.importIdentity).toHaveBeenCalledWith(file,'',true);expect(host.textContent).toContain('receiz.imported-holder');expect(held.dispose).toHaveBeenCalledOnce();expect(onIdentity).toHaveBeenLastCalledWith(await f.session.open());
});
it('rejects a stale restore when a newer original import is pending',async()=>{
 const f=fixture();let restore!:(value:OpenIdentity)=>void;f.restore.mockImplementationOnce(()=>new Promise(resolve=>{restore=resolve;}));const {host,onIdentity}=await mount(f);await frame();await frame();const selected=await choose(host),old=identity('receiz.stale-restore');await act(async()=>restore(old));expect(f.importIdentity).toHaveBeenCalledWith(selected,'',true);expect(host.textContent).toContain('receiz.imported-holder');expect(onIdentity.mock.calls.some(call=>call[0]===old)).toBe(false);expect(old.dispose).toHaveBeenCalledOnce();
});
it('requires the original record unlock phrase and keeps the existing holder on a failed import',async()=>{
 const f=fixture(),{host,onIdentity}=await mount(f);await frame();await frame();const held=await f.session.open();files.inspect.mockResolvedValueOnce({needsPhrase:true});const file=await choose(host);expect(f.importIdentity).not.toHaveBeenCalled();expect(host.textContent).toContain('Unlock your Identity Record');f.importIdentity.mockRejectedValueOnce(Error('wrong phrase'));const input=host.querySelector<HTMLInputElement>('input[type=password]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'incorrect phrase');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(f.importIdentity).toHaveBeenCalledWith(file,'incorrect phrase',true);expect(input.value).toBe('');expect(host.querySelector('[role=alert]')).not.toBeNull();expect(held.dispose).not.toHaveBeenCalled();expect(onIdentity).toHaveBeenLastCalledWith(held);
});
it('closes a session factory that resolves after unmount and never opens or publishes its holder',async()=>{
 const f=fixture();let finish!:(value:typeof f.session)=>void;f.factory.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const close=vi.spyOn(f.session,'close');const {root,onIdentity}=await mount(f);await frame();await frame();act(()=>root.unmount());roots=roots.filter(r=>r!==root);await act(async()=>finish(f.session));expect(close).toHaveBeenCalledOnce();expect(f.restore).not.toHaveBeenCalled();expect(onIdentity.mock.calls.some(call=>call[0]!==null)).toBe(false);
});
it('rejects an identity handle with no canonical public holder binding',async()=>{
 const f=fixture({binding:{artifactOwnerReceizId:''},dispose:vi.fn()} as unknown as OpenIdentity),{host,onIdentity}=await mount(f);await frame();await frame();expect(host.querySelector('[role=alert]')).not.toBeNull();expect(host.textContent).not.toContain('Verified Receiz ID');expect(onIdentity.mock.calls.some(call=>call[0]!==null)).toBe(false);
});
function retainedFixture(){let vault:OpenIdentity|null=identity('receiz.holder-A');const restore=vi.fn(async()=>vault),create=vi.fn(async()=>identity('receiz.unexpected-create')),importIdentity=vi.fn(async()=>identity('receiz.imported-holder')),factory=vi.fn(async()=>createCheckoutIdentitySession({restore,create,importIdentity}));files.saved.mockImplementation(async()=>vault?{bytes:new TextEncoder().encode(vault.binding.artifactOwnerReceizId),readConsent:true}:null);return {factory,restore,create,setVault:(next:OpenIdentity|null)=>{vault=next;}};}
it('reconciles a retained conformance surface from vault A to B and never presents A after returning from Bank',async()=>{
 const f=retainedFixture(),{host,render,onIdentity}=await mount(f);await frame();await frame();expect(host.textContent).toContain('receiz.holder-A');render(false);const next=identity('receiz.holder-B');f.setVault(next);render(true);expect(host.textContent).not.toContain('receiz.holder-A');await act(async()=>{});expect(host.textContent).toContain('receiz.holder-B');expect(onIdentity).toHaveBeenLastCalledWith(next);expect(f.restore).toHaveBeenCalledTimes(2);expect(f.create).not.toHaveBeenCalled();
});
it('rechecks local custody on focus without reopening unchanged bytes, and clears removed identity without creating a replacement',async()=>{
 const f=retainedFixture(),{host,onIdentity}=await mount(f);await frame();await frame();await act(async()=>dispatchEvent(new Event('focus')));expect(host.textContent).toContain('receiz.holder-A');expect(f.restore).toHaveBeenCalledOnce();f.setVault(identity('receiz.holder-B'));await act(async()=>dispatchEvent(new Event('focus')));expect(host.textContent).toContain('receiz.holder-B');expect(host.textContent).not.toContain('receiz.holder-A');f.setVault(null);await act(async()=>dispatchEvent(new Event('focus')));expect(host.querySelector('[data-conformance-receiz-id]')).toBeNull();expect(onIdentity).toHaveBeenLastCalledWith(null);expect(f.create).not.toHaveBeenCalled();
});
