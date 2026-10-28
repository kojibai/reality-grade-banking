import type { ChartPoint } from "@/app/components/valuation/series";
import type { ProfileOriginal } from "@/app/lib/profile/types";

export type MarketDeskMarketType = "asset" | "prediction";
export type MarketDeskItemState = "live" | "launch-ready";
export type MarketDeskItemSource = "venture" | "assetseal" | "profile" | "starter";
export type MarketDeskOwnership = "owned" | "watch";
export type MarketDeskMediaKind = "image" | "video" | "audio" | "pdf" | "epub" | "file" | "moment";

export type MarketDeskSummaryMeta = {
  type: MarketDeskMarketType;
  assetId?: string | null;
  assetTitle?: string | null;
  yesLabel?: string | null;
  noLabel?: string | null;
  resolution?: string | null;
  expiryAt?: string | null;
  redeemableAt?: string | null;
};

export type MarketDeskDistrict = {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  publicAccess: "open" | "gated" | "private";
  economicMode: "social" | "commerce" | "venture" | "governance";
  themeHue: string | null;
};

export type MarketDeskWalletView = {
  canViewPhi: boolean;
  settlementProjectionSource?: "profile_plus_ledger_v1" | "account_only";
  balanceUsd: number;
  balancePhi: number;
  balanceUsdLabel: string;
  balancePhiLabel: string;
  valueStates?: MarketDeskWalletValueStates;
  usdPerPhi: number;
  transferCount: number;
  noteCount: number;
  sharePositionCount: number;
  predictionPositionCount: number;
  totalPositionCount: number;
  lastEntryAt: string | null;
};

export type MarketDeskWalletSource = {
  canViewPhi: boolean;
  settlementProjectionSource?: "profile_plus_ledger_v1" | "account_only";
  balanceUsd: number;
  balancePhi: number;
  balanceUsdLabel: string;
  balancePhiLabel: string;
  valueStates?: MarketDeskWalletValueStates;
  usdPerPhi: number;
  transferCount: number;
  noteCount: number;
  sharePositionCount: number;
  predictionPositionCount: number;
  totalPositionCount: number;
  lastEntryAt: string | null;
};

export type MarketDeskWalletValueStates = {
  settledBalanceUsd: number;
  settledBalanceUsdLabel: string;
  ecosystemBalanceUsd: number;
  ecosystemBalanceUsdLabel: string;
  livePortfolioValueUsd: number | null;
  livePortfolioValueUsdLabel: string | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlUsdLabel: string | null;
  withdrawableNowUsd: number | null;
  withdrawableNowUsdLabel: string | null;
};

export type MarketDeskInventoryAsset = {
  id: string;
  title: string;
  assetId: string;
  assetType: "art" | "diamond" | "collectible" | "luxury";
  issuerRole: "collector" | "gallery" | "vault" | "insurer" | "appraiser";
  status: "DEMO" | "UNSIGNED" | "SIGNED";
  createdAt: string;
  verifyUrl: string;
  artifactUrl: string | null;
};

export type MarketDeskPulseValueSeed = {
  /** Exact original sigil frequency; absent on older carried seeds. */
  frequencyHz?: number;
  kind: "sigil";
  claimPulse: number;
  beat: number;
  stepIndex: number;
  chakraDay: string | null;
  creatorVerified: boolean;
  kaiSignature: string | null;
  userPhiKey: string | null;
};

export type MarketDeskSharePositionSource = {
  id: string;
  marketItemId: string;
  marketType: MarketDeskMarketType;
  marketSource: MarketDeskItemSource;
  title: string;
  summary: string;
  assetId: string | null;
  verifyHref: string | null;
  externalHref: string | null;
  visibility: "public" | "private";
  shareQuantityMicro: string;
  shareQuantity: number;
  costBasisUsd: number;
  costBasisPhi: number;
  lastPriceUsd: number;
  quoteUsdPerPhi: number;
  openedAt: string;
  lastTradeAt: string | null;
  closedAt: string | null;
};

export type MarketDeskPositionView = {
  id: string;
  shareQuantityMicro: string;
  shareQuantity: number;
  shareQuantityLabel: string;
  costBasisUsd: number;
  costBasisUsdLabel: string;
  costBasisPhi: number;
  costBasisPhiLabel: string;
  marketValueUsd: number;
  marketValueUsdLabel: string;
  unrealizedPnlUsd: number;
  unrealizedPnlUsdLabel: string;
  unrealizedPnlPct: number;
  openedAt: string;
  lastTradeAt: string | null;
};

export type MarketDeskCreatorReserveSource = {
  id: string;
  marketItemId: string;
  marketType: MarketDeskMarketType;
  marketSource: MarketDeskItemSource;
  authorizedShareQuantityMicro: string;
  lockedShareQuantityMicro: string;
  issuedShareQuantityMicro: string;
  availableShareQuantityMicro: string;
  lastPriceUsd: number;
  quoteUsdPerPhi: number;
  updatedAt: string;
};

export type MarketDeskCreatorReserveView = {
  id: string | null;
  mintSource: "creator_reserve";
  authorizedShareQuantityMicro: string;
  authorizedShareQuantityLabel: string;
  lockedShareQuantityMicro: string;
  lockedShareQuantityLabel: string;
  issuedShareQuantityMicro: string;
  issuedShareQuantityLabel: string;
  availableShareQuantityMicro: string;
  availableShareQuantityLabel: string;
  availableValueUsd: number;
  availableValueUsdLabel: string;
};

export type MarketDeskPredictionOutcome = "yes" | "no" | "cancel";
export type MarketDeskPredictionBookStatus = "open" | "resolving" | "resolved_yes" | "resolved_no" | "cancelled";
export type MarketDeskPredictionPositionStatus = "active" | "claimable" | "claimed" | "lost" | "cancelled" | "exported";

export type MarketDeskPredictionContractView = {
  modelVersion: string;
  contractType: "binary_asset";
  underlyingAssetId: string | null;
  underlyingAssetTitle: string | null;
  expiryAt: string | null;
  redeemableAt: string | null;
  referencePriceUsd: number | null;
  referencePriceUsdLabel: string | null;
  referencePriceUsdMicros?: string | null;
  referencePriceUsdCents?: string | null;
  referencePulse: number | null;
  expiryPulse: number | null;
  redeemablePulse: number | null;
  referenceSource: "quote_mid" | "spot_price" | "unknown";
  feePressureBps: number;
  imbalancePressureBps: number;
  timePressureBps: number;
};

export type MarketDeskPredictionBookSource = {
  marketItemId: string;
  creatorUserId: string | null;
  marketSource: MarketDeskItemSource;
  title: string;
  summary: string;
  yesLabel: string;
  noLabel: string;
  resolutionLabel: string;
  visibility: "public" | "private";
  status: MarketDeskPredictionBookStatus;
  closeAt: string;
  resolveByAt: string;
  entryFeeBps: number;
  payoutFeeBps: number;
  smoothingUsd: number;
  yesPoolUsd: number;
  noPoolUsd: number;
  totalEntryFeesUsd: number;
  totalWagerCount: number;
  totalPositionCount: number;
  resolutionQuorum: number;
  resolutionMajorityBps: number;
  finalYesVotes: number;
  finalNoVotes: number;
  finalCancelVotes: number;
  resolvedOutcome: MarketDeskPredictionOutcome | null;
  resolvedQuoteUsdPerPhi: number | null;
  finalizedAt: string | null;
  predictionContract: MarketDeskPredictionContractView | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketDeskPredictionBookView = {
  marketItemId: string;
  creatorUserId: string | null;
  status: MarketDeskPredictionBookStatus;
  closeAt: string;
  resolveByAt: string;
  finalizedAt: string | null;
  yesLabel: string;
  noLabel: string;
  resolutionLabel: string;
  yesPoolUsd: number;
  yesPoolUsdLabel: string;
  noPoolUsd: number;
  noPoolUsdLabel: string;
  totalPoolUsd: number;
  totalPoolUsdLabel: string;
  yesProbability: number;
  noProbability: number;
  yesReturnMultiple: number;
  noReturnMultiple: number;
  entryFeeBps: number;
  payoutFeeBps: number;
  smoothingUsd: number;
  totalWagerCount: number;
  totalPositionCount: number;
  resolutionQuorum: number;
  resolutionMajorityBps: number;
  finalYesVotes: number;
  finalNoVotes: number;
  finalCancelVotes: number;
  resolvedOutcome: MarketDeskPredictionOutcome | null;
  predictionContract: MarketDeskPredictionContractView | null;
};

export type MarketDeskPredictionPositionSource = {
  id: string;
  marketItemId: string;
  marketSource: MarketDeskItemSource;
  title: string;
  summary: string;
  yesLabel: string;
  noLabel: string;
  resolutionLabel: string;
  side: Exclude<MarketDeskPredictionOutcome, "cancel">;
  visibility: "public" | "private";
  status: MarketDeskPredictionPositionStatus;
  grossWagerUsd: number;
  grossWagerPhi: number;
  netStakeUsd: number;
  entryFeeUsd: number;
  estimatedPayoutUsd: number;
  lastQuoteUsdPerPhi: number;
  openedAt: string;
  lastWagerAt: string | null;
  exportedAt: string | null;
  claimedAt: string | null;
  claimedPayoutUsd: number;
  claimedPayoutPhi: number;
};

export type MarketDeskPredictionPositionView = {
  id: string;
  marketItemId: string;
  side: Exclude<MarketDeskPredictionOutcome, "cancel">;
  sideLabel: string;
  status: MarketDeskPredictionPositionStatus;
  grossWagerUsd: number;
  grossWagerUsdLabel: string;
  grossWagerPhi: number;
  grossWagerPhiLabel: string;
  netStakeUsd: number;
  netStakeUsdLabel: string;
  entryFeeUsd: number;
  entryFeeUsdLabel: string;
  estimatedPayoutUsd: number;
  estimatedPayoutUsdLabel: string;
  estimatedProfitUsd: number;
  estimatedProfitUsdLabel: string;
  returnMultiple: number;
  claimedPayoutUsd: number;
  claimedPayoutUsdLabel: string;
  claimedPayoutPhi: number;
  claimedPayoutPhiLabel: string;
  openedAt: string;
  lastWagerAt: string | null;
  exportedAt: string | null;
  claimedAt: string | null;
};

export type MarketDeskProofManifestRow = {
  key?: string;
  label: string;
  value: string;
  valueLines?: readonly string[];
  href?: string;
  downloadName?: string;
};

export type MarketDeskAssetEngagementView = {
  witnessedSeconds: number;
  witnessedBreaths: number;
  retentionRate: number;
  openEvents: number;
  downloadEvents: number;
  streamPlayEvents: number;
  streamCompleteEvents: number;
  imageWitnessEvents: number;
  imageCompletionUnits: number;
  updatedAt: string | null;
  holderCount: number;
  latestHolderPurchaseAt: string | null;
};

export type MarketShareQuotePressureView = {
  modelVersion: string;
  targetBudgetUsdCents: string;
  softCapUsdCents: string;
  hardCapUsdCents: string;
  livePositionOpenInterestUsdCents: string;
  certificateOpenInterestUsdCents: string;
  openInterestUsdCents: string;
  recentBuyNotionalUsdCents: string;
  recentSellNotionalUsdCents: string;
  recentGrossNotionalUsdCents: string;
  recentNetNotionalUsdCents: string;
  inventoryPressureBps: number;
  flowPressureBps: number;
  volatilityPressureBps: number;
  pressureBps: number;
};

export type MarketShareQuoteView = {
  modelVersion: string;
  referenceMidUsdCents: string;
  quoteMidUsdCents: string;
  bidPriceUsdCents: string;
  askPriceUsdCents: string;
  backedSellLiquidityUsdCents: string;
  spreadBps: number;
  shiftBps: number;
  allowBuys: boolean;
  pressure: MarketShareQuotePressureView;
};

export type MarketDeskPublicOriginalAsset = {
  id: string;
  receizId: string;
  ownerUserId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl?: string | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  pulse: string | null;
  hasPbiSignature: boolean;
  mediaKind: MarketDeskMediaKind;
  canonicalHref: string;
  originalHref: string;
  verifyHref: string;
  verifyPath: string;
  sourceTs: string;
  playbackSrc?: string | null;
  playbackCoverSrc?: string | null;
  mediaSrc: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  mediaSize: number | null;
  artworkSrc: string | null;
  audioArtist: string | null;
  valueUsd: number;
  valuePhi: number;
  usdPerPhi: number;
  livePulseSeed: MarketDeskPulseValueSeed | null;
  proofManifestRows: MarketDeskProofManifestRow[] | null;
  assetMetrics: MarketDeskAssetEngagementView | null;
  profileOriginal?: ProfileOriginal | null;
};

export type MarketDeskPublicMembership = {
  version: 1;
  scope: "whole-market-visible-showcase";
  source: "shipped-archive" | "canonical-complete" | "partial";
  isComplete: boolean;
  generatedAt: string;
  itemCount: number;
  revision: string;
  economyShowcaseArtifactDigest?: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
};

export type MarketDeskShareTradeHistoryView = {
  id: string;
  marketItemId: string;
  marketSource: MarketDeskItemSource;
  title: string;
  summary: string;
  assetId: string | null;
  verifyHref: string | null;
  externalHref: string | null;
  visibility: "public" | "private";
  side: "buy" | "sell";
  sideLabel: string;
  shareQuantityMicro: string;
  shareQuantity: number;
  shareQuantityLabel: string;
  executionPriceUsd: number;
  executionPriceUsdLabel: string;
  notionalUsd: number;
  notionalUsdLabel: string;
  settlementUsd: number;
  settlementUsdLabel: string;
  settledUsdCents: string;
  settledUsdLabel: string;
  phiUsdCents: string;
  phiUsdLabel: string;
  fundingSource: "settled" | "sovereign" | "mixed";
  feeUsd: number;
  feeUsdLabel: string;
  realizedCostBasisUsd: number;
  realizedCostBasisUsdLabel: string;
  realizedPnlUsd: number | null;
  realizedPnlUsdLabel: string | null;
  quoteUsdPerPhi: number;
  executedAt: string;
};

export type MarketDeskItem = {
  nativeAsset?:ProfileOriginal["nativeAsset"];
  id: string;
  pricingSourceKey?: string | null;
  marketType: MarketDeskMarketType;
  state: MarketDeskItemState;
  source: MarketDeskItemSource;
  ownership: MarketDeskOwnership;
  title: string;
  summary: string;
  kindLabel: string;
  districtId: string | null;
  districtTitle: string | null;
  ownerLabel: string | null;
  updatedAt: string;
  quoteUsdPerPhi: number;
  priceUsd: number;
  pricePhi: number;
  intrinsicPhi: number;
  changePct: number;
  volumeUsd: number;
  liquidityUsd: number;
  holders: number;
  premiumX: number;
  momentX: number;
  chart: ChartPoint[];
  yesPrice: number | null;
  noPrice: number | null;
  yesLabel: string | null;
  noLabel: string | null;
  resolutionLabel: string | null;
  assetId: string | null;
  verifyHref: string | null;
  verifyPath?: string | null;
  sourceTs?: string | null;
  externalHref: string | null;
  canonicalHref?: string | null;
  originalHref?: string | null;
  visibility: "public" | "private";
  mediaKind?: MarketDeskMediaKind | null;
  profileUsername?: string | null;
  profileDisplayName?: string | null;
  playbackSrc?: string | null;
  playbackCoverSrc?: string | null;
  mediaSrc?: string | null;
  mediaMime?: string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  artworkSrc?: string | null;
  audioArtist?: string | null;
  pills: string[];
  livePulseSeed: MarketDeskPulseValueSeed | null;
  position: MarketDeskPositionView | null;
  creatorReserve?: MarketDeskCreatorReserveView | null;
  predictionBook: MarketDeskPredictionBookView | null;
  predictionPosition: MarketDeskPredictionPositionView | null;
  predictionContract: MarketDeskPredictionContractView | null;
  proofManifestRows: MarketDeskProofManifestRow[] | null;
  assetMetrics: MarketDeskAssetEngagementView | null;
  shareQuote?: MarketShareQuoteView | null;
};

export type MarketDeskSnapshot = {
  generatedAt: string;
  publicMembership?: MarketDeskPublicMembership;
  privateGraphProjection?: MarketDeskPrivateGraphProjection;
  signedIn: boolean;
  viewerUserId?: string | null;
  canViewPhi: boolean;
  username: string | null;
  quoteUsdPerPhi: number;
  wallet: MarketDeskWalletView | null;
  districts: MarketDeskDistrict[];
  liveMarkets: MarketDeskItem[];
  ownedItems: MarketDeskItem[];
  predictionMarkets: MarketDeskItem[];
  predictionHistory?: MarketDeskItem[];
  shareTradeHistory?: MarketDeskShareTradeHistoryView[];
};

export type MarketDeskPrivateGraphProjection = {
  schema: "receiz.market.private-graph-projection.v1";
  actorUserId: string;
  completeness: "complete" | "partial";
};

export type MarketDeskPublicProofRelease = {
  source: string;
  generatedAt: string;
  profileCount: number;
  itemCount: number;
  failures: number;
};

export type MarketDeskSnapshotTransport = {
  generatedAt: string;
  publicMembership?: MarketDeskPublicMembership;
  publicProofRelease?: MarketDeskPublicProofRelease;
  privateGraphProjection?: MarketDeskPrivateGraphProjection;
  signedIn: boolean;
  viewerUserId: string | null;
  username: string | null;
  quoteUsdPerPhi: number;
  wallet: MarketDeskWalletSource | null;
  districts: MarketDeskDistrict[];
  publicOriginals: MarketDeskPublicOriginalAsset[];
  sharePositions: MarketDeskSharePositionSource[];
  creatorReserves?: MarketDeskCreatorReserveSource[];
  predictionBooks: MarketDeskPredictionBookSource[];
  predictionPositions: MarketDeskPredictionPositionSource[];
  settledPredictionPositions?: MarketDeskPredictionPositionSource[];
  shareTradeHistory?: MarketDeskShareTradeHistoryView[];
  shareQuoteViews?: Record<string, MarketShareQuoteView | null>;
};

export type MarketDeskComposeDraft = {
  marketType: MarketDeskMarketType;
  title: string;
  summary: string;
  districtId: string | null;
  visibility: "public" | "private";
  assetId: string;
  assetTitle: string;
  yesLabel: string;
  noLabel: string;
  resolution: string;
  expiryAt: string;
  redeemableAt: string;
};
