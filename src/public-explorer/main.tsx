import {preparedBankCatalogState,readPreparedBankCatalog,prepareCarriedBankCatalog} from '../receiz/prepared-bank-catalog';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext,PublicDocumentPulseContext,readPublicFirstFrame,type PublicFirstFrame} from '../core/public-document-format';
import {adoptPublicMarketDocument} from '../receiz/usePublicMarket';
import {publishMarketDisplaySource} from '../receiz/market-projection/display-source';
import {publicMarketDocumentHistory,readPublicMarketDocumentSeed,preparePublicMarketDocumentSeed,preparePublicMarketSeedText,type PublicMarketDocumentSeed} from '../receiz/public-market-document-seed';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {StrictMode,useEffect,useState} from 'react';
import {createRoot,hydrateRoot,type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {PublicExplorer} from './PublicExplorer';
import {assetPageId,assetPageSeed} from '../receiz/public-asset-page';
import type {PublicMarketItem} from '../receiz/public-market';
import {profilePageUsername,retainedPublicProfile} from '../receiz/public-profile';
import {startProfileDocumentRuntime} from './profile-document-entry';
import '../styles/tokens.css';
import '../styles/app.css';
import '../styles/features.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
type ExplorerDocument={asset?:PublicMarketItem;frame?:PublicFirstFrame;profileSource?:boolean;prepared:PublicMarketDocumentSeed|null;path?:string;reconcilePath?:boolean};
function PublicExplorerRoot({prepared,path,reconcilePath=false,asset,frame,profileSource=false}:ExplorerDocument){
 const active=usePublicRuntimeActive('explore'),[initial,setInitial]=useState(!!prepared||!!asset||profileSource),entryPath=prepared?path??'/'+prepared.path+'/':undefined;
 useEffect(()=>{setInitial(false);if(!reconcilePath||!entryPath||entryPath===location.pathname)return;let alive=true;queueMicrotask(()=>{if(alive)dispatchEvent(new Event('receiz-bank:surface'));});return()=>{alive=false;};},[]);
 const preparedHistory=prepared?publicMarketDocumentHistory(prepared):undefined,preparedSource=profileSource?{catalog:null,historyCatalog:null,pulse:frame!.pulse,quoteStatus:'stale' as const,sportsStatus:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}}:prepared||asset?{catalog:prepared?.catalog??null,historyCatalog:prepared?.catalog??null,pulse:prepared?.asOfPulse??frame!.pulse,quoteStatus:'stale' as const,sportsStatus:prepared?.catalog.items.some(item=>item.category==='sports')?'retained' as const:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}}:undefined;
 return <PublicDocumentCapabilitiesContext.Provider value={initial?{intersectionObserver:false}:undefined}><PublicDocumentFormatContext.Provider value={initial?(profileSource?frame:prepared?.format??frame):undefined}><PublicDocumentPulseContext.Provider value={initial&&(asset||profileSource)?frame?.pulse:undefined}><PublicExplorer active={active&&!initial} initialPath={profileSource?path:prepared?path??'/'+prepared.path+'/':undefined} initialSource={initial?preparedSource:undefined} initialVisibleCount={prepared?.visibleCount} initialHistory={preparedHistory} initialAsset={initial?asset:undefined} initialAsOfPulse={initial?(profileSource?frame?.pulse:prepared?.asOfPulse??frame?.pulse):undefined}/></PublicDocumentPulseContext.Provider></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>;
}
// Only the actual HTML module entry is a boot display. Router imports are
// later accepted documents and must supersede pending historical cache reads.
let initialDocumentEntry=Array.from(document.scripts).some(script=>script.type==='module'&&(script.dataset.publicRuntimeEntry==='explore'||script.src===import.meta.url));
const roots=new WeakMap<HTMLElement,Root>();
const preparingRoots=new WeakMap<HTMLElement,Promise<Root|undefined>>();
/** Reuse only the exact complete public family already retained by the Bank
 * reader. This is a display mount, never an admission or a new read. */
export function mountHeldPublicDocument(root:HTMLElement,held:PublicMarketDocumentSeed,path='/explore/'){
 const state=preparedBankCatalogState();
 if(root.dataset.publicRuntime!=='explore'||(state.value??state.carried)?.seed!==held)throw Error('PUBLIC_MARKET_HELD_SOURCE_MISSING');
 if(!roots.has(root))flushSync(()=>{const renderer=createRoot(root,{identifierPrefix:'public-explore-'});roots.set(root,renderer);renderer.render(<StrictMode><PublicExplorerRoot prepared={held} path={path}/></StrictMode>);});
 return roots.get(root)!;
}
function publicDocumentSeedElement(root:HTMLElement){
 const sibling=document.getElementById('public-market-seed');
 const source=root.querySelector<HTMLElement>('#public-market-seed')??(sibling?.parentElement===root.parentElement&&Boolean(root.compareDocumentPosition(sibling)&4)&&(sibling.nextElementSibling?.id==='receiz-navigation'||sibling.nextElementSibling?.id==='public-profile-seed'&&sibling.nextElementSibling.nextElementSibling?.id==='receiz-navigation')?sibling:null);
 return source;
}
function adoptResolvedPublicDocument(prepared:PublicMarketDocumentSeed,initialDocument:boolean,profileName=profilePageUsername(location.pathname)){
 const navigation=document.getElementById('receiz-navigation') as (HTMLElement&{pages?:Record<string,{preparedRevision?:string;preparedState?:string;preparedBankIdentity?:unknown}>})|null,page=navigation?.pages?.[location.pathname.replace(/\/?$/,'/')];
 if(profileName)retainedPublicProfile(profileName,prepared.catalog);
 adoptPublicMarketDocument(prepared,page?.preparedRevision===prepared.generation&&(page.preparedState==='current'||page.preparedState==='retained')?{state:page.preparedState,identity:page.preparedBankIdentity}:undefined,{initialDocument});
 if(prepared.capitalization&&!preparedBankCatalogState().value&&!preparedBankCatalogState().carried)publishMarketDisplaySource(prepared.capitalization);
}
function mountResolvedPublicDocument(root:HTMLElement,prepared:PublicMarketDocumentSeed|null,reconcilePath=false){
 const mounted=roots.get(root);if(mounted)return mounted;
 const initialDocument=initialDocumentEntry&&root===document.querySelector<HTMLElement>('[data-public-runtime="explore"]');initialDocumentEntry=false;
 if(prepared)adoptResolvedPublicDocument(prepared,initialDocument);
 const profileEntry=!!prepared&&root.hasAttribute('data-public-profile-entry'),profilePath=profileEntry&&profilePageUsername(location.pathname)?location.pathname:undefined;
 const current=preparedBankCatalogState(),selected=profileEntry?(current.value??current.carried)?.seed??prepared:prepared;
 const profileSource=root.hasAttribute('data-public-profile-source');
 const id=root.hasAttribute('data-public-asset-rendered')?assetPageId(location.pathname):null,frame=id||profileSource?readPublicFirstFrame(root):null,asset=id&&frame?assetPageSeed(id)??undefined:undefined;
 const content=<StrictMode><PublicExplorerRoot prepared={selected} path={root.dataset.ledgerExploreFrame?'/explore/':profileSource?'/'+root.dataset.publicProfileEntry+'/':profilePath} reconcilePath={reconcilePath} asset={asset} frame={frame??undefined} profileSource={profileSource&&!!frame}/></StrictMode>;
 // Hydrate the actual profile prepared from this exact carried family.
 // A newer held selection replaces an older document without reviving it.
 const exactFrame=!root.dataset.ledgerExploreFrame||root.dataset.ledgerExploreFrame===prepared?.generation;
 const hydrate=exactFrame&&(!!asset||profileSource&&!!frame||!!prepared&&(!profileEntry||root.hasAttribute('data-public-profile-rendered')&&selected===prepared));
 const renderer=hydrate?hydrateRoot(root,content,{identifierPrefix:'public-explore-'}):createRoot(root,{identifierPrefix:'public-explore-'});roots.set(root,renderer);if(!hydrate)flushSync(()=>renderer.render(content));return renderer;
}
/** Only a new Explore reader needs its data. Opening the page has already
 * moved its actual rendered rows into place, and retained roots reuse them. */
async function installedExplorePacket(digest:string){
 if(typeof caches==='undefined')return null;
 try{
  const entry=await caches.match('/explore/index.html');
  if(!entry?.ok||Number(entry.headers.get('content-length'))>32*1024*1024)return null;
  const text=await entry.text(),opening='<script id="public-market-seed" type="application/json">',start=text.indexOf(opening);
  if(start<0)return null;
  const end=text.indexOf('</script>',start+opening.length);if(end<0)return null;
  const packet=text.slice(start+opening.length,end);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(packet));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')===digest?packet:null;
 }catch{return null;}
}
async function attachLedgerExploreFrame(root:HTMLElement){
 const generation=root.dataset.ledgerExploreFrame!,digest=root.dataset.explorePacket;
 if(!/^[a-f0-9]{64}$/.test(generation))throw Error('Invalid Explore frame.');
 const held=()=>{const {value,carried}=preparedBankCatalogState();return (value??carried)?.seed;};
 if(preparedBankCatalogState().bootstrapping)await prepareCarriedBankCatalog();
 let seed=held();
 if(!seed&&digest){
  if(!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid Explore data reference.');
  const integrity='sha256-'+btoa(digest.match(/../g)!.map(pair=>String.fromCharCode(parseInt(pair,16))).join(''));
  let text=await installedExplorePacket(digest);
  if(text===null){
   const response=await fetch('/explore/data/'+digest+'.json',{credentials:'omit',redirect:'error',cache:'force-cache',integrity,signal:AbortSignal.timeout(30000)});
   if(!response.ok||Number(response.headers.get('content-length'))>32*1024*1024)throw Error('Explore data unavailable.');
   text=await response.text();
  }
  const parsed=await preparePublicMarketSeedText(text);
  if(!parsed||parsed.path!=='explore'||parsed.generation!==generation)throw Error('Explore data does not match the saved view.');
  seed=held()??parsed;
 }
 if(!seed)seed=(await readPreparedBankCatalog())?.seed??held();
 if(!seed)throw Error('Explore data unavailable.');
 if(root.isConnected)return mountResolvedPublicDocument(root,seed,true);
}
/** Raw prepared entries stay synchronous. A compressed static entry retains
 * its visible rows while the existing bounded, cached local decoder finishes. */
export function mountPublicDocument(root=publicRuntimeRoot('explore')){
 const mounted=roots.get(root);if(mounted)return mounted;
 const held=preparingRoots.get(root);if(held)return held;
 if(root.dataset.ledgerExploreFrame){
  const pending=attachLedgerExploreFrame(root).finally(()=>preparingRoots.delete(root));
  preparingRoots.set(root,pending);return pending;
 }
 const source=publicDocumentSeedElement(root),prepared=readPublicMarketDocumentSeed({getElementById:()=>source});
 if(prepared||!source)return mountResolvedPublicDocument(root,prepared);
 const profileName=root.hasAttribute('data-public-profile-source')&&readPublicFirstFrame(root)?profilePageUsername(location.pathname):null;
 const sourceProfile=!!profileName&&retainedPublicProfile(profileName)?.nextCursor===null,profileEntry=root.dataset.publicProfileEntry;
 const initialDocument=initialDocumentEntry&&root===document.querySelector<HTMLElement>('[data-public-runtime="explore"]');
 const text=source.textContent,pending=preparePublicMarketDocumentSeed({getElementById:()=>source}).then(seed=>{
  const mounted=roots.get(root);
  if(mounted){
   if(sourceProfile&&seed&&root.isConnected&&root.dataset.publicRuntime==='explore'&&root.hasAttribute('data-public-profile-source')&&root.dataset.publicProfileEntry===profileEntry&&source.textContent===text&&publicDocumentSeedElement(root)===source)adoptResolvedPublicDocument(seed,initialDocument,profileName);
   return mounted;
  }
  if(!root.isConnected||root.dataset.publicRuntime!=='explore'||source.textContent!==text||publicDocumentSeedElement(root)!==source)return undefined;
  return mountResolvedPublicDocument(root,seed,true);
 }).finally(()=>{if(preparingRoots.get(root)===pending)preparingRoots.delete(root);});
 preparingRoots.set(root,pending);
 // The complete Source profile and its actual first frame already suffice.
 // Attach normal interactivity now; unrelated cohort decoding only adopts data.
 return sourceProfile?mountResolvedPublicDocument(root,null):pending;
}
const start=()=>{const root=publicRuntimeRoot('explore');if(!root.dataset.ledgerExploreFrame)mountPublicDocument(root);};
if(profilePageUsername(location.pathname))startProfileDocumentRuntime(start);else if(document.querySelector('[data-public-runtime="explore"]')||/^\/(?:explore|explorer|market-cap|asset|shares)(?:\/|$)/.test(location.pathname))startPublicDocumentRuntime('explore',start);
