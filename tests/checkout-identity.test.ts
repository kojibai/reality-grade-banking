import {expect,it,vi} from 'vitest';
import {createCheckoutIdentitySession} from '../src/checkout/checkout-identity';
import type {OpenIdentity} from '../src/receiz/native-identity';
function fixture(){const identity={dispose:vi.fn(),prepareAccountView:vi.fn()}as unknown as OpenIdentity;let held:OpenIdentity|null=null;const create=vi.fn(async()=>held=identity),restore=vi.fn(async()=>held),importIdentity=vi.fn(async()=>identity);return{identity,create,restore,importIdentity,deps:{create,restore,importIdentity}};}
it('opens only an existing identity for closed-checkout recovery and never creates one',async()=>{
 const f=fixture(),s=createCheckoutIdentitySession(f.deps);expect(await s.restore()).toBeNull();expect(f.create).not.toHaveBeenCalled();f.restore.mockResolvedValue(f.identity);expect(await s.restore()).toBe(f.identity);expect(await s.open()).toBe(f.identity);expect(f.create).not.toHaveBeenCalled();s.close();
});
it('reuses one identity for simultaneous landing consumers without preparing a dashboard',async()=>{
 const f=fixture(),session=createCheckoutIdentitySession(f.deps);const [a,b]=await Promise.all([session.open(),session.open()]);expect(a).toBe(b);expect(f.create).toHaveBeenCalledTimes(1);expect(f.identity.prepareAccountView).not.toHaveBeenCalled();session.close();expect(f.identity.dispose).toHaveBeenCalledOnce();
});
it('never creates an identity when restoration or creation fails',async()=>{
 const f=fixture();f.restore.mockRejectedValue(Error('saved custody unreadable'));const s=createCheckoutIdentitySession(f.deps);await expect(s.open()).rejects.toThrow('unreadable');expect(f.create).not.toHaveBeenCalled();s.close();
 const g=fixture();g.create.mockRejectedValue(Error('storage unavailable'));await expect(createCheckoutIdentitySession(g.deps).open()).rejects.toThrow('storage');
});
it('disposes a late open result and cannot adopt it after close',async()=>{
 const f=fixture();let finish!:(id:OpenIdentity)=>void;f.create.mockImplementation(()=>new Promise(resolve=>finish=resolve));const s=createCheckoutIdentitySession(f.deps),pending=s.open();await Promise.resolve();s.close();finish(f.identity);await expect(pending).rejects.toThrow('closed');expect(f.identity.dispose).toHaveBeenCalledOnce();
});
it('imports an existing record after initialization and closes only the previous identity',async()=>{
 const f=fixture(),s=createCheckoutIdentitySession(f.deps);await s.open();const next={dispose:vi.fn()}as unknown as OpenIdentity;f.importIdentity.mockResolvedValue(next);const file={name:'record.png'}as File;expect(await s.import(file,'phrase')).toBe(next);expect(f.importIdentity).toHaveBeenCalledWith(file,'phrase',true);expect(f.identity.dispose).toHaveBeenCalledOnce();expect(await s.open()).toBe(next);s.close();expect(next.dispose).toHaveBeenCalledOnce();
});
it('Join waits for an explicit record selection without creating a different account',async()=>{
 const f=fixture();let accept!:(id:OpenIdentity)=>void;const selected={dispose:vi.fn()}as unknown as OpenIdentity;
 f.importIdentity.mockImplementation(()=>new Promise(resolve=>accept=resolve));const s=createCheckoutIdentitySession(f.deps);
 const importing=s.import({name:'my-identity.png'}as File,'');await Promise.resolve();const joining=s.open();
 expect(f.restore).not.toHaveBeenCalled();expect(f.create).not.toHaveBeenCalled();accept(selected);
 expect(await importing).toBe(selected);expect(await joining).toBe(selected);s.close();
});
it('PBI selection uses the existing recovery primitive once and retains its accepted identity',async()=>{
 const f=fixture(),recovered={dispose:vi.fn()}as unknown as OpenIdentity;let accept!:(id:OpenIdentity)=>void;
 const recover=vi.fn(()=>new Promise<OpenIdentity>(resolve=>accept=resolve));const s=createCheckoutIdentitySession({...f.deps,recover});
 const selecting=s.recoverPbi(),joining=s.open();await Promise.resolve();accept(recovered);
 expect(await selecting).toBe(recovered);expect(await joining).toBe(recovered);expect(recover).toHaveBeenCalledOnce();expect(f.create).not.toHaveBeenCalled();s.close();
});
it('cancelled PBI preserves the held identity and never creates a replacement',async()=>{
 const f=fixture(),recover=vi.fn(async()=>{throw Error('passkey_cancelled');});const s=createCheckoutIdentitySession({...f.deps,recover});
 const held=await s.open();await expect(s.recoverPbi()).rejects.toThrow('passkey_cancelled');expect(held.dispose).not.toHaveBeenCalled();expect(await s.open()).toBe(held);expect(f.create).toHaveBeenCalledOnce();s.close();
});
