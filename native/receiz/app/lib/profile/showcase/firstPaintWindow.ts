import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/index";
import type {
  ProfileShowcaseChildKey,
  ProfileShowcaseFirstPaintWindow,
  ProfileShowcaseFirstPaintWindowAuthority,
  ProfileShowcaseFoldState,
  ProfileShowcasePayloadV1,
} from "./types";
import { PROFILE_SHOWCASE_SEGMENT_CAPACITY } from "./segments";

export const PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CAPACITY =
  PROFILE_SHOWCASE_SEGMENT_CAPACITY;

export const PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_AUTHORITY:
ProfileShowcaseFirstPaintWindowAuthority = Object.freeze({
  windowIsProofAuthority: false,
  projectionIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  bindingStatus: "sealed-in-showcase-head",
});

type FirstPaintWindowBasis = Omit<ProfileShowcaseFirstPaintWindow, "commitmentDigest">;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function keyForPlacement(
  placement: ProfileShowcaseFoldState["placements"][number],
): ProfileShowcaseChildKey {
  return {
    stableChildArtifactId: placement.child.stableChildArtifactId,
    immutableVersion: placement.child.immutableVersion,
    childArtifactDigest: placement.child.childArtifactDigest,
  };
}

async function commitmentDigest(basis: FirstPaintWindowBasis): Promise<string> {
  return digestReceizAuthority(
    "state",
    "receiz.profile-showcase.first-paint-window.v1",
    basis,
  );
}

export async function deriveProfileShowcaseFirstPaintWindow(
  input: Readonly<{
    foldState: ProfileShowcaseFoldState;
    payload: Pick<ProfileShowcasePayloadV1, "segments" | "fibonacci" | "merkle">;
  }>,
): Promise<ProfileShowcaseFirstPaintWindow> {
  const { foldState, payload } = input;
  const visible = foldState.placements.filter((placement) => placement.visibility === "visible");
  const children = visible
    .slice(0, PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CAPACITY)
    .map(keyForPlacement);
  const endVisibleIndex = children.length;
  let continuation: ProfileShowcaseFirstPaintWindow["continuation"] = null;
  if (visible.length > endVisibleIndex) {
    const anchorPlacement = visible[endVisibleIndex - 1]!;
    const anchorOperation = foldState.sealedOperations.find(
      (operation) => operation.operationDigest === anchorPlacement.membershipOperationDigest,
    );
    if (!anchorOperation) {
      throw new TypeError("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_ANCHOR_MISSING");
    }
    const anchorPosition =
      anchorOperation.priorCommittedCount + anchorOperation.directDeltaPosition;
    const segment = payload.segments.find(
      (candidate) => anchorPosition >= candidate.startOperationCount
        && anchorPosition < candidate.endOperationCount,
    );
    if (!segment) {
      throw new TypeError("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_SEGMENT_MISSING");
    }
    const checkpoint = [...payload.fibonacci.checkpoints]
      .filter((candidate) => candidate.operationCount <= segment.startOperationCount)
      .sort((left, right) => right.operationCount - left.operationCount)[0] ?? null;
    continuation = {
      nextVisibleIndex: endVisibleIndex,
      afterChild: children.at(-1)!,
      segmentId: segment.segmentId,
      segmentStartOperationCount: segment.startOperationCount,
      checkpoint: checkpoint
        ? {
            operationCount: checkpoint.operationCount,
            artifactDigest: checkpoint.artifactDigest,
          }
        : null,
      merkleRoot: payload.merkle.root,
    };
  }
  const basis: FirstPaintWindowBasis = {
    schema: "receiz.profile-showcase.first-paint-window.v1",
    startVisibleIndex: 0,
    endVisibleIndex,
    totalVisibleCount: visible.length,
    children,
    continuation,
    authority: PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_AUTHORITY,
  };
  return {
    ...basis,
    commitmentDigest: await commitmentDigest(basis),
  };
}

export async function verifyProfileShowcaseFirstPaintWindow(
  window: ProfileShowcaseFirstPaintWindow,
  input?: Readonly<{
    foldState: ProfileShowcaseFoldState;
    payload: Pick<ProfileShowcasePayloadV1, "segments" | "fibonacci" | "merkle">;
  }>,
): Promise<boolean> {
  try {
    if (
      window.schema !== "receiz.profile-showcase.first-paint-window.v1"
      || window.startVisibleIndex !== 0
      || !Number.isSafeInteger(window.endVisibleIndex)
      || window.endVisibleIndex < 0
      || !Number.isSafeInteger(window.totalVisibleCount)
      || window.totalVisibleCount < window.endVisibleIndex
      || !Array.isArray(window.children)
      || window.children.length !== window.endVisibleIndex
      || window.children.length > PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_CAPACITY
      || !/^[0-9a-f]{64}$/.test(window.commitmentDigest)
      || window.authority.windowIsProofAuthority !== false
      || window.authority.projectionIsProofAuthority !== false
      || window.authority.strongerTruth !== "sealed-receiz-proof-object"
      || window.authority.bindingStatus !== "sealed-in-showcase-head"
    ) return false;
    const expectedContinuation = window.totalVisibleCount > window.endVisibleIndex;
    if (expectedContinuation !== (window.continuation !== null)) return false;
    if (window.continuation && (
      window.continuation.nextVisibleIndex !== window.endVisibleIndex
      || window.children.length === 0
      || JSON.stringify(window.continuation.afterChild)
        !== JSON.stringify(window.children.at(-1))
    )) return false;
    const basis: FirstPaintWindowBasis = {
      schema: window.schema,
      startVisibleIndex: window.startVisibleIndex,
      endVisibleIndex: window.endVisibleIndex,
      totalVisibleCount: window.totalVisibleCount,
      children: window.children,
      continuation: window.continuation,
      authority: window.authority,
    };
    if (await commitmentDigest(basis) !== window.commitmentDigest) return false;
    if (input) {
      const expected = await deriveProfileShowcaseFirstPaintWindow(input);
      if (canonicalJson(expected) !== canonicalJson(window)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
