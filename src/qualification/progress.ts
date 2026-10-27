import {parseOriginalsObservation,type OriginalsObservation} from './observation';
export {parseOriginalsObservation,type OriginalsObservation} from './observation';
// Per-open-account observations are subordinate to source proof, not admission
// records. No localStorage flag can turn an observation into qualification.
const held=new Map<string,OriginalsObservation>();
export const knownOriginalsProgress=(uid:string)=>held.get(uid)??null;
export function createOriginalsProgressReader(accountUid:string,request:()=>Promise<unknown>,current:()=>boolean=()=>true,initial:OriginalsObservation|null=null){
 let observation=initial;
 return {known:()=>observation,async read(){
  if(!current())throw Error('QUALIFICATION_ACCOUNT_CLOSED');
  const next=parseOriginalsObservation(await request(),accountUid);
  if(!current())throw Error('QUALIFICATION_ACCOUNT_CLOSED');
  if(observation&&(observation.membershipComplete&&!next.membershipComplete||observation.witnessComplete&&!next.witnessComplete))throw Error('The new progress source is incomplete. Your complete prior observation is preserved.');
  observation=next;return next;
 }};
}
export async function readOriginalsProgress(uid:string,username:string,current:()=>boolean){
 const reader=createOriginalsProgressReader(uid,async()=>{
  const response=await fetch(`/api/bank/originals-qualification/${encodeURIComponent(username)}`,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw Error('Your progress source is unavailable. Your Originals and any held progress are preserved.');
  return response.json();
 },current,knownOriginalsProgress(uid));
 const result=await reader.read();held.set(uid,result);return result;
}
