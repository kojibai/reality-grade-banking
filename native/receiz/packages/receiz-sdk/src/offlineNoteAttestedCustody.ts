import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  verifyReceizOfflineNoteCustodyQualification,
  type ReceizOfflineNoteCustodyQualificationV1,
} from "./offlineNoteIrreversibleCustody.js";
import {
  verifyReceizOfflineNotePlatformAttestationCertificate,
  type ReceizOfflineNotePlatformAttestationCertificateV1,
} from "./offlineNotePlatformAttestation.js";
import {
  verifyReceizOfflineNoteRollbackConformanceEvidence,
  type ReceizOfflineNoteRollbackConformanceEvidenceV1,
} from "./offlineNoteRollbackConformance.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

export const RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA =
  "receiz.offline-note.attested-receiving-custody.v2" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;

export type ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  adapterKind: "pwa-webauthn";
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  stateCommitment: string;
  stateSequence: string;
  platformAttestationCertificate: ReceizOfflineNotePlatformAttestationCertificateV1;
  rollbackConformanceEvidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
  receivingCustodyCommitmentDigest: string;
}>;

type Basis = Omit<ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2, "receivingCustodyCommitmentDigest">;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_INVALID");
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(record).sort().join("\0") !== [...expected].sort().join("\0")) fail();
}

async function verifiedBasis(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  platformAttestationCertificate: ReceizOfflineNotePlatformAttestationCertificateV1;
  rollbackConformanceEvidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<Basis> {
  const qualification = await verifyReceizOfflineNoteCustodyQualification(input.qualification);
  if (qualification.adapterKind !== "pwa-webauthn") fail();
  const certificate = await verifyReceizOfflineNotePlatformAttestationCertificate(
    input.platformAttestationCertificate,
    {
      ...(input.roots ? { roots: input.roots } : {}),
      expectedRpId: input.platformAttestationCertificate.rpId,
      expectedOrigin: input.platformAttestationCertificate.origin,
      expectedCustodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    },
  );
  const profileId = `receiz.attested.${certificate.attestationFormat}.${certificate.aaguid}`;
  if (qualification.profileId !== profileId
    || qualification.profileEvidenceDigest !== certificate.certificateDigest
    || qualification.stateSequence !== input.rollbackConformanceEvidence.conformedStateSequence
    || BigInt(qualification.stateSequence) !== BigInt(certificate.registrationCounter) + 2n) fail();
  const rollbackConformanceEvidence = await verifyReceizOfflineNoteRollbackConformanceEvidence({
    evidence: input.rollbackConformanceEvidence,
    credential: {
      credentialIdB64u: certificate.credentialIdB64u,
      custodyPublicKeyRawB64u: certificate.custodyPublicKeyRawB64u,
      rpId: certificate.rpId,
      origin: certificate.origin,
    },
    registrationCounter: certificate.registrationCounter,
  });
  return Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    adapterKind: "pwa-webauthn",
    custodyPublicKeyAlgorithm: "P-256",
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    stateCommitment: qualification.stateCommitment,
    stateSequence: qualification.stateSequence,
    platformAttestationCertificate: certificate,
    rollbackConformanceEvidence,
  });
}

export async function createReceizOfflineNoteAttestedReceivingCustodyCommitment(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  platformAttestationCertificate: ReceizOfflineNotePlatformAttestationCertificateV1;
  rollbackConformanceEvidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2> {
  try {
    const basis = await verifiedBasis(input);
    return Object.freeze({
      ...basis,
      receivingCustodyCommitmentDigest: await digestReceizAuthority(
        "identity", RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA, basis,
      ),
    });
  } catch { fail(); }
}

export async function verifyReceizOfflineNoteAttestedReceivingCustodyCommitment(
  candidate: unknown,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2> {
  try {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) fail();
    const record = candidate as Record<string, unknown>;
    exactKeys(record, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "adapterKind",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "installationCommitment",
      "stateCommitment", "stateSequence", "platformAttestationCertificate",
      "rollbackConformanceEvidence", "receivingCustodyCommitmentDigest",
    ]);
    const value = candidate as ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;
    if (value.schema !== RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA
      || value.adapterKind !== "pwa-webauthn"
      || value.custodyPublicKeyAlgorithm !== "P-256"
      || !SHA256_RE.test(value.receivingCustodyCommitmentDigest)) fail();
    const qualification = await verifyReceizOfflineNoteCustodyQualification({
      schema: "receiz.offline-note.custody-qualification.v1",
      status: "qualified",
      profileId: value.profileId,
      profileEvidenceDigest: value.profileEvidenceDigest,
      adapterKind: value.adapterKind,
      custodyPublicKeyAlgorithm: value.custodyPublicKeyAlgorithm,
      custodyPublicKeyRawB64u: value.custodyPublicKeyRawB64u,
      installationCommitment: value.installationCommitment,
      stateCommitment: value.stateCommitment,
      stateSequence: value.stateSequence,
      qualificationDigest: value.qualificationDigest,
    });
    const basis = await verifiedBasis({
      qualification,
      platformAttestationCertificate: value.platformAttestationCertificate,
      rollbackConformanceEvidence: value.rollbackConformanceEvidence,
      ...(options.roots ? { roots: options.roots } : {}),
    });
    const digest = await digestReceizAuthority(
      "identity", RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA, basis,
    );
    if (digest !== value.receivingCustodyCommitmentDigest) fail();
    return Object.freeze(structuredClone(value));
  } catch { fail(); }
}

export async function deriveReceizOfflineNoteAttestedCustodyOwnerId(
  commitmentInput: ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<`c_${string}.receiz.id`> {
  const commitment = await verifyReceizOfflineNoteAttestedReceivingCustodyCommitment(commitmentInput, options);
  return `c_${commitment.receivingCustodyCommitmentDigest.slice(0, 22)}.receiz.id`;
}
