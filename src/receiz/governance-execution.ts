import type {ReceizPortableExecutionTransitionSetV124,ReceizAuthoritySessionV124,ReceizClient,ReceizKksV1ProofCoordinate,ReceizPortableExecutionTransitionRecoveryV124} from '@receiz/sdk';
import {inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124} from '../../node_modules/@receiz/sdk/dist/v124PortableAuthority.js';
import {openGovernanceOriginal} from './governance-documents';
import {governanceSettlement,type GovernanceSettlementQuote} from './governance-execution-settlement';
export type {GovernanceSettlementOutcome,GovernanceSettlementReview,GovernanceSettlementQuote} from './governance-execution-settlement';
import {BANK_APPLICATION_ID} from './config';
import {loadReceiz} from './client';
import {createBankExecution,type BankExecutionCheckpoint,type BankExecutionStore} from './bank-execution';
import {createGovernanceRegister,openGovernanceRegister,exactRegisterFile,type GovernanceExecutionRegister,type RegisterSealer} from './governance-execution-register';
import {prepareGovernancePlan,type GovernanceDecision,type GovernancePlanInput,type GovernancePlannerRequest} from './governance-execution-plan';
import {signGovernanceTransition,type GovernanceSigner} from './governance-execution-sign';
export type {GovernanceExecutionRegister,GovernanceDecision};
export type GovernanceExecutionReview=Readonly<{proposal:string;registerHead:string;exactPlanDigest:string;decision:GovernanceDecision}>;
export type GovernanceExecutionOutcome=Readonly<{status:'prepared'|'committed'|'unknown'|'zero-write';proposal:string;exactPlanDigest:string;registerHead?:string;reason?:string;decision?:GovernanceDecision}>;
type SignedDraft={request:GovernancePlannerRequest; signed:ReceizPortableExecutionTransitionSetV124};
type HeldFile={digest:string;filename:string;mimeType:string};
type Accepted={file:HeldFile;register:GovernanceExecutionRegister;proposal:string;exactPlanDigest:string};
export interface GovernanceExecutionPorts {
 quote():GovernanceSettlementQuote;
 settlement(body:Record<string,unknown>):Promise<unknown>;
 owner:string;assertOpen():void;
 read(key:string):Promise<unknown>;write(key:string,value:unknown,expected:unknown):Promise<void>;
 hold(file:File):Promise<string>;file(digest:string):Promise<Uint8Array|null>;
 seal:RegisterSealer;coordinate:(prior?:ReceizKksV1ProofCoordinate)=>Promise<ReceizKksV1ProofCoordinate>;
 plan(request:GovernancePlannerRequest):Promise<unknown>;
 signer(observation?:File):Promise<GovernanceSigner>;
 recovery():Promise<ReceizClient>;
 context(rails:readonly ('settlement')[]):Promise<{client:ReceizClient;session:ReceizAuthoritySessionV124}>;
}
const HEX=/^[a-f0-9]{64}$/;
const key=(prefix:string,id:string)=>{if(!HEX.test(id))throw Error('Invalid governance proof digest.');return prefix+':'+id;};

export function createGovernanceExecution(input:GovernanceExecutionPorts){
 const reviews=new WeakMap<GovernanceExecutionReview,Awaited<ReturnType<typeof prepareGovernancePlan>>>();
 let observation:File|undefined;
 async function file(ref:HeldFile){
  const bytes=await input.file(ref.digest),sdk=await loadReceiz();input.assertOpen();
  if(!bytes||await sdk.sha256ReceizBytes(bytes)!==ref.digest)throw Error('The exact retained register Original is unavailable.');
  return new File([new Uint8Array(bytes)],ref.filename,{type:ref.mimeType});
 }
 async function saveFile(source:File){return {digest:await input.hold(source),filename:source.name,mimeType:source.type};}
 async function held(id:string){
  const ref=await input.read(key('register',id)) as HeldFile|null;
  if(!ref)throw Error('Select the custodian’s held governance register.');
  const source=await file(ref),opened=await openGovernanceRegister(source,input.owner);
  if(opened.register.registerProofObjectId!==id)throw Error('The selected register Original differs from its coordinate.');
  return {ref,source,...opened};
 }
 async function selectRegister(source:File){
  input.assertOpen();const opened=await openGovernanceRegister(source,input.owner),id=opened.register.registerProofObjectId;
  const current=await input.read(key('register',id)) as HeldFile|null;
  let selected=opened.register;
  if(current)selected=(await held(id)).register;
  else{
   if(opened.register.head!==opened.register.registerGenesisHead||opened.history.nodes.length!==1||opened.portable.provenance.appends.length)
    throw Error('Import this register’s genesis Original first. A successor requires its committed execution evidence.');
   const ref=await saveFile(source);input.assertOpen();await input.write(key('register',id),ref,null);
  }
  const previous=await input.read('selected');if(previous!==id)await input.write('selected',id,previous);return selected;
 }
 async function selectedRegister(){input.assertOpen();const id=await input.read('selected');return typeof id==='string'?(await held(id)).register:null;}
 function store(prefix:string,proposal:string):BankExecutionStore{
  const slot=key(prefix,proposal);
  return {load:async()=>await input.read(slot) as BankExecutionCheckpoint|null,saveNew:async value=>{
   input.assertOpen();const old=await input.read(slot) as BankExecutionCheckpoint|null;
   if(old&&old.state!=='zero-write')throw Error('Reopen the existing exact governance execution.');
   await input.write(slot,value,old);
  },replace:async value=>{
   input.assertOpen();const old=await input.read(slot) as BankExecutionCheckpoint|null;
   if(!old||old.operationId!==value.operationId||old.plan.exactPlanDigest!==value.plan.exactPlanDigest||
    old.state==='committed'&&value.state!=='committed')throw Error('The retained governance execution changed.');
   await input.write(slot,value,old);
  }};
 }
 async function prepare(request:GovernancePlanInput){
  const selected=await selectedRegister();if(!selected)throw Error('Select the charter’s register first.');
  const draft=await input.read(key('signed',request.proposal)) as SignedDraft|null;
  const attempt=draft?.request.registerHead===selected.head?draft.request.attemptId:undefined;
  const prepared=await prepareGovernancePlan(request,selected,attempt),plan=prepared.local;input.assertOpen();
  const review:GovernanceExecutionReview=Object.freeze({proposal:plan.decision.proposal,registerHead:selected.head,exactPlanDigest:plan.plan.exactPlanDigest,decision:structuredClone(plan.decision)});
  reviews.set(review,prepared);return review;
 }
 async function reopenReview(proposal:string){
  input.assertOpen();const draft=await input.read(key('signed',proposal)) as SignedDraft|null;
  if(!draft)return null;
  const originals=[];
  for(const wire of draft.request.sources.originals)originals.push(await openGovernanceOriginal(await exactRegisterFile(wire)));
  const review=await prepare({proposal,originals});
  if(review.exactPlanDigest!==draft.signed.exactPlanDigest)throw Error('The retained signature belongs to a different head or plan. Review the current evidence.');
  return review;
 }
 async function retained(proposal:string){
  const known=await input.read(key('accepted',proposal)) as Accepted|null;if(!known)return null;
  const source=await file(known.file),opened=await openGovernanceRegister(source,input.owner);
  const entry=opened.portable.provenance.appends.at(-1);
  if(known.proposal!==proposal||opened.register.head!==known.register.head||entry?.schema!=='bankeiz.governance.register-append.v1'||entry.exactPlanDigest!==known.exactPlanDigest)
    throw Error('The committed register and its private acceptance record differ.');
  const decision=entry.decision as unknown as GovernanceDecision;
  if(decision.proposal!==proposal)throw Error('The committed Original belongs to a different proposal.');
  return {source,decision,register:opened.register,exactPlanDigest:known.exactPlanDigest};
 }
 async function adopt(proposal:string,checkpoint:BankExecutionCheckpoint,recovery:ReceizPortableExecutionTransitionRecoveryV124){
  // Only the independent native terminal accepted through BankExecution may
  // advance custody. Historical inspection reopens that already observed effect.
  if(checkpoint.state!=='committed'||!checkpoint.executionId)throw Error('The native terminal has not been retained.');
  const sdk=await loadReceiz();
  if(sdk.canonicalizeReceizV122(checkpoint.transitionSet)!==sdk.canonicalizeReceizV122(recovery.transitionSet)||
     recovery.members.length!==1||recovery.transitionSet.members.length!==1)throw Error('The committed governance recovery differs from the approved plan.');
  const member=recovery.transitionSet.members[0],source=await exactRegisterFile(member.candidate),opened=await openGovernanceRegister(source,input.owner);
  await inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124(recovery,{audience:BANK_APPLICATION_ID,currentKai:opened.coordinate.kaiPulse});
  const final=opened.portable.provenance.appends.at(-1),decision=final?.decision as unknown as GovernanceDecision|undefined;
  if(final?.schema!=='bankeiz.governance.register-append.v1'||final.exactPlanDigest!==checkpoint.plan.exactPlanDigest||decision?.proposal!==proposal||
    recovery.members[0].receipt.acceptedHead.value!==opened.register.head||opened.register.registerProofObjectId!==member.participantId)
    throw Error('The native register receipt does not commit this proposal.');
  const ref=await saveFile(source),regKey=key('register',member.participantId),previous=await input.read(regKey) as HeldFile|null;
  if(!previous)throw Error('The register predecessor is unavailable.');
  if(previous.digest===member.predecessor.artifactSha256)await input.write(regKey,ref,previous);
  else if(previous.digest!==ref.digest){
   const newer=await held(member.participantId);
   if(!newer.history.nodes.some(n=>n.nodeDigest===opened.register.head))throw Error('The retained register is on another branch.');
  }
  const receipt:Accepted={proposal,exactPlanDigest:checkpoint.plan.exactPlanDigest,register:opened.register,file:ref};
  const known=await input.read(key('accepted',proposal));if(!known)await input.write(key('accepted',proposal),receipt,null);
  const accepted=await retained(proposal);if(!accepted||accepted.exactPlanDigest!==receipt.exactPlanDigest)throw Error('Governance acceptance could not be reopened.');
  return {status:'committed' as const,proposal,registerHead:opened.register.head,exactPlanDigest:receipt.exactPlanDigest,decision:accepted.decision};
 }
 async function reopen(proposal:string):Promise<GovernanceExecutionOutcome|null>{
  input.assertOpen();const saved=await retained(proposal);
  if(saved)return {status:'committed',proposal,registerHead:saved.register.head,exactPlanDigest:saved.exactPlanDigest,decision:saved.decision};
  const journal=store('decision',proposal),pending=await journal.load();if(!pending){
   const review=await reopenReview(proposal);return review?{status:'prepared',...review}:null;
  }
  if(pending.state==='committed'&&pending.recovery)return adopt(proposal,pending,pending.recovery);
  if(pending.state==='zero-write')return {status:'zero-write',proposal,exactPlanDigest:pending.plan.exactPlanDigest,reason:pending.zeroWriteReason};
  let response;
  try{const client=await input.recovery();response=await createBankExecution(client,journal).resolve();}
  catch{return {status:'unknown',proposal,exactPlanDigest:pending.plan.exactPlanDigest};}
  if(response?.status==='committed')return adopt(proposal,(await journal.load())!,response.recovery);
  return {status:response?.status==='zero-write'?'zero-write':'unknown',proposal,exactPlanDigest:pending.plan.exactPlanDigest,...(response?.status==='zero-write'?{reason:response.reasonCode}:{})};
 }
 async function execute(review:GovernanceExecutionReview,confirmation:string):Promise<GovernanceExecutionOutcome>{
  input.assertOpen();const prepared=reviews.get(review),selected=prepared?.local;
  if(!selected||!prepared||confirmation!==selected.plan.exactPlanDigest)throw Error('Review and confirm the exact governance plan first.');
  const prior=await held(selected.participant);if(prior.register.head!==review.registerHead)throw Error('The held register changed. Review the new head.');
  const journal=store('decision',review.proposal),pending=await journal.load();
  if(pending&&pending.state!=='zero-write')return (await reopen(review.proposal))!;
  const sdk=await loadReceiz(),slot=key('signed',review.proposal),draft=await input.read(slot) as SignedDraft|null;
  let signed:ReceizPortableExecutionTransitionSetV124|undefined;
  if(draft?.signed.exactPlanDigest===confirmation){
   // A previous local signature is reusable only while its native authority still admits it.
   try{await sdk.verifyReceizPortableExecutionTransitionSetV124(draft.signed,{audience:BANK_APPLICATION_ID});signed=draft.signed;}catch{}
  }
  if(!signed){
   signed=await signGovernanceTransition(prior.source,selected,await input.signer(observation));input.assertOpen();
   await input.write(slot,{request:prepared.request,signed},draft);
  }
  let coordinated;
  try{coordinated=await input.plan(prepared.request);}
  catch{return {status:'prepared',proposal:review.proposal,exactPlanDigest:confirmation,decision:selected.decision,reason:'Signed on this device. Native revalidation is required before submission.'};}
  if(sdk.canonicalizeReceizV122(coordinated)!==sdk.canonicalizeReceizV122(selected))throw Error('The native plan differs from the reviewed charter, evidence, register or tally.');
  const {client,session}=await input.context([]),execution=createBankExecution(client,journal);
  const approval=await execution.inspect(selected.plan,signed);input.assertOpen();
  const result=await execution.execute(approval,confirmation,session);reviews.delete(review);
  if(result.status==='committed')return adopt(review.proposal,(await journal.load())!,result.recovery);
  return {status:result.status,proposal:review.proposal,exactPlanDigest:confirmation,...(result.status==='zero-write'?{reason:result.reasonCode}:{})};
 }
 const treasury=governanceSettlement(input,async proposal=>{
   const saved=await retained(proposal),checkpoint=await store('decision',proposal).load();
   if(!saved||checkpoint?.state!=='committed'||!checkpoint.executionId||checkpoint.plan.exactPlanDigest!==saved.exactPlanDigest)
     throw Error('The certified native execution and its terminal ID are required.');
   return {decision:saved.decision,executionId:checkpoint.executionId};
 });
 return Object.freeze({...treasury,selectedRegister,selectRegister,prepare,execute,reopen,reopenReview,
  selectIssuerObservation(file:File){input.assertOpen();observation=file;},
  async createRegister(){input.assertOpen();const artifact=await createGovernanceRegister(input.owner,await input.coordinate(),input.seal);
   return selectRegister(new File([artifact.artifact],artifact.filename,{type:artifact.mimeType}));},
  async exportRegister(proposal:string){const saved=await retained(proposal);if(!saved)throw Error('A committed register Original is required.');return saved.source;},
  async exportSelectedRegister(){const selected=await selectedRegister();if(!selected)throw Error('Select a register first.');return (await held(selected.registerProofObjectId)).source;},
  async exportHeldRegister(registerProofObjectId:string){input.assertOpen();return (await held(registerProofObjectId)).source;},
  async transportHeldRegisterGenesis(registerProofObjectId:string,registerGenesisHead:string){
   input.assertOpen();
   const ref=await input.read(key('register',registerProofObjectId)) as HeldFile|null;
   if(!ref)return null;
   const {register,history,admission}=await openGovernanceRegister(await file(ref),input.owner);
   if(register.registerProofObjectId!==registerProofObjectId||register.registerGenesisHead!==registerGenesisHead)
    throw Error('The selected register Original differs from its coordinate.');
   if(register.head!==registerGenesisHead||history.nodes.length!==1)return null;
   const artifact=admission.openedArtifact.sealedArtifact;
   if(artifact.kind!=='receiz.native-record-seal')throw Error('Select the enclosing register Original.');
   return (await loadReceiz()).transportReceizSealedArtifactV124(artifact);
  },
 });
}
export type GovernanceExecution=ReturnType<typeof createGovernanceExecution>;
