import type { ProfileViewData } from "./types";
import { profileKaiHead } from "./deterministicFeed";
import { profileOriginalProofIdentityKey } from "./pbiSignatureHistory";
import { economyProjectionLineageCanReplace } from "@/app/lib/market/economyProjectionLineage";

const PUBLIC_PROFILE_USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export type PublicProfileProofAppend = Readonly<{
  schema: "receiz.public-profile-proof-append.v1";
  username: string;
  status: "verified" | "explicitly-unmigrated";
  bundleIdentity: string | null;
  acceptedHead?: PublicProfileAcceptedHead | null;
  profile: ProfileViewData;
}>;

/** Causal coordinate projected only from an accepted sealed Showcase head. */
export type PublicProfileAcceptedHead = Readonly<{
  tenantId: string;
  showcaseArtifactId: string;
  artifactDigest: string;
  operationCount: number;
  /** Exact sealed causal coordinate. Absent only on older transported projections. */
  headKaiUpulse?: string;
  parentArtifactDigests: readonly string[];
  ancestorArtifactDigests?: readonly string[];
}>;

const DIGEST_RE = /^[a-f0-9]{64}$/;

function isPublicProfileAcceptedHead(value: unknown): value is PublicProfileAcceptedHead {
  return record(value)
    && typeof value.tenantId === "string" && value.tenantId.length > 0
    && typeof value.showcaseArtifactId === "string" && value.showcaseArtifactId.length > 0
    && typeof value.artifactDigest === "string" && DIGEST_RE.test(value.artifactDigest)
    && count(value.operationCount) !== null
    && (value.headKaiUpulse === undefined
      || (typeof value.headKaiUpulse === "string" && /^(0|[1-9][0-9]*)$/.test(value.headKaiUpulse)))
    && Array.isArray(value.parentArtifactDigests)
    && value.parentArtifactDigests.every((digest) => typeof digest === "string" && DIGEST_RE.test(digest))
    && (value.ancestorArtifactDigests === undefined
      || (Array.isArray(value.ancestorArtifactDigests)
        && value.ancestorArtifactDigests.every((digest) => typeof digest === "string" && DIGEST_RE.test(digest))));
}

type WholeMarketMembershipLineage = Readonly<{
  revision: string;
  economyShowcaseArtifactDigest?: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
}>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number | null {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
    ? value
    : null;
}

function showcaseCount(
  profile: ProfileViewData,
  key: "all" | "signed",
): number | null {
  return count(profile.showcaseCounts?.[key]);
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function isBoundedPublicProfileProjection(
  value: unknown,
  username: string,
): value is ProfileViewData {
  if (!record(value) || !record(value.profile) || !record(value.viewer)) return false;
  if (!record(value.stats) || !record(value.originalsPage)) return false;
  if (!Array.isArray(value.originals) || !Array.isArray(value.followers) || !Array.isArray(value.following)) {
    return false;
  }
  const profileUsername = typeof value.profile.username === "string"
    ? normalizeUsername(value.profile.username)
    : "";
  const originals = count(value.stats.originals);
  const signedOriginals = count(value.stats.signedOriginals);
  if (
    profileUsername !== username
    || typeof value.profile.userId !== "string"
    || value.profile.isPrivate !== false
    || value.viewer.canView !== true
    || originals === null
    || signedOriginals === null
    || signedOriginals > originals
    || typeof value.originalsPage.hasMore !== "boolean"
  ) return false;
  return value.originals.every((original) =>
    record(original)
    && typeof original.id === "string"
    && typeof original.slug === "string"
    && typeof original.code === "string"
    && typeof original.verifyPath === "string"
    && typeof original.verifyUrl === "string");
}

export function publicProfileProofAppendPath(usernameRaw: string): string | null {
  const username = normalizeUsername(usernameRaw);
  return PUBLIC_PROFILE_USERNAME_RE.test(username)
    ? `/api/profile/${username}/showcase-proof`
    : null;
}

export function parsePublicProfileProofAppend(
  value: unknown,
  expectedUsernameRaw: string,
): PublicProfileProofAppend | null {
  const expectedUsername = normalizeUsername(expectedUsernameRaw);
  if (!PUBLIC_PROFILE_USERNAME_RE.test(expectedUsername) || !record(value)) return null;
  const username = typeof value.username === "string"
    ? normalizeUsername(value.username)
    : "";
  const status = value.status;
  const bundleIdentity = value.bundleIdentity;
  const acceptedHead = value.acceptedHead;
  if (
    value.schema !== "receiz.public-profile-proof-append.v1"
    || username !== expectedUsername
    || (status !== "verified" && status !== "explicitly-unmigrated")
    || !(typeof bundleIdentity === "string" || bundleIdentity === null)
    || (status === "verified" && !(typeof bundleIdentity === "string" && bundleIdentity.length > 0))
    || (status === "explicitly-unmigrated" && bundleIdentity !== null)
    || (status === "verified" && !isPublicProfileAcceptedHead(acceptedHead))
    || (status === "explicitly-unmigrated" && acceptedHead != null)
    || !isBoundedPublicProfileProjection(value.profile, expectedUsername)
  ) return null;
  return value as unknown as PublicProfileProofAppend;
}

/** A verified sealed descendant may change visible membership in either direction.
 * Counts and a DB projection alone cannot establish this relation. */
export function verifiedPublicProfileHeadCanReplace(
  heldHead: PublicProfileAcceptedHead | null,
  incomingHead: PublicProfileAcceptedHead | null,
  held: ProfileViewData,
  incoming: ProfileViewData,
): boolean {
  if ((heldHead?.headKaiUpulse !== undefined
      && !/^(0|[1-9][0-9]*)$/.test(heldHead.headKaiUpulse))
    || (incomingHead?.headKaiUpulse !== undefined
      && !/^(0|[1-9][0-9]*)$/.test(incomingHead.headKaiUpulse))) return false;
  if (heldHead?.headKaiUpulse !== undefined && incomingHead?.headKaiUpulse !== undefined
    && BigInt(incomingHead.headKaiUpulse) < BigInt(heldHead.headKaiUpulse)) return false;
  if (!heldHead || !incomingHead
    || held.profile.userId !== incoming.profile.userId
    || normalizeUsername(held.profile.username) !== normalizeUsername(incoming.profile.username)
    || incomingHead.tenantId !== heldHead.tenantId
    || incomingHead.showcaseArtifactId !== heldHead.showcaseArtifactId
    || incomingHead.artifactDigest === heldHead.artifactDigest
    || incomingHead.operationCount <= heldHead.operationCount
    || !(incomingHead.ancestorArtifactDigests ?? incomingHead.parentArtifactDigests)
      .includes(heldHead.artifactDigest)) return false;
  // The accepted sealed head is the membership authority. Its route
  // presentation may carry only a bounded first window, so a rendered
  // Originals array length is never an additional admission requirement.
  return count(incoming.stats.originals) !== null
    && count(incoming.stats.signedOriginals) !== null
    && incoming.stats.signedOriginals <= incoming.stats.originals;
}

/** Render from an incoming server-verified head immediately when a reused route
 * receives new props. A held accepted successor remains ahead of an older prop. */
export function selectRenderTimeVerifiedPublicProfile(
  heldProfile: ProfileViewData | null,
  heldHead: PublicProfileAcceptedHead | null,
  incomingProfile: ProfileViewData | null,
  incomingHead: PublicProfileAcceptedHead | null,
): Readonly<{ profile: ProfileViewData | null; head: PublicProfileAcceptedHead | null }> {
  if (!incomingProfile || !incomingHead) return { profile: heldProfile, head: heldHead };
  if (!heldProfile || !heldHead) return { profile: incomingProfile, head: incomingHead };
  if (verifiedPublicProfileHeadCanReplace(heldHead, incomingHead, heldProfile, incomingProfile)) {
    return { profile: incomingProfile, head: incomingHead };
  }
  return { profile: heldProfile, head: heldHead };
}

/**
 * The network projection is discovery below the held proof object. It may
 * append a public Original count or independently verified signature count;
 * equal/weaker coordinates never replace the already-settled surface.
 */
export function shouldAppendPublicProfileProof(
  held: ProfileViewData,
  incoming: ProfileViewData,
): boolean {
  const heldUsername = normalizeUsername(held.profile.username);
  const incomingUsername = normalizeUsername(incoming.profile.username);
  const heldOriginals = count(held.stats.originals);
  const heldSigned = count(held.stats.signedOriginals);
  const incomingOriginals = count(incoming.stats.originals);
  const incomingSigned = count(incoming.stats.signedOriginals);
  const heldShowcaseOriginals = showcaseCount(held, "all");
  const heldShowcaseSigned = showcaseCount(held, "signed");
  const incomingShowcaseOriginals = showcaseCount(incoming, "all");
  const incomingShowcaseSigned = showcaseCount(incoming, "signed");
  if (
    !heldUsername
    || heldUsername !== incomingUsername
    || (held.profile.userId.trim() && incoming.profile.userId.trim()
      && held.profile.userId !== incoming.profile.userId)
    || incoming.profile.isPrivate
    || incoming.viewer.canView !== true
    || heldOriginals === null
    || heldSigned === null
    || incomingOriginals === null
    || incomingSigned === null
    || heldSigned > heldOriginals
    || incomingSigned > incomingOriginals
    || incomingOriginals < heldOriginals
    || incomingSigned < heldSigned
    || (
      heldShowcaseOriginals !== null
      && (
        incomingShowcaseOriginals === null
        || incomingShowcaseOriginals < heldShowcaseOriginals
      )
    )
    || (
      heldShowcaseSigned !== null
      && (
        incomingShowcaseSigned === null
        || incomingShowcaseSigned < heldShowcaseSigned
      )
    )
  ) return false;
  return incomingOriginals > heldOriginals
    || incomingSigned > heldSigned
    || (
      incomingShowcaseOriginals !== null
      && (
        heldShowcaseOriginals === null
        || incomingShowcaseOriginals > heldShowcaseOriginals
      )
    )
    || (
      incomingShowcaseSigned !== null
      && (
        heldShowcaseSigned === null
        || incomingShowcaseSigned > heldShowcaseSigned
      )
    );
}

/**
 * The verified bounded carrier may transport only its first-paint children.
 * It can advance local truth only when those children complete the exact
 * successor membership together with the already-held local composite.
 * Counts alone can never satisfy this contract.
 */
export function verifiedPublicProfileProjectionCompletesHeldComposite(
  held: ProfileViewData,
  incoming: ProfileViewData,
): boolean {
  if (!shouldAppendPublicProfileProof(held, incoming)) return false;
  const expectedVisibleCount = count(incoming.stats.originals);
  if (expectedVisibleCount === null) return false;
  const membership = new Set<string>();
  for (const original of [...held.originals, ...incoming.originals]) {
    if (!original.showOnProfile) continue;
    const coordinate = profileOriginalProofIdentityKey(original);
    membership.add(coordinate || `id:${original.id}`);
  }
  return membership.size === expectedVisibleCount;
}

/**
 * Whole-market discovery may replace the current visible profile only when it
 * proves a causal visibility successor, or when its complete membership is a
 * strict append over every already-held public proof object. A stale complete
 * snapshot must not erase a locally accepted sealed append; hide/unhide may
 * remove membership only through a descendant Showcase projection.
 */
export function wholeMarketProfileCanAdvanceHeldProof(args: Readonly<{
  held: ProfileViewData;
  incoming: ProfileViewData;
  heldMembership?: WholeMarketMembershipLineage | null;
  incomingMembership?: WholeMarketMembershipLineage | null;
}>): boolean {
  const heldMembership = args.heldMembership ?? null;
  const incomingMembership = args.incomingMembership ?? null;
  if (
    heldMembership
    && incomingMembership
    && heldMembership.revision !== incomingMembership.revision
    && economyProjectionLineageCanReplace(heldMembership, incomingMembership)
  ) return true;

  return verifiedPublicProfileProjectionCompletesHeldComposite(
    args.held,
    args.incoming,
  );
}

/**
 * Selects only a canonical successor of the held public proof projection.
 * Discovery is append-only: an unavailable, equal, or weaker projection keeps
 * the exact held object, while a strictly farther valid head is admitted.
 */
export function selectAdvancingPublicProfileProof(
  held: ProfileViewData,
  incoming: ProfileViewData | null,
): ProfileViewData {
  if (!incoming || !shouldAppendPublicProfileProof(held, incoming)) return held;
  const heldKaiHead = profileKaiHead(held);
  const incomingKaiHead = profileKaiHead(incoming);
  if (
    heldKaiHead !== null
    && (incomingKaiHead === null || incomingKaiHead < heldKaiHead)
  ) return held;
  return incoming;
}

/** Starts servant publication for the same admitted account; display counts are not authority. */
export function canPublishOwnedProfileShowcaseSource(
  session: Readonly<{ signedIn: boolean; uid: string | null; username: string }> | null | undefined,
  username: string,
  profile: ProfileViewData | null | undefined,
): boolean {
  return Boolean(
    session?.signedIn
    && session.uid
    && session.uid === profile?.profile.userId
    && normalizeUsername(session.username) === normalizeUsername(username),
  );
}
