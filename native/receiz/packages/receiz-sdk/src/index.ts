export { createReceizInitialSubjectStateV122 } from "./v122InitialSubject.js";
export * from "./valuation.js";
import {
  buildReceizIdContinueRequest,
  createReceizIdIdentity,
  projectReceizIdentityAccount,
  receizBase64UrlDecode,
  readReceizIdentityArtifact,
  signReceizIdentityLoginProof,
  verifyReceizIdentityLoginProof,
  type ReceizDeviceIdentity,
  type ReceizIdContinueOptions,
  type ReceizIdContinueRequest,
  type ReceizIdentityKeyAlgorithm,
  type ReceizKeyFile,
} from "./identity.js";
import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { RECEIZ_HTTP_OPERATION_SUPPORT } from "./httpOperationSupport.js";
export { RECEIZ_HTTP_OPERATION_SUPPORT, type ReceizHttpOperationSupport } from "./httpOperationSupport.js";
import type { ReceizV127SubjectRuntimeAdapter, ReceizV127SubjectRuntimeSource } from "./v127SubjectRuntimeAdapter.js";
import type {
  ReceizArtifactAdmissionOptions,
  ReceizArtifactAdmissionResult,
} from "./artifactAdmissionTypes.js";
import {
  commitReceizArtifactRecovery,
  createReceizArtifactRecoveryCoordinator,
  planReceizArtifactRecovery,
  type ReceizArtifactRecoveryCommitResult,
  type ReceizArtifactRecoveryPlan,
  type ReceizArtifactRecoveryResult,
} from "./artifactRecovery.js";
import type { ReceizVerifiedProofHistory } from "./proofHistory.js";
import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
import type { ReceizAdmissionStore } from "./admissionStore.js";
import { createReceizAdmissionEngine } from "./commandAdmission.js";
import { createReceizBrowserAdmissionStore } from "./browserAdmissionStore.js";
import { createReceizRemoteDomain, type ReceizRemoteDomain } from "./remoteDomain.js";
import { createReceizRemoteSubjectsV122 } from "./v122RemoteSubjects.js";
import { createReceizProofAuthorityExchangeV123 } from "./v123ProofAuthority.js";
import { createReceizRemoteValueExecutionV123 } from "./v123ValueExecution.js";
import {
  confirmReceizEdgeReserveSendV125,
  confirmReceizEdgeSettlementSendV125,
  inspectReceizEdgeValueTransferPlanV125,
  planReceizEdgeReserveTransferV125,
  planReceizEdgeSettlementTransferV125,
  receiveReceizEdgeReserveV125,
  receiveReceizEdgeSettlementV125,
} from "./v125EdgeValue.js";
import {
  applyReceizAttestationEventV125,
  createReceizAttestationApplicationV125,
  planReceizAttestationEventV125,
  verifyReceizAttestationHistoryV125,
} from "./v125Attestation.js";
import { createReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import {
  planReceizInitialAttestationSourceV125,
  planReceizInitialCredentialSourceV125,
  applyReceizInitialSourceV125,
} from "./v125InitialSource.js";
import {
  applyReceizCredentialLifecycleEventV125,
  createReceizCredentialV125,
  planReceizCredentialLifecycleEventV125,
  resolveReceizCredentialCurrentnessV125,
  verifyReceizCredentialHistoryV125,
} from "./v125Credential.js";
import {
  approveReceizPbiCeremonyV125,
  createReceizPbiCeremonyChallengeV125,
  createReceizPbiCeremonyReplayGuardV125,
  issueReceizPbiCeremonyReceiptV125,
  verifyReceizPbiCeremonyReceiptV125,
} from "./v125PbiCeremony.js";
import {
  createReceizSourceBoundCredentialPresentationVerifierV125,
  createReceizCredentialPresentationContentUrlV125,
  createReceizCredentialPresentationNfcHandoffV125,
  createReceizCredentialPresentationQrHandoffV125,
  createReceizCredentialPresentationV125,
  exportReceizCredentialPresentationFileV125,
  importReceizCredentialPresentationFileV125,
  readReceizCredentialPresentationContentUrlV125,
  verifyReceizCredentialPresentationV125,
} from "./v125CredentialPresentation.js";
import {
  RECEIZ_NOTIFICATION_EXECUTION_PROFILE_V125,
  RECEIZ_PAYMENT_EXECUTION_PROFILE_V125,
  RECEIZ_REFUND_EXECUTION_PROFILE_V125,
  createReceizExternalExecutionProfileV125,
  createReceizExternalExecutionRuntimeV125,
  planReceizExternalExecutionV125,
  verifyReceizExternalExecutionOutcomeV125,
  verifyReceizExternalExecutionPlanV125,
} from "./v125ExternalExecution.js";
import {
  prepareReceizInitialTemporalSubjectSourceV125,
  readReceizTemporalSubjectSourceV125,
  readReceizSubjectRelationshipSourceV125,
  applyReceizSubjectRelationshipEventV125,
  createReceizSubjectRelationshipEventBindingDigestV125,
  createReceizSubjectPresenceV125,
  createReceizSubjectPresenceEventBindingDigestV125,
  planReceizSubjectPresenceEventV125,
  applyReceizSubjectPresenceEventV125,
  projectReceizSubjectPresenceV125,
  discoverReceizSubjectsV125,
  planReceizSubjectRelationshipEventV125,
  projectReceizSubjectRelationshipV125,
  resolveReceizSubjectPresenceCurrentnessV125,
  verifyReceizSubjectPresenceV125,
} from "./v125SubjectCoordination.js";
import { createReceizSubjectSourceFamilyV125, openReceizSubjectSourceFamilyV125,
  readReceizSubjectSourceFamilyMemberV125 } from "./v125SubjectSourceFamily.js";
import { createReceizRemoteSubjectMandatesV122 } from "./v122Mandates.js";
import { createReceizRemoteWorldV122 } from "./v122RemoteWorld.js";
import {
  admitReceizSignedExecutionEnvelopeV124,
  createReceizV124Execution,
} from "./v124Execution.js";
import {
  createReceizPortableExecutionTransitionRecoveryV124,
  prepareReceizPortableExecutionTransitionCommitSetV124,
  verifyReceizPortableExecutionTransitionSetV124,
} from "./v124PortableAuthority.js";
import {
  applicationId as validateReceizApplicationIdV124,
} from "./v124Contracts.js";
import { createReceizV124Runtime } from "./v124Runtime.js";
import {
  createReceizV124Domains,
  type ReceizPrivateDomainAdditionsInputV124,
} from "./v124Domains.js";
import {
  createReceizV124Namespaces,
  type ReceizResolveNamespacesInputV124,
} from "./v124Namespaces.js";
import {
  createReceizV124Recipient,
  type ReceizPublicRecipientResolutionInputV124,
} from "./v124Recipient.js";
import {
  createReceizV124Sources,
  type ReceizPublishSealedSourceInputV124,
} from "./v124Sources.js";
import {
  admitReceizSignedAuthenticatedRuntimeEnvelopeV124,
  createReceizAuthenticatedRuntimeRequestV124,
  type ReceizAuthenticatedRuntimeRequestV124,
} from "./v124AuthenticatedRuntime.js";
import {
  type ReceizExecutionTransportRequestInputV124,
} from "./v124TransportBinding.js";
import type { ReceizDomainReplayExpectationV124 } from "./v124Replay.js";
import type {
  ReceizDomainReplayProofObjectExportInputV124,
  ReceizDomainReplayProofObjectRestoreInputV124,
} from "./v124ReplayProofObject.js";
import { receizKaiMomentFromSealedPulse, receizKaiNow } from "./v124Kai.js";
import { planReceizWorldAccessAppendV122 } from "./v122WorldAccess.js";
import { planReceizReserveV122, planReceizSettlementV122, quoteReceizDisplayUsdV122, validateReceizDisplayPriceV122, validateReceizValueIntentV122 } from "./v122Value.js";
import { RECEIZ_RELEASE_VERSION } from "./releaseIdentity.js";
import { verifyReceizArtifactForReconciliation } from "./globalReconciliation.js";
import {
  signReceizCapability,
  type ReceizVerifiedCapability,
} from "./capabilityAuthority.js";
import type { ReceizAuthorityFailure } from "./authorityResults.js";
import {
  createPublicProofProjection,
  type PublicProofProjection,
} from "./publicProjection.js";
import type {
  ReceizBearerCapabilityV1,
  ReceizBearerInstrumentV1,
  ReceizBearerTransferPlanV1,
  ReceizBearerTransferPolicyV1,
  ReceizBearerTransferReceiptV1,
  ReceizSubjectArtifactV1,
  ReceizSubjectCapabilityV1,
  ReceizSubjectInventoryV1,
  ReceizSubjectMandatePolicyV1,
  ReceizSubjectMandateV1,
  ReceizSubjectMemoryEventV1,
  ReceizSubjectMemoryProjectionV1,
  ReceizSubjectMindArtifactV1,
  ReceizSubjectProofBrainHeadV1,
  ReceizSubjectProofBrainSearchInput,
  ReceizSubjectProofBrainStreamEvent,
  ReceizSubjectProofContextV1,
  ReceizSubjectProofReferenceV1,
  ReceizSubjectRelationshipV1,
  ReceizSubjectRuntimeJobV1,
  ReceizSubjectRuntimeTickInput,
  ReceizSubjectTwinMessageInput,
  ReceizSubjectTwinResultV1,
  ReceizSubjectTwinStreamEvent,
  ReceizSubjectV1,
  ReceizWorldAuthorityV1,
  ReceizWorldTransactionAuthorityV1,
  ReceizWorldCommandInputV1,
  ReceizWorldCommandPlanV1,
  ReceizWorldCommandV1,
  ReceizWorldExecutionResultV1,
  ReceizWorldEventV1,
  ReceizWorldReceiptV1,
  ReceizWorldTransactionV1,
} from "./livingSubjects.js";
export * from "./identity.js";
export * from "./portableStateSegments.js";
export * from "./materialProofUrl.js";
export * from "./materialCompositeTransport.js";
export * from "./materialProgressiveLedger.js";
export * from "./materialSourceFamily.js";
export * from "./conversationDomain.js";
export * from "./conversationPrivateTransport.js";
export * from "./conversationSourceFamily.js";
export * from "./v1241Capabilities.js";
export * from "./offlineNoteDestination.js";
export * from "./offlineNoteReceivingSeal.js";
export * from "./offlineNoteIrreversibleCustody.js";
export * from "./offlineNotePlatformAttestation.js";
export * from "./offlineNoteRollbackConformance.js";
export * from "./offlineNoteAttestedCustody.js";
export * from "./offlineNoteWebAuthnCustody.js";
export * from "./offlineReserveWebAuthnCustody.js";
export * from "./offlineReserveFundingBinding.js";
export * from "./offlineNoteCustodyConformance.js";
export * from "./noteCausalSubtraction.js";
export * from "./constitution.js";
export * from "./appContract.js";
export * from "./currentRegistry.generated.js";
export * from "./v114Registry.generated.js";
export * from "./v115Registry.generated.js";
export * from "./v116Registry.generated.js";
export * from "./v117Registry.generated.js";
export * from "./v118Registry.generated.js";
export * from "./v119Registry.generated.js";
export * from "./v120Registry.generated.js";
export * from "./v121Registry.generated.js";
export * from "./v122Registry.generated.js";
export * from "./v124Registry.generated.js";
export * from "./v125Registry.generated.js";
export * from "./v122Canonical.js";
export * from "./v122Subjects.js";
export * from "./v122EdgeBundle.js";
export * from "./v122RemoteSubjects.js";
export * from "./v122SubjectAccess.js";
export * from "./v122PrivateWorld.js";
export * from "./v122Transactions.js";
export * from "./v122Value.js";
export * from "./v122WorldAccess.js";
export * from "./v122Mandates.js";
export * from "./v122MultiWorld.js";
export * from "./v122RemoteWorld.js";
export * from "./v123Namespaces.js";
export * from "./v123ProofAuthority.js";
export * from "./v123ValueExecution.js";
export * from "./v125LawfulAction.js";
export * from "./v125LawfulActionClient.js";
export * from "./v125LawfulDelivery.js";
export * from "./v125AttestationSchemas.js";
export {
  createReceizAttestationAuthorityV125,
  signReceizAttestationRoleGrantV125,
  verifyReceizAttestationRoleGrantAuthorityV125,
  verifyReceizAttestationEvidenceBundleAuthorityV125,
} from "./v125AttestationAuthority.js";
export type {
  ReceizAttestationRoleGrantV125,
  ReceizAttestationEvidenceReferenceV125,
  ReceizAttestationEvidenceArtifactV125,
  ReceizAttestationDomainAuthorityProofV125,
  ReceizAttestationAuthorityV125,
  ReceizAttestationAuthorityOptionsV125,
} from "./v125AttestationAuthority.js";
export * from "./v125Attestation.js";
export * from "./v125Credential.js";
export {
  planReceizInitialAttestationSourceV125,
  planReceizInitialCredentialSourceV125,
  receizInitialSourceCapabilityContextV125,
  applyReceizInitialSourceV125,
} from "./v125InitialSource.js";
export type {
  ReceizInitialSourcePlanV125,
  ReceizInitialSourceSealerV125,
  ReceizInitialSourceCommitV125,
  ReceizInitialSourceStoreV125,
} from "./v125InitialSource.js";
export * from "./v125PbiCeremony.js";
export * from "./v125CredentialPresentation.js";
export * from "./v125ExternalExecution.js";
export * from "./v125SubjectCoordination.js";
export * from "./v125SubjectSourceFamily.js";
import { planReceizSubjectMessageEventV125, applyReceizSubjectMessageEventV125, projectReceizSubjectThreadV125 } from "./v125SubjectMessageSource.js";
import { prepareReceizInitialTemporalConversationSourceV125, createReceizSubjectThreadSourceFamilyV125,
  openReceizSubjectThreadSourceFamilyV125, readReceizSubjectThreadSourceMemberV125 } from "./v125SubjectThreadSource.js";
export { planReceizSubjectMessageEventV125, applyReceizSubjectMessageEventV125, projectReceizSubjectThreadV125,
  prepareReceizInitialTemporalConversationSourceV125, createReceizSubjectThreadSourceFamilyV125,
  openReceizSubjectThreadSourceFamilyV125, readReceizSubjectThreadSourceMemberV125 };
export type { ReceizSubjectMessageEventPlanV125, ReceizSubjectThreadSourceStoreV125 } from "./v125SubjectMessageSource.js";
export type { ReceizSubjectThreadSourceFamilyV125, ReceizOpenedSubjectThreadSourceFamilyV125 } from "./v125SubjectThreadSource.js";
export * from "./v125EdgeValue.js";
export * from "./v125Capabilities.js";
export { validateReceizOperationPlanV124 } from "./v124Contracts.js";
export type {
  ReceizOperationKindV124,
  ReceizOperationPlanV124,
  ReceizExecutionStatusV124,
  ReceizAuthoritySessionStatusV124,
  ReceizQualificationStatusV124,
  ReceizRecipientResolutionStatusV124,
  ReceizExecutionProjectionV124,
  ReceizAuthoritySessionProjectionV124,
  ReceizQualificationProjectionV124,
  ReceizPublicRecipientProjectionV124,
} from "./v124Contracts.js";
export {
  planReceizLocatorBoundValueIntentV124,
  validateReceizLocatorBoundValueIntentV124,
} from "./v124LocatorBoundValue.js";
export type {
  ReceizLocatorBoundValueIntentInputV124,
  ReceizLocatorBoundValueIntentV124,
} from "./v124LocatorBoundValue.js";
export {
  createReceizWorldExecutionEventV124,
  planReceizMultiWorldCompositeOperationV124,
  planReceizMultiWorldExecutionProjectionV124,
  planReceizWorldCompositeOperationV124,
  planReceizWorldExecutionProjectionV124,
  validateReceizMultiWorldCompositeOperationV124,
  validateReceizMultiWorldExecutionProjectionV124,
  validateReceizWorldCompositeOperationV124,
  validateReceizWorldExecutionProjectionV124,
} from "./v124WorldComposite.js";
export type {
  ReceizMultiWorldCompositeOperationV124,
  ReceizMultiWorldExecutionMemberV124,
  ReceizMultiWorldExecutionProjectionInputV124,
  ReceizMultiWorldExecutionProjectionV124,
  ReceizWorldCompositeCommandCategoryV124,
  ReceizWorldCompositeOperationV124,
  ReceizWorldExecutionEventV124,
  ReceizWorldExecutionPrivateEnvelopeV124,
  ReceizWorldExecutionProjectionInputV124,
  ReceizWorldExecutionProjectionV124,
} from "./v124WorldComposite.js";
export {
  ReceizExecutionZeroWriteErrorV124,
  createReceizCustomReducerBindingsV124,
  deriveReceizRegisteredOperationCasV124,
  exportReceizCommittedExecutionRecoveryV124,
  planAtomicOperationV124,
} from "./v124Execution.js";
export {
  canonicalizeReceizTransportBindingV124,
  createReceizTransportBindingV124,
  digestReceizExecutionTransportRequestV124,
  readReceizSignedTransportEnvelopeV124,
  verifyReceizTransportBindingV124,
} from "./v124TransportBinding.js";
export type {
  ReceizExecutionTransportRequestInputV124,
  ReceizSignedTransportEnvelopeV124,
  ReceizTransportBindingAuthorityV124,
  ReceizTransportBindingExpectationV124,
  ReceizTransportBindingInputV124,
  ReceizTransportBindingKindV124,
  ReceizTransportBindingV124,
  ReceizTransportSignatureV124,
} from "./v124TransportBinding.js";
export {
  createReceizPortableExecutionAuthorityEventV124,
  createReceizPortableExecutionAuthorityIdentityChallengeV124,
  createReceizPortableExecutionTransitionRecoveryV124,
  isReceizVerifiedPortableExecutionTransitionSetV124,
  isReceizVerifiedPortableExecutionAuthorityV124,
  prepareReceizPortableExecutionTransitionCommitSetV124,
  recoverReceizPortableExecutionTransitionSetV124,
  transportReceizSealedArtifactV124,
  verifyReceizPortableExecutionTransitionSetV124,
  verifyReceizPortableExecutionAuthorityEvidenceV124,
} from "./v124PortableAuthority.js";
export type {
  ReceizPortableExecutionAuthorityEvidenceV124,
  ReceizPortableExecutionAuthorityEventV124,
  ReceizPortableExecutionAuthorityRequestV124,
  ReceizPortableExecutionAuthorityVerifierOptionsV124,
  ReceizPortableExecutionOutcomeCoordinatesV124,
  ReceizPortableExecutionTransitionMemberV124,
  ReceizPortableExecutionTransitionRecoveryV124,
  ReceizPortableExecutionTransitionSetV124,
  ReceizPreparedPortableExecutionTransitionCommitSetV124,
  ReceizPortableSealedArtifactV124,
  ReceizRecoveredPortableExecutionTransitionSetV124,
  ReceizVerifiedPortableExecutionAuthorityV124,
  ReceizVerifiedPortableExecutionTransitionMemberV124,
  ReceizVerifiedPortableExecutionTransitionSetV124,
} from "./v124PortableAuthority.js";
export type {
  ReceizAtomicOperationInputV124,
  ReceizDurableExecutionHandleV124,
  ReceizExecutionIdempotencyCoordinatesV124,
  ReceizExecutionOutcomeV124,
  ReceizExecutionResolutionV124,
  ReceizRegisteredOperationBasisV124,
  ReceizRegisteredOperationCasV124,
  ReceizRegisteredOperationV124,
  ReceizZeroWriteFailureV124,
} from "./v124Execution.js";
export {
  isReceizVerifiedCheckpointV124,
  validateReceizCheckpointV124,
  validateReceizDomainReplayV124,
  validateReceizReplayV124,
} from "./v124Replay.js";
export type {
  ReceizNamespaceProjectionV124,
  ReceizDomainReplayAdditionV124,
  ReceizDomainReplayExpectationV124,
  ReceizDomainReplayV124,
  ReceizDomainReplayReceiptV124,
  ReceizCheckpointV124,
  ReceizCheckpointReceiptV124,
  ReceizCheckpointExpectationV124,
} from "./v124Replay.js";
export {
  RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY,
  createReceizDomainAppendCommandsV124,
  createReceizDomainReplaySourceAuthorityV124,
  createReceizDomainReplaySourceIntentV124,
  prepareReceizDomainReplayCheckpointProofObjectCandidateV124,
  prepareReceizDomainReplaySegmentProofObjectCandidateV124,
  prepareReceizSubjectSourceProofObjectCandidateV124,
} from "./v124ReplayProofObject.js";
export type {
  ReceizDomainAppendCausalParentHeadV124,
  ReceizDomainAppendCommandV124,
  ReceizDomainAppendCommandsInputV124,
  ReceizDomainAppendConflictV124,
  ReceizDomainAppendReceiptV124,
  ReceizDomainAppendResultV124,
  ReceizDomainReplayAppendIndexWitnessV124,
  ReceizDomainReplayAppendIndexValueV124,
  ReceizDomainReplayCheckpointProofObjectCandidateInputV124,
  ReceizDomainReplayCheckpointProofObjectCandidateV124,
  ReceizDomainReplayCheckpointProofCarrierV124,
  ReceizDomainReplayFibonacciWitnessV124,
  ReceizDomainReplayIdentityVerificationProjectionV124,
  ReceizDomainReplayKaiV124,
  ReceizDomainReplayNamespaceHeadV124,
  ReceizDomainReplayProofCarrierV124,
  ReceizDomainReplayProofHeadV124,
  ReceizDomainReplayProofObjectExpectationV124,
  ReceizDomainReplayProofObjectExportInputV124,
  ReceizDomainReplayProofObjectExportV124,
  ReceizDomainReplayProofObjectRestorationV124,
  ReceizDomainReplayProofObjectRestoreInputV124,
  ReceizDomainReplayProofSegmentChildV124,
  ReceizDomainReplayProofSegmentCommitmentV124,
  ReceizDomainReplaySegmentProofObjectCandidateInputV124,
  ReceizDomainReplaySegmentProofObjectCandidateV124,
  ReceizDomainReplaySegmentProofCarrierV124,
  ReceizDomainReplaySegmentSourceCoordinateV124,
  ReceizDomainReplaySegmentSourceExpectationV124,
  ReceizDomainReplaySourceAuthoringEvidenceV124,
  ReceizDomainReplaySourceAuthorityV124,
  ReceizDomainReplaySourceIntentInputV124,
  ReceizDomainReplaySourceIntentV124,
  ReceizProofObjectCandidatePortableV124,
  ReceizReadDomainReplayCheckpointSourceV124,
  ReceizReadDomainReplaySegmentSourceV124,
  ReceizReadSubjectSourceV124,
  ReceizReadViewerSubjectSourceV124,
  ReceizSubjectSourceProofObjectCandidateInputV124,
  ReceizSubjectSourceProofObjectCandidateV124,
  ReceizViewerSubjectSourceCarrierV124,
} from "./v124ReplayProofObject.js";
export {
  createReceizV124Sources,
  validateReceizSealedSourcePublicationResultV124,
} from "./v124Sources.js";
export type {
  ReceizPublishSealedSourceInputV124,
  ReceizSealedSourcePublicationKindV124,
  ReceizSealedSourcePublicationResultV124,
  ReceizV124SourcesRemoteV124,
} from "./v124Sources.js";
export { receizKaiMomentFromSealedPulse, receizKaiNow };
export type { ReceizKaiNow, ReceizKaiSealedMoment } from "./v124Kai.js";
export {
  RECEIZ_KAI_SIGIL_GROTH16_SCHEMA,
  RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA,
  RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA,
  RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID,
  RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA,
  RECEIZ_KKS_V1_VERSION,
  admitReceizKksV1ProofCoordinate,
  createReceizKksV1LiveProofCoordinate,
  projectReceizKksV1SealedProofCoordinate,
} from "./v125KaiAuthority.js";
export type {
  ReceizKaiSigilGroth16ProofV1,
  ReceizKaiSigilProofFactoryV1,
  ReceizKaiSigilTemporalPayloadV1,
  ReceizKaiSigilTemporalProofV1,
  ReceizKksV1AdmissionContext,
  ReceizKksV1ProofCoordinate,
} from "./v125KaiAuthority.js";
export {
  RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS,
  RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA,
  runReceizV125TemporalAuthorityConformance,
} from "./v125TemporalAuthorityConformance.js";
export type {
  ReceizV125TemporalAuthorityCheck,
  ReceizV125TemporalAuthorityCheckId,
  ReceizV125TemporalAuthorityConformanceReport,
} from "./v125TemporalAuthorityConformance.js";
export {
  RECEIZ_V125_AUTHORITY_FLOW,
  RECEIZ_V125_AUTHORITY_FLOW_SCHEMA,
  RECEIZ_V125_AUTHORITY_STAGES,
  RECEIZ_V125_HIGHEST_CASH_OUT_FRAME,
  assertReceizV125AuthorityFlowStep,
} from "./v125AuthorityFlow.js";
export type {
  ReceizV125AuthorityFlow,
  ReceizV125AuthorityStage,
} from "./v125AuthorityFlow.js";
export { createReceizProofAuthorityChallenge } from "./v124ProofAuthorityChallenge.js";
export type {
  CreateReceizProofAuthorityChallengeInput,
  CreatedReceizProofAuthorityChallenge,
} from "./v124ProofAuthorityChallenge.js";
export { ReceizRuntimeZeroWriteErrorV124 } from "./v124Runtime.js";
export type {
  ReceizOpenAuthoritySessionInputV124,
  ReceizRefreshAuthoritySessionInputV124,
  ReceizCloseAuthoritySessionInputV124,
  ReceizAuthoritySessionNamespaceV124,
  ReceizAuthoritySessionV124,
  ReceizAuthoritySessionClosedV124,
  ReceizRuntimeOperationV124,
  ReceizRuntimeZeroWriteReasonV124,
  ReceizRuntimeZeroWriteFailureV124,
  ReceizQualificationOperationV124,
  ReceizOperationalQualificationInputV124,
  ReceizQualificationReasonV124,
  ReceizQualificationRetryV124,
  ReceizQualificationEvidenceV124,
  ReceizOperationalCapabilityV124,
  ReceizOperationalCapabilityReportV124,
} from "./v124Runtime.js";
export type {
  ReceizPrivateDomainAdditionsInputV124,
  ReceizPrivateDomainAdditionV124,
  ReceizPrivateDomainAdditionsResultV124,
} from "./v124Domains.js";
export type {
  ReceizResolveNamespacesInputV124,
  ReceizValidatedNamespaceProjectionV124,
} from "./v124Namespaces.js";
export {
  createReceizPublicRecipientLocatorReferenceV124,
  normalizeReceizPublicRecipientAliasV124,
  validateReceizPublicRecipientLocatorReferenceV124,
} from "./v124Recipient.js";
export type {
  ReceizPublicRecipientLocatorReferenceV124,
  ReceizPublicRecipientResolutionInputV124,
  ReceizPublicRecipientResolutionV124,
} from "./v124Recipient.js";
export * from "./globalCoordinationTypes.js";
export * from "./globalReconciliation.js";
export * from "./globalCoordinationProtocol.js";
export * from "./remoteAdmissionStore.js";
export * from "./remoteArtifactTransitionStore.js";
export * from "./remoteDomain.js";
export * from "./verificationLimits.js";
export * from "./commandAdmission.js";
export * from "./capabilityAuthority.js";
export * from "./admissionStore.js";
export {
  createReceizBrowserAdmissionStore,
  type ReceizBrowserAdmissionStoreOptions,
} from "./browserAdmissionStore.js";
export {
  createReceizArtifactAdmissionEngine,
  createReceizCapabilityIssuerResolver,
  admitReceizLegacyProfileShowcaseMigrationWithInspectionContext,
  admitReceizProfileShowcaseCheckpointBundleV114,
  admitReceizProfileShowcaseCheckpointCarrierWithContextV114,
  admitReceizEconomyShowcaseSuccessorWithPredecessorContext,
  admitReceizProfileShowcaseGenesisWithActorContext,
  admitReceizProfileShowcaseMergeWithParentContext,
  admitReceizProfileShowcaseMergeWithExactParentContext,
  admitReceizProfileShowcaseSuccessorWithExactPredecessorContext,
  admitReceizProfileShowcaseSuccessorWithPredecessorContext,
  inspectReceizBoundedProfileShowcaseV114,
  inspectReceizLegacyProfileShowcaseV114,
  isSdkIssuedReceizArtifactAdmission,
  isSdkAdmittedReceizCapabilityIssuerKey,
  isSdkInspectedLegacyProfileShowcaseV114,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  rederiveReceizEconomyShowcaseCarrierFromAdmission,
  rederiveReceizProfileShowcaseCarrierFromAdmission,
  createReceizProfileShowcaseCheckpointCarrierV114,
  isSdkVerifiedProfileShowcaseCheckpointV114,
  verifyReceizArtifactAdmission,
  type ReceizInspectedLegacyProfileShowcaseV114,
  type ReceizInspectedBoundedProfileShowcaseV114,
  type ReceizVerifiedProfileShowcaseCheckpointV114,
  readReceizIdentityPublicBinding,
  type ReceizIdentityPublicBinding,
} from "./artifactAdmission.js";
export * from "./artifactAdmissionTypes.js";
export * from "./artifactRecovery.js";
export * from "./artifactTransition.js";
export type {
  ReceizAppendReceipt,
  ReceizArtifactTransitionCommitCommandBasis,
  ReceizArtifactTransitionCommitResult,
  ReceizArtifactTransitionCommitUnit,
  ReceizArtifactTransitionStore,
  ReceizArtifactTransitionStoreVerificationInput,
  ReceizReportedActorReference,
  ReceizStagedArtifactTransition,
  ReceizStagedCandidateReference,
  ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionStore.js";
export * from "./namespaceReducer.js";
export * from "./causalHistory.js";
export * from "./causalReplay.js";
export {
  createReceizArtifactTransitionProofHistoryAppendNode,
  createReceizProfileShowcaseProofHistoryNode,
  deriveReceizProfileShowcaseHistoryBinding,
  createReceizProofHistoryNode,
  deriveReceizVerifiedProofHistoryFromAdmission,
  isRuntimeVerifiedReceizProofHistory,
  mergeReceizProofHistoryPrefix,
  mergeReceizVerifiedProofHistories,
  normalizeReceizProofHistory,
  verifyReceizProofHistory,
} from "./proofHistory.js";
export type {
  ReceizArtifactTransitionHistoryAppendBasis,
  ReceizProofHistory,
  ReceizProofHistoryEvent,
  ReceizProofHistoryEvidenceRoot,
  ReceizProofHistoryNode,
  ReceizProofHistoryReceiptVerifier,
  ReceizProfileShowcaseHistoryBinding,
  ReceizVerifiedProofHistory,
} from "./proofHistory.js";
export * from "./registryArtifact.js";
export { discoverReceizRegistryLaw } from "./registryDiscovery.js";
export type {
  ReceizDiscoveredLaw,
  ReceizRegistryDiscoveryInput,
  ReceizRegistryDiscoveryResult,
  ReceizRegistryTrustEvidence,
} from "./registryDiscovery.js";
export * from "./releaseIdentity.js";
export * from "./portableAsset.js";
export * from "./proofObjectAuthorship.js";
export * from "./pbiSignedBadge.js";
export * from "./nativeCapture.js";
export * from "./profileShowcaseTransport.js";
export * from "./economyShowcaseTransport.js";
export * from "./globalEconomyTransport.js";
export * from "./sportsVaultRecursiveTransport.js";
export * from "./profileShowcasePersistentState.js";
export * from "./compositeProofKernel.js";
export * from "./sourceCarriedReplay.js";
export * from "./compositeProofTransport.js";
export * from "./livingSubjects.js";
export * from "./livingSubjectSchemas.js";
export * from "./livingSubjectRuntime.js";
export * from "./v127SubjectRuntimeAdapter.js";
import { ReceizError } from "./errors.js";
import {
  ReceizArtifactError,
  assertSdkIssuedReadableArtifact,
  canonicalVerifyPath,
  downloadReceizArtifact,
  filenameFromContentDisposition,
  issueCurrentNativeArtifact,
  issueVerifiedLegacyArtifact,
  issueVerifiedPayload,
  mimeTypeFromResponse,
  sha256ReceizBytes,
  snapshotSuccessfulArtifactVerification,
  type ReceizArtifactDownloadEvidence,
  type ReceizOpenedArtifact,
  type ReceizPayload,
  type ReceizSealedArtifact,
} from "./artifacts.js";
import {
  verifyAndExtractReceizDocumentBytesLocal,
} from "./verifier/index.js";
import type { ReceizArtifactInput } from "./artifactInput.js";
import {
  verifyReceizArtifact as verifyReceizArtifactStrict,
  type ReceizArtifactVerificationResult,
} from "./artifactVerification.js";
export { ReceizArtifactError };
export { sha256ReceizBytes } from "./artifacts.js";
export type {
  ReceizArtifactDownloadEvidence,
  ReceizArtifactErrorCode,
  ReceizNativeArtifactContinuity,
  ReceizOpenedArtifact,
  ReceizPayload,
  ReceizSealedArtifact,
  ReceizSuccessfulArtifactVerification,
  ReceizVerifiedLegacyArtifact,
  ReceizVerifiedLegacyContinuity,
  ReceizVerifiedPayload,
} from "./artifacts.js";
import {
  parseReceizProfileUpdateResult,
  parseReceizUsernameAvailability,
  type ReceizProfileUpdateInput,
  type ReceizProfileUpdateResult,
  type ReceizUsernameAvailability,
} from "./profile.js";
export * from "./profile.js";
export * from "./errors.js";
import {
  RECEIZ_OIDC_SCOPES_BY_RAIL,
  describeReceizCapabilities,
  receizOidcScopesForRails,
  type ReceizCapabilityKey,
  type ReceizRailScopeKey,
} from "./capabilities.js";
export * from "./capabilities.js";
export * from "./authorityEncoding.js";
export * from "./authorityResults.js";
export * from "./artifactInput.js";
export {
  assertRuntimeCustodiedReceizArtifactVerification,
  verifyReceizArtifact,
  type ReceizArtifactContinuityAssessment,
  type ReceizArtifactDigest,
  type ReceizArtifactVerification,
  type ReceizArtifactVerificationError,
  type ReceizArtifactVerificationResult,
  type ReceizPayloadDigest,
  type ReceizUnsupportedArtifactReason,
} from "./artifactVerification.js";
export * from "./publicProjection.js";

export const RECEIZ_SDK_VERSION = RECEIZ_CURRENT_RELEASE_VERSION;

export const RECEIZ_DEFAULT_BASE_URL = "https://receiz.com";
export const RECEIZ_WEBHOOK_SIGNATURE_HEADER = "x-receiz-signature";
export const RECEIZ_WEBHOOK_TIMESTAMP_HEADER = "x-receiz-timestamp";
export const RECEIZ_APP_STATE_FEED_SCHEMA = "receiz.app.public_state_registry_feed.v1";
export const RECEIZ_PUBLIC_STORE_STATE_FEED_SCHEMA = "receiz.app.public_store_state_registry_feed.v1";
export const RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA = "receiz.app.public_store_state_projection.v1";
export const RECEIZ_PUBLIC_STORE_SIGNED_PUBLISH_SCHEMA = "receiz.public_store.signed_publish.v1";
export const RECEIZ_PUBLIC_STORE_PUBLISH_PROOF_SCHEMA = "receiz.public_store.identity_publish_proof.v1";
export const RECEIZ_PUBLIC_STORE_PUBLISH_CHALLENGE_SCHEMA = "receiz.public_store.publish_challenge.v1";

const RECEIZ_WEBHOOK_PAYMENT_EVENTS = [
  "checkout.session.created",
  "checkout.session.completed",
  "payment.created",
  "payment.settled",
  "payment.failed",
  "payment.refunded",
] as const;

const RECEIZ_WEBHOOK_COMMERCE_EVENTS = ["order.created", "reward.claimed"] as const;
const RECEIZ_WEBHOOK_PROOF_EVENTS = [
  "asset.created",
  "asset.transferred",
  "proof.appended",
  "event_proof.created",
  "sports_card.scored",
] as const;
const RECEIZ_WEBHOOK_OWNERSHIP_SETTLEMENT_EVENTS = [
  "wallet.ledger_entry",
  "note.claimed",
  "ownership.transferred",
  "market.trade",
] as const;
const RECEIZ_WEBHOOK_APP_PROFILE_EVENTS = [
  "profile.asset.visible_changed",
  "app_state.published",
  "world.campaign.sent",
] as const;

export const RECEIZ_WEBHOOK_EVENT_GROUPS = [
  {
    key: "payment",
    title: "Payment events",
    detail: "Checkout, payment settlement, refund, and failure events for Receiz Payments.",
    events: RECEIZ_WEBHOOK_PAYMENT_EVENTS,
  },
  {
    key: "commerce",
    title: "Commerce events",
    detail: "Order and reward events for store, app runtime, and customer automations.",
    events: RECEIZ_WEBHOOK_COMMERCE_EVENTS,
  },
  {
    key: "proof",
    title: "Proof events",
    detail: "Proof object, asset, event proof, and Sports card append events.",
    events: RECEIZ_WEBHOOK_PROOF_EVENTS,
  },
  {
    key: "ownershipSettlement",
    title: "Ownership and settlement events",
    detail: "Wallet, note, transfer, and ownership events beneath proof-native value rails.",
    events: RECEIZ_WEBHOOK_OWNERSHIP_SETTLEMENT_EVENTS,
  },
  {
    key: "appProfile",
    title: "App and profile events",
    detail: "Public app-state, profile visibility, and World campaign events.",
    events: RECEIZ_WEBHOOK_APP_PROFILE_EVENTS,
  },
] as const;

export type ReceizWebhookEventType = (typeof RECEIZ_WEBHOOK_EVENT_GROUPS)[number]["events"][number];

export const RECEIZ_WEBHOOK_EVENT_TYPES: ReceizWebhookEventType[] = RECEIZ_WEBHOOK_EVENT_GROUPS.flatMap((group) => [
  ...group.events,
]);

export const RECEIZ_WEBHOOK_EVENT_PRESETS = {
  payment: [...RECEIZ_WEBHOOK_PAYMENT_EVENTS],
  commerce: [...RECEIZ_WEBHOOK_COMMERCE_EVENTS],
  proofSettlement: [
    ...RECEIZ_WEBHOOK_PAYMENT_EVENTS,
    ...RECEIZ_WEBHOOK_PROOF_EVENTS,
    ...RECEIZ_WEBHOOK_OWNERSHIP_SETTLEMENT_EVENTS,
  ],
  everything: [...RECEIZ_WEBHOOK_EVENT_TYPES],
} satisfies Record<string, ReceizWebhookEventType[]>;

// Primitive boundary: sealed artifacts, proof bundles, verified appends, ownership appends, and settlement ledger records remain the stronger source of truth.
// Connect is delegated API access, not the identity proof root.

export type JsonObject = Record<string, unknown>;

/** Complete service artifact and exact descriptive response metadata. Header
 * values do not grant proof admission, identity, or ownership. */
export type ReceizConnectRecordArtifactResponse = Readonly<{
  artifact: Blob;
  saved: string | null;
  visibility: string | null;
  showOnProfile: string | null;
}>;
export interface ReceizConnectRecordOperation {
  (body: JsonObject & { includeArtifact: false }): Promise<JsonObject>;
  (body: JsonObject & { includeArtifact?: true }): Promise<ReceizConnectRecordArtifactResponse>;
  (body: JsonObject): Promise<JsonObject | ReceizConnectRecordArtifactResponse>;
}

function arrayBufferCopy(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export type ReceizClientOptions = {
  baseUrl?: string;
  accessToken?: string;
  /** Request coordinate for methods whose exact historical input omits applicationId; never an admission authority. */
  applicationId?: string;
  fetchImpl?: typeof fetch;
  /** Executable local V120 host; modern V122/V124 subject routes remain distinct. */
  subjectRuntime?: ReceizV127SubjectRuntimeAdapter;
  /** Explicit historical HTTP host. The default Receiz deployment does not supply V120 routes. */
  legacySubjectTransport?: "http";
  /** Preserve historical Connect contracts only on a deliberately configured
   * compatibility host. The default Receiz server does not implement them. */
  legacyConnectTransport?: "http";
};

export type ReceizApiError = {
  ok: false;
  error: string;
  detail?: string | null;
  [key: string]: unknown;
};

export type WireProofAttestation = {
  schema: "wireproof.v1";
  anchorId: string;
  claimHashSha256: string;
  verifierPath: string;
};

export type ReceizBundleSignatureV3 = {
  version: 1;
  alg: "Ed25519";
  kid: string;
  sig: string;
  payloadHashSha256: string;
  signedAtMs: number;
};

export type ReceizSignatureV4DeviceCert = {
  version: 1;
  certType: "receiz.device.v1";
  certId: string;
  issuerKid: string;
  alg: "Ed25519";
  subjectPublicKeyRawB64u: string;
  issuedAtMs: number;
  expiresAtMs: number;
  sig: string;
};

export type ReceizBundleSignatureV4 = {
  version: 1;
  alg: "Ed25519";
  cert: ReceizSignatureV4DeviceCert;
  sig: string;
  payloadHashSha256: string;
  signedAtMs: number;
};

export type ReceizProofBundle = {
  kind: "receiz.proof_bundle";
  payloadVersion: "v2" | "v1";
  createdAtMs: number;
  ts: string;
  tsDisplay?: string;
  tzMinutesEast?: number;
  code: string;
  slug: string;
  verifyPath: string;
  verifyUrl: string;
  kaiPulseEternal: string;
  /** Exact original producer coordinate when carried by the sealed proof. */
  kaiUpulse?: string;
  kaiKlok: string;
  signerKeyId?: string;
  anchorId?: string;
  receizClaimId: string;
  sigilClaimSeed: string;
  zkPoseidonHash?: string;
  groth16Proof?: unknown;
  groth16ProofDigest?: string;
  artifactSha256Basis?: string;
  artifactBasis?: {
    algorithm: "sha256";
    normalization: "jpeg-adobe-xmp-app1-v1" | "jpeg-ios-photos-carrier-v2" | "jpeg-ios-photos-carrier-v3" | "jpeg-ios-photos-carrier-v4" | "jpeg-ios-photos-carrier-v5" | "jpeg-ios-photos-carrier-v6";
  };
  signatureV3?: ReceizBundleSignatureV3;
  signatureV4?: ReceizBundleSignatureV4;
  wireproof?: WireProofAttestation;
  [key: string]: unknown;
};

export type DocumentVerifyResponse = {
  ok: boolean;
  integrity?: { ok: boolean; errors: string[] };
  kind: string;
  errors: string[];
  warnings: string[];
  bundle?: JsonObject | null;
  anchor?: JsonObject | null;
  package?: JsonObject | null;
  assetContinuity?: {
    state: "verified" | "historical_missing" | "invalid" | "not_applicable";
    carrier?: "portable_asset" | "ownership_provenance" | "native_record_seal";
    issuerKid?: string | null;
    artifactId?: string;
    headReference?: string;
    ownerReceizId?: string;
    namespace?: string;
    priorHeadReference?: string;
    genesisOwnerReceizId?: string;
    historyDigestSha256?: string;
    appendCount?: number;
    history?: readonly Readonly<Record<string, unknown>>[];
    historyComplete?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ReceizProofObjectType =
  | "proof_object"
  | "sports_card"
  | "signal_card"
  | "wallet_note"
  | "market_certificate"
  | "profile_original"
  | "document";

export class ReceizProofObjectError extends ReceizError<"continuity_payload_missing" | "continuity_identity_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed"> {
  constructor(readonly code: "continuity_payload_missing" | "continuity_identity_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed") {
    super(code, code, { rail: "proof", retryable: false });
    this.name = "ReceizProofObjectError";
  }
}

export type ReceizProofObjectCreateOptions = Readonly<{
  idempotencyKey: string;
  filename?: string;
}>;

export type ReceizProofObjectCreateInput = Readonly<{
  assetType: ReceizProofObjectType;
  payload: ReceizPayload;
}>;

export type ReceizBearerArtifactClaimInput = Readonly<{
  artifact: ReceizOpenedArtifact["sealedArtifact"];
}>;

export type PublicProofTransportRecord<TData extends JsonObject = JsonObject> = {
  ok?: boolean;
  id?: string;
  sourceUrl?: string;
  schema?: string | null;
  state?: string;
  platform?: string | null;
  appNamespace?: string | null;
  appObjectId?: string | null;
  createdAt?: string;
  record?: JsonObject | null;
  data?: TData | null;
  proof?: JsonObject | null;
  [key: string]: unknown;
};

/** @deprecated HTTP compatibility shape; use PublicProofProjection for SDK-facing public proof data. */
export type PublicProofRecord<TData extends JsonObject = JsonObject> = PublicProofTransportRecord<TData>;

export type PublicProofObserveRequest = ({ sourceUrl: string; url?: string } | { sourceUrl?: string; url: string }) & {
  sourceType?: string;
  externalCreatorId?: string;
  title?: string;
  [key: string]: unknown;
};

export type PublicProofRegistryFeed = {
  schema: string;
  records: ReceizAppStateRecord[] | JsonObject[];
  signature?: string;
  [key: string]: unknown;
};

export type ReceizPublicProjectionRecord<TData extends JsonObject = JsonObject> = Readonly<
  PublicProofProjection<TData>
  & Omit<PublicProofTransportRecord<TData>, "id" | "sourceUrl" | "data">
  & {
  schema?: string | null;
  state?: string | null;
  platform?: string | null;
  appNamespace?: string | null;
  appObjectId?: string | null;
  record?: JsonObject | null;
  data?: TData | null;
  }
>;

export type ReceizAppStateRecord = {
  id: string;
  sourceUrl: string;
  externalCreatorId?: string;
  title?: string;
  state?: string;
  platform?: string;
  namespace?: string;
  schema: string;
  record?: JsonObject | null;
  data: JsonObject;
  [key: string]: unknown;
};

export type ReceizAppStateRecordInput = {
  id?: string;
  sourceUrl: string;
  externalCreatorId?: string;
  title?: string;
  namespace?: string;
  state?: string;
  platform?: string;
  schema: string;
  record?: JsonObject | null;
  data: JsonObject;
  [key: string]: unknown;
};

export type ReceizAppStateFeed = {
  schema: string;
  namespace?: string;
  externalCreatorId?: string;
  records: ReceizAppStateRecord[];
  [key: string]: unknown;
};

export type ReceizAppStatePublishRecordOptions = {
  feedSchema?: string;
  namespace?: string;
  externalCreatorId?: string;
  signature?: string;
};

export type ReceizAppStateFeedOptions = {
  schema?: string;
  namespace?: string;
  externalCreatorId?: string;
};

export type ReceizPublicStoreStateRecordInput = {
  id?: string;
  sourceUrl: string;
  externalCreatorId?: string;
  title?: string;
  namespace?: string;
  state?: string;
  schema?: string;
  platform?: string;
  record?: JsonObject | null;
  data: JsonObject;
  [key: string]: unknown;
};

export type ReceizAppStateFeedResponse<TData extends JsonObject = JsonObject> = {
  ok: boolean;
  accepted?: number;
  rejected?: number;
  records?: PublicProofTransportRecord<TData>[];
  error?: string;
  [key: string]: unknown;
};

export type ReceizAppStateRecordResponse<TData extends JsonObject = JsonObject> = {
  ok: boolean;
  record: PublicProofTransportRecord<TData> | null;
  [key: string]: unknown;
};

export type ReceizAppStateCollectionResponse<TData extends JsonObject = JsonObject> = {
  ok: boolean;
  records: PublicProofTransportRecord<TData>[];
  [key: string]: unknown;
};

export type ReceizAppStateRestoreOptions = {
  schema?: string;
  state?: string;
  requiredDataKey?: string;
};

export type ReceizAppStateRestoreResult<TData extends JsonObject = JsonObject> = {
  ok: boolean;
  record: ReceizPublicProjectionRecord<TData> | null;
  data: TData | null;
  error?: string;
};

export type ReceizAppStateTenantPublishInput = {
  tenantHost: string;
  creatorReceizId?: string;
  externalCreatorId?: string;
  title?: string;
  schema?: string;
  schemaVersion?: number;
  platform?: string;
  state: JsonObject;
  record?: JsonObject | null;
  data?: JsonObject;
  sourceUrl?: string;
  id?: string;
  namespace?: string;
  projectionState?: string;
  visibility?: "public" | "private";
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type ReceizAppStatePublishInput = ReceizAppStateFeed | ReceizAppStateTenantPublishInput;

export type ReceizAppStateResolveInput = ReceizAppStateRestoreOptions & {
  url?: string;
  host?: string;
  tenantHost?: string;
  id?: string;
  namespace?: string;
  creatorReceizId?: string;
  receizId?: string;
  migrateTo?: number;
};

export type ReceizAppStateResolveResult<TData extends JsonObject = JsonObject> = ReceizAppStateRestoreResult<TData> & {
  records?: ReceizPublicProjectionRecord<TData>[];
};

export type ReceizCapabilityStatus = "available" | "missing" | "unknown";

export type ReceizCapabilityRequirements = {
  tenantHost?: boolean;
  accessToken?: boolean;
  callbackUrl?: boolean;
  scopes?: readonly string[];
};

export type ReceizCapability = {
  available: boolean;
  status: ReceizCapabilityStatus;
  reason?: string;
  fixUrl?: string;
  requirements?: ReceizCapabilityRequirements;
  [key: string]: unknown;
};

export type ReceizCapabilities = {
  ok: true;
  schema: "receiz.sdk.capabilities.v1";
  baseUrl: string;
  tenantHost?: string;
  scopes: string[];
  capabilities: Record<ReceizCapabilityKey, ReceizCapability>;
};

export type ReceizCapabilitiesOptions = {
  tenantHost?: string;
  callbackUrl?: string;
  scopes?: string[];
};

export type ReceizDoctorIssue = {
  code: string;
  message: string;
  fixUrl?: string;
};

export type ReceizDoctorReport = {
  ok: boolean;
  schema: "receiz.sdk.doctor.v1";
  baseUrl: string;
  tenantHost?: string;
  capabilities: ReceizCapabilities["capabilities"];
  missing: ReceizDoctorIssue[];
  warnings: ReceizDoctorIssue[];
  fixes: ReceizDoctorIssue[];
};

export type ReceizCommerceCartItem = {
  id: string;
  title?: string;
  quantity: number;
  amountUsd?: string;
  amountUsdCents?: string;
  [key: string]: unknown;
};

export type ReceizCommerceCart = {
  items: ReceizCommerceCartItem[];
  [key: string]: unknown;
};

export type ReceizOneClickCheckoutRequest = {
  tenantHost: string;
  orderId?: string;
  amountUsd: string;
  currency?: "usd";
  walletFirst?: boolean;
  cardFallback?: boolean;
  customerReceizId?: string;
  customerEmail?: string;
  cart?: ReceizCommerceCart;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type ReceizOneClickCheckoutResponse = {
  ok: boolean;
  tenantHost: string;
  orderId?: string;
  funding: {
    totalUsdCents: string;
    walletAppliedUsdCents: string;
    cardDeltaUsdCents: string;
    walletFirst: boolean;
    cardFallback: boolean;
  };
  wallet?: ConnectWalletResponse | null;
  checkoutSession?: CheckoutSessionResponse | null;
  proofObject?: JsonObject | null;
  events: JsonObject[];
  error?: string;
  [key: string]: unknown;
};

export type ReceizMediaUploadOptions = {
  tenantHost?: string;
  purpose?: string;
  filename?: string;
  idempotencyKey?: string;
  metadata?: JsonObject;
};

export type ReceizMediaUploadResponse = {
  ok: boolean;
  media?: JsonObject | null;
  proof?: JsonObject | null;
  error?: string;
  [key: string]: unknown;
};

export type ReceizEventSubscribeRequest = {
  tenantHost?: string;
  types: string[];
  webhookUrl?: string;
  idempotencyKey?: string;
  replayFrom?: string;
  [key: string]: unknown;
};

export type ReceizProofQuery = {
  namespace?: string;
  tenantHost?: string;
  type?: string;
  customerReceizId?: string;
  cursor?: string;
  limit?: number;
  [key: string]: unknown;
};

export type ReceizJobRequest = {
  tenantHost?: string;
  kind: string;
  payload: JsonObject;
  runAfter?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type ReceizIdempotencyOptions = {
  idempotencyKey?: string;
};

export type ReceizTenantRuntimeRequest = JsonObject & {
  tenantHost?: string;
  idempotencyKey?: string;
};

export type ReceizCustomerSessionRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  customerReceizId?: string;
  scopes?: string[];
};

export type ReceizCustomerSessionBootstrapRequest = ReceizCustomerSessionRequest & {
  includeWallet?: boolean;
  includeCustomer?: boolean;
  includePermissions?: boolean;
};

export type ReceizCustomerSessionBootstrapResponse = {
  ok: true;
  schema: "receiz.sdk.customer_session.bootstrap.v1";
  tenantHost: string;
  session: JsonObject | null;
  wallet: JsonObject | null;
  customer: JsonObject | null;
  permissions: JsonObject | null;
};

export type ReceizMerchantOnboardRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  receizId?: string;
  displayName?: string;
  defaultStore?: JsonObject;
};

export type ReceizCommerceRuntimeRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
};

export type ReceizPermissionRole = "owner" | "admin" | "staff" | "fulfillment" | "support" | "customer" | string;

export type ReceizPermissionGrantRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  actorReceizId: string;
  role: ReceizPermissionRole;
};

export type ReceizPermissionCheckRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  actorReceizId: string;
  permission: string;
};

export type ReceizAuditAppendRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  action: string;
  actorReceizId?: string;
};

export type ReceizSearchRequest = ReceizTenantRuntimeRequest & {
  tenantHost?: string;
  query?: string;
  cursor?: string;
  limit?: number;
};

export type ReceizMediaTransformRequest = ReceizTenantRuntimeRequest & {
  tenantHost?: string;
  mediaId: string;
  resize?: JsonObject;
  optimize?: JsonObject;
  blurPlaceholder?: boolean;
  altText?: string;
  metadata?: JsonObject;
};

export type ReceizReleasePinRequest = ReceizTenantRuntimeRequest & {
  tenantHost: string;
  rails: Record<string, string>;
};

export type ReceizTenantSessionFallback = "artifact_upload" | "connect";

export type ReceizEnsureTenantSessionInput = {
  tenantHost: string;
  returnTo?: string;
  fallback?: ReceizTenantSessionFallback;
  clientId?: string;
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  state?: string;
  scope?: string | string[];
  usernameHint?: string;
};

export type ReceizEnsureTenantSessionResult = {
  ok: true;
  schema: "receiz.sdk.identity.tenant_session.ensure.v1";
  tenantHost: string;
  fallback: ReceizTenantSessionFallback;
  url: string;
  scope: string[];
  returnTo?: string;
};

export type ReceizPublicStorePublishInput<TState extends JsonObject = JsonObject> = {
  tenantHost: string;
  merchantReceizId: string;
  state: TState;
  title?: string;
  id?: string;
  sourceUrl?: string;
  namespace?: string;
  projectionState?: string;
  schema?: string;
  platform?: string;
  record?: JsonObject | null;
  data?: JsonObject;
  idempotencyKey?: string;
  [key: string]: unknown;
};

export type ReceizPublicStoreResolveInput = {
  host?: string;
  tenantHost?: string;
  url?: string;
  id?: string;
};

export type ReceizPublicStoreResolveResult<TState extends JsonObject = JsonObject> = ReceizAppStateRestoreResult<{
  storeStateRecord: TState;
}> & {
  state: TState | null;
  storeStateRecord: TState | null;
};

type ReceizPublicStorePublishFeedInput<TState extends JsonObject = JsonObject> = {
  tenantHost: string;
  merchantReceizId: string;
  storeStateRecord: TState;
  title?: string;
  id?: string;
  sourceUrl?: string;
  namespace?: string;
  projectionState?: string;
  schema?: string;
  platform?: string;
  record?: JsonObject | null;
  data?: JsonObject;
  idempotencyKey?: string;
};

export type ReceizPublicStoreSignedPublishInput<TState extends JsonObject = JsonObject> = ReceizPublicStorePublishFeedInput<TState> & {
  keyFile: ReceizKeyFile;
  passphrase?: string;
};

export type ReceizPublicStoreIdentityProof = {
  schema: typeof RECEIZ_PUBLIC_STORE_PUBLISH_PROOF_SCHEMA;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
  challenge: JsonObject;
  challengeB64Url: string;
  signatureB64Url: string;
  signedAt: string;
  tenantHost: string;
  merchantReceizId: string;
  feedDigestSha256Hex: string;
};

export type ReceizPublicStoreSignedPublish<TState extends JsonObject = JsonObject> = {
  schema: typeof RECEIZ_PUBLIC_STORE_SIGNED_PUBLISH_SCHEMA;
  tenantHost: string;
  merchantReceizId: string;
  feed: ReceizAppStateFeed;
  identityProof: ReceizPublicStoreIdentityProof;
  storeStateRecord: TState;
};

export type ReceizPublicStoreAppendResult = {
  ok: true;
  storeStateRecordId: string;
  tenantHost: string;
  kaiPulse: string;
  appendAnchorId: string;
  appendProof: JsonObject;
  knownHead: {
    afterKaiUpulse: string;
    appendAnchorId: string;
  };
  accepted?: number;
  rejected?: number;
  records?: ReceizPublicProjectionRecord[];
  [key: string]: unknown;
};

export type ReceizPublicStoreSignedPublishContractResult = {
  ok: true;
  schema: "receiz.sdk.public_store.signed_publish_contract.v1";
  tenantHost: string;
  merchantReceizId: string;
  feedDigestSha256Hex: string;
  keyId: string;
};

export type ReceizPublicStoreRestoreLatestInput = ReceizPublicStoreResolveInput & {
  requiredSchema?: string;
};

export type ReceizOfflineProofQueueItem = {
  id: string;
  kind: "app_state.publish" | "connect.record" | "webhook.event" | string;
  payload: JsonObject;
  idempotencyKey?: string;
  createdAt?: string;
  attempts?: number;
  lastError?: JsonObject | null;
};

export type ReceizOfflineProofQueueSnapshot = {
  schema: "receiz.sdk.offline_proof_queue.v1";
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  pending: ReceizOfflineProofQueueItem[];
  settled: ReceizOfflineProofQueueItem[];
  failed: ReceizOfflineProofQueueItem[];
};

export type ReceizOfflineProofQueueStorageValue = string | ReceizOfflineProofQueueSnapshot | null | undefined;

export type ReceizOfflineProofQueueStorage = {
  read(): ReceizOfflineProofQueueStorageValue | Promise<ReceizOfflineProofQueueStorageValue>;
  write(snapshot: ReceizOfflineProofQueueSnapshot): void | Promise<void>;
  remove?(): void | Promise<void>;
};

export type ReceizOfflineProofQueueOptions = {
  ownerId?: string | null;
  storage?: ReceizOfflineProofQueueStorage;
  snapshot?: ReceizOfflineProofQueueSnapshot;
};

export type ReceizInMemoryOfflineProofQueueStorage = ReceizOfflineProofQueueStorage & {
  readText(): string | null;
};

export type ReceizSandboxStoreOptions = {
  tenantHost: string;
  products?: number;
  seed?: string;
};

export type ReceizSandboxStore = {
  ok: true;
  schema: "receiz.sdk.sandbox.store.v1";
  tenantHost: string;
  state: {
    brand: string;
    products: JsonObject[];
    rewards: JsonObject[];
  };
};

export type ReceizSandboxCheckoutOptions = {
  amountUsd: string;
  outcome?: "success" | "failure";
};

export type ReceizWebhookVerifyRequestOptions = {
  secret: string;
  toleranceSeconds?: number;
  nowMs?: number;
};

export type ReceizParsedWebhookRequest = {
  signatureVerified: true;
  rawBody: string;
  timestamp: string;
  signature: string;
  event: ReceizWebhookEvent;
};

export type ReceizWebhookEventHandler<TResult> = (event: ReceizWebhookEvent) => TResult | Promise<TResult>;

export type ReceizWebhookEventHandlers<TResult = unknown> = Partial<
  Record<ReceizWebhookEventType, ReceizWebhookEventHandler<TResult>>
> & {
  default?: ReceizWebhookEventHandler<TResult>;
};

export type ReceizWebhookEndpointStatus = "active" | "paused";

export type ReceizWebhookEndpoint = {
  endpointId: string;
  label: string;
  url: string;
  eventTypes: ReceizWebhookEventType[];
  status: ReceizWebhookEndpointStatus;
  secretHint?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastDeliveryAt?: string | null;
  lastTestAt?: string | null;
  failureCount?: number;
  [key: string]: unknown;
};

export type ReceizWebhookEndpointCredentials = {
  endpointId: string;
  secret: string;
  secretHint?: string | null;
};

export type ReceizWebhookEndpointCreateInput = {
  label: string;
  url: string;
  eventTypes: ReceizWebhookEventType[];
  idempotencyKey?: string;
};

export type ReceizWebhookEndpointUpdateInput = {
  label?: string;
  url?: string;
  eventTypes?: ReceizWebhookEventType[];
  status?: ReceizWebhookEndpointStatus;
  idempotencyKey?: string;
};

export type ReceizWebhookEndpointTestInput = {
  eventType: ReceizWebhookEventType;
  idempotencyKey?: string;
};

export type ReceizWebhookEndpointListResponse = {
  ok: boolean;
  endpoints: ReceizWebhookEndpoint[];
  [key: string]: unknown;
};

export type ReceizWebhookEndpointMutationResponse = {
  ok: boolean;
  endpoint: ReceizWebhookEndpoint;
  [key: string]: unknown;
};

export type ReceizWebhookEndpointCreateResponse = ReceizWebhookEndpointMutationResponse & {
  credentials: ReceizWebhookEndpointCredentials;
};

export type ReceizWebhookEndpointRotateResponse = {
  ok: boolean;
  endpoint?: ReceizWebhookEndpoint;
  credentials: ReceizWebhookEndpointCredentials;
  [key: string]: unknown;
};

export type ReceizWebhookEndpointTestResponse = {
  ok: boolean;
  delivery: {
    url: string;
    method: "POST" | string;
    headers: Record<string, string>;
    body: string;
    event: ReceizWebhookEvent;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ReceizWebhookEndpointDeleteResponse = {
  ok: boolean;
  [key: string]: unknown;
};

export type WalletLedgerEvent = {
  id: string;
  kind: "transfer" | "note_mint" | "note_claim" | string;
  createdAt: string;
  pulse?: number;
  proofBundle?: JsonObject | null;
  actor?: JsonObject | null;
  fromActor?: JsonObject | null;
  toActor?: JsonObject | null;
  amountPhiMicro?: string;
  amountUsdCents?: string;
  receiz?: JsonObject | null;
  [key: string]: unknown;
};

export type WalletLedgerFeed = {
  ok: boolean;
  cursor: string | null;
  since: string | null;
  nextCursor: string | null;
  events: WalletLedgerEvent[];
  rollup?: JsonObject;
};

export type ActionLedgerFeed = {
  ok: boolean;
  cursor?: string | null;
  nextCursor?: string | null;
  events: JsonObject[];
  rollup?: JsonObject | null;
};

export type ReceizAssetManifest = {
  schema: "receiz.asset_manifest.v1";
  assetId: string;
  assetType: "proof_object" | "sports_card" | "signal_card" | "wallet_note" | "reserve_funding" | "market_certificate" | "profile_original" | "document";
  proof: ReceizProofBundle;
  owner?: JsonObject | null;
  media?: JsonObject | null;
  appends?: JsonObject[];
  settlement?: JsonObject | null;
  links: Record<string, string>;
};

export type ReceizSportsCardManifest = {
  schema: "receiz.sports_arena.card_manifest.v1";
  sport: "baseball" | "soccer" | "fight" | "sports" | string;
  collectibleId: string;
  claimHash: string;
  card: JsonObject;
  ownership: JsonObject;
  valueBasis: JsonObject;
  appendSummary?: JsonObject | null;
  eventProofSummary?: JsonObject | null;
  links: Record<string, string>;
};

export type ReceizWebhookEvent = {
  schema: "receiz.webhook_event.v1";
  id: string;
  type: ReceizWebhookEventType;
  createdAt: string;
  data: JsonObject;
  actor?: JsonObject | null;
  signature?: JsonObject | null;
};

export type ConnectTransferRequest = {
  conversationId?: string;
  recipientUserId: string;
  unit: "usd" | "phi";
  amountUsd?: string;
  amountPhi?: string;
  note?: string;
  clientNonce?: string;
};

export type ConnectTransferResponse = {
  ok: boolean;
  transferId?: string;
  ledgerEventId?: string;
  amountPhiMicro?: string;
  amountUsdCents?: string;
  proofBundle?: JsonObject | null;
  [key: string]: unknown;
};

export type ConnectWalletResponse = {
  ok: boolean;
  userId?: string;
  balancePhiMicro?: string;
  balanceUsdCents?: string;
  settlement?: JsonObject | null;
  [key: string]: unknown;
};

export type CheckoutRequest = {
  amountUsd: string;
  currency?: "usd";
  uiMode?: "hosted" | "embedded";
  referenceId?: string;
  description?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  [key: string]: unknown;
};

export type CheckoutSessionResponse = {
  ok: boolean;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  status?: string;
  receiptId?: string;
  [key: string]: unknown;
};

export type ReceizWorldPublicSnapshotResponse = {
  ok: boolean;
  data?: JsonObject;
  error?: string;
  [key: string]: unknown;
};

export type ReceizWorldProfileQuery = {
  visitorKey?: string;
  threadKey?: string;
};

export type ReceizWorldProfileResponse = {
  ok: boolean;
  world?: JsonObject;
  reply?: JsonObject;
  error?: string;
  [key: string]: unknown;
};

export type ReceizWorldProfileMessageRequest = {
  action?: "message" | "welcome" | "book" | string;
  message?: string;
  visitorKey?: string;
  threadKey?: string;
  allowBrowserVoiceFallback?: boolean;
  clientContext?: JsonObject;
  clientUserMessageId?: string;
  clientAssistantMessageId?: string;
  slotStartAt?: string;
  name?: string;
  email?: string;
  notes?: string;
  timezone?: string;
  questions?: unknown;
  [key: string]: unknown;
};

export type ReceizWorldProfileStreamEvent = {
  type: string;
  messageId?: string;
  delta?: string;
  world?: JsonObject;
  reply?: JsonObject;
  assistantMessage?: JsonObject;
  error?: string;
  [key: string]: unknown;
};

export type TwinMarketMandateStatus = "active" | "paused";
export type TwinMarketExecutionMode = "approve" | "auto";
export type TwinMarketIntentStatus = "pending" | "blocked" | "executed" | "failed" | "cancelled";
export type TwinMarketIntentSource = "owner_console" | "twin_runtime";
export type TwinMarketType = "asset" | "prediction";
export type TwinMarketSide = "buy" | "sell" | "yes" | "no";

export type TwinMarketRiskCheck = {
  key: string;
  ok: boolean;
  detail: string;
};

export type TwinMarketMandateView = {
  id: string | null;
  ownerUserId: string | null;
  status: TwinMarketMandateStatus;
  executionMode: TwinMarketExecutionMode;
  mandateVersion: number;
  allowedMarketTypes: TwinMarketType[];
  allowedSides: TwinMarketSide[];
  allowedMarketItemIds: string[];
  maxOrderUsdCents: string;
  maxDailyGrossUsdCents: string;
  maxDailyLossUsdCents: string;
  profitSweepBps: number;
  policy: JsonObject;
  createdAt: string | null;
  updatedAt: string | null;
  lastActivatedAt: string | null;
};

export type SaveTwinMarketMandateInput = {
  status?: TwinMarketMandateStatus;
  executionMode?: TwinMarketExecutionMode;
  allowedMarketTypes?: TwinMarketType[];
  allowedSides?: TwinMarketSide[];
  allowedMarketItemIds?: string[];
  maxOrderUsd?: string | number;
  maxDailyGrossUsd?: string | number;
  maxDailyLossUsd?: string | number;
  profitSweepBps?: number;
  policy?: JsonObject;
  [key: string]: unknown;
};

export type CreateTwinMarketIntentInput = {
  marketItemId: string;
  marketType?: TwinMarketType;
  side: TwinMarketSide;
  amountUsd?: string | number;
  shareQuantity?: string;
  reason?: string;
  source?: TwinMarketIntentSource;
  approveNow?: boolean;
  [key: string]: unknown;
};

export type TwinMarketIntentView = {
  id: string;
  ownerUserId: string;
  mandateId: string | null;
  mandateVersion: number | null;
  source: TwinMarketIntentSource;
  status: TwinMarketIntentStatus;
  marketType: TwinMarketType;
  marketItemId: string;
  marketTitle: string;
  side: TwinMarketSide;
  amountUsdCents: string;
  shareQuantity: string | null;
  clientNonce: string;
  reason: string | null;
  riskChecks: TwinMarketRiskCheck[];
  execution: JsonObject | null;
  failureError: string | null;
  createdAt: string;
  updatedAt: string;
  executedAt: string | null;
};

export type TwinMarketIntentResult = {
  intent: TwinMarketIntentView;
  trade?: JsonObject | null;
};

export type TwinMarketMandateResponse = {
  ok: boolean;
  mandate?: TwinMarketMandateView;
  error?: string;
  [key: string]: unknown;
};

export type TwinMarketIntentsResponse = {
  ok: boolean;
  intents?: TwinMarketIntentView[];
  error?: string;
  [key: string]: unknown;
};

export type TwinMarketIntentResponse = {
  ok: boolean;
  intent?: TwinMarketIntentView;
  trade?: JsonObject | null;
  error?: string;
  [key: string]: unknown;
};

export type TwinMindImportSummaryResponse = {
  ok: boolean;
  summary?: JsonObject;
  error?: string;
  [key: string]: unknown;
};

export type TwinApprovalResponse = {
  ok: boolean;
  twinApproval?: JsonObject;
  error?: string;
  [key: string]: unknown;
};

export type TwinPromotionApprovalInput = {
  performance: JsonObject;
  approvalReference?: string | JsonObject | null;
  evidenceAssets?: Array<{ kind: "image" | "clip"; url: string; label?: string | null }>;
  [key: string]: unknown;
};

export type OidcTokenRequest = {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
  refresh_token?: string;
};

export type OidcTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
};

export type ReceizAuthorizeUrlOptions = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod?: "S256" | "plain";
  state?: string;
  scope?: string | string[];
  responseType?: "code";
  usernameHint?: string;
};

export type ReceizWebhookSignatureInput = {
  secret: string;
  timestamp: string;
  body: string | ArrayBuffer | Uint8Array | JsonObject;
};

export type ReceizWebhookVerifyInput = ReceizWebhookSignatureInput & {
  signature: string;
  toleranceSeconds?: number;
  nowMs?: number;
};

export type ReceizProofProjectionRow = {
  label: string;
  value: string;
  href?: string | null;
};

export type ReceizAssetManifestProjection = {
  schema: "receiz.sdk.asset_manifest_projection.v1";
  assetId: string;
  assetType: ReceizAssetManifest["assetType"];
  title: string;
  subtitle: string;
  proofKind: string;
  verifyUrl: string | null;
  primaryUrl: string | null;
  mediaUrl: string | null;
  ownerLabel: string | null;
  appendCount: number;
  settlementState: string | null;
  rows: ReceizProofProjectionRow[];
  manifest: ReceizAssetManifest;
};

export type ReceizSportsCardManifestProjection = {
  schema: "receiz.sdk.sports_card_manifest_projection.v1";
  sport: string;
  collectibleId: string;
  claimHash: string;
  title: string;
  subtitle: string;
  verifyUrl: string | null;
  eventProofUrl: string | null;
  mediaUrl: string | null;
  ownerLabel: string | null;
  scoreLabel: string | null;
  valueLabel: string | null;
  appendCount: number;
  eventProofCount: number;
  rows: ReceizProofProjectionRow[];
  manifest: ReceizSportsCardManifest;
};

export type ReceizProofRegisterEntry = {
  id: string;
  kind: string;
  createdAt?: string | null;
  kaiUpulse?: string | number | null;
  proof?: JsonObject | null;
  payload: JsonObject;
  projection?: JsonObject | null;
};

export type ReceizProofRegisterSnapshot = {
  schema: "receiz.sdk.proof_register.v1";
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  head: {
    entryId: string | null;
    kaiUpulse: string | number | null;
    createdAt: string | null;
    count: number;
  };
  entries: ReceizProofRegisterEntry[];
};

export type ReceizProofRegisterInput = ReceizProofRegisterSnapshot | {
  ownerId?: string | null;
  createdAt?: string;
  entries?: ReceizProofRegisterEntry[];
};

export type ReceizProofMemoryStorageValue = string | ReceizProofRegisterSnapshot | null | undefined;

export type ReceizProofMemoryStorage = {
  read(): ReceizProofMemoryStorageValue | Promise<ReceizProofMemoryStorageValue>;
  write(snapshot: ReceizProofRegisterSnapshot): void | Promise<void>;
  remove?(): void | Promise<void>;
};

export type ReceizSdkObservation = {
  schema: "receiz.sdk.observation.v1";
  operation:
    | "proof_memory.append"
    | "proof_memory.admit"
    | "proof_memory.persist"
    | "proof_memory.clear";
  status: "ok" | "error";
  startedAt: string;
  endedAt: string;
  durationMs: number;
  ownerId: string | null;
  entryCount: number;
  headEntryId: string | null;
  headKaiUpulse: string | number | null;
  detail?: JsonObject;
};

export type ReceizSdkObserver = (observation: ReceizSdkObservation) => void;

export type ReceizProofMemoryOptions = ReceizProofRegisterInput & {
  storage?: ReceizProofMemoryStorage;
  autoPersist?: boolean;
  onPersistError?: (error: unknown) => void;
  onObservation?: ReceizSdkObserver;
};

export type ReceizProofMemoryAdditionsQuery = {
  afterEntryId: string | null;
  afterKaiUpulse: string | number | null;
  afterCreatedAt: string | null;
  limit?: number;
};

export type ReceizProofMemoryAdditionBatch =
  | unknown[]
  | {
      entries?: ReceizProofRegisterEntry[];
      additions?: unknown[];
      proofs?: unknown[];
      records?: unknown[];
      [key: string]: unknown;
    };

export type ReceizProofMemorySyncFetcher = (query: ReceizProofMemoryAdditionsQuery) => Promise<ReceizProofMemoryAdditionBatch>;

export type ReceizProofMemorySyncInput = {
  memory: ReceizProofMemory;
  fetchAdditions: ReceizProofMemorySyncFetcher;
  limit?: number;
};

export type ReceizProofMemorySyncResult = {
  ok: true;
  schema: "receiz.sdk.proof_memory.sync.v1";
  knownHead: ReceizProofMemoryAdditionsQuery;
  admitted: number;
  snapshot: ReceizProofRegisterSnapshot;
};

export type ReceizLocalFirstInput<TValue> = {
  memory?: ReceizProofMemory;
  local?: TValue | null;
  remote?: () => Promise<TValue | null>;
  sync?: ReceizProofMemorySyncFetcher;
  limit?: number;
};

export type ReceizLocalFirstResult<TValue> = {
  ok: true;
  schema: "receiz.sdk.local_first.v1";
  surface: string;
  source: "local" | "remote" | "empty";
  value: TValue | null;
  local: TValue | null;
  knownHead: ReceizProofMemoryAdditionsQuery | null;
  snapshot: ReceizProofRegisterSnapshot | null;
  sync: Promise<ReceizProofMemorySyncResult> | null;
};

export type ReceizRuntimeLocalFirstInput = {
  ownerId?: string | null;
  storage?: ReceizProofMemoryStorage;
  seed?: unknown[];
  sync?: ReceizProofMemorySyncFetcher;
  limit?: number;
};

export type ReceizRuntimeLocalFirstResult = {
  ok: true;
  schema: "receiz.sdk.runtime.local_first.v1";
  memory: ReceizProofMemory;
  snapshot: ReceizProofRegisterSnapshot;
  knownHead: ReceizProofMemoryAdditionsQuery;
  sync: Promise<ReceizProofMemorySyncResult> | null;
};

export type ReceizInMemoryProofMemoryStorage = ReceizProofMemoryStorage & {
  readText(): string | null;
};

export const RECEIZ_ASSET_MANIFEST_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://receiz.com/standards/receiz.asset-manifest.schema.v1.json",
  title: "Receiz Asset Manifest",
  type: "object",
  additionalProperties: true,
  required: ["schema", "assetId", "assetType", "proof", "links"],
  properties: {
    schema: { const: "receiz.asset_manifest.v1" },
    assetId: { type: "string", minLength: 1 },
    assetType: {
      enum: ["proof_object", "sports_card", "signal_card", "wallet_note", "market_certificate", "profile_original", "document"],
    },
    proof: {
      type: "object",
      required: [
        "kind",
        "payloadVersion",
        "createdAtMs",
        "ts",
        "code",
        "slug",
        "verifyPath",
        "verifyUrl",
        "kaiPulseEternal",
        "kaiKlok",
        "receizClaimId",
        "sigilClaimSeed",
      ],
      additionalProperties: true,
      properties: {
        kind: { const: "receiz.proof_bundle" },
        payloadVersion: { enum: ["v2", "v1"] },
        createdAtMs: { type: "number" },
        ts: { type: "string", minLength: 1 },
        code: { type: "string", minLength: 1 },
        slug: { type: "string", minLength: 1 },
        verifyPath: { type: "string", minLength: 1 },
        verifyUrl: { type: "string" },
        kaiPulseEternal: { type: "string", minLength: 1 },
        kaiKlok: { type: "string", minLength: 1 },
        receizClaimId: { type: "string", minLength: 1 },
        sigilClaimSeed: { type: "string", minLength: 1 },
      },
    },
    owner: { type: ["object", "null"], additionalProperties: true },
    media: { type: ["object", "null"], additionalProperties: true },
    appends: { type: "array", items: { type: "object", additionalProperties: true } },
    settlement: { type: ["object", "null"], additionalProperties: true },
    links: { type: "object", additionalProperties: { type: "string" } },
  },
} as const;

export const RECEIZ_SPORTS_CARD_MANIFEST_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://receiz.com/standards/receiz.sports-card-manifest.schema.v1.json",
  title: "Receiz Sports Arena Card Manifest",
  type: "object",
  additionalProperties: true,
  required: ["schema", "sport", "collectibleId", "claimHash", "card", "ownership", "valueBasis", "links"],
  properties: {
    schema: { const: "receiz.sports_arena.card_manifest.v1" },
    sport: { type: "string", minLength: 1 },
    collectibleId: { type: "string", minLength: 1 },
    claimHash: { type: "string", minLength: 1 },
    card: { type: "object", additionalProperties: true },
    ownership: { type: "object", additionalProperties: true },
    valueBasis: { type: "object", additionalProperties: true },
    appendSummary: { type: ["object", "null"], additionalProperties: true },
    eventProofSummary: { type: ["object", "null"], additionalProperties: true },
    links: { type: "object", additionalProperties: { type: "string" } },
  },
} as const;

export const RECEIZ_WEBHOOK_EVENT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://receiz.com/standards/receiz.webhook-event.schema.v1.json",
  title: "Receiz Webhook Event",
  type: "object",
  additionalProperties: true,
  required: ["schema", "id", "type", "createdAt", "data"],
  properties: {
    schema: { const: "receiz.webhook_event.v1" },
    id: { type: "string", minLength: 1 },
    type: {
      enum: [
        "checkout.session.created",
        "checkout.session.completed",
        "payment.created",
        "payment.settled",
        "payment.failed",
        "payment.refunded",
        "order.created",
        "reward.claimed",
        "asset.created",
        "asset.transferred",
        "proof.appended",
        "sports_card.scored",
        "event_proof.created",
        "wallet.ledger_entry",
        "note.claimed",
        "ownership.transferred",
        "market.trade",
        "profile.asset.visible_changed",
        "app_state.published",
        "world.campaign.sent",
      ],
    },
    createdAt: { type: "string", minLength: 1 },
    data: { type: "object", additionalProperties: true },
    actor: { type: ["object", "null"], additionalProperties: true },
    signature: { type: ["object", "null"], additionalProperties: true },
  },
} as const;

export const RECEIZ_SCHEMAS = {
  assetManifest: RECEIZ_ASSET_MANIFEST_SCHEMA,
  sportsCardManifest: RECEIZ_SPORTS_CARD_MANIFEST_SCHEMA,
  webhookEvent: RECEIZ_WEBHOOK_EVENT_SCHEMA,
} as const;

type RequestOptions = {
  method?: string;
  body?: BodyInit | JsonObject | URLSearchParams;
  headers?: HeadersInit;
  bearerToken?: string | null;
};

export class ReceizHttpError extends ReceizError<`http_${number}`> {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`http_${status}`, errorMessageFromPayload(status, payload), { retryable: status >= 500 || status === 429 });
    this.name = "ReceizHttpError";
    this.status = status;
    this.payload = payload;
  }
}

export class ReceizValidationError extends ReceizError<"validation_failed"> {
  readonly issues: string[];

  constructor(label: string, issues: string[]) {
    super("validation_failed", `${label}: ${issues.join("; ")}`, { retryable: false });
    this.name = "ReceizValidationError";
    this.issues = issues;
  }
}

function errorMessageFromPayload(status: number, payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload === "string" && payload.trim()) return payload;
  return `receiz_http_${status}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function requestPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function appendQuery(path: string, query: Record<string, string | number | boolean | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function receizAppStateUrlFromHost(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (!trimmed) throw new ReceizValidationError("receiz.appState.byHost", ["host is required"]);
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function receizAppStateNamespaceFromUrl(sourceUrl: string): string {
  const normalized = receizAppStateUrlFromHost(sourceUrl);
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    const host = normalized.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] ?? normalized;
    return host.toLowerCase();
  }
}

export function receizAppStateObjectIdFromUrl(sourceUrl: string, prefix = "app_state"): string {
  const normalized = receizAppStateUrlFromHost(sourceUrl);
  let host = receizAppStateNamespaceFromUrl(normalized);
  let pathPart = "";
  try {
    const parsed = new URL(normalized);
    host = parsed.hostname.toLowerCase();
    pathPart = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  } catch {
    pathPart = "";
  }
  const safePath = pathPart
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9_.-]+/g, "_");
  return safePath ? `${prefix}:${host}:${safePath}` : `${prefix}:${host}`;
}

export function createReceizAppStateRecord(input: ReceizAppStateRecordInput): ReceizAppStateRecord {
  const sourceUrl = receizAppStateUrlFromHost(input.sourceUrl);
  const record: ReceizAppStateRecord = {
    ...input,
    id: input.id ?? receizAppStateObjectIdFromUrl(sourceUrl),
    sourceUrl,
    namespace: input.namespace ?? receizAppStateNamespaceFromUrl(sourceUrl),
    state: input.state ?? "published",
  };
  return record;
}

export function createReceizAppStateFeed(
  records: Array<ReceizAppStateRecord | ReceizAppStateRecordInput>,
  options: ReceizAppStateFeedOptions = {},
): ReceizAppStateFeed {
  const feed: ReceizAppStateFeed = {
    schema: options.schema ?? RECEIZ_APP_STATE_FEED_SCHEMA,
    records: records.map((record) => createReceizAppStateRecord(record)),
  };
  if (options.namespace) feed.namespace = options.namespace;
  if (options.externalCreatorId) feed.externalCreatorId = options.externalCreatorId;
  return feed;
}

function canonicalJsonString(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ReceizValidationError("receiz.canonicalJson", ["non-finite numbers are not valid JSON"]);
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalJsonString).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonString(value[key])}`)
      .join(",")}}`;
  }
  throw new ReceizValidationError("receiz.canonicalJson", [`unsupported JSON value: ${typeof value}`]);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256HexFromText(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("receiz_crypto_unavailable");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  if (typeof atob === "function") {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  const bufferCtor = (globalThis as unknown as { Buffer?: { from(input: string, encoding: "base64"): Uint8Array } }).Buffer;
  if (bufferCtor) return new Uint8Array(bufferCtor.from(padded, "base64"));
  throw new Error("receiz_base64url_decode_unavailable");
}

export function createReceizPublicStoreStateRecord(input: ReceizPublicStoreStateRecordInput): ReceizAppStateRecord {
  return createReceizAppStateRecord({
    ...input,
    platform: input.platform ?? "Receiz.app Commerce Cloud",
    schema: input.schema ?? RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA,
  });
}

function createReceizPublicStorePublishFeed<TState extends JsonObject = JsonObject>(
  input: ReceizPublicStorePublishFeedInput<TState>,
): { tenantHost: string; record: ReceizAppStateRecord; feed: ReceizAppStateFeed } {
  const tenantHost = normalizeReceizHost(input.tenantHost);
  const sourceUrl = input.sourceUrl ?? receizAppStateUrlFromHost(tenantHost);
  const publicStoreRecordInput: ReceizPublicStoreStateRecordInput = {
    sourceUrl,
    externalCreatorId: input.merchantReceizId,
    title: input.title ?? `${tenantHost} storefront`,
    namespace: input.namespace ?? tenantHost,
    state: input.projectionState ?? "published",
    schema: input.schema ?? RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA,
    platform: input.platform ?? "Receiz.app Commerce Cloud",
    record: input.record ?? input.storeStateRecord,
    data: input.data ?? {
      storeStateRecord: input.storeStateRecord,
      tenantHost,
      merchantReceizId: input.merchantReceizId,
    },
  };
  if (input.id) publicStoreRecordInput.id = input.id;
  const record = createReceizPublicStoreStateRecord(publicStoreRecordInput);
  const feedOptions: ReceizAppStateFeedOptions = {
    schema: RECEIZ_PUBLIC_STORE_STATE_FEED_SCHEMA,
    externalCreatorId: input.merchantReceizId,
  };
  if (record.namespace) feedOptions.namespace = record.namespace;
  return {
    tenantHost,
    record,
    feed: createReceizAppStateFeed([record], feedOptions),
  };
}

export function createReceizTenantAppStateRecord(input: ReceizAppStateTenantPublishInput): ReceizAppStateRecord {
  const sourceUrl = input.sourceUrl ?? receizAppStateUrlFromHost(input.tenantHost);
  const data = input.data ?? {
    ...input.state,
    ...(input.schemaVersion !== undefined ? { schemaVersion: input.schemaVersion } : {}),
    tenantHost: normalizeReceizHost(input.tenantHost),
  };
  const record: ReceizAppStateRecordInput = {
    sourceUrl,
    state: input.projectionState ?? (input.visibility === "private" ? "private" : "published"),
    platform: input.platform ?? "Receiz App Runtime",
    schema: input.schema ?? RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA,
    data,
  };
  if (input.id) record.id = input.id;
  const externalCreatorId = input.externalCreatorId ?? input.creatorReceizId;
  if (externalCreatorId) record.externalCreatorId = externalCreatorId;
  if (input.title) record.title = input.title;
  record.namespace = input.namespace ?? receizAppStateNamespaceFromUrl(sourceUrl);
  record.record = input.record ?? input.state;
  return createReceizAppStateRecord(record);
}

function isReceizAppStateFeed(value: ReceizAppStatePublishInput): value is ReceizAppStateFeed {
  return isRecord(value) && Array.isArray(value.records);
}

export function normalizeReceizHost(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (!trimmed) throw new ReceizValidationError("receiz.domains.normalizeHost", ["host is required"]);
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]?.toLowerCase() ?? trimmed.toLowerCase();
  }
}

function bodyWithIdempotency<T extends JsonObject>(body: T, idempotencyKey?: string): T {
  if (!idempotencyKey || Object.prototype.hasOwnProperty.call(body, "idempotencyKey")) return body;
  return { ...body, idempotencyKey } as T;
}

function headersWithIdempotency(headers?: HeadersInit, idempotencyKey?: string): Headers {
  const next = new Headers(headers);
  if (idempotencyKey) next.set("idempotency-key", idempotencyKey);
  return next;
}

function queryParams(input: JsonObject): Record<string, string | number | boolean | null | undefined> {
  const params: Record<string, string | number | boolean | null | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      params[key] = value;
    }
  }
  return params;
}

function usdToCents(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new ReceizValidationError("receiz.commerce.amountUsd", ["amountUsd must be a positive USD decimal"]);
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function centsToUsd(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

function stringToCents(value: unknown): bigint {
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.max(0, Math.trunc(value)));
  if (typeof value === "bigint") return value < 0n ? 0n : value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  return 0n;
}

function sandboxProducts(count: number): JsonObject[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: `sandbox_product_${index + 1}`,
    title: `Sandbox Product ${index + 1}`,
    amountUsd: centsToUsd(BigInt(index + 1) * 1200n),
    proofObject: {
      schema: "receiz.sdk.sandbox.proof_object.v1",
      objectId: `sandbox_product_${index + 1}`,
    },
  }));
}

export async function verifyReceizWebhookRequest(request: Request, options: ReceizWebhookVerifyRequestOptions): Promise<boolean> {
  const signature = request.headers.get(RECEIZ_WEBHOOK_SIGNATURE_HEADER) ?? "";
  const timestamp = request.headers.get(RECEIZ_WEBHOOK_TIMESTAMP_HEADER) ?? "";
  const body = await request.clone().text();
  const verifyInput: ReceizWebhookVerifyInput = {
    secret: options.secret,
    timestamp,
    body,
    signature,
  };
  if (options.toleranceSeconds !== undefined) verifyInput.toleranceSeconds = options.toleranceSeconds;
  if (options.nowMs !== undefined) verifyInput.nowMs = options.nowMs;
  return verifyReceizWebhookSignature(verifyInput);
}

export async function parseReceizWebhookRequest(
  request: Request,
  options: ReceizWebhookVerifyRequestOptions,
): Promise<ReceizParsedWebhookRequest> {
  const signature = request.headers.get(RECEIZ_WEBHOOK_SIGNATURE_HEADER) ?? "";
  const timestamp = request.headers.get(RECEIZ_WEBHOOK_TIMESTAMP_HEADER) ?? "";
  const rawBody = await request.clone().text();
  const verifyInput: ReceizWebhookVerifyInput = {
    secret: options.secret,
    timestamp,
    body: rawBody,
    signature,
  };
  if (options.toleranceSeconds !== undefined) verifyInput.toleranceSeconds = options.toleranceSeconds;
  if (options.nowMs !== undefined) verifyInput.nowMs = options.nowMs;
  const signatureVerified = await verifyReceizWebhookSignature(verifyInput);
  if (!signatureVerified) throw new ReceizValidationError("ReceizWebhookRequest", ["signature verification failed"]);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new ReceizValidationError("ReceizWebhookRequest", ["body must be valid JSON"]);
  }

  return {
    signatureVerified: true,
    rawBody,
    timestamp,
    signature,
    event: assertReceizWebhookEvent(parsed),
  };
}

export async function routeReceizWebhookEvent<TResult = unknown>(
  event: ReceizWebhookEvent,
  handlers: ReceizWebhookEventHandlers<TResult>,
): Promise<TResult | undefined> {
  const handler = handlers[event.type] ?? handlers.default;
  return handler ? handler(event) : undefined;
}

function projectPublicProofTransportRecord<TData extends JsonObject = JsonObject>(
  record: PublicProofTransportRecord<TData>,
): ReceizPublicProjectionRecord<TData> {
  const projection = createPublicProofProjection<TData>({
    ...(record.id !== undefined ? { id: record.id } : {}),
    ...(record.sourceUrl !== undefined ? { sourceUrl: record.sourceUrl } : {}),
    ...(record.data !== undefined ? { data: record.data } : {}),
  });
  return Object.freeze({ ...record, ...projection }) as ReceizPublicProjectionRecord<TData>;
}

function resolveReceizAppStateProjectionRecord<TData extends JsonObject = JsonObject>(
  input: ReceizAppStateRecordResponse<TData> | PublicProofTransportRecord<TData> | ReceizPublicProjectionRecord<TData> | null | undefined,
): ReceizPublicProjectionRecord<TData> | null {
  if (!input || !isRecord(input)) return null;
  const looksLikeResponse =
    typeof input.ok === "boolean" &&
    Object.prototype.hasOwnProperty.call(input, "record") &&
    !Object.prototype.hasOwnProperty.call(input, "sourceUrl") &&
    !Object.prototype.hasOwnProperty.call(input, "data");
  if (looksLikeResponse) {
    const response = input as ReceizAppStateRecordResponse<TData>;
    return response.record && isRecord(response.record)
      ? projectPublicProofTransportRecord(response.record)
      : null;
  }
  return projectPublicProofTransportRecord(input as PublicProofTransportRecord<TData>);
}

function receizAppStateRestoreError<TData extends JsonObject = JsonObject>(
  record: ReceizPublicProjectionRecord<TData> | null,
  options: ReceizAppStateRestoreOptions,
): string {
  if (!record) return "app_state_not_found";
  if (options.schema && record.schema !== options.schema) return "app_state_schema_mismatch";
  if (options.state && record.state !== options.state) return "app_state_state_mismatch";
  if (!isRecord(record.data)) return "app_state_data_missing";
  if (options.requiredDataKey && !Object.prototype.hasOwnProperty.call(record.data, options.requiredDataKey)) {
    return "app_state_required_data_missing";
  }
  return "app_state_data_unavailable";
}

export function extractReceizAppStateData<TData extends JsonObject = JsonObject>(
  input: ReceizAppStateRecordResponse<TData> | PublicProofTransportRecord<TData> | ReceizPublicProjectionRecord<TData> | null | undefined,
  options: ReceizAppStateRestoreOptions = {},
): TData | null {
  const record = resolveReceizAppStateProjectionRecord(input);
  if (!record) return null;
  if (options.schema && record.schema !== options.schema) return null;
  if (options.state && record.state !== options.state) return null;
  if (!isRecord(record.data)) return null;
  if (options.requiredDataKey && !Object.prototype.hasOwnProperty.call(record.data, options.requiredDataKey)) return null;
  return record.data as TData;
}

export function restoreReceizAppStateProjection<TData extends JsonObject = JsonObject>(
  input: ReceizAppStateRecordResponse<TData> | PublicProofTransportRecord<TData> | ReceizPublicProjectionRecord<TData> | null | undefined,
  options: ReceizAppStateRestoreOptions = {},
): ReceizAppStateRestoreResult<TData> {
  const record = resolveReceizAppStateProjectionRecord(input);
  const data = extractReceizAppStateData(input, options);
  if (!record || !data) {
    return {
      ok: false,
      record,
      data: null,
      error: receizAppStateRestoreError(record, options),
    };
  }
  return {
    ok: true,
    record,
    data,
  };
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isJsonRecordBody(value: unknown): value is JsonObject {
  if (!isRecord(value)) return false;
  if (typeof FormData !== "undefined" && value instanceof FormData) return false;
  if (typeof Blob !== "undefined" && value instanceof Blob) return false;
  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) return false;
  if (value instanceof ArrayBuffer) return false;
  if (ArrayBuffer.isView(value)) return false;
  return true;
}

function normalizeFetch(fetchImpl?: typeof fetch): typeof fetch {
  const candidate = fetchImpl ?? globalThis.fetch;
  if (!candidate) throw new Error("receiz_fetch_unavailable");
  return candidate;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json() as Promise<unknown>;
  return response.text();
}

function formFromRecord(record: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    form.set(key, String(value));
  }
  return form;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function ensureRecord(value: unknown, label: string): JsonObject {
  if (!isRecord(value)) throw new ReceizValidationError(label, ["expected object"]);
  return value;
}

function ensureString(record: JsonObject, key: string, issues: string[]): string | null {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${key} must be a non-empty string`);
    return null;
  }
  return value;
}

function ensureOptionalRecord(record: JsonObject, key: string, issues: string[]): void {
  const value = record[key];
  if (value === undefined || value === null) return;
  if (!isRecord(value)) issues.push(`${key} must be an object or null`);
}

function ensureLinks(record: JsonObject, issues: string[]): void {
  const value = record.links;
  if (!isRecord(value)) {
    issues.push("links must be an object");
    return;
  }
  for (const [key, link] of Object.entries(value)) {
    if (typeof link !== "string" || !link.trim()) issues.push(`links.${key} must be a non-empty string`);
  }
}

function failIfIssues(label: string, issues: string[]): void {
  if (issues.length > 0) throw new ReceizValidationError(label, issues);
}

function asSdkHex(value: unknown, length: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const pattern = new RegExp(`^[0-9a-f]{${length}}$`);
  return pattern.test(normalized) ? normalized : null;
}

function validateOptionalSdkHex(record: JsonObject, key: string, length: number, issues: string[], path: string): void {
  if (record[key] === undefined) return;
  if (!asSdkHex(record[key], length)) issues.push(`${path}.${key} must be ${length} lowercase hex characters`);
}

function validateReceizProofBundleShape(value: unknown, path: string, issues: string[]): ReceizProofBundle | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }

  if (value.kind !== "receiz.proof_bundle") issues.push(`${path}.kind must be receiz.proof_bundle`);
  if (value.payloadVersion !== "v2" && value.payloadVersion !== "v1") {
    issues.push(`${path}.payloadVersion must be v2 or v1`);
  }
  const createdAtMs = value.createdAtMs;
  if (typeof createdAtMs !== "number" || !Number.isFinite(createdAtMs)) {
    issues.push(`${path}.createdAtMs must be a finite number`);
  }
  for (const key of ["ts", "code", "slug", "verifyPath", "kaiPulseEternal", "kaiKlok", "receizClaimId", "sigilClaimSeed"]) {
    const fieldValue = value[key];
    if (typeof fieldValue !== "string" || !fieldValue.trim()) issues.push(`${path}.${key} must be a non-empty string`);
  }
  if (typeof value.verifyUrl !== "string") issues.push(`${path}.verifyUrl must be a string`);
  if (value.tsDisplay !== undefined && (typeof value.tsDisplay !== "string" || !value.tsDisplay.trim())) {
    issues.push(`${path}.tsDisplay must be a non-empty string when present`);
  }
  if (value.tzMinutesEast !== undefined && (typeof value.tzMinutesEast !== "number" || !Number.isFinite(value.tzMinutesEast))) {
    issues.push(`${path}.tzMinutesEast must be a finite number when present`);
  }
  validateOptionalSdkHex(value, "signerKeyId", 12, issues, path);
  validateOptionalSdkHex(value, "anchorId", 8, issues, path);
  validateOptionalSdkHex(value, "groth16ProofDigest", 64, issues, path);
  validateOptionalSdkHex(value, "artifactSha256Basis", 64, issues, path);
  if (value.artifactBasis !== undefined) {
    if (
      !isRecord(value.artifactBasis)
      || value.artifactBasis.algorithm !== "sha256"
      || (
        value.artifactBasis.normalization !== "jpeg-adobe-xmp-app1-v1"
        && value.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v2"
        && value.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v3"
        && value.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v4"
        && value.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v5"
        && value.artifactBasis.normalization !== "jpeg-ios-photos-carrier-v6"
      )
    ) {
      issues.push(`${path}.artifactBasis must declare a supported sha256 JPEG normalization`);
    }
  }
  if (value.zkPoseidonHash !== undefined && (typeof value.zkPoseidonHash !== "string" || !value.zkPoseidonHash.trim())) {
    issues.push(`${path}.zkPoseidonHash must be a non-empty string when present`);
  }
  if (value.signatureV3 !== undefined && !isRecord(value.signatureV3)) {
    issues.push(`${path}.signatureV3 must be an object when present`);
  }
  if (value.signatureV4 !== undefined && !isRecord(value.signatureV4)) {
    issues.push(`${path}.signatureV4 must be an object when present`);
  }
  if (value.wireproof !== undefined) {
    const wireproof = value.wireproof;
    if (!isRecord(wireproof)) {
      issues.push(`${path}.wireproof must be an object when present`);
    } else {
      if (wireproof.schema !== "wireproof.v1") issues.push(`${path}.wireproof.schema must be wireproof.v1`);
      if (!asSdkHex(wireproof.anchorId, 8)) issues.push(`${path}.wireproof.anchorId must be 8 lowercase hex characters`);
      if (!asSdkHex(wireproof.claimHashSha256, 64)) {
        issues.push(`${path}.wireproof.claimHashSha256 must be 64 lowercase hex characters`);
      }
      if (typeof wireproof.verifierPath !== "string" || !wireproof.verifierPath.trim()) {
        issues.push(`${path}.wireproof.verifierPath must be a non-empty string`);
      }
    }
  }

  return value as ReceizProofBundle;
}

const WEBHOOK_EVENT_TYPE_SET = new Set<ReceizWebhookEventType>(RECEIZ_WEBHOOK_EVENT_TYPES);

export class ReceizClient {
  readonly baseUrl: string;
  readonly httpTransport: Readonly<{ legacyConnectHttp: boolean }>;
  private readonly accessToken: string | undefined;
  private readonly applicationId: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly legacySubjectHttp: boolean;
  private readonly subjectRuntime: ReceizV127SubjectRuntimeAdapter | undefined;
  private readonly v124DomainsByApplication = new Map<string, ReturnType<typeof createReceizV124Domains>>();
  private readonly v124NamespacesByApplication = new Map<string, ReturnType<typeof createReceizV124Namespaces>>();
  private readonly v124RecipientsByApplication = new Map<string, ReturnType<typeof createReceizV124Recipient>>();

  private readonly exchangeProofAuthorityV123 = createReceizProofAuthorityExchangeV123(<T>(path: string, options: Readonly<{ method: string; body: Record<string, unknown> }>) =>
    this.request<T>(path, options as RequestOptions));

  private readonly remoteValueExecutionV123 = createReceizRemoteValueExecutionV123(<T>(path: string, options = {}) =>
    this.request<T>(path, options as RequestOptions));

  private readonly v124Execution = createReceizV124Execution(
    <T>(path: string, options = {}) => this.#requestV124Execution<T>(path, options),
  );

  private readonly v124RuntimeV124 = createReceizV124Runtime(
    <T>(path: string, options = {}) => this.#requestV124Runtime<T>(path, options),
  );

  private readonly v124SourcesV124 = createReceizV124Sources(
    (request) => this.#requestV124AuthenticatedRuntime(request),
  );

  private readonly verifiedAdditionsV124 = (input: ReceizDomainReplayExpectationV124) =>
    this.v124DomainsFor(input.applicationId).verifiedAdditionsV124(input);
  private readonly verifiedReplayV124 = (input: ReceizDomainReplayExpectationV124) =>
    this.v124DomainsFor(input.applicationId).verifiedReplayV124(input);
  private readonly verifiedCheckpointV124 = (input: Readonly<{ applicationId: string; domainId: string; throughHead: string }>) =>
    this.v124DomainsFor(input.applicationId).verifiedCheckpointV124(input);
  private readonly verifiedPrivateAdditionsV124 = (input: ReceizPrivateDomainAdditionsInputV124) =>
    this.v124DomainsFor(input.applicationId).verifiedPrivateAdditionsV124(input);
  private readonly exportVerifiedReplayProofObjectV124 = (
    input: ReceizDomainReplayProofObjectExportInputV124,
  ) => this.v124DomainsFor(input.applicationId).exportVerifiedReplayProofObjectV124(input);
  private readonly restoreVerifiedReplayProofObjectV124 = (
    input: ReceizDomainReplayProofObjectRestoreInputV124,
  ) => this.v124DomainsFor(input.applicationId).restoreVerifiedReplayProofObjectV124(input);
  private readonly resolveNamespacesV124 = (input: ReceizResolveNamespacesInputV124) => {
    if (!this.applicationId) throw new TypeError("V124_APPLICATION_ID_REQUIRED");
    return this.v124NamespacesFor(this.applicationId).resolveNamespacesV124(input);
  };
  private readonly resolvePublicRecipientV124 = (input: ReceizPublicRecipientResolutionInputV124) =>
    this.v124RecipientFor(input.applicationId).resolvePublicRecipientV124(input);
  private readonly publishSealedSourceV124 = async (input: ReceizPublishSealedSourceInputV124) => {
    if (!this.accessToken) throw new Error("receiz_access_token_required");
    return this.v124SourcesV124.publishSealedSourceV124(input);
  };

  private v124ApplicationHintPath(path: string, application: string): string {
    return `${path}?applicationId=${encodeURIComponent(application)}`;
  }

  private executionApplicationId(
    path: string,
    options: Readonly<{ method?: string; body?: Record<string, unknown> }>,
  ): string {
    const body = options.body;
    let candidate: unknown;
    if (isRecord(body?.plan)) candidate = body.plan.applicationId;
    else if (isRecord(body?.handle)) candidate = body.handle.applicationId;
    if (candidate === undefined) {
      const match = path.match(/^\/api\/sdk\/v1\/execution\/(?:by-idempotency\/)?([^/]+)/);
      if (match) {
        try { candidate = decodeURIComponent(match[1]!); } catch { candidate = undefined; }
      }
    }
    return validateReceizApplicationIdV124(candidate, "V124_APPLICATION_ID_REQUIRED");
  }

  async #requestV124Execution<T>(
    path: string,
    options: Readonly<{ method?: string; body?: Record<string, unknown> }> = {},
  ): Promise<T> {
    const application = this.executionApplicationId(path, options);
    const method = options.method === "POST" ? "POST" as const : "GET" as const;
    const body = method === "POST"
      ? Object.freeze({ ...(options.body ?? {}), applicationId: application })
      : null;
    if (method === "POST" && options.body?.applicationId !== undefined
      && validateReceizApplicationIdV124(options.body.applicationId, "V124_APPLICATION_ID_REQUIRED") !== application) {
      throw new TypeError("V124_APPLICATION_ID_MISMATCH");
    }
    const requestInput: ReceizExecutionTransportRequestInputV124 = Object.freeze({
      method,
      path,
      applicationId: application,
      audience: application,
      body,
    });
    const target = method === "POST" ? this.v124ApplicationHintPath(path, application) : path;
    const payload = body === null
      ? await this.request<unknown>(target, { method: "GET" })
      : await this.request<unknown>(target, { method: "POST", body });
    try {
      return await admitReceizSignedExecutionEnvelopeV124(payload, requestInput) as T;
    } catch {
      throw new TypeError("V124_EXECUTION_TRANSPORT_UNAUTHENTICATED");
    }
  }

  async #requestV124Runtime<T>(
    path: string,
    options: Readonly<{ method?: string; body?: Record<string, unknown> }> = {},
  ): Promise<T> {
    if (options.method !== "POST") throw new TypeError("V124_RUNTIME_REQUEST_METHOD_INVALID");
    const body = options.body ?? {};
    const application = validateReceizApplicationIdV124(body.applicationId, "V124_APPLICATION_ID_REQUIRED");
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path,
      applicationId: application,
      audience: application,
      strongerTruth: "receiz-identity-artifact",
      body,
    });
    return this.#requestV124RuntimeEnvelope<T>(request, body);
  }

  async #requestV124AuthenticatedRuntime(
    request: ReceizAuthenticatedRuntimeRequestV124,
  ): Promise<Readonly<{ wire: unknown; receipt: unknown }>> {
    if (!isRecord(request.body)) throw new TypeError("V124_RUNTIME_REQUEST_BODY_INVALID");
    const body = { ...request.body, applicationId: request.applicationId };
    return this.#requestV124RuntimeEnvelope(request, body);
  }

  async #requestV124RuntimeEnvelope<T>(
    request: ReceizAuthenticatedRuntimeRequestV124,
    body: Record<string, unknown>,
  ): Promise<T> {
    const payload = await this.request<unknown>(this.v124ApplicationHintPath(request.path, request.applicationId), {
      method: "POST",
      body,
    });
    try {
      return await admitReceizSignedAuthenticatedRuntimeEnvelopeV124({ request, envelope: payload }) as T;
    } catch {
      throw new TypeError("V124_RUNTIME_TRANSPORT_UNAUTHENTICATED");
    }
  }

  private v124DomainsFor(application: string): ReturnType<typeof createReceizV124Domains> {
    const app = validateReceizApplicationIdV124(application, "V124_APPLICATION_ID_REQUIRED");
    const held = this.v124DomainsByApplication.get(app);
    if (held) return held;
    const created = createReceizV124Domains(
      (request) => this.#requestV124AuthenticatedRuntime(request),
      { audience: app },
    );
    this.v124DomainsByApplication.set(app, created);
    return created;
  }

  private v124NamespacesFor(application: string): ReturnType<typeof createReceizV124Namespaces> {
    const app = validateReceizApplicationIdV124(application, "V124_APPLICATION_ID_REQUIRED");
    const held = this.v124NamespacesByApplication.get(app);
    if (held) return held;
    const created = createReceizV124Namespaces(
      (request) => this.#requestV124AuthenticatedRuntime(request),
      { applicationId: app, audience: app },
    );
    this.v124NamespacesByApplication.set(app, created);
    return created;
  }

  private v124RecipientFor(application: string): ReturnType<typeof createReceizV124Recipient> {
    const app = validateReceizApplicationIdV124(application, "V124_APPLICATION_ID_REQUIRED");
    const held = this.v124RecipientsByApplication.get(app);
    if (held) return held;
    const created = createReceizV124Recipient(
      (request) => this.#requestV124AuthenticatedRuntime(request),
      { audience: app },
    );
    this.v124RecipientsByApplication.set(app, created);
    return created;
  }

  readonly doctor = (options: ReceizCapabilitiesOptions = {}) => this.runDoctor(options);

  readonly execution = this.v124Execution;

  readonly capabilities = Object.assign(
    (options: ReceizCapabilitiesOptions = {}) => this.inspectCapabilities(options),
    {
      describe: async () => describeReceizCapabilities(),
      probe: async (options: ReceizCapabilitiesOptions = {}) => this.inspectCapabilities(options),
    },
  );

  readonly auth = {
    grantedScopes: () => this.readGrantedScopesV123(),
    scopesForRails: (...rails: ReceizRailScopeKey[]) => receizOidcScopesForRails(...rails),
    missingScopesForRails: async (...rails: ReceizRailScopeKey[]) => {
      const granted = new Set(await this.readGrantedScopesV123());
      return receizOidcScopesForRails(...rails).filter((scope) => !granted.has(scope));
    },
    canUseRails: async (...rails: ReceizRailScopeKey[]) => {
      const granted = new Set(await this.readGrantedScopesV123());
      return receizOidcScopesForRails(...rails).every((scope) => granted.has(scope));
    },
  };

  readonly verification = {
    verifyArtifact: (input: ReceizArtifactInput) => this.verifyArtifact(input),
    conformance: () => this.request<JsonObject>("/api/verification/conformance"),
  };

  readonly admission = {
    createEngine: createReceizAdmissionEngine,
    browserStore: createReceizBrowserAdmissionStore,
  };

  readonly coordination: Readonly<{
    remoteDomain: (options: Readonly<{
      namespace: string;
      commitDomain: import("./artifactTransition.js").ReceizCommitDomainId;
    }>) => ReceizRemoteDomain;
  }> = {
    remoteDomain: (options) => {
      if (!this.accessToken) throw new TypeError("REMOTE_COORDINATION_ACCESS_TOKEN_REQUIRED");
      return createReceizRemoteDomain({
        ...options,
        accessToken: this.accessToken,
        baseUrl: this.baseUrl,
        fetchImpl: this.fetchImpl,
        verifyReturnedArtifact: (wireArtifact) => this.verifyReturnedCoordinationArtifact(wireArtifact),
      });
    },
  };

  readonly assets: Readonly<{
    createProofObject: (
      input: ReceizProofObjectCreateInput,
      options: ReceizProofObjectCreateOptions,
    ) => Promise<ReceizSealedArtifact>;
  }> = {
    createProofObject: (input: ReceizProofObjectCreateInput, options: ReceizProofObjectCreateOptions) =>
      this.createProofObject(input, options),
  };

  readonly artifacts: Readonly<{
    download: (artifact: ReceizSealedArtifact) => Promise<ReceizArtifactDownloadEvidence>;
    verifyAndOpen: (file: Blob) => Promise<ReceizOpenedArtifact>;
    admit: (
      verification: ReceizArtifactVerificationResult,
      options: ReceizArtifactAdmissionOptions,
    ) => Promise<ReceizArtifactAdmissionResult>;
    planRecovery: (
      admission: ReceizArtifactAdmissionResult,
      knownHistory?: ReceizVerifiedProofHistory,
    ) => Promise<ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null>;
    admitAndRecover: (
      verification: ReceizArtifactVerificationResult,
      options: ReceizArtifactAdmissionOptions,
    ) => Promise<ReceizArtifactRecoveryResult>;
    commitRecovery: (
      plan: ReceizArtifactRecoveryPlan,
      capability: ReceizVerifiedCapability,
      idempotencyKey: string,
      store: ReceizAdmissionStore,
    ) => Promise<ReceizArtifactRecoveryCommitResult>;
  }> = {
    download: (artifact: ReceizSealedArtifact) => downloadReceizArtifact(artifact),
    verifyAndOpen: (file: Blob) => this.verifyAndOpenArtifact(file),
    admit: (verification, options) => this.admitArtifact(verification, options),
    planRecovery: (admission: ReceizArtifactAdmissionResult, knownHistory?: ReceizVerifiedProofHistory) =>
      planReceizArtifactRecovery(admission, knownHistory),
    admitAndRecover: (verification, options) =>
      createReceizArtifactRecoveryCoordinator({
        admit: (artifactVerification, admissionOptions) => this.admitArtifact(
          artifactVerification as ReceizArtifactVerificationResult,
          admissionOptions,
        ),
      })(verification, options),
    commitRecovery: (plan, capability, idempotencyKey, store) =>
      commitReceizArtifactRecovery(plan, capability, idempotencyKey, store),
  };

  readonly publicProof = {
    observe: (body: PublicProofObserveRequest) => this.observePublicProof(body),
    byUrl: (url: string) => this.readPublicProofByUrl(url),
    byId: (id: string) => this.readPublicProofById(id),
    byCreator: (externalCreatorId: string) => this.readPublicProofByCreator(externalCreatorId),
    registryFeed: (feed: PublicProofRegistryFeed, options: { signature?: string } = {}) => this.publishAppState(feed as ReceizAppStateFeed, options),
  };

  readonly appState = {
    publish: (input: ReceizAppStatePublishInput, options: { signature?: string; idempotencyKey?: string } = {}) =>
      this.publishAppStateInput(input, options),
    publishRecord: (record: ReceizAppStateRecord | ReceizAppStateRecordInput, options: ReceizAppStatePublishRecordOptions = {}) =>
      this.publishAppStateRecord(record, options),
    resolve: <TData extends JsonObject = JsonObject>(input: ReceizAppStateResolveInput) => this.resolveAppState<TData>(input),
    byUrl: (url: string) => this.readAppStateByUrl(url),
    byHost: (host: string) => this.readAppStateByHost(host),
    byCreator: (receizId: string) => this.readAppStateByCreator(receizId),
    byNamespace: (namespace: string) => this.readAppStateByNamespace(namespace),
    byId: (id: string) => this.readAppStateById(id),
    restoreByUrl: <TData extends JsonObject = JsonObject>(url: string, options: ReceizAppStateRestoreOptions = {}) =>
      this.restoreAppStateByUrl<TData>(url, options),
    restoreByHost: <TData extends JsonObject = JsonObject>(host: string, options: ReceizAppStateRestoreOptions = {}) =>
      this.restoreAppStateByHost<TData>(host, options),
    restoreById: <TData extends JsonObject = JsonObject>(id: string, options: ReceizAppStateRestoreOptions = {}) =>
      this.restoreAppStateById<TData>(id, options),
    createRecord: createReceizAppStateRecord,
    createTenantRecord: createReceizTenantAppStateRecord,
    createFeed: createReceizAppStateFeed,
    createPublicStoreRecord: createReceizPublicStoreStateRecord,
    urlFromHost: receizAppStateUrlFromHost,
    namespaceFromUrl: receizAppStateNamespaceFromUrl,
    objectIdFromUrl: receizAppStateObjectIdFromUrl,
    extractData: extractReceizAppStateData,
    restoreProjection: restoreReceizAppStateProjection,
  };

  readonly publicStore = {
    publish: <TState extends JsonObject = JsonObject>(
      input: ReceizPublicStorePublishInput<TState>,
      options: ReceizIdempotencyOptions = {},
    ) => this.publishPublicStore(input, options),
    signPublish: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>) =>
      this.signPublicStorePublish(input),
    publishSigned: <TState extends JsonObject = JsonObject>(
      signed: ReceizPublicStoreSignedPublish<TState>,
      options: ReceizIdempotencyOptions = {},
    ) => this.publishSignedPublicStore(signed, options),
    publishWithIdentityProof: <TState extends JsonObject = JsonObject>(
      input: ReceizPublicStoreSignedPublishInput<TState>,
      options: ReceizIdempotencyOptions = {},
    ) => this.publishPublicStoreWithIdentityProof(input, options),
    restoreLatest: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreRestoreLatestInput) =>
      this.restoreLatestPublicStore<TState>(input),
    assertSignedPublishContract: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>) =>
      this.assertPublicStoreSignedPublishContract(input),
    resolve: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreResolveInput) => this.resolvePublicStore<TState>(input),
    createRecord: createReceizPublicStoreStateRecord,
    scopes: RECEIZ_OIDC_SCOPES_BY_RAIL.publicStore,
  };

  readonly sports = {
    conformance: () => this.sportsConformance(),
    conformanceHistory: () => this.request<JsonObject>("/api/game/sports/conformance/history"),
    conformanceRollups: (query: { days?: number } = {}) =>
      this.request<JsonObject>(appendQuery("/api/game/sports/conformance/history/rollups", query)),
    badge: () => this.request<JsonObject>("/api/game/sports/conformance/badge"),
    eventProofUrl: (eventProofId: string) => `${this.baseUrl}/game/sports/event/${encodePathSegment(eventProofId)}`,
    assertCardManifest: assertReceizSportsCardManifest,
    resolveCardMemory: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) =>
      this.resolveLocalFirstSurface<TValue>("sports.card_memory", input),
    resolvePitchDayProof: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) =>
      this.resolveLocalFirstSurface<TValue>("sports.pitch_day_proof", input),
  };

  readonly wallet = {
    publicLedger: (query: { limit?: number; cursor?: string; since?: string } = {}) => this.publicWalletLedger(query),
    actionLedger: (query: { limit?: number; cursor?: string; since?: string } = {}) =>
      this.request<ActionLedgerFeed>(appendQuery("/api/ledger/actions/public", query)),
    resolveLedger: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) =>
      this.resolveLocalFirstSurface<TValue>("wallet.ledger", input),
  };

  readonly profile = {
    update: (input: ReceizProfileUpdateInput) => this.updateProfile(input),
    resolveLocalFirst: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) =>
      this.resolveLocalFirstSurface<TValue>("profile", input),
  };

  private readonly remoteSubjectsV122 = createReceizRemoteSubjectsV122({
    request: <T>(path: string, options: Readonly<{ method?: string; body?: Record<string, unknown> }> = {}) =>
      this.request<T>(path, options as RequestOptions),
    hasAccessToken: () => Boolean(this.accessToken),
  });

  private readonly remoteWorldV122 = createReceizRemoteWorldV122(<T>(path: string, options = {}) =>
    this.request<T>(path, options as RequestOptions));

  readonly subjectMandates = createReceizRemoteSubjectMandatesV122(<T>(path: string, options = {}) =>
    this.request<T>(path, options as RequestOptions));

  readonly value = {
    planSettlement: planReceizSettlementV122,
    planReserve: planReceizReserveV122,
    quoteDisplayUsd: quoteReceizDisplayUsdV122,
    validateDisplayPrice: validateReceizDisplayPriceV122,
    validateIntent: validateReceizValueIntentV122,
    executeSettlement: this.remoteValueExecutionV123.executeSettlement,
    executeReserve: this.remoteValueExecutionV123.executeReserve,
    executionByIdempotencyKey: this.remoteValueExecutionV123.executionByIdempotencyKey,
    edge: {
      planSettlement: planReceizEdgeSettlementTransferV125,
      planReserve: planReceizEdgeReserveTransferV125,
      inspect: inspectReceizEdgeValueTransferPlanV125,
      receiveSettlement: receiveReceizEdgeSettlementV125,
      receiveReserve: receiveReceizEdgeReserveV125,
      confirmSettlementSend: confirmReceizEdgeSettlementSendV125,
      confirmReserveSend: confirmReceizEdgeReserveSendV125,
      verifyTransitionSet: verifyReceizPortableExecutionTransitionSetV124,
      prepareCommitSet: prepareReceizPortableExecutionTransitionCommitSetV124,
      createRecovery: createReceizPortableExecutionTransitionRecoveryV124,
    },
  };

  readonly attestations = {
    createAuthority: createReceizAttestationAuthorityV125,
    createApplication: createReceizAttestationApplicationV125,
    planInitialSource: planReceizInitialAttestationSourceV125,
    applyInitialSource: applyReceizInitialSourceV125,
    verifyHistory: verifyReceizAttestationHistoryV125,
    planEvent: planReceizAttestationEventV125,
    applyEvent: applyReceizAttestationEventV125,
  };

  readonly credentials = {
    issue: createReceizCredentialV125,
    planInitialSource: planReceizInitialCredentialSourceV125,
    applyInitialSource: applyReceizInitialSourceV125,
    verifyHistory: verifyReceizCredentialHistoryV125,
    planLifecycle: planReceizCredentialLifecycleEventV125,
    applyLifecycle: applyReceizCredentialLifecycleEventV125,
    resolveCurrentness: resolveReceizCredentialCurrentnessV125,
  };

  readonly presentations = {
    createSourceVerifier: createReceizSourceBoundCredentialPresentationVerifierV125,
    createChallenge: createReceizPbiCeremonyChallengeV125,
    approveChallenge: approveReceizPbiCeremonyV125,
    issuePresenceReceipt: issueReceizPbiCeremonyReceiptV125,
    verifyPresenceReceipt: verifyReceizPbiCeremonyReceiptV125,
    createReplayGuard: createReceizPbiCeremonyReplayGuardV125,
    create: createReceizCredentialPresentationV125,
    verify: verifyReceizCredentialPresentationV125,
    exportFile: exportReceizCredentialPresentationFileV125,
    importFile: importReceizCredentialPresentationFileV125,
    createContentUrl: createReceizCredentialPresentationContentUrlV125,
    readContentUrl: readReceizCredentialPresentationContentUrlV125,
    createQrHandoff: createReceizCredentialPresentationQrHandoffV125,
    createNfcHandoff: createReceizCredentialPresentationNfcHandoffV125,
  };

  readonly subjectCoordination = {
    sourceFamilies: {
      create: createReceizSubjectSourceFamilyV125,
      open: openReceizSubjectSourceFamilyV125,
      readMember: readReceizSubjectSourceFamilyMemberV125,
    },
    prepareInitialTemporalSource: prepareReceizInitialTemporalSubjectSourceV125,
    readTemporalSource: readReceizTemporalSubjectSourceV125,
    readRelationshipSource: readReceizSubjectRelationshipSourceV125,
    relationshipBindingDigest: createReceizSubjectRelationshipEventBindingDigestV125,
    threadSources: {
      prepareInitial: prepareReceizInitialTemporalConversationSourceV125,
      create: createReceizSubjectThreadSourceFamilyV125,
      open: openReceizSubjectThreadSourceFamilyV125,
      readMember: readReceizSubjectThreadSourceMemberV125,
    },
    planMessage: planReceizSubjectMessageEventV125,
    applyMessage: applyReceizSubjectMessageEventV125,
    projectThread: projectReceizSubjectThreadV125,
    planRelationship: planReceizSubjectRelationshipEventV125,
    applyRelationship: applyReceizSubjectRelationshipEventV125,
    projectRelationship: projectReceizSubjectRelationshipV125,
    createPresence: createReceizSubjectPresenceV125,
    presenceBindingDigest: createReceizSubjectPresenceEventBindingDigestV125,
    planPresence: planReceizSubjectPresenceEventV125,
    applyPresence: applyReceizSubjectPresenceEventV125,
    projectPresence: projectReceizSubjectPresenceV125,
    verifyPresence: verifyReceizSubjectPresenceV125,
    resolvePresenceCurrentness: resolveReceizSubjectPresenceCurrentnessV125,
    discover: discoverReceizSubjectsV125,
  };

  readonly externalExecution = {
    createProfile: createReceizExternalExecutionProfileV125,
    plan: planReceizExternalExecutionV125,
    verifyPlan: verifyReceizExternalExecutionPlanV125,
    createRuntime: createReceizExternalExecutionRuntimeV125,
    verifyOutcome: verifyReceizExternalExecutionOutcomeV125,
    profiles: {
      payment: RECEIZ_PAYMENT_EXECUTION_PROFILE_V125,
      refund: RECEIZ_REFUND_EXECUTION_PROFILE_V125,
      notification: RECEIZ_NOTIFICATION_EXECUTION_PROFILE_V125,
    },
  };

  readonly subjects = {
    admit: this.remoteSubjectsV122.admit,
    state: this.remoteSubjectsV122.state,
    exportEdgeBundle: this.remoteSubjectsV122.exportEdgeBundle,
    importEdgeBundle: this.remoteSubjectsV122.importEdgeBundle,
    accessBinding: this.remoteSubjectsV122.accessBinding,
    publishAccessKey: this.remoteSubjectsV122.publishAccessKey,
    createAccessKey: this.remoteSubjectsV122.createAccessKey,
    resolveNamespaces: this.remoteSubjectsV122.resolveNamespaces,
    resolveNamespacesV124: this.resolveNamespacesV124,
    resolve: (subjectId: string) =>
      this.request<ReceizSubjectArtifactV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}`),
    verify: (subjectArtifact: ReceizSubjectArtifactV1) =>
      this.request<Readonly<{ valid: boolean; sourcePrimitive: "receiz.subject.v1" }>>("/api/receiz/v120/subjects/verify", {
        method: "POST",
        body: { subjectArtifact } as unknown as JsonObject,
      }),
    legacyState: (subjectId: string) =>
      this.request<ReceizSubjectV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/state`),
    history: (subjectId: string, query: { afterHead?: string; limit?: number } = {}) =>
      this.request<readonly ReceizWorldEventV1[]>(appendQuery(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/history`, query)),
    additions: (subjectId: string, query: { afterHead?: string } = {}) =>
      this.request<readonly ReceizWorldEventV1[]>(appendQuery(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/additions`, query)),
    subscribe: (subjectId: string, query: { afterHead?: string } = {}) =>
      this.streamJsonEvents<ReceizWorldEventV1>(appendQuery(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/subscribe`, query)),
    brain: {
      head: (subjectId: string) =>
        this.request<ReceizSubjectProofBrainHeadV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/brain`),
      search: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) =>
        this.request<readonly ReceizSubjectProofReferenceV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/brain/search`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      resolve: (subjectId: string, input: Readonly<{ atHead: string; references: readonly ReceizSubjectProofReferenceV1[] }>) =>
        this.request<ReceizSubjectProofContextV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/brain/resolve`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      stream: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) =>
        this.streamJsonEvents<ReceizSubjectProofBrainStreamEvent>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/brain/stream`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
    twin: {
      profile: (subjectId: string) =>
        this.request<Readonly<{ subjectId: string; subjectType: string; head: string; brainHead: ReceizSubjectProofBrainHeadV1 }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/profile`),
      message: (subjectId: string, input: ReceizSubjectTwinMessageInput) =>
        this.request<ReceizSubjectTwinResultV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/message`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      stream: (subjectId: string, input: ReceizSubjectTwinMessageInput) =>
        this.streamJsonEvents<ReceizSubjectTwinStreamEvent>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/stream`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      exportMind: (subjectId: string) =>
        this.request<ReceizSubjectMindArtifactV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/mind/export`),
      importMind: (subjectId: string, artifact: ReceizSubjectMindArtifactV1 | ReceizV127SubjectRuntimeSource) =>
        this.request<Readonly<{ ok: boolean; subjectId?: string; mindDigest?: string; head?: string; code?: string; writes?: number }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/mind/import`, {
          method: "POST",
          body: { artifact } as unknown as JsonObject,
        }),
      memorySummary: (subjectId: string) =>
        this.request<Readonly<{ subjectId: string; head: string; counts: Readonly<Record<string, number>>; projectionDigest: string }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/memory-summary`),
      streamPerformance: (subjectId: string, input: ReceizSubjectTwinMessageInput) =>
        this.streamJsonEvents<ReceizSubjectTwinStreamEvent>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/twin/performance`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
    mandates: {
      get: (subjectId: string) =>
        this.request<readonly ReceizSubjectMandateV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/mandates`),
      plan: (subjectId: string, policy: ReceizSubjectMandatePolicyV1) =>
        this.request<ReceizSubjectMandateV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/mandates/plan`, {
          method: "POST",
          body: { policy } as unknown as JsonObject,
        }),
      activate: (plan: ReceizSubjectMandateV1, ownerCapability: ReceizSubjectCapabilityV1) =>
        this.request<ReceizSubjectMandateV1>(`/api/receiz/v120/subjects/${encodePathSegment(plan.subjectId)}/mandates/activate`, {
          method: "POST",
          body: { plan, ownerCapability } as unknown as JsonObject,
        }),
      pause: (subjectId: string) =>
        this.request<readonly ReceizSubjectMandateV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/mandates/pause`, { method: "POST" }),
      revoke: (subjectId: string) =>
        this.request<readonly ReceizSubjectMandateV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/mandates/revoke`, { method: "POST" }),
      explain: (subjectId: string) =>
        this.request<Readonly<{ subjectId: string; currentKai: string; mandates: readonly (ReceizSubjectMandateV1 & { executable: boolean })[] }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/mandates/explain`),
    },
    runtime: {
      enqueueTick: (input: ReceizSubjectRuntimeTickInput) =>
        this.request<ReceizSubjectRuntimeJobV1>(`/api/receiz/v120/subjects/${encodePathSegment(input.subjectId)}/runtime/ticks`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      status: (jobId: string) =>
        this.request<ReceizSubjectRuntimeJobV1>(`/api/receiz/v120/subject-runtime/${encodePathSegment(jobId)}`),
      pause: (subjectId: string) =>
        this.request<Readonly<{ subjectId: string; cancelledJobIds: readonly string[]; writes: number }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/runtime/pause`, { method: "POST" }),
      catchUp: (subjectId: string, input: Readonly<{ maximumTicks?: number; throughKai?: string; worldId?: string }> = {}) =>
        this.request<Readonly<{ subjectId: string; processed: number; jobs: readonly ReceizSubjectRuntimeJobV1[] }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/runtime/catch-up`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
    memory: {
      query: (subjectId: string, input: Readonly<{ types?: readonly string[]; visibility?: "public" | "private" | "all"; afterKai?: string; limit?: number }> = {}) =>
        this.request<readonly ReceizSubjectMemoryEventV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/memory/query`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      project: (subjectId: string, input: Readonly<{ throughHead: string }>) =>
        this.request<ReceizSubjectMemoryProjectionV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/memory/project`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      citations: (subjectId: string, memoryId: string) =>
        this.request<Readonly<{ memoryId: string; eventIds: readonly string[]; proofObjectIds: readonly string[] }>>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/memory/${encodePathSegment(memoryId)}/citations`),
      compact: (subjectId: string, input: Readonly<{ throughHead?: string }> = {}) =>
        this.request<ReceizSubjectMemoryProjectionV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/memory/compact`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
    relationships: {
      list: (subjectId: string) =>
        this.request<readonly ReceizSubjectRelationshipV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/relationships`),
      propose: (input: Readonly<{ subjectId: string; targetSubjectId: string; visibility?: "public" | "private"; worldId?: string; attemptId: string; idempotencyKey: string }>) =>
        this.request<ReceizWorldTransactionV1>(`/api/receiz/v120/subjects/${encodePathSegment(input.subjectId)}/relationships/propose`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      respond: (input: Readonly<{ subjectId: string; targetSubjectId: string; response: "accept" | "decline"; visibility?: "public" | "private"; worldId?: string; attemptId: string; idempotencyKey: string; authority: ReceizWorldAuthorityV1 }>) =>
        this.request<ReceizWorldExecutionResultV1>(`/api/receiz/v120/subjects/${encodePathSegment(input.subjectId)}/relationships/respond`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      history: (subjectId: string) =>
        this.request<readonly ReceizWorldEventV1[]>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/relationships/history`),
    },
    inventory: {
      list: (subjectId: string) =>
        this.request<ReceizSubjectInventoryV1>(`/api/receiz/v120/subjects/${encodePathSegment(subjectId)}/inventory`),
      use: (input: Readonly<{ subjectId: string; itemId: string; worldId?: string; attemptId: string; idempotencyKey: string; authority: ReceizWorldAuthorityV1 }>) =>
        this.request<ReceizWorldExecutionResultV1>(`/api/receiz/v120/subjects/${encodePathSegment(input.subjectId)}/inventory/use`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
    trades: {
      preview: (input: Readonly<{ fromSubjectId: string; toSubjectId: string; itemId: string; worldId?: string; attemptId: string; idempotencyKey: string; mandateDigest?: string }>) =>
        this.request<Readonly<{ transaction: ReceizWorldTransactionV1; requiresOwnerApproval: boolean; previewDigest: string }>>(`/api/receiz/v120/subjects/${encodePathSegment(input.fromSubjectId)}/trades/preview`, {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
      execute: (input: Readonly<{ previewDigest: string; transaction: ReceizWorldTransactionV1; authority: ReceizWorldAuthorityV1 }>) =>
        this.request<ReceizWorldExecutionResultV1>("/api/receiz/v120/subject-trades/execute", {
          method: "POST",
          body: input as unknown as JsonObject,
        }),
    },
  };

  /** Explicit local V120 admission and state; never aliases modern V122 state. */
  readonly localSubjects = {
    admit: (source: ReceizV127SubjectRuntimeSource) => this.requireLocalSubjectRuntime().admitSubject(source),
    state: (subjectId: string) => this.requireLocalSubjectRuntime().subjects.state(subjectId),
    importSnapshot: (source: ReceizV127SubjectRuntimeSource) => this.requireLocalSubjectRuntime().importSnapshot(source),
    exportSnapshot: () => this.requireLocalSubjectRuntime().exportSnapshot(),
  };

  private requireLocalSubjectRuntime(): ReceizV127SubjectRuntimeAdapter {
    if (!this.subjectRuntime) throw new TypeError("RECEIZ_V120_LOCAL_RUNTIME_REQUIRED");
    return this.subjectRuntime;
  }

  readonly world = {
    planCommandV122: this.remoteWorldV122.planCommandV122,
    planTransactionV122: this.remoteWorldV122.planTransactionV122,
    planPrivateCommand: this.remoteWorldV122.planPrivateCommand,
    planAccessAppend: planReceizWorldAccessAppendV122,
    validateTransaction: this.remoteWorldV122.validateTransaction,
    executeTransactionV122: this.remoteWorldV122.executeTransactionV122,
    execution: this.remoteWorldV122.execution,
    executionByIdempotencyKey: this.remoteWorldV122.executionByIdempotencyKey,
    additionsV122: this.remoteWorldV122.additionsV122,
    planMultiWorldTransaction: this.remoteWorldV122.planMultiWorldTransaction,
    executeMultiWorldTransaction: this.remoteWorldV122.executeMultiWorldTransaction,
    publicSnapshot: () => this.request<ReceizWorldPublicSnapshotResponse>("/api/world/public"),
    profile: (username: string, query: ReceizWorldProfileQuery = {}) =>
      this.request<ReceizWorldProfileResponse>(
        appendQuery(`/api/world/profile/${encodePathSegment(username)}`, {
          visitorKey: query.visitorKey,
          threadKey: query.threadKey,
        }),
      ),
    message: (username: string, body: ReceizWorldProfileMessageRequest) =>
      this.request<ReceizWorldProfileResponse>(`/api/world/profile/${encodePathSegment(username)}`, {
        method: "POST",
        body: { ...body, action: body.action ?? "message" },
      }),
    welcome: (username: string, body: Omit<ReceizWorldProfileMessageRequest, "action" | "message"> = {}) =>
      this.request<ReceizWorldProfileResponse>(`/api/world/profile/${encodePathSegment(username)}`, {
        method: "POST",
        body: { ...body, action: "welcome" },
      }),
    book: (username: string, body: Omit<ReceizWorldProfileMessageRequest, "action">) =>
      this.request<ReceizWorldProfileResponse>(`/api/world/profile/${encodePathSegment(username)}`, {
        method: "POST",
        body: { ...body, action: "book" },
      }),
    streamProfile: (username: string, body: ReceizWorldProfileMessageRequest) =>
      this.streamJsonEvents<ReceizWorldProfileStreamEvent>(`/api/world/profile/${encodePathSegment(username)}/stream`, {
        method: "POST",
        body: { ...body, action: body.action === "welcome" ? "welcome" : "message" },
      }),
    planCommand: (input: ReceizWorldCommandInputV1) =>
      this.request<ReceizWorldCommandPlanV1>("/api/receiz/v120/world/commands/plan", { method: "POST", body: input as unknown as JsonObject }),
    validateCommand: (plan: ReceizWorldCommandPlanV1) =>
      this.request<Readonly<{ ok: boolean; writes: 0; planDigest?: string; code?: string }>>("/api/receiz/v120/world/commands/validate", { method: "POST", body: { plan } as unknown as JsonObject }),
    executeCommand: (plan: ReceizWorldCommandPlanV1, authority: ReceizWorldAuthorityV1) =>
      this.request<ReceizWorldExecutionResultV1>("/api/receiz/v120/world/commands/execute", { method: "POST", body: { plan, authority } as unknown as JsonObject }),
    receipt: (receiptId: string) =>
      this.request<ReceizWorldReceiptV1>(`/api/receiz/v120/world/receipts/${encodePathSegment(receiptId)}`),
    replay: (input: Readonly<{ worldId: string; throughHead?: string }>) =>
      this.request<Readonly<{ schema: "receiz.world.checkpoint.v1"; worldId: string; throughHead: string; events: readonly ReceizWorldEventV1[]; subjectHeads: Readonly<Record<string, string>>; checkpointDigest: string; registryDigest: string; reducerDigest: string }>>("/api/receiz/v120/world/replay", { method: "POST", body: input as unknown as JsonObject }),
    planTransaction: (input: Readonly<{ participants: readonly string[]; expectedHeads: Readonly<Record<string, string>>; commands: readonly ReceizWorldCommandV1[] }>) =>
      this.request<ReceizWorldTransactionV1>("/api/receiz/v120/world/transactions/plan", { method: "POST", body: input as unknown as JsonObject }),
    executeTransaction: (plan: ReceizWorldTransactionV1, authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1) =>
      this.request<ReceizWorldExecutionResultV1>("/api/receiz/v120/world/transactions/execute", { method: "POST", body: { plan, authority } as unknown as JsonObject }),
    additions: (input: Readonly<{ worldId: string; afterHead?: string; types?: readonly string[] }>) =>
      this.request<readonly ReceizWorldEventV1[]>(appendQuery("/api/receiz/v120/world/additions", {
        worldId: input.worldId,
        afterHead: input.afterHead,
        types: input.types?.join(","),
      })),
    subscribe: (input: Readonly<{ worldId: string; afterHead?: string; types?: readonly string[] }>) =>
      this.streamJsonEvents<ReceizWorldEventV1>(appendQuery("/api/receiz/v120/world/subscribe", {
        worldId: input.worldId,
        afterHead: input.afterHead,
        types: input.types?.join(","),
      })),
  };

  /** Historical V120 instrument protocol. These six methods require an
   * explicitly configured compatibility HTTP host; the local same-owner host
   * does not provide cross-owner coordination. Current canonical artifact
   * claims use ownership.claimBearerAsset({ artifact }) and its existing
   * carried-continuity verifier and one-claim coordinator. Protocol heads are
   * never translated between these operations. */
  readonly bearer = {
    previewTransfer: (input: Readonly<{ subjectId: string; policy: ReceizBearerTransferPolicyV1 }>) =>
      this.request<ReceizBearerTransferPlanV1>("/api/receiz/v120/bearer/transfers/preview", { method: "POST", body: input as unknown as JsonObject }),
    issueTransferInstrument: (input: Readonly<{ plan: ReceizBearerTransferPlanV1; ownerCapability: ReceizBearerCapabilityV1 }>) =>
      this.request<ReceizBearerInstrumentV1>("/api/receiz/v120/bearer/transfers/instruments", { method: "POST", body: input as unknown as JsonObject }),
    inspectInstrument: (artifact: ReceizBearerInstrumentV1) =>
      this.request<Readonly<{ valid: boolean; offlineVerified: boolean; instrument: ReceizBearerInstrumentV1; sourcePrimitive: "receiz.bearer.instrument.v1"; registryDigest: string; reducerDigest: string }>>("/api/receiz/v120/bearer/transfers/instruments/inspect", { method: "POST", body: { artifact } as unknown as JsonObject }),
    claimInstrument: (artifact: ReceizBearerInstrumentV1, recipientCapability: ReceizBearerCapabilityV1) =>
      this.request<Readonly<{ ok: true; receipt: ReceizBearerTransferReceiptV1; idempotent: boolean } | { ok: false; code: string; writes: 0 }>>("/api/receiz/v120/bearer/transfers/claim", { method: "POST", body: { artifact, recipientCapability } as unknown as JsonObject }),
    cancelTransfer: (transferId: string, ownerCapability: ReceizBearerCapabilityV1) =>
      this.request<Readonly<{ ok: boolean; transferId?: string; status?: string; head?: string; code?: string; writes?: 0 }>>(`/api/receiz/v120/bearer/transfers/${encodePathSegment(transferId)}/cancel`, { method: "POST", body: { ownerCapability } as unknown as JsonObject }),
    transferStatus: (transferId: string) =>
      this.request<Readonly<{ transferId: string; status: string; subjectId: string; instrumentDigest: string; receiptId: string | null }>>(`/api/receiz/v120/bearer/transfers/${encodePathSegment(transferId)}`),
  };

  readonly connect = {
    wallet: () => this.delegated<ConnectWalletResponse>("/api/connect/wallet/me"),
    record: ((body: JsonObject) => this.delegatedRecord(body)) as ReceizConnectRecordOperation,
    verifyArtifact: (file: Blob) => this.delegatedVerifyArtifact(file),
    transfer: (body: ConnectTransferRequest, options: { idempotencyKey?: string } = {}) => this.connectTransfer(body, options),
    checkout: (body: CheckoutRequest) => this.delegated<CheckoutSessionResponse>("/api/connect/payments/checkout", { method: "POST", body }),
    checkoutSession: (query: { checkoutSessionId?: string; sessionId?: string }) =>
      this.delegated<CheckoutSessionResponse>(appendQuery("/api/connect/payments/session", query)),
    mintNote: (body: JsonObject) => this.delegated<JsonObject>("/api/connect/payments/notes/mint", { method: "POST", body }),
    claimNote: (body: JsonObject) => this.delegated<JsonObject>("/api/connect/payments/notes/claim", { method: "POST", body }),
    downloadNote: (noteId: string) => this.delegatedBlob(`/api/connect/payments/notes/${encodePathSegment(noteId)}/download`),
  };

  readonly twin = {
    marketMandate: () => this.delegated<TwinMarketMandateResponse>("/api/connect/twin/market/mandate", { method: "GET" }),
    saveMarketMandate: (body: SaveTwinMarketMandateInput) =>
      this.delegated<TwinMarketMandateResponse>("/api/connect/twin/market/mandate", { method: "PATCH", body }),
    marketIntents: () => this.delegated<TwinMarketIntentsResponse>("/api/connect/twin/market/intents", { method: "GET" }),
    createMarketIntent: (body: CreateTwinMarketIntentInput) =>
      this.delegated<TwinMarketIntentResponse>("/api/connect/twin/market/intents", { method: "POST", body }),
    approveMarketIntent: (intentId: string) =>
      this.delegated<TwinMarketIntentResponse>(`/api/connect/twin/market/intents/${encodePathSegment(intentId)}/approve`, {
        method: "POST",
      }),
    exportMind: () => this.delegatedBlob("/api/connect/twin/mind/export"),
    importMindSummary: () => this.delegated<TwinMindImportSummaryResponse>("/api/connect/twin/mind/import", { method: "GET" }),
    importMind: (file: Blob) => this.delegatedTwinMindImport(file),
    approval: () => this.delegated<TwinApprovalResponse>("/api/connect/twin/approval", { method: "GET" }),
    approvePromotion: (body: TwinPromotionApprovalInput) =>
      this.delegated<TwinApprovalResponse>("/api/connect/twin/approval", { method: "POST", body }),
  };

  readonly identity = {
    createReceizId: createReceizIdIdentity,
    readArtifact: readReceizIdentityArtifact,
    projectAccount: projectReceizIdentityAccount,
    signLoginProof: signReceizIdentityLoginProof,
    signCapability: signReceizCapability,
    verifyLoginProof: verifyReceizIdentityLoginProof,
    exchangeProofAuthority: this.exchangeProofAuthorityV123,
    resolvePublicRecipientV124: this.resolvePublicRecipientV124,
    resolvePublicRecipient: this.resolvePublicRecipientV124,
    buildReceizIdContinueRequest,
    continueReceizId: (identity: ReceizDeviceIdentity, options: ReceizIdContinueOptions = {}) =>
      this.continueReceizId(identity, options),
    checkUsernameAvailability: (username: string) => this.checkUsernameAvailability(username),
    updateProfile: (input: ReceizProfileUpdateInput) => this.updateProfile(input),
    openIdConfiguration: () => this.request<JsonObject>("/.well-known/openid-configuration"),
    oauthAuthorizationServerMetadata: () => this.request<JsonObject>("/.well-known/oauth-authorization-server"),
    jwks: () => this.request<JsonObject>("/api/oidc/jwks"),
    userinfo: () => this.delegated<JsonObject>("/api/oidc/userinfo"),
    token: (body: OidcTokenRequest, options: { authorization?: string } = {}) =>
      this.request<OidcTokenResponse>("/api/oidc/token", {
        method: "POST",
        body: formFromRecord(body),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...(options.authorization ? { authorization: options.authorization } : {}),
        },
      }),
    introspect: (body: Record<string, string>, options: { authorization?: string } = {}) =>
      this.request<JsonObject>("/api/oidc/introspect", {
        method: "POST",
        body: formFromRecord(body),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...(options.authorization ? { authorization: options.authorization } : {}),
        },
      }),
    revoke: (body: Record<string, string>, options: { authorization?: string } = {}) =>
      this.request<JsonObject>("/api/oidc/revoke", {
        method: "POST",
        body: formFromRecord(body),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...(options.authorization ? { authorization: options.authorization } : {}),
        },
    }),
    bootstrap: (username: string) => this.request<JsonObject>(`/api/connect/login/bootstrap/${encodePathSegment(username)}`),
    authorizeUrl: (options: ReceizAuthorizeUrlOptions) => this.authorizeUrl(options),
    ensureTenantSession: (input: ReceizEnsureTenantSessionInput) => this.ensureTenantSession(input),
  };

  readonly customers = {
    bootstrapSession: (body: ReceizCustomerSessionBootstrapRequest, options: ReceizIdempotencyOptions = {}) =>
      this.bootstrapCustomerSession(body, options),
    bootstrap: (body: ReceizCustomerSessionBootstrapRequest, options: ReceizIdempotencyOptions = {}) =>
      this.bootstrapCustomerSession(body, options),
    session: (body: ReceizCustomerSessionRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/customers/session", body, options),
    portal: (body: ReceizTenantRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/customers/portal", body),
    orders: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/customers/orders", queryParams(query))),
    rewards: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/customers/rewards", queryParams(query))),
    assets: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/customers/assets", queryParams(query))),
  };

  readonly merchants = {
    onboard: (body: ReceizMerchantOnboardRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/merchants/onboard", body, options),
    profile: (query: { tenantHost?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/merchants/profile", query)),
    capabilities: (query: { tenantHost?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/merchants/capabilities", query)),
  };

  readonly commerce = {
    oneClickCheckout: (body: ReceizOneClickCheckoutRequest) => this.oneClickCheckout(body),
    refunds: {
      create: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/refunds", body, options),
    },
    subscriptions: {
      create: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/subscriptions", body, options),
      cancel: (subscriptionId: string, body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>(`/api/connect/commerce/subscriptions/${encodePathSegment(subscriptionId)}/cancel`, body, options),
    },
    shipping: {
      quote: (body: ReceizCommerceRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/commerce/shipping/quote", body),
      update: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/shipping/update", body, options),
    },
    tax: {
      quote: (body: ReceizCommerceRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/commerce/tax/quote", body),
    },
    discounts: {
      create: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/discounts", body, options),
      redeem: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/discounts/redeem", body, options),
    },
    giftCards: {
      issue: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/gift-cards", body, options),
      redeem: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/gift-cards/redeem", body, options),
    },
    accessPasses: {
      issue: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/access-passes", body, options),
      verify: (body: ReceizCommerceRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/commerce/access-passes/verify", body),
    },
    inventory: {
      reserve: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/inventory/reserve", body, options),
      adjust: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/inventory/adjust", body, options),
    },
    fulfillment: {
      update: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/fulfillment", body, options),
    },
    payouts: {
      create: (body: ReceizCommerceRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
        this.delegatedWrite<JsonObject>("/api/connect/commerce/payouts", body, options),
      status: (query: { tenantHost?: string; payoutId?: string } = {}) =>
        this.delegated<JsonObject>(appendQuery("/api/connect/commerce/payouts/status", query)),
    },
  };

  readonly payments = {
    embeddedCheckout: (body: CheckoutRequest) => this.request<CheckoutSessionResponse>("/api/payments/embed/checkout", { method: "POST", body }),
    embeddedNoteClaim: (body: JsonObject) => this.request<JsonObject>("/api/payments/embed/note-claim", { method: "POST", body }),
  };

  readonly media = {
    upload: (file: Blob, options: ReceizMediaUploadOptions = {}) => this.uploadMedia(file, options),
    transform: (body: ReceizMediaTransformRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/media/transform", body, options),
    objectUrl: (query: { bucket: string; path: string }) => appendQuery(`${this.baseUrl}/api/storage/object`, query),
  };

  readonly domains = {
    verifiedAdditionsV124: this.verifiedAdditionsV124,
    verifiedAdditions: this.verifiedAdditionsV124,
    verifiedReplayV124: this.verifiedReplayV124,
    verifiedReplay: this.verifiedReplayV124,
    verifiedCheckpointV124: this.verifiedCheckpointV124,
    verifiedCheckpoint: this.verifiedCheckpointV124,
    verifiedPrivateAdditionsV124: this.verifiedPrivateAdditionsV124,
    verifiedPrivateAdditions: this.verifiedPrivateAdditionsV124,
    exportVerifiedReplayProofObjectV124: this.exportVerifiedReplayProofObjectV124,
    exportVerifiedReplayProofObject: this.exportVerifiedReplayProofObjectV124,
    restoreVerifiedReplayProofObjectV124: this.restoreVerifiedReplayProofObjectV124,
    restoreVerifiedReplayProofObject: this.restoreVerifiedReplayProofObjectV124,
    normalizeHost: normalizeReceizHost,
    tenantUrl: receizAppStateUrlFromHost,
    namespace: receizAppStateNamespaceFromUrl,
    objectId: receizAppStateObjectIdFromUrl,
    resolveTenant: <TData extends JsonObject = JsonObject>(host: string, options: ReceizAppStateRestoreOptions = {}) =>
      this.restoreAppStateByHost<TData>(host, options),
    reserveSubdomain: (body: JsonObject, options: { idempotencyKey?: string } = {}) =>
      this.delegated<JsonObject>("/api/connect/domains/subdomains/reserve", {
        method: "POST",
        body: bodyWithIdempotency(body, options.idempotencyKey),
        headers: headersWithIdempotency(undefined, options.idempotencyKey),
      }),
    verifyCustomDomain: (body: JsonObject, options: { idempotencyKey?: string } = {}) =>
      this.delegated<JsonObject>("/api/connect/domains/custom/verify", {
        method: "POST",
        body: bodyWithIdempotency(body, options.idempotencyKey),
        headers: headersWithIdempotency(undefined, options.idempotencyKey),
      }),
    status: (query: { host?: string; domain?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/domains/status", query)),
  };

  readonly sources = {
    publishSealedSourceV124: this.publishSealedSourceV124,
    publishSealedSource: this.publishSealedSourceV124,
  };

  readonly events = {
    subscribe: (body: ReceizEventSubscribeRequest) => this.eventSubscribe(body),
    replay: (body: ReceizTenantRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/events/replay", body),
    list: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/events", queryParams(query))),
    ack: (eventId: string, body: ReceizTenantRuntimeRequest = {}) =>
      this.delegatedWrite<JsonObject>(`/api/connect/events/${encodePathSegment(eventId)}/ack`, body),
  };

  readonly proof = {
    query: (query: ReceizProofQuery) => this.delegated<JsonObject>("/api/connect/proof/query", { method: "POST", body: query }),
  };

  readonly jobs = {
    enqueue: (body: ReceizJobRequest) =>
      this.delegated<JsonObject>("/api/connect/jobs", {
        method: "POST",
        body: bodyWithIdempotency(body, body.idempotencyKey),
        headers: headersWithIdempotency(undefined, body.idempotencyKey),
      }),
    status: (jobId: string) => this.delegated<JsonObject>(`/api/connect/jobs/${encodePathSegment(jobId)}`),
    cancel: (jobId: string, body: ReceizTenantRuntimeRequest = {}) =>
      this.delegatedWrite<JsonObject>(`/api/connect/jobs/${encodePathSegment(jobId)}/cancel`, body),
    list: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/jobs", queryParams(query))),
  };

  readonly permissions = {
    grant: (body: ReceizPermissionGrantRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/permissions/grants", body, options),
    revoke: (body: ReceizPermissionGrantRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/permissions/revoke", body, options),
    check: (body: ReceizPermissionCheckRequest) => this.delegatedWrite<JsonObject>("/api/connect/permissions/check", body),
    roles: (query: { tenantHost?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/permissions/roles", query)),
  };

  readonly audit = {
    append: (body: ReceizAuditAppendRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/audit/events", body, options),
    query: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/audit/events", queryParams(query))),
    export: (query: ReceizSearchRequest = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/audit/export", queryParams(query))),
  };

  readonly risk = {
    scorePayment: (body: ReceizCommerceRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/risk/payment", body),
    scoreAccountRecovery: (body: ReceizTenantRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/risk/account-recovery", body),
    velocity: (body: ReceizTenantRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/risk/velocity", body),
    proofActivity: (body: ReceizTenantRuntimeRequest) => this.delegatedWrite<JsonObject>("/api/connect/risk/proof-activity", body),
  };

  readonly compliance = {
    exportOrders: (query: ReceizSearchRequest) => this.delegated<JsonObject>(appendQuery("/api/connect/compliance/orders", queryParams(query))),
    exportTaxes: (query: ReceizSearchRequest) => this.delegated<JsonObject>(appendQuery("/api/connect/compliance/taxes", queryParams(query))),
    exportPayouts: (query: ReceizSearchRequest) => this.delegated<JsonObject>(appendQuery("/api/connect/compliance/payouts", queryParams(query))),
    exportCustomers: (query: ReceizSearchRequest) => this.delegated<JsonObject>(appendQuery("/api/connect/compliance/customers", queryParams(query))),
    exportAudit: (query: ReceizSearchRequest) => this.delegated<JsonObject>(appendQuery("/api/connect/compliance/audit", queryParams(query))),
  };

  readonly portability = {
    exportStore: (query: { tenantHost: string }) => this.delegated<JsonObject>(appendQuery("/api/connect/portability/store/export", query)),
    importStore: (body: ReceizTenantRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/portability/store/import", body, options),
  };

  readonly search = {
    query: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/query", body),
    products: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/products", body),
    pages: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/pages", body),
    blog: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/blog", body),
    orders: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/orders", body),
    customers: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/customers", body),
    proofObjects: (body: ReceizSearchRequest) => this.delegatedWrite<JsonObject>("/api/connect/search/proof-objects", body),
  };

  readonly notifications = {
    send: (body: ReceizTenantRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/notifications/send", body, options),
    subscribe: (body: ReceizTenantRuntimeRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/notifications/subscribe", body, options),
    templates: (query: { tenantHost?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/notifications/templates", query)),
  };

  readonly releases = {
    pin: (body: ReceizReleasePinRequest, options: ReceizIdempotencyOptions = {}) =>
      this.delegatedWrite<JsonObject>("/api/connect/releases/pin", body, options),
    check: (query: { tenantHost?: string } = {}) => this.delegated<JsonObject>(appendQuery("/api/connect/releases/check", query)),
    supported: () => this.request<JsonObject>("/api/releases/rails/supported"),
  };

  readonly webhookEndpoints = {
    list: () => this.listWebhookEndpoints(),
    create: (body: ReceizWebhookEndpointCreateInput) => this.createWebhookEndpoint(body),
    update: (endpointId: string, body: ReceizWebhookEndpointUpdateInput) => this.updateWebhookEndpoint(endpointId, body),
    delete: (endpointId: string) => this.deleteWebhookEndpoint(endpointId),
    rotateSecret: (endpointId: string) => this.rotateWebhookEndpointSecret(endpointId),
    sendTest: (endpointId: string, body: ReceizWebhookEndpointTestInput) => this.sendWebhookEndpointTest(endpointId, body),
  };

  readonly webhooks = {
    sign: createReceizWebhookSignature,
    verify: verifyReceizWebhookRequest,
    parseRequest: parseReceizWebhookRequest,
    routeEvent: routeReceizWebhookEvent,
    verifySignature: verifyReceizWebhookSignature,
    signaturePayload: buildReceizWebhookSignaturePayload,
    assertEvent: assertReceizWebhookEvent,
    eventGroups: RECEIZ_WEBHOOK_EVENT_GROUPS,
    eventTypes: RECEIZ_WEBHOOK_EVENT_TYPES,
    presets: RECEIZ_WEBHOOK_EVENT_PRESETS,
    endpoints: this.webhookEndpoints,
  };

  readonly manifests = {
    assertAsset: assertReceizAssetManifest,
    assertSportsCard: assertReceizSportsCardManifest,
    assertWebhookEvent: assertReceizWebhookEvent,
    isAsset: isReceizAssetManifest,
    isSportsCard: isReceizSportsCardManifest,
    isWebhookEvent: isReceizWebhookEvent,
    projectAsset: projectReceizAssetManifest,
    projectSportsCard: projectReceizSportsCardManifest,
  };

  readonly schemas = RECEIZ_SCHEMAS;

  readonly projections = {
    assetManifest: projectReceizAssetManifest,
    sportsCardManifest: projectReceizSportsCardManifest,
  };

  readonly sandbox = {
    seedStore: (options: ReceizSandboxStoreOptions): ReceizSandboxStore => {
      const tenantHost = normalizeReceizHost(options.tenantHost);
      return {
        ok: true,
        schema: "receiz.sdk.sandbox.store.v1",
        tenantHost,
        state: {
          brand: tenantHost,
          products: sandboxProducts(options.products ?? 3),
          rewards: [{ id: "sandbox_reward_1", title: "Sandbox reward", type: "credit" }],
        },
      };
    },
    wallet: (options: { balanceUsdCents?: string; balancePhiMicro?: string } = {}) => ({
      ok: true,
      userId: "sandbox_customer",
      balanceUsdCents: options.balanceUsdCents ?? "10000",
      balancePhiMicro: options.balancePhiMicro ?? "100000000",
    }),
    checkout: (options: ReceizSandboxCheckoutOptions) => ({
      ok: options.outcome !== "failure",
      checkoutSessionId: "sandbox_checkout",
      status: options.outcome === "failure" ? "failed" : "succeeded",
      amountUsd: options.amountUsd,
    }),
  };

  readonly proofMemory = {
    createRegister: createReceizProofRegister,
    createMemory: createReceizProofMemory,
    createInMemoryStorage: createReceizInMemoryProofMemoryStorage,
    createLocalStorage: createReceizLocalStorageProofMemoryStorage,
    assertSnapshot: assertReceizProofRegisterSnapshot,
    additionsQuery: receizProofMemoryAdditionsQuery,
    syncAdditions: (input: ReceizProofMemorySyncInput) => this.syncProofMemoryAdditions(input),
  };

  readonly runtime = {
    localFirst: (input: ReceizRuntimeLocalFirstInput = {}) => this.runtimeLocalFirst(input),
    openAuthoritySessionV124: this.v124RuntimeV124.openAuthoritySessionV124,
    openAuthoritySession: this.v124RuntimeV124.openAuthoritySessionV124,
    refreshAuthoritySessionV124: this.v124RuntimeV124.refreshAuthoritySessionV124,
    refreshAuthoritySession: this.v124RuntimeV124.refreshAuthoritySessionV124,
    closeAuthoritySessionV124: this.v124RuntimeV124.closeAuthoritySessionV124,
    closeAuthoritySession: this.v124RuntimeV124.closeAuthoritySessionV124,
    qualifyV124: this.v124RuntimeV124.qualifyV124,
    qualify: this.v124RuntimeV124.qualifyV124,
  };

  readonly offline = {
    createQueue: createReceizOfflineProofQueue,
    createInMemoryStorage: createReceizInMemoryOfflineProofQueueStorage,
    createLocalStorage: createReceizLocalStorageOfflineProofQueueStorage,
    assertSnapshot: assertReceizOfflineProofQueueSnapshot,
  };

  readonly ownership: Readonly<{
    claimBearerAsset: (input: ReceizBearerArtifactClaimInput) => Promise<ReceizSealedArtifact>;
  }> = {
    claimBearerAsset: (input: ReceizBearerArtifactClaimInput) => this.claimBearerAsset(input),
  };

  constructor(options: ReceizClientOptions = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? RECEIZ_DEFAULT_BASE_URL);
    const legacyConnectHttp = options.legacyConnectTransport === "http";
    if (legacyConnectHttp) {
      let namedHost = false;
      try {
        const url = new URL(options.baseUrl ?? "");
        namedHost = ["http:", "https:"].includes(url.protocol) && !["receiz.com", "www.receiz.com"].includes(url.hostname.toLowerCase()) && !url.username && !url.password;
      } catch { /* Missing or malformed host is not an explicit transport. */ }
      if (!namedHost) throw new TypeError("RECEIZ_HISTORICAL_CONNECT_CUSTOM_HOST_REQUIRED");
    }
    this.httpTransport = Object.freeze({ legacyConnectHttp });
    this.accessToken = options.accessToken;
    this.applicationId = options.applicationId === undefined
      ? undefined
      : validateReceizApplicationIdV124(options.applicationId, "V124_APPLICATION_ID_INVALID");
    this.fetchImpl = normalizeFetch(options.fetchImpl);
    this.subjectRuntime = options.subjectRuntime;
    this.legacySubjectHttp = options.legacySubjectTransport === "http" || options.fetchImpl !== undefined;
    if (options.subjectRuntime) {
      const local = options.subjectRuntime;
      const { state: legacyState, ...subjects } = local.subjects;
      Object.assign(this.subjects, subjects, { legacyState,
        twin: { ...local.subjects.twin, importMind: (id: string, artifact: ReceizSubjectMindArtifactV1 | ReceizV127SubjectRuntimeSource) => {
          if (!("verification" in artifact) || !(artifact.payloadBytes instanceof Uint8Array)) {
            return Promise.reject(new TypeError("SUBJECT_RUNTIME_ENCLOSING_PROOF_REQUIRED"));
          }
          return local.subjects.twin.importMind(id, artifact);
        } },
        mandates: { ...local.subjects.mandates,
          activate: (plan: ReceizSubjectMandateV1, _capability: ReceizSubjectCapabilityV1) => local.subjects.mandates.activate(plan.subjectId, plan.mandateDigest),
        },
      });
      Object.assign(this.world, local.world);
    }
  }

  private async readGrantedScopesV123(): Promise<readonly string[]> {
    if (!this.accessToken) throw new TypeError("RECEIZ_GRANTED_SCOPES_ACCESS_TOKEN_REQUIRED");
    const value = await this.request<unknown>("/api/sdk/v1/auth/granted-scopes");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("RECEIZ_GRANTED_SCOPES_RESPONSE_INVALID");
    const response = value as Record<string, unknown>;
    if (response.schema !== "receiz.auth.granted-scopes.v123" || !Array.isArray(response.grantedScopes)
      || response.grantedScopes.some((scope) => typeof scope !== "string" || !scope.trim() || /\s/.test(scope))) {
      throw new TypeError("RECEIZ_GRANTED_SCOPES_RESPONSE_INVALID");
    }
    return Object.freeze([...new Set(response.grantedScopes as string[])].sort((left, right) => left.localeCompare(right)));
  }

  private async verifyReturnedCoordinationArtifact(wireArtifact: unknown) {
    if (!wireArtifact || typeof wireArtifact !== "object" || Array.isArray(wireArtifact)) {
      throw new Error("ARTIFACT_VERIFICATION_FAILED");
    }
    const wire = wireArtifact as Record<string, unknown>;
    if (typeof wire.exactBytesB64u !== "string") throw new Error("ARTIFACT_VERIFICATION_FAILED");
    const bytes = receizBase64UrlDecode(wire.exactBytesB64u);
    const filename = typeof wire.filename === "string" && wire.filename ? wire.filename : "artifact.receiz";
    const mimeType = typeof wire.mimeType === "string" && wire.mimeType ? wire.mimeType : "application/octet-stream";
    const artifact = typeof File !== "undefined"
      ? new File([arrayBufferCopy(bytes)], filename, { type: mimeType })
      : new Blob([arrayBufferCopy(bytes)], { type: mimeType });
    const verification = await this.verifyArtifact(artifact);
    const admission = await this.admitArtifact(verification, { profile: "portable-state" });
    return verifyReceizArtifactForReconciliation({ sealedArtifact: artifact, admission });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    this.assertHistoricalConnectTransport(path);
    if (path.startsWith("/api/receiz/v120/") && !this.legacySubjectHttp) {
      throw new TypeError("RECEIZ_V120_LOCAL_RUNTIME_OR_EXPLICIT_HTTP_TRANSPORT_REQUIRED");
    }
    const headers = new Headers(options.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");

    const token = options.bearerToken === null ? undefined : options.bearerToken ?? this.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);

    let body = options.body;
    if (isJsonRecordBody(body)) {
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }

    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${this.baseUrl}${requestPath(path)}`;
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };
    if (body !== undefined) init.body = body as BodyInit;

    const response = await this.fetchImpl(url, init);
    const payload = await readPayload(response);
    if (!response.ok) throw new ReceizHttpError(response.status, payload);
    return payload as T;
  }

  private async updateProfile(input: ReceizProfileUpdateInput): Promise<ReceizProfileUpdateResult> {
    const response = await this.request<unknown>("/api/receiz/identity/profile", {
      method: "PATCH",
      body: { profile: input },
    });
    if (!isRecord(response) || response.ok !== true || !("result" in response)) {
      throw new Error("profile_update_result_invalid");
    }
    return parseReceizProfileUpdateResult(response.result);
  }

  private async checkUsernameAvailability(username: string): Promise<ReceizUsernameAvailability> {
    const response = await this.request<unknown>(
      `/api/profile/username/availability?username=${encodeURIComponent(username)}`,
    );
    if (!isRecord(response) || response.ok !== true || !("availability" in response)) {
      throw new Error("username_availability_result_invalid");
    }
    return parseReceizUsernameAvailability(response.availability);
  }

  async verifyArtifact(input: ReceizArtifactInput): Promise<ReceizArtifactVerificationResult> {
    return verifyReceizArtifactStrict(input);
  }

  private async verifyArtifactDuringIssuance(file: Blob): Promise<DocumentVerifyResponse> {
    const form = new FormData();
    form.set("file", file);
    return this.request<DocumentVerifyResponse>("/api/document-verify", { method: "POST", body: form });
  }

  async createProofObject(
    input: ReceizProofObjectCreateInput,
    options: ReceizProofObjectCreateOptions,
  ): Promise<ReceizSealedArtifact> {
    const idempotencyKey = options.idempotencyKey?.trim();
    if (!idempotencyKey || idempotencyKey.length > 256) {
      throw new ReceizArtifactError("artifact_seal_failed");
    }
    if (
      !(input?.payload?.bytes instanceof Uint8Array)
      || input.payload.bytes.byteLength === 0
      || !mimeTypeFromResponse(input.payload.mimeType)
    ) {
      throw new ReceizArtifactError("artifact_payload_missing");
    }

    const filename = options.filename?.trim() || "receiz-proof-object";
    const payloadBytes = new Uint8Array(input.payload.bytes);
    const payloadMimeType = mimeTypeFromResponse(input.payload.mimeType)!;
    const payloadSha256 = await sha256ReceizBytes(payloadBytes);
    const sourceFile = new File([arrayBufferCopy(payloadBytes)], filename, { type: payloadMimeType });
    const sealForm = new FormData();
    sealForm.set("file", sourceFile);

    const sealHeaders = new Headers({ accept: "application/vnd.receiz.bundle+json, application/octet-stream" });
    if (this.accessToken) sealHeaders.set("authorization", `Bearer ${this.accessToken}`);
    sealHeaders.set("x-idempotency-key", idempotencyKey);
    let sealResponse: Response;
    try {
      sealResponse = await this.fetchImpl(`${this.baseUrl}/api/sdk/v1/assets/seal`, {
        method: "POST",
        headers: sealHeaders,
        body: sealForm,
      });
    } catch {
      throw new ReceizArtifactError("artifact_seal_failed");
    }
    if (!sealResponse.ok) {
      const errorPayload = await readPayload(sealResponse);
      const errorCode = isRecord(errorPayload) && typeof errorPayload.error === "string"
        ? errorPayload.error
        : "";
      throw new ReceizArtifactError(
        errorCode.includes("record") ? "artifact_record_failed" : "artifact_seal_failed",
      );
    }
    const ownerReceizId = sealResponse.headers.get("x-receiz-owner")?.trim() ?? "";
    const recordId = sealResponse.headers.get("x-receiz-record-id")?.trim() ?? "";
    const claimId = sealResponse.headers.get("x-receiz-claim-id")?.trim() ?? "";
    const verifyPath = canonicalVerifyPath(sealResponse.headers.get("x-receiz-verify-path"));
    const carrier = sealResponse.headers.get("x-receiz-continuity")?.trim() ?? "";
    const signatureVersion = sealResponse.headers.get("x-receiz-signature-version")?.trim() ?? "";
    const artifactFilename = filenameFromContentDisposition(sealResponse.headers.get("content-disposition"));
    const artifactMimeType = mimeTypeFromResponse(sealResponse.headers.get("content-type"));
    if (carrier !== "native-record-seal" || !artifactFilename || !artifactMimeType) {
      throw new ReceizArtifactError("artifact_seal_failed");
    }
    if (!ownerReceizId.endsWith(".receiz.id") || !recordId) {
      throw new ReceizArtifactError("artifact_owner_mismatch");
    }
    if (!claimId || !verifyPath) {
      throw new ReceizArtifactError("artifact_claim_mismatch");
    }
    if (signatureVersion !== "4") {
      throw new ReceizArtifactError("artifact_signature_v4_required");
    }
    const artifactBytes = new Uint8Array(await sealResponse.arrayBuffer());
    if (!artifactBytes.byteLength) throw new ReceizArtifactError("artifact_seal_failed");

    const artifact = new File([arrayBufferCopy(artifactBytes)], artifactFilename, {
      type: artifactMimeType,
    });
    let verification: DocumentVerifyResponse;
    try {
      verification = await this.verifyArtifactDuringIssuance(artifact);
    } catch (error) {
      if (error instanceof ReceizArtifactError) throw error;
      throw new ReceizArtifactError("artifact_verification_failed");
    }
    return issueCurrentNativeArtifact({
      artifact,
      filename: artifactFilename,
      mimeType: artifactMimeType,
      artifactSha256: await sha256ReceizBytes(artifactBytes),
      payloadSha256,
      payloadFilename: filename,
      payloadMimeType,
      verification,
      continuity: {
        carrier: "native-record-seal",
        ownerReceizId,
        recordId,
        claimId,
        verifyPath,
        signatureVersion: 4,
      },
    });
  }

  private async claimBearerAsset(
    input: ReceizBearerArtifactClaimInput,
  ): Promise<ReceizSealedArtifact> {
    assertSdkIssuedReadableArtifact(input?.artifact);
    const source = input.artifact;
    if (!(source.artifact instanceof Blob) || source.artifact.size <= 0) {
      throw new ReceizArtifactError("artifact_not_sdk_issued");
    }
    const sourceBytes = new Uint8Array(await source.artifact.arrayBuffer());
    if (await sha256ReceizBytes(sourceBytes) !== source.artifactSha256) {
      throw new ReceizArtifactError("artifact_verification_failed");
    }
    const sourceFile = new File([arrayBufferCopy(sourceBytes)], source.filename, {
      type: source.mimeType,
    });
    const form = new FormData();
    form.set("artifact", sourceFile);
    const headers = new Headers({ accept: "application/vnd.receiz.bundle+json, application/octet-stream" });
    if (this.accessToken) headers.set("authorization", `Bearer ${this.accessToken}`);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/receiz/ownership/bearer-claim`, {
        method: "POST",
        headers,
        body: form,
      });
    } catch {
      throw new ReceizArtifactError("artifact_ownership_failed");
    }
    if (!response.ok) {
      const payload = await readPayload(response).catch(() => null);
      const code = isRecord(payload) && typeof payload.error === "string" ? payload.error : "";
      if (code === "custody_conflict") throw new ReceizArtifactError("artifact_custody_conflict");
      if (code.includes("record")) throw new ReceizArtifactError("artifact_record_failed");
      if (code.includes("seal")) throw new ReceizArtifactError("artifact_seal_failed");
      if (code.includes("proof") || code.includes("artifact")) {
        throw new ReceizArtifactError("artifact_verification_failed");
      }
      throw new ReceizArtifactError("artifact_ownership_failed");
    }

    const ownerReceizId = response.headers.get("x-receiz-owner")?.trim() ?? "";
    const recordId = response.headers.get("x-receiz-record-id")?.trim() ?? "";
    const claimId = response.headers.get("x-receiz-claim-id")?.trim() ?? "";
    const verifyPath = canonicalVerifyPath(response.headers.get("x-receiz-verify-path"));
    const carrier = response.headers.get("x-receiz-continuity")?.trim() ?? "";
    const signatureVersion = response.headers.get("x-receiz-signature-version")?.trim() ?? "";
    const filename = filenameFromContentDisposition(response.headers.get("content-disposition"));
    const mimeType = mimeTypeFromResponse(response.headers.get("content-type"));
    if (carrier !== "native-record-seal" || !filename || !mimeType) {
      throw new ReceizArtifactError("artifact_ownership_failed");
    }
    if (!ownerReceizId.endsWith(".receiz.id") || !recordId) {
      throw new ReceizArtifactError("artifact_owner_mismatch");
    }
    if (!claimId || !verifyPath) throw new ReceizArtifactError("artifact_claim_mismatch");
    if (signatureVersion !== "4") throw new ReceizArtifactError("artifact_signature_v4_required");

    const artifactBytes = new Uint8Array(await response.arrayBuffer());
    if (!artifactBytes.byteLength) throw new ReceizArtifactError("artifact_ownership_failed");
    const artifact = new File([arrayBufferCopy(artifactBytes)], filename, { type: mimeType });
    let verificationResponse: DocumentVerifyResponse;
    try {
      verificationResponse = await this.verifyArtifactDuringIssuance(artifact);
    } catch {
      throw new ReceizArtifactError("artifact_verification_failed");
    }
    const verification = snapshotSuccessfulArtifactVerification(verificationResponse);
    const nativeRecordSeal = isRecord(verification.bundle.nativeRecordSeal)
      ? verification.bundle.nativeRecordSeal
      : null;
    const payload = nativeRecordSeal && isRecord(nativeRecordSeal.payload)
      ? nativeRecordSeal.payload
      : null;
    const payloadSha256 = payload && typeof payload.sha256 === "string" ? payload.sha256 : "";
    const payloadFilename = payload && typeof payload.filename === "string" ? payload.filename : "";
    const payloadMimeType = payload && typeof payload.mimeType === "string" ? payload.mimeType : "";
    const assetContinuity = isRecord(verification.assetContinuity)
      ? verification.assetContinuity
      : null;
    const signedOwnershipContinuity = nativeRecordSeal && isRecord(nativeRecordSeal.ownershipContinuity)
      ? nativeRecordSeal.ownershipContinuity
      : null;
    const continuityArtifactId = assetContinuity && typeof assetContinuity.artifactId === "string"
      ? assetContinuity.artifactId
      : "";
    const continuityNamespace = assetContinuity && typeof assetContinuity.namespace === "string"
      ? assetContinuity.namespace
      : "";
    const continuityGenesisOwner = assetContinuity && typeof assetContinuity.genesisOwnerReceizId === "string"
      ? assetContinuity.genesisOwnerReceizId
      : "";
    const continuityHistoryDigest = assetContinuity && typeof assetContinuity.historyDigestSha256 === "string"
      ? assetContinuity.historyDigestSha256
      : "";
    const continuityAppendCount = assetContinuity?.appendCount;
    if (
      !assetContinuity
      || assetContinuity.state !== "verified"
      || assetContinuity.carrier !== "portable_asset"
      || assetContinuity.ownerReceizId !== ownerReceizId
      || assetContinuity.headReference !== claimId
      || !/^[0-9a-f]{64}$/.test(continuityArtifactId)
      || !continuityNamespace
      || !continuityGenesisOwner.endsWith(".receiz.id")
      || !/^[0-9a-f]{64}$/.test(continuityHistoryDigest)
      || !Number.isSafeInteger(continuityAppendCount)
      || Number(continuityAppendCount) < 1
      || !signedOwnershipContinuity
      || signedOwnershipContinuity.schema !== "receiz.native_ownership_continuity.v1"
      || signedOwnershipContinuity.artifactId !== continuityArtifactId
      || signedOwnershipContinuity.namespace !== continuityNamespace
      || signedOwnershipContinuity.genesisOwnerReceizId !== continuityGenesisOwner
      || signedOwnershipContinuity.ownerReceizId !== ownerReceizId
      || signedOwnershipContinuity.headReference !== claimId
      || signedOwnershipContinuity.historyDigestSha256 !== continuityHistoryDigest
      || signedOwnershipContinuity.appendCount !== continuityAppendCount
    ) {
      throw new ReceizArtifactError("artifact_verification_failed");
    }

    return issueCurrentNativeArtifact({
      artifact,
      filename,
      mimeType,
      artifactSha256: await sha256ReceizBytes(artifactBytes),
      payloadSha256,
      payloadFilename,
      payloadMimeType,
      verification: verification as unknown as DocumentVerifyResponse,
      continuity: {
        carrier: "native-record-seal",
        ownerReceizId,
        recordId,
        claimId,
        verifyPath,
        signatureVersion: 4,
      },
    });
  }

  private async admitArtifact(
    verification: ReceizArtifactVerificationResult,
    options: ReceizArtifactAdmissionOptions,
  ): Promise<ReceizArtifactAdmissionResult> {
    return createReceizArtifactAdmissionEngine()(verification, options);
  }

  private async verifyAndOpenArtifact(file: Blob): Promise<ReceizOpenedArtifact> {
    if (!(file instanceof Blob) || file.size <= 0) {
      throw new ReceizArtifactError("artifact_verification_failed");
    }
    const artifactBytes = new Uint8Array(await file.arrayBuffer());
    if (!artifactBytes.byteLength) throw new ReceizArtifactError("artifact_verification_failed");
    const artifactFilename = typeof File !== "undefined" && file instanceof File && file.name.trim()
      ? file.name.trim()
      : "artifact";
    const artifactMimeType = mimeTypeFromResponse(file.type || "application/octet-stream")
      ?? "application/octet-stream";
    const preservedArtifact = new File([arrayBufferCopy(artifactBytes)], artifactFilename, {
      type: artifactMimeType,
    });
    const artifactSha256 = await sha256ReceizBytes(artifactBytes);

    const localOpen = await verifyAndExtractReceizDocumentBytesLocal({
      fileBytes: artifactBytes,
      filename: artifactFilename,
      mimeType: artifactMimeType,
    });
    if (!localOpen.ok) {
      throw new ReceizArtifactError("artifact_verification_failed");
    }

    const verifiedResponse = localOpen.verification as DocumentVerifyResponse;
    const verification = snapshotSuccessfulArtifactVerification(verifiedResponse);
    const bundle = verification.bundle;
    const nativeRecordSeal = isRecord(bundle.nativeRecordSeal) ? bundle.nativeRecordSeal : null;
    const isCurrentNative = nativeRecordSeal !== null;
    const assetContinuity = isRecord(verification.assetContinuity) ? verification.assetContinuity : null;
    if (!isCurrentNative && (!assetContinuity || assetContinuity.state !== "verified")) {
      throw new ReceizArtifactError("artifact_owner_mismatch");
    }
    const payloadFilename = localOpen.payloadFilename;
    const payloadMimeType = mimeTypeFromResponse(localOpen.payloadMimeType);
    if (!payloadFilename || !payloadMimeType) throw new ReceizArtifactError("artifact_extraction_failed");
    const payloadBytes = new Uint8Array(localOpen.payloadBytes);
    const payloadSha256 = await sha256ReceizBytes(payloadBytes);
    if (bundle.artifactSha256Basis !== payloadSha256) {
      throw new ReceizArtifactError("artifact_payload_binding_mismatch");
    }
    const claimId = typeof bundle.receizClaimId === "string" ? bundle.receizClaimId : "";
    const verifyPath = canonicalVerifyPath(typeof bundle.verifyPath === "string" ? bundle.verifyPath : null);
    if (!claimId || !verifyPath) {
      throw new ReceizArtifactError("artifact_claim_mismatch");
    }

    let sealedArtifact: ReceizOpenedArtifact["sealedArtifact"];
    let legacyCompatibility: ReceizOpenedArtifact["legacyCompatibility"];
    if (isCurrentNative) {
      const nativePayload = isRecord(nativeRecordSeal.payload) ? nativeRecordSeal.payload : null;
      const nativeOwner = typeof nativeRecordSeal.ownerReceizId === "string" ? nativeRecordSeal.ownerReceizId : "";
      const nativeRecordId = typeof nativeRecordSeal.recordId === "string" ? nativeRecordSeal.recordId : "";
      if (!nativeOwner || !nativeRecordId) {
        throw new ReceizArtifactError("artifact_owner_mismatch");
      }
      if (
        !nativePayload
        || nativePayload.sha256 !== payloadSha256
        || nativePayload.filename !== payloadFilename
        || mimeTypeFromResponse(typeof nativePayload.mimeType === "string" ? nativePayload.mimeType : null) !== payloadMimeType
      ) {
        throw new ReceizArtifactError("artifact_payload_binding_mismatch");
      }
      sealedArtifact = issueCurrentNativeArtifact({
        artifact: preservedArtifact,
        filename: artifactFilename,
        mimeType: artifactMimeType,
        artifactSha256,
        payloadSha256,
        payloadFilename,
        payloadMimeType,
        verification: verification as unknown as DocumentVerifyResponse,
        continuity: {
          carrier: "native-record-seal",
          ownerReceizId: nativeOwner,
          recordId: nativeRecordId,
          claimId,
          verifyPath,
          signatureVersion: 4,
        },
      });
      legacyCompatibility = "current-native";
    } else {
      const legacyOwner = typeof assetContinuity?.ownerReceizId === "string"
        ? assetContinuity.ownerReceizId
        : "";
      if (!legacyOwner) {
        throw new ReceizArtifactError("artifact_owner_mismatch");
      }
      sealedArtifact = issueVerifiedLegacyArtifact({
        artifact: preservedArtifact,
        filename: artifactFilename,
        mimeType: artifactMimeType,
        artifactSha256,
        payloadSha256,
        verification: verification as unknown as DocumentVerifyResponse,
        continuity: {
          carrier: "verified-legacy-read",
          ownerReceizId: legacyOwner,
          claimId,
          verifyPath,
          signatureVersion: 4,
        },
      });
      legacyCompatibility = "verified-legacy-read";
    }

    const verifiedPayload = issueVerifiedPayload({
      bytes: payloadBytes,
      filename: payloadFilename,
      mimeType: payloadMimeType,
      sha256: payloadSha256,
    });
    return Object.freeze({
      sealedArtifact,
      verifiedPayload,
      verification: sealedArtifact.verification as unknown as DocumentVerifyResponse,
      legacyCompatibility,
    });
  }

  async publicWalletLedger(query: { limit?: number; cursor?: string; since?: string } = {}): Promise<WalletLedgerFeed> {
    return this.request<WalletLedgerFeed>(appendQuery("/api/wallet/ledger/public", query));
  }

  async observePublicProof(body: PublicProofObserveRequest): Promise<ReceizPublicProjectionRecord> {
    // Current observer admission names sourceUrl. Retain the original SDK url
    // spelling as a transport alias, beneath the same current route validator.
    const response = await this.request<PublicProofTransportRecord>("/api/public-proof/observe", {
      method: "POST", body: { ...body, sourceUrl: body.sourceUrl ?? body.url },
    });
    // The current route returns { ok, record, created }; historical compatible
    // hosts returned the record directly. Both remain projection-only.
    if (typeof response.ok === "boolean" && isRecord(response.record)) {
      return projectPublicProofTransportRecord({ ...response.record,
        ok: response.ok, ...(response.created !== undefined ? { created: response.created } : {}) });
    }
    return projectPublicProofTransportRecord(response);
  }

  async readPublicProofByUrl(url: string): Promise<ReceizPublicProjectionRecord> {
    const record = await this.request<PublicProofTransportRecord>(appendQuery("/api/public-proof/by-url", { url }));
    return projectPublicProofTransportRecord(record);
  }

  async readPublicProofById(id: string): Promise<ReceizPublicProjectionRecord> {
    const record = await this.request<PublicProofTransportRecord>(`/api/public-proof/${encodePathSegment(id)}`);
    return projectPublicProofTransportRecord(record);
  }

  async readPublicProofByCreator(externalCreatorId: string): Promise<Readonly<{
    ok: boolean;
    records: readonly ReceizPublicProjectionRecord[];
  }>> {
    const response = await this.request<{ ok: boolean; records: PublicProofTransportRecord[] }>(
      `/api/public-proof/creator/${encodePathSegment(externalCreatorId)}`,
    );
    return Object.freeze({
      ok: response.ok,
      records: Object.freeze(response.records.map((record) => projectPublicProofTransportRecord(record))),
    });
  }

  async inspectCapabilities(options: ReceizCapabilitiesOptions = {}): Promise<ReceizCapabilities> {
    const tenantHost = options.tenantHost ? normalizeReceizHost(options.tenantHost) : undefined;
    const scopes = options.scopes ?? [];
    const delegatedAvailable = Boolean(this.accessToken);
    const configured = (available: boolean, reason?: string, requirements?: ReceizCapabilityRequirements): ReceizCapability => ({
      available,
      status: available ? "available" : "missing",
      ...(reason ? { reason } : {}),
      ...(!available ? { fixUrl: `${this.baseUrl}/developers` } : {}),
      ...(requirements ? { requirements } : {}),
    });
    const historical = (available: boolean, reason?: string, requirements?: ReceizCapabilityRequirements): ReceizCapability => configured(
      this.httpTransport.legacyConnectHttp && available,
      `Historical Connect rail requires legacyConnectTransport: http and an explicit compatibility host. ${reason ?? ""}`, requirements,
    );
    const tenantAndBearer = { tenantHost: true, accessToken: true } satisfies ReceizCapabilityRequirements;
    return {
      ok: true,
      schema: "receiz.sdk.capabilities.v1",
      baseUrl: this.baseUrl,
      ...(tenantHost ? { tenantHost } : {}),
      scopes,
      capabilities: {
        identity: configured(true),
        wallet: configured(delegatedAvailable, "Connect bearer token required for wallet reads."),
        payments: configured(delegatedAvailable, "Connect bearer token required for checkout/session routes."),
        notes: configured(delegatedAvailable, "Connect bearer token required for note reads, issuance, and claims."),
        proofStore: configured(true),
        media: historical(delegatedAvailable, "Connect bearer token required for media uploads."),
        domains: historical(Boolean(tenantHost), "tenantHost is required for tenant domain helpers."),
        twin: configured(delegatedAvailable, "Connect bearer token required for Twin routes."),
        world: configured(delegatedAvailable, "Connect bearer token required for World write routes."),
        commerce: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for commerce helpers."),
        rewards: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for reward routes."),
        customers: historical(
          delegatedAvailable && Boolean(tenantHost),
          "Connect bearer token and tenantHost are required for customer sessions.",
          tenantAndBearer,
        ),
        merchants: historical(
          delegatedAvailable && Boolean(tenantHost),
          "Connect bearer token and tenantHost are required for merchant rails.",
          tenantAndBearer,
        ),
        events: historical(delegatedAvailable, "Connect bearer token required for event subscriptions."),
        search: historical(delegatedAvailable, "Connect bearer token required for private proof search."),
        permissions: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for tenant permissions."),
        jobs: historical(delegatedAvailable, "Connect bearer token required for durable jobs."),
        audit: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for sealed tenant audit events."),
        risk: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for risk signals."),
        compliance: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for compliance exports."),
        portability: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for store portability."),
        notifications: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for notifications."),
        webhooks: configured(delegatedAvailable, "Connect bearer token or active Receiz session required for webhook endpoint management."),
        offline: configured(true),
        coordination: configured(
          delegatedAvailable && Boolean(tenantHost),
          "Connect bearer token and tenantHost are required to coordinate one named domain; Identity Seal capability remains separate authorization.",
          tenantAndBearer,
        ),
        releases: historical(delegatedAvailable && Boolean(tenantHost), "Connect bearer token and tenantHost are required for release rail pinning."),
        subjects: configured(delegatedAvailable, "A delegated subject read/write scope is required for private living-subject state."),
        subjectTwin: configured(delegatedAvailable, "A delegated subject Twin scope is required for private mind and conversation access."),
        subjectMemory: configured(delegatedAvailable, "A delegated subject memory scope is required; ownership alone does not expose private memory."),
        subjectMandates: configured(delegatedAvailable, "A delegated mandate scope and exact owner capability are required for mandate changes."),
        worldEvents: configured(delegatedAvailable, "A delegated world-events scope is required for non-public event histories."),
        worldCommands: configured(delegatedAvailable, "A delegated world-command scope plus exact heads and authority are required for admission."),
        subjectRuntime: configured(delegatedAvailable, "A delegated subject-runtime scope plus an active bounded mandate are required."),
        subjectRelationships: configured(delegatedAvailable, "A delegated relationship scope and mutual atomic admission are required."),
        subjectInventory: configured(delegatedAvailable, "A delegated inventory scope and command admission are required for mutation."),
        lawfulActions: configured(delegatedAvailable, "A delegated lawful-action scope and sealed law/action proof object are required; the bearer is not proof authority."),
      },
    };
  }

  async runDoctor(options: ReceizCapabilitiesOptions = {}): Promise<ReceizDoctorReport> {
    const capabilities = await this.inspectCapabilities(options);
    const missing: ReceizDoctorIssue[] = [];
    const warnings: ReceizDoctorIssue[] = [];
    const fixes: ReceizDoctorIssue[] = [];
    if (!this.accessToken) {
      missing.push({
        code: "missing_access_token",
        message: "Create the Receiz client with a delegated Connect/OIDC bearer token before using wallet, media, commerce, events, domains, or jobs.",
        fixUrl: `${this.baseUrl}/developers/connect`,
      });
    }
    if (!options.tenantHost) {
      warnings.push({
        code: "missing_tenant_host",
        message: "Pass tenantHost so app-state, commerce, domain, permission, and customer-session helpers can scope correctly.",
        fixUrl: `${this.baseUrl}/developers/app-state`,
      });
    }
    if (!options.callbackUrl) {
      warnings.push({
        code: "missing_callback_url",
        message: "Pass callbackUrl to verify your Connect/OIDC redirect configuration before users hit the authorize screen.",
        fixUrl: `${this.baseUrl}/developers/connect`,
      });
    }
    const scopes = new Set(options.scopes ?? []);
    for (const requiredScope of ["openid", "profile", "receiz:record"]) {
      if (!scopes.has(requiredScope)) {
        warnings.push({
          code: "missing_scope",
          message: `Recommended scope missing: ${requiredScope}.`,
          fixUrl: `${this.baseUrl}/developers/apps`,
        });
      }
    }
    fixes.push(...missing, ...warnings);
    return {
      ok: missing.length === 0,
      schema: "receiz.sdk.doctor.v1",
      baseUrl: this.baseUrl,
      ...(capabilities.tenantHost ? { tenantHost: capabilities.tenantHost } : {}),
      capabilities: capabilities.capabilities,
      missing,
      warnings,
      fixes,
    };
  }

  async publishAppState(
    feed: ReceizAppStateFeed,
    options: { signature?: string; idempotencyKey?: string } = {},
  ): Promise<ReceizAppStateFeedResponse> {
    const requestOptions: RequestOptions = {
      method: "POST",
      body: feed,
      headers: headersWithIdempotency(undefined, options.idempotencyKey),
    };
    if (options.signature) {
      const headers = headersWithIdempotency(requestOptions.headers, options.idempotencyKey);
      headers.set("x-public-proof-feed-signature", options.signature);
      requestOptions.headers = headers;
    }
    return this.request<ReceizAppStateFeedResponse>("/api/public-proof/registry/feed", requestOptions);
  }

  async publishAppStateInput(
    input: ReceizAppStatePublishInput,
    options: { signature?: string; idempotencyKey?: string } = {},
  ): Promise<ReceizAppStateFeedResponse> {
    if (isReceizAppStateFeed(input)) {
      return this.publishAppState(input, options);
    }
    const record = createReceizTenantAppStateRecord(input);
    const publishOptions: { signature?: string; idempotencyKey?: string } = {};
    if (options.signature) publishOptions.signature = options.signature;
    const idempotencyKey = options.idempotencyKey ?? input.idempotencyKey;
    if (idempotencyKey) publishOptions.idempotencyKey = idempotencyKey;
    const feedOptions: ReceizAppStateFeedOptions = { schema: RECEIZ_PUBLIC_STORE_STATE_FEED_SCHEMA };
    if (record.namespace) feedOptions.namespace = record.namespace;
    if (record.externalCreatorId) feedOptions.externalCreatorId = record.externalCreatorId;
    return this.publishAppState(createReceizAppStateFeed([record], feedOptions), publishOptions);
  }

  async publishAppStateRecord(
    record: ReceizAppStateRecord | ReceizAppStateRecordInput,
    options: ReceizAppStatePublishRecordOptions = {},
  ): Promise<ReceizAppStateFeedResponse> {
    const feed = createReceizAppStateFeed([record], {
      schema: options.feedSchema ?? RECEIZ_APP_STATE_FEED_SCHEMA,
      ...(options.namespace ? { namespace: options.namespace } : {}),
      ...(options.externalCreatorId ? { externalCreatorId: options.externalCreatorId } : {}),
    });
    return this.publishAppState(feed, options.signature ? { signature: options.signature } : {});
  }

  async readAppStateByUrl(url: string): Promise<ReceizAppStateRecordResponse> {
    return this.request<ReceizAppStateRecordResponse>(appendQuery("/api/public-proof/by-url", { url }));
  }

  async readAppStateByHost(host: string): Promise<ReceizAppStateRecordResponse> {
    return this.readAppStateByUrl(receizAppStateUrlFromHost(host));
  }

  async readAppStateByCreator(receizId: string): Promise<ReceizAppStateCollectionResponse> {
    return this.request<ReceizAppStateCollectionResponse>(`/api/public-proof/creator/${encodePathSegment(receizId)}`);
  }

  async readAppStateByNamespace(namespace: string): Promise<ReceizAppStateCollectionResponse> {
    return this.request<ReceizAppStateCollectionResponse>(`/api/public-proof/namespace/${encodePathSegment(namespace)}`);
  }

  async readAppStateById(id: string): Promise<ReceizAppStateRecordResponse> {
    return this.request<ReceizAppStateRecordResponse>(`/api/public-proof/${encodePathSegment(id)}`);
  }

  async restoreAppStateByUrl<TData extends JsonObject = JsonObject>(
    url: string,
    options: ReceizAppStateRestoreOptions = {},
  ): Promise<ReceizAppStateRestoreResult<TData>> {
    const response = await this.readAppStateByUrl(url);
    return restoreReceizAppStateProjection<TData>(response as ReceizAppStateRecordResponse<TData>, options);
  }

  async restoreAppStateByHost<TData extends JsonObject = JsonObject>(
    host: string,
    options: ReceizAppStateRestoreOptions = {},
  ): Promise<ReceizAppStateRestoreResult<TData>> {
    return this.restoreAppStateByUrl<TData>(receizAppStateUrlFromHost(host), options);
  }

  async restoreAppStateById<TData extends JsonObject = JsonObject>(
    id: string,
    options: ReceizAppStateRestoreOptions = {},
  ): Promise<ReceizAppStateRestoreResult<TData>> {
    try {
      const response = await this.readAppStateById(id);
      return restoreReceizAppStateProjection<TData>(response as ReceizAppStateRecordResponse<TData>, options);
    } catch (error) {
      if (error instanceof ReceizHttpError && error.status === 404) {
        return {
          ok: false,
          record: null,
          data: null,
          error: "app_state_not_found",
        };
      }
      throw error;
    }
  }

  async resolveAppState<TData extends JsonObject = JsonObject>(
    input: ReceizAppStateResolveInput,
  ): Promise<ReceizAppStateResolveResult<TData>> {
    const options: ReceizAppStateRestoreOptions = {
      ...(input.schema ? { schema: input.schema } : {}),
      ...(input.state ? { state: input.state } : {}),
      ...(input.requiredDataKey ? { requiredDataKey: input.requiredDataKey } : {}),
    };
    if (input.id) return this.restoreAppStateById<TData>(input.id, options);
    if (input.url) return this.restoreAppStateByUrl<TData>(input.url, options);
    if (input.host || input.tenantHost) return this.restoreAppStateByHost<TData>(input.host ?? input.tenantHost ?? "", options);
    if (input.namespace) {
      const response = await this.readAppStateByNamespace(input.namespace);
      const records = response.records.map((record) => projectPublicProofTransportRecord(
        record as PublicProofTransportRecord<TData>,
      ));
      return { ok: response.ok, record: records[0] ?? null, data: null, records };
    }
    const creator = input.creatorReceizId ?? input.receizId;
    if (creator) {
      const response = await this.readAppStateByCreator(creator);
      const records = response.records.map((record) => projectPublicProofTransportRecord(
        record as PublicProofTransportRecord<TData>,
      ));
      return { ok: response.ok, record: records[0] ?? null, data: null, records };
    }
    throw new ReceizValidationError("receiz.appState.resolve", ["id, url, host, tenantHost, namespace, creatorReceizId, or receizId is required"]);
  }

  async publishPublicStore<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStorePublishInput<TState>,
    options: ReceizIdempotencyOptions = {},
  ): Promise<ReceizAppStateFeedResponse> {
    const { feed } = createReceizPublicStorePublishFeed({
      ...input,
      storeStateRecord: input.state,
    });
    const publishOptions: { idempotencyKey?: string } = {};
    const idempotencyKey = options.idempotencyKey ?? input.idempotencyKey;
    if (idempotencyKey) publishOptions.idempotencyKey = idempotencyKey;
    return this.publishAppState(feed, publishOptions);
  }

  async signPublicStorePublish<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStoreSignedPublishInput<TState>,
  ): Promise<ReceizPublicStoreSignedPublish<TState>> {
    const { tenantHost, feed } = createReceizPublicStorePublishFeed(input);
    const feedDigestSha256Hex = await sha256HexFromText(canonicalJsonString(feed));
    const challenge: JsonObject = {
      schema: RECEIZ_PUBLIC_STORE_PUBLISH_CHALLENGE_SCHEMA,
      tenantHost,
      merchantReceizId: input.merchantReceizId,
      feedDigestSha256Hex,
      feed,
    };
    const signed = await signReceizIdentityLoginProof({
      keyFile: input.keyFile,
      challengeText: canonicalJsonString(challenge),
      passphrase: input.passphrase,
    });
    return {
      schema: RECEIZ_PUBLIC_STORE_SIGNED_PUBLISH_SCHEMA,
      tenantHost,
      merchantReceizId: input.merchantReceizId,
      feed,
      storeStateRecord: input.storeStateRecord,
      identityProof: {
        schema: RECEIZ_PUBLIC_STORE_PUBLISH_PROOF_SCHEMA,
        keyId: signed.keyId,
        alg: signed.alg,
        publicKeyRawB64u: input.keyFile.crypto.publicKeyRawB64u,
        challenge,
        challengeB64Url: signed.challengeB64Url,
        signatureB64Url: signed.signatureB64Url,
        signedAt: new Date().toISOString(),
        tenantHost,
        merchantReceizId: input.merchantReceizId,
        feedDigestSha256Hex,
      },
    };
  }

  async publishSignedPublicStore<TState extends JsonObject = JsonObject>(
    signed: ReceizPublicStoreSignedPublish<TState>,
    options: ReceizIdempotencyOptions = {},
  ): Promise<ReceizPublicStoreAppendResult> {
    const headers = new Headers();
    const idempotencyKey = options.idempotencyKey;
    if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
    return this.request<ReceizPublicStoreAppendResult>("/api/public-proof/registry/feed", {
      method: "POST",
      body: signed as unknown as JsonObject,
      headers,
      bearerToken: null,
    });
  }

  async publishPublicStoreWithIdentityProof<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStoreSignedPublishInput<TState>,
    options: ReceizIdempotencyOptions = {},
  ): Promise<ReceizPublicStoreAppendResult> {
    const signed = await this.signPublicStorePublish(input);
    const idempotencyKey = options.idempotencyKey ?? input.idempotencyKey;
    return this.publishSignedPublicStore(signed, idempotencyKey ? { idempotencyKey } : {});
  }

  async assertPublicStoreSignedPublishContract<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStoreSignedPublishInput<TState>,
  ): Promise<ReceizPublicStoreSignedPublishContractResult> {
    const signed = await this.signPublicStorePublish(input);
    const feedDigestSha256Hex = await sha256HexFromText(canonicalJsonString(signed.feed));
    const challenge = JSON.parse(new TextDecoder().decode(base64UrlDecodeToBytes(signed.identityProof.challengeB64Url))) as JsonObject;
    if (challenge.schema !== RECEIZ_PUBLIC_STORE_PUBLISH_CHALLENGE_SCHEMA) throw new ReceizValidationError("receiz.publicStore.assertSignedPublishContract", ["invalid challenge schema"]);
    if (challenge.tenantHost !== signed.tenantHost) throw new ReceizValidationError("receiz.publicStore.assertSignedPublishContract", ["tenantHost mismatch"]);
    if (challenge.merchantReceizId !== signed.merchantReceizId) throw new ReceizValidationError("receiz.publicStore.assertSignedPublishContract", ["merchantReceizId mismatch"]);
    if (challenge.feedDigestSha256Hex !== feedDigestSha256Hex) throw new ReceizValidationError("receiz.publicStore.assertSignedPublishContract", ["feed digest mismatch"]);
    const signatureOk = await verifyReceizIdentityLoginProof({
      keyFile: input.keyFile,
      challengeB64Url: signed.identityProof.challengeB64Url,
      signatureB64Url: signed.identityProof.signatureB64Url,
    });
    if (!signatureOk) throw new ReceizValidationError("receiz.publicStore.assertSignedPublishContract", ["identity proof signature invalid"]);
    return {
      ok: true,
      schema: "receiz.sdk.public_store.signed_publish_contract.v1",
      tenantHost: signed.tenantHost,
      merchantReceizId: signed.merchantReceizId,
      feedDigestSha256Hex,
      keyId: signed.identityProof.keyId,
    };
  }

  async resolvePublicStore<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStoreResolveInput,
  ): Promise<ReceizPublicStoreResolveResult<TState>> {
    const options: ReceizAppStateRestoreOptions = {
      schema: RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA,
      state: "published",
      requiredDataKey: "storeStateRecord",
    };
    let restored: ReceizAppStateRestoreResult<{ storeStateRecord: TState }>;
    if (input.id) {
      restored = await this.restoreAppStateById<{ storeStateRecord: TState }>(input.id, options);
    } else if (input.url) {
      restored = await this.restoreAppStateByUrl<{ storeStateRecord: TState }>(input.url, options);
    } else {
      const host = input.host ?? input.tenantHost;
      if (!host) throw new ReceizValidationError("receiz.publicStore.resolve", ["host, tenantHost, url, or id is required"]);
      restored = await this.restoreAppStateByHost<{ storeStateRecord: TState }>(host, options);
    }
    const storeStateRecord = restored.data?.storeStateRecord ?? null;
    return {
      ...restored,
      state: storeStateRecord,
      storeStateRecord,
    };
  }

  async restoreLatestPublicStore<TState extends JsonObject = JsonObject>(
    input: ReceizPublicStoreRestoreLatestInput,
  ): Promise<ReceizPublicStoreResolveResult<TState>> {
    const restored = await this.resolvePublicStore<TState>(input);
    const requiredSchema = input.requiredSchema?.trim();
    if (requiredSchema && restored.storeStateRecord?.schema !== requiredSchema) {
      return {
        ok: false,
        record: restored.record,
        data: restored.data,
        state: null,
        storeStateRecord: null,
        error: "public_store_schema_mismatch",
      };
    }
    return restored;
  }

  async syncProofMemoryAdditions(input: ReceizProofMemorySyncInput): Promise<ReceizProofMemorySyncResult> {
    const knownHead = input.memory.knownHead(input.limit);
    const batch = await input.fetchAdditions(knownHead);
    let admitted = 0;
    for (const addition of proofMemoryAdditionValues(batch)) {
      admitProofMemoryAddition(input.memory, addition);
      admitted += 1;
    }
    await input.memory.flush();
    return {
      ok: true,
      schema: "receiz.sdk.proof_memory.sync.v1",
      knownHead,
      admitted,
      snapshot: input.memory.snapshot(),
    };
  }

  async resolveLocalFirstSurface<TValue>(
    surface: string,
    input: ReceizLocalFirstInput<TValue>,
  ): Promise<ReceizLocalFirstResult<TValue>> {
    const local = input.local ?? null;
    const snapshot = input.memory?.snapshot() ?? null;
    const knownHead = input.memory ? input.memory.knownHead(input.limit) : null;
    const sync = input.memory && input.sync
      ? this.syncProofMemoryAdditions({
          memory: input.memory,
          fetchAdditions: input.sync,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
        })
      : null;

    if (local !== null) {
      return {
        ok: true,
        schema: "receiz.sdk.local_first.v1",
        surface,
        source: "local",
        value: local,
        local,
        knownHead,
        snapshot,
        sync,
      };
    }

    const remote = input.remote ? await input.remote() : null;
    return {
      ok: true,
      schema: "receiz.sdk.local_first.v1",
      surface,
      source: remote !== null ? "remote" : "empty",
      value: remote,
      local,
      knownHead,
      snapshot,
      sync,
    };
  }

  async runtimeLocalFirst(input: ReceizRuntimeLocalFirstInput = {}): Promise<ReceizRuntimeLocalFirstResult> {
    const memoryOptions: ReceizProofMemoryOptions = {
      ...(input.ownerId === undefined ? {} : { ownerId: input.ownerId }),
      ...(input.storage === undefined ? {} : { storage: input.storage }),
    };
    const memory = await createReceizProofMemory(memoryOptions);
    for (const proofObject of input.seed ?? []) memory.admit(proofObject);
    await memory.flush();
    const knownHead = memory.knownHead(input.limit);
    const sync = input.sync
      ? this.syncProofMemoryAdditions({
          memory,
          fetchAdditions: input.sync,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
        })
      : null;
    return {
      ok: true,
      schema: "receiz.sdk.runtime.local_first.v1",
      memory,
      snapshot: memory.snapshot(),
      knownHead,
      sync,
    };
  }

  async bootstrapCustomerSession(
    body: ReceizCustomerSessionBootstrapRequest,
    options: ReceizIdempotencyOptions = {},
  ): Promise<ReceizCustomerSessionBootstrapResponse> {
    const tenantHost = normalizeReceizHost(body.tenantHost);
    const requestBody: ReceizCustomerSessionRequest = {
      ...body,
      tenantHost,
    };
    const session = await this.delegatedWrite<JsonObject>("/api/connect/customers/session", requestBody, options);
    const wallet = body.includeWallet === false ? null : await this.delegated<JsonObject>("/api/connect/wallet/me");
    const customer = body.includeCustomer === false ? null : await this.delegatedWrite<JsonObject>("/api/connect/customers/portal", requestBody);
    const permissions =
      body.includePermissions === false
        ? null
        : await this.delegated<JsonObject>(appendQuery("/api/connect/permissions/roles", { tenantHost }));
    return {
      ok: true,
      schema: "receiz.sdk.customer_session.bootstrap.v1",
      tenantHost,
      session,
      wallet,
      customer,
      permissions,
    };
  }

  async oneClickCheckout(body: ReceizOneClickCheckoutRequest): Promise<ReceizOneClickCheckoutResponse> {
    const tenantHost = normalizeReceizHost(body.tenantHost);
    const totalUsdCents = usdToCents(body.amountUsd);
    const walletFirst = body.walletFirst !== false;
    const cardFallback = body.cardFallback !== false;
    const wallet = walletFirst ? await this.delegated<ConnectWalletResponse>("/api/connect/wallet/me") : null;
    const walletAvailable = walletFirst ? stringToCents(wallet?.balanceUsdCents) : 0n;
    const proposedWalletUse = walletFirst ? (walletAvailable > totalUsdCents ? totalUsdCents : walletAvailable) : 0n;
    // A wallet read is not a settlement. This compatibility request has no
    // admitted recipient, exact settlement basis or execution receipt, so it
    // cannot reduce a card charge by an amount that has never been committed.
    const walletApplied = 0n;
    if (proposedWalletUse > 0n) {
      return {
        ok: false, tenantHost, ...(body.orderId ? { orderId: body.orderId } : {}),
        funding: {
          totalUsdCents: String(totalUsdCents), walletAppliedUsdCents: "0",
          cardDeltaUsdCents: String(totalUsdCents), walletFirst, cardFallback,
        },
        wallet, checkoutSession: null, proofObject: null,
        events: [{ type: "wallet.summary.read", walletAppliedUsdCents: "0" }],
        error: "wallet_settlement_execution_required",
      };
    }
    const cardDelta = totalUsdCents - walletApplied;
    let checkoutSession: CheckoutSessionResponse | null = null;

    if (cardDelta > 0n) {
      if (!cardFallback) {
        const response: ReceizOneClickCheckoutResponse = {
          ok: false,
          tenantHost,
          funding: {
            totalUsdCents: String(totalUsdCents),
            walletAppliedUsdCents: String(walletApplied),
            cardDeltaUsdCents: String(cardDelta),
            walletFirst,
            cardFallback,
          },
          wallet,
          checkoutSession: null,
          proofObject: null,
          events: [{ type: "checkout.card_delta_required", cardDeltaUsdCents: String(cardDelta) }],
          error: "card_delta_required",
        };
        if (body.orderId) response.orderId = body.orderId;
        return response;
      }
      const checkoutBody: CheckoutRequest = {
        amountUsd: centsToUsd(cardDelta),
        currency: body.currency ?? "usd",
        uiMode: "embedded",
        description: `Receiz one-click checkout for ${tenantHost}`,
        tenantHost,
      };
      if (body.orderId) checkoutBody.referenceId = body.orderId;
      if (body.customerEmail) checkoutBody.customerEmail = body.customerEmail;
      if (body.successUrl) checkoutBody.successUrl = body.successUrl;
      if (body.cancelUrl) checkoutBody.cancelUrl = body.cancelUrl;
      if (body.cart) checkoutBody.cart = body.cart;
      checkoutSession = await this.delegated<CheckoutSessionResponse>("/api/connect/payments/checkout", {
        method: "POST",
        body: bodyWithIdempotency(checkoutBody, body.idempotencyKey),
        headers: headersWithIdempotency(undefined, body.idempotencyKey),
      });
    }

    const response: ReceizOneClickCheckoutResponse = {
      ok: true,
      tenantHost,
      funding: {
        totalUsdCents: String(totalUsdCents),
        walletAppliedUsdCents: String(walletApplied),
        cardDeltaUsdCents: String(cardDelta),
        walletFirst,
        cardFallback,
      },
      wallet,
      checkoutSession,
      proofObject: (checkoutSession?.proofBundle as JsonObject | undefined) ?? null,
      events: [
        ...(wallet ? [{ type: "wallet.summary.read", walletAppliedUsdCents: "0" }] : []),
        ...(checkoutSession ? [{ type: "checkout.session.created", checkoutSessionId: checkoutSession.checkoutSessionId ?? null }] : []),
      ],
    };
    if (body.orderId) response.orderId = body.orderId;
    return response;
  }

  async uploadMedia(file: Blob, options: ReceizMediaUploadOptions = {}): Promise<ReceizMediaUploadResponse> {
    const form = new FormData();
    form.set("file", file, options.filename ?? "receiz-media");
    if (options.tenantHost) form.set("tenantHost", normalizeReceizHost(options.tenantHost));
    if (options.purpose) form.set("purpose", options.purpose);
    if (options.metadata) form.set("metadata", JSON.stringify(options.metadata));
    if (options.idempotencyKey) form.set("idempotencyKey", options.idempotencyKey);
    return this.delegated<ReceizMediaUploadResponse>("/api/connect/media/upload", {
      method: "POST",
      body: form,
      headers: headersWithIdempotency(undefined, options.idempotencyKey),
    });
  }

  async eventSubscribe(body: ReceizEventSubscribeRequest): Promise<JsonObject> {
    return this.delegated<JsonObject>("/api/connect/events/subscribe", {
      method: "POST",
      body: bodyWithIdempotency(body, body.idempotencyKey),
      headers: headersWithIdempotency(undefined, body.idempotencyKey),
    });
  }

  async listWebhookEndpoints(): Promise<ReceizWebhookEndpointListResponse> {
    return this.request<ReceizWebhookEndpointListResponse>("/api/developers/webhooks");
  }

  async createWebhookEndpoint(body: ReceizWebhookEndpointCreateInput): Promise<ReceizWebhookEndpointCreateResponse> {
    return this.request<ReceizWebhookEndpointCreateResponse>("/api/developers/webhooks", {
      method: "POST",
      body: bodyWithIdempotency(body, body.idempotencyKey),
      headers: headersWithIdempotency(undefined, body.idempotencyKey),
    });
  }

  async updateWebhookEndpoint(
    endpointId: string,
    body: ReceizWebhookEndpointUpdateInput,
  ): Promise<ReceizWebhookEndpointMutationResponse> {
    return this.request<ReceizWebhookEndpointMutationResponse>(`/api/developers/webhooks/${encodePathSegment(endpointId)}`, {
      method: "PATCH",
      body: bodyWithIdempotency(body, body.idempotencyKey),
      headers: headersWithIdempotency(undefined, body.idempotencyKey),
    });
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<ReceizWebhookEndpointDeleteResponse> {
    return this.request<ReceizWebhookEndpointDeleteResponse>(`/api/developers/webhooks/${encodePathSegment(endpointId)}`, {
      method: "DELETE",
    });
  }

  async rotateWebhookEndpointSecret(endpointId: string): Promise<ReceizWebhookEndpointRotateResponse> {
    return this.request<ReceizWebhookEndpointRotateResponse>(
      `/api/developers/webhooks/${encodePathSegment(endpointId)}/rotate-secret`,
      { method: "POST" },
    );
  }

  async sendWebhookEndpointTest(
    endpointId: string,
    body: ReceizWebhookEndpointTestInput,
  ): Promise<ReceizWebhookEndpointTestResponse> {
    return this.request<ReceizWebhookEndpointTestResponse>(
      `/api/developers/webhooks/${encodePathSegment(endpointId)}/test-event`,
      {
        method: "POST",
        body: bodyWithIdempotency(body, body.idempotencyKey),
        headers: headersWithIdempotency(undefined, body.idempotencyKey),
      },
    );
  }

  async sportsConformance(): Promise<JsonObject> {
    return this.request<JsonObject>("/api/game/sports/conformance");
  }

  async signalCircuitConformance(): Promise<JsonObject> {
    return this.request<JsonObject>("/api/signal-circuit/conformance");
  }

  async delegated<T>(path: string, options: Omit<RequestOptions, "bearerToken"> = {}): Promise<T> {
    this.assertHistoricalConnectTransport(path);
    if (!this.accessToken) throw new Error("receiz_access_token_required");
    return this.request<T>(path, { ...options, bearerToken: this.accessToken });
  }

  private assertHistoricalConnectTransport(path: string): void {
    if (this.httpTransport.legacyConnectHttp) return;
    const pathname = new URL(path, this.baseUrl).pathname;
    for (const [method, support] of Object.entries(RECEIZ_HTTP_OPERATION_SUPPORT)) {
      if (support.executionMode !== "historical-http") continue;
      for (const route of support.routes) {
        if (route.routeFile !== null) continue;
        const expected = route.pathPattern.split("/");
        const actual = pathname.split("/");
        if (expected.length === actual.length && expected.every((segment, index) => segment === "[id]" ? Boolean(actual[index]) : segment === actual[index])) {
          throw new TypeError(`RECEIZ_HISTORICAL_CONNECT_HOST_REQUIRED:${method}`);
        }
      }
    }
  }

  private async delegatedWrite<T>(
    path: string,
    body: JsonObject = {},
    options: ReceizIdempotencyOptions = {},
  ): Promise<T> {
    const idempotencyKey = options.idempotencyKey ?? (typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined);
    return this.delegated<T>(path, {
      method: "POST",
      body: bodyWithIdempotency(body, idempotencyKey),
      headers: headersWithIdempotency(undefined, idempotencyKey),
    });
  }

  private async delegatedRecord(body: JsonObject): Promise<JsonObject | ReceizConnectRecordArtifactResponse> {
    // Match the route's explicit JSON-mode compatibility, including string
    // false/0. Default/true retains the complete artifact without text decoding.
    const mode = body.includeArtifact;
    if (mode === false || typeof mode === "string" && ["false", "0"].includes(mode.trim().toLowerCase())) {
      return this.delegated<JsonObject>("/api/connect/record", { method: "POST", body });
    }
    const response = await this.delegatedBinaryResponse("/api/connect/record", { method: "POST", body });
    return Object.freeze({ artifact: await response.blob(), saved: response.headers.get("x-receiz-record-saved"),
      visibility: response.headers.get("x-receiz-record-visibility"), showOnProfile: response.headers.get("x-receiz-record-show-on-profile") });
  }

  private async delegatedBinaryResponse(path: string, options: Omit<RequestOptions, "bearerToken"> = {}): Promise<Response> {
    if (!this.accessToken) throw new Error("receiz_access_token_required");
    const headers = new Headers(options.headers);
    if (!headers.has("accept")) headers.set("accept", "application/octet-stream");
    headers.set("authorization", `Bearer ${this.accessToken}`);
    let body = options.body;
    if (isJsonRecordBody(body)) {
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${requestPath(path)}`, {
      method: options.method ?? "GET",
      headers,
      ...(body !== undefined ? { body: body as BodyInit } : {}),
    });
    if (!response.ok) throw new ReceizHttpError(response.status, await readPayload(response));
    return response;
  }

  private async delegatedBlob(path: string, options: Omit<RequestOptions, "bearerToken" | "body"> = {}): Promise<Blob> {
    return (await this.delegatedBinaryResponse(path, options)).blob();
  }

  private async delegatedTwinMindImport(file: Blob): Promise<TwinMindImportSummaryResponse> {
    const form = new FormData();
    form.set("mind", file);
    return this.delegated<TwinMindImportSummaryResponse>("/api/connect/twin/mind/import", { method: "POST", body: form });
  }

  private async *streamJsonEvents<T extends JsonObject = JsonObject>(path: string, options: RequestOptions = {}): AsyncIterable<T> {
    if (path.startsWith("/api/receiz/v120/") && !this.legacySubjectHttp) {
      throw new TypeError("RECEIZ_V120_LOCAL_RUNTIME_OR_EXPLICIT_HTTP_TRANSPORT_REQUIRED");
    }
    const headers = new Headers(options.headers);
    if (!headers.has("accept")) headers.set("accept", "text/event-stream");

    const token = options.bearerToken ?? this.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);

    let body = options.body;
    if (isJsonRecordBody(body)) {
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }

    const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${this.baseUrl}${requestPath(path)}`;
    const response = await this.fetchImpl(url, {
      method: options.method ?? "GET",
      headers,
      ...(body !== undefined ? { body: body as BodyInit } : {}),
    });
    if (!response.ok) throw new ReceizHttpError(response.status, await readPayload(response));
    if (!response.body) throw new Error("receiz_stream_unavailable");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const parseEvent = (raw: string): T | null => {
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
      if (!data) return null;
      return JSON.parse(data) as T;
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const parsed = parseEvent(raw);
          if (parsed) yield parsed;
          boundary = buffer.indexOf("\n\n");
        }
      }

      buffer += decoder.decode().replace(/\r\n/g, "\n");
      const parsed = parseEvent(buffer);
      if (parsed) yield parsed;
    } finally {
      reader.releaseLock();
    }
  }

  async continueReceizId(identity: ReceizDeviceIdentity, options: ReceizIdContinueOptions = {}): Promise<JsonObject> {
    const body: ReceizIdContinueRequest = await buildReceizIdContinueRequest(identity, options);
    return this.request<JsonObject>("/api/auth/receiz-id/continue", { method: "POST", body });
  }

  authorizeUrl(options: ReceizAuthorizeUrlOptions): string {
    const url = new URL(`${this.baseUrl}/api/oidc/authorize`);
    url.searchParams.set("response_type", options.responseType ?? "code");
    url.searchParams.set("client_id", options.clientId);
    url.searchParams.set("redirect_uri", options.redirectUri);
    url.searchParams.set("code_challenge", options.codeChallenge);
    url.searchParams.set("code_challenge_method", options.codeChallengeMethod ?? "S256");
    const scope = Array.isArray(options.scope) ? options.scope.join(" ") : (options.scope ?? "openid profile");
    url.searchParams.set("scope", scope);
    if (options.state) url.searchParams.set("state", options.state);
    if (options.usernameHint) url.searchParams.set("login_hint", options.usernameHint);
    return url.toString();
  }

  ensureTenantSession(input: ReceizEnsureTenantSessionInput): ReceizEnsureTenantSessionResult {
    const tenantHost = normalizeReceizHost(input.tenantHost);
    const fallback = input.fallback ?? "artifact_upload";
    const scope = Array.isArray(input.scope)
      ? input.scope
      : typeof input.scope === "string" && input.scope.trim()
        ? input.scope.trim().split(/\s+/)
        : receizOidcScopesForRails("identity", "customers", "publicStore");
    let url: URL;
    if (input.clientId && input.codeChallenge) {
      const authorizeOptions: ReceizAuthorizeUrlOptions = {
        clientId: input.clientId,
        redirectUri: input.redirectUri ?? input.returnTo ?? `${this.baseUrl}/developers/connect`,
        codeChallenge: input.codeChallenge,
        scope,
      };
      if (input.codeChallengeMethod) authorizeOptions.codeChallengeMethod = input.codeChallengeMethod;
      if (input.state) authorizeOptions.state = input.state;
      if (input.usernameHint) authorizeOptions.usernameHint = input.usernameHint;
      url = new URL(
        this.authorizeUrl(authorizeOptions),
      );
    } else {
      url = new URL(`${this.baseUrl}/signin`);
      url.searchParams.set("lane", "connect");
    }
    url.searchParams.set("tenantHost", tenantHost);
    if (input.returnTo) url.searchParams.set("returnTo", input.returnTo);
    url.searchParams.set("fallback", fallback);
    return {
      ok: true,
      schema: "receiz.sdk.identity.tenant_session.ensure.v1",
      tenantHost,
      fallback,
      url: url.toString(),
      scope,
      ...(input.returnTo ? { returnTo: input.returnTo } : {}),
    };
  }

  private async delegatedVerifyArtifact(file: Blob): Promise<DocumentVerifyResponse> {
    const form = new FormData();
    form.set("file", file);
    return this.delegated<DocumentVerifyResponse>("/api/connect/verify", { method: "POST", body: form });
  }

  private async connectTransfer(body: ConnectTransferRequest, options: { idempotencyKey?: string } = {}): Promise<ConnectTransferResponse> {
    const requestBody: ConnectTransferRequest = { ...body };
    if (!requestBody.clientNonce && options.idempotencyKey) requestBody.clientNonce = options.idempotencyKey;
    return this.delegated<ConnectTransferResponse>("/api/connect/transfers", { method: "POST", body: requestBody });
  }
}

export function createReceizClient(options: ReceizClientOptions = {}): ReceizClient {
  return new ReceizClient(options);
}

export const RECEIZ_SDK_CLIENT_CAPABILITY_ROOTS = Object.freeze([
  "doctor", "execution", "capabilities", "auth", "verification", "admission", "coordination",
  "assets", "artifacts", "publicProof", "appState", "publicStore", "sports", "wallet", "profile",
  "value", "subjects", "localSubjects", "world", "bearer", "connect", "twin", "identity", "customers", "merchants",
  "commerce", "payments", "media", "domains", "sources", "events", "proof", "jobs", "permissions",
  "audit", "risk", "compliance", "portability", "search", "notifications", "releases",
  "webhookEndpoints", "webhooks", "manifests", "schemas", "projections", "sandbox", "proofMemory",
  "runtime", "offline", "ownership",
  "attestations", "credentials", "presentations", "subjectCoordination", "externalExecution",
] as const);

export type ReceizSdkClientCapabilityInventory = Readonly<{
  schema: "receiz.sdk.client-capability-inventory.v125";
  releaseVersion: typeof RECEIZ_RELEASE_VERSION;
  operations: readonly string[];
  authority: Readonly<{
    inventoryIsProofAuthority: false;
    mcpIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

/**
 * Enumerates every callable method intentionally published on the Receiz
 * client namespaces. Private transport helpers and internal caches are not
 * public SDK capabilities and cannot enter MCP or AI capability claims.
 */
export function describeReceizSdkClientCapabilityInventory(
  client: ReceizClient = createReceizClient(),
): ReceizSdkClientCapabilityInventory {
  const operations = new Set<string>();
  const visit = (value: unknown, path: string, ancestors: ReadonlySet<object>): void => {
    if (typeof value === "function") {
      operations.add(path);
      const callable = value as unknown as Record<string, unknown>;
      for (const key of Object.keys(callable).sort((left, right) => left.localeCompare(right))) {
        visit(callable[key], `${path}.${key}`, ancestors);
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (ancestors.has(value)) return;
    const nestedAncestors = new Set(ancestors);
    nestedAncestors.add(value);
    for (const key of Object.keys(value as Record<string, unknown>).sort((left, right) => left.localeCompare(right))) {
      visit((value as Record<string, unknown>)[key], `${path}.${key}`, nestedAncestors);
    }
  };
  const record = client as unknown as Record<string, unknown>;
  for (const root of RECEIZ_SDK_CLIENT_CAPABILITY_ROOTS) visit(record[root], root, new Set());
  return Object.freeze({
    schema: "receiz.sdk.client-capability-inventory.v125" as const,
    releaseVersion: RECEIZ_RELEASE_VERSION,
    operations: Object.freeze([...operations].sort((left, right) => left.localeCompare(right))),
    authority: Object.freeze({
      inventoryIsProofAuthority: false as const,
      mcpIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export async function admitReceizArtifact(
  verification: ReceizArtifactVerificationResult,
  options: ReceizArtifactAdmissionOptions,
): Promise<ReceizArtifactAdmissionResult> {
  return createReceizArtifactAdmissionEngine()(verification, options);
}

export const admitAndRecoverReceizArtifact = createReceizArtifactRecoveryCoordinator({
  admit: admitReceizArtifact,
});

export async function loadReceizOpenApi(baseUrl = RECEIZ_DEFAULT_BASE_URL, fetchImpl: typeof fetch = normalizeFetch()): Promise<JsonObject> {
  const response = await fetchImpl(`${trimTrailingSlash(baseUrl)}/openapi.json`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new ReceizHttpError(response.status, await readPayload(response));
  return response.json() as Promise<JsonObject>;
}

export function assertReceizProofBundle(value: unknown): ReceizProofBundle {
  const issues: string[] = [];
  const proof = validateReceizProofBundleShape(value, "proof", issues);
  failIfIssues("ReceizProofBundle", issues);
  return proof as ReceizProofBundle;
}

export function isReceizProofBundle(value: unknown): value is ReceizProofBundle {
  try {
    assertReceizProofBundle(value);
    return true;
  } catch {
    return false;
  }
}

export function assertReceizAssetManifest(value: unknown): ReceizAssetManifest {
  const record = ensureRecord(value, "ReceizAssetManifest");
  const issues: string[] = [];
  if (record.schema !== "receiz.asset_manifest.v1") issues.push("schema must be receiz.asset_manifest.v1");
  ensureString(record, "assetId", issues);
  ensureString(record, "assetType", issues);
  const proof = record.proof;
  validateReceizProofBundleShape(proof, "proof", issues);
  ensureOptionalRecord(record, "owner", issues);
  ensureOptionalRecord(record, "media", issues);
  ensureOptionalRecord(record, "settlement", issues);
  if (record.appends !== undefined && !Array.isArray(record.appends)) issues.push("appends must be an array when present");
  ensureLinks(record, issues);
  failIfIssues("ReceizAssetManifest", issues);
  return record as ReceizAssetManifest;
}

export function isReceizAssetManifest(value: unknown): value is ReceizAssetManifest {
  try {
    assertReceizAssetManifest(value);
    return true;
  } catch {
    return false;
  }
}

export function assertReceizSportsCardManifest(value: unknown): ReceizSportsCardManifest {
  const record = ensureRecord(value, "ReceizSportsCardManifest");
  const issues: string[] = [];
  if (record.schema !== "receiz.sports_arena.card_manifest.v1") issues.push("schema must be receiz.sports_arena.card_manifest.v1");
  ensureString(record, "sport", issues);
  ensureString(record, "collectibleId", issues);
  ensureString(record, "claimHash", issues);
  if (!isRecord(record.card)) issues.push("card must be an object");
  if (!isRecord(record.ownership)) issues.push("ownership must be an object");
  if (!isRecord(record.valueBasis)) issues.push("valueBasis must be an object");
  ensureOptionalRecord(record, "appendSummary", issues);
  ensureOptionalRecord(record, "eventProofSummary", issues);
  ensureLinks(record, issues);
  failIfIssues("ReceizSportsCardManifest", issues);
  return record as ReceizSportsCardManifest;
}

export function isReceizSportsCardManifest(value: unknown): value is ReceizSportsCardManifest {
  try {
    assertReceizSportsCardManifest(value);
    return true;
  } catch {
    return false;
  }
}

export function assertReceizWebhookEvent(value: unknown): ReceizWebhookEvent {
  const record = ensureRecord(value, "ReceizWebhookEvent");
  const issues: string[] = [];
  if (record.schema !== "receiz.webhook_event.v1") issues.push("schema must be receiz.webhook_event.v1");
  ensureString(record, "id", issues);
  const type = ensureString(record, "type", issues);
  if (type && !WEBHOOK_EVENT_TYPE_SET.has(type as ReceizWebhookEventType)) issues.push(`unsupported webhook type ${type}`);
  ensureString(record, "createdAt", issues);
  if (!isRecord(record.data)) issues.push("data must be an object");
  ensureOptionalRecord(record, "actor", issues);
  ensureOptionalRecord(record, "signature", issues);
  failIfIssues("ReceizWebhookEvent", issues);
  return record as ReceizWebhookEvent;
}

export function isReceizWebhookEvent(value: unknown): value is ReceizWebhookEvent {
  try {
    assertReceizWebhookEvent(value);
    return true;
  } catch {
    return false;
  }
}

function stringField(record: JsonObject | null | undefined, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberField(record: JsonObject | null | undefined, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function firstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function objectField(record: JsonObject | null | undefined, key: string): JsonObject | null {
  if (!record) return null;
  const value = record[key];
  return isRecord(value) ? value : null;
}

function optionalCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function formatUsdCents(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `$${(numeric / 100).toFixed(2)}`;
}

function proofKaiUpulse(proof: ReceizProofBundle | JsonObject | null | undefined): string | number | null {
  return firstString(stringField(proof, "kaiUpulse"), stringField(proof, "kaiPulse"), stringField(proof, "kaiPulseEternal")) ?? numberField(proof, "kaiPulseEternal");
}

function addProjectionRow(rows: ReceizProofProjectionRow[], label: string, value: string | number | null | undefined, href?: string | null): void {
  if (value === null || value === undefined || value === "") return;
  rows.push({ label, value: String(value), href: href ?? null });
}

export function projectReceizAssetManifest(value: unknown): ReceizAssetManifestProjection {
  const manifest = assertReceizAssetManifest(value);
  const owner = manifest.owner ?? null;
  const media = manifest.media ?? null;
  const settlement = manifest.settlement ?? null;
  const verifyUrl = firstString(manifest.links.verify, manifest.proof.verifyUrl, manifest.proof.verifyPath);
  const primaryUrl = firstString(manifest.links.open, manifest.links.public, manifest.links.verify, verifyUrl);
  const mediaUrl = firstString(stringField(media, "url"), stringField(media, "src"), stringField(media, "imageUrl"));
  const ownerLabel = firstString(
    stringField(owner, "displayName"),
    stringField(owner, "ownerLabel"),
    stringField(owner, "username"),
    stringField(owner, "receizSubject"),
  );
  const title = firstString(stringField(media, "title"), stringField(media, "name"), manifest.assetId) ?? manifest.assetId;
  const proofKind = manifest.proof.kind;
  const settlementState = firstString(stringField(settlement, "state"), stringField(settlement, "status"));
  const rows: ReceizProofProjectionRow[] = [];

  addProjectionRow(rows, "Asset ID", manifest.assetId);
  addProjectionRow(rows, "Asset Type", manifest.assetType);
  addProjectionRow(rows, "Proof Kind", proofKind);
  addProjectionRow(rows, "Verify", verifyUrl, verifyUrl);
  addProjectionRow(rows, "Kai Pulse", proofKaiUpulse(manifest.proof));
  addProjectionRow(rows, "Appends", manifest.appends?.length ?? 0);
  addProjectionRow(rows, "Settlement", settlementState);
  addProjectionRow(rows, "Owner", ownerLabel);

  return {
    schema: "receiz.sdk.asset_manifest_projection.v1",
    assetId: manifest.assetId,
    assetType: manifest.assetType,
    title,
    subtitle: ownerLabel ? `${manifest.assetType} / ${ownerLabel}` : manifest.assetType,
    proofKind,
    verifyUrl,
    primaryUrl,
    mediaUrl,
    ownerLabel,
    appendCount: manifest.appends?.length ?? 0,
    settlementState,
    rows,
    manifest,
  };
}

export function projectReceizSportsCardManifest(value: unknown): ReceizSportsCardManifestProjection {
  const manifest = assertReceizSportsCardManifest(value);
  const card = manifest.card;
  const ownership = manifest.ownership;
  const valueBasis = manifest.valueBasis;
  const appendSummary = manifest.appendSummary ?? null;
  const eventProofSummary = manifest.eventProofSummary ?? null;
  const title = firstString(
    stringField(card, "playerName"),
    stringField(card, "athleteName"),
    stringField(card, "name"),
    manifest.collectibleId,
  ) ?? manifest.collectibleId;
  const rarity = firstString(stringField(card, "rarity"), stringField(card, "tier"), stringField(card, "edition"));
  const team = firstString(stringField(card, "team"), stringField(card, "club"));
  const verifyUrl = firstString(manifest.links.verify, manifest.links.proof, manifest.links.asset);
  const eventProofUrl = firstString(
    manifest.links.eventProof,
    stringField(eventProofSummary, "latestEventProofUrl"),
    stringField(eventProofSummary, "latestProofUrl"),
  );
  const mediaUrl = firstString(
    stringField(card, "deterministicImageUrl"),
    stringField(card, "imageUrl"),
    stringField(card, "mediaUrl"),
  );
  const ownerLabel = firstString(
    stringField(ownership, "ownerLabel"),
    stringField(ownership, "displayName"),
    stringField(ownership, "ownerSubject"),
  );
  const scoreLabel = firstString(stringField(valueBasis, "score"), stringField(valueBasis, "valueScore"));
  const valueLabel = firstString(
    stringField(valueBasis, "valueLabel"),
    stringField(valueBasis, "reserveLabel"),
    formatUsdCents(valueBasis.reserveUsdCents),
  );
  const appendCount = optionalCount(appendSummary?.count);
  const eventProofCount = optionalCount(eventProofSummary?.count);
  const rows: ReceizProofProjectionRow[] = [];

  addProjectionRow(rows, "Collectible ID", manifest.collectibleId);
  addProjectionRow(rows, "Claim Hash", manifest.claimHash);
  addProjectionRow(rows, "Sport", manifest.sport);
  addProjectionRow(rows, "Owner", ownerLabel);
  addProjectionRow(rows, "Score", scoreLabel);
  addProjectionRow(rows, "Reserve", valueLabel);
  addProjectionRow(rows, "Kai Upulse", firstString(stringField(valueBasis, "kaiUpulse"), stringField(valueBasis, "kaiPulse")));
  addProjectionRow(rows, "Appends", appendCount);
  addProjectionRow(rows, "Event Proofs", eventProofCount);
  addProjectionRow(rows, "Latest Event", stringField(eventProofSummary, "latestEventType"));
  addProjectionRow(rows, "Proof", verifyUrl, verifyUrl);

  return {
    schema: "receiz.sdk.sports_card_manifest_projection.v1",
    sport: manifest.sport,
    collectibleId: manifest.collectibleId,
    claimHash: manifest.claimHash,
    title,
    subtitle: [manifest.sport, team, rarity].filter(Boolean).join(" / "),
    verifyUrl,
    eventProofUrl,
    mediaUrl,
    ownerLabel,
    scoreLabel,
    valueLabel,
    appendCount,
    eventProofCount,
    rows,
    manifest,
  };
}

function normalizeKaiForCompare(value: string | number | null | undefined): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^\+/, "");
}

function compareNumericTextDesc(leftValue: string | number | null | undefined, rightValue: string | number | null | undefined): number {
  const left = normalizeKaiForCompare(leftValue);
  const right = normalizeKaiForCompare(rightValue);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const [leftWholeRaw = "", leftFractionRaw = ""] = left.split(".");
  const [rightWholeRaw = "", rightFractionRaw = ""] = right.split(".");
  const leftWhole = leftWholeRaw.replace(/^0+/, "") || "0";
  const rightWhole = rightWholeRaw.replace(/^0+/, "") || "0";
  if (leftWhole.length !== rightWhole.length) return rightWhole.length - leftWhole.length;
  if (leftWhole !== rightWhole) return rightWhole.localeCompare(leftWhole);
  const maxFractionLength = Math.max(leftFractionRaw.length, rightFractionRaw.length);
  const leftFraction = leftFractionRaw.padEnd(maxFractionLength, "0");
  const rightFraction = rightFractionRaw.padEnd(maxFractionLength, "0");
  return rightFraction.localeCompare(leftFraction);
}

function compareRegisterEntries(left: ReceizProofRegisterEntry, right: ReceizProofRegisterEntry): number {
  const kai = compareNumericTextDesc(left.kaiUpulse, right.kaiUpulse);
  if (kai !== 0) return kai;
  const leftTime = left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : Number.NaN;
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
  if (Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return -1;
  if (!Number.isFinite(leftTime) && Number.isFinite(rightTime)) return 1;
  return left.id.localeCompare(right.id);
}

function mergeJsonPreservingExisting(existing: JsonObject, incoming: JsonObject): JsonObject {
  const merged: JsonObject = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (merged[key] === undefined) merged[key] = value;
  }
  return merged;
}

function mergeOptionalJsonPreservingExisting(existing: JsonObject | null | undefined, incoming: JsonObject | null | undefined): JsonObject | null {
  if (existing && incoming) return mergeJsonPreservingExisting(existing, incoming);
  return existing ?? incoming ?? null;
}

function normalizeRegisterEntry(value: unknown): ReceizProofRegisterEntry {
  const record = ensureRecord(value, "ReceizProofRegisterEntry");
  const issues: string[] = [];
  const id = ensureString(record, "id", issues);
  const kind = ensureString(record, "kind", issues);
  if (!isRecord(record.payload)) issues.push("payload must be an object");
  const createdAt = record.createdAt === null || record.createdAt === undefined ? null : ensureString(record, "createdAt", issues);
  const kaiUpulse = record.kaiUpulse;
  if (kaiUpulse !== null && kaiUpulse !== undefined && typeof kaiUpulse !== "string" && typeof kaiUpulse !== "number") {
    issues.push("kaiUpulse must be a string, number, or null");
  }
  const proof = record.proof;
  if (proof !== null && proof !== undefined && !isRecord(proof)) issues.push("proof must be an object or null");
  const projection = record.projection;
  if (projection !== null && projection !== undefined && !isRecord(projection)) issues.push("projection must be an object or null");
  failIfIssues("ReceizProofRegisterEntry", issues);
  return {
    id: id ?? "",
    kind: kind ?? "",
    createdAt,
    kaiUpulse: kaiUpulse === undefined ? null : (kaiUpulse as string | number | null),
    proof: isRecord(proof) ? proof : null,
    payload: record.payload as JsonObject,
    projection: isRecord(projection) ? projection : null,
  };
}

export function assertReceizProofRegisterSnapshot(value: unknown): ReceizProofRegisterSnapshot {
  const record = ensureRecord(value, "ReceizProofRegisterSnapshot");
  const issues: string[] = [];
  if (record.schema !== "receiz.sdk.proof_register.v1") issues.push("schema must be receiz.sdk.proof_register.v1");
  const ownerId = record.ownerId;
  if (ownerId !== null && ownerId !== undefined && typeof ownerId !== "string") {
    issues.push("ownerId must be a string or null when present");
  }
  const createdAt = ensureString(record, "createdAt", issues);
  const updatedAt = ensureString(record, "updatedAt", issues);
  const head = record.head;
  if (!isRecord(head)) {
    issues.push("head must be an object");
  } else {
    const entryId = head.entryId;
    if (entryId !== null && entryId !== undefined && typeof entryId !== "string") {
      issues.push("head.entryId must be a string or null");
    }
    const kaiUpulse = head.kaiUpulse;
    if (kaiUpulse !== null && kaiUpulse !== undefined && typeof kaiUpulse !== "string" && typeof kaiUpulse !== "number") {
      issues.push("head.kaiUpulse must be a string, number, or null");
    }
    const headCreatedAt = head.createdAt;
    if (headCreatedAt !== null && headCreatedAt !== undefined && typeof headCreatedAt !== "string") {
      issues.push("head.createdAt must be a string or null");
    }
    if (typeof head.count !== "number" || !Number.isInteger(head.count) || head.count < 0) {
      issues.push("head.count must be a non-negative integer");
    }
  }
  if (!Array.isArray(record.entries)) issues.push("entries must be an array");
  failIfIssues("ReceizProofRegisterSnapshot", issues);

  const entries = (record.entries as unknown[]).map((entry) => normalizeRegisterEntry(entry));
  return {
    schema: "receiz.sdk.proof_register.v1",
    ownerId: typeof ownerId === "string" || ownerId === null ? ownerId : null,
    createdAt: createdAt ?? "",
    updatedAt: updatedAt ?? "",
    head: {
      entryId: isRecord(head) && typeof head.entryId === "string" ? head.entryId : null,
      kaiUpulse: isRecord(head) && (typeof head.kaiUpulse === "string" || typeof head.kaiUpulse === "number") ? head.kaiUpulse : null,
      createdAt: isRecord(head) && typeof head.createdAt === "string" ? head.createdAt : null,
      count: isRecord(head) && typeof head.count === "number" ? head.count : entries.length,
    },
    entries,
  };
}

function parseProofMemoryStorageValue(value: ReceizProofMemoryStorageValue): ReceizProofRegisterSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return assertReceizProofRegisterSnapshot(JSON.parse(trimmed) as unknown);
  }
  return assertReceizProofRegisterSnapshot(value);
}

function mergeRegisterEntry(existing: ReceizProofRegisterEntry, incoming: ReceizProofRegisterEntry): ReceizProofRegisterEntry {
  return {
    id: existing.id,
    kind: existing.kind,
    createdAt: existing.createdAt ?? incoming.createdAt ?? null,
    kaiUpulse: existing.kaiUpulse ?? incoming.kaiUpulse ?? null,
    proof: mergeOptionalJsonPreservingExisting(existing.proof, incoming.proof),
    payload: mergeJsonPreservingExisting(existing.payload, incoming.payload),
    projection: mergeOptionalJsonPreservingExisting(existing.projection, incoming.projection),
  };
}

function registerEntryFromWebhookEvent(event: ReceizWebhookEvent): ReceizProofRegisterEntry {
  const proofBundle = objectField(event.data, "proofBundle");
  const assetId = stringField(event.data, "assetId");
  const appendId = stringField(event.data, "appendId");
  return {
    id: `webhook:${event.id}`,
    kind: event.type,
    createdAt: event.createdAt,
    kaiUpulse: proofKaiUpulse(proofBundle),
    proof: proofBundle,
    payload: event,
    projection: {
      eventId: event.id,
      type: event.type,
      assetId,
      appendId,
      verifyUrl: stringField(proofBundle, "verifyUrl"),
    },
  };
}

function errorDetail(error: unknown): JsonObject {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

function isProofRegisterEntry(value: unknown): value is ReceizProofRegisterEntry {
  return isRecord(value) && typeof value.id === "string" && typeof value.kind === "string" && isRecord(value.payload);
}

function proofMemoryAdditionValues(batch: ReceizProofMemoryAdditionBatch): unknown[] {
  if (Array.isArray(batch)) return batch;
  if (isProofRegisterEntry(batch)) return [batch];
  const out: unknown[] = [];
  for (const key of ["entries", "additions", "proofs", "records"]) {
    const value = batch[key];
    if (Array.isArray(value)) out.push(...value);
  }
  return out;
}

function admitProofMemoryAddition(memory: ReceizProofMemory, addition: unknown): void {
  if (isProofRegisterEntry(addition)) {
    memory.append(addition);
    return;
  }
  if (isRecord(addition) && isProofRegisterEntry(addition.entry)) {
    memory.append(addition.entry);
    return;
  }
  memory.admit(addition);
}

export class ReceizProofRegister {
  readonly ownerId: string | null;
  readonly createdAt: string;
  private readonly entriesById = new Map<string, ReceizProofRegisterEntry>();

  constructor(input: ReceizProofRegisterInput = {}) {
    this.ownerId = input.ownerId ?? null;
    this.createdAt = input.createdAt ?? new Date().toISOString();
    for (const entry of input.entries ?? []) this.append(entry);
  }

  append(entry: ReceizProofRegisterEntry): this {
    const normalized = normalizeRegisterEntry(entry);
    const existing = this.entriesById.get(normalized.id);
    this.entriesById.set(normalized.id, existing ? mergeRegisterEntry(existing, normalized) : normalized);
    return this;
  }

  admit(value: unknown): this {
    if (isReceizAssetManifest(value)) return this.admitAssetManifest(value);
    if (isReceizSportsCardManifest(value)) return this.admitSportsCardManifest(value);
    if (isReceizWebhookEvent(value)) return this.admitWebhookEvent(value);
    const schema = isRecord(value) && typeof value.schema === "string" ? value.schema : "unknown";
    throw new ReceizValidationError("ReceizProofAdmission", [`unsupported proof object schema ${schema}`]);
  }

  admitAssetManifest(value: unknown): this {
    assertReceizAssetManifest(value);
    throw new ReceizValidationError("ReceizAssetManifest", [
      "complete_sealed_proof_object_required: manifest shape is inspection-only and cannot become proof-object truth",
    ]);
  }

  admitSportsCardManifest(value: unknown): this {
    assertReceizSportsCardManifest(value);
    throw new ReceizValidationError("ReceizSportsCardManifest", [
      "complete_sealed_proof_object_required: sports manifest shape is inspection-only and cannot become proof-object truth",
    ]);
  }

  admitWebhookEvent(value: unknown): this {
    return this.append(registerEntryFromWebhookEvent(assertReceizWebhookEvent(value)));
  }

  has(entryId: string): boolean {
    return this.entriesById.has(entryId);
  }

  entries(): ReceizProofRegisterEntry[] {
    return [...this.entriesById.values()].sort(compareRegisterEntries);
  }

  snapshot(): ReceizProofRegisterSnapshot {
    const entries = this.entries();
    const head = entries[0] ?? null;
    return {
      schema: "receiz.sdk.proof_register.v1",
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      head: {
        entryId: head?.id ?? null,
        kaiUpulse: head?.kaiUpulse ?? null,
        createdAt: head?.createdAt ?? null,
        count: entries.length,
      },
      entries,
    };
  }

  toJSON(): ReceizProofRegisterSnapshot {
    return this.snapshot();
  }
}

export function createReceizProofRegister(input: ReceizProofRegisterInput = {}): ReceizProofRegister {
  return new ReceizProofRegister(input);
}

export class ReceizProofMemory {
  readonly register: ReceizProofRegister;
  private readonly storage: ReceizProofMemoryStorage | null;
  private readonly autoPersist: boolean;
  private readonly onPersistError: ((error: unknown) => void) | null;
  private readonly onObservation: ReceizSdkObserver | null;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(
    register: ReceizProofRegister,
    options: Pick<ReceizProofMemoryOptions, "storage" | "autoPersist" | "onPersistError" | "onObservation"> = {},
  ) {
    this.register = register;
    this.storage = options.storage ?? null;
    this.autoPersist = options.autoPersist ?? true;
    this.onPersistError = options.onPersistError ?? null;
    this.onObservation = options.onObservation ?? null;
  }

  append(entry: ReceizProofRegisterEntry): this {
    const startedAtMs = Date.now();
    try {
      this.register.append(entry);
      this.observe("proof_memory.append", startedAtMs, "ok");
      return this.schedulePersist();
    } catch (error) {
      this.observe("proof_memory.append", startedAtMs, "error", errorDetail(error));
      throw error;
    }
  }

  admit(value: unknown): this {
    const startedAtMs = Date.now();
    try {
      this.register.admit(value);
      this.observe("proof_memory.admit", startedAtMs, "ok");
      return this.schedulePersist();
    } catch (error) {
      this.observe("proof_memory.admit", startedAtMs, "error", errorDetail(error));
      throw error;
    }
  }

  admitAssetManifest(value: unknown): this {
    return this.admit(value);
  }

  admitSportsCardManifest(value: unknown): this {
    return this.admit(value);
  }

  admitWebhookEvent(value: unknown): this {
    return this.admit(value);
  }

  has(entryId: string): boolean {
    return this.register.has(entryId);
  }

  entries(): ReceizProofRegisterEntry[] {
    return this.register.entries();
  }

  snapshot(): ReceizProofRegisterSnapshot {
    return this.register.snapshot();
  }

  knownHead(limit?: number): ReceizProofMemoryAdditionsQuery {
    return receizProofMemoryAdditionsQuery(this.snapshot(), limit);
  }

  async persist(): Promise<ReceizProofRegisterSnapshot> {
    const startedAtMs = Date.now();
    try {
      const snapshot = this.snapshot();
      if (this.storage) await this.storage.write(snapshot);
      this.observe("proof_memory.persist", startedAtMs, "ok", { persisted: Boolean(this.storage) });
      return snapshot;
    } catch (error) {
      this.observe("proof_memory.persist", startedAtMs, "error", errorDetail(error));
      throw error;
    }
  }

  async flush(): Promise<void> {
    await this.persistChain;
  }

  async clear(): Promise<void> {
    const startedAtMs = Date.now();
    try {
      if (this.storage?.remove) await this.storage.remove();
      this.observe("proof_memory.clear", startedAtMs, "ok", { removed: Boolean(this.storage?.remove) });
    } catch (error) {
      this.observe("proof_memory.clear", startedAtMs, "error", errorDetail(error));
      throw error;
    }
  }

  toJSON(): ReceizProofRegisterSnapshot {
    return this.snapshot();
  }

  private schedulePersist(): this {
    if (!this.autoPersist || !this.storage) return this;
    this.persistChain = this.persistChain
      .then(async () => {
        await this.persist();
      })
      .catch((error: unknown) => {
        this.onPersistError?.(error);
      });
    return this;
  }

  private observe(
    operation: ReceizSdkObservation["operation"],
    startedAtMs: number,
    status: ReceizSdkObservation["status"],
    detail?: JsonObject,
  ): void {
    if (!this.onObservation) return;
    const endedAtMs = Date.now();
    const snapshot = this.snapshot();
    const observation: ReceizSdkObservation = {
      schema: "receiz.sdk.observation.v1",
      operation,
      status,
      startedAt: new Date(startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      durationMs: Math.max(0, endedAtMs - startedAtMs),
      ownerId: this.register.ownerId,
      entryCount: snapshot.head.count,
      headEntryId: snapshot.head.entryId,
      headKaiUpulse: snapshot.head.kaiUpulse,
    };
    if (detail) observation.detail = detail;
    try {
      this.onObservation(observation);
    } catch {
      // Observation callbacks are passive evidence only; they must never affect proof admission.
    }
  }
}

export async function createReceizProofMemory(options: ReceizProofMemoryOptions = {}): Promise<ReceizProofMemory> {
  const storedSnapshot = options.storage ? parseProofMemoryStorageValue(await options.storage.read()) : null;
  const input: ReceizProofRegisterInput = storedSnapshot
    ? {
        ...storedSnapshot,
        ownerId: options.ownerId ?? storedSnapshot.ownerId ?? null,
      }
    : {
        ownerId: options.ownerId ?? null,
        ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
        ...(options.entries === undefined ? {} : { entries: options.entries }),
      };
  return new ReceizProofMemory(createReceizProofRegister(input), options);
}

export function createReceizInMemoryProofMemoryStorage(initialValue: ReceizProofMemoryStorageValue = null): ReceizInMemoryProofMemoryStorage {
  let storedText: string | null = typeof initialValue === "string"
    ? initialValue
    : initialValue
      ? JSON.stringify(assertReceizProofRegisterSnapshot(initialValue))
      : null;
  return {
    read: () => storedText,
    write: (snapshot) => {
      storedText = JSON.stringify(assertReceizProofRegisterSnapshot(snapshot));
    },
    remove: () => {
      storedText = null;
    },
    readText: () => storedText,
  };
}

export function createReceizLocalStorageProofMemoryStorage(
  key = "receiz:proof-memory:v1",
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined = globalThis.localStorage,
): ReceizProofMemoryStorage {
  if (!storage) throw new Error("receiz_local_storage_unavailable");
  return {
    read: () => storage.getItem(key),
    write: (snapshot) => {
      storage.setItem(key, JSON.stringify(assertReceizProofRegisterSnapshot(snapshot)));
    },
    remove: () => {
      storage.removeItem(key);
    },
  };
}

export function receizProofMemoryAdditionsQuery(
  value: ReceizProofRegister | ReceizProofRegisterSnapshot | ReceizProofMemory,
  limit?: number,
): ReceizProofMemoryAdditionsQuery {
  const snapshot = value instanceof ReceizProofRegister
    ? value.snapshot()
    : value instanceof ReceizProofMemory
      ? value.snapshot()
      : assertReceizProofRegisterSnapshot(value);
  return {
    afterEntryId: snapshot.head.entryId,
    afterKaiUpulse: snapshot.head.kaiUpulse,
    afterCreatedAt: snapshot.head.createdAt,
    ...(limit === undefined ? {} : { limit }),
  };
}

function normalizeOfflineQueueItem(value: unknown): ReceizOfflineProofQueueItem {
  const record = ensureRecord(value, "ReceizOfflineProofQueueItem");
  const issues: string[] = [];
  const id = ensureString(record, "id", issues);
  const kind = ensureString(record, "kind", issues);
  if (!isRecord(record.payload)) issues.push("payload must be an object");
  const attempts = record.attempts;
  if (attempts !== undefined && (typeof attempts !== "number" || !Number.isInteger(attempts) || attempts < 0)) {
    issues.push("attempts must be a non-negative integer when present");
  }
  const item: ReceizOfflineProofQueueItem = {
    id: id ?? "",
    kind: (kind ?? "") as ReceizOfflineProofQueueItem["kind"],
    payload: isRecord(record.payload) ? record.payload : {},
    createdAt: typeof record.createdAt === "string" && record.createdAt.trim() ? record.createdAt : new Date().toISOString(),
    attempts: typeof attempts === "number" ? attempts : 0,
  };
  if (typeof record.idempotencyKey === "string" && record.idempotencyKey.trim()) item.idempotencyKey = record.idempotencyKey;
  if (record.lastError === null || isRecord(record.lastError)) item.lastError = record.lastError;
  failIfIssues("ReceizOfflineProofQueueItem", issues);
  return item;
}

export function assertReceizOfflineProofQueueSnapshot(value: unknown): ReceizOfflineProofQueueSnapshot {
  const record = ensureRecord(value, "ReceizOfflineProofQueueSnapshot");
  const issues: string[] = [];
  if (record.schema !== "receiz.sdk.offline_proof_queue.v1") issues.push("schema must be receiz.sdk.offline_proof_queue.v1");
  const ownerId = record.ownerId;
  if (ownerId !== null && ownerId !== undefined && typeof ownerId !== "string") {
    issues.push("ownerId must be a string or null when present");
  }
  const createdAt = ensureString(record, "createdAt", issues);
  const updatedAt = ensureString(record, "updatedAt", issues);
  if (!Array.isArray(record.pending)) issues.push("pending must be an array");
  if (!Array.isArray(record.settled)) issues.push("settled must be an array");
  if (!Array.isArray(record.failed)) issues.push("failed must be an array");
  failIfIssues("ReceizOfflineProofQueueSnapshot", issues);
  return {
    schema: "receiz.sdk.offline_proof_queue.v1",
    ownerId: typeof ownerId === "string" || ownerId === null ? ownerId : null,
    createdAt: createdAt ?? "",
    updatedAt: updatedAt ?? "",
    pending: Array.isArray(record.pending) ? record.pending.map(normalizeOfflineQueueItem) : [],
    settled: Array.isArray(record.settled) ? record.settled.map(normalizeOfflineQueueItem) : [],
    failed: Array.isArray(record.failed) ? record.failed.map(normalizeOfflineQueueItem) : [],
  };
}

function parseOfflineProofQueueStorageValue(value: ReceizOfflineProofQueueStorageValue): ReceizOfflineProofQueueSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return assertReceizOfflineProofQueueSnapshot(JSON.parse(trimmed) as unknown);
  }
  return assertReceizOfflineProofQueueSnapshot(value);
}

export class ReceizOfflineProofQueue {
  readonly ownerId: string | null;
  readonly createdAt: string;
  private pendingItems: ReceizOfflineProofQueueItem[];
  private settledItems: ReceizOfflineProofQueueItem[];
  private failedItems: ReceizOfflineProofQueueItem[];
  private readonly storage: ReceizOfflineProofQueueStorage | null;

  constructor(options: ReceizOfflineProofQueueOptions = {}) {
    const snapshot = options.snapshot ? assertReceizOfflineProofQueueSnapshot(options.snapshot) : null;
    this.ownerId = options.ownerId ?? snapshot?.ownerId ?? null;
    this.createdAt = snapshot?.createdAt ?? new Date().toISOString();
    this.pendingItems = snapshot?.pending ? [...snapshot.pending] : [];
    this.settledItems = snapshot?.settled ? [...snapshot.settled] : [];
    this.failedItems = snapshot?.failed ? [...snapshot.failed] : [];
    this.storage = options.storage ?? null;
  }

  enqueue(item: ReceizOfflineProofQueueItem): this {
    const normalized = normalizeOfflineQueueItem(item);
    if (this.pendingItems.some((pending) => pending.id === normalized.id)) return this;
    if (this.settledItems.some((settled) => settled.id === normalized.id)) return this;
    this.pendingItems.push(normalized);
    return this;
  }

  snapshot(): ReceizOfflineProofQueueSnapshot {
    return {
      schema: "receiz.sdk.offline_proof_queue.v1",
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      pending: [...this.pendingItems],
      settled: [...this.settledItems],
      failed: [...this.failedItems],
    };
  }

  async flush(): Promise<ReceizOfflineProofQueueSnapshot> {
    const snapshot = this.snapshot();
    if (this.storage) await this.storage.write(snapshot);
    return snapshot;
  }

  async clear(): Promise<void> {
    this.pendingItems = [];
    this.settledItems = [];
    this.failedItems = [];
    if (this.storage?.remove) await this.storage.remove();
  }

  async replay(client: ReceizClient): Promise<{ ok: boolean; settled: number; failed: number }> {
    const originalPending = [...this.pendingItems];
    let settled = 0;
    let failed = 0;
    this.pendingItems = [];

    for (const item of originalPending) {
      try {
        await replayOfflineProofQueueItem(client, item);
        this.settledItems.push({ ...item, attempts: (item.attempts ?? 0) + 1, lastError: null });
        settled += 1;
      } catch (error) {
        const failedItem: ReceizOfflineProofQueueItem = {
          ...item,
          attempts: (item.attempts ?? 0) + 1,
          lastError: errorDetail(error),
        };
        this.failedItems.push(failedItem);
        failed += 1;
      }
    }

    await this.flush();
    return { ok: failed === 0, settled, failed };
  }

  toJSON(): ReceizOfflineProofQueueSnapshot {
    return this.snapshot();
  }
}

async function replayOfflineProofQueueItem(client: ReceizClient, item: ReceizOfflineProofQueueItem): Promise<unknown> {
  if (item.kind === "app_state.publish") {
    return client.appState.publish(
      item.payload as ReceizAppStatePublishInput,
      item.idempotencyKey ? { idempotencyKey: item.idempotencyKey } : {},
    );
  }
  if (item.kind === "connect.record") {
    return client.request<JsonObject>("/api/connect/record", {
      method: "POST",
      body: bodyWithIdempotency(item.payload, item.idempotencyKey),
      headers: headersWithIdempotency(undefined, item.idempotencyKey),
    });
  }
  if (item.kind === "webhook.event") {
    return client.request<JsonObject>("/api/connect/webhooks/replay", {
      method: "POST",
      body: bodyWithIdempotency(item.payload, item.idempotencyKey),
      headers: headersWithIdempotency(undefined, item.idempotencyKey),
    });
  }
  return client.request<JsonObject>("/api/connect/offline/replay", {
    method: "POST",
    body: bodyWithIdempotency({ kind: item.kind, payload: item.payload }, item.idempotencyKey),
    headers: headersWithIdempotency(undefined, item.idempotencyKey),
  });
}

export async function createReceizOfflineProofQueue(options: ReceizOfflineProofQueueOptions = {}): Promise<ReceizOfflineProofQueue> {
  const storedSnapshot = options.storage ? parseOfflineProofQueueStorageValue(await options.storage.read()) : null;
  const queueOptions: ReceizOfflineProofQueueOptions = {
    ownerId: options.ownerId ?? storedSnapshot?.ownerId ?? null,
  };
  if (options.storage) queueOptions.storage = options.storage;
  const snapshot = options.snapshot ?? storedSnapshot;
  if (snapshot) queueOptions.snapshot = snapshot;
  return new ReceizOfflineProofQueue(queueOptions);
}

export function createReceizInMemoryOfflineProofQueueStorage(
  initialValue: ReceizOfflineProofQueueStorageValue = null,
): ReceizInMemoryOfflineProofQueueStorage {
  let storedText: string | null = typeof initialValue === "string"
    ? initialValue
    : initialValue
      ? JSON.stringify(assertReceizOfflineProofQueueSnapshot(initialValue))
      : null;
  return {
    read: () => storedText,
    write: (snapshot) => {
      storedText = JSON.stringify(assertReceizOfflineProofQueueSnapshot(snapshot));
    },
    remove: () => {
      storedText = null;
    },
    readText: () => storedText,
  };
}

export function createReceizLocalStorageOfflineProofQueueStorage(
  key = "receiz:offline-proof-queue:v1",
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined = globalThis.localStorage,
): ReceizOfflineProofQueueStorage {
  if (!storage) throw new Error("receiz_local_storage_unavailable");
  return {
    read: () => storage.getItem(key),
    write: (snapshot) => {
      storage.setItem(key, JSON.stringify(assertReceizOfflineProofQueueSnapshot(snapshot)));
    },
    remove: () => {
      storage.removeItem(key);
    },
  };
}

function bodyToString(body: string | ArrayBuffer | Uint8Array | JsonObject): string {
  if (typeof body === "string") return body;
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  return JSON.stringify(body);
}

export function buildReceizWebhookSignaturePayload(input: { timestamp: string; body: string | ArrayBuffer | Uint8Array | JsonObject }): string {
  return `${input.timestamp}.${bodyToString(input.body)}`;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeSignature(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;
}

function timingSafeEqual(left: string, right: string): boolean {
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function timestampMs(value: string): number {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  return Date.parse(trimmed);
}

export async function createReceizWebhookSignature(input: ReceizWebhookSignatureInput): Promise<string> {
  const payload = buildReceizWebhookSignaturePayload(input);
  return `sha256=${await hmacSha256Hex(input.secret, payload)}`;
}

export async function verifyReceizWebhookSignature(input: ReceizWebhookVerifyInput): Promise<boolean> {
  if (input.toleranceSeconds !== undefined) {
    const parsedTimestamp = timestampMs(input.timestamp);
    if (!Number.isFinite(parsedTimestamp)) return false;
    const now = input.nowMs ?? Date.now();
    if (Math.abs(now - parsedTimestamp) > input.toleranceSeconds * 1000) return false;
  }
  const expected = await createReceizWebhookSignature(input);
  return timingSafeEqual(normalizeSignature(expected), normalizeSignature(input.signature));
}
