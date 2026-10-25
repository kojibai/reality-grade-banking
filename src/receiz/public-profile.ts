import {mergeAdmittedProfileAssets,forgetAssetPublicationAdmissions,acceptDiscoveredProfileAssets} from './asset-publication-adoption.js';
import {parsePublicMarket,type PublicMarketItem} from './public-market.js';
import {profileAvatarUrl} from './profile-avatar.js';
import {retainRecipientPortrait,forgetRecipientPortrait} from './recipient-portrait.js';

const names=/^[a-z0-9_]{3,24}$/;
const reserved=new Set(['together','cooperate','protect','vaults','fit','coops','cooperatives','business','pay','api','asset','assets','auth','conformance','explore','explorer','learn','legal','ledger','market','market-cap','native','offline','receipt','source','verify','u']);
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
 stats:{originals:number|null;views:number|null;plays:number|null;seconds:number|null;completion:number|null};
 items:PublicMarketItem[];nextCursor:string|null;
}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
export function publicProfileLink(v:unknown){const raw=text(v,8192);if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
/** Public presentation projection only. A handle and these fields confer no
 * identity, ownership, write authority or device qualification. */
export function parsePublicProfile(input:unknown,expectedUsername:string):PublicProfile{
 const envelope=object(input),view=object(envelope.profile),p=object(view.profile),viewer=object(view.viewer);
 if(envelope.ok!==true||!text(p.userId,256)||p.username!==expectedUsername||!profileUsername(p.username))throw Error('PROFILE_IDENTITY_MISMATCH');
 if(p.isPrivate!==false||viewer.canView!==true)throw Error('PROFILE_PRIVATE');
 const username=expectedUsername,displayName=text(p.displayName,80)??username,rows=Array.isArray(view.originals)?view.originals:[];
 if(rows.length>10_000)throw Error('PROFILE_PAGE_TOO_LARGE');
 const originals=rows.filter(row=>object(row).showOnProfile===true).map(value=>{
  const row=object(value),market=object(row.marketPreview),media=row.media===null?null:object(row.media),id=text(row.id,128),long=object(row.longForm);
  if(envelope.representation==='collection-v2'&&typeof row.hasLongForm!=='boolean')throw Error('PROFILE_COLLECTION_READER_METADATA_INVALID');
  return {id:`profile:${username}:${id}`,receizId:id,title:text(row.claim,8192)??text(long.title,500)??'Original',summary:text(row.claim,8192)??'',ownerUsername:username,ownerDisplayName:displayName,
   canonicalHref:`https://receiz.com/${username}/verified/${encodeURIComponent(id??'')}`,verifyHref:row.verifyUrl??row.verifyPath,pulse:row.pulse,createdAt:row.createdAt,valueUsd:market.priceUsd,livePulseSeed:market.livePulseSeed,
   profileOriginal:{...row,media,hasLongForm:envelope.representation==='collection-v2'?row.hasLongForm:Boolean(long.text),longForm:row.longForm}};
 });
 const items=parsePublicMarket({ok:true,transport:{publicOriginals:originals}}).items.map(item=>({...item,ownerAvatarUrl:profileAvatarUrl(p.avatarUrl)}));
 const stats=object(view.stats),unavailable=Array.isArray(view.unavailableDecorators)&&view.unavailableDecorators.includes('engagement');
 const hash=text(p.authorshipPbiReceiptHash,64);
 const page=object(view.originalsPage),cursor=text(page.nextCursor,4096);
 return {schema:'bankeiz.public-profile.v1',userId:String(p.userId),username,displayName,bio:text(p.bio,280),location:text(p.location,100),websiteUrl:publicProfileLink(p.websiteUrl),avatarUrl:profileAvatarUrl(p.avatarUrl),bannerUrl:profileAvatarUrl(p.bannerUrl),
  socialLinks:[['X','socialXUrl'],['Instagram','socialInstagramUrl'],['YouTube','socialYoutubeUrl'],['LinkedIn','socialLinkedinUrl'],['GitHub','socialGithubUrl']].flatMap(([label,key])=>{const url=publicProfileLink(p[key]);return url?[{label,url}]:[];}),
  links:Array.isArray(p.links)?p.links.slice(0,20).flatMap(value=>{const link=object(value),label=text(link.label,80),url=publicProfileLink(link.url);return label&&url&&url.length<=2048?[{label,url}]:[];}):[],
  authorshipVerified:p.authorshipVerified===true,pbiReceiptHash:hash&&/^[a-f0-9]{64}$/i.test(hash)?hash:null,createdAt:text(p.createdAt,64),
  stats:{originals:number(stats.originals),views:unavailable?null:number(stats.originalViews),plays:unavailable?null:number(stats.streams),seconds:unavailable?null:number(stats.witnessedSeconds),completion:unavailable?null:number(stats.streamCompletionRatePct)},items,nextCursor:page.hasMore===true&&cursor&&!/[\x00-\x1f\x7f]/.test(cursor)?'all:'+p.userId:null};
}

/** Only this tab's observed public projection is retained, never a private
 * account or persistent owner cache. Refresh refusals remove the old view. */
const held=new Map<string,PublicProfile>(),observed=new Map<string,number>();
const listeners=new Set<()=>void>();
export const subscribePublicProfiles=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function retainPublicProfile(input:PublicProfile){const profile=mergeAdmittedProfileAssets(input);for(const [name,previous]of held)if(name!==profile.username&&previous.userId===profile.userId)forgetPublicProfile(name);held.delete(profile.username);held.set(profile.username,profile);observed.set(profile.username,Date.now());retainRecipientPortrait(profile.username,profile.avatarUrl);if(held.size>24)forgetPublicProfile(held.keys().next().value!);if(typeof dispatchEvent==='function')dispatchEvent(new CustomEvent('bankeiz:profile-metadata',{detail:{username:profile.username,title:profile.displayName,description:profile.bio,image:profile.bannerUrl??profile.avatarUrl}}));for(const listener of listeners)listener();return profile;}
/** Append the confirmed canonical PBI enrollment to held public presentation.
 * No original, membership, pricing or private profile data is replaced. */
export function retainProfilePbiAuthorship(accountUid:string,receiptHash:string){
 if(!/^[a-f0-9]{64}$/.test(receiptHash))throw Error('PROFILE_PBI_RECEIPT_INVALID');
 for(const profile of [...held.values()])if(profile.userId===accountUid)retainPublicProfile({...profile,authorshipVerified:true,pbiReceiptHash:receiptHash});
}
export function forgetPublicProfile(username:string){forgetRecipientPortrait(username);forgetAssetPublicationAdmissions(username);held.delete(username);observed.delete(username);if(typeof document!=='undefined'){const seed=document.getElementById('public-profile-seed');try{if(JSON.parse(seed?.textContent??'null')?.username===username)seed?.remove();}catch{/* Invalid seeds are never adopted. */}}for(const listener of listeners)listener();}
export function forgetPublicProfilesForAccount(uid:string){for(const [name,profile]of held)if(profile.userId===uid)forgetPublicProfile(name);}
export const publicProfileNeedsRefresh=(username:string)=>Date.now()-(observed.get(username)??0)>15_000;
export function publicProfilePageError(username:string):string{
 if(typeof document==='undefined')return '';try{const value=JSON.parse(document.getElementById('public-profile-error')?.textContent??'null');return value?.username===username&&Date.now()-value.at<15_000&&['PROFILE_PRIVATE','PROFILE_NOT_FOUND','PROFILE_UNAVAILABLE'].includes(value.code)?value.code:'';}catch{return '';}
}
export function retainedPublicProfile(username:string):PublicProfile|null{
 const previous=held.get(username);if(previous)return previous;
 if(typeof document==='undefined')return null;
 try{const value=JSON.parse(document.getElementById('public-profile-seed')?.textContent??'null');if(value?.schema==='bankeiz.public-profile.v1'&&value.username===username&&typeof value.userId==='string'&&Array.isArray(value.items)){retainPublicProfile(value);return value;}}catch{/* No carried public page. */}return null;
}
const reads=new Map<string,Promise<PublicProfile>>();
export function fetchPublicProfile(username:string,cursor?:string,priority:RequestPriority='auto'):Promise<PublicProfile>{
 if(!profileUsername(username))return Promise.reject(Error('PROFILE_USERNAME_INVALID'));
 const key=username+':'+(cursor??'');const pending=reads.get(key);if(pending)return pending;
 const attempt=(async()=>{const response=await fetch(`/api/bank/public-profile/${username}${cursor?'?cursor='+encodeURIComponent(cursor):''}`,{credentials:'omit',redirect:'error',cache:'no-store',priority,signal:AbortSignal.timeout(30_000)});
  if(!response.ok){if(response.status===403||response.status===404||response.status===409)forgetPublicProfile(username);throw Error(response.status===403?'PROFILE_PRIVATE':response.status===404?'PROFILE_NOT_FOUND':response.status===409?'PROFILE_CHANGED':'PROFILE_UNAVAILABLE');}
  const value=await response.json() as PublicProfile;if(value.schema!=='bankeiz.public-profile.v1'||value.username!==username||typeof value.userId!=='string'||!Array.isArray(value.items)||value.items.length>10_000)throw Error('PROFILE_RESPONSE_INVALID');
  acceptDiscoveredProfileAssets(value);if(!cursor)return retainPublicProfile(value);return mergeAdmittedProfileAssets(value);
 })();reads.set(key,attempt);void attempt.finally(()=>{if(reads.get(key)===attempt)reads.delete(key);}).catch(()=>{});return attempt;
}
/** Reuse the eventual profile read without speculatively downloading its
 * offscreen banner and covers. The selected asset already carries its images. */
export async function preparePublicProfile(username:string){
 const current=retainedPublicProfile(username);return current&&!publicProfileNeedsRefresh(username)?current:fetchPublicProfile(username,undefined,'low');
}
