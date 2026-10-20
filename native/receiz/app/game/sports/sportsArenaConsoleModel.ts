import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { deflateSync, inflateSync } from "fflate";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";
import sportsEconomyCurrentRegistrySeedJson from "@/app/lib/game/sportsEconomyCurrentRegistrySeed.v1.json";
import type { SportsArenaVaultCardDownload, SportsArenaVaultCardManifest, SportsArenaVaultCardManifestCard, SportsArenaVaultCardScoreSummary } from "./sportsArenaVaultCardExport";
import { sportsVaultExplorerPayloadFromManifest } from "./sportsVaultExplorerProjection";
import { writeSportsVaultRouteSnapshot } from "./sportsVaultRouteHydration";
import { encodeSportsCardProofUrlClaim } from "./sportsCardProofUrl";
import { admitWalletSettlementAppend } from "@/app/lib/wallet/backgroundHydration";
import {
  selectHighestVerifiedSportsCardStateHead,
  sportsCardStateHeadFromValue,
  type SportsCardStateHeadV119,
} from "./sportsCardStateHead";
import { sportsArenaLiveVaultCardId, sportsArenaLiveVaultPath, sportsArenaLiveVaultPublicPath } from "@/app/lib/game/sportsArenaVaultShowcase";
import {
  SPORTS_ARENA_SOCCER_ENTRY_LIVE_WINDOW_MS,
  SPORTS_ARENA_PACKS,
  SPORTS_ARENA_DAILY_TOURNAMENT,
  UFC_FIGHTER_ROSTER_CARDS,
  mergeSportsArenaPlayerBio,
  projectSportsArenaTournamentEconomics,
  projectSportsArenaTournamentLaunchEstimate,
  sportsArenaTournamentDefinitionForSport,
  sportsArenaTournamentKeyForSport,
  type SportsArenaAppend,
  type SportsArenaCard,
  type SportsArenaFieldState,
  type SportsArenaLiveAppendRecord,
  type SportsArenaLiveFeed,
  type SportsArenaLivePlayer,
  type SportsArenaLiveAppendSubjectRole,
  type SportsArenaPackDefinition,
  type SportsArenaPackReceipt,
  type SportsArenaScoreboard,
  type SportsArenaSlug,
  type SportsArenaSnapshot,
} from "@/app/lib/game/sportsArena";
import {
  sportsArenaCardAppendProofHeadFromValue,
  type SportsArenaCardAppendProofHead,
} from "@/app/lib/game/sportsArenaCardAppendProofHead";
import {
  sportsArenaEventMediaClipForMoment,
  sportsArenaEventMediaClipFromValue,
  sportsArenaRecordedVideoContradictsEventType,
  sportsArenaRecordedEventVideoMatchesMoment,
  sportsArenaRecordedEventVideoTextMatchesMoment,
  type SportsArenaEventMediaClip,
  type SportsArenaRecordedEventVideo,
} from "@/app/lib/game/sportsArenaEventMedia";
import { scoreSportsArenaMlbEvent } from "@/app/lib/game/sportsArenaScoring";
import {
  sportsCardRosterBlock,
  sportsCardRosterStatusLabel as sharedSportsCardRosterStatusLabel,
} from "@/app/lib/game/sportsArenaRoster";
import {
  sportsArenaClaimCirculationLine,
  sportsArenaClaimIssueLine,
  sportsArenaClaimRarityOddsLine,
  sportsArenaPackCatalogForSport,
  sportsArenaPackOddsBreakdown,
  sportsArenaPackPriceLabel,
  sportsArenaNormalizedTeamCode,
  SPORTS_ARENA_FREE_PACK_ID as CANONICAL_SPORTS_ARENA_FREE_PACK_ID,
  SPORTS_WORLD_CUP_FREE_PACK_ID as CANONICAL_SPORTS_WORLD_CUP_FREE_PACK_ID,
  verifySportsArenaCardClaim,
  type SportsArenaCardClaim,
  type SportsArenaCardIssue,
} from "@/app/lib/game/sportsArenaPacks";
import type { ReceizVaultRestoredFile } from "@/app/lib/vault/types";
import { buildVerifiableReceizVaultRestoreZip } from "@/app/lib/vault/sealedDownloads";
import {
  formatSportsArenaCardUsdCents,
  type SportsArenaCardListing,
} from "@/app/lib/game/sportsArenaCardMarket";
import {
  sportsArenaCardClaimUsdValue,
  sportsArenaCardValueProjection,
  type SportsArenaCardValueProjection,
  sportsArenaOwnedCardCurrentProjectedScore,
  sportsArenaOwnedCardCurrentRating,
  sportsCardDeterministicUsdValue,
} from "@/app/lib/game/sportsArenaCardValue";
import {
  sportsArenaPhiFromUsdValue,
  sportsArenaUsdFromValueBasis,
} from "@/app/lib/game/sportsArenaValue";
import { normalizePlan, type Plan } from "@/app/lib/premium/plan";
import { playHapticProfile } from "@/app/lib/haptics";
import {
  peekActiveReceizAccountBindingWithAccountAuthority,
  projectReceizAccountBinding,
  type ReceizAccountBinding,
} from "@/app/lib/auth/receizAccountBindings";
import {
  peekSessionBootstrapSnapshot,
  type SessionBootstrapSnapshot,
  writeSessionBootstrapSnapshot,
} from "@/app/lib/session/bootstrapHydration";
import {
  type SportsArenaCardCareerAppend,
  type SportsArenaCardIssueProof,
  type SportsArenaCardOwnershipAppend,
} from "./sportsArenaCardExport";
import {
  FIGHT_VAULT_CATEGORY_FILTERS,
  SOCCER_VAULT_CATEGORY_FILTERS,
  SPORTS_VAULT_CATEGORY_FILTERS,
  sportsArenaFreePackIdForSport,
  sportsCardDisplayCode,
  sportsCardIsRookie,
  sportsCardMatchesFilter,
  sportsCardMatchesPosition,
  sportsCardOwnedCount,
  sportsCardPlayerKey,
  sportsCardPosition,
  sportsClaimDisplayCode,
  sportsClaimMatchesCard,
  sportsClaimPlayerKey,
  sportsPackShelfSubtitle,
  type BaseballPositionFilter,
  type SportsCardVaultFilter,
} from "./sportsArenaCardIdentity";
import type { SportsPackPullImpact } from "./components/SportsPackRevealPanel";

export {
  FIGHT_VAULT_CATEGORY_FILTERS,
  SOCCER_VAULT_CATEGORY_FILTERS,
  SPORTS_VAULT_CATEGORY_FILTERS,
  sportsArenaFreePackIdForSport,
  sportsCardDisplayCode,
  sportsCardIsRookie,
  sportsCardMatchesFilter,
  sportsCardMatchesPosition,
  sportsCardOwnedCount,
  sportsCardPlayerKey,
  sportsCardPosition,
  sportsClaimDisplayCode,
  sportsClaimMatchesCard,
  sportsClaimPlayerKey,
  sportsPackShelfSubtitle,
};
export type { BaseballPositionFilter, SportsCardVaultFilter };

export type SportsArenaInitialSession = {
  uid?: string | null;
  email?: string | null;
  username?: string | null;
  profileUsernameResolved?: boolean;
  plan?: Plan | null;
  entitlementPlan?: Plan | null;
};

export type SportsArenaView = "arena" | "leaderboard" | "proofs" | "collection" | "profile";
export type SportsCardRarityFilter = SportsArenaCard["tier"];
export type SportsCardVaultSort = "rating" | "team";
export type SportsLineupContext = "tournament" | "game";
export type SportsTrustInfoKey = "receiz-id" | "pbi" | "deterministic";
export type SportsPackPurchaseStatus = "idle" | "account" | "purchase" | "funding" | "opening" | "failed";
export type SportsPackEconomyStatus = "idle" | "running" | "ready" | "error";
export type SportsVaultArchiveStatus = "idle" | "importing" | "imported" | "invalid" | "sealing" | "sealed" | "empty" | "save_failed";
export type SportsTournamentEntryState = "idle" | "syncing" | "joining" | "funding" | "joined" | "error";

const SPORTS_ACCOUNT_SESSION_UID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sportsCardRatePremiumLabel(baseRate: number, currentRate: number): string {
  const premium = Number((currentRate - baseRate).toFixed(2));
  if (premium === 0) return "+0.00";
  return `${premium > 0 ? "+" : ""}${formatSlateCardDisplayNumber(premium)}`;
}

export function sportsPackAccountSessionUid(uid: string | null | undefined): boolean {
  return typeof uid === "string" && SPORTS_ACCOUNT_SESSION_UID_RE.test(uid.trim());
}

export function hasSportsPackAccountSession(sessionUid: string | null | undefined): boolean {
  if (sportsPackAccountSessionUid(projectSportsReceizAccountBindingSessionBootstrap()?.uid)) return true;
  if (sportsPackAccountSessionUid(peekSessionBootstrapSnapshot(true)?.uid)) return true;
  return sportsPackAccountSessionUid(sessionUid);
}

export function sportsEventProofsFromPayload(payload: unknown): SportsArenaEventProof[] {
  const record = isRecord(payload) ? payload : null;
  return [...(Array.isArray(record?.owned) ? record.owned : []), ...(Array.isArray(record?.market) ? record.market : [])]
    .map(sportsArenaEventProofFromValue)
    .filter((proof): proof is SportsArenaEventProof => Boolean(proof));
}

export function nextArenaEntryStateAfterBackgroundHydration(
  current: SportsArenaEntryState,
  nextEntry: SportsArenaEntry | null,
): SportsArenaEntryState {
  if (nextEntry) return "entered";
  return current === "syncing" || current === "finalizing" ? current : "idle";
}

export function nextTournamentEntryStateAfterBackgroundHydration(
  current: SportsTournamentEntryState,
  joined: boolean,
): SportsTournamentEntryState {
  if (joined) return "joined";
  return current === "joining" || current === "funding" ? current : "idle";
}

export function hydrationGameEntryForProjection(
  entries: SportsArenaEntry[],
  activeEntry: SportsArenaEntry | null,
  selectedGamePk: string | null | undefined,
  dismissedEntryIds: string[],
  openedRewardNonces: Set<string>,
): SportsArenaEntry | null {
  return chooseSportsArenaEntryForProjection([
    ...(activeEntry ? [activeEntry] : []),
    ...entries,
  ], null, selectedGamePk, dismissedEntryIds, openedRewardNonces);
}

function normalizedSportsInitialGamePk(gamePk: string | null | undefined): string | null {
  const normalized = sportsNormalizedGamePk(gamePk);
  return normalized || null;
}

export function initialSportsSelectedGamePk(
  initialGameEntry: SportsArenaEntry | null,
  initialLiveFeedSeed: SportsArenaLiveFeed | null,
): string | null {
  const entryGamePk = normalizedSportsInitialGamePk(initialGameEntry?.gamePk);
  if (entryGamePk) return entryGamePk;

  const fieldGamePk = normalizedSportsInitialGamePk(initialLiveFeedSeed?.field?.gamePk);
  if (fieldGamePk) return fieldGamePk;

  const preferredScoreboard = initialLiveFeedSeed?.scoreboards.find((scoreboard) => scoreboard.status === "live") ??
    initialLiveFeedSeed?.scoreboards.find((scoreboard) => scoreboard.status !== "final") ??
    initialLiveFeedSeed?.scoreboards[0] ??
    null;
  return preferredScoreboard ? sportsScoreboardGamePk(preferredScoreboard) : null;
}

export function sportsScoreboardSourceDate(scoreboard: SportsArenaScoreboard | null | undefined): string | null {
  if (!scoreboard?.gameDate) return null;
  const parsed = Date.parse(scoreboard.gameDate);
  return Number.isFinite(parsed) ? sportsNewYorkDate(new Date(parsed)) : null;
}

export type SportsArenaTeamPalette = {
  primary: string;
  secondary: string;
  tertiary: string;
};

const SPORTS_ARENA_TEAM_PALETTES: Record<string, SportsArenaTeamPalette> = {
  "baseball:ARI": { primary: "#a71930", secondary: "#e3d4ad", tertiary: "#30ced8" },
  "baseball:ATL": { primary: "#13274f", secondary: "#ce1141", tertiary: "#eaaa00" },
  "baseball:BAL": { primary: "#df4601", secondary: "#000000", tertiary: "#ffffff" },
  "baseball:BOS": { primary: "#bd3039", secondary: "#0c2340", tertiary: "#ffffff" },
  "baseball:CHC": { primary: "#0e3386", secondary: "#cc3433", tertiary: "#ffffff" },
  "baseball:CIN": { primary: "#c6011f", secondary: "#000000", tertiary: "#ffffff" },
  "baseball:CLE": { primary: "#00385d", secondary: "#e50022", tertiary: "#ffffff" },
  "baseball:COL": { primary: "#33006f", secondary: "#c4ced4", tertiary: "#000000" },
  "baseball:CWS": { primary: "#27251f", secondary: "#c4ced4", tertiary: "#ffffff" },
  "baseball:DET": { primary: "#0c2340", secondary: "#fa4616", tertiary: "#ffffff" },
  "baseball:HOU": { primary: "#002d62", secondary: "#eb6e1f", tertiary: "#ffffff" },
  "baseball:KC": { primary: "#004687", secondary: "#bd9b60", tertiary: "#ffffff" },
  "baseball:LAA": { primary: "#ba0021", secondary: "#003263", tertiary: "#c4ced4" },
  "baseball:LAD": { primary: "#005a9c", secondary: "#ffffff", tertiary: "#ef3e42" },
  "baseball:MIA": { primary: "#00a3e0", secondary: "#ef3340", tertiary: "#000000" },
  "baseball:MIL": { primary: "#12284b", secondary: "#ffc52f", tertiary: "#ffffff" },
  "baseball:MIN": { primary: "#002b5c", secondary: "#d31145", tertiary: "#ffffff" },
  "baseball:NYM": { primary: "#002d72", secondary: "#ff5910", tertiary: "#ffffff" },
  "baseball:NYY": { primary: "#0c2340", secondary: "#ffffff", tertiary: "#c4ced4" },
  "baseball:OAK": { primary: "#003831", secondary: "#efb21e", tertiary: "#ffffff" },
  "baseball:ATH": { primary: "#003831", secondary: "#efb21e", tertiary: "#ffffff" },
  "baseball:PHI": { primary: "#e81828", secondary: "#002d72", tertiary: "#ffffff" },
  "baseball:PIT": { primary: "#27251f", secondary: "#fdb827", tertiary: "#ffffff" },
  "baseball:SD": { primary: "#2f241d", secondary: "#ffc425", tertiary: "#ffffff" },
  "baseball:SEA": { primary: "#0c2c56", secondary: "#005c5c", tertiary: "#c4ced4" },
  "baseball:SF": { primary: "#fd5a1e", secondary: "#27251f", tertiary: "#fffdd0" },
  "baseball:STL": { primary: "#c41e3a", secondary: "#0c2340", tertiary: "#fedb00" },
  "baseball:TB": { primary: "#092c5c", secondary: "#8fbce6", tertiary: "#f5d130" },
  "baseball:TEX": { primary: "#003278", secondary: "#c0111f", tertiary: "#ffffff" },
  "baseball:TOR": { primary: "#134a8e", secondary: "#e8291c", tertiary: "#ffffff" },
  "baseball:WSH": { primary: "#ab0003", secondary: "#14225a", tertiary: "#ffffff" },
  "soccer:ALG": { primary: "#006233", secondary: "#ffffff", tertiary: "#d21034" },
  "soccer:ARG": { primary: "#75aadb", secondary: "#ffffff", tertiary: "#f6b40e" },
  "soccer:AUS": { primary: "#00843d", secondary: "#ffcd00", tertiary: "#ffffff" },
  "soccer:BEL": { primary: "#000000", secondary: "#fae042", tertiary: "#ed2939" },
  "soccer:BRA": { primary: "#009b3a", secondary: "#ffdf00", tertiary: "#002776" },
  "soccer:CAN": { primary: "#ff0000", secondary: "#ffffff", tertiary: "#000000" },
  "soccer:CIV": { primary: "#f77f00", secondary: "#ffffff", tertiary: "#009e60" },
  "soccer:COL": { primary: "#fcd116", secondary: "#003893", tertiary: "#ce1126" },
  "soccer:CRO": { primary: "#ff0000", secondary: "#ffffff", tertiary: "#171796" },
  "soccer:EGY": { primary: "#ce1126", secondary: "#ffffff", tertiary: "#000000" },
  "soccer:ENG": { primary: "#ffffff", secondary: "#cf142b", tertiary: "#00247d" },
  "soccer:ESP": { primary: "#aa151b", secondary: "#f1bf00", tertiary: "#ffffff" },
  "soccer:FRA": { primary: "#0055a4", secondary: "#ef4135", tertiary: "#ffffff" },
  "soccer:GER": { primary: "#000000", secondary: "#dd0000", tertiary: "#ffce00" },
  "soccer:GHA": { primary: "#ce1126", secondary: "#fcd116", tertiary: "#006b3f" },
  "soccer:IRN": { primary: "#239f40", secondary: "#ffffff", tertiary: "#da0000" },
  "soccer:JPN": { primary: "#ffffff", secondary: "#bc002d", tertiary: "#1b1b1b" },
  "soccer:KOR": { primary: "#ffffff", secondary: "#c60c30", tertiary: "#003478" },
  "soccer:KSA": { primary: "#006c35", secondary: "#ffffff", tertiary: "#111111" },
  "soccer:MAR": { primary: "#c1272d", secondary: "#006233", tertiary: "#ffffff" },
  "soccer:MEX": { primary: "#006847", secondary: "#ce1126", tertiary: "#ffffff" },
  "soccer:NED": { primary: "#ff4f00", secondary: "#21468b", tertiary: "#ffffff" },
  "soccer:NZL": { primary: "#00247d", secondary: "#cc142b", tertiary: "#ffffff" },
  "soccer:POR": { primary: "#006600", secondary: "#ff0000", tertiary: "#ffcc00" },
  "soccer:QAT": { primary: "#8a1538", secondary: "#ffffff", tertiary: "#000000" },
  "soccer:RSA": { primary: "#007a4d", secondary: "#ffb612", tertiary: "#de3831" },
  "soccer:SEN": { primary: "#00853f", secondary: "#fdef42", tertiary: "#e31b23" },
  "soccer:TUN": { primary: "#e70013", secondary: "#ffffff", tertiary: "#000000" },
  "soccer:TUR": { primary: "#e30a17", secondary: "#ffffff", tertiary: "#111111" },
  "soccer:URU": { primary: "#0038a8", secondary: "#fcd116", tertiary: "#ffffff" },
  "soccer:USA": { primary: "#002868", secondary: "#bf0a30", tertiary: "#ffffff" },
  NYY: { primary: "#0c2340", secondary: "#ffffff", tertiary: "#c4ced4" },
};

const SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_LEGACY_KEY = "receiz.sports.vault.showcase.pending.v1";
const SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_KEY = "receiz.sports.vault.showcase.pending.v2";
const SPORTS_VAULT_SHOWCASE_LIVE_PUBLISHED_STORAGE_KEY = "receiz.sports.vault.showcase.live.published.v1";
const SPORTS_VAULT_SHOWCASE_PENDING_LIMIT = 20;
const SPORTS_VAULT_SHOWCASE_PUBLISH_TIMEOUT_MS = 20_000;
const SPORTS_VAULT_SHOWCASE_FULL_PAYLOAD_CARD_LIMIT = 300;
const SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE = "owner_current_projection";

type PendingSportsVaultShowcase = {
  route: string;
  vaultCardId: string;
  mode?: typeof SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE;
  manifest?: SportsArenaVaultCardManifest;
  claims?: SportsArenaCardClaim[];
  queuedAtMs: number;
  attempts: number;
};

function isPendingSportsVaultShowcase(value: unknown): value is PendingSportsVaultShowcase {
  if (!isRecord(value)) return false;
  const base =
    typeof value.route === "string" &&
    typeof value.vaultCardId === "string" &&
    typeof value.queuedAtMs === "number" &&
    Number.isFinite(value.queuedAtMs) &&
    typeof value.attempts === "number" &&
    Number.isFinite(value.attempts);
  if (!base) return false;
  if (value.mode === SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE) return true;
  return isRecord(value.manifest) &&
    value.manifest.vaultCardId === value.vaultCardId &&
    (value.claims === undefined || Array.isArray(value.claims));
}

function readPendingSportsVaultShowcases(): PendingSportsVaultShowcase[] {
  if (typeof window === "undefined") return [];
  try {
    window.localStorage.removeItem(SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_LEGACY_KEY);
    const raw = window.localStorage.getItem(SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isPendingSportsVaultShowcase) : [];
  } catch {
    return [];
  }
}

function writePendingSportsVaultShowcases(queue: PendingSportsVaultShowcase[]): void {
  if (typeof window === "undefined") return;
  try {
    const bounded = queue.slice(-SPORTS_VAULT_SHOWCASE_PENDING_LIMIT);
    if (bounded.length === 0) {
      window.localStorage.removeItem(SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SPORTS_VAULT_SHOWCASE_PENDING_STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // The sealed manifest remains the source of truth; storage is only a transport retry queue.
  }
}

function sportsVaultShowcaseShouldUseOwnerProjection(
  manifest: SportsArenaVaultCardManifest,
  claims: readonly SportsArenaCardClaim[],
): boolean {
  return manifest.cardCount > SPORTS_VAULT_SHOWCASE_FULL_PAYLOAD_CARD_LIMIT ||
    claims.length > SPORTS_VAULT_SHOWCASE_FULL_PAYLOAD_CARD_LIMIT;
}

function sportsVaultLivePublishedStorageKey(route: string, vaultCardId: string): string {
  return `${SPORTS_VAULT_SHOWCASE_LIVE_PUBLISHED_STORAGE_KEY}:${route}:${vaultCardId}`;
}

function readPublishedSportsVaultLiveSignature(route: string, vaultCardId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(sportsVaultLivePublishedStorageKey(route, vaultCardId)) ?? "";
  } catch {
    return "";
  }
}

function writePublishedSportsVaultLiveSignature(route: string, vaultCardId: string, signature: string): void {
  if (typeof window === "undefined" || !signature) return;
  try {
    window.localStorage.setItem(sportsVaultLivePublishedStorageKey(route, vaultCardId), signature);
  } catch {
    // Public projection can be republished later; local storage is only a duplicate-write guard.
  }
}

export async function publishSportsVaultOwnerCurrentProjection(route: string): Promise<boolean> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutHandle = controller && typeof window !== "undefined"
    ? window.setTimeout(() => controller.abort(), SPORTS_VAULT_SHOWCASE_PUBLISH_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ mode: SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
  }
}

export async function publishSportsVaultShowcase(route: string, manifest: SportsArenaVaultCardManifest, claims: SportsArenaCardClaim[] = []): Promise<boolean> {
  if (sportsVaultShowcaseShouldUseOwnerProjection(manifest, claims)) {
    return publishSportsVaultOwnerCurrentProjection(route);
  }
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutHandle = controller && typeof window !== "undefined"
    ? window.setTimeout(() => controller.abort(), SPORTS_VAULT_SHOWCASE_PUBLISH_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ manifest, claims }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (response.status === 413) return publishSportsVaultOwnerCurrentProjection(route);
    return response.ok;
  } catch {
    return false;
  } finally {
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
  }
}

export function queuePendingSportsVaultOwnerCurrentProjection(route: string, vaultCardId: string): void {
  const queue = readPendingSportsVaultShowcases();
  const nextEntry: PendingSportsVaultShowcase = {
    route,
    vaultCardId,
    mode: SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE,
    queuedAtMs: Date.now(),
    attempts: 0,
  };
  const next = [
    ...queue.filter((entry) => entry.route !== route || entry.vaultCardId !== vaultCardId),
    nextEntry,
  ];
  writePendingSportsVaultShowcases(next);
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      void flushPendingSportsVaultShowcases(route);
    }, 0);
  }
}

export function queuePendingSportsVaultShowcase(route: string, manifest: SportsArenaVaultCardManifest, claims: SportsArenaCardClaim[] = []): void {
  if (sportsVaultShowcaseShouldUseOwnerProjection(manifest, claims)) {
    queuePendingSportsVaultOwnerCurrentProjection(route, manifest.vaultCardId);
    return;
  }
  const queue = readPendingSportsVaultShowcases();
  const nextEntry: PendingSportsVaultShowcase = {
    route,
    vaultCardId: manifest.vaultCardId,
    manifest,
    claims,
    queuedAtMs: Date.now(),
    attempts: 0,
  };
  const next = [
    ...queue.filter((entry) => entry.route !== route || entry.vaultCardId !== manifest.vaultCardId),
    nextEntry,
  ];
  writePendingSportsVaultShowcases(next);
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      void flushPendingSportsVaultShowcases(route);
    }, 0);
  }
}

export async function flushPendingSportsVaultShowcases(route: string): Promise<void> {
  const queue = readPendingSportsVaultShowcases();
  if (queue.length === 0) return;
  const next: PendingSportsVaultShowcase[] = [];
  for (const entry of queue) {
    if (entry.route !== route) {
      next.push(entry);
      continue;
    }
    const published = entry.mode === SPORTS_VAULT_SHOWCASE_OWNER_CURRENT_MODE
      ? await publishSportsVaultOwnerCurrentProjection(route)
      : entry.manifest
        ? await publishSportsVaultShowcase(route, entry.manifest, entry.claims ?? [])
        : false;
    if (!published) next.push({ ...entry, attempts: entry.attempts + 1 });
  }
  writePendingSportsVaultShowcases(next);
}

export function usePendingSportsVaultShowcaseFlush(enabled: boolean, route: string): void {
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      void flushPendingSportsVaultShowcases(route);
    };
    flush();
    window.addEventListener("focus", flush);
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("focus", flush);
      window.removeEventListener("online", flush);
    };
  }, [enabled, route]);
}

function sportsVaultAppendRowsForClaim(
  claim: Pick<SportsArenaCardClaim, "cardId" | "collectibleId">,
  rows: readonly SportsAppendHistoryRow[],
): SportsAppendHistoryRow[] {
  return mergeSportsAppendHistoryRows(rows.filter((row) =>
    row.collectibleId ? row.collectibleId === claim.collectibleId : row.cardId === claim.cardId
  ));
}

function sportsVaultLiveSignature(claims: SportsArenaCardClaim[], sport: SportsArenaSlug): string {
  const owned = mergeSportsClaims([], claims)
    .filter((claim) => claim.sport === sport)
    .sort((left, right) => left.collectibleId.localeCompare(right.collectibleId) || left.claimHash.localeCompare(right.claimHash));
  if (owned.length === 0) return "";
  return owned.map((claim) => `${claim.collectibleId}:${claim.claimHash}`).join("|");
}

export function useSportsVaultLiveShowcasePublish(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows: SportsAppendHistoryRow[];
  claims: SportsArenaCardClaim[];
  enabled: boolean;
  ownerLabel: string | null;
  ownerUserId: string | null;
  route: string;
  sport: SportsArenaSlug;
}): void {
  const liveShowcaseRef = useRef<{ sequence: number; signature: string }>({ sequence: 0, signature: "" });
  const signature = args.enabled && args.ownerUserId ? sportsVaultLiveSignature(args.claims, args.sport) : "";

  useEffect(() => {
    const ownerUserId = args.ownerUserId;
    if (!args.enabled || !ownerUserId || !signature) return;
    if (liveShowcaseRef.current.signature === signature) return;
    const sequence = liveShowcaseRef.current.sequence + 1;
    liveShowcaseRef.current = { sequence, signature };
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const candidateClaims = mergeSportsClaims([], args.claims).filter((claim) => claim.sport === args.sport);
          const vaultCardId = await sportsArenaLiveVaultCardId(ownerUserId, args.sport);
          if (candidateClaims.length === 0) return;
          if (readPublishedSportsVaultLiveSignature(args.route, vaultCardId) === signature) {
            return;
          }
          if (cancelled || liveShowcaseRef.current.sequence !== sequence) return;
          const published = await publishSportsVaultOwnerCurrentProjection(args.route);
          if (published) writePublishedSportsVaultLiveSignature(args.route, vaultCardId, signature);
          if (!published) queuePendingSportsVaultOwnerCurrentProjection(args.route, vaultCardId);
        } catch {
          // Live publishing is a projection beneath verified vault membership; explicit save still publishes immediately after local file release.
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [args.claims, args.enabled, args.ownerUserId, args.route, args.sport, signature]);
}

export function useSportsVaultLiveUrl(args: {
  enabled: boolean;
  ownerEmail?: string | null;
  ownerUsername?: string | null;
  ownerUserId: string | null;
  sport: SportsArenaSlug;
}): string {
  const lookupKey = args.enabled && args.ownerUserId ? `${args.ownerUserId}:${args.sport}` : "";
  const publicPath = args.enabled && args.ownerUserId
    ? sportsArenaLiveVaultPublicPath(args.ownerUsername, args.sport, args.ownerEmail, args.ownerUserId)
    : "";
  const publicUrl = typeof window !== "undefined" && publicPath
    ? new URL(publicPath, window.location.origin).toString()
    : "";
  const [resolvedUrl, setResolvedUrl] = useState<{
    key: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!lookupKey || publicUrl || typeof window === "undefined" || !args.ownerUserId) {
      return;
    }
    const activeKey = lookupKey;
    const ownerUserId = args.ownerUserId;
    let cancelled = false;
    void (async () => {
      const vaultCardId = await sportsArenaLiveVaultCardId(ownerUserId, args.sport);
      if (!cancelled) {
        setResolvedUrl({
          key: activeKey,
          url: new URL(sportsArenaLiveVaultPath(vaultCardId, args.sport), window.location.origin).toString(),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [args.ownerUserId, args.sport, lookupKey, publicUrl]);

  if (!lookupKey || typeof window === "undefined") return "";
  if (publicUrl) return publicUrl;
  return resolvedUrl?.key === lookupKey ? resolvedUrl.url : "";
}

export async function publishSportsVaultShowcaseLink(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows: SportsAppendHistoryRow[];
  claims: SportsArenaCardClaim[];
  ownerEmail?: string | null;
  ownerLabel: string | null;
  ownerUsername?: string | null;
  ownerUserId: string;
  route: string;
  sport: SportsArenaSlug;
}): Promise<string> {
  const vaultCardId = await sportsArenaLiveVaultCardId(args.ownerUserId, args.sport);
  const candidateClaims = mergeSportsClaims([], args.claims).filter((claim) => claim.sport === args.sport);
  const prepared = await prepareSportsVaultProjectionSeed({
    accountSportsAssetsById: args.accountSportsAssetsById,
    accountAppendRows: args.accountAppendRows,
    candidateClaims,
    createdAtMs: Date.now(),
    vaultCardId,
  });
  const { buildSportsArenaVaultCardManifestOnly } = await import("./sportsArenaVaultCardExport");
  const manifest = await buildSportsArenaVaultCardManifestOnly({
    archiveBytes: prepared.archiveBytes,
    archiveFilename: prepared.archiveFilename,
    archiveMime: prepared.archiveMime,
    cardCount: prepared.verifiedClaims.length,
    cards: prepared.manifestCards,
    createdAtMs: prepared.createdAtMs,
    ownerLabel: args.ownerLabel,
    vaultCardId: prepared.vaultCardId,
  });
  writeSportsVaultRouteSnapshot(sportsVaultExplorerPayloadFromManifest({
    manifest,
    ownerLabel: args.ownerLabel,
    ownerUserId: args.ownerUserId,
    username: args.ownerUsername ?? null,
  }));
  const published = await publishSportsVaultShowcase(args.route, manifest, prepared.verifiedClaims);
  if (!published) queuePendingSportsVaultShowcase(args.route, manifest, prepared.verifiedClaims);
  return sportsArenaLiveVaultPublicPath(args.ownerUsername, args.sport, args.ownerEmail, args.ownerUserId) ?? sportsArenaLiveVaultPath(prepared.vaultCardId, args.sport);
}

export function sportsVaultArchiveStatusText(status: SportsVaultArchiveStatus): string {
  if (status === "importing") return "Restoring verified card image.";
  if (status === "sealing") return "Sealing vault image.";
  if (status === "sealed") return "Vault image sealed.";
  if (status === "imported") return "Verified cards restored; sync queued.";
  if (status === "save_failed") return "Vault image save did not open.";
  if (status === "invalid") return "Card image proof was not accepted.";
  if (status === "empty") return "Own a card before sealing a vault.";
  return "";
}

export type SportsPackFundingRequest = {
  packId: string;
  clientNonce: string;
  amountUsd: number;
  amountLabel: string;
};

export function sportsArenaFieldStateLabel(args: {
  fieldStatus: SportsArenaFieldState["status"];
  isSoccerArena: boolean;
  isFightArena: boolean;
}): string {
  if (args.isSoccerArena && args.fieldStatus === "live") return "Live FIFA state";
  if (args.isSoccerArena && args.fieldStatus === "final") return "Final FIFA state";
  if (args.isSoccerArena) return "FIFA match state";
  if (args.isFightArena && args.fieldStatus === "live") return "Live UFC state";
  if (args.isFightArena && args.fieldStatus === "final") return "Final UFC state";
  if (args.isFightArena) return "UFC fight state";
  if (args.fieldStatus === "live") return "Live MLB state";
  if (args.fieldStatus === "final") return "Final MLB state";
  return "MLB game state";
}

export type SportsPackEconomySimulation = {
  packId: string;
  packName: string;
  packCount: number;
  totalCards: number;
  eligibleCardCount: number;
  rarityRates: Partial<Record<string, number>>;
  playerScarcityCounts: { label: string; count: number; rate: number }[];
  rating: {
    average: number;
    p95: number;
    p99: number;
    impactPullRate: number;
    starPullRate: number;
    elitePullRate: number;
  };
  spread: {
    uniquePlayers: number;
    firstThousandPackUniquePlayers: number;
    topPlayerShare: number;
    topTenPlayerShare: number;
    spreadScore: number;
  };
  health: {
    score: number;
    label: string;
    notes: string[];
  };
  publishedOdds?: {
    rarePlusPerPack: number;
    goldPlusPerPack: number;
    championPlusPerPack: number;
    mythicPerPack: number;
    rarePlusLine: string;
    goldPlusLine: string;
    championPlusLine: string;
    mythicLine: string;
  };
  observedOdds?: {
    rarePlusPerPack: number;
    goldPlusPerPack: number;
    championPlusPerPack: number;
    mythicPerPack: number;
    rarePlusLine: string;
    goldPlusLine: string;
    championPlusLine: string;
    mythicLine: string;
  };
  topPlayers: {
    cardId: string;
    athlete: string;
    teamCode: string;
    position: string;
    rating: number;
    tier: string;
    pulls: number;
    rate: number;
  }[];
};

export type SportsPackEconomyResponse = {
  ok?: boolean;
  sampleSize?: number;
  registryCardCount?: number;
  registryBasisHash?: string;
  simulations?: SportsPackEconomySimulation[];
};

export type SportsArenaMarketDepth = {
  schema?: "receiz.sports_arena.market_depth.v1";
  cardId: string;
  listingCount: number;
  bidCount?: number;
  floorUsdCents: string | null;
  bestBidUsdCents?: string | null;
  bestAskUsdCents?: string | null;
  spreadUsdCents?: string | null;
  lastSaleUsdCents: string | null;
  volumeUsdCents: string;
  issueCirculation?: {
    overallCount?: number;
    variants?: { rarity: string; count: number }[];
  };
  rarityFloors: { rarity: string; priceUsdCents: string }[];
  orderBook?: {
    asks: { priceUsdCents: string; count: number; rarities: string[] }[];
    bids: { priceUsdCents: string; count: number; rarities: string[] }[];
  };
  liquidityChart?: { label: string; priceUsdCents: string; occurredAt: string }[];
  listings: { collectibleId: string; rarity: string; priceUsdCents: string; listedAt: string | null }[];
  bids?: { bidId: string; collectibleId: string | null; rarity: string | null; priceUsdCents: string; createdAt: string }[];
  lastSales: { saleId: string | null; collectibleId: string; priceUsdCents: string; occurredAt: string }[];
};

export type SportsArenaTradeItem = {
  collectibleId: string;
  claimHash: string;
  cardId: string;
  rarity: SportsArenaCard["tier"];
  athlete: string | null;
  teamCode: string | null;
  position: string | null;
  ownerUserIdAtOffer: string;
};

export type SportsArenaTradeOffer = {
  id: string;
  status: "open" | "countered" | "accepted" | "declined" | "cancelled" | "expired";
  message: string | null;
  tradeHash: string;
  createdByUserId: string;
  targetUserId: string;
  viewerSide: "sent" | "incoming";
  parentTradeId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  offered: SportsArenaTradeItem[];
  requested: SportsArenaTradeItem[];
};

export type SportsArenaEventProof = {
  eventProofId: string;
  ownerUserId: string;
  owned: boolean;
  sourceCollectibleId: string;
  sourceClaimHash: string;
  sourceCardId: string;
  appendHash: string;
  proofHash: string;
  sourceSnapshotHash: string;
  gamePk: string;
  playId: string;
  eventType: string;
  role: SportsArenaLiveAppendSubjectRole;
  subjectPersonId: string;
  subjectName: string;
  teamCode: string | null;
  opponentCode: string | null;
  inning: string | null;
  scoreDelta: number;
  proof: unknown;
  sourceJson: unknown;
  media: SportsArenaEventMediaClip | null;
  milestone: SportsArenaEventProofMilestone | null;
  attachment: {
    kind: "native" | "attached" | "detached";
    collectibleId: string | null;
    claimHash: string | null;
    cardId: string | null;
    attachedAt: string | null;
  };
  listing: SportsArenaCardListing | null;
  createdAt: string;
  updatedAt: string;
};

export type SportsArenaEventProofMilestone = {
  kind: "record" | "milestone";
  label: string;
  detail: string;
  source: "event-proof";
  videoEvidence: "recorded" | "none";
};

export type SportsArenaEventProofMomentRow = {
  key: string;
  label: string;
  value: string;
  source: "event" | "proof" | "source" | "media";
};

export type SportsArenaEventProofMediaProjection = {
  media: SportsArenaEventMediaClip | null;
  recordedVideo: SportsArenaRecordedEventVideo | null;
  relatedVideos: SportsArenaRecordedEventVideo[];
};

export type SportsArenaLiveEventSourceProof = {
  sourceSnapshotHash?: string;
};

export type SportsArenaLiveEventMetrics = {
  pitchType: string;
  pitchCode: string;
  pitchCall: string;
  pitchDescription: string;
  pitchSpeedMph: number | null;
  pitchEndSpeedMph: number | null;
  pitchSpinRateRpm: number | null;
  pitchZone: number | null;
  pitchPlateX: number | null;
  pitchPlateZ: number | null;
  pitchCoordinateX: number | null;
  pitchCoordinateY: number | null;
  exitVelocityMph: number | null;
  launchAngleDeg: number | null;
  distanceFt: number | null;
  hitTrajectory: string;
  hitHardness: string;
  hitLocation: string;
  hitCoordinateX: number | null;
  hitCoordinateY: number | null;
};

export type SportsArenaLiveEventPayload = {
  sourceProof: SportsArenaLiveEventSourceProof;
  metrics?: SportsArenaLiveEventMetrics;
};

export type SportsArenaCompetition = {
  id: string;
  title: string;
  kind: "pool" | "head_to_head";
  status: string;
  sourceDate: string;
  gamePk: string | null;
  entryLimit: number;
  inviteCode: string;
  invitePath: string;
  stakePolicy: string;
  prizePolicy: string;
  complianceStatus: string;
  createdAt: string;
  joined?: boolean;
  entryCount?: number;
  spotsRemaining?: number;
  joinedEntryId?: string | null;
  rows?: { sportsEntryId: string; rank: number; score: number; state: string }[];
};

export type SportsArenaTournamentPayoutRow = {
  rank: number;
  label: string;
  payoutUsdCents: number;
  payoutLabel?: string;
};

export type SportsArenaTournamentEconomicsView = {
  schema: "receiz.sports_arena.tournament_economics.v1";
  entryCount: number;
  entryPriceUsdCents: number;
  grossUsdCents: number;
  prizePoolUsdCents: number;
  platformFeeUsdCents: number;
  referralPoolUsdCents: number;
  reservePoolUsdCents: number;
  paidRankPercent: number;
  paidRanks: number;
  minPaidPayoutUsdCents: number;
  profitFloorArmed: boolean;
  minEntrantsToRun: number;
  runArmed: boolean;
  entriesNeededToRun: number;
  refundIfUnderfilled: boolean;
  minimumEntrantsForProfit: number;
  firstPlaceEstimateUsdCents: number;
  entryPriceLabel?: string;
  grossLabel?: string;
  prizePoolLabel?: string;
  minPaidPayoutLabel?: string;
  firstPlaceEstimateLabel?: string;
  payoutLadder: SportsArenaTournamentPayoutRow[];
};

export type SportsArenaEntryCardScoreProof = {
  cardId: string;
  collectibleId: string | null;
  score: number;
  appendCount: number;
  lastAppendHash: string | null;
};

export type SportsArenaTournamentView = {
  schema: "receiz.sports_arena.tournament.v1";
  schemaInstalled?: boolean;
  id: string | null;
  tournamentKey: string;
  title: string;
  status: string;
  sourceDate: string;
  entryPriceUsdCents: string;
  entryPriceLabel: string;
  entryCount: number;
  minEntrantsToRun?: number;
  entriesNeededToRun?: number;
  runArmed?: boolean;
  refundIfUnderfilled?: boolean;
  joined: boolean;
  joinedEntryId: string | null;
  sportsEntryId: string | null;
  complianceStatus: string;
  cashSettlementEnabled: boolean;
  split: {
    prizePoolLabel: string;
    platformFeeLabel: string;
    referralPoolLabel: string;
    reservePoolLabel: string;
  };
  economics: SportsArenaTournamentEconomicsView;
  afterEntryEconomics: SportsArenaTournamentEconomicsView;
  estimatedEconomics?: SportsArenaTournamentEconomicsView;
  lastWinners?: {
    tournamentKey: string;
    title: string;
    sourceDate: string;
    settledAt: string | null;
    winners: {
      tournamentEntryId: string;
      sportsEntryId: string;
      rank: number;
      displayName: string;
      score: number;
      payoutUsdCents: string;
      payoutLabel: string;
      settlementStatus: string;
    }[];
  } | null;
  leaderboard: {
    tournamentEntryId: string;
    sportsEntryId: string;
    rank: number;
    score: number;
    state: string;
    payoutLabel: string;
  }[];
  userEntry: {
    id: string;
    sportsEntryId: string;
    status: string;
    settlementStatus: string;
    score: number;
    rank: number | null;
    payoutLabel: string;
    joinedAt: string;
    enteredAt?: string | null;
    finalizedAt?: string | null;
    lineupCardIds?: string[];
    lineupCollectibleIds?: string[];
    lineupSize?: number;
    entryHash?: string | null;
    lineupHash?: string | null;
    appendCount?: number;
    lastAppendHash?: string | null;
    cardScores?: SportsArenaEntryCardScoreProof[];
    ledger?: {
      id: string;
      kind: string;
      label: string;
      value: string;
      detail: string;
      state: string;
    }[];
  } | null;
};

export type SportsTournamentFundingRequest = {
  sportsEntryId: string;
  clientNonce: string;
  amountUsd: number;
  amountLabel: string;
};

export type SportsTournamentCollectedStore = {
  ownerUserId?: unknown;
  entryIds?: unknown;
  updatedAtMs?: unknown;
};

export type SportsArenaCollectedEntryStore = SportsTournamentCollectedStore;

export type StoredSportsArenaEntryStore = {
  ownerUserId?: unknown;
  entries?: unknown;
  storedAtMs?: unknown;
};

export type StoredSportsLiveFeedStore = {
  sourceDate?: unknown;
  feed?: unknown;
  storedAtMs?: unknown;
};

export type StoredSportsLiveAppendStore = {
  ownerUserId?: unknown;
  appends?: unknown;
  storedAtMs?: unknown;
};

export type SportsPackPendingOpening = {
  pack?: unknown;
  receipt?: unknown;
  claims?: unknown;
  completedCollectibleIds?: unknown;
};

export type SportsVaultCardPayload = {
  claim?: unknown;
  issue?: unknown;
  asset?: unknown;
  listing?: unknown;
};

export type SportsVaultHydrationSnapshot = {
  claims: SportsArenaCardClaim[];
  assetsById: Record<string, SportsVaultCardAssetState>;
  listingsById: Record<string, SportsArenaCardListing | null>;
};

export type SportsVaultHydrationReadResult = SportsVaultHydrationSnapshot & {
  complete: boolean;
  nextCursor: string | null;
  transferredOutCollectibleIds: string[];
};

export type StoredSportsVaultCardRecord = {
  key: string;
  ownerUserId: string;
  sport: SportsArenaSlug;
  collectibleId: string;
  claim: SportsArenaCardClaim;
  asset: SportsVaultCardAssetState;
  listing: SportsArenaCardListing | null;
  storedAtMs: number;
};

export type StoredSportsEventProofRecord = {
  key: string;
  ownerUserId: string;
  sport: SportsArenaSlug;
  eventProofId: string;
  proof: SportsArenaEventProof;
  storedAtMs: number;
};

export type SportsPackPurchaseResponse = {
  ok?: boolean;
  error?: string;
  fallbackPackId?: string | null;
  pack?: SportsArenaPackDefinition;
  receipt?: SportsArenaPackReceipt;
  claims?: unknown;
  completedCollectibleIds?: unknown;
  pendingPacks?: unknown;
  projectionQueued?: boolean;
  wallet?: {
    balanceAfterPhiMicro?: string;
    amountPhiMicro?: string;
    quoteUsdPerPhiMicrocents?: string;
  };
  alreadyProcessed?: boolean;
  fundingDeltaUsd?: string;
  fundingDeltaUsdCents?: string;
  checkoutAmountUsd?: string;
  checkoutAmountUsdCents?: string;
  packId?: string;
  clientNonce?: string;
};

export function admitSportsPackWalletSettlement(payload: SportsPackPurchaseResponse): void {
  if (!payload.receipt) return;
  admitWalletSettlementAppend({
    settlementId: payload.receipt.receiptId,
    amountUsdCents: payload.receipt.priceUsdCents,
    amountPhiMicro: payload.wallet?.amountPhiMicro ?? "0",
    balanceAfterPhiMicro: payload.wallet?.balanceAfterPhiMicro ?? "0",
    occurredAtMs: Date.parse(payload.receipt.openedAt),
    alreadyProcessed: payload.alreadyProcessed === true,
  });
}

export type SportsArenaTournamentResponse = {
  ok?: boolean;
  error?: string;
  tournament?: unknown;
  ticket?: unknown;
  fundingDeltaUsd?: string;
  fundingDeltaUsdCents?: string;
  checkoutAmountUsd?: string;
  checkoutAmountUsdCents?: string;
  sportsEntryId?: string;
  clientNonce?: string;
};

export type SportsSessionResponse = {
  session?: {
    uid?: unknown;
    email?: unknown;
    username?: unknown;
    plan?: unknown;
    entitlementPlan?: unknown;
  } | null;
};

export type SportsArenaEntryLeaderboardRow = {
  entryId: string;
  rank: number;
  name: string;
  points: number;
  state: "you" | "hot" | "sealed";
};

export type SportsLeaderboardMotion = {
  previousRank: number;
  currentRank: number;
  changedAtMs: number;
};

export type SportsArenaEntryReward = {
  schema?: "receiz.sports_arena.reward.v1";
  eligible?: boolean;
  label?: string;
  detail?: string;
  packId?: string;
  rewardHash?: string;
  issued?: boolean;
  purchaseId?: string | null;
  clientNonce?: string | null;
  opened?: boolean;
  completedAtMs?: number | null;
  packName?: string | null;
  claimCount?: number;
  cardCount?: number;
};

export type SportsArenaEntryProof = {
  appendCount?: number;
  cardScores?: SportsArenaEntryCardScoreProof[];
  entryHash?: string;
  lineupHash?: string;
  lastAppendHash?: string | null;
  lastEvent?: SportsArenaLiveAppendRecord | null;
  lockedAt?: string;
  finalizedAt?: string;
  finalScore?: number;
  finalRank?: number | null;
  reward?: SportsArenaEntryReward;
};

export type SportsArenaEntry = {
  schema: "receiz.sports_arena.entry.v1";
  id: string;
  sport: SportsArenaSlug;
  source: "mlb-statsapi" | "fifa-world-cup-26" | "ufc-fighter-roster";
  sourceDate: string;
  arenaKey: string;
  gamePk: string;
  lineupScope: SportsLineupContext;
  slateLabel: string;
  status: "active" | "finalized" | "cancelled";
  lineupSize: number;
  lineupCardIds: string[];
  lineupCollectibleIds: string[];
  lineupCards: unknown[];
  lineupHash: string;
  entryHash: string;
  score: number;
  rank: number | null;
  enteredAt: string;
  finalizedAt: string | null;
  proof: SportsArenaEntryProof;
  reward: SportsArenaEntryReward;
  leaderboard: SportsArenaEntryLeaderboardRow[];
};

export type SportsArenaEntryLineupCardSnapshot = {
  collectibleId: string;
  claimHash: string;
  cardId: string;
  athlete: string;
  teamCode: string;
  position: string;
  rarity?: SportsArenaCard["tier"];
  variantName?: string;
};

export type SportsArenaEntryState = "idle" | "syncing" | "entered" | "finalizing" | "failed";
export type SportsArenaLiveStreamState = "idle" | "connected" | "reconnecting" | "offline" | "unsupported";
export type SportsCardSaveStatus = "idle" | "saving" | "saved" | "failed";
export type SportsCardTransferStatus = "idle" | "sending" | "sent" | "failed";
export type SportsCardListingStatus = "idle" | "saving" | "saved" | "failed";
export type SportsCardTradeStatus = "idle" | "sending" | "sent" | "acting" | "settled" | "failed";

export type SportsCardTransferRecipientOption = {
  kind: "user";
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SportsDailyHabitState = {
  sourceDate: string;
  streak: number;
  lastEnteredDate: string | null;
  lastSharedDate: string | null;
  lastRewardDate: string | null;
  lastResetDate: string | null;
};

export type SportsArenaRankTrend = {
  entryId: string;
  previousRank: number;
  currentRank: number;
  delta: number;
  changedAtMs: number;
};

export type SportsAppendHistoryRow = {
  id: string;
  cardId: string;
  collectibleId?: string;
  eventProofId?: string;
  at: string;
  createdAtMs?: number;
  kaiUpulse?: string;
  kind: SportsArenaAppend["kind"];
  label: string;
  detail: string;
  value: string;
  scoreDelta: number;
  txid: string;
  factors: string[];
  milestone?: SportsArenaEventProofMilestone | null;
  sourceDate?: string;
  gamePk?: string;
  eventType?: string;
  isScoringPlay?: boolean;
  metrics?: SportsArenaLiveEventMetrics;
  rbi?: number;
};

export const SPORTS_VAULT_APPEND_PROOF_MEMORY_SCHEMA = "receiz.sports_arena.card_append_proof_head_memory.v2";

export type SportsVaultAppendProofMemory = {
  schema: typeof SPORTS_VAULT_APPEND_PROOF_MEMORY_SCHEMA;
  complete: true;
  loadedAtMs?: number;
  head?: SportsArenaCardAppendProofHead | null;
};

export type SportsVaultCardAssetState = {
  appends?: SportsArenaLiveAppendRecord[];
  ownershipHistory: SportsArenaCardOwnershipAppend[];
  careerHistory: SportsArenaCardCareerAppend[];
  issue?: SportsArenaCardIssue | null;
  issueProof?: SportsArenaCardIssueProof | null;
  appendProofMemory?: SportsVaultAppendProofMemory | null;
  cardStateHead?: SportsCardStateHeadV119 | null;
  offlineTransferAppend?: SportsArenaCardOwnershipAppend | null;
  bearerTransfer?: boolean;
};

export type SportsVaultImportedAssetsById = Record<string, SportsVaultCardAssetState>;

function sportsVaultCardScoreSummaryForClaim(args: {
  accountAppendRows?: readonly SportsAppendHistoryRow[];
  asset: SportsVaultCardAssetState;
  verifiedClaim: SportsArenaCardClaim;
}): SportsArenaVaultCardScoreSummary {
  const appendProofHead = sportsArenaCardAppendProofHeadFromValue(args.asset.appendProofMemory?.head);
  if (
    appendProofHead &&
    appendProofHead.collectibleId === args.verifiedClaim.collectibleId &&
    appendProofHead.claimHash === args.verifiedClaim.claimHash
  ) {
    return {
      currentScore: Number(appendProofHead.scoreDeltaTotal.toFixed(2)),
      historyCount: appendProofHead.appendCount,
      latestAppendLabel: appendProofHead.latestEventKey,
      latestAppendAt: appendProofHead.latestObservedAt,
    };
  }
  const appendRows = sportsVaultAppendRowsForClaim(args.verifiedClaim, args.accountAppendRows ?? []);
  if (appendRows.length > 0) {
    const latest = appendRows[0] ?? null;
    return {
      currentScore: Number(appendRows.reduce((sum, row) => sum + row.scoreDelta, 0).toFixed(2)),
      historyCount: appendRows.length,
      latestAppendLabel: latest ? [latest.label, latest.value].filter(Boolean).join(" - ") : null,
      latestAppendAt: latest?.at ?? null,
    };
  }

  const careerRows = args.asset.careerHistory
    .filter((append) =>
      append.collectibleId === args.verifiedClaim.collectibleId &&
      append.claimHash === args.verifiedClaim.claimHash
    )
    .slice()
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at) || right.hash.localeCompare(left.hash));
  const latest = careerRows[0] ?? null;
  const latestScore = careerRows.find((append) => typeof append.scoreTotal === "number" && Number.isFinite(append.scoreTotal))?.scoreTotal ?? 0;
  return {
    currentScore: Number((latestScore ?? 0).toFixed(2)),
    historyCount: careerRows.length,
    latestAppendLabel: latest ? [latest.label, latest.value].filter(Boolean).join(" - ") : null,
    latestAppendAt: latest?.at ?? null,
  };
}

export function sportsVaultOfflineTransferAssetsFromPayload(
  value: unknown,
  claims: SportsArenaCardClaim[],
  fallbackAssetsById: SportsVaultImportedAssetsById,
): SportsVaultImportedAssetsById {
  const payloadAssets = isRecord(value) ? value : {};
  const assets: SportsVaultImportedAssetsById = {};
  for (const claim of claims) {
    const fallbackAsset = fallbackAssetsById[claim.collectibleId] ?? { ownershipHistory: [], careerHistory: [], issue: claim.issue ?? null };
    const payloadAsset = payloadAssets[claim.collectibleId];
    const ownershipHistory = sportsArenaCardOwnershipHistoryFromAsset(payloadAsset);
    const careerHistory = sportsArenaCardCareerHistoryFromAsset(payloadAsset);
    const issueProof = sportsCardIssueProofFromValue(isRecord(payloadAsset) ? payloadAsset.issueProof : null, claim) ?? fallbackAsset.issueProof ?? null;
    const payloadIssue = isRecord(payloadAsset) && isSportsArenaCardIssue(payloadAsset.issue) ? payloadAsset.issue : null;
    assets[claim.collectibleId] = {
      ownershipHistory: ownershipHistory.length > 0 ? ownershipHistory : fallbackAsset.ownershipHistory,
      careerHistory: careerHistory.length > 0 ? careerHistory : fallbackAsset.careerHistory,
      issue: isSportsArenaCardIssue(claim.issue) ? claim.issue : payloadIssue ?? issueProof?.issue ?? fallbackAsset.issue ?? null,
      issueProof,
      offlineTransferAppend: null,
      bearerTransfer: false,
    };
  }
  return assets;
}

export type PreparedSportsVaultArchive = {
  archive: Awaited<ReturnType<typeof buildVerifiableReceizVaultRestoreZip>>;
  createdAtMs: number;
  manifestCards: SportsArenaVaultCardManifestCard[];
  vaultCardId: string;
  verifiedClaims: SportsArenaCardClaim[];
};

export type PreparedSportsVaultProjectionSeed = {
  archiveBytes: Uint8Array;
  archiveFilename: string;
  archiveMime: "application/json";
  createdAtMs: number;
  manifestCards: SportsArenaVaultCardManifestCard[];
  vaultCardId: string;
  verifiedClaims: SportsArenaCardClaim[];
};

export type PreparedSportsVaultImage = {
  signature: string;
  vaultCard: SportsArenaVaultCardDownload;
  verifiedClaims: SportsArenaCardClaim[];
};

export function heldSportsVaultImageForImmediateSave(
  prepared: PreparedSportsVaultImage | null,
): PreparedSportsVaultImage | null {
  return prepared;
}

type PreparedSportsVaultImageRef = {
  prepared: PreparedSportsVaultImage | null;
  signature: string;
  promise: Promise<PreparedSportsVaultImage | null>;
};

function sportsVaultSaveArtifactSignature(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows: SportsAppendHistoryRow[];
  claims: SportsArenaCardClaim[];
  ownerLabel: string | null;
  ownerUserId: string | null;
  sport: SportsArenaSlug;
}): string {
  const owned = mergeSportsClaims([], args.claims)
    .filter((claim) => claim.sport === args.sport)
    .sort((left, right) => left.collectibleId.localeCompare(right.collectibleId) || left.claimHash.localeCompare(right.claimHash));
  if (owned.length === 0) return "";
  const cards = owned.map((claim) => {
    const asset = args.accountSportsAssetsById[claim.collectibleId];
    const ownership = (asset?.ownershipHistory ?? []).map((append) => append.hash).join(",");
    const career = (asset?.careerHistory ?? []).map((append) => append.hash).join(",");
    const scoreRows = sportsVaultAppendRowsForClaim(claim, args.accountAppendRows)
      .map((row) => `${row.id}:${row.txid}:${row.scoreDelta}:${row.createdAtMs ?? ""}`)
      .join(",");
    const issueProof = asset?.issueProof?.proofHash ?? "";
    const issue = asset?.issue ? `${asset.issue.rarity}:${asset.issue.variantIssueNumber}:${asset.issue.overallIssueNumber}` : "";
    return `${claim.collectibleId}:${claim.claimHash}:${ownership}:${career}:${scoreRows}:${issueProof}:${issue}`;
  });
  return [
    args.sport,
    args.ownerUserId ?? "local",
    args.ownerLabel ?? "",
    ...cards,
  ].join("|");
}

export function usePreparedSportsVaultImage(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows: SportsAppendHistoryRow[];
  claims: SportsArenaCardClaim[];
  enabled: boolean;
  ownerLabel: string | null;
  ownerUserId: string | null;
  publicVaultUrl: string | null;
  sport: SportsArenaSlug;
}): {
  preparedSportsVaultImageForSave: PreparedSportsVaultImage | null;
  prepareSportsVaultImageForSave: (signature?: string) => Promise<PreparedSportsVaultImage | null>;
  sportsVaultImageReady: boolean;
  sportsVaultSaveSignature: string;
} {
  const preparedSportsVaultImageRef = useRef<PreparedSportsVaultImageRef | null>(null);
  const [preparedSportsVaultImageForSave, setPreparedSportsVaultImageForSave] = useState<PreparedSportsVaultImage | null>(null);
  const sportsVaultSaveSignature = useMemo(() => sportsVaultSaveArtifactSignature({
    accountSportsAssetsById: args.accountSportsAssetsById,
    accountAppendRows: args.accountAppendRows,
    claims: args.claims,
    ownerLabel: args.ownerLabel,
    ownerUserId: args.ownerUserId,
    sport: args.sport,
  }), [args.accountAppendRows, args.accountSportsAssetsById, args.claims, args.ownerLabel, args.ownerUserId, args.sport]);
  const buildPreparedSportsVaultImage = useCallback(async (signature: string): Promise<PreparedSportsVaultImage | null> => {
    if (!signature) return null;
    const candidateClaims = mergeSportsClaims([], args.claims).filter((claim) => claim.sport === args.sport);
    if (candidateClaims.length === 0) return null;
    const vaultCardId = await sportsArenaLiveVaultCardId(args.ownerUserId || candidateClaims[0]?.ownerUserId || "local", args.sport);
    const prepared = await prepareSportsVaultArchive({
      accountSportsAssetsById: args.accountSportsAssetsById,
      accountAppendRows: args.accountAppendRows,
      candidateClaims,
      createdAtMs: Date.now(),
      includeBearerTransfer: true,
      ownerUserId: args.ownerUserId,
      vaultCardId,
    });
    if (prepared.verifiedClaims.length === 0) return null;
    const { buildSportsArenaVaultCardDownload } = await import("./sportsArenaVaultCardExport");
    const vaultCard = await buildSportsArenaVaultCardDownload({
      archiveBytes: prepared.archive.bytes,
      archiveFilename: prepared.archive.filename,
      archiveMime: prepared.archive.mime,
      cardCount: prepared.verifiedClaims.length,
      cards: prepared.manifestCards,
      createdAtMs: prepared.createdAtMs,
      ownerLabel: args.ownerLabel,
      publicVaultUrl: args.publicVaultUrl,
      vaultCardId: prepared.vaultCardId,
    });
    writeSportsVaultRouteSnapshot(sportsVaultExplorerPayloadFromManifest({
      manifest: vaultCard.manifest,
      ownerLabel: args.ownerLabel,
      ownerUserId: args.ownerUserId || candidateClaims[0]?.ownerUserId || "local",
      username: null,
    }));
    return {
      signature,
      vaultCard,
      verifiedClaims: prepared.verifiedClaims,
    };
  }, [args.accountAppendRows, args.accountSportsAssetsById, args.claims, args.ownerLabel, args.ownerUserId, args.publicVaultUrl, args.sport]);

  useEffect(() => {
    if (!args.enabled || !sportsVaultSaveSignature) {
      preparedSportsVaultImageRef.current = null;
      setPreparedSportsVaultImageForSave(null);
    }
  }, [args.enabled, sportsVaultSaveSignature]);

  const prepareSportsVaultImageForSave = useCallback(async (signature = sportsVaultSaveSignature): Promise<PreparedSportsVaultImage | null> => {
    const warmedRef = preparedSportsVaultImageRef.current?.signature === signature
      ? preparedSportsVaultImageRef.current
      : null;
    if (warmedRef?.prepared?.signature === signature) return warmedRef.prepared;
    const preparationPromise = warmedRef?.promise ?? buildPreparedSportsVaultImage(signature);
    if (!warmedRef) {
      preparedSportsVaultImageRef.current = { signature, promise: preparationPromise, prepared: null };
    }
    const warmedImage = await preparationPromise;
    const preparedImage = warmedImage?.signature === signature ? warmedImage : null;
    if (preparedImage) {
      preparedSportsVaultImageRef.current = { signature, promise: Promise.resolve(preparedImage), prepared: preparedImage };
      setPreparedSportsVaultImageForSave(preparedImage);
    } else if (preparedSportsVaultImageRef.current?.signature === signature) {
      preparedSportsVaultImageRef.current = null;
    }
    return preparedImage;
  }, [buildPreparedSportsVaultImage, sportsVaultSaveSignature]);

  useEffect(() => {
    if (!args.enabled || !sportsVaultSaveSignature) return;
    void prepareSportsVaultImageForSave(sportsVaultSaveSignature);
  }, [args.enabled, prepareSportsVaultImageForSave, sportsVaultSaveSignature]);

  return {
    preparedSportsVaultImageForSave,
    prepareSportsVaultImageForSave,
    sportsVaultImageReady: Boolean(heldSportsVaultImageForImmediateSave(preparedSportsVaultImageForSave)),
    sportsVaultSaveSignature,
  };
}

export const LIVE_ROTATION_MS = 4200;
export const LIVE_FEED_REFRESH_MS = 5_000;
export const SPORTS_MOMENT_BURST_RECENT_MS = LIVE_FEED_REFRESH_MS + 1_500;
export const SPORTS_VAULT_ACCOUNT_HYDRATION_PAGE_SIZE = 120;
export const SPORTS_VAULT_ACCOUNT_HYDRATION_MAX_PAGES = 40;
export const SPORTS_PACK_REVEAL_SHELL_MS = 89;
export const SPORTS_PACK_REVEAL_RIP_MS = 89;
export const SPORTS_PACK_CARD_DRAG_CLICK_SUPPRESS_MS = 180;
export const SPORTS_PACK_SYNC_RETRY_DELAYS_MS = [260, 700, 1400] as const;
export const SPORTS_PACK_FUNDING_STORAGE_KEY = "receiz.sports.baseball.pack-funding.v1";
export const SPORTS_TOURNAMENT_FUNDING_STORAGE_KEY = "receiz.sports.baseball.tournament-funding.v1";
export const SPORTS_TOURNAMENT_VIEW_STORAGE_KEY = "receiz.sports.baseball.tournament-view.v1";
export const SPORTS_TOURNAMENT_COLLECTED_STORAGE_KEY = "receiz.sports.baseball.tournament-collected.v1";
export const SPORTS_ARENA_COLLECTED_ENTRY_STORAGE_KEY = "receiz.sports.baseball.entry-collected.v1";
export const SPORTS_ARENA_ENTRY_STORAGE_KEY = "receiz.sports.baseball.entries.v1";
export const SPORTS_ARENA_ENTRY_STORAGE_LIMIT = 64;
export const SPORTS_DAILY_HABIT_STORAGE_KEY = "receiz.sports.baseball.daily-habit.v1";
export const SPORTS_LIVE_FEED_STORAGE_KEY = "receiz.sports.baseball.live-feed.v1";
export const SPORTS_LIVE_APPEND_STORAGE_KEY = "receiz.sports.baseball.live-appends.v1";
export const SPORTS_VAULT_SNAPSHOT_DB_NAME = "receiz.sports_arena.baseball_vault.db.v1";
export const SPORTS_VAULT_SNAPSHOT_DB_STORE = "cards";
export const SPORTS_VAULT_IMMUTABLE_ARTIFACT_DB_STORE = "immutable-card-artifacts";
export const SPORTS_VAULT_FIRST_PAINT_HANDOFF_SCHEMA = "receiz.sports_arena.vault_first_paint_handoff.v119";
export const SPORTS_VAULT_FIRST_PAINT_HANDOFF_STORAGE_KEY = "receiz.sports_arena.vault_first_paint_handoff.v119";
export const SPORTS_VAULT_EVENT_PROOF_DB_STORE = "eventProofs";
export const SPORTS_CARD_TRANSFERRED_OUT_STORAGE_KEY = "receiz.sports_arena.cards.transferred-out.v1";
export const SPORTS_CARD_SEAL_MANIFEST_KEY = "receiz.sports_arena.card_seal_manifest";
export const SPORTS_CARD_TRANSFER_MANIFEST_KEY = "receiz.sports_arena.card_transfer";
export const SPORTS_CARD_TRANSFER_MODE = "offline-bearer-image";
export const SPORTS_VAULT_ARCHIVE_SCHEMA = "receiz.sports_arena.vault_archive.v1";
export const SPORTS_VAULT_ARCHIVE_MANIFEST_PATH = "sports-vault/manifest.json";
export const sportsVaultArchiveTextEncoder = new TextEncoder();
export const SPORTS_ARENA_FREE_PACK_ID = CANONICAL_SPORTS_ARENA_FREE_PACK_ID;
export const SPORTS_WORLD_CUP_FREE_PACK_ID = CANONICAL_SPORTS_WORLD_CUP_FREE_PACK_ID;
export const STRIKE_ZONE_HALF_WIDTH_FT = 0.83;
export const STRIKE_ZONE_BOTTOM_FT = 1.5;
export const STRIKE_ZONE_TOP_FT = 3.5;
export const PITCH_LOCATION_FRAME_LIMIT_PCT = 44;
export const pitchLocationClamp = (value: number) => Math.max(
  -PITCH_LOCATION_FRAME_LIMIT_PCT,
  Math.min(100 + PITCH_LOCATION_FRAME_LIMIT_PCT, value),
);
export const SPORTS_ARENA_SHOP_PACKS = SPORTS_ARENA_PACKS.filter((pack) => pack.category !== "reward");

export function sportsArenaShopPacksForSport(sport: SportsArenaSlug): SportsArenaPackDefinition[] {
  return sportsArenaPackCatalogForSport(sport).filter((pack) => pack.category !== "reward");
}

export function sportsPackOpenActionLabel(pack: SportsArenaPackDefinition, opening: boolean): string {
  if (opening) return "Opening...";
  if (pack.priceUsdCents === 0) return `Claim ${pack.cardCount} free`;
  return `Open ${pack.cardCount} · ${sportsArenaPackPriceLabel(pack)}`;
}

export function sportsPackReceiptWithClaimCardIds(receipt: SportsArenaPackReceipt, claims: SportsArenaCardClaim[]): SportsArenaPackReceipt {
  const claimCardIds = claims.map((claim) => claim.cardId).filter(Boolean);
  if (claimCardIds.length === 0) return receipt;
  const receiptCardIds = receipt.cardIds.length === claimCardIds.length ? receipt.cardIds : claimCardIds;
  return receiptCardIds === receipt.cardIds ? receipt : { ...receipt, cardIds: receiptCardIds };
}

export function upsertSportsPackReceipt(current: SportsArenaPackReceipt[], receipt: SportsArenaPackReceipt): SportsArenaPackReceipt[] {
  const existingIndex = current.findIndex((candidate) => candidate.clientNonce === receipt.clientNonce);
  if (existingIndex < 0) return [receipt, ...current];
  const existingReceipt = current[existingIndex];
  if (existingReceipt && existingReceipt.cardIds.length >= receipt.cardIds.length) return current;
  return current.map((candidate, index) => index === existingIndex ? receipt : candidate);
}

export function sportsPackRaritySummary(pack: SportsArenaPackDefinition): string {
  const odds = sportsArenaPackOddsBreakdown(pack);
  if (pack.priceUsdCents === 0) return "Base proof objects";
  return `Rare+ ${odds.rarePlusLine} · Gold+ ${odds.goldPlusLine}`;
}

export function sportsVaultArchiveSafeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "card";
}

export function sportsVaultArchiveCardPath(claim: SportsArenaCardClaim, leaf: string): string {
  return `sports-vault/cards/${sportsVaultArchiveSafeSegment(claim.collectibleId)}/${leaf}`;
}

export async function sportsVaultArchiveSha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sportsVaultArchiveFile(path: string, mime: string, bytes: Uint8Array): Promise<ReceizVaultRestoredFile> {
  const sha256 = await sportsVaultArchiveSha256(bytes);
  return {
    fileId: sha256.slice(0, 24),
    path,
    mime,
    size: bytes.byteLength,
    chunkRootSha256: sha256,
    bytes,
  };
}

export async function sportsVaultArchiveJsonFile(path: string, value: unknown): Promise<ReceizVaultRestoredFile> {
  return sportsVaultArchiveFile(path, "application/json", sportsVaultArchiveTextEncoder.encode(JSON.stringify(value, null, 2)));
}

export function sportsVaultArchiveJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function sportsCardOwnershipAppendHash(value: Record<string, unknown>): Promise<string> {
  return sportsVaultArchiveSha256(sportsVaultArchiveTextEncoder.encode(JSON.stringify(value)));
}

export async function buildSportsCardOfflineTransferAppend(args: {
  claim: SportsArenaCardClaim;
  fromUserId: string | null;
}): Promise<SportsArenaCardOwnershipAppend> {
  const transferId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const append = {
    schema: "receiz.sports_arena.card_ownership_append.v1" as const,
    eventKind: "transfer" as const,
    collectibleId: args.claim.collectibleId,
    claimHash: args.claim.claimHash,
    fromUserId: args.fromUserId,
    toUserId: null,
    ownerUserId: null,
    ownerUsername: null,
    transferId,
    packPurchaseId: args.claim.pack.purchaseId,
    at: new Date().toISOString(),
  };
  return {
    ...append,
    hash: await sportsCardOwnershipAppendHash(append),
  };
}

function sportsVaultManifestCardFromVerifiedClaim(args: {
  careerPath: string | null;
  claimPath: string;
  ownershipPath: string;
  scoreSummary: SportsArenaVaultCardScoreSummary;
  verifiedClaim: SportsArenaCardClaim;
}): SportsArenaVaultCardManifestCard {
  return {
    collectibleId: args.verifiedClaim.collectibleId,
    claimHash: args.verifiedClaim.claimHash,
    sport: args.verifiedClaim.sport,
    athlete: args.verifiedClaim.athlete,
    teamCode: args.verifiedClaim.teamCode,
    position: args.verifiedClaim.position,
    rarity: args.verifiedClaim.rarity,
    rating: args.verifiedClaim.rating,
    projectedScore: args.verifiedClaim.projectedScore,
    baseTier: args.verifiedClaim.baseTier,
    baseCard: {
      ...args.verifiedClaim.baseCard,
      issueLine: sportsArenaClaimIssueLine(args.verifiedClaim) ?? "",
    },
    proof: {
      source: args.verifiedClaim.proof.source,
      basisHash: args.verifiedClaim.proof.basisHash,
      rule: args.verifiedClaim.proof.rule,
      statBasis: args.verifiedClaim.proof.statBasis.slice(),
    },
    media: { ...args.verifiedClaim.media },
    scoreSummary: args.scoreSummary,
    claimPath: args.claimPath,
    ownershipPath: args.ownershipPath,
    careerPath: args.careerPath,
  };
}

export async function prepareSportsVaultProjectionSeed(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows?: SportsAppendHistoryRow[];
  candidateClaims: SportsArenaCardClaim[];
  createdAtMs: number;
  vaultCardId: string;
}): Promise<PreparedSportsVaultProjectionSeed> {
  const verifiedClaims: SportsArenaCardClaim[] = [];
  const manifestCards: SportsArenaVaultCardManifestCard[] = [];
  for (const claim of args.candidateClaims) {
    const verifiedClaim = await sportsVaultCanonicalClaimForVerification(claim);
    if (!verifiedClaim) continue;
    verifiedClaims.push(verifiedClaim);
    const asset = args.accountSportsAssetsById[verifiedClaim.collectibleId] ?? { ownershipHistory: [], careerHistory: [], issue: verifiedClaim.issue ?? null };
    const claimPath = sportsVaultArchiveCardPath(verifiedClaim, "claim.json");
    const ownershipPath = sportsVaultArchiveCardPath(verifiedClaim, "ownership.json");
    const careerPath = asset.careerHistory.length > 0 ? sportsVaultArchiveCardPath(verifiedClaim, "career.json") : null;
    const scoreSummary = sportsVaultCardScoreSummaryForClaim({
      accountAppendRows: args.accountAppendRows,
      asset,
      verifiedClaim,
    });
    manifestCards.push(sportsVaultManifestCardFromVerifiedClaim({ careerPath, claimPath, ownershipPath, scoreSummary, verifiedClaim }));
  }
  const archiveBasis = {
    schema: "receiz.sports_arena.public_vault_projection.archive.v1",
    createdAtMs: args.createdAtMs,
    vaultCardId: args.vaultCardId,
    cardCount: verifiedClaims.length,
    cards: manifestCards,
    verificationRule:
      "Every Sports Arena card claim is verified before public vault projection. The manifest Merkle root binds the visible card set for deterministic route first paint.",
  };
  return {
    archiveBytes: sportsVaultArchiveTextEncoder.encode(JSON.stringify(archiveBasis)),
    archiveFilename: "sports-vault-public-projection.json",
    archiveMime: "application/json",
    createdAtMs: args.createdAtMs,
    manifestCards,
    vaultCardId: args.vaultCardId,
    verifiedClaims,
  };
}

export async function prepareSportsVaultArchive(args: {
  accountSportsAssetsById: Record<string, SportsVaultCardAssetState>;
  accountAppendRows?: SportsAppendHistoryRow[];
  candidateClaims: SportsArenaCardClaim[];
  createdAtMs: number;
  includeBearerTransfer: boolean;
  ownerUserId: string | null;
  vaultCardId: string;
}): Promise<PreparedSportsVaultArchive> {
  const verifiedClaims: SportsArenaCardClaim[] = [];
  const cardFiles: ReceizVaultRestoredFile[] = [];
  const manifestCards: SportsArenaVaultCardManifestCard[] = [];
  for (const claim of args.candidateClaims) {
    const verifiedClaim = await sportsVaultCanonicalClaimForVerification(claim);
    if (!verifiedClaim) continue;
    verifiedClaims.push(verifiedClaim);
    const asset = args.accountSportsAssetsById[verifiedClaim.collectibleId] ?? { ownershipHistory: [], careerHistory: [], issue: verifiedClaim.issue ?? null };
    const ownershipHistory = args.includeBearerTransfer
      ? buildSportsCardOfflineTransferAppend({
          claim: verifiedClaim,
          fromUserId: args.ownerUserId ?? verifiedClaim.ownerUserId,
        }).then((bearerTransferAppend) => [...asset.ownershipHistory, bearerTransferAppend])
      : asset.ownershipHistory;
    const claimPath = sportsVaultArchiveCardPath(verifiedClaim, "claim.json");
    const ownershipPath = sportsVaultArchiveCardPath(verifiedClaim, "ownership.json");
    const careerPath = asset.careerHistory.length > 0 ? sportsVaultArchiveCardPath(verifiedClaim, "career.json") : null;
    const scoreSummary = sportsVaultCardScoreSummaryForClaim({
      accountAppendRows: args.accountAppendRows,
      asset,
      verifiedClaim,
    });

    cardFiles.push(await sportsVaultArchiveJsonFile(claimPath, { claim: verifiedClaim }));
    cardFiles.push(await sportsVaultArchiveJsonFile(ownershipPath, { ownershipHistory: await ownershipHistory }));
    if (careerPath) cardFiles.push(await sportsVaultArchiveJsonFile(careerPath, { careerHistory: asset.careerHistory }));
    manifestCards.push(sportsVaultManifestCardFromVerifiedClaim({ careerPath, claimPath, ownershipPath, scoreSummary, verifiedClaim }));
  }

  const manifestFile = await sportsVaultArchiveJsonFile(SPORTS_VAULT_ARCHIVE_MANIFEST_PATH, {
    schema: SPORTS_VAULT_ARCHIVE_SCHEMA,
    createdAtMs: args.createdAtMs,
    cardCount: verifiedClaims.length,
    cards: manifestCards,
    verificationRule:
      "Every Sports Arena card claim is verified before archive inclusion. The ZIP is sealed with the Receiz Vault restore package manifest for offline verification.",
    restoreRule:
      "Import admits verified card claims and history locally, then account sync mirrors the restored Sports Vault in background.",
  });
  const files = [manifestFile, ...cardFiles];
  const archive = await buildVerifiableReceizVaultRestoreZip({
    files,
    filename: `sports-vault-${new Date(args.createdAtMs).toISOString().slice(0, 10)}.zip`,
    sealMode: "manifest-only",
    compressionLevel: 6,
  });
  return {
    archive,
    createdAtMs: args.createdAtMs,
    manifestCards,
    vaultCardId: args.vaultCardId,
    verifiedClaims,
  };
}

export function sportsVaultArchiveEntryPath(path: string): string {
  return path.replace(/^files\//, "").replace(/^sealed\/files\//, "");
}

export function sportsVaultArchiveClaimPayload(value: unknown): SportsArenaCardClaim | null {
  if (isSportsArenaCardClaim(value)) return value;
  if (isRecord(value) && isSportsArenaCardClaim(value.claim)) return value.claim;
  return null;
}

export function sportsVaultArchiveOwnershipHistoryPayload(value: unknown): SportsArenaCardOwnershipAppend[] {
  const payload = isRecord(value) && Array.isArray(value.ownershipHistory) ? value.ownershipHistory : Array.isArray(value) ? value : [];
  return payload.filter((entry): entry is SportsArenaCardOwnershipAppend =>
    isRecord(entry) &&
    entry.schema === "receiz.sports_arena.card_ownership_append.v1" &&
    typeof entry.collectibleId === "string" &&
    typeof entry.claimHash === "string" &&
    typeof entry.hash === "string",
  );
}

export function sportsCardOfflineTransferAppendFromImage(args: {
  transferText: string | null;
  ownershipHistory: SportsArenaCardOwnershipAppend[];
  claim: SportsArenaCardClaim;
}): SportsArenaCardOwnershipAppend | null {
  if (!args.transferText) return sportsCardOfflineTransferAppendFromHistory(args);
  const transfer = sportsVaultArchiveJsonParse(args.transferText);
  if (!isRecord(transfer)) return sportsCardOfflineTransferAppendFromHistory(args);
  if (
    transfer.schema !== "receiz.sports_arena.card.transfer_download.v1" ||
    transfer.mode !== SPORTS_CARD_TRANSFER_MODE ||
    transfer.collectibleId !== args.claim.collectibleId ||
    transfer.claimHash !== args.claim.claimHash ||
    typeof transfer.transferAppendHash !== "string"
  ) {
    return sportsCardOfflineTransferAppendFromHistory(args);
  }
  return args.ownershipHistory.find((append) =>
    append.eventKind === "transfer" &&
    append.collectibleId === args.claim.collectibleId &&
    append.claimHash === args.claim.claimHash &&
    append.hash === transfer.transferAppendHash &&
    append.toUserId === null &&
    append.ownerUserId === null
  ) ?? null;
}

export function sportsCardOfflineTransferAppendFromHistory(args: {
  ownershipHistory: SportsArenaCardOwnershipAppend[];
  claim: SportsArenaCardClaim;
}): SportsArenaCardOwnershipAppend | null {
  return [...args.ownershipHistory].reverse().find((append) =>
    append.eventKind === "transfer" &&
    append.collectibleId === args.claim.collectibleId &&
    append.claimHash === args.claim.claimHash &&
    append.toUserId === null &&
    append.ownerUserId === null
  ) ?? null;
}

export function sportsCardOwnershipTransferSourceUserId(
  ownershipHistory: SportsArenaCardOwnershipAppend[],
  claim: SportsArenaCardClaim,
): string | null {
  for (const append of [...ownershipHistory].reverse()) {
    if (append.collectibleId !== claim.collectibleId || append.claimHash !== claim.claimHash) continue;
    const ownerUserId = typeof append.ownerUserId === "string" ? append.ownerUserId.trim() : "";
    if (ownerUserId) return ownerUserId;
    const toUserId = typeof append.toUserId === "string" ? append.toUserId.trim() : "";
    if (toUserId) return toUserId;
  }
  return typeof claim.ownerUserId === "string" && claim.ownerUserId.trim() ? claim.ownerUserId.trim() : null;
}

export function sportsVaultArchiveCareerHistoryPayload(value: unknown): SportsArenaCardCareerAppend[] {
  const payload = isRecord(value) && Array.isArray(value.careerHistory) ? value.careerHistory : Array.isArray(value) ? value : [];
  return payload.filter((entry): entry is SportsArenaCardCareerAppend =>
    isRecord(entry) &&
    entry.schema === "receiz.sports_arena.card_career_append.v1" &&
    typeof entry.collectibleId === "string" &&
    typeof entry.claimHash === "string" &&
    typeof entry.hash === "string",
  );
}

export const SPORTS_CARD_RARITY_FILTERS: { key: SportsCardRarityFilter; label: string }[] = [
  { key: "Rare", label: "Rare" },
  { key: "Gold", label: "Gold" },
  { key: "Champion", label: "Champion" },
  { key: "Mythic", label: "Mythic" },
];
export const SPORTS_CARD_VAULT_SORTS: { key: SportsCardVaultSort; label: string }[] = [
  { key: "rating", label: "Rating" },
  { key: "team", label: "Team" },
];

export const sportsTrustExplainers: Array<{
  key: SportsTrustInfoKey;
  label: string;
  title: string;
  body: string;
  skill: string;
}> = [
  {
    key: "receiz-id",
    label: "Proof",
    title: "Receiz ID Proof",
    body: "Receiz ID binds the player, deck, entry, and result to one proof-bearing identity.",
    skill: "Your wins, Passport, and Sports Cards stay attached to you.",
  },
  {
    key: "pbi",
    label: "Ownership",
    title: "PBI Authorship",
    body: "PBI ties the real person behind the passkey to the Receiz ID proof used for entry, cards, and results.",
    skill: "Your deck, run, Passport, and win carry ownership because the action is tied to you.",
  },
  {
    key: "deterministic",
    label: "Skill",
    title: "Deterministic Skill",
    body: "The same verified lineup and stat appends produce the same score, rank, proof, and seal every time.",
    skill: "Better roster building, timing, and lineup choices win because no hidden random path decides the result.",
  },
];

export const BASEBALL_POSITION_FILTERS: Record<SportsCardVaultFilter, { key: BaseballPositionFilter; label: string }[]> = {
  all: [
    { key: "all", label: "All" },
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
    { key: "LF", label: "LF" },
    { key: "CF", label: "CF" },
    { key: "RF", label: "RF" },
    { key: "DH", label: "DH" },
    { key: "SP", label: "SP" },
    { key: "RP", label: "RP" },
    { key: "CP", label: "CP" },
  ],
  owned: [
    { key: "all", label: "All" },
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
    { key: "LF", label: "LF" },
    { key: "CF", label: "CF" },
    { key: "RF", label: "RF" },
    { key: "SP", label: "SP" },
  ],
  hitters: [
    { key: "all", label: "All bats" },
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
    { key: "LF", label: "LF" },
    { key: "CF", label: "CF" },
    { key: "RF", label: "RF" },
    { key: "DH", label: "DH" },
  ],
  infield: [
    { key: "all", label: "All IF" },
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
  ],
  outfield: [
    { key: "all", label: "All OF" },
    { key: "LF", label: "LF" },
    { key: "CF", label: "CF" },
    { key: "RF", label: "RF" },
  ],
  pitchers: [
    { key: "all", label: "All P" },
    { key: "SP", label: "Starters" },
    { key: "RP", label: "Relievers" },
    { key: "CP", label: "Closers" },
  ],
  champions: [
    { key: "all", label: "All elite" },
    { key: "1B", label: "1B" },
    { key: "3B", label: "3B" },
    { key: "LF", label: "LF" },
    { key: "RF", label: "RF" },
    { key: "DH", label: "DH" },
    { key: "SP", label: "SP" },
  ],
  rarity: [
    { key: "all", label: "Owned rarity" },
  ],
  rookies: [
    { key: "all", label: "All RC" },
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
    { key: "LF", label: "LF" },
    { key: "CF", label: "CF" },
    { key: "RF", label: "RF" },
    { key: "SP", label: "SP" },
    { key: "RP", label: "RP" },
  ],
  live: [
    { key: "all", label: "All live" },
    { key: "LF", label: "LF" },
    { key: "RF", label: "RF" },
    { key: "DH", label: "DH" },
  ],
};

export const SOCCER_POSITION_FILTERS: { key: BaseballPositionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "GK", label: "GK" },
  { key: "DF", label: "DF" },
  { key: "MF", label: "MF" },
  { key: "FW", label: "FW" },
];

export const FIGHT_POSITION_FILTERS: { key: BaseballPositionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "WW", label: "WW" },
  { key: "MW", label: "MW" },
  { key: "LHW", label: "LHW" },
  { key: "LW", label: "LW" },
  { key: "CW", label: "CW" },
  { key: "FW", label: "FW" },
  { key: "FLW", label: "FLW" },
  { key: "HW", label: "HW" },
  { key: "BW", label: "BW" },
  { key: "WBW", label: "WBW" },
  { key: "WFLW", label: "WFLW" },
  { key: "WSW", label: "WSW" },
];

export function formatScore(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function formatPickerScore(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10) {
    const rounded = Math.round(value);
    return `${rounded > 0 ? "+" : ""}${rounded}`;
  }
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export function formatSlateCardDisplayNumber(value: number, options: { maximumFractionDigits?: number } = {}): string {
  if (!Number.isFinite(value)) return "0";
  const maximumFractionDigits = Math.max(0, Math.min(4, Math.trunc(options.maximumFractionDigits ?? 4)));
  const rounded = Number(value.toFixed(maximumFractionDigits));
  return rounded.toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function sportsCardDeterministicSeedNumber(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSportsCardHexColor(value: string, fallback: string): string {
  const clean = value.trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean : fallback;
}

function sportsCardHexLuminance(value: string): number | null {
  const clean = normalizeSportsCardHexColor(value, "");
  if (!clean) return null;
  const red = Number.parseInt(clean.slice(1, 3), 16) / 255;
  const green = Number.parseInt(clean.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(clean.slice(5, 7), 16) / 255;
  const channel = (color: number) => color <= 0.03928 ? color / 12.92 : ((color + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

const SPORTS_CARD_LIGHT_LOWER_PANEL_LUMINANCE = 0.58;

function sportsCardUsesLightLowerPanel(palette: SportsArenaTeamPalette): boolean {
  const secondary = sportsCardHexLuminance(palette.secondary);
  return (secondary ?? 0) >= SPORTS_CARD_LIGHT_LOWER_PANEL_LUMINANCE;
}

function fallbackSportsArenaTeamPalette(teamCode: string, mediaColor: string): SportsArenaTeamPalette {
  const seed = sportsCardDeterministicSeedNumber(teamCode || mediaColor || "sports-card");
  const hue = seed % 360;
  return {
    primary: normalizeSportsCardHexColor(mediaColor, `hsl(${hue} 74% 42%)`),
    secondary: `hsl(${(hue + 142) % 360} 92% 68%)`,
    tertiary: `hsl(${(hue + 32) % 360} 72% 78%)`,
  };
}

function sportsArenaTeamPaletteForCard(card: Pick<SportsArenaCard, "teamCode" | "media" | "baseCard">): SportsArenaTeamPalette {
  const teamCode = card.teamCode.trim().toUpperCase();
  const sportKey = `${card.baseCard.sport}:${teamCode}`;
  return SPORTS_ARENA_TEAM_PALETTES[sportKey]
    ?? SPORTS_ARENA_TEAM_PALETTES[teamCode]
    ?? fallbackSportsArenaTeamPalette(teamCode, card.media.dominantColor);
}

export function cardAccentStyle(card: SportsArenaCard): CSSProperties {
  const palette = sportsArenaTeamPaletteForCard(card);
  const lightLowerPanel = sportsCardUsesLightLowerPanel(palette);
  return {
    "--sports-card-accent": palette.primary,
    "--sports-card-media-color": card.media.dominantColor,
    "--sports-card-team-primary": palette.primary,
    "--sports-card-team-secondary": palette.secondary,
    "--sports-card-team-tertiary": palette.tertiary,
    "--sports-card-front-ink": "#f4fbf4",
    "--sports-card-front-muted": "rgba(244, 251, 244, 0.9)",
    "--sports-card-front-plate": lightLowerPanel ? "rgba(2, 7, 6, 0.82)" : "rgba(2, 7, 6, 0.66)",
    "--sports-card-front-outline": lightLowerPanel
      ? "color-mix(in srgb, var(--sports-card-team-primary) 74%, rgba(255, 255, 255, 0.32))"
      : "color-mix(in srgb, var(--sports-card-team-primary) 58%, rgba(255, 255, 255, 0.22))",
    "--sports-card-front-glow": lightLowerPanel
      ? "color-mix(in srgb, var(--sports-card-team-primary) 42%, rgba(0, 0, 0, 0.46))"
      : "color-mix(in srgb, var(--sports-card-team-primary) 34%, rgba(0, 0, 0, 0.32))",
    "--sports-card-front-shadow": "0 1px 0 rgba(0, 0, 0, 0.92), 0 0 0.28rem rgba(0, 0, 0, 0.86), 0 0 0.82rem var(--sports-card-front-glow)",
  } as CSSProperties;
}

export function sportsCardHoloStyle(card: SportsArenaCard): CSSProperties {
  const seed = sportsCardDeterministicSeedNumber(`${card.baseCard.basisHash}:${card.id}:${card.teamCode}:${card.position}:${card.tier}`);
  return {
    ...cardAccentStyle(card),
    "--sports-card-holo-angle": `${seed % 360}deg`,
    "--sports-card-holo-x": `${18 + (seed % 64)}%`,
    "--sports-card-holo-y": `${12 + ((seed >>> 7) % 70)}%`,
    "--sports-card-holo-band": `${32 + ((seed >>> 13) % 44)}%`,
  } as CSSProperties;
}

export function sportsCardHasIssuedRarity(card: Pick<SportsArenaCard, "tier">): boolean {
  return card.tier !== "Common";
}

export function issuedSportsCardStyle(card: SportsArenaCard): CSSProperties {
  return sportsCardHasIssuedRarity(card) ? sportsCardHoloStyle(card) : cardAccentStyle(card);
}

export function appendTone(append: Pick<SportsAppendHistoryRow, "kind" | "scoreDelta">): string {
  if (append.scoreDelta > 0) return "gain";
  if (append.scoreDelta < 0) return "loss";
  return append.kind;
}

export function baseDiamondState(baseState: string) {
  return {
    first: baseState === "runner-on-1st" || baseState === "runners-on-1st-2nd" || baseState === "runners-on-1st-3rd" || baseState === "loaded",
    second: baseState === "runner-on-2nd" || baseState === "runners-on-1st-2nd" || baseState === "runners-on-2nd-3rd" || baseState === "loaded",
    third: baseState === "runner-on-3rd" || baseState === "runners-on-1st-3rd" || baseState === "runners-on-2nd-3rd" || baseState === "loaded",
  };
}

export function liveBadgeSummary(feed: SportsArenaLiveFeed | null, fallbackGameCount: number, sport: SportsArenaSlug = "baseball"): string {
  const slateUnit = sport === "fight" ? "FIGHTS" : sport === "soccer" ? "MATCHES" : "GMS";
  if (!feed) return `${fallbackGameCount} ${slateUnit}`;
  if (feed.inProgressGames > 0) return `${feed.inProgressGames} LIVE`;
  if (feed.totalGames > 0) return `${feed.totalGames} ${slateUnit}`;
  return sport === "fight" ? "UFC" : sport === "soccer" ? "FIFA" : "MLB";
}

export function compactSportsSignal(line: string): string {
  const [signal] = line.split(" - ");
  return signal.trim() || line;
}

export function isSportsArenaLiveFeed(value: unknown): value is SportsArenaLiveFeed {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Partial<SportsArenaLiveFeed>).schema === "receiz.sports_arena.live_feed.v1" &&
    Array.isArray((value as Partial<SportsArenaLiveFeed>).scoreboards);
}

export function sportsLiveFeedBelongsToSport(feed: unknown, sport: SportsArenaSlug): feed is SportsArenaLiveFeed {
  if (!isSportsArenaLiveFeed(feed)) return false;
  return (sport === "baseball" && feed.source === "mlb-statsapi") ||
    (sport === "soccer" && feed.source === "fifa-world-cup-26");
}

export function isSportsArenaCard(value: unknown): value is SportsArenaCard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const card = value as Partial<SportsArenaCard>;
  return typeof card.id === "string" &&
    typeof card.athlete === "string" &&
    typeof card.teamCode === "string" &&
    typeof card.position === "string" &&
    typeof card.rating === "number" &&
    typeof card.projectedScore === "number" &&
    Boolean(card.media?.sourceId) &&
    Boolean(card.baseCard?.basisHash);
}

export function isSportsArenaLiveAppendRecord(value: unknown): value is SportsArenaLiveAppendRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<SportsArenaLiveAppendRecord>;
  const sportSourceValid = (record.sport === "baseball" && record.source === "mlb-statsapi") ||
    (record.sport === "soccer" && record.source === "fifa-world-cup-26") ||
    (record.sport === "fight" && record.source === "ufc-event-feed");
  return record.schema === "receiz.sports_arena.card_append.v1" &&
    sportSourceValid &&
    typeof record.appendHash === "string" &&
    typeof record.collectibleId === "string" &&
    typeof record.claimHash === "string" &&
    typeof record.cardId === "string" &&
    typeof record.createdAtMs === "number" &&
    Boolean(record.sourceProof?.eventKey) &&
    Boolean(record.subject?.personId) &&
    typeof record.scoring?.scoreDelta === "number";
}

let sportsLiveFeedMemory: SportsArenaLiveFeed | null = null;
let sportsLiveAppendMemory: { ownerUserId: string; appends: SportsArenaLiveAppendRecord[] } | null = null;
let sportsArenaEntryMemory: { ownerUserId: string; entries: SportsArenaEntry[] } | null = null;

export function sportsLiveFeedHasLiveGames(feed: SportsArenaLiveFeed | null | undefined): boolean {
  return Boolean(feed && (feed.inProgressGames > 0 || feed.scoreboards.some((scoreboard) => scoreboard.status === "live")));
}

export function sportsLiveFeedHasScheduledGames(feed: SportsArenaLiveFeed | null | undefined): boolean {
  return Boolean(feed && (feed.totalGames > 0 || feed.scoreboards.length > 0));
}

export function runtimeScoreboards(
  snapshot: Pick<SportsArenaSnapshot, "sport" | "scoreboards">,
  liveFeed: SportsArenaLiveFeed | null | undefined,
): SportsArenaScoreboard[] {
  if (liveFeed) {
    if (liveFeed.scoreboards.length > 0) return liveFeed.scoreboards;
    return liveFeed.nextGame ? [liveFeed.nextGame] : [];
  }
  return snapshot.sport === "baseball" ? [] : snapshot.scoreboards;
}

export function sportsLiveFeedEffectiveSlateDate(
  feed: SportsArenaLiveFeed | null | undefined,
  fallbackSourceDate: string,
): string {
  const scoreboard = feed?.scoreboards.find((entry) => entry.status === "live") ??
    feed?.scoreboards.find((entry) => entry.status !== "final") ??
    feed?.nextGame ??
    null;
  return sportsScoreboardSourceDate(scoreboard) ?? fallbackSourceDate;
}

export function sportsLiveFeedShouldCarryPriorDate(todayFeed: SportsArenaLiveFeed | null, priorFeed: SportsArenaLiveFeed | null): boolean {
  return !sportsLiveFeedHasLiveGames(todayFeed) && sportsLiveFeedHasLiveGames(priorFeed);
}

export function sportsLiveFeedCurrentSourceDate(feed: SportsArenaLiveFeed | null | undefined, todaySourceDate: string): string {
  return sportsLiveFeedEffectiveSlateDate(feed, todaySourceDate);
}

function storedSportsLiveFeedIsAcceptable(feed: SportsArenaLiveFeed, minSourceDate: string): boolean {
  if (feed.sourceDate >= minSourceDate) return true;
  const priorLiveSourceDate = sportsDateOffset(minSourceDate, -1);
  return feed.sourceDate >= priorLiveSourceDate && sportsLiveFeedHasLiveGames(feed);
}

export function readStoredSportsLiveFeed(minSourceDate: string): SportsArenaLiveFeed | null {
  if (typeof window === "undefined") return null;
  if (sportsLiveFeedMemory?.sourceDate) {
    if (storedSportsLiveFeedIsAcceptable(sportsLiveFeedMemory, minSourceDate)) {
      return sportsLiveFeedMemory;
    }
  }
  try {
    const raw = window.localStorage.getItem(SPORTS_LIVE_FEED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSportsLiveFeedStore | null;
    const feed = parsed?.feed;
    if (!isSportsArenaLiveFeed(feed) || typeof feed.sourceDate !== "string") return null;
    if (!storedSportsLiveFeedIsAcceptable(feed, minSourceDate)) return null;
    sportsLiveFeedMemory = feed;
    return feed;
  } catch {
    return null;
  }
}

export function writeStoredSportsLiveFeed(feed: SportsArenaLiveFeed): void {
  if (typeof window === "undefined" || !feed.scoreboards.length) return;
  sportsLiveFeedMemory = feed;
  try {
    window.localStorage.setItem(SPORTS_LIVE_FEED_STORAGE_KEY, JSON.stringify({
      sourceDate: feed.sourceDate,
      feed,
      storedAtMs: Date.now(),
    }));
  } catch {
    // The in-memory feed still protects return navigation when storage is full or unavailable.
  }
}

export function peekStoredSportsLiveAppendsMemory(ownerUserId: string): SportsArenaLiveAppendRecord[] {
  if (!ownerUserId || sportsLiveAppendMemory?.ownerUserId !== ownerUserId) return [];
  return sportsLiveAppendMemory.appends;
}

export function readStoredSportsLiveAppends(ownerUserId: string): SportsArenaLiveAppendRecord[] {
  if (typeof window === "undefined" || !ownerUserId) return [];
  if (sportsLiveAppendMemory?.ownerUserId === ownerUserId) return sportsLiveAppendMemory.appends;
  try {
    const raw = window.localStorage.getItem(SPORTS_LIVE_APPEND_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSportsLiveAppendStore | null;
    if (!parsed || parsed.ownerUserId !== ownerUserId || !Array.isArray(parsed.appends)) return [];
    const appends = parsed.appends.filter(isSportsArenaLiveAppendRecord);
    sportsLiveAppendMemory = { ownerUserId, appends };
    return appends;
  } catch {
    return [];
  }
}

export function writeStoredSportsLiveAppends(ownerUserId: string, appends: SportsArenaLiveAppendRecord[]): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  const storedAppends = mergeSportsLiveAppends([], appends);
  sportsLiveAppendMemory = { ownerUserId, appends: storedAppends };
  try {
    if (!storedAppends.length) {
      window.localStorage.removeItem(SPORTS_LIVE_APPEND_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SPORTS_LIVE_APPEND_STORAGE_KEY, JSON.stringify({
      ownerUserId,
      appends: storedAppends,
      storedAtMs: Date.now(),
    }));
  } catch {
    // The module-level memory cache still prevents the same-session zero-score repaint.
  }
}

export function sportsVaultSnapshotLiveAppends(snapshot: SportsVaultHydrationSnapshot): SportsArenaLiveAppendRecord[] {
  const appends: SportsArenaLiveAppendRecord[] = [];
  for (const asset of Object.values(snapshot.assetsById)) {
    if (!Array.isArray(asset.appends)) continue;
    appends.push(...asset.appends.filter(isSportsArenaLiveAppendRecord));
  }
  return mergeSportsLiveAppends([], appends);
}

export function peekStoredSportsArenaEntriesMemory(ownerUserId: string): SportsArenaEntry[] {
  if (!ownerUserId || sportsArenaEntryMemory?.ownerUserId !== ownerUserId) return [];
  return sportsArenaEntryMemory.entries;
}

export function readStoredSportsArenaEntries(ownerUserId: string): SportsArenaEntry[] {
  if (typeof window === "undefined" || !ownerUserId) return peekStoredSportsArenaEntriesMemory(ownerUserId);
  if (sportsArenaEntryMemory?.ownerUserId === ownerUserId) return sportsArenaEntryMemory.entries;
  try {
    const raw = window.localStorage.getItem(SPORTS_ARENA_ENTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSportsArenaEntryStore | null;
    if (!parsed || parsed.ownerUserId !== ownerUserId || !Array.isArray(parsed.entries)) return [];
    const entries = parsed.entries
      .filter(isSportsArenaEntry)
      .filter((entry) => entry.status === "active" || entry.status === "finalized")
      .slice(0, SPORTS_ARENA_ENTRY_STORAGE_LIMIT);
    sportsArenaEntryMemory = { ownerUserId, entries };
    return entries;
  } catch {
    return [];
  }
}

export function writeStoredSportsArenaEntries(ownerUserId: string, entries: SportsArenaEntry[]): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  const storedEntries = uniqueSportsArenaEntries(entries)
    .filter((entry) => entry.status === "active" || entry.status === "finalized")
    .slice(0, SPORTS_ARENA_ENTRY_STORAGE_LIMIT);
  sportsArenaEntryMemory = { ownerUserId, entries: storedEntries };
  try {
    if (!storedEntries.length) {
      window.localStorage.removeItem(SPORTS_ARENA_ENTRY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SPORTS_ARENA_ENTRY_STORAGE_KEY, JSON.stringify({
      ownerUserId,
      entries: storedEntries,
      storedAtMs: Date.now(),
    }));
  } catch {
    // Background user-live hydration may append additions; accepted local entries protect first paint.
  }
}

export function parseSportsLiveStreamPayload(event: Event): Record<string, unknown> | null {
  try {
    const data = "data" in event ? (event as MessageEvent).data : "";
    const parsed = JSON.parse(String(data)) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function sportsCardMatchesRarity(card: SportsArenaCard, filter: SportsCardRarityFilter): boolean {
  return card.tier === filter;
}

export function sportsCardMatchesSearch(card: SportsArenaCard, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    card.athlete,
    card.team,
    card.teamCode,
    card.opponentCode,
    card.position,
    card.tier,
    card.statLine,
    card.liveLine,
    card.rookie?.rookieClass ?? "",
    card.rookie?.rookieMarketKey ?? "",
    card.rookie?.mlbDebutDate ?? "",
    ...card.tags,
  ].some((value) => value.toLowerCase().includes(normalized));
}

export function cardCountByClaims(claims: SportsArenaCardClaim[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const claim of claims) {
    const key = sportsClaimPlayerKey(claim);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function sportsCardFromClaim(claim: SportsArenaCardClaim): SportsArenaCard {
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
    media: { ...claim.media },
    baseCard: { ...claim.baseCard },
    playerBio: claim.playerBio ?? null,
    historyCount: 0,
  };
}

export function mergeSportsClaims(current: SportsArenaCardClaim[], incoming: SportsArenaCardClaim[]): SportsArenaCardClaim[] {
  const byId = new Map<string, SportsArenaCardClaim>();
  for (const claim of current) byId.set(claim.collectibleId, claim);
  for (const claim of incoming) byId.set(claim.collectibleId, claim);
  return Array.from(byId.values()).sort((a, b) => b.issuedAtMs - a.issuedAtMs || a.collectibleId.localeCompare(b.collectibleId));
}

export function filterTransferredOutSportsClaims(claims: SportsArenaCardClaim[], transferredOutIds: ReadonlySet<string>): SportsArenaCardClaim[] {
  if (transferredOutIds.size === 0) return claims;
  return claims.filter((claim) => !transferredOutIds.has(claim.collectibleId));
}

export function mergeSportsClaimsExcludingTransferredOut(
  current: SportsArenaCardClaim[],
  incoming: SportsArenaCardClaim[],
  transferredOutIds: ReadonlySet<string>,
): SportsArenaCardClaim[] {
  return filterTransferredOutSportsClaims(mergeSportsClaims(current, incoming), transferredOutIds);
}

export function filterTransferredOutSportsVaultSnapshot(
  snapshot: SportsVaultHydrationSnapshot,
  transferredOutIds: ReadonlySet<string>,
): SportsVaultHydrationSnapshot {
  if (transferredOutIds.size === 0) return snapshot;
  const claims = filterTransferredOutSportsClaims(snapshot.claims, transferredOutIds);
  if (claims.length === snapshot.claims.length) return snapshot;
  const admittedIds = new Set(claims.map((claim) => claim.collectibleId));
  return {
    claims,
    assetsById: Object.fromEntries(
      Object.entries(snapshot.assetsById).filter(([collectibleId]) => admittedIds.has(collectibleId)),
    ),
    listingsById: Object.fromEntries(
      Object.entries(snapshot.listingsById).filter(([collectibleId]) => admittedIds.has(collectibleId)),
    ),
  };
}

export function sportsTransferredOutStorageKey(ownerUserId: string, sport: SportsArenaSlug = "baseball"): string {
  return `${SPORTS_CARD_TRANSFERRED_OUT_STORAGE_KEY}:${sport}:${ownerUserId}`;
}

export function readStoredTransferredOutSportsCardIds(ownerUserId: string, sport: SportsArenaSlug = "baseball"): Set<string> {
  if (typeof window === "undefined" || !ownerUserId) return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(sportsTransferredOutStorageKey(ownerUserId, sport)) ?? "null") as { collectibleIds?: unknown } | null;
    return new Set(Array.isArray(parsed?.collectibleIds)
      ? parsed.collectibleIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : []);
  } catch {
    return new Set();
  }
}

export function writeStoredTransferredOutSportsCardIds(ownerUserId: string, ids: ReadonlySet<string>, sport: SportsArenaSlug = "baseball"): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  const collectibleIds = Array.from(ids).filter(Boolean).sort();
  try {
    window.localStorage.setItem(sportsTransferredOutStorageKey(ownerUserId, sport), JSON.stringify({ ownerUserId, sport, collectibleIds }));
  } catch {
    // Local transfer exclusion is a best-effort visible ownership guard; ownership truth remains proof-append-backed.
  }
}

export function sportsArenaCardWithoutSeedProofHistory(card: SportsArenaCard): SportsArenaCard {
  return {
    ...card,
    baseCard: { ...card.baseCard },
    currentScore: 0,
    historyCount: 0,
  };
}

function sportsLocalProofPayloadCards(value: unknown): unknown[] {
  let candidate = value;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 8; depth += 1) {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return [];
    seen.add(candidate);
    const record = candidate as Record<string, unknown>;
    if (record.schema === "receiz.sports_economy.current_registry_seed.v1") {
      const cards = record.cards;
      return Array.isArray(cards) ? cards : [];
    }
    candidate = record.default;
  }
  return [];
}

export function sportsLocalProofCurrentRegistryCards(sport: SportsArenaSlug = "baseball"): SportsArenaCard[] {
  const byPlayer = new Map<string, SportsArenaCard>();
  for (const card of sportsLocalProofPayloadCards(sportsEconomyCurrentRegistrySeedJson)) {
    if (!isSportsArenaCard(card) || card.baseCard.sport !== sport) continue;
    byPlayer.set(sportsCardPlayerKey(card), {
      ...card,
      baseCard: { ...card.baseCard },
      media: { ...card.media },
      tags: [...card.tags],
      playerBio: card.playerBio ? { ...card.playerBio } : null,
      rookie: card.rookie ? { ...card.rookie } : null,
    });
  }
  return Array.from(byPlayer.values()).sort((a, b) => b.rating - a.rating || a.athlete.localeCompare(b.athlete) || a.id.localeCompare(b.id));
}

export function sportsExactCurrentRegistryPersonIds(claims: SportsArenaCardClaim[]): string[] {
  return Array.from(new Set(claims
    .map((claim) => claim.media.source === "mlb" ? claim.media.sourceId.trim() : "")
    .filter((personId) => /^\d+$/.test(personId))))
    .sort((a, b) => a.localeCompare(b));
}

export function mergeSportsRegistryCardsByPlayer(baseCards: SportsArenaCard[], exactCards: SportsArenaCard[]): SportsArenaCard[] {
  const byPlayer = new Map<string, SportsArenaCard>();
  for (const card of baseCards) byPlayer.set(sportsCardPlayerKey(card), card);
  for (const card of exactCards) byPlayer.set(sportsCardPlayerKey(card), card);
  return Array.from(byPlayer.values()).sort((a, b) => b.rating - a.rating || a.athlete.localeCompare(b.athlete) || a.id.localeCompare(b.id));
}

export function sportsCurrentBaseSetCards(args: {
  isFightArena: boolean;
  mlbRegistryCards: SportsArenaCard[];
  snapshotCards: SportsArenaCard[];
  sport: SportsArenaSlug;
  visibleAccountSportsClaims: SportsArenaCardClaim[];
}): SportsArenaCard[] {
  const byPlayer = new Map<string, SportsArenaCard>();
  const rosterCards = args.isFightArena ? UFC_FIGHTER_ROSTER_CARDS : args.snapshotCards;
  for (const card of rosterCards) byPlayer.set(sportsCardPlayerKey(card), card);
  for (const card of sportsLocalProofCurrentRegistryCards(args.sport)) byPlayer.set(sportsCardPlayerKey(card), card);
  for (const card of args.mlbRegistryCards) byPlayer.set(sportsCardPlayerKey(card), card);
  for (const claim of args.visibleAccountSportsClaims) {
    const key = sportsClaimPlayerKey(claim);
    if (!byPlayer.has(key)) byPlayer.set(key, sportsCardFromClaim(claim));
  }
  return Array.from(byPlayer.values()).sort((a, b) => b.rating - a.rating || a.athlete.localeCompare(b.athlete) || a.id.localeCompare(b.id));
}

export function emptySportsVaultHydrationSnapshot(): SportsVaultHydrationSnapshot {
  return { claims: [], assetsById: {}, listingsById: {} };
}

export function sportsVaultTransferredOutIdsFromValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((entry) => typeof entry === "string" ? entry.trim().toLowerCase() : "")
    .filter((entry) => /^rsc_[0-9a-f]{16}$/.test(entry))))
    .sort();
}

export function mergeSportsVaultHydrationSnapshot(
  current: SportsVaultHydrationSnapshot,
  incoming: SportsVaultHydrationSnapshot,
): SportsVaultHydrationSnapshot {
  const assetsById = { ...current.assetsById };
  for (const [collectibleId, incomingAsset] of Object.entries(incoming.assetsById)) {
    assetsById[collectibleId] = mergeSportsVaultCardAssetState(
      current.assetsById[collectibleId],
      incomingAsset,
    );
  }
  return {
    claims: mergeSportsClaims(current.claims, incoming.claims),
    assetsById,
    listingsById: { ...current.listingsById, ...incoming.listingsById },
  };
}

function sportsAppendProofMemoryKai(memory: SportsVaultAppendProofMemory | null): bigint | null {
  const kai = memory?.head?.kaiLatestUpulse;
  return kai && /^\d+$/.test(kai) ? BigInt(kai) : null;
}

export function mergeSportsVaultCardAssetState(
  current: SportsVaultCardAssetState | null | undefined,
  incoming: SportsVaultCardAssetState,
): SportsVaultCardAssetState {
  if (!current) return sportsVaultAssetForStoredSnapshot(incoming, incoming.issue ?? null);
  const currentAppendMemory = sportsVaultCompleteAppendProofMemory(current.appendProofMemory);
  const incomingAppendMemory = sportsVaultCompleteAppendProofMemory(incoming.appendProofMemory);
  const currentAppendKai = sportsAppendProofMemoryKai(currentAppendMemory);
  const incomingAppendKai = sportsAppendProofMemoryKai(incomingAppendMemory);
  const equalKaiConflict = currentAppendKai !== null
    && incomingAppendKai === currentAppendKai
    && currentAppendMemory?.head?.appendMerkleRootSha256 !== incomingAppendMemory?.head?.appendMerkleRootSha256;
  const appendProofMemory = equalKaiConflict
    ? currentAppendMemory
    : currentAppendKai !== null && (incomingAppendKai === null || currentAppendKai > incomingAppendKai)
      ? currentAppendMemory
      : incomingAppendMemory ?? currentAppendMemory;
  const currentStateHead = sportsCardStateHeadFromValue(current.cardStateHead);
  const incomingStateHead = sportsCardStateHeadFromValue(incoming.cardStateHead);
  const identity = incomingStateHead ?? currentStateHead;
  const cardStateHead = identity
    ? selectHighestVerifiedSportsCardStateHead([currentStateHead, incomingStateHead], identity)
    : null;
  return {
    ...current,
    ...incoming,
    appends: mergeSportsLiveAppends(current.appends ?? [], incoming.appends ?? []),
    ownershipHistory: [...new Map([...current.ownershipHistory, ...incoming.ownershipHistory].map((append) => [append.hash, append])).values()],
    careerHistory: [...new Map([...current.careerHistory, ...incoming.careerHistory].map((append) => [append.hash, append])).values()],
    ...(appendProofMemory ? { appendProofMemory } : {}),
    ...(cardStateHead ? { cardStateHead } : {}),
  };
}

export function sportsVaultSnapshotDbName(sport: SportsArenaSlug): string {
  return sport === "soccer" ? "receiz.sports_arena.soccer_vault.db.v1" : SPORTS_VAULT_SNAPSHOT_DB_NAME;
}

export function sportsVaultSnapshotKey(ownerUserId: string, sport: SportsArenaSlug, collectibleId: string): string {
  return `${ownerUserId}:${sport}:${collectibleId}`;
}

function sportsVaultFirstPaintHandoffKey(ownerUserId: string, sport: SportsArenaSlug): string {
  return `${SPORTS_VAULT_FIRST_PAINT_HANDOFF_STORAGE_KEY}:${ownerUserId}:${sport}`;
}

const SPORTS_VAULT_FIRST_PAINT_HANDOFF_CODEC = "z1.";

function encodeSportsVaultFirstPaintHandoff(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return `${SPORTS_VAULT_FIRST_PAINT_HANDOFF_CODEC}${base64UrlEncode(deflateSync(bytes, { level: 9 }))}`;
}

function decodeSportsVaultFirstPaintHandoff(raw: string): Record<string, unknown> | null {
  try {
    const json = raw.startsWith(SPORTS_VAULT_FIRST_PAINT_HANDOFF_CODEC)
      ? new TextDecoder().decode(inflateSync(base64UrlDecode(raw.slice(SPORTS_VAULT_FIRST_PAINT_HANDOFF_CODEC.length))))
      : raw;
    const value = JSON.parse(json) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeSportsVaultFirstPaintHandoff(
  ownerUserId: string,
  snapshot: SportsVaultHydrationSnapshot,
  sport: SportsArenaSlug,
): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  const admittedClaims = snapshot.claims.filter((claim) => (
    claim.ownerUserId === ownerUserId
    && claim.sport === sport
    && isSportsArenaCardClaim(claim)
  ));
  const admittedIds = new Set(admittedClaims.map((claim) => claim.collectibleId));
  const handoff: SportsVaultHydrationSnapshot & {
    schema: typeof SPORTS_VAULT_FIRST_PAINT_HANDOFF_SCHEMA;
    ownerUserId: string;
    sport: SportsArenaSlug;
    admission: "verified-enclosing-proof";
  } = {
    schema: SPORTS_VAULT_FIRST_PAINT_HANDOFF_SCHEMA,
    ownerUserId,
    sport,
    admission: "verified-enclosing-proof",
    claims: admittedClaims,
    assetsById: Object.fromEntries(admittedClaims.map((claim) => {
      const asset = snapshot.assetsById[claim.collectibleId] ?? {
        appends: [],
        ownershipHistory: [],
        careerHistory: [],
        issue: claim.issue ?? null,
      };
      return [claim.collectibleId, sportsVaultAssetForFirstPaintHandoff(asset)];
    })),
    listingsById: Object.fromEntries(Object.entries(snapshot.listingsById)
      .filter(([collectibleId]) => admittedIds.has(collectibleId))),
  };
  try {
    window.localStorage.setItem(sportsVaultFirstPaintHandoffKey(ownerUserId, sport), encodeSportsVaultFirstPaintHandoff(handoff));
  } catch {
    // Complete immutable proof objects remain in IndexedDB when a browser denies the synchronous presentation handoff.
  }
}

export function readSportsVaultFirstPaintHandoff(
  ownerUserId: string,
  sport: SportsArenaSlug,
): SportsVaultHydrationSnapshot | null {
  if (typeof window === "undefined" || !ownerUserId) return null;
  try {
    const raw = window.localStorage.getItem(sportsVaultFirstPaintHandoffKey(ownerUserId, sport));
    const value = raw ? decodeSportsVaultFirstPaintHandoff(raw) : null;
    if (
      !value ||
      value.schema !== SPORTS_VAULT_FIRST_PAINT_HANDOFF_SCHEMA ||
      value.ownerUserId !== ownerUserId ||
      value.sport !== sport ||
      value.admission !== "verified-enclosing-proof" ||
      !Array.isArray(value.claims) ||
      !isRecord(value.assetsById) ||
      !isRecord(value.listingsById)
    ) return null;
    const claims = value.claims.filter((claim): claim is SportsArenaCardClaim => (
      isSportsArenaCardClaim(claim)
      && claim.ownerUserId === ownerUserId
      && claim.sport === sport
    ));
    const assetsById: SportsVaultHydrationSnapshot["assetsById"] = {};
    const listingsById: SportsVaultHydrationSnapshot["listingsById"] = {};
    for (const claim of claims) {
      const candidate = value.assetsById[claim.collectibleId];
      if (!isRecord(candidate)) continue;
      const appendProofMemory = sportsVaultCompleteAppendProofMemory(candidate.appendProofMemory);
      const cardStateHead = sportsCardStateHeadFromValue(candidate.cardStateHead);
      assetsById[claim.collectibleId] = {
        appends: Array.isArray(candidate.appends) ? candidate.appends.filter(isSportsArenaLiveAppendRecord) : [],
        ownershipHistory: sportsArenaCardOwnershipHistoryFromAsset(candidate),
        careerHistory: sportsArenaCardCareerHistoryFromAsset(candidate),
        issue: isSportsArenaCardIssue(candidate.issue) ? candidate.issue : claim.issue ?? null,
        issueProof: sportsCardIssueProofFromValue(candidate.issueProof, claim),
        ...(appendProofMemory ? { appendProofMemory } : {}),
        ...(cardStateHead ? { cardStateHead } : {}),
      };
      listingsById[claim.collectibleId] = sportsArenaCardListingFromValue(value.listingsById[claim.collectibleId]);
    }
    return { claims: claims.filter((claim) => Boolean(assetsById[claim.collectibleId])), assetsById, listingsById };
  } catch {
    return null;
  }
}

export function sportsArenaFirstPaintVaultProjection(args: Readonly<{
  ownerUserId: string;
  signedIn: boolean;
  sport: SportsArenaSlug;
  supportsAppendHydration: boolean;
}>): Readonly<{
  vault: SportsVaultHydrationSnapshot | null;
  appends: SportsArenaLiveAppendRecord[];
}> {
  if (!args.signedIn || !args.ownerUserId) return { vault: null, appends: [] };
  const vault = readSportsVaultFirstPaintHandoff(args.ownerUserId, args.sport);
  const storedAppends = args.supportsAppendHydration
    ? readStoredSportsLiveAppends(args.ownerUserId)
    : [];
  return {
    vault,
    appends: mergeSportsLiveAppends(
      storedAppends,
      Object.values(vault?.assetsById ?? {}).flatMap((asset) => asset.appends ?? []),
    ),
  };
}

export function sportsVaultEventProofKey(ownerUserId: string, sport: SportsArenaSlug, eventProofId: string): string {
  return `${ownerUserId}:${sport}:${eventProofId}`;
}

export function openSportsVaultSnapshotDb(sport: SportsArenaSlug = "baseball"): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(sportsVaultSnapshotDbName(sport), 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SPORTS_VAULT_SNAPSHOT_DB_STORE)) {
        const store = db.createObjectStore(SPORTS_VAULT_SNAPSHOT_DB_STORE, { keyPath: "key" });
        store.createIndex("ownerUserId", "ownerUserId", { unique: false });
      }
      if (!db.objectStoreNames.contains(SPORTS_VAULT_EVENT_PROOF_DB_STORE)) {
        const store = db.createObjectStore(SPORTS_VAULT_EVENT_PROOF_DB_STORE, { keyPath: "key" });
        store.createIndex("ownerUserId", "ownerUserId", { unique: false });
      }
      if (!db.objectStoreNames.contains(SPORTS_VAULT_IMMUTABLE_ARTIFACT_DB_STORE)) {
        const store = db.createObjectStore(SPORTS_VAULT_IMMUTABLE_ARTIFACT_DB_STORE, { keyPath: "immutableKey" });
        store.createIndex("ownerUserId", "ownerUserId", { unique: false });
        store.createIndex("collectibleId", "collectibleId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function recordFromStoredSportsEventProof(
  value: unknown,
  ownerUserId: string,
  sport: SportsArenaSlug = "baseball",
): StoredSportsEventProofRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<StoredSportsEventProofRecord>;
  if (record.ownerUserId !== ownerUserId || record.sport !== sport || typeof record.eventProofId !== "string") return null;
  const proof = sportsArenaEventProofFromValue(record.proof);
  if (!proof || proof.eventProofId !== record.eventProofId) return null;
  return {
    key: sportsVaultEventProofKey(ownerUserId, sport, proof.eventProofId),
    ownerUserId,
    sport,
    eventProofId: proof.eventProofId,
    proof,
    storedAtMs: typeof record.storedAtMs === "number" && Number.isFinite(record.storedAtMs) ? record.storedAtMs : 0,
  };
}

export function recordFromStoredSportsVaultCard(
  value: unknown,
  ownerUserId: string,
  sport: SportsArenaSlug = "baseball",
): StoredSportsVaultCardRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<StoredSportsVaultCardRecord>;
  if (record.ownerUserId !== ownerUserId || typeof record.collectibleId !== "string") return null;
  if (!isSportsArenaCardClaim(record.claim) || record.claim.collectibleId !== record.collectibleId) return null;
  if (record.claim.sport !== sport) return null;
  const asset = record.asset && typeof record.asset === "object" && !Array.isArray(record.asset)
    ? record.asset as StoredSportsVaultCardRecord["asset"]
    : { ownershipHistory: [], careerHistory: [], issue: null };
  const issueProof = sportsCardIssueProofFromValue(asset.issueProof, record.claim);
  const issue = isSportsArenaCardIssue(asset.issue) ? asset.issue : issueProof?.issue ?? null;
  const appends = Array.isArray(asset.appends) ? asset.appends.filter(isSportsArenaLiveAppendRecord) : [];
  const appendProofMemory = sportsVaultCompleteAppendProofMemory(asset.appendProofMemory);
  const cardStateHead = sportsCardStateHeadFromValue(asset.cardStateHead);
  return {
    key: sportsVaultSnapshotKey(ownerUserId, sport, record.collectibleId),
    ownerUserId,
    sport,
    collectibleId: record.collectibleId,
    claim: record.claim,
    asset: {
      appends,
      ownershipHistory: Array.isArray(asset.ownershipHistory) ? asset.ownershipHistory : [],
      careerHistory: Array.isArray(asset.careerHistory) ? asset.careerHistory : [],
      issue,
      issueProof,
      ...(appendProofMemory ? { appendProofMemory } : {}),
      ...(cardStateHead ? { cardStateHead } : {}),
    },
    listing: sportsArenaCardListingFromValue(record.listing),
    storedAtMs: typeof record.storedAtMs === "number" && Number.isFinite(record.storedAtMs) ? record.storedAtMs : 0,
  };
}

export async function readStoredSportsEventProofs(
  ownerUserId: string,
  sport: SportsArenaSlug = "baseball",
): Promise<SportsArenaEventProof[]> {
  if (!ownerUserId) return [];
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db || !db.objectStoreNames.contains(SPORTS_VAULT_EVENT_PROOF_DB_STORE)) {
    db?.close();
    return [];
  }
  return new Promise<SportsArenaEventProof[]>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_EVENT_PROOF_DB_STORE, "readonly");
    const store = tx.objectStore(SPORTS_VAULT_EVENT_PROOF_DB_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const proofs = (Array.isArray(request.result) ? request.result : [])
        .map((entry) => recordFromStoredSportsEventProof(entry, ownerUserId, sport)?.proof ?? null)
        .filter((proof): proof is SportsArenaEventProof => Boolean(proof));
      resolve(uniqueSportsArenaEventProofs(proofs));
    };
    request.onerror = () => resolve([]);
    tx.onabort = () => resolve([]);
  }).finally(() => db.close());
}

export async function writeStoredSportsEventProofs(
  ownerUserId: string,
  proofs: readonly SportsArenaEventProof[],
  sport: SportsArenaSlug = "baseball",
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const admittedProofs = uniqueSportsArenaEventProofs(
    proofs
      .map(sportsArenaEventProofFromValue)
      .filter((proof): proof is SportsArenaEventProof => Boolean(proof)),
  );
  if (!ownerUserId || admittedProofs.length === 0) return;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!isCurrent() || !db || !db.objectStoreNames.contains(SPORTS_VAULT_EVENT_PROOF_DB_STORE)) {
    db?.close();
    return;
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_EVENT_PROOF_DB_STORE, "readwrite");
    const store = tx.objectStore(SPORTS_VAULT_EVENT_PROOF_DB_STORE);
    const storedAtMs = Date.now();
    for (const proof of admittedProofs) {
      const record: StoredSportsEventProofRecord = {
        key: sportsVaultEventProofKey(ownerUserId, sport, proof.eventProofId),
        ownerUserId,
        sport,
        eventProofId: proof.eventProofId,
        proof,
        storedAtMs,
      };
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  }).finally(() => db.close());
}

function sportsOwnedEventProofHistoryMarkerKey(ownerUserId: string, sport: SportsArenaSlug): string {
  return `${ownerUserId}:${sport}:owned-event-proof-history-complete`;
}

export async function readStoredSportsOwnedEventProofHistoryComplete(
  ownerUserId: string,
  sport: SportsArenaSlug = "baseball",
): Promise<boolean> {
  if (!ownerUserId) return false;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db || !db.objectStoreNames.contains(SPORTS_VAULT_EVENT_PROOF_DB_STORE)) {
    db?.close();
    return false;
  }
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_EVENT_PROOF_DB_STORE, "readonly");
    const request = tx.objectStore(SPORTS_VAULT_EVENT_PROOF_DB_STORE).getAll();
    request.onsuccess = () => {
      const records = Array.isArray(request.result) ? request.result : [];
      const markerKey = sportsOwnedEventProofHistoryMarkerKey(ownerUserId, sport);
      const marker = records.find((entry) => entry?.key === markerKey);
      const expectedEventProofCount = typeof marker?.expectedEventProofCount === "number" &&
        Number.isInteger(marker.expectedEventProofCount) && marker.expectedEventProofCount >= 0
        ? marker.expectedEventProofCount
        : null;
      if (
        marker?.historyComplete !== true ||
        marker?.ownerUserId !== ownerUserId ||
        marker?.sport !== sport ||
        expectedEventProofCount === null
      ) {
        resolve(false);
        return;
      }
      const durableEventProofCount = records.reduce(
        (count, entry) => count + (recordFromStoredSportsEventProof(entry, ownerUserId, sport) ? 1 : 0),
        0,
      );
      resolve(durableEventProofCount >= expectedEventProofCount);
    };
    request.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  }).finally(() => db.close());
}

export async function writeStoredSportsOwnedEventProofHistoryComplete(
  ownerUserId: string,
  expectedEventProofCount: number,
  sport: SportsArenaSlug = "baseball",
): Promise<void> {
  if (!ownerUserId || !Number.isInteger(expectedEventProofCount) || expectedEventProofCount < 0) return;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db || !db.objectStoreNames.contains(SPORTS_VAULT_EVENT_PROOF_DB_STORE)) {
    db?.close();
    return;
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_EVENT_PROOF_DB_STORE, "readwrite");
    tx.objectStore(SPORTS_VAULT_EVENT_PROOF_DB_STORE).put({
      key: sportsOwnedEventProofHistoryMarkerKey(ownerUserId, sport),
      ownerUserId,
      sport,
      historyComplete: true,
      expectedEventProofCount,
      storedAtMs: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  }).finally(() => db.close());
}

function sportsVaultAssetForStoredSnapshot(
  asset: SportsVaultCardAssetState | undefined,
  fallbackIssue: SportsArenaCardIssue | null,
): SportsVaultCardAssetState {
  const storedAsset: SportsVaultCardAssetState = asset
    ? { ...asset }
    : { ownershipHistory: [], careerHistory: [], issue: fallbackIssue };
  const appends = Array.isArray(storedAsset.appends) ? storedAsset.appends.filter(isSportsArenaLiveAppendRecord) : [];
  const appendProofMemory = sportsVaultCompleteAppendProofMemory(storedAsset.appendProofMemory);
  const cardStateHead = sportsCardStateHeadFromValue(storedAsset.cardStateHead);
  const {
    appendProofMemory: rawAppendProofMemory,
    cardStateHead: rawCardStateHead,
    ...assetWithoutRawAppendMemory
  } = storedAsset;
  void rawAppendProofMemory;
  void rawCardStateHead;
  return {
    ...assetWithoutRawAppendMemory,
    appends,
    ...(appendProofMemory ? { appendProofMemory } : {}),
    ...(cardStateHead ? { cardStateHead } : {}),
  };
}

export function sportsVaultAssetForFirstPaintHandoff(
  asset: SportsVaultCardAssetState,
): SportsVaultCardAssetState {
  return sportsVaultAssetForStoredSnapshot(asset, asset.issue ?? null);
}

function sportsVaultImmutableArtifactKey(record: StoredSportsVaultCardRecord): string {
  const appendHead = sportsArenaCardAppendProofHeadFromValue(record.asset.appendProofMemory?.head);
  const stateHead = sportsCardStateHeadFromValue(record.asset.cardStateHead);
  const latestOwnershipHash = record.asset.ownershipHistory.at(-1)?.hash ?? "none";
  const latestCareerHash = record.asset.careerHistory.at(-1)?.hash ?? "none";
  const proofCoordinate = stateHead?.stateDigest
    ?? appendHead?.latestAppendHash
    ?? record.asset.issueProof?.proofHash
    ?? record.claim.claimHash;
  return [
    record.ownerUserId,
    record.sport,
    record.collectibleId,
    record.claim.claimHash,
    proofCoordinate,
    latestOwnershipHash,
    latestCareerHash,
  ].join(":");
}

export async function readStoredSportsVaultSnapshot(
  ownerUserId: string,
  sport: SportsArenaSlug = "baseball",
): Promise<SportsVaultHydrationSnapshot | null> {
  if (!ownerUserId) return null;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db) return null;
  return new Promise<SportsVaultHydrationSnapshot | null>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_SNAPSHOT_DB_STORE, "readonly");
    const store = tx.objectStore(SPORTS_VAULT_SNAPSHOT_DB_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const transferredOutIds = readStoredTransferredOutSportsCardIds(ownerUserId, sport);
      const records = (Array.isArray(request.result) ? request.result : [])
        .map((entry) => recordFromStoredSportsVaultCard(entry, ownerUserId, sport))
        .filter((entry) => !entry || !transferredOutIds.has(entry.collectibleId))
        .filter((entry): entry is StoredSportsVaultCardRecord => Boolean(entry));
      if (records.length === 0) {
        resolve(null);
        return;
      }
      const claims = records.map((record) => record.claim);
      const assetsById: SportsVaultHydrationSnapshot["assetsById"] = {};
      const listingsById: SportsVaultHydrationSnapshot["listingsById"] = {};
      for (const record of records) {
        assetsById[record.collectibleId] = record.asset;
        listingsById[record.collectibleId] = record.listing;
      }
      resolve({ claims, assetsById, listingsById });
    };
    request.onerror = () => resolve(null);
    tx.onabort = () => resolve(null);
  }).finally(() => db.close());
}

export function sportsVaultRemoteHeadObservationKey(
  ownerUserId: string,
  sport: SportsArenaSlug,
): string {
  return `receiz.sports_arena.vault.remote-head.v2:${ownerUserId}:${sport}`;
}

export async function fingerprintSportsVaultSnapshot(
  vault: SportsVaultHydrationSnapshot,
): Promise<string> {
  const basis = vault.claims
    .map((claim) => {
      const asset = vault.assetsById[claim.collectibleId];
      return [
        claim.collectibleId,
        claim.claimHash,
        asset?.cardStateHead?.stateDigest ?? null,
        asset?.appendProofMemory?.head?.latestAppendHash ?? null,
        asset?.ownershipHistory.at(-1)?.hash ?? null,
        asset?.careerHistory.at(-1)?.hash ?? null,
      ];
    })
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  const bytes = new TextEncoder().encode(JSON.stringify(basis));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readSportsVaultAnnouncedHead(
  sport: SportsArenaSlug,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const response = await fetch(`/api/game/sports/${sport}/vault?head=1`, {
    cache: "no-store",
    credentials: "same-origin",
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null) as { ok?: unknown; head?: unknown } | null;
  return payload?.ok === true && payload.head && typeof payload.head === "object"
    ? JSON.stringify(payload.head)
    : null;
}

export function sportsVaultHeldHeadMatches(
  ownerUserId: string,
  sport: SportsArenaSlug,
  announcedHead: string,
  localFingerprint: string,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const held = JSON.parse(window.localStorage.getItem(sportsVaultRemoteHeadObservationKey(ownerUserId, sport)) ?? "null") as {
      announcedHead?: unknown;
      localFingerprint?: unknown;
    } | null;
    return held?.announcedHead === announcedHead && held.localFingerprint === localFingerprint;
  } catch {
    return false;
  }
}

export function writeSportsVaultHeldHeadObservation(
  ownerUserId: string,
  sport: SportsArenaSlug,
  announcedHead: string,
  localFingerprint: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      sportsVaultRemoteHeadObservationKey(ownerUserId, sport),
      JSON.stringify({ announcedHead, localFingerprint }),
    );
  } catch {
    // IndexedDB proof custody remains authoritative when the observation hint cannot persist.
  }
}

export async function writeStoredSportsVaultSnapshot(
  ownerUserId: string,
  snapshot: SportsVaultHydrationSnapshot,
  { replace = false, isCurrent = () => true }: { replace?: boolean; isCurrent?: () => boolean } = {},
  sport: SportsArenaSlug = "baseball",
): Promise<void> {
  const admittedSnapshot = filterTransferredOutSportsVaultSnapshot(
    snapshot,
    readStoredTransferredOutSportsCardIds(ownerUserId, sport),
  );
  if (!ownerUserId || (admittedSnapshot.claims.length === 0 && !replace)) return;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db) return;
  if (!isCurrent()) { db.close(); return; }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(
      [SPORTS_VAULT_SNAPSHOT_DB_STORE, SPORTS_VAULT_IMMUTABLE_ARTIFACT_DB_STORE],
      "readwrite",
    );
    const store = tx.objectStore(SPORTS_VAULT_SNAPSHOT_DB_STORE);
    const immutableStore = tx.objectStore(SPORTS_VAULT_IMMUTABLE_ARTIFACT_DB_STORE);
    const records: StoredSportsVaultCardRecord[] = admittedSnapshot.claims.map((claim) => ({
      key: sportsVaultSnapshotKey(ownerUserId, sport, claim.collectibleId),
      ownerUserId,
      sport,
      collectibleId: claim.collectibleId,
      claim,
      asset: sportsVaultAssetForStoredSnapshot(admittedSnapshot.assetsById[claim.collectibleId], claim.issue ?? null),
      listing: admittedSnapshot.listingsById[claim.collectibleId] ?? null,
      storedAtMs: Date.now(),
    }));

    if (replace) {
      const read = store.getAll();
      read.onsuccess = () => {
        if (!isCurrent()) { tx.abort(); return; }
        for (const entry of Array.isArray(read.result) ? read.result : []) {
          const record = recordFromStoredSportsVaultCard(entry, ownerUserId, sport);
          if (record) store.delete(record.key);
        }
        for (const record of records) {
          store.put(record);
          immutableStore.put({ ...record, immutableKey: sportsVaultImmutableArtifactKey(record) });
        }
      };
      read.onerror = () => {
        if (!isCurrent()) { tx.abort(); return; }
        for (const record of records) {
          store.put(record);
          immutableStore.put({ ...record, immutableKey: sportsVaultImmutableArtifactKey(record) });
        }
      };
    } else {
      for (const record of records) {
        store.put(record);
        immutableStore.put({ ...record, immutableKey: sportsVaultImmutableArtifactKey(record) });
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  }).finally(() => db.close());
}

export async function removeStoredSportsVaultCards(
  ownerUserId: string,
  collectibleIds: Iterable<string>,
  sport: SportsArenaSlug = "baseball",
): Promise<void> {
  if (!ownerUserId) return;
  const ids = Array.from(new Set(Array.from(collectibleIds).filter(Boolean)));
  if (ids.length === 0) return;
  const db = await openSportsVaultSnapshotDb(sport);
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(SPORTS_VAULT_SNAPSHOT_DB_STORE, "readwrite");
    const store = tx.objectStore(SPORTS_VAULT_SNAPSHOT_DB_STORE);
    for (const collectibleId of ids) {
      store.delete(sportsVaultSnapshotKey(ownerUserId, sport, collectibleId));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  }).finally(() => db.close());
}

export function sportsVaultSnapshotFromCards(cards: SportsVaultCardPayload[]): SportsVaultHydrationSnapshot {
  const claims = cards
    .map((entry) => {
      const claim = isSportsArenaCardClaim(entry.claim) ? entry.claim : null;
      return claim;
    })
    .filter(isSportsArenaCardClaim);
  const assetsById: SportsVaultHydrationSnapshot["assetsById"] = {};
  const listingsById: SportsVaultHydrationSnapshot["listingsById"] = {};
  for (const entry of cards) {
    const claim = isSportsArenaCardClaim(entry.claim) ? entry.claim : null;
    if (!claim) continue;
    const asset = isRecord(entry.asset) ? entry.asset : {};
    const issueProof = sportsCardIssueProofFromValue(asset.issueProof, claim);
    const appendProofMemory = sportsVaultCompleteAppendProofMemory(asset.appendProofMemory);
    const cardStateHead = sportsCardStateHeadFromValue(asset.cardStateHead);
    assetsById[claim.collectibleId] = {
      appends: Array.isArray(asset.appends) ? asset.appends.filter(isSportsArenaLiveAppendRecord) : [],
      ownershipHistory: sportsArenaCardOwnershipHistoryFromAsset(entry.asset),
      careerHistory: sportsArenaCardCareerHistoryFromAsset(entry.asset),
      issue: isSportsArenaCardIssue(claim.issue) ? claim.issue : isSportsArenaCardIssue(entry.issue) ? entry.issue : issueProof?.issue ?? null,
      issueProof,
      ...(appendProofMemory ? { appendProofMemory } : {}),
      ...(cardStateHead ? { cardStateHead } : {}),
    };
    listingsById[claim.collectibleId] = sportsArenaCardListingFromValue(entry.listing);
  }
  return { claims, assetsById, listingsById };
}

export async function sportsVaultCanonicalClaimForVerification(claim: SportsArenaCardClaim): Promise<SportsArenaCardClaim | null> {
  if (await verifySportsArenaCardClaim(claim)) return claim;
  if (!claim.issue) return null;

  const claimWithoutSyntheticIssue: SportsArenaCardClaim = { ...claim };
  delete claimWithoutSyntheticIssue.issue;
  return await verifySportsArenaCardClaim(claimWithoutSyntheticIssue) ? claimWithoutSyntheticIssue : null;
}

export async function readAccountSportsVaultSnapshot(args: {
  sport?: SportsArenaSlug;
  cursor?: string | null;
  maxPages?: number;
  onPage?: (snapshot: SportsVaultHydrationSnapshot) => void;
} = {}): Promise<SportsVaultHydrationReadResult> {
  if (typeof window === "undefined") return { ...emptySportsVaultHydrationSnapshot(), complete: false, nextCursor: null, transferredOutCollectibleIds: [] };

  let aggregate = emptySportsVaultHydrationSnapshot();
  const transferredOutCollectibleIds = new Set<string>();
  const seenCursors = new Set<string>();
  const maxPages = Math.max(1, args.maxPages ?? SPORTS_VAULT_ACCOUNT_HYDRATION_MAX_PAGES);
  const sport = args.sport ?? "baseball";
  let cursor: string | null = args.cursor ?? null;
  let pagesRead = 0;

  while (true) {
    const params = new URLSearchParams({ limit: String(SPORTS_VAULT_ACCOUNT_HYDRATION_PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/game/sports/${sport}/vault?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    }).catch(() => null);
    if (!response?.ok) return { ...aggregate, complete: false, nextCursor: null, transferredOutCollectibleIds: Array.from(transferredOutCollectibleIds).sort() };
    const payload = await response.json().catch(() => null) as { cards?: unknown; hasMore?: unknown; nextCursor?: unknown; transferredOutCollectibleIds?: unknown } | null;
    if (!payload || !Array.isArray(payload.cards)) return { ...aggregate, complete: false, nextCursor: null, transferredOutCollectibleIds: Array.from(transferredOutCollectibleIds).sort() };
    for (const collectibleId of sportsVaultTransferredOutIdsFromValue(payload.transferredOutCollectibleIds)) {
      transferredOutCollectibleIds.add(collectibleId);
    }

    const page = sportsVaultSnapshotFromCards(payload.cards as SportsVaultCardPayload[]);
    aggregate = mergeSportsVaultHydrationSnapshot(aggregate, page);
    if (page.claims.length > 0) args.onPage?.(page);

    pagesRead += 1;
    const nextCursor = typeof payload.nextCursor === "string" && payload.nextCursor.trim() ? payload.nextCursor : null;
    if (payload.hasMore !== true) return { ...aggregate, complete: true, nextCursor: null, transferredOutCollectibleIds: Array.from(transferredOutCollectibleIds).sort() };
    if (!nextCursor || seenCursors.has(nextCursor)) return { ...aggregate, complete: false, nextCursor: null, transferredOutCollectibleIds: Array.from(transferredOutCollectibleIds).sort() };
    if (pagesRead >= maxPages) return { ...aggregate, complete: false, nextCursor, transferredOutCollectibleIds: Array.from(transferredOutCollectibleIds).sort() };
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}

export function mergeSportsLiveAppends(current: SportsArenaLiveAppendRecord[], incoming: SportsArenaLiveAppendRecord[]): SportsArenaLiveAppendRecord[] {
  const byHash = new Map<string, SportsArenaLiveAppendRecord>();
  for (const append of current) byHash.set(append.appendHash, append);
  for (const append of incoming) byHash.set(append.appendHash, append);
  return Array.from(byHash.values()).sort(compareSportsLiveAppendsDescending);
}

export function groupedSportsArenaClaims(
  claims: readonly SportsArenaCardClaim[],
  keyFor: (claim: SportsArenaCardClaim) => string,
): Map<string, SportsArenaCardClaim[]> {
  const grouped = new Map<string, SportsArenaCardClaim[]>();
  for (const claim of claims) {
    const key = keyFor(claim);
    const group = grouped.get(key);
    if (group) group.push(claim);
    else grouped.set(key, [claim]);
  }
  for (const group of grouped.values()) group.sort(compareSportsCardClaimsByDisplayPriority);
  return grouped;
}

export function sportsVaultCompleteAppendProofMemory(value: unknown): SportsVaultAppendProofMemory | null {
  if (!isRecord(value)) return null;
  if (value.schema !== SPORTS_VAULT_APPEND_PROOF_MEMORY_SCHEMA || value.complete !== true) return null;
  const loadedAtMs = typeof value.loadedAtMs === "number" && Number.isFinite(value.loadedAtMs)
    ? Math.max(0, Math.trunc(value.loadedAtMs))
    : null;
  const head = sportsArenaCardAppendProofHeadFromValue(value.head);
  if (!head) return null;
  return {
    schema: SPORTS_VAULT_APPEND_PROOF_MEMORY_SCHEMA,
    complete: true,
    ...(loadedAtMs !== null ? { loadedAtMs } : {}),
    head,
  };
}

export function sportsVaultAssetHasCompleteAppendProofMemory(asset: SportsVaultCardAssetState | null | undefined): boolean {
  return Boolean(sportsVaultCompleteAppendProofMemory(asset?.appendProofMemory));
}

export function sportsVaultAppendProofHeads(
  assetsById: Record<string, SportsVaultCardAssetState>,
): SportsArenaCardAppendProofHead[] {
  return Object.values(assetsById)
    .map((asset) => sportsVaultCompleteAppendProofMemory(asset.appendProofMemory)?.head ?? null)
    .filter((head): head is SportsArenaCardAppendProofHead => Boolean(head));
}

export function sportsEventProofsCoverSettledAppendHead(
  proofs: readonly Pick<SportsArenaEventProof, "eventProofId" | "media" | "proof" | "sourceJson">[],
  head: Pick<SportsArenaCardAppendProofHead, "eventCount" | "latestEventKey">,
): boolean {
  const proofIds = new Set(proofs.map((proof) => proof.eventProofId).filter(Boolean));
  if (proofIds.size < head.eventCount) return false;
  if (head.eventCount === 0) return true;
  const latestEventKey = head.latestEventKey?.trim() ?? "";
  if (!latestEventKey) return false;
  return proofs.some((proof) => {
    const proofRecord = isRecord(proof.proof) ? proof.proof : null;
    const sourceProof = proofRecord && isRecord(proofRecord.sourceProof) ? proofRecord.sourceProof : null;
    const sourceRecord = isRecord(proof.sourceJson) ? proof.sourceJson : null;
    return proof.media?.eventKey === latestEventKey
      || sourceProof?.eventKey === latestEventKey
      || sourceRecord?.eventKey === latestEventKey;
  });
}

export function sameSportsLiveAppendHashes(left: SportsArenaLiveAppendRecord[], right: SportsArenaLiveAppendRecord[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((append, index) => append.appendHash === right[index]?.appendHash);
}

export function sportsAccountProofYieldCount(
  claims: SportsArenaCardClaim[],
  assetsById: Record<string, SportsVaultCardAssetState>,
  appendRows: Pick<SportsAppendHistoryRow, "id" | "txid">[],
): number {
  const proofs = new Set<string>();
  for (const claim of claims) proofs.add(`claim:${claim.collectibleId}:${claim.claimHash}`);
  for (const append of appendRows) proofs.add(`live:${append.id}:${append.txid}`);
  for (const [collectibleId, asset] of Object.entries(assetsById)) {
    if (asset.issueProof?.proofHash) proofs.add(`issue:${collectibleId}:${asset.issueProof.proofHash}`);
    for (const append of asset.ownershipHistory) proofs.add(`ownership:${collectibleId}:${append.hash}`);
    for (const append of asset.careerHistory) proofs.add(`career:${collectibleId}:${append.hash}`);
  }
  return proofs.size;
}

export function isSportsArenaCardClaim(value: unknown): value is SportsArenaCardClaim {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Partial<SportsArenaCardClaim>).schema === "receiz.sports_arena.card_claim.v1" &&
    typeof (value as Partial<SportsArenaCardClaim>).collectibleId === "string" &&
    typeof (value as Partial<SportsArenaCardClaim>).cardId === "string";
}

export function isSportsArenaCardIssue(value: unknown): value is SportsArenaCardIssue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const issue = value as Partial<SportsArenaCardIssue>;
  return issue.schema === "receiz.sports_arena.card_issue.v1" &&
    (issue.sport === "baseball" || issue.sport === "soccer") &&
    typeof issue.cardId === "string" &&
    typeof issue.rarity === "string" &&
    typeof issue.overallIssueNumber === "number" &&
    typeof issue.variantIssueNumber === "number";
}

export function sportsCardIssueProofFromValue(value: unknown, claim: SportsArenaCardClaim): SportsArenaCardIssueProof | null {
  if (!isRecord(value)) return null;
  const issue = isSportsArenaCardIssue(value.issue) ? value.issue : null;
  if (
    value.schema !== "receiz.sports_arena.card_issue_proof.v1" ||
    value.eventKind !== "issue" ||
    value.collectibleId !== claim.collectibleId ||
    value.claimHash !== claim.claimHash ||
    value.cardId !== claim.cardId ||
    value.rarity !== claim.rarity ||
    typeof value.proofHash !== "string" ||
    !issue ||
    issue.cardId !== claim.cardId ||
    issue.rarity !== claim.rarity
  ) {
    return null;
  }
  return value as unknown as SportsArenaCardIssueProof;
}

export function sportsCardIssueFromProof(value: unknown, claim: SportsArenaCardClaim): SportsArenaCardIssue | null {
  return sportsCardIssueProofFromValue(value, claim)?.issue ?? null;
}

export function sportsCardIssueProofFromTransferManifest(transferText: string | null, claim: SportsArenaCardClaim): SportsArenaCardIssueProof | null {
  if (!transferText) return null;
  const transferManifest = sportsVaultArchiveJsonParse(transferText);
  return isRecord(transferManifest) ? sportsCardIssueProofFromValue(transferManifest.issueProof, claim) : null;
}

export function sportsCardIssueFromTransferManifest(transferText: string | null, claim: SportsArenaCardClaim): SportsArenaCardIssue | null {
  return sportsCardIssueProofFromTransferManifest(transferText, claim)?.issue ?? null;
}

export function isSportsArenaPackReceipt(value: unknown): value is SportsArenaPackReceipt {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Partial<SportsArenaPackReceipt>).schema === "receiz.sports_arena.pack_receipt.v1" &&
    typeof (value as Partial<SportsArenaPackReceipt>).packId === "string" &&
    typeof (value as Partial<SportsArenaPackReceipt>).receiptId === "string" &&
    typeof (value as Partial<SportsArenaPackReceipt>).clientNonce === "string" &&
    typeof (value as Partial<SportsArenaPackReceipt>).packSeed === "string";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSportsCardTransferRecipientOption(value: unknown): value is SportsCardTransferRecipientOption {
  if (!isRecord(value)) return false;
  return value.kind === "user" &&
    typeof value.userId === "string" &&
    typeof value.username === "string" &&
    typeof value.displayName === "string" &&
    (typeof value.avatarUrl === "string" || value.avatarUrl === null);
}

export function sportsCardTransferRecipientHandle(recipient: SportsCardTransferRecipientOption): string {
  return recipient.username ? `@${recipient.username}` : recipient.displayName;
}

export function sportsCardTransferRecipientInitials(recipient: SportsCardTransferRecipientOption): string {
  const source = recipient.displayName || recipient.username || "R";
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
    : source.slice(0, 2);
  return initials.toUpperCase();
}

export function isSportsArenaEntryLeaderboardRow(value: unknown): value is SportsArenaEntryLeaderboardRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<SportsArenaEntryLeaderboardRow>;
  return typeof row.entryId === "string" &&
    typeof row.rank === "number" &&
    typeof row.name === "string" &&
    typeof row.points === "number" &&
    (row.state === "you" || row.state === "hot" || row.state === "sealed");
}

export function isSportsArenaEntry(value: unknown): value is SportsArenaEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Partial<SportsArenaEntry>;
  return entry.schema === "receiz.sports_arena.entry.v1" &&
    (entry.sport === "baseball" || entry.sport === "soccer" || entry.sport === "fight") &&
    (entry.source === "mlb-statsapi" || entry.source === "fifa-world-cup-26" || entry.source === "ufc-fighter-roster") &&
    typeof entry.id === "string" &&
    typeof entry.gamePk === "string" &&
    (entry.lineupScope === "game" || entry.lineupScope === "tournament") &&
    typeof entry.entryHash === "string" &&
    typeof entry.lineupHash === "string" &&
    typeof entry.score === "number" &&
    Array.isArray(entry.lineupCardIds) &&
    Array.isArray(entry.lineupCollectibleIds) &&
    Array.isArray(entry.lineupCards) &&
    isRecord(entry.proof) &&
    isRecord(entry.reward) &&
    Array.isArray(entry.leaderboard) &&
    entry.leaderboard.every(isSportsArenaEntryLeaderboardRow);
}

export function sportsArenaEntryRewardClientNonce(entry: SportsArenaEntry | null): string {
  const raw = entry?.reward?.clientNonce;
  return typeof raw === "string" ? raw.trim() : "";
}

export function sportsRewardNonceMatches(openingNonce: string | null | undefined, rewardNonce: string | null | undefined): boolean {
  const opening = openingNonce?.trim() ?? "";
  const reward = rewardNonce?.trim() ?? "";
  return Boolean(opening && reward && opening === reward);
}

export function sportsArenaEntryRewardOpened(entry: SportsArenaEntry | null, openedRewardNonces: Set<string>): boolean {
  if (entry?.reward?.opened === true) return true;
  if (typeof entry?.reward?.completedAtMs === "number" && Number.isFinite(entry.reward.completedAtMs)) return true;
  const clientNonce = sportsArenaEntryRewardClientNonce(entry);
  return Boolean(clientNonce && openedRewardNonces.has(clientNonce));
}

export function sportsArenaEntryNeedsResolution(entry: SportsArenaEntry | null, openedRewardNonces: Set<string>): entry is SportsArenaEntry {
  if (!entry || entry.lineupScope !== "game") return false;
  if (entry.status === "active") return true;
  if (entry.status !== "finalized" || !entry.reward?.eligible) return false;
  return !sportsArenaEntryRewardOpened(entry, openedRewardNonces);
}

export function sportsArenaEntryShouldAutoClaimReward(entry: SportsArenaEntry, openedRewardNonces: Set<string>, currentSourceDate: string): boolean {
  return entry.lineupScope === "game" &&
    entry.status === "finalized" &&
    entry.reward?.eligible === true &&
    entry.sourceDate.localeCompare(currentSourceDate) < 0 &&
    !sportsArenaEntryRewardOpened(entry, openedRewardNonces);
}

export function sportsArenaEntriesNeedingLiveFeedCarry(
  entries: SportsArenaEntry[],
  currentEntry: SportsArenaEntry | null,
  dismissedEntryIds: string[],
  openedRewardNonces: Set<string>,
  currentSourceDate: string,
): SportsArenaEntry[] {
  return sportsArenaEntriesNeedingResolution(entries, currentEntry, dismissedEntryIds, openedRewardNonces)
    .filter((entry) => entry.sourceDate !== currentSourceDate);
}

export function sportsNormalizedGamePk(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^(mlb|fifa)-/i, "");
}

function sportsGamePkMatches(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = sportsNormalizedGamePk(left);
  const normalizedRight = sportsNormalizedGamePk(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function sportsArenaEntryScoreboard(
  entry: SportsArenaEntry,
  scoreboards: SportsArenaScoreboard[],
  openedRewardNonces: Set<string>,
): SportsArenaScoreboard {
  const matching = scoreboards.find((scoreboard) => sportsGamePkMatches(sportsScoreboardGamePk(scoreboard), entry.gamePk)) ?? null;
  const label = entry.slateLabel.split(" · ")[0] ?? "";
  const [awayRaw, homeRaw] = label.split(/\s*[\/@]\s*/);
  const awayCode = (awayRaw || matching?.away.code || "MLB").trim().toUpperCase();
  const homeCode = (homeRaw || matching?.home.code || "GAME").trim().toUpperCase();
  const matchingIsLiveOrPregame = matching?.status === "live" || matching?.status === "pregame";
  const forceFinal = entry.status === "finalized" && !matchingIsLiveOrPregame;
  const rewardOpened = sportsArenaEntryRewardOpened(entry, openedRewardNonces);
  const rewardReady = forceFinal && Boolean(entry.reward?.eligible && !rewardOpened);
  return {
    id: matching?.id ?? `mlb-${entry.gamePk}`,
    status: forceFinal ? "final" : matching?.status ?? "live",
    gameDate: matching?.gameDate,
    startTimeLabel: matching?.startTimeLabel,
    countdownLabel: matching?.countdownLabel,
    delayed: matching?.delayed,
    statusDetail: matching?.statusDetail,
    venue: matching?.venue ?? entry.slateLabel,
    away: matching?.away ?? { code: awayCode, name: awayCode, score: 0 },
    home: matching?.home ?? { code: homeCode, name: homeCode, score: 0 },
    inning: forceFinal ? "Final" : matching?.inning ?? "Locked",
    count: forceFinal
      ? rewardReady ? "Reward ready" : rewardOpened ? "Reward opened" : "Proof sealed"
      : matching?.count ?? "Entry locked",
    baseState: forceFinal ? "empty" : matching?.baseState ?? "empty",
    livePulse: forceFinal
      ? rewardReady ? "Reward ready" : rewardOpened ? "Reward opened" : "Final proof"
      : matching?.livePulse ?? (entry.status === "active" ? "Entry locked" : "Live"),
    field: matching?.field,
    probablePitchers: matching?.probablePitchers,
  };
}

export function sportsScoreboardDetailedField(scoreboard: SportsArenaScoreboard | null | undefined): SportsArenaFieldState | null {
  const field = scoreboard?.field;
  if (!scoreboard || !field) return null;
  return sportsNormalizedGamePk(field.gamePk) === sportsScoreboardGamePk(scoreboard) ? field : null;
}

function soccerLiveFieldPlayers(field: SportsArenaFieldState): SportsArenaLivePlayer[] {
  return field.livePlayers.filter((player) => player.role === "player" || player.role === "goalkeeper");
}

function soccerFeaturedFieldPlayer(
  players: SportsArenaLivePlayer[],
  teamCode: string,
  excludedPersonId: string | null = null,
): SportsArenaLivePlayer | null {
  const teamPlayers = players.filter((player) => player.teamCode === teamCode && player.personId !== excludedPersonId);
  for (const position of ["FW", "MF", "DF", "GK"]) {
    const player = teamPlayers.find((candidate) => candidate.position === position);
    if (player) return player;
  }
  return teamPlayers[0] ?? null;
}

export function sportsFieldFeaturedPlayers(
  field: SportsArenaFieldState,
  scoreboard: SportsArenaScoreboard | null | undefined,
  soccer: boolean,
): { left: SportsArenaLivePlayer | null; right: SportsArenaLivePlayer | null } {
  if (!soccer) {
    return {
      left: field.livePlayers.find((player) => player.role === "batter") ?? null,
      right: field.livePlayers.find((player) => player.role === "pitcher") ?? null,
    };
  }
  const players = soccerLiveFieldPlayers(field);
  const awayCode = scoreboard?.away.code ?? "";
  const homeCode = scoreboard?.home.code ?? "";
  const left = soccerFeaturedFieldPlayer(players, awayCode) ??
    players[0] ??
    null;
  const right = soccerFeaturedFieldPlayer(players, homeCode, left?.personId ?? null) ??
    players.find((player) => player.personId !== left?.personId) ??
    null;
  return { left, right };
}

export function sportsFieldRailPlayers(field: SportsArenaFieldState, soccer: boolean): SportsArenaLivePlayer[] {
  if (soccer) {
    const players = soccerLiveFieldPlayers(field);
    const teamCodes = Array.from(new Set(players.map((player) => player.teamCode).filter(Boolean)));
    if (teamCodes.length < 2) return players.slice(0, 6);
    return [
      ...players.filter((player) => player.teamCode === teamCodes[0]).slice(0, 3),
      ...players.filter((player) => player.teamCode === teamCodes[1]).slice(0, 3),
    ].slice(0, 6);
  }
  return field.livePlayers.filter((player) => player.role === "onFirst" || player.role === "onSecond" || player.role === "onThird");
}

function preserveScoreboardDetailedField(
  incoming: SportsArenaScoreboard,
  current: SportsArenaScoreboard | null | undefined,
): SportsArenaScoreboard {
  if (sportsScoreboardDetailedField(incoming)) return incoming;
  const currentField = sportsScoreboardDetailedField(current);
  return currentField ? { ...incoming, field: currentField } : incoming;
}

export function sportsArenaEntryField(entry: SportsArenaEntry, scoreboard: SportsArenaScoreboard): SportsArenaFieldState {
  const detailedField = sportsScoreboardDetailedField(scoreboard);
  if (detailedField) return detailedField;
  const final = scoreboard.status === "final";
  const live = scoreboard.status === "live";
  const matchup = sportsMatchupLabel(scoreboard);
  const entryLocked = entry.status === "active";
  return {
    status: final ? "final" : live || entryLocked ? "live" : "pregame",
    gamePk: entry.gamePk,
    venue: scoreboard.venue,
    inning: scoreboard.inning,
    scoreLine: `${scoreboard.away.score}-${scoreboard.home.score}`,
    count: scoreboard.count,
    pitch: final ? "Final" : live ? "Live feed" : "Entry locked",
    pitchType: entry.slateLabel,
    baseState: scoreboard.livePulse,
    baseStateKey: scoreboard.baseState,
    lastPlay: final
      ? `${matchup} is final. ${scoreboard.livePulse}.`
      : `${matchup} entry is locked. ${scoreboard.livePulse}.`,
    livePlayers: [],
  };
}

export function sportsScoreboardField(scoreboard: SportsArenaScoreboard): SportsArenaFieldState {
  const detailedField = sportsScoreboardDetailedField(scoreboard);
  if (detailedField) return detailedField;
  const matchup = sportsMatchupLabel(scoreboard);
  const status = scoreboard.status ?? "pregame";
  const final = status === "final";
  const live = status === "live";
  const pregame = status === "pregame";
  const pregameSignal = scoreboard.countdownLabel ?? scoreboard.statusDetail ?? scoreboard.count ?? "First pitch pending";
  const pregameLine = `${matchup} at ${scoreboard.venue}. ${pregameSignal}. Cards staged for first pitch.`;
  return {
    status,
    gamePk: sportsScoreboardGamePk(scoreboard),
    venue: scoreboard.venue,
    inning: scoreboard.inning,
    scoreLine: `${scoreboard.away.score}-${scoreboard.home.score}`,
    count: final ? "Final" : pregame ? pregameSignal : scoreboard.count,
    pitch: final ? "Final" : live ? "Live feed" : scoreboard.delayed ? "Delayed start" : "Pregame",
    pitchType: pregame ? `${scoreboard.away.code} @ ${scoreboard.home.code}` : scoreboard.livePulse,
    baseState: pregame ? pregameSignal : scoreboard.livePulse,
    baseStateKey: scoreboard.baseState,
    lastPlay: final
      ? `${matchup} is final. ${scoreboard.livePulse}.`
      : live
        ? `${matchup}: ${scoreboard.livePulse}.`
        : pregameLine,
    livePlayers: [],
  };
}

export function mergeSportsScoreboardsWithEntry(
  scoreboards: SportsArenaScoreboard[],
  entry: SportsArenaEntry | null,
  openedRewardNonces: Set<string>,
): SportsArenaScoreboard[] {
  if (!entry || !sportsArenaEntryNeedsResolution(entry, openedRewardNonces)) return scoreboards;
  const carried = sportsArenaEntryScoreboard(entry, scoreboards, openedRewardNonces);
  const existingIndex = scoreboards.findIndex((scoreboard) => sportsGamePkMatches(sportsScoreboardGamePk(scoreboard), entry.gamePk));
  if (existingIndex >= 0) {
    return scoreboards.map((scoreboard, index) => index === existingIndex ? { ...carried, field: scoreboard.field } : scoreboard);
  }
  return [...scoreboards, carried];
}

export function mergeSportsScoreboardsWithEntries(
  scoreboards: SportsArenaScoreboard[],
  entries: SportsArenaEntry[],
  openedRewardNonces: Set<string>,
): SportsArenaScoreboard[] {
  let merged = scoreboards;
  for (const entry of entries) {
    merged = mergeSportsScoreboardsWithEntry(merged, entry, openedRewardNonces);
  }
  return merged;
}

export function mergeSportsLiveFeedWithPinnedGame(
  primaryFeed: SportsArenaLiveFeed,
  pinnedFeed: SportsArenaLiveFeed | null,
  pinnedGamePk: string | null | undefined,
): SportsArenaLiveFeed {
  const normalizedPinnedGamePk = sportsNormalizedGamePk(pinnedGamePk);
  if (!pinnedFeed || !normalizedPinnedGamePk) return primaryFeed;
  const pinnedScoreboard = pinnedFeed.scoreboards.find((scoreboard) => sportsScoreboardGamePk(scoreboard) === normalizedPinnedGamePk) ?? null;
  const pinnedField = pinnedFeed.field && sportsNormalizedGamePk(pinnedFeed.field.gamePk) === normalizedPinnedGamePk ? pinnedFeed.field : null;
  if (!pinnedScoreboard && !pinnedField) return primaryFeed;
  let mergedScoreboards = primaryFeed.scoreboards;
  if (pinnedScoreboard) {
    const scoreboardWithPinnedField = pinnedField ? { ...pinnedScoreboard, field: pinnedField } : pinnedScoreboard;
    const existingIndex = primaryFeed.scoreboards.findIndex((scoreboard) => sportsScoreboardGamePk(scoreboard) === normalizedPinnedGamePk);
    mergedScoreboards = existingIndex >= 0
      ? primaryFeed.scoreboards.map((scoreboard, index) => index === existingIndex ? scoreboardWithPinnedField : scoreboard)
      : [...primaryFeed.scoreboards, scoreboardWithPinnedField].sort(compareSportsScoreboardsForSlate);
  }
  const liveGameCount = mergedScoreboards.filter((scoreboard) => scoreboard.status === "live").length;
  const totalGames = Math.max(primaryFeed.totalGames, mergedScoreboards.length);
  return {
    ...primaryFeed,
    totalGames,
    inProgressGames: Math.max(primaryFeed.inProgressGames, liveGameCount),
    stateLine: liveGameCount > 0 ? `${liveGameCount} live MLB game${liveGameCount === 1 ? "" : "s"}` : primaryFeed.stateLine,
    scoreboards: mergedScoreboards,
    field: pinnedField ?? primaryFeed.field,
  };
}

export function preserveDetailedFieldsInLiveFeed(
  incomingFeed: SportsArenaLiveFeed,
  currentFeed: SportsArenaLiveFeed | null,
): SportsArenaLiveFeed {
  if (!currentFeed?.scoreboards.length) return incomingFeed;
  const currentByGamePk = new Map(currentFeed.scoreboards.map((scoreboard) => [sportsScoreboardGamePk(scoreboard), scoreboard]));
  const scoreboards = incomingFeed.scoreboards.map((scoreboard) =>
    preserveScoreboardDetailedField(scoreboard, currentByGamePk.get(sportsScoreboardGamePk(scoreboard))));
  const incomingDetailedField = incomingFeed.field && sportsNormalizedGamePk(incomingFeed.field.gamePk)
    ? incomingFeed.field
    : null;
  const currentDetailedField = currentFeed.field && sportsNormalizedGamePk(currentFeed.field.gamePk)
    ? currentFeed.field
    : null;
  const preservedField = incomingDetailedField ??
    (currentDetailedField
      ? scoreboards.find((scoreboard) => sportsScoreboardGamePk(scoreboard) === sportsNormalizedGamePk(currentDetailedField.gamePk))?.field ?? currentDetailedField
      : null);
  return { ...incomingFeed, scoreboards, field: preservedField };
}

export function preservePinnedGamesInLiveFeed(
  incomingFeed: SportsArenaLiveFeed,
  currentFeed: SportsArenaLiveFeed | null,
  pinnedEntries: SportsArenaEntry[],
): SportsArenaLiveFeed {
  const mergedIncomingFeed = preserveDetailedFieldsInLiveFeed(incomingFeed, currentFeed);
  if (!currentFeed || !pinnedEntries.length) return mergedIncomingFeed;
  let mergedFeed = mergedIncomingFeed;
  for (const entry of pinnedEntries) {
    const incomingHasPinnedGame = mergedFeed.scoreboards.some((scoreboard) => sportsGamePkMatches(sportsScoreboardGamePk(scoreboard), entry.gamePk)) ||
      Boolean(mergedFeed.field && sportsGamePkMatches(mergedFeed.field.gamePk, entry.gamePk));
    if (entry.sourceDate !== incomingFeed.sourceDate && !incomingHasPinnedGame) {
      mergedFeed = mergeSportsLiveFeedWithPinnedGame(mergedFeed, currentFeed, entry.gamePk);
    }
  }
  return mergedFeed;
}

export function uniqueSportsArenaEntries(entries: SportsArenaEntry[]): SportsArenaEntry[] {
  const unique = new Map<string, SportsArenaEntry>();
  for (const entry of entries) unique.set(entry.id, entry);
  return Array.from(unique.values()).sort((left, right) =>
    right.sourceDate.localeCompare(left.sourceDate) ||
    right.enteredAt.localeCompare(left.enteredAt) ||
    left.id.localeCompare(right.id));
}

function mergeSportsArenaEntry(current: SportsArenaEntry | null, incoming: SportsArenaEntry): SportsArenaEntry {
  if (!current) return incoming;
  const currentAppendCount = typeof current.proof.appendCount === "number" && Number.isFinite(current.proof.appendCount)
    ? current.proof.appendCount
    : 0;
  const incomingAppendCount = typeof incoming.proof.appendCount === "number" && Number.isFinite(incoming.proof.appendCount)
    ? incoming.proof.appendCount
    : 0;
  const incomingHasPartialProofWindow = currentAppendCount > incomingAppendCount;
  const currentScore = typeof current.score === "number" && Number.isFinite(current.score)
    ? current.score
    : null;
  const incomingScore = typeof incoming.score === "number" && Number.isFinite(incoming.score)
    ? incoming.score
    : null;
  const preserveCurrentScore = incomingHasPartialProofWindow &&
    currentScore !== null &&
    currentScore !== 0 &&
    (incomingScore === null || incomingScore <= 0 || incomingScore < currentScore);
  return {
    ...current,
    ...incoming,
    score: preserveCurrentScore ? current.score : incoming.score,
    proof: {
      ...current.proof,
      ...incoming.proof,
      appendCount: incomingHasPartialProofWindow ? current.proof.appendCount : incoming.proof.appendCount,
      lastAppendHash: incomingHasPartialProofWindow
        ? current.proof.lastAppendHash ?? incoming.proof.lastAppendHash
        : incoming.proof.lastAppendHash ?? current.proof.lastAppendHash,
      lastEvent: incomingHasPartialProofWindow
        ? current.proof.lastEvent ?? incoming.proof.lastEvent
        : incoming.proof.lastEvent ?? current.proof.lastEvent,
      cardScores: preserveCurrentScore
        ? current.proof.cardScores ?? incoming.proof.cardScores
        : incoming.proof.cardScores ?? current.proof.cardScores,
    },
    reward: {
      ...current.reward,
      ...incoming.reward,
    },
    leaderboard: incoming.leaderboard.length ? incoming.leaderboard : current?.leaderboard ?? [],
  };
}

export function mergeSportsArenaEntries(
  currentEntries: SportsArenaEntry[],
  incomingEntries: SportsArenaEntry[],
  currentEntry: SportsArenaEntry | null,
): SportsArenaEntry[] {
  const mergedById = new Map<string, SportsArenaEntry>();
  for (const entry of [
    ...currentEntries,
    ...(currentEntry ? [currentEntry] : []),
    ...incomingEntries,
  ]) {
    mergedById.set(entry.id, mergeSportsArenaEntry(mergedById.get(entry.id) ?? null, entry));
  }
  return uniqueSportsArenaEntries(Array.from(mergedById.values())).slice(0, 64);
}

export function projectSportsUserLiveBootstrap(args: {
  activeEntry: SportsArenaEntry | null;
  closedEntryIds: string[];
  currentEntries: SportsArenaEntry[];
  currentEntry: SportsArenaEntry | null;
  incomingEntries: SportsArenaEntry[];
  openedRewardNonces: Set<string>;
  selectedGameAutoSelected: boolean;
  selectedGamePk: string | null;
  selectedGamePkForEntry: string | null;
}) {
  const mergedEntries = mergeSportsArenaEntries(args.currentEntries, args.incomingEntries, args.currentEntry);
  const hydratedGameEntry = hydrationGameEntryForProjection(
    mergedEntries,
    args.activeEntry,
    args.selectedGamePkForEntry,
    args.closedEntryIds,
    args.openedRewardNonces,
  );
  const selectedEntry = args.selectedGamePkForEntry
    ? chooseSportsArenaEntry(mergedEntries, null, args.selectedGamePkForEntry, args.closedEntryIds, args.openedRewardNonces)
    : null;
  return {
    mergedEntries,
    hydratedGameEntry,
    selectedEntry,
    nextEntry: selectedEntry ?? hydratedGameEntry,
    shouldPromoteHydratedGameEntry: Boolean(
      hydratedGameEntry && !selectedEntry && (!args.selectedGamePk || args.selectedGameAutoSelected),
    ),
    tournamentSeed: sportsTournamentViewFromEntry(
      args.incomingEntries.find((entry) => entry.lineupScope === "tournament" && entry.status === "active") ?? null,
    ),
  };
}

export function sportsArenaEntriesNeedingResolution(
  entries: SportsArenaEntry[],
  currentEntry: SportsArenaEntry | null,
  dismissedEntryIds: string[],
  openedRewardNonces: Set<string>,
): SportsArenaEntry[] {
  const dismissed = new Set(dismissedEntryIds);
  return uniqueSportsArenaEntries([
    ...entries,
    ...(currentEntry ? [currentEntry] : []),
  ])
    .filter((entry) => entry.lineupScope === "game")
    .filter((entry) => !dismissed.has(entry.id))
    .filter((entry) => sportsArenaEntryNeedsResolution(entry, openedRewardNonces));
}

export function chooseSportsArenaEntry(
  incomingEntries: SportsArenaEntry[],
  currentEntry: SportsArenaEntry | null,
  selectedGamePk: string,
  dismissedEntryIds: string[],
  openedRewardNonces: Set<string>,
): SportsArenaEntry | null {
  const dismissed = new Set(dismissedEntryIds);
  const entries = uniqueSportsArenaEntries([
    ...(currentEntry ? [currentEntry] : []),
    ...incomingEntries,
  ])
    .filter((entry) => entry.lineupScope === "game")
    .filter((entry) => !dismissed.has(entry.id));
  const selectedEntries = entries.filter((entry) => sportsGamePkMatches(entry.gamePk, selectedGamePk));
  return selectedEntries.find((entry) => entry.status === "active") ??
    selectedEntries.find((entry) => sportsArenaEntryNeedsResolution(entry, openedRewardNonces)) ??
    null;
}

export function chooseSportsArenaEntryForProjection(
  incomingEntries: SportsArenaEntry[],
  currentEntry: SportsArenaEntry | null,
  selectedGamePk: string | null | undefined,
  dismissedEntryIds: string[],
  openedRewardNonces: Set<string>,
): SportsArenaEntry | null {
  const selectedEntry = selectedGamePk
    ? chooseSportsArenaEntry(incomingEntries, currentEntry, selectedGamePk, dismissedEntryIds, openedRewardNonces)
    : null;
  const entriesNeedingResolution = sportsArenaEntriesNeedingResolution(incomingEntries, currentEntry, dismissedEntryIds, openedRewardNonces);
  return selectedEntry ??
    entriesNeedingResolution.find((entry) => entry.status === "active") ??
    entriesNeedingResolution[0] ??
    null;
}

export function sportsCompletedCollectibleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map((entry) => typeof entry === "string" ? entry.trim() : "")
    .filter((entry) => /^rsc_[0-9a-f]{16}$/i.test(entry))));
}

export function sportsPackClientNonce(packId: string): string {
  return `sports:${packId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

export function triggerSportsPackOpenFeedback(): void {
  if (typeof window === "undefined") return;

  playHapticProfile("success", { force: true });

  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const durationSeconds = 0.34;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      const progress = index / frameCount;
      const tearEnvelope = Math.pow(1 - progress, 2.15);
      const crackle = Math.random() > 0.74 ? 1 : 0.38;
      const grain = (Math.random() * 2 - 1) * tearEnvelope * crackle;
      channel[index] = grain;
    }

    const source = context.createBufferSource();
    const highPass = context.createBiquadFilter();
    const bandPass = context.createBiquadFilter();
    const gain = context.createGain();
    const impact = context.createOscillator();
    const impactGain = context.createGain();

    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(680, context.currentTime);
    bandPass.type = "bandpass";
    bandPass.frequency.setValueAtTime(2600, context.currentTime);
    bandPass.Q.setValueAtTime(1.35, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds);

    source.buffer = buffer;
    source.connect(highPass);
    highPass.connect(bandPass);
    bandPass.connect(gain);
    gain.connect(context.destination);
    impact.type = "triangle";
    impact.frequency.setValueAtTime(92, context.currentTime);
    impact.frequency.exponentialRampToValueAtTime(52, context.currentTime + 0.12);
    impactGain.gain.setValueAtTime(0.0001, context.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.012);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
    impact.connect(impactGain);
    impactGain.connect(context.destination);
    source.start();
    impact.start();
    impact.stop(context.currentTime + 0.14);
    source.stop(context.currentTime + durationSeconds);
    source.addEventListener("ended", () => {
      void context.close().catch(() => undefined);
    }, { once: true });
  } catch {
    // Audio feedback is optional; pack opening must never depend on device media support.
  }
}

export function sportsMarketBidClientNonce(cardId: string): string {
  return `sports-bid:${cardId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`.slice(0, 160);
}

export function centsTextToUsdNumber(value: unknown): number | null {
  const raw = typeof value === "number" && Number.isFinite(value)
    ? String(Math.trunc(value))
    : typeof value === "string"
      ? value.trim()
      : "";
  if (!/^\d+$/.test(raw)) return null;
  const cents = Number(raw);
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents / 100;
}

export function sportsPackFundingAmountLabel(payload: SportsPackPurchaseResponse, amountUsd: number): string {
  const raw = payload.checkoutAmountUsd ?? payload.fundingDeltaUsd ?? "";
  if (typeof raw === "string" && /^\$?\d+(?:\.\d{2})?$/.test(raw.trim())) {
    return raw.trim().startsWith("$") ? raw.trim() : `$${raw.trim()}`;
  }
  return `$${amountUsd.toFixed(2)}`;
}

export function sportsTournamentFundingAmountLabel(payload: { checkoutAmountUsd?: unknown; fundingDeltaUsd?: unknown }, amountUsd: number): string {
  const raw = typeof payload.checkoutAmountUsd === "string"
    ? payload.checkoutAmountUsd
    : typeof payload.fundingDeltaUsd === "string"
      ? payload.fundingDeltaUsd
      : "";
  if (/^\$?\d+(?:\.\d{2})?$/.test(raw.trim())) return raw.trim().startsWith("$") ? raw.trim() : `$${raw.trim()}`;
  return `$${amountUsd.toFixed(2)}`;
}

export async function writeSportsClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function sportsTournamentClientNonce(tournamentKey: string): string {
  return `sports-tournament:${tournamentKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`.slice(0, 160);
}

function tournamentStorageKey(key: string, sport: SportsArenaSlug = "baseball"): string {
  if (sport === "baseball") return key;
  return key.replace(".baseball.", `.${sport}.`);
}

function sportsTournamentDefinitionForView(sport: SportsArenaSlug = "baseball") {
  return sportsArenaTournamentDefinitionForSport(sport) ?? SPORTS_ARENA_DAILY_TOURNAMENT;
}

export function localSportsTournamentView(sourceDate: string, entryCount = 0, sport: SportsArenaSlug = "baseball"): SportsArenaTournamentView {
  const definition = sportsTournamentDefinitionForView(sport);
  const economics = projectSportsArenaTournamentEconomics(entryCount, definition);
  const afterEntryEconomics = projectSportsArenaTournamentEconomics(entryCount + 1, definition);
  const estimatedEconomics = projectSportsArenaTournamentLaunchEstimate(afterEntryEconomics.entryCount, definition);
  const priceLabel = `$${(definition.entryPriceUsdCents / 100).toFixed(2)}`;
  const prize = `$${(Math.floor(definition.entryPriceUsdCents * definition.prizePoolBps / 10_000) / 100).toFixed(2)}`;
  const platform = `$${(Math.floor(definition.entryPriceUsdCents * definition.platformFeeBps / 10_000) / 100).toFixed(2)}`;
  const referral = `$${(Math.floor(definition.entryPriceUsdCents * definition.referralPoolBps / 10_000) / 100).toFixed(2)}`;
  const reserve = `$${((definition.entryPriceUsdCents -
    Math.floor(definition.entryPriceUsdCents * definition.prizePoolBps / 10_000) -
    Math.floor(definition.entryPriceUsdCents * definition.platformFeeBps / 10_000) -
    Math.floor(definition.entryPriceUsdCents * definition.referralPoolBps / 10_000)) / 100).toFixed(2)}`;
  return {
    schema: "receiz.sports_arena.tournament.v1",
    schemaInstalled: false,
    id: null,
    tournamentKey: sportsArenaTournamentKeyForSport(sport, sourceDate, definition.id),
    title: definition.title,
    status: "open",
    sourceDate,
    entryPriceUsdCents: String(definition.entryPriceUsdCents),
    entryPriceLabel: priceLabel,
    entryCount,
    minEntrantsToRun: economics.minEntrantsToRun,
    entriesNeededToRun: economics.entriesNeededToRun,
    runArmed: economics.runArmed,
    refundIfUnderfilled: economics.refundIfUnderfilled,
    joined: false,
    joinedEntryId: null,
    sportsEntryId: null,
    complianceStatus: "pending",
    cashSettlementEnabled: false,
    split: {
      prizePoolLabel: prize,
      platformFeeLabel: platform,
      referralPoolLabel: referral,
      reservePoolLabel: reserve,
    },
    economics: {
      ...economics,
      entryPriceLabel: priceLabel,
      grossLabel: `$${(economics.grossUsdCents / 100).toFixed(2)}`,
      prizePoolLabel: `$${(economics.prizePoolUsdCents / 100).toFixed(2)}`,
      minPaidPayoutLabel: `$${(economics.minPaidPayoutUsdCents / 100).toFixed(2)}`,
      firstPlaceEstimateLabel: `$${(economics.firstPlaceEstimateUsdCents / 100).toFixed(2)}`,
      payoutLadder: economics.payoutLadder.map((row) => ({ ...row, payoutLabel: `$${(row.payoutUsdCents / 100).toFixed(2)}` })),
    },
    afterEntryEconomics: {
      ...afterEntryEconomics,
      entryPriceLabel: priceLabel,
      grossLabel: `$${(afterEntryEconomics.grossUsdCents / 100).toFixed(2)}`,
      prizePoolLabel: `$${(afterEntryEconomics.prizePoolUsdCents / 100).toFixed(2)}`,
      minPaidPayoutLabel: `$${(afterEntryEconomics.minPaidPayoutUsdCents / 100).toFixed(2)}`,
      firstPlaceEstimateLabel: `$${(afterEntryEconomics.firstPlaceEstimateUsdCents / 100).toFixed(2)}`,
      payoutLadder: afterEntryEconomics.payoutLadder.map((row) => ({ ...row, payoutLabel: `$${(row.payoutUsdCents / 100).toFixed(2)}` })),
    },
    estimatedEconomics: {
      ...estimatedEconomics,
      entryPriceLabel: priceLabel,
      grossLabel: `$${(estimatedEconomics.grossUsdCents / 100).toFixed(2)}`,
      prizePoolLabel: `$${(estimatedEconomics.prizePoolUsdCents / 100).toFixed(2)}`,
      minPaidPayoutLabel: `$${(estimatedEconomics.minPaidPayoutUsdCents / 100).toFixed(2)}`,
      firstPlaceEstimateLabel: `$${(estimatedEconomics.firstPlaceEstimateUsdCents / 100).toFixed(2)}`,
      payoutLadder: estimatedEconomics.payoutLadder.map((row) => ({ ...row, payoutLabel: `$${(row.payoutUsdCents / 100).toFixed(2)}` })),
    },
    lastWinners: null,
    leaderboard: [],
    userEntry: null,
  };
}

export function sportsTournamentViewFromEntry(entry: SportsArenaEntry | null): SportsArenaTournamentView | null {
  if (!entry || entry.lineupScope !== "tournament" || entry.status !== "active") return null;
  const tournament = localSportsTournamentView(entry.sourceDate, 1, entry.sport);
  const score = Number.isFinite(entry.score) ? entry.score : 0;
  const rank = entry.rank ?? null;
  const payoutLabel = "$0.00";
  const tournamentKey = entry.arenaKey || sportsArenaTournamentKeyForSport(entry.sport, entry.sourceDate);
  return {
    ...tournament,
    schemaInstalled: true,
    tournamentKey,
    joined: true,
    joinedEntryId: entry.id,
    sportsEntryId: entry.id,
    leaderboard: [{
      tournamentEntryId: entry.id,
      sportsEntryId: entry.id,
      rank: rank ?? 1,
      score,
      state: "you",
      payoutLabel,
    }],
    userEntry: {
      id: entry.id,
      sportsEntryId: entry.id,
      status: entry.status,
      settlementStatus: "pending",
      score,
      rank,
      payoutLabel,
      joinedAt: entry.enteredAt,
      enteredAt: entry.enteredAt,
      finalizedAt: entry.finalizedAt,
      lineupCardIds: entry.lineupCardIds,
      lineupCollectibleIds: entry.lineupCollectibleIds,
      lineupSize: entry.lineupSize,
      entryHash: entry.entryHash,
      lineupHash: entry.lineupHash,
      appendCount: entry.proof.appendCount ?? 0,
      lastAppendHash: entry.proof.lastAppendHash ?? null,
      cardScores: sportsCardScoreProofs(entry.proof.cardScores),
      ledger: [{
        id: `${entry.id}:entry`,
        kind: "debit",
        label: "Entry",
        value: `-${tournament.entryPriceLabel}`,
        detail: "Ticket locked",
        state: "settled",
      }, {
        id: `${entry.id}:proof`,
        kind: "proof",
        label: "Proof",
        value: payoutLabel,
        detail: rank ? `Rank #${rank}` : "Rank pending",
        state: "pending",
      }],
    },
  };
}

export function isSportsArenaTournamentView(value: unknown): value is SportsArenaTournamentView {
  if (!isRecord(value)) return false;
  const tournament = value as Partial<SportsArenaTournamentView>;
  return tournament.schema === "receiz.sports_arena.tournament.v1" &&
    typeof tournament.tournamentKey === "string" &&
    typeof tournament.title === "string" &&
    typeof tournament.entryPriceLabel === "string" &&
    typeof tournament.entryCount === "number" &&
    typeof tournament.joined === "boolean" &&
    isRecord(tournament.economics) &&
    Array.isArray(tournament.leaderboard);
}

export function sportsArenaCardListingFromValue(value: unknown): SportsArenaCardListing | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const listing = value as Partial<SportsArenaCardListing>;
  if (listing.status !== "active") return null;
  if (typeof listing.priceUsdCents !== "string" || !/^\d+$/.test(listing.priceUsdCents.trim())) return null;
  if (typeof listing.listedAt !== "string" || !listing.listedAt.trim()) return null;
  return {
    status: "active",
    priceUsdCents: listing.priceUsdCents.trim(),
    listedAt: listing.listedAt,
    sellerUserId: typeof listing.sellerUserId === "string" ? listing.sellerUserId : null,
    sellerUsername: typeof listing.sellerUsername === "string" ? listing.sellerUsername : null,
    sellerDisplayName: typeof listing.sellerDisplayName === "string" ? listing.sellerDisplayName : null,
  };
}

const SPORTS_EVENT_RECORD_PATTERN =
  /\b(?:sets?|breaks?|ties?|passes|surpasses|matches|extends)\b[\s\S]{0,90}\b(?:record|mark|all-time|franchise|club|single-season|single-game)\b|\b(?:record|all-time|franchise|club|single-season|single-game)\b[\s\S]{0,90}\b(?:record|mark|leader|leaders|sets?|breaks?|ties?)\b|\b(?:no-hitter|perfect game|hit for the cycle|cycles?)\b/i;
const SPORTS_EVENT_CYCLE_PATTERN =
  /\b(?:hit for the cycle|hits for the cycle|completed the cycle|completes the cycle|cycle)\b/i;
const SPORTS_EVENT_MILESTONE_PATTERN =
  /\b(?:milestone|first career|career-high|career high|career-best|career best|walk-off)\b|\b\d{2,4}(?:st|nd|rd|th)\b[\s\S]{0,60}\b(?:hit|home run|homer|strikeout|save|win|rbi|run|stolen base|steal)\b/i;

type SportsEventCycleHitType = "single" | "double" | "triple" | "home_run";

function sportsEventCycleTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function sportsEventCycleRecord(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const child = value[key];
  return isRecord(child) ? child : {};
}

function sportsEventCycleArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) return [];
  const child = value[key];
  return Array.isArray(child) ? child : [];
}

function sportsEventCycleNormalizedName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sportsEventCycleHitTypeFromText(value: unknown): SportsEventCycleHitType | null {
  const clean = sportsEventCycleTextValue(value).replace(/[_-]+/g, " ").toLowerCase();
  if (!clean) return null;
  if (/\b(?:double play|triple play)\b/.test(clean)) return null;
  if (/\b(?:home run|homer|homers|homered)\b/.test(clean)) return "home_run";
  if (/\b(?:triple|triples|tripled|3b)\b/.test(clean)) return "triple";
  if (/\b(?:double|doubles|doubled|2b)\b/.test(clean)) return "double";
  if (/\b(?:single|singles|singled|1b)\b/.test(clean)) return "single";
  return null;
}

function sportsEventCycleHitLabel(value: SportsEventCycleHitType): string {
  if (value === "home_run") return "home run";
  return value;
}

function sportsEventCyclePlayHitType(play: unknown): SportsEventCycleHitType | null {
  const result = sportsEventCycleRecord(play, "result");
  return sportsEventCycleHitTypeFromText(result.eventType) ||
    sportsEventCycleHitTypeFromText(result.event) ||
    sportsEventCycleHitTypeFromText(result.description) ||
    sportsEventCycleHitTypeFromText(sportsEventCycleRecord(play, "details").eventType) ||
    sportsEventCycleHitTypeFromText(sportsEventCycleRecord(play, "details").description) ||
    sportsEventCycleHitTypeFromText(sportsEventCycleRecord(play, "event").type) ||
    sportsEventCycleHitTypeFromText(sportsEventCycleRecord(play, "event").label);
}

function sportsEventCyclePlayId(play: unknown): string {
  return sportsEventCycleTextValue(isRecord(play) ? play.playId : "") ||
    sportsEventCycleTextValue(sportsEventCycleRecord(play, "about").atBatIndex) ||
    sportsEventCycleTextValue(sportsEventCycleRecord(play, "result").playId);
}

function sportsEventCycleBatterId(play: unknown): string {
  const batter = sportsEventCycleRecord(sportsEventCycleRecord(play, "matchup"), "batter");
  return sportsEventCycleTextValue(batter.id) || sportsEventCycleTextValue(batter.personId);
}

function sportsEventCycleBatterName(play: unknown): string {
  const batter = sportsEventCycleRecord(sportsEventCycleRecord(play, "matchup"), "batter");
  return sportsEventCycleTextValue(batter.fullName) || sportsEventCycleTextValue(batter.name);
}

function sportsEventCyclePlayMatchesSubject(play: unknown, subjectId: string, subjectName: string): boolean {
  const batterId = sportsEventCycleBatterId(play);
  if (subjectId && batterId) return subjectId === batterId;
  const batterName = sportsEventCycleBatterName(play);
  return Boolean(subjectName && batterName && sportsEventCycleNormalizedName(subjectName) === sportsEventCycleNormalizedName(batterName));
}

function sportsEventCycleCandidatePlays(value: unknown): unknown[] {
  const roots = [
    value,
    sportsEventCycleRecord(value, "source"),
    sportsEventCycleRecord(value, "append"),
  ];
  const plays: unknown[] = [];
  for (const root of roots) {
    const playSnapshot = sportsEventCycleRecord(root, "playSnapshot");
    const liveData = sportsEventCycleRecord(root, "liveData");
    const gameSnapshot = sportsEventCycleRecord(root, "gameSnapshot");
    plays.push(
      ...sportsEventCycleArray(root, "allPlays"),
      ...sportsEventCycleArray(playSnapshot, "allPlays"),
      ...sportsEventCycleArray(sportsEventCycleRecord(playSnapshot, "play"), "allPlays"),
      ...sportsEventCycleArray(sportsEventCycleRecord(liveData, "plays"), "allPlays"),
      ...sportsEventCycleArray(sportsEventCycleRecord(sportsEventCycleRecord(gameSnapshot, "liveData"), "plays"), "allPlays"),
    );
  }
  return plays;
}

function sportsEventCycleCurrentPlayId(proof: Pick<SportsArenaEventProof, "proof" | "sourceJson"> & Partial<Pick<SportsArenaEventProof, "playId">>): string {
  const sourceRoot = sportsEventCycleRecord(proof.sourceJson, "source");
  const sourcePlaySnapshot = sportsEventCycleRecord(sourceRoot, "playSnapshot");
  const directPlaySnapshot = sportsEventCycleRecord(proof.sourceJson, "playSnapshot");
  return sportsEventCycleTextValue(proof.playId) ||
    sportsEventCycleTextValue(sportsEventCycleRecord(proof.proof, "sourceProof").playId) ||
    sportsEventCyclePlayId(sportsEventCycleRecord(sourcePlaySnapshot, "play")) ||
    sportsEventCyclePlayId(sportsEventCycleRecord(directPlaySnapshot, "play"));
}

function sportsEventCycleSubjectId(proof: Pick<SportsArenaEventProof, "proof" | "sourceJson"> & Partial<Pick<SportsArenaEventProof, "subjectPersonId">>): string {
  const proofSubject = sportsEventCycleRecord(proof.proof, "subject");
  const sourceRoot = sportsEventCycleRecord(proof.sourceJson, "source");
  const sourcePlay = sportsEventCycleRecord(sportsEventCycleRecord(sourceRoot, "playSnapshot"), "play");
  const directPlay = sportsEventCycleRecord(sportsEventCycleRecord(proof.sourceJson, "playSnapshot"), "play");
  return sportsEventCycleTextValue(proof.subjectPersonId) ||
    sportsEventCycleTextValue(proofSubject.personId) ||
    sportsEventCycleTextValue(proofSubject.id) ||
    sportsEventCycleBatterId(sourcePlay) ||
    sportsEventCycleBatterId(directPlay);
}

function sportsEventCycleCompletionDetail(
  proof: Pick<SportsArenaEventProof, "eventType" | "subjectName" | "proof" | "sourceJson"> &
    Partial<Pick<SportsArenaEventProof, "playId" | "subjectPersonId">>,
): string {
  const currentHit = sportsEventCycleHitTypeFromText(proof.eventType);
  if (!currentHit) return "";
  const currentPlayId = sportsEventCycleCurrentPlayId(proof);
  if (!currentPlayId) return "";
  const plays = sportsEventCycleCandidatePlays(proof.sourceJson);
  const currentIndex = plays.findIndex((play) => sportsEventCyclePlayId(play) === currentPlayId);
  if (currentIndex < 0) return "";
  const subjectId = sportsEventCycleSubjectId(proof);
  const subjectName = proof.subjectName.trim();
  const currentPlay = plays[currentIndex];
  if (!sportsEventCyclePlayMatchesSubject(currentPlay, subjectId, subjectName)) return "";
  const hits = new Set<SportsEventCycleHitType>();
  for (const play of plays.slice(0, currentIndex + 1)) {
    if (!sportsEventCyclePlayMatchesSubject(play, subjectId, subjectName)) continue;
    const hit = sportsEventCyclePlayHitType(play);
    if (hit) hits.add(hit);
  }
  hits.add(currentHit);
  return hits.has("single") && hits.has("double") && hits.has("triple") && hits.has("home_run")
    ? `${subjectName} completed the cycle with this ${sportsEventCycleHitLabel(currentHit)}.`
    : "";
}

function sportsEventMilestoneText(value: unknown, out: string[], depth = 0): void {
  if (out.length >= 80 || depth > 4 || value == null) return;
  if (typeof value === "string") {
    const clean = value.trim().replace(/\s+/g, " ");
    if (clean && clean.length <= 260 && !/^https?:\/\//i.test(clean) && !/^[0-9a-f]{24,}$/i.test(clean)) out.push(clean);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 24)) sportsEventMilestoneText(item, out, depth + 1);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (out.length >= 80) break;
    if (/hash|url|schema|playback|sourceUrl|thumbnail|poster/i.test(key)) continue;
    sportsEventMilestoneText(child, out, depth + 1);
  }
}

function sportsEventMilestoneSnippet(texts: string[], pattern: RegExp): string {
  const hit = texts.find((text) => pattern.test(text));
  if (!hit) return "";
  const sentences = hit.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.find((sentence) => pattern.test(sentence)) ?? hit;
}

function sportsEventMilestoneRecord(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const child = value[key];
  return isRecord(child) ? child : {};
}

function sportsEventNormalizeSubjectText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sportsEventSubjectTerms(subjectName: string): string[] {
  return sportsEventNormalizeSubjectText(subjectName)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 2);
}

function sportsEventTextMentionsSubject(text: string, subjectName: string): boolean {
  const terms = sportsEventSubjectTerms(subjectName);
  if (!terms.length) return false;
  const haystack = sportsEventNormalizeSubjectText(text);
  return terms.every((term) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(haystack));
}

function sportsRecordedVideoMentionsSubject(
  video: SportsArenaRecordedEventVideo,
  subjectName: string,
  subjectPersonId: string | null | undefined,
): boolean {
  const cleanPersonId = String(subjectPersonId ?? "").trim();
  const keywordSet = new Set(video.keywords.map(sportsEventNormalizeSubjectText));
  if (cleanPersonId && (keywordSet.has(cleanPersonId) || keywordSet.has(`playerid-${cleanPersonId}`))) return true;
  return sportsEventTextMentionsSubject(`${video.title} ${video.description ?? ""} ${video.keywords.join(" ")}`, subjectName);
}

function sportsEventMilestoneBoundValues(
  proof: Pick<SportsArenaEventProof, "proof" | "sourceJson" | "media">,
): unknown[] {
  const proofRoot = isRecord(proof.proof) ? proof.proof : {};
  const sourceRoot = isRecord(proof.sourceJson) ? proof.sourceJson : {};
  const source = sportsEventMilestoneRecord(sourceRoot, "source");
  const append = sportsEventMilestoneRecord(sourceRoot, "append");
  const appendProof = sportsEventMilestoneRecord(append, "proof");
  const eventMedia = sportsEventMilestoneRecord(sourceRoot, "eventMedia");
  const directPlaySnapshot = sportsEventMilestoneRecord(sourceRoot, "playSnapshot");
  const directPlay = sportsEventMilestoneRecord(directPlaySnapshot, "play");
  const sourcePlaySnapshot = sportsEventMilestoneRecord(source, "playSnapshot");
  const sourcePlay = sportsEventMilestoneRecord(sourcePlaySnapshot, "play");
  return [
    sportsEventMilestoneRecord(proofRoot, "event"),
    sportsEventMilestoneRecord(append, "event"),
    sportsEventMilestoneRecord(appendProof, "event"),
    {
      eventType: source.eventType,
      detail: source.detail,
    },
    {
      eventLabel: eventMedia.eventLabel,
      eventDetail: eventMedia.eventDetail,
      posterLabel: eventMedia.posterLabel,
      alt: eventMedia.alt,
      emotionalCue: eventMedia.emotionalCue,
    },
    sportsEventMilestoneRecord(directPlaySnapshot, "result"),
    sportsEventMilestoneRecord(directPlay, "result"),
    sportsEventMilestoneRecord(sourcePlaySnapshot, "result"),
    sportsEventMilestoneRecord(sourcePlay, "result"),
  ];
}

function sportsEventMilestoneRecordedVideoMatchesProof(
  proof: Pick<SportsArenaEventProof, "eventType" | "media" | "subjectName"> & Partial<Pick<SportsArenaEventProof, "playId" | "subjectPersonId">>,
): SportsArenaRecordedEventVideo | null {
  const video = proof.media?.recordedVideo ?? null;
  if (!video || sportsArenaRecordedVideoContradictsEventType(video, proof.eventType)) return null;
  if (!sportsRecordedVideoMentionsSubject(video, proof.subjectName, proof.subjectPersonId)) return null;
  const basis = video.exactMomentBasis;
  const playMatches = !proof.playId || !basis.playId || basis.playId === proof.playId;
  const subjectMatches = !proof.subjectPersonId || !basis.subjectPersonId || basis.subjectPersonId === proof.subjectPersonId;
  const eventMatches = !basis.eventType || basis.eventType === proof.eventType;
  return playMatches && subjectMatches && eventMatches ? video : null;
}

export function sportsArenaEventProofMilestoneFromProof(
  proof: Pick<SportsArenaEventProof, "eventType" | "role" | "subjectName" | "scoreDelta" | "proof" | "sourceJson" | "media"> &
    Partial<Pick<SportsArenaEventProof, "playId" | "subjectPersonId">>,
): SportsArenaEventProofMilestone | null {
  const recordedVideo = sportsEventMilestoneRecordedVideoMatchesProof(proof);
  const texts: string[] = [
    proof.subjectName,
    proof.eventType.replace(/_/g, " "),
    proof.media?.eventLabel ?? "",
    proof.media?.eventDetail ?? "",
    proof.media?.posterLabel ?? "",
    proof.media?.emotionalCue ?? "",
    proof.media?.alt ?? "",
    recordedVideo?.title ?? "",
    recordedVideo?.description ?? "",
    ...(recordedVideo?.keywords ?? []),
  ].filter(Boolean);
  for (const value of sportsEventMilestoneBoundValues(proof)) {
    sportsEventMilestoneText(value, texts);
  }

  const cycleDetail = sportsEventCycleCompletionDetail(proof) || sportsEventMilestoneSnippet(texts, SPORTS_EVENT_CYCLE_PATTERN);
  const recordDetail = cycleDetail || sportsEventMilestoneSnippet(texts, SPORTS_EVENT_RECORD_PATTERN);
  const milestoneDetail = recordDetail ? "" : sportsEventMilestoneSnippet(texts, SPORTS_EVENT_MILESTONE_PATTERN);
  const detail = recordDetail || milestoneDetail;
  if (!detail) return null;
  if (!sportsEventTextMentionsSubject(detail, proof.subjectName)) return null;
  const kind: SportsArenaEventProofMilestone["kind"] = recordDetail ? "record" : "milestone";
  const videoEvidence: SportsArenaEventProofMilestone["videoEvidence"] = proof.media?.recordedVideo
    ? "recorded"
    : "none";
  return {
    kind,
    label: cycleDetail ? "Cycle event" : kind === "record" ? "Record event" : "Milestone event",
    detail,
    source: "event-proof",
    videoEvidence,
  };
}

function sportsMomentCleanString(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sportsMomentTitleCase(value: string): string {
  const spaced = value
    .replace(/\[(\d+)\]/g, " $1 ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced ? spaced.replace(/\b[a-z]/g, (char) => char.toUpperCase()) : "Moment Data";
}

function sportsMomentLabel(path: string): string {
  const cleanPath = path.replace(/\[(\d+)\]/g, ".$1");
  const key = cleanPath.split(".").filter(Boolean).at(-1) ?? path;
  const labels: Record<string, string> = {
    appendHash: "Append Hash",
    atBatIndex: "At Bat",
    balls: "Balls",
    cardId: "Card ID",
    claimHash: "Claim Hash",
    collectibleId: "Collectible ID",
    contentHash: "Video Hash",
    contentId: "Video Content ID",
    count: "Count",
    createdAt: "Created At",
    createdAtMs: "Created At",
    defensiveCredits: "Defensive Credits",
    description: "Detail",
    detail: "Detail",
    distanceFt: "Distance",
    duration: "Duration",
    durationMs: "Duration MS",
    eventDetail: "Detail",
    eventKey: "Event Key",
    eventLabel: "Event Label",
    eventStartTime: "Event Start",
    eventEndTime: "Event End",
    eventType: "Event Type",
    exitVelocityMph: "Exit Velocity",
    factors: "Scoring Factors",
    feedPath: "Feed Path",
    fetchedAt: "Fetched At",
    fullName: "Name",
    gamePk: "Game",
    halfInning: "Half Inning",
    awayScore: "Away Score",
    homeScore: "Home Score",
    hitCoordinateX: "Hit X",
    hitCoordinateY: "Hit Y",
    hitHardness: "Hit Hardness",
    hitLocation: "Hit Location",
    hitTrajectory: "Hit Trajectory",
    inning: "Inning",
    isOut: "Out",
    isScoringPlay: "Scoring Play",
    label: "Event Label",
    launchAngleDeg: "Launch Angle",
    mediaHash: "Media Hash",
    mediaId: "Media ID",
    mediaPlayId: "Media Play ID",
    mimeType: "Mime Type",
    observedAt: "Observed At",
    opponentCode: "Opponent",
    outs: "Outs",
    personId: "Person ID",
    phiDeltaMicro: "Phi Delta",
    pitchCall: "Pitch Call",
    pitchCoordinateX: "Pitch X",
    pitchCoordinateY: "Pitch Y",
    pitchSpeedMph: "Pitch Speed",
    pitchType: "Pitch Type",
    playId: "Play",
    playIndex: "Play Index",
    playbackEndOffsetMs: "Playback End Offset",
    playbackName: "Playback",
    playbackStartOffsetMs: "Playback Start Offset",
    playbackUrl: "Playback URL",
    position: "Position",
    posterLabel: "Poster Label",
    proofHash: "Proof Hash",
    proofId: "Proof ID",
    proofKind: "Proof Kind",
    rbi: "RBI",
    role: "Role",
    scoreDelta: "Score Move",
    scoreDifferential: "Score Differential",
    sourceDate: "Source Date",
    sourceSnapshotHash: "Source Snapshot Hash",
    sourceUrl: "Source URL",
    sport: "Sport",
    startTime: "Start Time",
    strikes: "Strikes",
    subjectName: "Subject",
    subjectPersonId: "Person ID",
    subjectRole: "Role",
    teamCode: "Team",
    thumbnailUrl: "Thumbnail URL",
    title: "Title",
    type: "Event Type",
    updatedAt: "Updated At",
    upulse: "Kai Upulse",
    url: "URL",
    version: "Version",
  };
  return labels[key] ?? sportsMomentTitleCase(key);
}

function sportsMomentScalarValue(path: string, value: unknown): string | null {
  if (typeof value === "string") {
    const clean = sportsMomentCleanString(value);
    return clean || null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const key = path.split(".").filter(Boolean).at(-1) ?? "";
    if (key === "scoreDelta" || key === "scoreDifferential") return formatScore(value);
    if (key === "pitchSpeedMph" || key === "exitVelocityMph") return `${value} mph`;
    if (key === "distanceFt") return `${value} ft`;
    if (key === "launchAngleDeg") return `${value} deg`;
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value) && value.every((entry) => ["string", "number", "boolean"].includes(typeof entry))) {
    return value.map((entry) => sportsMomentScalarValue(path, entry)).filter((entry): entry is string => Boolean(entry)).join(", ") || null;
  }
  return null;
}

function sportsMomentDedupeValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function sportsMomentAddRow(
  rows: SportsArenaEventProofMomentRow[],
  seenKeys: Set<string>,
  seenTextValues: Set<string>,
  args: { key: string; label?: string; value: unknown; source: SportsArenaEventProofMomentRow["source"] },
): void {
  const value = sportsMomentScalarValue(args.key, args.value);
  if (!value) return;
  const label = args.label ?? sportsMomentLabel(args.key);
  const rowKey = `${args.source}:${args.key}:${label}:${value}`;
  if (seenKeys.has(rowKey)) return;
  const textDedupe = sportsMomentDedupeValue(value);
  if (value.length > 2 && seenTextValues.has(textDedupe)) return;
  seenKeys.add(rowKey);
  if (value.length > 2) seenTextValues.add(textDedupe);
  rows.push({
    key: `${args.source}:${args.key}`,
    label,
    value,
    source: args.source,
  });
}

function sportsMomentCollectRows(
  value: unknown,
  rows: SportsArenaEventProofMomentRow[],
  seenKeys: Set<string>,
  seenTextValues: Set<string>,
  source: SportsArenaEventProofMomentRow["source"],
  path: string,
  depth = 0,
): void {
  if (value == null || depth > 9) return;
  const scalar = sportsMomentScalarValue(path, value);
  if (scalar !== null) {
    sportsMomentAddRow(rows, seenKeys, seenTextValues, { key: path, value: scalar, source });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => sportsMomentCollectRows(entry, rows, seenKeys, seenTextValues, source, `${path}[${index + 1}]`, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "schema") continue;
    sportsMomentCollectRows(child, rows, seenKeys, seenTextValues, source, path ? `${path}.${key}` : key, depth + 1);
  }
}

export function sportsArenaEventProofMomentRows(proof: SportsArenaEventProof): SportsArenaEventProofMomentRow[] {
  const rows: SportsArenaEventProofMomentRow[] = [];
  const seenKeys = new Set<string>();
  const seenTextValues = new Set<string>();
  const add = (key: string, label: string, value: unknown, source: SportsArenaEventProofMomentRow["source"]) => {
    sportsMomentAddRow(rows, seenKeys, seenTextValues, { key, label, value, source });
  };

  add("subjectName", "Subject", proof.subjectName, "event");
  add("scoreDelta", "Score Move", proof.scoreDelta, "event");
  add("eventType", "Event Type", proof.eventType.replace(/_/g, " "), "event");
  add("role", "Role", proof.role, "event");
  add("teamCode", "Team", proof.teamCode, "event");
  add("opponentCode", "Opponent", proof.opponentCode, "event");
  add("inning", "Inning", proof.inning, "event");
  add("gamePk", "Game", proof.gamePk, "event");
  add("playId", "Play", proof.playId, "event");
  add("subjectPersonId", "Person ID", proof.subjectPersonId, "event");
  add("createdAt", "Created At", proof.createdAt, "event");
  add("updatedAt", "Updated At", proof.updatedAt, "event");
  add("eventProofId", "Event Proof ID", proof.eventProofId, "proof");
  add("appendHash", "Append Hash", proof.appendHash, "proof");
  add("proofHash", "Proof Hash", proof.proofHash, "proof");
  add("sourceSnapshotHash", "Source Snapshot Hash", proof.sourceSnapshotHash, "source");
  add("sourceCollectibleId", "Source Collectible ID", proof.sourceCollectibleId, "proof");
  add("sourceClaimHash", "Source Claim Hash", proof.sourceClaimHash, "proof");
  add("sourceCardId", "Source Card ID", proof.sourceCardId, "proof");
  add("attachment.kind", "Attachment", proof.attachment.kind, "proof");
  add("attachment.collectibleId", "Attached Collectible ID", proof.attachment.collectibleId, "proof");
  add("attachment.claimHash", "Attached Claim Hash", proof.attachment.claimHash, "proof");
  add("attachment.cardId", "Attached Card ID", proof.attachment.cardId, "proof");
  add("attachment.attachedAt", "Attached At", proof.attachment.attachedAt, "proof");
  add("listing.priceUsdCents", "Listing Price Cents", proof.listing?.priceUsdCents, "proof");
  add("milestone.label", "Milestone", proof.milestone?.label, "proof");
  add("milestone.detail", "Milestone Detail", proof.milestone?.detail, "proof");

  sportsMomentCollectRows(proof.media, rows, seenKeys, seenTextValues, "media", "media");
  sportsMomentCollectRows(proof.proof, rows, seenKeys, seenTextValues, "proof", "proof");
  sportsMomentCollectRows(proof.sourceJson, rows, seenKeys, seenTextValues, "source", "source");

  return rows;
}

export function sportsArenaEventProofIdFromAppend(append: SportsArenaLiveAppendRecord): string | undefined {
  const basis = append.proof?.proofHash || append.appendHash;
  return /^[0-9a-f]{64}$/i.test(basis) ? `sep_${basis.slice(0, 24).toLowerCase()}` : undefined;
}

export function sportsArenaEventProofFromLiveAppend(append: SportsArenaLiveAppendRecord): SportsArenaEventProof | null {
  const eventProofId = sportsArenaEventProofIdFromAppend(append);
  const proofHash = append.proof?.proofHash ?? append.appendHash;
  const sourceSnapshotHash = append.proof?.sourceSnapshotHash ?? append.sourceProof.sourceSnapshotHash ?? "";
  if (!eventProofId || !/^[0-9a-f]{64}$/i.test(proofHash) || !/^[0-9a-f]{64}$/i.test(sourceSnapshotHash)) return null;
  const createdAt = Number.isFinite(append.createdAtMs)
    ? new Date(append.createdAtMs).toISOString()
    : append.sourceProof.observedAt;
  const proof: SportsArenaEventProof = {
    eventProofId,
    ownerUserId: append.ownerUserId,
    owned: true,
    sourceCollectibleId: append.collectibleId,
    sourceClaimHash: append.claimHash,
    sourceCardId: append.cardId,
    appendHash: append.appendHash,
    proofHash: proofHash.toLowerCase(),
    sourceSnapshotHash: sourceSnapshotHash.toLowerCase(),
    gamePk: append.sourceProof.gamePk,
    playId: append.sourceProof.playId,
    eventType: append.event.type,
    role: append.subject.role,
    subjectPersonId: append.subject.personId,
    subjectName: append.subject.name,
    teamCode: append.subject.teamCode,
    opponentCode: append.subject.opponentCode,
    inning: append.event.inning,
    scoreDelta: append.scoring.scoreDelta,
    proof: append.proof ?? null,
    sourceJson: null,
    media: append.visualMedia ?? append.proof?.visualMedia ?? null,
    milestone: null,
    attachment: {
      kind: "native",
      collectibleId: append.collectibleId,
      claimHash: append.claimHash,
      cardId: append.cardId,
      attachedAt: null,
    },
    listing: null,
    createdAt,
    updatedAt: createdAt,
  };
  return {
    ...proof,
    milestone: sportsArenaEventProofMilestoneFromProof(proof),
  };
}

export function sportsArenaEventProofFromValue(value: unknown): SportsArenaEventProof | null {
  if (!isRecord(value)) return null;
  const role = value.role;
  const attachment = isRecord(value.attachment) ? value.attachment : {};
  const attachmentKind = attachment.kind;
  const listing = sportsArenaCardListingFromValue(value.listing);
  if (
    typeof value.eventProofId !== "string" ||
    !/^sep_[0-9a-f]{24}$/i.test(value.eventProofId) ||
    typeof value.ownerUserId !== "string" ||
    typeof value.sourceCollectibleId !== "string" ||
    !/^rsc_[0-9a-f]{16}$/i.test(value.sourceCollectibleId) ||
    typeof value.sourceClaimHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.sourceClaimHash) ||
    typeof value.sourceCardId !== "string" ||
    typeof value.appendHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.appendHash) ||
    typeof value.proofHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.proofHash) ||
    typeof value.sourceSnapshotHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.sourceSnapshotHash) ||
    typeof value.gamePk !== "string" ||
    typeof value.playId !== "string" ||
    typeof value.eventType !== "string" ||
    (role !== "batter" && role !== "pitcher" && role !== "fielder" && role !== "player" && role !== "goalkeeper" && role !== "fighter") ||
    typeof value.subjectPersonId !== "string" ||
    typeof value.subjectName !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    (attachmentKind !== "native" && attachmentKind !== "attached" && attachmentKind !== "detached")
  ) {
    return null;
  }
  const proof: SportsArenaEventProof = {
    eventProofId: value.eventProofId,
    ownerUserId: value.ownerUserId,
    owned: value.owned === true,
    sourceCollectibleId: value.sourceCollectibleId,
    sourceClaimHash: value.sourceClaimHash,
    sourceCardId: value.sourceCardId,
    appendHash: value.appendHash,
    proofHash: value.proofHash,
    sourceSnapshotHash: value.sourceSnapshotHash,
    gamePk: value.gamePk,
    playId: value.playId,
    eventType: value.eventType,
    role,
    subjectPersonId: value.subjectPersonId,
    subjectName: value.subjectName,
    teamCode: typeof value.teamCode === "string" ? value.teamCode : null,
    opponentCode: typeof value.opponentCode === "string" ? value.opponentCode : null,
    inning: typeof value.inning === "string" ? value.inning : null,
    scoreDelta: typeof value.scoreDelta === "number" && Number.isFinite(value.scoreDelta) ? value.scoreDelta : 0,
    proof: value.proof,
    sourceJson: value.sourceJson,
    media: sportsArenaEventMediaClipFromValue(value.media),
    milestone: null,
    attachment: {
      kind: attachmentKind,
      collectibleId: typeof attachment.collectibleId === "string" ? attachment.collectibleId : null,
      claimHash: typeof attachment.claimHash === "string" ? attachment.claimHash : null,
      cardId: typeof attachment.cardId === "string" ? attachment.cardId : null,
      attachedAt: typeof attachment.attachedAt === "string" ? attachment.attachedAt : null,
    },
    listing,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  return {
    ...proof,
    milestone: sportsArenaEventProofMilestoneFromProof(proof),
  };
}

function sportsStableEventTextToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sportsGenericEventTypeTextToken(eventType: string): string {
  return sportsStableEventTextToken(eventType.replace(/_/g, " "));
}

function sportsArenaEventProofStableEventToken(proof: SportsArenaEventProof): string {
  const detailToken = sportsStableEventTextToken(sportsArenaEventProofDetailForMedia(proof));
  const genericToken = sportsGenericEventTypeTextToken(proof.eventType);
  const subjectToken = sportsStableEventTextToken(proof.subjectName);
  return detailToken && detailToken !== genericToken && subjectToken && detailToken.includes(subjectToken) ? `detail:${detailToken}` : "";
}

function sportsStableNumberToken(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.trunc(value)) : "";
}

function sportsArenaEventProofCountStateKey(proof: SportsArenaEventProof): string {
  const proofPayload = isRecord(proof.proof) ? proof.proof : {};
  const eventPayload = isRecord(proofPayload.event) ? proofPayload.event : {};
  return [
    sportsStableNumberToken(eventPayload.balls),
    sportsStableNumberToken(eventPayload.strikes),
    sportsStableNumberToken(eventPayload.outs),
  ].join("-");
}

export function sportsArenaEventProofStableKey(proof: SportsArenaEventProof): string {
  const stableEventToken = sportsArenaEventProofStableEventToken(proof);
  return [
    proof.ownerUserId,
    proof.sourceCollectibleId,
    proof.gamePk,
    stableEventToken || `play:${proof.playId}`,
    proof.eventType,
    proof.role,
    proof.subjectPersonId,
    proof.inning ?? "",
    sportsArenaEventProofCountStateKey(proof),
  ].join(":");
}

function sportsArenaEventProofKaiCoordinate(proof: SportsArenaEventProof): bigint | null {
  const payload = isRecord(proof.proof) ? proof.proof : {};
  const kai = isRecord(payload.kai) ? payload.kai : {};
  const upulse = kai.upulse;
  return kai.schema === "receiz.kai_upulse.v1"
    && kai.basis === "monotonic-kai-frequency-from-genesis"
    && typeof upulse === "string"
    && /^\d+$/u.test(upulse)
      ? BigInt(upulse)
      : null;
}

function sportsArenaEventProofPrecedes(left: SportsArenaEventProof, right: SportsArenaEventProof): boolean {
  const leftKai = sportsArenaEventProofKaiCoordinate(left);
  const rightKai = sportsArenaEventProofKaiCoordinate(right);
  if (leftKai !== null && rightKai !== null && leftKai !== rightKai) return leftKai < rightKai;
  if (leftKai !== null || rightKai !== null) return leftKai !== null;
  return left.appendHash.localeCompare(right.appendHash) < 0;
}

function compareSportsArenaEventProofsDescending(left: SportsArenaEventProof, right: SportsArenaEventProof): number {
  const leftKai = sportsArenaEventProofKaiCoordinate(left);
  const rightKai = sportsArenaEventProofKaiCoordinate(right);
  if (leftKai !== null && rightKai !== null && leftKai !== rightKai) return leftKai > rightKai ? -1 : 1;
  if (leftKai !== null || rightKai !== null) return leftKai !== null ? -1 : 1;
  return right.appendHash.localeCompare(left.appendHash);
}

export function uniqueSportsArenaEventProofs(proofs: SportsArenaEventProof[]): SportsArenaEventProof[] {
  const byStableEvent = new Map<string, SportsArenaEventProof>();
  for (const proof of proofs) {
    const key = sportsArenaEventProofStableKey(proof);
    const current = byStableEvent.get(key);
    if (!current || sportsArenaEventProofPrecedes(proof, current)) {
      byStableEvent.set(key, proof);
    }
  }
  return Array.from(byStableEvent.values()).sort(compareSportsArenaEventProofsDescending);
}

function sportsArenaEventProofCardScopedStableKey(proof: SportsArenaEventProof): string {
  const stableEventToken = sportsArenaEventProofStableEventToken(proof);
  if (proof.gamePk && stableEventToken) {
    return [
      `card-event`,
      proof.gamePk,
      proof.eventType,
      proof.role,
      proof.subjectPersonId,
      proof.inning ?? "",
      sportsArenaEventProofCountStateKey(proof),
      stableEventToken,
    ].join(":");
  }
  if (proof.gamePk && proof.playId) return [`card-event`, proof.gamePk, proof.playId].join(":");
  return [`card-event-fallback`, sportsArenaEventProofStableKey(proof)].join(":");
}

function sportsArenaEventProofCardMatchRank(proof: SportsArenaEventProof, cardId: string, claimHash: string): number {
  const sourceClaimMatches = claimHash ? proof.sourceClaimHash === claimHash : true;
  const attachmentClaimMatches = claimHash ? proof.attachment.claimHash === claimHash : true;
  if (proof.sourceCollectibleId === cardId && proof.sourceClaimHash === claimHash) return 4;
  if (proof.sourceCardId === cardId && sourceClaimMatches) return 4;
  if (proof.attachment.collectibleId === cardId && proof.attachment.claimHash === claimHash) return 3;
  if (proof.attachment.cardId === cardId && attachmentClaimMatches) return 3;
  if (proof.sourceCollectibleId === cardId || proof.sourceCardId === cardId) return 2;
  if (proof.attachment.collectibleId === cardId || proof.attachment.cardId === cardId) return 1;
  return 0;
}

function sportsArenaEventProofPreferredForCard(
  proof: SportsArenaEventProof,
  current: SportsArenaEventProof,
  cardId: string,
  claimHash: string,
): SportsArenaEventProof {
  const proofRank = sportsArenaEventProofCardMatchRank(proof, cardId, claimHash);
  const currentRank = sportsArenaEventProofCardMatchRank(current, cardId, claimHash);
  if (proofRank !== currentRank) return proofRank > currentRank ? proof : current;
  const proofKai = sportsArenaEventProofKaiCoordinate(proof);
  const currentKai = sportsArenaEventProofKaiCoordinate(current);
  if (proofKai !== null && currentKai !== null && proofKai !== currentKai) return proofKai < currentKai ? proof : current;
  if (proofKai !== null || currentKai !== null) return proofKai !== null ? proof : current;
  const proofScoreWeight = Math.abs(proof.scoreDelta);
  const currentScoreWeight = Math.abs(current.scoreDelta);
  if (proofScoreWeight !== currentScoreWeight) return proofScoreWeight > currentScoreWeight ? proof : current;
  return proof.appendHash.localeCompare(current.appendHash) > 0 ? proof : current;
}

export function uniqueSportsArenaEventProofsForCard(proofs: SportsArenaEventProof[], cardId: string, claimHash: string): SportsArenaEventProof[] {
  const byStableCardEvent = new Map<string, SportsArenaEventProof>();
  for (const proof of proofs) {
    if (sportsArenaEventProofCardMatchRank(proof, cardId, claimHash) <= 0) continue;
    const key = sportsArenaEventProofCardScopedStableKey(proof);
    const current = byStableCardEvent.get(key);
    byStableCardEvent.set(
      key,
      current ? sportsArenaEventProofPreferredForCard(proof, current, cardId, claimHash) : proof,
    );
  }
  return Array.from(byStableCardEvent.values()).sort(compareSportsArenaEventProofsDescending);
}

function sportsArenaEventProofText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function sportsArenaEventProofNestedText(value: unknown, keys: string[]): string {
  let current = value;
  for (const key of keys) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return sportsArenaEventProofText(current);
}

function sportsArenaEventProofDetailForMedia(proof: SportsArenaEventProof): string {
  return sportsArenaEventProofText(proof.media?.eventDetail) ||
    sportsArenaEventProofNestedText(proof.proof, ["event", "detail"]) ||
    sportsArenaEventProofNestedText(proof.sourceJson, ["playSnapshot", "play", "result", "description"]) ||
    sportsArenaEventProofNestedText(proof.sourceJson, ["playSnapshot", "result", "description"]) ||
    proof.eventType.replace(/_/g, " ");
}

function sportsArenaEventProofMomentBasis(proof: SportsArenaEventProof) {
  return {
    gamePk: proof.gamePk,
    playId: proof.playId,
    mediaPlayId: proof.media?.recordedVideo?.exactMomentBasis.mediaPlayId ?? proof.media?.playId ?? "",
    eventKey: proof.media?.eventKey ?? "",
    subjectPersonId: proof.subjectPersonId,
    eventType: proof.eventType,
    sourceSnapshotHash: proof.sourceSnapshotHash,
  };
}

function sportsArenaUniqueRecordedEventVideos(videos: SportsArenaRecordedEventVideo[]): SportsArenaRecordedEventVideo[] {
  const out: SportsArenaRecordedEventVideo[] = [];
  const seen = new Set<string>();
  for (const video of videos) {
    const key = video.contentHash || video.playbackUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(video);
  }
  return out;
}

function sportsArenaEventProofVideoPool(proofs: SportsArenaEventProof[]): SportsArenaRecordedEventVideo[] {
  return sportsArenaUniqueRecordedEventVideos(proofs.flatMap((proof) => [
    proof.media?.recordedVideo ?? null,
    ...(proof.media?.relatedVideos ?? []),
  ].filter((video): video is SportsArenaRecordedEventVideo => Boolean(video))));
}

function sportsArenaVideoMatchesEventProof(video: SportsArenaRecordedEventVideo, proof: SportsArenaEventProof): boolean {
  if (sportsArenaRecordedVideoContradictsEventType(video, proof.eventType)) return false;
  if (!sportsRecordedVideoMentionsSubject(video, proof.subjectName, proof.subjectPersonId)) return false;
  const basis = sportsArenaEventProofMomentBasis(proof);
  return sportsArenaRecordedEventVideoMatchesMoment(video, basis) ||
    sportsArenaRecordedEventVideoTextMatchesMoment(video, {
      gamePk: proof.gamePk,
      subjectPersonId: proof.subjectPersonId,
      subjectName: proof.subjectName,
      eventType: proof.eventType,
      eventDetail: sportsArenaEventProofDetailForMedia(proof),
    });
}

export function sportsArenaEventProofMediaProjection(proof: SportsArenaEventProof, eventProofs: SportsArenaEventProof[]): SportsArenaEventProofMediaProjection {
  const basis = sportsArenaEventProofMomentBasis(proof);
  const projectedMedia = proof.media ? sportsArenaEventMediaClipForMoment(proof.media, basis) : null;
  const pooledVideos = sportsArenaEventProofVideoPool(eventProofs);
  const projectedRecordedVideo = projectedMedia?.recordedVideo && sportsArenaVideoMatchesEventProof(projectedMedia.recordedVideo, proof)
    ? projectedMedia.recordedVideo
    : null;
  const projectedRelatedVideos = projectedMedia?.relatedVideos ?? proof.media?.relatedVideos ?? [];
  const recordedVideo = projectedRecordedVideo ??
    pooledVideos.find((video) => sportsArenaVideoMatchesEventProof(video, proof)) ??
    null;
  const relatedVideos = sportsArenaUniqueRecordedEventVideos([
    ...projectedRelatedVideos,
    ...(recordedVideo ? [recordedVideo] : []),
  ]);
  return {
    media: projectedMedia
      ? {
        ...projectedMedia,
        recordedVideo,
        relatedVideos,
      }
      : null,
    recordedVideo,
    relatedVideos,
  };
}

export function sportsArenaTradeItemFromValue(value: unknown): SportsArenaTradeItem | null {
  if (!isRecord(value)) return null;
  const rarity = value.rarity;
  if (
    typeof value.collectibleId !== "string" ||
    !/^rsc_[0-9a-f]{16}$/i.test(value.collectibleId) ||
    typeof value.claimHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.claimHash) ||
    typeof value.cardId !== "string" ||
    typeof value.ownerUserIdAtOffer !== "string" ||
    (rarity !== "Common" && rarity !== "Rare" && rarity !== "Gold" && rarity !== "Champion" && rarity !== "Mythic")
  ) {
    return null;
  }
  return {
    collectibleId: value.collectibleId,
    claimHash: value.claimHash,
    cardId: value.cardId,
    rarity,
    athlete: typeof value.athlete === "string" ? value.athlete : null,
    teamCode: typeof value.teamCode === "string" ? value.teamCode : null,
    position: typeof value.position === "string" ? value.position : null,
    ownerUserIdAtOffer: value.ownerUserIdAtOffer,
  };
}

export function sportsArenaTradeOfferFromValue(value: unknown): SportsArenaTradeOffer | null {
  if (!isRecord(value)) return null;
  const status = value.status;
  const viewerSide = value.viewerSide;
  if (
    typeof value.id !== "string" ||
    typeof value.tradeHash !== "string" ||
    typeof value.createdByUserId !== "string" ||
    typeof value.targetUserId !== "string" ||
    typeof value.expiresAt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    (status !== "open" && status !== "countered" && status !== "accepted" && status !== "declined" && status !== "cancelled" && status !== "expired") ||
    (viewerSide !== "sent" && viewerSide !== "incoming") ||
    !Array.isArray(value.offered) ||
    !Array.isArray(value.requested)
  ) {
    return null;
  }
  const offered = value.offered.map(sportsArenaTradeItemFromValue).filter((item): item is SportsArenaTradeItem => Boolean(item));
  const requested = value.requested.map(sportsArenaTradeItemFromValue).filter((item): item is SportsArenaTradeItem => Boolean(item));
  if (offered.length === 0 || requested.length === 0) return null;
  return {
    id: value.id,
    status,
    message: typeof value.message === "string" ? value.message : null,
    tradeHash: value.tradeHash,
    createdByUserId: value.createdByUserId,
    targetUserId: value.targetUserId,
    viewerSide,
    parentTradeId: typeof value.parentTradeId === "string" ? value.parentTradeId : null,
    expiresAt: value.expiresAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    offered,
    requested,
  };
}

export function sportsArenaTradeItemLabel(item: SportsArenaTradeItem): string {
  const player = item.athlete || item.collectibleId;
  const team = item.teamCode ? ` ${item.teamCode}` : "";
  const position = item.position ? ` ${item.position}` : "";
  const rarity = item.rarity !== "Common" ? `${item.rarity} ` : "";
  return `${rarity}${player}${team}${position}`.replace(/\s+/g, " ").trim();
}

export function sportsArenaTradeItemsSummary(items: SportsArenaTradeItem[]): string {
  if (items.length === 0) return "No cards";
  const [first, ...rest] = items;
  const firstLabel = first ? sportsArenaTradeItemLabel(first) : "Card";
  return rest.length > 0 ? `${firstLabel} +${rest.length}` : firstLabel;
}

export function sportsArenaCardOwnershipAppendFromValue(value: unknown): SportsArenaCardOwnershipAppend | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const append = value as Partial<SportsArenaCardOwnershipAppend>;
  if (
    append.schema !== "receiz.sports_arena.card_ownership_append.v1" ||
    typeof append.collectibleId !== "string" ||
    !/^rsc_[0-9a-f]{16}$/i.test(append.collectibleId) ||
    typeof append.claimHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(append.claimHash) ||
    typeof append.eventKind !== "string" ||
    !["issue", "transfer", "sale", "trade"].includes(append.eventKind) ||
    typeof append.at !== "string" ||
    typeof append.hash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(append.hash)
  ) {
    return null;
  }
  return {
    schema: "receiz.sports_arena.card_ownership_append.v1",
    eventKind: append.eventKind,
    collectibleId: append.collectibleId,
    claimHash: append.claimHash,
    fromUserId: typeof append.fromUserId === "string" ? append.fromUserId : null,
    toUserId: typeof append.toUserId === "string" ? append.toUserId : null,
    ownerUserId: typeof append.ownerUserId === "string" ? append.ownerUserId : null,
    ownerUsername: typeof append.ownerUsername === "string" ? append.ownerUsername : null,
    transferId: typeof append.transferId === "string" ? append.transferId : null,
    saleId: typeof append.saleId === "string" ? append.saleId : null,
    packPurchaseId: typeof append.packPurchaseId === "string" ? append.packPurchaseId : null,
    priceUsdCents: typeof append.priceUsdCents === "string" ? append.priceUsdCents : null,
    settlementPhiMicro: typeof append.settlementPhiMicro === "string" ? append.settlementPhiMicro : null,
    at: append.at,
    hash: append.hash,
  };
}

export function sportsArenaCardCareerAppendFromValue(value: unknown): SportsArenaCardCareerAppend | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const append = value as Partial<SportsArenaCardCareerAppend>;
  if (
    append.schema !== "receiz.sports_arena.card_career_append.v1" ||
    typeof append.collectibleId !== "string" ||
    !/^rsc_[0-9a-f]{16}$/i.test(append.collectibleId) ||
    typeof append.claimHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(append.claimHash) ||
    typeof append.cardId !== "string" ||
    typeof append.eventKind !== "string" ||
    !["arena_entry", "arena_rank", "arena_reward"].includes(append.eventKind) ||
    typeof append.arenaEntryId !== "string" ||
    typeof append.arenaKey !== "string" ||
    typeof append.entryHash !== "string" ||
    typeof append.lineupHash !== "string" ||
    typeof append.at !== "string" ||
    typeof append.hash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(append.hash)
  ) {
    return null;
  }
  const eventKind = append.eventKind as SportsArenaCardCareerAppend["eventKind"];
  const lineupScope = append.lineupScope === "tournament" ? "tournament" : "game";
  return {
    schema: "receiz.sports_arena.card_career_append.v1",
    eventKind,
    collectibleId: append.collectibleId,
    claimHash: append.claimHash,
    cardId: append.cardId,
    ownerUserId: typeof append.ownerUserId === "string" ? append.ownerUserId : null,
    sourceDate: typeof append.sourceDate === "string" ? append.sourceDate : "",
    arenaEntryId: append.arenaEntryId,
    arenaKey: append.arenaKey,
    gamePk: typeof append.gamePk === "string" ? append.gamePk : "",
    slateLabel: typeof append.slateLabel === "string" ? append.slateLabel : append.arenaKey,
    lineupScope,
    entryHash: append.entryHash,
    lineupHash: append.lineupHash,
    scoreTotal: typeof append.scoreTotal === "number" && Number.isFinite(append.scoreTotal) ? append.scoreTotal : null,
    rank: typeof append.rank === "number" && Number.isFinite(append.rank) ? Math.trunc(append.rank) : null,
    reward: append.reward ?? null,
    label: typeof append.label === "string" ? append.label : eventKind.replace(/_/g, " "),
    detail: typeof append.detail === "string" ? append.detail : append.arenaKey,
    value: typeof append.value === "string" ? append.value : append.rank ? `#${append.rank}` : "sealed",
    factors: Array.isArray(append.factors) ? append.factors.filter((factor): factor is string => typeof factor === "string").slice(0, 8) : [],
    at: append.at,
    hash: append.hash,
  };
}

export function isSportsArenaMarketDepth(value: unknown): value is SportsArenaMarketDepth {
  if (!isRecord(value)) return false;
  const depth = value as Partial<SportsArenaMarketDepth>;
  return depth.schema === "receiz.sports_arena.market_depth.v1" &&
    typeof depth.cardId === "string" &&
    typeof depth.listingCount === "number" &&
    Array.isArray(depth.rarityFloors) &&
    Array.isArray(depth.listings) &&
    Array.isArray(depth.lastSales);
}

export function isSportsArenaCompetition(value: unknown): value is SportsArenaCompetition {
  if (!isRecord(value)) return false;
  const competition = value as Partial<SportsArenaCompetition>;
  return typeof competition.id === "string" &&
    typeof competition.title === "string" &&
    (competition.kind === "pool" || competition.kind === "head_to_head") &&
    typeof competition.status === "string" &&
    typeof competition.inviteCode === "string" &&
    typeof competition.invitePath === "string" &&
    typeof competition.entryLimit === "number";
}

export function sportsArenaCardOwnershipHistoryFromAsset(value: unknown): SportsArenaCardOwnershipAppend[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const asset = value as { ownershipHistory?: unknown };
  if (!Array.isArray(asset.ownershipHistory)) return [];
  return asset.ownershipHistory.map(sportsArenaCardOwnershipAppendFromValue).filter((append): append is SportsArenaCardOwnershipAppend => Boolean(append));
}

export function sportsArenaCardCareerHistoryFromAsset(value: unknown): SportsArenaCardCareerAppend[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const asset = value as { careerHistory?: unknown };
  if (!Array.isArray(asset.careerHistory)) return [];
  return asset.careerHistory.map(sportsArenaCardCareerAppendFromValue).filter((append): append is SportsArenaCardCareerAppend => Boolean(append));
}

export function sportsCardPriceInputToCentsText(value: string): string | null {
  const raw = value.trim().replace(/^\$/, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, cents = ""] = raw.split(".");
  const amount = BigInt(whole || "0") * 100n + BigInt((cents + "00").slice(0, 2));
  if (amount < 100n || amount > 100_000_000n) return null;
  return amount.toString();
}

export function sportsCardListingPriceInput(listing: SportsArenaCardListing | null): string {
  if (!listing?.priceUsdCents || !/^\d+$/.test(listing.priceUsdCents)) return "";
  const cents = BigInt(listing.priceUsdCents);
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export function sportsCardPublicSharePath(claim: SportsArenaCardClaim): string {
  const query = new URLSearchParams({
    claimHash: claim.claimHash,
    proof: encodeSportsCardProofUrlClaim(claim),
  });
  return `/game/sports/card/${encodeURIComponent(claim.collectibleId)}?${query.toString()}`;
}

export function readStoredSportsPackFundingRequest(): SportsPackFundingRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPORTS_PACK_FUNDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SportsPackFundingRequest>;
    if (
      typeof parsed.packId === "string" &&
      typeof parsed.clientNonce === "string" &&
      typeof parsed.amountUsd === "number" &&
      Number.isFinite(parsed.amountUsd) &&
      parsed.amountUsd > 0 &&
      typeof parsed.amountLabel === "string"
    ) {
      return {
        packId: parsed.packId,
        clientNonce: parsed.clientNonce,
        amountUsd: parsed.amountUsd,
        amountLabel: parsed.amountLabel,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeStoredSportsPackFundingRequest(record: SportsPackFundingRequest | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!record) {
      window.localStorage.removeItem(SPORTS_PACK_FUNDING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SPORTS_PACK_FUNDING_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Checkout state remains in memory when storage is unavailable.
  }
}

export function readStoredSportsTournamentFundingRequest(sport: SportsArenaSlug = "baseball"): SportsTournamentFundingRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(tournamentStorageKey(SPORTS_TOURNAMENT_FUNDING_STORAGE_KEY, sport));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SportsTournamentFundingRequest>;
    if (
      typeof parsed.sportsEntryId === "string" &&
      typeof parsed.clientNonce === "string" &&
      typeof parsed.amountUsd === "number" &&
      Number.isFinite(parsed.amountUsd) &&
      parsed.amountUsd > 0 &&
      typeof parsed.amountLabel === "string"
    ) {
      return {
        sportsEntryId: parsed.sportsEntryId,
        clientNonce: parsed.clientNonce,
        amountUsd: parsed.amountUsd,
        amountLabel: parsed.amountLabel,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeStoredSportsTournamentFundingRequest(record: SportsTournamentFundingRequest | null, sport: SportsArenaSlug = "baseball"): void {
  if (typeof window === "undefined") return;
  try {
    const key = tournamentStorageKey(SPORTS_TOURNAMENT_FUNDING_STORAGE_KEY, sport);
    if (!record) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Checkout state remains in memory when storage is unavailable.
  }
}

export function readStoredSportsTournamentView(ownerUserId: string, currentSourceDate: string, sport: SportsArenaSlug = "baseball"): SportsArenaTournamentView | null {
  if (typeof window === "undefined" || !ownerUserId) return null;
  try {
    const key = tournamentStorageKey(SPORTS_TOURNAMENT_VIEW_STORAGE_KEY, sport);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      ownerUserId?: unknown;
      sourceDate?: unknown;
      tournamentKey?: unknown;
      view?: unknown;
      storedAtMs?: unknown;
    } | null;
    if (!parsed || parsed.ownerUserId !== ownerUserId || !isSportsArenaTournamentView(parsed.view)) return null;
    const view = parsed.view;
    if (!view.joined || !view.userEntry?.id) return null;
    if (sportsTournamentCollectedByUser(ownerUserId, view, sport)) return null;
    const oldestAcceptedDate = sportsDateOffset(currentSourceDate, -1);
    if (view.sourceDate < oldestAcceptedDate) {
      window.localStorage.removeItem(key);
      return null;
    }
    return view;
  } catch {
    return null;
  }
}

export function writeStoredSportsTournamentView(ownerUserId: string, view: SportsArenaTournamentView | null, sport: SportsArenaSlug = "baseball"): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  try {
    const key = tournamentStorageKey(SPORTS_TOURNAMENT_VIEW_STORAGE_KEY, sport);
    if (!view?.joined || !view.userEntry?.id || sportsTournamentCollectedByUser(ownerUserId, view, sport)) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({
      ownerUserId,
      sourceDate: view.sourceDate,
      tournamentKey: view.tournamentKey,
      view,
      storedAtMs: Date.now(),
    }));
  } catch {
    // The admitted entry proof remains authoritative; local storage protects its accepted projection while server sync appends.
  }
}

export function readCollectedSportsArenaEntryIds(ownerUserId: string): Set<string> {
  if (typeof window === "undefined" || !ownerUserId) return new Set();
  try {
    const raw = window.localStorage.getItem(SPORTS_ARENA_COLLECTED_ENTRY_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SportsArenaCollectedEntryStore | null;
    if (!parsed || parsed.ownerUserId !== ownerUserId || !Array.isArray(parsed.entryIds)) return new Set();
    const entryIds = parsed.entryIds
      .filter((entryId): entryId is string => typeof entryId === "string" && entryId.length > 0)
      .slice(-120);
    return new Set(entryIds);
  } catch {
    return new Set();
  }
}

export function writeCollectedSportsArenaEntryIds(ownerUserId: string, entryIds: Set<string>): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  try {
    const storedEntryIds = Array.from(entryIds).filter(Boolean).slice(-120);
    if (!storedEntryIds.length) {
      window.localStorage.removeItem(SPORTS_ARENA_COLLECTED_ENTRY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SPORTS_ARENA_COLLECTED_ENTRY_STORAGE_KEY, JSON.stringify({
      ownerUserId,
      entryIds: storedEntryIds,
      updatedAtMs: Date.now(),
    }));
  } catch {
    // Collected game entries are also recoverable from Vault reward claims after hydration.
  }
}

export function readCollectedSportsTournamentEntryIds(ownerUserId: string, sport: SportsArenaSlug = "baseball"): Set<string> {
  if (typeof window === "undefined" || !ownerUserId) return new Set();
  try {
    const raw = window.localStorage.getItem(tournamentStorageKey(SPORTS_TOURNAMENT_COLLECTED_STORAGE_KEY, sport));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SportsTournamentCollectedStore | null;
    if (!parsed || parsed.ownerUserId !== ownerUserId || !Array.isArray(parsed.entryIds)) return new Set();
    const entryIds = parsed.entryIds
      .filter((entryId): entryId is string => typeof entryId === "string" && entryId.length > 0)
      .slice(-50);
    return new Set(entryIds);
  } catch {
    return new Set();
  }
}

export function writeCollectedSportsTournamentEntryIds(ownerUserId: string, entryIds: Set<string>, sport: SportsArenaSlug = "baseball"): void {
  if (typeof window === "undefined" || !ownerUserId) return;
  try {
    const key = tournamentStorageKey(SPORTS_TOURNAMENT_COLLECTED_STORAGE_KEY, sport);
    const storedEntryIds = Array.from(entryIds).filter(Boolean).slice(-50);
    if (!storedEntryIds.length) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({
      ownerUserId,
      entryIds: storedEntryIds,
      updatedAtMs: Date.now(),
    }));
  } catch {
    // The result remains sealed by deterministic proof state; the local marker only prevents replaying collected UI state.
  }
}

export function markSportsTournamentCollected(ownerUserId: string, entryId: string, sport: SportsArenaSlug = "baseball"): void {
  if (!ownerUserId || !entryId) return;
  const entryIds = readCollectedSportsTournamentEntryIds(ownerUserId, sport);
  entryIds.add(entryId);
  writeCollectedSportsTournamentEntryIds(ownerUserId, entryIds, sport);
}

export function sportsTournamentCollectedByUser(ownerUserId: string, view: SportsArenaTournamentView | null, sport: SportsArenaSlug = "baseball"): boolean {
  const entryId = view?.userEntry?.id ?? view?.joinedEntryId ?? "";
  return Boolean(entryId && readCollectedSportsTournamentEntryIds(ownerUserId, sport).has(entryId));
}

export function sportsTournamentEntryResolved(view: SportsArenaTournamentView | null): boolean {
  const entry = view?.userEntry;
  if (!entry) return false;
  return entry.status === "cancelled" ||
    entry.settlementStatus === "void" ||
    entry.settlementStatus === "credited" ||
    (view.status === "settled" && entry.status === "finalized" && entry.settlementStatus === "projected");
}

export function projectCollectedSportsTournamentView(
  ownerUserId: string,
  view: SportsArenaTournamentView,
  currentSourceDate?: string,
  sport: SportsArenaSlug = "baseball",
): SportsArenaTournamentView {
  if (currentSourceDate && view.sourceDate < currentSourceDate && sportsTournamentEntryResolved(view)) return localSportsTournamentView(currentSourceDate, 0, sport);
  if (!sportsTournamentCollectedByUser(ownerUserId, view, sport)) return view;
  if (currentSourceDate && view.sourceDate < currentSourceDate) return localSportsTournamentView(currentSourceDate, 0, sport);
  return {
    ...view,
    joined: false,
    joinedEntryId: null,
    sportsEntryId: null,
    userEntry: null,
  };
}

export function scoreShouldPreserveCurrent(currentScore: number | null | undefined, incomingScore: number | null | undefined): boolean {
  return typeof currentScore === "number" && Number.isFinite(currentScore) && currentScore !== 0 &&
    (typeof incomingScore !== "number" || !Number.isFinite(incomingScore) || incomingScore === 0);
}

export function sportsProofBackedScoreTotal(args: {
  lineupContext: SportsLineupContext;
  gameEntryScore: number | null | undefined;
  gameEntryAppendCount: number | null | undefined;
  tournamentEntryScore: number | null | undefined;
  tournamentEntryAppendCount: number | null | undefined;
  appendTotal: number;
  appendCount: number;
}): number {
  const proofScore = args.lineupContext === "game" ? args.gameEntryScore : args.tournamentEntryScore;
  const proofAppendCount = args.lineupContext === "game" ? args.gameEntryAppendCount : args.tournamentEntryAppendCount;
  if (
    typeof proofScore === "number" &&
    Number.isFinite(proofScore) &&
    typeof proofAppendCount === "number" &&
    Number.isFinite(proofAppendCount) &&
    proofAppendCount >= args.appendCount &&
    (args.appendCount === 0 || Math.abs(proofScore - args.appendTotal) >= 0.01)
  ) {
    return proofScore;
  }
  if (Number.isFinite(args.appendTotal) && args.appendTotal !== 0) return args.appendTotal;
  return typeof proofScore === "number" && Number.isFinite(proofScore) ? proofScore : args.appendTotal;
}

export function sportsCardScoreProofs(value: unknown): SportsArenaEntryCardScoreProof[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((candidate): SportsArenaEntryCardScoreProof | null => {
      if (!isRecord(candidate)) return null;
      const cardId = typeof candidate.cardId === "string" ? candidate.cardId.trim() : "";
      if (!cardId) return null;
      const collectibleId = typeof candidate.collectibleId === "string" && candidate.collectibleId.trim()
        ? candidate.collectibleId.trim()
        : null;
      const score = typeof candidate.score === "number" && Number.isFinite(candidate.score)
        ? candidate.score
        : typeof candidate.score === "string" && /^-?\d+(?:\.\d+)?$/.test(candidate.score.trim())
          ? Number(candidate.score)
          : null;
      if (score === null || !Number.isFinite(score)) return null;
      const appendCount = typeof candidate.appendCount === "number" && Number.isFinite(candidate.appendCount)
        ? Math.max(0, Math.trunc(candidate.appendCount))
        : typeof candidate.appendCount === "string" && /^\d+$/.test(candidate.appendCount.trim())
          ? Math.max(0, Number.parseInt(candidate.appendCount, 10))
          : 0;
      const lastAppendHash = typeof candidate.lastAppendHash === "string" && candidate.lastAppendHash.trim()
        ? candidate.lastAppendHash.trim()
        : null;
      return {
        cardId,
        collectibleId,
        score: Number(score.toFixed(2)),
        appendCount,
        lastAppendHash,
      };
    })
    .filter((proof): proof is SportsArenaEntryCardScoreProof => Boolean(proof));
}

export function sportsCardScoreProofForLineup(
  proofs: readonly SportsArenaEntryCardScoreProof[],
  cardId: string,
  collectibleId?: string | null,
): SportsArenaEntryCardScoreProof | null {
  const byCollectible = collectibleId
    ? proofs.find((proof) => proof.collectibleId === collectibleId) ?? null
    : null;
  return byCollectible ?? proofs.find((proof) => proof.cardId === cardId) ?? null;
}

export function sportsProofBackedCardScore(args: {
  appendCount: number;
  appendScore: number;
  cardScoreProof?: SportsArenaEntryCardScoreProof | null;
}): number {
  const appendCount = Number.isFinite(args.appendCount) ? Math.max(0, Math.trunc(args.appendCount)) : 0;
  const appendScore = Number.isFinite(args.appendScore) ? Number(args.appendScore.toFixed(2)) : 0;
  const proof = args.cardScoreProof ?? null;
  if (!proof || !Number.isFinite(proof.score)) return appendScore;
  const proofScore = Number(proof.score.toFixed(2));
  const proofAppendCount = Number.isFinite(proof.appendCount) ? Math.max(0, Math.trunc(proof.appendCount)) : 0;
  if (proofAppendCount >= appendCount && (appendCount === 0 || Math.abs(proofScore - appendScore) >= 0.01)) return proofScore;
  return appendScore;
}

export function sportsTournamentNeedsResolution(view: SportsArenaTournamentView | null): boolean {
  if (!view?.joined || !view.userEntry?.id) return false;
  if (sportsTournamentEntryResolved(view)) return false;
  const status = view.userEntry.status;
  const settlementStatus = view.userEntry.settlementStatus;
  return status !== "finalized" || settlementStatus === "open" || settlementStatus === "projected" || settlementStatus === "compliance_pending";
}

export function sportsTournamentCanPreserveAcrossDate(
  current: SportsArenaTournamentView | null,
  incoming: SportsArenaTournamentView,
): boolean {
  if (!current?.joined || current.tournamentKey === incoming.tournamentKey) return false;
  if (!sportsTournamentNeedsResolution(current)) return false;
  return current.sourceDate >= sportsDateOffset(incoming.sourceDate, -1);
}

export function serverResolvedTournamentReplacedStoredView(
  stored: SportsArenaTournamentView | null,
  rawServerTournament: SportsArenaTournamentView,
  projectedTournament: SportsArenaTournamentView,
): boolean {
  return Boolean(
    stored &&
    rawServerTournament.sourceDate === stored.sourceDate &&
    projectedTournament.sourceDate !== stored.sourceDate &&
    sportsTournamentEntryResolved(rawServerTournament)
  );
}

export function mergeSportsTournamentLiveScores(
  current: SportsArenaTournamentView | null,
  incoming: SportsArenaTournamentView,
): SportsArenaTournamentView {
  if (!current || current.tournamentKey !== incoming.tournamentKey) return incoming;
  const currentRowsById = new Map(current.leaderboard.map((row) => [row.tournamentEntryId || row.sportsEntryId, row]));
  const leaderboard = incoming.leaderboard.map((row) => {
    const currentRow = currentRowsById.get(row.tournamentEntryId || row.sportsEntryId);
    return currentRow && scoreShouldPreserveCurrent(currentRow.score, row.score)
      ? { ...row, score: currentRow.score }
      : row;
  });
  const userEntry = incoming.userEntry && current.userEntry?.id === incoming.userEntry.id &&
    scoreShouldPreserveCurrent(current.userEntry.score, incoming.userEntry.score)
    ? { ...incoming.userEntry, score: current.userEntry.score }
    : incoming.userEntry;
  return { ...incoming, leaderboard, userEntry };
}

export function mergeSportsTournamentView(
  current: SportsArenaTournamentView | null,
  incoming: SportsArenaTournamentView,
): SportsArenaTournamentView {
  const mergedIncoming = mergeSportsTournamentLiveScores(current, incoming);
  if (sportsTournamentEntryResolved(mergedIncoming)) return mergedIncoming;
  if (sportsTournamentCanPreserveAcrossDate(current, incoming) && current) return current;
  if (!current?.joined || current.tournamentKey !== mergedIncoming.tournamentKey || mergedIncoming.joined) return mergedIncoming;
  return {
    ...mergedIncoming,
    joined: true,
    joinedEntryId: current.joinedEntryId,
    sportsEntryId: current.sportsEntryId,
    userEntry: current.userEntry && scoreShouldPreserveCurrent(current.userEntry.score, mergedIncoming.userEntry?.score)
      ? current.userEntry
      : mergedIncoming.userEntry ?? current.userEntry,
    leaderboard: mergedIncoming.leaderboard.length ? mergedIncoming.leaderboard : current.leaderboard,
  };
}

export function defaultSportsDailyHabitState(sourceDate: string): SportsDailyHabitState {
  return {
    sourceDate,
    streak: 0,
    lastEnteredDate: null,
    lastSharedDate: null,
    lastRewardDate: null,
    lastResetDate: null,
  };
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readStoredSportsDailyHabitState(sourceDate: string): SportsDailyHabitState {
  if (typeof window === "undefined") return defaultSportsDailyHabitState(sourceDate);
  try {
    const raw = window.localStorage.getItem(SPORTS_DAILY_HABIT_STORAGE_KEY);
    if (!raw) return defaultSportsDailyHabitState(sourceDate);
    const parsed = JSON.parse(raw) as Partial<SportsDailyHabitState> | null;
    if (!parsed || typeof parsed !== "object") return defaultSportsDailyHabitState(sourceDate);
    const streak = typeof parsed.streak === "number" && Number.isFinite(parsed.streak)
      ? Math.max(0, Math.trunc(parsed.streak))
      : 0;
    return {
      sourceDate,
      streak,
      lastEnteredDate: stringOrNull(parsed.lastEnteredDate),
      lastSharedDate: stringOrNull(parsed.lastSharedDate),
      lastRewardDate: stringOrNull(parsed.lastRewardDate),
      lastResetDate: stringOrNull(parsed.lastResetDate),
    };
  } catch {
    return defaultSportsDailyHabitState(sourceDate);
  }
}

export function writeStoredSportsDailyHabitState(state: SportsDailyHabitState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPORTS_DAILY_HABIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Daily rhythm stays in memory when storage is unavailable.
  }
}

export function nextSportsDailyHabitState(
  current: SportsDailyHabitState | null,
  sourceDate: string,
  patch: Partial<Omit<SportsDailyHabitState, "sourceDate" | "streak">>,
): SportsDailyHabitState {
  const base = current ? { ...current, sourceDate } : defaultSportsDailyHabitState(sourceDate);
  const next = { ...base };
  if (patch.lastEnteredDate === sourceDate && base.lastEnteredDate !== sourceDate) {
    next.streak = base.lastEnteredDate === sportsDateOffset(sourceDate, -1) ? Math.max(1, base.streak + 1) : 1;
  }
  if (patch.lastEnteredDate !== undefined) next.lastEnteredDate = patch.lastEnteredDate;
  if (patch.lastSharedDate !== undefined) next.lastSharedDate = patch.lastSharedDate;
  if (patch.lastRewardDate !== undefined) next.lastRewardDate = patch.lastRewardDate;
  if (patch.lastResetDate !== undefined) next.lastResetDate = patch.lastResetDate;
  return next;
}

export function sportsEntryClientNonce(gamePk: string): string {
  const key = `receiz:sports:baseball:entry:${gamePk}`;
  const next = `sports-entry:${gamePk}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9:_-]{8,160}$/.test(existing)) return existing;
    window.localStorage.setItem(key, next);
  } catch {
    return next;
  }
  return next;
}

export function formatArenaEntryTime(value: string | null | undefined): string {
  if (!value) return "Live";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "Live";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

export function sportsArenaEntryProofRows(entry: SportsArenaEntry | null, cardId?: string): SportsAppendHistoryRow[] {
  if (!entry) return [];
  const proofCardId = cardId ?? entry.lineupCardIds[0] ?? "arena";
  const rows: SportsAppendHistoryRow[] = [{
    id: `${entry.entryHash}:entry:${proofCardId}`,
    cardId: proofCardId,
    at: formatArenaEntryTime(entry.enteredAt),
    createdAtMs: Date.parse(entry.enteredAt),
    kind: "entry",
    label: "Arena entry locked",
    detail: `${entry.lineupSize} cards locked to ${entry.slateLabel}`,
    value: entry.status === "finalized" ? "sealed" : "live",
    scoreDelta: 0,
    txid: entry.entryHash.slice(0, 12).toUpperCase(),
    factors: [`Lineup hash ${entry.lineupHash.slice(0, 12).toUpperCase()}`],
  }];

  if (entry.rank) {
    rows.push({
      id: `${entry.entryHash}:rank:${proofCardId}`,
      cardId: proofCardId,
      at: formatArenaEntryTime(entry.finalizedAt ?? entry.enteredAt),
      createdAtMs: Date.parse(entry.finalizedAt ?? entry.enteredAt),
      kind: "rank",
      label: "Arena rank",
      detail: `Server recomputed ${entry.proof.appendCount ?? 0} eligible live appends.`,
      value: `#${entry.rank}`,
      scoreDelta: entry.score,
      txid: entry.entryHash.slice(0, 12).toUpperCase(),
      factors: [`Score ${formatScore(entry.score)}`, `Arena ${entry.arenaKey}`],
    });
  }

  if (entry.reward?.eligible) {
    rows.push({
      id: `${entry.reward.rewardHash ?? entry.entryHash}:reward:${proofCardId}`,
      cardId: proofCardId,
      at: formatArenaEntryTime(entry.finalizedAt ?? entry.enteredAt),
      createdAtMs: Date.parse(entry.finalizedAt ?? entry.enteredAt),
      kind: "reward",
      label: entry.reward.label ?? "Sealed reward",
      detail: entry.reward.detail ?? "Reward sealed from deterministic final rank.",
      value: entry.reward.packId ?? "reward",
      scoreDelta: 0,
      txid: (entry.reward.rewardHash ?? entry.entryHash).slice(0, 12).toUpperCase(),
      factors: ["Deterministic reward proof"],
    });
  }

  return rows;
}

export function sportsArenaCareerProofRow(append: SportsArenaCardCareerAppend): SportsAppendHistoryRow {
  const kind: SportsArenaAppend["kind"] = append.eventKind === "arena_reward"
    ? "reward"
    : append.eventKind === "arena_rank"
      ? "rank"
      : "entry";
  return {
    id: append.hash,
    cardId: append.cardId,
    collectibleId: append.collectibleId,
    at: formatArenaEntryTime(append.at),
    createdAtMs: Date.parse(append.at),
    kind,
    label: append.label,
    detail: append.detail,
    value: append.value,
    scoreDelta: 0,
    txid: append.hash.slice(0, 12).toUpperCase(),
    factors: append.factors,
    sourceDate: append.sourceDate,
    gamePk: append.gamePk,
  };
}

export function snapshotAppendRow(append: SportsArenaAppend): SportsAppendHistoryRow {
  return {
    ...append,
    factors: [],
  };
}

function sportsArenaEventRolePrefix(role: SportsArenaLiveAppendSubjectRole | string | null | undefined): string {
  if (role === "fielder") return "DEF";
  if (role === "pitcher") return "PIT";
  if (role === "runner") return "RUNNER";
  return "OFF";
}

function sportsArenaEventTextToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sportsArenaFielderEventLabel(eventLabel: string): string | null {
  const text = sportsArenaEventTextToken(eventLabel);
  if (!text) return null;
  if (text === "e" || /\b(?:fielding error|field error|throwing error|missed catch|catching error|error)\b/.test(text)) return "Fielding Error";
  if (text === "tp" || /\btriple play\b/.test(text)) return "Turned a Triple Play";
  if (text === "dp" || /\b(?:double play|grounded into double play|grounds into double play)\b/.test(text)) return "Turned a Double Play";
  if (text === "cs" || /\bcaught stealing\b/.test(text)) return "Caught Runner Stealing";
  if (/\bpickoff\b/.test(text)) return "Made a Pickoff";
  if (/\bforce out\b/.test(text)) return "Recorded a Force Out";
  if (/\bfielder s choice\b|\bfielders choice\b/.test(text)) return "Made a Fielder's Choice Play";
  if (/\bputout\b/.test(text)) return "Recorded a Putout";
  if (/\bassist\b/.test(text)) return "Recorded a Defensive Assist";
  if (/\b(?:catch|catches|caught)\b/.test(text)) return "Made the Catch";
  if (/\b(?:field out|fielded out|ground out|grounded out|groundout|line out|lined out|lineout|fly out|flied out|flyout|pop out|popped out|popup|tagged out|throws out|throw out|out recorded)\b/.test(text)) return "Recorded an Out";
  if (/\b(?:fielded|fields|throw|throws|tag|tags|deflect|deflection)\b/.test(text)) return "Made a Defensive Play";
  return null;
}

function sportsArenaRunnerEventLabel(eventLabel: string): string | null {
  const text = sportsArenaEventTextToken(eventLabel);
  if (!text) return null;
  if (text === "run" || text === "run scored" || /\bscored?\b/.test(text)) return "Scored";
  if (text === "adv" || /\b(?:runner advance|advanced?|advance)\b/.test(text)) return "Advanced";
  if (/\bstolen base\b|\bstole\b|\bsteals?\b|\bsb\b/.test(text)) return "Stole a Base";
  if (/\bcaught stealing\b|\bcs\b/.test(text)) return "Caught Stealing";
  if (/\bpickoff|picked off\b/.test(text)) return "Picked Off";
  if (/\brunner erased\b|\berased\b|\bout on the bases\b/.test(text)) return "Erased on Bases";
  return null;
}

export function sportsArenaEventSubjectLabel(role: SportsArenaLiveAppendSubjectRole | string | null | undefined, eventLabel: string): string {
  const cleanLabel = eventLabel.trim() || "Event";
  if (role === "runner") return sportsArenaRunnerEventLabel(cleanLabel) ?? cleanLabel;
  return role === "fielder" ? sportsArenaFielderEventLabel(cleanLabel) ?? cleanLabel : cleanLabel;
}

export function sportsArenaEventDisplayLabel(role: SportsArenaLiveAppendSubjectRole | string | null | undefined, eventLabel: string): string {
  return `${sportsArenaEventRolePrefix(role)} - ${sportsArenaEventSubjectLabel(role, eventLabel)}`;
}

function lowerFirst(value: string): string {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function sportsArenaFielderDetailSentence(subjectName: string, label: string): string {
  if (label === "Turned a Double Play") return `${subjectName} turned a double play.`;
  if (label === "Turned a Triple Play") return `${subjectName} turned a triple play.`;
  if (label === "Caught Runner Stealing") return `${subjectName} caught a runner stealing.`;
  if (label === "Made a Pickoff") return `${subjectName} made a pickoff.`;
  if (label === "Recorded a Force Out") return `${subjectName} recorded a force out.`;
  if (label === "Made a Fielder's Choice Play") return `${subjectName} made a fielder's choice play.`;
  if (label === "Recorded a Putout") return `${subjectName} recorded a putout.`;
  if (label === "Recorded a Defensive Assist") return `${subjectName} recorded a defensive assist.`;
  if (label === "Made the Catch") return `${subjectName} made the catch.`;
  if (label === "Recorded an Out") return `${subjectName} recorded an out.`;
  if (label === "Made a Defensive Play") return `${subjectName} made a defensive play.`;
  if (label === "Fielding Error") return `${subjectName} was charged with a fielding error.`;
  return `${subjectName} ${lowerFirst(label)}.`;
}

export function sportsArenaEventSubjectDetail(args: {
  role: SportsArenaLiveAppendSubjectRole | string | null | undefined;
  subjectName: string;
  eventLabel: string;
  eventType?: string | null;
  detail?: string | null;
}): string {
  const eventText = args.eventLabel.trim() || (args.eventType ?? "").replace(/_/g, " ").trim() || "Event";
  const subjectLabel = sportsArenaEventSubjectLabel(args.role, eventText);
  if (args.role === "fielder" && sportsArenaFielderEventLabel(eventText)) {
    return sportsArenaFielderDetailSentence(args.subjectName.trim() || "Defender", subjectLabel);
  }
  const cleanDetail = (args.detail ?? "").trim().replace(/\s+/g, " ");
  return cleanDetail || `${args.subjectName.trim() || "Subject"} ${sportsArenaEventDisplayLabel(args.role, eventText)}`;
}

export function liveAppendRow(append: SportsArenaLiveAppendRecord): SportsAppendHistoryRow {
  const at = Number.isFinite(append.createdAtMs)
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(append.createdAtMs))
    : append.sourceProof.sourceDate;
  const displayLabel = sportsArenaEventDisplayLabel(append.subject.role, append.event.label);
  return {
    id: append.appendHash,
    cardId: append.cardId,
    collectibleId: append.collectibleId,
    eventProofId: sportsArenaEventProofIdFromAppend(append),
    at,
    createdAtMs: append.createdAtMs,
    kaiUpulse: append.proof?.kai?.upulse,
    kind: "stat",
    label: append.subject.name,
    detail: append.event.detail,
    value: displayLabel,
    scoreDelta: append.scoring.scoreDelta,
    txid: append.appendHash.slice(0, 12).toUpperCase(),
    factors: append.scoring.factors,
    sourceDate: append.sourceProof.sourceDate,
    gamePk: append.sourceProof.gamePk,
    eventType: append.event.type,
    isScoringPlay: append.event.isScoringPlay,
    metrics: append.event.metrics,
    rbi: append.event.rbi,
  };
}

export function eventProofAppendRow(proof: SportsArenaEventProof): SportsAppendHistoryRow {
  const milestone = proof.milestone;
  const eventLabel = proof.eventType.replace(/_/g, " ");
  const displayLabel = sportsArenaEventDisplayLabel(proof.role, eventLabel);
  const observedAt = sportsEventProofObservedAt(proof.proof) ?? proof.createdAt;
  const sourceDate = sportsEventProofSourceDate(proof.proof) ?? observedAt.slice(0, 10);
  return {
    id: proof.appendHash,
    cardId: proof.sourceCardId,
    collectibleId: proof.attachment.collectibleId ?? proof.sourceCollectibleId,
    eventProofId: proof.eventProofId,
    at: formatArenaEntryTime(observedAt),
    createdAtMs: Date.parse(observedAt),
    kaiUpulse: sportsEventProofKaiUpulse(proof.proof),
    kind: "stat",
    label: milestone?.label ?? proof.subjectName,
    detail: milestone ? `${proof.subjectName} · ${milestone.detail}` : `${displayLabel}${proof.inning ? ` · Inn ${proof.inning}` : ""}`,
    value: milestone ? (milestone.kind === "record" ? "RECORD" : "MILESTONE") : displayLabel,
    scoreDelta: proof.scoreDelta,
    txid: proof.proofHash.slice(0, 12).toUpperCase(),
    factors: [
      milestone ? `${milestone.kind === "record" ? "Record" : "Milestone"} proof${milestone.videoEvidence === "none" ? "" : ` · ${milestone.videoEvidence} video`}` : null,
      proof.role,
      proof.teamCode && proof.opponentCode ? `${proof.teamCode} vs ${proof.opponentCode}` : proof.gamePk,
      proof.attachment.kind === "native" ? "Native card memory" : proof.attachment.kind === "attached" ? "Attached event proof" : "Market event proof",
    ].filter((factor): factor is string => Boolean(factor)),
    milestone,
    sourceDate,
    gamePk: proof.gamePk,
  };
}

function sportsEventProofKaiUpulse(proof: unknown): string | undefined {
  if (!isRecord(proof) || !isRecord(proof.kai)) return undefined;
  if (
    proof.kai.schema !== "receiz.kai_upulse.v1"
    || proof.kai.basis !== "monotonic-kai-frequency-from-genesis"
  ) return undefined;
  const upulse = proof.kai.upulse;
  return typeof upulse === "string" && /^\d+$/.test(upulse) ? upulse : undefined;
}

function sportsEventProofObservedAt(proof: unknown): string | undefined {
  if (!isRecord(proof) || !isRecord(proof.sourceProof)) return undefined;
  const observedAt = proof.sourceProof.observedAt;
  return typeof observedAt === "string" && Number.isFinite(Date.parse(observedAt)) ? observedAt : undefined;
}

function sportsEventProofSourceDate(proof: unknown): string | undefined {
  if (!isRecord(proof) || !isRecord(proof.sourceProof)) return undefined;
  const sourceDate = proof.sourceProof.sourceDate;
  return typeof sourceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ? sourceDate : undefined;
}

export function eventProofClipPercent(value: number | null, fallback: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return `${fallback}%`;
  return `${Math.max(8, Math.min(92, (value / 250) * 100))}%`;
}

type EventProofClipTelemetry = Partial<Pick<SportsArenaEventMediaClip["telemetry"], "pitchCoordinateX" | "pitchCoordinateY" | "hitCoordinateX" | "hitCoordinateY">>;

export function eventProofClipCoordinatePct(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(8, Math.min(92, (value / 250) * 100));
}

export function eventProofClipGeometry(media: { telemetry?: EventProofClipTelemetry | null } | null | undefined): {
  hitX: number;
  hitY: number;
  path: { x1: number; x2: number; y1: number; y2: number };
  pitchX: number;
  pitchY: number;
} {
  const telemetry = media?.telemetry ?? null;
  const pitchX = eventProofClipCoordinatePct(telemetry?.pitchCoordinateX, 50);
  const pitchY = eventProofClipCoordinatePct(telemetry?.pitchCoordinateY, 56);
  const hitX = eventProofClipCoordinatePct(telemetry?.hitCoordinateX, 68);
  const hitY = eventProofClipCoordinatePct(telemetry?.hitCoordinateY, 28);
  return {
    hitX,
    hitY,
    path: { x1: pitchX, y1: pitchY, x2: hitX, y2: hitY },
    pitchX,
    pitchY,
  };
}

export function eventProofClipStyle(media: SportsArenaEventMediaClip | null): CSSProperties {
  const geometry = eventProofClipGeometry(media);
  return {
    "--event-pitch-x": `${geometry.pitchX}%`,
    "--event-pitch-y": `${geometry.pitchY}%`,
    "--event-hit-x": `${geometry.hitX}%`,
    "--event-hit-y": `${geometry.hitY}%`,
  } as CSSProperties;
}

export function eventProofClipStat(value: number | null, suffix: string, empty: string): string {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : empty;
}

export function eventProofClipHash(value: string | null | undefined): string {
  return value && value.length >= 12 ? value.slice(0, 12).toUpperCase() : "UNSEALED";
}

export function mergeSportsAppendHistoryRows(rows: SportsAppendHistoryRow[]): SportsAppendHistoryRow[] {
  const byKey = new Map<string, SportsAppendHistoryRow>();
  for (const row of rows) {
    const key = row.eventProofId ?? row.id ?? row.txid;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return Array.from(byKey.values()).sort((left, right) => {
    if (left.kaiUpulse && right.kaiUpulse && left.kaiUpulse !== right.kaiUpulse) {
      return BigInt(left.kaiUpulse) > BigInt(right.kaiUpulse) ? -1 : 1;
    }
    if (left.kaiUpulse || right.kaiUpulse) return left.kaiUpulse ? -1 : 1;
    return right.txid.localeCompare(left.txid);
  });
}

export function sportsTournamentProofRows(args: {
  cashLineDistance: string;
  entry: NonNullable<SportsArenaTournamentView["userEntry"]> | null;
  entryFinalized: boolean;
  entryPriceLabel: string;
  prizePoolLabel: string;
  score: number;
  title: string;
  rank: number | null;
}): SportsAppendHistoryRow[] {
  const entry = args.entry;
  if (!entry) return [];
  return [{
    id: `tournament-ticket-${entry.id}`, cardId: "lineup", at: "Main Event",
    createdAtMs: Date.parse(entry.enteredAt ?? entry.joinedAt), kind: "entry", label: "Ticket",
    detail: `${args.entryPriceLabel} locked into ${args.title}.`, value: args.entryPriceLabel, scoreDelta: 0,
    txid: (entry.entryHash ?? entry.id).slice(0, 12).toUpperCase(),
    factors: [`Lineup ${(entry.lineupHash ?? entry.id).slice(0, 12).toUpperCase()}`, `Prize pool ${args.prizePoolLabel}`],
  }, {
    id: `tournament-rank-${entry.id}`, cardId: "lineup", at: args.entryFinalized ? "Final" : "Live",
    createdAtMs: Date.parse(entry.finalizedAt ?? entry.enteredAt ?? entry.joinedAt), kind: "rank",
    label: args.entryFinalized ? "Main Event Seal" : "Live Rank",
    detail: `${formatScore(args.score)} score · ${args.cashLineDistance}.`, value: args.rank ? `#${args.rank}` : "Live", scoreDelta: 0,
    txid: (entry.lastAppendHash ?? entry.lineupHash ?? entry.id).slice(0, 12).toUpperCase(),
    factors: [`Score ${formatScore(args.score)}`, args.cashLineDistance],
  }];
}

export function sportsAppendMatchesCard(
  append: SportsAppendHistoryRow,
  card: SportsArenaCard,
  collectibleIds: readonly (string | null | undefined)[] = [],
): boolean {
  const knownCollectibleIds = collectibleIds.filter((collectibleId): collectibleId is string => Boolean(collectibleId));
  if (knownCollectibleIds.length > 0) {
    if (append.collectibleId) return knownCollectibleIds.includes(append.collectibleId);
    return append.cardId === card.id;
  }
  return append.cardId === card.id && !append.collectibleId;
}

export function sportsLiveAppendMatchesCard(
  append: SportsArenaLiveAppendRecord,
  card: SportsArenaCard,
  collectibleIds: readonly (string | null | undefined)[] = [],
): boolean {
  const knownCollectibleIds = collectibleIds.filter((collectibleId): collectibleId is string => Boolean(collectibleId));
  if (knownCollectibleIds.length > 0) {
    if (append.collectibleId) return knownCollectibleIds.includes(append.collectibleId);
    return append.cardId === card.id || append.subject.personId === card.media.sourceId;
  }
  return append.cardId === card.id && !append.collectibleId;
}

function sportsLiveAppendStableEventToken(append: SportsArenaLiveAppendRecord): string {
  const detailToken = sportsStableEventTextToken(append.event.detail);
  const genericToken = sportsGenericEventTypeTextToken(append.event.type);
  const subjectToken = sportsStableEventTextToken(append.subject.name);
  return detailToken && detailToken !== genericToken && subjectToken && detailToken.includes(subjectToken) ? `detail:${detailToken}` : "";
}

export function sportsFieldPortraitUrl(imageUrl: string): string {
  if (!imageUrl || !imageUrl.startsWith("/api/game/sports/baseball/player-image/")) return imageUrl;
  return imageUrl.includes("?") ? `${imageUrl}&variant=field` : `${imageUrl}?variant=field`;
}

function sportsLiveAppendProjectionKeyForEventToken(append: SportsArenaLiveAppendRecord, eventToken: string): string {
  return [
    append.cardId,
    append.collectibleId,
    append.sourceProof.sourceDate,
    append.sourceProof.gamePk,
    eventToken,
    append.subject.role,
    append.subject.personId,
    append.event.inning,
    append.event.halfInning,
    sportsStableNumberToken(append.event.balls),
    sportsStableNumberToken(append.event.strikes),
    sportsStableNumberToken(append.event.outs),
    append.scoring.version,
  ].join(":");
}

export function sportsLiveAppendProjectionKey(append: SportsArenaLiveAppendRecord): string {
  return sportsLiveAppendProjectionKeyForEventToken(append, `play:${append.sourceProof.playId}`);
}

function sportsLiveAppendProjectionKeys(append: SportsArenaLiveAppendRecord): string[] {
  const keys = [sportsLiveAppendProjectionKey(append)];
  const stableEventToken = sportsLiveAppendStableEventToken(append);
  if (stableEventToken) keys.push(sportsLiveAppendProjectionKeyForEventToken(append, stableEventToken));
  return keys;
}

function sportsLiveAppendKaiCoordinate(append: SportsArenaLiveAppendRecord): bigint | null {
  const upulse = append.proof?.kai?.upulse;
  return typeof upulse === "string" && /^\d+$/u.test(upulse) ? BigInt(upulse) : null;
}

function compareSportsLiveAppendsDescending(left: SportsArenaLiveAppendRecord, right: SportsArenaLiveAppendRecord): number {
  const leftKai = sportsLiveAppendKaiCoordinate(left);
  const rightKai = sportsLiveAppendKaiCoordinate(right);
  if (leftKai !== null && rightKai !== null && leftKai !== rightKai) return leftKai > rightKai ? -1 : 1;
  if (leftKai !== null || rightKai !== null) return leftKai !== null ? -1 : 1;
  return right.appendHash.localeCompare(left.appendHash);
}

function preferredProjectedLiveAppend(
  current: SportsArenaLiveAppendRecord | undefined,
  next: SportsArenaLiveAppendRecord,
  preference: "first" | "latest",
): SportsArenaLiveAppendRecord {
  if (!current) return next;
  const nextKai = sportsLiveAppendKaiCoordinate(next);
  const currentKai = sportsLiveAppendKaiCoordinate(current);
  if (nextKai !== null && currentKai !== null && nextKai !== currentKai) {
    return preference === "latest"
      ? (nextKai > currentKai ? next : current)
      : (nextKai < currentKai ? next : current);
  }
  if (nextKai !== null || currentKai !== null) return nextKai !== null ? next : current;
  if (preference === "latest" ? next.appendHash > current.appendHash : next.appendHash < current.appendHash) return next;
  return current;
}

export function uniqueProjectedLiveAppends(appends: SportsArenaLiveAppendRecord[]): SportsArenaLiveAppendRecord[] {
  const byProjectionKey = new Map<string, SportsArenaLiveAppendRecord>();
  const aliases = new Map<string, string>();
  for (const append of appends) {
    const keys = sportsLiveAppendProjectionKeys(append);
    const matchedKeys = Array.from(new Set(keys.map((key) => aliases.get(key) ?? key).filter((key) => byProjectionKey.has(key))));
    const primaryKey = matchedKeys[0] ?? keys[0] ?? sportsLiveAppendProjectionKey(append);
    const providerKey = sportsLiveAppendProjectionKey(append);
    const preference = providerKey === primaryKey || matchedKeys.includes(providerKey) ? "latest" : "first";
    let preferred = preferredProjectedLiveAppend(byProjectionKey.get(primaryKey), append, preference);
    for (const matchedKey of matchedKeys.slice(1)) {
      preferred = preferredProjectedLiveAppend(preferred, byProjectionKey.get(matchedKey) ?? preferred, preference);
      byProjectionKey.delete(matchedKey);
      for (const [alias, target] of aliases) {
        if (target === matchedKey) aliases.set(alias, primaryKey);
      }
    }
    byProjectionKey.set(primaryKey, preferred);
    for (const key of keys) aliases.set(key, primaryKey);
  }
  return Array.from(byProjectionKey.values()).sort(compareSportsLiveAppendsDescending);
}

export type SportsCardProofMemoryProjection = {
  liveAppends: SportsArenaLiveAppendRecord[];
  liveAppendRows: SportsAppendHistoryRow[];
  appendRows: SportsAppendHistoryRow[];
  scopedAppendRows: SportsAppendHistoryRow[];
  liveAppendEventProofs: SportsArenaEventProof[];
  eventProofs: SportsArenaEventProof[];
  eventProofRows: SportsAppendHistoryRow[];
  scopedEventProofs: SportsArenaEventProof[];
  sealAppendRows: SportsAppendHistoryRow[];
  appends: SportsAppendHistoryRow[];
  historyCount: number;
  eventProofCount: number;
  appendProofHead: SportsArenaCardAppendProofHead | null;
};

export function projectSportsCardProofMemory(args: {
  accountEventProofs?: readonly SportsArenaEventProof[];
  accountLiveAppends?: readonly SportsArenaLiveAppendRecord[];
  assetLiveAppends?: readonly SportsArenaLiveAppendRecord[];
  appendProofHead?: SportsArenaCardAppendProofHead | null;
  card: SportsArenaCard | null | undefined;
  careerRows?: readonly SportsAppendHistoryRow[];
  claimCollectibleId?: string | null;
  claimHash?: string | null;
  scoringLineupContext: SportsLineupContext;
  selectedGamePk?: string | null;
  tournamentSourceDate?: string | null;
  transientEntryRows?: readonly SportsAppendHistoryRow[];
}): SportsCardProofMemoryProjection {
  const empty: SportsCardProofMemoryProjection = {
    liveAppends: [],
    liveAppendRows: [],
    appendRows: [],
    scopedAppendRows: [],
    liveAppendEventProofs: [],
    eventProofs: [],
    eventProofRows: [],
    scopedEventProofs: [],
    sealAppendRows: [],
    appends: [],
    historyCount: 0,
    eventProofCount: 0,
    appendProofHead: null,
  };
  if (!args.card) return empty;

  const card = args.card;
  const knownCollectibleIds = [args.claimCollectibleId];
  const liveAppends = uniqueProjectedLiveAppends([
    ...(args.accountLiveAppends ?? []),
    ...(args.assetLiveAppends ?? []),
  ]);
  const liveAppendRows = liveAppends.map(liveAppendRow);
  const appendRows = liveAppendRows.filter((append) => sportsAppendMatchesCard(append, card, knownCollectibleIds));
  const scopedAppendRows = appendRows.filter((append) => {
    if (append.kind !== "stat") return false;
    if (args.scoringLineupContext === "tournament") return append.sourceDate ? append.sourceDate === args.tournamentSourceDate : true;
    return Boolean(append.gamePk && sportsGamePkMatches(append.gamePk, args.selectedGamePk));
  });
  const liveAppendEventProofs = liveAppends
    .filter((append) => sportsLiveAppendMatchesCard(append, card, knownCollectibleIds))
    .map(sportsArenaEventProofFromLiveAppend)
    .filter((proof): proof is SportsArenaEventProof => Boolean(proof));
  const eventProofs = uniqueSportsArenaEventProofsForCard(
    [
      ...liveAppendEventProofs,
      ...(args.accountEventProofs ?? []),
    ],
    args.claimCollectibleId ?? card.id,
    args.claimHash ?? "",
  ).sort((left, right) => {
    if (left.owned !== right.owned) return left.owned ? -1 : 1;
    const scoreOrder = Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta);
    if (scoreOrder !== 0) return scoreOrder;
    const leftKai = sportsArenaEventProofKaiCoordinate(left);
    const rightKai = sportsArenaEventProofKaiCoordinate(right);
    if (leftKai !== null && rightKai !== null && leftKai !== rightKai) return leftKai > rightKai ? -1 : 1;
    if (leftKai !== null || rightKai !== null) return leftKai !== null ? -1 : 1;
    return right.appendHash.localeCompare(left.appendHash);
  });
  const eventProofRows = eventProofs.map(eventProofAppendRow);
  const scopedEventProofs = eventProofs.filter((proof) => {
    if (args.scoringLineupContext === "tournament") return (proof.media?.sourceDate ?? proof.createdAt.slice(0, 10)) === args.tournamentSourceDate;
    return Boolean(proof.gamePk && sportsGamePkMatches(proof.gamePk, args.selectedGamePk));
  });
  const careerRows = [...(args.careerRows ?? [])];
  const transientEntryRows = [...(args.transientEntryRows ?? [])];
  const sealAppendRows = mergeSportsAppendHistoryRows([
    ...scopedEventProofs.map(eventProofAppendRow),
    ...transientEntryRows,
    ...scopedAppendRows,
  ]);
  const appends = mergeSportsAppendHistoryRows([
    ...eventProofRows,
    ...careerRows,
    ...transientEntryRows,
    ...appendRows,
  ]);
  const admittedHead = sportsArenaCardAppendProofHeadFromValue(args.appendProofHead);
  const admittedHeadMatchesCard = Boolean(
    admittedHead &&
      admittedHead.cardId === card.id &&
      (!args.claimCollectibleId || admittedHead.collectibleId === args.claimCollectibleId) &&
      (!args.claimHash || admittedHead.claimHash === args.claimHash),
  );

  return {
    liveAppends,
    liveAppendRows,
    appendRows,
    scopedAppendRows,
    liveAppendEventProofs,
    eventProofs,
    eventProofRows,
    scopedEventProofs,
    sealAppendRows,
    appends,
    historyCount: admittedHeadMatchesCard
      ? Math.max(appends.length, admittedHead!.appendCount)
      : appends.length,
    eventProofCount: eventProofs.length,
    appendProofHead: admittedHeadMatchesCard ? admittedHead : null,
  };
}

function appendIsAfterProofHead(
  append: SportsArenaLiveAppendRecord,
  head: SportsArenaCardAppendProofHead,
): boolean {
  if (append.appendHash === head.latestAppendHash) return false;
  const appendUpulse = append.proof?.kai?.upulse;
  if (!appendUpulse || !/^\d+$/.test(appendUpulse) || !head.kaiLatestUpulse) return false;
  return BigInt(appendUpulse) > BigInt(head.kaiLatestUpulse);
}

export function projectCardsWithLiveAppends(
  cards: SportsArenaCard[],
  appends: SportsArenaLiveAppendRecord[],
  appendProofHeads: SportsArenaCardAppendProofHead[] = [],
): SportsArenaCard[] {
  const byCardId = new Map<string, SportsArenaLiveAppendRecord[]>();
  const headByCollectibleId = new Map(appendProofHeads.map((head) => [head.collectibleId, head]));
  const headsByCardId = new Map<string, SportsArenaCardAppendProofHead[]>();
  for (const head of appendProofHeads) {
    headsByCardId.set(head.cardId, [...(headsByCardId.get(head.cardId) ?? []), head]);
  }
  const projectedAppends = uniqueProjectedLiveAppends(appends).filter((append) => {
    const head = headByCollectibleId.get(append.collectibleId);
    return !head || appendIsAfterProofHead(append, head);
  });
  for (const append of projectedAppends) byCardId.set(append.cardId, [...(byCardId.get(append.cardId) ?? []), append]);
  return cards.map((card) => {
    const cardHeads = headsByCardId.get(card.id) ?? [];
    const matching = (byCardId.get(card.id) ?? []).sort(compareSportsLiveAppendsDescending);
    const headScore = cardHeads.reduce((sum, head) => sum + head.scoreDeltaTotal, 0);
    const headCount = cardHeads.reduce((sum, head) => sum + head.appendCount, 0);
    const currentScore = cardHeads.length || matching.length
      ? Number((headScore + matching.reduce((sum, append) => sum + append.scoring.scoreDelta, 0)).toFixed(1))
      : card.currentScore;
    const latest = matching[0] ?? null;
    return {
      ...card,
      baseCard: { ...card.baseCard },
      currentScore,
      liveLine: latest ? `${sportsArenaEventDisplayLabel(latest.subject.role, latest.event.label)} - ${latest.event.detail}` : card.liveLine,
      historyCount: cardHeads.length || matching.length ? headCount + matching.length : card.historyCount,
    };
  });
}

function appendRowIsAfterProofHead(
  append: SportsAppendHistoryRow,
  head: SportsArenaCardAppendProofHead,
): boolean {
  if (append.id === head.latestAppendHash) return false;
  if (!append.kaiUpulse || !/^\d+$/.test(append.kaiUpulse) || !head.kaiLatestUpulse) return false;
  return BigInt(append.kaiUpulse) > BigInt(head.kaiLatestUpulse);
}

export function projectCardsWithVerifiedAppendRows(
  cards: SportsArenaCard[],
  appendRows: SportsAppendHistoryRow[],
  appendProofHeads: SportsArenaCardAppendProofHead[] = [],
): SportsArenaCard[] {
  const headByCollectibleId = new Map(appendProofHeads.map((head) => [head.collectibleId, head]));
  const headsByCardId = new Map<string, SportsArenaCardAppendProofHead[]>();
  for (const head of appendProofHeads) {
    headsByCardId.set(head.cardId, [...(headsByCardId.get(head.cardId) ?? []), head]);
  }
  const byCardId = new Map<string, SportsAppendHistoryRow[]>();
  for (const append of mergeSportsAppendHistoryRows(appendRows)) {
    const head = append.collectibleId ? headByCollectibleId.get(append.collectibleId) : null;
    if (head && !appendRowIsAfterProofHead(append, head)) continue;
    byCardId.set(append.cardId, [...(byCardId.get(append.cardId) ?? []), append]);
  }

  return cards.map((card) => {
    const cardHeads = headsByCardId.get(card.id) ?? [];
    const matching = byCardId.get(card.id) ?? [];
    const headScore = cardHeads.reduce((sum, head) => sum + head.scoreDeltaTotal, 0);
    const headCount = cardHeads.reduce((sum, head) => sum + head.appendCount, 0);
    const currentScore = cardHeads.length || matching.length
      ? Number((headScore + matching.reduce((sum, append) => sum + append.scoreDelta, 0)).toFixed(1))
      : card.currentScore;
    const latest = matching[0] ?? null;
    return {
      ...card,
      baseCard: { ...card.baseCard },
      currentScore,
      liveLine: latest ? `${latest.value} - ${latest.detail}` : card.liveLine,
      historyCount: cardHeads.length || matching.length ? headCount + matching.length : card.historyCount,
    };
  });
}

export const SPORTS_CARD_TIER_PRIORITY: Record<SportsArenaCard["tier"], number> = {
  Common: 1,
  Rare: 2,
  Gold: 3,
  Champion: 4,
  Mythic: 5,
};

export function compareSportsCardClaimsByDisplayPriority(left: SportsArenaCardClaim, right: SportsArenaCardClaim): number {
  const rarityDelta = (SPORTS_CARD_TIER_PRIORITY[right.rarity] ?? 0) - (SPORTS_CARD_TIER_PRIORITY[left.rarity] ?? 0);
  if (rarityDelta !== 0) return rarityDelta;
  const issueDelta = sportsClaimIssueSortNumber(left) - sportsClaimIssueSortNumber(right);
  if (issueDelta !== 0) return issueDelta;
  const overallIssueDelta = sportsClaimOverallIssueSortNumber(left) - sportsClaimOverallIssueSortNumber(right);
  if (overallIssueDelta !== 0) return overallIssueDelta;
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) return ratingDelta;
  const issuedDelta = left.issuedAtMs - right.issuedAtMs;
  if (issuedDelta !== 0) return issuedDelta;
  return left.collectibleId.localeCompare(right.collectibleId);
}

export function sportsClaimIssueSortNumber(claim: SportsArenaCardClaim): number {
  if (!claim.issue) return Number.POSITIVE_INFINITY;
  const issueNumber = claim.rarity !== "Common" ? claim.issue.variantIssueNumber : claim.issue.overallIssueNumber;
  return Number.isFinite(issueNumber) ? Math.max(1, Math.trunc(issueNumber)) : Number.POSITIVE_INFINITY;
}

export function sportsClaimOverallIssueSortNumber(claim: SportsArenaCardClaim): number {
  const issueNumber = claim.issue?.overallIssueNumber;
  return typeof issueNumber === "number" && Number.isFinite(issueNumber) ? Math.max(1, Math.trunc(issueNumber)) : Number.POSITIVE_INFINITY;
}

export function cardVariantFromOwnedClaim(card: SportsArenaCard, claim: SportsArenaCardClaim): SportsArenaCard {
  const rating = sportsArenaOwnedCardCurrentRating(card, claim);
  return {
    ...card,
    id: claim.cardId,
    tier: claim.rarity,
    rating,
    projectedScore: sportsArenaOwnedCardCurrentProjectedScore(card, claim, rating),
    baseCard: { ...claim.baseCard },
    rookie: claim.rookie ?? card.rookie ?? null,
    playerBio: mergeSportsArenaPlayerBio(card.playerBio, claim.playerBio),
    tags: Array.from(new Set([
      claim.rarity,
      claim.variantName,
      claim.rookie?.isRookie ? "rookie" : "",
      claim.rookie?.rookieClass ?? "",
      ...card.tags,
    ].filter(Boolean))),
  };
}

export function bestSportsClaimsByPlayableCard(claims: SportsArenaCardClaim[]): Map<string, SportsArenaCardClaim> {
  const out = new Map<string, SportsArenaCardClaim>();
  for (const claim of [...claims].sort(compareSportsCardClaimsByDisplayPriority)) {
    const key = sportsClaimPlayerKey(claim);
    if (!out.has(key)) out.set(key, claim);
  }
  return out;
}

export function sportsClaimsForCard(claims: SportsArenaCardClaim[], card: SportsArenaCard): SportsArenaCardClaim[] {
  return claims
    .filter((claim) => sportsClaimMatchesCard(claim, card))
    .sort(compareSportsCardClaimsByDisplayPriority);
}

export function sportsCardValueProjectionRead(
  card: SportsArenaCard,
  claims: SportsArenaCardClaim[],
  displayCards: SportsArenaCard[],
): {
  ownedClaims: SportsArenaCardClaim[];
  primaryClaim: SportsArenaCardClaim | null;
  projection: SportsArenaCardValueProjection | null;
} {
  const ownedClaims = sportsClaimsForCard(claims, card);
  const primaryClaim = ownedClaims[0] ?? null;
  return {
    ownedClaims,
    primaryClaim,
    projection: sportsArenaCardValueProjection({
      claim: primaryClaim,
      currentScore: card.currentScore,
      displayCards,
      fallbackCard: card,
    }),
  };
}

export function sportsFallbackCardCareerValueRow(
  card: SportsArenaCard,
  index: number,
  claims: SportsArenaCardClaim[],
  displayCards: SportsArenaCard[],
) {
  const read = sportsCardValueProjectionRead(card, claims, displayCards);
  return {
    key: `${card.id}-${index}`,
    athlete: card.athlete,
    meta: `${card.teamCode} ${card.position}`,
    issue: read.primaryClaim ? sportsArenaClaimIssueLine(read.primaryClaim) : card.baseCard.issueLine,
    rarity: read.primaryClaim && read.primaryClaim.rarity !== "Common" ? read.primaryClaim.rarity : "Base",
    score: formatScore(card.currentScore),
    appends: 0,
    valueLabel: sportsUsdLabel(read.projection?.currentUsdValue ?? sportsCardDeterministicUsdValue(card, card.currentScore)),
    story: "Live card",
    state: "ready",
  };
}

export function resolveSportsLineupCard(
  cardId: string,
  ownedCards: SportsArenaCard[],
  displayCards: SportsArenaCard[],
  claims: SportsArenaCardClaim[],
): SportsArenaCard | null {
  const ownedCard = ownedCards.find((card) => card.id === cardId) ?? null;
  if (ownedCard) return ownedCard;
  const displayCard = displayCards.find((card) => card.id === cardId) ?? null;
  if (displayCard) return displayCard;
  const claim = claims.find((candidate) => candidate.cardId === cardId) ?? null;
  if (!claim) return null;
  const baseCard = displayCards.find((card) => sportsClaimMatchesCard(claim, card)) ?? sportsCardFromClaim(claim);
  return cardVariantFromOwnedClaim(baseCard, claim);
}

export function sportsArenaEntryLineupCardSnapshot(value: unknown): SportsArenaEntryLineupCardSnapshot | null {
  if (!isRecord(value)) return null;
  const cardId = typeof value.cardId === "string" ? value.cardId.trim() : "";
  const collectibleId = typeof value.collectibleId === "string" ? value.collectibleId.trim() : "";
  const claimHash = typeof value.claimHash === "string" ? value.claimHash.trim() : "";
  const athlete = typeof value.athlete === "string" ? value.athlete.trim() : "";
  const teamCode = typeof value.teamCode === "string" ? value.teamCode.trim() : "";
  const position = typeof value.position === "string" ? value.position.trim() : "";
  if (!cardId || !collectibleId || !claimHash || !athlete || !teamCode || !position) return null;
  const rarity = typeof value.rarity === "string" && SPORTS_CARD_TIER_PRIORITY[value.rarity as SportsArenaCard["tier"]]
    ? value.rarity as SportsArenaCard["tier"]
    : undefined;
  const variantName = typeof value.variantName === "string" && value.variantName.trim() ? value.variantName.trim() : undefined;
  return { collectibleId, claimHash, cardId, athlete, teamCode, position, rarity, variantName };
}

export function resolveSportsEntryLineupCard(
  cardId: string,
  entry: SportsArenaEntry,
  ownedCards: SportsArenaCard[],
  displayCards: SportsArenaCard[],
  claims: SportsArenaCardClaim[],
): SportsArenaCard | null {
  const resolved = resolveSportsLineupCard(cardId, ownedCards, displayCards, claims);
  if (resolved) return resolved;
  const lineupIndex = entry.lineupCardIds.findIndex((candidate) => candidate === cardId);
  const snapshot = sportsArenaEntryLineupCardSnapshot(lineupIndex >= 0 ? entry.lineupCards[lineupIndex] : null) ??
    entry.lineupCards.map(sportsArenaEntryLineupCardSnapshot).find((candidate) => candidate?.cardId === cardId) ??
    null;
  if (!snapshot) return null;
  const snapshotTeamCode = normalizeSportsTeamCode(snapshot.teamCode);
  const sourceCard = displayCards.find((card) => card.id === snapshot.cardId) ??
    displayCards.find((card) =>
      card.athlete === snapshot.athlete &&
      normalizeSportsTeamCode(card.teamCode) === snapshotTeamCode &&
      card.position === snapshot.position) ??
    ownedCards.find((card) =>
      card.athlete === snapshot.athlete &&
      normalizeSportsTeamCode(card.teamCode) === snapshotTeamCode &&
      card.position === snapshot.position) ??
    null;
  if (!sourceCard) return null;
  return {
    ...sourceCard,
    id: snapshot.cardId,
    tier: snapshot.rarity ?? sourceCard.tier,
    tags: Array.from(new Set([
      snapshot.rarity ?? "",
      snapshot.variantName ?? "",
      ...sourceCard.tags,
    ].filter(Boolean))),
  };
}

export function sportsArenaTradeClaimLabel(claim: SportsArenaCardClaim): string {
  const rarity = claim.rarity !== "Common" ? `${claim.rarity} · ` : "";
  return `${rarity}${claim.athlete} · ${claim.teamCode} ${claim.position}`;
}

export function compareSportsCardsForVault(
  left: SportsArenaCard,
  right: SportsArenaCard,
  sort: SportsCardVaultSort,
): number {
  if (sort === "team") {
    const teamDelta = left.teamCode.localeCompare(right.teamCode);
    if (teamDelta !== 0) return teamDelta;
    const ratingDelta = right.rating - left.rating;
    if (ratingDelta !== 0) return ratingDelta;
  }
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) return ratingDelta;
  const teamDelta = left.teamCode.localeCompare(right.teamCode);
  if (teamDelta !== 0) return teamDelta;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export function compareSportsCardsForPickFive(left: SportsArenaCard, right: SportsArenaCard): number {
  const projectedDelta = right.projectedScore - left.projectedScore;
  if (projectedDelta !== 0) return projectedDelta;
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) return ratingDelta;
  const liveDelta = right.currentScore - left.currentScore;
  if (liveDelta !== 0) return liveDelta;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export function normalizeSportsTeamCode(value: string): string {
  return sportsArenaNormalizedTeamCode(value);
}

export type SportsArenaConsoleRouteBundle = {
  apiSportPath: SportsArenaSlug;
  liveFeedRoute: string;
  tournamentRoute: string;
  tournamentResultRoute: string;
  vaultShowcaseRoute: string;
  vaultTransferRoute: string;
  vaultOfflineTransferRoute: string;
  cardTradesRoute: string;
};

export type SportsArenaSupportFlags = {
  isBaseballArena: boolean;
  isSoccerArena: boolean;
  isFightArena: boolean;
  supportsSportsMainEvent: boolean;
  supportsSportsAppendHydration: boolean;
  supportsSportsUserLiveHydration: boolean;
  hasLiveFeed: boolean;
  supportsSingleGameLineup: boolean;
};

export function sportsArenaSupportFlags(sport: SportsArenaSlug): SportsArenaSupportFlags {
  const isBaseballArena = sport === "baseball";
  const isSoccerArena = sport === "soccer";
  const isFightArena = sport === "fight";
  return {
    isBaseballArena,
    isSoccerArena,
    isFightArena,
    supportsSportsMainEvent: isBaseballArena || isSoccerArena || isFightArena,
    supportsSportsAppendHydration: isBaseballArena || isSoccerArena || isFightArena,
    supportsSportsUserLiveHydration: isBaseballArena || isSoccerArena,
    hasLiveFeed: isBaseballArena || isSoccerArena,
    supportsSingleGameLineup: isBaseballArena || isSoccerArena || isFightArena,
  };
}

export function sportsArenaConsoleRouteBundle(sport: SportsArenaSlug): SportsArenaConsoleRouteBundle {
  const apiSportPath = sport === "soccer" ? "soccer" : sport === "fight" ? "fight" : "baseball";
  const isBaseballArena = apiSportPath === "baseball";
  const isSoccerArena = apiSportPath === "soccer";
  const isFightArena = apiSportPath === "fight";
  return {
    apiSportPath,
    liveFeedRoute: `/api/game/sports/${apiSportPath}/live`,
    tournamentRoute: isFightArena ? "/api/game/sports/fight/tournaments" : isSoccerArena ? "/api/game/sports/soccer/tournaments" : "/api/game/sports/baseball/tournaments",
    tournamentResultRoute: isFightArena ? "/game/sports/fight/results" : isSoccerArena ? "/game/sports/soccer/results" : "/game/sports/baseball/results",
    vaultShowcaseRoute: `/api/game/sports/${apiSportPath}/vault/showcase`,
    vaultTransferRoute: isBaseballArena ? "/api/game/sports/baseball/vault/transfer" : `/api/game/sports/${apiSportPath}/vault/transfer`,
    vaultOfflineTransferRoute: isBaseballArena ? "/api/game/sports/baseball/vault/offline-transfer" : `/api/game/sports/${apiSportPath}/vault/offline-transfer`,
    cardTradesRoute: isBaseballArena ? "/api/game/sports/baseball/trades" : `/api/game/sports/${apiSportPath}/trades`,
  };
}

export function sportsArenaConsoleRouteValues(sport: SportsArenaSlug): [SportsArenaSlug, string, string, string, string, string, string, string] {
  const routes = sportsArenaConsoleRouteBundle(sport);
  return [routes.apiSportPath, routes.liveFeedRoute, routes.tournamentRoute, routes.tournamentResultRoute, routes.vaultShowcaseRoute, routes.vaultTransferRoute, routes.vaultOfflineTransferRoute, routes.cardTradesRoute];
}

export function sportsScoreboardGamePk(scoreboard: SportsArenaScoreboard): string {
  return sportsNormalizedGamePk(scoreboard.id);
}

export function sportsMatchupTeamCodes(scoreboard: SportsArenaScoreboard | null): string[] {
  if (!scoreboard) return [];
  return [scoreboard.away.code, scoreboard.home.code]
    .map(normalizeSportsTeamCode)
    .filter(Boolean);
}

export function sportsMatchupLabel(scoreboard: SportsArenaScoreboard | null): string {
  if (!scoreboard) return "Selected game";
  return `${scoreboard.away.code} / ${scoreboard.home.code}`;
}

export function sportsScoreboardMatchesCard(scoreboard: SportsArenaScoreboard, card: SportsArenaCard): boolean {
  if (scoreboard.allStarRoster) return scoreboard.allStarRoster.personIds.includes(card.media.sourceId);
  const teamCode = normalizeSportsTeamCode(card.teamCode);
  return normalizeSportsTeamCode(scoreboard.away.code) === teamCode || normalizeSportsTeamCode(scoreboard.home.code) === teamCode;
}

export function sportsScoreboardForCard(card: SportsArenaCard, scoreboards: SportsArenaScoreboard[]): SportsArenaScoreboard | null {
  return scoreboards.find((scoreboard) => sportsScoreboardMatchesCard(scoreboard, card)) ?? null;
}

export type SportsMainEventCardSlateState = {
  eligible: boolean;
  selectable?: boolean;
  label: string;
  detail: string;
  tone: "ready" | "live" | "risk" | "blocked";
  order: number;
};

export function compareSportsScoreboardsForSlate(left: SportsArenaScoreboard, right: SportsArenaScoreboard): number {
  const statusOrder = (scoreboard: SportsArenaScoreboard) =>
    scoreboard.status === "live" ? 0 : scoreboard.status === "pregame" ? 1 : scoreboard.status === "final" ? 3 : 2;
  const statusDelta = statusOrder(left) - statusOrder(right);
  if (statusDelta !== 0) return statusDelta;
  return (left.gameDate ?? "").localeCompare(right.gameDate ?? "") || left.id.localeCompare(right.id);
}

export function sportsScoreboardsByTeam(scoreboards: SportsArenaScoreboard[]): Map<string, SportsArenaScoreboard[]> {
  const byTeam = new Map<string, SportsArenaScoreboard[]>();
  for (const scoreboard of scoreboards) {
    for (const code of sportsMatchupTeamCodes(scoreboard)) {
      const current = byTeam.get(code) ?? [];
      current.push(scoreboard);
      byTeam.set(code, current);
    }
    for (const personId of scoreboard.allStarRoster?.personIds ?? []) {
      const key = `person:${personId}`;
      const current = byTeam.get(key) ?? [];
      current.push(scoreboard);
      byTeam.set(key, current);
    }
  }
  for (const [code, teamScoreboards] of byTeam) {
    byTeam.set(code, teamScoreboards.slice().sort(compareSportsScoreboardsForSlate));
  }
  return byTeam;
}

export function sportsCardIsBullpenRisk(card: SportsArenaCard): boolean {
  const position = card.position.trim().toUpperCase();
  return position === "RP" || position === "CP";
}

export function sportsCardIsPitcher(card: SportsArenaCard): boolean {
  const position = card.position.trim().toUpperCase();
  return card.side === "pitcher" || position === "SP" || position === "RP" || position === "CP";
}

export function sportsCardIsRosterStarter(card: SportsArenaCard): boolean {
  return card.position.trim().toUpperCase() === "SP" || card.tags.some((tag) => tag.trim().toLowerCase() === "starter");
}

export function sportsCardIsProbableStarter(card: SportsArenaCard, probablePersonId: string | null): boolean {
  return sportsCardIsRosterStarter(card) && Boolean(probablePersonId) && card.media.sourceId === probablePersonId;
}

export function sportsProbablePitcherIdsForScoreboardTeam(scoreboard: SportsArenaScoreboard, teamCode: string): string[] {
  const normalizedTeamCode = normalizeSportsTeamCode(teamCode);
  if (!normalizedTeamCode) return [];
  const ids: string[] = [];
  if (normalizeSportsTeamCode(scoreboard.away.code) === normalizedTeamCode) {
    const awayId = scoreboard.probablePitchers?.away?.personId ?? "";
    if (awayId) ids.push(awayId);
  }
  if (normalizeSportsTeamCode(scoreboard.home.code) === normalizedTeamCode) {
    const homeId = scoreboard.probablePitchers?.home?.personId ?? "";
    if (homeId) ids.push(homeId);
  }
  return ids;
}

export function sportsProbableStarterSlateLabel(probableStarterCount: number): string {
  if (probableStarterCount > 1) return `Probable ${Math.max(1, Math.round(100 / probableStarterCount))}%`;
  return "Starting";
}

export function sportsCardRosterStatusLabel(card: SportsArenaCard): string {
  return sharedSportsCardRosterStatusLabel(card);
}

export function sportsCardUnavailableSlateState(card: SportsArenaCard): SportsMainEventCardSlateState | null {
  const block = sportsCardRosterBlock(card);
  if (!block) return null;
  return {
    eligible: true,
    selectable: false,
    label: block.label,
    detail: block.detail,
    tone: "blocked",
    order: block.order,
  };
}

export function sportsCardRoleRiskSlateState(
  card: SportsArenaCard,
  scoreboard: SportsArenaScoreboard,
  pregameCountdown: string | null,
): SportsMainEventCardSlateState | null {
  if (sportsCardIsPitcher(card)) return null;
  const normalizedStatus = sportsCardRosterStatusLabel(card).toLowerCase();
  const normalizedTags = card.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const roleRiskTag = normalizedTags.some((tag) =>
    tag === "roster" ||
    tag.includes("bench") ||
    tag.includes("depth") ||
    tag.includes("platoon") ||
    tag.includes("utility") ||
    tag.includes("role"));
  const liveDetail = scoreboard.inning || scoreboard.count || sportsMatchupLabel(scoreboard);
  const pregameDetail = pregameCountdown ?? scoreboard.startTimeLabel ?? scoreboard.statusDetail ?? "Lineup watch";
  if (normalizedStatus === "roster" || roleRiskTag || card.rating < 62 || card.projectedScore < 4.15) {
    return {
      eligible: true,
      label: "Bench risk",
      detail: scoreboard.status === "live" ? liveDetail : pregameDetail,
      tone: "risk",
      order: scoreboard.status === "live" ? 16 : 26,
    };
  }
  if (card.rating < 72 || card.projectedScore < 4.65) {
    return {
      eligible: true,
      label: "Role risk",
      detail: scoreboard.status === "live" ? liveDetail : pregameDetail,
      tone: "risk",
      order: scoreboard.status === "live" ? 12 : 22,
    };
  }
  return null;
}

export function sportsCardSlateStateSelectable(state: SportsMainEventCardSlateState | null): boolean {
  return Boolean(state?.eligible && state.selectable !== false);
}

export function sportsCardSlateStateAutoSelectable(state: SportsMainEventCardSlateState | null): boolean {
  if (!sportsCardSlateStateSelectable(state)) return false;
  if (state?.tone === "risk") return false;
  return state?.label === "Starting" || state?.label.startsWith("Probable ") || state?.label === "Likely starter";
}

export function sportsArenaGameEntryLocked(
  sport: SportsArenaSlug,
  scoreboard: SportsArenaScoreboard | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!scoreboard) return false;
  if (scoreboard.status === "final") return true;
  if (sport !== "soccer") return false;
  const startMs = Date.parse(scoreboard.gameDate ?? "");
  return Number.isFinite(startMs) ? nowMs > startMs + SPORTS_ARENA_SOCCER_ENTRY_LIVE_WINDOW_MS : false;
}

function sportsConfirmedLineupForCard(scoreboard: SportsArenaScoreboard, card: SportsArenaCard) {
  const normalizedCardTeam = normalizeSportsTeamCode(card.teamCode);
  if (!normalizedCardTeam) return null;
  if (normalizeSportsTeamCode(scoreboard.away.code) === normalizedCardTeam) return scoreboard.lineup?.away ?? null;
  if (normalizeSportsTeamCode(scoreboard.home.code) === normalizedCardTeam) return scoreboard.lineup?.home ?? null;
  return null;
}

function sportsCardConfirmedLineupSlateState(
  card: SportsArenaCard,
  openScoreboards: SportsArenaScoreboard[],
  nowMs: number,
): SportsMainEventCardSlateState | null {
  const cardPersonId = card.media.sourceId;
  if (!cardPersonId) return null;
  const matchedScoreboards = openScoreboards.filter((scoreboard) => sportsScoreboardMatchesCard(scoreboard, card));
  const startingScoreboard = matchedScoreboards.find((scoreboard) =>
    sportsConfirmedLineupForCard(scoreboard, card)?.starterPersonIds.includes(cardPersonId));
  if (startingScoreboard) {
    const starterCountdown = startingScoreboard.status === "pregame"
      ? sportsCountdownClockLabel(startingScoreboard.gameDate, nowMs)
      : null;
    return {
      eligible: true,
      label: "Starting",
      detail: startingScoreboard.status === "live"
        ? startingScoreboard.inning || startingScoreboard.count || sportsMatchupLabel(startingScoreboard)
        : starterCountdown ?? startingScoreboard.startTimeLabel ?? startingScoreboard.statusDetail ?? sportsMatchupLabel(startingScoreboard),
      tone: startingScoreboard.status === "live" ? "live" : "ready",
      order: startingScoreboard.status === "live" ? 0 : 6,
    };
  }
  if (sportsCardIsPitcher(card) && !sportsCardIsRosterStarter(card)) return null;
  const confirmedLineupScoreboard = matchedScoreboards.find((scoreboard) => {
    const lineup = sportsConfirmedLineupForCard(scoreboard, card);
    if (!lineup?.confirmed) return false;
    if (sportsCardIsRosterStarter(card)) return lineup.pitcherPersonIds.length > 0;
    return lineup.battingOrderPersonIds.length > 0;
  });
  if (!confirmedLineupScoreboard) return null;
  return {
    eligible: true,
    selectable: false,
    label: sportsCardIsRosterStarter(card) ? "Not pitching" : "Night off",
    detail: sportsCardIsRosterStarter(card)
      ? "Confirmed starter not scheduled"
      : "Not in confirmed lineup",
    tone: "blocked",
    order: sportsCardIsRosterStarter(card) ? 70 : 68,
  };
}

export function sportsCardSlateStateForScoreboards(
  card: SportsArenaCard,
  scoreboards: SportsArenaScoreboard[],
  nowMs = Date.now(),
): SportsMainEventCardSlateState {
  const openScoreboards = scoreboards.filter((scoreboard) => scoreboard.status !== "final");
  const scoreboard = openScoreboards[0] ?? scoreboards[0] ?? null;
  const pregameCountdown = scoreboard?.status === "pregame"
    ? sportsCountdownClockLabel(scoreboard.gameDate, nowMs)
    : null;
  const unavailableState = sportsCardUnavailableSlateState(card);
  if (unavailableState) return unavailableState;
  if (!scoreboard) {
    return {
      eligible: false,
      label: "No game",
      detail: "Not on today's MLB slate",
      tone: "blocked",
      order: 90,
    };
  }
  if (openScoreboards.length === 0) {
    return {
      eligible: false,
      label: "Final",
      detail: `${sportsMatchupLabel(scoreboard)} closed`,
      tone: "blocked",
      order: 80,
    };
  }

  const allStarScoreboard = openScoreboards.find((candidate) => candidate.allStarRoster?.personIds.includes(card.media.sourceId));
  if (allStarScoreboard) {
    return {
      eligible: true,
      label: "Likely starter",
      detail: allStarScoreboard.status === "live"
        ? allStarScoreboard.inning || allStarScoreboard.count || sportsMatchupLabel(allStarScoreboard)
        : sportsCountdownClockLabel(allStarScoreboard.gameDate, nowMs) ?? allStarScoreboard.startTimeLabel ?? sportsMatchupLabel(allStarScoreboard),
      tone: allStarScoreboard.status === "live" ? "live" : "ready",
      order: allStarScoreboard.status === "live" ? 0 : 10,
    };
  }

  const confirmedLineupState = sportsCardConfirmedLineupSlateState(card, openScoreboards, nowMs);
  if (confirmedLineupState) return confirmedLineupState;

  const probablePersonIds = new Set(openScoreboards.flatMap((candidate) => sportsProbablePitcherIdsForScoreboardTeam(candidate, card.teamCode)));
  if (sportsCardIsRosterStarter(card)) {
    if (!probablePersonIds.has(card.media.sourceId)) {
      return {
        eligible: false,
        label: "Not pitching",
        detail: "Starter not scheduled for this slate",
        tone: "blocked",
        order: 70,
      };
    }
    const starterScoreboard = openScoreboards.find((candidate) =>
      sportsProbablePitcherIdsForScoreboardTeam(candidate, card.teamCode).includes(card.media.sourceId)) ?? scoreboard;
    const starterPregameCountdown = starterScoreboard.status === "pregame"
      ? sportsCountdownClockLabel(starterScoreboard.gameDate, nowMs)
      : null;
    return {
      eligible: true,
      label: sportsProbableStarterSlateLabel(probablePersonIds.size),
      detail: starterPregameCountdown ?? starterScoreboard.startTimeLabel ?? starterScoreboard.statusDetail ?? sportsMatchupLabel(starterScoreboard),
      tone: starterScoreboard.status === "live" ? "live" : "ready",
      order: starterScoreboard.status === "live" ? 0 : 8,
    };
  }

  if (sportsCardIsBullpenRisk(card)) {
    return {
      eligible: true,
      label: "Bullpen risk",
      detail: scoreboard.status === "live"
        ? scoreboard.inning || scoreboard.count || sportsMatchupLabel(scoreboard)
        : pregameCountdown ?? scoreboard.startTimeLabel ?? "May enter late",
      tone: "risk",
      order: scoreboard.status === "live" ? 14 : 24,
    };
  }

  const roleRiskState = sportsCardRoleRiskSlateState(card, scoreboard, pregameCountdown);
  if (roleRiskState) return roleRiskState;

  if (scoreboard.status === "live") {
    return {
      eligible: true,
      label: "Likely starter",
      detail: scoreboard.inning || scoreboard.count || sportsMatchupLabel(scoreboard),
      tone: "live",
      order: 0,
    };
  }

  return {
    eligible: true,
    label: "Likely starter",
    detail: pregameCountdown ?? scoreboard.startTimeLabel ?? scoreboard.statusDetail ?? sportsMatchupLabel(scoreboard),
    tone: "ready",
    order: 10,
  };
}

export function sportsMainEventCardSlateStateForCard(
  card: SportsArenaCard,
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
  nowMs = Date.now(),
): SportsMainEventCardSlateState {
  return sportsCardSlateStateForScoreboards(
    card,
    scoreboardByTeam.get(`person:${card.media.sourceId}`) ?? scoreboardByTeam.get(normalizeSportsTeamCode(card.teamCode)) ?? [],
    nowMs,
  );
}

export function sportsMatchupCardSlateStateForCard(
  card: SportsArenaCard,
  scoreboard: SportsArenaScoreboard | null,
  nowMs = Date.now(),
): SportsMainEventCardSlateState {
  if (!scoreboard) {
    return {
      eligible: true,
      label: "Matchup",
      detail: "Selected game",
      tone: "ready",
      order: 10,
    };
  }
  if (!sportsScoreboardMatchesCard(scoreboard, card)) {
    return {
      eligible: false,
      label: "No game",
      detail: "Not in selected matchup",
      tone: "blocked",
      order: 90,
    };
  }
  return sportsCardSlateStateForScoreboards(card, [scoreboard], nowMs);
}

export function sportsCardEligibleForMatchupPickFive(
  card: SportsArenaCard,
  scoreboard: SportsArenaScoreboard | null,
  teamCodes: string[],
): boolean {
  return (scoreboard ? sportsScoreboardMatchesCard(scoreboard, card) : sportsCardMatchesMatchup(card, teamCodes)) &&
    sportsMatchupCardSlateStateForCard(card, scoreboard).eligible;
}

export function sportsMatchupSelectableCardIdsForSlate(
  cards: SportsArenaCard[],
  scoreboard: SportsArenaScoreboard | null,
): string[] {
  return cards
    .filter((card) => sportsCardSlateStateSelectable(sportsMatchupCardSlateStateForCard(card, scoreboard)))
    .map((card) => card.id);
}

export function sportsMatchupAutoSelectCardIdsForSlate(
  cards: SportsArenaCard[],
  scoreboard: SportsArenaScoreboard | null,
): string[] {
  return cards
    .filter((card) => sportsCardSlateStateAutoSelectable(sportsMatchupCardSlateStateForCard(card, scoreboard)))
    .map((card) => card.id);
}

export function sportsMainEventSelectableCardsForSlate(
  cards: SportsArenaCard[],
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
): SportsArenaCard[] {
  return cards
    .filter((card) => sportsCardSlateStateSelectable(sportsMainEventCardSlateStateForCard(card, scoreboardByTeam)))
    .sort((left, right) => compareSportsCardsForMainEventSlate(left, right, scoreboardByTeam));
}

export function sportsMainEventAutoSelectCardsForSlate(
  cards: SportsArenaCard[],
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
): SportsArenaCard[] {
  return cards
    .filter((card) => sportsCardSlateStateAutoSelectable(sportsMainEventCardSlateStateForCard(card, scoreboardByTeam)));
}

export function sportsMainEventAutoSelectCardIdsForSlate(
  cards: SportsArenaCard[],
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
): string[] {
  return sportsMainEventAutoSelectCardsForSlate(cards, scoreboardByTeam).map((card) => card.id);
}

export function sportsMainEventVisibleCardsForSlate(
  cards: SportsArenaCard[],
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
  lockedCardIds: ReadonlySet<string>,
): SportsArenaCard[] {
  return cards
    .filter((card) => sportsMainEventCardSlateStateForCard(card, scoreboardByTeam).eligible || lockedCardIds.has(card.id))
    .sort((left, right) => compareSportsCardsForMainEventSlate(left, right, scoreboardByTeam));
}

export function compareSportsCardsForMainEventSlate(
  left: SportsArenaCard,
  right: SportsArenaCard,
  scoreboardByTeam: Map<string, SportsArenaScoreboard[]>,
): number {
  const leftState = sportsMainEventCardSlateStateForCard(left, scoreboardByTeam);
  const rightState = sportsMainEventCardSlateStateForCard(right, scoreboardByTeam);
  if (leftState.order !== rightState.order) return leftState.order - rightState.order;
  return compareSportsCardsForPickFive(left, right);
}

export function compareSportsCardsForPregameSpotlight(left: SportsArenaCard, right: SportsArenaCard): number {
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) return ratingDelta;
  const projectedDelta = right.projectedScore - left.projectedScore;
  if (projectedDelta !== 0) return projectedDelta;
  const liveDelta = right.currentScore - left.currentScore;
  if (liveDelta !== 0) return liveDelta;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export function sportsTopMatchupCardForTeam(cards: SportsArenaCard[], teamCode: string): SportsArenaCard | null {
  const normalizedTeamCode = normalizeSportsTeamCode(teamCode);
  if (!normalizedTeamCode) return null;
  return cards
    .filter((card) => normalizeSportsTeamCode(card.teamCode) === normalizedTeamCode)
    .sort(compareSportsCardsForPregameSpotlight)[0] ?? null;
}

export function sportsTopPregameCardForTeam(
  cards: SportsArenaCard[],
  scoreboard: SportsArenaScoreboard | null,
  side: "away" | "home",
): SportsArenaCard | null {
  const teamCode = scoreboard?.[side].code ?? "";
  const normalizedTeamCode = normalizeSportsTeamCode(teamCode);
  if (!normalizedTeamCode) return null;
  const probablePersonId = scoreboard?.probablePitchers?.[side]?.personId ?? null;
  return cards
    .filter((card) => normalizeSportsTeamCode(card.teamCode) === normalizedTeamCode)
    .sort(compareSportsCardsForPregameSpotlight)
    .find((card) => !sportsCardIsPitcher(card) || sportsCardIsProbableStarter(card, probablePersonId)) ?? null;
}

export function sportsProbableStarterCardForTeam(
  cards: SportsArenaCard[],
  scoreboard: SportsArenaScoreboard | null,
  side: "away" | "home",
): SportsArenaCard | null {
  const probable = scoreboard?.probablePitchers?.[side] ?? null;
  const teamCode = probable?.teamCode ?? scoreboard?.[side].code ?? "";
  const normalizedTeamCode = normalizeSportsTeamCode(teamCode);
  if (!normalizedTeamCode) return null;
  const teamCards = cards.filter((card) => normalizeSportsTeamCode(card.teamCode) === normalizedTeamCode);
  if (probable?.personId) {
    const exactStarterCard = teamCards.find((card) => card.media.sourceId === probable.personId);
    if (exactStarterCard && sportsCardIsProbableStarter(exactStarterCard, probable.personId)) return exactStarterCard;
  }
  return null;
}

export function compareSportsCardsForFinalPerformance(
  left: SportsArenaCard,
  right: SportsArenaCard,
  finalScoreByCardId: Map<string, number>,
): number {
  const finalScorePresenceDelta = Number(finalScoreByCardId.has(right.id)) - Number(finalScoreByCardId.has(left.id));
  if (finalScorePresenceDelta !== 0) return finalScorePresenceDelta;
  const scoreDelta = (finalScoreByCardId.get(right.id) ?? right.currentScore) - (finalScoreByCardId.get(left.id) ?? left.currentScore);
  if (scoreDelta !== 0) return scoreDelta;
  const liveDelta = right.currentScore - left.currentScore;
  if (liveDelta !== 0) return liveDelta;
  const projectedDelta = right.projectedScore - left.projectedScore;
  if (projectedDelta !== 0) return projectedDelta;
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta !== 0) return ratingDelta;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export function sportsBestFinalCardForTeam(
  cards: SportsArenaCard[],
  teamCode: string,
  finalScoreByCardId: Map<string, number>,
): SportsArenaCard | null {
  const normalizedTeamCode = normalizeSportsTeamCode(teamCode);
  if (!normalizedTeamCode) return null;
  return cards
    .filter((card) => normalizeSportsTeamCode(card.teamCode) === normalizedTeamCode)
    .sort((left, right) => compareSportsCardsForFinalPerformance(left, right, finalScoreByCardId))[0] ?? null;
}

export function sportsFinalCardScore(card: SportsArenaCard, finalScoreByCardId: Map<string, number>): number {
  return Number((finalScoreByCardId.get(card.id) ?? card.currentScore).toFixed(2));
}

export function sportsCardPlayStateLabel(scoreboard: SportsArenaScoreboard | null): { label: string; state: "live" | "waiting" | "final" } {
  if (scoreboard?.status === "live") return { label: scoreboard.inning || "Live", state: "live" };
  if (scoreboard?.status === "final") return { label: "Final", state: "final" };
  if (scoreboard?.livePulse && scoreboard.livePulse.trim()) return { label: scoreboard.livePulse.trim(), state: "waiting" };
  return { label: "Waiting", state: "waiting" };
}

export function splitSportsCountOutsLabel(count: string): { count: string; outs: string | null } {
  const clean = count.trim();
  if (!clean) return { count: "", outs: null };
  const parts = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const maybeOuts = parts[parts.length - 1] ?? "";
  if (parts.length > 1 && /\bout/i.test(maybeOuts)) {
    return { count: parts.slice(0, -1).join(", "), outs: maybeOuts };
  }
  return { count: clean, outs: null };
}

export function compactSportsInningLabel(inning: string): string {
  const clean = inning.trim();
  if (!clean) return "";
  return clean
    .replace(/^Top\s+/i, "")
    .replace(/^Bottom\s+/i, "")
    .replace(/^Middle\s+/i, "Mid ")
    .replace(/^End\s+/i, "End ");
}

export function compactSportsPitchTypeLabel(pitchType: string | null | undefined): string {
  const value = (pitchType ?? "").trim();
  if (!value) return "";
  return value
    .replace(/\bfour[\s-]?seam(?:ed)?(?:\s+(?:fastball|fb))?\b/gi, "4-seam")
    .replace(/\btwo[\s-]?seam(?:ed)?(?:\s+(?:fastball|fb))?\b/gi, "2-seam")
    .replace(/\b4[\s-]?seam(?:ed)?(?:\s+(?:fastball|fb))?\b/gi, "4-seam")
    .replace(/\b2[\s-]?seam(?:ed)?(?:\s+(?:fastball|fb))?\b/gi, "2-seam");
}

export function sportsInningHalfTone(inning: string): "top" | "bottom" | undefined {
  const clean = inning.trim().toLowerCase();
  if (clean.startsWith("top ")) return "top";
  if (clean.startsWith("bottom ")) return "bottom";
  return undefined;
}

export function sportsCardMatchesMatchup(card: SportsArenaCard, teamCodes: string[]): boolean {
  if (teamCodes.length === 0) return true;
  return teamCodes.includes(normalizeSportsTeamCode(card.teamCode));
}

export function compareSportsCardsForMatchupPickFive(
  left: SportsArenaCard,
  right: SportsArenaCard,
  teamOrder: Map<string, number>,
): number {
  const qualityDelta = compareSportsCardsForPickFive(left, right);
  if (qualityDelta !== 0) return qualityDelta;
  const leftOrder = teamOrder.get(normalizeSportsTeamCode(left.teamCode)) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = teamOrder.get(normalizeSportsTeamCode(right.teamCode)) ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export function sameSportsLineupIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((cardId, index) => cardId === right[index]);
}

export function fillSportsLineupIds(current: string[], orderedCardIds: string[], lineupSize: number): string[] {
  const orderedSet = new Set(orderedCardIds);
  const kept = current.filter((cardId) => orderedSet.has(cardId));
  const filled = [...kept];
  for (const cardId of orderedCardIds) {
    if (filled.length >= lineupSize) break;
    if (!filled.includes(cardId)) filled.push(cardId);
  }
  const next = filled.slice(0, lineupSize);
  return sameSportsLineupIds(current, next) ? current : next;
}

export function sportsDefaultLineupIdsForSlate(autoCardIds: string[], selectableCardIds: string[], lineupSize: number): string[] {
  const orderedCardIds = autoCardIds.length > 0 ? autoCardIds : selectableCardIds;
  return fillSportsLineupIds([], orderedCardIds, lineupSize);
}

export function filterSportsLineupIds(current: string[], orderedCardIds: string[], lineupSize: number): string[] {
  const orderedSet = new Set(orderedCardIds);
  const next = current.filter((cardId) => orderedSet.has(cardId)).slice(0, lineupSize);
  return sameSportsLineupIds(current, next) ? current : next;
}

export function reconcileSportsGameLineupIds(current: string[], orderedCardIds: string[], lineupSize: number, manuallyTouched: boolean): string[] {
  if (!manuallyTouched) return fillSportsLineupIds([], orderedCardIds, lineupSize);
  const filtered = filterSportsLineupIds(current, orderedCardIds, lineupSize);
  return filtered.length > 0 ? filtered : fillSportsLineupIds([], orderedCardIds, lineupSize);
}

export function settleSportsPackShellFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, SPORTS_PACK_REVEAL_SHELL_MS));
}

export function settleSportsPackRipFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, SPORTS_PACK_REVEAL_RIP_MS));
}

export function settleSportsVaultSyncRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function sportsVaultSyncError(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" ? error : "";
}

export function shouldRetrySportsVaultSync(error: string, status: number): boolean {
  if (status >= 500) return true;
  return error === "sports_claim_not_issued" ||
    error === "sports_claim_issue_check_failed" ||
    error === "sports_pack_manifest_pending";
}

export function sportsPackPullCard(claim: SportsArenaCardClaim, displayCards: SportsArenaCard[]): SportsArenaCard {
  const baseCard = displayCards.find((card) => sportsClaimMatchesCard(claim, card)) ?? sportsCardFromClaim(claim);
  return cardVariantFromOwnedClaim(baseCard, claim);
}

export function sportsPackPullValueSnapshot(
  claim: SportsArenaCardClaim,
  card: SportsArenaCard,
  displayCards?: SportsArenaCard[],
) {
  const usdValue = sportsArenaCardClaimUsdValue(claim, card, card.currentScore, 1, displayCards);
  const phiValue = sportsArenaPhiFromUsdValue(usdValue);
  return {
    usdValue,
    usdLabel: sportsUsdLabel(usdValue),
    phiLabel: `${phiValue.toLocaleString("en-US", { maximumFractionDigits: 3 })} Φ`,
  };
}

export function sportsPackPullImpact(claim: SportsArenaCardClaim, card: SportsArenaCard, usdValue: number): SportsPackPullImpact {
  const ratingLine = `${card.rating} rating`;
  const scarcityTier = claim.economy?.playerScarcityTier ?? card.tier;
  const valueLine = sportsUsdLabel(usdValue);
  const issueLine = sportsArenaClaimIssueLine(claim);
  if (claim.rarity === "Mythic") {
    return {
      tier: "mythic",
      badge: "Mythic hit",
      headline: "Monster pull",
      why: `${claim.variantName} mythic, ${ratingLine}, ${sportsArenaClaimRarityOddsLine(claim)}`,
      heat: 100,
    };
  }
  if (claim.rarity === "Champion") {
    return {
      tier: "champion",
      badge: "Champion hit",
      headline: "Trophy-room card",
      why: `${claim.variantName} champion, ${ratingLine}, ${sportsArenaClaimCirculationLine(claim)}`,
      heat: 94,
    };
  }
  if (claim.rarity === "Gold") {
    return {
      tier: "gold",
      badge: "Gold hit",
      headline: "Premium pull",
      why: `${claim.variantName} gold, ${ratingLine}, value snapshot ${valueLine}`,
      heat: 86,
    };
  }
  if (card.rating >= 95 || scarcityTier === "Franchise" || scarcityTier === "Mythic") {
    return {
      tier: "franchise",
      badge: "Franchise pull",
      headline: "Cornerstone card",
      why: `${scarcityTier} tier, ${ratingLine}, ${issueLine}`,
      heat: 82,
    };
  }
  if (usdValue >= 10) {
    return {
      tier: "high-value",
      badge: "High value",
      headline: "Market signal",
      why: `${valueLine} live pull value, ${ratingLine}, ${card.teamCode} ${card.position}`,
      heat: 76,
    };
  }
  if (claim.rookie?.isRookie) {
    const rookieClass = claim.rookie.rookieClass ?? (claim.rookie.rookieSeason ? `${claim.rookie.rookieSeason}` : "Rookie");
    return {
      tier: "rookie",
      badge: "Rookie card",
      headline: "Rookie watch",
      why: `${rookieClass} RC, ${ratingLine}, future appends can build history`,
      heat: 72,
    };
  }
  if (card.rating >= 90 || scarcityTier === "Star") {
    return {
      tier: "star",
      badge: "Star pull",
      headline: "Lineup maker",
      why: `${scarcityTier} tier, ${ratingLine}, ${card.teamCode} ${card.position}`,
      heat: 66,
    };
  }
  if (claim.rarity === "Rare") {
    return {
      tier: "rare",
      badge: "Rare pull",
      headline: "Low-circulation card",
      why: `${claim.variantName} rare, ${sportsArenaClaimCirculationLine(claim)}`,
      heat: 58,
    };
  }
  return {
    tier: "base",
    badge: "Base card",
    headline: "Roster depth",
    why: `${card.teamCode} ${card.position}, ${ratingLine}, value snapshot ${valueLine}`,
    heat: 36,
  };
}

export function sportsPackPullSignal(claim: SportsArenaCardClaim, card: SportsArenaCard, usdValue: number): string | null {
  const impact = sportsPackPullImpact(claim, card, usdValue);
  if (impact.tier === "base") return null;
  return impact.badge;
}

export function sportsUsdLabel(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sportsSignedUsdLabel(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${sportsUsdLabel(Math.abs(value))}`;
}

export function sportsUsdCentsValue(value: string | number | bigint | null | undefined): number {
  if (value == null) return 0;
  const cents = typeof value === "bigint" ? Number(value) : typeof value === "string" ? Number.parseInt(value, 10) : value;
  return Number.isFinite(cents) ? Number((cents / 100).toFixed(2)) : 0;
}

export function sportsLineChartGeometry(values: number[], width = 156, height = 42, padding = 4) {
  const source = values.length >= 2 ? values : values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : [0, 0];
  const min = Math.min(...source);
  const max = Math.max(...source);
  const range = Math.max(1, max - min);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const points = source.map((value, index) => {
    const x = padding + (source.length === 1 ? 0 : (index / (source.length - 1)) * innerWidth);
    const y = padding + ((max - value) / range) * innerHeight;
    return { x, y, value };
  });
  const pointString = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const firstPoint = points[0] ?? { x: padding, y: height / 2, value: 0 };
  const lastPoint = points[points.length - 1] ?? firstPoint;
  const firstValue = source[0] ?? 0;
  const lastValue = source[source.length - 1] ?? firstValue;
  const trend = lastValue > firstValue ? "gain" : lastValue < firstValue ? "loss" : "flat";
  return {
    areaPath: `${linePath} L${lastPoint.x.toFixed(2)} ${(height - padding).toFixed(2)} L${firstPoint.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`,
    firstValue,
    lastValue,
    pointString,
    lastX: lastPoint.x,
    lastY: lastPoint.y,
    trend,
  };
}

export function sportsNewYorkDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function sportsDateOffset(sourceDate: string, offsetDays: number): string {
  const parts = sourceDate.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return sportsNewYorkDate(new Date(Date.now() + offsetDays * 86_400_000));
  }
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function sportsDateShortLabel(sourceDate: string): string {
  const parts = sourceDate.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "next slate";
  const [year, month, day] = parts;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

export function sportsCountdownClockLabel(gameDate: string | null | undefined, nowMs: number): string {
  const startMs = Date.parse(gameDate ?? "");
  if (!Number.isFinite(startMs)) return "00:00:00";
  const totalSeconds = Math.max(0, Math.ceil((startMs - nowMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export type SportsArenaDelayedGameState = {
  state: boolean;
  kind: "Suspended" | "Postponed" | "Delayed";
  reason: string;
  countdown: string;
};

export function sportsArenaDelayedGameState(
  scoreboard: SportsArenaScoreboard | null | undefined,
  fallbackGamePk: string | null | undefined,
  nowMs: number,
  delayedGameDatesByGamePk: Map<string, string>,
): SportsArenaDelayedGameState {
  const statusDetail = scoreboard?.statusDetail?.trim() ?? "";
  const state = Boolean(scoreboard?.status !== "final" && (scoreboard?.delayed || /delay|suspend|postpon|resched/i.test(statusDetail)));
  const gamePk = scoreboard ? sportsScoreboardGamePk(scoreboard) : fallbackGamePk ?? "";
  const nextStartMs = Date.parse(scoreboard?.gameDate ?? "");
  const heldDate = gamePk ? delayedGameDatesByGamePk.get(gamePk) ?? null : null;
  const heldStartMs = Date.parse(heldDate ?? "");
  const nextDateIsFuture = Number.isFinite(nextStartMs) && nextStartMs > nowMs;
  const heldDateIsFuture = Number.isFinite(heldStartMs) && heldStartMs > nowMs;
  if (state && gamePk && scoreboard?.gameDate && (nextDateIsFuture || !heldDateIsFuture)) {
    delayedGameDatesByGamePk.set(gamePk, scoreboard.gameDate);
  }
  const countdownDate = gamePk ? delayedGameDatesByGamePk.get(gamePk) ?? null : null;
  return {
    state,
    kind: /suspend/i.test(statusDetail) ? "Suspended" : /postpon|resched/i.test(statusDetail) ? "Postponed" : "Delayed",
    reason: statusDetail.replace(/^(game\s+)?(suspended|postponed|delayed|rescheduled)\s*[:-]?\s*/i, "").trim(),
    countdown: countdownDate ? sportsCountdownClockLabel(countdownDate, nowMs) : "",
  };
}

export function sportsUsdCentsLabel(value: string | number | bigint | null | undefined): string {
  return formatSportsArenaCardUsdCents(value ?? "0");
}

export function sportsPercentLabel(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function sportsArenaEntryValueImpactUsd(entry: SportsArenaEntry | null): string {
  if (!entry) return "$0.00";
  const rankLift = entry.rank ? Math.max(0, 21 - entry.rank) * 1.7 : 0;
  const appendLift = Math.max(0, entry.proof.appendCount ?? 0) * 0.22;
  const finalLift = entry.status === "finalized" ? 3.2 : 0;
  return sportsUsdLabel(sportsArenaUsdFromValueBasis(Math.max(0, entry.score * 0.52 + rankLift + appendLift + finalLift)));
}

export function explainSportsReceizIdBindError(code: string): string {
  if (code === "signin_required") return "Recover or sign into the account first, then bind Receiz ID.";
  if (code === "proof_replay_guard_unavailable") return "Receiz ID proof could not publish safely. Try again when sync is available.";
  return code;
}

export function sportsSessionText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type SportsArenaSessionBootstrap = SessionBootstrapSnapshot & {
  profileUsernameResolved?: boolean;
};

export function sportsSessionBootstrapFromInitialSession(session: SportsArenaInitialSession | null | undefined): SportsArenaSessionBootstrap | null {
  const uid = sportsSessionText(session?.uid);
  if (!uid) return null;
  const plan = normalizePlan(session?.plan);
  const entitlementPlan = normalizePlan(session?.entitlementPlan ?? plan);
  return {
    signedIn: true,
    uid,
    email: sportsSessionText(session?.email) || null,
    username: sportsSessionText(session?.username),
    profileUsernameResolved: session?.profileUsernameResolved === true,
    canViewPhiAmounts: true,
    plan,
    entitlementPlan,
  };
}

export function sportsSessionBootstrapForFirstPaint(
  storedSession: SessionBootstrapSnapshot | null,
  initialSession: SportsArenaSessionBootstrap | null,
): SessionBootstrapSnapshot | null {
  if (!initialSession?.signedIn) return storedSession;
  if (!storedSession?.signedIn) return initialSession;
  if (storedSession.uid !== initialSession.uid) return initialSession;
  const entitlementPlan = normalizePlan(initialSession.entitlementPlan ?? initialSession.plan);
  const plan = normalizePlan(initialSession.plan);
  return {
    ...initialSession,
    email: storedSession.email ?? initialSession.email,
    username: initialSession.profileUsernameResolved
      ? initialSession.username || storedSession.username
      : storedSession.username || initialSession.username,
    canViewPhiAmounts: true,
    plan,
    entitlementPlan,
  };
}

export function sportsSessionBootstrapMatchesCanonicalProfile(
  current: SessionBootstrapSnapshot | null,
  canonical: SessionBootstrapSnapshot,
): boolean {
  return current?.uid === canonical.uid &&
    current.email === canonical.email &&
    current.username === canonical.username &&
    current.plan === canonical.plan &&
    current.entitlementPlan === canonical.entitlementPlan;
}

export function admitSportsInitialSessionBootstrap(
  initialSession: SportsArenaSessionBootstrap | null,
): void {
  if (!initialSession?.signedIn || !initialSession.uid) return;
  const current = peekSessionBootstrapSnapshot(true);
  const projected = sportsSessionBootstrapForFirstPaint(current, initialSession);
  if (!projected?.signedIn || !projected.uid) return;
  if (sportsSessionBootstrapMatchesCanonicalProfile(current, projected)) return;
  writeSessionBootstrapSnapshot({
    ...projected,
    durableProofBacked: current?.uid === projected.uid ? true : undefined,
  });
}

export function admitSportsSessionBootstrapFromServer(payload: SportsSessionResponse | null): boolean {
  const session = payload?.session;
  const uid = sportsSessionText(session?.uid);
  if (!uid) return false;

  const current = peekSessionBootstrapSnapshot(true);
  const plan = normalizePlan(session?.plan);
  const entitlementPlan = normalizePlan(session?.entitlementPlan ?? plan);
  writeSessionBootstrapSnapshot({
    signedIn: true,
    uid,
    email: sportsSessionText(session?.email) || (current?.email ?? null),
    username: sportsSessionText(session?.username) || (current?.username ?? ""),
    canViewPhiAmounts: true,
    plan: plan as Plan,
    entitlementPlan: entitlementPlan as Plan,
    durableProofBacked: true,
  });
  return true;
}

export function sportsSessionBootstrapFromReceizAccountBinding(binding: ReceizAccountBinding): SessionBootstrapSnapshot {
  const plan = normalizePlan(binding.session.plan);
  const entitlementPlan = normalizePlan(binding.session.entitlementPlan ?? plan);
  return {
    signedIn: true,
    uid: binding.session.uid,
    email: binding.session.email,
    username: binding.session.username ?? "",
    canViewPhiAmounts: true,
    plan,
    entitlementPlan,
  };
}

export function peekSportsReceizAccountBindingSessionBootstrap(): SessionBootstrapSnapshot | null {
  const binding = peekActiveReceizAccountBindingWithAccountAuthority();
  return binding ? sportsSessionBootstrapFromReceizAccountBinding(binding) : null;
}

export function projectSportsReceizAccountBindingSessionBootstrap(): SessionBootstrapSnapshot | null {
  const binding = peekActiveReceizAccountBindingWithAccountAuthority();
  if (!binding) return null;
  projectReceizAccountBinding(binding);
  return peekSessionBootstrapSnapshot(true) ?? sportsSessionBootstrapFromReceizAccountBinding(binding);
}

export async function refreshSportsSessionBootstrapFromServer(): Promise<boolean> {
  try {
    const response = await fetch("/api/session", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return Boolean(peekSessionBootstrapSnapshot(true)?.uid);
    const payload = (await response.json().catch(() => null)) as SportsSessionResponse | null;
    return admitSportsSessionBootstrapFromServer(payload) || Boolean(peekSessionBootstrapSnapshot(true)?.uid);
  } catch {
    return Boolean(peekSessionBootstrapSnapshot(true)?.uid);
  }
}

export const SPORTS_BATTED_BALL_HOME_X_PCT = 50;
export const SPORTS_BATTED_BALL_HOME_Y_PCT = 124;
export const MLB_HIT_COORDINATE_CENTER_X = 125;

export type SportsBestNextOpportunity = {
  label: string;
  meta: string;
  score: number;
  tone: "flat" | "gain" | "live" | "loss" | "waiting";
};

export type SportsLineupCoachVoice = {
  tone: "gain" | "live" | "open" | "ready" | "sealed";
  label: string;
  detail: string;
};

export type SportsLiveCockpitMemoryPulseTone = "flat" | "gain" | "live" | "loss" | "waiting";

export type SportsLiveCockpitMemoryPulse = {
  label: string;
  detail: string;
  tone: SportsLiveCockpitMemoryPulseTone;
};

function sportsLiveCockpitMemoryPulseTone(value: string | null | undefined): SportsLiveCockpitMemoryPulseTone {
  if (value === "gain" || value === "live" || value === "loss" || value === "waiting" || value === "flat") return value;
  if (value === "ready" || value === "open" || value === "armed" || value === "pending") return "waiting";
  return "flat";
}

export function sportsLineupCoachVoice(args: {
  game: boolean;
  ready: boolean;
  missing: number;
  count: number;
  vault: number;
  entered: boolean;
  completed: boolean;
  joined: boolean;
  final: boolean;
  payout: boolean;
  estPayout: string;
  settlement: string;
  entry: string;
  paid: string;
  mover?: string | null;
  delta?: number | null;
  spark?: string | null;
  move?: string | null;
  scored: number;
  live: number;
  waiting: number;
}): SportsLineupCoachVoice {
  const latestMove = typeof args.delta === "number" && Number.isFinite(args.delta)
    ? args.delta
    : null;
  const latestMoverVoice = args.mover && latestMove !== null && Math.abs(latestMove) >= 0.01
    ? {
      tone: latestMove > 0 ? "gain" as const : "live" as const,
      label: `${args.mover} changed`,
      detail: `${formatScore(latestMove)} sealed to card memory`,
    }
    : null;
  const nextSparkVoice = args.spark && args.move
    ? {
      tone: args.live > 0 ? "live" as const : "ready" as const,
      label: args.live > 0 ? `Watch ${args.spark}` : "Next write",
      detail: args.live > 0 ? args.move : `${args.spark} · ${args.move}`,
    }
    : null;
  const memoryLiveVoice = args.scored > 0
    ? {
      tone: "live" as const,
      label: "Memory moving",
      detail: `${args.scored}/${Math.max(1, args.count)} cards wrote · ${args.live} live`,
    }
    : null;
  const holdVoice = args.waiting > 0
    ? {
      tone: "ready" as const,
      label: "Hold your five",
      detail: `${args.waiting} cards waiting on real plays`,
    }
    : null;

  if (!args.game && args.final) {
    return {
      tone: args.payout ? "gain" : "sealed",
      label: args.payout ? "Cash finish" : "Career sealed",
      detail: args.payout ? `${args.settlement} payout proof` : "Proof closed to cards",
    };
  }

  if (!args.game && args.joined) {
    if (args.payout) {
      return {
        tone: "gain",
        label: "In the money",
        detail: `${args.estPayout} est.`,
      };
    }
    return latestMoverVoice ?? memoryLiveVoice ?? nextSparkVoice ?? {
      tone: "live",
      label: "Your five are live",
      detail: "Rank + card value move live",
    };
  }

  if (args.game && args.entered) {
    return latestMoverVoice ?? memoryLiveVoice ?? nextSparkVoice ?? holdVoice ?? {
      tone: args.completed ? "sealed" : "live",
      label: args.completed ? "Game sealed" : "Your five are live",
      detail: args.completed ? "Proof memory locked" : "Every real play writes memory",
    };
  }

  if (args.ready) {
    return args.game
      ? {
        tone: "ready",
        label: "This is yours",
        detail: "Enter to write card memory",
      }
      : {
        tone: "ready",
        label: "Main Event ready",
        detail: `${args.entry} in · Top ${args.paid} paid`,
      };
  }

  if (args.vault === 0 && args.count === 0) {
    return {
      tone: "open",
      label: "Open your starter pack",
      detail: "Cards are your entry",
    };
  }

  return {
    tone: "open",
    label: `Pick ${args.missing} more`,
    detail: args.game ? "Own the next real play" : "Cards are your entry",
  };
}

export function sportsMemoryPulse(args: {
  ready: boolean;
  written: { athlete: string; delta: number; tone: string } | null;
  live: { athlete: string; move: string } | null;
  spark: { athlete: string; move: string; tone: string } | null;
  scored: number;
  total: number;
  tone: string;
}): SportsLiveCockpitMemoryPulse {
  if (args.live) {
    return {
      label: "Now writing",
      detail: `${args.live.athlete} · ${args.live.move}`,
      tone: "live",
    };
  }
  if (args.written) {
    return {
      label: "Just written",
      detail: `${args.written.athlete} ${formatScore(args.written.delta)}`,
      tone: sportsLiveCockpitMemoryPulseTone(args.written.tone),
    };
  }
  if (args.spark) {
    return {
      label: "On deck memory",
      detail: `${args.spark.athlete} · ${args.spark.move}`,
      tone: sportsLiveCockpitMemoryPulseTone(args.spark.tone),
    };
  }
  if (args.scored > 0) {
    return {
      label: "Memory live",
      detail: `${args.scored}/${Math.max(1, args.total)} cards wrote`,
      tone: sportsLiveCockpitMemoryPulseTone(args.tone),
    };
  }
  return {
    label: args.ready ? "Memory armed" : "Pick five",
    detail: args.ready ? "Real plays write memory" : "Cards write memory",
    tone: sportsLiveCockpitMemoryPulseTone(args.tone),
  };
}

export type SportsLineupCardPulse = "afterglow" | "armed" | "hot" | "live" | "pressure" | "sealed";

export function sportsLineupCardPulse(args: {
  currentScore: number;
  lastDelta: number;
  latestAppend: boolean;
  playState: "final" | "live" | "waiting";
  opportunityTone: SportsBestNextOpportunity["tone"];
}): SportsLineupCardPulse {
  if (args.latestAppend && args.lastDelta > 0) return "afterglow";
  if ((args.latestAppend && args.lastDelta < 0) || args.opportunityTone === "loss") return "pressure";
  if (args.currentScore > 0) return "hot";
  if (args.playState === "live" || args.opportunityTone === "live") return "live";
  if (args.playState === "final") return "sealed";
  return "armed";
}

export function clampSportsFieldPct(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sportsBaseRunnerCount(baseStateKey: SportsArenaScoreboard["baseState"]): number {
  if (baseStateKey === "loaded") return 3;
  if (baseStateKey === "runners-on-1st-2nd" || baseStateKey === "runners-on-1st-3rd" || baseStateKey === "runners-on-2nd-3rd") return 2;
  if (baseStateKey === "runner-on-1st" || baseStateKey === "runner-on-2nd" || baseStateKey === "runner-on-3rd") return 1;
  return 0;
}

export function sportsRunnersInScoringPositionCount(baseStateKey: SportsArenaScoreboard["baseState"]): number {
  if (baseStateKey === "loaded" || baseStateKey === "runners-on-2nd-3rd") return 2;
  if (
    baseStateKey === "runner-on-2nd" ||
    baseStateKey === "runner-on-3rd" ||
    baseStateKey === "runners-on-1st-2nd" ||
    baseStateKey === "runners-on-1st-3rd"
  ) return 1;
  return 0;
}

export type SportsParsedCount = { balls: number | null; outs: number | null; strikes: number | null };

export function sportsCountState(count: string): SportsParsedCount {
  const match = count.match(/(\d+)\s*-\s*(\d+)(?:\s*,\s*(\d+)\s*out)?/i);
  return {
    balls: match ? Number.parseInt(match[1] ?? "", 10) : null,
    strikes: match ? Number.parseInt(match[2] ?? "", 10) : null,
    outs: match?.[3] ? Number.parseInt(match[3], 10) : null,
  };
}

export function sportsBaseStateOpportunityLabel(baseStateKey: SportsArenaScoreboard["baseState"]): string {
  if (baseStateKey === "loaded") return "bases loaded";
  if (baseStateKey === "runners-on-2nd-3rd") return "two runners in scoring position";
  if (baseStateKey === "runners-on-1st-3rd") return "runners on the corners";
  if (baseStateKey === "runners-on-1st-2nd") return "two runners aboard";
  if (baseStateKey === "runner-on-3rd") return "runner on third";
  if (baseStateKey === "runner-on-2nd") return "runner in scoring position";
  if (baseStateKey === "runner-on-1st") return "runner aboard";
  return "bases empty";
}

export function sportsBestNextMlbScore(args: {
  baseStateKey: SportsArenaScoreboard["baseState"];
  countState: SportsParsedCount;
  eventType: string;
  inning?: string;
  isOut?: boolean;
  isScoringPlay?: boolean;
  rbi?: number;
  role: "batter" | "pitcher";
}): number {
  return scoreSportsArenaMlbEvent({
    role: args.role,
    eventType: args.eventType,
    balls: args.countState.balls ?? 0,
    strikes: args.countState.strikes ?? 0,
    outs: args.countState.outs ?? 0,
    inning: args.inning ?? null,
    halfInning: null,
    baseStateKey: args.baseStateKey,
    runnerCount: sportsBaseRunnerCount(args.baseStateKey),
    runnersInScoringPosition: sportsRunnersInScoringPositionCount(args.baseStateKey),
    rbi: args.rbi ?? 0,
    isScoringPlay: Boolean(args.isScoringPlay),
    isOut: Boolean(args.isOut),
  }).scoreDelta;
}

export function sportsBestNextOpportunity(args: {
  arenaStatus: SportsArenaFieldState["status"];
  baseStateKey: SportsArenaScoreboard["baseState"];
  card: SportsArenaCard;
  count: string;
  currentScore: number;
  inning: string;
  latestAppend: SportsAppendHistoryRow | null;
  livePlayer: SportsArenaLivePlayer | null;
  playState: "final" | "live" | "waiting";
  projectedScore: number;
  scoringReason: string[];
}): SportsBestNextOpportunity {
  const countState = sportsCountState(args.count);
  const runners = sportsBaseRunnerCount(args.baseStateKey);
  const baseLabel = sportsBaseStateOpportunityLabel(args.baseStateKey);
  const countLabel = countState.balls !== null && countState.strikes !== null
    ? `${countState.balls}-${countState.strikes}`
    : args.count;
  const outsLeverage = countState.outs === 2 ? 1.6 : countState.outs === 1 ? 0.8 : 0;

  if (args.livePlayer?.role === "batter") {
    const rbiPotential = runners + 1;
    const risp = sportsRunnersInScoringPositionCount(args.baseStateKey);
    const homeRunSwing = sportsBestNextMlbScore({
      role: "batter",
      eventType: "home_run",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      rbi: rbiPotential,
      isScoringPlay: true,
    });
    const singleSwing = sportsBestNextMlbScore({
      role: "batter",
      eventType: "single",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      rbi: risp > 0 ? 1 : 0,
      isScoringPlay: risp > 0,
    });
    const doubleSwing = sportsBestNextMlbScore({
      role: "batter",
      eventType: "double",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      rbi: runners > 0 ? Math.min(2, runners) : 0,
      isScoringPlay: runners > 0,
    });
    const walkPath = sportsBestNextMlbScore({
      role: "batter",
      eventType: "walk",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
    });
    const strikeoutCost = sportsBestNextMlbScore({
      role: "batter",
      eventType: "strikeout",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      isOut: true,
    });
    const countPressure = countState.strikes === 2
      ? `2-strike 1B ${formatScore(singleSwing)} / 2B ${formatScore(doubleSwing)} / K ${formatScore(strikeoutCost)}`
      : countState.balls !== null && countState.balls >= 3
        ? `walk path ${formatScore(walkPath)}`
        : `1B ${formatScore(singleSwing)} / 2B ${formatScore(doubleSwing)}`;
    return {
      label: `At bat · HR ${formatScore(homeRunSwing)}`,
      meta: `${countLabel} · ${baseLabel} · ${countPressure}`,
      score: 130 + runners * 14 + (countState.strikes === 2 ? 7 : 0) + (countState.balls !== null && countState.balls >= 3 ? 5 : 0) + outsLeverage + args.card.rating / 25,
      tone: "live",
    };
  }

  if (args.livePlayer?.role === "pitcher") {
    const strikeoutReady = countState.strikes === 2;
    const pitcherStrikeout = sportsBestNextMlbScore({
      role: "pitcher",
      eventType: "strikeout",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      isOut: true,
    });
    const pitcherOut = sportsBestNextMlbScore({
      role: "pitcher",
      eventType: "field_out",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      isOut: true,
    });
    const homeRunAllowed = sportsBestNextMlbScore({
      role: "pitcher",
      eventType: "home_run",
      countState,
      baseStateKey: args.baseStateKey,
      inning: args.inning,
      rbi: runners + 1,
      isScoringPlay: true,
    });
    const runRisk = runners > 0 ? Math.abs(homeRunAllowed) : 0;
    return {
      label: `Pitching · K ${formatScore(pitcherStrikeout)}`,
      meta: `${countLabel} · ${baseLabel} · ${strikeoutReady ? "put-away pitch" : `out ${formatScore(pitcherOut)}`}${runRisk ? ` · risk ${formatScore(-runRisk)}` : ""}`,
      score: 122 + (strikeoutReady ? 12 : 0) + runners * 8 + outsLeverage + args.card.rating / 28,
      tone: "live",
    };
  }

  if (args.livePlayer?.role === "onFirst" || args.livePlayer?.role === "onSecond" || args.livePlayer?.role === "onThird") {
    return {
      label: "On base · watch plate",
      meta: `${args.livePlayer.label} · card scores when batting event records`,
      score: 82 + runners * 5 + args.card.rating / 40,
      tone: "live",
    };
  }

  if (args.playState === "live" && args.arenaStatus === "live" && sportsCardIsPitcher(args.card) && sportsCardIsRosterStarter(args.card)) {
    return {
      label: "Starter off mound",
      meta: `${args.card.teamCode} ${args.card.position} · scores when official MLB state puts him on mound`,
      score: 22 + Math.max(0, args.currentScore),
      tone: "flat",
    };
  }

  if (args.playState === "live" && args.arenaStatus === "live") {
    return {
      label: "Live · waiting turn",
      meta: `${args.card.teamCode} ${args.card.position} · no direct scoring pitch yet`,
      score: 58 + args.projectedScore + args.card.rating / 35,
      tone: "waiting",
    };
  }

  if (args.playState === "final") {
    return {
      label: "Next slate · reload",
      meta: `Tonight sealed at ${formatScore(args.currentScore)}`,
      score: 18 + Math.max(0, args.currentScore),
      tone: "flat",
    };
  }

  return {
    label: "Waiting · game clock",
    meta: `${args.card.teamCode} ${args.card.position} · starts when game goes live`,
    score: 32 + args.projectedScore + args.card.rating / 50,
    tone: "waiting",
  };
}

export function sportsBattedBallDirectionPct(hitLocation: string | null | undefined, playText: string): number {
  const text = `${hitLocation ?? ""} ${playText}`.toLowerCase();
  if (/\bleft fielder\b|\bto left field\b|\bleft-field\b/.test(text)) return 26;
  if (/\bcenter fielder\b|\bto center field\b|\bcenter-field\b|\bup the middle\b/.test(text)) return 50;
  if (/\bright fielder\b|\bto right field\b|\bright-field\b/.test(text)) return 74;

  const locationNumber = Number.parseInt(String(hitLocation ?? ""), 10);
  if (Number.isFinite(locationNumber)) {
    if (locationNumber === 7) return 25;
    if (locationNumber === 8) return 50;
    if (locationNumber === 9) return 75;
    if (locationNumber === 5) return 31;
    if (locationNumber === 6) return 41;
    if (locationNumber === 4) return 59;
    if (locationNumber === 3) return 69;
  }

  if (/\bright[-\s]?center\b/.test(text)) return 64;
  if (/\bleft[-\s]?center\b/.test(text)) return 36;
  if (/\bcenter\b|\bup the middle\b/.test(text)) return 50;
  if (/\bright\b/.test(text)) return 74;
  if (/\bleft\b/.test(text)) return 26;
  if (/\bshortstop\b/.test(text)) return 42;
  if (/\bsecond\b/.test(text)) return 58;
  if (/\bthird\b/.test(text)) return 32;
  if (/\bfirst\b/.test(text)) return 68;
  return 50;
}

export function sportsBattedBallFallbackDistanceFt(hitTrajectory: string | null | undefined, playText: string): number {
  const text = `${hitTrajectory ?? ""} ${playText}`.toLowerCase();
  if (/\bhome run\b|\bhomers\b|\bgrand slam\b/.test(text)) return 405;
  if (/\btriple\b/.test(text)) return 330;
  if (/\bdouble\b/.test(text)) return 255;
  if (/\bfly\b|\bflies\b|\bflied\b|\blineout\b|\bline drive\b/.test(text)) return 300;
  if (/\bpop\b|\bpopup\b/.test(text)) return 115;
  if (/\bground\b|\brolls\b/.test(text)) return 105;
  return 190;
}

export function sportsBattedBallOutfieldRead(hitTrajectory: string | null | undefined, playText: string): boolean {
  const text = `${hitTrajectory ?? ""} ${playText}`.toLowerCase();
  return /\b(?:left|center|right) fielder\b|\bfly\b|\bflies\b|\bflied\b|\blineout\b|\bline drive\b|\bdeep\b|\bwarning track\b/.test(text);
}

export type SportsFieldMomentBurst = {
  kind: "home-run" | "defense" | "double-play" | "strikeout" | "speed" | "run";
  label: string;
  meta: string;
};

function finiteSportsMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function sportsFieldMomentBurst(args: {
  eventType?: string | null;
  isScoringPlay?: boolean | null;
  rbi?: number | null;
  playText: string;
  metrics?: Partial<SportsArenaLiveEventMetrics> | null;
}): SportsFieldMomentBurst | null {
  const text = args.playText.trim();
  if (!text) return null;
  const eventType = (args.eventType ?? "").replace(/-/g, "_").toLowerCase();
  const distanceFt = finiteSportsMetric(args.metrics?.distanceFt);
  const exitVelocityMph = finiteSportsMetric(args.metrics?.exitVelocityMph);
  const pitchSpeedMph = finiteSportsMetric(args.metrics?.pitchSpeedMph);
  const pitchZone = finiteSportsMetric(args.metrics?.pitchZone);
  const battedMeta = distanceFt !== null
    ? `${Math.round(distanceFt)} ft tracked`
    : exitVelocityMph !== null
      ? `${Math.round(exitVelocityMph)} mph exit`
      : "Proof moment";
  const pitchMeta = pitchSpeedMph !== null
    ? `${Math.round(pitchSpeedMph)} mph`
    : pitchZone !== null
      ? `Zone ${Math.round(pitchZone)}`
      : "Strikeout proof";

  if (
    /\b(robbed|robs)\b/i.test(text) ||
    /\b(diving|leaping|sliding|running catch|barehanded|wall|warning track)\b[\s\S]{0,48}\b(catch|grab|snag|rob)\b/i.test(text) ||
    /\b(catch|grab|snag)\b[\s\S]{0,48}\b(diving|leaping|sliding|running|wall|warning track)\b/i.test(text)
  ) {
    return {
      kind: "defense",
      label: /\b(robbed|robs)\b/i.test(text) ? "Robbed" : "Web Gem",
      meta: battedMeta,
    };
  }

  if (/\b(home run|homers|homerun|grand slam)\b/i.test(text)) {
    return {
      kind: "home-run",
      label: /\bgrand slam\b/i.test(text) ? "Grand Slam" : "Home Run",
      meta: distanceFt !== null
        ? `${Math.round(distanceFt)} ft`
        : exitVelocityMph !== null
          ? `${Math.round(exitVelocityMph)} mph exit`
          : "Signal sealed",
    };
  }

  if (/\b(double play|grounds? into a double play|grounded into double play|turns two|twin killing)\b/i.test(text)) {
    return {
      kind: "double-play",
      label: "Double Play",
      meta: "Defense turned",
    };
  }

  if (/\b(strikes out|strikeout|struck out|out on strikes|called out on strikes|called strike three|swinging strike three)\b/i.test(text)) {
    return {
      kind: "strikeout",
      label: /\b(called out on strikes|called strike three|takes strike three)\b/i.test(text) ? "Painted K" : "Put Away",
      meta: pitchMeta,
    };
  }

  if (/\b(steals?|stolen base)\b/i.test(text)) {
    return {
      kind: "speed",
      label: "Stolen Base",
      meta: "Speed proof",
    };
  }

  if (eventType === "triple") return { kind: "speed", label: "Triple", meta: battedMeta };
  if (eventType === "double") return { kind: "speed", label: "Double", meta: battedMeta };
  if (eventType === "single") return { kind: "speed", label: "Single", meta: battedMeta };
  if (eventType === "walk" || eventType === "intent_walk") return { kind: "speed", label: "Walk", meta: "Plate proof" };
  if (eventType === "hit_by_pitch") return { kind: "speed", label: "HBP", meta: "Plate proof" };
  if (eventType === "runner_advance") return { kind: "speed", label: "Runner Advance", meta: "Basepath proof" };
  if (eventType === "field_out" || eventType === "force_out" || eventType === "groundout" || eventType === "flyout" || eventType === "lineout") return { kind: "defense", label: "Out Recorded", meta: "Defense proof" };

  if (eventType === "run_scored" || (args.isScoringPlay === true && (args.rbi ?? 0) > 0 && /\b(scores?|scored)\b/i.test(text))) {
    return {
      kind: "run",
      label: "Run Scored",
      meta: "Card memory",
    };
  }

  return null;
}

export function sportsAppendBurst(append: {
  detail: string;
  eventType?: string | null;
  isScoringPlay?: boolean | null;
  metrics?: Partial<SportsArenaLiveEventMetrics> | null;
  rbi?: number | null;
  scoreDelta: number;
  value: string;
} | null): SportsFieldMomentBurst | null {
  if (!append || Math.abs(append.scoreDelta) < 0.01) return null;
  return sportsFieldMomentBurst({
    eventType: append.eventType,
    isScoringPlay: append.isScoringPlay,
    metrics: append.metrics,
    playText: `${append.value} ${append.detail}`,
    rbi: append.rbi,
  });
}

export function sportsLatestAppendForBurst<T extends { appendHash?: string | null; createdAtMs?: number }>(
  appends: readonly (T | null | undefined)[],
  options: { maxAgeMs?: number; nowMs?: number } = {},
): T | null {
  const maxAgeMs = typeof options.maxAgeMs === "number" && Number.isFinite(options.maxAgeMs) && options.maxAgeMs >= 0
    ? options.maxAgeMs
    : null;
  const nowMs = typeof options.nowMs === "number" && Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  let latest: T | null = null;
  for (const append of appends) {
    if (!append) continue;
    if (maxAgeMs !== null) {
      const createdAtMs = typeof append.createdAtMs === "number" && Number.isFinite(append.createdAtMs)
        ? append.createdAtMs
        : null;
      if (createdAtMs === null || nowMs - createdAtMs > maxAgeMs) continue;
    }
    if (!latest) {
      latest = append;
      continue;
    }
    const createdAtDelta = (append.createdAtMs ?? 0) - (latest.createdAtMs ?? 0);
    if (createdAtDelta > 0 || (
      createdAtDelta === 0 &&
      (append.appendHash ?? "").localeCompare(latest.appendHash ?? "") < 0
    )) {
      latest = append;
    }
  }
  return latest;
}

export function sportsBattedBallTraceProjection(args: {
  coordinateX: number | null;
  coordinateY: number | null;
  distanceFt: number | null;
  hitLocation?: string | null;
  hitTrajectory?: string | null;
  launchAngleDeg: number | null;
  playText: string;
}): { angleDeg: number; endX: number; endY: number; lengthPct: number; startX: number; startY: number } {
  const startX = SPORTS_BATTED_BALL_HOME_X_PCT;
  const startY = SPORTS_BATTED_BALL_HOME_Y_PCT;
  const directionPct = sportsBattedBallDirectionPct(args.hitLocation, args.playText);
  const projectedDistance = args.distanceFt ?? sportsBattedBallFallbackDistanceFt(args.hitTrajectory, args.playText);
  const carryRatio = clampSportsFieldPct(projectedDistance / 430, 0.08, 1);
  const launchLift = args.launchAngleDeg !== null ? clampSportsFieldPct((args.launchAngleDeg - 12) / 5, -6, 9) : 0;
  const outfieldRead = sportsBattedBallOutfieldRead(args.hitTrajectory, args.playText);
  const textEndX = clampSportsFieldPct(startX + (directionPct - startX) * (0.5 + carryRatio * 0.42), 10, 90);
  const distanceEndY = clampSportsFieldPct(startY - 86 * carryRatio - launchLift * 0.72, 44, 130);

  if (args.coordinateX !== null && args.coordinateY !== null) {
    const rawX = clampSportsFieldPct(
      startX + ((args.coordinateX - MLB_HIT_COORDINATE_CENTER_X) / MLB_HIT_COORDINATE_CENTER_X) * 42,
      8,
      92,
    );
    const rawY = clampSportsFieldPct(38 + (args.coordinateY / 250) * 90, 42, 130);
    const directionDelta = directionPct - startX;
    const rawDelta = rawX - startX;
    const directionCorrectedX = Math.abs(directionDelta) > 12 && Math.abs(rawDelta) > 8 && Math.sign(directionDelta) !== Math.sign(rawDelta)
      ? 100 - rawX
      : rawX;
    const endX = outfieldRead && projectedDistance >= 180
      ? directionCorrectedX * 0.35 + textEndX * 0.65
      : directionCorrectedX;
    const endY = outfieldRead && projectedDistance >= 180
      ? Math.min(rawY, distanceEndY)
      : projectedDistance >= 260
        ? Math.min(rawY, distanceEndY + 4)
        : rawY;
    const dx = endX - startX;
    const dy = endY - startY;
    return {
      angleDeg: Math.atan2(dy, dx) * (180 / Math.PI),
      endX,
      endY,
      lengthPct: clampSportsFieldPct(Math.hypot(dx, dy), 8, 82),
      startX,
      startY,
    };
  }

  const directionSpread = 0.46 + carryRatio * 0.48;
  const endX = clampSportsFieldPct(startX + (directionPct - startX) * directionSpread, 10, 90);
  const endY = clampSportsFieldPct(startY - 86 * carryRatio - launchLift * 0.72, 44, 130);
  const dx = endX - startX;
  const dy = endY - startY;
  return {
    angleDeg: Math.atan2(dy, dx) * (180 / Math.PI),
    endX,
    endY,
    lengthPct: clampSportsFieldPct(Math.hypot(dx, dy), 8, 82),
    startX,
    startY,
  };
}
