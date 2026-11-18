import { type ReceizConstitutionRegistry } from "./constitution.js";
export type ReceizRegistryArtifactBasis = Readonly<{
    schema: "receiz.constitution.registry-artifact.v1";
    registry: ReceizConstitutionRegistry;
    payloadDigest: string;
    issuerKeyId: string;
    keyPurpose: "receiz.constitution.registry";
    alg: "Ed25519";
    effectiveKai: string;
    status: "current" | "historical" | "revoked";
    enclosingProof: Readonly<{
        artifactId: string;
        sealDigest: string;
    }>;
}>;
export type ReceizRegistryArtifact = ReceizRegistryArtifactBasis & Readonly<{
    signatureB64u: string;
}>;
export type ReceizRegistryTrustKey = Readonly<{
    keyId: string;
    alg: "Ed25519";
    publicKeyRawB64u: string;
    purposes: readonly "receiz.constitution.registry"[];
    validFromKai: string;
    expiresAtKai: string | null;
    revokedAtKai: string | null;
    governanceStatus?: "active" | "retired";
    governanceCustodyClass?: string;
    trustSource?: "receiz-governance-keyring-v1" | "receiz-testing-fixture";
}>;
export type ReceizPublishedGovernanceKeyring = Readonly<{
    schema: "receiz-governance-keyring-v1";
    generatedAt: string;
    keys: readonly Readonly<{
        kid: string;
        alg: "Ed25519";
        status: "active" | "retired";
        activatedAt: string;
        retiredAt: string | null;
        custodyClass: string;
        publicKeySpkiPem: string;
    }>[];
}>;
export type ReceizVerifiedRegistryArtifact = ReceizRegistryArtifact & Readonly<{
    verifier: "receiz.sdk.registry-artifact.v1";
    historical: boolean;
    authority: Readonly<{
        registryArtifactIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizReleaseAuthorityBoundary = Readonly<{
    schema: "receiz.release-authority-boundary.v119" | "receiz.release-authority-boundary.v120" | "receiz.release-authority-boundary.v121" | "receiz.release-authority-boundary.v122" | "receiz.release-authority-boundary.v123" | "receiz.release-authority-boundary.v124" | "receiz.release-authority-boundary.v125";
    predecessorDigest: string;
    compatibleSdkRange: ">=119.0.0 <120.0.0" | ">=120.0.0 <121.0.0" | ">=121.0.0 <122.0.0" | ">=122.0.0 <123.0.0" | ">=123.0.0 <124.0.0" | ">=124.0.0 <125.0.0" | ">=125.0.0 <126.0.0";
    authority: Readonly<{
        enclosingArtifact: "strongest";
        projectionIsAuthority: false;
        knownTruthPaintsBeforeDiscovery: true;
        kaiSelectsCausalHead: true;
        merkleCommitsExactAppends: true;
        fibonacciProvidesSparseAncestry: true;
        subjectIdentitySurvivesOwnership?: true;
        modelOutputRequiresCommandAdmission?: true;
        multiSubjectEffectsAreAtomic?: true;
        unknownNamespacesAreByteExact?: true;
        serverAndDatabaseAreNonAuthoritativeAcceleration?: true;
        settledSurfaceNeverWaitsForProjection?: true;
        verifiedHydrationBecomesDurableColdTruth?: true;
        authenticatedResponsesBindRequestsAndExactHeads?: true;
        institutionsAreAutomaticProofAuthority?: false;
        actionLawMustBeCurrentRegistryBound?: true;
        lawfulActionValueHeadsRequireEnclosingProof?: true;
        developersMayDeclarePhiAmount?: false;
        oneArtifactOneSpendableSettlementMembership?: true;
        activationMintsValue?: false;
        reserveIsLegacyRail?: true;
        settlementIsProofNativeSpendableValue?: true;
    }>;
}>;
export type ReceizRegistryArtifactDenial = "REGISTRY_ARTIFACT_INVALID" | "REGISTRY_ENCLOSING_PROOF_INVALID" | "REGISTRY_DIGEST_MISMATCH" | "REGISTRY_KEY_UNKNOWN" | "REGISTRY_KEY_PURPOSE_INVALID" | "REGISTRY_KEY_NOT_YET_VALID" | "REGISTRY_KEY_EXPIRED" | "REGISTRY_KEY_REVOKED" | "REGISTRY_STATUS_INVALID" | "REGISTRY_SIGNATURE_INVALID";
export declare function createReceizV119ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function createReceizV120ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function createReceizV121ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function createReceizV122ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function createReceizV123ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function createReceizV125ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary;
export declare function parseReceizPublishedGovernanceRegistryTrustHistory(value: unknown): readonly ReceizRegistryTrustKey[];
export declare function registryArtifactSigningBytes(basis: ReceizRegistryArtifactBasis): Uint8Array;
export declare function isReceizVerifiedRegistryArtifact(value: unknown): value is ReceizVerifiedRegistryArtifact;
export declare function verifyReceizRegistryArtifactPayloadDigest(value: unknown): Promise<Readonly<{
    ok: true;
    artifact: ReceizRegistryArtifact;
    payloadDigest: string;
}> | Readonly<{
    ok: false;
    code: "REGISTRY_ARTIFACT_INVALID" | "REGISTRY_DIGEST_MISMATCH";
}>>;
export declare function createReceizRegistryArtifactVerifier(options: {
    currentKai: string;
    mode: "current-admission" | "historical-verification";
    trustHistory: readonly ReceizRegistryTrustKey[];
    expectedRegistryDigest: string;
    verifyEnclosingProof: (proof: ReceizRegistryArtifact["enclosingProof"]) => boolean | Promise<boolean>;
}): (value: unknown) => Promise<Readonly<{
    ok: true;
    artifact: ReceizVerifiedRegistryArtifact;
}> | Readonly<{
    ok: false;
    code: ReceizRegistryArtifactDenial;
}>>;
//# sourceMappingURL=registryArtifact.d.ts.map