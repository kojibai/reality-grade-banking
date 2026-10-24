import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { canonicalizeReceizConstitution, type ReceizConstitutionJson } from "./constitution.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const encoder = new TextEncoder();

export type ReceizCompositeMerkleState = Readonly<{
  algorithm: "sha256/binary-carry/v1";
  leafCount: number;
  root: string;
  frontier: readonly (string | null)[];
}>;

export type ReceizCompositeFibonacciCheckpoint = Readonly<{
  distance: number;
  operationCount: number;
  artifactDigest: string;
}>;

export type ReceizCompositeFibonacciState = Readonly<{
  basis: "sparse-checkpoint/v1";
  operationCount: number;
  checkpoints: readonly ReceizCompositeFibonacciCheckpoint[];
}>;

export type ReceizCompositeMerkleSibling = Readonly<{
  side: "left" | "right";
  digest: string;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

export function digestReceizCompositeCanonical(value: unknown): string {
  return bytesToHex(sha256(serializeReceizCompositeCanonical(value)));
}

export function serializeReceizCompositeCanonical(value: unknown): Uint8Array {
  return encoder.encode(canonicalizeReceizConstitution(value as ReceizConstitutionJson));
}

export function buildReceizCompositeMerkleParent(left: string, right: string): string {
  if (!DIGEST_RE.test(left) || !DIGEST_RE.test(right)) {
    fail("RECEIZ_COMPOSITE_MERKLE_LEAF_INVALID");
  }
  return digestReceizCompositeCanonical({
    kind: "receiz.vault.merkle.parent.v1",
    left,
    right,
  });
}

function emptyRoot(): string {
  return digestReceizCompositeCanonical({ kind: "receiz.vault.merkle.empty.v1" });
}

export function receizCompositeMerkleRootFromFrontier(
  frontier: readonly (string | null)[],
): string {
  let accumulator: string | null = null;
  let accumulatorLevel = 0;
  for (let level = 0; level < frontier.length; level += 1) {
    const peak = frontier[level];
    if (peak === null || peak === undefined) continue;
    if (!DIGEST_RE.test(peak)) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
    if (accumulator === null) {
      accumulator = peak;
      accumulatorLevel = level;
      continue;
    }
    while (accumulatorLevel < level) {
      accumulator = buildReceizCompositeMerkleParent(accumulator, accumulator);
      accumulatorLevel += 1;
    }
    accumulator = buildReceizCompositeMerkleParent(peak, accumulator);
    accumulatorLevel = level + 1;
  }
  return accumulator ?? emptyRoot();
}

export function assertReceizCompositeMerkleState(
  value: ReceizCompositeMerkleState,
): void {
  if (
    value.algorithm !== "sha256/binary-carry/v1"
    || !Number.isSafeInteger(value.leafCount)
    || value.leafCount < 0
    || !DIGEST_RE.test(value.root)
    || !Array.isArray(value.frontier)
    || value.frontier.length > 64
  ) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  const width = value.leafCount === 0 ? 0 : Math.floor(Math.log2(value.leafCount)) + 1;
  if (value.frontier.length !== width) fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  for (let level = 0; level < value.frontier.length; level += 1) {
    const occupied = (Math.floor(value.leafCount / (2 ** level)) % 2) === 1;
    const peak = value.frontier[level];
    if (occupied ? typeof peak !== "string" || !DIGEST_RE.test(peak) : peak !== null) {
      fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
    }
  }
  if (receizCompositeMerkleRootFromFrontier(value.frontier) !== value.root) {
    fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  }
}

export function createEmptyReceizCompositeMerkleState(): ReceizCompositeMerkleState {
  return {
    algorithm: "sha256/binary-carry/v1",
    leafCount: 0,
    root: emptyRoot(),
    frontier: [],
  };
}

export function appendReceizCompositeMerkleLeaf(
  prior: ReceizCompositeMerkleState,
  leafDigest: string,
): ReceizCompositeMerkleState {
  assertReceizCompositeMerkleState(prior);
  if (!DIGEST_RE.test(leafDigest)) fail("RECEIZ_COMPOSITE_MERKLE_LEAF_INVALID");
  const frontier = prior.frontier.slice();
  let carry = leafDigest;
  let level = 0;
  while (frontier[level] !== undefined && frontier[level] !== null) {
    carry = buildReceizCompositeMerkleParent(frontier[level]!, carry);
    frontier[level] = null;
    level += 1;
  }
  frontier[level] = carry;
  return {
    algorithm: "sha256/binary-carry/v1",
    leafCount: prior.leafCount + 1,
    root: receizCompositeMerkleRootFromFrontier(frontier),
    frontier,
  };
}

export function createReceizCompositeSyntheticMerkleState(input: Readonly<{
  leafCount: number;
  resolvePerfectSubtreeRoot: (level: number) => string;
}>): ReceizCompositeMerkleState {
  if (!Number.isSafeInteger(input.leafCount) || input.leafCount < 0) {
    fail("RECEIZ_COMPOSITE_MERKLE_INVALID");
  }
  const width = input.leafCount === 0 ? 0 : Math.floor(Math.log2(input.leafCount)) + 1;
  const frontier = Array.from({ length: width }, (_, level) => {
    if ((Math.floor(input.leafCount / (2 ** level)) % 2) === 0) return null;
    const root = input.resolvePerfectSubtreeRoot(level);
    if (!DIGEST_RE.test(root)) fail("RECEIZ_COMPOSITE_MERKLE_LEAF_INVALID");
    return root;
  });
  const state: ReceizCompositeMerkleState = {
    algorithm: "sha256/binary-carry/v1",
    leafCount: input.leafCount,
    root: receizCompositeMerkleRootFromFrontier(frontier),
    frontier,
  };
  assertReceizCompositeMerkleState(state);
  return state;
}

export function receizCompositeFibonacciDistancesUpTo(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("RECEIZ_COMPOSITE_FIBONACCI_INVALID");
  }
  const result: number[] = [];
  let current = 1;
  let next = 2;
  while (current <= value) {
    result.push(current);
    [current, next] = [next, current + next];
  }
  return result;
}

export function createReceizCompositeFibonacciState(input: Readonly<{
  operationCount: number;
  resolveArtifactDigest: (operationCount: number) => string;
}>): ReceizCompositeFibonacciState {
  if (!Number.isSafeInteger(input.operationCount) || input.operationCount < 0) {
    fail("RECEIZ_COMPOSITE_FIBONACCI_INVALID");
  }
  const checkpoints = receizCompositeFibonacciDistancesUpTo(input.operationCount).map((distance) => {
    const operationCount = input.operationCount - distance;
    const artifactDigest = input.resolveArtifactDigest(operationCount);
    if (!DIGEST_RE.test(artifactDigest)) fail("RECEIZ_COMPOSITE_FIBONACCI_REFERENCE_INVALID");
    return { distance, operationCount, artifactDigest };
  });
  return {
    basis: "sparse-checkpoint/v1",
    operationCount: input.operationCount,
    checkpoints,
  };
}

export function updateReceizCompositeFibonacciState(input: Readonly<{
  prior: ReceizCompositeFibonacciState;
  nextOperationCount: number;
  resolveArtifactDigest: (operationCount: number) => string | null;
}>): ReceizCompositeFibonacciState {
  if (
    input.prior.basis !== "sparse-checkpoint/v1"
    || !Number.isSafeInteger(input.prior.operationCount)
    || input.prior.operationCount < 0
    || input.nextOperationCount !== input.prior.operationCount + 1
  ) fail("RECEIZ_COMPOSITE_FIBONACCI_INVALID");
  const expectedPriorDistances = receizCompositeFibonacciDistancesUpTo(
    input.prior.operationCount,
  );
  if (
    input.prior.checkpoints.length !== expectedPriorDistances.length
    || input.prior.checkpoints.some((checkpoint, index) =>
      checkpoint.distance !== expectedPriorDistances[index]
      || checkpoint.operationCount !== input.prior.operationCount - checkpoint.distance
      || !DIGEST_RE.test(checkpoint.artifactDigest))
  ) fail("RECEIZ_COMPOSITE_FIBONACCI_INVALID");
  const priorByOperationCount = new Map(
    input.prior.checkpoints.map((checkpoint) => [
      checkpoint.operationCount,
      checkpoint.artifactDigest,
    ]),
  );
  const checkpoints = receizCompositeFibonacciDistancesUpTo(
    input.nextOperationCount,
  ).map((distance) => {
    const operationCount = input.nextOperationCount - distance;
    const artifactDigest = input.resolveArtifactDigest(operationCount);
    if (artifactDigest === null || !DIGEST_RE.test(artifactDigest)) {
      fail("RECEIZ_COMPOSITE_FIBONACCI_REFERENCE_INVALID");
    }
    const retained = priorByOperationCount.get(operationCount);
    if (retained !== undefined && retained !== artifactDigest) {
      fail("RECEIZ_COMPOSITE_FIBONACCI_REFERENCE_INVALID");
    }
    return { distance, operationCount, artifactDigest };
  });
  return {
    basis: "sparse-checkpoint/v1",
    operationCount: input.nextOperationCount,
    checkpoints,
  };
}

export function buildReceizCompositeBoundedTree(
  leafDigests: readonly string[],
): Readonly<{
  root: string;
  witnesses: readonly (readonly ReceizCompositeMerkleSibling[])[];
}> {
  if (leafDigests.length === 0 || leafDigests.some((leaf) => !DIGEST_RE.test(leaf))) {
    fail("RECEIZ_COMPOSITE_SEGMENT_LEAVES_INVALID");
  }
  const layers: string[][] = [[...leafDigests]];
  let current = [...leafDigests];
  while (current.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index]!;
      next.push(buildReceizCompositeMerkleParent(left, current[index + 1] ?? left));
    }
    layers.push(next);
    current = next;
  }
  const witnesses = leafDigests.map((_, leafIndex) => {
    const siblings: ReceizCompositeMerkleSibling[] = [];
    let index = leafIndex;
    for (let level = 0; level < layers.length - 1; level += 1) {
      const layer = layers[level]!;
      const right = index % 2 === 0;
      siblings.push({
        side: right ? "right" : "left",
        digest: layer[right ? index + 1 : index - 1] ?? layer[index]!,
      });
      index = Math.floor(index / 2);
    }
    return siblings;
  });
  return { root: current[0]!, witnesses };
}

export function recoverReceizCompositeMerkleRoot(
  leafDigest: string,
  siblings: readonly ReceizCompositeMerkleSibling[],
): string {
  if (!DIGEST_RE.test(leafDigest)) fail("RECEIZ_COMPOSITE_MERKLE_LEAF_INVALID");
  return siblings.reduce(
    (root, sibling) => sibling.side === "left"
      ? buildReceizCompositeMerkleParent(sibling.digest, root)
      : buildReceizCompositeMerkleParent(root, sibling.digest),
    leafDigest,
  );
}

export function assertReceizCompositeHeadBasis(input: Readonly<{
  stableArtifactId: string;
  headKaiUpulse: string;
  priorOperationCount: number;
  resultingOperationCount: number;
  directDeltaLength: number;
  parentCount: number;
  segmentCount: number;
  currentStateRoot: string;
  merkle: ReceizCompositeMerkleState;
  fibonacci: ReceizCompositeFibonacciState;
}>): void {
  if (
    input.stableArtifactId.length === 0
    || !KAI_RE.test(input.headKaiUpulse)
    || !Number.isSafeInteger(input.priorOperationCount)
    || !Number.isSafeInteger(input.resultingOperationCount)
    || input.priorOperationCount < 0
    || input.resultingOperationCount < input.priorOperationCount
    || input.resultingOperationCount - input.priorOperationCount !== input.directDeltaLength
    || input.parentCount > 64
    || input.segmentCount > 2
    || !DIGEST_RE.test(input.currentStateRoot)
  ) fail("RECEIZ_COMPOSITE_HEAD_INVALID");
  assertReceizCompositeMerkleState(input.merkle);
  if (
    input.merkle.leafCount !== input.resultingOperationCount
    || input.fibonacci.operationCount !== input.resultingOperationCount
  ) fail("RECEIZ_COMPOSITE_HEAD_INVALID");
}
