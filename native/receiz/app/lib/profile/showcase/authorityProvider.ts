"use client";

import {
  RECEIZ_V114_CONSTITUTION_REGISTRY,
  bindReceizV114ProfileShowcaseRegistryAuthority,
  createReceizCapabilityIssuerResolver,
  createReceizCapabilityVerifier,
  deriveReceizProfileShowcaseBoundedSuccessorHeadV114,
  deriveReceizProfileShowcaseNativeOperationDigestV114,
  isSdkIssuedReceizArtifactAdmission,
  planArtifactAppend,
  readReceizArtifactAppendDerivedEffects,
  receizArtifactAppendCapabilityContext,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  signReceizCapability,
  type ReceizProfileShowcasePersistentStateIOV114,
  type ReceizArtifactAppendPlan,
  type ReceizArtifactTransitionSealer,
  type ReceizArtifactTransitionStore,
  type ReceizCapabilityPayload,
  type ReceizCommitDomainId,
  type ReceizConstitutionJson,
  type ReceizKeyFile,
  type ReceizVerifiedCapability,
  type ReceizVerifiedIdentityArtifactAdmission,
  type ReceizVerifiedPortableStateAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import { createReceizProfileShowcaseSegmentMechanicsV114 } from "../../../../packages/receiz-sdk/src/compositeProofTransport";
import {
  type KaiTimeSource,
} from "@/app/utils/kai_pulse";
import { profileShowcaseLiveKaiTimeSource } from "./liveKaiTimeSource";
import type {
  ProfileShowcaseBoundedEdgeChild,
} from "./boundedEdgeVault";
import type {
  ProfileShowcaseChildKey,
  ProfileShowcaseCommittedSegment,
  ProfileShowcaseOperationV1,
  ProfileShowcaseVisibility,
} from "./types";

const INTEGER_KAI_RE = /^(0|[1-9][0-9]*)$/;

type ProfileShowcaseKaiTimeSource = Pick<KaiTimeSource, "nowMicroPulses">;

function resumeProfileShowcaseKaiFromSealedHead(
  predecessorHeadKaiUpulse: unknown,
  source: ProfileShowcaseKaiTimeSource,
): string {
  if (
    typeof predecessorHeadKaiUpulse !== "string"
    || !INTEGER_KAI_RE.test(predecessorHeadKaiUpulse)
  ) {
    throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_KAI_REQUIRED");
  }
  const predecessorKai = BigInt(predecessorHeadKaiUpulse);
  const currentKai = source.nowMicroPulses();
  if (currentKai < 0n) {
    throw new TypeError("PROFILE_SHOWCASE_CURRENT_KAI_INVALID");
  }
  return (currentKai > predecessorKai ? currentKai : predecessorKai).toString();
}

export type ProfileShowcasePreparedAppendAuthority = Readonly<{
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  predecessorAdmission: ReceizVerifiedProfileShowcaseAdmission;
  childAdmission: ReceizVerifiedPortableStateAdmission;
  operation: Extract<ProfileShowcaseOperationV1, { kind: "showcase.append" }>;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null>;
  children: readonly ProfileShowcaseBoundedEdgeChild[];
  segments: readonly ProfileShowcaseCommittedSegment[];
}>;

export type ProfileShowcasePreparedVisibilityAuthority = Readonly<{
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  predecessorAdmission: ReceizVerifiedProfileShowcaseAdmission;
  operation: Extract<
    ProfileShowcaseOperationV1,
    { kind: "showcase.visibility.set" }
  >;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null>;
  children: readonly ProfileShowcaseBoundedEdgeChild[];
  segments: readonly ProfileShowcaseCommittedSegment[];
}>;

/**
 * Binds one exact child append to an already-admitted Receiz ID and already-
 * admitted showcase head. The key file is consumed only inside capability
 * signing and is never returned as publication authority.
 */
export async function createProfileShowcaseAppendAuthority(input: Readonly<{
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  predecessorAdmission: ReceizVerifiedProfileShowcaseAdmission;
  childAdmission: ReceizVerifiedPortableStateAdmission;
  keyFile: ReceizKeyFile;
  passphrase: string;
  kaiTimeSource?: ProfileShowcaseKaiTimeSource;
  commitDomain: ReceizCommitDomainId;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null>;
}>): Promise<ProfileShowcasePreparedAppendAuthority> {
  if (
    input.store.commitDomain.scheme !== input.commitDomain.scheme
    || input.store.commitDomain.value !== input.commitDomain.value
  ) throw new TypeError("PROFILE_SHOWCASE_APPEND_AUTHORITY_INPUT_INVALID");

  const actor = input.actorAdmission;
  const predecessor = input.predecessorAdmission;
  const child = input.childAdmission;
  if (
    !isSdkIssuedReceizArtifactAdmission(actor)
    || !isSdkIssuedReceizArtifactAdmission(predecessor)
    || !isSdkIssuedReceizArtifactAdmission(child)
    || actor.profile !== "identity"
    || actor.verdict !== "canonical-identity"
    || predecessor.profile !== "profile-showcase"
    || predecessor.verdict !== "bearer-recovery"
    || predecessor.proofHistoryHead === null
    || child.profile !== "portable-state"
    || child.verdict !== "bearer-recovery"
    || child.ownerReceizId !== predecessor.ownerReceizId
  ) throw new TypeError("PROFILE_SHOWCASE_APPEND_SEALED_ADMISSIONS_REQUIRED");

  await bindReceizV114ProfileShowcaseRegistryAuthority({
    admission: predecessor,
    registry: RECEIZ_V114_CONSTITUTION_REGISTRY,
  });
  const predecessorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessor);
  const kaiUpulse = resumeProfileShowcaseKaiFromSealedHead(
    predecessorCarrier["profile-showcase"].headKaiUpulse,
    input.kaiTimeSource ?? profileShowcaseLiveKaiTimeSource,
  );
  const priorCount =
    predecessorCarrier["profile-showcase"].resultingOperationCount as number;
  const operationBasis = {
    schema: "receiz.profile-showcase.operation.v1",
    kind: "showcase.append",
    parentArtifactDigest: predecessor.artifactSha256,
    priorCommittedCount: priorCount,
    directDeltaPosition: 0,
    kai: { upulse: kaiUpulse },
    authorityEvidenceRoot: actor.actor.evidenceDigest.value,
    child: {
      stableChildArtifactId: child.artifactId,
      immutableVersion: child.payloadSha256,
      childArtifactDigest: child.artifactSha256,
      admissionEvidenceRoot: child.admissionProof.admissionProofDigest,
      contentDigest: child.payloadSha256,
    },
  } as const;
  const operation = Object.freeze({
    ...operationBasis,
    operationDigest:
      deriveReceizProfileShowcaseNativeOperationDigestV114(operationBasis),
  }) as Extract<ProfileShowcaseOperationV1, { kind: "showcase.append" }>;
  const resultingShowcase =
    await deriveReceizProfileShowcaseBoundedSuccessorHeadV114({
      predecessorCarrier,
      predecessorArtifactDigest: predecessor.artifactSha256,
      directDelta: [operation],
      ...(input.persistentStateIO ? { persistentStateIO: input.persistentStateIO } : {}),
      ...(input.resolveVerifiedHistoricalArtifactDigest
        ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
        : {}),
    });
  const expectedHead = Object.freeze({
    algorithm: "sha-256" as const,
    binds: "verified-proof-history" as const,
    value: predecessor.proofHistoryHead.headDigest,
  });
  const plan = await planArtifactAppend({
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
    admission: predecessor,
    verifiedHistory: predecessor.proofHistoryHead,
    verifiedActorEvidence: actor,
    commitDomain: input.commitDomain,
    namespace: {
      scheme: "receiz-namespace.v1",
      value: "profile-showcase",
    },
    event: {
      schema: "receiz.profile-showcase.namespace-event.v1",
      resultingShowcase,
    } as unknown as ReceizConstitutionJson,
    expectedHead,
    idempotencyKey: [
      "profile-showcase.append",
      predecessor.artifactSha256,
      child.artifactId,
      child.payloadSha256,
    ].join(":"),
  });
  const effects = readReceizArtifactAppendDerivedEffects(plan);
  const expiresAtKai = (BigInt(kaiUpulse) + 1n).toString();
  const capabilityPayload: ReceizCapabilityPayload = {
    schema: "receiz.capability.v112",
    capabilityId: `cap:${plan.planDigest.value}`,
    issuerKeyId: input.keyFile.keyId,
    actorId: actor.actor.actorId,
    tenantId: null,
    audience: "receiz:sdk",
    authorityProfile: "artifact-local",
    operations: ["artifact.append"],
    resourceScopes: [plan.resource],
    maximumEffects: effects,
    registryDigest: actor.admissionProof.registryDigest,
    validFromKai: kaiUpulse,
    expiresAtKai,
    nonce: `nonce:${plan.planDigest.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: true,
    operationConstraints:
      receizArtifactAppendCapabilityContext(plan).operationConstraints,
  };
  const signed = await signReceizCapability({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    payload: capabilityPayload,
  });
  const resolveAdmittedIssuer = await createReceizCapabilityIssuerResolver({
    identityAdmissions: [actor],
    revokedIssuerKeyIds: new Set(),
  });
  const verifiedCapability = await createReceizCapabilityVerifier({
    resolveAdmittedIssuer,
    currentKai: kaiUpulse,
    audience: "receiz:sdk",
    revokedCapabilityDigests: new Set(),
  })(signed, receizArtifactAppendCapabilityContext(plan));
  if (!verifiedCapability.ok) {
    throw new TypeError(`PROFILE_SHOWCASE_APPEND_CAPABILITY_${verifiedCapability.code}`);
  }
  const segmentMechanics = await createReceizProfileShowcaseSegmentMechanicsV114({
    operations: [operation],
    startOperationCount: priorCount,
  });
  const segment: ProfileShowcaseCommittedSegment = {
    schema: segmentMechanics.schema,
    commitment: {
      ...segmentMechanics.commitment,
      authority: segmentMechanics.authority,
    },
    bytes: segmentMechanics.bytes,
    operations: segmentMechanics.operations as ProfileShowcaseCommittedSegment["operations"],
    membershipWitnesses:
      segmentMechanics.membershipWitnesses as ProfileShowcaseCommittedSegment["membershipWitnesses"],
    authority: segmentMechanics.authority,
  };
  return Object.freeze({
    actorAdmission: actor,
    predecessorAdmission: predecessor,
    childAdmission: child,
    operation,
    plan,
    capability: verifiedCapability.capability,
    sealer: input.sealer,
    store: input.store,
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
    children: Object.freeze([Object.freeze({
      reference: operation.child,
      admittedArtifact: child,
    })]),
    segments: Object.freeze([segment]),
  });
}

/**
 * Seals an owner's visibility decision as a direct successor of the exact
 * admitted showcase head. The child key is a selector into that sealed
 * predecessor; it is not admitted as a new authority.
 */
type ProfileShowcasePlacementAuthorityInput = Readonly<{
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  predecessorAdmission: ReceizVerifiedProfileShowcaseAdmission;
  child: ProfileShowcaseChildKey;

  keyFile: ReceizKeyFile;
  passphrase: string;
  kaiTimeSource?: ProfileShowcaseKaiTimeSource;
  commitDomain: ReceizCommitDomainId;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  resolveRetainedSegment?: import("../../../../packages/receiz-sdk/src/compositeProofTransport").ReceizProfileShowcaseRetainedSegmentResolverV114;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  resolveVerifiedHistoricalArtifactDigest?: (
    operationCount: number,
  ) => Promise<string | null>;
}>;

export async function createProfileShowcaseVisibilityAuthority(input: ProfileShowcasePlacementAuthorityInput & Readonly<{ visibility: ProfileShowcaseVisibility }>): Promise<ProfileShowcasePreparedVisibilityAuthority> {
  return createProfileShowcasePlacementAuthority(input) as Promise<ProfileShowcasePreparedVisibilityAuthority>;
}

export async function createProfileShowcaseProvenanceAuthority(input: ProfileShowcasePlacementAuthorityInput & Readonly<{ provenanceEvidenceRoot: string }>) {
  if (!/^[0-9a-f]{64}$/.test(input.provenanceEvidenceRoot)) throw new TypeError("PROFILE_SHOWCASE_PROVENANCE_SOURCE_REQUIRED");
  return createProfileShowcasePlacementAuthority(input);
}

async function createProfileShowcasePlacementAuthority(input: ProfileShowcasePlacementAuthorityInput & (Readonly<{ visibility: ProfileShowcaseVisibility }> | Readonly<{ provenanceEvidenceRoot: string }>)) {
  if (
    input.store.commitDomain.scheme !== input.commitDomain.scheme
    || input.store.commitDomain.value !== input.commitDomain.value
    || !input.child.stableChildArtifactId
    || !input.child.immutableVersion
    || !input.child.childArtifactDigest
  ) throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_AUTHORITY_INPUT_INVALID");

  const actor = input.actorAdmission;
  const predecessor = input.predecessorAdmission;
  if (
    !isSdkIssuedReceizArtifactAdmission(actor)
    || !isSdkIssuedReceizArtifactAdmission(predecessor)
    || actor.profile !== "identity"
    || actor.verdict !== "canonical-identity"
    || predecessor.profile !== "profile-showcase"
    || predecessor.verdict !== "bearer-recovery"
    || predecessor.proofHistoryHead === null
  ) throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_SEALED_ADMISSIONS_REQUIRED");

  await bindReceizV114ProfileShowcaseRegistryAuthority({
    admission: predecessor,
    registry: RECEIZ_V114_CONSTITUTION_REGISTRY,
  });
  const predecessorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessor);
  const kaiUpulse = resumeProfileShowcaseKaiFromSealedHead(
    predecessorCarrier["profile-showcase"].headKaiUpulse,
    input.kaiTimeSource ?? profileShowcaseLiveKaiTimeSource,
  );
  const priorCount =
    predecessorCarrier["profile-showcase"].resultingOperationCount as number;
  const operationBasis = {
    schema: "receiz.profile-showcase.operation.v1",
    kind: "provenanceEvidenceRoot" in input ? "showcase.provenance.bind" : "showcase.visibility.set",
    parentArtifactDigest: predecessor.artifactSha256,
    priorCommittedCount: priorCount,
    directDeltaPosition: 0,
    kai: { upulse: kaiUpulse },
    authorityEvidenceRoot: actor.actor.evidenceDigest.value,
    child: {
      stableChildArtifactId: input.child.stableChildArtifactId,
      immutableVersion: input.child.immutableVersion,
      childArtifactDigest: input.child.childArtifactDigest,
    },
    ...("provenanceEvidenceRoot" in input ? { provenanceEvidenceRoot: input.provenanceEvidenceRoot } : { visibility: input.visibility }),
  } as const;
  const operation = Object.freeze({
    ...operationBasis,
    operationDigest:
      deriveReceizProfileShowcaseNativeOperationDigestV114(operationBasis),
  }) as Extract<
    ProfileShowcaseOperationV1,
    { kind: "showcase.visibility.set" | "showcase.provenance.bind" }
  >;
  const resultingShowcase =
    await deriveReceizProfileShowcaseBoundedSuccessorHeadV114({
      predecessorCarrier,
      predecessorArtifactDigest: predecessor.artifactSha256,
      directDelta: [operation],
      ...(input.resolveRetainedSegment ? { resolveRetainedSegment: input.resolveRetainedSegment } : {}),
      ...(input.persistentStateIO ? { persistentStateIO: input.persistentStateIO } : {}),
      ...(input.resolveVerifiedHistoricalArtifactDigest
        ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
        : {}),
    });
  const expectedHead = Object.freeze({
    algorithm: "sha-256" as const,
    binds: "verified-proof-history" as const,
    value: predecessor.proofHistoryHead.headDigest,
  });
  const plan = await planArtifactAppend({
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
    admission: predecessor,
    verifiedHistory: predecessor.proofHistoryHead,
    verifiedActorEvidence: actor,
    commitDomain: input.commitDomain,
    namespace: {
      scheme: "receiz-namespace.v1",
      value: "profile-showcase",
    },
    event: {
      schema: "receiz.profile-showcase.namespace-event.v1",
      resultingShowcase,
    } as unknown as ReceizConstitutionJson,
    expectedHead,
    idempotencyKey: [
      "provenanceEvidenceRoot" in input ? "profile-showcase.provenance" : "profile-showcase.visibility",
      predecessor.artifactSha256,
      input.child.stableChildArtifactId,
      input.child.immutableVersion,
      input.child.childArtifactDigest,
      "provenanceEvidenceRoot" in input ? input.provenanceEvidenceRoot : input.visibility,
    ].join(":"),
  });
  const effects = readReceizArtifactAppendDerivedEffects(plan);
  const expiresAtKai = (BigInt(kaiUpulse) + 1n).toString();
  const capabilityPayload: ReceizCapabilityPayload = {
    schema: "receiz.capability.v112",
    capabilityId: `cap:${plan.planDigest.value}`,
    issuerKeyId: input.keyFile.keyId,
    actorId: actor.actor.actorId,
    tenantId: null,
    audience: "receiz:sdk",
    authorityProfile: "artifact-local",
    operations: ["artifact.append"],
    resourceScopes: [plan.resource],
    maximumEffects: effects,
    registryDigest: actor.admissionProof.registryDigest,
    validFromKai: kaiUpulse,
    expiresAtKai,
    nonce: `nonce:${plan.planDigest.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: true,
    operationConstraints:
      receizArtifactAppendCapabilityContext(plan).operationConstraints,
  };
  const signed = await signReceizCapability({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    payload: capabilityPayload,
  });
  const resolveAdmittedIssuer = await createReceizCapabilityIssuerResolver({
    identityAdmissions: [actor],
    revokedIssuerKeyIds: new Set(),
  });
  const verifiedCapability = await createReceizCapabilityVerifier({
    resolveAdmittedIssuer,
    currentKai: kaiUpulse,
    audience: "receiz:sdk",
    revokedCapabilityDigests: new Set(),
  })(signed, receizArtifactAppendCapabilityContext(plan));
  if (!verifiedCapability.ok) {
    throw new TypeError(
      `PROFILE_SHOWCASE_VISIBILITY_CAPABILITY_${verifiedCapability.code}`,
    );
  }
  const segmentMechanics =
    await createReceizProfileShowcaseSegmentMechanicsV114({
      operations: [operation],
      startOperationCount: priorCount,
    });
  const segment: ProfileShowcaseCommittedSegment = {
    schema: segmentMechanics.schema,
    commitment: {
      ...segmentMechanics.commitment,
      authority: segmentMechanics.authority,
    },
    bytes: segmentMechanics.bytes,
    operations:
      segmentMechanics.operations as ProfileShowcaseCommittedSegment["operations"],
    membershipWitnesses:
      segmentMechanics.membershipWitnesses as ProfileShowcaseCommittedSegment["membershipWitnesses"],
    authority: segmentMechanics.authority,
  };
  return Object.freeze({
    actorAdmission: actor,
    predecessorAdmission: predecessor,
    operation,
    plan,
    capability: verifiedCapability.capability,
    sealer: input.sealer,
    store: input.store,
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
    children: Object.freeze([]),
    segments: Object.freeze([segment]),
  });
}
