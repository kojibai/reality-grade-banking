import type { ProfileOriginal, ProfileViewData, ProfileShowcaseFilterCounts } from "../types";
import type { ProfileShowcaseCompleteSource } from "./boundedEdgeVault";
import { COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME, decodeCompleteLegacyShowcaseMigrationPayload } from "./legacyMigrationPayload";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { buildProfileDeterministicManifest, visibleShowcaseOriginalsFromOriginals } from "../deterministicFeed";
import { originalHasSignedArtifactState } from "../pbiSignatureHistory";

/** Projection only, called with complete custody read from the existing vault. */
export function projectOwnerShowcaseOriginals(source: ProfileShowcaseCompleteSource, options: Readonly<{ publicOnly?: boolean; retainedHiddenOnly?: boolean }> = {}): readonly ProfileOriginal[] {
  const originals: ProfileOriginal[] = [];
  const ids = new Set<string>();
  const currentIds = new Set<string>();
  const childrenByDigest = new Map<string, (typeof source.children)[number]>();
  for (const child of source.children) {
    if (!childrenByDigest.has(child.reference.childArtifactDigest)) {
      childrenByDigest.set(child.reference.childArtifactDigest, child);
    }
  }
  // Replacement appends retain hidden predecessors. Their old embedded rows
  // are history, while the visible successor partition carries current hidden
  // AND public membership. Select the successor before projecting history.
  const placements = [...source.placements].sort((a, b) => Number(b.visibility === "visible") - Number(a.visibility === "visible"));
  for (const placement of placements) {
    if (options.publicOnly && placement.visibility !== "visible") continue;
    const digest = placement.reference.childArtifactDigest;
    const child = typeof digest === "string" ? childrenByDigest.get(digest) : undefined;
    if (!child) {
      if (options.retainedHiddenOnly && placement.visibility !== "visible") continue;
      throw new TypeError("SHOWCASE_RESTORE_COMPLETE_PROJECTION_UNAVAILABLE");
    }
    const partition = child.verifiedPayloadMimeType === COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME;
    const rows = partition ? decodeCompleteLegacyShowcaseMigrationPayload(child.verifiedPayloadBytes)
      : child.verifiedRouteProjectionBytes ? [JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(child.verifiedRouteProjectionBytes)) as ProfileOriginal] : [];
    if (!rows.length) throw new TypeError("SHOWCASE_RESTORE_ORIGINAL_PROJECTION_UNAVAILABLE");
    for (const original of rows) {
      if (options.publicOnly && partition && !original.showOnProfile) continue;
      if (placement.visibility !== "visible" && currentIds.has(original.id)) continue;
      if (typeof original.id !== "string" || !original.id || ids.has(original.id)) throw new TypeError("SHOWCASE_RESTORE_ORIGINAL_CONFLICT");
      ids.add(original.id);
      if (placement.visibility === "visible") currentIds.add(original.id);
      originals.push({ ...original, showOnProfile: placement.visibility === "visible" && (!partition || original.showOnProfile) });
    }
  }
  return originals;
}

/** Explicit accepted complete-source restore projects its exact membership/state.
 * Partial discovery continues to use verifiedWindowState; it cannot call this
 * complete-custody projection. Unchanged objects retain their settled references. */
export function settleOwnerShowcaseRestore(profile: ProfileViewData, source: ProfileShowcaseCompleteSource,
  options: Readonly<{ retainedHiddenOnly?: boolean }> = {}): ProfileViewData {
  const incoming = projectOwnerShowcaseOriginals(source, options);
  if (!options.retainedHiddenOnly) return settleOwnerShowcaseOriginals(profile, incoming);
  // Public-source custody retains every sealed placement while transporting
  // current public bytes. Missing historical private bytes cannot veto that
  // accepted public membership or erase already-held hidden Originals.
  const ids = new Set(incoming.map(original => original.id));
  return settleOwnerShowcaseOriginals(profile, [...incoming,
    ...profile.originals.filter(original => !original.showOnProfile && !ids.has(original.id))]);
}

/** Called only after the enclosing source and complete membership are verified. */
export function settleOwnerShowcaseOriginals(profile: ProfileViewData, incoming: readonly ProfileOriginal[]): ProfileViewData {
  const held = new Map(profile.originals.map(original => [original.id, original]));
  const originals = incoming.map(original => {
    const prior = held.get(original.id);
    return prior && jcsCanonicalize(JSON.parse(JSON.stringify(prior))) === jcsCanonicalize(JSON.parse(JSON.stringify(original))) ? prior : original;
  });
  const visible = visibleShowcaseOriginalsFromOriginals(originals);
  const counts: ProfileShowcaseFilterCounts = { all: visible.length, signed: 0, image: 0, audio: 0, video: 0, book: 0, document: 0, moment: 0 };
  for (const original of visible) {
    const kind = original.media?.kind;
    counts[kind === "epub" ? "book" : kind === "pdf" || kind === "file" ? "document"
      : kind === "image" || kind === "video" || kind === "audio" ? kind : "moment"]++;
    if (originalHasSignedArtifactState(original)) counts.signed++;
  }
  const next: ProfileViewData = { ...profile, originals,
    stats: { ...profile.stats, originals: visible.length,
      signedOriginals: counts.signed,
      hiddenOriginals: originals.length - visible.length },
    showcaseCounts: counts,
    originalsPage: { ...profile.originalsPage, pageSize: Math.max(profile.originalsPage.pageSize, originals.length, 1),
      hasMore: false, nextCursor: null } };
  return { ...next, deterministicManifest: buildProfileDeterministicManifest(next) };
}
