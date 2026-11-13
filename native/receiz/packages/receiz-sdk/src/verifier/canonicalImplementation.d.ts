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
export function appendReceizTrailer(input: {basisBytes:Uint8Array;bundle:unknown}):Uint8Array;
export function parseReceizTrailer(input:Uint8Array):{trailerCount:number;basisBytes:Uint8Array;bundle:unknown|null;parseError:string|null};

/** Existing native metadata codecs; transport composition issues no seal. */
export const authoredFileCarrier: {
 detectDocumentFormat(bytes:Uint8Array,hints?:{filename?:string;mime?:string}):string;
 readPngTextChunks(bytes:Uint8Array):{keyword:string;text:string}[];
 insertPngTextChunks(bytes:Uint8Array,entries:{keyword:string;text:string}[]):Uint8Array;
 stripPngTextChunksByKeyword(bytes:Uint8Array,keyword:string):{pngBytes:Uint8Array;removedCount:number};
 extractReceizProofBundlesFromPdf(bytes:Uint8Array):string[];
 embedReceizProofBundleIntoPdf(input:{pdfBytes:Uint8Array;encodedBundle:string}):Uint8Array;
 PDF_RECEIZ_UPDATE_MARKER:string;
 stripReceizJsonProof(bytes:Uint8Array):{encodedBundles:readonly string[];removedCount:number;parseError:string|null};
 embedReceizProofBundleIntoJson(input:{jsonBytes:Uint8Array;encodedBundle:string}):{jsonBytes:Uint8Array};
 parseReceizHeicProof(bytes:Uint8Array):{basisBytes:Uint8Array;proofCount:number;bundle:unknown;parseError:string|null};
 appendReceizHeicProof(input:{basisBytes:Uint8Array;bundle:unknown}):Uint8Array;
};
