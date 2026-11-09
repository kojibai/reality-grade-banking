import {hydrateRoot} from 'react-dom/client';
import {Discover} from './Discover';
import {readFeedSeed} from '../public-feed/feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
function DiscoveryRoot({seed,seedHeads}:{seed:PublicMarketItem[];seedHeads?:PublicMarketCatalog['publicProfileHeads']}){return <Discover seed={seed} seedHeads={seedHeads} active={usePublicRuntimeActive('discover')}/>;}
startPublicDocumentRuntime('discover',()=>{const root=publicRuntimeRoot('discover'),source=root.querySelector('#public-discovery-seed')??document.getElementById('public-discovery-seed'),seed=readFeedSeed(source?.textContent);const heads=document.getElementById('public-discovery-heads');let seedHeads:PublicMarketCatalog['publicProfileHeads'];try{const input=JSON.parse(heads?.textContent??'null');if(Array.isArray(input)&&input.length<=20)seedHeads=input;}catch{/* The existing bundled collection supplies these fields. */}
if(source&&root.contains(source))source.remove();hydrateRoot(root,<DiscoveryRoot seed={seed} seedHeads={seedHeads}/>,{identifierPrefix:'public-discover-'});});
