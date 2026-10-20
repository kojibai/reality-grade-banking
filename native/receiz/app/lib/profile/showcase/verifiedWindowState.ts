import { profileOriginalProofIdentityKey } from "@/app/lib/profile/pbiSignatureHistory";
import type { ProfileOriginal } from "@/app/lib/profile/types";

function settledIdentity(original: ProfileOriginal): string {
  return profileOriginalProofIdentityKey(original) ?? `id:${original.id}`;
}

/**
 * A later sealed window may append verified proof objects, but it cannot
 * mutate, reorder, or delete proof objects already settled on the surface.
 */
export function appendMissingVerifiedShowcaseOriginals(
  settled: readonly ProfileOriginal[],
  verifiedAdditions: readonly ProfileOriginal[],
): ProfileOriginal[] {
  const result = [...settled];
  const identities = new Set(result.map(settledIdentity));
  for (const original of verifiedAdditions) {
    const identity = settledIdentity(original);
    if (identities.has(identity)) continue;
    identities.add(identity);
    result.push(original);
  }
  return result;
}

