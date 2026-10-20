export type EconomyProjectionLineage = Readonly<{
  economyShowcaseArtifactDigest?: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
}>;

function isArtifactDigest(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function projectionCanAppendToHeldEconomyTruth(input: Readonly<{
  heldArtifactDigest: string | null;
  candidateArtifactDigest: string;
  candidateParentArtifactDigests: readonly string[];
}>): boolean {
  if (!isArtifactDigest(input.candidateArtifactDigest)) return false;
  if (input.heldArtifactDigest === null) return true;
  if (!isArtifactDigest(input.heldArtifactDigest)) return false;
  return input.candidateArtifactDigest === input.heldArtifactDigest
    || input.candidateParentArtifactDigests.includes(
      input.heldArtifactDigest,
    );
}

export function economyProjectionLineageCanReplace(
  held: EconomyProjectionLineage | null | undefined,
  incoming: EconomyProjectionLineage | null | undefined,
): boolean {
  const candidateArtifactDigest =
    isArtifactDigest(incoming?.economyShowcaseArtifactDigest)
      ? incoming.economyShowcaseArtifactDigest
      : null;
  if (!candidateArtifactDigest) return false;

  const candidateParentArtifactDigests = Array.isArray(
    incoming?.economyShowcaseParentArtifactDigests,
  )
    ? incoming.economyShowcaseParentArtifactDigests.filter(isArtifactDigest)
    : [];
  const heldArtifactDigest =
    isArtifactDigest(held?.economyShowcaseArtifactDigest)
      ? held.economyShowcaseArtifactDigest
      : null;

  return projectionCanAppendToHeldEconomyTruth({
    heldArtifactDigest,
    candidateArtifactDigest,
    candidateParentArtifactDigests,
  });
}
