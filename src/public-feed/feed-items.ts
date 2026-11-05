import {safeReceizArtworkUrl,safeReceizPublicUrl,type PublicMarketItem} from '../receiz/public-market';
export type FeedKind='image'|'video'|'audio'|'book'|'document'|'essay'|'moment'|'collectible';
export function feedKind(item:PublicMarketItem):FeedKind {
 if(item.category==='sports')return 'collectible';
 if(item.mediaKind==='audio'||item.mediaKind==='video'||item.mediaKind==='image')return item.mediaKind;
 if(item.mediaKind==='epub')return 'book';
 if(item.mediaKind==='pdf'||item.mediaKind==='file')return 'document';
 return item.hasLongForm?'essay':'moment';
}
/** The existing reading experience opens prose without a media decoder. */
export function isFeedReadingItem(item:PublicMarketItem):boolean{const kind=feedKind(item);return kind==='essay'||kind==='moment'||kind==='image'&&item.hasLongForm===true;}
/** A cover image can accompany an essay without changing its media identity. */
export function matchesFeedKind(item:PublicMarketItem,filter:FeedKind|'All'):boolean{
 if(filter==='All')return true;const kind=feedKind(item);return kind===filter||filter==='essay'&&kind==='image'&&item.hasLongForm===true;
}
export const feedText=(item:PublicMarketItem)=>item.summary||item.title;
/** Diversity is a local presentation order, never a claim about proof or value. */
export function orderFeedItems(items:readonly PublicMarketItem[]):PublicMarketItem[]{
 const buckets=new Map<FeedKind,PublicMarketItem[]>(),seen=new Set<string>();
 for(const item of items){if(seen.has(item.id))continue;seen.add(item.id);const kind=feedKind(item),bucket=buckets.get(kind)??[];bucket.push(item);buckets.set(kind,bucket);}
 const kinds:FeedKind[]=['image','video','audio','essay','book','moment','document','collectible'],cursors=new Map<FeedKind,number>(),out:PublicMarketItem[]=[];let added=true;
 while(added){added=false;for(const kind of kinds){const rows=buckets.get(kind),at=cursors.get(kind)??0;if(!rows||at>=rows.length)continue;let pick=at;for(let i=at;i<Math.min(rows.length,at+4);i++)if(rows[i].ownerUsername!==out.at(-1)?.ownerUsername){pick=i;break;}[rows[at],rows[pick]]=[rows[pick],rows[at]];out.push(rows[at]);cursors.set(kind,at+1);added=true;}}
 return out;
}
export function appendFeedItems(held:readonly PublicMarketItem[],discovered:readonly PublicMarketItem[]){const ids=new Set(held.map(item=>item.id));return [...held,...orderFeedItems(discovered).filter(item=>{if(ids.has(item.id))return false;ids.add(item.id);return true;})];}
/** Replace display fields only beneath the same exact source coordinates. */
export const sameFeedSource=(held:PublicMarketItem,next:PublicMarketItem)=>held.id===next.id&&held.assetId===next.assetId&&held.category===next.category&&held.originalDigest===next.originalDigest&&held.pulse===next.pulse&&held.cardClaimHash===next.cardClaimHash&&(held.originalDigest!==null||held.verifyUrl===next.verifyUrl);
/** An accepted public successor refreshes details without reordering held rows. */
export function refreshFeedItems(held:readonly PublicMarketItem[],discovered:readonly PublicMarketItem[]){const current=new Map(discovered.map(item=>[item.id,item]));return appendFeedItems(held.map(item=>{const next=current.get(item.id);return next&&sameFeedSource(item,next)?next:item;}),discovered);}
/** Public HTML carries display projections only, with the same URL restrictions. */
export function readFeedSeed(input:string|null|undefined):PublicMarketItem[]{
 try{const rows:unknown=JSON.parse(input??'null');if(!Array.isArray(rows)||rows.length>24)return [];
 return rows.filter((row):row is PublicMarketItem=>!!row&&typeof row==='object'&&row.authority==='projection-only'&&row.canTrade===false&&typeof row.id==='string'&&row.id.length>0&&row.id.length<=256&&typeof row.assetId==='string'&&row.assetId.length<=256&&typeof row.title==='string'&&typeof row.summary==='string'&&['proof','sports'].includes(row.category)&&Array.isArray(row.chart)).map(item=>({...item,artworkUrl:safeReceizArtworkUrl(item.artworkUrl),...(item.videoPosterUrl!==undefined?{videoPosterUrl:safeReceizArtworkUrl(item.videoPosterUrl)}:{}),originalUrl:safeReceizPublicUrl(item.originalUrl,'original'),verifyUrl:safeReceizPublicUrl(item.verifyUrl,'proof'),sourceUrl:safeReceizPublicUrl(item.sourceUrl,'source')}));
 }catch{return [];}
}
