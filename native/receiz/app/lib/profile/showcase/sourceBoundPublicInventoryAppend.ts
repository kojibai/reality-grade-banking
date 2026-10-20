import type { ProfileOriginal, ProfileViewData } from "../types";
import type { ProfileCurrentPublicMembership } from "../publicInventoryRouteProjection";
import { profileOriginalProofIdentityKey } from "../pbiSignatureHistory";
import { isLegacyMigrationProfileOriginal } from "./legacyMigrationPayload";
import { projectSourceBoundPublicInventory, publicInventoryMembershipForAcceptedSource } from "./managedProfileSealedBoundary";

/** Compact observation beneath the exact accepted Source, not proof authority.
 * The existing owner migration sealer admits any missing member. */
export type SourceBoundPublicInventoryAppend = Readonly<{
  sourceArtifactDigest: string;
  artifactId: string;
  username: string;
  sourceOriginalIds: readonly string[];
  originalIds: readonly string[];
  additions: readonly ProfileOriginal[];
  membership: ProfileCurrentPublicMembership;
}>;

export function coerceSourceBoundPublicInventoryAppend(value: unknown): SourceBoundPublicInventoryAppend {
  const context = value as SourceBoundPublicInventoryAppend;
  const ids = (input: unknown): input is string[] => Array.isArray(input)
    && input.every(id => typeof id === "string" && id.trim() === id && id.length > 0)
    && new Set(input).size === input.length;
  if (!context || typeof context !== "object" || typeof context.artifactId !== "string"
    || !/^profile-showcase:[a-z0-9][a-z0-9._-]*\.receiz\.id$/.test(context.artifactId)
    || typeof context.username !== "string" || !/^[a-z0-9_]{3,24}$/.test(context.username)
    || !publicInventoryMembershipForAcceptedSource(context.membership, context.sourceArtifactDigest, context.sourceArtifactDigest)
    || !ids(context.sourceOriginalIds) || !ids(context.originalIds) || !Array.isArray(context.additions)
    || context.additions.length === 0 || !context.additions.every(original => isLegacyMigrationProfileOriginal(original) && original.showOnProfile)
    || !ids(context.additions.map(original => original.id))) throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_INVALID");
  const known = new Set(context.sourceOriginalIds), added = new Set(context.additions.map(original => original.id));
  if (context.originalIds.length !== known.size + added.size
    || context.additions.some(original => known.has(original.id))
    || context.originalIds.some(id => !known.has(id) && !added.has(id))) throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_MEMBERSHIP");
  return context;
}

export function captureSourceBoundPublicInventoryAppend(input: Readonly<{
  source: ProfileViewData; inventory: ProfileViewData; membership: ProfileCurrentPublicMembership | null | undefined;
  artifactId: string; capturedSourceDigest?: string | null; currentSourceDigest?: string | null;
}>): SourceBoundPublicInventoryAppend | null {
  const projected = projectSourceBoundPublicInventory(input.source, input.inventory, input.membership,
    input.capturedSourceDigest, input.currentSourceDigest);
  if (!projected || !input.membership || !input.capturedSourceDigest) return null;
  const sourceIds = new Set(input.source.originals.filter(original => original.showOnProfile).map(original => original.id));
  const context: SourceBoundPublicInventoryAppend = { sourceArtifactDigest: input.capturedSourceDigest,
    artifactId: input.artifactId, username: input.source.profile.username,
    sourceOriginalIds: [...sourceIds], originalIds: projected.originals.map(original => original.id),
    additions: projected.originals.filter(original => !sourceIds.has(original.id)), membership: input.membership };
  try { return coerceSourceBoundPublicInventoryAppend(context); } catch { return null; }
}

/** Called under the existing causal lock against verified complete custody.
 * A retry after append may reuse its already-carried members, never import an
 * old capture into a distinct Source or revive a hidden member. */
export function sourceBoundPublicInventoryOriginalsForAppend(input: Readonly<{
  context: SourceBoundPublicInventoryAppend; artifactId: string; currentSourceDigest: string;
  capturedOriginals: readonly ProfileOriginal[]; currentOriginals: readonly ProfileOriginal[];
  verifiedCurrentDescendant: boolean;
}>): readonly ProfileOriginal[] {
  const context = coerceSourceBoundPublicInventoryAppend(input.context);
  if (context.artifactId !== input.artifactId || (input.currentSourceDigest !== context.sourceArtifactDigest
    && !input.verifiedCurrentDescendant)) throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_PREDECESSOR");
  const captured = new Set(input.capturedOriginals.filter(original => original.showOnProfile).map(original => original.id));
  if (captured.size !== context.sourceOriginalIds.length || context.sourceOriginalIds.some(id => !captured.has(id))) {
    throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_MEMBERSHIP");
  }
  const visible = new Set(input.currentOriginals.filter(original => original.showOnProfile).map(original => original.id));
  const hidden = input.currentOriginals.filter(original => !original.showOnProfile);
  const hiddenIds = new Set(hidden.map(original => original.id));
  const hiddenProofs = new Set(hidden.map(profileOriginalProofIdentityKey).filter(Boolean));
  if (context.originalIds.some(id => hiddenIds.has(id)) || context.additions.some(original => hiddenProofs.has(profileOriginalProofIdentityKey(original)))) {
    throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_MEMBERSHIP");
  }
  if (input.currentSourceDigest !== context.sourceArtifactDigest) {
    if (context.originalIds.some(id => !visible.has(id))) throw TypeError("SOURCE_BOUND_PUBLIC_INVENTORY_MEMBERSHIP");
    return [];
  }
  return context.additions;
}
