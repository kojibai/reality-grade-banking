// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {paginateBook} from '../src/receiz/book-pages';
import ProofBookReader from '../src/features/media/ProofBookReader';
import {AssetObject} from '../src/features/media/AssetObject';
import type {BookChapter,MediaFile} from '../src/receiz/proof-media';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const gestureBook=(digest:string):MediaFile=>({kind:'book',filename:'Pages.epub',mimeType:'application/epub+zip',bytes:new Uint8Array([1]),payloadDigest:digest,chapters:[{title:'First',text:'First page.'},{title:'Second',text:'Second page.'},{title:'Third',text:'Third page.'}]});
function touch(target:Element,type:string,points:{identifier:number;clientX:number;clientY:number}[],changed=points){
 const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{touches:points,changedTouches:changed});act(()=>target.dispatchEvent(event));return event;
}
const finger=(x:number,y=100)=>({identifier:1,clientX:x,clientY:y});
function swipe(target:Element,dx:number,dy=0){touch(target,'touchstart',[finger(160)]);touch(target,'touchmove',[finger(160+dx,100+dy)]);return touch(target,'touchend',[],[finger(160+dx,100+dy)]);}
it('turns one retained book page per horizontal swipe, respects both ends and keeps the existing buttons',()=>{
 const host=document.createElement('div'),root=createRoot(host),fetcher=vi.spyOn(globalThis,'fetch');
 try{
  act(()=>root.render(<ProofBookReader file={gestureBook('swipe-navigation')} expanded onExpand={()=>{}}/>));
  const paper=()=>host.querySelector<HTMLElement>('.proof-book-paper')!;
  swipe(paper(),100);expect(paper().textContent).toBe('First page.');
  paper().scrollTop=120;swipe(paper(),-100);expect(paper().textContent).toBe('Second page.');expect(paper().scrollTop).toBe(0);
  swipe(paper(),-100);expect(paper().textContent).toBe('Third page.');swipe(paper(),-100);expect(paper().textContent).toBe('Third page.');
  swipe(paper(),100);expect(paper().textContent).toBe('Second page.');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Previous book page"]')!.click());expect(paper().textContent).toBe('First page.');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Next book page"]')!.click());expect(paper().textContent).toBe('Second page.');expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetcher.mockRestore();}
});
it('leaves vertical scrolling, small drags, cancelled gestures, multi-touch and text selection alone',()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  act(()=>root.render(<ProofBookReader file={gestureBook('swipe-guardrails')} expanded onExpand={()=>{}}/>));const paper=host.querySelector<HTMLElement>('.proof-book-paper')!;
  expect(swipe(paper,-100,140).defaultPrevented).toBe(false);swipe(paper,-25);
  touch(paper,'touchstart',[finger(160)]);touch(paper,'touchmove',[finger(155,160)]);touch(paper,'touchend',[],[finger(20,160)]);
  touch(paper,'touchstart',[finger(160)]);touch(paper,'touchcancel',[],[finger(160)]);touch(paper,'touchend',[],[finger(20)]);
  touch(paper,'touchstart',[finger(160)]);touch(paper,'touchmove',[finger(100),{...finger(180),identifier:2}]);touch(paper,'touchend',[],[finger(20)]);
  const selection=window.getSelection()!,range=document.createRange();range.selectNodeContents(paper.querySelector('p')!);selection.addRange(range);swipe(paper,-100);selection.removeAllRanges();
  expect(paper.textContent).toBe('First page.');swipe(paper,-100);expect(paper.textContent).toBe('Second page.');
 }finally{window.getSelection()?.removeAllRanges();act(()=>root.unmount());host.remove();}
});
it('turns the book without flipping its enclosing proof object, while contents and text controls remain available',()=>{
 const host=document.createElement('div'),root=createRoot(host),proof=vi.fn(()=> <p>Proof material</p>);
 try{
  act(()=>root.render(<AssetObject front={<ProofBookReader file={gestureBook('swipe-nested-proof')} expanded={false} onExpand={()=>{}}/>} renderBack={proof}/>));
  swipe(host.querySelector('.proof-book-paper p')!,-100);expect(host.querySelector('.proof-book-paper')?.textContent).toBe('Second page.');expect(host.querySelector('.asset-object')?.getAttribute('data-showing')).toBe('front');expect(proof).not.toHaveBeenCalled();
  swipe(host.querySelector('[aria-label="Next book page"]')!,-100);expect(host.querySelector('.proof-book-paper')?.textContent).toBe('Second page.');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Larger book text"]')!.click());expect(host.querySelector<HTMLElement>('.proof-book-paper')?.style.fontSize).toBe('20px');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Book contents"]')!.click());expect(host.querySelector('[aria-label="Book chapters"]')).not.toBeNull();
 }finally{act(()=>root.unmount());}
});
it('keeps every character and chapter in bounded local pages, including a cover and oversized paragraphs',()=>{
 const text='A chapter with every word kept. '.repeat(900)+'Final words. 🌍';
 const chapters:BookChapter[]=[{title:'Cover',text:'',blocks:[{kind:'image',path:'cover.png',text:'Cover'}]},{title:'One',text,blocks:[{kind:'heading',text:'One'},{kind:'paragraph',text}]}];
 const pages=paginateBook(chapters);expect(pages[0]).toEqual({chapter:0,blocks:chapters[0].blocks});expect(pages.length).toBeGreaterThan(10);expect(pages.flatMap(page=>page.blocks).filter(block=>block.kind==='paragraph').map(block=>block.text).join('')).toBe(text);expect(pages.every(page=>page.blocks.length<=24&&page.blocks.reduce((sum,block)=>sum+block.text.length,0)<=2200)).toBe(true);
});
it('shows carried illustrations, supports chapters, and retains book position independently of another reader',async()=>{
 const file:MediaFile={kind:'book',filename:'Book.epub',mimeType:'application/epub+zip',bytes:new Uint8Array([1]),payloadDigest:'dedicated-book-fixture',chapters:[{title:'Cover',text:'',blocks:[{kind:'image',path:'cover.png',text:'Book cover'}]},{title:'The chapter',text:'Carried words. '.repeat(500)}],book:{title:'A carried book',author:'An author',images:[{path:'cover.png',mimeType:'image/png',bytes:new Uint8Array([1])}]}};
 const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:carried-cover'),release=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),fetcher=vi.spyOn(globalThis,'fetch');
 const host=document.createElement('div'),root=createRoot(host);try{
 await act(()=>root.render(<ProofBookReader file={file} expanded={false} onExpand={()=>{}}/>));expect(host.querySelector('img')?.src).toBe('blob:carried-cover');expect(host.textContent).toContain('An author');
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Next book page"]')!.click());expect(host.querySelector('.proof-book-paper')?.textContent).toContain('Carried words.');expect(host.querySelectorAll('.proof-book-page p').length).toBeLessThan(25);
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Larger book text"]')!.click());expect(host.querySelector<HTMLElement>('.proof-book-paper')?.style.fontSize).toBe('20px');
 await act(()=>root.render(null));await act(()=>root.render(<ProofBookReader file={file} expanded onExpand={()=>{}}/>));expect(host.querySelector('.proof-book-paper')?.textContent).toContain('Carried words.');expect(host.querySelector<HTMLElement>('.proof-book-paper')?.style.fontSize).toBe('20px');
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Book contents"]')!.click());expect(host.querySelector('[aria-label="Book chapters"]')?.textContent).toContain('The chapter');act(()=>[...host.querySelectorAll<HTMLButtonElement>('.proof-book-contents>button')][0].click());expect(host.querySelector('img')?.src).toBe('blob:carried-cover');expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(()=>root.unmount());host.remove();url.mockRestore();release.mockRestore();fetcher.mockRestore();}
});
