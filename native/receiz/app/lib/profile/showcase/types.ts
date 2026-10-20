import type {
  ReceizArtifactDigest,
  ReceizHistoryDigest,
  ReceizVerifiedActorReference,
  ReceizVerifiedArtifactAdmission,
} from "../../../../packages/receiz-sdk/src/index";

export type ProfileShowcaseArtifactId = `profile-showcase:${string}`;

export type ProfileShowcaseOperationKind =
  | "showcase.append"
  | "showcase.visibility.set"
  | "showcase.presentation.pin"
  | "showcase.presentation.unpin"
  | "showcase.order.supersede"
  | "showcase.section.assign"
  | "showcase.provenance.bind"
  | "showcase.merge";

export type ProfileShowcaseAuthority = Readonly<{
  showcaseIsProofAuthority: true;
  strongerTruth: "sealed-receiz-proof-object";
  historyIsProofAuthority: false;
  projectionIsProofAuthority: false;
}>;

export type ProfileShowcaseChildAuthority = Readonly<{
  childIsProofAuthority: true;
  strongerTruth: "sealed-receiz-proof-object";
  admissionIsProofAuthority: false;
}>;

export type ProfileShowcaseAdmittedChild = Readonly<{
  childArtifactDigest: ReceizArtifactDigest;
  admission: ReceizVerifiedArtifactAdmission;
  actor: ReceizVerifiedActorReference;
  authority: ProfileShowcaseChildAuthority;
}>;

export type ProfileShowcasePayload = Readonly<{
  primitive: "sealed composite proof object";
  artifactId: ProfileShowcaseArtifactId;
  acceptedHistoryHead: ReceizHistoryDigest | null;
  admittedChildren: readonly ProfileShowcaseAdmittedChild[];
  authority: ProfileShowcaseAuthority;
}>;

export const PROFILE_SHOWCASE_PRIMITIVE_NAME = "sealed composite proof object" as const;

export type ProfileShowcaseKaiCoordinate = Readonly<{
  upulse: string;
}>;

export type ProfileShowcaseChildKey = Readonly<{
  stableChildArtifactId: string;
  immutableVersion: string;
  childArtifactDigest: string;
}>;

export type ProfileShowcaseChildReference = ProfileShowcaseChildKey & Readonly<{
  admissionEvidenceRoot: string;
  contentDigest: string;
}>;

type ProfileShowcaseOperationCommonV1 = Readonly<{
  schema: "receiz.profile-showcase.operation.v1";
  parentArtifactDigest: string | null;
  priorCommittedCount: number;
  directDeltaPosition: number;
  kai: ProfileShowcaseKaiCoordinate;
  operationDigest: string;
  authorityEvidenceRoot: string;
}>;

export type ProfileShowcaseOperationV1 =
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.append";
      child: ProfileShowcaseChildReference;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.visibility.set";
      child: ProfileShowcaseChildKey;
      visibility: "visible" | "unlisted" | "hidden";
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.presentation.pin";
      child: ProfileShowcaseChildKey;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.presentation.unpin";
      child: ProfileShowcaseChildKey;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.order.supersede";
      child: ProfileShowcaseChildKey;
      afterChild: ProfileShowcaseChildKey | null;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.section.assign";
      child: ProfileShowcaseChildKey;
      sectionId: string | null;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.provenance.bind";
      child: ProfileShowcaseChildKey;
      provenanceEvidenceRoot: string;
    }>)
  | (ProfileShowcaseOperationCommonV1 & Readonly<{
      kind: "showcase.merge";
      mergedParentArtifactDigests: readonly string[];
      mergedChildren: readonly ProfileShowcaseChildReference[];
      reconciliationEvidenceRoot: string;
    }>);

export type ProfileShowcaseMerkleState = Readonly<{
  algorithm: "sha256/binary-carry/v1";
  leafCount: number;
  root: string;
  frontier: readonly (string | null)[];
  authority: ProfileShowcaseMerkleMechanicsAuthority;
}>;

export type ProfileShowcaseMerkleMechanicsAuthority = Readonly<{
  merkleIsProofAuthority: false;
  rootIsProofAuthority: false;
  frontierIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  admissionStatus: "requires-sealed-showcase-artifact";
}>;

export type ProfileShowcaseFibonacciCheckpoint = Readonly<{
  distance: number;
  operationCount: number;
  artifactDigest: string;
}>;

export type ProfileShowcaseFibonacciState = Readonly<{
  basis: "sparse-checkpoint/v1";
  operationCount: number;
  checkpoints: readonly ProfileShowcaseFibonacciCheckpoint[];
  authority: ProfileShowcaseFibonacciMechanicsAuthority;
}>;

export type ProfileShowcaseFibonacciMechanicsAuthority = Readonly<{
  fibonacciIsProofAuthority: false;
  checkpointIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  resolutionStatus: "requires-already-verified-sealed-head-references";
}>;

export type ProfileShowcaseFibonacciReferenceMechanicsAuthority = Readonly<{
  referenceIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  custodyStatus: "already-held-verified-sealed-head";
}>;

export type ProfileShowcaseFibonacciBoundaryRequest = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  operationCount: number;
}>;

export type ProfileShowcaseFibonacciHeadReference = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  operationCount: number;
  artifactDigest: string;
  authority: ProfileShowcaseFibonacciReferenceMechanicsAuthority;
}>;

export type ProfileShowcaseFibonacciBoundaryResolver = (
  request: ProfileShowcaseFibonacciBoundaryRequest,
) => ProfileShowcaseFibonacciHeadReference | null;

export type ProfileShowcaseSegmentCommitment = Readonly<{
  segmentId: string;
  startOperationCount: number;
  endOperationCount: number;
  operationCount: number;
  root: string;
  authority: ProfileShowcaseCommitmentMechanicsAuthority;
}>;

export type ProfileShowcaseCommitmentMechanicsAuthority = Readonly<{
  segmentIsProofAuthority: false;
  rootIsProofAuthority: false;
  witnessIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  admissionStatus: "requires-sealed-showcase-artifact";
}>;

export type ProfileShowcaseMerkleSibling = Readonly<{
  side: "left" | "right";
  digest: string;
}>;

export type ProfileShowcaseMembershipWitness = Readonly<{
  schema: "receiz.profile-showcase.membership-witness.v1";
  segmentId: string;
  segmentBytesDigest: string;
  startOperationCount: number;
  endOperationCount: number;
  operationCount: number;
  operationPosition: number;
  leafIndex: number;
  leafDigest: string;
  siblings: readonly ProfileShowcaseMerkleSibling[];
  authority: ProfileShowcaseCommitmentMechanicsAuthority;
}>;

export type ProfileShowcaseCommittedSegment = Readonly<{
  schema: "receiz.profile-showcase.segment.v1";
  commitment: ProfileShowcaseSegmentCommitment;
  bytes: Uint8Array;
  operations: readonly ProfileShowcaseOperationV1[];
  membershipWitnesses: readonly ProfileShowcaseMembershipWitness[];
  authority: ProfileShowcaseCommitmentMechanicsAuthority;
}>;

export type ProfileShowcaseBoundedParentHeadV114 = Readonly<{
  artifactDigest: string;
  historyHeadDigest: string;
  headKaiUpulse: string;
  operationCount: number;
  stateRoot: string;
}>;

export type ProfileShowcaseBoundedWindowChildV114 = Readonly<{
  reference: ProfileShowcaseChildReference;
  membershipWitness: ProfileShowcaseMembershipWitness;
}>;

export type ProfileShowcaseFirstPaintWindowV114 = Readonly<{
  schema: "receiz.profile-showcase.first-paint-window.v114";
  startVisibleIndex: 0;
  endVisibleIndex: number;
  totalVisibleCount: number;
  children: readonly ProfileShowcaseBoundedWindowChildV114[];
  continuation: Readonly<{
    nextVisibleIndex: number;
    afterChild: ProfileShowcaseChildKey;
    segmentId: string;
    segmentStartOperationCount: number;
    checkpoint: Readonly<{
      operationCount: number;
      artifactDigest: string;
    }> | null;
    merkleRoot: string;
  }> | null;
  commitmentDigest: string;
}>;

export type ProfileShowcaseBoundedHeadV114 = Readonly<{
  schema: "receiz.profile-showcase-head.v114";
  artifactId: ProfileShowcaseArtifactId;
  ownerReceizIdentity: string;
  profileIdentity: string;
  headKaiUpulse: string;
  parentHeads: readonly ProfileShowcaseBoundedParentHeadV114[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directDelta: readonly ProfileShowcaseOperationV1[];
  currentStateRoot: string;
  merkle: Omit<ProfileShowcaseMerkleState, "authority">;
  fibonacci: Omit<ProfileShowcaseFibonacciState, "authority">;
  segmentWindow: readonly Omit<ProfileShowcaseSegmentCommitment, "authority">[];
  counts: ProfileShowcaseCounts;
  firstPaintWindow: ProfileShowcaseFirstPaintWindowV114;
  versions: Readonly<{
    registryDigest: string;
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.profile-showcase.verifier.v114";
  }>;
  authority: ProfileShowcaseAuthority;
}>;

export type ProfileShowcaseCounts = Readonly<{
  operationCount: number;
  membershipCount: number;
  visibleCount: number;
  hiddenCount: number;
  unlistedCount: number;
  pinnedCount: number;
}>;

export type ProfileShowcaseFirstPaintWindowAuthority = Readonly<{
  windowIsProofAuthority: false;
  projectionIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  bindingStatus: "sealed-in-showcase-head";
}>;

export type ProfileShowcaseFirstPaintWindow = Readonly<{
  schema: "receiz.profile-showcase.first-paint-window.v1";
  startVisibleIndex: 0;
  endVisibleIndex: number;
  totalVisibleCount: number;
  children: readonly ProfileShowcaseChildKey[];
  continuation: Readonly<{
    nextVisibleIndex: number;
    afterChild: ProfileShowcaseChildKey;
    segmentId: string;
    segmentStartOperationCount: number;
    checkpoint: Readonly<{
      operationCount: number;
      artifactDigest: string;
    }> | null;
    merkleRoot: string;
  }> | null;
  commitmentDigest: string;
  authority: ProfileShowcaseFirstPaintWindowAuthority;
}>;

export type ProfileShowcaseVersionBindings = Readonly<{
  ordering: "parent/prior-count/delta/kai/operation/child.v1";
  projectionSchemaVersion: string;
  verifierVersion: string;
  kernelVersion: string;
  registryVersion: string;
  operationMatrixVersion: string;
  registryDigest: string;
  operationRegistryDigest: string;
}>;

export type ProfileShowcasePayloadV1 = Readonly<{
  schema: "receiz.profile-showcase.v1";
  artifactId: ProfileShowcaseArtifactId;
  ownerReceizIdentity: string;
  profileIdentity: string;
  headKaiUpulse: string;
  parentArtifactDigests: readonly string[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directOperations: readonly ProfileShowcaseOperationV1[];
  currentStateRoot: string;
  merkle: ProfileShowcaseMerkleState;
  fibonacci: ProfileShowcaseFibonacciState;
  segments: readonly ProfileShowcaseSegmentCommitment[];
  counts: ProfileShowcaseCounts;
  firstPaintWindow: ProfileShowcaseFirstPaintWindow;
  proofHistoryEvidenceRoots: readonly string[];
  versions: ProfileShowcaseVersionBindings;
  authority: ProfileShowcaseAuthority;
}>;

export type ProfileShowcaseVisibility = "visible" | "unlisted" | "hidden";

export type ProfileShowcasePlacement = Readonly<{
  placementKey: string;
  child: ProfileShowcaseChildReference;
  membershipOperationDigest: string;
  visibility: ProfileShowcaseVisibility;
  pinned: boolean;
  sectionId: string | null;
  provenanceEvidenceRoots: readonly string[];
  presentationOperationDigests: readonly string[];
}>;

export type ProfileShowcaseMembershipHistoryEntry = Readonly<{
  kind: "showcase.append" | "showcase.merge";
  operationDigest: string;
  child: ProfileShowcaseChildReference;
}>;

export type ProfileShowcaseFoldState = Readonly<{
  placements: readonly ProfileShowcasePlacement[];
  membershipHistory: readonly ProfileShowcaseMembershipHistoryEntry[];
  sealedOperations: readonly ProfileShowcaseOperationV1[];
  authority: ProfileShowcaseFoldMechanicsAuthority;
}>;

/**
 * The fold is a deterministic projection mechanic only. Task 4 must bind an
 * SDK-custodied ReceizArtifactAppendPlan and its verified capability before any
 * resulting state can be treated as admitted showcase proof.
 */
export type ProfileShowcaseFoldMechanicsAuthority = Readonly<{
  foldIsProofAuthority: false;
  membershipIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
  authorizationStatus: "requires-artifact-append-plan-and-verified-capability";
}>;

export type ProfileShowcaseFoldMechanicsInput = Readonly<{
  prior: ProfileShowcaseFoldState;
  operations: readonly ProfileShowcaseOperationV1[];
}>;

export const PROFILE_SHOWCASE_OPERATION_KINDS = [
  "showcase.append",
  "showcase.visibility.set",
  "showcase.presentation.pin",
  "showcase.presentation.unpin",
  "showcase.order.supersede",
  "showcase.section.assign",
  "showcase.provenance.bind",
  "showcase.merge",
] as const satisfies readonly ProfileShowcaseOperationKind[];

export const PROFILE_SHOWCASE_AUTHORITY: ProfileShowcaseAuthority = Object.freeze({
  showcaseIsProofAuthority: true,
  strongerTruth: "sealed-receiz-proof-object",
  historyIsProofAuthority: false,
  projectionIsProofAuthority: false,
});

export const PROFILE_SHOWCASE_CHILD_AUTHORITY: ProfileShowcaseChildAuthority = Object.freeze({
  childIsProofAuthority: true,
  strongerTruth: "sealed-receiz-proof-object",
  admissionIsProofAuthority: false,
});

export function createProfileShowcaseArtifactId(ownerReceizIdentity: string): ProfileShowcaseArtifactId {
  if (!/^[^\u0000-\u001F\u007F]+$/.test(ownerReceizIdentity)) {
    throw new Error("PROFILE_SHOWCASE_OWNER_IDENTITY_INVALID");
  }
  return `profile-showcase:${ownerReceizIdentity}`;
}

export function isProfileShowcaseArtifactId(value: string): value is ProfileShowcaseArtifactId {
  return /^profile-showcase:[^\u0000-\u001F\u007F]+$/.test(value);
}

export function isProfileShowcaseOperationKind(value: string): value is ProfileShowcaseOperationKind {
  return (PROFILE_SHOWCASE_OPERATION_KINDS as readonly string[]).includes(value);
}
