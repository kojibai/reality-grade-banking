import { type ReceizDomainReplayCheckpointProofCarrierV124, type ReceizDomainReplayProofCarrierV124, type ReceizDomainReplayProofHeadV124, type ReceizDomainReplayProofObjectRestorationV124, type ReceizDomainReplaySegmentSourceExpectationV124, type ReceizReadDomainReplayCheckpointSourceV124, type ReceizReadDomainReplaySegmentSourceV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
export type ReceizNamespaceProjectionV124 = Readonly<{
    name: string;
    exactBytesB64u: string;
    digest: string;
    head: string;
}>;
export type ReceizDomainReplayAdditionV124 = Readonly<{
    appendId: string;
    sequence: number;
    cursor: number;
    exactEventBytesB64u: string;
    eventDigest: string;
    causalParents: readonly string[];
    priorHead: string;
    newHead: string;
    namespaceHead: string;
    namespaceDigest: string;
}>;
export type ReceizDomainReplayExpectationV124 = Readonly<{
    applicationId: string;
    domainId: string;
    afterHead?: string | null;
    expectedRegistryDigest: string;
    expectedReducerDigest: string;
}>;
export type ReceizDomainReplayV124 = Readonly<{
    schema: "receiz.domain.replay.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    afterHead: string | null;
    afterCursor: number;
    cursor: number;
    priorHead: string;
    head: string;
    namespace: ReceizNamespaceProjectionV124;
    additions: readonly ReceizDomainReplayAdditionV124[];
    receiptDigest: string;
    authority: Readonly<{
        replayIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizDomainReplayReceiptV124 = Readonly<{
    schema: "receiz.domain.replay-receipt.v124";
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    afterHead: string | null;
    priorHead: string;
    head: string;
    afterCursor: number;
    cursor: number;
    namespace: Readonly<{
        name: string;
        head: string;
        digest: string;
    }>;
    additionsDigest: string;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizCheckpointV124 = Readonly<{
    schema: "receiz.domain.checkpoint.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    throughHead: string;
    cursor: number;
    namespace: ReceizNamespaceProjectionV124;
    exactCheckpointBytesB64u: string;
    checkpointDigest: string;
    receiptDigest: string;
    authority: Readonly<{
        checkpointIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCheckpointReceiptV124 = Readonly<{
    schema: "receiz.domain.checkpoint-receipt.v124";
    applicationId: string;
    domainId: string;
    registryDigest: string;
    reducerDigest: string;
    throughHead: string;
    cursor: number;
    namespace: Readonly<{
        name: string;
        head: string;
        digest: string;
    }>;
    checkpointDigest: string;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizCheckpointExpectationV124 = Readonly<{
    replay: ReceizDomainReplayV124;
}>;
export type ReceizVerifiedDomainReplaySegmentSourceV124 = ReceizReadDomainReplaySegmentSourceV124;
export type ReceizVerifiedDomainReplayCheckpointSourceV124 = ReceizReadDomainReplayCheckpointSourceV124;
export type ReceizDomainReplayProofObjectRestoreInputV124 = Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    applicationId: string;
    domainId: string;
    expectedRegistryDigest: string;
    expectedReducerDigest: string;
    expectedHead: string;
    expectedCursor: number;
    expectedNamespace: Readonly<{
        name: string;
        head: string;
        digest: string;
    }>;
}>;
/** The signed envelope is transport only; this consumes its prior pinned source admission. */
export declare function admitReceizDomainReplayRuntimeWireV124(value: unknown, previous?: ReceizDomainReplayV124): Promise<ReceizDomainReplayV124>;
export declare function validateReceizDomainReplayV124(value: unknown, expected: ReceizDomainReplayExpectationV124): Promise<ReceizDomainReplayV124>;
export declare const validateReceizReplayV124: typeof validateReceizDomainReplayV124;
export declare function isReceizVerifiedDomainReplayV124(value: unknown): value is ReceizDomainReplayV124;
export declare function readReceizVerifiedDomainReplaySourceV124(value: unknown): ReceizVerifiedDomainReplaySegmentSourceV124;
export declare function readReceizVerifiedDomainReplaySourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124;
export declare function restoreReceizDomainReplaySegmentSourceV124(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    expected: ReceizDomainReplaySegmentSourceExpectationV124;
    predecessorArtifact?: ReceizPortableSealedArtifactV124;
}>): Promise<ReceizVerifiedDomainReplaySegmentSourceV124>;
export declare function admitReceizCheckpointRuntimeWireV124(value: unknown): Promise<ReceizCheckpointV124>;
export declare function validateReceizCheckpointV124(value: unknown, expected: ReceizCheckpointExpectationV124): Promise<ReceizCheckpointV124>;
export declare function isReceizVerifiedCheckpointV124(value: unknown): value is ReceizCheckpointV124;
export declare function readReceizVerifiedCheckpointSourceV124(value: unknown): ReceizVerifiedDomainReplayCheckpointSourceV124;
export declare function readReceizVerifiedCheckpointSourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124;
export declare function restoreReceizDomainReplayCheckpointSourceV124(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    expectedAudience: string;
    replaySource: ReceizVerifiedDomainReplaySegmentSourceV124;
}>): Promise<ReceizVerifiedDomainReplayCheckpointSourceV124>;
/** Restores the constant-width nested exact-source bundle, then installs custody. */
export declare function restoreReceizDomainReplayProofCarrierV124(input: ReceizDomainReplayProofObjectRestoreInputV124, options: Readonly<{
    expectedAudience: string;
}>): Promise<Readonly<{
    restoration: ReceizDomainReplayProofObjectRestorationV124;
    replaySource: ReceizVerifiedDomainReplaySegmentSourceV124;
    checkpointSource: ReceizVerifiedDomainReplayCheckpointSourceV124 | null;
}>>;
export declare function compareReceizVerifiedDomainReplaySourcesV124(left: ReceizVerifiedDomainReplaySegmentSourceV124, right: ReceizVerifiedDomainReplaySegmentSourceV124): number;
export declare function readReceizVerifiedDomainReplayHeadV124(value: unknown): ReceizDomainReplayProofHeadV124;
export declare function readReceizVerifiedCheckpointCarrierV124(value: unknown): ReceizDomainReplayCheckpointProofCarrierV124;
export declare function createReceizDomainReplayCustodyCarrierV124(input: Readonly<{
    replay: ReceizDomainReplayV124;
    checkpoint?: ReceizCheckpointV124 | null;
}>): ReceizDomainReplayProofCarrierV124;
//# sourceMappingURL=v124Replay.d.ts.map