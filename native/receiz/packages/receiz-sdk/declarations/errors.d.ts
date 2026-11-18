export type ReceizErrorRail = "identity" | "proof" | "continuity" | "offline" | "ownership" | "settlement" | "publicStore" | "commerce" | "media" | "world" | "webhook" | "compiler" | "testing" | "mcp" | "sdk";
export type ReceizErrorDescriptor = Readonly<{
    schema: "receiz.sdk.error.v1";
    code: string;
    message: string;
    rail: ReceizErrorRail;
    retryable: boolean;
    missingScope?: string;
    documentationUrl: string;
    suggestedRepair: string;
    authorityBoundary: string;
}>;
export type ReceizErrorContext = Readonly<{
    rail?: ReceizErrorRail;
    retryable?: boolean;
    missingScope?: string;
    documentationUrl?: string;
    suggestedRepair?: string;
    authorityBoundary?: string;
}>;
export declare function sanitizeReceizErrorMessage(message: string): string;
export declare class ReceizError<Code extends string = string> extends Error {
    readonly code: Code;
    readonly descriptor: ReceizErrorDescriptor;
    constructor(code: Code, message: string, context?: ReceizErrorContext);
}
export declare function describeReceizError(error: unknown, context?: ReceizErrorContext): ReceizErrorDescriptor;
//# sourceMappingURL=errors.d.ts.map