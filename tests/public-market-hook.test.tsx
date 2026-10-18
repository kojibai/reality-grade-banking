// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePublicMarket } from '../src/receiz/usePublicMarket';
import { parsePublicMarket } from '../src/receiz/public-market';
const network = vi.hoisted(() => ({ membership: vi.fn(), quotes: vi.fn() }));
vi.mock('../src/receiz/public-market', async original => ({ ...await original<typeof import('../src/receiz/public-market')>(), fetchPublicMarket: network.membership, fetchPublicQuotes: network.quotes }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { network.membership.mockReset(); network.quotes.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const sourceInput = (items = ['a', 'b'], complete = true) => ({ ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: complete ? 'canonical-complete' : 'partial', isComplete: complete, itemCount: items.length, revision: 'r1' }, publicOriginals: items.map(id => ({ id, receizId: id, title: id, valueUsd: 10 })) } });
const quoteInput = (priceUsd = 10) => ({ ok: true, data: { schema: 'receiz.market.public-snapshot.v1', generatedAt: '2026-10-13T12:00:00Z', liveMarkets: [{ itemId: 'a', visibility: 'public', priceUsd, quoteUsdPerPhi: 1, chart: [{ value: 9 }, { value: priceUsd }] }] } });
async function observe(run: (read: () => ReturnType<typeof usePublicMarket>) => Promise<void>) {
  let state!: ReturnType<typeof usePublicMarket>; const root = createRoot(document.createElement('div'));
  function Probe() { state = usePublicMarket(); return null; }
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
  try { await act(async () => { root.render(<Probe />); }); await run(() => state); } finally { act(() => root.unmount()); }
}
it('retains the complete public collection after an incomplete refresh', async () => {
  network.membership.mockResolvedValueOnce(parsePublicMarket(sourceInput())).mockResolvedValueOnce(parsePublicMarket(sourceInput(['a'], false)));
  network.quotes.mockResolvedValue(quoteInput());
  await observe(async read => { expect(read().catalog?.items).toHaveLength(2); await act(async () => { await read().refresh(); }); expect(read().catalog?.items).toHaveLength(2); expect(read().status).toBe('stale'); });
});
it('marks retained quotes stale when their read fails or returns an invalid shape', async () => {
  network.membership.mockResolvedValue(parsePublicMarket(sourceInput()));
  network.quotes.mockResolvedValueOnce(quoteInput()).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ ok: true, data: {} });
  await observe(async read => { await act(async () => { await read().refresh(); }); expect(read().quoteStatus).toBe('stale'); await act(async () => { await read().refresh(); }); expect(read().quoteStatus).toBe('stale'); });
});
it('updates known public quotes even when membership is temporarily unavailable', async () => {
  network.membership.mockResolvedValueOnce(parsePublicMarket(sourceInput())).mockRejectedValueOnce(new Error('Unavailable'));
  network.quotes.mockResolvedValueOnce(quoteInput()).mockResolvedValueOnce(quoteInput(28));
  await observe(async read => { await act(async () => { await read().refresh(); }); expect(read().catalog?.items[0].priceUsd).toBe(28); expect(read().status).toBe('stale'); });
});
it('applies available object quotes without waiting for an unrelated card inventory response',async()=>{
 network.membership.mockResolvedValue(parsePublicMarket(sourceInput()));network.quotes.mockResolvedValue(quoteInput(28));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/api/bank/public-market/sports'?new Promise<Response>(()=>{}):new Response('',{status:404})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items[0].chart).toEqual([9,28]);expect(state.quoteStatus).toBe('fresh');expect(state.sportsStatus).toBe('loading');}finally{act(()=>root.unmount());}
});
it('continues refreshing membership and quotes while an earlier card request is still pending',async()=>{
 network.membership.mockResolvedValue(parsePublicMarket(sourceInput()));network.quotes.mockResolvedValueOnce(quoteInput(28)).mockResolvedValue(quoteInput(42));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/api/bank/public-market/sports'?new Promise<Response>(()=>{}):new Response('',{status:404})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));await act(async()=>state.refresh());expect(state.catalog?.items[0].priceUsd).toBe(42);expect(state.catalog?.items[0].chart).toEqual([9,42]);}finally{act(()=>root.unmount());}
});
it('retains previously obtained public charts until refreshed quotes arrive', async () => {
  const input = { ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: 1, revision: 'r1' }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', valueUsd: 10 }] } };
  const seed = { ...input, snapshot: { ok: true, data: { schema: 'receiz.market.public-snapshot.v1', liveMarkets: [{ itemId: 'a', visibility: 'public', priceUsd: 10, quoteUsdPerPhi: 1, chart: [{ value: 9 }, { value: 10 }] }] } } };
  let resolveMembership!: (value: ReturnType<typeof parsePublicMarket>) => void;
  let resolveQuotes!: (value: unknown) => void;
  network.membership.mockImplementation(() => new Promise(resolve => { resolveMembership = resolve; }));
  network.quotes.mockImplementation(() => new Promise(resolve => { resolveQuotes = resolve; }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(seed))));
  let observed: ReturnType<typeof usePublicMarket> | undefined;
  const host = document.createElement('div'), root = createRoot(host);
  function Probe() { observed = usePublicMarket(); return null; }
  try {
    await act(async () => { root.render(<Probe />); });
    expect(observed?.catalog?.items[0].chart).toEqual([9, 10]);
    await act(async () => { resolveMembership(parsePublicMarket(input)); });
    expect(observed?.catalog?.items[0].chart).toEqual([9, 10]);
    await act(async () => { resolveQuotes(seed.snapshot); });
    expect(observed?.status).toBe('live');
  } finally { act(() => root.unmount()); }
});
it('adds source-bound reading availability to an older retained catalog without replacing its quote',async()=>{
 const row={id:'a',receizId:'a',title:'A',valueUsd:10,verifyHref:'/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',profileOriginal:{media:{originalDownloadSha256Hex:'a'.repeat(64)}}};
 const old={ok:true,transport:{publicOriginals:[row]}},seed={ok:true,transport:{publicOriginals:[{...row,valueUsd:999,profileOriginal:{...row.profileOriginal,hasLongForm:true}}]}};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(old));network.membership.mockImplementation(()=>new Promise(()=>{}));network.quotes.mockImplementation(()=>new Promise(()=>{}));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/receiz-public-market.json'?Response.json(seed):new Response('',{status:404})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items[0].hasLongForm).toBe(true);expect(state.catalog?.items[0].priceUsd).toBe(10);}finally{act(()=>root.unmount());}
});
it('upgrades retained objects with source-bound pricing operands from the new offline collection',async()=>{
 const row={id:'a',receizId:'a',title:'A',valueUsd:10,pulse:'14700000',profileOriginal:{hasLongForm:true}};
 const seed={kind:'sigil',claimPulse:14700000,beat:2,stepIndex:3,creatorVerified:true};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({ok:true,transport:{publicOriginals:[row]}}));
 network.membership.mockImplementation(()=>new Promise(()=>{}));network.quotes.mockImplementation(()=>new Promise(()=>{}));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/receiz-public-market.json'?Response.json({ok:true,transport:{publicOriginals:[{...row,valueUsd:999,livePulseSeed:seed}]}}):new Response('',{status:503})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items[0].livePulseSeed).toEqual(seed);expect(state.catalog?.items[0].priceUsd).toBe(10);}finally{act(()=>root.unmount());}
});
