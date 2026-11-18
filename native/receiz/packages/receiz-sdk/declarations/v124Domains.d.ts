import { type ReceizAuthenticatedRuntimeReceiptV124, type ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
import { type ReceizCheckpointV124, type ReceizDomainReplayExpectationV124, type ReceizDomainReplayV124 } from "./v124Replay.js";
import { type ReceizDomainReplayProofObjectExportInputV124, type ReceizDomainReplayProofObjectRestoreInputV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124DomainsRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
    wire: unknown;
    receipt: unknown;
}>>;
/** Source-internal options; neither the public domain call nor a route chooses audience authority. */
export type ReceizV124DomainsRuntimeOptions = Readonly<{
    audience: string;
}>;
export type ReceizPrivateDomainAdditionsInputV124 = Readonly<{
    applicationId: string;
    domainId: string;
    afterHead: string | null;
    authoritySessionHandle: string;
    accessGrantHandle: string;
    expectedViewerSubjectId: string;
    expectedViewerSubjectHead: string;
    expectedGrantHead: string;
}>;
type ReceizPrivateDomainAdditionBaseV124 = Readonly<{
    additionKind: "public" | "private";
    appendId: string;
    sequence: number;
    cursor: number;
    exactPublicEventBytesB64u: string;
    eventDigest: string;
    priorHead: string;
    newHead: string;
    domainHead: string;
}>;
export type ReceizPrivateDomainPublicAdditionV124 = ReceizPrivateDomainAdditionBaseV124 & Readonly<{
    additionKind: "public";
}>;
export type ReceizPrivateRecipientWrapProjectionV124 = Readonly<{
    recipientSubjectId: string;
    recipientAccessKeyHead: string;
    ephemeralPublicKeyJwk: JsonWebKey;
    nonceB64u: string;
    wrappedContentKeyB64u: string;
    wrapDigest: string;
}>;
/**
 * One-viewer projection of an enclosing sealed V122 envelope. Full-envelope
 * verification stays server-internal; transport carries only its committed
 * envelope digest, non-leaking event source, and this one-viewer projection.
 */
export type ReceizPrivateWorldEnvelopeProjectionV124 = Readonly<{
    schema: "receiz.world.private-envelope-projection.v124";
    worldId: string;
    visibilityMode: "private" | "invited";
    ciphertextB64u: string;
    nonceB64u: string;
    aadDigest: string;
    payloadDigest: string;
    envelopeDigest: string;
    recipientWrap: ReceizPrivateRecipientWrapProjectionV124;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizPrivateDomainEncryptedAdditionV124 = ReceizPrivateDomainAdditionBaseV124 & Readonly<{
    additionKind: "private";
    viewerSubjectId: string;
    viewerSubjectHead: string;
    grantHead: string;
    accessKeyHead: string;
    privateEnvelope: ReceizPrivateWorldEnvelopeProjectionV124;
    recipientWrapDigest: string;
}>;
export type ReceizPrivateDomainAdditionV124 = ReceizPrivateDomainPublicAdditionV124 | ReceizPrivateDomainEncryptedAdditionV124;
export type ReceizPrivateDomainAdditionsWireV124 = Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    afterHead: string | null;
    afterCursor: number;
    cursor: number;
    priorHead: string;
    head: string;
    viewerSubjectId: string;
    viewerSubjectHead: string;
    grantHead: string;
    accessKeyHead: string;
    additions: readonly ReceizPrivateDomainAdditionV124[];
    sourceArtifact: ReceizPortableSealedArtifactV124;
    viewerSubjectSourceArtifact: ReceizPortableSealedArtifactV124;
    accessGrantSourceArtifact: ReceizPortableSealedArtifactV124;
    authority: Readonly<{
        privateAdditionsAreProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}> | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "not-found-or-not-authorized";
}>;
export type ReceizPrivateDomainAdditionsResultV124 = Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    afterHead: string | null;
    afterCursor: number;
    cursor: number;
    priorHead: string;
    head: string;
    viewerSubjectId: string;
    viewerSubjectHead: string;
    grantHead: string;
    accessKeyHead: string;
    additions: readonly ReceizPrivateDomainAdditionV124[];
    authenticatedReceipt: ReceizAuthenticatedRuntimeReceiptV124;
    authority: Readonly<{
        privateAdditionsAreProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}> | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "not-found-or-not-authorized";
}>;
/** Source-internal V124 admission shared by every private-envelope custody path. */
export declare function closeEphemeralPublicKeyJwk(value: unknown): Promise<JsonWebKey>;
/** Source-internal server/client validator for the exact private-additions wire. */
export declare function validateReceizPrivateDomainAdditionsWireV124(value: unknown, expectation: ReceizPrivateDomainAdditionsInputV124): Promise<ReceizPrivateDomainAdditionsWireV124>;
/**
 * Source-internal domain client composition.  Its replay/checkpoint custody maps hold
 * only objects verified through Task 1 primitives; no caller can inject a predecessor.
 */
export declare function createReceizV124Domains(remote: ReceizV124DomainsRemoteV124, options: ReceizV124DomainsRuntimeOptions): {
    verifiedAdditionsV124: (value: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
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
        namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
        additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
        receiptDigest: string;
        authority: Readonly<{
            replayIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    verifiedAdditions: (value: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
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
        namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
        additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
        receiptDigest: string;
        authority: Readonly<{
            replayIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    verifiedReplayV124: (value: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
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
        namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
        additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
        receiptDigest: string;
        authority: Readonly<{
            replayIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    verifiedReplay: (value: ReceizDomainReplayExpectationV124) => Promise<Readonly<{
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
        namespace: import("./v124Replay.js").ReceizNamespaceProjectionV124;
        additions: readonly import("./v124Replay.js").ReceizDomainReplayAdditionV124[];
        receiptDigest: string;
        authority: Readonly<{
            replayIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    verifiedCheckpointV124: (value: Readonly<{
        applicationId: string;
        domainId: string;
        throughHead: string;
    }>) => Promise<ReceizCheckpointV124>;
    verifiedCheckpoint: (value: Readonly<{
        applicationId: string;
        domainId: string;
        throughHead: string;
    }>) => Promise<ReceizCheckpointV124>;
    exportVerifiedReplayProofObjectV124: (value: ReceizDomainReplayProofObjectExportInputV124) => Promise<Readonly<{
        schema: "receiz.domain-replay-proof-object-export.v124";
        applicationId: string;
        domainId: string;
        registryDigest: string;
        reducerDigest: string;
        throughHead: string;
        cursor: number;
        namespace: import("./v124ReplayProofObject.js").ReceizDomainReplayNamespaceHeadV124;
        portableAssetDigest: string;
        proofObject: Readonly<{
            assetType: "proof_object";
            payload: Readonly<{
                mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
                bytes: Uint8Array;
            }>;
        }>;
        authority: Readonly<{
            exportIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    exportVerifiedReplayProofObject: (value: ReceizDomainReplayProofObjectExportInputV124) => Promise<Readonly<{
        schema: "receiz.domain-replay-proof-object-export.v124";
        applicationId: string;
        domainId: string;
        registryDigest: string;
        reducerDigest: string;
        throughHead: string;
        cursor: number;
        namespace: import("./v124ReplayProofObject.js").ReceizDomainReplayNamespaceHeadV124;
        portableAssetDigest: string;
        proofObject: Readonly<{
            assetType: "proof_object";
            payload: Readonly<{
                mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
                bytes: Uint8Array;
            }>;
        }>;
        authority: Readonly<{
            exportIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    restoreVerifiedReplayProofObjectV124: (value: ReceizDomainReplayProofObjectRestoreInputV124) => Promise<Readonly<{
        schema: "receiz.domain-replay-proof-object-restoration.v124";
        status: "restored";
        replay: ReceizDomainReplayV124;
        checkpoint: ReceizCheckpointV124 | null;
        sourceArtifactSha256: string;
        checkpointSourceArtifactSha256: string | null;
        headDigest: string;
        sourceAuthority: import("./v124ReplayProofObject.js").ReceizDomainReplaySourceAuthorityV124;
        authority: Readonly<{
            restorationIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    restoreVerifiedReplayProofObject: (value: ReceizDomainReplayProofObjectRestoreInputV124) => Promise<Readonly<{
        schema: "receiz.domain-replay-proof-object-restoration.v124";
        status: "restored";
        replay: ReceizDomainReplayV124;
        checkpoint: ReceizCheckpointV124 | null;
        sourceArtifactSha256: string;
        checkpointSourceArtifactSha256: string | null;
        headDigest: string;
        sourceAuthority: import("./v124ReplayProofObject.js").ReceizDomainReplaySourceAuthorityV124;
        authority: Readonly<{
            restorationIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>>;
    verifiedPrivateAdditionsV124: (value: ReceizPrivateDomainAdditionsInputV124) => Promise<ReceizPrivateDomainAdditionsResultV124>;
    verifiedPrivateAdditions: (value: ReceizPrivateDomainAdditionsInputV124) => Promise<ReceizPrivateDomainAdditionsResultV124>;
};
export {};
//# sourceMappingURL=v124Domains.d.ts.map