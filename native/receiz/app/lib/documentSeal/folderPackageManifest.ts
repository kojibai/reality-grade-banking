import { jcsCanonicalize } from "@/app/utils/jcs";
import { ImportedProofSourceUnavailableError } from "@/app/lib/profile/showcase/importedSourceErrors";

const HEX64_RE = /^[0-9a-f]{64}$/;

/** Ordinary archive assembly shared by explicit local save operations. Manifest
 * sealing binds transport paths/bytes; enclosed source artifacts are unchanged. */
export async function assembleReceizFolderPackage(input: Readonly<{
  packageExecutionCapacity?: import("../../../packages/receiz-sdk/src/verifier/canonical").ReceizPackageExecutionCapacity;
  sealedEntries: readonly Readonly<{ path: string; bytes: Uint8Array }>[];
  attachments?: readonly Readonly<{ path: string; bytes: Uint8Array }>[];
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, import("../../../packages/receiz-sdk/src/verifier/signatureV4").ReceizSignatureV4RootPublicKey>;
  sealManifest(payloadBytes: Uint8Array, filename: string): Promise<Uint8Array>;
}>): Promise<Uint8Array> {
  const { default: JSZip } = await import("jszip");
  const { verifyReceizDocumentBytesCanonical, readVerifiedReceizFolderPackageBytesCanonical } = await import("../../../packages/receiz-sdk/src/verifier/canonical");
  const { buildReceizPackageRootManifest, encodeReceizPackageRootManifest } = await import("./packageRootManifest");
  const sha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer)), byte => byte.toString(16).padStart(2, "0")).join("");
  const zip = new JSZip();
  const files = new Map<string, Uint8Array>();
  const put = (path: string, bytes: Uint8Array) => {
    if (normalizeReceizFolderPackagePath(path) !== path || !path || path.endsWith("/") || files.has(path)) throw new TypeError("RECEIZ_PACKAGE_PATH_CONFLICT");
    files.set(path, bytes.slice());
  };
  const entries: ReceizFolderPackageManifestEntry[] = [];
  for (const entry of input.sealedEntries) {
    put(entry.path, entry.bytes);
    const filename = entry.path.split("/").at(-1)!;
    const result = await verifyReceizDocumentBytesCanonical({ fileBytes: files.get(entry.path)!, filename,
      signatureV4RootPublicKeys: input.canonicalSignatureV4RootPublicKeys, packageExecutionCapacity: input.packageExecutionCapacity });
    if (result.denial) throw new ImportedProofSourceUnavailableError(`RECEIZ_PACKAGE_SOURCE_UNAVAILABLE:${result.denial.code}`, result.denial.code, "not-evaluated");
    if (!result.ok || !result.bundle) throw new TypeError(`RECEIZ_PACKAGE_SOURCE_VERIFICATION_FAILED:${entry.path}`);
    const bundle = result.bundle;
    if (typeof bundle.artifactSha256Basis !== "string" || typeof bundle.verifyPath !== "string"
      || typeof bundle.code !== "string" || typeof bundle.kaiPulseEternal !== "string" || typeof bundle.ts !== "string") throw new TypeError("RECEIZ_PACKAGE_SOURCE_BINDING_INVALID");
    entries.push({ sourcePath: entry.path, sealedPath: entry.path, sealedFilename: filename,
      sealedKind: result.kind, sealedContentType: "application/octet-stream", sealedSize: entry.bytes.byteLength,
      sealedSha256: await sha256(entry.bytes), basisSha256: bundle.artifactSha256Basis!, verifyPath: bundle.verifyPath,
      code: bundle.code, pulse: bundle.kaiPulseEternal, ts: bundle.ts });
  }
  for (const attachment of input.attachments ?? []) put(attachment.path, attachment.bytes);
  const createdAt = new Date().toISOString();
  const folderManifestPath = "_receiz/folder-manifest.receizbundle";
  const rootManifestPath = "manifest.receizbundle";
  if (files.has(folderManifestPath) || files.has(rootManifestPath)) throw new TypeError("RECEIZ_PACKAGE_PATH_CONFLICT");
  put(folderManifestPath, await input.sealManifest(encodeReceizFolderPackageManifest(buildReceizFolderPackageManifest({ createdAt,
    entries: entries.sort((left, right) => left.sealedPath.localeCompare(right.sealedPath)) })), "receiz.folder.manifest.v1.json"));
  const rootEntries = [];
  for (const [path, bytes] of files) rootEntries.push({ path, size: bytes.byteLength, sha256: await sha256(bytes) });
  const root = buildReceizPackageRootManifest({ createdAt, folderManifestPath,
    entries: rootEntries.sort((left, right) => left.path.localeCompare(right.path)) });
  put(rootManifestPath, await input.sealManifest(encodeReceizPackageRootManifest(root), "receiz.package.root.manifest.v1.json"));
  for (const [path, bytes] of files) zip.file(path, bytes);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  const verified = await readVerifiedReceizFolderPackageBytesCanonical({ fileBytes: bytes,
    signatureV4RootPublicKeys: input.canonicalSignatureV4RootPublicKeys, packageExecutionCapacity: input.packageExecutionCapacity });
  if (!verified.ok) {
    if (verified.verification.denial) throw new ImportedProofSourceUnavailableError(`RECEIZ_PACKAGE_ASSEMBLY_UNAVAILABLE:${verified.verification.denial.code}`, verified.verification.denial.code, "not-evaluated");
    throw new TypeError(`RECEIZ_PACKAGE_ASSEMBLY_VERIFICATION_FAILED:${verified.error}`);
  }
  return bytes;
}

export type ReceizFolderPackageManifestEntry = Readonly<{
  sourcePath: string;
  sealedPath: string;
  sealedFilename: string;
  sealedKind: string;
  sealedContentType: string;
  sealedSize: number;
  sealedSha256: string;
  basisSha256: string;
  verifyPath: string;
  code: string;
  pulse: string;
  ts: string;
  note?: string;
}>;

export type ReceizFolderPackageManifest = Readonly<{
  kind: "receiz.folder.manifest.v1";
  version: 1;
  createdAt: string;
  itemCount: number;
  entries: readonly ReceizFolderPackageManifestEntry[];
}>;

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function asHex64(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return HEX64_RE.test(normalized) ? normalized : null;
}

function normalizePath(rawPath: string): string {
  const trimmed = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = trimmed
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "." && part !== "..");
  return parts.join("/");
}

function coerceEntry(value: unknown): ReceizFolderPackageManifestEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  const sourcePathRaw = asNonEmptyString(row.sourcePath);
  const sealedPathRaw = asNonEmptyString(row.sealedPath);
  const sealedFilename = asNonEmptyString(row.sealedFilename);
  const sealedKind = asNonEmptyString(row.sealedKind);
  const sealedContentType = asNonEmptyString(row.sealedContentType);
  const sealedSize = asInt(row.sealedSize);
  const sealedSha256 = asHex64(row.sealedSha256);
  const basisSha256 = asHex64(row.basisSha256);
  const verifyPath = asNonEmptyString(row.verifyPath);
  const code = asNonEmptyString(row.code);
  const pulse = asNonEmptyString(row.pulse);
  const ts = asNonEmptyString(row.ts);

  if (
    !sourcePathRaw ||
    !sealedPathRaw ||
    !sealedFilename ||
    !sealedKind ||
    !sealedContentType ||
    sealedSize === null ||
    sealedSize < 0 ||
    !sealedSha256 ||
    !basisSha256 ||
    !verifyPath ||
    !code ||
    !pulse ||
    !ts
  ) {
    return null;
  }

  const sourcePath = normalizePath(sourcePathRaw);
  const sealedPath = normalizePath(sealedPathRaw);
  if (!sourcePath || !sealedPath) return null;

  return {
    sourcePath,
    sealedPath,
    sealedFilename,
    sealedKind,
    sealedContentType,
    sealedSize,
    sealedSha256,
    basisSha256,
    verifyPath,
    code,
    pulse,
    ts,
    ...(typeof row.note === "string" && row.note.trim().length > 0 ? { note: row.note.trim() } : {}),
  };
}

export function normalizeReceizFolderPackagePath(rawPath: string): string {
  return normalizePath(rawPath);
}

export function buildReceizFolderPackageManifest(args: {
  createdAt: string;
  entries: readonly ReceizFolderPackageManifestEntry[];
}): ReceizFolderPackageManifest {
  return {
    kind: "receiz.folder.manifest.v1",
    version: 1,
    createdAt: args.createdAt,
    itemCount: args.entries.length,
    entries: args.entries,
  };
}

export function encodeReceizFolderPackageManifest(manifest: ReceizFolderPackageManifest): Uint8Array {
  return new TextEncoder().encode(jcsCanonicalize(manifest));
}

export function decodeReceizFolderPackageManifest(bytes: Uint8Array): ReceizFolderPackageManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizFolderPackageManifest(parsed);
}

export function coerceReceizFolderPackageManifest(value: unknown): ReceizFolderPackageManifest | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (row.kind !== "receiz.folder.manifest.v1") return null;
  if (row.version !== 1) return null;

  const createdAt = asNonEmptyString(row.createdAt);
  const itemCount = asInt(row.itemCount);
  if (!createdAt || itemCount === null || itemCount < 0) return null;

  if (!Array.isArray(row.entries)) return null;
  const entries: ReceizFolderPackageManifestEntry[] = [];
  const seenSealedPaths = new Set<string>();
  for (const rawEntry of row.entries) {
    const entry = coerceEntry(rawEntry);
    if (!entry) return null;
    if (seenSealedPaths.has(entry.sealedPath)) return null;
    seenSealedPaths.add(entry.sealedPath);
    entries.push(entry);
  }
  if (entries.length !== itemCount) return null;

  return {
    kind: "receiz.folder.manifest.v1",
    version: 1,
    createdAt,
    itemCount,
    entries,
  };
}
