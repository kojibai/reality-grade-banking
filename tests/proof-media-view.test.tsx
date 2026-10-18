// @vitest-environment happy-dom
// Presentation fixtures only; canonical proof verification is tested separately.
import{act}from'react';import{createRoot}from'react-dom/client';import{afterEach,expect,it,vi}from'vitest';
const open=vi.hoisted(()=>vi.fn());vi.mock('../src/receiz/proof-media',()=>({openProofMedia:open}));
import{ProofMedia}from'../src/features/media/ProofMedia';
import{Sheet}from'../src/components/Sheet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const source={kind:'held' as const,digest:'a'.repeat(64),filename:'source.receiz',bytes:new Uint8Array([1])};
const media={artifactDigest:source.digest,files:[{kind:'text',filename:'Essay.html',mimeType:'text/html',bytes:new TextEncoder().encode('<p>Bound text</p>'),payloadDigest:'b'.repeat(64),text:'Bound text'}]};
afterEach(()=>{open.mockReset();vi.restoreAllMocks();});
it('retains every paragraph without amplifying text into unbounded DOM nodes',async()=>{
 const text='A\n\n'.repeat(5000)+'The end.';open.mockResolvedValue({...media,files:[{...media.files[0],text}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Long essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());expect(host.querySelector('.proof-reading-text')?.textContent).toBe(text);expect(host.querySelector('.proof-reading-paper')?.querySelectorAll('*')).toHaveLength(1);}finally{act(()=>root.unmount());}
});
it('opens complete media on demand, retains inert document URLs and releases them when closed',async()=>{
 open.mockResolvedValue(media);const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only'),release=vi.spyOn(URL,'revokeObjectURL');
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Essay"/>));expect(open).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Original verified');
  await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());expect(host.textContent).toContain('Bound text');expect(host.textContent).toContain('Original verified');
  expect((url.mock.calls[0][0]as Blob).type).toBe('text/plain');expect(host.querySelector('iframe,script')).toBeNull();
 }finally{act(()=>root.unmount());}expect(release).toHaveBeenCalledWith('blob:test-only');
});
it('moves the single reader into its dialog and restores the inline view on close',async()=>{
 open.mockResolvedValue(media);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="Essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);expect(host.querySelector('dialog')?.open).toBe(true);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());expect(host.querySelector('dialog')).toBeNull();expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);
 }finally{act(()=>root.unmount());host.remove();}
});
it('closes only the reader when Escape is pressed inside an asset sheet',async()=>{
 open.mockResolvedValue(media);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const closeSheet=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<Sheet title="Public asset" onClose={closeSheet}><ProofMedia source={source} title="Essay"/></Sheet>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());
  await act(async()=>host.querySelector('.proof-media-dialog')!.dispatchEvent(new Event('cancel',{bubbles:true,cancelable:true})));expect(closeSheet).not.toHaveBeenCalled();expect(host.querySelector('.proof-media-dialog')).toBeNull();expect(host.querySelector<HTMLDialogElement>('.sheet')?.open).toBe(true);
 }finally{act(()=>root.unmount());host.remove();}
});
it('opens complete inert text from a compact preview with the reading control',async()=>{
 const text='First paragraph.\n\n'+('A complete carried paragraph.\n\n'.repeat(80))+'<script>kept as text</script>\n\nThe final paragraph.';
 open.mockResolvedValue({...media,files:[{...media.files[0],filename:'Complete essay.txt',mimeType:'text/plain',text}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="Complete essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());
  const read=host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]');expect(read).not.toBeNull();act(()=>read!.click());
  expect(host.querySelector('dialog')?.open).toBe(true);expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe(text);expect(host.querySelector('dialog script')).toBeNull();
  const paper=host.querySelector<HTMLElement>('dialog .proof-reading-paper')!;expect(paper.style.fontSize).toBe('17px');act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Larger text"]')!.click());expect(paper.style.fontSize).toBe('19px');
 }finally{act(()=>root.unmount());host.remove();}
});
it('reads the separately verified carried essay and restores its small opener on close',async()=>{
 const text='A carried essay.\n\n'+('A full paragraph.\n\n'.repeat(80))+'The end.',reading={title:'A carried essay',text,sha256:'c'.repeat(64),artifactDigest:'d'.repeat(64)};
 open.mockResolvedValue({artifactDigest:source.digest,files:[{...media.files[0],kind:'image',mimeType:'image/png'}],readText:async()=>reading});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),publicSource={kind:'public' as const,url:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest:source.digest,postUrl:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',hasLongForm:true};
 try{await act(async()=>root.render(<ProofMedia source={publicSource} title="Object caption"/>));const read=host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!;expect(read).not.toBeNull();read.focus();await act(async()=>read.click());expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe(text);
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());expect(host.querySelector('dialog')).toBeNull();expect(document.activeElement).toBe(read);expect(host.querySelector('.proof-carried-reading')?.textContent?.length).toBeLessThan(400);
 }finally{act(()=>root.unmount());host.remove();}
});
it('aborts and discards carried text when the selected post changes even with the same image',async()=>{
 let finish!:(value:unknown)=>void,signal:AbortSignal|undefined;
 open.mockResolvedValue({artifactDigest:source.digest,files:[{...media.files[0],kind:'image',mimeType:'image/png'}],readText:(value:AbortSignal)=>{signal=value;return new Promise(resolve=>{finish=resolve;});}});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host),publicSource={kind:'public' as const,url:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest:source.digest,postUrl:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',hasLongForm:true};
 try{await act(async()=>root.render(<ProofMedia source={publicSource} title="First post"/>));await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());
  act(()=>root.render(<ProofMedia source={{...publicSource,postUrl:publicSource.postUrl.replace('cd412215','deadbeef')}} title="Second post"/>));expect(signal?.aborted).toBe(true);
  await act(async()=>finish({title:'Old essay',text:'Stale private-looking text must not appear.',sha256:'c'.repeat(64),artifactDigest:'d'.repeat(64)}));expect(host.querySelector('dialog')).toBeNull();expect(host.textContent).not.toContain('Stale private-looking');
 }finally{act(()=>root.unmount());}
});
