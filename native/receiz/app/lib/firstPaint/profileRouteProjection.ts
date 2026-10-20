import { buildProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import type { ProfileViewData } from "@/app/lib/profile/types";

/**
 * Projects an already-admitted profile proof object without turning a browser
 * presentation boundary into a membership boundary. Every Original already
 * carried by the admitted source remains present on first paint; only media,
 * decode, and GPU realization may be bounded beneath these proof shells.
 */
export function projectDeterministicProfileRouteFirstPaint(
  profile: ProfileViewData,
): ProfileViewData {
  const projectedBase: ProfileViewData = {
    ...profile,
    originals: [...profile.originals],
    originalsPage: {
      ...profile.originalsPage,
      pageSize: Math.max(profile.originalsPage.pageSize, profile.originals.length),
    },
    deterministicManifest: null,
  };

  return {
    ...projectedBase,
    deterministicManifest: buildProfileDeterministicManifest(projectedBase),
  };
}

/** A verified account session may project its viewer identity onto the
 * already-admitted public proof. It never changes sealed membership or stats. */
export function projectAuthenticatedProfileViewerFirstPaint(
  profile: ProfileViewData,
  verifiedSessionUid: string | null,
): ProfileViewData {
  if (!verifiedSessionUid) return profile;
  const isOwner = profile.profile.userId === verifiedSessionUid;
  return {
    ...profile,
    viewer: {
      ...profile.viewer,
      isSignedIn: true,
      ...(isOwner ? {
        isOwner: true,
        canEdit: true,
        canView: true,
        connection: "self" as const,
      } : {}),
    },
  };
}
