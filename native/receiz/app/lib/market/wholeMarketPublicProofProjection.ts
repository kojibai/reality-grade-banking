import type { MarketDeskPublicMembership, MarketDeskPublicOriginalAsset } from "@/app/lib/market/types";
import type { ProfileOriginal } from "@/app/lib/profile/types";
import { parseProfileUsername } from "@/app/lib/profile/username";

/** Existing public membership and Original projection, shared without the
 * browser register's IndexedDB/client boundary. No admission is added. */
export const WHOLE_MARKET_PUBLIC_PROOF_SCHEMA = "receiz.market.public-proof.v1";

export type WholeMarketPublicOwnerProof = {
  schema: typeof WHOLE_MARKET_PUBLIC_PROOF_SCHEMA;
  version: 1;
  username: string;
  ownerUserId: string;
  displayName: string;
  avatarUrl: string | null;
  membershipRevision: string;
  membershipGeneratedAt: string;
  isCurrentMember: boolean;
  originals: MarketDeskPublicOriginalAsset[];
  historyOriginals: MarketDeskPublicOriginalAsset[];
  profileShowcaseArtifactId: `profile-showcase:${string}` | null;
  profileShowcaseArtifactDigest: string | null;
  profileShowcaseHistoryHeadDigest: string | null;
  profileShowcaseAdmissionEvidenceRoot: string | null;
  economyShowcaseArtifactDigest?: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
};

export function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function timestampMs(value: unknown): number {
  const parsed = Date.parse(normalizedText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function isCanonicalCompleteMembership(
  membership: MarketDeskPublicMembership | null | undefined,
): membership is MarketDeskPublicMembership & { source: "canonical-complete"; isComplete: true } {
  return Boolean(
    membership &&
      membership.version === 1 &&
      membership.scope === "whole-market-visible-showcase" &&
      membership.source === "canonical-complete" &&
      membership.isComplete === true &&
      normalizedText(membership.revision) &&
      timestampMs(membership.generatedAt) > 0,
  );
}

function proofRowValue(
  rows: MarketDeskPublicOriginalAsset["proofManifestRows"],
  ...keys: string[]
): string | null {
  const wanted = new Set(keys.map((key) => key.trim().toLowerCase()));
  const row = rows?.find((candidate) => {
    const key = normalizedText(candidate.key).toLowerCase();
    const label = normalizedText(candidate.label).toLowerCase().replace(/\s+/g, "-");
    return wanted.has(key) || wanted.has(label);
  });
  return normalizedText(row?.value) || null;
}

function coordinateFromPublicOriginal(
  original: MarketDeskPublicOriginalAsset,
): { slug: string; code: string; pulse: string | null } {
  const parts = normalizedText(original.verifyPath).split("?")[0]?.split("/").filter(Boolean) ?? [];
  const routeIndex = parts.findIndex((part) => part === "v" || part === "r");
  return {
    slug: normalizedText(parts[routeIndex + 1]) || original.ownerUsername,
    code: normalizedText(parts[routeIndex + 2]) || original.receizId,
    pulse: normalizedText(original.pulse) || normalizedText(parts[routeIndex + 3]) || null,
  };
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function publicOriginalMetricProjection(original: MarketDeskPublicOriginalAsset) {
  const rng = seeded(hashString(`${original.id}:public-profile`));
  const usdPerPhi = finiteNumber(original.usdPerPhi, 25) > 0 ? finiteNumber(original.usdPerPhi, 25) : 25;
  const priceUsd = Math.max(0.12, roundTo(finiteNumber(original.valueUsd, 0.12) || 0.12, 2));
  const pricePhi = Math.max(
    0.000001,
    roundTo(finiteNumber(original.valuePhi, priceUsd / usdPerPhi) || priceUsd / usdPerPhi, 6),
  );
  const signedBoost = original.hasPbiSignature ? 1.2 : 0;
  const changePct = roundTo(-3.4 + rng() * 10.8 + signedBoost, 2);
  const volumeUsd = roundTo(Math.max(90 + rng() * 2800, priceUsd * (0.8 + rng() * 3.2)), 2);
  const liquidityUsd = roundTo(Math.max(60 + rng() * 1800, priceUsd * (0.55 + rng() * 2.15)), 2);
  const holders = Math.max(1, Math.round(1 + rng() * 3 + signedBoost));
  return {
    quoteUsdPerPhi: usdPerPhi,
    priceUsd,
    pricePhi,
    intrinsicPhi: pricePhi,
    changePct,
    volumeUsd,
    liquidityUsd,
    holders,
    premiumX: roundTo(1 + changePct / 100, 3),
    momentX: roundTo(0.96 + rng() * 0.18, 3),
    livePulseSeed: original.livePulseSeed,
  };
}

function mediaFromPublicOriginal(original: MarketDeskPublicOriginalAsset): ProfileOriginal["media"] {
  if (original.mediaKind === "moment") return null;
  const kind = original.mediaKind;
  const mediaSrc = normalizedText(original.mediaSrc);
  const playbackSrc = normalizedText(original.playbackSrc);
  const artworkSrc = normalizedText(original.artworkSrc);
  const coverSrc = normalizedText(original.playbackCoverSrc) || artworkSrc || null;
  const src = playbackSrc || mediaSrc || artworkSrc;
  if (!src) return null;
  const mediaSha256 = proofRowValue(original.proofManifestRows, "media-sha-256", "media-sha256");
  const originalDownloadSrc = mediaSrc || playbackSrc || null;

  return {
    kind,
    src,
    mime: original.mediaMime,
    name: original.mediaName || original.title,
    size: finiteNumber(original.mediaSize, 0) > 0 ? finiteNumber(original.mediaSize, 0) : null,
    sha256Hex: mediaSha256,
    originalDownloadSrc,
    originalDownloadName: original.mediaName,
    originalDownloadMime: original.mediaMime,
    originalDownloadSize: finiteNumber(original.mediaSize, 0) > 0 ? finiteNumber(original.mediaSize, 0) : null,
    originalDownloadSha256Hex: mediaSha256,
    playbackSrc: playbackSrc || null,
    playbackMime: original.mediaMime,
    playbackKind: kind === "video" ? (playbackSrc.includes(".m3u8") ? "hls" : "mp4") : null,
    derivativeDownloadSrc: mediaSrc || null,
    derivativeDownloadName: original.mediaName,
    derivativeDownloadMime: original.mediaMime,
    derivativeDownloadSize: finiteNumber(original.mediaSize, 0) > 0 ? finiteNumber(original.mediaSize, 0) : null,
    derivativeDownloadSha256Hex: mediaSha256,
    receiptDownloadSrc: null,
    receiptDownloadName: null,
    receiptMs: null,
    receiptTzMinutesEast: null,
    allowOriginalDownload: Boolean(originalDownloadSrc),
    allowDerivativeDownload: Boolean(mediaSrc),
    allowMomentRecordDownload: false,
    gateAudioPlayback: false,
    originalDownloadLimit: null,
    derivativeDownloadLimit: null,
    originalDownloadPriceCents: null,
    derivativeDownloadPriceCents: null,
    collectionReleaseAt: null,
    collectionReleasePulse: null,
    imageVariants: null,
    videoPosterSrc: kind === "video" ? coverSrc : null,
    videoPosterMime: kind === "video" ? "image/*" : null,
    videoPosterName: kind === "video" ? `${original.title} poster` : null,
    videoPosterImageVariants: null,
    audioCoverSrc: kind === "audio" ? coverSrc : null,
    audioCoverMime: kind === "audio" ? "image/*" : null,
    audioCoverName: kind === "audio" ? `${original.title} cover` : null,
    audioCoverImageVariants: null,
    epubCoverSrc: kind === "epub" ? coverSrc : null,
    epubCoverMime: kind === "epub" ? "image/*" : null,
    epubCoverName: kind === "epub" ? `${original.title} cover` : null,
    epubCoverImageVariants: null,
    epubMetadata: kind === "epub"
      ? {
          title: original.title,
          subtitle: null,
          primaryAuthor: original.creatorDisplayName ?? original.ownerDisplayName,
          contributors: null,
          publisher: null,
          imprint: null,
          genre: null,
          language: null,
          isbn: null,
          edition: null,
          series: null,
        }
      : null,
    audioDistribution: kind === "audio"
      ? {
          releaseTitle: original.title,
          primaryArtist: original.audioArtist ?? original.creatorDisplayName ?? original.ownerDisplayName,
          releaseType: null,
          genre: null,
          subgenre: null,
          explicit: false,
          isrc: null,
          writers: null,
          producer: null,
          label: null,
          releaseDate: null,
          territories: null,
        }
      : null,
    objectProof: null,
    liveMomentCapture: null,
  };
}

export function projectProfileOriginalsFromWholeMarketOwnerProof(
  owner: WholeMarketPublicOwnerProof,
): ProfileOriginal[] {
  return owner.originals.map((original): ProfileOriginal => {
    if (
      original.profileOriginal &&
      original.profileOriginal.id === original.receizId &&
      original.profileOriginal.showOnProfile === true
    ) {
      return original.profileOriginal;
    }

    const coordinate = coordinateFromPublicOriginal(original);
    const creatorUsername = parseProfileUsername(original.creatorUsername ?? "");
    const ownerIsCreator = !creatorUsername || creatorUsername === owner.username;
    const pbiReceiptHash = proofRowValue(original.proofManifestRows, "pbi-signature");
    return {
      id: original.receizId,
      slug: coordinate.slug,
      code: coordinate.code,
      ownershipKind: ownerIsCreator ? "creator" : "verified",
      ownershipRole: ownerIsCreator ? "creator" : "current-owner",
      originalCreator: ownerIsCreator
        ? {
            userId: owner.ownerUserId,
            username: owner.username,
            displayName: owner.displayName,
            avatarUrl: null,
            isPrivate: false,
          }
        : null,
      contextPreset: null,
      pulse: coordinate.pulse,
      claimHashHex: proofRowValue(original.proofManifestRows, "claim-sha-256", "claim-sha256"),
      claim: normalizedText(original.summary) || normalizedText(original.title) || "Receiz proof object",
      longForm: null,
      attachments: null,
      verifyPath: original.verifyPath,
      verifyUrl: original.verifyHref,
      createdAt: original.createdAt,
      ts: normalizedText(original.sourceTs) || original.createdAt,
      showOnProfile: true,
      historical: null,
      hasPbiSignature: original.hasPbiSignature,
      pbiReceiptHash,
      signedArtifactDownloadUrl: null,
      proof: {
        circuit: "Groth16",
        groth16Id: proofRowValue(original.proofManifestRows, "groth16"),
        poseidon: proofRowValue(original.proofManifestRows, "poseidon"),
      },
      marketPreview: publicOriginalMetricProjection(original),
      media: mediaFromPublicOriginal(original),
    };
  });
}
