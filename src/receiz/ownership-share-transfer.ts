import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import {BANK_APPLICATION_ID} from './config';
import {inspectNativeMarketShareReview,nativeMarketShareChallenge,readNativeMarketShareCapacity,verifyNativeMarketShareConsent,verifyVaultMarketResult,expandNativeMarketShareResult,shareSame,type NativeMarketShareReview,type VaultMarketPorts} from './vault/market';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest} from './vault/encoding';

export type ShareSendInput={positionId:string;marketItemId:string;quantityMicro:string;recipient:string};
export type ShareSendReview=Readonly<{title:string;quantityMicro:string;recipient:string;recipientAccountUid:string;confirmationDigest:string;expiresAtKaiUPulse:string}>;
export type ShareSendResult=Readonly<{status:'submitted'|'committed';requestId:string;title:string;quantityMicro:string;recipient:string;recipientAccountUid:string;costBasisUsdCents?:string;costBasisPhiMicro?:string;acceptedAtKaiUPulse?:string;sourceHead?:string}>;
type Attempt={requestId:string;submissionRef:string;status:'submitted'|'committed';resultRef?:string};
export type OwnershipShareCheckpoint={schema:'bank.ownership-share-transfers.v1';identityDigest:string;current:Attempt;history:Attempt[]};
type Prepared={review:NativeMarketShareReview;challengeB64Url:string;reservation:unknown};
type Submission=Prepared&{consentProof:ReceizIdentityLoginProof};
type Ports={identityDigest:string;accountUid:string;keyId:string;receizId:string;assertOpen():void;lock<T>(work:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(next:OwnershipShareCheckpoint,previous:unknown):Promise<void>};archive:{retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>};sign(challenge:string):Promise<ReceizIdentityLoginProof>;request(action:'prepare'|'execute'|'recover'|'source',body:Record<string,unknown>):Promise<unknown>;verification?:VaultMarketPorts['verification'];operationId?():string;afterAccepted?(result:ShareSendResult,remaining:Record<string,unknown>,before:Record<string,unknown>):Promise<void>};
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const json=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
const object=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('OWNERSHIP_SOURCE_INVALID');return v as Record<string,any>;};
export function readOwnershipShareCheckpoint(raw:unknown,identityDigest:string):OwnershipShareCheckpoint|null{
 if(raw==null)return null;const s=object(raw);
 if(s.schema!=='bank.ownership-share-transfers.v1'||s.identityDigest!==identityDigest||!Array.isArray(s.history)||s.history.length>1000)throw Error('OWNERSHIP_CHECKPOINT_INVALID');
 for(const item of [...s.history,s.current]){const a=object(item);if(typeof a.requestId!=='string'||!/^[A-Za-z0-9._:-]{8,120}$/.test(a.requestId)||!hex(a.submissionRef)||!['submitted','committed'].includes(a.status)||a.resultRef!==undefined&&!hex(a.resultRef)||a.status==='committed'&&!hex(a.resultRef))throw Error('OWNERSHIP_CHECKPOINT_INVALID');}
 return s as OwnershipShareCheckpoint;
}
/** Ordinary position sending composes the existing native split/credit writer.
 * Display inventory never authorizes a send. The exact signed request is saved
 * before submission and its same nonce survives uncertain replies. */
export function createOwnershipShareTransfer(p:Ports){
 const reviews=new WeakMap<ShareSendReview,Prepared>(),accepted=new Map<string,ShareSendResult>();
 const read=async()=>readOwnershipShareCheckpoint(await p.store.read(),p.identityDigest);
 async function retain(value:Uint8Array){const d=await p.archive.retain(value);p.assertOpen();if(!hex(d)||await vaultDigest(value)!==d)throw Error('OWNERSHIP_RETENTION_MISMATCH');return d;}
 async function restore(ref:string){const b=await p.archive.restore(ref);p.assertOpen();if(await vaultDigest(b)!==ref)throw Error('OWNERSHIP_RETENTION_MISMATCH');return b;}
 async function decode(ref:string){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await restore(ref)));}
 function check(raw:unknown):Prepared{
  const v=object(raw),r=inspectNativeMarketShareReview(v.review);
  if(r.kind!=='transfer'||r.request.applicationId!==BANK_APPLICATION_ID||r.actor.accountId!==p.accountUid||r.actor.keyId!==p.keyId||r.actor.receizId!==p.receizId||v.challengeB64Url!==nativeMarketShareChallenge(r)||!v.reservation)throw Error('OWNERSHIP_REVIEW_MISMATCH');
  return{review:r,challengeB64Url:v.challengeB64Url,reservation:structuredClone(v.reservation)};
 }
 function display(s:Submission,status:ShareSendResult['status']):ShareSendResult{const r=s.review;return{status,requestId:r.request.requestId,title:r.sourcePosition.title,quantityMicro:r.request.quantityMicro,recipient:r.recipient.receizId,recipientAccountUid:r.recipient.accountId};}
 async function submission(a:Attempt):Promise<Submission>{const raw=object(await decode(a.submissionRef)),prepared=check(raw);if(prepared.review.request.requestId!==a.requestId)throw Error('OWNERSHIP_REQUEST_MISMATCH');const s={...prepared,consentProof:raw.consentProof};await verifyNativeMarketShareConsent(s.review,s.consentProof);return s;}
 // Retain each exact immutable block once; later operations keep references,
 // rather than repeatedly nesting the complete account/source closure.
 async function saveResult(raw:unknown){
  const r=structuredClone(object(raw)),family=object(r.source);
  if(!Array.isArray(family.sources))throw Error('OWNERSHIP_SOURCE_INVALID');
  const refs=[];for(const block of family.sources){const b=object(block),d=await retain(vaultBytes(b.exactBytesB64u,23*1024*1024));if(d!==b.sha256)throw Error('OWNERSHIP_SOURCE_INVALID');refs.push(d);}
  const witness=object(r.publicWitness),w=await retain(vaultBytes(witness.exactBytesB64u,23*1024*1024));if(w!==witness.sha256)throw Error('OWNERSHIP_SOURCE_INVALID');
  return retain(json({...r,source:{...family,sources:refs},publicWitness:{sha256:w}}));
 }
 async function openResult(ref:string){const r=object(await decode(ref)),f=object(r.source),w=object(r.publicWitness);if(!Array.isArray(f.sources)||!f.sources.every(hex)||!hex(w.sha256))throw Error('OWNERSHIP_SOURCE_INVALID');return{...r,source:{...f,sources:await Promise.all(f.sources.map(async(sha256:string)=>({sha256,exactBytesB64u:vaultBase64(await restore(sha256))})))},publicWitness:{sha256:w.sha256,exactBytesB64u:vaultBase64(await restore(w.sha256))}};}
 async function admit(s:Submission,raw:unknown){
  const value=await verifyVaultMarketResult(raw,s.review,s.consentProof,p.verification);p.assertOpen();
  const capacity=object(s.reservation);if(!value.source.chain.some(row=>shareSame(row.statement.review,s.review))||value.source.chain.some(row=>shareSame(row.statement.review,s.review)&&!row.statement.evidence.includes(capacity.sha256)))throw Error('OWNERSHIP_CAPACITY_SOURCE_MISMATCH');
  const result:ShareSendResult=Object.freeze({...display(s,value.result.status==='committed'?'committed':'submitted'),acceptedAtKaiUPulse:value.source.statement.acceptedAtKaiUPulse,sourceHead:value.source.headSourceSha256,...(value.source.state.exited[0]?{costBasisUsdCents:value.source.state.exited[0].position.costBasisUsdCents,costBasisPhiMicro:value.source.state.exited[0].position.costBasisPhiMicro}:{})});
  return{value,result};
 }
 async function accept(state:OwnershipShareCheckpoint,s:Submission,raw:unknown){
  const {value,result}=await admit(s,raw),resultRef=await saveResult(raw),next:OwnershipShareCheckpoint={...state,current:{...state.current,resultRef,status:result.status}};
  await p.store.write(next,state);p.assertOpen();accepted.set(state.current.requestId,result);
  if(result.status==='committed'){const allocation=value.source.chain.find(row=>row.statement.operation==='adopt')?.statement.allocationEvidenceSha256;if(allocation)try{const effect=object(JSON.parse(new TextDecoder().decode(value.source.openExact(allocation))));await p.afterAccepted?.(result,effect.remaining,effect.before);}catch{/* Accepted Source is retained before optional presentation updates. */}}
  return result;
 }
 async function run(state:OwnershipShareCheckpoint,s:Submission,recover:boolean){
  try{
   if(recover){const raw=await p.request('recover',{requestId:state.current.requestId});p.assertOpen();if(object(raw).status!=='unknown')return await accept(state,s,await expandNativeMarketShareResult(raw,s.review.request,body=>p.request('source',body),p.assertOpen));}
   const {challengeB64Url:_,...body}=s,raw=await p.request('execute',body);p.assertOpen();return await accept(state,s,await expandNativeMarketShareResult(raw,s.review.request,next=>p.request('source',next),p.assertOpen));
  }catch{p.assertOpen();return display(s,'submitted');}
 }
 return Object.freeze({
  async pending(){p.assertOpen();const current=(await read())?.current;return current?.status==='submitted'?current.requestId:null;},
  async prepare(input:ShareSendInput){
   p.assertOpen();if((await read())?.current.status==='submitted')throw Error('OWNERSHIP_TRANSFER_PENDING');
   if(!/^[1-9]\d{0,18}$/.test(input.quantityMicro)||!input.recipient.trim())throw Error('OWNERSHIP_REQUEST_INVALID');
   const recipient=input.recipient.trim().toLowerCase().replace(/^@/u,'');
   const locator=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(recipient)?recipient:recipient.replace(/\.receiz\.id$/,'')+'.receiz.id';
   const requestId=p.operationId?.()??crypto.randomUUID(),prepared=check(await p.request('prepare',{kind:'transfer',requestId,positionId:input.positionId,marketItemId:input.marketItemId,quantityMicro:input.quantityMicro,recipientAccountId:locator})),r=prepared.review;
   if(r.request.requestId!==requestId||r.request.positionId!==input.positionId||r.request.marketItemId!==input.marketItemId||r.request.quantityMicro!==input.quantityMicro||(locator.endsWith('.receiz.id')?r.recipient.receizId!==locator:r.recipient.accountId!==locator))throw Error('OWNERSHIP_REVIEW_MISMATCH');
   await readNativeMarketShareCapacity(prepared.reservation,r,p.verification);p.assertOpen();
   const review=Object.freeze({title:r.sourcePosition.title,quantityMicro:r.request.quantityMicro,recipient:r.recipient.receizId,recipientAccountUid:r.recipient.accountId,expiresAtKaiUPulse:r.expiresAtKaiUPulse,confirmationDigest:await vaultDigest(json(r))});reviews.set(review,prepared);return review;
  },
  discard(review:ShareSendReview){reviews.delete(review);},
  execute:(review:ShareSendReview)=>p.lock(async()=>{
   p.assertOpen();const prepared=reviews.get(review);if(!prepared)throw Error('OWNERSHIP_REVIEW_REQUIRED');
   const previous=await read();if(previous?.current.status==='submitted')throw Error('OWNERSHIP_TRANSFER_PENDING');
   const consentProof=await p.sign(prepared.challengeB64Url);p.assertOpen();await verifyNativeMarketShareConsent(prepared.review,consentProof);
   const s:Submission={...prepared,consentProof},submissionRef=await retain(json(s)),state:OwnershipShareCheckpoint={schema:'bank.ownership-share-transfers.v1',identityDigest:p.identityDigest,current:{requestId:prepared.review.request.requestId,submissionRef,status:'submitted'},history:previous?[...previous.history,previous.current]:[]};
   await p.store.write(state,previous);reviews.delete(review);p.assertOpen();return run(state,s,false);
  }),
  recover:()=>p.lock(async()=>{
   p.assertOpen();const state=await read();if(!state)throw Error('OWNERSHIP_TRANSFER_REQUIRED');const cached=accepted.get(state.current.requestId);if(cached?.status==='committed')return cached;
   const s=await submission(state.current);if(state.current.status==='committed'){const {result}=await admit(s,await openResult(state.current.resultRef!));accepted.set(state.current.requestId,result);return result;}
   return run(state,s,true);
  }),
 });
}
export type OwnershipShareTransfer=ReturnType<typeof createOwnershipShareTransfer>;
