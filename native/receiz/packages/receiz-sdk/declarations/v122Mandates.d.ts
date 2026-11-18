export type ReceizSubjectMandateV122 = Readonly<{
    schema: "receiz.subject-mandate.v122";
    mandateId: string;
    ownerSubjectId: string;
    workerSubjectId: string;
    allowedCommandKinds: readonly string[];
    worldIds: readonly string[];
    regionIds: readonly string[];
    maximumResourcePhiMicro: string;
    maximumGeometryUnits: string;
    expiresAtKai: string;
    nonce: string;
    expectedOwnerHead: string;
    expectedWorkerHead: string;
    revocationHead: string;
    mandateDigest: string;
}>;
export declare function createReceizSubjectMandateV122(input: Omit<ReceizSubjectMandateV122, "schema" | "mandateId" | "mandateDigest">): Promise<ReceizSubjectMandateV122>;
export declare function validateReceizMandateUseV122(input: Readonly<{
    mandate: ReceizSubjectMandateV122;
    commandKind: string;
    worldId?: string;
    regionId?: string;
    resourcePhiMicro: string;
    geometryUnits: string;
    currentKai: string;
    ownerHead: string;
    workerHead: string;
    revocationHead: string;
}>): Promise<Readonly<{
    ok: true;
    mandateDigest: string;
}> | Readonly<{
    ok: false;
    code: string;
    writesOnFailure: 0;
}>>;
export declare function createReceizRemoteSubjectMandatesV122(request: <T>(path: string, options?: {
    method?: string;
    body?: Record<string, unknown>;
}) => Promise<T>): Readonly<{
    issue: (input: Readonly<Record<string, unknown>>) => Promise<unknown>;
    state: (input: Readonly<{
        mandateId: string;
    }>) => Promise<unknown>;
    revoke: (input: Readonly<Record<string, unknown>> & {
        mandateId: string;
    }) => Promise<unknown>;
}>;
//# sourceMappingURL=v122Mandates.d.ts.map