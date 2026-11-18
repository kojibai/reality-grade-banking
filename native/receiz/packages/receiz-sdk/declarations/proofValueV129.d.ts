import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { SIGIL_VALUATION_ALGORITHM, type SigilCalculationTerm, type SigilMetadataLite } from "./sigilValuationCore.js";
import { type ReceizRarityPolicyV129 } from "./proofValuePolicyV129.js";
import { type ReceizProofValueSaleEvidenceV129, type ReceizProofValueTransactionsV129 } from "./proofValueTransactionsV129.js";
export type ReceizProofValueSourceV129 = ReceizArtifactVerificationResult | ReceizVerifiedArtifactAdmission;
export type ReceizProofValueUsdBasisV129 = Readonly<{
    algorithm: "receiz.display-usd.v122";
    version: "1";
    usdPerPhiMicrocents: string;
    priceBasis: Readonly<Record<string, unknown>>;
    priceBasisDigest: string;
}>;
export type ReceizProofValueOptionsV129 = Readonly<{
    source: ReceizProofValueSourceV129;
    expectedProofDigest?: string;
    expectedHistoryHead?: string;
    policy?: Readonly<{
        algorithm: typeof SIGIL_VALUATION_ALGORITHM;
        checksum: string;
    }>;
    rarityPolicy?: ReceizRarityPolicyV129;
    marketReferenceRule?: "last-executed-sale-v129";
    sales?: readonly ReceizProofValueSaleEvidenceV129[];
    usdBasis?: ReceizProofValueUsdBasisV129;
    /** Display input only. Never consumed by either calculated value. */
    askingPricePhiMicro?: string;
}>;
export declare const RECEIZ_PROOF_VALUE_LIMITS_V129: Readonly<{
    samples: 256;
    portableDepth: 4;
    metadataEntries: 4096;
}>;
export declare const RECEIZ_LAST_EXECUTED_SALE_RULE_V129: Readonly<{
    algorithm: "receiz.market-reference.last-executed-sale";
    version: "129.0.0";
    formula: "marketReferenceValuePhiMicro = uniquely causally latest completedSale.amountPhiMicro with admitted completion at or before valuation Kai";
    intrinsicAdjustment: "none";
    askingPriceAdjustment: "none";
}>;
export type ReceizProofValueProjectionV129 = Readonly<{
    status: "available";
    schema: "receiz.proof-value-projection.v129";
    algorithm: string;
    policyChecksum: string;
    proofDigest: string;
    originProofDigest: string;
    historyHead: string | null;
    originKaiUPulse: string | null;
    originKaiPulse: string;
    valuationKaiUPulse: string;
    valuationKaiPulse: string;
    proofValuePhiMicro: string;
    marketReferenceValuePhiMicro: string | null;
    askingPricePhiMicro: string | null;
    lastExecutedPricePhiMicro: string | null;
    displayUsdCents: string | null;
    priceBasisDigest: string | null;
    inputs: Readonly<Record<string, unknown>>;
    calculation: readonly SigilCalculationTerm[];
    transactions: ReceizProofValueTransactionsV129;
    projectionDigest: string;
    writesPerformed: 0;
    authority: Readonly<{
        valuationIsSettlementAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProofValueUnavailableV129 = Readonly<{
    status: "unavailable";
    code: "VALUATION_ORIGIN_NOT_CARRIED" | "VALUATION_PAYLOAD_NOT_RETAINED" | "VALUATION_PRIVATE_SOURCE_UNSUPPORTED";
    proofDigest: string;
    historyHead: string | null;
    writesPerformed: 0;
}>;
export type ReceizProofValueResultV129 = ReceizProofValueProjectionV129 | ReceizProofValueUnavailableV129;
/** Package-internal interpretation selected only by strict carried replay revision. */
export type ReceizProofValueInterpretationV129 = "129.0.0" | "129.5.1";
type Basis = Readonly<{
    verification: Extract<ReceizArtifactVerificationResult, {
        status: "verified-artifact";
    }>;
    admission: ReceizVerifiedArtifactAdmission | null;
    proofDigest: string;
    originProofDigest: string;
    historyHead: string | null;
    originKaiPulse: number;
    originKaiUPulse: string | null;
    metadata: SigilMetadataLite;
    payload: Readonly<Record<string, unknown>> | null;
    transactions: ReceizProofValueTransactionsV129;
    sourceReferences: readonly string[];
}>;
/** Package-internal snapshot. Custodied objects retain their actual identity;
 * caller JSON is copied before the first asynchronous verification read. */
export declare function snapshotReceizProofValueInputV129<T extends ReceizProofValueOptionsV129>(input: T): T;
/** Package-internal source composition; every payload is read only after the
 * enclosing canonical verification that issued its retained runtime. */
export declare function readReceizProofValueBasisV129(input: ReceizProofValueOptionsV129, interpretation?: ReceizProofValueInterpretationV129): Promise<Basis | ReceizProofValueUnavailableV129>;
export declare function projectReceizProofValueV129(input: ReceizProofValueOptionsV129 & Readonly<{
    valuationKaiUPulse: string;
}>): Promise<ReceizProofValueResultV129>;
export declare function sampleReceizProofValueV129(input: ReceizProofValueOptionsV129 & Readonly<{
    valuationKaiUPulses: readonly string[];
}>): Promise<Readonly<{
    kind: "recomputed-model-samples";
    samples: readonly ReceizProofValueResultV129[];
    transactions: ReceizProofValueTransactionsV129 | null;
    writesPerformed: 0;
}>>;
/** Package-internal; public valuation entrypoints never accept a legacy mode. */
export declare function sampleReceizProofValueForReplayV129(input: ReceizProofValueOptionsV129 & Readonly<{
    valuationKaiUPulses: readonly string[];
}>, interpretation: ReceizProofValueInterpretationV129): Promise<Readonly<{
    kind: "recomputed-model-samples";
    samples: readonly ReceizProofValueResultV129[];
    transactions: ReceizProofValueTransactionsV129 | null;
    writesPerformed: 0;
}>>;
export {};
//# sourceMappingURL=proofValueV129.d.ts.map