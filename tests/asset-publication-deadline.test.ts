import {afterEach,expect,it,vi} from 'vitest';
import bankApi from '../api/index';
import {nativeFetch,nativeRequestTimeout} from '../src/receiz/native-transport';
import {BANK_APPLICATION_ID} from '../src/receiz/config';

const path=`/api/connect/profile/showcase/publication?applicationId=${BANK_APPLICATION_ID}`;
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

it('returns the original publication acknowledgment after 73 seconds without a retry or a 60-second client/relay cutoff',async()=>{
 vi.useFakeTimers();
 vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>{const controller=new AbortController();setTimeout(()=>controller.abort(new DOMException('Timed out','TimeoutError')),ms);return controller.signal;});
 const receipt={status:'published',artifactDigest:'a'.repeat(64)},submitted='{"action":"finalize","synthetic":true}';
 let upstreamCalls=0,upstreamBody:BodyInit|null|undefined,upstreamSignal:AbortSignal|null|undefined,settled=false;
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(input,init)=>{
  const target=String(input);
  if(target.startsWith('/api/bank/native'))return bankApi.fetch(new Request('https://bank.example'+target,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),Origin:'https://bank.example'}}));
  expect(target).toBe('https://receiz.com'+path);upstreamCalls++;upstreamBody=init?.body;upstreamSignal=init?.signal;
  return new Promise<Response>((resolve,reject)=>{const done=setTimeout(()=>resolve(Response.json(receipt)),73_100);init?.signal?.addEventListener('abort',()=>{clearTimeout(done);reject(init.signal?.reason);},{once:true});});
 }));
 const response=nativeFetch('https://receiz.com'+path,{method:'POST',headers:{'content-type':'application/json'},body:submitted}).then(value=>{settled=true;return value;});
 await vi.advanceTimersByTimeAsync(60_001);
 expect(settled).toBe(false);expect(upstreamSignal?.aborted).toBe(false);
 await vi.advanceTimersByTimeAsync(13_100);
 expect(await (await response).json()).toEqual(receipt);expect(upstreamCalls).toBe(1);expect(upstreamBody).toBe(submitted);
});

it('keeps ordinary reads at 60 seconds and caller cancellation active for publication',async()=>{
 expect(nativeRequestTimeout('https://receiz.com'+path,'POST')).toBe(110_000);
 expect(nativeRequestTimeout('https://receiz.com'+path)).toBe(60_000);
 expect(nativeRequestTimeout('https://receiz.com/api/connect/wallet/me','POST')).toBe(60_000);
 const controller=new AbortController();let signal:AbortSignal|null|undefined;
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(_input,init)=>{signal=init?.signal;return new Promise<Response>((_resolve,reject)=>signal?.addEventListener('abort',()=>reject(signal?.reason),{once:true}));}));
 const pending=bankApi.fetch(new Request('https://bank.example/api/bank/native'+path,{method:'POST',headers:{'content-type':'application/json',Origin:'https://bank.example'},body:'{}',signal:controller.signal}));
 await vi.waitFor(()=>expect(signal).toBeDefined());controller.abort();expect((await pending).status).toBe(503);expect(signal?.aborted).toBe(true);
});
