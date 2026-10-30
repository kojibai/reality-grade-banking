import {createHash} from 'node:crypto';
import {profileAvatarUrl} from '../src/receiz/profile-avatar';
import {BOOKING_LINK_KEYS} from '../src/receiz/booking-link';
import {isShareTrackingKey} from './share-tracking';
export type BookingShareOwner={username:string;displayName:string;avatarUrl:string|null};
export const BOOKING_SHARE_CRAWLER='.*(?:[Bb]ot|[Cc]rawler|[Ss]pider|[Ss]lurp|facebookexternalhit|[Ww]hats[Aa]pp|Telegram|Discord|Slack|LinkedIn|[Ii][Mm]essage|[Ll]ink[Pp]resentation|[Ff]acebot).*';
export const isBookingShareCrawler=(agent:string)=>new RegExp(BOOKING_SHARE_CRAWLER).test(agent);
const usernamePattern=/^[a-z0-9_]{3,24}$/;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class BookingShareError extends Error{constructor(public status:number){super('BOOKING_SHARE_UNAVAILABLE');}}
/** Public booking presentation only. Concurrent readers share the existing
 * public calendar read; no saved profile can outrank a later public refusal. */
export function createBookingOwnerReader(fetchImpl:typeof fetch=fetch){
 const pending=new Map<string,Promise<BookingShareOwner>>();
 return(username:string):Promise<BookingShareOwner>=>{
  if(!usernamePattern.test(username))return Promise.reject(new BookingShareError(400));
  const held=pending.get(username);if(held)return held;
  const attempt=(async()=>{
   const response=await fetchImpl('https://receiz.com/api/calendar/embed/'+username,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
   if(!response.ok){await response.body?.cancel();throw new BookingShareError([403,404].includes(response.status)?response.status:503);}
   const limit=2*1024*1024;if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw new BookingShareError(503);}
   const reader=response.body?.getReader();if(!reader)throw new BookingShareError(503);const parts:Uint8Array[]=[];let size=0;
   try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>limit)throw new BookingShareError(503);parts.push(chunk.value);}}finally{await reader.cancel().catch(()=>{});}
   const data=JSON.parse(Buffer.concat(parts).toString('utf8')),owner=data?.owner;
   if(data?.ok!==true||owner?.username!==username||typeof owner.displayName!=='string'||!owner.displayName.trim()||owner.displayName.length>2000||owner.avatarUrl!==null&&typeof owner.avatarUrl!=='string')throw new BookingShareError(503);
   return{username,displayName:owner.displayName,avatarUrl:profileAvatarUrl(owner.avatarUrl)};
  })();pending.set(username,attempt);void attempt.finally(()=>{if(pending.get(username)===attempt)pending.delete(username);}).catch(()=>{});return attempt;
 };
}
export const readBookingOwner=createBookingOwnerReader();
export function bookingPreviewHtml(html:string,owner:BookingShareOwner){
 const name=owner.displayName.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,200),title='Meet with '+name+' | Bankeiz',description='Choose a time with '+name+'. A little time, set aside.',canonical='https://bankeiz.com/book/'+owner.username+'/';
 const version=createHash('sha256').update(JSON.stringify([name,owner.avatarUrl,'personal-invitation-v1'])).digest('hex').slice(0,16),image=canonical+'og.png?v='+version,alt='A personal booking invitation from '+name+'. Choose a time on Bankeiz.';
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="noindex,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="${escape(alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escape(alt)}">`;
 const structured={'@context':'https://schema.org','@type':'WebPage',url:canonical,name:title,description,inLanguage:'en',isPartOf:{'@id':'https://bankeiz.com/#website'},primaryImageOfPage:{'@type':'ImageObject',url:image,width:1730,height:909,caption:alt}};
 return html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'').replace('</head>',()=>tags+`<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script></head>`);
}
type Dependencies={owner(username:string):Promise<BookingShareOwner>;page():Promise<string>;image(owner:BookingShareOwner):Promise<Uint8Array>};
export async function handleBookingPreview(request:Request,dependencies?:Dependencies):Promise<Response>{
 const url=new URL(request.url),match=/^\/book\/([a-z0-9_]{3,24})(\/og\.png|\/?)$/.exec(url.pathname),api=/^\/api\/book\/?$/.test(url.pathname),username=api?url.searchParams.get('username'):match?.[1],image=match?.[2]==='/og.png'||url.searchParams.get('image')==='1';
 const headers=new Headers({'Content-Type':image?'image/png':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...Object.fromEntries(headers),Allow:'GET, HEAD'}});
 const allowed=new Set<string>(['username','image','v',...BOOKING_LINK_KEYS]);
 if(!username||!usernamePattern.test(username)||url.hash||url.searchParams.has('username')&&url.searchParams.get('username')!==username||[...url.searchParams.keys()].some(key=>!isShareTrackingKey(key)&&(!allowed.has(key)||url.searchParams.getAll(key).length!==1))||url.searchParams.has('image')&&url.searchParams.get('image')!=='1'||url.searchParams.has('v')&&!/^[a-f0-9]{16}$/.test(url.searchParams.get('v')!))return new Response(null,{status:400,headers});
 if(request.method==='HEAD')return new Response(null,{headers});
 const deps=dependencies??{owner:readBookingOwner,page:async()=>(await import('node:fs/promises')).readFile('dist/book/index.html','utf8'),image:async owner=>(await import('./booking-share-art')).renderBookingImage(owner)};
 try{
  // The template read and public owner read are independent. PNG rendering and
  // portrait retrieval are reached only by the dedicated social image request.
  if(image){const owner=await deps.owner(username),png=await deps.image(owner);headers.set('Cache-Control','public, max-age=60, s-maxage=300');return new Response(png as Uint8Array<ArrayBuffer>,{headers});}
  const [owner,html]=await Promise.all([deps.owner(username),deps.page()]);return new Response(bookingPreviewHtml(html,owner),{headers});
 }catch(cause){headers.set('Content-Type','text/plain; charset=utf-8');return new Response('This booking invitation is temporarily unavailable.',{status:cause instanceof BookingShareError?cause.status:503,headers});}
}
