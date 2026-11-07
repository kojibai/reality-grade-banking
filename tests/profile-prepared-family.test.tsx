// @vitest-environment happy-dom
import {act} from 'react';
import type {Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import capInput from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
import type {PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
const state=vi.hoisted(()=>({delivery:vi.fn(),prepared:vi.fn(async()=>new Response(null,{status:503})),roots:[] as Root[],creates:0,hydrates:0}));
vi.mock('../server/prepared-public-document',()=>({handlePreparedPublicDocument:state.delivery}));
vi.mock('../server/prepared-public-market',()=>({handlePreparedPublicMarket:state.prepared}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return{...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>{state.creates++;const root=actual.createRoot(...args);state.roots.push(root);return root;},hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{state.hydrates++;const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<div id="root"><input value="Existing Bank draft"/><nav class="bottom-nav">Existing Bank navigation</nav></div><script id="receiz-navigation" type="application/json">{}</script>';state.delivery.mockReset();});
afterEach(async()=>{for(const root of state.roots.splice(0))await act(()=>root.unmount());state.creates=0;state.hydrates=0;vi.unstubAllGlobals();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
async function savedFamily(){
 const {parsePublicMarket}=await import('../src/receiz/public-market'),{parseMarketCapSource}=await import('../src/receiz/market-projection/source'),{publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed');
 const ids=Array.from({length:613},(_,i)=>i===612?'new-original':'prior-'+i),rows=ids.map((id,i)=>({id:'profile:bjklock:'+id,receizId:id,title:i===612?'The Money Is Ready. The Banks Can Catch Up.':'Held Original '+i,valueUsd:10,pulse:String(14700000+i),createdAt:i===612?'2026-11-07T12:00:00Z':'2026-11-02T12:00:00Z',ownerUsername:'bjklock',ownerUserId:'owner',ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{hasPbiSignature:true,pbiReceiptHash:'d'.repeat(64),media:{kind:'image',originalDownloadSha256Hex:i===612?'a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc':'a'.repeat(64)}}}));
 const snapshot={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:rows.map(row=>({itemId:row.id,visibility:'public',priceUsd:10,quoteUsdPerPhi:1,shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:row.id,assetId:row.receizId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'2000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'}}))}};
 const catalog=parsePublicMarket({ok:true,transport:{generatedAt:'2026-11-07T12:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:613,revision:'accepted-owner-append'},publicOriginals:rows,publicProfileHeads:[{profile:{userId:'owner',username:'bjklock',displayName:'BJ Klock',bio:'Same accepted public header',isPrivate:false,createdAt:'2026-01-01T00:00:00Z'},viewer:{canView:true,isSignedIn:false,isOwner:false,canEdit:false},stats:{originals:613,signedOriginals:613}}]}},snapshot),capitalization=parseMarketCapSource(capInput);
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',path:'explore',generation:'b'.repeat(64),catalog,capitalization,history:historyInput as PublicMarketDocumentSeed['history'],visibleCount:50,asOfPulse:Math.max(capitalization.serverPulse,historyInput.summary.serverPulse),format:{locale:'en-US',timeZone:'UTC'}};
 const script=publicMarketDocumentSeedScript(seed),html='<html><head><title>Explore</title></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Saved Explore content</main></div>'+script+'<script id="receiz-navigation" type="application/json">{}</script></body></html>';
 return{seed,script,html};
}
it('opens the browser profile from the existing saved complete-family selector, carrying its exact seed without a profile or freshness read',async()=>{
 const saved=await savedFamily();state.delivery.mockResolvedValue(new Response(saved.html,{headers:{'content-type':'text/html','x-receiz-public-html-state':'current'}}));
 const fetcher=vi.fn(()=>{throw Error('EXTRA_SOURCE_READ_FORBIDDEN');});vi.stubGlobal('fetch',fetcher);
 const {handleProfilePreview}=await import('../server/profile-preview');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock?fbclid=share',{headers:{accept:'text/html','user-agent':'Profile browser'}})),body=await response.text();
 expect(response.status).toBe(200);expect(state.delivery).toHaveBeenCalledOnce();const request=state.delivery.mock.calls[0][0] as Request;
 expect(request.method).toBe('GET');expect(new URL(request.url).pathname).toBe('/api/explore');expect(new URL(request.url).searchParams.get('path')).toBe('explore');expect(request.headers.has('cookie')).toBe(false);
 expect(body).toContain(saved.script);expect(body).toContain('data-public-profile-entry="bjklock"');expect(body).not.toContain('Saved Explore content');expect(body).not.toContain('public-profile-error');expect(fetcher).not.toHaveBeenCalled();
});
it.each([false,true])('renders all 613 Originals from the selected family without reading Source or replacing a newer held family (%s)',async newerHeld=>{
 const saved=await savedFamily();let delivered=saved.html;
 if(newerHeld){const {publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed'),stale={...saved.seed,generation:'c'.repeat(64),catalog:{...saved.seed.catalog,items:saved.seed.catalog.items.slice(0,612),sourceCount:612}};delivered=delivered.replace(saved.script,publicMarketDocumentSeedScript(stale));}
 state.delivery.mockResolvedValue(new Response(delivered,{headers:{'content-type':'text/html','x-receiz-public-html-state':'current'}}));
 vi.stubGlobal('Worker',undefined);const fetcher=vi.fn(()=>{throw Error('EXTRA_SOURCE_READ_FORBIDDEN');});vi.stubGlobal('fetch',fetcher);
 if(newerHeld){const {adoptPublicMarketDocument}=await import('../src/receiz/usePublicMarket');adoptPublicMarketDocument(saved.seed);}
 const explorer=await import('../src/public-explorer/PublicExplorer'),render=explorer.PublicExplorer,paints:unknown[]=[];vi.spyOn(explorer,'PublicExplorer').mockImplementation(props=>{if(props.initialSource)paints.push(props.initialSource.catalog);return render(props);});
 const main=await import('../src/public-explorer/main'),{handleProfilePreview}=await import('../server/profile-preview');
 const response=await handleProfilePreview(new Request('https://bankeiz.com/bjklock/',{headers:{accept:'text/html','user-agent':'Profile browser'}})),body=await response.text(),bank=document.getElementById('root')!,draft=bank.querySelector('input');
 const parsed=new DOMParser().parseFromString(body,'text/html'),host=document.importNode(parsed.getElementById('public-explore-root')!,true);document.getElementById('receiz-navigation')!.remove();document.body.append(host);for(const id of ['public-market-seed','receiz-navigation'])document.body.append(document.importNode(parsed.getElementById(id)!,true));
 history.replaceState(null,'','/bjklock/');const documents=await import('../src/receiz/public-market-document-seed'),selected=documents.readPublicMarketDocumentSeed()!;
 await act(async()=>{main.mountPublicDocument(host);});
 expect(host.querySelector('h1')?.textContent).toBe('BJ Klock');expect(host.textContent).toContain('Same accepted public header');expect(host.textContent).toContain(saved.seed.catalog.items.at(-1)!.title);expect(host.textContent).toContain('613 displayed originals');expect(host.querySelector('.public-market-nav')).toBeNull();
 const reader=await import('../src/receiz/prepared-bank-catalog'),held=(reader.preparedBankCatalogState().value??reader.preparedBankCatalogState().carried)!.seed;
 expect(held=== (newerHeld?saved.seed:selected)).toBe(true);expect(paints[0]===held.catalog).toBe(true);expect(held.catalog.items).toHaveLength(613);expect(held.catalog.items.at(-1)?.originalDigest).toBe('a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc');expect(held.catalog.items.at(-1)?.shareInventory?.outstandingShareQuantityMicro).toBe('1000000');
 const {publicShareCapitalization}=await import('../src/receiz/market-share-inventory');expect(publicShareCapitalization(held.catalog)).toMatchObject({usdCents:'1839000',covered:613,complete:true});
 await act(async()=>{main.mountPublicDocument(host);});expect(state.creates).toBe(1);expect(state.hydrates).toBe(0);expect(document.getElementById('root')).toBe(bank);expect(bank.querySelector('input')).toBe(draft);expect(bank.querySelector('.bottom-nav')?.textContent).toBe('Existing Bank navigation');expect(fetcher).not.toHaveBeenCalled();
});
