import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { digestReceizAuthority, encodeReceizAuthority } from "./authorityEncoding.js";
import { authorityFailure, type ReceizAuthorityFailure } from "./authorityResults.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
import type { ReceizCommitDomainId, ReceizPlanDigest } from "./artifactTransition.js";
import type {
  ReceizAcceptedHeadExpectation,
  ReceizApplicationOperationMatrixDigest,
  ReceizReconciliationAttemptId,
  ReceizReconciliationPlanDigest,
} from "./globalCoordinationTypes.js";
import { isSdkAdmittedReceizCapabilityIssuerKey, readReceizArtifactAdmissionPinnedRegistry } from "./artifactAdmission.js";
import type { ReceizCapabilityIssuerResolver } from "./artifactAdmissionTypes.js";
import {
  decryptReceizIdentityPrivateSigningKey,
  deriveReceizIdentityKeyIdFromPublicKeyRawB64u,
  receizBase64UrlEncode,
  type ReceizKeyFile,
} from "./identity.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import {
  verifyRuntimeDiscoveredReceizRegistryLaw,
  type ReceizRegistryDiscoveryResult,
} from "./registryDiscovery.js";

export type ReceizCapabilityPayload = Readonly<{
  schema: "receiz.capability.v112";
  capabilityId: string;
  issuerKeyId: string;
  actorId: string;
  tenantId: string | null;
  audience: string;
  authorityProfile: ReceizAuthorityProfile;
  operations: readonly string[];
  resourceScopes: readonly string[];
  maximumEffects: Readonly<Record<string, number>>;
  registryDigest: string;
  validFromKai: string;
  expiresAtKai: string;
  nonce: string;
  parentDigest: string | null;
  delegationDepth: number;
  maximumDelegationDepth: number;
  offline: boolean;
  operationConstraints: Readonly<{
    planDigest: ReceizPlanDigest;
    commitDomain: ReceizCommitDomainId;
  }>;
}>;

export type ReceizSignedCapability = Readonly<{
  schema: "receiz.signed-capability.v112";
  payload: ReceizCapabilityPayload;
  alg: "Ed25519" | "P-256";
  signatureB64u: string;
}>;

/**
 * V113 reconciliation authority is deliberately distinct from the frozen
 * v112 single-transition capability. It authorizes submission of one already
 * verified descendant to one named coordination domain; it does not authorize
 * any historical handoff carried by that descendant.
 */
export type ReceizReconciliationCapabilityPayload = Readonly<{
  schema: "receiz.capability.v113.reconciliation";
  capabilityId: string;
  issuerKeyId: string;
  actorId: string;
  tenantId: string;
  audience: string;
  authorityProfile: "global-shared";
  operations: readonly ["artifact.reconcile"];
  resourceScopes: readonly string[];
  maximumEffects: Readonly<{ acceptedHistoryAdditions: number }>;
  registryDigest: string;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  validFromKai: string;
  expiresAtKai: string;
  nonce: string;
  parentDigest: null;
  delegationDepth: 0;
  maximumDelegationDepth: 0;
  offline: false;
  operationConstraints: Readonly<{
    planDigest: ReceizReconciliationPlanDigest;
    commitDomain: ReceizCommitDomainId;
    expectedAcceptedHead: ReceizAcceptedHeadExpectation;
    artifactId: string;
    attemptId: ReceizReconciliationAttemptId;
  }>;
}>;

export type ReceizSignedReconciliationCapability = Readonly<{
  schema: "receiz.signed-capability.v113.reconciliation";
  payload: ReceizReconciliationCapabilityPayload;
  alg: "Ed25519" | "P-256";
  signatureB64u: string;
}>;

export type ReceizVerifiedReconciliationCapability = Readonly<{
  schema: "receiz.verified-capability.v113.reconciliation";
  payload: ReceizReconciliationCapabilityPayload;
  digest: string;
  verifier: "receiz.sdk.capability.v113.reconciliation";
  authority: Readonly<{
    capabilityIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizReconciliationCapabilityContext = Readonly<{
  actorId: string;
  tenantId: string;
  artifactId: string;
  registryDigest: string;
  operationMatrixDigest: ReceizApplicationOperationMatrixDigest;
  maximumEffects: Readonly<{ acceptedHistoryAdditions: number }>;
  operationConstraints: ReceizReconciliationCapabilityPayload["operationConstraints"];
}>;

export type ReceizVerifiedCapability = Readonly<{
  schema: "receiz.verified-capability.v112";
  payload: ReceizCapabilityPayload;
  digest: string;
  verifier: "receiz.sdk.capability.v112";
  authority: Readonly<{
    capabilityIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCapabilityContext = Readonly<{
  actorId: string;
  tenantId: string | null;
  authorityProfile: ReceizAuthorityProfile;
  operation: string;
  resourceId: string;
  registryDigest: string;
  maximumEffects: Readonly<Record<string, number>>;
  operationConstraints: Readonly<{
    planDigest: ReceizPlanDigest;
    commitDomain: ReceizCommitDomainId;
  }>;
}>;

export type ReceizCapabilityDenialCode =
  | "CAPABILITY_INVALID"
  | "CAPABILITY_ISSUER_UNKNOWN"
  | "CAPABILITY_SIGNATURE_INVALID"
  | "CAPABILITY_NOT_YET_VALID"
  | "CAPABILITY_EXPIRED"
  | "CAPABILITY_REVOKED"
  | "CAPABILITY_AUDIENCE_MISMATCH"
  | "CAPABILITY_CONTEXT_MISMATCH"
  | "CAPABILITY_ATTENUATION_VIOLATION";

const verifiedCapabilities = new WeakSet<object>();
const verifiedReconciliationCapabilities = new WeakSet<object>();
const profiles = new Set<ReceizAuthorityProfile>(["artifact-local", "global-shared", "projection-only", "simulation-only"]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreezeCapability<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreezeCapability(nested);
    Object.freeze(value);
  }
  return value;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function kai(value: string): bigint | null {
  return /^(0|[1-9][0-9]*)$/.test(value) ? BigInt(value) : null;
}

function base64urlBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function validDigest(value: unknown, binds: string): value is ReceizPlanDigest {
  return record(value)
    && Object.keys(value).sort().join(",") === "algorithm,binds,value"
    && value.algorithm === "sha-256"
    && value.binds === binds
    && typeof value.value === "string"
    && /^[0-9a-f]{64}$/.test(value.value);
}

function validCommitDomain(value: unknown): value is ReceizCommitDomainId {
  return record(value)
    && Object.keys(value).sort().join(",") === "scheme,value"
    && value.scheme === "receiz-commit-domain.v1"
    && nonempty(value.value)
    && value.value === value.value.normalize("NFC")
    && !/[\u0000-\u001f\u007f]/u.test(value.value);
}

function validOperationConstraints(value: unknown): value is ReceizCapabilityPayload["operationConstraints"] {
  return record(value)
    && Object.keys(value).sort().join(",") === "commitDomain,planDigest"
    && validDigest(value.planDigest, "artifact-append-plan")
    && validCommitDomain(value.commitDomain);
}

function validPayload(value: unknown): value is ReceizCapabilityPayload {
  if (!record(value) || value.schema !== "receiz.capability.v112") return false;
  const keys = new Set([
    "schema", "capabilityId", "issuerKeyId", "actorId", "tenantId", "audience", "authorityProfile",
    "operations", "resourceScopes", "maximumEffects", "registryDigest", "validFromKai", "expiresAtKai",
    "nonce", "parentDigest", "delegationDepth", "maximumDelegationDepth", "offline", "operationConstraints",
  ]);
  if (Object.keys(value).some((key) => !keys.has(key))) return false;
  if (![value.capabilityId, value.issuerKeyId, value.actorId, value.audience, value.registryDigest, value.nonce].every(nonempty)) return false;
  if (value.tenantId !== null && !nonempty(value.tenantId)) return false;
  if (!profiles.has(value.authorityProfile as ReceizAuthorityProfile)) return false;
  if (!Array.isArray(value.operations) || value.operations.length === 0 || value.operations.some((item) => !nonempty(item))) return false;
  if (!Array.isArray(value.resourceScopes) || value.resourceScopes.length === 0 || value.resourceScopes.some((item) => !nonempty(item))) return false;
  if (!record(value.maximumEffects) || Object.values(value.maximumEffects).some((amount) => typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) return false;
  if (!nonempty(value.validFromKai) || !nonempty(value.expiresAtKai) || kai(value.validFromKai) === null || kai(value.expiresAtKai) === null) return false;
  if (value.parentDigest !== null && !nonempty(value.parentDigest)) return false;
  if (!Number.isInteger(value.delegationDepth) || Number(value.delegationDepth) < 0 || !Number.isInteger(value.maximumDelegationDepth) || Number(value.maximumDelegationDepth) < 0) return false;
  if (typeof value.offline !== "boolean") return false;
  if (!validOperationConstraints(value.operationConstraints)) return false;
  try { canonicalizeReceizConstitution(value as unknown as ReceizConstitutionJson); } catch { return false; }
  return true;
}

function validSignedCapability(value: unknown): value is ReceizSignedCapability {
  return record(value)
    && Object.keys(value).sort().join(",") === "alg,payload,schema,signatureB64u"
    && value.schema === "receiz.signed-capability.v112"
    && (value.alg === "Ed25519" || value.alg === "P-256")
    && nonempty(value.signatureB64u)
    && validPayload(value.payload);
}

function validSignedReconciliationCapability(value: unknown): value is ReceizSignedReconciliationCapability {
  return record(value)
    && Object.keys(value).sort().join(",") === "alg,payload,schema,signatureB64u"
    && value.schema === "receiz.signed-capability.v113.reconciliation"
    && (value.alg === "Ed25519" || value.alg === "P-256")
    && nonempty(value.signatureB64u)
    && validReconciliationPayload(value.payload);
}

function validExpectedAcceptedHead(value: unknown): value is ReceizAcceptedHeadExpectation {
  return record(value)
    && (value.status === "unaccepted"
      ? Object.keys(value).length === 1
      : value.status === "accepted"
        && Object.keys(value).sort().join(",") === "head,status"
        && validDigest(value.head, "verified-proof-history"));
}

function validReconciliationPayload(value: unknown): value is ReceizReconciliationCapabilityPayload {
  if (!record(value) || value.schema !== "receiz.capability.v113.reconciliation") return false;
  const keys = [
    "schema", "capabilityId", "issuerKeyId", "actorId", "tenantId", "audience", "authorityProfile",
    "operations", "resourceScopes", "maximumEffects", "registryDigest", "operationMatrixDigest",
    "validFromKai", "expiresAtKai", "nonce", "parentDigest", "delegationDepth",
    "maximumDelegationDepth", "offline", "operationConstraints",
  ];
  if (Object.keys(value).sort().join(",") !== keys.sort().join(",")) return false;
  if (![value.capabilityId, value.issuerKeyId, value.actorId, value.tenantId, value.audience, value.registryDigest, value.nonce].every(nonempty)) return false;
  if (value.authorityProfile !== "global-shared"
    || !Array.isArray(value.operations) || value.operations.length !== 1 || value.operations[0] !== "artifact.reconcile"
    || !Array.isArray(value.resourceScopes) || value.resourceScopes.length !== 1 || !nonempty(value.resourceScopes[0])
    || !record(value.maximumEffects) || Object.keys(value.maximumEffects).join(",") !== "acceptedHistoryAdditions"
    || !Number.isSafeInteger(value.maximumEffects.acceptedHistoryAdditions) || Number(value.maximumEffects.acceptedHistoryAdditions) < 0
    || !validDigest(value.operationMatrixDigest, "application-operation-matrix")
    || kai(String(value.validFromKai)) === null || kai(String(value.expiresAtKai)) === null
    || value.parentDigest !== null || value.delegationDepth !== 0 || value.maximumDelegationDepth !== 0
    || value.offline !== false || !record(value.operationConstraints)) return false;
  const constraints = value.operationConstraints;
  return Object.keys(constraints).sort().join(",") === "artifactId,attemptId,commitDomain,expectedAcceptedHead,planDigest"
    && validDigest(constraints.planDigest, "offline-reconciliation-plan")
    && validCommitDomain(constraints.commitDomain)
    && validExpectedAcceptedHead(constraints.expectedAcceptedHead)
    && nonempty(constraints.artifactId)
    && record(constraints.attemptId)
    && Object.keys(constraints.attemptId).sort().join(",") === "scheme,value"
    && constraints.attemptId.scheme === "receiz-reconciliation-attempt.v1"
    && nonempty(constraints.attemptId.value);
}

function isSubset(child: readonly string[], parent: readonly string[]): boolean {
  const allowed = new Set(parent);
  return child.every((item) => allowed.has(item));
}

function effectsWithin(child: Readonly<Record<string, number>>, parent: Readonly<Record<string, number>>): boolean {
  return Object.entries(child).every(([effect, amount]) => amount <= (parent[effect] ?? -1));
}

function attenuates(child: ReceizCapabilityPayload, parent: ReceizVerifiedCapability): boolean {
  const basis = parent.payload;
  return child.parentDigest === parent.digest
    && child.actorId === basis.actorId
    && child.tenantId === basis.tenantId
    && child.audience === basis.audience
    && child.authorityProfile === basis.authorityProfile
    && child.registryDigest === basis.registryDigest
    && child.offline === basis.offline
    && child.operationConstraints.planDigest.algorithm === basis.operationConstraints.planDigest.algorithm
    && child.operationConstraints.planDigest.binds === basis.operationConstraints.planDigest.binds
    && child.operationConstraints.planDigest.value === basis.operationConstraints.planDigest.value
    && child.operationConstraints.commitDomain.scheme === basis.operationConstraints.commitDomain.scheme
    && child.operationConstraints.commitDomain.value === basis.operationConstraints.commitDomain.value
    && isSubset(child.operations, basis.operations)
    && isSubset(child.resourceScopes, basis.resourceScopes)
    && effectsWithin(child.maximumEffects, basis.maximumEffects)
    && BigInt(child.validFromKai) >= BigInt(basis.validFromKai)
    && BigInt(child.expiresAtKai) <= BigInt(basis.expiresAtKai)
    && child.delegationDepth === basis.delegationDepth + 1
    && child.maximumDelegationDepth <= basis.maximumDelegationDepth
    && child.delegationDepth <= basis.maximumDelegationDepth;
}

export function capabilitySigningBytes(payload: ReceizCapabilityPayload): Uint8Array {
  if (!validPayload(payload)) throw new Error("capability_invalid");
  return encodeReceizAuthority("capability", "receiz.capability-signature.v112", payload);
}

export function reconciliationCapabilitySigningBytes(payload: unknown): Uint8Array {
  if (!validReconciliationPayload(payload)) throw new Error("capability_invalid");
  return encodeReceizAuthority(
    "capability",
    "receiz.capability-signature.v113.reconciliation",
    payload,
  );
}

export function signReceizCapability(input: Readonly<{
  keyFile: ReceizKeyFile;
  passphrase?: string;
  payload: ReceizCapabilityPayload;
}>): Promise<ReceizSignedCapability>;
export function signReceizCapability(input: Readonly<{
  keyFile: ReceizKeyFile;
  passphrase?: string;
  payload: ReceizReconciliationCapabilityPayload;
}>): Promise<ReceizSignedReconciliationCapability>;
export async function signReceizCapability(input: Readonly<{
  keyFile: ReceizKeyFile;
  passphrase?: string;
  payload: ReceizCapabilityPayload | ReceizReconciliationCapabilityPayload;
}>): Promise<ReceizSignedCapability | ReceizSignedReconciliationCapability> {
  const reconciliation = input.payload.schema === "receiz.capability.v113.reconciliation";
  const signingBytes = reconciliation
    ? reconciliationCapabilitySigningBytes(input.payload)
    : capabilitySigningBytes(input.payload);
  let derivedKeyId: string;
  try {
    derivedKeyId = await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
      input.keyFile.crypto.publicKeyRawB64u,
      input.keyFile.alg,
    );
  } catch {
    throw new Error("receiz_key_invalid");
  }
  if (derivedKeyId !== input.keyFile.keyId || input.payload.issuerKeyId !== input.keyFile.keyId) {
    throw new Error("capability_issuer_key_mismatch");
  }
  const privateKey = await decryptReceizIdentityPrivateSigningKey({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
  });
  const signAlgorithm = input.keyFile.alg === "Ed25519"
    ? "Ed25519"
    : { name: "ECDSA", hash: "SHA-256" } as const;
  const signature = new Uint8Array(await crypto.subtle.sign(
    signAlgorithm,
    privateKey,
    strictArrayBuffer(signingBytes),
  ));
  if (signature.byteLength !== 64) throw new Error("capability_signature_invalid");
  const signatureB64u = receizBase64UrlEncode(signature);
  if (reconciliation) {
    return Object.freeze({
      schema: "receiz.signed-capability.v113.reconciliation",
      payload: structuredClone(input.payload as ReceizReconciliationCapabilityPayload),
      alg: input.keyFile.alg,
      signatureB64u,
    });
  }
  return Object.freeze({
    schema: "receiz.signed-capability.v112",
    payload: structuredClone(input.payload as ReceizCapabilityPayload),
    alg: input.keyFile.alg,
    signatureB64u,
  });
}

export function isReceizVerifiedCapability(value: unknown): value is ReceizVerifiedCapability {
  return record(value) && verifiedCapabilities.has(value);
}

export function isReceizVerifiedReconciliationCapability(
  value: unknown,
): value is ReceizVerifiedReconciliationCapability {
  return record(value) && verifiedReconciliationCapabilities.has(value);
}

export function createReceizReconciliationCapabilityVerifier(options: Readonly<{
  resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
  currentKai: string;
  audience: string;
  revokedCapabilityDigests: ReadonlySet<string>;
}>) {
  return async function verify(value: unknown, context: ReceizReconciliationCapabilityContext): Promise<
    | Readonly<{ ok: true; capability: ReceizVerifiedReconciliationCapability }>
    | ReceizAuthorityFailure
  > {
    if (!validSignedReconciliationCapability(value) || kai(options.currentKai) === null) {
      return authorityFailure("CAPABILITY_INVALID");
    }
    // Retain the exact signed input before any resolver or crypto await.
    const signed = deepFreezeCapability(structuredClone(value));
    const payload = signed.payload;
    if (payload.audience !== options.audience
      || payload.actorId !== context.actorId
      || payload.tenantId !== context.tenantId
      || payload.registryDigest !== context.registryDigest
      || payload.operationMatrixDigest.value !== context.operationMatrixDigest.value
      || payload.resourceScopes.length !== 1 || payload.resourceScopes[0] !== context.artifactId
      || payload.maximumEffects.acceptedHistoryAdditions !== context.maximumEffects.acceptedHistoryAdditions
      || canonicalizeReceizConstitution(payload.operationConstraints as unknown as ReceizConstitutionJson)
        !== canonicalizeReceizConstitution(context.operationConstraints as unknown as ReceizConstitutionJson)) {
      return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    }
    const issuer = await options.resolveAdmittedIssuer(payload.issuerKeyId);
    if (!issuer || !isSdkAdmittedReceizCapabilityIssuerKey(issuer)) return authorityFailure("CAPABILITY_ISSUER_UNKNOWN");
    if (issuer.revoked) return authorityFailure("CAPABILITY_REVOKED");
    if (issuer.keyId !== payload.issuerKeyId
      || issuer.actorId !== payload.actorId
      || issuer.registryDigest.value !== payload.registryDigest
      || issuer.alg !== signed.alg) {
      return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    }
    const publicKeyRaw = base64urlBytes(issuer.publicKeyRawB64u);
    const signature = base64urlBytes(signed.signatureB64u);
    if (!publicKeyRaw || !signature || signature.byteLength !== 64) return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    let signatureValid = false;
    try {
      const importAlgorithm = issuer.alg === "Ed25519"
        ? { name: "Ed25519" } as const
        : { name: "ECDSA", namedCurve: "P-256" } as const;
      const verifyAlgorithm = issuer.alg === "Ed25519"
        ? "Ed25519"
        : { name: "ECDSA", hash: "SHA-256" } as const;
      const publicKey = await crypto.subtle.importKey(
        "raw", strictArrayBuffer(publicKeyRaw), importAlgorithm, false, ["verify"],
      );
      signatureValid = await crypto.subtle.verify(
        verifyAlgorithm,
        publicKey,
        strictArrayBuffer(signature),
        strictArrayBuffer(reconciliationCapabilitySigningBytes(payload)),
      );
    } catch { signatureValid = false; }
    if (!signatureValid) return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    const capabilityDigest = await digestReceizAuthority(
      "capability", "receiz.capability.v113.reconciliation", payload,
    );
    if (options.revokedCapabilityDigests.has(capabilityDigest)) return authorityFailure("CAPABILITY_REVOKED");
    if (BigInt(options.currentKai) < BigInt(payload.validFromKai)) return authorityFailure("CAPABILITY_NOT_YET_VALID");
    if (BigInt(options.currentKai) > BigInt(payload.expiresAtKai)) return authorityFailure("CAPABILITY_EXPIRED");
    const custodiedPayload = deepFreezeCapability(structuredClone(payload));
    const capability: ReceizVerifiedReconciliationCapability = freezeReconciliationCapability({
      schema: "receiz.verified-capability.v113.reconciliation",
      payload: custodiedPayload,
      digest: capabilityDigest,
      verifier: "receiz.sdk.capability.v113.reconciliation",
      authority: { capabilityIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
    });
    verifiedReconciliationCapabilities.add(capability);
    return { ok: true, capability };
  };
}

function freezeReconciliationCapability<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

type ReceizCapabilityVerifierOptions = {
  resolveAdmittedIssuer: ReceizCapabilityIssuerResolver;
  currentKai: string;
  audience: string;
  revokedCapabilityDigests: ReadonlySet<string>;
  verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
  parent?: ReceizVerifiedCapability;
};

export function createReceizCapabilityVerifier(options: ReceizCapabilityVerifierOptions) {
  const expectedRegistryDigest = options.verifiedRegistryDiscovery
    ? verifyRuntimeDiscoveredReceizRegistryLaw(options.verifiedRegistryDiscovery).trustEvidence.currentRegistryDigest.value
    : RECEIZ_CURRENT_REGISTRY_DIGEST;
  return createReceizCapabilityVerifierInternal(options, expectedRegistryDigest);
}

/** Package-internal: exact verified source law context, with all capability equality and signature checks retained. */
export async function createReceizCapabilityVerifierWithSourceContext(
  sourceAdmission: unknown, options: Omit<ReceizCapabilityVerifierOptions, "verifiedRegistryDiscovery">,
) {
  if (Object.hasOwn(options, "verifiedRegistryDiscovery")) throw new TypeError("CAPABILITY_SOURCE_REGISTRY_CONTEXT_MISMATCH");
  const registry = await readReceizArtifactAdmissionPinnedRegistry(sourceAdmission);
  return createReceizCapabilityVerifierInternal(options, await digestReceizConstitution(registry));
}

function createReceizCapabilityVerifierInternal(options: ReceizCapabilityVerifierOptions, expectedRegistryDigest: string) {
  return async function verify(value: unknown, context: ReceizCapabilityContext): Promise<
    | Readonly<{ ok: true; capability: ReceizVerifiedCapability }>
    | ReceizAuthorityFailure
  > {
    if (!validSignedCapability(value) || kai(options.currentKai) === null) return authorityFailure("CAPABILITY_INVALID");
    // Verification and issued custody must share one immutable signed snapshot.
    const signed = deepFreezeCapability(structuredClone(value));
    if (!record(context) || !validOperationConstraints(context.operationConstraints)) {
      return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    }
    if (signed.payload.registryDigest !== expectedRegistryDigest
      || context.registryDigest !== expectedRegistryDigest) return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    const issuer = await options.resolveAdmittedIssuer(signed.payload.issuerKeyId);
    if (!issuer || !isSdkAdmittedReceizCapabilityIssuerKey(issuer)) {
      return authorityFailure("CAPABILITY_ISSUER_UNKNOWN");
    }
    if (issuer.revoked) return authorityFailure("CAPABILITY_REVOKED");
    if (issuer.keyId !== signed.payload.issuerKeyId || issuer.alg !== signed.alg) {
      return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    }
    if (issuer.actorId !== signed.payload.actorId
      || issuer.registryDigest.value !== signed.payload.registryDigest
      || issuer.registryDigest.value !== expectedRegistryDigest
      || issuer.registryDigest.value !== context.registryDigest) {
      return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    }
    const publicKeyRaw = base64urlBytes(issuer.publicKeyRawB64u);
    const signature = base64urlBytes(signed.signatureB64u);
    if (!publicKeyRaw || !signature) return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    if ((issuer.alg === "P-256" && publicKeyRaw.byteLength !== 65)
      || (issuer.alg === "Ed25519" && publicKeyRaw.byteLength !== 32)
      || signature.byteLength !== 64) {
      return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    }
    let signatureValid = false;
    try {
      const algorithm = issuer.alg === "Ed25519"
        ? { name: "Ed25519" } as const
        : { name: "ECDSA", namedCurve: "P-256" } as const;
      const verifyAlgorithm = issuer.alg === "Ed25519"
        ? "Ed25519"
        : { name: "ECDSA", hash: "SHA-256" } as const;
      const publicKey = await crypto.subtle.importKey(
        "raw",
        strictArrayBuffer(publicKeyRaw),
        algorithm,
        false,
        ["verify"],
      );
      signatureValid = await crypto.subtle.verify(
        verifyAlgorithm,
        publicKey,
        strictArrayBuffer(signature),
        strictArrayBuffer(capabilitySigningBytes(signed.payload)),
      );
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) return authorityFailure("CAPABILITY_SIGNATURE_INVALID");
    const digest = await digestReceizAuthority("capability", "receiz.capability.v112", signed.payload);
    if (options.revokedCapabilityDigests.has(digest)) return authorityFailure("CAPABILITY_REVOKED");
    if (BigInt(options.currentKai) < BigInt(signed.payload.validFromKai)) return authorityFailure("CAPABILITY_NOT_YET_VALID");
    if (BigInt(options.currentKai) > BigInt(signed.payload.expiresAtKai)) return authorityFailure("CAPABILITY_EXPIRED");
    if (signed.payload.audience !== options.audience) return authorityFailure("CAPABILITY_AUDIENCE_MISMATCH");
    if (signed.payload.actorId !== context.actorId
      || signed.payload.tenantId !== context.tenantId
      || signed.payload.authorityProfile !== context.authorityProfile
      || signed.payload.registryDigest !== context.registryDigest
      || !signed.payload.operations.includes(context.operation)
      || !signed.payload.resourceScopes.includes(context.resourceId)
      || signed.payload.operationConstraints.planDigest.algorithm !== context.operationConstraints.planDigest.algorithm
      || signed.payload.operationConstraints.planDigest.binds !== context.operationConstraints.planDigest.binds
      || signed.payload.operationConstraints.planDigest.value !== context.operationConstraints.planDigest.value
      || signed.payload.operationConstraints.commitDomain.scheme !== context.operationConstraints.commitDomain.scheme
      || signed.payload.operationConstraints.commitDomain.value !== context.operationConstraints.commitDomain.value
      || !effectsWithin(context.maximumEffects, signed.payload.maximumEffects)) return authorityFailure("CAPABILITY_CONTEXT_MISMATCH");
    if (signed.payload.parentDigest !== null) {
      if (!options.parent || !isReceizVerifiedCapability(options.parent) || !attenuates(signed.payload, options.parent)) return authorityFailure("CAPABILITY_ATTENUATION_VIOLATION");
    } else if (signed.payload.delegationDepth !== 0) {
      return authorityFailure("CAPABILITY_ATTENUATION_VIOLATION");
    }
    const capability: ReceizVerifiedCapability = deepFreezeCapability({
      schema: "receiz.verified-capability.v112",
      payload: signed.payload,
      digest,
      verifier: "receiz.sdk.capability.v112",
      authority: { capabilityIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
    });
    verifiedCapabilities.add(capability);
    return { ok: true, capability };
  };
}
