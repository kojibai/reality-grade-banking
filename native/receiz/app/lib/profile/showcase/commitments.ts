import {
  appendReceizCompositeMerkleLeaf,
  createEmptyReceizCompositeMerkleState,
  receizCompositeFibonacciDistancesUpTo,
  updateReceizCompositeFibonacciState,
} from "@/app/lib/proof/composite/commitments";
import {
  isProfileShowcaseArtifactId,
  type ProfileShowcaseArtifactId,
  type ProfileShowcaseFibonacciBoundaryResolver,
  type ProfileShowcaseFibonacciMechanicsAuthority,
  type ProfileShowcaseFibonacciReferenceMechanicsAuthority,
  type ProfileShowcaseFibonacciState,
  type ProfileShowcaseMerkleMechanicsAuthority,
  type ProfileShowcaseMerkleState,
} from "./types";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const MAX_FRONTIER_WIDTH = 64;
const MAX_FIBONACCI_CHECKPOINTS = 128;

export const PROFILE_SHOWCASE_MERKLE_MECHANICS_AUTHORITY: ProfileShowcaseMerkleMechanicsAuthority = Object.freeze({
  merkleIsProofAuthority: false,
  rootIsProofAuthority: false,
  frontierIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  admissionStatus: "requires-sealed-showcase-artifact",
});

export const PROFILE_SHOWCASE_FIBONACCI_MECHANICS_AUTHORITY: ProfileShowcaseFibonacciMechanicsAuthority = Object.freeze({
  fibonacciIsProofAuthority: false,
  checkpointIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  resolutionStatus: "requires-already-verified-sealed-head-references",
});

export const PROFILE_SHOWCASE_FIBONACCI_REFERENCE_MECHANICS_AUTHORITY: ProfileShowcaseFibonacciReferenceMechanicsAuthority = Object.freeze({
  referenceIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  custodyStatus: "already-held-verified-sealed-head",
});

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

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_RE.test(value);
}

function assertMerkleAuthority(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_MERKLE_AUTHORITY_INVALID");
  exactKeys(
    value,
    [
      "merkleIsProofAuthority",
      "rootIsProofAuthority",
      "frontierIsProofAuthority",
      "strongerTruth",
      "admissionStatus",
    ],
    "PROFILE_SHOWCASE_MERKLE_AUTHORITY_UNKNOWN_FIELD",
  );
  if (
    value.merkleIsProofAuthority !== false
    || value.rootIsProofAuthority !== false
    || value.frontierIsProofAuthority !== false
    || value.strongerTruth !== "sealed-receiz-proof-object"
    || value.admissionStatus !== "requires-sealed-showcase-artifact"
  ) {
    fail("PROFILE_SHOWCASE_MERKLE_AUTHORITY_INVALID");
  }
}

function assertFibonacciAuthority(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_FIBONACCI_AUTHORITY_INVALID");
  exactKeys(
    value,
    [
      "fibonacciIsProofAuthority",
      "checkpointIsProofAuthority",
      "strongerTruth",
      "resolutionStatus",
    ],
    "PROFILE_SHOWCASE_FIBONACCI_AUTHORITY_UNKNOWN_FIELD",
  );
  if (
    value.fibonacciIsProofAuthority !== false
    || value.checkpointIsProofAuthority !== false
    || value.strongerTruth !== "sealed-receiz-proof-object"
    || value.resolutionStatus !== "requires-already-verified-sealed-head-references"
  ) {
    fail("PROFILE_SHOWCASE_FIBONACCI_AUTHORITY_INVALID");
  }
}

function assertFibonacciReferenceAuthority(value: unknown): void {
  if (!record(value)) fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_AUTHORITY_INVALID");
  exactKeys(
    value,
    ["referenceIsProofAuthority", "strongerTruth", "custodyStatus"],
    "PROFILE_SHOWCASE_FIBONACCI_REFERENCE_AUTHORITY_UNKNOWN_FIELD",
  );
  if (
    value.referenceIsProofAuthority !== false
    || value.strongerTruth !== "sealed-receiz-proof-object"
    || value.custodyStatus !== "already-held-verified-sealed-head"
  ) {
    fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_AUTHORITY_INVALID");
  }
}

function assertMerkleState(prior: ProfileShowcaseMerkleState): void {
  if (
    prior.algorithm !== "sha256/binary-carry/v1"
    || !Number.isSafeInteger(prior.leafCount)
    || prior.leafCount < 0
    || !isDigest(prior.root)
    || !Array.isArray(prior.frontier)
    || prior.frontier.length > MAX_FRONTIER_WIDTH
  ) {
    fail("PROFILE_SHOWCASE_MERKLE_STATE_INVALID");
  }
  assertMerkleAuthority(prior.authority);
  const expectedWidth = prior.leafCount === 0
    ? 0
    : Math.floor(Math.log2(prior.leafCount)) + 1;
  if (prior.frontier.length !== expectedWidth) {
    fail("PROFILE_SHOWCASE_MERKLE_STATE_INVALID");
  }
  for (let level = 0; level < prior.frontier.length; level += 1) {
    const peak = prior.frontier[level];
    const occupied = (Math.floor(prior.leafCount / (2 ** level)) % 2) === 1;
    if (occupied ? !isDigest(peak) : peak !== null) {
      fail("PROFILE_SHOWCASE_MERKLE_STATE_INVALID");
    }
  }
}

function assertFibonacciState(prior: ProfileShowcaseFibonacciState): void {
  if (
    prior.basis !== "sparse-checkpoint/v1"
    || !Number.isSafeInteger(prior.operationCount)
    || prior.operationCount < 0
    || !Array.isArray(prior.checkpoints)
    || prior.checkpoints.length > MAX_FIBONACCI_CHECKPOINTS
  ) {
    fail("PROFILE_SHOWCASE_FIBONACCI_STATE_INVALID");
  }
  assertFibonacciAuthority(prior.authority);
  const expectedDistances = receizCompositeFibonacciDistancesUpTo(prior.operationCount);
  if (expectedDistances.length !== prior.checkpoints.length) {
    fail("PROFILE_SHOWCASE_FIBONACCI_STATE_INVALID");
  }
  for (let index = 0; index < expectedDistances.length; index += 1) {
    const expected = expectedDistances[index]!;
    const checkpoint = prior.checkpoints[index];
    if (
      checkpoint?.distance !== expected
      || checkpoint.operationCount !== prior.operationCount - expected
      || !isDigest(checkpoint.artifactDigest)
    ) {
      fail("PROFILE_SHOWCASE_FIBONACCI_STATE_INVALID");
    }
  }
}

/**
 * Creates the compact Merkle mechanics state. The root is a deterministic
 * commitment only; sealed showcase artifact admission remains authoritative.
 */
export function createEmptyProfileShowcaseMerkleState(): ProfileShowcaseMerkleState {
  const state = createEmptyReceizCompositeMerkleState();
  return {
    ...state,
    authority: PROFILE_SHOWCASE_MERKLE_MECHANICS_AUTHORITY,
  };
}

/**
 * Appends one digest using only the prior binary-carry frontier and the delta.
 * This mechanic cannot admit a child or establish showcase proof authority.
 */
export function appendProfileShowcaseMerkleLeaf(
  prior: ProfileShowcaseMerkleState,
  leafDigest: string,
): ProfileShowcaseMerkleState {
  assertMerkleState(prior);
  if (!isDigest(leafDigest)) fail("PROFILE_SHOWCASE_MERKLE_LEAF_INVALID");
  if (prior.leafCount >= Number.MAX_SAFE_INTEGER) {
    fail("PROFILE_SHOWCASE_MERKLE_STATE_INVALID");
  }
  const state = appendReceizCompositeMerkleLeaf({
    algorithm: prior.algorithm,
    leafCount: prior.leafCount,
    root: prior.root,
    frontier: prior.frontier,
  }, leafDigest);
  return {
    ...state,
    authority: PROFILE_SHOWCASE_MERKLE_MECHANICS_AUTHORITY,
  };
}

/**
 * Retains Fibonacci milestone heads for sparse navigation. Checkpoints and
 * their digests remain mechanics beneath sealed showcase artifact authority.
 */
export function updateProfileShowcaseFibonacciState(
  prior: ProfileShowcaseFibonacciState,
  nextHead: Readonly<{
    artifactId: ProfileShowcaseArtifactId;
    digest: string;
    operationCount: number;
  }>,
  resolveBoundary: ProfileShowcaseFibonacciBoundaryResolver,
): ProfileShowcaseFibonacciState {
  assertFibonacciState(prior);
  if (
    !isProfileShowcaseArtifactId(nextHead.artifactId)
    || !isDigest(nextHead.digest)
    || !Number.isSafeInteger(nextHead.operationCount)
    || nextHead.operationCount !== prior.operationCount + 1
    || typeof resolveBoundary !== "function"
  ) {
    fail("PROFILE_SHOWCASE_FIBONACCI_TRANSITION_INVALID");
  }
  const priorByOperationCount = new Map(
    prior.checkpoints.map((checkpoint) => [
      checkpoint.operationCount,
      checkpoint.artifactDigest,
    ]),
  );

  const next = updateReceizCompositeFibonacciState({
    prior: {
      basis: prior.basis,
      operationCount: prior.operationCount,
      checkpoints: prior.checkpoints,
    },
    nextOperationCount: nextHead.operationCount,
    resolveArtifactDigest: (operationCount) => {
      const reference = resolveBoundary({
        artifactId: nextHead.artifactId,
        operationCount,
      });
      if (reference === null || reference === undefined) {
        fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_MISSING");
      }
      if (!record(reference)) fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_INVALID");
      exactKeys(
        reference,
        ["artifactId", "operationCount", "artifactDigest", "authority"],
        "PROFILE_SHOWCASE_FIBONACCI_REFERENCE_UNKNOWN_FIELD",
      );
      if (reference.artifactId !== nextHead.artifactId) {
        fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_ARTIFACT_ID_INVALID");
      }
      if (reference.operationCount !== operationCount) {
        fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_COUNT_INVALID");
      }
      if (!isDigest(reference.artifactDigest)) {
        fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_DIGEST_INVALID");
      }
      const retained = priorByOperationCount.get(operationCount);
      if (retained !== undefined && retained !== reference.artifactDigest) {
        fail("PROFILE_SHOWCASE_FIBONACCI_REFERENCE_DIGEST_MISMATCH");
      }
      assertFibonacciReferenceAuthority(reference.authority);
      return reference.artifactDigest;
    },
  });
  if (next.checkpoints.length > MAX_FIBONACCI_CHECKPOINTS) {
    fail("PROFILE_SHOWCASE_FIBONACCI_STATE_INVALID");
  }
  return {
    ...next,
    authority: PROFILE_SHOWCASE_FIBONACCI_MECHANICS_AUTHORITY,
  };
}
