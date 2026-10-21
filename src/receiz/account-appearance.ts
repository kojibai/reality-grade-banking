import {profileAvatarUrl} from './profile-avatar';
/** Public portrait presentation only. This never opens an ID or grants access. */
export interface AccountAppearance {avatarUrl:string|null;name:string}
const KEY='bankeiz.account-appearance.v1';
function initial():AccountAppearance|null{try{const value=JSON.parse(localStorage.getItem(KEY)??'null');return value&&typeof value.name==='string'&&value.name.length<=80?{name:value.name,avatarUrl:profileAvatarUrl(value.avatarUrl)}:null;}catch{return null;}}
let appearance=initial();const listeners=new Set<()=>void>();
export const readAccountAppearance=()=>appearance;
export const subscribeAccountAppearance=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function publishAccountAppearance(value:AccountAppearance|null){
 if(value?.name===appearance?.name&&value?.avatarUrl===appearance?.avatarUrl)return;
 appearance=value;
 try{if(value&&(!value.avatarUrl||value.avatarUrl.length<=8192))localStorage.setItem(KEY,JSON.stringify(value));else localStorage.removeItem(KEY);}catch{/* Optional public presentation hint. */}
 for(const listener of listeners)listener();
}
