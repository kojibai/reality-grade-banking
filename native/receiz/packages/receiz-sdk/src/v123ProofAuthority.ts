import { sha256ReceizBytes } from "./artifacts.js";
import {
  readReceizIdentityArtifact,
  receizBase64UrlEncode,
  verifyReceizIdentityLoginProof,
  type ReceizIdentityLoginProof,
} from "./identity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";

const SHA256 = /^[0-9a-f]{64}$/;
const TOKEN = /^[A-Za-z0-9:._-]{1,100}$/;

export type ReceizProofAuthorityChallengeUnsignedV123 = Readonly<{
  schema: "receiz.identity.proof-authority-challenge.v123";
  audience: string;
  nonce: string;
  issuedAtKai: number;
  expiresAtKai: number;
  consent: Readonly<{ approved: boolean; statementDigest: string }>;
}>;

export type ReceizProofAuthorityChallengeV123 = ReceizProofAuthorityChallengeUnsignedV123 & Readonly<{
  proof: ReceizIdentityLoginProof;
}>;

export type ReceizProofAuthorityExchangeInputV123 = Readonly<{
  artifact: Blob | ArrayBuffer | Uint8Array | string;
  challenge: ReceizProofAuthorityChallengeV123;
  applicationId: string;
  scopes: readonly string[];
}>;

export type ReceizProofAuthorityV123 = Readonly<{
  schema: "receiz.identity.proof-authority.v123";
  applicationId: string;
  keyId: string;
  artifactDigest: string;
  grantedScopes: readonly string[];
  issuedAtKai: number;
  expiresAtKai: number;
  nonce: string;
  revocationHead: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshable: false;
  authority: Readonly<{ grantIsIdentityAuthority: false; strongerTruth: "receiz-identity-artifact" }>;
  authorityDigest: string;
  accessToken: string;
}>;

type RemoteRequest = <T>(path: string, options: Readonly<{ method: string; body: Record<string, unknown> }>) => Promise<T>;

function fail(code: string): never { throw new TypeError(code); }

async function exactBytes(input: Blob | ArrayBuffer | Uint8Array | string): Promise<Uint8Array> {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Blob !== "undefined" && input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  return fail("V123_PROOF_AUTHORITY_ARTIFACT_REQUIRED");
}

export function normalizeReceizProofAuthorityScopesV123(scopes: readonly string[]): readonly string[] {
  if (!Array.isArray(scopes) || scopes.length === 0 || scopes.length > 64) fail("V123_PROOF_AUTHORITY_SCOPES_INVALID");
  const normalized = [...new Set(scopes.map((scope) => typeof scope === "string" ? scope.trim() : ""))].sort();
  if (normalized.some((scope) => !TOKEN.test(scope))) fail("V123_PROOF_AUTHORITY_SCOPES_INVALID");
  return Object.freeze(normalized);
}

export function proofAuthorityChallengeBasisV123(input: Readonly<{
  challenge: ReceizProofAuthorityChallengeUnsignedV123;
  applicationId: string;
  artifactDigest: string;
  scopes: readonly string[];
}>) {
  const scopes = normalizeReceizProofAuthorityScopesV123(input.scopes);
  if (input.challenge.schema !== "receiz.identity.proof-authority-challenge.v123"
    || !input.applicationId.trim() || input.challenge.audience !== input.applicationId
    || !input.challenge.nonce.trim() || input.challenge.nonce.length > 256
    || !Number.isSafeInteger(input.challenge.issuedAtKai) || !Number.isSafeInteger(input.challenge.expiresAtKai)
    || input.challenge.expiresAtKai <= input.challenge.issuedAtKai
    || !SHA256.test(input.artifactDigest)
    || !SHA256.test(input.challenge.consent.statementDigest)) fail("V123_PROOF_AUTHORITY_CHALLENGE_INVALID");
  if (input.challenge.consent.approved !== true) fail("V123_PROOF_AUTHORITY_CONSENT_REQUIRED");
  return Object.freeze({
    schema: input.challenge.schema,
    applicationId: input.applicationId,
    audience: input.challenge.audience,
    artifactDigest: input.artifactDigest,
    scopes,
    nonce: input.challenge.nonce,
    issuedAtKai: input.challenge.issuedAtKai,
    expiresAtKai: input.challenge.expiresAtKai,
    consentStatementDigest: input.challenge.consent.statementDigest,
  });
}

export async function validateReceizProofAuthorityV123(value: unknown): Promise<ReceizProofAuthorityV123> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("V123_PROOF_AUTHORITY_RESPONSE_INVALID");
  const response = value as Record<string, unknown>;
  const scopes = normalizeReceizProofAuthorityScopesV123(response.grantedScopes as readonly string[]);
  if (response.schema !== "receiz.identity.proof-authority.v123" || typeof response.applicationId !== "string"
    || typeof response.keyId !== "string" || !SHA256.test(response.keyId)
    || typeof response.artifactDigest !== "string" || !SHA256.test(response.artifactDigest)
    || typeof response.revocationHead !== "string" || !SHA256.test(response.revocationHead)
    || typeof response.authorityDigest !== "string" || !SHA256.test(response.authorityDigest)
    || typeof response.accessToken !== "string" || !response.accessToken
    || response.tokenType !== "Bearer" || response.refreshable !== false
    || !Number.isSafeInteger(response.issuedAtKai) || !Number.isSafeInteger(response.expiresAtKai)
    || !Number.isSafeInteger(response.expiresIn) || typeof response.nonce !== "string"
    || !response.authority || typeof response.authority !== "object"
    || (response.authority as Record<string, unknown>).grantIsIdentityAuthority !== false
    || (response.authority as Record<string, unknown>).strongerTruth !== "receiz-identity-artifact") fail("V123_PROOF_AUTHORITY_RESPONSE_INVALID");
  const { authorityDigest, accessToken: _accessToken, ...basis } = response;
  if (await digestReceizCanonicalV122({ ...basis, grantedScopes: scopes }) !== authorityDigest) fail("V123_PROOF_AUTHORITY_RESPONSE_INVALID");
  return Object.freeze({ ...response, grantedScopes: scopes }) as unknown as ReceizProofAuthorityV123;
}

export function createReceizProofAuthorityExchangeV123(request: RemoteRequest) {
  return async (input: ReceizProofAuthorityExchangeInputV123): Promise<ReceizProofAuthorityV123> => {
    const bytes = await exactBytes(input.artifact);
    const keyFile = await readReceizIdentityArtifact(bytes);
    const artifactDigest = await sha256ReceizBytes(bytes);
    const scopes = normalizeReceizProofAuthorityScopesV123(input.scopes);
    const { proof, ...unsigned } = input.challenge;
    const basis = proofAuthorityChallengeBasisV123({ challenge: unsigned, applicationId: input.applicationId, artifactDigest, scopes });
    if (proof.keyId !== keyFile.keyId || proof.alg !== keyFile.alg
      || proof.challengeB64Url !== receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(basis)))
      || !await verifyReceizIdentityLoginProof({ keyFile, challengeB64Url: proof.challengeB64Url, signatureB64Url: proof.signatureB64Url })) {
      fail("V123_PROOF_AUTHORITY_PROOF_INVALID");
    }
    const wire = await request<unknown>("/api/sdk/v1/identity/proof-authority/exchange", {
      method: "POST",
      body: { artifact: { exactBytesB64u: receizBase64UrlEncode(bytes), digest: artifactDigest }, challenge: input.challenge as unknown as Record<string, unknown>, applicationId: input.applicationId, scopes } as unknown as Record<string, unknown>,
    });
    const authority = await validateReceizProofAuthorityV123(wire);
    if (authority.applicationId !== input.applicationId || authority.keyId !== keyFile.keyId
      || authority.artifactDigest !== artifactDigest || authority.nonce !== input.challenge.nonce
      || canonicalizeReceizV122(authority.grantedScopes) !== canonicalizeReceizV122(scopes)) fail("V123_PROOF_AUTHORITY_RESPONSE_MISMATCH");
    return authority;
  };
}
