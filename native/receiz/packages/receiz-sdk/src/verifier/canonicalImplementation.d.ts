export function classifyReceizAssetContinuity(
  originalBytes: Uint8Array,
  bundle?: Readonly<Record<string, unknown>> | null,
): Promise<unknown>;

export function verifyReceizDocumentBytes(input: unknown): Promise<unknown>;
export function verifyReceizTrailerBundleDigest(input: unknown): Promise<unknown>;
export function readReceizCurrentTrailerBundleDigest(input: unknown): Promise<unknown>;
export function readVerifiedReceizDocumentBytes(input: unknown): Promise<unknown>;
export function verifyAndExtractReceizDocumentBytes(input: unknown): Promise<unknown>;
export function verifyReceizFolderFiles(input: unknown): Promise<unknown>;
export function verifyReceizArtifactBytes(input: unknown): Promise<unknown>;

export function inspectReceizZipBytes(input: unknown): Promise<unknown>;
export function readVerifiedReceizFolderPackageBytes(input: unknown): Promise<unknown>;

export function currentReceizTrailerCompleteExecutionReason(input: unknown): "declared-normalization" | "structured-reconstruction" | "legacy-interpretation" | null;
export function currentReceizVerificationRuntimeAvailable(): Promise<boolean>;
