import type{ReceizAdmissionStore,ReceizAdmissionAggregate}from './admissionStore.js';
import type{ReceizConstitutionJson}from './constitution.js';
import {canonicalizeReceizV122 as canonical,digestReceizCanonicalV122 as digest}from './v122Canonical.js';
import {receizBase64UrlEncode}from './identity.js';
import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource}from './accountFinancialSource.js';
import {exportReceizAccountFinancialCommit,type createReceizAccountFinancialExecutor}from './accountFinancialCommit.js';
export type ReceizAccountFinancialPublication=Readonly<{schema:'receiz.account-financial-publication.v1';allocationId:string;sourceArtifactSha256:string;expectedPredecessorArtifactSha256:string;originals:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string;artifactBytesB64u:string}>[]}>;
export type ReceizAccountFinancialPublicationAck=Readonly<{schema:'receiz.account-financial-publication-ack.v1';allocationId:string;sourceArtifactSha256:string;accepted:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string}>[]}>;
type Executor=Awaited<ReturnType<typeof createReceizAccountFinancialExecutor>>;
const json=(v:unknown):ReceizConstitutionJson=>JSON.parse(canonical(v))as ReceizConstitutionJson;
function fail():never{throw new TypeError('ACCOUNT_FINANCIAL_PUBLICATION_MISMATCH');}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v as Record<string,unknown>;}
function exact(v:unknown,keys:readonly string[]){const r=object(v);if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))fail();return r;}
/** Publication acknowledges already committed originals. It never prepares,
 * reprices or executes a payment, and a transport failure cannot undo one. */
export async function createReceizAccountFinancialPublisher(input:Readonly<{source:ReceizAccountFinancialSource;executor:Pick<Executor,'pending'|'current'>;store:ReceizAdmissionStore;publish(batch:ReceizAccountFinancialPublication):Promise<unknown>;batchSize?:number}>){
 readReceizAccountFinancialSourceCustody(input.source);
 const source=input.source,id='account-financial-delivery:'+source.allocationId,batchSize=input.batchSize??32;
 if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>64)fail();
 let flight:Promise<Readonly<{status:'published'|'pending'}>>|null=null,closed=false;
 type Cursor={row:ReceizAdmissionAggregate;sequence:string;operationId:string|null};
 async function cursor():Promise<Cursor>{
  let row=await input.store.readAggregate(id);
  if(!row){try{await input.store.seedAggregate({aggregateId:id,revision:0,headDigest:source.artifactSha256,state:json({sequence:'0',operationId:null})});}catch(error){if(!await input.store.readAggregate(id))throw error;}row=await input.store.readAggregate(id);}
  if(!row)fail();const state=exact(row.state,['sequence','operationId']);if(typeof state.sequence!=='string'||!/^(0|[1-9][0-9]{0,18})$/u.test(state.sequence))fail();
  if(state.sequence==='0'){if(state.operationId!==null||row.headDigest!==source.artifactSha256)fail();}
  else{
   const known=(await input.executor.pending(String(BigInt(state.sequence)-1n),1))[0]?.operation;
   if(!known||known.sequence!==state.sequence||known.operationId!==state.operationId||known.artifactSha256!==row.headDigest)fail();
  }
  return{row,sequence:state.sequence,operationId:state.operationId as string|null};
 }
 await cursor();
 async function drain():Promise<Readonly<{status:'published'|'pending'}>>{
  try{
   let before=await cursor();
   while(!closed){
    const pending=await input.executor.pending(before.sequence,batchSize);if(pending.length===0)return{status:'published'};
    let expected=before.row.headDigest;
    const originals=pending.map(commit=>{const{operation}=commit;if(commit.status!=='committed'||operation.allocationId!==source.allocationId||operation.predecessorArtifactSha256!==expected)fail();expected=operation.artifactSha256;return{operationId:operation.operationId,artifactSha256:operation.artifactSha256,sequence:operation.sequence,artifactBytesB64u:receizBase64UrlEncode(exportReceizAccountFinancialCommit(commit))};});
    const batch:ReceizAccountFinancialPublication={schema:'receiz.account-financial-publication.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,expectedPredecessorArtifactSha256:before.row.headDigest!,originals};
    const raw=exact(await input.publish(batch),['schema','allocationId','sourceArtifactSha256','accepted']);
    if(raw.schema!=='receiz.account-financial-publication-ack.v1'||raw.allocationId!==source.allocationId||raw.sourceArtifactSha256!==source.artifactSha256||!Array.isArray(raw.accepted)||raw.accepted.length>originals.length)fail();
    if(raw.accepted.length===0)return{status:'pending'};
    for(let index=0;index<raw.accepted.length;index++){const ack=exact(raw.accepted[index],['operationId','artifactSha256','sequence']),sent=originals[index]!;if(ack.operationId!==sent.operationId||ack.artifactSha256!==sent.artifactSha256||ack.sequence!==sent.sequence)fail();}
    const last=originals[raw.accepted.length-1]!,acknowledged={schema:'receiz.account-financial-publication-ack.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,accepted:raw.accepted},commandDigest=await digest(acknowledged);
    try{await input.store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:id,commandDigest,idempotencyKey:id+':'+last.sequence,expectedRevision:before.row.revision,expectedHeadDigest:before.row.headDigest,acceptedCommand:json(acknowledged),events:[json(acknowledged)],nextHead:{revision:before.row.revision+1,digest:last.artifactSha256,state:json({sequence:last.sequence,operationId:last.operationId})},resourceEffects:{},receipt:json(acknowledged),outboxIntents:[],auditReference:json({sourceArtifactSha256:source.artifactSha256})});}catch{/* Reopen a possibly accepted acknowledgement. */}
    const after=await cursor();if(BigInt(after.sequence)<=BigInt(before.sequence))return{status:'pending'};before=after;
   }
  }catch{/* Exact originals remain retained and pending; no execution is replayed. */}
  return{status:'pending'};
 }
 return Object.freeze({
  flush(){if(closed)return Promise.resolve({status:'pending'as const});if(flight)return flight;flight=drain().finally(()=>{flight=null;});return flight;},
  dispose(){closed=true;},
 });
}
