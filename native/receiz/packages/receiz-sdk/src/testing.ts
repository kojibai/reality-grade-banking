export * from "./errors.js";
export * from "./capabilities.js";
export * from "./emulator.js";
export * from "./conformance.js";
export * from "./livingSubjectConformance.js";
import type { ReceizAdmissionStore, ReceizAdmissionUnitOfWork } from "./admissionStore.js";
import {
  createReceizBrowserAdmissionStoreInternal,
  type ReceizBrowserAdmissionStoreOptions,
} from "./browserAdmissionStore.js";

export function createReceizBrowserAdmissionStoreForTesting(
  options: ReceizBrowserAdmissionStoreOptions & Readonly<{
    maxRecordsPerTransaction?: number;
    failBeforeCommit?: (unit: ReceizAdmissionUnitOfWork) => boolean;
  }>,
): ReceizAdmissionStore {
  return createReceizBrowserAdmissionStoreInternal(options);
}
export {
  createReceizInMemoryArtifactTransitionStore as createReceizInMemoryArtifactTransitionStoreFixture,
  runReceizArtifactTransitionStoreConformance,
} from "./artifactTransitionStore.js";
export {
  createReceizArtifactTransitionCommitUnitFixture,
  createReceizVerifiedArtifactTransitionCandidateFixture,
} from "./artifactTransitionStoreTesting.js";
export type {
  ReceizArtifactTransitionStoreConformanceReport,
  ReceizInMemoryArtifactTransitionStore,
} from "./artifactTransitionStore.js";
import { digestReceizConstitution, type ReceizConstitutionRegistry } from "./constitution.js";
import {
  RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST,
  type ReceizRegistryDiscoveryTrustProfile,
} from "./registryDiscovery.js";
import type { ReceizRegistryArtifact, ReceizRegistryTrustKey } from "./registryArtifact.js";

export type ReceizRegistryDiscoveryFixture = Readonly<{
  artifacts: readonly ReceizRegistryArtifact[];
  currentKai: string;
  interpreterBudget: number;
  trustProfile: ReceizRegistryDiscoveryTrustProfile;
}>;

export async function createReceizRegistryDiscoveryFixture(input: Readonly<{
  historicalRegistries: readonly ReceizConstitutionRegistry[];
  currentRegistry: ReceizConstitutionRegistry;
  currentArtifact: Readonly<{
    issuerKeyId: string;
    status: "current";
    enclosingProof: Readonly<{ artifactId: string; sealDigest: string }>;
    payloadDigest: string;
    signatureB64u: string;
  }>;
  currentKai: string;
  interpreterBudget: number;
}>): Promise<ReceizRegistryDiscoveryFixture> {
  const historicalArtifacts = await Promise.all(input.historicalRegistries.map(async (registry, index): Promise<ReceizRegistryArtifact> => ({
    schema: "receiz.constitution.registry-artifact.v1",
    registry: structuredClone(registry),
    payloadDigest: await digestReceizConstitution(registry),
    issuerKeyId: `receiz:testing:registry-history:${index}`,
    keyPurpose: "receiz.constitution.registry",
    alg: "Ed25519",
    effectiveKai: String(index + 1),
    status: "historical",
    enclosingProof: { artifactId: `proof:testing:registry-history:${index}`, sealDigest: "8".repeat(64) },
    signatureB64u: "A".repeat(86),
  })));
  const currentArtifact: ReceizRegistryArtifact = {
    schema: "receiz.constitution.registry-artifact.v1",
    registry: structuredClone(input.currentRegistry),
    payloadDigest: input.currentArtifact.payloadDigest,
    issuerKeyId: input.currentArtifact.issuerKeyId,
    keyPurpose: "receiz.constitution.registry",
    alg: "Ed25519",
    effectiveKai: input.currentRegistry.effectiveKai,
    status: input.currentArtifact.status,
    enclosingProof: structuredClone(input.currentArtifact.enclosingProof),
    signatureB64u: input.currentArtifact.signatureB64u,
  };
  const fixtureTrustHistory: readonly ReceizRegistryTrustKey[] = [{
    keyId: input.currentArtifact.issuerKeyId,
    alg: "Ed25519",
    publicKeyRawB64u: "A6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg",
    purposes: ["receiz.constitution.registry"],
    validFromKai: "0",
    expiresAtKai: null,
    revokedAtKai: null,
    governanceStatus: "active",
    governanceCustodyClass: "testing-only",
    trustSource: "receiz-testing-fixture",
  }];
  return {
    artifacts: [...historicalArtifacts, currentArtifact],
    currentKai: input.currentKai,
    interpreterBudget: input.interpreterBudget,
    trustProfile: Object.freeze({
      rail: "receiz-testing-fixture",
      authority: Object.freeze({
        fixtureIsProductionAuthority: false,
        strongerTruth: "repository-published-governance-key-history",
      }),
      [RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST]: fixtureTrustHistory,
    }),
  };
}
export const RECEIZ_TESTING_AUTHORITY = "sandbox-beneath-sealed-receiz-proof-object" as const;
export { readReceizArtifactTransitionHistoryIssuanceCount } from "./proofHistory.js";
