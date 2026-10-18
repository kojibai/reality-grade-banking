// @vitest-environment happy-dom
// Presentation fixtures only; canonical proof verification is tested separately.
import{act}from'react';import{createRoot}from'react-dom/client';import{afterEach,expect,it,vi}from'vitest';
const open=vi.hoisted(()=>vi.fn());vi.mock('../src/receiz/proof-media',()=>({openProofMedia:open}));
import{ProofMedia}from'../src/features/media/ProofMedia';
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
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full media view"]')!.click());expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);expect(host.querySelector('dialog')?.open).toBe(true);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());expect(host.querySelector('dialog')).toBeNull();expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);
 }finally{act(()=>root.unmount());host.remove();}
});
