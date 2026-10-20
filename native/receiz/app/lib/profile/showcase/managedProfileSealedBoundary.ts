import { buildProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import { profileOriginalProofIdentityKey } from "@/app/lib/profile/pbiSignatureHistory";
import { mergeProfilePreservingStrongerIdentity } from "@/app/lib/profile/profileIdentityAuthority";
import { LOCAL_PROFILE_TRUTH_TIMESTAMP } from "@/app/lib/profile/localProfileTruth";
import { appendMissingVerifiedShowcaseOriginals } from "@/app/lib/profile/showcase/verifiedWindowState";
import type { ProfileOriginal, ProfileViewData } from "@/app/lib/profile/types";
import type { ProfileShowcaseCompleteSource } from "./boundedEdgeVault";
import { settleOwnerShowcaseRestore } from "./ownerSourceProjection";
import { wholeMarketProfileCanAdvanceHeldProof } from "../publicProofAppend";
import type { ProfileCurrentPublicMembership } from "../publicInventoryRouteProjection";

/** Distribution membership expires when its accepted enclosing Source changes. */
export function publicInventoryMembershipForAcceptedSource(
  membership: ProfileCurrentPublicMembership | null | undefined,
  capturedSourceDigest: string | null | undefined,
  currentSourceDigest: string | null | undefined,
): ProfileCurrentPublicMembership | null {
  return capturedSourceDigest && /^[a-f0-9]{64}$/.test(capturedSourceDigest)
    && capturedSourceDigest === currentSourceDigest
    && membership?.scope === "whole-market-visible-showcase" && membership.source === "canonical-complete"
    && membership.isComplete === true && typeof membership.revision === "string" && membership.revision.trim()
    && Number.isFinite(Date.parse(membership.generatedAt)) ? membership : null;
}

function originalIdentity(original: ProfileOriginal): string {
  return profileOriginalProofIdentityKey(original) || `id:${original.id}`;
}

const completeSuccessorProjections = new WeakMap<ProfileShowcaseCompleteSource,
  WeakMap<ProfileViewData, WeakMap<ProfileViewData, ProfileViewData>>>();

/** Project only the complete public capture composed beneath this exact Source. */
export function projectSourceBoundPublicInventory(
  sealedPublic: ProfileViewData,
  managed: ProfileViewData,
  publicMembership: ProfileCurrentPublicMembership | null | undefined,
  capturedSourceDigest: string | null | undefined,
  currentSourceDigest: string | null | undefined,
): ProfileViewData | null {
  const membership = publicInventoryMembershipForAcceptedSource(publicMembership, capturedSourceDigest, currentSourceDigest);
  if (!membership) return null;
  const hiddenIds = new Set(sealedPublic.originals.filter(original => !original.showOnProfile).map(original => original.id));
  if (sealedPublic.profile.userId !== managed.profile.userId
    || sealedPublic.profile.username.toLowerCase() !== managed.profile.username.toLowerCase()
    || sealedPublic.profile.isPrivate || managed.profile.isPrivate || !managed.viewer.canView
    || managed.viewer.isOwner || managed.viewer.canEdit
    || managed.originalsPage.hasMore !== false || managed.originalsPage.nextCursor !== null
    || managed.deterministicManifest?.isComplete !== true
    || managed.originals.length !== managed.stats.originals
    || managed.originals.some(original => !original.showOnProfile || hiddenIds.has(original.id))
    || !wholeMarketProfileCanAdvanceHeldProof({ held: sealedPublic, incoming: managed, incomingMembership: membership })) return null;
  const known = new Map(sealedPublic.originals.map(original => [original.id, original]));
  const projected = { ...managed, profile: sealedPublic.profile,
    originals: managed.originals.map(original => known.get(original.id) ?? original) };
  return { ...projected, deterministicManifest: buildProfileDeterministicManifest(projected) };
}

/** The caller supplies only a verified accepted public Showcase projection.
 * Owner inventory may enrich management and hidden custody, never public
 * membership. A newer accepted public projection replaces this anchor. */
export function projectManagedProfileBeneathSealedPublicHead(
  sealedPublic: ProfileViewData,
  managed: ProfileViewData,
  publicMembership?: ProfileCurrentPublicMembership | null,
  capturedSourceDigest?: string | null,
  currentSourceDigest?: string | null,
): ProfileViewData {
  if (sealedPublic.profile.userId !== managed.profile.userId
    || sealedPublic.profile.username.toLowerCase() !== managed.profile.username.toLowerCase()) {
    return sealedPublic;
  }
  const publicInventory = projectSourceBoundPublicInventory(sealedPublic, managed, publicMembership, capturedSourceDigest, currentSourceDigest);
  if (publicInventory) return publicInventory;
  const originals = [...sealedPublic.originals];
  const held = new Set(originals.map(originalIdentity));
  for (const original of managed.originals) {
    if (original.showOnProfile) continue;
    const identity = originalIdentity(original);
    if (held.has(identity)) continue;
    held.add(identity);
    originals.push(original);
  }
  const mergedIdentity = mergeProfilePreservingStrongerIdentity(sealedPublic, managed).profile;
  // A category projection can carry Originals with the identity-only epoch.
  // Keep its placeholder artwork/name beneath the accepted public identity,
  // while the existing identity merge preserves accepted PBI additions and
  // ordinary owner edits with their real profile identity.
  const identity = managed.profile.updatedAt === LOCAL_PROFILE_TRUTH_TIMESTAMP
    ? { ...mergedIdentity, displayName: sealedPublic.profile.displayName,
        avatarUrl: sealedPublic.profile.avatarUrl, bannerUrl: sealedPublic.profile.bannerUrl }
    : mergedIdentity;
  const projected: ProfileViewData = {
    ...managed,
    profile: identity,
    originals,
    originalsPage: sealedPublic.originalsPage,
    showcaseCounts: sealedPublic.showcaseCounts,
    stats: {
      ...managed.stats,
      originals: sealedPublic.stats.originals,
      signedOriginals: sealedPublic.stats.signedOriginals,
      hiddenOriginals: Math.max(managed.stats.hiddenOriginals,
        originals.filter((original) => !original.showOnProfile).length),
    },
  };
  return { ...projected, deterministicManifest: buildProfileDeterministicManifest(projected) };
}

/** A runtime verified local successor carries its own sealed membership count.
 * The caller must establish exact causal descent from the accepted public head. */
export function projectVerifiedLocalShowcaseSuccessor(
  sealedPublic: ProfileViewData,
  managed: ProfileViewData,
  visibleWindow: readonly ProfileOriginal[],
  visibleCount: number,
  completeSource?: ProfileShowcaseCompleteSource | null,
): ProfileViewData {
  // The caller binds this complete custody to the selected successor digest.
  // Its exact membership includes hide/unhide, even when the total is unchanged.
  if (completeSource) {
    let byManaged = completeSuccessorProjections.get(completeSource);
    if (!byManaged) completeSuccessorProjections.set(completeSource, byManaged = new WeakMap());
    let byPublic = byManaged.get(managed);
    if (!byPublic) byManaged.set(managed, byPublic = new WeakMap());
    const held = byPublic.get(sealedPublic);
    if (held) return held;
    const projected = settleOwnerShowcaseRestore(
      projectManagedProfileBeneathSealedPublicHead(sealedPublic, managed), completeSource, { retainedHiddenOnly: true },
    );
    byPublic.set(sealedPublic, projected);
    return projected;
  }
  const base = projectManagedProfileBeneathSealedPublicHead(sealedPublic, managed);
  const localVisibleWindow = visibleWindow.filter((original) => original.showOnProfile);
  const visible = visibleCount < sealedPublic.stats.originals
    ? localVisibleWindow
    : appendMissingVerifiedShowcaseOriginals(
        sealedPublic.originals.filter((original) => original.showOnProfile),
        localVisibleWindow,
      );
  const visibleIds = new Set(visible.map(originalIdentity));
  const hidden = base.originals.filter((original) => !original.showOnProfile
    && !visibleIds.has(originalIdentity(original)));
  const originals = [...visible, ...hidden];
  const sealedIds = new Set(sealedPublic.originals.filter((original) => original.showOnProfile).map(originalIdentity));
  const newlySigned = visibleWindow.filter((original) => original.showOnProfile
    && original.hasPbiSignature && !sealedIds.has(originalIdentity(original))).length;
  const signedOriginals = visibleCount < sealedPublic.stats.originals
    ? Math.min(visibleCount, sealedPublic.stats.signedOriginals)
    : Math.min(visibleCount, sealedPublic.stats.signedOriginals + newlySigned);
  const projected: ProfileViewData = {
    ...base,
    originals,
    originalsPage: {
      ...base.originalsPage,
      hasMore: visibleCount > visible.length,
      nextCursor: visibleCount > visible.length ? base.originalsPage.nextCursor : null,
    },
    stats: {
      ...base.stats,
      originals: visibleCount,
      signedOriginals,
      hiddenOriginals: Math.max(managed.stats.hiddenOriginals, hidden.length),
    },
    showcaseCounts: base.showcaseCounts
      ? { ...base.showcaseCounts, all: visibleCount, signed: signedOriginals }
      : base.showcaseCounts,
  };
  return { ...projected, deterministicManifest: buildProfileDeterministicManifest(projected) };
}
