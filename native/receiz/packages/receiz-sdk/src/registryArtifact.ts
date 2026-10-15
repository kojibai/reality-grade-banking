import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  type ReceizConstitutionJson,
  type ReceizConstitutionRegistry,
} from "./constitution.js";

export type ReceizRegistryArtifactBasis = Readonly<{
  schema: "receiz.constitution.registry-artifact.v1";
  registry: ReceizConstitutionRegistry;
  payloadDigest: string;
  issuerKeyId: string;
  keyPurpose: "receiz.constitution.registry";
  alg: "Ed25519";
  effectiveKai: string;
  status: "current" | "historical" | "revoked";
  enclosingProof: Readonly<{ artifactId: string; sealDigest: string }>;
}>;

export type ReceizRegistryArtifact = ReceizRegistryArtifactBasis & Readonly<{ signatureB64u: string }>;

export type ReceizRegistryTrustKey = Readonly<{
  keyId: string;
  alg: "Ed25519";
  publicKeyRawB64u: string;
  purposes: readonly "receiz.constitution.registry"[];
  validFromKai: string;
  expiresAtKai: string | null;
  revokedAtKai: string | null;
  governanceStatus?: "active" | "retired";
  governanceCustodyClass?: string;
  trustSource?: "receiz-governance-keyring-v1" | "receiz-testing-fixture";
}>;

export type ReceizPublishedGovernanceKeyring = Readonly<{
  schema: "receiz-governance-keyring-v1";
  generatedAt: string;
  keys: readonly Readonly<{
    kid: string;
    alg: "Ed25519";
    status: "active" | "retired";
    activatedAt: string;
    retiredAt: string | null;
    custodyClass: string;
    publicKeySpkiPem: string;
  }>[];
}>;

export type ReceizVerifiedRegistryArtifact = ReceizRegistryArtifact & Readonly<{
  verifier: "receiz.sdk.registry-artifact.v1";
  historical: boolean;
  authority: Readonly<{ registryArtifactIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizReleaseAuthorityBoundary = Readonly<{
  schema: "receiz.release-authority-boundary.v119" | "receiz.release-authority-boundary.v120" | "receiz.release-authority-boundary.v121" | "receiz.release-authority-boundary.v122" | "receiz.release-authority-boundary.v123" | "receiz.release-authority-boundary.v124" | "receiz.release-authority-boundary.v125";
  predecessorDigest: string;
  compatibleSdkRange: ">=119.0.0 <120.0.0" | ">=120.0.0 <121.0.0" | ">=121.0.0 <122.0.0" | ">=122.0.0 <123.0.0" | ">=123.0.0 <124.0.0" | ">=124.0.0 <125.0.0" | ">=125.0.0 <126.0.0";
  authority: Readonly<{
    enclosingArtifact: "strongest";
    projectionIsAuthority: false;
    knownTruthPaintsBeforeDiscovery: true;
    kaiSelectsCausalHead: true;
    merkleCommitsExactAppends: true;
    fibonacciProvidesSparseAncestry: true;
    subjectIdentitySurvivesOwnership?: true;
    modelOutputRequiresCommandAdmission?: true;
    multiSubjectEffectsAreAtomic?: true;
    unknownNamespacesAreByteExact?: true;
    serverAndDatabaseAreNonAuthoritativeAcceleration?: true;
    settledSurfaceNeverWaitsForProjection?: true;
    verifiedHydrationBecomesDurableColdTruth?: true;
    authenticatedResponsesBindRequestsAndExactHeads?: true;
    institutionsAreAutomaticProofAuthority?: false;
    actionLawMustBeCurrentRegistryBound?: true;
    lawfulActionValueHeadsRequireEnclosingProof?: true;
    developersMayDeclarePhiAmount?: false;
    oneArtifactOneSpendableSettlementMembership?: true;
    activationMintsValue?: false;
    reserveIsLegacyRail?: true;
    settlementIsProofNativeSpendableValue?: true;
  }>;
}>;

export type ReceizRegistryArtifactDenial =
  | "REGISTRY_ARTIFACT_INVALID"
  | "REGISTRY_ENCLOSING_PROOF_INVALID"
  | "REGISTRY_DIGEST_MISMATCH"
  | "REGISTRY_KEY_UNKNOWN"
  | "REGISTRY_KEY_PURPOSE_INVALID"
  | "REGISTRY_KEY_NOT_YET_VALID"
  | "REGISTRY_KEY_EXPIRED"
  | "REGISTRY_KEY_REVOKED"
  | "REGISTRY_STATUS_INVALID"
  | "REGISTRY_SIGNATURE_INVALID";

const verifiedArtifacts = new WeakSet<object>();
const DIGEST = /^[a-f0-9]{64}$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const DOMAIN = "receiz.constitution.registry-artifact.signature.v1\n";

export function createReceizV119ReleaseAuthorityBoundary(
  predecessorDigest: string,
): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V119_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v119",
    predecessorDigest,
    compatibleSdkRange: ">=119.0.0 <120.0.0",
    authority: {
      enclosingArtifact: "strongest",
      projectionIsAuthority: false,
      knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true,
      merkleCommitsExactAppends: true,
      fibonacciProvidesSparseAncestry: true,
    },
  });
}

export function createReceizV120ReleaseAuthorityBoundary(
  predecessorDigest: string,
): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V120_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v120",
    predecessorDigest,
    compatibleSdkRange: ">=120.0.0 <121.0.0",
    authority: {
      enclosingArtifact: "strongest",
      projectionIsAuthority: false,
      knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true,
      merkleCommitsExactAppends: true,
      fibonacciProvidesSparseAncestry: true,
      subjectIdentitySurvivesOwnership: true,
      modelOutputRequiresCommandAdmission: true,
      multiSubjectEffectsAreAtomic: true,
      unknownNamespacesAreByteExact: true,
    },
  });
}

export function createReceizV121ReleaseAuthorityBoundary(
  predecessorDigest: string,
): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V121_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v121",
    predecessorDigest,
    compatibleSdkRange: ">=121.0.0 <122.0.0",
    authority: {
      enclosingArtifact: "strongest",
      projectionIsAuthority: false,
      knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true,
      merkleCommitsExactAppends: true,
      fibonacciProvidesSparseAncestry: true,
      subjectIdentitySurvivesOwnership: true,
      modelOutputRequiresCommandAdmission: true,
      multiSubjectEffectsAreAtomic: true,
      unknownNamespacesAreByteExact: true,
      serverAndDatabaseAreNonAuthoritativeAcceleration: true,
      settledSurfaceNeverWaitsForProjection: true,
      verifiedHydrationBecomesDurableColdTruth: true,
    },
  });
}

export function createReceizV122ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V122_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v122", predecessorDigest, compatibleSdkRange: ">=122.0.0 <123.0.0",
    authority: { enclosingArtifact: "strongest", projectionIsAuthority: false, knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true, merkleCommitsExactAppends: true, fibonacciProvidesSparseAncestry: true,
      subjectIdentitySurvivesOwnership: true, modelOutputRequiresCommandAdmission: true, multiSubjectEffectsAreAtomic: true,
      unknownNamespacesAreByteExact: true, serverAndDatabaseAreNonAuthoritativeAcceleration: true,
      settledSurfaceNeverWaitsForProjection: true, verifiedHydrationBecomesDurableColdTruth: true },
  });
}

export function createReceizV123ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V123_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v123", predecessorDigest, compatibleSdkRange: ">=123.0.0 <124.0.0",
    authority: { enclosingArtifact: "strongest", projectionIsAuthority: false, knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true, merkleCommitsExactAppends: true, fibonacciProvidesSparseAncestry: true,
      subjectIdentitySurvivesOwnership: true, modelOutputRequiresCommandAdmission: true, multiSubjectEffectsAreAtomic: true,
      unknownNamespacesAreByteExact: true, serverAndDatabaseAreNonAuthoritativeAcceleration: true,
      settledSurfaceNeverWaitsForProjection: true, verifiedHydrationBecomesDurableColdTruth: true },
  });
}

export function createReceizV125ReleaseAuthorityBoundary(predecessorDigest: string): ReceizReleaseAuthorityBoundary {
  if (!DIGEST.test(predecessorDigest)) throw new TypeError("V125_PREDECESSOR_REGISTRY_INVALID");
  return deepFreezeReleaseBoundary({
    schema: "receiz.release-authority-boundary.v125",
    predecessorDigest,
    compatibleSdkRange: ">=125.0.0 <126.0.0",
    authority: {
      enclosingArtifact: "strongest",
      projectionIsAuthority: false,
      knownTruthPaintsBeforeDiscovery: true,
      kaiSelectsCausalHead: true,
      merkleCommitsExactAppends: true,
      fibonacciProvidesSparseAncestry: true,
      subjectIdentitySurvivesOwnership: true,
      modelOutputRequiresCommandAdmission: true,
      multiSubjectEffectsAreAtomic: true,
      unknownNamespacesAreByteExact: true,
      serverAndDatabaseAreNonAuthoritativeAcceleration: true,
      settledSurfaceNeverWaitsForProjection: true,
      verifiedHydrationBecomesDurableColdTruth: true,
      authenticatedResponsesBindRequestsAndExactHeads: true,
      institutionsAreAutomaticProofAuthority: false,
      actionLawMustBeCurrentRegistryBound: true,
      lawfulActionValueHeadsRequireEnclosingProof: true,
      developersMayDeclarePhiAmount: false,
      oneArtifactOneSpendableSettlementMembership: true,
      activationMintsValue: false,
      reserveIsLegacyRail: true,
      settlementIsProofNativeSpendableValue: true,
    },
  });
}

function deepFreezeReleaseBoundary<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreezeReleaseBoundary(nested);
    Object.freeze(value);
  }
  return value;
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function strictBuffer(value: Uint8Array): ArrayBuffer { return value.slice().buffer; }
function decodeB64u(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch { return null; }
}

function governanceSpkiRawB64u(value: string): string | null {
  const body = value
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");
  try {
    const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
    const prefix = [0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00];
    if (bytes.length !== 44 || prefix.some((byte, index) => bytes[index] !== byte)) return null;
    return btoa(String.fromCharCode(...bytes.slice(12))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch { return null; }
}

export function parseReceizPublishedGovernanceRegistryTrustHistory(value: unknown): readonly ReceizRegistryTrustKey[] {
  if (!record(value) || value.schema !== "receiz-governance-keyring-v1" || !nonempty(value.generatedAt) || !Array.isArray(value.keys) || value.keys.length === 0) {
    throw new Error("REGISTRY_GOVERNANCE_KEYRING_INVALID");
  }
  const active = value.keys.filter((entry) => record(entry) && entry.status === "active");
  if (active.length !== 1) throw new Error("REGISTRY_GOVERNANCE_KEYRING_ACTIVE_KEY_INVALID");
  return value.keys.map((entry) => {
    if (!record(entry)
      || !nonempty(entry.kid)
      || entry.alg !== "Ed25519"
      || (entry.status !== "active" && entry.status !== "retired")
      || !nonempty(entry.activatedAt)
      || (entry.status === "active" ? entry.retiredAt !== null : !nonempty(entry.retiredAt))
      || !nonempty(entry.custodyClass)
      || !nonempty(entry.publicKeySpkiPem)) throw new Error("REGISTRY_GOVERNANCE_KEYRING_INVALID");
    if (entry.status === "active" && entry.custodyClass !== "managed-kms" && entry.custodyClass !== "managed-hsm") {
      throw new Error("REGISTRY_GOVERNANCE_KEYRING_ACTIVE_KEY_INVALID");
    }
    const publicKeyRawB64u = governanceSpkiRawB64u(entry.publicKeySpkiPem);
    if (!publicKeyRawB64u) throw new Error("REGISTRY_GOVERNANCE_KEYRING_INVALID");
    return {
      keyId: entry.kid,
      alg: "Ed25519",
      publicKeyRawB64u,
      purposes: ["receiz.constitution.registry"],
      validFromKai: "0",
      expiresAtKai: null,
      revokedAtKai: null,
      governanceStatus: entry.status,
      governanceCustodyClass: entry.custodyClass,
      trustSource: "receiz-governance-keyring-v1",
    } as const;
  });
}

function validBasis(value: unknown): value is ReceizRegistryArtifactBasis {
  if (!record(value) || value.schema !== "receiz.constitution.registry-artifact.v1") return false;
  const keys = ["schema", "registry", "payloadDigest", "issuerKeyId", "keyPurpose", "alg", "effectiveKai", "status", "enclosingProof"];
  return Object.keys(value).every((key) => keys.includes(key))
    && record(value.registry)
    && value.registry.schema === "receiz.constitution.registry.v1"
    && DIGEST.test(String(value.payloadDigest))
    && nonempty(value.issuerKeyId)
    && value.keyPurpose === "receiz.constitution.registry"
    && value.alg === "Ed25519"
    && KAI.test(String(value.effectiveKai))
    && ["current", "historical", "revoked"].includes(String(value.status))
    && record(value.enclosingProof)
    && nonempty(value.enclosingProof.artifactId)
    && DIGEST.test(String(value.enclosingProof.sealDigest));
}

function validArtifact(value: unknown): value is ReceizRegistryArtifact {
  if (!record(value) || !nonempty(value.signatureB64u)) return false;
  const signature = decodeB64u(value.signatureB64u);
  if (!signature || signature.length !== 64) return false;
  const { signatureB64u: _signature, ...basis } = value;
  void _signature;
  return Object.keys(value).every((key) => ["schema", "registry", "payloadDigest", "issuerKeyId", "keyPurpose", "alg", "effectiveKai", "status", "enclosingProof", "signatureB64u"].includes(key)) && validBasis(basis);
}

function validDigestArtifact(value: unknown): value is ReceizRegistryArtifact {
  return validArtifact(value);
}

export function registryArtifactSigningBytes(basis: ReceizRegistryArtifactBasis): Uint8Array {
  if (!validBasis(basis)) throw new Error("REGISTRY_ARTIFACT_INVALID");
  return new TextEncoder().encode(`${DOMAIN}${canonicalizeReceizConstitution(basis as unknown as ReceizConstitutionJson)}`);
}

export function isReceizVerifiedRegistryArtifact(value: unknown): value is ReceizVerifiedRegistryArtifact {
  return record(value) && verifiedArtifacts.has(value);
}

export async function verifyReceizRegistryArtifactPayloadDigest(value: unknown): Promise<
  | Readonly<{ ok: true; artifact: ReceizRegistryArtifact; payloadDigest: string }>
  | Readonly<{ ok: false; code: "REGISTRY_ARTIFACT_INVALID" | "REGISTRY_DIGEST_MISMATCH" }>
> {
  if (!validDigestArtifact(value)) return { ok: false, code: "REGISTRY_ARTIFACT_INVALID" };
  const payloadDigest = await digestReceizConstitution(value.registry);
  if (payloadDigest !== value.payloadDigest) return { ok: false, code: "REGISTRY_DIGEST_MISMATCH" };
  return { ok: true, artifact: value, payloadDigest };
}

export function createReceizRegistryArtifactVerifier(options: {
  currentKai: string;
  mode: "current-admission" | "historical-verification";
  trustHistory: readonly ReceizRegistryTrustKey[];
  expectedRegistryDigest: string;
  verifyEnclosingProof: (proof: ReceizRegistryArtifact["enclosingProof"]) => boolean | Promise<boolean>;
}) {
  return async function verify(value: unknown): Promise<
    | Readonly<{ ok: true; artifact: ReceizVerifiedRegistryArtifact }>
    | Readonly<{ ok: false; code: ReceizRegistryArtifactDenial }>
  > {
    if (!validArtifact(value) || !KAI.test(options.currentKai) || !DIGEST.test(options.expectedRegistryDigest)) return { ok: false, code: "REGISTRY_ARTIFACT_INVALID" };
    if (!await options.verifyEnclosingProof(value.enclosingProof)) return { ok: false, code: "REGISTRY_ENCLOSING_PROOF_INVALID" };
    const payload = await verifyReceizRegistryArtifactPayloadDigest(value);
    if (!payload.ok) return payload;
    if (payload.payloadDigest !== options.expectedRegistryDigest || value.registry.effectiveKai !== value.effectiveKai) return { ok: false, code: "REGISTRY_DIGEST_MISMATCH" };
    const key = options.trustHistory.find((candidate) => candidate.keyId === value.issuerKeyId);
    if (!key) return { ok: false, code: "REGISTRY_KEY_UNKNOWN" };
    if (key.alg !== "Ed25519" || !key.purposes.includes("receiz.constitution.registry")) return { ok: false, code: "REGISTRY_KEY_PURPOSE_INVALID" };
    if (options.mode === "current-admission" && key.governanceStatus === "retired") return { ok: false, code: "REGISTRY_KEY_REVOKED" };
    const effective = BigInt(value.effectiveKai);
    if (!KAI.test(key.validFromKai) || effective < BigInt(key.validFromKai)) return { ok: false, code: "REGISTRY_KEY_NOT_YET_VALID" };
    if (key.expiresAtKai !== null && (!KAI.test(key.expiresAtKai) || effective > BigInt(key.expiresAtKai))) return { ok: false, code: "REGISTRY_KEY_EXPIRED" };
    if (key.revokedAtKai !== null && (!KAI.test(key.revokedAtKai) || (options.mode === "current-admission" ? BigInt(options.currentKai) >= BigInt(key.revokedAtKai) : effective >= BigInt(key.revokedAtKai)))) return { ok: false, code: "REGISTRY_KEY_REVOKED" };
    if ((options.mode === "current-admission" && value.status !== "current") || (options.mode === "historical-verification" && value.status === "revoked")) return { ok: false, code: "REGISTRY_STATUS_INVALID" };
    const rawKey = decodeB64u(key.publicKeyRawB64u);
    const signature = decodeB64u(value.signatureB64u);
    if (!rawKey || !signature) return { ok: false, code: "REGISTRY_SIGNATURE_INVALID" };
    let signatureValid = false;
    try {
      const cryptoKey = await crypto.subtle.importKey("raw", strictBuffer(rawKey), { name: "Ed25519" }, false, ["verify"]);
      const { signatureB64u: _signature, ...basis } = value;
      void _signature;
      signatureValid = await crypto.subtle.verify("Ed25519", cryptoKey, strictBuffer(signature), strictBuffer(registryArtifactSigningBytes(basis)));
    } catch { signatureValid = false; }
    if (!signatureValid) return { ok: false, code: "REGISTRY_SIGNATURE_INVALID" };
    const artifact: ReceizVerifiedRegistryArtifact = {
      ...structuredClone(value), verifier: "receiz.sdk.registry-artifact.v1", historical: options.mode === "historical-verification",
      authority: { registryArtifactIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
    };
    verifiedArtifacts.add(artifact);
    return { ok: true, artifact };
  };
}
