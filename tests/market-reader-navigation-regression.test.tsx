// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicMarketDocumentSeedScript,type PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import capInput from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const membership={ok:true,transport:{generatedAt:'2026-11-05T10:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'held-projection'},publicOriginals:[{id:'held-public-original',receizId:'held-public-original',title:'Complete held Original',valueUsd:25,profileOriginal:{mediaKind:'audio',artworkUrl:'https://receiz.com/artwork/held.jpg'}}]}};
const cap={...capInput,marketCapProjection:{...capInput.marketCapProjection,proofObjectHash:'b'.repeat(64)}};
beforeEach(()=>{vi.resetModules();history.replaceState(null,'','/');localStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
function carried(){const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation:'b'.repeat(64),path:'explore',catalog:parsePublicMarket(membership),capitalization:cap.marketCapProjection as PublicMarketDocumentSeed['capitalization'],history:historyInput as PublicMarketDocumentSeed['history'],asOfPulse:Math.max(cap.marketCapProjection.serverPulse,historyInput.summary.serverPulse),visibleCount:1,format:{locale:'en-US',timeZone:'UTC'}};const page=document.createElement('section');page.dataset.publicRuntime='explore';page.innerHTML=publicMarketDocumentSeedScript(seed);document.body.append(page);return page;}
async function probes(){const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketDisplaySource}=await import('../src/receiz/market-projection/display-source'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),reader=await import('../src/receiz/prepared-bank-catalog');let latest!:{market:ReturnType<typeof usePublicMarket>;pricing:ReturnType<typeof useMarketDisplaySource>;chart:ReturnType<typeof useMarketCapitalization>};function Probe({active,chart}:{active:boolean;chart:boolean}){const market=usePublicMarket(active,false),pricing=useMarketDisplaySource(),graph=useMarketCapitalization('ALL',false,market.historyCatalog,chart);latest={market,pricing,chart:graph};return null;}const root=createRoot(document.createElement('div'));return{root,Probe,reader,read:()=>latest};}
it('preserves the public carried Original and pricing on Account/Assets while starting the root reader after public navigation',async()=>{
 history.replaceState(null,'','/explore/');const page=carried();const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);const p=await probes();
 try{await act(async()=>p.root.render(<p.Probe active={false} chart={false}/>));const before=p.read();expect(before.market.historyCatalog?.items[0].title).toBe('Complete held Original');expect(before.pricing?.proofObjectHash).toBe('b'.repeat(64));expect(fetcher).not.toHaveBeenCalled();
  page.hidden=true;history.replaceState(null,'','/');await act(async()=>p.root.render(<p.Probe active chart={false}/>));const after=p.read();
  console.info('PUBLIC_TO_BANK_REPRO',JSON.stringify({beforeTitle:before.market.historyCatalog?.items[0].title,afterTitle:after.market.historyCatalog?.items[0].title??null,beforeCap:before.pricing?.proofObjectHash,afterCap:after.pricing?.proofObjectHash??null,status:after.market.status,phase:p.reader.preparedBankCatalogState().phase,requests:fetcher.mock.calls.length}));
  expect(after.market.historyCatalog).toBe(before.market.historyCatalog);expect(after.pricing).toBe(before.pricing);expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/explore?path=bank',expect.objectContaining({credentials:'omit'}));
 }finally{act(()=>p.root.unmount());}
});
it('keeps a settled legacy fallback Original, artwork, pricing and curve visible through an unavailable prepared retry',async()=>{
 let retry=false,finish!:(response:Response)=>void;const fetcher=vi.fn(async(input:RequestInfo|URL)=>{
  const path=String(input);if(path==='/api/explore?path=bank')return retry?new Promise<Response>(resolve=>{finish=resolve;}):new Response(null,{status:503});
  if(path==='/receiz-public-market.json'||path==='/api/bank/public-market/membership')return Response.json(membership);
  if(path==='/receiz-public-capitalization.json'||path==='/api/bank/public-market/capitalization')return Response.json(cap);
  if(path==='/api/bank/public-market/quotes')return Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});
  return new Response(null,{status:503});
 });vi.stubGlobal('fetch',fetcher);const p=await probes();
 try{await act(async()=>p.root.render(<p.Probe active chart/>));const held=p.read();expect(held.market.historyCatalog?.items[0].artworkUrl).toBe('https://receiz.com/artwork/held.jpg');expect(held.pricing).not.toBeNull();expect(held.chart.source).not.toBeNull();
  retry=true;let pending!:Promise<unknown>;await act(async()=>{pending=p.read().market.refresh();});const during=p.read();
  console.info('FALLBACK_RETRY_REPRO',JSON.stringify({beforeCount:held.market.historyCatalog?.items.length,duringCount:during.market.historyCatalog?.items.length??0,beforeArtwork:held.market.historyCatalog?.items[0].artworkUrl,duringArtwork:during.market.historyCatalog?.items[0].artworkUrl??null,beforeCurve:!!held.chart.source,duringCurve:!!during.chart.source,beforeCap:!!held.pricing,duringCap:!!during.pricing,phase:p.reader.preparedBankCatalogState().phase}));
  const retained={catalog:during.market.historyCatalog===held.market.historyCatalog,pricing:during.pricing===held.pricing,curve:during.chart.source===held.chart.source};
  await act(async()=>{finish(new Response(null,{status:503}));await pending;});expect(p.read().market.historyCatalog?.items[0].title).toBe('Complete held Original');
  expect(retained).toEqual({catalog:true,pricing:true,curve:true});
 }finally{act(()=>p.root.unmount());}
});
it('reuses an already-held display source for ordinary view preparation without starting a prepared read',async()=>{
 const source=await import('../src/receiz/market-projection/source'),display=await import('../src/receiz/market-projection/display-source'),fetcher=vi.fn(async(_path:RequestInfo|URL)=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 display.publishMarketDisplaySource(source.parseMarketCapSource(cap));await display.prepareMarketDisplaySource();
 console.info('VIEW_PREPARATION_REPRO',JSON.stringify({requests:fetcher.mock.calls.map(call=>call[0]),held:!!display.retainedMarketDisplaySource()}));expect(fetcher).not.toHaveBeenCalled();
});
it('reopens a complete legacy family and active chart without requests and resumes its existing refresh deadline',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);if(path==='/api/explore?path=bank')return new Response(null,{status:503});if(path==='/receiz-public-market.json'||path==='/api/bank/public-market/membership')return Response.json(membership);if(path==='/receiz-public-capitalization.json'||path==='/api/bank/public-market/capitalization')return Response.json(cap);if(path==='/api/bank/public-market/quotes')return Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});return new Response(null,{status:503});});vi.stubGlobal('fetch',fetcher);const p=await probes();
 try{await act(async()=>p.root.render(<p.Probe active chart/>));const family=p.read().market.historyCatalog,pricing=p.read().pricing,curve=p.read().chart.source,reads=fetcher.mock.calls.length;expect(family?.complete).toBe(true);expect(curve).not.toBeNull();
  await act(async()=>p.root.render(<p.Probe active={false} chart={false}/>));await act(async()=>vi.advanceTimersByTimeAsync(20000));await act(async()=>p.root.render(<p.Probe active chart/>));expect(p.read().market.historyCatalog).toBe(family);expect(fetcher).toHaveBeenCalledTimes(reads);expect(p.read().pricing).toBe(pricing);expect(p.read().chart.source).toBe(curve);
  await act(async()=>vi.advanceTimersByTimeAsync(39999));expect(fetcher).toHaveBeenCalledTimes(reads);await act(async()=>vi.advanceTimersByTimeAsync(1));expect(fetcher.mock.calls.filter(([path])=>String(path)==='/api/explore?path=bank')).toHaveLength(2);
 }finally{act(()=>p.root.unmount());vi.useRealTimers();}
});
