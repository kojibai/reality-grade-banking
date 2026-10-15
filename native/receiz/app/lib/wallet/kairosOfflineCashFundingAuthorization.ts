"use client";

import { digestReceizAuthority } from "../../../packages/receiz-sdk/src/authorityEncoding";
import {
  deriveReceizIdentityKeyIdFromPublicKeyRawB64u,
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  signReceizIdentityLoginProof,
  type ReceizIdentityKeyAlgorithm,
  type ReceizKeyFileV1,
} from "../../../packages/receiz-sdk/src/identity";

export const KAIROS_OFFLINE_CASH_FUNDING_AUTHORIZATION_SCHEMA =
  "receiz.offline-cash.funding-authorization.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const UINT_RE = /^(0|[1-9]\d*)$/;
const NONCE_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export type KairosOfflineCashFundingAuthorizationV1 = Readonly<{
  schema: typeof KAIROS_OFFLINE_CASH_FUNDING_AUTHORIZATION_SCHEMA;
  accountUserId: string;
  receizKeyId: string;
  identityAlgorithm: ReceizIdentityKeyAlgorithm;
  identityPublicKeyRawB64u: string;
  predecessorAccountPortableStateDigest: string;
  amountUsdCents: string;
  qualificationDigest: string;
  installationCommitment: string;
  receivingCustodyCommitmentDigest: string;
  issuedAtMs: number;
  nonce: string;
  authorizationDigest: string;
  challengeB64Url: string;
  signatureB64Url: string;
}>;

type AuthorizationBasis = Omit<KairosOfflineCashFundingAuthorizationV1,
  "authorizationDigest" | "challengeB64Url" | "signatureB64Url">;

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function validBasis(value: AuthorizationBasis): boolean {
  return value.schema === KAIROS_OFFLINE_CASH_FUNDING_AUTHORIZATION_SCHEMA
    && Boolean(value.accountUserId.trim())
    && SHA256_RE.test(value.receizKeyId)
    && (value.identityAlgorithm === "Ed25519" || value.identityAlgorithm === "P-256")
    && /^[A-Za-z0-9_-]+$/.test(value.identityPublicKeyRawB64u)
    && SHA256_RE.test(value.predecessorAccountPortableStateDigest)
    && /^[1-9]\d*$/.test(value.amountUsdCents)
    && SHA256_RE.test(value.qualificationDigest)
    && SHA256_RE.test(value.installationCommitment)
    && SHA256_RE.test(value.receivingCustodyCommitmentDigest)
    && Number.isSafeInteger(value.issuedAtMs)
    && value.issuedAtMs > 0
    && NONCE_RE.test(value.nonce);
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function challengeForDigest(digest: string): string {
  return receizBase64UrlEncode(new TextEncoder().encode(
    `${KAIROS_OFFLINE_CASH_FUNDING_AUTHORIZATION_SCHEMA}:${digest}`,
  ));
}

async function verifySignature(value: KairosOfflineCashFundingAuthorizationV1): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(value.identityPublicKeyRawB64u)),
      value.identityAlgorithm === "P-256"
        ? { name: "ECDSA", namedCurve: "P-256" }
        : { name: "Ed25519" },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      value.identityAlgorithm === "P-256"
        ? { name: "ECDSA", hash: "SHA-256" }
        : { name: "Ed25519" },
      publicKey,
      strictArrayBuffer(receizBase64UrlDecode(value.signatureB64Url)),
      strictArrayBuffer(receizBase64UrlDecode(value.challengeB64Url)),
    );
  } catch {
    return false;
  }
}

export async function createKairosOfflineCashFundingAuthorization(input: Readonly<{
  keyFile: ReceizKeyFileV1;
  accountUserId: string;
  predecessorAccountPortableStateDigest: string;
  amountUsdCents: string;
  qualificationDigest: string;
  installationCommitment: string;
  receivingCustodyCommitmentDigest: string;
  passphrase?: string;
  issuedAtMs?: number;
  nonce?: string;
}>): Promise<KairosOfflineCashFundingAuthorizationV1> {
  const basis = Object.freeze<AuthorizationBasis>({
    schema: KAIROS_OFFLINE_CASH_FUNDING_AUTHORIZATION_SCHEMA,
    accountUserId: input.accountUserId.trim(),
    receizKeyId: input.keyFile.keyId,
    identityAlgorithm: input.keyFile.alg,
    identityPublicKeyRawB64u: input.keyFile.crypto.publicKeyRawB64u,
    predecessorAccountPortableStateDigest: input.predecessorAccountPortableStateDigest.trim().toLowerCase(),
    amountUsdCents: input.amountUsdCents.trim(),
    qualificationDigest: input.qualificationDigest.trim().toLowerCase(),
    installationCommitment: input.installationCommitment.trim().toLowerCase(),
    receivingCustodyCommitmentDigest: input.receivingCustodyCommitmentDigest.trim().toLowerCase(),
    issuedAtMs: input.issuedAtMs ?? Date.now(),
    nonce: input.nonce ?? crypto.randomUUID(),
  });
  if (!validBasis(basis)
    || input.keyFile.portableState?.proof?.digestSha256Hex !== basis.predecessorAccountPortableStateDigest) {
    throw new Error("OFFLINE_CASH_FUNDING_AUTHORIZATION_INVALID");
  }
  const authorizationDigest = await digestReceizAuthority("identity", basis.schema, basis);
  const challengeB64Url = challengeForDigest(authorizationDigest);
  const signed = await signReceizIdentityLoginProof({ keyFile: input.keyFile, passphrase:input.passphrase, challengeB64Url });
  return Object.freeze({
    ...basis,
    authorizationDigest,
    challengeB64Url,
    signatureB64Url: signed.signatureB64Url,
  });
}

export async function verifyKairosOfflineCashFundingAuthorization(
  input: unknown,
  options: Readonly<{
    nowMs?: number;
    maxAgeMs?: number;
    expectedAccountUserId: string;
    expectedAmountUsdCents: string;
  }>,
): Promise<KairosOfflineCashFundingAuthorizationV1> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("OFFLINE_CASH_FUNDING_AUTHORIZATION_INVALID");
  }
  const record = input as Record<string, unknown>;
  if (!exactKeys(record, [
    "schema", "accountUserId", "receizKeyId", "identityAlgorithm", "identityPublicKeyRawB64u",
    "predecessorAccountPortableStateDigest", "amountUsdCents", "qualificationDigest",
    "installationCommitment", "receivingCustodyCommitmentDigest", "issuedAtMs", "nonce",
    "authorizationDigest", "challengeB64Url", "signatureB64Url",
  ])) throw new Error("OFFLINE_CASH_FUNDING_AUTHORIZATION_INVALID");
  const value = input as KairosOfflineCashFundingAuthorizationV1;
  const { authorizationDigest, challengeB64Url, signatureB64Url: _signature, ...basis } = value;
  if (!validBasis(basis)
    || !SHA256_RE.test(authorizationDigest)
    || !/^[A-Za-z0-9_-]+$/.test(challengeB64Url)
    || !/^[A-Za-z0-9_-]+$/.test(value.signatureB64Url)
    || value.accountUserId !== options.expectedAccountUserId.trim()
    || value.amountUsdCents !== options.expectedAmountUsdCents.trim()
    || !UINT_RE.test(value.amountUsdCents)
    || await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
      value.identityPublicKeyRawB64u,
      value.identityAlgorithm,
    ) !== value.receizKeyId
    || await digestReceizAuthority("identity", basis.schema, basis) !== authorizationDigest
    || challengeForDigest(authorizationDigest) !== challengeB64Url
    || !await verifySignature(value)) {
    throw new Error("OFFLINE_CASH_FUNDING_AUTHORIZATION_INVALID");
  }
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? 300_000;
  if (!Number.isSafeInteger(nowMs) || !Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0
    || value.issuedAtMs > nowMs + 30_000 || nowMs - value.issuedAtMs > maxAgeMs) {
    throw new Error("OFFLINE_CASH_FUNDING_AUTHORIZATION_EXPIRED");
  }
  return Object.freeze(structuredClone(value));
}
