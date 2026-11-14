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
