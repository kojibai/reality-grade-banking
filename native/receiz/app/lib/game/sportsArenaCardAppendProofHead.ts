import type { SportsArenaSlug } from "@/app/lib/game/sportsArena";

export const SPORTS_ARENA_CARD_APPEND_PROOF_HEAD_SCHEMA =
  "receiz.sports_arena.card_append_rollup.v1" as const;

export type SportsArenaCardAppendProofHead = {
  schema: typeof SPORTS_ARENA_CARD_APPEND_PROOF_HEAD_SCHEMA;
  ownerUserId: string;
  sport: SportsArenaSlug;
  collectibleId: string;
  claimHash: string;
  cardId: string;
  appendCount: number;
  eventCount: number;
  videoCount: number;
  scoreDeltaTotal: number;
  phiDeltaMicroTotal: number;
  firstObservedAt: string | null;
  latestObservedAt: string | null;
  latestEventKey: string | null;
  latestAppendHash: string;
  appendMerkleRootSha256: string;
  kaiFirstUpulse: string | null;
  kaiLatestUpulse: string | null;
  fibonacciLog: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

function nonNegativeInteger(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function kaiValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

export function sportsArenaCardAppendProofHeadFromValue(
  value: unknown,
): SportsArenaCardAppendProofHead | null {
  if (!isRecord(value) || value.schema !== SPORTS_ARENA_CARD_APPEND_PROOF_HEAD_SCHEMA) return null;
  const ownerUserId = stringValue(value.ownerUserId);
  const sport = stringValue(value.sport);
  const collectibleId = stringValue(value.collectibleId)?.toLowerCase() ?? null;
  const claimHash = stringValue(value.claimHash)?.toLowerCase() ?? null;
  const cardId = stringValue(value.cardId);
  const appendCount = nonNegativeInteger(value.appendCount);
  const eventCount = nonNegativeInteger(value.eventCount);
  const videoCount = nonNegativeInteger(value.videoCount);
  const scoreDeltaTotal = numberValue(value.scoreDeltaTotal);
  const phiDeltaMicroTotal = numberValue(value.phiDeltaMicroTotal);
  const latestAppendHash = stringValue(value.latestAppendHash)?.toLowerCase() ?? null;
  const appendMerkleRootSha256 = stringValue(value.appendMerkleRootSha256)?.toLowerCase() ?? null;
  const kaiFirstUpulse = kaiValue(value.kaiFirstUpulse);
  const kaiLatestUpulse = kaiValue(value.kaiLatestUpulse);
  if (
    !ownerUserId ||
    !["baseball", "soccer", "fight"].includes(sport ?? "") ||
    !collectibleId || !/^rsc_[0-9a-f]{16}$/.test(collectibleId) ||
    !claimHash || !/^[0-9a-f]{64}$/.test(claimHash) ||
    !cardId ||
    appendCount === null || eventCount === null || videoCount === null ||
    scoreDeltaTotal === null || phiDeltaMicroTotal === null ||
    !latestAppendHash || !/^[0-9a-f]{64}$/.test(latestAppendHash) ||
    !appendMerkleRootSha256 || !/^[0-9a-f]{64}$/.test(appendMerkleRootSha256) ||
    !Array.isArray(value.fibonacciLog)
  ) {
    return null;
  }
  if (appendCount > 0 && (!kaiLatestUpulse || latestAppendHash === "0".repeat(64))) return null;

  return {
    schema: SPORTS_ARENA_CARD_APPEND_PROOF_HEAD_SCHEMA,
    ownerUserId,
    sport: sport as SportsArenaSlug,
    collectibleId,
    claimHash,
    cardId,
    appendCount,
    eventCount,
    videoCount,
    scoreDeltaTotal,
    phiDeltaMicroTotal,
    firstObservedAt: stringValue(value.firstObservedAt),
    latestObservedAt: stringValue(value.latestObservedAt),
    latestEventKey: stringValue(value.latestEventKey),
    latestAppendHash,
    appendMerkleRootSha256,
    kaiFirstUpulse,
    kaiLatestUpulse,
    fibonacciLog: value.fibonacciLog,
  };
}
