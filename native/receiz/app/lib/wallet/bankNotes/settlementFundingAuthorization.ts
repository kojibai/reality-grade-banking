import {
  receizBase64UrlEncode,
  signReceizIdentityLoginProof,
  parseReceizIdentityArtifactText,
  verifyReceizIdentityPortableStateProof,
  verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizIdentityKeyAlgorithm,
  type ReceizKeyFileV1,
} from "../../../../packages/receiz-sdk/src/identity";
import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/authorityEncoding";

export const BANK_SETTLEMENT_NOTE_FUNDING_AUTHORIZATION_SCHEMA = "receiz.bank.settlement-note-funding-authorization.v1" as const;
export type BankSettlementNoteFundingAuthorization = Readonly<{
  schema: typeof BANK_SETTLEMENT_NOTE_FUNDING_AUTHORIZATION_SCHEMA;
  rail: "settlement";
  accountUserId: string;
  receizKeyId: string;
  identityAlgorithm: ReceizIdentityKeyAlgorithm;
  identityPublicKeyRawB64u: string;
  predecessorAccountPortableStateDigest: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  qualificationDigest: string;
  installationCommitment: string;
  receivingCustodyCommitmentDigest: string;
  issuedAtMs: number;
  nonce: string;
  authorizationDigest: string;
  challengeB64Url: string;
  signatureB64Url: string;
}>;
type Basis = Omit<BankSettlementNoteFundingAuthorization, "authorizationDigest" | "challengeB64Url" | "signatureB64Url">;
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const positive = (value: unknown): value is string => typeof value === "string" && /^[1-9][0-9]{0,39}$/.test(value);
const basisKeys = ["schema", "rail", "accountUserId", "receizKeyId", "identityAlgorithm", "identityPublicKeyRawB64u", "predecessorAccountPortableStateDigest", "amountPhiMicro", "amountUsdCents", "usdPerPhiMicrocents", "qualificationDigest", "installationCommitment", "receivingCustodyCommitmentDigest", "issuedAtMs", "nonce"];
function exact(value: object, keys: readonly string[]): boolean { return Object.keys(value).sort().join("|") === [...keys].sort().join("|"); }
function invalid(): never { throw Error("BANK_SETTLEMENT_NOTE_AUTHORIZATION_INVALID"); }
function validate(basis: Basis): void {
  if (!exact(basis, basisKeys) || basis.schema !== BANK_SETTLEMENT_NOTE_FUNDING_AUTHORIZATION_SCHEMA || basis.rail !== "settlement"
    || typeof basis.accountUserId !== "string" || !UUID.test(basis.accountUserId)
    || ![basis.receizKeyId, basis.predecessorAccountPortableStateDigest, basis.qualificationDigest, basis.installationCommitment, basis.receivingCustodyCommitmentDigest].every(value => typeof value === "string" && SHA.test(value))
    || ![basis.amountPhiMicro, basis.amountUsdCents, basis.usdPerPhiMicrocents].every(positive)
    || !["Ed25519", "P-256"].includes(basis.identityAlgorithm)
    || typeof basis.identityPublicKeyRawB64u !== "string" || !/^[A-Za-z0-9_-]+$/.test(basis.identityPublicKeyRawB64u)
    || !Number.isSafeInteger(basis.issuedAtMs) || basis.issuedAtMs <= 0
    || typeof basis.nonce !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(basis.nonce)) invalid();
  if ((BigInt(basis.amountPhiMicro) * BigInt(basis.usdPerPhiMicrocents) + 500000000000n) / 1000000000000n !== BigInt(basis.amountUsdCents)) invalid();
}
function challenge(digest: string): string {
  return receizBase64UrlEncode(new TextEncoder().encode(`${BANK_SETTLEMENT_NOTE_FUNDING_AUTHORIZATION_SCHEMA}:${digest}`));
}

/** Exact user consent only. Funding still requires the complete admitted source,
 * qualified receiving custody and an atomic exclusive Settlement allocation.
 * The existing Reserve authorization cannot be reinterpreted as this rail. */
export async function createBankSettlementNoteFundingAuthorization(input: Readonly<{
  keyFile: ReceizKeyFileV1; passphrase?: string; accountUserId: string;
  amountPhiMicro: string; amountUsdCents: string; usdPerPhiMicrocents: string;
  qualificationDigest: string; installationCommitment: string;
  receivingCustodyCommitmentDigest: string; issuedAtMs?: number; nonce?: string;
}>): Promise<BankSettlementNoteFundingAuthorization> {
  let keyFile: ReceizKeyFileV1;
  try {
    // The SDK materializes the committed segments. A caller's edited snapshot
    // beside those segments is a representation, never the account source.
    keyFile = parseReceizIdentityArtifactText(JSON.stringify(input.keyFile));
    if (await verifyReceizIdentityPortableStateProof(keyFile) !== "verified") throw Error();
  } catch { throw Error("BANK_SETTLEMENT_NOTE_ACCOUNT_SOURCE_REQUIRED"); }
  const snapshot = keyFile.portableState?.snapshot as Record<string, unknown> | undefined;
  const account = snapshot?.account as Record<string, unknown> | undefined;
  const summary = (snapshot?.wallet as { routeSummary?: Record<string, unknown> } | undefined)?.routeSummary;
  if (snapshot?.schema !== "receiz.account.state.v3" || account?.userId !== input.accountUserId || summary?.userId !== input.accountUserId) invalid();
  const basis: Basis = {
    schema: BANK_SETTLEMENT_NOTE_FUNDING_AUTHORIZATION_SCHEMA, rail: "settlement", accountUserId: input.accountUserId,
    receizKeyId: keyFile.keyId, identityAlgorithm: keyFile.alg, identityPublicKeyRawB64u: keyFile.crypto.publicKeyRawB64u,
    predecessorAccountPortableStateDigest: keyFile.portableState!.proof!.digestSha256Hex,
    amountPhiMicro: input.amountPhiMicro, amountUsdCents: input.amountUsdCents, usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    qualificationDigest: input.qualificationDigest, installationCommitment: input.installationCommitment,
    receivingCustodyCommitmentDigest: input.receivingCustodyCommitmentDigest, issuedAtMs: input.issuedAtMs ?? Date.now(), nonce: input.nonce ?? crypto.randomUUID(),
  };
  validate(basis);
  const authorizationDigest = await digestReceizAuthority("identity", basis.schema, basis), challengeB64Url = challenge(authorizationDigest);
  const proof = await signReceizIdentityLoginProof({ keyFile, passphrase: input.passphrase, challengeB64Url });
  return Object.freeze({ ...basis, authorizationDigest, challengeB64Url, signatureB64Url: proof.signatureB64Url });
}

export async function verifyBankSettlementNoteFundingAuthorization(input: unknown,
  options: Readonly<{ expectedAccountUserId: string; nowMs?: number; maxAgeMs?: number }>,
): Promise<BankSettlementNoteFundingAuthorization> {
  if (!input || typeof input !== "object" || Array.isArray(input) || !exact(input, [...basisKeys, "authorizationDigest", "challengeB64Url", "signatureB64Url"])) invalid();
  // Snapshot before asynchronous verification; later caller mutation cannot
  // substitute the admitted amount, rail or source coordinate.
  const value = structuredClone(input) as BankSettlementNoteFundingAuthorization;
  const { authorizationDigest, challengeB64Url, signatureB64Url, ...basis } = value;
  validate(basis);
  if (value.accountUserId !== options.expectedAccountUserId || typeof authorizationDigest !== "string" || !SHA.test(authorizationDigest)
    || await digestReceizAuthority("identity", basis.schema, basis) !== authorizationDigest || challengeB64Url !== challenge(authorizationDigest)
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: value.receizKeyId, alg: value.identityAlgorithm, publicKeyRawB64u: value.identityPublicKeyRawB64u, challengeB64Url, signatureB64Url })) invalid();
  const nowMs = options.nowMs ?? Date.now(), maxAgeMs = options.maxAgeMs ?? 300000;
  if (!Number.isSafeInteger(nowMs) || !Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0 || value.issuedAtMs > nowMs + 30000 || nowMs - value.issuedAtMs > maxAgeMs) throw Error("BANK_SETTLEMENT_NOTE_AUTHORIZATION_EXPIRED");
  return Object.freeze(value);
}
