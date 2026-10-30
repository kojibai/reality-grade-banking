import {hydrateRoot} from 'react-dom/client';
import {PublicFeed} from './PublicFeed';
import {readFeedSeed} from './feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
function FeedRoot({seed}:{seed:PublicMarketItem[]}){return <PublicFeed seed={seed} active={usePublicRuntimeActive('feed')}/>;}
startPublicDocumentRuntime('feed',()=>{
 const root=publicRuntimeRoot('feed'),source=root.querySelector('#public-feed-seed')??document.getElementById('public-feed-seed'),seed=readFeedSeed(source?.textContent);
 if(source&&root.contains(source))source.remove();
 hydrateRoot(root,<FeedRoot seed={seed}/>,{identifierPrefix:'public-feed-'});
});
