import { type ReceizConstitutionJson } from "./constitution.js";
import type { ReceizOpenedArtifact, ReceizVerifiedPayload } from "./artifacts.js";
import type { ReceizVerifiedProofHistory } from "./proofHistory.js";
import type { ReceizCarriedProofHistoryHeadV114 } from "./compositeProofTransport.js";
import type { ReceizDigest } from "./verifier/types.js";
import type { ReceizRegistryDigest } from "./artifactTransition.js";
import type { ReceizIdentityLoginProof } from "./identity.js";
export type ReceizId = string;
export type ReceizActorId = string;
export type ReceizSecretInput = string;
export type ReceizAdmissionDigest = ReceizDigest<"verified-admission">;
export type ReceizActorEvidenceDigest = ReceizDigest<"verified-actor-evidence">;
export type { ReceizRegistryDigest } from "./artifactTransition.js";
export type ReceizArtifactAdmissionOptions = Readonly<{
    profile: "identity";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
    identityPassphrase: ReceizSecretInput;
}> | Readonly<{
    profile: "identity";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
    identityExactChallenge: string;
    identityProof: ReceizIdentityLoginProof;
}> | Readonly<{
    profile: "identity";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
    identityExactChallengeB64Url: string;
    identityProof: ReceizIdentityLoginProof;
}> | Readonly<{
    profile: "portable-state";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
    verifiedHistory?: ReceizVerifiedProofHistory;
}> | Readonly<{
    profile: "profile-showcase";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
}> | Readonly<{
    profile: "economy-showcase";
    ownerConstraint?: ReceizId;
    actorConstraint?: ReceizActorId;
}> | Readonly<{
    profile: "document";
}>;
export type ReceizAdmissionVerdict = "canonical-identity" | "bearer-recovery" | "verified-document" | "foreign-owner" | "profile-denied" | "invalid";
export type ReceizArtifactAdmissionErrorCode = "ARTIFACT_TAMPERED" | "INVALID_CARRIER" | "PAYLOAD_NOT_ARTIFACT" | "ADMISSION_PROFILE_DENIED" | "OWNER_MISMATCH" | "CLAIM_MISMATCH" | "PROVENANCE_INVALID" | "STALE_HISTORY" | "HISTORY_CONFLICT" | "UNSUPPORTED_LEGACY_FORMAT" | "NETWORK_UNAVAILABLE" | "MISSING_AUTHORITY" | "IDEMPOTENCY_CONFLICT" | "ATOMIC_COMMIT_FAILED";
export type ReceizArtifactAdmissionError = Readonly<{
    code: ReceizArtifactAdmissionErrorCode;
    details: Readonly<Record<string, string | number | boolean | null>>;
}>;
export type ReceizAdmissionAssessments = Readonly<{
    localRestoration: "available" | "denied";
    signingKeyCorrespondence: "verified" | "unverified";
    ownership: "denied" | "requires";
    publication: "denied" | "requires";
    transfer: "denied" | "requires";
    settlement: "denied" | "requires";
    append: "denied" | "requires";
}>;
export type ReceizProofExplanationFact = Readonly<{
    code: string;
    value: ReceizConstitutionJson;
}>;
export type ReceizProofExplanation = Readonly<{
    schema: "receiz.proof-explanation.v1";
    outcome: ReceizAdmissionVerdict;
    summaryCode: string;
    facts: readonly ReceizProofExplanationFact[];
    omittedFactCount: number;
    authority: Readonly<{
        explanationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizArtifactAdmissionProof = Readonly<{
    schema: "receiz.artifact-admission-proof.v112";
    registryDigest: string;
    registryEffectiveKai: string;
    artifactSha256: string;
    payloadSha256: string;
    continuityDigest: string;
    recoveredStateDigest: string;
    assessmentsDigest: string;
    verifierContextDigest: string;
    identityBindingDigest: string | null;
    admissionProofDigest: string;
}>;
export type ReceizVerifiedActorReference = Readonly<{
    actorId: ReceizActorId;
    evidenceDigest: ReceizActorEvidenceDigest;
    admissionProfile: "identity";
    registryDigest: ReceizRegistryDigest;
}>;
export type ReceizVerifiedIdentityAdmission = Readonly<{
    profile: "identity";
    actor: ReceizVerifiedActorReference;
    admissionDigest: ReceizAdmissionDigest;
}>;
export type ReceizCapabilityIssuerKey = Readonly<{
    keyId: string;
    alg: "Ed25519" | "P-256";
    publicKeyRawB64u: string;
    actorId: ReceizActorId;
    registryDigest: ReceizRegistryDigest;
    revoked: boolean;
}>;
export type ReceizCapabilityIssuerResolver = (issuerKeyId: string) => ReceizCapabilityIssuerKey | null | Promise<ReceizCapabilityIssuerKey | null>;
type ReceizArtifactAdmissionBase = Readonly<{
    schema: "receiz.artifact-admission.v112";
    profile: ReceizArtifactAdmissionOptions["profile"] | null;
    assessments: ReceizAdmissionAssessments;
    explanation: ReceizProofExplanation;
    writesPerformed: 0;
    authority: Readonly<{
        admissionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizInvalidArtifactAdmission = ReceizArtifactAdmissionBase & Readonly<{
    profile: null;
    verdict: "invalid";
    error: ReceizArtifactAdmissionError;
    recoveryPlan: null;
}>;
export type ReceizProfileDeniedArtifactAdmission = ReceizArtifactAdmissionBase & Readonly<{
    profile: ReceizArtifactAdmissionOptions["profile"];
    verdict: "profile-denied";
    error: ReceizArtifactAdmissionError;
    recoveryPlan: null;
    artifactSha256: string;
    payloadSha256: string;
    ownerReceizId: string | null;
    actorConstraint: ReceizActorId | null;
}>;
export type ReceizDocumentArtifactAdmission = ReceizArtifactAdmissionBase & Readonly<{
    profile: "document";
    verdict: "verified-document";
    error: null;
    recoveryPlan: null;
    artifactId: string;
    artifactSha256: string;
    payloadSha256: string;
    ownerReceizId: string | null;
}>;
type ReceizVerifiedArtifactAdmissionBase = ReceizArtifactAdmissionBase & Readonly<{
    verdict: "canonical-identity" | "bearer-recovery" | "foreign-owner";
    error: ReceizArtifactAdmissionError | null;
    recoveryPlan: null;
    artifactId: string;
    artifactSha256: string;
    payloadSha256: string;
    ownerReceizId: string | null;
    actorConstraint: ReceizActorId | null;
    openedArtifact: ReceizOpenedArtifact;
    verifiedPayload: ReceizVerifiedPayload;
    proofHistory: ReceizVerifiedProofHistory | null;
    proofHistoryHead: ReceizCarriedProofHistoryHeadV114 | null;
    admissionProof: ReceizArtifactAdmissionProof;
    recoveredState: Readonly<Record<string, unknown>>;
}>;
export type ReceizVerifiedIdentityArtifactAdmission = Omit<ReceizVerifiedArtifactAdmissionBase, "openedArtifact"> & ReceizVerifiedIdentityAdmission & Readonly<{
    verdict: "canonical-identity";
    openedArtifact: ReceizOpenedArtifact | null;
}>;
export type ReceizVerifiedPortableStateAdmission = ReceizVerifiedArtifactAdmissionBase & Readonly<{
    profile: "portable-state";
    verdict: "bearer-recovery" | "foreign-owner";
}>;
export type ReceizVerifiedProfileShowcaseAdmission = ReceizVerifiedArtifactAdmissionBase & Readonly<{
    profile: "profile-showcase";
    verdict: "bearer-recovery";
}>;
export type ReceizVerifiedEconomyShowcaseAdmission = ReceizVerifiedArtifactAdmissionBase & Readonly<{
    profile: "economy-showcase";
    verdict: "bearer-recovery";
}>;
export type ReceizVerifiedArtifactAdmission = ReceizVerifiedIdentityArtifactAdmission | ReceizVerifiedPortableStateAdmission | ReceizVerifiedProfileShowcaseAdmission | ReceizVerifiedEconomyShowcaseAdmission;
export type ReceizArtifactAdmissionResult = ReceizInvalidArtifactAdmission | ReceizProfileDeniedArtifactAdmission | ReceizDocumentArtifactAdmission | ReceizVerifiedArtifactAdmission;
export declare const RECEIZ_DENIED_ADMISSION_ASSESSMENTS: ReceizAdmissionAssessments;
export declare function receizProofExplanation(input: {
    outcome: ReceizAdmissionVerdict;
    summaryCode: string;
    facts: readonly ReceizProofExplanationFact[];
}): ReceizProofExplanation;
export declare function invalidReceizArtifactAdmission(code: ReceizArtifactAdmissionErrorCode, details?: Readonly<Record<string, string | number | boolean | null>>): ReceizInvalidArtifactAdmission;
//# sourceMappingURL=artifactAdmissionTypes.d.ts.map