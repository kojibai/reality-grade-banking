import { afterEach, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicMarketMiddleware, resolvePublicMarketTarget } from '../server/public-market';
afterEach(() => vi.unstubAllGlobals());
it('allows only fixed public Receiz contracts with bounded query arguments', () => {
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership')?.href).toBe('https://receiz.com/api/market/public-membership');
  expect(resolvePublicMarketTarget('/api/bank/public-market/quotes')?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full');
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership?url=https://evil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/secret')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=https%3A%2F%2Fevil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=%2Fapi%2Fconnect%2Fwallet%2Fme')).toBeNull();
  const path = '/api/profile/originals/download?receizId=a1&kind=original';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`)?.pathname).toBe('/api/profile/originals/download');
  const materialPath = '/api/proof-material/packages/' + 'c'.repeat(64) + '/artifact';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(materialPath)}`)?.href).toBe('https://receiz.com' + materialPath);
  for (const bad of [materialPath + '?download=1', materialPath + '/extra', materialPath.replace('/artifact', '/manifest'), '/api/proof-material/packages/not-a-digest/artifact']) expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(bad)}`)).toBeNull();
});
it('resolves only a bounded public post coordinate to its read-only Moment carrier',()=>{
 const path='/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',route='/api/bank/public-market/record?path=';
 expect(resolvePublicMarketTarget(route+encodeURIComponent(path))?.href).toBe('https://receiz.com/api/receiz/download?a=cd412215&ms=1791828092396&p=14611069&c=0C19C291');
 for(const value of ['https://evil.example'+path,path+'&paymentSessionId=x',path+'&a=deadbeef',path.replace('cd412215','not-an-anchor'),path.replace('&ms=1791828092396','')])expect(resolvePublicMarketTarget(route+encodeURIComponent(value))).toBeNull();
});
it('reads only public GET data and never forwards cookies or bearer authority', async () => {
  const coordinate='/v/20261018_1200/AB12CD34/14700000#material=rmc1%3A'+'c'.repeat(64);
  const fetchSource = vi.fn(async () => new Response(JSON.stringify({ ok: true, transport: { generatedAt: 'now', publicMembership: {}, wallet: { private: true }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', profileOriginal: { longForm: { text: 'Full work' }, media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original',material:{sealedArtifactSha256Hex:'d'.repeat(64),proofObjectUrl:coordinate} } } }] } }), { headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchSource);
  let body = '', status = 0;
  const res = { setHeader: vi.fn(), writeHead: (code: number) => { status = code; }, end: (bytes: Uint8Array) => { body = new TextDecoder().decode(bytes); } } as unknown as ServerResponse;
  await publicMarketMiddleware({ method: 'GET', url: '/api/bank/public-market/membership', headers: { cookie: 'secret-cookie', authorization: 'Bearer secret' } } as IncomingMessage, res, vi.fn());
  expect(status).toBe(200);
  const options = fetchSource.mock.calls[0] as unknown as [URL, RequestInit];
  expect(options[0].origin).toBe('https://receiz.com'); expect(options[1].credentials).toBe('omit'); expect(options[1].redirect).toBe('error');
  expect(JSON.stringify(options[1])).not.toContain('secret'); expect(body).not.toContain('Full work'); expect(body).not.toContain('wallet');
  expect(JSON.parse(body).transport.publicOriginals[0].profileOriginal.media.material).toEqual({sealedArtifactSha256Hex:'d'.repeat(64),originalArtifactSrc:'https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact'});
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
