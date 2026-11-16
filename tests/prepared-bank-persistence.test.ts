// @vitest-environment happy-dom
import {expect,it,vi,afterEach} from 'vitest';
import {gzipSync,strToU8} from 'fflate';
import {createPreparedBankCatalogReader,PREPARED_BANK_CATALOG_PATH} from '../src/receiz/prepared-bank-catalog';
import {publicMarketDocumentSeedScript,type PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import history from '../public/receiz-public-share-chart-history.json';
import capitalization from '../public/receiz-public-capitalization.json';
afterEach(()=>vi.restoreAllMocks());
const digest=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',strToU8(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
async function packet(title:string,generation='b'.repeat(64)){
 const catalog=parsePublicMarket({ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:title},publicOriginals:[{id:'synthetic-prepared-original',receizId:'synthetic-prepared-original',title,valueUsd:250,profileOriginal:{hasPbiSignature:true}}]}}),cap=parseMarketCapSource(capitalization);
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation,path:'bank',catalog,visibleCount:1,asOfPulse:Math.max(history.summary.serverPulse,cap.serverPulse),format:{locale:'en-US',timeZone:'UTC'},history:history as PublicMarketDocumentSeed['history'],capitalization:cap};
 const raw=strToU8(JSON.stringify(catalog)),gzipB64u=Buffer.from(gzipSync(raw)).toString('base64url'),body='<!doctype html><html><body>'+publicMarketDocumentSeedScript(seed,{gzipB64u,bytes:raw.length})+'</body></html>';
 const headers={'content-type':'text/html; charset=utf-8','x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'c'.repeat(64),'x-receiz-public-html-sha256':await digest(body),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'d'.repeat(64)};
 return{body,headers,response:(method='GET')=>new Response(method==='HEAD'?null:body,{headers})};
}

function storage(initial:Response|null=null){
 let saved=initial;
 const port={read:vi.fn(async()=>saved?.clone()??null),write:vi.fn(async(response:Response)=>{saved=response.clone();}),discard:vi.fn(async()=>{saved=null;})};
 return port;
}
it('retains only a fully accepted public Bank response without delaying its visible state',async()=>{
 const p=await packet('Durable C'),cache=storage();let finish!:()=>void;
 cache.write.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const fetcher=vi.fn(async(_path:string,_init:RequestInit)=>p.response()),reader=createPreparedBankCatalogReader(fetcher,undefined,cache),accepted=await reader.read();
 expect(fetcher).toHaveBeenCalledExactlyOnceWith(PREPARED_BANK_CATALOG_PATH,expect.objectContaining({method:'GET',credentials:'omit'}));
 expect(accepted?.seed.catalog.items[0].title).toBe('Durable C');expect(cache.write).toHaveBeenCalledOnce();expect(typeof finish).toBe('function');
 const response=cache.write.mock.calls[0][0];expect(await response.clone().text()).toBe(p.body);expect(response.headers.get('x-receiz-public-html-sha256')).toBe(p.headers['x-receiz-public-html-sha256']);
 finish();expect(reader.getSnapshot().value).toBe(accepted);
});
it('restores the exact saved full family as historical display before any Source request',async()=>{
 const p=await packet('Saved C'),cache=storage(p.response()),fetcher=vi.fn(()=>new Promise<Response>(()=>{})),reader=createPreparedBankCatalogReader(fetcher,undefined,cache);
 const held=await reader.bootstrap();expect(held?.seed.catalog.items[0].title).toBe('Saved C');expect(held?.history).toBeDefined();expect(held?.capitalization).toBeDefined();
 expect(reader.getSnapshot()).toMatchObject({phase:'carried',value:null});expect(held?.identity?.bodySha256).toBe(p.headers['x-receiz-public-html-sha256']);expect(fetcher).not.toHaveBeenCalled();expect(cache.read).toHaveBeenCalledOnce();
});
it('qualifies a restored exact family with one matching HEAD and no second decode or hash',async()=>{
 const p=await packet('Saved C'),cache=storage(p.response()),fetcher=vi.fn(async(_path:string,init:RequestInit)=>p.response(init.method)),reader=createPreparedBankCatalogReader(fetcher,undefined,cache),held=(await reader.bootstrap())!;
 expect(held).not.toBeNull();const parse=vi.spyOn(JSON,'parse'),hash=vi.spyOn(crypto.subtle,'digest'),current=await reader.read();
 expect(current?.seed).toBe(held.seed);expect(current?.capitalization).toBe(held.capitalization);expect(current?.history).toBe(held.history);expect(current?.receipt.state).toBe('current');expect(fetcher.mock.calls.map(([,init])=>init.method)).toEqual(['HEAD']);expect(parse).not.toHaveBeenCalled();expect(hash).not.toHaveBeenCalled();expect(cache.write).not.toHaveBeenCalled();
});
it('does not save refused or altered new input and keeps the prior accepted local packet',async()=>{
 const p=await packet('Held B'),cache=storage(p.response());let changed=false;
 const reader=createPreparedBankCatalogReader(async(_path,init)=>changed?new Response(p.body+'altered',{headers:p.headers}):p.response(init.method),undefined,cache);
 const held=(await reader.bootstrap())!;expect(held).not.toBeNull();await reader.read();changed=true;await reader.read();
 expect(reader.getSnapshot().value?.seed).toBe(held.seed);expect(cache.write).not.toHaveBeenCalled();expect(cache.discard).not.toHaveBeenCalled();
});
it('ignores corrupt or incomplete saved responses and uses the existing new-input reader',async()=>{
 const p=await packet('Valid C');for(const response of [new Response(p.body+'changed',{headers:p.headers}),new Response(p.body,{headers:{...p.headers,'content-length':String(p.body.length+1)}}),new Response(null,{status:503})]){
  const cache=storage(response),fetcher=vi.fn(async()=>p.response()),reader=createPreparedBankCatalogReader(fetcher,undefined,cache);
  expect(await reader.bootstrap()).toBeNull();expect(cache.discard).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
  expect((await reader.read())?.seed.catalog.items[0].title).toBe('Valid C');expect(fetcher).toHaveBeenCalledOnce();
 }
});
it('keeps missing or unavailable local cache optional and makes no Source call during bootstrap',async()=>{
 const p=await packet('Current C');for(const cache of [storage(),{...storage(),read:vi.fn(async()=>{throw Error('storage unavailable');})}]){
  const fetcher=vi.fn(async()=>p.response()),reader=createPreparedBankCatalogReader(fetcher,undefined,cache);
  expect(await reader.bootstrap()).toBeNull();expect(reader.getSnapshot().value).toBeNull();expect(fetcher).not.toHaveBeenCalled();expect((await reader.read())?.seed.catalog.items[0].title).toBe('Current C');
 }
});
it('cannot let a late disk restore replace a public family accepted meanwhile',async()=>{
 const b=await packet('Disk B'),d=await packet('Accepted D','e'.repeat(64)),cache=storage();let finish!:(value:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const reader=createPreparedBankCatalogReader(async()=>new Response(null,{status:503}),undefined,cache);
 const {preparePublicMarketSeedText}=await import('../src/receiz/public-market-document-seed');
 const text=d.body.match(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>/)![1],seed=(await preparePublicMarketSeedText(text))!;
 expect(reader.adoptDocument(seed,()=>{})).not.toBeNull();expect(typeof finish).toBe('function');finish(b.response());await reader.bootstrap();expect(reader.getSnapshot().carried?.seed).toBe(seed);expect(reader.getSnapshot().carried?.seed.catalog.items[0].title).toBe('Accepted D');
});
it('prefers the already-carried document over an older disk copy without a second cache read',async()=>{
 const p=await packet('Carried C'),old=await packet('Old disk A','a'.repeat(64)),cache=storage(old.response()),seedText=p.body.match(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>/)![1];
 const reader=createPreparedBankCatalogReader(async()=>new Response(null,{status:503}),{seedText,hint:{generation:p.headers['x-receiz-public-material-revision'],build:p.headers['x-receiz-public-render-build'],bodySha256:p.headers['x-receiz-public-html-sha256']}},cache);
 expect((await reader.bootstrap())?.seed.catalog.items[0].title).toBe('Carried C');expect(cache.read).not.toHaveBeenCalled();
});
it('keeps accepted Source state ready when optional persistence throws synchronously',async()=>{
 const p=await packet('Accepted despite unavailable cache'),cache=storage();cache.write.mockImplementation(()=>{throw Error('storage unavailable');});
 const reader=createPreparedBankCatalogReader(async()=>p.response(),undefined,cache),accepted=await reader.read();
 expect(accepted?.seed.catalog.items[0].title).toBe('Accepted despite unavailable cache');expect(reader.getSnapshot().phase).toBe('ready');
});
it('can reuse verified saved bytes under a new renderer using only the matching Source HEAD',async()=>{
 const p=await packet('Stable inert data'),cache=storage(p.response()),fetcher=vi.fn(async(_path:string,init:RequestInit)=>new Response(init.method==='HEAD'?null:p.body,{headers:{...p.headers,'x-receiz-public-render-build':'e'.repeat(64)}})),reader=createPreparedBankCatalogReader(fetcher,undefined,cache),held=(await reader.bootstrap())!;
 const hash=vi.spyOn(crypto.subtle,'digest'),next=await reader.read();expect(next?.seed).toBe(held.seed);expect(next?.receipt.build).toBe('e'.repeat(64));expect(fetcher.mock.calls.map(([,init])=>init.method)).toEqual(['HEAD']);expect(hash).not.toHaveBeenCalled();
});
it('restores the complete saved Market and chart before first Market activation without blocking Account or fetching Source',async()=>{
 vi.resetModules();globalThis.history.replaceState(null,'','/');localStorage.clear();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const p=await packet('Saved complete cold Market');let finish!:(response:Response)=>void;
 const cache={match:vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})),put:vi.fn(async()=>{}),delete:vi.fn(async()=>true)};
 vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});const fetcher=vi.fn(async()=>{throw Error('Source deliberately unavailable');});vi.stubGlobal('fetch',fetcher);
 const {act,createElement}=await import('react'),{createRoot}=await import('react-dom/client');
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{prepareCarriedBankCatalog,preparedBankCatalogState}=await import('../src/receiz/prepared-bank-catalog'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization');
 const host=document.createElement('div'),root=createRoot(host),firstMarket:Array<{title:string;points:number;status:string}>=[];
 function Probe({active}:{active:boolean}){const market=usePublicMarket(active,false),chart=useMarketCapitalization('ALL',false,market.historyCatalog,active);if(active)firstMarket.push({title:market.catalog?.items[0]?.title??'missing',points:chart.points.length,status:market.status});return createElement('p',null,active?market.catalog?.items[0]?.title??'missing':'Account is immediately available');}
 try{
  await vi.waitFor(()=>expect(typeof finish).toBe('function'));await act(async()=>root.render(createElement(Probe,{active:false})));expect(host.textContent).toBe('Account is immediately available');expect(fetcher).not.toHaveBeenCalled();
  await act(async()=>{finish(p.response());await prepareCarriedBankCatalog();});expect(preparedBankCatalogState().value).toBeNull();
  await act(async()=>root.render(createElement(Probe,{active:true})));expect(host.textContent).toBe('Saved complete cold Market');expect(firstMarket.length).toBeGreaterThan(0);expect(firstMarket.every(value=>value.title==='Saved complete cold Market'&&value.points>0&&value.status==='stale')).toBe(true);expect(fetcher).not.toHaveBeenCalled();expect(cache.match).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});


const rawMembership=(title:string,empty=false)=>({ok:true,transport:{publicOriginals:empty?[]:[{id:'retained-original',receizId:'retained-original',title}],publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:empty?0:1,revision:title}}});
async function initialSeed(title='Shipped A',generation='a'.repeat(64)){
 const p=await packet(title,generation),{preparePublicMarketSeedText}=await import('../src/receiz/public-market-document-seed');
 return (await preparePublicMarketSeedText(p.body.match(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>/)![1]))!;
}
async function freshRawReader(){
 vi.resetModules();document.body.innerHTML='<script id="receiz-navigation" type="application/json">{}</script>';localStorage.clear();
 const fetcher=vi.fn(async()=>{throw Error('Source must not be opened');});vi.stubGlobal('fetch',fetcher);
 const module=await import('../src/receiz/prepared-bank-catalog'),adoption=await import('../src/receiz/asset-publication-adoption');
 return{module,adoption,fetcher};
}
it.each([false,true])('restores the selected raw cache over its initial shipped fallback, including empty=%s',async empty=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),cache=storage();let finish!:(response:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);let displayed:PublicMarketDocumentSeed|undefined;
 try{
  expect(reader.adoptDocument(seed,display=>{displayed=display.seed;},undefined,{initialDocument:true})).not.toBeNull();
  expect(displayed).toBe(seed);expect(reader.getSnapshot().bootstrapping).toBe(true);adoption.publishDiscoveredPublicCatalog(seed.catalog);
  finish(Response.json(rawMembership('Retained B',empty)));await reader.bootstrap();
  const selected=adoption.retainedDiscoveredPublicCatalog()!;expect(selected.observedAt).toBeNull();expect(selected.items.map(row=>row.title)).toEqual(empty?[]:['Retained B']);
  expect(reader.getSnapshot().bareCatalog).toBe(selected);expect(reader.getSnapshot().value).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
it('keeps raw cache selected when it finishes before the initial shipped document is mounted',async()=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),reader=module.createPreparedBankCatalogReader(fetcher,undefined,storage(Response.json(rawMembership('Retained B'))));
 try{
  await reader.bootstrap();const selected=adoption.retainedDiscoveredPublicCatalog();expect(selected?.items[0].title).toBe('Retained B');
  const accept=vi.fn();expect(reader.adoptDocument(seed,accept,undefined,{initialDocument:true})).toBeNull();expect(accept).not.toHaveBeenCalled();expect(adoption.retainedDiscoveredPublicCatalog()).toBe(selected);expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
it.each([false,true])('rejects delayed raw cache after a genuine document replaces the initial fallback, including empty=%s',async empty=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),c={...await initialSeed('Genuine C','c'.repeat(64)),catalog:parsePublicMarket(rawMembership('Genuine C',empty))},cache=storage();let finish!:(response:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);
 try{
  reader.adoptDocument(seed,()=>{},undefined,{initialDocument:true});adoption.publishDiscoveredPublicCatalog(seed.catalog);
  expect(reader.adoptDocument(c,()=>{})).not.toBeNull();adoption.publishDiscoveredPublicCatalog(c.catalog);
  const old=Response.json(rawMembership('Retained B')),json=vi.spyOn(old,'json');finish(old);await reader.bootstrap();
  expect(reader.getSnapshot().carried?.seed).toBe(c);expect(adoption.retainedDiscoveredPublicCatalog()?.items.map(row=>row.title)).toEqual(empty?[]:['Genuine C']);expect(json).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
it('rejects delayed raw cache after a genuinely selected RAM membership supersedes its initial fallback',async()=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),cache=storage();let finish!:(response:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);
 try{
  reader.adoptDocument(seed,()=>{},undefined,{initialDocument:true});adoption.publishDiscoveredPublicCatalog(seed.catalog);
  const c=parsePublicMarket(rawMembership('RAM C'));adoption.publishDiscoveredPublicCatalog(c);const selected=adoption.retainedDiscoveredPublicCatalog();
  const old=Response.json(rawMembership('Retained B')),json=vi.spyOn(old,'json');finish(old);await reader.bootstrap();
  expect(adoption.retainedDiscoveredPublicCatalog()).toBe(selected);expect(json).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
it('rebases accepted header and privacy changes onto raw cache membership restored over an initial fallback',async()=>{
 const {module,adoption,fetcher}=await freshRawReader(),base=await initialSeed(),cache=storage();let finish!:(response:Response)=>void;
 const head=(n:number,bio:string)=>({profile:{userId:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),username:'person_'+n,isPrivate:false,bio},viewer:{canView:true as const},stats:{}});
 const first=head(1,'Initial biography'),second=head(2,'Public at boot'),seed={...base,catalog:{...base.catalog,publicProfileHeads:[first,second]}};
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);
 try{
  reader.adoptDocument(seed,()=>{},undefined,{initialDocument:true});adoption.publishDiscoveredPublicCatalog(seed.catalog);
  adoption.publishDiscoveredPublicCatalog({...seed.catalog,publicProfileHeads:[head(1,'Accepted new biography')],publicProfileHeadRefusals:[{profile:{userId:second.profile.userId,username:second.profile.username},viewer:{canView:false}}]});
  const input={...rawMembership('Retained B'),transport:{...rawMembership('Retained B').transport,publicProfileHeads:[first,second]}};finish(Response.json(input));await reader.bootstrap();
  const selected=adoption.retainedDiscoveredPublicCatalog()!;expect(selected.items[0].title).toBe('Retained B');expect(selected.publicProfileHeads?.find(row=>row.profile.userId===first.profile.userId)?.profile.bio).toBe('Accepted new biography');expect(selected.publicProfileHeadRefusals?.[0].profile.userId).toBe(second.profile.userId);expect(selected.publicProfileHeads?.some(row=>row.profile.userId===second.profile.userId)).toBe(false);expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});

it('keeps the initial shipped fallback over an older full HTML cache without fabricating a receipt',async()=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),older=await packet('Older saved HTML','e'.repeat(64)),cache=storage();let finish!:(response:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);
 try{
  reader.adoptDocument(seed,()=>{},undefined,{initialDocument:true});adoption.publishDiscoveredPublicCatalog(seed.catalog);finish(older.response());await reader.bootstrap();
  expect(reader.getSnapshot().carried?.seed).toBe(seed);expect(reader.getSnapshot().value).toBeNull();expect(adoption.retainedDiscoveredPublicCatalog()).toBe(seed.catalog);expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
it('restores durable membership after quote-only decoration of the initial shipped fallback',async()=>{
 const {module,adoption,fetcher}=await freshRawReader(),seed=await initialSeed(),cache=storage();let finish!:(response:Response)=>void;
 cache.read.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));const reader=module.createPreparedBankCatalogReader(fetcher,undefined,cache);
 try{
  reader.adoptDocument(seed,()=>{},undefined,{initialDocument:true});adoption.publishDiscoveredPublicCatalog(seed.catalog);
  adoption.publishDiscoveredPublicCatalog({...seed.catalog,items:seed.catalog.items.map(item=>({...item,priceUsd:4,chart:[3,4]}))});
  const input=rawMembership('Retained B');input.transport.publicOriginals=[{id:'synthetic-prepared-original',receizId:'synthetic-prepared-original',title:'Retained B'},{id:'new-original',receizId:'new-original',title:'New Original'}];input.transport.publicMembership.itemCount=2;
  finish(Response.json(input));await reader.bootstrap();const selected=adoption.retainedDiscoveredPublicCatalog()!;
  expect(selected.revision).toBe('Retained B');expect(selected.items.map(row=>row.title)).toEqual(['Retained B','New Original']);expect(selected.items[0].chart).toEqual([3,4]);expect(selected.items[0].priceUsd).toBe(4);expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();document.body.innerHTML='';localStorage.clear();}
});
