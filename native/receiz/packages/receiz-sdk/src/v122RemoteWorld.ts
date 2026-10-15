import { planReceizPrivateCommandV122 } from "./v122PrivateWorld.js";
import { planReceizMultiWorldTransactionV122 } from "./v122MultiWorld.js";
import { planReceizWorldCommandV122, planReceizWorldTransactionV122, type ReceizExecutionOutcomeV122, type ReceizWorldTransactionV122 } from "./v122Transactions.js";

export function createReceizRemoteWorldV122(request: <T>(path: string, options?: { method?: string; body?: Record<string, unknown> }) => Promise<T>) {
  return Object.freeze({
    planCommandV122: planReceizWorldCommandV122,
    planTransactionV122: planReceizWorldTransactionV122,
    planPrivateCommand: planReceizPrivateCommandV122,
    validateTransaction: (transaction: ReceizWorldTransactionV122) => request("/api/sdk/v1/world/transactions/validate", { method: "POST", body: { transaction } as unknown as Record<string, unknown> }),
    executeTransactionV122: (input: Readonly<Record<string, unknown>>) => request<ReceizExecutionOutcomeV122>("/api/sdk/v1/world/transactions/execute", { method: "POST", body: input as Record<string, unknown> }),
    execution: (input: Readonly<{ worldId: string; transactionId: string }>) => request<ReceizExecutionOutcomeV122>(`/api/sdk/v1/world/${encodeURIComponent(input.worldId)}/executions/${encodeURIComponent(input.transactionId)}`),
    executionByIdempotencyKey: (input: Readonly<{ worldId: string; idempotencyKey: string }>) => request<ReceizExecutionOutcomeV122>(`/api/sdk/v1/world/${encodeURIComponent(input.worldId)}/executions/by-idempotency/${encodeURIComponent(input.idempotencyKey)}`),
    additionsV122: (input: Readonly<{ worldId: string; afterHead?: string }>) => request(`/api/sdk/v1/world/${encodeURIComponent(input.worldId)}/additions${input.afterHead ? `?afterHead=${encodeURIComponent(input.afterHead)}` : ""}`),
    planMultiWorldTransaction: planReceizMultiWorldTransactionV122,
    executeMultiWorldTransaction: (input: Readonly<Record<string, unknown>>) => request<ReceizExecutionOutcomeV122>("/api/sdk/v1/world/multi-world/execute", { method: "POST", body: input as Record<string, unknown> }),
  });
}
