export declare const RECEIZ_MATERIAL_FRAGMENT_KEY: "material";
export declare const RECEIZ_MATERIAL_CAPSULE_PREFIX: "rma2:";
export declare const MAX_RECEIZ_MATERIAL_CAPSULE_BYTES = 4294967295;
export type ReceizMaterialCapsule = Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
}>;
export declare function encodeReceizMaterialCapsuleBytes(input: Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
}>): Uint8Array;
export type ReceizPlayableMaterialKind = "image" | "audio" | "video" | "pdf" | "text" | "binary";
export type VerifiedReceizMaterialUrlProjection = Readonly<{
    exactSealedArtifactBytes: Uint8Array;
    sealedFilename: string;
    sealedMimeType: string;
    sealedArtifactSha256: string;
    payloadBytes: Uint8Array;
    payloadFilename: string;
    payloadMimeType: string;
    payloadSha256: string;
    playableKind: ReceizPlayableMaterialKind;
    canonicalReceizPath: string;
    canonicalReceizUrl: string;
    presentationUrl: string;
    authority: Readonly<{
        sdkIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type OpenVerifiedReceizMaterialUrlOptions = Readonly<{
    sourceUrls?: readonly string[];
    fetcher?: typeof fetch;
    receizOrigin?: string;
}>;
export declare function encodeReceizMaterialCapsule(input: Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
}>): string;
export declare function decodeReceizMaterialCapsuleBytes(carried: Uint8Array): ReceizMaterialCapsule;
export declare function decodeReceizMaterialCapsule(token: string): ReceizMaterialCapsule;
export declare function readReceizMaterialCapsuleFromUrl(materialUrl: string | URL): ReceizMaterialCapsule | null;
/** Receiz-owned v/ routes bind their presented path; external domains remain projection wrappers beneath artifact truth. */
export declare function receizMaterialPresentedLinkForVerification(materialUrl: string | URL): string | undefined;
/** Verifies the enclosing proof object before projecting its exact native payload bytes. */
export declare function openVerifiedReceizMaterialUrl(materialUrl: string | URL, options?: OpenVerifiedReceizMaterialUrlOptions): Promise<VerifiedReceizMaterialUrlProjection>;
export declare function createReceizPlayableMaterialObjectUrl(verified: VerifiedReceizMaterialUrlProjection): Readonly<{
    url: string;
    revoke: () => void;
    kind: ReceizPlayableMaterialKind;
    mimeType: string;
    filename: string;
}>;
//# sourceMappingURL=materialProofUrl.d.ts.map