"use client";

import type { ProfileViewData } from "@/app/lib/profile/types";
import { isLocalProfileTruthRoot, LOCAL_PROFILE_TRUTH_TIMESTAMP } from "@/app/lib/profile/localProfileTruth";
import { stableProfileCreationCreatedAt } from "@/app/lib/profile/profileCreationSeed";

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function timestampMs(value: string | null | undefined): number {
  const trimmed = text(value);
  if (!trimmed || trimmed === LOCAL_PROFILE_TRUTH_TIMESTAMP) return 0;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function nonPlaceholderTimestamp(nextValue: string, prevValue: string): string {
  return timestampMs(nextValue) > 0 ? nextValue : timestampMs(prevValue) > 0 ? prevValue : nextValue;
}

function sameProfileAuthority(prev: ProfileViewData, next: ProfileViewData): boolean {
  const prevUserId = text(prev.profile.userId);
  const nextUserId = text(next.profile.userId);
  if (prevUserId && nextUserId) return prevUserId === nextUserId;

  const prevUsername = text(prev.profile.username).toLowerCase();
  const nextUsername = text(next.profile.username).toLowerCase();
  return Boolean(prevUsername && nextUsername && prevUsername === nextUsername);
}

function preserveAcceptedPbiIdentity(
  prev: ProfileViewData,
  next: ProfileViewData,
): ProfileViewData {
  if (next.profile.authorshipVerified || !prev.profile.authorshipVerified) return next;

  return {
    ...next,
    profile: {
      ...next.profile,
      authorshipVerified: true,
      authorshipPbiReceiptHash: prev.profile.authorshipPbiReceiptHash,
    },
  };
}

export function profileIdentityAuthorityScore(profile: ProfileViewData): number {
  const identity = profile.profile;
  let score = 0;
  if (!isLocalProfileTruthRoot(profile)) score += 40;
  if (text(identity.userId)) score += 30;
  if (text(identity.username)) score += 24;
  if (text(identity.displayName) && text(identity.displayName).toLowerCase() !== text(identity.username).toLowerCase()) {
    score += 18;
  } else if (text(identity.displayName)) {
    score += 6;
  }
  if (text(identity.avatarUrl)) score += 12;
  if (text(identity.bannerUrl)) score += 12;
  if (text(identity.bio)) score += 4;
  if (text(identity.location)) score += 2;
  if (text(identity.websiteUrl)) score += 2;
  if (text(identity.socialXUrl)) score += 1;
  if (text(identity.socialInstagramUrl)) score += 1;
  if (text(identity.socialYoutubeUrl)) score += 1;
  if (text(identity.socialLinkedinUrl)) score += 1;
  if (text(identity.socialGithubUrl)) score += 1;
  if (timestampMs(identity.updatedAt) > 0) score += 8;
  return score;
}

export function mergeProfilePreservingStrongerIdentity(
  prev: ProfileViewData,
  next: ProfileViewData,
): ProfileViewData {
  if (!sameProfileAuthority(prev, next)) return next;
  const createdAt = stableProfileCreationCreatedAt(prev.profile.createdAt, next.profile.createdAt);
  const withStableCreatedAt = (profile: ProfileViewData): ProfileViewData =>
    !createdAt || profile.profile.createdAt === createdAt
      ? profile
      : {
          ...profile,
          profile: {
            ...profile.profile,
            createdAt,
          },
        };

  const prevScore = profileIdentityAuthorityScore(prev);
  const nextScore = profileIdentityAuthorityScore(next);
  if (nextScore >= prevScore) {
    return preserveAcceptedPbiIdentity(prev, withStableCreatedAt(next));
  }

  const prevIdentity = prev.profile;
  const nextIdentity = next.profile;
  const nextIsLocalRoot = isLocalProfileTruthRoot(next);

  return preserveAcceptedPbiIdentity(prev, {
    ...next,
    profile: {
      ...nextIdentity,
      userId: text(nextIdentity.userId) || prevIdentity.userId,
      username: nextIsLocalRoot ? text(prevIdentity.username) || nextIdentity.username : text(nextIdentity.username) || prevIdentity.username,
      displayName:
        nextIsLocalRoot
          ? text(prevIdentity.displayName) || nextIdentity.displayName || prevIdentity.username
          : text(nextIdentity.displayName) || prevIdentity.displayName || nextIdentity.username,
      bio: nextIdentity.bio ?? prevIdentity.bio,
      location: nextIdentity.location ?? prevIdentity.location,
      websiteUrl: nextIdentity.websiteUrl ?? prevIdentity.websiteUrl,
      socialXUrl: nextIdentity.socialXUrl ?? prevIdentity.socialXUrl,
      socialInstagramUrl: nextIdentity.socialInstagramUrl ?? prevIdentity.socialInstagramUrl,
      socialYoutubeUrl: nextIdentity.socialYoutubeUrl ?? prevIdentity.socialYoutubeUrl,
      socialLinkedinUrl: nextIdentity.socialLinkedinUrl ?? prevIdentity.socialLinkedinUrl,
      socialGithubUrl: nextIdentity.socialGithubUrl ?? prevIdentity.socialGithubUrl,
      avatarUrl: nextIdentity.avatarUrl ?? prevIdentity.avatarUrl,
      bannerUrl: nextIdentity.bannerUrl ?? prevIdentity.bannerUrl,
      createdAt,
      updatedAt: nonPlaceholderTimestamp(nextIdentity.updatedAt, prevIdentity.updatedAt),
      guidedSetupCompletedAt: nextIdentity.guidedSetupCompletedAt ?? prevIdentity.guidedSetupCompletedAt,
      lastSealedAt: nextIdentity.lastSealedAt ?? prevIdentity.lastSealedAt,
      lastSealedPulse: nextIdentity.lastSealedPulse ?? prevIdentity.lastSealedPulse,
      authorshipVerified: nextIdentity.authorshipVerified || prevIdentity.authorshipVerified,
      authorshipPbiReceiptHash:
        nextIdentity.authorshipPbiReceiptHash ?? prevIdentity.authorshipPbiReceiptHash,
      creationSigilBalancePhiMicro:
        nextIdentity.creationSigilBalancePhiMicro ?? prevIdentity.creationSigilBalancePhiMicro,
      creationSigilBalanceUsd: nextIdentity.creationSigilBalanceUsd ?? prevIdentity.creationSigilBalanceUsd,
    },
  });
}
