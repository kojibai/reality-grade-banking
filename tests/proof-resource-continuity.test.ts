import {expect,it,vi} from 'vitest';
import {loadBankProofResources} from '../src/receiz/proof-resource-continuity';
it('reopens prepared canonical resources from local cache with networking disabled',async()=>{
 const network=vi.fn(async()=>{throw Error('NETWORK_DISABLED');});
 const local={match:vi.fn(async(path:string)=>new Response(new Uint8Array(path.endsWith('wasm')?[1,2]:[3,4])))};
 const resources=await loadBankProofResources(network as typeof fetch,local);
 expect([...resources.wasm]).toEqual([1,2]);expect([...resources.zkey]).toEqual([3,4]);expect(network).not.toHaveBeenCalled();
});
it('fetches only missing public resources and leaves failure retryable',async()=>{
 const network=vi.fn(async(_path:string)=>new Response(new Uint8Array([3,4]))),local={match:vi.fn(async(path:string)=>path.endsWith('wasm')?new Response(new Uint8Array([1,2])):undefined)};
 await loadBankProofResources(network as typeof fetch,local);expect(network).toHaveBeenCalledTimes(1);expect(network.mock.calls[0][0]).toBe('/zk/document-seal.zkey');
});
