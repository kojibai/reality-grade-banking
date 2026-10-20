import type { ProfileOriginal, ProfileViewData } from "@/app/lib/profile/types";
import type { WholeMarketPublicOwnerProof } from "@/app/lib/market/wholeMarketPublicProofProjection";
import { projectProfileOriginalsFromWholeMarketOwnerProof } from "@/app/lib/market/wholeMarketPublicProofProjection";
import { visibleShowcaseOriginalsFromOriginals, resolveProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import { originalHasSignedArtifactState } from "@/app/lib/profile/pbiSignatureHistory";
import { parseProfileUsername } from "@/app/lib/profile/username";

/** Existing deterministic public projection, independent of browser/session
 * hydration. Source admission remains with its existing enclosing primitive. */
export const PROFILE_ROUTE_PLACEHOLDER_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export type ProfileRouteHydrationSeedInput = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type ProfileRouteDeterministicSnapshotInput = {
  userId?: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  originals: ProfileOriginal[];
  originalsPage: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  profileAuthorshipVerified?: boolean;
  viewerEmail?: string | null;
};

export type ProfileRouteSnapshot = {
  profile: ProfileViewData;
  viewerEmail: string | null;
  currentPublicMembership?: ProfileCurrentPublicMembership | null;
  /** Subordinate capture coordinate; a different accepted Source expires it. */
  publicInventorySourceDigest?: string | null;
  publicInventoryRevision?: string | null;
};

export type ProfileCurrentPublicMembership = {
  scope: "whole-market-visible-showcase";
  source: "canonical-complete";
  isComplete: true;
  revision: string;
  generatedAt: string;
  economyShowcaseArtifactDigest?: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
};

export function buildSeedProfile(input: ProfileRouteHydrationSeedInput): ProfileViewData {
  const username = parseProfileUsername(input.username) ?? "";

  return {
    profile: {
      userId: "",
      username,
      displayName: input.displayName.trim() || username,
      bio: null,
      location: null,
      websiteUrl: null,
      socialXUrl: null,
      socialInstagramUrl: null,
      socialYoutubeUrl: null,
      socialLinkedinUrl: null,
      socialGithubUrl: null,
      avatarUrl: input.avatarUrl ?? null,
      bannerUrl: null,
      isPrivate: false,
      showSchedulerButton: false,
      createdAt: PROFILE_ROUTE_PLACEHOLDER_TIMESTAMP,
      updatedAt: PROFILE_ROUTE_PLACEHOLDER_TIMESTAMP,
      lastSealedAt: null,
      lastSealedPulse: null,
      authorshipVerified: false,
      creationSigilBalancePhiMicro: null,
      creationSigilBalanceUsd: null,
    },
    viewer: {
      isSignedIn: false,
      isOwner: false,
      canEdit: false,
      canView: true,
      isFollowing: false,
      followsYou: false,
      connection: "none",
    },
    stats: {
      followers: 0,
      following: 0,
      originals: 0,
      signedOriginals: 0,
      hiddenOriginals: 0,
      originalViews: 0,
      streams: 0,
      streamCompletionRatePct: 0,
      witnessedSeconds: 0,
    },
    feedExperimentAnalytics: null,
    glyphValuationRollup: null,
    followers: [],
    following: [],
    originals: [],
    originalsPage: {
      pageSize: 24,
      hasMore: false,
      nextCursor: null,
    },
  };
}

export function buildProfileRouteDeterministicSnapshot(input: ProfileRouteDeterministicSnapshotInput): ProfileViewData | null {
  const username = parseProfileUsername(input.username);
  if (!username) return null;

  const canonicalOriginals = visibleShowcaseOriginalsFromOriginals(input.originals);

  const baseProfile = buildSeedProfile({
    username,
    displayName: input.displayName?.trim() || username,
    avatarUrl: input.avatarUrl,
  });

  const originalsPage = {
    pageSize: Math.max(input.originalsPage.pageSize, canonicalOriginals.length, 1),
    hasMore: input.originalsPage.hasMore,
    nextCursor: input.originalsPage.hasMore ? input.originalsPage.nextCursor : null,
  };

  const profile: ProfileViewData = {
    ...baseProfile,
    profile: {
      ...baseProfile.profile,
      userId: input.userId?.trim() || baseProfile.profile.userId,
      authorshipVerified: input.profileAuthorshipVerified === true,
    },
    viewer: {
      isSignedIn: false,
      isOwner: false,
      canEdit: false,
      canView: true,
      isFollowing: false,
      followsYou: false,
      connection: "none",
    },
    stats: {
      ...baseProfile.stats,
      originals: canonicalOriginals.length,
      signedOriginals: canonicalOriginals.filter((original) =>
        originalHasSignedArtifactState(original)
      ).length,
      hiddenOriginals: 0,
    },
    originals: canonicalOriginals,
    originalsPage,
  };

  const manifestInput = originalsPage.hasMore
    ? {
        ...profile,
        stats: {
          ...profile.stats,
          originals: canonicalOriginals.length + 1,
        },
      }
    : profile;

  return {
    ...profile,
    deterministicManifest: resolveProfileDeterministicManifest(manifestInput),
  };
}

export function profileRouteSnapshotFromWholeMarketPublicProof(
  owner: WholeMarketPublicOwnerProof,
): ProfileRouteSnapshot | null {
  if (!owner.isCurrentMember) return null;

  const profile = buildProfileRouteDeterministicSnapshot({
    userId: owner.ownerUserId,
    username: owner.username,
    displayName: owner.displayName,
    avatarUrl: owner.avatarUrl,
    isOwner: false,
    originals: projectProfileOriginalsFromWholeMarketOwnerProof(owner),
    originalsPage: {
      pageSize: Math.max(owner.originals.length, 1),
      hasMore: false,
      nextCursor: null,
    },
    profileAuthorshipVerified: false,
    viewerEmail: null,
  });

  return profile
    ? {
        profile,
        viewerEmail: null,
        currentPublicMembership: {
          scope: "whole-market-visible-showcase",
          source: "canonical-complete",
          isComplete: true,
          revision: owner.membershipRevision,
          generatedAt: owner.membershipGeneratedAt,
          economyShowcaseArtifactDigest:
            owner.economyShowcaseArtifactDigest,
          economyShowcaseParentArtifactDigests:
            owner.economyShowcaseParentArtifactDigests,
        },
      }
    : null;
}
