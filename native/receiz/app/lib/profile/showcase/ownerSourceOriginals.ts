import type { ProfileOriginal } from "../types";
import { requireOpenedImportedProofSource, type OpenedImportedProofSource } from "./importedSource";
import { extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import { COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME, decodeCompleteLegacyShowcaseMigrationPayload } from "./legacyMigrationPayload";

/** Project only beneath canonical enclosing source custody. Migration Original
 * rows remain exact members of their existing sealed partition. */
export async function readOwnerSourceOriginals(source: OpenedImportedProofSource): Promise<readonly ProfileOriginal[]> {
  requireOpenedImportedProofSource(source);
  const continuity = source.verification.assetContinuity;
  if (continuity?.state === "verified" && continuity.carrier === "portable_asset"
    && continuity.document.payload.mimeType === COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME) {
    const payload = await extractReceizPortableAssetPayload(continuity.document);
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload.bytes));
    if (body.ownerReceizIdentity !== continuity.ownerReceizId) throw new TypeError("SHOWCASE_LEGACY_PARTITION_OWNER_INVALID");
    return decodeCompleteLegacyShowcaseMigrationPayload(payload.bytes);
  }
  return source.projection.carriedOriginal ? [source.projection.carriedOriginal as ProfileOriginal] : [];
}

export async function readOwnerSourceOriginal(source: OpenedImportedProofSource, originalId?: string): Promise<ProfileOriginal | null> {
  const originals = await readOwnerSourceOriginals(source);
  if (originalId === undefined) return originals.length === 1 ? originals[0]! : null;
  const original = originals.find(original => original.id === originalId);
  if (!original) throw new TypeError("SHOWCASE_SOURCE_ORIGINAL_MISSING");
  return original;
}
