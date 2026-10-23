// @vitest-environment happy-dom
import {act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CopyFeedbackIcon,useCopyFeedback} from '../src/components/CopyFeedback';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function Control({value}:{value:string}){
 const {copied,confirm,clear}=useCopyFeedback(value);
 return <button onClick={()=>void navigator.clipboard.writeText(value).then(confirm,clear)}><CopyFeedbackIcon copied={copied}/>Copy</button>;
}
it('ignores an old clipboard completion after its destination changed and cleans its only timer on unmount',async()=>{
 vi.useFakeTimers();let finish!:()=>void;const clipboard=vi.fn().mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;})).mockResolvedValue(undefined);
 vi.stubGlobal('navigator',{clipboard:{writeText:clipboard}});const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<StrictMode><Control value="first"/></StrictMode>));expect(vi.getTimerCount()).toBe(0);
  act(()=>host.querySelector('button')!.click());
  await act(async()=>root.render(<StrictMode><Control value="second"/></StrictMode>));
  await act(async()=>host.querySelector('button')!.click());expect(host.querySelector('[data-copied="true"]')).not.toBeNull();
  await act(async()=>finish());expect(host.querySelector('[data-copied="true"]')).not.toBeNull();expect(clipboard.mock.calls).toEqual([['first'],['second']]);
  act(()=>root.unmount());expect(vi.getTimerCount()).toBe(0);
 }finally{vi.useRealTimers();vi.unstubAllGlobals();}
});
it('does not schedule feedback work when a clipboard request finishes after unmount',async()=>{
 vi.useFakeTimers();let finish!:()=>void;vi.stubGlobal('navigator',{clipboard:{writeText:()=>new Promise<void>(resolve=>{finish=resolve;})}});
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<Control value="held"/>));act(()=>host.querySelector('button')!.click());act(()=>root.unmount());await act(async()=>finish());expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();vi.unstubAllGlobals();}
});
