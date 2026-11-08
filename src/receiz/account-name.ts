import {publicProfileUsername} from '../../native/receiz/app/lib/profile/receivingUsername.js';
export {publicProfileUsername};
import {projectReceizAccountDisplayName} from '../../native/receiz/packages/receiz-sdk/src/accountDisplayName.js';
export {projectReceizAccountDisplayName};
import {publicProfileDisplayName} from '../../native/receiz/app/lib/profile/displayName.js';
/** Preserve Native's original-account resolver and the complete username
 * selected as a display name. This adapter changes no carried coordinates. */
export function publicAccountDisplayName(profile:Readonly<Record<string,unknown>>,fallback?:string):string{
 if(profile.displayNameSource==='username'&&typeof profile.username==='string'&&profile.username)return publicProfileUsername(profile.username,typeof profile.receivingUsername==='string'?profile.receivingUsername:undefined);
 return publicProfileDisplayName(profile,fallback);
}

/** The visible handle matches the canonical username used by its links. */
export const profileUsernameLabel=(username:string|null|undefined,receivingUsername?:string|null):string=>publicProfileUsername(username??'',receivingUsername);
