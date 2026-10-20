import type { SportsArenaCard, SportsArenaSlug } from "@/app/lib/game/sportsArena";
import type { SportsArenaCardAppendProofHead } from "@/app/lib/game/sportsArenaCardAppendProofHead";
import { canonicalSha256Hex } from "@/app/lib/vault/crypto";

export const SPORTS_CARD_STATE_HEAD_SCHEMA = "receiz.sports_arena.card_state_head.v119" as const;

export type SportsCardStateHeadV119 = Readonly<{
  schema: typeof SPORTS_CARD_STATE_HEAD_SCHEMA;
  ownerUserId: string;
  sport: SportsArenaSlug;
  collectibleId: string;
  claimHash: string;
  cardId: string;
  headKaiUpulse: string;
  parentStateDigest: string;
  stateDigest: string;
  sourceArtifactDigest: string;
  appendProofHeadDigest: string;
  appendMerkleRootSha256: string;
  fibonacciLog: readonly unknown[];
  currentRating: number;
  projectedScore: number;
  currentScore: number;
  currentPhiValue: number;
  currentUsdValue: number;
  historyEventCount: number;
  latestEventLabel: string | null;
}>;

type SportsCardStateIdentity = Readonly<{
  collectibleId: string;
  claimHash: string;
  cardId: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function sportsCardStateHeadFromValue(value: unknown): SportsCardStateHeadV119 | null {
  if (!isRecord(value) || value.schema !== SPORTS_CARD_STATE_HEAD_SCHEMA) return null;
  if (
    typeof value.ownerUserId !== "string" || !value.ownerUserId.trim() ||
    (value.sport !== "baseball" && value.sport !== "soccer" && value.sport !== "fight") ||
    typeof value.collectibleId !== "string" || !/^rsc_[0-9a-f]{16}$/.test(value.collectibleId) ||
    typeof value.claimHash !== "string" || !isDigest(value.claimHash) ||
    typeof value.cardId !== "string" || !value.cardId.trim() ||
    typeof value.headKaiUpulse !== "string" || !/^\d+$/.test(value.headKaiUpulse) ||
    !isDigest(value.parentStateDigest) ||
    !isDigest(value.stateDigest) ||
    !isDigest(value.sourceArtifactDigest) ||
    !isDigest(value.appendProofHeadDigest) ||
    !isDigest(value.appendMerkleRootSha256) ||
    !Array.isArray(value.fibonacciLog) ||
    !isFiniteNumber(value.currentRating) ||
    !isFiniteNumber(value.projectedScore) ||
    !isFiniteNumber(value.currentScore) ||
    !isFiniteNumber(value.currentPhiValue) || value.currentPhiValue < 0 ||
    !isFiniteNumber(value.currentUsdValue) || value.currentUsdValue < 0 ||
    !isNonNegativeSafeInteger(value.historyEventCount) ||
    !(value.latestEventLabel === null || typeof value.latestEventLabel === "string")
  ) return null;

  return {
    schema: SPORTS_CARD_STATE_HEAD_SCHEMA,
    ownerUserId: value.ownerUserId,
    sport: value.sport,
    collectibleId: value.collectibleId,
    claimHash: value.claimHash,
    cardId: value.cardId,
    headKaiUpulse: value.headKaiUpulse,
    parentStateDigest: value.parentStateDigest,
    stateDigest: value.stateDigest,
    sourceArtifactDigest: value.sourceArtifactDigest,
    appendProofHeadDigest: value.appendProofHeadDigest,
    appendMerkleRootSha256: value.appendMerkleRootSha256,
    fibonacciLog: value.fibonacciLog,
    currentRating: value.currentRating,
    projectedScore: value.projectedScore,
    currentScore: value.currentScore,
    currentPhiValue: value.currentPhiValue,
    currentUsdValue: value.currentUsdValue,
    historyEventCount: value.historyEventCount,
    latestEventLabel: value.latestEventLabel,
  };
}

function matchesIdentity(head: SportsCardStateHeadV119, identity: SportsCardStateIdentity): boolean {
  return head.collectibleId === identity.collectibleId
    && head.claimHash === identity.claimHash
    && head.cardId === identity.cardId;
}

/**
 * Selects only among heads already admitted by their enclosing sports proof object.
 * Parsing a self-consistent projection is deliberately not proof admission.
 */
export function selectHighestVerifiedSportsCardStateHead(
  admittedHeads: readonly unknown[],
  identity: SportsCardStateIdentity,
): SportsCardStateHeadV119 | null {
  const candidates = admittedHeads
    .map(sportsCardStateHeadFromValue)
    .filter((head): head is SportsCardStateHeadV119 => Boolean(head && matchesIdentity(head, identity)))
    .sort((left, right) => {
      const kaiOrder = BigInt(right.headKaiUpulse) > BigInt(left.headKaiUpulse)
        ? 1
        : BigInt(right.headKaiUpulse) < BigInt(left.headKaiUpulse) ? -1 : 0;
      return kaiOrder || left.stateDigest.localeCompare(right.stateDigest);
    });
  const selected = candidates[0] ?? null;
  if (!selected) return null;
  const sameKaiConflict = candidates.some((candidate) => (
    candidate.headKaiUpulse === selected.headKaiUpulse
    && candidate.stateDigest !== selected.stateDigest
  ));
  return sameKaiConflict ? null : selected;
}

export function projectSportsCardFromStateHead(
  card: SportsArenaCard,
  head: SportsCardStateHeadV119 | null,
): SportsArenaCard {
  if (!head || head.cardId !== card.id) return card;
  return {
    ...card,
    rating: head.currentRating,
    projectedScore: head.projectedScore,
    currentScore: head.currentScore,
    historyCount: head.historyEventCount,
    liveLine: head.latestEventLabel?.trim() || card.liveLine,
  };
}

export function projectSportsCardsFromHighestVerifiedStateHeads(
  cards: readonly SportsArenaCard[],
  admittedHeads: readonly unknown[],
): SportsArenaCard[] {
  const heads = admittedHeads
    .map(sportsCardStateHeadFromValue)
    .filter((head): head is SportsCardStateHeadV119 => Boolean(head));
  return cards.map((card) => {
    const cardHeads = heads
      .filter((head) => head.cardId === card.id)
      .sort((left, right) => (
        BigInt(right.headKaiUpulse) > BigInt(left.headKaiUpulse) ? 1
          : BigInt(right.headKaiUpulse) < BigInt(left.headKaiUpulse) ? -1
            : left.stateDigest.localeCompare(right.stateDigest)
      ));
    const selected = cardHeads[0] ?? null;
    return projectSportsCardFromStateHead(card, selected);
  });
}

export async function createSportsCardStateHeadV119(args: Readonly<{
  ownerUserId: string;
  sport: SportsArenaSlug;
  collectibleId: string;
  claimHash: string;
  card: Pick<SportsArenaCard, "id" | "rating" | "projectedScore" | "currentScore" | "historyCount" | "liveLine">;
  currentPhiValue: number;
  currentUsdValue: number;
  historyEventCount?: number;
  appendProofHead: SportsArenaCardAppendProofHead | null;
  previousHead?: SportsCardStateHeadV119 | null;
  predecessorArtifactDigest?: string | null;
  kaiPulse: number;
  sourceKaiUpulse?: string | null;
}>): Promise<SportsCardStateHeadV119> {
  const zeroDigest = "0".repeat(64);
  const previousHead = sportsCardStateHeadFromValue(args.previousHead);
  const appendProofHeadDigest = args.appendProofHead
    ? await canonicalSha256Hex(args.appendProofHead)
    : zeroDigest;
  const parentStateDigest = previousHead?.stateDigest ?? zeroDigest;
  // Card-state projection reuses the admitted append proof's exact sparse ancestry.
  // The sports-vault recursive carrier owns state-successor Fibonacci checkpoints;
  // fabricating dense card-local distances here would conflate the two proof roles.
  const fibonacciLog = args.appendProofHead?.fibonacciLog
    ?? previousHead?.fibonacciLog
    ?? [];
  const payload = {
    schema: SPORTS_CARD_STATE_HEAD_SCHEMA,
    ownerUserId: args.ownerUserId,
    sport: args.sport,
    collectibleId: args.collectibleId,
    claimHash: args.claimHash,
    cardId: args.card.id,
    headKaiUpulse: [args.appendProofHead?.kaiLatestUpulse, args.sourceKaiUpulse, String(Math.max(0, Math.trunc(args.kaiPulse)))]
      .filter((value): value is string => Boolean(value && /^\d+$/.test(value)))
      .sort((left, right) => BigInt(right) > BigInt(left) ? 1 : BigInt(right) < BigInt(left) ? -1 : 0)[0]!,
    parentStateDigest,
    sourceArtifactDigest: isDigest(args.predecessorArtifactDigest)
      ? args.predecessorArtifactDigest
      : args.claimHash,
    appendProofHeadDigest,
    appendMerkleRootSha256: args.appendProofHead?.appendMerkleRootSha256 ?? args.claimHash,
    fibonacciLog,
    currentRating: args.card.rating,
    projectedScore: args.card.projectedScore,
    currentScore: args.card.currentScore,
    currentPhiValue: args.currentPhiValue,
    currentUsdValue: args.currentUsdValue,
    historyEventCount: Number.isSafeInteger(args.historyEventCount) && Number(args.historyEventCount) >= 0
      ? Number(args.historyEventCount)
      : args.card.historyCount,
    latestEventLabel: args.card.liveLine?.trim() || null,
  } as const;
  return {
    ...payload,
    stateDigest: await canonicalSha256Hex(payload),
  };
}
