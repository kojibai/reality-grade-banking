import {bankMarkSvg} from '../branding/bank-mark.mjs';
import type {PublicMarketItem} from '../src/receiz/public-market';
import {parsePublicMarket,safeReceizArtworkUrl} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {assetPageId,assetPagePath} from '../src/receiz/public-asset-page';
import {readReceizPublicMarketSource} from './public-market';
import {marketContentLabel} from '../src/receiz/market-categories';
import {publicAssetEmbed} from '../src/receiz/public-asset-embed';
import {handleAssetOembed} from './asset-oembed';
import {assetEmbedPlayer} from './asset-embed-player';
import {profileAvatarUrl} from '../src/receiz/profile-avatar';
import {profilePagePath,profileUsername} from '../src/receiz/public-profile';
type Dependencies={page():Promise<string>;item(id:string):Promise<PublicMarketItem|null>;image(item:PublicMarketItem):Promise<Uint8Array>};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
import {isShareTrackingKey} from './share-tracking.js';
let catalog:Promise<Map<string,PublicMarketItem>>|undefined;
export async function assetPreviewItem(id:string){
 catalog??=(async()=>{const {readFile}=await import('node:fs/promises'),[market,sports]=await Promise.all(['market','sports'].map(name=>readFile(`public/receiz-public-${name}.json`,'utf8').then(JSON.parse))),base=parsePublicMarket(market,market.snapshot);return new Map(mergePublicSports(base,sports).items.map(item=>[item.id,item]));})().catch(error=>{catalog=undefined;throw error;});
 return(await catalog).get(id)??await resolveLiveAsset(id);
}
/** Cold preview misses reuse public discovery, once per source window. No
 * identity, original download, quote graph or private account is opened. */
export function createLiveAssetResolver(read:typeof readReceizPublicMarketSource){
 const cache=new Map<string,{until:number;value:Map<string,PublicMarketItem>}>(),pending=new Map<string,Promise<Map<string,PublicMarketItem>>>();
 return async(id:string):Promise<PublicMarketItem|null>=>{
  const kind=id.startsWith('sports:')?'sports':'membership',previous=cache.get(kind);
  if(previous&&previous.until>Date.now())return previous.value.get(id)??null;
  let attempt=pending.get(kind);
  if(!attempt){
   attempt=(async()=>{try{const input=await read(kind),base=kind==='membership'?parsePublicMarket(input):mergePublicSports({items:[],complete:false,revision:'public-preview',observedAt:null,sourceCount:0},input),value=new Map(base.items.map(item=>[item.id,item]));cache.set(kind,{until:Date.now()+60_000,value});return value;}catch{const value=previous?.value??new Map<string,PublicMarketItem>();cache.set(kind,{until:Date.now()+5_000,value});return value;}finally{pending.delete(kind);}})();pending.set(kind,attempt);
  }
  return(await attempt).get(id)??null;
 };
}
const resolveLiveAsset=createLiveAssetResolver(readReceizPublicMarketSource);
export function assetPreviewHtml(html:string,id:string,item:PublicMarketItem|null){
 const path=assetPagePath(id),canonical='https://bankeiz.com'+path,title=(item?.title??'Public asset')+' | Bankeiz',description=(item?.summary||'Inspect this asset, its media, ownership, valuation and original evidence.').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,300),image=canonical+'og.png';
 const embed=publicAssetEmbed(item),kind=embed?.kind,discovery=embed?`<link rel="alternate" type="application/json+oembed" href="${escape('https://bankeiz.com/oembed?'+new URLSearchParams({url:canonical,format:'json'}))}" title="${escape(item!.title)}">`:'';
 const mediaTags=embed?`<meta name="twitter:player" content="${escape(embed.playerUrl)}"><meta name="twitter:player:width" content="${embed.width}"><meta name="twitter:player:height" content="${embed.height}">${embed.stream?`<meta property="og:${kind}" content="${escape(embed.stream.url)}"><meta property="og:${kind}:secure_url" content="${escape(embed.stream.url)}"><meta name="twitter:player:stream" content="${escape(embed.stream.url)}">${embed.stream.mimeType?`<meta property="og:${kind}:type" content="${escape(embed.stream.mimeType)}"><meta name="twitter:player:stream:content_type" content="${escape(embed.stream.mimeType)}">`:''}`:''}`:'';
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${item?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="${kind==='audio'?'music.song':kind==='video'?'video.other':'website'}"><meta property="og:site_name" content="Bankeiz"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="${escape(title)}"><meta name="twitter:card" content="${embed?'player':'summary_large_image'}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="${escape(title)}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage','@id':canonical+'#page',url:canonical,name:title,description}).replaceAll('<','\\u003c')}</script>`;
 const artwork=safeReceizArtworkUrl(item?.artworkUrl),cors=artwork?.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':'',cover=artwork?`<figure style="margin:24px 0;max-width:640px"><img src="${escape(artwork)}" alt="${escape(item?.title??'Asset')} artwork" width="640" height="640" loading="eager" fetchpriority="high" decoding="async" referrerpolicy="no-referrer"${cors} style="display:block;width:100%;height:auto;max-height:65vh;object-fit:contain"><figcaption style="font-size:12px;margin-top:8px">Public artwork</figcaption></figure>`:'';
 const coverHint=artwork?`<link rel="preload" as="image" href="${escape(artwork)}" fetchpriority="high" referrerpolicy="no-referrer"${cors}>`:'';
 const owner=profileUsername(item?.ownerUsername),portrait=owner?profileAvatarUrl(item?.ownerAvatarUrl):null,portraitHint=portrait?`<link rel="preload" as="image" href="${escape(portrait)}" referrerpolicy="no-referrer">`:'';
 // Carry the same browser image into both first paint and the React byline.
 // No profile lookup, image proxy or decode wait belongs on this HTML path.
 const ownerByline=owner?`<a class="asset-profile-byline" href="${escape(profilePagePath(owner))}">${portrait?`<span class="profile-avatar" aria-hidden="true"><img src="${escape(portrait)}" alt="" width="30" height="30" loading="eager" decoding="async" referrerpolicy="no-referrer" draggable="false"></span>`:''}<span>Owner<span>@${escape(owner)}</span></span></a>`:'';
 const seed=item?`<script id="public-asset-seed" type="application/json">${JSON.stringify(item).replaceAll('<','\\u003c')}</script>`:'';
 const initial=`<main class="public-entry-placeholder"><nav aria-label="Asset navigation"><a href="/" aria-label="Bankeiz home">${bankMarkSvg}</a><a href="/explore/">Explore</a><a href="/learn/proof-objects/">About ownership</a></nav><p>${item?escape(marketContentLabel(item)):'Public source'}</p><h1>${escape(item?.title??'Asset')}</h1>${ownerByline}${cover}<p>${escape(description)}</p>${item?.sourceUrl?`<a href="${escape(item.sourceUrl)}">Original public source ↗</a>`:''}</main>`;
 return html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'').replace('</head>',()=>tags+mediaTags+discovery+coverHint+portraitHint+'</head>').replace(/(<div id="public-explore-root"[^>]*>)(?:<main[^>]*>\s*(<style>[\s\S]*?<\/style>))?[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,style,end)=>start+(style??'')+initial+end).replace('<script id="receiz-navigation"',()=>seed+'<script id="receiz-navigation"');
}
export async function handleAssetPreview(request:Request,dependencies?:Dependencies):Promise<Response>{
 const headers=new Headers({'Cache-Control':'public, max-age=60, s-maxage=300','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return new Response(null,{status:405,headers});}
 const url=new URL(request.url),image=url.pathname.endsWith('/og.png')||url.searchParams.get('image')==='1',playerPath=/^\/asset\/[^/]+\/player\/?$/.test(url.pathname),player=playerPath||url.searchParams.get('player')==='1';
 if(url.pathname.replace(/\/$/,'')==='/oembed'||url.pathname.replace(/\/$/,'')==='/api/asset'&&url.searchParams.get('oembed')==='1')return handleAssetOembed(request,dependencies?.item??assetPreviewItem);
 // Production rewrites may preserve a trailing slash on the function path.
 // The page URL and its image preview must resolve the same opaque source ID.
 const id=url.pathname.replace(/\/$/,'')==='/api/asset'?url.searchParams.get('asset'):assetPageId(playerPath?url.pathname.replace(/player\/?$/,''):url.pathname.replace(/og\.png$/,''));
 // A platform rewrite can retain its named capture alongside the destination
 // query. Both names may describe this public source, never different sources.
 const conflictingId=['asset','id'].some(key=>url.searchParams.has(key)&&url.searchParams.get(key)!==id);
 if(!id||id.length>256||/[\x00-\x1f\x7f]/.test(id)||url.hash||conflictingId||image&&player||[...url.searchParams.keys()].some(key=>!isShareTrackingKey(key)&&(!['asset','id','image','player'].includes(key)||url.searchParams.getAll(key).length!==1))||url.searchParams.has('image')&&url.searchParams.get('image')!=='1'||url.searchParams.has('player')&&url.searchParams.get('player')!=='1'){headers.set('Cache-Control','no-store');return new Response('This asset page address could not be read.',{status:400,headers});}
 headers.set('Content-Type',image?'image/png':'text/html; charset=utf-8');
 if(player){headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src https://receiz.com; media-src https://receiz.com; frame-ancestors *; base-uri 'none'; form-action 'none'");}
 // HEAD probes neither parse the catalog nor read HTML, load fonts or render PNG.
 if(request.method==='HEAD')return new Response(null,{headers});
 const deps=dependencies??{page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8'),item:assetPreviewItem,image:async(item:PublicMarketItem)=>(await import('./asset-preview-render')).renderAssetImage(item)};
 try{const item=await deps.item(id);if(image)return item?new Response(await deps.image(item) as Uint8Array<ArrayBuffer>,{headers}):new Response(null,{status:404,headers});if(player){const body=item?assetEmbedPlayer(item):null;return new Response(body??'This public player is unavailable. Open the asset page to inspect its source.',{status:body?200:404,headers});}return new Response(assetPreviewHtml(await deps.page(),id,item),{headers});}
 catch{headers.set('Cache-Control','no-store');return new Response('The public asset preview is temporarily unavailable.',{status:503,headers});}
}
