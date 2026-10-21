import {publicProfileLink,profileUsername,type PublicProfile} from './public-profile';
import {profileAvatarUrl} from './profile-avatar';
export type ProfileLink={label:string;url:string};
export type ProfilePatch=Partial<Record<'displayName'|'bio'|'location'|'websiteUrl'|'socialXUrl'|'socialInstagramUrl'|'socialYoutubeUrl'|'socialLinkedinUrl'|'socialGithubUrl'|'avatarUrl'|'bannerUrl',string|null>>&{username?:string;links?:ProfileLink[]};
export type ProfileUpdate={accountUid:string;profilePath:string;profile:Readonly<Record<string,unknown>>};
export type OwnerProfilePresentation={userId:string;username:string;displayName:string;avatarUrl:string|null};
export interface ProfileEditor {update(input:ProfilePatch):Promise<ProfileUpdate>;availability(username:string):Promise<{available:boolean;isCurrent?:boolean;suggestions?:readonly string[]}>;uploadImage?(file:File,kind:'avatar'|'banner'):Promise<ProfileUpdate>;}
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Minimal confirmed owner-only metadata, including private accounts. Never
 * write this projection to the anonymous profile cache. */
export function ownerProfilePresentation(result:ProfileUpdate):OwnerProfilePresentation{
 const profile=object(result.profile.profile),username=profileUsername(profile.username);
 if(profile.userId!==result.accountUid||!username)throw Error('PROFILE_ACCOUNT_MISMATCH');
 return {userId:result.accountUid,username,displayName:typeof profile.displayName==='string'?profile.displayName:username,avatarUrl:profileAvatarUrl(profile.avatarUrl)};
}
export function createProfileEditor(deps:{accountUid:string;current():boolean;update(input:ProfilePatch):Promise<ProfileUpdate>;uploadImage?:ProfileEditor['uploadImage'];availability:ProfileEditor['availability'];publish(result:ProfileUpdate):void}):ProfileEditor{
 const assert=()=>{if(!deps.current())throw Error('PROFILE_ACCOUNT_CLOSED');};
 return {availability:async username=>{assert();if(!profileUsername(username))return {available:false,suggestions:[]};const result=await deps.availability(username);assert();return result;},
 ...(deps.uploadImage?{uploadImage:async(file:File,kind:'avatar'|'banner')=>{assert();if(!['avatar','banner'].includes(kind)||!file.type.startsWith('image/')||file.size<=0||file.size>3_500_000)throw Error('PROFILE_IMAGE_INVALID');const result=await deps.uploadImage!(file,kind);assert();const profile=object(result.profile.profile);if(result.accountUid!==deps.accountUid||profile.userId!==deps.accountUid)throw Error('PROFILE_ACCOUNT_MISMATCH');if(!profileUsername(profile.username)||result.profilePath!==`/${profile.username}`||!profileAvatarUrl(profile[kind==='avatar'?'avatarUrl':'bannerUrl']))throw Error('PROFILE_UPDATE_UNCONFIRMED');deps.publish(result);return result;}}:{}),
 async update(input){
  assert();const patch:ProfilePatch={},limits:Record<string,number>={username:24,displayName:80,bio:280,location:100,websiteUrl:240,socialXUrl:240,socialInstagramUrl:240,socialYoutubeUrl:240,socialLinkedinUrl:240,socialGithubUrl:240,avatarUrl:240,bannerUrl:240};
  for(const [key,value]of Object.entries(input)){
   if(key==='links'){
    if(!Array.isArray(value)||value.length>20)throw Error('PROFILE_LINKS_INVALID');
    patch.links=value.map(link=>{if(!link||typeof link.label!=='string'||!link.label.trim()||link.label.length>80||typeof link.url!=='string'||link.url.length>2048||!publicProfileLink(link.url))throw Error('PROFILE_LINK_INVALID');return {label:link.label.trim(),url:new URL(link.url).href};});continue;
   }
   if(!Object.hasOwn(limits,key)||value!==null&&typeof value!=='string'||typeof value==='string'&&value.length>limits[key])throw Error('PROFILE_FIELD_INVALID');
   if(key==='username'&&!profileUsername(value))throw Error('PROFILE_USERNAME_INVALID');
   if(key.endsWith('Url')&&value&&!publicProfileLink(value))throw Error('PROFILE_LINK_INVALID');
   Object.assign(patch,{[key]:typeof value==='string'?value.trim()||null:value});
  }
  const result=await deps.update(patch);assert();if(result.accountUid!==deps.accountUid)throw Error('PROFILE_ACCOUNT_MISMATCH');
  const profile=object(result.profile.profile);if(profile.userId!==undefined&&profile.userId!==deps.accountUid)throw Error('PROFILE_ACCOUNT_MISMATCH');
  for(const [key,value]of Object.entries(patch))if(key==='links'?JSON.stringify(profile.links)!==JSON.stringify(value):key==='displayName'&&value===null?profile.displayName!==null&&profile.displayName!==profile.username:(key==='avatarUrl'||key==='bannerUrl')&&value?profileAvatarUrl(profile[key])!==profileAvatarUrl(value):key.endsWith('Url')&&value?publicProfileLink(profile[key])!==publicProfileLink(value):profile[key]!==value)throw Error('PROFILE_UPDATE_UNCONFIRMED');
  if(!profileUsername(profile.username)||result.profilePath!==`/${profile.username}`)throw Error('PROFILE_UPDATE_UNCONFIRMED');
  deps.publish(result);return result;
 }};
}
export function ownerProfileMatches(profile:PublicProfile,accountUid:string|null){return !!accountUid&&profile.userId===accountUid;}

/** The existing upload pipeline returns the saved profile and minted image in
 * one response. Bind both to this exact account and requested image field. */
export function readProfileImageUpdate(input:unknown,uid:string,kind:'avatar'|'banner'):ProfileUpdate{
 const value=object(input),view=object(value.profile),profile=object(view.profile),upload=object(value.upload),url=profileAvatarUrl(upload.imageUrl);
 if(value.ok!==true||value.accountUid!==uid||profile.userId!==uid)throw Error('PROFILE_ACCOUNT_MISMATCH');
 if(!profileUsername(profile.username)||value.profilePath!==`/${profile.username}`||upload.kind!==kind||!url||url!==profileAvatarUrl(profile[kind==='avatar'?'avatarUrl':'bannerUrl']))throw Error('PROFILE_UPDATE_UNCONFIRMED');
 return {accountUid:uid,profilePath:String(value.profilePath),profile:view};
}
