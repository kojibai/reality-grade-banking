import {readPublicOriginal,readPublicProfile,createPublicProfileReader,PublicProfileError} from './public-profile.js';
import {readReceizPublicMarketSource} from './public-market.js';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market.js';
import {mergePublicSports} from '../src/receiz/public-sports.js';
import {profileUsername} from '../src/receiz/public-profile.js';
import {publicAssetReading,publicProfileReading,renderReadingDocument} from './public-reading-document.js';
import {createPublicReadingOriginalReader} from './public-reading-source.js';

type Dependencies={profile:typeof readPublicProfile;original:typeof readPublicOriginal;catalog:(kind:'sports'|'membership')=>Promise<PublicMarketItem[]>};
// The same public collection read; this view does not need chart-history
// decoration, so it never prepares the app's share-history graph.
const readReadingProfile=createPublicProfileReader(fetch,async profile=>profile);
const readReadingOriginal=createPublicReadingOriginalReader();
async function catalog(kind:'sports'|'membership'){
 const input=await readReceizPublicMarketSource(kind);
 return kind==='membership'?parsePublicMarket(input).items:mergePublicSports({items:[],complete:false,revision:'public-reading',observedAt:null,sourceCount:0},input).items;
}
function textPreferred(accept:string){
 const types=accept.toLowerCase().split(',').map(part=>{const [mime,...params]=part.trim().split(';'),q=params.find(value=>value.trim().startsWith('q='))?.split('=')[1];return{mime,q:q===undefined?1:Number(q)};});
 const quality=(mime:string)=>Math.max(0,...types.filter(type=>type.mime===mime&&Number.isFinite(type.q)&&type.q<=1).map(type=>type.q));
 return quality('text/plain')>quality('text/html');
}
/** An independent anonymous GET representation. No app route dispatches here,
 * incoming credentials are unused, and no missing source has a cache fallback. */
export async function handlePublicReading(request:Request,dependencies:Dependencies={profile:readReadingProfile,original:readReadingOriginal,catalog}):Promise<Response>{
 const url=new URL(request.url),headers=new Headers({'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff',Vary:'Accept','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});
 const fail=(status:number)=>{headers.set('X-Robots-Tag','noindex, nofollow');return new Response(status===403?'This source is private.':status===404?'Public reading not found.':status===405?'Only GET and HEAD are supported.':status===400?'This public reading address is invalid.':'The public source is temporarily unavailable.',{status,headers});};
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return fail(405);}
 const api=/^\/api\/read\/?$/.test(url.pathname),match=/^\/read\/(assets|profiles)\/([^/]+)\/?$/.exec(url.pathname);
 if(!api&&!match)return fail(404);
 let id:string;try{id=match?decodeURIComponent(match[2]):url.searchParams.get('id')??'';}catch{return fail(400);}
 const kind=match?(match[1]==='assets'?'asset':'profile'):url.searchParams.get('kind');
 if(!['asset','profile'].includes(kind??'')||!id||id.length>256||! /^[A-Za-z0-9][A-Za-z0-9_:.-]*$/.test(id)||kind==='profile'&&!profileUsername(id)||url.hash)return fail(400);
 const allowed=['kind','id','format',...(kind==='profile'?['page','username']:['asset'])];
 if([...url.searchParams.keys()].some(key=>!allowed.includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.has('kind')&&url.searchParams.get('kind')!==kind||['id',kind==='profile'?'username':'asset'].some(key=>url.searchParams.has(key)&&url.searchParams.get(key)!==id))return fail(400);
 const pageInput=url.searchParams.get('page')??'1',formatInput=url.searchParams.get('format');
 if(!/^[1-9][0-9]{0,3}$/.test(pageInput)||formatInput!==null&&!['html','text'].includes(formatInput))return fail(400);
 const coordinate=kind==='asset'?/^profile:([a-z0-9_]{3,24}):([A-Za-z0-9_-]{1,128})$/.exec(id):null;
 if(kind==='asset'&&id.startsWith('profile:')&&!coordinate)return fail(400);
 const format=formatInput==='text'||formatInput===null&&textPreferred(request.headers.get('accept')??'')?'text':'html';
 headers.set('Content-Type',format==='text'?'text/plain; charset=utf-8':'text/html; charset=utf-8');
 if(request.method==='HEAD')return new Response(null,{headers});
 try{
  if(kind==='profile'){
   const profile=await dependencies.profile(id);if(profile.username!==id)throw Error('READING_SOURCE_MISMATCH');
   return new Response(renderReadingDocument(publicProfileReading(profile,Number(pageInput)),format),{headers});
  }
  const item=coordinate?await dependencies.original(coordinate[1],coordinate[2]):(await dependencies.catalog(id.startsWith('sports:')?'sports':'membership')).find(item=>item.id===id);
  if(!item)return fail(404);if(item.id!==id||item.authority!=='projection-only'||item.canTrade!==false)throw Error('READING_SOURCE_MISMATCH');
  return new Response(renderReadingDocument(publicAssetReading(item),format),{headers});
 }catch(error){return fail(error instanceof PublicProfileError&&[403,404].includes(error.status)?error.status:error instanceof Error&&error.message==='READING_PAGE_NOT_FOUND'?404:503);}
}
