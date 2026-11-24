import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  createReceizOfflineNoteCustodyQualification,
  createReceizOfflineNoteReceivingCustodyCommitment,
  signReceizOfflineNoteAndroidConsumptionReceipt,
  verifyReceizOfflineNoteExactConsumptionReceipt,
  type ReceizOfflineNoteIrreversibleConsumptionReceiptV1,
  type ReceizOfflineNoteReceivingCustodyCommitmentV1,
} from "./offlineNoteIrreversibleCustody.js";
import { verifyReceizPlatformAttestationIssuer } from "./offlineNotePlatformAttestation.js";
import { isCanonicalBase64Url, isCanonicalKaiPulse, isCanonicalKeyId } from "./verifier/canonicalSyntax.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

const ATTESTATION = "receiz.offline-note.android-key-pair.v1" as const;
const CUSTODY = "receiz.offline-note.android-receiving-custody.v1" as const;
const ACTIVATION = "receiz.offline-note.android-activation.v1" as const;
const HANDOFF = "receiz.offline-note.android-handoff.v1" as const;
const HEX = /^[a-f0-9]{64}$/u;
const POSITIVE = /^[1-9][0-9]{0,24}$/u;
const encoder = new TextEncoder();

export type ReceizAndroidNoteAttestedKey = Readonly<{
  slotDigest: string;
  custodyPublicKeyRawB64u: string;
  attestationLeafSha256: string;
  securityLevel: "strongbox" | "trusted-environment";
}>;

type AttestationBasis = Readonly<{
  schema: typeof ATTESTATION;
  purpose: "holding" | "reserve";
  origin: string;
  receive: ReceizAndroidNoteAttestedKey;
  spend: ReceizAndroidNoteAttestedKey;
  issuedAtKai: string;
  issuerKid: string;
}>;

export type ReceizAndroidNoteAttestation = AttestationBasis & Readonly<{
  certificateDigest: string;
  signatureB64u: string;
}>;

export type ReceizAndroidNoteReceivingCustody =
  Omit<ReceizOfflineNoteReceivingCustodyCommitmentV1, "schema" | "adapterKind">
  & Readonly<{ schema: typeof CUSTODY; adapterKind: "android-hardware"; attestation: ReceizAndroidNoteAttestation }>;

export type ReceizAndroidNoteActivationHead = Readonly<{
  noteId: string;
  verifiedSuccessorArtifactSha256: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
}>;

export type ReceizAndroidNoteActivation = Readonly<{
  schema: typeof ACTIVATION;
  head: ReceizAndroidNoteActivationHead;
  receiptDigest: string;
  signatureB64u: string;
}>;

export type ReceizAndroidNoteHandoff = Readonly<{
  schema: typeof HANDOFF;
  custody: ReceizAndroidNoteReceivingCustody;
  activation: ReceizAndroidNoteActivation;
  consumption: ReceizOfflineNoteIrreversibleConsumptionReceiptV1;
  receiptDigest: string;
}>;

type Next = Pick<ReceizOfflineNoteIrreversibleConsumptionReceiptV1,
  "noteId" | "predecessorArtifactSha256" | "receiverCustodyCommitmentDigest"
  | "wholeValuePhiMicro" | "acceptedAtKai" | "successorBasisDigest">;

type RootOptions = Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> | undefined }>;
export type ReceizAndroidNoteSign = (
  challenge: Readonly<{ slotDigest: string; payload: string }>,
) => Promise<Readonly<{ signatureB64u: string }>>;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_NOTE_ANDROID_HANDOFF_INVALID");
}

function exact(value: unknown, fields: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) fail();
}

function bytes(value: unknown, length: number) {
  if (typeof value !== "string" || value.length !== Math.ceil(length * 4 / 3) || !isCanonicalBase64Url(value)) fail();
  const raw = receizBase64UrlDecode(value);
  if (raw.length !== length) fail();
  return Uint8Array.from(raw).buffer;
}

async function publicKey(raw: string) {
  return crypto.subtle.importKey("raw", bytes(raw, 65), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
}

async function validateAttestation(basis: AttestationBasis) {
  if (basis.schema !== ATTESTATION || !isCanonicalKaiPulse(basis.issuedAtKai) || !isCanonicalKeyId(basis.issuerKid)) fail();
  if (basis.purpose !== "holding" && basis.purpose !== "reserve") fail();
  const origin = new URL(basis.origin);
  if (origin.origin !== basis.origin || origin.protocol !== "https:") fail();
  for (const key of [basis.receive, basis.spend]) {
    exact(key, ["slotDigest", "custodyPublicKeyRawB64u", "attestationLeafSha256", "securityLevel"]);
    if (!HEX.test(key.slotDigest) || !HEX.test(key.attestationLeafSha256)
      || key.securityLevel !== "strongbox" && key.securityLevel !== "trusted-environment") fail();
    await publicKey(key.custodyPublicKeyRawB64u);
  }
  if (basis.receive.slotDigest === basis.spend.slotDigest
    || basis.receive.custodyPublicKeyRawB64u === basis.spend.custodyPublicKeyRawB64u) fail();
}

/** The same Receiz root certifies the two independently verified Android slots.
 * The certificate carries opaque slot digests, without an account or device identifier. */
export async function createReceizAndroidNoteAttestation(input: Omit<AttestationBasis, "schema"> & Readonly<{
  sign(bytes: Uint8Array): Promise<Uint8Array | ArrayBuffer>;
}>): Promise<ReceizAndroidNoteAttestation> {
  const { sign, ...keys } = input;
  const basis = { schema: ATTESTATION, ...structuredClone(keys) };
  exact(basis, ["schema", "purpose", "origin", "issuedAtKai", "issuerKid", "spend", "receive"]);
  await validateAttestation(basis);
  const certificateDigest = await digestReceizAuthority("identity", ATTESTATION, basis);
  const signature = new Uint8Array(await sign(encoder.encode(`${ATTESTATION}:${certificateDigest}`)));
  if (signature.length !== 64) fail();
  return Object.freeze({ ...basis, certificateDigest, signatureB64u: receizBase64UrlEncode(signature) });
}

async function noteQualification(attestation: ReceizAndroidNoteAttestation, stateCommitment: string, stateSequence: string) {
  return createReceizOfflineNoteCustodyQualification({
    profileId: ATTESTATION, profileEvidenceDigest: attestation.certificateDigest,
    adapterKind: "android-hardware", custodyPublicKeyRawB64u: attestation.spend.custodyPublicKeyRawB64u,
    stateCommitment, stateSequence,
  });
}

export async function createReceizAndroidNoteReceivingCustody(candidate: unknown, options: RootOptions = {}) {
  const certificate = structuredClone(candidate) as ReceizAndroidNoteAttestation;
  exact(certificate, ["schema", "purpose", "origin", "receive", "spend", "issuedAtKai", "issuerKid", "certificateDigest", "signatureB64u"]);
  const { certificateDigest, signatureB64u, ...attestation } = certificate;
  await validateAttestation(attestation);
  if (await digestReceizAuthority("identity", ATTESTATION, attestation) !== certificateDigest
    || !await verifyReceizPlatformAttestationIssuer({
      issuerKid: attestation.issuerKid, issuedAtKai: attestation.issuedAtKai,
      historicalRootAtIssuance: true, roots: options.roots,
      signature: new Uint8Array(bytes(signatureB64u, 64)), signedBytes: encoder.encode(`${ATTESTATION}:${certificateDigest}`),
    })) fail();
  Object.freeze(certificate.receive);
  Object.freeze(certificate.spend);
  Object.freeze(certificate);
  const qualification = await noteQualification(certificate, certificateDigest, "1");
  const receiving = await createReceizOfflineNoteReceivingCustodyCommitment(qualification);
  const { receivingCustodyCommitmentDigest: _baseDigest, ...base } = receiving;
  const basis = { ...base, schema: CUSTODY, adapterKind: "android-hardware" as const, attestation: certificate };
  const receivingCustodyCommitmentDigest = await digestReceizAuthority("identity", CUSTODY, basis);
  return Object.freeze({ ...basis, receivingCustodyCommitmentDigest }) satisfies ReceizAndroidNoteReceivingCustody;
}

export async function verifyReceizAndroidNoteReceivingCustody(
  input: unknown, options: RootOptions = {},
): Promise<ReceizAndroidNoteReceivingCustody> {
  const value = structuredClone(input) as ReceizAndroidNoteReceivingCustody;
  if (!value || value.schema !== CUSTODY) fail();
  const expected = await createReceizAndroidNoteReceivingCustody(value.attestation, options);
  const { receivingCustodyCommitmentDigest, ...basis } = value;
  if (receivingCustodyCommitmentDigest !== expected.receivingCustodyCommitmentDigest
    || await digestReceizAuthority("identity", CUSTODY, basis) !== receivingCustodyCommitmentDigest) fail();
  return expected;
}

export async function qualifyReceizAndroidNoteReceivingCustody(candidate: unknown, options: RootOptions = {}) {
  const custody = await verifyReceizAndroidNoteReceivingCustody(candidate, options);
  return noteQualification(custody.attestation, custody.attestation.certificateDigest, "1");
}

async function activationDigest(custody: ReceizAndroidNoteReceivingCustody, head: ReceizAndroidNoteActivationHead) {
  exact(head, ["noteId", "verifiedSuccessorArtifactSha256", "wholeValuePhiMicro", "acceptedAtKai"]);
  if (custody.attestation.purpose !== "holding" || typeof head.noteId !== "string" || !head.noteId.trim() || !HEX.test(head.verifiedSuccessorArtifactSha256)
    || !POSITIVE.test(head.wholeValuePhiMicro) || !isCanonicalKaiPulse(head.acceptedAtKai)
    || BigInt(head.acceptedAtKai) < BigInt(custody.attestation.issuedAtKai)) fail();
  return digestReceizAuthority("transition", ACTIVATION, { head, custody: custody.receivingCustodyCommitmentDigest });
}

async function verifyActivation(custody: ReceizAndroidNoteReceivingCustody, activation: ReceizAndroidNoteActivation) {
  exact(activation, ["schema", "head", "receiptDigest", "signatureB64u"]);
  const digest = await activationDigest(custody, activation.head);
  if (activation.schema !== ACTIVATION || digest !== activation.receiptDigest
    || !await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, await publicKey(custody.attestation.receive.custodyPublicKeyRawB64u),
      bytes(activation.signatureB64u, 64), encoder.encode(`${ACTIVATION}:${digest}`),
    )) fail();
  return digest;
}

export async function activateReceizAndroidNote(input: RootOptions & Readonly<{
  custody: unknown; head: ReceizAndroidNoteActivationHead; sign: ReceizAndroidNoteSign;
}>): Promise<ReceizAndroidNoteActivation> {
  const { sign, roots } = input;
  const head = Object.freeze(structuredClone(input.head));
  const custody = await verifyReceizAndroidNoteReceivingCustody(input.custody, { roots });
  const receiptDigest = await activationDigest(custody, head);
  const { signatureB64u } = await sign({
    slotDigest: custody.attestation.receive.slotDigest, payload: `${ACTIVATION}:${receiptDigest}`,
  });
  const activation = Object.freeze({ schema: ACTIVATION, head, receiptDigest, signatureB64u });
  await verifyActivation(custody, activation);
  return activation;
}

async function prepare(
  custody: ReceizAndroidNoteReceivingCustody, activation: ReceizAndroidNoteActivation, next: Next,
) {
  const stateCommitment = await verifyActivation(custody, activation);
  const { head } = activation;
  if (next.noteId !== head.noteId || next.predecessorArtifactSha256 !== head.verifiedSuccessorArtifactSha256
    || next.wholeValuePhiMicro !== head.wholeValuePhiMicro || !isCanonicalKaiPulse(next.acceptedAtKai)
    || BigInt(next.acceptedAtKai) < BigInt(head.acceptedAtKai)) fail();
  const qualification = await noteQualification(custody.attestation, stateCommitment, "2");
  const consumedStateCommitment = await digestReceizAuthority("transition", HANDOFF, {
    next, custody: custody.receivingCustodyCommitmentDigest, activation: stateCommitment,
  });
  return {
    ...next, qualification, consumedStateCommitment, expectedStateCommitment: stateCommitment,
    expectedStateSequence: "2", consumedStateSequence: "3",
  };
}

export async function signReceizAndroidNoteHandoff(input: RootOptions & Readonly<{
  custody: unknown; activation: ReceizAndroidNoteActivation; next: Next; sign: ReceizAndroidNoteSign;
}>): Promise<ReceizAndroidNoteHandoff> {
  const { roots, sign } = input;
  const { activation, next } = structuredClone({ activation: input.activation, next: input.next });
  const custody = await verifyReceizAndroidNoteReceivingCustody(input.custody, { roots });
  const basis = await prepare(custody, activation, next);
  const consumption = await signReceizOfflineNoteAndroidConsumptionReceipt({
    ...basis,
    sign: async payload => new Uint8Array(bytes((await sign({
      slotDigest: custody.attestation.spend.slotDigest, payload: new TextDecoder().decode(payload),
    })).signatureB64u, 64)),
  });
  return Object.freeze({ schema: HANDOFF, custody, activation, consumption, receiptDigest: consumption.receiptDigest });
}

export async function verifyReceizAndroidNoteHandoff(candidate: unknown, options: RootOptions = {}) {
  const value = structuredClone(candidate) as ReceizAndroidNoteHandoff;
  exact(value, ["schema", "custody", "activation", "consumption", "receiptDigest"]);
  if (value.schema !== HANDOFF || !value.consumption || value.receiptDigest !== value.consumption.receiptDigest) fail();
  const custody = await verifyReceizAndroidNoteReceivingCustody(value.custody, options);
  const { noteId, predecessorArtifactSha256, receiverCustodyCommitmentDigest, wholeValuePhiMicro, acceptedAtKai, successorBasisDigest } = value.consumption;
  const expected = await prepare(custody, value.activation, {
    noteId, predecessorArtifactSha256, receiverCustodyCommitmentDigest, wholeValuePhiMicro, acceptedAtKai, successorBasisDigest,
  });
  const receipt = await verifyReceizOfflineNoteExactConsumptionReceipt(value.consumption, expected);
  return Object.freeze({ ...receipt, currentCustodyCommitmentDigest: custody.receivingCustodyCommitmentDigest,
    activationQualificationDigest: custody.qualificationDigest });
}
