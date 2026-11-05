// @vitest-environment happy-dom
import {act} from 'react';
import {createHash} from 'node:crypto';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
import type {PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import cap from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
const membership=(ids:string[],at='2026-11-05T13:00:00Z')=>({ok:true,transport:{generatedAt:at,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(',')},publicOriginals:ids.map(id=>({id,receizId:id,title:`Original ${id}`,profileOriginal:{media:null}}))}});
const row=(id:string,sports=false):PublicMarketItem=>({id,assetId:id,title:id,summary:id,category:sports?'sports':'proof',mediaKind:'moment',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
const catalog=(rows:PublicMarketItem[]):PublicMarketCatalog=>({items:rows,complete:true,revision:'held',observedAt:null,sourceCount:rows.length});
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<div id="root">Retained Bank</div><script id="receiz-navigation" type="application/json">{}</script>';});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
async function seed(ids:string[],generation='a'.repeat(64)){
 const {parsePublicMarket}=await import('../src/receiz/public-market'),{parseMarketCapSource}=await import('../src/receiz/market-projection/source');
 return {schema:'bank.public-market.document.v1',path:'bank',generation,catalog:parsePublicMarket(membership(ids,'2026-11-05T12:00:00Z')),capitalization:parseMarketCapSource(cap),history:historyInput,asOfPulse:Math.max(cap.marketCapProjection.serverPulse,historyInput.summary.serverPulse),visibleCount:ids.length,format:{locale:'en-US',timeZone:'UTC'}} as PublicMarketDocumentSeed;
}
async function probe(){
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let current!:ReturnType<typeof usePublicMarket>;
 function Probe({active=false}:{active?:boolean}){current=usePublicMarket(active,false);return <span>{current.historyCatalog?.items.map(item=>item.title).join(',')}</span>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);return{root,Probe,host,read:()=>current};
}
it('expands restored Discover from the complete selected catalog without fetching or reparsing its shipped twin',async()=>{
 const held=catalog([row('held Original'),row('held card',true)]),marker=document.getElementById('receiz-navigation')!;
 Object.assign(marker,{publicMarketDocument:()=>({generation:'a'.repeat(64),catalog:held})});
 const fetcher=vi.fn(async()=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const source=await import('../src/public-feed/feed-source');
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['held Original','held card']);
 expect((await source.prepareFeedCollectibles()).map(item=>item.id)).toEqual(['held card']);
 expect(fetcher).not.toHaveBeenCalled();
});
it('keeps accepted membership B selected for Feed without borrowing prepared A provenance, then follows genuine C and withdrawals',async()=>{
 const a=await seed(['withdrawn']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket'),reader=await import('../src/receiz/prepared-bank-catalog');adoptPublicMarketDocument(a);
 const p=await probe();await act(()=>p.root.render(<p.Probe active/>));
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path).startsWith('/api/bank/public-market/membership?afterPublication=')?Response.json(membership(['accepted'])):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const adoption=await import('../src/receiz/asset-publication-adoption');await act(()=>adoption.refreshAssetPublicationCatalog('d'.repeat(64)));
 const accepted=p.read().historyCatalog;expect(accepted?.items.map(item=>item.id)).toEqual(['accepted']);
 const feed=await import('../src/public-feed/main'),host=document.createElement('section');host.dataset.publicRuntime='feed';document.body.append(host);
 await act(()=>{const root=feed.mountHeldPublicDocument(host,a);if(root)roots.push(root);});
 expect(host.textContent).toContain('Original accepted');expect(host.textContent).not.toContain('Original withdrawn');
 expect(reader.preparedBankCatalogState().carried?.seed).toBe(a);expect(a.catalog.items.map(item=>item.id)).toEqual(['withdrawn']);expect(p.read().status).toBe('stale');
 const source=await import('../src/public-feed/feed-source');expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted']);
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicDiscoveryDocument:()=>{generation:string}|null};expect(marker.publicDiscoveryDocument()).toBeNull();
 await act(()=>p.read().refresh());expect(p.read().historyCatalog).toBe(accepted);expect(host.textContent).toContain('Original accepted');
 const c=await seed(['qualified C'],'c'.repeat(64));await act(()=>adoptPublicMarketDocument(c,{state:'current',identity:reader.publicMarketIdentity()}));
 expect(host.textContent).toContain('Original qualified C');expect(host.textContent).not.toContain('Original accepted');expect(marker.publicDiscoveryDocument()?.generation).toBe('c'.repeat(64));
 const withdrawn=await seed([],'e'.repeat(64));await act(()=>adoptPublicMarketDocument(withdrawn,{state:'current',identity:reader.publicMarketIdentity()}));
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual([]);expect(host.textContent).not.toContain('Original qualified C');
 expect(fetcher).toHaveBeenCalledTimes(2);
});
it('retains accepted membership when publication resolves after its Market consumer unmounts',async()=>{
 const a=await seed(['old']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(a);
 const fetcher=vi.fn(async()=>Response.json(membership(['accepted after unmount'])));vi.stubGlobal('fetch',fetcher);
 const adoption=await import('../src/receiz/asset-publication-adoption');await adoption.refreshAssetPublicationCatalog('d'.repeat(64));
 const source=await import('../src/public-feed/feed-source');expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted after unmount']);expect(fetcher).toHaveBeenCalledOnce();
});
it('healthy public wakes preserve the held family deadline while explicit refresh and a failed retry remain immediate',async()=>{
 vi.useFakeTimers();const a=await seed(['held']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(a);
 const fetcher=vi.fn(async()=>new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);const p=await probe();await act(()=>p.root.render(<p.Probe active/>));
 await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'));});expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>vi.advanceTimersByTimeAsync(59999));await act(async()=>window.dispatchEvent(new Event('online')));expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>p.read().refresh());expect(fetcher).toHaveBeenCalledOnce();expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['held']);
 await act(async()=>window.dispatchEvent(new Event('online')));expect(fetcher).toHaveBeenCalledTimes(2);
});

it('reuses an unchanged admitted public projection by reference so its genuine prepared provenance survives',async()=>{
 const held=catalog([row('held')]),{mergeAdmittedPublicAssets}=await import('../src/receiz/asset-publication-adoption');
 expect(mergeAdmittedPublicAssets(held)).toBe(held);
});
it('does not apply prepared A currentness to independently accepted membership B',async()=>{
 const a=await seed(['prepared A']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket'),reader=await import('../src/receiz/prepared-bank-catalog'),{publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed');adoptPublicMarketDocument(a);
 const body='<html><body>'+publicMarketDocumentSeedScript(a)+'</body></html>',headers={'content-type':'text/html','x-receiz-public-material-revision':a.generation,'x-receiz-public-render-build':'b'.repeat(64),'x-receiz-public-html-sha256':createHash('sha256').update(body).digest('hex'),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'c'.repeat(64)};
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/api/explore?path=bank'?new Response(body,{headers}):Response.json(membership(['membership B'])));vi.stubGlobal('fetch',fetcher);
 const p=await probe();await act(()=>p.root.render(<p.Probe active/>));await act(()=>reader.readPreparedBankCatalog());expect(p.read().status).toBe('live');
 const qualified=reader.preparedBankCatalogState().value,adoption=await import('../src/receiz/asset-publication-adoption');await act(()=>adoption.refreshAssetPublicationCatalog('d'.repeat(64)));
 expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['membership B']);expect(p.read().status).toBe('stale');expect(p.read().quoteStatus).toBe('stale');expect(reader.preparedBankCatalogState().value).toBe(qualified);expect(qualified?.seed.catalog.items.map(item=>item.id)).toEqual(['prepared A']);
});
it('keeps an explicit Feed refresh selected on later reads while the old prepared receipt stays separate',async()=>{
 const a=await seed(['old']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(a);
 const source=await import('../src/public-feed/feed-source');expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['old']);
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/api/bank/public-market/membership'?Response.json(membership(['refreshed'])):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 expect((await source.prepareFeedItems(undefined,true)).map(item=>item.id)).toEqual(['refreshed']);expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['refreshed']);
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicMarketCatalog:()=>PublicMarketCatalog|null};expect(marker.publicMarketCatalog()?.items.map(item=>item.id)).toEqual(['refreshed']);
 const reader=await import('../src/receiz/prepared-bank-catalog');expect(reader.preparedBankCatalogState().carried?.seed).toBe(a);expect(fetcher).toHaveBeenCalledOnce();
});
it('reuses separately held sports when accepted Originals membership has no sports operand',async()=>{
 const a=await seed(['old']),card=row('already held card',true);a.catalog={...a.catalog,items:[...a.catalog.items,card],sportsCoverage:'complete'};
 const {adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(a);
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path).startsWith('/api/bank/public-market/membership?afterPublication=')?Response.json(membership(['new Original'])):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 const adoption=await import('../src/receiz/asset-publication-adoption');await adoption.refreshAssetPublicationCatalog('d'.repeat(64));
 const source=await import('../src/public-feed/feed-source'),sports=await source.prepareFeedCollectibles();expect(sports).toEqual([card]);expect(sports[0]).toBe(card);expect(fetcher).toHaveBeenCalledOnce();
});
it('retries a failed legacy public refresh on wake before its ordinary deadline',async()=>{
 history.replaceState(null,'','/explore/');localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership(['held'])));let memberships=0;
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>{const url=String(path);if(url==='/api/bank/public-market/membership')return ++memberships===1?Response.json(membership(['held'])):new Response(null,{status:503});if(url==='/receiz-public-market.json')return Response.json(membership(['held']));if(url.includes('capitalization'))return Response.json(cap);if(url==='/api/bank/public-market/quotes')return Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});return new Response(null,{status:503});});vi.stubGlobal('fetch',fetcher);
 const p=await probe();await act(()=>p.root.render(<p.Probe active/>));expect(memberships).toBe(1);await act(()=>p.read().refresh());expect(memberships).toBe(2);
 await act(()=>window.dispatchEvent(new Event('online')));expect(memberships).toBe(3);expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['held']);
});
it('retries a pending failed trade quote on wake without another membership or prepared read',async()=>{
 const a=await seed(['held']),{adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(a);let quotes=0;
 const nonce='10000000-0000-4000-8000-000000000001',fetcher=vi.fn(async(path:RequestInfo|URL)=>{if(String(path)==='/api/bank/public-market/quotes?afterTrade='+nonce){quotes++;return quotes===1?new Response(null,{status:503}):Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});}return new Response(null,{status:503});});vi.stubGlobal('fetch',fetcher);
 const p=await probe();await act(()=>p.root.render(<p.Probe active/>));await act(()=>dispatchEvent(new CustomEvent('bankeiz:market-shares-changed',{detail:{clientNonce:nonce}})));expect(quotes).toBe(1);
 await act(()=>window.dispatchEvent(new Event('online')));expect(quotes).toBe(2);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('retries a genuinely failed sports operand on wake without rereading healthy membership or quotes',async()=>{
 history.replaceState(null,'','/explore/');localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership(['held'])));let sports=0,memberships=0,quotes=0;
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>{const url=String(path);if(url==='/api/bank/public-market/sports'){sports++;return new Response(null,{status:503});}if(url==='/api/bank/public-market/membership'){memberships++;return Response.json(membership(['held']));}if(url==='/receiz-public-market.json')return Response.json(membership(['held']));if(url.includes('capitalization'))return Response.json(cap);if(url==='/api/bank/public-market/quotes'){quotes++;return Response.json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}});}return new Response(null,{status:503});});vi.stubGlobal('fetch',fetcher);
 const p=await probe();await act(()=>p.root.render(<p.Probe active/>));expect(p.read().sportsStatus).toBe('missing');expect(sports).toBe(1);const held=p.read().historyCatalog;
 await act(()=>window.dispatchEvent(new Event('online')));expect(sports).toBe(2);expect(memberships).toBe(1);expect(quotes).toBe(1);expect(p.read().historyCatalog).toBe(held);
});
it('keeps explicit bare Feed B when the optional shared catalog owner is absent and follows genuine C including empty withdrawal',async()=>{
 const {parsePublicMarket}=await import('../src/receiz/public-market'),a=parsePublicMarket(membership(['prepared A']));let selected={catalog:a,generation:'a'.repeat(64)};
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicDiscoveryDocument?:()=>{generation:string}|null};Object.assign(marker,{publicMarketDocument:()=>selected});
 const fetcher=vi.fn(async()=>Response.json(membership(['accepted B'])));vi.stubGlobal('fetch',fetcher);const source=await import('../src/public-feed/feed-source');
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['prepared A']);expect((await source.prepareFeedItems(undefined,true)).map(item=>item.id)).toEqual(['accepted B']);
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted B']);expect(marker.publicDiscoveryDocument?.()).toBeNull();
 Object.assign(marker,{publicMarketCatalog:()=>selected.catalog});expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['accepted B']);expect(marker.publicDiscoveryDocument?.()).toBeNull();
 selected={catalog:parsePublicMarket(membership(['qualified C'],'2026-11-05T11:00:00Z')),generation:'c'.repeat(64)};
 expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual(['qualified C']);expect(marker.publicDiscoveryDocument?.()?.generation).toBe('c'.repeat(64));
 selected={catalog:parsePublicMarket(membership([],'2026-11-05T10:00:00Z')),generation:'d'.repeat(64)};expect(await source.prepareFeedItems()).toEqual([]);expect(fetcher).toHaveBeenCalledOnce();
});
it('hands cold Feed accepted B to a later Market owner by reference and never revives B over genuine C or empty withdrawal',async()=>{
 const a=await seed(['prepared A']),source=await import('../src/public-feed/feed-source');source.reusePreparedFeedCatalog(a.catalog,a.generation);
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership(['prepared A'])));const diskStorage=localStorage;vi.stubGlobal('localStorage',{getItem:diskStorage.getItem.bind(diskStorage),setItem(){throw Error('QUOTA');}});
 const fetcher=vi.fn(async(path:RequestInfo|URL)=>String(path)==='/api/bank/public-market/membership'?Response.json(membership(['accepted B'])):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 expect((await source.prepareFeedItems(undefined,true)).map(item=>item.id)).toEqual(['accepted B']);
 const p=await probe();await act(()=>p.root.render(<p.Probe/>));expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['accepted B']);
 const {retainedDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');expect(p.read().historyCatalog).toBe(retainedDiscoveredPublicCatalog());
 const {adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket'),reader=await import('../src/receiz/prepared-bank-catalog'),c=await seed(['qualified C'],'c'.repeat(64));
 await act(()=>{adoptPublicMarketDocument(c);p.root.render(<p.Probe active/>);});expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['qualified C']);
 const empty=await seed([],'e'.repeat(64));await act(()=>adoptPublicMarketDocument(empty,{state:'current',identity:reader.publicMarketIdentity()}));expect(p.read().historyCatalog?.items).toEqual([]);expect((await source.prepareFeedItems()).map(item=>item.id)).toEqual([]);expect(fetcher).toHaveBeenCalledOnce();
});
it('hands a complete accepted empty public membership to a later owner without restoring its old rows',async()=>{
 const source=await import('../src/public-feed/feed-source'),a=await seed(['old']);source.reusePreparedFeedCatalog(a.catalog,a.generation);
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership(['old'])));const diskStorage=localStorage;vi.stubGlobal('localStorage',{getItem:diskStorage.getItem.bind(diskStorage),setItem(){throw Error('QUOTA');}});
 const fetcher=vi.fn(async()=>Response.json(membership([])));vi.stubGlobal('fetch',fetcher);expect(await source.prepareFeedItems(undefined,true)).toEqual([]);
 const p=await probe();await act(()=>p.root.render(<p.Probe/>));expect(p.read().historyCatalog?.complete).toBe(true);expect(p.read().historyCatalog?.items).toEqual([]);expect(p.read().status).toBe('stale');expect(fetcher).toHaveBeenCalledOnce();
});
it('rejects superseded pending Feed B before retaining it for a late Market owner',async()=>{
 const source=await import('../src/public-feed/feed-source'),a=await seed(['A']);source.reusePreparedFeedCatalog(a.catalog,a.generation);
 let finish!:(response:Response)=>void;const response=new Promise<Response>(resolve=>{finish=resolve;}),fetcher=vi.fn(()=>response);vi.stubGlobal('fetch',fetcher);
 const pending=source.prepareFeedItems(undefined,true);await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 const c=await seed(['C'],'c'.repeat(64)),reader=await import('../src/receiz/prepared-bank-catalog');expect(reader.adoptPublicDocumentCatalog(c,()=>source.reusePreparedFeedCatalog(c.catalog,c.generation))).not.toBeNull();
 finish(Response.json(membership(['superseded pending B'])));expect((await pending).map(item=>item.id)).toEqual(['C']);
 const p=await probe();await act(()=>p.root.render(<p.Probe/>));expect(p.read().historyCatalog?.items.map(item=>item.id)).toEqual(['C']);
});
