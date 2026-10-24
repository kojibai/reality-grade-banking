const MEBIBYTE = 1024 * 1024;

export const RECEIZ_V113_PROTOCOL_LIMITS = Object.freeze({
  exactArtifactBytes: 500 * MEBIBYTE,
  archiveEntries: 5_000,
  singleDecompressedEntryBytes: 1024 * MEBIBYTE,
  totalDecompressedBytes: 2 * 1024 * MEBIBYTE,
  rootArchiveContainerDepth: 1,
  embeddedArchiveNesting: 0,
  perEntryCompressionRatio: 200,
  aggregateCompressionRatio: 100,
  canonicalArchivePathBytes: 1_024,
  archiveEntryNameBytes: 255,
  manifestBytes: 16 * MEBIBYTE,
  verifiedHistoryNodes: 4_096,
  reconciliationAdditions: 64,
  remotePredecessorFetches: 256,
  artifactNamespaces: 256,
  reducerOperations: 4_096,
  lawExpressionOperations: 4_096,
} as const);
export const RECEIZ_V114_PROTOCOL_LIMITS = RECEIZ_V113_PROTOCOL_LIMITS;

/**
 * Default universal-runtime contiguous-memory ceiling. Inputs above this
 * threshold remain protocol-valid but require a streaming/spooled verifier;
 * the in-memory verifier returns an operational denial before reading them.
 */
export const RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS = Object.freeze({
  exactArtifactBytes: 16 * MEBIBYTE,
  decompressedArchiveBytes: 16 * MEBIBYTE,
  transportedHistoryNodes: 16_384,
} as const);
export const RECEIZ_V114_RUNTIME_MATERIALIZATION_LIMITS = RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS;

export type ReceizProtocolLimitResource = keyof typeof RECEIZ_V113_PROTOCOL_LIMITS;

export type ReceizProtocolLimitCode =
  | "ARTIFACT_TOO_LARGE"
  | "ARCHIVE_LIMIT_EXCEEDED"
  | "ARCHIVE_PATH_INVALID"
  | "ARCHIVE_COMPRESSION_LIMIT_EXCEEDED"
  | "ARCHIVE_RECURSION_FORBIDDEN"
  | "HISTORY_TOO_DEEP"
  | "RECONCILIATION_BATCH_TOO_LARGE"
  | "PREDECESSOR_FETCH_LIMIT_EXCEEDED"
  | "NAMESPACE_LIMIT_EXCEEDED"
  | "VERIFICATION_BUDGET_EXCEEDED"
  | "VERIFICATION_RESOURCE_UNAVAILABLE";

const RESOURCE_CODES = Object.freeze({
  exactArtifactBytes: "ARTIFACT_TOO_LARGE",
  archiveEntries: "ARCHIVE_LIMIT_EXCEEDED",
  singleDecompressedEntryBytes: "ARCHIVE_LIMIT_EXCEEDED",
  totalDecompressedBytes: "ARCHIVE_LIMIT_EXCEEDED",
  rootArchiveContainerDepth: "ARCHIVE_RECURSION_FORBIDDEN",
  embeddedArchiveNesting: "ARCHIVE_RECURSION_FORBIDDEN",
  perEntryCompressionRatio: "ARCHIVE_COMPRESSION_LIMIT_EXCEEDED",
  aggregateCompressionRatio: "ARCHIVE_COMPRESSION_LIMIT_EXCEEDED",
  canonicalArchivePathBytes: "ARCHIVE_PATH_INVALID",
  archiveEntryNameBytes: "ARCHIVE_PATH_INVALID",
  manifestBytes: "ARCHIVE_LIMIT_EXCEEDED",
  verifiedHistoryNodes: "HISTORY_TOO_DEEP",
  reconciliationAdditions: "RECONCILIATION_BATCH_TOO_LARGE",
  remotePredecessorFetches: "PREDECESSOR_FETCH_LIMIT_EXCEEDED",
  artifactNamespaces: "NAMESPACE_LIMIT_EXCEEDED",
  reducerOperations: "VERIFICATION_BUDGET_EXCEEDED",
  lawExpressionOperations: "VERIFICATION_BUDGET_EXCEEDED",
} as const satisfies Readonly<Record<ReceizProtocolLimitResource, ReceizProtocolLimitCode>>);

export class ReceizProtocolLimitError extends Error {
  readonly artifactValidity = "not-evaluated" as const;

  constructor(
    readonly code: ReceizProtocolLimitCode,
    readonly resource: ReceizProtocolLimitResource | keyof typeof RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS | "archive-structure" | "verification-runtime",
    readonly observed?: number,
    readonly maximum?: number,
  ) {
    super(code);
    this.name = "ReceizProtocolLimitError";
  }
}

export function assertReceizRuntimeMaterializationAvailable(
  resource: keyof typeof RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS,
  observed: number,
): void {
  const maximum = RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS[resource];
  if (!Number.isSafeInteger(observed) || observed < 0 || observed > maximum) {
    throw new ReceizProtocolLimitError(
      "VERIFICATION_RESOURCE_UNAVAILABLE",
      resource,
      observed,
      maximum,
    );
  }
}

export function assertReceizProtocolMaximum(
  resource: ReceizProtocolLimitResource,
  observed: number,
): void {
  const maximum = RECEIZ_V113_PROTOCOL_LIMITS[resource];
  if (!Number.isSafeInteger(observed) || observed < 0 || observed > maximum) {
    throw new ReceizProtocolLimitError(RESOURCE_CODES[resource], resource, observed, maximum);
  }
}

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

export function receizProtocolOperationalDenial(
  code: ReceizProtocolLimitCode,
): ReceizProtocolOperationalDenial {
  return Object.freeze({ status: "operational-denial", code, artifactValidity: "not-evaluated" });
}

export function classifyReceizVerificationResourceFailure(
  failure: "budget" | "resource",
): ReceizVerificationOperationalDenial {
  return Object.freeze({
    status: "operational-denial",
    code: failure === "budget" ? "VERIFICATION_BUDGET_EXCEEDED" : "VERIFICATION_RESOURCE_UNAVAILABLE",
    artifactValidity: "not-evaluated",
  });
}

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
  snapshot(): Readonly<{ entries: number; compressedBytes: number; decompressedBytes: number }>;
}>;

const UTF8 = new TextEncoder();
const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:\//u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;

function invalidPath(): never {
  throw new ReceizProtocolLimitError("ARCHIVE_PATH_INVALID", "archive-structure");
}

function canonicalArchivePath(input: string, directory: boolean): string {
  if (!input || input !== input.trim() || input.includes("\\") || input.startsWith("/")
    || WINDOWS_ABSOLUTE_PATH.test(input) || CONTROL_CHARACTER.test(input)) invalidPath();
  const path = directory && input.endsWith("/") ? input.slice(0, -1) : input;
  const components = path.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) invalidPath();
  const canonical = components.map((component) => component.normalize("NFC")).join("/");
  assertReceizProtocolMaximum("canonicalArchivePathBytes", UTF8.encode(canonical).byteLength);
  for (const component of canonical.split("/")) {
    assertReceizProtocolMaximum("archiveEntryNameBytes", UTF8.encode(component).byteLength);
  }
  return canonical;
}

function compressionRatio(decompressed: number, compressed: number): number {
  if (decompressed === 0) return 0;
  return compressed === 0 ? Number.POSITIVE_INFINITY : decompressed / compressed;
}

export function createReceizArchiveVerificationGuard(
  options: Readonly<{ rootDepth?: number }> = {},
): ReceizArchiveVerificationGuard {
  const rootDepth = options.rootDepth ?? 1;
  assertReceizProtocolMaximum("rootArchiveContainerDepth", rootDepth);
  const paths = new Set<string>();
  let entries = 0;
  let compressedBytes = 0;
  let decompressedBytes = 0;
  let declaredDecompressedBytes = 0;
  let active: null | {
    compressedBytes: number;
    decompressedBytes: number;
    manifest: boolean;
  } = null;

  return Object.freeze({
    beginEntry(input) {
      if (active) throw new ReceizProtocolLimitError("ARCHIVE_LIMIT_EXCEEDED", "archive-structure");
      if (input.kind === "archive") {
        throw new ReceizProtocolLimitError("ARCHIVE_RECURSION_FORBIDDEN", "archive-structure");
      }
      if (input.kind === "symlink" || input.kind === "hardlink") {
        throw new ReceizProtocolLimitError("ARCHIVE_LIMIT_EXCEEDED", "archive-structure");
      }
      const path = canonicalArchivePath(input.path, input.kind === "directory");
      if (paths.has(path)) invalidPath();
      assertReceizProtocolMaximum("archiveEntries", entries + 1);
      if (!Number.isSafeInteger(input.compressedBytes) || input.compressedBytes < 0) {
        throw new ReceizProtocolLimitError("ARCHIVE_LIMIT_EXCEEDED", "archive-structure");
      }
      if (input.declaredDecompressedBytes !== undefined) {
        assertReceizProtocolMaximum("singleDecompressedEntryBytes", input.declaredDecompressedBytes);
        if (input.manifest) assertReceizProtocolMaximum("manifestBytes", input.declaredDecompressedBytes);
        assertReceizProtocolMaximum(
          "perEntryCompressionRatio",
          Math.ceil(compressionRatio(input.declaredDecompressedBytes, input.compressedBytes)),
        );
        assertReceizProtocolMaximum(
          "totalDecompressedBytes",
          declaredDecompressedBytes + input.declaredDecompressedBytes,
        );
        declaredDecompressedBytes += input.declaredDecompressedBytes;
      }
      entries += 1;
      compressedBytes += input.compressedBytes;
      paths.add(path);
      active = { compressedBytes: input.compressedBytes, decompressedBytes: 0, manifest: input.manifest === true };
      return path;
    },
    observeDecompressedChunk(byteLength) {
      if (!active || !Number.isSafeInteger(byteLength) || byteLength < 0) {
        throw new ReceizProtocolLimitError("ARCHIVE_LIMIT_EXCEEDED", "archive-structure");
      }
      const nextEntryBytes = active.decompressedBytes + byteLength;
      const nextTotalBytes = decompressedBytes + byteLength;
      assertReceizProtocolMaximum("singleDecompressedEntryBytes", nextEntryBytes);
      if (active.manifest) assertReceizProtocolMaximum("manifestBytes", nextEntryBytes);
      assertReceizProtocolMaximum(
        "perEntryCompressionRatio",
        Math.ceil(compressionRatio(nextEntryBytes, active.compressedBytes)),
      );
      assertReceizProtocolMaximum("totalDecompressedBytes", nextTotalBytes);
      assertReceizProtocolMaximum(
        "aggregateCompressionRatio",
        Math.ceil(compressionRatio(nextTotalBytes, compressedBytes)),
      );
      active.decompressedBytes = nextEntryBytes;
      decompressedBytes = nextTotalBytes;
    },
    endEntry() {
      if (!active) throw new ReceizProtocolLimitError("ARCHIVE_LIMIT_EXCEEDED", "archive-structure");
      active = null;
    },
    snapshot() {
      return Object.freeze({ entries, compressedBytes, decompressedBytes });
    },
  });
}

export type ReceizRecursiveArchiveFormat = "zip" | "gzip" | "bzip2" | "xz" | "7z" | "rar" | "tar";

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.byteLength >= signature.length
    && signature.every((byte, index) => bytes[index] === byte);
}

/** Detects supported recursive archive carriers from bytes, never filename extensions. */
export function detectReceizRecursiveArchiveFormat(bytes: Uint8Array): ReceizRecursiveArchiveFormat | null {
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
    || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
    || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])) return "zip";
  if (startsWith(bytes, [0x1f, 0x8b])) return "gzip";
  if (startsWith(bytes, [0x42, 0x5a, 0x68])) return "bzip2";
  if (startsWith(bytes, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return "xz";
  if (startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "7z";
  if (startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])
    || startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])) return "rar";
  if (bytes.byteLength >= 262
    && bytes[257] === 0x75 && bytes[258] === 0x73 && bytes[259] === 0x74
    && bytes[260] === 0x61 && bytes[261] === 0x72) return "tar";
  return null;
}

export type ReceizRemotePredecessorFetchBudget = Readonly<{
  observeFetch(): number;
  consumed(): number;
}>;

export function createReceizRemotePredecessorFetchBudget(): ReceizRemotePredecessorFetchBudget {
  let count = 0;
  return Object.freeze({
    observeFetch() {
      assertReceizProtocolMaximum("remotePredecessorFetches", count + 1);
      count += 1;
      return count;
    },
    consumed() { return count; },
  });
}

export function assertReceizReconciliationAdditionBudget(
  additionCount: number,
  orderedAdditionCount: number,
): void {
  if (additionCount !== orderedAdditionCount) {
    throw new TypeError("RECONCILIATION_ADDITION_COUNT_MISMATCH");
  }
  assertReceizProtocolMaximum("reconciliationAdditions", additionCount);
}
