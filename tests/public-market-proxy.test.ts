import { afterEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicMarketMiddleware, resolvePublicMarketTarget } from '../server/public-market';
afterEach(() => vi.unstubAllGlobals());
it('preserves an Original download purchase refusal without forwarding upstream fields, credentials or caching it as a source',async()=>{
 const fetchSource=vi.fn<typeof fetch>(async()=>Response.json({ok:false,error:'payment_required',privateField:'do-not-copy'},{status:402}));vi.stubGlobal('fetch',fetchSource);
 const path='/api/profile/originals/download?receizId=creator-paid-image&kind=original',url='/api/bank/public-market/original?path='+encodeURIComponent(path);
 for(let attempt=0;attempt<2;attempt++){
  let status=0,body='';const response={setHeader:vi.fn(),writeHead:(value:number)=>{status=value;},end:(value:string)=>{body=value;}}as unknown as ServerResponse;
  await publicMarketMiddleware({method:'GET',url,headers:{cookie:'do-not-copy',authorization:'Bearer do-not-copy'}}as IncomingMessage,response,vi.fn());
  expect(status).toBe(402);expect(JSON.parse(body)).toEqual({ok:false,error:'original_purchase_required'});expect(body).not.toContain('do-not-copy');
 }
 expect(fetchSource).toHaveBeenCalledTimes(2);expect(fetchSource.mock.calls[0]?.[1]).toMatchObject({credentials:'omit',redirect:'error'});
 let status=0;await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/quotes',headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:(code:number)=>{status=code;},end:vi.fn()}as unknown as ServerResponse,vi.fn());expect(status).toBe(503);
});
it('allows only fixed public Receiz contracts with bounded query arguments', () => {
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership')?.href).toBe('https://receiz.com/api/market/public-membership');
  expect(resolvePublicMarketTarget('/api/bank/public-market/quotes')?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full&projection=asset-quotes');
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership?url=https://evil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/secret')).toBeNull();
  const provenance='/api/bank/public-market/provenance?collectibleId=rsc_0123456789abcdef&claimHash='+'a'.repeat(64);
  expect(resolvePublicMarketTarget(provenance)?.href).toBe('https://receiz.com/api/game/sports/baseball/cards/rsc_0123456789abcdef/provenance?claimHash='+'a'.repeat(64));
  for(const value of [provenance+'&url=https://evil.test',provenance+'&claimHash='+'b'.repeat(64),provenance.replace('rsc_0123456789abcdef','invalid')])expect(resolvePublicMarketTarget(value)).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=https%3A%2F%2Fevil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=%2Fapi%2Fconnect%2Fwallet%2Fme')).toBeNull();
  const path = '/api/profile/originals/download?receizId=a1&kind=original';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`)?.pathname).toBe('/api/profile/originals/download');
  const materialPath = '/api/proof-material/packages/' + 'c'.repeat(64) + '/artifact';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(materialPath)}`)?.href).toBe('https://receiz.com' + materialPath);
  for (const bad of [materialPath + '?download=1', materialPath + '/extra', materialPath.replace('/artifact', '/manifest'), '/api/proof-material/packages/not-a-digest/artifact']) expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(bad)}`)).toBeNull();
});
it('curates only exact public card history metadata without forwarding private authority',async()=>{
 const cardId='rsc_0123456789abcdef',claimHash='a'.repeat(64),fetchSource=vi.fn<typeof fetch>(async()=>Response.json({ok:true,cardId,claimHash,count:1,privateSession:'do-not-copy',provenance:[{collectibleId:cardId,claimHash,eventKind:'issue',appendHash:'b'.repeat(64),occurredAt:'2026-10-01T12:00:00Z',owner:{username:'public',displayName:'Public',userId:'do-not-copy',email:'do-not-copy'},append:{secret:'do-not-copy'}}]}));
 vi.stubGlobal('fetch',fetchSource);let status=0,body='';const response={setHeader:vi.fn(),writeHead:(value:number)=>{status=value;},end:(value:Uint8Array)=>{body=new TextDecoder().decode(value);}}as unknown as ServerResponse;
 await publicMarketMiddleware({method:'GET',url:`/api/bank/public-market/provenance?collectibleId=${cardId}&claimHash=${claimHash}`,headers:{authorization:'Bearer do-not-copy'}}as IncomingMessage,response,vi.fn());
 expect(status).toBe(200);expect(JSON.parse(body).provenance[0].owner).toEqual({username:'public',displayName:'Public'});expect(body).not.toContain('do-not-copy');expect(fetchSource.mock.calls[0]?.[1]).toMatchObject({credentials:'omit',redirect:'error'});
});
it('resolves only a bounded public post coordinate to its read-only Moment carrier',()=>{
 const path='/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',route='/api/bank/public-market/record?path=';
 expect(resolvePublicMarketTarget(route+encodeURIComponent(path))?.href).toBe('https://receiz.com/api/receiz/download?a=cd412215&ms=1791828092396&p=14611069&c=0C19C291');
 for(const value of ['https://evil.example'+path,path+'&paymentSessionId=x',path+'&a=deadbeef',path.replace('cd412215','not-an-anchor'),path.replace('&ms=1791828092396','')])expect(resolvePublicMarketTarget(route+encodeURIComponent(value))).toBeNull();
});
it('reads only public GET data and never forwards cookies or bearer authority', async () => {
  const coordinate='/v/20261018_1200/AB12CD34/14700000#material=rmc1%3A'+'c'.repeat(64);
  const livePulseSeed={kind:'sigil',claimPulse:14700000,beat:2,stepIndex:3,creatorVerified:true,kaiSignature:'alice',userPhiKey:'public-object-model'};
  const artworkUrl='https://receiz.com/api/profile/originals/media?receizId=a&slot=audioCover',proof={circuit:'Poseidon',groth16Id:'groth16-public',poseidon:'proof-public'},attachment={id:'proof-row',name:'Proof row',src:'/v/20261018_1200/AB12CD34/14700000',downloadName:'source.txt',sha256Hex:'e'.repeat(64)};
  const fetchSource = vi.fn(async () => new Response(JSON.stringify({ ok: true, transport: { generatedAt: 'now', publicMembership: {}, wallet: { private: true }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', ownerAvatarUrl:'https://receiz.com/artwork/alice.png',pulse:'14700000',livePulseSeed:{...livePulseSeed,unrelated:'omit-this-field'}, profileOriginal: { code:'AB12CD34',pulse:'14700000',verifyPath:coordinate,proof:{...proof,privateSession:'omit-this-field'},claimHashHex:'f'.repeat(64),pbiReceiptHash:'1'.repeat(64),attachments:[{...attachment,privateSession:'omit-this-field'}],longForm: { text: 'Full work' }, media: { kind:'audio',audioDistribution:{releaseTitle:'Actual release title',privateSession:'omit-this-field'},audioCoverSrc:artworkUrl,videoPosterSrc:'https://private.example/omit-this-field',sha256Hex:'c'.repeat(64),originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original',material:{sealedArtifactSha256Hex:'d'.repeat(64),proofObjectUrl:coordinate} } } }] } }), { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchSource);
  let body = '', status = 0;
  const res = { setHeader: vi.fn(), writeHead: (code: number) => { status = code; }, end: (bytes: Uint8Array) => { body = new TextDecoder().decode(bytes); } } as unknown as ServerResponse;
  await publicMarketMiddleware({ method: 'GET', url: '/api/bank/public-market/membership', headers: { cookie: 'secret-cookie', authorization: 'Bearer secret' } } as IncomingMessage, res, vi.fn());
  expect(status).toBe(200);
  const options = fetchSource.mock.calls[0] as unknown as [URL, RequestInit];
  expect(options[0].origin).toBe('https://receiz.com'); expect(options[1].credentials).toBe('omit'); expect(options[1].redirect).toBe('error');
  expect(JSON.stringify(options[1])).not.toContain('secret'); expect(body).not.toContain('Full work'); expect(body).not.toContain('wallet');
  expect(JSON.parse(body).transport.publicOriginals[0].profileOriginal.media.material).toEqual({sealedArtifactSha256Hex:'d'.repeat(64),originalArtifactSrc:'https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact'});
  expect(JSON.parse(body).transport.publicOriginals[0].livePulseSeed).toEqual(livePulseSeed);
  expect(JSON.parse(body).transport.publicOriginals[0].profileOriginal.mediaKind).toBe('audio');
  expect(JSON.parse(body).transport.publicOriginals[0].title).toBe('Actual release title');
  expect(JSON.parse(body).transport.publicOriginals[0].ownerAvatarUrl).toBe('https://receiz.com/artwork/alice.png');
  expect(JSON.parse(body).transport.publicOriginals[0].profileOriginal).toMatchObject({artworkUrl,code:'AB12CD34',pulse:'14700000',verifyPath:coordinate,proof,claimHashHex:'f'.repeat(64),pbiReceiptHash:'1'.repeat(64),attachments:[attachment],media:{sha256Hex:'c'.repeat(64)}});
  expect(body).not.toContain('omit-this-field');
});
it.each(['original','record'])('relays complete %s carrier bytes without interpreting them as discovery JSON',async(kind)=>{
 const bytes=new Uint8Array([137,80,78,71,255]),fetchSource=vi.fn<typeof fetch>(async()=>new Response(bytes,{headers:{'Content-Type':'image/png'}}));vi.stubGlobal('fetch',fetchSource);
 let status=0,body:Uint8Array|undefined;const res={setHeader:vi.fn(),writeHead:(code:number)=>{status=code;},end:(value:Uint8Array)=>{body=value;}}as unknown as ServerResponse;
 const path=kind==='original'?'/api/proof-material/packages/'+'c'.repeat(64)+'/artifact':'/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396';
 await publicMarketMiddleware({method:'GET',url:`/api/bank/public-market/${kind}?path=${encodeURIComponent(path)}`,headers:{cookie:'private',authorization:'Bearer private'}}as IncomingMessage,res,vi.fn());
 expect(status).toBe(200);expect(body).toEqual(bytes);expect(String(fetchSource.mock.calls[0]?.[0])).toBe(kind==='original'?'https://receiz.com'+path:'https://receiz.com/api/receiz/download?a=cd412215&ms=1791828092396&p=14611069&c=0C19C291');
 expect(fetchSource.mock.calls[0]?.[1]).toMatchObject({credentials:'omit',redirect:'error'});
});
it('rejects mutation methods before contacting Receiz', async () => {
  const fetchSource = vi.fn(); vi.stubGlobal('fetch', fetchSource); let status = 0;
  const res = { setHeader: vi.fn(), writeHead: (code: number) => { status = code; }, end: vi.fn() } as unknown as ServerResponse;
  await publicMarketMiddleware({ method: 'POST', url: '/api/bank/public-market/membership' } as IncomingMessage, res, vi.fn());
  expect(status).toBe(405); expect(fetchSource).not.toHaveBeenCalled();
});
it('carries exact per-copy sealed values and only public owner names through sports discovery',async()=>{
 const copy={collectibleId:'rsc_1123456789abcdef',claimHash:'b'.repeat(64),sealedAt:'2026-10-01T12:00:00Z',birthUsdValue:10,proofValueUsd:20,currentValueUsd:21,ownerUsername:'current_holder',ownerDisplayName:'Current Holder',ownerUserId:'private-account',email:'private-email'};
 const sealedBirthsObservedAt='2026-10-19T12:00:00Z',birth={...copy,proofValueUsd:undefined,currentValueUsd:undefined};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:true,schema:'receiz.sports_economy.live_inventory.v1',sealedBirthsObservedAt,cards:[{collectibleId:copy.collectibleId,claimHash:copy.claimHash,cardId:'one',proofValueUsd:20,sealedCopies:[copy],sealedBirths:[birth]}]})));
 let body='';const res={setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse;
 await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/sports',headers:{}}as IncomingMessage,res,vi.fn());
 const result=JSON.parse(body),card=result.cards[0];expect(card.sealedCopies[0]).toMatchObject({sealedAt:copy.sealedAt,birthUsdValue:10,ownerUsername:'current_holder'});expect(card.valuationRow.sealedCopies[0]).not.toHaveProperty('ownerUsername');expect(body).not.toContain('private-');
 expect(result.sealedBirthsObservedAt).toBe(sealedBirthsObservedAt);expect(card.sealedBirths[0]).toMatchObject({sealedAt:copy.sealedAt,birthUsdValue:10,ownerUsername:'current_holder'});expect(card.valuationRow.sealedBirths[0]).toEqual({collectibleId:copy.collectibleId,claimHash:copy.claimHash,sealedAt:copy.sealedAt,birthUsdValue:10});
});
it('keeps native public card artwork in the existing sports response without forwarding private fields or another read',async()=>{
 vi.resetModules();const {publicMarketMiddleware:freshMiddleware}=await import('../server/public-market');
 const imageUrl='/api/game/sports/baseball/player-image/694819',fetcher=vi.fn(async()=>Response.json({ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId:'rsc_abcdef0123456789',claimHash:'f'.repeat(64),imageUrl,privateAccount:'never-forward'}]}));vi.stubGlobal('fetch',fetcher);
 let body='';await freshMiddleware({method:'GET',url:'/api/bank/public-market/sports',headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());
 expect(JSON.parse(body).cards[0].imageUrl).toBe('https://receiz.com'+imageUrl);expect(body).not.toContain('never-forward');expect(fetcher).toHaveBeenCalledOnce();
});
it('keeps the native public card face and reverse fields in the same response without copying arbitrary fields',async()=>{
 vi.resetModules();const {publicMarketMiddleware:freshMiddleware}=await import('../server/public-market');
 const collectibleId='rsc_abcdef0123456789',claimHash='f'.repeat(64),fetcher=vi.fn(async()=>Response.json({ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId,claimHash,athlete:'Public athlete',sport:'baseball',rarity:'Rare',issueLine:'#2 / 10 issued',pulledFromPack:'Opening Pack',card:{position:'Pitcher',rating:94,teamCode:'NYY',projectedScore:12.5,currentScore:0,baseCard:{sealedCardId:'rsc_mlb_694819',basisHash:'a'.repeat(64)},playerBio:{bats:'Right',height:'6 ft 2',privateEmail:'never-forward'},media:{source:'mlb',sourceId:'694819',deterministicAssetId:'sports.mlb.card_media.694819.v1'},privateSession:'never-forward'},privateAccount:'never-forward'}]}));vi.stubGlobal('fetch',fetcher);
 let body='';await freshMiddleware({method:'GET',url:'/api/bank/public-market/sports',headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());
 const presentation=JSON.parse(body).cards[0].presentation;
 expect(presentation).toMatchObject({collectibleId,claimHash});
 expect(presentation.facts).toEqual(expect.arrayContaining([{label:'Position',value:'Pitcher'},{label:'Rating',value:'94'},{label:'Base seal',value:'rsc_mlb_694819'},{label:'Height',value:'6 ft 2'},{label:'Pack',value:'Opening Pack'}]));
 expect(body).not.toContain('never-forward');expect(fetcher).toHaveBeenCalledOnce();
});
it('uses a bounded publication hint to bypass a stale membership response without forwarding the hint upstream',async()=>{
 const digest='9'.repeat(64),url='/api/bank/public-market/membership?afterPublication='+digest;
 expect(resolvePublicMarketTarget(url)?.href).toBe('https://receiz.com/api/market/public-membership');
 for(const bad of [url+'&afterPublication='+digest,url+'&url=https://evil.test',url.replace(digest,'not-a-digest')])expect(resolvePublicMarketTarget(bad)).toBeNull();
 const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[]}})).mockResolvedValue(Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[{id:'publication-new',receizId:'publication-new',title:'A new work'}]}}));vi.stubGlobal('fetch',fetcher);
 const request=async(path:string)=>{let body='';await publicMarketMiddleware({method:'GET',url:path,headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());return JSON.parse(body);};
 await request('/api/bank/public-market/membership?afterPublication='+'8'.repeat(64));await request('/api/bank/public-market/membership');const fresh=await request(url);expect(fresh.transport.publicOriginals[0].id).toBe('publication-new');expect(fetcher.mock.calls.at(-1)?.[0].toString()).toBe('https://receiz.com/api/market/public-membership');expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({cache:'no-store'});
});
it('allows a bounded post-trade freshness reference without widening the upstream destination',async()=>{
 const nonce='10000000-0000-4000-8000-000000000001',path='/api/bank/public-market/quotes?afterTrade='+nonce;
 expect(resolvePublicMarketTarget(path)?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full&projection=asset-quotes&afterTrade='+nonce);
 for(const bad of [path+'&afterTrade='+nonce,path+'&url=https://other.test',path.replace(nonce,'not-a-reference')])expect(resolvePublicMarketTarget(bad)).toBeNull();
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}}));vi.stubGlobal('fetch',fetcher);
 await publicMarketMiddleware({method:'GET',url:path,headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:vi.fn()}as unknown as ServerResponse,vi.fn());
 expect(fetcher.mock.calls[0]?.[1]).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});
});
it('publishes fresh post-trade quotes into the same normal quote cache entry',async()=>{
 const nonce='20000000-0000-4000-8000-000000000001',fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'post-trade-asset',priceUsd:88}]}}));vi.stubGlobal('fetch',fetcher);
 const request=async(url:string)=>{let body='';await publicMarketMiddleware({method:'GET',url,headers:{}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(v:Uint8Array)=>{body=new TextDecoder().decode(v);}}as unknown as ServerResponse,vi.fn());return JSON.parse(body);};
 await request('/api/bank/public-market/quotes?afterTrade='+nonce);fetcher.mockClear();const result=await request('/api/bank/public-market/quotes');expect(result.data.liveMarkets[0].priceUsd).toBe(88);expect(fetcher).not.toHaveBeenCalled();
});

it('carries bounded public lyrics in the existing membership response without private fields or another request',async()=>{const longForm={title:'Song lyrics',text:'Every word\nAlready carried',sha256Hex:'a'.repeat(64)},fetchSource=vi.fn(async()=>Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[{id:'song',receizId:'song',title:'Song',profileOriginal:{longForm:{...longForm,privateField:'omit-this-field'},media:{kind:'audio'}}}]}}));vi.stubGlobal('fetch',fetchSource);let body='';await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/membership?afterPublication='+'f'.repeat(64),headers:{cookie:'secret'}}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());expect(JSON.parse(body).transport.publicOriginals[0].profileOriginal.longForm).toEqual(longForm);expect(body).not.toContain('omit-this-field');expect(fetchSource).toHaveBeenCalledTimes(1);});
