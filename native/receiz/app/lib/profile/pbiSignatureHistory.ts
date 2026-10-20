import type { ProfileOriginal } from "@/app/lib/profile/types";

type ProfileOriginalProofIdentity = Pick<
  ProfileOriginal,
  "code" | "pulse" | "verifyPath" | "verifyUrl" | "importedSource"
>;

type ProfileOriginalPbiSignedState = Pick<
  ProfileOriginal,
  "hasPbiSignature" | "pbiReceiptHash" | "signedArtifactDownloadUrl"
>;

function safeAnchorIdValue(raw: string | null): string | null {
  const value = (raw || "").trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(value) ? value : null;
}

function queryParamFromPathLike(
  pathLike: string | null | undefined,
  key: string,
): string | null {
  const trimmed = (pathLike ?? "").trim();
  if (!trimmed) return null;
  const normalized = (() => {
    if (!/^https?:\/\//i.test(trimmed)) return trimmed;
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "";
    }
  })();
  if (!normalized) return null;
  const queryIndex = normalized.indexOf("?");
  if (queryIndex < 0) return null;
  const params = new URLSearchParams(normalized.slice(queryIndex + 1));
  const value = params.get(key);
  return value ? value.trim() : null;
}

export function profileOriginalProofIdentityKey(
  original: ProfileOriginalProofIdentity,
): string {
  if (original.importedSource) {
    const identity = original.importedSource.sourceIdentity;
    return identity ? `source:${JSON.stringify([identity.artifactId, identity.namespace, identity.genesisOwnerReceizId])}`
      : `source:${original.importedSource.identity.kind}:${original.importedSource.identity.value}`;
  }
  const code = (original.code ?? "").trim().toUpperCase();
  const pulse = (original.pulse ?? "").trim();
  if (code && pulse) {
    const anchorId =
      safeAnchorIdValue(queryParamFromPathLike(original.verifyPath, "a")) ??
      safeAnchorIdValue(queryParamFromPathLike(original.verifyUrl, "a"));
    return anchorId ? `${code}::${pulse}::a:${anchorId}` : `${code}::${pulse}`;
  }

  const verifyPath = (original.verifyPath ?? "").trim();
  const verifyUrl = (original.verifyUrl ?? "").trim();
  return verifyPath ? `verify:${verifyPath}` : verifyUrl ? `verify:${verifyUrl}` : "";
}

export function originalHasSignedArtifactState(
  original: ProfileOriginalPbiSignedState,
): boolean {
  return (
    original.hasPbiSignature === true ||
    Boolean((original.pbiReceiptHash || "").trim()) ||
    Boolean((original.signedArtifactDownloadUrl || "").trim())
  );
}

export function profileOriginalPbiActionState(
  isSignedOriginal: boolean,
): "sign" | "share" {
  return isSignedOriginal ? "share" : "sign";
}

function mergeSignedState(
  incoming: ProfileOriginalPbiSignedState,
  ...heldStates: Array<ProfileOriginalPbiSignedState | undefined>
): ProfileOriginalPbiSignedState {
  const states = [incoming, ...heldStates];
  const pbiReceiptHash = states.find((state) => (state?.pbiReceiptHash || "").trim())?.pbiReceiptHash ?? null;
  const signedArtifactDownloadUrl =
    states.find((state) => (state?.signedArtifactDownloadUrl || "").trim())?.signedArtifactDownloadUrl ?? null;

  return {
    hasPbiSignature: states.some((state) => state ? originalHasSignedArtifactState(state) : false),
    pbiReceiptHash,
    signedArtifactDownloadUrl,
  };
}

function profileOriginalPulseCoordinateKey(
  original: Pick<ProfileOriginal, "code" | "pulse">,
): string {
  const code = (original.code ?? "").trim().toUpperCase();
  const pulse = (original.pulse ?? "").trim();
  return code && pulse ? `${code}::${pulse}` : "";
}

function isOptimisticProfileOriginalId(id: string): boolean {
  return id.startsWith("optimistic:profile-original:");
}

/**
 * One optimistic local projection and its canonical route projection are
 * representations of the same proof object when their exact proof identity
 * or deterministic code/pulse coordinate agrees. The coordinate fallback is
 * deliberately restricted to an optimistic/canonical pair so two canonical
 * proof objects are never collapsed by UI reconciliation.
 */
export function profileOriginalPublicationIdentityMatches(
  left: ProfileOriginalProofIdentity & Pick<ProfileOriginal, "id">,
  right: ProfileOriginalProofIdentity & Pick<ProfileOriginal, "id">,
): boolean {
  if (left.importedSource || right.importedSource) {
    return Boolean(left.importedSource && right.importedSource
      && profileOriginalProofIdentityKey(left) === profileOriginalProofIdentityKey(right));
  }
  if (left.id === right.id) return true;
  const leftProofIdentity = profileOriginalProofIdentityKey(left);
  const rightProofIdentity = profileOriginalProofIdentityKey(right);
  if (leftProofIdentity && leftProofIdentity === rightProofIdentity) return true;
  if (!isOptimisticProfileOriginalId(left.id) && !isOptimisticProfileOriginalId(right.id)) {
    return false;
  }
  const leftPulseCoordinate = profileOriginalPulseCoordinateKey(left);
  return Boolean(
    leftPulseCoordinate
    && leftPulseCoordinate === profileOriginalPulseCoordinateKey(right),
  );
}

/**
 * React and deterministic media custody must follow the proof object across a
 * servant row-id acknowledgment. A code/pulse coordinate is stable for the
 * optimistic/canonical pair; when distinct canonical proofs share that
 * display coordinate, their exact proof identities remain separate.
 */
export function profileOriginalStableSurfaceIdentityKey(
  original: ProfileOriginal,
  siblings: readonly ProfileOriginal[],
): string {
  if (original.importedSource) return profileOriginalProofIdentityKey(original);
  const pulseCoordinate = profileOriginalPulseCoordinateKey(original);
  if (pulseCoordinate) {
    const hasDistinctCanonicalCollision = siblings.some((candidate) => (
      profileOriginalPulseCoordinateKey(candidate) === pulseCoordinate
      && !profileOriginalPublicationIdentityMatches(original, candidate)
    ));
    if (!hasDistinctCanonicalCollision) return `coordinate:${pulseCoordinate}`;
  }
  const proofIdentity = profileOriginalProofIdentityKey(original);
  return proofIdentity
    ? `proof:${proofIdentity}`
    : `row:${original.id.trim()}`;
}

/**
 * Derive resource-plane identities once from complete admitted membership.
 * A scroll window only selects these keys; it cannot change them when a
 * previously offscreen canonical collision enters the presentation window.
 */
export function buildProfileOriginalSurfaceIdentityKeys(
  originals: readonly ProfileOriginal[],
): ReadonlyMap<string, string> {
  type CoordinateGroup = {
    imported: number;
    canonical: number;
    byId: Map<string, number>;
    byProof: Map<string, number>;
    byIdAndProof: Map<string, number>;
  };
  const groups = new Map<string, CoordinateGroup>();
  const increment = (counts: Map<string, number>, key: string) =>
    counts.set(key, (counts.get(key) ?? 0) + 1);
  const entries = originals.map((original) => {
    const coordinate = profileOriginalPulseCoordinateKey(original);
    const proofIdentity = profileOriginalProofIdentityKey(original);
    const optimistic = isOptimisticProfileOriginalId(original.id);
    const idAndProof = JSON.stringify([original.id, proofIdentity]);
    if (coordinate) {
      let group = groups.get(coordinate);
      if (!group) {
        group = { imported: 0, canonical: 0, byId: new Map(), byProof: new Map(), byIdAndProof: new Map() };
        groups.set(coordinate, group);
      }
      if (original.importedSource) group.imported += 1;
      else if (!optimistic) {
        group.canonical += 1;
        increment(group.byId, original.id);
        increment(group.byProof, proofIdentity);
        increment(group.byIdAndProof, idAndProof);
      }
    }
    return { original, coordinate, proofIdentity, optimistic, idAndProof };
  });
  return new Map(entries.map(({ original, coordinate, proofIdentity, optimistic, idAndProof }) => {
    if (original.importedSource) return [original.id, proofIdentity];
    const group = groups.get(coordinate);
    // Existing publication matching admits an optimistic/canonical alias by
    // coordinate. Canonical aliases match by either row id or exact proof.
    const distinctCanonicalCount = group && !optimistic
      ? group.canonical - (group.byId.get(original.id) ?? 0)
        - (group.byProof.get(proofIdentity) ?? 0) + (group.byIdAndProof.get(idAndProof) ?? 0)
      : 0;
    const collision = Boolean(group?.imported || distinctCanonicalCount > 0);
    return [original.id, coordinate && !collision
      ? `coordinate:${coordinate}`
      : proofIdentity ? `proof:${proofIdentity}` : `row:${original.id.trim()}`];
  }));
}

function mergeKnownPublishedProfileOriginal(
  canonicalOriginal: ProfileOriginal,
  locallyPublishedOriginal: ProfileOriginal,
): ProfileOriginal {
  const signedCanonical = mergeSignedState(
    canonicalOriginal,
    locallyPublishedOriginal,
  );
  const canonicalMedia = canonicalOriginal.media;
  const locallyHeldMedia = locallyPublishedOriginal.media;
  const preservesNativeOrVideoSource = Boolean(
    canonicalMedia
    && locallyHeldMedia
    && (locallyHeldMedia.kind === "video" || locallyHeldMedia.liveMomentCapture)
    && (
      locallyHeldMedia.src.startsWith("blob:")
      || locallyHeldMedia.originalDownloadSrc?.startsWith("blob:")
    )
    && (
      !canonicalMedia.sha256Hex
      || !locallyHeldMedia.sha256Hex
      || canonicalMedia.sha256Hex === locallyHeldMedia.sha256Hex
    )
  );
  const media = preservesNativeOrVideoSource && canonicalMedia && locallyHeldMedia
    ? {
        ...locallyHeldMedia,
        ...canonicalMedia,
        src: locallyHeldMedia.src,
        originalDownloadSrc:
          locallyHeldMedia.originalDownloadSrc ?? canonicalMedia.originalDownloadSrc,
        liveMomentCapture:
          canonicalMedia.liveMomentCapture ?? locallyHeldMedia.liveMomentCapture ?? null,
        material: canonicalMedia.material ?? locallyHeldMedia.material ?? null,
      }
    : canonicalMedia ?? locallyHeldMedia;

  return {
    ...locallyPublishedOriginal,
    ...canonicalOriginal,
    showOnProfile:
      locallyPublishedOriginal.showOnProfile || canonicalOriginal.showOnProfile,
    longForm: canonicalOriginal.longForm ?? locallyPublishedOriginal.longForm,
    attachments: canonicalOriginal.attachments ?? locallyPublishedOriginal.attachments,
    marketPreview: canonicalOriginal.marketPreview ?? locallyPublishedOriginal.marketPreview,
    media,
    recordMediaSha256Hex:
      canonicalOriginal.recordMediaSha256Hex ?? locallyPublishedOriginal.recordMediaSha256Hex ?? null,
    recordCardMediaSha256Hex:
      canonicalOriginal.recordCardMediaSha256Hex ?? locallyPublishedOriginal.recordCardMediaSha256Hex ?? null,
    hasPbiSignature: signedCanonical.hasPbiSignature,
    pbiReceiptHash: signedCanonical.pbiReceiptHash,
    signedArtifactDownloadUrl: signedCanonical.signedArtifactDownloadUrl,
  };
}

export function mergePbiSignedStateAcrossOriginals(
  heldOriginals: readonly ProfileOriginal[],
  incomingOriginals: readonly ProfileOriginal[],
): ProfileOriginal[] {
  if (heldOriginals.length === 0 || incomingOriginals.length === 0) return [...incomingOriginals];

  const heldById = new Map(heldOriginals.map((original) => [original.id, original] as const));
  const heldByProofIdentity = new Map<string, ProfileOriginal>();
  const heldSignedByProofIdentity = new Map<string, ProfileOriginalPbiSignedState>();

  for (const heldOriginal of heldOriginals) {
    const proofIdentity = profileOriginalProofIdentityKey(heldOriginal);
    if (!proofIdentity) continue;
    const heldProjection = heldByProofIdentity.get(proofIdentity);
    if (!heldProjection || (heldProjection.marketPreview == null && heldOriginal.marketPreview != null)) {
      heldByProofIdentity.set(proofIdentity, heldOriginal);
    }
    if (!originalHasSignedArtifactState(heldOriginal)) continue;
    const accumulated = heldSignedByProofIdentity.get(proofIdentity);
    heldSignedByProofIdentity.set(
      proofIdentity,
      accumulated ? mergeSignedState(accumulated, heldOriginal) : heldOriginal,
    );
  }

  return incomingOriginals.map((incomingOriginal) => {
    const exactHeldOriginal = heldById.get(incomingOriginal.id);
    const proofIdentity = profileOriginalProofIdentityKey(incomingOriginal);
    const proofIdentityHeldOriginal = proofIdentity
      ? heldByProofIdentity.get(proofIdentity)
      : undefined;
    const proofIdentityHeldState = proofIdentity
      ? heldSignedByProofIdentity.get(proofIdentity)
      : undefined;
    const signedState = mergeSignedState(
      incomingOriginal,
      exactHeldOriginal,
      proofIdentityHeldState,
    );
    const marketPreview =
      incomingOriginal.marketPreview ??
      exactHeldOriginal?.marketPreview ??
      proofIdentityHeldOriginal?.marketPreview ??
      null;

    if (!originalHasSignedArtifactState(signedState) && marketPreview === incomingOriginal.marketPreview) {
      return incomingOriginal;
    }
    return {
      ...incomingOriginal,
      marketPreview,
      ...signedState,
    };
  });
}

export function reconcileOptimisticPublishedProfileOriginals(
  heldOriginals: readonly ProfileOriginal[],
  incomingOriginals: readonly ProfileOriginal[],
): {
  heldOriginals: ProfileOriginal[];
  incomingOriginals: ProfileOriginal[];
} {
  const canonicalIncoming = incomingOriginals.filter(
    (original) => !original.id.startsWith("optimistic:profile-original:"),
  );
  if (heldOriginals.length === 0 || canonicalIncoming.length === 0) {
    return {
      heldOriginals: [...heldOriginals],
      incomingOriginals: [...incomingOriginals],
    };
  }

  const canonicalByProofIdentity = new Map<string, ProfileOriginal[]>();
  const canonicalByPulseCoordinate = new Map<string, ProfileOriginal[]>();
  for (const canonicalOriginal of canonicalIncoming) {
    const proofIdentity = profileOriginalProofIdentityKey(canonicalOriginal);
    if (proofIdentity) {
      canonicalByProofIdentity.set(
        proofIdentity,
        [...(canonicalByProofIdentity.get(proofIdentity) ?? []), canonicalOriginal],
      );
    }
    const pulseCoordinate = profileOriginalPulseCoordinateKey(canonicalOriginal);
    if (pulseCoordinate) {
      canonicalByPulseCoordinate.set(
        pulseCoordinate,
        [...(canonicalByPulseCoordinate.get(pulseCoordinate) ?? []), canonicalOriginal],
      );
    }
  }

  const resolvedOptimisticIds = new Set<string>();
  const enrichedCanonicalById = new Map<string, ProfileOriginal>();
  for (const heldOriginal of heldOriginals) {
    if (!heldOriginal.id.startsWith("optimistic:profile-original:")) continue;

    const proofIdentity = profileOriginalProofIdentityKey(heldOriginal);
    const exactCandidates = proofIdentity
      ? canonicalByProofIdentity.get(proofIdentity) ?? []
      : [];
    const pulseCoordinate = profileOriginalPulseCoordinateKey(heldOriginal);
    const pulseCandidates = pulseCoordinate
      ? canonicalByPulseCoordinate.get(pulseCoordinate) ?? []
      : [];
    const candidates = exactCandidates.length === 1
      ? exactCandidates
      : exactCandidates.length === 0 && pulseCandidates.length === 1
        ? pulseCandidates
        : [];
    const canonicalOriginal = candidates[0];
    if (!canonicalOriginal) continue;

    resolvedOptimisticIds.add(heldOriginal.id);
    const currentCanonical =
      enrichedCanonicalById.get(canonicalOriginal.id) ?? canonicalOriginal;
    enrichedCanonicalById.set(
      canonicalOriginal.id,
      mergeKnownPublishedProfileOriginal(currentCanonical, heldOriginal),
    );
  }

  if (resolvedOptimisticIds.size === 0) {
    return {
      heldOriginals: [...heldOriginals],
      incomingOriginals: [...incomingOriginals],
    };
  }

  return {
    heldOriginals: heldOriginals.filter(
      (original) => !resolvedOptimisticIds.has(original.id),
    ),
    incomingOriginals: incomingOriginals.map(
      (original) => enrichedCanonicalById.get(original.id) ?? original,
    ),
  };
}

/**
 * Incremental route hydration is a servant projection of already-held proof
 * truth. Reconcile an optimistic local projection with its canonical row by
 * proof identity before appending unseen rows, so one proof object can never
 * render twice while a slower public projection catches up.
 */
export function mergeProfileOriginalPagePreservingProofIdentity(
  heldOriginals: readonly ProfileOriginal[],
  incomingOriginals: readonly ProfileOriginal[],
): Readonly<{
  originals: ProfileOriginal[];
  appendedCount: number;
}> {
  const reconciled = reconcileOptimisticPublishedProfileOriginals(
    heldOriginals,
    incomingOriginals,
  );
  const originals = [...reconciled.heldOriginals];
  const seenIds = new Set(originals.map((original) => original.id));
  let appendedCount = 0;
  for (const original of reconciled.incomingOriginals) {
    if (seenIds.has(original.id)) continue;
    originals.push(original);
    seenIds.add(original.id);
    appendedCount += 1;
  }
  return Object.freeze({ originals, appendedCount });
}

export function admitPublishedProfileOriginal(
  canonicalOriginal: ProfileOriginal,
  locallyPublishedOriginal: ProfileOriginal,
): ProfileOriginal {
  if (!profileOriginalPublicationIdentityMatches(
    canonicalOriginal,
    locallyPublishedOriginal,
  )) return locallyPublishedOriginal;
  return mergeKnownPublishedProfileOriginal(
    canonicalOriginal,
    locallyPublishedOriginal,
  );
}
