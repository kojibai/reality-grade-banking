import {safeReceizArtworkUrl,safeReceizPublicUrl,type PublicMarketItem} from '../receiz/public-market';
export type FeedKind='image'|'video'|'audio'|'book'|'document'|'essay'|'moment'|'collectible';
export function feedKind(item:PublicMarketItem):FeedKind {
 if(item.category==='sports')return 'collectible';
 if(item.mediaKind==='audio'||item.mediaKind==='video'||item.mediaKind==='image')return item.mediaKind;
 if(item.mediaKind==='epub')return 'book';
 if(item.mediaKind==='pdf'||item.mediaKind==='file')return 'document';
 return item.hasLongForm?'essay':'moment';
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
/** Public HTML carries display projections only, with the same URL restrictions. */
export function readFeedSeed(input:string|null|undefined):PublicMarketItem[]{
 try{const rows:unknown=JSON.parse(input??'null');if(!Array.isArray(rows)||rows.length>24)return [];
 return rows.filter((row):row is PublicMarketItem=>!!row&&typeof row==='object'&&row.authority==='projection-only'&&row.canTrade===false&&typeof row.id==='string'&&row.id.length>0&&row.id.length<=256&&typeof row.assetId==='string'&&row.assetId.length<=256&&typeof row.title==='string'&&typeof row.summary==='string'&&['proof','sports'].includes(row.category)&&Array.isArray(row.chart)).map(item=>({...item,artworkUrl:safeReceizArtworkUrl(item.artworkUrl),originalUrl:safeReceizPublicUrl(item.originalUrl,'original'),verifyUrl:safeReceizPublicUrl(item.verifyUrl,'proof'),sourceUrl:safeReceizPublicUrl(item.sourceUrl,'source')}));
 }catch{return [];}
}
