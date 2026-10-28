// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import{it,expect,vi}from'vitest';
import {MeetingPage} from '../src/features/meeting/MeetingPage';
const inspect=vi.hoisted(()=>vi.fn());vi.mock('../src/receiz/identity-lock',()=>({inspectIdentityLock:inspect}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const meeting={title:'Plan',startAt:'2026-10-28T14:00:00Z',host:{displayName:'BJ'}};
it('offers two icon-only recovery actions and inspects an Identity Record without joining',async()=>{
 const host=document.createElement('div'),root=createRoot(host),importIdentity=vi.fn(async()=>({})),recoverPbi=vi.fn(async()=>({})),join=vi.fn();
 const service={known:()=>meeting,read:async()=>meeting,importIdentity,recoverPbi,join};inspect.mockResolvedValue({needsPhrase:false});
 try{await act(async()=>root.render(<MeetingPage service={service as never}/>));
 const buttons=host.querySelectorAll('.meeting-identity-actions button');expect(buttons.length).toBe(2);expect([...buttons].every(b=>b.textContent==='')).toBe(true);
 const input=host.querySelector('input[type=file]')!,file=new File(['source'],'identity.png');Object.defineProperty(input,'files',{value:[file]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));expect(importIdentity).toHaveBeenCalledExactlyOnceWith(file,'');expect(join).not.toHaveBeenCalled();
 await act(async()=>(host.querySelector('[aria-label="Use PBI"]')as HTMLButtonElement).click());expect(recoverPbi).toHaveBeenCalledOnce();expect(join).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('a locked record holds Join until the phrase is supplied or selection is cancelled',async()=>{
 const host=document.createElement('div'),root=createRoot(host),importIdentity=vi.fn(async()=>({})),join=vi.fn();inspect.mockResolvedValue({needsPhrase:true});
 const service={known:()=>meeting,read:async()=>meeting,importIdentity,recoverPbi:vi.fn(),join};
 try{await act(async()=>root.render(<MeetingPage service={service as never}/>));const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{value:[new File(['source'],'locked.png')]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
 expect((host.querySelector('.meeting-join')as HTMLButtonElement).disabled).toBe(true);expect(host.querySelector('input[type=password]')).not.toBeNull();expect(importIdentity).not.toHaveBeenCalled();
 await act(async()=>(host.querySelector('[aria-label="Cancel Identity Record selection"]')as HTMLButtonElement).click());expect((host.querySelector('.meeting-join')as HTMLButtonElement).disabled).toBe(false);expect(join).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
