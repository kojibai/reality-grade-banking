import { type ReceizAuthorityFailure } from "./authorityResults.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
import type { ReceizCommitDomainId, ReceizPlanDigest } from "./artifactTransition.js";
import type { ReceizAcceptedHeadExpectation, ReceizApplicationOperationMatrixDigest, ReceizReconciliationAttemptId, ReceizReconciliationPlanDigest } from "./globalCoordinationTypes.js";
import type { ReceizCapabilityIssuerResolver } from "./artifactAdmissionTypes.js";
import { type ReceizKeyFile } from "./identity.js";
import { type ReceizRegistryDiscoveryResult } from "./registryDiscovery.js";
export type ReceizCapabilityPayload = Readonly<{
    schema: "receiz.capability.v112";
    capabilityId: string;
    issuerKeyId: string;
    actorId: string;
    tenantId: string | null;
    audience: string;
    authorityProfile: ReceizAuthorityProfile;
    operations: readonly string[];
    resourceScopes: readonly string[];
    maximumEffects: Readonly<Record<string, number>>;
    registryDigest: string;
    validFromKai: string;
    expiresAtKai: string;
    nonce: string;
    parentDigest: string | null;
    delegationDepth: number;
    maximumDelegationDepth: number;
    offline: boolean;
    operationConstraints: Readonly<{
        planDigest: ReceizPlanDigest;
        commitDomain: ReceizCommitDomainId;
    }>;
}>;
export type ReceizSignedCapability = Readonly<{
    schema: "receiz.signed-capability.v112";
    payload: ReceizCapabilityPayload;
    alg: "Ed25519" | "P-256";
    signatureB64u: string;
}>;
/**
 * V113 reconciliation authority is deliberately distinct from the frozen
 * v112 single-transition capability. It authorizes submission of one already
 * verified descendant to one named coordination domain; it does not authorize
 * any historical handoff carried by that descendant.
 */
export type ReceizReconciliationCapabilityPayload = Readonly<{
    schema: "receiz.capability.v113.reconciliation";
    capabilityId: string;
    issuerKeyId: string;
    actorId: string;
    tenantId: string;
    audience: string;
    authorityProfile: "global-shared";
    operations: readonly ["artifact.reconcile"];
    resourceScopes: readonly string[];
    maximumEffects: Readonly<{
        acceptedHistoryAdditions: number;
    }>;
    registryDigest: string;
    operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
    validFromKai: string;
    expiresAtKai: string;
    nonce: string;
    parentDigest: null;
    delegationDepth: 0;
    maximumDelegationDepth: 0;
    offline: false;
    operationConstraints: Readonly<{
        planDigest: ReceizReconciliationPlanDigest;
        commitDomain: ReceizCommitDomainId;
        expectedAcceptedHead: ReceizAcceptedHeadExpectation;
        artifactId: string;
        attemptId: ReceizReconciliationAttemptId;
    }>;
}>;
export type ReceizSignedReconciliationCapability = Readonly<{
    schema: "receiz.signed-capability.v113.reconciliation";
    payload: ReceizReconciliationCapabilityPayload;
    alg: "Ed25519" | "P-256";
    signatureB64u: string;
}>;
export type ReceizVerifiedReconciliationCapability = Readonly<{
    schema: "receiz.verified-capability.v113.reconciliation";
    payload: ReceizReconciliationCapabilityPayload;
    digest: string;
    verifier: "receiz.sdk.capability.v113.reconciliation";
    authority: Readonly<{
        capabilityIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizReconciliationCapabilityContext = Readonly<{
    actorId: string;
    tenantId: string;
    artifactId: string;
    registryDigest: string;
    operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
    maximumEffects: Readonly<{
        acceptedHistoryAdditions: number;
    }>;
    operationConstraints: ReceizReconciliationCapabilityPayload["operationConstraints"];
}>;
export type ReceizVerifiedCapability = Readonly<{
    schema: "receiz.verified-capability.v112";
    payload: ReceizCapabilityPayload;
    digest: string;
    verifier: "receiz.sdk.capability.v112";
    authority: Readonly<{
        capabilityIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCapabilityContext = Readonly<{
    actorId: string;
    tenantId: string | null;
    authorityProfile: ReceizAuthorityProfile;
    operation: string;
    resourceId: string;
    registryDigest: string;
    maximumEffects: Readonly<Record<string, number>>;
    operationConstraints: Readonly<{
        planDigest: ReceizPlanDigest;
        commitDomain: ReceizCommitDomainId;
    }>;
}>;
export type ReceizCapabilityDenialCode = "CAPABILITY_INVALID" | "CAPABILITY_ISSUER_UNKNOWN" | "CAPABILITY_SIGNATURE_INVALID" | "CAPABILITY_NOT_YET_VALID" | "CAPABILITY_EXPIRED" | "CAPABILITY_REVOKED" | "CAPABILITY_AUDIENCE_MISMATCH" | "CAPABILITY_CONTEXT_MISMATCH" | "CAPABILITY_ATTENUATION_VIOLATION";
export declare function capabilitySigningBytes(payload: ReceizCapabilityPayload): Uint8Array;
export declare function reconciliationCapabilitySigningBytes(payload: unknown): Uint8Array;
export declare function signReceizCapability(input: Readonly<{
    keyFile: ReceizKeyFile;
    passphrase?: string;
    payload: ReceizCapabilityPayload;
}>): Promise<ReceizSignedCapability>;
export declare function signReceizCapability(input: Readonly<{
    keyFile: ReceizKeyFile;
    passphrase?: string;
    payload: ReceizReconciliationCapabilityPayload;
}>): Promise<ReceizSignedReconciliationCapability>;
export declare function isReceizVerifiedCapability(value: unknown): value is ReceizVerifiedCapability;
export declare function isReceizVerifiedReconciliationCapability(value: unknown): value is ReceizVerifiedReconciliationCapability;
export declare function createReceizReconciliationCapabilityVerifier(options: Readonly<{
    resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
    currentKai: string;
    audience: string;
    revokedCapabilityDigests: ReadonlySet<string>;
}>): (value: unknown, context: ReceizReconciliationCapabilityContext) => Promise<Readonly<{
    ok: true;
    capability: ReceizVerifiedReconciliationCapability;
}> | ReceizAuthorityFailure>;
type ReceizCapabilityVerifierOptions = {
    resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
    currentKai: string;
    audience: string;
    revokedCapabilityDigests: ReadonlySet<string>;
    verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
    parent?: ReceizVerifiedCapability;
};
export declare function createReceizCapabilityVerifier(options: ReceizCapabilityVerifierOptions): (value: unknown, context: ReceizCapabilityContext) => Promise<Readonly<{
    ok: true;
    capability: ReceizVerifiedCapability;
}> | ReceizAuthorityFailure>;
/** Package-internal: exact verified source law context, with all capability equality and signature checks retained. */
export declare function createReceizCapabilityVerifierWithSourceContext(sourceAdmission: unknown, options: Omit<ReceizCapabilityVerifierOptions, "verifiedRegistryDiscovery">): Promise<(value: unknown, context: ReceizCapabilityContext) => Promise<Readonly<{
    ok: true;
    capability: ReceizVerifiedCapability;
}> | ReceizAuthorityFailure>>;
export {};
//# sourceMappingURL=capabilityAuthority.d.ts.map