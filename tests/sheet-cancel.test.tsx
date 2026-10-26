// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Sheet} from '../src/components/Sheet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('ignores a nested native file picker cancellation but keeps dialog cancellation and Close working',async()=>{
 const onClose=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<Sheet title="Messages" onClose={onClose}><input type="file"/><textarea defaultValue="My draft"/></Sheet>));
  await act(async()=>host.querySelector('input')!.dispatchEvent(new Event('cancel',{bubbles:true,cancelable:true})));
  expect(onClose).not.toHaveBeenCalled();expect(host.querySelector('dialog')?.open).toBe(true);expect(host.querySelector('textarea')?.value).toBe('My draft');
  await act(async()=>host.querySelector('dialog')!.dispatchEvent(new Event('cancel',{bubbles:false,cancelable:true})));expect(onClose).toHaveBeenCalledOnce();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click());expect(onClose).toHaveBeenCalledTimes(2);
 }finally{await act(async()=>root.unmount());host.remove();}
});
