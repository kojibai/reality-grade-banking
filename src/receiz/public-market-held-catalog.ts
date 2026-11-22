import {publicOriginalCheckoutUrl,readPublicOriginalOffer} from './public-original-purchase.js';
import {inspectPublicMarketCatalog} from './public-market-catalog-inspection.js';
import {publicOriginalCreator,publicOriginalProvenance,readPublicMarketSelection,safeReceizArtworkUrl,safeReceizPublicUrl,type PublicMarketCatalog,type PublicMarketItem} from './public-market.js';
import {readPublicProfileHeads,readPublicProfileHeadRefusals} from './public-profile-header.js';
import {profileAvatarUrl} from './profile-avatar.js';
import {publicCarriedText} from './public-carried-text.js';
import {publicNativeAssetBinding} from './native-asset-public-binding.js';
import {readPublicShareInventory} from './market-share-inventory.js';
import {publicMarketPulseSeed,readPublicSportsValueRow} from './market-projection/source.js';
import {publicSportsHistorySnapshot} from './market-projection/sports-observations.js';
import {publicSportsSealedBirths} from './market-projection/sealed-copies.js';
import {readPublicCollectiblePresentation} from './public-collectible-presentation.js';
import {publicManifestLink,readPublicAssetManifestSource} from './public-asset-manifest.js';
import {publicMediaPlayback} from './public-asset-embed.js';
import {safePublicDocumentUrl} from './public-document.js';
import {safePublicBookUrl} from './public-book.js';
import {publicProfileUsername} from './account-name.js';

/** Bank display transport for a complete family already selected from HTML.
 * It shares the existing discovery response cache; it is never a Source
 * response, admission receipt, financial permission or freshness verdict. */
export type HeldPublicMarketInput={schema:'bank.public-market.held-catalog.v1';catalog:PublicMarketCatalog};
const schema='bank.public-market.held-catalog.v1';
const catalogFields=new Set(['items','complete','revision','selection','observedAt','sourceCount','sportsCoverage','sportsObservedAt','sportsSealedBirthsObservedAt','sportsHistorySnapshot','publicProfileHeads','publicProfileHeadRefusals','publicProfileHeadsRevision']);
const itemFields=new Set(['id','assetId','title','summary','category','sourceUrl','verifyUrl','originalUrl','originalDigest','pulse','sealedAt','ownerUsername','ownerDisplayName','ownerProfileUrl','priceUsd','changePct','chart','authority','canTrade','originalCreator','sourceProvenance','shareInventory','hasPbiSignature','pbiReceiptHash','circulationCount','pricedCount','capitalizationUsdCents','nativeAsset','hasLongForm','carriedText','mediaKind','artworkUrl','videoPosterUrl','cardClaimHash','collectiblePresentation','playback','documentUrl','book','proofManifest','proofManifestSource','readingUrl','livePulseSeed','sportsValuation','sealedBirths','sealedCopies','localValuationPulse','valuationBinding','ownerReceivingUsername','ownerAvatarUrl','admittedOwnerUserId','ownerAvatarFallback','ownerIdentity','originalOffer']);
const object=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)&&Object.getOwnPropertyNames(value).length===Object.keys(value).length?value as Record<string,unknown>:null;
const text=(value:unknown,max=4096):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const nullableText=(value:unknown,max=4096)=>value===null||text(value,max);
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
const count=(value:unknown,max=1e10)=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=max;
const amount=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e18;
const time=(value:unknown)=>value===null||text(value,64)&&Number.isFinite(Date.parse(value));
const only=(value:unknown,fields:Set<string>)=>{const row=object(value);return !!row&&Object.keys(row).every(key=>fields.has(key));};
const plainArray=(value:unknown[]):boolean=>Object.getPrototypeOf(value)===Array.prototype&&Object.getOwnPropertyNames(value).length===value.length+1&&Object.getOwnPropertyNames(value).every(key=>key==='length'||/^(0|[1-9][0-9]*)$/.test(key));
/** Compare public reader output without changing accepted values or rebuilding
 * their history. Undefined optional fields have no JSON representation. */
function samePublicValue(input:unknown,projected:unknown):boolean{
 if(input===projected)return true;
 if(Array.isArray(input))return plainArray(input)&&Array.isArray(projected)&&input.length===projected.length&&input.every((value,index)=>samePublicValue(value,projected[index]));
 const a=object(input),b=object(projected);if(!a||!b)return false;
 const keys=Object.keys(a).filter(key=>a[key]!==undefined),other=Object.keys(b).filter(key=>b[key]!==undefined);
 return keys.length===other.length&&keys.every(key=>Object.hasOwn(b,key)&&samePublicValue(a[key],b[key]));
}
const optionalPublic=(input:unknown,read:(input:unknown)=>unknown)=>input===undefined||samePublicValue(input,read(input));
const optionalUrl=(input:unknown,read:(input:unknown)=>string|null)=>input===undefined||input===null||typeof input==='string'&&read(input)!==null;
function profileUrl(value:unknown,username:unknown):boolean{
 if(value===null)return true;if(!text(username,64)||!/^[a-zA-Z0-9_-]{1,64}$/.test(username))return false;
 return value===`https://receiz.com/${encodeURIComponent(username)}`;
}
function validSportsValue(item:PublicMarketItem):boolean{
 const value=item.sportsValuation;if(value===undefined)return true;
 const projected=readPublicSportsValueRow(value,item.cardClaimHash);if(!projected)return false;
 if(value.historyEvaluationPulse!==undefined){if(!count(value.historyEvaluationPulse))return false;projected.historyEvaluationPulse=value.historyEvaluationPulse;}
 if(value.quoteUsdPerPhi!==undefined){if(!amount(value.quoteUsdPerPhi)||value.quoteUsdPerPhi<=0)return false;projected.quoteUsdPerPhi=value.quoteUsdPerPhi;}
 const market=value.marketItem;
 if(market!==undefined){
  if(!text(market.id,512)||!text(market.source,512)||![market.priceUsd,market.pricePhi,market.quoteUsdPerPhi].every(amount)||market.quoteUsdPerPhi<=0||typeof market.changePct!=='number'||!Number.isFinite(market.changePct)||Math.abs(market.changePct)>1e13||market.pricingSourceKey!==undefined&&!text(market.pricingSourceKey,512)||market.livePulseSeed!==undefined&&market.livePulseSeed!==null&&!samePublicValue(market.livePulseSeed,publicMarketPulseSeed(market.livePulseSeed,String(market.livePulseSeed.claimPulse))))return false;
  const publicMarket={id:market.id,source:market.source,priceUsd:market.priceUsd,pricePhi:market.pricePhi,quoteUsdPerPhi:market.quoteUsdPerPhi,changePct:market.changePct,...(market.pricingSourceKey!==undefined?{pricingSourceKey:market.pricingSourceKey}:{}),...(market.livePulseSeed!==undefined?{livePulseSeed:market.livePulseSeed}:{})};
  if(!samePublicValue(market,publicMarket))return false;projected.marketItem=publicMarket;
 }
 return samePublicValue(value,projected);
}
function validItem(item:PublicMarketItem):boolean{
 if(!only(item,itemFields)||!text(item.id,256)||!text(item.assetId,256)||!text(item.title)||typeof item.summary!=='string'||item.summary.length>8192||!['proof','sports'].includes(item.category)||!nullableText(item.ownerUsername,64)||!nullableText(item.ownerDisplayName,128)||!profileUrl(item.ownerProfileUrl,item.ownerUsername)||item.ownerUsername!==null&&!/^[a-zA-Z0-9_-]{1,64}$/.test(item.ownerUsername)||!time(item.sealedAt)||item.pulse!==null&&(typeof item.pulse!=='string'||!/^\d{1,24}$/.test(item.pulse))||item.originalDigest!==null&&!hash(item.originalDigest)||item.priceUsd!==null&&!amount(item.priceUsd)||item.changePct!==null&&(typeof item.changePct!=='number'||!Number.isFinite(item.changePct)||Math.abs(item.changePct)>1e6)||!Array.isArray(item.chart)||!plainArray(item.chart)||item.chart.length>256||!item.chart.every(amount))return false;
 if(item.sourceUrl===undefined||item.verifyUrl===undefined||item.originalUrl===undefined||!optionalUrl(item.sourceUrl,value=>safeReceizPublicUrl(value,'source'))||!optionalUrl(item.verifyUrl,value=>safeReceizPublicUrl(value,'proof'))||!optionalUrl(item.readingUrl,value=>safeReceizPublicUrl(value,'proof'))||!optionalUrl(item.originalUrl,value=>safeReceizPublicUrl(value,'original'))||!optionalUrl(item.artworkUrl,safeReceizArtworkUrl)||!optionalUrl(item.videoPosterUrl,safeReceizArtworkUrl)||!optionalUrl(item.ownerAvatarUrl,profileAvatarUrl)||!optionalUrl(item.ownerAvatarFallback,profileAvatarUrl))return false;
 if(item.readingUrl&&(!item.verifyUrl||new URL(item.readingUrl,'https://receiz.com').pathname!==new URL(item.verifyUrl,'https://receiz.com').pathname))return false;
 for(const key of ['circulationCount','pricedCount','localValuationPulse'] as const)if(item[key]!==undefined&&!count(item[key]))return false;
 for(const key of ['hasPbiSignature','hasLongForm'] as const)if(item[key]!==undefined&&typeof item[key]!=='boolean')return false;
 for(const key of ['pbiReceiptHash','cardClaimHash'] as const)if(item[key]!==undefined&&!hash(item[key]))return false;
 if(item.capitalizationUsdCents!==undefined&&item.capitalizationUsdCents!==null&&(typeof item.capitalizationUsdCents!=='string'||!/^(0|[1-9][0-9]{0,38})$/.test(item.capitalizationUsdCents)))return false;
 if(item.mediaKind!==undefined&&!['image','video','audio','pdf','epub','file','moment'].includes(item.mediaKind)||item.admittedOwnerUserId!==undefined&&!text(item.admittedOwnerUserId,256))return false;
 if(item.ownerIdentity!==undefined){const owner=item.ownerIdentity;if(!samePublicValue(owner,{userId:owner.userId,username:owner.username,createdAt:owner.createdAt})||!text(owner.userId,256)||owner.username!==item.ownerUsername||!text(owner.createdAt,64)||!Number.isFinite(Date.parse(owner.createdAt)))return false;}
 if(item.ownerReceivingUsername!==undefined&&(!item.ownerUsername||publicProfileUsername(item.ownerUsername,item.ownerReceivingUsername)!==item.ownerReceivingUsername))return false;
 if(item.valuationBinding!==undefined&&!samePublicValue(item.valuationBinding,{itemId:item.id,assetId:item.assetId}))return false;
 if(!optionalPublic(item.originalCreator,publicOriginalCreator)||!optionalPublic(item.sourceProvenance,publicOriginalProvenance)||!optionalPublic(item.nativeAsset,publicNativeAssetBinding)||!optionalPublic(item.carriedText,value=>value===null?null:publicCarriedText(value))||!optionalPublic(item.livePulseSeed,value=>publicMarketPulseSeed(value,item.pulse))||!optionalPublic(item.shareInventory,value=>readPublicShareInventory(value,item)))return false;
 if(item.originalOffer!==undefined&&(!optionalPublic(item.originalOffer,readPublicOriginalOffer)||!publicOriginalCheckoutUrl(item.sourceUrl,item.assetId)))return false;
 if(item.sourceProvenance&&item.sourceProvenance.sourceArtifactSha256!==item.originalDigest)return false;
 if(!optionalPublic(item.proofManifestSource,readPublicAssetManifestSource)||item.proofManifestSource?.verifyPath&&!publicManifestLink(item.proofManifestSource.verifyPath))return false;
 if(item.proofManifest!==undefined&&(!Array.isArray(item.proofManifest)||!plainArray(item.proofManifest)||item.proofManifest.length>1000||item.proofManifest.some(row=>!samePublicValue(row,{label:row.label,value:row.value,...(row.href!==undefined?{href:row.href}:{}),...(row.downloadName!==undefined?{downloadName:row.downloadName}:{})})||!text(row.label,4096)||!text(row.value,8192)||row.href!==undefined&&!publicManifestLink(row.href)||row.downloadName!==undefined&&!text(row.downloadName,240))))return false;
 if(item.playback!==undefined&&item.playback!==null&&!samePublicValue(item.playback,publicMediaPlayback({receizId:item.assetId,profileOriginal:{mediaKind:item.mediaKind,playback:item.playback,media:{gateAudioPlayback:false,originalDownloadMime:item.playback.mimeType,originalDownloadSha256Hex:item.originalDigest,material:{sealedArtifactSha256Hex:item.originalDigest}}}},item.originalUrl)))return false;
 if(!optionalUrl(item.documentUrl,value=>safePublicDocumentUrl(value,item.assetId)))return false;
 if(item.book!==undefined&&(!samePublicValue(item.book,{assetId:item.assetId,url:item.book.url,payloadDigest:item.book.payloadDigest})||!safePublicBookUrl(item.book.url,item.assetId)||!hash(item.book.payloadDigest)))return false;
 if(!optionalPublic(item.collectiblePresentation,value=>readPublicCollectiblePresentation(value,item.assetId,item.cardClaimHash))||!optionalPublic(item.sealedBirths,publicSportsSealedBirths))return false;
 if(!validSportsValue(item))return false;
 if(item.sealedCopies!==undefined&&(!Array.isArray(item.sealedCopies)||!plainArray(item.sealedCopies)||item.sealedCopies.length>10000||item.sealedCopies.some(copy=>!samePublicValue(copy,{collectibleId:copy.collectibleId,claimHash:copy.claimHash,sealedAt:copy.sealedAt,ownerUsername:copy.ownerUsername,ownerDisplayName:copy.ownerDisplayName,ownerProfileUrl:copy.ownerProfileUrl})||!/^rsc_[a-f0-9]{16}$/i.test(copy.collectibleId)||!hash(copy.claimHash)||!text(copy.sealedAt,64)||!time(copy.sealedAt)||!nullableText(copy.ownerUsername,64)||!nullableText(copy.ownerDisplayName,128)||!profileUrl(copy.ownerProfileUrl,copy.ownerUsername))))return false;
 return true;
}
const headerLinkFields=new Set(['websiteUrl','socialXUrl','socialInstagramUrl','socialYoutubeUrl','socialLinkedinUrl','socialGithubUrl']);
function publicLink(value:unknown):string|null{
 if(typeof value!=='string'||value.length>8192)return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
/** Reuse public header/refusal curation. Nested values in scalar public fields
 * cannot smuggle private account objects through an otherwise public header. */
function headers(catalog:PublicMarketCatalog):Pick<PublicMarketCatalog,'publicProfileHeads'|'publicProfileHeadRefusals'>|null{
 if(catalog.publicProfileHeads!==undefined&&(!Array.isArray(catalog.publicProfileHeads)||catalog.publicProfileHeads.length>100000)||catalog.publicProfileHeadRefusals!==undefined&&(!Array.isArray(catalog.publicProfileHeadRefusals)||catalog.publicProfileHeadRefusals.length>100000))return null;
 const refusals=readPublicProfileHeadRefusals(catalog.publicProfileHeadRefusals),refused=new Set(refusals.map(row=>row.profile.userId)),heads=readPublicProfileHeads(catalog.publicProfileHeads).filter(row=>!refused.has(String(row.profile.userId)));
 const ownerUids=new Map<string,Set<string>>(),ownerNames=new Map<string,Set<string>>();
 for(const {ownerIdentity:owner}of catalog.items)if(owner){const names=ownerUids.get(owner.userId)??new Set<string>(),uids=ownerNames.get(owner.username)??new Set<string>();names.add(owner.username);uids.add(owner.userId);ownerUids.set(owner.userId,names);ownerNames.set(owner.username,uids);}
 for(const head of heads){
  const profile=head.profile;
  for(const [key,value]of Object.entries(profile)){
   if(key==='links')continue;
   if(value!==null&&value!==undefined&&(typeof value!=='string'&&!(typeof value==='boolean'&&['isPrivate','authorshipVerified','showSchedulerButton'].includes(key))))return null;
   if((key==='avatarUrl'||key==='bannerUrl')&&value!=null){if(!profileAvatarUrl(value))return null;}
   if(headerLinkFields.has(key)&&value!=null&&!publicLink(value))return null;
  }
  const names=ownerUids.get(String(profile.userId)),uids=ownerNames.get(String(profile.username));
  if(names&&(names.size!==1||!names.has(String(profile.username)))||uids&&(uids.size!==1||!uids.has(String(profile.userId))))return null;
 }
 return{...(heads.length?{publicProfileHeads:heads}:{}),...(refusals.length?{publicProfileHeadRefusals:refusals}:{})};
}
export function readHeldPublicMarketInput(input:unknown):PublicMarketCatalog|null{
 try{
  const envelope=object(input);if(envelope?.schema!==schema||!Object.keys(envelope).every(key=>['schema','catalog','snapshot','bankProfileDirectoryRevision'].includes(key)))return null;
  const catalog=inspectPublicMarketCatalog(envelope.catalog);
  if(!catalog||!only(catalog,catalogFields)||!plainArray(catalog.items)||!text(catalog.revision,256)||!time(catalog.observedAt)||!count(catalog.sourceCount,100000)||catalog.publicProfileHeadsRevision!==undefined&&!hash(catalog.publicProfileHeadsRevision)||catalog.sportsCoverage!==undefined&&!['complete','partial','missing'].includes(catalog.sportsCoverage)||catalog.sportsObservedAt!==undefined&&!time(catalog.sportsObservedAt)||catalog.sportsSealedBirthsObservedAt!==undefined&&!time(catalog.sportsSealedBirthsObservedAt)||!optionalPublic(catalog.sportsHistorySnapshot,publicSportsHistorySnapshot)||!catalog.items.every(validItem))return null;
  if(envelope.bankProfileDirectoryRevision!==undefined&&(!hash(envelope.bankProfileDirectoryRevision)||envelope.bankProfileDirectoryRevision!==catalog.publicProfileHeadsRevision))return null;
  if(!optionalPublic(catalog.selection,readPublicMarketSelection))return null;
  const curated=headers(catalog);if(!curated)return null;
  const {publicProfileHeads:_heads,publicProfileHeadRefusals:_refusals,...display}=catalog;
  return{...display,...curated};
 }catch{return null;}
}
/** No storage or Source work occurs here. A refusal leaves the caller's
 * existing selected view and prior durable response untouched. */
export function createHeldPublicMarketInput(catalog:PublicMarketCatalog):HeldPublicMarketInput|null{
 const selected=readHeldPublicMarketInput({schema,catalog});return selected?{schema,catalog:selected}:null;
}
