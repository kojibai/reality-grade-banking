// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { BankContext } from '../src/core/useBank';
import { createDemoState } from '../src/core/demo';
import { Market } from '../src/features/market/Market';
import { PublicAssetDetail } from '../src/features/market/PublicAssetDetail';
import { parsePublicMarket } from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';

const source = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const capitalization=vi.hoisted(()=>({value:{source:null,points:[],status:'unavailable',historyUpdating:false} as Record<string,unknown>,catalog:null as unknown}));
vi.mock('../src/receiz/market-projection/useMarketCapitalization', () => ({ useMarketCapitalization: (_period:unknown,_active:unknown,catalog:unknown) => {capitalization.catalog=catalog;return capitalization.value;} }));
vi.mock('../src/receiz/usePublicMarket', () => ({ usePublicMarket: () => source.value }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount());capitalization.value={source:null,points:[],status:'unavailable',historyUpdating:false}; document.body.replaceChildren(); localStorage.clear(); history.replaceState({}, '', '#market'); vi.unstubAllGlobals(); });
function mount(mode:'market'|'explorer'='market') {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  const commit = vi.fn(), open = vi.fn();
  const state = createDemoState();
  act(() => root.render(<BankContext.Provider value={{ state, commit, open, close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Market mode={mode} /></BankContext.Provider>));
  return { host, root, commit, open };
}
function catalog(count = 1001) { return parsePublicMarket({ ok: true, transport: { generatedAt: '2026-10-13T12:00:00Z', publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: count, revision: 'r1' }, publicOriginals: Array.from({ length: count }, (_, i) => ({ id: `public-${i}`, receizId: `asset-${i}`, title: `Public object ${i}`, valueUsd: 5, ownerUsername: 'alice', canonicalHref: `/alice/verified/asset-${i}` })) } }); }
it('prioritizes leading artwork without eagerly loading the whole retained list or replacing images on a value update',()=>{
 const held=catalog(50);held.items=held.items.map((item,index)=>({...item,artworkUrl:`https://receiz.com/artwork/list-${index}.png`}));source.value={catalog:held,status:'live',error:null,refresh:vi.fn()};
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);roots.push(root);act(()=>root.render(<Market/>));
 const images=[...host.querySelectorAll<HTMLImageElement>('.market-rows img')];expect(images).toHaveLength(50);expect(images[0].loading).toBe('eager');expect(images.at(-1)!.loading).toBe('lazy');expect(images.filter(image=>image.loading==='eager').length).toBeLessThan(10);
 const urls=images.map(image=>image.src);source.value={...source.value,catalog:{...held,items:held.items.map(item=>({...item,priceUsd:7,localValuationPulse:14720001}))}};act(()=>root.render(<Market/>));
 const updated=[...host.querySelectorAll<HTMLImageElement>('.market-rows img')];expect(updated.every((image,index)=>image===images[index])).toBe(true);expect(updated.map(image=>image.src)).toEqual(urls);expect(host.querySelector('.price-stack')?.textContent).toContain('7.00');
});
it.each(['market','explorer']as const)('populates %s content filters from the original media metadata and places cards in Collectibles',mode=>{
 const kinds=['audio','epub','image','video','pdf',null,null];
 const held=parsePublicMarket({ok:true,transport:{publicOriginals:kinds.map((kind,i)=>({id:'typed-'+i,receizId:'typed-'+i,title:'Typed object '+i,profileOriginal:{media:kind?{kind}:null,hasLongForm:i===5}}))}});
 held.items.push({...held.items[0],id:'collectible',assetId:'rsc_0123456789abcdef',title:'Collectible one',category:'sports'});
 source.value={catalog:held,status:'live',error:null,refresh:vi.fn()};const {host,root}=mount(mode);
 const filters=[...host.querySelectorAll<HTMLButtonElement|HTMLAnchorElement>('.filters button,.filters a')];
 expect(filters.map(button=>button.textContent)).not.toContain('Proofs');expect(filters.map(button=>button.textContent)).not.toContain('Cards');
 const expected:{[label:string]:string}={Music:'Typed object 0',Books:'Typed object 1',Images:'Typed object 2',Videos:'Typed object 3',Documents:'Typed object 4',Essays:'Typed object 5',Moments:'Typed object 6',Collectibles:'Collectible one'};
 for(const [label,title]of Object.entries(expected)){
  const control=filters.find(control=>control.textContent===label);expect(control,label+' filter').toBeTruthy();
  if(mode==='explorer'){expect(control!.getAttribute('href')).toBe(`/explore/${label.toLowerCase()}/`);act(()=>root.render(<Market mode="explorer" publicCategory={{label,description:'Original sources'}}/>));}
  else act(()=>control!.click());
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);expect(host.querySelector('.market-rows')?.textContent).toContain(title);
 }
});
it('scrolls the selected explorer collection instead of the retained hidden bank collection',()=>{
 source.value={catalog:catalog(1),status:'live',error:null,refresh:vi.fn()};
 const bank=mount(),explorer=mount('explorer');bank.host.hidden=true;
 const hiddenScroll=vi.spyOn(bank.host.querySelector('#market-explore')!,'scrollIntoView').mockImplementation(()=>{});
 const visibleScroll=vi.spyOn(explorer.host.querySelector('#market-explore')!,'scrollIntoView').mockImplementation(()=>{});
 act(()=>(explorer.host.querySelector('.market-view-assets')as HTMLButtonElement).click());
 expect(visibleScroll).toHaveBeenCalledOnce();expect(hiddenScroll).not.toHaveBeenCalled();
});
it('retains an explored object through other public routes and restores its route on return',()=>{
 history.replaceState(null,'','/explore/');source.value={catalog:catalog(1),status:'live',error:null,refresh:vi.fn()};
 const {host}=mount('explorer');act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());
 expect(host.querySelector('dialog')).not.toBeNull();
 act(()=>{history.pushState(null,'','/learn/');dispatchEvent(new PopStateEvent('popstate'));});
 act(()=>{history.pushState(null,'','/explore/#object/public-0');dispatchEvent(new Event('receiz-bank:surface'));});
 expect(host.querySelector('dialog')).not.toBeNull();
});
it('opens the same public collection and proof details in the explorer with trade review actions',()=>{
 source.value={catalog:catalog(1),status:'live',error:null,refresh:vi.fn()};
 const {host,open}=mount('explorer');
 expect(host.querySelector('h1')?.textContent).toBe('Explore proof objects');
 expect(host.textContent).not.toContain('Create an asset');
 expect(host.textContent).not.toContain('Exchange');
 act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());
 expect(location.hash).toBe('#object/public-0');
 expect(host.querySelector('dialog')?.textContent).toContain('@alice');
 expect(host.querySelector('dialog')?.textContent).toContain('Buy ownership');
 expect(host.querySelector('dialog')?.textContent).toContain('Take cash');
 expect(open).not.toHaveBeenCalled();
});
it('searches the whole public catalog beyond one thousand while rendering a bounded initial list', () => {
  source.value = { catalog: catalog(), status: 'live', error: null, refresh: vi.fn() };
  const { host } = mount();
  expect(host.textContent).toContain('1,001 assets');
  expect(host.querySelectorAll('.market-rows .asset-row').length).toBeLessThanOrEqual(50);
  const input = host.querySelector('input')!;
  act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, 'Public object 1000'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(host.textContent).toContain('Public object 1000');
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);
});
it('opens public source details without routing a public object into demo ownership or trades', () => {
  source.value = { catalog: catalog(1), status: 'live', error: null, refresh: vi.fn() };
  const { host, commit, open } = mount();
  act(() => (host.querySelector('.market-rows button') as HTMLButtonElement).click());
  expect(host.querySelector('dialog')?.textContent).toContain('Public source');
  expect(host.querySelector('dialog')?.textContent).toContain('@alice');
  expect(host.querySelector('dialog')?.textContent).not.toContain('Not claimed');
  expect(commit).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  expect(host.querySelector('dialog')?.textContent).not.toContain('Preview purchase');
});
it('never falls back to sample assets when the live public source fails', () => {
  source.value = { catalog: null, status: 'error', error: 'Source unavailable', refresh: vi.fn() };
  const { host } = mount();
  expect(host.textContent).toContain('Source unavailable');
  expect(host.textContent).not.toContain('Design archive');
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(0);
});
it('labels retained quote projections as cached instead of live', () => {
  source.value = { catalog: catalog(1), status: 'live', quoteStatus: 'stale', error: null, refresh: vi.fn() };
  const { host } = mount();
  expect(host.textContent).toContain('cached quotes');
  expect(host.textContent).not.toContain('Live public Market');
});
it('keeps local Kai valuation live while reporting an unavailable collection refresh',()=>{
 const held=catalog(1);held.items[0].localValuationPulse=14710100;
 source.value={catalog:held,status:'stale',quoteStatus:'stale',error:'Public prices and charts could not be refreshed.',refresh:vi.fn()};
 const {host}=mount();expect(host.textContent).toContain('Live valuation · retained collection');expect(host.textContent).toContain('Retained pricing inputs continue at the live Kai pulse.');expect(host.textContent).not.toContain('Showing cached quotes');
});
it('shows each carried current owner and sealed time directly in the public list',()=>{
 const held=catalog(2),sealedAt='2026-10-01T12:00:00Z';Object.assign(held.items[0],{ownerUsername:'current_holder',ownerDisplayName:'Current Holder',sealedAt});
 Object.assign(held.items[1],{ownerUsername:null,ownerDisplayName:null,sealedAt:null});
 source.value={catalog:held,status:'live',error:null,refresh:vi.fn()};
 const {host}=mount(),rows=host.querySelectorAll('.market-rows .asset-row');
 expect(rows[0].textContent).toContain('@current_holder');expect(rows[0].textContent).toContain(new Date(sealedAt).toLocaleString());
 expect(rows[1].textContent).toContain('Owner not supplied');expect(rows[1].textContent).toContain('Sealed time not supplied');
});
it('renders recovered birth-only card owners and seal dates without requiring current individual prices',()=>{
 const collectibleId='rsc_0123456789abcdef',claimHash='a'.repeat(64),sealedAt='2026-10-01T12:00:00Z';
 const card={collectibleId,claimHash,cardId:'one',athlete:'Recovered card',sport:'baseball',issuedCount:1,vaultCount:1,pricedCount:0,liveValueUsd:null,totalValueUsd:null,sealedBirths:[{collectibleId,claimHash,sealedAt,birthUsdValue:10,ownerUsername:'recovered_holder',ownerDisplayName:'Recovered Holder'}]};
 source.value={catalog:mergePublicSports(catalog(1),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-18T12:00:00Z',sealedBirthsObservedAt:'2026-10-19T12:00:00Z',cards:[card]}),status:'live',error:null,refresh:vi.fn()};
 const {host}=mount(),row=[...host.querySelectorAll('.market-rows .asset-row')].find(row=>row.textContent?.includes('Recovered card'))!;
 expect(row.textContent).toContain('@recovered_holder');expect(row.textContent).toContain(new Date(sealedAt).toLocaleString());expect(row.textContent).toContain('Value unavailable');
 act(()=>(row as HTMLButtonElement).click());expect(host.querySelector('dialog')?.textContent).toContain('@recovered_holder');
});
it('summarizes actual carried edition owners and seal dates in each row',()=>{
 const collectibleId='rsc_0123456789abcdef',claimHash='a'.repeat(64),first='2026-10-01T12:00:00Z',last='2026-10-02T12:00:00Z',copies=[{collectibleId,claimHash,sealedAt:first,birthUsdValue:10,ownerUsername:'first_holder'},{collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:'b'.repeat(64),sealedAt:last,birthUsdValue:20,ownerUsername:'second_holder'}];
 source.value={catalog:mergePublicSports(catalog(1),{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId,claimHash,athlete:'Edition',sport:'baseball',issuedCount:2,vaultCount:2,pricedCount:0,liveValueUsd:null,totalValueUsd:null,sealedBirths:copies}]}),status:'live',error:null,refresh:vi.fn()};
 const {host}=mount(),row=[...host.querySelectorAll('.market-rows .asset-row')].find(row=>row.textContent?.includes('Edition'))!;
 expect(row.textContent).toContain('@first_holder +1 owner');expect(row.textContent).toContain(new Date(first).toLocaleDateString());expect(row.textContent).toContain(new Date(last).toLocaleDateString());
 act(()=>(row as HTMLButtonElement).click());expect(host.querySelector('dialog')?.textContent).toContain('@second_holder');
});
it('opens exact public card history for its owner and original issue time',async()=>{
 const cardId='rsc_0123456789abcdef',claimHash='a'.repeat(64),held=catalog(1),at='2026-10-01T12:00:00Z';
 Object.assign(held.items[0],{assetId:cardId,category:'sports',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sealedAt:null,sourceUrl:`https://receiz.com/game/sports/card/${cardId}?claimHash=${claimHash}`});
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:true,cardId,claimHash,count:1,provenance:[{collectibleId:cardId,claimHash,eventKind:'issue',appendHash:'b'.repeat(64),occurredAt:at,owner:{username:'actual-owner',displayName:'Actual'}}]})));
 source.value={catalog:held,status:'live',error:null,refresh:vi.fn()};const {host}=mount();await act(async()=>{(host.querySelector('.market-rows button')as HTMLButtonElement).click();});
 expect(host.querySelector('dialog')?.textContent).toContain('@actual-owner');expect(host.querySelector('dialog')?.textContent).toContain(new Date(at).toLocaleString());
});
it('prefers refreshed carried copy ownership over earlier fetched details at the same source URL',async()=>{
 const cardId='rsc_0123456789abcdef',claimHash='d'.repeat(64),sealedAt='2026-10-01T12:00:00Z',item={...catalog(1).items[0],assetId:cardId,category:'sports' as const,ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sealedAt:null,sourceUrl:`https://receiz.com/game/sports/card/${cardId}?claimHash=${claimHash}`};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:true,cardId,claimHash,count:1,provenance:[{collectibleId:cardId,claimHash,eventKind:'issue',appendHash:'b'.repeat(64),occurredAt:sealedAt,owner:{username:'earlier-owner',displayName:'Earlier'}}]})));
 const host=document.createElement('div'),root=createRoot(host);roots.push(root);document.body.append(host);
 await act(async()=>root.render(<PublicAssetDetail item={item}/>));expect(host.textContent).toContain('@earlier-owner');
 const refreshed={...item,ownerUsername:'fresh-holder',ownerDisplayName:'Fresh Holder',ownerProfileUrl:'https://receiz.com/fresh-holder',sealedAt,sealedCopies:[{collectibleId:cardId,claimHash,sealedAt,ownerUsername:'fresh-holder',ownerDisplayName:'Fresh Holder',ownerProfileUrl:'https://receiz.com/fresh-holder'}]};
 act(()=>root.render(<PublicAssetDetail item={refreshed}/>));expect(host.textContent).toContain('@fresh-holder');expect(host.textContent).not.toContain('@earlier-owner');
});
it('loads more public rows automatically before reaching the list end', () => {
  let reveal: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  let margin = '';
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof reveal, options: { rootMargin: string }) { reveal = callback; margin = options.rootMargin; } observe() {} disconnect() {} });
  source.value = { catalog: catalog(), status: 'live', quoteStatus: 'fresh', error: null, refresh: vi.fn() };
  const { host, commit } = mount();
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(50);
  expect(margin).toBe('600px 0px'); expect(reveal).toBeTypeOf('function');
  act(() => reveal!([{ isIntersecting: true }]));
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(100);
  expect(commit).not.toHaveBeenCalled();
});
it('removes objects on full refresh and does not synthesize a chart from a single value', () => {
  source.value = { catalog: catalog(2), status: 'live', error: null, refresh: vi.fn() };
  const { host, root } = mount();
  expect(host.querySelectorAll('.market-overview .value-chart')).toHaveLength(0);
  expect(host.textContent).toContain('Global Market Cap');
  expect(host.textContent).toContain('Value history will appear here.');
  source.value = { ...source.value, catalog: catalog(1) };
  act(() => root.render(<BankContext.Provider value={{ state: createDemoState(), commit: vi.fn(), open: vi.fn(), close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Market /></BankContext.Provider>));
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);
});

it.each(['market','explorer'] as const)('keeps %s healthy when carried valuation records have mixed pricing coverage', mode => {
  source.value = { catalog: { ...catalog(1), sportsCoverage: 'partial' }, sportsStatus: 'fresh', quoteStatus: 'fresh', status: 'live', error: null, refresh: vi.fn() };
  const {host}=mount(mode);expect(host.querySelector('.market-source-status')?.textContent).toBe('Live public Market');expect(host.querySelector('.market-error')).toBeNull();expect(host.textContent).not.toContain('partial source coverage');expect(host.textContent).not.toContain('card inventory');expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);
});
it('keeps the period caption steady through pulse jobs and gives history the stable source operands',()=>{
 const basis=catalog(1),priced={...basis,items:basis.items.map(item=>({...item,priceUsd:99,localValuationPulse:14720000}))};
 source.value={catalog:priced,historyCatalog:basis,status:'live',sportsStatus:'fresh',error:null,refresh:vi.fn()};
 capitalization.value={source:{currentUsd:12,marketAssetsPriced:1,cardsInCirculation:0,generatedAt:'2026-10-19T12:00:00Z'},points:[{pulse:1,at:'2026-10-18T12:00:00Z',usdCents:'1000'},{pulse:2,at:'2026-10-19T12:00:00Z',usdCents:'1200'}],status:'live',historyUpdating:false};
 const {host,root}=mount(),caption=host.querySelector('.chart-period-change span')!.textContent;
 expect(caption).toBe('Since first issuance · projected value');expect(capitalization.catalog).toBe(basis);expect(host.textContent).toContain('1 assets in circulation · 1 assets listed');
 capitalization.value={...capitalization.value,historyUpdating:true};
 act(()=>root.render(<BankContext.Provider value={{state:createDemoState(),commit:vi.fn(),open:vi.fn(),close:vi.fn(),navigate:vi.fn(),saveRule:vi.fn(),updateIdentity:vi.fn(),resetDemo:vi.fn()}}><Market/></BankContext.Provider>));
 expect(host.querySelector('.chart-period-change span')!.textContent).toBe(caption);expect(host.textContent).not.toContain('retained chart');
 act(()=>host.querySelector<HTMLButtonElement>('button[aria-label="About market capitalization"]')!.click());
 expect(host.textContent).toContain('Global value, grounded in source.');expect(host.textContent).toContain('Valuation protocol & source accounting');expect(host.querySelector('a.market-cap-method-link')?.getAttribute('href')).toBe('/learn/how-value-works/');
});
it('keeps a historical pricing date in source accounting instead of the Market overview',()=>{
 const at='2026-06-23T20:01:03.454Z';
 source.value={catalog:catalog(1),status:'live',error:null,refresh:vi.fn()};
 capitalization.value={source:{currentUsd:12,marketAssetsPriced:1,cardsInCirculation:0,generatedAt:'2026-10-19T12:00:00Z',sportsHistorySnapshot:{at,singleCopyGroups:1197,aggregateGroups:745}},points:[],status:'live',historyUpdating:false};
 const {host}=mount(),overview=host.querySelector('.market-overview')!;
 expect(overview.textContent).not.toContain('Sealed entries · pricing record');
 expect(overview.textContent).not.toContain(new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}));
 act(()=>host.querySelector<HTMLButtonElement>('button[aria-label="About market capitalization"]')!.click());
 const details=overview.querySelector('details')!,record=[...details.querySelectorAll('dl>div')].find(row=>row.querySelector('dt')?.textContent==='Valuation record');
 expect(record?.querySelector('dd')?.textContent).toBe(new Date(at).toLocaleString());
 expect(details.textContent).toContain('Individual object bases1,197');expect(details.textContent).toContain('Aggregate valuation groups745');
});
it('routes a public Market purchase with the exact Market item ID to the connected Market writer',()=>{
 source.value={catalog:catalog(1),status:'live',error:null,refresh:vi.fn()};const{host,open}=mount();act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());const button=[...host.querySelectorAll('dialog button')].find(b=>b.textContent?.includes('Buy ownership'))as HTMLButtonElement;
 expect(button.disabled).toBe(false);act(()=>button.click());expect(open).toHaveBeenCalledWith({kind:'market-trade',marketItemId:source.value.catalog?(source.value.catalog as ReturnType<typeof catalog>).items[0].id:'',side:'buy'});
});
it('does not offer an executable trade for a discovery object without a supported Market listing',()=>{
 const value=catalog(1);value.items[0]={...value.items[0],id:'sports:rsc_0123456789abcdef',category:'sports',sourceUrl:null};source.value={catalog:value,status:'live',error:null,refresh:vi.fn()};const{host,open}=mount();act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());const button=[...host.querySelectorAll('dialog button')].find(b=>b.textContent?.includes('Buy ownership'))as HTMLButtonElement;expect(button.disabled).toBe(true);expect(open).not.toHaveBeenCalled();
});
