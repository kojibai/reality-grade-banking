import {
  verifyReceizArtifactAdmission,
} from "./artifactAdmission.js";
import type { ReceizVerifiedIdentityArtifactAdmission } from "./artifactAdmissionTypes.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  readReceizIdentityArtifact,
  verifyReceizIdentityPortableStateProof,
} from "./identity.js";

const KAI_RE = /^(0|[1-9][0-9]*)$/;
const historicalKeyStateEvidence = new WeakSet<object>();
const historicalRevocationStates = new WeakSet<object>();

export type ReceizVerifiedHistoricalIdentityKeyStateEvidence = Readonly<{
  schema: "receiz.verified-historical-identity-key-state-evidence.v113";
  issuerKeyId: string;
  actorId: string;
  registryDigest: string;
  observedThroughKai: string;
  revokedAtKai: string | null;
  identityArtifactDigest: string;
  admissionDigest: string;
  verifierEvidenceDigest: string;
}>;

export type ReceizHistoricalIdentityKeyRevocationState = Readonly<{
  schema: "receiz.historical-identity-key-revocation-state.v113";
  issuerKeyId: string;
  actorId: string;
  registryDigest: string;
  observedThroughKai: string;
  revokedAtKai: string | null;
  verifierEvidenceDigest: string;
  priorSnapshotDigest: string | null;
  snapshotDigest: string;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function isRuntimeCustodiedReceizVerifiedHistoricalIdentityKeyStateEvidence(
  value: unknown,
): value is ReceizVerifiedHistoricalIdentityKeyStateEvidence {
  return value !== null && typeof value === "object" && historicalKeyStateEvidence.has(value);
}

export function isRuntimeCustodiedReceizHistoricalIdentityKeyRevocationState(
  value: unknown,
): value is ReceizHistoricalIdentityKeyRevocationState {
  return value !== null && typeof value === "object" && historicalRevocationStates.has(value);
}

/**
 * Reopens an SDK-custodied identity admission and verifies the signed key-state
 * snapshot carried by the exact sealed Identity artifact. Neither a registry
 * effective Kai nor a caller-supplied revoked-key set can create this evidence.
 */
export async function verifyReceizIdentityKeyStateArtifactAdmission(
  admission: ReceizVerifiedIdentityArtifactAdmission,
): Promise<ReceizVerifiedHistoricalIdentityKeyStateEvidence> {
  const verified = await verifyReceizArtifactAdmission(admission);
  if ("code" in verified || verified.profile !== "identity") {
    throw new TypeError("HISTORICAL_REVOCATION_EVIDENCE_REQUIRED");
  }
  const keyFile = await readReceizIdentityArtifact(verified.verifiedPayload.bytes);
  if (await verifyReceizIdentityPortableStateProof(keyFile) !== "verified") {
    throw new TypeError("HISTORICAL_REVOCATION_EVIDENCE_REQUIRED");
  }
  const snapshot = asRecord(keyFile.portableState?.snapshot);
  if (!snapshot
    || keyFile.portableState?.schema !== "receiz.identity-key-state.v113"
    || Object.keys(snapshot).sort().join(",") !== "actorId,issuerKeyId,observedThroughKai,registryDigest,revokedAtKai"
    || snapshot.issuerKeyId !== keyFile.keyId
    || snapshot.actorId !== keyFile.owner.uid
    || snapshot.actorId !== verified.actor.actorId
    || snapshot.registryDigest !== verified.actor.registryDigest.value
    || typeof snapshot.observedThroughKai !== "string"
    || !KAI_RE.test(snapshot.observedThroughKai)
    || snapshot.revokedAtKai !== null && (
      typeof snapshot.revokedAtKai !== "string"
      || !KAI_RE.test(snapshot.revokedAtKai)
      || BigInt(snapshot.revokedAtKai) > BigInt(snapshot.observedThroughKai)
    )) {
    throw new TypeError("HISTORICAL_REVOCATION_EVIDENCE_REQUIRED");
  }
  const basis = {
    schema: "receiz.verified-historical-identity-key-state-evidence.v113" as const,
    issuerKeyId: snapshot.issuerKeyId as string,
    actorId: snapshot.actorId as string,
    registryDigest: snapshot.registryDigest as string,
    observedThroughKai: snapshot.observedThroughKai,
    revokedAtKai: snapshot.revokedAtKai as string | null,
    identityArtifactDigest: verified.artifactSha256,
    admissionDigest: verified.admissionDigest.value,
  };
  const evidence = Object.freeze({
    ...basis,
    verifierEvidenceDigest: await digestReceizAuthority(
      "identity",
      "receiz.verified-historical-identity-key-state-evidence.v113",
      basis,
    ),
  });
  historicalKeyStateEvidence.add(evidence);
  return evidence;
}

/**
 * @internal Advances one monotonic historical key-state snapshot from exact,
 * runtime-custodied Identity artifact evidence. Kai facts are never accepted
 * directly from a caller.
 */
export async function observeReceizHistoricalIdentityKeyState(input: Readonly<{
  keyStateEvidence: ReceizVerifiedHistoricalIdentityKeyStateEvidence;
  previous?: ReceizHistoricalIdentityKeyRevocationState;
}>): Promise<ReceizHistoricalIdentityKeyRevocationState> {
  const keys = Object.keys(input).sort().join(",");
  const evidence = input.keyStateEvidence;
  const previous = input.previous;
  if ((keys !== "keyStateEvidence" && keys !== "keyStateEvidence,previous")
    || !isRuntimeCustodiedReceizVerifiedHistoricalIdentityKeyStateEvidence(evidence)
    || previous !== undefined && (
      !isRuntimeCustodiedReceizHistoricalIdentityKeyRevocationState(previous)
      || previous.issuerKeyId !== evidence.issuerKeyId
      || previous.actorId !== evidence.actorId
      || previous.registryDigest !== evidence.registryDigest
      || BigInt(evidence.observedThroughKai) < BigInt(previous.observedThroughKai)
      || previous.revokedAtKai !== null && previous.revokedAtKai !== evidence.revokedAtKai
    )) {
    throw new TypeError("HISTORICAL_REVOCATION_EVIDENCE_REQUIRED");
  }
  const basis = {
    schema: "receiz.historical-identity-key-revocation-state.v113" as const,
    issuerKeyId: evidence.issuerKeyId,
    actorId: evidence.actorId,
    registryDigest: evidence.registryDigest,
    observedThroughKai: evidence.observedThroughKai,
    revokedAtKai: evidence.revokedAtKai,
    verifierEvidenceDigest: evidence.verifierEvidenceDigest,
    priorSnapshotDigest: previous?.snapshotDigest ?? null,
  };
  const state = Object.freeze({
    ...basis,
    snapshotDigest: await digestReceizAuthority(
      "identity",
      "receiz.historical-identity-key-revocation-state.v113",
      basis,
    ),
  });
  historicalRevocationStates.add(state);
  return state;
}
