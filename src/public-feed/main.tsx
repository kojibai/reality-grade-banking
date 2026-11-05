import {hydrateRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {PublicFeed} from './PublicFeed';
import {readFeedSeed,orderFeedItems} from './feed-items';
import {readPreparedFeedCatalog,subscribePreparedFeedCatalog} from './feed-source';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
function FeedRoot({seed,completeCatalog}:{seed:PublicMarketItem[];completeCatalog:boolean}){
 const [complete,setComplete]=useState(completeCatalog);
 useEffect(()=>subscribePreparedFeedCatalog(()=>setComplete(true)),[]);
 return <PublicFeed seed={seed} active={usePublicRuntimeActive('feed')} completeCatalog={complete}/>;
}
startPublicDocumentRuntime('feed',()=>{
 const root=publicRuntimeRoot('feed'),catalog=readPreparedFeedCatalog(root,'feed'),source=root.querySelector('#public-feed-seed')??document.getElementById('public-feed-seed'),seed=catalog?orderFeedItems(catalog.items).slice(0,8):readFeedSeed(source?.textContent);
 if(source&&root.contains(source))source.remove();
 hydrateRoot(root,<FeedRoot seed={seed} completeCatalog={!!catalog}/>,{identifierPrefix:'public-feed-'});
});
