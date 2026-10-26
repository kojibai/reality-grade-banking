// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import type {AssetComposerDraft} from '../src/receiz/asset-composer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
async function select(host:HTMLElement,label:string,files:File[]){const input=host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;Object.defineProperty(input,'files',{value:files,configurable:true});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
it('keeps artwork separate when selected before music and exposes the matching metadata',async()=>{
 const {AssetComposer}=await import('../src/features/assets/AssetComposer');
 let draft:AssetComposerDraft={title:'A release',description:'',kind:'moment',longForm:'An essay',files:[]};const host=document.createElement('div'),root=createRoot(host);
 const render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);await select(host,'Choose cover',[new File(['cover'],'cover.png',{type:'image/png'})]);await select(host,'Choose original',[new File(['song'],'song.mp3',{type:'audio/mpeg'})]);
  expect(draft.kind).toBe('audio');expect(draft.files.map(file=>file.role)).toEqual(['cover','primary']);expect(host.textContent).toContain('Primary artist');expect(host.textContent).toContain('cover.png');expect(draft.longForm).toBe('An essay');
  await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Remove cover.png"]')!.click());expect(draft.files.map(file=>file.role)).toEqual(['primary']);
 }finally{act(()=>root.unmount());}
});
it('keeps book bytes, cover and full text independent and preserves attachment order',async()=>{
 const {AssetComposer}=await import('../src/features/assets/AssetComposer');let draft:AssetComposerDraft={title:'A book',description:'',kind:'moment',longForm:'Full essay',files:[]};const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);await select(host,'Choose original',[new File(['book'],'book.epub',{type:'application/epub+zip'})]);await select(host,'Add attachments',[new File(['a'],'a.txt',{type:'text/plain'}),new File(['b'],'b.txt',{type:'text/plain'})]);expect(host.textContent).toContain('Primary author');expect(draft.files[0].file.name).toBe('book.epub');expect(draft.longForm).toBe('Full essay');await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Move b.txt up"]')!.click());expect(draft.files.filter(file=>file.role==='attachment').map(file=>file.file.name)).toEqual(['b.txt','a.txt']);
 }finally{act(()=>root.unmount());}
});
it('rejects a file above the effective limit before retaining it or reading its bytes',async()=>{
 const {AssetComposer}=await import('../src/features/assets/AssetComposer');const change=vi.fn(),host=document.createElement('div'),root=createRoot(host),file=new File(['oversize'],'large.mp3',{type:'audio/mpeg'});Object.defineProperty(file,'size',{value:65*1024*1024});const read=vi.spyOn(file,'arrayBuffer');
 try{await act(async()=>root.render(<AssetComposer value={{title:'A release',description:'',kind:'moment',longForm:'',files:[]}} onChange={change}/>));await select(host,'Choose original',[file]);expect(change).not.toHaveBeenCalled();expect(host.querySelector('[role=alert]')?.textContent).toContain('64 MB');expect(read).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});

it('updates the tangible preview from the retained title and cover without reading or changing the original files',async()=>{
 const {AssetComposer}=await import('../src/features/assets/AssetComposer');const original=new File(['song'],'blue-hour.wav',{type:'audio/wav'}),cover=new File(['cover'],'cover.png',{type:'image/png'}),read=vi.spyOn(original,'arrayBuffer');
 let draft:AssetComposerDraft={title:'Blue Hour',description:'',kind:'audio',longForm:'',files:[{id:'source',file:original,role:'primary'},{id:'cover',file:cover,role:'cover'}]};
 const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);expect(host.querySelector('[aria-label="Your asset preview"]')?.textContent).toContain('Blue Hour');expect(host.querySelector('[aria-label="Your asset preview"] img[alt="Selected cover"]')).not.toBeNull();
  const title=host.querySelector<HTMLInputElement>('[aria-label=Title]')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(title,'Blue Hour, Live');title.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(host.querySelector('[aria-label="Your asset preview"]')?.textContent).toContain('Blue Hour, Live');expect(draft.files[0].file).toBe(original);expect(draft.files[1].file).toBe(cover);expect(read).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
