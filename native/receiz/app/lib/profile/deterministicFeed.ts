import type { ProfileDeterministicManifest, ProfileOriginal, ProfileViewData } from "@/app/lib/profile/types";
import { profileOriginalProofIdentityKey } from "@/app/lib/profile/pbiSignatureHistory";
import { projectProfileIdentityGenesisShowcase } from "@/app/lib/profile/profileIdentityShowcase";
import { compareCanonicalProfileOriginalOrder } from "@/app/lib/profile/publishedOriginalProjectionOrder";

export type DeterministicBlockStatus = "empty" | "partial" | "complete";

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeManifest(
  manifest: ProfileDeterministicManifest | null | undefined,
  username: string
): ProfileDeterministicManifest | null {
  if (!manifest || manifest.version !== 1 || manifest.scope !== "visible-showcase") return null;
  if (manifest.username !== username) return null;
  return {
    version: 1,
    scope: "visible-showcase",
    username,
    stamp: (manifest.stamp || "").trim(),
    itemCount: nonNegativeInteger(manifest.itemCount),
    isComplete: manifest.isComplete === true,
    pageSize: Math.max(1, nonNegativeInteger(manifest.pageSize)),
    nextCursor: typeof manifest.nextCursor === "string" ? manifest.nextCursor.trim() || null : null,
    newestOriginalAt: typeof manifest.newestOriginalAt === "string" ? manifest.newestOriginalAt : null,
  };
}

function profileOriginalMergeRank(original: ProfileOriginal): number {
  return original.id.startsWith("optimistic:") ? 0 : 1;
}

function dedupeProfileOriginalsByCoordinate(originals: readonly ProfileOriginal[]): ProfileOriginal[] {
  const byId = new Set<string>();
  const coordinateIndex = new Map<string, number>();
  const out: ProfileOriginal[] = [];

  const isOptimisticProjection = (original: ProfileOriginal): boolean =>
    original.id.startsWith("optimistic:profile-original:");

  for (const original of originals) {
    if (byId.has(original.id)) continue;
    const coordinateKey = profileOriginalProofIdentityKey(original);
    if (coordinateKey) {
      const existingIndex = coordinateIndex.get(coordinateKey);
      if (typeof existingIndex === "number") {
        const existing = out[existingIndex];
        const isSameProofProjection = Boolean(
          existing
          && (
            coordinateKey.includes("::a:")
            || isOptimisticProjection(existing)
            || isOptimisticProjection(original)
          )
        );
        if (isSameProofProjection) {
          if (existing && profileOriginalMergeRank(original) > profileOriginalMergeRank(existing)) {
            byId.delete(existing.id);
            byId.add(original.id);
            out[existingIndex] = original;
          }
          continue;
        }
      }
      if (coordinateKey.includes("::a:") || isOptimisticProjection(original)) {
        coordinateIndex.set(coordinateKey, out.length);
      }
    }
    byId.add(original.id);
    out.push(original);
  }

  return out;
}

export function visibleShowcaseOriginalsFromOriginals(originals: readonly ProfileOriginal[]): ProfileOriginal[] {
  return projectProfileIdentityGenesisShowcase(
    dedupeProfileOriginalsByCoordinate(originals.filter((original) => original.showOnProfile)),
  );
}

export function visibleShowcaseOriginalsFromProfile(
  profile: Pick<ProfileViewData, "originals" | "profile" | "deterministicManifest">
): ProfileOriginal[] {
  return visibleShowcaseOriginalsFromOriginals(profile.originals);
}

function sortProfileOriginalsByRecency(originals: readonly ProfileOriginal[]): ProfileOriginal[] {
  return [...originals].sort(compareCanonicalProfileOriginalOrder);
}

export function buildProfileDeterministicManifest(
  profile: Pick<ProfileViewData, "profile" | "originals" | "originalsPage" | "stats">,
  options?: { forceIncomplete?: boolean },
): ProfileDeterministicManifest {
  const username = profile.profile.username;
  const visibleOriginals = visibleShowcaseOriginalsFromOriginals(profile.originals);
  const isComplete = options?.forceIncomplete
    ? false
    : isVisibleShowcaseDeterministicallyComplete({
        originals: visibleOriginals,
        hasMore: profile.originalsPage.hasMore,
        totalVisibleCount: profile.stats.originals,
      });
  const stampInput = visibleOriginals
    .map((original) => {
      const media = original.media;
      const mediaIdentity = [
        media?.sha256Hex ?? "",
        media?.originalDownloadSha256Hex ?? "",
        media?.audioCoverSrc ?? "",
        media?.videoPosterSrc ?? "",
        media?.epubCoverSrc ?? "",
      ].join(":");
      return [
        original.id,
        original.createdAt,
        original.ts,
        original.claimHashHex ?? "",
        original.pbiReceiptHash ?? "",
        mediaIdentity,
      ].join("|");
    })
    .join("\n");
  return {
    version: 1,
    scope: "visible-showcase",
    username,
    stamp: fnv1aHex(`${username}\n${isComplete ? "1" : "0"}\n${stampInput}`),
    itemCount: visibleOriginals.length,
    isComplete,
    pageSize: Math.max(1, nonNegativeInteger(profile.originalsPage.pageSize), visibleOriginals.length),
    nextCursor: isComplete ? null : profile.originalsPage.nextCursor,
    newestOriginalAt: visibleOriginals[0]?.createdAt ?? null,
  };
}

export function resolveProfileDeterministicManifest(
  profile: Pick<ProfileViewData, "profile" | "originals" | "originalsPage" | "stats" | "deterministicManifest">
): ProfileDeterministicManifest {
  return normalizeManifest(profile.deterministicManifest, profile.profile.username) ?? buildProfileDeterministicManifest(profile);
}

export function deterministicManifestRank(manifest: ProfileDeterministicManifest | null | undefined): number {
  if (!manifest) return 0;
  return deterministicSnapshotRank({
    itemCount: manifest.itemCount,
    isComplete: manifest.isComplete,
    pageSize: manifest.pageSize,
  });
}

export function mergeDeterministicProfileFeed(args: {
  preserveHeldOriginals?: boolean;
  prev: Pick<ProfileViewData, "profile" | "stats" | "originals" | "originalsPage" | "deterministicManifest">;
  next: Pick<ProfileViewData, "profile" | "stats" | "originals" | "originalsPage" | "deterministicManifest">;
}): {
  originals: ProfileOriginal[];
  originalsPage: ProfileViewData["originalsPage"];
  stats: ProfileViewData["stats"];
  deterministicManifest: ProfileDeterministicManifest;
} {
  const prevManifest = resolveProfileDeterministicManifest(args.prev);
  const nextManifest = resolveProfileDeterministicManifest(args.next);
  const shouldPreserveCanonicalTail =
    args.preserveHeldOriginals === true ||
    deterministicManifestRank(prevManifest) > deterministicManifestRank(nextManifest) ||
    (args.next.originalsPage.hasMore && args.prev.originals.length > args.next.originals.length);

  const seen = new Set(args.next.originals.map((original) => original.id));
  const nextCoordinateRanks = new Map<string, number>();
  for (const original of args.next.originals) {
    const coordinateKey = profileOriginalProofIdentityKey(original);
    if (!coordinateKey) continue;
    nextCoordinateRanks.set(coordinateKey, Math.max(nextCoordinateRanks.get(coordinateKey) ?? 0, profileOriginalMergeRank(original)));
  }
  const unresolvedLocalAppends = args.prev.originals.filter((original) => {
    if (!original.id.startsWith("optimistic:profile-original:")) return false;
    if (seen.has(original.id)) return false;
    const coordinateKey = profileOriginalProofIdentityKey(original);
    return !coordinateKey || !nextCoordinateRanks.has(coordinateKey);
  });
  const carry = args.prev.originals.filter((original) => {
    if (seen.has(original.id)) return false;
    const coordinateKey = profileOriginalProofIdentityKey(original);
    if (!coordinateKey) return shouldPreserveCanonicalTail;
    const nextRank = nextCoordinateRanks.get(coordinateKey);
    if (
      original.id.startsWith("optimistic:profile-original:") &&
      typeof nextRank !== "number"
    ) {
      return true;
    }
    if (typeof nextRank === "number" && profileOriginalMergeRank(original) > nextRank) return true;
    return shouldPreserveCanonicalTail && typeof nextRank !== "number";
  });
  const originals =
    carry.length === 0
      ? dedupeProfileOriginalsByCoordinate(args.next.originals)
      : sortProfileOriginalsByRecency(dedupeProfileOriginalsByCoordinate([...args.next.originals, ...carry]));
  const provisionalOriginalsPage = {
    pageSize: Math.max(
      args.next.originalsPage.pageSize,
      shouldPreserveCanonicalTail ? args.prev.originalsPage.pageSize : 0,
      originals.length,
      1
    ),
    hasMore: args.next.originalsPage.hasMore,
    nextCursor: args.next.originalsPage.nextCursor,
  };
  const provisionalMerged = {
    ...args.next,
    originals,
    originalsPage: provisionalOriginalsPage,
  };
  const nextVisibleCount = visibleShowcaseOriginalsFromOriginals(args.next.originals).length;
  const forceIncomplete =
    nextManifest.isComplete === false &&
    nextManifest.itemCount === nextVisibleCount &&
    args.next.originalsPage.hasMore === false &&
    nextVisibleCount > args.next.stats.originals;
  let deterministicManifest = buildProfileDeterministicManifest(provisionalMerged, { forceIncomplete });
  const originalsPage = deterministicManifest.isComplete
    ? {
        pageSize: provisionalOriginalsPage.pageSize,
        hasMore: false,
        nextCursor: null,
      }
    : provisionalOriginalsPage;

  if (originalsPage !== provisionalOriginalsPage) {
    deterministicManifest = buildProfileDeterministicManifest(
      {
        ...provisionalMerged,
        originalsPage,
      },
      { forceIncomplete },
    );
  }
  const preservesVisibleLocalAppend = unresolvedLocalAppends.some(
    (original) => original.showOnProfile,
  );
  const preservesSignedVisibleLocalAppend = unresolvedLocalAppends.some(
    (original) => original.showOnProfile && original.hasPbiSignature,
  );
  const preservesHiddenLocalAppend = unresolvedLocalAppends.some(
    (original) => !original.showOnProfile,
  );
  const stats = {
    ...args.next.stats,
    originals: preservesVisibleLocalAppend
      ? Math.max(args.prev.stats.originals, args.next.stats.originals)
      : args.next.stats.originals,
    signedOriginals: preservesSignedVisibleLocalAppend
      ? Math.max(args.prev.stats.signedOriginals, args.next.stats.signedOriginals)
      : args.next.stats.signedOriginals,
    hiddenOriginals: preservesHiddenLocalAppend
      ? Math.max(args.prev.stats.hiddenOriginals, args.next.stats.hiddenOriginals)
      : args.next.stats.hiddenOriginals,
  };

  return {
    originals,
    originalsPage,
    stats,
    deterministicManifest,
  };
}

export function isVisibleShowcaseDeterministicallyComplete(args: {
  originals: readonly ProfileOriginal[];
  hasMore: boolean;
  totalVisibleCount?: number | null;
}): boolean {
  const loadedVisibleCount = args.originals.reduce(
    (count, original) => (original.showOnProfile ? count + 1 : count),
    0
  );
  const totalVisibleCount =
    typeof args.totalVisibleCount === "number" && Number.isFinite(args.totalVisibleCount)
      ? Math.max(0, Math.trunc(args.totalVisibleCount))
      : null;

  if (totalVisibleCount !== null && totalVisibleCount > 0 && loadedVisibleCount >= totalVisibleCount) {
    return true;
  }

  return args.hasMore !== true;
}

export function profileVisibleShowcaseIsComplete(
  profile: Pick<ProfileViewData, "profile" | "originals" | "originalsPage" | "stats" | "deterministicManifest">
): boolean {
  return resolveProfileDeterministicManifest(profile).isComplete;
}

export function deterministicBlockStatus(args: {
  itemCount: number;
  isComplete: boolean;
}): DeterministicBlockStatus {
  const itemCount = Number.isFinite(args.itemCount) ? Math.max(0, Math.trunc(args.itemCount)) : 0;
  if (itemCount <= 0) return "empty";
  return args.isComplete ? "complete" : "partial";
}

export function deterministicSnapshotRank(args: {
  itemCount: number;
  isComplete: boolean;
  pageSize?: number | null;
}): number {
  const itemCount = Number.isFinite(args.itemCount) ? Math.max(0, Math.trunc(args.itemCount)) : 0;
  const pageSize =
    typeof args.pageSize === "number" && Number.isFinite(args.pageSize)
      ? Math.max(0, Math.trunc(args.pageSize))
      : 0;
  const completenessBoost = args.isComplete ? 1_000_000_000 : 0;
  return completenessBoost + itemCount * 1_000 + pageSize;
}

export function profileKaiHead(profile: ProfileViewData | null | undefined): bigint | null {
  if (!profile) return null;
  const coordinates = [
    profile.profile.lastSealedPulse,
    ...profile.originals.map((original) => original.pulse),
  ];
  let head: bigint | null = null;
  for (const coordinate of coordinates) {
    if (typeof coordinate !== "string" || !/^\d+$/.test(coordinate)) continue;
    const kai = BigInt(coordinate);
    if (head === null || kai > head) head = kai;
  }
  return head;
}

/**
 * Admits the globally farther profile head for first paint. Kai is authority;
 * deterministic completeness only resolves two projections of the same head.
 */
export function selectProfileFirstPaintByKaiHead(
  held: ProfileViewData | null,
  incoming: ProfileViewData | null,
): ProfileViewData | null {
  if (!held) return incoming;
  if (!incoming) return held;

  const heldHead = profileKaiHead(held);
  const incomingHead = profileKaiHead(incoming);
  if (heldHead !== null || incomingHead !== null) {
    if (heldHead === null) return incoming;
    if (incomingHead === null || incomingHead < heldHead) return held;
    if (incomingHead > heldHead) return incoming;
  }

  const heldManifest = resolveProfileDeterministicManifest(held);
  const incomingManifest = resolveProfileDeterministicManifest(incoming);
  return deterministicManifestRank(incomingManifest) > deterministicManifestRank(heldManifest)
    ? incoming
    : held;
}
