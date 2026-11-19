import type {OpenIdentity} from './native-identity';
import {readProfileOwner} from './profile-actions';

let held:{uid:string;identity:OpenIdentity}|null=null;

export function registerProfileGovernanceIdentity(uid:string,identity:OpenIdentity){
  const entry={uid,identity};
  held=entry;
  return ()=>{if(held===entry)held=null;};
}

export function readProfileGovernanceOwner(){
  return held?.uid===readProfileOwner()?held:null;
}

export function profileGovernanceIdentity(uid:string){
  const owner=readProfileGovernanceOwner();
  return owner?.uid===uid?owner.identity:null;
}
