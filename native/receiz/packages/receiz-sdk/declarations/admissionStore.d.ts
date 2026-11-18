import { type ReceizConstitutionJson } from "./constitution.js";
export type ReceizAdmissionAggregate = Readonly<{
    revision: number;
    headDigest: string | null;
    state: ReceizConstitutionJson;
}>;
export type ReceizAdmissionAggregateSeed = Readonly<{
    aggregateId: string;
    revision: number;
    headDigest: string | null;
    state: ReceizConstitutionJson;
}>;
export type ReceizAdmissionUnitOfWork = Readonly<{
    schema: "receiz.admission.unit-of-work.v1";
    aggregateId: string;
    commandDigest: string;
    idempotencyKey: string;
    expectedRevision: number;
    expectedHeadDigest: string | null;
    /** Read-only exact heads, checked in the same transaction as the accepted append. */
    readDependencies?: readonly Readonly<{
        aggregateId: string;
        expectedHeadDigest: string;
    }>[];
    /** Existing verified ceremony receipts consumed with this append, never before CAS. */
    consumedPbiReceiptDigests?: readonly string[];
    acceptedCommand: ReceizConstitutionJson;
    events: readonly ReceizConstitutionJson[];
    nextHead: Readonly<{
        revision: number;
        digest: string;
        state: ReceizConstitutionJson;
    }>;
    resourceEffects: Readonly<Record<string, number>>;
    receipt: ReceizConstitutionJson;
    outboxIntents: readonly ReceizConstitutionJson[];
    auditReference: ReceizConstitutionJson;
}>;
export type ReceizAdmissionCommitResult = Readonly<{
    status: "committed";
    receipt: ReceizConstitutionJson;
}> | Readonly<{
    status: "idempotent";
    receipt: ReceizConstitutionJson;
}> | Readonly<{
    status: "conflict";
    code: "IDEMPOTENCY_CONFLICT" | "EXPECTED_REVISION_MISMATCH" | "CAUSAL_PARENT_MISMATCH" | "READ_DEPENDENCY_MISMATCH" | "PBI_RECEIPT_REPLAYED";
    expectedRevision?: number;
    expectedHead?: string | null;
}> | Readonly<{
    status: "rejected";
    code: "TRANSACTION_LIMIT_EXCEEDED" | "UNIT_OF_WORK_INVALID" | "ATOMIC_GUARDS_UNSUPPORTED";
}> | Readonly<{
    status: "failed";
    code: "ATOMIC_COMMIT_FAILED";
}>;
export type ReceizAdmissionStoreInspection = {
    acceptedCommands: ReceizConstitutionJson[];
    events: ReceizConstitutionJson[];
    heads: ReceizConstitutionJson[];
    resourceLedgers: ReceizConstitutionJson[];
    receipts: ReceizConstitutionJson[];
    idempotencyRecords: ReceizConstitutionJson[];
    outboxIntents: ReceizConstitutionJson[];
    auditReferences: ReceizConstitutionJson[];
};
export type ReceizAdmissionStore = Readonly<{
    readAggregate(aggregateId: string): Promise<ReceizAdmissionAggregate | null>;
    readIdempotency(idempotencyKey: string): Promise<Readonly<{
        commandDigest: string;
        receipt: ReceizConstitutionJson;
    }> | null>;
    commit(unit: ReceizAdmissionUnitOfWork): Promise<ReceizAdmissionCommitResult>;
    seedAggregate(input: ReceizAdmissionAggregateSeed): Promise<void>;
    inspect(): Promise<ReceizAdmissionStoreInspection>;
}>;
export type ReceizAdmissionStoreConformanceFactories = Readonly<{
    create(): ReceizAdmissionStore;
    createLimited(): ReceizAdmissionStore;
    createFailing(): ReceizAdmissionStore;
}>;
export type ReceizAdmissionStoreConformanceReport = Readonly<{
    schema: "receiz.admission-store.conformance.v1";
    ok: boolean;
    checks: Readonly<{
        atomicCollections: boolean;
        optimisticConcurrency: boolean;
        idempotentRetry: boolean;
        idempotencyConflict: boolean;
        detachedReads: boolean;
        outboxCommitted: boolean;
        transactionLimits: boolean;
        crashRollback: boolean;
    }>;
}>;
export declare function createReceizInMemoryAdmissionStore(options?: {
    maxRecordsPerTransaction?: number;
    failBeforeSwap?: (unit: ReceizAdmissionUnitOfWork) => boolean;
}): ReceizAdmissionStore;
/**
 * Executes the normative admission-store contract against a production adapter.
 * The caller must provide isolated normal, transaction-limited, and crash-injected
 * instances so rollback behavior is evidence supplied by the adapter itself.
 */
export declare function runReceizAdmissionStoreConformance(factories: ReceizAdmissionStoreConformanceFactories): Promise<ReceizAdmissionStoreConformanceReport>;
//# sourceMappingURL=admissionStore.d.ts.map