// @vitest-environment happy-dom
import {act,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import captured from './fixtures/created-original-public.json';
import {publicAssetImagePreviewUrl} from '../src/receiz/public-market';
import {forgetPublicProfile,parsePublicProfile,retainPublicProfile} from '../src/receiz/public-profile';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {publicMarketRecord} from '../src/receiz/public-network';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';

// Hold the slow canonical read at its existing boundary. Public image
// presentation must remain usable while artifact verification is pending.
const {open}=vi.hoisted(()=>({open:vi.fn()}));
vi.mock('../src/receiz/proof-media',async importOriginal=>({...await importOriginal<typeof import('../src/receiz/proof-media')>(),openProofMedia:open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function profile(){return parsePublicProfile({ok:true,representation:'collection-v2',profile:{profile:captured.profile,viewer:{canView:true},originals:[captured.original],originalsPage:{hasMore:false}}},'bjklock');}
afterEach(()=>{forgetPublicProfile('bjklock');open.mockReset();vi.restoreAllMocks();});

it('permits the captured primary public image only for its exact imported artifact reference and digest',()=>{
 const item=profile().items[0],expected='https://receiz.com'+captured.original.media.src;
 expect(item.originalDigest).toBe('ea1ac75145e828fdf2873ce40790d566579b32a967093ff457c6aa4c21a8621f');
 expect(publicAssetImagePreviewUrl(item)).toBe(expected);
 const reordered=new URL(expected),same=JSON.parse(reordered.searchParams.get('reference')!);
 reordered.searchParams.set('reference',JSON.stringify({schema:same.schema,mimeType:same.mimeType,filename:same.filename,bytes:{kind:same.bytes.kind,sha256:same.bytes.sha256,height:same.bytes.height,byteLength:same.bytes.byteLength,contentByteLength:same.bytes.contentByteLength},byteLength:same.byteLength,artifactSha256:same.artifactSha256}));
 expect(publicAssetImagePreviewUrl({...item,artworkUrl:reordered.href})).toBe(reordered.href);
 expect(publicAssetImagePreviewUrl({...item,originalDigest:'b'.repeat(64)})).toBeNull();
 expect(publicAssetImagePreviewUrl({...item,artworkUrl:'https://receiz.com/other.png'})).toBeNull();
 const changed=new URL(expected),reference=JSON.parse(changed.searchParams.get('reference')!);
 reference.bytes.sha256='b'.repeat(64);changed.searchParams.set('reference',JSON.stringify(reference));
 expect(publicAssetImagePreviewUrl({...item,artworkUrl:changed.href})).toBeNull();
 for(const selector of ['file','assetFile']){
  const attachment=new URL(expected);attachment.searchParams.delete('payload');attachment.searchParams.set(selector,'0');
  expect(publicAssetImagePreviewUrl({...item,artworkUrl:attachment.href})).toBeNull();
 }
 expect(publicAssetImagePreviewUrl({...item,originalUrl:expected})).toBeNull();
 expect(publicAssetImagePreviewUrl({...item,originalUrl:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact'})).toBeNull();
});

it('paints and zooms the exact carried image while canonical Original reading remains pending',async()=>{
 const carried=retainPublicProfile(profile()),item=carried.items[0],expected='https://receiz.com'+captured.original.media.src;
 open.mockImplementation(()=>new Promise(()=>{}));
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('The selected image already carries its public source.'));
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});
 vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),firstFrame:string[]=[];
 function Probe(){useLayoutEffect(()=>{firstFrame.push(host.querySelector<HTMLImageElement>('.proof-image-open img')?.src??'');},[]);return <PublicAssetDetail item={item} readOnly standalone/>;}
 try{
  await act(async()=>root.render(<Probe/>));
  expect(firstFrame).toEqual([expected]);expect(host.textContent).toContain('Public image');expect(host.textContent).not.toContain('Original verified');
  expect(host.querySelector('.proof-object-cover')).toBeNull();
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full image"]')!.click());
  const dialog=document.querySelector('dialog[open]')!;
  const image=dialog.querySelector<HTMLImageElement>('img')!;
  const stage=dialog.querySelector<HTMLElement>('.proof-image-object-body')!;
  expect(image.getAttribute('src')).toBe(expected);
  expect(stage.style.getPropertyValue('--image-object-zoom')).toBe('1');
  act(()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click());
  expect(stage.style.getPropertyValue('--image-object-zoom')).toBe('1.5');
  expect(stage.querySelector('.proof-image-zoom')?.textContent).toBe('150%');
  expect(dialog.querySelector('img')).toBe(image);
  expect(image.style.width).toBe('');
  expect(stage.querySelector('.asset-object-metal-edge')).not.toBeNull();
  expect(document.querySelector('dialog a[download]')).toBeNull();
  expect(open).toHaveBeenCalledOnce();expect(open).toHaveBeenCalledWith({kind:'public',url:item.originalUrl,digest:item.originalDigest,postUrl:item.readingUrl??item.verifyUrl,hasLongForm:true},expect.any(AbortSignal));
  expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});

it('keeps a standalone image visible and expands it without opening its artifact',async()=>{
 const selected=profile().items[0],cover='https://receiz.com/api/proof-material/packages/'+selected.originalDigest+'/artifact';
 const item={...selected,originalUrl:cover,artworkUrl:cover};
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(640);
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});
 vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 try{
  await act(async()=>root.render(<PublicAssetDetail item={item} readOnly standalone/>));
  const image=host.querySelector('.proof-object-artwork img');
  expect(image?.getAttribute('src')).toBe(cover);
  expect(open).not.toHaveBeenCalled();
  expect(host.querySelector('[aria-label="Preparing original"]')).toBeNull();
  expect(document.querySelector('dialog[open]')).toBeNull();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full image"]')!.click());
  expect(host.querySelector('.proof-object-artwork img')).toBe(image);
  expect(document.querySelector('dialog[open] img')?.getAttribute('src')).toBe(cover);
  expect(open).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});


it('flips and zooms the same carried Original from the Ledger Proof row without reopening its source',async()=>{
 const item=profile().items[0],record=publicMarketRecord(item),expected='https://receiz.com'+captured.original.media.src;
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Source unavailable'));
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});
 vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
  const opener=host.querySelector<HTMLButtonElement>('[aria-label="Open full image"]')!;
  expect(opener.querySelector('img')?.getAttribute('src')).toBe(expected);
  act(()=>opener.click());
  const dialog=host.querySelector('dialog[open]')!;
  expect(dialog.classList.contains('proof-media-dialog--image-object')).toBe(true);
  act(()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click());
  expect(dialog.querySelector('.proof-image-zoom')?.textContent).toBe('150%');
  await act(async()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());
  await vi.waitFor(()=>expect(dialog.querySelector('.asset-proof-back-body')?.textContent).toContain(item.title));
  act(()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Show front"]')!.click());
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe(expected);
  expect(open).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
