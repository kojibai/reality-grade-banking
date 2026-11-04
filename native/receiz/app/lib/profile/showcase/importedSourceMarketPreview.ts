import type { ProfileOriginal } from "../types";
import { deriveProfileOriginalMarketPreviewFromProofCoordinates } from "../marketPreviewFromProofObject";
import { projectVerifierIdentityDisplay } from "@/app/verify/identityDisplay";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { requireOpenedImportedProofSource, type OpenedImportedProofSource } from "./importedSource";
import { projectImportedSourceOriginal } from "./importedSourceProjection";
import {buildProofBearingReceizVPathFromBundle} from "../../documentSeal/proofBearingVLink";
import {coerceReceizProofBundle} from "../../../utils/receizProofBundle";

// Canonically evaluated absence is immutable for these exact Source bytes.
// Retain only tiny display facts, never proof blobs, accounts or access grants.
const withoutDisplayCreator = new Set<string>();
export function importedSourceMarketPreviewNeedsRecovery(original: ProfileOriginal): boolean {
  return Boolean(original.showOnProfile && !original.marketPreview && original.importedSource
    && !withoutDisplayCreator.has(original.importedSource.reference.artifactSha256));
}

/** Display beneath already admitted custody only. Keep the sealed projection,
 * account creator, ownership, PBI and earning eligibility exactly unchanged. */
export function attachImportedSourceMarketPreviews(input: Readonly<{
  originals: readonly ProfileOriginal[]; ownerUserId: string; ownerUsername: string;
  sources: readonly OpenedImportedProofSource[];
}>): ProfileOriginal[] {
  const sources = new Map<string, OpenedImportedProofSource>();
  for (const source of input.sources) {
    requireOpenedImportedProofSource(source);
    sources.set(source.descriptor.artifactSha256, source);
  }
  return input.originals.map(original => {
    if (!original.showOnProfile || !original.importedSource) return original;
    const source = sources.get(original.importedSource.reference.artifactSha256);
    if (!source) return original;
    const canonical = projectImportedSourceOriginal(source, original.importedSource.reference);
    if (canonical.id !== original.id || canonical.pulse !== original.pulse
      || jcsCanonicalize(canonical.importedSource) !== jcsCanonicalize(original.importedSource)) return original;
    let terminal = source;
    while (terminal.referencedSources?.[0]) terminal = terminal.referencedSources[0];
    // Same receipt projector as Receiz's public display, beneath the already
    // opened exact Source. No recovery, lookup or second verification enters.
    const bundle=terminal.projection.bankAsset?coerceReceizProofBundle(terminal.verification.bundle):null;
    if(bundle){const verifyPath=buildProofBearingReceizVPathFromBundle(bundle);original={...original,verifyPath,verifyUrl:new URL(verifyPath,'https://receiz.com').href};}
    if(original.marketPreview)return original;
    const creator = projectVerifierIdentityDisplay(terminal.verification).originalCreator;
    if (!creator.receizId || !creator.username) {
      withoutDisplayCreator.add(source.descriptor.artifactSha256);
      if (withoutDisplayCreator.size > 256) withoutDisplayCreator.delete(withoutDisplayCreator.values().next().value!);
      return original;
    }
    const marketPreview = deriveProfileOriginalMarketPreviewFromProofCoordinates({
      originalId: original.id, createdAt: original.createdAt, pulse: original.pulse,
      ownerUserId: input.ownerUserId, ownerUsername: input.ownerUsername,
      creatorUserId: creator.receizId, creatorUsername: creator.username,
      creatorVerified: original.hasPbiSignature === true, hasPbiSignature: original.hasPbiSignature,
      importedSource: original.importedSource,
    });
    return marketPreview ? { ...original, marketPreview } : original;
  });
}


type DisplaySnapshot = Readonly<{
  ownerUserId: string; username: string; originals: readonly ProfileOriginal[];
  retainedPublicInventory?: Readonly<{ sourceArtifactDigest: string }>;
  sourceMarketPreviewArtifactDigest?: string;
}>;
type RetainedInput = Readonly<{
  originals: readonly ProfileOriginal[]; ownerUserId: string; ownerUsername: string;
  sourceArtifactDigest: string; retained: DisplaySnapshot | null;
}>;

/** Reuse only annotations beneath this exact accepted Source. This does not
 * add membership or allow a derivative snapshot to replace a held Original. */
export function reuseRetainedImportedSourceMarketPreviews(input: RetainedInput): ProfileOriginal[] {
  const retained = input.retained;
  if (!retained || retained.ownerUserId !== input.ownerUserId
    || (retained.sourceMarketPreviewArtifactDigest ?? retained.retainedPublicInventory?.sourceArtifactDigest) !== input.sourceArtifactDigest) return [...input.originals];
  const candidates = new Map(retained.originals.map(original => [original.id, original]));
  return input.originals.map(original => {
    const candidate = candidates.get(original.id);
    if (original.marketPreview || !original.importedSource || !candidate?.marketPreview?.livePulseSeed
      || candidate.pulse !== original.pulse || candidate.hasPbiSignature !== original.hasPbiSignature
      || candidate.pbiReceiptHash !== original.pbiReceiptHash
      || jcsCanonicalize(candidate.importedSource ?? null) !== jcsCanonicalize(original.importedSource)) return original;
    return { ...original, marketPreview: candidate.marketPreview };
  });
}

/** New publications supply their existing canonical opens. Old missing display
 * metadata needs one exact Source recovery, then the normal snapshot retains
 * it. Repeated references share an open; independent reads are bounded to four.
 * Missing presentation evidence never erases the already admitted Original. */
export async function restoreImportedSourceMarketPreviews(input: RetainedInput & Readonly<{
  sources?: readonly OpenedImportedProofSource[];
  reopen?: (reference: NonNullable<ProfileOriginal["importedSource"]>["reference"]) => Promise<OpenedImportedProofSource>;
}>): Promise<ProfileOriginal[]> {
  let originals = reuseRetainedImportedSourceMarketPreviews(input);
  const sources = [...input.sources ?? []];
  originals = attachImportedSourceMarketPreviews({ ...input, originals, sources });
  if (!input.reopen || input.sources !== undefined) return originals;
  const references = new Map(originals.filter(importedSourceMarketPreviewNeedsRecovery)
    .map(original => [original.importedSource!.reference.artifactSha256, original.importedSource!.reference]));
  const missing = [...references.values()];
  for (let offset = 0; offset < missing.length; offset += 4) {
    const opened = await Promise.allSettled(missing.slice(offset, offset + 4).map(reference => input.reopen!(reference)));
    for (const result of opened) if (result.status === "fulfilled") sources.push(result.value);
  }
  return attachImportedSourceMarketPreviews({ ...input, originals, sources });
}
