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
it('keeps genuinely unfinished delivery recoverable without starting it twice',async()=>{
 let finish!:(value:unknown)=>void;const delivery=new Promise(resolve=>{finish=resolve;}),retry=vi.fn(()=>delivery),identity={pendingAssetPublication:async()=>({...original,publication:{status:'pending'}}),accountUsername:()=> 'artist',retryAssetPublication:retry}as unknown as OpenIdentity,v=view(identity);
 try{await v.render();await v.render(false);await v.render();expect(v.host.querySelector('.creation-complete')).not.toBeNull();expect(retry).toHaveBeenCalledOnce();
 }finally{await act(async()=>{finish(original);await delivery;});act(()=>v.root.unmount());}
});

it('downloads the SDK-selected sealed file rather than the composer manifest',async()=>{
 const file=new File(['exact SDK-sealed PDF'],'original.receized.pdf',{type:'application/pdf'}),identity={pendingAssetPublication:async()=>original,accountUsername:()=> 'artist'}as unknown as OpenIdentity,v=view(identity),downloads:string[]=[];
 exported.mockResolvedValue(file);const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:sealed-original'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download);});
 try{await v.render();expect(exported).not.toHaveBeenCalled();await act(async()=>[...v.host.querySelectorAll('button')].find(button=>button.textContent==='Save original proof')!.click());
  expect(exported).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledWith(file);expect(downloads).toEqual(['original.receized.pdf']);
 }finally{act(()=>v.root.unmount());create.mockRestore();revoke.mockRestore();click.mockRestore();}
});

it.each([false,true])('does not restore an old completed Showcase result in a later creation visit, signed=%s',async signed=>{
 const uid='owner-account',item={originalDigest:original.digest,ownerUsername:'artist',ownerIdentity:{userId:uid,username:'artist',createdAt:'2026-01-01T00:00:00Z'},hasPbiSignature:signed,pbiReceiptHash:signed?'b'.repeat(64):undefined} as import('../src/receiz/public-market').PublicMarketItem;
 let finish!:(value:unknown)=>void;const pending=new Promise(resolve=>{finish=resolve;}),retry=vi.fn(()=>pending),identity={walletReceivingAddress:()=>uid,accountUsername:()=> 'artist',pendingAssetPublication:async()=>({...original,publication:{status:'pending'}}),retryAssetPublication:retry}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} marketItems={[item]} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.querySelector('.creation-complete')).toBeNull();expect(host.querySelector('.asset-creation--studio')).not.toBeNull();
  await act(async()=>{finish(original);await pending;});expect(host.querySelector('.creation-complete')).toBeNull();expect(retry).toHaveBeenCalledOnce();
  act(()=>root.unmount());const next=createRoot(host);try{await act(async()=>next.render(<CreateAsset identity={identity} marketItems={[item]} onRefresh={()=>{}} onClose={()=>{}}/>));expect(host.querySelector('.creation-complete')).toBeNull();}finally{act(()=>next.unmount());}
 }finally{finish(original);await pending;}
});
it('keeps an interrupted result when the held membership belongs to another owner',async()=>{
 const item={originalDigest:original.digest,ownerUsername:'artist',ownerIdentity:{userId:'different-owner'}} as import('../src/receiz/public-market').PublicMarketItem,identity={walletReceivingAddress:()=> 'owner',accountUsername:()=> 'artist',pendingAssetPublication:async()=>original}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} marketItems={[item]} onRefresh={()=>{}} onClose={()=>{}}/>));expect(host.querySelector('.creation-complete')).not.toBeNull();}finally{act(()=>root.unmount());}
});

it('retires a restored PWA completion when held membership finishes decoding, without waiting for a pending response',async()=>{
 const uid='owner-account',item={originalDigest:original.digest,ownerUsername:'artist',ownerIdentity:{userId:uid}} as import('../src/receiz/public-market').PublicMarketItem;
 let finish!:(value:unknown)=>void;const pending=new Promise(resolve=>{finish=resolve;}),identity={walletReceivingAddress:()=>uid,accountUsername:()=> 'artist',pendingAssetPublication:async()=>({...original,publication:{status:'pending'}}),retryAssetPublication:()=>pending}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 const render=(items:import('../src/receiz/public-market').PublicMarketItem[])=>root.render(<CreateAsset identity={identity} marketItems={items} onRefresh={()=>{}} onClose={()=>{}}/>);
 try{await act(async()=>render([]));expect(host.querySelector('.creation-complete')).not.toBeNull();await act(async()=>render([item]));expect(host.querySelector('.creation-complete')).toBeNull();expect(host.querySelector('.asset-creation--studio')).not.toBeNull();await act(async()=>{finish(original);await pending;});expect(host.querySelector('.creation-complete')).toBeNull();}finally{finish(original);await pending;act(()=>root.unmount());}
});
