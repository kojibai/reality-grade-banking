import {hydrateRoot} from 'react-dom/client';
import {Discover} from './Discover';
import {readFeedSeed} from '../public-feed/feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
function DiscoveryRoot({seed}:{seed:PublicMarketItem[]}){return <Discover seed={seed} active={usePublicRuntimeActive('discover')}/>;}
startPublicDocumentRuntime('discover',()=>{const root=publicRuntimeRoot('discover'),source=root.querySelector('#public-discovery-seed')??document.getElementById('public-discovery-seed'),seed=readFeedSeed(source?.textContent);if(source&&root.contains(source))source.remove();hydrateRoot(root,<DiscoveryRoot seed={seed}/>,{identifierPrefix:'public-discover-'});});
