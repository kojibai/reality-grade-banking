import { type ReceizPrivateWorldEnvelopeV122 } from "./v122PrivateWorld.js";
import { type ReceizWorldTransactionV122 } from "./v122Transactions.js";
import { type ReceizMultiWorldTransactionV122 } from "./v122MultiWorld.js";
import { type ReceizWorldValueIntentV122 } from "./v122Value.js";
import { type ReceizWorldAccessAppendV122 } from "./v122WorldAccess.js";
export type ReceizWorldCompositeCommandCategoryV124 = "inventory" | "material" | "ownership" | "subject" | "world";
export type ReceizWorldJsonObjectV124 = Readonly<Record<string, unknown>>;
export type ReceizWorldExecutionReceiptV124 = ReceizWorldJsonObjectV124 & Readonly<{
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizWorldExecutionEventV124 = Readonly<{
    schema: "receiz.world-execution-event.v124";
    eventDigest: string;
    worldId: string;
    transactionId: string;
    ordinal: number;
    priorWorldHead: string;
    acceptedWorldHead: string;
    actorSubjectId: string;
    kind: string;
    visibilityMode: "public" | "private" | "invited";
    publicPayload: ReceizWorldJsonObjectV124;
    privateEnvelopeDigest: string | null;
    acceptedAtKai: number;
}>;
export type ReceizWorldExecutionPrivateEnvelopeV124 = Readonly<ReceizPrivateWorldEnvelopeV122 & {
    eventDigest: string;
}>;
export type ReceizWorldExecutionProjectionV124 = Readonly<{
    schema: "receiz.world-execution-projection.v124";
    worldId: string;
    transactionId: string;
    idempotencyIdentityDigest: string;
    transactionDigest: string;
    expectedWorldHead: string;
    currentHeads: Readonly<Record<string, string>>;
    transaction: ReceizWorldTransactionV122;
    events: readonly ReceizWorldExecutionEventV124[];
    privateEnvelopes: readonly ReceizWorldExecutionPrivateEnvelopeV124[];
    accessAppends: readonly ReceizWorldAccessAppendV122[];
    valueIntents: readonly ReceizWorldValueIntentV122[];
    receipt: ReceizWorldExecutionReceiptV124;
    receiptDigest: string;
    acceptedWorldHead: string;
    acceptedSubjectHeads: Readonly<Record<string, string>>;
    registryDigest: string;
    reducerDigest: string;
    commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[];
    projectionDigest: string;
    authority: Readonly<{
        projectionIsExecutionAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizWorldExecutionProjectionInputV124 = Readonly<{
    transaction: ReceizWorldTransactionV122;
    events: readonly ReceizWorldExecutionEventV124[];
    privateEnvelopes: readonly ReceizWorldExecutionPrivateEnvelopeV124[];
    accessAppends: readonly ReceizWorldAccessAppendV122[];
    valueIntents: readonly ReceizWorldValueIntentV122[];
    receipt: ReceizWorldExecutionReceiptV124;
    acceptedWorldHead: string;
    acceptedSubjectHeads: Readonly<Record<string, string>>;
}>;
export type ReceizMultiWorldExecutionMemberV124 = Readonly<{
    ordinal: number;
    worldId: string;
    expectedWorldHead: string;
    execution: ReceizWorldExecutionProjectionV124;
}>;
export type ReceizMultiWorldExecutionProjectionV124 = Readonly<{
    schema: "receiz.multi-world-execution-projection.v124";
    multiWorldTransactionId: string;
    idempotencyIdentityDigest: string;
    multiWorldDigest: string;
    currentHeads: Readonly<Record<string, string>>;
    transaction: ReceizMultiWorldTransactionV122;
    worlds: readonly ReceizMultiWorldExecutionMemberV124[];
    receipt: ReceizWorldJsonObjectV124;
    receiptDigest: string;
    registryDigest: string;
    reducerDigest: string;
    commandCategories: readonly ReceizWorldCompositeCommandCategoryV124[];
    projectionDigest: string;
    authority: Readonly<{
        projectionIsExecutionAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizMultiWorldExecutionProjectionInputV124 = Readonly<{
    worlds: readonly ReceizWorldExecutionProjectionV124[];
    idempotencyKey: string;
    receipt: ReceizWorldJsonObjectV124;
}>;
export declare function createReceizWorldExecutionEventV124(input: Readonly<{
    worldId: string;
    transactionId: string;
    ordinal: number;
    priorWorldHead: string;
    acceptedWorldHead: string;
    actorSubjectId: string;
    kind: string;
    visibilityMode: "public" | "private" | "invited";
    publicPayload: ReceizWorldJsonObjectV124;
    privateEnvelopeDigest: string | null;
    acceptedAtKai: number;
}>): Promise<ReceizWorldExecutionEventV124>;
export declare function planReceizWorldExecutionProjectionV124(input: ReceizWorldExecutionProjectionInputV124): Promise<ReceizWorldExecutionProjectionV124>;
export declare function validateReceizWorldExecutionProjectionV124(value: unknown): Promise<ReceizWorldExecutionProjectionV124>;
export declare const planReceizWorldCompositeOperationV124: typeof planReceizWorldExecutionProjectionV124;
export declare const validateReceizWorldCompositeOperationV124: typeof validateReceizWorldExecutionProjectionV124;
export type ReceizWorldCompositeOperationV124 = ReceizWorldExecutionProjectionV124;
export declare function planReceizMultiWorldExecutionProjectionV124(input: ReceizMultiWorldExecutionProjectionInputV124): Promise<ReceizMultiWorldExecutionProjectionV124>;
export declare function validateReceizMultiWorldExecutionProjectionV124(value: unknown): Promise<ReceizMultiWorldExecutionProjectionV124>;
export declare const planReceizMultiWorldCompositeOperationV124: typeof planReceizMultiWorldExecutionProjectionV124;
export declare const validateReceizMultiWorldCompositeOperationV124: typeof validateReceizMultiWorldExecutionProjectionV124;
export type ReceizMultiWorldCompositeOperationV124 = ReceizMultiWorldExecutionProjectionV124;
//# sourceMappingURL=v124WorldComposite.d.ts.map