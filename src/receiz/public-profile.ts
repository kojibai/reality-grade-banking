import {publicProfileArtwork} from './profile-artwork.js';
import {publicAccountDisplayName} from './account-name.js';
import {afterPublicNavigationReady} from '../core/public-document-entry.js';
import {mergeAdmittedProfileAssets,forgetAssetPublicationAdmissions,acceptDiscoveredProfileAssets} from './asset-publication-adoption.js';
import {parsePublicMarket,type PublicMarketItem,type PublicMarketCatalog} from './public-market.js';
import {profileAvatarUrl,rememberObservedProfilePortrait,forgetObservedProfilePortrait} from './profile-avatar.js';
import {retainRecipientPortrait,forgetRecipientPortrait} from './recipient-portrait.js';

const names=/^[a-z0-9_]{3,24}$/;
export const publicProfileReservedNames=['build','accept','receive','merchant','discover','feed','moments','meet','book','banking','guide','action','crypto','nft','nfts','economy','farmers','fuel','repairs','grocers','housing','workers','trust','money','deposit','fees','help','about','customers','switch','start','privacy','terms','docs','standard','standards','agent','agents','fraud','recover','proof','together','cooperate','protect','vaults','fit','coops','cooperatives','business','pay','api','asset','assets','auth','conformance','explore','explorer','learn','legal','ledger','market','market-cap','native','offline','receipt','source','verify','u'] as const;
const reserved=new Set<string>(publicProfileReservedNames);
export const profileUsername=(value:unknown):string|null=>typeof value==='string'&&names.test(value)?value:null;
export function profilePagePath(username:string){if(!profileUsername(username))throw Error('PROFILE_USERNAME_INVALID');return reserved.has(username)?`/u/${username}/`:`/${username}/`;}
export function profilePageUsername(path:string):string|null{
 const match=/^\/(?:u\/)?([a-z0-9_]{3,24})\/?$/.exec(path);if(!match||!path.startsWith('/u/')&&reserved.has(match[1]))return null;return match[1];
}
export function publicProfileMovement(current:number|null,previous:number|null){return current!==null&&previous!==null&&Number.isFinite(current)&&Number.isFinite(previous)&&current>=0&&previous>0?(current/previous-1)*100:null;}
export interface PublicProfile {
 schema:'bankeiz.public-profile.v1';userId:string;username:string;displayName:string;bio:string|null;location:string|null;
 websiteUrl:string|null;avatarUrl:string|null;bannerUrl:string|null;socialLinks:{label:string;url:string}[];
 links:{label:string;url:string}[];
 authorshipVerified:boolean;pbiReceiptHash:string|null;createdAt:string|null;
 bookingEnabled?:boolean;
 stats:{originals:number|null;views:number|null;plays:number|null;seconds:number|null;completion:number|null};
 items:PublicMarketItem[];nextCursor:string|null;
}
export type PublicProfileHeader=Omit<PublicProfile,'items'|'nextCursor'>;
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
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
  return {id:`profile:${username}:${id}`,receizId:id,title:text(row.claim,8192)??text(long.title,500)??'Original',summary:text(row.claim,8192)??'',ownerUsername:username,ownerDisplayName:displayName,ownerUserId:p.userId,ownerCreatedAt:p.createdAt,
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
 const username=expectedUsername,displayName=publicAccountDisplayName(p,username),rows=Array.isArray(view.originals)?view.originals:[];
 if(rows.length>10_000)throw Error('PROFILE_PAGE_TOO_LARGE');
 const images=publicProfileArtwork(p);
 const items=publicOriginalItems(rows,p,envelope.representation==='collection-v2');
 const stats=object(view.stats),unavailable=Array.isArray(view.unavailableDecorators)&&view.unavailableDecorators.includes('engagement');
 const hash=text(p.authorshipPbiReceiptHash,64);
 const page=object(view.originalsPage),cursor=text(page.nextCursor,4096);
 return {schema:'bankeiz.public-profile.v1',userId:String(p.userId),username,displayName,bookingEnabled:p.showSchedulerButton===true,bio:text(p.bio,280),location:text(p.location,100),websiteUrl:publicProfileLink(p.websiteUrl),avatarUrl:images.avatarUrl,bannerUrl:images.bannerUrl,
  socialLinks:[['X','socialXUrl'],['Instagram','socialInstagramUrl'],['YouTube','socialYoutubeUrl'],['LinkedIn','socialLinkedinUrl'],['GitHub','socialGithubUrl']].flatMap(([label,key])=>{const url=publicProfileLink(p[key]);return url?[{label,url}]:[];}),
  links:Array.isArray(p.links)?p.links.slice(0,20).flatMap(value=>{const link=object(value),label=text(link.label,80),url=publicProfileLink(link.url);return label&&url&&url.length<=2048?[{label,url}]:[];}):[],
  authorshipVerified:p.authorshipVerified===true,pbiReceiptHash:hash&&/^[a-f0-9]{64}$/i.test(hash)?hash:null,createdAt:text(p.createdAt,64),
  stats:{originals:number(stats.originals),views:unavailable?null:number(stats.originalViews),plays:unavailable?null:number(stats.streams),seconds:unavailable?null:number(stats.witnessedSeconds),completion:unavailable?null:number(stats.streamCompletionRatePct)},items,nextCursor:page.hasMore===true&&cursor&&!/[\x00-\x1f\x7f]/.test(cursor)?'all:'+p.userId:null};
}

/** Inline deterministic artwork is already in the document; social crawlers
 * require a public HTTP image rather than a repeated data: payload. */
export function publicProfileSocialImage(profile:Pick<PublicProfile,'bannerUrl'|'avatarUrl'>):string|null {
 return publicProfileLink(profile.bannerUrl)??publicProfileLink(profile.avatarUrl);
}

/** Only this tab's observed public projection is retained, never a private
 * account or persistent owner cache. Refresh refusals remove the old view. */
const held=new Map<string,PublicProfile>();
const refusals=new Map<string,{code:string;userId?:string}>(),privateProfileAccounts=new Set<string>();
let revision=0;
export const publicProfilesRevision=()=>revision;
const catalogProfiles=new WeakMap<PublicProfile,{items:PublicMarketItem[];header:boolean}>();
const selectedCatalogProfiles=new WeakMap<PublicMarketItem[],Map<string,{base:PublicProfile|null;profile:PublicProfile}>>();
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
export function retainPublicProfile(input:PublicProfile){const previous=held.get(input.username),receipt=confirmedProfilePbi.get(input.userId)??(previous?.userId===input.userId?previous.pbiReceiptHash:null),profile=mergeAdmittedProfileAssets(receipt?{...input,authorshipVerified:true,pbiReceiptHash:input.pbiReceiptHash??receipt}:input);for(const [name,previous]of held)if(name!==profile.username&&previous.userId===profile.userId)refusePublicProfile(name,'PROFILE_CHANGED',profile.userId);held.delete(profile.username);held.set(profile.username,profile);const projection=catalogProfiles.get(input);if(projection)catalogProfiles.set(profile,projection);else privateProfileAccounts.delete(profile.userId);if(!projection||!previous||previous.userId!==profile.userId)profileReadEpoch.set(profile.username,(profileReadEpoch.get(profile.username)??0)+1);refusals.delete(profile.username);rememberObservedProfilePortrait(profile);retainRecipientPortrait(profile.username,profile.avatarUrl);if(held.size>24)forgetPublicProfile(held.keys().next().value!);publishProfileMetadata(profile);notifyProfiles();return profile;}
/** Append the confirmed canonical PBI enrollment to held public presentation.
 * No original, membership, pricing or private profile data is replaced. */
export function retainProfilePbiAuthorship(accountUid:string,receiptHash:string){
 if(!/^[a-f0-9]{64}$/.test(receiptHash))throw Error('PROFILE_PBI_RECEIPT_INVALID');
 confirmedProfilePbi.set(accountUid,receiptHash);if(confirmedProfilePbi.size>24)confirmedProfilePbi.delete(confirmedProfilePbi.keys().next().value!);
 for(const profile of [...held.values()])if(profile.userId===accountUid){const signed={...profile,authorshipVerified:true,pbiReceiptHash:receiptHash},basis=catalogProfiles.get(profile);if(basis)catalogProfiles.set(signed,basis);retainPublicProfile(signed);}
}
export function forgetPublicProfile(username:string){forgetObservedProfilePortrait(username);forgetRecipientPortrait(username);forgetAssetPublicationAdmissions(username);held.delete(username);profileReadEpoch.set(username,(profileReadEpoch.get(username)??0)+1);if(typeof document!=='undefined'){const seed=document.getElementById('public-profile-seed');try{if(JSON.parse(seed?.textContent??'null')?.username===username)seed?.remove();}catch{/* Invalid seeds are never adopted. */}}notifyProfiles();}
export function forgetPublicProfilesForAccount(uid:string){confirmedProfilePbi.delete(uid);privateProfileAccounts.add(uid);if(privateProfileAccounts.size>24)privateProfileAccounts.delete(privateProfileAccounts.values().next().value!);for(const [name,profile]of [...held])if(profile.userId===uid)refusePublicProfile(name,'PROFILE_PRIVATE',uid);}
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
 if(previous&&!basis){const incoming=catalog.complete?catalog.items.find(item=>item.category==='proof'&&item.ownerUsername===username)?.ownerIdentity:null;if(!incoming||incoming.userId===previous.userId)return previous;}
 if(previous&&basis?.items===catalog.items)return previous;
 let selections=selectedCatalogProfiles.get(catalog.items);if(!selections){selections=new Map();selectedCatalogProfiles.set(catalog.items,selections);}
 const cached=selections.get(username);if(cached&&(cached.profile===previous||cached.base===previous))return cached.profile;
 const items=catalog.items.filter(item=>item.category==='proof'&&item.ownerUsername===username);
 if(!items.length){
  if(!previous||!basis||!catalog.complete)return previous;
  const profile={...previous,items:[],stats:{...previous.stats,originals:0},nextCursor:null};
  catalogProfiles.set(profile,{items:catalog.items,header:basis.header});selections.set(username,{base:previous,profile});return profile;
 }
 const owner=items[0].ownerIdentity;
 if(new Set(items.flatMap(item=>item.ownerIdentity?[item.ownerIdentity.userId]:[])).size>1)return null;
 if(!owner||owner.username!==username||items.some(item=>!item.ownerIdentity||item.ownerIdentity.username!==username||item.ownerIdentity.userId!==owner.userId||item.ownerIdentity.createdAt!==owner.createdAt))return previous;
 const matching=previous?.userId===owner.userId?previous:null;
 const ordered=items.slice().sort(compareProfileOriginals),header=!!matching&&basis?.header===true;
 const images=header?{avatarUrl:matching!.avatarUrl,bannerUrl:matching!.bannerUrl}:publicProfileArtwork({...owner,avatarUrl:items.find(item=>item.ownerAvatarUrl)?.ownerAvatarUrl});
 const profile:PublicProfile={schema:'bankeiz.public-profile.v1',userId:owner.userId,username,displayName:items[0].ownerDisplayName??username,bio:null,location:null,websiteUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:owner.createdAt,stats:{originals:catalog.complete?ordered.length:null,views:null,plays:null,seconds:null,completion:null},...(matching?{authorshipVerified:matching.authorshipVerified,pbiReceiptHash:matching.pbiReceiptHash}:{}),...(header?matching:{}),...images,items:ordered,nextCursor:catalog.complete?null:'all:'+owner.userId};
 catalogProfiles.set(profile,{items:catalog.items,header});selections.set(username,{base:previous,profile});return profile;
}
function refusePublicProfile(username:string,code:string,expectedUserId?:string){
 const current=held.get(username);if(expectedUserId&&current?.userId!==expectedUserId)return;
 forgetPublicProfile(username);refusals.set(username,{code,...(expectedUserId??current?.userId?{userId:expectedUserId??current!.userId}:{})});if(refusals.size>24)refusals.delete(refusals.keys().next().value!);notifyProfiles();
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
  const basis=catalogProfiles.get(current);if(basis)catalogProfiles.set(enriched,{...basis,header:true});return retainPublicProfile(enriched);
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
  acceptDiscoveredProfileAssets(value);if(!cursor)return retainPublicProfile(value);return mergeAdmittedProfileAssets(value);
 })();reads.set(key,attempt);void attempt.finally(()=>{if(reads.get(key)===attempt)reads.delete(key);}).catch(()=>{});return attempt;
}
