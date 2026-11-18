export type ReceizV125LawfulActionProofObjectInput = Readonly<{
    exactBytes: Uint8Array;
    filename: string;
    mimeType: string;
}>;
export type ReceizV125LawfulActionClientOptions = Readonly<{
    baseUrl: string;
    applicationId: string;
    getAccessToken(): string | Promise<string>;
    fetch?: typeof globalThis.fetch;
}>;
export declare function createReceizV125LawfulActionClient(options: ReceizV125LawfulActionClientOptions): Readonly<{
    registerLaw(input: Readonly<{
        proofObject: ReceizV125LawfulActionProofObjectInput;
        idempotencyKey: string;
    }>): Promise<Record<string, unknown>>;
    admit(input: Readonly<{
        lawDigest: string;
        proofObject: ReceizV125LawfulActionProofObjectInput;
        expectedPriorAdmissionDigest: string | null;
        idempotencyKey: string;
    }>): Promise<Record<string, unknown>>;
    deriveValueHead(input: Readonly<{
        membershipId: string;
        expectedPriorValueHeadDigest: string | null;
    }>): Promise<Record<string, unknown>>;
}>;
/** Shared SDK/MCP transport. A trusted MCP host may retain its existing token
 * application binding without a query hint; source admission remains unchanged. */
export declare function createReceizV125LawfulActionTransport(options: Omit<ReceizV125LawfulActionClientOptions, "applicationId"> & {
    applicationId?: string;
}): Readonly<{
    registerLaw(input: Readonly<{
        proofObject: ReceizV125LawfulActionProofObjectInput;
        idempotencyKey: string;
    }>): Promise<Record<string, unknown>>;
    admit(input: Readonly<{
        lawDigest: string;
        proofObject: ReceizV125LawfulActionProofObjectInput;
        expectedPriorAdmissionDigest: string | null;
        idempotencyKey: string;
    }>): Promise<Record<string, unknown>>;
    deriveValueHead(input: Readonly<{
        membershipId: string;
        expectedPriorValueHeadDigest: string | null;
    }>): Promise<Record<string, unknown>>;
}>;
//# sourceMappingURL=v125LawfulActionClient.d.ts.map