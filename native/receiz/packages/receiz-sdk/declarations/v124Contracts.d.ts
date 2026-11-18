export declare const RECEIZ_APPLICATION_ID_PATTERN = "^([a-z][a-z0-9.-]{0,127}|rc_[A-Za-z0-9_-]{24})$";
export type ReceizOperationKindV124 = string;
export type ReceizOperationPlanV124 = Readonly<{
    schema: "receiz.operation_plan.v124";
    applicationId: string;
    domainId: string;
    operationKind: ReceizOperationKindV124;
    registryDigest: string;
    reducerDigest: string;
    exactPlanBytesB64u: string;
    exactPlanDigest: string;
    expectedParticipantHeads: Readonly<Record<string, string>>;
    semanticIdempotencyKey: string;
    attemptId: string;
    writesOnFailure: 0;
}>;
export type ReceizExecutionStatusV124 = "staged" | "committed" | "zero-write" | "cancelled" | "unknown";
export type ReceizAuthoritySessionStatusV124 = "active" | "expired" | "revoked" | "closed";
export type ReceizQualificationStatusV124 = "available" | "degraded" | "unavailable";
export type ReceizRecipientResolutionStatusV124 = "resolved" | "not-found-or-not-authorized";
export type ReceizExecutionProjectionV124 = Readonly<{
    status: ReceizExecutionStatusV124;
    executionId: string;
    planDigest: string;
    writesOnFailure: 0;
}>;
export type ReceizAuthoritySessionProjectionV124 = Readonly<{
    status: ReceizAuthoritySessionStatusV124;
    sessionHandle: string;
    applicationId: string;
    actorSubjectId: string;
}>;
export type ReceizQualificationProjectionV124 = Readonly<{
    status: ReceizQualificationStatusV124;
    capability: string;
    reasonCode: string | null;
}>;
export type ReceizPublicRecipientProjectionV124 = Readonly<{
    status: ReceizRecipientResolutionStatusV124;
    locator: string | null;
}>;
export declare function closedRecord(value: unknown, expectedKeys: readonly string[], code: string): Readonly<Record<string, unknown>>;
export declare function text(value: unknown, code: string): string;
export declare function digest(value: unknown, code: string): string;
export declare function isReceizApplicationId(value: unknown): value is string;
export declare function applicationId(value: unknown, code: string): string;
export declare function domainId(value: unknown, code: string): string;
export declare function canonicalBytes(encoded: unknown, expectedDigest: unknown, code: string): Promise<Readonly<{
    value: unknown;
    digest: string;
}>>;
export declare function exactBase64Url(encoded: unknown, code: string): Uint8Array;
export declare function freeze<T>(value: T): T;
export declare function validateReceizOperationPlanV124(value: unknown): Promise<ReceizOperationPlanV124>;
//# sourceMappingURL=v124Contracts.d.ts.map