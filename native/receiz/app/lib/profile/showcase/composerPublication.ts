"use client";

import {
  admitReceizProfileShowcaseSuccessorWithPredecessorContext,
  createReceizArtifactAdmissionEngine,
  verifyReceizArtifact,
  type ReceizArtifactTransitionSealer,
  type ReceizKeyFile,
  type ReceizVerifiedIdentityArtifactAdmission,
  type ReceizVerifiedPortableStateAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import { profileShowcaseLiveKaiUpulse } from "./liveKaiTimeSource";
import {
  createProfileShowcaseAppendAuthority,
} from "./authorityProvider";
import {
  createProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedFirstPaint,
} from "./boundedEdgeVault";
import {
  createReceizBrowserArtifactTransitionStore,
  type ReceizBrowserArtifactTransitionStore,
} from "./browserTransitionStore";
import {
  commitAndPublishBoundedProfileShowcaseTransition,
} from "./boundedTransitionPublication";
import {
  sealAndAdmitComposerProfileOriginalChild,
} from "./composerChild";
import {
  completeLegacyShowcaseCarriesProfileOriginal,
  migrateCompleteLegacyShowcaseBeforeGenesis,
} from "./composerLegacyMigration";
import {
  COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
  canonicalizeCompleteLegacyShowcaseOriginals,
  encodeCompleteLegacyShowcaseMigrationPayload,
  partitionCompleteLegacyShowcaseMigrationOriginals,
} from "./legacyMigrationPayload";
import {
  enqueueProfileShowcaseIntoBrowserEconomy,
  flushPendingProfileShowcaseEconomyAppends,
} from "./economyRetry";
import type { ProfileShowcasePublishSettlement } from "./publish";
import type {
  ProfileShowcasePublicProjectionPublicationResult,
} from "./publicProjectionPublication";
import {
  flushPendingProfileShowcasePublicProjections,
} from "./publicProjectionRetry";
import type { ProfileOriginal } from "@/app/lib/profile/types";
import type { ProfileShowcaseArtifactId } from "./types";
import { requireImportedSourcePlacement, type ImportedSourcePlacement } from "./importedSourcePlacement.client";
import { decodeImportedSourceReference, IMPORTED_SOURCE_REFERENCE_MIME } from "./importedSourceProjection";
import { commitAndPublishBoundedProfileShowcaseChildReplacement } from "./boundedTransitionPublication";
import { projectOwnerShowcaseOriginals } from "./ownerSourceProjection";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { coerceReceizNativeRecordSeal } from "@/app/utils/receizProofBundle";
import { refreshAcceptedPublicProfileDocument } from "./publicProfileDocumentRefresh.client";
import { originalHasSignedArtifactState, profileOriginalPublicationIdentityMatches } from "../pbiSignatureHistory";
import { coerceSourceBoundPublicInventoryAppend, sourceBoundPublicInventoryOriginalsForAppend,
  type SourceBoundPublicInventoryAppend } from "./sourceBoundPublicInventoryAppend";

export type ComposerProfileShowcaseSettlement =
  ProfileShowcasePublishSettlement & Readonly<{
    firstPaint: ProfileShowcaseBoundedFirstPaint;
  }>;

type ProfileShowcaseCrossContextLockManager = Readonly<{
  request<T>(
    name: string,
    callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T>;
}>;

const profileShowcaseCausalAppendTails = new Map<string, Promise<unknown>>();

export function profileShowcaseCausalAppendLockName(
  artifactId: ProfileShowcaseArtifactId,
): string {
  return `receiz:profile-showcase:causal-append:${artifactId}`;
}

function profileShowcaseCrossContextLockManager():
  | ProfileShowcaseCrossContextLockManager
  | null {
  try {
    if (
      typeof navigator === "undefined"
      || !navigator.locks
      || typeof navigator.locks.request !== "function"
    ) return null;
    return navigator.locks as ProfileShowcaseCrossContextLockManager;
  } catch {
    return null;
  }
}

/**
 * Mechanics only: serializes construction from one sealed causal head. The
 * lock never selects or stores truth; the reopened proof object remains the
 * sole append authority inside the callback.
 */
export async function withProfileShowcaseCausalAppendLock<T>(
  artifactId: ProfileShowcaseArtifactId,
  append: () => Promise<T>,
): Promise<T> {
  const name = profileShowcaseCausalAppendLockName(artifactId);
  const crossContext = profileShowcaseCrossContextLockManager();
  if (crossContext) return crossContext.request(name, append);

  const prior = profileShowcaseCausalAppendTails.get(name) ?? Promise.resolve();
  const current = prior.catch(() => undefined).then(append);
  profileShowcaseCausalAppendTails.set(name, current);
  try {
    return await current;
  } finally {
    if (profileShowcaseCausalAppendTails.get(name) === current) {
      profileShowcaseCausalAppendTails.delete(name);
    }
  }
}

function stableOwnerReceizId(
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission,
): string | null {
  const owner = actorAdmission.ownerReceizId?.trim().normalize("NFC").toLowerCase() ?? "";
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(owner)
    ? owner
    : null;
}

function validProfileUsername(username: string): boolean {
  const normalized = username.trim().normalize("NFC").toLowerCase();
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized);
}

function selectedShowcaseSubject(actorAdmission: ReceizVerifiedIdentityArtifactAdmission,
  selected?: ProfileShowcaseArtifactId) {
  const identityOwner = stableOwnerReceizId(actorAdmission);
  if (!identityOwner) throw new TypeError("PROFILE_SHOWCASE_OWNER_INVALID");
  const artifactId = selected ?? `profile-showcase:${identityOwner}` as ProfileShowcaseArtifactId;
  if (!/^profile-showcase:[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(artifactId)) {
    throw new TypeError("PROFILE_SHOWCASE_OWNER_INVALID");
  }
  return { identityOwner, artifactId, owner: artifactId.slice("profile-showcase:".length) };
}

export function createProfileShowcaseNativeTransitionSealer(
  owner: string,
  boundedVault?: ProfileShowcaseBoundedEdgeVault,
  sealDocument: typeof receizeDocumentBytesClient = receizeDocumentBytesClient,
): ReceizArtifactTransitionSealer {
  return async ({ predecessor, successorPayloadBytes }) => {
    if (!predecessor.openedArtifact) {
      throw new TypeError("PROFILE_SHOWCASE_NATIVE_PREDECESSOR_REQUIRED");
    }
    const sealed = await sealDocument({
      fileBytes: successorPayloadBytes,
      filename: "profile-showcase.json",
      mime: "application/json",
      options: {
        forceBundleEnvelope: true,
        nativeRecordSeal: {
          ownerReceizId: owner,
          recordId: `profile-showcase:${owner}`,
        },
      },
    });
    // SDK successor verification binds the exact predecessor artifact context.
    // Restored custody may carry a different outer filename than a fresh seal.
    const artifact = new File(
      [sealed.artifactBytes.slice()],
      predecessor.openedArtifact.sealedArtifact.filename,
      { type: predecessor.openedArtifact.sealedArtifact.mimeType },
    );
    const admission =
      await admitReceizProfileShowcaseSuccessorWithPredecessorContext({
        predecessorAdmission: predecessor,
        candidateArtifact: { artifact },
        ...(boundedVault ? { resolveVerifiedHistoricalArtifactDigest: (count: number) =>
          boundedVault.resolveVerifiedHistoricalArtifactDigest(predecessor.artifactId as ProfileShowcaseArtifactId, predecessor.artifactSha256, count) } : {}),
      });
    if (
      admission.openedArtifact.legacyCompatibility !== "current-native"
      || admission.openedArtifact.sealedArtifact.kind
        !== "receiz.native-record-seal"
    ) {
      throw new TypeError("PROFILE_SHOWCASE_NATIVE_SUCCESSOR_REQUIRED");
    }
    return admission.openedArtifact.sealedArtifact;
  };
}

function defaultGenesisSealer(owner: string, sealDocument: typeof receizeDocumentBytesClient = receizeDocumentBytesClient) {
  return async ({ payloadBytes }: Readonly<{
    payloadBytes: Uint8Array;
  }>) => {
    const sealed = await sealDocument({
      fileBytes: payloadBytes,
      filename: "profile-showcase.json",
      mime: "application/json",
      options: {
        forceBundleEnvelope: true,
        nativeRecordSeal: {
          ownerReceizId: owner,
          recordId: `profile-showcase:${owner}`,
        },
      },
    });
    const artifact = new File(
      [sealed.artifactBytes.slice()],
      sealed.downloadName,
      {
        type: sealed.kind === "bundle"
          ? "application/vnd.receiz.bundle+json"
          : "application/octet-stream",
      },
    );
    const admission = await createReceizArtifactAdmissionEngine()(
      await verifyReceizArtifact(artifact),
      { profile: "profile-showcase", ownerConstraint: owner },
    );
    if (
      admission.profile !== "profile-showcase"
      || !("openedArtifact" in admission)
      || admission.openedArtifact.legacyCompatibility !== "current-native"
      || admission.openedArtifact.sealedArtifact.kind
        !== "receiz.native-record-seal"
    ) {
      throw new TypeError("PROFILE_SHOWCASE_NATIVE_GENESIS_REQUIRED");
    }
    return admission.openedArtifact.sealedArtifact;
  };
}

async function appendVerifiedComposerShowcaseChild(input: Readonly<{
  owner: string;
  artifactId: ProfileShowcaseArtifactId;
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  childAdmission: ReceizVerifiedPortableStateAdmission;
  keyFile: ReceizKeyFile;
  passphrase: string;
  boundedVault: ProfileShowcaseBoundedEdgeVault;
  sealDocument?: typeof receizeDocumentBytesClient;
}>): Promise<ProfileShowcaseBoundedFirstPaint> {
  const predecessorAdmission = await input.boundedVault.reopenHead(
    input.artifactId,
  );
  if (!predecessorAdmission?.proofHistoryHead) {
    throw new TypeError("PROFILE_SHOWCASE_APPEND_HEAD_REQUIRED");
  }
  const commitDomain = Object.freeze({
    scheme: "receiz-commit-domain.v1" as const,
    value: `profile-showcase:${input.owner}:local`,
  });
  const store = createReceizBrowserArtifactTransitionStore({
    databaseName: "receiz-profile-showcase-local-transition-v1",
    namespace: `profile-showcase-local:${predecessorAdmission.artifactSha256}`,
    commitDomain,
  });
  await store.ensureHead(input.artifactId, {
    algorithm: "sha-256",
    binds: "verified-proof-history",
    value: predecessorAdmission.proofHistoryHead.headDigest,
  });
  const authority = await createProfileShowcaseAppendAuthority({
    actorAdmission: input.actorAdmission,
    predecessorAdmission,
    childAdmission: input.childAdmission,
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    commitDomain,
    sealer: createProfileShowcaseNativeTransitionSealer(input.owner, input.boundedVault, input.sealDocument),
    store,
    persistentStateIO: await input.boundedVault.createTransitionPersistentStateIO(input.artifactId, predecessorAdmission.artifactSha256),
    resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
      input.boundedVault.resolveVerifiedHistoricalArtifactDigest(
        input.artifactId,
        predecessorAdmission.artifactSha256,
        operationCount,
      ),
  });
  return commitAndPublishBoundedProfileShowcaseTransition({
    plan: authority.plan,
    capability: authority.capability,
    sealer: authority.sealer,
    store: authority.store,
    children: authority.children,
    segments: authority.segments,
    boundedVault: input.boundedVault,
  });
}

export async function resolveMissingLegacyShowcaseOriginals(input: Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  originals: readonly ProfileOriginal[];
  boundedVault: ProfileShowcaseBoundedEdgeVault;
  /** Membership of this exact admitted predecessor, independent of selection. */
  predecessorArtifactDigest?: string;
  /** Explicit unsigned-profile scope; signed and unknown profiles keep their established path. */
  unsignedProfile?: boolean;
}>): Promise<readonly ProfileOriginal[]> {
  const originals = canonicalizeCompleteLegacyShowcaseOriginals(input.originals);
  if (originals.length === 0) return Object.freeze([]);

  // Complete admitted custody already carries direct and migrated membership,
  // including hidden Originals. Project it once instead of reopening the same
  // source for every absent candidate. A replacement presentation hold may
  // expose an older head; retain the exact mutation lookups in that case.
  const complete = await input.boundedVault.readCompleteSource(input.artifactId, input.predecessorArtifactDigest,
    { retainedHiddenOnly: true }).catch(error => {
    // A partial local inventory can still hold the exact requested child.
    // Invalid proof is never treated as merely unavailable custody.
    if (error instanceof Error && error.message === "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE") return null;
    throw error;
  });
  if (complete && (input.predecessorArtifactDigest
    ? complete.artifactDigest === input.predecessorArtifactDigest
    : (await input.boundedVault.readPublicationHead(input.artifactId))?.artifactDigest === complete.artifactDigest)) {
    const admittedOriginals = projectOwnerShowcaseOriginals(complete, { retainedHiddenOnly: true });
    const admittedIds = new Set(admittedOriginals.map(original => original.id));
    if (input.unsignedProfile !== true) return Object.freeze(originals.filter(original => !admittedIds.has(original.id)));
    const unsignedPendingByCoordinate = new Map<string, ProfileOriginal[]>();
    const coordinateKey = (original: ProfileOriginal) => JSON.stringify([
      (original.code ?? "").trim().toUpperCase(), (original.pulse ?? "").trim(),
    ]);
    for (const original of admittedOriginals) {
      if (!original.id.startsWith("optimistic:profile-original:") || originalHasSignedArtifactState(original)) continue;
      const coordinate = coordinateKey(original);
      const pending = unsignedPendingByCoordinate.get(coordinate) ?? [];
      pending.push(original);
      unsignedPendingByCoordinate.set(coordinate, pending);
    }
    return Object.freeze(originals.filter(original => {
      if (admittedIds.has(original.id)) return false;
      if (originalHasSignedArtifactState(original) || original.id.startsWith("optimistic:profile-original:")) return true;
      // The server's canonical address is discovery, not a new membership
      // append. Reuse the existing unsigned optimistic/canonical identity
      // reconciliation over admitted child truth, including a hidden child.
      return !unsignedPendingByCoordinate.get(coordinateKey(original))
        ?.some(pending => profileOriginalPublicationIdentityMatches(pending, original));
    }));
  }

  // An active branch's indexes cannot answer membership of another exact
  // predecessor. Missing custody remains pending rather than omitting a delta.
  if (input.predecessorArtifactDigest) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_SOURCE_REQUIRED");

  const admittedIds = new Set<string>();
  for (const original of originals) {
    if (admittedIds.has(original.id)) continue;
    // Direct child indexes are the bounded fast path. Embedded migration
    // membership is resolved only when a direct reference does not carry it.
    if (await input.boundedVault.resolveOriginalChildReference(input.artifactId, original.id)) {
      admittedIds.add(original.id);
      continue;
    }
    const migrationChild = await input.boundedVault.resolveLegacyMigrationChildForOriginal(
      input.artifactId,
      original.id,
    );
    for (const member of migrationChild?.originals ?? []) admittedIds.add(member.id);
  }
  return Object.freeze(originals.filter((original) => !admittedIds.has(original.id)));
}

async function backfillMissingLegacyShowcaseOriginals(input: Readonly<{
  owner: string;
  artifactId: ProfileShowcaseArtifactId;
  originals: readonly ProfileOriginal[];
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  keyFile: ReceizKeyFile;
  passphrase: string;
  boundedVault: ProfileShowcaseBoundedEdgeVault;
}>): Promise<boolean> {
  const missing = await resolveMissingLegacyShowcaseOriginals(input);
  if (missing.length === 0) return false;

  const kaiUpulse = profileShowcaseLiveKaiUpulse();
  const chunks = partitionCompleteLegacyShowcaseMigrationOriginals({
    ownerReceizIdentity: input.owner,
    originals: missing,
  });
  for (let index = 0; index < chunks.length; index += 1) {
    const childAdmission = await sealAndAdmitComposerProfileOriginalChild({
      renderedSealedBytes: encodeCompleteLegacyShowcaseMigrationPayload({
        ownerReceizIdentity: input.owner,
        originals: chunks[index]!,
      }),
      renderedMimeType: COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
      ownerReceizId: input.owner,
      immutableVersion: kaiUpulse,
      routeProjection: {
        id: `migration:${input.owner}:backfill:${index + 1}`,
        slug: `complete-showcase-migration-backfill-${index + 1}`,
        code: `MIGB${String(index + 1).padStart(4, "0")}`,
      },
    });
    await appendVerifiedComposerShowcaseChild({
      owner: input.owner,
      artifactId: input.artifactId,
      actorAdmission: input.actorAdmission,
      childAdmission,
      keyFile: input.keyFile,
      passphrase: input.passphrase,
      boundedVault: input.boundedVault,
    });
  }
  return true;
}

export async function ensureProfileShowcaseBoundedFirstPaintIfAuthorized(
  input: Readonly<{
    username: string;
    actorId: string;
    actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
    showcaseArtifactId?: ProfileShowcaseArtifactId;
    keyFile: ReceizKeyFile;
    passphrase?: string;
    boundedVault?: ProfileShowcaseBoundedEdgeVault;
    recoverAcceptedPredecessor?: (vault: ProfileShowcaseBoundedEdgeVault, artifactId: ProfileShowcaseArtifactId) => Promise<void>;
    knownOriginals?: readonly ProfileOriginal[];
    loadCompleteLegacyShowcase: () => Promise<readonly ProfileOriginal[]>;
    publishPublicProjection?: (
      firstPaint: import("./boundedEdgeVault").ProfileShowcaseCompletePublicSource,
      ownerReceizId: string,
    ) => Promise<ProfileShowcasePublicProjectionPublicationResult>;
    /** Visibility backfill waits to publish its final sealed successor. */
    deferPublicProjection?: boolean;
  }>,
): Promise<Readonly<{
  firstPaint: ProfileShowcaseBoundedFirstPaint;
  publicSettlement: "published" | "pending" | "rejected";
}>> {
  const { owner, identityOwner, artifactId } = selectedShowcaseSubject(input.actorAdmission, input.showcaseArtifactId);
  if (
    !owner
    || !validProfileUsername(input.username)
    || !input.actorId.trim()
  ) throw new TypeError("PROFILE_SHOWCASE_FIRST_PAINT_MIGRATION_INPUT_INVALID");
  const passphrase = input.passphrase ?? "";
  const actorAdmission = input.actorAdmission;
  if (
    actorAdmission.ownerReceizId !== identityOwner
    || actorAdmission.actor.actorId !== input.actorId
    || actorAdmission.artifactId !== `identity:${input.keyFile.keyId}`
  ) {
    throw new TypeError("PROFILE_SHOWCASE_IDENTITY_ADMISSION_MISMATCH");
  }
  const boundedVault = input.boundedVault
    ?? createProfileShowcaseBoundedEdgeVault({
      resolveVerifiedCheckpointActorEvidence: async (artifactDigest) =>
        artifactDigest === actorAdmission.artifactSha256
          ? actorAdmission
          : null,
    });
  return withProfileShowcaseCausalAppendLock(artifactId, async () => {
    let head = await boundedVault.reopenHead(artifactId);
    if (!head && input.recoverAcceptedPredecessor) {
      await input.recoverAcceptedPredecessor(boundedVault, artifactId);
      head = await boundedVault.reopenHead(artifactId);
    }
    if (head === null) {
      if (owner !== identityOwner) throw new TypeError("PROFILE_SHOWCASE_ACCEPTED_SUBJECT_REQUIRED");
      const kaiUpulse = profileShowcaseLiveKaiUpulse();
      const commitDomain = Object.freeze({
        scheme: "receiz-commit-domain.v1" as const,
        value: `profile-showcase:${owner}:local`,
      });
      await migrateCompleteLegacyShowcaseBeforeGenesis({
        ownerReceizIdentity: owner,
        migrationKaiUpulse: kaiUpulse,
        originals: await input.loadCompleteLegacyShowcase(),
        actorAdmission,
        keyFile: input.keyFile,
        passphrase,
        commitDomain,
        sealer: defaultGenesisSealer(owner, "sealDocument" in input ? input.sealDocument as typeof receizeDocumentBytesClient : undefined),
        boundedVault,
        appendMigrationChild: async (childAdmission) => {
          await appendVerifiedComposerShowcaseChild({
            owner,
            artifactId,
            actorAdmission,
            childAdmission,
            keyFile: input.keyFile,
            passphrase,
            boundedVault,
          });
        },
      });
      head = await boundedVault.reopenHead(artifactId);
      if (head === null) {
        throw new TypeError("PROFILE_SHOWCASE_MIGRATION_CUSTODY_REQUIRED");
      }
    } else if (input.knownOriginals?.length) {
      await backfillMissingLegacyShowcaseOriginals({
        owner,
        artifactId,
        originals: input.knownOriginals,
        actorAdmission,
        keyFile: input.keyFile,
        passphrase,
        boundedVault,
      });
      head = await boundedVault.reopenHead(artifactId);
      if (head === null) {
        throw new TypeError("PROFILE_SHOWCASE_BACKFILL_CUSTODY_REQUIRED");
      }
    }
    const firstPaint = await boundedVault.readFirstPaint(artifactId);
    if (!firstPaint || firstPaint.artifactDigest !== head.artifactSha256) {
      throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_PUBLICATION_FAILED");
    }
    // Recovery already selected and reopened this exact admitted source. Hand
    // its document coordinate off before returning local first-paint truth;
    // optional document transport cannot block that truth or export it again.
    const operationCount = firstPaint.carrier["profile-showcase"].resultingOperationCount;
    if (typeof operationCount === "number" && Number.isSafeInteger(operationCount))
      void refreshAcceptedPublicProfileDocument({ username: input.username,
        artifactDigest: firstPaint.artifactDigest, operationCount });
    void Promise.allSettled([
      enqueueProfileShowcaseIntoBrowserEconomy({
        artifactId,
        vault: boundedVault,
      }),
      flushPendingProfileShowcaseEconomyAppends(boundedVault),
      ...(!input.deferPublicProjection ? [flushPendingProfileShowcasePublicProjections(
        boundedVault,
        input.publishPublicProjection,
        artifactId,
      )] : []),
    ]);
    return Object.freeze({
      firstPaint,
      publicSettlement: "pending" as const,
    });
  });
}

/**
 * Appends the already-sealed Original to the bounded profile-showcase proof.
 * The caller resolves custody before entering this exact settlement rail.
 * Failure here must remain distinguishable from absent custody so it cannot
 * be presented as a completed showcase publication.
 */
export type PublishComposerBoundedShowcaseInput = Readonly<{
  sourceBoundPublicInventoryAppend?: SourceBoundPublicInventoryAppend;
  importedPlacement?: ImportedSourcePlacement;
  renderedSealedArtifact: Blob;
  username: string;
  actorId: string;
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  showcaseArtifactId?: ProfileShowcaseArtifactId;
  keyFile: ReceizKeyFile;
  passphrase?: string;
  routeProjection: ProfileOriginal;
  boundedVault?: ProfileShowcaseBoundedEdgeVault;
  recoverAcceptedPredecessor?: (vault: ProfileShowcaseBoundedEdgeVault, artifactId: ProfileShowcaseArtifactId) => Promise<void>;
  transitionStore?: ReceizBrowserArtifactTransitionStore;
  sealer?: ReceizArtifactTransitionSealer;
  sealDocument?: typeof receizeDocumentBytesClient;
  childSealer?: import("./composerChild").ComposerProfileOriginalChildSealer;
  loadCompleteLegacyShowcase: () => Promise<readonly ProfileOriginal[]>;
  publishPublicProjection?: (
    firstPaint: import("./boundedEdgeVault").ProfileShowcaseCompletePublicSource,
    ownerReceizId: string,
  ) => Promise<ProfileShowcasePublicProjectionPublicationResult>;
  economyEnqueue?: (
    settlement: ComposerProfileShowcaseSettlement,
  ) => Promise<void>;
  onLocalAdmission?: (
    firstPaint: ProfileShowcaseBoundedFirstPaint,
  ) => Promise<void> | void;
}>;

async function publishComposerBoundedShowcaseFromCausalHead(
  input: PublishComposerBoundedShowcaseInput,
): Promise<Readonly<{
  firstPaint: ProfileShowcaseBoundedFirstPaint;
  publicSettlement: "published" | "pending" | "rejected";
  publicProjection?: ReturnType<typeof flushPendingProfileShowcasePublicProjections>;
}>> {
  if (
    !(input.renderedSealedArtifact instanceof Blob)
    || input.renderedSealedArtifact.size <= 0
    || !input.actorId.trim()
  ) throw new TypeError("PROFILE_SHOWCASE_COMPOSER_INPUT_INVALID");
  const { owner, identityOwner, artifactId } = selectedShowcaseSubject(input.actorAdmission, input.showcaseArtifactId);
  if (!owner || !validProfileUsername(input.username)) {
    throw new TypeError("PROFILE_SHOWCASE_OWNER_INVALID");
  }
  const passphrase = input.passphrase ?? "";
  const actorAdmission = input.actorAdmission;
  if (
    actorAdmission.ownerReceizId !== identityOwner
    || actorAdmission.actor.actorId !== input.actorId
    || actorAdmission.artifactId !== `identity:${input.keyFile.keyId}`
  ) {
    throw new TypeError("PROFILE_SHOWCASE_IDENTITY_ADMISSION_MISMATCH");
  }
  const boundedVault = input.boundedVault
    ?? createProfileShowcaseBoundedEdgeVault({
      resolveVerifiedCheckpointActorEvidence: async (artifactDigest) =>
        artifactDigest === actorAdmission.artifactSha256
          ? actorAdmission
          : null,
    });
  const commitDomain = Object.freeze({
    scheme: "receiz-commit-domain.v1" as const,
    value: `profile-showcase:${owner}:local`,
  });
  let predecessorAdmission = await boundedVault.reopenHead(artifactId);
  if (!predecessorAdmission && input.recoverAcceptedPredecessor) {
    await input.recoverAcceptedPredecessor(boundedVault, artifactId);
    predecessorAdmission = await boundedVault.reopenHead(artifactId);
  }
  let acceptedPublicAdditions: readonly ProfileOriginal[] = [];
  if (input.sourceBoundPublicInventoryAppend) {
    const context = coerceSourceBoundPublicInventoryAppend(input.sourceBoundPublicInventoryAppend);
    if (!predecessorAdmission || context.username !== input.username.trim().normalize("NFC").toLowerCase()) {
      throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_PREDECESSOR");
    }
    const current = await boundedVault.readCompleteSource(artifactId, predecessorAdmission.artifactSha256, { retainedHiddenOnly: true });
    const captured = context.sourceArtifactDigest === predecessorAdmission.artifactSha256 ? current
      : await boundedVault.readCompleteSource(artifactId, context.sourceArtifactDigest, { retainedHiddenOnly: true });
    if (!current || !captured || current.artifactDigest !== predecessorAdmission.artifactSha256
      || captured.artifactDigest !== context.sourceArtifactDigest) throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_PREDECESSOR");
    acceptedPublicAdditions = sourceBoundPublicInventoryOriginalsForAppend({ context, artifactId,
      currentSourceDigest: current.artifactDigest,
      capturedOriginals: projectOwnerShowcaseOriginals(captured, { retainedHiddenOnly: true }),
      currentOriginals: projectOwnerShowcaseOriginals(current, { retainedHiddenOnly: true }),
      verifiedCurrentDescendant: current.artifactDigest !== context.sourceArtifactDigest
        && await boundedVault.isVerifiedPublicationAncestor(artifactId, context.sourceArtifactDigest, current.artifactDigest) });
  }
  if (input.importedPlacement) {
    requireImportedSourcePlacement(input.importedPlacement);
    if (jcsCanonicalize(input.routeProjection) !== jcsCanonicalize(input.importedPlacement.original)) throw new TypeError("IMPORTED_SOURCE_PLACEMENT_PROJECTION_MISMATCH");
  }
  const childAdmission = input.importedPlacement?.admission ?? await sealAndAdmitComposerProfileOriginalChild({
    renderedSealedBytes: new Uint8Array(await input.renderedSealedArtifact.arrayBuffer()),
    renderedMimeType:
      input.renderedSealedArtifact.type || "application/octet-stream",
    ownerReceizId: owner,
    immutableVersion: profileShowcaseLiveKaiUpulse(),
    routeProjection: input.routeProjection,
    seal: input.childSealer,
  });
  if (acceptedPublicAdditions.length) {
    // Observe only the already accepted capture beneath this exact predecessor.
    // The existing owner sealer admits the missing member before the new child;
    // only the final complete Source is handed to public distribution below.
    await backfillMissingLegacyShowcaseOriginals({ owner, artifactId, originals: acceptedPublicAdditions,
      actorAdmission, keyFile: input.keyFile, passphrase, boundedVault });
    predecessorAdmission = await boundedVault.reopenHead(artifactId);
    if (!predecessorAdmission) throw TypeError("PROFILE_SHOWCASE_BACKFILL_CUSTODY_REQUIRED");
  }
  if (input.importedPlacement && predecessorAdmission) {
    const existing = await boundedVault.resolveOriginalChildCustody(artifactId, input.importedPlacement.original.id);
    if (existing) {
      if (existing.verifiedPayloadMimeType !== IMPORTED_SOURCE_REFERENCE_MIME) throw new TypeError("IMPORTED_SOURCE_IDENTITY_CONFLICT");
      const prior = decodeImportedSourceReference(existing.verifiedPayloadBytes);
      const priorOriginal = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(existing.verifiedRouteProjectionBytes)) as ProfileOriginal;
      let source = input.importedPlacement.source;
      while (source.referencedSources?.[0]) source = source.referencedSources[0];
      let firstPaint = await boundedVault.readFirstPaint(artifactId);
      const priorSourceDigest = priorOriginal.importedSource?.sourceArtifactSha256 ?? prior.artifactSha256;
      if (priorSourceDigest !== source.descriptor.artifactSha256) {
        const continuity = source.verification.assetContinuity;
        const proofPredecessor = continuity?.state === "verified" && continuity.carrier === "portable_asset"
          ? continuity.proofPredecessor : coerceReceizNativeRecordSeal(source.verification.bundle?.nativeRecordSeal)?.proofPredecessor;
        if (continuity?.state !== "verified" || proofPredecessor?.artifactSha256 !== priorSourceDigest
          || proofPredecessor.headReference !== priorOriginal.importedSource?.sourceProofHead) throw new TypeError("IMPORTED_SOURCE_EXACT_PREDECESSOR_REQUIRED");
        const currentOriginal = input.importedPlacement.original;
        if ((priorOriginal.hasPbiSignature && !currentOriginal.hasPbiSignature)
          || priorOriginal.importedSource?.pbiAppendHeads.some((head, index) => currentOriginal.importedSource?.pbiAppendHeads[index] !== head)) throw new TypeError("IMPORTED_SOURCE_SIGNATURE_HISTORY_CONFLICT");
        const store = input.transitionStore ?? createReceizBrowserArtifactTransitionStore({
          databaseName: "receiz-profile-showcase-local-transition-v1", namespace: `profile-showcase-local:${predecessorAdmission.artifactSha256}`, commitDomain });
        if (!predecessorAdmission.proofHistoryHead) throw new TypeError("PROFILE_SHOWCASE_APPEND_HEAD_REQUIRED");
        await store.ensureHead(artifactId, { algorithm: "sha-256", binds: "verified-proof-history", value: predecessorAdmission.proofHistoryHead.headDigest });
        firstPaint = await commitAndPublishBoundedProfileShowcaseChildReplacement({ artifactId, actorAdmission, predecessorAdmission,
          replacementChildAdmission: childAdmission, replacedChild: existing.reference, keyFile: input.keyFile, passphrase, commitDomain, store, boundedVault,
          sealer: input.sealer ?? createProfileShowcaseNativeTransitionSealer(owner, boundedVault, "sealDocument" in input ? input.sealDocument as typeof receizeDocumentBytesClient : undefined) });
      }
      if (!firstPaint) throw new TypeError("PROFILE_SHOWCASE_APPEND_HEAD_REQUIRED");
      await input.onLocalAdmission?.(firstPaint);
      void flushPendingProfileShowcasePublicProjections(boundedVault, input.publishPublicProjection).catch(() => undefined);
      void Promise.allSettled([enqueueProfileShowcaseIntoBrowserEconomy({ artifactId, vault: boundedVault }), flushPendingProfileShowcaseEconomyAppends(boundedVault)]);
      return Object.freeze({ firstPaint, publicSettlement: "pending" as const });
    }
  }
  if (predecessorAdmission === null) {
    if (owner !== identityOwner) throw new TypeError("PROFILE_SHOWCASE_ACCEPTED_SUBJECT_REQUIRED");
    const completeLegacyShowcase = await input.loadCompleteLegacyShowcase();
    const migrationCarriesPublishedOriginal =
      completeLegacyShowcaseCarriesProfileOriginal(
        completeLegacyShowcase,
        input.routeProjection,
      );
    await migrateCompleteLegacyShowcaseBeforeGenesis({
      ownerReceizIdentity: owner,
      migrationKaiUpulse: profileShowcaseLiveKaiUpulse(),
      originals: completeLegacyShowcase,
      actorAdmission,
      keyFile: input.keyFile,
      passphrase,
      commitDomain,
      sealer: defaultGenesisSealer(owner, "sealDocument" in input ? input.sealDocument as typeof receizeDocumentBytesClient : undefined),
      boundedVault,
      childSealer: input.childSealer,
      appendMigrationChild: async (migrationChildAdmission) => {
        await appendVerifiedComposerShowcaseChild({
            owner,
            artifactId,
            actorAdmission,
            childAdmission: migrationChildAdmission,
            keyFile: input.keyFile,
            passphrase,
            boundedVault,
            sealDocument: input.sealDocument,
        });
      },
    });
    const firstPaint = migrationCarriesPublishedOriginal
      ? await boundedVault.readFirstPaint(artifactId)
      : await appendVerifiedComposerShowcaseChild({
          owner,
          artifactId,
          actorAdmission,
          childAdmission,
          keyFile: input.keyFile,
          passphrase,
          boundedVault,
          sealDocument: input.sealDocument,
        });
    if (!firstPaint) {
      throw new TypeError("PROFILE_SHOWCASE_MIGRATION_CUSTODY_REQUIRED");
    }
    await input.onLocalAdmission?.(firstPaint);
    const headKaiUpulse = firstPaint.carrier["profile-showcase"].headKaiUpulse;
    if (typeof headKaiUpulse !== "string") {
      throw new TypeError("PROFILE_SHOWCASE_SETTLED_KAI_REQUIRED");
    }
    const settlement: ComposerProfileShowcaseSettlement = Object.freeze({
      artifactId,
      artifactDigest: firstPaint.artifactDigest,
      headKaiUpulse,
      firstPaint,
    });
    const enqueueEconomy = input.economyEnqueue ?? (async () =>
      enqueueProfileShowcaseIntoBrowserEconomy({
        artifactId,
        vault: boundedVault,
      }));
    const publicProjectionPromise =
      flushPendingProfileShowcasePublicProjections(
        boundedVault,
        input.publishPublicProjection,
      );
    void Promise.allSettled([
      enqueueEconomy(settlement),
      flushPendingProfileShowcaseEconomyAppends(boundedVault),
    ]);
    if (input.importedPlacement) { void publicProjectionPromise.catch(() => undefined); return Object.freeze({ firstPaint, publicSettlement: "pending" as const }); }
    return Object.freeze({ firstPaint, publicSettlement: "pending" as const, publicProjection: publicProjectionPromise });
  }
  // The admitted head already carries its complete history. Server inventory
  // is migration input, never a prerequisite for extending held local proof.
  const heldSource = await boundedVault.readCompleteSource(artifactId, undefined, { retainedHiddenOnly: true });
  if (!heldSource || heldSource.artifactDigest !== predecessorAdmission.artifactSha256) {
    throw new TypeError("PROFILE_SHOWCASE_HELD_SOURCE_REQUIRED");
  }
  const completeLegacyShowcase = projectOwnerShowcaseOriginals(heldSource, { retainedHiddenOnly: true });
  const backfillCarriesPublishedOriginal =
    completeLegacyShowcaseCarriesProfileOriginal(
      completeLegacyShowcase,
      input.routeProjection,
    );
  const enqueueEconomy = input.economyEnqueue ?? (async () =>
    enqueueProfileShowcaseIntoBrowserEconomy({
      artifactId,
      vault: boundedVault,
    }));
  const firstPaint = backfillCarriesPublishedOriginal
    ? await boundedVault.readFirstPaint(artifactId)
    : await (async () => {
        const store = input.transitionStore
          ?? createReceizBrowserArtifactTransitionStore({
            databaseName: "receiz-profile-showcase-local-transition-v1",
            namespace: `profile-showcase-local:${predecessorAdmission.artifactSha256}`,
            commitDomain,
          });
        await store.ensureHead(artifactId, {
          algorithm: "sha-256",
          binds: "verified-proof-history",
          value: predecessorAdmission.proofHistoryHead!.headDigest,
        });
        const authority = await createProfileShowcaseAppendAuthority({
          actorAdmission,
          predecessorAdmission,
          childAdmission,
          keyFile: input.keyFile,
          passphrase,
          commitDomain,
          sealer:
            input.sealer ?? createProfileShowcaseNativeTransitionSealer(owner, boundedVault, "sealDocument" in input ? input.sealDocument as typeof receizeDocumentBytesClient : undefined),
          store,
          persistentStateIO: await boundedVault.createTransitionPersistentStateIO(artifactId, predecessorAdmission.artifactSha256),
          resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
            boundedVault.resolveVerifiedHistoricalArtifactDigest(
              artifactId,
              predecessorAdmission!.artifactSha256,
              operationCount,
            ),
        });
        return commitAndPublishBoundedProfileShowcaseTransition({
          plan: authority.plan,
          capability: authority.capability,
          sealer: authority.sealer,
          store: authority.store,
          children: authority.children,
          segments: authority.segments,
          boundedVault,
        });
      })();
  if (!firstPaint) {
    throw new TypeError("PROFILE_SHOWCASE_BACKFILL_CUSTODY_REQUIRED");
  }
  const headKaiUpulse = firstPaint.carrier["profile-showcase"].headKaiUpulse;
  if (typeof headKaiUpulse !== "string") {
    throw new TypeError("PROFILE_SHOWCASE_SETTLED_KAI_REQUIRED");
  }
  const settlement: ComposerProfileShowcaseSettlement = Object.freeze({
    artifactId,
    artifactDigest: firstPaint.artifactDigest,
    headKaiUpulse,
    firstPaint,
  });
  await input.onLocalAdmission?.(firstPaint);
  /*
   * The outbox intent was committed atomically with the sealed head. Economy
   * and public projection are subordinate distribution work. Their first
   * attempts start immediately after exact local admission, while the durable
   * outbox retries the exact sealed head until it receives an exact-source
   * acknowledgement. Network latency never extends the sealing hot path.
   */
  const publicProjectionPromise = flushPendingProfileShowcasePublicProjections(
    boundedVault,
    input.publishPublicProjection,
  );
  void Promise.allSettled([
    enqueueEconomy(settlement),
    flushPendingProfileShowcaseEconomyAppends(boundedVault),
  ]);
  if (input.importedPlacement) { void publicProjectionPromise.catch(() => undefined); return Object.freeze({ firstPaint, publicSettlement: "pending" as const }); }
  return Object.freeze({ firstPaint, publicSettlement: "pending" as const, publicProjection: publicProjectionPromise });
}

export async function publishComposerBoundedShowcaseIfAuthorized(
  input: PublishComposerBoundedShowcaseInput,
): Promise<Readonly<{
  firstPaint: ProfileShowcaseBoundedFirstPaint;
  publicSettlement: "published" | "pending" | "rejected";
}>> {
  const { owner, artifactId } = selectedShowcaseSubject(input.actorAdmission, input.showcaseArtifactId);
  if (!owner || !validProfileUsername(input.username)) {
    throw new TypeError("PROFILE_SHOWCASE_OWNER_INVALID");
  }
  const admitted = await withProfileShowcaseCausalAppendLock(
    artifactId,
    () => publishComposerBoundedShowcaseFromCausalHead(input),
  );
  // Delivery cannot hold the local causal lock against the next owner action.
  if (!admitted.publicProjection) return admitted;
  const publicProjectionPromise = admitted.publicProjection;
  const publicProjection = await publicProjectionPromise;
  return Object.freeze({
    firstPaint: admitted.firstPaint,
    publicSettlement: publicProjection.published > 0 && publicProjection.pending === 0 && publicProjection.rejected === 0
      ? "published" as const : publicProjection.rejected > 0 ? "rejected" as const : "pending" as const,
  });
}
