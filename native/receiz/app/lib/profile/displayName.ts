import {profileNameChoice,type ProfileNameChoice} from './profileNameChoice.js';
import {projectReceizAccountDisplayName} from "../../../packages/receiz-sdk/src/accountDisplayName.js";
import {resolveProfileIdentityCreationKaiMicroPulse} from './profileIdentityCreationCoordinate.js';
import {profileUsernameLabel} from './usernameLabel.js';
export {profileUsernameLabel};

/** Current name projection beneath the unchanged admitted ProfileRow. */
export function profileDisplayName(row:Readonly<{display_name?:string|null;username?:string|null;created_at?:string|null;creation_kai_upulse?:string|number|null;creation_kai_source?:string|null}>,admittedChoice?:ProfileNameChoice):string {
 const saved=row.display_name?.trim(),choice=admittedChoice??profileNameChoice(row);
 if(saved&&saved!=='Receiz ID'&&choice?.customDisplayName!==false)return saved;
 return projectReceizAccountDisplayName({displayName:choice?.customDisplayName===false?null:saved,chosenUsername:choice?.chosenUsername===row.username&&row.username?profileUsernameLabel(row.username):null,creationKaiMicroPulse:resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:row.created_at,persistedMicroPulse:row.creation_kai_upulse==null?null:String(row.creation_kai_upulse),persistedSource:row.creation_kai_source}),fallback:row.username??undefined});
}

/** Camel-case public/held profiles share the exact original-account resolver. */
export function publicProfileDisplayName(profile:Readonly<Record<string,unknown>>,fallback?:string):string {
 const choice=profile.displayNameSource==='username'&&typeof profile.username==='string'?{chosenUsername:profile.username,customDisplayName:false}:profile.displayNameSource==='creation-pulse'?{chosenUsername:null,customDisplayName:false}:undefined;
 return profileDisplayName({display_name:typeof profile.displayName==='string'?profile.displayName:null,username:typeof profile.username==='string'?profile.username:fallback??null,created_at:typeof profile.createdAt==='string'?profile.createdAt:null,creation_kai_upulse:typeof profile.creationKaiMicroPulse==='string'||typeof profile.creationKaiMicroPulse==='number'?profile.creationKaiMicroPulse:null,creation_kai_source:typeof profile.creationKaiSource==='string'?profile.creationKaiSource:null},choice);
}

/** Descriptive name origin only; no identity, ownership or admission authority. */
export function profileDisplayNameSource(row:Readonly<{username?:string|null}>):'custom'|'username'|'creation-pulse'|undefined {
 const choice=profileNameChoice(row);
 return !choice?undefined:choice.customDisplayName?'custom':choice.chosenUsername!==null&&choice.chosenUsername===row.username?'username':'creation-pulse';
}
