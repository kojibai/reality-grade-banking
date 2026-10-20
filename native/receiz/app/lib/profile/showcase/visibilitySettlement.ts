"use client";

import { profileOriginalProofIdentityKey } from "../pbiSignatureHistory";
import type { ProfileOriginal } from "../types";
import { profileShowcaseLiveKaiUpulse } from "./liveKaiTimeSource";
import { rederiveReceizBoundedProfileShowcaseCarrierFromAdmission } from "../../../../packages/receiz-sdk/src/index";
import type {
  ReceizArtifactTransitionSealer,
  ReceizCommitDomainId,
  ReceizKeyFile,
  ReceizVerifiedIdentityArtifactAdmission,
  ReceizVerifiedPortableStateAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import {
  createProfileShowcaseVisibilityAuthority,
} from "./authorityProvider";
import {
  createProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedFirstPaint,
  type ProfileShowcaseLegacyMigrationChild,
} from "./boundedEdgeVault";
import {
  createReceizBrowserArtifactTransitionStore,
  type ReceizBrowserArtifactTransitionStore,
} from "./browserTransitionStore";
import {
  commitAndPublishBoundedProfileShowcaseChildReplacement,
  commitAndPublishBoundedProfileShowcaseTransition,
} from "./boundedTransitionPublication";
import {
  createProfileShowcaseNativeTransitionSealer,
  withProfileShowcaseCausalAppendLock,
} from "./composerPublication";
import { resolveComposerIdentityCustody } from "./composerIdentityCustodyResolver";
import {
  sealAndAdmitComposerProfileOriginalChild,
} from "./composerChild";
import {
  enqueueProfileShowcaseIntoBrowserEconomy,
  flushPendingProfileShowcaseEconomyAppends,
} from "./economyRetry";
import { publishProfileShowcasePublicProjection } from "./publicProjectionPublication";
import { resolvePublicationIdentityCustody } from "./publicationIdentityCustody";
import {
  flushPendingProfileShowcasePublicProjections,
  ensureCurrentProfileShowcasePublicProjection,
  type PublicProjectionPublisher,
  type ProfileShowcasePublicProjectionEnsureResult,
} from "./publicProjectionRetry";
import { readProfileShowcasePublicationRoute, type ProfileShowcasePublicationRoute } from "./publicProjectionScope.client";
import type { ProfileShowcaseArtifactId } from "./types";
import {
  COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
  encodeCompleteLegacyShowcaseMigrationPayload,
} from "./legacyMigrationPayload";

function normalizedOwner(username: string): string {
  const normalized = username.trim().replace(/^@+/, "").normalize("NFC")
    .toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized)) {
    throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_OWNER_INVALID");
  }
  return `${normalized}.receiz.id`;
}

function visibilityArtifactId(username: string): ProfileShowcaseArtifactId {
  const ownerReceizId = normalizedOwner(username);
  return `profile-showcase:${ownerReceizId}` as ProfileShowcaseArtifactId;
}

export async function beginBoundedProfileVisibilityTransition(input: Readonly<{
  username: string;
  receizId: string;
  showOnProfile: boolean;
}>,
vault: ProfileShowcaseBoundedEdgeVault = createProfileShowcaseBoundedEdgeVault(),
): Promise<void> {
  const artifactId = visibilityArtifactId(input.username);
  // Rebuild the derivative lookup from verified held child truth before the
  // predecessor is quarantined. Existing v114 preview stores gain the same
  // bounded lookup without changing any sealed proof bytes.
  await vault.resolveOriginalChildReference(artifactId, input.receizId);
  await vault.beginVisibilityTransition({
    artifactId,
    originalId: input.receizId,
    showOnProfile: input.showOnProfile,
  });
}

export async function cancelBoundedProfileVisibilityTransition(input: Readonly<{
  username: string;
  receizId: string;
}>,
vault: ProfileShowcaseBoundedEdgeVault = createProfileShowcaseBoundedEdgeVault(),
): Promise<void> {
  await vault.clearVisibilityTransition(
    visibilityArtifactId(input.username),
    input.receizId,
  );
}

export type VisibilityServerPayload = Readonly<{
  /** Local settlement result. Public delivery may still be unconfirmed. */
  ok?: boolean;
  error?: string;
  settlementError?: string;
  /** Derivative visibility PATCH / retry-intent failure, not publication status. */
  deliveryError?: string;
  pendingReceizIds?: readonly string[];
  /** Compatibility field: rejected delivery remains pending for older clients. */
  publicPublication?: "published" | "pending";
  publicPublicationStatus?: ProfileShowcasePublicProjectionEnsureResult["status"];
  publicPublicationCode?: string | null;
  /** Exact head captured by the publication attempt; null if none was read. */
  publicPublicationArtifactDigest?: string | null;
  /** Final locally accepted head for this operation, including accepted aliases. */
  settledArtifactDigest?: string;
  visibility?: Readonly<{
    receizId: string;
    affectedReceizIds?: readonly string[];
    showOnProfile: boolean;
  }>;
}>;

function publicVisibilityErrorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "PROFILE_SHOWCASE_COMPLETE_PUBLICATION_PENDING";
}

function pendingVisibilityPublication(
  code: string,
  artifactDigest: string | null = null,
): ProfileShowcasePublicProjectionEnsureResult {
  return Object.freeze({
    published: 0,
    pending: 1,
    status: "pending" as const,
    code,
    artifactDigest,
  });
}

/** Distribution cannot revoke a locally admitted visibility successor.
 * Preserve the publisher's diagnostics and require its acknowledged head to
 * contain this operation's accepted head before reporting publication success.
 */
export async function readVisibilityPublication(
  vault: ProfileShowcaseBoundedEdgeVault,
  artifactId: ProfileShowcaseArtifactId,
  settledArtifactDigest?: string,
  delivery?: Readonly<{
    publish?: PublicProjectionPublisher;
    readRoute?: () => ProfileShowcasePublicationRoute | null;
  }>,
): Promise<ProfileShowcasePublicProjectionEnsureResult> {
  let artifactDigest: string | null = null;
  try {
    const options = delivery?.readRoute ? { readRoute: delivery.readRoute } : undefined;
    let publication = await ensureCurrentProfileShowcasePublicProjection(
      vault,
      artifactId,
      delivery?.publish,
      options,
    );
    if (publication.code === "PROFILE_SHOWCASE_PUBLIC_SOURCE_CAUSAL_INTERMEDIATE_REQUIRED") {
      // The newest sealed visibility successor cannot skip a required sealed
      // ancestor. Replay the same artifact's verified pending heads, then read
      // the exact newest receipt; Kai upulse orders replay inside the outbox.
      await flushPendingProfileShowcasePublicProjections(
        vault, delivery?.publish, artifactId, options,
      );
      publication = await ensureCurrentProfileShowcasePublicProjection(
        vault, artifactId, delivery?.publish, options,
      );
    }
    artifactDigest = publication.artifactDigest;
    if (publication.status !== "published") {
      // Never let a rejected result become success via numeric-only callers.
      return Object.freeze({ ...publication, published: 0, pending: 1 });
    }
    if (publication.pending !== 0 || !artifactDigest) {
      return pendingVisibilityPublication(
        "PROFILE_SHOWCASE_PUBLICATION_RECEIPT_MISMATCH",
        artifactDigest,
      );
    }
    if (
      settledArtifactDigest &&
      artifactDigest !== settledArtifactDigest &&
      !await vault.isVerifiedPublicationAncestor(
        artifactId,
        settledArtifactDigest,
        artifactDigest,
      )
    ) {
      // An older held presentation or an unrelated head cannot confirm Unhide.
      // A later acknowledged head covers it only through verified ancestry.
      return pendingVisibilityPublication(
        "PROFILE_SHOWCASE_VISIBILITY_PUBLICATION_ANCESTRY_UNCONFIRMED",
        artifactDigest,
      );
    }
    return publication;
  } catch (error) {
    return pendingVisibilityPublication(
      publicVisibilityErrorCode(error),
      artifactDigest,
    );
  }
}

let visibilityRetryOnlineListenerInstalled = false;
const pendingPublicVisibilityRetries = new Set<ProfileShowcaseArtifactId>();

function schedulePendingPublicVisibilityRetry(
  vault: ProfileShowcaseBoundedEdgeVault,
  artifactId: ProfileShowcaseArtifactId,
  acceptedArtifactDigest: string,
  delivery?: Readonly<{
    publish: PublicProjectionPublisher;
    readRoute: () => ProfileShowcasePublicationRoute | null;
  }>,
): void {
  if (typeof window === "undefined" || pendingPublicVisibilityRetries.has(artifactId)) return;
  pendingPublicVisibilityRetries.add(artifactId);
  let attempts = 0;
  const retry = async () => {
    attempts += 1;
    let result: ProfileShowcasePublicProjectionEnsureResult;
    try {
      result = await readVisibilityPublication(vault, artifactId, acceptedArtifactDigest, delivery);
    } catch (error) {
      result = pendingVisibilityPublication(publicVisibilityErrorCode(error), acceptedArtifactDigest);
    }
    const confirmed = result.status === "published" && result.pending === 0;
    if (!confirmed) {
      console.warn("profile_visibility_publication_retry_unconfirmed", {
        artifactId,
        artifactDigest: result.artifactDigest,
        status: result.status,
        code: result.code,
        attempt: attempts,
      });
    }
    if (confirmed || attempts >= 5) {
      pendingPublicVisibilityRetries.delete(artifactId);
      return;
    }
    window.setTimeout(retry, Math.min(30_000, 2_000 * 2 ** attempts));
  };
  window.setTimeout(retry, 2_000);
}

function usernameFromVisibilityArtifactId(
  artifactId: ProfileShowcaseArtifactId,
): string | null {
  const match = /^profile-showcase:(.+)\.receiz\.id$/.exec(artifactId);
  return match?.[1] ?? null;
}

function schedulePendingVisibilityReplay(
  vault: ProfileShowcaseBoundedEdgeVault,
): void {
  if (
    typeof window === "undefined"
    || visibilityRetryOnlineListenerInstalled
  ) return;
  visibilityRetryOnlineListenerInstalled = true;
  window.addEventListener("online", () => {
    void flushPendingBoundedProfileVisibilityTransitions({ vault }).catch(
      () => {
        // Ambiguous work remains in durable quarantine for the next replay.
      },
    );
  });
}

export async function flushPendingBoundedProfileVisibilityTransitions(
  dependencies: Readonly<{
    vault?: ProfileShowcaseBoundedEdgeVault;
    settleVisibility?: typeof settleBoundedProfileVisibility;
  }> = {},
): Promise<void> {
  const vault = dependencies.vault ?? createProfileShowcaseBoundedEdgeVault();
  const pending = await vault.pendingVisibilityTransitions();
  for (const transition of pending) {
    // Earlier replay can clear the canonical marker captured in this snapshot.
    const current = await vault.pendingVisibilityTransitions(transition.artifactId);
    if (!current.some((entry) => entry.originalId === transition.originalId
      && entry.showOnProfile === transition.showOnProfile)) continue;
    let username = usernameFromVisibilityArtifactId(transition.artifactId);
    if (!username) continue;
    try {
      const { peekReceizAccountBindingForActivePrincipal } = await import("../../auth/receizAccountBindings");
      const activeUsername = peekReceizAccountBindingForActivePrincipal()?.session.username;
      if (activeUsername) {
        const custody = await resolveComposerIdentityCustody(normalizedOwner(activeUsername), {
          selectedShowcaseArtifactId: transition.artifactId,
        });
        if (custody && transition.artifactId === (custody.showcaseArtifactId ?? `profile-showcase:${custody.ownerReceizId}`)) {
          username = activeUsername;
        }
      }
      const result = await propagateAndSettleBoundedProfileVisibility({
        username,
        receizId: transition.originalId,
        showOnProfile: transition.showOnProfile,
        selectedShowcaseArtifactId: transition.artifactId,
      }, { vault, settleVisibility: dependencies.settleVisibility });
      if (result.json?.ok !== true) {
        schedulePendingVisibilityReplay(vault);
        return;
      }
    } catch {
      schedulePendingVisibilityReplay(vault);
      return;
    }
  }
}

export async function settleLegacyMigrationVisibilitySuccessor(
  input: Readonly<{
    ownerReceizId: string;
    artifactId: ProfileShowcaseArtifactId;
    originalId: string;
    showOnProfile: boolean;
    actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
    keyFile: ReceizKeyFile;
    passphrase: string;
    commitDomain: ReceizCommitDomainId;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizBrowserArtifactTransitionStore;
    boundedVault: ProfileShowcaseBoundedEdgeVault;
    migrationChild: ProfileShowcaseLegacyMigrationChild;
    sealMigrationChild?: (
      childInput: Parameters<
        typeof sealAndAdmitComposerProfileOriginalChild
      >[0],
    ) => Promise<ReceizVerifiedPortableStateAdmission>;
    afterEdgeAdmission?: () => Promise<void>;
  }>,
): Promise<ProfileShowcaseBoundedFirstPaint> {
  let found = false;
  let changed = false;
  const updatedOriginals = input.migrationChild.originals.map((original) => {
    if (original.id !== input.originalId) return original;
    found = true;
    if (original.showOnProfile === input.showOnProfile) return original;
    changed = true;
    return { ...original, showOnProfile: input.showOnProfile };
  });
  if (!found) {
    throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_CHILD_REQUIRED");
  }
  if (!changed) {
    await input.afterEdgeAdmission?.();
    const held = await input.boundedVault.readFirstPaint(input.artifactId);
    if (!held) {
      throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_PUBLICATION_FAILED");
    }
    return held;
  }
  const predecessorAdmission = await input.boundedVault.reopenHead(input.artifactId);
  if (!predecessorAdmission?.proofHistoryHead) {
    throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_HEAD_REQUIRED");
  }
  const predecessorCarrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessorAdmission);
  const lastOperation = (predecessorCarrier["profile-showcase"].directDelta as readonly Record<string, unknown>[]).at(-1);
  const appendedChild = lastOperation?.child as Record<string, unknown> | undefined;
  const alreadyAppended = await input.boundedVault.resolveOriginalChildCustody(input.artifactId, `migration:${input.ownerReceizId}`);
  const replacementPayload = encodeCompleteLegacyShowcaseMigrationPayload({
    ownerReceizIdentity: input.ownerReceizId,
    originals: updatedOriginals,
  });
  if (lastOperation?.kind === "showcase.append" && alreadyAppended
    && alreadyAppended.reference.childArtifactDigest !== input.migrationChild.reference.childArtifactDigest
    && alreadyAppended.reference.childArtifactDigest === appendedChild?.childArtifactDigest
    && alreadyAppended.reference.immutableVersion === appendedChild.immutableVersion
    && alreadyAppended.verifiedPayloadMimeType === COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME
    && alreadyAppended.verifiedPayloadBytes.length === replacementPayload.length
    && alreadyAppended.verifiedPayloadBytes.every((byte, index) => byte === replacementPayload[index])) {
    // The current exact causal head already admitted this replacement. Resume
    // only its missing predecessor hide; never reseal or append it a second time.
    await input.store.ensureHead(input.artifactId, {
      algorithm: "sha-256", binds: "verified-proof-history",
      value: predecessorAdmission.proofHistoryHead.headDigest,
    });
    const authority = await createProfileShowcaseVisibilityAuthority({
      actorAdmission: input.actorAdmission, predecessorAdmission,
      child: input.migrationChild.reference, visibility: "hidden",
      keyFile: input.keyFile, passphrase: input.passphrase,
      commitDomain: input.commitDomain, sealer: input.sealer, store: input.store,
      persistentStateIO: await input.boundedVault.createTransitionPersistentStateIO(input.artifactId, predecessorAdmission.artifactSha256),
      resolveVerifiedHistoricalArtifactDigest: operationCount => input.boundedVault.resolveVerifiedHistoricalArtifactDigest(input.artifactId, predecessorAdmission.artifactSha256, operationCount),
    });
    return commitAndPublishBoundedProfileShowcaseTransition({
      plan: authority.plan, capability: authority.capability, sealer: authority.sealer,
      store: authority.store, children: authority.children, segments: authority.segments,
      boundedVault: input.boundedVault, afterEdgeAdmission: input.afterEdgeAdmission,
    });
  }
  const sealMigrationChild =
    input.sealMigrationChild ?? sealAndAdmitComposerProfileOriginalChild;
  const updatedMigrationChild = await sealMigrationChild({
    renderedSealedBytes: encodeCompleteLegacyShowcaseMigrationPayload({
      ownerReceizIdentity: input.ownerReceizId,
      originals: updatedOriginals,
    }),
    renderedMimeType: COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
    ownerReceizId: input.ownerReceizId,
    immutableVersion: profileShowcaseLiveKaiUpulse(),
    routeProjection: {
      id: `migration:${input.ownerReceizId}`,
      slug: "complete-showcase-migration",
      code: "MIGRATE1",
    },
  });
  await input.store.ensureHead(input.artifactId, {
    algorithm: "sha-256",
    binds: "verified-proof-history",
    value: predecessorAdmission.proofHistoryHead.headDigest,
  });
  return commitAndPublishBoundedProfileShowcaseChildReplacement({
    artifactId: input.artifactId,
    actorAdmission: input.actorAdmission,
    predecessorAdmission,
    replacementChildAdmission: updatedMigrationChild,
    replacedChild: input.migrationChild.reference,
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    commitDomain: input.commitDomain,
    sealer: input.sealer,
    store: input.store,
    boundedVault: input.boundedVault,
    afterEdgeAdmission: input.afterEdgeAdmission,
  });
}

/**
 * Seals the owner's visibility choice first, then propagates that accepted
 * head to server representations. Network/DB response cannot veto or delay
 * the locally admitted proof transition.
 */
export async function propagateAndSettleBoundedProfileVisibility(
  input: Readonly<{
    username: string;
    selectedShowcaseArtifactId?: ProfileShowcaseArtifactId | null;
    receizId: string;
    showOnProfile: boolean;
    knownOriginals?: readonly ProfileOriginal[];
  }>,
  dependencies: Readonly<{
    onLocalAdmission?: (source: ProfileShowcaseBoundedFirstPaint) => void;
    vault?: ProfileShowcaseBoundedEdgeVault;
    settleVisibility?: typeof settleBoundedProfileVisibility;
    resolveIdentityCustody?: typeof resolveComposerIdentityCustody;
    publicProjectionPublisher?: PublicProjectionPublisher;
    readPublicationRoute?: () => ProfileShowcasePublicationRoute | null;
  }> = {},
): Promise<
  Readonly<{
    response: Response;
    json: VisibilityServerPayload | null;
    settledFirstPaint: ProfileShowcaseBoundedFirstPaint | null;
  }>
> {
  /*
   * Resolve the canonical owner once.
   *
   * The route username is only a route/discovery identity. The actual Showcase
   * artifact follows the admitted custody owner and every phase below must use
   * that same artifact + verification context.
   */
  let authorityContext: NonNullable<
    Awaited<ReturnType<typeof resolveComposerIdentityCustody>>
  >;

  try {
    const resolved = await (dependencies.resolveIdentityCustody ?? resolveComposerIdentityCustody)(
      normalizedOwner(input.username),
      { selectedShowcaseArtifactId: input.selectedShowcaseArtifactId },
    );

    if (!resolved) {
      throw new TypeError(
        "PROFILE_SHOWCASE_VISIBILITY_IDENTITY_UNLOCK_REQUIRED",
      );
    }

    authorityContext = resolved;
  } catch (error) {
    return {
      response: new Response(null, { status: 503 }),
      json: {
        ok: false,
        error: "original_visibility_propagation_pending",
        settlementError:
          error instanceof Error ? error.message : String(error),
        pendingReceizIds: [input.receizId],
        publicPublication: "pending",
      },
      settledFirstPaint: null,
    };
  }

  const canonicalArtifactId =
    authorityContext.showcaseArtifactId ?? `profile-showcase:${authorityContext.ownerReceizId}` as ProfileShowcaseArtifactId;

  const actorAdmission = authorityContext.actorAdmission;

  /*
   * One vault for:
   *
   * - pending transition intent
   * - local successor settlement
   * - accepted first paint
   * - public projection delivery
   * - retry
   *
   * This prevents an accepted authority-backed successor from being handed to
   * a second route-keyed/plain vault for publication.
   */
  const vault =
    dependencies.vault ??
    createProfileShowcaseBoundedEdgeVault({
      resolveVerifiedCheckpointActorEvidence: async (artifactDigest) =>
        artifactDigest === actorAdmission.artifactSha256
          ? actorAdmission
          : null,
    });

  const settleVisibility = (
    settlementInput: Parameters<typeof settleBoundedProfileVisibility>[0],
  ) =>
    (dependencies.settleVisibility ?? settleBoundedProfileVisibility)(
      settlementInput,
      {
        boundedVault: vault,
        resolveIdentityCustody: async () => authorityContext,
      },
    );

  // The accepted actor stays bound to the exact source through distribution.
  const readPublicationRoute = dependencies.readPublicationRoute ?? readProfileShowcasePublicationRoute;
  const publishPublicProjection: PublicProjectionPublisher = dependencies.publicProjectionPublisher
    ?? ((source, owner) => publishProfileShowcasePublicProjection(
      source, owner, fetch, input.username, undefined, readPublicationRoute,
      (selected) => resolvePublicationIdentityCustody(selected, {
        readActive: () => ({ actorAdmission: authorityContext.actorAdmission,
          keyFile: authorityContext.keyFile, passphrase: authorityContext.unlock() }),
      }),
    ));

  let settledFirstPaint: ProfileShowcaseBoundedFirstPaint;

  try {
    // Settlement already adopts a missing sealed child, records the owner's
    // local visibility intent, seals the successor, and admits it. Repeat
    // custody reads here only delay the first accepted visibility change.
    settledFirstPaint = await settleVisibility(input);
  } catch (error) {
    // Preserve an interrupted choice for the existing replay rail. This intent
    // cannot change first paint before a sealed successor is admitted.
    try {
      await vault.beginVisibilityTransition({
        artifactId: canonicalArtifactId,
        originalId: input.receizId,
        showOnProfile: input.showOnProfile,
      });
    } catch { /* Keep the settlement error as the reported failure. */ }
    schedulePendingVisibilityReplay(vault);

    return {
      response: new Response(null, { status: 503 }),
      json: {
        ok: false,
        error: "original_visibility_propagation_pending",
        settlementError:
          error instanceof Error ? error.message : String(error),
        pendingReceizIds: [input.receizId],
        publicPublication: "pending",
      },
      settledFirstPaint: null,
    };
  }

  try {
    dependencies.onLocalAdmission?.(settledFirstPaint);
  } catch {
    // UI notification cannot revoke an already admitted native transition.
  }

  // Publish the accepted head while derivative visibility sync runs. A slow
  // PATCH cannot delay this proof object's new global first-paint head.
  const admittedPublicArtifactId =
    settledFirstPaint.carrier.artifactId as ProfileShowcaseArtifactId;
  const admittedVisibilityDigest = settledFirstPaint.artifactDigest;
  const initialPublication = readVisibilityPublication(
    vault, admittedPublicArtifactId, admittedVisibilityDigest,
    { publish: publishPublicProjection, readRoute: readPublicationRoute },
  );

  const requestedFirstPaint = settledFirstPaint;

  let deliveryError: string | undefined;
  let snapshotAvailable = false;

  let expectedIntent:
    | Awaited<
        ReturnType<typeof vault.pendingVisibilityTransitions>
      >[number]
    | null = null;

  try {
    expectedIntent = (
      await vault.pendingVisibilityTransitions(canonicalArtifactId)
    ).find((record) => record.originalId === input.receizId) ?? null;

    snapshotAvailable = true;
  } catch (error) {
    // Delivery evidence is derivative and cannot revoke accepted source truth.
    deliveryError =
      error instanceof Error ? error.message : String(error);
  }

  const acceptedReceizIds = [input.receizId];
  const pendingReceizIds: string[] = [];

  let propagated = false;

  try {
    const response = await fetch(
      "/api/profile/originals/visibility",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          receizId: input.receizId,
          showOnProfile: input.showOnProfile,
        }),
      },
    );

    const json = (await response
      .json()
      .catch(() => null)) as VisibilityServerPayload | null;

    const visibility = json?.visibility;

    propagated =
      response.ok &&
      json?.ok === true &&
      visibility?.receizId === input.receizId &&
      visibility.showOnProfile === input.showOnProfile;

    if (!propagated) {
      deliveryError ??= typeof json?.error === "string" && json.error.trim()
        ? json.error
        : response.ok && json?.ok === true
          ? "original_visibility_response_mismatch"
          : "original_visibility_propagation_pending";
    }

    if (propagated && visibility) {
      /*
       * Server aliases remain discovery candidates only. They must settle
       * through the same canonical owner vault before being acknowledged.
       */
      const candidates = Array.isArray(
        visibility.affectedReceizIds,
      )
        ? visibility.affectedReceizIds
        : [];

      for (const receizId of new Set(candidates)) {
        if (
          typeof receizId !== "string" ||
          !receizId.trim() ||
          receizId === input.receizId
        ) {
          continue;
        }

        const sibling = {
          ...input,
          receizId,
          relatedOriginalId: input.receizId,
        };

        try {
          const accepted = await settleVisibility(sibling);

          settledFirstPaint = accepted;
          acceptedReceizIds.push(receizId);
        } catch {
          pendingReceizIds.push(receizId);
          schedulePendingVisibilityReplay(vault);
        }
      }
    }
  } catch (error) {
    // Distribution cannot revoke the exact successor already admitted locally.
    deliveryError ??= publicVisibilityErrorCode(error);
  }

  if (
    !propagated ||
    pendingReceizIds.length > 0 ||
    !snapshotAvailable
  ) {
    try {
      if (snapshotAvailable) {
        await vault.retainVisibilityPropagationIntent({
          artifactId: canonicalArtifactId,
          originalId: input.receizId,
          showOnProfile: input.showOnProfile,
          acceptedSource: requestedFirstPaint,
          expectedIntent,
        });
      }
    } catch (error) {
      deliveryError =
        error instanceof Error ? error.message : String(error);
    }

    schedulePendingVisibilityReplay(vault);
  }

  /*
   * This is the important confirmation path:
   *
   * publish the accepted canonical head using the SAME vault that admitted it.
   */
  const publicArtifactId =
    settledFirstPaint.carrier.artifactId as ProfileShowcaseArtifactId;

  const publication = publicArtifactId === admittedPublicArtifactId
    && settledFirstPaint.artifactDigest === requestedFirstPaint.artifactDigest
      ? await initialPublication
      : await readVisibilityPublication(
          vault,
          publicArtifactId,
          settledFirstPaint.artifactDigest,
          { publish: publishPublicProjection, readRoute: readPublicationRoute },
        );
  const publicationConfirmed =
    publication.status === "published" && publication.pending === 0;

  if (!publicationConfirmed) {
    console.warn("profile_visibility_publication_unconfirmed", JSON.stringify({
      receizId: input.receizId,
      artifactId: publicArtifactId,
      settledArtifactDigest: settledFirstPaint.artifactDigest,
      artifactDigest: publication.artifactDigest,
      status: publication.status,
      code: publication.code,
    }));
    schedulePendingPublicVisibilityRetry(
      vault,
      publicArtifactId,
      settledFirstPaint.artifactDigest,
      { publish: publishPublicProjection, readRoute: readPublicationRoute },
    );
  }

  return {
    response: new Response(null, {
      status:
        propagated &&
        pendingReceizIds.length === 0 &&
        snapshotAvailable &&
        publicationConfirmed
          ? 200
          : 202,
    }),

    json: {
      ok: true,
      pendingReceizIds,

      ...(deliveryError
        ? {
            deliveryError,
          }
        : {}),

      // Keep ok:true and a successful Response for accepted local truth,
      // including when the derivative/public delivery needs repair or retry.
      publicPublication: publicationConfirmed ? "published" : "pending",
      publicPublicationStatus: publication.status,
      publicPublicationCode: publication.code,
      publicPublicationArtifactDigest: publication.artifactDigest,
      settledArtifactDigest: settledFirstPaint.artifactDigest,

      visibility: {
        receizId: input.receizId,
        affectedReceizIds: acceptedReceizIds,
        showOnProfile: input.showOnProfile,
      },
    },

    settledFirstPaint,
  };
}

/**
 * Settles an owner's visibility choice as a sealed bounded showcase successor.
 * DB, published-manifest, and market writes remain derivative propagation.
 */
export async function settleBoundedProfileVisibility(input: Readonly<{
  username: string;
  receizId: string;
  showOnProfile: boolean;
  relatedOriginalId?: string;
  knownOriginals?: readonly ProfileOriginal[];
}>, dependencies: Readonly<{
  resolveIdentityCustody?: typeof resolveComposerIdentityCustody;
  boundedVault?: ProfileShowcaseBoundedEdgeVault;
  store?: ReceizBrowserArtifactTransitionStore;
  sealer?: ReceizArtifactTransitionSealer;
  sealMigrationChild?: Parameters<typeof settleLegacyMigrationVisibilitySuccessor>[0]["sealMigrationChild"];
}> = {}): Promise<ProfileShowcaseBoundedFirstPaint> {
  const profileOwnerReceizId = normalizedOwner(input.username);
  const authorityContext = await (
    dependencies.resolveIdentityCustody ?? resolveComposerIdentityCustody
  )(profileOwnerReceizId);
  if (!authorityContext) {
    throw new TypeError(
      "PROFILE_SHOWCASE_VISIBILITY_IDENTITY_UNLOCK_REQUIRED",
    );
  }
  const ownerReceizId = authorityContext.showcaseArtifactId?.slice("profile-showcase:".length) ?? authorityContext.ownerReceizId;
  const artifactId =
    `profile-showcase:${ownerReceizId}` as ProfileShowcaseArtifactId;
  const actorAdmission = authorityContext.actorAdmission;
  const boundedVault = dependencies.boundedVault ?? createProfileShowcaseBoundedEdgeVault({
    resolveVerifiedCheckpointActorEvidence: async (artifactDigest) =>
      artifactDigest === actorAdmission.artifactSha256
        ? actorAdmission
        : null,
  });
  // Legacy owner inventory can predate the local composite. Reuse the existing
  // sealed migration/backfill primitive before attempting its visibility append.
  // A representation alone must never be reported as an accepted successor.
  if (input.knownOriginals?.some(original => original.id === input.receizId)) {
    const direct = await boundedVault.resolveOriginalChildReference(artifactId, input.receizId);
    const migrated = direct ? null : await boundedVault.resolveLegacyMigrationChildForOriginal(artifactId, input.receizId);
    if (!direct && !migrated) {
      const {
        ensureProfileShowcaseBoundedFirstPaintIfAuthorized,
        resolveMissingLegacyShowcaseOriginals,
      } = await import("./composerPublication");
      const { loadCompleteLegacyProfileShowcase } = await import("./composerLegacyMigration");
      const _heldHead = await boundedVault.reopenHead(artifactId);
      const knownOriginals = input.knownOriginals;
      try {
        await ensureProfileShowcaseBoundedFirstPaintIfAuthorized({
        username: input.username, actorId: authorityContext.actorId,
        actorAdmission, keyFile: authorityContext.keyFile, passphrase: authorityContext.unlock(),
        boundedVault, knownOriginals,
        loadCompleteLegacyShowcase: () => loadCompleteLegacyProfileShowcase({ username: input.username }),
        deferPublicProjection: true,
        });
      } catch (error) {
        // The child may have entered sealed custody before an older pending
        // intent blocked the backfill presentation read. Continue directly to
        // the visibility successor only when exact child custody now exists.
        if (!(error instanceof Error)
          || error.message !== "PROFILE_SHOWCASE_BOUNDED_EDGE_PUBLICATION_FAILED"
          || (await resolveMissingLegacyShowcaseOriginals({
            artifactId, originals: knownOriginals, boundedVault,
          })).length > 0) throw error;
      }
    }
  }
  return withProfileShowcaseCausalAppendLock(artifactId, async () => {
  const child = await boundedVault.resolveOriginalChildReference(
    artifactId,
    input.receizId,
  );
  if (input.relatedOriginalId) {
    // Candidate aliases must carry the same sealed proof coordinates. A
    // server row or shared claim hash cannot authorize hiding another proof.
    const source = await boundedVault.reopenHead(artifactId);
    if (!source) throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_HEAD_REQUIRED");
    const proofIdentity = async (originalId: string): Promise<string> => {
      const direct = await boundedVault.resolveOriginalChildCustody(artifactId, originalId);
      if (direct) {
        const projection = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(direct.verifiedRouteProjectionBytes)) as Record<string, unknown>;
        return profileOriginalProofIdentityKey({
          code: typeof projection.code === "string" ? projection.code : "",
          pulse: typeof projection.pulse === "string" ? projection.pulse : null,
          verifyPath: typeof projection.verifyPath === "string" ? projection.verifyPath : "",
          verifyUrl: typeof projection.verifyUrl === "string" ? projection.verifyUrl : "",
        });
      }
      const migration = await boundedVault.resolveLegacyMigrationChildForOriginal(artifactId, originalId);
      const original = migration?.originals.find(original => original.id === originalId);
      return original ? profileOriginalProofIdentityKey(original) : "";
    };
    const requestedIdentity = await proofIdentity(input.relatedOriginalId);
    if (!requestedIdentity || requestedIdentity !== await proofIdentity(input.receizId)) {
      throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_ALIAS_SOURCE_MISMATCH");
    }
  }
  const quarantineUnacceptedChoice = async () => {
    if (input.relatedOriginalId) return;
    await boundedVault.beginVisibilityTransition({
      artifactId, originalId: input.receizId, showOnProfile: input.showOnProfile,
    });
  };
  const clearAcceptedVisibilityIntent = async () => {
    if (input.relatedOriginalId) return;
    await boundedVault.clearVisibilityTransition(artifactId, input.receizId);
    const routeArtifactId = visibilityArtifactId(input.username);
    if (routeArtifactId !== artifactId) {
      await boundedVault.clearVisibilityTransition(routeArtifactId, input.receizId);
    }
  };
  const migrationChild = child
    ? null
    : await boundedVault.resolveLegacyMigrationChildForOriginal(
        artifactId,
        input.receizId,
      );
  if (!child && !migrationChild) {
    throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_CHILD_REQUIRED");
  }
  const commitDomain = Object.freeze({
    scheme: "receiz-commit-domain.v1" as const,
    value: `profile-showcase:${ownerReceizId}:local`,
  });
  const admittedPredecessor = await boundedVault.reopenHead(artifactId);
  if (!admittedPredecessor?.proofHistoryHead) throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_HEAD_REQUIRED");
  const store = dependencies.store ?? createReceizBrowserArtifactTransitionStore({
    databaseName: "receiz-profile-showcase-local-transition-v1",
    // The sealed source may advance through restore or another device. An old
    // store aggregate cannot outrank it. Retain that aggregate and seed this
    // append's existing CAS store from the exact SDK-admitted predecessor.
    namespace: `profile-showcase-local:${admittedPredecessor.artifactSha256}`,
    commitDomain,
  });
  if (migrationChild) {
    if (migrationChild.originals.some(original => original.id === input.receizId
      && original.showOnProfile !== input.showOnProfile)) await quarantineUnacceptedChoice();
    const settled = await settleLegacyMigrationVisibilitySuccessor({
      ownerReceizId,
      artifactId,
      originalId: input.receizId,
      showOnProfile: input.showOnProfile,
      actorAdmission,
      keyFile: authorityContext.keyFile,
      passphrase: authorityContext.unlock(),
      commitDomain,
      sealer: dependencies.sealer ?? createProfileShowcaseNativeTransitionSealer(ownerReceizId, boundedVault),
      store,
      boundedVault,
      migrationChild,
      sealMigrationChild: dependencies.sealMigrationChild,
      afterEdgeAdmission: clearAcceptedVisibilityIntent,
    });
    void Promise.allSettled([
      enqueueProfileShowcaseIntoBrowserEconomy({
        artifactId,
        vault: boundedVault,
      }),
      flushPendingProfileShowcaseEconomyAppends(boundedVault),
      flushPendingProfileShowcasePublicProjections(
        boundedVault,
        (firstPaint, owner) => publishProfileShowcasePublicProjection(
          firstPaint,
          owner,
          fetch,
          input.username,
        ),
      ),
    ]);
    return settled;
  }
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const predecessorAdmission = await boundedVault.reopenHead(artifactId);
      if (!predecessorAdmission || !predecessorAdmission.proofHistoryHead) {
        throw new TypeError("PROFILE_SHOWCASE_VISIBILITY_HEAD_REQUIRED");
      }
      await store.ensureHead(artifactId, {
        algorithm: "sha-256",
        binds: "verified-proof-history",
        value: predecessorAdmission.proofHistoryHead.headDigest,
      });
      const carrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessorAdmission);
      const last = (carrier["profile-showcase"].directDelta as readonly Record<string, unknown>[]).at(-1);
      const lastChild = last?.child as Record<string, unknown> | undefined;
      if (last?.kind === "showcase.visibility.set"
        && lastChild?.childArtifactDigest === child!.childArtifactDigest
        && lastChild.immutableVersion === child!.immutableVersion
        && last.visibility === (input.showOnProfile ? "visible" : "hidden")) {
        await clearAcceptedVisibilityIntent();
        const held = await boundedVault.readFirstPaint(artifactId);
        if (!held) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_PUBLICATION_FAILED");
        void flushPendingProfileShowcasePublicProjections(
          boundedVault,
          (firstPaint, owner) => publishProfileShowcasePublicProjection(firstPaint, owner, fetch, input.username),
        ).catch(() => undefined);
        return held;
      }
      await quarantineUnacceptedChoice();
      const authority = await createProfileShowcaseVisibilityAuthority({
        actorAdmission,
        predecessorAdmission,
        child: child!,
        visibility: input.showOnProfile ? "visible" : "hidden",
        keyFile: authorityContext.keyFile,
        passphrase: authorityContext.unlock(),
        commitDomain,
        sealer: dependencies.sealer ?? createProfileShowcaseNativeTransitionSealer(ownerReceizId, boundedVault),
        store,
        resolveRetainedSegment: segmentId => boundedVault.resolveRetainedSegment(segmentId),
        persistentStateIO: await boundedVault.createTransitionPersistentStateIO(artifactId, predecessorAdmission.artifactSha256),
        resolveVerifiedHistoricalArtifactDigest: (operationCount) =>
          boundedVault.resolveVerifiedHistoricalArtifactDigest(
            artifactId,
            predecessorAdmission.artifactSha256,
            operationCount,
          ),
      });
      const settled = await commitAndPublishBoundedProfileShowcaseTransition({
        plan: authority.plan,
        capability: authority.capability,
        sealer: authority.sealer,
        store: authority.store,
        children: authority.children,
        segments: authority.segments,
        boundedVault,
        afterEdgeAdmission: clearAcceptedVisibilityIntent,
      });
      void Promise.allSettled([
        enqueueProfileShowcaseIntoBrowserEconomy({
          artifactId,
          vault: boundedVault,
        }),
        flushPendingProfileShowcaseEconomyAppends(boundedVault),
        flushPendingProfileShowcasePublicProjections(
          boundedVault,
          (firstPaint, owner) => publishProfileShowcasePublicProjection(
            firstPaint,
            owner,
            fetch,
            input.username,
          ),
        ),
      ]);
      return settled;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new TypeError("PROFILE_SHOWCASE_VISIBILITY_SETTLEMENT_REQUIRED");
  });
}
