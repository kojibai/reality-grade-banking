import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  normalizeReceizProofAuthorityScopesV123,
  proofAuthorityChallengeBasisV123,
  type ReceizProofAuthorityChallengeUnsignedV123,
} from "./v123ProofAuthority.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { applicationId as validateApplicationId, closedRecord, digest, freeze } from "./v124Contracts.js";
import { receizKaiNow } from "./v124Kai.js";

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const REQUIRED_KEYS = Object.freeze([
  "applicationId",
  "artifactDigest",
  "scopes",
  "consentStatementDigest",
  "ttlPulses",
] as const);
const OPTIONAL_NONCE_KEYS = Object.freeze([...REQUIRED_KEYS, "nonce"] as const);

export type CreateReceizProofAuthorityChallengeInput = Readonly<{
  applicationId: string;
  artifactDigest: string;
  scopes: readonly string[];
  consentStatementDigest: string;
  ttlPulses: number;
  nonce?: string;
}>;

export type CreatedReceizProofAuthorityChallenge = Readonly<{
  challenge: ReceizProofAuthorityChallengeUnsignedV123;
  challengeB64Url: string;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function challengeInput(value: unknown): Readonly<Record<string, unknown>> {
  try {
    return closedRecord(value, REQUIRED_KEYS, "V124_PROOF_AUTHORITY_INPUT_INVALID");
  } catch {
    return closedRecord(value, OPTIONAL_NONCE_KEYS, "V124_PROOF_AUTHORITY_INPUT_INVALID");
  }
}

function nonceBytes(value: unknown): string {
  if (typeof value !== "string" || !BASE64URL.test(value)) {
    return fail("V124_PROOF_AUTHORITY_NONCE_INVALID");
  }
  let bytes: Uint8Array;
  try {
    bytes = receizBase64UrlDecode(value);
  } catch {
    return fail("V124_PROOF_AUTHORITY_NONCE_INVALID");
  }
  if (bytes.byteLength !== 32 || receizBase64UrlEncode(bytes) !== value) {
    return fail("V124_PROOF_AUTHORITY_NONCE_INVALID");
  }
  return value;
}

function randomNonce(): string {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    return fail("V124_PROOF_AUTHORITY_CRYPTO_UNAVAILABLE");
  }
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return receizBase64UrlEncode(bytes);
}

export function createReceizProofAuthorityChallenge(
  input: CreateReceizProofAuthorityChallengeInput,
): CreatedReceizProofAuthorityChallenge {
  const record = challengeInput(input);
  const applicationId = validateApplicationId(record.applicationId, "V124_PROOF_AUTHORITY_APPLICATION_INVALID");
  const artifactDigest = digest(record.artifactDigest, "V124_PROOF_AUTHORITY_ARTIFACT_DIGEST_INVALID");
  const consentStatementDigest = digest(record.consentStatementDigest, "V124_PROOF_AUTHORITY_CONSENT_DIGEST_INVALID");
  const scopes = normalizeReceizProofAuthorityScopesV123(record.scopes as readonly string[]);
  const ttlPulses = record.ttlPulses;
  if (!Number.isSafeInteger(ttlPulses) || (ttlPulses as number) < 1 || (ttlPulses as number) > 600) {
    return fail("V124_PROOF_AUTHORITY_TTL_INVALID");
  }
  const suppliedNonce = Object.prototype.hasOwnProperty.call(record, "nonce")
    ? nonceBytes(record.nonce)
    : null;

  const issuedAtKai = receizKaiNow().pulse;
  const expiresAtKai = issuedAtKai + (ttlPulses as number);
  if (!Number.isSafeInteger(expiresAtKai)) {
    return fail("V124_PROOF_AUTHORITY_EXPIRY_INVALID");
  }
  const nonce = suppliedNonce ?? randomNonce();
  const challenge = freeze({
    schema: "receiz.identity.proof-authority-challenge.v123" as const,
    audience: applicationId,
    nonce,
    issuedAtKai,
    expiresAtKai,
    consent: {
      approved: true,
      statementDigest: consentStatementDigest,
    },
  });
  const basis = proofAuthorityChallengeBasisV123({ challenge, applicationId, artifactDigest, scopes });
  const challengeB64Url = receizBase64UrlEncode(
    new TextEncoder().encode(canonicalizeReceizV122(basis)),
  );

  return freeze({ challenge, challengeB64Url });
}
