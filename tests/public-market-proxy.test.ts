import { afterEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicMarketMiddleware, resolvePublicMarketTarget } from '../server/public-market';
afterEach(() => vi.unstubAllGlobals());
it('allows only fixed public Receiz contracts with bounded query arguments', () => {
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership')?.href).toBe('https://receiz.com/api/market/public-membership');
  expect(resolvePublicMarketTarget('/api/bank/public-market/quotes')?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full');
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
  const fetchSource = vi.fn(async () => new Response(JSON.stringify({ ok: true, transport: { generatedAt: 'now', publicMembership: {}, wallet: { private: true }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', pulse:'14700000',livePulseSeed:{...livePulseSeed,unrelated:'omit-this-field'}, profileOriginal: { longForm: { text: 'Full work' }, media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original',material:{sealedArtifactSha256Hex:'d'.repeat(64),proofObjectUrl:coordinate} } } }] } }), { headers: { 'Content-Type': 'application/json' } }));
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
