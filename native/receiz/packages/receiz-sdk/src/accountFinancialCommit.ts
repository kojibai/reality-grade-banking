import {ReceizFinancialWalletCustodyCancelledBeforeAssertion,receizFinancialWalletCredentialClaims,MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES,prepareReceizFinancialWalletCustodyChallenge,verifyReceizFinancialWalletCustodyAssertion,type ReceizFinancialWalletCustodyChallenge} from './accountFinancialWalletCustody.js';
import type {ReceizOfflineNoteRollbackAssertion} from './offlineNoteRollbackConformance.js';
import {sha256ReceizBytes}from './artifacts.js';
import {receizBase64UrlDecode as dec,receizBase64UrlEncode as enc,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof}from './identity.js';
import {canonicalizeReceizV122 as canonical,digestReceizCanonicalV122 as digest}from './v122Canonical.js';
import {receizKaiNow}from './v124Kai.js';
import type{ReceizAdmissionStore,ReceizAdmissionAggregate}from './admissionStore.js';
import type{ReceizConstitutionJson}from './constitution.js';
import {assertReceizAccountFinancialWalletProofCapacity,readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource}from './accountFinancialSource.js';
import {projectReceizAccountFinancialAction,type ReceizAccountFinancialState,type ReceizAccountSendAction,type ReceizAccountMarketAction}from './accountFinancialExecution.js';
import {admitReceizAccountMarketOrderRequest,exportReceizAccountMarketOrderRequest,type ReceizVerifiedAccountMarketOrderRequest}from './accountMarketOrder.js';
import {projectReceizAccountMarketOrderFunding}from './accountMarketOrderFunding.js';
type ReserveAction=Readonly<{kind:'reserve-market-order';requestOriginalB64u:string}>;
export type ReceizAccountFinancialAction=ReceizAccountSendAction|ReceizAccountMarketAction|ReserveAction;
type Effect=ReturnType<typeof projectReceizAccountFinancialAction>['effect']|Awaited<ReturnType<typeof projectReceizAccountMarketOrderFunding>>['effect'];
type RecordValue=Record<string,unknown>;
const utf8=new TextEncoder(),UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
function fail(code:string):never{throw new TypeError('ACCOUNT_FINANCIAL_'+code);}
function object(v:unknown):RecordValue{if(!v||typeof v!=='object'||Array.isArray(v))fail('RECORD');return v as RecordValue;}
function exact(v:unknown,keys:readonly string[]):RecordValue{const r=object(v);if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))fail('RECORD_FIELDS');return r;}
function same(a:unknown,b:unknown){if(canonical(a)!==canonical(b))fail('ORIGINAL_MISMATCH');}
function text(v:unknown):string{if(typeof v!=='string')fail('RECORD');return v;}
function freeze<T>(v:T):T{if(v&&typeof v==='object'){for(const n of Object.values(v))freeze(n);Object.freeze(v);}return v;}
function b64(v:unknown,length?:number){const s=text(v),b=dec(s);if(enc(b)!==s||length!==undefined&&b.length!==length)fail('ENCODING');return b;}
const json=(v:unknown):ReceizConstitutionJson=>JSON.parse(canonical(v))as ReceizConstitutionJson;
function actionSnapshot(v:ReceizAccountFinancialAction):ReceizAccountFinancialAction{const r=structuredClone(v);if(r.kind==='reserve-market-order'){exact(r,['kind','requestOriginalB64u']);if(typeof r.requestOriginalB64u!=='string'||r.requestOriginalB64u.length>90000)fail('ORDER_REQUEST');return json(r)as ReserveAction;}if(r.kind==='send'){const{note,...base}=r;if(note!==undefined&&typeof note!=='string')fail('NOTE');const normalized=note?.replace(/\s+/gu,' ').trim();if((normalized?.length??0)>280)fail('NOTE');return json({...base,...(normalized?{note:normalized}:{})})as ReceizAccountFinancialAction;}return json(r)as ReceizAccountFinancialAction;}
const ownerChallenge=(v:unknown)=>'receiz.account-financial-operation.owner.v1\0'+canonical(v);
const custodyChallenge=(command:unknown,ownerConsent:unknown)=>utf8.encode('receiz.account-financial-operation.custody.v1\0'+canonical({command,ownerConsent}));
type WalletCommandKind='spend'|'release';
type WalletDraftPhase='ready'|'attempted'|'recovering'|'cancelled';
type SignedWalletCommand=Readonly<{command:RecordValue;ownerConsent:ReceizIdentityLoginProof;custodianSignature:string}>;
async function verifyFinancialCommandSignatures(source:ReceizAccountFinancialSource,kind:WalletCommandKind,command:RecordValue,ownerConsent:unknown,custodianSignature:unknown){
 const proof=exact(ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url']);
 const program=object(readReceizAccountFinancialSourceCustody(source).body.program),identity=object(program.identity),signer=object(program.custodian);
 const owner=kind==='spend'?ownerChallenge(command):releaseOwnerChallenge(command);
 if(proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==identity.keyId||proof.alg!==identity.alg||proof.challengeB64Url!==enc(utf8.encode(owner))||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:text(identity.keyId),alg:identity.alg as 'Ed25519'|'P-256',publicKeyRawB64u:text(identity.publicKeyRawB64u),challengeB64Url:text(proof.challengeB64Url),signatureB64Url:text(proof.signatureB64Url)}))fail('OWNER_CONSENT');
 const key=await crypto.subtle.importKey('raw',b64(signer.publicKeyRawB64u,32).slice().buffer,'Ed25519',false,['verify']);
 const challenge=kind==='spend'?custodyChallenge(command,proof):releaseCustodyChallenge(command,proof);
 if(!await crypto.subtle.verify('Ed25519',key,b64(custodianSignature,64).slice().buffer,challenge))fail('RECORD_SIGNER');
 return proof as ReceizIdentityLoginProof;
}
export type ReceizVerifiedAccountFinancialOperation=Readonly<{status:'verified-account-financial-operation';artifactSha256:string;allocationId:string;operationId:string;requestDigest:string;predecessorArtifactSha256:string;predecessorOperationId:string|null;sequence:string;atKaiUPulse:string;action:ReceizAccountFinancialAction;effect:Effect;nextState:ReceizAccountFinancialState}>;
type OperationCustody=Readonly<{sourceSha256:string;bytes:Uint8Array;body:RecordValue;command:RecordValue;commandDigest:string;parent:ReceizVerifiedAccountFinancialOperation|null}>;
const operations=new WeakMap<ReceizVerifiedAccountFinancialOperation,OperationCustody>();
function requireOperation(op:ReceizVerifiedAccountFinancialOperation){const c=operations.get(op);if(!c)fail('OPERATION_CUSTODY_REQUIRED');return c;}
/** Internal provider composition; a projected operation label conveys no custody. */
export function readReceizAccountFinancialOperationCustody(op:ReceizVerifiedAccountFinancialOperation){const c=requireOperation(op);return Object.freeze({sourceSha256:c.sourceSha256,commandDigest:c.commandDigest,artifactBytes:()=>c.bytes.slice()});}
async function requestDigest(source:ReceizAccountFinancialSource,id:string,action:ReceizAccountFinancialAction){return digest({schema:'receiz.account-financial-request.v1',sourceArtifactSha256:source.artifactSha256,operationId:id,action});}

/** Historical inspection is not local acceptance. A signed candidate remains
 * a candidate until the actual retained register consumes its exact parent. */
function financialEnvelope(input:Uint8Array,source:ReceizAccountFinancialSource){
 // Whole funded-original admission precedes native succession. This append
 // grants no funding independently of source custody and admitted ancestry.
 const {walletCustody}=readReceizAccountFinancialSourceCustody(source);
 const original=input.slice(),raw=new TextDecoder('utf-8',{fatal:true}).decode(original),parsed=object(JSON.parse(raw)),body=exact(parsed,['schema','allocationId','sourceArtifactSha256','operationId','requestDigest','predecessorArtifactSha256','predecessorOperationId','sequence','atKaiUPulse','action','effect','nextState',...(parsed.schema==='receiz.account-market-order-reservation.v1'?[]:['ownerConsent','custodianSignature']),...(walletCustody?['walletCustodyAssertion']:[])]);
 return{original,body,raw};
}
export async function admitReceizAccountFinancialOperation(input:Uint8Array,options:Readonly<{source:ReceizAccountFinancialSource;predecessor?:ReceizVerifiedAccountFinancialOperation|null}>):Promise<ReceizVerifiedAccountFinancialOperation>{
 return admitFinancialEnvelope(financialEnvelope(input,options.source),options.source,options.predecessor??null);
}
async function admitFinancialEnvelope(envelope:Awaited<ReturnType<typeof financialEnvelope>>,source:ReceizAccountFinancialSource,parent:ReceizVerifiedAccountFinancialOperation|null):Promise<ReceizVerifiedAccountFinancialOperation>{
 const custody=readReceizAccountFinancialSourceCustody(source),previous=parent?requireOperation(parent):null;
 if(previous&&previous.sourceSha256!==source.artifactSha256)fail('SOURCE_MISMATCH');
 const{original,body,raw}=envelope;
 if(body.schema==='receiz.account-market-order-reservation.v1'){
  const action=actionSnapshot(body.action as ReserveAction);if(action.kind!=='reserve-market-order')fail('ORDER_REQUEST');
  const request=await admitReceizAccountMarketOrderRequest(b64(action.requestOriginalB64u),{source,predecessor:parent});
  const projected=await projectReceizAccountMarketOrderFunding({source,predecessor:parent,request});
  const command={schema:'receiz.account-market-order-reservation.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:request.orderId,requestDigest:await requestDigest(source,request.orderId,action),predecessorArtifactSha256:request.predecessorArtifactSha256,predecessorOperationId:request.predecessorOperationId,sequence:projected.next.sequence,atKaiUPulse:request.orderKaiUPulse,action,effect:projected.effect,nextState:projected.next};
  same(body,command);if(canonical(body)!==raw)fail('CAUSAL_ORIGINAL');
  freeze(body);const accepted=Object.freeze({status:'verified-account-financial-operation'as const,artifactSha256:await sha256ReceizBytes(original),allocationId:source.allocationId,operationId:request.orderId,requestDigest:command.requestDigest,predecessorArtifactSha256:request.predecessorArtifactSha256,predecessorOperationId:request.predecessorOperationId,sequence:projected.next.sequence,atKaiUPulse:request.orderKaiUPulse,action,effect:body.effect as Effect,nextState:body.nextState as ReceizAccountFinancialState});
  operations.set(accepted,{sourceSha256:source.artifactSha256,bytes:original,body,command,commandDigest:await digest(command),parent});return accepted;
 }
 if(canonical(body)!==raw||body.schema!=='receiz.account-financial-operation.v1'||body.allocationId!==source.allocationId||body.sourceArtifactSha256!==source.artifactSha256||!UUID.test(text(body.operationId))||body.predecessorArtifactSha256!==(parent?.artifactSha256??source.artifactSha256)||body.predecessorOperationId!==(parent?.operationId??null))fail('CAUSAL_ORIGINAL');
 const action=actionSnapshot(body.action as ReceizAccountFinancialAction);if(action.kind==='reserve-market-order')fail('CAUSAL_ORIGINAL');same(action,body.action);
 if(action.kind==='send'&&action.nearby===true)assertReceizAccountFinancialWalletProofCapacity(source,original.byteLength);
 if(body.requestDigest!==await requestDigest(source,text(body.operationId),action))fail('REQUEST_DIGEST');
 const state=parent?.nextState??custody.body.initialState as ReceizAccountFinancialState,projected=projectReceizAccountFinancialAction(source,state,action,text(body.atKaiUPulse));
 same(projected.effect,body.effect);same(projected.next,body.nextState);if(body.sequence!==projected.next.sequence)fail('SEQUENCE');
 const command=Object.fromEntries(Object.entries(body).filter(([k])=>k!=='ownerConsent'&&k!=='custodianSignature'&&k!=='walletCustodyAssertion'));
 const proof=await verifyFinancialCommandSignatures(source,'spend',command,body.ownerConsent,body.custodianSignature);
 if(custody.walletCustody){
  const binding=custody.walletCustody,challenge=await prepareReceizFinancialWalletCustodyChallenge({binding,kind:'spend',sequence:text(body.sequence),command,ownerConsent:proof});
  await verifyReceizFinancialWalletCustodyAssertion(binding,challenge,body.walletCustodyAssertion);
 }
 freeze(body);const accepted=Object.freeze({status:'verified-account-financial-operation'as const,artifactSha256:await sha256ReceizBytes(original),allocationId:source.allocationId,operationId:text(body.operationId),requestDigest:text(body.requestDigest),predecessorArtifactSha256:text(body.predecessorArtifactSha256),predecessorOperationId:body.predecessorOperationId as string|null,sequence:text(body.sequence),atKaiUPulse:text(body.atKaiUPulse),action:body.action as ReceizAccountFinancialAction,effect:body.effect as Effect,nextState:body.nextState as ReceizAccountFinancialState});
 operations.set(accepted,{sourceSha256:source.artifactSha256,bytes:original,body,command,commandDigest:await digest(command),parent});return accepted;
}

/** Exact custody handback. This changes no monetary amount and is not a
 * transaction or a public payment receipt. Global release must independently
 * accept this Original only after the exact financial prefix is retained. */
export type ReceizVerifiedAccountFinancialRelease=Readonly<{status:'verified-account-financial-release';artifactSha256:string;allocationId:string;sourceArtifactSha256:string;financialHeadArtifactSha256:string;financialHeadOperationId:string|null;sequence:string;atKaiUPulse:string}>;
const releases=new WeakMap<ReceizVerifiedAccountFinancialRelease,Readonly<{bytes:Uint8Array;commandDigest:string}>>();
const releaseOwnerChallenge=(v:unknown)=>'receiz.account-financial-release.owner.v1\0'+canonical(v);
const releaseCustodyChallenge=(command:unknown,ownerConsent:unknown)=>utf8.encode('receiz.account-financial-release.custody.v1\0'+canonical({command,ownerConsent}));
function releaseReceipt(release:ReceizVerifiedAccountFinancialRelease){return{schema:'receiz.account-financial-release-commit.v1',allocationId:release.allocationId,sourceArtifactSha256:release.sourceArtifactSha256,artifactSha256:release.artifactSha256,financialHeadArtifactSha256:release.financialHeadArtifactSha256,sequence:release.sequence,atKaiUPulse:release.atKaiUPulse};}
export function exportReceizAccountFinancialRelease(release:ReceizVerifiedAccountFinancialRelease){const held=releases.get(release);if(!held)fail('RELEASE_CUSTODY_REQUIRED');return held.bytes.slice();}
export async function admitReceizAccountFinancialRelease(input:Uint8Array,options:Readonly<{source:ReceizAccountFinancialSource;financialHead?:ReceizVerifiedAccountFinancialOperation|null}>):Promise<ReceizVerifiedAccountFinancialRelease>{
 const source=options.source,custody=readReceizAccountFinancialSourceCustody(source),parent=options.financialHead??null;
 if(parent&&requireOperation(parent).sourceSha256!==source.artifactSha256)fail('SOURCE_MISMATCH');
 const bytes=input.slice(),raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),body=exact(JSON.parse(raw),['schema','allocationId','sourceArtifactSha256','financialHeadArtifactSha256','financialHeadOperationId','sequence','atKaiUPulse','ownerConsent','custodianSignature',...(custody.walletCustody?['walletCustodyAssertion']:[])]);
 if(canonical(body)!==raw||body.schema!=='receiz.account-financial-release.v1'||body.allocationId!==source.allocationId||body.sourceArtifactSha256!==source.artifactSha256||body.financialHeadArtifactSha256!==(parent?.artifactSha256??source.artifactSha256)||body.financialHeadOperationId!==(parent?.operationId??null)||body.sequence!==(parent?.sequence??'0'))fail('RELEASE_PARENT');
 const at=text(body.atKaiUPulse),state=parent?.nextState??custody.body.initialState as ReceizAccountFinancialState;
 if(state.orderEscrows?.length)fail('OPEN_ORDERS');
 if(!/^[1-9][0-9]{0,18}$/u.test(at)||BigInt(at)>((1n<<63n)-1n)||BigInt(at)<=BigInt(state.lastKaiUPulse))fail('RELEASE_PULSE');
 const command=Object.fromEntries(Object.entries(body).filter(([key])=>key!=='ownerConsent'&&key!=='custodianSignature'&&key!=='walletCustodyAssertion'));
 const proof=await verifyFinancialCommandSignatures(source,'release',command,body.ownerConsent,body.custodianSignature);
 if(custody.walletCustody){
  const binding=custody.walletCustody,challenge=await prepareReceizFinancialWalletCustodyChallenge({binding,kind:'release',sequence:text(body.sequence),command,ownerConsent:proof});
  await verifyReceizFinancialWalletCustodyAssertion(binding,challenge,body.walletCustodyAssertion);
 }
 const accepted=Object.freeze({status:'verified-account-financial-release'as const,artifactSha256:await sha256ReceizBytes(bytes),allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,financialHeadArtifactSha256:text(body.financialHeadArtifactSha256),financialHeadOperationId:body.financialHeadOperationId as string|null,sequence:text(body.sequence),atKaiUPulse:at});
 releases.set(accepted,{bytes,commandDigest:await digest(command)});return accepted;
}

export type ReceizAccountFinancialCommit=Readonly<{status:'committed';publication:'pending';operation:ReceizVerifiedAccountFinancialOperation}>;
const commits=new WeakSet<ReceizAccountFinancialCommit>();
export function exportReceizAccountFinancialCommit(commit:ReceizAccountFinancialCommit):Uint8Array{if(!commits.has(commit))fail('COMMIT_CUSTODY_REQUIRED');return requireOperation(commit.operation).bytes.slice();}
/** Durable exact-byte retention supplied by the host's existing original store.
 * Coordination storage carries references only and grants no artifact custody. */
export type ReceizAccountFinancialOriginalStore=Readonly<{retain(sha256:string,bytes:Uint8Array):Promise<void>;read(sha256:string):Promise<Uint8Array|null>}>;
type ExecutorOptions=Readonly<{originals:ReceizAccountFinancialOriginalStore;source:ReceizAccountFinancialSource;store:ReceizAdmissionStore;signOwner(challengeText:string):Promise<ReceizIdentityLoginProof>;signRecord(bytes:Uint8Array):Promise<Uint8Array>;
 /** Device custody must resume the same retained assertion for the exact challenge.
  * Only ReceizFinancialWalletCustodyCancelledBeforeAssertion confirms that this
  * attempt never advanced the credential. All other errors preserve the draft. */
 assertWalletCustody?(request:ReceizFinancialWalletCustodyChallenge):Promise<ReceizOfflineNoteRollbackAssertion>;
 /** Trusted host/test clock; never a payment request field. */kai?:()=>string}>;
/** Normal admitted Identity signing + the existing SDK record signer. No
 * enrollment, network, PBI, or hardware ceremony occurs in this path. */
export async function createReceizAccountFinancialExecutor(options:ExecutorOptions){
 const source=options.source,custody=readReceizAccountFinancialSourceCustody(source),store=options.store,headId='account-financial:'+source.allocationId;
 const stageId=(id:string)=>headId+':original:'+id,idem=(id:string)=>headId+':operation:'+id;
 const clock=options.kai??(()=>String(receizKaiNow().uPulse));
 const memo=new Map<string,ReceizVerifiedAccountFinancialOperation>(),lineage=new Set<string>(),bySequence=new Map<string,ReceizVerifiedAccountFinancialOperation>();
 let knownHead=source.artifactSha256,knownRelease:ReceizVerifiedAccountFinancialRelease|null=null,tail=Promise.resolve();
 async function serial<T>(work:()=>Promise<T>):Promise<T>{const before=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await before;try{return await work();}finally{release();}}
 async function seed(id:string,digestValue:string,state:unknown){const prior=await store.readAggregate(id);if(prior)return prior;try{await store.seedAggregate({aggregateId:id,revision:0,headDigest:digestValue,state:json(state)});}catch(error){if(!await store.readAggregate(id))throw error;}return(await store.readAggregate(id))!;}
 async function retainExact(sha256:string,bytes:Uint8Array){
  await options.originals.retain(sha256,bytes.slice());
  const retained=await options.originals.read(sha256);
  if(!(retained instanceof Uint8Array)||await sha256ReceizBytes(retained)!==sha256)fail('ORIGINAL_RETENTION_REQUIRED');
 }
 await retainExact(source.artifactSha256,custody.artifactBytes());
 if(custody.walletCustody){
  const {publicKey} = await receizFinancialWalletCredentialClaims(custody.walletCustody);
  const heldCredential = await seed('account-financial-wallet-credential:'+publicKey,source.allocationId,{allocationId:source.allocationId});
  if(heldCredential.headDigest!==source.allocationId||object(heldCredential.state).allocationId!==source.allocationId)
   fail('WALLET_CUSTODY_ALREADY_ALLOCATED');
 }
 const sourceKey = custody.receivedWallet?'account-financial-received-wallet:'+source.allocationId:'account-financial-source:'+source.artifactSha256;
 const originalSeed=await seed(sourceKey,source.artifactSha256,{artifactSha256:source.artifactSha256});
 if(originalSeed.headDigest!==source.artifactSha256||object(originalSeed.state).artifactSha256!==source.artifactSha256)
  fail(custody.receivedWallet?'RECEIVED_WALLET_ORIGINAL_CONFLICT':'RETAINED_SOURCE');
 await seed(headId,source.artifactSha256,{operationId:null});
 async function stage(id:string){const row=await store.readAggregate(stageId(id));if(!row)return null;const state=exact(row.state,['requestDigest']);if(row.revision!==0||typeof row.headDigest!=='string')fail('RETAINED_ORIGINAL');return{row,state};}

 async function open(id:string,ancestors=new Set<string>()):Promise<ReceizVerifiedAccountFinancialOperation>{
  if(!UUID.test(id))fail('OPERATION_ID');if(ancestors.has(id))fail('CAUSAL_CYCLE');ancestors.add(id);
  const saved=await stage(id);if(!saved)fail('RETAINED_ORIGINAL_REQUIRED');const hit=memo.get(saved.row.headDigest!);if(hit){if(hit.operationId!==id||hit.requestDigest!==saved.state.requestDigest)fail('RETAINED_ORIGINAL');return hit;}
  // Resolve the parent name only as a locator. Whole-source custody and
  // exact predecessor admission below must still succeed before any use.
  const bytes=await options.originals.read(saved.row.headDigest!);if(!(bytes instanceof Uint8Array))fail('ORIGINAL_RETENTION_REQUIRED');
  const envelope=financialEnvelope(bytes,source);
  const parent=envelope.body.predecessorOperationId===null?null:await open(text(envelope.body.predecessorOperationId),ancestors);
  const op=await admitFinancialEnvelope(envelope,source,parent);
  if(op.artifactSha256!==saved.row.headDigest||op.operationId!==id||op.requestDigest!==saved.state.requestDigest)fail('RETAINED_ORIGINAL');memo.set(op.artifactSha256,op);return op;
 }
 async function head():Promise<{row:ReceizAdmissionAggregate;operation:ReceizVerifiedAccountFinancialOperation|null;state:ReceizAccountFinancialState;release:ReceizVerifiedAccountFinancialRelease|null}>{
  const row=await store.readAggregate(headId);if(!row)fail('HEAD_REQUIRED');const state=exact(row.state,Object.hasOwn(object(row.state),'releaseArtifactSha256')?['operationId','releaseArtifactSha256']:['operationId']);
  const op=state.operationId===null?null:await open(text(state.operationId));
  if(knownRelease&&state.releaseArtifactSha256!==knownRelease.artifactSha256)fail('HEAD_ROLLBACK');
  let release:ReceizVerifiedAccountFinancialRelease|null=knownRelease;
  if(state.releaseArtifactSha256!==undefined&&!release){
   const bytes=await options.originals.read(text(state.releaseArtifactSha256));if(!(bytes instanceof Uint8Array))fail('ORIGINAL_RETENTION_REQUIRED');release=await admitReceizAccountFinancialRelease(bytes,{source,financialHead:op});if(release.artifactSha256!==state.releaseArtifactSha256)fail('HEAD_ORIGINAL');
   const receipt=await store.readIdempotency(headId+':release');if(!receipt||receipt.commandDigest!==releases.get(release)!.commandDigest)fail('RELEASE_COMMIT_RECEIPT');same(receipt.receipt,releaseReceipt(release));
  }
  const financialHead=op?.artifactSha256??source.artifactSha256;
  if(release&&(release.financialHeadArtifactSha256!==financialHead||release.financialHeadOperationId!==(op?.operationId??null)||release.sequence!==(op?.sequence??'0')))fail('HEAD_ORIGINAL');
  if(row.headDigest!==(release?.artifactSha256??financialHead)||row.revision!==Number(op?.sequence??'0')+(release?1:0))fail('HEAD_ORIGINAL');
  let cursor=op;const observed:ReceizVerifiedAccountFinancialOperation[]=[];while(cursor&&cursor.artifactSha256!==knownHead){observed.push(cursor);cursor=requireOperation(cursor).parent;}
  if(!cursor&&knownHead!==source.artifactSha256)fail('HEAD_ROLLBACK');knownHead=financialHead;if(release)knownRelease=release;lineage.add(source.artifactSha256);for(const item of observed){lineage.add(item.artifactSha256);bySequence.set(item.sequence,item);}
  return{row,operation:op,state:op?.nextState??custody.body.initialState as ReceizAccountFinancialState,release};
 }
 function receipt(op:ReceizVerifiedAccountFinancialOperation){return{schema:'receiz.account-financial-commit.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:op.operationId,artifactSha256:op.artifactSha256,sequence:op.sequence,atKaiUPulse:op.atKaiUPulse};}
 async function recorded(id:string,currentHead?:Awaited<ReturnType<typeof head>>):Promise<ReceizAccountFinancialCommit|null>{const r=await store.readIdempotency(idem(id));if(!r)return null;const current=currentHead??await head(),op=await open(id);same(r.receipt,receipt(op));if(r.commandDigest!==requireOperation(op).commandDigest||!lineage.has(op.artifactSha256)||current.row.revision<Number(op.sequence))fail('COMMIT_RECEIPT');const result=Object.freeze({status:'committed'as const,publication:'pending'as const,operation:op});commits.add(result);return result;}
 async function signCommand(kind:WalletCommandKind,command:RecordValue):Promise<SignedWalletCommand>{
  const ownerConsent=await options.signOwner(kind==='spend'?ownerChallenge(command):releaseOwnerChallenge(command));
  const challenge=kind==='spend'?custodyChallenge(command,ownerConsent):releaseCustodyChallenge(command,ownerConsent);
  const custodianSignature = enc(await options.signRecord(challenge));
  const signedEnvelope = {...command,ownerConsent,custodianSignature,walletCustodyAssertion:null};
  const maximumBytes = utf8.encode(canonical(signedEnvelope)).byteLength+MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES;
  if(kind==='release'&&maximumBytes>65_536)fail('RELEASE_ORIGINAL');
  if(kind==='spend'&&object(command.action).nearby===true)assertReceizAccountFinancialWalletProofCapacity(source,maximumBytes);
  return {command,ownerConsent,custodianSignature};
 }
 async function advanceWalletDraft(id:string,row:ReceizAdmissionAggregate,priorArtifactSha256:string,nextDigest:string,
   nextState:Readonly<{intentDigest:string;kind:WalletCommandKind;phase:WalletDraftPhase}>){
  const state=json(nextState),revision=row.revision+1;
  const reference=json({kind:'wallet-custody-draft',phase:nextState.phase,draftDigest:nextDigest});
  const commandDigest=await digest({id,revision,priorDraftDigest:row.headDigest,nextDigest,state});
  let committed=false;
  try{
   const result=await store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:id,commandDigest,
    idempotencyKey:id+':revision:'+revision,expectedRevision:row.revision,expectedHeadDigest:row.headDigest,
    readDependencies:[{aggregateId:headId,expectedHeadDigest:priorArtifactSha256}],
    acceptedCommand:reference,events:[],nextHead:{revision,digest:nextDigest,state},resourceEffects:{},
    receipt:reference,outboxIntents:[],auditReference:reference});
   committed=result.status==='committed';
  }catch{/* A lost admission reply cannot establish who owns the first attempt. */}
  if(committed)return {revision,headDigest:nextDigest,state};
  const latest=await store.readAggregate(id);
  if(!latest||latest.revision<=row.revision)fail('WALLET_CUSTODY_DRAFT_PERSISTENCE_REQUIRED');
  return null;
 }
 // Pin the exact owner-signed challenge before requesting the irreversible
 // device assertion. A retry records that another attempt may have signed
 // before entering the provider, fencing any earlier cancellation.
 async function prepareWalletCommand(kind:WalletCommandKind,priorArtifactSha256:string,intentDigest:string,create:()=>Promise<RecordValue>){
  const binding=custody.walletCustody,assertWalletCustody=options.assertWalletCustody;
  if(!binding){const {command,...signatures}=await signCommand(kind,await create());return {...command,...signatures};}
  if(!assertWalletCustody)fail('WALLET_CUSTODY_REQUIRED');
  const id=headId+':wallet-custody-draft:'+priorArtifactSha256;
  const intent={intentDigest,kind};
  while(true){
   let row=await store.readAggregate(id);
   if(!row||object(row.state).phase==='cancelled'){
    const made=await signCommand(kind,await create()),bytes=utf8.encode(canonical(made)),sha=await sha256ReceizBytes(bytes);
    await retainExact(sha,bytes);
    const state={...intent,phase:'ready' as const};
    row=row?await advanceWalletDraft(id,row,priorArtifactSha256,sha,state):await seed(id,sha,state);
    if(!row)continue;
   }
   const legacy=row.revision===0&&!Object.hasOwn(object(row.state),'phase');
   const draft=exact(row.state,legacy?['intentDigest','kind']:['intentDigest','kind','phase']);
   const phase=legacy?'recovering':draft.phase;
   if(draft.intentDigest!==intentDigest||draft.kind!==kind||typeof row.headDigest!=='string'
     ||(phase!=='ready'&&phase!=='attempted'&&phase!=='recovering'))fail('WALLET_CUSTODY_DRAFT_CONFLICT');
   const bytes=await options.originals.read(row.headDigest);
   if(!(bytes instanceof Uint8Array)||await sha256ReceizBytes(bytes)!==row.headDigest)fail('ORIGINAL_RETENTION_REQUIRED');
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),signed=exact(JSON.parse(raw),['command','ownerConsent','custodianSignature']);
   if(canonical(signed)!==raw)fail('WALLET_CUSTODY_DRAFT_CONFLICT');
   const command=object(signed.command),expectedHead=kind==='spend'?command.predecessorArtifactSha256:command.financialHeadArtifactSha256;
   if(command.allocationId!==source.allocationId||command.sourceArtifactSha256!==source.artifactSha256||expectedHead!==priorArtifactSha256
     ||kind==='spend'&&command.requestDigest!==intentDigest)fail('WALLET_CUSTODY_DRAFT_CONFLICT');
   const ownerConsent=await verifyFinancialCommandSignatures(source,kind,command,signed.ownerConsent,signed.custodianSignature);
   const challenge=await prepareReceizFinancialWalletCustodyChallenge({binding,kind,sequence:text(command.sequence),command,ownerConsent});
   const firstAttempt=phase==='ready'
    ? await advanceWalletDraft(id,row,priorArtifactSha256,row.headDigest,{...intent,phase:'attempted'}) : null;
   if(phase==='ready'&&!firstAttempt)continue;
   if(phase==='attempted'&&!await advanceWalletDraft(id,row,priorArtifactSha256,row.headDigest,{...intent,phase:'recovering'}))continue;
   let assertion:ReceizOfflineNoteRollbackAssertion;
   try{assertion=await assertWalletCustody(challenge);}
   catch(error){
    if(firstAttempt&&error instanceof ReceizFinancialWalletCustodyCancelledBeforeAssertion){
     await advanceWalletDraft(id,firstAttempt,priorArtifactSha256,row.headDigest,{...intent,phase:'cancelled'});
    }
    throw error;
   }
   return {...command,ownerConsent,custodianSignature:text(signed.custodianSignature),
    walletCustodyAssertion:await verifyReceizFinancialWalletCustodyAssertion(binding,challenge,assertion)};
  }
 }
 async function build(id:string,action:ReceizAccountFinancialAction,parent:ReceizVerifiedAccountFinancialOperation|null,state:ReceizAccountFinancialState,at:string){
  if(action.kind==='reserve-market-order'){
   const request=await admitReceizAccountMarketOrderRequest(b64(action.requestOriginalB64u),{source,predecessor:parent});
   if(request.orderId!==id||request.orderKaiUPulse!==at)fail('ORDER_REQUEST');
   const projection=await projectReceizAccountMarketOrderFunding({source,predecessor:parent,request});
   const command={schema:'receiz.account-market-order-reservation.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:id,requestDigest:await requestDigest(source,id,action),predecessorArtifactSha256:parent?.artifactSha256??source.artifactSha256,predecessorOperationId:parent?.operationId??null,sequence:projection.next.sequence,atKaiUPulse:at,action,effect:projection.effect,nextState:projection.next};
   // The carried request already signs every input; the exact deterministic
   // financial projection is admitted without another prompt or document seal.
   return admitReceizAccountFinancialOperation(utf8.encode(canonical(command)),{source,predecessor:parent});
  }
  const predecessorArtifactSha256=parent?.artifactSha256??source.artifactSha256,wanted=await requestDigest(source,id,action);
  const body=await prepareWalletCommand('spend',predecessorArtifactSha256,wanted,async()=>{
   const projection=projectReceizAccountFinancialAction(source,state,action,at);
   return {schema:'receiz.account-financial-operation.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:id,requestDigest:wanted,predecessorArtifactSha256,predecessorOperationId:parent?.operationId??null,sequence:projection.next.sequence,atKaiUPulse:at,action,effect:projection.effect,nextState:projection.next};
  });
  const candidate=await admitReceizAccountFinancialOperation(utf8.encode(canonical(body)),{source,predecessor:parent});same(requireOperation(candidate).body,body);return candidate;
 }
 const execute=async(input:Readonly<{operationId:string;action:ReceizAccountFinancialAction}>)=>{exact(input,['operationId','action']);const request={operationId:text(input.operationId),action:actionSnapshot(input.action),atKaiUPulse:input.action.kind==='reserve-market-order'?text(object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b64(input.action.requestOriginalB64u)))).orderKaiUPulse):clock()};if(!UUID.test(request.operationId))fail('OPERATION_ID');return serial(async()=>{
   const action=request.action,wanted=await requestDigest(source,request.operationId,action),prior=await recorded(request.operationId);if(prior){if(prior.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return prior;}
   let current=await head();if(current.release){const raced=await recorded(request.operationId,current);if(raced){if(raced.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return raced;}fail('SOURCE_RELEASED');}let saved=await stage(request.operationId),op:ReceizVerifiedAccountFinancialOperation;
   if(saved){op=await open(request.operationId);if(op.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');}
   else{op=await build(request.operationId,action,current.operation,current.state,request.atKaiUPulse);const c=requireOperation(op);await retainExact(op.artifactSha256,c.bytes);await seed(stageId(request.operationId),op.artifactSha256,{requestDigest:wanted});memo.set(op.artifactSha256,op);saved=await stage(request.operationId);if(!saved)fail('RETAINED_ORIGINAL_REQUIRED');if(saved.row.headDigest!==op.artifactSha256){op=await open(request.operationId);if(op.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');}}
   current=await head();if(current.release){const raced=await recorded(request.operationId,current);if(raced){if(raced.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return raced;}fail('SOURCE_RELEASED');}
   if(current.row.headDigest!==op.predecessorArtifactSha256){
    // A competing tab may have accepted this exact request while signatures
    // were being prepared. Return its actual first receipt, never another act.
    const raced=await recorded(op.operationId,current);if(raced){if(raced.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return raced;}
    fail('CAUSAL_PARENT_CONFLICT');
   }
   // Actual committed originals recover forever. A never-accepted candidate
   // must still be eligible after asynchronous preparation/head reads finish.
   const now=BigInt(clock()),program=object(custody.body.program);if(now<BigInt(op.atKaiUPulse)||!custody.walletCustody&&(now>BigInt(text(program.expiresAtKaiUPulse))||now/1000000n>BigInt(op.atKaiUPulse)/1000000n+1n))return{status:'not-committed'as const,operationId:request.operationId};
   const c=requireOperation(op);let result:Awaited<ReturnType<ReceizAdmissionStore['commit']>>|undefined;
   try{result=await store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:headId,commandDigest:c.commandDigest,idempotencyKey:idem(op.operationId),expectedRevision:current.row.revision,expectedHeadDigest:op.predecessorArtifactSha256,readDependencies:[{aggregateId:stageId(op.operationId),expectedHeadDigest:op.artifactSha256}],acceptedCommand:json({operationId:op.operationId,requestDigest:op.requestDigest,originalReference:stageId(op.operationId),artifactSha256:op.artifactSha256}),events:[json(receipt(op))],nextHead:{revision:Number(op.sequence),digest:op.artifactSha256,state:json({operationId:op.operationId})},resourceEffects:{},receipt:json(receipt(op)),outboxIntents:[json({kind:'account-financial-original',allocationId:source.allocationId,operationId:op.operationId,artifactSha256:op.artifactSha256,sequence:op.sequence,predecessorOperationId:op.predecessorOperationId})],auditReference:json({sourceArtifactSha256:source.artifactSha256,atKaiUPulse:op.atKaiUPulse})});}catch{/* Reopen actual retained acceptance after acknowledgement loss. */}
   const accepted=await recorded(op.operationId);if(accepted)return accepted;
   if(result?.status==='conflict')fail(result.code);return{status:'not-committed'as const,operationId:request.operationId};
  });};
 return Object.freeze({
  execute,
  reserveOrder(request:ReceizVerifiedAccountMarketOrderRequest){const bytes=exportReceizAccountMarketOrderRequest(request);return execute({operationId:request.orderId,action:{kind:'reserve-market-order',requestOriginalB64u:enc(bytes)}});},
  release(){const atKaiUPulse=clock();return serial(async()=>{
   const current=await head();if(current.release)return current.release;if(current.state.orderEscrows?.length)fail('OPEN_ORDERS');
   const reference=headId+':release:'+current.row.headDigest,prior=await store.readAggregate(reference);let release:ReceizVerifiedAccountFinancialRelease;
   if(prior){const bytes=await options.originals.read(prior.headDigest!);if(!(bytes instanceof Uint8Array))fail('ORIGINAL_RETENTION_REQUIRED');release=await admitReceizAccountFinancialRelease(bytes,{source,financialHead:current.operation});if(release.artifactSha256!==prior.headDigest)fail('HEAD_ORIGINAL');}
   else{
    const financialHeadArtifactSha256=text(current.row.headDigest);
    const body=await prepareWalletCommand('release',financialHeadArtifactSha256,'release',async()=>({
     schema:'receiz.account-financial-release.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,financialHeadArtifactSha256,financialHeadOperationId:current.operation?.operationId??null,sequence:current.operation?.sequence??'0',atKaiUPulse,
    }));
    release=await admitReceizAccountFinancialRelease(utf8.encode(canonical(body)),{source,financialHead:current.operation});
    await retainExact(release.artifactSha256,exportReceizAccountFinancialRelease(release));
    const staged=await seed(reference,release.artifactSha256,{financialHeadArtifactSha256:current.row.headDigest});
    if(staged.headDigest!==release.artifactSha256){const bytes=await options.originals.read(staged.headDigest!);if(!(bytes instanceof Uint8Array))fail('ORIGINAL_RETENTION_REQUIRED');release=await admitReceizAccountFinancialRelease(bytes,{source,financialHead:current.operation});if(release.artifactSha256!==staged.headDigest)fail('HEAD_ORIGINAL');}
   }
   const receipt=releaseReceipt(release);
   try{await store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:headId,commandDigest:releases.get(release)!.commandDigest,idempotencyKey:headId+':release',expectedRevision:current.row.revision,expectedHeadDigest:current.row.headDigest,readDependencies:[{aggregateId:reference,expectedHeadDigest:release.artifactSha256}],acceptedCommand:json(receipt),events:[json(receipt)],nextHead:{revision:current.row.revision+1,digest:release.artifactSha256,state:json({operationId:current.operation?.operationId??null,releaseArtifactSha256:release.artifactSha256})},resourceEffects:{},receipt:json(receipt),outboxIntents:[json({kind:'account-financial-release',...receipt})],auditReference:json({sourceArtifactSha256:source.artifactSha256,atKaiUPulse:release.atKaiUPulse})});}catch{/* The first accepted release is reopened after acknowledgement loss. */}
   const accepted=await head();if(!accepted.release)fail('CAUSAL_PARENT_CONFLICT');return accepted.release;
  });},
  resolve(operationId:string){return serial(async()=>{if(!UUID.test(operationId))fail('OPERATION_ID');return recorded(operationId);});},
  current(){return serial(async()=>{const current=await head();return{sourceArtifactSha256:source.artifactSha256,headArtifactSha256:current.row.headDigest,state:structuredClone(current.state),...(current.release?{release:current.release}:{})};});},
  pending(afterSequence='0',limit=64){return serial(async()=>{if(!/^(0|[1-9][0-9]{0,18})$/u.test(afterSequence)||!Number.isSafeInteger(limit)||limit<1||limit>256)fail('DELIVERY_CURSOR');const current=await head(),result:ReceizAccountFinancialCommit[]=[];for(let sequence=BigInt(afterSequence)+1n;sequence<=BigInt(current.operation?.sequence??'0')&&result.length<limit;sequence++){const op=bySequence.get(String(sequence));if(!op||!lineage.has(op.artifactSha256))fail('DELIVERY_GAP');const r=await recorded(op.operationId,current);if(!r)fail('COMMIT_RECEIPT');result.push(r);}return result;});},
 });
}
