import {publicOwnerThumbnails} from './public-owner-thumbnails.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {compactNavigation} from './compact-navigation.mjs';
export const feedSeedScript=seed=>`<script id="public-feed-seed" type="application/json">${JSON.stringify(seed).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`;
export async function renderFeedState(server){
 const [{PublicFeed},{orderFeedItems},{parsePublicMarket},input]=await Promise.all([server.ssrLoadModule('/src/public-feed/PublicFeed.tsx'),server.ssrLoadModule('/src/public-feed/feed-items.ts'),server.ssrLoadModule('/src/receiz/public-market.ts'),readFile('public/receiz-public-market.json','utf8').then(JSON.parse)]);
 const {publicProfileReservedNames}=await server.ssrLoadModule('/src/receiz/public-profile.ts');
 const seed=await publicOwnerThumbnails(orderFeedItems(parsePublicMarket(input,input.snapshot).items).slice(0,8),server);
 if(!seed.length)throw Error('PUBLIC_FEED_SOURCE_EMPTY');
 const render=rows=>renderToStaticMarkup(createElement(PublicFeed,{seed:rows,active:false}));
 return{seed,profileNames:publicProfileReservedNames,content:render(seed),navigationContent:render(seed.slice(0,1))+feedSeedScript(seed.slice(0,1))};
}
export function applyFeedState(html,state){return html.replace('<div id="root"></div>',()=>`<div id="public-feed-root" data-public-runtime="feed">${state.content}</div>${feedSeedScript(state.seed)}`);}
export function feedPageDevPlugin(){return{name:'bankeiz-feed-first-paint',async transformIndexHtml(html,context){if(!context.server||!/^\/feed\/(?:index\.html)?$/.test(context.path))return html;const state=await renderFeedState(context.server),{AccountOpening}=await context.server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
 const styles=['/src/styles/tokens.css','/src/styles/app.css','/src/styles/features.css'],css=Object.fromEntries(await Promise.all(styles.map(async url=>[url,await readFile(url.slice(1),'utf8')]))),feed={runtime:'feed',title:'For you | Bankeiz',entry:'/src/public-feed/main.tsx',head:'<title>For you | Bankeiz</title>',content:state.navigationContent};
 const exploreHead=(await readFile('explore/index.html','utf8')).match(/<head>([\s\S]*?)<\/head>/)[1];
 const navigation=compactNavigation({reserved:state.profileNames,pages:{'/feed/':feed,'/explore/':{runtime:'explore',title:'Explore | Bankeiz',entry:'/src/public-explorer/main.tsx',head:exploreHead,content:'<main><h1>Explore</h1></main>'}},bank:{head:'<title>Bankeiz</title>',entry:'/src/main.tsx',styles,css,content:renderToStaticMarkup(createElement(AccountOpening,{resuming:true}))}});
 return applyFeedState(html,state).replace('</body>',()=>`<script src="/learn/learn.js" defer></script><script id="receiz-navigation" type="application/json">${JSON.stringify(navigation).replaceAll('<','\\u003c')}</script></body>`);}};}
