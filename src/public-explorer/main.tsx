import {preparedBankCatalogState} from '../receiz/prepared-bank-catalog';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext} from '../core/public-document-format';
import {adoptPublicMarketDocument} from '../receiz/usePublicMarket';
import {publishMarketDisplaySource} from '../receiz/market-projection/display-source';
import {publicMarketDocumentHistory,readPublicMarketDocumentSeed,type PublicMarketDocumentSeed} from '../receiz/public-market-document-seed';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {StrictMode,useEffect,useState} from 'react';
import {createRoot,hydrateRoot,type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {PublicExplorer} from './PublicExplorer';
import {profilePageUsername} from '../receiz/public-profile';
import {startProfileDocumentRuntime} from './profile-document-entry';
import '../styles/tokens.css';
import '../styles/app.css';
import '../styles/features.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
type ExplorerDocument={prepared:PublicMarketDocumentSeed|null;path?:string};
function PublicExplorerRoot({prepared,path}:ExplorerDocument){
 const active=usePublicRuntimeActive('explore'),[initial,setInitial]=useState(!!prepared);useEffect(()=>setInitial(false),[]);
 const preparedHistory=prepared?publicMarketDocumentHistory(prepared):undefined,preparedSource=prepared?{catalog:prepared.catalog,historyCatalog:prepared.catalog,pulse:prepared.asOfPulse,quoteStatus:'stale' as const,sportsStatus:prepared.catalog.items.some(item=>item.category==='sports')?'retained' as const:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}}:undefined;
 return <PublicDocumentCapabilitiesContext.Provider value={initial?{intersectionObserver:false}:undefined}><PublicDocumentFormatContext.Provider value={initial?prepared?.format:undefined}><PublicExplorer active={active&&!initial} initialPath={prepared?path??'/'+prepared.path+'/':undefined} initialSource={initial?preparedSource:undefined} initialVisibleCount={prepared?.visibleCount} initialHistory={preparedHistory} initialAsOfPulse={initial?prepared?.asOfPulse:undefined}/></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>;
}
const roots=new WeakMap<HTMLElement,Root>();
/** Reuse only the exact complete public family already retained by the Bank
 * reader. This is a display mount, never an admission or a new read. */
export function mountHeldPublicDocument(root:HTMLElement,held:PublicMarketDocumentSeed,path='/explore/'){
 const state=preparedBankCatalogState();
 if(root.dataset.publicRuntime!=='explore'||(state.value??state.carried)?.seed!==held)throw Error('PUBLIC_MARKET_HELD_SOURCE_MISSING');
 if(!roots.has(root))flushSync(()=>{const renderer=createRoot(root,{identifierPrefix:'public-explore-'});roots.set(root,renderer);renderer.render(<StrictMode><PublicExplorerRoot prepared={held} path={path}/></StrictMode>);});
 return roots.get(root)!;
}
/** A cached entry can hydrate a later saved document through the same root. */
export function mountPublicDocument(root=publicRuntimeRoot('explore')){
 const mounted=roots.get(root);if(mounted)return mounted;
 const sibling=document.getElementById('public-market-seed'),source=root.querySelector<HTMLElement>('#public-market-seed')??(sibling?.parentElement===root.parentElement&&Boolean(root.compareDocumentPosition(sibling)&4)&&sibling.nextElementSibling?.id==='receiz-navigation'?sibling:null);
 const prepared=readPublicMarketDocumentSeed({getElementById:()=>source}),navigation=document.getElementById('receiz-navigation') as (HTMLElement&{pages?:Record<string,{preparedRevision?:string;preparedState?:string;preparedBankIdentity?:unknown}>})|null,page=navigation?.pages?.[location.pathname.replace(/\/?$/,'/')];
 if(prepared)adoptPublicMarketDocument(prepared,page?.preparedRevision===prepared.generation&&(page.preparedState==='current'||page.preparedState==='retained')?{state:page.preparedState,identity:page.preparedBankIdentity}:undefined);
 if(prepared?.capitalization&&!preparedBankCatalogState().value&&!preparedBankCatalogState().carried)publishMarketDisplaySource(prepared.capitalization);
 const content=<StrictMode><PublicExplorerRoot prepared={prepared}/></StrictMode>;
 const renderer=prepared?hydrateRoot(root,content,{identifierPrefix:'public-explore-'}):createRoot(root,{identifierPrefix:'public-explore-'});roots.set(root,renderer);if(!prepared)renderer.render(content);return renderer;
}
const start=()=>{mountPublicDocument();};
if(profilePageUsername(location.pathname))startProfileDocumentRuntime(start);else if(document.querySelector('[data-public-runtime="explore"]')||/^\/(?:explore|explorer|market-cap|asset|shares)(?:\/|$)/.test(location.pathname))startPublicDocumentRuntime('explore',start);
