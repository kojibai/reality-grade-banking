import { resolveProfileIdentityCreationKaiMicroPulse, wholeKaiPulseFromMicroPulse } from "./profileIdentityCreationCoordinate";
import type { ProfileOriginal, ProfileViewData } from "@/app/lib/profile/types";
import { profileOriginalIsIdentityArtwork } from "./profileIdentityArtworkPresentation";

export type ProfileIdentityOriginalKind = "seal" | "record";

export function profileIdentityOriginalKind(
  original: ProfileOriginal,
): ProfileIdentityOriginalKind | null {
  const binding = original.identityArtifact;
  const media = original.media;
  if (
    !binding
    || binding.schema !== "receiz.profile.identity-artifact-binding.v1"
    || (binding.kind !== "seal" && binding.kind !== "record")
    || binding.authority.bindingIsProofAuthority !== false
    || binding.authority.strongerTruth !== "sealed-receiz-proof-object"
    || !/^[0-9a-f]{64}$/u.test(binding.sourceSha256Hex)
    || !/^[0-9a-f]{64}$/u.test(binding.sealedArtifactSha256Hex)
    || !/^[0-9a-f]{64}$/u.test(binding.proofHead)
    || !media
  ) return null;

  const sourceHashes = new Set(
    [media.sha256Hex, media.derivativeDownloadSha256Hex]
      .map((value) => value?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  );
  const sealedHashes = new Set(
    [media.originalDownloadSha256Hex, media.material?.sealedArtifactSha256Hex]
      .map((value) => value?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  );
  if (!sourceHashes.has(binding.sourceSha256Hex) || !sealedHashes.has(binding.sealedArtifactSha256Hex)) {
    return null;
  }
  return binding.kind;
}

/** Public category membership follows verified identity binding and visibility. */
export function isPublicProfileIdentityOriginal(original: ProfileOriginal): boolean {
  return original.showOnProfile && profileIdentityOriginalKind(original) !== null;
}

/**
 * Category membership also preserves pre-binding artwork presentation. It does
 * not admit identity, confer PBI signatures, or select/deduplicate genesis.
 * An explicitly supplied invalid binding cannot fall through to legacy labels.
 */
export function isPublicProfileIdentityCategoryOriginal(original: ProfileOriginal): boolean {
  const legacyName = (original.media?.name ?? original.media?.originalDownloadName ?? original.media?.derivativeDownloadName ?? "").trim();
  return isPublicProfileIdentityOriginal(original)
    || (original.showOnProfile
      && original.identityArtifact == null
      && /^(?:identity-seal|identity-record|identity-card)-/i.test(legacyName)
      && profileOriginalIsIdentityArtwork(original));
}

function normalizedPulse(value: string | null | undefined): bigint | null {
  const pulse = (value ?? "").trim();
  if (!/^\d+$/.test(pulse)) return null;
  try {
    return BigInt(pulse);
  } catch {
    return null;
  }
}

function earlierIdentityProof(left: ProfileOriginal, right: ProfileOriginal): ProfileOriginal {
  const leftPulse = normalizedPulse(left.pulse);
  const rightPulse = normalizedPulse(right.pulse);
  if (leftPulse !== null && rightPulse !== null && leftPulse !== rightPulse) {
    return leftPulse < rightPulse ? left : right;
  }
  if (leftPulse !== null && rightPulse === null) return left;
  if (leftPulse === null && rightPulse !== null) return right;

  const leftIdentity = `${left.code ?? ""}:${left.pulse ?? ""}:${left.id}`;
  const rightIdentity = `${right.code ?? ""}:${right.pulse ?? ""}:${right.id}`;
  return leftIdentity.localeCompare(rightIdentity) <= 0 ? left : right;
}

/**
 * Identity proof history is append-only, while showcase presentation exposes
 * exactly its genesis pair. The lowest pulse is the deterministic first Seal
 * or Record; later identity appends remain in proof history without becoming
 * additional showcase objects.
 */
export function projectProfileIdentityGenesisShowcase(
  originals: readonly ProfileOriginal[],
): ProfileOriginal[] {
  const genesisByKind = new Map<ProfileIdentityOriginalKind, ProfileOriginal>();
  for (const original of originals) {
    const kind = profileIdentityOriginalKind(original);
    if (!kind) continue;
    const current = genesisByKind.get(kind);
    genesisByKind.set(kind, current ? earlierIdentityProof(current, original) : original);
  }

  return originals.filter((original) => {
    const kind = profileIdentityOriginalKind(original);
    return !kind || genesisByKind.get(kind)?.id === original.id;
  });
}

/** Original export/sealing events do not establish the enclosing account's birth. */
export function profileIdentityGenesisKaiPulse(
  _originals: readonly ProfileOriginal[],
  creation?: Pick<ProfileViewData["profile"], "createdAt" | "creationKaiMicroPulse" | "creationKaiSource">,
): string | null {
  if (!creation) return null;
  return wholeKaiPulseFromMicroPulse(resolveProfileIdentityCreationKaiMicroPulse({
    originalAccountCreatedAt: creation.createdAt,
    persistedMicroPulse: creation.creationKaiMicroPulse,
    persistedSource: creation.creationKaiSource,
  }));
}
