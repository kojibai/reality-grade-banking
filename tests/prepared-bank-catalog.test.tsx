// @vitest-environment happy-dom
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {renderPreparedBankDocument} from '../server/public-market-document';
import {preparePublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import historyInput from '../public/receiz-public-share-chart-history.json';
import capInput from '../public/receiz-public-capitalization.json';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const template='<!doctype html><html><body><div id="root"><p>Existing account opening</p></div><script type="module" src="/assets/bank-held.js"></script></body></html>';
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
function material(title:string,hash='b'.repeat(64)){
 const capitalization={ok:true,marketCapProjection:{...parseMarketCapSource(capInput),proofObjectHash:hash}},history={...historyInput,summary:{...historyInput.summary,proofObjectHash:hash}};
 const value={membership:{ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:title},publicOriginals:[{id:'synthetic-current-original',receizId:'synthetic-current-original',title,valueUsd:250,profileOriginal:{hasPbiSignature:true}}]}},snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}},history,capitalization,marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:Math.max(history.summary.serverPulse,capitalization.marketCapProjection.serverPulse)}};
 const body=JSON.stringify(value);return{material:body,generation:sha(body)};
}
async function packet(title:string,hash='b'.repeat(64)){
 const input=material(title,hash),html=await renderPreparedBankDocument({...input,template,path:'bank'});
 const headers={'content-type':'text/html; charset=utf-8','x-receiz-public-material-revision':input.generation,'x-receiz-public-render-build':'c'.repeat(64),'x-receiz-public-html-sha256':sha(html),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'d'.repeat(64)};
 return{html,input,headers,response:(method?:string)=>new Response(method==='HEAD'?null:html,{headers})};
}
beforeEach(async()=>{vi.resetModules();globalThis.history.replaceState(null,'','/');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();});
it('keeps main entry synchronous and serves only the existing compressed display seed from the bank data document',async()=>{
 const main=readFileSync('src/main.tsx','utf8');expect(main).not.toContain('preparePublicMarketDocumentSeed');expect(main).toContain('createRoot(document.getElementById(\'root\')!).render(');
 const p=await packet('Prepared B'),doc=new DOMParser().parseFromString(p.html,'text/html'),seed=await preparePublicMarketDocumentSeed(doc);
 expect(seed?.catalog.items[0].title).toBe('Prepared B');expect(seed?.path).toBe('bank');expect(p.html).not.toContain('/assets/bank-held.js');expect(doc.getElementById('root')).toBeNull();expect(p.html).not.toContain('receiz-navigation');expect(p.html).toContain('catalogGzip');
});
it('mounts Account with accepted historical disk A while the background saved read is pending, then adopts coherent qualified B without shipped/API discovery',async()=>{
 const p=await packet('Current B');let finish!:(response:Response)=>void;
 const fetcher=vi.fn((path:RequestInfo|URL)=>String(path)==='/api/explore?path=bank'?new Promise<Response>(resolve=>{finish=resolve;}):Promise.resolve(new Response(null,{status:503})));vi.stubGlobal('fetch',fetcher);
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({ok:true,transport:{generatedAt:'2026-11-03T12:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'accepted-A'},publicOriginals:[{id:'accepted-A',receizId:'accepted-A',title:'Previously accepted A'}]}}));
 const {readPreparedBankCatalog}=await import('../src/receiz/prepared-bank-catalog'),{usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),host=document.createElement('div'),root=createRoot(host),renders:Array<[string,string|null]>=[];
 function Probe(){const market=usePublicMarket(true,false),chart=useMarketCapitalization('ALL',false,market.historyCatalog,true),title=market.catalog?.items[0].title??'pending';renders.push([title,chart.source?.proofObjectHash??null]);return <><h1>Account mounted</h1><span>{title}</span></>;}
 localStorage.setItem('receiz-bank-public-object-value-source-v1',JSON.stringify(capInput));void readPreparedBankCatalog();
 try{await act(async()=>root.render(<Probe/>));expect(host.textContent).toBe('Account mountedPreviously accepted A');expect(renders.every(row=>row[0]==='Previously accepted A'&&row[1]===historyInput.summary.proofObjectHash)).toBe(true);expect(fetcher.mock.calls.filter(([path])=>String(path).startsWith('/api/'))).toHaveLength(1);
  await act(async()=>{finish(p.response());await readPreparedBankCatalog();});expect(host.textContent).toBe('Account mountedCurrent B');expect(renders.filter(row=>row[0]!=='pending')).toEqual(expect.arrayContaining([['Current B','b'.repeat(64)]]));expect(renders.some(([title,hash])=>title==='Current B'&&hash!=='b'.repeat(64))).toBe(false);expect(fetcher.mock.calls.filter(([path])=>String(path).startsWith('/api/'))).toHaveLength(1);expect(fetcher).toHaveBeenCalledWith('/api/explore?path=bank',expect.objectContaining({credentials:'omit',method:'GET'}));
 }finally{act(()=>root.unmount());}
});
it('reuses accepted RAM on reopen and matching positive HEAD without any catalog decode or body fetch',async()=>{
 const p=await packet('Held B'),fetcher=vi.fn(async(_path:RequestInfo|URL,init?:RequestInit)=>p.response(init?.method));vi.stubGlobal('fetch',fetcher);
 const {readPreparedBankCatalog}=await import('../src/receiz/prepared-bank-catalog'),{usePublicMarket}=await import('../src/receiz/usePublicMarket');let held!:ReturnType<typeof usePublicMarket>['historyCatalog'];function Probe(){held=usePublicMarket(true,false).historyCatalog;return null;}
 const first=createRoot(document.createElement('div'));await act(async()=>{await readPreparedBankCatalog();first.render(<Probe/>);});const catalog=held;act(()=>first.unmount());
 const publicWorkspace=document.createElement('div');publicWorkspace.dataset.publicRuntime='explore';publicWorkspace.hidden=true;publicWorkspace.innerHTML='<script id="public-market-seed" type="application/json">{"schema":"old hidden public page"}</script>';document.body.append(publicWorkspace);
 const parse=vi.spyOn(JSON,'parse'),hash=vi.spyOn(crypto.subtle,'digest'),second=createRoot(document.createElement('div'));
 try{await act(async()=>{second.render(<Probe/>);});expect(held).toBe(catalog);expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET']);await act(async()=>{await readPreparedBankCatalog();});expect(held).toBe(catalog);expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET','HEAD']);expect(parse).not.toHaveBeenCalled();expect(hash).not.toHaveBeenCalled();}finally{act(()=>second.unmount());}
});
it('reopens a prepared family without requests before its existing sixty-second refresh deadline',async()=>{
 const p=await packet('Held prepared B'),fetcher=vi.fn(async(_path:RequestInfo|URL,init?:RequestInit)=>p.response(init?.method));vi.stubGlobal('fetch',fetcher);vi.useFakeTimers();
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{readPreparedBankCatalog}=await import('../src/receiz/prepared-bank-catalog'),root=createRoot(document.createElement('div'));let latest!:ReturnType<typeof usePublicMarket>;
 function Probe({active}:{active:boolean}){latest=usePublicMarket(active,false);return null;}
 try{await act(async()=>{await readPreparedBankCatalog();root.render(<Probe active/>);});const held=latest.historyCatalog;expect(held?.items[0].title).toBe('Held prepared B');expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET']);
  await act(async()=>root.render(<Probe active={false}/>));await act(async()=>vi.advanceTimersByTimeAsync(20000));await act(async()=>root.render(<Probe active/>));expect(latest.historyCatalog).toBe(held);expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET']);
  await act(async()=>vi.advanceTimersByTimeAsync(39999));expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET']);await act(async()=>vi.advanceTimersByTimeAsync(1));expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET','HEAD']);expect(latest.historyCatalog).toBe(held);
 }finally{act(()=>root.unmount());vi.useRealTimers();}
});
it('wakes into changed C as one catalog/chart generation and keeps unavailable preparation on the legacy fallback',async()=>{
 const b=await packet('B'),c=await packet('C','e'.repeat(64));let changed=false;const fetcher=vi.fn(async(path:RequestInfo|URL,init?:RequestInit)=>{expect(path).toBe('/api/explore?path=bank');return(changed?c:b).response(init?.method);});vi.stubGlobal('fetch',fetcher);
 const {readPreparedBankCatalog}=await import('../src/receiz/prepared-bank-catalog'),{usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),root=createRoot(document.createElement('div')),renders:Array<[string,string|null]>=[];
 function Probe(){const m=usePublicMarket(true,false),h=useMarketCapitalization('ALL',false,m.historyCatalog,true);renders.push([m.catalog?.items[0].title??'pending',h.source?.proofObjectHash??null]);return null;}
 try{await act(async()=>{await readPreparedBankCatalog();root.render(<Probe/>);});changed=true;await act(async()=>{window.dispatchEvent(new Event('online'));await readPreparedBankCatalog();});expect(renders.at(-1)).toEqual(['C','e'.repeat(64)]);expect(renders.some(([title,hash])=>title==='C'&&hash!=='e'.repeat(64))).toBe(false);expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET','HEAD','GET']);}finally{act(()=>root.unmount());}
});
it('retains coherent B with explicit stale status after HEAD refusal without restoring same-pulse A or rereading discovery',async()=>{
 const b=await packet('Held B');let available=true;
 localStorage.setItem('receiz-bank-public-object-value-source-v1',JSON.stringify({ok:true,marketCapProjection:{...parseMarketCapSource(capInput),proofObjectHash:'a'.repeat(64)}}));
 const fetcher=vi.fn(async(path:RequestInfo|URL,init?:RequestInit)=>path==='/api/explore?path=bank'?(available?b.response(init?.method):new Response(null,{status:503})):new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const {readPreparedBankCatalog}=await import('../src/receiz/prepared-bank-catalog'),{usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),{useMarketDisplaySource}=await import('../src/receiz/market-projection/display-source'),root=createRoot(document.createElement('div')),renders:Array<[string,string|null,string,string|null,string]>=[];
 function Probe(){const market=usePublicMarket(true,false),chart=useMarketCapitalization('ALL',false,market.historyCatalog,true),source=useMarketDisplaySource();renders.push([market.historyCatalog?.items[0].title??'pending',chart.source?.proofObjectHash??null,market.status,source?.proofObjectHash??null,chart.status]);return null;}
 try{await act(async()=>{await readPreparedBankCatalog();root.render(<Probe/>);});expect(renders.at(-1)).toEqual(['Held B','b'.repeat(64),'live','b'.repeat(64),'live']);
  available=false;await act(async()=>{window.dispatchEvent(new Event('online'));await readPreparedBankCatalog();});
  expect(renders.at(-1)).toEqual(['Held B','b'.repeat(64),'stale','b'.repeat(64),'cached']);expect(renders.some(([title,hash,,cap])=>title==='Held B'&&(hash!=='b'.repeat(64)||cap!=='b'.repeat(64)))).toBe(false);
  expect(fetcher.mock.calls.map(([path,init])=>[path,init?.method])).toEqual([['/api/explore?path=bank','GET'],['/api/explore?path=bank','HEAD']]);
 }finally{act(()=>root.unmount());}
});
it('keeps the complete held B list and chart while a changed HEAD waits for C, then publishes C atomically',async()=>{
 const b=await packet('Held B'),c=await packet('Next C','e'.repeat(64));let changed=false,finish!:(response:Response)=>void;
 const fetcher=vi.fn(async(path:RequestInfo|URL,init?:RequestInit)=>{expect(path).toBe('/api/explore?path=bank');if(!changed)return b.response(init?.method);if(init?.method==='HEAD')return c.response('HEAD');return new Promise<Response>(resolve=>{finish=resolve;});});vi.stubGlobal('fetch',fetcher);
 const {readPreparedBankCatalog,preparedBankCatalogState}=await import('../src/receiz/prepared-bank-catalog'),{usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),root=createRoot(document.createElement('div'));let latest!:ReturnType<typeof usePublicMarket>;const seen:Array<[string,string|null,string,string]>=[];
 function Probe(){const market=usePublicMarket(true,false),chart=useMarketCapitalization('ALL',false,market.historyCatalog,true);latest=market;seen.push([market.catalog?.items[0].title??'pending',chart.source?.proofObjectHash??null,market.status,market.quoteStatus]);return null;}
 try{await act(async()=>{await readPreparedBankCatalog();root.render(<Probe/>);});const held=latest.historyCatalog,packetB=preparedBankCatalogState().value;expect(seen.at(-1)).toEqual(['Held B','b'.repeat(64),'live','fresh']);
  changed=true;await act(async()=>{void latest.refresh();});expect(typeof finish).toBe('function');expect(preparedBankCatalogState()).toMatchObject({phase:'pending',value:packetB});expect(latest.historyCatalog).toBe(held);expect(seen.at(-1)).toEqual(['Held B','b'.repeat(64),'stale','stale']);
  await act(async()=>{finish(c.response());await readPreparedBankCatalog();});expect(seen.at(-1)).toEqual(['Next C','e'.repeat(64),'live','fresh']);expect(seen.some(([title,hash])=>title==='Next C'&&hash!=='e'.repeat(64))).toBe(false);expect(fetcher.mock.calls.map(([,init])=>init?.method)).toEqual(['GET','HEAD','GET']);
 }finally{act(()=>root.unmount());}
});
