import type {PublicMarketItem} from '../src/receiz/public-market.js';
import {publicAssetEmbed} from '../src/receiz/public-asset-embed.js';
import {assetPageId,assetPagePath} from '../src/receiz/public-asset-page.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Discovery only: no media bytes, account state or verification runtime. */
export async function handleAssetOembed(request:Request,item:(id:string)=>Promise<PublicMarketItem|null>){
 const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','X-Robots-Tag':'noindex','Cache-Control':'public, max-age=60, s-maxage=300'});
 const fail=(status:number,error:string)=>{headers.set('Cache-Control','no-store');return Response.json({error},{status,headers});};
 const query=new URL(request.url).searchParams;
 if([...query.keys()].some(key=>!['url','format','maxwidth','maxheight','oembed'].includes(key)||query.getAll(key).length!==1)||query.has('oembed')&&query.get('oembed')!=='1')return fail(400,'Invalid embed request.');
 const format=query.get('format');if(format&&format!=='json')return fail(501,'Only JSON oEmbed is supported.');
 let source:URL;try{source=new URL(query.get('url')??'');}catch{return fail(400,'Use the public asset page URL.');}
 const id=assetPageId(source.pathname);
 if(source.origin!=='https://bankeiz.com'||source.username||source.password||source.search||source.hash||!id)return fail(400,'Use the public asset page URL.');
 const bound=(key:string)=>{const value=query.get(key);return value===null?8192:/^[1-9]\d{0,3}$/.test(value)&&Number(value)<=8192?Number(value):null;};
 const maxwidth=bound('maxwidth'),maxheight=bound('maxheight');if(!maxwidth||!maxheight)return fail(400,'Use positive embed dimensions up to 8192 pixels.');
 if(request.method==='HEAD')return new Response(null,{headers});
 try{
  const asset=await item(id);if(!asset)return fail(404,'This public asset is unavailable.');
  const embed=publicAssetEmbed(asset),canonical='https://bankeiz.com'+assetPagePath(id);
  const common={version:'1.0',provider_name:'Bankeiz',provider_url:'https://bankeiz.com',title:asset.title,...(asset.ownerDisplayName||asset.ownerUsername?{author_name:asset.ownerDisplayName??asset.ownerUsername}:{}),...(asset.ownerProfileUrl?{author_url:asset.ownerProfileUrl}:{}),cache_age:60,...(maxwidth>=1730&&maxheight>=909?{thumbnail_url:canonical+'og.png',thumbnail_width:1730,thumbnail_height:909}:{})};
  if(!embed)return Response.json({...common,type:'link'},{headers});
  const scale=Math.min(1,maxwidth/embed.width,maxheight/embed.height);
  // Audio controls need a usable height, independent of the artwork ratio.
  const width=embed.kind==='audio'?Math.min(640,maxwidth):Math.max(1,Math.floor(embed.width*scale)),height=embed.kind==='audio'?Math.min(180,maxheight):Math.max(1,Math.floor(embed.height*scale));
  if(embed.kind==='audio'&&(width<220||height<90))return Response.json({...common,type:'link'},{headers});
  const html=`<iframe src="${escape(embed.playerUrl)}" title="${escape(asset.title)}" width="${width}" height="${height}" style="border:0;max-width:100%" allow="fullscreen; picture-in-picture" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
  return Response.json({...common,type:embed.kind==='video'?'video':'rich',width,height,html},{headers});
 }catch{return fail(503,'The public embed is temporarily unavailable.');}
}
