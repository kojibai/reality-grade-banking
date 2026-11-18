import { type ReceizArtifactAppendPlan, type ReceizCommittedArtifactTransition, type ReceizCommitDomainId, type ReceizHistoryDigest, type ReceizNamespaceId } from "./artifactTransition.js";
import { type ReceizVerifiedArtifactTransitionCandidate } from "./artifactTransitionCandidateCustody.js";
import { type ReceizAppendReceipt, type ReceizArtifactTransitionCommitUnit } from "./artifactTransitionStore.js";
import { type ReceizSignedCapability } from "./capabilityAuthority.js";
import { type ReceizIdentityLoginProof } from "./identity.js";
import type { ReceizRegistryDiscoveryResult } from "./registryDiscovery.js";
import { type ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import type { ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { type ReceizOperationPlanV124 } from "./v124Contracts.js";
export type ReceizPortableSealedArtifactV124 = Readonly<{
    schema: "receiz.sealed-artifact-bytes.v124";
    exactBytesB64u: string;
    filename: string;
    mimeType: string;
    artifactSha256: string;
    payloadSha256: string;
}>;
export type ReceizPortableExecutionAuthorityRequestV124 = Readonly<{
    schema: "receiz.execution-authority-request.v124";
    phase: "stage" | "execute" | "resolve";
    method: "GET" | "POST";
    path: string;
    body: unknown;
}>;
export type ReceizPortableExecutionOutcomeCoordinatesV124 = Readonly<{
    schema: "receiz.execution-outcome.v124";
    status: "committed";
    executionId: string;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    terminalAtKaiUPulse: number;
}>;
export type ReceizPortableExecutionAuthorityEventV124 = Readonly<{
    schema: "receiz.execution-authority-append.v124";
    participantId: string;
    applicationId: string;
    exactPlanDigest: string;
    requestDigest: string;
    outcomeCoordinatesDigest: string;
}>;
export type ReceizPortableExecutionAuthorityEvidenceV124 = Readonly<{
    schema: "receiz.portable-execution-authority.v124";
    profile: "portable-state";
    participantId: string;
    operationPlan: ReceizOperationPlanV124;
    request: ReceizPortableExecutionAuthorityRequestV124;
    outcome: unknown;
    planning: Readonly<{
        commitDomain: ReceizCommitDomainId;
        namespace: ReceizNamespaceId;
        event: ReceizPortableExecutionAuthorityEventV124;
        expectedHead: ReceizHistoryDigest;
        idempotencyKey: string;
    }>;
    predecessor: ReceizPortableSealedArtifactV124;
    successor: ReceizPortableSealedArtifactV124;
    identityArtifact: ReceizPortableSealedArtifactV124;
    signedCapability: ReceizSignedCapability;
    identityProof: ReceizIdentityLoginProof;
    authority: Readonly<{
        evidenceIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPortableExecutionAuthorityVerifierOptionsV124 = Readonly<{
    canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
    audience: string;
    /** Complete counterpart originals for historical linked-operation inspection. */
    linkedParticipantEvidence?: readonly unknown[];
}>;
export type ReceizVerifiedPortableExecutionAuthorityV124 = Readonly<{
    status: "verified-portable-execution-authority";
    plan: ReceizOperationPlanV124;
    request: ReceizPortableExecutionAuthorityRequestV124;
    outcome: Readonly<Record<string, unknown>>;
    participantId: string;
    /** Verified counterparts only; this never issues local commit or adoption custody. */
    linkedParticipantAuthorities?: readonly ReceizVerifiedPortableExecutionAuthorityV124[];
    actorReceizId: string;
    priorHead: string;
    /** Legacy projection in whole pulses; exact coordinates are carried separately. */
    priorHeadKai: string;
    committedHead: string;
    carriedHistoryHead: string;
    completionKai: string;
    exactKksCoordinates?: Readonly<{
        priorHead: ReceizKksV1ProofCoordinate;
        completion: ReceizKksV1ProofCoordinate;
    }>;
    requestDigest: string;
    successorArtifact: ReceizSealedArtifact;
    authority: Readonly<{
        verificationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPortableExecutionTransitionMemberV124 = Readonly<{
    schema: "receiz.portable-execution-transition-member.v124";
    profile: "portable-state";
    participantId: string;
    operationPlan: ReceizOperationPlanV124;
    planning: ReceizPortableExecutionAuthorityEvidenceV124["planning"];
    predecessor: ReceizPortableSealedArtifactV124;
    candidate: ReceizPortableSealedArtifactV124;
    identityArtifact: ReceizPortableSealedArtifactV124;
    signedCapability: ReceizSignedCapability;
    identityProof: ReceizIdentityLoginProof;
    authority: Readonly<{
        memberIsProofAuthority: false;
        candidateIsCommitted: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPortableExecutionTransitionSetV124 = Readonly<{
    schema: "receiz.portable-execution-transition-set.v124";
    applicationId: string;
    exactPlanDigest: string;
    expectedParticipantHeads: Readonly<Record<string, string>>;
    proposedParticipantHeads: Readonly<Record<string, string>>;
    members: readonly ReceizPortableExecutionTransitionMemberV124[];
    authority: Readonly<{
        transitionSetIsProofAuthority: false;
        committed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPortableExecutionTransitionVerifierOptionsV124 = ReceizPortableExecutionAuthorityVerifierOptionsV124 & Readonly<{
    currentKai: string;
}>;
export type ReceizVerifiedPortableExecutionTransitionMemberV124 = Readonly<{
    participantId: string;
    plan: ReceizArtifactAppendPlan;
    capability: import("./capabilityAuthority.js").ReceizVerifiedCapability;
    candidate: ReceizVerifiedArtifactTransitionCandidate;
    priorHead: string;
    proposedHead: string;
    authority: Readonly<{
        verificationIsProofAuthority: false;
        candidateIsCommitted: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizVerifiedPortableExecutionTransitionSetV124 = Readonly<{
    status: "verified-portable-execution-transition-set";
    operationPlan: ReceizOperationPlanV124;
    expectedParticipantHeads: Readonly<Record<string, string>>;
    proposedParticipantHeads: Readonly<Record<string, string>>;
    members: readonly ReceizVerifiedPortableExecutionTransitionMemberV124[];
    authority: Readonly<{
        transitionSetIsProofAuthority: false;
        committed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
/**
 * Canonical commit mechanics derived from an already production-pinned source.
 * This is a subordinate SQL/CAS input and receipt expectation, never committed
 * transition custody and never an issuer.
 */
export type ReceizPreparedPortableExecutionTransitionCommitSetV124 = Readonly<{
    schema: "receiz.prepared-portable-execution-transition-commit-set.v124";
    operationPlan: ReceizOperationPlanV124;
    members: readonly Readonly<{
        participantId: string;
        commitUnit: ReceizArtifactTransitionCommitUnit;
        expectedReceipt: ReceizAppendReceipt;
    }>[];
    authority: Readonly<{
        preparationIsProofAuthority: false;
        receiptIsProofAuthority: false;
        committed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizInspectedPortableExecutionTransitionSetV124 = Readonly<{
    status: "inspected-portable-execution-transition-set";
    applicationId: string;
    exactPlanDigest: string;
    expectedParticipantHeads: Readonly<Record<string, string>>;
    proposedParticipantHeads: Readonly<Record<string, string>>;
    members: readonly Readonly<{
        participantId: string;
        priorHead: string;
        proposedHead: string;
        candidateArtifactSha256: string;
    }>[];
    authority: Readonly<{
        inspectionIsProofAuthority: false;
        candidateCustodyExposed: false;
        committed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPortableExecutionTransitionRecoveryV124 = Readonly<{
    schema: "receiz.portable-execution-transition-recovery.v124";
    transitionSet: ReceizPortableExecutionTransitionSetV124;
    members: readonly Readonly<{
        participantId: string;
        commitUnit: ReceizArtifactTransitionCommitUnit;
        receipt: ReceizAppendReceipt;
    }>[];
    authority: Readonly<{
        recoveryIsProofAuthority: false;
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizRecoveredPortableExecutionTransitionSetV124 = Readonly<{
    status: "recovered-portable-execution-transition-set";
    transitions: readonly ReceizCommittedArtifactTransition[];
    /** Exact source already admitted by recovery under the same pinned policy. */
    transitionSet: ReceizVerifiedPortableExecutionTransitionSetV124;
    authority: Readonly<{
        recoveryIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizInspectedPortableExecutionTransitionRecoveryV124 = Readonly<{
    status: "inspected-portable-execution-transition-recovery";
    participantIds: readonly string[];
    authority: Readonly<{
        inspectionIsProofAuthority: false;
        committedCustodyIssued: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function transportReceizSealedArtifactV124(artifact: ReceizSealedArtifact): Promise<ReceizPortableSealedArtifactV124>;
export declare function createReceizPortableExecutionAuthorityEventV124(input: Readonly<{
    participantId: string;
    operationPlan: ReceizOperationPlanV124;
    request: ReceizPortableExecutionAuthorityRequestV124;
    outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
}>): Promise<ReceizPortableExecutionAuthorityEventV124>;
type UnsignedEvidence = Omit<ReceizPortableExecutionAuthorityEvidenceV124, "identityProof">;
export declare function createReceizPortableExecutionAuthorityIdentityChallengeV124(evidence: UnsignedEvidence): Promise<string>;
type UnsignedTransitionMember = Omit<ReceizPortableExecutionTransitionMemberV124, "identityProof">;
export declare function createReceizPortableExecutionTransitionIdentityChallengeV124(member: UnsignedTransitionMember): Promise<string>;
/** Arbitrary-root mechanics are diagnostics only; no SDK-issued candidate/set custody is exposed. */
export declare function verifyReceizPortableExecutionTransitionSetWithVerifierContextV124(value: unknown, options: ReceizPortableExecutionTransitionVerifierOptionsV124): Promise<ReceizInspectedPortableExecutionTransitionSetV124>;
export declare function isReceizVerifiedPortableExecutionTransitionSetV124(value: unknown): value is ReceizVerifiedPortableExecutionTransitionSetV124;
export declare function prepareReceizPortableExecutionTransitionCommitSetV124(value: ReceizVerifiedPortableExecutionTransitionSetV124): Promise<ReceizPreparedPortableExecutionTransitionCommitSetV124>;
/**
 * Packages already-committed edge transitions for portable synchronization.
 * Every transition must retain live SDK custody from the exact local commit;
 * a caller-created receipt or transported property bag cannot cross this boundary.
 */
export declare function createReceizPortableExecutionTransitionRecoveryV124(input: Readonly<{
    applicationId: string;
    transitionSet: ReceizPortableExecutionTransitionSetV124;
    committedTransitions: readonly ReceizCommittedArtifactTransition[];
}>): Promise<ReceizPortableExecutionTransitionRecoveryV124>;
/** Arbitrary-root mechanics inspect exact binding only and cannot issue candidate or committed custody. */
export declare function inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124(value: unknown, options: ReceizPortableExecutionTransitionVerifierOptionsV124): Promise<ReceizInspectedPortableExecutionTransitionRecoveryV124>;
/** Production entrypoint: repository-pinned roots and the canonical live Kai clock only. */
export declare function verifyReceizPortableExecutionTransitionSetV124(value: unknown, input: Readonly<{
    audience: string;
}>): Promise<ReceizVerifiedPortableExecutionTransitionSetV124>;
/** Production recovery reopens every source with pinned roots and live Kai. */
export declare function recoverReceizPortableExecutionTransitionSetV124(value: unknown, input: Readonly<{
    audience: string;
}>): Promise<ReceizRecoveredPortableExecutionTransitionSetV124>;
/** Inspect a complete linked original at its sealed terminal coordinate.
 * This reuses historical authority admission, not the live recovery or commit
 * boundary. Counterpart transport, outcomes and receipts confer no authority. */
export declare function verifyReceizPortableExecutionAuthorityEvidenceV124(value: unknown, options: ReceizPortableExecutionAuthorityVerifierOptionsV124): Promise<ReceizVerifiedPortableExecutionAuthorityV124>;
export declare function isReceizVerifiedPortableExecutionAuthorityV124(value: unknown): value is ReceizVerifiedPortableExecutionAuthorityV124;
export {};
//# sourceMappingURL=v124PortableAuthority.d.ts.map