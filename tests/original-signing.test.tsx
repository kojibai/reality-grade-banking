// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {OriginalSigning} from '../src/features/assets/OriginalSigning';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import {parsePublicMarket} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const source:HeldDeposit={digest:'a'.repeat(64),filename:'original.receizbundle',title:'An Original',kind:'proof',status:'held-proof',pulse:'14955302',bytes:new Uint8Array([1,2])};
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:original',receizId:'original',title:'An Original',ownerUsername:'artist',profileOriginal:{hasPbiSignature:false,media:{originalDownloadSha256Hex:source.digest}}}]}}).items[0];
function identity(publish=vi.fn().mockResolvedValue({...source,pbiSigned:true})){return {binding:{keyId:'key',artifactOwnerReceizId:'artist.receiz.id'},accountUsername:()=> 'artist',username:'artist',knownDeposits:()=>[source],publishAssetToMarket:publish} as unknown as OpenIdentity;}
afterEach(()=>vi.restoreAllMocks());
async function mounted(props:Parameters<typeof OriginalSigning>[0]){const host=document.createElement('div'),root=createRoot(host);await act(async()=>root.render(<OriginalSigning {...props}/>));return {host,root};}
it('opens only the existing signing operation for the exact held Original and coalesces repeat taps',async()=>{
 let resolve!:(source:HeldDeposit)=>void;const publish=vi.fn(()=>new Promise<HeldDeposit>(r=>{resolve=r;})),request=vi.spyOn(globalThis,'fetch');
 const {host,root}=await mounted({identity:identity(publish),source,item});
 try{expect(publish).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();const button=host.querySelector<HTMLButtonElement>('button[aria-label="Unlock value with PBI"]');expect(button).not.toBeNull();
  await act(async()=>{button!.click();button!.click();});expect(publish).toHaveBeenCalledOnce();expect(publish).toHaveBeenCalledWith(source);expect(button!.disabled).toBe(true);expect(request).not.toHaveBeenCalled();
  await act(async()=>resolve({...source,pbiSigned:true}));expect(host.querySelector('button')).toBeNull();
 }finally{act(()=>root.unmount());}
});
it('keeps an unsigned Original available after cancellation and allows a deliberate retry',async()=>{
 const publish=vi.fn().mockRejectedValueOnce(Error('passkey_cancelled')).mockResolvedValueOnce({...source,pbiSigned:true});const {host,root}=await mounted({identity:identity(publish),source,item});
 try{await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(host.textContent).toContain('Signing was cancelled');expect(host.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
  await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(publish).toHaveBeenCalledTimes(2);expect(host.querySelector('button')).toBeNull();
 }finally{act(()=>root.unmount());}
});
it('hides signing for signed objects, another owner and native asset positions without doing work',async()=>{
 const publish=vi.fn(),request=vi.spyOn(globalThis,'fetch'),id=identity(publish);const {host,root}=await mounted({identity:id,source,item:{...item,hasPbiSignature:true}});
 try{expect(host.querySelector('button')).toBeNull();await act(async()=>root.render(<OriginalSigning identity={id} item={{...item,ownerUsername:'another'}}/>));expect(host.querySelector('button')).toBeNull();
  await act(async()=>root.render(<OriginalSigning identity={id} source={source}/>));expect(host.querySelector('button')).toBeNull();
  await act(async()=>root.render(<OriginalSigning identity={id} source={{...source,nativeAsset:{} as NonNullable<HeldDeposit['nativeAsset']>}}/>));expect(host.querySelector('button')).toBeNull();expect(publish).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
