import type { VerifiedEconomyShowcase } from "../economy/showcase/types";
import type { ProfileShowcaseCompleteSource } from "../profile/showcase/boundedEdgeVault";
import type { ProfileOriginal } from "../profile/types";
import type { MarketDeskPublicOriginalAsset } from "./types";

export type EconomyMarketOwnerDecoration = Readonly<{
  userId: string; username: string; displayName: string; avatarUrl: string | null;
}>;
export type EconomyMarketSourceRecovery =
  | Readonly<{ status: "restored"; originals: MarketDeskPublicOriginalAsset[] }>
  | Readonly<{ status: "unavailable"; code: string }>;

/** Called with verified economy custody. Identity decorates; complete source owns membership. */
export async function recoverEconomyMarketOriginals(economy: VerifiedEconomyShowcase, dependencies: Readonly<{
  readCompleteSource(artifactId: `profile-showcase:${string}`): Promise<ProfileShowcaseCompleteSource | null>;
  projectOriginals(source: ProfileShowcaseCompleteSource): readonly ProfileOriginal[];
  readOwner(username: string): EconomyMarketOwnerDecoration | null;
  projectMarketOriginal(input: {original: ProfileOriginal; ownerUserId: string; ownerUsername: string; ownerDisplayName: string}): MarketDeskPublicOriginalAsset | null;
}>): Promise<EconomyMarketSourceRecovery> {
  const originals: MarketDeskPublicOriginalAsset[] = [];
  const unavailable = (code: string) => ({status: "unavailable" as const, code});
  for (const profile of economy.profileShowcases) {
    const identity = profile.artifactId.slice("profile-showcase:".length);
    if (!identity.endsWith(".receiz.id")) return unavailable("ECONOMY_MARKET_OWNER_BINDING_REQUIRED");
    const username = identity.slice(0, -".receiz.id".length);
    const source = await dependencies.readCompleteSource(profile.artifactId);
    if (!source || source.carrier.artifactId !== profile.artifactId
      || source.carrier.ownerReceizIdentity !== identity
      || source.artifactDigest !== profile.artifactDigest
      || source.carrier.receizProofHistory.headDigest !== profile.historyHeadDigest) {
      return unavailable("ECONOMY_MARKET_COMPLETE_SOURCE_REQUIRED");
    }
    const publicOriginals = dependencies.projectOriginals(source);
    if (!publicOriginals.length) continue;
    const owner = dependencies.readOwner(username);
    if (!owner || owner.username !== username || !owner.userId.trim() || !owner.displayName.trim()) {
      return unavailable("ECONOMY_MARKET_OWNER_DECORATION_REQUIRED");
    }
    for (const original of publicOriginals) {
      const projected = dependencies.projectMarketOriginal({original, ownerUserId: owner.userId,
        ownerUsername: username, ownerDisplayName: owner.displayName});
      if (!projected) return unavailable("ECONOMY_MARKET_ORIGINAL_PROJECTION_REQUIRED");
      originals.push({...projected, ownerAvatarUrl: owner.avatarUrl, profileOriginal: original});
    }
  }
  return {status: "restored", originals};
}
