// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../src/receiz/native-identity';
const exported=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/created-asset-file',()=>({createdAssetOriginalFile:(...args:unknown[])=>exported(...args)}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const original={bytes:new Uint8Array([1,2,3]),filename:'original.receizbundle',digest:'a'.repeat(64),title:'An existing Original',kind:'proof',status:'held-proof',pulse:'1',publication:{status:'published'}};
function view(identity:OpenIdentity){const host=document.createElement('div'),root=createRoot(host);return{host,root,render:(active=true)=>act(async()=>root.render(<CreateAsset active={active} identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>))};}
it.each([false,true])('opens a fresh draft after closing a completed Original, signed=%s',async signed=>{
 const read=vi.fn(async()=>({...original,pbiSigned:signed})),publish=vi.fn(),identity={pendingAssetPublication:read,accountUsername:()=> 'artist',publishAssetToMarket:publish}as unknown as OpenIdentity,v=view(identity);
 try{
  await v.render();expect(v.host.querySelector('.creation-complete')).not.toBeNull();
  await v.render(false);await v.render();
  expect(v.host.querySelector('.creation-complete')).toBeNull();expect(v.host.querySelector('.asset-creation--studio')).not.toBeNull();expect(v.host.textContent).not.toContain(original.title);
  expect([...v.host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(false);expect(read).toHaveBeenCalledOnce();expect(publish).not.toHaveBeenCalled();
 }finally{act(()=>v.root.unmount());}
});
it('keeps an unfinished draft when its sheet is temporarily closed',async()=>{
 const identity={pendingAssetPublication:async()=>null}as unknown as OpenIdentity,v=view(identity);
 try{await v.render();await act(()=>v.host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());const title=v.host.querySelector<HTMLInputElement>('[aria-label="Title"]')!;
  await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(title,'Still drafting');title.dispatchEvent(new Event('input',{bubbles:true}));});
  await v.render(false);await v.render();expect(v.host.querySelector<HTMLInputElement>('[aria-label="Title"]')?.value).toBe('Still drafting');
 }finally{act(()=>v.root.unmount());}
});
it('does not restore a dismissed completion when an older signature response arrives',async()=>{
 let finish!:(value:unknown)=>void;const signed=new Promise(resolve=>{finish=resolve;}),publish=vi.fn(()=>signed),identity={pendingAssetPublication:async()=>original,accountUsername:()=> 'artist',publishAssetToMarket:publish}as unknown as OpenIdentity,v=view(identity);
 try{await v.render();await act(()=>[...v.host.querySelectorAll('button')].find(button=>button.textContent==='Sign')!.click());
  await v.render(false);await v.render();expect(v.host.querySelector('.creation-complete')).toBeNull();
  await act(async()=>{finish({...original,pbiSigned:true});await signed;});expect(v.host.querySelector('.creation-complete')).toBeNull();expect(v.host.querySelector('.asset-creation--studio')).not.toBeNull();expect(publish).toHaveBeenCalledOnce();
 }finally{finish({...original,pbiSigned:true});await signed;act(()=>v.root.unmount());}
});
it('finishes the editor visit while its exact saved delivery continues, without starting it twice or blocking the next draft',async()=>{
 let finish!:(value:unknown)=>void;const delivery=new Promise(resolve=>{finish=resolve;}),retry=vi.fn(()=>delivery),dismiss=vi.fn(async()=>{}),identity={pendingAssetPublication:async()=>({...original,publication:{status:'pending'}}),accountUsername:()=> 'artist',retryAssetPublication:retry,dismissAssetCreation:dismiss}as unknown as OpenIdentity,v=view(identity);
 try{await v.render();await v.render(false);await v.render();expect(v.host.querySelector('.creation-complete')).toBeNull();expect(v.host.querySelector('fieldset')?.disabled).toBe(false);expect(retry).toHaveBeenCalledOnce();expect(dismiss).toHaveBeenCalledExactlyOnceWith(original.digest);
  await act(()=>v.host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(v.host.querySelector('.asset-creation')?.getAttribute('data-creation-step')).toBe('review');
  await act(async()=>{finish(original);await delivery;});expect(v.host.querySelector('.creation-complete')).toBeNull();expect(v.host.querySelector('fieldset')?.disabled).toBe(false);
 }finally{await act(async()=>{finish(original);await delivery;});act(()=>v.root.unmount());}
});

it('downloads the SDK-selected sealed file rather than the composer manifest',async()=>{
 const file=new File(['exact SDK-sealed PDF'],'original.receized.pdf',{type:'application/pdf'}),identity={pendingAssetPublication:async()=>original,accountUsername:()=> 'artist'}as unknown as OpenIdentity,v=view(identity),downloads:string[]=[];
 exported.mockResolvedValue(file);const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:sealed-original'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download);});
 try{await v.render();expect(exported).not.toHaveBeenCalled();await act(async()=>[...v.host.querySelectorAll('button')].find(button=>button.textContent==='Save original proof')!.click());
  expect(exported).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledWith(file);expect(downloads).toEqual(['original.receized.pdf']);
 }finally{act(()=>v.root.unmount());create.mockRestore();revoke.mockRestore();click.mockRestore();}
});

// Source recovery, not a public-catalog hiding rule, decides whether an old
// creation belongs in the editor. A completed checkpoint never reopens bytes.
it.each(['signed','dismissed'] as const)('opens an enabled fresh editor from a %s source checkpoint, without retrying delivery',async status=>{
 const {createAssetPublication}=await import('../src/receiz/asset-publication');let state:any={schema:'bank.asset-publication.v1',ownerReceizId:'artist.receiz.id',sourceDigest:original.digest,intentDigest:'b'.repeat(64),filename:original.filename,mimeType:'application/json',status:'pending',...(status==='signed'?{pbiReceiptHash:'c'.repeat(64)}:{creationDismissed:true})};
 const restore=vi.fn(async()=>{throw Error('COMPLETED_SOURCE_MUST_NOT_REOPEN');}),retry=vi.fn(),readSignature=vi.fn(),api=createAssetPublication({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=next;},restore,readSignature,readIntent:async()=>({}),seal:vi.fn(),retain:vi.fn(),publish:vi.fn()});
 const identity={pendingAssetPublication:()=>api.pending(),retryAssetPublication:retry,accountUsername:()=> 'artist'} as unknown as OpenIdentity,v=view(identity);
 try{await v.render();expect(v.host.querySelector('fieldset')?.disabled).toBe(false);await act(()=>v.host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(v.host.querySelector('.asset-creation')?.getAttribute('data-creation-step')).toBe('review');await v.render(false);await v.render();expect(v.host.querySelector('.creation-complete')).toBeNull();expect(retry).not.toHaveBeenCalled();expect(restore).not.toHaveBeenCalled();expect(readSignature).not.toHaveBeenCalled();}finally{act(()=>v.root.unmount());}
});
it('keeps Next immediately usable while read-only legacy signature recovery is unresolved',async()=>{
 let finish!:(value:null)=>void;const pending=new Promise<null>(resolve=>{finish=resolve;}),retry=vi.fn(),identity={accountUsername:()=> 'artist',pendingAssetPublication:()=>pending,retryAssetPublication:retry} as unknown as OpenIdentity,v=view(identity);
 try{await v.render();expect(v.host.querySelector('fieldset')?.disabled).toBe(false);await act(()=>v.host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(v.host.querySelector('.asset-creation')?.getAttribute('data-creation-step')).toBe('review');await act(async()=>{finish(null);await pending;});expect(v.host.querySelector('fieldset')?.disabled).toBe(false);expect(retry).not.toHaveBeenCalled();}finally{finish(null);act(()=>v.root.unmount());}
});
it('records a finished creation visit at its exact source when Done or X closes it',async()=>{
 const dismiss=vi.fn(async()=>{}),identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>original,dismissAssetCreation:dismiss}as unknown as OpenIdentity,v=view(identity);
 try{await v.render();expect(dismiss).not.toHaveBeenCalled();await v.render(false);expect(dismiss).toHaveBeenCalledExactlyOnceWith(original.digest);await v.render();expect(v.host.querySelector('.creation-complete')).toBeNull();expect(v.host.querySelector('fieldset')?.disabled).toBe(false);}finally{act(()=>v.root.unmount());}
});
