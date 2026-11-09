import {publicProfileUsername} from '../../native/receiz/app/lib/profile/receivingUsername.js';
export {publicProfileUsername};
import {projectReceizAccountDisplayName} from '../../native/receiz/packages/receiz-sdk/src/accountDisplayName.js';
export {projectReceizAccountDisplayName};
import {publicProfileDisplayName} from '../../native/receiz/app/lib/profile/displayName.js';
/** Preserve Native's original-account resolver and the complete username
 * selected as a display name. This adapter changes no carried coordinates. */
export function publicAccountDisplayName(profile:Readonly<Record<string,unknown>>,fallback?:string):string{
 const username=typeof profile.username==='string'?profile.username:'';
 const receiving=typeof profile.receivingUsername==='string'?profile.receivingUsername:undefined;
 if(profile.displayNameSource==='username'&&username)return profileUsernameLabel(username,receiving)||'Receiz ID';
 const name=publicProfileDisplayName(profile,fallback);
 return /^receiz_[a-z0-9]{17}$/.test(name)?profileUsernameLabel(name,receiving)||'Receiz ID':name;
}

/** The visible handle matches the canonical username used by its links. */
export function profileUsernameLabel(username:string|null|undefined,receivingUsername?:string|null):string {
 const name=publicProfileUsername(username??'',receivingUsername);
 // An old lookup name lacks a character. If the same owner's full name
 // isn't carried, omit the handle instead of guessing or showing it cut off.
 return /^receiz_[a-z0-9]{17}$/.test(name)?'':name;
}

/** Contacts already carry the exact receiving name when it is known. */
export function publicContactDisplayName(contact:Readonly<{displayName?:string|null;username?:string|null;receivingUsername?:string|null}>):string {
 const displayName=contact.displayName;
 if(displayName&&!/^receiz_[a-z0-9]{17,18}$/.test(displayName))return displayName;
 return profileUsernameLabel(contact.username,contact.receivingUsername)||'Receiz account';
}
