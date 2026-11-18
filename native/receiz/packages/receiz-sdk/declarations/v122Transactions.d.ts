import { type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";
export type ReceizWorldCommandV122 = Readonly<{
    commandId: string;
    worldId: string;
    expectedWorldHead: string;
    actorSubjectId: string;
    participantSubjectIds: readonly string[];
    causalParents: readonly string[];
    command: unknown;
    exactCommandBytesB64u: string;
    commandDigest: string;
    planDigest: string;
    authorityDigest: string;
    mandateDigest: string | null;
}>;
export type ReceizWorldTransactionV122 = Readonly<{
    schema: "receiz.world.transaction.v122";
    transactionId: string;
    worldId: string;
    expectedWorldHead: string;
    participantHeads: Readonly<Record<string, string>>;
    commands: readonly ReceizWorldCommandV122[];
    registryDigest: string;
    reducerDigest: string;
    idempotencyKey: string;
    transactionDigest: string;
}>;
export type ReceizWorldCommandPlanInputV122 = Readonly<{
    commandId: string;
    worldId: string;
    expectedWorldHead: string;
    actorSubjectId: string;
    participantSubjectIds: readonly string[];
    causalParents: readonly string[];
    command: unknown;
    authority: unknown;
    mandateDigest?: string | null;
}>;
export type ReceizWorldTransactionPlanInputV122 = Readonly<{
    worldId: string;
    expectedWorldHead: string;
    participantHeads: Readonly<Record<string, string>>;
    commands: readonly ReceizWorldCommandV122[];
    registryDigest: string;
    reducerDigest: string;
    idempotencyKey: string;
}>;
export declare function planReceizWorldCommandV122(input: ReceizWorldCommandPlanInputV122): Promise<ReceizWorldCommandV122>;
export declare function planReceizWorldTransactionV122(input: ReceizWorldTransactionPlanInputV122): Promise<ReceizWorldTransactionV122>;
export type ReceizTransactionValidationFailureCodeV122 = "participant_set_mismatch" | "participant_head_mismatch" | "duplicate_command" | "command_world_mismatch" | "command_world_head_mismatch" | "command_bytes_mismatch" | "command_digest_mismatch" | "plan_digest_mismatch" | "authority_missing" | "mandate_missing" | "registry_incompatible" | "reducer_incompatible" | "causal_parent_invalid" | "transaction_digest_mismatch";
export type ReceizTransactionValidationResultV122 = Readonly<{
    ok: true;
    transaction: ReceizWorldTransactionV122;
}> | ReceizV122ZeroWriteValidationFailure<ReceizTransactionValidationFailureCodeV122>;
export declare function validateReceizTransactionV122(input: Readonly<{
    transaction: ReceizWorldTransactionV122;
    authenticatedParticipantHeads: Readonly<Record<string, string>>;
    registryDigest: string;
    reducerDigest: string;
    authorityDigests: ReadonlySet<string>;
    mandateRequiredForActors?: ReadonlySet<string>;
    mandateDigests?: ReadonlySet<string>;
    validCausalParents: ReadonlySet<string>;
}>): Promise<ReceizTransactionValidationResultV122>;
export type ReceizExecutionOutcomeV122 = Readonly<{
    status: "committed";
    transaction: ReceizWorldTransactionV122;
    receipt: unknown;
    events: readonly unknown[];
}> | Readonly<{
    status: "zero-write";
    failure: unknown;
    currentHeads: Readonly<Record<string, string>>;
    worldHead: string;
}> | Readonly<{
    status: "unknown";
}>;
export declare function validateReceizExecutionReceiptV122(input: Readonly<{
    outcome: ReceizExecutionOutcomeV122;
    expectedTransactionDigest: string;
    authenticateReceipt: (receipt: unknown) => boolean | Promise<boolean>;
}>): Promise<Readonly<{
    ok: true;
}> | ReceizV122ZeroWriteValidationFailure<"receipt_invalid" | "transaction_mismatch" | "failure_writes_nonzero">>;
//# sourceMappingURL=v122Transactions.d.ts.map