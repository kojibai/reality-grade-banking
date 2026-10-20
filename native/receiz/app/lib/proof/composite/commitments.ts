import {
  assertReceizCompositeHeadBasis,
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  createReceizCompositeSyntheticMerkleState,
  digestReceizCompositeCanonical,
  receizCompositeFibonacciDistancesUpTo,
  serializeReceizCompositeCanonical,
  updateReceizCompositeFibonacciState,
} from "../../../../packages/receiz-sdk/src/compositeProofKernel";
import type {
  ReceizCompositeArtifactId,
  ReceizCompositeCheckpointResolver,
  ReceizCompositeCommitmentState,
  ReceizCompositeDirectChild,
  ReceizCompositeHead,
} from "./types";

export {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  createReceizCompositeSyntheticMerkleState,
  digestReceizCompositeCanonical,
  receizCompositeFibonacciDistancesUpTo,
  updateReceizCompositeFibonacciState,
};

export function createReceizCompositeHead<Operation, Window>(
  input: ReceizCompositeHead<Operation, Window>,
): ReceizCompositeHead<Operation, Window> {
  assertReceizCompositeHeadBasis({
    stableArtifactId: input.stableArtifactId,
    headKaiUpulse: input.headKaiUpulse,
    priorOperationCount: input.priorOperationCount,
    resultingOperationCount: input.resultingOperationCount,
    directDeltaLength: input.directDelta.length,
    parentCount: input.parentHeads.length,
    segmentCount: input.segmentWindow.length,
    currentStateRoot: input.currentStateRoot,
    merkle: input.merkle,
    fibonacci: input.fibonacci,
  });
  return Object.freeze(structuredClone(input));
}

export function serializeReceizCompositeHead(
  head: ReceizCompositeHead<unknown, unknown>,
): Uint8Array {
  return serializeReceizCompositeCanonical(head);
}

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;

function assertCompositeArtifactId(
  value: string,
): asserts value is ReceizCompositeArtifactId {
  if (
    value !== "economy-showcase:receiz.com"
    && !/^profile-showcase:[^\u0000-\u001f\u007f]+$/u.test(value)
  ) {
    throw new TypeError("RECEIZ_COMPOSITE_ARTIFACT_ID_INVALID");
  }
}

function orderedDirectChildren(
  values: readonly ReceizCompositeDirectChild[],
): readonly ReceizCompositeDirectChild[] {
  if (!Array.isArray(values)) {
    throw new TypeError("RECEIZ_COMPOSITE_DIRECT_CHILD_INVALID");
  }
  const children = values.map((value) => {
    if (
      !DIGEST_RE.test(value.childArtifactDigest)
      || !DIGEST_RE.test(value.operationDigest)
    ) {
      throw new TypeError("RECEIZ_COMPOSITE_DIRECT_CHILD_INVALID");
    }
    if (!KAI_RE.test(value.kaiCoordinate.upulse)) {
      throw new TypeError("RECEIZ_COMPOSITE_KAI_INVALID");
    }
    return structuredClone(value);
  });
  return children.sort((left, right) => {
    const leftKai = BigInt(left.kaiCoordinate.upulse);
    const rightKai = BigInt(right.kaiCoordinate.upulse);
    if (leftKai !== rightKai) return leftKai < rightKai ? -1 : 1;
    return left.operationDigest.localeCompare(right.operationDigest)
      || left.childArtifactDigest.localeCompare(right.childArtifactDigest);
  });
}

/**
 * Applies one bounded recursive-composite delta. The Merkle/Fibonacci result
 * is deterministic mechanics only; native sealed artifact admission remains
 * the proof authority at both the profile and economy tiers.
 */
export async function appendReceizCompositeCommitment(input: Readonly<{
  stableArtifactId: ReceizCompositeArtifactId | string;
  prior: ReceizCompositeCommitmentState;
  directChildren: readonly ReceizCompositeDirectChild[];
  resolveCheckpoint: ReceizCompositeCheckpointResolver;
}>): Promise<ReceizCompositeCommitmentState> {
  assertCompositeArtifactId(input.stableArtifactId);
  if (typeof input.resolveCheckpoint !== "function") {
    throw new TypeError("RECEIZ_COMPOSITE_CHECKPOINT_RESOLVER_REQUIRED");
  }
  let merkle = structuredClone(input.prior.merkle);
  let fibonacci = structuredClone(input.prior.fibonacci);
  for (const child of orderedDirectChildren(input.directChildren)) {
    const leafDigest = digestReceizCompositeCanonical({
      kind: "receiz.recursive-composite.child-leaf.v1",
      stableArtifactId: input.stableArtifactId,
      childArtifactDigest: child.childArtifactDigest,
      operationDigest: child.operationDigest,
      kaiUpulse: child.kaiCoordinate.upulse,
    });
    merkle = appendReceizCompositeMerkleLeaf(merkle, leafDigest);
    fibonacci = updateReceizCompositeFibonacciState({
      prior: fibonacci,
      nextOperationCount: fibonacci.operationCount + 1,
      resolveArtifactDigest: input.resolveCheckpoint,
    });
  }
  return Object.freeze({ merkle, fibonacci });
}
