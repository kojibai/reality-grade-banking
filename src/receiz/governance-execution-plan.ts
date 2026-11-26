import type {ReceizOperationPlanV124,ReceizPortableSealedArtifactV124} from '@receiz/sdk';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID} from './config';
import {requireGovernanceOriginal,type CharterPayment,type CharterCurrencyChange,type GovernanceOriginal} from './governance-documents';
import {projectClosedGovernanceDecision} from './governance-closed-decision';
import {openCanonicalProofFile} from './proof-capture';
import type {GovernanceExecutionRegister} from './governance-execution-register';

export type GovernanceDecision = Readonly<{schema:'bankeiz.governance.decision.v1';charter:string;proposal:string;closedAtKai:string;
 decision:'Election'|'Policy'|'Treasury';approved:boolean;counts:readonly {choice:string;count:number}[];
 evidence:readonly string[];closures:readonly string[];office:string|null;seated:readonly string[];payment:CharterPayment|null;currencyChange?:CharterCurrencyChange}>;
export type GovernancePlanInput = {proposal:string; originals:readonly GovernanceOriginal[]};
export type GovernancePlannerRequest = {applicationId:string;registerHead:string;attemptId:string;
 sources:{schema:'bankeiz.governance.closure-sources.v1';proposal:string;originals:ReceizPortableSealedArtifactV124[]}};
export type GovernanceNativePlan = {plan:ReceizOperationPlanV124;event:{schema:'bankeiz.governance.register-append.v1';exactPlanDigest:string;decision:GovernanceDecision};
 authority:NonNullable<import('./governance-documents').CharterRules['execution']>;decision:GovernanceDecision;participant:string;domainId:string};
async function readDecision(input:GovernancePlanInput) {
 const sources=input.originals.map(requireGovernanceOriginal).sort((a,b)=>a.digest<b.digest?-1:1);
 const rows=sources.map(({digest,pulse,document})=>({digest,pulse,document,profileUid:null}));
 const {decision,authority}=projectClosedGovernanceDecision(input.proposal,rows);
 return {decision,authority,sources};
}
export async function transportGovernanceOriginals(sources:readonly GovernanceOriginal[]) {
 const sdk=await loadReceiz(), originals:ReceizPortableSealedArtifactV124[]=[];
 for(const input of sources){
  const source=requireGovernanceOriginal(input), opened=await openCanonicalProofFile(source.file);
  if(opened.sealedArtifact.kind!=='receiz.native-record-seal')throw Error('Select the enclosing governance Original.');
  const wire=await sdk.transportReceizSealedArtifactV124(opened.sealedArtifact);
  if(wire.artifactSha256!==source.digest)throw Error('The selected Original changed.');
  originals.push(wire);
 }
 return originals;
}
export async function readGovernanceDecision(input:GovernancePlanInput){return (await readDecision(input)).decision;}
export async function prepareGovernancePlan(input:GovernancePlanInput,reg:GovernanceExecutionRegister,attemptId='governance:'+crypto.randomUUID()) {
 const sdk=await loadReceiz(),{authority,decision,sources}=await readDecision(input);
 if(authority.custodian!==reg.custodian||authority.registerProofObjectId!==reg.registerProofObjectId||
   authority.registerGenesisHead!==reg.registerGenesisHead)throw Error('The charter does not govern this held register.');
 const originals=await transportGovernanceOriginals(sources);
 const request:GovernancePlannerRequest={applicationId:BANK_APPLICATION_ID,registerHead:reg.head,attemptId,sources:{schema:'bankeiz.governance.closure-sources.v1',proposal:decision.proposal,originals}};
 const domainId='governance:'+decision.charter,semanticIdempotencyKey='governance.certify:'+decision.proposal;
 const registryDigest=await sdk.digestReceizCanonicalV122({schema:'bankeiz.governance.registry.v1',laws:['unanimous-evidence-closure-v1']});
 const reducerDigest=await sdk.digestReceizCanonicalV122({schema:'bankeiz.governance.reducer.v1',operations:['certify-fixed-electorate','seat-by-office','authorize-single-settlement-installment']});
 const namespace='custom:bankeiz.governance.v1',pins=await sdk.createReceizCustomReducerBindingsV124({namespace,registryDigest,reducerDigest});
 const participants=[reg.registerProofObjectId],expectedParticipantHeads={[reg.registerProofObjectId]:reg.head};
 const plan=await sdk.planAtomicOperationV124({applicationId:BANK_APPLICATION_ID,participants,expectedParticipantHeads,semanticIdempotencyKey,attemptId:request.attemptId,
  operations:[{operationId:semanticIdempotencyKey,category:'custom',domainId,...pins,participants,payload:{schema:'receiz.custom-reducer-operation.v124',namespace,registryDigest,reducerDigest,expectedParticipantHeads,operation:{schema:'bankeiz.governance.certify.v1',sources:request.sources}}}]});
 const event={schema:'bankeiz.governance.register-append.v1' as const,exactPlanDigest:plan.exactPlanDigest,decision};
 const local={plan,event,decision,authority,domainId,participant:reg.registerProofObjectId};
 return {local,request};
}
