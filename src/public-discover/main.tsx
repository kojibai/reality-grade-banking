import {createRoot,hydrateRoot,type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {useEffect,useLayoutEffect,useState} from 'react';
import {Discover} from './Discover';
import {readFeedSeed} from '../public-feed/feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import {readPreparedFeedCatalog,reusePreparedFeedCatalog,subscribePreparedFeedCatalog} from '../public-feed/feed-source';
import {orderDiscoveryItems} from './discovery-index';
import '../styles/tokens.css';
type HeldDiscoveryDocument={catalog:PublicMarketCatalog;generation:string};
type DiscoveryMarker=HTMLElement&{publicMarketDocument?:()=>HeldDiscoveryDocument|null;publicDiscoveryDocument?:()=>HeldDiscoveryDocument|null;subscribePublicMarketDocument?:(listener:()=>void)=>()=>void};
function DiscoveryRoot({seed,completeCatalog}:{seed:PublicMarketItem[];completeCatalog:boolean}){
 const [complete,setComplete]=useState(completeCatalog);
 useEffect(()=>subscribePreparedFeedCatalog(()=>setComplete(true)),[]);
 useLayoutEffect(()=>{
  const sync=()=>{
   const marker=document.getElementById('receiz-navigation') as DiscoveryMarker|null,bank=marker?.publicMarketDocument?.(),discovery=marker?.publicDiscoveryDocument?.();
   const usable=(value:HeldDiscoveryDocument|null|undefined):value is HeldDiscoveryDocument=>/^[a-f0-9]{64}$/.test(value?.generation??'')&&value?.catalog?.complete===true&&Array.isArray(value.catalog.items);
   const latest=usable(bank)?bank:usable(discovery)?discovery:null;
   if(latest)reusePreparedFeedCatalog(latest.catalog,latest.generation);
  };
  const marker=document.getElementById('receiz-navigation') as DiscoveryMarker|null,unsubscribe=marker?.subscribePublicMarketDocument?.(sync);
  sync();addEventListener('receiz-bank:surface',sync);return()=>{unsubscribe?.();removeEventListener('receiz-bank:surface',sync);};
 },[]);
 return <Discover seed={seed} active={usePublicRuntimeActive('discover')} completeCatalog={complete}/>;
}
const roots=new WeakMap<HTMLElement,Root>(),mounted=new WeakSet<HTMLElement>();
/** The existing accepted public family supplies data only; no HTML or Source
 * needs reopening when the same runtime is first mounted from navigation. */
export function mountHeldDiscovery(root:HTMLElement,catalog:PublicMarketCatalog,generation:string){
 flushSync(()=>{const current=reusePreparedFeedCatalog(catalog,generation);if(mounted.has(root))return;const renderer=createRoot(root,{identifierPrefix:'public-discover-'});roots.set(root,renderer);mounted.add(root);renderer.render(<DiscoveryRoot seed={orderDiscoveryItems(current.items).slice(0,12)} completeCatalog/>);});
 return roots.get(root);
}
export function mountHeldPublicDocument(root:HTMLElement,held:HeldDiscoveryDocument){
 return mountHeldDiscovery(root,held.catalog,held.generation);
}
/** A cached module still hydrates a later qualified saved document once. */
export function mountPublicDocument(root?:HTMLElement){
 root??=document.querySelector<HTMLElement>('[data-public-runtime="discover"]')??document.getElementById('public-discover-root')??(/^\/discover(?:\/(?:index\.html)?)?$/.test(location.pathname)?publicRuntimeRoot('discover'):undefined);
 if(!root||mounted.has(root))return root?roots.get(root):undefined;
 const catalog=readPreparedFeedCatalog(root,'discover'),source=root.querySelector('#public-discovery-seed')??document.getElementById('public-discovery-seed'),seed=catalog?orderDiscoveryItems(catalog.items).slice(0,12):readFeedSeed(source?.textContent);
 if(source&&root.contains(source))source.remove();const renderer=hydrateRoot(root,<DiscoveryRoot seed={seed} completeCatalog={!!catalog}/>,{identifierPrefix:'public-discover-'});roots.set(root,renderer);mounted.add(root);return renderer;
}
if(document.querySelector('[data-public-runtime="discover"],#public-discover-root')||/^\/discover(?:\/(?:index\.html)?)?$/.test(location.pathname))startPublicDocumentRuntime('discover',()=>{mountPublicDocument();});
