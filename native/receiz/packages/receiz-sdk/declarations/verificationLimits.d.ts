export declare const RECEIZ_V113_PROTOCOL_LIMITS: Readonly<{
    readonly exactArtifactBytes: number;
    readonly archiveEntries: 5000;
    readonly singleDecompressedEntryBytes: number;
    readonly totalDecompressedBytes: number;
    readonly rootArchiveContainerDepth: 1;
    readonly embeddedArchiveNesting: 0;
    readonly perEntryCompressionRatio: 200;
    readonly aggregateCompressionRatio: 100;
    readonly canonicalArchivePathBytes: 1024;
    readonly archiveEntryNameBytes: 255;
    readonly manifestBytes: number;
    readonly verifiedHistoryNodes: 4096;
    readonly reconciliationAdditions: 64;
    readonly remotePredecessorFetches: 256;
    readonly artifactNamespaces: 256;
    readonly reducerOperations: 4096;
    readonly lawExpressionOperations: 4096;
}>;
export declare const RECEIZ_V114_PROTOCOL_LIMITS: Readonly<{
    readonly exactArtifactBytes: number;
    readonly archiveEntries: 5000;
    readonly singleDecompressedEntryBytes: number;
    readonly totalDecompressedBytes: number;
    readonly rootArchiveContainerDepth: 1;
    readonly embeddedArchiveNesting: 0;
    readonly perEntryCompressionRatio: 200;
    readonly aggregateCompressionRatio: 100;
    readonly canonicalArchivePathBytes: 1024;
    readonly archiveEntryNameBytes: 255;
    readonly manifestBytes: number;
    readonly verifiedHistoryNodes: 4096;
    readonly reconciliationAdditions: 64;
    readonly remotePredecessorFetches: 256;
    readonly artifactNamespaces: 256;
    readonly reducerOperations: 4096;
    readonly lawExpressionOperations: 4096;
}>;
/**
 * Default universal-runtime contiguous-memory ceiling. Inputs above this
 * threshold remain protocol-valid but require a streaming/spooled verifier;
 * the in-memory verifier returns an operational denial before reading them.
 */
export declare const RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS: Readonly<{
    readonly exactArtifactBytes: number;
    readonly decompressedArchiveBytes: number;
    readonly transportedHistoryNodes: 16384;
}>;
export declare const RECEIZ_V114_RUNTIME_MATERIALIZATION_LIMITS: Readonly<{
    readonly exactArtifactBytes: number;
    readonly decompressedArchiveBytes: number;
    readonly transportedHistoryNodes: 16384;
}>;
export type ReceizProtocolLimitResource = keyof typeof RECEIZ_V113_PROTOCOL_LIMITS;
export type ReceizProtocolLimitCode = "ARTIFACT_TOO_LARGE" | "ARCHIVE_LIMIT_EXCEEDED" | "ARCHIVE_PATH_INVALID" | "ARCHIVE_COMPRESSION_LIMIT_EXCEEDED" | "ARCHIVE_RECURSION_FORBIDDEN" | "HISTORY_TOO_DEEP" | "RECONCILIATION_BATCH_TOO_LARGE" | "PREDECESSOR_FETCH_LIMIT_EXCEEDED" | "NAMESPACE_LIMIT_EXCEEDED" | "VERIFICATION_BUDGET_EXCEEDED" | "VERIFICATION_RESOURCE_UNAVAILABLE";
export declare class ReceizProtocolLimitError extends Error {
    readonly code: ReceizProtocolLimitCode;
    readonly resource: ReceizProtocolLimitResource | keyof typeof RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS | "archive-structure" | "verification-runtime";
    readonly observed?: number | undefined;
    readonly maximum?: number | undefined;
    readonly artifactValidity: "not-evaluated";
    constructor(code: ReceizProtocolLimitCode, resource: ReceizProtocolLimitResource | keyof typeof RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS | "archive-structure" | "verification-runtime", observed?: number | undefined, maximum?: number | undefined);
}
export declare function assertReceizRuntimeMaterializationAvailable(resource: keyof typeof RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS, observed: number): void;
export declare function assertReceizProtocolMaximum(resource: ReceizProtocolLimitResource, observed: number): void;
export type ReceizVerificationOperationalDenial = Readonly<{
    status: "operational-denial";
    code: "VERIFICATION_BUDGET_EXCEEDED" | "VERIFICATION_RESOURCE_UNAVAILABLE";
    artifactValidity: "not-evaluated";
}>;
export type ReceizProtocolOperationalDenial = Readonly<{
    status: "operational-denial";
    code: ReceizProtocolLimitCode;
    artifactValidity: "not-evaluated";
}>;
export declare function receizProtocolOperationalDenial(code: ReceizProtocolLimitCode): ReceizProtocolOperationalDenial;
export declare function classifyReceizVerificationResourceFailure(failure: "budget" | "resource"): ReceizVerificationOperationalDenial;
export type ReceizArchiveEntryKind = "file" | "directory" | "archive" | "symlink" | "hardlink";
export type ReceizArchiveEntryObservation = Readonly<{
    path: string;
    compressedBytes: number;
    declaredDecompressedBytes?: number;
    kind: ReceizArchiveEntryKind;
    manifest?: boolean;
}>;
export type ReceizArchiveVerificationGuard = Readonly<{
    beginEntry(input: ReceizArchiveEntryObservation): string;
    observeDecompressedChunk(byteLength: number): void;
    endEntry(): void;
    snapshot(): Readonly<{
        entries: number;
        compressedBytes: number;
        decompressedBytes: number;
    }>;
}>;
export declare function createReceizArchiveVerificationGuard(options?: Readonly<{
    rootDepth?: number;
}>): ReceizArchiveVerificationGuard;
export type ReceizRecursiveArchiveFormat = "zip" | "gzip" | "bzip2" | "xz" | "7z" | "rar" | "tar";
/** Detects supported recursive archive carriers from bytes, never filename extensions. */
export declare function detectReceizRecursiveArchiveFormat(bytes: Uint8Array): ReceizRecursiveArchiveFormat | null;
export type ReceizRemotePredecessorFetchBudget = Readonly<{
    observeFetch(): number;
    consumed(): number;
}>;
export declare function createReceizRemotePredecessorFetchBudget(): ReceizRemotePredecessorFetchBudget;
export declare function assertReceizReconciliationAdditionBudget(additionCount: number, orderedAdditionCount: number): void;
//# sourceMappingURL=verificationLimits.d.ts.map