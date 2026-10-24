import {profileAvatarUrl} from './profile-avatar.js';
type Portrait={username:string;avatarUrl:string|null};
const key=(username:string)=>`bankeiz:public-recipient-portrait:${username}`;
const name=(username:string)=>/^[a-z0-9_]{3,24}$/.test(username);
/** Short-lived public presentation only. Never resolves a payment recipient
 * or provides identity/ownership authority. Survives profile -> pay navigation. */
export function retainedRecipientPortrait(username:string):Portrait|undefined{
 if(!name(username))return;
 try{const value=JSON.parse(sessionStorage.getItem(key(username))??'null');if(value?.username===username&&typeof value.at==='number'&&Date.now()-value.at>=0&&Date.now()-value.at<60_000&&(value.avatarUrl===null||profileAvatarUrl(value.avatarUrl)===value.avatarUrl))return{username,avatarUrl:value.avatarUrl};}catch{/* Optional public presentation. */}
}
export function retainRecipientPortrait(username:string,avatar:unknown):Portrait{
 const value={username,avatarUrl:profileAvatarUrl(avatar)};
 if(name(username))try{sessionStorage.setItem(key(username),JSON.stringify({...value,at:Date.now()}));}catch{/* Payment never depends on presentation storage. */}
 return value;
}
export function forgetRecipientPortrait(username:string){try{sessionStorage.removeItem(key(username));}catch{/* Optional public presentation. */}}
export async function fetchRecipientPortrait(username:string,signal:AbortSignal):Promise<Portrait>{
 if(!name(username))throw Error('RECIPIENT_PORTRAIT_INVALID');
 const response=await fetch(`/api/bank/public-profile/${username}?view=portrait`,{credentials:'omit',redirect:'error',signal,priority:'low'});
 if(!response.ok)throw Error('RECIPIENT_PORTRAIT_UNAVAILABLE');
 const value=await response.json();if(value?.username!==username||value.avatarUrl!==null&&profileAvatarUrl(value.avatarUrl)!==value.avatarUrl)throw Error('RECIPIENT_PORTRAIT_INVALID');
 return retainRecipientPortrait(username,value.avatarUrl);
}
