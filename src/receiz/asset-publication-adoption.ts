import {parsePublicMarket,retainPublicMarket,mergePublicQuotes,reusePublicMarketResponse,type PublicMarketCatalog,type PublicMarketItem} from './public-market.js';
import {retainedPublicProfile,retainPublicProfile,type PublicProfile} from './public-profile.js';
import {safeImportedSourceUrl} from './imported-source-url.js';
import {readAccountAppearance} from './account-appearance.js';
import {compatibleShareInventory} from './market-share-inventory.js';
import {projectAssetPublicationReceipt,isAssetPublicationDeliveryConfirmed,type AssetPublicationReceipt} from './asset-publication.js';
import {readPublicShowcaseRelease} from './public-showcase-release.js';
import type {ConnectedAssetLocalAdmission} from './asset-publication-runtime';
type Owner=Readonly<{identityDigest:string;accountUid:string;isCurrent?():boolean;artwork?:Blob}>;
type Row=Record<string,unknown>;
type Addition={owner:{identityDigest:string;accountUid:string};username:string;sourceDigest:string;showcaseDigest:string|null;row:Row;item:PublicMarketItem;receipt?:AssetPublicationReceipt;sourceReceipt?:Extract<AssetPublicationReceipt,{status:'published'}>;sourceSeen?:boolean;signatureDeliveryHash?:string;sourceFamilySeen?:boolean;signatureFamilySeenHash?:string;marketSeen?:boolean;profileSeen?:boolean;artworkUrl?:string};
const previews=new Map<string,{username:string;url:string}>();
const KEY='bankeiz-admitted-public-assets-v1',additions=new Map<string,Addition>(),listeners=new Set<(catalog?:PublicMarketCatalog,snapshot?:unknown)=>void>();let restored=false;
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const changed=()=>{save();for(const listener of listeners)listener();};
function save(){try{let rows=[...additions.values()].slice(-32).map(({owner,username,sourceDigest,showcaseDigest,row,receipt,sourceReceipt,sourceSeen,signatureDeliveryHash,sourceFamilySeen,signatureFamilySeenHash,marketSeen,profileSeen})=>({owner,username,sourceDigest,showcaseDigest,row,receipt,sourceReceipt,sourceSeen,signatureDeliveryHash,sourceFamilySeen,signatureFamilySeenHash,marketSeen,profileSeen}));while(rows.length&&JSON.stringify(rows).length>2_000_000)rows.shift();localStorage.setItem(KEY,JSON.stringify(rows));}catch{/* Exact source custody is independent of display retention. */}}
function restore(){if(restored)return;restored=true;try{const values:unknown=JSON.parse(localStorage.getItem(KEY)??'[]');if(!Array.isArray(values)||values.length>32)return;for(const raw of values){const v=object(raw),owner=object(v.owner);if(!hex(v.sourceDigest)||!(v.showcaseDigest===null||hex(v.showcaseDigest))||!hex(owner.identityDigest)||typeof owner.accountUid!=='string'||typeof v.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(v.username))continue;const item=parsePublicMarket({ok:true,transport:{publicOriginals:[v.row]}}).items[0];if(!item||item.originalDigest!==v.sourceDigest||item.ownerUsername!==v.username)continue;
 // Older retention could copy the unsigned Source acknowledgment onto a signed
 // local row. Resume its saved native proof unless this exact append was seen.
 const signed=item.hasPbiSignature&&hex(item.pbiReceiptHash),confirmed=!signed||v.signatureDeliveryHash===item.pbiReceiptHash;
 additions.set(v.sourceDigest,{owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username:v.username,sourceDigest:v.sourceDigest,showcaseDigest:v.showcaseDigest,row:object(v.row),item,...(confirmed&&v.receipt&&object(v.receipt).status==='published'&&hex(object(v.receipt).artifactDigest)?{receipt:v.receipt as AssetPublicationReceipt}:{}),...(object(v.sourceReceipt).status==='published'&&hex(object(v.sourceReceipt).artifactDigest)?{sourceReceipt:v.sourceReceipt as Extract<AssetPublicationReceipt,{status:'published'}>}:object(v.receipt).status==='published'&&hex(object(v.receipt).artifactDigest)?{sourceReceipt:v.receipt as Extract<AssetPublicationReceipt,{status:'published'}>}:{}),sourceSeen:v.sourceSeen===true||confirmed&&(v.marketSeen===true||v.profileSeen===true),sourceFamilySeen:v.sourceFamilySeen===true,...(signed&&v.signatureFamilySeenHash===item.pbiReceiptHash?{signatureFamilySeenHash:item.pbiReceiptHash}:{}),...(signed&&confirmed?{signatureDeliveryHash:item.pbiReceiptHash}:{}),marketSeen:confirmed&&v.marketSeen===true,profileSeen:confirmed&&v.profileSeen===true});}}catch{/* Malformed display retention never admits an original. */}}
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
export function admittedAssetPublicationDelivery(sourceDigest:string,username:string):import('./asset-publication').AssetPublicationDelivery|null{restore();const entry=additions.get(sourceDigest);if(entry?.username!==username)return null;const receipt=entry.sourceReceipt??entry.receipt;if(receipt?.status==='published')return {...projectAssetPublicationReceipt(receipt),...(entry.sourceFamilySeen?{publicFamilyStatus:'ready' as const}:{})};if(entry.sourceSeen||entry.marketSeen||entry.profileSeen)return {status:'published',...(entry.sourceFamilySeen?{publicFamilyStatus:'ready' as const}:{})};return receipt?{status:receipt.status,code:receipt.code}:null;}
/** Current signature delivery only. An earlier accepted Source receipt cannot
 * confirm a later signed intent; its native admission clears this receipt. */
export function admittedAssetPublicationSignatureDelivery(sourceDigest:string,username:string):import('./asset-publication').AssetPublicationDelivery|null{restore();const entry=additions.get(sourceDigest);if(entry?.username!==username||!entry.item.hasPbiSignature||!hex(entry.item.pbiReceiptHash))return null;const receipt=entry.receipt;if(receipt?.status==='published')return {...projectAssetPublicationReceipt(receipt),...(entry.signatureFamilySeenHash===entry.item.pbiReceiptHash?{publicFamilyStatus:'ready' as const}:{})};if(entry.signatureDeliveryHash===entry.item.pbiReceiptHash&&(entry.marketSeen||entry.profileSeen))return {status:'published',...(entry.signatureFamilySeenHash===entry.item.pbiReceiptHash?{publicFamilyStatus:'ready' as const}:{})};return receipt?{status:receipt.status,code:receipt.code}:null;}
/** A small display locator set, never signature authority. The native runtime
 * reopens the selected source and requires its already-saved PBI proof. */
export function pendingAssetPublicationSignatures(identityDigest:string,accountUid:string,username:string):readonly string[]{
 restore();return [...additions.values()].filter(entry=>entry.owner.identityDigest===identityDigest&&entry.owner.accountUid===accountUid&&entry.username===username&&entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash)&&entry.receipt?.status!=='published'&&!entry.profileSeen&&!entry.marketSeen).map(entry=>entry.sourceDigest);
}
/** Match the existing Create result: public observation or its accepted receipt
 * enables signing. A local pending preview alone is not an accepted head. */
export function locallyPendingAssetPublication(sourceDigest:string,username:string):boolean{restore();const entry=additions.get(sourceDigest);return !!entry&&entry.username===username&&entry.sourceReceipt?.status!=='published'&&entry.receipt?.status!=='published'&&!entry.sourceSeen&&!entry.marketSeen&&!entry.profileSeen;}
export function subscribeAssetPublicationAdmissions(listener:(catalog?:PublicMarketCatalog,snapshot?:unknown)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** Only the canonical runtime's local-admission callback calls this seam.
 * These are public display additions, never ownership or financial authority. */
export function retainAssetPublicationAdmission(admission:ConnectedAssetLocalAdmission,owner:Owner):void{
 if(owner.isCurrent&&!owner.isCurrent())return;restore();
 const original=object(admission.original),reference=object(admission.sourceReference),carriedReference=object(object(original.importedSource).reference),id=original.id;
 const username=admission.username;
 if(!hex(owner.identityDigest)||!owner.accountUid||!/^[a-z0-9_]{3,24}$/.test(username)||typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id)||original.showOnProfile!==true||!hex(reference.artifactSha256)||reference.artifactSha256!==carriedReference.artifactSha256||(admission.firstPaint!==null&&!hex(admission.firstPaint.artifactDigest))||!safeImportedSourceUrl('/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)}),'artifact'))throw Error('BANK_ASSET_PUBLICATION_ADMISSION_INVALID');
 const profile=retainedPublicProfile(username);if(profile&&profile.userId!==owner.accountUid)return;
 const media=original.media===null?null:object(original.media),long=object(original.longForm),preview=object(original.marketPreview);
 const projection={id,nativeAsset:original.nativeAsset,assetTitle:original.assetTitle,claim:original.claim,code:original.code,pulse:original.pulse,verifyPath:original.verifyPath,proof:original.proof,claimHashHex:original.claimHashHex,hasPbiSignature:original.hasPbiSignature===true,pbiReceiptHash:original.pbiReceiptHash,recordCardMediaSha256Hex:original.recordCardMediaSha256Hex,media,mediaKind:media===null?'moment':media.kind,hasLongForm:typeof long.text==='string'&&long.text.length>0,attachments:Array.isArray(original.attachments)?original.attachments.map(value=>{const file=object(value);return{id:file.id,name:file.name,sha256Hex:file.sha256Hex,src:file.src,downloadName:file.downloadName};}):[]};
 const row={id:`profile:${username}:${id}`,receizId:id,title:original.assetTitle,summary:original.claim,visibility:'public',ownerUsername:username,ownerDisplayName:profile?.displayName??username,...(profile?{ownerAvatarUrl:profile.avatarUrl}:{}),canonicalHref:`https://receiz.com/${username}/verified/${encodeURIComponent(id)}`,verifyHref:original.verifyUrl??original.verifyPath,pulse:original.pulse,createdAt:original.createdAt,valueUsd:preview.priceUsd,livePulseSeed:preview.livePulseSeed,profileOriginal:projection};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[row]}}).items[0];if(!item||item.originalDigest!==reference.artifactSha256)throw Error('BANK_ASSET_PUBLICATION_ADMISSION_INVALID');
 const previous=additions.get(reference.artifactSha256);
 const signatureChanged=previous?.item.hasPbiSignature!==item.hasPbiSignature||object(previous?.row.profileOriginal).pbiReceiptHash!==projection.pbiReceiptHash;
 if(previous&&(previous.item.id!==item.id||previous.owner.accountUid!==owner.accountUid))throw Error('BANK_ASSET_PUBLICATION_ADMISSION_CONFLICT');
 const artworkUrl=previews.get(reference.artifactSha256)?.url??(owner.artwork&&typeof URL.createObjectURL==='function'?URL.createObjectURL(owner.artwork):undefined);if(artworkUrl){previews.set(reference.artifactSha256,{username,url:artworkUrl});if(previews.size>32){const oldest=previews.keys().next().value!;URL.revokeObjectURL(previews.get(oldest)!.url);previews.delete(oldest);}}
 additions.set(reference.artifactSha256,{...previous,owner:{identityDigest:owner.identityDigest,accountUid:owner.accountUid},username,sourceDigest:reference.artifactSha256,showcaseDigest:admission.firstPaint?.artifactDigest??(signatureChanged?null:previous?.showcaseDigest??null),...(signatureChanged?{receipt:undefined,signatureDeliveryHash:undefined,signatureFamilySeenHash:undefined}:{}),row,item,sourceReceipt:previous?.sourceReceipt??(previous?.receipt?.status==='published'?previous.receipt:undefined),marketSeen:signatureChanged?false:previous?.marketSeen,profileSeen:signatureChanged?false:previous?.profileSeen,...(artworkUrl?{artworkUrl}:{})});
 if(additions.size>128){const oldest=additions.keys().next().value!;drop(oldest);}
 if(profile)retainPublicProfile(profile);changed();
 if(typeof dispatchEvent==='function')dispatchEvent(new CustomEvent('bankeiz:profile-updated',{detail:{username}}));
}
export function acknowledgeAssetPublication(sourceDigest:string,receipt:AssetPublicationReceipt,signaturePbiReceiptHash?:string):void{restore();const entry=additions.get(sourceDigest);if(!entry)throw Error('BANK_ASSET_PUBLICATION_ADMISSION_REQUIRED');if(signaturePbiReceiptHash!==undefined&&!hex(signaturePbiReceiptHash)||receipt.status==='published'&&(!hex(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||!Number.isSafeInteger(receipt.visibleChildCount)))throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 // Source delivery may complete after its signature was admitted. Its older
 // acknowledgment cannot confirm or replace that current signed delivery.
 if(receipt.status==='published'){entry.sourceReceipt??=receipt;if(receipt.publicFamilyStatus==='ready'){entry.sourceFamilySeen=true;if(signaturePbiReceiptHash&&entry.item.pbiReceiptHash===signaturePbiReceiptHash)entry.signatureFamilySeenHash=signaturePbiReceiptHash;}}
 if(!entry.item.hasPbiSignature&&signaturePbiReceiptHash===undefined||hex(signaturePbiReceiptHash)&&entry.item.pbiReceiptHash===signaturePbiReceiptHash){entry.receipt=receipt;if(receipt.status==='published'&&signaturePbiReceiptHash)entry.signatureDeliveryHash=signaturePbiReceiptHash;}
 changed();if(receipt.status==='published'&&receipt.publicFamilyStatus==='pending')observePendingPublicFamily(sourceDigest);}
export function assetPublicationFreshnessHint():string|undefined{restore();return [...additions.values()].reverse().find(entry=>entry.receipt?.status==='published'&&!entry.marketSeen)?.sourceDigest;}
function matchesSignature(item:PublicMarketItem,entry:Addition){return !entry.item.hasPbiSignature||item.hasPbiSignature&&hex(entry.item.pbiReceiptHash)&&item.pbiReceiptHash===entry.item.pbiReceiptHash;}
function matches(item:PublicMarketItem,entry:Addition){return item.id===entry.item.id&&item.assetId===entry.item.assetId&&item.originalDigest===entry.sourceDigest;}
function drop(digest:string){familyObservers.get(digest)?.abort();familyObservers.delete(digest);additions.delete(digest);}
/** Called only with a parsed membership response, before display/quote merges.
 * Cloning a displayed item cannot acknowledge remote publication. */
export function acceptDiscoveredPublicAssets(catalog:PublicMarketCatalog):void{restore();let changed=false;for(const entry of additions.values())if(catalog.items.some(item=>matches(item,entry)&&matchesSignature(item,entry)&&(!entry.item.hasPbiSignature||item.ownerUsername===entry.username&&item.ownerIdentity?.userId===entry.owner.accountUid))&&!entry.marketSeen){entry.marketSeen=true;entry.sourceSeen=true;if(entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash))entry.signatureDeliveryHash=entry.item.pbiReceiptHash;changed=true;}if(changed){save();for(const listener of listeners)listener();}}
export function acceptDiscoveredProfileAssets(profile:PublicProfile):void{
 restore();let changed=false;const released=readPublicShowcaseRelease(profile.publicShowcaseRelease,profile);
 for(const entry of additions.values()){
  if(entry.username!==profile.username||entry.owner.accountUid!==profile.userId)continue;
  const observed=profile.items.find(item=>matches(item,entry));if(!observed)continue;
  // A final-vector-selected public profile proves this exact Original is in
  // the saved family. Raw membership and locally merged views cannot do so.
  if(released&&!entry.sourceFamilySeen){entry.sourceFamilySeen=true;changed=true;}
  if(!matchesSignature(observed,entry))continue;
  if(!entry.profileSeen){entry.profileSeen=true;entry.sourceSeen=true;if(entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash))entry.signatureDeliveryHash=entry.item.pbiReceiptHash;changed=true;}
  if(released&&entry.item.hasPbiSignature&&hex(entry.item.pbiReceiptHash)&&entry.signatureFamilySeenHash!==entry.item.pbiReceiptHash){entry.signatureFamilySeenHash=entry.item.pbiReceiptHash;changed=true;}
 }
 if(changed){save();for(const listener of listeners)listener();}
}
/** Accepted discovery retires the display overlay independently per surface.
 * Keep the bounded observation locator until a durable receipt supersedes it;
 * otherwise a later render/signature could regress a publicly observed Source. */
export function mergeAdmittedPublicAssets(catalog:PublicMarketCatalog):PublicMarketCatalog{restore();let mutated=false;const fresh:PublicMarketItem[]=[];for(const entry of additions.values()){
 const observed=catalog.items.find(item=>matches(item,entry));if(!entry.marketSeen&&(!observed||entry.item.hasPbiSignature===true&&!catalog.items.some(item=>matches(item,entry)&&matchesSignature(item,entry))))fresh.push(retainObservedShares(displayItem(entry),entry,observed));if(entry.marketSeen&&entry.profileSeen&&entry.receipt?.status==='published'&&isAssetPublicationDeliveryConfirmed(entry.item.hasPbiSignature?admittedAssetPublicationSignatureDelivery(entry.sourceDigest,entry.username):admittedAssetPublicationDelivery(entry.sourceDigest,entry.username))){drop(entry.sourceDigest);mutated=true;}
 }if(mutated)save();if(fresh.length)return {...catalog,items:[...fresh.reverse(),...catalog.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],sourceCount:catalog.sourceCount+fresh.filter(item=>!catalog.items.some(previous=>previous.id===item.id)).length,complete:false};
 let changed=false;const items=catalog.items.map(item=>{const next=artwork(item);if(next!==item)changed=true;return next;});return changed?{...catalog,items}:catalog;}
export function mergeAdmittedProfileAssets(profile:PublicProfile):PublicProfile{restore();const fresh:PublicMarketItem[]=[];let mutated=false;for(const entry of additions.values()){
 if(entry.username!==profile.username||entry.owner.accountUid!==profile.userId)continue;const observed=profile.items.find(item=>matches(item,entry));if(!entry.profileSeen&&(!observed||entry.item.hasPbiSignature===true&&!profile.items.some(item=>matches(item,entry)&&matchesSignature(item,entry)))){fresh.push(retainObservedShares(displayItem(entry,profile),entry,observed));};if(entry.marketSeen&&entry.profileSeen&&entry.receipt?.status==='published'&&isAssetPublicationDeliveryConfirmed(entry.item.hasPbiSignature?admittedAssetPublicationSignatureDelivery(entry.sourceDigest,entry.username):admittedAssetPublicationDelivery(entry.sourceDigest,entry.username))){drop(entry.sourceDigest);mutated=true;}
 }if(mutated)save();return fresh.length?{...profile,items:[...fresh.reverse(),...profile.items.filter(item=>!fresh.some(addition=>addition.id===item.id))],stats:{...profile.stats,originals:profile.stats.originals===null?null:profile.stats.originals+fresh.filter(item=>!profile.items.some(previous=>previous.id===item.id)).length}}:profile;}
export function forgetAssetPublicationAdmissions(username?:string){restore();if(!username)sourceFiles.clear();else for(const [digest,entry]of additions)if(entry.username===username)sourceFiles.delete(digest);for(const[digest,preview]of previews)if(!username||preview.username===username){URL.revokeObjectURL(preview.url);previews.delete(digest);}for(const [digest,entry]of additions)if(!username||entry.username===username)drop(digest);changed();}

/** Share a freshly read public projection with the existing display consumers.
 * This does not qualify a prepared document or create ownership authority. */
let discoveredPublicCatalog:PublicMarketCatalog|null=null;
/** The exact accepted display projection may precede its first mounted owner. */
export const retainedDiscoveredPublicCatalog=()=>discoveredPublicCatalog;
export function publishDiscoveredPublicCatalog(catalog:PublicMarketCatalog,snapshot?:unknown):void{const selected=snapshot?mergePublicQuotes(catalog,snapshot):catalog;if(selected!==catalog)reusePublicMarketResponse(catalog,selected);if(selected.complete)discoveredPublicCatalog=selected;mergeAdmittedPublicAssets(selected);for(const listener of listeners)listener(selected,snapshot);if(selected.complete)retainPublicMarket(catalog,snapshot,selected);}
function publishDiscoveredPublicQuotes(snapshot:unknown):void{
 const catalog=discoveredPublicCatalog;
 if(catalog){const selected=mergePublicQuotes(catalog,snapshot);reusePublicMarketResponse(catalog,selected);discoveredPublicCatalog=selected;retainPublicMarket(catalog,snapshot,selected);}
 // A stalled membership request cannot hold up a distinct available quote.
 // Each existing consumer applies it to its own selected, exact public family.
 for(const listener of listeners)listener(undefined,snapshot);
}
const familyObservers=new Map<string,AbortController>();
/** Publication-only display observation. Cold navigation and held catalog
 * opening never call this path or wait for these headers. */
function observePendingPublicFamily(sourceDigest:string){
 if(familyObservers.has(sourceDigest))return;const controller=new AbortController();familyObservers.set(sourceDigest,controller);
 const wait=()=>new Promise<void>((resolve,reject)=>{const stop=()=>{clearTimeout(timer);reject(controller.signal.reason);},timer=setTimeout(()=>{controller.signal.removeEventListener('abort',stop);resolve();},2000);controller.signal.addEventListener('abort',stop,{once:true});});
 void(async()=>{let previousRelease:string|null=null;
  for(let attempt=0;attempt<120&&!controller.signal.aborted;attempt++){
   const entry=additions.get(sourceDigest);if(!entry)return;const receipt=entry.receipt??entry.sourceReceipt;if(receipt?.status!=='published'||receipt.publicFamilyStatus!=='pending')return;
   const response=await fetch(`/api/bank/public-profile/${entry.username}?view=release`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
   if(response.status===403||response.status===404){await response.body?.cancel();return;}
   if(response.ok){const released=readPublicShowcaseRelease(await response.json(),{userId:entry.owner.accountUid,username:entry.username});
    if(released){
     if(released.artifactDigest===receipt.artifactDigest&&released.operationCount===receipt.operationCount){entry.sourceFamilySeen=true;if(entry.item.hasPbiSignature&&entry.signatureDeliveryHash===entry.item.pbiReceiptHash&&entry.receipt?.status==='published'&&entry.receipt.artifactDigest===released.artifactDigest&&entry.receipt.operationCount===released.operationCount)entry.signatureFamilySeenHash=entry.item.pbiReceiptHash;changed();if(isAssetPublicationDeliveryConfirmed(entry.item.hasPbiSignature?admittedAssetPublicationSignatureDelivery(sourceDigest,entry.username):admittedAssetPublicationDelivery(sourceDigest,entry.username)))return;}
     else if(released.operationCount>=receipt.operationCount&&previousRelease!==released.revision){previousRelease=released.revision;await import('./public-profile.js').then(module=>module.fetchPublicProfile(entry.username));if(isAssetPublicationDeliveryConfirmed(entry.item.hasPbiSignature?admittedAssetPublicationSignatureDelivery(sourceDigest,entry.username):admittedAssetPublicationDelivery(sourceDigest,entry.username)))return;}
    }
   }else await response.body?.cancel();
   await wait();
  }
 })().catch(()=>{/* A failed status observation cannot revoke accepted Source or start a new publication. */}).finally(()=>{if(familyObservers.get(sourceDigest)===controller)familyObservers.delete(sourceDigest);});
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
