// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {createAssetPublication,type AssetPublicationReceipt,type AssetPublicationState} from '../src/receiz/asset-publication';
import * as adoption from '../src/receiz/asset-publication-adoption';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

// A local-first return must not turn the still-running first delivery into a
// manual retry. Exercise the actual publisher and its saved checkpoint, not a
// hand-authored UI completion event.
it.each(['accepted','transport-error'] as const)('shows the held Original during its one first delivery, then exposes the correct next action: %s',async outcome=>{
 const digest='7'.repeat(64),owner='first-delivery.receiz.id',intent={title:'A new Original'};
 let state:AssetPublicationState|null=null,finish!:(value:AssetPublicationReceipt)=>void,fail!:(error:Error)=>void;
 const response=new Promise<AssetPublicationReceipt>((resolve,reject)=>{finish=resolve;fail=reject;}),file=new File(['exact held Original'],'original.receizbundle');
 const seal=vi.fn(async()=>file),publish=vi.fn(async()=>response),restore=vi.fn(async()=>file),fetch=vi.fn();
 const api=createAssetPublication({ownerReceizId:owner,assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=structuredClone(next);},seal,retain:async()=>digest,restore,readIntent:async()=>intent,publish});
 const pending=vi.fn(async()=>null),retry=vi.fn(async()=>{const value=await api.resume();return{...held,publication:value.publication};});
 const held={digest,bytes:new Uint8Array([1,2,3]),filename:file.name,title:intent.title,kind:'proof' as const,status:'held-proof' as const,pulse:'1'};
 const identity={binding:{artifactOwnerReceizId:owner},accountUsername:()=> 'artist',pendingAssetPublication:pending,retryAssetPublication:retry,createComposedAsset:async()=>({...held,publication:(await api.createLocal(intent)).publication})} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),button=(label:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent===label);
 vi.stubGlobal('fetch',fetch);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  const input=host.querySelector<HTMLInputElement>('[aria-label="Title"]')!;
  await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,intent.title);input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Create asset"]')!.click());
  expect(host.querySelector('h1')?.textContent).toBe('Your Original is sealed.');
  expect(button('Retry public delivery')).toBeUndefined();
  expect(host.querySelector('[role="status"][aria-label="Delivering your Original"]')).not.toBeNull();
  expect(button('Save original proof')).toBeDefined();expect(button('Sign')?.disabled).toBe(false);
  expect(seal).toHaveBeenCalledOnce();expect(publish).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();
  await act(async()=>{
   if(outcome==='accepted')finish({status:'published',artifactDigest:'8'.repeat(64),operationCount:2,visibleChildCount:1});
   else fail(Error('PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID'));
   await vi.waitFor(()=>expect(state?.receipt?.status).toBe(outcome==='accepted'?'published':'pending'));
  });
  expect(host.querySelector('[role="status"][aria-label="Delivering your Original"]')).toBeNull();
  if(outcome==='accepted'){expect(button('Sign')?.disabled).toBe(false);expect(button('Retry public delivery')).toBeUndefined();}
  else{expect(button('Retry public delivery')?.disabled).toBe(false);expect(button('Retry public delivery')?.className).toBe('secondary-button');expect(button('Sign')?.disabled).toBe(false);expect(host.querySelector('details')?.textContent).toContain('PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID');expect(host.textContent).not.toContain('Global delivery has started.');}
  expect(host.querySelector('.proof-coordinate')?.textContent).toBe(digest);
  expect(seal).toHaveBeenCalledOnce();expect(publish).toHaveBeenCalledOnce();expect(restore).not.toHaveBeenCalled();expect(pending).toHaveBeenCalledOnce();expect(fetch).not.toHaveBeenCalled();
 }finally{
  await act(async()=>{finish({status:'published',artifactDigest:'8'.repeat(64),operationCount:2,visibleChildCount:1});await response.catch(()=>{});});
  act(()=>root.unmount());vi.unstubAllGlobals();
 }
});

it.each(['approved','cancelled'] as const)('keeps first delivery independent of the early signing action: %s',async outcome=>{
 const digest='9'.repeat(64),owner='early-sign.receiz.id',intent={title:'Sign the held Original'};
 let state:AssetPublicationState|null=null,finish!:(value:AssetPublicationReceipt)=>void,finishSignature!:()=>void;
 const unsignedResponse=new Promise<AssetPublicationReceipt>(resolve=>{finish=resolve;}),signedResponse=new Promise<void>(resolve=>{finishSignature=resolve;});
 const file=new File(['one held Original'],'original.receizbundle'),seal=vi.fn(async()=>file),publish=vi.fn(async()=>unsignedResponse),restore=vi.fn(async()=>file);
 const api=createAssetPublication({ownerReceizId:owner,assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=structuredClone(next);},seal,retain:async()=>digest,restore,readIntent:async()=>intent,publish});
 const held={digest,bytes:new Uint8Array([1,2,3]),filename:file.name,title:intent.title,kind:'proof' as const,status:'held-proof' as const,pulse:'1'};
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:digest,byteLength:3,filename:file.name,mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:3,contentByteLength:3,height:0}};
 const sign=vi.fn(async(source:typeof held)=>{
  expect(source.digest).toBe(digest);expect(source.bytes).toEqual(held.bytes);
  if(outcome==='cancelled')throw Error('passkey_cancelled');
  adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:reference,firstPaint:null,original:{id:'imported-early-sign',assetTitle:intent.title,showOnProfile:true,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64),importedSource:{reference},media:{kind:'file',originalDownloadSha256Hex:digest,originalDownloadSrc:'/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)})}}},{identityDigest:'d'.repeat(64),accountUid:'owner'});
  // The actual SDK's causal ordering is qualified separately; this boundary
  // keeps its two pending acknowledgments independently controllable in the UI.
  await unsignedResponse;await signedResponse;
  return{...source,pbiSigned:true,publication:{status:'published' as const},marketPublication:{status:'published' as const}};
 });
 const pending=vi.fn(async()=>null),retry=vi.fn(),identity={binding:{artifactOwnerReceizId:owner},accountUsername:()=> 'artist',pendingAssetPublication:pending,retryAssetPublication:retry,createComposedAsset:async()=>({...held,publication:(await api.createLocal(intent)).publication}),publishAssetToMarket:sign}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),button=(label:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent===label);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  const input=host.querySelector<HTMLInputElement>('[aria-label="Title"]')!;
  await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,intent.title);input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Create asset"]')!.click());
  expect(button('Sign')?.disabled).toBe(false);const signing=button('Sign')!;
  await act(async()=>{signing.click();signing.click();});
  expect(sign).toHaveBeenCalledOnce();expect(button('Retry public delivery')).toBeUndefined();
  expect(host.querySelector('[role="status"][aria-label="Delivering your Original"]')).not.toBeNull();
  if(outcome==='approved'){expect(host.querySelector('h1')?.textContent).toBe('Your Original is signed.');expect(button('Sign')).toBeUndefined();}
  else{expect(host.querySelector('[role="alert"]')?.textContent).toContain('Signing was cancelled.');expect(button('Sign')?.disabled).toBe(false);}
  await act(async()=>{finish({status:'published',artifactDigest:'a'.repeat(64),operationCount:2,visibleChildCount:1});await vi.waitFor(()=>expect(state?.status).toBe('published'));});
  if(outcome==='approved'){
   expect(host.textContent).toContain('Your Original is public on Receiz. Its saved PBI signature is awaiting public confirmation.');
   expect(host.querySelector('[role="status"][aria-label="Delivering your Original"]')).not.toBeNull();
   await act(async()=>{finishSignature();await signedResponse;});
   expect(host.querySelector('h1')?.textContent).toBe('Your Original is signed and public.');expect(button('Sign')).toBeUndefined();
  }else expect(button('Sign')?.disabled).toBe(false);
  expect(seal).toHaveBeenCalledOnce();expect(publish).toHaveBeenCalledOnce();expect(sign).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();expect(restore).not.toHaveBeenCalled();expect(pending).toHaveBeenCalledOnce();
 }finally{
  await act(async()=>{finish({status:'published',artifactDigest:'a'.repeat(64),operationCount:2,visibleChildCount:1});finishSignature();await unsignedResponse;await signedResponse;});
  act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();
 }
});
