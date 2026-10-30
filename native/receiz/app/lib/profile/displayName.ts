import {projectReceizAccountDisplayName} from "../../../packages/receiz-sdk/src/accountDisplayName.js";
import {resolveProfileIdentityCreationKaiMicroPulse} from './profileIdentityCreationCoordinate.js';
/** Current name projection beneath the unchanged admitted ProfileRow. */
export function profileDisplayName(row:Readonly<{display_name?:string|null;username?:string|null;created_at?:string|null;creation_kai_upulse?:string|number|null;creation_kai_source?:string|null}>):string {
 const saved=row.display_name?.trim();
 if(saved&&saved!=='Receiz ID')return saved;
 return projectReceizAccountDisplayName({displayName:saved,creationKaiMicroPulse:resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:row.created_at,persistedMicroPulse:row.creation_kai_upulse==null?null:String(row.creation_kai_upulse),persistedSource:row.creation_kai_source}),fallback:row.username??undefined});
}

/** Camel-case public/held profiles share the exact original-account resolver. */
export function publicProfileDisplayName(profile:Readonly<Record<string,unknown>>,fallback?:string):string {
 return profileDisplayName({display_name:typeof profile.displayName==='string'?profile.displayName:null,username:typeof profile.username==='string'?profile.username:fallback??null,created_at:typeof profile.createdAt==='string'?profile.createdAt:null,creation_kai_upulse:typeof profile.creationKaiMicroPulse==='string'||typeof profile.creationKaiMicroPulse==='number'?profile.creationKaiMicroPulse:null,creation_kai_source:typeof profile.creationKaiSource==='string'?profile.creationKaiSource:null});
}
