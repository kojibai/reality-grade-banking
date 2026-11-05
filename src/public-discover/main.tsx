import {hydrateRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {Discover} from './Discover';
import {readFeedSeed} from '../public-feed/feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketItem} from '../receiz/public-market';
import {readPreparedFeedCatalog,subscribePreparedFeedCatalog} from '../public-feed/feed-source';
import {orderDiscoveryItems} from './discovery-index';
import '../styles/tokens.css';
function DiscoveryRoot({seed,completeCatalog}:{seed:PublicMarketItem[];completeCatalog:boolean}){
 const [complete,setComplete]=useState(completeCatalog);
 useEffect(()=>subscribePreparedFeedCatalog(()=>setComplete(true)),[]);
 return <Discover seed={seed} active={usePublicRuntimeActive('discover')} completeCatalog={complete}/>;
}
startPublicDocumentRuntime('discover',()=>{const root=publicRuntimeRoot('discover'),catalog=readPreparedFeedCatalog(root,'discover'),source=root.querySelector('#public-discovery-seed')??document.getElementById('public-discovery-seed'),seed=catalog?orderDiscoveryItems(catalog.items).slice(0,12):readFeedSeed(source?.textContent);if(source&&root.contains(source))source.remove();hydrateRoot(root,<DiscoveryRoot seed={seed} completeCatalog={!!catalog}/>,{identifierPrefix:'public-discover-'});});
