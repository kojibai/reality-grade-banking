"use client";

import {
  MARKET_PREDICTION_WINDOWS,
  buildCanonicalAssetPredictionItemId,
  buildCanonicalAssetPredictionMarketItem,
  marketDeskItemFromPublicOriginal,
  marketPredictionExpiryMs,
} from "@/app/lib/market/compose";
import {
  peekMarketRouteSnapshot,
  prepareMarketRouteFastEntryHint,
  writeMarketRouteSnapshot,
  writeMarketRouteSnapshotFromProfileShowcaseSource,
} from "@/app/lib/market/routeHydration";
import type { ProfileShowcaseBoundedFirstPaint } from "@/app/lib/profile/showcase/boundedEdgeVault";
import type { MarketDeskItem, MarketDeskPublicOriginalAsset, MarketDeskSnapshot } from "@/app/lib/market/types";
import { parseReceizClaimDisplay } from "@/app/lib/profile/claimDisplay";
import { buildProofManifestRows } from "@/app/lib/profile/proofManifest";
import type { ProfileOriginal } from "@/app/lib/profile/types";

function compactProfileMarketText(value: string | null | undefined, maxLength = 220): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3).trimEnd()}...` : normalized;
}

async function loadFirstPaintMarketSnapshotFallback(): Promise<MarketDeskSnapshot | null> {
  const { buildMarketSnapshotFromFirstPaintProofObject } = await import(
    "@/app/lib/market/profilePublishFirstPaintFallback"
  );
  return buildMarketSnapshotFromFirstPaintProofObject();
}

function localProfileOriginalMarketMediaKind(original: ProfileOriginal): MarketDeskPublicOriginalAsset["mediaKind"] {
  const kind = original.media?.kind;
  if (
    kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "pdf" ||
    kind === "epub" ||
    kind === "file"
  ) {
    return kind;
  }
  return "moment";
}

function localProfileOriginalArtworkSrc(original: ProfileOriginal): string | null {
  const media = original.media;
  if (!media) return null;
  if (media.kind === "audio") return media.audioCoverSrc ?? null;
  if (media.kind === "video") return media.videoPosterSrc ?? null;
  if (media.kind === "epub") return media.epubCoverSrc ?? null;
  if (media.kind === "image") return media.src ?? null;
  return null;
}

function localProfileOriginalPlayableSrc(original: ProfileOriginal): string | null {
  const media = original.media;
  if (!media) return null;
  if (media.kind === "audio" || media.kind === "video") {
    const directSrc = (media.src ?? "").trim();
    if (/^\/api\/profile\/originals\/download(?:\?|$)/.test(directSrc) && media.originalDownloadSrc) {
      return media.originalDownloadSrc;
    }
    return directSrc || media.originalDownloadSrc || null;
  }
  return media.src ?? null;
}

function localProfileOriginalPlayableCoverSrc(original: ProfileOriginal): string | null {
  const media = original.media;
  if (!media) return null;
  if (media.kind === "audio") return media.audioCoverSrc ?? localProfileOriginalArtworkSrc(original);
  if (media.kind === "video") return media.videoPosterSrc ?? localProfileOriginalArtworkSrc(original);
  return localProfileOriginalArtworkSrc(original);
}

function localProfileOriginalMarketTitle(args: {
  original: ProfileOriginal;
  ownerDisplayName: string;
}): string {
  const claimTitle = compactProfileMarketText(parseReceizClaimDisplay(args.original.claim).firstLine, 96);
  if (claimTitle) return claimTitle;

  const media = args.original.media;
  const mediaTitle =
    media?.kind === "audio"
      ? media.audioDistribution?.releaseTitle ?? media.name
      : media?.kind === "epub"
        ? media.epubMetadata?.title ?? media.name
        : media?.name ?? null;
  const normalizedMediaTitle = compactProfileMarketText(mediaTitle, 96);
  if (normalizedMediaTitle) return normalizedMediaTitle;

  return `${args.ownerDisplayName} receiz`;
}

function localProfileOriginalMarketSummary(args: {
  original: ProfileOriginal;
  ownerUsername: string;
  ownerDisplayName: string;
}): string {
  const creatorDisplayName = args.original.originalCreator?.displayName?.trim() || null;
  const creatorNote =
    creatorDisplayName && creatorDisplayName.toLowerCase() !== args.ownerDisplayName.toLowerCase()
      ? ` Created by ${creatorDisplayName}.`
      : "";
  const claim = compactProfileMarketText(args.original.claim, 220);
  if (claim) return `${claim}${creatorNote}`.trim();
  return `Public receiz shown on @${args.ownerUsername}.${creatorNote}`.replace(/\s+/g, " ").trim();
}

export function buildLocalPublishedOriginalMarketAsset(args: {
  original: ProfileOriginal;
  ownerUserId: string;
  ownerUsername: string;
  ownerDisplayName: string;
}): MarketDeskPublicOriginalAsset | null {
  if (!args.original.showOnProfile) return null;
  const receizId = args.original.id.trim();
  const ownerUserId = args.ownerUserId.trim();
  const ownerUsername = args.ownerUsername.trim();
  if (!receizId || !ownerUserId || !ownerUsername) return null;

  const preview = args.original.marketPreview ?? null;
  if (!preview) return null;

  const valueUsd = preview.priceUsd;
  const valuePhi = preview.pricePhi;
  const usdPerPhi = preview.quoteUsdPerPhi;
  const creatorUsername = args.original.originalCreator?.username?.trim() || (args.original.importedSource ? null : ownerUsername);
  const creatorDisplayName = args.original.originalCreator?.displayName?.trim() || (args.original.importedSource ? null : args.ownerDisplayName);
  const ownerDisplayName = args.ownerDisplayName || ownerUsername;

  return {
    id: `profile:${ownerUsername}:${receizId}`,
    receizId,
    ownerUserId,
    ownerUsername,
    ownerDisplayName,
    creatorUsername,
    creatorDisplayName,
    title: localProfileOriginalMarketTitle({
      original: args.original,
      ownerDisplayName,
    }),
    summary: localProfileOriginalMarketSummary({
      original: args.original,
      ownerUsername,
      ownerDisplayName,
    }),
    createdAt: args.original.createdAt,
    updatedAt: args.original.createdAt,
    pulse: args.original.pulse,
    hasPbiSignature: args.original.hasPbiSignature,
    mediaKind: localProfileOriginalMarketMediaKind(args.original),
    canonicalHref: `/${ownerUsername}/verified/${encodeURIComponent(receizId)}`,
    originalHref: `/${ownerUsername}/originals/${encodeURIComponent(receizId)}`,
    verifyHref: args.original.verifyUrl,
    verifyPath: args.original.verifyPath,
    sourceTs: args.original.ts,
    playbackSrc: localProfileOriginalPlayableSrc(args.original),
    playbackCoverSrc: localProfileOriginalPlayableCoverSrc(args.original),
    mediaSrc: args.original.media?.src ?? null,
    mediaMime: args.original.media?.mime ?? null,
    mediaName: args.original.media?.name ?? null,
    mediaSize: args.original.media?.size ?? null,
    artworkSrc: localProfileOriginalArtworkSrc(args.original),
    audioArtist: args.original.media?.audioDistribution?.primaryArtist ?? null,
    valueUsd,
    valuePhi,
    usdPerPhi,
    livePulseSeed: preview.livePulseSeed ?? null,
    proofManifestRows: buildProofManifestRows(args.original),
    assetMetrics: null,
  };
}

function isSameMarketItem(left: MarketDeskItem, right: MarketDeskItem): boolean {
  if (left.id === right.id) return true;
  return Boolean(left.assetId && right.assetId && left.assetId === right.assetId);
}

function appendMarketItem(items: readonly MarketDeskItem[], item: MarketDeskItem): MarketDeskItem[] {
  return [item, ...items.filter((current) => !isSameMarketItem(current, item))];
}

function buildLocalCanonicalPredictionMarketItems(args: {
  item: MarketDeskItem;
  snapshot: MarketDeskSnapshot;
}): MarketDeskItem[] {
  if (args.item.marketType !== "asset" || args.item.source === "starter") return [];

  const assetKey = (args.item.assetId ?? args.item.id).trim();
  if (!assetKey) return [];

  const generatedAtMs = Date.parse(args.snapshot.generatedAt);
  const now = Number.isFinite(generatedAtMs) ? new Date(generatedAtMs) : new Date();

  return MARKET_PREDICTION_WINDOWS.map((window) => {
    const expiryMs = marketPredictionExpiryMs({ now, durationMs: window.durationMs });
    const marketItemId = buildCanonicalAssetPredictionItemId(assetKey, window.key, expiryMs);
    return buildCanonicalAssetPredictionMarketItem({
      underlyingAsset: args.item,
      marketItemId,
      now,
    });
  }).filter((predictionItem): predictionItem is MarketDeskItem => Boolean(predictionItem));
}

function isPublishedProfileOriginalMarketItem(args: {
  item: MarketDeskItem;
  receizId: string;
  ownerUsername: string;
}): boolean {
  if (args.item.source !== "profile") return false;
  if (args.item.assetId === args.receizId) return true;
  if (args.item.id === `profile:${args.ownerUsername}:${args.receizId}`) return true;
  return args.item.canonicalHref === `/${args.ownerUsername}/verified/${encodeURIComponent(args.receizId)}`;
}

function removePublishedOriginalMarketItems(args: {
  items: readonly MarketDeskItem[];
  receizId: string;
  ownerUsername: string;
}): MarketDeskItem[] {
  return args.items.filter(
    (item) =>
      !isPublishedProfileOriginalMarketItem({
        item,
        receizId: args.receizId,
        ownerUsername: args.ownerUsername,
      }),
  );
}

function marketSnapshotViewerUserId(
  snapshot: MarketDeskSnapshot,
  ownerUserId: string,
  ownerUsername: string,
): string | null {
  if (snapshot.viewerUserId) return snapshot.viewerUserId;
  return snapshot.signedIn && snapshot.username === ownerUsername ? ownerUserId : null;
}

function appendPublishedOriginalToMarketSnapshot(args: {
  snapshot: MarketDeskSnapshot;
  original: MarketDeskPublicOriginalAsset;
  ownerUserId: string;
}): MarketDeskSnapshot {
  const viewerUserId = marketSnapshotViewerUserId(args.snapshot, args.ownerUserId, args.original.ownerUsername);
  const item = marketDeskItemFromPublicOriginal({
    original: args.original,
    viewerUserId,
  });
  const nextLiveMarkets = appendMarketItem(args.snapshot.liveMarkets, item);
  const nextPredictionMarkets = buildLocalCanonicalPredictionMarketItems({
    item,
    snapshot: args.snapshot,
  }).reduce((items, predictionItem) => appendMarketItem(items, predictionItem), args.snapshot.predictionMarkets);
  const nextOwnedItems =
    args.snapshot.signedIn && item.ownership === "owned"
      ? appendMarketItem(args.snapshot.ownedItems, item)
      : args.snapshot.ownedItems.filter((current) => !isSameMarketItem(current, item));

  return {
    ...args.snapshot,
    generatedAt: new Date().toISOString(),
    liveMarkets: nextLiveMarkets,
    predictionMarkets: nextPredictionMarkets,
    ownedItems: nextOwnedItems,
  };
}

function removePublishedOriginalFromMarketSnapshot(args: {
  snapshot: MarketDeskSnapshot;
  receizId: string;
  ownerUsername: string;
}): MarketDeskSnapshot | null {
  const nextLiveMarkets = removePublishedOriginalMarketItems({
    items: args.snapshot.liveMarkets,
    receizId: args.receizId,
    ownerUsername: args.ownerUsername,
  });
  const nextOwnedItems = removePublishedOriginalMarketItems({
    items: args.snapshot.ownedItems,
    receizId: args.receizId,
    ownerUsername: args.ownerUsername,
  });
  const nextPredictionMarkets = removePublishedOriginalMarketItems({
    items: args.snapshot.predictionMarkets,
    receizId: args.receizId,
    ownerUsername: args.ownerUsername,
  });
  if (
    nextLiveMarkets.length === args.snapshot.liveMarkets.length &&
    nextOwnedItems.length === args.snapshot.ownedItems.length &&
    nextPredictionMarkets.length === args.snapshot.predictionMarkets.length
  ) {
    return null;
  }

  return {
    ...args.snapshot,
    generatedAt: new Date().toISOString(),
    liveMarkets: nextLiveMarkets,
    predictionMarkets: nextPredictionMarkets,
    ownedItems: nextOwnedItems,
  };
}

export async function appendPublishedProfileOriginalToMarketRouteSnapshot(args: {
  original: ProfileOriginal;
  ownerUserId: string;
  ownerUsername: string;
  ownerDisplayName: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const marketAsset = buildLocalPublishedOriginalMarketAsset(args);
  if (!marketAsset) return;

  const writeAppendedSnapshot = (snapshot: MarketDeskSnapshot | null): boolean => {
    if (!snapshot) return false;
    const nextSnapshot = appendPublishedOriginalToMarketSnapshot({
      snapshot,
      original: marketAsset,
      ownerUserId: args.ownerUserId,
    });
    const wrote = writeMarketRouteSnapshot(nextSnapshot);
    if (wrote) prepareMarketRouteFastEntryHint(nextSnapshot.signedIn);
    return wrote;
  };

  if (writeAppendedSnapshot(peekMarketRouteSnapshot(true))) return;
  if (writeAppendedSnapshot(peekMarketRouteSnapshot())) return;
  await writeAppendedSnapshot(await loadFirstPaintMarketSnapshotFallback());
}

export async function appendPublishedProfileOriginalsToMarketRouteSnapshot(args: {
  originals: readonly ProfileOriginal[];
  ownerUserId: string;
  ownerUsername: string;
  ownerDisplayName: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const marketAssets = args.originals
    .map((original) =>
      buildLocalPublishedOriginalMarketAsset({
        original,
        ownerUserId: args.ownerUserId,
        ownerUsername: args.ownerUsername,
        ownerDisplayName: args.ownerDisplayName,
      }),
    )
    .filter((asset): asset is MarketDeskPublicOriginalAsset => Boolean(asset));
  if (marketAssets.length === 0) return;

  const writeAppendedSnapshot = (snapshot: MarketDeskSnapshot | null): boolean => {
    if (!snapshot) return false;
    const nextSnapshot = marketAssets.reduce(
      (currentSnapshot, original) =>
        appendPublishedOriginalToMarketSnapshot({
          snapshot: currentSnapshot,
          original,
          ownerUserId: args.ownerUserId,
        }),
      snapshot,
    );
    const wrote = writeMarketRouteSnapshot(nextSnapshot);
    if (wrote) prepareMarketRouteFastEntryHint(nextSnapshot.signedIn);
    return wrote;
  };

  if (writeAppendedSnapshot(peekMarketRouteSnapshot(true))) return;
  if (writeAppendedSnapshot(peekMarketRouteSnapshot())) return;
  // Passive profile viewing should not import the full market proof bundle.
  // The market route owns cold deterministic market first paint; this path only enriches an existing market snapshot.
}

export async function removePublishedProfileOriginalFromMarketRouteSnapshot(args: {
  receizId: string;
  ownerUsername: string;
  source: ProfileShowcaseBoundedFirstPaint | null;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const receizId = args.receizId.trim();
  const ownerUsername = args.ownerUsername.trim();
  if (!receizId || !ownerUsername) return;

  const writeRemovedSnapshot = (snapshot: MarketDeskSnapshot | null): boolean => {
    if (!snapshot) return false;
    const nextSnapshot = removePublishedOriginalFromMarketSnapshot({
      snapshot,
      receizId,
      ownerUsername,
    });
    if (!nextSnapshot) return false;
    const wrote = args.source
      ? writeMarketRouteSnapshotFromProfileShowcaseSource(nextSnapshot, args.source)
      : writeMarketRouteSnapshot(nextSnapshot);
    if (wrote) prepareMarketRouteFastEntryHint(nextSnapshot.signedIn);
    return wrote;
  };

  if (writeRemovedSnapshot(peekMarketRouteSnapshot(true))) return;
  if (writeRemovedSnapshot(peekMarketRouteSnapshot())) return;
  await writeRemovedSnapshot(await loadFirstPaintMarketSnapshotFallback());
}
