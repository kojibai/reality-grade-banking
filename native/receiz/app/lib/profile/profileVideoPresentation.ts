import type { ProfileOriginal } from "./types";

type ProfileVideoMedia = Pick<
  NonNullable<ProfileOriginal["media"]>,
  | "kind"
  | "src"
  | "playbackSrc"
  | "originalDownloadSrc"
  | "derivativeDownloadSrc"
  | "derivativeDownloadMime"
  | "videoPosterSrc"
  | "material"
>;

export type ProfileVideoPresentation = Readonly<{
  playbackSrc: string | null;
  pendingPosterSrc: string | null;
}>;

function trimmed(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

const HEX64_RE = /^[0-9a-f]{64}$/;

export function profileMaterialStreamingArtifactPath(
  proofObjectUrl: string | null | undefined,
): string | null {
  const raw = trimmed(proofObjectUrl);
  if (!raw) return null;
  try {
    const url = new URL(raw, "https://receiz.com");
    const token = new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get("material") ?? "";
    const prefix = token.startsWith("rmc2:")
      ? "rmc2:"
      : token.startsWith("rmc1:")
        ? "rmc1:"
        : null;
    if (!prefix) return null;
    const packageDigest = token.slice(prefix.length).toLowerCase();
    if (!HEX64_RE.test(packageDigest)) return null;
    return `/api/proof-material/packages/${packageDigest}/artifact`;
  } catch {
    return null;
  }
}

/**
 * The Moment Record remains an inspectable receipt beneath the proof object;
 * it is never a lawful primary presentation for an image whose exact sealed
 * material is already carried by the public proof coordinate.
 */
export function projectProfileOriginalMaterialFirstPaint(
  original: ProfileOriginal,
): ProfileOriginal {
  const media = original.media;
  if (!media || media.kind !== "image" || !media.material) return original;
  const artifactPath = profileMaterialStreamingArtifactPath(
    media.material.proofObjectUrl,
  );
  if (!artifactPath) return original;
  const src = trimmed(media.src);
  const derivative = trimmed(media.derivativeDownloadSrc);
  const receipt = trimmed(media.receiptDownloadSrc);
  const isReceiptRepresentation = !src || src === derivative || src === receipt;
  if (!isReceiptRepresentation) return original;
  return {
    ...original,
    media: {
      ...media,
      src: artifactPath,
      imageVariants: null,
    },
  };
}

/**
 * A material-backed video may arrive on first paint with its deterministic PNG
 * representation while the carried exact bytes reconstruct. That PNG is a
 * poster beneath the sealed video proof object; it must never be passed to a
 * video decoder as though it were the playable source.
 */
export function resolveProfileVideoPresentation(
  media: ProfileVideoMedia | null | undefined,
): ProfileVideoPresentation {
  if (!media || media.kind !== "video") {
    return Object.freeze({ playbackSrc: null, pendingPosterSrc: null });
  }

  const playbackSrc = trimmed(media.playbackSrc);
  if (playbackSrc) {
    return Object.freeze({ playbackSrc, pendingPosterSrc: null });
  }

  const src = trimmed(media.src);
  const originalDownloadSrc = trimmed(media.originalDownloadSrc);
  if (
    src
    && /^\/api\/profile\/originals\/download(?:\?|$)/.test(src)
    && originalDownloadSrc
  ) {
    return Object.freeze({ playbackSrc: originalDownloadSrc, pendingPosterSrc: null });
  }

  if (src?.startsWith("blob:")) {
    return Object.freeze({ playbackSrc: src, pendingPosterSrc: null });
  }

  const streamedSealedArtifact = profileMaterialStreamingArtifactPath(
    media.material?.proofObjectUrl,
  );
  if (streamedSealedArtifact) {
    return Object.freeze({ playbackSrc: streamedSealedArtifact, pendingPosterSrc: null });
  }

  const derivativeDownloadSrc = trimmed(media.derivativeDownloadSrc);
  const derivativeDownloadMime = trimmed(media.derivativeDownloadMime)?.toLowerCase() ?? null;
  const pendingMaterialPoster = Boolean(
    media.material
    && src
    && derivativeDownloadSrc
    && src === derivativeDownloadSrc
    && derivativeDownloadMime?.startsWith("image/"),
  );
  if (pendingMaterialPoster) {
    return Object.freeze({
      playbackSrc: null,
      pendingPosterSrc: trimmed(media.videoPosterSrc) ?? derivativeDownloadSrc,
    });
  }

  return Object.freeze({ playbackSrc: src, pendingPosterSrc: null });
}
