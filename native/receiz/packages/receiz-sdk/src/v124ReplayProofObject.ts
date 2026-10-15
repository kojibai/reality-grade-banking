import {
  createReceizArtifactAdmissionEngine,
  verifyReceizArtifactAdmission,
} from "./artifactAdmission.js";
import { sha256ReceizBytes } from "./artifacts.js";
import { verifyReceizArtifact } from "./artifactVerification.js";
import {
  appendReceizCompositeMerkleLeaf,
  assertReceizCompositeMerkleState,
  buildReceizCompositeBoundedTree,
  buildReceizCompositeMerkleParent,
  createEmptyReceizCompositeMerkleState,
  digestReceizCompositeCanonical,
  receizCompositeFibonacciDistancesUpTo,
  recoverReceizCompositeMerkleRoot,
  type ReceizCompositeFibonacciState,
  type ReceizCompositeMerkleSibling,
  type ReceizCompositeMerkleState,
} from "./compositeProofKernel.js";
import {
  createReceizPortableAssetDocument,
  parseReceizPortableAssetDocument,
  type PortableJson,
  type ReceizPortableAssetDocument,
} from "./portableAsset.js";
import {
  receizBase64UrlEncode,
  receizBase64UrlDecode,
  verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizIdentityKeyAlgorithm,
} from "./identity.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
import {
  normalizeReceizProofAuthorityScopesV123,
  proofAuthorityChallengeBasisV123,
  type ReceizProofAuthorityChallengeV123,
} from "./v123ProofAuthority.js";
import type {
  ReceizCheckpointReceiptV124,
  ReceizCheckpointV124,
  ReceizDomainReplayReceiptV124,
  ReceizDomainReplayV124,
  ReceizNamespaceProjectionV124,
} from "./v124Replay.js";
import {
  normalizeReceizNamespaceNamesV123,
  projectReceizSubjectNamespacesV123,
} from "./v123Namespaces.js";
import {
  type ReceizSubjectAdmissionReceiptV122,
  type ReceizSubjectStateV122,
} from "./v122Subjects.js";
import {
  validateReceizWorldAccessAppendV122,
  type ReceizWorldAccessAppendV122,
} from "./v122WorldAccess.js";
import {
  canonicalizeReceizV122,
  deriveReceizSubjectIdV122,
  digestReceizCanonicalV122,
} from "./v122Canonical.js";
import {
  applicationId,
  closedRecord,
  digest,
  domainId,
  exactBase64Url,
  freeze,
  text,
} from "./v124Contracts.js";

export const RECEIZ_V124_DOMAIN_REPLAY_PROOF_CARRIER_MIME =
  "application/vnd.receiz.domain-replay-proof-carrier.v124+json" as const;
export const RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME =
  "application/vnd.receiz.portable-asset.v1+json" as const;
/** One production replay page is one immutable proof segment. */
export const RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY = 128 as const;

const UINT_RE = /^(0|[1-9][0-9]*)$/;

export type ReceizDomainReplayKaiV124 = Readonly<{
  pulse: number;
  uPulse: number;
}>;

export type ReceizDomainReplayNamespaceHeadV124 = Readonly<{
  name: string;
  head: string;
  digest: string;
}>;

export type ReceizDomainReplaySourceAuthorityV124 = Readonly<{
  schema: "receiz.domain-replay-source-authority.v124";
  applicationId: string;
  audience: string;
  domainId: string;
  ownerReceizId: string;
  actorSubjectId: string;
  actorSubjectHead: string;
  v123AuthorityDigest: string;
  v123KeyId: string;
  v123IdentityArtifactDigest: string;
  proofHeadBindingDigest: string;
  acceptedHead: string;
  ownershipDigest: string;
  provenanceDigest: string;
  sourceAuthorityBindingDigest: string;
  authority: Readonly<{
    bindingIsProofAuthority: false;
    grantIsIdentityAuthority: false;
    strongerTruth: "receiz-identity-artifact";
  }>;
}>;

export type ReceizDomainReplaySourceIntentInputV124 = Readonly<{
  applicationId: string;
  audience: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  acceptedHead: string;
  sourceKai: ReceizDomainReplayKaiV124;
  predecessorArtifactSha256: string | null;
  replay: ReceizDomainReplayV124;
  replayReceipt: ReceizDomainReplayReceiptV124;
  journalAppends: readonly ReceizDomainAppendCommandV124[];
  causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
}>;

/** Exact deterministic consent basis presented before the Receiz ID signs. */
export type ReceizDomainReplaySourceIntentV124 = Readonly<{
  schema: "receiz.domain-replay-source-intent.v124";
  applicationId: string;
  audience: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  acceptedHead: string;
  sourceKai: ReceizDomainReplayKaiV124;
  predecessorArtifactSha256: string | null;
  replayDigest: string;
  replayReceiptDigest: string;
  journalAppendsDigest: string;
  sourceAuthorityBindingDigest: string;
  v123KeyId: string;
  v123IdentityArtifactDigest: string;
  ownershipDigest: string;
  provenanceDigest: string;
  consentStatementDigest: string;
  authority: Readonly<{
    intentIsProofAuthority: false;
    strongerTruth: "receiz-identity-artifact";
  }>;
}>;

/** Public-only coordinate beneath the exact Receiz ID artifact. */
export type ReceizDomainReplayIdentityVerificationProjectionV124 = Readonly<{
  schema: "receiz.identity-public-verification.v124";
  identityArtifactDigest: string;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
  authority: Readonly<{
    projectionIsIdentityAuthority: false;
    strongerTruth: "receiz-identity-artifact";
  }>;
}>;

export type ReceizDomainReplaySourceAuthoringEvidenceV124 = Readonly<{
  schema: "receiz.domain-replay-source-authoring-evidence.v124";
  identity: ReceizDomainReplayIdentityVerificationProjectionV124;
  signedChallenge: ReceizProofAuthorityChallengeV123;
  scopes: readonly string[];
  consentStatementDigest: string;
  authority: Readonly<{
    evidenceIsProofAuthority: false;
    evidenceIsIdentityAuthority: false;
    grantIsIdentityAuthority: false;
    strongerTruth: "receiz-identity-artifact";
  }>;
}>;

export type ReceizDomainReplayAppendIndexValueV124 = Readonly<{
  eventDigest: string;
  cursor: number;
  newHead: string;
}>;

export type ReceizDomainAppendReceiptV124 = Readonly<{
  schema: "receiz.domain.append-receipt.v124";
  applicationId: string;
  domainId: string;
  appendId: string;
  sequence: number;
  priorHead: string;
  newHead: string;
  eventDigest: string;
  namespace: ReceizDomainReplayNamespaceHeadV124;
  authority: Readonly<{
    journalIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  receiptDigest: string;
}>;

export type ReceizDomainAppendResultV124 = Readonly<{
  schema: "receiz.domain.append-result.v124";
  ok: true;
  applicationId: string;
  domainId: string;
  appendId: string;
  sequence: number;
  head: string;
  receiptDigest: string;
}>;

export type ReceizDomainAppendConflictV124 = Readonly<{
  schema: "receiz.domain.append-conflict.v124";
  ok: false;
  applicationId: string;
  domainId: string;
  appendId: string;
  expectedHead: string;
  reasonCode: "STALE_HEAD";
  writes: 0;
}>;

/** Exact closed command consumed by the durable journal CAS mirror. */
export type ReceizDomainAppendCommandV124 = Readonly<{
  acceptedAtKaiUPulse: number;
  acceptedHead: string;
  appendId: string;
  applicationId: string;
  causalAppendIds: readonly string[];
  causalParentHeads: readonly string[];
  conflict: ReceizDomainAppendConflictV124;
  domainId: string;
  eventBytesB64u: string;
  eventDigest: string;
  eventPosition: number;
  expectedAbsent: boolean;
  expectedHead: string;
  namespace: ReceizNamespaceProjectionV124;
  receipt: ReceizDomainAppendReceiptV124;
  reducerDigest: string;
  registryDigest: string;
  result: ReceizDomainAppendResultV124;
}>;

export type ReceizDomainAppendCausalParentHeadV124 = Readonly<{
  appendId: string;
  head: string;
}>;

/** Exact source inputs that cannot be derived from the replay projection. */
export type ReceizDomainAppendCommandsInputV124 = Readonly<{
  replay: ReceizDomainReplayV124;
  replayReceipt: ReceizDomainReplayReceiptV124;
  kai: ReceizDomainReplayKaiV124;
  acceptedAtKaiUPulses: readonly number[];
  externalCausalParentHeads: readonly ReceizDomainAppendCausalParentHeadV124[];
}>;

export type ReceizDomainReplayAppendIndexWitnessV124 = Readonly<{
  schema: "receiz.domain-replay-append-index-witness.v124";
  appendId: string;
  value: ReceizDomainReplayAppendIndexValueV124 | null;
  /** Only non-default siblings, ordered by root depth. */
  siblings: readonly Readonly<{ depth: number; digest: string }>[];
}>;

export type ReceizDomainReplayFibonacciWitnessV124 = Readonly<{
  schema: "receiz.domain-replay-fibonacci-witness.v124";
  segmentPosition: number;
  segmentId: string;
  artifactSha256: string;
  peakLevel: number;
  siblings: readonly ReceizCompositeMerkleSibling[];
}>;

export type ReceizDomainReplayProofSegmentChildV124 = Readonly<{
  schema: "receiz.domain-replay-page-segment.v124";
  proofObjectId: string;
  segmentIndex: number;
  kai: ReceizDomainReplayKaiV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
  replay: ReceizDomainReplayV124;
  replayReceipt: ReceizDomainReplayReceiptV124;
  journalAppends: readonly ReceizDomainAppendCommandV124[];
  insertionWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
  causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
  authority: Readonly<{
    segmentIsProofAuthority: false;
    witnessIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplayProofSegmentCommitmentV124 = Readonly<{
  schema: "receiz.domain-replay-page-segment-commitment.v124";
  segmentIndex: number;
  startCursor: number;
  endCursor: number;
  additionCount: number;
  eventRoot: string;
  segmentBytesDigest: string;
  segmentId: string;
  exactSegmentBytesB64u: string;
}>;

export type ReceizDomainReplayProofHeadV124 = Readonly<{
  schema: "receiz.domain-replay-proof-head.v124";
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  genesisHead: string;
  kai: ReceizDomainReplayKaiV124;
  head: string;
  cursor: number;
  namespace: ReceizDomainReplayNamespaceHeadV124;
  segmentCount: number;
  segmentAccumulator: ReceizCompositeMerkleState;
  appendIndexRoot: string;
  appendIndexCount: number;
  fibonacci: ReceizCompositeFibonacciState;
  priorSourceArtifactSha256: string | null;
  priorSourceSegmentDigest: string | null;
  currentSourceSegmentDigest: string;
  currentSegment: Omit<
    ReceizDomainReplayProofSegmentCommitmentV124,
    "schema" | "exactSegmentBytesB64u"
  >;
  headDigest: string;
  authority: Readonly<{
    headIsProofAuthority: false;
    accumulatorIsProofAuthority: false;
    indexIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplaySegmentProofCarrierV124 = Readonly<{
  schema: "receiz.domain-replay-segment-proof.v124";
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  predecessor: Readonly<{
    artifactSha256: string;
    head: ReceizDomainReplayProofHeadV124;
  }> | null;
  segment: ReceizDomainReplayProofSegmentCommitmentV124;
  fibonacciWitnesses: readonly ReceizDomainReplayFibonacciWitnessV124[];
  head: ReceizDomainReplayProofHeadV124;
  authority: Readonly<{
    carrierIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplayCheckpointProofCarrierV124 = Readonly<{
  schema: "receiz.domain-replay-checkpoint-proof.v124";
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  kai: ReceizDomainReplayKaiV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  replaySourceArtifact: ReceizPortableSealedArtifactV124;
  replaySourceArtifactSha256: string;
  replayHead: ReceizDomainReplayProofHeadV124;
  checkpoint: ReceizCheckpointV124;
  checkpointReceipt: ReceizCheckpointReceiptV124;
  currentSourceSegmentDigest: string;
  authority: Readonly<{
    carrierIsProofAuthority: false;
    checkpointIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizViewerSubjectSourceCarrierV124 = Readonly<{
  schema: "receiz.viewer-subject-source.v124";
  subjectId: string;
  proofObjectId: string;
  ownerReceizId: string;
  head: string;
  accessKeyHead: string | null;
  exactSubjectStateBytesB64u: string;
  subjectStateDigest: string;
  authority: Readonly<{
    carrierIsSubjectAuthority: false;
    projectionIsSubjectAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

/** Constant-width persistence bundle; nested exact artifacts remain source. */
export type ReceizDomainReplayProofCarrierV124 = Readonly<{
  schema: "receiz.domain-replay-proof-custody.v124";
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  head: string;
  cursor: number;
  namespace: ReceizDomainReplayNamespaceHeadV124;
  predecessorSourceArtifact: ReceizPortableSealedArtifactV124 | null;
  replaySourceArtifact: ReceizPortableSealedArtifactV124;
  checkpointSourceArtifact: ReceizPortableSealedArtifactV124 | null;
  authority: Readonly<{
    custodyIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplayProofObjectExportInputV124 = Readonly<{
  applicationId: string;
  domainId: string;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
  throughHead: string;
  includeCheckpoint?: boolean;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  settlement: Readonly<Record<string, PortableJson>>;
}>;

export type ReceizDomainReplayProofObjectExportV124 = Readonly<{
  schema: "receiz.domain-replay-proof-object-export.v124";
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  throughHead: string;
  cursor: number;
  namespace: ReceizDomainReplayNamespaceHeadV124;
  portableAssetDigest: string;
  proofObject: Readonly<{
    assetType: "proof_object";
    payload: Readonly<{
      mimeType: typeof RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
      bytes: Uint8Array;
    }>;
  }>;
  authority: Readonly<{
    exportIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizProofObjectCandidatePortableV124 = Readonly<{
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  settlement: Readonly<Record<string, PortableJson>>;
}>;

type ReceizProofObjectCandidatePayloadV124 = Readonly<{
  assetType: "proof_object";
  payload: Readonly<{
    mimeType: typeof RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
    bytes: Uint8Array;
  }>;
}>;

export type ReceizSubjectSourceProofObjectCandidateV124 = Readonly<{
  schema: "receiz.subject-source-proof-object-candidate.v124";
  carrier: ReceizViewerSubjectSourceCarrierV124;
  portableAssetDigest: string;
  proofObject: ReceizProofObjectCandidatePayloadV124;
  authority: Readonly<{
    candidateIsSubjectAuthority: false;
    sealed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplaySegmentProofObjectCandidateV124 = Readonly<{
  schema: "receiz.domain-replay-segment-proof-object-candidate.v124";
  carrier: ReceizDomainReplaySegmentProofCarrierV124;
  portableAssetDigest: string;
  proofObject: ReceizProofObjectCandidatePayloadV124;
  authority: Readonly<{
    candidateIsProofAuthority: false;
    sealed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplayCheckpointProofObjectCandidateV124 = Readonly<{
  schema: "receiz.domain-replay-checkpoint-proof-object-candidate.v124";
  carrier: ReceizDomainReplayCheckpointProofCarrierV124;
  portableAssetDigest: string;
  proofObject: ReceizProofObjectCandidatePayloadV124;
  authority: Readonly<{
    candidateIsProofAuthority: false;
    sealed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizSubjectSourceProofObjectCandidateInputV124 = Readonly<{
  subjectState: ReceizSubjectStateV122;
  portable: ReceizProofObjectCandidatePortableV124;
}>;

export type ReceizDomainReplaySegmentProofObjectCandidateInputV124 = Readonly<{
  replay: ReceizDomainReplayV124;
  replayReceipt: ReceizDomainReplayReceiptV124;
  journalAppends: readonly ReceizDomainAppendCommandV124[];
  authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  kai: ReceizDomainReplayKaiV124;
  predecessorArtifact: ReceizPortableSealedArtifactV124 | null;
  insertionWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
  causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
  fibonacci: ReceizCompositeFibonacciState;
  fibonacciWitnesses: readonly ReceizDomainReplayFibonacciWitnessV124[];
  portable: ReceizProofObjectCandidatePortableV124;
}>;

export type ReceizDomainReplayCheckpointProofObjectCandidateInputV124 = Readonly<{
  replaySourceArtifact: ReceizPortableSealedArtifactV124;
  replayPredecessorArtifact: ReceizPortableSealedArtifactV124 | null;
  expectedAudience: string;
  checkpoint: ReceizCheckpointV124;
  checkpointReceipt: ReceizCheckpointReceiptV124;
  portable: ReceizProofObjectCandidatePortableV124;
}>;

export type ReceizDomainReplayProofObjectExpectationV124 = Readonly<{
  applicationId: string;
  domainId: string;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
  expectedHead: string;
  expectedCursor: number;
  expectedNamespace: ReceizDomainReplayNamespaceHeadV124;
}>;

export type ReceizDomainReplayProofObjectRestoreInputV124 =
  ReceizDomainReplayProofObjectExpectationV124 & Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
  }>;

export type ReceizDomainReplayProofObjectRestorationV124 = Readonly<{
  schema: "receiz.domain-replay-proof-object-restoration.v124";
  status: "restored";
  replay: ReceizDomainReplayV124;
  checkpoint: ReceizCheckpointV124 | null;
  sourceArtifactSha256: string;
  checkpointSourceArtifactSha256: string | null;
  headDigest: string;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  authority: Readonly<{
    restorationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplaySegmentSourceExpectationV124 = Readonly<{
  applicationId: string;
  audience: string;
  domainId?: string;
  expectedRegistryDigest?: string;
  expectedReducerDigest?: string;
  afterHead?: string | null;
  afterCursor?: number;
}>;

export type ReceizReadDomainReplaySegmentSourceV124 = Readonly<{
  schema: "receiz.domain-replay-segment-source-read.v124";
  status: "verified-source";
  artifact: ReceizPortableSealedArtifactV124;
  artifactSha256: string;
  artifactKaiPulse: number;
  predecessorArtifact: ReceizPortableSealedArtifactV124 | null;
  carrier: ReceizDomainReplaySegmentProofCarrierV124;
  head: ReceizDomainReplayProofHeadV124;
  replay: ReceizDomainReplayV124;
  replayReceipt: ReceizDomainReplayReceiptV124;
  journalAppends: readonly ReceizDomainAppendCommandV124[];
  sourceIntent: ReceizDomainReplaySourceIntentV124;
  authoringEvidence: ReceizDomainReplaySourceAuthoringEvidenceV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  authority: Readonly<{
    sourceReadIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

/** Non-authoritative content-addressed lookup coordinate from one pinned source. */
export type ReceizDomainReplaySegmentSourceCoordinateV124 = Readonly<{
  schema: "receiz.domain-replay-segment-source-coordinate.v124";
  artifactSha256: string;
  predecessorArtifactSha256: string | null;
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  head: string;
  headDigest: string;
  authority: Readonly<{
    coordinateIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReadDomainReplayCheckpointSourceV124 = Readonly<{
  schema: "receiz.domain-replay-checkpoint-source-read.v124";
  status: "verified-source";
  artifact: ReceizPortableSealedArtifactV124;
  artifactSha256: string;
  artifactKaiPulse: number;
  carrier: ReceizDomainReplayCheckpointProofCarrierV124;
  replaySource: ReceizReadDomainReplaySegmentSourceV124;
  replayHead: ReceizDomainReplayProofHeadV124;
  checkpoint: ReceizCheckpointV124;
  checkpointReceipt: ReceizCheckpointReceiptV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  authority: Readonly<{
    sourceReadIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReadViewerSubjectSourceV124 = Readonly<{
  schema: "receiz.viewer-subject-source-read.v124";
  status: "verified-source";
  artifact: ReceizPortableSealedArtifactV124;
  artifactSha256: string;
  artifactKaiPulse: number;
  carrier: ReceizViewerSubjectSourceCarrierV124;
  subjectState: ReceizSubjectStateV122;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  authority: Readonly<{
    sourceReadIsSubjectAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

/** Domain-neutral name for the same existing sealed subject-state primitive. */
export type ReceizReadSubjectSourceV124 = ReceizReadViewerSubjectSourceV124;

export type ReceizDomainReplayRuntimeSourceAdmissionV124 =
  | Readonly<{
    kind: "replay-segment";
    requestDigest: string;
    source: ReceizReadDomainReplaySegmentSourceV124;
  }>
  | Readonly<{
    kind: "replay-no-additions";
    requestDigest: string;
    source: ReceizReadDomainReplaySegmentSourceV124;
    replay: ReceizDomainReplayV124;
    replayReceipt: ReceizDomainReplayReceiptV124;
  }>
  | Readonly<{
    kind: "checkpoint";
    requestDigest: string;
    source: ReceizReadDomainReplayCheckpointSourceV124;
  }>
  | Readonly<{
    kind: "private";
    requestDigest: string;
    eventSource: ReceizReadDomainReplaySegmentSourceV124;
    viewerSubjectSource: ReceizReadViewerSubjectSourceV124;
    accessGrantSource: ReceizReadDomainReplaySegmentSourceV124;
  }>
  | Readonly<{
    kind: "private-failure";
    requestDigest: string;
  }>
  | Readonly<{
    kind: "namespace";
    requestDigest: string;
    subjectSource: ReceizReadSubjectSourceV124;
  }>
  | Readonly<{
    kind: "namespace-failure";
    requestDigest: string;
  }>;

function fail(code: string): never { throw new TypeError(code); }
function safeCount(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}
function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); return copy.buffer;
}

export function parseReceizDomainReplayKaiV124(
  value: unknown,
  code = "V124_REPLAY_PROOF_KAI_INVALID",
): ReceizDomainReplayKaiV124 {
  const record = closedRecord(value, ["pulse", "uPulse"], code);
  const pulse = safeCount(record.pulse, code), uPulse = safeCount(record.uPulse, code);
  if (Math.floor(uPulse / 1_000_000) !== pulse) fail(code);
  return freeze({ pulse, uPulse });
}

export function parseReceizDomainReplayNamespaceHeadV124(
  value: unknown,
  code = "V124_REPLAY_PROOF_NAMESPACE_INVALID",
): ReceizDomainReplayNamespaceHeadV124 {
  const record = closedRecord(value, ["name", "head", "digest"], code);
  return freeze({ name: text(record.name, code), head: digest(record.head, code), digest: digest(record.digest, code) });
}

export function deriveReceizDomainReplayProofObjectIdV124(input: Readonly<{
  applicationId: string; domainId: string; registryDigest: string;
  reducerDigest: string; genesisHead: string;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.domain-replay-proof-object-id.v124",
    applicationId: applicationId(input.applicationId, "V124_REPLAY_PROOF_ID_INVALID"),
    domainId: domainId(input.domainId, "V124_REPLAY_PROOF_ID_INVALID"),
    registryDigest: digest(input.registryDigest, "V124_REPLAY_PROOF_ID_INVALID"),
    reducerDigest: digest(input.reducerDigest, "V124_REPLAY_PROOF_ID_INVALID"),
    genesisHead: digest(input.genesisHead, "V124_REPLAY_PROOF_ID_INVALID"),
  });
}

export async function createReceizDomainReplaySourceAuthorityV124(input: Readonly<{
  applicationId: string; audience: string; domainId: string; ownerReceizId: string;
  actorSubjectId: string; actorSubjectHead: string; v123AuthorityDigest: string;
  v123KeyId: string; v123IdentityArtifactDigest: string;
  proofHeadBindingDigest: string; acceptedHead: string;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
}>): Promise<ReceizDomainReplaySourceAuthorityV124> {
  const basis = {
    schema: "receiz.domain-replay-source-authority.v124" as const,
    applicationId: applicationId(input.applicationId, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    audience: text(input.audience, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    domainId: domainId(input.domainId, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    ownerReceizId: text(input.ownerReceizId, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    actorSubjectId: domainId(input.actorSubjectId, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    actorSubjectHead: digest(input.actorSubjectHead, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    v123AuthorityDigest: digest(input.v123AuthorityDigest, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    v123KeyId: digest(input.v123KeyId, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    v123IdentityArtifactDigest: digest(input.v123IdentityArtifactDigest, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    proofHeadBindingDigest: digest(input.proofHeadBindingDigest, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    acceptedHead: digest(input.acceptedHead, "V124_REPLAY_SOURCE_AUTHORITY_INVALID"),
    ownershipDigest: await digestReceizCanonicalV122(input.ownership),
    provenanceDigest: await digestReceizCanonicalV122(input.provenance),
    authority: freeze({
      bindingIsProofAuthority: false as const,
      grantIsIdentityAuthority: false as const,
      strongerTruth: "receiz-identity-artifact" as const,
    }),
  };
  if (basis.ownerReceizId !== input.ownership.ownerReceizId) fail("V124_REPLAY_SOURCE_OWNER_MISMATCH");
  return freeze({
    ...basis,
    sourceAuthorityBindingDigest: await digestReceizCanonicalV122(basis),
  });
}

export async function parseReceizDomainReplaySourceAuthorityV124(
  value: unknown,
  enclosing?: Readonly<{
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
  }>,
): Promise<ReceizDomainReplaySourceAuthorityV124> {
  const code = "V124_REPLAY_SOURCE_AUTHORITY_INVALID";
  const record = closedRecord(value, ["schema", "applicationId", "audience", "domainId", "ownerReceizId", "actorSubjectId", "actorSubjectHead", "v123AuthorityDigest", "v123KeyId", "v123IdentityArtifactDigest", "proofHeadBindingDigest", "acceptedHead", "ownershipDigest", "provenanceDigest", "sourceAuthorityBindingDigest", "authority"], code);
  if (record.schema !== "receiz.domain-replay-source-authority.v124") fail(code);
  const authority = closedRecord(record.authority, ["bindingIsProofAuthority", "grantIsIdentityAuthority", "strongerTruth"], code);
  if (authority.bindingIsProofAuthority !== false || authority.grantIsIdentityAuthority !== false || authority.strongerTruth !== "receiz-identity-artifact") fail(code);
  const parsed = freeze({
    schema: "receiz.domain-replay-source-authority.v124" as const,
    applicationId: applicationId(record.applicationId, code), audience: text(record.audience, code),
    domainId: domainId(record.domainId, code), ownerReceizId: text(record.ownerReceizId, code),
    actorSubjectId: domainId(record.actorSubjectId, code), actorSubjectHead: digest(record.actorSubjectHead, code),
    v123AuthorityDigest: digest(record.v123AuthorityDigest, code),
    v123KeyId: digest(record.v123KeyId, code),
    v123IdentityArtifactDigest: digest(record.v123IdentityArtifactDigest, code),
    proofHeadBindingDigest: digest(record.proofHeadBindingDigest, code),
    acceptedHead: digest(record.acceptedHead, code), ownershipDigest: digest(record.ownershipDigest, code),
    provenanceDigest: digest(record.provenanceDigest, code), sourceAuthorityBindingDigest: digest(record.sourceAuthorityBindingDigest, code),
    authority: freeze({ bindingIsProofAuthority: false as const, grantIsIdentityAuthority: false as const, strongerTruth: "receiz-identity-artifact" as const }),
  });
  const { sourceAuthorityBindingDigest: _binding, ...basis } = parsed;
  if (await digestReceizCanonicalV122(basis) !== parsed.sourceAuthorityBindingDigest) fail(code);
  if (enclosing && (parsed.ownerReceizId !== enclosing.ownership.ownerReceizId
    || parsed.ownershipDigest !== await digestReceizCanonicalV122(enclosing.ownership)
    || parsed.provenanceDigest !== await digestReceizCanonicalV122(enclosing.provenance))) fail("V124_REPLAY_SOURCE_ENCLOSING_AUTHORITY_MISMATCH");
  return parsed;
}

/**
 * Builds the exact source-authorship consent basis before any identity proof
 * is requested. This is deterministic coordination data only; the resulting
 * digest acquires no authority until the Receiz ID signs the V123 challenge
 * and the enclosing replay candidate is sealed and pinned-admitted.
 */
export async function createReceizDomainReplaySourceIntentV124(
  input: ReceizDomainReplaySourceIntentInputV124,
): Promise<ReceizDomainReplaySourceIntentV124> {
  const code = "V124_REPLAY_SOURCE_INTENT_INPUT_INVALID";
  const record = closedRecord(input, [
    "applicationId", "audience", "domainId", "registryDigest",
    "reducerDigest", "acceptedHead", "sourceKai",
    "predecessorArtifactSha256", "replay", "replayReceipt",
    "journalAppends", "causalParentWitnesses", "sourceAuthority",
    "ownership", "provenance",
  ], code);
  if (!Array.isArray(record.journalAppends)
    || !Array.isArray(record.causalParentWitnesses)) fail(code);
  const application = applicationId(record.applicationId, code);
  const audience = text(record.audience, code);
  const domain = domainId(record.domainId, code);
  const registry = digest(record.registryDigest, code);
  const reducer = digest(record.reducerDigest, code);
  const acceptedHead = digest(record.acceptedHead, code);
  const sourceKai = parseReceizDomainReplayKaiV124(record.sourceKai, code);
  const predecessorArtifactSha256 = record.predecessorArtifactSha256 === null
    ? null
    : digest(record.predecessorArtifactSha256, code);
  const causalParentWitnesses = record.causalParentWitnesses.map(
    parseReceizDomainReplayAppendIndexWitnessV124,
  );
  const replayReceipt = await parseReplayReceipt(record.replayReceipt);
  const replay = await parseReplayProjection({
    replay: record.replay,
    receipt: replayReceipt,
    externalCausalParents: new Set(
      causalParentWitnesses.map((witness) => witness.appendId),
    ),
  });
  const journalAppends = await parseReceizDomainAppendCommandsV124({
    values: record.journalAppends,
    replay,
    kai: sourceKai,
    causalParentWitnesses,
  });
  const enclosing = freeze({
    ownership: record.ownership as ReceizPortableAssetDocument["ownership"],
    provenance: record.provenance as ReceizPortableAssetDocument["provenance"],
  });
  const sourceAuthority = await parseReceizDomainReplaySourceAuthorityV124(
    record.sourceAuthority,
    enclosing,
  );
  if (application !== replay.applicationId
    || domain !== replay.domainId
    || registry !== replay.registryDigest
    || reducer !== replay.reducerDigest
    || acceptedHead !== replay.head
    || sourceAuthority.applicationId !== application
    || sourceAuthority.audience !== audience
    || sourceAuthority.domainId !== domain
    || sourceAuthority.acceptedHead !== acceptedHead) {
    fail("V124_REPLAY_SOURCE_INTENT_BINDING_MISMATCH");
  }
  const ownershipDigest = await digestReceizCanonicalV122(enclosing.ownership);
  const provenanceDigest = await digestReceizCanonicalV122(enclosing.provenance);
  if (sourceAuthority.ownershipDigest !== ownershipDigest
    || sourceAuthority.provenanceDigest !== provenanceDigest) {
    fail("V124_REPLAY_SOURCE_INTENT_BINDING_MISMATCH");
  }
  const basis = freeze({
    schema: "receiz.domain-replay-source-intent.v124" as const,
    applicationId: application,
    audience,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    acceptedHead,
    sourceKai,
    predecessorArtifactSha256,
    replayDigest: await digestReceizCanonicalV122(replay),
    replayReceiptDigest: await digestReceizCanonicalV122(replayReceipt),
    journalAppendsDigest: await digestReceizCanonicalV122(journalAppends),
    sourceAuthorityBindingDigest: sourceAuthority.sourceAuthorityBindingDigest,
    v123KeyId: sourceAuthority.v123KeyId,
    v123IdentityArtifactDigest: sourceAuthority.v123IdentityArtifactDigest,
    ownershipDigest,
    provenanceDigest,
    authority: freeze({
      intentIsProofAuthority: false as const,
      strongerTruth: "receiz-identity-artifact" as const,
    }),
  });
  return freeze({
    ...basis,
    consentStatementDigest: await digestReceizCanonicalV122(basis),
  });
}

async function parseReceizDomainReplaySourceAuthoringEvidenceV124(
  value: unknown,
  intent: ReceizDomainReplaySourceIntentV124,
): Promise<ReceizDomainReplaySourceAuthoringEvidenceV124> {
  const invalid = "V124_REPLAY_SOURCE_AUTHORING_EVIDENCE_INVALID";
  const record = closedRecord(value, [
    "schema", "identity", "signedChallenge", "scopes",
    "consentStatementDigest", "authority",
  ], invalid);
  if (record.schema !== "receiz.domain-replay-source-authoring-evidence.v124"
    || !Array.isArray(record.scopes)) fail(invalid);
  const evidenceAuthority = closedRecord(record.authority, [
    "evidenceIsProofAuthority", "evidenceIsIdentityAuthority",
    "grantIsIdentityAuthority", "strongerTruth",
  ], invalid);
  if (evidenceAuthority.evidenceIsProofAuthority !== false
    || evidenceAuthority.evidenceIsIdentityAuthority !== false
    || evidenceAuthority.grantIsIdentityAuthority !== false
    || evidenceAuthority.strongerTruth !== "receiz-identity-artifact") {
    fail(invalid);
  }
  const identityRecord = closedRecord(record.identity, [
    "schema", "identityArtifactDigest", "keyId", "alg",
    "publicKeyRawB64u", "authority",
  ], "V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  const identityAuthority = closedRecord(identityRecord.authority, [
    "projectionIsIdentityAuthority", "strongerTruth",
  ], "V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  if (identityRecord.schema !== "receiz.identity-public-verification.v124"
    || identityAuthority.projectionIsIdentityAuthority !== false
    || identityAuthority.strongerTruth !== "receiz-identity-artifact") {
    fail("V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  }
  const identityArtifactDigest = digest(
    identityRecord.identityArtifactDigest,
    "V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID",
  );
  const keyId = digest(
    identityRecord.keyId,
    "V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID",
  );
  const alg = identityRecord.alg;
  if (alg !== "Ed25519" && alg !== "P-256") {
    fail("V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  }
  exactBase64Url(
    identityRecord.publicKeyRawB64u,
    "V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID",
  );
  const publicKeyRawB64u = identityRecord.publicKeyRawB64u as string;
  if (keyId !== intent.v123KeyId
    || identityArtifactDigest !== intent.v123IdentityArtifactDigest) {
    fail("V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  }
  let scopes: readonly string[];
  try {
    scopes = normalizeReceizProofAuthorityScopesV123(
      record.scopes as readonly string[],
    );
  } catch {
    return fail(invalid);
  }
  if (!exactCanonicalEqual(record.scopes, scopes)) {
    fail("V124_REPLAY_SOURCE_AUTHORING_SCOPES_NONCANONICAL");
  }
  if (!scopes.includes("receiz:domains.write")) {
    fail("V124_REPLAY_SOURCE_AUTHORING_SCOPE_REQUIRED");
  }
  const consentStatementDigest = digest(
    record.consentStatementDigest,
    "V124_REPLAY_SOURCE_AUTHORING_INTENT_MISMATCH",
  );
  if (consentStatementDigest !== intent.consentStatementDigest) {
    fail("V124_REPLAY_SOURCE_AUTHORING_INTENT_MISMATCH");
  }

  const challengeRecord = closedRecord(record.signedChallenge, [
    "schema", "audience", "nonce", "issuedAtKai", "expiresAtKai",
    "consent", "proof",
  ], "V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID");
  if (challengeRecord.schema !== "receiz.identity.proof-authority-challenge.v123"
    || challengeRecord.audience !== intent.audience) {
    fail("V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID");
  }
  const nonce = text(
    challengeRecord.nonce,
    "V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID",
  );
  const issuedAtKai = safeCount(
    challengeRecord.issuedAtKai,
    "V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID",
  );
  const expiresAtKai = safeCount(
    challengeRecord.expiresAtKai,
    "V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID",
  );
  if (nonce.length > 256 || expiresAtKai <= issuedAtKai
    || expiresAtKai - issuedAtKai > 600) {
    fail("V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID");
  }
  if (intent.sourceKai.pulse < issuedAtKai) {
    fail("V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_NOT_YET_VALID_AT_SOURCE");
  }
  if (intent.sourceKai.pulse >= expiresAtKai) {
    fail("V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_EXPIRED_AT_SOURCE");
  }
  const consent = closedRecord(challengeRecord.consent, [
    "approved", "statementDigest",
  ], "V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID");
  if (consent.approved !== true
    || digest(
      consent.statementDigest,
      "V124_REPLAY_SOURCE_AUTHORING_INTENT_MISMATCH",
    ) !== consentStatementDigest) {
    fail("V124_REPLAY_SOURCE_AUTHORING_INTENT_MISMATCH");
  }
  const proofRecord = closedRecord(challengeRecord.proof, [
    "schema", "keyId", "alg", "challengeB64Url", "signatureB64Url",
  ], "V124_REPLAY_SOURCE_AUTHORING_PROOF_INVALID");
  if (proofRecord.schema !== "receiz.identity.login_proof.v1"
    || proofRecord.keyId !== keyId || proofRecord.alg !== alg) {
    fail("V124_REPLAY_SOURCE_AUTHORING_IDENTITY_INVALID");
  }
  exactBase64Url(
    proofRecord.challengeB64Url,
    "V124_REPLAY_SOURCE_AUTHORING_PROOF_INVALID",
  );
  exactBase64Url(
    proofRecord.signatureB64Url,
    "V124_REPLAY_SOURCE_AUTHORING_PROOF_INVALID",
  );
  const unsigned = freeze({
    schema: "receiz.identity.proof-authority-challenge.v123" as const,
    audience: intent.audience,
    nonce,
    issuedAtKai,
    expiresAtKai,
    consent: freeze({ approved: true as const, statementDigest: consentStatementDigest }),
  });
  let challengeBasis: ReturnType<typeof proofAuthorityChallengeBasisV123>;
  try {
    challengeBasis = proofAuthorityChallengeBasisV123({
      challenge: unsigned,
      applicationId: intent.audience,
      artifactDigest: identityArtifactDigest,
      scopes,
    });
  } catch {
    return fail("V124_REPLAY_SOURCE_AUTHORING_CHALLENGE_INVALID");
  }
  const challengeB64Url = proofRecord.challengeB64Url as string;
  const signatureB64Url = proofRecord.signatureB64Url as string;
  if (challengeB64Url !== receizBase64UrlEncode(
    new TextEncoder().encode(canonicalizeReceizV122(challengeBasis)),
  ) || !await verifyReceizIdentityPublicKeyProjectionSignature({
    keyId,
    alg,
    publicKeyRawB64u,
    challengeB64Url,
    signatureB64Url,
  })) {
    fail("V124_REPLAY_SOURCE_AUTHORING_PROOF_INVALID");
  }
  return freeze({
    schema: "receiz.domain-replay-source-authoring-evidence.v124" as const,
    identity: freeze({
      schema: "receiz.identity-public-verification.v124" as const,
      identityArtifactDigest,
      keyId,
      alg,
      publicKeyRawB64u,
      authority: freeze({
        projectionIsIdentityAuthority: false as const,
        strongerTruth: "receiz-identity-artifact" as const,
      }),
    }),
    signedChallenge: freeze({
      ...unsigned,
      proof: freeze({
        schema: "receiz.identity.login_proof.v1" as const,
        keyId,
        alg,
        challengeB64Url,
        signatureB64Url,
      }),
    }),
    scopes: freeze(scopes),
    consentStatementDigest,
    authority: freeze({
      evidenceIsProofAuthority: false as const,
      evidenceIsIdentityAuthority: false as const,
      grantIsIdentityAuthority: false as const,
      strongerTruth: "receiz-identity-artifact" as const,
    }),
  });
}

const SPARSE_EMPTY_HASHES: readonly string[] = (() => {
  const hashes = new Array<string>(257);
  hashes[256] = digestReceizCompositeCanonical({ kind: "receiz.domain-replay-append-index-empty-leaf.v124" });
  for (let depth = 255; depth >= 0; depth -= 1) hashes[depth] = buildReceizCompositeMerkleParent(hashes[depth + 1]!, hashes[depth + 1]!);
  return Object.freeze(hashes);
})();

export function createEmptyReceizDomainReplayAppendIndexRootV124(): string { return SPARSE_EMPTY_HASHES[0]!; }
export function deriveReceizDomainReplayAppendIndexKeyV124(appendId: string): string {
  return digestReceizCompositeCanonical({ kind: "receiz.domain-replay-append-index-key.v124", appendId: text(appendId, "V124_REPLAY_APPEND_INDEX_APPEND_ID_INVALID") });
}
export function deriveReceizDomainReplayAppendIndexLeafV124(input: Readonly<{ appendId: string; value: ReceizDomainReplayAppendIndexValueV124 }>): string {
  return digestReceizCompositeCanonical({ kind: "receiz.domain-replay-append-index-leaf.v124", keyDigest: deriveReceizDomainReplayAppendIndexKeyV124(input.appendId), appendId: input.appendId, eventDigest: digest(input.value.eventDigest, "V124_REPLAY_APPEND_INDEX_VALUE_INVALID"), cursor: safeCount(input.value.cursor, "V124_REPLAY_APPEND_INDEX_VALUE_INVALID"), newHead: digest(input.value.newHead, "V124_REPLAY_APPEND_INDEX_VALUE_INVALID") });
}

export function deriveReceizDomainReplaySegmentEventLeafV124(input: Readonly<{
  appendId: string;
  eventDigest: string;
  cursor: number;
  newHead: string;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.domain-replay-segment-event-leaf.v124",
    appendId: text(input.appendId, "V124_REPLAY_PROOF_EVENT_LEAF_INVALID"),
    eventDigest: digest(input.eventDigest, "V124_REPLAY_PROOF_EVENT_LEAF_INVALID"),
    cursor: safeCount(input.cursor, "V124_REPLAY_PROOF_EVENT_LEAF_INVALID"),
    newHead: digest(input.newHead, "V124_REPLAY_PROOF_EVENT_LEAF_INVALID"),
  });
}

export function deriveReceizDomainReplaySegmentIdV124(input: Readonly<{
  proofObjectId: string;
  segmentIndex: number;
  startCursor: number;
  endCursor: number;
  additionCount: number;
  eventRoot: string;
  segmentBytesDigest: string;
}>): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.domain-replay-page-segment-id.v124",
    proofObjectId: digest(input.proofObjectId, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    segmentIndex: safeCount(input.segmentIndex, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    startCursor: safeCount(input.startCursor, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    endCursor: safeCount(input.endCursor, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    additionCount: safeCount(input.additionCount, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    eventRoot: digest(input.eventRoot, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
    segmentBytesDigest: digest(input.segmentBytesDigest, "V124_REPLAY_PROOF_SEGMENT_INVALID"),
  });
}

export function parseReceizDomainReplaySegmentCommitmentV124(
  value: unknown,
): ReceizDomainReplayProofSegmentCommitmentV124 {
  const code = "V124_REPLAY_PROOF_SEGMENT_INVALID";
  const record = closedRecord(value, [
    "schema",
    "segmentIndex",
    "startCursor",
    "endCursor",
    "additionCount",
    "eventRoot",
    "segmentBytesDigest",
    "segmentId",
    "exactSegmentBytesB64u",
  ], code);
  if (record.schema !== "receiz.domain-replay-page-segment-commitment.v124") fail(code);
  const exactBytes = exactBase64Url(record.exactSegmentBytesB64u, code);
  if (exactBytes.byteLength === 0 || receizBase64UrlEncode(exactBytes) !== record.exactSegmentBytesB64u) fail(code);
  const parsed = freeze({
    schema: "receiz.domain-replay-page-segment-commitment.v124" as const,
    segmentIndex: safeCount(record.segmentIndex, code),
    startCursor: safeCount(record.startCursor, code),
    endCursor: safeCount(record.endCursor, code),
    additionCount: safeCount(record.additionCount, code),
    eventRoot: digest(record.eventRoot, code),
    segmentBytesDigest: digest(record.segmentBytesDigest, code),
    segmentId: digest(record.segmentId, code),
    exactSegmentBytesB64u: record.exactSegmentBytesB64u as string,
  });
  if (parsed.segmentIndex < 1
    || parsed.additionCount < 1
    || parsed.additionCount > RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY
    || parsed.endCursor !== parsed.startCursor + parsed.additionCount) fail(code);
  return parsed;
}
function sparseBit(key: string, depth: number): 0 | 1 {
  const byte = Number.parseInt(key.slice(Math.floor(depth / 8) * 2, Math.floor(depth / 8) * 2 + 2), 16);
  return ((byte >> (7 - depth % 8)) & 1) as 0 | 1;
}
function parseAppendIndexValue(value: unknown, code: string): ReceizDomainReplayAppendIndexValueV124 {
  const record = closedRecord(value, ["eventDigest", "cursor", "newHead"], code);
  return freeze({ eventDigest: digest(record.eventDigest, code), cursor: safeCount(record.cursor, code), newHead: digest(record.newHead, code) });
}
export function parseReceizDomainReplayAppendIndexWitnessV124(value: unknown): ReceizDomainReplayAppendIndexWitnessV124 {
  const code = "V124_REPLAY_APPEND_INDEX_WITNESS_INVALID";
  const record = closedRecord(value, ["schema", "appendId", "value", "siblings"], code);
  if (record.schema !== "receiz.domain-replay-append-index-witness.v124" || !Array.isArray(record.siblings)) fail(code);
  let priorDepth = -1;
  const siblings = record.siblings.map((candidate) => {
    const sibling = closedRecord(candidate, ["depth", "digest"], code);
    const depth = safeCount(sibling.depth, code), valueDigest = digest(sibling.digest, code);
    if (depth > 255 || depth <= priorDepth || valueDigest === SPARSE_EMPTY_HASHES[depth + 1]) fail(code);
    priorDepth = depth; return freeze({ depth, digest: valueDigest });
  });
  return freeze({ schema: "receiz.domain-replay-append-index-witness.v124" as const, appendId: text(record.appendId, code), value: record.value === null ? null : parseAppendIndexValue(record.value, code), siblings: freeze(siblings) });
}
export function deriveReceizDomainReplayAppendIndexRootFromWitnessV124(input: Readonly<{ witness: ReceizDomainReplayAppendIndexWitnessV124; value: ReceizDomainReplayAppendIndexValueV124 | null }>): string {
  const witness = parseReceizDomainReplayAppendIndexWitnessV124(input.witness), key = deriveReceizDomainReplayAppendIndexKeyV124(witness.appendId);
  const siblings = new Map(witness.siblings.map((sibling) => [sibling.depth, sibling.digest]));
  let root = input.value === null ? SPARSE_EMPTY_HASHES[256]! : deriveReceizDomainReplayAppendIndexLeafV124({ appendId: witness.appendId, value: input.value });
  for (let depth = 255; depth >= 0; depth -= 1) {
    const sibling = siblings.get(depth) ?? SPARSE_EMPTY_HASHES[depth + 1]!;
    root = sparseBit(key, depth) === 0 ? buildReceizCompositeMerkleParent(root, sibling) : buildReceizCompositeMerkleParent(sibling, root);
  }
  return root;
}
export function verifyReceizDomainReplayAppendIndexWitnessV124(input: Readonly<{ witness: unknown; expectedRoot: string; expectedAppendId: string; expectedValue: ReceizDomainReplayAppendIndexValueV124 | null; insertValue?: ReceizDomainReplayAppendIndexValueV124 }>): Readonly<{ witness: ReceizDomainReplayAppendIndexWitnessV124; resultingRoot: string }> {
  const witness = parseReceizDomainReplayAppendIndexWitnessV124(input.witness), expectedRoot = digest(input.expectedRoot, "V124_REPLAY_APPEND_INDEX_ROOT_INVALID");
  if (witness.appendId !== input.expectedAppendId || canonicalizeReceizV122(witness.value) !== canonicalizeReceizV122(input.expectedValue)) fail("V124_REPLAY_APPEND_INDEX_WITNESS_MISMATCH");
  if (deriveReceizDomainReplayAppendIndexRootFromWitnessV124({ witness, value: witness.value }) !== expectedRoot) fail("V124_REPLAY_APPEND_INDEX_WITNESS_ROOT_MISMATCH");
  return freeze({ witness, resultingRoot: input.insertValue ? deriveReceizDomainReplayAppendIndexRootFromWitnessV124({ witness, value: input.insertValue }) : expectedRoot });
}

function parseFibonacci(value: unknown, operationCount: number): ReceizCompositeFibonacciState {
  const code = "V124_REPLAY_PROOF_FIBONACCI_INVALID", record = closedRecord(value, ["basis", "operationCount", "checkpoints"], code);
  if (record.basis !== "sparse-checkpoint/v1" || record.operationCount !== operationCount || !Array.isArray(record.checkpoints)) fail(code);
  const distances = receizCompositeFibonacciDistancesUpTo(operationCount).filter((distance) => distance < operationCount);
  if (record.checkpoints.length !== distances.length) fail(code);
  const checkpoints = record.checkpoints.map((candidate, index) => {
    const item = closedRecord(candidate, ["distance", "operationCount", "artifactDigest"], code);
    if (item.distance !== distances[index] || item.operationCount !== operationCount - distances[index]!) fail(code);
    return freeze({ distance: item.distance as number, operationCount: item.operationCount as number, artifactDigest: digest(item.artifactDigest, code) });
  });
  return freeze({ basis: "sparse-checkpoint/v1" as const, operationCount, checkpoints: freeze(checkpoints) });
}

export function parseReceizDomainReplayProofHeadV124(value: unknown): ReceizDomainReplayProofHeadV124 {
  const code = "V124_REPLAY_PROOF_HEAD_INVALID", record = closedRecord(value, ["schema", "proofObjectId", "applicationId", "domainId", "registryDigest", "reducerDigest", "genesisHead", "kai", "head", "cursor", "namespace", "segmentCount", "segmentAccumulator", "appendIndexRoot", "appendIndexCount", "fibonacci", "priorSourceArtifactSha256", "priorSourceSegmentDigest", "currentSourceSegmentDigest", "currentSegment", "headDigest", "authority"], code);
  if (record.schema !== "receiz.domain-replay-proof-head.v124") fail(code);
  const application = applicationId(record.applicationId, code), domain = domainId(record.domainId, code), registry = digest(record.registryDigest, code), reducer = digest(record.reducerDigest, code), genesisHead = digest(record.genesisHead, code), proofObjectId = digest(record.proofObjectId, code);
  if (proofObjectId !== deriveReceizDomainReplayProofObjectIdV124({ applicationId: application, domainId: domain, registryDigest: registry, reducerDigest: reducer, genesisHead })) fail("V124_REPLAY_PROOF_STABLE_ID_MISMATCH");
  const cursor = safeCount(record.cursor, code), segmentCount = safeCount(record.segmentCount, code);
  if (segmentCount < 1 || segmentCount > cursor) fail(code);
  const accumulator = structuredClone(record.segmentAccumulator) as ReceizCompositeMerkleState;
  assertReceizCompositeMerkleState(accumulator); if (accumulator.leafCount !== segmentCount) fail(code);
  const current = closedRecord(record.currentSegment, ["segmentIndex", "startCursor", "endCursor", "additionCount", "eventRoot", "segmentBytesDigest", "segmentId"], code);
  const startCursor = safeCount(current.startCursor, code), endCursor = safeCount(current.endCursor, code), additionCount = safeCount(current.additionCount, code);
  if (current.segmentIndex !== segmentCount || additionCount < 1 || additionCount > RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY || endCursor !== startCursor + additionCount || endCursor !== cursor) fail(code);
  const authority = closedRecord(record.authority, ["headIsProofAuthority", "accumulatorIsProofAuthority", "indexIsProofAuthority", "strongerTruth"], code);
  if (authority.headIsProofAuthority !== false || authority.accumulatorIsProofAuthority !== false || authority.indexIsProofAuthority !== false || authority.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  const basis = freeze({ schema: "receiz.domain-replay-proof-head.v124" as const, proofObjectId, applicationId: application, domainId: domain, registryDigest: registry, reducerDigest: reducer, genesisHead, kai: parseReceizDomainReplayKaiV124(record.kai, code), head: digest(record.head, code), cursor, namespace: parseReceizDomainReplayNamespaceHeadV124(record.namespace, code), segmentCount, segmentAccumulator: freeze(accumulator), appendIndexRoot: digest(record.appendIndexRoot, code), appendIndexCount: safeCount(record.appendIndexCount, code), fibonacci: parseFibonacci(record.fibonacci, segmentCount), priorSourceArtifactSha256: record.priorSourceArtifactSha256 === null ? null : digest(record.priorSourceArtifactSha256, code), priorSourceSegmentDigest: record.priorSourceSegmentDigest === null ? null : digest(record.priorSourceSegmentDigest, code), currentSourceSegmentDigest: digest(record.currentSourceSegmentDigest, code), currentSegment: freeze({ segmentIndex: segmentCount, startCursor, endCursor, additionCount, eventRoot: digest(current.eventRoot, code), segmentBytesDigest: digest(current.segmentBytesDigest, code), segmentId: digest(current.segmentId, code) }), authority: freeze({ headIsProofAuthority: false as const, accumulatorIsProofAuthority: false as const, indexIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  const headDigest = digest(record.headDigest, code);
  if (basis.appendIndexCount !== cursor || (segmentCount === 1) !== (basis.priorSourceArtifactSha256 === null) || (segmentCount === 1) !== (basis.priorSourceSegmentDigest === null) || basis.currentSourceSegmentDigest !== basis.currentSegment.segmentBytesDigest || headDigest !== digestReceizCompositeCanonical({ kind: "receiz.domain-replay-proof-head-digest.v124", head: basis })) fail(code);
  return freeze({ ...basis, headDigest });
}

export function createReceizDomainReplayProofHeadV124(input: Omit<ReceizDomainReplayProofHeadV124, "schema" | "headDigest" | "authority">): ReceizDomainReplayProofHeadV124 {
  const basis = freeze({ schema: "receiz.domain-replay-proof-head.v124" as const, ...structuredClone(input), authority: freeze({ headIsProofAuthority: false as const, accumulatorIsProofAuthority: false as const, indexIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  return parseReceizDomainReplayProofHeadV124({ ...basis, headDigest: digestReceizCompositeCanonical({ kind: "receiz.domain-replay-proof-head-digest.v124", head: basis }) });
}

export function compareReceizDomainReplaySourceHeadsV124(left: Readonly<{ head: ReceizDomainReplayProofHeadV124; artifactSha256: string }>, right: Readonly<{ head: ReceizDomainReplayProofHeadV124; artifactSha256: string }>): number {
  const a = parseReceizDomainReplayProofHeadV124(left.head), b = parseReceizDomainReplayProofHeadV124(right.head);
  if (a.proofObjectId !== b.proofObjectId) fail("V124_REPLAY_PROOF_HEAD_IDENTITY_MISMATCH");
  if (a.kai.uPulse !== b.kai.uPulse) return a.kai.uPulse < b.kai.uPulse ? -1 : 1;
  return digest(left.artifactSha256, "V124_REPLAY_PROOF_ARTIFACT_INVALID").localeCompare(digest(right.artifactSha256, "V124_REPLAY_PROOF_ARTIFACT_INVALID"));
}
export function createEmptyReceizDomainReplaySegmentAccumulatorV124(): ReceizCompositeMerkleState { return createEmptyReceizCompositeMerkleState(); }
export function appendReceizDomainReplaySegmentAccumulatorV124(prior: ReceizCompositeMerkleState, segmentId: string): ReceizCompositeMerkleState { return appendReceizCompositeMerkleLeaf(prior, digest(segmentId, "V124_REPLAY_PROOF_SEGMENT_INVALID")); }

function peakForPosition(leafCount: number, leafIndex: number): Readonly<{ level: number; offset: number }> {
  let start = 0;
  for (let level = leafCount === 0 ? -1 : Math.floor(Math.log2(leafCount)); level >= 0; level -= 1) {
    if ((Math.floor(leafCount / (2 ** level)) % 2) === 0) continue;
    const width = 2 ** level;
    if (leafIndex >= start && leafIndex < start + width) return { level, offset: leafIndex - start };
    start += width;
  }
  return fail("V124_REPLAY_FIBONACCI_WITNESS_POSITION_INVALID");
}
export function verifyReceizDomainReplayFibonacciWitnessV124(input: Readonly<{ witness: unknown; accumulator: ReceizCompositeMerkleState; expectedOperationCount: number; expectedArtifactSha256: string }>): ReceizDomainReplayFibonacciWitnessV124 {
  assertReceizCompositeMerkleState(input.accumulator);
  const code = "V124_REPLAY_FIBONACCI_WITNESS_INVALID", record = closedRecord(input.witness, ["schema", "segmentPosition", "segmentId", "artifactSha256", "peakLevel", "siblings"], code);
  if (record.schema !== "receiz.domain-replay-fibonacci-witness.v124" || !Array.isArray(record.siblings)) fail(code);
  const segmentPosition = safeCount(record.segmentPosition, code), segmentId = digest(record.segmentId, code), artifactSha256 = digest(record.artifactSha256, code), peakLevel = safeCount(record.peakLevel, code);
  if (segmentPosition !== input.expectedOperationCount || segmentPosition < 1 || segmentPosition > input.accumulator.leafCount || artifactSha256 !== input.expectedArtifactSha256) fail(code);
  const peak = peakForPosition(input.accumulator.leafCount, segmentPosition - 1);
  if (peak.level !== peakLevel || record.siblings.length !== peakLevel) fail(code);
  const siblings = record.siblings.map((candidate, depth) => {
    const sibling = closedRecord(candidate, ["side", "digest"], code), expectedSide = ((peak.offset >> depth) & 1) === 0 ? "right" : "left";
    if (sibling.side !== expectedSide) fail(code);
    return freeze({ side: expectedSide as "left" | "right", digest: digest(sibling.digest, code) });
  });
  if (recoverReceizCompositeMerkleRoot(segmentId, siblings) !== input.accumulator.frontier[peakLevel]) fail("V124_REPLAY_FIBONACCI_WITNESS_ROOT_MISMATCH");
  return freeze({ schema: "receiz.domain-replay-fibonacci-witness.v124" as const, segmentPosition, segmentId, artifactSha256, peakLevel, siblings: freeze(siblings) });
}

function exactCanonicalEqual(left: unknown, right: unknown): boolean {
  try { return canonicalizeReceizV122(left) === canonicalizeReceizV122(right); } catch { return false; }
}

async function parseNamespaceProjection(value: unknown, code: string) {
  const record = closedRecord(value, ["name", "exactBytesB64u", "digest", "head"], code);
  const name = text(record.name, code);
  try {
    const normalized = normalizeReceizNamespaceNamesV123([name]);
    if (normalized.length !== 1 || normalized[0] !== name) fail(code);
  } catch { fail(code); }
  const bytes = exactBase64Url(record.exactBytesB64u, code);
  const exactDigest = digest(record.digest, code);
  if (await sha256ReceizBytes(bytes) !== exactDigest) fail(code);
  return freeze({
    name,
    exactBytesB64u: record.exactBytesB64u as string,
    digest: exactDigest,
    head: digest(record.head, code),
  });
}

function parseReceiptNamespace(value: unknown, code: string) {
  const record = closedRecord(value, ["name", "head", "digest"], code);
  const name = text(record.name, code);
  try {
    if (normalizeReceizNamespaceNamesV123([name])[0] !== name) fail(code);
  } catch { fail(code); }
  return freeze({ name, head: digest(record.head, code), digest: digest(record.digest, code) });
}

function parseProjectionAuthority(
  value: unknown,
  field: "replayIsProofAuthority" | "checkpointIsProofAuthority",
  code: string,
) {
  const record = closedRecord(value, [field, "strongerTruth"], code);
  if (record[field] !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ [field]: false, strongerTruth: "sealed-receiz-proof-object" });
}

function parseReceiptAuthority(value: unknown, code: string) {
  const record = closedRecord(value, ["receiptIsProofAuthority", "strongerTruth"], code);
  if (record.receiptIsProofAuthority !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ receiptIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

async function parseReplayReceipt(value: unknown): Promise<ReceizDomainReplayReceiptV124> {
  const code = "V124_REPLAY_RECEIPT_INVALID";
  const record = closedRecord(value, ["schema", "applicationId", "domainId", "registryDigest", "reducerDigest", "afterHead", "priorHead", "head", "afterCursor", "cursor", "namespace", "additionsDigest", "authority", "receiptDigest"], code);
  if (record.schema !== "receiz.domain.replay-receipt.v124") fail(code);
  const receipt = freeze({
    schema: "receiz.domain.replay-receipt.v124" as const,
    applicationId: applicationId(record.applicationId, code),
    domainId: domainId(record.domainId, code),
    registryDigest: digest(record.registryDigest, code),
    reducerDigest: digest(record.reducerDigest, code),
    afterHead: record.afterHead === null ? null : digest(record.afterHead, code),
    priorHead: digest(record.priorHead, code),
    head: digest(record.head, code),
    afterCursor: safeCount(record.afterCursor, code),
    cursor: safeCount(record.cursor, code),
    namespace: parseReceiptNamespace(record.namespace, code),
    additionsDigest: digest(record.additionsDigest, code),
    authority: parseReceiptAuthority(record.authority, code),
    receiptDigest: digest(record.receiptDigest, code),
  });
  const { receiptDigest, ...basis } = receipt;
  if (await digestReceizCanonicalV122(basis) !== receiptDigest) fail("V124_REPLAY_RECEIPT_UNAUTHENTICATED");
  return receipt;
}

async function replayHead(input: Readonly<Record<string, unknown>>): Promise<string> {
  return digestReceizCanonicalV122({ schema: "receiz.domain.replay-head.v124", ...input });
}

async function parseReplayProjection(input: Readonly<{
  replay: unknown;
  receipt: ReceizDomainReplayReceiptV124;
  externalCausalParents: ReadonlySet<string>;
}>): Promise<ReceizDomainReplayV124> {
  const record = closedRecord(input.replay, ["schema", "status", "applicationId", "domainId", "registryDigest", "reducerDigest", "afterHead", "afterCursor", "cursor", "priorHead", "head", "namespace", "additions", "receiptDigest", "authority"], "V124_REPLAY_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.domain.replay.v124" || record.status !== "authenticated") fail("V124_REPLAY_STATUS_INVALID");
  const app = applicationId(record.applicationId, "V124_REPLAY_APPLICATION_INVALID");
  const domain = domainId(record.domainId, "V124_REPLAY_DOMAIN_INVALID");
  const registry = digest(record.registryDigest, "V124_REPLAY_REGISTRY_DIGEST_INVALID");
  const reducer = digest(record.reducerDigest, "V124_REPLAY_REDUCER_DIGEST_INVALID");
  const afterHead = record.afterHead === null ? null : digest(record.afterHead, "V124_REPLAY_HEAD_INVALID");
  const afterCursor = safeCount(record.afterCursor, "V124_REPLAY_CURSOR_INVALID");
  const cursor = safeCount(record.cursor, "V124_REPLAY_CURSOR_INVALID");
  const priorHead = digest(record.priorHead, "V124_REPLAY_HEAD_INVALID");
  const head = digest(record.head, "V124_REPLAY_HEAD_INVALID");
  const namespace = await parseNamespaceProjection(record.namespace, "V124_REPLAY_NAMESPACE_INVALID");
  if (afterHead !== null && priorHead !== afterHead) fail("V124_REPLAY_PAGE_LINKAGE_MISMATCH");
  if (!Array.isArray(record.additions) || cursor !== afterCursor + record.additions.length) fail("V124_REPLAY_CURSOR_GAP");
  const additions: ReceizDomainReplayV124["additions"][number][] = [];
  const pageAppendIds = new Set<string>();
  let current = priorHead;
  for (let index = 0; index < record.additions.length; index += 1) {
    const item = closedRecord(record.additions[index], ["appendId", "sequence", "cursor", "exactEventBytesB64u", "eventDigest", "causalParents", "priorHead", "newHead", "namespaceHead", "namespaceDigest"], "V124_REPLAY_ADDITION_CLOSED_SHAPE_INVALID");
    const appendId = text(item.appendId, "V124_REPLAY_APPEND_ID_INVALID");
    const sequence = safeCount(item.sequence, "V124_REPLAY_SEQUENCE_INVALID");
    const itemCursor = safeCount(item.cursor, "V124_REPLAY_CURSOR_INVALID");
    if (sequence !== afterCursor + index + 1 || itemCursor !== sequence || pageAppendIds.has(appendId)) fail("V124_REPLAY_ORDERING_INVALID");
    if (!Array.isArray(item.causalParents)) fail("V124_REPLAY_CAUSAL_PARENT_INVALID");
    const causalParents = item.causalParents.map((parent) => text(parent, "V124_REPLAY_CAUSAL_PARENT_INVALID"));
    if (causalParents.some((parent, parentIndex) => parentIndex > 0 && causalParents[parentIndex - 1]!.localeCompare(parent) >= 0)
      || causalParents.some((parent) => !pageAppendIds.has(parent) && !input.externalCausalParents.has(parent))) fail("V124_REPLAY_CAUSAL_PARENT_INVALID");
    const eventBytes = exactBase64Url(item.exactEventBytesB64u, "V124_REPLAY_EVENT_BYTES_INVALID");
    const eventDigest = digest(item.eventDigest, "V124_REPLAY_EVENT_BYTES_INVALID");
    if (await sha256ReceizBytes(eventBytes) !== eventDigest) fail("V124_REPLAY_EVENT_BYTES_INVALID");
    try {
      const event = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(eventBytes));
      if (canonicalizeReceizV122(event) !== new TextDecoder().decode(eventBytes)) fail("V124_REPLAY_EVENT_BYTES_INVALID");
    } catch (error) {
      if (error instanceof TypeError && error.message === "V124_REPLAY_EVENT_BYTES_INVALID") throw error;
      fail("V124_REPLAY_EVENT_BYTES_INVALID");
    }
    const itemPriorHead = digest(item.priorHead, "V124_REPLAY_HEAD_INVALID");
    const newHead = digest(item.newHead, "V124_REPLAY_HEAD_INVALID");
    if (itemPriorHead !== current || item.namespaceHead !== namespace.head || item.namespaceDigest !== namespace.digest) fail("V124_REPLAY_HEAD_CHAIN_MISMATCH");
    if (newHead !== await replayHead({ applicationId: app, domainId: domain, registryDigest: registry, reducerDigest: reducer, priorHead: itemPriorHead, appendId, sequence, cursor: itemCursor, eventDigest, causalParents, namespace: { name: namespace.name, head: namespace.head, digest: namespace.digest } })) fail("V124_REPLAY_HEAD_DERIVATION_MISMATCH");
    additions.push(freeze({ appendId, sequence, cursor: itemCursor, exactEventBytesB64u: item.exactEventBytesB64u as string, eventDigest, causalParents: freeze(causalParents), priorHead: itemPriorHead, newHead, namespaceHead: namespace.head, namespaceDigest: namespace.digest }));
    pageAppendIds.add(appendId);
    current = newHead;
  }
  const receipt = input.receipt;
  if (current !== head
    || record.receiptDigest !== receipt.receiptDigest
    || receipt.applicationId !== app || receipt.domainId !== domain
    || receipt.registryDigest !== registry || receipt.reducerDigest !== reducer
    || receipt.afterHead !== afterHead || receipt.priorHead !== priorHead
    || receipt.head !== head || receipt.afterCursor !== afterCursor || receipt.cursor !== cursor
    || receipt.namespace.name !== namespace.name || receipt.namespace.head !== namespace.head
    || receipt.namespace.digest !== namespace.digest
    || receipt.additionsDigest !== await digestReceizCanonicalV122(additions)) fail("V124_REPLAY_RECEIPT_MISMATCH");
  return freeze({
    schema: "receiz.domain.replay.v124" as const,
    status: "authenticated" as const,
    applicationId: app,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    afterHead,
    afterCursor,
    cursor,
    priorHead,
    head,
    namespace,
    additions: freeze(additions),
    receiptDigest: receipt.receiptDigest,
    authority: parseProjectionAuthority(record.authority, "replayIsProofAuthority", "V124_REPLAY_AUTHORITY_INVALID") as ReceizDomainReplayV124["authority"],
  });
}

async function parseReceizDomainAppendCommandV124(input: Readonly<{
  value: unknown;
  addition: ReceizDomainReplayV124["additions"][number];
  replay: ReceizDomainReplayV124;
  kai: ReceizDomainReplayKaiV124;
  priorAcceptedAtKaiUPulse: number | null;
  parentHeads: ReadonlyMap<string, string>;
}>): Promise<ReceizDomainAppendCommandV124> {
  const code = "V124_REPLAY_JOURNAL_APPEND_INVALID";
  const record = closedRecord(input.value, [
    "acceptedAtKaiUPulse", "acceptedHead", "appendId", "applicationId",
    "causalAppendIds", "causalParentHeads", "conflict", "domainId",
    "eventBytesB64u", "eventDigest", "eventPosition", "expectedAbsent",
    "expectedHead", "namespace", "receipt", "reducerDigest", "registryDigest",
    "result",
  ], code);
  if (!Array.isArray(record.causalAppendIds)
    || !Array.isArray(record.causalParentHeads)) fail(code);
  const acceptedAtKaiUPulse = safeCount(record.acceptedAtKaiUPulse, code);
  if (acceptedAtKaiUPulse > input.kai.uPulse
    || (input.priorAcceptedAtKaiUPulse !== null
      && acceptedAtKaiUPulse < input.priorAcceptedAtKaiUPulse)) {
    fail("V124_REPLAY_JOURNAL_APPEND_KAI_MISMATCH");
  }
  const causalAppendIds = record.causalAppendIds.map((value) => text(value, code));
  const causalParentHeads = record.causalParentHeads.map((value) => digest(value, code));
  if (!exactCanonicalEqual(causalAppendIds, input.addition.causalParents)
    || causalParentHeads.length !== causalAppendIds.length
    || causalAppendIds.some((appendId, index) =>
      input.parentHeads.get(appendId) !== causalParentHeads[index])) {
    fail("V124_REPLAY_JOURNAL_APPEND_CAUSAL_MISMATCH");
  }
  const namespace = await parseNamespaceProjection(
    record.namespace,
    "V124_REPLAY_JOURNAL_APPEND_NAMESPACE_INVALID",
  );
  if (!exactCanonicalEqual(namespace, input.replay.namespace)) {
    fail("V124_REPLAY_JOURNAL_APPEND_NAMESPACE_MISMATCH");
  }

  const receiptRecord = closedRecord(record.receipt, [
    "schema", "applicationId", "domainId", "appendId", "sequence", "priorHead",
    "newHead", "eventDigest", "namespace", "authority", "receiptDigest",
  ], "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID");
  const receiptAuthority = closedRecord(receiptRecord.authority, [
    "journalIsProofAuthority", "strongerTruth",
  ], "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID");
  if (receiptRecord.schema !== "receiz.domain.append-receipt.v124"
    || receiptAuthority.journalIsProofAuthority !== false
    || receiptAuthority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID");
  }
  const receiptBasis = freeze({
    schema: "receiz.domain.append-receipt.v124" as const,
    applicationId: applicationId(receiptRecord.applicationId, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    domainId: domainId(receiptRecord.domainId, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    appendId: text(receiptRecord.appendId, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    sequence: safeCount(receiptRecord.sequence, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    priorHead: digest(receiptRecord.priorHead, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    newHead: digest(receiptRecord.newHead, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    eventDigest: digest(receiptRecord.eventDigest, "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID"),
    namespace: parseReceiptNamespace(
      receiptRecord.namespace,
      "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID",
    ),
    authority: freeze({
      journalIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const receiptDigest = digest(
    receiptRecord.receiptDigest,
    "V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID",
  );
  if (await digestReceizCanonicalV122(receiptBasis) !== receiptDigest) {
    fail("V124_REPLAY_JOURNAL_APPEND_RECEIPT_INVALID");
  }
  const receipt: ReceizDomainAppendReceiptV124 = freeze({
    ...receiptBasis,
    receiptDigest,
  });

  const resultRecord = closedRecord(record.result, [
    "schema", "ok", "applicationId", "domainId", "appendId", "sequence", "head",
    "receiptDigest",
  ], "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID");
  if (resultRecord.schema !== "receiz.domain.append-result.v124"
    || resultRecord.ok !== true) fail("V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID");
  const result: ReceizDomainAppendResultV124 = freeze({
    schema: "receiz.domain.append-result.v124" as const,
    ok: true as const,
    applicationId: applicationId(resultRecord.applicationId, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
    domainId: domainId(resultRecord.domainId, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
    appendId: text(resultRecord.appendId, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
    sequence: safeCount(resultRecord.sequence, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
    head: digest(resultRecord.head, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
    receiptDigest: digest(resultRecord.receiptDigest, "V124_REPLAY_JOURNAL_APPEND_RESULT_INVALID"),
  });

  const conflictRecord = closedRecord(record.conflict, [
    "schema", "ok", "applicationId", "domainId", "appendId", "expectedHead",
    "reasonCode", "writes",
  ], "V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID");
  if (conflictRecord.schema !== "receiz.domain.append-conflict.v124"
    || conflictRecord.ok !== false || conflictRecord.reasonCode !== "STALE_HEAD"
    || conflictRecord.writes !== 0) fail("V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID");
  const conflict: ReceizDomainAppendConflictV124 = freeze({
    schema: "receiz.domain.append-conflict.v124" as const,
    ok: false as const,
    applicationId: applicationId(conflictRecord.applicationId, "V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID"),
    domainId: domainId(conflictRecord.domainId, "V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID"),
    appendId: text(conflictRecord.appendId, "V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID"),
    expectedHead: digest(conflictRecord.expectedHead, "V124_REPLAY_JOURNAL_APPEND_CONFLICT_INVALID"),
    reasonCode: "STALE_HEAD" as const,
    writes: 0 as const,
  });

  const addition = input.addition;
  const application = applicationId(record.applicationId, code);
  const domain = domainId(record.domainId, code);
  const appendId = text(record.appendId, code);
  const acceptedHead = digest(record.acceptedHead, code);
  const expectedHead = digest(record.expectedHead, code);
  const eventDigest = digest(record.eventDigest, code);
  const eventPosition = safeCount(record.eventPosition, code);
  const registryDigest = digest(record.registryDigest, code);
  const reducerDigest = digest(record.reducerDigest, code);
  const eventBytes = exactBase64Url(record.eventBytesB64u, code);
  const expectedAbsent = record.expectedAbsent;
  if (typeof expectedAbsent !== "boolean"
    || application !== input.replay.applicationId || domain !== input.replay.domainId
    || appendId !== addition.appendId || acceptedHead !== addition.newHead
    || expectedHead !== addition.priorHead || eventDigest !== addition.eventDigest
    || eventPosition !== addition.sequence || eventPosition !== addition.cursor
    || registryDigest !== input.replay.registryDigest
    || reducerDigest !== input.replay.reducerDigest
    || record.eventBytesB64u !== addition.exactEventBytesB64u
    || receizBase64UrlEncode(eventBytes) !== addition.exactEventBytesB64u
    || expectedAbsent !== (addition.sequence === 1)
    || receipt.applicationId !== application || receipt.domainId !== domain
    || receipt.appendId !== appendId || receipt.sequence !== eventPosition
    || receipt.priorHead !== expectedHead || receipt.newHead !== acceptedHead
    || receipt.eventDigest !== eventDigest
    || !exactCanonicalEqual(receipt.namespace, {
      name: namespace.name,
      head: namespace.head,
      digest: namespace.digest,
    })
    || result.applicationId !== application || result.domainId !== domain
    || result.appendId !== appendId || result.sequence !== eventPosition
    || result.head !== acceptedHead || result.receiptDigest !== receipt.receiptDigest
    || conflict.applicationId !== application || conflict.domainId !== domain
    || conflict.appendId !== appendId || conflict.expectedHead !== expectedHead) {
    fail("V124_REPLAY_JOURNAL_APPEND_BINDING_MISMATCH");
  }
  return freeze({
    acceptedAtKaiUPulse,
    acceptedHead,
    appendId,
    applicationId: application,
    causalAppendIds: freeze(causalAppendIds),
    causalParentHeads: freeze(causalParentHeads),
    conflict,
    domainId: domain,
    eventBytesB64u: record.eventBytesB64u as string,
    eventDigest,
    eventPosition,
    expectedAbsent,
    expectedHead,
    namespace,
    receipt,
    reducerDigest,
    registryDigest,
    result,
  });
}

async function parseReceizDomainAppendCommandsV124(input: Readonly<{
  values: readonly unknown[];
  replay: ReceizDomainReplayV124;
  kai: ReceizDomainReplayKaiV124;
  causalParentWitnesses: readonly ReceizDomainReplayAppendIndexWitnessV124[];
}>): Promise<readonly ReceizDomainAppendCommandV124[]> {
  if (input.values.length !== input.replay.additions.length) {
    fail("V124_REPLAY_JOURNAL_APPEND_COUNT_MISMATCH");
  }
  const parentHeads = new Map<string, string>();
  for (const witness of input.causalParentWitnesses) {
    if (witness.value !== null) {
      parentHeads.set(witness.appendId, witness.value.newHead);
    }
  }
  const commands: ReceizDomainAppendCommandV124[] = [];
  let priorAcceptedAtKaiUPulse: number | null = null;
  for (let index = 0; index < input.replay.additions.length; index += 1) {
    const addition = input.replay.additions[index]!;
    const command = await parseReceizDomainAppendCommandV124({
      value: input.values[index],
      addition,
      replay: input.replay,
      kai: input.kai,
      priorAcceptedAtKaiUPulse,
      parentHeads,
    });
    commands.push(command);
    priorAcceptedAtKaiUPulse = command.acceptedAtKaiUPulse;
    parentHeads.set(addition.appendId, addition.newHead);
  }
  return freeze(commands);
}

/**
 * Purely derives the exact durable-journal commands for one replay segment.
 * The result is coordination data and acquires no custody until it is carried
 * by a pinned-admitted sealed segment proof object.
 */
export async function createReceizDomainAppendCommandsV124(
  input: ReceizDomainAppendCommandsInputV124,
): Promise<readonly ReceizDomainAppendCommandV124[]> {
  const code = "V124_REPLAY_JOURNAL_COMMAND_BUILDER_INPUT_INVALID";
  const record = closedRecord(input, [
    "replay", "replayReceipt", "kai", "acceptedAtKaiUPulses",
    "externalCausalParentHeads",
  ], code);
  if (!Array.isArray(record.acceptedAtKaiUPulses)
    || !Array.isArray(record.externalCausalParentHeads)) fail(code);
  let replayValue: unknown;
  let replayReceiptValue: unknown;
  try {
    replayValue = JSON.parse(canonicalizeReceizV122(record.replay));
    replayReceiptValue = JSON.parse(canonicalizeReceizV122(record.replayReceipt));
  } catch {
    return fail(code);
  }
  const acceptedAtKaiUPulses = record.acceptedAtKaiUPulses.map((value) =>
    safeCount(value, code));
  const externalCausalParentHeads = record.externalCausalParentHeads.map((value) => {
    const pair = closedRecord(value, ["appendId", "head"], code);
    return freeze({
      appendId: text(pair.appendId, code),
      head: digest(pair.head, code),
    });
  });
  if (new Set(externalCausalParentHeads.map((pair) => pair.appendId)).size
    !== externalCausalParentHeads.length) fail(code);
  const externalParentIds = new Set(
    externalCausalParentHeads.map((pair) => pair.appendId),
  );
  const replayReceipt = await parseReplayReceipt(replayReceiptValue);
  const replay = await parseReplayProjection({
    replay: replayValue,
    receipt: replayReceipt,
    externalCausalParents: externalParentIds,
  });
  if (acceptedAtKaiUPulses.length !== replay.additions.length) {
    fail("V124_REPLAY_JOURNAL_APPEND_COUNT_MISMATCH");
  }
  const requiredExternalParents = new Set<string>();
  const pageAppendIds = new Set<string>();
  for (const addition of replay.additions) {
    for (const parent of addition.causalParents) {
      if (!pageAppendIds.has(parent)) requiredExternalParents.add(parent);
    }
    pageAppendIds.add(addition.appendId);
  }
  if (requiredExternalParents.size !== externalParentIds.size
    || [...externalParentIds].some((appendId) =>
      !requiredExternalParents.has(appendId))) {
    fail("V124_REPLAY_JOURNAL_APPEND_CAUSAL_MISMATCH");
  }
  const kai = parseReceizDomainReplayKaiV124(record.kai);
  const parentHeads = new Map(
    externalCausalParentHeads.map((pair) => [pair.appendId, pair.head] as const),
  );
  const commands: ReceizDomainAppendCommandV124[] = [];
  let priorAcceptedAtKaiUPulse: number | null = null;
  for (let index = 0; index < replay.additions.length; index += 1) {
    const addition = replay.additions[index]!;
    const causalParentHeads = addition.causalParents.map((appendId) => {
      const parentHead = parentHeads.get(appendId);
      if (parentHead === undefined) {
        return fail("V124_REPLAY_JOURNAL_APPEND_CAUSAL_MISMATCH");
      }
      return parentHead;
    });
    const receiptBasis = freeze({
      schema: "receiz.domain.append-receipt.v124" as const,
      applicationId: replay.applicationId,
      domainId: replay.domainId,
      appendId: addition.appendId,
      sequence: addition.sequence,
      priorHead: addition.priorHead,
      newHead: addition.newHead,
      eventDigest: addition.eventDigest,
      namespace: freeze({
        name: replay.namespace.name,
        head: replay.namespace.head,
        digest: replay.namespace.digest,
      }),
      authority: freeze({
        journalIsProofAuthority: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    });
    const receipt = freeze({
      ...receiptBasis,
      receiptDigest: await digestReceizCanonicalV122(receiptBasis),
    });
    const rawCommand = freeze({
      acceptedAtKaiUPulse: acceptedAtKaiUPulses[index],
      acceptedHead: addition.newHead,
      appendId: addition.appendId,
      applicationId: replay.applicationId,
      causalAppendIds: addition.causalParents,
      causalParentHeads: freeze(causalParentHeads),
      conflict: freeze({
        schema: "receiz.domain.append-conflict.v124" as const,
        ok: false as const,
        applicationId: replay.applicationId,
        domainId: replay.domainId,
        appendId: addition.appendId,
        expectedHead: addition.priorHead,
        reasonCode: "STALE_HEAD" as const,
        writes: 0 as const,
      }),
      domainId: replay.domainId,
      eventBytesB64u: addition.exactEventBytesB64u,
      eventDigest: addition.eventDigest,
      eventPosition: addition.sequence,
      expectedAbsent: addition.sequence === 1,
      expectedHead: addition.priorHead,
      namespace: replay.namespace,
      receipt,
      reducerDigest: replay.reducerDigest,
      registryDigest: replay.registryDigest,
      result: freeze({
        schema: "receiz.domain.append-result.v124" as const,
        ok: true as const,
        applicationId: replay.applicationId,
        domainId: replay.domainId,
        appendId: addition.appendId,
        sequence: addition.sequence,
        head: addition.newHead,
        receiptDigest: receipt.receiptDigest,
      }),
    });
    const command = await parseReceizDomainAppendCommandV124({
      value: rawCommand,
      addition,
      replay,
      kai,
      priorAcceptedAtKaiUPulse,
      parentHeads,
    });
    commands.push(command);
    priorAcceptedAtKaiUPulse = command.acceptedAtKaiUPulse;
    parentHeads.set(addition.appendId, addition.newHead);
  }
  return freeze(commands);
}

async function parseCheckpointReceipt(value: unknown): Promise<ReceizCheckpointReceiptV124> {
  const code = "V124_CHECKPOINT_RECEIPT_INVALID";
  const record = closedRecord(value, ["schema", "applicationId", "domainId", "registryDigest", "reducerDigest", "throughHead", "cursor", "namespace", "checkpointDigest", "authority", "receiptDigest"], code);
  if (record.schema !== "receiz.domain.checkpoint-receipt.v124") fail(code);
  const receipt = freeze({
    schema: "receiz.domain.checkpoint-receipt.v124" as const,
    applicationId: applicationId(record.applicationId, code),
    domainId: domainId(record.domainId, code),
    registryDigest: digest(record.registryDigest, code),
    reducerDigest: digest(record.reducerDigest, code),
    throughHead: digest(record.throughHead, code),
    cursor: safeCount(record.cursor, code),
    namespace: parseReceiptNamespace(record.namespace, code),
    checkpointDigest: digest(record.checkpointDigest, code),
    authority: parseReceiptAuthority(record.authority, code),
    receiptDigest: digest(record.receiptDigest, code),
  });
  const { receiptDigest, ...basis } = receipt;
  if (await digestReceizCanonicalV122(basis) !== receiptDigest) fail("V124_CHECKPOINT_RECEIPT_UNAUTHENTICATED");
  return receipt;
}

async function parseCheckpointProjection(value: unknown, receipt: ReceizCheckpointReceiptV124): Promise<ReceizCheckpointV124> {
  const record = closedRecord(value, ["schema", "status", "applicationId", "domainId", "registryDigest", "reducerDigest", "throughHead", "cursor", "namespace", "exactCheckpointBytesB64u", "checkpointDigest", "receiptDigest", "authority"], "V124_CHECKPOINT_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.domain.checkpoint.v124" || record.status !== "authenticated") fail("V124_CHECKPOINT_STATUS_INVALID");
  const app = applicationId(record.applicationId, "V124_CHECKPOINT_APPLICATION_INVALID");
  const domain = domainId(record.domainId, "V124_CHECKPOINT_DOMAIN_INVALID");
  const registry = digest(record.registryDigest, "V124_CHECKPOINT_REGISTRY_DIGEST_INVALID");
  const reducer = digest(record.reducerDigest, "V124_CHECKPOINT_REDUCER_DIGEST_INVALID");
  const throughHead = digest(record.throughHead, "V124_CHECKPOINT_HEAD_INVALID");
  const cursor = safeCount(record.cursor, "V124_CHECKPOINT_CURSOR_INVALID");
  const namespace = await parseNamespaceProjection(record.namespace, "V124_CHECKPOINT_NAMESPACE_INVALID");
  const checkpointBytes = exactBase64Url(record.exactCheckpointBytesB64u, "V124_CHECKPOINT_BYTES_INVALID");
  const checkpointDigest = digest(record.checkpointDigest, "V124_CHECKPOINT_BYTES_INVALID");
  if (await sha256ReceizBytes(checkpointBytes) !== checkpointDigest) fail("V124_CHECKPOINT_BYTES_INVALID");
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(checkpointBytes));
    if (canonicalizeReceizV122(payload) !== new TextDecoder().decode(checkpointBytes)) fail("V124_CHECKPOINT_BYTES_INVALID");
  } catch (error) {
    if (error instanceof TypeError && error.message === "V124_CHECKPOINT_BYTES_INVALID") throw error;
    return fail("V124_CHECKPOINT_BYTES_INVALID");
  }
  const payloadRecord = closedRecord(payload, ["schema", "applicationId", "domainId", "registryDigest", "reducerDigest", "throughHead", "cursor", "namespace"], "V124_CHECKPOINT_PAYLOAD_INVALID");
  const payloadNamespace = await parseNamespaceProjection(payloadRecord.namespace, "V124_CHECKPOINT_PAYLOAD_MISMATCH");
  if (payloadRecord.schema !== "receiz.domain.checkpoint.payload.v124"
    || payloadRecord.applicationId !== app || payloadRecord.domainId !== domain
    || payloadRecord.registryDigest !== registry || payloadRecord.reducerDigest !== reducer
    || payloadRecord.throughHead !== throughHead || payloadRecord.cursor !== cursor
    || !exactCanonicalEqual(payloadNamespace, namespace)) fail("V124_CHECKPOINT_PAYLOAD_MISMATCH");
  if (record.receiptDigest !== receipt.receiptDigest || receipt.applicationId !== app
    || receipt.domainId !== domain || receipt.registryDigest !== registry
    || receipt.reducerDigest !== reducer || receipt.throughHead !== throughHead
    || receipt.cursor !== cursor || receipt.namespace.name !== namespace.name
    || receipt.namespace.head !== namespace.head || receipt.namespace.digest !== namespace.digest
    || receipt.checkpointDigest !== checkpointDigest) fail("V124_CHECKPOINT_RECEIPT_MISMATCH");
  return freeze({
    schema: "receiz.domain.checkpoint.v124" as const,
    status: "authenticated" as const,
    applicationId: app,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    throughHead,
    cursor,
    namespace,
    exactCheckpointBytesB64u: record.exactCheckpointBytesB64u as string,
    checkpointDigest,
    receiptDigest: receipt.receiptDigest,
    authority: parseProjectionAuthority(record.authority, "checkpointIsProofAuthority", "V124_CHECKPOINT_AUTHORITY_INVALID") as ReceizCheckpointV124["authority"],
  });
}

export function parseReceizPortableReplaySourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124 {
  const code = "V124_REPLAY_PROOF_ARTIFACT_INVALID", record = closedRecord(value, ["schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256"], code);
  if (record.schema !== "receiz.sealed-artifact-bytes.v124") fail(code);
  const bytes = exactBase64Url(record.exactBytesB64u, code); if (bytes.byteLength === 0 || receizBase64UrlEncode(bytes) !== record.exactBytesB64u) fail(code);
  return freeze({ schema: "receiz.sealed-artifact-bytes.v124" as const, exactBytesB64u: record.exactBytesB64u as string, filename: text(record.filename, code), mimeType: text(record.mimeType, code), artifactSha256: digest(record.artifactSha256, code), payloadSha256: digest(record.payloadSha256, code) });
}

/** Pinned source opening; no caller roots, admissions, issuer, clock, or booleans. */
export async function verifyAndReadReceizDomainReplayProofObjectV124(value: unknown): Promise<Readonly<{ carrier: unknown; artifactSha256: string; artifactKaiPulse: number; artifact: ReceizPortableSealedArtifactV124; ownership: ReceizPortableAssetDocument["ownership"]; provenance: ReceizPortableAssetDocument["provenance"] }>> {
  const artifact = parseReceizPortableReplaySourceArtifactV124(value), bytes = receizBase64UrlDecode(artifact.exactBytesB64u), file = new File([strictArrayBuffer(bytes)], artifact.filename, { type: artifact.mimeType });
  const verification = await verifyReceizArtifact(file);
  if (verification.status !== "verified-artifact" || verification.artifactDigest.value !== artifact.artifactSha256 || verification.payloadDigest.value !== artifact.payloadSha256) fail("V124_REPLAY_PROOF_ARTIFACT_UNVERIFIED");
  const pulseValue = verification.verification.bundle.kaiPulseEternal;
  if ((typeof pulseValue !== "string" && typeof pulseValue !== "number") || !UINT_RE.test(String(pulseValue)) || !Number.isSafeInteger(Number(pulseValue))) fail("V124_REPLAY_PROOF_ARTIFACT_KAI_INVALID");
  const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" });
  if (admission.profile !== "portable-state" || admission.verdict !== "bearer-recovery") fail("V124_REPLAY_PROOF_ARTIFACT_UNADMITTED");
  const verified = await verifyReceizArtifactAdmission(admission);
  if ("code" in verified || verified.profile !== "portable-state" || verified.verdict !== "bearer-recovery" || verified.authority.admissionIsProofAuthority !== false || verified.authority.strongerTruth !== "sealed-receiz-proof-object") fail("V124_REPLAY_PROOF_ARTIFACT_UNADMITTED");
  let portable: ReceizPortableAssetDocument;
  try { portable = await parseReceizPortableAssetDocument(verified.recoveredState); } catch { return fail("V124_REPLAY_PROOF_ARTIFACT_UNADMITTED"); }
  if (portable.assetType !== "proof_object" || portable.payload.mimeType !== RECEIZ_V124_DOMAIN_REPLAY_PROOF_CARRIER_MIME) fail("V124_REPLAY_PROOF_CARRIER_MIME_INVALID");
  const payload = receizBase64UrlDecode(portable.payload.bytesBase64Url);
  let carrier: unknown;
  try {
    carrier = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload));
    const canonical = new TextEncoder().encode(canonicalizeReceizV122(carrier));
    if (canonical.byteLength !== payload.byteLength || canonical.some((byte, index) => byte !== payload[index])) fail("V124_REPLAY_PROOF_CARRIER_BYTES_NONCANONICAL");
  } catch (error) {
    if (error instanceof TypeError && error.message === "V124_REPLAY_PROOF_CARRIER_BYTES_NONCANONICAL") throw error;
    return fail("V124_REPLAY_PROOF_CARRIER_BYTES_INVALID");
  }
  return freeze({ carrier, artifactSha256: verified.artifactSha256, artifactKaiPulse: Number(pulseValue), artifact, ownership: portable.ownership, provenance: portable.provenance });
}

function parseSegmentCarrierAuthority(value: unknown) {
  const code = "V124_REPLAY_PROOF_CARRIER_AUTHORITY_INVALID";
  const record = closedRecord(value, ["carrierIsProofAuthority", "projectionIsProofAuthority", "strongerTruth"], code);
  if (record.carrierIsProofAuthority !== false || record.projectionIsProofAuthority !== false
    || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ carrierIsProofAuthority: false as const, projectionIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

function parseSegmentChildAuthority(value: unknown) {
  const code = "V124_REPLAY_PROOF_SEGMENT_AUTHORITY_INVALID";
  const record = closedRecord(value, ["segmentIsProofAuthority", "witnessIsProofAuthority", "strongerTruth"], code);
  if (record.segmentIsProofAuthority !== false || record.witnessIsProofAuthority !== false
    || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ segmentIsProofAuthority: false as const, witnessIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

function parseCheckpointCarrierAuthority(value: unknown) {
  const code = "V124_CHECKPOINT_SOURCE_AUTHORITY_INVALID";
  const record = closedRecord(value, ["carrierIsProofAuthority", "checkpointIsProofAuthority", "strongerTruth"], code);
  if (record.carrierIsProofAuthority !== false || record.checkpointIsProofAuthority !== false
    || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ carrierIsProofAuthority: false as const, checkpointIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

function parseSourceExpectation(value: ReceizDomainReplaySegmentSourceExpectationV124) {
  const optional = [
    ...(Object.prototype.hasOwnProperty.call(value, "domainId") ? ["domainId"] : []),
    ...(Object.prototype.hasOwnProperty.call(value, "expectedRegistryDigest") ? ["expectedRegistryDigest"] : []),
    ...(Object.prototype.hasOwnProperty.call(value, "expectedReducerDigest") ? ["expectedReducerDigest"] : []),
    ...(Object.prototype.hasOwnProperty.call(value, "afterHead") ? ["afterHead"] : []),
    ...(Object.prototype.hasOwnProperty.call(value, "afterCursor") ? ["afterCursor"] : []),
  ];
  const record = closedRecord(value, ["applicationId", "audience", ...optional], "V124_REPLAY_SOURCE_EXPECTATION_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    audience: text(record.audience, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    domainId: record.domainId === undefined ? undefined : domainId(record.domainId, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    expectedRegistryDigest: record.expectedRegistryDigest === undefined ? undefined : digest(record.expectedRegistryDigest, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    expectedReducerDigest: record.expectedReducerDigest === undefined ? undefined : digest(record.expectedReducerDigest, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    afterHead: record.afterHead === undefined ? undefined : record.afterHead === null ? null : digest(record.afterHead, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
    afterCursor: record.afterCursor === undefined ? undefined : safeCount(record.afterCursor, "V124_REPLAY_SOURCE_EXPECTATION_INVALID"),
  });
}

function sameHeadCoordinates(left: ReceizDomainReplayProofHeadV124, right: ReceizDomainReplayProofHeadV124): boolean {
  return left.headDigest === right.headDigest && exactCanonicalEqual(left, right);
}

function parseSegmentChildBytes(segment: ReceizDomainReplayProofSegmentCommitmentV124): unknown {
  const bytes = receizBase64UrlDecode(segment.exactSegmentBytesB64u);
  try {
    const child = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (canonicalizeReceizV122(child) !== new TextDecoder().decode(bytes)) fail("V124_REPLAY_PROOF_SEGMENT_BYTES_NONCANONICAL");
    return child;
  } catch (error) {
    if (error instanceof TypeError && error.message === "V124_REPLAY_PROOF_SEGMENT_BYTES_NONCANONICAL") throw error;
    return fail("V124_REPLAY_PROOF_SEGMENT_BYTES_INVALID");
  }
}

type ReceizPinnedDomainReplaySegmentHeadV124 = Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  artifactSha256: string;
  artifactKaiPulse: number;
  head: ReceizDomainReplayProofHeadV124;
  sourceAuthority: ReceizDomainReplaySourceAuthorityV124;
  replay: ReceizDomainReplayV124;
}>;

const verifiedSegmentSourcesByArtifactSha256 = new Map<
  string,
  WeakRef<ReceizReadDomainReplaySegmentSourceV124>
>();
const verifiedSegmentSourceFinalizer = new FinalizationRegistry<string>((artifactSha256) => {
  if (verifiedSegmentSourcesByArtifactSha256.get(artifactSha256)?.deref() === undefined) {
    verifiedSegmentSourcesByArtifactSha256.delete(artifactSha256);
  }
});

function rememberVerifiedSegmentSource(
  source: ReceizReadDomainReplaySegmentSourceV124,
): void {
  verifiedSegmentSourcesByArtifactSha256.set(
    source.artifactSha256,
    new WeakRef(source),
  );
  verifiedSegmentSourceFinalizer.register(source, source.artifactSha256);
}

function readRememberedVerifiedSegmentSource(
  artifactSha256: string,
): ReceizReadDomainReplaySegmentSourceV124 | undefined {
  const source = verifiedSegmentSourcesByArtifactSha256.get(artifactSha256)?.deref();
  if (source === undefined) verifiedSegmentSourcesByArtifactSha256.delete(artifactSha256);
  return source;
}

/**
 * Opens one exact sealed segment as a bounded head source. This deliberately
 * does not recurse into that segment's predecessor; the caller must supply the
 * one exact predecessor artifact required by the segment being fully read.
 */
async function openReceizPinnedDomainReplaySegmentHeadV124(
  value: unknown,
  expected?: ReceizDomainReplaySegmentSourceExpectationV124,
): Promise<ReceizPinnedDomainReplaySegmentHeadV124> {
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(value);
  const carrier = closedRecord(opened.carrier, [
    "schema", "proofObjectId", "applicationId", "domainId", "registryDigest",
    "reducerDigest", "predecessor", "segment", "fibonacciWitnesses", "head",
    "authority",
  ], "V124_REPLAY_PROOF_PREDECESSOR_INVALID");
  if (carrier.schema !== "receiz.domain-replay-segment-proof.v124"
    || !Array.isArray(carrier.fibonacciWitnesses)) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_INVALID");
  }
  parseSegmentCarrierAuthority(carrier.authority);
  const application = applicationId(
    carrier.applicationId,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const domain = domainId(
    carrier.domainId,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const registry = digest(
    carrier.registryDigest,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const reducer = digest(
    carrier.reducerDigest,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const proofObjectId = digest(
    carrier.proofObjectId,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const head = parseReceizDomainReplayProofHeadV124(carrier.head);
  const segment = parseReceizDomainReplaySegmentCommitmentV124(carrier.segment);
  const childValue = parseSegmentChildBytes(segment);
  if (!childValue || typeof childValue !== "object" || Array.isArray(childValue)
    || !Object.prototype.hasOwnProperty.call(childValue, "authoringEvidence")) {
    fail("V124_REPLAY_SOURCE_AUTHORING_EVIDENCE_REQUIRED");
  }
  const child = closedRecord(childValue, [
    "schema", "proofObjectId", "segmentIndex", "kai", "sourceAuthority",
    "authoringEvidence", "replay", "replayReceipt", "journalAppends",
    "insertionWitnesses", "causalParentWitnesses", "authority",
  ], "V124_REPLAY_PROOF_PREDECESSOR_INVALID");
  if (child.schema !== "receiz.domain-replay-page-segment.v124"
    || !Array.isArray(child.journalAppends)
    || !Array.isArray(child.insertionWitnesses)
    || !Array.isArray(child.causalParentWitnesses)) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_INVALID");
  }
  parseSegmentChildAuthority(child.authority);
  const childKai = parseReceizDomainReplayKaiV124(
    child.kai,
    "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
  );
  const causalWitnesses = child.causalParentWitnesses.map(
    parseReceizDomainReplayAppendIndexWitnessV124,
  );
  const replayReceipt = await parseReplayReceipt(child.replayReceipt);
  const replay = await parseReplayProjection({
    replay: child.replay,
    receipt: replayReceipt,
    externalCausalParents: new Set(
      causalWitnesses.map((witness) => witness.appendId),
    ),
  });
  const sourceAuthority = await parseReceizDomainReplaySourceAuthorityV124(
    child.sourceAuthority,
    opened,
  );
  const journalAppends = await parseReceizDomainAppendCommandsV124({
    values: child.journalAppends,
    replay,
    kai: childKai,
    causalParentWitnesses: causalWitnesses,
  });
  const predecessorArtifactSha256 = carrier.predecessor === null
    ? null
    : digest(
      closedRecord(carrier.predecessor, ["artifactSha256", "head"],
        "V124_REPLAY_PROOF_PREDECESSOR_INVALID").artifactSha256,
      "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
    );
  const sourceIntent = await createReceizDomainReplaySourceIntentV124({
    applicationId: application,
    audience: sourceAuthority.audience,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    acceptedHead: replay.head,
    sourceKai: childKai,
    predecessorArtifactSha256,
    replay,
    replayReceipt,
    journalAppends,
    causalParentWitnesses: causalWitnesses,
    sourceAuthority,
    ownership: opened.ownership,
    provenance: opened.provenance,
  });
  await parseReceizDomainReplaySourceAuthoringEvidenceV124(
    child.authoringEvidence,
    sourceIntent,
  );
  const segmentBytes = receizBase64UrlDecode(segment.exactSegmentBytesB64u);
  const eventTree = buildReceizCompositeBoundedTree(
    replay.additions.map((addition) =>
      deriveReceizDomainReplaySegmentEventLeafV124(addition)),
  );
  if (await sha256ReceizBytes(segmentBytes) !== segment.segmentBytesDigest
    || segment.segmentId !== deriveReceizDomainReplaySegmentIdV124({
      proofObjectId,
      segmentIndex: segment.segmentIndex,
      startCursor: segment.startCursor,
      endCursor: segment.endCursor,
      additionCount: segment.additionCount,
      eventRoot: segment.eventRoot,
      segmentBytesDigest: segment.segmentBytesDigest,
    })
    || eventTree.root !== segment.eventRoot
    || replay.additions.length !== segment.additionCount
    || replay.afterCursor !== segment.startCursor
    || replay.cursor !== segment.endCursor
    || child.proofObjectId !== proofObjectId
    || child.segmentIndex !== segment.segmentIndex
    || !exactCanonicalEqual(head.currentSegment, {
      segmentIndex: segment.segmentIndex,
      startCursor: segment.startCursor,
      endCursor: segment.endCursor,
      additionCount: segment.additionCount,
      eventRoot: segment.eventRoot,
      segmentBytesDigest: segment.segmentBytesDigest,
      segmentId: segment.segmentId,
    })
    || head.proofObjectId !== proofObjectId
    || head.applicationId !== application
    || head.domainId !== domain
    || head.registryDigest !== registry
    || head.reducerDigest !== reducer
    || head.head !== replay.head
    || head.cursor !== replay.cursor
    || !exactCanonicalEqual(head.namespace, {
      name: replay.namespace.name,
      head: replay.namespace.head,
      digest: replay.namespace.digest,
    })
    || head.kai.pulse !== opened.artifactKaiPulse
    || childKai.pulse !== opened.artifactKaiPulse
    || head.kai.uPulse !== childKai.uPulse
    || sourceAuthority.applicationId !== application
    || sourceAuthority.domainId !== domain
    || sourceAuthority.acceptedHead !== replay.head) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
  }
  if (expected !== undefined) {
    const parsedExpected = parseSourceExpectation(expected);
    if (application !== parsedExpected.applicationId
      || sourceAuthority.audience !== parsedExpected.audience
      || (parsedExpected.domainId !== undefined && domain !== parsedExpected.domainId)
      || (parsedExpected.expectedRegistryDigest !== undefined
        && registry !== parsedExpected.expectedRegistryDigest)
      || (parsedExpected.expectedReducerDigest !== undefined
        && reducer !== parsedExpected.expectedReducerDigest)) {
      fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
    }
  }
  return freeze({
    artifact: opened.artifact,
    artifactSha256: opened.artifactSha256,
    artifactKaiPulse: opened.artifactKaiPulse,
    head,
    sourceAuthority,
    replay,
  });
}

/**
 * Pinned, stateless lookup inspection for loading the exact predecessor bytes.
 * The returned digest is only a coordinate; full admission still requires the
 * exact predecessor artifact to be supplied to the segment reader.
 */
export async function inspectReceizDomainReplaySegmentSourceCoordinateV124(
  artifact: ReceizPortableSealedArtifactV124,
): Promise<ReceizDomainReplaySegmentSourceCoordinateV124> {
  const opened = await openReceizPinnedDomainReplaySegmentHeadV124(artifact);
  const carrier = (await verifyAndReadReceizDomainReplayProofObjectV124(
    artifact,
  )).carrier;
  const record = closedRecord(carrier, [
    "schema", "proofObjectId", "applicationId", "domainId", "registryDigest",
    "reducerDigest", "predecessor", "segment", "fibonacciWitnesses", "head",
    "authority",
  ], "V124_REPLAY_PROOF_SEGMENT_CARRIER_INVALID");
  let predecessorArtifactSha256: string | null = null;
  if (record.predecessor !== null) {
    const predecessor = closedRecord(record.predecessor, [
      "artifactSha256", "head",
    ], "V124_REPLAY_PROOF_PREDECESSOR_INVALID");
    predecessorArtifactSha256 = digest(
      predecessor.artifactSha256,
      "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
    );
    const representedHead = parseReceizDomainReplayProofHeadV124(predecessor.head);
    if (predecessorArtifactSha256 !== opened.head.priorSourceArtifactSha256
      || representedHead.proofObjectId !== opened.head.proofObjectId
      || representedHead.applicationId !== opened.head.applicationId
      || representedHead.domainId !== opened.head.domainId
      || representedHead.registryDigest !== opened.head.registryDigest
      || representedHead.reducerDigest !== opened.head.reducerDigest
      || representedHead.segmentCount + 1 !== opened.head.segmentCount
      || representedHead.head !== opened.replay.afterHead
      || representedHead.cursor !== opened.replay.afterCursor
      || representedHead.currentSourceSegmentDigest
        !== opened.head.priorSourceSegmentDigest) {
      fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
    }
  } else if (opened.head.priorSourceArtifactSha256 !== null
    || opened.head.priorSourceSegmentDigest !== null
    || opened.head.segmentCount !== 1) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
  }
  return freeze({
    schema: "receiz.domain-replay-segment-source-coordinate.v124" as const,
    artifactSha256: opened.artifactSha256,
    predecessorArtifactSha256,
    proofObjectId: opened.head.proofObjectId,
    applicationId: opened.head.applicationId,
    domainId: opened.head.domainId,
    registryDigest: opened.head.registryDigest,
    reducerDigest: opened.head.reducerDigest,
    head: opened.head.head,
    headDigest: opened.head.headDigest,
    authority: freeze({
      coordinateIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/** Pinned verification and full reconstruction of one immutable replay segment. */
export async function readReceizDomainReplaySegmentSourceV124(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  predecessorArtifact?: ReceizPortableSealedArtifactV124;
  expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizReadDomainReplaySegmentSourceV124> {
  const keys = Object.prototype.hasOwnProperty.call(input, "predecessorArtifact")
    ? ["artifact", "predecessorArtifact", "expected"]
    : ["artifact", "expected"];
  const holder = closedRecord(input, keys, "V124_REPLAY_SOURCE_INPUT_INVALID");
  const expected = parseSourceExpectation(holder.expected as ReceizDomainReplaySegmentSourceExpectationV124);
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(holder.artifact);
  const carrierRecord = closedRecord(opened.carrier, ["schema", "proofObjectId", "applicationId", "domainId", "registryDigest", "reducerDigest", "predecessor", "segment", "fibonacciWitnesses", "head", "authority"], "V124_REPLAY_PROOF_SEGMENT_CARRIER_INVALID");
  if (carrierRecord.schema !== "receiz.domain-replay-segment-proof.v124" || !Array.isArray(carrierRecord.fibonacciWitnesses)) fail("V124_REPLAY_PROOF_SEGMENT_CARRIER_INVALID");
  const application = applicationId(carrierRecord.applicationId, "V124_REPLAY_PROOF_SEGMENT_COORDINATE_INVALID");
  const domain = domainId(carrierRecord.domainId, "V124_REPLAY_PROOF_SEGMENT_COORDINATE_INVALID");
  const registry = digest(carrierRecord.registryDigest, "V124_REPLAY_PROOF_SEGMENT_COORDINATE_INVALID");
  const reducer = digest(carrierRecord.reducerDigest, "V124_REPLAY_PROOF_SEGMENT_COORDINATE_INVALID");
  const proofObjectId = digest(carrierRecord.proofObjectId, "V124_REPLAY_PROOF_SEGMENT_COORDINATE_INVALID");
  const segment = parseReceizDomainReplaySegmentCommitmentV124(carrierRecord.segment);
  const head = parseReceizDomainReplayProofHeadV124(carrierRecord.head);
  const carrierAuthority = parseSegmentCarrierAuthority(carrierRecord.authority);
  if (application !== expected.applicationId || (expected.domainId !== undefined && domain !== expected.domainId)
    || (expected.expectedRegistryDigest !== undefined && registry !== expected.expectedRegistryDigest)
    || (expected.expectedReducerDigest !== undefined && reducer !== expected.expectedReducerDigest)
    || application !== head.applicationId || domain !== head.domainId || registry !== head.registryDigest
    || reducer !== head.reducerDigest || proofObjectId !== head.proofObjectId) fail("V124_REPLAY_SOURCE_EXPECTATION_MISMATCH");

  const childValue = parseSegmentChildBytes(segment);
  if (!childValue || typeof childValue !== "object" || Array.isArray(childValue)
    || !Object.prototype.hasOwnProperty.call(childValue, "authoringEvidence")) {
    fail("V124_REPLAY_SOURCE_AUTHORING_EVIDENCE_REQUIRED");
  }
  const childRecord = closedRecord(childValue, ["schema", "proofObjectId", "segmentIndex", "kai", "sourceAuthority", "authoringEvidence", "replay", "replayReceipt", "journalAppends", "insertionWitnesses", "causalParentWitnesses", "authority"], "V124_REPLAY_PROOF_SEGMENT_CHILD_INVALID");
  if (childRecord.schema !== "receiz.domain-replay-page-segment.v124"
    || !Array.isArray(childRecord.journalAppends)
    || !Array.isArray(childRecord.insertionWitnesses)
    || !Array.isArray(childRecord.causalParentWitnesses)) fail("V124_REPLAY_PROOF_SEGMENT_CHILD_INVALID");
  const childProofObjectId = digest(childRecord.proofObjectId, "V124_REPLAY_PROOF_SEGMENT_CHILD_INVALID");
  const childSegmentIndex = safeCount(childRecord.segmentIndex, "V124_REPLAY_PROOF_SEGMENT_CHILD_INVALID");
  const childKai = parseReceizDomainReplayKaiV124(childRecord.kai);
  const _childAuthority = parseSegmentChildAuthority(childRecord.authority);
  const sourceAuthority = await parseReceizDomainReplaySourceAuthorityV124(childRecord.sourceAuthority, opened);
  const causalWitnesses = childRecord.causalParentWitnesses.map(parseReceizDomainReplayAppendIndexWitnessV124);
  const externalCausalParents = new Set(causalWitnesses.map((witness) => witness.appendId));
  const replayReceipt = await parseReplayReceipt(childRecord.replayReceipt);
  const replay = await parseReplayProjection({ replay: childRecord.replay, receipt: replayReceipt, externalCausalParents });
  const segmentBytes = receizBase64UrlDecode(segment.exactSegmentBytesB64u);
  if (await sha256ReceizBytes(segmentBytes) !== segment.segmentBytesDigest
    || segment.segmentId !== deriveReceizDomainReplaySegmentIdV124({ proofObjectId, segmentIndex: segment.segmentIndex, startCursor: segment.startCursor, endCursor: segment.endCursor, additionCount: segment.additionCount, eventRoot: segment.eventRoot, segmentBytesDigest: segment.segmentBytesDigest })) fail("V124_REPLAY_PROOF_SEGMENT_DIGEST_MISMATCH");
  const eventTree = buildReceizCompositeBoundedTree(replay.additions.map((addition) => deriveReceizDomainReplaySegmentEventLeafV124(addition)));
  if (eventTree.root !== segment.eventRoot || replay.additions.length !== segment.additionCount
    || replay.afterCursor !== segment.startCursor || replay.cursor !== segment.endCursor
    || childProofObjectId !== proofObjectId || childSegmentIndex !== segment.segmentIndex
    || segment.segmentIndex !== head.segmentCount || !exactCanonicalEqual(head.currentSegment, {
      segmentIndex: segment.segmentIndex,
      startCursor: segment.startCursor,
      endCursor: segment.endCursor,
      additionCount: segment.additionCount,
      eventRoot: segment.eventRoot,
      segmentBytesDigest: segment.segmentBytesDigest,
      segmentId: segment.segmentId,
    })) fail("V124_REPLAY_PROOF_SEGMENT_BINDING_MISMATCH");

  if (sourceAuthority.applicationId !== application || sourceAuthority.audience !== expected.audience
    || sourceAuthority.domainId !== domain || sourceAuthority.acceptedHead !== replay.head
    || head.head !== replay.head || head.cursor !== replay.cursor
    || head.namespace.name !== replay.namespace.name || head.namespace.head !== replay.namespace.head
    || head.namespace.digest !== replay.namespace.digest
    || head.kai.pulse !== opened.artifactKaiPulse || childKai.pulse !== opened.artifactKaiPulse
    || head.kai.uPulse !== childKai.uPulse) fail("V124_REPLAY_SOURCE_AUTHORITY_BINDING_MISMATCH");
  if (expected.afterHead !== undefined && replay.afterHead !== expected.afterHead) fail("V124_REPLAY_SOURCE_EXPECTATION_MISMATCH");
  if (expected.afterCursor !== undefined && replay.afterCursor !== expected.afterCursor) fail("V124_REPLAY_SOURCE_EXPECTATION_MISMATCH");

  let predecessorSource: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    artifactSha256: string;
    head: ReceizDomainReplayProofHeadV124;
  }> | null = null;
  let predecessor: ReceizDomainReplaySegmentProofCarrierV124["predecessor"] = null;
  let priorAccumulator = createEmptyReceizDomainReplaySegmentAccumulatorV124();
  let priorIndexRoot = createEmptyReceizDomainReplayAppendIndexRootV124();
  let priorIndexCount = 0;
  if (carrierRecord.predecessor !== null) {
    const predecessorRecord = closedRecord(carrierRecord.predecessor, [
      "artifactSha256", "head",
    ], "V124_REPLAY_PROOF_PREDECESSOR_INVALID");
    const predecessorArtifactSha256 = digest(
      predecessorRecord.artifactSha256,
      "V124_REPLAY_PROOF_PREDECESSOR_INVALID",
    );
    const representedPredecessorHead = parseReceizDomainReplayProofHeadV124(
      predecessorRecord.head,
    );
    const explicitPredecessor = Object.prototype.hasOwnProperty.call(
      holder,
      "predecessorArtifact",
    )
      ? parseReceizPortableReplaySourceArtifactV124(holder.predecessorArtifact)
      : undefined;
    const openedPredecessor = explicitPredecessor === undefined
      ? readRememberedVerifiedSegmentSource(predecessorArtifactSha256)
      : await openReceizPinnedDomainReplaySegmentHeadV124(
        explicitPredecessor,
        {
          applicationId: application,
          audience: expected.audience,
          domainId: domain,
          expectedRegistryDigest: registry,
          expectedReducerDigest: reducer,
        },
      );
    if (openedPredecessor === undefined) {
      fail("V124_REPLAY_PROOF_PREDECESSOR_ARTIFACT_REQUIRED");
    }
    const predecessorHead = openedPredecessor.head;
    if (openedPredecessor.artifactSha256 !== predecessorArtifactSha256
      || openedPredecessor.artifact.artifactSha256 !== predecessorArtifactSha256
      || !sameHeadCoordinates(predecessorHead, representedPredecessorHead)
      || openedPredecessor.artifactKaiPulse !== predecessorHead.kai.pulse) {
      fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
    }
    predecessorSource = freeze({
      artifact: openedPredecessor.artifact,
      artifactSha256: predecessorArtifactSha256,
      head: predecessorHead,
    });
    predecessor = freeze({
      artifactSha256: predecessorArtifactSha256,
      head: representedPredecessorHead,
    });
    if (predecessorHead.proofObjectId !== proofObjectId || predecessorHead.applicationId !== application
      || predecessorHead.domainId !== domain || predecessorHead.registryDigest !== registry
      || predecessorHead.reducerDigest !== reducer || head.segmentCount !== predecessorHead.segmentCount + 1
      || replay.afterHead !== predecessorHead.head || replay.priorHead !== predecessorHead.head
      || replay.afterCursor !== predecessorHead.cursor
      || head.priorSourceArtifactSha256 !== predecessorSource.artifactSha256
      || head.priorSourceSegmentDigest !== predecessorHead.currentSourceSegmentDigest
      || head.kai.uPulse < predecessorHead.kai.uPulse) fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
    priorAccumulator = predecessorHead.segmentAccumulator;
    priorIndexRoot = predecessorHead.appendIndexRoot;
    priorIndexCount = predecessorHead.appendIndexCount;
  } else if (Object.prototype.hasOwnProperty.call(holder, "predecessorArtifact")) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_UNEXPECTED");
  } else if (head.segmentCount !== 1 || replay.afterHead !== null || replay.afterCursor !== 0
    || replay.priorHead !== head.genesisHead || head.priorSourceArtifactSha256 !== null
    || head.priorSourceSegmentDigest !== null) fail("V124_REPLAY_PROOF_GENESIS_MISMATCH");

  const expectedAccumulator = appendReceizDomainReplaySegmentAccumulatorV124(priorAccumulator, segment.segmentId);
  if (!exactCanonicalEqual(head.segmentAccumulator, expectedAccumulator)) fail("V124_REPLAY_PROOF_ACCUMULATOR_MISMATCH");
  const insertionWitnesses = childRecord.insertionWitnesses.map(parseReceizDomainReplayAppendIndexWitnessV124);
  if (insertionWitnesses.length !== replay.additions.length) fail("V124_REPLAY_APPEND_INDEX_WITNESS_MISMATCH");
  let evolvingIndexRoot = priorIndexRoot;
  for (let index = 0; index < replay.additions.length; index += 1) {
    const addition = replay.additions[index]!;
    const witness = insertionWitnesses[index]!;
    const checked = verifyReceizDomainReplayAppendIndexWitnessV124({
      witness,
      expectedRoot: evolvingIndexRoot,
      expectedAppendId: addition.appendId,
      expectedValue: null,
      insertValue: { eventDigest: addition.eventDigest, cursor: addition.cursor, newHead: addition.newHead },
    });
    evolvingIndexRoot = checked.resultingRoot;
  }
  if (head.appendIndexRoot !== evolvingIndexRoot || head.appendIndexCount !== priorIndexCount + replay.additions.length) fail("V124_REPLAY_APPEND_INDEX_ROOT_MISMATCH");

  const pageIds = new Set<string>();
  const requiredExternalParents = new Set<string>();
  for (const addition of replay.additions) {
    for (const parent of addition.causalParents) {
      if (!pageIds.has(parent)) requiredExternalParents.add(parent);
    }
    pageIds.add(addition.appendId);
  }
  if (causalWitnesses.length !== requiredExternalParents.size
    || new Set(causalWitnesses.map((witness) => witness.appendId)).size !== causalWitnesses.length) fail("V124_REPLAY_CAUSAL_PARENT_WITNESS_MISMATCH");
  for (const witness of causalWitnesses) {
    if (!requiredExternalParents.has(witness.appendId) || witness.value === null) fail("V124_REPLAY_CAUSAL_PARENT_WITNESS_MISMATCH");
    verifyReceizDomainReplayAppendIndexWitnessV124({ witness, expectedRoot: priorIndexRoot, expectedAppendId: witness.appendId, expectedValue: witness.value });
  }
  const journalAppends = await parseReceizDomainAppendCommandsV124({
    values: childRecord.journalAppends,
    replay,
    kai: childKai,
    causalParentWitnesses: causalWitnesses,
  });
  const sourceIntent = await createReceizDomainReplaySourceIntentV124({
    applicationId: application,
    audience: sourceAuthority.audience,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    acceptedHead: replay.head,
    sourceKai: childKai,
    predecessorArtifactSha256: predecessor?.artifactSha256 ?? null,
    replay,
    replayReceipt,
    journalAppends,
    causalParentWitnesses: causalWitnesses,
    sourceAuthority,
    ownership: opened.ownership,
    provenance: opened.provenance,
  });
  const authoringEvidence = await parseReceizDomainReplaySourceAuthoringEvidenceV124(
    childRecord.authoringEvidence,
    sourceIntent,
  );

  const priorFibonacciByOperation = new Map(predecessorSource?.head.fibonacci.checkpoints.map((checkpoint) => [checkpoint.operationCount, checkpoint.artifactDigest]) ?? []);
  const witnessRecords = carrierRecord.fibonacciWitnesses as readonly unknown[];
  const neededWitnesses = new Map<number, string>();
  for (const checkpoint of head.fibonacci.checkpoints) {
    const direct = predecessorSource && checkpoint.operationCount === predecessorSource.head.segmentCount ? predecessorSource.artifactSha256 : undefined;
    const retained = priorFibonacciByOperation.get(checkpoint.operationCount);
    const expectedArtifact = direct ?? retained;
    if (expectedArtifact !== undefined) {
      if (checkpoint.artifactDigest !== expectedArtifact) fail("V124_REPLAY_FIBONACCI_REFERENCE_MISMATCH");
    } else {
      neededWitnesses.set(checkpoint.operationCount, checkpoint.artifactDigest);
    }
  }
  if (witnessRecords.length !== neededWitnesses.size) fail("V124_REPLAY_FIBONACCI_WITNESS_MISMATCH");
  const seenFibonacci = new Set<number>();
  const fibonacciWitnesses = witnessRecords.map((candidate) => {
    const candidateRecord = closedRecord(candidate, ["schema", "segmentPosition", "segmentId", "artifactSha256", "peakLevel", "siblings"], "V124_REPLAY_FIBONACCI_WITNESS_INVALID");
    const position = safeCount(candidateRecord.segmentPosition, "V124_REPLAY_FIBONACCI_WITNESS_INVALID");
    const expectedArtifact = neededWitnesses.get(position);
    if (expectedArtifact === undefined || seenFibonacci.has(position)) fail("V124_REPLAY_FIBONACCI_WITNESS_MISMATCH");
    seenFibonacci.add(position);
    return verifyReceizDomainReplayFibonacciWitnessV124({ witness: candidate, accumulator: expectedAccumulator, expectedOperationCount: position, expectedArtifactSha256: expectedArtifact });
  });

  const carrier: ReceizDomainReplaySegmentProofCarrierV124 = freeze({
    schema: "receiz.domain-replay-segment-proof.v124" as const,
    proofObjectId,
    applicationId: application,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    predecessor,
    segment,
    fibonacciWitnesses: freeze(fibonacciWitnesses),
    head,
    authority: carrierAuthority,
  });
  const source = freeze({
    schema: "receiz.domain-replay-segment-source-read.v124" as const,
    status: "verified-source" as const,
    artifact: opened.artifact,
    artifactSha256: opened.artifactSha256,
    artifactKaiPulse: opened.artifactKaiPulse,
    predecessorArtifact: predecessorSource?.artifact ?? null,
    carrier,
    head,
    replay,
    replayReceipt,
    journalAppends,
    sourceIntent,
    authoringEvidence,
    sourceAuthority,
    ownership: opened.ownership,
    provenance: opened.provenance,
    authority: freeze({ sourceReadIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  rememberVerifiedSegmentSource(source);
  return source;
}

/** Pinned verification of a checkpoint source, optionally bound to held replay source. */
export async function readReceizDomainReplayCheckpointSourceV124(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  expectedAudience: string;
  replaySource?: ReceizReadDomainReplaySegmentSourceV124;
  replayPredecessorArtifact?: ReceizPortableSealedArtifactV124;
}>): Promise<ReceizReadDomainReplayCheckpointSourceV124> {
  const keys = [
    "artifact",
    "expectedAudience",
    ...(Object.prototype.hasOwnProperty.call(input, "replaySource")
      ? ["replaySource"] : []),
    ...(Object.prototype.hasOwnProperty.call(input, "replayPredecessorArtifact")
      ? ["replayPredecessorArtifact"] : []),
  ];
  const holder = closedRecord(input, keys, "V124_CHECKPOINT_SOURCE_INPUT_INVALID");
  const audience = text(holder.expectedAudience, "V124_CHECKPOINT_SOURCE_INPUT_INVALID");
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(holder.artifact);
  const record = closedRecord(opened.carrier, ["schema", "proofObjectId", "applicationId", "domainId", "registryDigest", "reducerDigest", "kai", "sourceAuthority", "replaySourceArtifact", "replaySourceArtifactSha256", "replayHead", "checkpoint", "checkpointReceipt", "currentSourceSegmentDigest", "authority"], "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  if (record.schema !== "receiz.domain-replay-checkpoint-proof.v124") fail("V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const proofObjectId = digest(record.proofObjectId, "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const application = applicationId(record.applicationId, "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const domain = domainId(record.domainId, "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const registry = digest(record.registryDigest, "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const reducer = digest(record.reducerDigest, "V124_CHECKPOINT_SOURCE_CARRIER_INVALID");
  const kai = parseReceizDomainReplayKaiV124(record.kai, "V124_CHECKPOINT_SOURCE_KAI_INVALID");
  const sourceAuthority = await parseReceizDomainReplaySourceAuthorityV124(record.sourceAuthority, opened);
  const replaySourceArtifactSha256 = digest(record.replaySourceArtifactSha256, "V124_CHECKPOINT_SOURCE_REPLAY_INVALID");
  const replaySource = holder.replaySource as
    ReceizReadDomainReplaySegmentSourceV124 | undefined;
  const replayPredecessorArtifact = Object.prototype.hasOwnProperty.call(
    holder,
    "replayPredecessorArtifact",
  )
    ? holder.replayPredecessorArtifact as ReceizPortableSealedArtifactV124
    : replaySource?.predecessorArtifact ?? undefined;
  const intrinsicReplaySource = await readReceizDomainReplaySegmentSourceV124({
    artifact: record.replaySourceArtifact as ReceizPortableSealedArtifactV124,
    ...(replayPredecessorArtifact === undefined
      ? {}
      : { predecessorArtifact: replayPredecessorArtifact }),
    expected: {
      applicationId: application,
      audience,
      domainId: domain,
      expectedRegistryDigest: registry,
      expectedReducerDigest: reducer,
    },
  });
  const replayHead = parseReceizDomainReplayProofHeadV124(record.replayHead);
  const currentSourceSegmentDigest = digest(record.currentSourceSegmentDigest, "V124_CHECKPOINT_SOURCE_REPLAY_INVALID");
  const checkpointReceipt = await parseCheckpointReceipt(record.checkpointReceipt);
  const checkpoint = await parseCheckpointProjection(record.checkpoint, checkpointReceipt);
  const authority = parseCheckpointCarrierAuthority(record.authority);
  if (proofObjectId !== replayHead.proofObjectId || application !== replayHead.applicationId
    || domain !== replayHead.domainId || registry !== replayHead.registryDigest || reducer !== replayHead.reducerDigest
    || currentSourceSegmentDigest !== replayHead.currentSourceSegmentDigest
    || sourceAuthority.applicationId !== application || sourceAuthority.audience !== audience
    || sourceAuthority.domainId !== domain || sourceAuthority.acceptedHead !== replayHead.head
    || checkpoint.applicationId !== application || checkpoint.domainId !== domain
    || checkpoint.registryDigest !== registry || checkpoint.reducerDigest !== reducer
    || checkpoint.throughHead !== replayHead.head || checkpoint.cursor !== replayHead.cursor
    || checkpoint.namespace.name !== replayHead.namespace.name || checkpoint.namespace.head !== replayHead.namespace.head
    || checkpoint.namespace.digest !== replayHead.namespace.digest
    || kai.pulse !== opened.artifactKaiPulse || kai.uPulse !== replayHead.kai.uPulse) fail("V124_CHECKPOINT_SOURCE_BINDING_MISMATCH");
  if (intrinsicReplaySource.artifactSha256 !== replaySourceArtifactSha256
    || !sameHeadCoordinates(intrinsicReplaySource.head, replayHead)
    || intrinsicReplaySource.sourceAuthority.sourceAuthorityBindingDigest !== sourceAuthority.sourceAuthorityBindingDigest) fail("V124_CHECKPOINT_SOURCE_REPLAY_SUBSTITUTION");
  if (replaySource && (replaySource.artifactSha256 !== intrinsicReplaySource.artifactSha256
    || !sameHeadCoordinates(replaySource.head, intrinsicReplaySource.head)
    || replaySource.sourceAuthority.sourceAuthorityBindingDigest !== intrinsicReplaySource.sourceAuthority.sourceAuthorityBindingDigest)) fail("V124_CHECKPOINT_SOURCE_REPLAY_SUBSTITUTION");
  const carrier: ReceizDomainReplayCheckpointProofCarrierV124 = freeze({
    schema: "receiz.domain-replay-checkpoint-proof.v124" as const,
    proofObjectId,
    applicationId: application,
    domainId: domain,
    registryDigest: registry,
    reducerDigest: reducer,
    kai,
    sourceAuthority,
    replaySourceArtifact: intrinsicReplaySource.artifact,
    replaySourceArtifactSha256,
    replayHead,
    checkpoint,
    checkpointReceipt,
    currentSourceSegmentDigest,
    authority,
  });
  return freeze({
    schema: "receiz.domain-replay-checkpoint-source-read.v124" as const,
    status: "verified-source" as const,
    artifact: opened.artifact,
    artifactSha256: opened.artifactSha256,
    artifactKaiPulse: opened.artifactKaiPulse,
    carrier,
    replaySource: intrinsicReplaySource,
    replayHead,
    checkpoint,
    checkpointReceipt,
    sourceAuthority,
    ownership: opened.ownership,
    provenance: opened.provenance,
    authority: freeze({ sourceReadIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}

function subjectText(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) fail(code);
  return value;
}

async function parsePinnedSubjectAdmissionReceiptV124(
  value: unknown,
  code: string,
): Promise<ReceizSubjectAdmissionReceiptV122> {
  const record = closedRecord(value, [
    "schema", "subjectId", "proofObjectId", "admittedProofDigest", "immutableProofVersion",
    "ownerReceizId", "ownerProofDigest", "genesisHead", "registryDigest", "reducerDigest",
    "kai", "idempotencyIdentityDigest", "authority", "receiptDigest",
  ], code);
  if (record.schema !== "receiz.subject.admission-receipt.v122") fail(code);
  const authority = closedRecord(
    record.authority,
    ["receiptIsProofAuthority", "strongerTruth"],
    code,
  );
  if (authority.receiptIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  const basis = freeze({
    schema: "receiz.subject.admission-receipt.v122" as const,
    subjectId: subjectText(record.subjectId, code),
    proofObjectId: subjectText(record.proofObjectId, code),
    admittedProofDigest: digest(record.admittedProofDigest, code),
    immutableProofVersion: subjectText(record.immutableProofVersion, code),
    ownerReceizId: subjectText(record.ownerReceizId, code),
    ownerProofDigest: digest(record.ownerProofDigest, code),
    genesisHead: digest(record.genesisHead, code),
    registryDigest: digest(record.registryDigest, code),
    reducerDigest: digest(record.reducerDigest, code),
    kai: safeCount(record.kai, code),
    idempotencyIdentityDigest: digest(record.idempotencyIdentityDigest, code),
    authority: freeze({
      receiptIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const receiptDigest = digest(record.receiptDigest, code);
  if (await digestReceizCanonicalV122(basis) !== receiptDigest) fail(code);
  return freeze({ ...basis, receiptDigest });
}

async function parsePinnedSubjectStateV124(
  value: unknown,
  expectedStateDigest: string,
  code: string,
): Promise<ReceizSubjectStateV122> {
  const record = closedRecord(value, [
    "schema", "subjectId", "proofObjectId", "admittedProofDigest", "immutableProofVersion", "subjectType",
    "opaqueNamespaces", "genesisHead", "head", "ownerReceizId", "ownershipHead", "ownerProofDigest",
    "registryDigest", "reducerDigest", "admissionReceipt", "causalParents", "accessKeyHead", "replay",
    "authority", "stateDigest",
  ], code);
  if (record.schema !== "receiz.subject.state.v122"
    || !Array.isArray(record.opaqueNamespaces)
    || !Array.isArray(record.causalParents)) fail(code);
  const opaqueNamespaces = [] as Array<Readonly<{
    namespace: string;
    exactBytesB64u: string;
    digest: string;
  }>>;
  for (const value of record.opaqueNamespaces) {
    const entry = closedRecord(
      value,
      ["namespace", "exactBytesB64u", "digest"],
      code,
    );
    const exactBytes = exactBase64Url(entry.exactBytesB64u, code);
    const entryDigest = digest(entry.digest, code);
    if (await sha256ReceizBytes(exactBytes) !== entryDigest) fail(code);
    opaqueNamespaces.push(freeze({
      namespace: subjectText(entry.namespace, code),
      exactBytesB64u: entry.exactBytesB64u as string,
      digest: entryDigest,
    }));
  }
  const causalParents = record.causalParents.map((entry) => digest(entry, code));
  const replay = closedRecord(record.replay, ["appendCursor", "eventCursor"], code);
  const authority = closedRecord(
    record.authority,
    ["stateIsProofAuthority", "strongerTruth"],
    code,
  );
  if (authority.stateIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  const admissionReceipt = await parsePinnedSubjectAdmissionReceiptV124(
    record.admissionReceipt,
    code,
  );
  const basis = freeze({
    schema: "receiz.subject.state.v122" as const,
    subjectId: subjectText(record.subjectId, code),
    proofObjectId: subjectText(record.proofObjectId, code),
    admittedProofDigest: digest(record.admittedProofDigest, code),
    immutableProofVersion: subjectText(record.immutableProofVersion, code),
    subjectType: subjectText(record.subjectType, code),
    opaqueNamespaces: freeze(opaqueNamespaces),
    genesisHead: digest(record.genesisHead, code),
    head: digest(record.head, code),
    ownerReceizId: subjectText(record.ownerReceizId, code),
    ownershipHead: digest(record.ownershipHead, code),
    ownerProofDigest: digest(record.ownerProofDigest, code),
    registryDigest: digest(record.registryDigest, code),
    reducerDigest: digest(record.reducerDigest, code),
    admissionReceipt,
    causalParents: freeze(causalParents),
    accessKeyHead: record.accessKeyHead === null ? null : digest(record.accessKeyHead, code),
    replay: freeze({
      appendCursor: subjectText(replay.appendCursor, code),
      eventCursor: subjectText(replay.eventCursor, code),
    }),
    authority: freeze({
      stateIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const stateDigest = digest(record.stateDigest, code);
  if (stateDigest !== expectedStateDigest
    || await deriveReceizSubjectIdV122(basis.admittedProofDigest) !== basis.subjectId
    || await digestReceizCanonicalV122(basis) !== stateDigest
    || admissionReceipt.subjectId !== basis.subjectId
    || admissionReceipt.proofObjectId !== basis.proofObjectId
    || admissionReceipt.admittedProofDigest !== basis.admittedProofDigest
    || admissionReceipt.immutableProofVersion !== basis.immutableProofVersion
    || admissionReceipt.ownerReceizId !== basis.ownerReceizId
    || admissionReceipt.ownerProofDigest !== basis.ownerProofDigest
    || admissionReceipt.genesisHead !== basis.genesisHead
    || admissionReceipt.registryDigest !== basis.registryDigest
    || admissionReceipt.reducerDigest !== basis.reducerDigest) fail(code);
  return freeze({ ...basis, stateDigest });
}

/** Pinned enclosing subject source; the carried state is subordinate to it. */
export async function readReceizViewerSubjectSourceV124(
  artifact: ReceizPortableSealedArtifactV124,
): Promise<ReceizReadViewerSubjectSourceV124> {
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(artifact);
  const code = "V124_PRIVATE_VIEWER_SUBJECT_SOURCE_INVALID";
  const record = closedRecord(opened.carrier, ["schema", "subjectId", "proofObjectId", "ownerReceizId", "head", "accessKeyHead", "exactSubjectStateBytesB64u", "subjectStateDigest", "authority"], code);
  if (record.schema !== "receiz.viewer-subject-source.v124") fail(code);
  const exactBytes = exactBase64Url(record.exactSubjectStateBytesB64u, code);
  const stateDigest = digest(record.subjectStateDigest, code);
  let stateValue: unknown;
  try {
    stateValue = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(exactBytes));
    if (canonicalizeReceizV122(stateValue) !== new TextDecoder().decode(exactBytes)) fail(code);
  } catch (error) {
    if (error instanceof TypeError && error.message === code) throw error;
    return fail(code);
  }
  const state = await parsePinnedSubjectStateV124(stateValue, stateDigest, code);
  const subjectId = text(record.subjectId, code);
  const proofObjectId = text(record.proofObjectId, code);
  const ownerReceizId = text(record.ownerReceizId, code);
  const head = digest(record.head, code);
  const accessKeyHead = record.accessKeyHead === null ? null : digest(record.accessKeyHead, code);
  const authorityRecord = closedRecord(record.authority, ["carrierIsSubjectAuthority", "projectionIsSubjectAuthority", "strongerTruth"], code);
  if (authorityRecord.carrierIsSubjectAuthority !== false || authorityRecord.projectionIsSubjectAuthority !== false
    || authorityRecord.strongerTruth !== "sealed-receiz-proof-object"
    || state.subjectId !== subjectId || state.proofObjectId !== proofObjectId
    || state.ownerReceizId !== ownerReceizId || state.head !== head
    || state.accessKeyHead !== accessKeyHead || opened.ownership.ownerReceizId !== ownerReceizId) fail(code);
  const carrier: ReceizViewerSubjectSourceCarrierV124 = freeze({
    schema: "receiz.viewer-subject-source.v124" as const,
    subjectId,
    proofObjectId,
    ownerReceizId,
    head,
    accessKeyHead,
    exactSubjectStateBytesB64u: record.exactSubjectStateBytesB64u as string,
    subjectStateDigest: stateDigest,
    authority: freeze({ carrierIsSubjectAuthority: false as const, projectionIsSubjectAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  return freeze({
    schema: "receiz.viewer-subject-source-read.v124" as const,
    status: "verified-source" as const,
    artifact: opened.artifact,
    artifactSha256: opened.artifactSha256,
    artifactKaiPulse: opened.artifactKaiPulse,
    carrier,
    subjectState: state,
    ownership: opened.ownership,
    provenance: opened.provenance,
    authority: freeze({ sourceReadIsSubjectAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}

/** Domain-neutral alias; namespace/private callers share the same sealed source. */
export const readReceizSubjectSourceV124 = readReceizViewerSubjectSourceV124;

async function accessGrantFromSource(
  source: ReceizReadDomainReplaySegmentSourceV124,
  expected: Readonly<{ worldId: string; subjectId: string; grantHead: string }>,
): Promise<ReceizWorldAccessAppendV122> {
  const addition = source.replay.additions.at(-1);
  if (!addition) fail("V124_PRIVATE_ACCESS_GRANT_SOURCE_INVALID");
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(addition.exactEventBytesB64u)));
  } catch { return fail("V124_PRIVATE_ACCESS_GRANT_SOURCE_INVALID"); }
  const append = value as ReceizWorldAccessAppendV122;
  if (!await validateReceizWorldAccessAppendV122(append)
    || append.worldId !== expected.worldId || append.subjectId !== expected.subjectId
    || append.acceptedAccessHead !== expected.grantHead
    || (append.action !== "grant" && append.action !== "open")) {
    fail("V124_PRIVATE_ACCESS_GRANT_SOURCE_INVALID");
  }
  return freeze(structuredClone(append));
}

async function privateEnvelopeDigestFromAdditionV124(
  addition: ReceizDomainReplayV124["additions"][number],
  worldId: string,
): Promise<string | null> {
  const code = "V124_PRIVATE_ENVELOPE_SOURCE_SUBSTITUTION";
  let value: unknown;
  try {
    const eventText = new TextDecoder("utf-8", { fatal: true }).decode(
      receizBase64UrlDecode(addition.exactEventBytesB64u),
    );
    value = JSON.parse(eventText);
    if (canonicalizeReceizV122(value) !== eventText) fail(code);
  } catch (error) {
    if (error instanceof TypeError && error.message === code) throw error;
    return fail(code);
  }
  const event = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : null;
  const candidate = event?.schema === "receiz.world.private-command-public.v122"
    ? event
    : event?.publicPayload !== null && typeof event?.publicPayload === "object" && !Array.isArray(event.publicPayload)
      ? event.publicPayload as Readonly<Record<string, unknown>>
      : event?.payload !== null && typeof event?.payload === "object" && !Array.isArray(event.payload)
        ? event.payload as Readonly<Record<string, unknown>>
        : null;
  if (!candidate || candidate.schema !== "receiz.world.private-command-public.v122") {
    return null;
  }
  const publicEvent = closedRecord(candidate, [
    "schema", "worldId", "publicPayload", "publicPayloadDigest", "privateEnvelopeDigest",
  ], code);
  if (publicEvent.worldId !== worldId
    || await digestReceizCanonicalV122(publicEvent.publicPayload) !== digest(publicEvent.publicPayloadDigest, code)) {
    fail(code);
  }
  return digest(publicEvent.privateEnvelopeDigest, code);
}

async function bindPrivateEnvelopeProjectionV124(input: Readonly<{
  value: unknown;
  source: ReceizDomainReplayV124["additions"][number];
  worldId: string;
  viewerSubjectId: string;
  accessKeyHead: string;
  recipientWrapDigest: string;
}>): Promise<void> {
  const code = "V124_PRIVATE_ENVELOPE_SOURCE_SUBSTITUTION";
  const record = closedRecord(input.value, [
    "schema", "worldId", "visibilityMode", "ciphertextB64u", "nonceB64u",
    "aadDigest", "payloadDigest", "envelopeDigest", "recipientWrap", "authority",
  ], code);
  if (record.schema !== "receiz.world.private-envelope-projection.v124") fail(code);
  const authority = closedRecord(
    record.authority,
    ["projectionIsProofAuthority", "strongerTruth"],
    code,
  );
  if (authority.projectionIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  if (record.worldId !== input.worldId
    || (record.visibilityMode !== "private" && record.visibilityMode !== "invited")
    || exactBase64Url(record.nonceB64u, code).byteLength !== 12) fail(code);
  exactBase64Url(record.ciphertextB64u, code);
  digest(record.aadDigest, code);
  digest(record.payloadDigest, code);
  const sourceEnvelopeDigest = await privateEnvelopeDigestFromAdditionV124(
    input.source,
    input.worldId,
  );
  if (sourceEnvelopeDigest === null
    || digest(record.envelopeDigest, code) !== sourceEnvelopeDigest) fail(code);
  const wrapRecord = closedRecord(record.recipientWrap, [
    "recipientSubjectId", "recipientAccessKeyHead", "ephemeralPublicKeyJwk",
    "nonceB64u", "wrappedContentKeyB64u", "wrapDigest",
  ], code);
  const key = closedRecord(
    wrapRecord.ephemeralPublicKeyJwk,
    ["key_ops", "ext", "kty", "crv", "x", "y"],
    code,
  );
  if (!Array.isArray(key.key_ops) || key.key_ops.length !== 0
    || key.ext !== true || key.kty !== "EC" || key.crv !== "P-256"
    || exactBase64Url(key.x, code).byteLength !== 32
    || exactBase64Url(key.y, code).byteLength !== 32
    || exactBase64Url(wrapRecord.nonceB64u, code).byteLength !== 12) fail(code);
  exactBase64Url(wrapRecord.wrappedContentKeyB64u, code);
  const wrapBasis = freeze({
    recipientSubjectId: text(wrapRecord.recipientSubjectId, code),
    recipientAccessKeyHead: digest(wrapRecord.recipientAccessKeyHead, code),
    ephemeralPublicKeyJwk: freeze({
      key_ops: freeze([]) as KeyUsage[],
      ext: true,
      kty: "EC",
      crv: "P-256",
      x: key.x as string,
      y: key.y as string,
    }),
    nonceB64u: wrapRecord.nonceB64u as string,
    wrappedContentKeyB64u: wrapRecord.wrappedContentKeyB64u as string,
  });
  const wrapDigest = digest(wrapRecord.wrapDigest, code);
  if (wrapBasis.recipientSubjectId !== input.viewerSubjectId
    || wrapBasis.recipientAccessKeyHead !== input.accessKeyHead
    || wrapDigest !== input.recipientWrapDigest
    || await digestReceizCanonicalV122(wrapBasis) !== wrapDigest) fail(code);
  try {
    await globalThis.crypto.subtle.importKey(
      "jwk",
      wrapBasis.ephemeralPublicKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
  } catch { fail(code); }
}

const pendingRuntimeSourceAdmissions = new WeakMap<object, ReceizDomainReplayRuntimeSourceAdmissionV124>();

function runtimeRequestBasis(request: ReceizAuthenticatedRuntimeRequestV124) {
  const record = closedRecord(request, ["schema", "method", "path", "applicationId", "audience", "strongerTruth", "body", "requestDigest"], "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
  if (record.schema !== "receiz.authenticated-runtime-request.v124" || record.method !== "POST"
    || record.strongerTruth !== "sealed-receiz-proof-object") fail("V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
  return freeze({
    path: text(record.path, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID"),
    audience: text(record.audience, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID"),
    body: record.body,
    requestDigest: digest(record.requestDigest, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID"),
  });
}

/**
 * Verifies sealed source before the authenticated-runtime module records any
 * runtime custody. Direct callers gain nothing unless the exact pinned artifact
 * and every carried relation are valid.
 */
export async function verifyReceizDomainReplayRuntimeSourceV124(
  wire: unknown,
  request: ReceizAuthenticatedRuntimeRequestV124,
): Promise<ReceizDomainReplayRuntimeSourceAdmissionV124> {
  if (wire === null || typeof wire !== "object" || Array.isArray(wire)) fail("V124_REPLAY_RUNTIME_SOURCE_WIRE_INVALID");
  const exactRequest = runtimeRequestBasis(request);
  let admission: ReceizDomainReplayRuntimeSourceAdmissionV124;
  if (exactRequest.path === "/api/sdk/v1/domains/verified-replay"
    || exactRequest.path === "/api/sdk/v1/domains/verified-additions") {
    const body = closedRecord(exactRequest.body, ["applicationId", "domainId", "afterHead", "expectedRegistryDigest", "expectedReducerDigest"], "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const app = applicationId(body.applicationId, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const domain = domainId(body.domainId, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const afterHead = body.afterHead === null ? null : digest(body.afterHead, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const registry = digest(body.expectedRegistryDigest, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const reducer = digest(body.expectedReducerDigest, "V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    if (app !== exactRequest.applicationId) fail("V124_REPLAY_RUNTIME_SOURCE_REQUEST_INVALID");
    const outer = closedRecord(wire, ["schema", "replay", "replayReceipt", "sourceArtifact"], "V124_REPLAY_RUNTIME_WIRE_INVALID");
    if (outer.schema !== "receiz.domain-replay-runtime-response.v124") fail("V124_REPLAY_RUNTIME_WIRE_INVALID");
    const replayRecord = closedRecord(outer.replay, ["schema", "status", "applicationId", "domainId", "registryDigest", "reducerDigest", "afterHead", "afterCursor", "cursor", "priorHead", "head", "namespace", "additions", "receiptDigest", "authority"], "V124_REPLAY_CLOSED_SHAPE_INVALID");
    if (!Array.isArray(replayRecord.additions)) fail("V124_REPLAY_CLOSED_SHAPE_INVALID");
    if (replayRecord.additions.length > 0) {
      const source = await readReceizDomainReplaySegmentSourceV124({
        artifact: outer.sourceArtifact as ReceizPortableSealedArtifactV124,
        expected: { applicationId: app, audience: exactRequest.audience, domainId: domain, expectedRegistryDigest: registry, expectedReducerDigest: reducer, afterHead },
      });
      if (!exactCanonicalEqual(source.replay, outer.replay) || !exactCanonicalEqual(source.replayReceipt, outer.replayReceipt)) fail("V124_REPLAY_RUNTIME_SOURCE_SUBSTITUTION");
      admission = freeze({ kind: "replay-segment" as const, requestDigest: exactRequest.requestDigest, source });
    } else {
      if (afterHead === null) fail("V124_REPLAY_RUNTIME_EMPTY_SOURCE_INVALID");
      const source = await readReceizDomainReplaySegmentSourceV124({
        artifact: outer.sourceArtifact as ReceizPortableSealedArtifactV124,
        expected: { applicationId: app, audience: exactRequest.audience, domainId: domain, expectedRegistryDigest: registry, expectedReducerDigest: reducer },
      });
      const replayReceipt = await parseReplayReceipt(outer.replayReceipt);
      const replay = await parseReplayProjection({ replay: outer.replay, receipt: replayReceipt, externalCausalParents: new Set() });
      if (replay.additions.length !== 0 || replay.afterHead !== afterHead || replay.priorHead !== source.replay.head
        || replay.head !== source.replay.head || replay.afterCursor !== source.replay.cursor
        || replay.cursor !== source.replay.cursor || replay.namespace.name !== source.replay.namespace.name
        || replay.namespace.head !== source.replay.namespace.head || replay.namespace.digest !== source.replay.namespace.digest) fail("V124_REPLAY_RUNTIME_EMPTY_SOURCE_INVALID");
      admission = freeze({ kind: "replay-no-additions" as const, requestDigest: exactRequest.requestDigest, source, replay, replayReceipt });
    }
  } else if (exactRequest.path === "/api/sdk/v1/domains/verified-checkpoint") {
    const body = closedRecord(exactRequest.body, ["applicationId", "domainId", "throughHead"], "V124_CHECKPOINT_RUNTIME_SOURCE_REQUEST_INVALID");
    const app = applicationId(body.applicationId, "V124_CHECKPOINT_RUNTIME_SOURCE_REQUEST_INVALID");
    const domain = domainId(body.domainId, "V124_CHECKPOINT_RUNTIME_SOURCE_REQUEST_INVALID");
    const throughHead = digest(body.throughHead, "V124_CHECKPOINT_RUNTIME_SOURCE_REQUEST_INVALID");
    if (app !== exactRequest.applicationId) fail("V124_CHECKPOINT_RUNTIME_SOURCE_REQUEST_INVALID");
    const outer = closedRecord(wire, ["schema", "checkpoint", "checkpointReceipt", "sourceArtifact"], "V124_CHECKPOINT_RUNTIME_WIRE_INVALID");
    if (outer.schema !== "receiz.domain-checkpoint-runtime-response.v124") fail("V124_CHECKPOINT_RUNTIME_WIRE_INVALID");
    const source = await readReceizDomainReplayCheckpointSourceV124({ artifact: outer.sourceArtifact as ReceizPortableSealedArtifactV124, expectedAudience: exactRequest.audience });
    if (source.checkpoint.applicationId !== app || source.checkpoint.domainId !== domain
      || source.checkpoint.throughHead !== throughHead
      || !exactCanonicalEqual(source.checkpoint, outer.checkpoint)
      || !exactCanonicalEqual(source.checkpointReceipt, outer.checkpointReceipt)) fail("V124_CHECKPOINT_RUNTIME_SOURCE_SUBSTITUTION");
    admission = freeze({ kind: "checkpoint" as const, requestDigest: exactRequest.requestDigest, source });
  } else if (exactRequest.path === "/api/sdk/v1/domains/verified-private-additions") {
    const body = closedRecord(exactRequest.body, ["applicationId", "domainId", "afterHead", "authoritySessionHandle", "accessGrantHandle", "expectedViewerSubjectId", "expectedViewerSubjectHead", "expectedGrantHead"], "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const app = applicationId(body.applicationId, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const world = domainId(body.domainId, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const afterHead = body.afterHead === null ? null : digest(body.afterHead, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const viewerSubjectId = text(body.expectedViewerSubjectId, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const viewerSubjectHead = digest(body.expectedViewerSubjectHead, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const grantHead = digest(body.expectedGrantHead, "V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    if (app !== exactRequest.applicationId) fail("V124_PRIVATE_RUNTIME_SOURCE_REQUEST_INVALID");
    const statusRecord = closedRecord(wire, Object.prototype.hasOwnProperty.call(wire, "sourceArtifact")
      ? ["schema", "status", "applicationId", "domainId", "afterHead", "afterCursor", "cursor", "priorHead", "head", "viewerSubjectId", "viewerSubjectHead", "grantHead", "accessKeyHead", "additions", "sourceArtifact", "viewerSubjectSourceArtifact", "accessGrantSourceArtifact", "authority"]
      : ["schema", "status"], "V124_PRIVATE_DOMAIN_CLOSED_SHAPE_INVALID");
    if (statusRecord.schema !== "receiz.private-domain-additions.v124") fail("V124_PRIVATE_DOMAIN_STATUS_INVALID");
    if (statusRecord.status === "not-found-or-not-authorized") {
      admission = freeze({ kind: "private-failure" as const, requestDigest: exactRequest.requestDigest });
    } else {
      if (statusRecord.status !== "authenticated" || !Array.isArray(statusRecord.additions)) fail("V124_PRIVATE_DOMAIN_STATUS_INVALID");
      const viewerSubjectSource = await readReceizViewerSubjectSourceV124(statusRecord.viewerSubjectSourceArtifact as ReceizPortableSealedArtifactV124);
      if (viewerSubjectSource.subjectState.subjectId !== viewerSubjectId
        || viewerSubjectSource.subjectState.head !== viewerSubjectHead
        || viewerSubjectSource.subjectState.accessKeyHead === null) fail("V124_PRIVATE_VIEWER_SUBJECT_SOURCE_MISMATCH");
      const accessGrantSource = await readReceizDomainReplaySegmentSourceV124({
        artifact: statusRecord.accessGrantSourceArtifact as ReceizPortableSealedArtifactV124,
        expected: { applicationId: app, audience: exactRequest.audience },
      });
      await accessGrantFromSource(accessGrantSource, { worldId: world, subjectId: viewerSubjectId, grantHead });
      const eventSource = await readReceizDomainReplaySegmentSourceV124({
        artifact: statusRecord.sourceArtifact as ReceizPortableSealedArtifactV124,
        expected: { applicationId: app, audience: exactRequest.audience, domainId: world, afterHead },
      });
      if (statusRecord.applicationId !== app || statusRecord.domainId !== world
        || statusRecord.afterHead !== afterHead || statusRecord.afterCursor !== eventSource.replay.afterCursor
        || statusRecord.cursor !== eventSource.replay.cursor || statusRecord.priorHead !== eventSource.replay.priorHead
        || statusRecord.head !== eventSource.replay.head || statusRecord.viewerSubjectId !== viewerSubjectId
        || statusRecord.viewerSubjectHead !== viewerSubjectHead || statusRecord.grantHead !== grantHead
        || statusRecord.accessKeyHead !== viewerSubjectSource.subjectState.accessKeyHead
        || statusRecord.additions.length !== eventSource.replay.additions.length) fail("V124_PRIVATE_EVENT_SOURCE_MISMATCH");
      for (let index = 0; index < eventSource.replay.additions.length; index += 1) {
        const projected = statusRecord.additions[index];
        const source = eventSource.replay.additions[index]!;
        if (projected === null || typeof projected !== "object" || Array.isArray(projected)) fail("V124_PRIVATE_EVENT_SOURCE_MISMATCH");
        const projectedRecord = projected as Readonly<Record<string, unknown>>;
        const additionKind = projectedRecord.additionKind;
        if (additionKind !== "public" && additionKind !== "private") fail("V124_PRIVATE_EVENT_SOURCE_MISMATCH");
        const item = closedRecord(projected, additionKind === "private" ? [
          "additionKind", "appendId", "sequence", "cursor", "exactPublicEventBytesB64u",
          "eventDigest", "priorHead", "newHead", "domainHead", "viewerSubjectId",
          "viewerSubjectHead", "grantHead", "accessKeyHead", "privateEnvelope",
          "recipientWrapDigest",
        ] : [
          "additionKind", "appendId", "sequence", "cursor", "exactPublicEventBytesB64u",
          "eventDigest", "priorHead", "newHead", "domainHead",
        ], "V124_PRIVATE_EVENT_SOURCE_MISMATCH");
        if (item.appendId !== source.appendId || item.sequence !== source.sequence || item.cursor !== source.cursor
          || item.exactPublicEventBytesB64u !== source.exactEventBytesB64u || item.eventDigest !== source.eventDigest
          || item.priorHead !== source.priorHead || item.newHead !== source.newHead || item.domainHead !== source.newHead) fail("V124_PRIVATE_EVENT_SOURCE_MISMATCH");
        const sourceEnvelopeDigest = await privateEnvelopeDigestFromAdditionV124(
          source,
          world,
        );
        if (additionKind === "public") {
          if (sourceEnvelopeDigest !== null) fail("V124_PRIVATE_ENVELOPE_SOURCE_SUBSTITUTION");
          continue;
        }
        if (sourceEnvelopeDigest === null || item.viewerSubjectId !== viewerSubjectId
          || item.viewerSubjectHead !== viewerSubjectHead || item.grantHead !== grantHead
          || item.accessKeyHead !== viewerSubjectSource.subjectState.accessKeyHead) {
          fail("V124_PRIVATE_ENVELOPE_SOURCE_SUBSTITUTION");
        }
        const recipientWrapDigest = digest(
          item.recipientWrapDigest,
          "V124_PRIVATE_ENVELOPE_SOURCE_SUBSTITUTION",
        );
        await bindPrivateEnvelopeProjectionV124({
          value: item.privateEnvelope,
          source,
          worldId: world,
          viewerSubjectId,
          accessKeyHead: viewerSubjectSource.subjectState.accessKeyHead,
          recipientWrapDigest,
        });
      }
      admission = freeze({ kind: "private" as const, requestDigest: exactRequest.requestDigest, eventSource, viewerSubjectSource, accessGrantSource });
    }
  } else if (exactRequest.path === "/api/sdk/v1/subjects/namespaces/resolve") {
    const body = closedRecord(exactRequest.body, [
      "subjectId",
      "atHead",
      "names",
      "expectedAdmittedProofDigest",
      "expectedOwnershipHead",
      "expectedRegistryDigest",
      "expectedReducerDigest",
    ], "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID");
    const subjectId = text(body.subjectId, "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID");
    const atHead = digest(body.atHead, "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID");
    let names: readonly string[];
    try {
      names = normalizeReceizNamespaceNamesV123(body.names as readonly string[]);
    } catch {
      return fail("V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID");
    }
    const expectedAdmittedProofDigest = digest(
      body.expectedAdmittedProofDigest,
      "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID",
    );
    const expectedOwnershipHead = digest(
      body.expectedOwnershipHead,
      "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID",
    );
    const expectedRegistryDigest = digest(
      body.expectedRegistryDigest,
      "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID",
    );
    const expectedReducerDigest = digest(
      body.expectedReducerDigest,
      "V124_NAMESPACES_RUNTIME_SOURCE_REQUEST_INVALID",
    );
    if (Object.prototype.hasOwnProperty.call(wire, "ok")) {
      const failure = wire as Readonly<Record<string, unknown>>;
      const hasCurrentHead = Object.prototype.hasOwnProperty.call(failure, "currentHead");
      const failureRecord = closedRecord(
        wire,
        hasCurrentHead ? ["ok", "code", "writes", "currentHead"] : ["ok", "code", "writes"],
        "V124_NAMESPACES_SOURCE_FAILURE_INVALID",
      );
      if (failureRecord.ok !== false || failureRecord.writes !== 0
        || !["SUBJECT_HEAD_STALE", "NOT_FOUND_OR_NOT_AUTHORIZED", "NAMESPACE_INPUT_INVALID"].includes(String(failureRecord.code))
        || (hasCurrentHead
          && (failureRecord.code !== "SUBJECT_HEAD_STALE"
            || digest(failureRecord.currentHead, "V124_NAMESPACES_SOURCE_FAILURE_INVALID").length !== 64))) {
        fail("V124_NAMESPACES_SOURCE_FAILURE_INVALID");
      }
      admission = freeze({
        kind: "namespace-failure" as const,
        requestDigest: exactRequest.requestDigest,
      });
    } else {
      const outer = closedRecord(wire, [
        "schema", "subjectId", "atHead", "admittedProofDigest", "ownershipHead",
        "registryDigest", "reducerDigest", "namespaces", "authority", "resolutionDigest",
        "sourceArtifact",
      ], "V124_NAMESPACES_SOURCE_WIRE_INVALID");
      const subjectSource = await readReceizSubjectSourceV124(
        outer.sourceArtifact as ReceizPortableSealedArtifactV124,
      );
      const state = subjectSource.subjectState;
      if (state.subjectId !== subjectId || state.head !== atHead
        || state.admittedProofDigest !== expectedAdmittedProofDigest
        || state.ownershipHead !== expectedOwnershipHead
        || state.registryDigest !== expectedRegistryDigest
        || state.reducerDigest !== expectedReducerDigest) {
        fail("V124_NAMESPACES_SOURCE_EXPECTATION_MISMATCH");
      }
      const projection = await projectReceizSubjectNamespacesV123(state, names);
      const {
        sourceArtifact: _sourceArtifact,
        ...wireProjection
      } = outer;
      if (!exactCanonicalEqual(wireProjection, projection)) {
        fail("V124_NAMESPACES_SOURCE_SUBSTITUTION");
      }
      admission = freeze({
        kind: "namespace" as const,
        requestDigest: exactRequest.requestDigest,
        subjectSource,
      });
    }
  } else {
    fail("V124_REPLAY_RUNTIME_SOURCE_ROUTE_UNSUPPORTED");
  }
  pendingRuntimeSourceAdmissions.set(wire, admission);
  return admission;
}

/** Single-use handoff into authenticated-runtime finalization. */
export function consumeReceizDomainReplayRuntimeSourceAdmissionV124(
  wire: unknown,
  requestDigest: string,
): ReceizDomainReplayRuntimeSourceAdmissionV124 {
  if (wire === null || typeof wire !== "object") fail("V124_REPLAY_RUNTIME_SOURCE_ADMISSION_REQUIRED");
  const admission = pendingRuntimeSourceAdmissions.get(wire);
  pendingRuntimeSourceAdmissions.delete(wire);
  if (!admission || admission.requestDigest !== digest(requestDigest, "V124_REPLAY_RUNTIME_SOURCE_ADMISSION_REQUIRED")) fail("V124_REPLAY_RUNTIME_SOURCE_ADMISSION_REQUIRED");
  return admission;
}

export function clearReceizDomainReplayRuntimeSourceAdmissionV124(wire: unknown): void {
  if (wire !== null && typeof wire === "object") pendingRuntimeSourceAdmissions.delete(wire);
}

function carrierCoordinates(carrier: ReceizDomainReplayProofCarrierV124 | ReceizDomainReplaySegmentProofCarrierV124 | ReceizDomainReplayCheckpointProofCarrierV124) {
  const source = carrier.schema === "receiz.domain-replay-segment-proof.v124" ? carrier.head : carrier.schema === "receiz.domain-replay-checkpoint-proof.v124" ? carrier.replayHead : carrier;
  return { applicationId: source.applicationId, domainId: source.domainId, registryDigest: source.registryDigest, reducerDigest: source.reducerDigest, head: source.head, cursor: source.cursor, namespace: source.namespace };
}
export async function createReceizDomainReplayProofObjectExportV124(carrier: ReceizDomainReplayProofCarrierV124 | ReceizDomainReplaySegmentProofCarrierV124 | ReceizDomainReplayCheckpointProofCarrierV124, portable: Readonly<{ ownership: ReceizPortableAssetDocument["ownership"]; provenance: ReceizPortableAssetDocument["provenance"]; settlement: Readonly<Record<string, PortableJson>> }>): Promise<ReceizDomainReplayProofObjectExportV124> {
  const coordinates = carrierCoordinates(carrier), carrierBytes = new TextEncoder().encode(canonicalizeReceizV122(carrier));
  const portableAsset = await createReceizPortableAssetDocument({ assetType: "proof_object", payload: { mimeType: RECEIZ_V124_DOMAIN_REPLAY_PROOF_CARRIER_MIME, bytes: carrierBytes }, ownership: portable.ownership, provenance: portable.provenance, settlement: portable.settlement });
  const portableBytes = new TextEncoder().encode(canonicalizeReceizV122(portableAsset));
  // Uint8Array cannot be frozen in current JavaScript runtimes. The export is
  // explicitly non-authoritative; exact bytes acquire custody only after the
  // caller seals them into an admitted artifact.
  return Object.freeze({
    schema: "receiz.domain-replay-proof-object-export.v124" as const,
    applicationId: coordinates.applicationId,
    domainId: coordinates.domainId,
    registryDigest: coordinates.registryDigest,
    reducerDigest: coordinates.reducerDigest,
    throughHead: coordinates.head,
    cursor: coordinates.cursor,
    namespace: coordinates.namespace,
    portableAssetDigest: await digestReceizCanonicalV122(portableAsset),
    proofObject: Object.freeze({
      assetType: "proof_object" as const,
      payload: Object.freeze({
        mimeType: RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME,
        bytes: portableBytes,
      }),
    }),
    authority: freeze({
      exportIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

function parseCandidatePortableV124(
  value: unknown,
): ReceizProofObjectCandidatePortableV124 {
  const record = closedRecord(
    value,
    ["ownership", "provenance", "settlement"],
    "V124_REPLAY_PROOF_CANDIDATE_PORTABLE_INVALID",
  );
  return freeze({
    ownership: structuredClone(record.ownership) as ReceizPortableAssetDocument["ownership"],
    provenance: structuredClone(record.provenance) as ReceizPortableAssetDocument["provenance"],
    settlement: structuredClone(record.settlement) as Readonly<Record<string, PortableJson>>,
  });
}

async function createProofObjectCandidatePayloadV124(
  carrier: ReceizViewerSubjectSourceCarrierV124
    | ReceizDomainReplaySegmentProofCarrierV124
    | ReceizDomainReplayCheckpointProofCarrierV124,
  portableValue: unknown,
): Promise<Readonly<{
  portable: ReceizProofObjectCandidatePortableV124;
  portableAssetDigest: string;
  proofObject: ReceizProofObjectCandidatePayloadV124;
}>> {
  const portable = parseCandidatePortableV124(portableValue);
  const carrierBytes = new TextEncoder().encode(canonicalizeReceizV122(carrier));
  const portableAsset = await createReceizPortableAssetDocument({
    assetType: "proof_object",
    payload: {
      mimeType: RECEIZ_V124_DOMAIN_REPLAY_PROOF_CARRIER_MIME,
      bytes: carrierBytes,
    },
    ownership: portable.ownership,
    provenance: portable.provenance,
    settlement: portable.settlement,
  });
  const portableBytes = new TextEncoder().encode(canonicalizeReceizV122(portableAsset));
  return Object.freeze({
    portable,
    portableAssetDigest: await digestReceizCanonicalV122(portableAsset),
    proofObject: Object.freeze({
      assetType: "proof_object" as const,
      payload: Object.freeze({
        mimeType: RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME,
        bytes: portableBytes,
      }),
    }),
  });
}

/**
 * Prepares exact portable bytes for the existing Record+Seal primitive.
 * The returned candidate is deliberately unsealed and carries no authority.
 */
export async function prepareReceizSubjectSourceProofObjectCandidateV124(
  input: ReceizSubjectSourceProofObjectCandidateInputV124,
): Promise<ReceizSubjectSourceProofObjectCandidateV124> {
  const record = closedRecord(
    input,
    ["subjectState", "portable"],
    "V124_SUBJECT_SOURCE_CANDIDATE_INPUT_INVALID",
  );
  const rawState = structuredClone(record.subjectState) as ReceizSubjectStateV122;
  const stateDigest = digest(
    (rawState as unknown as Readonly<Record<string, unknown>>).stateDigest,
    "V124_SUBJECT_SOURCE_CANDIDATE_INVALID",
  );
  const state = await parsePinnedSubjectStateV124(
    rawState,
    stateDigest,
    "V124_SUBJECT_SOURCE_CANDIDATE_INVALID",
  );
  const portable = parseCandidatePortableV124(record.portable);
  if (portable.ownership.ownerReceizId !== state.ownerReceizId) {
    fail("V124_SUBJECT_SOURCE_CANDIDATE_OWNER_MISMATCH");
  }
  const stateBytes = new TextEncoder().encode(canonicalizeReceizV122(state));
  const carrier: ReceizViewerSubjectSourceCarrierV124 = freeze({
    schema: "receiz.viewer-subject-source.v124" as const,
    subjectId: state.subjectId,
    proofObjectId: state.proofObjectId,
    ownerReceizId: state.ownerReceizId,
    head: state.head,
    accessKeyHead: state.accessKeyHead,
    exactSubjectStateBytesB64u: receizBase64UrlEncode(stateBytes),
    subjectStateDigest: state.stateDigest,
    authority: freeze({
      carrierIsSubjectAuthority: false as const,
      projectionIsSubjectAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const candidate = await createProofObjectCandidatePayloadV124(carrier, portable);
  return Object.freeze({
    schema: "receiz.subject-source-proof-object-candidate.v124" as const,
    carrier,
    portableAssetDigest: candidate.portableAssetDigest,
    proofObject: candidate.proofObject,
    authority: freeze({
      candidateIsSubjectAuthority: false as const,
      sealed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/**
 * Builds one bounded replay-page candidate from exact replay coordinates and
 * independently checkable sparse/Fibonacci witnesses. The candidate must be
 * sealed and pinned-admitted before it can establish replay custody.
 */
export async function prepareReceizDomainReplaySegmentProofObjectCandidateV124(
  input: ReceizDomainReplaySegmentProofObjectCandidateInputV124,
): Promise<ReceizDomainReplaySegmentProofObjectCandidateV124> {
  const record = closedRecord(input, [
    "replay", "replayReceipt", "journalAppends", "authoringEvidence",
    "sourceAuthority", "kai", "predecessorArtifact",
    "insertionWitnesses", "causalParentWitnesses", "fibonacci", "fibonacciWitnesses",
    "portable",
  ], "V124_REPLAY_SEGMENT_CANDIDATE_INPUT_INVALID");
  if (!Array.isArray(record.journalAppends)
    || !Array.isArray(record.insertionWitnesses)
    || !Array.isArray(record.causalParentWitnesses)
    || !Array.isArray(record.fibonacciWitnesses)) {
    fail("V124_REPLAY_SEGMENT_CANDIDATE_INPUT_INVALID");
  }
  const portable = parseCandidatePortableV124(record.portable);
  const causalParentWitnesses = record.causalParentWitnesses.map(
    parseReceizDomainReplayAppendIndexWitnessV124,
  );
  const externalCausalParents = new Set(
    causalParentWitnesses.map((witness) => witness.appendId),
  );
  const replayReceipt = await parseReplayReceipt(record.replayReceipt);
  const replay = await parseReplayProjection({
    replay: record.replay,
    receipt: replayReceipt,
    externalCausalParents,
  });
  if (replay.additions.length < 1
    || replay.additions.length > RECEIZ_V124_DOMAIN_REPLAY_SEGMENT_CAPACITY) {
    fail("V124_REPLAY_PROOF_SEGMENT_CAPACITY_EXCEEDED");
  }
  const kai = parseReceizDomainReplayKaiV124(record.kai);
  const sourceAuthority = await parseReceizDomainReplaySourceAuthorityV124(
    record.sourceAuthority,
    portable,
  );
  if (sourceAuthority.applicationId !== replay.applicationId
    || sourceAuthority.domainId !== replay.domainId
    || sourceAuthority.acceptedHead !== replay.head) {
    fail("V124_REPLAY_SOURCE_AUTHORITY_BINDING_MISMATCH");
  }

  let predecessorSource: ReceizPinnedDomainReplaySegmentHeadV124 | null = null;
  if (record.predecessorArtifact !== null) {
    const predecessorArtifact = parseReceizPortableReplaySourceArtifactV124(
      record.predecessorArtifact,
    );
    predecessorSource = await openReceizPinnedDomainReplaySegmentHeadV124(
      predecessorArtifact,
      {
        applicationId: replay.applicationId,
        audience: sourceAuthority.audience,
        domainId: replay.domainId,
        expectedRegistryDigest: replay.registryDigest,
        expectedReducerDigest: replay.reducerDigest,
      },
    );
  }
  const segmentIndex = (predecessorSource?.head.segmentCount ?? 0) + 1;
  const genesisHead = predecessorSource?.head.genesisHead ?? replay.priorHead;
  if (predecessorSource === null) {
    if (replay.afterHead !== null || replay.afterCursor !== 0) {
      fail("V124_REPLAY_PROOF_GENESIS_MISMATCH");
    }
  } else if (replay.afterHead !== predecessorSource.head.head
    || replay.priorHead !== predecessorSource.head.head
    || replay.afterCursor !== predecessorSource.head.cursor
    || kai.uPulse < predecessorSource.head.kai.uPulse) {
    fail("V124_REPLAY_PROOF_PREDECESSOR_MISMATCH");
  }
  const proofObjectId = deriveReceizDomainReplayProofObjectIdV124({
    applicationId: replay.applicationId,
    domainId: replay.domainId,
    registryDigest: replay.registryDigest,
    reducerDigest: replay.reducerDigest,
    genesisHead,
  });

  const priorIndexRoot = predecessorSource?.head.appendIndexRoot
    ?? createEmptyReceizDomainReplayAppendIndexRootV124();
  const priorIndexCount = predecessorSource?.head.appendIndexCount ?? 0;
  const insertionWitnesses: ReceizDomainReplayAppendIndexWitnessV124[] = [];
  let appendIndexRoot = priorIndexRoot;
  for (let index = 0; index < replay.additions.length; index += 1) {
    const addition = replay.additions[index]!;
    const checked = verifyReceizDomainReplayAppendIndexWitnessV124({
      witness: record.insertionWitnesses[index],
      expectedRoot: appendIndexRoot,
      expectedAppendId: addition.appendId,
      expectedValue: null,
      insertValue: {
        eventDigest: addition.eventDigest,
        cursor: addition.cursor,
        newHead: addition.newHead,
      },
    });
    insertionWitnesses.push(checked.witness);
    appendIndexRoot = checked.resultingRoot;
  }
  if (record.insertionWitnesses.length !== replay.additions.length
    || priorIndexCount + replay.additions.length !== replay.cursor) {
    fail("V124_REPLAY_APPEND_INDEX_WITNESS_MISMATCH");
  }

  const pageIds = new Set<string>();
  const requiredExternalParents = new Set<string>();
  for (const addition of replay.additions) {
    for (const parent of addition.causalParents) {
      if (!pageIds.has(parent)) requiredExternalParents.add(parent);
    }
    pageIds.add(addition.appendId);
  }
  if (requiredExternalParents.size !== causalParentWitnesses.length
    || new Set(causalParentWitnesses.map((witness) => witness.appendId)).size
      !== causalParentWitnesses.length) {
    fail("V124_REPLAY_CAUSAL_PARENT_WITNESS_MISMATCH");
  }
  for (const witness of causalParentWitnesses) {
    if (!requiredExternalParents.has(witness.appendId) || witness.value === null) {
      fail("V124_REPLAY_CAUSAL_PARENT_WITNESS_MISMATCH");
    }
    verifyReceizDomainReplayAppendIndexWitnessV124({
      witness,
      expectedRoot: priorIndexRoot,
      expectedAppendId: witness.appendId,
      expectedValue: witness.value,
    });
  }
  const journalAppends = await parseReceizDomainAppendCommandsV124({
    values: record.journalAppends,
    replay,
    kai,
    causalParentWitnesses,
  });
  const sourceIntent = await createReceizDomainReplaySourceIntentV124({
    applicationId: replay.applicationId,
    audience: sourceAuthority.audience,
    domainId: replay.domainId,
    registryDigest: replay.registryDigest,
    reducerDigest: replay.reducerDigest,
    acceptedHead: replay.head,
    sourceKai: kai,
    predecessorArtifactSha256: predecessorSource?.artifactSha256 ?? null,
    replay,
    replayReceipt,
    journalAppends,
    causalParentWitnesses,
    sourceAuthority,
    ownership: portable.ownership,
    provenance: portable.provenance,
  });
  const authoringEvidence = await parseReceizDomainReplaySourceAuthoringEvidenceV124(
    record.authoringEvidence,
    sourceIntent,
  );

  const child: ReceizDomainReplayProofSegmentChildV124 = freeze({
    schema: "receiz.domain-replay-page-segment.v124" as const,
    proofObjectId,
    segmentIndex,
    kai,
    sourceAuthority,
    authoringEvidence,
    replay,
    replayReceipt,
    journalAppends,
    insertionWitnesses: freeze(insertionWitnesses),
    causalParentWitnesses: freeze(causalParentWitnesses),
    authority: freeze({
      segmentIsProofAuthority: false as const,
      witnessIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const exactSegmentBytes = new TextEncoder().encode(canonicalizeReceizV122(child));
  const segmentBytesDigest = await sha256ReceizBytes(exactSegmentBytes);
  const eventTree = buildReceizCompositeBoundedTree(
    replay.additions.map(deriveReceizDomainReplaySegmentEventLeafV124),
  );
  const segmentBasis = freeze({
    segmentIndex,
    startCursor: replay.afterCursor,
    endCursor: replay.cursor,
    additionCount: replay.additions.length,
    eventRoot: eventTree.root,
    segmentBytesDigest,
  });
  const segmentId = deriveReceizDomainReplaySegmentIdV124({
    proofObjectId,
    ...segmentBasis,
  });
  const segment: ReceizDomainReplayProofSegmentCommitmentV124 = freeze({
    schema: "receiz.domain-replay-page-segment-commitment.v124" as const,
    ...segmentBasis,
    segmentId,
    exactSegmentBytesB64u: receizBase64UrlEncode(exactSegmentBytes),
  });
  const segmentAccumulator = appendReceizDomainReplaySegmentAccumulatorV124(
    predecessorSource?.head.segmentAccumulator
      ?? createEmptyReceizDomainReplaySegmentAccumulatorV124(),
    segmentId,
  );
  const fibonacci = parseFibonacci(record.fibonacci, segmentIndex);
  const priorFibonacciByOperation = new Map(
    predecessorSource?.head.fibonacci.checkpoints.map((checkpoint) => [
      checkpoint.operationCount,
      checkpoint.artifactDigest,
    ]) ?? [],
  );
  const neededFibonacci = new Map<number, string>();
  for (const checkpoint of fibonacci.checkpoints) {
    const direct = predecessorSource
      && checkpoint.operationCount === predecessorSource.head.segmentCount
      ? predecessorSource.artifactSha256
      : undefined;
    const retained = priorFibonacciByOperation.get(checkpoint.operationCount);
    const expectedArtifact = direct ?? retained;
    if (expectedArtifact !== undefined) {
      if (checkpoint.artifactDigest !== expectedArtifact) {
        fail("V124_REPLAY_FIBONACCI_REFERENCE_MISMATCH");
      }
    } else {
      neededFibonacci.set(checkpoint.operationCount, checkpoint.artifactDigest);
    }
  }
  if (record.fibonacciWitnesses.length !== neededFibonacci.size) {
    fail("V124_REPLAY_FIBONACCI_WITNESS_MISMATCH");
  }
  const seenFibonacci = new Set<number>();
  const fibonacciWitnesses = record.fibonacciWitnesses.map((candidate) => {
    const candidateRecord = closedRecord(candidate, [
      "schema", "segmentPosition", "segmentId", "artifactSha256", "peakLevel", "siblings",
    ], "V124_REPLAY_FIBONACCI_WITNESS_INVALID");
    const position = safeCount(
      candidateRecord.segmentPosition,
      "V124_REPLAY_FIBONACCI_WITNESS_INVALID",
    );
    const expectedArtifact = neededFibonacci.get(position);
    if (expectedArtifact === undefined || seenFibonacci.has(position)) {
      fail("V124_REPLAY_FIBONACCI_WITNESS_MISMATCH");
    }
    seenFibonacci.add(position);
    return verifyReceizDomainReplayFibonacciWitnessV124({
      witness: candidate,
      accumulator: segmentAccumulator,
      expectedOperationCount: position,
      expectedArtifactSha256: expectedArtifact,
    });
  });

  const head = createReceizDomainReplayProofHeadV124({
    proofObjectId,
    applicationId: replay.applicationId,
    domainId: replay.domainId,
    registryDigest: replay.registryDigest,
    reducerDigest: replay.reducerDigest,
    genesisHead,
    kai,
    head: replay.head,
    cursor: replay.cursor,
    namespace: freeze({
      name: replay.namespace.name,
      head: replay.namespace.head,
      digest: replay.namespace.digest,
    }),
    segmentCount: segmentIndex,
    segmentAccumulator,
    appendIndexRoot,
    appendIndexCount: priorIndexCount + replay.additions.length,
    fibonacci,
    priorSourceArtifactSha256: predecessorSource?.artifactSha256 ?? null,
    priorSourceSegmentDigest: predecessorSource?.head.currentSourceSegmentDigest ?? null,
    currentSourceSegmentDigest: segmentBytesDigest,
    currentSegment: freeze({ ...segmentBasis, segmentId }),
  });
  const carrier: ReceizDomainReplaySegmentProofCarrierV124 = freeze({
    schema: "receiz.domain-replay-segment-proof.v124" as const,
    proofObjectId,
    applicationId: replay.applicationId,
    domainId: replay.domainId,
    registryDigest: replay.registryDigest,
    reducerDigest: replay.reducerDigest,
    predecessor: predecessorSource === null ? null : freeze({
      artifactSha256: predecessorSource.artifactSha256,
      head: predecessorSource.head,
    }),
    segment,
    fibonacciWitnesses: freeze(fibonacciWitnesses),
    head,
    authority: freeze({
      carrierIsProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const candidate = await createProofObjectCandidatePayloadV124(carrier, portable);
  return Object.freeze({
    schema: "receiz.domain-replay-segment-proof-object-candidate.v124" as const,
    carrier,
    portableAssetDigest: candidate.portableAssetDigest,
    proofObject: candidate.proofObject,
    authority: freeze({
      candidateIsProofAuthority: false as const,
      sealed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/** Builds an unsealed checkpoint candidate bound to one exact pinned replay source. */
export async function prepareReceizDomainReplayCheckpointProofObjectCandidateV124(
  input: ReceizDomainReplayCheckpointProofObjectCandidateInputV124,
): Promise<ReceizDomainReplayCheckpointProofObjectCandidateV124> {
  const record = closedRecord(input, [
    "replaySourceArtifact", "replayPredecessorArtifact", "expectedAudience",
    "checkpoint", "checkpointReceipt", "portable",
  ], "V124_CHECKPOINT_SOURCE_CANDIDATE_INPUT_INVALID");
  const expectedAudience = text(
    record.expectedAudience,
    "V124_CHECKPOINT_SOURCE_CANDIDATE_INPUT_INVALID",
  );
  const checkpointReceipt = await parseCheckpointReceipt(record.checkpointReceipt);
  const checkpoint = await parseCheckpointProjection(record.checkpoint, checkpointReceipt);
  const replaySourceArtifact = parseReceizPortableReplaySourceArtifactV124(
    record.replaySourceArtifact,
  );
  const replayCoordinate = await inspectReceizDomainReplaySegmentSourceCoordinateV124(
    replaySourceArtifact,
  );
  const replayPredecessorArtifact = record.replayPredecessorArtifact === null
    ? null
    : parseReceizPortableReplaySourceArtifactV124(
      record.replayPredecessorArtifact,
    );
  if ((replayCoordinate.predecessorArtifactSha256 === null)
      !== (replayPredecessorArtifact === null)) {
    fail("V124_CHECKPOINT_SOURCE_PREDECESSOR_ARTIFACT_REQUIRED");
  }
  const replaySource = await readReceizDomainReplaySegmentSourceV124({
    artifact: replaySourceArtifact,
    ...(replayPredecessorArtifact === null
      ? {}
      : { predecessorArtifact: replayPredecessorArtifact }),
    expected: {
      applicationId: checkpoint.applicationId,
      audience: expectedAudience,
      domainId: checkpoint.domainId,
      expectedRegistryDigest: checkpoint.registryDigest,
      expectedReducerDigest: checkpoint.reducerDigest,
    },
  });
  if (checkpoint.throughHead !== replaySource.head.head
    || checkpoint.cursor !== replaySource.head.cursor
    || !exactCanonicalEqual(checkpoint.namespace, replaySource.replay.namespace)) {
    fail("V124_CHECKPOINT_SOURCE_REPLAY_SUBSTITUTION");
  }
  const portable = parseCandidatePortableV124(record.portable);
  await parseReceizDomainReplaySourceAuthorityV124(
    replaySource.sourceAuthority,
    portable,
  );
  const carrier: ReceizDomainReplayCheckpointProofCarrierV124 = freeze({
    schema: "receiz.domain-replay-checkpoint-proof.v124" as const,
    proofObjectId: replaySource.head.proofObjectId,
    applicationId: replaySource.head.applicationId,
    domainId: replaySource.head.domainId,
    registryDigest: replaySource.head.registryDigest,
    reducerDigest: replaySource.head.reducerDigest,
    kai: replaySource.head.kai,
    sourceAuthority: replaySource.sourceAuthority,
    replaySourceArtifact,
    replaySourceArtifactSha256: replaySource.artifactSha256,
    replayHead: replaySource.head,
    checkpoint,
    checkpointReceipt,
    currentSourceSegmentDigest: replaySource.head.currentSourceSegmentDigest,
    authority: freeze({
      carrierIsProofAuthority: false as const,
      checkpointIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const candidate = await createProofObjectCandidatePayloadV124(carrier, portable);
  return Object.freeze({
    schema: "receiz.domain-replay-checkpoint-proof-object-candidate.v124" as const,
    carrier,
    portableAssetDigest: candidate.portableAssetDigest,
    proofObject: candidate.proofObject,
    authority: freeze({
      candidateIsProofAuthority: false as const,
      sealed: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}
