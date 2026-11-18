export { createReceizInitialSubjectStateV122 } from "./v122InitialSubject.js";
export * from "./valuation.js";
import { buildReceizIdContinueRequest, createReceizIdIdentity, projectReceizIdentityAccount, readReceizIdentityArtifact, signReceizIdentityLoginProof, verifyReceizIdentityLoginProof, type ReceizDeviceIdentity, type ReceizIdContinueOptions, type ReceizIdentityKeyAlgorithm, type ReceizKeyFile } from "./identity.js";
export { RECEIZ_HTTP_OPERATION_SUPPORT, type ReceizHttpOperationSupport } from "./httpOperationSupport.js";
import type { ReceizV127SubjectRuntimeAdapter, ReceizV127SubjectRuntimeSource } from "./v127SubjectRuntimeAdapter.js";
import type { ReceizArtifactAdmissionOptions, ReceizArtifactAdmissionResult } from "./artifactAdmissionTypes.js";
import { type ReceizArtifactRecoveryCommitResult, type ReceizArtifactRecoveryPlan, type ReceizArtifactRecoveryResult } from "./artifactRecovery.js";
import type { ReceizVerifiedProofHistory } from "./proofHistory.js";
import type { ReceizAdmissionStore } from "./admissionStore.js";
import { createReceizAdmissionEngine } from "./commandAdmission.js";
import { createReceizBrowserAdmissionStore } from "./browserAdmissionStore.js";
import { type ReceizRemoteDomain } from "./remoteDomain.js";
import { confirmReceizEdgeReserveSendV125, confirmReceizEdgeSettlementSendV125, inspectReceizEdgeValueTransferPlanV125, planReceizEdgeReserveTransferV125, planReceizEdgeSettlementTransferV125, receiveReceizEdgeReserveV125, receiveReceizEdgeSettlementV125 } from "./v125EdgeValue.js";
import { applyReceizAttestationEventV125, createReceizAttestationApplicationV125, planReceizAttestationEventV125, verifyReceizAttestationHistoryV125 } from "./v125Attestation.js";
import { createReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { planReceizInitialAttestationSourceV125, planReceizInitialCredentialSourceV125, applyReceizInitialSourceV125 } from "./v125InitialSource.js";
import { applyReceizCredentialLifecycleEventV125, createReceizCredentialV125, planReceizCredentialLifecycleEventV125, resolveReceizCredentialCurrentnessV125, verifyReceizCredentialHistoryV125 } from "./v125Credential.js";
import { approveReceizPbiCeremonyV125, createReceizPbiCeremonyChallengeV125, createReceizPbiCeremonyReplayGuardV125, issueReceizPbiCeremonyReceiptV125, verifyReceizPbiCeremonyReceiptV125 } from "./v125PbiCeremony.js";
import { createReceizSourceBoundCredentialPresentationVerifierV125, createReceizCredentialPresentationContentUrlV125, createReceizCredentialPresentationNfcHandoffV125, createReceizCredentialPresentationQrHandoffV125, createReceizCredentialPresentationV125, exportReceizCredentialPresentationFileV125, importReceizCredentialPresentationFileV125, readReceizCredentialPresentationContentUrlV125, verifyReceizCredentialPresentationV125 } from "./v125CredentialPresentation.js";
import { createReceizExternalExecutionProfileV125, createReceizExternalExecutionRuntimeV125, planReceizExternalExecutionV125, verifyReceizExternalExecutionOutcomeV125, verifyReceizExternalExecutionPlanV125 } from "./v125ExternalExecution.js";
import { prepareReceizInitialTemporalSubjectSourceV125, readReceizTemporalSubjectSourceV125, readReceizSubjectRelationshipSourceV125, applyReceizSubjectRelationshipEventV125, createReceizSubjectRelationshipEventBindingDigestV125, createReceizSubjectPresenceV125, createReceizSubjectPresenceEventBindingDigestV125, planReceizSubjectPresenceEventV125, applyReceizSubjectPresenceEventV125, projectReceizSubjectPresenceV125, discoverReceizSubjectsV125, planReceizSubjectRelationshipEventV125, projectReceizSubjectRelationshipV125, resolveReceizSubjectPresenceCurrentnessV125, verifyReceizSubjectPresenceV125 } from "./v125SubjectCoordination.js";
import { createReceizSubjectSourceFamilyV125, openReceizSubjectSourceFamilyV125, readReceizSubjectSourceFamilyMemberV125 } from "./v125SubjectSourceFamily.js";
import { createReceizPortableExecutionTransitionRecoveryV124, prepareReceizPortableExecutionTransitionCommitSetV124, verifyReceizPortableExecutionTransitionSetV124 } from "./v124PortableAuthority.js";
import { type ReceizPrivateDomainAdditionsInputV124 } from "./v124Domains.js";
import { type ReceizResolveNamespacesInputV124 } from "./v124Namespaces.js";
import { type ReceizPublicRecipientResolutionInputV124 } from "./v124Recipient.js";
import { type ReceizPublishSealedSourceInputV124 } from "./v124Sources.js";
import type { ReceizDomainReplayExpectationV124 } from "./v124Replay.js";
import type { ReceizDomainReplayProofObjectExportInputV124, ReceizDomainReplayProofObjectRestoreInputV124 } from "./v124ReplayProofObject.js";
import { receizKaiMomentFromSealedPulse, receizKaiNow } from "./v124Kai.js";
import { planReceizWorldAccessAppendV122 } from "./v122WorldAccess.js";
import { quoteReceizDisplayUsdV122, validateReceizDisplayPriceV122, validateReceizValueIntentV122 } from "./v122Value.js";
import { RECEIZ_RELEASE_VERSION } from "./releaseIdentity.js";
import { signReceizCapability, type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type { ReceizAuthorityFailure } from "./authorityResults.js";
import { type PublicProofProjection } from "./publicProjection.js";
import type { ReceizBearerCapabilityV1, ReceizBearerInstrumentV1, ReceizBearerTransferPlanV1, ReceizBearerTransferPolicyV1, ReceizBearerTransferReceiptV1, ReceizSubjectArtifactV1, ReceizSubjectCapabilityV1, ReceizSubjectMandatePolicyV1, ReceizSubjectMandateV1, ReceizSubjectMemoryEventV1, ReceizSubjectMindArtifactV1, ReceizSubjectProofBrainHeadV1, ReceizSubjectProofBrainSearchInput, ReceizSubjectProofBrainStreamEvent, ReceizSubjectProofContextV1, ReceizSubjectProofReferenceV1, ReceizSubjectRuntimeJobV1, ReceizSubjectRuntimeTickInput, ReceizSubjectTwinMessageInput, ReceizSubjectTwinStreamEvent, ReceizSubjectV1, ReceizWorldAuthorityV1, ReceizWorldTransactionAuthorityV1, ReceizWorldCommandInputV1, ReceizWorldCommandPlanV1, ReceizWorldCommandV1, ReceizWorldExecutionResultV1, ReceizWorldEventV1, ReceizWorldTransactionV1 } from "./livingSubjects.js";
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
export { createReceizAttestationAuthorityV125, signReceizAttestationRoleGrantV125, verifyReceizAttestationRoleGrantAuthorityV125, verifyReceizAttestationEvidenceBundleAuthorityV125, } from "./v125AttestationAuthority.js";
export type { ReceizAttestationRoleGrantV125, ReceizAttestationEvidenceReferenceV125, ReceizAttestationEvidenceArtifactV125, ReceizAttestationDomainAuthorityProofV125, ReceizAttestationAuthorityV125, ReceizAttestationAuthorityOptionsV125, } from "./v125AttestationAuthority.js";
export * from "./v125Attestation.js";
export * from "./v125Credential.js";
export { planReceizInitialAttestationSourceV125, planReceizInitialCredentialSourceV125, receizInitialSourceCapabilityContextV125, applyReceizInitialSourceV125, } from "./v125InitialSource.js";
export type { ReceizInitialSourcePlanV125, ReceizInitialSourceSealerV125, ReceizInitialSourceCommitV125, ReceizInitialSourceStoreV125, } from "./v125InitialSource.js";
export * from "./v125PbiCeremony.js";
export * from "./v125CredentialPresentation.js";
export * from "./v125ExternalExecution.js";
export * from "./v125SubjectCoordination.js";
export * from "./v125SubjectSourceFamily.js";
import { planReceizSubjectMessageEventV125, applyReceizSubjectMessageEventV125, projectReceizSubjectThreadV125 } from "./v125SubjectMessageSource.js";
import { prepareReceizInitialTemporalConversationSourceV125, createReceizSubjectThreadSourceFamilyV125, openReceizSubjectThreadSourceFamilyV125, readReceizSubjectThreadSourceMemberV125 } from "./v125SubjectThreadSource.js";
export { planReceizSubjectMessageEventV125, applyReceizSubjectMessageEventV125, projectReceizSubjectThreadV125, prepareReceizInitialTemporalConversationSourceV125, createReceizSubjectThreadSourceFamilyV125, openReceizSubjectThreadSourceFamilyV125, readReceizSubjectThreadSourceMemberV125 };
export type { ReceizSubjectMessageEventPlanV125, ReceizSubjectThreadSourceStoreV125 } from "./v125SubjectMessageSource.js";
export type { ReceizSubjectThreadSourceFamilyV125, ReceizOpenedSubjectThreadSourceFamilyV125 } from "./v125SubjectThreadSource.js";
export * from "./v125EdgeValue.js";
export * from "./v125Capabilities.js";
export { validateReceizOperationPlanV124 } from "./v124Contracts.js";
export type { ReceizOperationKindV124, ReceizOperationPlanV124, ReceizExecutionStatusV124, ReceizAuthoritySessionStatusV124, ReceizQualificationStatusV124, ReceizRecipientResolutionStatusV124, ReceizExecutionProjectionV124, ReceizAuthoritySessionProjectionV124, ReceizQualificationProjectionV124, ReceizPublicRecipientProjectionV124, } from "./v124Contracts.js";
export { planReceizLocatorBoundValueIntentV124, validateReceizLocatorBoundValueIntentV124, } from "./v124LocatorBoundValue.js";
export type { ReceizLocatorBoundValueIntentInputV124, ReceizLocatorBoundValueIntentV124, } from "./v124LocatorBoundValue.js";
export { createReceizWorldExecutionEventV124, planReceizMultiWorldCompositeOperationV124, planReceizMultiWorldExecutionProjectionV124, planReceizWorldCompositeOperationV124, planReceizWorldExecutionProjectionV124, validateReceizMultiWorldCompositeOperationV124, validateReceizMultiWorldExecutionProjectionV124, validateReceizWorldCompositeOperationV124, validateReceizWorldExecutionProjectionV124, } from "./v124WorldComposite.js";
export type { ReceizMultiWorldCompositeOperationV124, ReceizMultiWorldExecutionMemberV124, ReceizMultiWorldExecutionProjectionInputV124, ReceizMultiWorldExecutionProjectionV124, ReceizWorldCompositeCommandCategoryV124, ReceizWorldCompositeOperationV124, ReceizWorldExecutionEventV124, ReceizWorldExecutionPrivateEnvelopeV124, ReceizWorldExecutionProjectionInputV124, ReceizWorldExecutionProjectionV124, } from "./v124WorldComposite.js";
export { ReceizExecutionZeroWriteErrorV124, createReceizCustomReducerBindingsV124, deriveReceizRegisteredOperationCasV124, exportReceizCommittedExecutionRecoveryV124, planAtomicOperationV124, } from "./v124Execution.js";
export { canonicalizeReceizTransportBindingV124, createReceizTransportBindingV124, digestReceizExecutionTransportRequestV124, readReceizSignedTransportEnvelopeV124, verifyReceizTransportBindingV124, } from "./v124TransportBinding.js";
export type { ReceizExecutionTransportRequestInputV124, ReceizSignedTransportEnvelopeV124, ReceizTransportBindingAuthorityV124, ReceizTransportBindingExpectationV124, ReceizTransportBindingInputV124, ReceizTransportBindingKindV124, ReceizTransportBindingV124, ReceizTransportSignatureV124, } from "./v124TransportBinding.js";
export { createReceizPortableExecutionAuthorityEventV124, createReceizPortableExecutionAuthorityIdentityChallengeV124, createReceizPortableExecutionTransitionRecoveryV124, isReceizVerifiedPortableExecutionTransitionSetV124, isReceizVerifiedPortableExecutionAuthorityV124, prepareReceizPortableExecutionTransitionCommitSetV124, recoverReceizPortableExecutionTransitionSetV124, transportReceizSealedArtifactV124, verifyReceizPortableExecutionTransitionSetV124, verifyReceizPortableExecutionAuthorityEvidenceV124, } from "./v124PortableAuthority.js";
export type { ReceizPortableExecutionAuthorityEvidenceV124, ReceizPortableExecutionAuthorityEventV124, ReceizPortableExecutionAuthorityRequestV124, ReceizPortableExecutionAuthorityVerifierOptionsV124, ReceizPortableExecutionOutcomeCoordinatesV124, ReceizPortableExecutionTransitionMemberV124, ReceizPortableExecutionTransitionRecoveryV124, ReceizPortableExecutionTransitionSetV124, ReceizPreparedPortableExecutionTransitionCommitSetV124, ReceizPortableSealedArtifactV124, ReceizRecoveredPortableExecutionTransitionSetV124, ReceizVerifiedPortableExecutionAuthorityV124, ReceizVerifiedPortableExecutionTransitionMemberV124, ReceizVerifiedPortableExecutionTransitionSetV124, } from "./v124PortableAuthority.js";
export type { ReceizAtomicOperationInputV124, ReceizDurableExecutionHandleV124, ReceizExecutionIdempotencyCoordinatesV124, ReceizExecutionOutcomeV124, ReceizExecutionResolutionV124, ReceizRegisteredOperationBasisV124, ReceizRegisteredOperationCasV124, ReceizRegisteredOperationV124, ReceizZeroWriteFailureV124, } from "./v124Execution.js";
export { isReceizVerifiedCheckpointV124, validateReceizCheckpointV124, validateReceizDomainReplayV124, validateReceizReplayV124, } from "./v124Replay.js";
export type { ReceizNamespaceProjectionV124, ReceizDomainReplayAdditionV124, ReceizDomainReplayExpectationV124, ReceizDomainReplayV124, ReceizDomainReplayReceiptV124, ReceizCheckpointV124, ReceizCheckpointReceiptV124, ReceizCheckpointExpectationV124, } from "./v124Replay.js";
export { RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY, createReceizDomainAppendCommandsV124, createReceizDomainReplaySourceAuthorityV124, createReceizDomainReplaySourceIntentV124, prepareReceizDomainReplayCheckpointProofObjectCandidateV124, prepareReceizDomainReplaySegmentProofObjectCandidateV124, prepareReceizSubjectSourceProofObjectCandidateV124, } from "./v124ReplayProofObject.js";
export type { ReceizDomainAppendCausalParentHeadV124, ReceizDomainAppendCommandV124, ReceizDomainAppendCommandsInputV124, ReceizDomainAppendConflictV124, ReceizDomainAppendReceiptV124, ReceizDomainAppendResultV124, ReceizDomainReplayAppendIndexWitnessV124, ReceizDomainReplayAppendIndexValueV124, ReceizDomainReplayCheckpointProofObjectCandidateInputV124, ReceizDomainReplayCheckpointProofObjectCandidateV124, ReceizDomainReplayCheckpointProofCarrierV124, ReceizDomainReplayFibonacciWitnessV124, ReceizDomainReplayIdentityVerificationProjectionV124, ReceizDomainReplayKaiV124, ReceizDomainReplayNamespaceHeadV124, ReceizDomainReplayProofCarrierV124, ReceizDomainReplayProofHeadV124, ReceizDomainReplayProofObjectExpectationV124, ReceizDomainReplayProofObjectExportInputV124, ReceizDomainReplayProofObjectExportV124, ReceizDomainReplayProofObjectRestorationV124, ReceizDomainReplayProofObjectRestoreInputV124, ReceizDomainReplayProofSegmentChildV124, ReceizDomainReplayProofSegmentCommitmentV124, ReceizDomainReplaySegmentProofObjectCandidateInputV124, ReceizDomainReplaySegmentProofObjectCandidateV124, ReceizDomainReplaySegmentProofCarrierV124, ReceizDomainReplaySegmentSourceCoordinateV124, ReceizDomainReplaySegmentSourceExpectationV124, ReceizDomainReplaySourceAuthoringEvidenceV124, ReceizDomainReplaySourceAuthorityV124, ReceizDomainReplaySourceIntentInputV124, ReceizDomainReplaySourceIntentV124, ReceizProofObjectCandidatePortableV124, ReceizReadDomainReplayCheckpointSourceV124, ReceizReadDomainReplaySegmentSourceV124, ReceizReadSubjectSourceV124, ReceizReadViewerSubjectSourceV124, ReceizSubjectSourceProofObjectCandidateInputV124, ReceizSubjectSourceProofObjectCandidateV124, ReceizViewerSubjectSourceCarrierV124, } from "./v124ReplayProofObject.js";
export { createReceizV124Sources, validateReceizSealedSourcePublicationResultV124, } from "./v124Sources.js";
export type { ReceizPublishSealedSourceInputV124, ReceizSealedSourcePublicationKindV124, ReceizSealedSourcePublicationResultV124, ReceizV124SourcesRemoteV124, } from "./v124Sources.js";
export { receizKaiMomentFromSealedPulse, receizKaiNow };
export type { ReceizKaiNow, ReceizKaiSealedMoment } from "./v124Kai.js";
export { RECEIZ_KAI_SIGIL_GROTH16_SCHEMA, RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA, RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA, RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID, RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA, RECEIZ_KKS_V1_VERSION, admitReceizKksV1ProofCoordinate, createReceizKksV1LiveProofCoordinate, projectReceizKksV1SealedProofCoordinate, } from "./v125KaiAuthority.js";
export type { ReceizKaiSigilGroth16ProofV1, ReceizKaiSigilProofFactoryV1, ReceizKaiSigilTemporalPayloadV1, ReceizKaiSigilTemporalProofV1, ReceizKksV1AdmissionContext, ReceizKksV1ProofCoordinate, } from "./v125KaiAuthority.js";
export { RECEIZ_V125_TEMPORAL_AUTHORITY_CHECK_IDS, RECEIZ_V125_TEMPORAL_AUTHORITY_CONFORMANCE_SCHEMA, runReceizV125TemporalAuthorityConformance, } from "./v125TemporalAuthorityConformance.js";
export type { ReceizV125TemporalAuthorityCheck, ReceizV125TemporalAuthorityCheckId, ReceizV125TemporalAuthorityConformanceReport, } from "./v125TemporalAuthorityConformance.js";
export { RECEIZ_V125_AUTHORITY_FLOW, RECEIZ_V125_AUTHORITY_FLOW_SCHEMA, RECEIZ_V125_AUTHORITY_STAGES, RECEIZ_V125_HIGHEST_CASH_OUT_FRAME, assertReceizV125AuthorityFlowStep, } from "./v125AuthorityFlow.js";
export type { ReceizV125AuthorityFlow, ReceizV125AuthorityStage, } from "./v125AuthorityFlow.js";
export { createReceizProofAuthorityChallenge } from "./v124ProofAuthorityChallenge.js";
export type { CreateReceizProofAuthorityChallengeInput, CreatedReceizProofAuthorityChallenge, } from "./v124ProofAuthorityChallenge.js";
export { ReceizRuntimeZeroWriteErrorV124 } from "./v124Runtime.js";
export type { ReceizOpenAuthoritySessionInputV124, ReceizRefreshAuthoritySessionInputV124, ReceizCloseAuthoritySessionInputV124, ReceizAuthoritySessionNamespaceV124, ReceizAuthoritySessionV124, ReceizAuthoritySessionClosedV124, ReceizRuntimeOperationV124, ReceizRuntimeZeroWriteReasonV124, ReceizRuntimeZeroWriteFailureV124, ReceizQualificationOperationV124, ReceizOperationalQualificationInputV124, ReceizQualificationReasonV124, ReceizQualificationRetryV124, ReceizQualificationEvidenceV124, ReceizOperationalCapabilityV124, ReceizOperationalCapabilityReportV124, } from "./v124Runtime.js";
export type { ReceizPrivateDomainAdditionsInputV124, ReceizPrivateDomainAdditionV124, ReceizPrivateDomainAdditionsResultV124, } from "./v124Domains.js";
export type { ReceizResolveNamespacesInputV124, ReceizValidatedNamespaceProjectionV124, } from "./v124Namespaces.js";
export { createReceizPublicRecipientLocatorReferenceV124, normalizeReceizPublicRecipientAliasV124, validateReceizPublicRecipientLocatorReferenceV124, } from "./v124Recipient.js";
export type { ReceizPublicRecipientLocatorReferenceV124, ReceizPublicRecipientResolutionInputV124, ReceizPublicRecipientResolutionV124, } from "./v124Recipient.js";
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
export { createReceizBrowserAdmissionStore, type ReceizBrowserAdmissionStoreOptions, } from "./browserAdmissionStore.js";
export { createReceizArtifactAdmissionEngine, createReceizCapabilityIssuerResolver, admitReceizLegacyProfileShowcaseMigrationWithInspectionContext, admitReceizProfileShowcaseCheckpointBundleV114, admitReceizProfileShowcaseCheckpointCarrierWithContextV114, admitReceizEconomyShowcaseSuccessorWithPredecessorContext, admitReceizProfileShowcaseGenesisWithActorContext, admitReceizProfileShowcaseMergeWithParentContext, admitReceizProfileShowcaseMergeWithExactParentContext, admitReceizProfileShowcaseSuccessorWithExactPredecessorContext, admitReceizProfileShowcaseSuccessorWithPredecessorContext, inspectReceizBoundedProfileShowcaseV114, inspectReceizLegacyProfileShowcaseV114, isSdkIssuedReceizArtifactAdmission, isSdkAdmittedReceizCapabilityIssuerKey, isSdkInspectedLegacyProfileShowcaseV114, rederiveReceizBoundedProfileShowcaseCarrierFromAdmission, rederiveReceizEconomyShowcaseCarrierFromAdmission, rederiveReceizProfileShowcaseCarrierFromAdmission, createReceizProfileShowcaseCheckpointCarrierV114, isSdkVerifiedProfileShowcaseCheckpointV114, verifyReceizArtifactAdmission, type ReceizInspectedLegacyProfileShowcaseV114, type ReceizInspectedBoundedProfileShowcaseV114, type ReceizVerifiedProfileShowcaseCheckpointV114, readReceizIdentityPublicBinding, type ReceizIdentityPublicBinding, } from "./artifactAdmission.js";
export * from "./artifactAdmissionTypes.js";
export * from "./artifactRecovery.js";
export * from "./artifactTransition.js";
export type { ReceizAppendReceipt, ReceizArtifactTransitionCommitCommandBasis, ReceizArtifactTransitionCommitResult, ReceizArtifactTransitionCommitUnit, ReceizArtifactTransitionStore, ReceizArtifactTransitionStoreVerificationInput, ReceizReportedActorReference, ReceizStagedArtifactTransition, ReceizStagedCandidateReference, ReceizVerifiedArtifactTransitionCandidate, } from "./artifactTransitionStore.js";
export * from "./namespaceReducer.js";
export * from "./causalHistory.js";
export * from "./causalReplay.js";
export { createReceizArtifactTransitionProofHistoryAppendNode, createReceizProfileShowcaseProofHistoryNode, deriveReceizProfileShowcaseHistoryBinding, createReceizProofHistoryNode, deriveReceizVerifiedProofHistoryFromAdmission, isRuntimeVerifiedReceizProofHistory, mergeReceizProofHistoryPrefix, mergeReceizVerifiedProofHistories, normalizeReceizProofHistory, verifyReceizProofHistory, } from "./proofHistory.js";
export type { ReceizArtifactTransitionHistoryAppendBasis, ReceizProofHistory, ReceizProofHistoryEvent, ReceizProofHistoryEvidenceRoot, ReceizProofHistoryNode, ReceizProofHistoryReceiptVerifier, ReceizProfileShowcaseHistoryBinding, ReceizVerifiedProofHistory, } from "./proofHistory.js";
export * from "./registryArtifact.js";
export { discoverReceizRegistryLaw } from "./registryDiscovery.js";
export type { ReceizDiscoveredLaw, ReceizRegistryDiscoveryInput, ReceizRegistryDiscoveryResult, ReceizRegistryTrustEvidence, } from "./registryDiscovery.js";
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
import { ReceizArtifactError, type ReceizArtifactDownloadEvidence, type ReceizOpenedArtifact, type ReceizPayload, type ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizArtifactInput } from "./artifactInput.js";
import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
export { ReceizArtifactError };
export { sha256ReceizBytes } from "./artifacts.js";
export type { ReceizArtifactDownloadEvidence, ReceizArtifactErrorCode, ReceizNativeArtifactContinuity, ReceizOpenedArtifact, ReceizPayload, ReceizSealedArtifact, ReceizSuccessfulArtifactVerification, ReceizVerifiedLegacyArtifact, ReceizVerifiedLegacyContinuity, ReceizVerifiedPayload, } from "./artifacts.js";
import { type ReceizProfileUpdateInput } from "./profile.js";
export * from "./profile.js";
export * from "./errors.js";
import { type ReceizCapabilityKey, type ReceizRailScopeKey } from "./capabilities.js";
export * from "./capabilities.js";
export * from "./authorityEncoding.js";
export * from "./authorityResults.js";
export * from "./artifactInput.js";
export { assertRuntimeCustodiedReceizArtifactVerification, verifyReceizArtifact, type ReceizArtifactContinuityAssessment, type ReceizArtifactDigest, type ReceizArtifactVerification, type ReceizArtifactVerificationError, type ReceizArtifactVerificationResult, type ReceizPayloadDigest, type ReceizUnsupportedArtifactReason, } from "./artifactVerification.js";
export * from "./publicProjection.js";
export declare const RECEIZ_SDK_VERSION: "129.5.0";
export declare const RECEIZ_DEFAULT_BASE_URL = "https://receiz.com";
export declare const RECEIZ_WEBHOOK_SIGNATURE_HEADER = "x-receiz-signature";
export declare const RECEIZ_WEBHOOK_TIMESTAMP_HEADER = "x-receiz-timestamp";
export declare const RECEIZ_APP_STATE_FEED_SCHEMA = "receiz.app.public_state_registry_feed.v1";
export declare const RECEIZ_PUBLIC_STORE_STATE_FEED_SCHEMA = "receiz.app.public_store_state_registry_feed.v1";
export declare const RECEIZ_PUBLIC_STORE_STATE_PROJECTION_SCHEMA = "receiz.app.public_store_state_projection.v1";
export declare const RECEIZ_PUBLIC_STORE_SIGNED_PUBLISH_SCHEMA = "receiz.public_store.signed_publish.v1";
export declare const RECEIZ_PUBLIC_STORE_PUBLISH_PROOF_SCHEMA = "receiz.public_store.identity_publish_proof.v1";
export declare const RECEIZ_PUBLIC_STORE_PUBLISH_CHALLENGE_SCHEMA = "receiz.public_store.publish_challenge.v1";
export declare const RECEIZ_WEBHOOK_EVENT_GROUPS: readonly [{
    readonly key: "payment";
    readonly title: "Payment events";
    readonly detail: "Checkout, payment settlement, refund, and failure events for Receiz Payments.";
    readonly events: readonly ["checkout.session.created", "checkout.session.completed", "payment.created", "payment.settled", "payment.failed", "payment.refunded"];
}, {
    readonly key: "commerce";
    readonly title: "Commerce events";
    readonly detail: "Order and reward events for store, app runtime, and customer automations.";
    readonly events: readonly ["order.created", "reward.claimed"];
}, {
    readonly key: "proof";
    readonly title: "Proof events";
    readonly detail: "Proof object, asset, event proof, and Sports card append events.";
    readonly events: readonly ["asset.created", "asset.transferred", "proof.appended", "event_proof.created", "sports_card.scored"];
}, {
    readonly key: "ownershipSettlement";
    readonly title: "Ownership and settlement events";
    readonly detail: "Wallet, note, transfer, and ownership events beneath proof-native value rails.";
    readonly events: readonly ["wallet.ledger_entry", "note.claimed", "ownership.transferred", "market.trade"];
}, {
    readonly key: "appProfile";
    readonly title: "App and profile events";
    readonly detail: "Public app-state, profile visibility, and World campaign events.";
    readonly events: readonly ["profile.asset.visible_changed", "app_state.published", "world.campaign.sent"];
}];
export type ReceizWebhookEventType = (typeof RECEIZ_WEBHOOK_EVENT_GROUPS)[number]["events"][number];
export declare const RECEIZ_WEBHOOK_EVENT_TYPES: ReceizWebhookEventType[];
export declare const RECEIZ_WEBHOOK_EVENT_PRESETS: {
    payment: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded")[];
    commerce: ("order.created" | "reward.claimed")[];
    proofSettlement: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded" | "asset.created" | "asset.transferred" | "proof.appended" | "event_proof.created" | "sports_card.scored" | "wallet.ledger_entry" | "note.claimed" | "ownership.transferred" | "market.trade")[];
    everything: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded" | "order.created" | "reward.claimed" | "asset.created" | "asset.transferred" | "proof.appended" | "event_proof.created" | "sports_card.scored" | "wallet.ledger_entry" | "note.claimed" | "ownership.transferred" | "market.trade" | "profile.asset.visible_changed" | "app_state.published" | "world.campaign.sent")[];
};
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
    (body: JsonObject & {
        includeArtifact: false;
    }): Promise<JsonObject>;
    (body: JsonObject & {
        includeArtifact?: true;
    }): Promise<ReceizConnectRecordArtifactResponse>;
    (body: JsonObject): Promise<JsonObject | ReceizConnectRecordArtifactResponse>;
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
    integrity?: {
        ok: boolean;
        errors: string[];
    };
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
export type ReceizProofObjectType = "proof_object" | "sports_card" | "signal_card" | "wallet_note" | "market_certificate" | "profile_original" | "document";
export declare class ReceizProofObjectError extends ReceizError<"continuity_payload_missing" | "continuity_identity_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed"> {
    readonly code: "continuity_payload_missing" | "continuity_identity_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed";
    constructor(code: "continuity_payload_missing" | "continuity_identity_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed");
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
export type PublicProofObserveRequest = ({
    sourceUrl: string;
    url?: string;
} | {
    sourceUrl?: string;
    url: string;
}) & {
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
export type ReceizPublicProjectionRecord<TData extends JsonObject = JsonObject> = Readonly<PublicProofProjection<TData> & Omit<PublicProofTransportRecord<TData>, "id" | "sourceUrl" | "data"> & {
    schema?: string | null;
    state?: string | null;
    platform?: string | null;
    appNamespace?: string | null;
    appObjectId?: string | null;
    record?: JsonObject | null;
    data?: TData | null;
}>;
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
export type ReceizWebhookEventHandlers<TResult = unknown> = Partial<Record<ReceizWebhookEventType, ReceizWebhookEventHandler<TResult>>> & {
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
    /** Read-only source disclosure returned by the existing ledger transport. */
    fundingContexts?: Record<string, unknown>;
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
    evidenceAssets?: Array<{
        kind: "image" | "clip";
        url: string;
        label?: string | null;
    }>;
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
    operation: "proof_memory.append" | "proof_memory.admit" | "proof_memory.persist" | "proof_memory.clear";
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
export type ReceizProofMemoryAdditionBatch = unknown[] | {
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
export declare const RECEIZ_ASSET_MANIFEST_SCHEMA: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://receiz.com/standards/receiz.asset-manifest.schema.v1.json";
    readonly title: "Receiz Asset Manifest";
    readonly type: "object";
    readonly additionalProperties: true;
    readonly required: readonly ["schema", "assetId", "assetType", "proof", "links"];
    readonly properties: {
        readonly schema: {
            readonly const: "receiz.asset_manifest.v1";
        };
        readonly assetId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly assetType: {
            readonly enum: readonly ["proof_object", "sports_card", "signal_card", "wallet_note", "market_certificate", "profile_original", "document"];
        };
        readonly proof: {
            readonly type: "object";
            readonly required: readonly ["kind", "payloadVersion", "createdAtMs", "ts", "code", "slug", "verifyPath", "verifyUrl", "kaiPulseEternal", "kaiKlok", "receizClaimId", "sigilClaimSeed"];
            readonly additionalProperties: true;
            readonly properties: {
                readonly kind: {
                    readonly const: "receiz.proof_bundle";
                };
                readonly payloadVersion: {
                    readonly enum: readonly ["v2", "v1"];
                };
                readonly createdAtMs: {
                    readonly type: "number";
                };
                readonly ts: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly code: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly slug: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly verifyPath: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly verifyUrl: {
                    readonly type: "string";
                };
                readonly kaiPulseEternal: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly kaiKlok: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly receizClaimId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly sigilClaimSeed: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
        readonly owner: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly media: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly appends: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
        };
        readonly settlement: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly links: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
    };
};
export declare const RECEIZ_SPORTS_CARD_MANIFEST_SCHEMA: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://receiz.com/standards/receiz.sports-card-manifest.schema.v1.json";
    readonly title: "Receiz Sports Arena Card Manifest";
    readonly type: "object";
    readonly additionalProperties: true;
    readonly required: readonly ["schema", "sport", "collectibleId", "claimHash", "card", "ownership", "valueBasis", "links"];
    readonly properties: {
        readonly schema: {
            readonly const: "receiz.sports_arena.card_manifest.v1";
        };
        readonly sport: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly collectibleId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly claimHash: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly card: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly ownership: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly valueBasis: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly appendSummary: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly eventProofSummary: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly links: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
    };
};
export declare const RECEIZ_WEBHOOK_EVENT_SCHEMA: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://receiz.com/standards/receiz.webhook-event.schema.v1.json";
    readonly title: "Receiz Webhook Event";
    readonly type: "object";
    readonly additionalProperties: true;
    readonly required: readonly ["schema", "id", "type", "createdAt", "data"];
    readonly properties: {
        readonly schema: {
            readonly const: "receiz.webhook_event.v1";
        };
        readonly id: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly type: {
            readonly enum: readonly ["checkout.session.created", "checkout.session.completed", "payment.created", "payment.settled", "payment.failed", "payment.refunded", "order.created", "reward.claimed", "asset.created", "asset.transferred", "proof.appended", "sports_card.scored", "event_proof.created", "wallet.ledger_entry", "note.claimed", "ownership.transferred", "market.trade", "profile.asset.visible_changed", "app_state.published", "world.campaign.sent"];
        };
        readonly createdAt: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly data: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly actor: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
        readonly signature: {
            readonly type: readonly ["object", "null"];
            readonly additionalProperties: true;
        };
    };
};
export declare const RECEIZ_SCHEMAS: {
    readonly assetManifest: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://receiz.com/standards/receiz.asset-manifest.schema.v1.json";
        readonly title: "Receiz Asset Manifest";
        readonly type: "object";
        readonly additionalProperties: true;
        readonly required: readonly ["schema", "assetId", "assetType", "proof", "links"];
        readonly properties: {
            readonly schema: {
                readonly const: "receiz.asset_manifest.v1";
            };
            readonly assetId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly assetType: {
                readonly enum: readonly ["proof_object", "sports_card", "signal_card", "wallet_note", "market_certificate", "profile_original", "document"];
            };
            readonly proof: {
                readonly type: "object";
                readonly required: readonly ["kind", "payloadVersion", "createdAtMs", "ts", "code", "slug", "verifyPath", "verifyUrl", "kaiPulseEternal", "kaiKlok", "receizClaimId", "sigilClaimSeed"];
                readonly additionalProperties: true;
                readonly properties: {
                    readonly kind: {
                        readonly const: "receiz.proof_bundle";
                    };
                    readonly payloadVersion: {
                        readonly enum: readonly ["v2", "v1"];
                    };
                    readonly createdAtMs: {
                        readonly type: "number";
                    };
                    readonly ts: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly code: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly slug: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly verifyPath: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly verifyUrl: {
                        readonly type: "string";
                    };
                    readonly kaiPulseEternal: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly kaiKlok: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly receizClaimId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly sigilClaimSeed: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
            };
            readonly owner: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly media: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly appends: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
            };
            readonly settlement: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly links: {
                readonly type: "object";
                readonly additionalProperties: {
                    readonly type: "string";
                };
            };
        };
    };
    readonly sportsCardManifest: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://receiz.com/standards/receiz.sports-card-manifest.schema.v1.json";
        readonly title: "Receiz Sports Arena Card Manifest";
        readonly type: "object";
        readonly additionalProperties: true;
        readonly required: readonly ["schema", "sport", "collectibleId", "claimHash", "card", "ownership", "valueBasis", "links"];
        readonly properties: {
            readonly schema: {
                readonly const: "receiz.sports_arena.card_manifest.v1";
            };
            readonly sport: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly collectibleId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly claimHash: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly card: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly ownership: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly valueBasis: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly appendSummary: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly eventProofSummary: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly links: {
                readonly type: "object";
                readonly additionalProperties: {
                    readonly type: "string";
                };
            };
        };
    };
    readonly webhookEvent: {
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://receiz.com/standards/receiz.webhook-event.schema.v1.json";
        readonly title: "Receiz Webhook Event";
        readonly type: "object";
        readonly additionalProperties: true;
        readonly required: readonly ["schema", "id", "type", "createdAt", "data"];
        readonly properties: {
            readonly schema: {
                readonly const: "receiz.webhook_event.v1";
            };
            readonly id: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly type: {
                readonly enum: readonly ["checkout.session.created", "checkout.session.completed", "payment.created", "payment.settled", "payment.failed", "payment.refunded", "order.created", "reward.claimed", "asset.created", "asset.transferred", "proof.appended", "sports_card.scored", "event_proof.created", "wallet.ledger_entry", "note.claimed", "ownership.transferred", "market.trade", "profile.asset.visible_changed", "app_state.published", "world.campaign.sent"];
            };
            readonly createdAt: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly data: {
                readonly type: "object";
                readonly additionalProperties: true;
            };
            readonly actor: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
            readonly signature: {
                readonly type: readonly ["object", "null"];
                readonly additionalProperties: true;
            };
        };
    };
};
type RequestOptions = {
    method?: string;
    body?: BodyInit | JsonObject | URLSearchParams;
    headers?: HeadersInit;
    bearerToken?: string | null;
};
export declare class ReceizHttpError extends ReceizError<`http_${number}`> {
    readonly status: number;
    readonly payload: unknown;
    constructor(status: number, payload: unknown);
}
export declare class ReceizValidationError extends ReceizError<"validation_failed"> {
    readonly issues: string[];
    constructor(label: string, issues: string[]);
}
export declare function appendQuery(path: string, query: Record<string, string | number | boolean | null | undefined>): string;
export declare function receizAppStateUrlFromHost(hostOrUrl: string): string;
export declare function receizAppStateNamespaceFromUrl(sourceUrl: string): string;
export declare function receizAppStateObjectIdFromUrl(sourceUrl: string, prefix?: string): string;
export declare function createReceizAppStateRecord(input: ReceizAppStateRecordInput): ReceizAppStateRecord;
export declare function createReceizAppStateFeed(records: Array<ReceizAppStateRecord | ReceizAppStateRecordInput>, options?: ReceizAppStateFeedOptions): ReceizAppStateFeed;
export declare function createReceizPublicStoreStateRecord(input: ReceizPublicStoreStateRecordInput): ReceizAppStateRecord;
export declare function createReceizTenantAppStateRecord(input: ReceizAppStateTenantPublishInput): ReceizAppStateRecord;
export declare function normalizeReceizHost(hostOrUrl: string): string;
export declare function verifyReceizWebhookRequest(request: Request, options: ReceizWebhookVerifyRequestOptions): Promise<boolean>;
export declare function parseReceizWebhookRequest(request: Request, options: ReceizWebhookVerifyRequestOptions): Promise<ReceizParsedWebhookRequest>;
export declare function routeReceizWebhookEvent<TResult = unknown>(event: ReceizWebhookEvent, handlers: ReceizWebhookEventHandlers<TResult>): Promise<TResult | undefined>;
export declare function extractReceizAppStateData<TData extends JsonObject = JsonObject>(input: ReceizAppStateRecordResponse<TData> | PublicProofTransportRecord<TData> | ReceizPublicProjectionRecord<TData> | null | undefined, options?: ReceizAppStateRestoreOptions): TData | null;
export declare function restoreReceizAppStateProjection<TData extends JsonObject = JsonObject>(input: ReceizAppStateRecordResponse<TData> | PublicProofTransportRecord<TData> | ReceizPublicProjectionRecord<TData> | null | undefined, options?: ReceizAppStateRestoreOptions): ReceizAppStateRestoreResult<TData>;
export declare class ReceizClient {
    #private;
    readonly baseUrl: string;
    readonly httpTransport: Readonly<{
        legacyConnectHttp: boolean;
    }>;
    private readonly accessToken;
    private readonly applicationId;
    private readonly fetchImpl;
    private readonly legacySubjectHttp;
    private readonly subjectRuntime;
    private readonly v124DomainsByApplication;
    private readonly v124NamespacesByApplication;
    private readonly v124RecipientsByApplication;
    private readonly exchangeProofAuthorityV123;
    private readonly remoteValueExecutionV123;
    private readonly v124Execution;
    private readonly v124RuntimeV124;
    private readonly v124SourcesV124;
    private readonly verifiedAdditionsV124;
    private readonly verifiedReplayV124;
    private readonly verifiedCheckpointV124;
    private readonly verifiedPrivateAdditionsV124;
    private readonly exportVerifiedReplayProofObjectV124;
    private readonly restoreVerifiedReplayProofObjectV124;
    private readonly resolveNamespacesV124;
    private readonly resolvePublicRecipientV124;
    private readonly publishSealedSourceV124;
    private v124ApplicationHintPath;
    private executionApplicationId;
    private v124DomainsFor;
    private v124NamespacesFor;
    private v124RecipientFor;
    readonly doctor: (options?: ReceizCapabilitiesOptions) => Promise<ReceizDoctorReport>;
    readonly execution: {
        stage: (planInput: import("./v124Contracts.js").ReceizOperationPlanV124) => Promise<Readonly<{
            schema: "receiz.durable-execution-handle.v124";
            executionId: string;
            applicationId: string;
            domainId: string;
            operationKind: string;
            exactPlanDigest: string;
            semanticIdempotencyKey: string;
            attemptId: string;
            stagedAtKaiUPulse: number;
            handleDigest: string;
            authority: Readonly<{
                handleIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
            receiptDigest: string;
        }>>;
        stagePrepared: (planInput: import("./v124Contracts.js").ReceizOperationPlanV124, transitionSetInput: import("./v124PortableAuthority.js").ReceizPortableExecutionTransitionSetV124) => Promise<Readonly<{
            schema: "receiz.durable-execution-handle.v124";
            executionId: string;
            applicationId: string;
            domainId: string;
            operationKind: string;
            exactPlanDigest: string;
            semanticIdempotencyKey: string;
            attemptId: string;
            stagedAtKaiUPulse: number;
            handleDigest: string;
            authority: Readonly<{
                handleIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
            receiptDigest: string;
        }>>;
        execute: (handle: import("./v124Execution.js").ReceizDurableExecutionHandleV124, authoritySession: unknown) => Promise<import("./v124Execution.js").ReceizExecutionOutcomeV124>;
        resolve: (input: import("./v124Execution.js").ReceizExecutionResolutionV124) => Promise<import("./v124Execution.js").ReceizExecutionOutcomeV124>;
        resolveByIdempotencyKey: (input: import("./v124Execution.js").ReceizExecutionIdempotencyCoordinatesV124) => Promise<import("./v124Execution.js").ReceizExecutionOutcomeV124>;
        cancel: (handle: import("./v124Execution.js").ReceizDurableExecutionHandleV124, authoritySession: unknown) => Promise<import("./v124Execution.js").ReceizZeroWriteFailureV124>;
        exportCommittedRecovery: typeof import("./v124Execution.js").exportReceizCommittedExecutionRecoveryV124;
        planAtomicOperationV124: typeof import("./v124Execution.js").planAtomicOperationV124;
        planAtomicMutation: typeof import("./v124Execution.js").planAtomicOperationV124;
    };
    readonly capabilities: ((options?: ReceizCapabilitiesOptions) => Promise<ReceizCapabilities>) & {
        describe: () => Promise<Readonly<{
            schema: "receiz.sdk.capability_descriptor.v1";
            version: "1.0.0";
            packageCompatibility: Readonly<{
                sdk: typeof import("./currentRelease.generated.js").RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
                mcp: typeof import("./currentRelease.generated.js").RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
            }>;
            entryPoints: Readonly<{
                universal: "@receiz/sdk";
                react: "@receiz/sdk/react";
                compiler: "@receiz/sdk/compiler";
                testing: "@receiz/sdk/testing";
            }>;
            rails: readonly import("./capabilities.js").ReceizCapabilityRailDescriptor[];
            authorityBoundary: "capability-description-is-not-proof-verification";
        }>>;
        probe: (options?: ReceizCapabilitiesOptions) => Promise<ReceizCapabilities>;
    };
    readonly auth: {
        grantedScopes: () => Promise<readonly string[]>;
        scopesForRails: (...rails: ReceizRailScopeKey[]) => string[];
        missingScopesForRails: (...rails: ReceizRailScopeKey[]) => Promise<string[]>;
        canUseRails: (...rails: ReceizRailScopeKey[]) => Promise<boolean>;
    };
    readonly verification: {
        verifyArtifact: (input: ReceizArtifactInput) => Promise<ReceizArtifactVerificationResult>;
        conformance: () => Promise<JsonObject>;
    };
    readonly admission: {
        createEngine: typeof createReceizAdmissionEngine;
        browserStore: typeof createReceizBrowserAdmissionStore;
    };
    readonly coordination: Readonly<{
        remoteDomain: (options: Readonly<{
            namespace: string;
            commitDomain: import("./artifactTransition.js").ReceizCommitDomainId;
        }>) => ReceizRemoteDomain;
    }>;
    readonly assets: Readonly<{
        createProofObject: (input: ReceizProofObjectCreateInput, options: ReceizProofObjectCreateOptions) => Promise<ReceizSealedArtifact>;
    }>;
    readonly artifacts: Readonly<{
        download: (artifact: ReceizSealedArtifact) => Promise<ReceizArtifactDownloadEvidence>;
        verifyAndOpen: (file: Blob) => Promise<ReceizOpenedArtifact>;
        admit: (verification: ReceizArtifactVerificationResult, options: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactAdmissionResult>;
        planRecovery: (admission: ReceizArtifactAdmissionResult, knownHistory?: ReceizVerifiedProofHistory) => Promise<ReceizArtifactRecoveryPlan | ReceizAuthorityFailure | null>;
        admitAndRecover: (verification: ReceizArtifactVerificationResult, options: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactRecoveryResult>;
        commitRecovery: (plan: ReceizArtifactRecoveryPlan, capability: ReceizVerifiedCapability, idempotencyKey: string, store: ReceizAdmissionStore) => Promise<ReceizArtifactRecoveryCommitResult>;
    }>;
    readonly publicProof: {
        observe: (body: PublicProofObserveRequest) => Promise<Readonly<Readonly<{
            id?: string;
            sourceUrl?: string;
            data?: JsonObject | null;
            authority: Readonly<{
                profile: "projection-only";
                projectionIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }> & Omit<PublicProofTransportRecord<JsonObject>, "id" | "sourceUrl" | "data"> & {
            schema?: string | null;
            state?: string | null;
            platform?: string | null;
            appNamespace?: string | null;
            appObjectId?: string | null;
            record?: JsonObject | null;
            data?: JsonObject | null;
        }>>;
        byUrl: (url: string) => Promise<Readonly<Readonly<{
            id?: string;
            sourceUrl?: string;
            data?: JsonObject | null;
            authority: Readonly<{
                profile: "projection-only";
                projectionIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }> & Omit<PublicProofTransportRecord<JsonObject>, "id" | "sourceUrl" | "data"> & {
            schema?: string | null;
            state?: string | null;
            platform?: string | null;
            appNamespace?: string | null;
            appObjectId?: string | null;
            record?: JsonObject | null;
            data?: JsonObject | null;
        }>>;
        byId: (id: string) => Promise<Readonly<Readonly<{
            id?: string;
            sourceUrl?: string;
            data?: JsonObject | null;
            authority: Readonly<{
                profile: "projection-only";
                projectionIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }> & Omit<PublicProofTransportRecord<JsonObject>, "id" | "sourceUrl" | "data"> & {
            schema?: string | null;
            state?: string | null;
            platform?: string | null;
            appNamespace?: string | null;
            appObjectId?: string | null;
            record?: JsonObject | null;
            data?: JsonObject | null;
        }>>;
        byCreator: (externalCreatorId: string) => Promise<Readonly<{
            ok: boolean;
            records: readonly ReceizPublicProjectionRecord[];
        }>>;
        registryFeed: (feed: PublicProofRegistryFeed, options?: {
            signature?: string;
        }) => Promise<ReceizAppStateFeedResponse<JsonObject>>;
    };
    readonly appState: {
        publish: (input: ReceizAppStatePublishInput, options?: {
            signature?: string;
            idempotencyKey?: string;
        }) => Promise<ReceizAppStateFeedResponse<JsonObject>>;
        publishRecord: (record: ReceizAppStateRecord | ReceizAppStateRecordInput, options?: ReceizAppStatePublishRecordOptions) => Promise<ReceizAppStateFeedResponse<JsonObject>>;
        resolve: <TData extends JsonObject = JsonObject>(input: ReceizAppStateResolveInput) => Promise<ReceizAppStateResolveResult<TData>>;
        byUrl: (url: string) => Promise<ReceizAppStateRecordResponse<JsonObject>>;
        byHost: (host: string) => Promise<ReceizAppStateRecordResponse<JsonObject>>;
        byCreator: (receizId: string) => Promise<ReceizAppStateCollectionResponse<JsonObject>>;
        byNamespace: (namespace: string) => Promise<ReceizAppStateCollectionResponse<JsonObject>>;
        byId: (id: string) => Promise<ReceizAppStateRecordResponse<JsonObject>>;
        restoreByUrl: <TData extends JsonObject = JsonObject>(url: string, options?: ReceizAppStateRestoreOptions) => Promise<ReceizAppStateRestoreResult<TData>>;
        restoreByHost: <TData extends JsonObject = JsonObject>(host: string, options?: ReceizAppStateRestoreOptions) => Promise<ReceizAppStateRestoreResult<TData>>;
        restoreById: <TData extends JsonObject = JsonObject>(id: string, options?: ReceizAppStateRestoreOptions) => Promise<ReceizAppStateRestoreResult<TData>>;
        createRecord: typeof createReceizAppStateRecord;
        createTenantRecord: typeof createReceizTenantAppStateRecord;
        createFeed: typeof createReceizAppStateFeed;
        createPublicStoreRecord: typeof createReceizPublicStoreStateRecord;
        urlFromHost: typeof receizAppStateUrlFromHost;
        namespaceFromUrl: typeof receizAppStateNamespaceFromUrl;
        objectIdFromUrl: typeof receizAppStateObjectIdFromUrl;
        extractData: typeof extractReceizAppStateData;
        restoreProjection: typeof restoreReceizAppStateProjection;
    };
    readonly publicStore: {
        publish: <TState extends JsonObject = JsonObject>(input: ReceizPublicStorePublishInput<TState>, options?: ReceizIdempotencyOptions) => Promise<ReceizAppStateFeedResponse<JsonObject>>;
        signPublish: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>) => Promise<ReceizPublicStoreSignedPublish<TState>>;
        publishSigned: <TState extends JsonObject = JsonObject>(signed: ReceizPublicStoreSignedPublish<TState>, options?: ReceizIdempotencyOptions) => Promise<ReceizPublicStoreAppendResult>;
        publishWithIdentityProof: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>, options?: ReceizIdempotencyOptions) => Promise<ReceizPublicStoreAppendResult>;
        restoreLatest: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreRestoreLatestInput) => Promise<ReceizPublicStoreResolveResult<TState>>;
        assertSignedPublishContract: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>) => Promise<ReceizPublicStoreSignedPublishContractResult>;
        resolve: <TState extends JsonObject = JsonObject>(input: ReceizPublicStoreResolveInput) => Promise<ReceizPublicStoreResolveResult<TState>>;
        createRecord: typeof createReceizPublicStoreStateRecord;
        scopes: readonly string[];
    };
    readonly sports: {
        conformance: () => Promise<JsonObject>;
        conformanceHistory: () => Promise<JsonObject>;
        conformanceRollups: (query?: {
            days?: number;
        }) => Promise<JsonObject>;
        badge: () => Promise<JsonObject>;
        eventProofUrl: (eventProofId: string) => string;
        assertCardManifest: typeof assertReceizSportsCardManifest;
        resolveCardMemory: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) => Promise<ReceizLocalFirstResult<TValue>>;
        resolvePitchDayProof: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) => Promise<ReceizLocalFirstResult<TValue>>;
    };
    readonly wallet: {
        publicLedger: (query?: {
            limit?: number;
            cursor?: string;
            since?: string;
        }) => Promise<WalletLedgerFeed>;
        actionLedger: (query?: {
            limit?: number;
            cursor?: string;
            since?: string;
        }) => Promise<ActionLedgerFeed>;
        resolveLedger: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) => Promise<ReceizLocalFirstResult<TValue>>;
    };
    readonly profile: {
        update: (input: ReceizProfileUpdateInput) => Promise<Readonly<{
            schema: "receiz.profile.update.result.v108";
            status: "updated";
            accountUid: string;
            profilePath: string;
            profile: Readonly<Record<string, unknown>>;
        }>>;
        resolveLocalFirst: <TValue extends JsonObject = JsonObject>(input: ReceizLocalFirstInput<TValue>) => Promise<ReceizLocalFirstResult<TValue>>;
    };
    private readonly remoteSubjectsV122;
    private readonly remoteWorldV122;
    readonly subjectMandates: Readonly<{
        issue: (input: Readonly<Record<string, unknown>>) => Promise<unknown>;
        state: (input: Readonly<{
            mandateId: string;
        }>) => Promise<unknown>;
        revoke: (input: Readonly<Record<string, unknown>> & {
            mandateId: string;
        }) => Promise<unknown>;
    }>;
    readonly value: {
        planSettlement: (input: Omit<Parameters<typeof import("./v122Value.js").planReceizValueIntentV122>[0], "rail">) => Promise<Readonly<{
            schema: "receiz.world.value-intent.v122";
            rail: import("./v122Value.js").ReceizValueRailV122;
            amountPhiMicro: string;
            usdPerPhiMicrocents: string;
            quotedUsdCents: string;
            priceBasisDigest: string;
            sourceProofObjectId: string;
            sourceValueHead: string;
            destinationSubjectId: string;
            expectedDestinationHead: string;
            idempotencyKey?: string;
            valueIntentDigest: string;
        }>>;
        planReserve: (input: Omit<Parameters<typeof import("./v122Value.js").planReceizValueIntentV122>[0], "rail">) => Promise<Readonly<{
            schema: "receiz.world.value-intent.v122";
            rail: import("./v122Value.js").ReceizValueRailV122;
            amountPhiMicro: string;
            usdPerPhiMicrocents: string;
            quotedUsdCents: string;
            priceBasisDigest: string;
            sourceProofObjectId: string;
            sourceValueHead: string;
            destinationSubjectId: string;
            expectedDestinationHead: string;
            idempotencyKey?: string;
            valueIntentDigest: string;
        }>>;
        quoteDisplayUsd: typeof quoteReceizDisplayUsdV122;
        validateDisplayPrice: typeof validateReceizDisplayPriceV122;
        validateIntent: typeof validateReceizValueIntentV122;
        executeSettlement: (intent: import("./v122Value.js").ReceizWorldValueIntentV122, authority: import("./v123ProofAuthority.js").ReceizProofAuthorityV123) => Promise<import("./v123ValueExecution.js").ReceizValueExecutionOutcomeV123>;
        executeReserve: (intent: import("./v122Value.js").ReceizWorldValueIntentV122, authority: import("./v123ProofAuthority.js").ReceizProofAuthorityV123) => Promise<import("./v123ValueExecution.js").ReceizValueExecutionOutcomeV123>;
        executionByIdempotencyKey: (idempotencyKey: string, authority?: import("./v123ProofAuthority.js").ReceizProofAuthorityV123) => Promise<import("./v123ValueExecution.js").ReceizValueExecutionOutcomeV123>;
        edge: {
            planSettlement: typeof planReceizEdgeSettlementTransferV125;
            planReserve: typeof planReceizEdgeReserveTransferV125;
            inspect: typeof inspectReceizEdgeValueTransferPlanV125;
            receiveSettlement: typeof receiveReceizEdgeSettlementV125;
            receiveReserve: typeof receiveReceizEdgeReserveV125;
            confirmSettlementSend: typeof confirmReceizEdgeSettlementSendV125;
            confirmReserveSend: typeof confirmReceizEdgeReserveSendV125;
            verifyTransitionSet: typeof verifyReceizPortableExecutionTransitionSetV124;
            prepareCommitSet: typeof prepareReceizPortableExecutionTransitionCommitSetV124;
            createRecovery: typeof createReceizPortableExecutionTransitionRecoveryV124;
        };
    };
    readonly attestations: {
        createAuthority: typeof createReceizAttestationAuthorityV125;
        createApplication: typeof createReceizAttestationApplicationV125;
        planInitialSource: typeof planReceizInitialAttestationSourceV125;
        applyInitialSource: typeof applyReceizInitialSourceV125;
        verifyHistory: typeof verifyReceizAttestationHistoryV125;
        planEvent: typeof planReceizAttestationEventV125;
        applyEvent: typeof applyReceizAttestationEventV125;
    };
    readonly credentials: {
        issue: typeof createReceizCredentialV125;
        planInitialSource: typeof planReceizInitialCredentialSourceV125;
        applyInitialSource: typeof applyReceizInitialSourceV125;
        verifyHistory: typeof verifyReceizCredentialHistoryV125;
        planLifecycle: typeof planReceizCredentialLifecycleEventV125;
        applyLifecycle: typeof applyReceizCredentialLifecycleEventV125;
        resolveCurrentness: typeof resolveReceizCredentialCurrentnessV125;
    };
    readonly presentations: {
        createSourceVerifier: typeof createReceizSourceBoundCredentialPresentationVerifierV125;
        createChallenge: typeof createReceizPbiCeremonyChallengeV125;
        approveChallenge: typeof approveReceizPbiCeremonyV125;
        issuePresenceReceipt: typeof issueReceizPbiCeremonyReceiptV125;
        verifyPresenceReceipt: typeof verifyReceizPbiCeremonyReceiptV125;
        createReplayGuard: typeof createReceizPbiCeremonyReplayGuardV125;
        create: typeof createReceizCredentialPresentationV125;
        verify: typeof verifyReceizCredentialPresentationV125;
        exportFile: typeof exportReceizCredentialPresentationFileV125;
        importFile: typeof importReceizCredentialPresentationFileV125;
        createContentUrl: typeof createReceizCredentialPresentationContentUrlV125;
        readContentUrl: typeof readReceizCredentialPresentationContentUrlV125;
        createQrHandoff: typeof createReceizCredentialPresentationQrHandoffV125;
        createNfcHandoff: typeof createReceizCredentialPresentationNfcHandoffV125;
    };
    readonly subjectCoordination: {
        sourceFamilies: {
            create: typeof createReceizSubjectSourceFamilyV125;
            open: typeof openReceizSubjectSourceFamilyV125;
            readMember: typeof readReceizSubjectSourceFamilyMemberV125;
        };
        prepareInitialTemporalSource: typeof prepareReceizInitialTemporalSubjectSourceV125;
        readTemporalSource: typeof readReceizTemporalSubjectSourceV125;
        readRelationshipSource: typeof readReceizSubjectRelationshipSourceV125;
        relationshipBindingDigest: typeof createReceizSubjectRelationshipEventBindingDigestV125;
        threadSources: {
            prepareInitial: typeof prepareReceizInitialTemporalConversationSourceV125;
            create: typeof createReceizSubjectThreadSourceFamilyV125;
            open: typeof openReceizSubjectThreadSourceFamilyV125;
            readMember: typeof readReceizSubjectThreadSourceMemberV125;
        };
        planMessage: typeof planReceizSubjectMessageEventV125;
        applyMessage: typeof applyReceizSubjectMessageEventV125;
        projectThread: typeof projectReceizSubjectThreadV125;
        planRelationship: typeof planReceizSubjectRelationshipEventV125;
        applyRelationship: typeof applyReceizSubjectRelationshipEventV125;
        projectRelationship: typeof projectReceizSubjectRelationshipV125;
        createPresence: typeof createReceizSubjectPresenceV125;
        presenceBindingDigest: typeof createReceizSubjectPresenceEventBindingDigestV125;
        planPresence: typeof planReceizSubjectPresenceEventV125;
        applyPresence: typeof applyReceizSubjectPresenceEventV125;
        projectPresence: typeof projectReceizSubjectPresenceV125;
        verifyPresence: typeof verifyReceizSubjectPresenceV125;
        resolvePresenceCurrentness: typeof resolveReceizSubjectPresenceCurrentnessV125;
        discover: typeof discoverReceizSubjectsV125;
    };
    readonly externalExecution: {
        createProfile: typeof createReceizExternalExecutionProfileV125;
        plan: typeof planReceizExternalExecutionV125;
        verifyPlan: typeof verifyReceizExternalExecutionPlanV125;
        createRuntime: typeof createReceizExternalExecutionRuntimeV125;
        verifyOutcome: typeof verifyReceizExternalExecutionOutcomeV125;
        profiles: {
            payment: Readonly<{
                schema: "receiz.external-execution.profile.v125";
                profileId: string;
                operationKind: import("./v125ExternalExecution.js").ReceizExternalExecutionKindV125;
                requestSchema: string;
                providerEvidenceSchema: string;
                requiredProofHeads: readonly string[];
                terminalMapping: Readonly<Record<string, import("./v125ExternalExecution.js").ReceizExternalExecutionTerminalStatusV125>>;
                privacy: Readonly<{
                    modelVisibleFields: readonly string[];
                }>;
                authority: Readonly<{
                    providerIsAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>;
            refund: Readonly<{
                schema: "receiz.external-execution.profile.v125";
                profileId: string;
                operationKind: import("./v125ExternalExecution.js").ReceizExternalExecutionKindV125;
                requestSchema: string;
                providerEvidenceSchema: string;
                requiredProofHeads: readonly string[];
                terminalMapping: Readonly<Record<string, import("./v125ExternalExecution.js").ReceizExternalExecutionTerminalStatusV125>>;
                privacy: Readonly<{
                    modelVisibleFields: readonly string[];
                }>;
                authority: Readonly<{
                    providerIsAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>;
            notification: Readonly<{
                schema: "receiz.external-execution.profile.v125";
                profileId: string;
                operationKind: import("./v125ExternalExecution.js").ReceizExternalExecutionKindV125;
                requestSchema: string;
                providerEvidenceSchema: string;
                requiredProofHeads: readonly string[];
                terminalMapping: Readonly<Record<string, import("./v125ExternalExecution.js").ReceizExternalExecutionTerminalStatusV125>>;
                privacy: Readonly<{
                    modelVisibleFields: readonly string[];
                }>;
                authority: Readonly<{
                    providerIsAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>;
        };
    };
    readonly subjects: {
        admit: (input: import("./v122Subjects.js").ReceizSubjectAdmissionInputV122) => Promise<import("./v122Subjects.js").ReceizSubjectAdmissionResultV122>;
        state: (subjectId: string) => Promise<import("./v122Subjects.js").ReceizSubjectStateV122>;
        exportEdgeBundle: (subjectId: string, verifier: import("./v122EdgeBundle.js").ReceizSubjectEdgeBundleVerifierV122) => Promise<import("./v122EdgeBundle.js").ReceizSubjectEdgeBundleV122>;
        importEdgeBundle: (bundle: import("./v122EdgeBundle.js").ReceizSubjectEdgeBundleV122, verifier: import("./v122EdgeBundle.js").ReceizSubjectEdgeBundleVerifierV122) => Promise<import("./v122RemoteSubjects.js").ReceizSubjectEdgeImportResultV122>;
        accessBinding: (subjectId: string) => Promise<import("./v122SubjectAccess.js").ReceizSubjectAccessPublicBindingV122>;
        publishAccessKey: (input: Readonly<{
            publicBinding: import("./v122SubjectAccess.js").ReceizSubjectAccessPublicBindingV122;
            expectedAccessKeyHead: string | null;
        }>) => Promise<Readonly<{
            ok: true;
            state: import("./v122Subjects.js").ReceizSubjectStateV122;
            publicBinding: import("./v122SubjectAccess.js").ReceizSubjectAccessPublicBindingV122;
        }> | Readonly<{
            ok: false;
            code: string;
            writes: 0;
        }>>;
        createAccessKey: (input: Readonly<{
            subjectId: string;
            edgeWrappingKey: Uint8Array;
            accessKeyHead?: string;
        }>) => Promise<Readonly<{
            accessKit: import("./v122SubjectAccess.js").ReceizSubjectAccessKitV122;
            publicBinding: import("./v122SubjectAccess.js").ReceizSubjectAccessPublicBindingV122;
            state: import("./v122Subjects.js").ReceizSubjectStateV122;
        }>>;
        resolveNamespaces: (input: import("./v123Namespaces.js").ReceizSubjectNamespaceResolutionInputV123) => Promise<import("./v123Namespaces.js").ReceizSubjectNamespaceResolutionResultV123>;
        resolveNamespacesV124: (input: ReceizResolveNamespacesInputV124) => Promise<Readonly<{
            schema: "receiz.subject.namespace-resolution.v123";
            subjectId: string;
            atHead: string;
            admittedProofDigest: string;
            ownershipHead: string;
            registryDigest: string;
            reducerDigest: string;
            namespaces: readonly Readonly<{
                name: string;
                found: boolean;
                exactBytesB64u: string | null;
                digest: string | null;
            }>[];
            authority: Readonly<{
                resolutionIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
            resolutionDigest: string;
        }>>;
        resolve: (subjectId: string) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subject: ReceizSubjectV1;
            exactBytesB64u: string;
            artifactDigest: string;
            registryDigest: string;
            reducerDigest: string;
            authority: Readonly<{
                artifactIsProofAuthority: true;
                modelOutputIsAuthority: false;
                indexIsAuthority: false;
            }>;
        }>>;
        verify: (subjectArtifact: ReceizSubjectArtifactV1) => Promise<Readonly<{
            valid: boolean;
            sourcePrimitive: "receiz.subject.v1";
        }>>;
        legacyState: (subjectId: string) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subjectId: string;
            proofObjectId: string;
            subjectType: string;
            ownerReceizId: string;
            identityDigest: string;
            genesisDigest: string;
            createdAtKai: string;
            head: string;
            ownershipHead: string;
            currentOwnerReceizId: string;
            namespaces: import("./livingSubjects.js").ReceizSubjectNamespaceBytesV1;
        }>>;
        history: (subjectId: string, query?: {
            afterHead?: string;
            limit?: number;
        }) => Promise<readonly Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        additions: (subjectId: string, query?: {
            afterHead?: string;
        }) => Promise<readonly Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        subscribe: (subjectId: string, query?: {
            afterHead?: string;
        }) => AsyncIterable<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>>;
        brain: {
            head: (subjectId: string) => Promise<Readonly<{
                schema: "receiz.subject.proof_brain.v1";
                subjectId: string;
                subjectDigest: string;
                subjectHead: string;
                historyHead: string;
                indexRoot: string;
                objectMerkleRoot: string;
                objectCount: string;
                operationCount: string;
                maximumKai: string;
                priorBrainHead: string | null;
                fibonacci: import("./compositeProofKernel.js").ReceizCompositeFibonacciState;
                registryDigest: string;
                reducerDigest: string;
                authority: Readonly<{
                    brainHeadIsProofAuthority: false;
                    indexIsProofAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>>;
            search: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => Promise<readonly Readonly<{
                schema: "receiz.subject.proof_reference.v1";
                subjectId: string;
                subjectHead: string;
                proofObjectId: string;
                objectDigest: string;
                kai: string;
                score: number;
                matchedTerms: readonly string[];
                eventIds: readonly string[];
                membership: Readonly<{
                    objectOrdinal: number;
                    objectMerkleRoot: string;
                    indexRoot: string;
                }>;
            }>[]>;
            resolve: (subjectId: string, input: Readonly<{
                atHead: string;
                references: readonly ReceizSubjectProofReferenceV1[];
            }>) => Promise<Readonly<{
                schema: "receiz.subject.proof_context.v1";
                head: ReceizSubjectProofBrainHeadV1;
                references: readonly ReceizSubjectProofReferenceV1[];
                primaryObjects: readonly import("./livingSubjects.js").ReceizSubjectPrimaryProofObjectV1[];
                passages: readonly import("./livingSubjects.js").ReceizSubjectProofPassageV1[];
                receipt: import("./livingSubjects.js").ReceizSubjectProofRetrievalReceiptV1;
            }>>;
            stream: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => AsyncIterable<ReceizSubjectProofBrainStreamEvent>;
        };
        twin: {
            profile: (subjectId: string) => Promise<Readonly<{
                subjectId: string;
                subjectType: string;
                head: string;
                brainHead: ReceizSubjectProofBrainHeadV1;
            }>>;
            message: (subjectId: string, input: ReceizSubjectTwinMessageInput) => Promise<Readonly<{
                schema: "receiz.subject.twin_result.v1";
                subjectId: string;
                subjectHead: string;
                spokenResponse: string;
                proposedIntent: import("./livingSubjects.js").ReceizSubjectIntentV1;
                observedFacts: readonly Readonly<{
                    fact: string;
                    eventIds: readonly string[];
                    proofObjectIds: readonly string[];
                }>[];
                proofDerivedMemories: readonly Readonly<{
                    memoryId: string;
                    summary: string;
                    eventIds: readonly string[];
                }>[];
                performance: Readonly<Record<string, unknown>> | null;
                proofContext: ReceizSubjectProofContextV1;
                worldEventIds: readonly [];
                authority: Readonly<{
                    modelOutputIsWorldEvent: false;
                    deterministicAdmissionRequired: true;
                }>;
            }>>;
            stream: (subjectId: string, input: ReceizSubjectTwinMessageInput) => AsyncIterable<ReceizSubjectTwinStreamEvent>;
            exportMind: (subjectId: string) => Promise<Readonly<{
                schema: "receiz.subject.mind.v1";
                subjectArtifact: ReceizSubjectArtifactV1;
                brainHead: ReceizSubjectProofBrainHeadV1;
                portableWindow: readonly import("./livingSubjects.js").ReceizSubjectPrimaryProofObjectV1[];
                completeHistory: Readonly<{
                    objectCount: string;
                    objectMerkleRoot: string;
                    indexRoot: string;
                    contentAddress: string;
                    primaryObjectsRequiredForReasoning: true;
                }>;
                publicMemoryIds: readonly string[];
                privateMemoryIds: readonly string[];
                priorMindHead: string | null;
                mindDigest: string;
                exactBytesB64u: string;
                registryDigest: string;
                reducerDigest: string;
            }>>;
            importMind: (subjectId: string, artifact: ReceizSubjectMindArtifactV1 | ReceizV127SubjectRuntimeSource) => Promise<Readonly<{
                ok: boolean;
                subjectId?: string;
                mindDigest?: string;
                head?: string;
                code?: string;
                writes?: number;
            }>>;
            memorySummary: (subjectId: string) => Promise<Readonly<{
                subjectId: string;
                head: string;
                counts: Readonly<Record<string, number>>;
                projectionDigest: string;
            }>>;
            streamPerformance: (subjectId: string, input: ReceizSubjectTwinMessageInput) => AsyncIterable<ReceizSubjectTwinStreamEvent>;
        };
        mandates: {
            get: (subjectId: string) => Promise<readonly Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            plan: (subjectId: string, policy: ReceizSubjectMandatePolicyV1) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>>;
            activate: (plan: ReceizSubjectMandateV1, ownerCapability: ReceizSubjectCapabilityV1) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>>;
            pause: (subjectId: string) => Promise<readonly Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            revoke: (subjectId: string) => Promise<readonly Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            explain: (subjectId: string) => Promise<Readonly<{
                subjectId: string;
                currentKai: string;
                mandates: readonly (ReceizSubjectMandateV1 & {
                    executable: boolean;
                })[];
            }>>;
        };
        runtime: {
            enqueueTick: (input: ReceizSubjectRuntimeTickInput) => Promise<Readonly<{
                jobId: string;
                input: ReceizSubjectRuntimeTickInput;
                status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                leaseUntilKai: string | null;
                attemptCount: number;
                eventIds: readonly string[];
                failureCode: string | null;
            }>>;
            status: (jobId: string) => Promise<Readonly<{
                jobId: string;
                input: ReceizSubjectRuntimeTickInput;
                status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                leaseUntilKai: string | null;
                attemptCount: number;
                eventIds: readonly string[];
                failureCode: string | null;
            }>>;
            pause: (subjectId: string) => Promise<Readonly<{
                subjectId: string;
                cancelledJobIds: readonly string[];
                writes: number;
            }>>;
            catchUp: (subjectId: string, input?: Readonly<{
                maximumTicks?: number;
                throughKai?: string;
                worldId?: string;
            }>) => Promise<Readonly<{
                subjectId: string;
                processed: number;
                jobs: readonly ReceizSubjectRuntimeJobV1[];
            }>>;
        };
        memory: {
            query: (subjectId: string, input?: Readonly<{
                types?: readonly string[];
                visibility?: "public" | "private" | "all";
                afterKai?: string;
                limit?: number;
            }>) => Promise<readonly Readonly<{
                schema: "receiz.subject.memory_event.v1";
                memoryId: string;
                subjectId: string;
                type: import("./livingSubjects.js").ReceizSubjectMemoryType;
                summary: string;
                eventIds: readonly string[];
                proofObjectIds: readonly string[];
                visibility: "public" | "private";
                head: string;
                kai: string;
            }>[]>;
            project: (subjectId: string, input: Readonly<{
                throughHead: string;
            }>) => Promise<Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>>;
            citations: (subjectId: string, memoryId: string) => Promise<Readonly<{
                memoryId: string;
                eventIds: readonly string[];
                proofObjectIds: readonly string[];
            }>>;
            compact: (subjectId: string, input?: Readonly<{
                throughHead?: string;
            }>) => Promise<Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>>;
        };
        relationships: {
            list: (subjectId: string) => Promise<readonly Readonly<{
                schema: "receiz.subject.relationship.v1";
                relationshipId: string;
                subjectIds: readonly [string, string];
                status: "proposed" | "active" | "declined" | "blocked";
                familiarity: number;
                trust: number;
                rivalry: number;
                affection: number;
                mentorship: number;
                visibility: "public" | "private";
                eventIds: readonly string[];
                head: string;
            }>[]>;
            propose: (input: Readonly<{
                subjectId: string;
                targetSubjectId: string;
                visibility?: "public" | "private";
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
            }>) => Promise<Readonly<{
                schema: "receiz.world.transaction.v1";
                transactionId: string;
                transactionDigest: string;
                worldId: string;
                participants: readonly string[];
                expectedHeads: Readonly<Record<string, string>>;
                commands: readonly ReceizWorldCommandV1[];
                registryDigest: string;
                reducerDigest: string;
            }>>;
            respond: (input: Readonly<{
                subjectId: string;
                targetSubjectId: string;
                response: "accept" | "decline";
                visibility?: "public" | "private";
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                authority: ReceizWorldAuthorityV1;
            }>) => Promise<ReceizWorldExecutionResultV1>;
            history: (subjectId: string) => Promise<readonly Readonly<{
                schema: "receiz.world.event.v1";
                eventId: string;
                commandId: string;
                worldId: string;
                kind: string;
                actorSubjectId: string;
                participantSubjectIds: readonly string[];
                payload: Readonly<Record<string, unknown>>;
                causalParents: readonly string[];
                priorHeads: Readonly<Record<string, string>>;
                nextHeads: Readonly<Record<string, string>>;
                priorWorldHead: string;
                worldHead: string;
                mandateDigest?: string;
                kai: string;
                registryDigest: string;
                reducerDigest: string;
            }>[]>;
        };
        inventory: {
            list: (subjectId: string) => Promise<Readonly<{
                schema: "receiz.subject.inventory.v1";
                subjectId: string;
                head: string;
                items: readonly import("./livingSubjects.js").ReceizSubjectInventoryItemV1[];
            }>>;
            use: (input: Readonly<{
                subjectId: string;
                itemId: string;
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                authority: ReceizWorldAuthorityV1;
            }>) => Promise<ReceizWorldExecutionResultV1>;
        };
        trades: {
            preview: (input: Readonly<{
                fromSubjectId: string;
                toSubjectId: string;
                itemId: string;
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                mandateDigest?: string;
            }>) => Promise<Readonly<{
                transaction: ReceizWorldTransactionV1;
                requiresOwnerApproval: boolean;
                previewDigest: string;
            }>>;
            execute: (input: Readonly<{
                previewDigest: string;
                transaction: ReceizWorldTransactionV1;
                authority: ReceizWorldAuthorityV1;
            }>) => Promise<ReceizWorldExecutionResultV1>;
        };
    };
    /** Explicit local V120 admission and state; never aliases modern V122 state. */
    readonly localSubjects: {
        admit: (source: ReceizV127SubjectRuntimeSource) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subject: ReceizSubjectV1;
            exactBytesB64u: string;
            artifactDigest: string;
            registryDigest: string;
            reducerDigest: string;
            authority: Readonly<{
                artifactIsProofAuthority: true;
                modelOutputIsAuthority: false;
                indexIsAuthority: false;
            }>;
        }>>;
        state: (subjectId: string) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subjectId: string;
            proofObjectId: string;
            subjectType: string;
            ownerReceizId: string;
            identityDigest: string;
            genesisDigest: string;
            createdAtKai: string;
            head: string;
            ownershipHead: string;
            currentOwnerReceizId: string;
            namespaces: import("./livingSubjects.js").ReceizSubjectNamespaceBytesV1;
        }>>;
        importSnapshot: (source: ReceizV127SubjectRuntimeSource) => Promise<{
            subjectIds: string[];
            snapshotDigest: string;
        }>;
        exportSnapshot: () => Promise<Readonly<{
            schema: "receiz.subject.portable-runtime.v127";
            version: "127.0.0";
            snapshot: import("./livingSubjectRuntime.js").ReceizLivingSubjectRuntimeSnapshotV1;
            snapshotDigest: string;
            sourceArtifacts: import("./v127SubjectRuntimeAdapter.js").ReceizV127SubjectRuntimeRecord["sources"];
            temporalEvidence: Readonly<{
                legacyKaiUnit: "kai-pulse";
                historicalKaiAuthority: "not-retroactively-proved";
                transitions: NonNullable<import("./v127SubjectRuntimeAdapter.js").ReceizV127SubjectRuntimeRecord["temporalTransitions"]>;
            }>;
        }>>;
    };
    private requireLocalSubjectRuntime;
    readonly world: {
        planCommandV122: typeof import("./v122Transactions.js").planReceizWorldCommandV122;
        planTransactionV122: typeof import("./v122Transactions.js").planReceizWorldTransactionV122;
        planPrivateCommand: typeof import("./v122PrivateWorld.js").planReceizPrivateCommandV122;
        planAccessAppend: typeof planReceizWorldAccessAppendV122;
        validateTransaction: (transaction: import("./v122Transactions.js").ReceizWorldTransactionV122) => Promise<unknown>;
        executeTransactionV122: (input: Readonly<Record<string, unknown>>) => Promise<import("./v122Transactions.js").ReceizExecutionOutcomeV122>;
        execution: (input: Readonly<{
            worldId: string;
            transactionId: string;
        }>) => Promise<import("./v122Transactions.js").ReceizExecutionOutcomeV122>;
        executionByIdempotencyKey: (input: Readonly<{
            worldId: string;
            idempotencyKey: string;
        }>) => Promise<import("./v122Transactions.js").ReceizExecutionOutcomeV122>;
        additionsV122: (input: Readonly<{
            worldId: string;
            afterHead?: string;
        }>) => Promise<unknown>;
        planMultiWorldTransaction: typeof import("./v122MultiWorld.js").planReceizMultiWorldTransactionV122;
        executeMultiWorldTransaction: (input: Readonly<Record<string, unknown>>) => Promise<import("./v122Transactions.js").ReceizExecutionOutcomeV122>;
        publicSnapshot: () => Promise<ReceizWorldPublicSnapshotResponse>;
        profile: (username: string, query?: ReceizWorldProfileQuery) => Promise<ReceizWorldProfileResponse>;
        message: (username: string, body: ReceizWorldProfileMessageRequest) => Promise<ReceizWorldProfileResponse>;
        welcome: (username: string, body?: Omit<ReceizWorldProfileMessageRequest, "action" | "message">) => Promise<ReceizWorldProfileResponse>;
        book: (username: string, body: Omit<ReceizWorldProfileMessageRequest, "action">) => Promise<ReceizWorldProfileResponse>;
        streamProfile: (username: string, body: ReceizWorldProfileMessageRequest) => AsyncIterable<ReceizWorldProfileStreamEvent>;
        planCommand: (input: ReceizWorldCommandInputV1) => Promise<Readonly<{
            schema: "receiz.world.command_plan.v1";
            planId: string;
            planDigest: string;
            command: ReceizWorldCommandV1;
            priorHeads: Readonly<Record<string, string>>;
            worldHead: string;
            registryDigest: string;
            reducerDigest: string;
            writesOnFailure: 0;
        }>>;
        validateCommand: (plan: ReceizWorldCommandPlanV1) => Promise<Readonly<{
            ok: boolean;
            writes: 0;
            planDigest?: string;
            code?: string;
        }>>;
        executeCommand: (plan: ReceizWorldCommandPlanV1, authority: ReceizWorldAuthorityV1) => Promise<ReceizWorldExecutionResultV1>;
        receipt: (receiptId: string) => Promise<Readonly<{
            schema: "receiz.world.receipt.v1";
            receiptId: string;
            commandId: string;
            attemptId: string;
            eventIds: readonly string[];
            actorSubjectId: string;
            mandateDigest?: string;
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            worldHead: string;
            reducerDigest: string;
            registryDigest: string;
            kai: string;
        }>>;
        replay: (input: Readonly<{
            worldId: string;
            throughHead?: string;
        }>) => Promise<Readonly<{
            schema: "receiz.world.checkpoint.v1";
            worldId: string;
            throughHead: string;
            events: readonly ReceizWorldEventV1[];
            subjectHeads: Readonly<Record<string, string>>;
            checkpointDigest: string;
            registryDigest: string;
            reducerDigest: string;
        }>>;
        planTransaction: (input: Readonly<{
            participants: readonly string[];
            expectedHeads: Readonly<Record<string, string>>;
            commands: readonly ReceizWorldCommandV1[];
        }>) => Promise<Readonly<{
            schema: "receiz.world.transaction.v1";
            transactionId: string;
            transactionDigest: string;
            worldId: string;
            participants: readonly string[];
            expectedHeads: Readonly<Record<string, string>>;
            commands: readonly ReceizWorldCommandV1[];
            registryDigest: string;
            reducerDigest: string;
        }>>;
        executeTransaction: (plan: ReceizWorldTransactionV1, authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1) => Promise<ReceizWorldExecutionResultV1>;
        additions: (input: Readonly<{
            worldId: string;
            afterHead?: string;
            types?: readonly string[];
        }>) => Promise<readonly Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        subscribe: (input: Readonly<{
            worldId: string;
            afterHead?: string;
            types?: readonly string[];
        }>) => AsyncIterable<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>>;
    };
    /** Historical V120 instrument protocol. These six methods require an
     * explicitly configured compatibility HTTP host; the local same-owner host
     * does not provide cross-owner coordination. Current canonical artifact
     * claims use ownership.claimBearerAsset({ artifact }) and its existing
     * carried-continuity verifier and one-claim coordinator. Protocol heads are
     * never translated between these operations. */
    readonly bearer: {
        previewTransfer: (input: Readonly<{
            subjectId: string;
            policy: ReceizBearerTransferPolicyV1;
        }>) => Promise<Readonly<{
            schema: "receiz.bearer.transfer_plan.v1";
            transferId: string;
            transferDigest: string;
            subjectId: string;
            subjectDigest: string;
            expectedSubjectHead: string;
            expectedOwnershipHead: string;
            currentOwnerReceizId: string;
            policy: ReceizBearerTransferPolicyV1;
            policyDigest: string;
            registryDigest: string;
            reducerDigest: string;
        }>>;
        issueTransferInstrument: (input: Readonly<{
            plan: ReceizBearerTransferPlanV1;
            ownerCapability: ReceizBearerCapabilityV1;
        }>) => Promise<Readonly<{
            schema: "receiz.bearer.instrument.v1";
            plan: ReceizBearerTransferPlanV1;
            oneTimeClaimDigest: string;
            issuedAtKai: string;
            exactBytesB64u: string;
            artifactDigest: string;
            status: "issued" | "pending-acceptance" | "claimed" | "cancelled" | "expired";
        }>>;
        inspectInstrument: (artifact: ReceizBearerInstrumentV1) => Promise<Readonly<{
            valid: boolean;
            offlineVerified: boolean;
            instrument: ReceizBearerInstrumentV1;
            sourcePrimitive: "receiz.bearer.instrument.v1";
            registryDigest: string;
            reducerDigest: string;
        }>>;
        claimInstrument: (artifact: ReceizBearerInstrumentV1, recipientCapability: ReceizBearerCapabilityV1) => Promise<Readonly<{
            ok: true;
            receipt: ReceizBearerTransferReceiptV1;
            idempotent: boolean;
        } | {
            ok: false;
            code: string;
            writes: 0;
        }>>;
        cancelTransfer: (transferId: string, ownerCapability: ReceizBearerCapabilityV1) => Promise<Readonly<{
            ok: boolean;
            transferId?: string;
            status?: string;
            head?: string;
            code?: string;
            writes?: 0;
        }>>;
        transferStatus: (transferId: string) => Promise<Readonly<{
            transferId: string;
            status: string;
            subjectId: string;
            instrumentDigest: string;
            receiptId: string | null;
        }>>;
    };
    readonly connect: {
        wallet: () => Promise<ConnectWalletResponse>;
        record: ReceizConnectRecordOperation;
        verifyArtifact: (file: Blob) => Promise<DocumentVerifyResponse>;
        transfer: (body: ConnectTransferRequest, options?: {
            idempotencyKey?: string;
        }) => Promise<ConnectTransferResponse>;
        checkout: (body: CheckoutRequest) => Promise<CheckoutSessionResponse>;
        checkoutSession: (query: {
            checkoutSessionId?: string;
            sessionId?: string;
        }) => Promise<CheckoutSessionResponse>;
        mintNote: (body: JsonObject) => Promise<JsonObject>;
        claimNote: (body: JsonObject) => Promise<JsonObject>;
        downloadNote: (noteId: string) => Promise<Blob>;
    };
    readonly twin: {
        marketMandate: () => Promise<TwinMarketMandateResponse>;
        saveMarketMandate: (body: SaveTwinMarketMandateInput) => Promise<TwinMarketMandateResponse>;
        marketIntents: () => Promise<TwinMarketIntentsResponse>;
        createMarketIntent: (body: CreateTwinMarketIntentInput) => Promise<TwinMarketIntentResponse>;
        approveMarketIntent: (intentId: string) => Promise<TwinMarketIntentResponse>;
        exportMind: () => Promise<Blob>;
        importMindSummary: () => Promise<TwinMindImportSummaryResponse>;
        importMind: (file: Blob) => Promise<TwinMindImportSummaryResponse>;
        approval: () => Promise<TwinApprovalResponse>;
        approvePromotion: (body: TwinPromotionApprovalInput) => Promise<TwinApprovalResponse>;
    };
    readonly identity: {
        createReceizId: typeof createReceizIdIdentity;
        readArtifact: typeof readReceizIdentityArtifact;
        projectAccount: typeof projectReceizIdentityAccount;
        signLoginProof: typeof signReceizIdentityLoginProof;
        signCapability: typeof signReceizCapability;
        verifyLoginProof: typeof verifyReceizIdentityLoginProof;
        exchangeProofAuthority: (input: import("./v123ProofAuthority.js").ReceizProofAuthorityExchangeInputV123) => Promise<import("./v123ProofAuthority.js").ReceizProofAuthorityV123>;
        resolvePublicRecipientV124: (input: ReceizPublicRecipientResolutionInputV124) => Promise<import("./v124Recipient.js").ReceizPublicRecipientResolutionV124>;
        resolvePublicRecipient: (input: ReceizPublicRecipientResolutionInputV124) => Promise<import("./v124Recipient.js").ReceizPublicRecipientResolutionV124>;
        buildReceizIdContinueRequest: typeof buildReceizIdContinueRequest;
        continueReceizId: (identity: ReceizDeviceIdentity, options?: ReceizIdContinueOptions) => Promise<JsonObject>;
        checkUsernameAvailability: (username: string) => Promise<Readonly<{
            normalized: string;
            available: boolean;
            isCurrent: boolean;
            reason: "ok" | "invalid" | "taken";
            suggestions: readonly string[];
        }>>;
        updateProfile: (input: ReceizProfileUpdateInput) => Promise<Readonly<{
            schema: "receiz.profile.update.result.v108";
            status: "updated";
            accountUid: string;
            profilePath: string;
            profile: Readonly<Record<string, unknown>>;
        }>>;
        openIdConfiguration: () => Promise<JsonObject>;
        oauthAuthorizationServerMetadata: () => Promise<JsonObject>;
        jwks: () => Promise<JsonObject>;
        userinfo: () => Promise<JsonObject>;
        token: (body: OidcTokenRequest, options?: {
            authorization?: string;
        }) => Promise<OidcTokenResponse>;
        introspect: (body: Record<string, string>, options?: {
            authorization?: string;
        }) => Promise<JsonObject>;
        revoke: (body: Record<string, string>, options?: {
            authorization?: string;
        }) => Promise<JsonObject>;
        bootstrap: (username: string) => Promise<JsonObject>;
        authorizeUrl: (options: ReceizAuthorizeUrlOptions) => string;
        ensureTenantSession: (input: ReceizEnsureTenantSessionInput) => ReceizEnsureTenantSessionResult;
    };
    readonly customers: {
        bootstrapSession: (body: ReceizCustomerSessionBootstrapRequest, options?: ReceizIdempotencyOptions) => Promise<ReceizCustomerSessionBootstrapResponse>;
        bootstrap: (body: ReceizCustomerSessionBootstrapRequest, options?: ReceizIdempotencyOptions) => Promise<ReceizCustomerSessionBootstrapResponse>;
        session: (body: ReceizCustomerSessionRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        portal: (body: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
        orders: (query?: ReceizSearchRequest) => Promise<JsonObject>;
        rewards: (query?: ReceizSearchRequest) => Promise<JsonObject>;
        assets: (query?: ReceizSearchRequest) => Promise<JsonObject>;
    };
    readonly merchants: {
        onboard: (body: ReceizMerchantOnboardRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        profile: (query?: {
            tenantHost?: string;
        }) => Promise<JsonObject>;
        capabilities: (query?: {
            tenantHost?: string;
        }) => Promise<JsonObject>;
    };
    readonly commerce: {
        oneClickCheckout: (body: ReceizOneClickCheckoutRequest) => Promise<ReceizOneClickCheckoutResponse>;
        refunds: {
            create: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        subscriptions: {
            create: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            cancel: (subscriptionId: string, body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        shipping: {
            quote: (body: ReceizCommerceRuntimeRequest) => Promise<JsonObject>;
            update: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        tax: {
            quote: (body: ReceizCommerceRuntimeRequest) => Promise<JsonObject>;
        };
        discounts: {
            create: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            redeem: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        giftCards: {
            issue: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            redeem: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        accessPasses: {
            issue: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            verify: (body: ReceizCommerceRuntimeRequest) => Promise<JsonObject>;
        };
        inventory: {
            reserve: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            adjust: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        fulfillment: {
            update: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        };
        payouts: {
            create: (body: ReceizCommerceRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
            status: (query?: {
                tenantHost?: string;
                payoutId?: string;
            }) => Promise<JsonObject>;
        };
    };
    readonly payments: {
        embeddedCheckout: (body: CheckoutRequest) => Promise<CheckoutSessionResponse>;
        embeddedNoteClaim: (body: JsonObject) => Promise<JsonObject>;
    };
    readonly media: {
        upload: (file: Blob, options?: ReceizMediaUploadOptions) => Promise<ReceizMediaUploadResponse>;
        transform: (body: ReceizMediaTransformRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        objectUrl: (query: {
            bucket: string;
            path: string;
        }) => string;
    };
    readonly domains: {
        verifiedAdditionsV124: (input: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
            schema: "receiz.domain.replay.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            afterHead: string | null;
            afterCursor: number;
            cursor: number;
            priorHead: string;
            head: string;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
            receiptDigest: string;
            authority: Readonly<{
                replayIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedAdditions: (input: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
            schema: "receiz.domain.replay.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            afterHead: string | null;
            afterCursor: number;
            cursor: number;
            priorHead: string;
            head: string;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
            receiptDigest: string;
            authority: Readonly<{
                replayIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedReplayV124: (input: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
            schema: "receiz.domain.replay.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            afterHead: string | null;
            afterCursor: number;
            cursor: number;
            priorHead: string;
            head: string;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
            receiptDigest: string;
            authority: Readonly<{
                replayIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedReplay: (input: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
            schema: "receiz.domain.replay.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            afterHead: string | null;
            afterCursor: number;
            cursor: number;
            priorHead: string;
            head: string;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
            receiptDigest: string;
            authority: Readonly<{
                replayIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedCheckpointV124: (input: Readonly<{
            applicationId: string;
            domainId: string;
            throughHead: string;
        }>) => Promise<Readonly<{
            schema: "receiz.domain.checkpoint.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            throughHead: string;
            cursor: number;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            exactCheckpointBytesB64u: string;
            checkpointDigest: string;
            receiptDigest: string;
            authority: Readonly<{
                checkpointIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedCheckpoint: (input: Readonly<{
            applicationId: string;
            domainId: string;
            throughHead: string;
        }>) => Promise<Readonly<{
            schema: "receiz.domain.checkpoint.v124";
            status: "authenticated";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            throughHead: string;
            cursor: number;
            namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
            exactCheckpointBytesB64u: string;
            checkpointDigest: string;
            receiptDigest: string;
            authority: Readonly<{
                checkpointIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        verifiedPrivateAdditionsV124: (input: ReceizPrivateDomainAdditionsInputV124) => Promise<import("./v124Domains.js").ReceizPrivateDomainAdditionsResultV124>;
        verifiedPrivateAdditions: (input: ReceizPrivateDomainAdditionsInputV124) => Promise<import("./v124Domains.js").ReceizPrivateDomainAdditionsResultV124>;
        exportVerifiedReplayProofObjectV124: (input: ReceizDomainReplayProofObjectExportInputV124) => Promise<Readonly<{
            schema: "receiz.domain-replay-proof-object-export.v124";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            throughHead: string;
            cursor: number;
            namespace: import("./v124ReplayProofObject.js").ReceizDomainReplayNamespaceHeadV124;
            portableAssetDigest: string;
            proofObject: Readonly<{
                assetType: "proof_object";
                payload: Readonly<{
                    mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
                    bytes: Uint8Array;
                }>;
            }>;
            authority: Readonly<{
                exportIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        exportVerifiedReplayProofObject: (input: ReceizDomainReplayProofObjectExportInputV124) => Promise<Readonly<{
            schema: "receiz.domain-replay-proof-object-export.v124";
            applicationId: string;
            domainId: string;
            registryDigest: string;
            reducerDigest: string;
            throughHead: string;
            cursor: number;
            namespace: import("./v124ReplayProofObject.js").ReceizDomainReplayNamespaceHeadV124;
            portableAssetDigest: string;
            proofObject: Readonly<{
                assetType: "proof_object";
                payload: Readonly<{
                    mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
                    bytes: Uint8Array;
                }>;
            }>;
            authority: Readonly<{
                exportIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        restoreVerifiedReplayProofObjectV124: (input: ReceizDomainReplayProofObjectRestoreInputV124) => Promise<Readonly<{
            schema: "receiz.domain-replay-proof-object-restoration.v124";
            status: "restored";
            replay: import("./v124Replay.js").ReceizDomainReplayV124;
            checkpoint: import("./v124Replay.js").ReceizCheckpointV124 | null;
            sourceArtifactSha256: string;
            checkpointSourceArtifactSha256: string | null;
            headDigest: string;
            sourceAuthority: import("./v124ReplayProofObject.js").ReceizDomainReplaySourceAuthorityV124;
            authority: Readonly<{
                restorationIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        restoreVerifiedReplayProofObject: (input: ReceizDomainReplayProofObjectRestoreInputV124) => Promise<Readonly<{
            schema: "receiz.domain-replay-proof-object-restoration.v124";
            status: "restored";
            replay: import("./v124Replay.js").ReceizDomainReplayV124;
            checkpoint: import("./v124Replay.js").ReceizCheckpointV124 | null;
            sourceArtifactSha256: string;
            checkpointSourceArtifactSha256: string | null;
            headDigest: string;
            sourceAuthority: import("./v124ReplayProofObject.js").ReceizDomainReplaySourceAuthorityV124;
            authority: Readonly<{
                restorationIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        normalizeHost: typeof normalizeReceizHost;
        tenantUrl: typeof receizAppStateUrlFromHost;
        namespace: typeof receizAppStateNamespaceFromUrl;
        objectId: typeof receizAppStateObjectIdFromUrl;
        resolveTenant: <TData extends JsonObject = JsonObject>(host: string, options?: ReceizAppStateRestoreOptions) => Promise<ReceizAppStateRestoreResult<TData>>;
        reserveSubdomain: (body: JsonObject, options?: {
            idempotencyKey?: string;
        }) => Promise<JsonObject>;
        verifyCustomDomain: (body: JsonObject, options?: {
            idempotencyKey?: string;
        }) => Promise<JsonObject>;
        status: (query?: {
            host?: string;
            domain?: string;
        }) => Promise<JsonObject>;
    };
    readonly sources: {
        publishSealedSourceV124: (input: ReceizPublishSealedSourceInputV124) => Promise<Readonly<{
            schema: "receiz.sealed-source-publication-result.v124";
            status: "published" | "idempotent";
            sourceKind: import("./v124Sources.js").ReceizSealedSourcePublicationKindV124;
            artifactSha256: string;
            sourceBindingDigest: string;
            authority: Readonly<{
                publicationIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
        publishSealedSource: (input: ReceizPublishSealedSourceInputV124) => Promise<Readonly<{
            schema: "receiz.sealed-source-publication-result.v124";
            status: "published" | "idempotent";
            sourceKind: import("./v124Sources.js").ReceizSealedSourcePublicationKindV124;
            artifactSha256: string;
            sourceBindingDigest: string;
            authority: Readonly<{
                publicationIsProofAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>>;
    };
    readonly events: {
        subscribe: (body: ReceizEventSubscribeRequest) => Promise<JsonObject>;
        replay: (body: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
        list: (query?: ReceizSearchRequest) => Promise<JsonObject>;
        ack: (eventId: string, body?: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
    };
    readonly proof: {
        query: (query: ReceizProofQuery) => Promise<JsonObject>;
    };
    readonly jobs: {
        enqueue: (body: ReceizJobRequest) => Promise<JsonObject>;
        status: (jobId: string) => Promise<JsonObject>;
        cancel: (jobId: string, body?: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
        list: (query?: ReceizSearchRequest) => Promise<JsonObject>;
    };
    readonly permissions: {
        grant: (body: ReceizPermissionGrantRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        revoke: (body: ReceizPermissionGrantRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        check: (body: ReceizPermissionCheckRequest) => Promise<JsonObject>;
        roles: (query?: {
            tenantHost?: string;
        }) => Promise<JsonObject>;
    };
    readonly audit: {
        append: (body: ReceizAuditAppendRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        query: (query?: ReceizSearchRequest) => Promise<JsonObject>;
        export: (query?: ReceizSearchRequest) => Promise<JsonObject>;
    };
    readonly risk: {
        scorePayment: (body: ReceizCommerceRuntimeRequest) => Promise<JsonObject>;
        scoreAccountRecovery: (body: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
        velocity: (body: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
        proofActivity: (body: ReceizTenantRuntimeRequest) => Promise<JsonObject>;
    };
    readonly compliance: {
        exportOrders: (query: ReceizSearchRequest) => Promise<JsonObject>;
        exportTaxes: (query: ReceizSearchRequest) => Promise<JsonObject>;
        exportPayouts: (query: ReceizSearchRequest) => Promise<JsonObject>;
        exportCustomers: (query: ReceizSearchRequest) => Promise<JsonObject>;
        exportAudit: (query: ReceizSearchRequest) => Promise<JsonObject>;
    };
    readonly portability: {
        exportStore: (query: {
            tenantHost: string;
        }) => Promise<JsonObject>;
        importStore: (body: ReceizTenantRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
    };
    readonly search: {
        query: (body: ReceizSearchRequest) => Promise<JsonObject>;
        products: (body: ReceizSearchRequest) => Promise<JsonObject>;
        pages: (body: ReceizSearchRequest) => Promise<JsonObject>;
        blog: (body: ReceizSearchRequest) => Promise<JsonObject>;
        orders: (body: ReceizSearchRequest) => Promise<JsonObject>;
        customers: (body: ReceizSearchRequest) => Promise<JsonObject>;
        proofObjects: (body: ReceizSearchRequest) => Promise<JsonObject>;
    };
    readonly notifications: {
        send: (body: ReceizTenantRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        subscribe: (body: ReceizTenantRuntimeRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        templates: (query?: {
            tenantHost?: string;
        }) => Promise<JsonObject>;
    };
    readonly releases: {
        pin: (body: ReceizReleasePinRequest, options?: ReceizIdempotencyOptions) => Promise<JsonObject>;
        check: (query?: {
            tenantHost?: string;
        }) => Promise<JsonObject>;
        supported: () => Promise<JsonObject>;
    };
    readonly webhookEndpoints: {
        list: () => Promise<ReceizWebhookEndpointListResponse>;
        create: (body: ReceizWebhookEndpointCreateInput) => Promise<ReceizWebhookEndpointCreateResponse>;
        update: (endpointId: string, body: ReceizWebhookEndpointUpdateInput) => Promise<ReceizWebhookEndpointMutationResponse>;
        delete: (endpointId: string) => Promise<ReceizWebhookEndpointDeleteResponse>;
        rotateSecret: (endpointId: string) => Promise<ReceizWebhookEndpointRotateResponse>;
        sendTest: (endpointId: string, body: ReceizWebhookEndpointTestInput) => Promise<ReceizWebhookEndpointTestResponse>;
    };
    readonly webhooks: {
        sign: typeof createReceizWebhookSignature;
        verify: typeof verifyReceizWebhookRequest;
        parseRequest: typeof parseReceizWebhookRequest;
        routeEvent: typeof routeReceizWebhookEvent;
        verifySignature: typeof verifyReceizWebhookSignature;
        signaturePayload: typeof buildReceizWebhookSignaturePayload;
        assertEvent: typeof assertReceizWebhookEvent;
        eventGroups: readonly [{
            readonly key: "payment";
            readonly title: "Payment events";
            readonly detail: "Checkout, payment settlement, refund, and failure events for Receiz Payments.";
            readonly events: readonly ["checkout.session.created", "checkout.session.completed", "payment.created", "payment.settled", "payment.failed", "payment.refunded"];
        }, {
            readonly key: "commerce";
            readonly title: "Commerce events";
            readonly detail: "Order and reward events for store, app runtime, and customer automations.";
            readonly events: readonly ["order.created", "reward.claimed"];
        }, {
            readonly key: "proof";
            readonly title: "Proof events";
            readonly detail: "Proof object, asset, event proof, and Sports card append events.";
            readonly events: readonly ["asset.created", "asset.transferred", "proof.appended", "event_proof.created", "sports_card.scored"];
        }, {
            readonly key: "ownershipSettlement";
            readonly title: "Ownership and settlement events";
            readonly detail: "Wallet, note, transfer, and ownership events beneath proof-native value rails.";
            readonly events: readonly ["wallet.ledger_entry", "note.claimed", "ownership.transferred", "market.trade"];
        }, {
            readonly key: "appProfile";
            readonly title: "App and profile events";
            readonly detail: "Public app-state, profile visibility, and World campaign events.";
            readonly events: readonly ["profile.asset.visible_changed", "app_state.published", "world.campaign.sent"];
        }];
        eventTypes: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded" | "order.created" | "reward.claimed" | "asset.created" | "asset.transferred" | "proof.appended" | "event_proof.created" | "sports_card.scored" | "wallet.ledger_entry" | "note.claimed" | "ownership.transferred" | "market.trade" | "profile.asset.visible_changed" | "app_state.published" | "world.campaign.sent")[];
        presets: {
            payment: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded")[];
            commerce: ("order.created" | "reward.claimed")[];
            proofSettlement: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded" | "asset.created" | "asset.transferred" | "proof.appended" | "event_proof.created" | "sports_card.scored" | "wallet.ledger_entry" | "note.claimed" | "ownership.transferred" | "market.trade")[];
            everything: ("checkout.session.created" | "checkout.session.completed" | "payment.created" | "payment.settled" | "payment.failed" | "payment.refunded" | "order.created" | "reward.claimed" | "asset.created" | "asset.transferred" | "proof.appended" | "event_proof.created" | "sports_card.scored" | "wallet.ledger_entry" | "note.claimed" | "ownership.transferred" | "market.trade" | "profile.asset.visible_changed" | "app_state.published" | "world.campaign.sent")[];
        };
        endpoints: {
            list: () => Promise<ReceizWebhookEndpointListResponse>;
            create: (body: ReceizWebhookEndpointCreateInput) => Promise<ReceizWebhookEndpointCreateResponse>;
            update: (endpointId: string, body: ReceizWebhookEndpointUpdateInput) => Promise<ReceizWebhookEndpointMutationResponse>;
            delete: (endpointId: string) => Promise<ReceizWebhookEndpointDeleteResponse>;
            rotateSecret: (endpointId: string) => Promise<ReceizWebhookEndpointRotateResponse>;
            sendTest: (endpointId: string, body: ReceizWebhookEndpointTestInput) => Promise<ReceizWebhookEndpointTestResponse>;
        };
    };
    readonly manifests: {
        assertAsset: typeof assertReceizAssetManifest;
        assertSportsCard: typeof assertReceizSportsCardManifest;
        assertWebhookEvent: typeof assertReceizWebhookEvent;
        isAsset: typeof isReceizAssetManifest;
        isSportsCard: typeof isReceizSportsCardManifest;
        isWebhookEvent: typeof isReceizWebhookEvent;
        projectAsset: typeof projectReceizAssetManifest;
        projectSportsCard: typeof projectReceizSportsCardManifest;
    };
    readonly schemas: {
        readonly assetManifest: {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema";
            readonly $id: "https://receiz.com/standards/receiz.asset-manifest.schema.v1.json";
            readonly title: "Receiz Asset Manifest";
            readonly type: "object";
            readonly additionalProperties: true;
            readonly required: readonly ["schema", "assetId", "assetType", "proof", "links"];
            readonly properties: {
                readonly schema: {
                    readonly const: "receiz.asset_manifest.v1";
                };
                readonly assetId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly assetType: {
                    readonly enum: readonly ["proof_object", "sports_card", "signal_card", "wallet_note", "market_certificate", "profile_original", "document"];
                };
                readonly proof: {
                    readonly type: "object";
                    readonly required: readonly ["kind", "payloadVersion", "createdAtMs", "ts", "code", "slug", "verifyPath", "verifyUrl", "kaiPulseEternal", "kaiKlok", "receizClaimId", "sigilClaimSeed"];
                    readonly additionalProperties: true;
                    readonly properties: {
                        readonly kind: {
                            readonly const: "receiz.proof_bundle";
                        };
                        readonly payloadVersion: {
                            readonly enum: readonly ["v2", "v1"];
                        };
                        readonly createdAtMs: {
                            readonly type: "number";
                        };
                        readonly ts: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly code: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly slug: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly verifyPath: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly verifyUrl: {
                            readonly type: "string";
                        };
                        readonly kaiPulseEternal: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly kaiKlok: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly receizClaimId: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                        readonly sigilClaimSeed: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                };
                readonly owner: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly media: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly appends: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                };
                readonly settlement: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly links: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly sportsCardManifest: {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema";
            readonly $id: "https://receiz.com/standards/receiz.sports-card-manifest.schema.v1.json";
            readonly title: "Receiz Sports Arena Card Manifest";
            readonly type: "object";
            readonly additionalProperties: true;
            readonly required: readonly ["schema", "sport", "collectibleId", "claimHash", "card", "ownership", "valueBasis", "links"];
            readonly properties: {
                readonly schema: {
                    readonly const: "receiz.sports_arena.card_manifest.v1";
                };
                readonly sport: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly collectibleId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly claimHash: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly card: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
                readonly ownership: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
                readonly valueBasis: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
                readonly appendSummary: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly eventProofSummary: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly links: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly webhookEvent: {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema";
            readonly $id: "https://receiz.com/standards/receiz.webhook-event.schema.v1.json";
            readonly title: "Receiz Webhook Event";
            readonly type: "object";
            readonly additionalProperties: true;
            readonly required: readonly ["schema", "id", "type", "createdAt", "data"];
            readonly properties: {
                readonly schema: {
                    readonly const: "receiz.webhook_event.v1";
                };
                readonly id: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly type: {
                    readonly enum: readonly ["checkout.session.created", "checkout.session.completed", "payment.created", "payment.settled", "payment.failed", "payment.refunded", "order.created", "reward.claimed", "asset.created", "asset.transferred", "proof.appended", "sports_card.scored", "event_proof.created", "wallet.ledger_entry", "note.claimed", "ownership.transferred", "market.trade", "profile.asset.visible_changed", "app_state.published", "world.campaign.sent"];
                };
                readonly createdAt: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly data: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
                readonly actor: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
                readonly signature: {
                    readonly type: readonly ["object", "null"];
                    readonly additionalProperties: true;
                };
            };
        };
    };
    readonly projections: {
        assetManifest: typeof projectReceizAssetManifest;
        sportsCardManifest: typeof projectReceizSportsCardManifest;
    };
    readonly sandbox: {
        seedStore: (options: ReceizSandboxStoreOptions) => ReceizSandboxStore;
        wallet: (options?: {
            balanceUsdCents?: string;
            balancePhiMicro?: string;
        }) => {
            ok: boolean;
            userId: string;
            balanceUsdCents: string;
            balancePhiMicro: string;
        };
        checkout: (options: ReceizSandboxCheckoutOptions) => {
            ok: boolean;
            checkoutSessionId: string;
            status: string;
            amountUsd: string;
        };
    };
    readonly proofMemory: {
        createRegister: typeof createReceizProofRegister;
        createMemory: typeof createReceizProofMemory;
        createInMemoryStorage: typeof createReceizInMemoryProofMemoryStorage;
        createLocalStorage: typeof createReceizLocalStorageProofMemoryStorage;
        assertSnapshot: typeof assertReceizProofRegisterSnapshot;
        additionsQuery: typeof receizProofMemoryAdditionsQuery;
        syncAdditions: (input: ReceizProofMemorySyncInput) => Promise<ReceizProofMemorySyncResult>;
    };
    readonly runtime: {
        localFirst: (input?: ReceizRuntimeLocalFirstInput) => Promise<ReceizRuntimeLocalFirstResult>;
        openAuthoritySessionV124: (input: import("./v124Runtime.js").ReceizOpenAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionV124>;
        openAuthoritySession: (input: import("./v124Runtime.js").ReceizOpenAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionV124>;
        refreshAuthoritySessionV124: (input: import("./v124Runtime.js").ReceizRefreshAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionV124>;
        refreshAuthoritySession: (input: import("./v124Runtime.js").ReceizRefreshAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionV124>;
        closeAuthoritySessionV124: (input: import("./v124Runtime.js").ReceizCloseAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionClosedV124>;
        closeAuthoritySession: (input: import("./v124Runtime.js").ReceizCloseAuthoritySessionInputV124) => Promise<import("./v124Runtime.js").ReceizAuthoritySessionClosedV124>;
        qualifyV124: (input: import("./v124Runtime.js").ReceizOperationalQualificationInputV124) => Promise<import("./v124Runtime.js").ReceizOperationalCapabilityReportV124>;
        qualify: (input: import("./v124Runtime.js").ReceizOperationalQualificationInputV124) => Promise<import("./v124Runtime.js").ReceizOperationalCapabilityReportV124>;
    };
    readonly offline: {
        createQueue: typeof createReceizOfflineProofQueue;
        createInMemoryStorage: typeof createReceizInMemoryOfflineProofQueueStorage;
        createLocalStorage: typeof createReceizLocalStorageOfflineProofQueueStorage;
        assertSnapshot: typeof assertReceizOfflineProofQueueSnapshot;
    };
    readonly ownership: Readonly<{
        claimBearerAsset: (input: ReceizBearerArtifactClaimInput) => Promise<ReceizSealedArtifact>;
    }>;
    constructor(options?: ReceizClientOptions);
    private readGrantedScopesV123;
    private verifyReturnedCoordinationArtifact;
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    private updateProfile;
    private checkUsernameAvailability;
    verifyArtifact(input: ReceizArtifactInput): Promise<ReceizArtifactVerificationResult>;
    private verifyArtifactDuringIssuance;
    createProofObject(input: ReceizProofObjectCreateInput, options: ReceizProofObjectCreateOptions): Promise<ReceizSealedArtifact>;
    private claimBearerAsset;
    private admitArtifact;
    private verifyAndOpenArtifact;
    publicWalletLedger(query?: {
        limit?: number;
        cursor?: string;
        since?: string;
    }): Promise<WalletLedgerFeed>;
    observePublicProof(body: PublicProofObserveRequest): Promise<ReceizPublicProjectionRecord>;
    readPublicProofByUrl(url: string): Promise<ReceizPublicProjectionRecord>;
    readPublicProofById(id: string): Promise<ReceizPublicProjectionRecord>;
    readPublicProofByCreator(externalCreatorId: string): Promise<Readonly<{
        ok: boolean;
        records: readonly ReceizPublicProjectionRecord[];
    }>>;
    inspectCapabilities(options?: ReceizCapabilitiesOptions): Promise<ReceizCapabilities>;
    runDoctor(options?: ReceizCapabilitiesOptions): Promise<ReceizDoctorReport>;
    publishAppState(feed: ReceizAppStateFeed, options?: {
        signature?: string;
        idempotencyKey?: string;
    }): Promise<ReceizAppStateFeedResponse>;
    publishAppStateInput(input: ReceizAppStatePublishInput, options?: {
        signature?: string;
        idempotencyKey?: string;
    }): Promise<ReceizAppStateFeedResponse>;
    publishAppStateRecord(record: ReceizAppStateRecord | ReceizAppStateRecordInput, options?: ReceizAppStatePublishRecordOptions): Promise<ReceizAppStateFeedResponse>;
    readAppStateByUrl(url: string): Promise<ReceizAppStateRecordResponse>;
    readAppStateByHost(host: string): Promise<ReceizAppStateRecordResponse>;
    readAppStateByCreator(receizId: string): Promise<ReceizAppStateCollectionResponse>;
    readAppStateByNamespace(namespace: string): Promise<ReceizAppStateCollectionResponse>;
    readAppStateById(id: string): Promise<ReceizAppStateRecordResponse>;
    restoreAppStateByUrl<TData extends JsonObject = JsonObject>(url: string, options?: ReceizAppStateRestoreOptions): Promise<ReceizAppStateRestoreResult<TData>>;
    restoreAppStateByHost<TData extends JsonObject = JsonObject>(host: string, options?: ReceizAppStateRestoreOptions): Promise<ReceizAppStateRestoreResult<TData>>;
    restoreAppStateById<TData extends JsonObject = JsonObject>(id: string, options?: ReceizAppStateRestoreOptions): Promise<ReceizAppStateRestoreResult<TData>>;
    resolveAppState<TData extends JsonObject = JsonObject>(input: ReceizAppStateResolveInput): Promise<ReceizAppStateResolveResult<TData>>;
    publishPublicStore<TState extends JsonObject = JsonObject>(input: ReceizPublicStorePublishInput<TState>, options?: ReceizIdempotencyOptions): Promise<ReceizAppStateFeedResponse>;
    signPublicStorePublish<TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>): Promise<ReceizPublicStoreSignedPublish<TState>>;
    publishSignedPublicStore<TState extends JsonObject = JsonObject>(signed: ReceizPublicStoreSignedPublish<TState>, options?: ReceizIdempotencyOptions): Promise<ReceizPublicStoreAppendResult>;
    publishPublicStoreWithIdentityProof<TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>, options?: ReceizIdempotencyOptions): Promise<ReceizPublicStoreAppendResult>;
    assertPublicStoreSignedPublishContract<TState extends JsonObject = JsonObject>(input: ReceizPublicStoreSignedPublishInput<TState>): Promise<ReceizPublicStoreSignedPublishContractResult>;
    resolvePublicStore<TState extends JsonObject = JsonObject>(input: ReceizPublicStoreResolveInput): Promise<ReceizPublicStoreResolveResult<TState>>;
    restoreLatestPublicStore<TState extends JsonObject = JsonObject>(input: ReceizPublicStoreRestoreLatestInput): Promise<ReceizPublicStoreResolveResult<TState>>;
    syncProofMemoryAdditions(input: ReceizProofMemorySyncInput): Promise<ReceizProofMemorySyncResult>;
    resolveLocalFirstSurface<TValue>(surface: string, input: ReceizLocalFirstInput<TValue>): Promise<ReceizLocalFirstResult<TValue>>;
    runtimeLocalFirst(input?: ReceizRuntimeLocalFirstInput): Promise<ReceizRuntimeLocalFirstResult>;
    bootstrapCustomerSession(body: ReceizCustomerSessionBootstrapRequest, options?: ReceizIdempotencyOptions): Promise<ReceizCustomerSessionBootstrapResponse>;
    oneClickCheckout(body: ReceizOneClickCheckoutRequest): Promise<ReceizOneClickCheckoutResponse>;
    uploadMedia(file: Blob, options?: ReceizMediaUploadOptions): Promise<ReceizMediaUploadResponse>;
    eventSubscribe(body: ReceizEventSubscribeRequest): Promise<JsonObject>;
    listWebhookEndpoints(): Promise<ReceizWebhookEndpointListResponse>;
    createWebhookEndpoint(body: ReceizWebhookEndpointCreateInput): Promise<ReceizWebhookEndpointCreateResponse>;
    updateWebhookEndpoint(endpointId: string, body: ReceizWebhookEndpointUpdateInput): Promise<ReceizWebhookEndpointMutationResponse>;
    deleteWebhookEndpoint(endpointId: string): Promise<ReceizWebhookEndpointDeleteResponse>;
    rotateWebhookEndpointSecret(endpointId: string): Promise<ReceizWebhookEndpointRotateResponse>;
    sendWebhookEndpointTest(endpointId: string, body: ReceizWebhookEndpointTestInput): Promise<ReceizWebhookEndpointTestResponse>;
    sportsConformance(): Promise<JsonObject>;
    signalCircuitConformance(): Promise<JsonObject>;
    delegated<T>(path: string, options?: Omit<RequestOptions, "bearerToken">): Promise<T>;
    private assertHistoricalConnectTransport;
    private delegatedWrite;
    private delegatedRecord;
    private delegatedBinaryResponse;
    private delegatedBlob;
    private delegatedTwinMindImport;
    private streamJsonEvents;
    continueReceizId(identity: ReceizDeviceIdentity, options?: ReceizIdContinueOptions): Promise<JsonObject>;
    authorizeUrl(options: ReceizAuthorizeUrlOptions): string;
    ensureTenantSession(input: ReceizEnsureTenantSessionInput): ReceizEnsureTenantSessionResult;
    private delegatedVerifyArtifact;
    private connectTransfer;
}
export declare function createReceizClient(options?: ReceizClientOptions): ReceizClient;
export declare const RECEIZ_SDK_CLIENT_CAPABILITY_ROOTS: readonly ["doctor", "execution", "capabilities", "auth", "verification", "admission", "coordination", "assets", "artifacts", "publicProof", "appState", "publicStore", "sports", "wallet", "profile", "value", "subjects", "localSubjects", "world", "bearer", "connect", "twin", "identity", "customers", "merchants", "commerce", "payments", "media", "domains", "sources", "events", "proof", "jobs", "permissions", "audit", "risk", "compliance", "portability", "search", "notifications", "releases", "webhookEndpoints", "webhooks", "manifests", "schemas", "projections", "sandbox", "proofMemory", "runtime", "offline", "ownership", "attestations", "credentials", "presentations", "subjectCoordination", "externalExecution"];
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
export declare function describeReceizSdkClientCapabilityInventory(client?: ReceizClient): ReceizSdkClientCapabilityInventory;
export declare function admitReceizArtifact(verification: ReceizArtifactVerificationResult, options: ReceizArtifactAdmissionOptions): Promise<ReceizArtifactAdmissionResult>;
export declare const admitAndRecoverReceizArtifact: (verification: unknown, options: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactRecoveryResult>;
export declare function loadReceizOpenApi(baseUrl?: string, fetchImpl?: typeof fetch): Promise<JsonObject>;
export declare function assertReceizProofBundle(value: unknown): ReceizProofBundle;
export declare function isReceizProofBundle(value: unknown): value is ReceizProofBundle;
export declare function assertReceizAssetManifest(value: unknown): ReceizAssetManifest;
export declare function isReceizAssetManifest(value: unknown): value is ReceizAssetManifest;
export declare function assertReceizSportsCardManifest(value: unknown): ReceizSportsCardManifest;
export declare function isReceizSportsCardManifest(value: unknown): value is ReceizSportsCardManifest;
export declare function assertReceizWebhookEvent(value: unknown): ReceizWebhookEvent;
export declare function isReceizWebhookEvent(value: unknown): value is ReceizWebhookEvent;
export declare function projectReceizAssetManifest(value: unknown): ReceizAssetManifestProjection;
export declare function projectReceizSportsCardManifest(value: unknown): ReceizSportsCardManifestProjection;
export declare function assertReceizProofRegisterSnapshot(value: unknown): ReceizProofRegisterSnapshot;
export declare class ReceizProofRegister {
    readonly ownerId: string | null;
    readonly createdAt: string;
    private readonly entriesById;
    constructor(input?: ReceizProofRegisterInput);
    append(entry: ReceizProofRegisterEntry): this;
    admit(value: unknown): this;
    admitAssetManifest(value: unknown): this;
    admitSportsCardManifest(value: unknown): this;
    admitWebhookEvent(value: unknown): this;
    has(entryId: string): boolean;
    entries(): ReceizProofRegisterEntry[];
    snapshot(): ReceizProofRegisterSnapshot;
    toJSON(): ReceizProofRegisterSnapshot;
}
export declare function createReceizProofRegister(input?: ReceizProofRegisterInput): ReceizProofRegister;
export declare class ReceizProofMemory {
    readonly register: ReceizProofRegister;
    private readonly storage;
    private readonly autoPersist;
    private readonly onPersistError;
    private readonly onObservation;
    private persistChain;
    constructor(register: ReceizProofRegister, options?: Pick<ReceizProofMemoryOptions, "storage" | "autoPersist" | "onPersistError" | "onObservation">);
    append(entry: ReceizProofRegisterEntry): this;
    admit(value: unknown): this;
    admitAssetManifest(value: unknown): this;
    admitSportsCardManifest(value: unknown): this;
    admitWebhookEvent(value: unknown): this;
    has(entryId: string): boolean;
    entries(): ReceizProofRegisterEntry[];
    snapshot(): ReceizProofRegisterSnapshot;
    knownHead(limit?: number): ReceizProofMemoryAdditionsQuery;
    persist(): Promise<ReceizProofRegisterSnapshot>;
    flush(): Promise<void>;
    clear(): Promise<void>;
    toJSON(): ReceizProofRegisterSnapshot;
    private schedulePersist;
    private observe;
}
export declare function createReceizProofMemory(options?: ReceizProofMemoryOptions): Promise<ReceizProofMemory>;
export declare function createReceizInMemoryProofMemoryStorage(initialValue?: ReceizProofMemoryStorageValue): ReceizInMemoryProofMemoryStorage;
export declare function createReceizLocalStorageProofMemoryStorage(key?: string, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined): ReceizProofMemoryStorage;
export declare function receizProofMemoryAdditionsQuery(value: ReceizProofRegister | ReceizProofRegisterSnapshot | ReceizProofMemory, limit?: number): ReceizProofMemoryAdditionsQuery;
export declare function assertReceizOfflineProofQueueSnapshot(value: unknown): ReceizOfflineProofQueueSnapshot;
export declare class ReceizOfflineProofQueue {
    readonly ownerId: string | null;
    readonly createdAt: string;
    private pendingItems;
    private settledItems;
    private failedItems;
    private readonly storage;
    constructor(options?: ReceizOfflineProofQueueOptions);
    enqueue(item: ReceizOfflineProofQueueItem): this;
    snapshot(): ReceizOfflineProofQueueSnapshot;
    flush(): Promise<ReceizOfflineProofQueueSnapshot>;
    clear(): Promise<void>;
    replay(client: ReceizClient): Promise<{
        ok: boolean;
        settled: number;
        failed: number;
    }>;
    toJSON(): ReceizOfflineProofQueueSnapshot;
}
export declare function createReceizOfflineProofQueue(options?: ReceizOfflineProofQueueOptions): Promise<ReceizOfflineProofQueue>;
export declare function createReceizInMemoryOfflineProofQueueStorage(initialValue?: ReceizOfflineProofQueueStorageValue): ReceizInMemoryOfflineProofQueueStorage;
export declare function createReceizLocalStorageOfflineProofQueueStorage(key?: string, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined): ReceizOfflineProofQueueStorage;
export declare function buildReceizWebhookSignaturePayload(input: {
    timestamp: string;
    body: string | ArrayBuffer | Uint8Array | JsonObject;
}): string;
export declare function createReceizWebhookSignature(input: ReceizWebhookSignatureInput): Promise<string>;
export declare function verifyReceizWebhookSignature(input: ReceizWebhookVerifyInput): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map