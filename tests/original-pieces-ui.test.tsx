// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {SendOriginal} from '../src/features/assets/SendOriginal';
import {ReceivedOriginal} from '../src/features/deposit/ReceivedOriginal';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {PublicMarketItem} from '../src/receiz/public-market';

const {readHeld}=vi.hoisted(()=>({readHeld:vi.fn()}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>({
  readHeldImportedProfileOriginalMaterial:readHeld,
})}));

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const address = 'receiz_abcdefghijklmnopqr.receiz.id#'+'a'.repeat(64);

function enter(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

it('keeps exact bytes under Advanced and uses one confirmed transfer', async () => {
  const host=document.createElement('div'), root=createRoot(host), refreshed=vi.fn();
  const button=(label:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent===label)!;
  const source={title:'Fixture Original',filename:'fixture.receiz',bytes:new Uint8Array(256)} as HeldDeposit;
  const ranges=[{offset:0,byteLength:4},{offset:99,byteLength:2}];
  const review={recipient:address,confirmationDigest:'b'.repeat(64),command:{ranges}};
  const packet=new File(['accepted exact Original transfer'],'fixture.receizpieces');
  const prepare=vi.fn(async()=>review),send=vi.fn(async()=>({file:packet}));
  const identity={originalPieces:async()=>({pending:async()=>null,prepare,send})} as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<SendOriginal identity={identity} source={source} onRefresh={refreshed}/>));
    const advanced=host.querySelector('details')!;
    expect(advanced.open).toBe(false);
    await act(async()=>{
      enter(host.querySelector<HTMLInputElement>('input[placeholder="Original receiving address"]')!,address);
      advanced.open=true;
      enter(advanced.querySelector('input')!,'1–4, 100–101');
    });
    await act(async()=>button('Review send').click());
    expect(prepare).toHaveBeenCalledWith({original:expect.any(File),recipient:address,ranges});
    expect(host.textContent).toContain('1–4, 100–101');
    expect(send).not.toHaveBeenCalled();
    await act(async()=>button('Send Original').click());
    expect(send).toHaveBeenCalledExactlyOnceWith(review,review.confirmationDigest);
    expect(host.textContent).toContain('Original transfer recorded.');
    expect(button('Save transfer file')).toBeDefined();
    expect(refreshed).toHaveBeenCalledOnce();
  } finally {act(()=>root.unmount());}
});

it('uses the existing asset picker to review and keep the original piece package', async () => {
  const host=document.createElement('div'), root=createRoot(host), refreshed=vi.fn();
  const file=new File(['selected bytes'],'fixture.receizpieces');
  const delivery={head:{filename:'A held Original',layout:{byteLength:40}},pieces:[{byteLength:6}]};
  const inspect=vi.fn(async()=>delivery),receive=vi.fn(async()=>({file,delivery}));
  const inspectWhole=vi.fn();
  const identity={originalPieces:async()=>({inspect,receive}),receivedProof:async()=>({status:async()=>null,inspect:inspectWhole})} as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<ReceivedOriginal identity={identity} onRefresh={refreshed} onClose={()=>{}}/>));
    const picker=host.querySelector<HTMLInputElement>('[aria-label="Choose original proof object"]')!;
    Object.defineProperty(picker,'files',{value:[file]});
    await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));
    expect(inspect).toHaveBeenCalledExactlyOnceWith(file);
    expect(inspectWhole).not.toHaveBeenCalled();
    expect(host.textContent).toContain('A held Original');
    const confirm=[...host.querySelectorAll('button')].find(button=>button.textContent==='Receive Original bytes')!;
    expect(confirm.disabled).toBe(true);
    await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async()=>confirm.click());
    expect(receive).toHaveBeenCalledExactlyOnceWith(file);
    expect(host.textContent).toContain('Your Original bytes are held.');
    expect(refreshed).toHaveBeenCalledOnce();
  } finally {act(()=>root.unmount());}
});

it('selects a percentage of the Original from disjoint held ranges by exact byte offsets', async () => {
  const host=document.createElement('div'),root=createRoot(host);
  const ranges=[{offset:4,byteLength:7},{offset:63,byteLength:13}];
  const prepare=vi.fn(async()=>({recipient:address,command:{ranges:[{offset:4,byteLength:7},{offset:63,byteLength:5}]}}));
  const identity={originalPieces:async()=>({pending:async()=>null,prepare})} as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<SendOriginal identity={identity} held={{proofDigest:'a'.repeat(64),
      originalSha256:'b'.repeat(64),headDigest:'c'.repeat(64),filename:'Pieces',totalBytes:200,ownedBytes:20,percentage:'10%',ranges}} onRefresh={()=>{}}/>));
    await act(async()=>{
      enter(host.querySelector('[placeholder="Original receiving address"]')!,address);
      enter(host.querySelector('[aria-label="Percentage of Original"]')!,'6');
      [...host.querySelectorAll('button')].find(button=>button.textContent==='Review send')!.click();
    });
    expect(prepare).toHaveBeenCalledExactlyOnceWith({original:{heldProofDigest:'a'.repeat(64)},recipient:address,
      ranges:[{offset:4,byteLength:7},{offset:63,byteLength:5}]});
  } finally {await act(async()=>root.unmount());}
});


it('opens the exact locally held Showcase source while all external reads are unavailable', async () => {
  const host=document.createElement('div'),root=createRoot(host);
  const digest='a'.repeat(64),original=new File(['exact fixture bytes'],'showcase.receizbundle');
  const coordinate=new URL('https://receiz.com/api/profile/showcase/imported-source');
  coordinate.searchParams.set('reference',JSON.stringify({schema:'receiz.imported-proof-source.v1',
    artifactSha256:digest,byteLength:original.size,filename:original.name,mimeType:'application/octet-stream',
    bytes:{kind:'bytes',sha256:digest,byteLength:original.size,contentByteLength:original.size,height:0}}));
  const showcase={title:'Showcase-only Original',originalDigest:digest,originalUrl:coordinate.href} as PublicMarketItem;
  readHeld.mockResolvedValueOnce({source:{exactArtifact:original,descriptor:{filename:original.name}}});
  const prepare=vi.fn(async(_input:{original:File})=>({recipient:address,command:{ranges:[{offset:0,byteLength:original.size}]}}));
  const holdProof=vi.fn(async()=>({digest}));
  const identity={holdProof,originalPieces:async()=>({pending:async()=>null,prepare})} as unknown as OpenIdentity;
  vi.stubGlobal('indexedDB',{});
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('external reads unavailable'));
  try {
    await act(async()=>{root.render(<SendOriginal identity={identity} showcase={showcase} onRefresh={()=>{}}/>);});
    await act(async()=>{await vi.dynamicImportSettled();});
    expect(host.textContent).toContain('Showcase-only Original');
    expect(readHeld).not.toHaveBeenCalled();
    await act(async()=>enter(host.querySelector('[placeholder="Original receiving address"]')!,address));
    await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Review send')!.click());
    expect(readHeld).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    const file=prepare.mock.calls[0]?.[0]?.original as File;
    expect(file.size).toBe(original.size);
    expect(await file.text()).toBe('exact fixture bytes');
    expect(holdProof).toHaveBeenCalledExactlyOnceWith(file);
  } finally {fetch.mockRestore();vi.unstubAllGlobals();await act(async()=>root.unmount());}
});
