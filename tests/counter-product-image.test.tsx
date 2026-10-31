// @vitest-environment happy-dom
import {act} from 'react';import{createRoot}from'react-dom/client';import{expect,it,vi}from'vitest';
import{CounterProductImage}from'../src/features/account/counter/CounterProductImage';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('does not load private product bytes until the image is near the visible area and releases its own URL',async()=>{
 let enter!:(entries:{isIntersecting:boolean}[])=>void;const observe=vi.fn(),disconnect=vi.fn(),image=vi.fn(async()=>new Uint8Array([1,2,3])),create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:product'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof enter){enter=callback;}observe=observe;disconnect=disconnect;});const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(async()=>root.render(<CounterProductImage api={{productImage:image}as never} source={'sha256:'+'a'.repeat(64)} alt="Coffee"/>));expect(image).not.toHaveBeenCalled();expect(observe).toHaveBeenCalledOnce();await act(async()=>enter([{isIntersecting:true}]));expect(image).toHaveBeenCalledOnce();expect(host.querySelector('img')?.src).toBe('blob:product');await act(async()=>root.unmount());expect(revoke).toHaveBeenCalledWith('blob:product');}finally{host.remove();create.mockRestore();revoke.mockRestore();vi.unstubAllGlobals();}
});
