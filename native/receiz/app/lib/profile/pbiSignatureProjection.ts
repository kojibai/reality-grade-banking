import { buildProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import {
  mergePbiSignedStateAcrossOriginals,
  originalHasSignedArtifactState,
} from "@/app/lib/profile/pbiSignatureHistory";
import type { ProfileViewData } from "@/app/lib/profile/types";

export function mergeProfilePreservingPbiReceiptHistory(
  held: ProfileViewData | null | undefined,
  incoming: ProfileViewData,
): ProfileViewData {
  if (!held || held.profile.username !== incoming.profile.username) return incoming;

  const originals = mergePbiSignedStateAcrossOriginals(held.originals, incoming.originals);
  const signedOriginals = originals.reduce(
    (count, original) =>
      count + (original.showOnProfile && originalHasSignedArtifactState(original) ? 1 : 0),
    0,
  );
  const profileBase: ProfileViewData = {
    ...incoming,
    originals,
    stats: {
      ...incoming.stats,
      signedOriginals,
    },
  };

  return {
    ...profileBase,
    deterministicManifest: buildProfileDeterministicManifest(profileBase),
  };
}
