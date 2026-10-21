import type {PublicMarketItem} from './public-market';
import {publicAssetEmbed,publicAssetMediaMetadata} from './public-asset-embed.js';
const held=new Map<string,PublicMarketItem>();
export function assetPagePath(id:string){return `/asset/${encodeURIComponent(id)}/`;}
export function assetPageId(path:string):string|null{
 const match=/^\/asset\/([^/]+)\/?$/.exec(path);if(!match)return null;
 try{const id=decodeURIComponent(match[1]);return id.length>0&&id.length<=256&&!/[\x00-\x1f\x7f]/.test(id)?id:null;}catch{return null;}
}
/** Public display only. Retaining a selected row opens no reader or account. */
export function retainPublicAsset(item:PublicMarketItem){held.delete(item.id);held.set(item.id,item);if(held.size>48)held.delete(held.keys().next().value!);if(typeof dispatchEvent==='function')dispatchEvent(new CustomEvent('bankeiz:asset-metadata',{detail:{id:item.id,title:item.title,description:item.summary,media:publicAssetMediaMetadata(publicAssetEmbed(item)),oembed:'https://bankeiz.com/oembed?url='+encodeURIComponent('https://bankeiz.com'+assetPagePath(item.id))}}));}
export function retainedPublicAsset(id:string){return held.get(id)??null;}
/** Retain an already-carried portrait across a lighter quote projection, only
 * for the same artifact and owner presentation. An explicit clear still wins. */
export function retainAssetOwnerPortrait(current:PublicMarketItem,previous:PublicMarketItem|null):PublicMarketItem{
 return current.ownerAvatarUrl===undefined&&previous?.ownerAvatarUrl&&current.id===previous.id&&current.assetId===previous.assetId&&current.originalDigest===previous.originalDigest&&current.ownerUsername===previous.ownerUsername&&current.ownerDisplayName===previous.ownerDisplayName&&current.ownerProfileUrl===previous.ownerProfileUrl?{...current,ownerAvatarUrl:previous.ownerAvatarUrl}:current;
}
export function assetPageSeed(id:string):PublicMarketItem|null{
 const previous=retainedPublicAsset(id);if(previous)return previous;
 try{const value=JSON.parse(document.getElementById('public-asset-seed')?.textContent??'null');if(value?.id!==id||value.authority!=='projection-only'||value.canTrade!==false||typeof value.assetId!=='string'||typeof value.title!=='string'||!Array.isArray(value.chart))return null;retainPublicAsset(value);return value;}catch{return null;}
}
