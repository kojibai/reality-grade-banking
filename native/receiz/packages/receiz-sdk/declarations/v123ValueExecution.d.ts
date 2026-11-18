import { type ReceizProofAuthorityV123 } from "./v123ProofAuthority.js";
import { type ReceizValueRailV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";
export type ReceizValueExecutionReceiptV123 = Readonly<{
    schema: "receiz.value.execution-receipt.v123";
    executionId: string;
    rail: ReceizValueRailV122;
    valueIntentDigest: string;
    amountPhiMicro: string;
    sourcePriorHead: string;
    sourceHead: string;
    destinationPriorHead: string;
    destinationHead: string;
    authorityDigest: string;
    idempotencyKey: string;
    registryDigest: string;
    reducerDigest: string;
    acceptedAtKai: number;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "settlement-proof-object" | "reserve-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizValueProofReferenceV123 = Readonly<{
    schema: "receiz.value.proof-reference.v123";
    objectId: string;
    head: string;
    proofDigest: string;
}>;
export type ReceizValueExecutionOutcomeV123 = Readonly<{
    status: "committed";
    rail: ReceizValueRailV122;
    intent: ReceizWorldValueIntentV122;
    receipt: ReceizValueExecutionReceiptV123;
    sourceHead: string;
    destinationHead: string;
    proofReferences: readonly ReceizValueProofReferenceV123[];
}> | Readonly<{
    status: "zero-write";
    rail: ReceizValueRailV122;
    failure: Readonly<{
        code: string;
        writesOnFailure: 0;
    }>;
    currentSourceHead: string | null;
    currentDestinationHead: string | null;
}> | Readonly<{
    status: "unknown";
}>;
type Request = <T>(path: string, options?: Readonly<{
    method?: string;
    body?: Record<string, unknown>;
    bearerToken?: string;
}>) => Promise<T>;
export declare function validateReceizValueExecutionOutcomeV123(value: unknown): Promise<ReceizValueExecutionOutcomeV123>;
export declare function createReceizRemoteValueExecutionV123(request: Request): Readonly<{
    executeSettlement: (intent: ReceizWorldValueIntentV122, authority: ReceizProofAuthorityV123) => Promise<ReceizValueExecutionOutcomeV123>;
    executeReserve: (intent: ReceizWorldValueIntentV122, authority: ReceizProofAuthorityV123) => Promise<ReceizValueExecutionOutcomeV123>;
    executionByIdempotencyKey: (idempotencyKey: string, authority?: ReceizProofAuthorityV123) => Promise<ReceizValueExecutionOutcomeV123>;
}>;
export {};
//# sourceMappingURL=v123ValueExecution.d.ts.map