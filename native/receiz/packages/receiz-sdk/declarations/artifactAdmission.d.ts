import { type ReceizConstitutionRegistry } from "./constitution.js";
import { type ReceizAuthorityFailure } from "./authorityResults.js";
import { type ReceizArtifactAdmissionOptions, type ReceizArtifactAdmissionResult, type ReceizCapabilityIssuerKey, type ReceizCapabilityIssuerResolver, type ReceizVerifiedActorReference, type ReceizVerifiedArtifactAdmission, type ReceizVerifiedProfileShowcaseAdmission } from "./artifactAdmissionTypes.js";
import { verifyReceizArtifactWithCanonicalRoots, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import { type ReceizProfileShowcaseCarrier } from "./portableAsset.js";
import { parseReceizBoundedProfileShowcaseCarrierV114, parseReceizEconomyShowcaseCarrierV114, type ReceizBoundedProfileShowcaseCarrierV114, type ReceizCarriedProofHistoryHeadV114, type ReceizProfileShowcaseCheckpointBundleBuildV114, type ReceizProfileShowcaseCheckpointSegmentResolverV114 } from "./compositeProofTransport.js";
import { type ReceizProfileShowcasePersistentStateIOV114 } from "./profileShowcasePersistentState.js";
import { type ReceizVerifiedProofHistory } from "./proofHistory.js";
import { type ReceizRegistryDiscoveryResult } from "./registryDiscovery.js";
export type ReceizArtifactAdmissionDependencies = Readonly<{
    canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
}>;
type IdentityEvidenceBasis = Readonly<{
    schema: "receiz.verified-actor-evidence-basis.v112";
    artifactSha256: string;
    payloadSha256: string;
    artifactOwnerReceizId: string;
    identityOwnerReceizId: string;
    actorId: string;
    keyId: string;
    alg: string;
    publicKeyRawB64u: string;
    challengeDigest: string;
    signatureDigest: string;
    signatureVerified: true;
    registryDigest: string;
}>;
/** Public digest preimage already committed by v124 identity actor evidence.
 * This contains no identity file, private key, account state or proof challenge.
 */
export type ReceizIdentityPublicBinding = Readonly<Omit<IdentityEvidenceBasis, "schema" | "challengeDigest" | "signatureDigest"> & {
    schema: "receiz.verified-actor-identity-binding.v124";
}>;
/** Projection from genuine admitted private custody; a detached basis never
 * admits a source. Consumers must anchor its digest in the enclosing proof.
 */
export declare function readReceizIdentityPublicBinding(input: unknown): Promise<ReceizIdentityPublicBinding>;
/** Device transport composition beneath the exact admitted Identity Seal.
 * Retains only private runtime custody; never reopens a caller path or accepts a
 * reconstructed key projection. This signs the existing local-action envelope,
 * not a capability to change the artifact or its owner.
 */
export declare function createReceizIdentityDeviceRelaySigner(input: unknown, passphrase?: string): Promise<(request: Readonly<{
    transportOwnerId: string;
    bodyText: string;
    actionId: string;
}>) => Promise<Readonly<{
    "x-receiz-local-action-id": string;
    "x-receiz-local-action-key-id": string;
    "x-receiz-local-action-public-key": string;
    "x-receiz-local-action-challenge": string;
    "x-receiz-local-action-signature": string;
}>>>;
export declare function resolveReceizCheckpointChildAdmissionForEvidenceRoot(evidenceRoot: string, resolve: (evidenceRoot: string) => unknown | Promise<unknown>, verify?: (candidate: unknown) => Promise<unknown>): Promise<ReceizVerifiedArtifactAdmission | null>;
export type ReceizInspectedLegacyProfileShowcaseV114 = Readonly<{
    schema: "receiz.inspected-legacy-profile-showcase.v114";
    status: "inspection-only";
    artifactId: `profile-showcase:${string}`;
    artifactSha256: string;
    payloadSha256: string;
    ownerReceizIdentity: string;
    historyHeadDigest: string;
    resultingOperationCount: number;
    headKaiUpulse: string;
    currentStateRoot: string;
    authority: Readonly<{
        inspectionIsProofAuthority: false;
        paintAllowed: false;
        appendAllowed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizInspectedBoundedProfileShowcaseV114 = Readonly<{
    schema: "receiz.inspected-bounded-profile-showcase.v114";
    status: "inspection-only";
    artifactId: `profile-showcase:${string}`;
    artifactSha256: string;
    payloadSha256: string;
    ownerReceizIdentity: string;
    parentArtifactDigest: string | null;
    historyNodeDigest: string;
    authority: Readonly<{
        inspectionIsProofAuthority: false;
        paintAllowed: false;
        appendAllowed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizVerifiedProfileShowcaseCheckpointV114 = Readonly<{
    schema: "receiz.verified-profile-showcase-checkpoint.v114";
    status: "verified-checkpoint";
    artifactId: `profile-showcase:${string}`;
    checkpointArtifactSha256: string;
    checkpointPayloadSha256: string;
    ownerReceizIdentity: string;
    operationCount: number;
    segmentCount: number;
    historyHeadDigest: string;
    authority: Readonly<{
        checkpointIsProofAuthority: true;
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
type LegacyProfileShowcaseInspectionCustody = Readonly<{
    sourceVerification: Extract<ReceizArtifactVerificationResult, {
        status: "verified-artifact";
    }>;
    artifactBytes: Uint8Array;
    verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    registryDiscovery: ReceizRegistryDiscoveryResult | null;
    carrier: ReceizProfileShowcaseCarrier;
    history: ReceizVerifiedProofHistory;
    internalAdmission: ReceizVerifiedProfileShowcaseAdmission;
}>;
type ProfileShowcaseCheckpointCustody = Readonly<{
    persistentStateIO: ReceizProfileShowcasePersistentStateIOV114 | null;
    sourceArtifact: Blob;
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    build: ReceizProfileShowcaseCheckpointBundleBuildV114;
    historyHead: ReceizCarriedProofHistoryHeadV114;
    predecessorAdmission: ReceizVerifiedArtifactAdmission;
    actorAdmission: ReceizVerifiedArtifactAdmission | null;
    actorPublicBinding: ReceizIdentityPublicBinding | null;
    children: readonly ReceizVerifiedArtifactAdmission[];
    resolveAdmittedChild: (evidenceRoot: string) => Promise<ReceizVerifiedArtifactAdmission | null>;
    segmentIds: readonly string[];
    resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
}>;
/**
 * Explicit compatibility boundary for an exact cumulative-v114 sealed
 * showcase. The result is inspection-only: it is deliberately not registered
 * as an artifact admission and therefore cannot enter ordinary paint or append
 * paths. Its hidden custody is consumed only by the native migration rail.
 */
export declare function inspectReceizLegacyProfileShowcaseV114(input: Readonly<{
    verification: ReceizArtifactVerificationResult;
    ownerConstraint: string;
    dependencies?: ReceizArtifactAdmissionDependencies;
}>): Promise<ReceizInspectedLegacyProfileShowcaseV114>;
export declare function isSdkInspectedLegacyProfileShowcaseV114(value: unknown): value is ReceizInspectedLegacyProfileShowcaseV114;
/** Package-internal migration mechanics; this object remains non-admissible. */
export declare function readReceizLegacyProfileShowcaseInspectionCustody(value: ReceizInspectedLegacyProfileShowcaseV114): LegacyProfileShowcaseInspectionCustody;
/**
 * Exact-byte structural inspection for cold predecessor resolution. This is
 * intentionally not an admission and cannot paint or append by itself.
 */
export declare function inspectReceizBoundedProfileShowcaseV114(input: Readonly<{
    verification: ReceizArtifactVerificationResult;
    ownerConstraint: string;
    dependencies?: ReceizArtifactAdmissionDependencies;
}>): Promise<ReceizInspectedBoundedProfileShowcaseV114>;
/** Package-internal cold resolver mechanics; the inspection remains non-authoritative. */
export declare function readReceizBoundedProfileShowcaseInspectionCarrier(value: ReceizInspectedBoundedProfileShowcaseV114): ReceizBoundedProfileShowcaseCarrierV114;
type ProfileShowcaseCheckpointAdmissionInput = Readonly<{
    checkpointArtifact: Blob;
    canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    verifiedActorEvidence: unknown;
    admittedChildren: readonly unknown[];
    resolveAdmittedChild?: (evidenceRoot: string) => unknown | Promise<unknown>;
    resolvePredecessorAdmission: (artifactDigest: string) => unknown | Promise<unknown>;
    resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
    auditMode?: "full" | "bounded-snapshot";
}>;
export declare function admitReceizProfileShowcaseCheckpointBundleV114(input: ProfileShowcaseCheckpointAdmissionInput): Promise<ReceizVerifiedProfileShowcaseCheckpointV114>;
/** The public preimage is usable only beneath this exact canonical checkpoint.
 * It never becomes identity custody or authority for a new transition. */
export declare function admitReceizProfileShowcaseCheckpointBundleWithSourceActorBindingV114(input: Omit<ProfileShowcaseCheckpointAdmissionInput, "verifiedActorEvidence" | "auditMode"> & Readonly<{
    actorPublicBinding: unknown;
}>): Promise<ReceizVerifiedProfileShowcaseCheckpointV114>;
export declare function isSdkVerifiedProfileShowcaseCheckpointV114(value: unknown): value is ReceizVerifiedProfileShowcaseCheckpointV114;
export declare function readReceizProfileShowcaseCheckpointCustodyV114(value: ReceizVerifiedProfileShowcaseCheckpointV114): ProfileShowcaseCheckpointCustody;
export declare function createReceizProfileShowcaseCheckpointCarrierV114(checkpoint: ReceizVerifiedProfileShowcaseCheckpointV114): Promise<ReceizBoundedProfileShowcaseCarrierV114>;
export declare function admitReceizProfileShowcaseCheckpointCarrierWithContextV114(input: Readonly<{
    checkpoint: ReceizVerifiedProfileShowcaseCheckpointV114;
    candidateArtifact: Blob;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export type ReceizAdmissionBoundArtifactReverification = Readonly<{
    artifact: import("./artifacts.js").ReceizSealedArtifact;
    exactBytes: Uint8Array;
    payloadBytes: Uint8Array;
    artifactDigest: import("./artifactTransition.js").ReceizArtifactDigest;
    payloadDigest: import("./artifactTransition.js").ReceizPayloadDigest;
    verifierContextDigest: string;
}>;
export declare function admitReceizProfileShowcaseSuccessorWithPredecessorContext(input: Readonly<{
    predecessorAdmission: unknown;
    candidateArtifact: unknown;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export declare function admitReceizEconomyShowcaseSuccessorWithPredecessorContext(input: Readonly<{
    predecessorAdmission: unknown;
    candidateArtifact: unknown;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
}>>;
export declare function admitReceizEconomyShowcaseGenesisWithActorContext(input: Readonly<{
    verifiedActorEvidence: unknown;
    candidateArtifact: unknown;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
}>>;
export declare function admitReceizEconomyShowcaseMergeWithParentContext(input: Readonly<{
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    candidateArtifact: unknown;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
}>>;
export declare function admitReceizProfileShowcaseMergeWithParentContext(input: Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    candidateArtifact: unknown;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export declare function admitReceizProfileShowcaseMergeWithExactParentContext(input: Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorArtifact: Blob;
    parentArtifacts: readonly [Blob, Blob];
    parentHistoryNodes: readonly [unknown, unknown];
    candidateArtifact: Blob;
    canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
/**
 * Cold-runtime form of predecessor-context admission. Both proof objects are
 * reverified from their exact sealed bytes under the same out-of-band roots.
 * The separately persisted history node must be the predecessor's exact
 * current node and the candidate's exact parent reference. A durable active
 * pointer is deliberately not accepted as authority here.
 */
export declare function admitReceizProfileShowcaseSuccessorWithExactPredecessorContext(input: Readonly<{
    predecessorArtifact: Blob;
    candidateArtifact: Blob;
    predecessorHistoryNode: unknown;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export declare function admitReceizLegacyProfileShowcaseMigrationWithInspectionContext(input: Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    candidateArtifact: unknown;
    expectedHead: Readonly<Record<string, unknown>>;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export declare function admitReceizProfileShowcaseGenesisWithActorContext(input: Readonly<{
    verifiedActorEvidence: unknown;
    candidateArtifact: unknown;
    artifactId: `profile-showcase:${string}`;
    ownerReceizId: string;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
/** Package-internal: reuses only verifier roots retained by the predecessor admission. */
export declare function reverifyReceizArtifactWithAdmissionContext(input: Readonly<{
    predecessorAdmission: unknown;
    candidateArtifact: unknown;
}>): Promise<ReceizAdmissionBoundArtifactReverification>;
/** Package-internal: genesis verification reuses only roots retained by the verified actor admission. */
export declare function reverifyReceizProfileShowcaseGenesisWithActorContext(input: Readonly<{
    verifiedActorEvidence: unknown;
    candidateArtifact: unknown;
    ownerReceizId: string;
}>): Promise<ReceizAdmissionBoundArtifactReverification>;
export declare function isSdkIssuedReceizArtifactAdmission(value: unknown): value is ReceizVerifiedArtifactAdmission;
/**
 * Package-internal, in-memory compatibility projection for the single bounded
 * genesis node. The sealed carrier and active append authority remain the
 * bounded proof-history head; this projection is never serialized or admitted
 * from caller data and cannot grow across successors.
 */
export declare function projectReceizBoundedGenesisAdmissionHistoryCompatibility(admissionInput: unknown, historyInput: ReceizVerifiedProofHistory): Promise<ReceizVerifiedProfileShowcaseAdmission>;
export declare function verifyReceizArtifactAdmission(admission: unknown): Promise<ReceizVerifiedArtifactAdmission | ReceizAuthorityFailure>;
/** Package-internal retained enclosing source for read-only projection/replay.
 * Reuses existing custody and never accepts detached source/header JSON. */
export declare function readReceizArtifactAdmissionRetainedSource(admissionInput: unknown): Promise<Readonly<{
    status: "verified-artifact";
    verification: import("./artifactVerification.js").ReceizArtifactVerification;
    artifactDigest: import("./artifactTransition.js").ReceizArtifactDigest;
    payloadDigest: import("./artifactTransition.js").ReceizPayloadDigest;
    continuity: import("./artifactVerification.js").ReceizArtifactContinuityAssessment;
    admission: "not-evaluated";
    operationAuthority: "not-evaluated";
}>>;
export declare function rederiveReceizProfileShowcaseCarrierFromAdmission(admissionInput: unknown): Promise<ReceizProfileShowcaseCarrier>;
export declare function rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admissionInput: unknown): Promise<Awaited<ReturnType<typeof parseReceizBoundedProfileShowcaseCarrierV114>>>;
export declare function rederiveReceizEconomyShowcaseCarrierFromAdmission(admissionInput: unknown): Promise<Awaited<ReturnType<typeof parseReceizEconomyShowcaseCarrierV114>>>;
export declare function isSdkAdmittedReceizCapabilityIssuerKey(value: unknown): value is ReceizCapabilityIssuerKey;
export declare function createReceizCapabilityIssuerResolver(input: Readonly<{
    identityAdmissions: readonly ReceizVerifiedArtifactAdmission[];
    revokedIssuerKeyIds: ReadonlySet<string>;
}>): Promise<ReceizCapabilityIssuerResolver>;
export declare function verifyReceizArtifactAdmissionRegistryDiscovery(admission: unknown, discovery: unknown): Promise<ReceizRegistryDiscoveryResult>;
export type ReceizArtifactAdmissionRegistryEvidence = Readonly<{
    registryDigest: string;
    registryEffectiveKai: string;
}>;
export declare function verifyReceizArtifactAdmissionRegistryEvidence(admission: unknown): Promise<ReceizArtifactAdmissionRegistryEvidence>;
export declare function verifyReceizVerifiedActorReference(actor: unknown, admission: unknown): Promise<ReceizVerifiedActorReference | ReceizAuthorityFailure>;
export declare function createReceizArtifactAdmissionEngine(dependencies?: ReceizArtifactAdmissionDependencies): (verificationInput: ReceizArtifactVerificationResult, admissionOptions: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactAdmissionResult>;
/** Package-internal: reuse an admitted source's exact pinned lineage interpretation for actor/capability admission. */
export declare function createReceizArtifactAdmissionEngineWithSourceContext(source: unknown): Promise<(verificationInput: ReceizArtifactVerificationResult, admissionOptions: ReceizArtifactAdmissionOptions) => Promise<ReceizArtifactAdmissionResult>>;
/** Package-internal: verify carried exact bytes under the admitted source's
 * existing pinned roots. No caller-supplied root or verifier context is accepted. */
export declare function verifyReceizArtifactWithSourceContext(source: unknown, input: Parameters<typeof verifyReceizArtifactWithCanonicalRoots>[0]): Promise<ReceizArtifactVerificationResult>;
/** Existing admission custody, not a transported registry claim. */
export declare function readReceizArtifactAdmissionPinnedRegistry(admissionInput: unknown): Promise<ReceizConstitutionRegistry>;
/** Reopen retained identity evidence under its original package-pinned interpretation.
 * This selects historical mechanics only; exact enclosing proof and original
 * admission/actor/context digests must still agree in the custody caller.
 */
export declare function createReceizIdentityAdmissionEngineForRetainedRegistry(registryDigest: string): Promise<(verification: ReceizArtifactVerificationResult, options: Extract<ReceizArtifactAdmissionOptions, {
    profile: "identity";
}>) => Promise<ReceizArtifactAdmissionResult>>;
export {};
//# sourceMappingURL=artifactAdmission.d.ts.map