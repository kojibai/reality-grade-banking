// @vitest-environment happy-dom
// The offline verifier supplies successful inspection fixtures at its existing
// boundary. The held sheet, media reader, payload parsing and viewer are real.
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {OpenIdentity} from '../src/receiz/native-identity';

const {readArtifact}=vi.hoisted(()=>({readArtifact:vi.fn()}));
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>({readArtifact})}));
import {LiveAssetDetail} from '../src/features/assets/LiveAssets';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const digest='a'.repeat(64),sealedBytes=new Uint8Array([1,2,3]);
const imageBytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XkAAAAASUVORK5CYII='),character=>character.charCodeAt(0));

async function mount(kind:'image'|'audio'|'video'|'text',pbiSigned=false){
 const payload={bytes:kind==='image'?imageBytes:new TextEncoder().encode(kind==='text'?'Exact carried document.':kind==='audio'?'ID3audio-fixture':'0000ftypvideo-fixture'),filename:{image:'Original.png',audio:'Song.mp3',video:'Movie.mp4',text:'Essay.txt'}[kind],mimeType:{image:'image/png',audio:'audio/mpeg',video:'video/mp4',text:'text/plain'}[kind],sha256:'b'.repeat(64)};
 readArtifact.mockResolvedValue({report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:digest,payloadSha256:payload.sha256},payload});
 const source:HeldDeposit={digest,bytes:sealedBytes,filename:'original.receiz',title:'A held Original',kind:'proof',status:'held-proof',pulse:'14955302',pbiSigned};
 const listDeposits=vi.fn().mockResolvedValue([source]);
 const identity={knownDeposits:()=>[source],listDeposits,binding:{artifactOwnerReceizId:'owner.receiz.id'}} as unknown as OpenIdentity;
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Held media must remain local'));
 const createUrl=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:held-original');
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 await act(async()=>root.render(<LiveAssetDetail identity={identity} digest={digest}/>));
 return {host,root,payload,identity,listDeposits,fetcher,createUrl,play,unmount:()=>{act(()=>root.unmount());host.remove();}};
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
