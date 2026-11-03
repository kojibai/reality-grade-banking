// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {usePublicMarket as PublicMarketHook} from '../src/receiz/usePublicMarket';

vi.mock('../src/receiz/market-projection/display-source',()=>({useMarketDisplaySource:()=>null,prepareMarketDisplaySource:()=>Promise.resolve()}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>vi.resetModules());
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();});
const membership=(ids:string[],generatedAt='2026-11-01T12:00:00Z')=>({ok:true,transport:{generatedAt,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(',')},publicOriginals:ids.map(id=>({id,receizId:id,title:id,valueUsd:10,profileOriginal:{hasPbiSignature:id==='signed'}}))}});
const sports={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-11-01T12:00:00Z',cards:[{collectibleId:'rsc_0123456789abcdef',claimHash:'a'.repeat(64),sport:'baseball',athlete:'Public card',issuedCount:1,vaultCount:1,pricedCount:1,liveValueUsd:25,totalValueUsd:25}]};
const quotes={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}};

it('restores the complete bundled catalogue beside a pending Original on a cold PWA open',async()=>{
 const adoption=await import('../src/receiz/asset-publication-adoption');
 const ref={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}},path='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(ref)});
 adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:ref,firstPaint:null,original:{id:'pending-work',assetTitle:'Pending delivery',showOnProfile:true,importedSource:{reference:ref},media:{kind:'image',src:path+'&payload=1',originalDownloadSrc:path,originalDownloadSha256Hex:ref.artifactSha256}}},{identityDigest:'d'.repeat(64),accountUid:'owner'});
 vi.resetModules();
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>{
  const path=String(input);
  if(path==='/receiz-public-market.json')return Response.json(membership(['signed','unsigned']));
  if(path==='/receiz-public-sports.json'||path==='/api/bank/public-market/sports')return Response.json(sports);
  if(path==='/api/bank/public-market/quotes')return Response.json(quotes);
  return new Promise<Response>(()=>{});
 });vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let state!:ReturnType<typeof PublicMarketHook>;
 const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{
  await act(async()=>root.render(<Probe/>));
  expect(state.catalog?.items.map(item=>item.id)).toEqual(['profile:artist:pending-work','signed','unsigned','sports:rsc_0123456789abcdef']);
  expect(fetcher.mock.calls.map(call=>String(call[0]))).toEqual(['/receiz-public-sports.json','/receiz-public-market.json','/api/bank/public-market/quotes','/api/bank/public-market/membership','/api/bank/public-market/sports']);
 }finally{act(()=>root.unmount());}
});

it.each(['new','already-mounted'] as const)('paints the whole settled public catalogue in a %s workspace when optional storage cannot retain it',async lifetime=>{
 const key='receiz-bank-public-discovery-v2',previous=JSON.stringify(membership(['signed']));localStorage.setItem(key,previous);
 const storage=localStorage;vi.stubGlobal('localStorage',{getItem:storage.getItem.bind(storage),removeItem:storage.removeItem.bind(storage),setItem:(key:string,value:string)=>{if(key==='receiz-bank-public-discovery-v2'||key==='receiz-bank-public-sports-v1')throw new DOMException('Public display cache is full','QuotaExceededError');storage.setItem(key,value);}});
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);return path==='/api/bank/public-market/membership'?Response.json(membership(['signed','unsigned'])):path==='/api/bank/public-market/sports'?Response.json(sports):path==='/api/bank/public-market/quotes'?Response.json(quotes):new Response('',{status:404});});vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');
 let first!:ReturnType<typeof PublicMarketHook>,second!:ReturnType<typeof PublicMarketHook>;
 const firstRoot=createRoot(document.createElement('div')),secondHost=document.createElement('div'),secondRoot=createRoot(secondHost),paints:string[][]=[];
 function First(){first=usePublicMarket();return null;}
 function Second({active=false}:{active?:boolean}){second=usePublicMarket(active,false);paints.push(second.catalog?.items.map(item=>item.id)??[]);return <span>{second.catalog?.items.length??0} assets</span>;}
 try{
  if(lifetime==='already-mounted')act(()=>secondRoot.render(<Second/>));
  await act(async()=>firstRoot.render(<First/>));expect(first.catalog?.items.map(item=>item.id)).toEqual(['signed','unsigned','sports:rsc_0123456789abcdef']);expect(localStorage.getItem(key)).toBe(previous);
  fetcher.mockImplementation(()=>new Promise<Response>(()=>{}));const reads=fetcher.mock.calls.length;paints.length=0;
  act(()=>secondRoot.render(<Second active={lifetime==='already-mounted'}/>));
  expect(paints[0]).toEqual(['signed','unsigned','sports:rsc_0123456789abcdef']);expect(secondHost.textContent).toBe('3 assets');expect(second.historyCatalog).toBe(first.historyCatalog);
  expect(fetcher.mock.calls.slice(reads).map(call=>String(call[0]))).toEqual(lifetime==='new'?[]:['/receiz-public-sports.json','/receiz-public-market.json','/api/bank/public-market/quotes','/api/bank/public-market/membership','/api/bank/public-market/sports']);
  expect(second.catalog?.items.map(item=>item.hasPbiSignature)).toEqual([true,false,undefined]);expect(second.catalog?.items.every(item=>item.authority==='projection-only'&&item.canTrade===false)).toBe(true);
 }finally{act(()=>firstRoot.unmount());act(()=>secondRoot.unmount());}
});

it('keeps a newer complete public cohort when an older workspace discovery resolves later',async()=>{
 const pending:Array<(value:Response)=>void>=[];
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>String(input)==='/api/bank/public-market/membership'?new Promise<Response>(resolve=>pending.push(resolve)):String(input)==='/api/bank/public-market/quotes'?Response.json(quotes):new Response('',{status:404})));
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let first!:ReturnType<typeof PublicMarketHook>,second!:ReturnType<typeof PublicMarketHook>;
 const a=createRoot(document.createElement('div')),b=createRoot(document.createElement('div'));
 function First(){first=usePublicMarket();return null;}function Second(){second=usePublicMarket();return null;}
 try{
  await act(async()=>a.render(<First/>));await act(async()=>b.render(<Second/>));
  await act(async()=>pending[0](Response.json(membership(['signed','unsigned'],'2026-11-01T13:00:00Z'))));const settled=first.historyCatalog;
  await act(async()=>pending[1](Response.json(membership(['signed'],'2026-11-01T12:00:00Z'))));
  expect(first.catalog?.items.map(item=>item.id)).toEqual(['signed','unsigned']);expect(second.historyCatalog).toBe(settled);
 }finally{act(()=>a.unmount());act(()=>b.unmount());}
});

it('keeps canonical removals when a local publication overlay precedes an older complete response',async()=>{
 const pending:Array<(value:Response)=>void>=[],fetcher=vi.fn(async(input:RequestInfo|URL)=>String(input)==='/api/bank/public-market/membership'?new Promise<Response>(resolve=>pending.push(resolve)):String(input)==='/api/bank/public-market/quotes'?Response.json(quotes):new Response('',{status:404}));vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),adoption=await import('../src/receiz/asset-publication-adoption');let first!:ReturnType<typeof PublicMarketHook>,second!:ReturnType<typeof PublicMarketHook>;
 const a=createRoot(document.createElement('div')),b=createRoot(document.createElement('div'));
 function First(){first=usePublicMarket();return null;}function Second(){second=usePublicMarket();return null;}
 const ref={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}},path='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(ref)});
 try{
  await act(async()=>a.render(<First/>));await act(async()=>b.render(<Second/>));await act(async()=>pending[0](Response.json(membership(['unsigned'],'2026-11-01T13:00:00Z'))));
  const reads=fetcher.mock.calls.length;act(()=>adoption.retainAssetPublicationAdmission({username:'artist',sourceReference:ref,firstPaint:{artifactDigest:'c'.repeat(64)},original:{id:'new-work',assetTitle:'A new work',showOnProfile:true,importedSource:{reference:ref},media:{kind:'image',src:path+'&payload=1',originalDownloadSrc:path,originalDownloadSha256Hex:ref.artifactSha256}}},{identityDigest:'d'.repeat(64),accountUid:'owner'}));
  expect(first.catalog?.complete).toBe(false);expect(first.catalog?.items.map(item=>item.id)).toEqual(['profile:artist:new-work','unsigned']);expect(fetcher).toHaveBeenCalledTimes(reads);const settled=first.historyCatalog;
  await act(async()=>pending[1](Response.json(membership(['signed','unsigned'],'2026-11-01T12:00:00Z'))));
  expect(first.catalog?.items.map(item=>item.id)).toEqual(['profile:artist:new-work','unsigned']);expect(second.historyCatalog).toBe(settled);expect(fetcher).toHaveBeenCalledTimes(reads);
 }finally{act(()=>a.unmount());act(()=>b.unmount());adoption.forgetAssetPublicationAdmissions();}
});

it('accepts a newer complete canonical removal and reuses it across inactive and active entry',async()=>{
 let current=membership(['signed','unsigned']);const fetcher=vi.fn(async(input:RequestInfo|URL)=>String(input)==='/api/bank/public-market/membership'?Response.json(current):String(input)==='/api/bank/public-market/quotes'?Response.json(quotes):new Response('',{status:404}));vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let first!:ReturnType<typeof PublicMarketHook>,second!:ReturnType<typeof PublicMarketHook>,paints=0;
 const a=createRoot(document.createElement('div')),b=createRoot(document.createElement('div'));
 function First(){first=usePublicMarket();return null;}function Second({active}:{active:boolean}){second=usePublicMarket(active,false);paints++;return null;}
 try{
  await act(async()=>a.render(<First/>));act(()=>b.render(<Second active={false}/>));const inactivePaints=paints;
  current=membership(['unsigned'],'2026-11-01T13:00:00Z');await act(async()=>first.refresh());
  expect(paints).toBe(inactivePaints);expect(first.catalog?.items.map(item=>item.id)).toEqual(['unsigned']);
  fetcher.mockImplementation(()=>new Promise<Response>(()=>{}));act(()=>b.render(<Second active/>));expect(second.historyCatalog).toBe(first.historyCatalog);expect(second.catalog?.items.map(item=>item.id)).toEqual(['unsigned']);
  act(()=>b.render(<Second active={false}/>));const reads=fetcher.mock.calls.length;act(()=>b.render(<Second active={false}/>));expect(fetcher).toHaveBeenCalledTimes(reads);
 }finally{act(()=>a.unmount());act(()=>b.unmount());}
});

it('keeps the settled complete collection when a publication discovery returns only a partial cohort',async()=>{
 const partial=membership(['signed']);partial.transport.publicMembership.isComplete=false;
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>String(input).startsWith('/api/bank/public-market/membership')?Response.json(String(input).includes('?')?partial:membership(['signed','unsigned'])):String(input)==='/api/bank/public-market/quotes'?Response.json(quotes):new Response('',{status:404})));
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{refreshAssetPublicationCatalog}=await import('../src/receiz/asset-publication-adoption');let state!:ReturnType<typeof PublicMarketHook>;
 const root=createRoot(document.createElement('div'));function Probe(){state=usePublicMarket();return null;}
 try{await act(async()=>root.render(<Probe/>));await act(async()=>refreshAssetPublicationCatalog('a'.repeat(64)));expect(state.catalog?.items.map(item=>item.id)).toEqual(['signed','unsigned']);expect(state.catalog?.complete).toBe(true);}finally{act(()=>root.unmount());}
});
