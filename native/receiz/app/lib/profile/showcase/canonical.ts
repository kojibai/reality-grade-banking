import {
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS,
  assertReceizProfileShowcaseCarrierV114TransportContract,
  assertReceizProfileShowcaseGenesisV114TransportContract,
  assertReceizProfileShowcaseV114TransportContract,
  encodeReceizAuthority,
} from "../../../../packages/receiz-sdk/src/index";
import {
  canonicalProfileShowcaseOperations,
} from "./operations";
import type {
  ProfileShowcasePayloadV1,
} from "./types";

export const PROFILE_SHOWCASE_MAX_DIRECT_OPERATIONS =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.directOperations;
export const PROFILE_SHOWCASE_MAX_PARENT_DIGESTS =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.parentDigests;
export const PROFILE_SHOWCASE_MAX_SEGMENT_COMMITMENTS =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.segmentCommitments;
export const PROFILE_SHOWCASE_MAX_PROOF_HISTORY_EVIDENCE_ROOTS =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.proofHistoryEvidenceRoots;
export const PROFILE_SHOWCASE_MAX_MERKLE_FRONTIER =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.merkleFrontier;
export const PROFILE_SHOWCASE_MAX_FIBONACCI_CHECKPOINTS =
  RECEIZ_PROFILE_SHOWCASE_V114_TRANSPORT_LIMITS.fibonacciCheckpoints;

function fail(code: string): never {
  throw new TypeError(code);
}

function assertProfileShowcasePayloadV1Mechanics(
  value: unknown,
  allowEmptyDirectOperations: boolean,
): asserts value is ProfileShowcasePayloadV1 {
  assertReceizProfileShowcaseV114TransportContract(value);
  const payload = value as unknown as ProfileShowcasePayloadV1;
  if (!allowEmptyDirectOperations && payload.directOperations.length === 0) {
    fail("PROFILE_SHOWCASE_DIRECT_OPERATIONS_INVALID");
  }
}

export function assertProfileShowcasePayloadV1(
  value: unknown,
): asserts value is ProfileShowcasePayloadV1 {
  assertProfileShowcasePayloadV1Mechanics(value, false);
}

export function assertProfileShowcaseSealedPayloadV1(
  value: unknown,
): asserts value is ProfileShowcasePayloadV1 {
  assertReceizProfileShowcaseCarrierV114TransportContract(value);
  assertProfileShowcasePayloadV1Mechanics(value, true);
}

export function assertProfileShowcaseGenesisPayloadV1(
  value: unknown,
  input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    profileIdentity: string;
    actorEvidenceRoot: string;
    genesisKaiUpulse: string;
  }>,
): asserts value is ProfileShowcasePayloadV1 {
  assertReceizProfileShowcaseGenesisV114TransportContract(value, input);
  assertProfileShowcasePayloadV1Mechanics(value, true);
}

function compareString(left: string, right: string): number {
  const normalizedLeft = left.normalize("NFC");
  const normalizedRight = right.normalize("NFC");
  return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
}

function canonicalOperation(operation: ProfileShowcasePayloadV1["directOperations"][number]) {
  if (operation.kind !== "showcase.merge") return operation;
  return {
    ...operation,
    mergedParentArtifactDigests: [...operation.mergedParentArtifactDigests].sort(compareString),
    mergedChildren: [...operation.mergedChildren],
  };
}

function canonicalPayload(payload: ProfileShowcasePayloadV1): ProfileShowcasePayloadV1 {
  return {
    ...payload,
    parentArtifactDigests: [...payload.parentArtifactDigests].sort(compareString),
    directOperations: canonicalProfileShowcaseOperations(payload.directOperations)
      .map(canonicalOperation),
    fibonacci: {
      ...payload.fibonacci,
      checkpoints: [...payload.fibonacci.checkpoints].sort((left, right) => (
        left.operationCount - right.operationCount
        || left.distance - right.distance
        || compareString(left.artifactDigest, right.artifactDigest)
      )),
    },
    segments: [...payload.segments].sort((left, right) => (
      left.startOperationCount - right.startOperationCount
      || left.endOperationCount - right.endOperationCount
      || compareString(left.segmentId, right.segmentId)
    )),
    proofHistoryEvidenceRoots: [...payload.proofHistoryEvidenceRoots].sort(compareString),
  };
}

export function canonicalizeProfileShowcasePayload(
  payload: ProfileShowcasePayloadV1,
): Uint8Array {
  assertProfileShowcasePayloadV1(payload);
  return encodeReceizAuthority(
    "artifact",
    "receiz.profile-showcase.v1",
    canonicalPayload(payload),
  );
}
