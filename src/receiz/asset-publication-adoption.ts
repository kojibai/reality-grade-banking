import {parsePublicMarket,type PublicMarketCatalog,type PublicMarketItem} from './public-market.js';
import {retainedPublicProfile,retainPublicProfile,type PublicProfile} from './public-profile.js';
import {safeImportedSourceUrl} from './imported-source-url.js';
import type {AssetPublicationReceipt} from './asset-publication';
import type {ConnectedAssetLocalAdmission} from './asset-publication-runtime';
type Owner=Readonly<{identityDigest:string;accountUid:string;isCurrent?():boolean;artwork?:Blob}>;
type Row=Record<string,unknown>;
type Addition={owner:{identityDigest:string;accountUid:string};username:string;sourceDigest:string;showcaseDigest:string;row:Row;item:PublicMarketItem;receipt?:AssetPublicationReceipt;marketSeen?:boolean;profileSeen?:boolean;artworkUrl?:string};
const localItems=new WeakSet<PublicMarketItem>(),previews=new Map<string,{username:string;url:string}>();
const KEY='bankeiz-admitted-public-assets-v1',additions=new Map<string,Addition>(),listeners=new Set<(catalog?:PublicMarketCatalog)=>void>();let restored=false;
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const changed=()=>{save();for(const listener of listeners)listener();};
function save(){try{let rows=[...additions.values()].slice(-32).map(({owner,username,sourceDigest,showcaseDigest,row,receipt,marketSeen,profileSeen})=>({owner,username,sourceDigest,showcaseDigest,row,receipt,marketSeen,profileSeen}));while(rows.length&&JSON.stringify(rows).length>2_000_000)rows.shift();localStorage.setItem(KEY,JSON.stringify(rows));}catch{/* Exact source custody is independent of display retention. */}}
function restore(){if(restored)return;restored=true;try{const values:unknown=JSON.parse(localStorage.getItem(KEY)??'[]');if(!Array.isArray(values)||values.length>32)return;for(const raw of values){const v=object(raw),owner=object(v.owner);if(!hex(v.sourceDigest)||!hex(v.showcaseDigest)||!hex(owner.identityDigest)||typeof owner.accountUid!=='string'||typeof v.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(v.username))continue;const item=parsePublicMarket({ok:true,transport:{publicOriginals:[v.row]}}).items[0];if(!item||item.originalDigest!==v.sourceDigest||item.ownerUsername!==v.username)continue;additions.set(v.sourceDigest,{owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username:v.username,sourceDigest:v.sourceDigest,showcaseDigest:v.showcaseDigest,row:object(v.row),item,...(v.receipt&&object(v.receipt).status==='published'&&hex(object(v.receipt).artifactDigest)?{receipt:v.receipt as AssetPublicationReceipt}:{}),marketSeen:v.marketSeen===true,profileSeen:v.profileSeen===true});}}catch{/* Malformed display retention never admits an original. */}}
function artwork(item:PublicMarketItem){const preview=item.originalDigest?previews.get(item.originalDigest):undefined;return preview?{...item,artworkUrl:preview.url}:item;}
function displayItem(entry:Addition){const item=artwork(entry.item);localItems.add(item);return item;}
export function subscribeAssetPublicationAdmissions(listener:(catalog?:PublicMarketCatalog)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** Only the canonical runtime's local-admission callback calls this seam.
 * These are public display additions, never ownership or financial authority. */
export function retainAssetPublicationAdmission(admission:ConnectedAssetLocalAdmission,owner:Owner):void{
 if(owner.isCurrent&&!owner.isCurrent())return;restore();
 const original=object(admission.original),reference=object(admission.sourceReference),carriedReference=object(object(original.importedSource).reference),id=original.id;
 const username=admission.username;
 if(!hex(owner.identityDigest)||!owner.accountUid||!/^[a-z0-9_]{3,24}$/.test(username)||typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||original.showOnProfile!==true||!hex(reference.artifactSha256)||reference.artifactSha256!==carriedReference.artifactSha256||!hex(admission.firstPaint.artifactDigest)||!safeImportedSourceUrl('/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)}),'artifact'))throw Error('BANK_ASSET_PUBLICATION_ADMISSION_INVALID');
 const profile=retainedPublicProfile(username);if(profile&&profile.userId!==owner.accountUid)return;
 const media=original.media===null?null:object(original.media),long=object(original.longForm),preview=object(original.marketPreview);
 const projection={id,assetTitle:original.assetTitle,claim:original.claim,code:original.code,pulse:original.pulse,verifyPath:original.verifyPath,proof:original.proof,claimHashHex:original.claimHashHex,pbiReceiptHash:original.pbiReceiptHash,recordCardMediaSha256Hex:original.recordCardMediaSha256Hex,media,mediaKind:media===null?'moment':media.kind,hasLongForm:typeof long.text==='string'&&long.text.length>0,attachments:Array.isArray(original.attachments)?original.attachments.map(value=>{const file=object(value);return{id:file.id,name:file.name,sha256Hex:file.sha256Hex,src:file.src,downloadName:file.downloadName};}):[]};
 const row={id:`profile:${username}:${id}`,receizId:id,title:original.assetTitle,summary:original.claim,visibility:'public',ownerUsername:username,ownerDisplayName:profile?.displayName??username,ownerAvatarUrl:profile?.avatarUrl??null,canonicalHref:`https://receiz.com/${username}/verified/${encodeURIComponent(id)}`,verifyHref:original.verifyUrl??original.verifyPath,pulse:original.pulse,createdAt:original.createdAt,valueUsd:preview.priceUsd,livePulseSeed:preview.livePulseSeed,profileOriginal:projection};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[row]}}).items[0];if(!item||item.originalDigest!==reference.artifactSha256)throw Error('BANK_ASSET_PUBLICATION_ADMISSION_INVALID');
 const previous=additions.get(reference.artifactSha256);
 if(previous&&(previous.item.id!==item.id||previous.owner.accountUid!==owner.accountUid))throw Error('BANK_ASSET_PUBLICATION_ADMISSION_CONFLICT');
 const artworkUrl=previews.get(reference.artifactSha256)?.url??(owner.artwork&&typeof URL.createObjectURL==='function'?URL.createObjectURL(owner.artwork):undefined);if(artworkUrl){previews.set(reference.artifactSha256,{username,url:artworkUrl});if(previews.size>32){const oldest=previews.keys().next().value!;URL.revokeObjectURL(previews.get(oldest)!.url);previews.delete(oldest);}}
 additions.set(reference.artifactSha256,{...previous,owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username,sourceDigest:reference.artifactSha256,showcaseDigest:admission.firstPaint.artifactDigest,row,item,...(artworkUrl?{artworkUrl}:{})});
 if(additions.size>128){const oldest=additions.keys().next().value!;drop(oldest);}
 if(profile)retainPublicProfile(profile);changed();
 if(typeof dispatchEvent==='function')dispatchEvent(new CustomEvent('bankeiz:profile-updated',{detail:{username}}));
}
export function acknowledgeAssetPublication(sourceDigest:string,receipt:AssetPublicationReceipt):void{restore();const entry=additions.get(sourceDigest);if(!entry)throw Error('BANK_ASSET_PUBLICATION_ADMISSION_REQUIRED');if(receipt.status==='published'&&(!hex(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||!Number.isSafeInteger(receipt.visibleChildCount)))throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');entry.receipt=receipt;changed();}
export function assetPublicationFreshnessHint():string|undefined{restore();return [...additions.values()].reverse().find(entry=>entry.receipt?.status==='published'&&!entry.marketSeen)?.sourceDigest;}
function matches(item:PublicMarketItem,entry:Addition){return item.id===entry.item.id&&item.assetId===entry.item.assetId&&item.originalDigest===entry.sourceDigest;}
function drop(digest:string){additions.delete(digest);}
/** Accepted discovery retires the display overlay independently per surface. */
export function mergeAdmittedPublicAssets(catalog:PublicMarketCatalog):PublicMarketCatalog{restore();let mutated=false;const fresh:PublicMarketItem[]=[];for(const entry of additions.values()){
 const accepted=catalog.items.find(item=>matches(item,entry)&&!localItems.has(item));if(accepted){if(!entry.marketSeen){entry.marketSeen=true;mutated=true;}}else if(!entry.marketSeen)fresh.push(displayItem(entry));if(entry.marketSeen&&entry.profileSeen){drop(entry.sourceDigest);mutated=true;}
 }if(mutated)save();return fresh.length?{...catalog,items:[...fresh.reverse(),...catalog.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],sourceCount:catalog.sourceCount+fresh.filter(item=>!catalog.items.some(previous=>previous.id===item.id)).length,complete:false}:{...catalog,items:catalog.items.map(artwork)};}
export function mergeAdmittedProfileAssets(profile:PublicProfile):PublicProfile{restore();const fresh:PublicMarketItem[]=[];let mutated=false;for(const entry of additions.values()){
 if(entry.username!==profile.username||entry.owner.accountUid!==profile.userId)continue;const accepted=profile.items.find(item=>matches(item,entry)&&!localItems.has(item));if(accepted){if(!entry.profileSeen){entry.profileSeen=true;mutated=true;}}else if(!entry.profileSeen){const item={...displayItem(entry),ownerDisplayName:profile.displayName,ownerAvatarUrl:profile.avatarUrl};localItems.add(item);fresh.push(item);};if(entry.marketSeen&&entry.profileSeen){drop(entry.sourceDigest);mutated=true;}
 }if(mutated)save();return fresh.length?{...profile,items:[...fresh.reverse(),...profile.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],stats:{...profile.stats,originals:profile.stats.originals===null?null:profile.stats.originals+fresh.filter(item=>!profile.items.some(previous=>previous.id===item.id)).length}}:profile;}
export function forgetAssetPublicationAdmissions(username?:string){restore();if(!username)sourceFiles.clear();else for(const [digest,entry]of additions)if(entry.username===username)sourceFiles.delete(digest);for(const[digest,preview]of previews)if(!username||preview.username===username){URL.revokeObjectURL(preview.url);previews.delete(digest);}for(const [digest,entry]of additions)if(!username||entry.username===username)drop(digest);changed();}

const publicationRefreshes=new Map<string,Promise<void>>();
export function refreshAssetPublicationCatalog(sourceDigest:string):Promise<void>{
 const existing=publicationRefreshes.get(sourceDigest);if(existing)return existing;
 const read=import('./public-market.js').then(module=>module.fetchPublicMarket(undefined,sourceDigest)).then(catalog=>{mergeAdmittedPublicAssets(catalog);for(const listener of listeners)listener(catalog);}).catch(()=>{/* The admitted object remains visible; normal refresh retries the same hint. */}).finally(()=>publicationRefreshes.delete(sourceDigest));
 publicationRefreshes.set(sourceDigest,read);return read;
}

// Exact source bytes stay in the existing encrypted vault. This bounded memory
// handoff only avoids downloading the public artifact we just retained.
const sourceFiles=new Map<string,File>();
export function retainAssetPublicationSource(digest:string,file:File):void{
 if(!hex(digest)||!file.size||file.size>16*1024*1024)throw Error('BANK_ASSET_PUBLICATION_SOURCE_INVALID');
 sourceFiles.delete(digest);sourceFiles.set(digest,file);
 while(sourceFiles.size>32||[...sourceFiles.values()].reduce((total,item)=>total+item.size,0)>32*1024*1024)sourceFiles.delete(sourceFiles.keys().next().value!);
}
export function retainedAssetPublicationSource(digest:string):File|null{return sourceFiles.get(digest)??null;}
