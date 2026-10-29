// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LedgerProofControls} from '../src/public-ledger/LedgerProofControls';
const code=vi.hoisted(()=>{let open!:()=>void;return{promise:new Promise<void>(resolve=>open=resolve),open:()=>open()};});
vi.mock('../src/receiz/public-ledger-proof',async original=>{await code.promise;return original();});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('reads the selected exact proof bytes while its inspector loads and still refuses invalid proof',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),read=vi.fn(async()=>new Uint8Array([1,2,3]).buffer),file=new File(['bad'],'bad.receizbundle');Object.defineProperty(file,'arrayBuffer',{value:read});
 try{await act(()=>root.render(<LedgerProofControls ledger={{} as never}/>));const field=host.querySelector<HTMLInputElement>('input[type=file]')!;Object.defineProperty(field,'files',{value:[file]});await act(()=>field.dispatchEvent(new Event('change',{bubbles:true})));expect(read).toHaveBeenCalledOnce();await act(()=>code.open());await vi.waitFor(()=>expect(host.textContent).toContain('This file could not be admitted.'));expect(host.textContent).not.toContain('Original proof verified');expect(host.textContent).not.toContain('Publish verified original');expect(read).toHaveBeenCalledOnce();}
 finally{code.open();await act(()=>root.unmount());host.remove();}
});
