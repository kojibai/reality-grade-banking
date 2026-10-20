import { buildSeedProfile, buildProfileRouteDeterministicSnapshot, profileRouteSnapshotFromWholeMarketPublicProof } from "./publicInventoryRouteProjection";
import type { ProfileRouteHydrationSeedInput, ProfileRouteDeterministicSnapshotInput, ProfileRouteSnapshot, ProfileCurrentPublicMembership } from "./publicInventoryRouteProjection";
export { profileRouteSnapshotFromWholeMarketPublicProof } from "./publicInventoryRouteProjection";
export type { ProfileRouteHydrationSeedInput, ProfileRouteDeterministicSnapshotInput, ProfileRouteSnapshot, ProfileCurrentPublicMembership } from "./publicInventoryRouteProjection";
import { compactHeldProfileSnapshotStorage, decodeProfileSnapshotStorage, encodeProfileSnapshotStorage, encodedProfileSnapshotStorageKey } from "./profileSnapshotStorageCodec";
import type { ProfileOriginal, ProfileViewData } from "@/app/lib/profile/types";
import {
  loadWholeMarketPublicOwnerProof,
  peekWholeMarketPublicOwnerProof,
  type WholeMarketPublicOwnerProof,
} from "@/app/lib/market/wholeMarketPublicProofRegister";
import {
  mergeDeterministicProfileFeed,
  profileKaiHead,
  resolveProfileDeterministicManifest,
  visibleShowcaseOriginalsFromOriginals,
} from "@/app/lib/profile/deterministicFeed";
import { mergeProfilePreservingStrongerIdentity } from "@/app/lib/profile/profileIdentityAuthority";
import {
  mergePbiSignedStateAcrossOriginals,
  originalHasSignedArtifactState,
  profileOriginalProofIdentityKey,
} from "@/app/lib/profile/pbiSignatureHistory";
import { mergeProfilePreservingPbiReceiptHistory } from "@/app/lib/profile/pbiSignatureProjection";
import {
  profileWithStableCreationSeed,
  rememberProfileCreationSeed,
} from "@/app/lib/profile/profileCreationSeed";
import { coerceProfileOriginalLongForm } from "@/app/lib/profile/longForm";
import { parseProfileUsername } from "@/app/lib/profile/username";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthEntriesByPrefix,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { runtimeProjectionScopedStorageKey, runtimeProjectionStorageKey } from "@/app/lib/runtime/runtimeCoherence";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import {
  createProfileShowcaseEdgeVault,
  type ProfileShowcaseEdgeVault,
} from "@/app/lib/profile/showcase/edgeVault";
import {
  createProfileShowcaseBoundedEdgeVault,
  peekProfileShowcaseVisibilityTransitionQuarantine,
  peekHeldProfileShowcasePublicSource,
  subscribeHeldProfileShowcasePublicSource,
  type ProfileShowcaseBoundedEdgeAdmission,
  type ProfileShowcaseBoundedFirstPaint,
  type ProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseCompleteSource,
} from "@/app/lib/profile/showcase/boundedEdgeVault";
import { settleOwnerShowcaseRestore } from "@/app/lib/profile/showcase/ownerSourceProjection";
import type { VerifiedProfileShowcase } from "@/app/lib/profile/showcase/artifact";
import type { ProfileShowcaseHandoffV1 } from "@/app/lib/profile/showcase/handoff";
import type { ProfileShowcaseArtifactId } from "@/app/lib/profile/showcase/types";
import { economyProjectionLineageCanReplace } from "@/app/lib/market/economyProjectionLineage";
import {
  flushPendingProfileShowcaseEconomyAppends,
} from "@/app/lib/profile/showcase/economyRetry";
import {
  COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
  decodeCompleteLegacyShowcaseMigrationPayload,
} from "@/app/lib/profile/showcase/legacyMigrationPayload";
import { appendMissingVerifiedShowcaseOriginals } from "@/app/lib/profile/showcase/verifiedWindowState";
import { canonicalReceizOwnerId } from "@/app/lib/sdk/artifactContinuity";
import { projectDeterministicProfileRouteFirstPaint } from "@/app/lib/firstPaint/profileRouteProjection";
import { compareCanonicalProfileOriginalOrder } from "@/app/lib/profile/publishedOriginalProjectionOrder";
import { refreshAcceptedPublicProfileDocument } from "@/app/lib/profile/showcase/publicProfileDocumentRefresh.client";
import { peekRecoveredAccountShowcaseScope } from "@/app/lib/profile/showcase/recoveredAccountScope.client";
import { projectSourceBoundPublicInventory } from "./showcase/managedProfileSealedBoundary";

const PROFILE_ROUTE_HYDRATION_KEY_BASE = "receiz.profile.route.seed.v1";
const PROFILE_ROUTE_HYDRATION_KEY = runtimeProjectionStorageKey(PROFILE_ROUTE_HYDRATION_KEY_BASE);
const PROFILE_ROUTE_HYDRATION_KEY_PREFIX_BASE = "receiz.profile.route.seed.v2";
const PROFILE_ROUTE_DURABLE_HYDRATION_KEY_PREFIX_BASE = "receiz.profile.route.seed.durable.v1";
const PROFILE_ROUTE_HYDRATION_SEED_MAX_AGE_MS = 5 * 60_000;
const PROFILE_ROUTE_SNAPSHOT_CACHE_MAX_ITEMS = 12;
const PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_BASE = "receiz.profile.route.snapshot.v1";
const PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY = runtimeProjectionStorageKey(PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_BASE);
const PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE = "receiz.profile.route.snapshot.v2";
const PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE = "receiz.profile.route.snapshot.durable.v1";
const PROFILE_ROUTE_NAV_INTENT_KEY = "receiz.profile.route.intent.v1";
const PROFILE_ROUTE_NAV_INTENT_MAX_AGE_MS = 15_000;
const PROFILE_ROUTE_KAI_TRUTH_RANK_EPOCH = 2_000_000_000;
const PROFILE_ROUTE_KAI_TRUTH_RANK_MULTIPLIER = 1_000_000;
const PROFILE_ROUTE_KAI_TRUTH_RANK_MAX_HEAD = BigInt(Math.floor(
  (Number.MAX_SAFE_INTEGER - PROFILE_ROUTE_KAI_TRUTH_RANK_EPOCH -
    (PROFILE_ROUTE_KAI_TRUTH_RANK_MULTIPLIER - 1)) /
    PROFILE_ROUTE_KAI_TRUTH_RANK_MULTIPLIER,
));

const profileRouteSnapshotCache = new Map<string, { snapshot: ProfileRouteSnapshot; createdAtMs: number }>();
const profileShowcaseRouteTruth = new Map<ProfileShowcaseArtifactId, ProfileShowcaseHandoffV1>();
const boundedProfileShowcaseRouteTruth =
  new WeakMap<ProfileShowcaseBoundedEdgeVault, Map<ProfileShowcaseArtifactId, ProfileShowcaseBoundedFirstPaint>>();
const boundedProfileShowcaseVerifiedAncestors =
  new WeakMap<ProfileShowcaseBoundedEdgeVault, Map<ProfileShowcaseArtifactId, Readonly<{ artifactDigest: string; digests: ReadonlySet<string> }>>>();
function boundedRouteTruthForVault(vault: ProfileShowcaseBoundedEdgeVault) {
  let held = boundedProfileShowcaseRouteTruth.get(vault);
  if (!held) {
    held = new Map();
    boundedProfileShowcaseRouteTruth.set(vault, held);
  }
  return held;
}
function boundedVerifiedAncestorsForVault(vault: ProfileShowcaseBoundedEdgeVault) {
  let held = boundedProfileShowcaseVerifiedAncestors.get(vault);
  if (!held) {
    held = new Map();
    boundedProfileShowcaseVerifiedAncestors.set(vault, held);
  }
  return held;
}
const boundedProfileShowcaseProjectionCache =
  new WeakMap<ProfileShowcaseBoundedFirstPaint, readonly ProfileOriginal[]>();
const profileShowcaseRouteTruthListeners = new Set<() => void>();
let profileShowcaseEdgeVault: ProfileShowcaseEdgeVault | null = null;
let boundedProfileShowcaseEdgeVault: ProfileShowcaseBoundedEdgeVault | null = null;
let economyRetryOnlineListenerInstalled = false;
const pendingVisibilityReplayVaults = new WeakSet<ProfileShowcaseBoundedEdgeVault>();

export type ProfileShowcaseRouteTruth =
  | ProfileShowcaseHandoffV1
  | ProfileShowcaseBoundedFirstPaint;

export function projectBoundedProfileShowcaseWindow(
  truth: ProfileShowcaseBoundedFirstPaint,
): readonly ProfileOriginal[] {
  const cached = boundedProfileShowcaseProjectionCache.get(truth);
  if (cached) return cached;

  const projected = truth.visibleChildren.flatMap((child) => {
    try {
      if (
        child.verifiedPayloadMimeType
          === COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME
      ) {
        return decodeCompleteLegacyShowcaseMigrationPayload(
          child.verifiedPayloadBytes,
        ).flatMap((candidate) => {
          if (!candidate.showOnProfile) return [];
          const original = sanitizeProfileRouteOriginal(candidate);
          return original ? [{ ...original, showOnProfile: true }] : [];
        });
      }
      const carriedProjection = "verifiedRouteProjectionBytes" in child
        && child.verifiedRouteProjectionBytes instanceof Uint8Array
        ? JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
          child.verifiedRouteProjectionBytes,
        )) as unknown
        : null;
      let projectedOriginal = carriedProjection;
      if (
        projectedOriginal === null
        && (
          child.verifiedPayloadMimeType
            === "application/vnd.receiz.profile-original+json"
          || child.verifiedPayloadMimeType === "application/json"
        )
      ) {
        const decoded = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            child.verifiedPayloadBytes,
          ),
        ) as unknown;
        projectedOriginal = isRecord(decoded)
          && decoded.schema === "receiz.profile-original-render.v1"
          && "original" in decoded
            ? decoded.original
            : null;
      }
      const original = sanitizeProfileRouteOriginal(projectedOriginal);
      if (!original) return [];
      const stableChildArtifactId = child.reference?.stableChildArtifactId ?? "";
      const stableRecordMediaSha256Hex = (
        original.media === null
        && !original.recordMediaSha256Hex
        && /^[0-9a-f]{64}$/i.test(stableChildArtifactId)
      )
        ? stableChildArtifactId
        : original.recordMediaSha256Hex ?? null;
      return [{
        ...original,
        showOnProfile: true,
        recordMediaSha256Hex: stableRecordMediaSha256Hex,
      }];
    } catch {
      return [];
    }
  });
  const presented = visibleShowcaseOriginalsFromOriginals(projected);
  boundedProfileShowcaseProjectionCache.set(truth, presented);
  return presented;
}

export function projectProfileFromBoundedShowcaseWindow(
  profile: ProfileViewData,
  truth: ProfileShowcaseRouteTruth | null,
): readonly ProfileOriginal[] {
  if (!truth || !("visibleChildren" in truth)) return profile.originals;
  return projectBoundedProfileShowcaseWindow(truth);
}

export function settleProfileRouteFirstPaint(
  profile: ProfileViewData,
  truth: ProfileShowcaseRouteTruth | null,
  projectedWindow?: readonly ProfileOriginal[],
  completeSource?: ProfileShowcaseCompleteSource | null,
): ProfileViewData {
  // A verified complete source carries exact visibility membership, including
  // hidden children outside the bounded presentation window. It can lawfully
  // lower the visible count after hide and raise it after unhide.
  if (truth && completeSource && completeSource.artifactDigest === truth.artifactDigest) {
    return settleOwnerShowcaseRestore(profile, completeSource, { retainedHiddenOnly: true });
  }
  if (!truth || !("visibleChildren" in truth)) return profile;
  const projected =
    projectedWindow ?? projectProfileFromBoundedShowcaseWindow(profile, truth);
  if (projected.length === 0) return profile;
  const appendedOriginals = appendMissingVerifiedShowcaseOriginals(
    projected,
    profile.originals,
  );
  const originals = [
    ...visibleShowcaseOriginalsFromOriginals(appendedOriginals),
    ...appendedOriginals.filter((original) => !original.showOnProfile),
  ];
  if (!profile.stats || !profile.originalsPage) {
    return { ...profile, originals };
  }
  const carriedCounts = truth.carrier["profile-showcase"]["counts"];
  const carriedVisibleCountValue = isRecord(carriedCounts)
    ? carriedCounts.visibleCount
    : null;
  const settledVisibleCount = typeof carriedVisibleCountValue === "number"
    && Number.isFinite(carriedVisibleCountValue)
    ? Math.max(0, Math.trunc(carriedVisibleCountValue))
    : profile.stats?.originals ?? 0;
  const admittedVisibleCount = Math.max(
    settledVisibleCount,
    profile.stats.originals,
    profile.showcaseCounts?.all ?? 0,
  );
  const carriedVisibleCount = originals.reduce(
    (count, original) => count + (original.showOnProfile ? 1 : 0),
    0,
  );
  const originalsPage = carriedVisibleCount >= admittedVisibleCount
    ? {
        pageSize: Math.max(profile.originalsPage.pageSize, originals.length, 1),
        hasMore: false,
        nextCursor: null,
      }
    : profile.originalsPage;
  return {
    ...profile,
    originals,
    stats: {
      ...profile.stats,
      originals: admittedVisibleCount,
    },
    showcaseCounts: profile.showcaseCounts
      ? {
          ...profile.showcaseCounts,
          all: admittedVisibleCount,
        }
      : profile.showcaseCounts,
    originalsPage,
  };
}

function routeShowcaseVault(): ProfileShowcaseEdgeVault {
  profileShowcaseEdgeVault ??= createProfileShowcaseEdgeVault();
  return profileShowcaseEdgeVault;
}

function routeBoundedShowcaseVault(): ProfileShowcaseBoundedEdgeVault | null {
  if (!globalThis.indexedDB) return null;
  if (!boundedProfileShowcaseEdgeVault) {
    const vault = createProfileShowcaseBoundedEdgeVault();
    boundedProfileShowcaseEdgeVault = vault;
    subscribeHeldProfileShowcasePublicSource((artifactId) => {
      const admitted = peekHeldProfileShowcasePublicSource(artifactId);
      if (!admitted || peekProfileShowcaseRouteTruth(artifactId, vault)?.artifactDigest === admitted.source.artifactDigest) return;
      // An exact local source advanced. Carry its verified successor into the
      // existing route register; network discovery is not the wake-up signal.
      void vault.readFirstPaint(artifactId)
        .then(source => retainCausalBoundedProfileRouteTruth(artifactId, source, vault))
        .catch(() => { /* Keep the held prefix when successor custody cannot be reopened. */ });
    });
  }
  return boundedProfileShowcaseEdgeVault;
}

function scheduleProfileShowcaseEconomyRetry(
  vault: ProfileShowcaseBoundedEdgeVault,
): void {
  void flushPendingProfileShowcaseEconomyAppends(vault).catch(() => {
    // The durable vault intent remains pending for the next startup/reconnect.
  });
  if (
    typeof window === "undefined"
    || economyRetryOnlineListenerInstalled
  ) return;
  economyRetryOnlineListenerInstalled = true;
  window.addEventListener("online", () => {
    const activeVault = routeBoundedShowcaseVault();
    if (!activeVault) return;
    void flushPendingProfileShowcaseEconomyAppends(activeVault).catch(() => {
      // Reconnect is a delivery opportunity, never authority over local truth.
    });
  });
}

export function peekProfileShowcaseRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
  vault: ProfileShowcaseBoundedEdgeVault | null = routeBoundedShowcaseVault(),
): ProfileShowcaseRouteTruth | null {
  return vault ? boundedProfileShowcaseRouteTruth.get(vault)?.get(artifactId) ?? null : null;
}

export function peekLegacyV114ProfileShowcaseRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
): ProfileShowcaseHandoffV1 | null {
  return profileShowcaseRouteTruth.get(artifactId) ?? null;
}

export function subscribeProfileShowcaseRouteTruth(listener: () => void): () => void {
  profileShowcaseRouteTruthListeners.add(listener);
  return () => profileShowcaseRouteTruthListeners.delete(listener);
}

function emitProfileShowcaseRouteTruth(): void {
  for (const listener of profileShowcaseRouteTruthListeners) listener();
}

export function peekBoundedProfileShowcaseVerifiedAncestor(
  artifactId: ProfileShowcaseArtifactId,
  descendantDigest: string,
  ancestorDigest: string,
  vault: ProfileShowcaseBoundedEdgeVault | null = routeBoundedShowcaseVault(),
): boolean {
  const held = vault ? boundedProfileShowcaseVerifiedAncestors.get(vault)?.get(artifactId) : null;
  return held?.artifactDigest === descendantDigest && held.digests.has(ancestorDigest);
}

export async function verifyBoundedProfileShowcaseRouteAncestor(
  artifactId: ProfileShowcaseArtifactId,
  descendantDigest: string,
  ancestorDigest: string,
  vault: ProfileShowcaseBoundedEdgeVault | null = routeBoundedShowcaseVault(),
): Promise<boolean> {
  if (!vault) return false;
  if (peekBoundedProfileShowcaseVerifiedAncestor(artifactId, descendantDigest, ancestorDigest, vault)) return true;
  const verified = await vault.isVerifiedPublicationAncestor(
    artifactId, ancestorDigest, descendantDigest,
  ).catch(() => false);
  if (!verified || boundedProfileShowcaseRouteTruth.get(vault)?.get(artifactId)?.artifactDigest !== descendantDigest) return false;
  const ancestors = boundedVerifiedAncestorsForVault(vault);
  const current = ancestors.get(artifactId);
  const digests = new Set(current?.artifactDigest === descendantDigest ? current.digests : []);
  digests.add(ancestorDigest);
  ancestors.set(artifactId, { artifactDigest: descendantDigest, digests });
  emitProfileShowcaseRouteTruth();
  return true;
}

function directBoundedProfileShowcaseParentDigests(source: ProfileShowcaseBoundedFirstPaint): string[] {
  const parents = source.carrier["profile-showcase"].parentHeads;
  if (!Array.isArray(parents)) return [];
  return parents.flatMap((parent: unknown) =>
    parent && typeof parent === "object" && "artifactDigest" in parent
      && typeof parent.artifactDigest === "string" ? [parent.artifactDigest] : []);
}

export async function selectCausalBoundedProfileRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
  held: ProfileShowcaseBoundedFirstPaint | null,
  incoming: ProfileShowcaseBoundedFirstPaint | null,
  isVerifiedAncestor: ProfileShowcaseBoundedEdgeVault["isVerifiedPublicationAncestor"],
): Promise<ProfileShowcaseBoundedFirstPaint | null> {
  if (!incoming) return held;
  if (incoming.artifactDigest === held?.artifactDigest) return incoming;
  if (!held) return incoming;
  const advances = await isVerifiedAncestor(
    artifactId, held.artifactDigest, incoming.artifactDigest,
  ).catch(() => false);
  return advances ? incoming : held;
}

async function retainCausalBoundedProfileRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
  incoming: ProfileShowcaseBoundedFirstPaint | null,
  vault: ProfileShowcaseBoundedEdgeVault,
): Promise<ProfileShowcaseBoundedFirstPaint | null> {
  const routeTruth = boundedRouteTruthForVault(vault);
  const verifiedAncestors = boundedVerifiedAncestorsForVault(vault);
  for (;;) {
    const held = routeTruth.get(artifactId) ?? null;
    const selected = await selectCausalBoundedProfileRouteTruth(
      artifactId, held, incoming, vault.isVerifiedPublicationAncestor.bind(vault),
    );
    if (routeTruth.get(artifactId) !== (held ?? undefined)) continue;
    if (selected && selected !== held) {
      projectBoundedProfileShowcaseWindow(selected);
      routeTruth.set(artifactId, selected);
      const ancestors = new Set(directBoundedProfileShowcaseParentDigests(selected));
      if (held) {
        ancestors.add(held.artifactDigest);
        const prior = verifiedAncestors.get(artifactId);
        if (prior?.artifactDigest === held.artifactDigest) {
          for (const ancestor of prior.digests) ancestors.add(ancestor);
        }
      }
      verifiedAncestors.set(artifactId, {
        artifactDigest: selected.artifactDigest, digests: ancestors,
      });
      emitProfileShowcaseRouteTruth();
    }
    return selected;
  }
}

export async function readBoundedProfileShowcaseRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
  vault: ProfileShowcaseBoundedEdgeVault | null = routeBoundedShowcaseVault(),
): Promise<ProfileShowcaseBoundedFirstPaint | null> {
  if (!vault) return null;
  const routeTruth = boundedRouteTruthForVault(vault);
  const held = peekProfileShowcaseVisibilityTransitionQuarantine(artifactId)
    ? await vault.readFirstPaint(artifactId)
    : routeTruth.get(artifactId)
      ?? await vault.readFirstPaint(artifactId);
  const retained = await retainCausalBoundedProfileRouteTruth(artifactId, held, vault);
  if (!retained && !pendingVisibilityReplayVaults.has(vault)) {
    pendingVisibilityReplayVaults.add(vault);
    void import("@/app/lib/profile/showcase/visibilitySettlement")
      .then(({ flushPendingBoundedProfileVisibilityTransitions }) =>
        flushPendingBoundedProfileVisibilityTransitions({ vault }),
      )
      .catch(() => {
        // Durable transition custody remains quarantined for online replay.
      })
      .finally(() => {
        pendingVisibilityReplayVaults.delete(vault);
      });
  }
  return retained;
}

export async function admitBoundedProfileShowcaseRouteTruth(
  input: ProfileShowcaseBoundedEdgeAdmission,
  vault: ProfileShowcaseBoundedEdgeVault | null = routeBoundedShowcaseVault(),
  afterAdmission?: () => Promise<void>,
): Promise<ProfileShowcaseBoundedFirstPaint> {
  if (!vault) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_INDEXEDDB_UNAVAILABLE");
  await vault.admit(input);
  await afterAdmission?.();
  const held = await vault.readFirstPaint(
    input.showcaseAdmission.artifactId as ProfileShowcaseArtifactId,
  );
  if (!held) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_EDGE_PUBLICATION_FAILED");
  return await retainCausalBoundedProfileRouteTruth(
    input.showcaseAdmission.artifactId as ProfileShowcaseArtifactId,
    held,
    vault,
  ) ?? held;
}

export async function readProfileShowcaseRouteTruth(
  artifactId: ProfileShowcaseArtifactId,
  vault: ProfileShowcaseEdgeVault = routeShowcaseVault(),
): Promise<ProfileShowcaseHandoffV1 | null> {
  const held = profileShowcaseRouteTruth.get(artifactId) ?? await vault.readFirstPaint(artifactId);
  if (held && profileShowcaseRouteTruth.get(artifactId) !== held) {
    profileShowcaseRouteTruth.set(artifactId, held);
    emitProfileShowcaseRouteTruth();
  }
  return held;
}

export const readLegacyV114ProfileShowcaseRouteTruth = readProfileShowcaseRouteTruth;

export async function admitProfileShowcaseRouteTruth(
  showcase: VerifiedProfileShowcase,
  vault: ProfileShowcaseEdgeVault = routeShowcaseVault(),
): Promise<ProfileShowcaseHandoffV1> {
  const handoff = await vault.admit(showcase);
  profileShowcaseRouteTruth.set(handoff.artifactId, handoff);
  emitProfileShowcaseRouteTruth();
  return handoff;
}

export async function resolveProfileShowcaseRouteTruthFirst(input: Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  vault?: ProfileShowcaseEdgeVault;
  discoverVerifiedAdditions: (
    held: ProfileShowcaseHandoffV1 | null,
  ) => Promise<VerifiedProfileShowcase | null>;
  boundedVault?: ProfileShowcaseBoundedEdgeVault | null;
}>): Promise<ProfileShowcaseRouteTruth | null> {
  const vault = input.vault ?? routeShowcaseVault();
  const bounded = await readBoundedProfileShowcaseRouteTruth(
    input.artifactId,
    input.boundedVault === undefined ? routeBoundedShowcaseVault() : input.boundedVault,
  );
  if (bounded) return bounded;
  const held = await readProfileShowcaseRouteTruth(input.artifactId, vault);
  if (held) {
    void input.discoverVerifiedAdditions(held)
      .then(async (addition) => {
        if (!addition) return;
        const appended = await vault.appendVerifiedAdditions(addition);
        profileShowcaseRouteTruth.set(input.artifactId, appended);
        emitProfileShowcaseRouteTruth();
      })
      .catch(() => {
        // Network/projection failure cannot invalidate settled local proof truth.
      });
    return held;
  }
  const discovered = await input.discoverVerifiedAdditions(null);
  if (!discovered) return null;
  const admitted = await vault.admit(discovered);
  profileShowcaseRouteTruth.set(input.artifactId, admitted);
  emitProfileShowcaseRouteTruth();
  return admitted;
}

export const resolveLegacyV114ProfileShowcaseRouteTruthFirst =
  resolveProfileShowcaseRouteTruthFirst;

/**
 * Production profile-route entry. The stable owner identity selects the same
 * showcase proof object on every screen; held edge truth resolves before the
 * caller's existing network/profile hydration effects begin.
 */
export async function hydrateProductionProfileShowcaseRoute(input: Readonly<{
  username: string;
  /** Exact subject from the verified route head; username is discovery only. */
  artifactId?: ProfileShowcaseArtifactId;
  vault?: ProfileShowcaseEdgeVault;
  discoverVerifiedAdditions?: (
    held: ProfileShowcaseHandoffV1 | null,
  ) => Promise<VerifiedProfileShowcase | null>;
  boundedVault?: ProfileShowcaseBoundedEdgeVault | null;
}>): Promise<ProfileShowcaseRouteTruth | null> {
  const ownerReceizIdentity = canonicalReceizOwnerId(input.username);
  if (!ownerReceizIdentity) return null;
  const artifactId = input.artifactId ?? `profile-showcase:${ownerReceizIdentity}` as ProfileShowcaseArtifactId;
  const boundedVault = input.boundedVault === undefined
    ? routeBoundedShowcaseVault()
    : input.boundedVault;
  if (boundedVault) scheduleProfileShowcaseEconomyRetry(boundedVault);
  const selected = await readBoundedProfileShowcaseRouteTruth(
    artifactId,
    boundedVault,
  );
  const operationCount = selected?.carrier["profile-showcase"].resultingOperationCount;
  if (selected && typeof operationCount === "number" && Number.isSafeInteger(operationCount))
    void refreshAcceptedPublicProfileDocument({ username: input.username,
      artifactDigest: selected.artifactDigest, operationCount });
  return selected;
}

export async function readCompleteProductionProfileShowcaseRoute(
  username: string,
): Promise<ProfileShowcaseCompleteSource | null> {
  const ownerReceizIdentity = canonicalReceizOwnerId(username);
  const vault = routeBoundedShowcaseVault();
  if (!ownerReceizIdentity || !vault) return null;
  return vault.readCompleteSource(`profile-showcase:${ownerReceizIdentity}` as ProfileShowcaseArtifactId);
}

type ProfileRouteHydrationSeedStored = {
  version: 1;
  createdAtMs: number;
  username: string;
  profile: ProfileViewData;
};

type ProfileRouteNavigationIntentStored = {
  version: 1;
  createdAtMs: number;
  username: string;
};

type ProfileRouteSnapshotStored = {
  version: 1;
  createdAtMs: number;
  username: string;
  profile: ProfileViewData;
  viewerEmail: string | null;
  currentPublicMembership?: ProfileCurrentPublicMembership | null;
  publicInventorySourceDigest?: string | null;
  publicInventoryRevision?: string | null;
};

type ProfileRouteSnapshotSessionStatus = "public" | "confirmed" | "pending" | "mismatch";

function coerceProfileCurrentPublicMembership(value: unknown): ProfileCurrentPublicMembership | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const membership = value as Partial<ProfileCurrentPublicMembership>;
  const generatedAtMs = Date.parse(membership.generatedAt ?? "");
  if (
    membership.scope !== "whole-market-visible-showcase" ||
    membership.source !== "canonical-complete" ||
    membership.isComplete !== true ||
    typeof membership.revision !== "string" ||
    !membership.revision.trim() ||
    !Number.isFinite(generatedAtMs)
  ) {
    return null;
  }
  return {
    scope: "whole-market-visible-showcase",
    source: "canonical-complete",
    isComplete: true,
    revision: membership.revision,
    generatedAt: membership.generatedAt as string,
    economyShowcaseArtifactDigest:
      typeof membership.economyShowcaseArtifactDigest === "string"
        ? membership.economyShowcaseArtifactDigest
        : null,
    economyShowcaseParentArtifactDigests:
      Array.isArray(membership.economyShowcaseParentArtifactDigests)
        ? membership.economyShowcaseParentArtifactDigests
        : [],
  };
}

export function canonicalCompleteProfileMembershipCanReplaceByRecency(
  held: Pick<ProfileRouteSnapshot, "currentPublicMembership"> | null | undefined,
  incoming: Pick<ProfileRouteSnapshot, "currentPublicMembership"> | null | undefined,
): boolean {
  const incomingMembership = coerceProfileCurrentPublicMembership(incoming?.currentPublicMembership);
  if (!incomingMembership) return false;
  const heldMembership = coerceProfileCurrentPublicMembership(held?.currentPublicMembership);
  if (!heldMembership) return true;
  if (incomingMembership.revision === heldMembership.revision) return false;
  return economyProjectionLineageCanReplace(heldMembership, incomingMembership);
}

function originalsContainDeterministicMarketPreview(originals: readonly ProfileOriginal[]): boolean {
  const previewableOriginals = visibleShowcaseOriginalsFromOriginals(originals);
  if (previewableOriginals.length === 0) return true;
  return previewableOriginals.some((original) => original.marketPreview != null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function stripNonDurableUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("blob:")) return null;
  return trimmed;
}

function sanitizeProfileRouteOriginal(original: unknown): ProfileOriginal | null {
  if (!isRecord(original)) return null;

  if (
    typeof original.id !== "string" ||
    typeof original.slug !== "string" ||
    typeof original.code !== "string" ||
    typeof original.verifyPath !== "string" ||
    typeof original.verifyUrl !== "string"
  ) {
    return null;
  }

  const next = { ...(original as unknown as ProfileOriginal) };
  next.longForm = coerceProfileOriginalLongForm((original as Record<string, unknown>).longForm);
  next.ownershipRole =
    next.ownershipKind === "creator"
      ? "creator"
      : next.ownershipRole === "verified-possession"
        ? "verified-possession"
        : "current-owner";

  if (isRecord(next.media)) {
    const media = { ...next.media };
    media.src = stripNonDurableUrl(media.src) ?? "";
    media.originalDownloadSrc = stripNonDurableUrl(media.originalDownloadSrc);
    media.derivativeDownloadSrc = stripNonDurableUrl(media.derivativeDownloadSrc);
    media.receiptDownloadSrc = stripNonDurableUrl(media.receiptDownloadSrc);
    media.videoPosterSrc = stripNonDurableUrl(media.videoPosterSrc);
    media.audioCoverSrc = stripNonDurableUrl(media.audioCoverSrc);
    media.epubCoverSrc = stripNonDurableUrl(media.epubCoverSrc);
    next.media = media;
  } else {
    next.media = null;
  }

  return next;
}

function sanitizeProfileRouteProfile(profile: unknown): ProfileViewData | null {
  if (!isRecord(profile)) return null;
  if (!isRecord(profile.profile) || !isRecord(profile.viewer) || !isRecord(profile.stats)) return null;
  if (!Array.isArray(profile.originals) || !Array.isArray(profile.followers) || !Array.isArray(profile.following)) {
    return null;
  }
  if (!isRecord(profile.originalsPage)) return null;

  const profileBlock = profile.profile;

  if (
    typeof profileBlock.userId !== "string" ||
    typeof profileBlock.username !== "string" ||
    typeof profileBlock.displayName !== "string" ||
    typeof profileBlock.showSchedulerButton !== "boolean"
  ) {
    return null;
  }

  const viewer = profile.viewer;

  if (
    typeof viewer.isSignedIn !== "boolean" ||
    typeof viewer.isOwner !== "boolean" ||
    typeof viewer.canEdit !== "boolean" ||
    typeof viewer.canView !== "boolean" ||
    typeof viewer.isFollowing !== "boolean" ||
    typeof viewer.followsYou !== "boolean"
  ) {
    return null;
  }

  const stats = profile.stats;

  if (
    !isFiniteNumber(stats.followers) ||
    !isFiniteNumber(stats.following) ||
    !isFiniteNumber(stats.originals) ||
    !isFiniteNumber(stats.signedOriginals) ||
    !isFiniteNumber(stats.hiddenOriginals) ||
    !isFiniteNumber(stats.originalViews) ||
    !isFiniteNumber(stats.streams) ||
    !isFiniteNumber(stats.streamCompletionRatePct) ||
    !isFiniteNumber(stats.witnessedSeconds)
  ) {
    return null;
  }

  const originalsPage = profile.originalsPage;

  if (
    !isFiniteNumber(originalsPage.pageSize) ||
    typeof originalsPage.hasMore !== "boolean" ||
    !isNullableString(originalsPage.nextCursor)
  ) {
    return null;
  }

  const originals = profile.originals
    .map((original) => sanitizeProfileRouteOriginal(original))
    .filter((original): original is ProfileOriginal => Boolean(original));

  return profileWithStableCreationSeed({
    ...(profile as unknown as ProfileViewData),
    profile: {
      ...(profileBlock as ProfileViewData["profile"]),
      avatarUrl: stripNonDurableUrl(typeof profileBlock.avatarUrl === "string" ? profileBlock.avatarUrl : null),
      bannerUrl: stripNonDurableUrl(typeof profileBlock.bannerUrl === "string" ? profileBlock.bannerUrl : null),
    },
    originals,
  });
}

function profileSnapshotManifestStamp(snapshot: ProfileRouteSnapshot | null | undefined): string {
  if (!snapshot) return "";
  return resolveProfileDeterministicManifest(snapshot.profile).stamp;
}

function profileSnapshotTruthRank(snapshot: ProfileRouteSnapshot): number {
  const manifest = resolveProfileDeterministicManifest(snapshot.profile);
  const head = profileKaiHead(snapshot.profile);
  const boundedHead = head === null
    ? 0n
    : head > PROFILE_ROUTE_KAI_TRUTH_RANK_MAX_HEAD
      ? PROFILE_ROUTE_KAI_TRUTH_RANK_MAX_HEAD
      : head;
  const ownerBoost = snapshot.profile.viewer.isOwner || snapshot.profile.viewer.canEdit ? 500_000 : 0;
  const completenessBoost = manifest.isComplete ? 250_000 : 0;
  const itemRank = Math.min(200_000, Math.max(0, Math.trunc(manifest.itemCount)));
  const pageRank = Math.min(49_999, Math.max(0, Math.trunc(manifest.pageSize)));

  /*
   * Kai is the append authority. Projection completeness and owner context
   * may distinguish two views of the same head, but can never make an older
   * head outrank a newer locally verified proof append. The epoch migrates
   * legacy manifest-only ranks without weakening an already admitted head.
   */
  return (
    PROFILE_ROUTE_KAI_TRUTH_RANK_EPOCH +
    Number(boundedHead) * PROFILE_ROUTE_KAI_TRUTH_RANK_MULTIPLIER +
    ownerBoost +
    completenessBoost +
    itemRank +
    pageRank
  );
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function wholeMarketTombstoneSupersedesPublicProfileSnapshot(
  snapshot: ProfileRouteSnapshot | null | undefined,
  owner: WholeMarketPublicOwnerProof | null | undefined,
): boolean {
  if (!snapshot || !owner || owner.isCurrentMember) return false;
  if (snapshot.profile.viewer.isOwner || snapshot.profile.viewer.canEdit) return false;
  if (snapshot.profile.profile.username.trim().toLowerCase() !== owner.username.trim().toLowerCase()) {
    return false;
  }

  const heldMembership = coerceProfileCurrentPublicMembership(snapshot.currentPublicMembership);
  if (!heldMembership) return false;
  if (heldMembership.revision === owner.membershipRevision) return true;
  return economyProjectionLineageCanReplace(heldMembership, {
    economyShowcaseArtifactDigest: owner.economyShowcaseArtifactDigest,
    economyShowcaseParentArtifactDigests:
      owner.economyShowcaseParentArtifactDigests,
  });
}

export function wholeMarketTombstoneCanReplacePublicProfileSnapshot(args: {
  incoming: ProfileRouteSnapshot;
  superseded: ProfileRouteSnapshot;
  held: ProfileRouteSnapshot | null | undefined;
  tombstone: WholeMarketPublicOwnerProof;
}): boolean {
  if (!args.held) return false;
  if (args.incoming.profile.viewer.isOwner || args.incoming.profile.viewer.canEdit) return false;

  const incomingUsername = parseProfileUsername(args.incoming.profile.profile.username);
  const supersededUsername = parseProfileUsername(args.superseded.profile.profile.username);
  const heldUsername = parseProfileUsername(args.held.profile.profile.username);
  const tombstoneUsername = parseProfileUsername(args.tombstone.username);
  if (
    !incomingUsername ||
    incomingUsername !== supersededUsername ||
    incomingUsername !== heldUsername ||
    incomingUsername !== tombstoneUsername
  ) {
    return false;
  }

  return (
    wholeMarketTombstoneSupersedesPublicProfileSnapshot(args.superseded, args.tombstone) &&
    wholeMarketTombstoneSupersedesPublicProfileSnapshot(args.held, args.tombstone)
  );
}

export function peekProfileRouteSnapshotFromWholeMarketPublicProof(
  usernameRaw: string,
): ProfileRouteSnapshot | null {
  const owner = peekWholeMarketPublicOwnerProof(usernameRaw);
  return owner ? profileRouteSnapshotFromWholeMarketPublicProof(owner) : null;
}

export async function loadProfileRouteSnapshotFromWholeMarketPublicProof(
  usernameRaw: string,
): Promise<ProfileRouteSnapshot | null> {
  const owner = await loadWholeMarketPublicOwnerProof(usernameRaw);
  return owner ? profileRouteSnapshotFromWholeMarketPublicProof(owner) : null;
}

export function mergeProfileWithCompleteWholeMarketPublicProof(
  current: ProfileViewData | null | undefined,
  marketProfile: ProfileViewData,
  context: {
    currentPublicMembership?: ProfileCurrentPublicMembership | null;
    incomingPublicMembership?: ProfileCurrentPublicMembership | null;
  } = {},
): ProfileViewData {
  if (!current || current.profile.username !== marketProfile.profile.username) return marketProfile;

  const currentUserId = current.profile.userId.trim();
  const marketUserId = marketProfile.profile.userId.trim();
  if (currentUserId && marketUserId && currentUserId !== marketUserId) return marketProfile;

  const currentCarriesOwnerOverlay = current.viewer.isOwner || current.viewer.canEdit;
  const preserveOwnerOverlay = Boolean(
    currentCarriesOwnerOverlay && currentUserId && marketUserId && currentUserId === marketUserId,
  );

  const hiddenOwnerIds = new Set(
    preserveOwnerOverlay
      ? current.originals.filter((original) => !original.showOnProfile).map((original) => original.id)
      : [],
  );
  const hiddenOwnerProofIdentities = new Set(
    preserveOwnerOverlay
      ? current.originals
          .filter((original) => !original.showOnProfile)
          .map((original) => profileOriginalProofIdentityKey(original))
          .filter(Boolean)
      : [],
  );
  const incomingPublicOriginals = preserveOwnerOverlay
    ? marketProfile.originals.filter((original) => {
        if (hiddenOwnerIds.has(original.id)) return false;
        const proofIdentity = profileOriginalProofIdentityKey(original);
        return !proofIdentity || !hiddenOwnerProofIdentities.has(proofIdentity);
      })
    : marketProfile.originals;
  const canonicalPublicOriginals = mergePbiSignedStateAcrossOriginals(current.originals, incomingPublicOriginals);
  const currentMembership = coerceProfileCurrentPublicMembership(context.currentPublicMembership);
  const incomingMembership = coerceProfileCurrentPublicMembership(context.incomingPublicMembership);
  const preserveUnversionedLocalAppends = Boolean(!currentMembership && incomingMembership);
  const canonicalIds = new Set(canonicalPublicOriginals.map((original) => original.id));
  const canonicalProofIdentities = new Set(
    canonicalPublicOriginals
      .map((original) => profileOriginalProofIdentityKey(original))
      .filter((identity) => identity.length > 0),
  );
  const unversionedLocalAppends = preserveUnversionedLocalAppends
    ? current.originals.filter((original) => {
        if (!original.showOnProfile || canonicalIds.has(original.id)) return false;
        const proofIdentity = profileOriginalProofIdentityKey(original);
        return !proofIdentity || !canonicalProofIdentities.has(proofIdentity);
      })
    : [];
  const publicOriginals = visibleShowcaseOriginalsFromOriginals(
    [...unversionedLocalAppends, ...canonicalPublicOriginals].sort(compareCanonicalProfileOriginalOrder),
  );
  const privateOwnerOriginals = preserveOwnerOverlay
    ? current.originals.filter((original) => !original.showOnProfile)
    : [];
  const originals = [...publicOriginals, ...privateOwnerOriginals];
  const identitySafeMarketProfile = mergeProfilePreservingStrongerIdentity(current, marketProfile);
  const signedOriginals = publicOriginals.reduce(
    (count, original) => count + (originalHasSignedArtifactState(original) ? 1 : 0),
    0,
  );

  const mergedProfile: ProfileViewData = {
    ...identitySafeMarketProfile,
    viewer: currentCarriesOwnerOverlay && !preserveOwnerOverlay ? marketProfile.viewer : current.viewer,
    stats: {
      ...current.stats,
      originals: publicOriginals.length,
      signedOriginals,
      hiddenOriginals: preserveOwnerOverlay
        ? Math.max(current.stats.hiddenOriginals, privateOwnerOriginals.length)
        : 0,
    },
    followers: current.followers,
    following: current.following,
    originals,
    originalsPage: {
      pageSize: Math.max(current.originalsPage.pageSize, originals.length, 1),
      hasMore: preserveOwnerOverlay || preserveUnversionedLocalAppends ? current.originalsPage.hasMore : false,
      nextCursor:
        (preserveOwnerOverlay || preserveUnversionedLocalAppends) && current.originalsPage.hasMore
          ? current.originalsPage.nextCursor
          : null,
    },
    deterministicManifest: preserveUnversionedLocalAppends
      ? undefined
      : marketProfile.deterministicManifest,
  };

  return preserveUnversionedLocalAppends
    ? {
        ...mergedProfile,
        deterministicManifest: resolveProfileDeterministicManifest(mergedProfile),
      }
    : mergedProfile;
}

function mergeProfileRouteDeterministicSnapshot(
  prev: ProfileViewData,
  next: ProfileViewData,
): ProfileViewData {
  const identitySafeNext = mergeProfilePreservingStrongerIdentity(prev, next);
  const publicPrev: ProfileViewData = {
    ...prev,
    viewer: {
      isSignedIn: false,
      isOwner: false,
      canEdit: false,
      canView: true,
      isFollowing: false,
      followsYou: false,
      connection: "none",
    },
    originals: visibleShowcaseOriginalsFromOriginals(prev.originals),
  };
  const merged = mergeDeterministicProfileFeed({
    prev: publicPrev,
    next: identitySafeNext,
  });
  const visibleOriginals = visibleShowcaseOriginalsFromOriginals(merged.originals);
  const visibleOriginalCount = visibleOriginals.length;
  const signedOriginalCount = visibleOriginals.reduce(
    (count, original) =>
      count + (originalHasSignedArtifactState(original) ? 1 : 0),
    0,
  );

  return {
    ...identitySafeNext,
    originals: visibleOriginals,
    originalsPage: merged.originalsPage,
    stats: {
      ...identitySafeNext.stats,
      originals: visibleOriginalCount,
      signedOriginals: signedOriginalCount,
      hiddenOriginals: 0,
    },
    deterministicManifest: merged.deterministicManifest,
  };
}

function parseStoredSeed(raw: string): ProfileRouteHydrationSeedStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileRouteHydrationSeedStored>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (typeof parsed.username !== "string") return null;
    if (!parsed.profile || typeof parsed.profile !== "object") return null;

    return parsed as ProfileRouteHydrationSeedStored;
  } catch {
    return null;
  }
}

function hydrationSeedStorageKey(username: string): string {
  return runtimeProjectionScopedStorageKey(PROFILE_ROUTE_HYDRATION_KEY_PREFIX_BASE, username);
}

function durableHydrationSeedStorageKey(username: string): string {
  return `${PROFILE_ROUTE_DURABLE_HYDRATION_KEY_PREFIX_BASE}.${username}`;
}

function snapshotStorageKey(username: string): string {
  return encodedProfileSnapshotStorageKey(runtimeProjectionScopedStorageKey(PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE, username));
}

function durableSnapshotStorageKey(username: string): string {
  return encodedProfileSnapshotStorageKey(`${PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE}.${username}`);
}

function releaseScopedDurableProfileEntries(
  base: string,
  username: string,
  source: string,
) {
  const stableKey = `${base}.${username}`;
  return readDurableLocalTruthEntriesByPrefix(`${base}.`, { source })
    .filter(({ storageKey }) =>
      storageKey === stableKey || storageKey.endsWith(`.${username}`) || storageKey.endsWith(`.${username}.encoded.v1`)
    );
}

function clearReleaseScopedDurableProfileEntries(
  base: string,
  username: string,
  source: string,
): void {
  for (const { storageKey } of releaseScopedDurableProfileEntries(base, username, source)) {
    removeDurableLocalTruthItem(storageKey, {
      source,
      allowStrongerRemoval: true,
    });
  }
}

function removeSessionStorageKeys(storageKeys: readonly string[]): void {
  if (!hasSessionStorage()) return;

  for (const storageKey of storageKeys) {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

function clearLegacyProfileRouteProjection(username: string): void {
  removeSessionStorageKeys([
    `${PROFILE_ROUTE_HYDRATION_KEY_PREFIX_BASE}.${username}`,
    `${PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE}.${username}`,
    PROFILE_ROUTE_HYDRATION_KEY_BASE,
    PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_BASE,
  ]);

}

function profileSnapshotSessionStatus(snapshot: ProfileRouteSnapshot): ProfileRouteSnapshotSessionStatus {
  const requiresSession =
    Boolean(snapshot.viewerEmail) ||
    snapshot.profile.viewer.isOwner ||
    snapshot.profile.viewer.canEdit;

  if (!requiresSession) return "public";

  const session = peekSessionBootstrapSnapshot(true);

  if (!session?.uid) return "pending";

  if (
    (snapshot.profile.viewer.isOwner || snapshot.profile.viewer.canEdit) &&
    snapshot.profile.profile.userId !== session.uid
  ) {
    return "mismatch";
  }

  if (snapshot.viewerEmail && session.email && snapshot.viewerEmail !== session.email) {
    return "mismatch";
  }

  return "confirmed";
}

function profileSnapshotCanRenderForCurrentSession(snapshot: ProfileRouteSnapshot): boolean {
  return profileSnapshotSessionStatus(snapshot) !== "mismatch";
}

function profileSnapshotMatchesCurrentSession(snapshot: ProfileRouteSnapshot): boolean {
  const status = profileSnapshotSessionStatus(snapshot);
  return status === "public" || status === "confirmed";
}

function profileSnapshotHasConfirmedCurrentSessionMismatch(snapshot: ProfileRouteSnapshot): boolean {
  return profileSnapshotSessionStatus(snapshot) === "mismatch";
}

function readStoredSeedForUsername(usernameRaw: string): ProfileRouteHydrationSeedStored | null {
  const username = parseProfileUsername(usernameRaw);
  if (!username) return null;

  clearLegacyProfileRouteProjection(username);

  const storageKeys = [hydrationSeedStorageKey(username), PROFILE_ROUTE_HYDRATION_KEY];

  if (hasSessionStorage()) {
    for (const storageKey of storageKeys) {
      let raw = "";

      try {
        raw = window.sessionStorage.getItem(storageKey) ?? "";
      } catch {
        raw = "";
      }

      if (!raw) continue;

      const parsed = parseStoredSeed(raw);

      if (!parsed) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup failures.
        }
        continue;
      }

      const isExpired = Date.now() - parsed.createdAtMs > PROFILE_ROUTE_HYDRATION_SEED_MAX_AGE_MS;

      if (isExpired) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup failures.
        }
        continue;
      }

      if (parsed.username !== username) continue;

      return parsed;
    }
  }

  const durableKey = durableHydrationSeedStorageKey(username);
  let durableRaw = readDurableLocalTruthItem(durableKey) ?? readDurableLocalTruthItem(`${PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE}.${username}`) ?? "";

  if (!durableRaw) {
    const migrated = releaseScopedDurableProfileEntries(
      PROFILE_ROUTE_DURABLE_HYDRATION_KEY_PREFIX_BASE,
      username,
      "profile-route-hydration-seed",
    )
      .map(({ entry }) => {
        const parsed = parseStoredSeed(entry.payload);
        if (
          !parsed ||
          parsed.username !== username ||
          Date.now() - parsed.createdAtMs > PROFILE_ROUTE_HYDRATION_SEED_MAX_AGE_MS
        ) {
          return null;
        }
        return { entry, parsed };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) =>
        right.entry.rank - left.entry.rank ||
        right.entry.storedAtMs - left.entry.storedAtMs ||
        right.parsed.createdAtMs - left.parsed.createdAtMs
      )[0] ?? null;

    if (migrated) {
      writeDurableLocalTruthItem(durableKey, migrated.entry.payload, {
        rank: migrated.entry.rank,
        source: "profile-route-hydration-seed",
        allowSameRankOverwrite: true,
      });
      durableRaw = readDurableLocalTruthItem(durableKey) ?? "";
    }
  }

  if (!durableRaw) return null;

  const parsed = parseStoredSeed(durableRaw);

  if (
    !parsed ||
    parsed.username !== username ||
    Date.now() - parsed.createdAtMs > PROFILE_ROUTE_HYDRATION_SEED_MAX_AGE_MS
  ) {
    removeDurableLocalTruthItem(durableKey);
    return null;
  }

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(hydrationSeedStorageKey(username), durableRaw);
    } catch {
      // Ignore storage write failures.
    }
  }

  return parsed;
}

function parseStoredSnapshot(raw: string): ProfileRouteSnapshotStored | null {
  try {
    const parsed = JSON.parse(decodeProfileSnapshotStorage(raw)) as Partial<ProfileRouteSnapshotStored>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (typeof parsed.username !== "string") return null;

    const profile = sanitizeProfileRouteProfile(parsed.profile);

    if (!profile) return null;
    if (parsed.viewerEmail !== null && typeof parsed.viewerEmail !== "string") return null;

    return {
      version: 1,
      createdAtMs: Number(parsed.createdAtMs),
      username: parsed.username,
      profile,
      viewerEmail: parsed.viewerEmail ?? null,
      currentPublicMembership: coerceProfileCurrentPublicMembership(parsed.currentPublicMembership),
      publicInventorySourceDigest: typeof parsed.publicInventorySourceDigest === "string" && /^[a-f0-9]{64}$/.test(parsed.publicInventorySourceDigest) ? parsed.publicInventorySourceDigest : null,
      publicInventoryRevision: typeof parsed.publicInventoryRevision === "string" ? parsed.publicInventoryRevision : null,
    };
  } catch {
    return null;
  }
}

function readStoredSnapshotForUsername(usernameRaw: string): ProfileRouteSnapshot | null {
  const username = parseProfileUsername(usernameRaw);
  if (!username) return null;

  clearLegacyProfileRouteProjection(username);

  try {
    compactHeldProfileSnapshotStorage(window.sessionStorage);
    compactHeldProfileSnapshotStorage(window.localStorage);
  } catch { /* Existing custody remains readable when storage cannot migrate. */ }
  const storageKeys = [snapshotStorageKey(username), runtimeProjectionScopedStorageKey(PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE, username), PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY];

  if (hasSessionStorage()) {
    for (const storageKey of storageKeys) {
      let raw = "";

      try {
        raw = window.sessionStorage.getItem(storageKey) ?? "";
      } catch {
        raw = "";
      }

      if (!raw) continue;

      const parsed = parseStoredSnapshot(raw);

      if (!parsed) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup failures.
        }
        continue;
      }

      if (parsed.username !== username) continue;

      if (!originalsContainDeterministicMarketPreview(parsed.profile.originals)) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup failures.
        }
        continue;
      }

      const snapshot: ProfileRouteSnapshot = {
        profile: parsed.profile,
        viewerEmail: parsed.viewerEmail,
        currentPublicMembership: parsed.currentPublicMembership ?? null,
        publicInventorySourceDigest: parsed.publicInventorySourceDigest ?? null,
        publicInventoryRevision: parsed.publicInventoryRevision ?? null,
      };

      if (!profileSnapshotCanRenderForCurrentSession(snapshot)) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup failures.
        }
        continue;
      }

      return snapshot;
    }
  }

  const durableKey = durableSnapshotStorageKey(username);
  let durableRaw = readDurableLocalTruthItem(durableKey) ?? readDurableLocalTruthItem(`${PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE}.${username}`) ?? "";

  if (!durableRaw) {
    const migrated = releaseScopedDurableProfileEntries(
      PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE,
      username,
      "profile-route-snapshot",
    )
      .map(({ entry }) => {
        const parsed = parseStoredSnapshot(entry.payload);
        if (
          !parsed ||
          parsed.username !== username ||
          !originalsContainDeterministicMarketPreview(parsed.profile.originals)
        ) {
          return null;
        }
        const snapshot: ProfileRouteSnapshot = {
          profile: parsed.profile,
          viewerEmail: parsed.viewerEmail,
          currentPublicMembership: parsed.currentPublicMembership ?? null,
          publicInventorySourceDigest: parsed.publicInventorySourceDigest ?? null,
          publicInventoryRevision: parsed.publicInventoryRevision ?? null,
        };
        if (!profileSnapshotMatchesCurrentSession(snapshot)) return null;
        return { entry, parsed, snapshot };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) =>
        profileSnapshotTruthRank(right.snapshot) - profileSnapshotTruthRank(left.snapshot) ||
        right.entry.rank - left.entry.rank ||
        right.entry.storedAtMs - left.entry.storedAtMs ||
        right.parsed.createdAtMs - left.parsed.createdAtMs
      )[0] ?? null;

    if (migrated) {
      writeDurableLocalTruthItem(durableKey, migrated.entry.payload, {
        rank: profileSnapshotTruthRank(migrated.snapshot),
        source: "profile-route-snapshot",
        allowSameRankOverwrite: true,
      });
      durableRaw = readDurableLocalTruthItem(durableKey) ?? "";
    }
  }

  if (!durableRaw) return null;

  const parsed = parseStoredSnapshot(durableRaw);

  if (
    !parsed ||
    parsed.username !== username ||
    !originalsContainDeterministicMarketPreview(parsed.profile.originals)
  ) {
    removeDurableLocalTruthItem(durableKey);
    return null;
  }

  const snapshot: ProfileRouteSnapshot = {
    profile: parsed.profile,
    viewerEmail: parsed.viewerEmail,
    currentPublicMembership: parsed.currentPublicMembership ?? null,
    publicInventorySourceDigest: parsed.publicInventorySourceDigest ?? null,
    publicInventoryRevision: parsed.publicInventoryRevision ?? null,
  };

  if (profileSnapshotHasConfirmedCurrentSessionMismatch(snapshot)) {
    removeDurableLocalTruthItem(durableKey);
    return null;
  }

  if (!profileSnapshotMatchesCurrentSession(snapshot)) {
    return null;
  }

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(snapshotStorageKey(username), durableRaw);
    } catch {
      // Ignore storage write failures.
    }
  }

  return snapshot;
}

function parseStoredNavigationIntent(raw: string): ProfileRouteNavigationIntentStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileRouteNavigationIntentStored>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (typeof parsed.username !== "string") return null;

    return parsed as ProfileRouteNavigationIntentStored;
  } catch {
    return null;
  }
}

function readStoredNavigationIntent(): ProfileRouteNavigationIntentStored | null {
  if (!hasSessionStorage()) return null;

  let raw = "";

  try {
    raw = window.sessionStorage.getItem(PROFILE_ROUTE_NAV_INTENT_KEY) ?? "";
  } catch {
    return null;
  }

  if (!raw) return null;

  const parsed = parseStoredNavigationIntent(raw);

  if (!parsed) return null;

  const isExpired = Date.now() - parsed.createdAtMs > PROFILE_ROUTE_NAV_INTENT_MAX_AGE_MS;

  if (!isExpired) return parsed;

  try {
    window.sessionStorage.removeItem(PROFILE_ROUTE_NAV_INTENT_KEY);
  } catch {
    // Ignore cleanup failures.
  }

  return null;
}

function snapshotCacheKey(usernameRaw: string): string | null {
  const username = parseProfileUsername(usernameRaw);
  return username ?? null;
}

function serializeProfileRouteSnapshotPayload(payload: ProfileRouteSnapshotStored): string | null {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(payload, (_key, value: unknown) => {
      if (typeof value === "bigint") return value.toString();
      if (typeof Blob !== "undefined" && value instanceof Blob) return null;

      if (value && typeof value === "object") {
        if (seen.has(value)) return null;
        seen.add(value);
      }

      return value;
    });
  } catch {
    return null;
  }
}

function persistProfileRouteSnapshot(
  key: string,
  snapshot: ProfileRouteSnapshot,
  options: { allowCanonicalPublicReplacement?: boolean } = {},
): void {
  const now = Date.now();
  const stableSnapshot: ProfileRouteSnapshot = {
    ...snapshot,
    profile: rememberProfileCreationSeed(snapshot.profile),
  };

  /*
   * Browser custody retains the complete admitted source and every Original.
   * Lossless encoding reduces Web Storage representation cost; it never turns
   * a physical quota into a source-membership or presentation boundary.
   */
  const durableFirstPaintSnapshot: ProfileRouteSnapshot = {
    ...stableSnapshot,
    profile: projectDeterministicProfileRouteFirstPaint(stableSnapshot.profile),
  };

  const payload: ProfileRouteSnapshotStored = {
    version: 1,
    createdAtMs: now,
    username: key,
    profile: durableFirstPaintSnapshot.profile,
    viewerEmail: stableSnapshot.viewerEmail,
    currentPublicMembership: stableSnapshot.currentPublicMembership ?? null,
    publicInventorySourceDigest: stableSnapshot.publicInventorySourceDigest ?? null,
    publicInventoryRevision: stableSnapshot.publicInventoryRevision ?? null,
  };

  const serializedSource = serializeProfileRouteSnapshotPayload(payload);
  const serialized = serializedSource ? encodeProfileSnapshotStorage(serializedSource) : null;

  if (!serialized) return;

  profileRouteSnapshotCache.delete(key);
  profileRouteSnapshotCache.set(key, { snapshot: stableSnapshot, createdAtMs: now });

  try {
    compactHeldProfileSnapshotStorage(window.sessionStorage);
    compactHeldProfileSnapshotStorage(window.localStorage);
  } catch {
    // Storage availability does not change admitted in-memory truth.
  }

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(snapshotStorageKey(key), serialized);
    } catch {
      // Ignore quota/storage failures.
    }
  }

  if (profileSnapshotMatchesCurrentSession(stableSnapshot)) {
    writeDurableLocalTruthItem(durableSnapshotStorageKey(key), serialized, {
      rank: profileSnapshotTruthRank(stableSnapshot),
      source: "profile-route-snapshot",
      allowDowngrade:
        options.allowCanonicalPublicReplacement === true || Boolean(stableSnapshot.currentPublicMembership),
      allowSameRankOverwrite:
        options.allowCanonicalPublicReplacement === true || Boolean(stableSnapshot.currentPublicMembership),
    });
  }

  while (profileRouteSnapshotCache.size > PROFILE_ROUTE_SNAPSHOT_CACHE_MAX_ITEMS) {
    const oldestKey = profileRouteSnapshotCache.keys().next().value;

    if (typeof oldestKey !== "string") break;

    profileRouteSnapshotCache.delete(oldestKey);
  }
}

export function writeProfileRouteHydrationSeed(input: ProfileRouteHydrationSeedInput): void {
  const username = parseProfileUsername(input.username);
  if (!username) return;

  clearLegacyProfileRouteProjection(username);

  const payload: ProfileRouteHydrationSeedStored = {
    version: 1,
    createdAtMs: Date.now(),
    username,
    profile: buildSeedProfile({
      username,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    }),
  };

  const serialized = JSON.stringify(payload);

  writeDurableLocalTruthItem(durableHydrationSeedStorageKey(username), serialized, {
    rank: DURABLE_LOCAL_TRUTH_RANK.experienceSeed,
    source: "profile-route-hydration-seed",
  });

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(hydrationSeedStorageKey(username), serialized);
    } catch {
      // Ignore quota/storage failures.
    }
  }
}

export function writeProfileRouteDeterministicSnapshot(input: ProfileRouteDeterministicSnapshotInput): void {
  let snapshotProfile = buildProfileRouteDeterministicSnapshot(input);
  if (!snapshotProfile) return;

  const existingSnapshot = peekProfileRouteSnapshot(snapshotProfile.profile.username);

  if (existingSnapshot) {
    const existingStamp = profileSnapshotManifestStamp(existingSnapshot);
    const mergedProfile = mergeProfileRouteDeterministicSnapshot(existingSnapshot.profile, snapshotProfile);
    const mergedStamp = resolveProfileDeterministicManifest(mergedProfile).stamp;

    if (existingStamp === mergedStamp) return;

    snapshotProfile = mergedProfile;
  }

  writeProfileRouteSnapshot({
    profile: snapshotProfile,
    viewerEmail: null,
  });
}

export function prepareProfileRouteTransition(usernameRaw: string): void {
  if (!hasSessionStorage()) return;

  const username = parseProfileUsername(usernameRaw);
  if (!username) return;

  const owner = canonicalReceizOwnerId(username);
  const session = peekSessionBootstrapSnapshot(true);
  const binding = session?.uid ? peekRecoveredAccountShowcaseScope({ username, accountId: session.uid }) : null;
  const artifactId = binding?.locator.showcaseArtifactId ?? (owner ? `profile-showcase:${owner}` as ProfileShowcaseArtifactId : null);
  // Prepared entry can use admitted memory only. It must not instantiate a
  // source vault or open storage for a brand-new frozen account entry.
  const source = artifactId ? peekProfileShowcaseRouteTruth(artifactId, boundedProfileShowcaseEdgeVault) : null;
  const operationCount = source && "carrier" in source ? source.carrier["profile-showcase"].resultingOperationCount : null;
  if (source && typeof operationCount === "number" && Number.isSafeInteger(operationCount))
    void refreshAcceptedPublicProfileDocument({ username, artifactDigest: source.artifactDigest, operationCount });

  const payload: ProfileRouteNavigationIntentStored = {
    version: 1,
    createdAtMs: Date.now(),
    username,
  };

  try {
    window.sessionStorage.setItem(PROFILE_ROUTE_NAV_INTENT_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota/storage failures.
  }
}

export function hasPreparedProfileRouteTransition(usernameRaw: string): boolean {
  const username = parseProfileUsername(usernameRaw);
  if (!username) return false;

  return readStoredNavigationIntent()?.username === username;
}

export function clearPreparedProfileRouteTransition(usernameRaw?: string): void {
  if (!hasSessionStorage()) return;

  if (usernameRaw) {
    const username = parseProfileUsername(usernameRaw);
    if (!username) return;

    const current = readStoredNavigationIntent();

    if (!current || current.username !== username) return;
  }

  try {
    window.sessionStorage.removeItem(PROFILE_ROUTE_NAV_INTENT_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

export function clearProfileRouteLocalTruth(usernameRaw?: string | null): void {
  const username = usernameRaw ? parseProfileUsername(usernameRaw) : null;

  if (!username) {
    removeSessionStorageKeys([
      PROFILE_ROUTE_HYDRATION_KEY,
      PROFILE_ROUTE_HYDRATION_KEY_BASE,
      PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY,
      PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_BASE,
      PROFILE_ROUTE_NAV_INTENT_KEY,
    ]);

    return;
  }

  clearLegacyProfileRouteProjection(username);

  profileRouteSnapshotCache.delete(username);

  removeSessionStorageKeys([
    hydrationSeedStorageKey(username),
    snapshotStorageKey(username),
    runtimeProjectionScopedStorageKey(PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE, username),
    PROFILE_ROUTE_HYDRATION_KEY,
    PROFILE_ROUTE_SNAPSHOT_STORAGE_KEY,
    PROFILE_ROUTE_NAV_INTENT_KEY,
  ]);

  clearReleaseScopedDurableProfileEntries(
    PROFILE_ROUTE_DURABLE_HYDRATION_KEY_PREFIX_BASE,
    username,
    "profile-route-hydration-seed",
  );
  clearReleaseScopedDurableProfileEntries(
    PROFILE_ROUTE_DURABLE_SNAPSHOT_STORAGE_KEY_PREFIX_BASE,
    username,
    "profile-route-snapshot",
  );
}

export function writeProfileRouteSnapshot(snapshot: ProfileRouteSnapshot): void {
  const key = snapshotCacheKey(snapshot.profile.profile.username);
  if (!key) return;

  clearLegacyProfileRouteProjection(key);

  const cachedCandidate = profileRouteSnapshotCache.get(key) ?? null;

  const existingCached =
    cachedCandidate && profileSnapshotCanRenderForCurrentSession(cachedCandidate.snapshot) ? cachedCandidate : null;

  if (
    cachedCandidate &&
    !existingCached &&
    profileSnapshotHasConfirmedCurrentSessionMismatch(cachedCandidate.snapshot)
  ) {
    profileRouteSnapshotCache.delete(key);
  }

  const existingStored = readStoredSnapshotForUsername(key);
  const existingSnapshot = existingStored ?? existingCached?.snapshot ?? null;
  const incomingSnapshot: ProfileRouteSnapshot = existingSnapshot
    ? {
        ...snapshot,
        profile: mergeProfilePreservingPbiReceiptHistory(existingSnapshot.profile, snapshot.profile),
      }
    : snapshot;
  const nextStamp = profileSnapshotManifestStamp(incomingSnapshot);
  const nextRank = profileSnapshotTruthRank(incomingSnapshot);
  const boundPublicAppend = existingSnapshot && incomingSnapshot.publicInventorySourceDigest
    && (!existingSnapshot.publicInventorySourceDigest
      || existingSnapshot.publicInventorySourceDigest === incomingSnapshot.publicInventorySourceDigest)
    ? projectSourceBoundPublicInventory(existingSnapshot.profile, incomingSnapshot.profile,
        incomingSnapshot.currentPublicMembership, incomingSnapshot.publicInventorySourceDigest,
        incomingSnapshot.publicInventorySourceDigest) : null;
  const newerCanonicalCompleteMembership = Boolean(boundPublicAppend) || canonicalCompleteProfileMembershipCanReplaceByRecency(
    existingSnapshot,
    incomingSnapshot,
  );
  const heldCanonicalCompleteMembership = coerceProfileCurrentPublicMembership(
    existingSnapshot?.currentPublicMembership,
  );
  const incomingCanonicalCompleteMembership = coerceProfileCurrentPublicMembership(
    incomingSnapshot.currentPublicMembership,
  );
  const heldCanonicalMembershipBlocksIncoming = Boolean(
    heldCanonicalCompleteMembership &&
      incomingCanonicalCompleteMembership &&
      !newerCanonicalCompleteMembership,
  );

  const existingRank = existingSnapshot ? profileSnapshotTruthRank(existingSnapshot) : 0;

  if (heldCanonicalMembershipBlocksIncoming) return;

  if (existingRank > nextRank && !newerCanonicalCompleteMembership) {
    if (existingSnapshot) {
      const profileWithIncomingIdentity = mergeProfilePreservingStrongerIdentity(
        incomingSnapshot.profile,
        existingSnapshot.profile,
      );

      if (profileWithIncomingIdentity !== existingSnapshot.profile) {
        persistProfileRouteSnapshot(key, {
          profile: profileWithIncomingIdentity,
          viewerEmail: existingSnapshot.viewerEmail ?? incomingSnapshot.viewerEmail,
          currentPublicMembership: existingSnapshot.currentPublicMembership ?? null,
          publicInventorySourceDigest: existingSnapshot.publicInventorySourceDigest ?? null,
          publicInventoryRevision: existingSnapshot.publicInventoryRevision ?? null,
        });
      }
    }

    return;
  }

  const existingCachedStamp = existingCached ? profileSnapshotManifestStamp(existingCached.snapshot) : "";

  if (
    existingCached &&
    existingCachedStamp === nextStamp &&
    existingCached.snapshot.viewerEmail === incomingSnapshot.viewerEmail
  ) {
    const profileWithIncomingIdentity = mergeProfilePreservingStrongerIdentity(
      incomingSnapshot.profile,
      existingCached.snapshot.profile,
    );

    persistProfileRouteSnapshot(key, {
      profile: profileWithIncomingIdentity,
      viewerEmail: incomingSnapshot.viewerEmail,
      currentPublicMembership:
        incomingSnapshot.currentPublicMembership ?? existingCached.snapshot.currentPublicMembership ?? null,
      publicInventorySourceDigest: incomingSnapshot.currentPublicMembership ? incomingSnapshot.publicInventorySourceDigest ?? null
        : existingCached.snapshot.publicInventorySourceDigest ?? null,
      publicInventoryRevision: incomingSnapshot.currentPublicMembership ? incomingSnapshot.publicInventoryRevision ?? null
        : existingCached.snapshot.publicInventoryRevision ?? null,
    });

    return;
  }

  const existingStoredStamp = existingStored ? profileSnapshotManifestStamp(existingStored) : "";

  if (
    existingStored &&
    existingStoredStamp === nextStamp &&
    existingStored.viewerEmail === incomingSnapshot.viewerEmail
  ) {
    const profileWithIncomingIdentity = mergeProfilePreservingStrongerIdentity(
      incomingSnapshot.profile,
      existingStored.profile,
    );

    persistProfileRouteSnapshot(key, {
      profile: profileWithIncomingIdentity,
      viewerEmail: incomingSnapshot.viewerEmail,
      currentPublicMembership:
        incomingSnapshot.currentPublicMembership ?? existingStored.currentPublicMembership ?? null,
      publicInventorySourceDigest: incomingSnapshot.currentPublicMembership ? incomingSnapshot.publicInventorySourceDigest ?? null
        : existingStored.publicInventorySourceDigest ?? null,
      publicInventoryRevision: incomingSnapshot.currentPublicMembership ? incomingSnapshot.publicInventoryRevision ?? null
        : existingStored.publicInventoryRevision ?? null,
    });

    return;
  }

  persistProfileRouteSnapshot(key, incomingSnapshot);
}

export function replaceProfileRouteSnapshotAfterWholeMarketTombstone(args: {
  snapshot: ProfileRouteSnapshot;
  supersededSnapshot: ProfileRouteSnapshot;
  tombstone: WholeMarketPublicOwnerProof;
}): boolean {
  const key = snapshotCacheKey(args.snapshot.profile.profile.username);
  if (!key) return false;
  const existingSnapshot = peekProfileRouteSnapshot(key, { includeSupersededWholeMarketSnapshot: true });
  if (
    !wholeMarketTombstoneCanReplacePublicProfileSnapshot({
      incoming: args.snapshot,
      superseded: args.supersededSnapshot,
      held: existingSnapshot,
      tombstone: args.tombstone,
    })
  ) {
    return false;
  }

  persistProfileRouteSnapshot(
    key,
    {
      ...args.snapshot,
      currentPublicMembership: null,
    },
    { allowCanonicalPublicReplacement: true },
  );
  return true;
}

export function peekProfileRouteSnapshot(
  usernameRaw: string,
  options: { includeSupersededWholeMarketSnapshot?: boolean } = {},
): ProfileRouteSnapshot | null {
  const key = snapshotCacheKey(usernameRaw);
  if (!key) return null;

  const cached = profileRouteSnapshotCache.get(key) ?? null;

  if (cached) {
    if (
      options.includeSupersededWholeMarketSnapshot !== true &&
      wholeMarketTombstoneSupersedesPublicProfileSnapshot(
        cached.snapshot,
        peekWholeMarketPublicOwnerProof(key),
      )
    ) {
      return null;
    }

    if (
      originalsContainDeterministicMarketPreview(cached.snapshot.profile.originals) &&
      profileSnapshotCanRenderForCurrentSession(cached.snapshot)
    ) {
      return cached.snapshot;
    }

    if (
      !originalsContainDeterministicMarketPreview(cached.snapshot.profile.originals) ||
      profileSnapshotHasConfirmedCurrentSessionMismatch(cached.snapshot)
    ) {
      profileRouteSnapshotCache.delete(key);
    }
  }

  const stored = readStoredSnapshotForUsername(key);

  if (!stored) return null;
  if (
    options.includeSupersededWholeMarketSnapshot !== true &&
    wholeMarketTombstoneSupersedesPublicProfileSnapshot(
      stored,
      peekWholeMarketPublicOwnerProof(key),
    )
  ) {
    return null;
  }

  if (cached) {
    const cachedStamp = profileSnapshotManifestStamp(cached.snapshot);
    const storedStamp = profileSnapshotManifestStamp(stored);

    if (
      cachedStamp === storedStamp &&
      cached.snapshot.viewerEmail === stored.viewerEmail &&
      profileSnapshotCanRenderForCurrentSession(cached.snapshot)
    ) {
      profileRouteSnapshotCache.delete(key);
      profileRouteSnapshotCache.set(key, { snapshot: cached.snapshot, createdAtMs: Date.now() });
      return cached.snapshot;
    }
  }

  profileRouteSnapshotCache.set(key, { snapshot: stored, createdAtMs: Date.now() });

  return stored;
}

export function peekProfileRouteHydrationSeed(usernameRaw: string): ProfileViewData | null {
  const parsed = readStoredSeedForUsername(usernameRaw);
  return parsed?.profile ?? null;
}

export function consumeProfileRouteHydrationSeed(usernameRaw: string): ProfileViewData | null {
  const username = parseProfileUsername(usernameRaw);
  const parsed = readStoredSeedForUsername(usernameRaw);

  if (parsed && username) {
    try {
      window.sessionStorage.removeItem(hydrationSeedStorageKey(username));
      window.sessionStorage.removeItem(PROFILE_ROUTE_HYDRATION_KEY);
    } catch {
      // Ignore cleanup failures.
    }

    clearReleaseScopedDurableProfileEntries(
      PROFILE_ROUTE_DURABLE_HYDRATION_KEY_PREFIX_BASE,
      username,
      "profile-route-hydration-seed",
    );
  }

  if (!parsed) return null;

  return parsed.profile;
}
