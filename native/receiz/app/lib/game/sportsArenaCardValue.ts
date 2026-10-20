import { mergeSportsArenaPlayerBio, type SportsArenaCard, type SportsArenaCardTier, type SportsArenaPackDefinition } from "./sportsArena";
import {
  SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS,
  sportsArenaCurrentValuePackForSport,
  sportsArenaPackForId,
  sportsArenaPlayerSelectionEconomy,
  type SportsArenaCardClaim,
} from "./sportsArenaPacks";
import { sportsArenaUsdFromValueBasis } from "./sportsArenaValue";

type SportsArenaCardValueProjectionInput = {
  claim?: SportsArenaCardClaim | null;
  currentScore: number;
  displayCards?: SportsArenaCard[];
  fallbackCard?: SportsArenaCard | null;
  performanceMultiplier?: number;
};

export type SportsArenaCardValueProjection = {
  acquisitionBasis: SportsArenaCardAcquisitionValueBasis | null;
  birthUsdValue: number;
  card: SportsArenaCard;
  currentUsdValue: number;
  deterministicFloorIssueMultiplier: number;
  deterministicFloorUsdValue: number;
  performanceMultiplier: number;
  prePerformanceUsdValue: number;
};

export function sportsArenaCardPlayerKey(card: Pick<SportsArenaCard, "id" | "media">): string {
  const sourceId = card.media.sourceId.trim();
  return sourceId ? `mlb-person:${sourceId}` : `card:${card.id}`;
}

export function sportsArenaClaimPlayerKey(claim: Pick<SportsArenaCardClaim, "cardId" | "media">): string {
  const sourceId = claim.media.sourceId.trim();
  return sourceId ? `mlb-person:${sourceId}` : `card:${claim.cardId}`;
}

function sportsArenaClaimSealedCardId(claim: Pick<SportsArenaCardClaim, "baseCard">): string {
  return claim.baseCard.sealedCardId.trim();
}

function sportsArenaCardSealedCardId(card: Pick<SportsArenaCard, "baseCard">): string {
  return card.baseCard.sealedCardId.trim();
}

function sportsArenaUniqueValueCards(cards: SportsArenaCard[]): SportsArenaCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const sealedCardId = sportsArenaCardSealedCardId(card);
    const key = sealedCardId ? `sealed:${sealedCardId}` : `card:${card.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sportsArenaClaimMatchesExactCardIdentity(
  claim: Pick<SportsArenaCardClaim, "cardId" | "baseCard">,
  card: Pick<SportsArenaCard, "id" | "baseCard">,
): boolean {
  if (claim.cardId === card.id) return true;
  const claimSealedCardId = sportsArenaClaimSealedCardId(claim);
  const cardSealedCardId = sportsArenaCardSealedCardId(card);
  return Boolean(claimSealedCardId && cardSealedCardId && claimSealedCardId === cardSealedCardId);
}

export function sportsArenaClaimMatchesCard(claim: SportsArenaCardClaim, card: SportsArenaCard): boolean {
  if (sportsArenaClaimMatchesExactCardIdentity(claim, card)) return true;
  const claimSealedCardId = sportsArenaClaimSealedCardId(claim);
  const cardSealedCardId = sportsArenaCardSealedCardId(card);
  if (claimSealedCardId || cardSealedCardId) return false;
  return sportsArenaClaimPlayerKey(claim) === sportsArenaCardPlayerKey(card);
}

export function sportsArenaCardFromClaim(claim: SportsArenaCardClaim): SportsArenaCard {
  return {
    id: claim.cardId,
    athlete: claim.athlete,
    team: claim.teamCode,
    teamCode: claim.teamCode,
    opponentCode: "MLB",
    position: claim.position,
    side: claim.side,
    rating: claim.rating,
    tier: claim.baseTier,
    accent: "cyan",
    projectedScore: claim.projectedScore,
    currentScore: 0,
    statLine: claim.proof.statBasis[0] ?? `${claim.position} deterministic card`,
    liveLine: claim.proof.statBasis[1] ?? claim.proof.rule,
    tags: Array.from(new Set([
      claim.teamCode,
      claim.position,
      claim.side,
      claim.baseTier,
      claim.rarity,
      claim.economy?.playerScarcityTier ?? "",
      claim.rookie?.isRookie ? "rookie" : "",
      claim.rookie?.rookieClass ?? "",
    ].filter(Boolean))),
    rookie: claim.rookie ?? null,
    playerBio: claim.playerBio ?? null,
    media: { ...claim.media },
    baseCard: { ...claim.baseCard },
    historyCount: 0,
  };
}

function finiteCardRate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function registryCardHasSparseStats(card: SportsArenaCard): boolean {
  const statLine = card.statLine.trim().toLowerCase();
  return statLine === "0 hr, 0 rbi, ops 0.000" || statLine === "0.0 ip, 0 k, era 0.00";
}

export function sportsArenaOwnedCardCurrentRating(card: SportsArenaCard, claim: SportsArenaCardClaim): number {
  const baseRate = finiteCardRate(claim.rating) ?? finiteCardRate(card.rating) ?? 0;
  const currentRate = finiteCardRate(card.rating);
  if (currentRate === null) return baseRate;

  const registryDrop = Number((currentRate - baseRate).toFixed(2));
  if (registryCardHasSparseStats(card) && registryDrop < -8) return baseRate;
  return currentRate;
}

export function sportsArenaOwnedCardCurrentProjectedScore(card: SportsArenaCard, claim: SportsArenaCardClaim, currentRating: number): number {
  if (currentRating === card.rating) return finiteCardRate(card.projectedScore) ?? claim.projectedScore;
  return finiteCardRate(claim.projectedScore) ?? card.projectedScore;
}

export function sportsArenaCardVariantFromOwnedClaim(card: SportsArenaCard, claim: SportsArenaCardClaim): SportsArenaCard {
  const rating = sportsArenaOwnedCardCurrentRating(card, claim);
  const rejectedRegistryProjection = rating !== card.rating;
  const claimCard = rejectedRegistryProjection ? sportsArenaCardFromClaim(claim) : null;
  return {
    ...card,
    ...(claimCard ? {
      athlete: claimCard.athlete,
      team: claimCard.team,
      teamCode: claimCard.teamCode,
      opponentCode: claimCard.opponentCode,
      position: claimCard.position,
      side: claimCard.side,
      statLine: claimCard.statLine,
      liveLine: claimCard.liveLine,
      media: claimCard.media,
    } : {}),
    id: claim.cardId,
    tier: claim.rarity,
    rating,
    projectedScore: sportsArenaOwnedCardCurrentProjectedScore(card, claim, rating),
    baseCard: { ...claim.baseCard },
    rookie: claim.rookie ?? (rejectedRegistryProjection ? null : card.rookie ?? null),
    playerBio: mergeSportsArenaPlayerBio(card.playerBio, claim.playerBio),
    tags: Array.from(new Set([
      claim.rarity,
      claim.variantName,
      claim.rookie?.isRookie ? "rookie" : "",
      claim.rookie?.rookieClass ?? "",
      ...(claimCard ? claimCard.tags : card.tags),
    ].filter(Boolean))),
  };
}

export function sportsArenaCardForClaim(claim: SportsArenaCardClaim, displayCards: SportsArenaCard[]): SportsArenaCard {
  const baseCard = displayCards.find((card) => sportsArenaClaimMatchesExactCardIdentity(claim, card)) ??
    displayCards.find((card) => sportsArenaClaimMatchesCard(claim, card)) ??
    sportsArenaCardFromClaim(claim);
  return sportsArenaCardVariantFromOwnedClaim(baseCard, claim);
}

export function sportsArenaCardLiveValueSeed(claim: Pick<SportsArenaCardClaim, "sport" | "collectibleId" | "claimHash" | "baseCard">): string {
  return `${claim.sport}:${claim.collectibleId}:${claim.claimHash}:${claim.baseCard.sealedCardId}`;
}

function positiveUsd(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function sportsArenaCardLiveMarketUsdValue(input: {
  bestAskUsdValue?: number | null;
  bestBidUsdValue?: number | null;
  fallbackUsdValue: number;
  lastSaleUsdValue?: number | null;
  listingUsdValue?: number | null;
}): number {
  return positiveUsd(input.listingUsdValue) ||
    positiveUsd(input.bestAskUsdValue) ||
    positiveUsd(input.lastSaleUsdValue) ||
    positiveUsd(input.bestBidUsdValue) ||
    Math.max(0, input.fallbackUsdValue);
}

export type SportsCardDeterministicValueBreakdown = {
  historyBasis: number;
  issueMultiplier: number;
  liveBasis: number;
  preTierBasis: number;
  projectionBasis: number;
  ratingBasis: number;
  tierMultiplier: number;
  valueBasis: number;
};

function sportsCardTierValueMultiplier(card: Pick<SportsArenaCard, "tier">): number {
  if (card.tier === "Mythic") return 3.6;
  if (card.tier === "Champion") return 2.7;
  if (card.tier === "Gold") return 1.85;
  if (card.tier === "Rare") return 1.32;
  return 1;
}

function sportsCardClampedRating(card: Pick<SportsArenaCard, "rating">): number {
  return Math.max(35, Math.min(100, Number.isFinite(card.rating) ? card.rating : 35));
}

function sportsCardRatingBasis(card: Pick<SportsArenaCard, "rating">): number {
  const rating = sportsCardClampedRating(card);
  if (rating < 60) return Math.max(0.15, (rating - 45) * 0.18);
  if (rating < 70) return 2.7 + (rating - 60) * 0.58;
  return 8.5 + (rating - 70) * 8.4;
}

function sportsCardProjectionBasis(card: Pick<SportsArenaCard, "projectedScore" | "rating">): number {
  const rating = sportsCardClampedRating(card);
  const projectedScore = Math.max(0, Math.min(12, Number.isFinite(card.projectedScore) ? card.projectedScore : 0));
  const qualityMultiplier = rating < 60
    ? 0.34 + Math.max(0, rating - 45) * 0.014
    : rating < 70
      ? 0.55 + (rating - 60) * 0.035
      : 0.9 + Math.min(0.35, (rating - 70) * 0.0117);
  return projectedScore * 12.5 * qualityMultiplier;
}

export function sportsCardDeterministicValueBreakdown(
  card: Pick<SportsArenaCard, "projectedScore" | "rating" | "tier">,
  liveScore = 0,
  issueMultiplier = 1,
): SportsCardDeterministicValueBreakdown {
  const tierMultiplier = sportsCardTierValueMultiplier(card);
  const normalizedIssueMultiplier = clampFinite(issueMultiplier, 1, 28);
  const ratingBasis = sportsCardRatingBasis(card);
  const projectionBasis = sportsCardProjectionBasis(card);
  const historyBasis = 0;
  const liveBasis = Math.max(-55, liveScore * 22);
  const preTierBasis = ratingBasis + projectionBasis + historyBasis + liveBasis;
  const valueBasis = Number((preTierBasis * tierMultiplier * normalizedIssueMultiplier).toFixed(3));
  return {
    historyBasis,
    issueMultiplier: Number(normalizedIssueMultiplier.toFixed(4)),
    liveBasis,
    preTierBasis: Number(preTierBasis.toFixed(3)),
    projectionBasis: Number(projectionBasis.toFixed(3)),
    ratingBasis: Number(ratingBasis.toFixed(3)),
    tierMultiplier,
    valueBasis,
  };
}

export function sportsCardDeterministicValueBasis(card: SportsArenaCard, liveScore = 0, issueMultiplier = 1): number {
  return sportsCardDeterministicValueBreakdown(card, liveScore, issueMultiplier).valueBasis;
}

export function sportsCardDeterministicUsdValue(card: SportsArenaCard, liveScore = 0, issueMultiplier = 1): number {
  return sportsArenaUsdFromValueBasis(sportsCardDeterministicValueBasis(card, liveScore, issueMultiplier));
}

export type SportsArenaCardAcquisitionValueBasis = {
  cardExpectedPacks: number | null;
  cardOddsLine: string | null;
  careerMultiplier: number;
  currentExpectedPacks: number | null;
  currentPackCostBasisUsd: number | null;
  currentPackPriceUsd: number | null;
  currentRarityOddsLine: string | null;
  expectedPacks: number;
  issueMultiplier: number;
  issuedExpectedPacks: number | null;
  issuedPackCostBasisUsd: number | null;
  issuedPackPriceUsd: number | null;
  issuedRarityOddsLine: string | null;
  packCostBasisUsd: number;
  packPriceUsd: number;
  premiumMultiplier: number;
  premiumRealizationRate: number;
  playerMultiplier: number;
  qualityMultiplier: number;
  rarity: SportsArenaCardTier;
  rarityOddsLine: string;
  realizedMultiplier: number;
  scoreMultiplier: number;
  source: "sealed-pack-odds" | "pack-catalog-odds";
  usdValue: number;
};

const SPORTS_ARENA_RARITY_ORDER: readonly SportsArenaCardTier[] = ["Common", "Rare", "Gold", "Champion", "Mythic"];
const SPORTS_ARENA_ACQUISITION_PREMIUM_REALIZATION_RATE = 0.1;
const SPORTS_ARENA_PHI = (1 + Math.sqrt(5)) / 2;

export type SportsArenaCardPerformanceValueInput = {
  bestArenaScore?: number | null;
  careerEntryCount?: number | null;
  cashFinishCount?: number | null;
};

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function wholeFinite(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizedPerformanceMultiplier(value: number | null | undefined): number {
  return Number(clampFinite(typeof value === "number" ? value : 1, 1, 1.68).toFixed(4));
}

export function sportsArenaCardPerformanceMultiplier(input: SportsArenaCardPerformanceValueInput): number {
  const bestArenaScore = typeof input.bestArenaScore === "number" && Number.isFinite(input.bestArenaScore)
    ? Math.max(0, input.bestArenaScore)
    : 0;
  const careerEntryCount = wholeFinite(input.careerEntryCount);
  const cashFinishCount = wholeFinite(input.cashFinishCount);
  if (bestArenaScore <= 0 && careerEntryCount <= 0 && cashFinishCount <= 0) return 1;
  const scoreLift = bestArenaScore > 0 ? Math.min(0.32, Math.sqrt(bestArenaScore) / 62) : 0;
  const entryLift = Math.min(0.06, Math.sqrt(careerEntryCount) * 0.012);
  const cashLift = Math.min(0.2, cashFinishCount * 0.045);
  return normalizedPerformanceMultiplier(1 + scoreLift + entryLift + cashLift);
}

function roundedUsd(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}

function sportsArenaRarityOddsTotal(pack: SportsArenaPackDefinition): number {
  return SPORTS_ARENA_RARITY_ORDER.reduce((sum, rarity) => sum + Math.max(0, pack.rarityOdds[rarity] ?? 0), 0) || 1_000_000;
}

function exactRarityChancePerPack(pack: SportsArenaPackDefinition, rarity: SportsArenaCardTier): number {
  const total = sportsArenaRarityOddsTotal(pack);
  const chancePerCard = Math.max(0, pack.rarityOdds[rarity] ?? 0) / total;
  if (chancePerCard <= 0) return 0;
  if (rarity === "Common" && pack.guaranteedFloor === "Common") return 1;
  return 1 - Math.pow(1 - chancePerCard, pack.cardCount);
}

function parseExpectedPacksFromOddsLine(value: string | null | undefined): number | null {
  const match = value?.match(/\b1\s*:\s*([\d,]+)\s*\/\s*pack\b/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function expectedPacksFromPackCatalog(claim: SportsArenaCardClaim, pack: SportsArenaPackDefinition | null | undefined): number | null {
  if (!pack || claim.rarity === "Common") return null;
  const probability = exactRarityChancePerPack(pack, claim.rarity);
  if (probability <= 0) return null;
  return Math.max(1, Math.round(1 / probability));
}

function oddsOneInLine(expectedPacks: number): string | null {
  if (!Number.isFinite(expectedPacks) || expectedPacks <= 0) return null;
  return `1:${Math.max(1, Math.round(expectedPacks)).toLocaleString("en-US")}/pack`;
}

function sportsArenaCardSelectionExpectedPacks(
  claim: SportsArenaCardClaim,
  card: SportsArenaCard,
  pack: SportsArenaPackDefinition,
  displayCards: SportsArenaCard[] | undefined,
  useSealedSelectionWeight: boolean,
): number | null {
  if (!displayCards?.length || claim.rarity === "Common") return null;
  const activePool = displayCards.filter((candidate) => candidate.rating >= pack.playerOdds.minRating);
  const pool = activePool.length > 0 ? activePool : displayCards;
  if (!pool.some((candidate) => sportsArenaClaimMatchesCard(claim, candidate))) return null;
  const registryBasisHash = claim.economy?.registryBasisHash ?? card.baseCard.basisHash;
  const totalWeight = pool.reduce((sum, candidate) => {
    const economy = sportsArenaPlayerSelectionEconomy(pack, candidate, registryBasisHash);
    return sum + Math.max(0.000001, economy.selectionWeight);
  }, 0);
  const sealedWeight = useSealedSelectionWeight ? claim.economy?.selectionWeight : null;
  const currentEconomy = sportsArenaPlayerSelectionEconomy(pack, card, registryBasisHash);
  const targetWeight = typeof sealedWeight === "number" && Number.isFinite(sealedWeight) && sealedWeight > 0
    ? sealedWeight
    : currentEconomy.selectionWeight;
  const playerChance = totalWeight > 0 ? clampFinite(targetWeight / totalWeight, 0, 1) : 0;
  if (playerChance <= 0) return null;
  const rarityChance = Math.max(0, pack.rarityOdds[claim.rarity] ?? 0) / sportsArenaRarityOddsTotal(pack);
  if (rarityChance <= 0) return null;
  const probability = 1 - Math.pow(1 - rarityChance * playerChance, pack.cardCount);
  return probability > 0 ? Math.max(1, Math.round(1 / probability)) : null;
}

function sportsArenaCardExpectedPacks(
  claim: SportsArenaCardClaim,
  card: SportsArenaCard,
  displayCards?: SportsArenaCard[],
): {
  cardExpectedPacks: number | null;
  cardOddsLine: string | null;
  currentExpectedPacks: number | null;
  currentPackCostBasisUsd: number | null;
  currentPackPriceUsd: number | null;
  currentRarityOddsLine: string | null;
  expectedPacks: number;
  issuedExpectedPacks: number | null;
  issuedPackCostBasisUsd: number | null;
  issuedPackPriceUsd: number | null;
  issuedRarityOddsLine: string | null;
  packPriceUsd: number;
  rarityOddsLine: string;
  source: SportsArenaCardAcquisitionValueBasis["source"];
} | null {
  if (claim.rarity === "Common") return null;
  const issuedExpectedPacks = parseExpectedPacksFromOddsLine(claim.pack?.rarityOddsLine);
  const issuedPack = sportsArenaPackForId(claim.pack?.packId, claim.sport);
  const currentPack = sportsArenaCurrentValuePackForSport(claim.sport) ?? issuedPack;
  const currentExpectedPacks = expectedPacksFromPackCatalog(claim, currentPack);
  const currentPackPriceUsd = currentPack ? roundedUsd(currentPack.priceUsdCents / 100) : null;
  const issuedPackPriceUsd = roundedUsd(claim.pack.priceUsdCents / 100);
  const currentPackCostBasisUsd = currentExpectedPacks && currentPackPriceUsd && currentPackPriceUsd > 0
    ? roundedUsd(currentExpectedPacks * currentPackPriceUsd)
    : null;
  const issuedPackCostBasisUsd = issuedExpectedPacks && issuedPackPriceUsd > 0
    ? roundedUsd(issuedExpectedPacks * issuedPackPriceUsd)
    : null;
  const useCurrent = currentExpectedPacks != null && currentPackPriceUsd != null && currentPackPriceUsd > 0;
  const expectedPacks = useCurrent
    ? currentExpectedPacks
    : issuedExpectedPacks ?? currentExpectedPacks;
  const packPriceUsd = useCurrent
    ? currentPackPriceUsd
    : issuedPackPriceUsd || currentPackPriceUsd;
  if (!expectedPacks || !packPriceUsd) return null;
  const source = useCurrent ? "pack-catalog-odds" : "sealed-pack-odds";
  const cardExpectedPacks = currentPack ? sportsArenaCardSelectionExpectedPacks(claim, card, currentPack, displayCards, false) : null;
  const currentRarityOddsLine = currentExpectedPacks ? `${claim.rarity} ${oddsOneInLine(currentExpectedPacks) ?? "verified odds"}` : null;
  const issuedRarityOddsLine = claim.pack.rarityOddsLine ?? null;
  return {
    cardExpectedPacks,
    cardOddsLine: cardExpectedPacks ? oddsOneInLine(cardExpectedPacks) : null,
    currentExpectedPacks,
    currentPackCostBasisUsd,
    currentPackPriceUsd,
    currentRarityOddsLine,
    expectedPacks,
    issuedExpectedPacks,
    issuedPackCostBasisUsd,
    issuedPackPriceUsd,
    issuedRarityOddsLine,
    packPriceUsd,
    rarityOddsLine: source === "pack-catalog-odds"
      ? `${claim.rarity} ${oddsOneInLine(expectedPacks) ?? "verified odds"}`
      : claim.pack.rarityOddsLine ?? "Verified rarity",
    source,
  };
}

function issueRankMultiplier(claim: SportsArenaCardClaim): number {
  const overallIssue = claim.issue?.overallIssueNumber;
  const variantIssue = claim.issue?.variantIssueNumber;
  const overall = typeof overallIssue === "number" && Number.isFinite(overallIssue) && overallIssue > 0
    ? overallIssue <= 1
      ? 2.4
      : 1 + 0.85 / Math.sqrt(overallIssue)
    : 1;
  const variant = typeof variantIssue === "number" && Number.isFinite(variantIssue) && variantIssue > 0
    ? variantIssue <= 1
      ? 5.4
      : 1 + 2.4 / Math.sqrt(variantIssue)
    : 1;
  const doubleFirstBonus = overallIssue === 1 && variantIssue === 1 ? 1.4 : 1;
  return Number(clampFinite(overall * variant * doubleFirstBonus, 1, 28).toFixed(4));
}

export function sportsArenaCardIssueMultiplier(claim: SportsArenaCardClaim): number {
  return issueRankMultiplier(claim);
}

function playerScarcityWeightForRating(rating: number): number {
  let selected: number = SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS[0]?.fibonacciWeight ?? 55;
  for (const bucket of SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS) {
    if (rating >= bucket.minRating) selected = bucket.fibonacciWeight;
  }
  return selected;
}

function normalizedPlayerName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function playerCurrentCardMatchesClaim(claim: SportsArenaCardClaim, card: SportsArenaCard): boolean {
  if (claim.cardId !== card.id && sportsArenaClaimPlayerKey(claim) !== sportsArenaCardPlayerKey(card)) return false;
  const claimAthlete = normalizedPlayerName(claim.athlete);
  const cardAthlete = normalizedPlayerName(card.athlete);
  return !claimAthlete || !cardAthlete || claimAthlete === cardAthlete;
}

function playerAcquisitionRating(claim: SportsArenaCardClaim, card: SportsArenaCard): number {
  const currentRating = playerCurrentCardMatchesClaim(claim, card) ? card.rating : claim.rating;
  return clampFinite(currentRating, 35, 100);
}

function playerAcquisitionScarcityWeight(claim: SportsArenaCardClaim, rating: number): number {
  const currentRatingWeight = playerScarcityWeightForRating(rating);
  const sealedWeight = claim.economy?.playerScarcityWeight;
  if (typeof sealedWeight !== "number" || !Number.isFinite(sealedWeight) || sealedWeight <= 0) return currentRatingWeight;
  return Math.min(sealedWeight, currentRatingWeight);
}

function playerContextMultiplier(claim: SportsArenaCardClaim, card: SportsArenaCard): number {
  const rating = playerAcquisitionRating(claim, card);
  const scarcityWeight = playerAcquisitionScarcityWeight(claim, rating);
  const scarcityMultiplier = typeof scarcityWeight === "number" && Number.isFinite(scarcityWeight) && scarcityWeight > 0
    ? clampFinite(Math.pow(55 / scarcityWeight, 0.55), 1, 7.25)
    : 1 + SPORTS_ARENA_RARITY_ORDER.indexOf(claim.rarity) * 0.62;
  const ratingQuality = Math.max(0, (rating - 68) / 32);
  const ratingMultiplier = 1 + Math.pow(ratingQuality, 1.8) * 2.1;
  const projectionMultiplier = 1 + clampFinite(Math.max(claim.projectedScore, card.projectedScore), 0, 12) * 0.035;
  return Number(clampFinite(scarcityMultiplier * ratingMultiplier * projectionMultiplier, 1, 18).toFixed(4));
}

function playerQualityAcquisitionMultiplier(claim: SportsArenaCardClaim, card: SportsArenaCard): number {
  const rating = playerAcquisitionRating(claim, card);
  if (rating >= 80) return 1;
  if (rating >= 70) {
    const progress = (rating - 70) / 10;
    return Number((0.32 + Math.pow(progress, 1.35) * 0.68).toFixed(4));
  }
  const phiStep = (power: number) => Math.pow(SPORTS_ARENA_PHI, -power);
  const phiRegression = (fromPower: number, toPower: number, progress: number) => {
    const eased = Math.pow(clampFinite(progress, 0, 1), SPORTS_ARENA_PHI);
    const from = phiStep(fromPower);
    const to = phiStep(toPower);
    return Number((from + (to - from) * eased).toFixed(4));
  };
  if (rating >= 60) {
    const progress = (rating - 60) / 10;
    return phiRegression(10, 8, progress);
  }
  if (rating >= 50) {
    const progress = (rating - 50) / 10;
    return phiRegression(11, 10, progress);
  }
  const progress = (rating - 35) / 15;
  return phiRegression(14, 11, progress);
}

function yearFromIsoLike(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function yearFromMs(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function numberFromBioAge(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function careerContextMultiplier(claim: SportsArenaCardClaim, card: SportsArenaCard): number {
  let multiplier = 1;
  if (claim.rookie?.isRookie || card.rookie?.isRookie) multiplier *= 1.75;
  const issuedYear = yearFromMs(claim.issuedAtMs);
  const rookieYear = yearFromIsoLike(claim.rookie?.rookieClass ?? card.rookie?.rookieClass ?? null);
  const debutYear = yearFromIsoLike(claim.playerBio?.mlbDebutDate ?? card.playerBio?.mlbDebutDate ?? null);
  if (issuedYear && rookieYear && issuedYear <= rookieYear) multiplier *= 1.22;
  if (issuedYear && debutYear && issuedYear - debutYear <= 1) multiplier *= 1.18;
  const age = numberFromBioAge(claim.playerBio?.age ?? card.playerBio?.age ?? null);
  if (age !== null && age > 0) {
    if (age <= 23) multiplier *= 1.18;
    else if (age <= 26) multiplier *= 1.1;
    else if (age >= 34) multiplier *= 0.96;
  }
  return Number(clampFinite(multiplier, 0.92, 2.75).toFixed(4));
}

function liveScoreMultiplier(liveScore: number): number {
  return Number(clampFinite(1 + liveScore * 0.012, 0.92, 1.18).toFixed(4));
}

function acquisitionRealizedMultiplier(...multipliers: number[]): number {
  const premiumMultiplier = multipliers.reduce((product, multiplier) => product * multiplier, 1);
  return Number((1 + Math.max(0, premiumMultiplier - 1) * SPORTS_ARENA_ACQUISITION_PREMIUM_REALIZATION_RATE).toFixed(4));
}

export function sportsArenaCardClaimAcquisitionValueBasis(
  claim: SportsArenaCardClaim,
  card: SportsArenaCard,
  liveScore = 0,
  displayCards?: SportsArenaCard[],
): SportsArenaCardAcquisitionValueBasis | null {
  if (!claim.pack) return null;
  const expected = sportsArenaCardExpectedPacks(claim, card, displayCards);
  const packPriceUsd = expected?.packPriceUsd ?? roundedUsd(claim.pack.priceUsdCents / 100);
  if (!expected || packPriceUsd <= 0) return null;
  const packCostBasisUsd = roundedUsd(expected.expectedPacks * packPriceUsd);
  if (packCostBasisUsd <= 0) return null;
  const playerMultiplier = playerContextMultiplier(claim, card);
  const issueMultiplier = issueRankMultiplier(claim);
  const careerMultiplier = careerContextMultiplier(claim, card);
  const scoreMultiplier = liveScoreMultiplier(liveScore);
  const qualityMultiplier = playerQualityAcquisitionMultiplier(claim, card);
  const premiumMultiplier = Number((playerMultiplier * issueMultiplier * careerMultiplier * scoreMultiplier).toFixed(4));
  const realizedMultiplier = acquisitionRealizedMultiplier(playerMultiplier, issueMultiplier, careerMultiplier, scoreMultiplier);
  return {
    cardExpectedPacks: expected.cardExpectedPacks,
    cardOddsLine: expected.cardOddsLine,
    careerMultiplier,
    currentExpectedPacks: expected.currentExpectedPacks,
    currentPackCostBasisUsd: expected.currentPackCostBasisUsd,
    currentPackPriceUsd: expected.currentPackPriceUsd,
    currentRarityOddsLine: expected.currentRarityOddsLine,
    expectedPacks: expected.expectedPacks,
    issueMultiplier,
    issuedExpectedPacks: expected.issuedExpectedPacks,
    issuedPackCostBasisUsd: expected.issuedPackCostBasisUsd,
    issuedPackPriceUsd: expected.issuedPackPriceUsd,
    issuedRarityOddsLine: expected.issuedRarityOddsLine,
    packCostBasisUsd,
    packPriceUsd,
    premiumMultiplier,
    premiumRealizationRate: SPORTS_ARENA_ACQUISITION_PREMIUM_REALIZATION_RATE,
    playerMultiplier,
    qualityMultiplier,
    rarity: claim.rarity,
    rarityOddsLine: expected.rarityOddsLine,
    realizedMultiplier,
    scoreMultiplier,
    source: expected.source,
    usdValue: roundedUsd(packCostBasisUsd * qualityMultiplier * realizedMultiplier),
  };
}

export function sportsArenaCardClaimUsdValue(
  claim: SportsArenaCardClaim,
  card: SportsArenaCard,
  liveScore = 0,
  performanceMultiplier = 1,
  displayCards?: SportsArenaCard[],
): number {
  return sportsArenaCardValueProjection({
    claim,
    currentScore: liveScore,
    displayCards,
    fallbackCard: card,
    performanceMultiplier,
  })?.currentUsdValue ?? 0;
}

function normalizedHistoryCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function sportsArenaCardValueProjection(input: SportsArenaCardValueProjectionInput): SportsArenaCardValueProjection | null {
  const displayCards = sportsArenaUniqueValueCards(input.fallbackCard
    ? [...(input.displayCards ?? []), input.fallbackCard]
    : input.displayCards ?? []);
  const baseCard = input.claim
    ? sportsArenaCardForClaim(input.claim, displayCards)
    : input.fallbackCard ?? null;
  if (!baseCard) return null;
  const historyCount = normalizedHistoryCount(baseCard.historyCount);
  const currentScore = typeof input.currentScore === "number" && Number.isFinite(input.currentScore)
    ? Number(input.currentScore.toFixed(2))
    : 0;
  const card = {
    ...baseCard,
    currentScore,
    historyCount,
  };
  const birthCard = input.claim ? {
    ...sportsArenaCardVariantFromOwnedClaim(sportsArenaCardFromClaim(input.claim), input.claim),
    currentScore: 0,
    historyCount: 0,
  } : card;
  const birthAcquisitionBasis = input.claim ? sportsArenaCardClaimAcquisitionValueBasis(input.claim, birthCard, 0, displayCards) : null;
  const currentAcquisitionBasis = input.claim ? sportsArenaCardClaimAcquisitionValueBasis(input.claim, card, currentScore, displayCards) : null;
  const deterministicFloorIssueMultiplier = input.claim ? issueRankMultiplier(input.claim) : 1;
  const birthFloorUsdValue = sportsCardDeterministicUsdValue(birthCard, 0, deterministicFloorIssueMultiplier);
  const deterministicFloorUsdValue = sportsCardDeterministicUsdValue(card, currentScore, deterministicFloorIssueMultiplier);
  const performanceMultiplier = normalizedPerformanceMultiplier(input.performanceMultiplier);
  const birthUsdValue = Math.max(birthFloorUsdValue, birthAcquisitionBasis?.usdValue ?? 0);
  const prePerformanceUsdValue = Math.max(deterministicFloorUsdValue, currentAcquisitionBasis?.usdValue ?? 0);
  const currentUsdValue = roundedUsd(prePerformanceUsdValue * performanceMultiplier);
  return {
    acquisitionBasis: currentAcquisitionBasis ?? birthAcquisitionBasis,
    birthUsdValue,
    card,
    currentUsdValue,
    deterministicFloorIssueMultiplier,
    deterministicFloorUsdValue,
    performanceMultiplier,
    prePerformanceUsdValue,
  };
}
