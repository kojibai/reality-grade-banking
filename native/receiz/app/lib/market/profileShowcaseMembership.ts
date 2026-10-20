"use client";

import type { MarketDeskPublicOriginalAsset } from "@/app/lib/market/types";
import { parseProfileUsername } from "@/app/lib/profile/username";
import {
  createProfileShowcaseBoundedEdgeVault,
  type ProfileShowcaseBoundedEdgeVault,
} from "@/app/lib/profile/showcase/boundedEdgeVault";
import type {
  EconomyShowcaseProfileAdmission,
  VerifiedEconomyShowcase,
} from "@/app/lib/economy/showcase/types";
import { projectOwnerShowcaseOriginals } from "@/app/lib/profile/showcase/ownerSourceProjection";
import { jcsCanonicalize } from "@/app/utils/jcs";

export type VerifiedMarketProfileMembership = ReadonlyMap<
  string,
  ReadonlyMap<string, string>
>;

function usernameFromProfile(
  profile: EconomyShowcaseProfileAdmission,
): string | null {
  const identity = profile.artifactId.slice("profile-showcase:".length);
  const suffix = ".receiz.id";
  return identity.endsWith(suffix)
    ? parseProfileUsername(identity.slice(0, -suffix.length))
    : null;
}

export async function recoverVerifiedMarketProfileMembership(input: Readonly<{
  economy: VerifiedEconomyShowcase;
  boundedVault?: ProfileShowcaseBoundedEdgeVault;
}>): Promise<VerifiedMarketProfileMembership | null> {
  const boundedVault =
    input.boundedVault ?? createProfileShowcaseBoundedEdgeVault();
  const membership = new Map<string, ReadonlyMap<string, string>>();
  for (const profile of input.economy.profileShowcases) {
    const username = usernameFromProfile(profile);
    if (!username) return null;
    const firstPaint = await boundedVault.readCompleteSource(profile.artifactId);
    if (
      !firstPaint
      || firstPaint.artifactDigest !== profile.artifactDigest
      || firstPaint.carrier.receizProofHistory.headDigest
        !== profile.historyHeadDigest
    ) return null;
    const originals = new Map<string, string>();
    for (const original of projectOwnerShowcaseOriginals(firstPaint, { publicOnly: true })) {
      if (!original.id.trim() || original.showOnProfile !== true) return null;
      originals.set(original.id.trim(), jcsCanonicalize(original));
    }
    membership.set(username, originals);
  }
  return membership;
}

export function marketOriginalHasExactProfileMembership(input: Readonly<{
  original: MarketDeskPublicOriginalAsset;
  membership: VerifiedMarketProfileMembership;
}>): boolean {
  const username = parseProfileUsername(input.original.ownerUsername);
  const exact = input.original.profileOriginal;
  if (!username || !exact || exact.showOnProfile !== true) return false;
  const admitted = input.membership.get(username)?.get(
    input.original.receizId.trim(),
  );
  return Boolean(admitted && admitted === jcsCanonicalize(exact));
}
