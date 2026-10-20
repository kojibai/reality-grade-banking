import {
  digestReceizAuthority,
  encodeReceizAuthority,
  buildReceizCompositeBoundedTree,
  recoverReceizCompositeMerkleRoot,
} from "../../../../packages/receiz-sdk/src/index";
import { canonicalProfileShowcaseOperations } from "./operations";
import type {
  ProfileShowcaseCommittedSegment,
  ProfileShowcaseCommitmentMechanicsAuthority,
  ProfileShowcaseMembershipWitness,
  ProfileShowcaseOperationV1,
  ProfileShowcaseSegmentCommitment,
} from "./types";

const DIGEST_RE = /^[0-9a-f]{64}$/;
export const PROFILE_SHOWCASE_SEGMENT_CAPACITY = 256;

export const PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY: ProfileShowcaseCommitmentMechanicsAuthority = Object.freeze({
  segmentIsProofAuthority: false,
  rootIsProofAuthority: false,
  witnessIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  admissionStatus: "requires-sealed-showcase-artifact",
});

type SegmentBytesPayload = Readonly<{
  schema: "receiz.profile-showcase.segment.v1";
  startOperationCount: number;
  endOperationCount: number;
  operationCount: number;
  root: string;
  operations: readonly ProfileShowcaseOperationV1[];
  authority: ProfileShowcaseCommitmentMechanicsAuthority;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_RE.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key))
    && keys.every((key) => key in value);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((byte, index) => byte === right[index]);
}

function isMechanicsOnlyAuthority(
  authority: ProfileShowcaseCommitmentMechanicsAuthority,
): boolean {
  return record(authority)
    && exactKeys(authority, [
      "segmentIsProofAuthority",
      "rootIsProofAuthority",
      "witnessIsProofAuthority",
      "strongerTruth",
      "admissionStatus",
    ])
    && authority.segmentIsProofAuthority === false
    && authority.rootIsProofAuthority === false
    && authority.witnessIsProofAuthority === false
    && authority.strongerTruth === "sealed-receiz-proof-object"
    && authority.admissionStatus === "requires-sealed-showcase-artifact";
}

function cloneOperation(operation: ProfileShowcaseOperationV1): ProfileShowcaseOperationV1 {
  return structuredClone(operation);
}

function absoluteOperationCount(operation: ProfileShowcaseOperationV1): number {
  const count = operation.priorCommittedCount + operation.directDeltaPosition;
  if (!Number.isSafeInteger(count) || count < 0) {
    fail("PROFILE_SHOWCASE_SEGMENT_RANGE_INVALID");
  }
  return count;
}

function assertSegmentRange(operations: readonly ProfileShowcaseOperationV1[]): {
  startOperationCount: number;
  endOperationCount: number;
} {
  if (operations.length === 0 || operations.length > PROFILE_SHOWCASE_SEGMENT_CAPACITY) {
    fail("PROFILE_SHOWCASE_SEGMENT_OPERATIONS_INVALID");
  }
  const counts = operations.map(absoluteOperationCount).sort((left, right) => left - right);
  const startOperationCount = counts[0]!;
  for (let index = 0; index < counts.length; index += 1) {
    if (counts[index] !== startOperationCount + index) {
      fail("PROFILE_SHOWCASE_SEGMENT_RANGE_INVALID");
    }
  }
  const endOperationCount = startOperationCount + operations.length;
  if (
    Math.floor(startOperationCount / PROFILE_SHOWCASE_SEGMENT_CAPACITY)
    !== Math.floor((endOperationCount - 1) / PROFILE_SHOWCASE_SEGMENT_CAPACITY)
  ) {
    fail("PROFILE_SHOWCASE_SEGMENT_BOUNDARY_INVALID");
  }
  return { startOperationCount, endOperationCount };
}

async function operationLeafDigest(operation: ProfileShowcaseOperationV1): Promise<string> {
  return digestReceizAuthority(
    "operation",
    "receiz.profile-showcase.operation.v1",
    operation,
  );
}

async function digestBytes(bytes: Uint8Array): Promise<string> {
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const bytesDigest = await globalThis.crypto.subtle.digest("SHA-256", digestInput.buffer);
  return [...new Uint8Array(bytesDigest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function segmentIdFor(
  bytesDigest: string,
  commitment: Omit<ProfileShowcaseSegmentCommitment, "segmentId">,
): Promise<string> {
  return digestReceizAuthority(
    "idempotency",
    "receiz.profile-showcase.segment-id.v1",
    { ...commitment, bytesDigest },
  );
}

/**
 * Seals bounded deterministic segment mechanics. The returned commitment and
 * witnesses require adoption by a sealed showcase artifact before admission.
 */
export async function sealProfileShowcaseSegment(
  operations: readonly ProfileShowcaseOperationV1[],
): Promise<ProfileShowcaseCommittedSegment> {
  if (!Array.isArray(operations)) fail("PROFILE_SHOWCASE_SEGMENT_OPERATIONS_INVALID");
  const canonicalOperations = canonicalProfileShowcaseOperations(operations)
    .map(cloneOperation);
  const { startOperationCount, endOperationCount } = assertSegmentRange(canonicalOperations);
  const leafDigests = await Promise.all(canonicalOperations.map(operationLeafDigest));
  const tree = buildReceizCompositeBoundedTree(leafDigests);
  const commitmentWithoutId = {
    startOperationCount,
    endOperationCount,
    operationCount: canonicalOperations.length,
    root: tree.root,
    authority: PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY,
  };
  const bytesPayload: SegmentBytesPayload = {
    schema: "receiz.profile-showcase.segment.v1",
    ...commitmentWithoutId,
    operations: canonicalOperations,
    authority: PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY,
  };
  const bytes = encodeReceizAuthority(
    "state",
    "receiz.profile-showcase.segment.v1",
    bytesPayload,
  );
  const segmentBytesDigest = await digestBytes(bytes);
  const segmentId = await segmentIdFor(segmentBytesDigest, commitmentWithoutId);
  const commitment: ProfileShowcaseSegmentCommitment = {
    segmentId,
    ...commitmentWithoutId,
  };
  const membershipWitnesses = leafDigests.map((
    leafDigest,
    leafIndex,
  ): ProfileShowcaseMembershipWitness => ({
    schema: "receiz.profile-showcase.membership-witness.v1",
    segmentId,
    segmentBytesDigest,
    startOperationCount,
    endOperationCount,
    operationCount: canonicalOperations.length,
    operationPosition: startOperationCount + leafIndex,
    leafIndex,
    leafDigest,
    siblings: tree.witnesses[leafIndex]!,
    authority: PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY,
  }));
  return {
    schema: "receiz.profile-showcase.segment.v1",
    commitment,
    bytes: bytes.slice(),
    operations: canonicalOperations,
    membershipWitnesses,
    authority: PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY,
  };
}

function validWitnessShape(witness: ProfileShowcaseMembershipWitness): boolean {
  return witness.schema === "receiz.profile-showcase.membership-witness.v1"
    && isDigest(witness.segmentId)
    && isDigest(witness.segmentBytesDigest)
    && Number.isSafeInteger(witness.startOperationCount)
    && witness.startOperationCount >= 0
    && Number.isSafeInteger(witness.endOperationCount)
    && witness.endOperationCount === witness.startOperationCount + witness.operationCount
    && Number.isSafeInteger(witness.operationCount)
    && witness.operationCount > 0
    && witness.operationCount <= PROFILE_SHOWCASE_SEGMENT_CAPACITY
    && Number.isSafeInteger(witness.leafIndex)
    && witness.leafIndex >= 0
    && witness.leafIndex < witness.operationCount
    && Number.isSafeInteger(witness.operationPosition)
    && witness.operationPosition === witness.startOperationCount + witness.leafIndex
    && isDigest(witness.leafDigest)
    && Array.isArray(witness.siblings)
    && witness.siblings.every((sibling) => (
      (sibling.side === "left" || sibling.side === "right")
      && isDigest(sibling.digest)
    ))
    && isMechanicsOnlyAuthority(witness.authority);
}

export async function verifyProfileShowcaseMembership(
  witness: ProfileShowcaseMembershipWitness,
  committedRoot: string,
): Promise<boolean> {
  if (!isDigest(committedRoot) || !validWitnessShape(witness)) return false;
  const expectedDepth = Math.ceil(Math.log2(witness.operationCount));
  if (witness.siblings.length !== expectedDepth) return false;
  let position = witness.leafIndex;
  for (const sibling of witness.siblings) {
    const expectedSide = position % 2 === 0 ? "right" : "left";
    if (sibling.side !== expectedSide) return false;
    position = Math.floor(position / 2);
  }
  const expectedSegmentId = await segmentIdFor(witness.segmentBytesDigest, {
    startOperationCount: witness.startOperationCount,
    endOperationCount: witness.endOperationCount,
    operationCount: witness.operationCount,
    root: committedRoot,
    authority: PROFILE_SHOWCASE_COMMITMENT_MECHANICS_AUTHORITY,
  });
  if (expectedSegmentId !== witness.segmentId) return false;
  const root = recoverReceizCompositeMerkleRoot(
    witness.leafDigest,
    witness.siblings,
  );
  return root === committedRoot;
}

export async function verifyProfileShowcaseSegment(
  segment: ProfileShowcaseCommittedSegment,
): Promise<boolean> {
  try {
    if (
      segment.schema !== "receiz.profile-showcase.segment.v1"
      || !isDigest(segment.commitment.segmentId)
      || !isDigest(segment.commitment.root)
      || !isMechanicsOnlyAuthority(segment.authority)
    ) {
      return false;
    }
    const rebuilt = await sealProfileShowcaseSegment(segment.operations);
    return rebuilt.commitment.segmentId === segment.commitment.segmentId
      && rebuilt.commitment.root === segment.commitment.root
      && rebuilt.commitment.startOperationCount === segment.commitment.startOperationCount
      && rebuilt.commitment.endOperationCount === segment.commitment.endOperationCount
      && rebuilt.commitment.operationCount === segment.commitment.operationCount
      && isMechanicsOnlyAuthority(segment.commitment.authority)
      && bytesEqual(rebuilt.bytes, segment.bytes)
      && JSON.stringify(rebuilt.membershipWitnesses) === JSON.stringify(segment.membershipWitnesses);
  } catch {
    return false;
  }
}

export async function recoverProfileShowcaseSegmentOperations(
  segment: ProfileShowcaseCommittedSegment,
): Promise<readonly ProfileShowcaseOperationV1[]> {
  if (!await verifyProfileShowcaseSegment(segment)) {
    fail("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
  }
  return segment.operations.map(cloneOperation);
}
