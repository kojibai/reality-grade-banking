import {
  verifyReceizAndroidNoteHandoff,
  verifyReceizAndroidNoteReceivingCustody,
  type ReceizAndroidNoteHandoff,
  type ReceizAndroidNoteReceivingCustody,
} from "../../../packages/receiz-sdk/src/offlineNoteAndroidHandoff";
import {
  verifyReceizOfflineNoteWebAuthnConsumptionReceipt,
  type ReceizOfflineNoteWebAuthnConsumptionReceiptV1,
} from "../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";
import {
  deriveReceizOfflineNoteCustodyOwnerId,
  verifyReceizOfflineNoteReceivingCustodyCommitment,
  type ReceizOfflineNoteReceivingCustodyCommitmentV1,
} from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import {
  deriveReceizOfflineNoteAttestedCustodyOwnerId,
  verifyReceizOfflineNoteAttestedReceivingCustodyCommitment,
  type ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2,
} from "../../../packages/receiz-sdk/src/offlineNoteAttestedCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";

export type KairosVerifiedReceivingCustody =
  | ReceizOfflineNoteReceivingCustodyCommitmentV1
  | ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2
  | ReceizAndroidNoteReceivingCustody;

export async function verifyKairosNoteReceivingCustody(
  candidate: unknown,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<KairosVerifiedReceivingCustody> {
  if (candidate && typeof candidate === "object"
    && "schema" in candidate
    && candidate.schema === "receiz.offline-note.attested-receiving-custody.v2") {
    return verifyReceizOfflineNoteAttestedReceivingCustodyCommitment(candidate, options);
  }
  if (candidate && typeof candidate === "object"
    && "schema" in candidate
    && candidate.schema === "receiz.offline-note.android-receiving-custody.v1") {
    return verifyReceizAndroidNoteReceivingCustody(candidate, options);
  }
  return verifyReceizOfflineNoteReceivingCustodyCommitment(candidate);
}

export async function deriveKairosNoteCustodyOwnerId(
  custody: KairosVerifiedReceivingCustody,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<`c_${string}.receiz.id`> {
  if (custody.schema === "receiz.offline-note.android-receiving-custody.v1") {
    const verified = await verifyReceizAndroidNoteReceivingCustody(custody, options);
    return `c_${verified.receivingCustodyCommitmentDigest.slice(0, 22)}.receiz.id`;
  }
  return custody.schema === "receiz.offline-note.attested-receiving-custody.v2"
    ? deriveReceizOfflineNoteAttestedCustodyOwnerId(custody, options)
    : deriveReceizOfflineNoteCustodyOwnerId(custody);
}

export function requireKairosNoteAttestedReceivingCustody(
  custody: KairosVerifiedReceivingCustody,
): asserts custody is ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 {
  if (custody.schema !== "receiz.offline-note.attested-receiving-custody.v2") {
    throw new Error("OFFLINE_NOTE_DEVICE_ATTESTATION_REQUIRED");
  }
}

export function requireKairosNoteHardwareReceivingCustody(
  custody: KairosVerifiedReceivingCustody,
): asserts custody is ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 | ReceizAndroidNoteReceivingCustody {
  if (custody.schema !== "receiz.offline-note.android-receiving-custody.v1") {
    requireKairosNoteAttestedReceivingCustody(custody);
  } else if (custody.attestation.purpose !== "holding") {
    throw Error("OFFLINE_NOTE_RECEIVING_CUSTODY_MISMATCH");
  }
}

export type KairosNoteConsumptionProof = ReceizOfflineNoteWebAuthnConsumptionReceiptV1 | ReceizAndroidNoteHandoff;

export async function verifyKairosNoteConsumptionProof(
  candidate: unknown,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | undefined }> = {},
) {
  if (candidate && typeof candidate === "object" && "schema" in candidate
    && candidate.schema === "receiz.offline-note.android-handoff.v1") {
    return verifyReceizAndroidNoteHandoff(candidate, options);
  }
  const receipt = await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(candidate);
  return Object.freeze({ ...receipt, activationQualificationDigest: receipt.activationReceipt.qualificationDigest });
}
