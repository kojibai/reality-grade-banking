import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const a='a'.repeat(64),b='b'.repeat(64);
const member=(revision:string,date:string)=>({ok:true,transport:{generatedAt:date,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision},publicOriginals:[{id:'one',receizId:'original-one',title:revision,profileOriginal:{media:null}}]}});
beforeEach(()=>vi.resetModules());
afterEach(()=>vi.unstubAllGlobals());
it('joins concurrent observations and reuses a304 without reading another collection body',async()=>{
 let release!:(value:Response)=>void;
 const fetcher=vi.fn<typeof fetch>(()=>new Promise(resolve=>{release=resolve;}));vi.stubGlobal('fetch',fetcher);
 const {observePublicMarketMembership}=await import('../src/receiz/public-market');
 const first=observePublicMarketMembership(a),other=observePublicMarketMembership(a);
 expect(other).toBe(first);expect(fetcher).toHaveBeenCalledOnce();
 expect(fetcher.mock.calls[0][1]?.headers).toEqual({'If-None-Match':'"'+a+'"'});
 release(new Response(null,{status:304}));expect(await first).toBeNull();
});
it('accepts a selected successor independently of its display timestamp and keeps a late older request out of the response cache',async()=>{
 let release!:(value:Response)=>void;
 const fetcher=vi.fn<typeof fetch>().mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}))
  .mockResolvedValueOnce(Response.json(member(b,'2026-01-01T00:00:00Z'),{headers:{etag:'"'+b+'"'}}))
  .mockResolvedValueOnce(new Response(null,{status:304}));vi.stubGlobal('fetch',fetcher);
 const {fetchPublicMarket}=await import('../src/receiz/public-market');
 const earlier=fetchPublicMarket(undefined,''),newer=await fetchPublicMarket(undefined,'');
 expect(newer.revision).toBe(b);
 release(Response.json(member(a,'2026-11-09T00:00:00Z'),{headers:{etag:'"'+a+'"'}}));await earlier;
 expect((await fetchPublicMarket(undefined,'')).revision).toBe(b);
 expect(fetcher.mock.calls[2][1]?.headers).toEqual({'If-None-Match':'"'+b+'"'});
});
it('observes a changed public profile index when the Originals membership is unchanged',async()=>{
 const first={...member(a,'2026-11-13T22:00:00Z')},next={...member(a,'2026-11-13T22:01:00Z')};
 Object.assign(first.transport,{publicProfileHeadsRevision:a,publicProfileHeads:[]});
 Object.assign(next.transport,{publicProfileHeadsRevision:b,publicProfileHeads:[]});
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(first,{headers:{etag:'"first-family"'}})).mockResolvedValueOnce(Response.json(next,{headers:{etag:'"next-family"'}}));vi.stubGlobal('fetch',fetcher);
 const {fetchPublicMarket,observePublicMarketMembership}=await import('../src/receiz/public-market');
 await fetchPublicMarket(undefined,'');
 const accepted=await observePublicMarketMembership(a,a);
 expect(accepted?.revision).toBe(a);expect(accepted?.publicProfileHeadsRevision).toBe(b);
});
