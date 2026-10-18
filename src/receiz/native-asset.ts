import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID,isBankNativeApplicationId} from './config';
import {inspectNativeAssetReview,nativeAssetChallenge,assetSame,assetHex,type NativeAssetPrepared,type NativeAssetReview,type NativeAssetReceipt,type NativeAssetRefusal} from './native-asset-protocol';
import {verifyNativeAssetReceiptSignature} from './native-asset-signature';
import type {BankOperationInput,BankOperationReview} from './bank-operations';
import type {BankExecutionRecovery} from './bank-execution-recovery';
export type NativeAssetPacket={schema:'receiz.bank.native-asset-result.v1';status:'committed'|'zero-write';source:{filename:string;mimeType:string;exactBytesB64u:string;artifactSha256:string}};
export type NativeAssetResult={status:'committed';nativeAssetSource:NativeAssetPacket}|{status:'zero-write';reasonCode:string}|{status:'unknown';operationId:string};
type Checkpoint={prepared:NativeAssetPrepared;consentProof:ReceizIdentityLoginProof;state:'unknown'|'committed'|'zero-write';source?:NativeAssetPacket};
export type NativeAssetState={schema:'bank.native-assets.v1';current:Checkpoint;history:Checkpoint[]};
function fail(code:string):never {throw Error(`BANK_ASSET_${code}`);}
function preparedReview(p:NativeAssetPrepared){return inspectNativeAssetReview({schema:p.schema,request:p.request,keyId:p.keyId,planDigest:p.planDigest,terms:p.terms});}
/** Canonical v129 proof plus the native financial-domain signature. An API
 * status, document seal or caller-declared balance is never an asset result. */
export async function verifyNativeAssetSource(input:unknown,expectedReview?:NativeAssetReview):Promise<{packet:NativeAssetPacket;receipt:NativeAssetReceipt|NativeAssetRefusal}>{
 const p=input as NativeAssetPacket;
 if(!p||Object.keys(p).sort().join('|')!=='schema|source|status'||p.schema!=='receiz.bank.native-asset-result.v1'||!['committed','zero-write'].includes(p.status)||!p.source||Object.keys(p.source).sort().join('|')!=='artifactSha256|exactBytesB64u|filename|mimeType'||!assetHex(p.source.artifactSha256)||typeof p.source.exactBytesB64u!=='string'||p.source.exactBytesB64u.length>32*1024*1024||p.source.filename!=='native-asset.receizbundle'||p.source.mimeType!=='application/vnd.receiz.bundle+json')fail('SOURCE_INVALID');
 const sdk=await loadReceiz(),bytes=sdk.receizBase64UrlDecode(p.source.exactBytesB64u);if(await sdk.sha256ReceizBytes(bytes)!==p.source.artifactSha256)fail('SOURCE_INVALID');
 const opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],p.source.filename,{type:p.source.mimeType}));
 if(opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.artifactSha256!==p.source.artifactSha256)fail('SOURCE_INVALID');
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),payload=JSON.parse(raw);
 if(sdk.canonicalizeReceizV122(payload)!==raw)fail('SOURCE_INVALID');
 const receipt=await verifyNativeAssetReceiptSignature(payload);
 if(!receipt||expectedReview&&!assetSame(receipt.review,expectedReview)||BigInt(receipt.kaiUPulse)>BigInt(sdk.receizKaiNow().uPulse))fail('FINANCIAL_SOURCE_INVALID');
 const review=receipt.review;if(!isBankNativeApplicationId(review.request.applicationId)||opened.sealedArtifact.continuity.ownerReceizId!==review.request.actorReceizId)fail('FINANCIAL_SOURCE_INVALID');
 if(receipt.schema==='receiz.bank.native-asset-receipt.v1'){if(p.status!=='committed'||BigInt(receipt.issuedAtKaiUPulse)>BigInt(sdk.receizKaiNow().uPulse)||BigInt(receipt.kaiUPulse)>=BigInt(review.terms.expiresAtKaiUPulse))fail('FINANCIAL_SOURCE_INVALID');}
 else if(p.status!=='zero-write')fail('FINANCIAL_SOURCE_INVALID');
 return {packet:structuredClone(p),receipt};
}
export function createNativeAssets(input:{ownerReceizId:string;keyId:string;onCommitted?():void;assertOpen():void;assertNoOtherPending?():Promise<void>;lock<T>(operation:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(value:NativeAssetState,expected:unknown):Promise<void>};sign(challengeB64Url:string):Promise<ReceizIdentityLoginProof>;request(path:string,body:Record<string,unknown>,readOnly?:boolean):Promise<unknown>}){
 const path=(s:string,applicationId=BANK_APPLICATION_ID)=>`/api/connect/bank/assets/${s}?applicationId=${applicationId}`;
 const held=new WeakMap<BankOperationReview,NativeAssetPrepared>();
 async function state(){input.assertOpen();const v=await input.store.read() as NativeAssetState|null;input.assertOpen();if(v&&(v.schema!=='bank.native-assets.v1'||!Array.isArray(v.history)||v.history.length>1000||!v.current||!['unknown','committed','zero-write'].includes(v.current.state)))fail('CHECKPOINT_INVALID');if(v){for(const c of [...v.history,v.current]){if(!['unknown','committed','zero-write'].includes(c.state)||c.state!=='unknown'&&c.source?.status!==c.state)fail('CHECKPOINT_INVALID');const r=preparedReview(c.prepared);if(!isBankNativeApplicationId(r.request.applicationId)||r.keyId!==input.keyId||r.request.actorReceizId!==input.ownerReceizId||c.consentProof?.keyId!==input.keyId||c.consentProof.challengeB64Url!==nativeAssetChallenge(r))fail('CHECKPOINT_INVALID');}}return v;}
 const unknown=(c:Checkpoint):NativeAssetResult=>({status:'unknown',operationId:c.prepared.request.requestId});
 async function committed(value:NativeAssetState,raw:unknown):Promise<NativeAssetResult>{const {packet}=await verifyNativeAssetSource(raw,preparedReview(value.current.prepared));input.assertOpen();await input.store.write({...value,current:{...value.current,state:packet.status,source:packet}},value);input.assertOpen();if(packet.status==='committed')input.onCommitted?.();return packet.status==='committed'?{status:'committed',nativeAssetSource:packet}:{status:'zero-write',reasonCode:'EXPIRED'};}
 async function resolve(approved=false):Promise<NativeAssetResult|null>{return input.lock(async()=>{const value=await state();if(!value)return null;
  if(value.current.state!=='unknown'){const {packet}=await verifyNativeAssetSource(value.current.source,preparedReview(value.current.prepared));input.assertOpen();return packet.status==='committed'?{status:'committed',nativeAssetSource:packet}:{status:'zero-write',reasonCode:'EXPIRED'};}
  if(!approved)fail('RECOVERY_CONSENT_REQUIRED');const c=value.current,p=c.prepared;input.assertOpen();const raw=await input.request(path('recover',p.request.applicationId),{nonce:p.request.requestId,planDigest:p.planDigest,ticket:p.ticket},true);input.assertOpen();
  if((raw as {status?:unknown})?.status==='unknown')return unknown(c);return committed(value,raw);
 });}
 const recovery:BankExecutionRecovery={status:async()=>{const s=await state();if(!s)return null;if(s.current.state!=='unknown')await verifyNativeAssetSource(s.current.source,preparedReview(s.current.prepared));return{operationId:s.current.prepared.request.requestId,operationKind:'asset.execution',planDigest:s.current.prepared.planDigest,state:s.current.state,hasRecovery:s.current.state==='committed'};},resolve,exportRecovery:async()=>{const value=await state();if(!value||value.current.state!=='committed')fail('COMMITTED_RECOVERY_REQUIRED');const {packet}=await verifyNativeAssetSource(value.current.source,preparedReview(value.current.prepared));input.assertOpen();return{bytes:new TextEncoder().encode(JSON.stringify(packet)),filename:`asset-${value.current.prepared.planDigest}.receiz-asset.json`};}};
 return Object.freeze({recovery,
  async prepare(operation:BankOperationInput):Promise<BankOperationReview>{return input.lock(async()=>{
   await input.assertNoOtherPending?.();input.assertOpen();const s=await state();if(s?.current.state==='unknown')throw Error('BANK_EXECUTION_PENDING');if(operation.kind==='send-value')fail('UNSUPPORTED');
   const request={...operation,schema:'bankeiz.operation-request.v1' as const,applicationId:BANK_APPLICATION_ID,requestId:crypto.randomUUID(),actorReceizId:input.ownerReceizId};
   const raw=await input.request(path('prepare'),request),p=raw as NativeAssetPrepared;input.assertOpen();
   if(!p||Object.keys(p).sort().join('|')!=='challengeB64Url|keyId|planDigest|request|schema|terms|ticket'||typeof p.ticket!=='string'||!p.ticket||p.ticket.length>65536)fail('REVIEW_INVALID');
   const r=preparedReview(p);if(!assetSame(r.request,request)||r.keyId!==input.keyId||p.challengeB64Url!==nativeAssetChallenge(r))fail('REVIEW_INVALID');
   const sdk=await loadReceiz();if(sdk.receizKaiNow().uPulse>=r.terms.expiresAtKaiUPulse)throw Error('BANK_OPERATION_EXPIRED');
   const review=Object.freeze({request:Object.freeze(structuredClone(request)),terms:Object.freeze(r.terms),confirmationDigest:await sdk.digestReceizCanonicalV122(r)});held.set(review,structuredClone(p));return review;
  });},
  async execute(review:BankOperationReview,confirmationDigest:string):Promise<NativeAssetResult>{return input.lock(async()=>{
   input.assertOpen();await input.assertNoOtherPending?.();input.assertOpen();const p=held.get(review);if(!p||confirmationDigest!==review.confirmationDigest)throw Error('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
   const previous=await state();if(previous?.current.state==='unknown')throw Error('BANK_EXECUTION_PENDING');const sdk=await loadReceiz();if(sdk.receizKaiNow().uPulse>=p.terms.expiresAtKaiUPulse)throw Error('BANK_OPERATION_EXPIRED');
   const consentProof=await input.sign(p.challengeB64Url);input.assertOpen();if(consentProof.keyId!==input.keyId||consentProof.challengeB64Url!==p.challengeB64Url)fail('CONSENT_INVALID');
   const value:NativeAssetState={schema:'bank.native-assets.v1',current:{prepared:p,consentProof,state:'unknown'},history:previous?[...previous.history,previous.current]:[]};if(value.history.length>1000)fail('CAPACITY');
   await input.store.write(value,previous);held.delete(review);input.assertOpen();
   let raw:unknown;try{raw=await input.request(path('execute'),{...p,consentProof});}catch{return unknown(value.current);}input.assertOpen();
   try{return await committed(value,raw);}catch{return unknown(value.current);}
  });},
  discard(review:BankOperationReview){held.delete(review);},
 });
}
