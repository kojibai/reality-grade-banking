import { SIGIL_VALUATION_ALGORITHM } from "./sigilValuationCore.js";
import { type ReceizProofValueOptionsV129, type ReceizProofValueResultV129 } from "./proofValueV129.js";
import { exportReceizProofValueSaleRecoveryV129 } from "./proofValueTransactionsV129.js";
export declare const RECEIZ_PROOF_VALUE_REPLAY_LIMITS_V129: Readonly<{
    canonicalBytes: number;
    saleRecoveries: 256;
}>;
type SaleRecovery = Awaited<ReturnType<typeof exportReceizProofValueSaleRecoveryV129>>;
type ReplayOptions = Omit<ReceizProofValueOptionsV129, "source" | "sales" | "policy" | "expectedProofDigest" | "expectedHistoryHead">;
export type ReceizProofValueReplayV129 = Readonly<{
    schema: "receiz.proof-value-replay.v129";
    sdkVersion: "129.0.0" | "129.5.1";
    roots: Readonly<{
        kind: "sdk-pinned-signature-v4";
        digest: string;
        keyIds: readonly string[];
    }>;
    source: Readonly<{
        exactBytesB64u: string;
        filename: string;
        mimeType: string;
        artifactDigest: string;
        payloadDigest: string;
        admissionProfile: "portable-state" | null;
        historyHead: string | null;
    }>;
    policy: Readonly<{
        algorithm: typeof SIGIL_VALUATION_ALGORITHM;
        checksum: string;
    }>;
    options: ReplayOptions;
    saleRecoveries: readonly SaleRecovery[];
    valuationKaiUPulses: readonly string[];
    expectedProjectionDigests: readonly string[];
    replayDigest: string;
}>;
export type ReceizProofValueReplayVerificationV129 = Readonly<{
    status: "verified-replay";
    replayDigest: string;
    samples: readonly ReceizProofValueResultV129[];
    writesPerformed: 0;
    authority: Readonly<{
        replayIsSettlementAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}> | Readonly<{
    status: "invalid-replay";
    code: string;
    writesPerformed: 0;
}>;
/** Exports public carried source bytes and projections, never private identity
 * custody. It grants no publication, payment or settlement authority. */
export declare function exportReceizProofValueReplayV129(input: ReceizProofValueOptionsV129 & Readonly<{
    valuationKaiUPulses: readonly string[];
}>): Promise<ReceizProofValueReplayV129>;
/** Existing canonical verification runs before payload/history projection.
 * Carried root JSON identifies the SDK-pinned roots; it never overrides them. */
export declare function verifyReceizProofValueReplayV129(input: unknown): Promise<ReceizProofValueReplayVerificationV129>;
export {};
//# sourceMappingURL=proofValueReplayV129.d.ts.map