import type { ReceizCausalHistory } from "./causalHistory.js";
export type ReceizCausalProjection = Readonly<{
    aliveAssets: readonly string[];
    retiredAssets: readonly string[];
    revokedCapabilities: readonly string[];
    ownership: Readonly<Record<string, string>>;
    spending: Readonly<Record<string, number>>;
    rewardsByCause: Readonly<Record<string, Readonly<{
        resourceId: string;
        amount: number;
    }>>>;
    rewardTotals: Readonly<Record<string, number>>;
    injuries: Readonly<Record<string, number>>;
    liabilities: Readonly<Record<string, number>>;
    settlements: Readonly<Record<string, number>>;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCausalMergeResult = Readonly<{
    ok: true;
    projection: ReceizCausalProjection;
    stateDigest: string;
    historyRoot: string;
}> | Readonly<{
    ok: false;
    code: "STALE_LIVING_BRANCH" | "OWNERSHIP_CONTRADICTION" | "REWARD_CAUSE_CONFLICT";
    affectedAsset?: string;
    causeId?: string;
}>;
export type ReceizCausalReplayResult = Readonly<{
    ok: true;
    projection: ReceizCausalProjection;
    stateDigest: string;
    historyRoot: string;
    trace: readonly Readonly<{
        recordDigest: string;
        stateDigest: string;
    }>[];
}> | Extract<ReceizCausalMergeResult, {
    ok: false;
}>;
export type ReceizCausalCheckpoint = Readonly<{
    schema: "receiz.causal.checkpoint.v1";
    checkpointDigest: string;
    registryDigest: string;
    historyRoot: string;
    headDigests: readonly string[];
    recordCount: number;
    stateDigest: string;
    authority: Readonly<{
        checkpointIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizVerifiedCausalCheckpoint = ReceizCausalCheckpoint & Readonly<{
    verifiedBy: "receiz.sdk.causal-checkpoint.v1";
}>;
export declare function replayReceizCausalHistory(history: ReceizCausalHistory): Promise<ReceizCausalReplayResult>;
export declare function mergeReceizCausalHistory(history: ReceizCausalHistory): Promise<ReceizCausalMergeResult>;
export declare function createReceizCausalCheckpoint(history: ReceizCausalHistory): Promise<ReceizCausalCheckpoint>;
export declare function isReceizVerifiedCausalCheckpoint(value: unknown): value is ReceizVerifiedCausalCheckpoint;
export declare function verifyReceizCausalCheckpoint(value: unknown, history: ReceizCausalHistory): Promise<Readonly<{
    ok: true;
    checkpoint: ReceizVerifiedCausalCheckpoint;
}> | Readonly<{
    ok: false;
    code: "CHECKPOINT_INVALID" | "CHECKPOINT_MISMATCH";
}>>;
//# sourceMappingURL=causalReplay.d.ts.map