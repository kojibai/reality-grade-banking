// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {CreateAsset} from '../src/features/assets/CreateAsset';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const original={bytes:new Uint8Array([1,2,3]),filename:'original.receizbundle',digest:'a'.repeat(64),title:'An existing Original',kind:'proof',status:'held-proof',pulse:'1',publication:{status:'published'}};
it.each(['signed','cancelled','pending'] as const)('signs the already public Original without recreating it: %s',async mode=>{
 const publish=vi.fn(async(source:unknown)=>{expect(source).toEqual(original);if(mode==='cancelled')throw Error('passkey_cancelled');return{...original,pbiSigned:true,...(mode==='pending'?{marketPublication:{status:'pending',code:'DELIVERY_PENDING'}}:{})};}),create=vi.fn(),retry=vi.fn(),identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>original,publishAssetToMarket:publish,createComposedAsset:create,retryAssetPublication:retry} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));const button=[...host.querySelectorAll('button')].find(button=>button.textContent==='Sign')!;expect(button).toBeDefined();await act(async()=>button.click());expect(publish).toHaveBeenCalledOnce();expect(create).not.toHaveBeenCalled();expect(retry).not.toHaveBeenCalled();
 if(mode==='pending'){expect(host.textContent).toContain('Market listing delivery is pending.');expect(host.textContent).toContain('Your Original is signed and public.');expect(host.textContent).toContain('Your Original is public on Receiz.');expect(host.textContent).not.toContain('Finish publishing');}
 else if(mode==='signed'){expect(host.textContent).toContain('Your Original is public on Receiz.');expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(false);}
 else{expect(host.textContent).toContain('Signing was cancelled. Your original remains saved.');expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(true);expect(host.textContent).toContain('Save original proof');}
 }finally{act(()=>root.unmount());}
});

it.each(['delayed','delivery-error'] as const)('finishes from the verified local admission without waiting on public delivery: %s',async mode=>{
 let finish!:(value:unknown)=>void,fail!:(cause:Error)=>void;const pending=new Promise((resolve,reject)=>{finish=resolve;fail=reject;}),publish=vi.fn(()=>pending),identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>original,publishAssetToMarket:publish} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:original.digest,byteLength:3,filename:original.filename,mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:3,contentByteLength:3,height:0}};
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));const button=[...host.querySelectorAll('button')].find(button=>button.textContent==='Sign')!;await act(async()=>button.click());expect(publish).toHaveBeenCalledOnce();
 await act(async()=>adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:reference,firstPaint:{artifactDigest:'c'.repeat(64)},original:{id:'imported-local',assetTitle:original.title,showOnProfile:true,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64),importedSource:{reference},media:{kind:'file',originalDownloadSha256Hex:original.digest,originalDownloadSrc:'/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)})}}},{identityDigest:'d'.repeat(64),accountUid:'owner'}));
 expect(host.textContent).toContain('Your Original is public on Receiz.');expect(host.textContent).not.toContain('Signing your Original');expect(host.textContent).not.toContain('Finish publishing');expect(host.textContent).toContain('Open your asset');
 if(mode==='delivery-error'){await act(async()=>{fail(Error('Background delivery unavailable'));await pending.catch(()=>{});});expect(host.querySelector('[role=alert]')).toBeNull();expect(host.textContent).toContain('Your Original is public on Receiz.');}
 }finally{await act(async()=>{finish({...original,pbiSigned:true});await pending.catch(()=>{});});act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});
