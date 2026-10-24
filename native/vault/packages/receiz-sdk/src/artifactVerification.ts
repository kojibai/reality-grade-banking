import { cloneAndFreezeExactValue } from "./exactClone.js";
import {
  ReceizArtifactInputError,
  spoolReceizArtifactInput,
  snapshotReceizArtifactInput,
  type ReceizArtifactInput,
  type ReceizArtifactSnapshot,
} from "./artifactInput.js";
import {
  recognizeStructurallyCompleteReceizBundle,
  verifyReceizArtifactExactBytesCanonical,
  verifyAndExtractReceizDocumentBytesCanonical,
  readVerifiedReceizDocumentBytesCanonical,
} from "./verifier/canonical.js";
import { sha256Hex } from "./verifier/crypto.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import type {
  ReceizArtifactContinuityAssessment,
  ReceizArtifactDigest,
  ReceizArtifactVerification,
  ReceizArtifactVerificationError,
  ReceizPayloadDigest,
  ReceizUnsupportedArtifactReason,
} from "./verifier/types.js";
import {
  RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS,
  ReceizProtocolLimitError,
  assertReceizProtocolMaximum,
  type ReceizProtocolLimitCode,
} from "./verificationLimits.js";

export type {
  ReceizArtifactContinuityAssessment,
  ReceizArtifactDigest,
  ReceizArtifactVerification,
  ReceizArtifactVerificationError,
  ReceizPayloadDigest,
  ReceizUnsupportedArtifactReason,
} from "./verifier/types.js";

export type ReceizArtifactVerificationResult =
  | Readonly<{ status: "invalid"; errors: readonly ReceizArtifactVerificationError[] }>
  | Readonly<{
      status: "denied";
      code: ReceizProtocolLimitCode;
      artifactValidity: "not-evaluated";
    }>
  | Readonly<{
      status: "unsupported";
      reason: ReceizUnsupportedArtifactReason;
      detectedVersion?: string;
      detectedProofSuite?: string;
    }>
  | Readonly<{
      status: "verified-artifact";
      verification: ReceizArtifactVerification;
      artifactDigest: ReceizArtifactDigest;
      payloadDigest: ReceizPayloadDigest;
      continuity: ReceizArtifactContinuityAssessment;
      admission: "not-evaluated";
      operationAuthority: "not-evaluated";
    }>;

const issuedVerifications = new WeakSet<object>();
type RetainedReceizArtifactSnapshot = Readonly<{
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  artifactDigest: ReceizArtifactDigest;
}>;
const retainedArtifactSnapshots = new WeakMap<object, RetainedReceizArtifactSnapshot>();
type RetainedReceizArtifactCanonicalOpen = Readonly<{
  payloadBytes: Uint8Array;
  payloadFilename: string;
  payloadMimeType: string;
  rootsBasis: string | null;
}>;
const retainedArtifactCanonicalOpens =
  new WeakMap<object, RetainedReceizArtifactCanonicalOpen>();
const retainedArtifactCanonicalReads = new WeakMap<object, RetainedReceizArtifactCanonicalOpen>();
const retainedArtifactVerifierRoots = new WeakMap<object, ReadonlyMap<string, ReceizSignatureV4RootPublicKey>>();
const MAX_STRUCTURAL_DETECTION_BYTES = 1024 * 1024;

function signatureRootsBasis(
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): string | null {
  return roots
    ? JSON.stringify([...roots.entries()].sort(([left], [right]) =>
      left.localeCompare(right)))
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function frozenError(code: ReceizArtifactVerificationError["code"], message: string): ReceizArtifactVerificationError {
  return Object.freeze({ code, message });
}

function invalid(errors: readonly ReceizArtifactVerificationError[]): ReceizArtifactVerificationResult {
  return Object.freeze({ status: "invalid", errors: Object.freeze([...errors]) });
}

function denied(code: ReceizProtocolLimitCode): ReceizArtifactVerificationResult {
  return Object.freeze({ status: "denied", code, artifactValidity: "not-evaluated" });
}

function unsupported(
  reason: ReceizUnsupportedArtifactReason,
  detail: { detectedVersion?: string; detectedProofSuite?: string } = {},
): ReceizArtifactVerificationResult {
  return Object.freeze({ status: "unsupported", reason, ...detail });
}

function detectUnsupported(bytes: Uint8Array): ReceizArtifactVerificationResult | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_STRUCTURAL_DETECTION_BYTES) return null;
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(decoded);
  } catch {
    return null;
  }
  const recognized = recognizeStructurallyCompleteReceizBundle(envelope);
  if (!recognized) return null;
  const { manifest, proofbundle, signatureV4, certificate, groth16VersionMarker } = recognized;

  if (recognized.envelope.kind !== "receiz.bundle.v1") {
    return unsupported("unsupported-carrier", { detectedVersion: String(recognized.envelope.kind) });
  }
  if (manifest.version !== 1) {
    return unsupported("unsupported-version", { detectedVersion: String(manifest.version) });
  }
  if (proofbundle.payloadVersion !== "v1" && proofbundle.payloadVersion !== "v2") {
    return unsupported("unsupported-version", { detectedVersion: String(proofbundle.payloadVersion) });
  }
  if (signatureV4.version !== 1) {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `signature-v4:version-${String(signatureV4.version)}`,
    });
  }
  if (signatureV4.alg !== "Ed25519") {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `signature-v4:${signatureV4.alg}`,
    });
  }
  if (certificate.version !== 1) {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `signature-v4-cert:version-${String(certificate.version)}`,
    });
  }
  if (certificate.certType !== "receiz.device.v1") {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `signature-v4-cert:${String(certificate.certType)}`,
    });
  }
  if (certificate.alg !== "Ed25519") {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `signature-v4-cert:${String(certificate.alg)}`,
    });
  }
  if (groth16VersionMarker !== "receiz.g16.real.v1") {
    return unsupported("unsupported-proof-suite", {
      detectedProofSuite: `groth16:${groth16VersionMarker}`,
    });
  }
  return null;
}

export function assertRuntimeCustodiedReceizArtifactVerification(
  value: ReceizArtifactVerificationResult,
): asserts value is Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }> {
  if (!isRecord(value) || value.status !== "verified-artifact" || !issuedVerifications.has(value)) {
    throw new TypeError("ARTIFACT_VERIFICATION_NOT_RUNTIME_CUSTODIED");
  }
}

export async function readRuntimeCustodiedReceizArtifactSnapshot(
  value: ReceizArtifactVerificationResult,
): Promise<ReceizArtifactSnapshot> {
  assertRuntimeCustodiedReceizArtifactVerification(value);
  const retained = retainedArtifactSnapshots.get(value);
  if (!retained) throw new TypeError("ARTIFACT_VERIFICATION_SNAPSHOT_NOT_RETAINED");

  const boundDigest = value.artifactDigest;
  if (
    retained.artifactDigest.algorithm !== boundDigest.algorithm
    || retained.artifactDigest.binds !== boundDigest.binds
    || retained.artifactDigest.value !== boundDigest.value
    || await sha256Hex(retained.bytes) !== boundDigest.value
  ) {
    throw new TypeError("ARTIFACT_VERIFICATION_SNAPSHOT_INTEGRITY_FAILED");
  }

  const bytes = retained.bytes.slice();
  if (await sha256Hex(bytes) !== boundDigest.value) {
    throw new TypeError("ARTIFACT_VERIFICATION_SNAPSHOT_INTEGRITY_FAILED");
  }
  return Object.freeze({
    bytes,
    filename: retained.filename,
    mimeType: retained.mimeType,
    artifactDigest: Object.freeze({ ...retained.artifactDigest }),
  });
}

/**
 * Reuses payload bytes already extracted by the exact canonical verification
 * that issued this runtime-custodied result. It returns null when the
 * admission engine is using a different root set, forcing that engine to
 * perform a fresh canonical open under its own roots.
 */
export async function readRuntimeCustodiedReceizArtifactCanonicalOpen(
  value: ReceizArtifactVerificationResult,
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): Promise<Readonly<{
  payloadBytes: Uint8Array;
  payloadFilename: string;
  payloadMimeType: string;
}> | null> {
  assertRuntimeCustodiedReceizArtifactVerification(value);
  const retained = retainedArtifactCanonicalOpens.get(value);
  if (!retained || retained.rootsBasis !== signatureRootsBasis(roots)) return null;
  const payloadBytes = retained.payloadBytes.slice();
  if (await sha256Hex(payloadBytes) !== value.payloadDigest.value) {
    throw new TypeError("ARTIFACT_VERIFICATION_PAYLOAD_CUSTODY_INTEGRITY_FAILED");
  }
  return Object.freeze({
    payloadBytes,
    payloadFilename: retained.payloadFilename,
    payloadMimeType: retained.payloadMimeType,
  });
}

/** Package-internal reuse of the verifier context that issued this exact
 * runtime. A transported root map never supplies this context. */
export function readRuntimeCustodiedReceizArtifactVerifierRoots(
  value: ReceizArtifactVerificationResult,
): ReadonlyMap<string, ReceizSignatureV4RootPublicKey> {
  assertRuntimeCustodiedReceizArtifactVerification(value);
  const roots = retainedArtifactVerifierRoots.get(value);
  if (!roots) throw new TypeError("ARTIFACT_VERIFICATION_CONTEXT_NOT_RETAINED");
  return new Map([...roots].map(([kid, root]) => [kid, Object.freeze({ ...root })]));
}

/** Package-internal verified read payload. This also retains legacy read-only
 * truth and deliberately does not change append/admission open custody. */
export async function readRuntimeCustodiedReceizArtifactCanonicalRead(
  value: ReceizArtifactVerificationResult,
): Promise<Readonly<{ payloadBytes: Uint8Array; payloadFilename: string; payloadMimeType: string }> | null> {
  assertRuntimeCustodiedReceizArtifactVerification(value);
  const retained = retainedArtifactCanonicalReads.get(value);
  if (!retained) return null;
  if (await sha256Hex(retained.payloadBytes) !== value.payloadDigest.value) throw new TypeError("ARTIFACT_VERIFICATION_PAYLOAD_CUSTODY_INTEGRITY_FAILED");
  return Object.freeze({ payloadBytes: retained.payloadBytes.slice(), payloadFilename: retained.payloadFilename, payloadMimeType: retained.payloadMimeType });
}

async function verifyReceizArtifactWithRoots(
  input: ReceizArtifactInput,
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
  maxExactArtifactBytes = RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS.exactArtifactBytes as number,
  packageExecutionCapacity?: import("./verifier/canonical.js").ReceizPackageExecutionCapacity,
): Promise<ReceizArtifactVerificationResult> {
  let snapshot;
  try {
    if (input instanceof Uint8Array || input instanceof ArrayBuffer || input instanceof Blob) {
      const byteLength = input instanceof Blob ? input.size : input.byteLength;
      assertReceizProtocolMaximum("exactArtifactBytes", byteLength);
      if (!Number.isSafeInteger(maxExactArtifactBytes) || maxExactArtifactBytes < 1
        || byteLength > maxExactArtifactBytes) return denied("VERIFICATION_RESOURCE_UNAVAILABLE");
    }
    if (input instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      let byteLength = 0;
      await spoolReceizArtifactInput(input, {
        write(chunk) {
          chunks.push(chunk);
          byteLength += chunk.byteLength;
        },
      }, { maxBytes: RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS.exactArtifactBytes });
      const bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      snapshot = await snapshotReceizArtifactInput(bytes);
    } else {
      snapshot = await snapshotReceizArtifactInput(input);
    }
  } catch (error) {
    if (error instanceof ReceizProtocolLimitError) return denied(error.code);
    if (error instanceof ReceizArtifactInputError && error.code === "ARTIFACT_INPUT_TOO_LARGE") {
      return denied("ARTIFACT_TOO_LARGE");
    }
    return invalid([frozenError(
      "ARTIFACT_INPUT_INVALID",
      error instanceof ReceizArtifactInputError ? error.code : "ARTIFACT_INPUT_INVALID",
    )]);
  }
  const verifierRoots =
    signatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots();
  let exact;
  try {
    exact = await verifyReceizArtifactExactBytesCanonical({
      fileBytes: snapshot.bytes,
      filename: snapshot.filename,
      mimeType: snapshot.mimeType,
      signatureV4RootPublicKeys: verifierRoots,
      ...(packageExecutionCapacity ? { packageExecutionCapacity } : {}),
    });
  } catch (error) {
    const unsupportedResult = detectUnsupported(snapshot.bytes);
    if (unsupportedResult) return unsupportedResult;
    return invalid([frozenError(
      "ARTIFACT_VERIFICATION_FAILED",
      error instanceof Error && error.message ? error.message : "artifact_verification_failed",
    )]);
  }
  if (!exact.ok) {
    if (exact.denial) return denied(exact.denial.code);
    const unsupportedResult = detectUnsupported(snapshot.bytes);
    if (unsupportedResult) return unsupportedResult;
    const messages =
      exact.errors.length > 0 ? exact.errors : ["artifact_verification_failed"];
    return invalid(messages.map((message) => frozenError(
      message.includes("continuity") ? "ARTIFACT_CONTINUITY_FAILED"
        : message.includes("basis") || message.includes("payload") ? "ARTIFACT_PAYLOAD_BINDING_FAILED"
          : message.includes("integrity") ? "ARTIFACT_INTEGRITY_FAILED"
            : "ARTIFACT_VERIFICATION_FAILED",
      message,
    )));
  }
  const verification = cloneAndFreezeExactValue(exact.verification);
  const continuity = cloneAndFreezeExactValue(exact.continuity);
  const payloadDigest: ReceizPayloadDigest = Object.freeze({
    algorithm: "sha-256",
    binds: "verified-payload-bytes",
    value: exact.payloadSha256,
  });
  const result = Object.freeze({
    status: "verified-artifact" as const,
    verification,
    artifactDigest: snapshot.artifactDigest,
    payloadDigest,
    continuity,
    admission: "not-evaluated" as const,
    operationAuthority: "not-evaluated" as const,
  });
  issuedVerifications.add(result);
  retainedArtifactVerifierRoots.set(result, new Map([...verifierRoots].map(([kid, root]) => [kid, Object.freeze({ ...root })])));
  retainedArtifactSnapshots.set(result, Object.freeze({
    bytes: snapshot.bytes,
    filename: snapshot.filename,
    mimeType: snapshot.mimeType,
    artifactDigest: Object.freeze({ ...snapshot.artifactDigest }),
  }));
  const canonicalOpen = await verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: snapshot.bytes,
    filename: snapshot.filename,
    mime: snapshot.mimeType,
    signatureV4RootPublicKeys: verifierRoots,
    ...(packageExecutionCapacity ? { packageExecutionCapacity } : {}),
  });
  if (canonicalOpen.ok) {
    const retained = Object.freeze({
      payloadBytes: canonicalOpen.payloadBytes.slice(),
      payloadFilename: canonicalOpen.payloadFilename,
      payloadMimeType: canonicalOpen.payloadMimeType,
      rootsBasis: signatureRootsBasis(verifierRoots),
    });
    retainedArtifactCanonicalOpens.set(result, retained);
    retainedArtifactCanonicalReads.set(result, retained);
  } else {
    const read = await readVerifiedReceizDocumentBytesCanonical({ fileBytes: snapshot.bytes, filename: snapshot.filename,
      mime: snapshot.mimeType, signatureV4RootPublicKeys: verifierRoots,
      ...(packageExecutionCapacity ? { packageExecutionCapacity } : {}) });
    if (read.ok && await sha256Hex(read.payloadBytes) === payloadDigest.value) retainedArtifactCanonicalReads.set(result, Object.freeze({
      payloadBytes: read.payloadBytes.slice(), payloadFilename: read.payloadFilename, payloadMimeType: read.payloadMimeType,
      rootsBasis: signatureRootsBasis(verifierRoots),
    }));
  }
  return result;
}

/**
 * INTERNAL verifier-mechanics entry for canonical fixtures whose roots are
 * supplied by the admission engine's existing dependency boundary. It is not
 * exported from the package index or package export map.
 */
export async function verifyReceizArtifactWithCanonicalRoots(
  input: ReceizArtifactInput,
  signatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): Promise<ReceizArtifactVerificationResult> {
  return verifyReceizArtifactWithRoots(input, signatureV4RootPublicKeys);
}

export async function verifyReceizArtifact(
  input: ReceizArtifactInput,
): Promise<ReceizArtifactVerificationResult> {
  return verifyReceizArtifactWithRoots(input);
}

/** Package-internal host execution policy. Same canonical verification and
 * runtime custody issuance; never a proof-validity or issuer override.
 * Existing public callers retain their universal 16 MiB runtime default.
 */
export async function verifyReceizArtifactWithExecutionCapacity(
  input: Uint8Array,
  execution: Readonly<{ maxExactArtifactBytes: number; maxDecompressedArchiveBytes?: number }>,
  signatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): Promise<ReceizArtifactVerificationResult> {
  if (!Number.isSafeInteger(execution.maxExactArtifactBytes) || execution.maxExactArtifactBytes < 1) {
    return denied("VERIFICATION_RESOURCE_UNAVAILABLE");
  }
  const capacity = Object.freeze({ maxExactArtifactBytes: execution.maxExactArtifactBytes,
    maxDecompressedArchiveBytes: execution.maxDecompressedArchiveBytes ?? RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS.decompressedArchiveBytes });
  return verifyReceizArtifactWithRoots(input, signatureV4RootPublicKeys, capacity.maxExactArtifactBytes, capacity);
}
