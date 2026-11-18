import type { ReceizCapabilityIssuerResolver } from "./artifactAdmissionTypes.js";
import { type ReceizKeyFile } from "./identity.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { type ReceizAttestationActorActionV125, type ReceizAttestationDomainV125, type ReceizEvidenceBundleV125 } from "./v125AttestationSchemas.js";
export type ReceizAttestationRoleGrantV125 = Readonly<{
    schema: "receiz.attestation.role-grant.v125";
    grantorReceizId: string;
    grantorKeyId: string;
    actorReceizId: string;
    actorKeyId: string;
    actorKeyAlg: "Ed25519" | "P-256";
    actorPublicKeyRawB64u: string;
    domainId: string;
    domainDigest: string;
    credentialType: string;
    role: string;
    allowedActions: readonly ReceizAttestationActorActionV125[];
    validFromKai: string;
    expiresAtKai: string;
    alg: "Ed25519" | "P-256";
    signatureB64u: string;
    grantDigest: string;
}>;
export type ReceizAttestationEvidenceReferenceV125 = ReceizEvidenceBundleV125["evidence"][number];
export type ReceizAttestationEvidenceArtifactV125 = Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
}>;
export type ReceizAttestationDomainAuthorityProofV125 = Readonly<{
    schema: "receiz.attestation.domain-authority.v125";
    domainAuthorityReceizId: string;
    domain: ReceizAttestationDomainV125;
    domainDigest: string;
    acceptedDomainHead: string;
    grantors: readonly Readonly<{
        grantorReceizId: string;
        grantorKeyId: string;
    }>[];
    evidenceAuthorities: readonly Readonly<{
        evidenceType: string;
        verifierBinding: "receiz.artifact-admission.v112";
        evaluatorPolicy: string;
        ownerReceizIds: readonly string[];
    }>[];
    revokedRoleGrants: readonly Readonly<{
        grantDigest: string;
        effectiveKai: string;
        previousAuthorityHead: string;
        revocationHead: string;
    }>[];
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizAttestationAuthorityV125 = Readonly<{
    schema: "receiz.attestation.authority-context.v125";
    domainId: string;
    domainDigest: string;
    domainAuthorityArtifactSha256: string;
    domainAuthorityProofObjectId: string;
    acceptedDomainHead: string;
    authorityIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
}>;
export type ReceizAttestationAuthorityOptionsV125 = Readonly<{
    domainAuthorityArtifact: ReceizPortableSealedArtifactV124;
    resolveAdmittedGrantor: ReceizCapabilityIssuerResolver;
    resolveEvidenceArtifact(reference: ReceizAttestationEvidenceReferenceV125): ReceizAttestationEvidenceArtifactV125 | null | Promise<ReceizAttestationEvidenceArtifactV125 | null>;
}>;
/** Internal projection of the already verified complete domain source. */
export declare function readReceizHeldAttestationDomainV125(value: ReceizAttestationAuthorityV125): Readonly<{
    schema: "receiz.attestation.domain.v125";
    domainId: string;
    credentialTypes: readonly string[];
    claimSchemas: readonly import("./v125AttestationSchemas.js").ReceizAttestationClaimSchemaV125[];
    evidenceRequirements: readonly import("./v125AttestationSchemas.js").ReceizAttestationEvidenceRequirementV125[];
    evaluationRules: readonly import("./v125AttestationSchemas.js").ReceizAttestationEvaluationRuleV125[];
    outcomeCodes: readonly string[];
    actorRoles: readonly import("./v125AttestationSchemas.js").ReceizAttestationActorRoleLawV125[];
    workflow: Readonly<{
        automatedEvaluation: boolean;
        humanReview: boolean;
        minimumApprovers: number;
        applicationWindowKai: string;
        evaluatorImplementationDigest: string | null;
    }>;
    reviewPolicy: import("./v125AttestationSchemas.js").ReceizAttestationReviewPolicyV125;
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
export declare function createReceizAttestationAuthorityV125(options: ReceizAttestationAuthorityOptionsV125): Promise<ReceizAttestationAuthorityV125>;
/** @internal Canonical-root injection exists only for the source test harness and is not exported at package root. */
export declare function createReceizAttestationAuthorityWithCanonicalRootsForTestV125(options: ReceizAttestationAuthorityOptionsV125, verifier: ReceizV125EnclosingArtifactVerifierOptions): Promise<ReceizAttestationAuthorityV125>;
export declare function signReceizAttestationRoleGrantV125(input: Readonly<{
    keyFile: ReceizKeyFile;
    passphrase?: string;
    domain: ReceizAttestationDomainV125;
    actorReceizId: string;
    actorKey: Readonly<{
        keyId: string;
        alg: "Ed25519" | "P-256";
        publicKeyRawB64u: string;
    }>;
    credentialType: string;
    role: string;
    allowedActions: readonly ReceizAttestationActorActionV125[];
    validFromKai: string;
    expiresAtKai: string;
}>): Promise<ReceizAttestationRoleGrantV125>;
export declare function verifyReceizAttestationRoleGrantAuthorityV125(value: unknown, domainValue: ReceizAttestationDomainV125, context: ReceizAttestationAuthorityV125, useAtKai?: string): Promise<ReceizAttestationRoleGrantV125>;
export declare function verifyReceizAttestationEvidenceBundleAuthorityV125(domainValue: ReceizAttestationDomainV125, bundle: ReceizEvidenceBundleV125, context: ReceizAttestationAuthorityV125): Promise<void>;
//# sourceMappingURL=v125AttestationAuthority.d.ts.map