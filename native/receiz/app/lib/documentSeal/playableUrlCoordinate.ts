import {
  buildReceizMaterialVUrl,
  RECEIZ_MATERIAL_CAPSULE_PREFIX,
  RECEIZ_MATERIAL_FRAGMENT_KEY,
} from "@/app/lib/documentSeal/materialCapsule";
import {
  decodeReceizPlayableUrlCoordinate,
  encodeReceizPlayableUrlCoordinate,
  parseReceizReversibleCoordinateToken,
  RECEIZ_REVERSIBLE_COORDINATE_PREFIX,
  serializeReceizReversibleCoordinate,
  type ReceizReversibleCoordinate,
} from "@/app/lib/documentSeal/reversibleCoordinate";
import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";

/**
 * Starts from the proven self-contained playable URL, then coheres it into the
 * smallest exact variable-width reversible coordinate admitted by v1.
 */
export async function buildReceizMaterialVUrlCoordinate(
  input: Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    proofBundle: ReceizProofBundle;
  }>,
  publicOrigin = "https://receiz.com",
): Promise<Readonly<{
  playableUrl: string;
  coordinateUrl: string;
  coordinate: ReceizReversibleCoordinate;
}>> {
  const playableUrl = buildReceizMaterialVUrl(input, publicOrigin);
  const coordinate = await encodeReceizPlayableUrlCoordinate(playableUrl);
  const coordinateUrl = new URL(playableUrl);
  coordinateUrl.hash = new URLSearchParams({
    [RECEIZ_MATERIAL_FRAGMENT_KEY]: serializeReceizReversibleCoordinate(coordinate),
  }).toString();
  return Object.freeze({
    playableUrl,
    coordinateUrl: coordinateUrl.toString(),
    coordinate,
  });
}

export type ResolvedReceizMaterialPresentation = Readonly<{
  presentationUrl: string;
  verificationUrl: string;
  materialToken: string;
  carriedByCoordinate: boolean;
}>;

/**
 * Restores a coordinate-carried proof URL locally. The result still enters the
 * native sealed-artifact verifier before any media bytes are projected.
 */
export async function resolveReceizMaterialPresentation(
  presentationUrl: string,
): Promise<ResolvedReceizMaterialPresentation> {
  const presented = new URL(presentationUrl, "https://receiz.com");
  const presentedToken = new URLSearchParams(
    presented.hash.startsWith("#") ? presented.hash.slice(1) : presented.hash,
  ).get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  if (!presentedToken) throw new TypeError("RECEIZ_MATERIAL_URL_CAPSULE_REQUIRED");
  if (!presentedToken.startsWith(RECEIZ_REVERSIBLE_COORDINATE_PREFIX)) {
    return Object.freeze({
      presentationUrl: presented.toString(),
      verificationUrl: presented.toString(),
      materialToken: presentedToken,
      carriedByCoordinate: false,
    });
  }

  const verificationUrl = await decodeReceizPlayableUrlCoordinate(
    parseReceizReversibleCoordinateToken(presentedToken),
  );
  const reconstructed = new URL(verificationUrl);
  if (
    reconstructed.origin !== "https://receiz.com"
    || reconstructed.pathname !== presented.pathname
    || reconstructed.searchParams.get("c") !== presented.searchParams.get("c")
  ) throw new TypeError("RECEIZ_MATERIAL_COORDINATE_ROUTE_BINDING_REJECTED");
  const materialToken = new URLSearchParams(
    reconstructed.hash.startsWith("#") ? reconstructed.hash.slice(1) : reconstructed.hash,
  ).get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  if (!materialToken?.startsWith(RECEIZ_MATERIAL_CAPSULE_PREFIX)) {
    throw new TypeError("RECEIZ_MATERIAL_COORDINATE_INLINE_PROOF_OBJECT_REQUIRED");
  }
  return Object.freeze({
    presentationUrl: presented.toString(),
    verificationUrl,
    materialToken,
    carriedByCoordinate: true,
  });
}
