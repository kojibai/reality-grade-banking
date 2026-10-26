import type{ReceizAdmissionStore,ReceizAdmissionAggregate}from './admissionStore.js';
import type{ReceizConstitutionJson}from './constitution.js';
import {canonicalizeReceizV122 as canonical,digestReceizCanonicalV122 as digest}from './v122Canonical.js';
import {receizBase64UrlEncode,receizBase64UrlDecode}from './identity.js';
import {sha256ReceizBytes}from './artifacts.js';
import {verifyReceizAccountFinancialReceipt,accountFinancialPublicEffectFields,type ReceizAccountFinancialReceipt}from './accountFinancialReceipt.js';
import type{ReceizSignatureV4RootPublicKey}from './verifier/signatureV4.js';
import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource}from './accountFinancialSource.js';
import {exportReceizAccountFinancialCommit,type ReceizAccountFinancialOriginalStore,type ReceizVerifiedAccountFinancialOperation,type createReceizAccountFinancialExecutor}from './accountFinancialCommit.js';
export type ReceizAccountFinancialPublication=Readonly<{schema:'receiz.account-financial-publication.v1';allocationId:string;sourceArtifactSha256:string;expectedPredecessorArtifactSha256:string;originals:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string;artifactBytesB64u:string}>[]}>;
type PublicationAckFacts=Readonly<{allocationId:string;sourceArtifactSha256:string;accepted:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string}>[]}>;
export type ReceizAccountFinancialPublicationAck=PublicationAckFacts&Readonly<{schema:'receiz.account-financial-publication-ack.v1';received?:never}|{schema:'receiz.account-financial-publication-ack.v2';received:readonly Readonly<{operationId:string;receiptOriginalB64u:string}>[]}>;
type Executor=Awaited<ReturnType<typeof createReceizAccountFinancialExecutor>>;
const json=(v:unknown):ReceizConstitutionJson=>JSON.parse(canonical(v))as ReceizConstitutionJson;
function fail():never{throw new TypeError('ACCOUNT_FINANCIAL_PUBLICATION_MISMATCH');}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v as Record<string,unknown>;}
function exact(v:unknown,keys:readonly string[]){const r=object(v);if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))fail();return r;}
/** Publication acknowledges already committed originals. It never prepares,
 * reprices or executes a payment, and a transport failure cannot undo one. */
export async function createReceizAccountFinancialPublisher(input:Readonly<{source:ReceizAccountFinancialSource;executor:Pick<Executor,'pending'|'current'>&Partial<Pick<Executor,'resolve'>>;store:ReceizAdmissionStore;originals?:ReceizAccountFinancialOriginalStore;/** Trusted host/test roots, never publication-request input. */receiptRoots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;publish(batch:ReceizAccountFinancialPublication):Promise<unknown>;batchSize?:number}>){
 readReceizAccountFinancialSourceCustody(input.source);
 const source=input.source,id='account-financial-delivery:'+source.allocationId,batchSize=input.batchSize??32;
 if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>64)fail();
 let flight:Promise<Readonly<{status:'published'|'pending'}>>|null=null,closed=false;
 const receivedMemo=new Map<string,ReceizAccountFinancialReceipt>();
 const receivedId=(operationId:string)=>{if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(operationId))fail();return'account-financial-received:'+source.allocationId+':'+operationId;};
 async function verifyReceived(bytes:Uint8Array,operation:ReceizVerifiedAccountFinancialOperation){
  const proof=await verifyReceizAccountFinancialReceipt(bytes,input.receiptRoots?{roots:input.receiptRoots}:{}),effect=operation.effect;
  if(proof.schema!=='receiz.account-financial-receipt.v2'||effect.kind!=='send'||proof.operationId!==operation.operationId||proof.financialOriginalSha256!==operation.artifactSha256||proof.fundingSourceSha256!==source.artifactSha256||proof.ownerReceizId!==source.ownerReceizId||proof.atKaiUPulse!==operation.atKaiUPulse)fail();
  const expected={...effect,recipientReceizId:effect.recipientOwnerReceizId}as Record<string,unknown>;
  for(const field of accountFinancialPublicEffectFields('send'))if(proof.effect[field]!==expected[field])fail();
  return proof;
 }
 async function received(operationId:string):Promise<ReceizAccountFinancialReceipt|null>{
  if(closed)return null;const hit=receivedMemo.get(operationId);if(hit)return hit;
  const row=await input.store.readAggregate(receivedId(operationId));if(!row)return null;
  if(!input.originals||row.revision!==0||typeof row.headDigest!=='string')fail();
  const state=exact(row.state,['operationId','financialOriginalSha256']),commit=await input.executor.resolve?.(operationId);
  if(!commit||state.operationId!==operationId||state.financialOriginalSha256!==commit.operation.artifactSha256)fail();
  const bytes=await input.originals.read(row.headDigest);if(!(bytes instanceof Uint8Array)||await sha256ReceizBytes(bytes)!==row.headDigest)fail();
  const proof=await verifyReceived(bytes,commit.operation);if(closed)return null;receivedMemo.set(operationId,proof);return proof;
 }
 async function retainReceived(operation:ReceizVerifiedAccountFinancialOperation,bytes:Uint8Array,proof:ReceizAccountFinancialReceipt){
  if(!input.originals)fail();const sha=await sha256ReceizBytes(bytes);await input.originals.retain(sha,bytes.slice());
  const saved=await input.originals.read(sha);if(!(saved instanceof Uint8Array)||await sha256ReceizBytes(saved)!==sha)fail();
  const aggregateId=receivedId(operation.operationId),state=json({operationId:operation.operationId,financialOriginalSha256:operation.artifactSha256});
  try{await input.store.seedAggregate({aggregateId,revision:0,headDigest:sha,state});}catch{/* Retain the first genuine receipt across a race or reissuance. */}
  const row=await input.store.readAggregate(aggregateId);if(!row||row.revision!==0||canonical(row.state)!==canonical(state))fail();
  if(row.headDigest===sha){receivedMemo.set(operation.operationId,proof);return;}
  const first=await received(operation.operationId);if(!first)fail();
  const facts=(value:ReceizAccountFinancialReceipt)=>{const{financialRootSignature,issuerRootKid,issuedAtMs,...rest}=value;void financialRootSignature;void issuerRootKid;void issuedAtMs;return canonical(rest);};
  if(facts(first)!==facts(proof))fail();
 }

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
    const response=await input.publish(batch),version=object(response).schema,modern=version==='receiz.account-financial-publication-ack.v2',raw=exact(response,['schema','allocationId','sourceArtifactSha256','accepted',...(modern?['received']:[])]);
    if(!['receiz.account-financial-publication-ack.v1','receiz.account-financial-publication-ack.v2'].includes(String(raw.schema))||raw.allocationId!==source.allocationId||raw.sourceArtifactSha256!==source.artifactSha256||!Array.isArray(raw.accepted)||raw.accepted.length>originals.length)fail();
    if(raw.accepted.length===0)return{status:'pending'};
    for(let index=0;index<raw.accepted.length;index++){const ack=exact(raw.accepted[index],['operationId','artifactSha256','sequence']),sent=originals[index]!;if(ack.operationId!==sent.operationId||ack.artifactSha256!==sent.artifactSha256||ack.sequence!==sent.sequence)fail();}
    if(modern){
     const expected=pending.slice(0,raw.accepted.length).filter(row=>row.operation.effect.kind==='send'),seen=new Set<string>();
     if(!Array.isArray(raw.received)||raw.received.length!==expected.length)fail();
     for(const value of raw.received){const row=exact(value,['operationId','receiptOriginalB64u']);if(typeof row.operationId!=='string'||seen.has(row.operationId)||typeof row.receiptOriginalB64u!=='string'||row.receiptOriginalB64u.length>32768)fail();
      const commit=expected.find(item=>item.operation.operationId===row.operationId);if(!commit)fail();seen.add(row.operationId);
      if(await received(commit.operation.operationId))continue; // Stronger retained truth already answers this exact receipt.

      const bytes=receizBase64UrlDecode(row.receiptOriginalB64u);if(receizBase64UrlEncode(bytes)!==row.receiptOriginalB64u)fail();
      const proof=await verifyReceived(bytes,commit.operation);await retainReceived(commit.operation,bytes,proof);
     }
    }
    const last=originals[raw.accepted.length-1]!,acknowledged={schema:'receiz.account-financial-publication-ack.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,accepted:raw.accepted},commandDigest=await digest(acknowledged);
    try{await input.store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:id,commandDigest,idempotencyKey:id+':'+last.sequence,expectedRevision:before.row.revision,expectedHeadDigest:before.row.headDigest,acceptedCommand:json(acknowledged),events:[json(acknowledged)],nextHead:{revision:before.row.revision+1,digest:last.artifactSha256,state:json({sequence:last.sequence,operationId:last.operationId})},resourceEffects:{},receipt:json(acknowledged),outboxIntents:[],auditReference:json({sourceArtifactSha256:source.artifactSha256})});}catch{/* Reopen a possibly accepted acknowledgement. */}
    const after=await cursor();if(BigInt(after.sequence)<=BigInt(before.sequence))return{status:'pending'};before=after;
   }
  }catch{/* Exact originals remain retained and pending; no execution is replayed. */}
  return{status:'pending'};
 }
 return Object.freeze({
  flush(){if(closed)return Promise.resolve({status:'pending'as const});if(flight)return flight;flight=drain().finally(()=>{flight=null;});return flight;},
  received,
  dispose(){closed=true;receivedMemo.clear();},
 });
}
