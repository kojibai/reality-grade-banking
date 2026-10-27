// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const original={bytes:new Uint8Array([1,2,3]),filename:'original.receizbundle',digest:'a'.repeat(64),title:'An existing Original',kind:'proof',status:'held-proof',pulse:'1',publication:{status:'published'}};
it.each(['signed','cancelled'] as const)('publishes the existing Original through PBI without recreating it: %s',async mode=>{
 const publish=vi.fn(async(source:unknown)=>{expect(source).toEqual(original);if(mode==='cancelled')throw Error('passkey_cancelled');return{...original,pbiSigned:true};}),create=vi.fn(),retry=vi.fn(),identity={accountUsername:()=> 'artist',pendingAssetPublication:async()=>original,publishAssetToMarket:publish,createComposedAsset:create,retryAssetPublication:retry} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));const button=[...host.querySelectorAll('button')].find(button=>button.textContent==='Publish to Market')!;expect(button).toBeDefined();await act(async()=>button.click());expect(publish).toHaveBeenCalledOnce();expect(create).not.toHaveBeenCalled();expect(retry).not.toHaveBeenCalled();
 if(mode==='signed'){expect(host.textContent).toContain('Your signed Original is public');expect(host.textContent).not.toContain('Publish to Market');}
 else{expect(host.textContent).toContain('Signing was cancelled. Your original remains saved.');expect(host.textContent).toContain('Publish to Market');expect(host.textContent).toContain('Save original proof');}
 }finally{act(()=>root.unmount());}
});
