// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {paginateBook} from '../src/receiz/book-pages';
import ProofBookReader from '../src/features/media/ProofBookReader';
import type {BookChapter,MediaFile} from '../src/receiz/proof-media';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
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
