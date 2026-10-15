import { readReceizArtifactTransitionAtomicRequirements } from "./artifactTransitionAtomicRequirements.js";
import { verifyPackageCurrentRegistry, verifyPackagePinnedHistoryRegistry } from "./currentRegistryAuthority.js";
import {
  admitReceizProfileShowcaseGenesisWithActorContext,
  admitReceizEconomyShowcaseGenesisWithActorContext,
  admitReceizEconomyShowcaseMergeWithParentContext,
  admitReceizProfileShowcaseMergeWithParentContext,
  admitReceizLegacyProfileShowcaseMigrationWithInspectionContext,
  admitReceizProfileShowcaseSuccessorWithPredecessorContext,
  admitReceizEconomyShowcaseSuccessorWithPredecessorContext,
  isSdkInspectedLegacyProfileShowcaseV114,
  projectReceizBoundedGenesisAdmissionHistoryCompatibility,
  readReceizLegacyProfileShowcaseInspectionCustody,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  rederiveReceizEconomyShowcaseCarrierFromAdmission,
  reverifyReceizProfileShowcaseGenesisWithActorContext,
  reverifyReceizArtifactWithAdmissionContext,
  verifyReceizArtifactAdmission,
  readReceizArtifactAdmissionPinnedRegistry,
  verifyReceizArtifactAdmissionRegistryDiscovery,
  verifyReceizVerifiedActorReference,
  type ReceizInspectedLegacyProfileShowcaseV114,
} from "./artifactAdmission.js";
import type {
  ReceizActorId,
  ReceizVerifiedActorReference,
  ReceizVerifiedArtifactAdmission,
  ReceizVerifiedIdentityAdmission,
} from "./artifactAdmissionTypes.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  admitReceizKksV1ProofCoordinate,
  type ReceizKksV1ProofCoordinate,
} from "./v125KaiAuthority.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  validateReceizConstitutionRegistry,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { RECEIZ_V114_CONSTITUTION_REGISTRY } from "./v114Registry.generated.js";
import {
  RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
} from "./appContract.js";
import {
  composeReceizNamespaceReductionPayload,
  RECEIZ_PROFILE_SHOWCASE_NAMESPACE_LAW_VERSION,
  RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REDUCER_VERSION,
  RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_LAW_VERSION,
  RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REDUCER_VERSION,
  RECEIZ_PROVENANCE_NAMESPACE_LAW_VERSION,
  RECEIZ_PROVENANCE_NAMESPACE_REDUCER_VERSION,
  reduceReceizNamespace,
  snapshotReceizNamespaceBodies,
  type ReceizNamespaceReduction,
} from "./namespaceReducer.js";
import {
  createReceizArtifactTransitionProofHistoryAppendNode,
  deriveReceizProfileShowcaseHistoryBinding,
  createReceizProofHistoryNode,
  createReceizProfileShowcaseProofHistoryNode,
  issueReceizVerifiedArtifactTransitionHistory,
  normalizeReceizProofHistory,
  readReceizProofHistoryExactKksCoordinate,
  verifyReceizProofHistory,
  verifyReceizCarriedProofHistory,
  type ReceizProofHistory,
  type ReceizProofHistoryNode,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";
import {
  appendReceizCarriedProofHistoryHeadV114,
  assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114,
  assertReceizEconomyShowcaseCarriedHeadSemanticsV114,
  assertReceizProfileShowcaseBoundedHeadV114,
  createReceizBoundedProfileShowcaseCarrierV114,
  createReceizEconomyShowcaseCarrierV114,
  createReceizCarriedProofHistoryHeadV114,
  createReceizProfileShowcaseSegmentMechanicsV114,
  deriveReceizLegacyProfileShowcaseCheckpointHeadV114,
  digestReceizProfileShowcaseOperationLeafV114,
  deriveReceizProfileShowcaseBoundedGenesisHeadV114,
  deriveReceizProfileShowcaseBoundedMergeHeadV114,
  verifyReceizProfileShowcaseBoundedMergeV114,
  verifyReceizProfileShowcaseBoundedSuccessorV114,
  parseReceizCarriedProofHistoryHeadV114,
  parseReceizBoundedProfileShowcaseCarrierV114,
  parseReceizEconomyShowcaseCarrierV114,
  mergeReceizCarriedProofHistoryHeadsV114,
  type ReceizCarriedProofHistoryHeadV114,
  type ReceizProfileShowcaseSegmentMechanicsV114,
} from "./compositeProofTransport.js";
import {
  assertReceizEconomyShowcaseHeadV114TransportContract,
  deriveReceizEconomyShowcaseGenesisHeadV114,
  deriveReceizEconomyShowcaseMergeHeadV114,
  deriveReceizEconomyShowcaseSuccessorHeadV114,
  verifyReceizEconomyShowcaseMergeV114,
  verifyReceizEconomyShowcaseSuccessorV114,
} from "./economyShowcaseTransport.js";
import {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  receizCompositeFibonacciDistancesUpTo,
} from "./compositeProofKernel.js";
import {
  createEmptyReceizProfileShowcasePersistentStateV114,
  createReceizProfileShowcasePersistentMemoryStoreV114,
  deriveReceizProfileShowcasePersistentWindowV114,
  reduceReceizProfileShowcasePersistentStateV114,
} from "./profileShowcasePersistentState.js";
import type { ReceizRegistryDiscoveryResult } from "./registryDiscovery.js";
import {
  RECEIZ_CURRENT_REGISTRY_DIGEST,
  RECEIZ_V113_REGISTRY_DIGEST,
  RECEIZ_V114_REGISTRY_DIGEST,
  RECEIZ_V114_REGISTRY_EFFECTIVE_KAI,
} from "./releaseIdentity.js";
import type { ReceizSealedArtifact } from "./artifacts.js";
import {
  attachReceizProfileShowcaseProofHistoryBytes,
  createReceizProfileShowcaseCarrier as _createReceizProfileShowcaseCarrier,
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  parseReceizProfileShowcaseCarrier,
  replaceReceizPortableProofHistoryBytes,
  serializeReceizProfileShowcaseCarrier as _serializeReceizProfileShowcaseCarrier,
} from "./portableAsset.js";
import {
  assertReceizProfileShowcaseGenesisV114TransportContract,
} from "./profileShowcaseTransport.js";
import {
  registerReceizArtifactTransitionCandidateCustody,
  type ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionCandidateCustody.js";
import { isReceizVerifiedCapability, type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type {
  ReceizAppendReceipt,
  ReceizArtifactTransitionCommitCommandBasis,
  ReceizArtifactTransitionCommitResult,
  ReceizArtifactTransitionStore,
  ReceizStagedArtifactTransition,
  ReceizArtifactTransitionCommitUnit,
  ReceizArtifactTransitionStoreVerificationInput,
} from "./artifactTransitionStore.js";
import { receizArtifactTransitionBasisEquals } from "./artifactTransitionEquality.js";
import {
  readReceizCanonicalArtifactTransitionCommitUnit,
  registerReceizCanonicalArtifactTransitionCommitUnit,
} from "./artifactTransitionCommitCustody.js";

export type ReceizDigest<Binding extends string> = Readonly<{
  algorithm: "sha-256";
  binds: Binding;
  value: string;
}>;

export type ReceizCommitDomainId = Readonly<{ scheme: "receiz-commit-domain.v1"; value: string }>;
export type ReceizNamespaceId = Readonly<{ scheme: "receiz-namespace.v1"; value: string }>;
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
export type ReceizProofSuiteRequirements = Readonly<{ signatureVersion: 4; carrier: "native-record-seal" }>;

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
  preservedNamespaces: readonly Readonly<{ namespace: ReceizNamespaceId; bodyDigest: ReceizNamespaceDigest }>[];
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
  operation:
    | "artifact.append"
    | "profile-showcase.genesis"
    | "economy-showcase.genesis";
  resourceId: string;
  registryDigest: string;
  maximumEffects: Readonly<Record<string, number>>;
  operationConstraints: Readonly<{
    planDigest: ReceizPlanDigest;
    commitDomain: ReceizCommitDomainId;
  }>;
}>;

export const RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_ID = "artifact.append.effects-derived";
export const RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_VERSION = 1;
export const RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_ID = "receiz.namespace.provenance-append.v112@1";
export const RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export const RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_ID = "receiz.namespace.provenance-append.reducer.v1";
export const RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_VERSION = 1;
export const RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_ID = "profile-showcase.append.effects-derived";
export const RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_VERSION = 1;
export const RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_ID =
  "profile-showcase.genesis.effects-derived";
export const RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_VERSION = 1;
export const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID =
  "receiz.namespace.profile-showcase-append.v114@1";
export const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export const RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_ID =
  "receiz.namespace.profile-showcase.reducer.v1";
export const RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION = 1;
export const RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_ID =
  "economy-showcase.append.effects-derived";
export const RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_VERSION = 1;
export const RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_ID =
  "economy-showcase.genesis.effects-derived";
export const RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_VERSION = 1;
export const RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_ID =
  "economy-showcase.merge.effects-derived";
export const RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_VERSION = 1;
export const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID =
  "receiz.namespace.economy-showcase-append.v114@1";
export const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION = 1;
export const RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_ID =
  "receiz.namespace.economy-showcase.reducer.v1";
export const RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION = 1;

type PlanCustody = Readonly<{
  exactKksCoordinate: ReceizKksV1ProofCoordinate | null;
  admission: ReceizVerifiedArtifactAdmission;
  verifiedHistory: ReceizVerifiedProofHistory | null;
  verifiedHistoryHead: ReceizCarriedProofHistoryHeadV114 | null;
  verifiedActorEvidence: ReceizVerifiedIdentityAdmission;
  reduction: ReceizNamespaceReduction;
  derivedEffects: Readonly<Record<string, number>>;
  event: ReceizConstitutionJson;
  appendNode: ReceizProofHistoryNode;
  parentHistoryHeads: readonly string[];
  successorCarriedHistory: ReceizProofHistory | null;
  successorCarriedHistoryHead: ReceizCarriedProofHistoryHeadV114 | null;
  legacyMigration: null | Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    predecessorHistoryHead: ReceizCarriedProofHistoryHeadV114;
    boundedHead: Readonly<Record<string, unknown>>;
    resolvedChildren: readonly Readonly<{
      reference: Readonly<Record<string, unknown>>;
      admission: ReceizVerifiedArtifactAdmission;
    }>[];
    segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
  }>;
  economyMerge: EconomyShowcaseMergePlanningContext | null;
  profileMerge: ProfileShowcaseMergePlanningContext | null;
}>;

const planCustody = new WeakMap<object, PlanCustody>();
type ReceizAppendRegistryAuthority =
  | Readonly<{ kind: "discovered"; discovery: ReceizRegistryDiscoveryResult }>
  | Readonly<{
    kind: "package-current" | "package-history";
    registry: typeof RECEIZ_CURRENT_CONSTITUTION_REGISTRY;
    registryDigest: string;
    laws: readonly Readonly<{ id: string; version: number }>[];
  }>
  | Readonly<{
    kind: "composite-v114";
    registry: typeof RECEIZ_V114_CONSTITUTION_REGISTRY;
    registryDigest: string;
    laws: readonly Readonly<{ id: string; version: number }>[];
  }>;
const appendRegistryAuthority = new WeakMap<object, ReceizAppendRegistryAuthority>();
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

type ProfileShowcaseGenesisCustody = Readonly<{
  verifiedActorEvidence: ReceizVerifiedIdentityAdmission;
  showcase: Readonly<Record<string, ReceizConstitutionJson>>;
  derivedEffects: Readonly<Record<string, number>>;
}>;

const profileShowcaseGenesisPlanCustody =
  new WeakMap<object, ProfileShowcaseGenesisCustody>();

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
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
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

type EconomyShowcaseGenesisCustody = Readonly<{
  verifiedActorEvidence: ReceizVerifiedIdentityAdmission;
  head: import("./economyShowcaseTransport.js").ReceizEconomyShowcaseHeadV114;
  derivedEffects: Readonly<Record<string, number>>;
}>;

const economyShowcaseGenesisPlanCustody =
  new WeakMap<object, EconomyShowcaseGenesisCustody>();

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
const INPUT_KEYS = [
  "admission",
  "commitDomain",
  "event",
  "expectedHead",
  "idempotencyKey",
  "namespace",
  "verifiedActorEvidence",
  "verifiedHistory",
] as const;

function digest<Binding extends string>(binds: Binding, value: string): ReceizDigest<Binding> {
  return Object.freeze({ algorithm: "sha-256", binds, value });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function validIdentifier(value: string): boolean {
  return value.length > 0 && value === value.normalize("NFC") && !/[\u0000-\u001f\u007f]/u.test(value);
}

function assertCommitDomain(value: unknown): asserts value is ReceizCommitDomainId {
  if (!value || typeof value !== "object"
    || Object.keys(value).sort().join(",") !== "scheme,value"
    || (value as ReceizCommitDomainId).scheme !== "receiz-commit-domain.v1"
    || !validIdentifier((value as ReceizCommitDomainId).value)) throw new TypeError("COMMIT_DOMAIN_INVALID");
}

function assertNamespace(value: unknown): asserts value is ReceizNamespaceId {
  if (!value || typeof value !== "object"
    || Object.keys(value).sort().join(",") !== "scheme,value"
    || (value as ReceizNamespaceId).scheme !== "receiz-namespace.v1"
    || !validIdentifier((value as ReceizNamespaceId).value)) throw new TypeError("NAMESPACE_ID_INVALID");
}

function assertHistoryDigest(value: unknown): asserts value is ReceizHistoryDigest {
  if (!value || typeof value !== "object"
    || Object.keys(value).sort().join(",") !== "algorithm,binds,value"
    || (value as ReceizHistoryDigest).algorithm !== "sha-256"
    || (value as ReceizHistoryDigest).binds !== "verified-proof-history"
    || !/^[0-9a-f]{64}$/.test((value as ReceizHistoryDigest).value)) throw new TypeError("EXPECTED_HEAD_INVALID");
}

function compareCanonicalText(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.min(leftBytes.byteLength, rightBytes.byteLength);
  for (let index = 0; index < length; index += 1) {
    const delta = leftBytes[index]! - rightBytes[index]!;
    if (delta !== 0) return delta;
  }
  return leftBytes.byteLength - rightBytes.byteLength;
}

function stableBasePayloadDigest(admission: ReceizVerifiedArtifactAdmission): ReceizPayloadDigest {
  if (
    admission.profile === "profile-showcase"
    || admission.profile === "economy-showcase"
  ) {
    return digest("verified-payload-bytes", admission.payloadSha256);
  }
  const payload = admission.recoveredState.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || typeof (payload as { sha256?: unknown }).sha256 !== "string"
    || !/^[0-9a-f]{64}$/.test((payload as { sha256: string }).sha256)) {
    throw new TypeError("BASE_PAYLOAD_DIGEST_INVALID");
  }
  const value = (payload as { sha256: string }).sha256;
  if (admission.artifactId !== value) throw new TypeError("ARTIFACT_IDENTITY_MISMATCH");
  return digest("verified-payload-bytes", value);
}

function derivedEffects(input: Readonly<{
  registryDigest: ReceizRegistryDigest;
  resource: string;
  namespace: ReceizNamespaceId;
  eventDigest: ReceizEventDigest;
  operationLawId: string;
  operationLawVersion: number;
}>): Readonly<Record<string, number>> {
  return deepFreeze({
    "artifact.append": 1,
    [`namespace:${input.namespace.value}:append`]: 1,
    [`event:${input.eventDigest.value}`]: 1,
    [`law:${input.operationLawId}@${input.operationLawVersion}`]: 1,
    [`registry:${input.registryDigest.value}`]: 1,
    [`resource:${input.resource}`]: 1,
  });
}

function hasExactLaw(
  authority: ReceizAppendRegistryAuthority,
  lawId: string,
  lawVersion: number,
): boolean {
  if (authority.kind !== "discovered") {
    return authority.laws.some((law) => law.id === lawId && law.version === lawVersion);
  }
  const { discovery } = authority;
  return discovery.laws.some((law) => law.lawId === lawId
    && law.lawVersion === lawVersion
    && law.registryDigest.value === discovery.trustEvidence.currentRegistryDigest.value
    && law.registrySignatureStatus === "verified");
}

function assertArtifactAppendRegistryInventory(
  authority: ReceizAppendRegistryAuthority,
  profile: ReceizVerifiedArtifactAdmission["profile"],
): void {
  const economyShowcase = profile === "economy-showcase";
  const profileShowcase = profile === "profile-showcase";
  const operationLaw = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_ID
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_ID
      : RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_ID;
  const operationLawVersion = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_VERSION
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_VERSION
      : RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_VERSION;
  const namespaceLaw = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_ID
      : RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_ID;
  const namespaceLawVersion = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REGISTRY_LAW_VERSION
      : RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_VERSION;
  const reducerLaw = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_ID
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_ID
      : RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_ID;
  const reducerLawVersion = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_REDUCER_REGISTRY_LAW_VERSION
      : RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_VERSION;
  if (!hasExactLaw(authority, operationLaw, operationLawVersion)
    || (profileShowcase
      && !hasExactLaw(
        authority,
        RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_ID,
        RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_VERSION,
      ))
    || !hasExactLaw(authority, namespaceLaw, namespaceLawVersion)
    || !hasExactLaw(authority, reducerLaw, reducerLawVersion)) {
    throw new TypeError("ARTIFACT_APPEND_REGISTRY_LAW_UNSUPPORTED");
  }
}


async function verifyPackageV114Registry(registry: unknown): Promise<void> {
  if (registry !== RECEIZ_V114_CONSTITUTION_REGISTRY) {
    throw new TypeError("V114_REGISTRY_RUNTIME_CUSTODY_REQUIRED");
  }
  const validation = validateReceizConstitutionRegistry(RECEIZ_V114_CONSTITUTION_REGISTRY);
  if (!validation.ok
    || RECEIZ_V114_CONSTITUTION_REGISTRY.version !== "114.0.0"
    || RECEIZ_V114_CONSTITUTION_REGISTRY.effectiveKai !== RECEIZ_V114_REGISTRY_EFFECTIVE_KAI
    || RECEIZ_V114_CONSTITUTION_REGISTRY.previousRegistryDigest !== RECEIZ_V113_REGISTRY_DIGEST
    || await digestReceizConstitution(RECEIZ_V114_CONSTITUTION_REGISTRY)
      !== RECEIZ_V114_REGISTRY_DIGEST) {
    throw new TypeError("V114_REGISTRY_DIGEST_MISMATCH");
  }
}

export async function bindReceizArtifactAppendRegistryAuthority(input: Readonly<{
  admission: unknown;
  registryDiscovery: unknown;
}>): Promise<void> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,registryDiscovery") {
    throw new TypeError("ARTIFACT_APPEND_REGISTRY_BINDING_INVALID");
  }
  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission) throw new TypeError(admission.code);
  const discovery = await verifyReceizArtifactAdmissionRegistryDiscovery(admission, input.registryDiscovery);
  const authority = Object.freeze({ kind: "discovered", discovery } as const);
  assertArtifactAppendRegistryInventory(authority, admission.profile);
  appendRegistryAuthority.set(admission, authority);
}

/** Ordinary append retains the sealed lineage's law, only while these exact laws remain inherited current law. */
function assertExactInheritedArtifactAppendLaws(registry: typeof RECEIZ_CURRENT_CONSTITUTION_REGISTRY): void {
  for (const lawId of [RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_ID, RECEIZ_PROVENANCE_NAMESPACE_REGISTRY_LAW_ID, RECEIZ_PROVENANCE_REDUCER_REGISTRY_LAW_ID]) {
    const historical = registry.laws.filter((law) => law.id === lawId);
    const current = RECEIZ_CURRENT_CONSTITUTION_REGISTRY.laws.filter((law) => law.id === lawId);
    if (historical.length !== 1 || current.length !== 1
      || canonicalizeReceizConstitution(historical[0]) !== canonicalizeReceizConstitution(current[0])) {
      throw new TypeError("ARTIFACT_APPEND_HISTORICAL_LAW_NOT_INHERITED");
    }
  }
}

export async function bindReceizCurrentArtifactAppendRegistryAuthority(input: Readonly<{
  admission: unknown;
  registry: unknown;
}>): Promise<void> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,registry") {
    throw new TypeError("ARTIFACT_APPEND_REGISTRY_BINDING_INVALID");
  }
  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission) throw new TypeError(admission.code);
  await verifyPackageCurrentRegistry(input.registry);
  const historical = admission.admissionProof.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST;
  let registry = RECEIZ_CURRENT_CONSTITUTION_REGISTRY;
  if (historical) {
    if (admission.profile !== "portable-state" || !admission.proofHistory
      || admission.proofHistory.registryDigest !== admission.admissionProof.registryDigest) throw new TypeError("REGISTRY_DIGEST_MISMATCH");
    registry = await readReceizArtifactAdmissionPinnedRegistry(admission);
    assertExactInheritedArtifactAppendLaws(registry);
  }
  const authority = Object.freeze({
    kind: historical ? "package-history" : "package-current",
    registry,
    registryDigest: admission.admissionProof.registryDigest,
    laws: registry.laws.map((law) => Object.freeze({ id: law.id, version: law.version })),
  } as const);
  assertArtifactAppendRegistryInventory(authority, admission.profile);
  appendRegistryAuthority.set(admission, authority);
}

export async function bindReceizV114ProfileShowcaseRegistryAuthority(input: Readonly<{
  admission: unknown;
  registry: unknown;
}>): Promise<void> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,registry") {
    throw new TypeError("PROFILE_SHOWCASE_REGISTRY_BINDING_INVALID");
  }
  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission || admission.profile !== "profile-showcase") {
    throw new TypeError("PROFILE_SHOWCASE_ADMISSION_REQUIRED");
  }
  await verifyPackageV114Registry(input.registry);
  const authority = Object.freeze({
    kind: "composite-v114",
    registry: RECEIZ_V114_CONSTITUTION_REGISTRY,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    laws: RECEIZ_V114_CONSTITUTION_REGISTRY.laws.map((law) =>
      Object.freeze({ id: law.id, version: law.version })),
  } as const);
  assertArtifactAppendRegistryInventory(authority, admission.profile);
  appendRegistryAuthority.set(admission, authority);
}

export async function bindReceizV114EconomyShowcaseRegistryAuthority(input: Readonly<{
  admission: unknown;
  registry: unknown;
}>): Promise<void> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "admission,registry"
  ) throw new TypeError("ECONOMY_SHOWCASE_REGISTRY_BINDING_INVALID");
  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission || admission.profile !== "economy-showcase") {
    throw new TypeError("ECONOMY_SHOWCASE_ADMISSION_REQUIRED");
  }
  await verifyPackageV114Registry(input.registry);
  const authority = Object.freeze({
    kind: "composite-v114",
    registry: RECEIZ_V114_CONSTITUTION_REGISTRY,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    laws: RECEIZ_V114_CONSTITUTION_REGISTRY.laws.map((law) =>
      Object.freeze({ id: law.id, version: law.version })),
  } as const);
  assertArtifactAppendRegistryInventory(authority, admission.profile);
  appendRegistryAuthority.set(admission, authority);
}

export async function planReceizProfileShowcaseGenesis(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  showcase: Readonly<Record<string, ReceizConstitutionJson>>;
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  genesisKaiUpulse: string;
  unacceptedExpectation: ReceizUnacceptedHeadExpectation;
  idempotencyKey: string;
}>): Promise<ReceizProfileShowcaseGenesisPlan> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "artifactId,commitDomain,genesisKaiUpulse,idempotencyKey,ownerReceizIdentity,showcase,unacceptedExpectation,verifiedActorEvidence") {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_INPUT_INVALID");
  }
  assertCommitDomain(input.commitDomain);
  if (!validIdentifier(input.idempotencyKey)
    || input.artifactId !== `profile-showcase:${input.ownerReceizIdentity}`
    || !/^(0|[1-9][0-9]*)$/.test(input.genesisKaiUpulse)
    || !input.unacceptedExpectation
    || Object.keys(input.unacceptedExpectation).sort().join(",") !== "scheme,value"
    || input.unacceptedExpectation.scheme !== "receiz-unaccepted-head.v1"
    || input.unacceptedExpectation.value !== null) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_INPUT_INVALID");
  }
  await verifyPackageV114Registry(RECEIZ_V114_CONSTITUTION_REGISTRY);
  const actorEvidence = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
  if ("code" in actorEvidence || actorEvidence.profile !== "identity") {
    throw new TypeError("PROFILE_SHOWCASE_ACTOR_NOT_VERIFIED");
  }
  const actor = await verifyReceizVerifiedActorReference(actorEvidence.actor, actorEvidence);
  if ("code" in actor) throw new TypeError(actor.code);
  const showcase = structuredClone(input.showcase);
  assertReceizProfileShowcaseGenesisV114TransportContract(showcase, {
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: actor.actorId,
    actorEvidenceRoot: actor.evidenceDigest.value,
    genesisKaiUpulse: input.genesisKaiUpulse,
  });
  canonicalizeReceizConstitution(showcase);
  const binding = await deriveReceizProfileShowcaseHistoryBinding({
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    showcase,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
  });
  if (binding.parentShowcaseDigests.length !== 0
    || binding.predecessorShowcaseDigest !== null) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_PREDECESSOR_FORBIDDEN");
  }
  const showcaseRegistryDigest = digest(
    "constitution-registry",
    RECEIZ_V114_REGISTRY_DIGEST,
  );
  const operationMatrixDigest = digest(
    "application-operation-matrix",
    RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
  );
  const canonicalGenesisBodyDigest = digest(
    "canonical-namespace-body",
    binding.showcaseBodyDigest,
  );
  const operationDigest = digest(
    "profile-showcase-operations",
    binding.operationDigest,
  );
  const commitDomain = Object.freeze({ ...input.commitDomain });
  const unacceptedExpectation = Object.freeze({ ...input.unacceptedExpectation });
  const registryDigest = digest("constitution-registry", actor.registryDigest.value);
  const effects = deepFreeze({
    [`law:${RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_ID}@${RECEIZ_PROFILE_SHOWCASE_GENESIS_OPERATION_LAW_VERSION}`]: 1,
    [`registry:${showcaseRegistryDigest.value}`]: 1,
    [`matrix:${operationMatrixDigest.value}`]: 1,
    [`resource:${input.artifactId}`]: 1,
    [`showcase-body:${canonicalGenesisBodyDigest.value}`]: 1,
  });
  const effectsDigest = digest(
    "external-operation-effects",
    await digestReceizAuthority(
      "effects",
      "receiz.profile-showcase-genesis-effects.v114",
      {
        actor,
        resource: input.artifactId,
        commitDomain,
        unacceptedExpectation,
        showcaseRegistryDigest,
        operationMatrixDigest,
        canonicalGenesisBodyDigest,
        operationDigest,
        childAdmissionEvidenceRoots: binding.childAdmissionEvidenceRoots,
        genesisKaiUpulse: input.genesisKaiUpulse,
        effects,
      },
    ),
  );
  const idempotencyKeyDigest = digest(
    "domain-scoped-idempotency-identity",
    await digestReceizAuthority(
      "idempotency",
      "receiz.profile-showcase-genesis-idempotency.v114",
      {
        commitDomain,
        actor,
        resource: input.artifactId,
        operation: "profile-showcase.genesis",
        key: input.idempotencyKey,
      },
    ),
  );
  const basis = {
    resource: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: actor.actorId,
    actor,
    commitDomain,
    unacceptedExpectation,
    showcaseRegistryDigest,
    operationMatrixDigest,
    canonicalGenesisBodyDigest,
    operationDigest,
    childAdmissionEvidenceRoots: binding.childAdmissionEvidenceRoots,
    genesisKaiUpulse: input.genesisKaiUpulse,
    registryDigest,
    effectsDigest,
    idempotencyKeyDigest,
  } as const;
  const plan: ReceizProfileShowcaseGenesisPlan = deepFreeze({
    schema: "receiz.profile-showcase-genesis-plan.v114",
    ...basis,
    planDigest: digest(
      "artifact-append-plan",
      await digestReceizAuthority(
        "plan",
        "receiz.profile-showcase-genesis-plan.v114",
        basis,
      ),
    ),
    authority: {
      planIsProofAuthority: false,
      acceptedHeadIsClaimed: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
  profileShowcaseGenesisPlanCustody.set(plan, Object.freeze({
    verifiedActorEvidence: actorEvidence,
    showcase: deepFreeze(showcase),
    derivedEffects: effects,
  }));
  return plan;
}

export function receizProfileShowcaseGenesisCapabilityContext(
  plan: ReceizProfileShowcaseGenesisPlan,
): ReceizArtifactAppendCapabilityContext {
  const custody = profileShowcaseGenesisPlanCustody.get(plan);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  return deepFreeze({
    actorId: plan.actor.actorId,
    tenantId: null,
    authorityProfile: "artifact-local",
    operation: "profile-showcase.genesis",
    resourceId: plan.resource,
    registryDigest: plan.registryDigest.value,
    maximumEffects: { ...custody.derivedEffects },
    operationConstraints: {
      planDigest: plan.planDigest,
      commitDomain: plan.commitDomain,
    },
  });
}

export function readReceizProfileShowcaseGenesisBody(
  plan: ReceizProfileShowcaseGenesisPlan,
): Readonly<Record<string, ReceizConstitutionJson>> {
  const custody = profileShowcaseGenesisPlanCustody.get(plan);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  return deepFreeze(structuredClone(custody.showcase));
}

function assertProfileShowcaseGenesisCapability(
  plan: ReceizProfileShowcaseGenesisPlan,
  capability: ReceizVerifiedCapability,
  custody: ProfileShowcaseGenesisCustody,
): void {
  const context = receizProfileShowcaseGenesisCapabilityContext(plan);
  if (!isReceizVerifiedCapability(capability)
    || capability.payload.actorId !== context.actorId
    || capability.payload.tenantId !== context.tenantId
    || capability.payload.authorityProfile !== context.authorityProfile
    || !capability.payload.operations.includes("profile-showcase.genesis")
    || !capability.payload.resourceScopes.includes(plan.resource)
    || capability.payload.registryDigest !== context.registryDigest
    || !sameDigestValue(capability.payload.operationConstraints.planDigest, plan.planDigest)
    || !sameCommitDomain(capability.payload.operationConstraints.commitDomain, plan.commitDomain)
    || Object.entries(custody.derivedEffects).some(
      ([effect, amount]) => amount > (capability.payload.maximumEffects[effect] ?? -1),
    )) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_CAPABILITY_MISMATCH");
  }
}

export async function sealReceizProfileShowcaseGenesis(input: Readonly<{
  plan: ReceizProfileShowcaseGenesisPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizProfileShowcaseGenesisSealer;
}>): Promise<ReceizLocallyVerifiedProfileShowcaseGenesis> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "capability,plan,sealer"
    || typeof input.sealer !== "function") {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_SEAL_INPUT_INVALID");
  }
  const custody = profileShowcaseGenesisPlanCustody.get(input.plan);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  assertProfileShowcaseGenesisCapability(input.plan, input.capability, custody);
  assertReceizProfileShowcaseGenesisV114TransportContract(custody.showcase, {
    artifactId: input.plan.resource,
    ownerReceizIdentity: input.plan.ownerReceizIdentity,
    profileIdentity: input.plan.profileIdentity,
    actorEvidenceRoot: input.plan.actor.evidenceDigest.value,
    genesisKaiUpulse: input.plan.genesisKaiUpulse,
  });
  const directDelta = custody.showcase.directOperations as readonly ReceizConstitutionJson[];
  const head = await deriveReceizProfileShowcaseBoundedGenesisHeadV114({
    artifactId: input.plan.resource,
    ownerReceizIdentity: input.plan.ownerReceizIdentity,
    profileIdentity: input.plan.profileIdentity,
    genesisKaiUpulse: input.plan.genesisKaiUpulse,
    directDelta,
    registryDigest: input.plan.showcaseRegistryDigest.value,
  });
  const showcaseBodyDigest = await digestReceizAuthority(
    "namespace",
    "receiz.namespace-body.v112",
    new TextEncoder().encode(
      canonicalizeReceizConstitution(head as unknown as ReceizConstitutionJson),
    ),
  );
  const operationDigest = await digestReceizAuthority(
    "operation",
    "receiz.profile-showcase.transition-operations.v114",
    directDelta,
  );
  const childAdmissionEvidenceRoots = [...new Set(directDelta.flatMap((operation) =>
    operation && typeof operation === "object" && !Array.isArray(operation)
      && operation.kind === "showcase.append"
      && operation.child && typeof operation.child === "object" && !Array.isArray(operation.child)
      && typeof operation.child.admissionEvidenceRoot === "string"
      ? [operation.child.admissionEvidenceRoot]
      : []))].sort();
  const node = await createReceizProofHistoryNode({
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    parentDigests: [],
    kaiPulse: input.plan.genesisKaiUpulse,
    receipt: {},
    event: {
      type: "profile-showcase.transition",
      // The empty genesis has no direct operation in which to carry the
      // already-verified actor. Preserve that same authority in sealed history.
      ...(directDelta.length === 0 ? { actorEvidenceRoot: input.plan.actor.evidenceDigest.value } : {}),
      parentShowcaseDigests: [],
      predecessorShowcaseDigest: null,
      showcaseBodyDigest,
      operationDigest,
      directOperations: structuredClone(directDelta),
      childAdmissionEvidenceRoots,
      registryDigest: input.plan.showcaseRegistryDigest.value,
      kaiUpulse: input.plan.genesisKaiUpulse,
    },
    namespaceData: {},
  });
  const historyHead = await createReceizCarriedProofHistoryHeadV114({
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    rootDigest: node.nodeDigest,
    headDigest: node.nodeDigest,
    nodeCount: 1,
    accumulator: {
      algorithm: "sha256/binary-carry/v1",
      leafCount: 1,
      root: node.nodeDigest,
      frontier: [node.nodeDigest],
    },
    currentNode: node,
    parentRefs: [],
  });
  const carrier = await createReceizBoundedProfileShowcaseCarrierV114({
    artifactId: input.plan.resource,
    ownerReceizIdentity: input.plan.ownerReceizIdentity,
    head,
    historyHead,
  });
  const payloadBytes = new TextEncoder().encode(
    canonicalizeReceizConstitution(carrier as unknown as ReceizConstitutionJson),
  );
  const returnedArtifact = await input.sealer(Object.freeze({
    plan: input.plan,
    artifactId: input.plan.resource,
    payloadBytes: payloadBytes.slice(),
    predecessor: null,
  }));
  const verified = await reverifyReceizProfileShowcaseGenesisWithActorContext({
    verifiedActorEvidence: custody.verifiedActorEvidence,
    candidateArtifact: returnedArtifact,
    ownerReceizId: input.plan.ownerReceizIdentity,
  });
  const reopenedCarrier = await parseReceizBoundedProfileShowcaseCarrierV114(JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(verified.payloadBytes),
  ));
  if (canonicalizeReceizConstitution(reopenedCarrier)
    !== canonicalizeReceizConstitution(carrier)) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_TRANSITION_MISMATCH");
  }
  const admission = await admitReceizProfileShowcaseGenesisWithActorContext({
    verifiedActorEvidence: custody.verifiedActorEvidence,
    candidateArtifact: verified.artifact,
    artifactId: input.plan.resource,
    ownerReceizId: input.plan.ownerReceizIdentity,
  });
  if (!admission.proofHistoryHead) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_HISTORY_MISSING");
  }
  const compatibilityBinding = await deriveReceizProfileShowcaseHistoryBinding({
    artifactId: input.plan.resource,
    ownerReceizIdentity: input.plan.ownerReceizIdentity,
    showcase: custody.showcase,
    registryDigest: input.plan.showcaseRegistryDigest.value,
  });
  const compatibilityProjectionNode = await createReceizProfileShowcaseProofHistoryNode({
    ...compatibilityBinding,
    parentDigest: null,
  });
  const compatibilityHistory = await normalizeReceizProofHistory({
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    nodes: [compatibilityProjectionNode],
    verifyReceipt: async (receipt, receiptDigest) =>
      await digestReceizAuthority(
        "receipt",
        "receiz.proof-history-receipt.v111",
        receipt,
      ) === receiptDigest,
  });
  const history = await verifyReceizCarriedProofHistory({
    history: compatibilityHistory,
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    artifactDigest: admission.artifactSha256,
    verifierContextDigest: admission.admissionProof.verifierContextDigest,
  });
  const compatibilityAdmission =
    await projectReceizBoundedGenesisAdmissionHistoryCompatibility(admission, history);
  return deepFreeze({
    status: "locally-verified-profile-showcase-genesis",
    artifact: verified.artifact,
    artifactDigest: verified.artifactDigest,
    admission: compatibilityAdmission,
    history,
    proofHistoryHead: admission.proofHistoryHead,
    acceptedHead: null,
    coordination: {
      status: "unaccepted",
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
}

export async function planReceizEconomyShowcaseGenesis(input: Readonly<{
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  genesisKaiUpulse: string;
  unacceptedExpectation: ReceizUnacceptedHeadExpectation;
  idempotencyKey: string;
}>): Promise<ReceizEconomyShowcaseGenesisPlan> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "commitDomain,genesisKaiUpulse,idempotencyKey,unacceptedExpectation,verifiedActorEvidence"
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_INPUT_INVALID");
  assertCommitDomain(input.commitDomain);
  if (
    input.commitDomain.value !== "receiz.com/global/v1"
    || !validIdentifier(input.idempotencyKey)
    || !/^(0|[1-9][0-9]*)$/.test(input.genesisKaiUpulse)
    || !input.unacceptedExpectation
    || Object.keys(input.unacceptedExpectation).sort().join(",")
      !== "scheme,value"
    || input.unacceptedExpectation.scheme !== "receiz-unaccepted-head.v1"
    || input.unacceptedExpectation.value !== null
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_INPUT_INVALID");
  await verifyPackageV114Registry(RECEIZ_V114_CONSTITUTION_REGISTRY);
  if (!RECEIZ_V114_CONSTITUTION_REGISTRY.laws.some((law) =>
    law.id === RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_ID
    && law.version === RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_VERSION
  )) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_REGISTRY_LAW_MISSING");
  const actorEvidence = await verifyReceizArtifactAdmission(
    input.verifiedActorEvidence,
  );
  if ("code" in actorEvidence || actorEvidence.profile !== "identity") {
    throw new TypeError("ECONOMY_SHOWCASE_ACTOR_NOT_VERIFIED");
  }
  const actor = await verifyReceizVerifiedActorReference(
    actorEvidence.actor,
    actorEvidence,
  );
  if ("code" in actor) throw new TypeError(actor.code);
  const head = await deriveReceizEconomyShowcaseGenesisHeadV114({
    genesisKaiUpulse: input.genesisKaiUpulse,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
  });
  const canonicalGenesisBodyDigest = digest(
    "canonical-namespace-body",
    await digestReceizAuthority(
      "namespace",
      "receiz.namespace-body.v112",
      new TextEncoder().encode(
        canonicalizeReceizConstitution(
          head as unknown as ReceizConstitutionJson,
        ),
      ),
    ),
  );
  const showcaseRegistryDigest = digest(
    "constitution-registry",
    RECEIZ_V114_REGISTRY_DIGEST,
  );
  const operationMatrixDigest = digest(
    "application-operation-matrix",
    RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
  );
  const commitDomain = Object.freeze({ ...input.commitDomain });
  const unacceptedExpectation = Object.freeze({
    ...input.unacceptedExpectation,
  });
  const registryDigest = digest(
    "constitution-registry",
    actor.registryDigest.value,
  );
  const effects = deepFreeze({
    [`law:${RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_ID}@${RECEIZ_ECONOMY_SHOWCASE_GENESIS_OPERATION_LAW_VERSION}`]:
      1,
    [`registry:${showcaseRegistryDigest.value}`]: 1,
    [`matrix:${operationMatrixDigest.value}`]: 1,
    ["resource:economy-showcase:receiz.com"]: 1,
    [`showcase-body:${canonicalGenesisBodyDigest.value}`]: 1,
  });
  const effectsDigest = digest(
    "external-operation-effects",
    await digestReceizAuthority(
      "effects",
      "receiz.economy-showcase-genesis-effects.v114",
      {
        actor,
        resource: "economy-showcase:receiz.com",
        commitDomain,
        unacceptedExpectation,
        showcaseRegistryDigest,
        operationMatrixDigest,
        canonicalGenesisBodyDigest,
        genesisKaiUpulse: input.genesisKaiUpulse,
        effects,
      },
    ),
  );
  const idempotencyKeyDigest = digest(
    "domain-scoped-idempotency-identity",
    await digestReceizAuthority(
      "idempotency",
      "receiz.economy-showcase-genesis-idempotency.v114",
      {
        commitDomain,
        actor,
        resource: "economy-showcase:receiz.com",
        operation: "economy-showcase.genesis",
        key: input.idempotencyKey,
      },
    ),
  );
  const basis = {
    resource: "economy-showcase:receiz.com" as const,
    actor,
    commitDomain,
    unacceptedExpectation,
    showcaseRegistryDigest,
    operationMatrixDigest,
    canonicalGenesisBodyDigest,
    genesisKaiUpulse: input.genesisKaiUpulse,
    registryDigest,
    effectsDigest,
    idempotencyKeyDigest,
  };
  const plan: ReceizEconomyShowcaseGenesisPlan = deepFreeze({
    schema: "receiz.economy-showcase-genesis-plan.v114",
    ...basis,
    planDigest: digest(
      "artifact-append-plan",
      await digestReceizAuthority(
        "plan",
        "receiz.economy-showcase-genesis-plan.v114",
        basis,
      ),
    ),
    authority: {
      planIsProofAuthority: false,
      acceptedHeadIsClaimed: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
  economyShowcaseGenesisPlanCustody.set(plan, Object.freeze({
    verifiedActorEvidence: actorEvidence,
    head,
    derivedEffects: effects,
  }));
  return plan;
}

export function receizEconomyShowcaseGenesisCapabilityContext(
  plan: ReceizEconomyShowcaseGenesisPlan,
): ReceizArtifactAppendCapabilityContext {
  const custody = economyShowcaseGenesisPlanCustody.get(plan);
  if (!custody) {
    throw new TypeError("ECONOMY_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  }
  return deepFreeze({
    actorId: plan.actor.actorId,
    tenantId: "receiz.com",
    authorityProfile: "global-shared",
    operation: "economy-showcase.genesis",
    resourceId: plan.resource,
    registryDigest: plan.registryDigest.value,
    maximumEffects: { ...custody.derivedEffects },
    operationConstraints: {
      planDigest: plan.planDigest,
      commitDomain: plan.commitDomain,
    },
  });
}

export function readReceizEconomyShowcaseGenesisHead(
  plan: ReceizEconomyShowcaseGenesisPlan,
): import("./economyShowcaseTransport.js").ReceizEconomyShowcaseHeadV114 {
  const custody = economyShowcaseGenesisPlanCustody.get(plan);
  if (!custody) {
    throw new TypeError("ECONOMY_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  }
  return deepFreeze(structuredClone(custody.head));
}

function assertEconomyShowcaseGenesisCapability(
  plan: ReceizEconomyShowcaseGenesisPlan,
  capability: ReceizVerifiedCapability,
  custody: EconomyShowcaseGenesisCustody,
): void {
  const context = receizEconomyShowcaseGenesisCapabilityContext(plan);
  if (
    !isReceizVerifiedCapability(capability)
    || capability.payload.actorId !== context.actorId
    || capability.payload.tenantId !== context.tenantId
    || capability.payload.authorityProfile !== context.authorityProfile
    || !capability.payload.operations.includes("economy-showcase.genesis")
    || !capability.payload.resourceScopes.includes(plan.resource)
    || capability.payload.registryDigest !== context.registryDigest
    || !sameDigestValue(
      capability.payload.operationConstraints.planDigest,
      plan.planDigest,
    )
    || !sameCommitDomain(
      capability.payload.operationConstraints.commitDomain,
      plan.commitDomain,
    )
    || Object.entries(custody.derivedEffects).some(
      ([effect, amount]) =>
        amount > (capability.payload.maximumEffects[effect] ?? -1),
    )
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_CAPABILITY_MISMATCH");
}

export async function sealReceizEconomyShowcaseGenesis(input: Readonly<{
  plan: ReceizEconomyShowcaseGenesisPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizEconomyShowcaseGenesisSealer;
}>): Promise<ReceizLocallyVerifiedEconomyShowcaseGenesis> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "capability,plan,sealer"
    || typeof input.sealer !== "function"
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_SEAL_INPUT_INVALID");
  const custody = economyShowcaseGenesisPlanCustody.get(input.plan);
  if (!custody) {
    throw new TypeError("ECONOMY_SHOWCASE_GENESIS_PLAN_NOT_SDK_ISSUED");
  }
  assertEconomyShowcaseGenesisCapability(
    input.plan,
    input.capability,
    custody,
  );
  const node = await createReceizProofHistoryNode({
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    parentDigests: [],
    kaiPulse: input.plan.genesisKaiUpulse,
    receipt: {},
    event: {
      type: "state.append",
      state: custody.head as unknown as ReceizConstitutionJson,
    },
    namespaceData: {
      "economy-showcase": custody.head as unknown as ReceizConstitutionJson,
    },
  });
  const historyHead = await createReceizCarriedProofHistoryHeadV114({
    artifactId: input.plan.resource,
    registryDigest: input.plan.showcaseRegistryDigest.value,
    rootDigest: node.nodeDigest,
    headDigest: node.nodeDigest,
    nodeCount: 1,
    accumulator: {
      algorithm: "sha256/binary-carry/v1",
      leafCount: 1,
      root: node.nodeDigest,
      frontier: [node.nodeDigest],
    },
    currentNode: node,
    parentRefs: [],
  });
  const carrier = await createReceizEconomyShowcaseCarrierV114({
    head: custody.head,
    historyHead,
  });
  const payloadBytes = new TextEncoder().encode(
    canonicalizeReceizConstitution(
      carrier as unknown as ReceizConstitutionJson,
    ),
  );
  const returnedArtifact = await input.sealer(Object.freeze({
    plan: input.plan,
    artifactId: input.plan.resource,
    payloadBytes: payloadBytes.slice(),
    predecessor: null,
  }));
  const admission = await admitReceizEconomyShowcaseGenesisWithActorContext({
    verifiedActorEvidence: custody.verifiedActorEvidence,
    candidateArtifact: returnedArtifact,
  });
  const reopened =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
  if (
    canonicalizeReceizConstitution(
      reopened as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      carrier as unknown as ReceizConstitutionJson,
    )
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_TRANSITION_MISMATCH");
  return deepFreeze({
    status: "locally-verified-economy-showcase-genesis",
    artifact: returnedArtifact,
    artifactDigest: digest(
      "exact-artifact-bytes",
      admission.artifactSha256,
    ),
    admission,
    proofHistoryHead: admission.proofHistoryHead!,
    acceptedHead: null,
    coordination: {
      status: "unaccepted",
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
}

export function isSdkIssuedReceizArtifactAppendPlan(value: unknown): value is ReceizArtifactAppendPlan {
  return value !== null && typeof value === "object" && planCustody.has(value);
}

function profileShowcaseEventParts(event: ReceizConstitutionJson): Readonly<{
  directOperations: readonly ReceizConstitutionJson[];
  childAdmissionEvidenceRoots: readonly string[];
  kaiUpulse: string;
}> {
  if (!event || typeof event !== "object" || Array.isArray(event)
    || !("resultingShowcase" in event)
    || !event.resultingShowcase || typeof event.resultingShowcase !== "object"
    || Array.isArray(event.resultingShowcase)) throw new TypeError("PROFILE_SHOWCASE_EVENT_INVALID");
  const showcase = event.resultingShowcase as Record<string, ReceizConstitutionJson>;
  if (!Array.isArray(showcase.parentArtifactDigests)
    || showcase.parentArtifactDigests.some(
      (digestValue) => typeof digestValue !== "string" || !/^[0-9a-f]{64}$/.test(digestValue),
    )
    || !Array.isArray(showcase.directOperations) || showcase.directOperations.length === 0
    || !Array.isArray(showcase.proofHistoryEvidenceRoots)
    || showcase.proofHistoryEvidenceRoots.some(
      (root) => typeof root !== "string" || !/^[0-9a-f]{64}$/.test(root),
    )) throw new TypeError("PROFILE_SHOWCASE_EVENT_INVALID");
  if (showcase.parentArtifactDigests.length === 0) {
    throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_REQUIRED");
  }
  const last = showcase.directOperations.at(-1);
  if (!last || typeof last !== "object" || Array.isArray(last)
    || !last.kai || typeof last.kai !== "object" || Array.isArray(last.kai)) {
    throw new TypeError("PROFILE_SHOWCASE_EVENT_INVALID");
  }
  const kai = last.kai as Record<string, ReceizConstitutionJson>;
  if (typeof kai.upulse !== "string" || !/^(0|[1-9][0-9]*)$/.test(kai.upulse)
    || Object.keys(kai).length !== 1) {
    throw new TypeError("PROFILE_SHOWCASE_EVENT_INVALID");
  }
  return Object.freeze({
    directOperations: showcase.directOperations,
    childAdmissionEvidenceRoots: [...new Set(showcase.proofHistoryEvidenceRoots as string[])].sort(),
    kaiUpulse: kai.upulse,
  });
}

async function createReceizProfileShowcaseAppendNode(input: Readonly<{
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
  history: ReceizVerifiedProofHistory;
  reduction: ReceizNamespaceReduction;
  event: ReceizConstitutionJson;
  eventDigest: ReceizEventDigest;
  parentHistoryHeads?: readonly string[];
}>): Promise<ReceizProofHistoryNode> {
  const parts = profileShowcaseEventParts(input.event);
  const event = input.event as Record<string, ReceizConstitutionJson>;
  const showcase = event.resultingShowcase as Record<string, unknown>;
  const binding = await deriveReceizProfileShowcaseHistoryBinding({
    artifactId: input.admission.artifactId as `profile-showcase:${string}`,
    ownerReceizIdentity: input.admission.ownerReceizId!,
    showcase,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
  });
  if (binding.predecessorShowcaseDigest !== input.admission.artifactSha256
    || binding.showcaseBodyDigest !== input.reduction.proposedTargetDigest.value
    || binding.operationDigest !== await digestReceizAuthority(
      "operation",
      "receiz.profile-showcase.transition-operations.v114",
      parts.directOperations,
    )) {
    throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_MISMATCH");
  }
  return createReceizProfileShowcaseProofHistoryNode({
    parentDigest: input.history.headDigests[0]!,
    ...(input.parentHistoryHeads === undefined ? {} : { parentDigests: input.parentHistoryHeads }),
    ...binding,
  });
}

async function createReceizBoundedProfileShowcaseAppendNode(input: Readonly<{
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
  predecessorHistoryHead: ReceizCarriedProofHistoryHeadV114;
  parentHistoryHeads?: readonly ReceizCarriedProofHistoryHeadV114[];
  reduction: ReceizNamespaceReduction;
  resultingHead: Readonly<Record<string, unknown>>;
}>): Promise<ReceizProofHistoryNode> {
  assertReceizProfileShowcaseBoundedHeadV114(input.resultingHead);
  const directOperations = input.resultingHead.directDelta as readonly ReceizConstitutionJson[];
  const parentShowcaseDigests = (
    input.resultingHead.parentHeads as readonly Record<string, unknown>[]
  ).map((parent) => parent.artifactDigest as string).sort();
  const operationParents = [...new Set(directOperations.flatMap((operation) => {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) return [];
    const parent = (operation as Record<string, unknown>).parentArtifactDigest;
    return typeof parent === "string" ? [parent] : [];
  }))].sort();
  const childAdmissionEvidenceRoots = [...new Set(directOperations.flatMap((operation) => {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) return [];
    const value = operation as Record<string, unknown>;
    if (value.kind === "showcase.append" && value.child && typeof value.child === "object"
      && !Array.isArray(value.child)) {
      const root = (value.child as Record<string, unknown>).admissionEvidenceRoot;
      return typeof root === "string" ? [root] : [];
    }
    if (value.kind === "showcase.merge" && Array.isArray(value.mergedChildren)) {
      return value.mergedChildren.flatMap((child) => {
        if (!child || typeof child !== "object" || Array.isArray(child)) return [];
        const root = (child as Record<string, unknown>).admissionEvidenceRoot;
        return typeof root === "string" ? [root] : [];
      });
    }
    return [];
  }))].sort();
  const predecessorParent = (
    input.resultingHead.parentHeads as readonly Record<string, unknown>[]
  ).find((parent) => parent.artifactDigest === input.admission.artifactSha256);
  if (
    !predecessorParent
    || predecessorParent.historyHeadDigest !== input.predecessorHistoryHead.headDigest
    || operationParents.length !== 1
    || operationParents[0] !== input.admission.artifactSha256
  ) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_MISMATCH");
  const operationDigest = await digestReceizAuthority(
    "operation",
    "receiz.profile-showcase.transition-operations.v114",
    directOperations,
  );
  return createReceizProfileShowcaseProofHistoryNode({
    artifactId: input.admission.artifactId as `profile-showcase:${string}`,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    parentDigest: input.predecessorHistoryHead.headDigest,
    ...(input.parentHistoryHeads === undefined
      ? {}
      : {
        parentDigests: input.parentHistoryHeads
          .map((parent) => parent.headDigest)
          .sort(),
      }),
    parentShowcaseDigests,
    predecessorShowcaseDigest: input.admission.artifactSha256,
    showcaseBodyDigest: input.reduction.proposedTargetDigest.value,
    operationDigest,
    directOperations,
    childAdmissionEvidenceRoots,
    kaiUpulse: input.resultingHead.headKaiUpulse as string,
  });
}

async function createReceizEconomyShowcaseAppendNode(input: Readonly<{
  admission: Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
  }>;
  predecessorHistoryHead: ReceizCarriedProofHistoryHeadV114;
  reduction: ReceizNamespaceReduction;
  resultingHead: unknown;
}>): Promise<ReceizProofHistoryNode> {
  assertReceizEconomyShowcaseHeadV114TransportContract(input.resultingHead);
  if (
    input.resultingHead.artifactId !== input.admission.artifactId
    || input.resultingHead.parentArtifactDigests.length !== 1
    || input.resultingHead.parentArtifactDigests[0]
      !== input.admission.artifactSha256
    || input.resultingHead.directOperations.length === 0
    || input.reduction.proposedTargetDigest.value
      !== await digestReceizAuthority(
        "namespace",
        "receiz.namespace-body.v112",
        new TextEncoder().encode(
          canonicalizeReceizConstitution(
            input.resultingHead as unknown as ReceizConstitutionJson,
          ),
        ),
      )
  ) throw new TypeError("ECONOMY_SHOWCASE_PREDECESSOR_MISMATCH");
  return createReceizProofHistoryNode({
    artifactId: input.admission.artifactId,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    parentDigests: [input.predecessorHistoryHead.headDigest],
    kaiPulse: input.resultingHead.headKaiUpulse,
    receipt: {
      schema: "receiz.economy-showcase-transition-receipt.v114",
      artifactId: input.admission.artifactId,
      predecessorArtifactDigest: input.admission.artifactSha256,
      authority: {
        receiptIsProofAuthority: false,
        strongerTruth: "sealed-receiz-proof-object",
      },
    },
    event: {
      type: "state.append",
      state: structuredClone(
        input.resultingHead,
      ) as unknown as ReceizConstitutionJson,
    },
    namespaceData: {
      "economy-showcase": structuredClone(
        input.resultingHead,
      ) as unknown as ReceizConstitutionJson,
    },
  });
}

async function createReceizEconomyShowcaseMergeNode(input: Readonly<{
  admission: Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
  }>;
  parentHistoryHeads: readonly [
    ReceizCarriedProofHistoryHeadV114,
    ReceizCarriedProofHistoryHeadV114,
  ];
  reduction: ReceizNamespaceReduction;
  resultingHead: unknown;
}>): Promise<ReceizProofHistoryNode> {
  assertReceizEconomyShowcaseHeadV114TransportContract(input.resultingHead);
  const parentDigests = input.parentHistoryHeads
    .map((parent) => parent.headDigest)
    .sort();
  if (
    input.resultingHead.artifactId !== input.admission.artifactId
    || input.resultingHead.parentArtifactDigests.length !== 2
    || !input.resultingHead.parentArtifactDigests.includes(
      input.admission.artifactSha256,
    )
    || input.resultingHead.directOperations.length !== 2
    || input.reduction.proposedTargetDigest.value
      !== await digestReceizAuthority(
        "namespace",
        "receiz.namespace-body.v112",
        new TextEncoder().encode(
          canonicalizeReceizConstitution(
            input.resultingHead as unknown as ReceizConstitutionJson,
          ),
        ),
      )
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_PREDECESSOR_MISMATCH");
  return createReceizProofHistoryNode({
    artifactId: input.admission.artifactId,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    parentDigests,
    kaiPulse: input.resultingHead.headKaiUpulse,
    receipt: {
      schema: "receiz.economy-showcase-merge-receipt.v114",
      artifactId: input.admission.artifactId,
      parentArtifactDigests: [
        ...input.resultingHead.parentArtifactDigests,
      ],
      authority: {
        receiptIsProofAuthority: false,
        strongerTruth: "sealed-receiz-proof-object",
      },
    },
    event: {
      type: "state.append",
      state: structuredClone(
        input.resultingHead,
      ) as unknown as ReceizConstitutionJson,
    },
    namespaceData: {
      "economy-showcase": structuredClone(
        input.resultingHead,
      ) as unknown as ReceizConstitutionJson,
    },
  });
}

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
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
  ];
  parentHistoryHeads: readonly [
    ReceizCarriedProofHistoryHeadV114,
    ReceizCarriedProofHistoryHeadV114,
  ];
  resultingEconomyShowcase: Readonly<Record<string, unknown>>;
}>;

type EconomyShowcaseCompositionPlanningContext =
  | EconomyShowcaseAppendPlanningContext
  | EconomyShowcaseMergePlanningContext;

type ProfileShowcaseMergePlanningContext = Readonly<{
  resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;

  commonPredecessorAdmission: Extract<ReceizVerifiedArtifactAdmission, {
    profile: "profile-showcase";
  }>;
  parentAdmissions: readonly [
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
  ];
  parentHistoryHeads: readonly [
    ReceizCarriedProofHistoryHeadV114,
    ReceizCarriedProofHistoryHeadV114,
  ];
  resultingShowcase: Readonly<Record<string, unknown>>;
}>;

async function planArtifactAppendInternal(input: Readonly<{
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
}>,
migration: LegacyProfileShowcaseMigrationPlanningContext | null,
economyComposition: EconomyShowcaseCompositionPlanningContext | null = null,
profileMerge: ProfileShowcaseMergePlanningContext | null = null,
exactKksInput: Readonly<{ coordinate: unknown }> | null = null,
): Promise<ReceizArtifactAppendPlan> {
  const inputKeys = Object.keys(input ?? {}).filter(key => key !== "resolveVerifiedHistoricalArtifactDigest").sort().join(",");
  const baseInputKeys = [...INPUT_KEYS].sort().join(",");
  const mergeInputKeys = [...INPUT_KEYS, "additionalVerifiedHistories"].sort().join(",");
  if (!input || typeof input !== "object"
    || (inputKeys !== baseInputKeys && inputKeys !== mergeInputKeys)) {
    throw new TypeError("ARTIFACT_APPEND_INPUT_INVALID");
  }
  if (input.resolveVerifiedHistoricalArtifactDigest !== undefined
    && typeof input.resolveVerifiedHistoricalArtifactDigest !== "function") throw new TypeError("ARTIFACT_APPEND_INPUT_INVALID");
  assertCommitDomain(input.commitDomain);
  assertNamespace(input.namespace);
  assertHistoryDigest(input.expectedHead);
  if (!validIdentifier(input.idempotencyKey)) throw new TypeError("IDEMPOTENCY_KEY_REQUIRED");
  const commitDomain = Object.freeze({ ...input.commitDomain });
  const namespace = Object.freeze({ ...input.namespace });
  const expectedHead = Object.freeze({ ...input.expectedHead });
  const idempotencyKey = input.idempotencyKey;
  const event = structuredClone(input.event);
  canonicalizeReceizConstitution(event);
  deepFreeze(event);

  const admission = await verifyReceizArtifactAdmission(input.admission);
  if ("code" in admission) throw new TypeError(admission.code);
  if (
    admission.profile !== "portable-state"
    && admission.profile !== "profile-showcase"
    && admission.profile !== "economy-showcase"
  ) {
    throw new TypeError("ARTIFACT_APPEND_PROFILE_DENIED");
  }
  const profileShowcase = admission.profile === "profile-showcase";
  const economyShowcase = admission.profile === "economy-showcase";
  const boundedCompositeShowcase =
    (profileShowcase || economyShowcase)
    && admission.proofHistoryHead !== null;
  if (
    economyShowcase
      ? economyComposition === null
        || economyComposition.economyAdmission !== admission
      : economyComposition !== null
  ) throw new TypeError("ECONOMY_SHOWCASE_COMPOSITION_CUSTODY_REQUIRED");
  if (
    profileShowcase
      ? profileMerge !== null
        && !profileMerge.parentAdmissions.includes(admission)
      : profileMerge !== null
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_CUSTODY_REQUIRED");
  if (migration !== null) {
    const migrationCustody =
      readReceizLegacyProfileShowcaseInspectionCustody(migration.inspection);
    if (
      !isSdkInspectedLegacyProfileShowcaseV114(migration.inspection)
      || migrationCustody.internalAdmission !== admission
    ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CUSTODY_MISMATCH");
  }
  const registryAuthority = appendRegistryAuthority.get(admission);
  if (!registryAuthority) throw new TypeError("ARTIFACT_APPEND_REGISTRY_LAW_NOT_VERIFIED");
  if (registryAuthority.kind === "discovered") {
    await verifyReceizArtifactAdmissionRegistryDiscovery(admission, registryAuthority.discovery);
  } else if (registryAuthority.kind === "package-current") {
    await verifyPackageCurrentRegistry(registryAuthority.registry);
  } else if (registryAuthority.kind === "package-history") {
    await verifyPackagePinnedHistoryRegistry(registryAuthority.registry);
    if (await readReceizArtifactAdmissionPinnedRegistry(admission) !== registryAuthority.registry) throw new TypeError("REGISTRY_DIGEST_MISMATCH");
    assertExactInheritedArtifactAppendLaws(registryAuthority.registry);
  } else {
    await verifyPackageV114Registry(registryAuthority.registry);
  }
  assertArtifactAppendRegistryInventory(registryAuthority, admission.profile);
  if (
    economyComposition?.kind === "merge"
    && !hasExactLaw(
      registryAuthority,
      RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_ID,
      RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_VERSION,
    )
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_REGISTRY_LAW_MISSING");
  if (profileShowcase && admission.proofHistoryHead === null && migration === null) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ADMISSION_REQUIRED");
  }
  if (economyShowcase && admission.proofHistoryHead === null) {
    throw new TypeError("ECONOMY_SHOWCASE_BOUNDED_ADMISSION_REQUIRED");
  }
  const boundedProfileShowcase =
    profileShowcase && admission.proofHistoryHead !== null;
  const history = boundedCompositeShowcase
    ? null
    : await verifyReceizProofHistory(input.verifiedHistory);
  let historyHead: ReceizCarriedProofHistoryHeadV114 | null = null;
  if (boundedCompositeShowcase) {
    try {
      historyHead = await parseReceizCarriedProofHistoryHeadV114(input.verifiedHistory);
    } catch {
      throw new TypeError(
        economyShowcase
          ? "ECONOMY_SHOWCASE_BOUNDED_HISTORY_HEAD_REQUIRED"
          : "PROFILE_SHOWCASE_BOUNDED_HISTORY_HEAD_REQUIRED",
      );
    }
  }
  if (boundedCompositeShowcase && input.additionalVerifiedHistories !== undefined) {
    throw new TypeError(
      economyShowcase
        ? "ECONOMY_SHOWCASE_BOUNDED_MERGE_REQUIRES_SEALED_SIBLINGS"
        : "PROFILE_SHOWCASE_BOUNDED_MERGE_REQUIRES_SEALED_SIBLINGS",
    );
  }
  const additionalHistories = boundedCompositeShowcase || input.additionalVerifiedHistories === undefined
    ? []
    : await Promise.all(input.additionalVerifiedHistories.map((candidate) => verifyReceizProofHistory(candidate)));
  const actorEvidence = input.verifiedActorEvidence;
  if (!actorEvidence || typeof actorEvidence !== "object" || !("actor" in actorEvidence)) {
    throw new TypeError("ACTOR_NOT_VERIFIED");
  }
  const actor = await verifyReceizVerifiedActorReference(
    (actorEvidence as ReceizVerifiedIdentityAdmission).actor,
    actorEvidence,
  );
  if ("code" in actor) throw new TypeError(actor.code);

  const registryValue = admission.admissionProof.registryDigest;
  const authorityRegistryDigest = registryAuthority.kind === "discovered"
    ? registryAuthority.discovery.trustEvidence.currentRegistryDigest.value
    : registryAuthority.registryDigest;
  if (profileShowcase || economyShowcase
    ? authorityRegistryDigest !== RECEIZ_V114_REGISTRY_DIGEST
      || (boundedCompositeShowcase
        ? historyHead?.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
        : history?.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST)
      || actor.registryDigest.value !== registryValue
    : authorityRegistryDigest !== registryValue
      || history?.registryDigest !== registryValue
      || actor.registryDigest.value !== registryValue) {
    throw new TypeError("REGISTRY_DIGEST_MISMATCH");
  }
  if ((boundedCompositeShowcase ? historyHead?.artifactId : history?.artifactId) !== admission.artifactId) {
    throw new TypeError("HISTORY_IDENTITY_MISMATCH");
  }
  if (boundedCompositeShowcase
    ? historyHead?.headDigest !== expectedHead.value
      || historyHead.commitmentDigest !== admission.proofHistoryHead?.commitmentDigest
    : history?.headDigests.length !== 1 || history.headDigests[0] !== expectedHead.value) {
    throw new TypeError("HISTORY_STALE");
  }
  let exactKksCoordinate: ReceizKksV1ProofCoordinate | null = null;
  if (exactKksInput !== null) {
    exactKksCoordinate = await admitExactKksAppendCoordinate({
      admission, history: history!, coordinate: exactKksInput.coordinate,
    });
  } else if (admission.profile === "portable-state" && admission.proofHistory) {
    const carriedHead = admission.proofHistory.nodes.find(
      (node) => node.nodeDigest === admission.proofHistory!.headDigests[0],
    );
    if (carriedHead && await readReceizProofHistoryExactKksCoordinate(carriedHead)) {
      throw new TypeError("ARTIFACT_APPEND_EXACT_KKS_REQUIRED");
    }
  }
  if (!profileShowcase && !economyShowcase && additionalHistories.length > 0) {
    throw new TypeError("ARTIFACT_APPEND_INPUT_INVALID");
  }
  if (additionalHistories.some((candidate) => candidate.artifactId !== history?.artifactId
    || candidate.registryDigest !== history?.registryDigest
    || candidate.headDigests.length !== 1
    || candidate.headDigests[0] === history.headDigests[0])) {
    throw new TypeError("HISTORY_IDENTITY_MISMATCH");
  }
  if (admission.actorConstraint !== null && admission.actorConstraint !== actor.actorId) {
    throw new TypeError("ACTOR_CONSTRAINT_MISMATCH");
  }
  if (boundedProfileShowcase) {
    const sealedCarrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
    const sealedShowcase = sealedCarrier["profile-showcase"];
    const resultingShowcase = event && typeof event === "object" && !Array.isArray(event)
      && "resultingShowcase" in event
      ? event.resultingShowcase
      : null;
    assertReceizProfileShowcaseBoundedHeadV114(resultingShowcase);
    const resultingParents = resultingShowcase.parentHeads as readonly Record<string, unknown>[];
    const parent = resultingParents.find((candidate) =>
      candidate.artifactDigest === admission.artifactSha256);
    const directDelta = resultingShowcase.directDelta as readonly Record<string, unknown>[];
    if (
      resultingShowcase.artifactId !== admission.artifactId
      || resultingShowcase.ownerReceizIdentity !== sealedCarrier.ownerReceizIdentity
      || resultingShowcase.profileIdentity !== sealedShowcase.profileIdentity
      || resultingShowcase.priorOperationCount !== sealedShowcase.resultingOperationCount
      || !parent
      || parent.artifactDigest !== admission.artifactSha256
      || parent.historyHeadDigest !== historyHead!.headDigest
      || parent.headKaiUpulse !== sealedShowcase.headKaiUpulse
      || parent.operationCount !== sealedShowcase.resultingOperationCount
      || parent.stateRoot !== sealedShowcase.currentStateRoot
      || directDelta.length === 0
      || directDelta.some((operation) =>
        operation.authorityEvidenceRoot !== actor.evidenceDigest.value)
    ) throw new TypeError("PROFILE_SHOWCASE_DESCENDANT_PREDECESSOR_INVALID");
    if (profileMerge) {
      if (resultingParents.length !== 2) {
        throw new TypeError("PROFILE_SHOWCASE_MERGE_PARENT_COUNT_INVALID");
      }
      const commonCarrier =
        await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(
          profileMerge.commonPredecessorAdmission,
        );
      const parentCarriers = await Promise.all(
        profileMerge.parentAdmissions.map((candidate) =>
          rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(candidate)),
      );
      await verifyReceizProfileShowcaseBoundedMergeV114({
        commonPredecessorCarrier: commonCarrier,
        commonPredecessorArtifactDigest:
          profileMerge.commonPredecessorAdmission.artifactSha256,
        parents: [
          {
            artifactDigest: profileMerge.parentAdmissions[0].artifactSha256,
            carrier: parentCarriers[0]!,
          },
          {
            artifactDigest: profileMerge.parentAdmissions[1].artifactSha256,
            carrier: parentCarriers[1]!,
          },
        ],
        directDelta: resultingShowcase.directDelta as readonly ReceizConstitutionJson[],
        candidateHead: resultingShowcase,
        ...(profileMerge.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: profileMerge.resolveVerifiedHistoricalArtifactDigest } : {}),
      });
    } else {
      if (resultingParents.length !== 1) {
        throw new TypeError("PROFILE_SHOWCASE_DESCENDANT_PREDECESSOR_INVALID");
      }
      await verifyReceizProfileShowcaseBoundedSuccessorV114({
        predecessorCarrier: sealedCarrier,
        predecessorArtifactDigest: admission.artifactSha256,
        candidateHead: resultingShowcase,
        ...(input.resolveVerifiedHistoricalArtifactDigest
          ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
          : {}),
      });
    }
  } else if (economyShowcase) {
    const sealedCarrier =
      await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
    const resultingEconomyShowcase =
      event && typeof event === "object" && !Array.isArray(event)
      && "resultingEconomyShowcase" in event
        ? event.resultingEconomyShowcase
        : null;
    assertReceizEconomyShowcaseHeadV114TransportContract(
      resultingEconomyShowcase,
    );
    const directProfile =
      resultingEconomyShowcase.directOperations[0]?.profileShowcase;
    if (
      economyComposition === null
      || canonicalizeReceizConstitution(
        resultingEconomyShowcase as unknown as ReceizConstitutionJson,
      ) !== canonicalizeReceizConstitution(
        economyComposition.resultingEconomyShowcase as ReceizConstitutionJson,
      )
      ||
      resultingEconomyShowcase.artifactId !== admission.artifactId
      || resultingEconomyShowcase.directOperations.length === 0
    ) throw new TypeError("ECONOMY_SHOWCASE_DESCENDANT_PREDECESSOR_INVALID");
    if (economyComposition.kind === "append") {
      if (
        resultingEconomyShowcase.priorOperationCount
          !== sealedCarrier["economy-showcase"].resultingOperationCount
        || resultingEconomyShowcase.parentArtifactDigests.length !== 1
        || resultingEconomyShowcase.parentArtifactDigests[0]
          !== admission.artifactSha256
        || directProfile?.artifactId
          !== economyComposition.profileAdmission.artifactId
        || directProfile?.artifactDigest
          !== economyComposition.profileAdmission.artifactSha256
        || directProfile?.historyHeadDigest
          !== economyComposition.profileAdmission.proofHistoryHead?.headDigest
        || directProfile?.admissionEvidenceRoot
          !== economyComposition.profileAdmission.admissionProof.admissionProofDigest
      ) throw new TypeError(
        "ECONOMY_SHOWCASE_DESCENDANT_PREDECESSOR_INVALID",
      );
      await verifyReceizEconomyShowcaseSuccessorV114({
        predecessorHead: sealedCarrier["economy-showcase"],
        predecessorArtifactDigest: admission.artifactSha256,
        candidateHead: resultingEconomyShowcase,
      });
    } else {
      const commonCarrier =
        await rederiveReceizEconomyShowcaseCarrierFromAdmission(
          economyComposition.commonPredecessorAdmission,
        );
      const parentCarriers = await Promise.all(
        economyComposition.parentAdmissions.map((parent) =>
          rederiveReceizEconomyShowcaseCarrierFromAdmission(parent)),
      );
      await verifyReceizEconomyShowcaseMergeV114({
        commonPredecessorHead: commonCarrier["economy-showcase"],
        commonPredecessorArtifactDigest:
          economyComposition.commonPredecessorAdmission.artifactSha256,
        parents: [
          {
            artifactDigest:
              economyComposition.parentAdmissions[0].artifactSha256,
            head: parentCarriers[0]!["economy-showcase"],
          },
          {
            artifactDigest:
              economyComposition.parentAdmissions[1].artifactSha256,
            head: parentCarriers[1]!["economy-showcase"],
          },
        ],
        candidateHead: resultingEconomyShowcase,
      });
    }
  } else if (migration !== null) {
    const resultingShowcase = event && typeof event === "object" && !Array.isArray(event)
      && "resultingShowcase" in event
      ? event.resultingShowcase
      : null;
    assertReceizProfileShowcaseBoundedHeadV114(resultingShowcase);
    if (
      canonicalizeReceizConstitution(resultingShowcase as ReceizConstitutionJson)
        !== canonicalizeReceizConstitution(
          migration.boundedHead as ReceizConstitutionJson,
        )
    ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_HEAD_MISMATCH");
  }

  const eventDigest = digest(
    "canonical-namespace-event",
    await digestReceizAuthority("event", "receiz.namespace-event.v112", event),
  );
  if (profileShowcase && namespace.value !== "profile-showcase") {
    throw new TypeError("NAMESPACE_REDUCER_UNREGISTERED");
  }
  if (economyShowcase && namespace.value !== "economy-showcase") {
    throw new TypeError("NAMESPACE_REDUCER_UNREGISTERED");
  }
  const reduction = await reduceReceizNamespace({
    payloadBytes: admission.verifiedPayload.bytes,
    namespace,
    namespaceLawVersion: economyShowcase
      ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_LAW_VERSION
      : profileShowcase
        ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_LAW_VERSION
        : RECEIZ_PROVENANCE_NAMESPACE_LAW_VERSION,
    namespaceReducerVersion: economyShowcase
      ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REDUCER_VERSION
      : profileShowcase
        ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REDUCER_VERSION
        : RECEIZ_PROVENANCE_NAMESPACE_REDUCER_VERSION,
    event,
  });
  const registryDigest = digest("constitution-registry", registryValue);
  const appendNode = migration !== null
    ? await createReceizProfileShowcaseProofHistoryNode({
      artifactId: admission.artifactId as `profile-showcase:${string}`,
      registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
      parentDigest: migration.predecessorHistoryHead.headDigest,
      parentShowcaseDigests: [admission.artifactSha256],
      predecessorShowcaseDigest: admission.artifactSha256,
      showcaseBodyDigest: reduction.proposedTargetDigest.value,
      operationDigest: await digestReceizAuthority(
        "operation",
        "receiz.profile-showcase.transition-operations.v114",
        [],
      ),
      directOperations: [],
      childAdmissionEvidenceRoots: [],
      kaiUpulse: migration.inspection.headKaiUpulse,
    })
    : boundedProfileShowcase
    ? await createReceizBoundedProfileShowcaseAppendNode({
        admission: admission as Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
        predecessorHistoryHead: historyHead!,
        ...(profileMerge
          ? { parentHistoryHeads: profileMerge.parentHistoryHeads }
          : {}),
        reduction,
        resultingHead: (event as Record<string, unknown>).resultingShowcase as Record<string, unknown>,
      })
    : economyShowcase
      ? economyComposition?.kind === "merge"
        ? await createReceizEconomyShowcaseMergeNode({
          admission: admission as Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
          }>,
          parentHistoryHeads: economyComposition.parentHistoryHeads,
          reduction,
          resultingHead: (event as Record<string, unknown>)
            .resultingEconomyShowcase,
        })
        : await createReceizEconomyShowcaseAppendNode({
          admission: admission as Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
          }>,
          predecessorHistoryHead: historyHead!,
          reduction,
          resultingHead: (event as Record<string, unknown>)
            .resultingEconomyShowcase,
        })
    : profileShowcase
      ? await createReceizProfileShowcaseAppendNode({
        admission,
        history: history!,
        reduction,
        event,
        eventDigest,
        parentHistoryHeads: [
          history!.headDigests[0]!,
          ...additionalHistories.map((candidate) => candidate.headDigests[0]!),
        ],
      })
      : await createReceizArtifactTransitionProofHistoryAppendNode({
        basis: {
          artifactId: admission.artifactId,
          registryDigest: registryValue,
          parentDigest: expectedHead.value,
          kaiPulse: exactKksCoordinate?.kaiPulse ?? admission.admissionProof.registryEffectiveKai,
          namespace,
          namespaceLawVersion: reduction.namespaceLawVersion,
          namespaceReducerVersion: reduction.namespaceReducerVersion,
          eventDigest,
          proposedNamespaceBodyDigest: reduction.proposedTargetDigest,
          actor,
        },
        event,
        ...(exactKksCoordinate ? {
          kksCoordinate: exactKksCoordinate,
          predecessorArtifactDigest: admission.artifactSha256,
        } : {}),
      });
  const proposedHistoryHead = digest("verified-proof-history", appendNode.nodeDigest);
  const preservedNamespaces = [...reduction.preservedNamespaces.values()]
    .filter((snapshot) => snapshot.namespace.value !== "receizProofHistory")
    .map(({ namespace, bodyDigest }) => ({ namespace, bodyDigest }))
    .sort((left, right) => compareCanonicalText(left.namespace.value, right.namespace.value));
  const transition: ReceizArtifactTransitionBasis = deepFreeze({
    artifactId: admission.artifactId,
    priorArtifactDigest: digest("exact-artifact-bytes", admission.artifactSha256),
    basePayloadDigest: stableBasePayloadDigest(admission),
    expectedHead,
    proposedHistoryHead,
    namespace,
    namespaceLawVersion: reduction.namespaceLawVersion,
    namespaceReducerVersion: reduction.namespaceReducerVersion,
    priorNamespaceBodyDigest: reduction.priorTarget?.bodyDigest ?? null,
    eventDigest,
    proposedNamespaceBodyDigest: reduction.proposedTargetDigest,
    preservedNamespaces,
    registryDigest,
    actor,
    proofSuiteRequirements: { signatureVersion: 4, carrier: "native-record-seal" },
  });
  const transitionDigest = digest(
    "canonical-artifact-transition",
    await digestReceizAuthority("transition", "receiz.artifact-transition.v112", transition),
  );
  if (profileShowcase && !boundedProfileShowcase && migration === null) {
    profileShowcaseEventParts(event);
  }
  const operationLawId = economyComposition?.kind === "merge"
    ? RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_ID
    : economyShowcase
      ? RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_ID
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_ID
      : RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_ID;
  const operationLawVersion = economyComposition?.kind === "merge"
    ? RECEIZ_ECONOMY_SHOWCASE_MERGE_OPERATION_LAW_VERSION
    : economyShowcase
      ? RECEIZ_ECONOMY_SHOWCASE_OPERATION_LAW_VERSION
    : profileShowcase
      ? RECEIZ_PROFILE_SHOWCASE_OPERATION_LAW_VERSION
      : RECEIZ_ARTIFACT_APPEND_OPERATION_LAW_VERSION;
  const effects = derivedEffects({
    registryDigest,
    resource: admission.artifactId,
    namespace,
    eventDigest,
    operationLawId,
    operationLawVersion,
  });
  const effectsDigest = digest(
    "external-operation-effects",
    await digestReceizAuthority("effects", "receiz.artifact-append-effects.v124", {
      registryDigest,
      operationLaw: {
        lawId: operationLawId,
        lawVersion: operationLawVersion,
      },
      admittedArtifactDigest: admission.artifactSha256,
      admittedPayloadDigest: admission.payloadSha256,
      carriedHistoryDigest: boundedCompositeShowcase
        ? historyHead!.commitmentDigest
        : history!.historyDigest,
      verifiedActor: actor,
      resource: admission.artifactId,
      namespace,
      canonicalEvent: event,
      effects,
    }),
  );
  const idempotencyKeyDigest = digest(
    "domain-scoped-idempotency-identity",
    await digestReceizAuthority("idempotency", "receiz.artifact-append-idempotency.v112", {
      commitDomain,
      actor,
      resource: admission.artifactId,
      operation: "artifact.append",
      key: idempotencyKey,
    }),
  );
  const basis: ReceizArtifactAppendPlanBasis = deepFreeze({
    transitionDigest,
    actor,
    resource: admission.artifactId,
    operation: "artifact.append",
    commitDomain,
    effectsDigest,
    idempotencyKeyDigest,
    registryDigest,
  });
  const plan: ReceizArtifactAppendPlan = deepFreeze({
    schema: "receiz.artifact-append-plan.v112",
    ...basis,
    transition,
    actorConstraint: admission.actorConstraint,
    planDigest: digest(
      "artifact-append-plan",
      await digestReceizAuthority("plan", "receiz.artifact-append-plan.v112", basis),
    ),
    authority: { planIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
  });
  const successorCarriedHistory = boundedCompositeShowcase
    ? null
    : await normalizeReceizProofHistory({
        artifactId: history!.artifactId,
        registryDigest: history!.registryDigest,
        nodes: [...history!.nodes, appendNode],
        verifyReceipt: async (receipt, receiptDigest) =>
          await digestReceizAuthority(
            "receipt",
            "receiz.proof-history-receipt.v111",
            receipt,
          ) === receiptDigest,
      });
  const successorCarriedHistoryHead = migration !== null
    ? await appendReceizCarriedProofHistoryHeadV114({
      predecessor: migration.predecessorHistoryHead,
      predecessorArtifactDigest: admission.artifactSha256,
      appendNode,
    })
    : economyComposition?.kind === "merge"
      ? await mergeReceizCarriedProofHistoryHeadsV114({
        parents: economyComposition.parentAdmissions.map((parent, index) => ({
          historyHead: economyComposition.parentHistoryHeads[index]!,
          artifactDigest: parent.artifactSha256,
        })),
        mergeNode: appendNode,
      })
    : profileMerge
      ? await mergeReceizCarriedProofHistoryHeadsV114({
        parents: profileMerge.parentAdmissions.map((parent, index) => ({
          historyHead: profileMerge.parentHistoryHeads[index]!,
          artifactDigest: parent.artifactSha256,
        })),
        mergeNode: appendNode,
      })
    : boundedCompositeShowcase
      ? await appendReceizCarriedProofHistoryHeadV114({
        predecessor: historyHead!,
        predecessorArtifactDigest: admission.artifactSha256,
        appendNode,
      })
    : null;
  planCustody.set(plan, Object.freeze({
    exactKksCoordinate,
    admission,
    verifiedHistory: history,
    verifiedHistoryHead: historyHead,
    verifiedActorEvidence: actorEvidence as ReceizVerifiedIdentityAdmission,
    reduction,
    derivedEffects: effects,
    event,
    appendNode,
    parentHistoryHeads: profileMerge
      ? profileMerge.parentHistoryHeads.map(
        (parent) => parent.headDigest,
      ).sort()
      : economyComposition?.kind === "merge"
      ? economyComposition.parentHistoryHeads.map(
        (parent) => parent.headDigest,
      ).sort()
      : [
          migration?.predecessorHistoryHead.headDigest
            ?? (boundedCompositeShowcase
              ? historyHead!.headDigest
              : history!.headDigests[0]!),
          ...additionalHistories.map(
            (candidate) => candidate.headDigests[0]!,
          ),
        ],
    successorCarriedHistory,
    successorCarriedHistoryHead,
    legacyMigration: migration === null ? null : Object.freeze({
      inspection: migration.inspection,
      predecessorHistoryHead: migration.predecessorHistoryHead,
      boundedHead: migration.boundedHead,
      resolvedChildren: migration.resolvedChildren,
      segments: migration.segments,
    }),
    economyMerge:
      economyComposition?.kind === "merge" ? economyComposition : null,
    profileMerge,
  }));
  return plan;
}

export async function planArtifactAppend(input: Parameters<typeof planArtifactAppendInternal>[0]):
Promise<ReceizArtifactAppendPlan> {
  return planArtifactAppendInternal(input, null);
}

/** Package-internal exact-KKS append; existing sealed history is the authority. */
export async function planReceizExactKksArtifactAppend(input:
  Parameters<typeof planArtifactAppend>[0] & Readonly<{ kksCoordinate: unknown }>,
): Promise<ReceizArtifactAppendPlan> {
  if (!input || typeof input !== "object") throw new TypeError("ARTIFACT_APPEND_INPUT_INVALID");
  const { kksCoordinate, ...appendInput } = input;
  return planArtifactAppendInternal(appendInput, null, null, null, { coordinate: kksCoordinate });
}

async function admitExactKksAppendCoordinate(input: Readonly<{
  admission: ReceizVerifiedArtifactAdmission;
  history: ReceizVerifiedProofHistory;
  coordinate: unknown;
}>): Promise<ReceizKksV1ProofCoordinate> {
  if (input.admission.profile !== "portable-state") {
    throw new TypeError("ARTIFACT_APPEND_EXACT_KKS_PROFILE_DENIED");
  }
  const carried = input.admission.proofHistory;
  if (!carried || carried.historyDigest !== input.history.historyDigest
    || carried.headDigests[0] !== input.history.headDigests[0]) {
    throw new TypeError("ARTIFACT_APPEND_PREDECESSOR_HISTORY_MISMATCH");
  }
  const head = carried.nodes.find((node) => node.nodeDigest === carried.headDigests[0]);
  const predecessor = head ? await readReceizProofHistoryExactKksCoordinate(head) : null;
  if (!predecessor) throw new TypeError("ARTIFACT_APPEND_PREDECESSOR_KKS_REQUIRED");
  return admitReceizKksV1ProofCoordinate(input.coordinate, {
    expectedPreviousKaiSigilProofHead: predecessor.kaiSigil.proofHead,
    minimumExclusiveKaiUpulse: predecessor.kaiUpulse,
  });
}

export async function planReceizEconomyShowcaseAppend(input: Readonly<{
  economyAdmission: unknown;
  profileShowcaseAdmission: unknown;
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  expectedHead: ReceizHistoryDigest;
  idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "commitDomain,economyAdmission,expectedHead,idempotencyKey,profileShowcaseAdmission,verifiedActorEvidence"
    || input.commitDomain.scheme !== "receiz-commit-domain.v1"
    || input.commitDomain.value !== "receiz.com/global/v1"
  ) throw new TypeError("ECONOMY_SHOWCASE_APPEND_INPUT_INVALID");
  const economyAdmission = await verifyReceizArtifactAdmission(
    input.economyAdmission,
  );
  const profileAdmission = await verifyReceizArtifactAdmission(
    input.profileShowcaseAdmission,
  );
  if (
    "code" in economyAdmission
    || economyAdmission.profile !== "economy-showcase"
    || economyAdmission.proofHistoryHead === null
    || "code" in profileAdmission
    || profileAdmission.profile !== "profile-showcase"
    || profileAdmission.proofHistoryHead === null
  ) throw new TypeError("ECONOMY_SHOWCASE_VERIFIED_ADMISSIONS_REQUIRED");
  const economyCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(economyAdmission);
  const profileCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(
      profileAdmission,
    );
  const predecessorHead = economyCarrier["economy-showcase"];
  const profileHead = profileCarrier["profile-showcase"];
  const priorCheckpoints = new Map(
    predecessorHead.fibonacci.checkpoints.map((checkpoint) => [
      checkpoint.operationCount,
      checkpoint.artifactDigest,
    ]),
  );
  const resultingEconomyShowcase =
    await deriveReceizEconomyShowcaseSuccessorHeadV114({
      predecessorHead,
      predecessorArtifactDigest: economyAdmission.artifactSha256,
      profileShowcases: [{
        artifactId:
          profileAdmission.artifactId as `profile-showcase:${string}`,
        artifactDigest: profileAdmission.artifactSha256,
        immutableVersion: profileAdmission.artifactSha256,
        historyHeadDigest: profileAdmission.proofHistoryHead.headDigest,
        admissionEvidenceRoot:
          profileAdmission.admissionProof.admissionProofDigest,
        headKaiUpulse: profileHead.headKaiUpulse as string,
      }],
      resolveCheckpoint: (operationCount) =>
        operationCount === predecessorHead.resultingOperationCount
          ? economyAdmission.artifactSha256
          : priorCheckpoints.get(operationCount) ?? null,
    });
  return planArtifactAppendInternal({
    admission: economyAdmission,
    verifiedHistory: economyAdmission.proofHistoryHead,
    verifiedActorEvidence: input.verifiedActorEvidence,
    commitDomain: input.commitDomain,
    namespace: {
      scheme: "receiz-namespace.v1",
      value: "economy-showcase",
    },
    event: {
      schema: "receiz.economy-showcase.namespace-event.v1",
      resultingEconomyShowcase,
    } as unknown as ReceizConstitutionJson,
    expectedHead: input.expectedHead,
    idempotencyKey: input.idempotencyKey,
  }, null, {
    kind: "append",
    economyAdmission,
    profileAdmission,
    resultingEconomyShowcase:
      resultingEconomyShowcase as unknown as Readonly<Record<string, unknown>>,
  });
}

export async function planReceizEconomyShowcaseMerge(input: Readonly<{
  commonPredecessorAdmission: unknown;
  parentAdmissions: readonly [unknown, unknown];
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  expectedHead: ReceizHistoryDigest;
  idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "commitDomain,commonPredecessorAdmission,expectedHead,idempotencyKey,parentAdmissions,verifiedActorEvidence"
    || input.commitDomain.scheme !== "receiz-commit-domain.v1"
    || input.commitDomain.value !== "receiz.com/global/v1"
    || !Array.isArray(input.parentAdmissions)
    || input.parentAdmissions.length !== 2
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_INPUT_INVALID");
  const commonPredecessorAdmission = await verifyReceizArtifactAdmission(
    input.commonPredecessorAdmission,
  );
  const parents = await Promise.all(input.parentAdmissions.map(
    (parent) => verifyReceizArtifactAdmission(parent),
  ));
  if (
    "code" in commonPredecessorAdmission
    || commonPredecessorAdmission.profile !== "economy-showcase"
    || commonPredecessorAdmission.proofHistoryHead === null
    || parents.some((parent) =>
      "code" in parent
      || parent.profile !== "economy-showcase"
      || parent.proofHistoryHead === null)
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_ADMISSIONS_REQUIRED");
  const parentAdmissions = parents as [
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
  ];
  const commonCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(
      commonPredecessorAdmission,
    );
  const parentCarriers = await Promise.all(parentAdmissions.map(
    (parent) => rederiveReceizEconomyShowcaseCarrierFromAdmission(parent),
  ));
  const resultingEconomyShowcase =
    await deriveReceizEconomyShowcaseMergeHeadV114({
      commonPredecessorHead: commonCarrier["economy-showcase"],
      commonPredecessorArtifactDigest:
        commonPredecessorAdmission.artifactSha256,
      parents: [
        {
          artifactDigest: parentAdmissions[0].artifactSha256,
          head: parentCarriers[0]!["economy-showcase"],
        },
        {
          artifactDigest: parentAdmissions[1].artifactSha256,
          head: parentCarriers[1]!["economy-showcase"],
        },
      ],
    });
  const primaryIndex = parentAdmissions.findIndex((parent) =>
    parent.artifactSha256
      === resultingEconomyShowcase.parentArtifactDigests[0]);
  if (primaryIndex < 0) {
    throw new TypeError("ECONOMY_SHOWCASE_MERGE_PRIMARY_INVALID");
  }
  const primary = parentAdmissions[primaryIndex]!;
  if (
    input.expectedHead.value !== primary.proofHistoryHead!.headDigest
  ) throw new TypeError("HISTORY_STALE");
  const orderedParents = [
    primary,
    parentAdmissions[primaryIndex === 0 ? 1 : 0]!,
  ] as const;
  const orderedHistories = [
    orderedParents[0].proofHistoryHead!,
    orderedParents[1].proofHistoryHead!,
  ] as const;
  return planArtifactAppendInternal({
    admission: primary,
    verifiedHistory: primary.proofHistoryHead,
    verifiedActorEvidence: input.verifiedActorEvidence,
    commitDomain: input.commitDomain,
    namespace: {
      scheme: "receiz-namespace.v1",
      value: "economy-showcase",
    },
    event: {
      schema: "receiz.economy-showcase.namespace-event.v1",
      resultingEconomyShowcase,
    } as unknown as ReceizConstitutionJson,
    expectedHead: input.expectedHead,
    idempotencyKey: input.idempotencyKey,
  }, null, {
    kind: "merge",
    economyAdmission: primary,
    commonPredecessorAdmission,
    parentAdmissions: orderedParents,
    parentHistoryHeads: orderedHistories,
    resultingEconomyShowcase:
      resultingEconomyShowcase as unknown as Readonly<Record<string, unknown>>,
  });
}

export async function planReceizProfileShowcaseBoundedMerge(input: Readonly<{
  resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
  commonPredecessorAdmission: unknown;
  parentAdmissions: readonly [unknown, unknown];
  directDelta: readonly ReceizConstitutionJson[];
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  expectedHead: ReceizHistoryDigest;
  idempotencyKey: string;
}>): Promise<ReceizArtifactAppendPlan> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).filter(key => key !== "resolveVerifiedHistoricalArtifactDigest").sort().join(",")
      !== "commitDomain,commonPredecessorAdmission,directDelta,expectedHead,idempotencyKey,parentAdmissions,verifiedActorEvidence"
    || (input.resolveVerifiedHistoricalArtifactDigest !== undefined && typeof input.resolveVerifiedHistoricalArtifactDigest !== "function")
    || input.commitDomain.scheme !== "receiz-commit-domain.v1"
    || !Array.isArray(input.parentAdmissions)
    || input.parentAdmissions.length !== 2
    || !Array.isArray(input.directDelta)
  ) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_MERGE_INPUT_INVALID");
  const commonPredecessorAdmission = await verifyReceizArtifactAdmission(
    input.commonPredecessorAdmission,
  );
  const parents = await Promise.all(input.parentAdmissions.map(
    (parent) => verifyReceizArtifactAdmission(parent),
  ));
  if (
    "code" in commonPredecessorAdmission
    || commonPredecessorAdmission.profile !== "profile-showcase"
    || commonPredecessorAdmission.proofHistoryHead === null
    || parents.some((parent) =>
      "code" in parent
      || parent.profile !== "profile-showcase"
      || parent.proofHistoryHead === null)
  ) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_MERGE_ADMISSIONS_REQUIRED");
  const parentAdmissions = parents as [
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
  ];
  const commonCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(
      commonPredecessorAdmission,
    );
  const parentCarriers = await Promise.all(parentAdmissions.map(
    (parent) => rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(parent),
  ));
  const resultingShowcase =
    await deriveReceizProfileShowcaseBoundedMergeHeadV114({
      commonPredecessorCarrier: commonCarrier,
      commonPredecessorArtifactDigest:
        commonPredecessorAdmission.artifactSha256,
      parents: [
        {
          artifactDigest: parentAdmissions[0].artifactSha256,
          carrier: parentCarriers[0]!,
        },
        {
          artifactDigest: parentAdmissions[1].artifactSha256,
          carrier: parentCarriers[1]!,
        },
      ],
      directDelta: input.directDelta,
      ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
    });
  const primaryArtifactDigest = (
    resultingShowcase.directDelta as readonly Record<string, unknown>[]
  )[0]?.parentArtifactDigest;
  const primaryIndex = parentAdmissions.findIndex((parent) =>
    parent.artifactSha256 === primaryArtifactDigest);
  if (primaryIndex < 0) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_MERGE_PRIMARY_INVALID");
  }
  const primary = parentAdmissions[primaryIndex]!;
  if (input.expectedHead.value !== primary.proofHistoryHead!.headDigest) {
    throw new TypeError("HISTORY_STALE");
  }
  const orderedParents = [
    primary,
    parentAdmissions[primaryIndex === 0 ? 1 : 0]!,
  ] as const;
  const orderedHistories = [
    orderedParents[0].proofHistoryHead!,
    orderedParents[1].proofHistoryHead!,
  ] as const;
  return planArtifactAppendInternal({
    admission: primary,
    verifiedHistory: primary.proofHistoryHead,
    verifiedActorEvidence: input.verifiedActorEvidence,
    commitDomain: input.commitDomain,
    namespace: {
      scheme: "receiz-namespace.v1",
      value: "profile-showcase",
    },
    event: {
      schema: "receiz.profile-showcase.namespace-event.v1",
      resultingShowcase,
    } as unknown as ReceizConstitutionJson,
    expectedHead: input.expectedHead,
    idempotencyKey: input.idempotencyKey,
  }, null, null, {
    ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
    commonPredecessorAdmission,
    parentAdmissions: orderedParents,
    parentHistoryHeads: orderedHistories,
    resultingShowcase,
  });
}

export type ReceizLegacyProfileShowcaseMigrationEvidenceResolver = (
  evidenceRoot: string,
) => Promise<unknown>;

export type ReceizLegacyProfileShowcaseMigrationSegmentResolver = (
  segmentId: string,
) => Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;

type LegacyMigrationPlacement = {
  reference: Readonly<Record<string, unknown>>;
  visibility: "visible" | "unlisted" | "hidden";
  pinned: boolean;
  membershipOperationIndex: number;
};

function legacyChildKey(value: Readonly<Record<string, unknown>>): string {
  return `${value.stableChildArtifactId}\u0000${value.immutableVersion}`;
}

function sameLegacyChildReference(
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean {
  return left.stableChildArtifactId === right.stableChildArtifactId
    && left.immutableVersion === right.immutableVersion
    && left.childArtifactDigest === right.childArtifactDigest
    && left.admissionEvidenceRoot === right.admissionEvidenceRoot
    && left.contentDigest === right.contentDigest;
}

function exactSegmentMechanics(
  left: ReceizProfileShowcaseSegmentMechanicsV114,
  right: ReceizProfileShowcaseSegmentMechanicsV114,
): boolean {
  return equalExactBytes(left.bytes, right.bytes)
    && canonicalizeReceizConstitution(
      {
        schema: left.schema,
        commitment: left.commitment,
        operations: left.operations,
        membershipWitnesses: left.membershipWitnesses,
        authority: left.authority,
      } as unknown as ReceizConstitutionJson,
    ) === canonicalizeReceizConstitution(
      {
        schema: right.schema,
        commitment: right.commitment,
        operations: right.operations,
        membershipWitnesses: right.membershipWitnesses,
        authority: right.authority,
      } as unknown as ReceizConstitutionJson,
    );
}

export async function planLegacyProfileShowcaseCheckpointMigration(input: Readonly<{
  inspection: ReceizInspectedLegacyProfileShowcaseV114;
  verifiedActorEvidence: unknown;
  commitDomain: ReceizCommitDomainId;
  idempotencyKey: string;
  resolveEvidence: ReceizLegacyProfileShowcaseMigrationEvidenceResolver;
  resolveSegment: ReceizLegacyProfileShowcaseMigrationSegmentResolver;
}>): Promise<ReceizArtifactAppendPlan> {
  if (
    !input || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "commitDomain,idempotencyKey,inspection,resolveEvidence,resolveSegment,verifiedActorEvidence"
    || !isSdkInspectedLegacyProfileShowcaseV114(input.inspection)
    || typeof input.resolveEvidence !== "function"
    || typeof input.resolveSegment !== "function"
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_INPUT_INVALID");
  assertCommitDomain(input.commitDomain);
  if (!validIdentifier(input.idempotencyKey)) {
    throw new TypeError("IDEMPOTENCY_KEY_REQUIRED");
  }
  const inspectionCustody =
    readReceizLegacyProfileShowcaseInspectionCustody(input.inspection);
  const actorAdmission = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
  if ("code" in actorAdmission || actorAdmission.profile !== "identity") {
    throw new TypeError("ACTOR_NOT_VERIFIED");
  }
  const actor = await verifyReceizVerifiedActorReference(
    actorAdmission.actor,
    actorAdmission,
  );
  if ("code" in actor) throw new TypeError(actor.code);
  const legacyHead = inspectionCustody.carrier["profile-showcase"] as
    Readonly<Record<string, unknown>>;
  if (
    legacyHead.profileIdentity !== actor.actorId
    || legacyHead.resultingOperationCount !== input.inspection.resultingOperationCount
    || legacyHead.headKaiUpulse !== input.inspection.headKaiUpulse
    || legacyHead.currentStateRoot !== input.inspection.currentStateRoot
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ACTOR_MISMATCH");

  const nodeByDigest = new Map(
    inspectionCustody.history.nodes.map((node) => [node.nodeDigest, node]),
  );
  const reverseNodes: ReceizProofHistoryNode[] = [];
  let cursor: string | undefined = inspectionCustody.history.headDigests[0];
  while (cursor !== undefined) {
    const node = nodeByDigest.get(cursor);
    if (!node || node.parentDigests.length > 1) {
      throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_LINEAR_HISTORY_REQUIRED");
    }
    reverseNodes.push(node);
    cursor = node.parentDigests[0];
  }
  const nodes = reverseNodes.reverse();
  if (
    nodes.length !== inspectionCustody.history.nodes.length
    || nodes.length !== input.inspection.resultingOperationCount
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ONE_OPERATION_HISTORY_REQUIRED");

  const evidenceCache = new Map<string, ReceizVerifiedArtifactAdmission>();
  const resolveEvidence = async (root: string): Promise<ReceizVerifiedArtifactAdmission> => {
    const cached = evidenceCache.get(root);
    if (cached) return cached;
    const admission = await verifyReceizArtifactAdmission(
      await input.resolveEvidence(root),
    );
    if (
      "code" in admission
      || (
        admission.admissionProof.admissionProofDigest !== root
        && (admission.profile !== "identity" || admission.actor.evidenceDigest.value !== root)
      )
    ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_EVIDENCE_UNRESOLVED");
    evidenceCache.set(root, admission);
    return admission;
  };
  const placements: LegacyMigrationPlacement[] = [];
  const operations: ReceizConstitutionJson[] = [];
  const segmentsByOperation = new Map<number, ReceizProfileShowcaseSegmentMechanicsV114>();
  const artifactAtOperationCount = new Map<number, string>();
  let merkle = createEmptyReceizCompositeMerkleState();
  const persistentStateIO =
    createReceizProfileShowcasePersistentMemoryStoreV114();
  let persistentState =
    createEmptyReceizProfileShowcasePersistentStateV114("0");
  let priorArtifactDigest: string | null = null;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (
      node.event.type !== "profile-showcase.transition"
      || !Array.isArray(node.event.directOperations)
      || node.event.directOperations.length !== 1
      || node.event.predecessorShowcaseDigest !== priorArtifactDigest
    ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ONE_OPERATION_HISTORY_REQUIRED");
    const operation = structuredClone(node.event.directOperations[0]!) as
      Record<string, unknown>;
    if (
      operation.priorCommittedCount !== index
      || operation.directDeltaPosition !== 0
      || operation.parentArtifactDigest !== priorArtifactDigest
      || !operation.kai || typeof operation.kai !== "object"
      || (operation.kai as Record<string, unknown>).upulse !== node.event.kaiUpulse
      || typeof operation.authorityEvidenceRoot !== "string"
    ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_OPERATION_INVALID");
    const operationActor = await resolveEvidence(operation.authorityEvidenceRoot);
    if (operationActor.profile !== "identity") {
      throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ACTOR_EVIDENCE_REQUIRED");
    }
    const operationIndex = operations.length;
    const resolveChild = async (
      reference: Readonly<Record<string, unknown>>,
    ): Promise<ReceizVerifiedArtifactAdmission> => {
      if (typeof reference.admissionEvidenceRoot !== "string") {
        throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
      }
      const admission = await resolveEvidence(reference.admissionEvidenceRoot);
      if (
        admission.artifactId !== reference.stableChildArtifactId
        || admission.artifactSha256 !== reference.childArtifactDigest
        || admission.payloadSha256 !== reference.contentDigest
      ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
      return admission;
    };
    const findPlacement = (child: Readonly<Record<string, unknown>>): number => {
      const placementIndex = placements.findIndex(
        (placement) => legacyChildKey(placement.reference) === legacyChildKey(child),
      );
      if (
        placementIndex < 0
        || placements[placementIndex]!.reference.childArtifactDigest
          !== child.childArtifactDigest
      ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
      return placementIndex;
    };
    switch (operation.kind) {
      case "showcase.append": {
        const child = operation.child as Readonly<Record<string, unknown>>;
        await resolveChild(child);
        const existing = placements.find(
          (placement) => legacyChildKey(placement.reference) === legacyChildKey(child),
        );
        if (existing && !sameLegacyChildReference(existing.reference, child)) {
          throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
        }
        if (!existing) placements.push({
          reference: structuredClone(child),
          visibility: "visible",
          pinned: false,
          membershipOperationIndex: operationIndex,
        });
        break;
      }
      case "showcase.visibility.set": {
        const placement = placements[findPlacement(
          operation.child as Readonly<Record<string, unknown>>,
        )]!;
        if (!["visible", "unlisted", "hidden"].includes(operation.visibility as string)) {
          throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_OPERATION_INVALID");
        }
        placement.visibility = operation.visibility as "visible" | "unlisted" | "hidden";
        break;
      }
      case "showcase.presentation.pin":
      case "showcase.presentation.unpin": {
        placements[findPlacement(
          operation.child as Readonly<Record<string, unknown>>,
        )]!.pinned = operation.kind === "showcase.presentation.pin";
        break;
      }
      case "showcase.order.supersede": {
        const childIndex = findPlacement(
          operation.child as Readonly<Record<string, unknown>>,
        );
        const [moved] = placements.splice(childIndex, 1);
        const after = operation.afterChild as Readonly<Record<string, unknown>> | null;
        const insertionIndex = after === null
          ? 0
          : findPlacement(after) + 1;
        placements.splice(insertionIndex, 0, moved!);
        break;
      }
      case "showcase.section.assign":
        findPlacement(operation.child as Readonly<Record<string, unknown>>);
        break;
      case "showcase.provenance.bind":
        findPlacement(operation.child as Readonly<Record<string, unknown>>);
        if (typeof operation.provenanceEvidenceRoot !== "string") {
          throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_EVIDENCE_UNRESOLVED");
        }
        await resolveEvidence(operation.provenanceEvidenceRoot);
        break;
      case "showcase.merge":
        throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_MERGE_REQUIRES_TASK_7");
      default:
        throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_OPERATION_INVALID");
    }
    const canonicalOperation = operation as unknown as ReceizConstitutionJson;
    operations.push(canonicalOperation);
    merkle = appendReceizCompositeMerkleLeaf(
      merkle,
      await digestReceizProfileShowcaseOperationLeafV114(canonicalOperation),
    );
    const derivedSegment = await createReceizProfileShowcaseSegmentMechanicsV114({
      operations: [canonicalOperation],
      startOperationCount: index,
    });
    persistentState = await reduceReceizProfileShowcasePersistentStateV114({
      state: persistentState,
      operation: canonicalOperation,
      membershipWitness: derivedSegment.membershipWitnesses[0]!,
      io: persistentStateIO,
    });
    segmentsByOperation.set(operationIndex, derivedSegment);
    const nextNode = nodes[index + 1];
    const artifactDigest = nextNode?.event.type === "profile-showcase.transition"
      ? nextNode.event.predecessorShowcaseDigest
      : input.inspection.artifactSha256;
    if (typeof artifactDigest !== "string") {
      throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ARTIFACT_LINEAGE_INVALID");
    }
    artifactAtOperationCount.set(index + 1, artifactDigest);
    priorArtifactDigest = artifactDigest;
  }

  const legacyMerkle = legacyHead.merkle as Readonly<Record<string, unknown>>;
  const counts = {
    operationCount: operations.length,
    membershipCount: placements.length,
    visibleCount: placements.filter((placement) => placement.visibility === "visible").length,
    hiddenCount: placements.filter((placement) => placement.visibility === "hidden").length,
    unlistedCount: placements.filter((placement) => placement.visibility === "unlisted").length,
    pinnedCount: placements.filter((placement) => placement.pinned).length,
  };
  if (
    legacyMerkle.algorithm !== merkle.algorithm
    || legacyMerkle.leafCount !== merkle.leafCount
    || legacyMerkle.root !== merkle.root
    || canonicalizeReceizConstitution(legacyMerkle.frontier as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(merkle.frontier as ReceizConstitutionJson)
    || canonicalizeReceizConstitution(legacyHead.counts as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(counts as ReceizConstitutionJson)
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_REPLAY_MISMATCH");

  const visible = placements.filter((placement) => placement.visibility === "visible");
  const legacyWindow = legacyHead.firstPaintWindow as Readonly<Record<string, unknown>>;
  const legacyWindowChildren = legacyWindow.children as readonly Readonly<Record<string, unknown>>[];
  const visibleWindow = visible.slice(0, 256);
  if (
    legacyWindow.totalVisibleCount !== visible.length
    || legacyWindowChildren.length !== visibleWindow.length
    || legacyWindowChildren.some((child, index) => {
      const reference = visibleWindow[index]!.reference;
      return child.stableChildArtifactId !== reference.stableChildArtifactId
        || child.immutableVersion !== reference.immutableVersion
        || child.childArtifactDigest !== reference.childArtifactDigest;
    })
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_WINDOW_MISMATCH");
  const selectedSegments: ReceizProfileShowcaseSegmentMechanicsV114[] = [];
  const segmentById = new Map<string, ReceizProfileShowcaseSegmentMechanicsV114>();
  const firstPaintChildren = [];
  const resolvedChildren = [];
  for (const placement of visibleWindow) {
    const derivedSegment = segmentsByOperation.get(placement.membershipOperationIndex)!;
    let segment = segmentById.get(derivedSegment.commitment.segmentId);
    if (!segment) {
      const resolved = await input.resolveSegment(derivedSegment.commitment.segmentId);
      if (!resolved || !exactSegmentMechanics(derivedSegment, resolved)) {
        throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_SEGMENT_UNRESOLVED");
      }
      segment = resolved;
      segmentById.set(segment.commitment.segmentId, segment);
      selectedSegments.push(segment);
    }
    const admission = await resolveEvidence(
      placement.reference.admissionEvidenceRoot as string,
    );
    resolvedChildren.push({ reference: placement.reference, admission });
    firstPaintChildren.push({
      reference: placement.reference,
      membershipWitness: segment.membershipWitnesses[0]!,
    });
  }
  const fibonacciCheckpoints = receizCompositeFibonacciDistancesUpTo(
    operations.length,
  ).filter((distance) => distance < operations.length).map((distance) => {
    const operationCount = operations.length - distance;
    const artifactDigest = artifactAtOperationCount.get(operationCount);
    if (!artifactDigest) {
      throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_CHECKPOINT_UNRESOLVED");
    }
    return { distance, operationCount, artifactDigest };
  });
  let historyAccumulator = createEmptyReceizCompositeMerkleState();
  const historyPrefixes = [];
  for (const node of nodes) {
    historyAccumulator = appendReceizCompositeMerkleLeaf(
      historyAccumulator,
      node.nodeDigest,
    );
    historyPrefixes.push(historyAccumulator);
  }
  const currentNode = nodes.at(-1)!;
  const predecessorHistoryHead = await createReceizCarriedProofHistoryHeadV114({
    artifactId: input.inspection.artifactId,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    rootDigest: inspectionCustody.history.rootDigest,
    headDigest: currentNode.nodeDigest,
    nodeCount: nodes.length,
    accumulator: historyAccumulator,
    currentNode,
    parentRefs: currentNode.parentDigests.length === 0 ? [] : [{
      nodeDigest: currentNode.parentDigests[0]!,
      artifactDigest: currentNode.event.type === "profile-showcase.transition"
        ? currentNode.event.predecessorShowcaseDigest!
        : (() => { throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_HISTORY_INVALID"); })(),
      nodeCount: nodes.length - 1,
      accumulatorRoot: historyPrefixes[nodes.length - 2]!.root,
    }],
  });
  const persistentWindow =
    await deriveReceizProfileShowcasePersistentWindowV114({
      state: persistentState,
      io: persistentStateIO,
    });
  const boundedHead = await deriveReceizLegacyProfileShowcaseCheckpointHeadV114({
    artifactId: input.inspection.artifactId,
    ownerReceizIdentity: input.inspection.ownerReceizIdentity,
    profileIdentity: actor.actorId,
    legacyArtifactDigest: input.inspection.artifactSha256,
    legacyHistoryHeadDigest: input.inspection.historyHeadDigest,
    legacyHeadKaiUpulse: input.inspection.headKaiUpulse,
    legacyOperationCount: input.inspection.resultingOperationCount,
    legacyStateRoot: input.inspection.currentStateRoot,
    merkle,
    fibonacciCheckpoints,
    segmentWindow: selectedSegments.map((segment) => segment.commitment),
    counts,
    firstPaintChildren,
    totalVisibleCount: visible.length,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    placementRoot: persistentState.placementRoot,
    orderRoot: persistentState.orderRoot,
    firstPaintWitnessNodes: persistentWindow.witnessNodes,
  });
  await verifyPackageV114Registry(RECEIZ_V114_CONSTITUTION_REGISTRY);
  appendRegistryAuthority.set(inspectionCustody.internalAdmission, Object.freeze({
    kind: "composite-v114",
    registry: RECEIZ_V114_CONSTITUTION_REGISTRY,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    laws: RECEIZ_V114_CONSTITUTION_REGISTRY.laws.map((law) =>
      Object.freeze({ id: law.id, version: law.version })),
  }));
  return planArtifactAppendInternal({
    admission: inspectionCustody.internalAdmission,
    verifiedHistory: inspectionCustody.history,
    verifiedActorEvidence: actorAdmission,
    commitDomain: input.commitDomain,
    namespace: { scheme: "receiz-namespace.v1", value: "profile-showcase" },
    event: {
      schema: "receiz.profile-showcase.namespace-event.v1",
      resultingShowcase: boundedHead as ReceizConstitutionJson,
    },
    expectedHead: {
      algorithm: "sha-256",
      binds: "verified-proof-history",
      value: input.inspection.historyHeadDigest,
    },
    idempotencyKey: input.idempotencyKey,
  }, {
    inspection: input.inspection,
    predecessorHistoryHead,
    boundedHead,
    resolvedChildren,
    segments: selectedSegments,
  });
}

export function receizArtifactAppendCapabilityContext(
  plan: ReceizArtifactAppendPlan,
  input: Readonly<{
    tenantId: string | null;
    authorityProfile: ReceizAuthorityProfile;
  }> = { tenantId: null, authorityProfile: "artifact-local" },
): ReceizArtifactAppendCapabilityContext {
  const custody = planCustody.get(plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  return deepFreeze({
    actorId: plan.actor.actorId,
    tenantId: input.tenantId,
    authorityProfile: input.authorityProfile,
    operation: "artifact.append",
    resourceId: plan.resource,
    registryDigest: plan.registryDigest.value,
    maximumEffects: { ...custody.derivedEffects },
    operationConstraints: {
      planDigest: plan.planDigest,
      commitDomain: plan.commitDomain,
    },
  });
}

export function assertReceizArtifactAppendPlanCustody(
  plan: ReceizArtifactAppendPlan,
): asserts plan is ReceizArtifactAppendPlan {
  if (!isSdkIssuedReceizArtifactAppendPlan(plan)) throw new TypeError("PLAN_NOT_SDK_ISSUED");
}

export function readReceizArtifactAppendDerivedEffects(
  plan: ReceizArtifactAppendPlan,
): Readonly<Record<string, number>> {
  const custody = planCustody.get(plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  return deepFreeze({ ...custody.derivedEffects });
}

export function readReceizArtifactAppendPlannedEvent(
  plan: ReceizArtifactAppendPlan,
): ReceizConstitutionJson {
  const custody = planCustody.get(plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  return deepFreeze(structuredClone(custody.event));
}

/**
 * Exposes the SDK-custodied direct history-parent set for composition checks.
 * These are mechanics beneath the sealed successor, never caller authority.
 */
export function readReceizArtifactAppendPlannedHistoryParents(
  plan: ReceizArtifactAppendPlan,
): readonly string[] {
  const custody = planCustody.get(plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  return deepFreeze([...custody.parentHistoryHeads].sort());
}

export function readReceizLegacyProfileShowcaseMigrationPlanCustody(
  plan: ReceizArtifactAppendPlan,
): Readonly<{
  inspection: ReceizInspectedLegacyProfileShowcaseV114;
  children: readonly Readonly<{
    reference: Readonly<Record<string, unknown>>;
    admission: ReceizVerifiedArtifactAdmission;
  }>[];
  segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
}> {
  const migration = planCustody.get(plan)?.legacyMigration;
  if (!migration) {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_PLAN_NOT_SDK_ISSUED");
  }
  return Object.freeze({
    inspection: migration.inspection,
    children: migration.resolvedChildren,
    segments: migration.segments,
  });
}

export async function admitReceizProfileShowcaseTransitionSuccessor(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  candidateArtifact: ReceizSealedArtifact;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null> | string | null;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  const custody = planCustody.get(input.plan);
  if (!custody || custody.admission.profile !== "profile-showcase") {
    throw new TypeError("PLAN_NOT_SDK_ISSUED");
  }
  if (custody.legacyMigration) {
    return admitReceizLegacyProfileShowcaseMigrationWithInspectionContext({
      inspection: custody.legacyMigration.inspection,
      candidateArtifact: input.candidateArtifact,
      expectedHead: custody.legacyMigration.boundedHead,
    });
  }
  if (custody.profileMerge) {
    return admitReceizProfileShowcaseMergeWithParentContext({
      commonPredecessorAdmission:
        custody.profileMerge.commonPredecessorAdmission,
      parentAdmissions: custody.profileMerge.parentAdmissions,
      ...((input.resolveVerifiedHistoricalArtifactDigest ?? custody.profileMerge.resolveVerifiedHistoricalArtifactDigest)
        ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest ?? custody.profileMerge.resolveVerifiedHistoricalArtifactDigest } : {}),
      candidateArtifact: input.candidateArtifact,
    });
  }
  return admitReceizProfileShowcaseSuccessorWithPredecessorContext({
    predecessorAdmission: custody.admission,
    candidateArtifact: input.candidateArtifact,
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
  });
}

export async function admitReceizEconomyShowcaseTransitionSuccessor(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  candidateArtifact: ReceizSealedArtifact;
}>): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "economy-showcase";
}>> {
  const custody = planCustody.get(input.plan);
  if (!custody || custody.admission.profile !== "economy-showcase") {
    throw new TypeError("PLAN_NOT_SDK_ISSUED");
  }
  if (custody.economyMerge) {
    return admitReceizEconomyShowcaseMergeWithParentContext({
      commonPredecessorAdmission:
        custody.economyMerge.commonPredecessorAdmission,
      parentAdmissions: custody.economyMerge.parentAdmissions,
      candidateArtifact: input.candidateArtifact,
    });
  }
  return admitReceizEconomyShowcaseSuccessorWithPredecessorContext({
    predecessorAdmission: custody.admission,
    candidateArtifact: input.candidateArtifact,
  });
}

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

export type ReceizArtifactTransitionOperationResult =
  | ReceizCommittedArtifactTransition
  | Extract<ReceizArtifactTransitionCommitResult, { status: "conflict" | "rejected" | "failed" }>;

type ReceizCommittedArtifactTransitionCustody = Readonly<{
  plan: ReceizArtifactAppendPlan;
  admission: ReceizVerifiedArtifactAdmission;
}>;

const committedArtifactTransitionCustody =
  new WeakMap<object, ReceizCommittedArtifactTransitionCustody>();

export function isSdkIssuedReceizCommittedArtifactTransition(
  value: unknown,
): value is ReceizCommittedArtifactTransition {
  return value !== null
    && typeof value === "object"
    && committedArtifactTransitionCustody.has(value);
}

export function readSdkIssuedReceizCommittedArtifactTransitionCustody(
  value: ReceizCommittedArtifactTransition,
): ReceizCommittedArtifactTransitionCustody {
  const custody = committedArtifactTransitionCustody.get(value);
  if (!custody) throw new TypeError("COMMITTED_TRANSITION_NOT_SDK_ISSUED");
  return custody;
}

/**
 * Safe mechanics for conforming stores. It can only verify an exact
 * SDK-custodied unit against a detached snapshot resolved by the store under
 * its own lock. It returns no authority object or verifier context.
 */
export async function verifyReceizArtifactTransitionCommitCandidate(
  unit: ReceizArtifactTransitionCommitUnit,
  freshStoreSnapshot: ReceizArtifactTransitionStoreVerificationInput,
): Promise<boolean> {
  if (!unit || typeof unit !== "object" || !freshStoreSnapshot || typeof freshStoreSnapshot !== "object"
    || Object.keys(freshStoreSnapshot).sort().join(",") !== "capability,command,exactBytes,plan,staged"
    || !(freshStoreSnapshot.exactBytes instanceof Uint8Array)) return false;
  const custody = readReceizCanonicalArtifactTransitionCommitUnit(unit);
  if (!custody) return false;
  try {
    return await custody.verifyFreshStoreCandidate({
      exactBytes: freshStoreSnapshot.exactBytes.slice(),
      staged: freshStoreSnapshot.staged,
      plan: freshStoreSnapshot.plan,
      capability: freshStoreSnapshot.capability,
      command: freshStoreSnapshot.command,
    });
  } catch {
    return false;
  }
}

function sameDigestValue<Binding extends string>(
  left: ReceizDigest<Binding>,
  right: ReceizDigest<Binding>,
): boolean {
  return left.algorithm === right.algorithm && left.binds === right.binds && left.value === right.value;
}

function sameCommitDomain(left: ReceizCommitDomainId, right: ReceizCommitDomainId): boolean {
  return left.scheme === right.scheme && left.value === right.value;
}

function equalExactBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function assertCapabilityMatchesPlan(
  capability: ReceizVerifiedCapability,
  plan: ReceizArtifactAppendPlan,
  custody: PlanCustody,
): void {
  if (!isReceizVerifiedCapability(capability)
    || capability.payload.actorId !== plan.actor.actorId
    || capability.payload.registryDigest !== plan.registryDigest.value
    || !capability.payload.operations.includes("artifact.append")
    || !capability.payload.resourceScopes.includes(plan.resource)
    || !sameDigestValue(capability.payload.operationConstraints.planDigest, plan.planDigest)
    || !sameCommitDomain(capability.payload.operationConstraints.commitDomain, plan.commitDomain)
    || Object.entries(custody.derivedEffects).some(
      ([effect, amount]) => amount > (capability.payload.maximumEffects[effect] ?? -1),
    )) throw new TypeError("CAPABILITY_CONTEXT_MISMATCH");
}

async function reconstructCandidateTransition(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  payloadBytes: Uint8Array;
  artifact: ReceizSealedArtifact;
  verifierContextDigest: string;
}>): Promise<Readonly<{
  transition: ReceizArtifactTransitionBasis;
  appendNode: ReceizProofHistoryNode;
}>> {
  const custody = planCustody.get(input.plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  const admission = await verifyReceizArtifactAdmission(custody.admission);
  if ("code" in admission) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
  const boundedProfileShowcase = admission.profile === "profile-showcase"
    && (custody.verifiedHistoryHead !== null || custody.legacyMigration !== null);
  const boundedEconomyShowcase = admission.profile === "economy-showcase"
    && custody.verifiedHistoryHead !== null;
  const boundedCompositeShowcase =
    boundedProfileShowcase || boundedEconomyShowcase;
  const history = boundedCompositeShowcase
    ? null
    : await verifyReceizProofHistory(custody.verifiedHistory);
  const historyHead = boundedCompositeShowcase
    ? custody.legacyMigration?.predecessorHistoryHead
      ?? await parseReceizCarriedProofHistoryHeadV114(custody.verifiedHistoryHead!)
    : null;
  const exactKksCoordinate = custody.exactKksCoordinate
    ? await admitExactKksAppendCoordinate({
      admission, history: history!, coordinate: custody.exactKksCoordinate,
    })
    : null;
  const candidateBodies = await snapshotReceizNamespaceBodies(input.payloadBytes);
  const target = candidateBodies.get(input.plan.transition.namespace.value);
  const newlyCarriedHistoryNamespace = (
    custody.successorCarriedHistory !== null
      || custody.successorCarriedHistoryHead !== null
  )
    && input.plan.transition.namespace.value !== "receizProofHistory"
    && !custody.reduction.preservedNamespaces.has("receizProofHistory");
  if (!target || !equalExactBytes(target.bytes, custody.reduction.proposedTargetBytes)
    || candidateBodies.size !== custody.reduction.preservedNamespaces.size
      + 1
      + (newlyCarriedHistoryNamespace ? 1 : 0)) {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  for (const [name, preserved] of custody.reduction.preservedNamespaces) {
    if (name === "receizProofHistory"
      && (custody.successorCarriedHistory !== null
        || custody.successorCarriedHistoryHead !== null)) continue;
    const candidate = candidateBodies.get(name);
    if (!candidate || !equalExactBytes(candidate.bytes, preserved.bytes)) {
      throw new TypeError("TRANSITION_MISMATCH");
    }
  }
  const decoded = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(input.payloadBytes),
  ) as unknown;
  let artifactId: string;
  let carriedHistory: ReceizVerifiedProofHistory | null = null;
  let carriedHistoryHead: ReceizCarriedProofHistoryHeadV114 | null = null;
  try {
    if (admission.profile === "profile-showcase") {
      if (boundedProfileShowcase) {
        const carrier = await parseReceizBoundedProfileShowcaseCarrierV114(decoded);
        await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrier);
        artifactId = carrier.artifactId;
        carriedHistoryHead = carrier.receizProofHistory;
      } else {
        const carrier = await parseReceizProfileShowcaseCarrier(decoded);
        artifactId = carrier.artifactId;
        carriedHistory = await verifyReceizCarriedProofHistory({
          history: carrier.receizProofHistory.history,
          artifactId,
          registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
          artifactDigest: input.artifact.artifactSha256,
          verifierContextDigest: input.verifierContextDigest,
        });
      }
    } else if (admission.profile === "economy-showcase") {
      const carrier = await parseReceizEconomyShowcaseCarrierV114(decoded);
      await assertReceizEconomyShowcaseCarriedHeadSemanticsV114(carrier);
      artifactId = carrier.artifactId;
      carriedHistoryHead = carrier.receizProofHistory;
    } else {
      const portable = await parseReceizPortableAssetDocument(decoded);
      artifactId = (await deriveReceizPortableOwnershipContinuity(portable)).artifactId;
      if (!portable.receizProofHistory) throw new TypeError("TRANSITION_MISMATCH");
      carriedHistory = await verifyReceizCarriedProofHistory({
        history: portable.receizProofHistory.history,
        artifactId,
        registryDigest: admission.admissionProof.registryDigest,
        artifactDigest: input.artifact.artifactSha256,
        verifierContextDigest: input.verifierContextDigest,
      });
    }
  } catch {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  const eventDigest = digest(
    "canonical-namespace-event",
    await digestReceizAuthority("event", "receiz.namespace-event.v112", custody.event),
  );
  const appendNode = custody.legacyMigration !== null
    ? custody.appendNode
    : boundedProfileShowcase
    ? await createReceizBoundedProfileShowcaseAppendNode({
        admission: admission as Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
        predecessorHistoryHead: historyHead!,
        ...(custody.profileMerge
          ? { parentHistoryHeads: custody.profileMerge.parentHistoryHeads }
          : {}),
        reduction: custody.reduction,
        resultingHead: (custody.event as Record<string, unknown>).resultingShowcase as Record<string, unknown>,
      })
    : boundedEconomyShowcase
      ? custody.economyMerge
        ? await createReceizEconomyShowcaseMergeNode({
          admission: admission as Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
          }>,
          parentHistoryHeads: custody.economyMerge.parentHistoryHeads,
          reduction: custody.reduction,
          resultingHead: (custody.event as Record<string, unknown>)
            .resultingEconomyShowcase,
        })
        : await createReceizEconomyShowcaseAppendNode({
          admission: admission as Extract<ReceizVerifiedArtifactAdmission, {
            profile: "economy-showcase";
          }>,
          predecessorHistoryHead: historyHead!,
          reduction: custody.reduction,
          resultingHead: (custody.event as Record<string, unknown>)
            .resultingEconomyShowcase,
        })
    : admission.profile === "profile-showcase"
      ? await createReceizProfileShowcaseAppendNode({
        admission,
        history: history!,
        reduction: custody.reduction,
        event: custody.event,
      eventDigest,
      parentHistoryHeads: custody.parentHistoryHeads,
      })
      : await createReceizArtifactTransitionProofHistoryAppendNode({
        basis: {
          artifactId,
          registryDigest: admission.admissionProof.registryDigest,
          parentDigest: history!.headDigests[0]!,
          kaiPulse: exactKksCoordinate?.kaiPulse ?? admission.admissionProof.registryEffectiveKai,
          namespace: custody.reduction.namespace,
          namespaceLawVersion: custody.reduction.namespaceLawVersion,
          namespaceReducerVersion: custody.reduction.namespaceReducerVersion,
          eventDigest,
          proposedNamespaceBodyDigest: target.bodyDigest,
          actor: input.plan.actor,
        },
        event: custody.event,
        ...(exactKksCoordinate ? {
          kksCoordinate: exactKksCoordinate,
          predecessorArtifactDigest: admission.artifactSha256,
        } : {}),
      });
  if (appendNode.nodeDigest !== custody.appendNode.nodeDigest
    || (carriedHistoryHead !== null
      && (carriedHistoryHead.headDigest !== appendNode.nodeDigest
        || carriedHistoryHead.commitmentDigest
          !== custody.successorCarriedHistoryHead?.commitmentDigest))
    || (carriedHistory !== null
      && (carriedHistory.headDigests.length !== 1
        || carriedHistory.headDigests[0] !== appendNode.nodeDigest))) {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  const preservedNamespaces = [...candidateBodies.values()]
    .filter((snapshot) => snapshot.namespace.value !== custody.reduction.namespace.value
      && snapshot.namespace.value !== "receizProofHistory")
    .map(({ namespace, bodyDigest }) => ({ namespace, bodyDigest }))
    .sort((left, right) => compareCanonicalText(left.namespace.value, right.namespace.value));
  const transition: ReceizArtifactTransitionBasis = deepFreeze({
    artifactId,
    priorArtifactDigest: digest("exact-artifact-bytes", admission.artifactSha256),
    basePayloadDigest: stableBasePayloadDigest(admission),
    expectedHead: digest(
      "verified-proof-history",
      boundedCompositeShowcase ? historyHead!.headDigest : history!.headDigests[0]!,
    ),
    proposedHistoryHead: digest("verified-proof-history", appendNode.nodeDigest),
    namespace: custody.reduction.namespace,
    namespaceLawVersion: custody.reduction.namespaceLawVersion,
    namespaceReducerVersion: custody.reduction.namespaceReducerVersion,
    priorNamespaceBodyDigest: custody.reduction.priorTarget?.bodyDigest ?? null,
    eventDigest,
    proposedNamespaceBodyDigest: target.bodyDigest,
    preservedNamespaces,
    registryDigest: digest("constitution-registry", admission.admissionProof.registryDigest),
    actor: input.plan.actor,
    proofSuiteRequirements: {
      signatureVersion: input.artifact.continuity.signatureVersion,
      carrier: input.artifact.continuity.carrier,
    },
  });
  if (!receizArtifactTransitionBasisEquals(transition, input.plan.transition)) {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  const transitionDigest = digest(
    "canonical-artifact-transition",
    await digestReceizAuthority("transition", "receiz.artifact-transition.v112", transition),
  );
  if (!sameDigestValue(transitionDigest, input.plan.transitionDigest)) {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  return Object.freeze({ transition, appendNode });
}

export async function sealArtifactTransitionCandidate(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
}>): Promise<ReceizVerifiedArtifactTransitionCandidate> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "capability,plan,sealer"
    || typeof input.sealer !== "function") throw new TypeError("ARTIFACT_TRANSITION_SEAL_INPUT_INVALID");
  const custody = planCustody.get(input.plan);
  if (!custody) throw new TypeError("PLAN_NOT_SDK_ISSUED");
  assertCapabilityMatchesPlan(input.capability, input.plan, custody);
  let successorPayloadBytes = composeReceizNamespaceReductionPayload({
    originalPayloadBytes: custody.admission.verifiedPayload.bytes,
    reduction: custody.reduction,
  });
  if (custody.successorCarriedHistoryHead) {
    const decoded = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(successorPayloadBytes),
    ) as Record<string, unknown>;
    const carrier = custody.admission.profile === "economy-showcase"
      ? await createReceizEconomyShowcaseCarrierV114({
          head: decoded["economy-showcase"] as import(
            "./economyShowcaseTransport.js"
          ).ReceizEconomyShowcaseHeadV114,
          historyHead: custody.successorCarriedHistoryHead,
        })
      : await createReceizBoundedProfileShowcaseCarrierV114({
          artifactId:
            custody.admission.artifactId as `profile-showcase:${string}`,
          ownerReceizIdentity: custody.admission.ownerReceizId!,
          head: decoded["profile-showcase"] as Record<string, unknown>,
          historyHead: custody.successorCarriedHistoryHead,
        });
    successorPayloadBytes = new TextEncoder().encode(
      canonicalizeReceizConstitution(carrier as unknown as ReceizConstitutionJson),
    );
  } else if (custody.successorCarriedHistory) {
    successorPayloadBytes = custody.admission.profile === "portable-state"
      ? await replaceReceizPortableProofHistoryBytes(
          successorPayloadBytes,
          custody.successorCarriedHistory,
        )
      : await attachReceizProfileShowcaseProofHistoryBytes(
          successorPayloadBytes,
          custody.successorCarriedHistory,
        );
  }
  const returnedArtifact = await input.sealer(Object.freeze({
    plan: input.plan,
    predecessor: custody.admission,
    successorPayloadBytes: successorPayloadBytes.slice(),
  }));
  let verified: Awaited<ReturnType<typeof reverifyReceizArtifactWithAdmissionContext>>;
  try {
    verified = await reverifyReceizArtifactWithAdmissionContext({
      predecessorAdmission: custody.admission,
      candidateArtifact: returnedArtifact,
    });
  } catch {
    throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
  }
  await reconstructCandidateTransition({
    plan: input.plan,
    payloadBytes: verified.payloadBytes,
    artifact: verified.artifact,
    verifierContextDigest: verified.verifierContextDigest,
  });
  const candidate: ReceizVerifiedArtifactTransitionCandidate = Object.freeze({
    status: "sealed-transition",
    artifact: verified.artifact,
    artifactDigest: verified.artifactDigest,
    transitionDigest: structuredClone(input.plan.transitionDigest),
    planDigest: structuredClone(input.plan.planDigest),
    committed: false,
  });
  registerReceizArtifactTransitionCandidateCustody(candidate, {
    plan: input.plan,
    commitDomain: input.plan.commitDomain,
    exactBytes: verified.exactBytes,
    filename: verified.artifact.filename,
    mimeType: verified.artifact.mimeType,
    payloadSha256: verified.artifact.payloadSha256,
    createdAt: Date.now(),
  });
  return candidate;
}

function sameStagedTransition(
  left: ReceizStagedArtifactTransition,
  right: ReceizStagedArtifactTransition,
): boolean {
  return left.status === "staged-transition"
    && right.status === "staged-transition"
    && left.committed === false
    && right.committed === false
    && sameCommitDomain(left.reference.commitDomain, right.reference.commitDomain)
    && sameDigestValue(left.reference.artifactDigest, right.reference.artifactDigest)
    && sameDigestValue(left.reference.transitionDigest, right.reference.transitionDigest)
    && sameDigestValue(left.reference.storageKeyDigest, right.reference.storageKeyDigest)
    && left.reference.authority.stagingReferenceIsProofAuthority === false
    && right.reference.authority.stagingReferenceIsProofAuthority === false
    && left.reference.authority.strongerTruth === "sealed-receiz-proof-object"
    && right.reference.authority.strongerTruth === "sealed-receiz-proof-object"
    && left.filename === right.filename
    && left.mimeType === right.mimeType
    && left.payloadSha256 === right.payloadSha256;
}

function snapshotStagedTransition(value: ReceizStagedArtifactTransition): ReceizStagedArtifactTransition {
  if (!value || typeof value !== "object" || value.status !== "staged-transition"
    || value.committed !== false || !(value.exactBytes instanceof Uint8Array)
    || typeof value.filename !== "string" || typeof value.mimeType !== "string"
    || typeof value.payloadSha256 !== "string") throw new TypeError("TRANSITION_MISMATCH");
  return Object.freeze({
    status: "staged-transition" as const,
    reference: deepFreeze(structuredClone(value.reference)),
    exactBytes: value.exactBytes.slice(),
    filename: value.filename,
    mimeType: value.mimeType,
    payloadSha256: value.payloadSha256,
    committed: false as const,
  });
}

async function resolveCanonicalStagedCandidate(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  staged: ReceizStagedArtifactTransition;
  store: ReceizArtifactTransitionStore;
}>): Promise<Readonly<{
  verified: Awaited<ReturnType<typeof reverifyReceizArtifactWithAdmissionContext>>;
  appendNode: Awaited<ReturnType<typeof createReceizArtifactTransitionProofHistoryAppendNode>>;
}>> {
  const custody = planCustody.get(input.plan);
  if (!custody) throw new TypeError("TRANSITION_MISMATCH");
  const resolved = await input.store.resolveCandidate(input.staged.reference.artifactDigest);
  if (!resolved) throw new TypeError("CANDIDATE_NOT_STAGED");
  if (!sameStagedTransition(resolved, input.staged)
    || !sameDigestValue(resolved.reference.transitionDigest, input.plan.transitionDigest)
    || !sameCommitDomain(resolved.reference.commitDomain, input.plan.commitDomain)) {
    throw new TypeError("TRANSITION_MISMATCH");
  }
  let verified: Awaited<ReturnType<typeof reverifyReceizArtifactWithAdmissionContext>>;
  try {
    verified = await reverifyReceizArtifactWithAdmissionContext({
      predecessorAdmission: custody.admission,
      candidateArtifact: {
        artifact: new Blob([resolved.exactBytes.slice()], { type: resolved.mimeType }),
        filename: resolved.filename,
        mimeType: resolved.mimeType,
        artifactSha256: resolved.reference.artifactDigest.value,
        payloadSha256: resolved.payloadSha256,
      },
    });
  } catch {
    throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
  }
  const reconstructed = await reconstructCandidateTransition({
    plan: input.plan,
    payloadBytes: verified.payloadBytes,
    artifact: verified.artifact,
    verifierContextDigest: verified.verifierContextDigest,
  });
  return Object.freeze({ verified, appendNode: reconstructed.appendNode });
}

function acceptedReceiptMatches(
  receipt: ReceizAppendReceipt,
  plan: ReceizArtifactAppendPlan,
  capabilityDigest: ReceizCapabilityDigest,
  artifactDigest: ReceizArtifactDigest,
  commandDigest: ReceizCommandDigest,
): boolean {
  return sameCommitDomain(receipt.commitDomain, plan.commitDomain)
    && receipt.actor.actorId === plan.actor.actorId
    && sameDigestValue(receipt.actor.evidenceDigest, plan.actor.evidenceDigest)
    && receipt.actor.admissionProfile === "identity"
    && sameDigestValue(receipt.actor.registryDigest, plan.actor.registryDigest)
    && receipt.resource === plan.resource
    && receipt.operation === "artifact.append"
    && sameDigestValue(receipt.planDigest, plan.planDigest)
    && sameDigestValue(receipt.capabilityDigest, capabilityDigest)
    && sameDigestValue(receipt.transitionDigest, plan.transitionDigest)
    && sameDigestValue(receipt.artifactDigest, artifactDigest)
    && sameDigestValue(receipt.priorHead, plan.transition.expectedHead)
    && sameDigestValue(receipt.acceptedHead, plan.transition.proposedHistoryHead)
    && sameDigestValue(receipt.commandDigest, commandDigest)
    && sameDigestValue(receipt.idempotencyIdentityDigest, plan.idempotencyKeyDigest)
    && receipt.authority.receiptIsProofAuthority === false
    && receipt.authority.strongerTruth === "sealed-receiz-proof-object";
}

function snapshotReportedAppendReceipt(receipt: ReceizAppendReceipt): ReceizAppendReceipt {
  return deepFreeze({
    commitDomain: structuredClone(receipt.commitDomain),
    actor: {
      actorId: receipt.actor.actorId,
      evidenceDigest: structuredClone(receipt.actor.evidenceDigest),
      admissionProfile: "identity" as const,
      registryDigest: structuredClone(receipt.actor.registryDigest),
    },
    resource: receipt.resource,
    operation: "artifact.append" as const,
    planDigest: structuredClone(receipt.planDigest),
    capabilityDigest: structuredClone(receipt.capabilityDigest),
    transitionDigest: structuredClone(receipt.transitionDigest),
    artifactDigest: structuredClone(receipt.artifactDigest),
    priorHead: structuredClone(receipt.priorHead),
    acceptedHead: structuredClone(receipt.acceptedHead),
    commandDigest: structuredClone(receipt.commandDigest),
    idempotencyIdentityDigest: structuredClone(receipt.idempotencyIdentityDigest),
    authority: {
      receiptIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  });
}

export async function commitArtifactTransition(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  staged: ReceizStagedArtifactTransition;
  store: ReceizArtifactTransitionStore;
}>): Promise<ReceizArtifactTransitionOperationResult> {
  if (!input || typeof input !== "object"
    || Object.keys(input).sort().join(",") !== "capability,plan,staged,store") {
    return { status: "rejected", code: "TRANSITION_MISMATCH" };
  }
  const custody = planCustody.get(input.plan);
  if (!custody) return { status: "rejected", code: "TRANSITION_MISMATCH" };
  let staged: ReceizStagedArtifactTransition;
  try { staged = snapshotStagedTransition(input.staged); } catch {
    return { status: "rejected", code: "TRANSITION_MISMATCH" };
  }
  const operation = { plan: input.plan, capability: input.capability, staged, store: input.store };
  if (!sameCommitDomain(input.store.commitDomain, input.plan.commitDomain)) {
    return { status: "rejected", code: "COMMIT_DOMAIN_MISMATCH" };
  }
  try { assertCapabilityMatchesPlan(input.capability, input.plan, custody); } catch {
    return { status: "rejected", code: "TRANSITION_MISMATCH" };
  }
  try {
    await resolveCanonicalStagedCandidate(operation);
  } catch (error) {
    const code = error instanceof Error ? error.message : "CANDIDATE_VERIFICATION_FAILED";
    if (code === "CANDIDATE_NOT_STAGED") return { status: "rejected", code };
    if (code === "TRANSITION_MISMATCH") return { status: "rejected", code };
    return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };
  }
  const capabilityDigest = digest("verified-capability", input.capability.digest);
  const atomicRequirements = readReceizArtifactTransitionAtomicRequirements(input.plan);
  if (custody.event && typeof custody.event === "object" && !Array.isArray(custody.event)
    && custody.event.schema === "receiz.subject.thread-source-reference.v125" && !atomicRequirements) {
    return { status: "rejected", code: "TRANSITION_MISMATCH" };
  }
  if (atomicRequirements && input.store.atomicReadDependencies !== true) return { status: "rejected", code: "TRANSITION_MISMATCH" };
  const commandBasis: ReceizArtifactTransitionCommitCommandBasis = {
    ...(atomicRequirements ? { atomicRequirements } : {}),
    planDigest: structuredClone(input.plan.planDigest),
    capabilityDigest,
    transitionDigest: structuredClone(input.plan.transitionDigest),
    candidateArtifactDigest: structuredClone(staged.reference.artifactDigest),
    stagedCandidateReference: structuredClone(staged.reference),
    commitDomain: structuredClone(input.plan.commitDomain),
  };
  const commandDigest = digest(
    "artifact-transition-command",
    await digestReceizAuthority("command", "receiz.artifact-transition-command.v112", commandBasis),
  );
  const unit = Object.freeze({
    commitDomain: input.plan.commitDomain,
    plan: input.plan,
    capability: input.capability,
    command: Object.freeze({ ...commandBasis, commandDigest }),
    expectedHead: input.plan.transition.expectedHead,
  });
  registerReceizCanonicalArtifactTransitionCommitUnit(unit, {
    verifyFreshStoreCandidate: async (fresh) => {
      try {
        if (fresh.plan !== input.plan || fresh.capability !== input.capability || fresh.command !== unit.command
          || !sameStagedTransition(fresh.staged, staged)
          || !sameCommitDomain(fresh.staged.reference.commitDomain, unit.command.commitDomain)
          || !sameCommitDomain(fresh.staged.reference.commitDomain, input.plan.commitDomain)
          || !sameDigestValue(fresh.staged.reference.artifactDigest, unit.command.candidateArtifactDigest)
          || !sameDigestValue(fresh.staged.reference.artifactDigest, unit.command.stagedCandidateReference.artifactDigest)
          || !sameDigestValue(fresh.staged.reference.transitionDigest, unit.command.transitionDigest)
          || !sameDigestValue(fresh.staged.reference.transitionDigest, input.plan.transitionDigest)
          || !sameDigestValue(fresh.staged.reference.storageKeyDigest, unit.command.stagedCandidateReference.storageKeyDigest)
          || fresh.staged.reference.authority.stagingReferenceIsProofAuthority
            !== unit.command.stagedCandidateReference.authority.stagingReferenceIsProofAuthority
          || fresh.staged.reference.authority.strongerTruth
            !== unit.command.stagedCandidateReference.authority.strongerTruth) return false;
        const verified = await reverifyReceizArtifactWithAdmissionContext({
          predecessorAdmission: custody.admission,
          candidateArtifact: {
            artifact: new Blob([fresh.exactBytes.slice()], { type: fresh.staged.mimeType }),
            filename: fresh.staged.filename,
            mimeType: fresh.staged.mimeType,
            artifactSha256: fresh.staged.reference.artifactDigest.value,
            payloadSha256: fresh.staged.payloadSha256,
          },
        });
        await reconstructCandidateTransition({
          plan: input.plan,
          payloadBytes: verified.payloadBytes,
          artifact: verified.artifact,
          verifierContextDigest: verified.verifierContextDigest,
        });
        return true;
      } catch {
        return false;
      }
    },
  });
  const result = await input.store.commitTransition(unit);
  if (result.status === "conflict" || result.status === "rejected" || result.status === "failed") return result;
  let accepted: Awaited<ReturnType<typeof resolveCanonicalStagedCandidate>>;
  try {
    accepted = await resolveCanonicalStagedCandidate(operation);
  } catch {
    return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };
  }
  const history = custody.successorCarriedHistoryHead !== null
    ? null
    : custody.successorCarriedHistory !== null
    ? await verifyReceizCarriedProofHistory({
        history: custody.successorCarriedHistory,
        artifactId: custody.admission.artifactId,
        registryDigest: custody.successorCarriedHistory.registryDigest,
        artifactDigest: accepted.verified.artifactDigest.value,
        verifierContextDigest: accepted.verified.verifierContextDigest,
      })
    : await issueReceizVerifiedArtifactTransitionHistory({
        predecessor: custody.verifiedHistory!,
        appendNode: accepted.appendNode,
        artifactDigest: accepted.verified.artifactDigest.value,
        verifierContextDigest: accepted.verified.verifierContextDigest,
      });
  const proofHistoryHead = custody.successorCarriedHistoryHead;
  if (proofHistoryHead
    ? proofHistoryHead.headDigest !== input.plan.transition.proposedHistoryHead.value
    : history === null || history.headDigests.length !== 1
      || history.headDigests[0] !== input.plan.transition.proposedHistoryHead.value) {
    return { status: "rejected", code: "TRANSITION_MISMATCH" };
  }
  if (!acceptedReceiptMatches(
    result.receipt,
    input.plan,
    capabilityDigest,
    accepted.verified.artifactDigest,
    commandDigest,
  )) return { status: "rejected", code: "TRANSITION_MISMATCH" };
  const receipt = snapshotReportedAppendReceipt(result.receipt);
  const committed = Object.freeze({
    status: "committed-artifact-transition",
    acceptance: result.status,
    artifact: accepted.verified.artifact,
    artifactDigest: accepted.verified.artifactDigest,
    history,
    proofHistoryHead,
    receipt,
    committed: true,
  });
  committedArtifactTransitionCustody.set(committed, Object.freeze({
    plan: input.plan,
    admission: custody.admission,
  }));
  return committed;
}
