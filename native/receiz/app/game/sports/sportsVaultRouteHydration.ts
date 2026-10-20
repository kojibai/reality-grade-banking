import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import type { SportsVaultExplorerPayload } from "./vault/[vaultCardId]/SportsVaultExplorer";

export const SPORTS_VAULT_ROUTE_FAST_ENTRY_COOKIE = "receiz_sports_vault_fast_entry";

const SPORTS_VAULT_ROUTE_SNAPSHOT_KEY_PREFIX = "receiz.sports.vault.route.snapshot.v1";
const SPORTS_VAULT_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS = 20;
const HEX64_RE = /^[0-9a-f]{64}$/i;

type SportsVaultRouteSnapshotStored = {
  version: 1;
  createdAtMs: number;
  payload: SportsVaultExplorerPayload;
};

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function sportsVaultRouteSnapshotKey(vaultCardId: string): string {
  return `${SPORTS_VAULT_ROUTE_SNAPSHOT_KEY_PREFIX}:${vaultCardId}`;
}

function sportsVaultRouteCookieSecureSuffix(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCompactSeed(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.schema === "receiz.sports_vault.explorer_items.compact.v1" &&
    Array.isArray(value.rows) &&
    Array.isArray(value.proofRules) &&
    Array.isArray(value.detailItems) &&
    Array.isArray(value.listings) &&
    (value.rowText === undefined || value.rowText === null || typeof value.rowText === "string");
}

function isSportsVaultExplorerPayload(value: unknown, expectedVaultCardId?: string): value is SportsVaultExplorerPayload {
  if (!isRecord(value) || !isRecord(value.owner)) return false;
  if (typeof value.vaultCardId !== "string" || !HEX64_RE.test(value.vaultCardId)) return false;
  if (expectedVaultCardId && value.vaultCardId !== expectedVaultCardId) return false;
  if (typeof value.archiveSha256Hex !== "string" || !HEX64_RE.test(value.archiveSha256Hex)) return false;
  if (typeof value.merkleRootSha256 !== "string" || !HEX64_RE.test(value.merkleRootSha256)) return false;
  if (typeof value.cardCount !== "number" || !Number.isFinite(value.cardCount) || value.cardCount < 0) return false;
  if (typeof value.createdAtMs !== "number" || !Number.isFinite(value.createdAtMs)) return false;
  if (!Array.isArray(value.items)) return false;
  if (value.compactItems !== null && value.compactItems !== undefined && !isCompactSeed(value.compactItems)) return false;
  return typeof value.owner.userId === "string" &&
    typeof value.owner.label === "string" &&
    (value.owner.username === null || typeof value.owner.username === "string") &&
    (value.owner.displayName === null || typeof value.owner.displayName === "string");
}

function parseSportsVaultRouteSnapshot(raw: string, expectedVaultCardId?: string): SportsVaultRouteSnapshotStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SportsVaultRouteSnapshotStored>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.createdAtMs !== "number" || !Number.isFinite(parsed.createdAtMs)) return null;
    if (!isSportsVaultExplorerPayload(parsed.payload, expectedVaultCardId)) return null;
    return parsed as SportsVaultRouteSnapshotStored;
  } catch {
    return null;
  }
}

function writeSportsVaultRouteFastEntryCookie(vaultCardId: string): void {
  if (typeof document === "undefined") return;
  const secure = sportsVaultRouteCookieSecureSuffix();
  document.cookie = `${SPORTS_VAULT_ROUTE_FAST_ENTRY_COOKIE}=${encodeURIComponent(vaultCardId)}; Path=/game/sports; Max-Age=${SPORTS_VAULT_ROUTE_FAST_ENTRY_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearSportsVaultRouteFastEntryHint(): void {
  if (typeof document === "undefined") return;
  const secure = sportsVaultRouteCookieSecureSuffix();
  document.cookie = `${SPORTS_VAULT_ROUTE_FAST_ENTRY_COOKIE}=; Path=/game/sports; Max-Age=0; SameSite=Lax${secure}`;
}

export function writeSportsVaultRouteSnapshot(payload: SportsVaultExplorerPayload): boolean {
  if (!isSportsVaultExplorerPayload(payload)) return false;
  const stored: SportsVaultRouteSnapshotStored = {
    version: 1,
    createdAtMs: Date.now(),
    payload,
  };
  const serialized = JSON.stringify(stored);
  const key = sportsVaultRouteSnapshotKey(payload.vaultCardId);

  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(key, serialized);
    } catch {
      // Durable local truth below is the stronger route handoff.
    }
  }

  writeDurableLocalTruthItem(key, serialized, {
    source: "sports-vault-route-handoff",
    rank: DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot + Math.min(payload.cardCount, 200),
    allowSameRankOverwrite: true,
  });
  writeSportsVaultRouteFastEntryCookie(payload.vaultCardId);
  return true;
}

export function peekSportsVaultRouteSnapshot(vaultCardId: string): SportsVaultExplorerPayload | null {
  const clean = vaultCardId.trim().toLowerCase();
  if (!HEX64_RE.test(clean)) return null;
  const key = sportsVaultRouteSnapshotKey(clean);

  if (hasSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const parsed = parseSportsVaultRouteSnapshot(raw, clean);
        if (parsed) return parsed.payload;
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Fall through to durable local truth.
    }
  }

  const durableRaw = readDurableLocalTruthItem(key);
  if (!durableRaw) return null;
  const parsed = parseSportsVaultRouteSnapshot(durableRaw, clean);
  if (!parsed) {
    removeDurableLocalTruthItem(key, { source: "sports-vault-route-handoff" });
    return null;
  }
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(key, durableRaw);
    } catch {
      // Ignore mirror failures.
    }
  }
  return parsed.payload;
}
