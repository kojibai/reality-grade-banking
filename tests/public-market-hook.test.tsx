// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePublicMarket } from '../src/receiz/usePublicMarket';
import { parsePublicMarket } from '../src/receiz/public-market';
import {publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import {publicSportsValueRow} from '../src/receiz/market-projection/source';
import {fetchPublicSports} from '../src/receiz/public-sports';
const clock=vi.hoisted(()=>({pulse:14710100}));
vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse})}));
const network = vi.hoisted(() => ({ membership: vi.fn(), quotes: vi.fn() }));
vi.mock('../src/receiz/public-market', async original => ({ ...await original<typeof import('../src/receiz/public-market')>(), fetchPublicMarket: network.membership, fetchPublicQuotes: network.quotes }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { network.membership.mockReset(); network.quotes.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear();vi.useRealTimers();clock.pulse=14710100; });
const sourceInput = (items = ['a', 'b'], complete = true) => ({ ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: complete ? 'canonical-complete' : 'partial', isComplete: complete, itemCount: items.length, revision: 'r1' }, publicOriginals: items.map(id => ({ id, receizId: id, title: id, valueUsd: 10 })) } });
const quoteInput = (priceUsd = 10) => ({ ok: true, data: { schema: 'receiz.market.public-snapshot.v1', generatedAt: '2026-10-13T12:00:00Z', liveMarkets: [{ itemId: 'a', visibility: 'public', priceUsd, quoteUsdPerPhi: 1, chart: [{ value: 9 }, { value: priceUsd }] }] } });
it('retains carried album artwork across a thinner refresh of the exact same public artifact',async()=>{
 const row={id:'a',receizId:'a',title:'Album',pulse:'123',profileOriginal:{mediaKind:'audio',artworkUrl:'https://receiz.com/artwork/album.jpg',media:{originalDownloadSha256Hex:'a'.repeat(64)}}};
 const source={...sourceInput(['a']),transport:{...sourceInput(['a']).transport,publicOriginals:[row]}},thin={...source,transport:{...source.transport,publicOriginals:[{...row,profileOriginal:{...row.profileOriginal,artworkUrl:null}}]}};
 network.membership.mockResolvedValueOnce(parsePublicMarket(source)).mockResolvedValueOnce(parsePublicMarket(thin)).mockResolvedValueOnce(parsePublicMarket({...thin,transport:{...thin.transport,publicOriginals:[{...row,profileOriginal:{mediaKind:'audio',media:{originalDownloadSha256Hex:'b'.repeat(64)}}}]}}));network.quotes.mockResolvedValue(quoteInput());
 await observe(async read=>{expect(read().catalog?.items[0].artworkUrl).toBe('https://receiz.com/artwork/album.jpg');await act(async()=>read().refresh());expect(read().catalog?.items[0].artworkUrl).toBe('https://receiz.com/artwork/album.jpg');await act(async()=>read().refresh());expect(read().catalog?.items[0].artworkUrl).toBeNull();});
});
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
it('adds source-bound reading and media categories to an older retained catalog without replacing its quote',async()=>{
 const row={id:'a',receizId:'a',title:'A',valueUsd:10,verifyHref:'/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',profileOriginal:{media:{originalDownloadSha256Hex:'a'.repeat(64)}}};
 const old={ok:true,transport:{publicOriginals:[row]}},seed={ok:true,transport:{publicOriginals:[{...row,valueUsd:999,profileOriginal:{...row.profileOriginal,hasLongForm:true,mediaKind:'audio',artworkUrl:'https://receiz.com/artwork/album.jpg'}}]}};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(old));network.membership.mockImplementation(()=>new Promise(()=>{}));network.quotes.mockImplementation(()=>new Promise(()=>{}));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/receiz-public-market.json'?Response.json(seed):new Response('',{status:404})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items[0].hasLongForm).toBe(true);expect(state.catalog?.items[0].mediaKind).toBe('audio');expect(state.catalog?.items[0].artworkUrl).toBe('https://receiz.com/artwork/album.jpg');expect(state.catalog?.items[0].priceUsd).toBe(10);}finally{act(()=>root.unmount());}
});
it('upgrades retained objects with source-bound pricing operands from the new offline collection',async()=>{
 const row={id:'a',receizId:'a',title:'A',valueUsd:10,pulse:'14700000',profileOriginal:{hasLongForm:true}};
 const seed={kind:'sigil',claimPulse:14700000,beat:2,stepIndex:3,creatorVerified:true};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({ok:true,transport:{publicOriginals:[row]}}));
 network.membership.mockImplementation(()=>new Promise(()=>{}));network.quotes.mockImplementation(()=>new Promise(()=>{}));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/receiz-public-market.json'?Response.json({ok:true,transport:{publicOriginals:[{...row,valueUsd:999,livePulseSeed:seed}]}}):new Response('',{status:503})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items[0].livePulseSeed).toEqual(seed);expect(state.catalog?.items[0].priceUsd).toBe(publicSigilQuoteAtPulse(seed,clock.pulse).priceUsd);}finally{act(()=>root.unmount());}
});
it('advances retained object prices locally while every refresh fails',async()=>{
 vi.useFakeTimers();const seed={kind:'sigil',claimPulse:1000000,beat:12,stepIndex:3,creatorVerified:true},input=sourceInput(['a']);
 Object.assign(input.transport.publicOriginals[0],{pulse:'1000000',livePulseSeed:seed});
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(input));network.membership.mockRejectedValue(Error('offline'));network.quotes.mockRejectedValue(Error('offline'));
 await observe(async read=>{
  const first=read().catalog!.items[0];expect(first.localValuationPulse).toBe(clock.pulse);expect(first.priceUsd).toBe(publicSigilQuoteAtPulse(seed,clock.pulse).priceUsd);expect(read().status).toBe('stale');
  const reads=network.membership.mock.calls.length,basis=read().historyCatalog;clock.pulse++;await act(async()=>vi.advanceTimersByTimeAsync(1000));
  expect(read().catalog!.items[0].localValuationPulse).toBe(clock.pulse);expect(read().catalog!.items[0].priceUsd).toBe(publicSigilQuoteAtPulse(seed,clock.pulse).priceUsd);expect(read().catalog!.items[0].priceUsd).not.toBe(first.priceUsd);expect(network.membership).toHaveBeenCalledTimes(reads);expect(read().historyCatalog).toBe(basis);
 });
});
const sealedCard=()=>{
 const collectibleId='rsc_0123456789abcdef',claimHash='a'.repeat(64),sealedAt='2026-10-01T12:00:00Z';
 const raw={collectibleId,claimHash,cardId:'public-card',athlete:'Athlete',sport:'baseball',issuedCount:1,vaultCount:1,pricedCount:1,liveValueUsd:25,totalValueUsd:25,proofValueUsd:20,proofTotalValueUsd:20,route:`/game/sports/card/${collectibleId}?claimHash=${claimHash}`,sealedCopies:[{collectibleId,claimHash,sealedAt,birthUsdValue:10,proofValueUsd:20,currentValueUsd:25,ownerUsername:'holder',ownerDisplayName:'Holder'}]};
 return {...raw,valuationRow:publicSportsValueRow(raw)};
};
it('does not overwrite retained exact sports metadata with a fallback or matching metadata-poor response',async()=>{
 const card=sealedCard(),exact={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[card]},weak={...exact,cards:[{...card,sealedCopies:undefined,valuationRow:{...card.valuationRow,sealedCopies:undefined}}]};
 for(const fallback of [true,false]){
  localStorage.setItem('receiz-bank-public-sports-v1',JSON.stringify(exact));vi.stubGlobal('fetch',vi.fn(async()=>Response.json({...weak,fallback})));
  await fetchPublicSports();const held=JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1')!);expect(held.cards[0].valuationRow.sealedCopies[0].sealedAt).toBe(card.sealedCopies[0].sealedAt);
 }
});
it('upgrades an old weak sports cache with matching shipped exact copy metadata during cold hydration',async()=>{
 const card=sealedCard(),exact={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[card]},weak={...exact,cards:[{...card,sealedCopies:undefined,valuationRow:{...card.valuationRow,sealedCopies:undefined}}]};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(sourceInput(['a'])));localStorage.setItem('receiz-bank-public-sports-v1',JSON.stringify(weak));
 network.membership.mockImplementation(()=>new Promise(()=>{}));network.quotes.mockImplementation(()=>new Promise(()=>{}));
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/receiz-public-sports.json'?Response.json(exact):new Response('',{status:503})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));const item=state.catalog?.items.find(item=>item.category==='sports');expect(item?.sealedAt).toBe(card.sealedCopies[0].sealedAt);expect(item?.ownerUsername).toBe('holder');}finally{act(()=>root.unmount());}
});
it('keeps exact sports data through a membership refresh after a fallback response',async()=>{
 const card=sealedCard(),exact={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[card]},fallback={...exact,fallback:true,cards:[{...card,sealedCopies:undefined,valuationRow:{...card.valuationRow,sealedCopies:undefined}}]};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(sourceInput(['a'])));localStorage.setItem('receiz-bank-public-sports-v1',JSON.stringify(exact));
 network.membership.mockResolvedValue(parsePublicMarket(sourceInput(['a'])));network.quotes.mockResolvedValue(quoteInput());
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/api/bank/public-market/sports'?Response.json(fallback):new Response('',{status:503})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));await act(async()=>state.refresh());const item=state.catalog?.items.find(item=>item.category==='sports');expect(item?.sealedAt).toBe(card.sealedCopies[0].sealedAt);expect(item?.ownerUsername).toBe('holder');expect(state.sportsStatus).toBe('retained');}finally{act(()=>root.unmount());}
});
it('keeps newer exact sports capture in cache and reports an older response as retained',async()=>{
 const card=sealedCard(),freshCard={...card,liveValueUsd:200,totalValueUsd:200,sealedCopies:card.sealedCopies.map(copy=>({...copy,ownerUsername:'new_owner',currentValueUsd:200}))},oldCard={...card,liveValueUsd:100,totalValueUsd:100,sealedCopies:card.sealedCopies.map(copy=>({...copy,ownerUsername:'old_owner',currentValueUsd:100}))};
 const fresh={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-19T12:00:00Z',cards:[{...freshCard,valuationRow:publicSportsValueRow(freshCard)}]},old={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-18T12:00:00Z',cards:[{...oldCard,valuationRow:publicSportsValueRow(oldCard)}]};
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(sourceInput(['a'])));localStorage.setItem('receiz-bank-public-sports-v1',JSON.stringify(fresh));
 network.membership.mockResolvedValue(parsePublicMarket(sourceInput(['a'])));network.quotes.mockResolvedValue(quoteInput());
 vi.stubGlobal('fetch',vi.fn(async input=>input==='/api/bank/public-market/sports'?Response.json(old):new Response('',{status:503})));
 let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));expect(state.catalog?.items.find(item=>item.category==='sports')?.ownerUsername).toBe('new_owner');expect(state.sportsStatus).toBe('retained');const cached=JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1')!);expect(cached.generatedAt).toBe(fresh.generatedAt);expect(cached.cards[0].liveValueUsd).toBe(200);}finally{act(()=>root.unmount());}
});
it('can advance a profile display clock without starting global Market discovery or polling',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);let state!:ReturnType<typeof usePublicMarket>;const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket(false,true);return null;}try{await act(async()=>root.render(<Probe/>));expect(Number.isSafeInteger(state.pulse)).toBe(true);expect(fetcher).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
it('adopts a newly admitted asset immediately and keeps it through a stale refresh without another startup call',async()=>{
 const adoption=await import('../src/receiz/asset-publication-adoption');network.membership.mockResolvedValue(parsePublicMarket(sourceInput(['a'])));network.quotes.mockResolvedValue(quoteInput());
 const ref={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}},path='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(ref)});
 try{await observe(async read=>{const calls=network.membership.mock.calls.length;await act(()=>adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:ref,firstPaint:{artifactDigest:'c'.repeat(64)},original:{id:'new-work',assetTitle:'A new work',showOnProfile:true,importedSource:{reference:ref},media:{kind:'image',src:path+'&payload=1',originalDownloadSrc:path,originalDownloadSha256Hex:ref.artifactSha256}}},{identityDigest:'d'.repeat(64),accountUid:'owner'}));expect(read().catalog?.items[0].id).toBe('profile:artist:new-work');expect(network.membership).toHaveBeenCalledTimes(calls);await act(async()=>read().refresh());expect(read().catalog?.items.filter(item=>item.id==='profile:artist:new-work')).toHaveLength(1);});}finally{adoption.forgetAssetPublicationAdmissions();}
});
