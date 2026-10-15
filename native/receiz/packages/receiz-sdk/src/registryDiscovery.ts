import type { ReceizRegistryDigest } from "./artifactAdmissionTypes.js";
import {
  assertReceizConstitutionRegistryInterpretable,
  validateReceizConstitutionRegistry,
  type ReceizLawExpression,
} from "./constitution.js";
import {
  createReceizRegistryArtifactVerifier,
  verifyReceizRegistryArtifactPayloadDigest,
  type ReceizRegistryArtifact,
  type ReceizRegistryTrustKey,
} from "./registryArtifact.js";
import {
  RECEIZ_REGISTRY_GOVERNANCE_TRUST_HISTORY,
  RECEIZ_V106_REGISTRY_DIGEST,
  RECEIZ_V107_REGISTRY_DIGEST,
  RECEIZ_V108_REGISTRY_DIGEST,
  RECEIZ_V109_REGISTRY_DIGEST,
  RECEIZ_V110_REGISTRY_DIGEST,
  RECEIZ_V111_REGISTRY_DIGEST,
} from "./releaseIdentity.js";

export type ReceizRegistryTrustEvidence = Readonly<{
  currentRegistryDigest: ReceizRegistryDigest;
  currentEffectiveKai: string;
  currentSignatureStatus: "verified";
  enclosingProofStatus: "verified";
  predecessorBindingStatus: "verified";
  trustAnchorDigest: ReceizRegistryDigest;
  verifiedChainDepth: number;
}>;

export type ReceizDiscoveredLaw = Readonly<{
  registryDigest: ReceizRegistryDigest;
  previousRegistryDigest: ReceizRegistryDigest;
  registrySignatureStatus: "verified";
  lawId: string;
  lawVersion: number;
  predicateLanguageVersion: "receiz-law-expression.v1";
  denialPredicate: ReceizLawExpression;
  denialCode: string;
  safeAlternatives: readonly string[];
}>;

export type ReceizRegistryDiscoveryTrustProfile = Readonly<{
  rail: "receiz-testing-fixture";
  authority: Readonly<{
    fixtureIsProductionAuthority: false;
    strongerTruth: "repository-published-governance-key-history";
  }>;
}>;

export type ReceizRegistryDiscoveryInput = Readonly<{
  artifacts: readonly ReceizRegistryArtifact[];
  currentKai: string;
  interpreterBudget: number;
  verifyEnclosingProof: (proof: ReceizRegistryArtifact["enclosingProof"]) => boolean | Promise<boolean>;
  trustProfile?: ReceizRegistryDiscoveryTrustProfile;
}>;

export type ReceizRegistryDiscoveryResult = Readonly<{
  trustEvidence: ReceizRegistryTrustEvidence;
  laws: readonly ReceizDiscoveredLaw[];
}>;

const runtimeDiscoveredRegistries = new WeakSet<object>();

const REQUIRED_VERSIONS = ["106.0.0", "107.0.0", "108.0.0", "109.0.0", "110.0.0", "111.0.0", "112.0.0"] as const;
const PINNED_HISTORICAL_DIGESTS = [
  RECEIZ_V106_REGISTRY_DIGEST,
  RECEIZ_V107_REGISTRY_DIGEST,
  RECEIZ_V108_REGISTRY_DIGEST,
  RECEIZ_V109_REGISTRY_DIGEST,
  RECEIZ_V110_REGISTRY_DIGEST,
  RECEIZ_V111_REGISTRY_DIGEST,
] as const;
function deepFreezeProductionTrustHistory<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreezeProductionTrustHistory(nested);
    Object.freeze(value);
  }
  return value;
}
const PRODUCTION_REGISTRY_GOVERNANCE_TRUST_HISTORY = deepFreezeProductionTrustHistory(
  structuredClone(RECEIZ_REGISTRY_GOVERNANCE_TRUST_HISTORY),
);
/** Internal package-boundary token used by the separate testing entrypoint. */
export const RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST = Symbol("receiz.sdk.registry-discovery.testing-trust");

function registryDigest(value: string): ReceizRegistryDigest {
  return Object.freeze({ algorithm: "sha-256", binds: "constitution-registry", value });
}

function trustHistory(profile: ReceizRegistryDiscoveryTrustProfile | undefined): readonly ReceizRegistryTrustKey[] {
  if (profile === undefined) return PRODUCTION_REGISTRY_GOVERNANCE_TRUST_HISTORY;
  const fixture = (profile as ReceizRegistryDiscoveryTrustProfile & {
    [RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST]?: readonly ReceizRegistryTrustKey[];
  })[RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST];
  if (!fixture) throw new Error("registry_signing_key_unpinned");
  return fixture;
}

function registryValidationError(issues: readonly string[]): Error {
  if (issues.some((issue) => issue.includes("unknown_operator"))) return new Error("constitution_unknown_operator");
  if (issues.some((issue) => issue.includes("unsupported_predicate_language"))) return new Error("constitution_predicate_language_unsupported");
  return new Error(`registry_chain_registry_invalid:${issues.join(",")}`);
}

export async function discoverReceizRegistryLaw(input: ReceizRegistryDiscoveryInput): Promise<ReceizRegistryDiscoveryResult> {
  if (input.artifacts.length !== REQUIRED_VERSIONS.length) throw new Error("registry_chain_incomplete");

  const digests: string[] = [];
  for (let index = 0; index < input.artifacts.length; index += 1) {
    const artifact = input.artifacts[index]!;
    if (artifact.registry.version !== REQUIRED_VERSIONS[index]) throw new Error("registry_chain_version_order_invalid");
    if (index < REQUIRED_VERSIONS.length - 1 && artifact.status !== "historical") throw new Error("registry_artifact_invalid");
    const payload = await verifyReceizRegistryArtifactPayloadDigest(artifact);
    if (!payload.ok) {
      if (payload.code === "REGISTRY_DIGEST_MISMATCH") throw new Error("registry_digest_mismatch");
      throw new Error("registry_artifact_invalid");
    }
    const validation = validateReceizConstitutionRegistry(artifact.registry);
    if (!validation.ok) throw registryValidationError(validation.issues);
    digests.push(payload.payloadDigest);

    if (index === 0 && payload.payloadDigest !== RECEIZ_V106_REGISTRY_DIGEST) throw new Error("registry_chain_anchor_mismatch");
    if (index > 0 && index < PINNED_HISTORICAL_DIGESTS.length && payload.payloadDigest !== PINNED_HISTORICAL_DIGESTS[index]) {
      throw new Error("registry_chain_pinned_digest_mismatch");
    }
    if (index > 0 && artifact.registry.previousRegistryDigest !== digests[index - 1]) {
      throw new Error("registry_chain_predecessor_mismatch");
    }
  }

  const current = input.artifacts.at(-1)!;
  assertReceizConstitutionRegistryInterpretable({
    registry: current.registry,
    budget: input.interpreterBudget,
  });

  const verifyCurrent = createReceizRegistryArtifactVerifier({
    currentKai: input.currentKai,
    mode: "current-admission",
    trustHistory: trustHistory(input.trustProfile),
    expectedRegistryDigest: current.payloadDigest,
    verifyEnclosingProof: input.verifyEnclosingProof,
  });
  const verified = await verifyCurrent(current);
  if (!verified.ok) {
    if (verified.code === "REGISTRY_KEY_UNKNOWN") throw new Error("registry_signing_key_unpinned");
    if (verified.code === "REGISTRY_ENCLOSING_PROOF_INVALID") throw new Error("registry_enclosing_proof_invalid");
    if (verified.code === "REGISTRY_SIGNATURE_INVALID") throw new Error("registry_current_signature_invalid");
    throw new Error(`registry_current_artifact_invalid:${verified.code}`);
  }

  const currentRegistryDigest = registryDigest(current.payloadDigest);
  const previousRegistryDigest = registryDigest(current.registry.previousRegistryDigest);
  const result: ReceizRegistryDiscoveryResult = deepFreezeProductionTrustHistory({
    trustEvidence: {
      currentRegistryDigest,
      currentEffectiveKai: current.effectiveKai,
      currentSignatureStatus: "verified",
      enclosingProofStatus: "verified",
      predecessorBindingStatus: "verified",
      trustAnchorDigest: registryDigest(RECEIZ_V106_REGISTRY_DIGEST),
      verifiedChainDepth: input.artifacts.length,
    },
    laws: current.registry.laws.map((law) => ({
      registryDigest: currentRegistryDigest,
      previousRegistryDigest,
      registrySignatureStatus: "verified",
      lawId: law.id,
      lawVersion: law.version,
      predicateLanguageVersion: "receiz-law-expression.v1",
      denialPredicate: structuredClone(law.denyWhen),
      denialCode: law.denial.code,
      safeAlternatives: structuredClone(law.denial.safeAlternatives),
    })),
  });
  runtimeDiscoveredRegistries.add(result);
  return result;
}

export function isRuntimeDiscoveredReceizRegistryLaw(
  value: unknown,
): value is ReceizRegistryDiscoveryResult {
  return value !== null && typeof value === "object" && runtimeDiscoveredRegistries.has(value);
}

export function verifyRuntimeDiscoveredReceizRegistryLaw(
  value: unknown,
): ReceizRegistryDiscoveryResult {
  if (!isRuntimeDiscoveredReceizRegistryLaw(value)) throw new Error("REGISTRY_DISCOVERY_NOT_VERIFIED");
  return value;
}
