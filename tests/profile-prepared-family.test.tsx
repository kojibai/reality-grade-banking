// @vitest-environment happy-dom
import {act} from 'react';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import capInput from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
import type {PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
const state=vi.hoisted(()=>({delivery:vi.fn(),staticPage:vi.fn(),prepared:vi.fn(async(_request:Request)=>new Response(null,{status:503})),roots:[] as Root[],creates:0,hydrates:0}));
vi.mock('node:fs/promises',()=>({readFile:state.staticPage}));
vi.mock('../server/prepared-public-market',()=>({handlePreparedPublicMarket:state.prepared}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return{...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>{state.creates++;const root=actual.createRoot(...args);state.roots.push(root);return root;},hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{state.hydrates++;const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<div id="root"><input value="Existing Bank draft"/><nav class="bottom-nav">Existing Bank navigation</nav></div><script id="receiz-navigation" type="application/json">{}</script>';state.delivery.mockReset();state.staticPage.mockReset();state.prepared.mockReset();state.prepared.mockImplementation(()=>new Promise<Response>(()=>{}));});
afterEach(async()=>{vi.useRealTimers();for(const root of state.roots.splice(0))await act(()=>root.unmount());state.creates=0;state.hydrates=0;vi.unstubAllGlobals();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
async function savedFamily(){
 const {parsePublicMarket}=await import('../src/receiz/public-market'),{parseMarketCapSource}=await import('../src/receiz/market-projection/source'),{publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed');
 const ids=Array.from({length:613},(_,i)=>i===612?'new-original':'prior-'+i),rows=ids.map((id,i)=>({id:'profile:bjklock:'+id,receizId:id,title:i===612?'The Money Is Ready. The Banks Can Catch Up.':'Held Original '+i,valueUsd:10,pulse:String(14700000+i),createdAt:i===612?'2026-11-07T12:00:00Z':'2026-11-02T12:00:00Z',ownerUsername:'bjklock',ownerUserId:'owner',ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{hasPbiSignature:true,pbiReceiptHash:'d'.repeat(64),media:{kind:'image',originalDownloadSha256Hex:i===612?'a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc':'a'.repeat(64)}}}));
 const snapshot={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:rows.map(row=>({itemId:row.id,visibility:'public',priceUsd:10,quoteUsdPerPhi:1,shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:row.id,assetId:row.receizId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'2000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'}}))}};
 const wire={ok:true,transport:{generatedAt:'2026-11-07T12:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:613,revision:'accepted-owner-append'},publicOriginals:rows,publicProfileHeads:[{profile:{userId:'owner',username:'bjklock',displayName:'BJ Klock',bio:'Same accepted public header',isPrivate:false,createdAt:'2026-01-01T00:00:00Z'},viewer:{canView:true,isSignedIn:false,isOwner:false,canEdit:false},stats:{originals:613,signedOriginals:613}}]}};const catalog=parsePublicMarket(wire,snapshot),capitalization=parseMarketCapSource(capInput);
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',path:'explore',generation:'b'.repeat(64),catalog,capitalization,history:historyInput as PublicMarketDocumentSeed['history'],visibleCount:50,asOfPulse:Math.max(capitalization.serverPulse,historyInput.summary.serverPulse),format:{locale:'en-US',timeZone:'UTC'}};
 const script=publicMarketDocumentSeedScript(seed),html='<html><head><title>Explore</title></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Saved Explore content</main></div>'+script+'<script id="receiz-navigation" type="application/json">{}</script></body></html>';
 return{seed,script,html,wire};
}
it('opens the complete held profile without checking a prepared-page API',async()=>{
 const saved=await savedFamily();state.staticPage.mockResolvedValue(saved.html);
 const fetcher=vi.fn(()=>{throw Error('EXTRA_SOURCE_READ_FORBIDDEN');});vi.stubGlobal('fetch',fetcher);
 const {handleProfilePreview}=await import('../server/profile-preview');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock?fbclid=share',{headers:{accept:'text/html','user-agent':'Profile browser'}}),{profile:state.delivery,page:()=>state.staticPage('dist/explore/index.html','utf8')}),body=await response.text();
 expect(response.status).toBe(200);expect(state.delivery).not.toHaveBeenCalled();expect(state.staticPage).toHaveBeenCalledWith('dist/explore/index.html','utf8');expect(state.prepared).not.toHaveBeenCalled();
 expect(body).toContain(saved.script);expect(body).toContain('data-public-profile-entry="bjklock"');expect(body).not.toContain('Saved Explore content');expect(body).not.toContain('public-profile-error');expect(fetcher).not.toHaveBeenCalled();
});
it.each([false,true])('renders all 613 Originals from the selected family without reading Source or replacing a newer held family (%s)',async newerHeld=>{
 const saved=await savedFamily();let delivered=saved.html;
 if(newerHeld){const {publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed'),stale={...saved.seed,generation:'c'.repeat(64),catalog:{...saved.seed.catalog,items:saved.seed.catalog.items.slice(0,612),sourceCount:612}};delivered=delivered.replace(saved.script,publicMarketDocumentSeedScript(stale));}
 state.staticPage.mockResolvedValue(delivered);
 vi.stubGlobal('Worker',undefined);const fetcher=vi.fn(()=>{throw Error('EXTRA_SOURCE_READ_FORBIDDEN');});vi.stubGlobal('fetch',fetcher);
 if(newerHeld){const {adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(saved.seed);}
 const explorer=await import('../src/public-explorer/PublicExplorer'),render=explorer.PublicExplorer,paints:unknown[]=[];vi.spyOn(explorer,'PublicExplorer').mockImplementation(props=>{if(props.initialSource)paints.push(props.initialSource.catalog);return render(props);});
 const main=await import('../src/public-explorer/main'),{handleProfilePreview}=await import('../server/profile-preview');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock/',{headers:{accept:'text/html','user-agent':'Profile browser'}}),{profile:state.delivery,page:()=>state.staticPage('dist/explore/index.html','utf8')}),body=await response.text(),bank=document.getElementById('root')!,draft=bank.querySelector('input');
 const parsed=new DOMParser().parseFromString(body,'text/html'),host=document.importNode(parsed.getElementById('public-explore-root')!,true);document.getElementById('receiz-navigation')!.remove();document.body.append(host);for(const id of ['public-market-seed','receiz-navigation'])document.body.append(document.importNode(parsed.getElementById(id)!,true));
 history.replaceState(null,'','/bjklock/');const documents=await import('../src/receiz/public-market-document-seed'),selected=documents.readPublicMarketDocumentSeed()!;
 await act(async()=>{main.mountPublicDocument(host);});
 expect(host.querySelector('h1')?.textContent).toBe('BJ Klock');expect(host.textContent).toContain('Same accepted public header');expect(host.textContent).toContain(saved.seed.catalog.items.at(-1)!.title);expect(host.textContent).toContain('613 displayed originals');expect(host.querySelector('.public-market-nav')).toBeNull();
 const reader=await import('../src/receiz/prepared-bank-catalog'),held=(reader.preparedBankCatalogState().value??reader.preparedBankCatalogState().carried)!.seed;
 expect(held=== (newerHeld?saved.seed:selected)).toBe(true);expect(paints[0]===held.catalog).toBe(true);expect(held.catalog.items).toHaveLength(613);expect(held.catalog.items.at(-1)?.originalDigest).toBe('a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc');expect(held.catalog.items.at(-1)?.shareInventory?.outstandingShareQuantityMicro).toBe('1000000');
 const {publicShareCapitalization}=await import('../src/receiz/market-share-inventory');expect(publicShareCapitalization(held.catalog)).toMatchObject({usdCents:'1839000',covered:613,complete:true});
 await act(async()=>{main.mountPublicDocument(host);});expect(state.creates).toBe(1);expect(state.hydrates).toBe(0);expect(document.getElementById('root')).toBe(bank);expect(bank.querySelector('input')).toBe(draft);expect(bank.querySelector('.bottom-nav')?.textContent).toBe('Existing Bank navigation');expect(fetcher).not.toHaveBeenCalled();
});

it('appends later complete Showcase membership to the held profile and shared views without a prepared-page read',async()=>{
 vi.useFakeTimers();const saved=await savedFamily(),prior={...saved.seed,generation:'c'.repeat(64),catalog:{...saved.seed.catalog,items:saved.seed.catalog.items.slice(0,612),sourceCount:612}};
 const {adoptPublicMarketDocument,usePublicMarket}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(prior);
 let finish!:(response:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const {createRoot}=await import('react-dom/client'),{selectHeldPublicProfile}=await import('../src/receiz/public-profile');
 let latest!:ReturnType<typeof usePublicMarket>;
 function Profile(){latest=usePublicMarket(false,true,undefined,true);const profile=selectHeldPublicProfile('bjklock',latest.historyCatalog);return <span>{profile?.items.length} displayed originals</span>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(()=>root.render(<Profile/>));
 expect(host.textContent).toBe('612 displayed originals');expect(latest.historyCatalog).toBe(prior.catalog);expect(fetcher).not.toHaveBeenCalled();
 await act(()=>vi.advanceTimersByTimeAsync(60000));expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/bank/public-market/membership',expect.objectContaining({credentials:'omit'}));
 expect(host.textContent).toBe('612 displayed originals');
 await act(()=>finish(Response.json(saved.wire)));
 expect(host.textContent).toBe('613 displayed originals');expect(latest.historyCatalog?.items.at(-1)?.originalDigest).toBe('a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc');
 expect(latest.historyCatalog?.items[0].shareInventory).toEqual(prior.catalog.items[0].shareInventory);
 const source=await import('../src/public-feed/feed-source');expect((await source.prepareFeedItems()).length).toBe(613);
 const marker=document.getElementById('receiz-navigation') as HTMLElement&{publicMarketCatalog:()=>unknown};expect(marker.publicMarketCatalog()).toBe(latest.historyCatalog);
 expect(prior.catalog.items).toHaveLength(612);expect(state.prepared).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledOnce();
});

it('serves and hydrates the real 613-Original profile from the same carried family without a seal or Source reads',async()=>{
 const saved=await savedFamily(),{renderSelectedPublicMarketState}=await import('../server/public-market-document'),{publicMarketDocumentHistory}=await import('../src/receiz/public-market-document-seed');
 const rendered=renderSelectedPublicMarketState({catalog:saved.seed.catalog,history:publicMarketDocumentHistory(saved.seed)!,capitalization:saved.seed.capitalization,asOfPulse:saved.seed.asOfPulse,generation:saved.seed.generation,profileUsername:'bjklock'});
 state.staticPage.mockImplementation(async(path:string)=>path==='dist/explore/index.html'?saved.html:`<!-- bank.profile.document.v1 ${saved.seed.generation} bjklock -->${rendered.content}`);
 vi.stubGlobal('Worker',undefined);const fetcher=vi.fn(()=>{throw Error('EXTRA_SOURCE_READ_FORBIDDEN');});vi.stubGlobal('fetch',fetcher);
 const {handleProfilePreview}=await import('../server/profile-preview'),response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock/',{headers:{accept:'text/html','user-agent':'Profile browser'}}),{profile:state.delivery,page:async()=>saved.html,profileContent:async()=>`<!-- bank.profile.document.v1 ${saved.seed.generation} bjklock -->${rendered.content}`}),body=await response.text();
 const parsed=new DOMParser().parseFromString(body,'text/html'),host=document.importNode(parsed.getElementById('public-explore-root')!,true);
 expect(host.querySelector('h1')?.textContent).toBe('BJ Klock');expect(host.textContent).toContain('613 displayed originals');expect(host.querySelector('a[href="/asset/profile%3Abjklock%3Anew-original/"]')).not.toBeNull();expect(body).not.toContain('profile-opening');expect(body).toContain(saved.script);
 document.getElementById('receiz-navigation')!.remove();document.body.append(host);for(const id of ['public-market-seed','receiz-navigation'])document.body.append(document.importNode(parsed.getElementById(id)!,true));history.replaceState(null,'','/bjklock/');
 const header=host.querySelector('.profile-hero'),errors=vi.spyOn(console,'error'),main=await import('../src/public-explorer/main');
 await act(()=>main.mountPublicDocument(host));expect(host.querySelector('.profile-hero')).toBe(header);expect(state.hydrates).toBe(1);expect(state.creates).toBe(0);expect(host.textContent).toContain('613 displayed originals');expect(errors).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
