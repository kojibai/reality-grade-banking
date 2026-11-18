import type { ReceizRegistryDigest } from "./artifactAdmissionTypes.js";
import { type ReceizLawExpression } from "./constitution.js";
import { type ReceizRegistryArtifact } from "./registryArtifact.js";
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
/** Internal package-boundary token used by the separate testing entrypoint. */
export declare const RECEIZ_REGISTRY_DISCOVERY_TESTING_TRUST: unique symbol;
export declare function discoverReceizRegistryLaw(input: ReceizRegistryDiscoveryInput): Promise<ReceizRegistryDiscoveryResult>;
export declare function isRuntimeDiscoveredReceizRegistryLaw(value: unknown): value is ReceizRegistryDiscoveryResult;
export declare function verifyRuntimeDiscoveredReceizRegistryLaw(value: unknown): ReceizRegistryDiscoveryResult;
//# sourceMappingURL=registryDiscovery.d.ts.map