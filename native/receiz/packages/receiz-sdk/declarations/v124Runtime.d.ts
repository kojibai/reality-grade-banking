import { type ReceizProofAuthorityChallengeV123 } from "./v123ProofAuthority.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
type RemoteRequest = <T>(path: string, options?: Readonly<{
    method?: string;
    body?: Record<string, unknown>;
}>) => Promise<T>;
type SessionAuthority = Readonly<{
    sessionIsProofAuthority: false;
    strongerTruth: "receiz-identity-artifact";
}>;
export type ReceizOpenAuthoritySessionInputV124 = Readonly<{
    applicationId: string;
    actorSubjectId: string;
    subjectSourceArtifact: ReceizPortableSealedArtifactV124;
    proofArtifact: Blob | ArrayBuffer | Uint8Array | string;
    signedChallenge: ReceizProofAuthorityChallengeV123;
    requestedRails: readonly string[];
    requiredNamespaces: readonly string[];
    audience: string;
}>;
export type ReceizRefreshAuthoritySessionInputV124 = Readonly<{
    applicationId: string;
    authoritySessionHandle: string;
    proofArtifact: Blob | ArrayBuffer | Uint8Array | string;
    signedChallenge: ReceizProofAuthorityChallengeV123;
    requestedRails: readonly string[];
    requiredNamespaces: readonly string[];
    audience: string;
    /**
     * Durable request coordinates used only when this SDK instance does not
     * already cache the authenticated session. They are revalidated by the
     * signed refresh response and are never admitted as local authority.
     */
    persistedSession?: ReceizAuthoritySessionV124;
}>;
export type ReceizCloseAuthoritySessionInputV124 = Readonly<{
    applicationId: string;
    authoritySessionHandle: string;
    /**
     * Durable request coordinates for a newly created SDK instance. The raw
     * projection cannot mint custody; only the signed close response can.
     */
    persistedSession?: ReceizAuthoritySessionV124;
}>;
export type ReceizAuthoritySessionNamespaceV124 = Readonly<{
    name: string;
    head: string;
    digest: string;
}>;
export type ReceizAuthoritySessionV124 = Readonly<{
    schema: "receiz.authority-session.v124";
    status: "active";
    authoritySessionHandle: string;
    applicationId: string;
    audience: string;
    actorSubjectId: string;
    subjectSourceArtifactSha256: string;
    identityArtifactSha256: string;
    identityKeyId: string;
    grantedScopes: readonly string[];
    grantedRails: readonly string[];
    namespaces: readonly ReceizAuthoritySessionNamespaceV124[];
    revocationHead: string;
    issuedAtKaiUPulse: number;
    expiresAtKaiUPulse: number;
    sessionBindingDigest: string;
    runtimeReceiptDigest: string;
    authority: SessionAuthority;
}>;
export type ReceizAuthoritySessionClosedV124 = Readonly<{
    schema: "receiz.authority-session-closed.v124";
    status: "closed";
    authoritySessionHandle: string;
    applicationId: string;
    audience: string;
    revocationHead: string;
    closedAtKaiUPulse: number;
    sessionBindingDigest: string;
    runtimeReceiptDigest: string;
    authority: SessionAuthority;
}>;
export type ReceizRuntimeOperationV124 = "open-authority-session" | "refresh-authority-session" | "close-authority-session" | "qualify";
export type ReceizRuntimeZeroWriteReasonV124 = "INVALID_PROOF" | "CONSENT_REQUIRED" | "APPLICATION_MISMATCH" | "AUDIENCE_MISMATCH" | "SCOPE_MISMATCH" | "NAMESPACE_MISMATCH" | "STALE_HEAD" | "EXPIRED" | "REVOKED" | "CHALLENGE_REPLAYED" | "UNAUTHORIZED" | "DEPENDENCY_UNAVAILABLE";
export type ReceizRuntimeZeroWriteFailureV124 = Readonly<{
    schema: "receiz.runtime-zero-write-failure.v124";
    status: "zero-write";
    operation: ReceizRuntimeOperationV124;
    applicationId: string;
    authoritySessionHandle: string | null;
    reasonCode: ReceizRuntimeZeroWriteReasonV124;
    writes: 0;
    failureDigest: string;
    runtimeReceiptDigest: string;
    authority: Readonly<{
        failureIsProofAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
export declare class ReceizRuntimeZeroWriteErrorV124 extends Error {
    readonly failure: ReceizRuntimeZeroWriteFailureV124;
    constructor(failure: ReceizRuntimeZeroWriteFailureV124);
}
export type ReceizQualificationOperationV124 = string;
export type ReceizOperationalQualificationInputV124 = Readonly<{
    applicationId: string;
    operations: readonly string[];
}>;
export type ReceizQualificationReasonV124 = "MISSING_SCOPE" | "PRINCIPAL_AUDIENCE_MISMATCH" | "STALE_PUBLICATION_HEAD" | "REGISTRY_REDUCER_MISMATCH" | "DEPENDENCY_UNHEALTHY" | "DURABLE_RUNTIME_UNAVAILABLE" | "TRANSPORT_SIGNATURE_UNAVAILABLE" | "DISTRIBUTED_LIMITER_UNAVAILABLE" | "RECIPIENT_PUBLICATION_UNAVAILABLE" | "RECIPIENT_PROOF_STORAGE_UNAVAILABLE" | "RECIPIENT_LOCATOR_ISSUE_UNAVAILABLE" | "RECIPIENT_LOCATOR_CONSUME_UNAVAILABLE";
export type ReceizQualificationRetryV124 = Readonly<{
    strategy: "none";
    retryAfterKaiUPulse: null;
}> | Readonly<{
    strategy: "retry-after";
    retryAfterKaiUPulse: number;
}> | Readonly<{
    strategy: "operator-action";
    retryAfterKaiUPulse: null;
}>;
export type ReceizQualificationEvidenceV124 = Readonly<{
    runtime: "ready" | "unavailable";
    transportSignature?: "available" | "unavailable";
    registry: "compatible" | "mismatch";
    reducer: "compatible" | "mismatch";
    publicHeads: "current" | "stale";
    distributedLimiter: "available" | "unavailable" | "not-required";
    recipientPublication?: "available" | "unavailable";
    recipientProofStorage?: "available" | "unavailable";
    recipientLocatorIssue?: "available" | "unavailable";
    recipientLocatorConsume?: "available" | "unavailable";
}>;
export type ReceizOperationalCapabilityV124 = Readonly<{
    operation: ReceizQualificationOperationV124;
    status: "available" | "degraded" | "unavailable";
    actualGrantedScopes: readonly string[];
    serviceVersion: string;
    registryVersion: string;
    reducerVersion: string;
    publicDependencyHeads: Readonly<Record<string, string>>;
    dependencyHealth: "healthy" | "degraded" | "unhealthy";
    reasonCode: ReceizQualificationReasonV124 | null;
    retry: ReceizQualificationRetryV124;
    evidence: ReceizQualificationEvidenceV124;
}>;
export type ReceizOperationalCapabilityReportV124 = Readonly<{
    schema: "receiz.operational-capability-report.v124";
    applicationId: string;
    requestedOperations: readonly ReceizQualificationOperationV124[];
    qualifiedAtKaiUPulse: number;
    results: readonly ReceizOperationalCapabilityV124[];
    reportDigest: string;
    runtimeReceiptDigest: string;
    authority: Readonly<{
        reportIsProofAuthority: false;
        reportIsOperationalAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}>;
export declare function createReceizV124Runtime(request: RemoteRequest): {
    openAuthoritySessionV124: (input: ReceizOpenAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionV124>;
    refreshAuthoritySessionV124: (input: ReceizRefreshAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionV124>;
    closeAuthoritySessionV124: (input: ReceizCloseAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionClosedV124>;
    qualifyV124: (input: ReceizOperationalQualificationInputV124) => Promise<ReceizOperationalCapabilityReportV124>;
    openAuthoritySession: (input: ReceizOpenAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionV124>;
    refreshAuthoritySession: (input: ReceizRefreshAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionV124>;
    closeAuthoritySession: (input: ReceizCloseAuthoritySessionInputV124) => Promise<ReceizAuthoritySessionClosedV124>;
    qualify: (input: ReceizOperationalQualificationInputV124) => Promise<ReceizOperationalCapabilityReportV124>;
};
export {};
//# sourceMappingURL=v124Runtime.d.ts.map