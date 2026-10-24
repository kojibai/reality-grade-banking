import { parseReceizPortableAssetDocument, deriveReceizPortableOwnershipContinuity, ReceizPortableAssetError, type ReceizPortableAssetDocument } from '../../packages/receiz-sdk/src/portableAssetReader';
import type { ReceizProofBundle, ReceizNativeOwnershipHistoryEntry } from '../utils/receizProofBundle';
import type { ReceizAssetContinuityVerification } from '../../packages/receiz-sdk/src/verifier/canonical';

/** Offline portable-carrier adapter. Composes the established SDK parser and
 * continuity derivation and preserves canonicalSource's signed binding checks.
 * The enclosing reader still verifies the artifact, signature and native namespace.
 * Kept separate from the pure identity display projector to avoid bundling a second
 * artifact/signature/Groth16 verifier into the offline consumers. */
export async function classifyPortableIdentityCarrier(originalBytes: Uint8Array, bundle?: ReceizProofBundle | null): Promise<ReceizAssetContinuityVerification> {
  const nativeRecordSeal = bundle?.nativeRecordSeal ?? null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(originalBytes)) as unknown;
  } catch {
    return { state: "not_applicable" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { state: "not_applicable" };
  const schema = (parsed as Record<string, unknown>).schema;
  if (schema === "receiz.asset_manifest.v1") return { state: "historical_missing" };
  if (schema !== "receiz.portable_asset.v1") return { state: "not_applicable" };
  try {
    const document = await parseReceizPortableAssetDocument(parsed);
    const continuity = await deriveReceizPortableOwnershipContinuity(document);
    const signedContinuity = nativeRecordSeal?.ownershipContinuity ?? null;
    if (nativeRecordSeal && nativeRecordSeal.ownerReceizId !== continuity.ownerReceizId) {
      return { state: "invalid", error: "continuity_identity_mismatch" };
    }
    if (continuity.appendCount > 0 && !signedContinuity) {
      return { state: "invalid", error: "continuity_ownership_attestation_missing" };
    }
    if (signedContinuity && (
      signedContinuity.artifactId !== continuity.artifactId
      || signedContinuity.namespace !== continuity.namespace
      || signedContinuity.genesisOwnerReceizId !== continuity.genesisOwnerReceizId
      || signedContinuity.ownerReceizId !== continuity.ownerReceizId
      || signedContinuity.headReference !== bundle?.receizClaimId
      || signedContinuity.historyDigestSha256 !== continuity.historyDigestSha256
      || signedContinuity.appendCount !== continuity.appendCount
    )) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    return {
      state: "verified",
      carrier: "portable_asset",
      issuerKid: bundle?.signatureV4?.cert.issuerKid ?? null,
      artifactId: document.payload.sha256,
      headReference: bundle?.receizClaimId ?? document.payload.sha256,
      ownerReceizId: continuity.ownerReceizId,
      namespace: document.provenance.root,
      priorHeadReference: document.ownership.proofRef,
      genesisOwnerReceizId: continuity.genesisOwnerReceizId,
      historyDigestSha256: continuity.historyDigestSha256,
      appendCount: continuity.appendCount,
      history: projectPortableOwnershipHistory(
        document,
        bundle?.receizClaimId ?? document.payload.sha256,
        continuity.genesisOwnerReceizId,
        continuity.historyDigestSha256,
      ),
      historyComplete: true,
      document,
    };
  } catch (error) {
    return {
      state: "invalid",
      error: error instanceof ReceizPortableAssetError ? error.code : "continuity_round_trip_failed",
    };
  }
}

function projectPortableOwnershipHistory(
  document: ReceizPortableAssetDocument,
  currentHeadReference: string,
  genesisOwnerReceizId: string,
  currentHistoryDigestSha256: string,
): readonly ReceizNativeOwnershipHistoryEntry[] {
  const ownershipAppends = document.provenance.appends.filter(
    (append) => append.type === "receiz.ownership.bearer-claim.v108",
  );
  const first = ownershipAppends[0];
  const genesisHead = typeof first?.priorHeadReference === "string"
    ? first.priorHeadReference
    : "genesis";
  const genesisDigest = typeof first?.priorHistoryDigestSha256 === "string"
    ? first.priorHistoryDigestSha256
    : currentHistoryDigestSha256;
  const history: ReceizNativeOwnershipHistoryEntry[] = [{
    schema: "receiz.native_ownership_genesis.v1",
    index: 0,
    ownerReceizId: genesisOwnerReceizId,
    headReference: genesisHead,
    historyDigestSha256: genesisDigest,
  }];
  ownershipAppends.forEach((append, index) => {
    const next = ownershipAppends[index + 1];
    history.push({
      schema: "receiz.native_ownership_transfer.v1",
      index: index + 1,
      fromOwnerReceizId: String(append.fromOwnerReceizId),
      toOwnerReceizId: String(append.toOwnerReceizId),
      priorHeadReference: String(append.priorHeadReference),
      sourceArtifactSha256: String(append.sourceArtifactSha256),
      headReference: typeof next?.priorHeadReference === "string"
        ? next.priorHeadReference
        : currentHeadReference,
      historyDigestSha256: index === ownershipAppends.length - 1
        ? currentHistoryDigestSha256
        : String(next?.priorHistoryDigestSha256),
    });
  });
  return history;
}
