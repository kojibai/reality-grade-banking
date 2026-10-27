// @vitest-environment happy-dom
import {act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CollectibleCardView} from '../src/features/collectibles/CollectibleCardView';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const cleanup:Array<()=>void>=[];
afterEach(()=>{cleanup.splice(0).forEach(f=>f());vi.restoreAllMocks();vi.unstubAllGlobals();});
async function fixture(reduced=false){
 vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener(){},removeEventListener(){}}));
 const onFlip=vi.fn(),fetch=vi.fn(),frame=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('requestAnimationFrame',frame);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 function Harness(){const [flipped,setFlipped]=useState(false);return <CollectibleCardView label="Original card" flipped={flipped} onFlip={value=>{onFlip(value);setFlipped(value);}} front={<span>Exact front</span>} back={<span>Exact back</span>}/>;}
 await act(async()=>root.render(<Harness/>));cleanup.push(()=>{act(()=>root.unmount());host.remove();});
 const card=host.querySelector<HTMLElement>('[data-collectible-card]')!;vi.spyOn(card,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:200,height:300,right:200,bottom:300,x:0,y:0,toJSON(){}});
 const pointer=async(type:string,x:number,y:number)=>{const event=new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true,cancelable:true});await act(async()=>card.dispatchEvent(event));return event;};
 return{host,card,onFlip,fetch,frame,pointer};
}
it('flips the exact held faces on a horizontal swipe once, preserving the following click from double-flipping',async()=>{
 const f=await fixture();await f.pointer('pointerdown',160,120);await f.pointer('pointermove',90,124);await f.pointer('pointerup',80,125);
 expect(f.onFlip).toHaveBeenCalledExactlyOnceWith(true);expect(f.card.getAttribute('aria-pressed')).toBe('true');
 expect(document.getElementById(f.card.getAttribute('aria-describedby')!)?.textContent).toBe('Exact back');
 await act(async()=>f.card.click());expect(f.onFlip).toHaveBeenCalledOnce();expect(f.host.querySelector('[data-card-face=back]')?.getAttribute('aria-hidden')).toBe('false');
 expect(f.fetch).not.toHaveBeenCalled();expect(f.frame).not.toHaveBeenCalled();
});
it('leaves vertical scrolling and cancelled gestures untouched instead of turning them into a flip',async()=>{
 const f=await fixture();await f.pointer('pointerdown',100,200);const move=await f.pointer('pointermove',105,90);await f.pointer('pointerup',107,80);expect(move.defaultPrevented).toBe(false);expect(f.onFlip).not.toHaveBeenCalled();
 await f.pointer('pointerdown',160,120);await f.pointer('pointermove',100,122);await f.pointer('pointercancel',90,122);expect(f.onFlip).not.toHaveBeenCalled();
});
it('keeps keyboard/tap controls and skips handling tilt when reduced motion is requested',async()=>{
 const f=await fixture(true);await act(async()=>f.card.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));expect(f.onFlip).toHaveBeenCalledExactlyOnceWith(true);
 await act(async()=>f.card.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:170,clientY:70,bubbles:true})));
 expect(f.card.style.getPropertyValue('--collectible-tilt-x')).toBe('');expect(f.frame).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});
it('supports a normal tap and a reverse swipe while keeping handling movement local to the selected card',async()=>{
 const f=await fixture();await act(async()=>f.card.click());expect(f.card.getAttribute('aria-pressed')).toBe('true');
 await f.pointer('pointerdown',50,120);await f.pointer('pointermove',110,122);
 expect(f.card.style.getPropertyValue('--collectible-tilt-y')).not.toBe('');
 await f.pointer('pointerup',130,124);expect(f.card.getAttribute('aria-pressed')).toBe('false');
 expect(f.card.hasAttribute('data-handling')).toBe(false);expect(f.card.style.getPropertyValue('--collectible-tilt-y')).toBe('');
 expect(f.onFlip.mock.calls).toEqual([[true],[false]]);expect(f.frame).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});
it('cancels a turn when a second touch begins instead of consuming a pinch',async()=>{
 const f=await fixture();await f.pointer('pointerdown',160,120);await f.pointer('pointermove',100,122);
 const second=new PointerEvent('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false,clientX:60,clientY:120,bubbles:true,cancelable:true});
 await act(async()=>f.card.dispatchEvent(second));await f.pointer('pointerup',50,125);
 expect(second.defaultPrevented).toBe(false);expect(f.onFlip).not.toHaveBeenCalled();expect(f.card.hasAttribute('data-handling')).toBe(false);
});
it('prevents repeated Space presses from scrolling or repeatedly turning a focused card',async()=>{
 const f=await fixture();const first=new KeyboardEvent('keydown',{key:' ',repeat:false,bubbles:true,cancelable:true}),repeat=new KeyboardEvent('keydown',{key:' ',repeat:true,bubbles:true,cancelable:true});
 await act(async()=>f.card.dispatchEvent(first));await act(async()=>f.card.dispatchEvent(repeat));
 expect(first.defaultPrevented).toBe(true);expect(repeat.defaultPrevented).toBe(true);expect(f.onFlip).toHaveBeenCalledExactlyOnceWith(true);
});
