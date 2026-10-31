import {expect,it,vi} from 'vitest';
import {createPublicReadingOriginalReader} from '../server/public-reading-source';
import {createPublicOriginalReader} from '../server/public-profile';
import {publicAssetReading,renderReadingDocument} from '../server/public-reading-document';
const fixture=()=>({ok:true,viewer:{profile:{userId:'public-account',username:'artist',isPrivate:false,email:'do-not-project@example.com'},originals:[{id:'source',showOnProfile:true,claim:'Exact work',marketPreview:{priceUsd:123,pricePhi:2.5,intrinsicPhi:2,quoteUsdPerPhi:49.2,premiumX:1.25,momentX:1.08,volumeUsd:100,holders:3,privateKey:'must-not-project'},media:{kind:'epub',name:'Public book',mime:'application/epub+zip',size:1234,sha256Hex:'a'.repeat(64),originalDownloadPriceCents:500,allowOriginalDownload:true,privateAccessToken:'must-not-project'}}]}});

it('retains complete public pricing and material metadata in the same response while the ordinary projection stays identical',async()=>{
 const fetchImpl=vi.fn(async()=>Response.json(fixture())) as unknown as typeof fetch;
 const regular=await createPublicOriginalReader(fetchImpl)('artist','source'),selected=await createPublicReadingOriginalReader(fetchImpl)('artist','source');expect(selected).not.toBeNull();
 const text=renderReadingDocument(publicAssetReading(selected!),'text');expect(text).toContain('"pricePhi": 2.5');expect(text).toContain('"quoteUsdPerPhi": 49.2');expect(text).toContain('"originalDownloadPriceCents": 500');expect(text).toContain('Public book');expect(text).not.toContain('must-not-project');expect(text).not.toContain('do-not-project@example.com');
 const {readingPricing,readingMedia,...same}=selected!;expect(readingPricing).toBeDefined();expect(readingMedia).toBeDefined();expect(same).toEqual(regular);expect(fetchImpl).toHaveBeenCalledTimes(2);
 expect(vi.mocked(fetchImpl).mock.calls.every(([,init])=>init?.credentials==='omit'&&init.redirect==='error')).toBe(true);
});

it('coalesces concurrent HTML/text requests for the same public Original without retaining a stale visibility result',async()=>{
 let resolve!:(response:Response)=>void;const fetchImpl=vi.fn(()=>new Promise<Response>(done=>{resolve=done;})) as unknown as typeof fetch,read=createPublicReadingOriginalReader(fetchImpl);
 const first=read('artist','source'),second=read('artist','source');expect(fetchImpl).toHaveBeenCalledOnce();resolve(Response.json(fixture()));expect(await first).toEqual(await second);
 vi.mocked(fetchImpl).mockResolvedValueOnce(new Response(null,{status:404}));expect(await read('artist','source')).toBeNull();expect(fetchImpl).toHaveBeenCalledTimes(2);
});
