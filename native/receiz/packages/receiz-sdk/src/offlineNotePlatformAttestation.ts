import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

export const RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA =
  "receiz.offline-note.platform-attestation-certificate.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const B64U_RE = /^[A-Za-z0-9_-]+$/;
const AAGUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;
const TRUSTED_FORMATS = ["apple", "android-key", "packed", "tpm", "fido-u2f"] as const;

export type ReceizOfflineNotePlatformAttestationFormat = (typeof TRUSTED_FORMATS)[number];

export type ReceizOfflineNotePlatformAttestationCertificateV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA;
  attestationFormat: ReceizOfflineNotePlatformAttestationFormat;
  aaguid: string;
  rpId: string;
  origin: string;
  credentialIdB64u: string;
  custodyPublicKeyAlgorithm: "P-256";
  custodyPublicKeyRawB64u: string;
  attestationObjectSha256: string;
  registrationCounter: string;
  credentialDeviceType: "singleDevice";
  credentialBackedUp: false;
  userVerified: true;
  issuedAtKai: string;
  issuerKid: string;
  certificateDigest: string;
  signatureB64u: string;
}>;

type CertificateBasis = Omit<
  ReceizOfflineNotePlatformAttestationCertificateV1,
  "certificateDigest" | "signatureB64u"
>;

function fail(): never {
  throw new TypeError("RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_INVALID");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) fail();
}

function strictBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function certificateBytes(digest: string): Uint8Array {
  return new TextEncoder().encode(
    `${RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA}:${digest}`,
  );
}

async function assertP256(rawB64u: string): Promise<void> {
  if (!B64U_RE.test(rawB64u)) fail();
  try {
    await crypto.subtle.importKey(
      "raw",
      strictBuffer(receizBase64UrlDecode(rawB64u)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    fail();
  }
}

function basisOf(value: ReceizOfflineNotePlatformAttestationCertificateV1): CertificateBasis {
  const { certificateDigest: _digest, signatureB64u: _signature, ...basis } = value;
  return basis;
}

export async function createReceizOfflineNotePlatformAttestationCertificate(input: Readonly<{
  attestationFormat: ReceizOfflineNotePlatformAttestationFormat;
  aaguid: string;
  rpId: string;
  origin: string;
  credentialIdB64u: string;
  custodyPublicKeyRawB64u: string;
  attestationObjectSha256: string;
  registrationCounter: string;
  credentialDeviceType: "singleDevice";
  credentialBackedUp: false;
  userVerified: true;
  issuedAtKai: string;
  issuerKid: string;
  sign(bytes: Uint8Array): Promise<ArrayBuffer | Uint8Array>;
}>): Promise<ReceizOfflineNotePlatformAttestationCertificateV1> {
  if (!(TRUSTED_FORMATS as readonly string[]).includes(input.attestationFormat)
    || !AAGUID_RE.test(input.aaguid)
    || !input.rpId.trim()
    || !input.origin.startsWith("https://")
    || !B64U_RE.test(input.credentialIdB64u)
    || !SHA256_RE.test(input.attestationObjectSha256)
    || !UINT_RE.test(input.registrationCounter)
    || input.credentialDeviceType !== "singleDevice"
    || input.credentialBackedUp !== false
    || input.userVerified !== true
    || !UINT_RE.test(input.issuedAtKai)
    || !input.issuerKid.trim()) fail();
  await assertP256(input.custodyPublicKeyRawB64u);
  const basis: CertificateBasis = Object.freeze({
    schema: RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA,
    attestationFormat: input.attestationFormat,
    aaguid: input.aaguid,
    rpId: input.rpId.trim(),
    origin: input.origin,
    credentialIdB64u: input.credentialIdB64u,
    custodyPublicKeyAlgorithm: "P-256",
    custodyPublicKeyRawB64u: input.custodyPublicKeyRawB64u,
    attestationObjectSha256: input.attestationObjectSha256,
    registrationCounter: input.registrationCounter,
    credentialDeviceType: "singleDevice",
    credentialBackedUp: false,
    userVerified: true,
    issuedAtKai: input.issuedAtKai,
    issuerKid: input.issuerKid,
  });
  const certificateDigest = await digestReceizAuthority(
    "identity",
    RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA,
    basis,
  );
  const signed = await input.sign(certificateBytes(certificateDigest));
  const signatureB64u = receizBase64UrlEncode(
    signed instanceof Uint8Array ? signed : new Uint8Array(signed),
  );
  if (!B64U_RE.test(signatureB64u)) fail();
  return Object.freeze({ ...basis, certificateDigest, signatureB64u });
}

export async function verifyReceizOfflineNotePlatformAttestationCertificate(
  candidate: unknown,
  options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    expectedRpId: string;
    expectedOrigin: string;
    expectedCustodyPublicKeyRawB64u: string;
  }>,
): Promise<ReceizOfflineNotePlatformAttestationCertificateV1> {
  try {
    if (!isRecord(candidate)) fail();
    exactKeys(candidate, [
      "schema", "attestationFormat", "aaguid", "rpId", "origin", "credentialIdB64u",
      "custodyPublicKeyAlgorithm", "custodyPublicKeyRawB64u", "attestationObjectSha256",
      "registrationCounter",
      "credentialDeviceType", "credentialBackedUp", "userVerified", "issuedAtKai",
      "issuerKid", "certificateDigest", "signatureB64u",
    ]);
    if (candidate.schema !== RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA
      || typeof candidate.attestationFormat !== "string"
      || !(TRUSTED_FORMATS as readonly string[]).includes(candidate.attestationFormat)
      || typeof candidate.aaguid !== "string"
      || !AAGUID_RE.test(candidate.aaguid)
      || candidate.rpId !== options.expectedRpId
      || candidate.origin !== options.expectedOrigin
      || typeof candidate.credentialIdB64u !== "string"
      || !B64U_RE.test(candidate.credentialIdB64u)
      || candidate.custodyPublicKeyAlgorithm !== "P-256"
      || candidate.custodyPublicKeyRawB64u !== options.expectedCustodyPublicKeyRawB64u
      || typeof candidate.attestationObjectSha256 !== "string"
      || !SHA256_RE.test(candidate.attestationObjectSha256)
      || typeof candidate.registrationCounter !== "string"
      || !UINT_RE.test(candidate.registrationCounter)
      || candidate.credentialDeviceType !== "singleDevice"
      || candidate.credentialBackedUp !== false
      || candidate.userVerified !== true
      || typeof candidate.issuedAtKai !== "string"
      || !UINT_RE.test(candidate.issuedAtKai)
      || typeof candidate.issuerKid !== "string"
      || !candidate.issuerKid.trim()
      || typeof candidate.certificateDigest !== "string"
      || !SHA256_RE.test(candidate.certificateDigest)
      || typeof candidate.signatureB64u !== "string"
      || !B64U_RE.test(candidate.signatureB64u)) fail();
    await assertP256(candidate.custodyPublicKeyRawB64u);
    const typed = candidate as unknown as ReceizOfflineNotePlatformAttestationCertificateV1;
    const digest = await digestReceizAuthority(
      "identity",
      RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA,
      basisOf(typed),
    );
    if (digest !== candidate.certificateDigest) fail();
    const roots = options.roots ?? receizCurrentPinnedSignatureV4Roots();
    const root = roots.get(candidate.issuerKid);
    if (!root || root.status !== "active" || root.alg !== "Ed25519") fail();
    const key = await crypto.subtle.importKey(
      "raw",
      strictBuffer(receizBase64UrlDecode(root.publicKeyRawB64u)),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      strictBuffer(receizBase64UrlDecode(candidate.signatureB64u)),
      strictBuffer(certificateBytes(candidate.certificateDigest)),
    );
    if (!valid) fail();
    return Object.freeze(structuredClone(typed));
  } catch {
    fail();
  }
}
