import { preserveMarketWalletContinuity } from "@/app/lib/market/snapshotContinuity";
import { economyProjectionLineageCanReplace } from "@/app/lib/market/economyProjectionLineage";
import type {
  MarketDeskItem,
  MarketDeskPublicMembership,
  MarketDeskPublicOriginalAsset,
  MarketDeskSnapshot,
} from "@/app/lib/market/types";

type PublicMembershipSource = MarketDeskPublicMembership["source"];

function normalizedTimestamp(value: string | null | undefined): string {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString();
}

function hashMembershipParts(parts: readonly string[]): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      const code = part.charCodeAt(index);
      left ^= code;
      left = Math.imul(left, 0x01000193) >>> 0;
      right ^= code + index;
      right = Math.imul(right, 0x85ebca6b) >>> 0;
    }
    left ^= 0xff;
    right ^= 0x7f;
  }

  return `${left.toString(16).padStart(8, "0")}${right.toString(16).padStart(8, "0")}`;
}

function membershipRevision(
  entries: readonly { id: string; assetId?: string | null; updatedAt?: string | null; fingerprint?: string | null }[],
): string {
  const parts = entries
    .map(
      (entry) =>
        `${entry.id.trim().toLowerCase()}|${(entry.assetId ?? "").trim().toLowerCase()}|${normalizedTimestamp(entry.updatedAt)}|${entry.fingerprint ?? ""}`,
    )
    .sort();
  return `${parts.length}:${hashMembershipParts(parts)}`;
}

export function buildMarketPublicMembershipFromOriginals(args: {
  originals: readonly MarketDeskPublicOriginalAsset[];
  source: PublicMembershipSource;
  generatedAt: string;
}): MarketDeskPublicMembership {
  return {
    version: 1,
    scope: "whole-market-visible-showcase",
    source: args.source,
    isComplete: args.source === "canonical-complete",
    generatedAt: normalizedTimestamp(args.generatedAt),
    itemCount: args.originals.length,
    revision: membershipRevision(
      args.originals.map((original) => ({
        id: original.id,
        assetId: original.receizId,
        updatedAt: original.updatedAt,
        fingerprint: [
          original.ownerUserId,
          original.ownerUsername,
          original.ownerDisplayName,
          original.ownerAvatarUrl ?? "",
          original.creatorUsername ?? "",
          original.creatorDisplayName ?? "",
          original.title,
          original.summary,
          original.verifyPath,
          original.mediaSrc ?? "",
          original.playbackSrc ?? "",
          original.profileOriginal?.claimHashHex ?? "",
          original.profileOriginal?.pbiReceiptHash ?? "",
          original.profileOriginal?.proof?.groth16Id ?? "",
          original.profileOriginal?.proof?.poseidon ?? "",
          original.profileOriginal?.media?.sha256Hex ?? "",
          original.profileOriginal?.longForm?.sha256Hex ?? "",
          ...(original.profileOriginal?.attachments ?? []).map(
            (attachment) => `${attachment.id}:${attachment.sha256Hex ?? ""}:${attachment.src ?? ""}`,
          ),
        ].join("|"),
      })),
    ),
  };
}

export function buildMarketPublicMembershipFromItems(args: {
  items: readonly MarketDeskItem[];
  source: PublicMembershipSource;
  generatedAt: string;
}): MarketDeskPublicMembership {
  return {
    version: 1,
    scope: "whole-market-visible-showcase",
    source: args.source,
    isComplete: args.source === "canonical-complete",
    generatedAt: normalizedTimestamp(args.generatedAt),
    itemCount: args.items.length,
    revision: membershipRevision(
      args.items.map((item) => ({
        ...item,
        fingerprint: [
          item.profileUsername ?? "",
          item.profileDisplayName ?? "",
          item.title,
          item.summary,
          item.verifyPath ?? item.verifyHref ?? "",
          item.mediaSrc ?? "",
          ...(item.proofManifestRows ?? []).map((row) => `${row.key ?? row.label}:${row.value}`),
        ].join("|"),
      })),
    ),
  };
}

function membershipTimestamp(membership: MarketDeskPublicMembership | null | undefined): number {
  const parsed = Date.parse(membership?.generatedAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemTimestamp(item: MarketDeskItem): number {
  const parsed = Date.parse(item.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function preserveCurrentPublicItemTradingState(
  currentItem: MarketDeskItem,
  incomingItem: MarketDeskItem,
): MarketDeskItem {
  return {
    ...incomingItem,
    pricingSourceKey: currentItem.pricingSourceKey ?? incomingItem.pricingSourceKey ?? null,
    updatedAt: itemTimestamp(currentItem) > itemTimestamp(incomingItem) ? currentItem.updatedAt : incomingItem.updatedAt,
    quoteUsdPerPhi: currentItem.quoteUsdPerPhi,
    priceUsd: currentItem.priceUsd,
    pricePhi: currentItem.pricePhi,
    intrinsicPhi: currentItem.intrinsicPhi,
    changePct: currentItem.changePct,
    volumeUsd: currentItem.volumeUsd,
    liquidityUsd: currentItem.liquidityUsd,
    holders: currentItem.holders,
    premiumX: currentItem.premiumX,
    momentX: currentItem.momentX,
    chart: currentItem.chart,
    yesPrice: currentItem.yesPrice,
    noPrice: currentItem.noPrice,
    shareQuote: currentItem.shareQuote ?? incomingItem.shareQuote ?? null,
  };
}

function projectExactPublicMembershipWithoutTradingDowngrade(
  currentSnapshot: MarketDeskSnapshot,
  incomingSnapshot: MarketDeskSnapshot,
): MarketDeskSnapshot {
  const currentLiveById = new Map(currentSnapshot.liveMarkets.map((item) => [item.id, item]));
  const liveMarkets = incomingSnapshot.liveMarkets.map((incomingItem) => {
    const currentItem = currentLiveById.get(incomingItem.id);
    return currentItem
      ? preserveCurrentPublicItemTradingState(currentItem, incomingItem)
      : incomingItem;
  });

  const predictionMarkets = [...currentSnapshot.predictionMarkets];
  const predictionIds = new Set(predictionMarkets.map((item) => item.id));
  for (const incomingPrediction of incomingSnapshot.predictionMarkets) {
    if (predictionIds.has(incomingPrediction.id)) continue;
    predictionIds.add(incomingPrediction.id);
    predictionMarkets.push(incomingPrediction);
  }

  return {
    ...incomingSnapshot,
    liveMarkets,
    predictionMarkets,
  };
}

export function completeMarketPublicMembershipSupersedes(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  incomingSnapshot: MarketDeskSnapshot | null | undefined,
): boolean {
  const incoming = incomingSnapshot?.publicMembership;
  if (!incoming?.isComplete || incoming.source !== "canonical-complete") return false;

  const current = currentSnapshot?.publicMembership;
  if (!current?.isComplete || current.source !== "canonical-complete") return true;
  if (incoming.revision === current.revision) {
    return true;
  }
  return economyProjectionLineageCanReplace(current, incoming);
}

export function reconcileCompleteMarketPublicMembership(
  currentSnapshot: MarketDeskSnapshot | null | undefined,
  incomingSnapshot: MarketDeskSnapshot,
): MarketDeskSnapshot {
  if (!currentSnapshot) return incomingSnapshot;

  const acceptExactMembership = completeMarketPublicMembershipSupersedes(currentSnapshot, incomingSnapshot);
  const exactPublicSnapshot = acceptExactMembership
    ? projectExactPublicMembershipWithoutTradingDowngrade(currentSnapshot, incomingSnapshot)
    : incomingSnapshot;
  const reconciled = preserveMarketWalletContinuity(currentSnapshot, exactPublicSnapshot, {
    preserveCurrentMarketItems: acceptExactMembership ? false : undefined,
  });

  if (acceptExactMembership) {
    return {
      ...reconciled,
      publicMembership: incomingSnapshot.publicMembership,
    };
  }

  const currentMembership = currentSnapshot.publicMembership;
  const incomingMembership = incomingSnapshot.publicMembership;
  if (
    currentMembership?.isComplete &&
    currentMembership.source === "canonical-complete"
  ) {
    return {
      ...reconciled,
      publicMembership: currentMembership,
    };
  }
  const publicMembership =
    !incomingMembership
      ? currentMembership
      : incomingMembership.isComplete
        ? incomingMembership
        : membershipTimestamp(incomingMembership) >= membershipTimestamp(currentMembership)
          ? incomingMembership
          : currentMembership;

  return publicMembership
    ? {
        ...reconciled,
        publicMembership: {
          ...publicMembership,
          itemCount: reconciled.liveMarkets.length,
          revision: membershipRevision(reconciled.liveMarkets),
        },
      }
    : reconciled;
}
