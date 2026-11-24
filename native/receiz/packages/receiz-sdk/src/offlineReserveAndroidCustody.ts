import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode } from "./identity.js";
import { isCanonicalBase64Url } from "./verifier/canonicalSyntax.js";
import {
  qualifyReceizAndroidNoteReceivingCustody,
  verifyReceizAndroidNoteReceivingCustody,
  type ReceizAndroidNoteSign,
} from "./offlineNoteAndroidHandoff.js";
import {
  prepareReceizOfflineReserveConsumptionBasis,
  type ReceizOfflineReserveConsumptionInput,
} from "./offlineReserveWebAuthnCustody.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

const SCHEMA = "receiz.offline-reserve.android-consumption.v1";
const SHA256 = /^[a-f0-9]{64}$/u;

type Amounts = Omit<ReceizOfflineReserveConsumptionInput, "qualification"
  | "expectedReserveStateCommitment" | "nextReserveStateCommitment"
  | "expectedReserveStateSequence" | "nextReserveStateSequence">;

type Source = Readonly<{
  custody: unknown;
  fundingArtifactSha256: string;
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | undefined;
}>;

type Receipt = Awaited<ReturnType<typeof preparation>>["basis"] & Readonly<{
  receiptDigest: string;
  signatureB64u: string;
}>;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_RESERVE_ANDROID_CONSUMPTION_INVALID");
}

async function preparation(source: Source, command: Amounts) {
  const custody = await verifyReceizAndroidNoteReceivingCustody(source.custody, { roots: source.roots });
  const qualification = await qualifyReceizAndroidNoteReceivingCustody(custody, { roots: source.roots });
  // A disposable native Reserve key can fund exactly one Note from its full allocation.
  if (custody.attestation.purpose !== "reserve" || !SHA256.test(source.fundingArtifactSha256) || command.reserveAfterPhiMicro !== "0"
    || command.reserveAfterUsdCents !== "0" || !/^(0|[1-9][0-9]*)$/u.test(command.acceptedAtKai)
    || BigInt(command.acceptedAtKai) < BigInt(custody.attestation.issuedAtKai)) fail();
  const nextReserveStateCommitment = await digestReceizAuthority("transition", SCHEMA, {
    ...command, fundingArtifactSha256: source.fundingArtifactSha256, state: qualification.stateCommitment,
  });
  const fields = await prepareReceizOfflineReserveConsumptionBasis({
    ...command, qualification, expectedReserveStateCommitment: qualification.stateCommitment,
    nextReserveStateCommitment, expectedReserveStateSequence: qualification.stateSequence,
    nextReserveStateSequence: String(BigInt(qualification.stateSequence) + 1n),
  });
  const basis = Object.freeze({ schema: SCHEMA, fundingArtifactSha256: source.fundingArtifactSha256, ...fields });
  const receiptDigest = await digestReceizAuthority("transition", SCHEMA, basis);
  return { basis, receiptDigest, signer: custody.attestation.spend };
}

export type ReceizOfflineReserveAndroidConsumptionReceiptV1 = Receipt;

export async function signReceizOfflineReserveAndroidConsumption(
  input: Source & Readonly<{ command: Amounts; sign: ReceizAndroidNoteSign }>,
) {
  const { basis, receiptDigest, signer } = await preparation(input, structuredClone(input.command));
  const { signatureB64u } = await input.sign({ slotDigest: signer.slotDigest, payload: `${SCHEMA}:${receiptDigest}` });
  return verifyReceizOfflineReserveAndroidConsumption({ ...basis, receiptDigest, signatureB64u }, input);
}

export async function verifyReceizOfflineReserveAndroidConsumption(
  candidate: unknown,
  source: Source,
): Promise<Receipt> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) fail();
  const receipt = structuredClone(candidate) as Receipt;
  if (receipt.schema !== SCHEMA || typeof receipt.signatureB64u !== "string"
    || receipt.signatureB64u.length !== 86 || !isCanonicalBase64Url(receipt.signatureB64u)) fail();
  const command: Amounts = {
    predecessorAccountPortableStateDigest: receipt.predecessorAccountPortableStateDigest,
    successorReserveStateContentDigest: receipt.successorReserveStateContentDigest,
    noteArtifactSha256: receipt.noteArtifactSha256,
    amountPhiMicro: receipt.amountPhiMicro,
    amountUsdCents: receipt.amountUsdCents,
    usdPerPhiMicrocents: receipt.usdPerPhiMicrocents,
    reserveBeforePhiMicro: receipt.reserveBeforePhiMicro,
    reserveAfterPhiMicro: receipt.reserveAfterPhiMicro,
    reserveBeforeUsdCents: receipt.reserveBeforeUsdCents,
    reserveAfterUsdCents: receipt.reserveAfterUsdCents,
    acceptedAtKai: receipt.acceptedAtKai,
    transitionNonce: receipt.transitionNonce,
  };
  const expected = await preparation(source, command);
  const { signatureB64u, receiptDigest, ...basis } = receipt;
  if (receiptDigest !== expected.receiptDigest
    || await digestReceizAuthority("transition", SCHEMA, basis) !== receiptDigest) fail();
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(receizBase64UrlDecode(expected.signer.custodyPublicKeyRawB64u)),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key,
    Uint8Array.from(receizBase64UrlDecode(signatureB64u)), new TextEncoder().encode(`${SCHEMA}:${receiptDigest}`))) fail();
  return Object.freeze(receipt);
}
