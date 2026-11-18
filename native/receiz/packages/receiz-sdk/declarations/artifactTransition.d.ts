import { type ReceizInspectedLegacyProfileShowcaseV114 } from "./artifactAdmission.js";
import type { ReceizActorId, ReceizVerifiedActorReference, ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
import { type ReceizConstitutionJson } from "./constitution.js";
import { type ReceizVerifiedProofHistory } from "./proofHistory.js";
import { type ReceizCarriedProofHistoryHeadV114, type ReceizProfileShowcaseSegmentMechanicsV114 } from "./compositeProofTransport.js";
import type { ReceizSealedArtifact } from "./artifacts.js";
import { type ReceizVerifiedArtifactTransitionCandidate } from "./artifactTransitionCandidateCustody.js";
import { type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type { ReceizAppendReceipt, ReceizArtifactTransitionCommitResult, ReceizArtifactTransitionStore, ReceizStagedArtifactTransition, ReceizArtifactTransitionCommitUnit, ReceizArtifactTransitionStoreVerificationInput } from "./artifactTransitionStore.js";
export type ReceizDigest<Binding extends string> = Readonly<{
    algorithm: "sha-256";
    binds: Binding;
    value: string;
}>;
export type ReceizCommitDomainId = Readonly<{
    scheme: "receiz-commit-domain.v1";
    value: string;
}>;
export type ReceizNamespaceId = Readonly<{
    scheme: "receiz-namespace.v1";
    value: string;
}>;
export type ReceizArtifactId = string;
export type ReceizArtifactDigest = ReceizDigest<"exact-artifact-bytes">;
export type ReceizPayloadDigest = ReceizDigest<"verified-payload-bytes">;
export type ReceizHistoryDigest = ReceizDigest<"verified-proof-history">;
export type ReceizNamespaceDigest = ReceizDigest<"canonical-namespace-body">;
export type ReceizEventDigest = ReceizDigest<"canonical-namespace-event">;
export type ReceizRegistryDigest = ReceizDigest<"constitution-registry">;
export type ReceizArtifactTransitionDigest = ReceizDigest<"canonical-artifact-transition">;
export type ReceizPlanDigest = ReceizDigest<"artifact-append-plan">;
export type ReceizCapabilityDigest = ReceizDigest<"verified-capability">;
export type ReceizCommandDigest = ReceizDigest<"artifact-transition-command">;
export type ReceizIdempotencyDigest = ReceizDigest<"domain-scoped-idempotency-identity">;
export type ReceizEffectsDigest = ReceizDigest<"external-operation-effects">;
export type ReceizProofSuiteRequirements = Readonly<{
    signatureVersion: 4;
    carrier: "native-record-seal";
}>;
export type ReceizArtifactTransitionBasis = Readonly<{
    artifactId: ReceizArtifactId;
    priorArtifactDigest: ReceizArtifactDigest;
    basePayloadDigest: ReceizPayloadDigest;
    expectedHead: ReceizHistoryDigest;
    proposedHistoryHead: ReceizHistoryDigest;
    namespace: ReceizNamespaceId;
    namespaceLawVersion: string;
    namespaceReducerVersion: string;
    priorNamespaceBodyDigest: ReceizNamespaceDigest | null;
    eventDigest: ReceizEventDigest;
    proposedNamespaceBodyDigest: ReceizNamespaceDigest;
    preservedNamespaces: readonly Readonly<{
        namespace: ReceizNamespaceId;
        bodyDigest: ReceizNamespaceDigest;
    }>[];
    registryDigest: ReceizRegistryDigest;
    actor: ReceizVerifiedActorReference;
    proofSuiteRequirements: ReceizProofSuiteRequirements;
}>;
export type ReceizArtifactAppendPlanBasis = Readonly<{
    transitionDigest: ReceizArtifactTransitionDigest;
    actor: ReceizVerifiedActorReference;
    resource: ReceizArtifactId;
    operation: "artifact.append";
    commitDomain: ReceizCommitDomainId;
    effectsDigest: ReceizEffectsDigest;
    idempotencyKeyDigest: ReceizIdempotencyDigest;
    registryDigest: ReceizRegistryDigest;
}>;
export type ReceizArtifactAppendPlan = Readonly<ReceizArtifactAppendPlanBasis & {
    schema: "receiz.artifact-append-plan.v112";
    transition: ReceizArtifactTransitionBasis;
    actorConstraint: ReceizActorId | null;
    planDigest: ReceizPlanDigest;
    authority: Readonly<{
        planIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizArtifactAppendCapabilityContext = Readonly<{
    actorId: string;
    tenantId: string | null;
    authorityProfile: ReceizAuthorityProfile;
    operation: "artifact.append" | "profile-showcase.genesis" | "economy-showcase.genesis";
    resourceId: string;
    registryDigest: string;
    maximumEffects: Readonly<Record<string, number>>;
    operationConstraints: Readonly<{
        planDigest: ReceizPlanDigest;
        commitDomain: ReceizCommitDomainId;
    }>;
}>;
export declare const RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_ID = "artifact.append.effects-derived";
export declare const RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_ID = "receiz.namespace.provenance-append.v112@1";
export declare const RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export declare const RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_ID = "receiz.namespace.provenance-append.reducer.v1";
export declare const RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_VERSION = 1;
export declare const RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_ID = "profile-showcase.append.effects-derived";
export declare const RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_ID = "profile-showcase.genesis.effects-derived";
export declare const RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID = "receiz.namespace.profile-showcase-append.v114@1";
export declare const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export declare const RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_ID = "receiz.namespace.profile-showcase.reducer.v1";
export declare const RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION = 1;
export declare const RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_ID = "economy-showcase.append.effects-derived";
export declare const RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_ID = "economy-showcase.genesis.effects-derived";
export declare const RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_ID = "economy-showcase.merge.effects-derived";
export declare const RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_VERSION = 1;
export declare const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID = "receiz.namespace.economy-showcase-append.v114@1";
export declare const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export declare const RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_ID = "receiz.namespace.economy-showcase.reducer.v1";
export declare const RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION = 1;
export type ReceizUnacceptedHeadExpectation = Readonly<{
    scheme: "receiz-unaccepted-head.v1";
    value: null;
}>;
export type ReceizProfileShowcaseGenesisPlan = Readonly<{
    schema: "receiz.profile-showcase-genesis-plan.v114";
    resource: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    actor: ReceizVerifiedActorReference;
    commitDomain: ReceizCommitDomainId;
    unacceptedExpectation: ReceizUnacceptedHeadExpectation;
    showcaseRegistryDigest: ReceizRegistryDigest;
    operationMatrixDigest: ReceizDigest<"application-operation-matrix">;
    canonicalGenesisBodyDigest: ReceizNamespaceDigest;
    operationDigest: ReceizDigest<"profile-showcase-operations">;
    childAdmissionEvidenceRoots: readonly string[];
    genesisKaiUpulse: string;
    registryDigest: ReceizRegistryDigest;
    effectsDigest: ReceizEffectsDigest;
    idempotencyKeyDigest: ReceizIdempotencyDigest;
    planDigest: ReceizPlanDigest;
    authority: Readonly<{
        planIsProofAuthority: false;
        acceptedHeadIsClaimed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProfileShowcaseGenesisSealer = (input: Readonly<{
    plan: ReceizProfileShowcaseGenesisPlan;
    artifactId: `profile-showcase:${string}`;
    payloadBytes: Uint8Array;
    predecessor: null;
}>) => Promise<ReceizSealedArtifact>;
export type ReceizLocallyVerifiedProfileShowcaseGenesis = Readonly<{
    status: "locally-verified-profile-showcase-genesis";
    artifact: ReceizSealedArtifact;
    artifactDigest: ReceizArtifactDigest;
    admission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "profile-showcase";
    }>;
    history: ReceizVerifiedProofHistory;
    proofHistoryHead: ReceizCarriedProofHistoryHeadV114;
    acceptedHead: null;
    coordination: Readonly<{
        status: "unaccepted";
        coordinationStatusIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizEconomyShowcaseGenesisPlan = Readonly<{
    schema: "receiz.economy-showcase-genesis-plan.v114";
    resource: "economy-showcase:receiz.com";
    actor: ReceizVerifiedActorReference;
    commitDomain: ReceizCommitDomainId;
    unacceptedExpectation: ReceizUnacceptedHeadExpectation;
    showcaseRegistryDigest: ReceizRegistryDigest;
    operationMatrixDigest: ReceizDigest<"application-operation-matrix">;
    canonicalGenesisBodyDigest: ReceizNamespaceDigest;
    genesisKaiUpulse: string;
    registryDigest: ReceizRegistryDigest;
    effectsDigest: ReceizEffectsDigest;
    idempotencyKeyDigest: ReceizIdempotencyDigest;
    planDigest: ReceizPlanDigest;
    authority: Readonly<{
        planIsProofAuthority: false;
        acceptedHeadIsClaimed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizEconomyShowcaseGenesisSealer = (input: Readonly<{
    plan: ReceizEconomyShowcaseGenesisPlan;
    artifactId: "economy-showcase:receiz.com";
    payloadBytes: Uint8Array;
    predecessor: null;
}>) => Promise<ReceizSealedArtifact>;
export type ReceizLocallyVerifiedEconomyShowcaseGenesis = Readonly<{
    status: "locally-verified-economy-showcase-genesis";
    artifact: ReceizSealedArtifact;
    artifactDigest: ReceizArtifactDigest;
    admission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "economy-showcase";
    }>;
    proofHistoryHead: ReceizCarriedProofHistoryHeadV114;
    acceptedHead: null;
    coordination: Readonly<{
        status: "unaccepted";
        coordinationStatusIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function bindReceizArtifactAppendRegistryAuthority(input: Readonly<{
    admission: unknown;
    registryDiscovery: unknown;
}>): Promise<void>;
export declare function bindReceizCurrentArtifactAppendRegistryAuthority(input: Readonly<{
    admission: unknown;
    registry: unknown;
}>): Promise<void>;
export declare function bindReceizV114ProfileShowcaseRegistryAuthority(input: Readonly<{
    admission: unknown;
    registry: unknown;
}>): Promise<void>;
export declare function bindReceizV114EconomyShowcaseRegistryAuthority(input: Readonly<{
    admission: unknown;
    registry: unknown;
}>): Promise<void>;
export declare function planReceizProfileShowcaseGenesis(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    showcase: Readonly<Record<string, ReceizConstitutionJson>>;
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    genesisKaiUpulse: string;
    unacceptedExpectation: ReceizUnacceptedHeadExpectation;
    idempotencyKey: string;
}>): Promise<ReceizProfileShowcaseGenesisPlan>;
export declare function receizProfileShowcaseGenesisCapabilityContext(plan: ReceizProfileShowcaseGenesisPlan): ReceizArtifactAppendCapabilityContext;
export declare function readReceizProfileShowcaseGenesisBody(plan: ReceizProfileShowcaseGenesisPlan): Readonly<Record<string, ReceizConstitutionJson>>;
export declare function sealReceizProfileShowcaseGenesis(input: Readonly<{
    plan: ReceizProfileShowcaseGenesisPlan;
    capability: ReceizVerifiedCapability;
    sealer: ReceizProfileShowcaseGenesisSealer;
}>): Promise<ReceizLocallyVerifiedProfileShowcaseGenesis>;
export declare function planReceizEconomyShowcaseGenesis(input: Readonly<{
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    genesisKaiUpulse: string;
    unacceptedExpectation: ReceizUnacceptedHeadExpectation;
    idempotencyKey: string;
}>): Promise<ReceizEconomyShowcaseGenesisPlan>;
export declare function receizEconomyShowcaseGenesisCapabilityContext(plan: ReceizEconomyShowcaseGenesisPlan): ReceizArtifactAppendCapabilityContext;
export declare function readReceizEconomyShowcaseGenesisHead(plan: ReceizEconomyShowcaseGenesisPlan): import("./economyShowcaseTransport.js").ReceizEconomyShowcaseHeadV114;
export declare function sealReceizEconomyShowcaseGenesis(input: Readonly<{
    plan: ReceizEconomyShowcaseGenesisPlan;
    capability: ReceizVerifiedCapability;
    sealer: ReceizEconomyShowcaseGenesisSealer;
}>): Promise<ReceizLocallyVerifiedEconomyShowcaseGenesis>;
export declare function isSdkIssuedReceizArtifactAppendPlan(value: unknown): value is ReceizArtifactAppendPlan;
type LegacyProfileShowcaseMigrationPlanningContext = Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    predecessorHistoryHead: ReceizCarriedProofHistoryHeadV114;
    boundedHead: Readonly<Record<string, unknown>>;
    resolvedChildren: readonly Readonly<{
        reference: Readonly<Record<string, unknown>>;
        admission: ReceizVerifiedArtifactAdmission;
    }>[];
    segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
}>;
type EconomyShowcaseAppendPlanningContext = Readonly<{
    kind: "append";
    economyAdmission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "economy-showcase";
    }>;
    profileAdmission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "profile-showcase";
    }>;
    resultingEconomyShowcase: Readonly<Record<string, unknown>>;
}>;
type EconomyShowcaseMergePlanningContext = Readonly<{
    kind: "merge";
    economyAdmission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "economy-showcase";
    }>;
    commonPredecessorAdmission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "economy-showcase";
    }>;
    parentAdmissions: readonly [
        Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
        }>,
        Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
        }>
    ];
    parentHistoryHeads: readonly [
        ReceizCarriedProofHistoryHeadV114,
        ReceizCarriedProofHistoryHeadV114
    ];
    resultingEconomyShowcase: Readonly<Record<string, unknown>>;
}>;
type EconomyShowcaseCompositionPlanningContext = EconomyShowcaseAppendPlanningContext | EconomyShowcaseMergePlanningContext;
type ProfileShowcaseMergePlanningContext = Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorAdmission: Extract<ReceizVerifiedArtifactAdmission, {
        profile: "profile-showcase";
    }>;
    parentAdmissions: readonly [
        Extract<ReceizVerifiedArtifactAdmission, {
            profile: "profile-showcase";
        }>,
        Extract<ReceizVerifiedArtifactAdmission, {
            profile: "profile-showcase";
        }>
    ];
    parentHistoryHeads: readonly [
        ReceizCarriedProofHistoryHeadV114,
        ReceizCarriedProofHistoryHeadV114
    ];
    resultingShowcase: Readonly<Record<string, unknown>>;
}>;
declare function planArtifactAppendInternal(input: Readonly<{
    admission: unknown;
    verifiedHistory: unknown;
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    namespace: ReceizNamespaceId;
    event: ReceizConstitutionJson;
    expectedHead: ReceizHistoryDigest;
    idempotencyKey: string;
    additionalVerifiedHistories?: readonly unknown[];
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>, migration: LegacyProfileShowcaseMigrationPlanningContext | null, economyComposition?: EconomyShowcaseCompositionPlanningContext | null, profileMerge?: ProfileShowcaseMergePlanningContext | null, exactKksInput?: Readonly<{
    coordinate: unknown;
}> | null): Promise<ReceizArtifactAppendPlan>;
export declare function planArtifactAppend(input: Parameters<typeof planArtifactAppendInternal>[0]): Promise<ReceizArtifactAppendPlan>;
/** Package-internal exact-KKS append; existing sealed history is the authority. */
export declare function planReceizExactKksArtifactAppend(input: Parameters<typeof planArtifactAppend>[0] & Readonly<{
    kksCoordinate: unknown;
}>): Promise<ReceizArtifactAppendPlan>;
export declare function planReceizEconomyShowcaseAppend(input: Readonly<{
    economyAdmission: unknown;
    profileShowcaseAdmission: unknown;
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    expectedHead: ReceizHistoryDigest;
    idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan>;
export declare function planReceizEconomyShowcaseMerge(input: Readonly<{
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    expectedHead: ReceizHistoryDigest;
    idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan>;
export declare function planReceizProfileShowcaseBoundedMerge(input: Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    directDelta: readonly ReceizConstitutionJson[];
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    expectedHead: ReceizHistoryDigest;
    idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan>;
export type ReceizLegacyProfileShowcaseMigrationEvidenceResolver = (evidenceRoot: string) => Promise<unknown>;
export type ReceizLegacyProfileShowcaseMigrationSegmentResolver = (segmentId: string) => Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;
export declare function planLegacyProfileShowcaseCheckpointMigration(input: Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    verifiedActorEvidence: unknown;
    commitDomain: ReceizCommitDomainId;
    idempotencyKey: string;
    resolveEvidence: ReceizLegacyProfileShowcaseMigrationEvidenceResolver;
    resolveSegment: ReceizLegacyProfileShowcaseMigrationSegmentResolver;
}>): Promise<ReceizArtifactAppendPlan>;
export declare function receizArtifactAppendCapabilityContext(plan: ReceizArtifactAppendPlan, input?: Readonly<{
    tenantId: string | null;
    authorityProfile: ReceizAuthorityProfile;
}>): ReceizArtifactAppendCapabilityContext;
export declare function assertReceizArtifactAppendPlanCustody(plan: ReceizArtifactAppendPlan): asserts plan is ReceizArtifactAppendPlan;
export declare function readReceizArtifactAppendDerivedEffects(plan: ReceizArtifactAppendPlan): Readonly<Record<string, number>>;
export declare function readReceizArtifactAppendPlannedEvent(plan: ReceizArtifactAppendPlan): ReceizConstitutionJson;
/**
 * Exposes the SDK-custodied direct history-parent set for composition checks.
 * These are mechanics beneath the sealed successor, never caller authority.
 */
export declare function readReceizArtifactAppendPlannedHistoryParents(plan: ReceizArtifactAppendPlan): readonly string[];
export declare function readReceizLegacyProfileShowcaseMigrationPlanCustody(plan: ReceizArtifactAppendPlan): Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    children: readonly Readonly<{
        reference: Readonly<Record<string, unknown>>;
        admission: ReceizVerifiedArtifactAdmission;
    }>[];
    segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
}>;
export declare function admitReceizProfileShowcaseTransitionSuccessor(input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    candidateArtifact: ReceizSealedArtifact;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
}>>;
export declare function admitReceizEconomyShowcaseTransitionSuccessor(input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    candidateArtifact: ReceizSealedArtifact;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
}>>;
export type ReceizArtifactTransitionSealer = (input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    predecessor: ReceizVerifiedArtifactAdmission;
    successorPayloadBytes: Uint8Array;
}>) => Promise<ReceizSealedArtifact>;
export type ReceizCommittedArtifactTransition = Readonly<{
    status: "committed-artifact-transition";
    acceptance: "committed" | "idempotent";
    artifact: ReceizSealedArtifact;
    artifactDigest: ReceizArtifactDigest;
    history: ReceizVerifiedProofHistory | null;
    proofHistoryHead: ReceizCarriedProofHistoryHeadV114 | null;
    receipt: ReceizAppendReceipt;
    committed: true;
}>;
export type ReceizArtifactTransitionOperationResult = ReceizCommittedArtifactTransition | Extract<ReceizArtifactTransitionCommitResult, {
    status: "conflict" | "rejected" | "failed";
}>;
type ReceizCommittedArtifactTransitionCustody = Readonly<{
    plan: ReceizArtifactAppendPlan;
    admission: ReceizVerifiedArtifactAdmission;
}>;
export declare function isSdkIssuedReceizCommittedArtifactTransition(value: unknown): value is ReceizCommittedArtifactTransition;
export declare function readSdkIssuedReceizCommittedArtifactTransitionCustody(value: ReceizCommittedArtifactTransition): ReceizCommittedArtifactTransitionCustody;
/**
 * Safe mechanics for conforming stores. It can only verify an exact
 * SDK-custodied unit against a detached snapshot resolved by the store under
 * its own lock. It returns no authority object or verifier context.
 */
export declare function verifyReceizArtifactTransitionCommitCandidate(unit: ReceizArtifactTransitionCommitUnit, freshStoreSnapshot: ReceizArtifactTransitionStoreVerificationInput): Promise<boolean>;
export declare function sealArtifactTransitionCandidate(input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    capability: ReceizVerifiedCapability;
    sealer: ReceizArtifactTransitionSealer;
}>): Promise<ReceizVerifiedArtifactTransitionCandidate>;
export declare function commitArtifactTransition(input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    capability: ReceizVerifiedCapability;
    staged: ReceizStagedArtifactTransition;
    store: ReceizArtifactTransitionStore;
}>): Promise<ReceizArtifactTransitionOperationResult>;
export {};
//# sourceMappingURL=artifactTransition.d.ts.map