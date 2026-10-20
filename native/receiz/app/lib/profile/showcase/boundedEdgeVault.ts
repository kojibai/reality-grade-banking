"use client";

import type { ProfileOriginal } from "@/app/lib/profile/types";
import {
  admitReceizLegacyProfileShowcaseMigrationWithInspectionContext,
  admitReceizProfileShowcaseCheckpointBundleV114,
  admitReceizProfileShowcaseCheckpointCarrierWithContextV114,
  admitReceizProfileShowcaseMergeWithExactParentContext,
  admitReceizProfileShowcaseSuccessorWithExactPredecessorContext,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114,
  canonicalizeReceizConstitution,
  createReceizArtifactAdmissionEngine,
  digestReceizCompositeCanonical,
  createReceizProfileShowcasePersistentMemoryStoreV114,
  deriveReceizProfileShowcasePersistentMembershipV114,
  extractReceizPortableAssetPayload,
  inspectReceizBoundedProfileShowcaseV114,
  inspectReceizLegacyProfileShowcaseV114,
  isSdkInspectedLegacyProfileShowcaseV114,
  isSdkVerifiedProfileShowcaseCheckpointV114,
  type ReceizBoundedProfileShowcaseCarrierV114,
  type ReceizInspectedLegacyProfileShowcaseV114,
  type ReceizVerifiedArtifactAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
  type ReceizVerifiedProfileShowcaseCheckpointV114,
  type ReceizProfileShowcasePersistentStateIOV114,
  type ReceizProfileShowcasePersistentNodeV114,
  type ReceizProfileShowcasePersistentPlacementV114,
  type ReceizProfileShowcasePersistentStateV114,
} from "../../../../packages/receiz-sdk/src/index";
import {
  admitReceizProfileShowcaseCheckpointBundleWithSourceActorBindingV114,
  type ReceizIdentityPublicBinding,
  readReceizBoundedProfileShowcaseInspectionCarrier,
  readReceizLegacyProfileShowcaseInspectionCustody,
  readReceizProfileShowcaseCheckpointCustodyV114,
  readReceizIdentityPublicBinding,
} from "../../../../packages/receiz-sdk/src/artifactAdmission";
import type {
  ReceizProfileShowcaseSegmentMechanicsV114,
} from "../../../../packages/receiz-sdk/src/compositeProofTransport";
import {
  createReceizProfileShowcaseCheckpointSegmentV114,
  verifyReceizProfileShowcaseCheckpointBundleV114,
} from "../../../../packages/receiz-sdk/src/compositeProofTransport";
import {
  verifyReceizArtifactWithCanonicalRoots,
  readRuntimeCustodiedReceizArtifactCanonicalOpen,
} from "../../../../packages/receiz-sdk/src/artifactVerification";
import {
  receizCurrentPinnedSignatureV4Roots,
} from "../../../../packages/receiz-sdk/src/verifier/roots";
import type {
  ReceizSignatureV4RootPublicKey,
} from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import {
  verifyProfileShowcaseMembership,
  verifyProfileShowcaseSegment,
} from "./segments";
import {
  COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
  decodeCompleteLegacyShowcaseMigrationPayload,
} from "./legacyMigrationPayload";
import type {
  ProfileShowcaseArtifactId,
  ProfileShowcaseChildKey,
  ProfileShowcaseChildReference,
  ProfileShowcaseCommittedSegment,
} from "./types";
import { replayInspectedProfileShowcaseLegacyMembership } from "./completeSourceLegacyMembership";
import { decodeProfileOriginalRouteProjectionAppend } from "./routeProjectionEncoding";
import { projectOwnerShowcaseOriginals } from "./ownerSourceProjection";
import { profileOriginalProofIdentityKey, originalHasSignedArtifactState } from "../pbiSignatureHistory";

const ACTIVE_STORE = "bounded-active-heads";
const HEAD_STORE = "bounded-immutable-heads";
const ARTIFACT_STORE = "bounded-immutable-artifacts";
const HISTORY_NODE_STORE = "bounded-immutable-history-nodes";
const CHILD_STORE = "bounded-immutable-children";
const ORIGINAL_CHILD_INDEX_STORE = "bounded-original-child-index";
const VISIBILITY_TRANSITION_STORE = "bounded-visibility-transitions";
const SEGMENT_STORE = "bounded-immutable-segments";
const CHECKPOINT_STORE = "bounded-immutable-checkpoints";
const CHECKPOINT_SEGMENT_INDEX_STORE = "bounded-checkpoint-segment-index";
const RECONCILIATION_OUTBOX_STORE = "bounded-reconciliation-outbox";
const PERSISTENT_NODE_STORE = "bounded-immutable-persistent-nodes";
const DATABASE_VERSION = 11;
const RETRIABLE_PUBLICATION_REJECTION_CODES = new Set([
  "PROFILE_SHOWCASE_PUBLICATION_SAME_ORIGIN_REQUIRED",
]);

export type ProfileShowcaseBoundedEdgeChild = Readonly<{
  reference: ProfileShowcaseChildReference;
  admittedArtifact: ReceizVerifiedArtifactAdmission;
}>;

/**
 * Admission requires existing SDK-custodied proof objects. Caller-authored
 * bytes, digests, carriers, and authority literals are deliberately absent.
 */
export type ProfileShowcaseBoundedEdgeAdmission = Readonly<{
  sourceProvenance?: readonly Readonly<{ operationDigest: string; sourceArtifactDigest: string }>[];
  showcaseAdmission: ReceizVerifiedProfileShowcaseAdmission;
  children: readonly ProfileShowcaseBoundedEdgeChild[];
  segments: readonly ProfileShowcaseCommittedSegment[];
  legacyPredecessorBoundary?: ReceizInspectedLegacyProfileShowcaseV114;
  checkpointBoundary?: ReceizVerifiedProfileShowcaseCheckpointV114;
  holdReplacementPresentation?: ProfileShowcaseChildKey;
  /** Immutable staging for an already verified bulk owner restore. */
  retainOnly?: boolean;
  /** SDK-admitted ancestry custody only; missing historical media cannot paint or activate. */
  retainHistoryOnly?: boolean;
}>;

type ReplacementPresentationHold = Readonly<{
  artifactDigest: string;
  intermediateArtifactDigest: string;
  replacedChild: ProfileShowcaseChildReference;
}>;

type ActiveRecord = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
  headKaiUpulse: string;
  replacementPresentationHold?: ReplacementPresentationHold;
}>;

export type ProfileShowcaseBoundedFirstPaint = Readonly<{
  artifactDigest: string;
  exactSealedArtifactBytes: Uint8Array;
  carrier: ReceizBoundedProfileShowcaseCarrierV114;
  visibleChildren: readonly Readonly<{
    reference: ProfileShowcaseChildReference;
    exactSealedArtifactBytes: Uint8Array;
    verifiedPayloadMimeType: string;
    verifiedPayloadBytes: Uint8Array;
    verifiedRouteProjectionBytes: Uint8Array | null;
  }>[];
  segments: readonly ProfileShowcaseCommittedSegment[];
}>;

export type ProfileShowcaseLegacyMigrationChild = Readonly<{
  reference: ProfileShowcaseChildReference;
  verifiedPayloadBytes: Uint8Array;
  originals: readonly ProfileOriginal[];
}>;

export type ProfileShowcaseCompleteSource = Readonly<{
  artifactDigest: string;
  exactSealedArtifactBytes: Uint8Array;
  carrier: ReceizBoundedProfileShowcaseCarrierV114;
  placements: readonly ReceizProfileShowcasePersistentPlacementV114[];
  witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
  legacyPredecessor?: Readonly<{ artifactDigest: string; exactSealedArtifactBytes: Uint8Array }>;
  /** Complete accepted membership; media/window realization remains separate. */
  children: ProfileShowcaseBoundedFirstPaint["visibleChildren"];
}>;

/** Retained bounded carrier bytes used only to verify causal ancestry.
 * No historical child bodies, identity artifacts, or owner recovery records.
 * The receiver must verify these bytes and their links before using them.
 */
export type ProfileShowcasePublicAncestryArtifact = Readonly<{
  artifactDigest: string;
  exactSealedArtifactBytes: Uint8Array;
}>;

/** Exact public proof material only; identity/actor source records never enter this type. */
export type ProfileShowcaseCompletePublicSource = Readonly<{
  /** Supplemental bounded ancestors; not independent publication candidates.
   * Optional for older producers. Checkpoint/legacy boundaries remain separate.
   */
  ancestry?: readonly ProfileShowcasePublicAncestryArtifact[];
  artifactDigest: string;
  exactSealedArtifactBytes: Uint8Array;
  witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
  legacyPredecessor?: Readonly<{
    artifactDigest: string;
    exactSealedArtifactBytes: Uint8Array;
  }>;
  checkpointBoundary?: Readonly<{
    artifactDigest: string;
    exactSealedArtifactBytes: Uint8Array;
    predecessor: Readonly<{
      artifactDigest: string;
      exactSealedArtifactBytes: Uint8Array;
    }>;
  }>;
  children: readonly Readonly<{
    reference: ProfileShowcaseChildReference;
    exactSealedArtifactBytes: Uint8Array;
  }>[];
}>;

/** Private owner inventory beneath exact enclosing Showcase sources. This is
 * unadmitted transport material, never an alternative admission or public body. */
export type ProfileShowcaseOwnerSource = ProfileShowcaseCompletePublicSource & Readonly<{
  sourceProvenance: readonly Readonly<{ artifactDigest: string; operationDigest: string; sourceArtifactDigest: string }>[];
  checkpointSegments: readonly Readonly<{ checkpointArtifactDigest: string; segmentIds: readonly string[] }>[];
  actorPublicBindings: readonly ReceizIdentityPublicBinding[];
  childReadContexts: readonly Readonly<{ artifactDigest: string; filename: string; mimeType: string }>[];
  history: readonly Readonly<{
    artifactDigest: string;
    filename: string;
    mimeType: string;
    exactSealedArtifactBytes: Uint8Array;
  }>[];
  historyNodes: readonly ReceizBoundedProfileShowcaseCarrierV114["receizProofHistory"]["currentNode"][];
  segments: readonly ProfileShowcaseCommittedSegment[];
}>;

export type ProfileShowcaseOriginalChildCustody = Readonly<{
  reference: ProfileShowcaseChildReference;
  exactSealedArtifactBytes: Uint8Array;
  verifiedPayloadBytes: Uint8Array;
  verifiedPayloadMimeType: string;
  verifiedRouteProjectionBytes: Uint8Array;
}>;

const publicSourceActorCustody = new WeakMap<object, Readonly<{
  actorId: string;
  roots: readonly string[];
  currentActorEvidenceRoots: readonly string[];
}>>();

/** Identity selection beneath an already admitted local source, not admission. */
export function readProfileShowcasePublicSourceActorCustody(source: ProfileShowcaseCompletePublicSource) {
  return publicSourceActorCustody.get(source) ?? null;
}

/** Retained export of admitted source, shared by publication and image transport.
 * This is a source handoff, never admission from a profile/count projection. */
export type HeldProfileShowcasePublicSource = Readonly<{
  source: ProfileShowcaseCompletePublicSource;
  complete: ProfileShowcaseCompleteSource;
  pulse: string;
}>;
const heldPublicSources = new Map<ProfileShowcaseArtifactId, HeldProfileShowcasePublicSource>();
const publicSourceListeners = new Set<(artifactId: ProfileShowcaseArtifactId) => void>();
export function peekHeldProfileShowcasePublicSource(artifactId: ProfileShowcaseArtifactId) {
  return heldPublicSources.get(artifactId) ?? null;
}
export function subscribeHeldProfileShowcasePublicSource(listener: (artifactId: ProfileShowcaseArtifactId) => void): () => void {
  publicSourceListeners.add(listener);
  return () => { publicSourceListeners.delete(listener); };
}

const boundedFirstPaintRuntimeCustody = new WeakSet<object>();
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
const visibilityTransitionRuntimeQuarantine =
  new Set<ProfileShowcaseArtifactId>();

export function peekProfileShowcaseVisibilityTransitionQuarantine(
  artifactId: ProfileShowcaseArtifactId,
): boolean {
  return visibilityTransitionRuntimeQuarantine.has(artifactId);
}

export function isRuntimeCustodiedProfileShowcaseBoundedFirstPaint(
  value: unknown,
): value is ProfileShowcaseBoundedFirstPaint {
  return Boolean(
    value
    && typeof value === "object"
    && boundedFirstPaintRuntimeCustody.has(value as object),
  );
}

type HeadRecord = Readonly<{
  artifactDigest: string;
  artifactId: ProfileShowcaseArtifactId;
  headKaiUpulse: string;
  /** Exact settled head count; absent only on pre-v123 durable records. */
  operationCount?: number;
  parentArtifactDigests: readonly string[];
  /** Read compatibility for exact v9 records only. */
  parentArtifactDigest?: string | null;
  historyNodeDigest: string;
  childArtifactDigests: readonly string[];
  segmentIds: readonly string[];
}>;

function exactHeadParentArtifactDigests(head: HeadRecord): readonly string[] {
  if (Array.isArray(head.parentArtifactDigests)) {
    return [...head.parentArtifactDigests];
  }
  return head.parentArtifactDigest ? [head.parentArtifactDigest] : [];
}

type ArtifactRecord = Readonly<{
  sourceProvenance?: ProfileShowcaseBoundedEdgeAdmission["sourceProvenance"];
  artifactDigest: string;
  exactSealedArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  ownerReceizIdentity: string;
}>;

type ChildRecord = Readonly<{
  artifactDigest: string;
  reference: ProfileShowcaseChildReference;
  exactSealedArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  ownerReceizIdentity: string;
  verifiedProjection: Readonly<{
    schema: "receiz.profile-showcase.verified-child-projection.v114";
    admissionEvidenceRoot: string;
    payloadMimeType: string;
    payloadSha256: string;
    payloadBytes: Uint8Array;
    routeProjectionSha256: string | null;
    routeProjectionBytes: Uint8Array | null;
    routeOriginalId: string | null;
    digest: string;
  }>;
}>;

type OriginalChildIndexRecord = Readonly<{
  indexKey: string;
  artifactId: ProfileShowcaseArtifactId;
  originalId: string;
  childArtifactDigest: string;
  reference: ProfileShowcaseChildReference;
}>;

type VisibilityTransitionRecord = Readonly<{
  transitionKey: string;
  artifactId: ProfileShowcaseArtifactId;
  originalId: string;
  showOnProfile: boolean;
  createdAtMs: number;
  acceptedArtifactDigest?: string;
}>;

export type ProfileShowcasePendingVisibilityTransition = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  originalId: string;
  showOnProfile: boolean;
  createdAtMs: number;
  acceptedArtifactDigest?: string;
}>;

type SegmentRecord = ProfileShowcaseCommittedSegment & Readonly<{ segmentId: string }>;
type CheckpointRecord = Readonly<{
  artifactDigest: string;
  checkpointArtifactDigest: string;
  predecessorArtifactDigest: string;
  checkpointHistoryNodeDigest: string;
  actorArtifactDigest: string;
  actorPublicBinding?: ReceizIdentityPublicBinding;
  verifiedProjection: Readonly<{
    schema: "receiz.profile-showcase.verified-checkpoint-projection.v114";
    artifactId: ProfileShowcaseArtifactId;
    ownerReceizIdentity: string;
    headKaiUpulse: string;
    operationCount: number;
    currentStateRoot: string;
    placementRoot: string;
    orderRoot: string;
    actorEvidenceRoot: string;
    historyObjectDigest: string;
    digest: string;
  }>;
  childArtifactDigests: readonly string[];
  archiveSegmentCount: number;
  maxLiveOperations: number;
  maxLiveSegments: number;
  maxLiveSegmentBytes: number;
}>;
type CheckpointSegmentIndexRecord = Readonly<{
  indexKey: string;
  checkpointArtifactDigest: string;
  segmentIndex: number;
  segmentId: string;
}>;

export type ProfileShowcaseBoundedReconciliationAttempt = Readonly<{
  attemptId: string;
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
  historyHeadDigest: string;
  headKaiUpulse: string;
  status: "network-pending" | "accepted" | "diverged" | "rejected";
  attempts: number;
  lastError: string | null;
  acceptedArtifactDigest: string | null;
  economyStatus: "pending" | "accepted";
  economyAttempts: number;
  economyLastError: string | null;
  acceptedEconomyArtifactDigest: string | null;
}>;

function withEconomyAttemptDefaults(
  attempt: ProfileShowcaseBoundedReconciliationAttempt,
): ProfileShowcaseBoundedReconciliationAttempt {
  return Object.freeze({
    ...attempt,
    economyStatus: attempt.economyStatus ?? "pending",
    economyAttempts: attempt.economyAttempts ?? 0,
    economyLastError: attempt.economyLastError ?? null,
    acceptedEconomyArtifactDigest:
      attempt.acceptedEconomyArtifactDigest ?? null,
  });
}

function reconciliationAttemptOrder(
  left: ProfileShowcaseBoundedReconciliationAttempt,
  right: ProfileShowcaseBoundedReconciliationAttempt,
): number {
  const leftKai = BigInt(left.headKaiUpulse);
  const rightKai = BigInt(right.headKaiUpulse);
  return leftKai < rightKai
    ? -1
    : leftKai > rightKai
      ? 1
      : left.artifactDigest.localeCompare(right.artifactDigest);
}

export type ProfileShowcaseBoundedEdgeVault = Readonly<{
  admit(input: ProfileShowcaseBoundedEdgeAdmission): Promise<Readonly<{
    status: "active" | "inactive";
    code: null | "PROFILE_SHOWCASE_BOUNDED_INACTIVE_CAUSAL_BRANCH";
  }>>;
  selectOwnerRestoreHead(admission: ReceizVerifiedProfileShowcaseAdmission, expectedCurrentArtifactDigest: string | null, isCurrent?: () => boolean, preservedSourceArtifactDigest?: string, boundedPublicRestore?: boolean): Promise<void>;
  reopenHead(
    artifactId: ProfileShowcaseArtifactId,
    retainedArtifactDigest?: string,
  ): Promise<ReceizVerifiedProfileShowcaseAdmission | null>;
  reopenRetainedChild(reference: ProfileShowcaseChildReference): Promise<ProfileShowcaseBoundedEdgeChild | null>;
  resolveRetainedSegment: import("../../../../packages/receiz-sdk/src/compositeProofTransport").ReceizProfileShowcaseRetainedSegmentResolverV114;
  resolveVerifiedHistoricalArtifactDigest(
    artifactId: ProfileShowcaseArtifactId,
    descendantArtifactDigest: string,
    operationCount: number,
  ): Promise<string | null>;
  createTransitionPersistentStateIO(artifactId: ProfileShowcaseArtifactId, predecessorArtifactDigest: string): Promise<ReceizProfileShowcasePersistentStateIOV114>;
  readFirstPaint(artifactId: ProfileShowcaseArtifactId): Promise<ProfileShowcaseBoundedFirstPaint | null>;
  readCompleteSource(artifactId: ProfileShowcaseArtifactId, retainedArtifactDigest?: string,
    options?: Readonly<{ retainedHiddenOnly?: boolean }>): Promise<ProfileShowcaseCompleteSource | null>;
  exportCompleteSource(artifactId: ProfileShowcaseArtifactId, ancestorArtifactDigest?: string): Promise<ProfileShowcaseCompletePublicSource | null>;
  exportOwnerSource(artifactId: ProfileShowcaseArtifactId, retainedArtifactDigest?: string): Promise<ProfileShowcaseOwnerSource | null>;
  readPublicationHead(artifactId: ProfileShowcaseArtifactId): Promise<Readonly<{ artifactId: ProfileShowcaseArtifactId; artifactDigest: string; headKaiUpulse: string; operationCount?: number }> | null>;
  isVerifiedPublicationAncestor(artifactId: ProfileShowcaseArtifactId, ancestorDigest: string, descendantDigest: string): Promise<boolean>;
  resolveOriginalChildReference(
    artifactId: ProfileShowcaseArtifactId,
    originalId: string,
  ): Promise<ProfileShowcaseChildReference | null>;
  resolveOriginalChildCustody(
    artifactId: ProfileShowcaseArtifactId,
    originalId: string,
  ): Promise<ProfileShowcaseOriginalChildCustody | null>;
  resolveLegacyMigrationChildForOriginal(
    artifactId: ProfileShowcaseArtifactId,
    originalId: string,
  ): Promise<ProfileShowcaseLegacyMigrationChild | null>;
  beginVisibilityTransition(input: Readonly<{
    artifactId: ProfileShowcaseArtifactId;
    originalId: string;
    showOnProfile: boolean;
  }>): Promise<void>;
  retainVisibilityPropagationIntent(input: Readonly<{
    artifactId: ProfileShowcaseArtifactId;
    originalId: string;
    showOnProfile: boolean;
    acceptedSource: ProfileShowcaseBoundedFirstPaint;
    expectedIntent?: ProfileShowcasePendingVisibilityTransition | null;
  }>): Promise<void>;
  clearVisibilityTransition(
    artifactId: ProfileShowcaseArtifactId,
    originalId: string,
  ): Promise<void>;
  pendingVisibilityTransitions(
    artifactId?: ProfileShowcaseArtifactId,
  ): Promise<readonly ProfileShowcasePendingVisibilityTransition[]>;
  pendingReconciliationAttempts(): Promise<readonly ProfileShowcaseBoundedReconciliationAttempt[]>;
  pendingEconomyAppendAttempts(): Promise<readonly ProfileShowcaseBoundedReconciliationAttempt[]>;
  reconciliationAttempt(
    attemptId: string,
  ): Promise<ProfileShowcaseBoundedReconciliationAttempt | null>;
  recordReconciliationResult(input: Readonly<{
    attemptId: string;
    status: "network-pending" | "accepted" | "diverged" | "rejected";
    acceptedArtifactDigest: string | null;
    lastError: string | null;
  }>): Promise<ProfileShowcaseBoundedReconciliationAttempt>;
  recordEconomyAppendResult(input: Readonly<{
    attemptId: string;
    status: "pending" | "accepted";
    acceptedEconomyArtifactDigest: string | null;
    lastError: string | null;
  }>): Promise<ProfileShowcaseBoundedReconciliationAttempt>;
  recoverSegment(
    artifactDigest: string,
    segmentId: string,
  ): Promise<Readonly<{
    operations: ProfileShowcaseCommittedSegment["operations"];
    readOperations: number;
  }>>;
  inspect(artifactDigest: string): Promise<Readonly<{
    headReferenceBytes: number;
    segmentReferenceBytes: number;
    exactArtifactBytes: number;
    checkpointBundleBytes: number;
    immutableChildBytes: number;
    immutableSegmentBytes: number;
    immutableArchiveSegmentBytes: number;
    maxLiveOperations: number;
    maxLiveSegments: number;
    maxLiveSegmentBytes: number;
    actualReadRequestsByStore: Readonly<Record<string, number>>;
    actualWriteRequestsByStore: Readonly<Record<string, number>>;
    serializedRecordBytes: number;
    historyNodeObjectCount: number;
    cumulativeArrayKeys: readonly string[];
    foregroundChildArtifactReopens: number;
    foregroundChildAdmissionProjectionReads: number;
    readOperations: number;
    writeOperations: number;
  }>>;
}>;

export type ProfileShowcaseCheckpointSegmentArchive = Readonly<{
  writeSegment(
    segmentIndex: number,
    segment: ReceizProfileShowcaseSegmentMechanicsV114,
  ): Promise<void>;
  resolveSegment(
    segmentIndex: number,
  ): Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;
}>;

export type ProfileShowcaseCheckpointContentStore = Readonly<{
  put(segment: ReceizProfileShowcaseSegmentMechanicsV114): Promise<void>;
  get(segmentId: string): Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;
}>;

export type ProfileShowcaseCheckpointChildContentStore = Readonly<{
  getByEvidenceRoot(evidenceRoot: string): Promise<Readonly<{
    reference: ProfileShowcaseChildReference;
    exactSealedArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    ownerReceizIdentity: string;
  }> | null>;
}>;

function requestResult<T>(request: IDBRequest<T>, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(code));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error("PROFILE_SHOWCASE_BOUNDED_ACTIVE_CAUSAL_CONFLICT"),
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error("PROFILE_SHOWCASE_BOUNDED_EDGE_TRANSACTION_FAILED"),
    );
  });
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      for (const [store, keyPath] of [
        [ACTIVE_STORE, "artifactId"],
        [HEAD_STORE, "artifactDigest"],
        [ARTIFACT_STORE, "artifactDigest"],
        [HISTORY_NODE_STORE, "nodeDigest"],
        [CHILD_STORE, "artifactDigest"],
        [ORIGINAL_CHILD_INDEX_STORE, "indexKey"],
        [VISIBILITY_TRANSITION_STORE, "transitionKey"],
        [SEGMENT_STORE, "segmentId"],
        [CHECKPOINT_STORE, "artifactDigest"],
        [CHECKPOINT_SEGMENT_INDEX_STORE, "indexKey"],
        [RECONCILIATION_OUTBOX_STORE, "attemptId"],
        [PERSISTENT_NODE_STORE, "digest"],
      ] as const) {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store, { keyPath });
        }
      }
      const visibilityStore =
        request.transaction!.objectStore(VISIBILITY_TRANSITION_STORE);
      if (!visibilityStore.indexNames.contains("artifactId")) {
        visibilityStore.createIndex("artifactId", "artifactId", {
          unique: false,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error ?? new Error("PROFILE_SHOWCASE_BOUNDED_EDGE_OPEN_FAILED"),
    );
  });
}

export function createProfileShowcaseCheckpointSegmentArchive(options: Readonly<{
  indexedDB: IDBFactory;
  databaseName: string;
  archiveId: string;
}>): ProfileShowcaseCheckpointSegmentArchive {
  const database = openDatabase(options.indexedDB, options.databaseName);
  const indexKey = (segmentIndex: number) =>
    `staged:${options.archiveId}:${segmentIndex}`;
  return Object.freeze({
    async writeSegment(segmentIndex, segment) {
      if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0) {
        throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_INDEX_INVALID");
      }
      const db = await database;
      const transaction = db.transaction(
        [SEGMENT_STORE, CHECKPOINT_SEGMENT_INDEX_STORE],
        "readwrite",
      );
      transaction.objectStore(SEGMENT_STORE).put(checkpointSegmentRecord(segment));
      transaction.objectStore(CHECKPOINT_SEGMENT_INDEX_STORE).put({
        indexKey: indexKey(segmentIndex),
        checkpointArtifactDigest: options.archiveId,
        segmentIndex,
        segmentId: segment.commitment.segmentId,
      } satisfies CheckpointSegmentIndexRecord);
      await transactionComplete(transaction);
    },
    async resolveSegment(segmentIndex) {
      if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0) return null;
      const db = await database;
      const indexTransaction = db.transaction(
        CHECKPOINT_SEGMENT_INDEX_STORE,
        "readonly",
      );
      const indexRecord = await requestResult(
        indexTransaction.objectStore(CHECKPOINT_SEGMENT_INDEX_STORE)
          .get(indexKey(segmentIndex)),
        "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_INDEX_MISSING",
      ) as CheckpointSegmentIndexRecord | undefined;
      if (!indexRecord || indexRecord.segmentIndex !== segmentIndex) return null;
      const segmentTransaction = db.transaction(SEGMENT_STORE, "readonly");
      const segment = await requestResult(
        segmentTransaction.objectStore(SEGMENT_STORE).get(indexRecord.segmentId),
        "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING",
      ) as SegmentRecord | undefined;
      return segment ? checkpointSegmentMechanics(segment) : null;
    },
  });
}

async function admittedArtifactRecord(
  admission: ReceizVerifiedArtifactAdmission,
): Promise<Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  ownerReceizIdentity: string;
}>> {
  if (!admission.ownerReceizId || !admission.openedArtifact) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ARTIFACT_CUSTODY_REQUIRED");
  }
  return Object.freeze({
    exactSealedArtifactBytes: new Uint8Array(
      await admission.openedArtifact.sealedArtifact.artifact.arrayBuffer(),
    ),
    filename: admission.openedArtifact.sealedArtifact.filename,
    mimeType: admission.openedArtifact.sealedArtifact.mimeType,
    ownerReceizIdentity: admission.ownerReceizId,
  });
}

async function reopenWithRoots(input: Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  ownerReceizIdentity: string;
  profile: "profile-showcase" | "portable-state";
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizVerifiedArtifactAdmission | null> {
  const blob = new File(
    [input.exactSealedArtifactBytes.slice()],
    input.filename,
    { type: input.mimeType },
  );
  const verification = await verifyReceizArtifactWithCanonicalRoots(blob, input.roots);
  const admission = await createReceizArtifactAdmissionEngine({
    canonicalSignatureV4RootPublicKeys: input.roots,
  })(verification, {
    profile: input.profile,
    ownerConstraint: input.ownerReceizIdentity,
  });
  return admission.profile === input.profile && "openedArtifact" in admission
    ? admission
    : null;
}

function exactArtifactFile(input: Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): File {
  return new File(
    [input.exactSealedArtifactBytes.slice()],
    input.filename,
    { type: input.mimeType },
  );
}

function checkpointSegmentRecord(
  segment: ReceizProfileShowcaseSegmentMechanicsV114,
): SegmentRecord {
  return {
    segmentId: segment.commitment.segmentId,
    schema: segment.schema,
    commitment: {
      ...segment.commitment,
      authority: segment.authority,
    },
    bytes: segment.bytes.slice(),
    operations: structuredClone(segment.operations) as unknown as
      readonly import("../../../../packages/receiz-sdk/src/constitution").ReceizConstitutionJson[],
    membershipWitnesses: structuredClone(segment.membershipWitnesses),
    authority: segment.authority,
  } as SegmentRecord;
}

function checkpointSegmentMechanics(
  segment: SegmentRecord,
): ReceizProfileShowcaseSegmentMechanicsV114 {
  return {
    schema: segment.schema,
    commitment: {
      segmentId: segment.commitment.segmentId,
      startOperationCount: segment.commitment.startOperationCount,
      endOperationCount: segment.commitment.endOperationCount,
      operationCount: segment.commitment.operationCount,
      root: segment.commitment.root,
    },
    bytes: segment.bytes.slice(),
    operations: structuredClone(segment.operations) as unknown as
      ReceizProfileShowcaseSegmentMechanicsV114["operations"],
    segmentBytesDigest: segment.membershipWitnesses[0]?.segmentBytesDigest ?? "",
    witnesses: structuredClone(segment.membershipWitnesses),
    membershipWitnesses: structuredClone(segment.membershipWitnesses),
    authority: segment.authority,
  };
}

async function verifyStoredSegment(segment: SegmentRecord): Promise<boolean> {
  if (await verifyProfileShowcaseSegment(segment)) return true;
  try {
    const rebuilt = await createReceizProfileShowcaseCheckpointSegmentV114({
      operations: segment.operations as unknown as
        ReceizProfileShowcaseSegmentMechanicsV114["operations"],
      startOperationCount: segment.commitment.startOperationCount,
    });
    return canonicalizeReceizConstitution({
      schema: rebuilt.schema,
      commitment: rebuilt.commitment,
      operations: rebuilt.operations,
      membershipWitnesses: rebuilt.membershipWitnesses,
      authority: rebuilt.authority,
    } as unknown as never) === canonicalizeReceizConstitution({
      schema: segment.schema,
      commitment: {
        segmentId: segment.commitment.segmentId,
        startOperationCount: segment.commitment.startOperationCount,
        endOperationCount: segment.commitment.endOperationCount,
        operationCount: segment.commitment.operationCount,
        root: segment.commitment.root,
      },
      operations: segment.operations,
      membershipWitnesses: segment.membershipWitnesses,
      authority: segment.authority,
    } as unknown as never)
      && rebuilt.bytes.length === segment.bytes.length
      && rebuilt.bytes.every((byte, index) => byte === segment.bytes[index]);
  } catch {
    return false;
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = bytes.slice();
  const result = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(result)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function exactChildReference(
  reference: ProfileShowcaseChildReference,
  admission: ReceizVerifiedArtifactAdmission,
): boolean {
  return reference.stableChildArtifactId === admission.artifactId
    && reference.childArtifactDigest === admission.artifactSha256
    && reference.contentDigest === admission.payloadSha256;
}

function sameSealedChildReference(
  left: ProfileShowcaseChildReference,
  right: ProfileShowcaseChildReference,
): boolean {
  return left.stableChildArtifactId === right.stableChildArtifactId
    && left.immutableVersion === right.immutableVersion
    && left.childArtifactDigest === right.childArtifactDigest
    && left.admissionEvidenceRoot === right.admissionEvidenceRoot
    && left.contentDigest === right.contentDigest;
}

function verifiedChildProjectionDigest(input: Readonly<{
  artifactDigest: string;
  reference: ProfileShowcaseChildReference;
  admissionEvidenceRoot: string;
  payloadMimeType: string;
  payloadSha256: string;
  routeProjectionSha256?: string | null;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.verified-child-projection.v114",
    schema: "receiz.profile-showcase.verified-child-projection.v114",
    artifactDigest: input.artifactDigest,
    reference: input.reference as unknown as never,
    admissionEvidenceRoot: input.admissionEvidenceRoot,
    payloadMimeType: input.payloadMimeType,
    payloadSha256: input.payloadSha256,
    ...(input.routeProjectionSha256
      ? { routeProjectionSha256: input.routeProjectionSha256 }
      : {}),
  });
}

function verifiedCheckpointProjectionDigest(input: Readonly<{
  artifactDigest: string;
  checkpointArtifactDigest: string;
  predecessorArtifactDigest: string;
  checkpointHistoryNodeDigest: string;
  actorArtifactDigest: string;
  artifactId: ProfileShowcaseArtifactId;
  ownerReceizIdentity: string;
  headKaiUpulse: string;
  operationCount: number;
  currentStateRoot: string;
  placementRoot: string;
  orderRoot: string;
  actorEvidenceRoot: string;
  historyObjectDigest: string;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.verified-checkpoint-projection.v114",
    schema: "receiz.profile-showcase.verified-checkpoint-projection.v114",
    ...input,
  });
}

function checkpointHistoryObjectDigest(
  node: Readonly<Record<string, unknown>>,
): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.verified-checkpoint-history-object.v114",
    node: node as unknown as never,
  });
}

function cumulativeArrayKeys(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => cumulativeArrayKeys(item, `${path}[${index}]`));
  }
  const forbidden = new Set([
    "placements",
    "membershipHistory",
    "sealedOperations",
    "segments",
    "proofHistoryEvidenceRoots",
    "nodes",
    "admittedChildren",
  ]);
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(forbidden.has(key) && Array.isArray(child) ? [`${path}.${key}`] : []),
    ...cumulativeArrayKeys(child, path ? `${path}.${key}` : key),
  ]);
}

export function createProfileShowcaseBoundedEdgeVault(options: Readonly<{
  indexedDB?: IDBFactory;
  databaseName?: string;
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  resolveVisibilityIdentityCustody?: typeof import("./composerIdentityCustodyResolver").resolveComposerIdentityCustody;
  resolveVerifiedCheckpointActorEvidence?: (
    artifactDigest: string,
  ) => Promise<unknown>;
  checkpointContentStore?: ProfileShowcaseCheckpointContentStore;
  checkpointChildContentStore?: ProfileShowcaseCheckpointChildContentStore;
  checkpointPersistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
}> = {}): ProfileShowcaseBoundedEdgeVault {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) throw new Error("PROFILE_SHOWCASE_BOUNDED_EDGE_INDEXEDDB_UNAVAILABLE");
  const database = openDatabase(
    factory,
    options.databaseName ?? "receiz-profile-showcase-bounded-edge-v114",
  );
  const roots = new Map(
    options.canonicalSignatureV4RootPublicKeys
      ?? receizCurrentPinnedSignatureV4Roots(),
  );
  type RequestCounts = {
    reads: Record<string, number>;
    writes: Record<string, number>;
  };
  const requestCounts = new Map<string, RequestCounts>();
  const foregroundChildArtifactReopens = new Map<string, number>();
  const foregroundChildAdmissionProjectionReads = new Map<string, number>();
  const verifiedHistoricalOperationCounts = new Map<string, number>();
  const verifiedHistoricalParents = new Map<string, Promise<readonly string[] | null>>();
  type VerifiedHistoricalIndex = Readonly<{
    byOperationCount: Map<number, string | null>;
    unresolvedDigests: readonly string[];
    checkpointAncestors: readonly Readonly<{ artifactDigest: string; operationCount: number }>[];
  }>;
  const verifiedHistoricalIndexes = new Map<
    string,
    Promise<VerifiedHistoricalIndex | null>
  >();
  const verifiedHistoricalLookups = new Map<string, Promise<string | null>>();
  const checkpointSources = new Map<string, ReturnType<typeof readReceizProfileShowcaseCheckpointCustodyV114>>();
  const completeLegacyActorRoots = new Map<string, readonly string[]>();
  const completeSources = new Map<string, Promise<ProfileShowcaseCompleteSource>>();
  // Only canonical child projection can enter this runtime custody. A stored
  // projection digest is an integrity check, not evidence of that admission.
  const canonicalChildSources = new Map<string, ChildRecord>();
  const canonicalChildAdmissions = new Map<string, ProfileShowcaseBoundedEdgeChild>();
  const childSourceKey = (reference: ProfileShowcaseChildReference) =>
    canonicalizeReceizConstitution(reference as never);
  const noteRequest = (
    digest: string,
    mode: "reads" | "writes",
    store: string,
  ) => {
    const counts = requestCounts.get(digest) ?? { reads: {}, writes: {} };
    counts[mode][store] = (counts[mode][store] ?? 0) + 1;
    requestCounts.set(digest, counts);
  };

  const readObject = async <T>(
    store: string,
    key: string,
    code: string,
    accountingDigest?: string,
  ): Promise<T | null> => {
    if (accountingDigest) noteRequest(accountingDigest, "reads", store);
    const db = await database;
    const transaction = db.transaction(store, "readonly");
    return await requestResult(transaction.objectStore(store).get(key), code) as T | undefined ?? null;
  };

  const readVerifiedHistoricalParents = (artifactId: ProfileShowcaseArtifactId, digest: string) => {
    const key = `${artifactId}:${digest}`;
    const retained = verifiedHistoricalParents.get(key);
    if (retained) return retained;
    // Inspect the exact enclosing sealed carrier, without recursively admitting
    // its successor or asking the index currently being constructed.
    const pending = (async (): Promise<readonly string[] | null> => {
      const artifact = await readObject<ArtifactRecord>(ARTIFACT_STORE, digest, "PROFILE_SHOWCASE_BOUNDED_HISTORICAL_ARTIFACT_MISSING");
      if (!artifact || artifact.ownerReceizIdentity !== artifactId.slice("profile-showcase:".length)
        || await sha256(artifact.exactSealedArtifactBytes) !== digest) return null;
      const verification = await verifyReceizArtifactWithCanonicalRoots(exactArtifactFile(artifact), roots);
      const inspection = await inspectReceizBoundedProfileShowcaseV114({ verification,
        ownerConstraint: artifact.ownerReceizIdentity, dependencies: { canonicalSignatureV4RootPublicKeys: roots } });
      const carrier = readReceizBoundedProfileShowcaseInspectionCarrier(inspection);
      if (inspection.artifactSha256 !== digest || carrier.artifactId !== artifactId) return null;
      return Object.freeze((carrier["profile-showcase"].parentHeads as readonly { artifactDigest: string }[]).map(parent => parent.artifactDigest).sort());
    })().catch(() => { verifiedHistoricalParents.delete(key); return null; });
    verifiedHistoricalParents.set(key, pending);
    return pending;
  };

  const buildVerifiedHistoricalIndex = async (
    artifactId: ProfileShowcaseArtifactId,
    descendantArtifactDigest: string,
  ): Promise<VerifiedHistoricalIndex | null> => {
    const db = await database;
    const storedHeads = await requestResult(
      db.transaction(HEAD_STORE, "readonly").objectStore(HEAD_STORE).getAll(),
      "PROFILE_SHOWCASE_BOUNDED_HISTORICAL_HEAD_READ_FAILED",
    ) as HeadRecord[];
    const byDigest = new Map(
      storedHeads
        .filter((head) => head.artifactId === artifactId)
        .map((head) => [head.artifactDigest, head]),
    );
    if (!byDigest.has(descendantArtifactDigest)) return null;

    const ancestors = new Set<string>();
    const checkpointAncestors: Array<Readonly<{ artifactDigest: string; operationCount: number }>> = [];
    const queue = [descendantArtifactDigest];
    while (queue.length > 0) {
      const digest = queue.pop()!;
      if (ancestors.has(digest)) continue;
      const head = byDigest.get(digest);
      if (!head) return null;
      ancestors.add(digest);
      const checkpoint = await readObject<CheckpointRecord>(CHECKPOINT_STORE, digest, "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING");
      if (checkpoint) {
        // The enclosing accepted carrier binds this exact sealed checkpoint.
        // Its complete history is one source, including counts between the
        // sparse Fibonacci references; never invent per-count artifacts.
        const source = await readVerifiedSourceProjection(artifactId, digest, undefined, true);
        const parents = source?.carrier["profile-showcase"].parentHeads as readonly Record<string, unknown>[] | undefined;
        if (!source || parents?.length !== 1 || parents[0]?.artifactDigest !== checkpoint.checkpointArtifactDigest
          || parents[0]?.historyHeadDigest !== checkpoint.checkpointHistoryNodeDigest
          || !Number.isSafeInteger(parents[0]?.operationCount) || Number(parents[0]?.operationCount) < 1) return null;
        checkpointAncestors.push({ artifactDigest: checkpoint.checkpointArtifactDigest, operationCount: Number(parents[0].operationCount) });
      } else queue.push(...exactHeadParentArtifactDigests(head));
    }

    if (checkpointAncestors.length > 0) {
      for (const digest of ancestors) {
        const sealedParents = await readVerifiedHistoricalParents(artifactId, digest);
        const indexedParents = [...exactHeadParentArtifactDigests(byDigest.get(digest)!)].sort();
        if (!sealedParents || canonicalizeReceizConstitution(sealedParents as never)
          !== canonicalizeReceizConstitution(indexedParents as never)) return null;
      }
    }

    const byOperationCount = new Map<number, string | null>();
    const unresolvedDigests: string[] = [];
    for (const digest of ancestors) {
      const head = byDigest.get(digest)!;
      const retainedCount = verifiedHistoricalOperationCounts.get(digest);
      const operationCount = retainedCount ?? head.operationCount;
      if (operationCount === undefined) {
        unresolvedDigests.push(digest);
        continue;
      }
      byOperationCount.set(
        operationCount,
        byOperationCount.has(operationCount) ? null : digest,
      );
    }
    return Object.freeze({
      byOperationCount,
      unresolvedDigests: Object.freeze(unresolvedDigests),
      checkpointAncestors: Object.freeze(checkpointAncestors),
    });
  };

  const verifiedHistoricalIndex = (
    artifactId: ProfileShowcaseArtifactId,
    descendantArtifactDigest: string,
  ): Promise<VerifiedHistoricalIndex | null> => {
    const key = `${artifactId}:${descendantArtifactDigest}`;
    const retained = verifiedHistoricalIndexes.get(key);
    if (retained) return retained;
    const pending = buildVerifiedHistoricalIndex(
      artifactId,
      descendantArtifactDigest,
    ).catch((error) => {
      verifiedHistoricalIndexes.delete(key);
      throw error;
    });
    verifiedHistoricalIndexes.set(key, pending);
    return pending;
  };

  const verifyHistoricalDigestAtOperationCount = async (
    artifactId: ProfileShowcaseArtifactId,
    descendantArtifactDigest: string,
    digest: string,
    operationCount: number,
  ): Promise<string | null> => {
    const artifact = await readObject<ArtifactRecord>(
      ARTIFACT_STORE,
      digest,
      "PROFILE_SHOWCASE_BOUNDED_HISTORICAL_ARTIFACT_MISSING",
      descendantArtifactDigest,
    );
    const ownerReceizIdentity = artifactId.slice("profile-showcase:".length);
    if (!artifact || artifact.ownerReceizIdentity !== ownerReceizIdentity) {
      return null;
    }
    try {
      const verification = await verifyReceizArtifactWithCanonicalRoots(
        exactArtifactFile(artifact),
        roots,
      );
      const inspection = await inspectReceizBoundedProfileShowcaseV114({
        verification,
        ownerConstraint: artifact.ownerReceizIdentity,
        dependencies: { canonicalSignatureV4RootPublicKeys: roots },
      });
      const carrier = readReceizBoundedProfileShowcaseInspectionCarrier(
        inspection,
      );
      const verifiedCount = carrier["profile-showcase"]
        .resultingOperationCount as number;
      if (
        inspection.artifactSha256 !== digest
        || carrier.artifactId !== artifactId
        || !Number.isSafeInteger(verifiedCount)
        || verifiedCount < 0
      ) return null;
      verifiedHistoricalOperationCounts.set(digest, verifiedCount);
      return verifiedCount === operationCount ? digest : null;
    } catch {
      return null;
    }
  };

  const resolveFromVerifiedHistoricalIndex = async (
    artifactId: ProfileShowcaseArtifactId,
    descendantArtifactDigest: string,
    operationCount: number,
  ): Promise<string | null> => {
    const index = await verifiedHistoricalIndex(
      artifactId,
      descendantArtifactDigest,
    );
    if (!index) return null;
    const indexed = index.byOperationCount.get(operationCount);
    if (indexed === null) return null;
    if (indexed !== undefined) {
      return verifyHistoricalDigestAtOperationCount(
        artifactId,
        descendantArtifactDigest,
        indexed,
        operationCount,
      );
    }
    let match: string | null = null;
    for (const digest of index.unresolvedDigests) {
      const verified = await verifyHistoricalDigestAtOperationCount(
        artifactId,
        descendantArtifactDigest,
        digest,
        operationCount,
      );
      if (!verified) continue;
      if (match !== null) return null;
      match = verified;
    }
    if (match !== null) return match;
    const checkpointMatches = new Set(index.checkpointAncestors
      .filter(checkpoint => operationCount > 0 && operationCount <= checkpoint.operationCount)
      .map(checkpoint => checkpoint.artifactDigest));
    return checkpointMatches.size === 1 ? [...checkpointMatches][0]! : null;
  };

  const admitExactStoredMergeHead = async (input: Readonly<{
    head: HeadRecord;
    candidateArtifact: Blob;
    carrier: ReceizBoundedProfileShowcaseCarrierV114;
    accountingDigest: string;
  }>): Promise<ReceizVerifiedProfileShowcaseAdmission | null> => {
    const parentDigests = exactHeadParentArtifactDigests(input.head);
    if (parentDigests.length !== 2) return null;
    const parentRefs = input.carrier.receizProofHistory.parentRefs;
    const parents = await Promise.all(parentDigests.map(async (artifactDigest) => {
      const historyRef = parentRefs.find((reference) =>
        reference.artifactDigest === artifactDigest);
      if (!historyRef) return null;
      const [artifact, head, historyNode] = await Promise.all([
        readObject<ArtifactRecord>(
          ARTIFACT_STORE,
          artifactDigest,
          "PROFILE_SHOWCASE_BOUNDED_MERGE_PARENT_ARTIFACT_MISSING",
          input.accountingDigest,
        ),
        readObject<HeadRecord>(
          HEAD_STORE,
          artifactDigest,
          "PROFILE_SHOWCASE_BOUNDED_MERGE_PARENT_HEAD_MISSING",
          input.accountingDigest,
        ),
        readObject<Record<string, unknown>>(
          HISTORY_NODE_STORE,
          historyRef.nodeDigest,
          "PROFILE_SHOWCASE_BOUNDED_MERGE_PARENT_HISTORY_MISSING",
          input.accountingDigest,
        ),
      ]);
      if (
        !artifact
        || !head
        || !historyNode
        || head.historyNodeDigest !== historyRef.nodeDigest
      ) return null;
      return { artifactDigest, artifact, head, historyNode };
    }));
    if (parents.some((parent) => parent === null)) return null;
    const verifiedParents = [parents[0]!, parents[1]!] as const;
    const commonDigests = exactHeadParentArtifactDigests(verifiedParents[0].head)
      .filter((digest) =>
        exactHeadParentArtifactDigests(verifiedParents[1].head).includes(digest));
    if (commonDigests.length !== 1) return null;
    const commonArtifact = await readObject<ArtifactRecord>(
      ARTIFACT_STORE,
      commonDigests[0]!,
      "PROFILE_SHOWCASE_BOUNDED_MERGE_COMMON_ARTIFACT_MISSING",
      input.accountingDigest,
    );
    if (!commonArtifact) return null;
    return admitReceizProfileShowcaseMergeWithExactParentContext({
      commonPredecessorArtifact: exactArtifactFile(commonArtifact),
      parentArtifacts: [
        exactArtifactFile(verifiedParents[0].artifact),
        exactArtifactFile(verifiedParents[1].artifact),
      ],
      parentHistoryNodes: [
        verifiedParents[0].historyNode,
        verifiedParents[1].historyNode,
      ],
      resolveVerifiedHistoricalArtifactDigest: count => resolveFromVerifiedHistoricalIndex(input.head.artifactId, commonDigests[0]!, count),
      candidateArtifact: input.candidateArtifact,
      canonicalSignatureV4RootPublicKeys: roots,
    });
  };

  // Visibility intent quarantines presentation only. The exact verified
  // predecessor remains available to authorize its own sealed successor.
  async function readVerifiedSourceProjection(
    artifactId: ProfileShowcaseArtifactId,
    retainedArtifactDigest?: string,
    knownActivePointer?: ActiveRecord,
    repairChildProjections = false,
  ): Promise<ProfileShowcaseBoundedFirstPaint | null> {
      const activePointer = knownActivePointer ?? await readObject<ActiveRecord>(
        ACTIVE_STORE,
        artifactId,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_ACTIVE_READ_FAILED",
      );
      if (!activePointer) return null;
      const active = retainedArtifactDigest ? { ...activePointer, artifactDigest: retainedArtifactDigest } : activePointer;
      noteRequest(active.artifactDigest, "reads", ACTIVE_STORE);
      const head = await readObject<HeadRecord>(
        HEAD_STORE,
        active.artifactDigest,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED",
        active.artifactDigest,
      );
      const artifact = await readObject<ArtifactRecord>(
        ARTIFACT_STORE,
        active.artifactDigest,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_ARTIFACT_READ_FAILED",
        active.artifactDigest,
      );
      if (!head || !artifact) return null;
      let carrier: ReceizBoundedProfileShowcaseCarrierV114;
      try {
        if (await sha256(artifact.exactSealedArtifactBytes) !== artifact.artifactDigest) return null;
        const exactCandidateArtifact = exactArtifactFile(artifact);
        const verification = await verifyReceizArtifactWithCanonicalRoots(
          exactCandidateArtifact,
          roots,
        );
        const inspection = await inspectReceizBoundedProfileShowcaseV114({
          verification,
          ownerConstraint: artifact.ownerReceizIdentity,
          dependencies: { canonicalSignatureV4RootPublicKeys: roots },
        });
        carrier = readReceizBoundedProfileShowcaseInspectionCarrier(inspection);
        const parentReferences =
          carrier["profile-showcase"].parentHeads as readonly Record<string, unknown>[];
        const storedParentDigests = exactHeadParentArtifactDigests(head);
        const parentReference = parentReferences[0];
        let admittedDigest: string | null = null;
        if (parentReferences.length === 0 && storedParentDigests.length === 0) {
          const genesisAdmission = await createReceizArtifactAdmissionEngine({
            canonicalSignatureV4RootPublicKeys: roots,
          })(verification, {
            profile: "profile-showcase",
            ownerConstraint: artifact.ownerReceizIdentity,
          });
          admittedDigest = genesisAdmission.profile === "profile-showcase"
            && "openedArtifact" in genesisAdmission
            ? genesisAdmission.artifactSha256
            : null;
        } else if (parentReferences.length === 2 && storedParentDigests.length === 2) {
          const merged = await admitExactStoredMergeHead({
            head,
            candidateArtifact: exactCandidateArtifact,
            carrier,
            accountingDigest: active.artifactDigest,
          });
          admittedDigest = merged?.artifactSha256 ?? null;
        } else if (parentReference && parentReferences.length === 1
          && storedParentDigests.length === 1) {
          const parentDigest = parentReference.artifactDigest as string;
          const historyParent = carrier.receizProofHistory.parentRefs[0];
          const [predecessorArtifact, predecessorHead, predecessorHistoryNode] =
            await Promise.all([
              readObject<ArtifactRecord>(
                ARTIFACT_STORE,
                parentDigest,
                "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_ARTIFACT_MISSING",
                active.artifactDigest,
              ),
              readObject<HeadRecord>(
                HEAD_STORE,
                parentDigest,
                "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_HEAD_MISSING",
                active.artifactDigest,
              ),
              historyParent
                ? readObject<Record<string, unknown>>(
                    HISTORY_NODE_STORE,
                    historyParent.nodeDigest,
                    "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_HISTORY_MISSING",
                    active.artifactDigest,
                  )
                : Promise.resolve(null),
            ]);
          if (
            !predecessorArtifact
            || !predecessorHistoryNode
            || !historyParent
            || await sha256(predecessorArtifact.exactSealedArtifactBytes) !== parentDigest
          ) return null;
          if (predecessorHead) {
            if (predecessorHead.historyNodeDigest !== historyParent.nodeDigest) return null;
            const successor =
              await admitReceizProfileShowcaseSuccessorWithExactPredecessorContext({
              predecessorArtifact: exactArtifactFile(predecessorArtifact),
              candidateArtifact: exactCandidateArtifact,
              predecessorHistoryNode,
              resolveVerifiedHistoricalArtifactDigest: count => resolveFromVerifiedHistoricalIndex(artifactId, parentDigest, count),
              canonicalSignatureV4RootPublicKeys: roots,
            });
            admittedDigest = successor.artifactSha256;
          } else {
            const checkpointRecord = await readObject<CheckpointRecord>(
              CHECKPOINT_STORE,
              active.artifactDigest,
              "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING",
              active.artifactDigest,
            );
            if (checkpointRecord) {
              const projection = checkpointRecord.verifiedProjection;
              const checkpointStateRoot = digestReceizCompositeCanonical({
                kind: "receiz.profile-showcase.sealed-checkpoint-state.v114",
                checkpointArtifactDigest: checkpointRecord.checkpointArtifactDigest,
                checkpointStateRoot: projection.currentStateRoot,
              });
              if (
                checkpointRecord.checkpointArtifactDigest !== parentDigest
                || checkpointRecord.checkpointHistoryNodeDigest !== historyParent.nodeDigest
                || projection.schema
                  !== "receiz.profile-showcase.verified-checkpoint-projection.v114"
                || projection.artifactId !== carrier.artifactId
                || projection.ownerReceizIdentity !== artifact.ownerReceizIdentity
                || projection.headKaiUpulse !== parentReference.headKaiUpulse
                || projection.operationCount !== parentReference.operationCount
                || checkpointStateRoot !== parentReference.stateRoot
                || projection.historyObjectDigest
                  !== checkpointHistoryObjectDigest(predecessorHistoryNode)
                || projection.digest !== verifiedCheckpointProjectionDigest({
                  artifactDigest: checkpointRecord.artifactDigest,
                  checkpointArtifactDigest:
                    checkpointRecord.checkpointArtifactDigest,
                  predecessorArtifactDigest:
                    checkpointRecord.predecessorArtifactDigest,
                  checkpointHistoryNodeDigest:
                    checkpointRecord.checkpointHistoryNodeDigest,
                  actorArtifactDigest: checkpointRecord.actorArtifactDigest,
                  artifactId: projection.artifactId,
                  ownerReceizIdentity: projection.ownerReceizIdentity,
                  headKaiUpulse: projection.headKaiUpulse,
                  operationCount: projection.operationCount,
                  currentStateRoot: projection.currentStateRoot,
                  placementRoot: projection.placementRoot,
                  orderRoot: projection.orderRoot,
                  actorEvidenceRoot: projection.actorEvidenceRoot,
                  historyObjectDigest: projection.historyObjectDigest,
                })
              ) return null;
              admittedDigest = artifact.artifactDigest;
            } else {
              const predecessorVerification = await verifyReceizArtifactWithCanonicalRoots(
                exactArtifactFile(predecessorArtifact),
                roots,
              );
              const legacyInspection = await inspectReceizLegacyProfileShowcaseV114({
                verification: predecessorVerification,
                ownerConstraint: predecessorArtifact.ownerReceizIdentity,
                dependencies: { canonicalSignatureV4RootPublicKeys: roots },
              });
              if (
                legacyInspection.historyHeadDigest !== historyParent.nodeDigest
                || canonicalizeReceizConstitution(
                  predecessorHistoryNode as never,
                ) !== canonicalizeReceizConstitution(
                    readReceizLegacyProfileShowcaseInspectionCustody(
                      legacyInspection,
                    ).history.nodes.find(
                      (node) => node.nodeDigest === historyParent.nodeDigest,
                    ) as never,
                  )
              ) return null;
              const migration =
                await admitReceizLegacyProfileShowcaseMigrationWithInspectionContext({
                inspection: legacyInspection,
                candidateArtifact: { artifact: exactCandidateArtifact },
                expectedHead: carrier["profile-showcase"],
              });
              admittedDigest = migration.artifactSha256;
            }
          }
        } else return null;
        if (
          !admittedDigest
          || admittedDigest !== artifact.artifactDigest
        ) return null;
        await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrier);
      } catch {
        return null;
      }
      const sealedHead = carrier["profile-showcase"] as Record<string, unknown>;
      const sealedParents = sealedHead.parentHeads as readonly Record<string, unknown>[];
      const sealedWindow = sealedHead.firstPaintWindow as Record<string, unknown>;
      const sealedChildren = sealedWindow.children as readonly Record<string, unknown>[];
      const sealedSegments = sealedHead.segmentWindow as readonly Record<string, unknown>[];
      if (
        head.artifactDigest !== active.artifactDigest
        || head.artifactId !== carrier.artifactId
        || head.headKaiUpulse !== sealedHead.headKaiUpulse
        || canonicalizeReceizConstitution(
          exactHeadParentArtifactDigests(head) as never,
        ) !== canonicalizeReceizConstitution(
          sealedParents.map((parent) => parent.artifactDigest).sort() as never,
        )
        || head.historyNodeDigest !== carrier.receizProofHistory.currentNode.nodeDigest
        || canonicalizeReceizConstitution(
          head.childArtifactDigests as never,
        ) !== canonicalizeReceizConstitution(
          sealedChildren.map((child) =>
            (child.reference as Record<string, unknown>).childArtifactDigest) as never,
        )
        || canonicalizeReceizConstitution(
          head.segmentIds as never,
        ) !== canonicalizeReceizConstitution(
          sealedSegments.map((segment) => segment.segmentId) as never,
        )
      ) return null;
      const children = (await Promise.all(head.childArtifactDigests.map((digest) =>
        readObject<ChildRecord>(
          CHILD_STORE,
          digest,
          "PROFILE_SHOWCASE_BOUNDED_CHILD_READ_FAILED",
          active.artifactDigest,
        ))))
        .filter((child): child is ChildRecord => child !== null);
      foregroundChildArtifactReopens.set(active.artifactDigest, 0);
      foregroundChildAdmissionProjectionReads.set(
        active.artifactDigest,
        children.length,
      );
      const segments = (await Promise.all(head.segmentIds.map((segmentId) =>
        readObject<SegmentRecord>(
          SEGMENT_STORE,
          segmentId,
          "PROFILE_SHOWCASE_SEGMENT_RECOVERY_MISSING",
          active.artifactDigest,
        ))))
        .filter((segment): segment is SegmentRecord => segment !== null);
      if (children.length !== head.childArtifactDigests.length
        || segments.length !== head.segmentIds.length
        || !(await Promise.all(segments.map(verifyStoredSegment))).every(Boolean)) return null;
      const verifiedVisibleChildren = await Promise.all(children.map(async (
        child,
        index,
      ): Promise<{
        reference: ProfileShowcaseChildReference;
        exactSealedArtifactBytes: Uint8Array;
        verifiedPayloadMimeType: string;
        verifiedPayloadBytes: Uint8Array;
        verifiedRouteProjectionBytes: Uint8Array | null;
      } | null> => {
        const sealedReference = sealedChildren[index]!
          .reference as ProfileShowcaseChildReference;
        if (repairChildProjections) child = await repairStoredChildProjection(child, sealedReference);
        if (
          !sameSealedChildReference(child.reference, sealedReference)
          || await sha256(child.exactSealedArtifactBytes) !== child.artifactDigest
          || child.verifiedProjection.schema
            !== "receiz.profile-showcase.verified-child-projection.v114"
          || child.verifiedProjection.admissionEvidenceRoot
            !== sealedReference.admissionEvidenceRoot
          || child.verifiedProjection.payloadSha256
            !== sealedReference.stableChildArtifactId
          || child.verifiedProjection.digest !== verifiedChildProjectionDigest({
            artifactDigest: child.artifactDigest,
            reference: child.reference,
            admissionEvidenceRoot:
              child.verifiedProjection.admissionEvidenceRoot,
            payloadMimeType: child.verifiedProjection.payloadMimeType,
            payloadSha256: child.verifiedProjection.payloadSha256,
            routeProjectionSha256:
              child.verifiedProjection.routeProjectionSha256,
          })
          || await sha256(child.verifiedProjection.payloadBytes)
            !== child.verifiedProjection.payloadSha256
          || (
            child.verifiedProjection.routeProjectionBytes instanceof Uint8Array
            && (
              !child.verifiedProjection.routeProjectionSha256
              || await sha256(child.verifiedProjection.routeProjectionBytes)
                !== child.verifiedProjection.routeProjectionSha256
            )
          )
        ) return null;
        return {
          reference: structuredClone(child.reference),
          exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice(),
          verifiedPayloadMimeType: child.verifiedProjection.payloadMimeType,
          verifiedPayloadBytes: child.verifiedProjection.payloadBytes.slice(),
          verifiedRouteProjectionBytes:
            child.verifiedProjection.routeProjectionBytes instanceof Uint8Array
              ? child.verifiedProjection.routeProjectionBytes.slice()
              : null,
        };
      }));
      if (verifiedVisibleChildren.some((child) => child === null)) return null;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index]!;
        const sealedReference = sealedSegments[index]!;
        if (
          segment.commitment.segmentId !== sealedReference.segmentId
          || segment.commitment.root !== sealedReference.root
          || segment.commitment.startOperationCount
            !== sealedReference.startOperationCount
          || segment.commitment.endOperationCount !== sealedReference.endOperationCount
          || segment.commitment.operationCount !== sealedReference.operationCount
        ) return null;
      }
      const firstPaint = {
        artifactDigest: active.artifactDigest,
        exactSealedArtifactBytes: artifact.exactSealedArtifactBytes.slice(),
        carrier: structuredClone(carrier),
        visibleChildren: verifiedVisibleChildren as ProfileShowcaseBoundedFirstPaint["visibleChildren"],
        segments: structuredClone(segments),
      };
      boundedFirstPaintRuntimeCustody.add(firstPaint);
      return Object.freeze(firstPaint);
  }

  const projectAdmittedChild = async (
    child: ProfileShowcaseBoundedEdgeChild,
    canonicalReopen?: ReceizVerifiedArtifactAdmission,
  ): Promise<ChildRecord> => {
        const verified = child.admittedArtifact;
        if (
          verified.profile !== "portable-state"
          || !exactChildReference(child.reference, verified)
        ) {
          throw new TypeError("PROFILE_SHOWCASE_BOUNDED_CHILD_CUSTODY_MISMATCH");
        }
        const childArtifact = await admittedArtifactRecord(verified);
        const reopened = canonicalReopen ?? await reopenWithRoots({
          ...childArtifact,
          profile: "portable-state",
          roots,
        });
        if (
          !reopened
          || reopened.artifactSha256 !== verified.artifactSha256
        ) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_CHILD_REOPEN_REQUIRED");
        let portablePayload;
        let portableDocument: Record<string, unknown>;
        try {
          portableDocument = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(
              reopened.verifiedPayload.bytes,
            ),
          ) as Record<string, unknown>;
          portablePayload = await extractReceizPortableAssetPayload(
            portableDocument,
          );
        } catch {
          throw new TypeError("PROFILE_SHOWCASE_BOUNDED_CHILD_PROJECTION_INVALID");
        }
        if (
          portablePayload.assetType !== "profile_original"
          || portablePayload.sha256 !== child.reference.stableChildArtifactId
        ) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_CHILD_PROJECTION_INVALID");
        const provenance = portableDocument.provenance;
        const appends = provenance
          && typeof provenance === "object"
          && !Array.isArray(provenance)
          && Array.isArray((provenance as Record<string, unknown>).appends)
            ? (provenance as { appends: unknown[] }).appends
            : [];
        const routeProjection = appends
          .map((append) => decodeProfileOriginalRouteProjectionAppend(
            append,
            portablePayload.sha256,
          ))
          .find((projection) => projection !== null) ?? null;
        const routeProjectionBytes = routeProjection
          ? new TextEncoder().encode(JSON.stringify(routeProjection))
          : null;
        const routeOriginalId =
          routeProjection
          && typeof routeProjection.id === "string"
            ? routeProjection.id.trim()
            : null;
        const routeProjectionSha256 = routeProjectionBytes
          ? await sha256(routeProjectionBytes)
          : null;
        const projectionBasis = {
          artifactDigest: verified.artifactSha256,
          reference: child.reference,
          // The enclosing sealed reference carries this historical evidence
          // root. Cold verifier-context digests are runtime projections.
          admissionEvidenceRoot: child.reference.admissionEvidenceRoot,
          payloadMimeType: portablePayload.mimeType,
          payloadSha256: portablePayload.sha256,
          routeProjectionSha256,
        };
        const projected = {
          artifactDigest: verified.artifactSha256,
          reference: structuredClone(child.reference),
          ...childArtifact,
          verifiedProjection: {
            schema: "receiz.profile-showcase.verified-child-projection.v114",
            admissionEvidenceRoot: projectionBasis.admissionEvidenceRoot,
            payloadMimeType: projectionBasis.payloadMimeType,
            payloadSha256: projectionBasis.payloadSha256,
            payloadBytes: portablePayload.bytes.slice(),
            routeProjectionSha256,
            routeProjectionBytes: routeProjectionBytes?.slice() ?? null,
            routeOriginalId: routeOriginalId || null,
            digest: verifiedChildProjectionDigest(projectionBasis),
          },
        } satisfies ChildRecord;
        canonicalChildSources.set(childSourceKey(child.reference), projected);
        canonicalChildAdmissions.set(childSourceKey(child.reference), { reference: child.reference, admittedArtifact: reopened });
        return projected;
  };

  const repairStoredChildProjection = async (
    child: ChildRecord,
    reference: ProfileShowcaseChildReference,
  ): Promise<ChildRecord> => {
    const held = canonicalChildSources.get(childSourceKey(reference));
    if (held) return held;
    if (await sha256(child.exactSealedArtifactBytes) !== reference.childArtifactDigest) {
      throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
    }
    const admission = await reopenWithRoots({ ...child, profile: "portable-state", roots });
    if (!admission) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
    const canonical = await projectAdmittedChild({ reference, admittedArtifact: admission }, admission);
    if (JSON.stringify(child.verifiedProjection) !== JSON.stringify(canonical.verifiedProjection)
      || !sameSealedChildReference(child.reference, reference)) {
      const db = await database;
      const transaction = db.transaction(CHILD_STORE, "readwrite");
      transaction.objectStore(CHILD_STORE).put(canonical);
      await transactionComplete(transaction);
    }
    return canonical;
  };

  const preparePersistentSource = async (source: ProfileShowcaseBoundedFirstPaint) => {
    const artifactId = source.carrier.artifactId as ProfileShowcaseArtifactId;
    const head = source.carrier["profile-showcase"];
    const memory = createReceizProfileShowcasePersistentMemoryStoreV114();
    const checkpoints: ReturnType<typeof readReceizProfileShowcaseCheckpointCustodyV114>[] = [];
    const checkpointIOs: ReceizProfileShowcasePersistentStateIOV114[] = [];
    const pending = [{ artifactDigest: source.artifactDigest, carrier: source.carrier }];
    const visited = new Set<string>();
    let legacyPredecessor: ProfileShowcaseCompleteSource["legacyPredecessor"];
    let legacyState: ReceizProfileShowcasePersistentStateV114 | null = null;
    const stateFor = (value: Record<string, unknown>): ReceizProfileShowcasePersistentStateV114 => ({
      schema: "receiz.profile-showcase.persistent-state.v114",
      placementRoot: value.placementRoot as string, orderRoot: value.orderRoot as string,
      counts: value.counts as ReceizProfileShowcasePersistentStateV114["counts"],
      maximumKaiUpulse: value.headKaiUpulse as string,
    });
    const seed = async (value: Record<string, unknown>) => {
      for (const key of ["firstPaintWitnessNodes", "stateTransitionWitnessNodes"]) {
        for (const node of (value[key] ?? []) as ReceizProfileShowcasePersistentNodeV114[]) await memory.writeNode(node);
      }
    };
    await seed(head);
    const collectNextSource = async (): Promise<boolean> => {
      const current = pending.pop();
      if (!current) return false;
      if (visited.has(current.artifactDigest)) return true;
      visited.add(current.artifactDigest);
      try {
        const currentHead = current.carrier["profile-showcase"];
        await seed(currentHead);
        const checkpoint = checkpointSources.get(current.artifactDigest);
        if (checkpoint) checkpoints.push(checkpoint);
        const checkpointRecord = await readObject<CheckpointRecord>(CHECKPOINT_STORE, current.artifactDigest,
          "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING");
        if (checkpointRecord) {
          const heldIO = checkpoint?.persistentStateIO ?? options.checkpointPersistentStateIO;
          if (heldIO) {
            checkpointIOs.push(heldIO);
          } else {
            // Explicit archive preparation beneath an already settled head. The
            // exact local archive is composed once; no remote discovery or seal.
            const artifact = await readObject<ArtifactRecord>(ARTIFACT_STORE, checkpointRecord.checkpointArtifactDigest,
              "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
            if (!artifact || await sha256(artifact.exactSealedArtifactBytes) !== checkpointRecord.checkpointArtifactDigest) {
              throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
            }
            const verification = await verifyReceizArtifactWithCanonicalRoots(exactArtifactFile(artifact), roots);
            if (verification.status !== "verified-artifact") throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
            const canonical = await readRuntimeCustodiedReceizArtifactCanonicalOpen(verification, roots);
            if (!canonical) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
            const bundle = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes));
            const rebuilt = await verifyReceizProfileShowcaseCheckpointBundleV114({ bundle, persistentStateIO: memory,
              resolveSegment: async (index) => {
                const entry = await readObject<CheckpointSegmentIndexRecord>(CHECKPOINT_SEGMENT_INDEX_STORE,
                  `${checkpointRecord.checkpointArtifactDigest}:${index}`, "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
                if (!entry || entry.checkpointArtifactDigest !== checkpointRecord.checkpointArtifactDigest || entry.segmentIndex !== index) return null;
                if (options.checkpointContentStore) return options.checkpointContentStore.get(entry.segmentId);
                const segment = await readObject<SegmentRecord>(SEGMENT_STORE, entry.segmentId, "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
                return segment && await verifyStoredSegment(segment) ? checkpointSegmentMechanics(segment) : null;
              } });
            if (rebuilt.bundle.placementRoot !== currentHead.placementRoot || rebuilt.bundle.orderRoot !== currentHead.orderRoot
              || rebuilt.bundle.ownerReceizIdentity !== source.carrier.ownerReceizIdentity || rebuilt.bundle.artifactId !== artifactId) {
              throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
            }
          }
          return true;
        }
        for (const parent of currentHead.parentHeads as Record<string, unknown>[]) {
          const digest = parent.artifactDigest as string;
          if (visited.has(digest)) continue;
          const artifact = await readObject<ArtifactRecord>(ARTIFACT_STORE, digest, "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
          if (!artifact || await sha256(artifact.exactSealedArtifactBytes) !== digest) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
          const verification = await verifyReceizArtifactWithCanonicalRoots(exactArtifactFile(artifact), roots);
          const storedHead = await readObject<HeadRecord>(HEAD_STORE, digest, "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
          if (storedHead) {
            const inspection = await inspectReceizBoundedProfileShowcaseV114({ verification,
              ownerConstraint: source.carrier.ownerReceizIdentity, dependencies: { canonicalSignatureV4RootPublicKeys: roots } });
            const carrier = readReceizBoundedProfileShowcaseInspectionCarrier(inspection);
            if (carrier.artifactId !== artifactId || carrier.receizProofHistory.headDigest !== parent.historyHeadDigest
              || carrier["profile-showcase"].currentStateRoot !== parent.stateRoot
              || carrier["profile-showcase"].resultingOperationCount !== parent.operationCount) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
            pending.push({ artifactDigest: digest, carrier });
          } else {
            const inspection = await inspectReceizLegacyProfileShowcaseV114({ verification,
              ownerConstraint: source.carrier.ownerReceizIdentity, dependencies: { canonicalSignatureV4RootPublicKeys: roots } });
            if (inspection.artifactId !== artifactId || inspection.currentStateRoot !== parent.stateRoot
              || inspection.historyHeadDigest !== parent.historyHeadDigest || inspection.resultingOperationCount !== parent.operationCount) {
              throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
            }
            const { state, synthetic, actorEvidenceRoots } = await replayInspectedProfileShowcaseLegacyMembership({
              inspection, artifactId, ownerReceizIdentity: source.carrier.ownerReceizIdentity,
              parent, head: currentHead, io: memory,
            });
            if (synthetic) {
              if (current.artifactDigest !== source.artifactDigest) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
              legacyState = state;
              completeLegacyActorRoots.set(source.artifactDigest, actorEvidenceRoots);
              legacyPredecessor = { artifactDigest: digest, exactSealedArtifactBytes: artifact.exactSealedArtifactBytes.slice() };
            } else if (state.placementRoot !== currentHead.placementRoot || state.orderRoot !== currentHead.orderRoot) {
              throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
            }
          }
        }
        return true;
      } catch (error) {
        visited.delete(current.artifactDigest);
        pending.push(current);
        throw error;
      }
    };
    let collectionTail = Promise.resolve();
    const collectNext = () => {
      const next = collectionTail.then(collectNextSource);
      collectionTail = next.then(() => undefined, () => undefined);
      return next;
    };
    const io: ReceizProfileShowcasePersistentStateIOV114 = {
      writeNode: memory.writeNode,
      resolveNode: async (digest) => {
        const held = await memory.resolveNode(digest);
        if (held) return held;
        const retained = await readObject<ReceizProfileShowcasePersistentNodeV114>(PERSISTENT_NODE_STORE, digest,
          "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
        if (retained) return retained;
        const checkpointNode = async () => {
          for (const checkpointIO of checkpointIOs) {
            const node = await checkpointIO.resolveNode(digest);
            if (node) { await memory.writeNode(node); return node; }
          }
          return null;
        };
        const knownCheckpointNode = await checkpointNode();
        if (knownCheckpointNode) return knownCheckpointNode;
        let more = true;
        while (more) {
          more = await collectNext();
          const found = await memory.resolveNode(digest) ?? await checkpointNode();
          if (found) return found;
          if (legacyState) return null;
        }
        return null;
      },
    };
    return { io, memory, checkpoints, stateFor, collectRemaining: async () => { while (await collectNext()) { /* Collect exact remaining ancestors. */ } }, get legacyState() { return legacyState; }, get legacyPredecessor() { return legacyPredecessor; } };
  };
  const persistentSources = new Map<string, ReturnType<typeof preparePersistentSource>>();
  const readPersistentSource = (source: ProfileShowcaseBoundedFirstPaint) => {
    let held = persistentSources.get(source.artifactDigest);
    if (!held) {
      held = preparePersistentSource(source).catch(error => { persistentSources.delete(source.artifactDigest); throw error; });
      persistentSources.set(source.artifactDigest, held);
    }
    return held;
  };
  const prepareCompleteSource = async (source: ProfileShowcaseBoundedFirstPaint, visibleOnly = false, retainedChildrenOnly = false,
    retainedHiddenOnly = false): Promise<ProfileShowcaseCompleteSource> => {
    const head = source.carrier["profile-showcase"];
    const persistent = await readPersistentSource(source);
    const { io, memory, checkpoints, stateFor } = persistent;
    let complete;
    try {
      complete = await deriveReceizProfileShowcasePersistentMembershipV114({ state: stateFor(head), io });
    } catch (error) {
      if (!persistent.legacyState) throw error;
      complete = await deriveReceizProfileShowcasePersistentMembershipV114({ state: persistent.legacyState, io: memory });
    }
    const legacyPredecessor = persistent.legacyPredecessor;
    // Persist only nodes reachable under the accepted roots, never arbitrary
    // vault contents as a purported membership list.
    const db = await database;
    const nodesTransaction = db.transaction(PERSISTENT_NODE_STORE, "readwrite");
    for (const node of complete.witnessNodes) nodesTransaction.objectStore(PERSISTENT_NODE_STORE).put(node);
    await transactionComplete(nodesTransaction);
    const children: ProfileShowcaseBoundedFirstPaint["visibleChildren"][number][] = [];
    for (const placement of complete.placements) {
      if (visibleOnly && placement.visibility !== "visible") continue;
      const reference = placement.reference as ProfileShowcaseChildReference;
      let child = await readObject<ChildRecord>(CHILD_STORE, reference.childArtifactDigest, "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
      if (child) child = await repairStoredChildProjection(child, reference);
      // Scoped mutation lookup retains complete sealed membership, but cannot
      // require unrelated hidden media or claim custody of missing bytes.
      if (!child && retainedChildrenOnly) continue;
      // Public restoration carries the complete sealed placement tree while
      // withholding private payload bytes. An unrelated append consumes that
      // same tree; missing hidden media cannot veto its visible successor.
      // Visible bytes and the full owner archive retain their strict closure.
      if (!child && retainedHiddenOnly && placement.visibility !== "visible") continue;
      if (!child) {
        // Missing projection is resolved only by an exact accepted placement
        // reference against existing checkpoint child custody.
        await persistent.collectRemaining();
        let admission: ReceizVerifiedArtifactAdmission | null = null;
        for (const checkpoint of checkpoints) {
          admission = await checkpoint.resolveAdmittedChild(reference.admissionEvidenceRoot);
          if (admission) break;
        }
        if (!admission && options.checkpointChildContentStore) {
          const stored = await options.checkpointChildContentStore.getByEvidenceRoot(reference.admissionEvidenceRoot);
          if (stored && sameSealedChildReference(reference, stored.reference)) admission = await reopenWithRoots({ ...stored, profile: "portable-state", roots });
        }
        if (!admission) throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
        child = await projectAdmittedChild({ reference, admittedArtifact: admission });
        const transaction = db.transaction(CHILD_STORE, "readwrite");
        transaction.objectStore(CHILD_STORE).put(child);
        await transactionComplete(transaction);
      }
      const projection = child.verifiedProjection;
      if (!sameSealedChildReference(reference, child.reference) || child.artifactDigest !== reference.childArtifactDigest
        || await sha256(child.exactSealedArtifactBytes) !== reference.childArtifactDigest
        || projection.admissionEvidenceRoot !== reference.admissionEvidenceRoot
        || projection.payloadSha256 !== reference.stableChildArtifactId
        || await sha256(projection.payloadBytes) !== projection.payloadSha256
        || projection.digest !== verifiedChildProjectionDigest({ artifactDigest: child.artifactDigest, reference,
          admissionEvidenceRoot: projection.admissionEvidenceRoot, payloadMimeType: projection.payloadMimeType,
          payloadSha256: projection.payloadSha256, routeProjectionSha256: projection.routeProjectionSha256 })
        || (projection.routeProjectionBytes && await sha256(projection.routeProjectionBytes) !== projection.routeProjectionSha256)) {
        throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INVALID");
      }
      children.push({ reference: structuredClone(reference), exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice(),
        verifiedPayloadBytes: projection.payloadBytes.slice(), verifiedPayloadMimeType: projection.payloadMimeType,
        verifiedRouteProjectionBytes: projection.routeProjectionBytes?.slice() ?? null });
    }
    return Object.freeze({ artifactDigest: source.artifactDigest, exactSealedArtifactBytes: source.exactSealedArtifactBytes.slice(),
      carrier: structuredClone(source.carrier), ...complete, children: Object.freeze(children),
      ...(legacyPredecessor ? { legacyPredecessor } : {}) });
  };

  // Complete-source preparation and bounded presentation share exactly the
  // same effective-head selection, quarantine and replacement-hold rules.
  const readEffectiveSourceProjection = async (
    artifactId: ProfileShowcaseArtifactId,
    repairChildProjections: boolean,
    resolveHistorical: ProfileShowcaseBoundedEdgeVault["resolveVerifiedHistoricalArtifactDigest"],
  ): Promise<ProfileShowcaseBoundedFirstPaint | null> => {
      const db = await database;
      const pendingVisibility = await requestResult(
        db.transaction(VISIBILITY_TRANSITION_STORE, "readonly")
          .objectStore(VISIBILITY_TRANSITION_STORE)
          .index("artifactId")
          .getAll(artifactId),
        "PROFILE_SHOWCASE_VISIBILITY_TRANSITION_READ_FAILED",
      ) as VisibilityTransitionRecord[];
      const quarantined = pendingVisibility.some(record => !record.acceptedArtifactDigest);
      if (quarantined) {
        visibilityTransitionRuntimeQuarantine.add(artifactId);
      } else {
        visibilityTransitionRuntimeQuarantine.delete(artifactId);
      }
      // A pending visibility intent cannot revoke the last accepted source.
      // The verified active head (or its replacement presentation hold) stays
      // available until the sealed visibility successor is admitted.
      const active = await readObject<ActiveRecord>(ACTIVE_STORE, artifactId, "PROFILE_SHOWCASE_BOUNDED_EDGE_ACTIVE_READ_FAILED");
      if (!active) return null;
      const source = await readVerifiedSourceProjection(artifactId, undefined, active, repairChildProjections);
      if (!source) return null;
      const hold = active.replacementPresentationHold;
      if (!("replacementPresentationHold" in active)) return source; // Old records have no hold.
      if (!hold || typeof hold.artifactDigest !== "string"
        || typeof hold.intermediateArtifactDigest !== "string" || !hold.replacedChild) return null;
      try {
        const held = await readVerifiedSourceProjection(artifactId, hold.artifactDigest, undefined, repairChildProjections);
        const intermediate = await readVerifiedSourceProjection(artifactId, hold.intermediateArtifactDigest, undefined, repairChildProjections);
        if (!held || !intermediate || !held.visibleChildren.some(child => sameSealedChildReference(child.reference, hold.replacedChild))) return null;
        const heldCount = held.carrier["profile-showcase"].resultingOperationCount as number;
        const intermediateCount = intermediate.carrier["profile-showcase"].resultingOperationCount as number;
        if (intermediateCount !== heldCount + 1) return null;
        const intermediateHead = await readObject<HeadRecord>(HEAD_STORE, intermediate.artifactDigest, "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED");
        const append = (intermediate.carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[]).at(-1);
        if (!intermediateHead || !exactHeadParentArtifactDigests(intermediateHead).includes(held.artifactDigest)
          || append?.kind !== "showcase.append"
          || sameSealedChildReference(append.child as ProfileShowcaseChildReference, hold.replacedChild)) return null;
        const intermediateInHistory = source.artifactDigest === intermediate.artifactDigest
          ? source.artifactDigest
          : await resolveHistorical(artifactId, source.artifactDigest, intermediateCount);
        if (intermediateInHistory !== intermediate.artifactDigest) return null;
        return held;
      } catch {
        return null;
      }
  };

  return Object.freeze({
    async admit(input) {
      if (input.retainHistoryOnly && !input.retainOnly) throw new TypeError("PROFILE_SHOWCASE_HISTORY_STAGING_ONLY_REQUIRED");
      const showcaseAdmission = input.showcaseAdmission;
      if (showcaseAdmission.profile !== "profile-showcase"
        || showcaseAdmission.proofHistoryHead === null) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ARTIFACT_CUSTODY_REQUIRED");
      }
      const carrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(showcaseAdmission);
      const heldPresentation = input.holdReplacementPresentation
        ? await readVerifiedSourceProjection(carrier.artifactId as ProfileShowcaseArtifactId) : null;
      const heldReplacedChild = heldPresentation?.visibleChildren.find(({ reference }) =>
        reference.stableChildArtifactId === input.holdReplacementPresentation?.stableChildArtifactId
        && reference.immutableVersion === input.holdReplacementPresentation?.immutableVersion
        && reference.childArtifactDigest === input.holdReplacementPresentation?.childArtifactDigest)?.reference;
      if (input.holdReplacementPresentation) {
        const delta = carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[];
        const append = delta.at(-1);
        if (!heldPresentation || !heldReplacedChild || append?.kind !== "showcase.append"
          || (carrier["profile-showcase"].resultingOperationCount as number)
            !== (heldPresentation.carrier["profile-showcase"].resultingOperationCount as number) + 1
          || sameSealedChildReference(append.child as ProfileShowcaseChildReference, heldReplacedChild)) {
          throw new TypeError("PROFILE_SHOWCASE_REPLACEMENT_PRESENTATION_SOURCE_REQUIRED");
        }
      }
      const artifactRecord = await admittedArtifactRecord(showcaseAdmission);
      const existingSourceRecord = await readObject<ArtifactRecord>(ARTIFACT_STORE, showcaseAdmission.artifactSha256, "SHOWCASE_PROVENANCE_SOURCE_READ_FAILED");
      const sourceProvenance = [...(existingSourceRecord?.sourceProvenance ?? [])];
      for (const association of input.sourceProvenance ?? []) {
        const operation = (carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[]).find(operation => operation.operationDigest === association.operationDigest);
        if (operation?.kind !== "showcase.provenance.bind" || operation.provenanceEvidenceRoot !== association.sourceArtifactDigest) throw new TypeError("SHOWCASE_PROVENANCE_SOURCE_BINDING_INVALID");
        const retained = await readObject<ArtifactRecord>(ARTIFACT_STORE, association.sourceArtifactDigest, "SHOWCASE_PROVENANCE_SOURCE_MISSING");
        if (!retained || retained.ownerReceizIdentity !== carrier.ownerReceizIdentity || await sha256(retained.exactSealedArtifactBytes) !== association.sourceArtifactDigest) throw new TypeError("SHOWCASE_PROVENANCE_SOURCE_MISSING");
        const inspected = await inspectReceizBoundedProfileShowcaseV114({ verification: await verifyReceizArtifactWithCanonicalRoots(exactArtifactFile(retained), roots), ownerConstraint: carrier.ownerReceizIdentity,
          dependencies: { canonicalSignatureV4RootPublicKeys: roots } });
        if (inspected.artifactSha256 !== association.sourceArtifactDigest) throw new TypeError("SHOWCASE_PROVENANCE_SOURCE_INVALID");
        if (!sourceProvenance.some(value => value.operationDigest === association.operationDigest)) sourceProvenance.push(structuredClone(association));
      }
      const exactShowcaseArtifact = exactArtifactFile(artifactRecord);
      const coldShowcaseVerification = await verifyReceizArtifactWithCanonicalRoots(
        exactShowcaseArtifact,
        roots,
      );
      const coldShowcaseInspection = await inspectReceizBoundedProfileShowcaseV114({
        verification: coldShowcaseVerification,
        ownerConstraint: artifactRecord.ownerReceizIdentity,
        dependencies: { canonicalSignatureV4RootPublicKeys: roots },
      });
      if (
        coldShowcaseInspection.artifactSha256 !== showcaseAdmission.artifactSha256
        || canonicalizeReceizConstitution(
          readReceizBoundedProfileShowcaseInspectionCarrier(
            coldShowcaseInspection,
          ) as unknown as never,
        ) !== canonicalizeReceizConstitution(carrier as unknown as never)
      ) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ARTIFACT_REOPEN_REQUIRED");
      const incomingVerifiedChildren = await Promise.all(input.children.map((child) => projectAdmittedChild(child)));
      const references =
        carrier["profile-showcase"].segmentWindow as readonly Record<string, unknown>[];
      const incomingSegments = new Map(
        input.segments.map((segment) => [
          segment.commitment.segmentId,
          segment,
        ]),
      );
      const referencedSegmentIds = new Set(
        references.map((reference) => reference.segmentId),
      );
      if (
        incomingSegments.size !== input.segments.length
        || [...incomingSegments.keys()].some((segmentId) =>
          !referencedSegmentIds.has(segmentId))
      ) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_SEGMENT_REFERENCE_MISMATCH");
      }
      const verifiedSegments = await Promise.all(references.map(async (
        reference,
      ): Promise<ProfileShowcaseCommittedSegment> => {
        const segmentId = reference.segmentId;
        if (typeof segmentId !== "string") {
          throw new TypeError(
            "PROFILE_SHOWCASE_BOUNDED_SEGMENT_REFERENCE_MISMATCH",
          );
        }
        const incoming = incomingSegments.get(segmentId);
        const stored = incoming
          ? null
          : await readObject<SegmentRecord>(
              SEGMENT_STORE,
              segmentId,
              "PROFILE_SHOWCASE_SEGMENT_RECOVERY_MISSING",
              showcaseAdmission.artifactSha256,
            );
        const segment = incoming ?? stored;
        const segmentVerified = segment !== null
          && (
            await verifyProfileShowcaseSegment(segment)
            || await verifyStoredSegment({
              segmentId,
              ...segment,
            } as SegmentRecord)
          );
        if (
          !segment
          || !segmentVerified
          || reference.root !== segment.commitment.root
          || reference.startOperationCount
            !== segment.commitment.startOperationCount
          || reference.endOperationCount
            !== segment.commitment.endOperationCount
          || reference.operationCount !== segment.commitment.operationCount
        ) {
          throw new TypeError(
            "PROFILE_SHOWCASE_BOUNDED_SEGMENT_REFERENCE_MISMATCH",
          );
        }
        return structuredClone(segment);
      }));
      const window = carrier["profile-showcase"].firstPaintWindow as Record<string, unknown>;
      const windowChildren = window.children as readonly Record<string, unknown>[];
      const incomingChildren = new Map(
        incomingVerifiedChildren.map((child) => [
          child.artifactDigest,
          child,
        ]),
      );
      const admittedChildReferences = [
        ...windowChildren.map(carriedChild => carriedChild.reference as ProfileShowcaseChildReference),
        ...(carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[])
          .filter(operation => operation.kind === "showcase.append")
          .map(operation => operation.child as ProfileShowcaseChildReference),
      ];
      if (
        incomingChildren.size !== incomingVerifiedChildren.length
        || incomingVerifiedChildren.some(child =>
          !admittedChildReferences.some(reference => sameSealedChildReference(reference, child.reference)))
      ) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_WINDOW_CLOSURE_INVALID");
      }
      const materializedWindow = input.retainHistoryOnly
        ? windowChildren.filter(child => incomingChildren.has((child.reference as ProfileShowcaseChildReference).childArtifactDigest))
        : windowChildren;
      const verifiedChildren = await Promise.all(materializedWindow.map(async (
        carriedChild,
      ): Promise<ChildRecord> => {
        const reference =
          carriedChild.reference as ProfileShowcaseChildReference;
        const incoming = incomingChildren.get(reference.childArtifactDigest);
        const child = incoming
          ?? await readObject<ChildRecord>(
            CHILD_STORE,
            reference.childArtifactDigest,
            "PROFILE_SHOWCASE_BOUNDED_CHILD_READ_FAILED",
            showcaseAdmission.artifactSha256,
          );
        if (
          !child
          || !sameSealedChildReference(reference, child.reference)
          || child.artifactDigest !== reference.childArtifactDigest
          || await sha256(child.exactSealedArtifactBytes)
            !== child.artifactDigest
          || child.verifiedProjection.schema
            !== "receiz.profile-showcase.verified-child-projection.v114"
          || child.verifiedProjection.admissionEvidenceRoot
            !== reference.admissionEvidenceRoot
          || child.verifiedProjection.payloadSha256
            !== reference.stableChildArtifactId
          || child.verifiedProjection.digest !== verifiedChildProjectionDigest({
            artifactDigest: child.artifactDigest,
            reference: child.reference,
            admissionEvidenceRoot:
              child.verifiedProjection.admissionEvidenceRoot,
            payloadMimeType: child.verifiedProjection.payloadMimeType,
            payloadSha256: child.verifiedProjection.payloadSha256,
            routeProjectionSha256:
              child.verifiedProjection.routeProjectionSha256,
          })
          || await sha256(child.verifiedProjection.payloadBytes)
            !== child.verifiedProjection.payloadSha256
          || (
            child.verifiedProjection.routeProjectionBytes instanceof Uint8Array
            && (
              !child.verifiedProjection.routeProjectionSha256
              || await sha256(child.verifiedProjection.routeProjectionBytes)
                !== child.verifiedProjection.routeProjectionSha256
            )
          )
        ) {
          throw new TypeError(
            "PROFILE_SHOWCASE_BOUNDED_WINDOW_CLOSURE_INVALID",
          );
        }
        return child;
      }));
      for (let index = 0; index < windowChildren.length; index += 1) {
        const child = windowChildren[index]!;
        const reference = child.reference as ProfileShowcaseChildReference;
        const admitted = verifiedChildren.find(child => child.artifactDigest === reference.childArtifactDigest)!;
        if (input.retainHistoryOnly && !admitted) continue;
        if (!sameSealedChildReference(reference, admitted.reference)) {
          throw new TypeError("PROFILE_SHOWCASE_BOUNDED_WINDOW_CLOSURE_INVALID");
        }
        const witness = child.membershipWitness as Parameters<typeof verifyProfileShowcaseMembership>[0];
        const segment = verifiedSegments.find((candidate) =>
          candidate.commitment.segmentId === witness.segmentId);
        const committedWitness = segment?.membershipWitnesses[witness.leafIndex];
        const operation = segment?.operations[witness.leafIndex];
        if (!admitted || !segment
          || !committedWitness
          || canonicalizeReceizConstitution(witness as never)
            !== canonicalizeReceizConstitution(committedWitness as never)
          || !operation
          || operation.kind !== "showcase.append"
          || !sameSealedChildReference(reference, operation.child)
          || !await verifyProfileShowcaseMembership(witness, segment.commitment.root)) {
          throw new TypeError("PROFILE_SHOWCASE_BOUNDED_WINDOW_CLOSURE_INVALID");
        }
      }

      const head = carrier["profile-showcase"] as Record<string, unknown>;
      const parents = head.parentHeads as readonly Record<string, unknown>[];
      const headRecord: HeadRecord = {
        artifactDigest: showcaseAdmission.artifactSha256,
        artifactId: carrier.artifactId as ProfileShowcaseArtifactId,
        headKaiUpulse: head.headKaiUpulse as string,
        operationCount: head.resultingOperationCount as number,
        parentArtifactDigests: parents.map((parent) =>
          parent.artifactDigest as string).sort(),
        historyNodeDigest: carrier.receizProofHistory.currentNode.nodeDigest,
        childArtifactDigests: windowChildren.map(child => (child.reference as ProfileShowcaseChildReference).childArtifactDigest),
        segmentIds: verifiedSegments.map((segment) => segment.commitment.segmentId),
      };
      const checkpointBoundary = input.checkpointBoundary;
      const checkpointCustody = checkpointBoundary !== undefined
        && isSdkVerifiedProfileShowcaseCheckpointV114(checkpointBoundary)
        ? readReceizProfileShowcaseCheckpointCustodyV114(checkpointBoundary)
        : null;
      const legacyBoundary = input.legacyPredecessorBoundary;
      if (checkpointBoundary !== undefined && legacyBoundary !== undefined) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_BOUNDARY_AMBIGUOUS");
      }
      const legacyCustody = legacyBoundary !== undefined
        && isSdkInspectedLegacyProfileShowcaseV114(legacyBoundary)
        ? readReceizLegacyProfileShowcaseInspectionCustody(legacyBoundary)
        : null;
      const legacyBoundaryMatches = legacyBoundary !== undefined
        && isSdkInspectedLegacyProfileShowcaseV114(legacyBoundary)
        && legacyBoundary.artifactId === carrier.artifactId
        && parents.length === 1
        && parents[0]?.artifactDigest === legacyBoundary.artifactSha256
        && parents[0]?.historyHeadDigest === legacyBoundary.historyHeadDigest
        && parents[0]?.headKaiUpulse === legacyBoundary.headKaiUpulse
        && parents[0]?.operationCount === legacyBoundary.resultingOperationCount
        && parents[0]?.stateRoot === legacyBoundary.currentStateRoot;
      const checkpointStateRoot = checkpointBoundary && checkpointCustody
        ? digestReceizCompositeCanonical({
            kind: "receiz.profile-showcase.sealed-checkpoint-state.v114",
            checkpointArtifactDigest: checkpointBoundary.checkpointArtifactSha256,
            checkpointStateRoot: checkpointCustody.build.bundle.currentStateRoot,
          })
        : null;
      const checkpointBoundaryMatches = checkpointBoundary !== undefined
        && checkpointCustody !== null
        && checkpointBoundary.artifactId === carrier.artifactId
        && parents.length === 1
        && parents[0]?.artifactDigest === checkpointBoundary.checkpointArtifactSha256
        && parents[0]?.historyHeadDigest === checkpointBoundary.historyHeadDigest
        && parents[0]?.headKaiUpulse === checkpointCustody.build.bundle.headKaiUpulse
        && parents[0]?.operationCount === checkpointBoundary.operationCount
        && parents[0]?.stateRoot === checkpointStateRoot
        && verifiedChildren.length === checkpointCustody.children.length
        && verifiedChildren.every((child) => checkpointCustody.children.some(
          (candidate) => candidate.artifactSha256 === child.artifactDigest,
        ));
      if (legacyBoundary !== undefined && !legacyBoundaryMatches) {
        throw new TypeError("PROFILE_SHOWCASE_LEGACY_PREDECESSOR_BOUNDARY_MISMATCH");
      }
      if (checkpointBoundary !== undefined && !checkpointBoundaryMatches) {
        throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_PREDECESSOR_BOUNDARY_MISMATCH");
      }
      const legacyArtifactRecord = legacyCustody
        ? await admittedArtifactRecord(legacyCustody.internalAdmission)
        : null;
      const legacyHistoryNode = legacyCustody && legacyBoundary
        ? legacyCustody.history.nodes.find(
            (node) => node.nodeDigest === legacyBoundary.historyHeadDigest,
          )
        : null;
      if (legacyCustody && (!legacyArtifactRecord || !legacyHistoryNode)) {
        throw new TypeError("PROFILE_SHOWCASE_LEGACY_PREDECESSOR_BOUNDARY_MISMATCH");
      }
      const checkpointArtifactRecord = checkpointCustody && checkpointBoundary
        ? {
            artifactDigest: checkpointBoundary.checkpointArtifactSha256,
            exactSealedArtifactBytes: checkpointCustody.exactArtifactBytes.slice(),
            filename: checkpointCustody.filename,
            mimeType: checkpointCustody.mimeType,
            ownerReceizIdentity: checkpointBoundary.ownerReceizIdentity,
          } satisfies ArtifactRecord
        : null;
      const checkpointActorRecord = checkpointCustody?.actorAdmission
        ? {
            artifactDigest: checkpointCustody.actorAdmission.artifactSha256,
            ...await admittedArtifactRecord(checkpointCustody.actorAdmission),
          } satisfies ArtifactRecord
        : null;
      const checkpointPredecessorRecord = checkpointCustody
        ? {
            artifactDigest:
              checkpointCustody.predecessorAdmission.artifactSha256,
            ...await admittedArtifactRecord(
              checkpointCustody.predecessorAdmission,
            ),
          } satisfies ArtifactRecord
        : null;
      const checkpointRecord = checkpointCustody && checkpointBoundary
        ? (() => {
          const projectionBasis = {
            artifactDigest: showcaseAdmission.artifactSha256,
            checkpointArtifactDigest: checkpointBoundary.checkpointArtifactSha256,
            predecessorArtifactDigest:
              checkpointCustody.build.bundle.predecessorArtifactDigest,
            checkpointHistoryNodeDigest: checkpointCustody.historyHead.headDigest,
            actorArtifactDigest: checkpointCustody.actorAdmission?.artifactSha256 ?? checkpointCustody.actorPublicBinding!.artifactSha256,
            artifactId: checkpointBoundary.artifactId as ProfileShowcaseArtifactId,
            ownerReceizIdentity: checkpointBoundary.ownerReceizIdentity,
            headKaiUpulse: checkpointCustody.build.bundle.headKaiUpulse,
            operationCount: checkpointBoundary.operationCount,
            currentStateRoot: checkpointCustody.build.bundle.currentStateRoot,
            placementRoot: checkpointCustody.build.bundle.placementRoot,
            orderRoot: checkpointCustody.build.bundle.orderRoot,
            actorEvidenceRoot: checkpointCustody.build.bundle.actorEvidenceRoot,
            historyObjectDigest: checkpointHistoryObjectDigest(
              checkpointCustody.historyHead.currentNode as unknown as Record<string, unknown>,
            ),
          };
          return {
            artifactDigest: projectionBasis.artifactDigest,
            checkpointArtifactDigest: projectionBasis.checkpointArtifactDigest,
            predecessorArtifactDigest: projectionBasis.predecessorArtifactDigest,
            checkpointHistoryNodeDigest:
              projectionBasis.checkpointHistoryNodeDigest,
            actorArtifactDigest: projectionBasis.actorArtifactDigest,
            ...(checkpointCustody.actorPublicBinding ? { actorPublicBinding: checkpointCustody.actorPublicBinding } : {}),
            verifiedProjection: {
              schema: "receiz.profile-showcase.verified-checkpoint-projection.v114",
              artifactId: projectionBasis.artifactId,
              ownerReceizIdentity: projectionBasis.ownerReceizIdentity,
              headKaiUpulse: projectionBasis.headKaiUpulse,
              operationCount: projectionBasis.operationCount,
              currentStateRoot: projectionBasis.currentStateRoot,
              placementRoot: projectionBasis.placementRoot,
              orderRoot: projectionBasis.orderRoot,
              actorEvidenceRoot: projectionBasis.actorEvidenceRoot,
              historyObjectDigest: projectionBasis.historyObjectDigest,
              digest: verifiedCheckpointProjectionDigest(projectionBasis),
            },
            childArtifactDigests: checkpointCustody.children.map(
              (child) => child.artifactSha256,
            ),
            archiveSegmentCount: checkpointCustody.build.bundle.segmentCount,
            ...checkpointCustody.build.instrumentation,
          } satisfies CheckpointRecord;
        })()
        : null;
      const db = await database;
      if (checkpointCustody && checkpointBoundary) {
        for (
          let segmentIndex = 0;
          segmentIndex < checkpointCustody.build.bundle.segmentCount;
          segmentIndex += 1
        ) {
          const preverifiedSegmentId =
            checkpointCustody.segmentIds[segmentIndex] ?? null;
          const archiveSegment = options.checkpointContentStore
            && preverifiedSegmentId
            ? null
            : await checkpointCustody.resolveSegment(segmentIndex);
          if (!preverifiedSegmentId && !archiveSegment) {
            throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING");
          }
          const segmentId =
            preverifiedSegmentId ?? archiveSegment!.commitment.segmentId;
          if (options.checkpointContentStore && archiveSegment) {
            const persistedSegment = await options.checkpointContentStore.get(
              archiveSegment.commitment.segmentId,
            );
            noteRequest(
              showcaseAdmission.artifactSha256,
              "reads",
              "bounded-checkpoint-content-segments",
            );
            if (
              !persistedSegment
              || persistedSegment.commitment.segmentId
                !== archiveSegment.commitment.segmentId
              || !(await verifyStoredSegment(
                checkpointSegmentRecord(persistedSegment),
              ))
            ) {
              throw new TypeError(
                "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_PERSISTENCE_INVALID",
              );
            }
          }
          const archiveTransaction = db.transaction(
            options.checkpointContentStore
              ? CHECKPOINT_SEGMENT_INDEX_STORE
              : [SEGMENT_STORE, CHECKPOINT_SEGMENT_INDEX_STORE],
            "readwrite",
          );
          if (!options.checkpointContentStore) {
            archiveTransaction.objectStore(SEGMENT_STORE).put(
              checkpointSegmentRecord(archiveSegment!),
            );
            noteRequest(showcaseAdmission.artifactSha256, "writes", SEGMENT_STORE);
          }
          archiveTransaction.objectStore(CHECKPOINT_SEGMENT_INDEX_STORE).put({
            indexKey: `${checkpointBoundary.checkpointArtifactSha256}:${segmentIndex}`,
            checkpointArtifactDigest: checkpointBoundary.checkpointArtifactSha256,
            segmentIndex,
            segmentId,
          } satisfies CheckpointSegmentIndexRecord);
          noteRequest(
            showcaseAdmission.artifactSha256,
            "writes",
            CHECKPOINT_SEGMENT_INDEX_STORE,
          );
          await transactionComplete(archiveTransaction);
        }
      }
      const transaction = db.transaction(
        [
          ACTIVE_STORE,
          HEAD_STORE,
          ARTIFACT_STORE,
          HISTORY_NODE_STORE,
          CHILD_STORE,
          ORIGINAL_CHILD_INDEX_STORE,
          SEGMENT_STORE,
          CHECKPOINT_STORE,
          CHECKPOINT_SEGMENT_INDEX_STORE,
          RECONCILIATION_OUTBOX_STORE,
        ],
        "readwrite",
      );
      transaction.objectStore(ARTIFACT_STORE).put({
        artifactDigest: showcaseAdmission.artifactSha256,
        ...artifactRecord,
        ...(sourceProvenance.length ? { sourceProvenance } : {}),
      } satisfies ArtifactRecord);
      noteRequest(showcaseAdmission.artifactSha256, "writes", ARTIFACT_STORE);
      if (legacyArtifactRecord && legacyBoundary && legacyHistoryNode) {
        transaction.objectStore(ARTIFACT_STORE).put({
          artifactDigest: legacyBoundary.artifactSha256,
          ...legacyArtifactRecord,
        } satisfies ArtifactRecord);
        noteRequest(showcaseAdmission.artifactSha256, "writes", ARTIFACT_STORE);
        transaction.objectStore(HISTORY_NODE_STORE).put(legacyHistoryNode);
        noteRequest(showcaseAdmission.artifactSha256, "writes", HISTORY_NODE_STORE);
      }
      if (
        checkpointArtifactRecord
        && checkpointPredecessorRecord
        && checkpointRecord
        && checkpointCustody
      ) {
        transaction.objectStore(ARTIFACT_STORE).put(checkpointArtifactRecord);
        if (checkpointActorRecord) transaction.objectStore(ARTIFACT_STORE).put(checkpointActorRecord);
        transaction.objectStore(ARTIFACT_STORE).put(checkpointPredecessorRecord);
        noteRequest(showcaseAdmission.artifactSha256, "writes", ARTIFACT_STORE);
        noteRequest(showcaseAdmission.artifactSha256, "writes", ARTIFACT_STORE);
        noteRequest(showcaseAdmission.artifactSha256, "writes", ARTIFACT_STORE);
        transaction.objectStore(HISTORY_NODE_STORE).put(
          checkpointCustody.historyHead.currentNode,
        );
        noteRequest(showcaseAdmission.artifactSha256, "writes", HISTORY_NODE_STORE);
        transaction.objectStore(CHECKPOINT_STORE).put(checkpointRecord);
        noteRequest(showcaseAdmission.artifactSha256, "writes", CHECKPOINT_STORE);
      }
      transaction.objectStore(HISTORY_NODE_STORE).put(carrier.receizProofHistory.currentNode);
      noteRequest(showcaseAdmission.artifactSha256, "writes", HISTORY_NODE_STORE);
      // The sealed direct append remains custody even outside first paint.
      // Head presentation references stay bounded to the verified window.
      const retainedChildren = new Map([...verifiedChildren, ...incomingVerifiedChildren].map(child => [child.artifactDigest, child]));
      for (const child of retainedChildren.values()) {
        transaction.objectStore(CHILD_STORE).put(child);
        noteRequest(showcaseAdmission.artifactSha256, "writes", CHILD_STORE);
        if (child.verifiedProjection.routeOriginalId) {
          transaction.objectStore(ORIGINAL_CHILD_INDEX_STORE).put({
            indexKey:
              `${carrier.artifactId}\u0000${child.verifiedProjection.routeOriginalId}`,
            artifactId: carrier.artifactId,
            originalId: child.verifiedProjection.routeOriginalId,
            childArtifactDigest: child.artifactDigest,
            reference: structuredClone(child.reference),
          } satisfies OriginalChildIndexRecord);
          noteRequest(
            showcaseAdmission.artifactSha256,
            "writes",
            ORIGINAL_CHILD_INDEX_STORE,
          );
        }
      }
      for (const segment of verifiedSegments) {
        transaction.objectStore(SEGMENT_STORE).put({
          segmentId: segment.commitment.segmentId,
          ...structuredClone(segment),
        } satisfies SegmentRecord);
        noteRequest(showcaseAdmission.artifactSha256, "writes", SEGMENT_STORE);
      }
      transaction.objectStore(HEAD_STORE).put(headRecord);
      noteRequest(showcaseAdmission.artifactSha256, "writes", HEAD_STORE);
      const attemptId = `profile-showcase:${showcaseAdmission.artifactSha256}`;
      const outboxStore = transaction.objectStore(RECONCILIATION_OUTBOX_STORE);
      const outboxRequest = outboxStore.get(attemptId);
      noteRequest(
        showcaseAdmission.artifactSha256,
        "reads",
        RECONCILIATION_OUTBOX_STORE,
      );
      outboxRequest.onsuccess = () => {
        if (input.retainHistoryOnly) return;
        if (outboxRequest.result !== undefined) return;
        outboxStore.put({
          attemptId,
          artifactId: carrier.artifactId,
          artifactDigest: showcaseAdmission.artifactSha256,
          historyHeadDigest: carrier.receizProofHistory.headDigest,
          headKaiUpulse: headRecord.headKaiUpulse,
          status: "network-pending",
          attempts: 0,
          lastError: null,
          acceptedArtifactDigest: null,
          economyStatus: "pending",
          economyAttempts: 0,
          economyLastError: null,
          acceptedEconomyArtifactDigest: null,
        } satisfies ProfileShowcaseBoundedReconciliationAttempt);
        noteRequest(
          showcaseAdmission.artifactSha256,
          "writes",
          RECONCILIATION_OUTBOX_STORE,
        );
      };
      let activated = false;
      const activeRequest = transaction.objectStore(ACTIVE_STORE).get(carrier.artifactId);
      noteRequest(showcaseAdmission.artifactSha256, "reads", ACTIVE_STORE);
      activeRequest.onsuccess = () => {
        if (input.retainOnly) return;
        const active = activeRequest.result as ActiveRecord | undefined;
        const parentArtifactDigests = exactHeadParentArtifactDigests(headRecord);
        const causal = active === undefined
          ? parentArtifactDigests.length === 0
            || legacyBoundaryMatches
            || checkpointBoundaryMatches
          : active.artifactDigest === headRecord.artifactDigest
            || parentArtifactDigests.includes(active.artifactDigest)
              && BigInt(headRecord.headKaiUpulse) >= BigInt(active.headKaiUpulse);
        if (!causal) return;
        if (heldPresentation && active?.artifactDigest !== heldPresentation.artifactDigest) return;
        let replacementPresentationHold = active?.replacementPresentationHold;
        if (input.holdReplacementPresentation && heldPresentation && heldReplacedChild && !replacementPresentationHold) {
          if (!parentArtifactDigests.includes(heldPresentation.artifactDigest)) return;
          replacementPresentationHold = {
            artifactDigest: heldPresentation.artifactDigest,
            intermediateArtifactDigest: showcaseAdmission.artifactSha256,
            replacedChild: structuredClone(heldReplacedChild),
          };
        } else if (replacementPresentationHold && active
          && parentArtifactDigests.includes(active.artifactDigest)) {
          const last = (carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[]).at(-1);
          const hiddenChild = last?.child as ProfileShowcaseChildReference | undefined;
          if (last?.kind === "showcase.visibility.set" && last.visibility === "hidden"
            && hiddenChild?.stableChildArtifactId === replacementPresentationHold.replacedChild.stableChildArtifactId
            && hiddenChild.immutableVersion === replacementPresentationHold.replacedChild.immutableVersion
            && hiddenChild.childArtifactDigest === replacementPresentationHold.replacedChild.childArtifactDigest) {
            replacementPresentationHold = undefined;
          }
        }
        activated = true;
        transaction.objectStore(ACTIVE_STORE).put({
          artifactId: carrier.artifactId,
          artifactDigest: showcaseAdmission.artifactSha256,
          headKaiUpulse: headRecord.headKaiUpulse,
          ...(replacementPresentationHold ? { replacementPresentationHold } : {}),
        } satisfies ActiveRecord);
        noteRequest(showcaseAdmission.artifactSha256, "writes", ACTIVE_STORE);
      };
      await transactionComplete(transaction);
      if (checkpointCustody) checkpointSources.set(showcaseAdmission.artifactSha256, checkpointCustody);
      return Object.freeze({
        status: activated ? "active" : "inactive",
        code: activated ? null : "PROFILE_SHOWCASE_BOUNDED_INACTIVE_CAUSAL_BRANCH",
      });
    },

    async pendingReconciliationAttempts() {
      const db = await database;
      const transaction = db.transaction(RECONCILIATION_OUTBOX_STORE, "readonly");
      const attempts = await requestResult(
        transaction.objectStore(RECONCILIATION_OUTBOX_STORE).getAll(),
        "PROFILE_SHOWCASE_BOUNDED_OUTBOX_READ_FAILED",
      ) as ProfileShowcaseBoundedReconciliationAttempt[];
      return attempts
        .map(withEconomyAttemptDefaults)
        .filter((attempt) =>
          attempt.status === "network-pending"
          || (
            attempt.status === "rejected"
            && attempt.lastError !== null
            && RETRIABLE_PUBLICATION_REJECTION_CODES.has(attempt.lastError)
          ))
        .sort(reconciliationAttemptOrder);
    },

    async pendingEconomyAppendAttempts() {
      const db = await database;
      const transaction = db.transaction(RECONCILIATION_OUTBOX_STORE, "readonly");
      const attempts = await requestResult(
        transaction.objectStore(RECONCILIATION_OUTBOX_STORE).getAll(),
        "PROFILE_SHOWCASE_BOUNDED_ECONOMY_OUTBOX_READ_FAILED",
      ) as ProfileShowcaseBoundedReconciliationAttempt[];
      return attempts
        .map(withEconomyAttemptDefaults)
        .filter((attempt) => attempt.economyStatus === "pending")
        .sort(reconciliationAttemptOrder);
    },

    async reconciliationAttempt(attemptId) {
      if (!attemptId.trim()) return null;
      const attempt = await readObject<ProfileShowcaseBoundedReconciliationAttempt>(
        RECONCILIATION_OUTBOX_STORE,
        attemptId,
        "PROFILE_SHOWCASE_BOUNDED_OUTBOX_READ_FAILED",
      );
      return attempt ? withEconomyAttemptDefaults(attempt) : null;
    },

    async recordReconciliationResult(input) {
      const current = await this.reconciliationAttempt(input.attemptId);
      if (!current) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_OUTBOX_ATTEMPT_MISSING");
      }
      if (
        input.status === "accepted"
          ? input.acceptedArtifactDigest !== current.artifactDigest
          : input.acceptedArtifactDigest !== null
      ) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_OUTBOX_RESULT_MISMATCH");
      }
      const next: ProfileShowcaseBoundedReconciliationAttempt = Object.freeze({
        ...current,
        status: input.status,
        attempts: current.attempts + 1,
        lastError: input.lastError,
        acceptedArtifactDigest: input.acceptedArtifactDigest,
      });
      const db = await database;
      const transaction = db.transaction(RECONCILIATION_OUTBOX_STORE, "readwrite");
      transaction.objectStore(RECONCILIATION_OUTBOX_STORE).put(next);
      await transactionComplete(transaction);
      return next;
    },

    async recordEconomyAppendResult(input) {
      const current = await this.reconciliationAttempt(input.attemptId);
      if (!current) {
        throw new TypeError(
          "PROFILE_SHOWCASE_BOUNDED_ECONOMY_OUTBOX_ATTEMPT_MISSING",
        );
      }
      if (
        input.status === "accepted"
          ? !/^[0-9a-f]{64}$/.test(
              input.acceptedEconomyArtifactDigest ?? "",
            )
          : input.acceptedEconomyArtifactDigest !== null
      ) {
        throw new TypeError(
          "PROFILE_SHOWCASE_BOUNDED_ECONOMY_OUTBOX_RESULT_MISMATCH",
        );
      }
      const next: ProfileShowcaseBoundedReconciliationAttempt = Object.freeze({
        ...current,
        economyStatus: input.status,
        economyAttempts: current.economyAttempts + 1,
        economyLastError: input.lastError,
        acceptedEconomyArtifactDigest: input.acceptedEconomyArtifactDigest,
      });
      const db = await database;
      const transaction = db.transaction(RECONCILIATION_OUTBOX_STORE, "readwrite");
      transaction.objectStore(RECONCILIATION_OUTBOX_STORE).put(next);
      await transactionComplete(transaction);
      return next;
    },

    async createTransitionPersistentStateIO(artifactId, predecessorArtifactDigest) {
      // Bind traversal to the exact admitted predecessor, including a held
      // replacement source. The SDK checks every requested node against its
      // sealed root/path; global storage membership is never admission.
      const source = await readVerifiedSourceProjection(artifactId, predecessorArtifactDigest, undefined, true);
      if (!source || source.artifactDigest !== predecessorArtifactDigest) throw new TypeError("PROFILE_SHOWCASE_TRANSITION_SOURCE_REQUIRED");
      const held = await readPersistentSource(source);
      const staged = createReceizProfileShowcasePersistentMemoryStoreV114();
      return Object.freeze({
        writeNode: staged.writeNode,
        resolveNode: async (digest: string) => await staged.resolveNode(digest) ?? await held.io.resolveNode(digest),
      });
    },

    async selectOwnerRestoreHead(admission, expectedCurrentArtifactDigest, isCurrent, preservedSourceArtifactDigest, boundedPublicRestore) {
      const carrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
      const artifactId = carrier.artifactId as ProfileShowcaseArtifactId;
      const source = await readVerifiedSourceProjection(artifactId, admission.artifactSha256, {
        artifactId, artifactDigest: admission.artifactSha256, headKaiUpulse: carrier["profile-showcase"].headKaiUpulse as string,
      });
      if (!source || source.artifactDigest !== admission.artifactSha256) throw new TypeError("SHOWCASE_RESTORE_SOURCE_CUSTODY_REQUIRED");
      if (boundedPublicRestore && expectedCurrentArtifactDigest !== null) throw new TypeError("SHOWCASE_RESTORE_CONCURRENT_APPEND");
      await prepareCompleteSource(source, boundedPublicRestore);
      if (expectedCurrentArtifactDigest && expectedCurrentArtifactDigest !== admission.artifactSha256
        && !await this.isVerifiedPublicationAncestor(artifactId, expectedCurrentArtifactDigest, admission.artifactSha256)) {
        // Existing owner-authorized collection composition retains the other
        // exact sealed source through showcase.provenance.bind. It is not a
        // fabricated common predecessor or a count/Kai-only head replacement.
        if (preservedSourceArtifactDigest !== expectedCurrentArtifactDigest) throw new TypeError("SHOWCASE_RESTORE_CAUSAL_CONFLICT");
        const archive = await this.exportOwnerSource(artifactId, admission.artifactSha256);
        if (!archive?.sourceProvenance.some(link => link.sourceArtifactDigest === expectedCurrentArtifactDigest)
          || !archive.history.some(entry => entry.artifactDigest === expectedCurrentArtifactDigest)) throw new TypeError("SHOWCASE_RESTORE_SOURCE_CONTINUITY_REQUIRED");
        const held = await this.readCompleteSource(artifactId, expectedCurrentArtifactDigest);
        const composed = await this.readCompleteSource(artifactId, admission.artifactSha256);
        if (!held || !composed || BigInt(composed.carrier["profile-showcase"].headKaiUpulse as string) <= BigInt(held.carrier["profile-showcase"].headKaiUpulse as string)) throw new TypeError("SHOWCASE_RESTORE_SOURCE_CONTINUITY_REQUIRED");
        const originals = new Map(projectOwnerShowcaseOriginals(composed).map(original => [original.id, original]));
        if (projectOwnerShowcaseOriginals(held).some(original => !originals.has(original.id)
          || original.showOnProfile !== originals.get(original.id)!.showOnProfile
          || profileOriginalProofIdentityKey(original) !== profileOriginalProofIdentityKey(originals.get(original.id)!)
          || (originalHasSignedArtifactState(original) && !originalHasSignedArtifactState(originals.get(original.id)!))
          || (original.importedSource && original.importedSource.sourceArtifactSha256 !== originals.get(original.id)!.importedSource?.sourceArtifactSha256))) throw new TypeError("SHOWCASE_RESTORE_SOURCE_MEMBERSHIP_REQUIRED");
      }
      const db = await database;
      const transaction = db.transaction(ACTIVE_STORE, "readwrite");
      const store = transaction.objectStore(ACTIVE_STORE);
      const current = await requestResult(store.get(artifactId), "SHOWCASE_RESTORE_ACTIVE_READ_FAILED") as ActiveRecord | undefined;
      if ((isCurrent && !isCurrent()) || (current?.artifactDigest ?? null) !== expectedCurrentArtifactDigest || current?.replacementPresentationHold) {
        transaction.abort();
        throw new TypeError("SHOWCASE_RESTORE_CONCURRENT_APPEND");
      }
      store.put({ artifactId, artifactDigest: admission.artifactSha256, headKaiUpulse: carrier["profile-showcase"].headKaiUpulse as string } satisfies ActiveRecord);
      await transactionComplete(transaction);
    },

    async reopenHead(artifactId, retainedArtifactDigest?: string) {
      /*
       * A durable pointer is never promoted into proof authority. Reuse the
       * complete source closure check first, then rebuild SDK runtime
       * custody from the exact active artifact, exact predecessor artifact,
       * and exact predecessor history node stored by the vault.
       */
      const settled = await readVerifiedSourceProjection(artifactId, retainedArtifactDigest);
      if (!settled) return null;
      const selected = await readObject<ActiveRecord>(
        ACTIVE_STORE,
        artifactId,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_ACTIVE_READ_FAILED",
      );
      const active = selected && retainedArtifactDigest
        ? { ...selected, artifactDigest: retainedArtifactDigest }
        : selected;
      if (!active || active.artifactDigest !== settled.artifactDigest) return null;
      const [head, artifact] = await Promise.all([
        readObject<HeadRecord>(
          HEAD_STORE,
          active.artifactDigest,
          "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED",
          active.artifactDigest,
        ),
        readObject<ArtifactRecord>(
          ARTIFACT_STORE,
          active.artifactDigest,
          "PROFILE_SHOWCASE_BOUNDED_EDGE_ARTIFACT_READ_FAILED",
          active.artifactDigest,
        ),
      ]);
      if (!head || !artifact) return null;
      try {
        const candidateArtifact = exactArtifactFile(artifact);
        let admission: ReceizVerifiedProfileShowcaseAdmission | null = null;
        const parentArtifactDigests = exactHeadParentArtifactDigests(head);
        if (parentArtifactDigests.length === 0) {
          const verification = await verifyReceizArtifactWithCanonicalRoots(
            candidateArtifact,
            roots,
          );
          const candidate = await createReceizArtifactAdmissionEngine({
            canonicalSignatureV4RootPublicKeys: roots,
          })(verification, {
            profile: "profile-showcase",
            ownerConstraint: artifact.ownerReceizIdentity,
          });
          admission = candidate.profile === "profile-showcase"
            && candidate.verdict === "bearer-recovery"
            ? candidate
            : null;
        } else if (parentArtifactDigests.length === 2) {
          admission = await admitExactStoredMergeHead({
            head,
            candidateArtifact,
            carrier: settled.carrier,
            accountingDigest: active.artifactDigest,
          });
        } else if (parentArtifactDigests.length === 1) {
          const predecessorArtifactDigest = parentArtifactDigests[0]!;
          const historyParent = settled.carrier.receizProofHistory.parentRefs[0];
          const [predecessorArtifact, predecessorHead, predecessorHistoryNode] =
            await Promise.all([
              readObject<ArtifactRecord>(
                ARTIFACT_STORE,
                predecessorArtifactDigest,
                "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_ARTIFACT_MISSING",
                active.artifactDigest,
              ),
              readObject<HeadRecord>(
                HEAD_STORE,
                predecessorArtifactDigest,
                "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_HEAD_MISSING",
                active.artifactDigest,
              ),
              historyParent
                ? readObject<Record<string, unknown>>(
                    HISTORY_NODE_STORE,
                    historyParent.nodeDigest,
                    "PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_HISTORY_MISSING",
                    active.artifactDigest,
                  )
                : Promise.resolve(null),
            ]);
          /*
           * Checkpoint and legacy migration boundaries remain governed by
           * their stronger dedicated SDK admissions. A generic projection
           * must never be fabricated when that runtime custody is absent.
           */
          if (
            !predecessorArtifact
            || !predecessorHistoryNode
            || !historyParent
          ) return null;
          if (predecessorHead) {
            if (predecessorHead.historyNodeDigest !== historyParent.nodeDigest) {
              return null;
            }
            admission =
              await admitReceizProfileShowcaseSuccessorWithExactPredecessorContext({
                predecessorArtifact: exactArtifactFile(predecessorArtifact),
                candidateArtifact,
                predecessorHistoryNode,
                resolveVerifiedHistoricalArtifactDigest: count => resolveFromVerifiedHistoricalIndex(artifactId, predecessorArtifactDigest, count),
                canonicalSignatureV4RootPublicKeys: roots,
              });
          } else {
            const checkpointRecord = await readObject<CheckpointRecord>(
              CHECKPOINT_STORE,
              active.artifactDigest,
              "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING",
              active.artifactDigest,
            );
            if (!checkpointRecord) {
              const predecessorVerification =
                await verifyReceizArtifactWithCanonicalRoots(
                  exactArtifactFile(predecessorArtifact),
                  roots,
                );
              const legacyInspection =
                await inspectReceizLegacyProfileShowcaseV114({
                  verification: predecessorVerification,
                  ownerConstraint: predecessorArtifact.ownerReceizIdentity,
                  dependencies: {
                    canonicalSignatureV4RootPublicKeys: roots,
                  },
                });
              if (
                legacyInspection.historyHeadDigest !== historyParent.nodeDigest
                || canonicalizeReceizConstitution(
                  predecessorHistoryNode as never,
                ) !== canonicalizeReceizConstitution(
                  readReceizLegacyProfileShowcaseInspectionCustody(
                    legacyInspection,
                  ).history.nodes.find(
                    (node) => node.nodeDigest === historyParent.nodeDigest,
                  ) as never,
                )
              ) return null;
              admission =
                await admitReceizLegacyProfileShowcaseMigrationWithInspectionContext({
                  inspection: legacyInspection,
                  candidateArtifact: { artifact: candidateArtifact },
                  expectedHead: settled.carrier["profile-showcase"],
                });
            } else {
              if (checkpointRecord.checkpointArtifactDigest
                !== predecessorArtifactDigest
              || checkpointRecord.checkpointHistoryNodeDigest
                !== historyParent.nodeDigest
              || (!options.resolveVerifiedCheckpointActorEvidence && !checkpointRecord.actorPublicBinding)) {
                return null;
              }
              const [
                checkpointArtifact,
                checkpointPredecessorArtifact,
                actorEvidence,
                checkpointChildren,
              ] = await Promise.all([
                readObject<ArtifactRecord>(
                  ARTIFACT_STORE,
                  checkpointRecord.checkpointArtifactDigest,
                  "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING",
                  active.artifactDigest,
                ),
                readObject<ArtifactRecord>(
                  ARTIFACT_STORE,
                  checkpointRecord.predecessorArtifactDigest,
                  "PROFILE_SHOWCASE_CHECKPOINT_PREDECESSOR_MISSING",
                  active.artifactDigest,
                ),
                options.resolveVerifiedCheckpointActorEvidence?.(
                  checkpointRecord.actorArtifactDigest,
                ) ?? Promise.resolve(null),
                Promise.all(checkpointRecord.childArtifactDigests.map((digest) =>
                  readObject<ChildRecord>(
                    CHILD_STORE,
                    digest,
                    "PROFILE_SHOWCASE_CHECKPOINT_CHILD_MISSING",
                    active.artifactDigest,
                  ))),
              ]);
              if (
                !checkpointArtifact
                || !checkpointPredecessorArtifact
                || (!actorEvidence && !checkpointRecord.actorPublicBinding)
                || checkpointChildren.some((child) => child === null)
              ) return null;
              const checkpointPredecessorAdmission = await reopenWithRoots({
                ...checkpointPredecessorArtifact,
                profile: "profile-showcase",
                roots,
              });
              if (!checkpointPredecessorAdmission
                || checkpointPredecessorAdmission.artifactSha256
                  !== checkpointRecord.predecessorArtifactDigest) {
                return null;
              }
              const admittedChildren = await Promise.all(
                checkpointChildren.map((child) => child
                  ? reopenWithRoots({
                      ...child,
                      profile: "portable-state",
                      roots,
                    })
                  : Promise.resolve(null)),
              );
              if (admittedChildren.some((child) => child === null)) return null;
              const resolveSegment = async (segmentIndex: number) => {
                if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0) {
                  return null;
                }
                const indexRecord =
                  await readObject<CheckpointSegmentIndexRecord>(
                    CHECKPOINT_SEGMENT_INDEX_STORE,
                    `${checkpointRecord.checkpointArtifactDigest}:${segmentIndex}`,
                    "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_INDEX_MISSING",
                    active.artifactDigest,
                  );
                if (!indexRecord || indexRecord.segmentIndex !== segmentIndex) {
                  return null;
                }
                if (options.checkpointContentStore) {
                  return options.checkpointContentStore.get(
                    indexRecord.segmentId,
                  );
                }
                const segment = await readObject<SegmentRecord>(
                  SEGMENT_STORE,
                  indexRecord.segmentId,
                  "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING",
                  active.artifactDigest,
                );
                return segment && await verifyStoredSegment(segment)
                  ? checkpointSegmentMechanics(segment)
                  : null;
              };
              const checkpointInput = {
                  checkpointArtifact: exactArtifactFile(checkpointArtifact),
                  canonicalSignatureV4RootPublicKeys: roots,
                  verifiedActorEvidence: actorEvidence,
                  admittedChildren: admittedChildren.filter(
                    (child): child is ReceizVerifiedArtifactAdmission =>
                      child !== null,
                  ),
                  resolvePredecessorAdmission: async (artifactDigest: string) =>
                    artifactDigest === checkpointRecord.predecessorArtifactDigest
                      ? checkpointPredecessorAdmission
                      : null,
                  resolveSegment,
                  ...(options.checkpointPersistentStateIO
                    ? {
                        persistentStateIO: options.checkpointPersistentStateIO,
                        auditMode: "bounded-snapshot" as const,
                      }
                    : {}),
                };
              const checkpoint = actorEvidence
                ? await admitReceizProfileShowcaseCheckpointBundleV114(checkpointInput)
                : await admitReceizProfileShowcaseCheckpointBundleWithSourceActorBindingV114({
                  ...checkpointInput, actorPublicBinding: checkpointRecord.actorPublicBinding,
                });
              admission =
                await admitReceizProfileShowcaseCheckpointCarrierWithContextV114({
                  checkpoint,
                  candidateArtifact,
                });
            }
          }
        } else return null;
        const verified = admission;
        return verified
          && verified.profile === "profile-showcase"
          && verified.artifactSha256 === active.artifactDigest
          ? verified
          : null;
      } catch {
        return null;
      }
    },

    async resolveRetainedSegment(segmentId) {
      if (!SHA256_HEX_RE.test(segmentId)) return null;
      const retained = options.checkpointContentStore ? await options.checkpointContentStore.get(segmentId) : null;
      const segment = retained ? checkpointSegmentRecord(retained) : await readObject<SegmentRecord>(SEGMENT_STORE, segmentId, "PROFILE_SHOWCASE_BOUNDED_SEGMENT_READ_FAILED");
      if (!segment || segment.commitment.segmentId !== segmentId || !await verifyStoredSegment(segment)) return null;
      const { startOperationCount, endOperationCount, operationCount, root } = segment.commitment;
      return { segmentId, startOperationCount, endOperationCount, operationCount, root };
    },

    async resolveVerifiedHistoricalArtifactDigest(
      artifactId,
      descendantArtifactDigest,
      operationCount,
    ) {
      if (
        !SHA256_HEX_RE.test(descendantArtifactDigest)
        || !Number.isSafeInteger(operationCount)
        || operationCount < 0
      ) return null;
      const key = `${artifactId}:${descendantArtifactDigest}:${operationCount}`;
      const retained = verifiedHistoricalLookups.get(key);
      if (retained) return retained;
      const pending = resolveFromVerifiedHistoricalIndex(
        artifactId,
        descendantArtifactDigest,
        operationCount,
      ).catch((error) => {
        verifiedHistoricalLookups.delete(key);
        throw error;
      });
      verifiedHistoricalLookups.set(key, pending);
      return pending;
    },

    async readCompleteSource(artifactId, retainedArtifactDigest?: string, options = {}) {
      const source = retainedArtifactDigest
        ? await readVerifiedSourceProjection(artifactId, retainedArtifactDigest)
        : await readEffectiveSourceProjection(artifactId, true, this.resolveVerifiedHistoricalArtifactDigest);
      if (!source) return null;
      const key = source.artifactDigest + (options.retainedHiddenOnly ? ":retained-hidden" : "");
      let complete = completeSources.get(key);
      if (!complete) {
        complete = prepareCompleteSource(source, false, false, options.retainedHiddenOnly).catch((error) => {
          completeSources.delete(key);
          throw error;
        });
        completeSources.set(key, complete);
      }
      return structuredClone(await complete);
    },

    async readPublicationHead(artifactId) {
      // Receipt lookup only, never canonical admission. An unknown/unacked
      // locator still goes through exportCompleteSource's complete boundary.
      const active = await readObject<ActiveRecord>(ACTIVE_STORE, artifactId, "PROFILE_SHOWCASE_BOUNDED_EDGE_ACTIVE_READ_FAILED");
      if (!active) return null;
      const digest = active.replacementPresentationHold?.artifactDigest ?? active.artifactDigest;
      const head = await readObject<HeadRecord>(HEAD_STORE, digest, "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED");
      return head && head.artifactId === artifactId ? { artifactId, artifactDigest: head.artifactDigest, headKaiUpulse: head.headKaiUpulse, operationCount: head.operationCount } : null;
    },

    async isVerifiedPublicationAncestor(artifactId, ancestorDigest, descendantDigest) {
      if (ancestorDigest === descendantDigest) return true;
      const head = await readObject<HeadRecord>(HEAD_STORE, ancestorDigest, "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED");
      if (!head || head.artifactId !== artifactId || head.operationCount === undefined) return false;
      return await this.resolveVerifiedHistoricalArtifactDigest(artifactId, descendantDigest, head.operationCount) === ancestorDigest;
    },

    async exportOwnerSource(artifactId, retainedArtifactDigest?: string) {
      const complete = await this.readCompleteSource(artifactId, retainedArtifactDigest);
      if (!complete) return null;
      const history = new Map<string, ProfileShowcaseOwnerSource["history"][number]>();
      const historyNodes = new Map<string, ProfileShowcaseOwnerSource["historyNodes"][number]>();
      const segments = new Map<string, ProfileShowcaseCommittedSegment>();
      const children = new Map(complete.children.map(child => [child.reference.childArtifactDigest, {
        reference: structuredClone(child.reference), exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice(),
      }]));
      const collectedChildContexts = new Map<string, { artifactDigest: string; filename: string; mimeType: string }>();
      const actorPublicBindings = new Map<string, ReceizIdentityPublicBinding>();
      const checkpointSegments = new Map<string, string[]>();
      const sourceProvenance: ProfileShowcaseOwnerSource["sourceProvenance"][number][] = [];
      const requiredProvenance = new Set<string>();
      const pending = [complete.artifactDigest];
      const requireChild = async (reference: ProfileShowcaseChildReference) => {
        const retained = children.get(reference.childArtifactDigest);
        if (retained) {
          if (!sameSealedChildReference(retained.reference, reference)) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_CHILD_CONFLICT");
          return;
        }
        let stored = await readObject<ChildRecord>(CHILD_STORE, reference.childArtifactDigest, "PROFILE_SHOWCASE_OWNER_SOURCE_CHILD_MISSING");
        if (!stored && options.checkpointChildContentStore) {
          const candidate = await options.checkpointChildContentStore.getByEvidenceRoot(reference.admissionEvidenceRoot);
          if (candidate && sameSealedChildReference(candidate.reference, reference)) {
            const admission = await reopenWithRoots({ ...candidate, profile: "portable-state", roots });
            if (admission) stored = await projectAdmittedChild({ reference, admittedArtifact: admission });
          }
        }
        if (!stored) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_CHILD_MISSING");
        const child = await repairStoredChildProjection(stored, reference);
        collectedChildContexts.set(child.artifactDigest, { artifactDigest: child.artifactDigest, filename: child.filename, mimeType: child.mimeType });
        children.set(reference.childArtifactDigest, { reference: structuredClone(reference), exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice() });
      };
      const collectOperations = async (operations: readonly unknown[]) => {
        for (const candidate of operations) {
          if (!candidate || typeof candidate !== "object") throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_OPERATION_INVALID");
          const operation = candidate as Record<string, unknown>;
          if (operation.child && operation.kind === "showcase.append") await requireChild(operation.child as ProfileShowcaseChildReference);
          if (operation.kind === "showcase.provenance.bind" && typeof operation.operationDigest === "string") requiredProvenance.add(operation.operationDigest);
          if (Array.isArray(operation.mergedChildren)) for (const child of operation.mergedChildren) await requireChild(child as ProfileShowcaseChildReference);
        }
      };
      const collectSegment = async (segment: ProfileShowcaseCommittedSegment) => {
        if (!await verifyStoredSegment({ ...segment, segmentId: segment.commitment.segmentId })) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_INVALID");
        segments.set(segment.commitment.segmentId, structuredClone(segment));
        await collectOperations(segment.operations);
      };
      while (pending.length) {
        const artifactDigest = pending.pop()!;
        if (history.has(artifactDigest)) continue;
        const artifact = await readObject<ArtifactRecord>(ARTIFACT_STORE, artifactDigest, "PROFILE_SHOWCASE_OWNER_SOURCE_HISTORY_MISSING");
        if (!artifact || await sha256(artifact.exactSealedArtifactBytes) !== artifactDigest) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_HISTORY_MISSING");
        const verification = await verifyReceizArtifactWithCanonicalRoots(exactArtifactFile(artifact), roots);
        if (verification.status !== "verified-artifact") throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_HISTORY_INVALID");
        const canonical = await readRuntimeCustodiedReceizArtifactCanonicalOpen(verification, roots);
        if (!canonical) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_HISTORY_INVALID");
        const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes));
        if (payload.artifactId !== artifactId || payload.ownerReceizIdentity !== complete.carrier.ownerReceizIdentity) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_HISTORY_OWNER_MISMATCH");
        history.set(artifactDigest, { artifactDigest, filename: artifact.filename, mimeType: artifact.mimeType, exactSealedArtifactBytes: artifact.exactSealedArtifactBytes.slice() });
        for (const association of artifact.sourceProvenance ?? []) {
          const operation = (payload["profile-showcase"]?.directDelta ?? []).find((operation: Record<string, unknown>) => operation.operationDigest === association.operationDigest);
          if (operation?.kind !== "showcase.provenance.bind" || operation.provenanceEvidenceRoot !== association.sourceArtifactDigest) throw new TypeError("SHOWCASE_PROVENANCE_SOURCE_BINDING_INVALID");
          sourceProvenance.push({ artifactDigest, ...association });
          pending.push(association.sourceArtifactDigest);
        }
        const checkpoint = await readObject<CheckpointRecord>(CHECKPOINT_STORE, artifactDigest, "PROFILE_SHOWCASE_OWNER_SOURCE_CHECKPOINT_MISSING");
        if (checkpoint) {
          const historicalActor = !checkpoint.actorPublicBinding ? await options.resolveVerifiedCheckpointActorEvidence?.(checkpoint.actorArtifactDigest) : null;
          const publicBinding = checkpoint.actorPublicBinding ?? (historicalActor ? await readReceizIdentityPublicBinding(historicalActor) : null);
          if (!publicBinding || publicBinding.artifactSha256 !== checkpoint.actorArtifactDigest) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_ACTOR_BINDING_UNAVAILABLE");
          actorPublicBindings.set(publicBinding.artifactSha256, structuredClone(publicBinding));
          pending.push(checkpoint.checkpointArtifactDigest, checkpoint.predecessorArtifactDigest);
          const segmentIds: string[] = [];
          for (let index = 0; index < checkpoint.archiveSegmentCount; index++) {
            const entry = await readObject<CheckpointSegmentIndexRecord>(CHECKPOINT_SEGMENT_INDEX_STORE,
              `${checkpoint.checkpointArtifactDigest}:${index}`, "PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
            if (!entry) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
            segmentIds.push(entry.segmentId);
            if (options.checkpointContentStore) {
              const source = await options.checkpointContentStore.get(entry.segmentId);
              if (!source) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
              await collectSegment(checkpointSegmentRecord(source));
            } else {
              const source = await readObject<SegmentRecord>(SEGMENT_STORE, entry.segmentId, "PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
              if (!source) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
              await collectSegment(source);
            }
          }
          checkpointSegments.set(checkpoint.checkpointArtifactDigest, segmentIds);
        }
        if (payload.checkpointHistoryNode) historyNodes.set(payload.checkpointHistoryNode.nodeDigest, structuredClone(payload.checkpointHistoryNode));
        const proofHistory = payload.receizProofHistory;
        if (proofHistory?.currentNode) {
          historyNodes.set(proofHistory.currentNode.nodeDigest, structuredClone(proofHistory.currentNode));
          for (const parent of proofHistory.parentRefs ?? []) pending.push(parent.artifactDigest);
        } else if (Array.isArray(proofHistory?.nodes)) {
          for (const node of proofHistory.nodes) historyNodes.set(node.nodeDigest, structuredClone(node));
        }
        const head = payload["profile-showcase"];
        if (head) {
          await collectOperations(head.directDelta ?? []);
          for (const commitment of head.segmentWindow ?? []) {
            if (segments.has(commitment.segmentId)) continue;
            const segment = await readObject<SegmentRecord>(SEGMENT_STORE, commitment.segmentId, "PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
            if (!segment) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_SEGMENT_MISSING");
            await collectSegment(segment);
          }
        }
      }
      const childReadContexts = [];
      if ([...requiredProvenance].some(operationDigest => !sourceProvenance.some(association => association.operationDigest === operationDigest))) {
        const { ImportedProofSourceUnavailableError } = await import("./importedSourceErrors");
        throw new ImportedProofSourceUnavailableError("SHOWCASE_OWNER_PROVENANCE_CLOSURE_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "verified");
      }
      for (const child of children.values()) {
        const record = collectedChildContexts.get(child.reference.childArtifactDigest) ?? await readObject<ChildRecord>(CHILD_STORE, child.reference.childArtifactDigest, "PROFILE_SHOWCASE_OWNER_SOURCE_CHILD_CONTEXT_MISSING");
        if (!record) throw new TypeError("PROFILE_SHOWCASE_OWNER_SOURCE_CHILD_CONTEXT_MISSING");
        childReadContexts.push({ artifactDigest: record.artifactDigest, filename: record.filename, mimeType: record.mimeType });
      }
      return Object.freeze({ artifactDigest: complete.artifactDigest, exactSealedArtifactBytes: complete.exactSealedArtifactBytes.slice(),
        childReadContexts: Object.freeze(childReadContexts),
        witnessNodes: structuredClone(complete.witnessNodes), children: Object.freeze([...children.values()]),
        ...(complete.legacyPredecessor ? { legacyPredecessor: structuredClone(complete.legacyPredecessor) } : {}),
        actorPublicBindings: Object.freeze([...actorPublicBindings.values()]),
        checkpointSegments: Object.freeze([...checkpointSegments].map(([checkpointArtifactDigest, segmentIds]) => ({ checkpointArtifactDigest, segmentIds }))),
        sourceProvenance: Object.freeze(sourceProvenance),
        history: Object.freeze([...history.values()]), historyNodes: Object.freeze([...historyNodes.values()]), segments: Object.freeze([...segments.values()]) });
    },

    async exportCompleteSource(artifactId, ancestorArtifactDigest) {
      const current = ancestorArtifactDigest ? await this.readPublicationHead(artifactId) : null;
      if (ancestorArtifactDigest && (!current || ancestorArtifactDigest !== current.artifactDigest
        && !await this.isVerifiedPublicationAncestor(artifactId, ancestorArtifactDigest, current.artifactDigest))) return null;
      const source = ancestorArtifactDigest && ancestorArtifactDigest !== current?.artifactDigest
        ? await readVerifiedSourceProjection(artifactId, ancestorArtifactDigest, undefined, true)
        : null;
      const publicSource = source ?? await readEffectiveSourceProjection(artifactId, true, this.resolveVerifiedHistoricalArtifactDigest);
      const complete = publicSource ? await prepareCompleteSource(publicSource, true) : null;
      if (!complete) return null;
      const visible = new Set(complete.placements.filter((placement) => placement.visibility === "visible")
        .map((placement) => placement.reference.childArtifactDigest));
      // Exact held checkpoint/history is public source evidence. Its identity
      // artifact remains exclusively in private custody.
      const checkpoint = await readObject<CheckpointRecord>(CHECKPOINT_STORE, complete.artifactDigest,
        "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING");
      let checkpointBoundary: ProfileShowcaseCompletePublicSource["checkpointBoundary"];
      if (checkpoint) {
        const artifact = await readObject<ArtifactRecord>(ARTIFACT_STORE, checkpoint.checkpointArtifactDigest,
          "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
        const predecessor = await readObject<ArtifactRecord>(ARTIFACT_STORE, checkpoint.predecessorArtifactDigest,
          "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
        if (!artifact || !predecessor || await sha256(artifact.exactSealedArtifactBytes) !== checkpoint.checkpointArtifactDigest
          || await sha256(predecessor.exactSealedArtifactBytes) !== checkpoint.predecessorArtifactDigest) {
          throw new TypeError("PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE");
        }
        checkpointBoundary = { artifactDigest: checkpoint.checkpointArtifactDigest,
          exactSealedArtifactBytes: artifact.exactSealedArtifactBytes.slice(),
          predecessor: { artifactDigest: checkpoint.predecessorArtifactDigest, exactSealedArtifactBytes: predecessor.exactSealedArtifactBytes.slice() } };
      }
            // Supplemental causal evidence, not another public presentation.
      // Follow sealed parent references; never enumerate the private owner vault.
      type AncestryNode = Pick<
        ProfileShowcaseCompleteSource,
        "artifactDigest" | "exactSealedArtifactBytes" | "carrier"
      >;
      const ancestors = new Map<string, AncestryNode>();
      const pending: AncestryNode[] = [complete];

      while (pending.length > 0) {
        const current = pending.pop()!;
        const currentHead = current.carrier["profile-showcase"];
        const parents =
          currentHead.parentHeads as readonly Record<string, unknown>[];
        const historyParents =
          current.carrier.receizProofHistory.parentRefs;

        if (
          !Array.isArray(parents) ||
          parents.length !== historyParents.length
        ) {
          throw new TypeError(
            "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
          );
        }

        for (const parent of parents) {
          const digest = parent.artifactDigest;
          const historyParent = historyParents.find(
            value => value.artifactDigest === digest,
          );

          if (
            typeof digest !== "string" ||
            !SHA256_HEX_RE.test(digest) ||
            digest === complete.artifactDigest ||
            !historyParent ||
            typeof parent.operationCount !== "number" ||
            !Number.isSafeInteger(parent.operationCount) ||
            parent.operationCount < 0
          ) {
            throw new TypeError(
              "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
            );
          }

          let ancestor = ancestors.get(digest);
          const previouslyRead = ancestor !== undefined;

          if (!ancestor) {
            const artifact = await readObject<ArtifactRecord>(
              ARTIFACT_STORE,
              digest,
              "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_READ_FAILED",
            );

            if (!artifact) {
              throw new Error(
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_MISSING",
              );
            }

            const ancestorBytes =
              artifact.exactSealedArtifactBytes.slice();

            if (
              artifact.artifactDigest !== digest ||
              artifact.ownerReceizIdentity !==
                complete.carrier.ownerReceizIdentity ||
              await sha256(ancestorBytes) !== digest
            ) {
              throw new TypeError(
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
              );
            }

            const verification =
              await verifyReceizArtifactWithCanonicalRoots(
                exactArtifactFile({
                  ...artifact,
                  exactSealedArtifactBytes: ancestorBytes,
                }),
                roots,
              );

            if (verification.status !== "verified-artifact") {
              throw new TypeError(
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
              );
            }

            const retainedHead = await readObject<HeadRecord>(
              HEAD_STORE,
              digest,
              "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_READ_FAILED",
            );

            if (!retainedHead) {
              // Checkpoint/legacy artifacts keep their dedicated verification
              // paths. Do not turn either into a fabricated bounded ancestor or
              // export private recovery/child inventories to bridge the gap.
              const boundary = await readObject<CheckpointRecord>(
                CHECKPOINT_STORE,
                current.artifactDigest,
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_READ_FAILED",
              );

              if (boundary?.checkpointArtifactDigest === digest) {
                if (
                  boundary.artifactDigest !== current.artifactDigest ||
                  boundary.checkpointHistoryNodeDigest !==
                    parent.historyHeadDigest ||
                  historyParent.nodeDigest !== parent.historyHeadDigest
                ) {
                  throw new TypeError(
                    "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
                  );
                }

                continue;
              }

              const legacy =
                await inspectReceizLegacyProfileShowcaseV114({
                  verification,
                  ownerConstraint: complete.carrier.ownerReceizIdentity,
                  dependencies: {
                    canonicalSignatureV4RootPublicKeys: roots,
                  },
                });

              if (
                legacy.artifactSha256 !== digest ||
                legacy.artifactId !== artifactId ||
                legacy.historyHeadDigest !== parent.historyHeadDigest ||
                legacy.historyHeadDigest !== historyParent.nodeDigest ||
                legacy.headKaiUpulse !== parent.headKaiUpulse ||
                legacy.resultingOperationCount !== parent.operationCount ||
                legacy.currentStateRoot !== parent.stateRoot
              ) {
                throw new TypeError(
                  "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
                );
              }

              continue;
            }

            if (
              retainedHead.artifactId !== artifactId ||
              retainedHead.artifactDigest !== digest
            ) {
              throw new TypeError(
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
              );
            }

            const inspection =
              await inspectReceizBoundedProfileShowcaseV114({
                verification,
                ownerConstraint: complete.carrier.ownerReceizIdentity,
                dependencies: {
                  canonicalSignatureV4RootPublicKeys: roots,
                },
              });

            const carrier =
              readReceizBoundedProfileShowcaseInspectionCarrier(
                inspection,
              );

            if (
              inspection.artifactSha256 !== digest ||
              carrier.artifactId !== artifactId ||
              carrier.ownerReceizIdentity !==
                complete.carrier.ownerReceizIdentity
            ) {
              throw new TypeError(
                "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_INVALID",
              );
            }

            await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(
              carrier,
            );

            ancestor = {
              artifactDigest: digest,
              exactSealedArtifactBytes: ancestorBytes,
              carrier,
            };
          }

          const ancestorHead = ancestor.carrier["profile-showcase"];
          const ancestorHistory = ancestor.carrier.receizProofHistory;

          // Check each incoming edge, including a shared parent already read
          // through the other side of a merge. Counts alone never establish it.
          if (
            parent.operationCount >=
              Number(currentHead.resultingOperationCount) ||
            ancestorHead.resultingOperationCount !== parent.operationCount ||
            ancestorHead.headKaiUpulse !== parent.headKaiUpulse ||
            ancestorHead.currentStateRoot !== parent.stateRoot ||
            ancestorHistory.headDigest !== parent.historyHeadDigest ||
            ancestorHistory.headDigest !== historyParent.nodeDigest ||
            ancestorHistory.nodeCount !== historyParent.nodeCount ||
            ancestorHistory.accumulator.root !== historyParent.accumulatorRoot
          ) {
            throw new TypeError(
              "PROFILE_SHOWCASE_PUBLIC_ANCESTRY_MISMATCH",
            );
          }

          if (!previouslyRead) {
            ancestors.set(digest, ancestor);
            pending.push(ancestor);
          }
        }
      }

      const ancestry: readonly ProfileShowcasePublicAncestryArtifact[] =
        Object.freeze(
          [...ancestors.values()]
            .sort((left, right) =>
              left.artifactDigest.localeCompare(right.artifactDigest),
            )
            .map(ancestor =>
              Object.freeze({
                artifactDigest: ancestor.artifactDigest,
                exactSealedArtifactBytes:
                  ancestor.exactSealedArtifactBytes.slice(),
              }),
            ),
        );
          const exported = Object.freeze({ artifactDigest: complete.artifactDigest,
        ancestry,
        exactSealedArtifactBytes: complete.exactSealedArtifactBytes.slice(),
        ...(checkpointBoundary ? { checkpointBoundary } : {}),
        witnessNodes: structuredClone(complete.witnessNodes),
        ...(complete.legacyPredecessor ? { legacyPredecessor: structuredClone(complete.legacyPredecessor) } : {}),
        children: Object.freeze(complete.children.filter((child) => visible.has(child.reference.childArtifactDigest))
          .map((child) => ({ reference: structuredClone(child.reference), exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice() }))) });
      const head = complete.carrier["profile-showcase"];
      const actorRoots = (head.directDelta as readonly Record<string, unknown>[]).flatMap(operation =>
        typeof operation.authorityEvidenceRoot === "string" ? [operation.authorityEvidenceRoot] : []);
      const event = complete.carrier.receizProofHistory.currentNode.event;
      if (event.type === "profile-showcase.transition" && event.actorEvidenceRoot) actorRoots.push(event.actorEvidenceRoot);
      if (checkpoint) actorRoots.push(checkpoint.verifiedProjection.actorEvidenceRoot);
      const currentActorEvidenceRoots = Object.freeze([...new Set(actorRoots)]);
      actorRoots.push(...(completeLegacyActorRoots.get(complete.artifactDigest) ?? []));
      publicSourceActorCustody.set(exported, Object.freeze({ actorId: head.profileIdentity as string,
        roots: Object.freeze([...new Set(actorRoots)]), currentActorEvidenceRoots }));
      // Only the currently held head may replace the reusable export. A slow
      // export of an ancestor must not displace an already advanced source.
      const latest = await this.readPublicationHead(artifactId);
      if (latest?.artifactDigest === complete.artifactDigest
        && heldPublicSources.get(artifactId)?.source.artifactDigest !== complete.artifactDigest) {
        heldPublicSources.set(artifactId, Object.freeze({ source: exported,
          complete, pulse: String(head.headKaiUpulse) }));
        for (const listener of publicSourceListeners) {
          try { listener(artifactId); } catch { /* UI observation cannot interrupt source export. */ }
        }
      }
      return exported;
    },

    async readFirstPaint(artifactId) {
      return readEffectiveSourceProjection(artifactId, false, this.resolveVerifiedHistoricalArtifactDigest);
    },

    async beginVisibilityTransition(input) {
      const originalId = input.originalId.trim();
      if (!originalId) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ORIGINAL_REQUIRED");
      }
      const db = await database;
      const transaction = db.transaction(
        VISIBILITY_TRANSITION_STORE,
        "readwrite",
      );
      transaction.objectStore(VISIBILITY_TRANSITION_STORE).put({
        transitionKey: `${input.artifactId}\u0000${originalId}`,
        artifactId: input.artifactId,
        originalId,
        showOnProfile: input.showOnProfile,
        createdAtMs: Date.now(),
      } satisfies VisibilityTransitionRecord);
      await transactionComplete(transaction);
      visibilityTransitionRuntimeQuarantine.add(input.artifactId);
    },

    async retainVisibilityPropagationIntent(input) {
      if (!isRuntimeCustodiedProfileShowcaseBoundedFirstPaint(input.acceptedSource)) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_SOURCE_REQUIRED");
      }
      const sourceArtifactId = input.acceptedSource.carrier.artifactId as ProfileShowcaseArtifactId;
      if (await sha256(input.acceptedSource.exactSealedArtifactBytes) !== input.acceptedSource.artifactDigest) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_SOURCE_MISMATCH");
      }
      const storedSource = await readVerifiedSourceProjection(sourceArtifactId, input.acceptedSource.artifactDigest);
      if (!storedSource || canonicalizeReceizConstitution(storedSource.carrier as never) !== canonicalizeReceizConstitution(input.acceptedSource.carrier as never)) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_SOURCE_MISMATCH");
      }
      const resolveIdentity = options.resolveVisibilityIdentityCustody
        ?? (await import("./composerIdentityCustodyResolver")).resolveComposerIdentityCustody;
      const routeOwner = input.artifactId.replace(/^profile-showcase:/, "");
      const identity = await resolveIdentity(routeOwner);
      if (!identity || sourceArtifactId !== `profile-showcase:${identity.ownerReceizId}`) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_OWNER_MISMATCH");
      }
      const current = await this.reopenHead(sourceArtifactId);
      const acceptedCount = storedSource.carrier["profile-showcase"].resultingOperationCount as number;
      const acceptedDigest = current && current.artifactSha256 !== storedSource.artifactDigest
        ? await this.resolveVerifiedHistoricalArtifactDigest(sourceArtifactId, current.artifactSha256, acceptedCount)
        : current?.artifactSha256;
      if (!current || acceptedDigest !== storedSource.artifactDigest) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_SOURCE_MISMATCH");
      }
      const direct = await this.resolveOriginalChildReference(sourceArtifactId, input.originalId);
      const operations = storedSource.carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[];
      const last = operations.at(-1);
      const lastChild = last?.child as Record<string, unknown> | undefined;
      let carriesChoice = Boolean(direct && last?.kind === "showcase.visibility.set"
        && lastChild?.childArtifactDigest === direct.childArtifactDigest
        && lastChild.immutableVersion === direct.immutableVersion
        && last.visibility === (input.showOnProfile ? "visible" : "hidden"));
      for (const child of storedSource.visibleChildren) {
        if (child.verifiedPayloadMimeType !== COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME) continue;
        const original = decodeCompleteLegacyShowcaseMigrationPayload(child.verifiedPayloadBytes).find(original => original.id === input.originalId);
        if (original?.showOnProfile === input.showOnProfile) carriesChoice = true;
      }
      if (!carriesChoice) throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ACCEPTED_CHOICE_REQUIRED");
      const db = await database;
      const transaction = db.transaction(VISIBILITY_TRANSITION_STORE, "readwrite");
      const store = transaction.objectStore(VISIBILITY_TRANSITION_STORE);
      const currentIntent = await requestResult(store.get(`${input.artifactId}\u0000${input.originalId}`), "PROFILE_SHOWCASE_VISIBILITY_TRANSITION_READ_FAILED") as VisibilityTransitionRecord | undefined;
      const expected = input.expectedIntent;
      const stillCurrent = expected
        ? expected.artifactId === input.artifactId
          && expected.originalId === input.originalId
          && expected.showOnProfile === input.showOnProfile
          && expected.acceptedArtifactDigest === storedSource.artifactDigest
          && currentIntent?.createdAtMs === expected.createdAtMs
          && currentIntent.showOnProfile === expected.showOnProfile
          && currentIntent.acceptedArtifactDigest === expected.acceptedArtifactDigest
        : currentIntent === undefined;
      if (!stillCurrent) {
        await transactionComplete(transaction);
        return;
      }
      store.put({
        transitionKey: `${input.artifactId}\u0000${input.originalId}`,
        artifactId: input.artifactId,
        originalId: input.originalId,
        showOnProfile: input.showOnProfile,
        createdAtMs: Date.now(),
        acceptedArtifactDigest: storedSource.artifactDigest,
      } satisfies VisibilityTransitionRecord);
      const remaining = await requestResult(store.index("artifactId").getAll(input.artifactId), "PROFILE_SHOWCASE_VISIBILITY_TRANSITION_READ_FAILED") as VisibilityTransitionRecord[];
      await transactionComplete(transaction);
      if (remaining.some(record => !record.acceptedArtifactDigest)) {
        visibilityTransitionRuntimeQuarantine.add(input.artifactId);
      } else {
        visibilityTransitionRuntimeQuarantine.delete(input.artifactId);
      }
    },

    async clearVisibilityTransition(artifactId, originalId) {
      const normalizedOriginalId = originalId.trim();
      if (!normalizedOriginalId) return;
      const db = await database;
      const transaction = db.transaction(
        VISIBILITY_TRANSITION_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(VISIBILITY_TRANSITION_STORE);
      store.delete(`${artifactId}\u0000${normalizedOriginalId}`);
      const remaining = await requestResult(
        store.index("artifactId").getAll(artifactId),
        "PROFILE_SHOWCASE_VISIBILITY_TRANSITION_READ_FAILED",
      ) as VisibilityTransitionRecord[];
      await transactionComplete(transaction);
      if (remaining.some(record => !record.acceptedArtifactDigest)) {
        visibilityTransitionRuntimeQuarantine.add(artifactId);
      } else {
        visibilityTransitionRuntimeQuarantine.delete(artifactId);
      }
    },

    async pendingVisibilityTransitions(artifactId) {
      const db = await database;
      const store = db.transaction(
        VISIBILITY_TRANSITION_STORE,
        "readonly",
      ).objectStore(VISIBILITY_TRANSITION_STORE);
      const records = await requestResult(
        artifactId
          ? store.index("artifactId").getAll(artifactId)
          : store.getAll(),
        "PROFILE_SHOWCASE_VISIBILITY_TRANSITION_READ_FAILED",
      ) as VisibilityTransitionRecord[];
      if (artifactId) {
        if (records.some(record => !record.acceptedArtifactDigest)) {
          visibilityTransitionRuntimeQuarantine.add(artifactId);
        } else {
          visibilityTransitionRuntimeQuarantine.delete(artifactId);
        }
      }
      return Object.freeze(records
        .filter((record) =>
          !artifactId || record.artifactId === artifactId)
        .sort((left, right) =>
          left.createdAtMs - right.createdAtMs
          || left.transitionKey.localeCompare(right.transitionKey))
        .map((record) => Object.freeze({
          artifactId: record.artifactId,
          originalId: record.originalId,
          showOnProfile: record.showOnProfile,
          createdAtMs: record.createdAtMs,
          ...(record.acceptedArtifactDigest ? { acceptedArtifactDigest: record.acceptedArtifactDigest } : {}),
        })));
    },

    async resolveOriginalChildReference(artifactId, originalId) {
      const normalizedOriginalId = originalId.trim();
      if (!normalizedOriginalId) return null;
      const db = await database;
      const indexKey = `${artifactId}\u0000${normalizedOriginalId}`;
      const indexed = await requestResult(
        db.transaction(ORIGINAL_CHILD_INDEX_STORE, "readonly")
          .objectStore(ORIGINAL_CHILD_INDEX_STORE)
          .get(indexKey),
        "PROFILE_SHOWCASE_ORIGINAL_CHILD_INDEX_READ_FAILED",
      ) as OriginalChildIndexRecord | undefined;
      const verifyIndexed = async (
        candidate: OriginalChildIndexRecord,
      ): Promise<ProfileShowcaseChildReference | null> => {
        if (
          candidate.artifactId !== artifactId
          || candidate.originalId !== normalizedOriginalId
        ) return null;
        const child = await readObject<ChildRecord>(
          CHILD_STORE,
          candidate.childArtifactDigest,
          "PROFILE_SHOWCASE_ORIGINAL_CHILD_READ_FAILED",
          candidate.childArtifactDigest,
        );
        if (
          !child
          || !sameSealedChildReference(child.reference, candidate.reference)
          || !(child.verifiedProjection.routeProjectionBytes instanceof Uint8Array)
          || await sha256(child.verifiedProjection.routeProjectionBytes)
            !== child.verifiedProjection.routeProjectionSha256
        ) return null;
        try {
          const projection = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(
              child.verifiedProjection.routeProjectionBytes,
            ),
          ) as Record<string, unknown>;
          return projection.id === normalizedOriginalId
            ? structuredClone(child.reference)
            : null;
        } catch {
          return null;
        }
      };
      if (indexed) {
        const reference = await verifyIndexed(indexed);
        if (reference) return reference;
      }

      // Visibility is presentation, never the custody boundary for a mutation.
      // Older stores (and interrupted index writes) may lack this derivative.
      // Recover membership from the accepted sealed source, including hidden
      // placements and while an unaccepted visibility intent quarantines paint.
      const source = await readVerifiedSourceProjection(artifactId, undefined, undefined, true);
      if (!source) return null;
      const complete = await prepareCompleteSource(source, false, true);
      const membershipCounts = new Map(complete.placements.map(placement => [
        childSourceKey(placement.reference as ProfileShowcaseChildReference), placement.membershipOperationCount,
      ]));
      const candidates = complete.children.filter((candidate) => {
        if (!(candidate.verifiedRouteProjectionBytes instanceof Uint8Array)) {
          return false;
        }
        try {
          const projection = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(
              candidate.verifiedRouteProjectionBytes,
            ),
          ) as Record<string, unknown>;
          return projection.id === normalizedOriginalId;
        } catch {
          return false;
        }
      }).sort((left, right) => membershipCounts.get(childSourceKey(right.reference))!
        - membershipCounts.get(childSourceKey(left.reference))!);
      // A replacement retains its predecessor in hidden source history. Route
      // identity must resolve to the later accepted membership append, never
      // whichever historical child happens to precede it in presentation order.
      const child = candidates[0];
      if (!child) return null;
      if (candidates[1] && membershipCounts.get(childSourceKey(child.reference))
        === membershipCounts.get(childSourceKey(candidates[1].reference))) {
        throw new TypeError("PROFILE_SHOWCASE_ORIGINAL_CHILD_INDEX_AMBIGUOUS");
      }
      const rebuilt: OriginalChildIndexRecord = {
        indexKey,
        artifactId,
        originalId: normalizedOriginalId,
        childArtifactDigest: child.reference.childArtifactDigest,
        reference: structuredClone(child.reference),
      };
      const transaction = db.transaction(
        ORIGINAL_CHILD_INDEX_STORE,
        "readwrite",
      );
      transaction.objectStore(ORIGINAL_CHILD_INDEX_STORE).put(rebuilt);
      await transactionComplete(transaction);
      return structuredClone(child.reference);
    },

    async reopenRetainedChild(reference) {
      const known = canonicalChildAdmissions.get(childSourceKey(reference));
      if (known) return known;
      const stored = await readObject<ChildRecord>(CHILD_STORE, reference.childArtifactDigest, "PROFILE_SHOWCASE_RETAINED_CHILD_REQUIRED");
      if (!stored || !sameSealedChildReference(stored.reference, reference)) return null;
      const admission = await reopenWithRoots({ ...stored, profile: "portable-state", roots });
      if (!admission || admission.profile !== "portable-state" || !exactChildReference(reference, admission)) return null;
      await projectAdmittedChild({ reference, admittedArtifact: admission }, admission);
      return canonicalChildAdmissions.get(childSourceKey(reference)) ?? null;
    },

    async resolveOriginalChildCustody(artifactId, originalId) {
      const normalizedOriginalId = originalId.trim();
      if (!normalizedOriginalId) return null;
      const reference = await this.resolveOriginalChildReference(
        artifactId,
        normalizedOriginalId,
      );
      if (!reference) return null;
      const child = await readObject<ChildRecord>(
        CHILD_STORE,
        reference.childArtifactDigest,
        "PROFILE_SHOWCASE_ORIGINAL_CHILD_READ_FAILED",
        reference.childArtifactDigest,
      );
      if (
        !child
        || !sameSealedChildReference(child.reference, reference)
        || child.verifiedProjection.schema
          !== "receiz.profile-showcase.verified-child-projection.v114"
        || child.verifiedProjection.admissionEvidenceRoot
          !== reference.admissionEvidenceRoot
        || child.verifiedProjection.payloadSha256
          !== reference.stableChildArtifactId
        || !(child.verifiedProjection.payloadBytes instanceof Uint8Array)
        || !(child.verifiedProjection.routeProjectionBytes instanceof Uint8Array)
        || await sha256(child.exactSealedArtifactBytes)
          !== reference.childArtifactDigest
        || await sha256(child.verifiedProjection.payloadBytes)
          !== child.verifiedProjection.payloadSha256
        || await sha256(child.verifiedProjection.routeProjectionBytes)
          !== child.verifiedProjection.routeProjectionSha256
      ) return null;
      try {
        const projection = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
          child.verifiedProjection.routeProjectionBytes,
        )) as Record<string, unknown>;
        if (projection.id !== normalizedOriginalId) return null;
      } catch {
        return null;
      }
      return Object.freeze({
        reference: structuredClone(reference),
        exactSealedArtifactBytes: child.exactSealedArtifactBytes.slice(),
        verifiedPayloadBytes: child.verifiedProjection.payloadBytes.slice(),
        verifiedPayloadMimeType: child.verifiedProjection.payloadMimeType,
        verifiedRouteProjectionBytes: child.verifiedProjection.routeProjectionBytes.slice(),
      });
    },

    async resolveLegacyMigrationChildForOriginal(artifactId, originalId) {
      const normalizedOriginalId = originalId.trim();
      if (!normalizedOriginalId) return null;
      // Mutation/retry lookup uses accepted source custody even while its
      // presentation is quarantined. Public complete reads still obey holds.
      const source = await readVerifiedSourceProjection(artifactId, undefined, undefined, true);
      if (!source) return null;
      const findMigration = (children: ProfileShowcaseBoundedFirstPaint["visibleChildren"]) => {
        for (const child of children) {
          if (child.verifiedPayloadMimeType !== COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME) continue;
          try {
            const originals = decodeCompleteLegacyShowcaseMigrationPayload(child.verifiedPayloadBytes);
            if (!originals.some((original) => original.id === normalizedOriginalId)) continue;
            return Object.freeze({ reference: structuredClone(child.reference),
              verifiedPayloadBytes: child.verifiedPayloadBytes.slice(), originals });
          } catch {
            continue;
          }
        }
        return null;
      };
      const heldWindowMigration = findMigration(source.visibleChildren);
      if (heldWindowMigration) return heldWindowMigration;
      const complete = await prepareCompleteSource(source, false, true);
      const visibleReferences = new Set(complete.placements
        .filter((placement) => placement.visibility === "visible")
        .map((placement) => childSourceKey(placement.reference as ProfileShowcaseChildReference)));
      return findMigration(complete.children.filter((child) => visibleReferences.has(childSourceKey(child.reference))));
    },

    async recoverSegment(artifactDigest, segmentId) {
      const head = await readObject<HeadRecord>(
        HEAD_STORE,
        artifactDigest,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED",
        artifactDigest,
      );
      if (!head || !head.segmentIds.includes(segmentId)) {
        throw new TypeError("PROFILE_SHOWCASE_SEGMENT_UNREFERENCED");
      }
      const restored = await this.readFirstPaint(head.artifactId);
      if (!restored || restored.artifactDigest !== artifactDigest) {
        throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ARTIFACT_REOPEN_REQUIRED");
      }
      const segment = restored.segments.find(
        (candidate) => candidate.commitment.segmentId === segmentId,
      );
      if (!segment) throw new TypeError("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
      return { operations: structuredClone(segment.operations), readOperations: 0 };
    },

    async inspect(artifactDigest) {
      const head = await readObject<HeadRecord>(
        HEAD_STORE,
        artifactDigest,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED",
        artifactDigest,
      );
      const artifact = await readObject<ArtifactRecord>(
        ARTIFACT_STORE,
        artifactDigest,
        "PROFILE_SHOWCASE_BOUNDED_EDGE_ARTIFACT_READ_FAILED",
        artifactDigest,
      );
      if (!head || !artifact) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_HEAD_READ_FAILED");
      const db = await database;
      const transaction = db.transaction(HISTORY_NODE_STORE, "readonly");
      const nodeCount = await requestResult(
        transaction.objectStore(HISTORY_NODE_STORE).count(),
        "PROFILE_SHOWCASE_BOUNDED_EDGE_HISTORY_READ_FAILED",
      );
      noteRequest(artifactDigest, "reads", HISTORY_NODE_STORE);
      const children = (await Promise.all(head.childArtifactDigests.map((digest) =>
        readObject<ChildRecord>(
          CHILD_STORE,
          digest,
          "PROFILE_SHOWCASE_BOUNDED_CHILD_READ_FAILED",
          artifactDigest,
        )))).filter((value): value is ChildRecord => value !== null);
      const segments = (await Promise.all(head.segmentIds.map((segmentId) =>
        readObject<SegmentRecord>(
          SEGMENT_STORE,
          segmentId,
          "PROFILE_SHOWCASE_SEGMENT_RECOVERY_MISSING",
          artifactDigest,
        )))).filter((value): value is SegmentRecord => value !== null);
      const checkpoint = await readObject<CheckpointRecord>(
        CHECKPOINT_STORE,
        artifactDigest,
        "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING",
        artifactDigest,
      );
      const checkpointArtifact = checkpoint
        ? await readObject<ArtifactRecord>(
            ARTIFACT_STORE,
            checkpoint.checkpointArtifactDigest,
            "PROFILE_SHOWCASE_CHECKPOINT_BOUNDARY_MISSING",
            artifactDigest,
          )
        : null;
      let immutableArchiveSegmentBytes = 0;
      if (checkpoint) {
        for (
          let segmentIndex = 0;
          segmentIndex < checkpoint.archiveSegmentCount;
          segmentIndex += 1
        ) {
          const indexRecord = await readObject<CheckpointSegmentIndexRecord>(
            CHECKPOINT_SEGMENT_INDEX_STORE,
            `${checkpoint.checkpointArtifactDigest}:${segmentIndex}`,
            "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_INDEX_MISSING",
            artifactDigest,
          );
          if (!indexRecord) {
            throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_INDEX_MISSING");
          }
          if (options.checkpointContentStore) {
            noteRequest(
              artifactDigest,
              "reads",
              "bounded-checkpoint-content-segments",
            );
            const segment = await options.checkpointContentStore.get(indexRecord.segmentId);
            if (!segment) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING");
            immutableArchiveSegmentBytes += segment.bytes.byteLength;
          } else {
            const segment = await readObject<SegmentRecord>(
              SEGMENT_STORE,
              indexRecord.segmentId,
              "PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING",
              artifactDigest,
            );
            if (!segment) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_SEGMENT_MISSING");
            immutableArchiveSegmentBytes += segment.bytes.byteLength;
          }
        }
      }
      const headReferenceBytes = new TextEncoder().encode(JSON.stringify(head)).byteLength;
      const counts = requestCounts.get(artifactDigest) ?? { reads: {}, writes: {} };
      const readOperations = Object.values(counts.reads)
        .reduce((sum, value) => sum + value, 0);
      const writeOperations = Object.values(counts.writes)
        .reduce((sum, value) => sum + value, 0);
      return {
        headReferenceBytes,
        segmentReferenceBytes: new TextEncoder().encode(
          JSON.stringify(head.segmentIds),
        ).byteLength,
        exactArtifactBytes: artifact.exactSealedArtifactBytes.byteLength,
        checkpointBundleBytes: checkpointArtifact?.exactSealedArtifactBytes.byteLength ?? 0,
        immutableChildBytes: children.reduce(
          (sum, child) => sum + child.exactSealedArtifactBytes.byteLength,
          0,
        ),
        immutableSegmentBytes: segments.reduce(
          (sum, segment) => sum + segment.bytes.byteLength,
          0,
        ),
        immutableArchiveSegmentBytes,
        maxLiveOperations: checkpoint?.maxLiveOperations ?? 0,
        maxLiveSegments: checkpoint?.maxLiveSegments ?? 0,
        maxLiveSegmentBytes: checkpoint?.maxLiveSegmentBytes ?? 0,
        actualReadRequestsByStore: Object.freeze({ ...counts.reads }),
        actualWriteRequestsByStore: Object.freeze({ ...counts.writes }),
        serializedRecordBytes: headReferenceBytes,
        historyNodeObjectCount: nodeCount,
        cumulativeArrayKeys: cumulativeArrayKeys(head),
        foregroundChildArtifactReopens:
          foregroundChildArtifactReopens.get(artifactDigest) ?? 0,
        foregroundChildAdmissionProjectionReads:
          foregroundChildAdmissionProjectionReads.get(artifactDigest) ?? 0,
        readOperations,
        writeOperations,
      };
    },
  });
}
