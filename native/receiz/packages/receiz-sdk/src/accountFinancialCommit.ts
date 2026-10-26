import {sha256ReceizBytes}from './artifacts.js';
import {receizBase64UrlDecode as dec,receizBase64UrlEncode as enc,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof}from './identity.js';
import {canonicalizeReceizV122 as canonical,digestReceizCanonicalV122 as digest}from './v122Canonical.js';
import {receizKaiNow}from './v124Kai.js';
import type{ReceizAdmissionStore,ReceizAdmissionAggregate}from './admissionStore.js';
import type{ReceizConstitutionJson}from './constitution.js';
import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource}from './accountFinancialSource.js';
import {projectReceizAccountFinancialAction,type ReceizAccountFinancialState,type ReceizAccountSendAction,type ReceizAccountMarketAction}from './accountFinancialExecution.js';
export type ReceizAccountFinancialAction=ReceizAccountSendAction|ReceizAccountMarketAction;
type Effect=ReturnType<typeof projectReceizAccountFinancialAction>['effect'];
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
function actionSnapshot(v:ReceizAccountFinancialAction):ReceizAccountFinancialAction{const r=structuredClone(v);if(r.kind==='send'){const{note,...base}=r;if(note!==undefined&&typeof note!=='string')fail('NOTE');const normalized=note?.replace(/\s+/gu,' ').trim();if((normalized?.length??0)>280)fail('NOTE');return json({...base,...(normalized?{note:normalized}:{})})as ReceizAccountFinancialAction;}return json(r)as ReceizAccountFinancialAction;}
const ownerChallenge=(v:unknown)=>'receiz.account-financial-operation.owner.v1\0'+canonical(v);
const custodyChallenge=(command:unknown,ownerConsent:unknown)=>utf8.encode('receiz.account-financial-operation.custody.v1\0'+canonical({command,ownerConsent}));
export type ReceizVerifiedAccountFinancialOperation=Readonly<{status:'verified-account-financial-operation';artifactSha256:string;allocationId:string;operationId:string;requestDigest:string;predecessorArtifactSha256:string;predecessorOperationId:string|null;sequence:string;atKaiUPulse:string;action:ReceizAccountFinancialAction;effect:Effect;nextState:ReceizAccountFinancialState}>;
type OperationCustody=Readonly<{sourceSha256:string;bytes:Uint8Array;body:RecordValue;command:RecordValue;commandDigest:string;parent:ReceizVerifiedAccountFinancialOperation|null}>;
const operations=new WeakMap<ReceizVerifiedAccountFinancialOperation,OperationCustody>();
function requireOperation(op:ReceizVerifiedAccountFinancialOperation){const c=operations.get(op);if(!c)fail('OPERATION_CUSTODY_REQUIRED');return c;}
/** Internal provider composition; a projected operation label conveys no custody. */
export function readReceizAccountFinancialOperationCustody(op:ReceizVerifiedAccountFinancialOperation){const c=requireOperation(op);return Object.freeze({sourceSha256:c.sourceSha256,artifactBytes:()=>c.bytes.slice()});}
async function requestDigest(source:ReceizAccountFinancialSource,id:string,action:ReceizAccountFinancialAction){return digest({schema:'receiz.account-financial-request.v1',sourceArtifactSha256:source.artifactSha256,operationId:id,action});}

/** Historical inspection is not local acceptance. A signed candidate remains
 * a candidate until the actual retained register consumes its exact parent. */
function financialEnvelope(input:Uint8Array,source:ReceizAccountFinancialSource){
 // Whole funded-original admission precedes native succession. This append
 // grants no funding independently of source custody and admitted ancestry.
 readReceizAccountFinancialSourceCustody(source);
 const original=input.slice(),raw=new TextDecoder('utf-8',{fatal:true}).decode(original),body=exact(JSON.parse(raw),['schema','allocationId','sourceArtifactSha256','operationId','requestDigest','predecessorArtifactSha256','predecessorOperationId','sequence','atKaiUPulse','action','effect','nextState','ownerConsent','custodianSignature']);
 return{original,body,raw};
}
export async function admitReceizAccountFinancialOperation(input:Uint8Array,options:Readonly<{source:ReceizAccountFinancialSource;predecessor?:ReceizVerifiedAccountFinancialOperation|null}>):Promise<ReceizVerifiedAccountFinancialOperation>{
 return admitFinancialEnvelope(financialEnvelope(input,options.source),options.source,options.predecessor??null);
}
async function admitFinancialEnvelope(envelope:Awaited<ReturnType<typeof financialEnvelope>>,source:ReceizAccountFinancialSource,parent:ReceizVerifiedAccountFinancialOperation|null):Promise<ReceizVerifiedAccountFinancialOperation>{
 const custody=readReceizAccountFinancialSourceCustody(source),previous=parent?requireOperation(parent):null;
 if(previous&&previous.sourceSha256!==source.artifactSha256)fail('SOURCE_MISMATCH');
 const{original,body,raw}=envelope;
 if(canonical(body)!==raw||body.schema!=='receiz.account-financial-operation.v1'||body.allocationId!==source.allocationId||body.sourceArtifactSha256!==source.artifactSha256||!UUID.test(text(body.operationId))||body.predecessorArtifactSha256!==(parent?.artifactSha256??source.artifactSha256)||body.predecessorOperationId!==(parent?.operationId??null))fail('CAUSAL_ORIGINAL');
 const action=actionSnapshot(body.action as ReceizAccountFinancialAction);same(action,body.action);
 if(body.requestDigest!==await requestDigest(source,text(body.operationId),action))fail('REQUEST_DIGEST');
 const state=parent?.nextState??custody.body.initialState as ReceizAccountFinancialState,projected=projectReceizAccountFinancialAction(source,state,action,text(body.atKaiUPulse));
 same(projected.effect,body.effect);same(projected.next,body.nextState);if(body.sequence!==projected.next.sequence)fail('SEQUENCE');
 const command=Object.fromEntries(Object.entries(body).filter(([k])=>k!=='ownerConsent'&&k!=='custodianSignature'));
 const proof=exact(body.ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url']);
 const program=object(custody.body.program),identity=object(program.identity),signer=object(program.custodian);
 if(proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==identity.keyId||proof.alg!==identity.alg||proof.challengeB64Url!==enc(utf8.encode(ownerChallenge(command)))||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:text(identity.keyId),alg:identity.alg as 'Ed25519'|'P-256',publicKeyRawB64u:text(identity.publicKeyRawB64u),challengeB64Url:text(proof.challengeB64Url),signatureB64Url:text(proof.signatureB64Url)}))fail('OWNER_CONSENT');
 const key=await crypto.subtle.importKey('raw',b64(signer.publicKeyRawB64u,32).slice().buffer,'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,b64(body.custodianSignature,64).slice().buffer,custodyChallenge(command,proof)))fail('RECORD_SIGNER');
 freeze(body);const accepted=Object.freeze({status:'verified-account-financial-operation'as const,artifactSha256:await sha256ReceizBytes(original),allocationId:source.allocationId,operationId:text(body.operationId),requestDigest:text(body.requestDigest),predecessorArtifactSha256:text(body.predecessorArtifactSha256),predecessorOperationId:body.predecessorOperationId as string|null,sequence:text(body.sequence),atKaiUPulse:text(body.atKaiUPulse),action:body.action as ReceizAccountFinancialAction,effect:body.effect as Effect,nextState:body.nextState as ReceizAccountFinancialState});
 operations.set(accepted,{sourceSha256:source.artifactSha256,bytes:original,body,command,commandDigest:await digest(command),parent});return accepted;
}

export type ReceizAccountFinancialCommit=Readonly<{status:'committed';publication:'pending';operation:ReceizVerifiedAccountFinancialOperation}>;
const commits=new WeakSet<ReceizAccountFinancialCommit>();
export function exportReceizAccountFinancialCommit(commit:ReceizAccountFinancialCommit):Uint8Array{if(!commits.has(commit))fail('COMMIT_CUSTODY_REQUIRED');return requireOperation(commit.operation).bytes.slice();}
/** Durable exact-byte retention supplied by the host's existing original store.
 * Coordination storage carries references only and grants no artifact custody. */
export type ReceizAccountFinancialOriginalStore=Readonly<{retain(sha256:string,bytes:Uint8Array):Promise<void>;read(sha256:string):Promise<Uint8Array|null>}>;
type ExecutorOptions=Readonly<{originals:ReceizAccountFinancialOriginalStore;source:ReceizAccountFinancialSource;store:ReceizAdmissionStore;signOwner(challengeText:string):Promise<ReceizIdentityLoginProof>;signRecord(bytes:Uint8Array):Promise<Uint8Array>;/** Trusted host/test clock; never a payment request field. */kai?:()=>string}>;
/** Normal admitted Identity signing + the existing SDK record signer. No
 * enrollment, network, PBI, or hardware ceremony occurs in this path. */
export async function createReceizAccountFinancialExecutor(options:ExecutorOptions){
 const source=options.source,custody=readReceizAccountFinancialSourceCustody(source),store=options.store,headId='account-financial:'+source.allocationId;
 const stageId=(id:string)=>headId+':original:'+id,idem=(id:string)=>headId+':operation:'+id;
 const clock=options.kai??(()=>String(receizKaiNow().uPulse));
 const memo=new Map<string,ReceizVerifiedAccountFinancialOperation>(),lineage=new Set<string>(),bySequence=new Map<string,ReceizVerifiedAccountFinancialOperation>();
 let knownHead=source.artifactSha256,tail=Promise.resolve();
 async function serial<T>(work:()=>Promise<T>):Promise<T>{const before=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await before;try{return await work();}finally{release();}}
 async function seed(id:string,digestValue:string,state:unknown){const prior=await store.readAggregate(id);if(prior)return prior;try{await store.seedAggregate({aggregateId:id,revision:0,headDigest:digestValue,state:json(state)});}catch(error){if(!await store.readAggregate(id))throw error;}return(await store.readAggregate(id))!;}
 async function retainExact(sha256:string,bytes:Uint8Array){
  await options.originals.retain(sha256,bytes.slice());
  const retained=await options.originals.read(sha256);
  if(!(retained instanceof Uint8Array)||await sha256ReceizBytes(retained)!==sha256)fail('ORIGINAL_RETENTION_REQUIRED');
 }
 await retainExact(source.artifactSha256,custody.artifactBytes());
 const originalSeed=await seed('account-financial-source:'+source.artifactSha256,source.artifactSha256,{artifactSha256:source.artifactSha256});
 if(originalSeed.headDigest!==source.artifactSha256||object(originalSeed.state).artifactSha256!==source.artifactSha256)fail('RETAINED_SOURCE');
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
 async function head():Promise<{row:ReceizAdmissionAggregate;operation:ReceizVerifiedAccountFinancialOperation|null;state:ReceizAccountFinancialState}>{
  const row=await store.readAggregate(headId);if(!row)fail('HEAD_REQUIRED');const state=exact(row.state,['operationId']);
  const op=state.operationId===null?null:await open(text(state.operationId));
  if(row.headDigest!==(op?.artifactSha256??source.artifactSha256)||row.revision!==Number(op?.sequence??'0'))fail('HEAD_ORIGINAL');
  let cursor=op;const observed:ReceizVerifiedAccountFinancialOperation[]=[];while(cursor&&cursor.artifactSha256!==knownHead){observed.push(cursor);cursor=requireOperation(cursor).parent;}
  if(!cursor&&knownHead!==source.artifactSha256)fail('HEAD_ROLLBACK');knownHead=row.headDigest!;lineage.add(source.artifactSha256);for(const item of observed){lineage.add(item.artifactSha256);bySequence.set(item.sequence,item);}
  return{row,operation:op,state:op?.nextState??custody.body.initialState as ReceizAccountFinancialState};
 }
 function receipt(op:ReceizVerifiedAccountFinancialOperation){return{schema:'receiz.account-financial-commit.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:op.operationId,artifactSha256:op.artifactSha256,sequence:op.sequence,atKaiUPulse:op.atKaiUPulse};}
 async function recorded(id:string,currentHead?:Awaited<ReturnType<typeof head>>):Promise<ReceizAccountFinancialCommit|null>{const r=await store.readIdempotency(idem(id));if(!r)return null;const current=currentHead??await head(),op=await open(id);same(r.receipt,receipt(op));if(r.commandDigest!==requireOperation(op).commandDigest||!lineage.has(op.artifactSha256)||current.row.revision<Number(op.sequence))fail('COMMIT_RECEIPT');const result=Object.freeze({status:'committed'as const,publication:'pending'as const,operation:op});commits.add(result);return result;}
 async function build(id:string,action:ReceizAccountFinancialAction,parent:ReceizVerifiedAccountFinancialOperation|null,state:ReceizAccountFinancialState,at:string){
  const projection=projectReceizAccountFinancialAction(source,state,action,at);
  const command={schema:'receiz.account-financial-operation.v1',allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,operationId:id,requestDigest:await requestDigest(source,id,action),predecessorArtifactSha256:parent?.artifactSha256??source.artifactSha256,predecessorOperationId:parent?.operationId??null,sequence:projection.next.sequence,atKaiUPulse:at,action,effect:projection.effect,nextState:projection.next};
  const ownerConsent=await options.signOwner(ownerChallenge(command)),custodianSignature=enc(await options.signRecord(custodyChallenge(command,ownerConsent))),body={...command,ownerConsent,custodianSignature};
  const candidate=await admitReceizAccountFinancialOperation(utf8.encode(canonical(body)),{source,predecessor:parent});same(requireOperation(candidate).body,body);return candidate;
 }
 return Object.freeze({
  async execute(input:Readonly<{operationId:string;action:ReceizAccountFinancialAction}>){exact(input,['operationId','action']);const request={operationId:text(input.operationId),action:actionSnapshot(input.action),atKaiUPulse:clock()};if(!UUID.test(request.operationId))fail('OPERATION_ID');return serial(async()=>{
   const action=request.action,wanted=await requestDigest(source,request.operationId,action),prior=await recorded(request.operationId);if(prior){if(prior.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return prior;}
   let current=await head(),saved=await stage(request.operationId),op:ReceizVerifiedAccountFinancialOperation;
   if(saved){op=await open(request.operationId);if(op.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');}
   else{op=await build(request.operationId,action,current.operation,current.state,request.atKaiUPulse);const c=requireOperation(op);await retainExact(op.artifactSha256,c.bytes);await seed(stageId(request.operationId),op.artifactSha256,{requestDigest:wanted});memo.set(op.artifactSha256,op);saved=await stage(request.operationId);if(!saved)fail('RETAINED_ORIGINAL_REQUIRED');if(saved.row.headDigest!==op.artifactSha256){op=await open(request.operationId);if(op.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');}}
   current=await head();
   if(current.row.headDigest!==op.predecessorArtifactSha256){
    // A competing tab may have accepted this exact request while signatures
    // were being prepared. Return its actual first receipt, never another act.
    const raced=await recorded(op.operationId,current);if(raced){if(raced.operation.requestDigest!==wanted)fail('IDEMPOTENCY_CONFLICT');return raced;}
    fail('CAUSAL_PARENT_CONFLICT');
   }
   // Actual committed originals recover forever. A never-accepted candidate
   // must still be eligible after asynchronous preparation/head reads finish.
   const now=BigInt(clock()),program=object(custody.body.program);if(now<BigInt(op.atKaiUPulse)||now>BigInt(text(program.expiresAtKaiUPulse))||now/1000000n>BigInt(op.atKaiUPulse)/1000000n+1n)return{status:'not-committed'as const,operationId:request.operationId};
   const c=requireOperation(op);let result:Awaited<ReturnType<ReceizAdmissionStore['commit']>>|undefined;
   try{result=await store.commit({schema:'receiz.admission.unit-of-work.v1',aggregateId:headId,commandDigest:c.commandDigest,idempotencyKey:idem(op.operationId),expectedRevision:current.row.revision,expectedHeadDigest:op.predecessorArtifactSha256,readDependencies:[{aggregateId:stageId(op.operationId),expectedHeadDigest:op.artifactSha256}],acceptedCommand:json({operationId:op.operationId,requestDigest:op.requestDigest,originalReference:stageId(op.operationId),artifactSha256:op.artifactSha256}),events:[json(receipt(op))],nextHead:{revision:Number(op.sequence),digest:op.artifactSha256,state:json({operationId:op.operationId})},resourceEffects:{},receipt:json(receipt(op)),outboxIntents:[json({kind:'account-financial-original',allocationId:source.allocationId,operationId:op.operationId,artifactSha256:op.artifactSha256,sequence:op.sequence,predecessorOperationId:op.predecessorOperationId})],auditReference:json({sourceArtifactSha256:source.artifactSha256,atKaiUPulse:op.atKaiUPulse})});}catch{/* Reopen actual retained acceptance after acknowledgement loss. */}
   const accepted=await recorded(op.operationId);if(accepted)return accepted;
   if(result?.status==='conflict')fail(result.code);return{status:'not-committed'as const,operationId:request.operationId};
  });},
  resolve(operationId:string){return serial(async()=>{if(!UUID.test(operationId))fail('OPERATION_ID');return recorded(operationId);});},
  current(){return serial(async()=>{const current=await head();return{sourceArtifactSha256:source.artifactSha256,headArtifactSha256:current.row.headDigest,state:structuredClone(current.state)};});},
  pending(afterSequence='0',limit=64){return serial(async()=>{if(!/^(0|[1-9][0-9]{0,18})$/u.test(afterSequence)||!Number.isSafeInteger(limit)||limit<1||limit>256)fail('DELIVERY_CURSOR');const current=await head(),result:ReceizAccountFinancialCommit[]=[];for(let sequence=BigInt(afterSequence)+1n;sequence<=BigInt(current.operation?.sequence??'0')&&result.length<limit;sequence++){const op=bySequence.get(String(sequence));if(!op||!lineage.has(op.artifactSha256))fail('DELIVERY_GAP');const r=await recorded(op.operationId,current);if(!r)fail('COMMIT_RECEIPT');result.push(r);}return result;});},
 });
}
