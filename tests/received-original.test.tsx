// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {ReceivedOriginal} from '../src/features/deposit/ReceivedOriginal';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const review={digest:'a'.repeat(64),filename:'delivered.receiz',title:'Carried original',owner:'sender.receiz.id',size:100,kind:'claim'};
function fixture(saved:unknown=null){
 const api={status:vi.fn(async()=>saved),inspect:vi.fn(async()=>review),receive:vi.fn(async()=>({status:'held',digest:review.digest,filename:'received.receiz'})),resume:vi.fn(async()=>({status:'held',digest:review.digest,filename:'received.receiz'})),exportHeld:vi.fn(),discard:vi.fn()};
 const identity={receivedProof:async()=>api}as unknown as OpenIdentity,refresh=vi.fn(),host=document.createElement('div'),root=createRoot(host);
 return{api,identity,refresh,host,root,mount:()=>act(async()=>root.render(<ReceivedOriginal identity={identity} onRefresh={refresh} onClose={()=>{}}/>)),close:()=>act(()=>root.unmount())};
}
function click(host:HTMLElement,text:string){[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click();}
async function select(host:HTMLElement){const picker=host.querySelector('input[type=file]')!;Object.defineProperty(picker,'files',{value:[new File(['fixture'],'delivered.receiz')]});await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));}
it('reviews locally and waits for explicit exact-original approval before receiving',async()=>{
 const f=fixture();try{await f.mount();await select(f.host);expect(f.host.textContent).toContain('Carried original');expect(f.api.receive).not.toHaveBeenCalled();expect(f.host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(true);
 act(()=>f.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>click(f.host,'Receive original'));
 expect(f.api.receive).toHaveBeenCalledExactlyOnceWith(review,review.digest);expect(f.refresh).toHaveBeenCalledOnce();expect(f.host.textContent).toContain('Your original is held.');expect(f.host.textContent).not.toContain('Added to your balance');}finally{f.close();}
});
it('opening a saved unknown request never submits it or allows a replacement',async()=>{
 const f=fixture({status:'unknown',digest:review.digest,filename:'delivered.receiz'});try{await f.mount();expect(f.api.resume).not.toHaveBeenCalled();expect(f.host.querySelector('input[type=file]')).toBeNull();expect(f.host.textContent).toContain('Resume the same original');
 act(()=>f.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>click(f.host,'Resume receiving'));expect(f.api.resume).toHaveBeenCalledExactlyOnceWith(review.digest);expect(f.api.receive).not.toHaveBeenCalled();}finally{f.close();}
});
it('a completed saved receive does not take over the next proof deposit',async()=>{
 const f=fixture({status:'held',digest:review.digest,filename:'previous.receiz'});try{await f.mount();expect(f.host.querySelector('input[type=file]')).not.toBeNull();expect(f.host.textContent).not.toContain('previous.receiz');}finally{f.close();}
});
it('retains a failed ownership attempt as recoverable without claiming success or refreshing cash',async()=>{
 const f=fixture();try{await f.mount();await select(f.host);f.api.receive.mockResolvedValueOnce({status:'unknown',digest:review.digest,filename:'delivered.receiz'});
 act(()=>f.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>click(f.host,'Receive original'));expect(f.host.textContent).toContain('Your receiving request is saved.');expect(f.host.textContent).not.toContain('Your original is held.');expect(f.refresh).not.toHaveBeenCalled();}finally{f.close();}
});
it('a stale identity operation cannot leave the new ID busy or unlock its newer review',async()=>{
 const f=fixture();let finishOld!:(value:typeof review)=>void,finishNew!:(value:typeof review)=>void;
 f.api.inspect.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}));
 const nextApi={...f.api,inspect:vi.fn(()=>new Promise(resolve=>{finishNew=resolve;}))},nextIdentity={receivedProof:async()=>nextApi}as unknown as OpenIdentity;
 try{await f.mount();await select(f.host);expect(f.host.querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true);
 await act(async()=>f.root.render(<ReceivedOriginal identity={nextIdentity} onRefresh={f.refresh} onClose={()=>{}}/>));expect(f.host.querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(false);
 await select(f.host);await act(async()=>finishOld(review));expect(f.host.querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true);
 await act(async()=>finishNew(review));expect(f.host.querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(false);expect(nextApi.receive).not.toHaveBeenCalled();
 }finally{f.close();}
});
