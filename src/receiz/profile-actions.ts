import type {PublicProfile} from './public-profile';
import {requestBankNavigation} from '../core/bank-navigation';
type AccountAction={id:number;kind:'send'|'messages';profile:PublicProfile};
export type ProfileEditRequest={id:number;profile:PublicProfile;slot:HTMLElement|null};
let owner:string|null=null,edit:ProfileEditRequest|null=null,action:AccountAction|null=null,sequence=0;
const listeners=new Set<()=>void>();const notify=()=>listeners.forEach(fn=>fn());
export const subscribeProfileActions=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const readProfileOwner=()=>owner;
export function publishProfileOwner(uid:string|null){if(owner!==uid){owner=uid;if(edit?.profile.userId!==uid)edit=null;notify();}}
export const readProfileEdit=()=>edit;
export function beginProfileEdit(profile:PublicProfile){if(profile.userId!==owner)return;edit={id:++sequence,profile,slot:null};notify();}
export function closeProfileEdit(id=edit?.id){if(edit?.id===id){edit=null;notify();}}
export function attachProfileEdit(id:number,slot:HTMLElement|null){if(edit?.id===id&&edit.slot!==slot){edit={...edit,slot};notify();}}
export function beginProfileAccountAction(kind:AccountAction['kind'],profile:PublicProfile){action={id:++sequence,kind,profile};notify();requestBankNavigation(`#account/${kind}`);}
export const readProfileAccountAction=()=>action;
export function consumeProfileAccountAction(id:number){if(action?.id===id){action=null;notify();}}
