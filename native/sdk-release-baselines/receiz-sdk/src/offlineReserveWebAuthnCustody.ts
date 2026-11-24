import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlEncode } from "./identity.js";
import {
  verifyReceizOfflineNoteCustodyQualification,
  type ReceizOfflineNoteCustodyQualificationV1,
} from "./offlineNoteIrreversibleCustody.js";
import { verifyReceizOfflineNoteWebAuthnAssertion } from "./offlineNoteWebAuthnCustody.js";

export const RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA =
  "receiz.offline-reserve.webauthn-consumption.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const POSITIVE_UINT_RE = /^[1-9][0-9]*$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

export type ReceizOfflineReserveWebAuthnConsumptionBasisV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA;
  qualificationDigest: string;
  profileId: string;
  profileEvidenceDigest: string;
  custodyPublicKeyRawB64u: string;
  installationCommitment: string;
  predecessorAccountPortableStateDigest: string;
  successorReserveStateContentDigest: string;
  noteArtifactSha256: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  reserveBeforePhiMicro: string;
  reserveAfterPhiMicro: string;
  reserveBeforeUsdCents: string;
  reserveAfterUsdCents: string;
  acceptedAtKai: string;
  transitionNonce: string;
  expectedReserveStateCommitment: string;
  nextReserveStateCommitment: string;
  expectedReserveStateSequence: string;
  nextReserveStateSequence: string;
  rpId: string;
  origin: string;
}>;

export type ReceizOfflineReservePreparedWebAuthnConsumptionV1 = Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  basis: ReceizOfflineReserveWebAuthnConsumptionBasisV1;
  receiptDigest: string;
  challengeB64u: string;
}>;

export type ReceizOfflineReserveWebAuthnConsumptionReceiptV1 =
  ReceizOfflineReserveWebAuthnConsumptionBasisV1 & Readonly<{
    receiptDigest: string;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
  }>;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_RECEIPT_INVALID");
}

function challenge(digest: string): string {
  if (!SHA256_RE.test(digest)) fail();
  return receizBase64UrlEncode(Uint8Array.from(
    { length: 32 }, (_, index) => Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16),
  ));
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) fail();
}

export async function prepareReceizOfflineReserveWebAuthnConsumptionChallenge(input: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  predecessorAccountPortableStateDigest: string;
  successorReserveStateContentDigest: string;
  noteArtifactSha256: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  reserveBeforePhiMicro: string;
  reserveAfterPhiMicro: string;
  reserveBeforeUsdCents: string;
  reserveAfterUsdCents: string;
  acceptedAtKai: string;
  transitionNonce: string;
  expectedReserveStateCommitment: string;
  nextReserveStateCommitment: string;
  expectedReserveStateSequence: string;
  nextReserveStateSequence: string;
  rpId: string;
  origin: string;
}>): Promise<ReceizOfflineReservePreparedWebAuthnConsumptionV1> {
  const qualification = await verifyReceizOfflineNoteCustodyQualification(input.qualification).catch(fail);
  let origin: URL;
  try { origin = new URL(input.origin); } catch { fail(); }
  if (qualification.adapterKind !== "pwa-webauthn"
    || !SHA256_RE.test(input.predecessorAccountPortableStateDigest)
    || !SHA256_RE.test(input.successorReserveStateContentDigest)
    || !SHA256_RE.test(input.noteArtifactSha256)
    || !SHA256_RE.test(input.expectedReserveStateCommitment)
    || !SHA256_RE.test(input.nextReserveStateCommitment)
    || input.expectedReserveStateCommitment !== qualification.stateCommitment
    || input.expectedReserveStateCommitment === input.nextReserveStateCommitment
    || !POSITIVE_UINT_RE.test(input.amountPhiMicro)
    || !POSITIVE_UINT_RE.test(input.amountUsdCents)
    || !POSITIVE_UINT_RE.test(input.usdPerPhiMicrocents)
    || !POSITIVE_UINT_RE.test(input.reserveBeforePhiMicro)
    || !UINT_RE.test(input.reserveAfterPhiMicro)
    || BigInt(input.reserveBeforePhiMicro) - BigInt(input.amountPhiMicro) !== BigInt(input.reserveAfterPhiMicro)
    || !POSITIVE_UINT_RE.test(input.reserveBeforeUsdCents)
    || !UINT_RE.test(input.reserveAfterUsdCents)
    || BigInt(input.reserveBeforeUsdCents) - BigInt(input.amountUsdCents) !== BigInt(input.reserveAfterUsdCents)
    || (BigInt(input.amountPhiMicro) * BigInt(input.usdPerPhiMicrocents) + 500_000_000_000n)
      / 1_000_000_000_000n !== BigInt(input.amountUsdCents)
    || !UINT_RE.test(input.acceptedAtKai)
    || !input.transitionNonce.trim()
    || !POSITIVE_UINT_RE.test(input.expectedReserveStateSequence)
    || !POSITIVE_UINT_RE.test(input.nextReserveStateSequence)
    || input.expectedReserveStateSequence !== qualification.stateSequence
    || BigInt(input.nextReserveStateSequence) !== BigInt(input.expectedReserveStateSequence) + 1n
    || !input.rpId.trim() || origin!.protocol !== "https:" || origin!.origin !== input.origin) fail();
  const basis: ReceizOfflineReserveWebAuthnConsumptionBasisV1 = Object.freeze({
    schema: RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA,
    qualificationDigest: qualification.qualificationDigest,
    profileId: qualification.profileId,
    profileEvidenceDigest: qualification.profileEvidenceDigest,
    custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u,
    installationCommitment: qualification.installationCommitment,
    predecessorAccountPortableStateDigest: input.predecessorAccountPortableStateDigest,
    successorReserveStateContentDigest: input.successorReserveStateContentDigest,
    noteArtifactSha256: input.noteArtifactSha256,
    amountPhiMicro: input.amountPhiMicro,
    amountUsdCents: input.amountUsdCents,
    usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    reserveBeforePhiMicro: input.reserveBeforePhiMicro,
    reserveAfterPhiMicro: input.reserveAfterPhiMicro,
    reserveBeforeUsdCents: input.reserveBeforeUsdCents,
    reserveAfterUsdCents: input.reserveAfterUsdCents,
    acceptedAtKai: input.acceptedAtKai,
    transitionNonce: input.transitionNonce.trim(),
    expectedReserveStateCommitment: input.expectedReserveStateCommitment,
    nextReserveStateCommitment: input.nextReserveStateCommitment,
    expectedReserveStateSequence: input.expectedReserveStateSequence,
    nextReserveStateSequence: input.nextReserveStateSequence,
    rpId: input.rpId,
    origin: input.origin,
  });
  const receiptDigest = await digestReceizAuthority(
    "transition", RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA, basis,
  );
  return Object.freeze({ qualification, basis, receiptDigest, challengeB64u: challenge(receiptDigest) });
}

export async function finalizeReceizOfflineReserveWebAuthnConsumptionReceipt(input: Readonly<{
  prepared: ReceizOfflineReservePreparedWebAuthnConsumptionV1;
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>): Promise<ReceizOfflineReserveWebAuthnConsumptionReceiptV1> {
  const receipt = Object.freeze({ ...input.prepared.basis, receiptDigest: input.prepared.receiptDigest,
    authenticatorDataB64u: input.authenticatorDataB64u, clientDataJSONB64u: input.clientDataJSONB64u,
    signatureB64u: input.signatureB64u });
  return verifyReceizOfflineReserveWebAuthnConsumptionReceipt(receipt);
}

export async function verifyReceizOfflineReserveWebAuthnConsumptionReceipt(
  candidate: unknown,
): Promise<ReceizOfflineReserveWebAuthnConsumptionReceiptV1> {
  try {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) fail();
    const record = candidate as Record<string, unknown>;
    exactKeys(record, [
      "schema", "qualificationDigest", "profileId", "profileEvidenceDigest", "custodyPublicKeyRawB64u",
      "installationCommitment", "predecessorAccountPortableStateDigest", "successorReserveStateContentDigest",
      "noteArtifactSha256", "amountPhiMicro", "amountUsdCents", "usdPerPhiMicrocents", "reserveBeforePhiMicro",
      "reserveAfterPhiMicro", "reserveBeforeUsdCents",
      "reserveAfterUsdCents", "acceptedAtKai", "transitionNonce", "expectedReserveStateCommitment",
      "nextReserveStateCommitment", "expectedReserveStateSequence", "nextReserveStateSequence", "rpId", "origin",
      "receiptDigest", "authenticatorDataB64u", "clientDataJSONB64u", "signatureB64u",
    ]);
    const receipt = record as unknown as ReceizOfflineReserveWebAuthnConsumptionReceiptV1;
    if (receipt.schema !== RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA || !SHA256_RE.test(receipt.receiptDigest)) fail();
    const qualification = await verifyReceizOfflineNoteCustodyQualification({
      schema: "receiz.offline-note.custody-qualification.v1", status: "qualified",
      profileId: receipt.profileId, profileEvidenceDigest: receipt.profileEvidenceDigest,
      adapterKind: "pwa-webauthn", custodyPublicKeyAlgorithm: "P-256",
      custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u,
      installationCommitment: receipt.installationCommitment,
      stateCommitment: receipt.expectedReserveStateCommitment,
      stateSequence: receipt.expectedReserveStateSequence,
      qualificationDigest: receipt.qualificationDigest,
    });
    const prepared = await prepareReceizOfflineReserveWebAuthnConsumptionChallenge({ qualification, ...receipt });
    if (prepared.receiptDigest !== receipt.receiptDigest) fail();
    await verifyReceizOfflineNoteWebAuthnAssertion({
      custodyPublicKeyRawB64u: receipt.custodyPublicKeyRawB64u, rpId: receipt.rpId, origin: receipt.origin,
      challengeB64u: prepared.challengeB64u, expectedSignCount: receipt.nextReserveStateSequence,
      authenticatorDataB64u: receipt.authenticatorDataB64u, clientDataJSONB64u: receipt.clientDataJSONB64u,
      signatureB64u: receipt.signatureB64u,
    });
    return Object.freeze(structuredClone(receipt));
  } catch { fail(); }
}
