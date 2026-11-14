import {bundleCssFiles} from './scope-product-css.mjs';
import {publicOwnerThumbnails,publicProfileHeadThumbnails} from './public-owner-thumbnails.mjs';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {compactNavigation} from './compact-navigation.mjs';
import {renderFeedState} from './feed-page.mjs';
export const discoverySeedScript=seed=>`<script id="public-discovery-seed" type="application/json">${JSON.stringify(seed).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`;
export async function renderDiscoveryState(server){
 const [{Discover},{orderDiscoveryItems,buildDiscoveryIndex},{parsePublicMarket},input]=await Promise.all([server.ssrLoadModule('/src/public-discover/Discover.tsx'),server.ssrLoadModule('/src/public-discover/discovery-index.ts'),server.ssrLoadModule('/src/receiz/public-market.ts'),readFile('public/receiz-public-market.json','utf8').then(JSON.parse)]);
 const catalog=parsePublicMarket(input,input.snapshot),seed=await publicOwnerThumbnails(orderDiscoveryItems(catalog.items).slice(0,12),server);
 const visible=new Set(buildDiscoveryIndex(seed,catalog.publicProfileHeads,catalog.publicProfileHeadRefusals).people.slice(0,20).map(person=>person.username));
 const heads=await publicProfileHeadThumbnails((catalog.publicProfileHeads??[]).filter(head=>visible.has(head.profile.username)),server);
 // This first-frame carrier describes only the visible People row. The full
 // selected header and collection remain in their existing shared carrier.
 const seedHeads=heads.map(head=>({...head,profile:Object.fromEntries(['userId','username','receivingUsername','displayName','displayNameSource','avatarUrl','createdAt','isPrivate'].filter(key=>Object.hasOwn(head.profile,key)).map(key=>[key,head.profile[key]])),stats:{originals:head.stats.originals}})).concat((catalog.publicProfileHeadRefusals??[]).filter(policy=>seed.some(row=>row.ownerUsername===policy.profile.username&&row.ownerIdentity?.userId===policy.profile.userId)).map(policy=>({...policy,stats:{}})));
 const content=renderToString(createElement(Discover,{seed,seedHeads,active:false}));
 if(!seed.length)throw Error('PUBLIC_DISCOVERY_SOURCE_EMPTY');
 const navigationSeed=seed.slice(0,4),navigationHeads=seedHeads.filter(head=>head.viewer.canView===false);return {seed,seedHeads,content,navigationContent:renderToString(createElement(Discover,{seed:navigationSeed,seedHeads:navigationHeads,active:false}))+discoverySeedScript(navigationSeed)+(navigationHeads.length?discoverySeedScript(navigationHeads).replace('public-discovery-seed','public-discovery-heads'):'')};
}
export function applyDiscoveryState(html,state){return html.replace('<div id="root"></div>',()=>`<div id="public-discover-root" data-public-runtime="discover">${state.content}</div>${discoverySeedScript(state.seed)}${state.seedHeads?.length?discoverySeedScript(state.seedHeads).replace('public-discovery-seed','public-discovery-heads'):''}`);}
export function discoveryPageDevPlugin(){return {name:'bankeiz-discovery-first-paint',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/discover/navigation.json')return next();void (async()=>{const state=await renderDiscoveryState(server),html=await readFile('discover/index.html','utf8'),css=await Promise.all(['src/styles/tokens.css','src/public-discover/discover.css'].map(path=>readFile(path,'utf8')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({runtime:'discover',title:'Discover | Bankeiz',entry:'/src/public-discover/main.tsx',head:html.match(/<head>([\s\S]*?)<\/head>/)[1]+`<style data-public-page-style="discover">${css.join('\n')}</style>`,content:state.navigationContent}));})().catch(next);});},async transformIndexHtml(html,context){
 if(!context.server||!/^\/discover\/(?:index\.html)?$/.test(context.path))return html;
 const state=await renderDiscoveryState(context.server),feedState=await renderFeedState(context.server),{AccountOpening}=await context.server.ssrLoadModule('/src/features/identity/AccountOpening.tsx'),{publicProfileReservedNames}=await context.server.ssrLoadModule('/src/receiz/public-profile.ts');
 const styles=['/src/styles/tokens.css','/src/styles/app.css'],css={[styles[0]]:await readFile(styles[0].slice(1),'utf8'),[styles[1]]:await bundleCssFiles(['src/styles/app.css','src/styles/features.css'])},paint=css[styles[0]]+'\n'+await readFile('src/public-discover/discover.css','utf8'),head=html.match(/<head>([\s\S]*?)<\/head>/)[1];
 const exploreHead=(await readFile('explore/index.html','utf8')).match(/<head>([\s\S]*?)<\/head>/)[1],feedHead=(await readFile('feed/index.html','utf8')).match(/<head>([\s\S]*?)<\/head>/)[1];
 const page={runtime:'discover',title:'Discover | Bankeiz',entry:'/src/public-discover/main.tsx',head:head+`<style data-public-page-style="discover">${paint}</style>`,content:state.navigationContent};
 const navigation=compactNavigation({reserved:publicProfileReservedNames,pages:{'/discover/':page,'/feed/':{runtime:'feed',title:'For you | Bankeiz',entry:'/src/public-feed/main.tsx',head:feedHead,content:feedState.navigationContent},'/explore/':{runtime:'explore',title:'Explore | Bankeiz',entry:'/src/public-explorer/main.tsx',head:exploreHead,content:'<main><h1>Explore</h1></main>'}},bank:{head:'<title>Bankeiz</title>',entry:'/src/main.tsx',styles,css,content:renderToString(createElement(AccountOpening,{resuming:true}))}});
 return applyDiscoveryState(html,state).replace('</head>',`<style data-public-page-style="discover">${paint}</style></head>`).replace('</body>',()=>`<script src="/learn/learn.js" defer></script><script id="receiz-navigation" type="application/json">${JSON.stringify(navigation).replaceAll('<','\\u003c')}</script></body>`);
 }};}
