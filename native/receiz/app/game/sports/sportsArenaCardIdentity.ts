import type {
  SportsArenaCard,
  SportsArenaPackDefinition,
  SportsArenaSlug,
} from "@/app/lib/game/sportsArena";
import {
  sportsArenaFreePackIdForSport as canonicalSportsArenaFreePackIdForSport,
  sportsArenaPackPriceLabel,
  type SportsArenaCardClaim,
} from "@/app/lib/game/sportsArenaPacks";

export type SportsCardVaultFilter = "all" | "owned" | "rarity" | "rookies" | "hitters" | "infield" | "outfield" | "pitchers" | "champions" | "live";
export type BaseballPositionFilter = "all" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH" | "SP" | "RP" | "CP" | "KICK" | "HOST" | "FWD" | "GK" | "DF" | "MF" | "FW" | "PK" | "PATH" | "FINAL" | "TIME" | "CALL" | "WW" | "MW" | "LHW" | "LW" | "HW" | "WSW" | "BW" | "CW" | "FLW" | "WBW" | "WFLW";

export const SPORTS_VAULT_CATEGORY_FILTERS: { key: SportsCardVaultFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "rarity", label: "Rarity" },
  { key: "rookies", label: "Rookies" },
  { key: "hitters", label: "Hitters" },
  { key: "infield", label: "Infield" },
  { key: "outfield", label: "Outfield" },
  { key: "pitchers", label: "Pitchers" },
  { key: "champions", label: "Elite" },
  { key: "live", label: "Live" },
];

export const SOCCER_VAULT_CATEGORY_FILTERS: { key: SportsCardVaultFilter; label: string }[] = [
  { key: "all", label: "All Players" },
  { key: "owned", label: "Owned" },
  { key: "rarity", label: "Rarity" },
  { key: "pitchers", label: "Goalkeepers" },
  { key: "infield", label: "Defenders" },
  { key: "outfield", label: "Midfielders" },
  { key: "hitters", label: "Forwards" },
  { key: "champions", label: "Elite" },
  { key: "live", label: "Live" },
];

export const FIGHT_VAULT_CATEGORY_FILTERS: { key: SportsCardVaultFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "rarity", label: "Rarity" },
  { key: "hitters", label: "LW" },
  { key: "infield", label: "HW" },
  { key: "outfield", label: "BW/FW" },
  { key: "pitchers", label: "FLW/MW" },
  { key: "champions", label: "Champs" },
  { key: "live", label: "Live" },
];

export function sportsArenaFreePackIdForSport(sport: SportsArenaSlug): string {
  return canonicalSportsArenaFreePackIdForSport(sport);
}

export function sportsPackShelfSubtitle(pack: SportsArenaPackDefinition): string {
  return `${pack.cardCount} card${pack.cardCount === 1 ? "" : "s"} · ${sportsArenaPackPriceLabel(pack)}`;
}

export function sportsCardIsRookie(card: Pick<SportsArenaCard, "rookie" | "tags">): boolean {
  return card.rookie?.isRookie === true || card.tags.some((tag) => tag.toLowerCase() === "rookie");
}

export function sportsCardPlayerKey(card: Pick<SportsArenaCard, "id" | "media">): string {
  const sourceId = card.media.sourceId.trim();
  return sourceId ? `mlb-person:${sourceId}` : `card:${card.id}`;
}

export function sportsClaimPlayerKey(claim: Pick<SportsArenaCardClaim, "cardId" | "media">): string {
  const sourceId = claim.media.sourceId.trim();
  return sourceId ? `mlb-person:${sourceId}` : `card:${claim.cardId}`;
}

export function sportsClaimMatchesCard(claim: SportsArenaCardClaim, card: SportsArenaCard): boolean {
  return claim.cardId === card.id || sportsClaimPlayerKey(claim) === sportsCardPlayerKey(card);
}

export function sportsCardOwnedCount(card: SportsArenaCard, counts: Map<string, number>): number {
  return counts.get(sportsCardPlayerKey(card)) ?? 0;
}

export function sportsCardPosition(card: SportsArenaCard): BaseballPositionFilter {
  const normalized = card.position.toUpperCase();
  if (normalized === "C" || normalized === "1B" || normalized === "2B" || normalized === "3B" || normalized === "SS" ||
    normalized === "LF" || normalized === "CF" || normalized === "RF" || normalized === "DH" || normalized === "SP" ||
    normalized === "RP" || normalized === "CP" || normalized === "KICK" || normalized === "HOST" || normalized === "FWD" ||
    normalized === "GK" || normalized === "DF" || normalized === "MF" || normalized === "FW" || normalized === "PK" || normalized === "PATH" || normalized === "FINAL" || normalized === "TIME" ||
    normalized === "CALL" || normalized === "WW" || normalized === "MW" || normalized === "LHW" || normalized === "LW" || normalized === "HW" ||
    normalized === "WSW" || normalized === "BW" || normalized === "CW" || normalized === "FLW" || normalized === "WBW" || normalized === "WFLW") {
    return normalized;
  }
  return "all";
}

export function sportsCardMatchesFilter(
  card: SportsArenaCard,
  filter: SportsCardVaultFilter,
  ownedCounts: Map<string, number>,
): boolean {
  const position = sportsCardPosition(card);
  if (card.baseCard.sport === "soccer") {
    if (filter === "owned") return sportsCardOwnedCount(card, ownedCounts) > 0;
    if (filter === "rarity") return sportsCardOwnedCount(card, ownedCounts) > 0;
    if (filter === "pitchers") return position === "GK";
    if (filter === "infield") return position === "DF";
    if (filter === "outfield") return position === "MF";
    if (filter === "hitters") return position === "FW";
    if (filter === "champions") return card.tier === "Champion" || card.tier === "Mythic";
    if (filter === "live") return card.currentScore !== 0;
    return true;
  }
  if (card.baseCard.sport === "fight") {
    if (filter === "owned") return sportsCardOwnedCount(card, ownedCounts) > 0;
    if (filter === "rarity") return sportsCardOwnedCount(card, ownedCounts) > 0;
    if (filter === "hitters") return position === "LW" || position === "WW";
    if (filter === "infield") return position === "HW" || position === "LHW";
    if (filter === "outfield") return position === "FW" || position === "BW" || position === "WBW" || position === "WFLW" || position === "WSW";
    if (filter === "pitchers") return position === "FLW" || position === "MW" || position === "CW";
    if (filter === "champions") return card.tier === "Champion" || card.tier === "Mythic";
    if (filter === "live") return card.currentScore !== 0;
    return true;
  }
  if (filter === "owned") return sportsCardOwnedCount(card, ownedCounts) > 0;
  if (filter === "rarity") return sportsCardOwnedCount(card, ownedCounts) > 0;
  if (filter === "rookies") return sportsCardIsRookie(card);
  if (filter === "hitters") return card.side === "batter";
  if (filter === "infield") return position === "C" || position === "1B" || position === "2B" || position === "3B" || position === "SS" || position === "DH";
  if (filter === "outfield") return position === "LF" || position === "CF" || position === "RF";
  if (filter === "pitchers") return card.side === "pitcher";
  if (filter === "champions") return card.tier === "Champion" || card.tier === "Mythic";
  if (filter === "live") return card.currentScore !== 0;
  return true;
}

export function sportsCardMatchesPosition(card: SportsArenaCard, filter: BaseballPositionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "RP") return sportsCardPosition(card) === "RP" || sportsCardPosition(card) === "CP";
  if (filter === "CP") return sportsCardPosition(card) === "CP";
  return sportsCardPosition(card) === filter;
}

export function sportsCardSlugToken(value: string): string {
  const tokens = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && token.length > 1);
  return tokens[tokens.length - 1] ?? tokens[0] ?? "player";
}

function sportsCardMediaIdentityPrefix(source: SportsArenaCard["media"]["source"]): string {
  if (source === "fifa") return "rsc_fifa";
  if (source === "ufc") return "rsc_ufc";
  return "rsc_mlb";
}

export function sportsCardDisplayCode(card: Pick<SportsArenaCard, "athlete" | "media" | "baseCard">): string {
  const sealedCardId = card.baseCard.sealedCardId.trim();
  if (sealedCardId) return sealedCardId;
  const personId = card.media.sourceId.trim();
  return `${sportsCardMediaIdentityPrefix(card.media.source)}_${sportsCardSlugToken(card.athlete)}_${personId || "player"}`;
}

export function sportsClaimDisplayCode(claim: SportsArenaCardClaim): string {
  const sealedCardId = claim.baseCard.sealedCardId.trim();
  if (sealedCardId) return `${sealedCardId}_${claim.claimHash.slice(0, 8)}`;
  return `${sportsCardMediaIdentityPrefix(claim.media.source)}_${sportsCardSlugToken(claim.athlete)}_${claim.claimHash.slice(0, 8)}`;
}
