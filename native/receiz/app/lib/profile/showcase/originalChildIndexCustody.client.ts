"use client";
import {rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,verifyReceizArtifactAdmission} from '../../../../packages/receiz-sdk/src/artifactAdmission';
import {deriveReceizProfileShowcasePersistentMembershipV114,type ReceizProfileShowcasePersistentStateIOV114,type ReceizProfileShowcasePersistentStateV114} from '../../../../packages/receiz-sdk/src/profileShowcasePersistentState';
import {verifyReceizProfileShowcaseBoundedSuccessorV114} from '../../../../packages/receiz-sdk/src/compositeProofTransport';
import {extractReceizPortableAssetPayload} from '../../../../packages/receiz-sdk/src/portableAsset';
import type {ReceizVerifiedArtifactAdmission,ReceizVerifiedProfileShowcaseAdmission} from '../../../../packages/receiz-sdk/src/index';
import {COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,decodeCompleteLegacyShowcaseMigrationPayload} from './legacyMigrationPayload';
import {decodeProfileOriginalRouteProjectionAppend} from './routeProjectionEncoding';
import {originalHasSignedArtifactState,profileOriginalProofIdentityKey} from '../pbiSignatureHistory';
import type {ProfileShowcaseChildReference} from './types';
import type {ProfileOriginal} from '../types';
const STORE='bounded-original-child-index';
type Child=Readonly<{reference:ProfileShowcaseChildReference;admittedArtifact:ReceizVerifiedArtifactAdmission}>;
type Carrier=Awaited<ReturnType<typeof rederiveReceizBoundedProfileShowcaseCarrierFromAdmission>>;
type Coverage=Readonly<{indexKey:string;schema:'receiz.original-child-index-coverage.v1';artifactId:string;artifactDigest:string;ownerReceizId:string;profileIdentity:string;operationCount:number;currentStateRoot:string;placementRoot:string;orderRoot:string}>;
type Fact=Readonly<{indexKey:string;schema:'receiz.original-child-index-fact.v1';artifactId:string;originalId:string;proofIdentity:string;reference:ProfileShowcaseChildReference;kind:'literal'|'migration';signed:boolean;membershipOperationCount:number}>;
export type OriginalChildIndexLookup=Readonly<{status:'present';reference:ProfileShowcaseChildReference;originalId:string;kind:'literal'|'migration'}>|Readonly<{status:'absent'|'unknown'}>;
const carriers=new WeakMap<object,Promise<Carrier>>();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const refKey=(r:ProfileShowcaseChildReference)=>JSON.stringify([r.stableChildArtifactId,r.immutableVersion,r.childArtifactDigest,r.admissionEvidenceRoot,r.contentDigest]);
const prefix=(id:string)=>id+'\u0000custody:';
const markerKey=(id:string)=>prefix(id)+'head';
const idKey=(id:string,value:string)=>prefix(id)+'id:'+JSON.stringify(value);
const proofKey=(id:string,value:string)=>prefix(id)+'proof:'+JSON.stringify(value);
function invalid():never{throw TypeError('PROFILE_SHOWCASE_ORIGINAL_CHILD_INDEX_CUSTODY_REQUIRED');}
function request<T>(value:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error);});}
function complete(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('PROFILE_SHOWCASE_ORIGINAL_CHILD_INDEX_WRITE_ABORTED'));tx.onerror=()=>reject(tx.error);});}
async function carrier(admission:ReceizVerifiedProfileShowcaseAdmission){
 const actual=await verifyReceizArtifactAdmission(admission);if('code'in actual||actual.profile!=='profile-showcase')invalid();
 let held=carriers.get(actual);if(!held){held=rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(actual);carriers.set(actual,held);}return held;
}
function coverage(admission:ReceizVerifiedProfileShowcaseAdmission,value:Carrier):Coverage{
 const head=value['profile-showcase'];return{indexKey:markerKey(value.artifactId),schema:'receiz.original-child-index-coverage.v1',artifactId:value.artifactId,artifactDigest:admission.artifactSha256,ownerReceizId:value.ownerReceizIdentity,profileIdentity:head.profileIdentity as string,operationCount:head.resultingOperationCount as number,currentStateRoot:head.currentStateRoot as string,placementRoot:head.placementRoot as string,orderRoot:head.orderRoot as string};
}
async function facts(child:Child,owner:string,position:number):Promise<readonly Omit<Fact,'indexKey'>[]>{
 const actual=await verifyReceizArtifactAdmission(child.admittedArtifact);if('code'in actual||actual.profile!=='portable-state'||actual.ownerReceizId!==owner||actual.artifactId!==child.reference.stableChildArtifactId||actual.artifactSha256!==child.reference.childArtifactDigest||actual.payloadSha256!==child.reference.contentDigest)invalid();
 const document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(actual.verifiedPayload.bytes))as Record<string,unknown>,payload=await extractReceizPortableAssetPayload(document);
 if(payload.assetType!=='profile_original'||payload.sha256!==child.reference.stableChildArtifactId)invalid();
 const migration=payload.mimeType===COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME;
 let rows:readonly ProfileOriginal[];
 if(migration){const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload.bytes));if(parsed.ownerReceizIdentity!==owner)invalid();rows=decodeCompleteLegacyShowcaseMigrationPayload(payload.bytes);}
 else{const provenance=document.provenance as{appends?:unknown[]}|undefined;const row=provenance?.appends?.map(value=>decodeProfileOriginalRouteProjectionAppend(value,payload.sha256)).find(Boolean);if(!row)invalid();rows=[row as unknown as ProfileOriginal];}
 return rows.map(row=>{const proofIdentity=profileOriginalProofIdentityKey(row);if(typeof row.id!=='string'||!row.id||!proofIdentity)invalid();return{schema:'receiz.original-child-index-fact.v1',artifactId:'profile-showcase:'+owner,originalId:row.id,proofIdentity,reference:structuredClone(child.reference),kind:migration?'migration':'literal',signed:originalHasSignedArtifactState(row),membershipOperationCount:position};});
}
function validFact(value:unknown,indexKey:string,artifactId:string):value is Fact{
 if(!value||typeof value!=='object')return false;const row=value as Fact;
 return row.schema==='receiz.original-child-index-fact.v1'&&row.indexKey===indexKey&&row.artifactId===artifactId&&typeof row.originalId==='string'&&!!row.originalId&&typeof row.proofIdentity==='string'&&!!row.proofIdentity&&(row.kind==='literal'||row.kind==='migration')&&typeof row.signed==='boolean'&&Number.isSafeInteger(row.membershipOperationCount)&&row.membershipOperationCount>=0&&!!row.reference&&typeof row.reference.childArtifactDigest==='string';
}
function prefer(prior:Fact|undefined,next:Fact){return prior&&(prior.signed&&!next.signed||prior.membershipOperationCount>next.membershipOperationCount)?prior:next;}
/** A transactional app index under an actual SDK head. It answers duplicate
 * identity discovery only; every mutation still uses the unchanged SDK guard.
 * Missing legacy coverage is unknown, never an invented empty collection. */
export function createOriginalChildIndexCustody(database:IDBDatabase|Promise<IDBDatabase>){
 return Object.freeze({
  async cohere(input:Readonly<{admission:ReceizVerifiedProfileShowcaseAdmission;children:readonly Child[];persistentStateIO:ReceizProfileShowcasePersistentStateIOV114}>){
   const actual=await carrier(input.admission),head=actual['profile-showcase'],bound=coverage(input.admission,actual);
   const state:ReceizProfileShowcasePersistentStateV114={schema:'receiz.profile-showcase.persistent-state.v114',placementRoot:bound.placementRoot,orderRoot:bound.orderRoot,counts:head.counts as ReceizProfileShowcasePersistentStateV114['counts'],maximumKaiUpulse:head.headKaiUpulse as string};
   const membership=await deriveReceizProfileShowcasePersistentMembershipV114({state,io:input.persistentStateIO}),supplied=new Map(input.children.map(row=>[refKey(row.reference),row]));
   if(supplied.size!==input.children.length||supplied.size!==membership.placements.length)return false;
   const rows=new Map<string,Fact>();
   for(const placement of [...membership.placements].sort((a,b)=>a.membershipOperationCount-b.membershipOperationCount)){
    const child=supplied.get(refKey(placement.reference as ProfileShowcaseChildReference));if(!child)return false;
    for(const fact of await facts(child,bound.ownerReceizId,placement.membershipOperationCount))for(const key of[idKey(bound.artifactId,fact.originalId),proofKey(bound.artifactId,fact.proofIdentity)]){const row={...fact,indexKey:key};rows.set(key,prefer(rows.get(key),row));}
   }
   const db=await database,tx=db.transaction(STORE,'readwrite'),done=complete(tx),store=tx.objectStore(STORE),start=prefix(bound.artifactId);
   // One explicit coherence scan may repair old stores. Routine lookup/advance
   // below uses only exact point keys and new admitted child facts.
   const cursor=store.openCursor();await new Promise<void>((resolve,reject)=>{cursor.onerror=()=>reject(cursor.error);cursor.onsuccess=()=>{const next=cursor.result;if(!next){resolve();return;}if(typeof next.key==='string'&&next.key<start){next.continue(start);return;}if(typeof next.key!=='string'||!next.key.startsWith(start)){resolve();return;}next.delete();next.continue();};});
   for(const row of rows.values())store.put(row);store.put(bound);await done;return true;
  },
  async advance(input:Readonly<{predecessor:ReceizVerifiedProfileShowcaseAdmission;admission:ReceizVerifiedProfileShowcaseAdmission;children:readonly Child[]}>){
   const prior=await carrier(input.predecessor),next=await carrier(input.admission),before=coverage(input.predecessor,prior),after=coverage(input.admission,next),head=next['profile-showcase'],parents=head.parentHeads as readonly{artifactDigest:string}[],delta=head.directDelta as readonly Record<string,unknown>[];
   if(before.artifactId!==after.artifactId||before.profileIdentity!==after.profileIdentity||parents.length!==1||parents[0]!.artifactDigest!==before.artifactDigest||delta.length!==1||!['showcase.append','showcase.visibility.set'].includes(String(delta[0]!.kind)))return false;
   await verifyReceizProfileShowcaseBoundedSuccessorV114({predecessorCarrier:prior,predecessorArtifactDigest:before.artifactDigest,candidateHead:head});
   let newFacts:readonly Omit<Fact,'indexKey'>[]=[];
   if(delta[0]!.kind==='showcase.append'){
    const reference=delta[0]!.child as ProfileShowcaseChildReference;if(input.children.length!==1||refKey(input.children[0]!.reference)!==refKey(reference))return false;
    newFacts=await facts(input.children[0]!,after.ownerReceizId,after.operationCount-1);
   }else if(input.children.length)return false;
   const db=await database,tx=db.transaction(STORE,'readwrite'),done=complete(tx),store=tx.objectStore(STORE),known=await request(store.get(before.indexKey));
   if(!same(known,before)){await done;return false;}
   const incoming=new Map<string,Fact>();for(const fact of newFacts)for(const key of[idKey(after.artifactId,fact.originalId),proofKey(after.artifactId,fact.proofIdentity)]){const row={...fact,indexKey:key};incoming.set(key,prefer(incoming.get(key),row));}
   const keys=[...incoming.keys()],held=await Promise.all(keys.map(key=>request(store.get(key))));
   if(held.some((row,i)=>row!==undefined&&!validFact(row,keys[i]!,after.artifactId))){await done;return false;}
   for(let i=0;i<keys.length;i++)store.put(prefer(held[i]as Fact|undefined,incoming.get(keys[i]!)!));
   store.put(after);await done;return true;
  },
  async lookup(input:Readonly<{admission:ReceizVerifiedProfileShowcaseAdmission;original:ProfileOriginal}>):Promise<OriginalChildIndexLookup>{
   const actual=await carrier(input.admission),bound=coverage(input.admission,actual),identity=profileOriginalProofIdentityKey(input.original);if(!input.original.id||!identity)return{status:'unknown'};
   const db=await database,store=db.transaction(STORE,'readonly').objectStore(STORE),keys=[bound.indexKey,idKey(bound.artifactId,input.original.id),proofKey(bound.artifactId,identity)],values=await Promise.all(keys.map(key=>request(store.get(key))));
   if(!same(values[0],bound))return{status:'unknown'};
   for(let i=1;i<values.length;i++){const row=values[i];if(row===undefined)continue;if(!validFact(row,keys[i]!,bound.artifactId))return{status:'unknown'};return{status:'present',reference:structuredClone(row.reference),originalId:row.originalId,kind:row.kind};}
   return{status:'absent'};
  }
 });
}
