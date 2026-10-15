import { verifyReceizArtifact } from "./artifactVerification.js";
import { digestReceizCanonicalV122, deriveReceizSubjectIdV122, type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";
import { verifyReceizAuthenticatedSubjectStateV122, type ReceizSubjectAdmissionReceiptV122, type ReceizSubjectStateV122 } from "./v122Subjects.js";

export type ReceizExactEdgeSegmentV122 = Readonly<{ exactBytesB64u: string; digest: string }>;
export type ReceizSubjectEdgeBundleV122 = Readonly<{
  schema: "receiz.subject.edge_bundle.v122";
  proof: Readonly<ReceizExactEdgeSegmentV122 & { filename: string; mimeType: string; admittedProofDigest: string }>;
  subjectState: ReceizSubjectStateV122;
  appendChain: readonly Readonly<ReceizExactEdgeSegmentV122 & { head: string; parentHeads: readonly string[] }>[];
  ownerEvidence: ReceizExactEdgeSegmentV122;
  registryArtifacts: readonly ReceizExactEdgeSegmentV122[];
  reducerArtifacts: readonly ReceizExactEdgeSegmentV122[];
  mandateHistory: readonly ReceizExactEdgeSegmentV122[];
  privateEnvelopeSegments: readonly ReceizExactEdgeSegmentV122[];
  encryptedAccessKit: ReceizExactEdgeSegmentV122 | null;
  valueProofReferences: readonly Readonly<ReceizExactEdgeSegmentV122 & { rail: "settlement" | "reserve" }>[];
  manifestDigest: string;
}>;

export type ReceizSubjectEdgeBundleVerifierV122 = Readonly<{
  knownEdgeHead?: string;
  verifyAdmissionReceipt: (receipt: ReceizSubjectAdmissionReceiptV122) => boolean | Promise<boolean>;
  verifyOwnerEvidence: (input: Readonly<{ evidence: ReceizExactEdgeSegmentV122; state: ReceizSubjectStateV122 }>) => boolean | Promise<boolean>;
  verifyAppendChain: (input: Readonly<{ chain: ReceizSubjectEdgeBundleV122["appendChain"]; state: ReceizSubjectStateV122 }>) => boolean | Promise<boolean>;
  verifyRegistryReducerCompatibility: (input: Readonly<{
    registryArtifacts: ReceizSubjectEdgeBundleV122["registryArtifacts"];
    reducerArtifacts: ReceizSubjectEdgeBundleV122["reducerArtifacts"];
    state: ReceizSubjectStateV122;
  }>) => boolean | Promise<boolean>;
}>;

export type ReceizSubjectEdgeBundleFailureCodeV122 =
  | "edge_bundle_invalid"
  | "edge_bundle_proof_invalid"
  | "edge_bundle_proof_digest_mismatch"
  | "edge_bundle_manifest_digest_mismatch"
  | "edge_bundle_subject_state_invalid"
  | "edge_bundle_segment_digest_mismatch"
  | "edge_bundle_owner_evidence_invalid"
  | "edge_bundle_append_chain_invalid"
  | "edge_bundle_registry_reducer_incompatible"
  | "edge_bundle_known_head_not_ancestor";

export type ReceizSubjectEdgeBundleVerificationResultV122 =
  | Readonly<{ ok: true; bundle: ReceizSubjectEdgeBundleV122 }>
  | ReceizV122ZeroWriteValidationFailure<ReceizSubjectEdgeBundleFailureCodeV122>;

const SHA256 = /^[0-9a-f]{64}$/;
const B64U = /^[A-Za-z0-9_-]*$/;

function failure(code: ReceizSubjectEdgeBundleFailureCodeV122): ReceizSubjectEdgeBundleVerificationResultV122 {
  return { ok: false, code, writesOnFailure: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Reflect.ownKeys(value);
  return actual.every((key) => typeof key === "string") && actual.length === keys.length
    && keys.every((key) => Object.prototype.propertyIsEnumerable.call(value, key));
}

function decode(value: string): Uint8Array | null {
  if (!B64U.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const snapshot = bytes.slice();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", snapshot.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function segmentValid(value: unknown, extraKeys: readonly string[] = []): value is ReceizExactEdgeSegmentV122 & Record<string, unknown> {
  return isRecord(value) && exactKeys(value, ["exactBytesB64u", "digest", ...extraKeys])
    && typeof value.exactBytesB64u === "string" && B64U.test(value.exactBytesB64u)
    && typeof value.digest === "string" && SHA256.test(value.digest);
}

async function segmentDigestValid(value: ReceizExactEdgeSegmentV122): Promise<boolean> {
  const bytes = decode(value.exactBytesB64u);
  return bytes !== null && await sha256(bytes) === value.digest;
}

function structurallyValid(value: unknown): value is ReceizSubjectEdgeBundleV122 {
  if (!isRecord(value) || !exactKeys(value, [
    "schema", "proof", "subjectState", "appendChain", "ownerEvidence", "registryArtifacts", "reducerArtifacts",
    "mandateHistory", "privateEnvelopeSegments", "encryptedAccessKit", "valueProofReferences", "manifestDigest",
  ])) return false;
  if (value.schema !== "receiz.subject.edge_bundle.v122" || !segmentValid(value.proof, ["filename", "mimeType", "admittedProofDigest"])) return false;
  if (typeof value.proof.filename !== "string" || typeof value.proof.mimeType !== "string"
    || typeof value.proof.admittedProofDigest !== "string" || !SHA256.test(value.proof.admittedProofDigest)
    || typeof value.manifestDigest !== "string" || !SHA256.test(value.manifestDigest)) return false;
  if (!Array.isArray(value.appendChain) || !Array.isArray(value.registryArtifacts) || !Array.isArray(value.reducerArtifacts)
    || !Array.isArray(value.mandateHistory) || !Array.isArray(value.privateEnvelopeSegments) || !Array.isArray(value.valueProofReferences)) return false;
  if (!segmentValid(value.ownerEvidence) || (value.encryptedAccessKit !== null && !segmentValid(value.encryptedAccessKit))) return false;
  if (!value.registryArtifacts.every((entry) => segmentValid(entry)) || !value.reducerArtifacts.every((entry) => segmentValid(entry))
    || !value.mandateHistory.every((entry) => segmentValid(entry)) || !value.privateEnvelopeSegments.every((entry) => segmentValid(entry))) return false;
  if (!value.appendChain.every((entry) => segmentValid(entry, ["head", "parentHeads"])
    && typeof entry.head === "string" && SHA256.test(entry.head)
    && Array.isArray(entry.parentHeads) && entry.parentHeads.every((head) => typeof head === "string" && SHA256.test(head)))) return false;
  return value.valueProofReferences.every((entry) => segmentValid(entry, ["rail"]) && (entry.rail === "settlement" || entry.rail === "reserve"));
}

export async function verifyReceizSubjectEdgeBundleV122(
  value: unknown,
  verifier: ReceizSubjectEdgeBundleVerifierV122,
): Promise<ReceizSubjectEdgeBundleVerificationResultV122> {
  if (!structurallyValid(value)) return failure("edge_bundle_invalid");
  const proofBytes = decode(value.proof.exactBytesB64u);
  if (!proofBytes) return failure("edge_bundle_proof_invalid");
  const proofVerification = await verifyReceizArtifact(proofBytes);
  if (proofVerification.status !== "verified-artifact") return failure("edge_bundle_proof_invalid");
  if (proofVerification.artifactDigest.value !== value.proof.admittedProofDigest
    || value.proof.digest !== value.proof.admittedProofDigest
    || value.subjectState.admittedProofDigest !== value.proof.admittedProofDigest
    || await deriveReceizSubjectIdV122(value.proof.admittedProofDigest) !== value.subjectState.subjectId) {
    return failure("edge_bundle_proof_digest_mismatch");
  }
  const { manifestDigest, ...manifestBasis } = value;
  if (await digestReceizCanonicalV122(manifestBasis) !== manifestDigest) return failure("edge_bundle_manifest_digest_mismatch");
  const stateResult = await verifyReceizAuthenticatedSubjectStateV122(value.subjectState, {
    authenticateAdmissionReceipt: verifier.verifyAdmissionReceipt,
    authenticateState: async () => verifier.verifyAppendChain({ chain: value.appendChain, state: value.subjectState }),
  });
  if (!stateResult.ok) return failure("edge_bundle_subject_state_invalid");
  const segments: ReceizExactEdgeSegmentV122[] = [
    value.ownerEvidence,
    ...value.appendChain,
    ...value.registryArtifacts,
    ...value.reducerArtifacts,
    ...value.mandateHistory,
    ...value.privateEnvelopeSegments,
    ...value.valueProofReferences,
    ...(value.encryptedAccessKit ? [value.encryptedAccessKit] : []),
  ];
  for (const segment of value.subjectState.opaqueNamespaces) segments.push(segment);
  for (const segment of segments) if (!await segmentDigestValid(segment)) return failure("edge_bundle_segment_digest_mismatch");
  if (value.ownerEvidence.digest !== value.subjectState.ownerProofDigest
    || !await verifier.verifyOwnerEvidence({ evidence: value.ownerEvidence, state: value.subjectState })) {
    return failure("edge_bundle_owner_evidence_invalid");
  }
  if (!value.registryArtifacts.some((entry) => entry.digest === value.subjectState.registryDigest)
    || !value.reducerArtifacts.some((entry) => entry.digest === value.subjectState.reducerDigest)
    || !await verifier.verifyRegistryReducerCompatibility({
      registryArtifacts: value.registryArtifacts,
      reducerArtifacts: value.reducerArtifacts,
      state: value.subjectState,
    })) return failure("edge_bundle_registry_reducer_incompatible");
  if (verifier.knownEdgeHead) {
    const knownHeads = new Set<string>([value.subjectState.genesisHead, value.subjectState.head, ...value.subjectState.causalParents]);
    for (const append of value.appendChain) {
      knownHeads.add(append.head);
      append.parentHeads.forEach((head) => knownHeads.add(head));
    }
    if (!knownHeads.has(verifier.knownEdgeHead)) return failure("edge_bundle_known_head_not_ancestor");
  }
  return { ok: true, bundle: value };
}
