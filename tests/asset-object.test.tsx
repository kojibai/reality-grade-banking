// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {AssetObject} from '../src/features/media/AssetObject';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
function swipe(target:Element,dx:number,dy=0){
 const dispatch=(type:string,x:number,y:number)=>{const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{touches:type==='touchstart'?[{identifier:1,clientX:x,clientY:y}]:[],changedTouches:[{identifier:1,clientX:x,clientY:y}]});target.dispatchEvent(event);return event;};
 dispatch('touchstart',160,100);return dispatch('touchend',160+dx,100+dy);
}
it('keeps proof material lazy, exposes the current side and preserves the front component while flipping',()=>{
 const host=document.createElement('div'),root=createRoot(host),renderBack=vi.fn(()=> <p>Proof material</p>);
 try{act(()=>root.render(<AssetObject front={<audio controls src="blob:original"/>} renderBack={renderBack} label="Album"/>));expect(renderBack).not.toHaveBeenCalled();const audio=host.querySelector('audio');
  const flip=host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!;act(()=>flip.click());expect(host.textContent).toContain('Proof material');expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('true');expect(host.querySelector('audio')).toBe(audio);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show front"]')!.click());expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('false');expect(host.querySelector('[data-side="back"]')?.textContent).not.toContain('Proof material');
 }finally{act(()=>root.unmount());}
});
it('flips on a deliberate horizontal touch swipe while leaving vertical gestures and controls alone',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<AssetObject front={<div><p className="art">Artwork</p><audio controls/><video controls/><a href="#source">Source</a><input/><button>Play</button></div>} renderBack={()=> <p>Proof</p>}/>));
  const stage=host.querySelector('.asset-object-stage')!;let vertical:Event|undefined;act(()=>{vertical=swipe(stage,-90,100);});expect(vertical!.defaultPrevented).toBe(false);expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('false');
  for(const selector of ['audio','video','a','input','button'])act(()=>swipe(host.querySelector(selector)!,-100));expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('false');
  act(()=>swipe(host.querySelector('.art')!,-100,5));expect(host.querySelector('[data-side="back"]')?.getAttribute('aria-hidden')).toBe('false');act(()=>swipe(stage,100,0));expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('false');
 }finally{act(()=>root.unmount());}
});
it('pauses presentation motion outside the viewport and when the document is hidden',()=>{
 let observe!:(entries:{isIntersecting:boolean}[])=>void;const disconnect=vi.fn();vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof observe){observe=callback;}observe(){}disconnect=disconnect;});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<AssetObject front={<p>Artwork</p>} renderBack={()=> <p>Proof</p>}/>));const object=host.querySelector<HTMLElement>('.asset-object')!;
  act(()=>observe([{isIntersecting:false}]));expect(object.dataset.motion).toBe('paused');act(()=>observe([{isIntersecting:true}]));expect(object.dataset.motion).toBe('running');
  Object.defineProperty(document,'hidden',{configurable:true,value:true});act(()=>document.dispatchEvent(new Event('visibilitychange')));expect(object.dataset.motion).toBe('paused');
 }finally{act(()=>root.unmount());Object.defineProperty(document,'hidden',{configurable:true,value:false});}expect(disconnect).toHaveBeenCalled();
});
it('allows a cover swipe without activating its open button and keeps the flip control separate',()=>{
 const host=document.createElement('div'),root=createRoot(host),open=vi.fn();
 try{act(()=>root.render(<AssetObject front={<button data-asset-swipe="" onClick={open}>Open original</button>} renderBack={()=> <p>Proof</p>}/>));const cover=host.querySelector('button')!;
  act(()=>swipe(cover,-100));act(()=>cover.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1})));expect(open).not.toHaveBeenCalled();expect(host.querySelector('[data-side="back"]')?.getAttribute('aria-hidden')).toBe('false');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show front"]')!.click());expect(host.querySelector('[data-side="front"]')?.getAttribute('aria-hidden')).toBe('false');act(()=>cover.click());expect(open).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('does not apply pointer tilt when the viewer prefers reduced motion',()=>{
 vi.stubGlobal('IntersectionObserver',undefined);vi.stubGlobal('matchMedia',()=>({matches:true}));const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<AssetObject front={<p>Artwork</p>} renderBack={()=> <p>Proof</p>}/>));const stage=host.querySelector<HTMLElement>('.asset-object-stage')!;
  vi.spyOn(stage,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:100,height:100,right:100,bottom:100,x:0,y:0,toJSON:()=>({})});const event=new Event('pointermove',{bubbles:true});Object.assign(event,{pointerType:'mouse',clientX:90,clientY:90});act(()=>stage.dispatchEvent(event));expect(stage.style.getPropertyValue('--asset-tilt-x')).toBe('');expect(stage.style.getPropertyValue('--asset-tilt-y')).toBe('');
 }finally{act(()=>root.unmount());vi.restoreAllMocks();}
});
