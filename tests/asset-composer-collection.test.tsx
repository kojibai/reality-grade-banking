// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {AssetComposer} from '../src/features/assets/AssetComposer';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {AssetComposerDraft} from '../src/receiz/asset-composer';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function edit(host:HTMLElement,label:string,value:string){const node=host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;expect(node,label).not.toBeNull();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}
function check(host:HTMLElement,label:string){const node=host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;expect(node,label).not.toBeNull();node.click();}
function chooseOriginal(host:HTMLElement,file:File){const node=host.querySelector<HTMLInputElement>('[aria-label="Choose original"]')!;Object.defineProperty(node,'files',{value:[file],configurable:true});node.dispatchEvent(new Event('change',{bubbles:true}));}
const base:AssetComposerDraft={title:'A complete original',description:'',kind:'moment',longForm:'The original text',files:[]};
const fileBase:AssetComposerDraft={...base,kind:'file',files:[{id:'primary',role:'primary',file:new File(['exact file'],'work.bin',{type:'application/octet-stream'})}]};
it('keeps Collection collapsed with historical defaults and writes the selected per-post policy without changing files',async()=>{
 let draft=fileBase;const host=document.createElement('div'),root=createRoot(host),changed=vi.fn();
 const render=()=>root.render(<AssetComposer value={draft} onChange={next=>{changed(next);draft=next;render();}}/>);
 try{await act(render);const section=host.querySelector<HTMLDetailsElement>('[data-composer-section="collection"]')!;
  expect(section).not.toBeNull();expect(section.open).toBe(false);expect(changed).not.toHaveBeenCalled();
  expect(host.querySelector<HTMLInputElement>('[aria-label="Allow original download"]')!.checked).toBe(true);
  expect(host.querySelector<HTMLInputElement>('[aria-label="Allow derivative download"]')!.checked).toBe(false);
  expect(host.querySelector<HTMLInputElement>('[aria-label="Allow moment record download"]')!.checked).toBe(false);
  expect(host.querySelector('[aria-label="Gate audio playback"]')).toBeNull();
  await act(()=>{edit(host,'Original download quantity','100');});await act(()=>edit(host,'Original download price (USD)','12.34'));
  await act(()=>check(host,'Allow derivative download'));await act(()=>edit(host,'Derivative download quantity','2'));await act(()=>edit(host,'Derivative download price (USD)','0.01'));await act(()=>check(host,'Allow moment record download'));
  expect(draft.collection).toEqual({allowOriginalDownload:true,allowDerivativeDownload:true,allowMomentRecordDownload:true,gateAudioPlayback:false,originalDownloadLimit:100,derivativeDownloadLimit:2,originalDownloadPriceCents:1234,derivativeDownloadPriceCents:1});
  expect(draft.files).toBe(fileBase.files);expect(draft.longForm).toBe(base.longForm);
  await act(()=>check(host,'Allow original download'));expect(draft.collection).toMatchObject({allowOriginalDownload:false,originalDownloadLimit:null,originalDownloadPriceCents:null});
  await act(()=>check(host,'Allow original download'));expect(draft.collection).toMatchObject({allowOriginalDownload:true,originalDownloadLimit:100,originalDownloadPriceCents:1234});
 }finally{await act(()=>root.unmount());}
});
it('retains the raw Collection fields through canvas and review and limits the audio gate to audio',async()=>{
 const file=new File(['song'],'song.mp3',{type:'audio/mpeg'});let draft:AssetComposerDraft={...base,kind:'audio',files:[{id:'source',file,role:'primary'}]},reviewing=true;
 const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}} studio={{reviewing,onReview:()=>{reviewing=true;render();},onEdit:()=>{reviewing=false;render();}}}/>);
 try{await act(render);await act(()=>check(host,'Gate audio playback'));await act(()=>edit(host,'Original download price (USD)','1.234'));
  expect(draft.collection?.gateAudioPlayback).toBe(true);expect(Number.isNaN(draft.collection?.originalDownloadPriceCents)).toBe(true);
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Edit original"]')!.click());
  expect(host.querySelector<HTMLElement>('[data-composer-section="collection"]')!.hidden).toBe(true);
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('1.234');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.getAttribute('aria-invalid')).toBe('true');
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Remove song.mp3"]')!.click());expect(draft.kind).toBe('moment');expect(draft.collection?.gateAudioPlayback).toBe(false);expect(host.querySelector('[aria-label="Gate audio playback"]')).toBeNull();expect(file.size).toBe(4);
  expect(draft.collection?.originalDownloadPriceCents).toBeNull();expect(draft.collection?.originalDownloadLimit).toBeNull();expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('');
 }finally{await act(()=>root.unmount());}
});
for(const field of ['Original download quantity','Original download price (USD)','Derivative download quantity','Derivative download price (USD)'])it(`rejects an invalid ${field.toLowerCase()} before the existing creation call`,async()=>{
 let selected:AssetComposerDraft|undefined;const create=vi.fn(async(_definition:unknown,draft:AssetComposerDraft)=>{selected=draft;throw Error('CONTROLLED_STOP_BEFORE_SOURCE');});
 const identity={username:'artist',accountUsername:()=> 'artist',pendingAssetPublication:async()=>null,createComposedAsset:create} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));await act(()=>edit(host,'Title','A complete original'));
  if(field.startsWith('Original'))await act(()=>chooseOriginal(host,fileBase.files[0].file));
  await act(()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Details')!.click());
  if(field.startsWith('Derivative'))await act(()=>check(host,'Allow derivative download'));
  await act(()=>edit(host,field,field.includes('quantity')?'1.5':'0.001'));
  expect(host.querySelector<HTMLInputElement>(`[aria-label="${field}"]`)!.getAttribute('aria-invalid')).toBe('true');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Create asset"]')!.click());expect(create).not.toHaveBeenCalled();
  await act(()=>edit(host,field,field.includes('quantity')?'1000000':'10000.00'));
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Create asset"]')!.click());expect(create).toHaveBeenCalledOnce();
  expect(selected?.collection?.[field.startsWith('Original')?(field.includes('quantity')?'originalDownloadLimit':'originalDownloadPriceCents'):(field.includes('quantity')?'derivativeDownloadLimit':'derivativeDownloadPriceCents')]).toBe(1000000);
 }finally{await act(()=>root.unmount());}
});

it('uses the Source input bounds and never turns malformed enabled amounts into a free or unlimited choice',async()=>{
 let draft=fileBase;const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);await act(()=>edit(host,'Original download quantity','1'));
  for(const [raw,expected] of [['',null],['  ',null],['0001',1],['1000000',1000000],['0',NaN],['-1',NaN],['1.0',NaN],['1e2',NaN],['Infinity',NaN],['1000001',NaN]] as const){await act(()=>edit(host,'Original download quantity',raw));expect(draft.collection?.originalDownloadLimit,raw).toBe(expected);}
  await act(()=>edit(host,'Original download quantity',''));await act(()=>edit(host,'Original download price (USD)','1'));
  for(const [raw,expected] of [['',null],['  ',null],['00.01',1],['1.',100],[' 12.34 ',1234],['10000.00',1000000],['0',NaN],['.01',NaN],['1.001',NaN],['1e2',NaN],['-1',NaN],['10000.01',NaN],['Infinity',NaN]] as const){await act(()=>edit(host,'Original download price (USD)',raw));expect(draft.collection?.originalDownloadPriceCents,raw).toBe(expected);}
  await act(()=>check(host,'Allow original download'));expect(draft.collection).toMatchObject({allowOriginalDownload:false,originalDownloadPriceCents:null,originalDownloadLimit:null});
  await act(()=>check(host,'Allow original download'));expect(draft.collection?.originalDownloadPriceCents).toBeNaN();expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('Infinity');
 }finally{await act(()=>root.unmount());}
});

it('Moment shows optional Original file inputs while retaining derivative pricing, Moment permission and historical defaults',async()=>{
 let draft=base;const host=document.createElement('div'),root=createRoot(host),changed=vi.fn();
 const render=()=>root.render(<AssetComposer value={draft} onChange={next=>{changed(next);draft=next;render();}}/>);
 try{await act(render);expect(changed).not.toHaveBeenCalled();
  expect(host.querySelector<HTMLInputElement>('[aria-label="Original download quantity"]')!.value).toBe('');expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Allow original download"]')!.checked).toBe(true);
  await act(()=>check(host,'Allow derivative download'));await act(()=>edit(host,'Derivative download price (USD)','2.34'));await act(()=>edit(host,'Derivative download quantity','7'));await act(()=>check(host,'Allow moment record download'));
  await act(()=>check(host,'Allow original download'));await act(()=>check(host,'Allow original download'));
  expect(draft.collection).toMatchObject({allowOriginalDownload:true,originalDownloadPriceCents:null,originalDownloadLimit:null,allowDerivativeDownload:true,derivativeDownloadPriceCents:234,derivativeDownloadLimit:7,allowMomentRecordDownload:true});
 }finally{await act(()=>root.unmount());}
});

it('removing a priced primary clears only Original file amounts and cannot resurrect them when a new file is chosen',async()=>{
 let draft:AssetComposerDraft={...fileBase,collection:{allowOriginalDownload:true,allowDerivativeDownload:true,allowMomentRecordDownload:true,gateAudioPlayback:false,originalDownloadLimit:5,originalDownloadPriceCents:123,derivativeDownloadLimit:7,derivativeDownloadPriceCents:234}};
 const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);await act(()=>edit(host,'Derivative download price (USD)','0.001'));
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Remove work.bin"]')!.click());
  expect(draft.kind).toBe('moment');expect(draft.collection).toMatchObject({originalDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadLimit:7,allowMomentRecordDownload:true});
  expect(draft.collection?.derivativeDownloadPriceCents).toBeNaN();expect(host.querySelector<HTMLInputElement>('[aria-label="Derivative download price (USD)"]')!.value).toBe('0.001');
  await act(()=>chooseOriginal(host,new File(['replacement'],'next.bin',{type:'application/octet-stream'})));
  expect(draft.kind).toBe('file');expect(host.querySelector<HTMLInputElement>('[aria-label="Original download quantity"]')!.value).toBe('');expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('');
  await act(()=>check(host,'Allow moment record download'));expect(draft.collection?.originalDownloadLimit).toBeNull();expect(draft.collection?.originalDownloadPriceCents).toBeNull();
 }finally{await act(()=>root.unmount());}
});


it('shows Original quantity and price before file selection and retains the selected terms when attaching the Original',async()=>{
 let draft=base;const host=document.createElement('div'),root=createRoot(host),render=()=>root.render(<AssetComposer value={draft} onChange={next=>{draft=next;render();}}/>);
 try{await act(render);
  await act(()=>edit(host,'Original download quantity','25'));await act(()=>edit(host,'Original download price (USD)','4.99'));
  expect(draft.collection).toMatchObject({originalDownloadLimit:25,originalDownloadPriceCents:499});
  await act(()=>chooseOriginal(host,fileBase.files[0].file));
  expect(draft.kind).toBe('file');expect(draft.collection).toMatchObject({originalDownloadLimit:25,originalDownloadPriceCents:499});
  expect(host.querySelector<HTMLInputElement>('[aria-label="Original download quantity"]')!.value).toBe('25');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Original download price (USD)"]')!.value).toBe('4.99');
 }finally{await act(()=>root.unmount());}
});
