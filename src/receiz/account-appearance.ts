import {profileAvatarUrl} from './profile-avatar.js';
/** Public portrait presentation only. This never opens an ID or grants access. */
export interface AccountAppearance {avatarUrl:string|null;name:string;accountUid?:string;identityKeyId?:string}
const KEY='bankeiz.account-appearance.v1';
function initial():AccountAppearance|null{try{const value=JSON.parse(localStorage.getItem(KEY)??'null');return value&&typeof value.name==='string'&&value.name.length<=80?{name:value.name,avatarUrl:profileAvatarUrl(value.avatarUrl),...(typeof value.accountUid==='string'&&value.accountUid.length>0&&value.accountUid.length<=256?{accountUid:value.accountUid}:{}),...(typeof value.identityKeyId==='string'&&/^[a-f0-9]{64}$/.test(value.identityKeyId)?{identityKeyId:value.identityKeyId}:{})}:null;}catch{return null;}}
let appearance=initial();const listeners=new Set<()=>void>();
export const readAccountAppearance=()=>appearance;
export const subscribeAccountAppearance=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function publishAccountAppearance(value:AccountAppearance|null){
 if(value?.name===appearance?.name&&value?.avatarUrl===appearance?.avatarUrl&&value?.accountUid===appearance?.accountUid&&value?.identityKeyId===appearance?.identityKeyId)return;
 appearance=value;
 // Complete public SVG seals use the same bounded image size as profileAvatarUrl.
 try{if(value&&(!value.avatarUrl||value.avatarUrl.length<=256*1024))localStorage.setItem(KEY,JSON.stringify(value));else localStorage.removeItem(KEY);}catch{/* Optional public presentation hint. */}
 for(const listener of listeners)listener();
}
