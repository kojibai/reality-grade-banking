// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import App from '../src/App';
const p=vi.hoisted(()=>({account:vi.fn(()=>{throw Error('Ordinary account must not open');})}));
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:p.account}));
vi.mock('../src/features/vault/VaultPage',()=>({VaultPage:()=> <p>Public Vault evidence</p>}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens a public Vault locator without mounting an account or loading its balance',async()=>{
 history.replaceState(null,'','/vault/10000000-0000-4000-8000-000000000001/?proof='+('a'.repeat(64)));
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(async()=>root.render(<App/>));expect(host.textContent).toContain('Public Vault evidence');expect(p.account).not.toHaveBeenCalled();}
 finally{act(()=>root.unmount());host.remove();history.replaceState(null,'','/');}
});
