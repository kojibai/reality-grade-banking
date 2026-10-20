import {
  canonicalizeReceizProfileShowcaseTransitionOperationsV114,
  compareReceizProfileShowcaseTransitionOperationsV114,
} from "../../../../packages/receiz-sdk/src/index";
import {
  isProfileShowcaseOperationKind,
  type ProfileShowcaseChildKey,
  type ProfileShowcaseChildReference,
  type ProfileShowcaseFoldMechanicsInput,
  type ProfileShowcaseFoldState,
  type ProfileShowcaseOperationV1,
  type ProfileShowcasePlacement,
} from "./types";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_PULSE_RE = /^(0|[1-9][0-9]*)$/;
export const PROFILE_SHOWCASE_MAX_MERGED_CHILDREN = 1_024;
export const PROFILE_SHOWCASE_MAX_MERGED_PARENTS = 64;
export const PROFILE_SHOWCASE_FOLD_MECHANICS_AUTHORITY = Object.freeze({
  foldIsProofAuthority: false,
  membershipIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  authorizationStatus: "requires-artifact-append-plan-and-verified-capability",
} as const);

export function createEmptyProfileShowcaseFoldState(): ProfileShowcaseFoldState {
  return {
    placements: [],
    membershipHistory: [],
    sealedOperations: [],
    authority: PROFILE_SHOWCASE_FOLD_MECHANICS_AUTHORITY,
  };
}

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
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  if (
    Object.keys(value).length !== keys.length
    || !Object.keys(value).every((key) => keys.includes(key))
    || !keys.every((key) => key in value)
  ) {
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

function assertKai(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_KAI_INVALID");
  exactKeys(value, ["upulse"], "PROFILE_SHOWCASE_KAI_UNKNOWN_FIELD");
  if (typeof value.upulse !== "string" || !KAI_PULSE_RE.test(value.upulse)) {
    fail("PROFILE_SHOWCASE_KAI_UPULSE_INVALID");
  }
}

function assertChildKey(value: unknown): asserts value is ProfileShowcaseChildKey {
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

function assertChildReference(value: unknown): asserts value is ProfileShowcaseChildReference {
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

function operationKeys(...specific: readonly string[]): readonly string[] {
  return [...COMMON_OPERATION_KEYS, ...specific];
}

export function assertProfileShowcaseOperation(
  value: unknown,
): asserts value is ProfileShowcaseOperationV1 {
  if (!record(value)) fail("PROFILE_SHOWCASE_OPERATION_INVALID");
  if (value.schema !== "receiz.profile-showcase.operation.v1") {
    fail("PROFILE_SHOWCASE_OPERATION_SCHEMA_INVALID");
  }
  if (typeof value.kind !== "string" || !isProfileShowcaseOperationKind(value.kind)) {
    fail("PROFILE_SHOWCASE_OPERATION_KIND_INVALID");
  }

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
    }
  })();
  exactKeys(value, operationKeys(...specificKeys), "PROFILE_SHOWCASE_OPERATION_UNKNOWN_FIELD");

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
      if (
        !Array.isArray(value.mergedParentArtifactDigests)
        || value.mergedParentArtifactDigests.length === 0
        || value.mergedParentArtifactDigests.length > PROFILE_SHOWCASE_MAX_MERGED_PARENTS
      ) {
        fail("PROFILE_SHOWCASE_MERGE_PARENTS_INVALID");
      }
      for (const parent of value.mergedParentArtifactDigests) {
        assertDigest(parent, "PROFILE_SHOWCASE_MERGE_PARENT_INVALID");
      }
      if (
        !Array.isArray(value.mergedChildren)
        || value.mergedChildren.length > PROFILE_SHOWCASE_MAX_MERGED_CHILDREN
      ) {
        fail("PROFILE_SHOWCASE_MERGE_CHILDREN_INVALID");
      }
      for (const child of value.mergedChildren) assertChildReference(child);
      assertDigest(value.reconciliationEvidenceRoot, "PROFILE_SHOWCASE_RECONCILIATION_INVALID");
      break;
  }
}

export function compareProfileShowcaseOperations(
  left: ProfileShowcaseOperationV1,
  right: ProfileShowcaseOperationV1,
): number {
  return compareReceizProfileShowcaseTransitionOperationsV114(left, right);
}

export function canonicalProfileShowcaseOperations(
  operations: readonly ProfileShowcaseOperationV1[],
): readonly ProfileShowcaseOperationV1[] {
  return canonicalizeReceizProfileShowcaseTransitionOperationsV114(operations) as readonly ProfileShowcaseOperationV1[];
}

function placementKey(child: ProfileShowcaseChildKey): string {
  return `${child.stableChildArtifactId.normalize("NFC")}\u0000${child.immutableVersion.normalize("NFC")}`;
}

function sameChild(left: ProfileShowcaseChildReference, right: ProfileShowcaseChildReference): boolean {
  return left.stableChildArtifactId === right.stableChildArtifactId
    && left.immutableVersion === right.immutableVersion
    && left.childArtifactDigest === right.childArtifactDigest
    && left.admissionEvidenceRoot === right.admissionEvidenceRoot
    && left.contentDigest === right.contentDigest;
}

function newPlacement(
  child: ProfileShowcaseChildReference,
  membershipOperationDigest: string,
): ProfileShowcasePlacement {
  return {
    placementKey: placementKey(child),
    child,
    membershipOperationDigest,
    visibility: "visible",
    pinned: false,
    sectionId: null,
    provenanceEvidenceRoots: [],
    presentationOperationDigests: [],
  };
}

function childPlacementIndex(
  placements: readonly ProfileShowcasePlacement[],
  child: ProfileShowcaseChildKey,
): number {
  const index = placements.findIndex((placement) => placement.placementKey === placementKey(child));
  if (index < 0) fail("PROFILE_SHOWCASE_CHILD_NOT_ADMITTED");
  if (placements[index]!.child.childArtifactDigest !== child.childArtifactDigest) {
    fail("PROFILE_SHOWCASE_CHILD_IMMUTABLE_CONFLICT");
  }
  return index;
}

function addMembership(
  state: ProfileShowcaseFoldState,
  child: ProfileShowcaseChildReference,
  operation: ProfileShowcaseOperationV1 & { kind: "showcase.append" | "showcase.merge" },
): Readonly<{ state: ProfileShowcaseFoldState; added: boolean }> {
  const key = placementKey(child);
  const existing = state.placements.find((placement) => placement.placementKey === key);
  if (existing) {
    if (!sameChild(existing.child, child)) fail("PROFILE_SHOWCASE_CHILD_IMMUTABLE_CONFLICT");
    return { state, added: false };
  }
  return {
    added: true,
    state: {
      ...state,
      placements: [...state.placements, newPlacement(child, operation.operationDigest)],
      membershipHistory: [
        ...state.membershipHistory,
        { kind: operation.kind, operationDigest: operation.operationDigest, child },
      ],
    },
  };
}

function appendSealedOperation(
  state: ProfileShowcaseFoldState,
  operation: ProfileShowcaseOperationV1,
): ProfileShowcaseFoldState {
  return { ...state, sealedOperations: [...state.sealedOperations, operation] };
}

function updatePlacement(
  state: ProfileShowcaseFoldState,
  index: number,
  operation: ProfileShowcaseOperationV1,
  update: (placement: ProfileShowcasePlacement) => ProfileShowcasePlacement,
): ProfileShowcaseFoldState {
  const placements = [...state.placements];
  const current = placements[index]!;
  const next = update(current);
  if (next === current) return state;
  placements[index] = {
    ...next,
    presentationOperationDigests: [
      ...next.presentationOperationDigests,
      operation.operationDigest,
    ],
  };
  return appendSealedOperation({ ...state, placements }, operation);
}

function foldOne(
  state: ProfileShowcaseFoldState,
  operation: ProfileShowcaseOperationV1,
): ProfileShowcaseFoldState {
  if (state.sealedOperations.some((sealed) => sealed.operationDigest === operation.operationDigest)) {
    return state;
  }
  switch (operation.kind) {
    case "showcase.append": {
      const result = addMembership(state, operation.child, operation);
      return result.added ? appendSealedOperation(result.state, operation) : state;
    }
    case "showcase.visibility.set": {
      const index = childPlacementIndex(state.placements, operation.child);
      return updatePlacement(state, index, operation, (placement) => (
        placement.visibility === operation.visibility
          ? placement
          : { ...placement, visibility: operation.visibility }
      ));
    }
    case "showcase.presentation.pin":
    case "showcase.presentation.unpin": {
      const index = childPlacementIndex(state.placements, operation.child);
      const pinned = operation.kind === "showcase.presentation.pin";
      return updatePlacement(state, index, operation, (placement) => (
        placement.pinned === pinned ? placement : { ...placement, pinned }
      ));
    }
    case "showcase.section.assign": {
      const index = childPlacementIndex(state.placements, operation.child);
      return updatePlacement(state, index, operation, (placement) => (
        placement.sectionId === operation.sectionId
          ? placement
          : { ...placement, sectionId: operation.sectionId }
      ));
    }
    case "showcase.provenance.bind": {
      const index = childPlacementIndex(state.placements, operation.child);
      return updatePlacement(state, index, operation, (placement) => (
        placement.provenanceEvidenceRoots.includes(operation.provenanceEvidenceRoot)
          ? placement
          : {
              ...placement,
              provenanceEvidenceRoots: [
                ...placement.provenanceEvidenceRoots,
                operation.provenanceEvidenceRoot,
              ],
            }
      ));
    }
    case "showcase.order.supersede": {
      const childIndex = childPlacementIndex(state.placements, operation.child);
      const targetKey = operation.afterChild ? placementKey(operation.afterChild) : null;
      if (targetKey === state.placements[childIndex]!.placementKey) {
        fail("PROFILE_SHOWCASE_ORDER_SELF_REFERENCE");
      }
      if (operation.afterChild) childPlacementIndex(state.placements, operation.afterChild);
      const placements = [...state.placements];
      const [moved] = placements.splice(childIndex, 1);
      const insertionIndex = targetKey === null
        ? 0
        : placements.findIndex((placement) => placement.placementKey === targetKey) + 1;
      placements.splice(insertionIndex, 0, moved!);
      if (placements.every((placement, index) => placement === state.placements[index])) return state;
      const movedIndex = placements.findIndex((placement) => placement.placementKey === moved!.placementKey);
      placements[movedIndex] = {
        ...placements[movedIndex]!,
        presentationOperationDigests: [
          ...placements[movedIndex]!.presentationOperationDigests,
          operation.operationDigest,
        ],
      };
      return appendSealedOperation({ ...state, placements }, operation);
    }
    case "showcase.merge": {
      let merged = state;
      for (const child of operation.mergedChildren) {
        merged = addMembership(merged, child, operation).state;
      }
      return appendSealedOperation(merged, operation);
    }
  }
}

function foldProfileShowcaseOperationMechanics(
  prior: ProfileShowcaseFoldState,
  operations: readonly ProfileShowcaseOperationV1[],
): ProfileShowcaseFoldState {
  const canonical = canonicalProfileShowcaseOperations(operations);
  canonicalProfileShowcaseOperations([...prior.sealedOperations, ...canonical]);
  return canonical.reduce(foldOne, prior);
}

export function foldProfileShowcaseOperations(
  input: ProfileShowcaseFoldMechanicsInput,
): ProfileShowcaseFoldState {
  // This boundary deliberately refuses proof wrappers. SDK append-plan and
  // verified-capability custody belongs to the artifact transition in Task 4.
  if (!record(input)) fail("PROFILE_SHOWCASE_FOLD_MECHANICS_INPUT_INVALID");
  if ("admittedChildren" in input) fail("PROFILE_SHOWCASE_CHILD_WRAPPER_FACTS_FORBIDDEN");
  if ("operationAuthorization" in input) fail("PROFILE_SHOWCASE_OPERATION_AUTHORIZATION_PLAN_REQUIRED");
  exactKeys(input, ["prior", "operations"], "PROFILE_SHOWCASE_FOLD_MECHANICS_INPUT_INVALID");
  if (
    !record(input.prior)
    || !Array.isArray(input.prior.placements)
    || !Array.isArray(input.prior.membershipHistory)
    || !Array.isArray(input.prior.sealedOperations)
    || !record(input.prior.authority)
    || input.prior.authority.foldIsProofAuthority !== false
    || input.prior.authority.membershipIsProofAuthority !== false
    || input.prior.authority.strongerTruth !== "sealed-receiz-proof-object"
    || input.prior.authority.authorizationStatus
      !== "requires-artifact-append-plan-and-verified-capability"
    || !Array.isArray(input.operations)
  ) {
    fail("PROFILE_SHOWCASE_FOLD_MECHANICS_INPUT_INVALID");
  }
  return foldProfileShowcaseOperationMechanics(input.prior, input.operations);
}
