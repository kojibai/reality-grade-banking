"use client";

import {
  peekActiveIdentityCustodyContext,
} from "@/app/lib/auth/activeIdentityCustodyContext";
import type { ProfileOriginal } from "@/app/lib/profile/types";
import type { ProfileShowcaseBoundedEdgeVault, ProfileShowcaseBoundedFirstPaint } from "./boundedEdgeVault";
import {
  ensureProfileShowcaseBoundedFirstPaintIfAuthorized,
  publishComposerBoundedShowcaseIfAuthorized,
} from "./composerPublication";
import {
  loadCompleteLegacyProfileShowcase,
} from "./composerLegacyMigration";
import {
  resolveComposerIdentityCustody,
  type ComposerIdentityCustodyContext,
} from "./composerIdentityCustodyResolver";
import {
  publishProfileShowcasePublicProjection,
  type ProfileShowcasePublicProjectionPublicationResult,
} from "./publicProjectionPublication";
import { enqueueProfileShowcaseOriginalProjection } from "./originalProjectionIntent";
import { recoverAcceptedShowcasePredecessor } from "./acceptedPredecessorRecovery.client";
import type { SourceBoundPublicInventoryAppend } from "./sourceBoundPublicInventoryAppend";

type ComposerBoundedPublisher =
  typeof publishComposerBoundedShowcaseIfAuthorized;
type ProfileShowcaseFirstPaintEnsurer =
  typeof ensureProfileShowcaseBoundedFirstPaintIfAuthorized;

export type ComposerBoundedSettlementOutcome =
  | Readonly<{
      status: "custody-unavailable";
    }>
  | Readonly<{
      status: "settled";
      firstPaint: ProfileShowcaseBoundedFirstPaint;
      publicSettlement: "published" | "pending" | "rejected";
    }>
  | Readonly<{
      status: "failed";
      code: string;
    }>
  | Readonly<{
      status: "source-preserved";
      code: string;
      publicSettlement: "pending";
    }>;

export type ComposerBoundedSettlementDependencies = Readonly<{
  sourceBoundPublicInventoryAppend?: SourceBoundPublicInventoryAppend;
  readAuthority?: (
    ownerReceizId: string,
  ) => ComposerIdentityCustodyContext | null;
  resolveAuthority?: (
    ownerReceizId: string,
  ) => Promise<ComposerIdentityCustodyContext | null>;
  publish?: ComposerBoundedPublisher;
  loadCompleteLegacyShowcase?: () => Promise<readonly ProfileOriginal[]>;
  publishPublicProjection?: (
    firstPaint: import("./boundedEdgeVault").ProfileShowcasePublicationSource,
    ownerReceizId: string,
  ) => Promise<ProfileShowcasePublicProjectionPublicationResult>;
  onLocalAdmission?: (
    firstPaint: ProfileShowcaseBoundedFirstPaint,
  ) => Promise<void> | void;
}>;

export type ComposerIdentityBindingRecoveryInput = Readonly<{
  ownerReceizId: string;
  username: string;
  nextPath: string;
}>;

export type ComposerBoundedSettlementRecoveryDependencies =
  ComposerBoundedSettlementDependencies & Readonly<{
    recoverIdentityBinding?: (
      input: ComposerIdentityBindingRecoveryInput,
    ) => Promise<void>;
  }>;

export type ProfileShowcaseFirstPaintMigrationDependencies =
  ComposerBoundedSettlementRecoveryDependencies & Readonly<{
    ensureFirstPaint?: ProfileShowcaseFirstPaintEnsurer;
    boundedVault?: ProfileShowcaseBoundedEdgeVault;
    knownOriginals?: readonly ProfileOriginal[];
  }>;

function normalizedComposerOwner(username: string): Readonly<{
  ownerReceizId: string;
  username: string;
  nextPath: string;
}> | null {
  const normalizedUsername = username
    .trim()
    .replace(/^@+/, "")
    .normalize("NFC")
    .toLowerCase();
  if (
    !/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalizedUsername)
  ) {
    return null;
  }
  return Object.freeze({
    ownerReceizId: `${normalizedUsername}.receiz.id`,
    username: normalizedUsername,
    nextPath: `/u/${encodeURIComponent(normalizedUsername)}`,
  });
}

export async function settleComposerBoundedAppend(
  renderedSealedArtifact: Blob,
  username: string,
  routeProjection: ProfileOriginal,
  dependencies: ComposerBoundedSettlementDependencies = {},
): Promise<ComposerBoundedSettlementOutcome> {
  const normalized = normalizedComposerOwner(username);
  if (!normalized) {
    return Object.freeze({
      status: "failed",
      code: "PROFILE_SHOWCASE_OWNER_INVALID",
    });
  }
  const { ownerReceizId } = normalized;
  const readAuthority =
    dependencies.readAuthority ?? peekActiveIdentityCustodyContext;
  const resolveAuthority =
    dependencies.resolveAuthority ?? resolveComposerIdentityCustody;
  let authority: ComposerIdentityCustodyContext | null = readAuthority(ownerReceizId);
  if (!authority) {
    try {
      authority = await resolveAuthority(ownerReceizId);
    } catch (error) {
      return Object.freeze({
        status: "failed",
        code: error instanceof Error && error.message.trim()
          ? error.message
          : "PROFILE_SHOWCASE_IDENTITY_CUSTODY_RESOLUTION_FAILED",
      });
    }
  }
  if (!authority) {
    return Object.freeze({ status: "custody-unavailable" });
  }
  try {
    const publish =
      dependencies.publish ?? publishComposerBoundedShowcaseIfAuthorized;
    const publication = await publish({
      renderedSealedArtifact,
      username,
      actorId: authority.actorId,
      actorAdmission: authority.actorAdmission,
      showcaseArtifactId: authority.showcaseArtifactId,
      keyFile: authority.keyFile,
      passphrase: authority.unlock(),
      routeProjection,
      sourceBoundPublicInventoryAppend: dependencies.sourceBoundPublicInventoryAppend,
      loadCompleteLegacyShowcase:
        dependencies.loadCompleteLegacyShowcase
        ?? (() => loadCompleteLegacyProfileShowcase({ username })),
      publishPublicProjection:
        dependencies.publishPublicProjection
        ?? ((firstPaint, ownerReceizId) =>
          publishProfileShowcasePublicProjection(
            firstPaint,
            ownerReceizId,
            fetch,
            normalized.username,
          )),
      onLocalAdmission: dependencies.onLocalAdmission,
      recoverAcceptedPredecessor: async (vault, artifactId) => {
        await recoverAcceptedShowcasePredecessor({ username: normalized.username, artifactId, vault });
      },
    });
    if (!publication?.firstPaint) {
      return Object.freeze({
        status: "failed",
        code: "PROFILE_SHOWCASE_BOUNDED_SETTLEMENT_MISSING",
      });
    }
    return Object.freeze({
      status: "settled",
      firstPaint: publication.firstPaint,
      publicSettlement: publication.publicSettlement,
    });
  } catch (error) {
    const code = error instanceof Error && error.message.trim()
      ? error.message
      : "PROFILE_SHOWCASE_BOUNDED_SETTLEMENT_FAILED";
    enqueueProfileShowcaseOriginalProjection({
      username: normalized.username,
      original: routeProjection,
    });
    return Object.freeze({
      status: "source-preserved",
      code,
      publicSettlement: "pending",
    });
  }
}

/**
 * Compatibility name for the proof-native settlement rail. Identity
 * admission settles at login/restore, never inside the composer hot path.
 * The sealed child is attempted exactly once and is never regenerated.
 */
export async function settleComposerBoundedAppendWithIdentityRecovery(
  renderedSealedArtifact: Blob,
  username: string,
  routeProjection: ProfileOriginal,
  dependencies: ComposerBoundedSettlementRecoveryDependencies = {},
): Promise<ComposerBoundedSettlementOutcome> {
  return settleComposerBoundedAppend(
    renderedSealedArtifact,
    username,
    routeProjection,
    dependencies,
  );
}

/**
 * Establishes the one-time complete owner migration behind settled paint.
 * Once native bounded custody exists, the ensure path reopens it and replays
 * only its durable public handoff; it never reloads the canonical showcase.
 */
export async function ensureProfileShowcaseFirstPaintMigrationWithIdentityRecovery(
  username: string,
  dependencies: ProfileShowcaseFirstPaintMigrationDependencies = {},
): Promise<ComposerBoundedSettlementOutcome> {
  const normalized = normalizedComposerOwner(username);
  if (!normalized) {
    return Object.freeze({
      status: "failed",
      code: "PROFILE_SHOWCASE_OWNER_INVALID",
    });
  }
  const readAuthority =
    dependencies.readAuthority ?? peekActiveIdentityCustodyContext;
  const resolveAuthority =
    dependencies.resolveAuthority ?? resolveComposerIdentityCustody;
  let authority: ComposerIdentityCustodyContext | null;
  try {
    authority = readAuthority(normalized.ownerReceizId)
      ?? await resolveAuthority(normalized.ownerReceizId);
  } catch (error) {
    return Object.freeze({
      status: "failed" as const,
      code: error instanceof Error && error.message.trim()
        ? error.message
        : "PROFILE_SHOWCASE_IDENTITY_CUSTODY_RESOLUTION_FAILED",
    });
  }
  if (!authority) {
    return Object.freeze({ status: "custody-unavailable" });
  }
  try {
    const ensureFirstPaint = dependencies.ensureFirstPaint
      ?? ensureProfileShowcaseBoundedFirstPaintIfAuthorized;
    const settlement = await ensureFirstPaint({
      username: normalized.username,
      boundedVault: dependencies.boundedVault,
      knownOriginals: dependencies.knownOriginals,
      recoverAcceptedPredecessor: async (vault, artifactId) => {
        await recoverAcceptedShowcasePredecessor({ username: normalized.username, artifactId, vault });
      },
      actorId: authority.actorId,
      actorAdmission: authority.actorAdmission,
      showcaseArtifactId: authority.showcaseArtifactId,
      keyFile: authority.keyFile,
      passphrase: authority.unlock(),
      loadCompleteLegacyShowcase:
        dependencies.loadCompleteLegacyShowcase
        ?? (() => loadCompleteLegacyProfileShowcase({
          username: normalized.username,
        })),
      publishPublicProjection:
        dependencies.publishPublicProjection
        ?? ((firstPaint, ownerReceizId) =>
          publishProfileShowcasePublicProjection(
            firstPaint,
            ownerReceizId,
            fetch,
            normalized.username,
          )),
    });
    return Object.freeze({
      status: "settled" as const,
      firstPaint: settlement.firstPaint,
      publicSettlement: settlement.publicSettlement,
    });
  } catch (error) {
    return Object.freeze({
      status: "failed" as const,
      code: error instanceof Error && error.message.trim()
        ? error.message
        : "PROFILE_SHOWCASE_FIRST_PAINT_MIGRATION_FAILED",
    });
  }
}
