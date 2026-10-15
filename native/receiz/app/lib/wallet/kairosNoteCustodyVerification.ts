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
  | ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;

export async function verifyKairosNoteReceivingCustody(
  candidate: unknown,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<KairosVerifiedReceivingCustody> {
  if (candidate && typeof candidate === "object"
    && "schema" in candidate
    && candidate.schema === "receiz.offline-note.attested-receiving-custody.v2") {
    return verifyReceizOfflineNoteAttestedReceivingCustodyCommitment(candidate, options);
  }
  return verifyReceizOfflineNoteReceivingCustodyCommitment(candidate);
}

export async function deriveKairosNoteCustodyOwnerId(
  custody: KairosVerifiedReceivingCustody,
  options: Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> }> = {},
): Promise<`c_${string}.receiz.id`> {
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
