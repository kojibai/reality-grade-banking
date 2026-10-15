import { sha256ReceizBytes } from "./artifacts.js";
import {
  readReceizIdentityArtifact,
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  verifyReceizIdentityLoginProof,
  verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizIdentityPublicKeyProjection,
} from "./identity.js";
import {
  normalizeReceizProofAuthorityScopesV123,
  proofAuthorityChallengeBasisV123,
  type ReceizProofAuthorityChallengeV123,
} from "./v123ProofAuthority.js";
import { normalizeReceizNamespaceNamesV123 } from "./v123Namespaces.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizKaiNow } from "./v124Kai.js";
import { applicationId, closedRecord, digest, domainId, freeze, text } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  admitReceizAuthenticatedRuntimeWireV124,
  createReceizAuthenticatedRuntimeRequestV124,
  getReceizAuthenticatedRuntimeAdmissionV124,
} from "./v124AuthenticatedRuntime.js";

type RemoteRequest = <T>(path: string, options?: Readonly<{ method?: string; body?: Record<string, unknown> }>) => Promise<T>;
type SessionAuthority = Readonly<{ sessionIsProofAuthority: false; strongerTruth: "receiz-identity-artifact" }>;

export type ReceizOpenAuthoritySessionInputV124 = Readonly<{
  applicationId: string;
  actorSubjectId: string;
  subjectSourceArtifact: ReceizPortableSealedArtifactV124;
  proofArtifact: Blob | ArrayBuffer | Uint8Array | string;
  signedChallenge: ReceizProofAuthorityChallengeV123;
  requestedRails: readonly string[];
  requiredNamespaces: readonly string[];
  audience: string;
}>;

export type ReceizRefreshAuthoritySessionInputV124 = Readonly<{
  applicationId: string;
  authoritySessionHandle: string;
  proofArtifact: Blob | ArrayBuffer | Uint8Array | string;
  signedChallenge: ReceizProofAuthorityChallengeV123;
  requestedRails: readonly string[];
  requiredNamespaces: readonly string[];
  audience: string;
  /**
   * Durable request coordinates used only when this SDK instance does not
   * already cache the authenticated session. They are revalidated by the
   * signed refresh response and are never admitted as local authority.
   */
  persistedSession?: ReceizAuthoritySessionV124;
}>;

export type ReceizCloseAuthoritySessionInputV124 = Readonly<{
  applicationId: string;
  authoritySessionHandle: string;
  /**
   * Durable request coordinates for a newly created SDK instance. The raw
   * projection cannot mint custody; only the signed close response can.
   */
  persistedSession?: ReceizAuthoritySessionV124;
}>;

export type ReceizAuthoritySessionNamespaceV124 = Readonly<{ name: string; head: string; digest: string }>;
export type ReceizAuthoritySessionV124 = Readonly<{
  schema: "receiz.authority-session.v124";
  status: "active";
  authoritySessionHandle: string;
  applicationId: string;
  audience: string;
  actorSubjectId: string;
  subjectSourceArtifactSha256: string;
  identityArtifactSha256: string;
  identityKeyId: string;
  grantedScopes: readonly string[];
  grantedRails: readonly string[];
  namespaces: readonly ReceizAuthoritySessionNamespaceV124[];
  revocationHead: string;
  issuedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  sessionBindingDigest: string;
  runtimeReceiptDigest: string;
  authority: SessionAuthority;
}>;

export type ReceizAuthoritySessionClosedV124 = Readonly<{
  schema: "receiz.authority-session-closed.v124";
  status: "closed";
  authoritySessionHandle: string;
  applicationId: string;
  audience: string;
  revocationHead: string;
  closedAtKaiUPulse: number;
  sessionBindingDigest: string;
  runtimeReceiptDigest: string;
  authority: SessionAuthority;
}>;

export type ReceizRuntimeOperationV124 = "open-authority-session" | "refresh-authority-session" | "close-authority-session" | "qualify";
export type ReceizRuntimeZeroWriteReasonV124 = "INVALID_PROOF" | "CONSENT_REQUIRED" | "APPLICATION_MISMATCH" | "AUDIENCE_MISMATCH" | "SCOPE_MISMATCH" | "NAMESPACE_MISMATCH" | "STALE_HEAD" | "EXPIRED" | "REVOKED" | "CHALLENGE_REPLAYED" | "UNAUTHORIZED" | "DEPENDENCY_UNAVAILABLE";
export type ReceizRuntimeZeroWriteFailureV124 = Readonly<{
  schema: "receiz.runtime-zero-write-failure.v124";
  status: "zero-write";
  operation: ReceizRuntimeOperationV124;
  applicationId: string;
  authoritySessionHandle: string | null;
  reasonCode: ReceizRuntimeZeroWriteReasonV124;
  writes: 0;
  failureDigest: string;
  runtimeReceiptDigest: string;
  authority: Readonly<{ failureIsProofAuthority: false; strongerTruth: "receiz-identity-artifact" }>;
}>;

export class ReceizRuntimeZeroWriteErrorV124 extends Error {
  constructor(readonly failure: ReceizRuntimeZeroWriteFailureV124) {
    super(failure.reasonCode);
    this.name = "ReceizRuntimeZeroWriteErrorV124";
  }
}

type ReceizKnownQualificationOperationV124 =
  | "subject-admission"
  | "namespace-resolution"
  | "durable-execution"
  | "verified-replay"
  | "private-additions"
  | "multi-domain-transaction"
  | "public-recipient-resolution"
  | "source-publication";
export type ReceizQualificationOperationV124 = string;
export type ReceizOperationalQualificationInputV124 = Readonly<{ applicationId: string; operations: readonly string[] }>;
export type ReceizQualificationReasonV124 =
  | "MISSING_SCOPE"
  | "PRINCIPAL_AUDIENCE_MISMATCH"
  | "STALE_PUBLICATION_HEAD"
  | "REGISTRY_REDUCER_MISMATCH"
  | "DEPENDENCY_UNHEALTHY"
  | "DURABLE_RUNTIME_UNAVAILABLE"
  | "TRANSPORT_SIGNATURE_UNAVAILABLE"
  | "DISTRIBUTED_LIMITER_UNAVAILABLE"
  | "RECIPIENT_PUBLICATION_UNAVAILABLE"
  | "RECIPIENT_PROOF_STORAGE_UNAVAILABLE"
  | "RECIPIENT_LOCATOR_ISSUE_UNAVAILABLE"
  | "RECIPIENT_LOCATOR_CONSUME_UNAVAILABLE";
export type ReceizQualificationRetryV124 =
  | Readonly<{ strategy: "none"; retryAfterKaiUPulse: null }>
  | Readonly<{ strategy: "retry-after"; retryAfterKaiUPulse: number }>
  | Readonly<{ strategy: "operator-action"; retryAfterKaiUPulse: null }>;
export type ReceizQualificationEvidenceV124 = Readonly<{
  runtime: "ready" | "unavailable";
  transportSignature?: "available" | "unavailable";
  registry: "compatible" | "mismatch";
  reducer: "compatible" | "mismatch";
  publicHeads: "current" | "stale";
  distributedLimiter: "available" | "unavailable" | "not-required";
  recipientPublication?: "available" | "unavailable";
  recipientProofStorage?: "available" | "unavailable";
  recipientLocatorIssue?: "available" | "unavailable";
  recipientLocatorConsume?: "available" | "unavailable";
}>;
export type ReceizOperationalCapabilityV124 = Readonly<{
  operation: ReceizQualificationOperationV124;
  status: "available" | "degraded" | "unavailable";
  actualGrantedScopes: readonly string[];
  serviceVersion: string;
  registryVersion: string;
  reducerVersion: string;
  publicDependencyHeads: Readonly<Record<string, string>>;
  dependencyHealth: "healthy" | "degraded" | "unhealthy";
  reasonCode: ReceizQualificationReasonV124 | null;
  retry: ReceizQualificationRetryV124;
  evidence: ReceizQualificationEvidenceV124;
}>;
export type ReceizOperationalCapabilityReportV124 = Readonly<{
  schema: "receiz.operational-capability-report.v124";
  applicationId: string;
  requestedOperations: readonly ReceizQualificationOperationV124[];
  qualifiedAtKaiUPulse: number;
  results: readonly ReceizOperationalCapabilityV124[];
  reportDigest: string;
  runtimeReceiptDigest: string;
  authority: Readonly<{ reportIsProofAuthority: false; reportIsOperationalAuthority: false; strongerTruth: "receiz-identity-artifact" }>;
}>;

type ChallengeProjection = Readonly<{
  challenge: ReceizProofAuthorityChallengeV123;
  scopes: readonly string[];
  artifactDigest: string;
  nonce: string;
  verificationKey: ReceizAuthoritySessionVerificationKeyV124;
}>;
type ReceizAuthoritySessionVerificationKeyV124 = ReceizIdentityPublicKeyProjection;
type HeldSession = Readonly<{
  session: ReceizAuthoritySessionV124;
  artifactDigest: string;
  verificationKey: ReceizAuthoritySessionVerificationKeyV124;
}>;
type RetainedOpenChallengeAttempt = Readonly<{
  operation: "open";
  inputBindingDigest: string;
  expiresAtKai: number;
  body: Readonly<Record<string, unknown>>;
  acceptedIssue: Readonly<{
    authoritySessionHandle: string;
    sessionBindingDigest: string;
  }> | null;
}>;
type RetainedRefreshChallengeAttempt = Readonly<{
  operation: "refresh";
  inputBindingDigest: string;
  expiresAtKai: number;
  body: Readonly<Record<string, unknown>>;
  prior: HeldSession;
}>;
type RetainedChallengeAttempt = RetainedOpenChallengeAttempt | RetainedRefreshChallengeAttempt;
type ChallengeAttemptCoordinates = Readonly<{
  coordinateDigest: string;
  inputBindingDigest: string;
}>;

const TOKEN = /^[A-Za-z0-9:._-]{1,100}$/;
const RAIL = /^[a-z0-9:._-]{1,100}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const SESSION_OPERATIONS = ["open-authority-session", "refresh-authority-session", "close-authority-session", "qualify"] as const;
const ZERO_WRITE_REASONS = ["INVALID_PROOF", "CONSENT_REQUIRED", "APPLICATION_MISMATCH", "AUDIENCE_MISMATCH", "SCOPE_MISMATCH", "NAMESPACE_MISMATCH", "STALE_HEAD", "EXPIRED", "REVOKED", "CHALLENGE_REPLAYED", "UNAUTHORIZED", "DEPENDENCY_UNAVAILABLE"] as const;
const QUALIFICATION_REASONS = [
  "MISSING_SCOPE",
  "PRINCIPAL_AUDIENCE_MISMATCH",
  "STALE_PUBLICATION_HEAD",
  "REGISTRY_REDUCER_MISMATCH",
  "DEPENDENCY_UNHEALTHY",
  "DURABLE_RUNTIME_UNAVAILABLE",
  "TRANSPORT_SIGNATURE_UNAVAILABLE",
  "DISTRIBUTED_LIMITER_UNAVAILABLE",
  "RECIPIENT_PUBLICATION_UNAVAILABLE",
  "RECIPIENT_PROOF_STORAGE_UNAVAILABLE",
  "RECIPIENT_LOCATOR_ISSUE_UNAVAILABLE",
  "RECIPIENT_LOCATOR_CONSUME_UNAVAILABLE",
] as const;
const QUALIFICATION_REQUIREMENTS = {
  "subject-admission": { requiredScopes: ["receiz:subjects.write"], requiredHeads: ["reducer", "registry", "runtime", "subject"] },
  "namespace-resolution": { requiredScopes: ["receiz:subjects.read"], requiredHeads: ["namespace", "reducer", "registry", "runtime"] },
  "durable-execution": { requiredScopes: ["receiz:domains.write"], requiredHeads: ["execution", "reducer", "registry", "runtime"] },
  "verified-replay": { requiredScopes: ["receiz:domains.read"], requiredHeads: ["reducer", "registry", "replay", "runtime"] },
  "private-additions": { requiredScopes: ["receiz:world.private"], requiredHeads: ["private-additions", "reducer", "registry", "runtime"] },
  "multi-domain-transaction": { requiredScopes: ["receiz:domains.write"], requiredHeads: ["reducer", "registry", "runtime", "transaction"] },
  "public-recipient-resolution": { requiredScopes: ["receiz:subjects.read"], requiredHeads: ["distributed-limiter", "recipient-publication", "reducer", "registry", "runtime"] },
  "source-publication": { requiredScopes: ["receiz:domains.write", "receiz:subjects.write"], requiredHeads: ["reducer", "registry", "runtime", "source-publication"] },
} as const satisfies Readonly<Record<ReceizKnownQualificationOperationV124, Readonly<{ requiredScopes: readonly string[]; requiredHeads: readonly string[] }>>>;
const QUALIFICATION_OPERATIONS = Object.freeze(Object.keys(QUALIFICATION_REQUIREMENTS).sort((left, right) => left.localeCompare(right))) as readonly ReceizKnownQualificationOperationV124[];
const QUALIFICATION_OPERATION_SET = new Set<string>(QUALIFICATION_OPERATIONS);
const SERVICE_VERSION = /^124\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const DEPENDENCY_VERSION = /^(?:registry|reducer):[A-Za-z0-9][A-Za-z0-9._-]{0,90}$/;
function fail(code: string): never { throw new TypeError(code); }
function upulse(value: unknown, code: string): number { if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code); return value as number; }
function token(value: unknown, code: string): string { if (typeof value !== "string" || !TOKEN.test(value)) fail(code); return value; }
function handle(value: unknown, code: string): string { const result = text(value, code); if (result.length > 512) fail(code); return result; }
function exactListEqual(left: readonly string[], right: readonly string[]): boolean { return left.length === right.length && left.every((value, index) => value === right[index]); }

function exactTokenList(value: unknown, code: string, allowEmpty: boolean): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 64) fail(code);
  const items = value.map((item) => token(item, code));
  if (items.some((item, index) => index > 0 && items[index - 1]!.localeCompare(item) >= 0)) fail(`${code}_NONCANONICAL`);
  return freeze(items);
}
function normalizeRails(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || value.length > 64) fail(code);
  const normalized = [...new Set(value.map((item) => typeof item === "string" ? item.trim().toLowerCase() : ""))].sort((left, right) => left.localeCompare(right));
  if (normalized.some((item) => !RAIL.test(item))) fail(code);
  return freeze(normalized);
}
function normalizeNamespaces(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value)) fail(code);
  if (value.length === 0) return freeze([]);
  try { return normalizeReceizNamespaceNamesV123(value as readonly string[]); } catch { return fail(code); }
}
function normalizeOperations(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) fail("V124_QUALIFICATION_OPERATIONS_INVALID");
  const result = [...new Set(value.map((item) => typeof item === "string" ? item.trim().toLowerCase() : ""))].sort((left, right) => left.localeCompare(right));
  if (result.some((item) => !TOKEN.test(item))) fail("V124_QUALIFICATION_OPERATIONS_INVALID");
  return freeze(result);
}

function isKnownQualificationOperation(value: string): value is ReceizKnownQualificationOperationV124 {
  return QUALIFICATION_OPERATION_SET.has(value);
}
function exactHeads(value: unknown, code: string): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const rawKeys = Reflect.ownKeys(descriptors);
  if (rawKeys.some((key) => typeof key !== "string")) fail(code);
  const keys = rawKeys as string[];
  if (keys.some((key, index) => index > 0 && keys[index - 1]!.localeCompare(key) >= 0)) fail(`${code}_NONCANONICAL`);
  const output: Record<string, string> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    Object.defineProperty(output, token(key, code), { enumerable: true, configurable: false, writable: false, value: digest(descriptor.value, code) });
  }
  return freeze(output);
}
function base64url(value: unknown, code: string): string {
  if (typeof value !== "string" || !BASE64URL.test(value)) fail(code);
  try { if (receizBase64UrlEncode(receizBase64UrlDecode(value)) !== value) fail(code); } catch { fail(code); }
  return value;
}
async function artifactBytes(input: Blob | ArrayBuffer | Uint8Array | string): Promise<Uint8Array> {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return new Uint8Array(input);
  if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
  if (typeof Blob !== "undefined" && input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  return fail("V124_AUTHORITY_SESSION_ARTIFACT_INVALID");
}

async function subjectSourceArtifact(value: unknown): Promise<ReceizPortableSealedArtifactV124> {
  const code = "V124_AUTHORITY_SESSION_SUBJECT_SOURCE_INVALID";
  const record = closedRecord(
    value,
    ["schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256"],
    code,
  );
  if (record.schema !== "receiz.sealed-artifact-bytes.v124") fail(code);
  const exactBytesB64u = base64url(record.exactBytesB64u, code);
  const bytes = receizBase64UrlDecode(exactBytesB64u);
  if (bytes.byteLength === 0) fail(code);
  const artifactSha256 = digest(record.artifactSha256, code);
  if (await sha256ReceizBytes(bytes) !== artifactSha256) fail(code);
  return freeze({
    schema: "receiz.sealed-artifact-bytes.v124" as const,
    exactBytesB64u,
    filename: text(record.filename, code),
    mimeType: text(record.mimeType, code),
    artifactSha256,
    payloadSha256: digest(record.payloadSha256, code),
  });
}

function sessionAuthority(value: unknown): SessionAuthority {
  const record = closedRecord(value, ["sessionIsProofAuthority", "strongerTruth"], "V124_AUTHORITY_SESSION_AUTHORITY_INVALID");
  if (record.sessionIsProofAuthority !== false || record.strongerTruth !== "receiz-identity-artifact") fail("V124_AUTHORITY_SESSION_AUTHORITY_INVALID");
  return freeze({ sessionIsProofAuthority: false as const, strongerTruth: "receiz-identity-artifact" as const });
}

async function validateSignedChallenge(
  value: unknown,
  expectedApplicationId: string,
  decisionKaiPulse: number,
  artifact?: Readonly<{ bytes: Uint8Array }> | Readonly<{ verificationKey: ReceizAuthoritySessionVerificationKeyV124 }>,
): Promise<ChallengeProjection> {
  const record = closedRecord(value, ["schema", "audience", "nonce", "issuedAtKai", "expiresAtKai", "consent", "proof"], "V124_AUTHORITY_SESSION_CHALLENGE_INVALID");
  if (record.schema !== "receiz.identity.proof-authority-challenge.v123" || record.audience !== expectedApplicationId) fail("V124_AUTHORITY_SESSION_AUDIENCE_INVALID");
  const issuedAtKai = record.issuedAtKai, expiresAtKai = record.expiresAtKai;
  if (!Number.isSafeInteger(issuedAtKai) || !Number.isSafeInteger(expiresAtKai)
    || (issuedAtKai as number) < 0 || (expiresAtKai as number) < 0
    || (expiresAtKai as number) <= (issuedAtKai as number)
    || (expiresAtKai as number) - (issuedAtKai as number) > 600) fail("V124_AUTHORITY_SESSION_CHALLENGE_INVALID");
  if ((issuedAtKai as number) > decisionKaiPulse) fail("V124_AUTHORITY_SESSION_CHALLENGE_NOT_YET_VALID");
  if ((expiresAtKai as number) <= decisionKaiPulse) fail("V124_AUTHORITY_SESSION_CHALLENGE_EXPIRED");
  const consent = closedRecord(record.consent, ["approved", "statementDigest"], "V124_AUTHORITY_SESSION_CHALLENGE_INVALID");
  if (consent.approved !== true) fail("V124_AUTHORITY_SESSION_CONSENT_REQUIRED");
  const statementDigest = digest(consent.statementDigest, "V124_AUTHORITY_SESSION_CHALLENGE_INVALID");
  const proof = closedRecord(record.proof, ["schema", "keyId", "alg", "challengeB64Url", "signatureB64Url"], "V124_AUTHORITY_SESSION_PROOF_INVALID");
  if (proof.schema !== "receiz.identity.login_proof.v1") fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
  const keyId = digest(proof.keyId, "V124_AUTHORITY_SESSION_PROOF_INVALID"), alg = token(proof.alg, "V124_AUTHORITY_SESSION_PROOF_INVALID"), challengeB64Url = base64url(proof.challengeB64Url, "V124_AUTHORITY_SESSION_PROOF_INVALID"), signatureB64Url = base64url(proof.signatureB64Url, "V124_AUTHORITY_SESSION_PROOF_INVALID");
  let parsed: unknown;
  let challengeBytes: Uint8Array;
  try {
    challengeBytes = receizBase64UrlDecode(challengeB64Url);
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(challengeBytes));
  } catch { return fail("V124_AUTHORITY_SESSION_PROOF_INVALID"); }
  const basisRecord = closedRecord(parsed, ["schema", "applicationId", "audience", "artifactDigest", "scopes", "nonce", "issuedAtKai", "expiresAtKai", "consentStatementDigest"], "V124_AUTHORITY_SESSION_PROOF_INVALID");
  const artifactDigest = digest(basisRecord.artifactDigest, "V124_AUTHORITY_SESSION_PROOF_INVALID");
  let scopes: readonly string[];
  try { scopes = normalizeReceizProofAuthorityScopesV123(basisRecord.scopes as readonly string[]); } catch { return fail("V124_AUTHORITY_SESSION_PROOF_INVALID"); }
  const challenge = freeze({
    schema: "receiz.identity.proof-authority-challenge.v123" as const,
    audience: applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID"),
    nonce: text(record.nonce, "V124_AUTHORITY_SESSION_CHALLENGE_INVALID"),
    issuedAtKai: issuedAtKai as number,
    expiresAtKai: expiresAtKai as number,
    consent: freeze({ approved: true as const, statementDigest }),
    proof: freeze({ schema: "receiz.identity.login_proof.v1" as const, keyId, alg: alg as ReceizProofAuthorityChallengeV123["proof"]["alg"], challengeB64Url, signatureB64Url }),
  });
  let rebuilt: unknown;
  try { rebuilt = proofAuthorityChallengeBasisV123({ challenge: challenge as Omit<ReceizProofAuthorityChallengeV123, "proof">, applicationId: expectedApplicationId, artifactDigest, scopes }); } catch { return fail("V124_AUTHORITY_SESSION_PROOF_INVALID"); }
  if (canonicalizeReceizV122(parsed) !== canonicalizeReceizV122(rebuilt)
    || receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(rebuilt))) !== challengeB64Url
    || basisRecord.applicationId !== expectedApplicationId || basisRecord.audience !== expectedApplicationId
    || basisRecord.nonce !== challenge.nonce || basisRecord.issuedAtKai !== challenge.issuedAtKai
    || basisRecord.expiresAtKai !== challenge.expiresAtKai || basisRecord.consentStatementDigest !== statementDigest) fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
  let verificationKey: ReceizAuthoritySessionVerificationKeyV124;
  if (artifact && "bytes" in artifact) {
    if (await sha256ReceizBytes(artifact.bytes) !== artifactDigest) fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
    let keyFile: Awaited<ReturnType<typeof readReceizIdentityArtifact>>;
    try { keyFile = await readReceizIdentityArtifact(artifact.bytes); } catch { return fail("V124_AUTHORITY_SESSION_PROOF_INVALID"); }
    if (keyFile.keyId !== keyId || keyFile.alg !== alg
      || !await verifyReceizIdentityLoginProof({ keyFile, challengeB64Url, signatureB64Url })) fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
    verificationKey = freeze({ keyId: keyFile.keyId, alg: keyFile.alg, publicKeyRawB64u: keyFile.crypto.publicKeyRawB64u });
  } else if (artifact && "verificationKey" in artifact) {
    verificationKey = artifact.verificationKey;
    if (verificationKey.keyId !== keyId || verificationKey.alg !== alg
      || !await verifyReceizIdentityPublicKeyProjectionSignature({
        ...verificationKey,
        challengeB64Url,
        signatureB64Url,
      })) fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
  } else {
    return fail("V124_AUTHORITY_SESSION_PROOF_INVALID");
  }
  return freeze({ challenge, scopes, artifactDigest, nonce: challenge.nonce, verificationKey });
}

function namespaceProjections(value: unknown, expectedNames: readonly string[]): readonly ReceizAuthoritySessionNamespaceV124[] {
  if (!Array.isArray(value) || value.length !== expectedNames.length) fail("V124_AUTHORITY_SESSION_NAMESPACE_MISMATCH");
  const result = value.map((item) => {
    const record = closedRecord(item, ["name", "head", "digest"], "V124_AUTHORITY_SESSION_NAMESPACE_INVALID");
    return freeze({ name: token(record.name, "V124_AUTHORITY_SESSION_NAMESPACE_INVALID"), head: digest(record.head, "V124_AUTHORITY_SESSION_NAMESPACE_INVALID"), digest: digest(record.digest, "V124_AUTHORITY_SESSION_NAMESPACE_INVALID") });
  });
  if (!exactListEqual(result.map(({ name }) => name), expectedNames)) fail("V124_AUTHORITY_SESSION_NAMESPACE_MISMATCH");
  return freeze(result);
}

function sameNamespaces(left: readonly ReceizAuthoritySessionNamespaceV124[], right: readonly ReceizAuthoritySessionNamespaceV124[]): boolean {
  return canonicalizeReceizV122(left) === canonicalizeReceizV122(right);
}

async function validateSessionWire(input: Readonly<{
  wire: unknown;
  applicationId: string;
  audience: string;
  actorSubjectId?: string;
  handle?: string;
  subjectSourceArtifactSha256: string;
  identityArtifactSha256: string;
  identityKeyId: string;
  scopes: readonly string[];
  rails: readonly string[];
  namespaces: readonly string[];
  decisionKaiUPulse: number;
}>): Promise<ReceizAuthoritySessionV124> {
  const admission = getReceizAuthenticatedRuntimeAdmissionV124(input.wire);
  const record = closedRecord(input.wire, ["schema", "status", "authoritySessionHandle", "applicationId", "audience", "actorSubjectId", "subjectSourceArtifactSha256", "identityArtifactSha256", "identityKeyId", "grantedScopes", "grantedRails", "namespaces", "revocationHead", "issuedAtKaiUPulse", "expiresAtKaiUPulse", "sessionBindingDigest", "authority"], "V124_AUTHORITY_SESSION_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.authority-session.v124" || record.status !== "active") fail("V124_AUTHORITY_SESSION_STATUS_INVALID");
  const basis = freeze({
    schema: "receiz.authority-session.v124" as const,
    status: "active" as const,
    authoritySessionHandle: handle(record.authoritySessionHandle, "V124_AUTHORITY_SESSION_HANDLE_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_AUTHORITY_SESSION_APPLICATION_INVALID"),
    audience: applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID"),
    actorSubjectId: domainId(record.actorSubjectId, "V124_AUTHORITY_SESSION_ACTOR_INVALID"),
    subjectSourceArtifactSha256: digest(record.subjectSourceArtifactSha256, "V124_AUTHORITY_SESSION_SUBJECT_SOURCE_INVALID"),
    identityArtifactSha256: digest(record.identityArtifactSha256, "V124_AUTHORITY_SESSION_IDENTITY_ARTIFACT_INVALID"),
    identityKeyId: digest(record.identityKeyId, "V124_AUTHORITY_SESSION_IDENTITY_KEY_INVALID"),
    grantedScopes: exactTokenList(record.grantedScopes, "V124_AUTHORITY_SESSION_SCOPE_INVALID", false),
    grantedRails: exactTokenList(record.grantedRails, "V124_AUTHORITY_SESSION_RAIL_INVALID", true),
    namespaces: namespaceProjections(record.namespaces, input.namespaces),
    revocationHead: digest(record.revocationHead, "V124_AUTHORITY_SESSION_REVOCATION_INVALID"),
    issuedAtKaiUPulse: upulse(record.issuedAtKaiUPulse, "V124_AUTHORITY_SESSION_UPULSE_INVALID"),
    expiresAtKaiUPulse: upulse(record.expiresAtKaiUPulse, "V124_AUTHORITY_SESSION_UPULSE_INVALID"),
  });
  if (basis.expiresAtKaiUPulse <= basis.issuedAtKaiUPulse) fail("V124_AUTHORITY_SESSION_UPULSE_INVALID");
  if (basis.issuedAtKaiUPulse > input.decisionKaiUPulse) fail("V124_AUTHORITY_SESSION_NOT_YET_ACTIVE");
  if (basis.expiresAtKaiUPulse <= input.decisionKaiUPulse) fail("V124_AUTHORITY_SESSION_EXPIRED");
  if (basis.applicationId !== input.applicationId || basis.audience !== input.audience
    || (input.actorSubjectId !== undefined && basis.actorSubjectId !== input.actorSubjectId)
    || basis.subjectSourceArtifactSha256 !== input.subjectSourceArtifactSha256
    || basis.identityArtifactSha256 !== input.identityArtifactSha256
    || basis.identityKeyId !== input.identityKeyId
    || (input.handle !== undefined && basis.authoritySessionHandle !== input.handle)) fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
  if (!exactListEqual(basis.grantedScopes, input.scopes)) fail("V124_AUTHORITY_SESSION_SCOPE_MISMATCH");
  if (!exactListEqual(basis.grantedRails, input.rails)) fail("V124_AUTHORITY_SESSION_RAIL_MISMATCH");
  const sessionBindingDigest = digest(record.sessionBindingDigest, "V124_AUTHORITY_SESSION_BINDING_INVALID");
  if (sessionBindingDigest !== await digestReceizCanonicalV122({ ...basis, schema: "receiz.authority-session-binding.v124" })) fail("V124_AUTHORITY_SESSION_BINDING_INVALID");
  const receipt = admission.receipt;
  if (receipt.applicationId !== basis.applicationId || receipt.audience !== basis.audience || receipt.revocationHead !== basis.revocationHead
    || receipt.issuedAtKaiUPulse > basis.issuedAtKaiUPulse || basis.expiresAtKaiUPulse > receipt.expiresAtKaiUPulse) fail("V124_AUTHORITY_SESSION_RECEIPT_MISMATCH");
  return freeze({ ...basis, sessionBindingDigest, runtimeReceiptDigest: receipt.receiptDigest, authority: sessionAuthority(record.authority) });
}

/**
 * Reads a serialized public session projection as request coordinates only.
 * No admission is issued here: its receipt digest is not a signature and the
 * caller-shaped value cannot enter heldSessions. A subsequent pinned signed
 * refresh/close response must re-establish authenticated capability custody.
 */
async function inspectPersistedSession(
  value: unknown,
  expected: Readonly<{
    applicationId: string;
    audience: string;
    handle: string;
    namespaces?: readonly string[];
    decisionKaiUPulse?: number;
  }>,
): Promise<ReceizAuthoritySessionV124> {
  const record = closedRecord(value, [
    "schema",
    "status",
    "authoritySessionHandle",
    "applicationId",
    "audience",
    "actorSubjectId",
    "subjectSourceArtifactSha256",
    "identityArtifactSha256",
    "identityKeyId",
    "grantedScopes",
    "grantedRails",
    "namespaces",
    "revocationHead",
    "issuedAtKaiUPulse",
    "expiresAtKaiUPulse",
    "sessionBindingDigest",
    "runtimeReceiptDigest",
    "authority",
  ], "V124_AUTHORITY_SESSION_PERSISTED_INVALID");
  if (record.schema !== "receiz.authority-session.v124" || record.status !== "active") {
    fail("V124_AUTHORITY_SESSION_PERSISTED_INVALID");
  }
  if (!Array.isArray(record.namespaces)) fail("V124_AUTHORITY_SESSION_NAMESPACE_INVALID");
  const namespaceNames = exactTokenList(record.namespaces.map((value) => {
    const namespace = closedRecord(
      value,
      ["name", "head", "digest"],
      "V124_AUTHORITY_SESSION_NAMESPACE_INVALID",
    );
    return namespace.name;
  }), "V124_AUTHORITY_SESSION_NAMESPACE_INVALID", true);
  if (expected.namespaces !== undefined
    && !exactListEqual(namespaceNames, expected.namespaces)) {
    fail("V124_AUTHORITY_SESSION_NAMESPACE_MISMATCH");
  }
  const basis = freeze({
    schema: "receiz.authority-session.v124" as const,
    status: "active" as const,
    authoritySessionHandle: handle(
      record.authoritySessionHandle,
      "V124_AUTHORITY_SESSION_HANDLE_INVALID",
    ),
    applicationId: applicationId(
      record.applicationId,
      "V124_AUTHORITY_SESSION_APPLICATION_INVALID",
    ),
    audience: applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID"),
    actorSubjectId: domainId(
      record.actorSubjectId,
      "V124_AUTHORITY_SESSION_ACTOR_INVALID",
    ),
    subjectSourceArtifactSha256: digest(
      record.subjectSourceArtifactSha256,
      "V124_AUTHORITY_SESSION_SUBJECT_SOURCE_INVALID",
    ),
    identityArtifactSha256: digest(
      record.identityArtifactSha256,
      "V124_AUTHORITY_SESSION_IDENTITY_ARTIFACT_INVALID",
    ),
    identityKeyId: digest(
      record.identityKeyId,
      "V124_AUTHORITY_SESSION_IDENTITY_KEY_INVALID",
    ),
    grantedScopes: exactTokenList(
      record.grantedScopes,
      "V124_AUTHORITY_SESSION_SCOPE_INVALID",
      false,
    ),
    grantedRails: exactTokenList(
      record.grantedRails,
      "V124_AUTHORITY_SESSION_RAIL_INVALID",
      true,
    ),
    namespaces: namespaceProjections(record.namespaces, namespaceNames),
    revocationHead: digest(
      record.revocationHead,
      "V124_AUTHORITY_SESSION_REVOCATION_INVALID",
    ),
    issuedAtKaiUPulse: upulse(
      record.issuedAtKaiUPulse,
      "V124_AUTHORITY_SESSION_UPULSE_INVALID",
    ),
    expiresAtKaiUPulse: upulse(
      record.expiresAtKaiUPulse,
      "V124_AUTHORITY_SESSION_UPULSE_INVALID",
    ),
  });
  if (basis.expiresAtKaiUPulse <= basis.issuedAtKaiUPulse) {
    fail("V124_AUTHORITY_SESSION_UPULSE_INVALID");
  }
  if (expected.decisionKaiUPulse !== undefined) {
    if (basis.issuedAtKaiUPulse > expected.decisionKaiUPulse) {
      fail("V124_AUTHORITY_SESSION_NOT_YET_ACTIVE");
    }
    if (basis.expiresAtKaiUPulse <= expected.decisionKaiUPulse) {
      fail("V124_AUTHORITY_SESSION_EXPIRED");
    }
  }
  if (basis.applicationId !== expected.applicationId
    || basis.audience !== expected.audience
    || basis.authoritySessionHandle !== expected.handle) {
    fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
  }
  const sessionBindingDigest = digest(
    record.sessionBindingDigest,
    "V124_AUTHORITY_SESSION_BINDING_INVALID",
  );
  if (sessionBindingDigest !== await digestReceizCanonicalV122({
    ...basis,
    schema: "receiz.authority-session-binding.v124",
  })) {
    fail("V124_AUTHORITY_SESSION_BINDING_INVALID");
  }
  return freeze({
    ...basis,
    sessionBindingDigest,
    runtimeReceiptDigest: digest(
      record.runtimeReceiptDigest,
      "V124_AUTHORITY_SESSION_PERSISTED_INVALID",
    ),
    authority: sessionAuthority(record.authority),
  });
}

async function validateClosedWire(
  wire: unknown,
  expected: ReceizCloseAuthoritySessionInputV124,
  held: Readonly<{ session: ReceizAuthoritySessionV124 }>,
): Promise<ReceizAuthoritySessionClosedV124> {
  const admission = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  const record = closedRecord(wire, ["schema", "status", "authoritySessionHandle", "applicationId", "audience", "priorRevocationHead", "revocationAppendDigest", "revocationHead", "closedAtKaiUPulse", "sessionBindingDigest", "authority"], "V124_AUTHORITY_SESSION_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.authority-session-closed.v124" || record.status !== "closed") fail("V124_AUTHORITY_SESSION_STATUS_INVALID");
  const priorRevocationHead = digest(record.priorRevocationHead, "V124_AUTHORITY_SESSION_REVOCATION_APPEND_INVALID");
  const revocationAppendDigest = digest(record.revocationAppendDigest, "V124_AUTHORITY_SESSION_REVOCATION_APPEND_INVALID");
  const basis = freeze({
    schema: "receiz.authority-session-closed.v124" as const,
    status: "closed" as const,
    authoritySessionHandle: handle(record.authoritySessionHandle, "V124_AUTHORITY_SESSION_HANDLE_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_AUTHORITY_SESSION_APPLICATION_INVALID"),
    audience: applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID"),
    revocationHead: digest(record.revocationHead, "V124_AUTHORITY_SESSION_REVOCATION_INVALID"),
    closedAtKaiUPulse: upulse(record.closedAtKaiUPulse, "V124_AUTHORITY_SESSION_UPULSE_INVALID"),
  });
  if (basis.applicationId !== expected.applicationId || basis.audience !== expected.applicationId || basis.authoritySessionHandle !== expected.authoritySessionHandle) fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
  const sessionBindingDigest = digest(record.sessionBindingDigest, "V124_AUTHORITY_SESSION_BINDING_INVALID");
  if (priorRevocationHead !== held.session.revocationHead || sessionBindingDigest !== held.session.sessionBindingDigest
    || basis.closedAtKaiUPulse < held.session.issuedAtKaiUPulse || basis.closedAtKaiUPulse >= held.session.expiresAtKaiUPulse) fail("V124_AUTHORITY_SESSION_REVOCATION_APPEND_INVALID");
  const expectedAppendDigest = await digestReceizCanonicalV122({
    schema: "receiz.authority-session-revocation-append.v124",
    applicationId: basis.applicationId,
    audience: basis.audience,
    authoritySessionHandle: basis.authoritySessionHandle,
    priorRevocationHead,
    priorSessionBindingDigest: sessionBindingDigest,
    closedAtKaiUPulse: basis.closedAtKaiUPulse,
  });
  if (revocationAppendDigest !== expectedAppendDigest || basis.revocationHead !== await digestReceizCanonicalV122({
    schema: "receiz.authority-session-revocation-head.v124",
    priorRevocationHead,
    revocationAppendDigest,
  })) fail("V124_AUTHORITY_SESSION_REVOCATION_APPEND_INVALID");
  const receipt = admission.receipt;
  if (receipt.applicationId !== basis.applicationId || receipt.audience !== basis.audience || receipt.revocationHead !== basis.revocationHead
    || receipt.issuedAtKaiUPulse > basis.closedAtKaiUPulse || basis.closedAtKaiUPulse >= receipt.expiresAtKaiUPulse) fail("V124_AUTHORITY_SESSION_RECEIPT_MISMATCH");
  return freeze({ ...basis, sessionBindingDigest, runtimeReceiptDigest: receipt.receiptDigest, authority: sessionAuthority(record.authority) });
}

function failureAuthority(value: unknown): ReceizRuntimeZeroWriteFailureV124["authority"] {
  const record = closedRecord(value, ["failureIsProofAuthority", "strongerTruth"], "V124_RUNTIME_ZERO_WRITE_AUTHORITY_INVALID");
  if (record.failureIsProofAuthority !== false || record.strongerTruth !== "receiz-identity-artifact") fail("V124_RUNTIME_ZERO_WRITE_AUTHORITY_INVALID");
  return freeze({ failureIsProofAuthority: false as const, strongerTruth: "receiz-identity-artifact" as const });
}

async function validateFailure(wire: unknown, expected: Readonly<{ operation: ReceizRuntimeOperationV124; applicationId: string; authoritySessionHandle: string | null }>): Promise<ReceizRuntimeZeroWriteFailureV124> {
  const admission = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  const record = closedRecord(wire, ["schema", "status", "operation", "applicationId", "authoritySessionHandle", "reasonCode", "writes", "authority", "failureDigest"], "V124_RUNTIME_ZERO_WRITE_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.runtime-zero-write-failure.v124" || record.status !== "zero-write" || record.writes !== 0
    || !SESSION_OPERATIONS.includes(record.operation as ReceizRuntimeOperationV124) || !ZERO_WRITE_REASONS.includes(record.reasonCode as ReceizRuntimeZeroWriteReasonV124)) fail("V124_RUNTIME_ZERO_WRITE_INVALID");
  const basis = freeze({
    schema: "receiz.runtime-zero-write-failure.v124" as const,
    status: "zero-write" as const,
    operation: record.operation as ReceizRuntimeOperationV124,
    applicationId: applicationId(record.applicationId, "V124_RUNTIME_ZERO_WRITE_INVALID"),
    authoritySessionHandle: record.authoritySessionHandle === null ? null : handle(record.authoritySessionHandle, "V124_RUNTIME_ZERO_WRITE_INVALID"),
    reasonCode: record.reasonCode as ReceizRuntimeZeroWriteReasonV124,
    writes: 0 as const,
    authority: failureAuthority(record.authority),
  });
  if (basis.operation !== expected.operation || basis.applicationId !== expected.applicationId || basis.authoritySessionHandle !== expected.authoritySessionHandle) fail("V124_RUNTIME_ZERO_WRITE_COORDINATE_MISMATCH");
  const failureDigest = digest(record.failureDigest, "V124_RUNTIME_ZERO_WRITE_INVALID");
  if (failureDigest !== await digestReceizCanonicalV122({ ...basis, schema: "receiz.runtime-zero-write-failure-digest.v124" })) fail("V124_RUNTIME_ZERO_WRITE_DIGEST_INVALID");
  return freeze({ ...basis, failureDigest, runtimeReceiptDigest: admission.receipt.receiptDigest });
}

function retry(value: unknown): ReceizQualificationRetryV124 {
  const record = closedRecord(value, ["strategy", "retryAfterKaiUPulse"], "V124_QUALIFICATION_RETRY_INVALID");
  if (record.strategy === "none" || record.strategy === "operator-action") {
    if (record.retryAfterKaiUPulse !== null) fail("V124_QUALIFICATION_RETRY_INVALID");
    return freeze({ strategy: record.strategy, retryAfterKaiUPulse: null });
  }
  if (record.strategy !== "retry-after") fail("V124_QUALIFICATION_RETRY_INVALID");
  return freeze({ strategy: "retry-after" as const, retryAfterKaiUPulse: upulse(record.retryAfterKaiUPulse, "V124_QUALIFICATION_RETRY_INVALID") });
}

function reportAuthority(value: unknown): ReceizOperationalCapabilityReportV124["authority"] {
  const record = closedRecord(value, ["reportIsProofAuthority", "reportIsOperationalAuthority", "strongerTruth"], "V124_QUALIFICATION_AUTHORITY_INVALID");
  if (record.reportIsProofAuthority !== false || record.reportIsOperationalAuthority !== false || record.strongerTruth !== "receiz-identity-artifact") fail("V124_QUALIFICATION_AUTHORITY_INVALID");
  return freeze({ reportIsProofAuthority: false as const, reportIsOperationalAuthority: false as const, strongerTruth: "receiz-identity-artifact" as const });
}

function qualificationVersion(value: unknown, kind: "service" | "registry" | "reducer"): string {
  const result = text(value, "V124_QUALIFICATION_VERSION_INVALID");
  if (kind === "service") {
    if (!SERVICE_VERSION.test(result)) fail("V124_QUALIFICATION_VERSION_INVALID");
  } else if (!DEPENDENCY_VERSION.test(result) || !result.startsWith(`${kind}:`)) {
    fail("V124_QUALIFICATION_VERSION_INVALID");
  }
  return result;
}

function qualificationEvidence(value: unknown, operation: string): ReceizQualificationEvidenceV124 {
  const known = isKnownQualificationOperation(operation);
  const recipient = operation === "public-recipient-resolution";
  const record = closedRecord(value, recipient
    ? [
      "runtime",
      "transportSignature",
      "registry",
      "reducer",
      "publicHeads",
      "distributedLimiter",
      "recipientPublication",
      "recipientProofStorage",
      "recipientLocatorIssue",
      "recipientLocatorConsume",
    ]
    : ["runtime", ...(known ? ["transportSignature"] : []), "registry", "reducer", "publicHeads", "distributedLimiter"], "V124_QUALIFICATION_EVIDENCE_INVALID");
  if (record.runtime !== "ready" && record.runtime !== "unavailable") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (known && record.transportSignature !== "available" && record.transportSignature !== "unavailable") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (record.registry !== "compatible" && record.registry !== "mismatch") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (record.reducer !== "compatible" && record.reducer !== "mismatch") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (record.publicHeads !== "current" && record.publicHeads !== "stale") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (record.distributedLimiter !== "available" && record.distributedLimiter !== "unavailable" && record.distributedLimiter !== "not-required") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  if (recipient) {
    if (record.distributedLimiter === "not-required") fail("V124_QUALIFICATION_EVIDENCE_INVALID");
    if ((record.recipientPublication !== "available" && record.recipientPublication !== "unavailable")
      || (record.recipientProofStorage !== "available" && record.recipientProofStorage !== "unavailable")
      || (record.recipientLocatorIssue !== "available" && record.recipientLocatorIssue !== "unavailable")
      || (record.recipientLocatorConsume !== "available" && record.recipientLocatorConsume !== "unavailable")) {
      fail("V124_QUALIFICATION_EVIDENCE_INVALID");
    }
  } else if (record.distributedLimiter !== "not-required") {
    fail("V124_QUALIFICATION_EVIDENCE_INVALID");
  }
  return freeze({
    runtime: record.runtime,
    ...(known ? { transportSignature: record.transportSignature as "available" | "unavailable" } : {}),
    registry: record.registry,
    reducer: record.reducer,
    publicHeads: record.publicHeads,
    distributedLimiter: record.distributedLimiter,
    ...(recipient ? {
      recipientPublication: record.recipientPublication as "available" | "unavailable",
      recipientProofStorage: record.recipientProofStorage as "available" | "unavailable",
      recipientLocatorIssue: record.recipientLocatorIssue as "available" | "unavailable",
      recipientLocatorConsume: record.recipientLocatorConsume as "available" | "unavailable",
    } : {}),
  });
}

function qualificationReasonIsEvidenced(
  reasonCode: ReceizQualificationReasonV124,
  operation: string,
  actualGrantedScopes: readonly string[],
  dependencyHealth: ReceizOperationalCapabilityV124["dependencyHealth"],
  evidence: ReceizQualificationEvidenceV124,
): boolean {
  if (!isKnownQualificationOperation(operation)) {
    return reasonCode === "DURABLE_RUNTIME_UNAVAILABLE" && evidence.runtime === "unavailable";
  }
  const requirements = QUALIFICATION_REQUIREMENTS[operation];
  switch (reasonCode) {
    case "MISSING_SCOPE": return requirements.requiredScopes.some((scope) => !actualGrantedScopes.includes(scope));
    case "PRINCIPAL_AUDIENCE_MISMATCH": return true;
    case "STALE_PUBLICATION_HEAD": return evidence.publicHeads === "stale";
    case "REGISTRY_REDUCER_MISMATCH": return evidence.registry === "mismatch" || evidence.reducer === "mismatch";
    case "DEPENDENCY_UNHEALTHY": return dependencyHealth !== "healthy";
    case "DURABLE_RUNTIME_UNAVAILABLE": return evidence.runtime === "unavailable";
    case "TRANSPORT_SIGNATURE_UNAVAILABLE": return evidence.transportSignature === "unavailable";
    case "DISTRIBUTED_LIMITER_UNAVAILABLE": return operation === "public-recipient-resolution" && evidence.distributedLimiter === "unavailable";
    case "RECIPIENT_PUBLICATION_UNAVAILABLE": return operation === "public-recipient-resolution" && evidence.recipientPublication === "unavailable";
    case "RECIPIENT_PROOF_STORAGE_UNAVAILABLE": return operation === "public-recipient-resolution" && evidence.recipientProofStorage === "unavailable";
    case "RECIPIENT_LOCATOR_ISSUE_UNAVAILABLE": return operation === "public-recipient-resolution" && evidence.recipientLocatorIssue === "unavailable";
    case "RECIPIENT_LOCATOR_CONSUME_UNAVAILABLE": return operation === "public-recipient-resolution" && evidence.recipientLocatorConsume === "unavailable";
  }
}

async function validateQualification(wire: unknown, expectedApplication: string, operations: readonly string[]): Promise<ReceizOperationalCapabilityReportV124> {
  const admission = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  const record = closedRecord(wire, ["schema", "applicationId", "requestedOperations", "qualifiedAtKaiUPulse", "results", "reportDigest", "authority"], "V124_QUALIFICATION_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.operational-capability-report.v124") fail("V124_QUALIFICATION_SCHEMA_INVALID");
  const requestedOperations = exactTokenList(record.requestedOperations, "V124_QUALIFICATION_OPERATIONS_INVALID", false);
  if (!exactListEqual(requestedOperations, operations)) fail("V124_QUALIFICATION_RESPONSE_COORDINATE_MISMATCH");
  if (!Array.isArray(record.results) || record.results.length !== operations.length) fail("V124_QUALIFICATION_RESULT_SET_INVALID");
  const results = freeze(record.results.map((value, index): ReceizOperationalCapabilityV124 => {
    const item = closedRecord(value, ["operation", "status", "actualGrantedScopes", "serviceVersion", "registryVersion", "reducerVersion", "publicDependencyHeads", "dependencyHealth", "reasonCode", "retry", "evidence"], "V124_QUALIFICATION_RESULT_CLOSED_SHAPE_INVALID");
    const operation = token(item.operation, "V124_QUALIFICATION_OPERATION_INVALID");
    if (operation !== operations[index]) fail("V124_QUALIFICATION_RESULT_SET_INVALID");
    if (item.status !== "available" && item.status !== "degraded" && item.status !== "unavailable") fail("V124_QUALIFICATION_STATUS_INVALID");
    if (item.dependencyHealth !== "healthy" && item.dependencyHealth !== "degraded" && item.dependencyHealth !== "unhealthy") fail("V124_QUALIFICATION_HEALTH_INVALID");
    const actualGrantedScopes = exactTokenList(item.actualGrantedScopes, "V124_QUALIFICATION_SCOPE_INVALID", true), publicDependencyHeads = exactHeads(item.publicDependencyHeads, "V124_QUALIFICATION_HEADS_INVALID");
    const requirements = isKnownQualificationOperation(operation) ? QUALIFICATION_REQUIREMENTS[operation] : null;
    const publicHeadNames = Object.keys(publicDependencyHeads);
    if (requirements && publicHeadNames.some((name) => !requirements.requiredHeads.includes(name as never))) fail("V124_QUALIFICATION_HEADS_INVALID");
    const reasonCode = item.reasonCode === null ? null : QUALIFICATION_REASONS.includes(item.reasonCode as ReceizQualificationReasonV124) ? item.reasonCode as ReceizQualificationReasonV124 : fail("V124_QUALIFICATION_REASON_INVALID");
    const retryGuidance = retry(item.retry);
    const evidence = qualificationEvidence(item.evidence, operation);
    const serviceVersion = qualificationVersion(item.serviceVersion, "service");
    const registryVersion = qualificationVersion(item.registryVersion, "registry");
    const reducerVersion = qualificationVersion(item.reducerVersion, "reducer");
    if (!requirements) {
      if (item.status !== "unavailable"
        || actualGrantedScopes.length !== 0
        || publicHeadNames.length !== 0
        || item.dependencyHealth !== "unhealthy"
        || reasonCode !== "DURABLE_RUNTIME_UNAVAILABLE"
        || retryGuidance.strategy !== "operator-action"
        || evidence.runtime !== "unavailable"
        || evidence.registry !== "compatible"
        || evidence.reducer !== "compatible"
        || evidence.publicHeads !== "current"
        || evidence.distributedLimiter !== "not-required") {
        fail("V124_QUALIFICATION_UNREGISTERED_OPERATION_UNAVAILABLE_REQUIRED");
      }
      return freeze({ operation, status: item.status, actualGrantedScopes, serviceVersion, registryVersion, reducerVersion, publicDependencyHeads, dependencyHealth: item.dependencyHealth, reasonCode, retry: retryGuidance, evidence });
    }
    const hasRequiredScopes = requirements.requiredScopes.every((scope) => actualGrantedScopes.includes(scope));
    const hasExactRequiredHeads = exactListEqual(publicHeadNames, requirements.requiredHeads);
    if (item.status === "available" && (
      item.dependencyHealth !== "healthy"
      || reasonCode !== null
      || retryGuidance.strategy !== "none"
      || !hasRequiredScopes
      || !hasExactRequiredHeads
      || evidence.runtime !== "ready"
      || evidence.transportSignature !== "available"
      || evidence.registry !== "compatible"
      || evidence.reducer !== "compatible"
      || evidence.publicHeads !== "current"
      || (operation === "public-recipient-resolution" && evidence.distributedLimiter !== "available")
      || (operation === "public-recipient-resolution" && evidence.recipientPublication !== "available")
      || (operation === "public-recipient-resolution" && evidence.recipientProofStorage !== "available")
      || (operation === "public-recipient-resolution" && evidence.recipientLocatorIssue !== "available")
      || (operation === "public-recipient-resolution" && evidence.recipientLocatorConsume !== "available")
    )) fail("V124_QUALIFICATION_AVAILABILITY_UNPROVEN");
    if (item.status !== "available" && (reasonCode === null || !qualificationReasonIsEvidenced(reasonCode, operation, actualGrantedScopes, item.dependencyHealth, evidence))) fail("V124_QUALIFICATION_REASON_INVALID");
    return freeze({ operation, status: item.status, actualGrantedScopes, serviceVersion, registryVersion, reducerVersion, publicDependencyHeads, dependencyHealth: item.dependencyHealth, reasonCode, retry: retryGuidance, evidence });
  }));
  const basis = freeze({
    schema: "receiz.operational-capability-report.v124" as const,
    applicationId: applicationId(record.applicationId, "V124_QUALIFICATION_APPLICATION_INVALID"),
    requestedOperations,
    qualifiedAtKaiUPulse: upulse(record.qualifiedAtKaiUPulse, "V124_QUALIFICATION_UPULSE_INVALID"),
    results,
  });
  if (basis.applicationId !== expectedApplication) fail("V124_QUALIFICATION_RESPONSE_COORDINATE_MISMATCH");
  const reportDigest = digest(record.reportDigest, "V124_QUALIFICATION_DIGEST_INVALID");
  if (reportDigest !== await digestReceizCanonicalV122({ ...basis, schema: "receiz.operational-capability-report-digest.v124" })) fail("V124_QUALIFICATION_DIGEST_INVALID");
  const receipt = admission.receipt;
  if (receipt.applicationId !== basis.applicationId || receipt.audience !== basis.applicationId || receipt.issuedAtKaiUPulse > basis.qualifiedAtKaiUPulse || basis.qualifiedAtKaiUPulse >= receipt.expiresAtKaiUPulse) fail("V124_QUALIFICATION_RECEIPT_MISMATCH");
  return freeze({ ...basis, reportDigest, runtimeReceiptDigest: receipt.receiptDigest, authority: reportAuthority(record.authority) });
}

export function createReceizV124Runtime(request: RemoteRequest) {
  const heldSessions = new Map<string, HeldSession>();
  const heldClosedSessions = new Map<string, ReceizAuthoritySessionClosedV124>();
  const challengeAttempts = new Map<string, RetainedChallengeAttempt>();
  const pruneExpiredChallengeAttempts = (currentPulse: number): void => {
    for (const [coordinateDigest, attempt] of challengeAttempts) {
      if (attempt.expiresAtKai <= currentPulse) {
        challengeAttempts.delete(coordinateDigest);
      }
    }
  };
  const challengeAttemptCoordinates = async (
    application: string,
    nonce: string,
    operation: RetainedChallengeAttempt["operation"],
    inputBinding: Readonly<Record<string, unknown>>,
  ): Promise<ChallengeAttemptCoordinates> => {
    const coordinateDigest = await digestReceizCanonicalV122({ schema: "receiz.authority-session-challenge-coordinate.v124", applicationId: application, nonce });
    const inputBindingDigest = await digestReceizCanonicalV122({
      schema: "receiz.authority-session-request-attempt.v124",
      operation,
      input: inputBinding,
    });
    return freeze({ coordinateDigest, inputBindingDigest });
  };
  const inspectChallengeAttempt = (
    coordinates: ChallengeAttemptCoordinates,
    operation: RetainedChallengeAttempt["operation"],
  ): RetainedChallengeAttempt | undefined => {
    const { coordinateDigest, inputBindingDigest } = coordinates;
    const existing = challengeAttempts.get(coordinateDigest);
    if (existing && (existing.operation !== operation
      || existing.inputBindingDigest !== inputBindingDigest)) {
      fail("V124_AUTHORITY_SESSION_CHALLENGE_REPLAYED");
    }
    return existing;
  };
  const reserveChallengeAttempt = (
    coordinates: ChallengeAttemptCoordinates,
    candidate: RetainedChallengeAttempt,
  ): RetainedChallengeAttempt => {
    const existing = inspectChallengeAttempt(coordinates, candidate.operation);
    if (existing) return existing;
    challengeAttempts.set(coordinates.coordinateDigest, candidate);
    return candidate;
  };
  const bindAcceptedOpenIssue = (
    coordinates: ChallengeAttemptCoordinates,
    issue: NonNullable<RetainedOpenChallengeAttempt["acceptedIssue"]>,
  ): void => {
    const attempt = inspectChallengeAttempt(coordinates, "open");
    if (!attempt || attempt.operation !== "open") fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
    if (attempt.acceptedIssue) {
      if (attempt.acceptedIssue.authoritySessionHandle !== issue.authoritySessionHandle
        || attempt.acceptedIssue.sessionBindingDigest !== issue.sessionBindingDigest) {
        fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
      }
      return;
    }
    challengeAttempts.set(coordinates.coordinateDigest, freeze({
      ...attempt,
      acceptedIssue: freeze(issue),
    }));
  };
  const authenticatedWire = async (path: string, body: Record<string, unknown>, app: string, audience: string) => {
    const prepared = await createReceizAuthenticatedRuntimeRequestV124({ method: "POST", path, applicationId: app, audience, strongerTruth: "receiz-identity-artifact", body });
    const response = await request<unknown>(path, { method: "POST", body });
    const envelope = closedRecord(response, ["wire", "receipt"], "V124_RUNTIME_RESPONSE_ENVELOPE_INVALID");
    return admitReceizAuthenticatedRuntimeWireV124({ request: prepared, wire: envelope.wire, receipt: envelope.receipt });
  };
  const resultOrFailure = async <T>(wire: unknown, expected: Readonly<{ operation: ReceizRuntimeOperationV124; applicationId: string; authoritySessionHandle: string | null }>, success: () => Promise<T>): Promise<T> => {
    if ((wire as { schema?: unknown }).schema === "receiz.runtime-zero-write-failure.v124") throw new ReceizRuntimeZeroWriteErrorV124(await validateFailure(wire, expected));
    return success();
  };

  const openAuthoritySessionV124 = async (input: ReceizOpenAuthoritySessionInputV124): Promise<ReceizAuthoritySessionV124> => {
    const record = closedRecord(input, ["applicationId", "actorSubjectId", "subjectSourceArtifact", "proofArtifact", "signedChallenge", "requestedRails", "requiredNamespaces", "audience"], "V124_AUTHORITY_SESSION_OPEN_INPUT_INVALID");
    const app = applicationId(record.applicationId, "V124_AUTHORITY_SESSION_APPLICATION_INVALID"), audience = applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID");
    if (audience !== app) fail("V124_AUTHORITY_SESSION_AUDIENCE_INVALID");
    const actorSubjectId = domainId(record.actorSubjectId, "V124_AUTHORITY_SESSION_ACTOR_INVALID"), rails = normalizeRails(record.requestedRails, "V124_AUTHORITY_SESSION_RAIL_INVALID"), namespaces = normalizeNamespaces(record.requiredNamespaces, "V124_AUTHORITY_SESSION_NAMESPACE_INVALID");
    const bytes = await artifactBytes(record.proofArtifact as Blob | ArrayBuffer | Uint8Array | string);
    const subjectSource = await subjectSourceArtifact(record.subjectSourceArtifact);
    const decisionKai = receizKaiNow();
    pruneExpiredChallengeAttempts(decisionKai.pulse);
    const challenge = await validateSignedChallenge(record.signedChallenge, app, decisionKai.pulse, { bytes });
    const body = freeze({ applicationId: app, actorSubjectId, artifact: freeze({ exactBytesB64u: receizBase64UrlEncode(bytes), digest: challenge.artifactDigest }), subjectSourceArtifact: subjectSource, signedChallenge: challenge.challenge, requestedRails: rails, requiredNamespaces: namespaces, audience });
    const attemptCoordinates = await challengeAttemptCoordinates(
      app,
      challenge.nonce,
      "open",
      body,
    );
    const retainedAttempt = reserveChallengeAttempt(attemptCoordinates, freeze({
      operation: "open" as const,
      inputBindingDigest: attemptCoordinates.inputBindingDigest,
      expiresAtKai: challenge.challenge.expiresAtKai,
      body,
      acceptedIssue: null,
    }));
    if (retainedAttempt.operation !== "open") {
      fail("V124_AUTHORITY_SESSION_CHALLENGE_REPLAYED");
    }
    const wire = await authenticatedWire("/api/sdk/v1/runtime/authority-sessions/open", retainedAttempt.body, app, audience);
    const session = await resultOrFailure(wire, { operation: "open-authority-session", applicationId: app, authoritySessionHandle: null }, () => validateSessionWire({
      wire,
      applicationId: app,
      audience,
      actorSubjectId,
      subjectSourceArtifactSha256: subjectSource.artifactSha256,
      identityArtifactSha256: challenge.artifactDigest,
      identityKeyId: challenge.verificationKey.keyId,
      scopes: challenge.scopes,
      rails,
      namespaces,
      decisionKaiUPulse: decisionKai.uPulse,
    }));
    const closedCoordinate = JSON.stringify([app, session.authoritySessionHandle]);
    const current = heldSessions.get(session.authoritySessionHandle);
    if (heldClosedSessions.has(closedCoordinate)
      || (current && current.session.sessionBindingDigest !== session.sessionBindingDigest)) {
      fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
    }
    bindAcceptedOpenIssue(attemptCoordinates, freeze({
      authoritySessionHandle: session.authoritySessionHandle,
      sessionBindingDigest: session.sessionBindingDigest,
    }));
    heldSessions.set(session.authoritySessionHandle, freeze({ session, artifactDigest: challenge.artifactDigest, verificationKey: challenge.verificationKey }));
    return session;
  };

  const refreshAuthoritySessionV124 = async (input: ReceizRefreshAuthoritySessionInputV124): Promise<ReceizAuthoritySessionV124> => {
    const hasPersistedSession = input !== null && typeof input === "object"
      && Object.prototype.hasOwnProperty.call(input, "persistedSession");
    const record = closedRecord(input, hasPersistedSession
      ? ["applicationId", "authoritySessionHandle", "signedChallenge", "requestedRails", "requiredNamespaces", "audience", "persistedSession", "proofArtifact"]
      : ["applicationId", "authoritySessionHandle", "signedChallenge", "requestedRails", "requiredNamespaces", "audience", "proofArtifact"], "V124_AUTHORITY_SESSION_REFRESH_INPUT_INVALID");
    const app = applicationId(record.applicationId, "V124_AUTHORITY_SESSION_APPLICATION_INVALID"), audience = applicationId(record.audience, "V124_AUTHORITY_SESSION_AUDIENCE_INVALID"), sessionHandle = handle(record.authoritySessionHandle, "V124_AUTHORITY_SESSION_HANDLE_INVALID");
    if (audience !== app) fail("V124_AUTHORITY_SESSION_AUDIENCE_INVALID");
    const decisionKai = receizKaiNow();
    pruneExpiredChallengeAttempts(decisionKai.pulse);
    const rails = normalizeRails(record.requestedRails, "V124_AUTHORITY_SESSION_RAIL_INVALID");
    const namespaces = normalizeNamespaces(record.requiredNamespaces, "V124_AUTHORITY_SESSION_NAMESPACE_INVALID");
    if (!hasPersistedSession && !heldSessions.has(sessionHandle)) {
      const candidate = record.signedChallenge;
      const nonce = candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? (candidate as { nonce?: unknown }).nonce
        : null;
      let retained = false;
      if (typeof nonce === "string") {
        const coordinateDigest = await digestReceizCanonicalV122({
          schema: "receiz.authority-session-challenge-coordinate.v124",
          applicationId: app,
          nonce,
        });
        retained = challengeAttempts.get(coordinateDigest)?.operation === "refresh";
      }
      if (!retained) fail("V124_AUTHORITY_SESSION_NOT_HELD");
    }
    const bytes = await artifactBytes(
      record.proofArtifact as Blob | ArrayBuffer | Uint8Array | string,
    );
    const challenge = await validateSignedChallenge(
      record.signedChallenge,
      app,
      decisionKai.pulse,
      { bytes },
    );
    let persistedSessionInput: unknown = null;
    if (hasPersistedSession) {
      try {
        persistedSessionInput = structuredClone(record.persistedSession);
      } catch {
        fail("V124_AUTHORITY_SESSION_PERSISTED_INVALID");
      }
    }
    const artifact = freeze({
      exactBytesB64u: receizBase64UrlEncode(bytes),
      digest: challenge.artifactDigest,
    });
    const attemptInput = freeze({
      applicationId: app,
      authoritySessionHandle: sessionHandle,
      artifact,
      signedChallenge: challenge.challenge,
      requestedRails: rails,
      requiredNamespaces: namespaces,
      audience,
      persistedSession: persistedSessionInput,
    });
    const attemptCoordinates = await challengeAttemptCoordinates(
      app,
      challenge.nonce,
      "refresh",
      attemptInput,
    );
    const existingAttempt = inspectChallengeAttempt(attemptCoordinates, "refresh");
    if (existingAttempt && existingAttempt.operation !== "refresh") {
      fail("V124_AUTHORITY_SESSION_CHALLENGE_REPLAYED");
    }
    let held: HeldSession;
    let body: Readonly<Record<string, unknown>>;
    if (existingAttempt) {
      held = existingAttempt.prior;
      body = existingAttempt.body;
    } else {
      const cached = heldSessions.get(sessionHandle);
      if (!hasPersistedSession && !cached) fail("V124_AUTHORITY_SESSION_NOT_HELD");
      if (hasPersistedSession) {
        const session = await inspectPersistedSession(persistedSessionInput, {
          applicationId: app,
          audience,
          handle: sessionHandle,
          namespaces,
          decisionKaiUPulse: decisionKai.uPulse,
        });
        held = freeze({
          session,
          artifactDigest: challenge.artifactDigest,
          verificationKey: challenge.verificationKey,
        });
      } else {
        if (!cached) fail("V124_AUTHORITY_SESSION_NOT_HELD");
        held = cached;
        if (held.session.issuedAtKaiUPulse > decisionKai.uPulse
          || held.session.expiresAtKaiUPulse <= decisionKai.uPulse) {
          heldSessions.delete(sessionHandle);
          fail("V124_AUTHORITY_SESSION_EXPIRED");
        }
      }
      const expectedPriorSession = freeze({
        actorSubjectId: held.session.actorSubjectId,
        subjectSourceArtifactSha256: held.session.subjectSourceArtifactSha256,
        identityArtifactSha256: held.session.identityArtifactSha256,
        identityKeyId: held.session.identityKeyId,
        grantedScopes: held.session.grantedScopes,
        grantedRails: held.session.grantedRails,
        namespaces: held.session.namespaces,
        revocationHead: held.session.revocationHead,
        issuedAtKaiUPulse: held.session.issuedAtKaiUPulse,
        expiresAtKaiUPulse: held.session.expiresAtKaiUPulse,
        sessionBindingDigest: held.session.sessionBindingDigest,
      });
      body = freeze({
        applicationId: app,
        authoritySessionHandle: sessionHandle,
        artifact,
        signedChallenge: challenge.challenge,
        requestedRails: rails,
        requiredNamespaces: namespaces,
        audience,
        expectedPriorSession,
      });
      const retainedAttempt = reserveChallengeAttempt(attemptCoordinates, freeze({
        operation: "refresh" as const,
        inputBindingDigest: attemptCoordinates.inputBindingDigest,
        expiresAtKai: challenge.challenge.expiresAtKai,
        body,
        prior: held,
      }));
      if (retainedAttempt.operation !== "refresh") fail("V124_AUTHORITY_SESSION_CHALLENGE_REPLAYED");
      held = retainedAttempt.prior;
      body = retainedAttempt.body;
    }
    if (held.session.applicationId !== app || held.session.audience !== audience) fail("V124_AUTHORITY_SESSION_RESPONSE_COORDINATE_MISMATCH");
    if (held.verificationKey.keyId !== challenge.verificationKey.keyId
      || held.artifactDigest !== challenge.artifactDigest
      || held.session.identityKeyId !== challenge.verificationKey.keyId
      || held.session.identityArtifactSha256 !== challenge.artifactDigest
      || !exactListEqual(held.session.grantedScopes, challenge.scopes)) fail("V124_AUTHORITY_SESSION_SCOPE_MISMATCH");
    if (!exactListEqual(held.session.grantedRails, rails) || !exactListEqual(held.session.namespaces.map(({ name }) => name), namespaces)) fail("V124_AUTHORITY_SESSION_NAMESPACE_MISMATCH");
    const wire = await authenticatedWire("/api/sdk/v1/runtime/authority-sessions/refresh", body, app, audience);
    const session = await resultOrFailure(wire, { operation: "refresh-authority-session", applicationId: app, authoritySessionHandle: sessionHandle }, () => validateSessionWire({
      wire,
      applicationId: app,
      audience,
      actorSubjectId: held.session.actorSubjectId,
      handle: sessionHandle,
      subjectSourceArtifactSha256: held.session.subjectSourceArtifactSha256,
      identityArtifactSha256: held.session.identityArtifactSha256,
      identityKeyId: held.session.identityKeyId,
      scopes: challenge.scopes,
      rails,
      namespaces,
      decisionKaiUPulse: decisionKai.uPulse,
    }));
    if (session.revocationHead !== held.session.revocationHead || !sameNamespaces(session.namespaces, held.session.namespaces)) fail("V124_AUTHORITY_SESSION_REFRESH_BINDING_MISMATCH");
    if (session.issuedAtKaiUPulse <= held.session.issuedAtKaiUPulse || session.expiresAtKaiUPulse <= held.session.expiresAtKaiUPulse
      || session.sessionBindingDigest === held.session.sessionBindingDigest) fail("V124_AUTHORITY_SESSION_REFRESH_TIME_NONADVANCING");
    const closedCoordinate = JSON.stringify([app, sessionHandle]);
    const current = heldSessions.get(sessionHandle);
    if (heldClosedSessions.has(closedCoordinate)
      || (current
        && current.session.sessionBindingDigest !== held.session.sessionBindingDigest
        && current.session.sessionBindingDigest !== session.sessionBindingDigest)) {
      fail("V124_AUTHORITY_SESSION_REFRESH_TIME_NONADVANCING");
    }
    heldSessions.set(sessionHandle, freeze({ session, artifactDigest: challenge.artifactDigest, verificationKey: challenge.verificationKey }));
    return session;
  };

  const closeAuthoritySessionV124 = async (input: ReceizCloseAuthoritySessionInputV124): Promise<ReceizAuthoritySessionClosedV124> => {
    const hasPersistedSession = input !== null && typeof input === "object"
      && Object.prototype.hasOwnProperty.call(input, "persistedSession");
    const record = closedRecord(input, hasPersistedSession
      ? ["applicationId", "authoritySessionHandle", "persistedSession"]
      : ["applicationId", "authoritySessionHandle"], "V124_AUTHORITY_SESSION_CLOSE_INPUT_INVALID");
    const validated = freeze({ applicationId: applicationId(record.applicationId, "V124_AUTHORITY_SESSION_APPLICATION_INVALID"), authoritySessionHandle: handle(record.authoritySessionHandle, "V124_AUTHORITY_SESSION_HANDLE_INVALID") });
    const persisted = hasPersistedSession
      ? freeze({ session: await inspectPersistedSession(record.persistedSession, {
          applicationId: validated.applicationId,
          audience: validated.applicationId,
          handle: validated.authoritySessionHandle,
        }) })
      : undefined;
    const closedCoordinate = JSON.stringify([validated.applicationId, validated.authoritySessionHandle]);
    const alreadyClosed = heldClosedSessions.get(closedCoordinate);
    if (alreadyClosed) return alreadyClosed;
    const cached = heldSessions.get(validated.authoritySessionHandle);
    const held: Readonly<{ session: ReceizAuthoritySessionV124 }> | undefined = persisted ?? cached;
    if (!held || held.session.applicationId !== validated.applicationId || held.session.audience !== validated.applicationId) fail("V124_AUTHORITY_SESSION_NOT_HELD");
    const body = freeze({
      ...validated,
      expectedPriorRevocationHead: held.session.revocationHead,
      expectedPriorSessionBindingDigest: held.session.sessionBindingDigest,
    });
    const makeRequest = () => authenticatedWire("/api/sdk/v1/runtime/authority-sessions/close", body, validated.applicationId, validated.applicationId);
    let wire: unknown;
    try { wire = await makeRequest(); } catch (error) {
      if (error instanceof TypeError && /V124_/.test(error.message)) throw error;
      wire = await makeRequest();
    }
    const closed = await resultOrFailure(wire, { operation: "close-authority-session", applicationId: validated.applicationId, authoritySessionHandle: validated.authoritySessionHandle }, () => validateClosedWire(wire, validated, held));
    heldSessions.delete(validated.authoritySessionHandle);
    heldClosedSessions.set(closedCoordinate, closed);
    return closed;
  };

  const qualifyV124 = async (input: ReceizOperationalQualificationInputV124): Promise<ReceizOperationalCapabilityReportV124> => {
    const record = closedRecord(input, ["applicationId", "operations"], "V124_QUALIFICATION_INPUT_INVALID");
    const app = applicationId(record.applicationId, "V124_QUALIFICATION_APPLICATION_INVALID"), operations = normalizeOperations(record.operations);
    const body = freeze({ applicationId: app, operations });
    const wire = await authenticatedWire("/api/sdk/v1/runtime/qualify", body, app, app);
    return resultOrFailure(wire, { operation: "qualify", applicationId: app, authoritySessionHandle: null }, () => validateQualification(wire, app, operations));
  };

  return freeze({
    openAuthoritySessionV124,
    refreshAuthoritySessionV124,
    closeAuthoritySessionV124,
    qualifyV124,
    openAuthoritySession: openAuthoritySessionV124,
    refreshAuthoritySession: refreshAuthoritySessionV124,
    closeAuthoritySession: closeAuthoritySessionV124,
    qualify: qualifyV124,
  });
}
