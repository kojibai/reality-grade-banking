"use client";

import { resolveComposerIdentityCustody, type ComposerIdentityCustodyContext } from "./composerIdentityCustodyResolver";
import { peekActiveIdentityCustodyContext } from "@/app/lib/auth/activeIdentityCustodyContext";
import { resolveMissingLegacyShowcaseOriginals } from "./composerPublication";
import { visibleShowcaseOriginalsFromOriginals } from "../deterministicFeed";
import { profileOriginalProofIdentityKey } from "../pbiSignatureHistory";
import { projectOwnerShowcaseOriginals } from "./ownerSourceProjection";
import { loadCompleteLegacyProfileShowcase } from "./composerLegacyMigration";
import type { ProfileViewData } from "../types";
import type { ProfileOriginal } from "@/app/lib/profile/types";
import {
  createProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseCompletePublicSource,
} from "./boundedEdgeVault";
import {
  ensureProfileShowcaseFirstPaintMigrationWithIdentityRecovery,
} from "./composerBoundedSettlement";
import {
  flushPendingProfileShowcaseOriginalProjections,
} from "./originalProjectionRetry";
import { recoverHeldProfileOriginalSigningIntents } from "./heldOriginalSigningRecovery";
import { recoverPublishedProfileOriginalSigningIntents } from "./publishedOriginalSigningRecovery";
import {
  publishProfileShowcasePublicProjection,
  type ProfileShowcasePublicProjectionPublicationResult,
} from "./publicProjectionPublication";
import {
  ensureCurrentProfileShowcasePublicProjection,
  flushPendingProfileShowcasePublicProjections,
  visibleProfileShowcasePublicationRoute,
} from "./publicProjectionRetry";
import type { ProfileShowcaseArtifactId } from "./types";
import { recoverAcceptedShowcaseRelationship } from "./acceptedRelationshipRecovery.client";

/** Completeness schedules discovery only; canonical missing-member admission
 * remains the authority for every eventual append. Read the current child state. */
export function ownedProfileLegacyBackfillIsComplete(profile: ProfileViewData): boolean {
  return !profile.originalsPage.hasMore
    && visibleShowcaseOriginalsFromOriginals(profile.originals).length >= profile.stats.originals;
}

type PublicProjectionPublisher = (
  firstPaint: import("./boundedEdgeVault").ProfileShowcasePublicationSource,
  ownerReceizId: string,
) => Promise<ProfileShowcasePublicProjectionPublicationResult>;

export type OwnedProfilePublicHeadReconciliationDependencies = Readonly<{
  createVault?: typeof createProfileShowcaseBoundedEdgeVault;
  recoverRelationship?: typeof recoverAcceptedShowcaseRelationship;
  flushPublic?: typeof flushPendingProfileShowcasePublicProjections;
  resolveAuthority?: typeof resolveComposerIdentityCustody;
  resolveMissing?: typeof resolveMissingLegacyShowcaseOriginals;
  projectHeldOriginals?: typeof projectOwnerShowcaseOriginals;
  loadCompleteLegacyShowcase?: (username: string) => Promise<readonly ProfileOriginal[]>;
  ensureMigration?: typeof ensureProfileShowcaseFirstPaintMigrationWithIdentityRecovery;
  flushOriginals?: typeof flushPendingProfileShowcaseOriginalProjections;
  recoverHeldSigning?: typeof recoverHeldProfileOriginalSigningIntents;
  recoverPublishedSigning?: typeof recoverPublishedProfileOriginalSigningIntents;
  discoverPublicVisibleCount?: typeof discoverPublicProfileVisibleOriginalCount;
  ensureCurrent?: (
    vault: ProfileShowcaseBoundedEdgeVault,
    artifactId: ProfileShowcaseArtifactId,
    publish: PublicProjectionPublisher,
  ) => Promise<Readonly<{ published: number; pending: number; code?: string | null }>>;
  publish?: PublicProjectionPublisher;
}>;

export type OwnedProfilePublicHeadReconciliationResult = Readonly<{
  status: "settled" | "pending";
  needsRetry: boolean;
}>;

/** A public manifest can reveal an omitted member, but cannot admit one.
 * Membership still comes from the complete public inventory followed by the
 * existing owner-held sealed migration append. */
export async function discoverPublicProfileVisibleOriginalCount(
  username: string,
  profileUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const response = await fetchImpl(`/api/profile/${encodeURIComponent(username)}/manifest?source=inventory`, {
      cache: "no-store", credentials: "omit", headers: { "cache-control": "no-store" },
    });
    if (!response.ok) return null;
    const body = await response.json() as Record<string, unknown>;
    const head = body?.head as Record<string, unknown> | undefined;
    const profile = head?.profile as Record<string, unknown> | undefined;
    const stats = head?.stats as Record<string, unknown> | undefined;
    const visibleCount = stats?.originals;
    return body?.ok === true
      && normalizedUsername(String(profile?.username ?? "")) === username
      && profile?.userId === profileUserId
      && Number.isSafeInteger(visibleCount) && Number(visibleCount) >= 0
      ? Number(visibleCount) : null;
  } catch { return null; }
}

function normalizedUsername(value: string): string {
  return value.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
}

function heldIdentityShowcaseArtifactId(
  authority: ComposerIdentityCustodyContext | null,
): ProfileShowcaseArtifactId | null {
  const owner = authority?.actorAdmission.ownerReceizId;
  if (
    !authority
    || typeof owner !== "string"
    || !/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(owner)
    || authority.ownerReceizId !== owner
    || authority.actorAdmission.actor.actorId !== authority.actorId
  ) return null;
  return authority.showcaseArtifactId ?? `profile-showcase:${owner}` as ProfileShowcaseArtifactId;
}

/**
 * Reopens the existing owner-held showcase, admits any sealed Originals that
 * predate the current local composite head, and publishes that exact newest
 * head through the already-established public projection rail. This is
 * background reconciliation only; it never supplies or replaces profile UI.
 */
export async function reconcileOwnedProfileShowcasePublicHead(
  input: Readonly<{
    username: string;
    profileUserId?: string;
    unsignedProfile?: boolean;
    originals: readonly ProfileOriginal[];
    allowLegacyBackfill?: boolean;
    /** After-paint discovery only; it cannot become sealed membership authority. */
    visibleOriginalCount?: number;
    /** Suppressed hydration still needs an after-paint public addition signal. */
    discoverPublicHead?: boolean;
    /** Delivery selector from the held Showcase; the publisher verifies the source. */
    heldArtifactId?: ProfileShowcaseArtifactId | null;
    /** Exact accepted first-paint source selector, never a replacement authority. */
    acceptedHeadArtifactDigest?: string | null;
  }>,
  dependencies: OwnedProfilePublicHeadReconciliationDependencies = {},
): Promise<OwnedProfilePublicHeadReconciliationResult> {
  const username = normalizedUsername(input.username);
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(username)) {
    return Object.freeze({ status: "pending" as const, needsRetry: false });
  }

  const createVault = dependencies.createVault
    ?? createProfileShowcaseBoundedEdgeVault;
  const readVisibleRoute = (artifactId: ProfileShowcaseArtifactId) => input.profileUserId && typeof window !== "undefined"
    ? visibleProfileShowcasePublicationRoute(
        artifactId,
        window.location.pathname,
        { profile: { username, userId: input.profileUserId } },
      ) : null;
  const flushPublic = dependencies.flushPublic
    ?? ((vault, publish, artifactId) => flushPendingProfileShowcasePublicProjections(
      vault, publish, artifactId,
      input.profileUserId && artifactId && typeof window !== "undefined" ? { readRoute: () => readVisibleRoute(artifactId) } : {},
    ));
  const ensureMigration = dependencies.ensureMigration
    ?? ensureProfileShowcaseFirstPaintMigrationWithIdentityRecovery;
  const flushOriginals = dependencies.flushOriginals
    ?? flushPendingProfileShowcaseOriginalProjections;
  const ensureCurrent = dependencies.ensureCurrent
    ?? ((vault, artifactId, publish) => ensureCurrentProfileShowcasePublicProjection(
      vault, artifactId, publish,
      input.profileUserId && typeof window !== "undefined" ? { readRoute: () => readVisibleRoute(artifactId) } : {},
    ));
  const publishSource = dependencies.publish
    ?? ((firstPaint, ownerReceizId) => publishProfileShowcasePublicProjection(
      firstPaint,
      ownerReceizId,
      fetch,
      username,
      input.profileUserId ? {
        publicationVersion: 2,
        username,
        profileIdentity: input.profileUserId,
        ownerReceizId,
        artifactId: `profile-showcase:${ownerReceizId}`,
        artifactDigest: firstPaint.artifactDigest,
      } : undefined,
    ));
  // One delivery attempt per exact source in this reconciliation cycle. The
  // current-head receipt and pending outbox can address the same sealed bytes.
  const publicationBySource = new Map<string, Promise<ProfileShowcasePublicProjectionPublicationResult>>();
  const publish: PublicProjectionPublisher = (firstPaint, ownerReceizId) => {
    const sourceKey = `${ownerReceizId}:${firstPaint.artifactDigest}`;
    const pending = publicationBySource.get(sourceKey);
    if (pending) return pending;
    const attempt = publishSource(firstPaint, ownerReceizId);
    publicationBySource.set(sourceKey, attempt);
    return attempt;
  };
  let authority: ComposerIdentityCustodyContext | null = null;
  const vault = createVault({
    resolveVerifiedCheckpointActorEvidence: async (artifactDigest) =>
      authority && artifactDigest === authority.actorAdmission.artifactSha256
        ? authority.actorAdmission
        : null,
  });
  // Already-admitted source delivery is independent of identity recovery.
  // Run it concurrently: neither network delivery nor an identity unlock may
  // become a prerequisite for the other. New appends below still need custody.
  const heldDelivery = input.heldArtifactId
    && /^profile-showcase:[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(input.heldArtifactId)
    ? ensureCurrent(vault, input.heldArtifactId, publish).catch((error) => {
        console.warn("profile_showcase_public_head_pending", error instanceof Error ? error.message : String(error));
      })
    : null;
  authority = await (dependencies.resolveAuthority ?? resolveComposerIdentityCustody)(
    `${username}.receiz.id`,
    { selectedShowcaseArtifactId: input.heldArtifactId },
  );
  const artifactId = heldIdentityShowcaseArtifactId(authority);
  if (!artifactId || !authority) {
    await heldDelivery;
    console.warn("profile_showcase_source_recovery_pending", "identity-custody-unavailable");
    return Object.freeze({ status: "pending" as const, needsRetry: true });
  }
  const held = await vault.readPublicationHead(artifactId);
  if (held && held.artifactId !== artifactId) {
    return Object.freeze({ status: "pending" as const, needsRetry: true });
  }

  // Publication moves the already-admitted bytes. It needs neither another
  // identity unlock nor agreement from a partial profile/count projection.
  // Local source completion must not queue behind a network publication.
  let backfillOriginals = input.originals;
  let countDiscrepancy = false;
  let discoveryUnavailable = false;
  if (held && (input.discoverPublicHead || (Number.isSafeInteger(input.visibleOriginalCount) && input.visibleOriginalCount! >= 0))) {
    const firstPaint = await vault.readFirstPaint(artifactId);
    if (!firstPaint || firstPaint.artifactDigest !== held.artifactDigest) {
      return Object.freeze({ status: "pending" as const, needsRetry: true });
    }
    const sealedCounts = firstPaint.carrier["profile-showcase"].counts as { visibleCount?: unknown } | undefined;
    if (!Number.isSafeInteger(sealedCounts?.visibleCount)) {
      return Object.freeze({ status: "pending" as const, needsRetry: true });
    }
    // Carrier counts measure sealed placements. One migration child may carry
    // several Originals, so compare discovery with the complete sealed
    // Original projection rather than the number of child placements.
    const complete = await vault.readCompleteSource(artifactId, undefined, { retainedHiddenOnly: true });
    if (!complete) return Object.freeze({ status: "pending" as const, needsRetry: true });
    const heldOriginals = (dependencies.projectHeldOriginals ?? projectOwnerShowcaseOriginals)(complete,
      { retainedHiddenOnly: true });
    const sealedVisibleOriginalCount = visibleShowcaseOriginalsFromOriginals(heldOriginals).length;
    let discoveredVisibleCount = Number.isSafeInteger(input.visibleOriginalCount) && input.visibleOriginalCount! >= 0
      ? input.visibleOriginalCount! : 0;
    if (input.discoverPublicHead && input.profileUserId && discoveredVisibleCount <= sealedVisibleOriginalCount) {
      const publicVisibleCount = await (dependencies.discoverPublicVisibleCount
        ?? discoverPublicProfileVisibleOriginalCount)(username, input.profileUserId);
      if (publicVisibleCount === null) discoveryUnavailable = true;
      else discoveredVisibleCount = Math.max(discoveredVisibleCount, publicVisibleCount);
    }
    countDiscrepancy = discoveredVisibleCount > sealedVisibleOriginalCount;
    if (countDiscrepancy) {
      // A newer representation is a discovery signal. Only the existing owner
      // migration sealer may admit a missing member to the proof object.
      const discovered = await (dependencies.loadCompleteLegacyShowcase
        ?? ((owner: string) => loadCompleteLegacyProfileShowcase({ username: owner, manage: false })))(username);
      const heldIds = new Set(heldOriginals.map(original => original.id));
      const heldProofIdentities = new Set(heldOriginals.map(profileOriginalProofIdentityKey).filter(Boolean));
      backfillOriginals = discovered.filter(original => !heldIds.has(original.id)
        && !heldProofIdentities.has(profileOriginalProofIdentityKey(original)));
    }
  }

  const missing = held && (input.allowLegacyBackfill || countDiscrepancy)
    ? await (dependencies.resolveMissing ?? resolveMissingLegacyShowcaseOriginals)({
      artifactId,
      originals: backfillOriginals,
      boundedVault: vault,
      unsignedProfile: input.unsignedProfile,
    })
    : null;
  if (!held || (missing && missing.length > 0)) {
    const migration = await ensureMigration(username, {
      readAuthority: () => authority,
      boundedVault: vault,
      publishPublicProjection: publish,
      ...(held ? { knownOriginals: missing! } : input.allowLegacyBackfill
        ? { loadCompleteLegacyShowcase: async () => input.originals } : {}),
    });
    if (
      migration.status !== "settled"
      || migration.firstPaint.carrier["profile-showcase"].artifactId !== artifactId
    ) {
      console.warn("profile_showcase_source_recovery_pending", migration.status === "failed"
        ? migration.code : migration.status);
      return Object.freeze({ status: "pending" as const, needsRetry: true });
    }
  }

  if (held && input.acceptedHeadArtifactDigest
    && held.artifactDigest !== input.acceptedHeadArtifactDigest
    && !await vault.isVerifiedPublicationAncestor(artifactId, input.acceptedHeadArtifactDigest, held.artifactDigest)) {
    await (dependencies.recoverRelationship ?? recoverAcceptedShowcaseRelationship)({ username, artifactId, authority, vault });
  }

  // Retain the exact complete source for image export before delivery work.
  await vault.exportCompleteSource(artifactId);

  // The sealed head reaches the public cold rail before derivative signing or
  // Original projection work. A slow servant cannot defer this successor.
  const ensureRelatedCurrentHead = async () => {
    let result = await ensureCurrent(vault, artifactId, publish);
    if (result.pending > 0 && result.code === "PROFILE_SHOWCASE_RUNTIME_CACHE_DESCENDANT_REQUIRED") {
      try {
        await (dependencies.recoverRelationship ?? recoverAcceptedShowcaseRelationship)({ username, artifactId, authority, vault });
        result = await ensureCurrent(vault, artifactId, publish);
      } catch (error) {
        console.warn("profile_showcase_source_relationship_pending", error instanceof Error ? error.message : String(error));
      }
    }
    return result;
  };
  const initialCurrentHead = await ensureRelatedCurrentHead();
  await heldDelivery;
  if (initialCurrentHead.pending > 0) {
    console.warn("profile_showcase_public_head_pending", initialCurrentHead.code ?? "PROFILE_SHOWCASE_PUBLICATION_PENDING");
  }
  const signingOriginals = input.profileUserId
    ? await (dependencies.recoverHeldSigning ?? recoverHeldProfileOriginalSigningIntents)({
      username, profileUserId: input.profileUserId, originals: input.originals, artifactId, vault,
    })
    : input.originals;
  // Known accepted signing intent appends immediately. Discovery of an unknown
  // addition cannot delay or gate stronger already-held signing truth.
  await flushOriginals({ username, originals: signingOriginals, artifactId });
  const knownSigningFlush = await flushPublic(vault, publish, artifactId);
  let migratedFlush = knownSigningFlush;
  let signingDiscoveryPending = false;
  if (input.profileUserId) {
    try {
      const publishedSigningOriginals = await (dependencies.recoverPublishedSigning ?? recoverPublishedProfileOriginalSigningIntents)({
        username, profileUserId: input.profileUserId, originals: signingOriginals, artifactId, vault,
      });
      if (publishedSigningOriginals !== signingOriginals) {
        await flushOriginals({ username, originals: publishedSigningOriginals, artifactId });
        migratedFlush = await flushPublic(vault, publish, artifactId);
      }
    } catch (error) {
      signingDiscoveryPending = true;
      console.warn("profile_showcase_signing_addition_pending", error instanceof Error ? error.message : String(error));
    }
  }
  const currentHead = await ensureRelatedCurrentHead();
  if (currentHead.pending > 0) {
    console.warn("profile_showcase_public_head_pending", currentHead.code ?? "PROFILE_SHOWCASE_PUBLICATION_PENDING");
  }
  const needsRetry = knownSigningFlush.pending > 0 || migratedFlush.pending > 0 || currentHead.pending > 0
    || signingDiscoveryPending || discoveryUnavailable || (countDiscrepancy && (!missing || missing.length === 0));
  return Object.freeze({
    status: needsRetry ? "pending" as const : "settled" as const,
    needsRetry,
  });
}

/** One owner-screen workspace for the existing vault, not another authority.
 * Retry only delivery beneath retained canonical custody. Each cycle supplies
 * its current resolver; never retain the first cycle's closed-over identity.
 */
export function createOwnedProfilePublicHeadReconciler(
  dependencies: OwnedProfilePublicHeadReconciliationDependencies = {},
) {
  type VaultOptions = NonNullable<Parameters<typeof createProfileShowcaseBoundedEdgeVault>[0]>;
  let retained: {
    scope: string;
    context: { resolve: VaultOptions["resolveVerifiedCheckpointActorEvidence"] };
    vault: ProfileShowcaseBoundedEdgeVault;
  } | null = null;
  return (input: Parameters<typeof reconcileOwnedProfileShowcasePublicHead>[0]) => {
    const scope = JSON.stringify([normalizedUsername(input.username), input.profileUserId ?? null,
      input.heldArtifactId ?? null, peekActiveIdentityCustodyContext()?.actorAdmission.artifactSha256 ?? null]);
    return reconcileOwnedProfileShowcasePublicHead(input, {
      ...dependencies,
      createVault: (options = {}) => {
        if (!retained || retained.scope !== scope) {
          const context = { resolve: options.resolveVerifiedCheckpointActorEvidence };
          const vault = (dependencies.createVault ?? createProfileShowcaseBoundedEdgeVault)({
            ...options,
            resolveVerifiedCheckpointActorEvidence: async digest => context.resolve?.(digest) ?? null,
          });
          retained = { scope, context, vault };
        } else {
          retained.context.resolve = options.resolveVerifiedCheckpointActorEvidence;
        }
        return retained.vault;
      },
    });
  };
}
