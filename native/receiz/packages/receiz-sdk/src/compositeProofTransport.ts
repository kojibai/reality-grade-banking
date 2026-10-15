import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { digestReceizAuthority, encodeReceizAuthority } from "./authorityEncoding.js";
import {
  createReceizProofHistoryNode,
  type ReceizProofHistoryNode,
} from "./proofHistory.js";
import {
  canonicalizeReceizProfileShowcaseTransitionOperationsV114,
  assertReceizProfileShowcaseTransitionOperationsV114,
} from "./profileShowcaseTransport.js";
import {
  RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
  assertReceizEconomyShowcaseHeadV114TransportContract,
  type ReceizEconomyShowcaseHeadV114,
} from "./economyShowcaseTransport.js";
import {
  appendReceizCompositeMerkleLeaf,
  assertReceizCompositeMerkleState,
  buildReceizCompositeBoundedTree,
  buildReceizCompositeMerkleParent,
  createEmptyReceizCompositeMerkleState,
  digestReceizCompositeCanonical,
  receizCompositeFibonacciDistancesUpTo,
} from "./compositeProofKernel.js";
import {
  createEmptyReceizProfileShowcasePersistentStateV114,
  createReceizProfileShowcasePersistentMemoryStoreV114,
  deriveReceizProfileShowcasePersistentWindowV114,
  reduceReceizProfileShowcasePersistentStateV114,
  type ReceizProfileShowcasePersistentNodeV114,
  type ReceizProfileShowcasePersistentStateIOV114,
  type ReceizProfileShowcasePersistentStateV114,
} from "./profileShowcasePersistentState.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const PROFILE_SEGMENT_CAPACITY = 256;
const PROFILE_SEGMENT_AUTHORITY = Object.freeze({
  segmentIsProofAuthority: false,
  rootIsProofAuthority: false,
  witnessIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  admissionStatus: "requires-sealed-showcase-artifact",
} as const);

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  const actual = Object.keys(value);
  if (actual.length !== keys.length
    || actual.some((key) => !keys.includes(key))
    || keys.some((key) => !(key in value))) fail(code);
}

function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function digest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_RE.test(value);
}

export type ReceizCompositeMerkleTransport = Readonly<{
  algorithm: "sha256/binary-carry/v1";
  leafCount: number;
  root: string;
  frontier: readonly (string | null)[];
}>;

export type ReceizProofHistoryParentReference = Readonly<{
  nodeDigest: string;
  artifactDigest: string;
  nodeCount: number;
  accumulatorRoot: string;
}>;

export type ReceizCarriedProofHistoryHeadV114 = Readonly<{
  schema: "receiz.carried-proof-history-head.v114";
  artifactId: string;
  registryDigest: string;
  rootDigest: string;
  headDigest: string;
  nodeCount: number;
  accumulator: ReceizCompositeMerkleTransport;
  currentNode: ReceizProofHistoryNode;
  parentRefs: readonly ReceizProofHistoryParentReference[];
  commitmentDigest: string;
}>;

export type ReceizBoundedProfileShowcaseCarrierV114 = Readonly<{
  schema: "receiz.profile-showcase-carrier.v114";
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  "profile-showcase": Readonly<Record<string, unknown>>;
  receizProofHistory: ReceizCarriedProofHistoryHeadV114;
}>;

export type ReceizEconomyShowcaseCarrierV114 = Readonly<{
  schema: "receiz.economy-showcase-carrier.v114";
  artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
  "economy-showcase": ReceizEconomyShowcaseHeadV114;
  receizProofHistory: ReceizCarriedProofHistoryHeadV114;
}>;

export type ReceizProfileShowcaseSegmentMechanicsV114 = Readonly<{
  schema: "receiz.profile-showcase.segment.v1";
  commitment: Readonly<{
    segmentId: string;
    startOperationCount: number;
    endOperationCount: number;
    operationCount: number;
    root: string;
  }>;
  bytes: Uint8Array;
  operations: readonly ReceizConstitutionJson[];
  segmentBytesDigest: string;
  witnesses: readonly Readonly<Record<string, unknown>>[];
  membershipWitnesses: readonly Readonly<Record<string, unknown>>[];
  authority: typeof PROFILE_SEGMENT_AUTHORITY;
}>;

export async function digestReceizProfileShowcaseOperationLeafV114(
  operation: ReceizConstitutionJson,
): Promise<string> {
  return digestReceizAuthority(
    "operation",
    "receiz.profile-showcase.operation.v1",
    operation,
  );
}

export function deriveReceizProfileShowcaseNativeOperationDigestV114(
  operation: Readonly<Record<string, unknown>>,
): string {
  const { operationDigest: _operationDigest, ...basis } = operation;
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.native-operation.v114",
    operation: basis as ReceizConstitutionJson,
  });
}

export function deriveReceizProfileShowcasePersistentHeadDigestV114(input: Readonly<{
  state: ReceizProfileShowcasePersistentStateV114;
  merkleRoot: string;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.bounded-head-reference.v114",
    operationCount: input.state.counts.operationCount,
    maximumKaiUpulse: input.state.maximumKaiUpulse,
    merkleRoot: input.merkleRoot,
  });
}

async function createReceizProfileShowcaseSegmentMechanicsInternalV114(input: Readonly<{
  operations: readonly ReceizConstitutionJson[];
  startOperationCount: number;
  sequence: "transition-delta" | "checkpoint-archive";
}>): Promise<ReceizProfileShowcaseSegmentMechanicsV114> {
  if (
    !Number.isSafeInteger(input.startOperationCount)
    || input.startOperationCount < 0
    || input.operations.length === 0
    || input.operations.length > PROFILE_SEGMENT_CAPACITY
  ) fail("PROFILE_SHOWCASE_SEGMENT_OPERATIONS_INVALID");
  const operations = input.sequence === "checkpoint-archive"
    ? input.operations.map((operation) =>
        canonicalizeReceizProfileShowcaseTransitionOperationsV114([operation])[0]!)
    : canonicalizeReceizProfileShowcaseTransitionOperationsV114(
        input.operations,
      ) as readonly ReceizConstitutionJson[];
  operations.forEach((operation, index) => {
    if (
      !record(operation)
      || operation.priorCommittedCount !== (
        input.sequence === "checkpoint-archive"
          ? input.startOperationCount + index
          : input.startOperationCount
      )
      || operation.directDeltaPosition !== (
        input.sequence === "checkpoint-archive" ? 0 : index
      )
    ) fail("PROFILE_SHOWCASE_SEGMENT_RANGE_INVALID");
  });
  const leafDigests = await Promise.all(
    operations.map(digestReceizProfileShowcaseOperationLeafV114),
  );
  const tree = buildReceizCompositeBoundedTree(leafDigests);
  const endOperationCount = input.startOperationCount + operations.length;
  const commitmentBasis = {
    startOperationCount: input.startOperationCount,
    endOperationCount,
    operationCount: operations.length,
    root: tree.root,
    authority: PROFILE_SEGMENT_AUTHORITY,
  };
  const bytes = encodeReceizAuthority(
    "state",
    "receiz.profile-showcase.segment.v1",
    {
      schema: "receiz.profile-showcase.segment.v1",
      ...commitmentBasis,
      operations,
      authority: PROFILE_SEGMENT_AUTHORITY,
    },
  );
  const segmentBytesDigest = bytesToHex(sha256(bytes));
  const segmentId = await digestReceizAuthority(
    "idempotency",
    "receiz.profile-showcase.segment-id.v1",
    { ...commitmentBasis, bytesDigest: segmentBytesDigest },
  );
  const commitment = {
    segmentId,
    startOperationCount: input.startOperationCount,
    endOperationCount,
    operationCount: operations.length,
    root: tree.root,
  };
  const membershipWitnesses = Object.freeze(leafDigests.map((leafDigest, leafIndex) => Object.freeze({
    schema: "receiz.profile-showcase.membership-witness.v1",
    segmentId,
    segmentBytesDigest,
    startOperationCount: input.startOperationCount,
    endOperationCount,
    operationCount: operations.length,
    operationPosition: input.startOperationCount + leafIndex,
    leafIndex,
    leafDigest,
    siblings: tree.witnesses[leafIndex],
    authority: PROFILE_SEGMENT_AUTHORITY,
  })));
  return Object.freeze({
    schema: "receiz.profile-showcase.segment.v1",
    commitment,
    bytes: bytes.slice(),
    operations: Object.freeze(structuredClone(operations)),
    segmentBytesDigest,
    witnesses: membershipWitnesses,
    membershipWitnesses,
    authority: PROFILE_SEGMENT_AUTHORITY,
  });
}

export async function createReceizProfileShowcaseSegmentMechanicsV114(input: Readonly<{
  operations: readonly ReceizConstitutionJson[];
  startOperationCount: number;
}>): Promise<ReceizProfileShowcaseSegmentMechanicsV114> {
  return createReceizProfileShowcaseSegmentMechanicsInternalV114({
    ...input,
    sequence: "transition-delta",
  });
}

export async function createReceizProfileShowcaseCheckpointSegmentV114(input: Readonly<{
  operations: readonly ReceizConstitutionJson[];
  startOperationCount: number;
}>): Promise<ReceizProfileShowcaseSegmentMechanicsV114> {
  return createReceizProfileShowcaseSegmentMechanicsInternalV114({
    ...input,
    sequence: "checkpoint-archive",
  });
}

export type ReceizProfileShowcaseCheckpointBundleV114 = Readonly<{
  schema: "receiz.profile-showcase.checkpoint-bundle.v114";
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  profileIdentity: string;
  predecessorArtifactDigest: string;
  predecessorHistoryHeadDigest: string;
  actorEvidenceRoot: string;
  headKaiUpulse: string;
  operationCount: number;
  merkle: ReceizCompositeMerkleTransport;
  counts: Readonly<{
    operationCount: number;
    membershipCount: number;
    visibleCount: number;
    hiddenCount: number;
    unlistedCount: number;
    pinnedCount: number;
  }>;
  currentStateRoot: string;
  finalHeadDigest: string;
  placementRoot: string;
  orderRoot: string;
  segmentAccumulator: ReceizCompositeMerkleTransport;
  segmentCount: number;
  firstPaintSegmentWindow: readonly ReceizProfileShowcaseSegmentMechanicsV114["commitment"][];
  fibonacciCheckpoints: readonly Readonly<{
    operationCount: number;
    merkleRoot: string;
    segmentPrefixRoot: string;
    partialSegmentRoot: string;
    segmentId: string;
  }>[];
  firstPaintWindow: Readonly<Record<string, unknown>>;
  firstPaintWitnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
  checkpointHistoryNode: ReceizProofHistoryNode;
  versions: Readonly<{
    registryDigest: string;
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.profile-showcase.verifier.v114";
  }>;
  authority: Readonly<{
    bundleIsProofAuthority: false;
    segmentIsProofAuthority: false;
    checkpointProjectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizProfileShowcaseCheckpointBundleBuildV114 = Readonly<{
  bundle: ReceizProfileShowcaseCheckpointBundleV114;
  segments: readonly ReceizProfileShowcaseSegmentMechanicsV114[];
  instrumentation: Readonly<{
    maxLiveOperations: number;
    maxLiveSegments: number;
    maxLiveSegmentBytes: number;
    maxLivePersistentNodes: number;
    persistentNodeReads: number;
    persistentNodeWrites: number;
  }>;
}>;

function _exactCheckpointChildKey(reference: Record<string, unknown>): string {
  return [
    reference.stableChildArtifactId,
    reference.immutableVersion,
    reference.childArtifactDigest,
  ].join("\u0000");
}

/**
 * Builds one exact, content-addressed archive beneath an enclosing sealed
 * artifact. Operations are consumed once; immutable segments carry at most
 * 256 operations while the resulting foreground head remains bounded.
 */
export async function createReceizProfileShowcaseCheckpointBundleV114(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  profileIdentity: string;
  predecessorArtifactDigest: string;
  predecessorHistoryHeadDigest: string;
  actorEvidenceRoot: string;
  headKaiUpulse: string;
  operationCount: number;
  operations: Iterable<ReceizConstitutionJson> | AsyncIterable<ReceizConstitutionJson>;
  registryDigest: string;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  retainSegments?: boolean;
  writeSegment?: (
    segment: ReceizProfileShowcaseSegmentMechanicsV114,
  ) => void | Promise<void>;
  checkpointPersistentState?: (
    state: ReceizProfileShowcasePersistentStateV114,
  ) => void | Promise<void>;
}>): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114> {
  if (
    input.artifactId !== `profile-showcase:${input.ownerReceizIdentity}`
    || !DIGEST_RE.test(input.predecessorArtifactDigest)
    || !DIGEST_RE.test(input.predecessorHistoryHeadDigest)
    || !DIGEST_RE.test(input.actorEvidenceRoot)
    || !KAI_RE.test(input.headKaiUpulse)
    || !Number.isSafeInteger(input.operationCount)
    || input.operationCount < 1
    || !DIGEST_RE.test(input.registryDigest)
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INPUT_INVALID");
  const backingStore = input.persistentStateIO
    ?? createReceizProfileShowcasePersistentMemoryStoreV114();
  let persistentNodeReads = 0;
  let persistentNodeWrites = 0;
  let livePersistentNodes = 0;
  let maxLivePersistentNodes = 0;
  const persistentStateIO: ReceizProfileShowcasePersistentStateIOV114 = {
    async resolveNode(nodeDigest) {
      persistentNodeReads += 1;
      const node = await backingStore.resolveNode(nodeDigest);
      if (node) {
        livePersistentNodes += 1;
        maxLivePersistentNodes = Math.max(maxLivePersistentNodes, livePersistentNodes);
        livePersistentNodes -= 1;
      }
      return node;
    },
    async writeNode(node) {
      persistentNodeWrites += 1;
      livePersistentNodes += 1;
      maxLivePersistentNodes = Math.max(maxLivePersistentNodes, livePersistentNodes);
      await backingStore.writeNode(node);
      livePersistentNodes -= 1;
    },
  };
  const fibonacciTargets = new Set(
    receizCompositeFibonacciDistancesUpTo(input.operationCount)
      .filter((distance) => distance < input.operationCount)
      .map((distance) => input.operationCount - distance),
  );
  const captured = new Map<number, {
    merkleRoot: string;
    segmentPrefixRoot: string;
    partialSegmentRoot: string;
    segmentId: string;
  }>();
  let merkle = createEmptyReceizCompositeMerkleState();
  let segmentAccumulator = createEmptyReceizCompositeMerkleState();
  if (fibonacciTargets.has(0)) {
    captured.set(0, {
      merkleRoot: merkle.root,
      segmentPrefixRoot: segmentAccumulator.root,
      partialSegmentRoot: merkle.root,
      segmentId: "",
    });
  }
  const segments: ReceizProfileShowcaseSegmentMechanicsV114[] = [];
  let segmentCount = 0;
  const firstPaintSegmentWindow:
    ReceizProfileShowcaseSegmentMechanicsV114["commitment"][] = [];
  let maxLiveOperations = 0;
  let maxLiveSegments = 0;
  let maxLiveSegmentBytes = 0;
  let chunk: ReceizConstitutionJson[] = [];
  let chunkStart = 0;
  let seen = 0;
  let persistentState = createEmptyReceizProfileShowcasePersistentStateV114("0");
  let priorHeadDigest = input.predecessorArtifactDigest;
  let maximumUpulse = 0n;

  const sealChunk = async () => {
    if (chunk.length === 0) return;
    const segment = await createReceizProfileShowcaseCheckpointSegmentV114({
      operations: chunk,
      startOperationCount: chunkStart,
    });
    maxLiveOperations = Math.max(
      maxLiveOperations,
      chunk.length + segment.operations.length,
    );
    maxLiveSegments = Math.max(
      maxLiveSegments,
      input.retainSegments === false ? 1 : segments.length + 1,
    );
    maxLiveSegmentBytes = Math.max(maxLiveSegmentBytes, segment.bytes.byteLength);
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const operation = chunk[offset] as Record<string, unknown>;
      assertReceizProfileShowcaseTransitionOperationsV114([
        operation as ReceizConstitutionJson,
      ]);
      if (
        operation.priorCommittedCount !== seen
        || operation.directDeltaPosition !== 0
        || operation.parentArtifactDigest !== priorHeadDigest
        || operation.authorityEvidenceRoot !== input.actorEvidenceRoot
        || !record(operation.kai)
        || typeof operation.kai.upulse !== "string"
        || !KAI_RE.test(operation.kai.upulse)
        || operation.operationDigest
          !== deriveReceizProfileShowcaseNativeOperationDigestV114(operation)
      ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_OPERATION_INVALID");
      const operationUpulse = BigInt(operation.kai.upulse);
      if (operationUpulse < maximumUpulse) {
        fail("PROFILE_SHOWCASE_BOUNDED_KAI_REGRESSION");
      }
      maximumUpulse = operationUpulse;
      merkle = appendReceizCompositeMerkleLeaf(
        merkle,
        await digestReceizProfileShowcaseOperationLeafV114(
          operation as ReceizConstitutionJson,
        ),
      );
      persistentState = await reduceReceizProfileShowcasePersistentStateV114({
        state: persistentState,
        operation: operation as ReceizConstitutionJson,
        membershipWitness: segment.membershipWitnesses[offset]!,
        io: persistentStateIO,
      });
      seen += 1;
      priorHeadDigest = deriveReceizProfileShowcasePersistentHeadDigestV114({
        state: persistentState,
        merkleRoot: merkle.root,
      });
      if (fibonacciTargets.has(seen)) {
        const prefixLeaves = await Promise.all(
          chunk.slice(0, offset + 1).map(digestReceizProfileShowcaseOperationLeafV114),
        );
        captured.set(seen, {
          merkleRoot: merkle.root,
          segmentPrefixRoot: segmentAccumulator.root,
          partialSegmentRoot: buildReceizCompositeBoundedTree(prefixLeaves).root,
          segmentId: segment.commitment.segmentId,
        });
      }
    }
    segmentAccumulator = appendReceizCompositeMerkleLeaf(
      segmentAccumulator,
      segment.commitment.segmentId,
    );
    segmentCount += 1;
    await input.writeSegment?.(segment);
    await input.checkpointPersistentState?.(persistentState);
    if (input.retainSegments !== false) segments.push(segment);
    chunk = [];
    chunkStart = seen;
  };

  for await (const rawOperation of input.operations) {
    if (seen + chunk.length >= input.operationCount) {
      fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_OPERATION_COUNT_INVALID");
    }
    const operation = structuredClone(rawOperation) as Record<string, unknown>;
    chunk.push(operation as ReceizConstitutionJson);
    if (chunk.length === PROFILE_SEGMENT_CAPACITY) await sealChunk();
  }
  await sealChunk();
  if (
    seen !== input.operationCount
    || maximumUpulse.toString() !== input.headKaiUpulse
    || persistentState.maximumKaiUpulse !== input.headKaiUpulse
  ) {
    fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_OPERATION_COUNT_INVALID");
  }
  const window = await deriveReceizProfileShowcasePersistentWindowV114({
    state: persistentState,
    io: persistentStateIO,
  });
  const visibleChildren = window.children;
  const counts = persistentState.counts;
  for (const child of visibleChildren) {
    const witness = child.membershipWitness as Record<string, unknown>;
    if (
      typeof witness.segmentId !== "string"
      || !DIGEST_RE.test(witness.segmentId)
      || !Array.isArray(witness.siblings)
    ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_WINDOW_INVALID");
    let segmentRoot = witness.leafDigest as string;
    for (const sibling of witness.siblings as readonly Record<string, unknown>[]) {
      segmentRoot = sibling.side === "left"
        ? buildReceizCompositeMerkleParent(sibling.digest as string, segmentRoot)
        : buildReceizCompositeMerkleParent(segmentRoot, sibling.digest as string);
    }
    if (!firstPaintSegmentWindow.some(
      (segment) => segment.segmentId === witness.segmentId,
    )) {
      firstPaintSegmentWindow.push({
        segmentId: witness.segmentId,
        startOperationCount: witness.startOperationCount as number,
        endOperationCount: witness.endOperationCount as number,
        operationCount: witness.operationCount as number,
        root: segmentRoot,
      });
    }
  }
  const firstPaintBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v114",
    startVisibleIndex: 0,
    endVisibleIndex: visibleChildren.length,
    totalVisibleCount: counts.visibleCount,
    children: visibleChildren,
    continuation: window.continuation,
  };
  const currentStateRoot = digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.checkpoint-bundle-state.v114",
    merkleRoot: merkle.root,
    placementRoot: persistentState.placementRoot,
    orderRoot: persistentState.orderRoot,
    counts,
  });
  const fibonacciCheckpoints = receizCompositeFibonacciDistancesUpTo(
    input.operationCount,
  ).filter((distance) => distance < input.operationCount).map((distance) => {
    const operationCount = input.operationCount - distance;
    const checkpoint = captured.get(operationCount);
    if (!checkpoint || checkpoint.merkleRoot === "") {
      fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_CHECKPOINT_INVALID");
    }
    return { operationCount, ...checkpoint };
  });
  const basis = {
    schema: "receiz.profile-showcase.checkpoint-bundle.v114",
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: input.profileIdentity,
    predecessorArtifactDigest: input.predecessorArtifactDigest,
    predecessorHistoryHeadDigest: input.predecessorHistoryHeadDigest,
    actorEvidenceRoot: input.actorEvidenceRoot,
    headKaiUpulse: input.headKaiUpulse,
    operationCount: input.operationCount,
    merkle,
    counts,
    currentStateRoot,
    finalHeadDigest: priorHeadDigest,
    placementRoot: persistentState.placementRoot,
    orderRoot: persistentState.orderRoot,
    segmentAccumulator,
    segmentCount,
    firstPaintSegmentWindow,
    fibonacciCheckpoints,
    firstPaintWindow: {
      ...firstPaintBasis,
      commitmentDigest: await digestReceizAuthority(
        "state",
        "receiz.profile-showcase.first-paint-window.v114",
        firstPaintBasis,
      ),
    },
    // The sealed checkpoint carries the exact bounded first-paint window and
    // its segment membership witnesses directly. Persistent tree nodes remain
    // in content-addressed custody for explicit replay/audit; duplicating the
    // tree paths inside every checkpoint would make the proof object grow with
    // account history.
    firstPaintWitnessNodes: [],
    versions: {
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1" as const,
      verifierVersion: "receiz.profile-showcase.verifier.v114" as const,
    },
    authority: {
      bundleIsProofAuthority: false as const,
      segmentIsProofAuthority: false as const,
      checkpointProjectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  };
  const showcaseBodyDigest = await digestReceizAuthority(
    "namespace",
    "receiz.profile-showcase.checkpoint-bundle.v114",
    basis as unknown as ReceizConstitutionJson,
  );
  const checkpointHistoryNode = await createReceizProofHistoryNode({
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    parentDigests: [input.predecessorHistoryHeadDigest],
    kaiPulse: input.headKaiUpulse,
    receipt: {},
      event: {
      type: "profile-showcase.transition",
      parentShowcaseDigests: [input.predecessorArtifactDigest],
      predecessorShowcaseDigest: input.predecessorArtifactDigest,
      showcaseBodyDigest,
      operationDigest: merkle.root,
      childAdmissionEvidenceRoots: visibleChildren.map(
        (child) => child.reference.admissionEvidenceRoot as string,
      ),
      registryDigest: input.registryDigest,
      kaiUpulse: input.headKaiUpulse,
    },
    namespaceData: {},
  });
  return Object.freeze({
    bundle: Object.freeze(structuredClone({
      ...basis,
      checkpointHistoryNode,
    })) as ReceizProfileShowcaseCheckpointBundleV114,
    segments: Object.freeze(segments),
    instrumentation: Object.freeze({
      maxLiveOperations,
      maxLiveSegments,
      maxLiveSegmentBytes,
      maxLivePersistentNodes,
      persistentNodeReads,
      persistentNodeWrites,
    }),
  });
}

export type ReceizProfileShowcaseCheckpointSegmentResolverV114 = (
  segmentIndex: number,
) => Promise<ReceizProfileShowcaseSegmentMechanicsV114 | null>;

export async function verifyReceizProfileShowcaseCheckpointSnapshotV114(
  input: Readonly<{
    bundle: unknown;
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  }>,
): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114> {
  if (!record(input.bundle)) {
    fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  }
  const bundle = structuredClone(
    input.bundle,
  ) as unknown as ReceizProfileShowcaseCheckpointBundleV114;
  if (
    bundle.schema !== "receiz.profile-showcase.checkpoint-bundle.v114"
    || bundle.artifactId !== `profile-showcase:${bundle.ownerReceizIdentity}`
    || !DIGEST_RE.test(bundle.predecessorArtifactDigest)
    || !DIGEST_RE.test(bundle.predecessorHistoryHeadDigest)
    || !DIGEST_RE.test(bundle.actorEvidenceRoot)
    || !KAI_RE.test(bundle.headKaiUpulse)
    || !count(bundle.operationCount)
    || bundle.operationCount < 1
    || !DIGEST_RE.test(bundle.placementRoot)
    || !DIGEST_RE.test(bundle.orderRoot)
    || !DIGEST_RE.test(bundle.currentStateRoot)
    || !DIGEST_RE.test(bundle.finalHeadDigest)
    || !Array.isArray(bundle.firstPaintWitnessNodes)
    || bundle.firstPaintWitnessNodes.length > 8_192
    || !record(bundle.firstPaintWindow)
    || !Array.isArray(bundle.firstPaintWindow.children)
    || bundle.firstPaintWindow.children.length > 256
    || !Array.isArray(bundle.firstPaintSegmentWindow)
    || bundle.firstPaintSegmentWindow.length > 256
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  assertReceizCompositeMerkleState(bundle.merkle);
  assertReceizCompositeMerkleState(bundle.segmentAccumulator);
  if (
    bundle.merkle.leafCount !== bundle.operationCount
    || bundle.counts.operationCount !== bundle.operationCount
    || bundle.segmentAccumulator.leafCount !== bundle.segmentCount
    || bundle.counts.visibleCount
      + bundle.counts.hiddenCount
      + bundle.counts.unlistedCount !== bundle.counts.membershipCount
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  const state: ReceizProfileShowcasePersistentStateV114 = {
    schema: "receiz.profile-showcase.persistent-state.v114",
    placementRoot: bundle.placementRoot,
    orderRoot: bundle.orderRoot,
    counts: bundle.counts,
    maximumKaiUpulse: bundle.headKaiUpulse,
  };
  const sealedWindow = bundle.firstPaintWindow as Record<string, unknown>;
  const sealedChildren = sealedWindow.children as readonly unknown[];
  const sealedContinuation = sealedWindow.continuation;
  if (
    sealedWindow.schema !== "receiz.profile-showcase.first-paint-window.v114"
    || sealedWindow.startVisibleIndex !== 0
    || sealedWindow.endVisibleIndex !== sealedChildren.length
    || sealedWindow.totalVisibleCount !== bundle.counts.visibleCount
    || (
      bundle.counts.visibleCount > sealedChildren.length
        ? !record(sealedContinuation)
          || sealedContinuation.nextVisibleIndex !== sealedChildren.length
          || sealedContinuation.placementRoot !== bundle.placementRoot
          || sealedContinuation.orderRoot !== bundle.orderRoot
        : sealedContinuation !== null
    )
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_SNAPSHOT_MISMATCH");
  const window = input.persistentStateIO
    || bundle.firstPaintWitnessNodes.length > 0
    ? await deriveReceizProfileShowcasePersistentWindowV114({
        state,
        io: input.persistentStateIO
          ?? createReceizProfileShowcasePersistentMemoryStoreV114(
            bundle.firstPaintWitnessNodes,
          ),
      })
    : {
        children: sealedChildren,
        continuation: sealedContinuation,
      };
  const firstPaintBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v114",
    startVisibleIndex: 0,
    endVisibleIndex: window.children.length,
    totalVisibleCount: bundle.counts.visibleCount,
    children: window.children,
    continuation: window.continuation,
  };
  const expectedWindow = {
    ...firstPaintBasis,
    commitmentDigest: await digestReceizAuthority(
      "state",
      "receiz.profile-showcase.first-paint-window.v114",
      firstPaintBasis,
    ),
  };
  const expectedStateRoot = digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.checkpoint-bundle-state.v114",
    merkleRoot: bundle.merkle.root,
    placementRoot: bundle.placementRoot,
    orderRoot: bundle.orderRoot,
    counts: bundle.counts,
  });
  const expectedHeadDigest =
    deriveReceizProfileShowcasePersistentHeadDigestV114({
      state,
      merkleRoot: bundle.merkle.root,
    });
  const rebuiltHistoryNode = await createReceizProofHistoryNode({
    artifactId: bundle.checkpointHistoryNode.artifactId,
    registryDigest: bundle.checkpointHistoryNode.registryDigest,
    parentDigests: bundle.checkpointHistoryNode.parentDigests,
    kaiPulse: bundle.checkpointHistoryNode.kaiPulse,
    receipt: bundle.checkpointHistoryNode.receipt,
    event: bundle.checkpointHistoryNode.event,
    namespaceData: bundle.checkpointHistoryNode.namespaceData,
  });
  if (
    expectedStateRoot !== bundle.currentStateRoot
    || expectedHeadDigest !== bundle.finalHeadDigest
    || canonicalizeReceizConstitution(
      expectedWindow as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      bundle.firstPaintWindow as ReceizConstitutionJson,
    )
    || canonicalizeReceizConstitution(
      rebuiltHistoryNode as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      bundle.checkpointHistoryNode as unknown as ReceizConstitutionJson,
    )
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_SNAPSHOT_MISMATCH");
  return Object.freeze({
    bundle: Object.freeze(bundle),
    segments: Object.freeze([]),
    instrumentation: Object.freeze({
      maxLiveOperations: 0,
      maxLiveSegments: 0,
      maxLiveSegmentBytes: 0,
      maxLivePersistentNodes: bundle.firstPaintWitnessNodes.length,
      persistentNodeReads: bundle.firstPaintWitnessNodes.length,
      persistentNodeWrites: 0,
    }),
  });
}

export async function verifyReceizProfileShowcaseCheckpointBundleV114(input: Readonly<{
  bundle: unknown;
  resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
}>): Promise<ReceizProfileShowcaseCheckpointBundleBuildV114> {
  if (!record(input.bundle) || typeof input.resolveSegment !== "function") {
    fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  }
  exactKeys(input.bundle, [
    "schema",
    "artifactId",
    "ownerReceizIdentity",
    "profileIdentity",
    "predecessorArtifactDigest",
    "predecessorHistoryHeadDigest",
    "actorEvidenceRoot",
    "headKaiUpulse",
    "operationCount",
    "merkle",
    "counts",
    "currentStateRoot",
    "finalHeadDigest",
    "placementRoot",
    "orderRoot",
    "segmentAccumulator",
    "segmentCount",
    "firstPaintSegmentWindow",
    "fibonacciCheckpoints",
    "firstPaintWindow",
    "firstPaintWitnessNodes",
    "checkpointHistoryNode",
    "versions",
    "authority",
  ], "PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  if (
    input.bundle.schema !== "receiz.profile-showcase.checkpoint-bundle.v114"
    || typeof input.bundle.artifactId !== "string"
    || typeof input.bundle.ownerReceizIdentity !== "string"
    || typeof input.bundle.profileIdentity !== "string"
    || typeof input.bundle.predecessorArtifactDigest !== "string"
    || !DIGEST_RE.test(input.bundle.predecessorArtifactDigest)
    || typeof input.bundle.predecessorHistoryHeadDigest !== "string"
    || !DIGEST_RE.test(input.bundle.predecessorHistoryHeadDigest)
    || typeof input.bundle.actorEvidenceRoot !== "string"
    || !DIGEST_RE.test(input.bundle.actorEvidenceRoot)
    || typeof input.bundle.headKaiUpulse !== "string"
    || !count(input.bundle.operationCount)
    || !count(input.bundle.segmentCount)
    || input.bundle.segmentCount === 0
    || !Array.isArray(input.bundle.firstPaintSegmentWindow)
    || input.bundle.firstPaintSegmentWindow.length > 256
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_INVALID");
  let currentResolved: ReceizProfileShowcaseSegmentMechanicsV114 | null = null;
  let resolvedCount = 0;
  async function* operations() {
    const segmentCount = (input.bundle as Record<string, unknown>).segmentCount as number;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const segment = await input.resolveSegment(segmentIndex);
      if (!segment) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_SEGMENT_MISSING");
      currentResolved = segment;
      resolvedCount += 1;
      for (const operation of segment.operations) yield operation;
    }
  }
  const rebuilt = await createReceizProfileShowcaseCheckpointBundleV114({
    artifactId: input.bundle.artifactId as `profile-showcase:${string}`,
    ownerReceizIdentity: input.bundle.ownerReceizIdentity,
    profileIdentity: input.bundle.profileIdentity,
    predecessorArtifactDigest: input.bundle.predecessorArtifactDigest,
    predecessorHistoryHeadDigest: input.bundle.predecessorHistoryHeadDigest,
    actorEvidenceRoot: input.bundle.actorEvidenceRoot,
    headKaiUpulse: input.bundle.headKaiUpulse,
    operationCount: input.bundle.operationCount,
    operations: operations(),
    registryDigest: (
      input.bundle.versions as Record<string, unknown>
    ).registryDigest as string,
    ...(input.persistentStateIO
      ? { persistentStateIO: input.persistentStateIO }
      : {}),
    retainSegments: false,
    writeSegment: (segment) => {
      const candidate = currentResolved;
      if (
        !candidate
        || segment.bytes.length !== candidate.bytes.length
        || segment.bytes.some((byte, byteIndex) => byte !== candidate.bytes[byteIndex])
        || canonicalizeReceizConstitution({
          schema: segment.schema,
          commitment: segment.commitment,
          operations: segment.operations,
          membershipWitnesses: segment.membershipWitnesses,
          authority: segment.authority,
        } as unknown as ReceizConstitutionJson) !== canonicalizeReceizConstitution({
          schema: candidate.schema,
          commitment: candidate.commitment,
          operations: candidate.operations,
          membershipWitnesses: candidate.membershipWitnesses,
          authority: candidate.authority,
        } as unknown as ReceizConstitutionJson)
      ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_REPLAY_MISMATCH");
      currentResolved = null;
    },
  });
  if (
    resolvedCount !== input.bundle.segmentCount
    ||
    canonicalizeReceizConstitution(
      rebuilt.bundle as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      input.bundle as ReceizConstitutionJson,
    )
  ) fail("PROFILE_SHOWCASE_CHECKPOINT_BUNDLE_REPLAY_MISMATCH");
  return rebuilt;
}

export async function deriveReceizProfileShowcaseBoundedGenesisHeadV114(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  profileIdentity: string;
  genesisKaiUpulse: string;
  directDelta: readonly ReceizConstitutionJson[];
  registryDigest: string;
}>): Promise<Readonly<Record<string, unknown>>> {
  if (
    input.artifactId !== `profile-showcase:${input.ownerReceizIdentity}`
    || !KAI_RE.test(input.genesisKaiUpulse)
    || !DIGEST_RE.test(input.registryDigest)
  ) fail("PROFILE_SHOWCASE_BOUNDED_GENESIS_INVALID");
  const directDelta = canonicalizeReceizProfileShowcaseTransitionOperationsV114(
    input.directDelta,
  ) as readonly ReceizConstitutionJson[];
  if (directDelta.length > PROFILE_SEGMENT_CAPACITY) {
    fail("PROFILE_SHOWCASE_BOUNDED_GENESIS_DELTA_INVALID");
  }
  const references: Record<string, unknown>[] = [];
  directDelta.forEach((operation, index) => {
    if (
      !record(operation)
      || operation.kind !== "showcase.append"
      || operation.parentArtifactDigest !== null
      || operation.priorCommittedCount !== 0
      || operation.directDeltaPosition !== index
      || !record(operation.child)
    ) fail("PROFILE_SHOWCASE_BOUNDED_GENESIS_DELTA_INVALID");
    references.push(structuredClone(operation.child));
  });
  const leafDigests = await Promise.all(
    directDelta.map(digestReceizProfileShowcaseOperationLeafV114),
  );
  let merkle = createEmptyReceizCompositeMerkleState();
  for (const leaf of leafDigests) merkle = appendReceizCompositeMerkleLeaf(merkle, leaf);
  const segment = directDelta.length === 0
    ? null
    : await createReceizProfileShowcaseSegmentMechanicsV114({
      operations: directDelta,
      startOperationCount: 0,
    });
  const persistentStateIO =
    createReceizProfileShowcasePersistentMemoryStoreV114();
  let persistentState =
    createEmptyReceizProfileShowcasePersistentStateV114(
      input.genesisKaiUpulse,
    );
  for (let index = 0; index < directDelta.length; index += 1) {
    persistentState = await reduceReceizProfileShowcasePersistentStateV114({
      state: persistentState,
      operation: directDelta[index]!,
      membershipWitness: segment!.membershipWitnesses[index]!,
      io: persistentStateIO,
      expectedPriorCommittedCount: 0,
      expectedDirectDeltaPosition: index,
    });
  }
  const persistentWindow =
    await deriveReceizProfileShowcasePersistentWindowV114({
      state: persistentState,
      io: persistentStateIO,
    });
  const firstPaintBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v114",
    startVisibleIndex: 0,
    endVisibleIndex: persistentWindow.children.length,
    totalVisibleCount: persistentState.counts.visibleCount,
    children: persistentWindow.children,
    continuation: persistentWindow.continuation,
  };
  const counts = persistentState.counts;
  const head = {
    schema: "receiz.profile-showcase-head.v114",
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: input.profileIdentity,
    headKaiUpulse: input.genesisKaiUpulse,
    parentHeads: [],
    priorOperationCount: 0,
    resultingOperationCount: directDelta.length,
    directDelta,
    currentStateRoot: digestReceizCompositeCanonical({
      kind: "receiz.profile-showcase.state.v114",
      priorStateRoot: null,
      merkleRoot: merkle.root,
      placementRoot: persistentState.placementRoot,
      orderRoot: persistentState.orderRoot,
      counts,
    }),
    placementRoot: persistentState.placementRoot,
    orderRoot: persistentState.orderRoot,
    merkle,
    fibonacci: {
      basis: "sparse-checkpoint/v1",
      operationCount: directDelta.length,
      checkpoints: [],
    },
    segmentWindow: segment ? [segment.commitment] : [],
    counts,
    firstPaintWindow: {
      ...firstPaintBasis,
      commitmentDigest: await digestReceizAuthority(
        "state",
        "receiz.profile-showcase.first-paint-window.v114",
        firstPaintBasis,
      ),
    },
    firstPaintWitnessNodes: persistentWindow.witnessNodes,
    stateTransitionWitnessNodes: [],
    versions: {
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1",
      verifierVersion: "receiz.profile-showcase.verifier.v114",
    },
    authority: {
      showcaseIsProofAuthority: true,
      strongerTruth: "sealed-receiz-proof-object",
      historyIsProofAuthority: false,
      projectionIsProofAuthority: false,
    },
  };
  assertReceizProfileShowcaseBoundedHeadV114(head);
  return Object.freeze(structuredClone(head));
}

export async function deriveReceizLegacyProfileShowcaseCheckpointHeadV114(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  profileIdentity: string;
  legacyArtifactDigest: string;
  legacyHistoryHeadDigest: string;
  legacyHeadKaiUpulse: string;
  legacyOperationCount: number;
  legacyStateRoot: string;
  merkle: ReceizCompositeMerkleTransport;
  fibonacciCheckpoints: readonly Readonly<{
    distance: number;
    operationCount: number;
    artifactDigest: string;
  }>[];
  segmentWindow: readonly Readonly<{
    segmentId: string;
    startOperationCount: number;
    endOperationCount: number;
    operationCount: number;
    root: string;
  }>[];
  counts: Readonly<Record<string, number>>;
  firstPaintChildren: readonly Readonly<{
    reference: Readonly<Record<string, unknown>>;
    membershipWitness: Readonly<Record<string, unknown>>;
  }>[];
  totalVisibleCount: number;
  registryDigest: string;
  placementRoot?: string;
  orderRoot?: string;
  firstPaintWitnessNodes?: readonly ReceizProfileShowcasePersistentNodeV114[];
}>): Promise<Readonly<Record<string, unknown>>> {
  if (
    input.artifactId !== `profile-showcase:${input.ownerReceizIdentity}`
    || !DIGEST_RE.test(input.legacyArtifactDigest)
    || !DIGEST_RE.test(input.legacyHistoryHeadDigest)
    || !DIGEST_RE.test(input.legacyStateRoot)
    || !KAI_RE.test(input.legacyHeadKaiUpulse)
    || !Number.isSafeInteger(input.legacyOperationCount)
    || input.legacyOperationCount < 1
    || input.merkle.leafCount !== input.legacyOperationCount
    || !DIGEST_RE.test(input.registryDigest)
    || input.firstPaintChildren.length > 256
    || input.segmentWindow.length > 256
    || input.totalVisibleCount < input.firstPaintChildren.length
    || (input.totalVisibleCount > 0 && input.firstPaintChildren.length === 0)
  ) fail("PROFILE_SHOWCASE_LEGACY_CHECKPOINT_INVALID");
  assertReceizCompositeMerkleState(input.merkle);
  const distances: number[] = [];
  for (let current = 1, next = 2; current <= input.legacyOperationCount;) {
    if (current < input.legacyOperationCount) distances.push(current);
    [current, next] = [next, current + next];
  }
  if (
    input.fibonacciCheckpoints.length !== distances.length
    || input.fibonacciCheckpoints.some((checkpoint, index) =>
      checkpoint.distance !== distances[index]
      || checkpoint.operationCount !== input.legacyOperationCount - distances[index]!
      || !DIGEST_RE.test(checkpoint.artifactDigest))
  ) fail("PROFILE_SHOWCASE_LEGACY_CHECKPOINT_FIBONACCI_INVALID");
  const firstPaintBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v114",
    startVisibleIndex: 0,
    endVisibleIndex: input.firstPaintChildren.length,
    totalVisibleCount: input.totalVisibleCount,
    children: structuredClone(input.firstPaintChildren),
    continuation: input.totalVisibleCount > input.firstPaintChildren.length
      ? {
        nextVisibleIndex: input.firstPaintChildren.length,
        afterChild: structuredClone(
          input.firstPaintChildren[input.firstPaintChildren.length - 1]!.reference,
        ),
        segmentId: input.firstPaintChildren[input.firstPaintChildren.length - 1]!
          .membershipWitness.segmentId,
        segmentStartOperationCount:
          input.firstPaintChildren[input.firstPaintChildren.length - 1]!
            .membershipWitness.startOperationCount,
        checkpoint: input.fibonacciCheckpoints[0]
          ? {
            operationCount: input.fibonacciCheckpoints[0].operationCount,
            artifactDigest: input.fibonacciCheckpoints[0].artifactDigest,
          }
          : null,
        merkleRoot: input.merkle.root,
      }
      : null,
  };
  const parentHeads = [{
    artifactDigest: input.legacyArtifactDigest,
    historyHeadDigest: input.legacyHistoryHeadDigest,
    headKaiUpulse: input.legacyHeadKaiUpulse,
    operationCount: input.legacyOperationCount,
    stateRoot: input.legacyStateRoot,
  }];
  const counts = structuredClone(input.counts);
  const placementRoot = input.placementRoot ?? digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.legacy-placement-root.v114",
    legacyStateRoot: input.legacyStateRoot,
  });
  const orderRoot = input.orderRoot ?? digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.legacy-order-root.v114",
    legacyStateRoot: input.legacyStateRoot,
  });
  const head = {
    schema: "receiz.profile-showcase-head.v114",
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: input.profileIdentity,
    headKaiUpulse: input.legacyHeadKaiUpulse,
    parentHeads,
    priorOperationCount: input.legacyOperationCount,
    resultingOperationCount: input.legacyOperationCount,
    directDelta: [],
    currentStateRoot: digestReceizCompositeCanonical({
      kind: "receiz.profile-showcase.migration-checkpoint-state.v114",
      priorStateRoot: input.legacyStateRoot,
      merkleRoot: input.merkle.root,
      placementRoot,
      orderRoot,
      counts,
    }),
    placementRoot,
    orderRoot,
    merkle: structuredClone(input.merkle),
    fibonacci: {
      basis: "sparse-checkpoint/v1",
      operationCount: input.legacyOperationCount,
      checkpoints: structuredClone(input.fibonacciCheckpoints),
    },
    segmentWindow: structuredClone(input.segmentWindow),
    counts,
    firstPaintWindow: {
      ...firstPaintBasis,
      commitmentDigest: await digestReceizAuthority(
        "state",
        "receiz.profile-showcase.first-paint-window.v114",
        firstPaintBasis,
      ),
    },
    firstPaintWitnessNodes: structuredClone(input.firstPaintWitnessNodes ?? []),
    stateTransitionWitnessNodes: [],
    versions: {
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1",
      verifierVersion: "receiz.profile-showcase.verifier.v114",
    },
    authority: {
      showcaseIsProofAuthority: true,
      strongerTruth: "sealed-receiz-proof-object",
      historyIsProofAuthority: false,
      projectionIsProofAuthority: false,
    },
  };
  assertReceizProfileShowcaseBoundedHeadV114(head);
  return Object.freeze(structuredClone(head));
}

function _childReferenceKey(reference: Record<string, unknown>): string {
  return [
    reference.stableChildArtifactId,
    reference.immutableVersion,
    reference.childArtifactDigest,
  ].join("\u0000");
}

export type ReceizProfileShowcaseRetainedSegmentResolverV114 = (segmentId: string) => Promise<Readonly<{
  segmentId: string; startOperationCount: number; endOperationCount: number; operationCount: number; root: string;
}> | null>;

export async function deriveReceizProfileShowcaseBoundedSuccessorHeadV114(input: Readonly<{
  predecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
  predecessorArtifactDigest: string;
  directDelta: readonly ReceizConstitutionJson[];
  resolveRetainedSegment?: ReceizProfileShowcaseRetainedSegmentResolverV114;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null> | string | null;
}>): Promise<Readonly<Record<string, unknown>>> {
  const predecessor = await parseReceizBoundedProfileShowcaseCarrierV114(
    input.predecessorCarrier,
  );
  await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(predecessor);
  if (!DIGEST_RE.test(input.predecessorArtifactDigest)) {
    fail("PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_INVALID");
  }
  const prior = predecessor["profile-showcase"];
  const parentHeads = [{
    artifactDigest: input.predecessorArtifactDigest,
    historyHeadDigest: predecessor.receizProofHistory.headDigest,
    headKaiUpulse: prior.headKaiUpulse,
    operationCount: prior.resultingOperationCount,
    stateRoot: prior.currentStateRoot,
  }];
  const directDelta = canonicalizeReceizProfileShowcaseTransitionOperationsV114(
    input.directDelta,
  ) as readonly ReceizConstitutionJson[];
  if (
    directDelta.length !== 1
  ) fail("PROFILE_SHOWCASE_BOUNDED_PREDECESSOR_INVALID");
  const operation = directDelta[0] as Record<string, unknown>;
  if (
    operation.parentArtifactDigest !== input.predecessorArtifactDigest
    || operation.priorCommittedCount !== prior.resultingOperationCount
    || operation.directDeltaPosition !== 0
    || operation.operationDigest
      !== deriveReceizProfileShowcaseNativeOperationDigestV114(operation)
  ) fail("PROFILE_SHOWCASE_BOUNDED_DELTA_INVALID");

  const segment = await createReceizProfileShowcaseSegmentMechanicsV114({
    operations: directDelta,
    startOperationCount: prior.resultingOperationCount as number,
  });
  const operationLeaf = await digestReceizProfileShowcaseOperationLeafV114(
    operation as ReceizConstitutionJson,
  );
  const merkle = appendReceizCompositeMerkleLeaf(
    prior.merkle as ReceizCompositeMerkleTransport,
    operationLeaf,
  );
  const seedNodes = [
    ...(Array.isArray(prior.firstPaintWitnessNodes)
      ? prior.firstPaintWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]
      : []),
    ...(Array.isArray(prior.stateTransitionWitnessNodes)
      ? prior.stateTransitionWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]
      : []),
  ];
  const backingStore = input.persistentStateIO
    ?? createReceizProfileShowcasePersistentMemoryStoreV114(seedNodes);
  const transitionWitnessNodes = new Map<string, ReceizProfileShowcasePersistentNodeV114>();
  const persistentStateIO: ReceizProfileShowcasePersistentStateIOV114 = {
    async resolveNode(nodeDigest) {
      const node = await backingStore.resolveNode(nodeDigest);
      if (node) transitionWitnessNodes.set(node.digest, node);
      return node;
    },
    async writeNode(node) {
      transitionWitnessNodes.set(node.digest, node);
      await backingStore.writeNode(node);
    },
  };
  const priorState: ReceizProfileShowcasePersistentStateV114 = {
    schema: "receiz.profile-showcase.persistent-state.v114",
    placementRoot: prior.placementRoot as string,
    orderRoot: prior.orderRoot as string,
    counts: structuredClone(prior.counts) as ReceizProfileShowcasePersistentStateV114["counts"],
    maximumKaiUpulse: prior.headKaiUpulse as string,
  };
  const persistentState = await reduceReceizProfileShowcasePersistentStateV114({
    state: priorState,
    operation: operation as ReceizConstitutionJson,
    membershipWitness: segment.witnesses[0]!,
    io: persistentStateIO,
  });
  const window = await deriveReceizProfileShowcasePersistentWindowV114({
    state: persistentState,
    io: persistentStateIO,
  });
  const windowChildren = window.children;
  const counts = persistentState.counts;
  const referencedPriorSegmentIds = new Set(
    windowChildren.flatMap((child) => {
      const witness = child.membershipWitness;
      return record(witness) && typeof witness.segmentId === "string"
        && witness.segmentId !== segment.commitment.segmentId
        ? [witness.segmentId]
        : [];
    }),
  );
  const priorSegments = prior.segmentWindow as readonly Record<string, unknown>[];
  const segmentWindow = [
    ...priorSegments.filter((candidate) => referencedPriorSegmentIds.has(candidate.segmentId as string)),
    segment.commitment,
  ];
  // A hidden placement can retain membership in a segment outside the current
  // visible window. The resolver locates its original commitment; the exact
  // witness rederived from the sealed predecessor state remains authoritative.
  for (const segmentId of referencedPriorSegmentIds) {
    if (segmentWindow.some(candidate => candidate.segmentId === segmentId)) continue;
    const retained = await input.resolveRetainedSegment?.(segmentId);
    if (!retained) fail("PROFILE_SHOWCASE_BOUNDED_SEGMENT_REFERENCE_UNAVAILABLE");
    const witnesses = windowChildren.filter(child => (child.membershipWitness as Record<string, unknown>).segmentId === segmentId).map(child => child.membershipWitness as Record<string, unknown>);
    for (const witness of witnesses) {
      let root = witness.leafDigest as string;
      for (const sibling of witness.siblings as readonly Record<string, unknown>[]) root = sibling.side === "left" ? buildReceizCompositeMerkleParent(sibling.digest as string, root) : buildReceizCompositeMerkleParent(root, sibling.digest as string);
      if (retained.segmentId !== segmentId || retained.root !== root || retained.startOperationCount !== witness.startOperationCount || retained.endOperationCount !== witness.endOperationCount || retained.operationCount !== witness.operationCount) fail("PROFILE_SHOWCASE_BOUNDED_SEGMENT_REFERENCE_MISMATCH");
    }
    segmentWindow.splice(segmentWindow.length - 1, 0, { segmentId: retained.segmentId, startOperationCount: retained.startOperationCount, endOperationCount: retained.endOperationCount, operationCount: retained.operationCount, root: retained.root });
  }
  if (segmentWindow.length > 256) fail("PROFILE_SHOWCASE_BOUNDED_SEGMENT_WINDOW_INVALID");
  const resultingOperationCount = merkle.leafCount;
  const distances: number[] = [];
  for (let current = 1, next = 2; current < resultingOperationCount;) {
    distances.push(current);
    [current, next] = [next, current + next];
  }
  const priorFibonacci = prior.fibonacci as {
    checkpoints: readonly Record<string, unknown>[];
  };
  const checkpoints = await Promise.all(distances.map(async (distance) => {
    const operationCount = resultingOperationCount - distance;
    if (operationCount === prior.resultingOperationCount) {
      return { distance, operationCount, artifactDigest: input.predecessorArtifactDigest };
    }
    const retained = priorFibonacci.checkpoints.find(
      (candidate) => candidate.operationCount === operationCount,
    );
    const artifactDigest = retained?.artifactDigest
      ?? await input.resolveVerifiedHistoricalArtifactDigest?.(operationCount)
      ?? null;
    if (!DIGEST_RE.test(artifactDigest as string)) {
      fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_LINEAGE_MISSING");
    }
    return {
      distance,
      operationCount,
      artifactDigest,
    };
  }));
  const firstPaintBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v114",
    startVisibleIndex: 0,
    endVisibleIndex: windowChildren.length,
    totalVisibleCount: counts.visibleCount,
    children: windowChildren,
    continuation: window.continuation,
  };
  const expected = {
    schema: "receiz.profile-showcase-head.v114",
    artifactId: prior.artifactId,
    ownerReceizIdentity: prior.ownerReceizIdentity,
    profileIdentity: prior.profileIdentity,
    headKaiUpulse: persistentState.maximumKaiUpulse,
    parentHeads,
    priorOperationCount: prior.resultingOperationCount,
    resultingOperationCount,
    directDelta,
    currentStateRoot: digestReceizCompositeCanonical({
      kind: "receiz.profile-showcase.state.v114",
      priorStateRoot: prior.currentStateRoot,
      merkleRoot: merkle.root,
      placementRoot: persistentState.placementRoot,
      orderRoot: persistentState.orderRoot,
      counts,
    }),
    placementRoot: persistentState.placementRoot,
    orderRoot: persistentState.orderRoot,
    merkle,
    fibonacci: {
      basis: "sparse-checkpoint/v1",
      operationCount: resultingOperationCount,
      checkpoints,
    },
    segmentWindow,
    counts,
    firstPaintWindow: {
      ...firstPaintBasis,
      commitmentDigest: await digestReceizAuthority(
        "state",
        "receiz.profile-showcase.first-paint-window.v114",
        firstPaintBasis,
      ),
    },
    firstPaintWitnessNodes: window.witnessNodes,
    stateTransitionWitnessNodes: [...transitionWitnessNodes.values()],
    versions: structuredClone(prior.versions),
    authority: structuredClone(prior.authority),
  };
  assertReceizProfileShowcaseBoundedHeadV114(expected);
  return Object.freeze(structuredClone(expected));
}

export async function verifyReceizProfileShowcaseBoundedSuccessorV114(input: Readonly<{
  predecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
  predecessorArtifactDigest: string;
  candidateHead: Readonly<Record<string, unknown>>;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null> | string | null;
}>): Promise<Readonly<Record<string, unknown>>> {
  assertReceizProfileShowcaseBoundedHeadV114(input.candidateHead);
  const predecessorHead = input.predecessorCarrier["profile-showcase"];
  const witnessNodes = [
    ...(predecessorHead.firstPaintWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
    ...(predecessorHead.stateTransitionWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
    ...(input.candidateHead.firstPaintWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
    ...(input.candidateHead.stateTransitionWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
  ];
  const expected = await deriveReceizProfileShowcaseBoundedSuccessorHeadV114({
    predecessorCarrier: input.predecessorCarrier,
    predecessorArtifactDigest: input.predecessorArtifactDigest,
    directDelta: input.candidateHead.directDelta as readonly ReceizConstitutionJson[],
    // Candidate transport is only a locator. derive above checks every field
    // against the original membership witness rederived from predecessor roots.
    resolveRetainedSegment: async segmentId => (input.candidateHead.segmentWindow as readonly Awaited<ReturnType<ReceizProfileShowcaseRetainedSegmentResolverV114>>[]).find(segment => segment?.segmentId === segmentId) ?? null,
    persistentStateIO: createReceizProfileShowcasePersistentMemoryStoreV114(
      witnessNodes,
    ),
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
  });
  if (
    canonicalizeReceizConstitution(expected as unknown as ReceizConstitutionJson)
    !== canonicalizeReceizConstitution(input.candidateHead as unknown as ReceizConstitutionJson)
  ) fail("PROFILE_SHOWCASE_BOUNDED_SUCCESSOR_MISMATCH");
  return Object.freeze(structuredClone(expected));
}

export type ReceizProfileShowcaseBoundedMergeParentV114 = Readonly<{
  artifactDigest: string;
  carrier: ReceizBoundedProfileShowcaseCarrierV114;
}>;

function boundedMergeOperationChildren(
  carrier: ReceizBoundedProfileShowcaseCarrierV114,
): readonly Readonly<Record<string, unknown>>[] {
  const children: Readonly<Record<string, unknown>>[] = [];
  for (const value of carrier["profile-showcase"].directDelta as readonly unknown[]) {
    if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_DELTA_INVALID");
    if (value.kind === "showcase.append" && record(value.child)) {
      children.push(value.child);
    } else if (value.kind === "showcase.merge" && Array.isArray(value.mergedChildren)) {
      for (const child of value.mergedChildren) {
        if (!record(child)) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_DELTA_INVALID");
        children.push(child);
      }
    } else {
      fail("PROFILE_SHOWCASE_BOUNDED_MERGE_MEMBERSHIP_DELTA_REQUIRED");
    }
  }
  return children;
}

function compareBoundedMergeParents(
  left: ReceizProfileShowcaseBoundedMergeParentV114,
  right: ReceizProfileShowcaseBoundedMergeParentV114,
): number {
  const leftKai = BigInt(left.carrier["profile-showcase"].headKaiUpulse as string);
  const rightKai = BigInt(right.carrier["profile-showcase"].headKaiUpulse as string);
  return leftKai < rightKai
    ? -1
    : leftKai > rightKai
      ? 1
      : left.artifactDigest.localeCompare(right.artifactDigest);
}

/**
 * Coheres two verified bounded sibling proof objects. Both parents remain
 * direct causal history parents; deterministic ordering only selects the
 * predecessor mechanics used to apply the sealed union operation.
 */
export async function deriveReceizProfileShowcaseBoundedMergeHeadV114(
  input: Readonly<{
    commonPredecessorCarrier: ReceizBoundedProfileShowcaseCarrierV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
      ReceizProfileShowcaseBoundedMergeParentV114,
      ReceizProfileShowcaseBoundedMergeParentV114,
    ];
    directDelta: readonly ReceizConstitutionJson[];
    persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
  }>,
): Promise<Readonly<Record<string, unknown>>> {
  if (
    !DIGEST_RE.test(input.commonPredecessorArtifactDigest)
    || input.parents.length !== 2
    || input.parents[0].artifactDigest === input.parents[1].artifactDigest
  ) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_INPUT_INVALID");
  const common = await parseReceizBoundedProfileShowcaseCarrierV114(
    input.commonPredecessorCarrier,
  );
  await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(common);
  const parents = await Promise.all(input.parents.map(async (candidate) => {
    if (!DIGEST_RE.test(candidate.artifactDigest)) {
      fail("PROFILE_SHOWCASE_BOUNDED_MERGE_PARENT_INVALID");
    }
    const carrier = await parseReceizBoundedProfileShowcaseCarrierV114(
      candidate.carrier,
    );
    await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrier);
    await verifyReceizProfileShowcaseBoundedSuccessorV114({
      predecessorCarrier: common,
      predecessorArtifactDigest: input.commonPredecessorArtifactDigest,
      candidateHead: carrier["profile-showcase"],
      ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
    });
    return Object.freeze({ artifactDigest: candidate.artifactDigest, carrier });
  }));
  const ordered = [...parents].sort(compareBoundedMergeParents);
  const primary = ordered[0]!;
  const primaryHead = primary.carrier["profile-showcase"];
  if (ordered.some(({ carrier }) => {
    const head = carrier["profile-showcase"];
    return head.artifactId !== primaryHead.artifactId
      || head.ownerReceizIdentity !== primaryHead.ownerReceizIdentity
      || head.profileIdentity !== primaryHead.profileIdentity;
  })) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_PARENT_IDENTITY_MISMATCH");
  const directDelta = canonicalizeReceizProfileShowcaseTransitionOperationsV114(
    input.directDelta,
  );
  if (directDelta.length !== 1 || !record(directDelta[0])) {
    fail("PROFILE_SHOWCASE_BOUNDED_MERGE_OPERATION_REQUIRED");
  }
  const operation = directDelta[0];
  const parentArtifactDigests = ordered
    .map((parent) => parent.artifactDigest)
    .sort();
  const expectedChildren = new Map<string, Readonly<Record<string, unknown>>>();
  for (const parent of ordered) {
    for (const child of boundedMergeOperationChildren(parent.carrier)) {
      const key = _childReferenceKey(child);
      const existing = expectedChildren.get(key);
      if (existing && canonicalizeReceizConstitution(
        existing as unknown as ReceizConstitutionJson,
      ) !== canonicalizeReceizConstitution(
        child as unknown as ReceizConstitutionJson,
      )) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_CHILD_CONFLICT");
      expectedChildren.set(key, child);
    }
  }
  const mergedChildren = [...expectedChildren.values()].sort((left, right) =>
    _childReferenceKey(left).localeCompare(_childReferenceKey(right)));
  const actualChildren = Array.isArray(operation.mergedChildren)
    ? operation.mergedChildren
    : [];
  const maximumParentKai = ordered.reduce((maximum, parent) => {
    const kai = BigInt(parent.carrier["profile-showcase"].headKaiUpulse as string);
    return kai > maximum ? kai : maximum;
  }, 0n);
  if (
    operation.kind !== "showcase.merge"
    || operation.parentArtifactDigest !== primary.artifactDigest
    || operation.priorCommittedCount !== primaryHead.resultingOperationCount
    || canonicalizeReceizConstitution(
      operation.mergedParentArtifactDigests as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      parentArtifactDigests as ReceizConstitutionJson,
    )
    || canonicalizeReceizConstitution(
      actualChildren as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      mergedChildren as unknown as ReceizConstitutionJson,
    )
    || BigInt((operation.kai as Record<string, unknown>).upulse as string)
      < maximumParentKai
  ) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_BINDING_INVALID");
  const witnessNodes = ordered.flatMap(({ carrier }) => {
    const head = carrier["profile-showcase"];
    return [
      ...(head.firstPaintWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
      ...(head.stateTransitionWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
    ];
  });
  const linear = await deriveReceizProfileShowcaseBoundedSuccessorHeadV114({
    ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
    predecessorCarrier: primary.carrier,
    predecessorArtifactDigest: primary.artifactDigest,
    directDelta,
    persistentStateIO: input.persistentStateIO
      ?? createReceizProfileShowcasePersistentMemoryStoreV114(witnessNodes),
  });
  const parentHeads = ordered.map(({ artifactDigest, carrier }) => {
    const head = carrier["profile-showcase"];
    return {
      artifactDigest,
      historyHeadDigest: carrier.receizProofHistory.headDigest,
      headKaiUpulse: head.headKaiUpulse,
      operationCount: head.resultingOperationCount,
      stateRoot: head.currentStateRoot,
    };
  }).sort((left, right) => left.artifactDigest.localeCompare(right.artifactDigest));
  const merged = { ...linear, parentHeads };
  assertReceizProfileShowcaseBoundedHeadV114(merged);
  return Object.freeze(structuredClone(merged));
}

export async function verifyReceizProfileShowcaseBoundedMergeV114(
  input: Parameters<typeof deriveReceizProfileShowcaseBoundedMergeHeadV114>[0]
    & Readonly<{ candidateHead: Readonly<Record<string, unknown>> }>,
): Promise<Readonly<Record<string, unknown>>> {
  assertReceizProfileShowcaseBoundedHeadV114(input.candidateHead);
  const expected = await deriveReceizProfileShowcaseBoundedMergeHeadV114(input);
  if (canonicalizeReceizConstitution(
    expected as unknown as ReceizConstitutionJson,
  ) !== canonicalizeReceizConstitution(
    input.candidateHead as unknown as ReceizConstitutionJson,
  )) fail("PROFILE_SHOWCASE_BOUNDED_MERGE_MISMATCH");
  return expected;
}

function assertMerkle(value: unknown): asserts value is ReceizCompositeMerkleTransport {
  if (!record(value)) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  exactKeys(value, ["algorithm", "leafCount", "root", "frontier"], "RECEIZ_COMPOSITE_MERKLE_UNKNOWN_FIELD");
  if (
    value.algorithm !== "sha256/binary-carry/v1"
    || !count(value.leafCount)
    || !digest(value.root)
    || !Array.isArray(value.frontier)
    || value.frontier.length > 64
    || value.frontier.some((item) => item !== null && !digest(item))
  ) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  const width = value.leafCount === 0 ? 0 : Math.floor(Math.log2(value.leafCount as number)) + 1;
  if (value.frontier.length !== width) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  assertReceizCompositeMerkleState(value as ReceizCompositeMerkleTransport);
}

function assertBoundedFibonacci(
  value: unknown,
  operationCount: number,
  genesis: boolean,
): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_INVALID");
  exactKeys(
    value,
    ["basis", "operationCount", "checkpoints"],
    "PROFILE_SHOWCASE_BOUNDED_FIBONACCI_UNKNOWN_FIELD",
  );
  if (value.basis !== "sparse-checkpoint/v1"
    || value.operationCount !== operationCount
    || !Array.isArray(value.checkpoints)) {
    fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_INVALID");
  }
  const distances: number[] = [];
  for (let current = 1, next = 2; current <= operationCount;) {
    if (current < operationCount) distances.push(current);
    [current, next] = [next, current + next];
  }
  if (genesis ? value.checkpoints.length !== 0 : value.checkpoints.length !== distances.length) {
    fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_INVALID");
  }
  value.checkpoints.forEach((checkpoint, index) => {
    if (!record(checkpoint)) fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_INVALID");
    exactKeys(
      checkpoint,
      ["distance", "operationCount", "artifactDigest"],
      "PROFILE_SHOWCASE_BOUNDED_FIBONACCI_UNKNOWN_FIELD",
    );
    if (
      genesis
      || checkpoint.distance !== distances[index]
      || checkpoint.operationCount !== operationCount - distances[index]!
      || !digest(checkpoint.artifactDigest)
    ) fail("PROFILE_SHOWCASE_BOUNDED_FIBONACCI_INVALID");
  });
}

function assertBoundedChildReference(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_CHILD_REFERENCE_INVALID");
  exactKeys(
    value,
    [
      "stableChildArtifactId",
      "immutableVersion",
      "childArtifactDigest",
      "admissionEvidenceRoot",
      "contentDigest",
    ],
    "PROFILE_SHOWCASE_BOUNDED_CHILD_REFERENCE_UNKNOWN_FIELD",
  );
  if (
    typeof value.stableChildArtifactId !== "string"
    || value.stableChildArtifactId.length === 0
    || typeof value.immutableVersion !== "string"
    || value.immutableVersion.length === 0
    || !digest(value.childArtifactDigest)
    || !digest(value.admissionEvidenceRoot)
    || !digest(value.contentDigest)
  ) fail("PROFILE_SHOWCASE_BOUNDED_CHILD_REFERENCE_INVALID");
}

function assertBoundedWitness(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
  exactKeys(
    value,
    [
      "schema",
      "segmentId",
      "segmentBytesDigest",
      "startOperationCount",
      "endOperationCount",
      "operationCount",
      "operationPosition",
      "leafIndex",
      "leafDigest",
      "siblings",
      "authority",
    ],
    "PROFILE_SHOWCASE_BOUNDED_WITNESS_UNKNOWN_FIELD",
  );
  if (
    value.schema !== "receiz.profile-showcase.membership-witness.v1"
    || !digest(value.segmentId)
    || !digest(value.segmentBytesDigest)
    || !count(value.startOperationCount)
    || !count(value.endOperationCount)
    || !count(value.operationCount)
    || value.operationCount === 0
    || value.operationCount > 256
    || value.endOperationCount !== value.startOperationCount + value.operationCount
    || !count(value.leafIndex)
    || value.leafIndex >= value.operationCount
    || value.operationPosition !== value.startOperationCount + value.leafIndex
    || !digest(value.leafDigest)
    || !Array.isArray(value.siblings)
    || value.siblings.length !== Math.ceil(Math.log2(value.operationCount as number))
  ) fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
  for (const sibling of value.siblings) {
    if (!record(sibling)) fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
    exactKeys(sibling, ["side", "digest"], "PROFILE_SHOWCASE_BOUNDED_WITNESS_UNKNOWN_FIELD");
    if ((sibling.side !== "left" && sibling.side !== "right") || !digest(sibling.digest)) {
      fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
    }
  }
  if (!record(value.authority)) fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
  exactKeys(
    value.authority,
    [
      "segmentIsProofAuthority",
      "rootIsProofAuthority",
      "witnessIsProofAuthority",
      "strongerTruth",
      "admissionStatus",
    ],
    "PROFILE_SHOWCASE_BOUNDED_WITNESS_UNKNOWN_FIELD",
  );
  if (
    value.authority.segmentIsProofAuthority !== false
    || value.authority.rootIsProofAuthority !== false
    || value.authority.witnessIsProofAuthority !== false
    || value.authority.strongerTruth !== "sealed-receiz-proof-object"
    || value.authority.admissionStatus !== "requires-sealed-showcase-artifact"
  ) fail("PROFILE_SHOWCASE_BOUNDED_WITNESS_INVALID");
}

function assertBoundedFirstPaintWindow(value: unknown, countsValue: unknown): void {
  if (!record(value) || !record(countsValue)) {
    fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
  }
  exactKeys(
    value,
    [
      "schema",
      "startVisibleIndex",
      "endVisibleIndex",
      "totalVisibleCount",
      "children",
      "continuation",
      "commitmentDigest",
    ],
    "PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_UNKNOWN_FIELD",
  );
  if (
    value.schema !== "receiz.profile-showcase.first-paint-window.v114"
    || value.startVisibleIndex !== 0
    || !count(value.endVisibleIndex)
    || !count(value.totalVisibleCount)
    || value.totalVisibleCount !== countsValue.visibleCount
    || !Array.isArray(value.children)
    || value.children.length !== value.endVisibleIndex
    || value.children.length > 256
    || value.totalVisibleCount < value.endVisibleIndex
    || !digest(value.commitmentDigest)
  ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
  for (const child of value.children) {
    if (!record(child)) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
    exactKeys(
      child,
      ["reference", "membershipWitness"],
      "PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_UNKNOWN_FIELD",
    );
    assertBoundedChildReference(child.reference);
    assertBoundedWitness(child.membershipWitness);
  }
  const needsContinuation = value.totalVisibleCount > value.endVisibleIndex;
  if (needsContinuation !== (value.continuation !== null)) {
    fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
  }
  if (value.continuation !== null) {
    if (!record(value.continuation)) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
    if ("placementRoot" in value.continuation) {
      exactKeys(
        value.continuation,
        [
          "nextVisibleIndex",
          "placementRoot",
          "orderRoot",
          "lastOrderKey",
          "witnessNodeDigests",
        ],
        "PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_UNKNOWN_FIELD",
      );
      if (
        value.continuation.nextVisibleIndex !== value.endVisibleIndex
        || !digest(value.continuation.placementRoot)
        || !digest(value.continuation.orderRoot)
        || typeof value.continuation.lastOrderKey !== "string"
        || !Array.isArray(value.continuation.witnessNodeDigests)
        || value.continuation.witnessNodeDigests.some(
          (nodeDigest) => !digest(nodeDigest),
        )
      ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
    } else {
      exactKeys(
        value.continuation,
        [
          "nextVisibleIndex",
          "afterChild",
          "segmentId",
          "segmentStartOperationCount",
          "checkpoint",
          "merkleRoot",
        ],
        "PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_UNKNOWN_FIELD",
      );
      if (
        value.continuation.nextVisibleIndex !== value.endVisibleIndex
        || value.children.length === 0
        || !digest(value.continuation.segmentId)
        || !count(value.continuation.segmentStartOperationCount)
        || !digest(value.continuation.merkleRoot)
      ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
      assertBoundedChildReference(value.continuation.afterChild);
      const last = (value.children.at(-1) as Record<string, unknown>).reference;
      if (canonicalizeReceizConstitution(last as ReceizConstitutionJson)
        !== canonicalizeReceizConstitution(
          value.continuation.afterChild as ReceizConstitutionJson,
        )) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
      if (value.continuation.checkpoint !== null) {
        if (!record(value.continuation.checkpoint)) {
          fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
        }
        exactKeys(
          value.continuation.checkpoint,
          ["operationCount", "artifactDigest"],
          "PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_UNKNOWN_FIELD",
        );
        if (!count(value.continuation.checkpoint.operationCount)
          || !digest(value.continuation.checkpoint.artifactDigest)) {
          fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
        }
      }
    }
  }
}

const BOUNDED_HEAD_KEYS = [
  "schema",
  "artifactId",
  "ownerReceizIdentity",
  "profileIdentity",
  "headKaiUpulse",
  "parentHeads",
  "priorOperationCount",
  "resultingOperationCount",
  "directDelta",
  "currentStateRoot",
  "placementRoot",
  "orderRoot",
  "merkle",
  "fibonacci",
  "segmentWindow",
  "counts",
  "firstPaintWindow",
  "firstPaintWitnessNodes",
  "stateTransitionWitnessNodes",
  "versions",
  "authority",
] as const;

export function assertReceizProfileShowcaseBoundedHeadV114(
  value: unknown,
): asserts value is Readonly<Record<string, unknown>> {
  if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_HEAD_INVALID");
  exactKeys(value, BOUNDED_HEAD_KEYS, "PROFILE_SHOWCASE_BOUNDED_HEAD_UNKNOWN_FIELD");
  if (
    value.schema !== "receiz.profile-showcase-head.v114"
    || typeof value.artifactId !== "string"
    || !value.artifactId.startsWith("profile-showcase:")
    || value.artifactId !== `profile-showcase:${value.ownerReceizIdentity}`
    || typeof value.profileIdentity !== "string"
    || !KAI_RE.test(value.headKaiUpulse as string)
    || !count(value.priorOperationCount)
    || !count(value.resultingOperationCount)
    || (value.resultingOperationCount as number) < (value.priorOperationCount as number)
    || !Array.isArray(value.parentHeads)
    || value.parentHeads.length > 64
    || !Array.isArray(value.directDelta)
    || value.directDelta.length > 1_024
    || (value.resultingOperationCount as number) - (value.priorOperationCount as number)
      !== value.directDelta.length
    || !digest(value.currentStateRoot)
    || !digest(value.placementRoot)
    || !digest(value.orderRoot)
    || !Array.isArray(value.segmentWindow)
    || value.segmentWindow.length > 256
    || !record(value.counts)
    || !record(value.firstPaintWindow)
    || !Array.isArray(value.firstPaintWitnessNodes)
    || !Array.isArray(value.stateTransitionWitnessNodes)
    || value.firstPaintWitnessNodes.length > 8_192
    || value.stateTransitionWitnessNodes.length > 1_024
    || !record(value.versions)
    || !record(value.authority)
  ) fail("PROFILE_SHOWCASE_BOUNDED_HEAD_INVALID");
  const parentHeads = value.parentHeads as readonly Record<string, unknown>[];
  const parentArtifactDigests = new Set<string>();
  let maximumCausalUpulse: bigint | null = null;
  for (const parent of parentHeads) {
    if (!record(parent)) fail("PROFILE_SHOWCASE_BOUNDED_PARENT_INVALID");
    exactKeys(
      parent,
      [
        "artifactDigest",
        "historyHeadDigest",
        "headKaiUpulse",
        "operationCount",
        "stateRoot",
      ],
      "PROFILE_SHOWCASE_BOUNDED_PARENT_UNKNOWN_FIELD",
    );
    if (
      !digest(parent.artifactDigest)
      || !digest(parent.historyHeadDigest)
      || typeof parent.headKaiUpulse !== "string"
      || !KAI_RE.test(parent.headKaiUpulse)
      || !count(parent.operationCount)
      || !digest(parent.stateRoot)
      || parentArtifactDigests.has(parent.artifactDigest)
    ) fail("PROFILE_SHOWCASE_BOUNDED_PARENT_INVALID");
    parentArtifactDigests.add(parent.artifactDigest);
    const parentUpulse = BigInt(parent.headKaiUpulse);
    if (maximumCausalUpulse === null || parentUpulse > maximumCausalUpulse) {
      maximumCausalUpulse = parentUpulse;
    }
  }
  assertReceizProfileShowcaseTransitionOperationsV114(value.directDelta);
  const countsValue = value.counts as Record<string, unknown>;
  exactKeys(
    countsValue,
    [
      "operationCount",
      "membershipCount",
      "visibleCount",
      "hiddenCount",
      "unlistedCount",
      "pinnedCount",
    ],
    "PROFILE_SHOWCASE_BOUNDED_COUNTS_UNKNOWN_FIELD",
  );
  for (const key of Object.keys(countsValue)) {
    if (!count(countsValue[key])) fail("PROFILE_SHOWCASE_BOUNDED_COUNTS_INVALID");
  }
  if (
    countsValue.operationCount !== value.resultingOperationCount
    || (countsValue.visibleCount as number)
      + (countsValue.hiddenCount as number)
      + (countsValue.unlistedCount as number)
      !== countsValue.membershipCount
    || (countsValue.pinnedCount as number) > (countsValue.membershipCount as number)
  ) fail("PROFILE_SHOWCASE_BOUNDED_COUNTS_INVALID");
  assertBoundedFibonacci(
    value.fibonacci,
    value.resultingOperationCount as number,
    parentHeads.length === 0,
  );
  for (const segment of value.segmentWindow as readonly unknown[]) {
    if (!record(segment)) fail("PROFILE_SHOWCASE_BOUNDED_SEGMENT_INVALID");
    exactKeys(
      segment,
      ["segmentId", "startOperationCount", "endOperationCount", "operationCount", "root"],
      "PROFILE_SHOWCASE_BOUNDED_SEGMENT_UNKNOWN_FIELD",
    );
    if (
      !digest(segment.segmentId)
      || !count(segment.startOperationCount)
      || !count(segment.endOperationCount)
      || !count(segment.operationCount)
      || segment.operationCount === 0
      || segment.operationCount > 256
      || segment.endOperationCount !== segment.startOperationCount + segment.operationCount
      || segment.endOperationCount > value.resultingOperationCount
      || !digest(segment.root)
    ) fail("PROFILE_SHOWCASE_BOUNDED_SEGMENT_INVALID");
  }
  assertBoundedFirstPaintWindow(value.firstPaintWindow, countsValue);
  createReceizProfileShowcasePersistentMemoryStoreV114([
    ...(value.firstPaintWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
    ...(value.stateTransitionWitnessNodes as readonly ReceizProfileShowcasePersistentNodeV114[]),
  ]);
  const continuation = (
    value.firstPaintWindow as Record<string, unknown>
  ).continuation;
  if (
    record(continuation)
    && "placementRoot" in continuation
    && (
      continuation.placementRoot !== value.placementRoot
      || continuation.orderRoot !== value.orderRoot
    )
  ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_INVALID");
  const versions = value.versions as Record<string, unknown>;
  exactKeys(
    versions,
    ["registryDigest", "kernelVersion", "verifierVersion"],
    "PROFILE_SHOWCASE_BOUNDED_VERSIONS_UNKNOWN_FIELD",
  );
  if (
    !digest(versions.registryDigest)
    || versions.kernelVersion !== "receiz.composite.kernel.v1"
    || versions.verifierVersion !== "receiz.profile-showcase.verifier.v114"
  ) fail("PROFILE_SHOWCASE_BOUNDED_VERSIONS_INVALID");
  const authority = value.authority as Record<string, unknown>;
  exactKeys(
    authority,
    [
      "showcaseIsProofAuthority",
      "strongerTruth",
      "historyIsProofAuthority",
      "projectionIsProofAuthority",
    ],
    "PROFILE_SHOWCASE_BOUNDED_AUTHORITY_UNKNOWN_FIELD",
  );
  if (
    authority.showcaseIsProofAuthority !== true
    || authority.strongerTruth !== "sealed-receiz-proof-object"
    || authority.historyIsProofAuthority !== false
    || authority.projectionIsProofAuthority !== false
  ) fail("PROFILE_SHOWCASE_BOUNDED_AUTHORITY_INVALID");
  for (const operation of value.directDelta as readonly Record<string, unknown>[]) {
    if (
      operation.parentArtifactDigest === null
        ? parentHeads.length !== 0
        : !parentArtifactDigests.has(operation.parentArtifactDigest as string)
    ) fail("PROFILE_SHOWCASE_BOUNDED_OPERATION_PARENT_INVALID");
    const operationUpulse = BigInt(
      (operation.kai as Record<string, unknown>).upulse as string,
    );
    if (maximumCausalUpulse !== null && operationUpulse < maximumCausalUpulse) {
      fail("PROFILE_SHOWCASE_BOUNDED_KAI_REGRESSION");
    }
    if (maximumCausalUpulse === null || operationUpulse > maximumCausalUpulse) {
      maximumCausalUpulse = operationUpulse;
    }
  }
  if (
    maximumCausalUpulse !== null
    && value.headKaiUpulse !== maximumCausalUpulse.toString()
  ) fail("PROFILE_SHOWCASE_BOUNDED_HEAD_KAI_INVALID");
  assertMerkle(value.merkle);
  if ((value.merkle as ReceizCompositeMerkleTransport).leafCount !== value.resultingOperationCount) {
    fail("PROFILE_SHOWCASE_BOUNDED_HEAD_INVALID");
  }
}

async function assertHistoryNode(node: ReceizProofHistoryNode): Promise<void> {
  const rebuilt = await createReceizProofHistoryNode({
    artifactId: node.artifactId,
    registryDigest: node.registryDigest,
    parentDigests: node.parentDigests,
    kaiPulse: node.kaiPulse,
    receipt: node.receipt,
    event: node.event,
    namespaceData: node.namespaceData,
  });
  if (
    canonicalizeReceizConstitution(rebuilt as unknown as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(node as unknown as ReceizConstitutionJson)
  ) fail("RECEIZ_CARRIED_HISTORY_HEAD_NODE_INVALID");
}

function historyHeadBasis(
  value: Omit<ReceizCarriedProofHistoryHeadV114, "commitmentDigest">,
): ReceizConstitutionJson {
  return structuredClone(value) as unknown as ReceizConstitutionJson;
}

async function verifyCompositeMerkle(
  state: ReceizCompositeMerkleTransport,
): Promise<void> {
  assertReceizCompositeMerkleState(state);
}

async function appendCompositeMerkle(
  prior: ReceizCompositeMerkleTransport,
  leafDigest: string,
): Promise<ReceizCompositeMerkleTransport> {
  await verifyCompositeMerkle(prior);
  if (!digest(leafDigest)) fail("RECEIZ_COMPOSITE_MERKLE_LEAF_INVALID");
  return appendReceizCompositeMerkleLeaf(prior, leafDigest);
}

export async function createReceizCarriedProofHistoryHeadV114(
  input: Omit<ReceizCarriedProofHistoryHeadV114, "schema" | "commitmentDigest">,
): Promise<ReceizCarriedProofHistoryHeadV114> {
  const basis = {
    schema: "receiz.carried-proof-history-head.v114" as const,
    ...structuredClone(input),
  };
  return parseReceizCarriedProofHistoryHeadV114({
    ...basis,
    commitmentDigest: await digestReceizAuthority(
      "history",
      "receiz.carried-proof-history-head.v114",
      historyHeadBasis(basis),
    ),
  });
}

export async function parseReceizCarriedProofHistoryHeadV114(
  value: unknown,
): Promise<ReceizCarriedProofHistoryHeadV114> {
  if (!record(value)) fail("RECEIZ_CARRIED_HISTORY_HEAD_INVALID");
  exactKeys(
    value,
    [
      "schema",
      "artifactId",
      "registryDigest",
      "rootDigest",
      "headDigest",
      "nodeCount",
      "accumulator",
      "currentNode",
      "parentRefs",
      "commitmentDigest",
    ],
    "RECEIZ_CARRIED_HISTORY_HEAD_UNKNOWN_FIELD",
  );
  if (
    value.schema !== "receiz.carried-proof-history-head.v114"
    || typeof value.artifactId !== "string"
    || !digest(value.registryDigest)
    || !digest(value.rootDigest)
    || !digest(value.headDigest)
    || !count(value.nodeCount)
    || (value.nodeCount as number) < 1
    || !record(value.currentNode)
    || !Array.isArray(value.parentRefs)
    || value.parentRefs.length > 64
    || !digest(value.commitmentDigest)
  ) fail("RECEIZ_CARRIED_HISTORY_HEAD_INVALID");
  assertMerkle(value.accumulator);
  await verifyCompositeMerkle(value.accumulator);
  const currentNode = value.currentNode as unknown as ReceizProofHistoryNode;
  await assertHistoryNode(currentNode);
  if (
    currentNode.artifactId !== value.artifactId
    || currentNode.registryDigest !== value.registryDigest
    || currentNode.nodeDigest !== value.headDigest
    || currentNode.parentDigests.length !== value.parentRefs.length
  ) fail("RECEIZ_CARRIED_HISTORY_HEAD_INVALID");
  const parentNodeDigests = new Set<string>();
  for (const parent of value.parentRefs) {
    if (!record(parent)) fail("RECEIZ_CARRIED_HISTORY_HEAD_PARENT_INVALID");
    exactKeys(
      parent,
      ["nodeDigest", "artifactDigest", "nodeCount", "accumulatorRoot"],
      "RECEIZ_CARRIED_HISTORY_HEAD_PARENT_UNKNOWN_FIELD",
    );
    if (
      !digest(parent.nodeDigest)
      || !digest(parent.artifactDigest)
      || !count(parent.nodeCount)
      || !digest(parent.accumulatorRoot)
      || !currentNode.parentDigests.includes(parent.nodeDigest as string)
      || parentNodeDigests.has(parent.nodeDigest as string)
    ) fail("RECEIZ_CARRIED_HISTORY_HEAD_PARENT_INVALID");
    parentNodeDigests.add(parent.nodeDigest as string);
  }
  if (currentNode.parentDigests.some((parent) => !parentNodeDigests.has(parent))) {
    fail("RECEIZ_CARRIED_HISTORY_HEAD_PARENT_INVALID");
  }
  if (value.parentRefs.length === 1 && (
    value.nodeCount !== value.parentRefs[0]!.nodeCount + 1
    || value.accumulator.leafCount !== value.nodeCount
  )) fail("RECEIZ_CARRIED_HISTORY_HEAD_ACCUMULATOR_INVALID");
  if (value.parentRefs.length === 0 && (
    value.nodeCount !== 1
    || value.accumulator.leafCount !== 1
    || value.accumulator.root !== currentNode.nodeDigest
    || value.accumulator.frontier.length !== 1
    || value.accumulator.frontier[0] !== currentNode.nodeDigest
  )) fail("RECEIZ_CARRIED_HISTORY_HEAD_ACCUMULATOR_INVALID");
  const { commitmentDigest, ...basis } = value;
  const expected = await digestReceizAuthority(
    "history",
    "receiz.carried-proof-history-head.v114",
    historyHeadBasis(basis as Omit<ReceizCarriedProofHistoryHeadV114, "commitmentDigest">),
  );
  if (expected !== commitmentDigest) fail("RECEIZ_CARRIED_HISTORY_HEAD_COMMITMENT_INVALID");
  return Object.freeze(structuredClone(value) as unknown as ReceizCarriedProofHistoryHeadV114);
}

/**
 * Appends one immutable history node to the carried bounded head. This is
 * transport mechanics beneath the newly sealed artifact; it creates no
 * parallel admission, planning, sealing, or commit authority.
 */
export async function appendReceizCarriedProofHistoryHeadV114(input: Readonly<{
  predecessor: ReceizCarriedProofHistoryHeadV114;
  predecessorArtifactDigest: string;
  appendNode: ReceizProofHistoryNode;
}>): Promise<ReceizCarriedProofHistoryHeadV114> {
  const predecessor = await parseReceizCarriedProofHistoryHeadV114(input.predecessor);
  await assertHistoryNode(input.appendNode);
  if (
    !digest(input.predecessorArtifactDigest)
    || input.appendNode.artifactId !== predecessor.artifactId
    || input.appendNode.registryDigest !== predecessor.registryDigest
    || input.appendNode.parentDigests.length !== 1
    || input.appendNode.parentDigests[0] !== predecessor.headDigest
  ) fail("RECEIZ_CARRIED_HISTORY_APPEND_INVALID");
  const accumulator = await appendCompositeMerkle(
    predecessor.accumulator,
    input.appendNode.nodeDigest,
  );
  return createReceizCarriedProofHistoryHeadV114({
    artifactId: predecessor.artifactId,
    registryDigest: predecessor.registryDigest,
    rootDigest: predecessor.rootDigest,
    headDigest: input.appendNode.nodeDigest,
    nodeCount: predecessor.nodeCount + 1,
    accumulator,
    currentNode: input.appendNode,
    parentRefs: [{
      nodeDigest: predecessor.headDigest,
      artifactDigest: input.predecessorArtifactDigest,
      nodeCount: predecessor.nodeCount,
      accumulatorRoot: predecessor.accumulator.root,
    }],
  });
}

export async function mergeReceizCarriedProofHistoryHeadsV114(input: Readonly<{
  parents: readonly Readonly<{
    historyHead: ReceizCarriedProofHistoryHeadV114;
    artifactDigest: string;
  }>[];
  mergeNode: ReceizProofHistoryNode;
}>): Promise<ReceizCarriedProofHistoryHeadV114> {
  if (!Array.isArray(input.parents) || input.parents.length !== 2) {
    fail("RECEIZ_CARRIED_HISTORY_MERGE_INVALID");
  }
  const parents = await Promise.all(input.parents.map(async (parent) => ({
    historyHead: await parseReceizCarriedProofHistoryHeadV114(
      parent.historyHead,
    ),
    artifactDigest: parent.artifactDigest,
  })));
  parents.sort((left, right) =>
    left.historyHead.headDigest.localeCompare(right.historyHead.headDigest));
  await assertHistoryNode(input.mergeNode);
  const [first, second] = parents;
  if (
    !first
    || !second
    || !digest(first.artifactDigest)
    || !digest(second.artifactDigest)
    || first.artifactDigest === second.artifactDigest
    || first.historyHead.artifactId !== second.historyHead.artifactId
    || first.historyHead.registryDigest !== second.historyHead.registryDigest
    || first.historyHead.rootDigest !== second.historyHead.rootDigest
    || first.historyHead.nodeCount !== second.historyHead.nodeCount
    || input.mergeNode.artifactId !== first.historyHead.artifactId
    || input.mergeNode.registryDigest !== first.historyHead.registryDigest
    || canonicalizeReceizConstitution(
      input.mergeNode.parentDigests as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      [first.historyHead.headDigest, second.historyHead.headDigest]
        .sort() as unknown as ReceizConstitutionJson,
    )
  ) fail("RECEIZ_CARRIED_HISTORY_MERGE_INVALID");
  const accumulator = await appendCompositeMerkle(
    first.historyHead.accumulator,
    input.mergeNode.nodeDigest,
  );
  return createReceizCarriedProofHistoryHeadV114({
    artifactId: first.historyHead.artifactId,
    registryDigest: first.historyHead.registryDigest,
    rootDigest: first.historyHead.rootDigest,
    headDigest: input.mergeNode.nodeDigest,
    nodeCount: first.historyHead.nodeCount + 1,
    accumulator,
    currentNode: input.mergeNode,
    parentRefs: parents.map((parent) => ({
      nodeDigest: parent.historyHead.headDigest,
      artifactDigest: parent.artifactDigest,
      nodeCount: parent.historyHead.nodeCount,
      accumulatorRoot: parent.historyHead.accumulator.root,
    })),
  });
}

export async function parseReceizBoundedProfileShowcaseCarrierV114(
  value: unknown,
): Promise<ReceizBoundedProfileShowcaseCarrierV114> {
  if (!record(value)) fail("PROFILE_SHOWCASE_BOUNDED_CARRIER_INVALID");
  exactKeys(
    value,
    ["schema", "artifactId", "ownerReceizIdentity", "profile-showcase", "receizProofHistory"],
    "PROFILE_SHOWCASE_BOUNDED_CARRIER_UNKNOWN_FIELD",
  );
  if (
    value.schema !== "receiz.profile-showcase-carrier.v114"
    || typeof value.artifactId !== "string"
    || !value.artifactId.startsWith("profile-showcase:")
    || typeof value.ownerReceizIdentity !== "string"
    || value.artifactId !== `profile-showcase:${value.ownerReceizIdentity}`
  ) fail("PROFILE_SHOWCASE_BOUNDED_CARRIER_INVALID");
  assertReceizProfileShowcaseBoundedHeadV114(value["profile-showcase"]);
  const head = value["profile-showcase"] as Record<string, unknown>;
  if (
    head.artifactId !== value.artifactId
    || head.ownerReceizIdentity !== value.ownerReceizIdentity
  ) fail("PROFILE_SHOWCASE_BOUNDED_CARRIER_INVALID");
  const history = await parseReceizCarriedProofHistoryHeadV114(value.receizProofHistory);
  if (
    history.artifactId !== value.artifactId
    || history.currentNode.kaiPulse !== head.headKaiUpulse
  ) fail("PROFILE_SHOWCASE_BOUNDED_CARRIER_INVALID");
  return Object.freeze(
    structuredClone(value) as unknown as ReceizBoundedProfileShowcaseCarrierV114,
  );
}

export async function createReceizBoundedProfileShowcaseCarrierV114(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  head: Readonly<Record<string, unknown>>;
  historyHead: ReceizCarriedProofHistoryHeadV114;
}>): Promise<ReceizBoundedProfileShowcaseCarrierV114> {
  return parseReceizBoundedProfileShowcaseCarrierV114({
    schema: "receiz.profile-showcase-carrier.v114",
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    "profile-showcase": structuredClone(input.head),
    receizProofHistory: structuredClone(input.historyHead),
  });
}

export async function parseReceizEconomyShowcaseCarrierV114(
  value: unknown,
): Promise<ReceizEconomyShowcaseCarrierV114> {
  if (!record(value)) fail("ECONOMY_SHOWCASE_CARRIER_INVALID");
  exactKeys(
    value,
    ["schema", "artifactId", "economy-showcase", "receizProofHistory"],
    "ECONOMY_SHOWCASE_CARRIER_UNKNOWN_FIELD",
  );
  if (
    value.schema !== "receiz.economy-showcase-carrier.v114"
    || value.artifactId !== RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID
  ) fail("ECONOMY_SHOWCASE_CARRIER_INVALID");
  assertReceizEconomyShowcaseHeadV114TransportContract(
    value["economy-showcase"],
  );
  const head = value["economy-showcase"];
  if (head.artifactId !== value.artifactId) {
    fail("ECONOMY_SHOWCASE_CARRIER_INVALID");
  }
  const history = await parseReceizCarriedProofHistoryHeadV114(
    value.receizProofHistory,
  );
  if (
    history.artifactId !== value.artifactId
    || history.currentNode.kaiPulse !== head.headKaiUpulse
  ) fail("ECONOMY_SHOWCASE_CARRIER_INVALID");
  return Object.freeze(
    structuredClone(value) as unknown as ReceizEconomyShowcaseCarrierV114,
  );
}

export async function createReceizEconomyShowcaseCarrierV114(input: Readonly<{
  head: ReceizEconomyShowcaseHeadV114;
  historyHead: ReceizCarriedProofHistoryHeadV114;
}>): Promise<ReceizEconomyShowcaseCarrierV114> {
  return parseReceizEconomyShowcaseCarrierV114({
    schema: "receiz.economy-showcase-carrier.v114",
    artifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
    "economy-showcase": structuredClone(input.head),
    receizProofHistory: structuredClone(input.historyHead),
  });
}

export async function assertReceizEconomyShowcaseCarriedHeadSemanticsV114(
  carrierInput: unknown,
): Promise<void> {
  const carrier = await parseReceizEconomyShowcaseCarrierV114(carrierInput);
  const head = carrier["economy-showcase"];
  const node = carrier.receizProofHistory.currentNode;
  if (
    node.artifactId !== RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID
    || node.registryDigest !== head.versions.registryDigest
    || node.event.type !== "state.append"
    || canonicalizeReceizConstitution(node.event.state)
      !== canonicalizeReceizConstitution(
        head as unknown as ReceizConstitutionJson,
      )
    || canonicalizeReceizConstitution(
      node.namespaceData["economy-showcase"],
    ) !== canonicalizeReceizConstitution(
      head as unknown as ReceizConstitutionJson,
    )
  ) fail("ECONOMY_SHOWCASE_HISTORY_BINDING_INVALID");
}

export async function assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(
  carrierInput: unknown,
): Promise<void> {
  const carrier = await parseReceizBoundedProfileShowcaseCarrierV114(carrierInput);
  const head = carrier["profile-showcase"] as Record<string, unknown>;
  const history = carrier.receizProofHistory;
  const node = history.currentNode;
  const directDelta = head.directDelta as readonly ReceizConstitutionJson[];
  const parentHeads = head.parentHeads as readonly Record<string, unknown>[];
  const firstPaintWindow = head.firstPaintWindow as Record<string, unknown>;
  const { commitmentDigest: firstPaintCommitment, ...firstPaintBasis } = firstPaintWindow;
  if (await digestReceizAuthority(
    "state",
    "receiz.profile-showcase.first-paint-window.v114",
    firstPaintBasis as ReceizConstitutionJson,
  ) !== firstPaintCommitment) {
    fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_COMMITMENT_INVALID");
  }
  const segmentWindow = head.segmentWindow as readonly Record<string, unknown>[];
  for (const child of firstPaintWindow.children as readonly Record<string, unknown>[]) {
    const witness = child.membershipWitness as Record<string, unknown>;
    const segment = segmentWindow.find((candidate) =>
      candidate.segmentId === witness.segmentId
      && candidate.root === (() => {
        let root = witness.leafDigest as string;
        for (const sibling of witness.siblings as readonly Record<string, unknown>[]) {
          root = sibling.side === "left"
            ? buildReceizCompositeMerkleParent(sibling.digest as string, root)
            : buildReceizCompositeMerkleParent(root, sibling.digest as string);
        }
        return root;
      })());
    if (!segment) fail("PROFILE_SHOWCASE_BOUNDED_WINDOW_SEGMENT_INVALID");
  }
  const continuation = firstPaintWindow.continuation as Record<string, unknown> | null;
  if (continuation) {
    if ("placementRoot" in continuation) {
      if (
        continuation.placementRoot !== head.placementRoot
        || continuation.orderRoot !== head.orderRoot
      ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_CONTINUATION_INVALID");
    } else {
      const segment = segmentWindow.find((candidate) =>
        candidate.segmentId === continuation.segmentId
        && candidate.startOperationCount === continuation.segmentStartOperationCount);
      const checkpoint = continuation.checkpoint as Record<string, unknown> | null;
      const fibonacci = head.fibonacci as Record<string, unknown>;
      if (
        !segment
        || continuation.merkleRoot !== (head.merkle as Record<string, unknown>).root
        || (checkpoint !== null && !(fibonacci.checkpoints as readonly Record<string, unknown>[])
          .some((candidate) =>
            candidate.operationCount === checkpoint.operationCount
            && candidate.artifactDigest === checkpoint.artifactDigest))
      ) fail("PROFILE_SHOWCASE_BOUNDED_FIRST_PAINT_CONTINUATION_INVALID");
    }
  }
  const parentShowcaseDigests = parentHeads
    .map((parent) => parent.artifactDigest as string)
    .sort();
  const operationParents = [...new Set(directDelta.flatMap((operation) => {
    if (!record(operation) || operation.parentArtifactDigest === null) return [];
    return typeof operation.parentArtifactDigest === "string"
      ? [operation.parentArtifactDigest]
      : [];
  }))].sort();
  const childAdmissionEvidenceRoots = [...new Set(directDelta.flatMap((operation) => {
    if (!record(operation)) return [];
    if (operation.kind === "showcase.append" && record(operation.child)
      && typeof operation.child.admissionEvidenceRoot === "string") {
      return [operation.child.admissionEvidenceRoot];
    }
    if (operation.kind === "showcase.merge" && Array.isArray(operation.mergedChildren)) {
      return operation.mergedChildren.flatMap((child) =>
        record(child) && typeof child.admissionEvidenceRoot === "string"
          ? [child.admissionEvidenceRoot]
          : []);
    }
    return [];
  }))].sort();
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
  const expectedEvent = {
    type: "profile-showcase.transition" as const,
    ...(carrier.receizProofHistory.currentNode.event.type === "profile-showcase.transition"
      && carrier.receizProofHistory.currentNode.event.actorEvidenceRoot !== undefined
      ? { actorEvidenceRoot: carrier.receizProofHistory.currentNode.event.actorEvidenceRoot } : {}),
    parentShowcaseDigests,
    predecessorShowcaseDigest: operationParents.length === 1
      ? operationParents[0]!
      : directDelta.length === 0 && parentHeads.length === 1
        ? parentHeads[0]!.artifactDigest as string
        : null,
    showcaseBodyDigest,
    operationDigest,
    directOperations: structuredClone(directDelta),
    childAdmissionEvidenceRoots,
    registryDigest: history.registryDigest,
    kaiUpulse: head.headKaiUpulse as string,
  };
  if (
    history.registryDigest !== (head.versions as Record<string, unknown>).registryDigest
    || history.headDigest !== node.nodeDigest
    || history.accumulator.leafCount !== history.nodeCount
    || canonicalizeReceizConstitution(node.event as unknown as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(expectedEvent as unknown as ReceizConstitutionJson)
  ) fail("PROFILE_SHOWCASE_BOUNDED_CARRIED_HISTORY_MISMATCH");
}
