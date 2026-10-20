import { normalizePlan as normalizePremiumPlan, type Plan } from "@/app/lib/premium/plan";
import { peekSelectedReceizAccountSource } from "@/app/lib/auth/receizSelectedAccountSource";
import { accountIdentityCreationFromPortableSource } from "./profileIdentityCreationCoordinate";
import { peekProfileIdentityGenesis } from "@/app/lib/profile/profileIdentityGenesis";
import type { ProfileViewData } from "@/app/lib/profile/types";
import { buildProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import { parseProfileUsername, usernameFromEmailDefault } from "@/app/lib/profile/username";
import { type SessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import type { WorldBootstrapView, WorldProfileSummary } from "@/app/lib/world/types";

export const LOCAL_PROFILE_TRUTH_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function normalizePlan(value: Plan | null | undefined): Plan {
  return normalizePremiumPlan(value);
}

function displayNameFromSession(session: SessionBootstrapSnapshot, username: string): string {
  const usernameLabel = session.username.trim();
  if (usernameLabel) return usernameLabel;
  const emailLocal = session.email?.split("@")[0]?.trim();
  if (emailLocal) return emailLocal;
  return username || "Receiz ID";
}

export function localProfileUsernameFromSession(
  session: SessionBootstrapSnapshot | null | undefined,
): string | null {
  if (!session?.signedIn || !session.uid) return null;
  return parseProfileUsername(session.username) ?? usernameFromEmailDefault(session.email ?? "", session.uid);
}

export function buildLocalProfileViewFromSession(
  session: SessionBootstrapSnapshot | null | undefined,
): ProfileViewData | null {
  if (!session?.signedIn || !session.uid) return null;
  const username = localProfileUsernameFromSession(session);
  if (!username) return null;
  const displayName = displayNameFromSession(session, username);
  const storedGenesis = peekProfileIdentityGenesis(session.uid);
  const source = peekSelectedReceizAccountSource(session.uid);
  const accountCreation = source ? accountIdentityCreationFromPortableSource({
    ownerUserId: source.owner.uid, profileUserId: session.uid, snapshot: source.portableState?.snapshot,
    includeOriginalDeviceAccount: !storedGenesis,
  }) : null;
  const createdAt = accountCreation?.createdAt ?? storedGenesis?.createdAt ?? LOCAL_PROFILE_TRUTH_TIMESTAMP;
  const creationKaiMicroPulse = accountCreation?.creationKaiMicroPulse ?? storedGenesis?.creationKaiMicroPulse ?? null;
  // Identity Seal and Identity Record remain identity artifacts. They become
  // showcase proof objects only through an admitted publication append; local
  // session projection must never fabricate owner-only Profile Originals.
  const originals: ProfileViewData["originals"] = [];

  const profile: ProfileViewData = {
    profile: {
      userId: session.uid,
      username,
      displayName,
      bio: null,
      location: null,
      websiteUrl: null,
      socialXUrl: null,
      socialInstagramUrl: null,
      socialYoutubeUrl: null,
      socialLinkedinUrl: null,
      socialGithubUrl: null,
      avatarUrl: null,
      bannerUrl: null,
      isPrivate: false,
      showSchedulerButton: false,
      guidedSetupCompletedAt: null,
      creationKaiMicroPulse,
      creationKaiSource: accountCreation?.creationKaiSource ?? null,
      createdAt,
      updatedAt: LOCAL_PROFILE_TRUTH_TIMESTAMP,
      lastSealedAt: originals.length > 0 ? createdAt : null,
      lastSealedPulse: originals[0]?.pulse ?? null,
      authorshipVerified: false,
      creationSigilBalancePhiMicro: null,
      creationSigilBalanceUsd: null,
    },
    viewer: {
      isSignedIn: true,
      isOwner: true,
      canEdit: true,
      canView: true,
      isFollowing: false,
      followsYou: false,
      connection: "self",
    },
    stats: {
      followers: 0,
      following: 0,
      originals: originals.length,
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
    originals,
    originalsPage: {
      pageSize: Math.max(24, originals.length),
      hasMore: false,
      nextCursor: null,
    },
    showcaseCounts: {
      all: originals.length,
      image: originals.length,
      video: 0,
      audio: 0,
      book: 0,
      document: 0,
      moment: 0,
      signed: 0,
    },
  };
  return {
    ...profile,
    deterministicManifest: buildProfileDeterministicManifest(profile),
  };
}

export function isLocalProfileTruthRoot(profile: ProfileViewData | null | undefined): boolean {
  if (!profile) return false;
  return (
    (profile.profile.createdAt === LOCAL_PROFILE_TRUTH_TIMESTAMP ||
      profile.profile.updatedAt === LOCAL_PROFILE_TRUTH_TIMESTAMP) &&
    profile.originals.length === 0
  );
}

export function buildLocalWorldProfileFromSession(
  session: SessionBootstrapSnapshot | null | undefined,
): WorldProfileSummary | null {
  if (!session?.signedIn || !session.uid) return null;
  const username = localProfileUsernameFromSession(session);
  if (!username) return null;
  return {
    userId: session.uid,
    username,
    displayName: displayNameFromSession(session, username),
    profileAvatarUrl: null,
    bannerUrl: null,
    plan: normalizePlan(session.entitlementPlan ?? session.plan),
  };
}

export function projectWorldBootstrapViewFromLocalSession(
  data: WorldBootstrapView,
  session: SessionBootstrapSnapshot | null | undefined,
): WorldBootstrapView {
  if (data.profile) return data;
  const profile = buildLocalWorldProfileFromSession(session);
  return profile ? { ...data, profile } : data;
}
