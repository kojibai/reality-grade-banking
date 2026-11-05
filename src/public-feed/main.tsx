import {createRoot,hydrateRoot,type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {useEffect,useLayoutEffect,useState} from 'react';
import {PublicFeed} from './PublicFeed';
import {readFeedSeed,orderFeedItems,feedSequenceItems} from './feed-items';
import {readPreparedFeedCatalog,reusePreparedFeedCatalog,readHeldFeedCatalog,subscribePreparedFeedCatalog} from './feed-source';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
type HeldPublicDocument={catalog:PublicMarketCatalog;generation:string};
type FeedMarker=HTMLElement&{publicMarketDocument?:()=>HeldPublicDocument|null;subscribePublicMarketDocument?:(listener:()=>void)=>()=>void;subscribePublicMarketCatalog?:(listener:()=>void)=>()=>void};
function FeedRoot({seed,completeCatalog}:{seed:PublicMarketItem[];completeCatalog:boolean}){
 const [complete,setComplete]=useState(completeCatalog);
 useEffect(()=>subscribePreparedFeedCatalog(()=>setComplete(true)),[]);
 useLayoutEffect(()=>{
  const sync=()=>{readHeldFeedCatalog();};
  const marker=document.getElementById('receiz-navigation') as FeedMarker|null,unsubscribe=marker?.subscribePublicMarketCatalog?.(sync)??marker?.subscribePublicMarketDocument?.(sync);
  sync();addEventListener('receiz-bank:surface',sync);return()=>{unsubscribe?.();removeEventListener('receiz-bank:surface',sync);};
 },[]);
 return <PublicFeed seed={seed} active={usePublicRuntimeActive('feed')} completeCatalog={complete}/>;
}
const roots=new WeakMap<HTMLElement,Root>(),mounted=new WeakSet<HTMLElement>();
/** Mount only the already accepted public display family, never a second
 * document or account entry, when navigation has its exact held data. */
export function mountHeldPublicDocument(root:HTMLElement,held:HeldPublicDocument){
 flushSync(()=>{const current=readHeldFeedCatalog()??reusePreparedFeedCatalog(held.catalog,held.generation);if(mounted.has(root))return;const renderer=createRoot(root,{identifierPrefix:'public-feed-'});roots.set(root,renderer);mounted.add(root);renderer.render(<FeedRoot seed={orderFeedItems(feedSequenceItems(current.items)).slice(0,8)} completeCatalog/>);});
 return roots.get(root);
}
export function mountPublicDocument(root?:HTMLElement){
 root??=document.querySelector<HTMLElement>('[data-public-runtime="feed"]')??document.getElementById('public-feed-root')??(/^\/feed(?:\/(?:index\.html)?)?$/.test(location.pathname)?publicRuntimeRoot('feed'):undefined);
 if(!root||mounted.has(root))return root?roots.get(root):undefined;
 const catalog=readPreparedFeedCatalog(root,'feed'),source=root.querySelector('#public-feed-seed')??document.getElementById('public-feed-seed'),seed=catalog?orderFeedItems(feedSequenceItems(catalog.items)).slice(0,8):readFeedSeed(source?.textContent);
 if(source&&root.contains(source))source.remove();
 const renderer=hydrateRoot(root,<FeedRoot seed={seed} completeCatalog={!!catalog}/>,{identifierPrefix:'public-feed-'});roots.set(root,renderer);mounted.add(root);return renderer;
}
if(document.querySelector('[data-public-runtime="feed"],#public-feed-root')||/^\/feed(?:\/(?:index\.html)?)?$/.test(location.pathname))startPublicDocumentRuntime('feed',()=>{mountPublicDocument();});
