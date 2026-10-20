"use client";
import { sealAndAdmitComposerProfileOriginalChild, type ComposerProfileOriginalChildAdmitter, type ComposerProfileOriginalChildSealer } from "./composerChild";
import { encodeImportedSourceReference, IMPORTED_SOURCE_REFERENCE_MIME, projectImportedSourceOriginal } from "./importedSourceProjection";
import type { ImportedProofSourceReference, OpenedImportedProofSource } from "./importedSource";
const placements = new WeakSet<object>();
export type ImportedSourcePlacement = Awaited<ReturnType<typeof sealAndAdmitImportedSourcePlacement>>;
export function requireImportedSourcePlacement(value: ImportedSourcePlacement): void {
  if (!placements.has(value)) throw new TypeError("IMPORTED_SOURCE_PLACEMENT_ADMISSION_REQUIRED");
}

/** Only the placement is sealed by this owner. The original source bytes,
 * ownership, creator and signatures are never altered or resealed. */
export async function sealAndAdmitImportedSourcePlacement(input: Readonly<{
  source: OpenedImportedProofSource;
  reference: ImportedProofSourceReference;
  ownerReceizId: string;
  immutableVersion: string;
  seal?: ComposerProfileOriginalChildSealer;
  admit?: ComposerProfileOriginalChildAdmitter;
}>) {
  const original = projectImportedSourceOriginal(input.source, input.reference);
  const admission = await sealAndAdmitComposerProfileOriginalChild({
    renderedSealedBytes: encodeImportedSourceReference(input.reference),
    renderedMimeType: IMPORTED_SOURCE_REFERENCE_MIME,
    ownerReceizId: input.ownerReceizId, immutableVersion: input.immutableVersion,
    routeProjection: original, seal: input.seal, admit: input.admit,
  });
  const placement = Object.freeze({ admission, original, source: input.source });
  placements.add(placement);
  return placement;
}
