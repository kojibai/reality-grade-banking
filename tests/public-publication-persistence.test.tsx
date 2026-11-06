// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import type {PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import cap from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
const membership=(id:string)=>({ok:true,transport:{generatedAt:'2026-11-05T18:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:id},publicOriginals:[{id,receizId:id,title:id,profileOriginal:{media:null}}]}});
async function packet(id:string,generation='a'.repeat(64)){
 const {parsePublicMarket}=await import('../src/receiz/public-market'),{publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed');
 const {parseMarketCapSource}=await import('../src/receiz/market-projection/source');
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1' as const,path:'bank',generation,catalog:parsePublicMarket(membership(id)),capitalization:parseMarketCapSource(cap),history:historyInput as PublicMarketDocumentSeed['history'],asOfPulse:Math.max(cap.marketCapProjection.serverPulse,historyInput.summary.serverPulse),visibleCount:1,format:{locale:'en-US',timeZone:'UTC'}};
 const body='<html><body>'+publicMarketDocumentSeedScript(seed)+'</body></html>',headers={'content-type':'text/html','content-length':String(Buffer.byteLength(body)),'x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'b'.repeat(64),'x-receiz-public-html-sha256':createHash('sha256').update(body).digest('hex'),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'c'.repeat(64)};
 return{seed,response:()=>new Response(body,{headers})};
}
function delayedCache(){let finish!:(response:Response)=>void;const cache={match:vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})),put:vi.fn(async()=>{}),delete:vi.fn(async()=>true)};vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});return{cache,finish:(response:Response)=>finish(response)};}
async function probe(){const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let latest!:ReturnType<typeof usePublicMarket>;function Probe(){latest=usePublicMarket(true,false);return <p>{latest.historyCatalog?.items.map(item=>item.title).join(',')}</p>;}const host=document.createElement('section');document.body.append(host);const root=createRoot(host);roots.push(root);await act(()=>root.render(<Probe/>));return{host,read:()=>latest};}
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<div id="root">Retained Bank</div><script id="receiz-navigation" type="application/json">{}</script>';});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.unstubAllGlobals();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
it('keeps already shared accepted B when the exact persisted Bank A finishes historical restore',async()=>{
 const disk=delayedCache(),a=await packet('persisted A'),fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path).startsWith('/api/bank/public-market/membership?afterPublication=')?Response.json(membership('accepted B')):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const p=await probe(),adoption=await import('../src/receiz/asset-publication-adoption');await act(()=>adoption.refreshAssetPublicationCatalog('d'.repeat(64)));expect(p.read().historyCatalog?.items[0].id).toBe('accepted B');const heldB=p.read().historyCatalog;
 const reader=await import('../src/receiz/prepared-bank-catalog');await act(async()=>{disk.finish(a.response());await reader.prepareCarriedBankCatalog();});
 expect(p.read().historyCatalog).toBe(heldB);expect(p.read().status).toBe('stale');expect(reader.preparedBankCatalogState().value).toBeNull();expect(reader.preparedBankCatalogState().carried).toBeUndefined();
 const source=await import('../src/public-feed/feed-source');expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted B']);expect(fetcher.mock.calls.filter(([path])=>String(path).startsWith('/api/'))).toHaveLength(1);
});
it('keeps cold Feed accepted B when the later Market owner loads and restores old persisted Bank A',async()=>{
 const disk=delayedCache(),a=await packet('persisted A'),fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/api/bank/public-market/membership'?Response.json(membership('accepted B')):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const source=await import('../src/public-feed/feed-source');source.reusePreparedFeedCatalog(a.seed.catalog,a.seed.generation);expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['persisted A']);expect((await source.prepareFeedItems(undefined,true)).map(item=>item.id)).toEqual(['accepted B']);
 const p=await probe(),reader=await import('../src/receiz/prepared-bank-catalog');await act(async()=>{disk.finish(a.response());await reader.prepareCarriedBankCatalog();});
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted B']);expect(p.read().historyCatalog?.items[0].id).toBe('accepted B');expect(p.read().status).toBe('stale');expect(fetcher.mock.calls.filter(([path])=>String(path).startsWith('/api/'))).toHaveLength(1);
});
