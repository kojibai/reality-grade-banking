import {publicAccountDisplayName} from './account-name.js';
import {publicCarriedText,type PublicCarriedText} from './public-carried-text.js';
import {readPublicShareInventory,mergeShareInventory,compatibleShareInventory} from './market-share-inventory.js';
import type {PublicShareInventory} from './market-share-inventory.js';
import {publicNativeAssetBinding,type PublicNativeAssetBinding} from './native-asset-public-binding.js';
import {assetPublicationFreshnessHint,acceptDiscoveredPublicAssets} from './asset-publication-adoption.js';
import {safeImportedSourceUrl} from "./imported-source-url.js";
import {publicMarketPulseSeed,type MarketPulseSeed,type MarketValueRow} from './market-projection/source.js';
import type {MarketSealedBirth} from './market-projection/sealed-copies.js';
import type {SportsHistorySnapshot} from './market-projection/sports-observations.js';
import {readPublicAssetManifestSource,type PublicAssetManifestRow,type PublicAssetManifestSource} from './public-asset-manifest.js';
import {publicAssetTitle} from './asset-title.js';
import type {PublicCollectiblePresentation} from './public-collectible-presentation.js';
import {publicMediaPlayback,type PublicPlayback} from './public-asset-embed.js';
import {publicDocumentUrl} from './public-document.js';
import {publicBookSource,type PublicBookSource} from './public-book.js';
import {profileAvatarUrl} from './profile-avatar.js';
/** Public discovery and quotes are display projections; they grant no ownership. */
export interface PublicMarketItem {
  originalCreator?:Readonly<{userId:string|null;username:string|null;displayName:string|null}>;
  sourceProvenance?:Readonly<{sourceArtifactSha256:string;payloadSha256?:string;artifactId?:string;namespace?:string;genesisOwnerReceizId?:string;sourceProofHead?:string}>;
  shareInventory?:PublicShareInventory;
  /** Existing Original authorship projection; never ownership or funding authority. */
  hasPbiSignature?:boolean;
  pbiReceiptHash?:string;
  id: string; assetId: string; title: string; summary: string; category: 'proof' | 'sports'; circulationCount?: number; pricedCount?: number; capitalizationUsdCents?: string | null;
  sourceUrl: string | null; verifyUrl: string | null; originalUrl: string | null;
  originalDigest: string | null; pulse: string | null; sealedAt: string | null;
  nativeAsset?:PublicNativeAssetBinding;
  hasLongForm?: boolean;
  carriedText?:PublicCarriedText|null;
  mediaKind?:PublicMediaKind;
  artworkUrl?:string|null;
  videoPosterUrl?:string|null;
  /** Exact public card discovery claim; a display binding, never custody. */
  cardClaimHash?:string;
  collectiblePresentation?:PublicCollectiblePresentation;
  playback?:PublicPlayback|null;
  documentUrl?:string|null;
  book?:PublicBookSource;
  proofManifest?:PublicAssetManifestRow[];
  proofManifestSource?:PublicAssetManifestSource;
  readingUrl?: string | null;
  livePulseSeed?:MarketPulseSeed;
  sportsValuation?:MarketValueRow;
  sealedBirths?:MarketSealedBirth[];
  sealedCopies?:{collectibleId:string;claimHash:string;sealedAt:string;ownerUsername:string|null;ownerDisplayName:string|null;ownerProfileUrl:string|null}[];
  localValuationPulse?:number;
  valuationBinding?:{itemId:string;assetId:string};
  ownerUsername: string | null; ownerDisplayName: string | null; ownerProfileUrl: string | null;
  ownerAvatarUrl?:string|null;
  /** Local admission's existing owner UID for presentation after overlay retirement. */
  admittedOwnerUserId?:string;
  /** Initial-page thumbnail of the same local public Seal artwork. */
  ownerAvatarFallback?:string|null;
  /** Public original-account coordinates for its deterministic seal portrait only. */
  ownerIdentity?:{userId:string;username:string;createdAt:string};
  priceUsd: number | null; changePct: number | null; chart: number[];
  authority: 'projection-only'; canTrade: false;
}
export interface PublicMarketCatalog { items: PublicMarketItem[]; complete: boolean; revision: string; observedAt: string | null; sourceCount: number; sportsCoverage?: 'complete' | 'partial' | 'missing'; sportsObservedAt?:string|null;sportsSealedBirthsObservedAt?:string|null;sportsHistorySnapshot?:SportsHistorySnapshot; }
type RecordValue = Record<string, unknown>;
export type PublicMediaKind='image'|'video'|'audio'|'pdf'|'epub'|'file'|'moment';
const mediaKinds=new Set(['image','video','audio','pdf','epub','file','moment']);
export function publicMediaKind(value:unknown):PublicMediaKind|undefined {
  return value===null?'moment':typeof value==='string'&&mediaKinds.has(value)?value as PublicMediaKind:undefined;
}
function record(input: unknown): RecordValue { return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as RecordValue : {}; }
function text(input: unknown, max = 4096): string | null { return typeof input === 'string' && input.length > 0 && input.length <= max ? input : null; }
function nonnegative(input: unknown): number | null { return typeof input === 'number' && Number.isFinite(input) && input >= 0 && input <= 1e18 ? input : null; }
/** Selected facts already public on the Original; no profile/custody lookup. */
export function publicOriginalCreator(input:unknown):PublicMarketItem['originalCreator']{
 const value=record(input);if(value.isPrivate===true)return;const username=text(value.username,64),displayName=text(value.displayName,128),userId=text(value.userId,128);
 if(!username&&!displayName&&!userId)return;return{userId,username:username&&/^[a-zA-Z0-9_-]{1,64}$/.test(username)?username:null,displayName};
}
export function publicOriginalProvenance(input:unknown):PublicMarketItem['sourceProvenance']{
 const value=record(input),identity=record(value.sourceIdentity??input),sourceArtifactSha256=text(value.sourceArtifactSha256,64),payloadSha256=text(value.payloadSha256,64);
 if(!sourceArtifactSha256||!/^[a-f0-9]{64}$/i.test(sourceArtifactSha256))return;const result:NonNullable<PublicMarketItem['sourceProvenance']>={sourceArtifactSha256:sourceArtifactSha256.toLowerCase()};
 if(payloadSha256&&/^[a-f0-9]{64}$/i.test(payloadSha256))Object.assign(result,{payloadSha256:payloadSha256.toLowerCase()});
 for(const key of ['artifactId','namespace','genesisOwnerReceizId']as const){const field=text(identity[key],256);if(field&&!/[\x00-\x1f\x7f]/.test(field))Object.assign(result,{[key]:field});}
 const head=text(value.sourceProofHead,128);if(head&&/^[a-f0-9]{16,128}$/i.test(head))Object.assign(result,{sourceProofHead:head});return result;
}
/** Display artwork only. This never identifies or verifies an original artifact. */
export function safeReceizArtworkUrl(input:unknown):string|null {
  const value=text(input,8192);if(!value||/[\x00-\x20\x7f\\]/.test(value))return null;
  try {
    const url=new URL(value,'https://receiz.com');
    if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash)return null;
    if(/^\/api\/game\/sports\/(?:baseball\/player-image\/[1-9][0-9]{0,11}|soccer\/player-image\/[A-Za-z0-9]{2,5}\/[0-9]{1,3}\/[a-z0-9-]{1,100}|fight\/fighter-image\/[a-z0-9-]{1,100})$/.test(url.pathname))return !url.search?url.href:null;
    const imported=safeImportedSourceUrl(value,"media");if(imported)return imported;
    const params=url.searchParams,only=(keys:string[])=>[...params.keys()].every(key=>keys.includes(key)&&params.getAll(key).length===1),image=(path:string)=>/\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(path),pathSafe=(path:string)=>path.length<=2048&&/^[a-zA-Z0-9_./-]+$/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
    if(url.pathname==='/api/profile/originals/media')return only(['receizId','slot','width'])&&/^[a-zA-Z0-9_-]{1,128}$/.test(params.get('receizId')??'')&&/^(?:preview|audioCover|videoPoster|epubCover|imageVariant|audioCoverVariant|videoPosterVariant|epubCoverVariant)$/.test(params.get('slot')??'')&&(!params.has('width')||/^\d{2,4}$/.test(params.get('width')!)&&Number(params.get('width'))<=4096)?url.href:null;
    if(/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/.test(url.pathname))return !url.search?url.href:null;
    const publicBuckets=['receiz-profile-originals','receiz-profile-media'];
    if(url.pathname==='/api/storage/object')return only(['bucket','path'])&&publicBuckets.includes(params.get('bucket')??'')&&pathSafe(params.get('path')??'')&&image(params.get('path')??'')?url.href:null;
    const storage=/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url.pathname);
    if(storage)return !url.search&&publicBuckets.includes(storage[1])&&pathSafe(storage[2])&&image(storage[2])?url.href:null;
    if(url.pathname==='/api/receiz/download')return only(['a','ms','p','c','tz','name','ts'])&&/^[a-f0-9]{8,64}$/i.test(params.get('a')??'')&&/^\d{10,17}$/.test(params.get('ms')??'')&&Number.isSafeInteger(Number(params.get('ms')))&&/^\d{1,24}$/.test(params.get('p')??'')&&/^[a-f0-9]{8,64}$/i.test(params.get('c')??'')&&/^[a-zA-Z0-9_.-]{1,200}\.png$/.test(params.get('name')??'')&&(!params.has('tz')||/^-?\d{1,4}$/.test(params.get('tz')!)&&Math.abs(Number(params.get('tz')))<=840)&&(!params.has('ts')||/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(params.get('ts')!))?url.href:null;
    return !url.search&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/storage/')&&pathSafe(url.pathname.slice(1))&&image(url.pathname)?url.href:null;
  }catch{return null;}
}
/** Use the same cover priorities carried by Receiz's live player. */
export function publicMediaArtworkUrl(input:unknown,retainedArtwork?:unknown):string|null {
  const media=record(input),kind=publicMediaKind(media.kind),material=record(media.material),digest=media.originalDownloadSha256Hex;
  const primary=kind==='audio'?media.audioCoverSrc:kind==='video'?media.videoPosterSrc:kind==='epub'||kind==='pdf'||kind==='file'?media.epubCoverSrc:kind==='image'?media.src:null;
  const imageOriginal=kind==='image'&&typeof digest==='string'&&/^[a-f0-9]{64}$/i.test(digest)&&digest.toLowerCase()===String(material.sealedArtifactSha256Hex).toLowerCase()&&(!media.originalDownloadMime||/^image\/(?:png|jpeg|webp|gif|avif|bmp)$/i.test(String(media.originalDownloadMime)))?publicMaterialOriginalUrl(material.originalArtifactSrc)??publicMaterialOriginalUrl(material.proofObjectUrl):null;
  for(const candidate of [primary,imageOriginal,retainedArtwork,media.derivativeDownloadSrc,media.receiptDownloadSrc]){const url=safeReceizArtworkUrl(candidate);if(url)return url;}return null;
}
/** Keep available display artwork when an equivalent source projection is
 * thinner. Never carry an image across an artifact or publication change. */
export function retainPublicArtwork(item:PublicMarketItem,previous?:PublicMarketItem):PublicMarketItem{
 if(item.artworkUrl||!previous||!item.originalDigest||item.id!==previous.id||item.assetId!==previous.assetId||item.originalDigest!==previous.originalDigest||item.pulse!==previous.pulse||item.verifyUrl!==previous.verifyUrl||item.mediaKind!==previous.mediaKind)return item;
 const artworkUrl=safeReceizArtworkUrl(previous.artworkUrl);
 return artworkUrl?{...item,artworkUrl}:item;
}
/** Public images remain viewable independently of canonical Original
 * preparation. This does not verify the artifact or grant it. */
export function publicAssetImagePreviewUrl(item:PublicMarketItem):string|null{
  if(item.mediaKind!=='image')return null;
  const image=safeReceizArtworkUrl(item.artworkUrl);
  if(!image||new URL(image).pathname==='/api/receiz/download')return null;
  if(item.originalUrl){
    // The imported primary payload is a public display role of this exact
    // carried reference. It never substitutes for canonical artifact reading.
    const artifact=safeImportedSourceUrl(item.originalUrl,'artifact'),media=safeImportedSourceUrl(image,'media');
    if(artifact&&media){
      const preview=new URL(media);if(preview.searchParams.get('payload')!=='1')return null;
      const sourceReference=JSON.parse(new URL(artifact).searchParams.get('reference')!),imageReference=JSON.parse(preview.searchParams.get('reference')!);
      if(item.originalDigest?.toLowerCase()!==sourceReference.artifactSha256||!['schema','artifactSha256','byteLength','filename','mimeType'].every(key=>sourceReference[key]===imageReference[key])||!['kind','sha256','byteLength','contentByteLength','height'].every(key=>sourceReference.bytes[key]===imageReference.bytes[key]))return null;
      return image;
    }
    // Legacy public images do not require the separate sealed-download sale.
    // Self-contained proof packages continue through their canonical opener.
    const original=safeReceizPublicUrl(item.originalUrl,'original');if(!original||new URL(original).pathname!=='/api/profile/originals/download')return null;
  }
  return image;
}
export function safeReceizPublicUrl(input: unknown, kind: 'source' | 'proof' | 'original' = 'source'): string | null {
  const value = text(input, 8192); if (!value) return null;
  try {
    const url = new URL(value, 'https://receiz.com');
    if (url.origin !== 'https://receiz.com' || url.username || url.password || url.hash) return null;
    if(kind==='original'){const imported=safeImportedSourceUrl(value,'artifact');if(imported)return imported;}
    if (kind === 'source' && /^\/game\/sports\/card\/rsc_[a-f0-9]{16}\/?$/i.test(url.pathname)) return [...url.searchParams.keys()].length === 1 && /^[a-f0-9]{64}$/i.test(url.searchParams.get('claimHash') ?? '') ? url.href : null;
    if (kind === 'source') return !url.search && (/^\/[a-zA-Z0-9_-]{1,64}\/verified\/[a-zA-Z0-9_-]{1,128}\/?$/.test(url.pathname) || /^\/market\/assets\/[a-zA-Z0-9_-]{1,128}\/?$/.test(url.pathname)) ? url.href : null;
    if (kind === 'proof') return /^\/v\/[a-zA-Z0-9_-]{1,64}\/[a-fA-F0-9]{8,64}\/\d{1,24}\/?$/.test(url.pathname) && [...url.searchParams.keys()].every(key => ['a', 'ms', 'c', 'p', 'tz'].includes(key) && url.searchParams.getAll(key).length === 1) ? url.href : null;
    if (/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/i.test(url.pathname)) return !url.search ? url.href : null;
    return url.pathname === '/api/profile/originals/download' && [...url.searchParams.keys()].every(key => ['receizId', 'kind'].includes(key)) && url.searchParams.getAll('receizId').length === 1 && url.searchParams.getAll('kind').length === 1 && /^[a-zA-Z0-9_-]{1,128}$/.test(url.searchParams.get('receizId') ?? '') && url.searchParams.get('kind') === 'original' ? url.href : null;
  } catch { return null; }
}
/** A public material coordinate locates exact sealed bytes; it does not verify them. */
export function publicMaterialOriginalUrl(input: unknown): string | null {
  const value = text(input, 8192); if (!value) return null;
  try {
    const direct = safeReceizPublicUrl(value, 'original');
    if (direct && new URL(direct).pathname.startsWith('/api/proof-material/packages/')) return direct;
    const coordinate = new URL(value, 'https://receiz.com'), fragment = new URLSearchParams(coordinate.hash.slice(1));
    if ([...fragment.keys()].length !== 1) return null;
    const token = fragment.get('material') ?? ''; if (!/^rmc[12]:[a-f0-9]{64}$/i.test(token)) return null;
    coordinate.hash = ''; if (!safeReceizPublicUrl(coordinate.href, 'proof')) return null;
    return `https://receiz.com/api/proof-material/packages/${token.slice(5).toLowerCase()}/artifact`;
  } catch { return null; }
}
export function parsePublicMarket(membership: unknown, snapshot?: unknown): PublicMarketCatalog {
  const envelope = record(membership), transport = record(envelope.transport), meta = record(transport.publicMembership);
  if (envelope.ok !== true || !Array.isArray(transport.publicOriginals) || transport.publicOriginals.length > 100_000) throw new Error('Receiz public collection is unavailable.');
  const items: PublicMarketItem[] = [], ids = new Set<string>();
  for (const raw of transport.publicOriginals) {
    const source = record(raw), id = text(source.id, 256), assetId = text(source.receizId, 256), title = publicAssetTitle(source);
    if (!id || !assetId || !title || ids.has(id) || source.visibility === 'private') continue;
    ids.add(id);
    const profile=record(source.profileOriginal),media = record(profile.media), material = record(media.material);
    const digest = text(media.originalDownloadSha256Hex ?? material.sealedArtifactSha256Hex, 64);
    const materialOriginal = typeof material.sealedArtifactSha256Hex === 'string' && material.sealedArtifactSha256Hex.toLowerCase() === digest?.toLowerCase() ? publicMaterialOriginalUrl(material.originalArtifactSrc) ?? publicMaterialOriginalUrl(material.proofObjectUrl) : null;
    const verifyUrl=safeReceizPublicUrl(source.verifyHref,'proof'),readingTz=profile.readingTzMinutesEast??media.receiptTzMinutesEast;
    let readingUrl=verifyUrl;if(readingUrl&&typeof readingTz==='number'&&Number.isInteger(readingTz)&&readingTz>=-840&&readingTz<=840){const coordinate=new URL(readingUrl);coordinate.searchParams.set('tz',String(readingTz));readingUrl=coordinate.href;}
    const sealedAt = text(source.createdAt, 64);
    const book=publicBookSource(source),publicUsername = text(source.ownerUsername, 64);
    const ownerUsername = publicUsername && /^[a-zA-Z0-9_-]{1,64}$/.test(publicUsername) ? publicUsername : null;
    const ownerUserId=text(source.ownerUserId,64),ownerCreatedAt=text(source.ownerCreatedAt,64),rawOwnerName=text(source.ownerDisplayName,128);
    const ownerDisplayName=rawOwnerName&&rawOwnerName!=='Receiz ID'?rawOwnerName:ownerCreatedAt?publicAccountDisplayName({displayName:rawOwnerName,username:ownerUsername,createdAt:ownerCreatedAt},ownerUsername??''):rawOwnerName;
    items.push({ id, assetId, title,...(publicOriginalCreator(profile.originalCreator)?{originalCreator:publicOriginalCreator(profile.originalCreator)}:{}),...(publicOriginalProvenance(profile.sourceProvenance??profile.importedSource)?.sourceArtifactSha256===digest?.toLowerCase()?{sourceProvenance:publicOriginalProvenance(profile.sourceProvenance??profile.importedSource)}:{}),...(typeof profile.pbiReceiptHash==='string'&&/^[a-f0-9]{64}$/i.test(profile.pbiReceiptHash)?{pbiReceiptHash:profile.pbiReceiptHash.toLowerCase()}:{}), hasPbiSignature:profile.hasPbiSignature===true||typeof profile.pbiReceiptHash==='string'&&/^[a-f0-9]{64}$/i.test(profile.pbiReceiptHash)||typeof profile.signedArtifactDownloadUrl==='string'&&Boolean(safeReceizPublicUrl(profile.signedArtifactDownloadUrl,'original')), summary: text(source.summary, 8192) ?? '', category: 'proof',
      sourceUrl: safeReceizPublicUrl(source.canonicalHref, 'source'), verifyUrl,readingUrl,
      originalUrl: materialOriginal ?? safeReceizPublicUrl(media.originalDownloadSrc, 'original'), originalDigest: digest && /^[a-f0-9]{64}$/i.test(digest) ? digest.toLowerCase() : null,
      ...(publicNativeAssetBinding(profile.nativeAsset)?{nativeAsset:publicNativeAssetBinding(profile.nativeAsset)}:{}),
      ...(publicCarriedText(profile.longForm)?{carriedText:publicCarriedText(profile.longForm)}:{}),
      hasLongForm:typeof profile.hasLongForm==='boolean'?profile.hasLongForm:Object.hasOwn(profile,'longForm')?Boolean(profile.longForm):undefined,
      mediaKind:publicMediaKind(profile.mediaKind??media.kind??(profile.media===null?null:undefined)),
      artworkUrl:publicMediaArtworkUrl({...media,kind:profile.mediaKind??media.kind},profile.artworkUrl),
      ...(profile.mediaKind==='video'||media.kind==='video'?{videoPosterUrl:safeReceizArtworkUrl(media.videoPosterSrc)}:{}),
      playback:publicMediaPlayback(source,materialOriginal),
      documentUrl:publicDocumentUrl(source,materialOriginal),
      ...(book?{book}:{}),
      proofManifestSource:readPublicAssetManifestSource(profile),
      pulse: typeof source.pulse === 'string' && /^\d{1,24}$/.test(source.pulse) ? source.pulse : null,livePulseSeed:publicMarketPulseSeed(source.livePulseSeed,source.pulse),valuationBinding:{itemId:id,assetId},
      sealedAt: sealedAt && Number.isFinite(Date.parse(sealedAt)) ? sealedAt : null,
      ownerUsername, ownerDisplayName, ownerProfileUrl: ownerUsername ? `https://receiz.com/${encodeURIComponent(ownerUsername)}` : null,
      ...(source.ownerAvatarUrl!==undefined?{ownerAvatarUrl:profileAvatarUrl(source.ownerAvatarUrl)}:{}),
      ...(ownerUserId&&ownerUsername&&ownerCreatedAt&&Number.isFinite(Date.parse(ownerCreatedAt))?{ownerIdentity:{userId:ownerUserId,username:ownerUsername,createdAt:ownerCreatedAt}}:{}),
      priceUsd: nonnegative(source.valueUsd), changePct: null, chart: [], authority: 'projection-only', canTrade: false });
  }
  const catalog: PublicMarketCatalog = { items, complete: meta.version === 1 && meta.scope === 'whole-market-visible-showcase' && meta.source === 'canonical-complete' && meta.isComplete === true && meta.itemCount === items.length,
    revision: text(meta.revision, 256) ?? '', observedAt: text(transport.generatedAt, 64), sourceCount: Number.isSafeInteger(meta.itemCount) && Number(meta.itemCount) >= 0 ? Number(meta.itemCount) : items.length };
  return mergePublicQuotes(catalog, snapshot);
}
/** Curated proof presentation carried by Ledger records and receipts. Reuse the
 * public URL/model/quantity readers; never transport full works or authority. */
const publicProofPresentations=new WeakSet<object>();
export function readPublicProofPresentation(input:unknown):PublicMarketItem|null{
 if(input&&typeof input==='object'&&publicProofPresentations.has(input))return input as PublicMarketItem;
 const value=record(input);if(value.category!=='proof'||value.authority!=='projection-only'||value.canTrade!==false||!text(value.id,256)||!text(value.assetId,256)||!text(value.title,4096))return null;
 const manifest=record(value.proofManifestSource),manifestMedia=record(manifest.media),owner=record(value.ownerIdentity),book=record(value.book);
 const profile={...manifest,assetTitle:value.title,mediaKind:value.mediaKind,artworkUrl:value.artworkUrl,hasLongForm:value.hasLongForm,hasPbiSignature:value.hasPbiSignature,pbiReceiptHash:value.pbiReceiptHash,nativeAsset:value.nativeAsset,originalCreator:publicOriginalCreator(value.originalCreator),sourceProvenance:publicOriginalProvenance(value.sourceProvenance),playback:value.playback,documentUrl:value.documentUrl,media:{...manifestMedia,kind:value.mediaKind,sha256Hex:manifestMedia.sha256Hex??(book.assetId===value.assetId?book.payloadDigest:undefined),originalDownloadSrc:value.originalUrl,originalDownloadSha256Hex:value.originalDigest}};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:value.id,receizId:value.assetId,title:value.title,summary:value.summary,canonicalHref:value.sourceUrl,verifyHref:value.verifyUrl,pulse:value.pulse,createdAt:value.sealedAt,valueUsd:value.priceUsd,livePulseSeed:value.livePulseSeed,ownerUsername:value.ownerUsername,ownerDisplayName:value.ownerDisplayName,...(value.ownerAvatarUrl!==undefined?{ownerAvatarUrl:value.ownerAvatarUrl}:{}),ownerUserId:owner.userId,ownerCreatedAt:owner.createdAt,profileOriginal:profile}]}}).items[0];
 if(!item||item.originalDigest!==value.originalDigest||item.pulse!==value.pulse)return null;
 const reading=safeReceizPublicUrl(value.readingUrl,'proof');if(reading&&item.verifyUrl&&new URL(reading).pathname===new URL(item.verifyUrl).pathname)item.readingUrl=reading;
 const inventory=readPublicShareInventory(value.shareInventory,item);if(inventory)item.shareInventory=inventory;
 if(Array.isArray(value.chart)&&value.chart.length<=256&&value.chart.every(point=>typeof point==='number'&&Number.isFinite(point)&&point>=0))item.chart=[...value.chart];
 if(typeof value.changePct==='number'&&Number.isFinite(value.changePct)&&Math.abs(value.changePct)<=1e6)item.changePct=value.changePct;
 // Reuse this exact curated display result through inspection/receipt passes.
 // Only this module's immutable result qualifies; a claimed digest does not.
 const freeze=(value:object)=>{for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);Object.freeze(value);};freeze(item);publicProofPresentations.add(item);return item;
}
// Locators are public display projections, retained only for the exact artifact
// digest. They never replace verification of bytes returned by that locator.
const originalLocators = new Map<string, string>();
export function rememberPublicOriginalLocators(catalog: PublicMarketCatalog): void {
  for (const item of [...catalog.items].reverse()) {
    const url = publicMaterialOriginalUrl(item.originalUrl); if (!url || !item.originalDigest) continue;
    const key = `${item.assetId}:${item.originalDigest}`;
    originalLocators.delete(key); originalLocators.set(key, url);
    if (originalLocators.size > 2048) originalLocators.delete(originalLocators.keys().next().value!);
  }
}
export function retainedPublicOriginalUrl(assetId: string, digest: string): string | null { return originalLocators.get(`${assetId}:${digest.toLowerCase()}`) ?? null; }
export function mergePublicQuotes(catalog: PublicMarketCatalog, snapshot: unknown): PublicMarketCatalog {
  const envelope = record(snapshot), data = record(envelope.data);
  if (envelope.ok !== true || data.schema !== 'receiz.market.public-snapshot.v1' || !Array.isArray(data.liveMarkets)) return catalog;
  const quotes = new Map<string, RecordValue>();
  for (const raw of data.liveMarkets) { const quote = record(raw), id = text(quote.itemId, 256); if (id && quote.visibility === 'public') quotes.set(id, quote); }
  return { ...catalog, items: catalog.items.map(item => {
    const quote = quotes.get(item.id); if (!quote) return item;
    // The public snapshot chart is in Phi; convert only with its own display basis.
    const basis = nonnegative(quote.quoteUsdPerPhi);
    const chart = Array.isArray(quote.chart) ? quote.chart.slice(-256).map(point => nonnegative(record(point).value)).filter((v): v is number => v !== null).map(value => basis ? value * basis : value).filter(Number.isFinite) : [];
    return { ...item, priceUsd: nonnegative(quote.priceUsd) ?? item.priceUsd,
      changePct: typeof quote.changePct === 'number' && Number.isFinite(quote.changePct) && Math.abs(quote.changePct) <= 1e6 ? quote.changePct : null,
      chart: basis ? chart : [],shareInventory:mergeShareInventory(compatibleShareInventory(item,item.shareInventory),readPublicShareInventory(quote.shareInventory,item)) };
  }) };
}
export function validatePublicQuotes(snapshot: unknown): unknown {
  const envelope = record(snapshot), data = record(envelope.data);
  if (envelope.ok !== true || data.schema !== 'receiz.market.public-snapshot.v1' || !Array.isArray(data.liveMarkets) || data.liveMarkets.length > 100_000) throw new Error('Public quotes returned an unsupported response.');
  return snapshot;
}
export async function fetchPublicMarket(signal?: AbortSignal,afterPublication=assetPublicationFreshnessHint()): Promise<PublicMarketCatalog> {
  const response = await fetch('/api/bank/public-market/membership'+(afterPublication?'?afterPublication='+afterPublication:''), { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('The public Market could not be refreshed.');
  const input = await response.json(); const catalog = parsePublicMarket(input); rememberPublicOriginalLocators(catalog);acceptDiscoveredPublicAssets(catalog);
  if (catalog.complete) try { localStorage.setItem('receiz-bank-public-discovery-v2', JSON.stringify(input)); } catch { /* Storage capacity does not change source availability. */ }
  return catalog;
}
export interface PublicQuoteObservation {snapshot:unknown;receivedAt:number;}
interface PublicQuoteRead {controller:AbortController;epoch:number;pending:Promise<unknown>;consumers:Set<symbol>;}
const quoteReads=new Map<string,PublicQuoteRead>(),quoteListeners=new Set<()=>void>();
let quoteEpoch=0,retainedQuotes:PublicQuoteObservation|null=null,pendingTrade:string|undefined;
export function readRetainedPublicQuotes():PublicQuoteObservation|null{return retainedQuotes;}
export function subscribePublicQuotes(listener:()=>void):()=>void{quoteListeners.add(listener);return()=>{quoteListeners.delete(listener);};}
const tradeNonce=(value?:string)=>value&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)?value:undefined;
const selectQuoteFields=(input:unknown,keys:readonly string[])=>{const source=record(input);return Object.fromEntries(keys.filter(key=>source[key]===null||typeof source[key]==='boolean'||typeof source[key]==='string'&&(source[key] as string).length<=8192||typeof source[key]==='number'&&Number.isFinite(source[key])).map(key=>[key,source[key]]));};
/** Retain only the existing public quote operands, never account/owner payloads.
 * Full inventory validation still occurs against the actual held public asset. */
function publicQuoteObservation(input:unknown):unknown{
 const envelope=record(input),data=record(envelope.data);
 return{ok:true,data:{...selectQuoteFields(data,['schema','generatedAt','serverPulse']),liveMarkets:(data.liveMarkets as unknown[]).filter(raw=>record(raw).visibility==='public').map(raw=>{
  const quote=record(raw),inventory=record(quote.shareInventory),selected=selectQuoteFields(quote,['itemId','assetId','visibility','priceUsd','changePct','quoteUsdPerPhi']);
  if(Array.isArray(quote.chart))selected.chart=quote.chart.slice(-256).map(point=>selectQuoteFields(point,['value']));
  if(Object.keys(inventory).length){const stock=selectQuoteFields(inventory,['schema','marketItemId','assetId','family','quantityScope','observedAtKaiUPulse','outstandingShareQuantityMicro','availableShareQuantityMicro','maxPurchaseShareQuantityMicro','availability','originalIssuedShareQuantityMicro','positionsMicro','certificatesMicro','reservedBuyMicro','nativeAssetId','issuanceSourceSha256','sourceHeadSha256','historyBasis']);
   if(inventory.capacity)stock.capacity=selectQuoteFields(inventory.capacity,['askPriceUsdCents','hardCapUsdCents','openInterestUsdCents','maxSingleTradeUsdCents']);
   const pointFields=['kaiUPulse','unitPriceUsdCents','outstandingShareQuantityMicro','availableShareQuantityMicro'];
   if(inventory.releaseCapitalization)stock.releaseCapitalization=selectQuoteFields(inventory.releaseCapitalization,[...pointFields,'modelVersion']);
   for(const key of ['history','capitalizationHistory'])if(Array.isArray(inventory[key])&&inventory[key].length<=10001)stock[key]=inventory[key].map(point=>selectQuoteFields(point,pointFields));
   selected.shareInventory=stock;
  }return selected;
 })}};
}
function olderQuoteSnapshot(next:unknown,previous:unknown):boolean{
 const a=record(record(next).data),b=record(record(previous).data),pulse=(value:unknown)=>typeof value==='string'&&/^\d{1,24}$/.test(value)?BigInt(value):typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?BigInt(value):null;
 const ap=pulse(a.serverPulse),bp=pulse(b.serverPulse),at=Date.parse(String(a.generatedAt??'')),bt=Date.parse(String(b.generatedAt??''));
 return bp!==null&&(ap===null||ap<bp)||Number.isFinite(bt)&&(!Number.isFinite(at)||at<bt);
}
/** One public request/decode per intent. Cancellation belongs to a consumer;
 * a closing surface cannot cancel another surface's pending observation. */
export async function fetchPublicQuotes(signal?:AbortSignal,afterTrade?:string):Promise<unknown>{
 if(signal?.aborted)return Promise.reject(new DOMException('The operation was aborted.','AbortError'));
 const nonce=tradeNonce(afterTrade);if(nonce)pendingTrade=nonce;
 const key=nonce??pendingTrade??'';let read=quoteReads.get(key);
 if(!read||read.controller.signal.aborted||read.epoch!==quoteEpoch){
  const controller=new AbortController(),epoch=++quoteEpoch;
  const pending=fetch('/api/bank/public-market/quotes'+(key?'?afterTrade='+key:''),{signal:controller.signal,credentials:'omit'}).then(async response=>{
   if(!response.ok)throw new Error('Public quotes could not be refreshed.');
   const value=validatePublicQuotes(await response.json());
   if(!controller.signal.aborted&&epoch===quoteEpoch){
    if(!retainedQuotes||!olderQuoteSnapshot(value,retainedQuotes.snapshot)){
     retainedQuotes={snapshot:publicQuoteObservation(value),receivedAt:Date.now()};
     if(pendingTrade===key)pendingTrade=undefined;
     for(const listener of quoteListeners)listener();
    }
   }return retainedQuotes&&(epoch!==quoteEpoch||olderQuoteSnapshot(value,retainedQuotes.snapshot))?retainedQuotes.snapshot:value;
  }).finally(()=>{if(quoteReads.get(key)?.epoch===epoch)quoteReads.delete(key);});
  read={controller,epoch,pending,consumers:new Set()};quoteReads.set(key,read);
 }
 const shared=read,consumer=Symbol();shared.consumers.add(consumer);
 return new Promise((resolve,reject)=>{
  let settled=false;const finish=(callback:()=>void)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);shared.consumers.delete(consumer);callback();};
  const abort=()=>finish(()=>{if(!shared.consumers.size)shared.controller.abort();reject(new DOMException('The operation was aborted.','AbortError'));});
  signal?.addEventListener('abort',abort,{once:true});shared.pending.then(value=>finish(()=>resolve(value)),cause=>finish(()=>reject(cause)));
 });
}
/** A fresh already-held Market read needs no second Ledger request. */
export function preparePublicQuotes(signal?:AbortSignal):Promise<unknown>{
 const age=retainedQuotes?Date.now()-retainedQuotes.receivedAt:Infinity;
 if(!pendingTrade&&retainedQuotes&&age>=0&&age<60_000)return signal?.aborted?Promise.reject(new DOMException('The operation was aborted.','AbortError')):Promise.resolve(retainedQuotes.snapshot);
 return fetchPublicQuotes(signal);
}
export function formatPublicPrice(value: number | null): string { return value === null ? 'Value unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value); }
