import type {
  SportsArenaVaultCardManifest,
  SportsArenaVaultCardManifestCard,
} from "./sportsArenaVaultCardExport";
import type {
  SportsVaultExplorerCompactItemSeed,
  SportsVaultExplorerPayload,
} from "./vault/[vaultCardId]/SportsVaultExplorer";

function compactSportsVaultProofRuleIndex(rule: string | null | undefined, proofRules: string[]): number {
  const clean = typeof rule === "string" ? rule.trim() : "";
  if (!clean) return -1;
  const existing = proofRules.indexOf(clean);
  if (existing >= 0) return existing;
  proofRules.push(clean);
  return proofRules.length - 1;
}

function compactSportsVaultStatBasisRows(rows: readonly string[] | null | undefined): string | null {
  if (!rows?.length) return null;
  return rows.join("\u001f");
}

function compactSportsVaultEncodeRowCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return encodeURIComponent(String(value));
}

function compactSportsVaultEncodeRows(rows: SportsVaultExplorerCompactItemSeed["rows"]): string {
  return rows
    .map((row) => row.map(compactSportsVaultEncodeRowCell).join("\t"))
    .join("\n");
}

function manifestCardRating(card: SportsArenaVaultCardManifestCard): number | null {
  return typeof card.rating === "number" && Number.isFinite(card.rating) ? card.rating : null;
}

function manifestCardProjectedScore(card: SportsArenaVaultCardManifestCard): number | null {
  return typeof card.projectedScore === "number" && Number.isFinite(card.projectedScore) ? card.projectedScore : null;
}

export function sportsVaultCompactItemSeedFromManifestCards(
  cards: readonly SportsArenaVaultCardManifestCard[],
): SportsVaultExplorerCompactItemSeed {
  const proofRules: string[] = [];
  const rows: SportsVaultExplorerCompactItemSeed["rows"] = cards.map((card) => [
    card.collectibleId,
    card.claimHash,
    card.sport,
    card.athlete,
    card.teamCode,
    card.position,
    card.rarity,
    card.collectibleId,
    card.media?.source === "mlb" && card.media.sourceId ? null : card.media?.imageUrl ?? null,
    card.media?.deterministicAssetId ?? null,
    card.media?.dominantColor ?? null,
    card.media?.source ?? null,
    card.media?.sourceId ?? null,
    manifestCardRating(card),
    manifestCardProjectedScore(card),
    card.baseCard?.sealedCardId ?? card.collectibleId,
    card.baseTier ?? card.rarity,
    card.proof?.source ?? null,
    card.proof?.basisHash ?? card.baseCard?.basisHash ?? card.claimHash,
    compactSportsVaultProofRuleIndex(card.proof?.rule ?? "Manifest truth projected from the sealed Sports Vault image.", proofRules),
    compactSportsVaultStatBasisRows(card.proof?.statBasis),
    null,
    card.baseCard?.issueLine ?? null,
    null,
    null,
    null,
    card.scoreSummary?.currentScore ?? null,
    card.scoreSummary?.historyCount ?? null,
    card.scoreSummary?.latestAppendLabel ?? null,
    card.scoreSummary?.latestAppendAt ?? null,
  ]);

  return {
    schema: "receiz.sports_vault.explorer_items.compact.v1",
    rows: [],
    rowText: compactSportsVaultEncodeRows(rows),
    proofRules,
    detailItems: [],
    listings: [],
  };
}

export function sportsVaultExplorerPayloadFromManifest(args: {
  displayName?: string | null;
  manifest: SportsArenaVaultCardManifest;
  ownerLabel?: string | null;
  ownerUserId: string;
  username?: string | null;
}): SportsVaultExplorerPayload {
  const ownerLabel = args.ownerLabel ?? args.manifest.ownerLabel ?? "Sports Vault";
  return {
    vaultCardId: args.manifest.vaultCardId,
    owner: {
      userId: args.ownerUserId,
      label: ownerLabel,
      username: args.username ?? null,
      displayName: args.displayName ?? null,
    },
    manifest: args.manifest as unknown as Record<string, unknown>,
    archiveSha256Hex: args.manifest.integrity.archiveSha256Hex,
    merkleRootSha256: args.manifest.integrity.merkleRootSha256,
    cardCount: args.manifest.cardCount,
    createdAtMs: args.manifest.createdAtMs,
    items: [],
    compactItems: sportsVaultCompactItemSeedFromManifestCards(args.manifest.cards),
  };
}
