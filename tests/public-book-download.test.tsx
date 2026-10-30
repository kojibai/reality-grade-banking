// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
const held=vi.hoisted(()=>({artifactDigest:'a'.repeat(64),files:[{kind:'book',filename:'Book.epub',mimeType:'application/epub+zip',bytes:new Uint8Array([1]),payloadDigest:'b'.repeat(64),book:{title:'Public book',author:null,images:[]},chapters:[{title:'Chapter one',text:'Already carried and readable.'}]}]}));
vi.mock('../src/receiz/proof-media',()=>({retainedPublicMedia:()=>held,openProofMedia:vi.fn()}));
import {ProofMedia} from '../src/features/media/ProofMedia';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps material-carried public books readable while leaving file downloads to the configured Original controls',async()=>{
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:public-book');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<ProofMedia title="Public book" source={{kind:'public',url:'https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact',digest:held.artifactDigest}} allowMediaDownload={false}/>));
  await vi.waitFor(()=>expect(host.querySelector('[aria-label="EPUB reader"]')?.textContent).toContain('Already carried and readable.'));
  expect(host.querySelector('a[download]')).toBeNull();
  await act(async()=>host.querySelector<HTMLButtonElement>('.proof-media-controls button')!.click());
  expect(host.querySelector('dialog [aria-label="EPUB reader"]')).not.toBeNull();expect(host.querySelector('dialog a[download]')).toBeNull();
 }finally{act(()=>root.unmount());host.remove();vi.restoreAllMocks();}
});
