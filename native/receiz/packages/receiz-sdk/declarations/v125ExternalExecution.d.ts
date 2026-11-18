export type ReceizExternalExecutionKindV125 = "payment" | "refund" | "notification" | "external-action";
export type ReceizExternalExecutionTerminalStatusV125 = "succeeded" | "failed" | "canceled" | "expired";
export type ReceizExternalExecutionProfileV125 = Readonly<{
    schema: "receiz.external-execution.profile.v125";
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestSchema: string;
    providerEvidenceSchema: string;
    requiredProofHeads: readonly string[];
    terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
    privacy: Readonly<{
        modelVisibleFields: readonly string[];
    }>;
    authority: Readonly<{
        providerIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizExternalExecutionPlanV125 = Readonly<{
    schema: "receiz.external-execution.plan.v125";
    operationId: string;
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestDigest: string;
    proofHeads: Readonly<Record<string, string>>;
    idempotencyKey: string;
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    writesPerformed: 0;
    authority: Readonly<{
        planIsOutcome: false;
        providerIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizExternalExecutionOutcomeV125 = Readonly<{
    schema: "receiz.external-execution.outcome.v125";
    operationId: string;
    profileId: string;
    planIdentity: string;
    requestDigest: string;
    proofHeads: Readonly<Record<string, string>>;
    providerEvidenceDigest: string;
    terminalStatus: ReceizExternalExecutionTerminalStatusV125;
    resolvedKai: string;
    outcomeDigest: string;
    durableHandle: string;
    authority: Readonly<{
        providerIsAuthority: false;
        receiptIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizExternalExecutionResolutionV125 = Readonly<{
    status: "committed";
    outcome: ReceizExternalExecutionOutcomeV125;
    writesPerformed: 1;
}> | Readonly<{
    status: "pending";
    code: "V125_EXTERNAL_EXECUTION_PENDING";
    writesPerformed: 0;
}> | Readonly<{
    status: "unknown";
    code: "V125_EXTERNAL_EXECUTION_UNKNOWN";
    writesPerformed: 0;
}>;
export type ReceizExternalExecutionProviderRequestV125 = Readonly<{
    operationId: string;
    planIdentity: string;
    requestDigest: string;
    idempotencyKey: string;
}>;
export type ReceizExternalExecutionProviderV125 = (request: ReceizExternalExecutionProviderRequestV125) => Promise<Readonly<{
    status: string;
    evidence: unknown;
}>>;
export type ReceizExternalExecutionStoreV125 = Readonly<{
    load(planIdentity: string): Promise<ReceizExternalExecutionOutcomeV125 | null>;
    claimIdempotency(idempotencyKey: string, planIdentity: string): Promise<string | null>;
    saveIfAbsent(outcome: ReceizExternalExecutionOutcomeV125): Promise<ReceizExternalExecutionOutcomeV125>;
}>;
export declare class ReceizExternalExecutionZeroWriteErrorV125 extends TypeError {
    readonly code: string;
    readonly writesPerformed: 0;
    constructor(code: string);
}
export declare function createReceizExternalExecutionProfileV125(input: Readonly<{
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestSchema: string;
    providerEvidenceSchema: string;
    requiredProofHeads: readonly string[];
    terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
    privacy: Readonly<{
        modelVisibleFields: readonly string[];
    }>;
}>): ReceizExternalExecutionProfileV125;
export declare function planReceizExternalExecutionV125(input: Readonly<{
    profile: ReceizExternalExecutionProfileV125;
    operationId: string;
    request: unknown;
    proofHeads: Readonly<Record<string, string>>;
    idempotencyKey: string;
}>): Promise<ReceizExternalExecutionPlanV125>;
export declare function verifyReceizExternalExecutionPlanV125(input: Readonly<{
    profile: ReceizExternalExecutionProfileV125;
    plan: ReceizExternalExecutionPlanV125;
    request: unknown;
}>): Promise<boolean>;
export declare function verifyReceizExternalExecutionOutcomeV125(input: Readonly<{
    profile: ReceizExternalExecutionProfileV125;
    plan: ReceizExternalExecutionPlanV125;
    outcome: ReceizExternalExecutionOutcomeV125;
}>): Promise<boolean>;
export declare function createReceizExternalExecutionRuntimeV125(input?: Readonly<{
    store?: ReceizExternalExecutionStoreV125;
}>): {
    execute: (request: Readonly<{
        profile: ReceizExternalExecutionProfileV125;
        plan: ReceizExternalExecutionPlanV125;
        request: unknown;
        confirmationDigest: string;
        resolvedKai: string;
        provider: ReceizExternalExecutionProviderV125;
    }>) => Promise<ReceizExternalExecutionResolutionV125>;
    recover(input: Readonly<{
        planIdentity: string;
        durableHandle: string;
    }>): Promise<{
        status: "unknown";
        code: "V125_EXTERNAL_EXECUTION_UNKNOWN";
        writesPerformed: 0;
    } | {
        status: "committed";
        outcome: Readonly<{
            schema: "receiz.external-execution.outcome.v125";
            operationId: string;
            profileId: string;
            planIdentity: string;
            requestDigest: string;
            proofHeads: Readonly<Record<string, string>>;
            providerEvidenceDigest: string;
            terminalStatus: ReceizExternalExecutionTerminalStatusV125;
            resolvedKai: string;
            outcomeDigest: string;
            durableHandle: string;
            authority: Readonly<{
                providerIsAuthority: false;
                receiptIsAuthority: false;
                strongerTruth: "sealed-receiz-proof-object";
            }>;
        }>;
        writesPerformed: 0;
    }>;
};
export declare const RECEIZ_PAYMENT_EXECUTION_PROFILE_V125: Readonly<{
    schema: "receiz.external-execution.profile.v125";
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestSchema: string;
    providerEvidenceSchema: string;
    requiredProofHeads: readonly string[];
    terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
    privacy: Readonly<{
        modelVisibleFields: readonly string[];
    }>;
    authority: Readonly<{
        providerIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare const RECEIZ_REFUND_EXECUTION_PROFILE_V125: Readonly<{
    schema: "receiz.external-execution.profile.v125";
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestSchema: string;
    providerEvidenceSchema: string;
    requiredProofHeads: readonly string[];
    terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
    privacy: Readonly<{
        modelVisibleFields: readonly string[];
    }>;
    authority: Readonly<{
        providerIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare const RECEIZ_NOTIFICATION_EXECUTION_PROFILE_V125: Readonly<{
    schema: "receiz.external-execution.profile.v125";
    profileId: string;
    operationKind: ReceizExternalExecutionKindV125;
    requestSchema: string;
    providerEvidenceSchema: string;
    requiredProofHeads: readonly string[];
    terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
    privacy: Readonly<{
        modelVisibleFields: readonly string[];
    }>;
    authority: Readonly<{
        providerIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
//# sourceMappingURL=v125ExternalExecution.d.ts.map