// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import ProofPdfReader from '../src/features/media/ProofPdfReader';
import {AssetObject} from '../src/features/media/AssetObject';
const held=vi.hoisted(()=>({acquire:vi.fn(),release:vi.fn(),getPage:vi.fn()}));
vi.mock('../src/receiz/pdf-reader',()=>({acquirePdf:held.acquire}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllMocks();});
function touch(target:Element,type:string,x:number,y=100,multi=false){
 const point={identifier:1,clientX:x,clientY:y},event=new Event(type,{bubbles:true,cancelable:true});
 Object.assign(event,{touches:type==='touchend'||type==='touchcancel'?[]:multi?[point,{...point,identifier:2}]:[point],changedTouches:[point]});
 act(()=>target.dispatchEvent(event));return event;
}
async function swipe(target:Element,dx:number,dy=0){touch(target,'touchstart',160);touch(target,'touchmove',160+dx,100+dy);await act(async()=>{touch(target,'touchend',160+dx,100+dy);});}
async function mount(url:string,cover=false,nested=false){
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(360);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
 held.getPage.mockImplementation(async()=>({getViewport:({scale}:{scale:number})=>({width:320*scale,height:480*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})}));
 held.acquire.mockReturnValue({promise:Promise.resolve({numPages:3,getPage:held.getPage}),release:held.release});
 const host=document.createElement('div'),root=createRoot(host),back=vi.fn(()=> <p>Proof</p>),reader=<ProofPdfReader url={url} title="A document" cover={cover}/>;
 await act(async()=>root.render(nested?<AssetObject front={reader} renderBack={back}/>:reader));
 return{host,root,back,paper:host.querySelector('.proof-pdf-pages')!,label:()=>host.querySelector('canvas')?.getAttribute('aria-label')};
}
it('swipes PDF pages in both directions using the held document and preserves the buttons and object front',async()=>{
 const {host,root,back,paper,label}=await mount('blob:pdf-swipe',false,true);
 try{
  await swipe(paper,100);expect(label()).toBe('A document · page 1');
  await swipe(paper,-100);expect(label()).toBe('A document · page 2');
  await swipe(paper,-100);expect(label()).toBe('A document · page 3');
  await swipe(paper,-100);expect(label()).toBe('A document · page 3');
  await swipe(paper,100);expect(label()).toBe('A document · page 2');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Previous PDF page"]')!.click());expect(label()).toBe('A document · page 1');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Next PDF page"]')!.click());expect(label()).toBe('A document · page 2');
  expect(held.acquire).toHaveBeenCalledOnce();expect(back).not.toHaveBeenCalled();expect(host.querySelector('.asset-object')?.getAttribute('data-showing')).toBe('front');
 }finally{await act(async()=>root.unmount());}
});
it('preserves scroll, panning, small drags and single-finger cancellation',async()=>{
 const {host,root,paper,label}=await mount('blob:pdf-gestures');
 try{
  await swipe(paper,-100,140);await swipe(paper,-25);
  touch(paper,'touchstart',160);touch(paper,'touchcancel',160);touch(paper,'touchend',20);
  touch(paper,'touchstart',160);touch(paper,'touchmove',100,100,true);touch(paper,'touchend',20);
  expect(label()).toBe('A document · page 1');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Zoom in document"]')!.click());await swipe(paper,-100);expect(label()).toBe('A document · page 1');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Zoom out document"]')!.click());await swipe(paper,-100);expect(label()).toBe('A document · page 2');
 }finally{await act(async()=>root.unmount());}
});
it('keeps cover previews on their first page without adding page gestures',async()=>{
 const {root,paper,label}=await mount('blob:pdf-cover',true);
 try{await swipe(paper,-100);expect(label()).toBe('A document · page 1');expect(paper.hasAttribute('data-asset-no-swipe')).toBe(false);}finally{await act(async()=>root.unmount());}
});


it('pinches the held canvas without requesting another PDF or changing pages',async()=>{
 const {host,root,paper,label}=await mount('blob:pdf-pinch');
 try{
  const canvas=host.querySelector('canvas')!;
  vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue(new DOMRect(16,16,328,492));
  const send=(type:string,x1:number,x2?:number)=>{
   const first={identifier:1,clientX:x1,clientY:150},second={identifier:2,clientX:x2,clientY:150};
   const event=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperties(event,{touches:{value:x2===undefined?[first]:[first,second]},changedTouches:{value:[second]}});
   act(()=>paper.dispatchEvent(event));return event;
  };
  const renders=held.getPage.mock.calls.length;
  expect(send('touchstart',140,220).defaultPrevented).toBe(true);
  expect(send('touchmove',95,275).defaultPrevented).toBe(true);
  expect(canvas.style.transform).toContain('scale(2)');
  expect(held.getPage).toHaveBeenCalledTimes(renders);
  await act(async()=>{send('touchend',95);});
  expect(canvas.style.width).toBe('656px');expect(canvas.style.transform).toBe('');
  expect(held.getPage).toHaveBeenCalledTimes(renders+1);expect(held.acquire).toHaveBeenCalledOnce();
  expect(label()).toBe('A document · page 1');
 }finally{await act(async()=>root.unmount());}
});
