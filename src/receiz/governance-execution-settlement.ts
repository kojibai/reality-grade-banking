import type {ReceizPortableExecutionTransitionRecoveryV124,ReceizValueExecutionOutcomeV123,ReceizWorldValueIntentV122} from '@receiz/sdk';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID} from './config';
import type {GovernanceDecision} from './governance-execution-plan';
import type {GovernanceExecutionPorts} from './governance-execution';

export type GovernanceSettlementQuote=Readonly<{priceBasis:unknown;usdPerPhiMicrocents:string}>;
export type GovernanceSettlementReview=Readonly<{proposal:string;intentDigest:string;intent:ReceizWorldValueIntentV122}>;
export type GovernanceSettlementOutcome=Readonly<{status:'unknown'|'zero-write'|'recorded'|'settled';intentDigest:string;receiptDigest?:string;reason?:string;sourceHead?:string;destinationHead?:string}>;
type Work={proposal:string;certificationExecutionId:string;quote:GovernanceSettlementQuote&{attemptId:string};intent:ReceizWorldValueIntentV122;outcome?:ReceizValueExecutionOutcomeV123;verifiedRecoveryDigest?:string;verifiedJoinDigest?:string};
export function governanceSettlement(input:GovernanceExecutionPorts,certification:(proposal:string)=>Promise<{decision:GovernanceDecision;executionId:string}>){
 const reviews=new WeakMap<GovernanceSettlementReview,Work>();
 const slot=(p:string)=>{if(!/^[a-f0-9]{64}$/.test(p))throw Error('Invalid proposal digest.');return 'settlement:'+p;};
 async function plan(proposal:string,quote:Work['quote']){
  const {decision,executionId}=await certification(proposal);
  if(decision.decision!=='Treasury'||!decision.approved||!decision.payment)throw Error('A committed treasury authorization is required.');
  const {budgetId,installment,...transfer}=decision.payment,sdk=await loadReceiz();
  const idempotencyKey='governance.installment:'+await sdk.digestReceizCanonicalV122({charter:decision.charter,budgetId,installment});
  const edge=await sdk.planReceizEdgeSettlementTransferV125({...transfer,...quote,applicationId:BANK_APPLICATION_ID,idempotencyKey});
  return {edge,executionId};
 }
 async function prepareSettlement(proposal:string){
  input.assertOpen();const known=await input.read(slot(proposal)) as Work|null;
  const selected=known?.quote??{...input.quote(),attemptId:'treasury:'+crypto.randomUUID()};
  const {edge,executionId}=await plan(proposal,selected),work={proposal,certificationExecutionId:executionId,quote:selected,intent:edge.intent};
  const review:GovernanceSettlementReview=Object.freeze({proposal,intentDigest:edge.intent.valueIntentDigest,intent:edge.intent});
  reviews.set(review,work);return review;
 }
 async function status(work:Work,verifyNewRecovery=false):Promise<GovernanceSettlementOutcome>{
  const sdk=await loadReceiz(),{edge,executionId}=await plan(work.proposal,work.quote),intentDigest=edge.intent.valueIntentDigest;
  if(executionId!==work.certificationExecutionId||sdk.canonicalizeReceizV122(edge.intent)!==sdk.canonicalizeReceizV122(work.intent))throw Error('The held installment differs from the certified payment.');
  const result=work.outcome?await sdk.validateReceizValueExecutionOutcomeV123(work.outcome):null;
  if(!result||result.status==='unknown')return {status:'unknown',intentDigest};
  if(result.rail!=='settlement')throw Error('Unexpected treasury payment rail.');
  if(result.status==='zero-write')return {status:'zero-write',intentDigest,reason:result.failure.code};
  if(sdk.canonicalizeReceizV122(result.intent)!==sdk.canonicalizeReceizV122(edge.intent)||
   result.receipt.amountPhiMicro!==edge.intent.amountPhiMicro||result.receipt.sourcePriorHead!==edge.intent.sourceValueHead||
   result.receipt.destinationPriorHead!==edge.intent.expectedDestinationHead||result.receipt.sourceHead!==result.sourceHead||result.receipt.destinationHead!==result.destinationHead||
   result.receipt.idempotencyKey!==edge.intent.idempotencyKey||result.receipt.valueIntentDigest!==intentDigest)
   throw Error('The native Settlement receipt differs from the exact installment.');
  const recorded={intentDigest,receiptDigest:result.receipt.receiptDigest,sourceHead:result.sourceHead,destinationHead:result.destinationHead};
  // Older checkpoints record receipt fields only. Without the verified join
  // between both proof objects and the receipt, this remains a recorded debit.
  if(!work.verifiedRecoveryDigest||(!verifyNewRecovery&&!work.verifiedJoinDigest))return {status:'recorded',...recorded};
  const refs=result.proofReferences,source=refs.find(ref=>ref.objectId===edge.intent.sourceProofObjectId),destination=refs.find(ref=>ref.objectId!==edge.intent.sourceProofObjectId);
  if(refs.length!==2||!source||!destination||source.objectId===destination.objectId||source.proofDigest===destination.proofDigest||
     source.head!==result.sourceHead||destination.head!==result.destinationHead||await sdk.deriveReceizSubjectIdV122(destination.proofDigest)!==edge.intent.destinationSubjectId)
    throw Error('The recorded proof references do not identify both approved Settlement objects and their accepted heads.');
  const bytes=await input.file(work.verifiedRecoveryDigest);
  if(!bytes||await sdk.sha256ReceizBytes(bytes)!==work.verifiedRecoveryDigest)throw Error('The retained Settlement evidence is unavailable.');
  const binding=await sdk.digestReceizCanonicalV122({exactPlanDigest:edge.plan.exactPlanDigest,recoveryDigest:work.verifiedRecoveryDigest,source,destination,...recorded});
  if(!verifyNewRecovery){
   if(work.verifiedJoinDigest!==binding)throw Error('The held Settlement receipt and signed evidence differ.');
   return {status:'settled',...recorded};
  }
  const recovery:ReceizPortableExecutionTransitionRecoveryV124=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const [sent,received]=await Promise.all([sdk.confirmReceizEdgeSettlementSendV125(recovery,{applicationId:BANK_APPLICATION_ID,participantId:edge.sourceParticipantId}),
    sdk.receiveReceizEdgeSettlementV125(recovery,{applicationId:BANK_APPLICATION_ID,participantId:edge.destinationParticipantId})]);
  const members=recovery.transitionSet.members,sender=members.find(m=>m.participantId===edge.sourceParticipantId),receiver=members.find(m=>m.participantId===edge.destinationParticipantId);
  const same=(a:unknown,b:unknown)=>sdk.canonicalizeReceizV122(a)===sdk.canonicalizeReceizV122(b);
  const debit=sent.committedTransition.receipt,credit=received.committedTransition.receipt;
  if(members.length!==2||!sender||!receiver||sender===receiver||!same(sender.operationPlan,edge.plan)||!same(receiver.operationPlan,edge.plan)||
     sent.participantId!==sender.participantId||received.participantId!==receiver.participantId||sent.role!=='sender'||received.role!=='receiver'||
     !same(sent.intent,edge.intent)||!same(received.intent,edge.intent)||debit.resource!==source.objectId||credit.resource!==destination.objectId||
     debit.priorHead.value!==edge.intent.sourceValueHead||credit.priorHead.value!==edge.intent.expectedDestinationHead||
     debit.acceptedHead.value!==source.head||credit.acceptedHead.value!==destination.head||
     debit.artifactDigest.value!==sender.candidate.artifactSha256||credit.artifactDigest.value!==receiver.candidate.artifactSha256)
    throw Error('The signed sender and receiver transitions differ from the planned installment and recorded proof objects.');
  work.verifiedJoinDigest=binding;
  return {status:'settled',...recorded};
 }
 async function reopenSettlement(proposal:string){input.assertOpen();const work=await input.read(slot(proposal)) as Work|null;return work?status(work):null;}
 async function executeSettlement(review:GovernanceSettlementReview,confirmation:string){
  input.assertOpen();const work=reviews.get(review);if(!work||confirmation!==work.intent.valueIntentDigest)throw Error('Confirm the exact treasury installment.');
  const key=slot(work.proposal),existing=await input.read(key) as Work|null;
  if(existing&&existing.intent.valueIntentDigest!==confirmation)throw Error('The retained installment differs from the reviewed intent.');
  if(existing?.outcome?.status==='committed')return status(existing);
  if(!existing)await input.write(key,work,null);
  input.assertOpen();reviews.delete(review);
  const sdk=await loadReceiz();
  let result:ReceizValueExecutionOutcomeV123;
  try{result=await sdk.validateReceizValueExecutionOutcomeV123(await input.settlement({applicationId:BANK_APPLICATION_ID,certificationExecutionId:work.certificationExecutionId,quote:work.quote,approvedIntentDigest:confirmation}));}
  catch{return {status:'unknown' as const,intentDigest:confirmation};}
  const next={...work,outcome:result};const observed=await status(next);input.assertOpen();
  await input.write(key,next,existing??work);return observed;
 }
 async function verifySettlement(proposal:string,recovery:File){
  input.assertOpen();const key=slot(proposal),work=await input.read(key) as Work|null;
  if(work?.outcome?.status!=='committed')throw Error('A matching native Settlement receipt is required.');
  const next={...work,verifiedRecoveryDigest:await input.hold(recovery)};
  const result=await status(next,true);
  if(result.status!=='settled'||!result.receiptDigest||!result.sourceHead||!result.destinationHead)throw Error('The native edge readers did not admit both transfers.');
  input.assertOpen();await input.write(key,next,work);return result;
 }
 return {prepareSettlement,executeSettlement,reopenSettlement,verifySettlement};
}
