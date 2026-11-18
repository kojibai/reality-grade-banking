import type {ReceizCapabilityPayload,ReceizKeyFile,ReceizPortableExecutionTransitionSetV124,ReceizConstitutionJson,ReceizKksV1ProofCoordinate} from '@receiz/sdk';
import {createReceizPortableExecutionTransitionIdentityChallengeV124} from '../../node_modules/@receiz/sdk/dist/v124PortableAuthority.js';
import {verifyReceizIdentityKeyStateArtifactAdmission,observeReceizHistoricalIdentityKeyState} from '../../node_modules/@receiz/sdk/dist/historicalHandoffCustody.js';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID} from './config';
import {openGovernanceRegister,type RegisterSealer} from './governance-execution-register';
import type {GovernanceNativePlan} from './governance-execution-plan';

export type GovernanceSigner = {
 keyFile:ReceizKeyFile; passphrase:string; identityArtifact:File;
 seal:RegisterSealer; coordinate:(prior:ReceizKksV1ProofCoordinate)=>Promise<ReceizKksV1ProofCoordinate>;
};
export async function signGovernanceTransition(registerFile:File,selected:GovernanceNativePlan,signer:GovernanceSigner):Promise<ReceizPortableExecutionTransitionSetV124> {
 const sdk=await loadReceiz(),owner=selected.authority.custodian;
 const {register,admission,history,coordinate}=await openGovernanceRegister(registerFile,owner);
 if(register.registerProofObjectId!==selected.participant||register.head!==selected.plan.expectedParticipantHeads[selected.participant]||
    register.registerGenesisHead!==selected.authority.registerGenesisHead)throw Error('The held register has changed. Review its successor.');
 // Only protected issuer-state carriers can enter this private transition set.
 const artifact=await sdk.verifyReceizArtifact(signer.identityArtifact);
 if(artifact.status!=='verified-artifact')throw Error('Select the signed protected issuer-state Identity Record.');
 const challenge='bankeiz.governance.private-admission:'+selected.plan.exactPlanDigest+':'+crypto.randomUUID();
 const sign=(challengeText:string)=>sdk.signReceizIdentityLoginProof({keyFile:signer.keyFile,passphrase:signer.passphrase,challengeText});
 const identity=await sdk.createReceizArtifactAdmissionEngine()(artifact,{profile:'identity',ownerConstraint:owner,actorConstraint:signer.keyFile.owner.uid,
  identityExactChallenge:challenge,identityProof:await sign(challenge)});
 if(identity.verdict!=='canonical-identity')throw Error('The issuer observation belongs to another identity.');
 const key=await sdk.readReceizIdentityArtifact(identity.verifiedPayload.bytes);
 if(key.crypto.privateKeyPkcs8B64u||key.keyId!==signer.keyFile.keyId||!key.crypto.privateKeyPkcs8CiphertextB64u)throw Error('Use a protected issuer-state observation for this signing key.');
 const state=await observeReceizHistoricalIdentityKeyState({keyStateEvidence:await verifyReceizIdentityKeyStateArtifactAdmission(identity)});
 if(state.revokedAtKai!==null||BigInt(state.observedThroughKai)<BigInt(sdk.receizKaiNow().pulse))throw Error('A current signed issuer-key observation is required.');
 await sdk.bindReceizCurrentArtifactAppendRegistryAuthority({admission,registry:sdk.RECEIZ_CURRENT_CONSTITUTION_REGISTRY});
 const planning={commitDomain:{scheme:'receiz-commit-domain.v1',value:selected.domainId},namespace:{scheme:'receiz-namespace.v1',value:'provenance'},
  expectedHead:{algorithm:'sha-256',binds:'verified-proof-history',value:register.head},idempotencyKey:selected.plan.semanticIdempotencyKey,
  event:selected.event} as const;
 const successorCoordinate=await signer.coordinate(coordinate);
 if(BigInt(successorCoordinate.kaiPulse)<BigInt(selected.decision.closedAtKai))throw Error('The successor must follow the electors’ signed closure.');
 if(BigInt(state.observedThroughKai)<BigInt(successorCoordinate.kaiPulse))throw Error('The issuer observation must cover this register successor.');
 const currentKai=BigInt(sdk.receizKaiNow().pulse),terminalKai=BigInt(successorCoordinate.kaiPulse);
 const plan=await sdk.planReceizExactKksArtifactAppend({...planning,event:planning.event as unknown as ReceizConstitutionJson,
  admission,verifiedHistory:history,verifiedActorEvidence:identity,kksCoordinate:successorCoordinate});
 const payload:ReceizCapabilityPayload={schema:'receiz.capability.v112',capabilityId:'cap:'+plan.planDigest.value,
  issuerKeyId:key.keyId,actorId:plan.actor.actorId,tenantId:null,audience:BANK_APPLICATION_ID,authorityProfile:'artifact-local',
  operations:['artifact.append'],resourceScopes:[plan.resource],maximumEffects:sdk.readReceizArtifactAppendDerivedEffects(plan),
  registryDigest:plan.registryDigest.value,validFromKai:String(currentKai<terminalKai?currentKai:terminalKai),expiresAtKai:String(BigInt(state.observedThroughKai)+30n),
  nonce:'nonce:'+plan.planDigest.value,parentDigest:null,delegationDepth:0,maximumDelegationDepth:0,offline:true,
  operationConstraints:{planDigest:plan.planDigest,commitDomain:plan.commitDomain}};
 const signedCapability=await sdk.signReceizCapability({keyFile:signer.keyFile,passphrase:signer.passphrase,payload});
 const verifier=sdk.createReceizCapabilityVerifier({resolveAdmittedIssuer:await sdk.createReceizCapabilityIssuerResolver({identityAdmissions:[identity],revokedIssuerKeyIds:new Set()}),
  currentKai:String(sdk.receizKaiNow().pulse),audience:BANK_APPLICATION_ID,revokedCapabilityDigests:new Set()});
 const granted=await verifier(signedCapability,sdk.receizArtifactAppendCapabilityContext(plan));if(!granted.ok)throw Error(granted.code);
 const candidate=await sdk.sealArtifactTransitionCandidate({plan,capability:granted.capability,sealer:({successorPayloadBytes})=>signer.seal(successorPayloadBytes,'governance-register.json')});
 type Member=ReceizPortableExecutionTransitionSetV124['members'][number];
 const prior=admission.openedArtifact.sealedArtifact,actorSource=identity.openedArtifact?.sealedArtifact;
 if(prior.kind!=='receiz.native-record-seal'||actorSource?.kind!=='receiz.native-record-seal')throw Error('The signed register and issuer state require native enclosing Originals.');
 const unsigned:Omit<Member,'identityProof'>={schema:'receiz.portable-execution-transition-member.v124',profile:'portable-state',participantId:selected.participant,
  operationPlan:selected.plan,planning:planning as unknown as Member['planning'],predecessor:await sdk.transportReceizSealedArtifactV124(prior),
  candidate:await sdk.transportReceizSealedArtifactV124(candidate.artifact),identityArtifact:await sdk.transportReceizSealedArtifactV124(actorSource),signedCapability,
  authority:{memberIsProofAuthority:false,candidateIsCommitted:false,strongerTruth:'sealed-receiz-proof-object'}};
 const member={...unsigned,identityProof:await sign(await createReceizPortableExecutionTransitionIdentityChallengeV124(unsigned))};
 const result:ReceizPortableExecutionTransitionSetV124={schema:'receiz.portable-execution-transition-set.v124',applicationId:BANK_APPLICATION_ID,
  exactPlanDigest:selected.plan.exactPlanDigest,expectedParticipantHeads:selected.plan.expectedParticipantHeads,proposedParticipantHeads:{[selected.participant]:plan.transition.proposedHistoryHead.value},
  members:[member],authority:{transitionSetIsProofAuthority:false,committed:false,strongerTruth:'sealed-receiz-proof-object'}};
 await sdk.verifyReceizPortableExecutionTransitionSetV124(result,{audience:BANK_APPLICATION_ID});
 return result;
}
