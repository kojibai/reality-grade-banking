import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  verifyReceizAndroidWalletKeyCertificate,
  type ReceizAndroidWalletEnrollmentSlot,
  type ReceizAndroidWalletKeyCertificate,
} from "./androidWalletKeyCertificate.js";
import { receizBase64UrlDecode } from "./identity.js";
import { isCanonicalBase64Url, isCanonicalDecimal } from "./verifier/canonicalSyntax.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

const BINDING_SCHEMA = "receiz.account-financial.wallet-android.v1";
const ASSERTION_SCHEMA = "receiz.account-financial.wallet-android-assertion.v1";
export const MAX_ANDROID_WALLET_SPEND_KEYS = 4;

export type AndroidWalletScope = Omit<ReceizAndroidWalletEnrollmentSlot, "role" | "index">;
type AndroidWalletAssertionKind = "receive" | "spend" | "release";

export type ReceizAndroidWalletEnrollment = Readonly<{
  scope: AndroidWalletScope;
  receive?: ReceizAndroidWalletKeyCertificate;
  spend: readonly ReceizAndroidWalletKeyCertificate[];
}>;

export type ReceizAndroidWalletBinding = Readonly<{
  kind: "android-hardware";
  origin: string;
  certificateDigest: string;
  receive?: ReceizAndroidWalletKeyCertificate;
  spend: readonly ReceizAndroidWalletKeyCertificate[];
}>;

type BindingExpectation = Readonly<{
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  applicationId: string;
  userId: string;
  recordSignerPublicKey: string;
  fundedAtKaiUPulse: string;
}>;

export type ReceizAndroidWalletAssertion = Readonly<{ signatureB64u: string }>;

export type ReceizAndroidWalletAssertionChallenge = Readonly<{
  kind: AndroidWalletAssertionKind;
  slotDigest: string;
  keyCertificateDigest: string;
  custodyPublicKeyRawB64u: string;
  payload: string;
}>;

const verifiedBindings = new WeakSet<ReceizAndroidWalletBinding>();
const preparedChallenges = new WeakSet<ReceizAndroidWalletAssertionChallenge>();

function fail(): never {
  throw new TypeError("ACCOUNT_FINANCIAL_ANDROID_WALLET_CUSTODY_INVALID");
}

function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail();
  return value as Record<string, unknown>;
}

/** Admit only the exact Android keys authorized for the selected Wallet signer. */
export async function verifyReceizAndroidWalletBinding(
  candidate: unknown,
  expected: BindingExpectation,
): Promise<ReceizAndroidWalletBinding> {
  const enrollment = structuredClone(candidate);
  if (!enrollment || typeof enrollment !== "object") fail();
  const hasReceive = Object.hasOwn(enrollment, "receive");
  const row = exact(enrollment, ["scope", "spend", ...(hasReceive ? ["receive"] : [])]);
  const scope = exact(row.scope, ["applicationId", "userId", "recordSignerPublicKey", "origin", "challengeB64u"]) as AndroidWalletScope;
  const { roots, applicationId, userId, recordSignerPublicKey, fundedAtKaiUPulse } = expected;
  if (scope.applicationId !== applicationId || scope.userId !== userId || scope.recordSignerPublicKey !== recordSignerPublicKey
    || !isCanonicalDecimal(fundedAtKaiUPulse)
    || !Array.isArray(row.spend) || row.spend.length < 1 || row.spend.length > MAX_ANDROID_WALLET_SPEND_KEYS) fail();
  const fundedAt = BigInt(fundedAtKaiUPulse) / 1_000_000n;
  const keys = new Set<string>();
  async function verifyKey(value: unknown, role: "receive" | "spend", index: number) {
    const key = (value as Partial<ReceizAndroidWalletKeyCertificate> | null)?.custodyPublicKeyRawB64u;
    if (typeof key !== "string") fail();
    const certificate = await verifyReceizAndroidWalletKeyCertificate(value, {
      slot: { ...scope, role, index }, custodyPublicKeyRawB64u: key, roots,
    });
    if (BigInt(certificate.issuedAtKai) > fundedAt || keys.has(key)) fail();
    keys.add(key);
    return certificate;
  }
  const receive = hasReceive ? await verifyKey(row.receive, "receive", 0) : undefined;
  const spend = await Promise.all(row.spend.map((certificate, index) => verifyKey(certificate, "spend", index)));
  const certificateDigest = await digestReceizAuthority("identity", BINDING_SCHEMA, {
    receive: receive?.certificateDigest ?? null,
    spend: spend.map(key => key.certificateDigest),
  });
  const binding = Object.freeze({
    kind: "android-hardware" as const, certificateDigest, origin: scope.origin,
    ...(receive ? { receive } : {}), spend: Object.freeze(spend),
  });
  verifiedBindings.add(binding);
  return binding;
}

/** Reserve every one-use public key in the existing Wallet custody namespace. */
export async function receizAndroidWalletKeyClaims(binding: ReceizAndroidWalletBinding) {
  if (!verifiedBindings.has(binding)) fail();
  return Promise.all([...(binding.receive ? [binding.receive] : []), ...binding.spend].map(certificate =>
    digestReceizAuthority("identity", "receiz.account-financial.wallet-custody-key.v1", {
      key: certificate.custodyPublicKeyRawB64u,
    })));
}

/** A release and the next spend always consume the identical predecessor key. */
export async function prepareReceizAndroidWalletAssertion(input: Readonly<{
  binding: ReceizAndroidWalletBinding;
  kind: AndroidWalletAssertionKind;
  sequence: string;
  command: unknown;
  ownerConsent: unknown;
}>): Promise<ReceizAndroidWalletAssertionChallenge> {
  const { binding, kind, sequence, command, ownerConsent } = input;
  if (!verifiedBindings.has(binding) || !isCanonicalDecimal(sequence) || sequence.length > 20) fail();
  if (kind === "receive" ? sequence !== "0" : kind === "spend" ? sequence === "0" : kind !== "release") fail();
  const index = kind === "spend" ? BigInt(sequence) - 1n : BigInt(sequence);
  const key = kind === "receive" ? binding.receive : binding.spend[Number(index)];
  if (!key) throw new TypeError("ACCOUNT_FINANCIAL_ANDROID_WALLET_SLOTS_EXHAUSTED");
  const keyCertificateDigest = key.certificateDigest;
  const digest = await digestReceizAuthority("transition", ASSERTION_SCHEMA, {
    bindingDigest: binding.certificateDigest, keyCertificateDigest, kind, sequence, command, ownerConsent,
  });
  const challenge = Object.freeze({
    kind, slotDigest: key.slotDigest, keyCertificateDigest,
    custodyPublicKeyRawB64u: key.custodyPublicKeyRawB64u, payload: `${ASSERTION_SCHEMA}:${digest}`,
  });
  preparedChallenges.add(challenge);
  return challenge;
}

export async function verifyReceizAndroidWalletAssertion(
  challenge: ReceizAndroidWalletAssertionChallenge,
  input: unknown,
): Promise<ReceizAndroidWalletAssertion> {
  if (!preparedChallenges.has(challenge)) fail();
  const { signatureB64u } = exact(input, ["signatureB64u"]);
  if (typeof signatureB64u !== "string" || signatureB64u.length !== 86 || !isCanonicalBase64Url(signatureB64u)) fail();
  const key = await crypto.subtle.importKey(
    "raw", Uint8Array.from(receizBase64UrlDecode(challenge.custodyPublicKeyRawB64u)).buffer,
    { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"],
  );
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, key, Uint8Array.from(receizBase64UrlDecode(signatureB64u)).buffer,
    new TextEncoder().encode(challenge.payload),
  );
  if (!valid) fail();
  return Object.freeze({ signatureB64u });
}
