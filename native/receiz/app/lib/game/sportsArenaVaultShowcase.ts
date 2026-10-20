import type { SportsArenaSlug } from "@/app/lib/game/sportsArena";
import { usernameFromEmailDefault } from "@/app/lib/profile/username";
import { canonicalSha256Hex } from "@/app/lib/vault/crypto";

export type SportsArenaVaultShowcaseSport = Extract<SportsArenaSlug, "baseball" | "soccer" | "fight">;
export type SportsArenaVaultPublicSportPath = "sports" | "baseball" | "soccer" | "ufc";

const SPORTS_ARENA_LIVE_VAULT_ID_SCHEMA = "receiz.sports_arena.live_vault_id.v1";
const SPORTS_ARENA_PUBLIC_USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function sportsArenaVaultShowcaseSport(value: SportsArenaSlug | string | null | undefined): SportsArenaVaultShowcaseSport {
  if (value === "soccer" || value === "fight") return value;
  return "baseball";
}

export function sportsArenaVaultSportFromPublicPath(value: string | null | undefined): SportsArenaVaultShowcaseSport | null {
  const clean = String(value ?? "").trim().toLowerCase();
  if (clean === "sports" || clean === "baseball" || clean === "mlb") return "baseball";
  if (clean === "soccer" || clean === "fifa" || clean === "world-cup" || clean === "worldcup") return "soccer";
  if (clean === "ufc" || clean === "fight") return "fight";
  return null;
}

export function sportsArenaVaultPublicSportPath(sport: SportsArenaSlug | string): SportsArenaVaultPublicSportPath {
  const routeSport = sportsArenaVaultShowcaseSport(sport);
  if (routeSport === "baseball") return "sports";
  if (routeSport === "fight") return "ufc";
  return routeSport;
}

export function cleanSportsArenaVaultPublicUsername(value: string | null | undefined): string | null {
  const clean = String(value ?? "").trim().toLowerCase();
  return SPORTS_ARENA_PUBLIC_USERNAME_RE.test(clean) ? clean : null;
}

export function sportsArenaVaultEffectivePublicUsername(args: {
  ownerEmail?: string | null;
  ownerUserId?: string | null;
  ownerUsername?: string | null;
}): string | null {
  const savedUsername = cleanSportsArenaVaultPublicUsername(args.ownerUsername);
  if (savedUsername) return savedUsername;

  const ownerEmail = String(args.ownerEmail ?? "").trim().toLowerCase();
  const ownerUserId = String(args.ownerUserId ?? "").trim();
  if (!ownerEmail || !ownerUserId) return null;
  return cleanSportsArenaVaultPublicUsername(usernameFromEmailDefault(ownerEmail, ownerUserId));
}

export async function sportsArenaLiveVaultCardId(ownerUserId: string, sport: SportsArenaSlug | string): Promise<string> {
  const owner = ownerUserId.trim().toLowerCase();
  const routeSport = sportsArenaVaultShowcaseSport(sport);
  return canonicalSha256Hex({
    schema: SPORTS_ARENA_LIVE_VAULT_ID_SCHEMA,
    ownerUserId: owner,
    sport: routeSport,
  });
}

export function sportsArenaLiveVaultPath(vaultCardId: string, sport: SportsArenaSlug | string): string {
  const routeSport = sportsArenaVaultShowcaseSport(sport);
  return `/game/sports/${routeSport}/vault/${vaultCardId}`;
}

export function sportsArenaLiveVaultPublicPath(
  ownerUsername: string | null | undefined,
  sport: SportsArenaSlug | string,
  ownerEmail?: string | null,
  ownerUserId?: string | null,
): string | null {
  const username = sportsArenaVaultEffectivePublicUsername({ ownerEmail, ownerUserId, ownerUsername });
  if (!username) return null;
  return `/vault/${sportsArenaVaultPublicSportPath(sport)}/${encodeURIComponent(username)}`;
}
