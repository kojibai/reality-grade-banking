export type ReceizNativeCaptureV1 = Readonly<{
    schema: "receiz.native_capture.v1";
    source: "camera";
    mediaKind: "photo" | "video";
    sourceSha256: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    requestedFacingMode: "user" | "environment" | null;
    captureSessionCommitment: string;
    capturedAt: string;
    kaiUpulse: string;
    ownerReceizId: string;
    coordinates: Readonly<{
        slug: string;
        code: string;
        pulse: string;
        verifyPath: string;
    }>;
    commitmentSha256: string;
}>;
export type ReceizNativeCaptureV1Input = Readonly<{
    source: string;
    mediaKind: "photo" | "video";
    sourceBytes: Uint8Array;
    mimeType: string;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    requestedFacingMode: "user" | "environment" | null;
    captureSessionCommitment: string;
    capturedAt: string;
    kaiUpulse: string;
    ownerReceizId: string;
    coordinates: ReceizNativeCaptureV1["coordinates"];
}>;
export type ReceizNativeCaptureV1VerificationInput = Readonly<{
    sourceBytes: Uint8Array;
    coordinates: ReceizNativeCaptureV1["coordinates"];
}>;
export declare function createReceizNativeCaptureV1(input: ReceizNativeCaptureV1Input): Promise<ReceizNativeCaptureV1>;
export declare function verifyReceizNativeCaptureV1(value: unknown, expected: ReceizNativeCaptureV1VerificationInput): Promise<ReceizNativeCaptureV1 | null>;
export declare function verifyReceizNativeCaptureCommitmentV1(value: unknown, coordinates: ReceizNativeCaptureV1["coordinates"]): Promise<ReceizNativeCaptureV1 | null>;
//# sourceMappingURL=nativeCapture.d.ts.map