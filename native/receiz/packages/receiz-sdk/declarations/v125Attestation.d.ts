import type { ReceizArtifactAppendPlan, ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { type ReceizSealedLifecycleContextV125, type ReceizSealedLifecycleExecutionV125 } from "./v125SealedLifecycle.js";
import { type ReceizIdentityLoginProof } from "./identity.js";
import { type ReceizSubjectArtifactV1 } from "./livingSubjects.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizV125EnclosingArtifactBinding, type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { type ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { type ReceizAttestationActorActionV125, type ReceizAttestationDomainV125, type ReceizClaimSetV125, type ReceizEvidenceBundleV125 } from "./v125AttestationSchemas.js";
export type { ReceizV125EnclosingArtifactBinding, ReceizV125EnclosingArtifactVerifierOptions, } from "./v125ArtifactBinding.js";
export { createReceizAttestationAuthorityV125, signReceizAttestationRoleGrantV125, } from "./v125AttestationAuthority.js";
export type { ReceizAttestationAuthorityOptionsV125, ReceizAttestationAuthorityV125, ReceizAttestationDomainAuthorityProofV125, ReceizAttestationEvidenceArtifactV125, ReceizAttestationEvidenceReferenceV125, ReceizAttestationRoleGrantV125, } from "./v125AttestationAuthority.js";
export type ReceizAttestationStatusV125 = "draft" | "submitted" | "evidence_requested" | "evaluation_complete" | "review_complete" | "approval_pending" | "approval_complete" | "issued" | "denied" | "withdrawn" | "expired";
export type ReceizAttestationEventKindV125 = ReceizAttestationActorActionV125;
export type ReceizAttestationEvaluationRuleOutcomeV125 = Readonly<{
    ruleId: string;
    evidenceCount: number;
    satisfied: boolean;
    outcomeCode: string;
}>;
export type ReceizAttestationActorAuthorizationV125 = Readonly<{
    schema: "receiz.attestation.actor-authorization.v125";
    subjectArtifact: ReceizSubjectArtifactV1;
    proofObjectId: string;
    subjectArtifactDigest: string;
    acceptedSubjectHead: string;
    grantDigest: string;
    actorKeyId: string;
    actorKeyAlg: "Ed25519" | "P-256";
    actorPublicKeyRawB64u: string;
}>;
export type ReceizAttestationActorAuthorizationCoordinateV125 = Readonly<{
    actorReceizId: string;
    actorRole: string;
    kind: ReceizAttestationEventKindV125;
    eventKai: string;
    domain: ReceizAttestationDomainV125;
    credentialType: string;
}>;
export type ReceizAttestationIssuanceEvidenceV125 = Readonly<{
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
}>;
export type ReceizAttestationIssuanceAdmissionV125 = Readonly<{
    schema: "receiz.attestation.issuance-admission.v125";
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
    state: ReceizAttestationApplicationStateV125;
    authority: Readonly<{
        admissionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizOpenedAttestationArtifactV125 = ReceizV125EnclosingArtifactBinding & Readonly<{
    schema: "receiz.opened-attestation-artifact.v125";
    acceptedHead: string;
    state: ReceizAttestationApplicationStateV125;
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizAttestationEvidenceRequestV125 = Readonly<{
    evidenceType: string;
    requestDigest: string;
}>;
export type ReceizAttestationEventPayloadV125 = Readonly<{
    schema: "receiz.attestation.submitted.v125";
    claimSetDigest: string;
    evidenceBundleDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.evidence-request.v125";
    evidenceType: string;
    requestDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.evidence-submission.v125";
    requestDigest: string;
    evidenceBundle: ReceizEvidenceBundleV125;
}> | Readonly<{
    schema: "receiz.attestation.evaluation.v125";
    evidenceBundleDigest: string;
    evidenceBundleHead: string;
    evaluatorImplementationDigest: string;
    ruleOutcomes: readonly ReceizAttestationEvaluationRuleOutcomeV125[];
    evaluationDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.review.v125";
    reviewDigest: string;
    outcomeCode: string;
}> | Readonly<{
    schema: "receiz.attestation.approval.v125";
    approvalDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.issuance.v125";
    issuanceDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.denial.v125";
    decisionDigest: string;
    outcomeCode: string;
}> | Readonly<{
    schema: "receiz.attestation.withdrawal.v125";
    reasonDigest: string;
}> | Readonly<{
    schema: "receiz.attestation.expiry.v125";
    expiryDigest: string;
}>;
export type ReceizAttestationApplicationV125 = Readonly<{
    schema: "receiz.attestation.application.v125";
    status: "draft";
    applicationId: string;
    domainId: string;
    credentialType: string;
    subjectId: string;
    applicantReceizId: string;
    registryDigest: string;
    domainDigest: string;
    claimSet: ReceizClaimSetV125;
    claimSetDigest: string;
    claimSetHead: string;
    evidenceBundle: ReceizEvidenceBundleV125;
    evidenceBundleDigest: string;
    evidenceBundleHead: string;
    createdKai: string;
    expiresAtKai: string;
    authority: Readonly<{
        applicationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    applicationDigest: string;
    acceptedHead: string;
}>;
export type ReceizAttestationEventV125 = Readonly<{
    schema: "receiz.attestation.event.v125";
    kind: ReceizAttestationEventKindV125;
    applicationId: string;
    domainId: string;
    credentialType: string;
    actorReceizId: string;
    actorRole: string;
    actorAuthorization: ReceizAttestationActorAuthorizationV125;
    actorProof: ReceizIdentityLoginProof;
    expectedPriorHead: string;
    eventKai: string;
    idempotencyKey: string;
    payload: ReceizAttestationEventPayloadV125;
    payloadDigest: string;
    eventDigest: string;
}>;
export type ReceizAttestationEventInputV125 = Readonly<Omit<ReceizAttestationEventV125, "schema" | "payloadDigest" | "eventDigest">>;
export type ReceizAttestationApplicationStateV125 = Readonly<{
    schema: "receiz.attestation.application-state.v125";
    applicationId: string;
    domainId: string;
    credentialType: string;
    subjectId: string;
    applicantReceizId: string;
    registryDigest: string;
    domainDigest: string;
    claimSet: ReceizClaimSetV125;
    claimSetDigest: string;
    claimSetHead: string;
    evidenceBundle: ReceizEvidenceBundleV125;
    evidenceBundleDigest: string;
    evidenceBundleHead: string;
    createdKai: string;
    expiresAtKai: string;
    latestKai: string;
    status: ReceizAttestationStatusV125;
    acceptedHead: string;
    approverIds: readonly string[];
    evaluationSatisfied: boolean;
    reviewSatisfied: boolean;
    outstandingEvidenceRequest: ReceizAttestationEvidenceRequestV125 | null;
    history: readonly ReceizAttestationEventV125[];
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizAttestationEventPlanV125 = Readonly<{
    schema: "receiz.attestation.event-plan.v125";
    transitionPlan?: ReceizArtifactAppendPlan;
    event: ReceizAttestationEventV125;
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    writesPerformed: 0;
    authority: Readonly<{
        planIsAdmission: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizAttestationEventApplyV125 = Readonly<{
    schema: "receiz.attestation.event-apply.v125";
    state: ReceizAttestationApplicationStateV125;
    history: readonly ReceizAttestationEventV125[];
    append: ReceizAttestationEventV125;
    sourceArtifact: ReceizPortableSealedArtifactV124;
    committedTransition: ReceizCommittedArtifactTransition;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        applyIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare class ReceizAttestationZeroWriteErrorV125 extends TypeError {
    readonly code: string;
    readonly writesPerformed: 0;
    constructor(code: string);
}
export declare function createReceizAttestationEventActorChallengeV125(input: Omit<ReceizAttestationEventInputV125, "actorProof">): Promise<string>;
export declare function verifyReceizAttestationActorAuthorizationV125(input: Readonly<{
    authorization: ReceizAttestationActorAuthorizationV125;
    actorReceizId: string;
    actorRole: string;
    kind: ReceizAttestationEventKindV125;
    eventKai: string;
    domain: ReceizAttestationDomainV125;
    credentialType: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationActorAuthorizationV125>;
export declare function createReceizAttestationApplicationV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    applicationId: string;
    credentialType: string;
    subjectId: string;
    applicantReceizId: string;
    claimSet: ReceizClaimSetV125;
    evidenceBundle: ReceizEvidenceBundleV125;
    createdKai: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationV125>;
export declare function verifyReceizAttestationHistoryV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationStateV125>;
export declare function verifyReceizAttestationIssuanceEvidenceV125(input: ReceizAttestationIssuanceEvidenceV125, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationIssuanceAdmissionV125>;
export declare function verifyAndOpenReceizAttestationArtifactV125(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizOpenedAttestationArtifactV125>;
export declare function projectReceizAttestationApplicationV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationStateV125>;
export declare function planReceizAttestationEventV125(input: Readonly<{
    sealedSource?: ReceizSealedLifecycleContextV125;
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
    event: ReceizAttestationEventInputV125;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationEventPlanV125>;
export declare function applyReceizAttestationEventV125(input: ReceizSealedLifecycleExecutionV125 & Readonly<{
    domain: ReceizAttestationDomainV125;
    genesis: ReceizAttestationApplicationV125;
    events: readonly ReceizAttestationEventV125[];
    plan: ReceizAttestationEventPlanV125;
    confirmationDigest: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationEventApplyV125>;
//# sourceMappingURL=v125Attestation.d.ts.map