import type {PublicMarketItem} from '../src/receiz/public-market';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {assetPageId,assetPagePath} from '../src/receiz/public-asset-page';
import {readReceizPublicMarketSource} from './public-market';
import {marketContentLabel} from '../src/receiz/market-categories';
type Dependencies={page():Promise<string>;item(id:string):Promise<PublicMarketItem|null>;image(item:PublicMarketItem):Promise<Uint8Array>};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
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
 const path=assetPagePath(id),canonical='https://bankeiz.com'+path,title=(item?.title??'Public asset')+' | Bankeiz',description=(item?.summary||'Inspect this public asset, its media, ownership, valuation and original carried evidence.').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,300),image=canonical+'og.png';
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${item?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="${escape(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="${escape(title)}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage','@id':canonical+'#page',url:canonical,name:title,description}).replaceAll('<','\\u003c')}</script>`;
 const seed=item?`<script id="public-asset-seed" type="application/json">${JSON.stringify(item).replaceAll('<','\\u003c')}</script>`:'';
 const initial=`<main class="public-entry-placeholder"><nav aria-label="Asset navigation"><a href="/">Bankeiz</a><a href="/explore/">Explore</a><a href="/learn/proof-objects/">About ownership</a></nav><p>${item?escape(marketContentLabel(item)):'Public source'}</p><h1>${escape(item?.title??'Asset')}</h1><p>${escape(description)}</p>${item?.ownerUsername?`<p>Owner · @${escape(item.ownerUsername)}</p>`:''}${item?.sourceUrl?`<a href="${escape(item.sourceUrl)}">Original public source ↗</a>`:''}</main>`;
 return html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'').replace('</head>',()=>tags+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*<script id="receiz-navigation")/,(_whole,start,end)=>start+initial+end).replace('<script id="receiz-navigation"',()=>seed+'<script id="receiz-navigation"');
}
export async function handleAssetPreview(request:Request,dependencies?:Dependencies):Promise<Response>{
 const headers=new Headers({'Cache-Control':'public, max-age=60, s-maxage=300','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return new Response(null,{status:405,headers});}
 const url=new URL(request.url),image=url.pathname.endsWith('/og.png')||url.searchParams.get('image')==='1';
 // Production rewrites may preserve a trailing slash on the function path.
 // The page URL and its image preview must resolve the same opaque source ID.
 const id=url.pathname.replace(/\/$/,'')==='/api/asset'?url.searchParams.get('asset'):assetPageId(url.pathname.replace(/og\.png$/,''));
 // A platform rewrite can retain its named capture alongside the destination
 // query. Both names may describe this public source, never different sources.
 const conflictingId=['asset','id'].some(key=>url.searchParams.has(key)&&url.searchParams.get(key)!==id);
 if(!id||id.length>256||/[\x00-\x1f\x7f]/.test(id)||url.hash||conflictingId||[...url.searchParams.keys()].some(key=>!['asset','id','image'].includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.has('image')&&url.searchParams.get('image')!=='1'){headers.set('Cache-Control','no-store');return new Response('This asset page address could not be read.',{status:400,headers});}
 headers.set('Content-Type',image?'image/png':'text/html; charset=utf-8');
 // HEAD probes neither parse the catalog nor read HTML, load fonts or render PNG.
 if(request.method==='HEAD')return new Response(null,{headers});
 const deps=dependencies??{page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8'),item:assetPreviewItem,image:async(item:PublicMarketItem)=>(await import('./asset-preview-render')).renderAssetImage(item)};
 try{const item=await deps.item(id);if(image)return item?new Response(await deps.image(item) as Uint8Array<ArrayBuffer>,{headers}):new Response(null,{status:404,headers});return new Response(assetPreviewHtml(await deps.page(),id,item),{headers});}
 catch{headers.set('Cache-Control','no-store');return new Response('The public asset preview is temporarily unavailable.',{status:503,headers});}
}
