export type ReceizV122ZeroWriteValidationFailure<Code extends string = string> = Readonly<{
    ok: false;
    code: Code;
    writesOnFailure: 0;
}>;
export type ReceizV122ExactBytesValidationResult<Code extends string> = Readonly<{
    ok: true;
}> | ReceizV122ZeroWriteValidationFailure<Code>;
export type ReceizPersistedPlannedTransactionV122 = Readonly<{
    schema: "receiz.persisted-planned-transaction.v122";
    canonicalBytesB64u: string;
    transactionDigest: string;
}>;
export type ReceizSemanticIdempotencyInputV122 = Readonly<{
    operation: string;
    ownerReceizId: string;
    semanticIntent: unknown;
}>;
export declare function canonicalizeReceizV122(value: unknown): string;
export declare function digestReceizCanonicalV122(value: unknown): Promise<string>;
export declare function deriveReceizSubjectIdV122(admittedProofDigest: string): Promise<string>;
export declare function createReceizSemanticIdempotencyKey(input: ReceizSemanticIdempotencyInputV122): Promise<string>;
export declare function createReceizWorldIdempotencyDigestV122(worldId: string, idempotencyKey: string): Promise<string>;
export declare function equalReceizExactHeadMaps(left: Readonly<Record<string, string>>, right: Readonly<Record<string, string>>): boolean;
export declare function validateReceizExactCommandBytes(command: unknown, exactBytes: Uint8Array): ReceizV122ExactBytesValidationResult<"command_bytes_mismatch">;
export declare function validateReceizExactTransactionBytes(transaction: unknown, exactBytes: Uint8Array): ReceizV122ExactBytesValidationResult<"transaction_bytes_mismatch">;
export declare function persistReceizExactPlannedTransaction(transaction: unknown): Promise<ReceizPersistedPlannedTransactionV122>;
export declare function restoreReceizExactPlannedTransaction<T = unknown>(persisted: ReceizPersistedPlannedTransactionV122): Promise<T>;
//# sourceMappingURL=v122Canonical.d.ts.map