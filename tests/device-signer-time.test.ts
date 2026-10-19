import {afterEach,expect,it,vi} from 'vitest';
import {certificateTimeSafeStore,certificateTimeSafeFetch,SIGNER_CERTIFICATE_MAX_WAIT_MS} from '../src/receiz/device-signer-time';
import type {ReceizOfflineSealEnrollment} from '@receiz/sdk/offline';
const state={privateKey:{type:'private',extractable:false},cert:{version:1,certType:'receiz.device.v1',alg:'Ed25519',issuedAtMs:2000,expiresAtMs:4000}} as ReceizOfflineSealEnrollment;
afterEach(()=>vi.useRealTimers());
it('waits for a nearly future stored certificate without replacing or rewriting custody',async()=>{
 vi.useFakeTimers({now:1950});const save=vi.fn(),store=certificateTimeSafeStore({load:async()=>state,save});let result:unknown;
 const read=store.load().then(value=>{result=value;});await vi.advanceTimersByTimeAsync(0);expect(result).toBeUndefined();
 await vi.advanceTimersByTimeAsync(50);await read;expect(result).toBe(state);expect(state.cert.issuedAtMs).toBe(2000);expect(save).not.toHaveBeenCalled();
});
it('waits before handing a fresh enrollment response to the unmodified SDK',async()=>{
 vi.useFakeTimers({now:1950});const response=Response.json({ok:true,cert:state.cert}),network=vi.fn(async()=>response),transport=certificateTimeSafeFetch(network);let result:unknown;
 const read=transport('https://receiz.com/api/signer/v4/receiz/enroll',{method:'POST'}).then(value=>{result=value;});
 await vi.advanceTimersByTimeAsync(0);expect(result).toBeUndefined();await vi.advanceTimersByTimeAsync(50);await read;
 expect(result).toBe(response);expect(await response.json()).toEqual({ok:true,cert:state.cert});expect(network).toHaveBeenCalledTimes(1);
});
it('adds no timer for a valid current certificate or a clock error outside the bounded wait',async()=>{
 vi.useFakeTimers({now:2000});const store=certificateTimeSafeStore({load:async()=>state,save:vi.fn()});expect(await store.load()).toBe(state);expect(vi.getTimerCount()).toBe(0);
 vi.setSystemTime(2000-SIGNER_CERTIFICATE_MAX_WAIT_MS-1);expect(await store.load()).toBe(state);expect(vi.getTimerCount()).toBe(0);
});
it('bounds a stalled wall-clock wait without manufacturing a later time',async()=>{
 vi.useFakeTimers({now:1950});const now=vi.spyOn(Date,'now').mockReturnValue(1950),store=certificateTimeSafeStore({load:async()=>state,save:vi.fn()});
 const read=store.load();await vi.advanceTimersByTimeAsync(SIGNER_CERTIFICATE_MAX_WAIT_MS);expect(await read).toBe(state);expect(Date.now()).toBe(1950);now.mockRestore();
});
it('does not parse or delay unrelated requests and failed enrollment responses',async()=>{
 vi.useFakeTimers({now:1950});for(const [url,status] of [['https://receiz.com/api/connect/wallet/me',200],['https://receiz.com/api/signer/v4/receiz/enroll',503]]as const){
  const response=Response.json({cert:state.cert},{status}),network=vi.fn(async()=>response);expect(await certificateTimeSafeFetch(network)(url,{method:'POST'})).toBe(response);expect(response.bodyUsed).toBe(false);expect(vi.getTimerCount()).toBe(0);
 }
});
