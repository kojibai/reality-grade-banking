import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { verifyReceizOfflineNoteWebAuthnAssertion } from "./offlineNoteWebAuthnCustody.js";

export const RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA =
  "receiz.offline-note.pwa-rollback-conformance.v1" as const;

const B64U_RE = /^[A-Za-z0-9_-]+$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

export type ReceizOfflineNoteRollbackCredential = Readonly<{
  credentialIdB64u: string;
  custodyPublicKeyRawB64u: string;
  rpId: string;
  origin: string;
}>;

export type ReceizOfflineNoteRollbackAssertion = Readonly<{
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>;

export interface ReceizOfflineNoteRollbackAssertionClient {
  assert(input: Readonly<{ credentialIdB64u: string; challengeB64u: string }>):
    Promise<ReceizOfflineNoteRollbackAssertion>;
}

export type ReceizOfflineNoteRollbackConformanceEvidenceV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA;
  nonceB64u: string;
  firstDigest: string;
  firstAssertionDigest: string;
  secondDigest: string;
  firstAssertion: ReceizOfflineNoteRollbackAssertion;
  secondAssertion: ReceizOfflineNoteRollbackAssertion;
  initialStateSequence: string;
  conformedStateSequence: string;
  conformanceEvidenceDigest: string;
}>;

function fail(): never {
  throw new TypeError("OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED");
}

function challenge(digest: string): string {
  if (!/^[0-9a-f]{64}$/.test(digest)) fail();
  return receizBase64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => (
    Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16)
  )));
}

function sequence(assertion: ReceizOfflineNoteRollbackAssertion): string {
  const bytes = receizBase64UrlDecode(assertion.authenticatorDataB64u);
  if (bytes.byteLength < 37) fail();
  return String(new DataView(bytes.buffer, bytes.byteOffset + 33, 4).getUint32(0, false));
}

async function buildDigests(input: Readonly<{
  credential: ReceizOfflineNoteRollbackCredential;
  registrationCounter: string;
  nonceB64u: string;
  firstAssertion?: ReceizOfflineNoteRollbackAssertion;
  initialStateSequence?: string;
}>): Promise<Readonly<{ firstDigest: string; firstAssertionDigest?: string; secondDigest?: string }>> {
  const firstDigest = await digestReceizAuthority("transition", RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA, {
    phase: "initial",
    nonce: input.nonceB64u,
    credentialIdB64u: input.credential.credentialIdB64u,
    custodyPublicKeyRawB64u: input.credential.custodyPublicKeyRawB64u,
    rpId: input.credential.rpId,
    origin: input.credential.origin,
  });
  if (!input.firstAssertion || !input.initialStateSequence) return { firstDigest };
  const firstAssertionDigest = await digestReceizAuthority(
    "transition", RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA, {
      phase: "initial-accepted",
      initialStateSequence: input.initialStateSequence,
      registrationCounter: input.registrationCounter,
      ...input.firstAssertion,
    },
  );
  const secondDigest = await digestReceizAuthority("transition", RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA, {
    phase: "exact-successor",
    nonce: input.nonceB64u,
    firstDigest,
    firstAssertionDigest,
    initialStateSequence: input.initialStateSequence,
    credentialIdB64u: input.credential.credentialIdB64u,
  });
  return { firstDigest, firstAssertionDigest, secondDigest };
}

async function evidenceDigest(input: Omit<ReceizOfflineNoteRollbackConformanceEvidenceV1, "schema" | "conformanceEvidenceDigest">,
  credential: ReceizOfflineNoteRollbackCredential): Promise<string> {
  return digestReceizAuthority("transition", RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA, {
    credentialIdB64u: credential.credentialIdB64u,
    custodyPublicKeyRawB64u: credential.custodyPublicKeyRawB64u,
    rpId: credential.rpId,
    origin: credential.origin,
    firstDigest: input.firstDigest,
    firstAssertionDigest: input.firstAssertionDigest,
    secondDigest: input.secondDigest,
    secondAssertion: input.secondAssertion,
    initialStateSequence: input.initialStateSequence,
    conformedStateSequence: input.conformedStateSequence,
  });
}

export async function runReceizOfflineNoteRollbackConformance(input: Readonly<{
  credential: ReceizOfflineNoteRollbackCredential;
  webAuthn: ReceizOfflineNoteRollbackAssertionClient;
  registrationCounter: string;
}>): Promise<ReceizOfflineNoteRollbackConformanceEvidenceV1> {
  try {
    if (!UINT_RE.test(input.registrationCounter)) fail();
    const nonceB64u = receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    const first = await buildDigests({ credential: input.credential, registrationCounter: input.registrationCounter, nonceB64u });
    const firstAssertion = await input.webAuthn.assert({
      credentialIdB64u: input.credential.credentialIdB64u,
      challengeB64u: challenge(first.firstDigest),
    });
    const initialStateSequence = sequence(firstAssertion);
    if (BigInt(initialStateSequence) !== BigInt(input.registrationCounter) + 1n) fail();
    await verifyReceizOfflineNoteWebAuthnAssertion({
      ...input.credential,
      challengeB64u: challenge(first.firstDigest),
      expectedSignCount: initialStateSequence,
      ...firstAssertion,
    });
    const complete = await buildDigests({
      credential: input.credential,
      registrationCounter: input.registrationCounter,
      nonceB64u,
      firstAssertion,
      initialStateSequence,
    });
    if (!complete.firstAssertionDigest || !complete.secondDigest) fail();
    const secondAssertion = await input.webAuthn.assert({
      credentialIdB64u: input.credential.credentialIdB64u,
      challengeB64u: challenge(complete.secondDigest),
    });
    const conformedStateSequence = sequence(secondAssertion);
    if (BigInt(conformedStateSequence) !== BigInt(initialStateSequence) + 1n) fail();
    await verifyReceizOfflineNoteWebAuthnAssertion({
      ...input.credential,
      challengeB64u: challenge(complete.secondDigest),
      expectedSignCount: conformedStateSequence,
      ...secondAssertion,
    });
    const basis = Object.freeze({
      nonceB64u,
      firstDigest: complete.firstDigest,
      firstAssertionDigest: complete.firstAssertionDigest,
      secondDigest: complete.secondDigest,
      firstAssertion,
      secondAssertion,
      initialStateSequence,
      conformedStateSequence,
    });
    return Object.freeze({
      schema: RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA,
      ...basis,
      conformanceEvidenceDigest: await evidenceDigest(basis, input.credential),
    });
  } catch { fail(); }
}

export async function verifyReceizOfflineNoteRollbackConformanceEvidence(input: Readonly<{
  evidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
  credential: ReceizOfflineNoteRollbackCredential;
  registrationCounter: string;
}>): Promise<ReceizOfflineNoteRollbackConformanceEvidenceV1> {
  try {
    const evidence = input.evidence;
    if (evidence.schema !== RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA
      || !UINT_RE.test(input.registrationCounter)
      || !B64U_RE.test(evidence.nonceB64u)
      || sequence(evidence.firstAssertion) !== evidence.initialStateSequence
      || sequence(evidence.secondAssertion) !== evidence.conformedStateSequence
      || BigInt(evidence.initialStateSequence) !== BigInt(input.registrationCounter) + 1n
      || BigInt(evidence.conformedStateSequence) !== BigInt(evidence.initialStateSequence) + 1n) fail();
    const digests = await buildDigests({
      credential: input.credential,
      registrationCounter: input.registrationCounter,
      nonceB64u: evidence.nonceB64u,
      firstAssertion: evidence.firstAssertion,
      initialStateSequence: evidence.initialStateSequence,
    });
    if (digests.firstDigest !== evidence.firstDigest
      || digests.firstAssertionDigest !== evidence.firstAssertionDigest
      || digests.secondDigest !== evidence.secondDigest) fail();
    await verifyReceizOfflineNoteWebAuthnAssertion({
      ...input.credential,
      challengeB64u: challenge(evidence.firstDigest),
      expectedSignCount: evidence.initialStateSequence,
      ...evidence.firstAssertion,
    });
    await verifyReceizOfflineNoteWebAuthnAssertion({
      ...input.credential,
      challengeB64u: challenge(evidence.secondDigest),
      expectedSignCount: evidence.conformedStateSequence,
      ...evidence.secondAssertion,
    });
    const { schema: _schema, conformanceEvidenceDigest: _digest, ...basis } = evidence;
    if (await evidenceDigest(basis, input.credential) !== evidence.conformanceEvidenceDigest) fail();
    return Object.freeze(structuredClone(evidence));
  } catch { fail(); }
}
