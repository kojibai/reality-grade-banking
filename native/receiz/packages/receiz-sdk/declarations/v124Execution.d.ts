import { type ReceizOperationPlanV124 } from "./v124Contracts.js";
import { type ReceizExecutionTransportRequestInputV124 } from "./v124TransportBinding.js";
import { type ReceizPortableExecutionTransitionRecoveryV124, type ReceizPortableExecutionTransitionSetV124 } from "./v124PortableAuthority.js";
type Authority = Readonly<{
    outcomeIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
}>;
type HandleAuthority = Readonly<{
    handleIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
}>;
type RemoteRequest = <T>(path: string, options?: Readonly<{
    method?: string;
    body?: Record<string, unknown>;
}>) => Promise<T>;
declare const categories: readonly ["custom", "subject", "world", "world-composite", "multi-world-composite", "inventory", "access", "ownership", "settlement", "reserve"];
type Category = typeof categories[number];
export type ReceizRegisteredOperationV124 = Readonly<{
    operationId: string;
    category: Category;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    participants: readonly string[];
    payload: unknown;
}>;
export type ReceizRegisteredOperationBasisV124 = Readonly<Omit<ReceizRegisteredOperationV124, "participants">>;
export type ReceizRegisteredOperationCasV124 = Readonly<{
    participants: readonly string[];
    expectedParticipantHeads: Readonly<Record<string, string>>;
}>;
export type ReceizAtomicOperationInputV124 = Readonly<{
    applicationId: string;
    operations: readonly ReceizRegisteredOperationV124[];
    participants: readonly string[];
    expectedParticipantHeads: Readonly<Record<string, string>>;
    semanticIdempotencyKey: string;
    attemptId: string;
}>;
export type ReceizDurableExecutionHandleV124 = Readonly<{
    schema: "receiz.durable-execution-handle.v124";
    executionId: string;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    stagedAtKaiUPulse: number;
    handleDigest: string;
    authority: HandleAuthority;
    receiptDigest: string;
}>;
export type ReceizZeroWriteFailureReasonV124 = "IDEMPOTENCY_CONFLICT" | "STALE_HEAD" | "MISSING_PARTICIPANT" | "UNAUTHORIZED" | "INVALID_OPERATION" | "INSUFFICIENT_VALUE" | "UNSUPPORTED_ATOMICITY" | "ALREADY_COMMITTED" | "CANCELLED";
export type ReceizZeroWriteFailureV124 = Readonly<{
    schema: "receiz.zero-write-failure.v124";
    executionId: string | null;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    reasonCode: ReceizZeroWriteFailureReasonV124;
    writes: 0;
    failureDigest: string;
    authority: Readonly<{
        failureIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizExecutionOutcomeV124 = Readonly<{
    schema: "receiz.execution-outcome.v124";
    status: "committed";
    executionId: string;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    terminalAtKaiUPulse: number;
    committedHeads: Readonly<Record<string, string>>;
    outcomeDigest: string;
    authority: Authority;
    receiptDigest: string;
}> | Readonly<{
    schema: "receiz.execution-outcome.v124";
    status: "zero-write" | "cancelled";
    executionId: string;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    terminalAtKaiUPulse: number;
    reasonCode: ReceizZeroWriteFailureReasonV124;
    writes: 0;
    outcomeDigest: string;
    authority: Authority;
    receiptDigest: string;
}> | Readonly<{
    schema: "receiz.execution-outcome.v124";
    status: "unknown";
    executionId: string;
    applicationId: string;
    domainId: string;
    operationKind: string;
    exactPlanDigest: string;
    semanticIdempotencyKey: string;
    attemptId: string;
    stagedAtKaiUPulse: number;
    plan: ReceizOperationPlanV124;
    authority: Authority;
    receiptDigest: string;
}>;
export type ReceizExecutionResolutionV124 = Readonly<{
    applicationId: string;
    executionId: string;
}>;
export type ReceizExecutionIdempotencyCoordinatesV124 = Readonly<{
    applicationId: string;
    domainId: string;
    operationKind: string;
    semanticIdempotencyKey: string;
}>;
export declare class ReceizExecutionZeroWriteErrorV124 extends Error {
    readonly failure: ReceizZeroWriteFailureV124;
    constructor(failure: ReceizZeroWriteFailureV124);
}
export declare function exportReceizCommittedExecutionRecoveryV124(outcome: ReceizExecutionOutcomeV124): ReceizPortableExecutionTransitionRecoveryV124;
export declare function admitReceizExecutionWireV124(value: unknown): Promise<unknown>;
export declare function admitReceizSignedExecutionEnvelopeV124(value: unknown, request: ReceizExecutionTransportRequestInputV124): Promise<unknown>;
export declare function createReceizCustomReducerBindingsV124(input: Readonly<{
    namespace: string;
    registryDigest: string;
    reducerDigest: string;
}>): Promise<Readonly<{
    registryDigest: string;
    reducerDigest: string;
}>>;
export declare function deriveReceizRegisteredOperationCasV124(input: ReceizRegisteredOperationBasisV124): Promise<ReceizRegisteredOperationCasV124>;
export declare function planAtomicOperationV124(input: ReceizAtomicOperationInputV124): Promise<ReceizOperationPlanV124>;
export declare function validateReceizExecutionOutcomeV124(value: unknown): Promise<ReceizExecutionOutcomeV124>;
export declare function createReceizV124Execution(request: RemoteRequest): {
    stage: (planInput: ReceizOperationPlanV124) => Promise<Readonly<{
        schema: "receiz.durable-execution-handle.v124";
        executionId: string;
        applicationId: string;
        domainId: string;
        operationKind: string;
        exactPlanDigest: string;
        semanticIdempotencyKey: string;
        attemptId: string;
        stagedAtKaiUPulse: number;
        handleDigest: string;
        authority: HandleAuthority;
        receiptDigest: string;
    }>>;
    stagePrepared: (planInput: ReceizOperationPlanV124, transitionSetInput: ReceizPortableExecutionTransitionSetV124) => Promise<Readonly<{
        schema: "receiz.durable-execution-handle.v124";
        executionId: string;
        applicationId: string;
        domainId: string;
        operationKind: string;
        exactPlanDigest: string;
        semanticIdempotencyKey: string;
        attemptId: string;
        stagedAtKaiUPulse: number;
        handleDigest: string;
        authority: HandleAuthority;
        receiptDigest: string;
    }>>;
    execute: (handle: ReceizDurableExecutionHandleV124, authoritySession: unknown) => Promise<ReceizExecutionOutcomeV124>;
    resolve: (input: ReceizExecutionResolutionV124) => Promise<ReceizExecutionOutcomeV124>;
    resolveByIdempotencyKey: (input: ReceizExecutionIdempotencyCoordinatesV124) => Promise<ReceizExecutionOutcomeV124>;
    cancel: (handle: ReceizDurableExecutionHandleV124, authoritySession: unknown) => Promise<ReceizZeroWriteFailureV124>;
    exportCommittedRecovery: typeof exportReceizCommittedExecutionRecoveryV124;
    planAtomicOperationV124: typeof planAtomicOperationV124;
    planAtomicMutation: typeof planAtomicOperationV124;
};
export {};
//# sourceMappingURL=v124Execution.d.ts.map