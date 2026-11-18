import type { ReceizWorldTransactionV122 } from "./v122Transactions.js";
export type ReceizMultiWorldTransactionV122 = Readonly<{
    schema: "receiz.multi-world-transaction.v122";
    multiWorldTransactionId: string;
    worlds: readonly Readonly<{
        worldId: string;
        expectedWorldHead: string;
        transaction: ReceizWorldTransactionV122;
    }>[];
    participantSubjectIds: readonly string[];
    idempotencyKey: string;
    multiWorldDigest: string;
}>;
export declare function planReceizMultiWorldTransactionV122(input: Readonly<{
    worlds: readonly Readonly<{
        worldId: string;
        expectedWorldHead: string;
        transaction: ReceizWorldTransactionV122;
    }>[];
    idempotencyKey: string;
}>): Promise<ReceizMultiWorldTransactionV122>;
//# sourceMappingURL=v122MultiWorld.d.ts.map