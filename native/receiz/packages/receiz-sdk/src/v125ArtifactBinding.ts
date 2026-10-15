import { canonicalizeReceizV122 } from "./v122Canonical.js";
import {
  createReceizArtifactAdmissionEngine,
  verifyReceizArtifactAdmission,
} from "./artifactAdmission.js";
import {
  verifyReceizArtifact,
  verifyReceizArtifactWithCanonicalRoots,
} from "./artifactVerification.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { sha256ReceizBytes } from "./artifacts.js";
import {
  receizBase64UrlDecode,
  receizBase64UrlEncode,
} from "./identity.js";
import {
  extractReceizPortableAssetPayload,
  parseReceizPortableAssetDocument,
  type ReceizPortableAssetDocument,
} from "./portableAsset.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import {
  closedRecord,
  digest,
  freeze,
  text,
} from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";

export type ReceizV125EnclosingArtifactVerifierOptions = Readonly<{
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;

export type ReceizV125EnclosingArtifactBinding = Readonly<{
  artifactSha256: string;
  artifactPayloadSha256: string;
  proofObjectId: string;
  ownerReceizId: string;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
}>;

export type ReceizV125VerifiedArtifactPayload<T> = ReceizV125EnclosingArtifactBinding & Readonly<{
  projection: T;
}>;

export type ReceizV125VerifiedArtifactPayloadBytes = ReceizV125EnclosingArtifactBinding & Readonly<{
  payloadBytes: Uint8Array;
  payloadMimeType: string;
}>;

const bindingAdmissions = new WeakMap<object, ReceizVerifiedArtifactAdmission>();
/** Internal custody only: a cloned projection cannot recreate canonical admission. */
export function readReceizV125BindingAdmission(binding: ReceizV125EnclosingArtifactBinding) {
  const admission = bindingAdmissions.get(binding);
  if (!admission) throw new TypeError("V125_ARTIFACT_BINDING_CUSTODY_REQUIRED");
  return admission;
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function exactArtifact(value: unknown, code: string): ReceizPortableSealedArtifactV124 {
  const record = closedRecord(value, [
    "schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256",
  ], code);
  if (record.schema !== "receiz.sealed-artifact-bytes.v124"
    || typeof record.exactBytesB64u !== "string" || !BASE64URL.test(record.exactBytesB64u)) {
    throw new TypeError(code);
  }
  const exactBytes = receizBase64UrlDecode(record.exactBytesB64u);
  if (exactBytes.byteLength === 0 || receizBase64UrlEncode(exactBytes) !== record.exactBytesB64u) {
    throw new TypeError(code);
  }
  return freeze({
    schema: "receiz.sealed-artifact-bytes.v124" as const,
    exactBytesB64u: record.exactBytesB64u,
    filename: text(record.filename, code),
    mimeType: text(record.mimeType, code),
    artifactSha256: digest(record.artifactSha256, code),
    payloadSha256: digest(record.payloadSha256, code),
  });
}

function exactVerifier(
  value: unknown,
  code: string,
): ReceizV125EnclosingArtifactVerifierOptions {
  const hasRoots = value !== null && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, "canonicalSignatureV4RootPublicKeys");
  const record = closedRecord(value, hasRoots ? ["canonicalSignatureV4RootPublicKeys"] : [], code);
  if (!hasRoots) return freeze({});
  if (!(record.canonicalSignatureV4RootPublicKeys instanceof Map)) throw new TypeError(code);
  return freeze({
    canonicalSignatureV4RootPublicKeys: new Map(record.canonicalSignatureV4RootPublicKeys),
  });
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/**
 * Package-internal composition seam. The callback is invoked only after the
 * canonical v124 verifier and portable-state admission both retain custody of
 * the exact enclosing proof bytes.
 */
export async function openVerifiedReceizV125ArtifactPayload<T>(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
  expectedPayloadMimeType: string;
  enclosingProofError: string;
  payloadError: string;
}>, parseVerifiedPayload: (
  payloadBytes: Uint8Array,
  binding: ReceizV125EnclosingArtifactBinding,
) => T | Promise<T>): Promise<ReceizV125VerifiedArtifactPayload<T>> {
  const opened = await openVerifiedReceizV125ArtifactPayloadBytes({
    artifact: input.artifact,
    verifier: input.verifier,
    enclosingProofError: input.enclosingProofError,
    payloadError: input.payloadError,
  });
  try {
    const expectedPayloadMimeType = text(input.expectedPayloadMimeType, input.payloadError);
    if (opened.payloadMimeType !== expectedPayloadMimeType) throw new TypeError(input.payloadError);
    const projection = await parseVerifiedPayload(opened.payloadBytes.slice(), opened);
    return freeze({
      artifactSha256: opened.artifactSha256,
      artifactPayloadSha256: opened.artifactPayloadSha256,
      proofObjectId: opened.proofObjectId,
      ownerReceizId: opened.ownerReceizId,
      ownership: opened.ownership,
      provenance: opened.provenance,
      projection,
    });
  } catch {
    throw new TypeError(input.payloadError);
  }
}

export async function openVerifiedReceizV125ArtifactPayloadBytes(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
  enclosingProofError: string;
  payloadError: string;
}>): Promise<ReceizV125VerifiedArtifactPayloadBytes> {
  let artifact: ReceizPortableSealedArtifactV124;
  let verifier: ReceizV125EnclosingArtifactVerifierOptions;
  let portable: ReceizPortableAssetDocument;
  let binding: ReceizV125EnclosingArtifactBinding;
  try {
    const record = closedRecord(input, [
      "artifact", "verifier", "enclosingProofError", "payloadError",
    ], input.enclosingProofError);
    artifact = exactArtifact(record.artifact, input.enclosingProofError);
    verifier = exactVerifier(record.verifier, input.enclosingProofError);
    const exactBytes = receizBase64UrlDecode(artifact.exactBytesB64u);
    const file = new File([strictArrayBuffer(exactBytes)], artifact.filename, { type: artifact.mimeType });
    const verification = verifier.canonicalSignatureV4RootPublicKeys
      ? await verifyReceizArtifactWithCanonicalRoots(file, verifier.canonicalSignatureV4RootPublicKeys)
      : await verifyReceizArtifact(file);
    if (verification.status !== "verified-artifact"
      || verification.artifactDigest.value !== artifact.artifactSha256
      || verification.payloadDigest.value !== artifact.payloadSha256) {
      throw new TypeError(input.enclosingProofError);
    }
    const admitted = await createReceizArtifactAdmissionEngine(
      verifier.canonicalSignatureV4RootPublicKeys
        ? { canonicalSignatureV4RootPublicKeys: verifier.canonicalSignatureV4RootPublicKeys }
        : {},
    )(verification, { profile: "portable-state" });
    const admission = await verifyReceizArtifactAdmission(admitted);
    if ("code" in admission || admission.profile !== "portable-state"
      || admission.verdict !== "bearer-recovery"
      || admission.artifactSha256 !== artifact.artifactSha256
      || admission.payloadSha256 !== artifact.payloadSha256
      || admission.ownerReceizId === null
      || admission.authority.admissionIsProofAuthority !== false
      || admission.authority.strongerTruth !== "sealed-receiz-proof-object") {
      throw new TypeError(input.enclosingProofError);
    }
    const verifiedPayloadBytes = admission.verifiedPayload.bytes;
    if (await sha256ReceizBytes(verifiedPayloadBytes) !== artifact.payloadSha256) {
      throw new TypeError(input.enclosingProofError);
    }
    const decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(verifiedPayloadBytes)) as unknown;
    portable = await parseReceizPortableAssetDocument(decoded);
    // Canonical append preserves existing namespace bytes, including member order
    // and whitespace. Compare every parsed field semantically without replacing
    // the exact admitted bytes or dropping unknown namespaces.
    if (canonicalizeReceizV122(portable) !== canonicalizeReceizV122(decoded)
      || portable.assetType !== "proof_object"
      || portable.ownership.ownerReceizId !== admission.ownerReceizId
      || portable.payload.sha256 !== admission.artifactId) {
      throw new TypeError(input.enclosingProofError);
    }
    binding = freeze({
      artifactSha256: admission.artifactSha256,
      artifactPayloadSha256: admission.payloadSha256,
      proofObjectId: admission.artifactId,
      ownerReceizId: admission.ownerReceizId,
      ownership: portable.ownership,
      provenance: portable.provenance,
    });
    bindingAdmissions.set(binding, admission);
  } catch {
    throw new TypeError(input.enclosingProofError);
  }

  try {
    const extracted = await extractReceizPortableAssetPayload(portable);
    if (extracted.assetType !== "proof_object" || extracted.sha256 !== binding.proofObjectId) {
      throw new TypeError(input.payloadError);
    }
    const result = Object.freeze({
      ...binding,
      payloadBytes: extracted.bytes.slice(),
      payloadMimeType: extracted.mimeType,
    });
    bindingAdmissions.set(result, readReceizV125BindingAdmission(binding));
    return result;
  } catch {
    throw new TypeError(input.payloadError);
  }
}
