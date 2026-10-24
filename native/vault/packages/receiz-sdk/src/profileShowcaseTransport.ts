import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { RECEIZ_V114_REGISTRY_DIGEST } from "./releaseIdentity.js";

export const RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS = Object.freeze({
  directOperations: 1_024,
  parentDigests: 64,
  segmentCommitments: 4_096,
  proofHistoryEvidenceRoots: 4_096,
  merkleFrontier: 64,
  fibonacciCheckpoints: 128,
  mergedChildren: 1_024,
  mergedParents: 64,
  firstPaintWindowChildren: 256,
} as const);

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_PULSE_RE = /^(0|[1-9][0-9]*)$/;
const PAYLOAD_KEYS = [
  "schema",
  "artifactId",
  "ownerReceizIdentity",
  "profileIdentity",
  "headKaiUpulse",
  "parentArtifactDigests",
  "priorOperationCount",
  "resultingOperationCount",
  "directOperations",
  "currentStateRoot",
  "merkle",
  "fibonacci",
  "segments",
  "counts",
  "firstPaintWindow",
  "proofHistoryEvidenceRoots",
  "versions",
  "authority",
] as const;
const COMMON_OPERATION_KEYS = [
  "schema",
  "kind",
  "parentArtifactDigest",
  "priorCommittedCount",
  "directDeltaPosition",
  "kai",
  "operationDigest",
  "authorityEvidenceRoot",
] as const;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype
      || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  const actual = Object.keys(value);
  if (actual.length !== keys.length
    || actual.some((key) => !keys.includes(key))
    || keys.some((key) => !(key in value))) {
    fail(code);
  }
}

function assertNonemptyString(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(code);
}

function assertDigest(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !DIGEST_RE.test(value)) fail(code);
}

function assertCount(value: unknown, code: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
}

function assertDigestArray(
  value: unknown,
  maximum: number,
  invalidCode: string,
  digestCode: string,
): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maximum) fail(invalidCode);
  for (const entry of value) assertDigest(entry, digestCode);
  if (new Set(value).size !== value.length) fail(invalidCode);
}

function assertExactAuthority(
  value: unknown,
  keys: readonly string[],
  expected: Readonly<Record<string, unknown>>,
  codePrefix: string,
): void {
  if (!record(value)) fail(`${codePrefix}_INVALID`);
  exactKeys(value, keys, `${codePrefix}_UNKNOWN_FIELD`);
  if (keys.some((key) => value[key] !== expected[key])) fail(`${codePrefix}_INVALID`);
}

function assertChildKey(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_CHILD_KEY_INVALID");
  exactKeys(
    value,
    ["stableChildArtifactId", "immutableVersion", "childArtifactDigest"],
    "PROFILE_SHOWCASE_CHILD_KEY_UNKNOWN_FIELD",
  );
  assertNonemptyString(value.stableChildArtifactId, "PROFILE_SHOWCASE_CHILD_ID_INVALID");
  assertNonemptyString(value.immutableVersion, "PROFILE_SHOWCASE_CHILD_VERSION_INVALID");
  assertDigest(value.childArtifactDigest, "PROFILE_SHOWCASE_CHILD_DIGEST_INVALID");
}

function assertChildReference(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_CHILD_REFERENCE_INVALID");
  exactKeys(
    value,
    [
      "stableChildArtifactId",
      "immutableVersion",
      "childArtifactDigest",
      "admissionEvidenceRoot",
      "contentDigest",
    ],
    "PROFILE_SHOWCASE_CHILD_REFERENCE_UNKNOWN_FIELD",
  );
  assertNonemptyString(value.stableChildArtifactId, "PROFILE_SHOWCASE_CHILD_ID_INVALID");
  assertNonemptyString(value.immutableVersion, "PROFILE_SHOWCASE_CHILD_VERSION_INVALID");
  assertDigest(value.childArtifactDigest, "PROFILE_SHOWCASE_CHILD_DIGEST_INVALID");
  assertDigest(value.admissionEvidenceRoot, "PROFILE_SHOWCASE_CHILD_ADMISSION_INVALID");
  assertDigest(value.contentDigest, "PROFILE_SHOWCASE_CHILD_CONTENT_INVALID");
}

function assertKai(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_KAI_INVALID");
  exactKeys(value, ["upulse"], "PROFILE_SHOWCASE_KAI_UNKNOWN_FIELD");
  if (typeof value.upulse !== "string" || !KAI_PULSE_RE.test(value.upulse)) {
    fail("PROFILE_SHOWCASE_KAI_UPULSE_INVALID");
  }
}

function assertOperation(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value)) fail("PROFILE_SHOWCASE_OPERATION_INVALID");
  if (value.schema !== "receiz.profile-showcase.operation.v1") {
    fail("PROFILE_SHOWCASE_OPERATION_SCHEMA_INVALID");
  }
  if (typeof value.kind !== "string") fail("PROFILE_SHOWCASE_OPERATION_KIND_INVALID");
  const specificKeys = (() => {
    switch (value.kind) {
      case "showcase.append":
        return ["child"];
      case "showcase.visibility.set":
        return ["child", "visibility"];
      case "showcase.presentation.pin":
      case "showcase.presentation.unpin":
        return ["child"];
      case "showcase.order.supersede":
        return ["child", "afterChild"];
      case "showcase.section.assign":
        return ["child", "sectionId"];
      case "showcase.provenance.bind":
        return ["child", "provenanceEvidenceRoot"];
      case "showcase.merge":
        return ["mergedParentArtifactDigests", "mergedChildren", "reconciliationEvidenceRoot"];
      default:
        fail("PROFILE_SHOWCASE_OPERATION_KIND_INVALID");
    }
  })();
  exactKeys(
    value,
    [...COMMON_OPERATION_KEYS, ...specificKeys],
    "PROFILE_SHOWCASE_OPERATION_UNKNOWN_FIELD",
  );
  if (value.parentArtifactDigest !== null) {
    assertDigest(value.parentArtifactDigest, "PROFILE_SHOWCASE_OPERATION_PARENT_INVALID");
  }
  assertCount(value.priorCommittedCount, "PROFILE_SHOWCASE_OPERATION_PRIOR_COUNT_INVALID");
  assertCount(value.directDeltaPosition, "PROFILE_SHOWCASE_OPERATION_DELTA_POSITION_INVALID");
  assertKai(value.kai);
  assertDigest(value.operationDigest, "PROFILE_SHOWCASE_OPERATION_DIGEST_INVALID");
  assertDigest(value.authorityEvidenceRoot, "PROFILE_SHOWCASE_OPERATION_AUTHORITY_INVALID");

  switch (value.kind) {
    case "showcase.append":
      assertChildReference(value.child);
      break;
    case "showcase.visibility.set":
      assertChildKey(value.child);
      if (!["visible", "unlisted", "hidden"].includes(value.visibility as string)) {
        fail("PROFILE_SHOWCASE_VISIBILITY_INVALID");
      }
      break;
    case "showcase.presentation.pin":
    case "showcase.presentation.unpin":
      assertChildKey(value.child);
      break;
    case "showcase.order.supersede":
      assertChildKey(value.child);
      if (value.afterChild !== null) assertChildKey(value.afterChild);
      break;
    case "showcase.section.assign":
      assertChildKey(value.child);
      if (value.sectionId !== null) {
        assertNonemptyString(value.sectionId, "PROFILE_SHOWCASE_SECTION_INVALID");
      }
      break;
    case "showcase.provenance.bind":
      assertChildKey(value.child);
      assertDigest(value.provenanceEvidenceRoot, "PROFILE_SHOWCASE_PROVENANCE_INVALID");
      break;
    case "showcase.merge":
      assertDigestArray(
        value.mergedParentArtifactDigests,
        RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.mergedParents,
        "PROFILE_SHOWCASE_MERGE_PARENTS_INVALID",
        "PROFILE_SHOWCASE_MERGE_PARENT_INVALID",
      );
      if (value.mergedParentArtifactDigests.length === 0) {
        fail("PROFILE_SHOWCASE_MERGE_PARENTS_INVALID");
      }
      if (!Array.isArray(value.mergedChildren)
        || value.mergedChildren.length
          > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.mergedChildren) {
        fail("PROFILE_SHOWCASE_MERGE_CHILDREN_INVALID");
      }
      for (const child of value.mergedChildren) assertChildReference(child);
      assertDigest(value.reconciliationEvidenceRoot, "PROFILE_SHOWCASE_RECONCILIATION_INVALID");
      break;
  }
}

function operationChildDigest(value: Record<string, unknown>): string {
  if (value.kind === "showcase.append") {
    return (value.child as Record<string, unknown>).childArtifactDigest as string;
  }
  if (value.kind === "showcase.merge") {
    return (value.mergedChildren as readonly Record<string, unknown>[])
      .map((child) => child.childArtifactDigest as string).sort().join("\u0000");
  }
  return (value.child as Record<string, unknown>).childArtifactDigest as string;
}

function compareOperationProjection(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const compare = (a: string | number, b: string | number) => a < b ? -1 : a > b ? 1 : 0;
  const parent = compare(String(left.parentArtifactDigest ?? ""), String(right.parentArtifactDigest ?? ""));
  if (parent !== 0) return parent;
  const prior = compare(left.priorCommittedCount as number, right.priorCommittedCount as number);
  if (prior !== 0) return prior;
  const delta = compare(left.directDeltaPosition as number, right.directDeltaPosition as number);
  if (delta !== 0) return delta;
  const leftKai = BigInt((left.kai as Record<string, unknown>).upulse as string);
  const rightKai = BigInt((right.kai as Record<string, unknown>).upulse as string);
  const kai = leftKai < rightKai ? -1 : leftKai > rightKai ? 1 : 0;
  if (kai !== 0) return kai;
  const digest = compare(left.operationDigest as string, right.operationDigest as string);
  return digest !== 0 ? digest : compare(operationChildDigest(left), operationChildDigest(right));
}

export function compareReceizProfileShowcaseTransitionOperationsV114(left: unknown, right: unknown): number {
  assertOperation(left);
  assertOperation(right);
  return compareOperationProjection(left, right);
}

function normalizeChildKey(value: Record<string, unknown>): Record<string, unknown> {
  return {
    stableChildArtifactId: (value.stableChildArtifactId as string).normalize("NFC"),
    immutableVersion: (value.immutableVersion as string).normalize("NFC"),
    childArtifactDigest: value.childArtifactDigest,
  };
}

function normalizeChild(value: Record<string, unknown>): Record<string, unknown> {
  return {
    ...normalizeChildKey(value),
    admissionEvidenceRoot: value.admissionEvidenceRoot,
    contentDigest: value.contentDigest,
  };
}

function normalizeOperationProjection(value: Record<string, unknown>): Record<string, unknown> {
  const common = {
    schema: value.schema,
    kind: value.kind,
    parentArtifactDigest: value.parentArtifactDigest,
    priorCommittedCount: value.priorCommittedCount,
    directDeltaPosition: value.directDeltaPosition,
    kai: { upulse: (value.kai as Record<string, unknown>).upulse },
    operationDigest: value.operationDigest,
    authorityEvidenceRoot: value.authorityEvidenceRoot,
  };
  switch (value.kind) {
    case "showcase.append":
      return { ...common, child: normalizeChild(value.child as Record<string, unknown>) };
    case "showcase.visibility.set":
      return { ...common, child: normalizeChildKey(value.child as Record<string, unknown>), visibility: value.visibility };
    case "showcase.presentation.pin":
    case "showcase.presentation.unpin":
      return { ...common, child: normalizeChildKey(value.child as Record<string, unknown>) };
    case "showcase.order.supersede":
      return {
        ...common,
        child: normalizeChildKey(value.child as Record<string, unknown>),
        afterChild: value.afterChild === null ? null : normalizeChildKey(value.afterChild as Record<string, unknown>),
      };
    case "showcase.section.assign":
      return {
        ...common,
        child: normalizeChildKey(value.child as Record<string, unknown>),
        sectionId: value.sectionId === null ? null : (value.sectionId as string).normalize("NFC"),
      };
    case "showcase.provenance.bind":
      return { ...common, child: normalizeChildKey(value.child as Record<string, unknown>), provenanceEvidenceRoot: value.provenanceEvidenceRoot };
    case "showcase.merge":
      return {
        ...common,
        mergedParentArtifactDigests: [...value.mergedParentArtifactDigests as readonly string[]]
          .sort((left, right) => left.normalize("NFC").localeCompare(right.normalize("NFC"))),
        mergedChildren: (value.mergedChildren as readonly Record<string, unknown>[]).map(normalizeChild),
        reconciliationEvidenceRoot: value.reconciliationEvidenceRoot,
      };
  }
  fail("PROFILE_SHOWCASE_OPERATION_KIND_INVALID");
}

/** The single v114 canonical operation form used by app folding and SDK verification. */
export function canonicalizeReceizProfileShowcaseTransitionOperationsV114(
  value: unknown,
): readonly ReceizConstitutionJson[] {
  if (!Array.isArray(value)
    || value.length > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.directOperations) {
    fail("PROFILE_SHOWCASE_DIRECT_OPERATIONS_INVALID");
  }
  const normalized = value.map((operation) => {
    assertOperation(operation);
    return normalizeOperationProjection(operation);
  });
  const identities = new Map<string, string>();
  for (const operation of normalized) {
    const identity = canonicalizeReceizConstitution(operation as ReceizConstitutionJson);
    const digest = operation.operationDigest as string;
    const prior = identities.get(digest);
    if (prior !== undefined && prior !== identity) fail("PROFILE_SHOWCASE_OPERATION_DIGEST_CONFLICT");
    identities.set(digest, identity);
  }
  return normalized.sort(compareOperationProjection) as ReceizConstitutionJson[];
}

/**
 * Validates the exact v114 operation projection carried by a sealed profile
 * history event. This is a transport mechanic; the enclosing sealed artifact
 * remains the proof authority.
 */
export function assertReceizProfileShowcaseTransitionOperationsV114(
  value: unknown,
): asserts value is readonly ReceizConstitutionJson[] {
  const canonical = canonicalizeReceizProfileShowcaseTransitionOperationsV114(value);
  if (canonicalizeReceizConstitution(value as ReceizConstitutionJson)
    !== canonicalizeReceizConstitution(canonical as ReceizConstitutionJson)) {
    fail("PROFILE_SHOWCASE_OPERATION_ORDER_INVALID");
  }
  const operations = value as Record<string, unknown>[];
  const identities = new Set<string>();
  const children = new Map<string, string>();
  for (const operation of operations) {
    const operationDigest = operation.operationDigest as string;
    if (identities.has(operationDigest)) fail("PROFILE_SHOWCASE_OPERATION_DUPLICATE");
    identities.add(operationDigest);
    const memberships = operation.kind === "showcase.append"
      ? [operation.child as Record<string, unknown>]
      : operation.kind === "showcase.merge"
        ? operation.mergedChildren as readonly Record<string, unknown>[]
        : [];
    for (const child of memberships) {
      const key = `${child.stableChildArtifactId}\u0000${child.immutableVersion}`;
      const identity = canonicalizeReceizConstitution(child as ReceizConstitutionJson);
      const previous = children.get(key);
      if (previous !== undefined) {
        if (previous !== identity) fail("PROFILE_SHOWCASE_CHILD_IDENTITY_CONFLICT");
        fail("PROFILE_SHOWCASE_CHILD_IDENTITY_DUPLICATE");
      }
      children.set(key, identity);
    }
  }
}

function fibonacciDistancesUpTo(index: number): number[] {
  const distances: number[] = [];
  let current = 1;
  let next = 2;
  while (current <= index) {
    distances.push(current);
    [current, next] = [next, current + next];
  }
  return distances;
}

function assertMerkle(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_MERKLE_INVALID");
  exactKeys(
    value,
    ["algorithm", "leafCount", "root", "frontier", "authority"],
    "PROFILE_SHOWCASE_MERKLE_UNKNOWN_FIELD",
  );
  if (value.algorithm !== "sha256/binary-carry/v1") {
    fail("PROFILE_SHOWCASE_MERKLE_ALGORITHM_INVALID");
  }
  assertCount(value.leafCount, "PROFILE_SHOWCASE_MERKLE_LEAF_COUNT_INVALID");
  assertDigest(value.root, "PROFILE_SHOWCASE_MERKLE_ROOT_INVALID");
  if (!Array.isArray(value.frontier)
    || value.frontier.length > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.merkleFrontier) {
    fail("PROFILE_SHOWCASE_MERKLE_FRONTIER_INVALID");
  }
  for (const digest of value.frontier) {
    if (digest !== null) assertDigest(digest, "PROFILE_SHOWCASE_MERKLE_FRONTIER_DIGEST_INVALID");
  }
  assertExactAuthority(
    value.authority,
    [
      "merkleIsProofAuthority",
      "rootIsProofAuthority",
      "frontierIsProofAuthority",
      "strongerTruth",
      "admissionStatus",
    ],
    {
      merkleIsProofAuthority: false,
      rootIsProofAuthority: false,
      frontierIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
      admissionStatus: "requires-sealed-showcase-artifact",
    },
    "PROFILE_SHOWCASE_MERKLE_AUTHORITY",
  );
}

function assertFibonacci(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_FIBONACCI_INVALID");
  exactKeys(
    value,
    ["basis", "operationCount", "checkpoints", "authority"],
    "PROFILE_SHOWCASE_FIBONACCI_UNKNOWN_FIELD",
  );
  if (value.basis !== "sparse-checkpoint/v1") {
    fail("PROFILE_SHOWCASE_FIBONACCI_BASIS_INVALID");
  }
  assertCount(value.operationCount, "PROFILE_SHOWCASE_FIBONACCI_OPERATION_COUNT_INVALID");
  if (!Array.isArray(value.checkpoints)
    || value.checkpoints.length
      > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.fibonacciCheckpoints) {
    fail("PROFILE_SHOWCASE_FIBONACCI_CHECKPOINTS_INVALID");
  }
  const operationCount = value.operationCount as number;
  const expectedDistances = fibonacciDistancesUpTo(operationCount);
  if (value.checkpoints.length !== expectedDistances.length) {
    fail("PROFILE_SHOWCASE_FIBONACCI_CHECKPOINTS_INVALID");
  }
  for (let index = 0; index < value.checkpoints.length; index += 1) {
    const checkpoint = value.checkpoints[index];
    if (!record(checkpoint)) fail("PROFILE_SHOWCASE_FIBONACCI_CHECKPOINT_INVALID");
    exactKeys(
      checkpoint,
      ["distance", "operationCount", "artifactDigest"],
      "PROFILE_SHOWCASE_FIBONACCI_CHECKPOINT_UNKNOWN_FIELD",
    );
    assertCount(checkpoint.distance, "PROFILE_SHOWCASE_FIBONACCI_DISTANCE_INVALID");
    if (checkpoint.distance !== expectedDistances[index]) {
      fail("PROFILE_SHOWCASE_FIBONACCI_DISTANCE_INVALID");
    }
    assertCount(
      checkpoint.operationCount,
      "PROFILE_SHOWCASE_FIBONACCI_CHECKPOINT_COUNT_INVALID",
    );
    if (checkpoint.operationCount !== operationCount - checkpoint.distance) {
      fail("PROFILE_SHOWCASE_FIBONACCI_CHECKPOINT_COUNT_INVALID");
    }
    assertDigest(checkpoint.artifactDigest, "PROFILE_SHOWCASE_FIBONACCI_DIGEST_INVALID");
  }
  assertExactAuthority(
    value.authority,
    [
      "fibonacciIsProofAuthority",
      "checkpointIsProofAuthority",
      "strongerTruth",
      "resolutionStatus",
    ],
    {
      fibonacciIsProofAuthority: false,
      checkpointIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
      resolutionStatus: "requires-already-verified-sealed-head-references",
    },
    "PROFILE_SHOWCASE_FIBONACCI_AUTHORITY",
  );
}

function assertSegments(value: unknown): void {
  if (!Array.isArray(value)
    || value.length > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.segmentCommitments) {
    fail("PROFILE_SHOWCASE_SEGMENTS_INVALID");
  }
  for (const segment of value) {
    if (!record(segment)) fail("PROFILE_SHOWCASE_SEGMENT_INVALID");
    exactKeys(
      segment,
      [
        "segmentId",
        "startOperationCount",
        "endOperationCount",
        "operationCount",
        "root",
        "authority",
      ],
      "PROFILE_SHOWCASE_SEGMENT_UNKNOWN_FIELD",
    );
    assertNonemptyString(segment.segmentId, "PROFILE_SHOWCASE_SEGMENT_ID_INVALID");
    assertCount(segment.startOperationCount, "PROFILE_SHOWCASE_SEGMENT_START_INVALID");
    assertCount(segment.endOperationCount, "PROFILE_SHOWCASE_SEGMENT_END_INVALID");
    assertCount(segment.operationCount, "PROFILE_SHOWCASE_SEGMENT_COUNT_INVALID");
    if (segment.endOperationCount < segment.startOperationCount
      || segment.endOperationCount - segment.startOperationCount !== segment.operationCount) {
      fail("PROFILE_SHOWCASE_SEGMENT_RANGE_INVALID");
    }
    assertDigest(segment.root, "PROFILE_SHOWCASE_SEGMENT_ROOT_INVALID");
    assertExactAuthority(
      segment.authority,
      [
        "segmentIsProofAuthority",
        "rootIsProofAuthority",
        "witnessIsProofAuthority",
        "strongerTruth",
        "admissionStatus",
      ],
      {
        segmentIsProofAuthority: false,
        rootIsProofAuthority: false,
        witnessIsProofAuthority: false,
        strongerTruth: "sealed-receiz-proof-object",
        admissionStatus: "requires-sealed-showcase-artifact",
      },
      "PROFILE_SHOWCASE_SEGMENT_AUTHORITY",
    );
  }
}

function assertFirstPaintWindow(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_INVALID");
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
      "authority",
    ],
    "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_UNKNOWN_FIELD",
  );
  if (value.schema !== "receiz.profile-showcase.first-paint-window.v1"
    || value.startVisibleIndex !== 0) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_INVALID");
  }
  assertCount(value.endVisibleIndex, "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_RANGE_INVALID");
  assertCount(value.totalVisibleCount, "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_TOTAL_INVALID");
  if (!Array.isArray(value.children)
    || value.children.length !== value.endVisibleIndex
    || value.children.length
      > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.firstPaintWindowChildren
    || (value.totalVisibleCount as number) < value.children.length) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_RANGE_INVALID");
  }
  for (const child of value.children) assertChildKey(child);
  if (value.continuation === null) {
    if (value.totalVisibleCount !== value.endVisibleIndex) {
      fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CONTINUATION_INVALID");
    }
  } else {
    if (!record(value.continuation)) {
      fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CONTINUATION_INVALID");
    }
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
      "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CONTINUATION_UNKNOWN_FIELD",
    );
    if (value.continuation.nextVisibleIndex !== value.endVisibleIndex
      || value.totalVisibleCount === value.endVisibleIndex
      || value.children.length === 0) {
      fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CONTINUATION_INVALID");
    }
    assertChildKey(value.continuation.afterChild);
    assertDigest(
      value.continuation.segmentId,
      "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_SEGMENT_INVALID",
    );
    assertCount(
      value.continuation.segmentStartOperationCount,
      "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_SEGMENT_INVALID",
    );
    assertDigest(
      value.continuation.merkleRoot,
      "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_MERKLE_INVALID",
    );
    if (value.continuation.checkpoint !== null) {
      if (!record(value.continuation.checkpoint)) {
        fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CHECKPOINT_INVALID");
      }
      exactKeys(
        value.continuation.checkpoint,
        ["operationCount", "artifactDigest"],
        "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CHECKPOINT_UNKNOWN_FIELD",
      );
      assertCount(
        value.continuation.checkpoint.operationCount,
        "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CHECKPOINT_INVALID",
      );
      assertDigest(
        value.continuation.checkpoint.artifactDigest,
        "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CHECKPOINT_INVALID",
      );
    }
    if (canonicalizeReceizConstitution(value.continuation.afterChild as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(value.children.at(-1) as ReceizConstitutionJson)) {
      fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CONTINUATION_INVALID");
    }
  }
  assertDigest(
    value.commitmentDigest,
    "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_COMMITMENT_INVALID",
  );
  assertExactAuthority(
    value.authority,
    [
      "windowIsProofAuthority",
      "projectionIsProofAuthority",
      "strongerTruth",
      "bindingStatus",
    ],
    {
      windowIsProofAuthority: false,
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
      bindingStatus: "sealed-in-showcase-head",
    },
    "PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_AUTHORITY",
  );
}

function assertCounts(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_COUNTS_INVALID");
  const keys = [
    "operationCount",
    "membershipCount",
    "visibleCount",
    "hiddenCount",
    "unlistedCount",
    "pinnedCount",
  ] as const;
  exactKeys(value, keys, "PROFILE_SHOWCASE_COUNTS_UNKNOWN_FIELD");
  for (const key of keys) assertCount(value[key], "PROFILE_SHOWCASE_COUNT_INVALID");
  if ((value.visibleCount as number)
      + (value.hiddenCount as number)
      + (value.unlistedCount as number)
    !== value.membershipCount) {
    fail("PROFILE_SHOWCASE_MEMBERSHIP_COUNTS_INVALID");
  }
  if ((value.pinnedCount as number) > (value.membershipCount as number)) {
    fail("PROFILE_SHOWCASE_PINNED_COUNT_INVALID");
  }
}

function assertVersions(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_VERSIONS_INVALID");
  exactKeys(
    value,
    [
      "ordering",
      "projectionSchemaVersion",
      "verifierVersion",
      "kernelVersion",
      "registryVersion",
      "operationMatrixVersion",
      "registryDigest",
      "operationRegistryDigest",
    ],
    "PROFILE_SHOWCASE_VERSIONS_UNKNOWN_FIELD",
  );
  if (value.ordering !== "parent/prior-count/delta/kai/operation/child.v1") {
    fail("PROFILE_SHOWCASE_ORDERING_VERSION_INVALID");
  }
  for (const key of [
    "projectionSchemaVersion",
    "verifierVersion",
    "kernelVersion",
    "registryVersion",
    "operationMatrixVersion",
  ]) {
    assertNonemptyString(value[key], "PROFILE_SHOWCASE_VERSION_INVALID");
  }
  assertDigest(value.registryDigest, "PROFILE_SHOWCASE_REGISTRY_DIGEST_INVALID");
  assertDigest(value.operationRegistryDigest, "PROFILE_SHOWCASE_OPERATION_REGISTRY_DIGEST_INVALID");
}

export function assertReceizProfileShowcaseV114TransportContract(
  value: unknown,
): asserts value is Readonly<Record<string, ReceizConstitutionJson>> {
  if (!record(value)) fail("PROFILE_SHOWCASE_PAYLOAD_INVALID");
  exactKeys(value, PAYLOAD_KEYS, "PROFILE_SHOWCASE_PAYLOAD_UNKNOWN_FIELD");
  if (value.schema !== "receiz.profile-showcase.v1") {
    fail("PROFILE_SHOWCASE_PAYLOAD_SCHEMA_INVALID");
  }
  assertNonemptyString(value.ownerReceizIdentity, "PROFILE_SHOWCASE_OWNER_IDENTITY_INVALID");
  if (typeof value.artifactId !== "string"
    || !/^profile-showcase:[^\u0000-\u001F\u007F]+$/.test(value.artifactId)) {
    fail("PROFILE_SHOWCASE_ARTIFACT_ID_INVALID");
  }
  assertNonemptyString(value.profileIdentity, "PROFILE_SHOWCASE_PROFILE_IDENTITY_INVALID");
  if (typeof value.headKaiUpulse !== "string" || !KAI_PULSE_RE.test(value.headKaiUpulse)) {
    fail("PROFILE_SHOWCASE_HEAD_KAI_UPULSE_INVALID");
  }
  assertDigestArray(
    value.parentArtifactDigests,
    RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.parentDigests,
    "PROFILE_SHOWCASE_PARENT_DIGESTS_INVALID",
    "PROFILE_SHOWCASE_PARENT_DIGEST_INVALID",
  );
  assertCount(value.priorOperationCount, "PROFILE_SHOWCASE_PRIOR_OPERATION_COUNT_INVALID");
  assertCount(value.resultingOperationCount, "PROFILE_SHOWCASE_RESULTING_OPERATION_COUNT_INVALID");
  if (!Array.isArray(value.directOperations)
    || value.directOperations.length
      > RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.directOperations) {
    fail("PROFILE_SHOWCASE_DIRECT_OPERATIONS_INVALID");
  }
  const directOperations = value.directOperations as readonly Record<string, unknown>[];
  const parentArtifactDigests = value.parentArtifactDigests as readonly string[];
  for (const operation of directOperations) {
    assertOperation(operation);
    if (operation.parentArtifactDigest === null
      ? parentArtifactDigests.length !== 0
      : !parentArtifactDigests.includes(operation.parentArtifactDigest as string)) {
      fail("PROFILE_SHOWCASE_OPERATION_PARENT_RELATION_INVALID");
    }
  }
  if (value.resultingOperationCount
    !== (value.priorOperationCount as number) + directOperations.length) {
    fail("PROFILE_SHOWCASE_OPERATION_COUNT_TRANSITION_INVALID");
  }
  assertDigest(value.currentStateRoot, "PROFILE_SHOWCASE_STATE_ROOT_INVALID");
  assertMerkle(value.merkle);
  assertFibonacci(value.fibonacci);
  assertSegments(value.segments);
  assertCounts(value.counts);
  assertFirstPaintWindow(value.firstPaintWindow);
  if ((value.firstPaintWindow as Record<string, unknown>).totalVisibleCount
    !== (value.counts as Record<string, unknown>).visibleCount) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_TOTAL_INVALID");
  }
  assertDigestArray(
    value.proofHistoryEvidenceRoots,
    RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.proofHistoryEvidenceRoots,
    "PROFILE_SHOWCASE_HISTORY_ROOTS_INVALID",
    "PROFILE_SHOWCASE_HISTORY_ROOT_INVALID",
  );
  assertVersions(value.versions);
  assertExactAuthority(
    value.authority,
    [
      "showcaseIsProofAuthority",
      "strongerTruth",
      "historyIsProofAuthority",
      "projectionIsProofAuthority",
    ],
    {
      showcaseIsProofAuthority: true,
      strongerTruth: "sealed-receiz-proof-object",
      historyIsProofAuthority: false,
      projectionIsProofAuthority: false,
    },
    "PROFILE_SHOWCASE_AUTHORITY",
  );
}

function assertExactV114CommitmentAndVersionBindings(
  value: Readonly<Record<string, ReceizConstitutionJson>>,
): void {
  const resultingOperationCount = value.resultingOperationCount as number;
  const merkle = value.merkle as Record<string, unknown>;
  const fibonacci = value.fibonacci as Record<string, unknown>;
  const counts = value.counts as Record<string, unknown>;
  const versions = value.versions as Record<string, unknown>;
  if (merkle.leafCount !== resultingOperationCount
    || fibonacci.operationCount !== resultingOperationCount
    || counts.operationCount !== resultingOperationCount
    || versions.projectionSchemaVersion !== "receiz.profile-showcase.projection.v1"
    || versions.verifierVersion !== "receiz.verifier.v114"
    || versions.kernelVersion !== "receiz.kernel.v114"
    || versions.registryVersion !== "receiz.registry.v114"
    || versions.operationMatrixVersion !== "receiz.profile-showcase.operations.v1"
    || versions.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
    || (value.segments as readonly Record<string, unknown>[]).some(
      (segment) => (segment.endOperationCount as number) > resultingOperationCount,
    )) {
    fail("PROFILE_SHOWCASE_V114_COMMITMENT_INVALID");
  }
}

export function assertReceizProfileShowcaseCarrierV114TransportContract(
  value: unknown,
): asserts value is Readonly<Record<string, ReceizConstitutionJson>> {
  assertReceizProfileShowcaseV114TransportContract(value);
  assertExactV114CommitmentAndVersionBindings(value);
}

export function assertReceizProfileShowcaseGenesisV114TransportContract(
  value: unknown,
  input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    actorEvidenceRoot: string;
    genesisKaiUpulse: string;
  }>,
): asserts value is Readonly<Record<string, ReceizConstitutionJson>> {
  assertReceizProfileShowcaseCarrierV114TransportContract(value);
  if (value.artifactId !== input.artifactId
    || value.ownerReceizIdentity !== input.ownerReceizIdentity
    || value.profileIdentity !== input.profileIdentity
    || value.headKaiUpulse !== input.genesisKaiUpulse
    || (value.parentArtifactDigests as readonly unknown[]).length !== 0) {
    fail("PROFILE_SHOWCASE_GENESIS_IDENTITY_INVALID");
  }
  if (value.priorOperationCount !== 0) {
    fail("PROFILE_SHOWCASE_GENESIS_PRIOR_COUNT_INVALID");
  }
  const resultingOperationCount = value.resultingOperationCount as number;
  if (resultingOperationCount
    !== (value.directOperations as readonly unknown[]).length) {
    fail("PROFILE_SHOWCASE_GENESIS_OPERATION_COUNT_INVALID");
  }
  const admittedRoots = new Set<string>();
  for (const operation of value.directOperations as readonly Record<string, unknown>[]) {
    if (operation.parentArtifactDigest !== null
      || operation.priorCommittedCount !== 0
      || operation.authorityEvidenceRoot !== input.actorEvidenceRoot) {
      fail("PROFILE_SHOWCASE_GENESIS_OPERATION_INVALID");
    }
    if (operation.kind === "showcase.append") {
      admittedRoots.add((operation.child as Record<string, unknown>).admissionEvidenceRoot as string);
    }
    if (operation.kind === "showcase.merge") {
      for (const child of operation.mergedChildren as readonly Record<string, unknown>[]) {
        admittedRoots.add(child.admissionEvidenceRoot as string);
      }
    }
  }
  const carriedRoots = new Set(value.proofHistoryEvidenceRoots as readonly string[]);
  if (admittedRoots.size !== carriedRoots.size
    || [...admittedRoots].some((root) => !carriedRoots.has(root))) {
    fail("PROFILE_SHOWCASE_GENESIS_CHILD_EVIDENCE_INVALID");
  }
}

export function assertReceizProfileShowcaseDescendantV114TransportContract(
  value: unknown,
  input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    predecessorArtifactDigest: string;
    predecessorResultingOperationCount: number;
    predecessorHeadKaiUpulse: string;
    additionalParentHeadKaiUpulses?: readonly string[];
    actorEvidenceRoot: string;
  }>,
): asserts value is Readonly<Record<string, ReceizConstitutionJson>> {
  assertReceizProfileShowcaseCarrierV114TransportContract(value);
  const parentArtifactDigests = value.parentArtifactDigests as readonly string[];
  const directOperations = value.directOperations as readonly Record<string, unknown>[];
  if (value.artifactId !== input.artifactId
    || value.ownerReceizIdentity !== input.ownerReceizIdentity
    || value.profileIdentity !== input.profileIdentity) {
    fail("PROFILE_SHOWCASE_DESCENDANT_IDENTITY_INVALID");
  }
  if (parentArtifactDigests.length === 0) {
    fail("PROFILE_SHOWCASE_PREDECESSOR_REQUIRED");
  }
  if (!parentArtifactDigests.includes(input.predecessorArtifactDigest)
    || value.priorOperationCount !== input.predecessorResultingOperationCount
    || directOperations.length === 0) {
    fail("PROFILE_SHOWCASE_DESCENDANT_PREDECESSOR_INVALID");
  }
  let resultingHeadKaiUpulse = BigInt(input.predecessorHeadKaiUpulse);
  for (const upulse of input.additionalParentHeadKaiUpulses ?? []) {
    if (!KAI_PULSE_RE.test(upulse)) fail("PROFILE_SHOWCASE_DESCENDANT_KAI_INVALID");
    const parentKai = BigInt(upulse);
    if (parentKai > resultingHeadKaiUpulse) resultingHeadKaiUpulse = parentKai;
  }
  for (const operation of directOperations) {
    if (operation.parentArtifactDigest !== input.predecessorArtifactDigest
      || operation.priorCommittedCount !== input.predecessorResultingOperationCount
      || operation.authorityEvidenceRoot !== input.actorEvidenceRoot) {
      fail("PROFILE_SHOWCASE_DESCENDANT_OPERATION_INVALID");
    }
    const operationKai = BigInt((operation.kai as Record<string, unknown>).upulse as string);
    if (operationKai < resultingHeadKaiUpulse) {
      fail("PROFILE_SHOWCASE_DESCENDANT_KAI_REGRESSION");
    }
    if (operationKai > resultingHeadKaiUpulse) resultingHeadKaiUpulse = operationKai;
  }
  if (value.headKaiUpulse !== resultingHeadKaiUpulse.toString()) {
    fail("PROFILE_SHOWCASE_DESCENDANT_HEAD_KAI_INVALID");
  }
}
