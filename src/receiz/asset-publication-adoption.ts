import {retainPublicMomentManifest} from './public-asset-manifest.js';
import {parsePublicMarket,refusesPublicMarketSelection,retainPublicMarketSports,retainPublicArtwork,retainPublicMarket,retainPublicProfileHeaders,mergePublicQuotes,reusePublicMarketResponse,type PublicMarketCatalog,type PublicMarketItem} from './public-market.js';
import {retainedPublicProfile,retainPublicProfile,type PublicProfile} from './public-profile.js';
import {safeImportedSourceUrl} from './imported-source-url.js';
import {readAccountAppearance} from './account-appearance.js';
import {mergeShareInventory,compatibleShareInventory} from './market-share-inventory.js';
import {projectAssetPublicationReceipt,type AssetPublicationReceipt} from './asset-publication.js';
import type {ConnectedAssetLocalAdmission} from './asset-publication-runtime';
import {jcsCanonicalize} from '../../native/receiz/app/utils/jcs.js';
type Owner=Readonly<{identityDigest:string;accountUid:string;isCurrent?():boolean;artwork?:Blob}>;
type Row=Record<string,unknown>;
type Addition={owner:{identityDigest:string;accountUid:string};username:string;sourceDigest:string;showcaseDigest:string|null;row:Row;item:PublicMarketItem;receipt?:AssetPublicationReceipt;sourceReceipt?:Extract<AssetPublicationReceipt,{status:'published'}>;sourceSeen?:boolean;signatureDeliveryHash?:string;marketSeen?:boolean;profileSeen?:boolean;artworkUrl?:string};
const previews=new Map<string,{username:string;url:string}>();
const KEY='bankeiz-admitted-public-assets-v1',additions=new Map<string,Addition>(),listeners=new Set<(catalog?:PublicMarketCatalog,snapshot?:unknown)=>void>();let restored=false;
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const changed=()=>{save();for(const listener of listeners){try{listener();}catch{/* A display observer cannot veto the admitted Source or its delivery. */}}};
function save(){try{let rows=[...additions.values()].slice(-32).map(({owner,username,sourceDigest,showcaseDigest,row,receipt,sourceReceipt,sourceSeen,signatureDeliveryHash,marketSeen,profileSeen})=>({owner,username,sourceDigest,showcaseDigest,row,receipt,sourceReceipt,sourceSeen,signatureDeliveryHash,marketSeen,profileSeen}));while(rows.length&&JSON.stringify(rows).length>2_000_000)rows.shift();localStorage.setItem(KEY,JSON.stringify(rows));}catch{/* Exact source custody is independent of display retention. */}}
function restore(){if(restored)return;restored=true;try{const values:unknown=JSON.parse(localStorage.getItem(KEY)??'[]');if(!Array.isArray(values)||values.length>32)return;for(const raw of values){const v=object(raw),owner=object(v.owner);if(!hex(v.sourceDigest)||!(v.showcaseDigest===null||hex(v.showcaseDigest))||!hex(owner.identityDigest)||typeof owner.accountUid!=='string'||typeof v.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(v.username))continue;const item=parsePublicMarket({ok:true,transport:{publicOriginals:[v.row]}}).items[0];if(!item||item.originalDigest!==v.sourceDigest||item.ownerUsername!==v.username)continue;
 // Older retention could copy the unsigned Source acknowledgment onto a signed
 // local row. Resume its saved native proof unless this exact append was seen.
 const signed=item.hasPbiSignature&&hex(item.pbiReceiptHash),confirmed=!signed||v.signatureDeliveryHash===item.pbiReceiptHash;
 additions.set(v.sourceDigest,{owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username:v.username,sourceDigest:v.sourceDigest,showcaseDigest:v.showcaseDigest,row:object(v.row),item,...(confirmed&&v.receipt&&object(v.receipt).status==='published'&&hex(object(v.receipt).artifactDigest)?{receipt:v.receipt as AssetPublicationReceipt}:{}),...(object(v.sourceReceipt).status==='published'&&hex(object(v.sourceReceipt).artifactDigest)?{sourceReceipt:v.sourceReceipt as Extract<AssetPublicationReceipt,{status:'published'}>}:object(v.receipt).status==='published'&&hex(object(v.receipt).artifactDigest)?{sourceReceipt:v.receipt as Extract<AssetPublicationReceipt,{status:'published'}>}:{}),sourceSeen:v.sourceSeen===true||confirmed&&(v.marketSeen===true||v.profileSeen===true),...(signed&&confirmed?{signatureDeliveryHash:item.pbiReceiptHash}:{}),marketSeen:confirmed&&v.marketSeen===true,profileSeen:confirmed&&v.profileSeen===true});}}catch{/* Malformed display retention never admits an original. */}}
function artwork(item:PublicMarketItem){const preview=item.originalDigest?previews.get(item.originalDigest):undefined;return preview&&item.artworkUrl!==preview.url?{...item,artworkUrl:preview.url}:item;}
/** Only this module's exact locally created preview, bound to its public owner
 * and source. Remote artwork fields cannot introduce an arbitrary blob URL. */
export function retainedAssetPublicationArtwork(sourceDigest:string,username?:string):string|null{const preview=previews.get(sourceDigest);return preview&&(!username||preview.username===username)?preview.url:null;}
function displayItem(entry:Addition,profile=retainedPublicProfile(entry.username)){
 let item:PublicMarketItem={...entry.item,admittedOwnerUserId:entry.owner.accountUid};
 if(profile?.username===entry.username&&profile.userId===entry.owner.accountUid){
  item={...item,ownerDisplayName:profile.displayName,ownerAvatarUrl:profile.avatarUrl};
  const observed=profile.items.find(value=>matches(value,entry));
  if(observed?.verifyUrl&&item.verifyUrl){
   const current=new URL(item.verifyUrl),carried=new URL(observed.verifyUrl);
   if(current.pathname===carried.pathname&&!current.searchParams.has('c')&&carried.searchParams.has('c'))item={...item,verifyUrl:observed.verifyUrl,readingUrl:observed.readingUrl??observed.verifyUrl};
  }
 }else if(!profile){
  const appearance=readAccountAppearance();
  if(appearance?.accountUid===entry.owner.accountUid&&appearance.avatarUrl)item={...item,ownerAvatarUrl:appearance.avatarUrl};
 }
 return artwork(item);
}
/** Signing changes this Original's authorship append, not its existing share
 * observation. Reuse it only for the identical source and canonical asset. */
function retainObservedShares(item:PublicMarketItem,entry:Addition,observed:PublicMarketItem|undefined):PublicMarketItem{
 if(!observed||!matches(observed,entry))return item;
 const shareInventory=compatibleShareInventory(item,observed.shareInventory);
 return shareInventory?{...item,shareInventory}:item;
}
/** Navigate the exact admitted Original; this display selector grants no trade authority. */
export function admittedAssetPublicationItem(sourceDigest:string,username:string,accountUid?:string):PublicMarketItem|null{restore();const entry=additions.get(sourceDigest);return entry?.username===username&&!(entry.marketSeen&&entry.profileSeen)&&(accountUid===undefined||entry.owner.accountUid===accountUid)?displayItem(entry):null;}
/** Delivery acknowledgment updates this display without rereading the account. */
export function admittedAssetPublicationDelivery(sourceDigest:string,username:string):import('./asset-publication').AssetPublicationDelivery|null{restore();const entry=additions.get(sourceDigest);if(entry?.username!==username)return null;const receipt=entry.sourceReceipt??entry.receipt;if(receipt?.status==='published')return {...projectAssetPublicationReceipt(receipt)};if(entry.sourceSeen||entry.marketSeen||entry.profileSeen)return {status:'published'};return receipt?{status:receipt.status,code:receipt.code}:null;}
/** Current signature delivery only. An earlier accepted Source receipt cannot
 * confirm a later signed intent; its native admission clears this receipt. */
export function admittedAssetPublicationSignatureDelivery(sourceDigest:string,username:string):import('./asset-publication').AssetPublicationDelivery|null{restore();const entry=additions.get(sourceDigest);if(entry?.username!==username||!entry.item.hasPbiSignature||!hex(entry.item.pbiReceiptHash))return null;const receipt=entry.receipt;if(receipt?.status==='published')return {...projectAssetPublicationReceipt(receipt)};if(entry.signatureDeliveryHash===entry.item.pbiReceiptHash&&(entry.marketSeen||entry.profileSeen))return {status:'published'};return receipt?{status:receipt.status,code:receipt.code}:null;}
/** A small display locator set, never signature authority. The native runtime
 * reopens the selected source and requires its already-saved PBI proof. */
export function pendingAssetPublicationSignatures(identityDigest:string,accountUid:string,username?:string):readonly string[]{
 restore();return [...additions.values()].filter(entry=>entry.owner.identityDigest===identityDigest&&entry.owner.accountUid===accountUid&&(username===undefined||entry.username===username)&&entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash)&&entry.receipt?.status!=='published'&&!entry.profileSeen&&!entry.marketSeen).map(entry=>entry.sourceDigest);
}
export function hasObservedAssetPublicationSignature(identityDigest:string,accountUid:string,sourceDigest:string,pbiReceiptHash:string){
 restore();const entry=additions.get(sourceDigest);
 return entry?.owner.identityDigest===identityDigest&&entry.owner.accountUid===accountUid&&entry.signatureDeliveryHash===pbiReceiptHash;
}
/** Bounded owner display locators only. Exact bytes and the canonical Source
 * opener, never delivery status or these rows, decide local projection. */
export function retainedAssetPublicationDigests(identityDigest:string,accountUid:string,username:string):readonly string[]{
 restore();return [...additions.values()].filter(entry=>entry.owner.identityDigest===identityDigest&&entry.owner.accountUid===accountUid&&entry.username===username).slice(-32).map(entry=>entry.sourceDigest);
}
const publicDisplayReaders=new Set<()=>PublicMarketCatalog|null>();
export function subscribeAssetPublicationAdmissions(listener:(catalog?:PublicMarketCatalog,snapshot?:unknown)=>void,selected?:()=>PublicMarketCatalog|null){listeners.add(listener);if(selected)publicDisplayReaders.add(selected);return()=>{listeners.delete(listener);if(selected)publicDisplayReaders.delete(selected);};}
/** Only the canonical runtime's local-admission callback calls this seam.
 * The Source is already verified and held. These public display additions have
 * no admission, ownership or publication authority; an unusable projection is
 * refused here without vetoing the canonical Source's existing transport. */
export function retainAssetPublicationAdmission(admission:ConnectedAssetLocalAdmission,owner:Owner):void{
 if(owner.isCurrent&&!owner.isCurrent())return;restore();
 const original=object(admission.original),reference=object(admission.sourceReference),carriedReference=object(object(original.importedSource).reference),id=original.id;
 const username=admission.username;
 if(!hex(owner.identityDigest)||!owner.accountUid||!/^[a-z0-9_]{3,24}$/.test(username)||typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||original.showOnProfile!==true||!hex(reference.artifactSha256)||jcsCanonicalize(reference)!==jcsCanonicalize(carriedReference)||(admission.firstPaint!==null&&!hex(admission.firstPaint.artifactDigest))||!safeImportedSourceUrl('/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)}),'artifact'))return;
 const profile=retainedPublicProfile(username);if(profile&&profile.userId!==owner.accountUid)return;
 const previous=additions.get(reference.artifactSha256);
 const knownSignature=original.hasPbiSignature!==true&&previous?.owner.accountUid===owner.accountUid&&previous.username===username&&previous.item.hasPbiSignature&&hex(previous.item.pbiReceiptHash)?previous.item.pbiReceiptHash:undefined;
 const media=original.media===null?null:object(original.media),long=object(original.longForm),preview=object(original.marketPreview);
 const projection={id,importedSource:original.importedSource,originalCreator:original.originalCreator,ownershipKind:original.ownershipKind,ownershipRole:original.ownershipRole,nativeAsset:original.nativeAsset,assetTitle:original.assetTitle,claim:original.claim,code:original.code,pulse:original.pulse,verifyPath:original.verifyPath,proof:original.proof,claimHashHex:original.claimHashHex,hasPbiSignature:original.hasPbiSignature===true||!!knownSignature,pbiReceiptHash:knownSignature??original.pbiReceiptHash,recordCardMediaSha256Hex:original.recordCardMediaSha256Hex,media,mediaKind:media===null?'moment':media.kind,longForm:original.longForm,hasLongForm:typeof long.text==='string'&&long.text.length>0,attachments:Array.isArray(original.attachments)?original.attachments.map(value=>{const file=object(value);return{id:file.id,name:file.name,sha256Hex:file.sha256Hex,src:file.src,downloadName:file.downloadName};}):[]};
 const row={id:`profile:${username}:${id}`,receizId:id,title:original.assetTitle,summary:original.claim,visibility:'public',ownerUsername:username,ownerUserId:owner.accountUid,ownerDisplayName:profile?.displayName??username,...(profile?{ownerAvatarUrl:profile.avatarUrl}:{}),canonicalHref:`https://receiz.com/${username}/verified/${encodeURIComponent(id)}`,verifyHref:knownSignature?previous?.row.verifyHref:original.verifyUrl??original.verifyPath,pulse:original.pulse,createdAt:original.createdAt,valueUsd:preview.priceUsd,livePulseSeed:preview.livePulseSeed,profileOriginal:projection};
 let item:PublicMarketItem|undefined;try{item=parsePublicMarket({ok:true,transport:{publicOriginals:[row]}}).items[0];}catch{return;}if(!item||item.originalDigest!==reference.artifactSha256)return;
 const signatureChanged=previous?.item.hasPbiSignature!==item.hasPbiSignature||object(previous?.row.profileOriginal).pbiReceiptHash!==projection.pbiReceiptHash;
 if(previous&&(previous.item.id!==item.id||previous.owner.accountUid!==owner.accountUid))return;
 let artworkUrl=previews.get(reference.artifactSha256)?.url;try{artworkUrl??=owner.artwork&&typeof URL.createObjectURL==='function'?URL.createObjectURL(owner.artwork):undefined;}catch{/* Optional image realization cannot refuse a verified Source. */}if(artworkUrl){previews.set(reference.artifactSha256,{username,url:artworkUrl});if(previews.size>32){const oldest=previews.keys().next().value!;try{URL.revokeObjectURL(previews.get(oldest)!.url);}catch{/* Image disposal has no Source authority. */}previews.delete(oldest);}}
 additions.set(reference.artifactSha256,{...previous,owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username,sourceDigest:reference.artifactSha256,showcaseDigest:admission.firstPaint?.artifactDigest??(signatureChanged?null:previous?.showcaseDigest??null),...(signatureChanged?{receipt:undefined,signatureDeliveryHash:undefined}:{}),row,item,sourceReceipt:previous?.sourceReceipt??(previous?.receipt?.status==='published'?previous.receipt:undefined),marketSeen:signatureChanged?false:previous?.marketSeen,profileSeen:signatureChanged?false:previous?.profileSeen,...(artworkUrl?{artworkUrl}:{})});
 if(additions.size>128){const oldest=additions.keys().next().value!;drop(oldest);}
 changed();if(profile){try{retainPublicProfile(profile);}catch{/* The held Source remains retained when a profile display observer fails. */}}
 if(typeof dispatchEvent==='function'){try{dispatchEvent(new CustomEvent('bankeiz:profile-updated',{detail:{username}}));}catch{/* A page notification cannot veto Source transport. */}}
}
export function acknowledgeAssetPublication(sourceDigest:string,receipt:AssetPublicationReceipt,signaturePbiReceiptHash?:string):void{restore();const entry=additions.get(sourceDigest);if(!entry)return;if(signaturePbiReceiptHash!==undefined&&!hex(signaturePbiReceiptHash)||receipt.status==='published'&&(!hex(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||!Number.isSafeInteger(receipt.visibleChildCount)))return;
 // Source delivery may complete after its signature was admitted. Its older
 // acknowledgment cannot confirm or replace that current signed delivery.
 if(receipt.status==='published')entry.sourceReceipt??=receipt;
 if(!entry.item.hasPbiSignature&&signaturePbiReceiptHash===undefined||hex(signaturePbiReceiptHash)&&entry.item.pbiReceiptHash===signaturePbiReceiptHash){entry.receipt=receipt;if(receipt.status==='published'&&signaturePbiReceiptHash)entry.signatureDeliveryHash=signaturePbiReceiptHash;}
 changed();}
export function assetPublicationFreshnessHint():string|undefined{restore();return [...additions.values()].reverse().find(entry=>entry.receipt?.status==='published'&&!entry.marketSeen)?.sourceDigest;}
function matchesSignature(item:PublicMarketItem,entry:Addition){return !entry.item.hasPbiSignature||item.hasPbiSignature&&hex(entry.item.pbiReceiptHash)&&item.pbiReceiptHash===entry.item.pbiReceiptHash;}
function matches(item:PublicMarketItem,entry:Addition){return item.id===entry.item.id&&item.assetId===entry.item.assetId&&item.originalDigest===entry.sourceDigest;}
function drop(digest:string){additions.delete(digest);}
/** Called only with a parsed membership response, before display/quote merges.
 * Cloning a displayed item cannot acknowledge remote publication. */
export function acceptDiscoveredPublicAssets(catalog:PublicMarketCatalog):void{restore();let changed=false;for(const entry of additions.values())if(catalog.items.some(item=>matches(item,entry)&&matchesSignature(item,entry)&&(!entry.item.hasPbiSignature||item.ownerUsername===entry.username&&item.ownerIdentity?.userId===entry.owner.accountUid))&&!entry.marketSeen){entry.marketSeen=true;entry.sourceSeen=true;if(entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash))entry.signatureDeliveryHash=entry.item.pbiReceiptHash;changed=true;}if(changed){save();for(const listener of listeners)listener();}}
export function acceptDiscoveredProfileAssets(profile:PublicProfile):void{
 restore();let changed=false;
 for(const entry of additions.values()){
  if(entry.username!==profile.username||entry.owner.accountUid!==profile.userId)continue;
  const observed=profile.items.find(item=>matches(item,entry));if(!observed)continue;
  if(!matchesSignature(observed,entry))continue;
  if(!entry.profileSeen){entry.profileSeen=true;entry.sourceSeen=true;if(entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash))entry.signatureDeliveryHash=entry.item.pbiReceiptHash;changed=true;}
 }
 if(changed){save();for(const listener of listeners)listener();}
}
/** Accepted discovery retires the display overlay independently per surface.
 * Its bounded owner locator still realizes exact held media after a cold
 * reopen; delivery acknowledgment never discards that local Source operand. */
export function mergeAdmittedPublicAssets(catalog:PublicMarketCatalog):PublicMarketCatalog{restore();const fresh:PublicMarketItem[]=[];for(const entry of additions.values()){
 const observed=catalog.items.find(item=>matches(item,entry));if(!entry.marketSeen&&(!observed||entry.item.hasPbiSignature===true&&!catalog.items.some(item=>matches(item,entry)&&matchesSignature(item,entry))))fresh.push(retainObservedShares(displayItem(entry),entry,observed));
 }if(fresh.length)return {...catalog,items:[...fresh.reverse(),...catalog.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],sourceCount:catalog.sourceCount+fresh.filter(item=>!catalog.items.some(previous=>previous.id===item.id)).length,complete:false};
 let changed=false;const items=catalog.items.map(item=>{const next=artwork(item);if(next!==item)changed=true;return next;});return changed?{...catalog,items}:catalog;}
export function mergeAdmittedProfileAssets(profile:PublicProfile):PublicProfile{restore();const fresh:PublicMarketItem[]=[];for(const entry of additions.values()){
 if(entry.username!==profile.username||entry.owner.accountUid!==profile.userId)continue;const observed=profile.items.find(item=>matches(item,entry));if(!entry.profileSeen&&(!observed||entry.item.hasPbiSignature===true&&!profile.items.some(item=>matches(item,entry)&&matchesSignature(item,entry)))){fresh.push(retainObservedShares(displayItem(entry,profile),entry,observed));};
 }return fresh.length?{...profile,items:[...fresh.reverse(),...profile.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],stats:{...profile.stats,originals:profile.stats.originals===null?null:profile.stats.originals+fresh.filter(item=>!profile.items.some(previous=>previous.id===item.id)).length}}:profile;}
export function forgetAssetPublicationAdmissions(username?:string){restore();if(!username)sourceFiles.clear();else for(const [digest,entry]of additions)if(entry.username===username)sourceFiles.delete(digest);for(const[digest,preview]of previews)if(!username||preview.username===username){URL.revokeObjectURL(preview.url);previews.delete(digest);}for(const [digest,entry]of additions)if(!username||entry.username===username)drop(digest);changed();}

/** Share a freshly read public projection with the existing display consumers.
 * This does not qualify a prepared document or create ownership authority. */
let discoveredPublicCatalog:PublicMarketCatalog|null=null;
/** The exact accepted display projection may precede its first mounted owner. */
export const retainedDiscoveredPublicCatalog=()=>discoveredPublicCatalog;
function carriedPublicCatalog():PublicMarketCatalog|null{
 const marker=typeof document==='undefined'?null:document.getElementById('receiz-navigation') as (HTMLElement&{publicMarketCatalog?:()=>PublicMarketCatalog|null;publicDiscoveryDocument?:()=>{catalog:PublicMarketCatalog}|null;publicMarketDocument?:()=>{catalog:PublicMarketCatalog}|null})|null;
 try{const selected=marker?.publicMarketCatalog?.()??marker?.publicDiscoveryDocument?.()?.catalog??marker?.publicMarketDocument?.()?.catalog;if(selected?.complete)return selected;}catch{/* A missing navigation marker does not erase an existing display. */}
 for(const read of publicDisplayReaders)try{const selected=read();if(selected?.complete)return selected;}catch{/* Optional display continuation. */}return null;
}
export function publishDiscoveredPublicCatalog(catalog:PublicMarketCatalog,snapshot?:unknown,previous:PublicMarketCatalog|null=carriedPublicCatalog()??discoveredPublicCatalog):boolean{
 if(refusesPublicMarketSelection(catalog,previous)||refusesPublicMarketSelection(catalog,discoveredPublicCatalog))return false;
 let carried=retainPublicProfileHeaders(catalog,previous);
 // Carry compatible held display once, before every surface receives this
 // successor. These public operands never become financial authority.
 if(previous&&carried.items!==previous.items){
  const known=new Map(previous.items.map(item=>[item.id,item]));let changed=false;
  const items=carried.items.map(item=>{
   const prior=known.get(item.id);if(!prior||prior.assetId!==item.assetId||prior.originalDigest!==item.originalDigest||prior.ownerIdentity?.userId!==item.ownerIdentity?.userId||prior.ownerUsername!==item.ownerUsername)return item;
   let next=retainPublicMomentManifest(retainPublicArtwork(item,prior),prior);
   const inventory=mergeShareInventory(compatibleShareInventory(item,prior.shareInventory),compatibleShareInventory(item,item.shareInventory)??null);
   if(inventory!==next.shareInventory)next={...next,shareInventory:inventory};
   if(!next.chart.length&&prior.chart.length)next={...next,priceUsd:prior.priceUsd,changePct:prior.changePct,chart:prior.chart};
   if(!next.livePulseSeed&&prior.livePulseSeed)next={...next,livePulseSeed:prior.livePulseSeed,valuationBinding:prior.valuationBinding};
   if(next!==item)changed=true;return next;
  });if(changed)carried={...carried,items};
  if(!carried.items.some(item=>item.category==='sports')&&previous.items.some(item=>item.category==='sports'))carried=retainPublicMarketSports(carried,previous);
 }
 const selected=snapshot?mergePublicQuotes(carried,snapshot):carried;
 if(selected!==catalog)reusePublicMarketResponse(catalog,selected);if(selected.complete)discoveredPublicCatalog=selected;mergeAdmittedPublicAssets(selected);for(const listener of listeners)listener(selected,snapshot);if(selected.complete)retainPublicMarket(catalog,snapshot,selected,previous);
 return true;
}
function publishDiscoveredPublicQuotes(snapshot:unknown):void{
 const catalog=discoveredPublicCatalog;
 if(catalog){const selected=mergePublicQuotes(catalog,snapshot);reusePublicMarketResponse(catalog,selected);discoveredPublicCatalog=selected;retainPublicMarket(catalog,snapshot,selected);}
 // A stalled membership request cannot hold up a distinct available quote.
 // Each existing consumer applies it to its own selected, exact public family.
 for(const listener of listeners)listener(undefined,snapshot);
}
const publicationRefreshes=new Map<string,Promise<void>>();
export function refreshAssetPublicationCatalog(sourceDigest:string):Promise<void>{
 const existing=publicationRefreshes.get(sourceDigest);if(existing)return existing;
 const read=import('./public-market.js').then(async module=>{
  // Membership and share observations have independent read lifetimes. Publish
  // the accepted collection immediately; delayed/failed quotes cannot hide it.
  let snapshot:unknown;
  const membership=module.fetchPublicMarket(undefined,sourceDigest).then(catalog=>publishDiscoveredPublicCatalog(catalog,module.readRetainedPublicQuotes()?.snapshot??snapshot),()=>{});
  const quotes=module.fetchPublicQuotes(undefined,undefined,sourceDigest).then(value=>{snapshot=value;publishDiscoveredPublicQuotes(value);},()=>{});
  await Promise.all([membership,quotes]);
 }).catch(()=>{/* The admitted object remains visible; normal refresh retries the same hint. */}).finally(()=>publicationRefreshes.delete(sourceDigest));
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
