import {hydrateRoot} from 'react-dom/client';
import {Discover} from './Discover';
import {readDiscoverSpotlightSeed} from './spotlight-seed';
import {readFeedSeed} from '../public-feed/feed-items';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
import type {PublicMarketCatalog,PublicMarketItem} from '../receiz/public-market';
import '../styles/tokens.css';
function DiscoveryRoot({seed,seedHeads,spotlight}:{seed:PublicMarketItem[];seedHeads?:PublicMarketCatalog['publicProfileHeads'];spotlight?:ReturnType<typeof readDiscoverSpotlightSeed>}){return <Discover seed={seed} seedHeads={seedHeads} seedSpotlight={spotlight?.placements} spotlightRenderedAt={spotlight?.renderedAt} active={usePublicRuntimeActive('discover')}/>;}
startPublicDocumentRuntime('discover',()=>{const root=publicRuntimeRoot('discover'),source=root.querySelector('#public-discovery-seed')??document.getElementById('public-discovery-seed'),seed=readFeedSeed(source?.textContent);const heads=root.querySelector('#public-discovery-heads')??document.getElementById('public-discovery-heads');let seedHeads:PublicMarketCatalog['publicProfileHeads'];try{const input=JSON.parse(heads?.textContent??'null');if(Array.isArray(input)&&input.length<=32)seedHeads=input;}catch{/* The existing bundled collection supplies these fields. */}
const spotlightSource=root.querySelector('#public-discovery-spotlight')??document.getElementById('public-discovery-spotlight'),spotlight=readDiscoverSpotlightSeed(spotlightSource);
for(const element of [source,heads,spotlightSource])if(element&&root.contains(element))element.remove();
hydrateRoot(root,<DiscoveryRoot seed={seed} seedHeads={seedHeads} spotlight={spotlight}/>,{identifierPrefix:'public-discover-'});});
