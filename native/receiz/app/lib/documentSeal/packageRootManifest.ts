import { jcsCanonicalize } from "@/app/utils/jcs";
import { normalizeReceizFolderPackagePath } from "@/app/lib/documentSeal/folderPackageManifest";

const HEX64_RE = /^[0-9a-f]{64}$/;

export type ReceizPackageRootManifestEntry = Readonly<{
  path: string;
  size: number;
  sha256: string;
}>;

export type ReceizPackageRootManifest = Readonly<{
  kind: "receiz.package.root.manifest.v1";
  version: 1;
  createdAt: string;
  folderManifestPath: string;
  itemCount: number;
  entries: readonly ReceizPackageRootManifestEntry[];
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

function coerceEntry(value: unknown): ReceizPackageRootManifestEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const pathRaw = asNonEmptyString(row.path);
  const size = asInt(row.size);
  const sha256 = asHex64(row.sha256);
  if (!pathRaw || size === null || size < 0 || !sha256) return null;

  const path = normalizeReceizFolderPackagePath(pathRaw);
  if (!path) return null;

  return {
    path,
    size,
    sha256,
  };
}

export function buildReceizPackageRootManifest(args: {
  createdAt: string;
  folderManifestPath: string;
  entries: readonly ReceizPackageRootManifestEntry[];
}): ReceizPackageRootManifest {
  return {
    kind: "receiz.package.root.manifest.v1",
    version: 1,
    createdAt: args.createdAt,
    folderManifestPath: normalizeReceizFolderPackagePath(args.folderManifestPath),
    itemCount: args.entries.length,
    entries: args.entries,
  };
}

export function encodeReceizPackageRootManifest(manifest: ReceizPackageRootManifest): Uint8Array {
  return new TextEncoder().encode(jcsCanonicalize(manifest));
}

export function coerceReceizPackageRootManifest(value: unknown): ReceizPackageRootManifest | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== "receiz.package.root.manifest.v1") return null;
  if (row.version !== 1) return null;

  const createdAt = asNonEmptyString(row.createdAt);
  const folderManifestPathRaw = asNonEmptyString(row.folderManifestPath);
  const itemCount = asInt(row.itemCount);
  if (!createdAt || !folderManifestPathRaw || itemCount === null || itemCount < 0) return null;
  const folderManifestPath = normalizeReceizFolderPackagePath(folderManifestPathRaw);
  if (!folderManifestPath) return null;

  if (!Array.isArray(row.entries)) return null;
  const entries: ReceizPackageRootManifestEntry[] = [];
  const seenPaths = new Set<string>();
  for (const rawEntry of row.entries) {
    const entry = coerceEntry(rawEntry);
    if (!entry) return null;
    if (seenPaths.has(entry.path)) return null;
    seenPaths.add(entry.path);
    entries.push(entry);
  }

  if (entries.length !== itemCount) return null;

  return {
    kind: "receiz.package.root.manifest.v1",
    version: 1,
    createdAt,
    folderManifestPath,
    itemCount,
    entries,
  };
}

export function decodeReceizPackageRootManifest(bytes: Uint8Array): ReceizPackageRootManifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizPackageRootManifest(parsed);
}
