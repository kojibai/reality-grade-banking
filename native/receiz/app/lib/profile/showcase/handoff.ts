import {
  createReceizArtifactAdmissionEngine,
  rederiveReceizProfileShowcaseCarrierFromAdmission,
  verifyReceizArtifact,
  verifyReceizProofHistory,
  type ReceizVerifiedArtifactAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import { RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST } from "../../../../packages/receiz-sdk/src/appContract";
import {
  isRuntimeCustodiedVerifiedProfileShowcase,
  restoreVerifiedProfileShowcaseFromAdmission,
  type VerifiedProfileShowcase,
} from "./artifact";
import type {
  ProfileShowcaseArtifactId,
  ProfileShowcaseCounts,
  ProfileShowcasePayloadV1,
  ProfileShowcaseSegmentCommitment,
} from "./types";
import { assertProfileShowcaseOperation } from "./operations";
import { assertProfileShowcaseSealedPayloadV1 } from "./canonical";
import { verifyProfileShowcaseFirstPaintWindow } from "./firstPaintWindow";

const DIGEST_RE = /^[0-9a-f]{64}$/;
export type ProfileShowcaseChildAdmissionProfile = "portable-state" | "profile-showcase";

export type VerifiedProfileShowcaseHeadSnapshot = Readonly<{
  payload: ProfileShowcasePayloadV1;
  sealedArtifactBytes: Uint8Array;
  historyDigest: string;
}>;

export type VerifiedProfileShowcaseChild = Readonly<{
  artifactId: string;
  artifactDigest: string;
  immutableObjectVersion: string;
  admissionEvidenceRoot: string;
  contentDigest: string;
  admissionProfile: ProfileShowcaseChildAdmissionProfile;
  ownerReceizId: string | null;
  sealedArtifactBytes: Uint8Array;
}>;

export type ProfileShowcaseSegmentReference = Readonly<{
  segmentId: string;
  startOperationCount: number;
  endOperationCount: number;
  operationCount: number;
  root: string;
}>;

export type ProfileShowcaseHandoffV1 = Readonly<{
  schema: "receiz.profile-showcase-handoff.v1";
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
  immutableObjectVersion: string;
  verificationScope: "exact-sealed-showcase-and-bounded-visible-window";
  transportMetadata: "filename-and-mime-excluded-untrusted-mechanics";
  verifierVersion: string;
  kernelVersion: string;
  registryDigest: string;
  operationMatrixDigest: string;
  proofHistoryEvidenceRoot: string;
  head: VerifiedProfileShowcaseHeadSnapshot;
  visibleWindow: Readonly<{
    startVisibleIndex: 0;
    endVisibleIndex: number;
    totalVisibleCount: number;
    children: readonly VerifiedProfileShowcaseChild[];
    continuation: ProfileShowcasePayloadV1["firstPaintWindow"]["continuation"];
    commitmentDigest: string;
  }>;
  settledCounts: ProfileShowcaseCounts;
  segmentWindow: readonly ProfileShowcaseSegmentReference[];
}>;

export type ProfileShowcaseArtifactOpeners = Readonly<{
  openShowcaseArtifact?: (
    bytes: Uint8Array,
    children: readonly ReceizVerifiedArtifactAdmission[],
  ) => Promise<VerifiedProfileShowcase>;
  openChildArtifact?: (input: Readonly<{
    bytes: Uint8Array;
    profile: ProfileShowcaseChildAdmissionProfile;
    ownerReceizId: string | null;
  }>) => Promise<ReceizVerifiedArtifactAdmission>;
  resolveVerifiedPredecessor?: (
    artifactDigest: string,
  ) => Promise<VerifiedProfileShowcase | null>;
}>;

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((byte, index) => byte === right[index]);
}

function childVersion(admission: ReceizVerifiedArtifactAdmission): string {
  for (const key of ["immutableVersion", "artifactVersion", "version"]) {
    const value = admission.recoveredState[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return admission.payloadSha256;
}

async function exactArtifactBytes(admission: ReceizVerifiedArtifactAdmission): Promise<Uint8Array> {
  if (!admission.openedArtifact) {
    throw new TypeError("PROFILE_SHOWCASE_RUNTIME_CUSTODY_REQUIRED");
  }
  return new Uint8Array(
    await admission.openedArtifact.sealedArtifact.artifact.arrayBuffer(),
  );
}

function segmentReference(
  segment: ProfileShowcaseSegmentCommitment,
): ProfileShowcaseSegmentReference {
  return {
    segmentId: segment.segmentId,
    startOperationCount: segment.startOperationCount,
    endOperationCount: segment.endOperationCount,
    operationCount: segment.operationCount,
    root: segment.root,
  };
}

export async function createVerifiedProfileShowcaseChildDescriptor(
  child: ReceizVerifiedArtifactAdmission,
  sealedReference?: Readonly<{
    admissionEvidenceRoot: string;
    contentDigest: string;
    immutableVersion: string;
  }>,
): Promise<VerifiedProfileShowcaseChild> {
  const verified = child;
  const admissionProfile = verified.profile === "profile-showcase"
    ? "profile-showcase"
    : verified.profile === "portable-state"
      ? "portable-state"
      : null;
  if (!admissionProfile) throw new TypeError("PROFILE_SHOWCASE_CHILD_PROFILE_INVALID");
  return {
    artifactId: verified.artifactId,
    artifactDigest: verified.artifactSha256,
    immutableObjectVersion: sealedReference?.immutableVersion ?? childVersion(verified),
    admissionEvidenceRoot:
      sealedReference?.admissionEvidenceRoot
      ?? verified.admissionProof.admissionProofDigest,
    contentDigest: sealedReference?.contentDigest ?? verified.payloadSha256,
    admissionProfile,
    ownerReceizId: verified.ownerReceizId,
    sealedArtifactBytes: await exactArtifactBytes(verified),
  };
}

function firstPaintWindowAdmissions(
  showcase: VerifiedProfileShowcase,
): readonly ReceizVerifiedArtifactAdmission[] {
  const byDigest = new Map(
    showcase.admittedChildren.map((child) => [child.artifactSha256, child]),
  );
  return showcase.payload.firstPaintWindow.children.map((reference) => {
    const admission = byDigest.get(reference.childArtifactDigest);
    if (
      !admission
      || admission.artifactId !== reference.stableChildArtifactId
      || childVersion(admission) !== reference.immutableVersion
    ) {
      throw new TypeError("PROFILE_SHOWCASE_FIRST_PAINT_CHILD_CLOSURE_REQUIRED");
    }
    return admission;
  });
}

function boundedSegmentWindow(
  payload: ProfileShowcasePayloadV1,
): readonly ProfileShowcaseSegmentReference[] {
  const directStart = payload.priorOperationCount;
  const directEnd = payload.resultingOperationCount;
  const continuationSegmentId = payload.firstPaintWindow.continuation?.segmentId ?? null;
  return payload.segments
    .filter((segment) => (
      (
        segment.endOperationCount > directStart
        && segment.startOperationCount < directEnd
      )
      || segment.segmentId === continuationSegmentId
    ))
    .map(segmentReference);
}

export async function createProfileShowcaseHandoff(
  showcase: VerifiedProfileShowcase,
): Promise<ProfileShowcaseHandoffV1> {
  if (!isRuntimeCustodiedVerifiedProfileShowcase(showcase)) {
    throw new TypeError("PROFILE_SHOWCASE_RUNTIME_CUSTODY_REQUIRED");
  }
  const admission = showcase.admission;
  const visibleAdmissions = firstPaintWindowAdmissions(showcase);
  const sealedChildReferences = new Map<string, Readonly<{
    admissionEvidenceRoot: string;
    contentDigest: string;
    immutableVersion: string;
  }>>();
  for (const node of showcase.history.nodes) {
    if (node.event.type !== "profile-showcase.transition"
      || !Array.isArray(node.event.directOperations)) continue;
    for (const candidate of node.event.directOperations) {
      assertProfileShowcaseOperation(candidate);
      const references = candidate.kind === "showcase.append"
        ? [candidate.child]
        : candidate.kind === "showcase.merge"
          ? candidate.mergedChildren
          : [];
      for (const reference of references) {
        sealedChildReferences.set(reference.childArtifactDigest, reference);
      }
    }
  }
  const visibleChildren = await Promise.all(visibleAdmissions.map(
    (child) => createVerifiedProfileShowcaseChildDescriptor(
      child,
      sealedChildReferences.get(child.artifactSha256),
    ),
  ));
  const sealedArtifactBytes = await exactArtifactBytes(admission);
  return Object.freeze({
    schema: "receiz.profile-showcase-handoff.v1",
    artifactId: showcase.artifactId,
    artifactDigest: showcase.artifactDigest,
    immutableObjectVersion: admission.payloadSha256,
    verificationScope: "exact-sealed-showcase-and-bounded-visible-window",
    transportMetadata: "filename-and-mime-excluded-untrusted-mechanics",
    verifierVersion: showcase.payload.versions.verifierVersion,
    kernelVersion: showcase.payload.versions.kernelVersion,
    registryDigest: showcase.payload.versions.registryDigest,
    operationMatrixDigest: RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
    proofHistoryEvidenceRoot: showcase.history.historyDigest,
    head: {
      payload: structuredClone(showcase.payload),
      sealedArtifactBytes,
      historyDigest: showcase.history.historyDigest,
    },
    visibleWindow: Object.freeze({
      startVisibleIndex: showcase.payload.firstPaintWindow.startVisibleIndex,
      endVisibleIndex: showcase.payload.firstPaintWindow.endVisibleIndex,
      totalVisibleCount: showcase.payload.firstPaintWindow.totalVisibleCount,
      children: Object.freeze(visibleChildren),
      continuation: structuredClone(showcase.payload.firstPaintWindow.continuation),
      commitmentDigest: showcase.payload.firstPaintWindow.commitmentDigest,
    }),
    settledCounts: structuredClone(showcase.payload.counts),
    segmentWindow: Object.freeze(boundedSegmentWindow(showcase.payload)),
  });
}

async function defaultOpenChild(input: Readonly<{
  bytes: Uint8Array;
  profile: ProfileShowcaseChildAdmissionProfile;
  ownerReceizId: string | null;
}>): Promise<ReceizVerifiedArtifactAdmission> {
  const verification = await verifyReceizArtifact(input.bytes);
  const options = input.profile === "profile-showcase"
    ? {
        profile: "profile-showcase" as const,
        ...(input.ownerReceizId ? { ownerConstraint: input.ownerReceizId } : {}),
      }
    : {
        profile: "portable-state" as const,
        ...(input.ownerReceizId ? { ownerConstraint: input.ownerReceizId } : {}),
      };
  const admission = await createReceizArtifactAdmissionEngine()(verification, options);
  if (
    (admission.profile !== "portable-state" && admission.profile !== "profile-showcase")
    || (
      admission.verdict !== "bearer-recovery"
      && admission.verdict !== "foreign-owner"
    )
  ) {
    throw new TypeError("PROFILE_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  }
  return admission;
}

async function defaultOpenShowcase(
  bytes: Uint8Array,
  children: readonly ReceizVerifiedArtifactAdmission[],
  openers: ProfileShowcaseArtifactOpeners,
): Promise<VerifiedProfileShowcase> {
  const admission = await openVerifiedProfileShowcaseAdmissionBytes(bytes, openers);
  const carrier = await rederiveReceizProfileShowcaseCarrierFromAdmission(admission);
  const payload = carrier["profile-showcase"] as unknown as ProfileShowcasePayloadV1;
  const parentDigest = payload.parentArtifactDigests.length === 1
    ? payload.parentArtifactDigests[0]!
    : null;
  const predecessor = parentDigest
    ? await openers.resolveVerifiedPredecessor?.(parentDigest) ?? null
    : null;
  if (parentDigest && !predecessor) {
    throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CLOSURE_REQUIRED");
  }
  return restoreVerifiedProfileShowcaseFromAdmission({
    admission,
    predecessor,
    admittedChildren: children,
  });
}

export async function openVerifiedProfileShowcaseAdmissionBytes(
  bytes: Uint8Array,
  openers: ProfileShowcaseArtifactOpeners = {},
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  const admission = await (openers.openChildArtifact ?? defaultOpenChild)({
    bytes: bytes.slice(),
    profile: "profile-showcase",
    ownerReceizId: null,
  });
  if (admission.profile !== "profile-showcase") {
    throw new TypeError("PROFILE_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  }
  return admission;
}

export async function openVerifiedProfileShowcaseChildDescriptor(
  descriptor: VerifiedProfileShowcaseChild,
  openers: ProfileShowcaseArtifactOpeners = {},
): Promise<ReceizVerifiedArtifactAdmission | null> {
  try {
    if (!(descriptor.sealedArtifactBytes instanceof Uint8Array)) return null;
    const child = await (openers.openChildArtifact ?? defaultOpenChild)({
      bytes: descriptor.sealedArtifactBytes.slice(),
      profile: descriptor.admissionProfile,
      ownerReceizId: descriptor.ownerReceizId,
    });
    if (
      child.artifactId !== descriptor.artifactId
      || child.artifactSha256 !== descriptor.artifactDigest
      || child.payloadSha256 !== descriptor.contentDigest
      || childVersion(child) !== descriptor.immutableObjectVersion
      || !bytesEqual(await exactArtifactBytes(child), descriptor.sealedArtifactBytes)
    ) return null;
    return child;
  } catch {
    return null;
  }
}

async function openBoundedFirstPaintHandoff(
  value: unknown,
  openers: ProfileShowcaseArtifactOpeners,
): Promise<Readonly<{
  handoff: ProfileShowcaseHandoffV1;
  children: readonly ReceizVerifiedArtifactAdmission[];
}> | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const handoff = value as ProfileShowcaseHandoffV1;
  if (
    handoff.schema !== "receiz.profile-showcase-handoff.v1"
    || handoff.verificationScope
      !== "exact-sealed-showcase-and-bounded-visible-window"
    || handoff.transportMetadata !== "filename-and-mime-excluded-untrusted-mechanics"
    || !DIGEST_RE.test(handoff.artifactDigest)
    || handoff.operationMatrixDigest !== RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST
    || !(handoff.head?.sealedArtifactBytes instanceof Uint8Array)
    || !handoff.visibleWindow
    || !Array.isArray(handoff.visibleWindow.children)
    || !Array.isArray(handoff.segmentWindow)
  ) return null;
  const admission = await (openers.openChildArtifact ?? defaultOpenChild)({
    bytes: handoff.head.sealedArtifactBytes,
    profile: "profile-showcase",
    ownerReceizId: null,
  });
  if (admission.profile !== "profile-showcase" || admission.proofHistory === null) return null;
  const carrier = await rederiveReceizProfileShowcaseCarrierFromAdmission(admission);
  const payload = carrier["profile-showcase"];
  assertProfileShowcaseSealedPayloadV1(payload);
  if (!await verifyProfileShowcaseFirstPaintWindow(payload.firstPaintWindow)) return null;
  const history = await verifyReceizProofHistory(admission.proofHistory);
  const sealedWindow = payload.firstPaintWindow;
  if (
    admission.artifactId !== handoff.artifactId
    || admission.artifactSha256 !== handoff.artifactDigest
    || admission.payloadSha256 !== handoff.immutableObjectVersion
    || history.historyDigest !== handoff.proofHistoryEvidenceRoot
    || history.historyDigest !== handoff.head.historyDigest
    || payload.versions.verifierVersion !== handoff.verifierVersion
    || payload.versions.kernelVersion !== handoff.kernelVersion
    || payload.versions.registryDigest !== handoff.registryDigest
    || JSON.stringify(payload) !== JSON.stringify(handoff.head.payload)
    || JSON.stringify(payload.counts) !== JSON.stringify(handoff.settledCounts)
    || JSON.stringify(boundedSegmentWindow(payload))
      !== JSON.stringify(handoff.segmentWindow)
    || handoff.visibleWindow.startVisibleIndex !== sealedWindow.startVisibleIndex
    || handoff.visibleWindow.endVisibleIndex !== sealedWindow.endVisibleIndex
    || handoff.visibleWindow.totalVisibleCount !== sealedWindow.totalVisibleCount
    || handoff.visibleWindow.commitmentDigest !== sealedWindow.commitmentDigest
    || JSON.stringify(handoff.visibleWindow.continuation)
      !== JSON.stringify(sealedWindow.continuation)
    || handoff.visibleWindow.children.length !== sealedWindow.children.length
  ) return null;
  const sealedReferences = history.nodes.flatMap((node) => {
    if (node.event.type !== "profile-showcase.transition"
      || !Array.isArray(node.event.directOperations)) return [];
    return node.event.directOperations.flatMap((candidate) => {
      assertProfileShowcaseOperation(candidate);
      return candidate.kind === "showcase.append"
        ? [candidate.child]
        : candidate.kind === "showcase.merge"
          ? candidate.mergedChildren
          : [];
    });
  });
  const children: ReceizVerifiedArtifactAdmission[] = [];
  for (let index = 0; index < handoff.visibleWindow.children.length; index += 1) {
    const descriptor = handoff.visibleWindow.children[index]!;
    const sealedKey = sealedWindow.children[index]!;
    const child = await openVerifiedProfileShowcaseChildDescriptor(descriptor, openers);
    const reference = sealedReferences.find(
      (candidate) => candidate.childArtifactDigest === descriptor.artifactDigest,
    );
    if (
      !child
      || descriptor.artifactId !== sealedKey.stableChildArtifactId
      || descriptor.immutableObjectVersion !== sealedKey.immutableVersion
      || descriptor.artifactDigest !== sealedKey.childArtifactDigest
      || !reference
      || reference.stableChildArtifactId !== descriptor.artifactId
      || reference.immutableVersion !== descriptor.immutableObjectVersion
      || reference.admissionEvidenceRoot !== descriptor.admissionEvidenceRoot
      || reference.contentDigest !== descriptor.contentDigest
    ) return null;
    children.push(child);
  }
  return { handoff, children: Object.freeze(children) };
}

export async function verifyProfileShowcaseFirstPaintHandoff(
  value: unknown,
  openers: ProfileShowcaseArtifactOpeners = {},
): Promise<ProfileShowcaseHandoffV1 | null> {
  try {
    return (await openBoundedFirstPaintHandoff(value, openers))?.handoff ?? null;
  } catch {
    return null;
  }
}

export async function verifyProfileShowcaseHandoff(
  value: unknown,
  openers: ProfileShowcaseArtifactOpeners = {},
): Promise<Readonly<{
  handoff: ProfileShowcaseHandoffV1;
  showcase: VerifiedProfileShowcase;
  children: readonly ReceizVerifiedArtifactAdmission[];
}> | null> {
  try {
    const bounded = await openBoundedFirstPaintHandoff(value, openers);
    if (!bounded) return null;
    const { handoff, children } = bounded;
    const parentDigest = handoff.head.payload.parentArtifactDigests[0] ?? null;
    if (parentDigest && !openers.openShowcaseArtifact
      && !openers.resolveVerifiedPredecessor) return null;
    const showcase = openers.openShowcaseArtifact
      ? await openers.openShowcaseArtifact(
          handoff.head.sealedArtifactBytes.slice(),
          children,
        )
      : await defaultOpenShowcase(
          handoff.head.sealedArtifactBytes.slice(),
          children,
          openers,
        );
    if (!isRuntimeCustodiedVerifiedProfileShowcase(showcase)) return null;
    const exact = await createProfileShowcaseHandoff(showcase);
    if (
      exact.artifactId !== handoff.artifactId
      || exact.artifactDigest !== handoff.artifactDigest
      || exact.immutableObjectVersion !== handoff.immutableObjectVersion
      || exact.verifierVersion !== handoff.verifierVersion
      || exact.kernelVersion !== handoff.kernelVersion
      || exact.registryDigest !== handoff.registryDigest
      || exact.operationMatrixDigest !== handoff.operationMatrixDigest
      || exact.proofHistoryEvidenceRoot !== handoff.proofHistoryEvidenceRoot
      || exact.head.historyDigest !== handoff.head.historyDigest
      || !bytesEqual(exact.head.sealedArtifactBytes, handoff.head.sealedArtifactBytes)
      || JSON.stringify(exact.head.payload) !== JSON.stringify(handoff.head.payload)
      || JSON.stringify(exact.settledCounts) !== JSON.stringify(handoff.settledCounts)
      || JSON.stringify(exact.segmentWindow) !== JSON.stringify(handoff.segmentWindow)
      || exact.visibleWindow.children.length !== handoff.visibleWindow.children.length
      || exact.visibleWindow.children.some((child, index) => {
        const candidate = handoff.visibleWindow.children[index];
        return !candidate
          || child.artifactId !== candidate.artifactId
          || child.artifactDigest !== candidate.artifactDigest
          || child.immutableObjectVersion !== candidate.immutableObjectVersion
          || child.admissionEvidenceRoot !== candidate.admissionEvidenceRoot
          || child.contentDigest !== candidate.contentDigest;
      })
    ) return null;
    return Object.freeze({ handoff, showcase, children });
  } catch {
    return null;
  }
}
