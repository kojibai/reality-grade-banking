import type {PublicShowcaseRelease} from './public-showcase-release.js';
import {publicProfileArtwork} from './profile-artwork.js';
import {publicAccountDisplayName,publicProfileUsername} from './account-name.js';
import {curatePublicProfileHead,publicProfileHeaderDisplayBasis,readPublicProfileHeader,type PublicProfileHead,type PublicProfileHeader} from './public-profile-header.js';
import {copyPublicProfileHeader,storedPublicHead,retainStoredPublicHead,retainStoredPublicHeader,forgetStoredPublicHead} from './public-head-cache.js';
import {afterPublicNavigationReady} from '../core/public-document-entry.js';
import {mergeAdmittedProfileAssets,forgetAssetPublicationAdmissions,acceptDiscoveredProfileAssets} from './asset-publication-adoption.js';
import {parsePublicMarket,type PublicMarketItem,type PublicMarketCatalog} from './public-market.js';
import {profileAvatarUrl,rememberObservedProfilePortrait,forgetObservedProfilePortrait} from './profile-avatar.js';
import {retainRecipientPortrait,forgetRecipientPortrait} from './recipient-portrait.js';

const names=/^[a-z0-9_]{3,24}$/;
export const publicProfileReservedNames=['build','accept','receive','receiving','invitation','merchant','discover','feed','moments','meet','book','banking','guide','action','crypto','nft','nfts','economy','farmers','fuel','repairs','grocers','housing','workers','trust','money','deposit','fees','help','about','customers','switch','start','privacy','terms','docs','standard','standards','agent','agents','fraud','recover','proof','together','cooperate','protect','vaults','fit','coops','cooperatives','business','pay','api','asset','assets','auth','conformance','registry','explore','explorer','learn','legal','ledger','market','market-cap','native','offline','receipt','source','verify','u'] as const;
const reserved=new Set<string>(publicProfileReservedNames);
export const profileUsername=(value:unknown):string|null=>typeof value==='string'&&names.test(value)?value:null;
export function profilePagePath(username:string){if(!profileUsername(username))throw Error('PROFILE_USERNAME_INVALID');return reserved.has(username)?`/u/${username}/`:`/${username}/`;}
export function profilePageUsername(path:string):string|null{
 const match=/^\/(?:u\/)?([a-z0-9_]{3,24})\/?$/.exec(path);if(!match||!path.startsWith('/u/')&&reserved.has(match[1]))return null;return match[1];
}
export function publicProfileMovement(current:number|null,previous:number|null){return current!==null&&previous!==null&&Number.isFinite(current)&&Number.isFinite(previous)&&current>=0&&previous>0?(current/previous-1)*100:null;}
export interface PublicProfile extends PublicProfileHeader {items:PublicMarketItem[];nextCursor:string|null;publicShowcaseRelease?:PublicShowcaseRelease;}
export type {PublicProfileHeader} from './public-profile-header.js';
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
export function publicProfileLink(v:unknown){const raw=text(v,8192);if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
/** Match Receiz's latest showcase presentation: sealed Kai pulse, then Original
 * ID. Accepted storage order and mutable display dates do not rank Originals. */
function compareProfileOriginals(left:PublicMarketItem,right:PublicMarketItem){
 if(left.pulse&&right.pulse){const a=BigInt(left.pulse),b=BigInt(right.pulse);if(a!==b)return a>b?-1:1;}
 else if(left.pulse||right.pulse)return left.pulse?-1:1;
 return right.assetId.localeCompare(left.assetId);
}
function publicOriginalItems(rows:unknown[],p:Record<string,unknown>,collection=false):PublicMarketItem[]{
 const username=String(p.username),displayName=publicAccountDisplayName(p,username);
 const originals=rows.filter(row=>object(row).showOnProfile===true).map(value=>{
  const row=object(value),market=object(row.marketPreview),media=row.media===null?null:object(row.media),id=text(row.id,128),long=object(row.longForm);
  if(collection&&typeof row.hasLongForm!=='boolean')throw Error('PROFILE_COLLECTION_READER_METADATA_INVALID');
  return {id:`profile:${username}:${id}`,receizId:id,title:text(row.claim,8192)??text(long.title,500)??'Original',summary:text(row.claim,8192)??'',ownerUsername:username,...(typeof p.receivingUsername==='string'&&publicProfileUsername(username,p.receivingUsername)===p.receivingUsername?{ownerReceivingUsername:p.receivingUsername}:{}),ownerDisplayName:displayName,ownerUserId:p.userId,ownerCreatedAt:p.createdAt,
   canonicalHref:`https://receiz.com/${username}/verified/${encodeURIComponent(id??'')}`,verifyHref:row.verifyUrl??row.verifyPath,pulse:row.pulse,createdAt:row.createdAt,valueUsd:market.priceUsd,livePulseSeed:market.livePulseSeed,
   profileOriginal:{...row,media,hasLongForm:typeof row.hasLongForm==='boolean'?row.hasLongForm:Boolean(long.text),longForm:row.longForm}};
 });
 return parsePublicMarket({ok:true,transport:{publicOriginals:originals}}).items.map(item=>p.avatarUrl===undefined?item:{...item,ownerAvatarUrl:profileAvatarUrl(p.avatarUrl)}).sort(compareProfileOriginals);
}
/** The anonymous verified-viewer route admits the selected public Original.
 * This is a display projection; it adds no ownership or trading authority. */
export function parsePublicOriginal(input:unknown,username:string,originalId:string):PublicMarketItem{
 const envelope=object(input),view=object(envelope.viewer),p=object(view.profile);
 if(envelope.ok!==true||!profileUsername(username)||p.username!==username||!text(p.userId,256)||p.isPrivate!==false||!Array.isArray(view.originals)||view.originals.length>10_000)throw Error('PROFILE_ORIGINAL_UNAVAILABLE');
 const rows=view.originals.filter(value=>object(value).id===originalId);
 if(rows.length!==1)throw Error('PROFILE_ORIGINAL_UNAVAILABLE');
 const items=publicOriginalItems(rows,p),item=items[0];
 if(items.length!==1||item?.id!==`profile:${username}:${originalId}`)throw Error('PROFILE_ORIGINAL_UNAVAILABLE');
 return item;
}
/** Public presentation projection only. A handle and these fields confer no
 * identity, ownership, write authority or device qualification. */
export function parsePublicProfile(input:unknown,expectedUsername:string):PublicProfile{
 const envelope=object(input),view=object(envelope.profile),p=object(view.profile),viewer=object(view.viewer);
 if(envelope.ok!==true||!text(p.userId,256)||p.username!==expectedUsername||!profileUsername(p.username))throw Error('PROFILE_IDENTITY_MISMATCH');
 if(p.isPrivate!==false||viewer.canView!==true)throw Error('PROFILE_PRIVATE');
 const username=expectedUsername,rows=Array.isArray(view.originals)?view.originals:[];
 if(rows.length>10_000)throw Error('PROFILE_PAGE_TOO_LARGE');
 const header=readPublicProfileHeader(view,username);if(!header)throw Error('PROFILE_RESPONSE_INVALID');
 const items=publicOriginalItems(rows,p,envelope.representation==='collection-v2'),page=object(view.originalsPage),cursor=text(page.nextCursor,4096);
 const profile:PublicProfile={...header,items,nextCursor:page.hasMore===true&&cursor&&!/[\x00-\x1f\x7f]/.test(cursor)?'all:'+p.userId:null};
 const raw=curatePublicProfileHead(view);if(raw)qualifiedHeaders.set(profile,raw);return profile;
}

/** Inline deterministic artwork is already in the document; social crawlers
 * require a public HTTP image rather than a repeated data: payload. */
export function publicProfileSocialImage(profile:Pick<PublicProfile,'bannerUrl'|'avatarUrl'>):string|null {
 return publicProfileLink(profile.bannerUrl)??publicProfileLink(profile.avatarUrl);
}

/** Full public collections stay in this tab. Only compact anonymous header
 * continuations use optional display storage; owner overlays never enter it. */
const held=new Map<string,PublicProfile>();
const refusals=new Map<string,{code:string;userId?:string}>(),privateProfileAccounts=new Set<string>();
let revision=0;
export const publicProfilesRevision=()=>revision;
const catalogProfiles=new WeakMap<PublicProfile,{items:PublicMarketItem[];header:boolean}>();
const selectedCatalogProfiles=new WeakMap<PublicMarketItem[],Map<string,{base:PublicProfile|null;profile:PublicProfile;head?:PublicProfileHeader}>>();
const selectedHeaders=new WeakMap<PublicProfile,PublicProfileHeader>(),supersededHeaders=new WeakMap<PublicProfile,string>();
// Keep only compact public header provenance and the exact catalog display
// basis; restored display B must not become its own consumed baseline A.
const qualifiedHeaders=new WeakMap<PublicProfile,PublicProfileHead>(),rawSelectedHeaders=new WeakMap<PublicProfile,PublicProfileHead>(),catalogHeaderBases=new WeakMap<PublicProfile,string>();
// Only actual successful public readers mark projected HTTP display input.
const qualifiedReaderHeaders=new WeakMap<PublicProfile,PublicProfileHeader>(),projectedHeaders=new WeakMap<PublicProfile,PublicProfileHeader>();
function heldCatalogHeader(profile:PublicProfile):unknown{
 if(typeof document==='undefined')return null;
 const marker=document.getElementById('receiz-navigation') as (HTMLElement&{publicMarketCatalog?:()=>PublicMarketCatalog|null})|null;
 try{return marker?.publicMarketCatalog?.()?.publicProfileHeads?.find(head=>head.profile.userId===profile.userId&&head.profile.username===profile.username)??null;}catch{return null;}
}
const profileReadEpoch=new Map<string,number>();
const confirmedProfilePbi=new Map<string,string>();
export const knownProfilePbiAuthorship=(uid:string)=>confirmedProfilePbi.get(uid)??null;
const listeners=new Set<()=>void>();
function notifyProfiles(){revision++;for(const listener of listeners)listener();}
export const subscribePublicProfiles=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
/** The initial head already carries this profile. Its router is installed
 * after the trailing document; deliver that same metadata when its listener
 * exists, and never replay a source that has since been replaced or removed. */
function publishProfileMetadata(profile:PublicProfile){
 if(typeof dispatchEvent!=='function')return;
 const publish=()=>{if(held.get(profile.username)===profile)dispatchEvent(new CustomEvent('bankeiz:profile-metadata',{detail:{username:profile.username,title:profile.displayName,description:profile.bio,image:publicProfileSocialImage(profile)}}));};
 afterPublicNavigationReady(publish);
}
export function retainPublicProfile(input:PublicProfile){const previous=held.get(input.username),receipt=confirmedProfilePbi.get(input.userId)??(previous?.userId===input.userId?previous.pbiReceiptHash:null),profile=mergeAdmittedProfileAssets(receipt&&(!input.authorshipVerified||!input.pbiReceiptHash)?{...input,authorshipVerified:true,pbiReceiptHash:input.pbiReceiptHash??receipt}:input);for(const [name,previous]of held)if(name!==profile.username&&previous.userId===profile.userId)refusePublicProfile(name,'PROFILE_CHANGED',profile.userId);held.delete(profile.username);held.set(profile.username,profile);const selectedHead=selectedHeaders.get(input),projection=catalogProfiles.get(input),previousHeader=previous?.userId===profile.userId?selectedHeaders.get(previous):undefined;
 const observedBasis=!projection&&!selectedHead?publicProfileHeaderDisplayBasis(heldCatalogHeader(profile)):null;
 const superseded=supersededHeaders.get(input)??(!projection&&!selectedHead?publicProfileHeaderDisplayBasis(previousHeader)??observedBasis:previous?.userId===profile.userId?supersededHeaders.get(previous):null);
 const qualified=qualifiedHeaders.get(input),raw=qualified??rawSelectedHeaders.get(input);
 const selectedRaw=raw&&profile.authorshipVerified&&profile.pbiReceiptHash&&/^[a-f0-9]{64}$/i.test(profile.pbiReceiptHash)?{...raw,profile:{...raw.profile,authorshipVerified:true,authorshipPbiReceiptHash:profile.pbiReceiptHash}}:raw;
 const cacheBasis=catalogHeaderBases.get(input)??observedBasis??(previous?.userId===profile.userId?catalogHeaderBases.get(previous):null)??superseded;
 const reader=qualifiedReaderHeaders.get(input)??projectedHeaders.get(input),projected=reader&&(reader.authorshipVerified===profile.authorshipVerified&&reader.pbiReceiptHash===profile.pbiReceiptHash?reader:{...reader,authorshipVerified:profile.authorshipVerified,pbiReceiptHash:profile.pbiReceiptHash});
 if(projected)projectedHeaders.set(profile,projected);if(qualifiedReaderHeaders.has(input)&&projected)qualifiedReaderHeaders.set(profile,projected);
 if(cacheBasis)catalogHeaderBases.set(profile,cacheBasis);if(selectedRaw)rawSelectedHeaders.set(profile,selectedRaw);if((qualified||confirmedProfilePbi.has(profile.userId))&&selectedRaw){qualifiedHeaders.set(profile,selectedRaw);retainStoredPublicHead(selectedRaw,cacheBasis??null);}else if((qualifiedReaderHeaders.has(input)||confirmedProfilePbi.has(profile.userId))&&projected)retainStoredPublicHeader(projected,cacheBasis??null);
 if(superseded)supersededHeaders.set(profile,superseded);if(selectedHead??previousHeader)selectedHeaders.set(profile,(selectedHead??previousHeader)!);if(projection)catalogProfiles.set(profile,projection);else privateProfileAccounts.delete(profile.userId);if(!projection||!previous||previous.userId!==profile.userId)profileReadEpoch.set(profile.username,(profileReadEpoch.get(profile.username)??0)+1);refusals.delete(profile.username);rememberObservedProfilePortrait(profile);retainRecipientPortrait(profile.username,profile.avatarUrl);if(held.size>24)forgetPublicProfile(held.keys().next().value!);publishProfileMetadata(profile);notifyProfiles();return profile;}
/** Append the confirmed canonical PBI enrollment to held public presentation.
 * No original, membership, pricing or private profile data is replaced. */
export function retainProfilePbiAuthorship(accountUid:string,receiptHash:string){
 if(!/^[a-f0-9]{64}$/.test(receiptHash))throw Error('PROFILE_PBI_RECEIPT_INVALID');
 confirmedProfilePbi.set(accountUid,receiptHash);if(confirmedProfilePbi.size>24)confirmedProfilePbi.delete(confirmedProfilePbi.keys().next().value!);
 for(const profile of [...held.values()])if(profile.userId===accountUid){const signed={...profile,authorshipVerified:true,pbiReceiptHash:receiptHash},basis=catalogProfiles.get(profile),raw=rawSelectedHeaders.get(profile);if(raw)qualifiedHeaders.set(signed,{...raw,profile:{...raw.profile,authorshipVerified:true,authorshipPbiReceiptHash:receiptHash}});const projected=projectedHeaders.get(profile);if(projected)qualifiedReaderHeaders.set(signed,{...projected,authorshipVerified:true,pbiReceiptHash:receiptHash});if(basis)catalogProfiles.set(signed,basis);retainPublicProfile(signed);}
}
export function forgetPublicProfile(username:string){forgetObservedProfilePortrait(username);forgetRecipientPortrait(username);forgetAssetPublicationAdmissions(username);held.delete(username);profileReadEpoch.set(username,(profileReadEpoch.get(username)??0)+1);if(typeof document!=='undefined'){const seed=document.getElementById('public-profile-seed');try{if(JSON.parse(seed?.textContent??'null')?.username===username)seed?.remove();}catch{/* Invalid seeds are never adopted. */}}notifyProfiles();}
export function forgetPublicProfilesForAccount(uid:string){forgetStoredPublicHead(uid);confirmedProfilePbi.delete(uid);privateProfileAccounts.add(uid);if(privateProfileAccounts.size>24)privateProfileAccounts.delete(privateProfileAccounts.values().next().value!);for(const [name,profile]of [...held])if(profile.userId===uid)refusePublicProfile(name,'PROFILE_PRIVATE',uid);}
export function publicProfilePageError(username:string,catalog?:PublicMarketCatalog|null):string{
 if(privateProfileAccounts.size&&catalog?.items.some(item=>item.ownerUsername===username&&!!item.ownerIdentity&&privateProfileAccounts.has(item.ownerIdentity.userId)))return 'PROFILE_PRIVATE';
 const refusal=refusals.get(username);if(refusal){
  const rows=catalog?.complete&&refusal.userId?catalog.items.filter(item=>item.category==='proof'&&item.ownerUsername===username):[];
  const rebound=rows[0]?.ownerIdentity;
  if(!rebound||rebound.userId===refusal.userId||rows.some(item=>!item.ownerIdentity||item.ownerIdentity.username!==username||item.ownerIdentity.userId!==rebound.userId))return refusal.code;
  return '';
 }
 if(typeof document==='undefined')return '';try{const value=JSON.parse(document.getElementById('public-profile-error')?.textContent??'null');return value?.username===username&&Date.now()-value.at<15_000&&['PROFILE_PRIVATE','PROFILE_NOT_FOUND','PROFILE_UNAVAILABLE'].includes(value.code)?value.code:'';}catch{return '';}
}
export function retainedPublicProfile(username:string):PublicProfile|null{
 const previous=held.get(username);if(previous)return previous;
 if(typeof document==='undefined')return null;
 try{const seed=document.getElementById('public-profile-seed'),value=JSON.parse(seed?.textContent??'null');if(value?.schema==='bankeiz.public-profile.v1'&&value.username===username&&typeof value.userId==='string'&&Array.isArray(value.items)){const retained=retainPublicProfile(value);if(seed){seed.textContent='';seed.remove();}return retained;}}catch{/* No carried public page. */}return null;
}
/** A held Market row already supplies this public display binding. It does
 * not become profile PBI, owner authority, or an anonymous private account. */
export const publicProfileHasHeader=(profile:PublicProfile)=>catalogProfiles.get(profile)?.header!==false;
export function selectHeldPublicProfile(username:string,catalog:PublicMarketCatalog|null):PublicProfile|null{
 if(!profileUsername(username)||['PROFILE_PRIVATE','PROFILE_NOT_FOUND','PROFILE_CHANGED'].includes(publicProfilePageError(username,catalog)))return null;
 const previous=retainedPublicProfile(username),basis=previous?catalogProfiles.get(previous):undefined;
 if(!catalog)return previous;
 const rawHead=catalog.publicProfileHeads?.find(head=>head.profile.username===username),ownerUid=rawHead?.profile.userId??catalog.items.find(item=>item.category==='proof'&&item.ownerUsername===username)?.ownerIdentity?.userId;
 if(typeof ownerUid==='string'&&privateProfileAccounts.has(ownerUid))return null;
 const saved=typeof ownerUid==='string'?storedPublicHead(ownerUid,username,notifyProfiles):null,rawBasis=publicProfileHeaderDisplayBasis(rawHead);
 const restored=saved&&(!rawHead||saved.consumedBasis===rawBasis||!!saved.head&&publicProfileHeaderDisplayBasis(saved.head)===rawBasis)?saved:null;
 const displayHead=restored?restored.head:rawHead,carried=restored?.header??(displayHead?readPublicProfileHeader(displayHead,username)??undefined:undefined);
 if(carried&&privateProfileAccounts.has(carried.userId))return null;
 const matchingHead=(uid:string,createdAt:string|null)=>carried?.userId===uid&&(!carried.createdAt||!createdAt||carried.createdAt===createdAt)?carried:undefined;
 if(previous&&!basis){
  const incoming=catalog.complete?catalog.items.find(item=>item.category==='proof'&&item.ownerUsername===username)?.ownerIdentity:null;
  if((!incoming&&!carried)||incoming?.userId===previous.userId||!incoming&&carried?.userId===previous.userId){
   const head=matchingHead(previous.userId,previous.createdAt);
   if(!head||selectedHeaders.get(previous)===head||supersededHeaders.get(previous)===publicProfileHeaderDisplayBasis(head)||projectedHeaders.get(previous)===head||!!rawSelectedHeaders.get(previous)&&publicProfileHeaderDisplayBasis(rawSelectedHeaders.get(previous))===publicProfileHeaderDisplayBasis(head))return previous;
   const profile={...previous,...head,stats:{...head.stats,originals:previous.stats.originals},...(previous.authorshipVerified?{authorshipVerified:true,pbiReceiptHash:previous.pbiReceiptHash}:{}),items:previous.items,nextCursor:previous.nextCursor};
   selectedHeaders.set(profile,head);if(rawBasis)catalogHeaderBases.set(profile,rawBasis);if(displayHead)rawSelectedHeaders.set(profile,displayHead);if(restored?.header)projectedHeaders.set(profile,restored.header);if(restored?.consumedBasis)supersededHeaders.set(profile,restored.consumedBasis);return profile;
  }
 }
 if(previous&&basis?.items===catalog.items&&(!carried||selectedHeaders.get(previous)===carried))return previous;
 let selections=selectedCatalogProfiles.get(catalog.items);if(!selections){selections=new Map();selectedCatalogProfiles.set(catalog.items,selections);}
 const cached=selections.get(username);if(cached&&cached.head===carried&&(cached.profile===previous||cached.base===previous))return cached.profile;
 const items=catalog.items.filter(item=>item.category==='proof'&&item.ownerUsername===username);
 if(!items.length){
  if(catalog.complete&&carried){
   const matching=previous?.userId===carried.userId?previous:null,profile:PublicProfile={...carried,...(matching?.authorshipVerified?{authorshipVerified:true,pbiReceiptHash:matching.pbiReceiptHash}:{}),items:matching?.items.length===0?matching.items:[],stats:{...carried.stats,originals:0},nextCursor:null};
   selectedHeaders.set(profile,carried);if(rawBasis)catalogHeaderBases.set(profile,rawBasis);if(displayHead)rawSelectedHeaders.set(profile,displayHead);if(restored?.header)projectedHeaders.set(profile,restored.header);if(restored?.consumedBasis)supersededHeaders.set(profile,restored.consumedBasis);catalogProfiles.set(profile,{items:catalog.items,header:true});selections.set(username,{base:previous,profile,head:carried});return profile;
  }
  if(!previous||!basis||!catalog.complete)return previous;
  const profile={...previous,items:[],stats:{...previous.stats,originals:0},nextCursor:null};
  catalogProfiles.set(profile,{items:catalog.items,header:basis.header});selections.set(username,{base:previous,profile});return profile;
 }
 const owner=items[0].ownerIdentity;
 if(new Set(items.flatMap(item=>item.ownerIdentity?[item.ownerIdentity.userId]:[])).size>1)return null;
 if(!owner||owner.username!==username||items.some(item=>!item.ownerIdentity||item.ownerIdentity.username!==username||item.ownerIdentity.userId!==owner.userId||item.ownerIdentity.createdAt!==owner.createdAt))return previous;
 const matching=previous?.userId===owner.userId?previous:null,head=matchingHead(owner.userId,owner.createdAt);
 const ordered=matching&&basis?.items===catalog.items?matching.items:items.slice().sort(compareProfileOriginals),known=!!head||!!matching&&basis?.header===true;
 const images=head?{avatarUrl:head.avatarUrl,bannerUrl:head.bannerUrl}:known?{avatarUrl:matching!.avatarUrl,bannerUrl:matching!.bannerUrl}:publicProfileArtwork({...owner,avatarUrl:items.find(item=>item.ownerAvatarUrl)?.ownerAvatarUrl});
 const profile:PublicProfile={schema:'bankeiz.public-profile.v1',userId:owner.userId,username,...(items[0].ownerReceivingUsername?{receivingUsername:items[0].ownerReceivingUsername}:{}),displayName:items[0].ownerDisplayName??username,bio:null,location:null,websiteUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:owner.createdAt,...(known&&matching?matching:{}),...head,...images,
 ...(matching?.authorshipVerified?{authorshipVerified:true,pbiReceiptHash:matching.pbiReceiptHash}:{}),stats:{...(head?.stats??matching?.stats??{views:null,plays:null,seconds:null,completion:null}),originals:catalog.complete?ordered.length:matching?.stats.originals??null},items:ordered,nextCursor:catalog.complete?null:'all:'+owner.userId};
 if(head){selectedHeaders.set(profile,head);if(rawBasis)catalogHeaderBases.set(profile,rawBasis);if(displayHead)rawSelectedHeaders.set(profile,displayHead);}if(restored?.header)projectedHeaders.set(profile,restored.header);if(restored?.consumedBasis)supersededHeaders.set(profile,restored.consumedBasis);catalogProfiles.set(profile,{items:catalog.items,header:known});selections.set(username,{base:previous,profile,head:carried});return profile;
}
function refusePublicProfile(username:string,code:string,expectedUserId?:string){
 const current=held.get(username);if(expectedUserId&&current?.userId!==expectedUserId)return;
 if(expectedUserId??current?.userId)forgetStoredPublicHead((expectedUserId??current!.userId)!);forgetPublicProfile(username);refusals.set(username,{code,...(expectedUserId??current?.userId?{userId:expectedUserId??current!.userId}:{})});if(refusals.size>24)refusals.delete(refusals.keys().next().value!);notifyProfiles();
}
const headerReads=new Map<string,Promise<PublicProfile>>();
/** Only distinct missing header metadata uses the existing bounded manifest
 * reader. Membership, Original bytes and historical rows are not fetched. */
export function fetchPublicProfileHeader(profile:PublicProfile):Promise<PublicProfile>{
 const {username,userId}=profile,key=username+':'+userId,pending=headerReads.get(key);if(pending)return pending;
 const epoch=profileReadEpoch.get(username)??0;
 const attempt=(async()=>{
  const response=await fetch(`/api/bank/public-profile/${username}?view=head`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!response.ok){const code=response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':response.status===409?'PROFILE_CHANGED':'PROFILE_UNAVAILABLE';if([403,404,409].includes(response.status)&&(profileReadEpoch.get(username)??0)===epoch)refusePublicProfile(username,code,userId);throw Error(code);}
  const header=await response.json() as PublicProfileHeader;
  if(header.schema!=='bankeiz.public-profile.v1'||header.username!==username||typeof header.userId!=='string')throw Error('PROFILE_RESPONSE_INVALID');
  const current=retainedPublicProfile(username);
  if((profileReadEpoch.get(username)??0)!==epoch||!current||current.userId!==userId)return current??profile;
  if(header.userId!==userId){refusePublicProfile(username,'PROFILE_CHANGED',userId);throw Error('PROFILE_CHANGED');}
  if(publicProfileHasHeader(current))return current;
  const enriched={...header,items:current.items,nextCursor:current.nextCursor};
  const basis=catalogProfiles.get(current);if(basis)catalogProfiles.set(enriched,{...basis,header:true});const direct=copyPublicProfileHeader(header,username);if(direct&&(!current.createdAt||!direct.createdAt||current.createdAt===direct.createdAt))qualifiedReaderHeaders.set(enriched,direct);return retainPublicProfile(enriched);
 })();headerReads.set(key,attempt);void attempt.finally(()=>{if(headerReads.get(key)===attempt)headerReads.delete(key);}).catch(()=>{});return attempt;
}
const reads=new Map<string,Promise<PublicProfile>>();
export function fetchPublicProfile(username:string,cursor?:string,priority:RequestPriority='auto'):Promise<PublicProfile>{
 if(!profileUsername(username))return Promise.reject(Error('PROFILE_USERNAME_INVALID'));
 const key=username+':'+(cursor??'');const pending=reads.get(key);if(pending)return pending;
 const epoch=profileReadEpoch.get(username)??0,selected=held.get(username);
 const attempt=(async()=>{const response=await fetch(`/api/bank/public-profile/${username}${cursor?'?cursor='+encodeURIComponent(cursor):''}`,{credentials:'omit',redirect:'error',cache:'no-store',priority,signal:AbortSignal.timeout(30_000)});
  if(!response.ok){if([403,404,409].includes(response.status)&&(profileReadEpoch.get(username)??0)===epoch&&held.get(username)===selected)refusePublicProfile(username,response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':'PROFILE_CHANGED');throw Error(response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':response.status===409?'PROFILE_CHANGED':'PROFILE_UNAVAILABLE');}
  if((profileReadEpoch.get(username)??0)!==epoch||held.get(username)!==selected){await response.body?.cancel().catch(()=>{});const current=retainedPublicProfile(username);if(current)return current;throw Error('PROFILE_CHANGED');}
  const value=await response.json() as PublicProfile;if(value.schema!=='bankeiz.public-profile.v1'||value.username!==username||typeof value.userId!=='string'||!Array.isArray(value.items)||value.items.length>10_000)throw Error('PROFILE_RESPONSE_INVALID');
  if((profileReadEpoch.get(username)??0)!==epoch||held.get(username)!==selected){const current=retainedPublicProfile(username);if(current)return current;throw Error('PROFILE_CHANGED');}
  const direct=copyPublicProfileHeader(value,username);if(direct&&(!selected||selected.userId!==direct.userId||!selected.createdAt||!direct.createdAt||selected.createdAt===direct.createdAt))qualifiedReaderHeaders.set(value,direct);
  acceptDiscoveredProfileAssets(value);if(!cursor)return retainPublicProfile(value);return mergeAdmittedProfileAssets(value);
 })();reads.set(key,attempt);void attempt.finally(()=>{if(reads.get(key)===attempt)reads.delete(key);}).catch(()=>{});return attempt;
}
