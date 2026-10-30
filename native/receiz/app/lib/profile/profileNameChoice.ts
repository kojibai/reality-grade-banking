import {projectReceizAccountDisplayName} from '../../../packages/receiz-sdk/src/accountDisplayName.js';
import {resolveProfileIdentityCreationKaiMicroPulse} from './profileIdentityCreationCoordinate.js';
export type ProfileNameChoice=Readonly<{chosenUsername:string|null;customDisplayName:boolean}>;
type NameRow=Readonly<{username?:string|null;display_name?:string|null;created_at?:string|null;creation_kai_upulse?:string|number|null;creation_kai_source?:string|null}>;
// Display-only derivatives of already admitted profile objects. This does not
// admit an account, change its raw fields, or confer identity/ownership rights.
const key=Symbol.for('receiz.profile.name-presentation.v1');
const scope=globalThis as typeof globalThis & {[key]?:WeakMap<object,ProfileNameChoice>};
const choices=scope[key]??(scope[key]=new WeakMap<object,ProfileNameChoice>());
export const profileNameChoice=(row:object):ProfileNameChoice|undefined=>choices.get(row);
/** Called only after the enclosing history has passed its existing verifier. */
export function retainProfileNameChoice(row:object,choice:ProfileNameChoice):void {choices.set(row,Object.freeze({...choice}));}
export function initialProfileNameChoice(row:NameRow,acceptedCreation=false):ProfileNameChoice {
 const saved=row.display_name?.trim()??'';
 const pulse=acceptedCreation?resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:row.created_at,persistedMicroPulse:row.creation_kai_upulse==null?null:String(row.creation_kai_upulse),persistedSource:row.creation_kai_source}):null;
 const generated=acceptedCreation&&pulse!==null&&saved===projectReceizAccountDisplayName({creationKaiMicroPulse:pulse});
 return Object.freeze({chosenUsername:null,customDisplayName:!!saved&&saved!=='Receiz ID'&&!generated});
}
/** Only an admitted editable-profile command proves an explicit choice. */
export function advanceProfileNameChoice(current:ProfileNameChoice,patch:Readonly<{username?:string;display_name?:string|null}>):ProfileNameChoice {
 return Object.freeze({chosenUsername:patch.username??current.chosenUsername,customDisplayName:patch.display_name===undefined?current.customDisplayName:!!patch.display_name&&patch.display_name!=='Receiz ID'});
}
