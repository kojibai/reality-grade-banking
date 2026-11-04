// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
let market:typeof import('../src/receiz/public-market');
let usePublicQuotes:typeof import('../src/receiz/usePublicQuotes')['usePublicQuotes'];
const nonceA='10000000-0000-4000-8000-000000000001',nonceB='10000000-0000-4000-8000-000000000002';
const snapshot=(price=10,generatedAt='2026-11-04T15:00:00Z')=>({ok:true,data:{schema:'receiz.market.public-snapshot.v1',generatedAt,liveMarkets:[{itemId:'a',assetId:'asset-a',visibility:'public',priceUsd:price}]}});
const deferred=()=>{let resolve!:(response:Response)=>void;const promise=new Promise<Response>(done=>resolve=done);return{promise,resolve};};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(async()=>{vi.resetModules();market=await import('../src/receiz/public-market');({usePublicQuotes}=await import('../src/receiz/usePublicQuotes'));});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('shares the existing Market quote request and one decode with a Ledger consumer, retaining only public quote operands',async()=>{
 const pending=deferred(),fetcher=vi.fn<typeof fetch>(()=>pending.promise);vi.stubGlobal('fetch',fetcher);const first=new AbortController(),second=new AbortController();
 const a=market.fetchPublicQuotes(first.signal),b=market.preparePublicQuotes(second.signal),response=Response.json({...snapshot(),custody:{secret:'never'},data:{...snapshot().data,liveMarkets:[{...snapshot().data.liveMarkets[0],owner:{private:'never'},custody:'never'}]}}),json=vi.spyOn(response,'json');
 first.abort();await expect(a).rejects.toMatchObject({name:'AbortError'});expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);pending.resolve(response);await b;
 expect(fetcher).toHaveBeenCalledOnce();expect(json).toHaveBeenCalledOnce();expect(JSON.stringify(market.readRetainedPublicQuotes())).not.toContain('never');
 await market.preparePublicQuotes();expect(fetcher).toHaveBeenCalledOnce();
});
it('keeps afterTrade cache bypass and fences older normal and older trade replies',async()=>{
 const requests=[deferred(),deferred(),deferred()];let request=0;
 const fetcher=vi.fn<typeof fetch>(()=>requests[request++].promise);vi.stubGlobal('fetch',fetcher);
 const normal=market.fetchPublicQuotes(),a=market.fetchPublicQuotes(undefined,nonceA),b=market.fetchPublicQuotes(undefined,nonceB),ledger=market.preparePublicQuotes();
 expect(fetcher.mock.calls.map(([url])=>url)).toEqual(['/api/bank/public-market/quotes','/api/bank/public-market/quotes?afterTrade='+nonceA,'/api/bank/public-market/quotes?afterTrade='+nonceB]);
 requests[2].resolve(Response.json(snapshot(30)));await Promise.all([b,ledger]);requests[1].resolve(Response.json(snapshot(20)));requests[0].resolve(Response.json(snapshot(10)));const oldResults=await Promise.all([normal,a]);expect(oldResults.map(value=>(value as any).data.liveMarkets[0].priceUsd)).toEqual([30,30]);
 expect((market.readRetainedPublicQuotes()?.snapshot as any).data.liveMarkets[0].priceUsd).toBe(30);
});
it('retains the last accepted quote on failure, retries the real trade nonce, and rejects older source coordinates',async()=>{
 let call=0;vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>{call++;if(call===2)return new Response('',{status:503});return Response.json(snapshot(call===1?30:10,call===1?'2026-11-04T16:00:00Z':'2026-11-04T15:00:00Z'));}));
 await market.fetchPublicQuotes();await expect(market.fetchPublicQuotes(undefined,nonceA)).rejects.toThrow();await market.fetchPublicQuotes();
 expect((fetch as any).mock.calls[2][0]).toContain('?afterTrade='+nonceA);expect((market.readRetainedPublicQuotes()?.snapshot as any).data.liveMarkets[0].priceUsd).toBe(30);
});
it('aborts an abandoned read without accepting its late callback and allows a new read',async()=>{
 const old=deferred(),fetcher=vi.fn<typeof fetch>().mockReturnValueOnce(old.promise).mockResolvedValueOnce(Response.json(snapshot(20)));vi.stubGlobal('fetch',fetcher);const controller=new AbortController(),pending=market.fetchPublicQuotes(controller.signal);controller.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});
 await market.fetchPublicQuotes();old.resolve(Response.json(snapshot(10)));await new Promise(done=>setTimeout(done,0));expect((market.readRetainedPublicQuotes()?.snapshot as any).data.liveMarkets[0].priceUsd).toBe(20);
});
it('reuses retained Market quotes on Ledger entry and performs no periodic work while inactive',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json(snapshot()));vi.stubGlobal('fetch',fetcher);await market.fetchPublicQuotes();vi.useFakeTimers();const root=createRoot(document.createElement('div'));let held:unknown;function Probe({active}:{active:boolean}){held=usePublicQuotes(active);return null;}
 try{await act(async()=>root.render(<Probe active/>));expect(held).toBe(market.readRetainedPublicQuotes()?.snapshot);expect(fetcher).toHaveBeenCalledOnce();await act(async()=>root.render(<Probe active={false}/>));await act(async()=>vi.advanceTimersByTimeAsync(180000));expect(fetcher).toHaveBeenCalledOnce();}finally{act(()=>root.unmount());}
});

it('keeps server pulse ordering even when a later request carries a newer wall time',async()=>{
 const a={...snapshot(30),data:{...snapshot(30).data,serverPulse:'14989047'}},b={...snapshot(10,'2026-11-04T16:00:00Z'),data:{...snapshot(10,'2026-11-04T16:00:00Z').data,serverPulse:'14989046'}};
 vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(a)).mockResolvedValueOnce(Response.json(b)));await market.fetchPublicQuotes();const result=await market.fetchPublicQuotes();expect((result as any).data.serverPulse).toBe('14989047');expect((market.readRetainedPublicQuotes()?.snapshot as any).data.liveMarkets[0].priceUsd).toBe(30);
});

it('retains dated observations when a newer response loses its source coordinate',async()=>{
 const missing=snapshot(10)as any;delete missing.data.generatedAt;vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot(30))).mockResolvedValueOnce(Response.json(missing)));await market.fetchPublicQuotes();const result=await market.fetchPublicQuotes();expect((result as any).data.liveMarkets[0].priceUsd).toBe(30);
});

it('refreshes a held quote after a backward device clock change',async()=>{
 vi.useFakeTimers();vi.setSystemTime(100000);const fetcher=vi.fn<typeof fetch>(async()=>Response.json(snapshot()));vi.stubGlobal('fetch',fetcher);await market.fetchPublicQuotes();vi.setSystemTime(99000);await market.preparePublicQuotes();expect(fetcher).toHaveBeenCalledTimes(2);
});
