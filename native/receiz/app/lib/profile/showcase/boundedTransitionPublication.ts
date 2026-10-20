import {
  admitReceizProfileShowcaseTransitionSuccessor,
  commitArtifactTransition,
  sealArtifactTransitionCandidate,
  type ReceizArtifactAppendPlan,
  type ReceizArtifactTransitionSealer,
  type ReceizArtifactTransitionStore,
  type ReceizCommitDomainId,
  type ReceizKeyFile,
  type ReceizVerifiedCapability,
  type ReceizVerifiedIdentityArtifactAdmission,
  type ReceizVerifiedPortableStateAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import {
  createProfileShowcaseAppendAuthority,
  createProfileShowcaseVisibilityAuthority,
} from "./authorityProvider";
import {
  admitBoundedProfileShowcaseRouteTruth,
} from "../routeHydration";
import type {
  ProfileShowcaseBoundedEdgeChild,
  ProfileShowcaseBoundedEdgeVault,
  ProfileShowcaseBoundedFirstPaint,
} from "./boundedEdgeVault";
import type {
  ReceizBrowserArtifactTransitionStore,
} from "./browserTransitionStore";
import type {
  ProfileShowcaseArtifactId,
  ProfileShowcaseChildKey,
  ProfileShowcaseCommittedSegment,
} from "./types";

export async function sealCommitAndReadmitBoundedProfileShowcaseTransition(
  input: Readonly<{
    plan: ReceizArtifactAppendPlan;
    capability: ReceizVerifiedCapability;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizArtifactTransitionStore;
    resolveVerifiedHistoricalArtifactDigest?: (
      operationCount: number,
    ) => Promise<string | null>;
  }>,
): Promise<ReceizVerifiedProfileShowcaseAdmission> {
  const candidate = await sealArtifactTransitionCandidate({
    plan: input.plan,
    capability: input.capability,
    sealer: input.sealer,
  });
  const staged = await input.store.stageCandidate(candidate);
  const committed = await commitArtifactTransition({
    plan: input.plan,
    capability: input.capability,
    staged,
    store: input.store,
  });
  if (
    committed.status !== "committed-artifact-transition"
    || committed.proofHistoryHead === null
  ) {
    throw new TypeError(
      `PROFILE_SHOWCASE_BOUNDED_TRANSITION_${
        committed.status === "committed-artifact-transition"
          ? "HISTORY_MISSING"
          : committed.code
      }`,
    );
  }
  const admission = await admitReceizProfileShowcaseTransitionSuccessor({
    plan: input.plan,
    candidateArtifact: committed.artifact,
    resolveVerifiedHistoricalArtifactDigest:
      input.resolveVerifiedHistoricalArtifactDigest,
  });
  if (
    admission.profile !== "profile-showcase"
    || admission.proofHistoryHead === null
  ) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_READMISSION_REQUIRED");
  }
  return admission as ReceizVerifiedProfileShowcaseAdmission;
}

/**
 * The normal production write rail for a bounded showcase successor:
 * native plan → capability → seal → atomic commit → exact re-admission →
 * immutable edge custody → synchronous route publication.
 */
export async function commitAndPublishBoundedProfileShowcaseTransition(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  children: readonly ProfileShowcaseBoundedEdgeChild[];
  segments: readonly ProfileShowcaseCommittedSegment[];
  boundedVault?: ProfileShowcaseBoundedEdgeVault;
  afterEdgeAdmission?: () => Promise<void>;
}>): Promise<ProfileShowcaseBoundedFirstPaint> {
  const admission =
    await sealCommitAndReadmitBoundedProfileShowcaseTransition({
      plan: input.plan,
      capability: input.capability,
      sealer: input.sealer,
      store: input.store,
      resolveVerifiedHistoricalArtifactDigest: input.boundedVault
        ? (operationCount) =>
            input.boundedVault!.resolveVerifiedHistoricalArtifactDigest(
              input.plan.resource as ProfileShowcaseArtifactId,
              input.plan.transition.priorArtifactDigest.value,
              operationCount,
            )
        : undefined,
    });
  return admitBoundedProfileShowcaseRouteTruth({
    showcaseAdmission: admission,
    children: input.children,
    segments: input.segments,
  }, input.boundedVault, input.afterEdgeAdmission);
}

/**
 * Replaces one bounded child through two lawful direct successors. Each
 * successor carries exactly one direct delta: append the replacement first,
 * then hide the predecessor. Only the final admitted head invokes the
 * caller's external publication boundary.
 */
export async function commitAndPublishBoundedProfileShowcaseChildReplacement(
  input: Readonly<{
    artifactId: ProfileShowcaseArtifactId;
    actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
    predecessorAdmission: ReceizVerifiedProfileShowcaseAdmission;
    replacementChildAdmission: ReceizVerifiedPortableStateAdmission;
    replacedChild: ProfileShowcaseChildKey;
    keyFile: ReceizKeyFile;
    passphrase: string;
    commitDomain: ReceizCommitDomainId;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizBrowserArtifactTransitionStore;
    boundedVault: ProfileShowcaseBoundedEdgeVault;
    afterEdgeAdmission?: () => Promise<void>;
  }>,
): Promise<ProfileShowcaseBoundedFirstPaint> {
  const appendAuthority = await createProfileShowcaseAppendAuthority({
    actorAdmission: input.actorAdmission,
    predecessorAdmission: input.predecessorAdmission,
    childAdmission: input.replacementChildAdmission,
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    commitDomain: input.commitDomain,
    sealer: input.sealer,
    store: input.store,
    persistentStateIO: await input.boundedVault.createTransitionPersistentStateIO(input.artifactId, input.predecessorAdmission.artifactSha256),
    resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
      input.boundedVault.resolveVerifiedHistoricalArtifactDigest(
        input.artifactId,
        input.predecessorAdmission.artifactSha256,
        operationCount,
      ),
  });
  const appendedAdmission = await sealCommitAndReadmitBoundedProfileShowcaseTransition({
    plan: appendAuthority.plan,
    capability: appendAuthority.capability,
    sealer: appendAuthority.sealer,
    store: appendAuthority.store,
    resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
      input.boundedVault.resolveVerifiedHistoricalArtifactDigest(
        input.artifactId,
        input.predecessorAdmission.artifactSha256,
        operationCount,
      ),
  });
  // This is an intermediate source head, not the completed replacement.
  // Retain it durably without projecting the predecessor and replacement
  // together or lifting visibility quarantine before the final successor.
  const appended = await input.boundedVault.admit({
    showcaseAdmission: appendedAdmission,
    children: appendAuthority.children,
    segments: appendAuthority.segments,
    holdReplacementPresentation: input.replacedChild,
  });
  if (appended.status !== "active") {
    throw new TypeError("PROFILE_SHOWCASE_REPLACEMENT_APPEND_NOT_ACTIVE");
  }

  const appendedPredecessor = await input.boundedVault.reopenHead(
    input.artifactId,
  );
  if (!appendedPredecessor?.proofHistoryHead) {
    throw new TypeError("PROFILE_SHOWCASE_REPLACEMENT_APPEND_HEAD_REQUIRED");
  }
  await input.store.ensureHead(input.artifactId, {
    algorithm: "sha-256",
    binds: "verified-proof-history",
    value: appendedPredecessor.proofHistoryHead.headDigest,
  });
  const visibilityAuthority = await createProfileShowcaseVisibilityAuthority({
    actorAdmission: input.actorAdmission,
    predecessorAdmission: appendedPredecessor,
    child: input.replacedChild,
    visibility: "hidden",
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    commitDomain: input.commitDomain,
    sealer: input.sealer,
    store: input.store,
    persistentStateIO: await input.boundedVault.createTransitionPersistentStateIO(input.artifactId, appendedPredecessor.artifactSha256),
    resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
      input.boundedVault.resolveVerifiedHistoricalArtifactDigest(
        input.artifactId,
        appendedPredecessor.artifactSha256,
        operationCount,
      ),
  });
  return commitAndPublishBoundedProfileShowcaseTransition({
    plan: visibilityAuthority.plan,
    capability: visibilityAuthority.capability,
    sealer: visibilityAuthority.sealer,
    store: visibilityAuthority.store,
    children: visibilityAuthority.children,
    segments: visibilityAuthority.segments,
    boundedVault: input.boundedVault,
    afterEdgeAdmission: input.afterEdgeAdmission,
  });
}
