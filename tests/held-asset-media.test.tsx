// @vitest-environment happy-dom
// The offline verifier supplies successful inspection fixtures at its existing
// boundary. The held sheet, media reader, payload parsing and viewer are real.
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {PublicMarketItem} from '../src/receiz/public-market';

const {readArtifact}=vi.hoisted(()=>({readArtifact:vi.fn()}));
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>({readArtifact})}));
vi.mock('../src/features/assets/LiveOwnership',()=>({LiveOwnership:()=>null}));
import {LiveAssetDetail} from '../src/features/assets/LiveAssets';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const digest='a'.repeat(64),sealedBytes=new Uint8Array([1,2,3]);
const imageBytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XkAAAAASUVORK5CYII='),character=>character.charCodeAt(0));

async function mount(kind:'image'|'audio'|'video'|'text',pbiSigned=false,options:{marketItems?:PublicMarketItem[];onTrade?:(side:'buy'|'sell',id:string)=>void;native?:boolean}={}){
 const payload={bytes:kind==='image'?imageBytes:new TextEncoder().encode(kind==='text'?'Exact carried document.':kind==='audio'?'ID3audio-fixture':'0000ftypvideo-fixture'),filename:{image:'Original.png',audio:'Song.mp3',video:'Movie.mp4',text:'Essay.txt'}[kind],mimeType:{image:'image/png',audio:'audio/mpeg',video:'video/mp4',text:'text/plain'}[kind],sha256:'b'.repeat(64)};
 readArtifact.mockResolvedValue({report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:digest,payloadSha256:payload.sha256},payload});
 const source:HeldDeposit={digest,bytes:sealedBytes,filename:'original.receiz',title:'A held Original',kind:'proof',status:'held-proof',pulse:'14955302',pbiSigned};
 if(options.native)source.nativeAsset={status:'active',assetId:'native-original',quantityMicro:'1000000',lockedQuantityMicro:'0',supplyMicro:'1000000',symbol:'ART',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'0'} as NonNullable<HeldDeposit['nativeAsset']>;
 const listDeposits=vi.fn().mockResolvedValue([source]);
 const identity={knownDeposits:()=>[source],listDeposits,binding:{artifactOwnerReceizId:'owner.receiz.id'}} as unknown as OpenIdentity;
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Held media must remain local'));
 const createUrl=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:held-original');
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 await act(async()=>root.render(<LiveAssetDetail identity={identity} digest={digest} {...options}/>));
 return {host,root,payload,source,identity,listDeposits,fetcher,createUrl,play,unmount:()=>{act(()=>root.unmount());host.remove();}};
}

afterEach(()=>{readArtifact.mockReset();vi.restoreAllMocks();});

it.each([false,true])('shows the exact held image when its sheet opens, without a second click (signed: %s)',async signed=>{
 const view=await mount('image',signed);
 try{
  const image=view.host.querySelector<HTMLImageElement>('.proof-image-open img');
  expect(image?.getAttribute('src')).toBe('blob:held-original');
  expect(image?.alt).toBe('Original.png');
  expect(view.host.querySelector('.proof-object-cover')).toBeNull();
  expect(view.host.textContent).toContain('Original verified');
  expect(readArtifact).toHaveBeenCalledExactlyOnceWith(sealedBytes,'original.receiz');
  const blob=view.createUrl.mock.calls[0][0] as Blob;
  expect(blob.type).toBe('image/png');expect(new Uint8Array(await blob.arrayBuffer())).toEqual(imageBytes);
  await act(async()=>view.root.render(<LiveAssetDetail identity={view.identity} digest={digest}/>));
  expect(view.host.querySelector('.proof-image-open img')).toBe(image);
  expect(readArtifact).toHaveBeenCalledOnce();expect(view.listDeposits).toHaveBeenCalledOnce();
  expect(view.fetcher).not.toHaveBeenCalled();expect(view.play).not.toHaveBeenCalled();
 }finally{view.unmount();}
});

it.each(['audio','video'] as const)('prepares held %s on sheet open while leaving playback to the user',async kind=>{
 const view=await mount(kind);
 try{
  const media=view.host.querySelector<HTMLMediaElement>(kind);
  expect(media?.getAttribute('src')).toBe('blob:held-original');
  expect(media?.autoplay).toBe(false);expect(view.play).not.toHaveBeenCalled();
  if(kind==='audio')expect(view.host.querySelector('[aria-label="Play audio"]')).not.toBeNull();
  else{expect(media?.controls).toBe(true);expect(media?.hasAttribute('playsinline')).toBe(true);}
  expect(view.host.querySelector('.proof-object-cover')).toBeNull();
  expect(readArtifact).toHaveBeenCalledExactlyOnceWith(sealedBytes,'original.receiz');expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});

it('opens a held document in the existing reader with no separate download',async()=>{
 const view=await mount('text');
 try{
  expect(view.host.querySelector('.proof-reading-text')?.textContent).toBe('Exact carried document.');
  expect(view.host.querySelector('.proof-object-cover')).toBeNull();
  expect(readArtifact).toHaveBeenCalledExactlyOnceWith(sealedBytes,'original.receiz');expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});
it('keeps one media open when known and listed deposits wrap the same exact source in different arrays',async()=>{
 const view=await mount('text');try{
  const media=view.host.querySelector('.proof-media');expect(readArtifact).toHaveBeenCalledOnce();
  view.listDeposits.mockResolvedValue([view.source]);await act(async()=>dispatchEvent(new Event('bankeiz:asset-sources')));
  expect(view.host.querySelector('.proof-media')).toBe(media);expect(readArtifact).toHaveBeenCalledOnce();
  view.listDeposits.mockResolvedValue([view.source,{...view.source,digest:'c'.repeat(64),bytes:new Uint8Array([7])}]);await act(async()=>dispatchEvent(new Event('bankeiz:asset-sources')));
  expect(view.host.querySelector('.proof-media')).toBe(media);expect(readArtifact).toHaveBeenCalledOnce();expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});
it('reopens the exact selected and linked sources when the bound linked bytes change',async()=>{
 const linkedDigest='d'.repeat(64),definition={name:'Linked asset',symbol:'ART',units:'1',description:'',linkedProofDigest:linkedDigest};
 const source:HeldDeposit={digest,bytes:sealedBytes,filename:'linked-asset.receiz',title:'Linked asset',kind:'proof',status:'held-proof',pulse:null,assetDefinition:definition};
 let linked:HeldDeposit={...source,digest:linkedDigest,bytes:new Uint8Array([4]),filename:'linked-original.receiz',assetDefinition:undefined};
 const listDeposits=vi.fn(async()=>[source,linked]),identity={knownDeposits:()=>[source,linked],listDeposits,binding:{artifactOwnerReceizId:'owner.receiz.id'}} as unknown as OpenIdentity;
 const outer={bytes:new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.asset-definition.v1',definition})),filename:'asset.json',mimeType:'application/json',sha256:'b'.repeat(64)};
 readArtifact.mockImplementation(async(bytes:Uint8Array)=>{const isOuter=bytes[0]===1,payload=isOuter?outer:{bytes:new TextEncoder().encode(bytes[0]===4?'First linked revision.':'Next linked revision.'),filename:'linked.txt',mimeType:'text/plain',sha256:'e'.repeat(64)};return {report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:isOuter?digest:linkedDigest,payloadSha256:payload.sha256,verification:{}},payload};});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:linked-source');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Linked bytes are already held'));
 const host=document.createElement('div'),root=createRoot(host);try{
  await act(async()=>root.render(<LiveAssetDetail identity={identity} digest={digest}/>));expect(host.querySelector('.proof-media-error')?.textContent).toBeUndefined();await vi.waitFor(()=>expect(host.querySelector('.proof-reading-text')?.textContent).toBe('First linked revision.'));expect(readArtifact).toHaveBeenCalledTimes(2);const media=host.querySelector('.proof-media');
  linked={...linked,bytes:new Uint8Array([5])};await act(async()=>dispatchEvent(new Event('bankeiz:asset-sources')));
  expect(host.querySelector('.proof-media')).not.toBe(media);expect(host.querySelector('.proof-reading-text')?.textContent).toBe('Next linked revision.');expect(readArtifact).toHaveBeenCalledTimes(4);expect(readArtifact).toHaveBeenLastCalledWith(linked.bytes,linked.filename);expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('keeps the same prepared private media through ownership review and return',async()=>{
 const view=await mount('text',false,{native:true});try{
  const media=view.host.querySelector('.proof-media'),text=view.host.querySelector('.proof-reading-text');
  await act(async()=>[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Send ownership')!.click());
  expect(view.host.querySelector('.proof-media')).toBe(media);expect(media?.closest('[hidden]')).not.toBeNull();expect(media?.closest('[inert]')).not.toBeNull();
  await act(async()=>[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Back to asset')!.click());
  expect(view.host.querySelector('.proof-media')).toBe(media);expect(view.host.querySelector('.proof-reading-text')).toBe(text);expect(media?.closest('[hidden]')).toBeNull();expect(readArtifact).toHaveBeenCalledOnce();expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});
it('pauses retained private audio during ownership review without losing its position',async()=>{
 const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{}),view=await mount('audio',false,{native:true});try{
  const audio=view.host.querySelector('audio')!;audio.currentTime=17;act(()=>audio.dispatchEvent(new Event('timeupdate')));
  await act(async()=>[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Send ownership')!.click());expect(pause.mock.instances).toContain(audio);
  await act(async()=>[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Back to asset')!.click());expect(view.host.querySelector('audio')).toBe(audio);expect(audio.currentTime).toBe(17);expect(readArtifact).toHaveBeenCalledOnce();
 }finally{view.unmount();}
});
it('requires another canonical open for a changed held source revision and drops the previous media on refusal',async()=>{
 const view=await mount('text');try{
  const previous=view.host.querySelector('.proof-media');readArtifact.mockRejectedValueOnce(Error('Changed artifact did not pass canonical inspection'));
  view.listDeposits.mockResolvedValue([{...view.source,bytes:new Uint8Array([9,9,9])}]);await act(async()=>dispatchEvent(new Event('bankeiz:asset-sources')));
  expect(readArtifact).toHaveBeenCalledTimes(2);expect(view.host.querySelector('.proof-media')).not.toBe(previous);expect(view.host.querySelector('.proof-reading-text')).toBeNull();expect(view.host.querySelector('.proof-media-error')?.textContent).toContain('could not be opened as verified media');expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});

it('does not offer backed-asset controls for an ordinary held Original',async()=>{
 const view=await mount('image');try{
  const labels=[...view.host.querySelectorAll('button')].map(button=>button.textContent);
  expect(labels).toContain('Save original proof');
  expect(labels).not.toContain('Send ownership');expect(labels).not.toContain('Sell a share');
  expect(labels).not.toContain('Buy back ownership');expect(labels).not.toContain('Redeem');
  expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});

it('routes a plain Original’s shares through its exact existing Market entry with no rail selector',async()=>{
 const onTrade=vi.fn(),marketItems=[{id:'profile:owner:exact-original',originalDigest:digest},{id:'profile:owner:other-original',originalDigest:'f'.repeat(64)}] as PublicMarketItem[];
 const view=await mount('image',false,{marketItems,onTrade});try{
  await act(async()=>{[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Buy ownership')!.click();});
  expect(onTrade).toHaveBeenLastCalledWith('buy','profile:owner:exact-original');
  await act(async()=>{[...view.host.querySelectorAll('button')].find(button=>button.textContent==='Take cash')!.click();});
  expect(onTrade).toHaveBeenLastCalledWith('sell','profile:owner:exact-original');
  expect(view.host.querySelector('select')).toBeNull();expect(view.fetcher).not.toHaveBeenCalled();
 }finally{view.unmount();}
});
