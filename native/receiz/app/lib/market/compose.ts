import type { ChartPoint } from "@/app/components/valuation/series";
import type { WorldBootstrapView, WorldDistrictView, WorldVentureView } from "@/app/lib/world/types";
import type {
  MarketDeskComposeDraft,
  MarketDeskCreatorReserveSource,
  MarketDeskDistrict,
  MarketDeskInventoryAsset,
  MarketDeskItem,
  MarketDeskPositionView,
  MarketDeskPredictionBookSource,
  MarketDeskPredictionBookView,
  MarketDeskPredictionPositionSource,
  MarketDeskPredictionPositionView,
  MarketDeskPulseValueSeed,
  MarketDeskPublicOriginalAsset,
  MarketDeskSharePositionSource,
  MarketDeskSnapshot,
  MarketDeskSnapshotTransport,
  MarketDeskSummaryMeta,
  MarketDeskWalletSource,
  MarketShareQuoteView,
} from "@/app/lib/market/types";
import {
  buildPredictionBinaryContractView,
  predictionClaimPayoutUsdCents,
  predictionContractExpired,
  predictionImpliedProbabilities,
  predictionReturnMultiple,
  usdPriceMicrosFromNumber,
} from "@/app/lib/market/predictionMath";
import {
  bigintLike,
  formatPhiLabelFromMicro,
  formatShareQuantityFromMicro,
  formatUsdLabelFromCents,
  marketPositionUnrealizedPct,
  normalizeUsdPriceCents,
  shareMarketValueUsdCents,
} from "@/app/lib/market/shareMath";
import {
  buildMarketShareQuoteSnapshot,
  marketShareQuoteFromView,
  marketShareQuoteToView,
} from "@/app/lib/market/shareQuoteModel";
import { epochMsFromPulse, momentFromUTC, PULSE_MS } from "@/app/utils/kai_pulse";
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from "@/app/utils/phi-issuance";
import { computeIntrinsicUnsigned, type SigilMetadataLite } from "@/app/utils/valuation";

const MARKET_META_MARKER = "[receiz-market]\n";
const DEFAULT_USD_PER_PHI = 1;
const MARKET_QUOTE_SAMPLE_USD = 100;
const MARKET_QUOTE_META = { ip: { expectedCashflowPhi: [] } } as unknown as SigilMetadataLite;
const CANONICAL_ASSET_PREDICTION_PREFIX = "prediction:asset:";

export type MarketPredictionWindowKey = "1h" | "24h" | "72h";

export type MarketPredictionWindowDefinition = {
  key: MarketPredictionWindowKey;
  shortLabel: string;
  titleLabel: string;
  durationMs: number;
};

export const DEFAULT_MARKET_PREDICTION_WINDOW_KEY: MarketPredictionWindowKey = "24h";

export const MARKET_PREDICTION_WINDOWS: readonly MarketPredictionWindowDefinition[] = [
  {
    key: "1h",
    shortLabel: "1H",
    titleLabel: "1 hour",
    durationMs: 60 * 60 * 1000,
  },
  {
    key: "24h",
    shortLabel: "24H",
    titleLabel: "24 hours",
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    key: "72h",
    shortLabel: "3D",
    titleLabel: "3 days",
    durationMs: 72 * 60 * 60 * 1000,
  },
] as const;

const MARKET_PREDICTION_WINDOW_ORDER = new Map<MarketPredictionWindowKey, number>(
  MARKET_PREDICTION_WINDOWS.map((window, index) => [window.key, index === 1 ? 0 : index === 0 ? 1 : 2]),
);

type BuildMarketDeskSnapshotArgs = {
  generatedAt: string;
  signedIn: boolean;
  viewerUserId: string | null;
  quoteUsdPerPhi: number;
  wallet: MarketDeskWalletSource | null;
  world: WorldBootstrapView;
  inventoryAssets: MarketDeskInventoryAsset[];
  publicOriginals: MarketDeskPublicOriginalAsset[];
  sharePositions: MarketDeskSharePositionSource[];
  creatorReserves?: MarketDeskCreatorReserveSource[];
  predictionBooks: MarketDeskPredictionBookSource[];
  predictionPositions: MarketDeskPredictionPositionSource[];
};

type DistrictLike = Pick<
  WorldDistrictView,
  "id" | "slug" | "title" | "purpose" | "publicAccess" | "economicMode" | "themeHue"
>;

function marketPredictionWindowByKey(key: string | null | undefined): MarketPredictionWindowDefinition | null {
  if (!key) return null;
  return MARKET_PREDICTION_WINDOWS.find((window) => window.key === key) ?? null;
}

function predictionWindowRank(key: string | null | undefined): number {
  if (!key) return 99;
  return MARKET_PREDICTION_WINDOW_ORDER.get(key as MarketPredictionWindowKey) ?? 99;
}

function canonicalAssetPredictionKey(item: Pick<MarketDeskItem, "id" | "assetId">): string | null {
  const candidate = (item.assetId ?? item.id).trim();
  return candidate ? candidate : null;
}

export function marketPredictionExpiryMs(args: { now?: Date; durationMs: number }): number {
  const durationMs = Math.max(60_000, Math.trunc(args.durationMs));
  const durationPulses = Math.max(1, Math.round(durationMs / PULSE_MS));
  const currentPulse = Math.max(0, Math.trunc(momentFromUTC(args.now ?? new Date()).pulse));
  const bucketStartPulse = Math.floor(currentPulse / durationPulses) * durationPulses;
  const expiryPulse = bucketStartPulse + durationPulses;
  return Number(epochMsFromPulse(expiryPulse <= currentPulse ? expiryPulse + durationPulses : expiryPulse));
}

export function buildCanonicalAssetPredictionItemId(assetKey: string, windowKey: MarketPredictionWindowKey, expiryMs: number): string {
  return `${CANONICAL_ASSET_PREDICTION_PREFIX}${encodeURIComponent(assetKey)}:${windowKey}:${Math.max(0, Math.trunc(expiryMs))}`;
}

export function parseCanonicalAssetPredictionItemId(value: string): {
  assetKey: string;
  windowKey: MarketPredictionWindowKey;
  expiryMs: number;
} | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(CANONICAL_ASSET_PREDICTION_PREFIX)) return null;
  const suffix = trimmed.slice(CANONICAL_ASSET_PREDICTION_PREFIX.length);
  const lastColon = suffix.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const secondLastColon = suffix.lastIndexOf(":", lastColon - 1);
  if (secondLastColon <= 0) return null;
  const assetKeyRaw = suffix.slice(0, secondLastColon);
  const windowKey = suffix.slice(secondLastColon + 1, lastColon);
  const expiryMs = Number.parseInt(suffix.slice(lastColon + 1), 10);
  const window = marketPredictionWindowByKey(windowKey);
  if (!window || !Number.isFinite(expiryMs) || expiryMs <= 0) return null;
  return {
    assetKey: decodeURIComponent(assetKeyRaw),
    windowKey: window.key,
    expiryMs,
  };
}

export function isCanonicalAssetPredictionMarketItemId(value: string): boolean {
  return parseCanonicalAssetPredictionItemId(value) != null;
}

export function canonicalPredictionWindowForMarketItemId(value: string): MarketPredictionWindowDefinition | null {
  const parsed = parseCanonicalAssetPredictionItemId(value);
  return parsed ? marketPredictionWindowByKey(parsed.windowKey) : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function usdNumberFromCents(cents: bigint): number {
  return Number(cents) / 100;
}

function usdCentsFromNumber(value: number | null | undefined): bigint {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0n;
  return BigInt(Math.max(0, Math.round(value * 100)));
}

function asPositiveNumber(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function coerceIso(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function admittedWholeKaiPulse(value: string | number | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/u.test(raw)) return null;
  const pulse = Number(BigInt(raw));
  return Number.isSafeInteger(pulse) ? pulse : null;
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

function normalizeMeta(input: unknown): MarketDeskSummaryMeta | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const type = raw.type === "prediction" ? "prediction" : raw.type === "asset" ? "asset" : null;
  if (!type) return null;

  const clean = (value: unknown, max = 140): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  };

  return {
    type,
    assetId: clean(raw.assetId, 120),
    assetTitle: clean(raw.assetTitle, 160),
    yesLabel: clean(raw.yesLabel, 32),
    noLabel: clean(raw.noLabel, 32),
    resolution: clean(raw.resolution, 160),
    expiryAt: clean(raw.expiryAt, 64),
    redeemableAt: clean(raw.redeemableAt, 64),
  };
}

export function parseMarketSummary(summary: string | null | undefined): {
  displaySummary: string;
  meta: MarketDeskSummaryMeta | null;
} {
  const source = typeof summary === "string" ? summary : "";
  if (!source.trim()) return { displaySummary: "", meta: null };

  if (source.startsWith(MARKET_META_MARKER)) {
    try {
      const meta = normalizeMeta(JSON.parse(source.slice(MARKET_META_MARKER.length)));
      return { displaySummary: "", meta };
    } catch {
      return { displaySummary: source.trim(), meta: null };
    }
  }

  const markerIndex = source.indexOf(`\n\n${MARKET_META_MARKER}`);
  if (markerIndex < 0) {
    return { displaySummary: source.trim(), meta: null };
  }

  const displaySummary = source.slice(0, markerIndex).trim();
  const metaPayload = source.slice(markerIndex + 2 + MARKET_META_MARKER.length);
  try {
    return {
      displaySummary,
      meta: normalizeMeta(JSON.parse(metaPayload)),
    };
  } catch {
    return { displaySummary: source.trim(), meta: null };
  }
}

export function serializeMarketSummary(summary: string, meta: MarketDeskSummaryMeta): string {
  const displaySummary = summary.trim();
  const normalizedMeta = normalizeMeta(meta) ?? { type: "asset" as const };
  const payload = JSON.stringify(normalizedMeta);
  return displaySummary ? `${displaySummary}\n\n${MARKET_META_MARKER}${payload}` : `${MARKET_META_MARKER}${payload}`;
}

function metricEnvelope(seedKey: string, usdPerPhi: number, profile: "asset" | "prediction" | "inventory") {
  const rng = seeded(hashString(seedKey));
  const safeUsdPerPhi = asPositiveNumber(usdPerPhi, DEFAULT_USD_PER_PHI);

  const priceUsd =
    profile === "prediction"
      ? roundTo(0.2 + rng() * 0.6, 2)
      : profile === "inventory"
        ? roundTo(250 + rng() * 4250, 2)
        : roundTo(18 + rng() * 960, 2);

  const changePct =
    profile === "prediction"
      ? roundTo(-4 + rng() * 11, 2)
      : roundTo(-8 + rng() * 20, 2);
  const pricePhi = roundTo(priceUsd / safeUsdPerPhi, 6);
  const intrinsicPhi = roundTo(pricePhi * (0.9 + rng() * 0.18), 6);
  const volumeUsd =
    profile === "prediction"
      ? roundTo(900 + rng() * 18000, 2)
      : roundTo(4200 + rng() * 120000, 2);
  const liquidityUsd =
    profile === "prediction"
      ? roundTo(600 + rng() * 9000, 2)
      : roundTo(1500 + rng() * 48000, 2);
  const holders = Math.max(8, Math.round(12 + rng() * (profile === "inventory" ? 60 : 820)));
  const premiumX = roundTo(1 + changePct / 100, 3);
  const momentX = roundTo(0.92 + rng() * 0.32, 3);

  return {
    priceUsd,
    pricePhi,
    intrinsicPhi,
    changePct,
    volumeUsd,
    liquidityUsd,
    holders,
    premiumX,
    momentX,
  };
}

type BuildChartOptions = {
  anchorPulse?: number | null;
};

function buildChart(
  seedKey: string,
  liveUsd: number,
  usdPerPhi: number,
  changePct: number,
  options: BuildChartOptions = {},
): ChartPoint[] {
  const safeUsdPerPhi = asPositiveNumber(usdPerPhi, DEFAULT_USD_PER_PHI);
  const rng = seeded(hashString(`${seedKey}:chart`));
  const points: ChartPoint[] = [];
  const count = 48;
  const startUsd = clamp(liveUsd / (1 + changePct / 100 || 1), liveUsd * 0.55, Math.max(liveUsd * 1.35, liveUsd + 3));
  const anchorPulse =
    typeof options.anchorPulse === "number" && Number.isFinite(options.anchorPulse)
      ? Math.max(0, Math.trunc(options.anchorPulse))
      : null;

  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const drift = startUsd + (liveUsd - startUsd) * Math.pow(progress, 1.16);
    const noise = (rng() - 0.5) * Math.max(0.6, liveUsd * 0.035);
    const valueUsd = index === count - 1 ? liveUsd : clamp(drift + noise, 0.12, Math.max(liveUsd * 1.6, liveUsd + 4));
    const valuePhi = roundTo(valueUsd / safeUsdPerPhi, 6);
    const pointPulse = anchorPulse == null ? null : Math.max(0, anchorPulse - (count - 1 - index));
    points.push({
      i: index,
      value: valuePhi,
      premium: roundTo(valuePhi * (0.94 + rng() * 0.12), 6),
      pulse: pointPulse ?? undefined,
      at: pointPulse == null ? undefined : new Date(Number(epochMsFromPulse(pointPulse))).toISOString(),
    });
  }

  return points;
}

export function buildMarketDeskDeterministicChart(
  seedKey: string,
  liveUsd: number,
  usdPerPhi: number,
  changePct: number,
  options: BuildChartOptions = {},
): ChartPoint[] {
  return buildChart(seedKey, liveUsd, usdPerPhi, changePct, options);
}

export type MarketDeskLivePreviewSeed = {
  quoteUsdPerPhi: number;
  priceUsd: number;
  pricePhi: number;
  intrinsicPhi: number;
  changePct: number;
  volumeUsd?: number;
  liquidityUsd?: number;
  holders?: number;
  premiumX: number;
  momentX: number;
  livePulseSeed: MarketDeskPulseValueSeed | null;
};

export function buildMarketDeskPreviewItem(args: {
  receizId: string;
  title: string;
  preview: MarketDeskLivePreviewSeed;
  marketItemId?: string | null;
  pricingSourceKey?: string | null;
}): MarketDeskItem {
  const normalizedReceizId = args.receizId.trim() || "preview";
  const normalizedMarketItemId = args.marketItemId?.trim() || `preview:${normalizedReceizId}`;
  const pricingSourceKey = args.pricingSourceKey?.trim() || normalizedReceizId;
  const referencePulse = args.preview.livePulseSeed?.claimPulse ?? null;
  const marketMetricEnvelope = publicOriginalMetricEnvelope({
    id: normalizedMarketItemId,
    valueUsd: args.preview.priceUsd,
    valuePhi: args.preview.pricePhi,
    usdPerPhi: args.preview.quoteUsdPerPhi,
    hasPbiSignature: false,
  });
  const updatedAt =
    referencePulse == null ? "1970-01-01T00:00:00.000Z" : new Date(Number(epochMsFromPulse(referencePulse))).toISOString();

  return {
    id: normalizedMarketItemId,
    pricingSourceKey,
    marketType: "asset",
    state: "live",
    source: "profile",
    ownership: "watch",
    title: args.title,
    summary: "",
    kindLabel: "Verified asset",
    districtId: null,
    districtTitle: null,
    ownerLabel: null,
    updatedAt,
    quoteUsdPerPhi: args.preview.quoteUsdPerPhi,
    priceUsd: args.preview.priceUsd,
    pricePhi: args.preview.pricePhi,
    intrinsicPhi: args.preview.intrinsicPhi,
    changePct: args.preview.changePct,
    volumeUsd: args.preview.volumeUsd ?? marketMetricEnvelope.volumeUsd,
    liquidityUsd: args.preview.liquidityUsd ?? marketMetricEnvelope.liquidityUsd,
    holders: args.preview.holders ?? marketMetricEnvelope.holders,
    premiumX: args.preview.premiumX,
    momentX: args.preview.momentX,
    chart: buildChart(pricingSourceKey, args.preview.priceUsd, args.preview.quoteUsdPerPhi, args.preview.changePct, {
      anchorPulse: referencePulse,
    }),
    yesPrice: null,
    noPrice: null,
    yesLabel: null,
    noLabel: null,
    resolutionLabel: null,
    assetId: normalizedReceizId,
    verifyHref: null,
    verifyPath: null,
    sourceTs: null,
    externalHref: null,
    canonicalHref: null,
    originalHref: null,
    visibility: "public",
    mediaKind: null,
    profileUsername: null,
    profileDisplayName: null,
    playbackSrc: null,
    playbackCoverSrc: null,
    mediaSrc: null,
    mediaMime: null,
    mediaName: null,
    mediaSize: null,
    artworkSrc: null,
    audioArtist: null,
    pills: ["Live market"],
    livePulseSeed: args.preview.livePulseSeed,
    position: null,
    creatorReserve: null,
    predictionBook: null,
    predictionPosition: null,
    predictionContract: null,
    proofManifestRows: null,
    assetMetrics: null,
    shareQuote: null,
  };
}

function cloneChart(points: readonly ChartPoint[]): ChartPoint[] {
  return points.map((point) => ({ ...point }));
}

function toDistrictMap(districts: readonly DistrictLike[]): Map<string, MarketDeskDistrict> {
  const map = new Map<string, MarketDeskDistrict>();
  for (const district of districts) {
    const normalized = {
      id: district.id,
      slug: district.slug,
      title: district.title,
      purpose: district.purpose,
      publicAccess: district.publicAccess,
      economicMode: district.economicMode,
      themeHue: district.themeHue,
    } satisfies MarketDeskDistrict;
    map.set(district.id, normalized);
    map.set(district.slug, normalized);
  }
  return map;
}

function stripEmpty(values: readonly (string | null | undefined)[]): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function buildPredictionOdds(seedKey: string): { yesPrice: number; noPrice: number } {
  const rng = seeded(hashString(`${seedKey}:odds`));
  const yesPrice = roundTo(clamp(0.28 + rng() * 0.44, 0.08, 0.92), 2);
  return {
    yesPrice,
    noPrice: roundTo(clamp(1 - yesPrice, 0.08, 0.92), 2),
  };
}

function valuationMetaFromPulseSeed(seed: MarketDeskPulseValueSeed): SigilMetadataLite {
  return {
    pulse: seed.claimPulse,
    kaiPulse: seed.claimPulse,
    beat: seed.beat,
    stepIndex: seed.stepIndex,
    stepsPerBeat: 44,
    quality: "high",
    creatorVerified: seed.creatorVerified,
    creatorRep: 0,
    chakraDay: seed.chakraDay ?? undefined,
    kaiSignature: seed.kaiSignature ?? undefined,
    userPhiKey: seed.userPhiKey ?? undefined,
  };
}

function pulseWave(seedKey: string, pulse: number): number {
  const basePulse = Math.max(0, Math.trunc(pulse));
  const phaseA = (hashString(`${seedKey}:pulse-a`) % 6283) / 1000;
  const phaseB = (hashString(`${seedKey}:pulse-b`) % 6283) / 1000;
  const phaseC = (hashString(`${seedKey}:pulse-c`) % 6283) / 1000;
  return (
    Math.sin(basePulse * 0.173 + phaseA) * 0.56 +
    Math.cos(basePulse * 0.071 + phaseB) * 0.31 +
    Math.sin(basePulse * 0.287 + phaseC) * 0.13
  );
}

function withPositionLiveValues(item: MarketDeskItem): MarketDeskItem {
  if (!item.position) return item;
  const livePriceUsdCents = normalizeUsdPriceCents(item.priceUsd);
  const shareQuantityMicro = bigintLike(item.position.shareQuantityMicro);
  const costBasisUsdCents = normalizeUsdPriceCents(item.position.costBasisUsd);
  const marketValueUsdCents = shareMarketValueUsdCents(shareQuantityMicro, livePriceUsdCents);
  const unrealizedUsdCents = marketValueUsdCents - costBasisUsdCents;

  return {
    ...item,
    position: {
      ...item.position,
      marketValueUsd: usdNumberFromCents(marketValueUsdCents),
      marketValueUsdLabel: formatUsdLabelFromCents(marketValueUsdCents),
      unrealizedPnlUsd: usdNumberFromCents(unrealizedUsdCents),
      unrealizedPnlUsdLabel: formatUsdLabelFromCents(unrealizedUsdCents),
      unrealizedPnlPct: roundTo(
        marketPositionUnrealizedPct({
          shareQuantityMicro,
          livePriceUsdCents,
          costBasisUsdCents,
        }),
        2,
      ),
    },
  };
}

function positionViewForItem(item: MarketDeskItem, position: MarketDeskSharePositionSource): MarketDeskPositionView {
  const shareQuantityMicro = bigintLike(position.shareQuantityMicro);
  const costBasisUsdCents = normalizeUsdPriceCents(position.costBasisUsd);
  const costBasisPhiMicro = bigintLike(Math.round(position.costBasisPhi * 1_000_000));
  const marketValueUsdCents = shareMarketValueUsdCents(shareQuantityMicro, normalizeUsdPriceCents(item.priceUsd));
  const unrealizedUsdCents = marketValueUsdCents - costBasisUsdCents;

  return {
    id: position.id,
    shareQuantityMicro: position.shareQuantityMicro,
    shareQuantity: position.shareQuantity,
    shareQuantityLabel: formatShareQuantityFromMicro(shareQuantityMicro),
    costBasisUsd: position.costBasisUsd,
    costBasisUsdLabel: formatUsdLabelFromCents(costBasisUsdCents),
    costBasisPhi: position.costBasisPhi,
    costBasisPhiLabel: formatPhiLabelFromMicro(costBasisPhiMicro),
    marketValueUsd: usdNumberFromCents(marketValueUsdCents),
    marketValueUsdLabel: formatUsdLabelFromCents(marketValueUsdCents),
    unrealizedPnlUsd: usdNumberFromCents(unrealizedUsdCents),
    unrealizedPnlUsdLabel: formatUsdLabelFromCents(unrealizedUsdCents),
    unrealizedPnlPct: roundTo(
      marketPositionUnrealizedPct({
        shareQuantityMicro,
        livePriceUsdCents: normalizeUsdPriceCents(item.priceUsd),
        costBasisUsdCents,
      }),
      2,
    ),
    openedAt: position.openedAt,
    lastTradeAt: position.lastTradeAt,
  };
}

function creatorReserveViewForItem(
  item: MarketDeskItem,
  reserve: MarketDeskCreatorReserveSource | null | undefined,
): MarketDeskItem["creatorReserve"] {
  const authorizedShareQuantityMicro = reserve
    ? bigintLike(reserve.authorizedShareQuantityMicro)
    : 1_000_000n;
  const lockedShareQuantityMicro = reserve ? bigintLike(reserve.lockedShareQuantityMicro) : 0n;
  const issuedShareQuantityMicro = reserve ? bigintLike(reserve.issuedShareQuantityMicro) : 0n;
  const availableShareQuantityMicro = reserve
    ? bigintLike(reserve.availableShareQuantityMicro)
    : authorizedShareQuantityMicro;
  const availableValueUsdCents = shareMarketValueUsdCents(
    availableShareQuantityMicro,
    normalizeUsdPriceCents(item.priceUsd),
  );

  return {
    id: reserve?.id ?? null,
    mintSource: "creator_reserve",
    authorizedShareQuantityMicro: authorizedShareQuantityMicro.toString(),
    authorizedShareQuantityLabel: formatShareQuantityFromMicro(authorizedShareQuantityMicro),
    lockedShareQuantityMicro: (lockedShareQuantityMicro + issuedShareQuantityMicro).toString(),
    lockedShareQuantityLabel: formatShareQuantityFromMicro(lockedShareQuantityMicro + issuedShareQuantityMicro),
    issuedShareQuantityMicro: issuedShareQuantityMicro.toString(),
    issuedShareQuantityLabel: formatShareQuantityFromMicro(issuedShareQuantityMicro),
    availableShareQuantityMicro: availableShareQuantityMicro.toString(),
    availableShareQuantityLabel: formatShareQuantityFromMicro(availableShareQuantityMicro),
    availableValueUsd: usdNumberFromCents(availableValueUsdCents),
    availableValueUsdLabel: formatUsdLabelFromCents(availableValueUsdCents),
  };
}

function itemWithCreatorReserve(
  item: MarketDeskItem,
  reserve: MarketDeskCreatorReserveSource | null | undefined,
): MarketDeskItem {
  if (item.marketType !== "asset" || item.source !== "profile" || item.ownership !== "owned") return item;
  return {
    ...item,
    creatorReserve: creatorReserveViewForItem(item, reserve),
  };
}

function itemWithPosition(item: MarketDeskItem, position: MarketDeskSharePositionSource | null | undefined): MarketDeskItem {
  if (!position) return item;
  return withPositionLiveValues({
    ...item,
    position: positionViewForItem(item, position),
  });
}

export function marketDeskItemWithSharePosition(
  item: MarketDeskItem,
  position: MarketDeskSharePositionSource | null | undefined,
): MarketDeskItem {
  return itemWithPosition(item, position);
}

export function marketDeskItemWithCreatorReserve(
  item: MarketDeskItem,
  reserve: MarketDeskCreatorReserveSource | null | undefined,
): MarketDeskItem {
  return itemWithCreatorReserve(item, reserve);
}

function predictionBookViewForSource(source: MarketDeskPredictionBookSource): MarketDeskPredictionBookView {
  const yesPoolUsdCents = usdCentsFromNumber(source.yesPoolUsd);
  const noPoolUsdCents = usdCentsFromNumber(source.noPoolUsd);
  const totalPoolUsdCents = yesPoolUsdCents + noPoolUsdCents;
  const smoothingUsdCents = usdCentsFromNumber(source.smoothingUsd);
  const { yesProbability, noProbability } = predictionImpliedProbabilities({
    yesPoolUsdCents,
    noPoolUsdCents,
    smoothingUsdCents,
  });
  return {
    marketItemId: source.marketItemId,
    creatorUserId: source.creatorUserId,
    status: source.status,
    closeAt: source.closeAt,
    resolveByAt: source.resolveByAt,
    finalizedAt: source.finalizedAt,
    yesLabel: source.yesLabel,
    noLabel: source.noLabel,
    resolutionLabel: source.resolutionLabel,
    yesPoolUsd: source.yesPoolUsd,
    yesPoolUsdLabel: formatUsdLabelFromCents(yesPoolUsdCents),
    noPoolUsd: source.noPoolUsd,
    noPoolUsdLabel: formatUsdLabelFromCents(noPoolUsdCents),
    totalPoolUsd: source.yesPoolUsd + source.noPoolUsd,
    totalPoolUsdLabel: formatUsdLabelFromCents(totalPoolUsdCents),
    yesProbability: roundTo(yesProbability, 4),
    noProbability: roundTo(noProbability, 4),
    yesReturnMultiple: roundTo(
      predictionReturnMultiple({
        sidePoolUsdCents: yesPoolUsdCents,
        totalPoolUsdCents,
        payoutFeeBps: source.payoutFeeBps,
      }),
      3,
    ),
    noReturnMultiple: roundTo(
      predictionReturnMultiple({
        sidePoolUsdCents: noPoolUsdCents,
        totalPoolUsdCents,
        payoutFeeBps: source.payoutFeeBps,
      }),
      3,
    ),
    entryFeeBps: source.entryFeeBps,
    payoutFeeBps: source.payoutFeeBps,
    smoothingUsd: source.smoothingUsd,
    totalWagerCount: source.totalWagerCount,
    totalPositionCount: source.totalPositionCount,
    resolutionQuorum: source.resolutionQuorum,
    resolutionMajorityBps: source.resolutionMajorityBps,
    finalYesVotes: source.finalYesVotes,
    finalNoVotes: source.finalNoVotes,
    finalCancelVotes: source.finalCancelVotes,
    resolvedOutcome: source.resolvedOutcome,
    predictionContract: source.predictionContract,
  };
}

function predictionPositionViewForItem(
  item: MarketDeskItem,
  position: MarketDeskPredictionPositionSource,
  predictionBook: MarketDeskPredictionBookView | null,
): MarketDeskPredictionPositionView {
  const grossWagerUsdCents = usdCentsFromNumber(position.grossWagerUsd);
  const netStakeUsdCents = usdCentsFromNumber(position.netStakeUsd);
  const estimatedPayoutUsdCents =
    position.status === "claimable" && predictionBook
      ? predictionClaimPayoutUsdCents({
          sidePoolUsdCents:
            position.side === "yes"
              ? usdCentsFromNumber(predictionBook.yesPoolUsd)
              : usdCentsFromNumber(predictionBook.noPoolUsd),
          totalPoolUsdCents: usdCentsFromNumber(predictionBook.totalPoolUsd),
          payoutFeeBps: predictionBook.payoutFeeBps,
          netStakeUsdCents,
        })
      : usdCentsFromNumber(position.estimatedPayoutUsd);
  const estimatedProfitUsdCents =
    position.status === "lost"
      ? -grossWagerUsdCents
      : estimatedPayoutUsdCents - grossWagerUsdCents;
  const sideLabel =
    position.side === "yes"
      ? predictionBook?.yesLabel ?? item.yesLabel ?? position.yesLabel
      : predictionBook?.noLabel ?? item.noLabel ?? position.noLabel;
  const returnMultiple =
    position.netStakeUsd > 0
      ? roundTo(usdNumberFromCents(estimatedPayoutUsdCents) / Math.max(position.netStakeUsd, 0.000001), 3)
      : 0;

  return {
    id: position.id,
    marketItemId: position.marketItemId,
    side: position.side,
    sideLabel,
    status: position.status,
    grossWagerUsd: position.grossWagerUsd,
    grossWagerUsdLabel: formatUsdLabelFromCents(grossWagerUsdCents),
    grossWagerPhi: position.grossWagerPhi,
    grossWagerPhiLabel: formatPhiLabelFromMicro(bigintLike(Math.round(position.grossWagerPhi * 1_000_000))),
    netStakeUsd: position.netStakeUsd,
    netStakeUsdLabel: formatUsdLabelFromCents(netStakeUsdCents),
    entryFeeUsd: position.entryFeeUsd,
    entryFeeUsdLabel: formatUsdLabelFromCents(usdCentsFromNumber(position.entryFeeUsd)),
    estimatedPayoutUsd: usdNumberFromCents(estimatedPayoutUsdCents),
    estimatedPayoutUsdLabel: formatUsdLabelFromCents(estimatedPayoutUsdCents),
    estimatedProfitUsd: Number(estimatedProfitUsdCents) / 100,
    estimatedProfitUsdLabel: formatUsdLabelFromCents(estimatedProfitUsdCents),
    returnMultiple,
    claimedPayoutUsd: position.claimedPayoutUsd,
    claimedPayoutUsdLabel: formatUsdLabelFromCents(usdCentsFromNumber(position.claimedPayoutUsd)),
    claimedPayoutPhi: position.claimedPayoutPhi,
    claimedPayoutPhiLabel: formatPhiLabelFromMicro(bigintLike(Math.round(position.claimedPayoutPhi * 1_000_000))),
    openedAt: position.openedAt,
    lastWagerAt: position.lastWagerAt,
    exportedAt: position.exportedAt,
    claimedAt: position.claimedAt,
  };
}

function predictionKindLabel(status: MarketDeskPredictionBookView["status"] | null | undefined): string {
  if (status === "resolving") return "Prediction market / resolving";
  if (status === "resolved_yes" || status === "resolved_no" || status === "cancelled") return "Prediction market / settled";
  return "Prediction market / live";
}

function itemWithPredictionData(
  item: MarketDeskItem,
  predictionBookSource: MarketDeskPredictionBookSource | null | undefined,
  predictionPositionSource: MarketDeskPredictionPositionSource | null | undefined,
): MarketDeskItem {
  const predictionBook = predictionBookSource ? predictionBookViewForSource(predictionBookSource) : null;
  const nextItem: MarketDeskItem = {
    ...item,
    state: predictionBook ? "live" : item.state,
    kindLabel: predictionKindLabel(predictionBook?.status),
    updatedAt: predictionBookSource?.updatedAt ?? item.updatedAt,
    volumeUsd: predictionBook?.totalPoolUsd ?? item.volumeUsd,
    liquidityUsd: predictionBook?.totalPoolUsd ?? item.liquidityUsd,
    holders: predictionBook?.totalPositionCount ?? item.holders,
    yesPrice: predictionBook ? roundTo(predictionBook.yesProbability, 2) : item.yesPrice,
    noPrice: predictionBook ? roundTo(predictionBook.noProbability, 2) : item.noPrice,
    yesLabel: predictionBook?.yesLabel ?? item.yesLabel,
    noLabel: predictionBook?.noLabel ?? item.noLabel,
    resolutionLabel: predictionBook?.resolutionLabel ?? item.resolutionLabel,
    pills: stripEmpty([
      ...item.pills,
      predictionBook?.status === "open"
        ? "Open book"
        : predictionBook?.status === "resolving"
          ? "Resolving"
          : predictionBook?.status
            ? "Settled"
            : null,
    ]),
    predictionBook,
    predictionPosition: null,
    predictionContract: predictionBook?.predictionContract ?? item.predictionContract,
  };

  if (!predictionPositionSource) return nextItem;
  return {
    ...nextItem,
    predictionPosition: predictionPositionViewForItem(nextItem, predictionPositionSource, predictionBook),
  };
}

export function marketDeskQuoteUsdPerPhiAtPulse(pulse: number, fallbackUsdPerPhi = DEFAULT_USD_PER_PHI): number {
  const safePulse = Math.max(0, Math.trunc(pulse));
  try {
    const quote = quotePhiForUsd(
      {
        meta: MARKET_QUOTE_META,
        nowPulse: safePulse,
        usd: MARKET_QUOTE_SAMPLE_USD,
        currentStreakDays: 0,
        lifetimeUsdSoFar: 0,
        plannedHoldBeats: 0,
      },
      DEFAULT_ISSUANCE_POLICY,
    );
    return asPositiveNumber(quote.usdPerPhi, asPositiveNumber(fallbackUsdPerPhi, DEFAULT_USD_PER_PHI));
  } catch {
    return asPositiveNumber(fallbackUsdPerPhi, DEFAULT_USD_PER_PHI);
  }
}

function repriceUnderlyingMarketMetricsAtPulse(item: MarketDeskItem, pulse: number, quoteUsdPerPhi: number): MarketDeskItem {
  const safePulse = Math.max(0, Math.trunc(pulse));
  const liveQuoteUsdPerPhi = asPositiveNumber(quoteUsdPerPhi, item.quoteUsdPerPhi || DEFAULT_USD_PER_PHI);
  const pricingSourceKey = item.pricingSourceKey ?? item.id;

  let itemQuoteUsdPerPhi = liveQuoteUsdPerPhi;
  let livePricePhi = Math.max(0.000001, roundTo(item.pricePhi, 6));
  let liveIntrinsicPhi = Math.max(0.000001, roundTo(item.intrinsicPhi || item.pricePhi, 6));

  if (item.livePulseSeed?.kind === "sigil") {
    const meta = valuationMetaFromPulseSeed(item.livePulseSeed);
    const valuationPulse = Math.max(item.livePulseSeed.claimPulse, safePulse);
    const { unsigned } = computeIntrinsicUnsigned(meta, valuationPulse);
    livePricePhi = Math.max(0.000001, roundTo(asPositiveNumber(unsigned.valuePhi, item.pricePhi), 6));
    liveIntrinsicPhi = livePricePhi;
    try {
      const quote = quotePhiForUsd(
        {
          meta,
          nowPulse: valuationPulse,
          usd: MARKET_QUOTE_SAMPLE_USD,
          currentStreakDays: 0,
          lifetimeUsdSoFar: 0,
          plannedHoldBeats: 0,
        },
        DEFAULT_ISSUANCE_POLICY,
      );
      itemQuoteUsdPerPhi = asPositiveNumber(quote.usdPerPhi, liveQuoteUsdPerPhi);
    } catch {
      itemQuoteUsdPerPhi = liveQuoteUsdPerPhi;
    }
  } else {
    const basePricePhi = Math.max(0.000001, item.pricePhi || item.priceUsd / Math.max(item.quoteUsdPerPhi, DEFAULT_USD_PER_PHI));
    const baseIntrinsicPhi = Math.max(0.000001, item.intrinsicPhi || basePricePhi * 0.97);
    const moveAmplitude =
      item.source === "assetseal"
        ? clamp(0.008 + Math.abs(item.changePct) / 420, 0.008, 0.028)
        : clamp(0.0045 + Math.abs(item.changePct) / 620, 0.0045, 0.018);
    livePricePhi = Math.max(0.000001, roundTo(basePricePhi * (1 + pulseWave(pricingSourceKey, safePulse) * moveAmplitude), 6));
    liveIntrinsicPhi = Math.max(
      0.000001,
      roundTo(baseIntrinsicPhi * (1 + pulseWave(`${pricingSourceKey}:pv`, safePulse) * moveAmplitude * 0.55), 6),
    );
  }

  const livePriceUsd = roundTo(livePricePhi * itemQuoteUsdPerPhi, 2);
  const liveChartUsd = livePricePhi * itemQuoteUsdPerPhi;
  const liveChangePct = roundTo(
    item.changePct + ((livePricePhi / Math.max(item.pricePhi || 0.000001, 0.000001) - 1) * 100),
    2,
  );
  const referenceMidUsdCents = normalizeUsdPriceCents(livePriceUsd);
  const existingShareQuote = marketShareQuoteFromView(item.shareQuote);
  const nextShareQuote =
    existingShareQuote && referenceMidUsdCents > 0n
      ? {
          ...marketShareQuoteToView(
            buildMarketShareQuoteSnapshot({
              referenceMidUsdCents,
              targetBudgetUsdCents: existingShareQuote.pressure.targetBudgetUsdCents,
              livePositionOpenInterestUsdCents: existingShareQuote.pressure.livePositionOpenInterestUsdCents,
              certificateOpenInterestUsdCents: existingShareQuote.pressure.certificateOpenInterestUsdCents,
              recentBuyNotionalUsdCents: existingShareQuote.pressure.recentBuyNotionalUsdCents,
              recentSellNotionalUsdCents: existingShareQuote.pressure.recentSellNotionalUsdCents,
              changePctBps: Math.round(Math.abs(liveChangePct) * 100),
            }),
          ),
          backedSellLiquidityUsdCents: item.shareQuote?.backedSellLiquidityUsdCents ?? "0",
        }
      : item.shareQuote ?? null;

  return withPositionLiveValues({
    ...item,
    quoteUsdPerPhi: itemQuoteUsdPerPhi,
    priceUsd: livePriceUsd,
    pricePhi: livePricePhi,
    intrinsicPhi: liveIntrinsicPhi,
    changePct: liveChangePct,
    premiumX: roundTo(livePricePhi / Math.max(liveIntrinsicPhi, 0.000001), 3),
    chart: buildChart(pricingSourceKey, liveChartUsd, itemQuoteUsdPerPhi, liveChangePct, { anchorPulse: safePulse }),
    shareQuote: nextShareQuote,
  });
}

export function repriceMarketDeskItemAtPulse(item: MarketDeskItem, pulse: number, quoteUsdPerPhi: number): MarketDeskItem {
  const safePulse = Math.max(0, Math.trunc(pulse));
  const liveQuoteUsdPerPhi = asPositiveNumber(quoteUsdPerPhi, item.quoteUsdPerPhi || DEFAULT_USD_PER_PHI);
  const repricedItem = repriceUnderlyingMarketMetricsAtPulse(item, safePulse, liveQuoteUsdPerPhi);

  if (item.marketType !== "prediction") {
    return repricedItem;
  }

  if (item.predictionBook) {
    const locallySettling =
      item.predictionBook.status === "open" &&
      predictionContractExpired({
        expiryPulse: item.predictionBook.predictionContract?.expiryPulse ?? item.predictionContract?.expiryPulse ?? null,
        expiryAt: item.predictionBook.closeAt ?? item.predictionContract?.expiryAt ?? null,
        pulse: safePulse,
      });
    const predictionBook = locallySettling
      ? {
          ...item.predictionBook,
          status: "resolving" as const,
        }
      : item.predictionBook;
    return {
      ...repricedItem,
      kindLabel: predictionKindLabel(predictionBook.status),
      pills: stripEmpty([
        ...item.pills.filter((pill) => pill !== "Open book" && pill !== "Resolving" && pill !== "Settled"),
        predictionBook.status === "open"
          ? "Open book"
          : predictionBook.status === "resolving"
            ? "Resolving"
            : "Settled",
      ]),
      predictionBook,
      yesPrice: roundTo(clamp(predictionBook.yesProbability, 0.03, 0.97), 2),
      noPrice: roundTo(clamp(predictionBook.noProbability, 0.03, 0.97), 2),
    };
  }

  const baseYesPrice = clamp(item.yesPrice ?? 0.5, 0.03, 0.97);
  const moveAmplitude = clamp(0.008 + Math.abs(repricedItem.changePct) / 550, 0.008, 0.032);
  const pricingSourceKey = item.pricingSourceKey ?? item.id;
  const liveYesPrice = roundTo(clamp(baseYesPrice + pulseWave(`${pricingSourceKey}:binary`, safePulse) * moveAmplitude, 0.03, 0.97), 2);
  const liveNoPrice = roundTo(clamp(1 - liveYesPrice, 0.03, 0.97), 2);

  return {
    ...repricedItem,
    yesPrice: liveYesPrice,
    noPrice: liveNoPrice,
  };
}

export function publicOriginalMetricEnvelope(args: {
  id: string;
  valueUsd: number;
  valuePhi: number;
  usdPerPhi: number;
  hasPbiSignature: boolean;
}) {
  const rng = seeded(hashString(`${args.id}:public-profile`));
  const safeValueUsd = Math.max(0.12, roundTo(args.valueUsd || 0.12, 2));
  const safeValuePhi = Math.max(0.000001, roundTo(args.valuePhi || safeValueUsd / asPositiveNumber(args.usdPerPhi, DEFAULT_USD_PER_PHI), 6));
  const signedBoost = args.hasPbiSignature ? 1.2 : 0;
  const changePct = roundTo(-3.4 + rng() * 10.8 + signedBoost, 2);
  const volumeUsd = roundTo(Math.max(90 + rng() * 2800, safeValueUsd * (0.8 + rng() * 3.2)), 2);
  const liquidityUsd = roundTo(Math.max(60 + rng() * 1800, safeValueUsd * (0.55 + rng() * 2.15)), 2);
  const holders = Math.max(1, Math.round(1 + rng() * 3 + signedBoost));
  return {
    priceUsd: safeValueUsd,
    pricePhi: safeValuePhi,
    intrinsicPhi: safeValuePhi,
    changePct,
    volumeUsd,
    liquidityUsd,
    holders,
    premiumX: roundTo(1 + changePct / 100, 3),
    momentX: roundTo(0.96 + rng() * 0.18, 3),
  };
}

function ventureMarketItemBase(args: {
  id: string;
  title: string;
  summary: string;
  districtId: string | null;
  districtTitle: string | null;
  ownerLabel: string | null;
  updatedAt: string;
  visibility: "public" | "private";
  ownership: "owned" | "watch";
  usdPerPhi: number;
  meta: MarketDeskSummaryMeta | null;
}): MarketDeskItem {
  const marketType = args.meta?.type === "prediction" ? "prediction" : "asset";
  const envelope = metricEnvelope(args.id, args.usdPerPhi, marketType === "prediction" ? "prediction" : "asset");
  const predictionOdds = marketType === "prediction" ? buildPredictionOdds(args.id) : null;
  const predictionContract =
    marketType === "prediction"
      ? buildPredictionBinaryContractView({
          underlyingAssetId: args.meta?.assetId ?? null,
          underlyingAssetTitle: args.meta?.assetTitle ?? null,
          expiryAt: args.meta?.expiryAt ?? null,
          redeemableAt: args.meta?.redeemableAt ?? null,
          referencePriceUsdMicros: null,
          referenceSource: "unknown",
        })
      : null;

  return {
    id: args.id,
    marketType,
    state: marketType === "prediction" ? "launch-ready" : "live",
    source: "venture",
    ownership: args.ownership,
    title: args.title.trim(),
    summary: args.summary.trim(),
    kindLabel: marketType === "prediction" ? "Prediction lane" : "Live market listing",
    districtId: args.districtId,
    districtTitle: args.districtTitle,
    ownerLabel: args.ownerLabel,
    updatedAt: args.updatedAt,
    quoteUsdPerPhi: asPositiveNumber(args.usdPerPhi, DEFAULT_USD_PER_PHI),
    priceUsd: marketType === "prediction" ? predictionOdds?.yesPrice ?? envelope.priceUsd : envelope.priceUsd,
    pricePhi:
      marketType === "prediction"
        ? roundTo((predictionOdds?.yesPrice ?? envelope.priceUsd) / asPositiveNumber(args.usdPerPhi, DEFAULT_USD_PER_PHI), 6)
        : envelope.pricePhi,
    intrinsicPhi: envelope.intrinsicPhi,
    changePct: envelope.changePct,
    volumeUsd: envelope.volumeUsd,
    liquidityUsd: envelope.liquidityUsd,
    holders: envelope.holders,
    premiumX: envelope.premiumX,
    momentX: envelope.momentX,
    chart: buildChart(
      args.id,
      marketType === "prediction" ? predictionOdds?.yesPrice ?? envelope.priceUsd : envelope.priceUsd,
      args.usdPerPhi,
      envelope.changePct,
      {},
    ),
    yesPrice: predictionOdds?.yesPrice ?? null,
    noPrice: predictionOdds?.noPrice ?? null,
    yesLabel: marketType === "prediction" ? args.meta?.yesLabel ?? "Higher" : null,
    noLabel: marketType === "prediction" ? args.meta?.noLabel ?? "Lower" : null,
    resolutionLabel: marketType === "prediction" ? args.meta?.resolution ?? "Resolve through owner-governed settlement." : null,
    assetId: args.meta?.assetId ?? null,
    verifyHref: null,
    externalHref: "/world",
    visibility: args.visibility,
    pills: stripEmpty([
      args.districtTitle,
      args.ownerLabel,
      args.visibility === "private" ? "Private lane" : "Public lane",
      marketType === "prediction" ? args.meta?.assetTitle ?? "Binary asset contract" : "Spot asset market",
      marketType === "prediction" && args.meta?.expiryAt ? "Timed expiry" : null,
    ]),
    livePulseSeed: null,
    position: null,
    creatorReserve: null,
    predictionBook: null,
    predictionPosition: null,
    predictionContract,
    proofManifestRows: null,
    assetMetrics: null,
  };
}

export function marketDeskItemFromOwnedVenture(args: {
  venture: WorldVentureView;
  districts: readonly DistrictLike[];
  quoteUsdPerPhi: number;
}): MarketDeskItem {
  const districtMap = toDistrictMap(args.districts);
  const district = districtMap.get(args.venture.districtId) ?? districtMap.get(args.venture.districtSlug);
  const parsed = parseMarketSummary(args.venture.summary);
  return ventureMarketItemBase({
    id: args.venture.id,
    title: args.venture.title,
    summary: parsed.displaySummary || args.venture.summary,
    districtId: args.venture.districtId,
    districtTitle: district?.title ?? args.venture.districtSlug,
    ownerLabel: args.venture.ownerDisplayName,
    updatedAt: coerceIso(args.venture.updatedAt, args.venture.createdAt),
    visibility: args.venture.visibility,
    ownership: "owned",
    usdPerPhi: args.quoteUsdPerPhi,
    meta: parsed.meta,
  });
}

export function marketDeskItemFromPublicOriginal(args: {
  original: MarketDeskPublicOriginalAsset;
  viewerUserId: string | null;
}): MarketDeskItem {
  const envelope = publicOriginalMetricEnvelope({
    id: args.original.id,
    valueUsd: args.original.valueUsd,
    valuePhi: args.original.valuePhi,
    usdPerPhi: args.original.usdPerPhi,
    hasPbiSignature: args.original.hasPbiSignature,
  });
  const ownership = args.viewerUserId && args.original.ownerUserId === args.viewerUserId ? "owned" : "watch";
  const holderCount = Math.max(0, Math.trunc(args.original.assetMetrics?.holderCount ?? 0));
  const creatorLabel =
    args.original.creatorUsername && args.original.creatorUsername !== args.original.ownerUsername
      ? `Creator @${args.original.creatorUsername}`
      : null;

  return {
    id: args.original.id,
    marketType: "asset",
    state: "live",
    source: "profile",
    ownership,
    title: args.original.title,
    summary: args.original.summary,
    kindLabel: "Public receiz market",
    districtId: null,
    districtTitle: "Network market",
    ownerLabel: `@${args.original.ownerUsername}`,
    updatedAt: args.original.updatedAt,
    quoteUsdPerPhi: asPositiveNumber(args.original.usdPerPhi, DEFAULT_USD_PER_PHI),
    priceUsd: envelope.priceUsd,
    pricePhi: envelope.pricePhi,
    intrinsicPhi: envelope.intrinsicPhi,
    changePct: envelope.changePct,
    volumeUsd: envelope.volumeUsd,
    liquidityUsd: envelope.liquidityUsd,
    holders: holderCount,
    premiumX: envelope.premiumX,
    momentX: envelope.momentX,
    chart: buildChart(args.original.id, envelope.priceUsd, args.original.usdPerPhi, envelope.changePct, {
      anchorPulse: admittedWholeKaiPulse(args.original.pulse),
    }),
    yesPrice: null,
    noPrice: null,
    yesLabel: null,
    noLabel: null,
    resolutionLabel: null,
    assetId: args.original.receizId,
    verifyHref: args.original.verifyHref,
    verifyPath: args.original.verifyPath,
    sourceTs: args.original.sourceTs,
    externalHref: args.original.canonicalHref,
    canonicalHref: args.original.canonicalHref,
    originalHref: args.original.originalHref,
    visibility: "public",
    profileUsername: args.original.ownerUsername,
    profileDisplayName: args.original.ownerDisplayName,
    playbackSrc: args.original.playbackSrc ?? null,
    playbackCoverSrc: args.original.playbackCoverSrc ?? null,
    mediaSrc: args.original.mediaSrc,
    mediaMime: args.original.mediaMime,
    mediaName: args.original.mediaName,
    mediaSize: args.original.mediaSize,
    artworkSrc: args.original.artworkSrc,
    audioArtist: args.original.audioArtist,
    pills: stripEmpty([
      "Public profile",
      `@${args.original.ownerUsername}`,
      args.original.mediaKind === "pdf" ? "Document" : args.original.mediaKind === "epub" ? "Book" : args.original.mediaKind,
      args.original.hasPbiSignature ? "Signed artifact" : "Unsigned artifact",
      creatorLabel,
    ]),
    mediaKind: args.original.mediaKind,
    livePulseSeed: args.original.livePulseSeed,
    position: null,
    creatorReserve: null,
    predictionBook: null,
    predictionPosition: null,
    predictionContract: null,
    proofManifestRows: args.original.proofManifestRows,
    assetMetrics: args.original.assetMetrics,
  };
}

export function marketDeskItemFromInventoryAsset(args: {
  asset: MarketDeskInventoryAsset;
  quoteUsdPerPhi: number;
}): MarketDeskItem {
  const envelope = metricEnvelope(args.asset.id, args.quoteUsdPerPhi, "inventory");
  const title = args.asset.title.trim() || `Asset ${args.asset.assetId}`;
  return {
    id: `assetseal:${args.asset.id}`,
    marketType: "asset",
    state: "launch-ready",
    source: "assetseal",
    ownership: "owned",
    title,
    summary: `${args.asset.assetType} inventory with append-only custody continuity and direct verification.`,
    kindLabel: "Sealed asset inventory",
    districtId: null,
    districtTitle: "Exchange Market",
    ownerLabel: "Your custody lane",
    updatedAt: args.asset.createdAt,
    quoteUsdPerPhi: asPositiveNumber(args.quoteUsdPerPhi, DEFAULT_USD_PER_PHI),
    priceUsd: envelope.priceUsd,
    pricePhi: envelope.pricePhi,
    intrinsicPhi: envelope.intrinsicPhi,
    changePct: envelope.changePct,
    volumeUsd: envelope.volumeUsd,
    liquidityUsd: envelope.liquidityUsd,
    holders: envelope.holders,
    premiumX: envelope.premiumX,
    momentX: envelope.momentX,
    chart: buildChart(args.asset.id, envelope.priceUsd, args.quoteUsdPerPhi, envelope.changePct),
    yesPrice: null,
    noPrice: null,
    yesLabel: null,
    noLabel: null,
    resolutionLabel: null,
    assetId: args.asset.assetId,
    verifyHref: args.asset.verifyUrl,
    externalHref: args.asset.artifactUrl ?? args.asset.verifyUrl,
    visibility: "private",
    pills: stripEmpty([
      args.asset.assetType,
      args.asset.issuerRole,
      args.asset.status,
      "Listable asset",
    ]),
    livePulseSeed: null,
    position: null,
    creatorReserve: null,
    predictionBook: null,
    predictionPosition: null,
    predictionContract: null,
    proofManifestRows: null,
    assetMetrics: null,
  };
}

export function marketDeskItemFromSharePosition(position: MarketDeskSharePositionSource): MarketDeskItem {
  const priceUsd = Math.max(0.01, roundTo(position.lastPriceUsd || position.costBasisUsd || 0.01, 2));
  const quoteUsdPerPhi = asPositiveNumber(position.quoteUsdPerPhi, DEFAULT_USD_PER_PHI);
  const pricePhi = roundTo(priceUsd / quoteUsdPerPhi, 6);
  return itemWithPosition(
    {
      id: position.marketItemId,
      marketType: position.marketType,
      state: "live",
      source: position.marketSource,
      ownership: "owned",
      title: position.title,
      summary: position.summary,
      kindLabel: position.marketType === "prediction" ? "Positioned prediction lane" : "Held market position",
      districtId: null,
      districtTitle: "Wallet holdings",
      ownerLabel: "Your share position",
      updatedAt: position.lastTradeAt ?? position.openedAt,
      quoteUsdPerPhi,
      priceUsd,
      pricePhi,
      intrinsicPhi: pricePhi,
      changePct: 0,
      volumeUsd: Math.max(priceUsd * 9, position.costBasisUsd),
      liquidityUsd: Math.max(priceUsd * 6, position.costBasisUsd * 0.6),
      holders: 1,
      premiumX: 1,
      momentX: 1,
      chart: buildChart(position.marketItemId, priceUsd, quoteUsdPerPhi, 0),
      yesPrice: position.marketType === "prediction" ? roundTo(Math.min(0.97, Math.max(0.03, priceUsd)), 2) : null,
      noPrice: position.marketType === "prediction" ? roundTo(Math.max(0.03, 1 - priceUsd), 2) : null,
      yesLabel: position.marketType === "prediction" ? "Higher" : null,
      noLabel: position.marketType === "prediction" ? "Lower" : null,
      resolutionLabel: null,
      assetId: position.assetId,
      verifyHref: position.verifyHref,
      externalHref: position.externalHref,
      visibility: position.visibility,
      pills: stripEmpty(["Wallet holding", position.marketSource === "profile" ? "Public receiz" : "Live market"]),
      livePulseSeed: null,
      position: null,
      creatorReserve: null,
      predictionBook: null,
      predictionPosition: null,
      predictionContract: null,
      proofManifestRows: null,
      assetMetrics: null,
    },
    position,
  );
}

function marketDeskItemFromPredictionPosition(
  position: MarketDeskPredictionPositionSource,
  quoteUsdPerPhi: number,
  predictionBookSource: MarketDeskPredictionBookSource | null | undefined,
  underlyingAsset: MarketDeskItem | null = null,
): MarketDeskItem {
  const contract = predictionBookSource?.predictionContract ?? null;
  const fallbackPriceUsd = roundTo(
    underlyingAsset?.priceUsd ??
      contract?.referencePriceUsd ??
      (position.side === "yes" ? 0.55 : 0.45),
    2,
  );
  const fallbackQuoteUsdPerPhi = asPositiveNumber(underlyingAsset?.quoteUsdPerPhi ?? quoteUsdPerPhi, DEFAULT_USD_PER_PHI);
  const fallbackPricePhi = underlyingAsset?.pricePhi ?? roundTo(fallbackPriceUsd / fallbackQuoteUsdPerPhi, 6);
  const fallbackIntrinsicPhi = underlyingAsset?.intrinsicPhi ?? fallbackPricePhi;
  const fallbackChangePct = underlyingAsset?.changePct ?? 0;
  return itemWithPredictionData(
    {
      id: position.marketItemId,
      pricingSourceKey: underlyingAsset?.pricingSourceKey ?? underlyingAsset?.id ?? null,
      marketType: "prediction",
      state: predictionBookSource ? "live" : "launch-ready",
      source: position.marketSource,
      ownership: "owned",
      title: position.title,
      summary: position.summary,
      kindLabel: predictionKindLabel(predictionBookSource ? predictionBookViewForSource(predictionBookSource).status : null),
      districtId: null,
      districtTitle: "Wallet positions",
      ownerLabel: "Your prediction position",
      updatedAt: position.lastWagerAt ?? position.openedAt,
      quoteUsdPerPhi: fallbackQuoteUsdPerPhi,
      priceUsd: fallbackPriceUsd,
      pricePhi: fallbackPricePhi,
      intrinsicPhi: fallbackIntrinsicPhi,
      changePct: fallbackChangePct,
      volumeUsd: Math.max(position.grossWagerUsd, position.estimatedPayoutUsd),
      liquidityUsd: Math.max(position.netStakeUsd, position.estimatedPayoutUsd),
      holders: 1,
      premiumX: underlyingAsset?.premiumX ?? 1,
      momentX: underlyingAsset?.momentX ?? 1,
      chart:
        underlyingAsset?.chart != null
          ? cloneChart(underlyingAsset.chart)
          : buildChart(position.marketItemId, fallbackPriceUsd, fallbackQuoteUsdPerPhi, fallbackChangePct),
      yesPrice: position.side === "yes" ? 0.55 : 0.45,
      noPrice: position.side === "no" ? 0.55 : 0.45,
      yesLabel: position.yesLabel,
      noLabel: position.noLabel,
      resolutionLabel: position.resolutionLabel,
      assetId: contract?.underlyingAssetId ?? underlyingAsset?.assetId ?? null,
      verifyHref: underlyingAsset?.verifyHref ?? null,
      externalHref: underlyingAsset?.externalHref ?? "/market",
      canonicalHref: underlyingAsset?.canonicalHref ?? null,
      originalHref: underlyingAsset?.originalHref ?? null,
      visibility: position.visibility,
      mediaKind: underlyingAsset?.mediaKind ?? null,
      profileUsername: underlyingAsset?.profileUsername ?? null,
      profileDisplayName: underlyingAsset?.profileDisplayName ?? null,
      playbackSrc: underlyingAsset?.playbackSrc ?? null,
      playbackCoverSrc: underlyingAsset?.playbackCoverSrc ?? null,
      mediaSrc: underlyingAsset?.mediaSrc ?? null,
      mediaMime: underlyingAsset?.mediaMime ?? null,
      mediaName: underlyingAsset?.mediaName ?? null,
      mediaSize: underlyingAsset?.mediaSize ?? null,
      artworkSrc: underlyingAsset?.artworkSrc ?? null,
      audioArtist: underlyingAsset?.audioArtist ?? null,
      pills: stripEmpty([
        "Wallet position",
        "Prediction market",
        contract?.underlyingAssetTitle ?? underlyingAsset?.title,
      ]),
      livePulseSeed: underlyingAsset?.livePulseSeed ?? null,
      position: null,
      creatorReserve: null,
      predictionBook: null,
      predictionPosition: null,
      predictionContract: contract,
      proofManifestRows: underlyingAsset?.proofManifestRows ?? null,
      assetMetrics: underlyingAsset?.assetMetrics ?? null,
    },
    predictionBookSource,
    position,
  );
}

export function marketDeskItemFromPredictionBook(args: {
  marketItemId: string;
  predictionBookSource: MarketDeskPredictionBookSource;
  predictionPositionSource?: MarketDeskPredictionPositionSource | null;
  quoteUsdPerPhi: number;
  underlyingAsset?: MarketDeskItem | null;
}): MarketDeskItem {
  const book = args.predictionBookSource;
  const underlyingAsset = args.underlyingAsset ?? null;
  const contract = book.predictionContract ?? null;
  const fallbackQuoteUsdPerPhi = asPositiveNumber(underlyingAsset?.quoteUsdPerPhi ?? args.quoteUsdPerPhi, DEFAULT_USD_PER_PHI);
  const fallbackPriceUsd = roundTo(
    underlyingAsset?.priceUsd ??
      contract?.referencePriceUsd ??
      (book.yesPoolUsd + book.noPoolUsd > 0 ? (book.yesPoolUsd + book.noPoolUsd) / Math.max(book.totalPositionCount, 1) : 0.5),
    2,
  );
  const fallbackPricePhi = underlyingAsset?.pricePhi ?? roundTo(fallbackPriceUsd / fallbackQuoteUsdPerPhi, 6);
  const fallbackIntrinsicPhi = underlyingAsset?.intrinsicPhi ?? fallbackPricePhi;
  const fallbackChangePct = underlyingAsset?.changePct ?? 0;
  const totalPoolUsd = book.yesPoolUsd + book.noPoolUsd;

  return itemWithPredictionData(
    {
      id: args.marketItemId,
      pricingSourceKey: underlyingAsset?.pricingSourceKey ?? underlyingAsset?.id ?? null,
      marketType: "prediction",
      state: "live",
      source: book.marketSource,
      ownership: args.predictionPositionSource ? "owned" : underlyingAsset?.ownership ?? "watch",
      title: book.title,
      summary: book.summary,
      kindLabel: predictionKindLabel(book.status),
      districtId: underlyingAsset?.districtId ?? null,
      districtTitle: underlyingAsset?.districtTitle ?? "Prediction desk",
      ownerLabel: args.predictionPositionSource ? "Your prediction position" : underlyingAsset?.ownerLabel ?? "Receiz market desk",
      updatedAt: book.updatedAt,
      quoteUsdPerPhi: fallbackQuoteUsdPerPhi,
      priceUsd: fallbackPriceUsd,
      pricePhi: fallbackPricePhi,
      intrinsicPhi: fallbackIntrinsicPhi,
      changePct: fallbackChangePct,
      volumeUsd: Math.max(totalPoolUsd, fallbackPriceUsd),
      liquidityUsd: Math.max(totalPoolUsd, fallbackPriceUsd),
      holders: Math.max(book.totalPositionCount, args.predictionPositionSource ? 1 : 0),
      premiumX: underlyingAsset?.premiumX ?? 1,
      momentX: underlyingAsset?.momentX ?? 1,
      chart:
        underlyingAsset?.chart != null
          ? cloneChart(underlyingAsset.chart)
          : buildChart(args.marketItemId, fallbackPriceUsd, fallbackQuoteUsdPerPhi, fallbackChangePct),
      yesPrice: null,
      noPrice: null,
      yesLabel: book.yesLabel,
      noLabel: book.noLabel,
      resolutionLabel: book.resolutionLabel,
      assetId: contract?.underlyingAssetId ?? underlyingAsset?.assetId ?? null,
      verifyHref: underlyingAsset?.verifyHref ?? null,
      verifyPath: underlyingAsset?.verifyPath ?? null,
      sourceTs: underlyingAsset?.sourceTs ?? null,
      externalHref: underlyingAsset?.externalHref ?? "/market",
      canonicalHref: underlyingAsset?.canonicalHref ?? null,
      originalHref: underlyingAsset?.originalHref ?? null,
      visibility: book.visibility,
      mediaKind: underlyingAsset?.mediaKind ?? null,
      profileUsername: underlyingAsset?.profileUsername ?? null,
      profileDisplayName: underlyingAsset?.profileDisplayName ?? null,
      playbackSrc: underlyingAsset?.playbackSrc ?? null,
      playbackCoverSrc: underlyingAsset?.playbackCoverSrc ?? null,
      mediaSrc: underlyingAsset?.mediaSrc ?? null,
      mediaMime: underlyingAsset?.mediaMime ?? null,
      mediaName: underlyingAsset?.mediaName ?? null,
      mediaSize: underlyingAsset?.mediaSize ?? null,
      artworkSrc: underlyingAsset?.artworkSrc ?? null,
      audioArtist: underlyingAsset?.audioArtist ?? null,
      pills: stripEmpty([
        "Prediction market",
        contract?.underlyingAssetTitle ?? underlyingAsset?.title,
        book.status === "open" ? "Open book" : "Settling book",
      ]),
      livePulseSeed: underlyingAsset?.livePulseSeed ?? null,
      position: null,
      creatorReserve: null,
      predictionBook: null,
      predictionPosition: null,
      predictionContract: contract,
      proofManifestRows: underlyingAsset?.proofManifestRows ?? null,
      assetMetrics: underlyingAsset?.assetMetrics ?? null,
    },
    book,
    args.predictionPositionSource ?? null,
  );
}

function syntheticPredictionYesPriceFromAsset(item: MarketDeskItem, window: MarketPredictionWindowDefinition): number {
  const seededBias = (seeded(hashString(`${item.id}:${window.key}:binary`))() - 0.5) * 0.06;
  const momentumBias = clamp(item.changePct / 220, -0.16, 0.16);
  const premiumBias = clamp((item.premiumX - 1) * 0.08, -0.06, 0.06);
  const windowBias = window.key === "1h" ? momentumBias * 0.7 : window.key === "72h" ? momentumBias * 1.1 : momentumBias;
  return roundTo(clamp(0.5 + windowBias + premiumBias + seededBias, 0.12, 0.88), 2);
}

function buildCanonicalAssetPredictionMarkets(args: {
  liveMarkets: readonly MarketDeskItem[];
  quoteUsdPerPhi: number;
  predictionBookMap: Map<string, MarketDeskPredictionBookSource>;
  predictionPositionMap: Map<string, MarketDeskPredictionPositionSource>;
  now?: Date;
}): MarketDeskItem[] {
  const eligibleAssets = args.liveMarkets.filter(
    (item) => item.marketType === "asset" && item.source !== "starter" && Boolean(canonicalAssetPredictionKey(item)),
  );

  return eligibleAssets.flatMap((asset) => {
    const assetKey = canonicalAssetPredictionKey(asset);
    if (!assetKey) return [];

    return MARKET_PREDICTION_WINDOWS.map((window) => {
      const expiryMs = marketPredictionExpiryMs({ now: args.now, durationMs: window.durationMs });
      const expiryAt = new Date(expiryMs).toISOString();
      const redeemableAt = expiryAt;
      const id = buildCanonicalAssetPredictionItemId(assetKey, window.key, expiryMs);
      const yesPrice = syntheticPredictionYesPriceFromAsset(asset, window);
      const noPrice = roundTo(clamp(1 - yesPrice, 0.12, 0.88), 2);
      const referencePriceUsdMicros = usdPriceMicrosFromNumber(asset.priceUsd);
      const item: MarketDeskItem = {
        id,
        pricingSourceKey: asset.pricingSourceKey ?? asset.id,
        marketType: "prediction",
        state: "launch-ready",
        source: asset.source,
        ownership: asset.ownership,
        title: asset.title,
        summary: `Higher or lower by ${window.titleLabel}. The desk locks the live reference mark on entry and settles automatically at expiry.`,
        kindLabel: "Binary asset market",
        districtId: asset.districtId,
        districtTitle: asset.districtTitle ?? "Prediction desk",
        ownerLabel: asset.ownerLabel ?? "Receiz market desk",
        updatedAt: asset.updatedAt,
        quoteUsdPerPhi: asset.quoteUsdPerPhi,
        priceUsd: asset.priceUsd,
        pricePhi: asset.pricePhi,
        intrinsicPhi: asset.intrinsicPhi,
        changePct: asset.changePct,
        volumeUsd: Math.max(asset.volumeUsd * 0.24, 120),
        liquidityUsd: Math.max(asset.liquidityUsd * 0.22, 120),
        holders: asset.holders,
        premiumX: asset.premiumX,
        momentX: asset.momentX,
        chart: cloneChart(asset.chart),
        yesPrice,
        noPrice,
        yesLabel: "Higher",
        noLabel: "Lower",
        resolutionLabel: `Automatic settlement at ${window.shortLabel} expiry against the locked ${asset.title} reference mark.`,
        assetId: asset.assetId ?? asset.id,
        verifyHref: asset.verifyHref,
        externalHref: asset.externalHref ?? asset.verifyHref ?? "/market",
        canonicalHref: asset.canonicalHref ?? null,
        originalHref: asset.originalHref ?? null,
        visibility: asset.visibility,
        mediaKind: asset.mediaKind ?? null,
        profileUsername: asset.profileUsername ?? null,
        profileDisplayName: asset.profileDisplayName ?? null,
        playbackSrc: asset.playbackSrc ?? null,
        playbackCoverSrc: asset.playbackCoverSrc ?? null,
        mediaSrc: asset.mediaSrc ?? null,
        mediaMime: asset.mediaMime ?? null,
        mediaName: asset.mediaName ?? null,
        mediaSize: asset.mediaSize ?? null,
        artworkSrc: asset.artworkSrc ?? null,
        audioArtist: asset.audioArtist ?? null,
        pills: stripEmpty([window.shortLabel, "Higher / Lower", "Auto-settle", asset.kindLabel]),
        livePulseSeed: asset.livePulseSeed,
        position: null,
        creatorReserve: null,
        predictionBook: null,
        predictionPosition: null,
        predictionContract: buildPredictionBinaryContractView({
          underlyingAssetId: asset.assetId ?? asset.id,
          underlyingAssetTitle: asset.title,
          expiryAt,
          redeemableAt,
          referencePriceUsdMicros,
          referenceSource: "spot_price",
          referencePulse: asset.livePulseSeed?.claimPulse ?? null,
        }),
        proofManifestRows: asset.proofManifestRows,
        assetMetrics: asset.assetMetrics,
      };

      return itemWithPredictionData(
        item,
        args.predictionBookMap.get(id),
        args.predictionPositionMap.get(id),
      );
    });
  });
}

export function buildCanonicalAssetPredictionMarketItem(args: {
  underlyingAsset: MarketDeskItem;
  marketItemId: string;
  predictionBookSource?: MarketDeskPredictionBookSource | null;
  predictionPositionSource?: MarketDeskPredictionPositionSource | null;
  now?: Date;
}): MarketDeskItem | null {
  const assetKey = canonicalAssetPredictionKey(args.underlyingAsset);
  if (!assetKey) return null;

  const parsed = parseCanonicalAssetPredictionItemId(args.marketItemId);
  const window =
    (parsed ? marketPredictionWindowByKey(parsed.windowKey) : null) ??
    marketPredictionWindowByKey(DEFAULT_MARKET_PREDICTION_WINDOW_KEY);
  if (!window) return null;

  const fallbackExpiryMs = marketPredictionExpiryMs({ now: args.now, durationMs: window.durationMs });
  const book = args.predictionBookSource ?? null;
  const contract = book?.predictionContract ?? null;
  const bookExpiryMs = (() => {
    const raw = book?.closeAt ?? contract?.expiryAt ?? null;
    if (!raw) return null;
    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) && parsedMs > 0 ? parsedMs : null;
  })();
  const nowMs = (args.now ?? new Date()).getTime();
  const parsedExpiryMs = parsed?.expiryMs ?? null;
  const staleSyntheticParsedExpiry =
    parsedExpiryMs != null &&
    Number.isFinite(nowMs) &&
    parsedExpiryMs <= nowMs &&
    !book &&
    !args.predictionPositionSource;
  const expiryMs = staleSyntheticParsedExpiry ? fallbackExpiryMs : parsedExpiryMs ?? bookExpiryMs ?? fallbackExpiryMs;
  const expiryAt = new Date(expiryMs).toISOString();
  const redeemableAt = book?.resolveByAt ?? contract?.redeemableAt ?? expiryAt;
  const yesPrice = syntheticPredictionYesPriceFromAsset(args.underlyingAsset, window);
  const noPrice = roundTo(clamp(1 - yesPrice, 0.12, 0.88), 2);
  const referencePriceUsdMicros = usdPriceMicrosFromNumber(args.underlyingAsset.priceUsd);

  const item: MarketDeskItem = {
    id: args.marketItemId,
    pricingSourceKey: args.underlyingAsset.pricingSourceKey ?? args.underlyingAsset.id,
    marketType: "prediction",
    state: "launch-ready",
    source: args.underlyingAsset.source,
    ownership: args.underlyingAsset.ownership,
    title: args.underlyingAsset.title,
    summary: `Higher or lower by ${window.titleLabel}. The desk locks the live reference mark on entry and settles automatically at expiry.`,
    kindLabel: "Binary asset market",
    districtId: args.underlyingAsset.districtId,
    districtTitle: args.underlyingAsset.districtTitle ?? "Prediction desk",
    ownerLabel: args.underlyingAsset.ownerLabel ?? "Receiz market desk",
    updatedAt: args.underlyingAsset.updatedAt,
    quoteUsdPerPhi: args.underlyingAsset.quoteUsdPerPhi,
    priceUsd: args.underlyingAsset.priceUsd,
    pricePhi: args.underlyingAsset.pricePhi,
    intrinsicPhi: args.underlyingAsset.intrinsicPhi,
    changePct: args.underlyingAsset.changePct,
    volumeUsd: Math.max(args.underlyingAsset.volumeUsd * 0.24, 120),
    liquidityUsd: Math.max(args.underlyingAsset.liquidityUsd * 0.22, 120),
    holders: args.underlyingAsset.holders,
    premiumX: args.underlyingAsset.premiumX,
    momentX: args.underlyingAsset.momentX,
    chart: cloneChart(args.underlyingAsset.chart),
    yesPrice,
    noPrice,
    yesLabel: "Higher",
    noLabel: "Lower",
    resolutionLabel: `Automatic settlement at ${window.shortLabel} expiry against the locked ${args.underlyingAsset.title} reference mark.`,
    assetId: args.underlyingAsset.assetId ?? args.underlyingAsset.id,
    verifyHref: args.underlyingAsset.verifyHref,
    externalHref: args.underlyingAsset.externalHref ?? args.underlyingAsset.verifyHref ?? "/market",
    canonicalHref: args.underlyingAsset.canonicalHref ?? null,
    originalHref: args.underlyingAsset.originalHref ?? null,
    visibility: args.underlyingAsset.visibility,
    mediaKind: args.underlyingAsset.mediaKind ?? null,
    profileUsername: args.underlyingAsset.profileUsername ?? null,
    profileDisplayName: args.underlyingAsset.profileDisplayName ?? null,
    playbackSrc: args.underlyingAsset.playbackSrc ?? null,
    playbackCoverSrc: args.underlyingAsset.playbackCoverSrc ?? null,
    mediaSrc: args.underlyingAsset.mediaSrc ?? null,
    mediaMime: args.underlyingAsset.mediaMime ?? null,
    mediaName: args.underlyingAsset.mediaName ?? null,
    mediaSize: args.underlyingAsset.mediaSize ?? null,
    artworkSrc: args.underlyingAsset.artworkSrc ?? null,
    audioArtist: args.underlyingAsset.audioArtist ?? null,
    pills: stripEmpty([window.shortLabel, "Higher / Lower", "Auto-settle", args.underlyingAsset.kindLabel]),
    livePulseSeed: args.underlyingAsset.livePulseSeed,
    position: null,
    creatorReserve: null,
    predictionBook: null,
    predictionPosition: null,
    predictionContract: buildPredictionBinaryContractView({
      underlyingAssetId: args.underlyingAsset.assetId ?? args.underlyingAsset.id,
      underlyingAssetTitle: args.underlyingAsset.title,
      expiryAt,
      redeemableAt,
      referencePriceUsdMicros,
      referenceSource: "spot_price",
      referencePulse: args.underlyingAsset.livePulseSeed?.claimPulse ?? null,
    }),
    proofManifestRows: args.underlyingAsset.proofManifestRows,
    assetMetrics: args.underlyingAsset.assetMetrics,
  };

  return itemWithPredictionData(item, book, args.predictionPositionSource ?? null);
}

function dedupeById(items: readonly MarketDeskItem[]): MarketDeskItem[] {
  const map = new Map<string, MarketDeskItem>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

function sortLiveMarkets(items: readonly MarketDeskItem[]): MarketDeskItem[] {
  return [...items].sort((left, right) => {
    if (Boolean(left.position) !== Boolean(right.position)) return left.position ? -1 : 1;
    if (left.ownership !== right.ownership) return left.ownership === "owned" ? -1 : 1;
    if (left.state !== right.state) return left.state === "live" ? -1 : 1;
    return right.volumeUsd - left.volumeUsd;
  });
}

function sortOwnedItems(items: readonly MarketDeskItem[]): MarketDeskItem[] {
  const sourceOrder: Record<MarketDeskItem["source"], number> = {
    assetseal: 0,
    profile: 1,
    venture: 2,
    starter: 3,
  };
  return [...items].sort((left, right) => {
    if (Boolean(left.position) !== Boolean(right.position)) return left.position ? -1 : 1;
    if (left.source !== right.source) return sourceOrder[left.source] - sourceOrder[right.source];
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

function sortPredictionMarkets(items: readonly MarketDeskItem[]): MarketDeskItem[] {
  return [...items].sort((left, right) => {
    if (Boolean(left.predictionPosition) !== Boolean(right.predictionPosition)) {
      return left.predictionPosition ? -1 : 1;
    }
    if (Boolean(left.predictionBook) !== Boolean(right.predictionBook)) {
      return left.predictionBook ? -1 : 1;
    }

    const leftCanonical = parseCanonicalAssetPredictionItemId(left.id);
    const rightCanonical = parseCanonicalAssetPredictionItemId(right.id);
    if (Boolean(leftCanonical) !== Boolean(rightCanonical)) {
      return leftCanonical ? -1 : 1;
    }

    if (leftCanonical && rightCanonical) {
      const titleCompare = left.title.localeCompare(right.title);
      if (titleCompare !== 0) return titleCompare;

      const windowCompare = predictionWindowRank(leftCanonical.windowKey) - predictionWindowRank(rightCanonical.windowKey);
      if (windowCompare !== 0) return windowCompare;

      return leftCanonical.expiryMs - rightCanonical.expiryMs;
    }

    return right.liquidityUsd - left.liquidityUsd;
  });
}

export function buildMarketComposeDraft(args: {
  defaultDistrictId: string | null;
  marketType: "asset" | "prediction";
  item?: MarketDeskItem | null;
}): MarketDeskComposeDraft {
  const defaultExpiryAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const defaultRedeemableAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
  if (args.marketType === "prediction") {
    return {
      marketType: "prediction",
      title: args.item?.title ?? "Will this asset settle higher by expiry?",
      summary: args.item?.summary ?? "Binary asset market with deterministic higher or lower settlement at a locked expiry.",
      districtId: args.item?.districtId ?? args.defaultDistrictId,
      visibility: "public",
      assetId: args.item?.assetId ?? "",
      assetTitle: args.item?.predictionContract?.underlyingAssetTitle ?? "",
      yesLabel: args.item?.yesLabel ?? "Higher",
      noLabel: args.item?.noLabel ?? "Lower",
      resolution:
        args.item?.resolutionLabel ?? "Resolve against the locked reference mark at expiry and release redemption at the selected settlement time.",
      expiryAt: args.item?.predictionContract?.expiryAt ?? defaultExpiryAt,
      redeemableAt: args.item?.predictionContract?.redeemableAt ?? defaultRedeemableAt,
    };
  }

  return {
    marketType: "asset",
    title: args.item?.title ?? "New live asset listing",
    summary: args.item?.summary ?? "Wallet-settled asset lane with live charting and one-tap actions.",
    districtId: args.item?.districtId ?? args.defaultDistrictId,
    visibility: args.item?.source === "assetseal" ? "private" : "public",
    assetId: args.item?.assetId ?? "",
    assetTitle: "",
    yesLabel: "Yes",
    noLabel: "No",
    resolution: "",
    expiryAt: "",
    redeemableAt: "",
  };
}

export function buildMarketDeskSnapshot(args: BuildMarketDeskSnapshotArgs): MarketDeskSnapshot {
  return buildMarketDeskSnapshotCore({
    generatedAt: args.generatedAt,
    signedIn: args.signedIn,
    viewerUserId: args.viewerUserId,
    quoteUsdPerPhi: args.quoteUsdPerPhi,
    wallet: args.wallet,
    username: args.world.profile?.username ?? null,
    districts: args.world.districts.map((district) => ({
      id: district.id,
      slug: district.slug,
      title: district.title,
      purpose: district.purpose,
      publicAccess: district.publicAccess,
      economicMode: district.economicMode,
      themeHue: district.themeHue,
    })),
    publicOriginals: args.publicOriginals,
    sharePositions: args.sharePositions,
    creatorReserves: args.creatorReserves ?? [],
    predictionBooks: args.predictionBooks,
    predictionPositions: args.predictionPositions,
  });
}

type BuildMarketDeskSnapshotCoreArgs = {
  generatedAt: string;
  signedIn: boolean;
  viewerUserId: string | null;
  quoteUsdPerPhi: number;
  wallet: MarketDeskWalletSource | null;
  username: string | null;
  districts: MarketDeskDistrict[];
  publicOriginals: MarketDeskPublicOriginalAsset[];
  sharePositions: MarketDeskSharePositionSource[];
  creatorReserves: MarketDeskCreatorReserveSource[];
  predictionBooks: MarketDeskPredictionBookSource[];
  predictionPositions: MarketDeskPredictionPositionSource[];
};

function buildMarketDeskSnapshotCore(args: BuildMarketDeskSnapshotCoreArgs): MarketDeskSnapshot {
  const quoteUsdPerPhi = asPositiveNumber(
    args.wallet?.usdPerPhi ?? args.quoteUsdPerPhi,
    DEFAULT_USD_PER_PHI,
  );
  const publicOriginalItems = args.publicOriginals.map((original) =>
    marketDeskItemFromPublicOriginal({
      original,
      viewerUserId: args.viewerUserId,
    }),
  );
  const profileSharePositions = args.sharePositions.filter((position) => position.marketSource === "profile");
  const profileCreatorReserves = args.creatorReserves.filter((reserve) => reserve.marketSource === "profile");
  const profilePredictionBooks = args.predictionBooks.filter((book) => book.marketSource === "profile");
  const profilePredictionPositions = args.predictionPositions.filter((position) => position.marketSource === "profile");
  const sharePositionMap = new Map(profileSharePositions.map((position) => [position.marketItemId, position]));
  const creatorReserveMap = new Map(profileCreatorReserves.map((reserve) => [reserve.marketItemId, reserve]));
  const predictionBookMap = new Map(profilePredictionBooks.map((book) => [book.marketItemId, book]));
  const predictionPositionMap = new Map(profilePredictionPositions.map((position) => [position.marketItemId, position]));

  const liveMarkets = dedupeById(publicOriginalItems).map((item) =>
    itemWithPosition(itemWithCreatorReserve(item, creatorReserveMap.get(item.id)), sharePositionMap.get(item.id)),
  );
  const assetLookup = new Map<string, MarketDeskItem>();
  for (const item of liveMarkets) {
    if (item.marketType !== "asset") continue;
    assetLookup.set(item.id, item);
    if (item.assetId) assetLookup.set(item.assetId, item);
  }

  let predictionMarkets = buildCanonicalAssetPredictionMarkets({
    liveMarkets,
    quoteUsdPerPhi,
    predictionBookMap,
    predictionPositionMap,
    now: new Date(args.generatedAt),
  });
  let ownedItems = dedupeById(publicOriginalItems.filter((item) => item.ownership === "owned")).map((item) =>
    item.marketType === "prediction"
      ? itemWithPredictionData(item, predictionBookMap.get(item.id), predictionPositionMap.get(item.id))
      : itemWithPosition(itemWithCreatorReserve(item, creatorReserveMap.get(item.id)), sharePositionMap.get(item.id)),
  );

  const ownedItemIds = new Set(ownedItems.map((item) => item.id));
  const positionFallbackItems = profileSharePositions
    .filter((position) => !ownedItemIds.has(position.marketItemId))
    .map((position) => marketDeskItemFromSharePosition(position));
  const predictionFallbackItems = profilePredictionPositions
    .filter((position) => !ownedItemIds.has(position.marketItemId))
    .map((position) => {
      const book = predictionBookMap.get(position.marketItemId);
      const canonical = parseCanonicalAssetPredictionItemId(position.marketItemId);
      const underlyingKey = book?.predictionContract?.underlyingAssetId ?? canonical?.assetKey ?? null;
      return marketDeskItemFromPredictionPosition(
        position,
        quoteUsdPerPhi,
        book,
        underlyingKey ? assetLookup.get(underlyingKey) ?? null : null,
      );
    });
  const positionedLiveItems = liveMarkets.filter((item) => Boolean(item.position) && !ownedItemIds.has(item.id));
  ownedItems = dedupeById([...positionFallbackItems, ...predictionFallbackItems, ...positionedLiveItems, ...ownedItems]);
  predictionMarkets = dedupeById([...predictionMarkets]);

  return {
    generatedAt: args.generatedAt,
    signedIn: args.signedIn,
    viewerUserId: args.viewerUserId,
    canViewPhi: args.wallet?.canViewPhi ?? false,
    username: args.username,
    quoteUsdPerPhi,
    wallet: args.wallet
      ? {
          canViewPhi: args.wallet.canViewPhi,
          settlementProjectionSource: args.wallet.settlementProjectionSource,
          balanceUsd: args.wallet.balanceUsd,
          balancePhi: args.wallet.balancePhi,
          balanceUsdLabel: args.wallet.balanceUsdLabel,
          balancePhiLabel: args.wallet.balancePhiLabel,
          valueStates: args.wallet.valueStates,
          usdPerPhi: args.wallet.usdPerPhi,
          transferCount: args.wallet.transferCount,
          noteCount: args.wallet.noteCount,
          sharePositionCount: args.wallet.sharePositionCount,
          predictionPositionCount: args.wallet.predictionPositionCount,
          totalPositionCount: args.wallet.totalPositionCount,
          lastEntryAt: args.wallet.lastEntryAt,
        }
      : null,
    districts: args.districts,
    liveMarkets: sortLiveMarkets(liveMarkets),
    ownedItems: sortOwnedItems(ownedItems),
    predictionMarkets: sortPredictionMarkets(predictionMarkets),
  };
}

function applyShareQuoteViewsToSnapshot(
  snapshot: MarketDeskSnapshot,
  shareQuoteViews?: Record<string, MarketShareQuoteView | null> | null,
): MarketDeskSnapshot {
  if (!shareQuoteViews) return snapshot;
  const applyQuote = (item: MarketDeskItem) => ({
    ...item,
    shareQuote: shareQuoteViews[item.id] ?? item.shareQuote ?? null,
  });
  return {
    ...snapshot,
    liveMarkets: snapshot.liveMarkets.map(applyQuote),
    ownedItems: snapshot.ownedItems.map(applyQuote),
    predictionMarkets: snapshot.predictionMarkets.map(applyQuote),
    predictionHistory: snapshot.predictionHistory?.map(applyQuote) ?? [],
  };
}

export function buildMarketDeskSnapshotFromTransport(
  transport: MarketDeskSnapshotTransport,
): MarketDeskSnapshot {
  const baseSnapshot = buildMarketDeskSnapshotCore({
    generatedAt: transport.generatedAt,
    signedIn: transport.signedIn,
    viewerUserId: transport.viewerUserId,
    quoteUsdPerPhi: transport.quoteUsdPerPhi,
    wallet: transport.wallet,
    username: transport.username,
    districts: transport.districts,
    publicOriginals: transport.publicOriginals,
    sharePositions: transport.sharePositions,
    creatorReserves: transport.creatorReserves ?? [],
    predictionBooks: transport.predictionBooks,
    predictionPositions: transport.predictionPositions,
  });
  const predictionHistory =
    (transport.settledPredictionPositions?.length ?? 0) > 0
      ? buildMarketDeskSnapshotCore({
          generatedAt: transport.generatedAt,
          signedIn: transport.signedIn,
          viewerUserId: transport.viewerUserId,
          quoteUsdPerPhi: transport.quoteUsdPerPhi,
          wallet: transport.wallet,
          username: transport.username,
          districts: transport.districts,
          publicOriginals: transport.publicOriginals,
          sharePositions: [],
          creatorReserves: [],
          predictionBooks: transport.predictionBooks,
          predictionPositions: transport.settledPredictionPositions ?? [],
        }).ownedItems.filter((item) => item.predictionPosition)
      : [];

  return applyShareQuoteViewsToSnapshot(
    {
      ...baseSnapshot,
      publicMembership: transport.publicMembership,
      privateGraphProjection: transport.privateGraphProjection,
      predictionHistory,
      shareTradeHistory: transport.shareTradeHistory ?? [],
    },
    transport.shareQuoteViews,
  );
}
