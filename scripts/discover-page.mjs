import {publicOwnerThumbnails} from './public-owner-thumbnails.mjs';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {compactNavigation} from './compact-navigation.mjs';
import {renderFeedState} from './feed-page.mjs';
export const discoverySeedScript=seed=>`<script id="public-discovery-seed" type="application/json">${JSON.stringify(seed).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`;
export async function renderDiscoveryState(server){
 const [{Discover},{orderDiscoveryItems},{parsePublicMarket},input]=await Promise.all([server.ssrLoadModule('/src/public-discover/Discover.tsx'),server.ssrLoadModule('/src/public-discover/discovery-index.ts'),server.ssrLoadModule('/src/receiz/public-market.ts'),readFile('public/receiz-public-market.json','utf8').then(JSON.parse)]);
 const seed=await publicOwnerThumbnails(orderDiscoveryItems(parsePublicMarket(input,input.snapshot).items).slice(0,12),server),content=renderToString(createElement(Discover,{seed,active:false}));
 if(!seed.length)throw Error('PUBLIC_DISCOVERY_SOURCE_EMPTY');
 const navigationSeed=seed.slice(0,4);return {seed,content,navigationContent:renderToString(createElement(Discover,{seed:navigationSeed,active:false}))+discoverySeedScript(navigationSeed)};
}
export function applyDiscoveryState(html,state){return html.replace('<div id="root"></div>',()=>`<div id="public-discover-root" data-public-runtime="discover">${state.content}</div>${discoverySeedScript(state.seed)}`);}
export function discoveryPageDevPlugin(){return {name:'bankeiz-discovery-first-paint',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/discover/navigation.json')return next();void (async()=>{const state=await renderDiscoveryState(server),html=await readFile('discover/index.html','utf8'),css=await Promise.all(['src/styles/tokens.css','src/public-discover/discover.css'].map(path=>readFile(path,'utf8')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({runtime:'discover',title:'Discover | Bankeiz',entry:'/src/public-discover/main.tsx',head:html.match(/<head>([\s\S]*?)<\/head>/)[1]+`<style data-public-page-style="discover">${css.join('\n')}</style>`,content:state.navigationContent}));})().catch(next);});},async transformIndexHtml(html,context){
 if(!context.server||!/^\/discover\/(?:index\.html)?$/.test(context.path))return html;
 const state=await renderDiscoveryState(context.server),feedState=await renderFeedState(context.server),{AccountOpening}=await context.server.ssrLoadModule('/src/features/identity/AccountOpening.tsx'),{publicProfileReservedNames}=await context.server.ssrLoadModule('/src/receiz/public-profile.ts');
 const styles=['/src/styles/tokens.css','/src/styles/app.css','/src/styles/features.css'],css=Object.fromEntries(await Promise.all(styles.map(async url=>[url,await readFile(url.slice(1),'utf8')]))),paint=css[styles[0]]+'\n'+await readFile('src/public-discover/discover.css','utf8'),head=html.match(/<head>([\s\S]*?)<\/head>/)[1];
 const exploreHead=(await readFile('explore/index.html','utf8')).match(/<head>([\s\S]*?)<\/head>/)[1],feedHead=(await readFile('feed/index.html','utf8')).match(/<head>([\s\S]*?)<\/head>/)[1];
 const page={runtime:'discover',title:'Discover | Bankeiz',entry:'/src/public-discover/main.tsx',head:head+`<style data-public-page-style="discover">${paint}</style>`,content:state.navigationContent};
 const navigation=compactNavigation({reserved:publicProfileReservedNames,pages:{'/discover/':page,'/feed/':{runtime:'feed',title:'For you | Bankeiz',entry:'/src/public-feed/main.tsx',head:feedHead,content:feedState.navigationContent},'/explore/':{runtime:'explore',title:'Explore | Bankeiz',entry:'/src/public-explorer/main.tsx',head:exploreHead,content:'<main><h1>Explore</h1></main>'}},bank:{head:'<title>Bankeiz</title>',entry:'/src/main.tsx',styles,css,content:renderToString(createElement(AccountOpening,{resuming:true}))}});
 return applyDiscoveryState(html,state).replace('</head>',`<style data-public-page-style="discover">${paint}</style></head>`).replace('</body>',()=>`<script src="/learn/learn.js" defer></script><script id="receiz-navigation" type="application/json">${JSON.stringify(navigation).replaceAll('<','\\u003c')}</script></body>`);
 }};}
