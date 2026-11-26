import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.restoreAllMocks();vi.resetModules();});
it.each([503,544,429])('classifies HTTP %s as transient delivery failure without accepting an older collection',async status=>{
 vi.resetModules();vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(null,{status}));
 const {readReceizPublicMarketSource}=await import('../server/public-market');
 await expect(readReceizPublicMarketSource('membership',undefined,{fresh:true})).rejects.toMatchObject({code:'PUBLIC_MARKET_SOURCE_UNAVAILABLE',status,transient:true});
});
it('keeps a permanent source refusal distinct from transient build retry',async()=>{
 vi.resetModules();vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(null,{status:403}));
 const {readReceizPublicMarketSource}=await import('../server/public-market');
 await expect(readReceizPublicMarketSource('membership',undefined,{fresh:true})).rejects.toMatchObject({status:403,transient:false});
});

it('reuses the held production membership only after Receiz confirms the exact selected revision', async () => {
 const revision='a'.repeat(64),etag='"'+revision+'"';
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(null,{status:304,headers:{etag,'x-receiz-public-material-revision':revision}}));
 vi.stubGlobal('fetch',fetcher);
 const {readReceizPublicMarketSource}=await import('../server/public-market');
 await expect(readReceizPublicMarketSource('membership',undefined,{fresh:true,heldRevision:revision})).resolves.toBeNull();
 expect(fetcher).toHaveBeenCalledOnce();
 expect(String(fetcher.mock.calls[0][0])).toBe('https://receiz.com/api/market/public-membership?representation=selected');
 expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('If-None-Match')).toBe(etag);
});

it('does not treat an unavailable selection or mismatched 304 as confirmation of held production input', async () => {
 const revision='b'.repeat(64), other='c'.repeat(64);
 vi.stubGlobal('fetch',vi.fn<typeof fetch>()
  .mockResolvedValueOnce(new Response(null,{status:503}))
  .mockResolvedValueOnce(new Response(null,{status:304,headers:{etag:'"'+revision+'"','x-receiz-public-material-revision':other}})));
 const {readReceizPublicMarketSource}=await import('../server/public-market');
 const request=()=>readReceizPublicMarketSource('membership',undefined,{fresh:true,heldRevision:revision});
 await expect(request()).rejects.toMatchObject({status:503,transient:true});
 await expect(request()).rejects.toThrow('Receiz did not confirm the held selection.');
});

it('keeps the native privacy refusal visible to the production builder', async () => {
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:503,
  headers:{'x-receiz-public-membership-refusal':'privacy-withdrawn'}})));
 const {readReceizPublicMarketSource}=await import('../server/public-market');
 await expect(readReceizPublicMarketSource('membership',undefined,{fresh:true,heldRevision:'f'.repeat(64)}))
  .rejects.toMatchObject({status:503,reason:'privacy-withdrawn'});
});
