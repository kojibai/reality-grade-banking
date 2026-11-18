import { planReceizPrivateCommandV122 } from "./v122PrivateWorld.js";
import { planReceizMultiWorldTransactionV122 } from "./v122MultiWorld.js";
import { planReceizWorldCommandV122, planReceizWorldTransactionV122, type ReceizExecutionOutcomeV122, type ReceizWorldTransactionV122 } from "./v122Transactions.js";
export declare function createReceizRemoteWorldV122(request: <T>(path: string, options?: {
    method?: string;
    body?: Record<string, unknown>;
}) => Promise<T>): Readonly<{
    planCommandV122: typeof planReceizWorldCommandV122;
    planTransactionV122: typeof planReceizWorldTransactionV122;
    planPrivateCommand: typeof planReceizPrivateCommandV122;
    validateTransaction: (transaction: ReceizWorldTransactionV122) => Promise<unknown>;
    executeTransactionV122: (input: Readonly<Record<string, unknown>>) => Promise<ReceizExecutionOutcomeV122>;
    execution: (input: Readonly<{
        worldId: string;
        transactionId: string;
    }>) => Promise<ReceizExecutionOutcomeV122>;
    executionByIdempotencyKey: (input: Readonly<{
        worldId: string;
        idempotencyKey: string;
    }>) => Promise<ReceizExecutionOutcomeV122>;
    additionsV122: (input: Readonly<{
        worldId: string;
        afterHead?: string;
    }>) => Promise<unknown>;
    planMultiWorldTransaction: typeof planReceizMultiWorldTransactionV122;
    executeMultiWorldTransaction: (input: Readonly<Record<string, unknown>>) => Promise<ReceizExecutionOutcomeV122>;
}>;
//# sourceMappingURL=v122RemoteWorld.d.ts.map