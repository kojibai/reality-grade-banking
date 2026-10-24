// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {VaultPublicPage} from '../src/features/vault/VaultPublicPage';
const load=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/vault/public-reader',()=>({createVaultPublicReader:()=>({load,open:vi.fn()})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|undefined;
afterEach(()=>{act(()=>root?.unmount());document.body.replaceChildren();vi.clearAllMocks();});
it('shows admitted owner and exact recorded holdings without asking for an account',async()=>{
 const vaultId='10000000-0000-4000-8000-000000000001',proof='a'.repeat(64),openPrivate=vi.fn();
 load.mockResolvedValue({vaultId,name:'Family collection',ownerReceizId:'owner.receiz.id',recordSha256:proof,sealedAtKaiUPulse:'123000000',grantsAccess:false,currentUnspentness:false,record:{},holdings:[{kind:'asset',id:'asset',title:'The original',quantityMicro:'1500000',sourceHead:'b'.repeat(64),atKaiUPulse:'122000000'}]});
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<VaultPublicPage route={{vaultId,proof}} onOpenPrivate={openPrivate}/>));
 expect(host.textContent).toContain('Family collection');expect(host.textContent).toContain('owner.receiz.id');expect(host.textContent).toContain('The original');expect(host.textContent).toContain('1.5');
 expect(host.textContent).toContain('Verified holdings');expect(host.textContent).toContain('View only');expect(openPrivate).not.toHaveBeenCalled();expect(load).toHaveBeenCalledOnce();
 expect(host.querySelector('a[href="/vault-verifier/v1/verify.html"]')?.textContent).toContain('Offline reader');
});
it('never claims holdings from an address without an exact public proof',async()=>{
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<VaultPublicPage route={{vaultId:'10000000-0000-4000-8000-000000000001',proof:null}} onOpenPrivate={vi.fn()}/>));
 expect(host.textContent).toContain('Open an original');expect(host.textContent).not.toContain('Verified holdings');expect(load).not.toHaveBeenCalled();
});
