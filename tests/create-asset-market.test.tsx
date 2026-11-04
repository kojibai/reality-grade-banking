// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {CreateAsset} from '../src/features/assets/CreateAsset';import type {OpenIdentity} from '../src/receiz/native-identity';
import {createAssetPublication,type AssetPublicationState} from '../src/receiz/asset-publication';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const original={bytes:new Uint8Array([1,2,3]),filename:'original.receizbundle',digest:'a'.repeat(64),title:'An existing Original',kind:'proof',status:'held-proof',pulse:'1',publication:{status:'published'}};
it.each(['signed','cancelled','pending'] as const)('signs the already public Original without recreating it: %s',async mode=>{
 const publish=vi.fn(async(source:unknown)=>{expect(source).toEqual(original);if(mode==='cancelled')throw Error('passkey_cancelled');return{...original,pbiSigned:true,marketPublication:mode==='pending'?{status:'pending',code:'DELIVERY_PENDING'}:{status:'published'}};}),create=vi.fn(),retry=vi.fn(),identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>original,publishAssetToMarket:publish,createComposedAsset:create,retryAssetPublication:retry} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));const button=[...host.querySelectorAll('button')].find(button=>button.textContent==='Sign')!;expect(button).toBeDefined();await act(async()=>button.click());expect(publish).toHaveBeenCalledOnce();expect(create).not.toHaveBeenCalled();expect(retry).not.toHaveBeenCalled();
 if(mode==='pending'){expect(host.textContent).toContain('Market listing delivery is pending.');expect(host.textContent).toContain('Your Original is signed.');expect(host.textContent).toContain('Your Original is public on Receiz.');expect(host.textContent).toContain('Finish publishing');}
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
 expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Delivering your original…')?.disabled).toBe(true);
 expect(host.textContent).toContain('Your Original is public on Receiz.');expect(host.textContent).not.toContain('Signing your Original');expect(host.textContent).not.toContain('Finish publishing');expect(host.textContent).toContain('Open your asset');
 if(mode==='delivery-error'){await act(async()=>{fail(Error('Background delivery unavailable'));await pending.catch(()=>{});});expect(host.querySelector('[role=alert]')).toBeNull();expect(host.textContent).toContain('Your Original is public on Receiz.');}
 }finally{await act(async()=>{finish({...original,pbiSigned:true});await pending.catch(()=>{});});act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});

it('updates restored completion from the delivery acknowledgment without repeated reads or another retry',async()=>{
 const pending={...original,publication:{status:'pending'}},read=vi.fn(async()=>pending),retry=vi.fn(),identity={accountUsername:()=> 'artist',pendingAssetPublication:read,retryAssetPublication:retry} as unknown as OpenIdentity;
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:original.digest,byteLength:3,filename:original.filename,mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:3,contentByteLength:3,height:0}};
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));expect(host.textContent).toContain('Global delivery has started.');
 await act(()=>adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:reference,firstPaint:null,original:{id:'imported-local',assetTitle:original.title,showOnProfile:true,importedSource:{reference},media:{kind:'file',originalDownloadSha256Hex:original.digest,originalDownloadSrc:'/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)})}}},{identityDigest:'d'.repeat(64),accountUid:'owner'}));
 await act(()=>adoption.acknowledgeAssetPublication(original.digest,{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1}));
 expect(host.textContent).toContain('Your Original is already public on Receiz and accruing value');expect(read).toHaveBeenCalledOnce();expect(retry).toHaveBeenCalledOnce();expect(host.textContent).toContain('Open your asset');
 }finally{act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});

it.each(['pending','rejected'] as const)('finishes the saved %s delivery on reopen and offers Sign without resealing or requiring another tap',async initialStatus=>{
 let state:AssetPublicationState|null=null,seals=0,deliveries=0,lostAcknowledgment=true;
 const file=new File(['the exact saved Original'],'original.receizbundle'),intent={title:'An existing Original'};
 const api=createAssetPublication({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,
  write:async(next,previous)=>{expect(state).toEqual(previous);state=structuredClone(next);},
  seal:async()=>{seals++;return file;},retain:async()=>original.digest,restore:async()=>file,readIntent:async()=>intent,
  publish:async source=>{expect(source).toBe(file);deliveries++;if(lostAcknowledgment){if(initialStatus==='rejected')return{status:'rejected',code:'PROFILE_SHOWCASE_COMPLETE_PROJECTION_CUSTODY_REQUIRED'};throw Error('Lost acknowledgment');}return{status:'published',artifactDigest:'f'.repeat(64),operationCount:45,visibleChildCount:612};}});
 const initial=await api.create(intent);expect(initial.publication.status).toBe(initialStatus);lostAcknowledgment=false;
 const deposit=async(value:Awaited<ReturnType<typeof api.resume>>|null)=>value?{...original,publication:value.publication}:null;
 const identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>deposit(await api.pending()),retryAssetPublication:async()=>deposit(await api.resume())}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>{root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>);});
  await act(async()=>{await vi.waitFor(()=>expect(state?.status).toBe('published'));});
  expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(true);
  expect(host.textContent).not.toContain('Retry public delivery');expect(host.textContent).toContain('Your Original is already public on Receiz');
  expect(state).toMatchObject({status:'published',sourceDigest:original.digest,receipt:{artifactDigest:'f'.repeat(64),operationCount:45,visibleChildCount:612}});
  expect(seals).toBe(1);expect(deliveries).toBe(2);
 }finally{act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
 // The saved checkpoint is settled, so a later open cannot restore Retry.
 expect(await api.pending()).toBeNull();
});

it('joins an existing delivery on reopen without sending or sealing it twice',async()=>{
 let state:AssetPublicationState|null=null,seals=0,deliveries=0;
 let complete!:(value:{status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number})=>void;
 const response=new Promise<Parameters<typeof complete>[0]>(resolve=>{complete=resolve;}),file=new File(['the exact saved Original'],'original.receizbundle'),intent={title:'An existing Original'};
 const api=createAssetPublication({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,
  write:async(next)=>{state=structuredClone(next);},seal:async()=>{seals++;return file;},retain:async()=>original.digest,restore:async()=>file,readIntent:async()=>intent,
  publish:async source=>{expect(source).toBe(file);deliveries++;return response;}});
 await api.createLocal(intent);
 let resuming=false;
 const identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>{const held=await api.pending();return held?{...original,publication:held.publication}:null;},retryAssetPublication:async()=>{resuming=true;return{...original,publication:(await api.resume()).publication};}}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  await act(async()=>{await vi.waitFor(()=>expect(resuming).toBe(true));});
  expect(host.textContent).toContain('Delivering your original');
  expect(deliveries).toBe(1);expect(seals).toBe(1);
  await act(async()=>{complete({status:'published',artifactDigest:'e'.repeat(64),operationCount:2,visibleChildCount:1});await vi.waitFor(()=>expect(state?.status).toBe('published'));});
  expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(true);
  expect(host.textContent).not.toContain('Retry public delivery');expect(deliveries).toBe(1);expect(seals).toBe(1);
 }finally{await act(async()=>{complete({status:'published',artifactDigest:'e'.repeat(64),operationCount:2,visibleChildCount:1});await api.resume();});act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});

it.each(['pending','rejected'] as const)('retains a %s saved delivery without automatically looping or claiming it was published',async status=>{
 let attempts=0;
 const pending={...original,publication:{status,code:'PROFILE_SHOWCASE_PUBLICATION_HTTP_503'}},identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>pending,retryAssetPublication:async()=>{attempts++;return pending;}}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(attempts).toBe(1);expect(host.textContent).toContain('Retry public delivery');expect(host.textContent).toContain('PROFILE_SHOWCASE_PUBLICATION_HTTP_503');
  expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Sign')).toBe(false);
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));expect(attempts).toBe(1);
 }finally{act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});

it('does not leave the next identity busy or adopt a late delivery from the previous identity',async()=>{
 let finish!:(value:typeof original)=>void;
 const delivery=new Promise<typeof original>(resolve=>{finish=resolve;}),pending={...original,publication:{status:'pending'}},next={...original,title:'The next account’s Original',digest:'b'.repeat(64)};
 const previousIdentity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>pending,retryAssetPublication:()=>delivery}as unknown as OpenIdentity;
 const nextIdentity={accountUsername:()=> 'another',pendingAssetPublication:async()=>next}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),render=(identity:OpenIdentity)=><CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>;
 try{
  await act(async()=>root.render(render(previousIdentity)));expect(host.textContent).toContain('Delivering your original');
  await act(async()=>root.render(render(nextIdentity)));
  expect(host.textContent).toContain('The next account’s Original');expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Sign')?.disabled).toBe(false);
  await act(async()=>{finish(original);await delivery;});
  expect(host.textContent).toContain('The next account’s Original');expect(host.textContent).not.toContain('An existing Original');
 }finally{await act(async()=>{finish(original);await delivery;});act(()=>root.unmount());adoption.forgetAssetPublicationAdmissions();}
});
