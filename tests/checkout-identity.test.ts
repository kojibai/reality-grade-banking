import {expect,it,vi} from 'vitest';
import {createCheckoutIdentitySession} from '../src/checkout/checkout-identity';
import type {OpenIdentity} from '../src/receiz/native-identity';
function fixture(){const identity={dispose:vi.fn(),prepareAccountView:vi.fn()}as unknown as OpenIdentity;let held:OpenIdentity|null=null;const create=vi.fn(async()=>held=identity),restore=vi.fn(async()=>held),importIdentity=vi.fn(async()=>identity);return{identity,create,restore,importIdentity,deps:{create,restore,importIdentity}};}
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
