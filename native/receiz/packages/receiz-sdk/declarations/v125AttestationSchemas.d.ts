import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
export type ReceizAttestationDisclosureV125 = "public" | "selective" | "private";
export type ReceizAttestationValueTypeV125 = "string" | "boolean" | "integer" | "date" | "digest";
export type ReceizAttestationEvaluationOperatorV125 = "minimum-count";
export type ReceizAttestationActorActionV125 = "submitted" | "evidence_requested" | "evidence_submitted" | "evaluation_complete" | "review_complete" | "approval_recorded" | "issued" | "denied" | "withdrawn" | "expired";
export type ReceizAttestationClaimSchemaV125 = Readonly<{
    name: string;
    schemaId: string;
    schemaVersion: number;
    valueType: ReceizAttestationValueTypeV125;
    disclosure: ReceizAttestationDisclosureV125;
    issuerPolicy: string;
    verifierPolicy: string;
}>;
export type ReceizAttestationEvidenceRequirementV125 = Readonly<{
    evidenceType: string;
    classification: ReceizAttestationDisclosureV125;
    minimumCount: number;
    verifierBinding: string;
    evaluatorPolicy: string;
}>;
export type ReceizAttestationEvaluationRuleV125 = Readonly<{
    ruleId: string;
    evidenceType: string;
    operator: ReceizAttestationEvaluationOperatorV125;
    threshold: number;
    satisfiedOutcomeCode: string;
    unsatisfiedOutcomeCode: string;
}>;
export type ReceizAttestationActorRoleLawV125 = Readonly<{
    role: string;
    allowedActions: readonly ReceizAttestationActorActionV125[];
}>;
export type ReceizAttestationReviewPolicyV125 = Readonly<{
    satisfiedOutcomeCode: string;
    unsatisfiedOutcomeCode: string;
}>;
export type ReceizAttestationDomainV125 = Readonly<{
    schema: "receiz.attestation.domain.v125";
    domainId: string;
    credentialTypes: readonly string[];
    claimSchemas: readonly ReceizAttestationClaimSchemaV125[];
    evidenceRequirements: readonly ReceizAttestationEvidenceRequirementV125[];
    evaluationRules: readonly ReceizAttestationEvaluationRuleV125[];
    outcomeCodes: readonly string[];
    actorRoles: readonly ReceizAttestationActorRoleLawV125[];
    workflow: Readonly<{
        automatedEvaluation: boolean;
        humanReview: boolean;
        minimumApprovers: number;
        applicationWindowKai: string;
        evaluatorImplementationDigest: string | null;
    }>;
    reviewPolicy: ReceizAttestationReviewPolicyV125;
    lifecycle: Readonly<{
        renewable: boolean;
        suspendable: boolean;
        revocable: boolean;
        replaceable: boolean;
    }>;
    consent: Readonly<{
        required: boolean;
        binding: "accepted-proof-head";
    }>;
    visibility: Readonly<{
        publicClaims: "public";
        selectiveClaims: "consent-bound";
        privateClaims: "commitment-only";
        evidence: "reference-only";
    }>;
    constitutionalLawIds: readonly string[];
    registryDigest: string;
    authority: Readonly<{
        definitionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizAttestationClaimValueV125 = string | boolean | number;
export type ReceizAttestationClaimV125 = Readonly<{
    name: string;
    schemaId: string;
    schemaVersion: number;
    disclosure: ReceizAttestationDisclosureV125;
    issuerPolicy: string;
    verifierPolicy: string;
    value?: ReceizAttestationClaimValueV125;
    commitment: string;
    evidenceIds: readonly string[];
}>;
export type ReceizClaimSetV125 = Readonly<{
    schema: "receiz.attestation.claim-set.v125";
    domainId: string;
    credentialType: string;
    subjectId: string;
    registryDigest: string;
    domainDigest: string;
    claims: readonly ReceizAttestationClaimV125[];
    issuedKai: string;
    validFromKai: string;
    expiresAtKai: string | null;
    predecessorHead: string | null;
    acceptedHead: string;
    authority: Readonly<{
        claimSetIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    claimSetDigest: string;
}>;
export type ReceizEvidenceReferenceV125 = Readonly<{
    evidenceId: string;
    evidenceType: string;
    classification: ReceizAttestationDisclosureV125;
    verifierBinding: string;
    evaluatorPolicy: string;
    artifactSha256: ReceizPortableSealedArtifactV124["artifactSha256"];
    proofObjectId: string;
    subjectId: string;
    custodyHead: string;
    contentCommitment: string;
}>;
export type ReceizEvidenceBundleV125 = Readonly<{
    schema: "receiz.attestation.evidence-bundle.v125";
    domainId: string;
    credentialType: string;
    subjectId: string;
    registryDigest: string;
    domainDigest: string;
    evidence: readonly ReceizEvidenceReferenceV125[];
    collectedKai: string;
    predecessorHead: string | null;
    acceptedHead: string;
    authority: Readonly<{
        evidenceBundleIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    evidenceBundleDigest: string;
}>;
export type ReceizClaimInputV125 = Readonly<{
    name: string;
    disclosure?: ReceizAttestationDisclosureV125;
    value?: ReceizAttestationClaimValueV125;
    commitment?: string;
    evidenceIds: readonly string[];
}>;
export type ReceizClaimSetInputV125 = Readonly<{
    domain: ReceizAttestationDomainV125;
    credentialType: string;
    subjectId: string;
    claims: readonly ReceizClaimInputV125[];
    issuedKai: string;
    validFromKai: string;
    expiresAtKai: string | null;
    predecessorHead: string | null;
    acceptedHead: string;
}>;
export type ReceizEvidenceBundleInputV125 = Readonly<{
    domain: ReceizAttestationDomainV125;
    credentialType: string;
    subjectId: string;
    evidence: readonly ReceizEvidenceReferenceV125[];
    collectedKai: string;
    predecessorHead: string | null;
    acceptedHead: string;
}>;
export declare function parseReceizAttestationDomainV125(value: unknown): ReceizAttestationDomainV125;
export declare function createReceizClaimSetV125(input: ReceizClaimSetInputV125): Promise<ReceizClaimSetV125>;
export declare function parseReceizClaimSetV125(value: unknown, domainValue: unknown): Promise<ReceizClaimSetV125>;
export declare function createReceizEvidenceBundleV125(input: ReceizEvidenceBundleInputV125): Promise<ReceizEvidenceBundleV125>;
export declare function parseReceizEvidenceBundleV125(value: unknown, domainValue: unknown): Promise<ReceizEvidenceBundleV125>;
//# sourceMappingURL=v125AttestationSchemas.d.ts.map