import { jcsCanonicalize } from "@/app/utils/jcs";
import { sha256Hex } from "@/app/utils/sha256";
import {
  FIGHT_ARENA_LEGACY_PACKS,
  FIGHT_ARENA_PACKS,
  SPORTS_ARENA_PACKS,
  UFC_FIGHT_NIGHT_PACK_ID,
  UFC_FREE_FIGHT_PACK_ID,
  WORLD_CUP_ARENA_PACKS,
  projectSportsArenaCards,
  sportsArenaForSlug,
  type SportsArenaBaseCard,
  type SportsArenaCard,
  type SportsArenaCardMedia,
  type SportsArenaCardTier,
  type SportsArenaPackDefinition,
  type SportsArenaPackReceipt,
  type SportsArenaSlug,
} from "@/app/lib/game/sportsArena";

export type SportsArenaPackId =
  | typeof SPORTS_ARENA_PACKS[number]["id"]
  | typeof WORLD_CUP_ARENA_PACKS[number]["id"]
  | typeof FIGHT_ARENA_PACKS[number]["id"]
  | typeof FIGHT_ARENA_LEGACY_PACKS[number]["id"];

export const SPORTS_ARENA_FREE_PACK_ID = "mlb-free-common";
export const SPORTS_WORLD_CUP_FREE_PACK_ID = "fifa-world-cup-starter";
export const SPORTS_ARENA_CURRENT_VALUE_PACK_ID = "mlb-starter-live-pack";
export const SPORTS_WORLD_CUP_CURRENT_VALUE_PACK_ID = "fifa-world-cup-matchday-pack";

export function sportsArenaFreePackIdForSport(sport: SportsArenaSlug): string {
  return sport === "soccer" ? SPORTS_WORLD_CUP_FREE_PACK_ID : sport === "fight" ? UFC_FREE_FIGHT_PACK_ID : SPORTS_ARENA_FREE_PACK_ID;
}

export function sportsArenaCurrentValuePackIdForSport(sport: SportsArenaSlug | string | null | undefined): string {
  return sport === "soccer"
    ? SPORTS_WORLD_CUP_CURRENT_VALUE_PACK_ID
    : sport === "fight"
      ? UFC_FIGHT_NIGHT_PACK_ID
      : SPORTS_ARENA_CURRENT_VALUE_PACK_ID;
}

export function sportsArenaCurrentValuePackForSport(sport: SportsArenaSlug | string | null | undefined): SportsArenaPackDefinition | null {
  const normalizedSport: SportsArenaSlug = sport === "soccer" || sport === "fight" || sport === "baseball" ? sport : "baseball";
  return sportsArenaPackForId(sportsArenaCurrentValuePackIdForSport(normalizedSport), normalizedSport);
}

export type SportsArenaCardClaim = {
  schema: "receiz.sports_arena.card_claim.v1";
  collectibleId: string;
  claimHash: string;
  sport: SportsArenaSlug;
  cardId: string;
  athlete: string;
  teamCode: string;
  position: string;
  side: SportsArenaCard["side"];
  baseTier: SportsArenaCardTier;
  rarity: SportsArenaCardTier;
  variantName: string;
  rating: number;
  projectedScore: number;
  media: SportsArenaCardMedia;
  baseCard: SportsArenaBaseCard;
  rookie?: SportsArenaCard["rookie"];
  playerBio?: SportsArenaCard["playerBio"];
  ownerUserId: string | null;
  ownerUsername: string | null;
  issuedAtMs: number;
  issue?: SportsArenaCardIssue;
  pack: {
    packId: string;
    packName: string;
    purchaseId: string;
    clientNonce: string;
    slotIndex: number;
    cardCount: number;
    priceUsdCents: number;
    oddsLine: string;
    rarityOddsLine?: string;
    rarityOddsKind?: "exact-variant-per-pack";
    seedHash: string;
  };
  proof: {
    source: "mlb-base-set" | "fifa-world-cup-26" | "ufc-fighter-roster";
    deterministicKey: string;
    basisHash: string;
    statBasis: string[];
    rule: string;
  };
  economy?: SportsArenaPlayerEconomy;
};

export type SportsArenaCardIssue = {
  schema: "receiz.sports_arena.card_issue.v1";
  sport: SportsArenaSlug;
  cardId: string;
  rarity: SportsArenaCardTier;
  overallIssueNumber: number;
  variantIssueNumber: number;
  overallScope: "player-card";
  variantScope: "player-card-rarity";
  counterBasis: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSportsArenaIssueSport(value: unknown): value is SportsArenaSlug {
  return value === "baseball" || value === "soccer" || value === "fight";
}

function isPositiveIssueNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isSportsArenaCardIssue(value: unknown): value is SportsArenaCardIssue {
  if (!isRecord(value)) return false;
  return value.schema === "receiz.sports_arena.card_issue.v1" &&
    isSportsArenaIssueSport(value.sport) &&
    typeof value.cardId === "string" &&
    typeof value.rarity === "string" &&
    isPositiveIssueNumber(value.overallIssueNumber) &&
    isPositiveIssueNumber(value.variantIssueNumber) &&
    value.overallScope === "player-card" &&
    value.variantScope === "player-card-rarity" &&
    typeof value.counterBasis === "string";
}

export function sportsArenaCardIssueMatchesClaim(
  issue: unknown,
  claim: Pick<SportsArenaCardClaim, "sport" | "cardId" | "rarity">,
): issue is SportsArenaCardIssue {
  return isSportsArenaCardIssue(issue) &&
    issue.sport === claim.sport &&
    issue.cardId === claim.cardId &&
    issue.rarity === claim.rarity;
}

export function sportsArenaCardIssueFromProofValue(
  value: unknown,
  claim: Pick<SportsArenaCardClaim, "collectibleId" | "claimHash" | "sport" | "cardId" | "rarity">,
): SportsArenaCardIssue | null {
  if (!isRecord(value)) return null;
  const issue = sportsArenaCardIssueMatchesClaim(value.issue, claim) ? value.issue : null;
  if (
    value.schema !== "receiz.sports_arena.card_issue_proof.v1" ||
    value.eventKind !== "issue" ||
    value.collectibleId !== claim.collectibleId ||
    value.claimHash !== claim.claimHash ||
    value.cardId !== claim.cardId ||
    value.rarity !== claim.rarity ||
    typeof value.proofHash !== "string" ||
    !issue
  ) {
    return null;
  }
  return issue;
}

export function sportsArenaCardIssueFromAsset(
  asset: unknown,
  claim: Pick<SportsArenaCardClaim, "collectibleId" | "claimHash" | "sport" | "cardId" | "rarity">,
): SportsArenaCardIssue | null {
  if (!isRecord(asset)) return null;
  return sportsArenaCardIssueMatchesClaim(asset.issue, claim)
    ? asset.issue
    : sportsArenaCardIssueFromProofValue(asset.issueProof, claim);
}

export function sportsArenaClaimWithResolvedIssue<T extends SportsArenaCardClaim>(
  claim: T,
  issue: SportsArenaCardIssue | null | undefined,
): T {
  if (claim.issue || !sportsArenaCardIssueMatchesClaim(issue, claim)) return claim;
  return { ...claim, issue };
}

export type BuildSportsArenaPackClaimsInput = {
  pack: SportsArenaPackDefinition;
  receipt: SportsArenaPackReceipt;
  sport: SportsArenaSlug;
  ownerUserId: string | null;
  ownerUsername: string | null;
  cardPool?: SportsArenaCard[];
  directCardId?: string | null;
  registryBasisHash?: string;
  ownerCardCounts?: ReadonlyMap<string, number>;
  ownerTeamCounts?: ReadonlyMap<string, number>;
  issueAllocator?: (input: {
    sport: SportsArenaSlug;
    cardId: string;
    rarity: SportsArenaCardTier;
    packId: string;
    purchaseId: string;
    slotIndex: number;
  }) => Promise<SportsArenaCardIssue>;
};

export const SPORTS_ARENA_RARITY_ORDER: readonly SportsArenaCardTier[] = [
  "Common",
  "Rare",
  "Gold",
  "Champion",
  "Mythic",
];

const SPORTS_ARENA_RARITY_VARIANT: Record<SportsArenaCardTier, string> = {
  Common: "Base",
  Rare: "Silver Script",
  Gold: "Gold Scar",
  Champion: "Champion Foil",
  Mythic: "Mythic Refractor",
};

const SPORTS_ARENA_COLLECTION_SPREAD_WEIGHT_FLOOR = 0.025;
const SPORTS_ARENA_TEAM_SPREAD_WEIGHT_FLOOR = 0.08;
const SPORTS_ARENA_TEAM_CODE_ALIASES: Record<string, string> = {
  AZ: "ARI",
  CHW: "CWS",
  OAK: "ATH",
};

function sportsArenaProofSetLabel(sport: SportsArenaSlug, plural = false): string {
  if (sport === "soccer") return plural ? "World Cup teams" : "World Cup";
  if (sport === "fight") return plural ? "UFC fighters" : "UFC fighter";
  return plural ? "MLB clubs" : "MLB";
}

export const SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS = [
  { label: "Depth", minRating: 0, fibonacciWeight: 55 },
  { label: "Roster", minRating: 62, fibonacciWeight: 34 },
  { label: "Regular", minRating: 70, fibonacciWeight: 21 },
  { label: "Core", minRating: 78, fibonacciWeight: 13 },
  { label: "Impact", minRating: 84, fibonacciWeight: 8 },
  { label: "Star", minRating: 90, fibonacciWeight: 5 },
  { label: "Franchise", minRating: 95, fibonacciWeight: 3 },
  { label: "Mythic", minRating: 98, fibonacciWeight: 2 },
] as const;

export type SportsArenaPlayerEconomy = {
  schema: "receiz.sports_arena.player_economy.v1";
  registryBasisHash: string;
  playerScarcityTier: string;
  playerScarcityWeight: number;
  playerRatingBucket: number;
  packQualityBias: number;
  ownerCollectionCount?: number;
  collectionSpreadWeight?: number;
  collectionSpreadRule?: string;
  ownerTeamCount?: number;
  teamSpreadWeight?: number;
  teamSpreadRule?: string;
  selectionWeight: number;
  selectionRule: string;
};

export type SportsArenaWeightedCard = {
  card: SportsArenaCard;
  economy: SportsArenaPlayerEconomy;
};

function seedToUint32(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function sportsArenaSeededRandom(seed: string): () => number {
  let state = seedToUint32(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function rarityIndex(rarity: SportsArenaCardTier): number {
  return Math.max(0, SPORTS_ARENA_RARITY_ORDER.indexOf(rarity));
}

function atLeastRarity(rarity: SportsArenaCardTier, floor: SportsArenaCardTier): SportsArenaCardTier {
  return rarityIndex(rarity) >= rarityIndex(floor) ? rarity : floor;
}

function rarityOddsTotal(pack: SportsArenaPackDefinition): number {
  return SPORTS_ARENA_RARITY_ORDER.reduce((sum, rarity) => sum + Math.max(0, pack.rarityOdds[rarity] ?? 0), 0) || 1_000_000;
}

function rarityChancePerCard(pack: SportsArenaPackDefinition, floor: SportsArenaCardTier): number {
  const floorIndex = rarityIndex(floor);
  const total = rarityOddsTotal(pack);
  return SPORTS_ARENA_RARITY_ORDER.reduce((sum, rarity) => {
    return rarityIndex(rarity) >= floorIndex ? sum + Math.max(0, pack.rarityOdds[rarity] ?? 0) : sum;
  }, 0) / total;
}

function exactRarityChancePerCard(pack: SportsArenaPackDefinition, rarity: SportsArenaCardTier): number {
  return Math.max(0, pack.rarityOdds[rarity] ?? 0) / rarityOddsTotal(pack);
}

function rarityChancePerPack(pack: SportsArenaPackDefinition, floor: SportsArenaCardTier): number {
  const chance = rarityChancePerCard(pack, floor);
  if (chance <= 0) return 0;
  if (rarityIndex(pack.guaranteedFloor) >= rarityIndex(floor)) return 1;
  return 1 - Math.pow(1 - chance, pack.cardCount);
}

function exactRarityChancePerPack(pack: SportsArenaPackDefinition, rarity: SportsArenaCardTier): number {
  const chance = exactRarityChancePerCard(pack, rarity);
  if (chance <= 0) return 0;
  if (rarity === "Common" && pack.guaranteedFloor === "Common") return 1;
  return 1 - Math.pow(1 - chance, pack.cardCount);
}

function oddsOneIn(probability: number): string {
  if (probability >= 1) return "guaranteed";
  if (probability <= 0) return "not in pack";
  return `1:${Math.max(1, Math.round(1 / probability)).toLocaleString("en-US")}`;
}

function issueNumberLabel(value: number): string {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : 1;
  return String(Math.max(1, normalized));
}

export function sportsArenaPackOddsBreakdown(pack: SportsArenaPackDefinition): {
  rarePlusPerPack: number;
  goldPlusPerPack: number;
  championPlusPerPack: number;
  mythicPerPack: number;
  rarePlusLine: string;
  goldPlusLine: string;
  championPlusLine: string;
  mythicLine: string;
} {
  const rarePlusPerPack = rarityChancePerPack(pack, "Rare");
  const goldPlusPerPack = rarityChancePerPack(pack, "Gold");
  const championPlusPerPack = rarityChancePerPack(pack, "Champion");
  const mythicPerPack = rarityChancePerPack(pack, "Mythic");
  return {
    rarePlusPerPack,
    goldPlusPerPack,
    championPlusPerPack,
    mythicPerPack,
    rarePlusLine: oddsOneIn(rarePlusPerPack),
    goldPlusLine: oddsOneIn(goldPlusPerPack),
    championPlusLine: oddsOneIn(championPlusPerPack),
    mythicLine: oddsOneIn(mythicPerPack),
  };
}

export function sportsArenaPackExactRarityOddsLine(pack: SportsArenaPackDefinition, rarity: SportsArenaCardTier): string {
  if (rarity === "Common") return "Base card";
  return `${rarity} ${oddsOneIn(exactRarityChancePerPack(pack, rarity))}/pack`;
}

export function sportsArenaClaimRarityOddsLine(
  claim: Pick<SportsArenaCardClaim, "rarity" | "pack"> & Partial<Pick<SportsArenaCardClaim, "sport">>,
): string {
  if (claim.rarity === "Common") return "Base card";
  const currentPack = claim.sport ? sportsArenaCurrentValuePackForSport(claim.sport) : null;
  const catalogPack = currentPack ?? sportsArenaPackForId(claim.pack.packId, claim.sport ?? "baseball");
  if (catalogPack) return sportsArenaPackExactRarityOddsLine(catalogPack, claim.rarity);
  if (claim.pack.rarityOddsKind === "exact-variant-per-pack" && claim.pack.rarityOddsLine) {
    return claim.pack.rarityOddsLine;
  }
  return "Verified rarity";
}

export function sportsArenaClaimIssueLine(claim: Pick<SportsArenaCardClaim, "issue" | "rarity">): string | null {
  if (!claim.issue) return null;
  const overall = `Issue #${issueNumberLabel(claim.issue.overallIssueNumber)}`;
  if (claim.rarity === "Common") return overall;
  return `${overall} · ${claim.rarity} #${issueNumberLabel(claim.issue.variantIssueNumber)}`;
}

export function sportsArenaClaimCirculationLine(
  claim: Pick<SportsArenaCardClaim, "issue" | "rarity">,
  circulation?: { overallCount?: number | null; variantCount?: number | null } | null,
): string | null {
  if (!claim.issue) return null;
  const overallCount = circulation?.overallCount ?? null;
  const variantCount = circulation?.variantCount ?? null;
  if (claim.rarity !== "Common") {
    const variantTotal = typeof variantCount === "number" && Number.isFinite(variantCount) && variantCount > 0
      ? variantCount
      : claim.issue.variantIssueNumber;
    return `#${issueNumberLabel(claim.issue.variantIssueNumber)} / ${issueNumberLabel(variantTotal)} ${claim.rarity} issued`;
  }
  const overallTotal = typeof overallCount === "number" && Number.isFinite(overallCount) && overallCount > 0
    ? overallCount
    : claim.issue.overallIssueNumber;
  return `#${issueNumberLabel(claim.issue.overallIssueNumber)} / ${issueNumberLabel(overallTotal)} issued`;
}

export function chooseSportsArenaPackRarity(pack: SportsArenaPackDefinition, random: () => number, slotIndex: number): SportsArenaCardTier {
  const total = rarityOddsTotal(pack);
  let cursor = Math.floor(random() * total);
  for (const rarity of SPORTS_ARENA_RARITY_ORDER) {
    cursor -= Math.max(0, pack.rarityOdds[rarity] ?? 0);
    if (cursor < 0) return slotIndex === 0 ? atLeastRarity(rarity, pack.guaranteedFloor) : rarity;
  }
  return pack.guaranteedFloor;
}

export function sportsArenaPackCardPool(_pack: SportsArenaPackDefinition, cards: SportsArenaCard[]): SportsArenaCard[] {
  return cards;
}

function sportsArenaMlbSourceId(card: SportsArenaCard): string {
  return card.media.source === "mlb" ? card.media.sourceId.trim() : "";
}

function sportsArenaStablePackCard(card: SportsArenaCard, snapshotCards: readonly SportsArenaCard[], sport: SportsArenaSlug): SportsArenaCard {
  if (sport !== "baseball") return card;
  const sourceId = sportsArenaMlbSourceId(card);
  if (!sourceId) return card;
  const stableCard = snapshotCards.find((candidate) => candidate.media.source === "mlb" && candidate.media.sourceId.trim() === sourceId) ?? null;
  if (!stableCard || stableCard.id === card.id) return card;
  return {
    ...card,
    id: stableCard.id,
    baseCard: { ...stableCard.baseCard },
    tags: Array.from(new Set([...stableCard.tags, ...card.tags])),
  };
}

function sportsArenaStablePackCardId(card: SportsArenaCard, snapshotCards: readonly SportsArenaCard[], sport: SportsArenaSlug): string {
  return sportsArenaStablePackCard(card, snapshotCards, sport).id;
}

function playerScarcityBucket(rating: number): { index: number; label: string; fibonacciWeight: number } {
  let selected: { index: number; label: string; fibonacciWeight: number } = { index: 0, ...SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS[0] };
  for (let index = 0; index < SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS.length; index += 1) {
    const bucket = SPORTS_ARENA_PLAYER_SCARCITY_BUCKETS[index];
    if (rating >= bucket.minRating) selected = { index, ...bucket };
  }
  return selected;
}

export function sportsArenaOwnerCollectionSpreadWeight(ownerCollectionCount: number): number {
  const count = Number.isFinite(ownerCollectionCount) ? Math.max(0, Math.trunc(ownerCollectionCount)) : 0;
  if (count <= 0) return 1;
  return Math.max(SPORTS_ARENA_COLLECTION_SPREAD_WEIGHT_FLOOR, 1 / Math.pow(count + 1, 4));
}

export function sportsArenaNormalizedTeamCode(teamCode: string | null | undefined): string {
  const normalized = String(teamCode ?? "").trim().toUpperCase();
  return SPORTS_ARENA_TEAM_CODE_ALIASES[normalized] ?? normalized;
}

export function sportsArenaOwnerTeamSpreadWeight(ownerTeamCount: number): number {
  const count = Number.isFinite(ownerTeamCount) ? Math.max(0, Math.trunc(ownerTeamCount)) : 0;
  if (count <= 0) return 1;
  return Number(Math.max(SPORTS_ARENA_TEAM_SPREAD_WEIGHT_FLOOR, 1 / Math.pow(count + 1, 0.7)).toFixed(6));
}

export function sportsArenaPlayerSelectionEconomy(
  pack: SportsArenaPackDefinition,
  card: SportsArenaCard,
  registryBasisHash: string,
  ownerCollectionCount = 0,
  ownerTeamCount = 0,
): SportsArenaPlayerEconomy {
  const bucket = playerScarcityBucket(card.rating);
  const qualityLift = Math.max(0, pack.playerOdds.qualityBias);
  const scarcityRelaxation = Math.min(0.38, qualityLift / 9);
  const scarcityWeight = Math.pow(bucket.fibonacciWeight, 1 - scarcityRelaxation);
  const ratingPressure = Math.max(0.1, Math.min(1.02, (card.rating - 42) / 58));
  const ratingExponent = 0.5 + qualityLift * 1.1;
  const collectionSpreadWeight = sportsArenaOwnerCollectionSpreadWeight(ownerCollectionCount);
  const teamSpreadWeight = sportsArenaOwnerTeamSpreadWeight(ownerTeamCount);
  const selectionWeight = Number((scarcityWeight * Math.pow(ratingPressure, ratingExponent) * collectionSpreadWeight * teamSpreadWeight).toFixed(6));
  return {
    schema: "receiz.sports_arena.player_economy.v1",
    registryBasisHash,
    playerScarcityTier: bucket.label,
    playerScarcityWeight: bucket.fibonacciWeight,
    playerRatingBucket: bucket.index,
    packQualityBias: pack.playerOdds.qualityBias,
    ...(ownerCollectionCount > 0 ? {
      ownerCollectionCount,
      collectionSpreadWeight,
      collectionSpreadRule: `Owned cards keep eligibility, but repeat-card weight is reduced so a collector's next sealed pulls spread across the ${sportsArenaProofSetLabel(card.baseCard.sport)} proof set.`,
    } : {}),
    ...(ownerTeamCount > 0 ? {
      ownerTeamCount,
      teamSpreadWeight,
      teamSpreadRule: `Owned teams keep eligibility, but repeat-team weight is reduced so a collector's next sealed pulls spread across ${sportsArenaProofSetLabel(card.baseCard.sport, true)}.`,
    } : {}),
    selectionWeight,
    selectionRule: pack.playerOdds.rule,
  };
}

export function chooseSportsArenaPackCard(
  pack: SportsArenaPackDefinition,
  cards: SportsArenaCard[],
  random: () => number,
  slotIndex: number,
  selectedCardIds: Set<string>,
  registryBasisHash: string,
  ownerCardCounts: ReadonlyMap<string, number> = new Map(),
  ownerTeamCounts: ReadonlyMap<string, number> = new Map(),
  blockedTeamCodes: ReadonlySet<string> = new Set(),
): SportsArenaWeightedCard {
  const rolePool = sportsArenaPackCardPool(pack, cards);
  const eligiblePool = rolePool.filter((card) => card.rating >= pack.playerOdds.minRating);
  const activePool = eligiblePool.length > 0 ? eligiblePool : rolePool.length > 0 ? rolePool : cards;
  const openPool = activePool.filter((card) => !selectedCardIds.has(card.id) && !blockedTeamCodes.has(sportsArenaNormalizedTeamCode(card.teamCode)));
  const pool = openPool.length > 0 ? openPool : activePool;
  const weighted = pool
    .map((card) => ({
      card,
      economy: sportsArenaPlayerSelectionEconomy(
        pack,
        card,
        registryBasisHash,
        ownerCardCounts.get(card.id) ?? 0,
        ownerTeamCounts.get(sportsArenaNormalizedTeamCode(card.teamCode)) ?? 0,
      ),
    }))
    .sort((a, b) => b.card.rating - a.card.rating || a.card.id.localeCompare(b.card.id));
  const totalWeight = weighted.reduce((sum, item) => sum + Math.max(0.000001, item.economy.selectionWeight), 0) || 1;
  let cursor = random() * totalWeight;
  for (const item of weighted) {
    cursor -= Math.max(0.000001, item.economy.selectionWeight);
    if (cursor <= 0) return item;
  }
  const fallbackCard = cards[0];
  if (!fallbackCard) throw new Error("sports_arena_pack_empty_card_pool");
  return weighted[(slotIndex + Math.floor(random() * weighted.length)) % Math.max(1, weighted.length)] ?? {
    card: fallbackCard,
    economy: sportsArenaPlayerSelectionEconomy(
      pack,
      fallbackCard,
      registryBasisHash,
      ownerCardCounts.get(fallbackCard.id) ?? 0,
      ownerTeamCounts.get(sportsArenaNormalizedTeamCode(fallbackCard.teamCode)) ?? 0,
    ),
  };
}

function claimHashPayload(claim: Omit<SportsArenaCardClaim, "claimHash">): string {
  return jcsCanonicalize(claim);
}

function cloneSportsArenaPack(pack: SportsArenaPackDefinition): SportsArenaPackDefinition {
  return {
    ...pack,
    rarityOdds: { ...pack.rarityOdds },
    playerOdds: { ...pack.playerOdds },
  };
}

export function sportsArenaPackCatalogForSport(sport: SportsArenaSlug): SportsArenaPackDefinition[] {
  const packs = sport === "soccer"
    ? WORLD_CUP_ARENA_PACKS
    : sport === "fight"
      ? FIGHT_ARENA_PACKS
      : SPORTS_ARENA_PACKS;
  return packs.map(cloneSportsArenaPack);
}

export function sportsArenaPackCatalog(sport: SportsArenaSlug = "baseball"): SportsArenaPackDefinition[] {
  return sportsArenaPackCatalogForSport(sport);
}

export function sportsArenaPackForId(packId: unknown, sport: SportsArenaSlug = "baseball"): SportsArenaPackDefinition | null {
  const normalized = typeof packId === "string" ? packId.trim() : "";
  const visible = sportsArenaPackCatalogForSport(sport).find((pack) => pack.id === normalized);
  if (visible) return visible;
  if (sport === "fight") return FIGHT_ARENA_LEGACY_PACKS.map(cloneSportsArenaPack).find((pack) => pack.id === normalized) ?? null;
  return null;
}

export function sportsArenaPackPriceLabel(pack: SportsArenaPackDefinition): string {
  return pack.priceUsdCents === 0 ? "Free" : `$${(pack.priceUsdCents / 100).toFixed(2)}`;
}

export function sportsArenaPackOddsLabel(pack: SportsArenaPackDefinition): string {
  const playerLift = pack.playerOdds.qualityBias >= 1.75
    ? "elite-player lift"
    : pack.playerOdds.qualityBias >= 1.1
      ? "strong-player lift"
      : "wide-player spread";
  if (pack.id.startsWith("fifa-")) {
    if (pack.priceUsdCents === 0) return `World Cup base set · ${playerLift}`;
    return `${playerLift} · full World Cup pool`;
  }
  if (pack.id.startsWith("ufc-")) {
    return "full UFC roster · active-fight collision guard";
  }
  if (pack.priceUsdCents === 0 && pack.id !== "mlb-arena-reward") return `Base set · ${playerLift}`;
  return `${playerLift} · full MLB pool`;
}

export async function buildSportsArenaCardClaimHash(claim: Omit<SportsArenaCardClaim, "claimHash">): Promise<string> {
  return sha256Hex(claimHashPayload(claim));
}

export async function verifySportsArenaCardClaim(value: unknown): Promise<boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const claim = value as Partial<SportsArenaCardClaim>;
  if (
    claim.schema !== "receiz.sports_arena.card_claim.v1" ||
    typeof claim.collectibleId !== "string" ||
    !/^rsc_[0-9a-f]{16}$/i.test(claim.collectibleId) ||
    typeof claim.claimHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(claim.claimHash) ||
    typeof claim.cardId !== "string" ||
    typeof claim.pack !== "object" ||
    !claim.pack
  ) {
    return false;
  }
  const { claimHash, ...rest } = claim as SportsArenaCardClaim;
  return await buildSportsArenaCardClaimHash(rest) === claimHash.toLowerCase();
}

export async function buildSportsArenaPackCardClaims(input: BuildSportsArenaPackClaimsInput): Promise<SportsArenaCardClaim[]> {
  const snapshot = sportsArenaForSlug(input.sport);
  const sourceCards = input.cardPool?.length ? input.cardPool : projectSportsArenaCards(snapshot);
  const cards = sourceCards.map((card) => sportsArenaStablePackCard(card, snapshot.cards, input.sport));
  const registryBasisHash = input.registryBasisHash || snapshot.cards.map((card) => card.baseCard.basisHash).join(":").slice(0, 64);
  const isSoccer = input.sport === "soccer";
  const isFight = input.sport === "fight";
  const directCardId = typeof input.directCardId === "string" ? input.directCardId.trim() : "";
  const directCardIndex = directCardId
    ? sourceCards.findIndex((card) =>
        card.id === directCardId ||
        sportsArenaStablePackCardId(card, snapshot.cards, input.sport) === directCardId)
    : -1;
  const directCard = directCardIndex >= 0 ? cards[directCardIndex] ?? null : null;
  if (directCardId && !directCard) throw new Error("sports_arena_pack_direct_card_missing");
  const random = sportsArenaSeededRandom(jcsCanonicalize({
    schema: "receiz.sports_arena.pack.open_seed.v1",
    sport: input.sport,
    packId: input.pack.id,
    receiptId: input.receipt.receiptId,
    packSeed: input.receipt.packSeed,
    clientNonce: input.receipt.clientNonce,
    directCardId: directCard?.id ?? null,
  }));
  const selectedCardIds = new Set<string>();
  const blockedFightTeamCodes = new Set<string>();
  const selectedSlots = Array.from({ length: input.pack.cardCount }, (_, slotIndex) => {
    const rarity = chooseSportsArenaPackRarity(input.pack, random, slotIndex);
    const selected = directCard && slotIndex === 0
      ? {
          card: directCard,
          economy: sportsArenaPlayerSelectionEconomy(
            input.pack,
            directCard,
            registryBasisHash,
            input.ownerCardCounts?.get(directCard.id) ?? 0,
            input.ownerTeamCounts?.get(sportsArenaNormalizedTeamCode(directCard.teamCode)) ?? 0,
          ),
        }
      : chooseSportsArenaPackCard(input.pack, cards, random, slotIndex, selectedCardIds, registryBasisHash, input.ownerCardCounts, input.ownerTeamCounts, isFight ? blockedFightTeamCodes : undefined);
    const card = selected.card;
    selectedCardIds.add(card.id);
    if (isFight && !directCard) {
      blockedFightTeamCodes.add(sportsArenaNormalizedTeamCode(card.teamCode));
      blockedFightTeamCodes.add(sportsArenaNormalizedTeamCode(card.opponentCode));
    }
    return { card, rarity, selected, slotIndex };
  });
  const issues = input.issueAllocator
    ? await Promise.all(selectedSlots.map(({ card, rarity, slotIndex }) => (
        input.issueAllocator!({
          sport: input.sport,
          cardId: card.id,
          rarity,
          packId: input.pack.id,
          purchaseId: input.receipt.receiptId,
          slotIndex,
        })
      )))
    : selectedSlots.map(() => null);

  return await Promise.all(selectedSlots.map(async ({ card, rarity, selected, slotIndex }, index) => {
    const issue = issues[index] ?? null;
    const slotSeed = await sha256Hex(jcsCanonicalize({
      schema: "receiz.sports_arena.pack.card_slot.v1",
      sport: input.sport,
      packId: input.pack.id,
      receiptId: input.receipt.receiptId,
      packSeed: input.receipt.packSeed,
      slotIndex,
      rarity,
      cardId: card.id,
    }));
    const rookieProofRows = card.rookie?.isRookie
      ? [
          `rookie-class:${card.rookie.rookieClass}`,
          `rookie-market:${card.rookie.rookieMarketKey}`,
          `rookie-basis:${card.rookie.basisHash}`,
        ]
      : [];
    const claimWithoutHash: Omit<SportsArenaCardClaim, "claimHash"> = {
      schema: "receiz.sports_arena.card_claim.v1",
      collectibleId: `rsc_${slotSeed.slice(0, 16)}`,
      sport: input.sport,
      cardId: card.id,
      athlete: card.athlete,
      teamCode: card.teamCode,
      position: card.position,
      side: card.side,
      baseTier: card.tier,
      rarity,
      variantName: SPORTS_ARENA_RARITY_VARIANT[rarity],
      rating: card.rating,
      projectedScore: card.projectedScore,
      media: card.media,
      baseCard: card.baseCard,
      rookie: card.rookie ?? null,
      playerBio: card.playerBio ?? null,
      ownerUserId: input.ownerUserId,
      ownerUsername: input.ownerUsername,
      issuedAtMs: input.receipt.openedAt ? Date.parse(input.receipt.openedAt) + slotIndex : Date.now() + slotIndex,
      ...(issue ? { issue } : {}),
      pack: {
        packId: input.pack.id,
        packName: input.pack.label,
        purchaseId: input.receipt.receiptId,
        clientNonce: input.receipt.clientNonce,
        slotIndex,
        cardCount: input.pack.cardCount,
        priceUsdCents: input.pack.priceUsdCents,
        oddsLine: sportsArenaPackOddsLabel(input.pack),
        rarityOddsLine: sportsArenaPackExactRarityOddsLine(input.pack, rarity),
        rarityOddsKind: "exact-variant-per-pack",
        seedHash: input.receipt.packSeed.slice(0, 32),
      },
      proof: {
        source: isSoccer ? "fifa-world-cup-26" : isFight ? "ufc-fighter-roster" : "mlb-base-set",
        deterministicKey: `receiz.sports_arena.card_claim:${input.receipt.receiptId}:${slotIndex}`,
        basisHash: card.baseCard.basisHash,
        statBasis: [
          `sport:${input.sport}`,
          card.statLine,
          card.liveLine,
          `projected:${card.projectedScore.toFixed(1)}`,
          `player-scarcity:${selected.economy.playerScarcityTier}`,
          `selection-weight:${selected.economy.selectionWeight}`,
          ...(selected.economy.ownerCollectionCount
            ? [
                `collection-count:${selected.economy.ownerCollectionCount}`,
                `collection-spread-weight:${selected.economy.collectionSpreadWeight}`,
              ]
            : []),
          ...(selected.economy.ownerTeamCount
            ? [
                `team-collection-count:${selected.economy.ownerTeamCount}`,
                `team-spread-weight:${selected.economy.teamSpreadWeight}`,
              ]
            : []),
          ...rookieProofRows,
          ...(isFight
            ? [
                "ufc-main-event-entry-fee-usd-cents:300",
                "fight-card-pack-spread:no-same-fight-collision",
                "event-appends-score-every-fight",
                "proof-clips-link-to-fighter-card",
                "victory-card-witness-links-to-fighter-card",
              ]
            : []),
        ],
        rule: isSoccer
          ? "World Cup Sports pack cards are derived from the signed pack receipt seed, independent variant rarity odds, a Fibonacci-weighted FIFA World Cup card economy, and collector spread that reduces repeat-card and repeat-team weight without removing eligibility. Rarity is collectible issuance, not match strength. World Cup and later soccer appends may extend the card; the sealed soccer card identity stays fixed."
          : isFight
            ? "UFC Fighter Card packs are derived from the signed purchase receipt seed across the full UFC Fighter Card roster. Each sealed pack blocks active booked-fight opponents once one fighter is pulled, so one pack cannot deal opponents facing each other on the active slate. The owned Fighter Card identity stays fixed while UFC Fight Pick 5 Main Event settlement appends event scores, proof clips, win/loss state, Victory Card witness links, ownership chain, and streak provenance."
          : "Sports pack cards are derived from the signed pack receipt seed, independent variant rarity odds, a Fibonacci-weighted MLB base-set player economy, and collector spread that reduces repeat-player and repeat-team weight without removing eligibility. Rarity is collectible issuance, not player stat strength. Rookie market status is deterministic MLB debut metadata. Live game outcomes may append later records; the sealed player identity stays fixed.",
      },
      economy: selected.economy,
    };
    const claimHash = await buildSportsArenaCardClaimHash(claimWithoutHash);
    return { ...claimWithoutHash, claimHash };
  }));
}

export function sportsArenaOwnedCardIdsFromClaims(claims: readonly SportsArenaCardClaim[]): string[] {
  return claims.map((claim) => claim.cardId);
}
