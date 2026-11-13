// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LedgerProofControls} from '../src/public-ledger/LedgerProofControls';
const code=vi.hoisted(()=>{let open!:()=>void,finished!:()=>void;return{promise:new Promise<void>(resolve=>open=resolve),finished:new Promise<void>(resolve=>finished=resolve),open:()=>open(),complete:()=>finished()};});
vi.mock('../src/receiz/public-ledger-proof',async original=>{
 await code.promise;const actual=await original<typeof import('../src/receiz/public-ledger-proof')>();
 // Observe the real inspector settling; cold SDK loading is not a one-second
 // UI contract, and its rejection must still pass through the component.
 return{...actual,inspectPublicLedgerFile:async(...args:Parameters<typeof actual.inspectPublicLedgerFile>)=>{try{return await actual.inspectPublicLedgerFile(...args);}finally{code.complete();}}};
});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('reads the selected exact proof bytes while its inspector loads and still refuses invalid proof',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),read=vi.fn(async()=>new Uint8Array([1,2,3]).buffer),file=new File(['bad'],'bad.receizbundle');Object.defineProperty(file,'arrayBuffer',{value:read});
 try{await act(()=>root.render(<LedgerProofControls ledger={{} as never}/>));const field=host.querySelector<HTMLInputElement>('input[type=file]')!;Object.defineProperty(field,'files',{value:[file]});await act(()=>field.dispatchEvent(new Event('change',{bubbles:true})));expect(read).toHaveBeenCalledOnce();expect(host.textContent).toContain('Verifying the complete original');await act(async()=>{code.open();await code.finished;});expect(host.textContent).toContain('This file could not be admitted.');expect(host.textContent).not.toContain('Original proof verified');expect(host.textContent).not.toContain('Publish verified original');expect(read).toHaveBeenCalledOnce();}
 finally{code.open();await act(()=>root.unmount());host.remove();}
});
