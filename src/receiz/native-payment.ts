import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID,isBankNativeApplicationId} from './config';
import {inspectNativePaymentReview,nativePaymentChallenge,paymentSame,paymentHex,type NativePaymentPrepared,type NativePaymentReview,type NativePaymentReceipt,type NativePaymentRefusal} from './native-payment-protocol';
import {verifyNativePaymentReceiptSignature} from './native-payment-signature';
import type {BankOperationInput,BankOperationReview} from './bank-operations';
import type {BankExecutionRecovery} from './bank-execution-recovery';
export type NativePaymentPacket={schema:'receiz.bank.native-payment-result.v1';status:'committed'|'zero-write';source:{filename:string;mimeType:string;exactBytesB64u:string;artifactSha256:string}};
export type NativePaymentResult={status:'committed';nativePaymentSource:NativePaymentPacket}|{status:'zero-write';reasonCode:string}|{status:'unknown';operationId:string};
type Checkpoint={prepared:NativePaymentPrepared;consentProof:ReceizIdentityLoginProof;state:'unknown'|'committed'|'zero-write';source?:NativePaymentPacket};
export type NativePaymentState={schema:'bank.native-payments.v1';current:Checkpoint;history:Checkpoint[]};
function fail(code:string):never {throw Error(`BANK_PAYMENT_${code}`);}
function preparedReview(p:NativePaymentPrepared){return inspectNativePaymentReview({schema:p.schema,request:p.request,keyId:p.keyId,planDigest:p.planDigest,terms:p.terms});}
/** Canonical v129 proof plus the native financial-domain signature. An API
 * status, document seal or caller-declared balance is never a payment result. */
export async function verifyNativePaymentSource(input:unknown,expectedReview?:NativePaymentReview):Promise<{packet:NativePaymentPacket;receipt:NativePaymentReceipt|NativePaymentRefusal}>{
 const p=input as NativePaymentPacket;
 if(!p||Object.keys(p).sort().join('|')!=='schema|source|status'||p.schema!=='receiz.bank.native-payment-result.v1'||!['committed','zero-write'].includes(p.status)||!p.source||Object.keys(p.source).sort().join('|')!=='artifactSha256|exactBytesB64u|filename|mimeType'||!paymentHex(p.source.artifactSha256)||typeof p.source.exactBytesB64u!=='string'||p.source.exactBytesB64u.length>32*1024*1024||p.source.filename!=='native-payment.receizbundle'||p.source.mimeType!=='application/vnd.receiz.bundle+json')fail('SOURCE_INVALID');
 const sdk=await loadReceiz(),bytes=sdk.receizBase64UrlDecode(p.source.exactBytesB64u);if(await sdk.sha256ReceizBytes(bytes)!==p.source.artifactSha256)fail('SOURCE_INVALID');
 const opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],p.source.filename,{type:p.source.mimeType}));
 if(opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.artifactSha256!==p.source.artifactSha256)fail('SOURCE_INVALID');
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),payload=JSON.parse(raw);
 if(sdk.canonicalizeReceizV122(payload)!==raw)fail('SOURCE_INVALID');
 const receipt=await verifyNativePaymentReceiptSignature(payload);
 if(!receipt||expectedReview&&!paymentSame(receipt.review,expectedReview)||BigInt(receipt.kaiUPulse)>BigInt(sdk.receizKaiNow().uPulse))fail('FINANCIAL_SOURCE_INVALID');
 const review=receipt.review;if(!isBankNativeApplicationId(review.request.applicationId)||opened.sealedArtifact.continuity.ownerReceizId!==review.request.actorReceizId)fail('FINANCIAL_SOURCE_INVALID');
 if(receipt.schema==='receiz.bank.native-payment-receipt.v1'){if(p.status!=='committed'||BigInt(receipt.issuedAtKaiUPulse)>BigInt(sdk.receizKaiNow().uPulse)||BigInt(receipt.kaiUPulse)>=BigInt(review.terms.expiresAtKaiUPulse))fail('FINANCIAL_SOURCE_INVALID');}
 else if(p.status!=='zero-write')fail('FINANCIAL_SOURCE_INVALID');
 return {packet:structuredClone(p),receipt};
}
export function createNativePayments(input:{ownerReceizId:string;keyId:string;assertOpen():void;assertNoOtherPending?():Promise<void>;lock<T>(operation:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(value:NativePaymentState,expected:unknown):Promise<void>};sign(challengeB64Url:string):Promise<ReceizIdentityLoginProof>;request(path:string,body:Record<string,unknown>,readOnly?:boolean):Promise<unknown>}){
 const path=(s:string,applicationId=BANK_APPLICATION_ID)=>`/api/connect/bank/payments/${s}?applicationId=${applicationId}`;
 const held=new WeakMap<BankOperationReview,NativePaymentPrepared>();
 async function state(){input.assertOpen();const v=await input.store.read() as NativePaymentState|null;input.assertOpen();if(v&&(v.schema!=='bank.native-payments.v1'||!Array.isArray(v.history)||v.history.length>1000||!v.current||!['unknown','committed','zero-write'].includes(v.current.state)))fail('CHECKPOINT_INVALID');if(v){for(const c of [...v.history,v.current]){if(!['unknown','committed','zero-write'].includes(c.state)||c.state!=='unknown'&&c.source?.status!==c.state)fail('CHECKPOINT_INVALID');const r=preparedReview(c.prepared);if(!isBankNativeApplicationId(r.request.applicationId)||r.keyId!==input.keyId||r.request.actorReceizId!==input.ownerReceizId||c.consentProof?.keyId!==input.keyId||c.consentProof.challengeB64Url!==nativePaymentChallenge(r))fail('CHECKPOINT_INVALID');}}return v;}
 const unknown=(c:Checkpoint):NativePaymentResult=>({status:'unknown',operationId:c.prepared.request.requestId});
 async function committed(value:NativePaymentState,raw:unknown):Promise<NativePaymentResult>{const {packet}=await verifyNativePaymentSource(raw,preparedReview(value.current.prepared));input.assertOpen();await input.store.write({...value,current:{...value.current,state:packet.status,source:packet}},value);input.assertOpen();return packet.status==='committed'?{status:'committed',nativePaymentSource:packet}:{status:'zero-write',reasonCode:'EXPIRED'};}
 async function resolve(approved=false):Promise<NativePaymentResult|null>{return input.lock(async()=>{const value=await state();if(!value)return null;
  if(value.current.state!=='unknown'){const {packet}=await verifyNativePaymentSource(value.current.source,preparedReview(value.current.prepared));input.assertOpen();return packet.status==='committed'?{status:'committed',nativePaymentSource:packet}:{status:'zero-write',reasonCode:'EXPIRED'};}
  if(!approved)fail('RECOVERY_CONSENT_REQUIRED');const c=value.current,p=c.prepared;input.assertOpen();const raw=await input.request(path('recover',p.request.applicationId),{nonce:p.request.requestId,planDigest:p.planDigest,ticket:p.ticket},true);input.assertOpen();
  if((raw as {status?:unknown})?.status==='unknown')return unknown(c);return committed(value,raw);
 });}
 const recovery:BankExecutionRecovery={status:async()=>{const s=await state();if(!s)return null;if(s.current.state!=='unknown')await verifyNativePaymentSource(s.current.source,preparedReview(s.current.prepared));return{operationId:s.current.prepared.request.requestId,operationKind:'wallet.transfer',planDigest:s.current.prepared.planDigest,state:s.current.state,hasRecovery:s.current.state==='committed'};},resolve,exportRecovery:async()=>{const value=await state();if(!value||value.current.state!=='committed')fail('COMMITTED_RECOVERY_REQUIRED');const {packet}=await verifyNativePaymentSource(value.current.source,preparedReview(value.current.prepared));input.assertOpen();return{bytes:new TextEncoder().encode(JSON.stringify(packet)),filename:`payment-${value.current.prepared.planDigest}.receiz-payment.json`};}};
 return Object.freeze({recovery,
  async prepare(operation:BankOperationInput):Promise<BankOperationReview>{return input.lock(async()=>{
   await input.assertNoOtherPending?.();input.assertOpen();const s=await state();if(s?.current.state==='unknown')throw Error('BANK_EXECUTION_PENDING');if(operation.kind!=='send-value')fail('UNSUPPORTED');
   const request={...operation,schema:'bankeiz.operation-request.v1' as const,applicationId:BANK_APPLICATION_ID,requestId:crypto.randomUUID(),actorReceizId:input.ownerReceizId};
   const raw=await input.request(path('prepare'),request),p=raw as NativePaymentPrepared;input.assertOpen();
   if(!p||Object.keys(p).sort().join('|')!=='challengeB64Url|keyId|planDigest|request|schema|terms|ticket'||typeof p.ticket!=='string'||!p.ticket||p.ticket.length>24000)fail('REVIEW_INVALID');
   const r=preparedReview(p);if(!paymentSame(r.request,request)||r.keyId!==input.keyId||p.challengeB64Url!==nativePaymentChallenge(r))fail('REVIEW_INVALID');
   const sdk=await loadReceiz();if(sdk.receizKaiNow().uPulse>=r.terms.expiresAtKaiUPulse)throw Error('BANK_OPERATION_EXPIRED');
   const review=Object.freeze({request:Object.freeze(structuredClone(request)),terms:Object.freeze(r.terms),confirmationDigest:await sdk.digestReceizCanonicalV122(r)});held.set(review,structuredClone(p));return review;
  });},
  async execute(review:BankOperationReview,confirmationDigest:string):Promise<NativePaymentResult>{return input.lock(async()=>{
   input.assertOpen();await input.assertNoOtherPending?.();input.assertOpen();const p=held.get(review);if(!p||confirmationDigest!==review.confirmationDigest)throw Error('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
   const previous=await state();if(previous?.current.state==='unknown')throw Error('BANK_EXECUTION_PENDING');const sdk=await loadReceiz();if(sdk.receizKaiNow().uPulse>=p.terms.expiresAtKaiUPulse)throw Error('BANK_OPERATION_EXPIRED');
   const consentProof=await input.sign(p.challengeB64Url);input.assertOpen();if(consentProof.keyId!==input.keyId||consentProof.challengeB64Url!==p.challengeB64Url)fail('CONSENT_INVALID');
   const value:NativePaymentState={schema:'bank.native-payments.v1',current:{prepared:p,consentProof,state:'unknown'},history:previous?[...previous.history,previous.current]:[]};if(value.history.length>1000)fail('CAPACITY');
   await input.store.write(value,previous);held.delete(review);input.assertOpen();
   let raw:unknown;try{raw=await input.request(path('execute'),{...p,consentProof});}catch{return unknown(value.current);}input.assertOpen();
   try{return await committed(value,raw);}catch{return unknown(value.current);}
  });},
  discard(review:BankOperationReview){held.delete(review);},
 });
}
