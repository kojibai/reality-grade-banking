// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {publicShareCapitalization} from '../src/receiz/market-share-inventory';
import {profileCollectionPrices,profileCollectionCapitalization} from '../src/public-explorer/profile-prices';
let adoption:typeof import('../src/receiz/asset-publication-adoption');
let market:typeof import('../src/receiz/public-market');
let profiles:typeof import('../src/receiz/public-profile');
let usePublicMarket:typeof import('../src/receiz/usePublicMarket')['usePublicMarket'];
let usePublicQuotes:typeof import('../src/receiz/usePublicQuotes')['usePublicQuotes'];
const digest='a'.repeat(64),otherDigest='b'.repeat(64);
const row=(id:string,hash=digest)=>({id,receizId:id,title:id,valueUsd:10,pulse:'14700000',ownerUsername:'artist',ownerUserId:'owner',ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{media:{kind:'image',originalDownloadSha256Hex:hash}}});
const membership=(rows=[row('old')])=>({ok:true,transport:{generatedAt:'2026-11-07T12:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length,revision:rows.map(value=>value.id).join(',')},publicOriginals:rows}});
const stock=(id:string,held='1000000',at='14710100000000')=>({schema:'receiz.market.share-inventory.v1',marketItemId:id,assetId:id,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:at,outstandingShareQuantityMicro:held,availableShareQuantityMicro:'2000000',positionsMicro:held,certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'});
const quotes=(ids=['old'])=>({ok:true,data:{schema:'receiz.market.public-snapshot.v1',generatedAt:'2026-11-07T12:00:01Z',liveMarkets:ids.map(itemId=>({itemId,visibility:'public',priceUsd:10,quoteUsdPerPhi:1,shareInventory:stock(itemId)}))}});
const deferred=()=>{let resolve!:(response:Response)=>void;const promise=new Promise<Response>(done=>resolve=done);return{promise,resolve};};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(async()=>{vi.resetModules();localStorage.clear();adoption=await import('../src/receiz/asset-publication-adoption');market=await import('../src/receiz/public-market');profiles=await import('../src/receiz/public-profile');({usePublicMarket}=await import('../src/receiz/usePublicMarket'));({usePublicQuotes}=await import('../src/receiz/usePublicQuotes'));});
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});

it('publishes membership before delayed quotes and shares exact incoming inventory with mounted Market, profile and Ledger consumers',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 const pendingMembership=deferred(),pendingQuotes=deferred();
 const fetcher=vi.fn<typeof fetch>(input=>String(input).startsWith('/api/bank/public-market/membership')?pendingMembership.promise:pendingQuotes.promise);vi.stubGlobal('fetch',fetcher);
 const views:ReturnType<typeof usePublicMarket>[]=[];let ledger:unknown;
 function Probe({index}:{index:number}){views[index]=usePublicMarket(false,true);return null;}
 function Ledger(){ledger=usePublicQuotes(false);return null;}
 const root=createRoot(document.createElement('div'));let refreshed!:Promise<void>;
 try{
  await act(async()=>root.render(<><Probe index={0}/><Probe index={1}/><Ledger/></>));
  expect(fetcher).not.toHaveBeenCalled();const held=views[0].catalog!.items[0].shareInventory;
  await act(async()=>{refreshed=adoption.refreshAssetPublicationCatalog(digest);expect(adoption.refreshAssetPublicationCatalog(digest)).toBe(refreshed);await Promise.resolve();});
  expect(fetcher.mock.calls.map(([url])=>url)).toEqual(expect.arrayContaining(['/api/bank/public-market/membership?afterPublication='+digest,'/api/bank/public-market/quotes?afterPublication='+digest]));
  await act(async()=>{pendingMembership.resolve(Response.json(membership([row('old'),row('new',otherDigest)])));});
  for(const view of views){expect(view.catalog?.items.map(item=>item.id)).toEqual(['old','new']);expect(view.catalog?.items[0].shareInventory).toBe(held);expect(view.catalog?.items[1].shareInventory).toBeUndefined();}
  expect(publicShareCapitalization(views[0].catalog).covered).toBe(1);
  await act(async()=>{pendingQuotes.resolve(Response.json(quotes(['old','new'])));await refreshed;});
  for(const view of views){
   expect(view.catalog?.items[1].shareInventory?.assetId).toBe('new');
   expect(publicShareCapitalization(view.catalog)).toMatchObject({usdCents:'6000',covered:2,listed:2,complete:true});
   const profile=profiles.selectHeldPublicProfile('artist',view.catalog)!;
   const items=profileCollectionPrices(profile.items,view.catalog,null,14710100);
   expect(profileCollectionCapitalization(items)).toBe('6000');
  }
  expect(ledger).toBe(market.readRetainedPublicQuotes()?.snapshot);expect((ledger as any).data.liveMarkets).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);
  expect(market.parsePublicMarket(saved,saved.snapshot).items[1].shareInventory?.assetId).toBe('new');
 }finally{act(()=>root.unmount());}
});

it('retains accepted membership and existing share records when publication quotes fail',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 const fetcher=vi.fn<typeof fetch>(async input=>String(input).startsWith('/api/bank/public-market/membership')?Response.json(membership([row('old'),row('new',otherDigest)])):new Response('',{status:503}));vi.stubGlobal('fetch',fetcher);
 let view!:ReturnType<typeof usePublicMarket>;function Probe(){view=usePublicMarket(false,true);return null;}
 const root=createRoot(document.createElement('div'));
 try{await act(async()=>root.render(<Probe/>));const held=view.catalog!.items[0].shareInventory;await act(async()=>adoption.refreshAssetPublicationCatalog(digest));expect(view.catalog?.items).toHaveLength(2);expect(view.catalog?.items[0].shareInventory).toBe(held);expect(view.catalog?.items[1].shareInventory).toBeUndefined();expect(fetcher).toHaveBeenCalledTimes(2);}finally{act(()=>root.unmount());}
});

it('adopts fresh quotes while membership is still pending and reuses them when the new collection arrives',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 const pendingMembership=deferred(),pendingQuotes=deferred(),fetcher=vi.fn<typeof fetch>(input=>String(input).startsWith('/api/bank/public-market/membership')?pendingMembership.promise:pendingQuotes.promise);vi.stubGlobal('fetch',fetcher);
 let view!:ReturnType<typeof usePublicMarket>;function Probe(){view=usePublicMarket(false,true);return null;}
 const root=createRoot(document.createElement('div'));let refreshed!:Promise<void>;
 try{
  await act(async()=>root.render(<Probe/>));await act(async()=>{refreshed=adoption.refreshAssetPublicationCatalog(digest);});
  const fresh=quotes(['old','new']);Object.assign(fresh.data.liveMarkets[0].shareInventory,stock('old','4000000','14710200000000'));fresh.data.liveMarkets.forEach(value=>value.priceUsd=20);
  await act(async()=>pendingQuotes.resolve(Response.json(fresh)));
  expect(view.catalog?.items).toHaveLength(1);expect(view.catalog?.items[0].shareInventory?.outstandingShareQuantityMicro).toBe('4000000');expect(view.catalog?.items[0].priceUsd).toBe(20);
  await act(async()=>{pendingMembership.resolve(Response.json(membership([row('old'),row('new',otherDigest)])));await refreshed;});
  expect(view.catalog?.items).toHaveLength(2);expect(publicShareCapitalization(view.catalog)).toMatchObject({usdCents:'18000',covered:2,complete:true});expect(fetcher).toHaveBeenCalledTimes(2);
 }finally{act(()=>root.unmount());}
});

it('keeps a newer quote when delayed publication membership completes after its own older quote',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 const pendingMembership=deferred(),fresh=quotes(['old']);fresh.data.generatedAt='2026-11-07T12:00:02Z';fresh.data.liveMarkets.forEach(value=>value.priceUsd=20);
 const fetcher=vi.fn<typeof fetch>(async input=>String(input).startsWith('/api/bank/public-market/membership')?pendingMembership.promise:Response.json(String(input).includes('afterPublication')?quotes():fresh));vi.stubGlobal('fetch',fetcher);
 let view!:ReturnType<typeof usePublicMarket>;function Probe(){view=usePublicMarket(false,true);return null;}
 const root=createRoot(document.createElement('div'));let published!:Promise<void>;
 try{
  await act(async()=>root.render(<Probe/>));await act(async()=>{published=adoption.refreshAssetPublicationCatalog(digest);await new Promise(resolve=>setTimeout(resolve,0));});
  await act(async()=>view.refresh(true));expect(view.catalog?.items[0].priceUsd).toBe(20);
  await act(async()=>{pendingMembership.resolve(Response.json(membership()));await published;});
  expect(view.catalog?.items[0].priceUsd).toBe(20);
  expect(fetcher).toHaveBeenCalledTimes(3);
 }finally{act(()=>root.unmount());}
});

it('merges newly accepted inventories without replacing a newer observation or carrying shares onto a different Original',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 let view!:ReturnType<typeof usePublicMarket>;function Probe(){view=usePublicMarket(false,true);return null;}
 const root=createRoot(document.createElement('div'));
 try{
  await act(async()=>root.render(<Probe/>));
  const input=quotes(['old','new']);Object.assign(input.data.liveMarkets[0].shareInventory,stock('old','4000000','14710200000000'));
  await act(async()=>adoption.publishDiscoveredPublicCatalog(market.parsePublicMarket(membership([row('old'),row('new',otherDigest)]),input)));
  expect(view.catalog?.items[0].shareInventory?.outstandingShareQuantityMicro).toBe('4000000');expect(view.catalog?.items[1].shareInventory?.assetId).toBe('new');
  await act(async()=>adoption.publishDiscoveredPublicCatalog(market.parsePublicMarket(membership([row('old'),row('new',otherDigest)]),quotes(['old','new']))));
  expect(view.catalog?.items[0].shareInventory?.outstandingShareQuantityMicro).toBe('4000000');
  await act(async()=>adoption.publishDiscoveredPublicCatalog(market.parsePublicMarket(membership([row('old',otherDigest),row('new',otherDigest)]))));
  expect(view.catalog?.items[0].shareInventory).toBeUndefined();
 }finally{act(()=>root.unmount());}
});

it('keeps a newer publication quote when an older refresh finishes its separate membership read afterward',async()=>{
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({...membership(),snapshot:quotes()}));
 const pendingMembership=deferred(),fresh=quotes(['old','new']);fresh.data.generatedAt='2026-11-07T12:00:02Z';fresh.data.liveMarkets.forEach(value=>value.priceUsd=20);
 const fetcher=vi.fn<typeof fetch>(async input=>{
  const path=String(input);
  if(path.startsWith('/api/bank/public-market/membership'))return path.includes('afterPublication')?Response.json(membership([row('old'),row('new',otherDigest)])):pendingMembership.promise;
  if(path.startsWith('/api/bank/public-market/quotes'))return Response.json(path.includes('afterPublication')?fresh:quotes());
  return new Response('',{status:503});
 });vi.stubGlobal('fetch',fetcher);
 let view!:ReturnType<typeof usePublicMarket>;function Probe(){view=usePublicMarket(false,true);return null;}
 const root=createRoot(document.createElement('div'));let normal!:Promise<void>;
 try{
  await act(async()=>root.render(<Probe/>));await act(async()=>{normal=view.refresh();});
  await act(async()=>adoption.refreshAssetPublicationCatalog(digest));expect(view.catalog?.items[0].priceUsd).toBe(20);
  const later=membership([row('old'),row('new',otherDigest)]);later.transport.generatedAt='2026-11-07T12:00:03Z';
  await act(async()=>{pendingMembership.resolve(Response.json(later));await normal;});
  expect(view.catalog?.items[0].priceUsd).toBe(20);expect(view.catalog?.items[1].priceUsd).toBe(20);
 }finally{act(()=>root.unmount());}
});
