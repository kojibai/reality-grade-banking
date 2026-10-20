import { firstClaimLine } from "./claimDisplay";
import type { ProfileOriginal } from "./types";

/** Existing artwork presentation recognition; never identity or signature authority. */
export function profileOriginalIsIdentityArtwork(original: ProfileOriginal): boolean {
  const media = original.media;
  if (!media || media.kind !== "image") return false;
  const claim = (firstClaimLine(original.claim) ?? "").toLowerCase();
  const name = (media.name ?? media.originalDownloadName ?? media.derivativeDownloadName ?? "").trim().toLowerCase();
  return (
    claim.includes("identity seal") ||
    claim.includes("identity record") ||
    claim.includes("identity card") ||
    name.startsWith("identity-seal-") ||
    name.startsWith("identity-record-") ||
    name.startsWith("identity-card-")
  );
}
