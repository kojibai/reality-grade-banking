import { type ReceizConstitutionJson } from "./constitution.js";
export type ReceizCausalEvent = Readonly<{
    type: "asset.retired" | "asset.alive";
    assetId: string;
}> | Readonly<{
    type: "capability.revoked";
    capabilityDigest: string;
}> | Readonly<{
    type: "ownership.assigned";
    assetId: string;
    ownerId: string;
}> | Readonly<{
    type: "resource.spent";
    resourceId: string;
    amount: number;
}> | Readonly<{
    type: "reward.granted";
    causeId: string;
    resourceId: string;
    amount: number;
}> | Readonly<{
    type: "injury.recorded" | "liability.recorded" | "settlement.recorded";
    assetId: string;
    amount: number;
}>;
export type ReceizCausalRecord = Readonly<{
    schema: "receiz.causal.record.v1";
    recordDigest: string;
    registryDigest: string;
    aggregateId: string;
    kaiPulse: string;
    parentDigests: readonly string[];
    receiptDigest: string;
    receipt: ReceizConstitutionJson;
    event: ReceizCausalEvent;
    authority: Readonly<{
        causalRecordIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCausalHistory = Readonly<{
    registryDigest: string;
    import(record: ReceizCausalRecord): Promise<void>;
    records(): ReceizCausalRecord[];
    heads(): string[];
    historyRoot(): Promise<string>;
    isAncestor(ancestorDigest: string, descendantDigest: string): boolean;
    appendToProofMemory(memory: {
        append(entry: {
            id: string;
            kind: string;
            createdAt: string | null;
            kaiUpulse: string;
            proof: null;
            payload: Record<string, unknown>;
            projection: Record<string, unknown>;
        }): unknown;
    }): void;
}>;
export declare function createReceizCausalRecord(input: {
    registryDigest: string;
    aggregateId: string;
    kaiPulse: string;
    parentDigests: readonly string[];
    receipt: ReceizConstitutionJson;
    event: ReceizCausalEvent;
}): Promise<ReceizCausalRecord>;
export declare function createReceizCausalHistory(options: {
    registryDigest: string;
    verifyAdmissionReceipt: (receipt: ReceizConstitutionJson, receiptDigest: string) => boolean | Promise<boolean>;
}): ReceizCausalHistory;
//# sourceMappingURL=causalHistory.d.ts.map