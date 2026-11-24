import { digestReceizAuthority } from "./authorityEncoding.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { isCanonicalBase64Url, isCanonicalKaiPulse, isCanonicalKeyId } from "./verifier/canonicalSyntax.js";
import { verifyReceizPlatformAttestationIssuer } from "./offlineNotePlatformAttestation.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

export const RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_SCHEMA = "receiz.account-financial.android-key-certificate.v1" as const;

const CHALLENGE_SCHEMA = "receiz.account-financial.android-key-challenge.v1";
const WALLET_APPLICATION = /^[a-zA-Z0-9_.:-]{3,240}$/;
const ACCOUNT_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const HEX_SHA256 = /^[a-f0-9]{64}$/;

export type ReceizAndroidWalletEnrollmentSlot = Readonly<{
  applicationId: string;
  userId: string;
  recordSignerPublicKey: string;
  origin: string;
  challengeB64u: string;
  role: "receive" | "spend";
  purpose?: "note" | "note-reserve";
  index: number;
}>;

type AndroidKeyCertificateBasis = Readonly<{
  schema: typeof RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_SCHEMA;
  slotDigest: string;
  custodyPublicKeyRawB64u: string;
  attestationLeafSha256: string;
  securityLevel: "strongbox" | "trusted-environment";
  hardwareUsageCount: 1;
  issuedAtKai: string;
  issuerKid: string;
}>;

export type ReceizAndroidWalletKeyCertificate = AndroidKeyCertificateBasis & Readonly<{
  certificateDigest: string;
  signatureB64u: string;
}>;

type CertificateInput = Omit<AndroidKeyCertificateBasis, "schema" | "slotDigest" | "hardwareUsageCount"> & Readonly<{
  slot: ReceizAndroidWalletEnrollmentSlot;
  sign(bytes: Uint8Array): Promise<ArrayBuffer | Uint8Array>;
}>;

function fail(): never {
  throw new TypeError("RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_INVALID");
}

function canonicalBytes(value: unknown, length: number): Uint8Array {
  if (typeof value !== "string" || value.length !== Math.ceil(length * 4 / 3) || !isCanonicalBase64Url(value)) fail();
  const bytes = receizBase64UrlDecode(value);
  if (bytes.length !== length) fail();
  return bytes;
}

export async function digestReceizAndroidWalletEnrollmentSlot(slot: ReceizAndroidWalletEnrollmentSlot): Promise<string> {
  const { applicationId, userId, recordSignerPublicKey, origin, challengeB64u, role, index, purpose } = slot;
  if (typeof applicationId !== "string" || !WALLET_APPLICATION.test(applicationId)
    || typeof userId !== "string" || !ACCOUNT_ID.test(userId)
    || typeof origin !== "string" || !origin.startsWith("https://")
    || purpose !== undefined && purpose !== "note" && purpose !== "note-reserve"
    || (role !== "receive" && role !== "spend") || !Number.isSafeInteger(index) || index < 0) fail();
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || parsed.origin !== origin) fail();
  canonicalBytes(recordSignerPublicKey, 32);
  canonicalBytes(challengeB64u, 32);
  return digestReceizAuthority("identity", CHALLENGE_SCHEMA, {
    applicationId, userId, recordSignerPublicKey, origin, challengeB64u, role, index, ...(purpose ? { purpose } : {}),
  });
}

function certificateBytes(digest: string): Uint8Array {
  return new TextEncoder().encode(`${RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_SCHEMA}:${digest}`);
}

async function validateBasis(basis: AndroidKeyCertificateBasis) {
  if (basis.schema !== RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_SCHEMA
    || (basis.securityLevel !== "strongbox" && basis.securityLevel !== "trusted-environment")
    || basis.hardwareUsageCount !== 1
    || typeof basis.attestationLeafSha256 !== "string" || !HEX_SHA256.test(basis.attestationLeafSha256)
    || !isCanonicalKaiPulse(basis.issuedAtKai) || !isCanonicalKeyId(basis.issuerKid)) fail();
  const keyBytes = canonicalBytes(basis.custodyPublicKeyRawB64u, 65);
  if (keyBytes[0] !== 4) fail();
  await crypto.subtle.importKey("raw", Uint8Array.from(keyBytes).buffer,
    { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
}

/** Certifies a slot after the issuer verifies the exact native Android attestation. */
export async function createReceizAndroidWalletKeyCertificate(input: CertificateInput): Promise<ReceizAndroidWalletKeyCertificate> {
  const { slot, sign, custodyPublicKeyRawB64u, attestationLeafSha256, securityLevel, issuedAtKai, issuerKid } = input;
  const basis: AndroidKeyCertificateBasis = Object.freeze({
    schema: RECEIZ_ANDROID_WALLET_KEY_CERTIFICATE_SCHEMA,
    slotDigest: await digestReceizAndroidWalletEnrollmentSlot(slot),
    custodyPublicKeyRawB64u,
    attestationLeafSha256,
    securityLevel,
    hardwareUsageCount: 1,
    issuedAtKai,
    issuerKid,
  });
  await validateBasis(basis);
  const certificateDigest = await digestReceizAuthority("identity", basis.schema, basis);
  const signature = new Uint8Array(await sign(certificateBytes(certificateDigest)));
  if (signature.length !== 64) fail();
  return Object.freeze({ ...basis, certificateDigest, signatureB64u: receizBase64UrlEncode(signature) });
}

/** Verifies carried hardware evidence against the selected Wallet slot at issuance Kai. */
export async function verifyReceizAndroidWalletKeyCertificate(
  candidate: unknown,
  expected: Readonly<{
    slot: ReceizAndroidWalletEnrollmentSlot;
    custodyPublicKeyRawB64u: string;
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  }>,
): Promise<ReceizAndroidWalletKeyCertificate> {
  try {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) fail();
    const snapshot = structuredClone(candidate) as ReceizAndroidWalletKeyCertificate;
    const { certificateDigest, signatureB64u, ...basis } = snapshot;
    const { slot, roots, custodyPublicKeyRawB64u } = expected;
    const slotDigest = await digestReceizAndroidWalletEnrollmentSlot(slot);
    if (Object.keys(basis).sort().join("\0") !== [
      "attestationLeafSha256", "custodyPublicKeyRawB64u", "hardwareUsageCount", "issuedAtKai",
      "issuerKid", "schema", "securityLevel", "slotDigest",
    ].join("\0") || basis.slotDigest !== slotDigest
      || basis.custodyPublicKeyRawB64u !== custodyPublicKeyRawB64u) fail();
    const signature = canonicalBytes(signatureB64u, 64);
    await validateBasis(basis);
    if (await digestReceizAuthority("identity", basis.schema, basis) !== certificateDigest) fail();
    if (!await verifyReceizPlatformAttestationIssuer({
      issuerKid: basis.issuerKid,
      issuedAtKai: basis.issuedAtKai,
      signature,
      signedBytes: certificateBytes(certificateDigest),
      roots,
      historicalRootAtIssuance: true,
    })) fail();
    return Object.freeze(snapshot);
  } catch {
    fail();
  }
}
