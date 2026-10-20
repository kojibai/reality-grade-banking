"use client";

import type JSZip from "jszip";
import {
  buildReceizFolderPackageManifest,
  encodeReceizFolderPackageManifest,
  normalizeReceizFolderPackagePath,
  type ReceizFolderPackageManifestEntry,
} from "@/app/lib/documentSeal/folderPackageManifest";
import {
  buildReceizPackageRootManifest,
  encodeReceizPackageRootManifest,
} from "@/app/lib/documentSeal/packageRootManifest";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import { receizedContentType } from "@/app/lib/documentSeal/receizeDocumentBytesCore";
import type { ReceizeDocumentResultMeta, ReceizedKind } from "@/app/lib/documentSeal/receizeDocumentBytesCore";
import { RECEIZ_VAULT_MIME, type ReceizVaultRestoredFile } from "@/app/lib/vault/types";
import { normalizeVaultPath, toArrayBufferStrict } from "@/app/lib/vault/crypto";

type PackageRawEntry = {
  path: string;
  bytes: Uint8Array;
};

type PackageSealSource = {
  sourcePath: string;
  sealedDirectory: string;
  filename: string;
  mime: string;
  bytes: Uint8Array;
};

type SealedSource = {
  bytes: Uint8Array;
  filename: string;
  kind: ReceizedKind;
  contentType: string;
  meta: ReceizeDocumentResultMeta;
};

export type VaultSealedDownloadProgress = {
  label: string;
  done: number;
  total: number;
};

export type VaultSealedDownload = {
  bytes: Uint8Array;
  filename: string;
  mime: string;
};

async function loadJSZip() {
  const mod = await import("jszip");
  return mod.default;
}

function toSafeArtifactName(name: string): string {
  const safe = (name || "document.receizbundle")
    .replace(/[\/\\]+/g, "_")
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, "")
    .trim();
  return safe || "document.receizbundle";
}

function splitPackagePath(path: string): { directory: string; leaf: string } {
  const normalized = normalizeReceizFolderPackagePath(path);
  const index = normalized.lastIndexOf("/");
  if (index < 0) return { directory: "", leaf: normalized };
  return {
    directory: normalized.slice(0, index),
    leaf: normalized.slice(index + 1),
  };
}

function uniquifyPackagePath(path: string, usedPaths: Set<string>): string {
  const normalized = normalizeReceizFolderPackagePath(path);
  if (!normalized) throw new Error("Invalid vault package path.");
  if (!usedPaths.has(normalized)) {
    usedPaths.add(normalized);
    return normalized;
  }

  const { directory, leaf } = splitPackagePath(normalized);
  const dot = leaf.lastIndexOf(".");
  const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
  const ext = dot > 0 ? leaf.slice(dot) : "";
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = normalizeReceizFolderPackagePath(
      directory ? `${directory}/${stem}__${index}${ext}` : `${stem}__${index}${ext}`,
    );
    if (!usedPaths.has(candidate)) {
      usedPaths.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Could not allocate package path for ${normalized}.`);
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sealSource(source: PackageSealSource): Promise<SealedSource> {
  const sealed = await receizeDocumentBytesClient({
    fileBytes: source.bytes,
    filename: source.filename,
    mime: source.mime || "application/octet-stream",
    options: { forceBundleEnvelope: true },
  });
  return {
    bytes: sealed.artifactBytes,
    filename: sealed.downloadName,
    kind: sealed.kind,
    contentType: receizedContentType(sealed.kind, source.mime || "application/octet-stream"),
    meta: sealed.meta,
  };
}

function packageReadme(args: { title: string; rawCount: number; sealedCount: number }): string {
  return [
    args.title,
    "",
    `Raw files bound: ${args.rawCount}`,
    `Sealed Receiz files: ${args.sealedCount}`,
    "",
    "Verification:",
    "Upload this ZIP or .receizvault to the existing Receiz offline verifier.",
    "The package uses the same sealed folder manifest and root manifest format produced by /seal.",
    "The root manifest binds the readable files and the sealed files by SHA-256.",
  ].join("\n");
}

async function addSealPackageLayer(args: {
  zip: JSZip;
  rawEntries: PackageRawEntry[];
  sealSources: PackageSealSource[];
  readmeTitle: string;
  onProgress?: (progress: VaultSealedDownloadProgress) => void;
}) {
  const usedPaths = new Set<string>();
  const packageFilesToBind: PackageRawEntry[] = [];

  for (const raw of args.rawEntries) {
    const normalized = normalizeReceizFolderPackagePath(raw.path);
    if (!normalized) continue;
    usedPaths.add(normalized);
    packageFilesToBind.push({ path: normalized, bytes: raw.bytes });
  }

  const manifestEntries: ReceizFolderPackageManifestEntry[] = [];
  const total = Math.max(1, args.sealSources.length + 2);
  let done = 0;

  for (const source of args.sealSources) {
    const sealed = await sealSource(source);
    done += 1;
    args.onProgress?.({ label: source.sourcePath, done, total });

    const safeName = toSafeArtifactName(sealed.filename);
    const sealedBase = normalizeReceizFolderPackagePath(source.sealedDirectory || "sealed");
    const sealedPath = uniquifyPackagePath(`${sealedBase}/${safeName}`, usedPaths);
    args.zip.file(sealedPath, toArrayBufferStrict(sealed.bytes));
    packageFilesToBind.push({ path: sealedPath, bytes: sealed.bytes });

    if (!sealed.meta.basisSha256 || !sealed.meta.verifyPath) {
      throw new Error(`Sealed metadata missing for ${source.sourcePath}.`);
    }

    manifestEntries.push({
      sourcePath: normalizeReceizFolderPackagePath(source.sourcePath),
      sealedPath,
      sealedFilename: sealed.filename,
      sealedKind: sealed.kind,
      sealedContentType: sealed.contentType,
      sealedSize: sealed.bytes.byteLength,
      sealedSha256: await sha256HexBytes(sealed.bytes),
      basisSha256: sealed.meta.basisSha256.toLowerCase(),
      verifyPath: sealed.meta.verifyPath,
      code: sealed.meta.proofBundle.code.toUpperCase(),
      pulse: sealed.meta.proofBundle.kaiPulseEternal,
      ts: sealed.meta.proofBundle.ts,
      ...(sealed.meta.note ? { note: sealed.meta.note } : {}),
    });
  }

  const nowIso = new Date().toISOString();
  manifestEntries.sort((a, b) => a.sealedPath.localeCompare(b.sealedPath));
  const manifest = buildReceizFolderPackageManifest({ createdAt: nowIso, entries: manifestEntries });
  const manifestBytes = encodeReceizFolderPackageManifest(manifest);
  const sealedManifest = await sealSource({
    sourcePath: "receiz.folder.manifest.v1.json",
    sealedDirectory: "_receiz",
    filename: "receiz.folder.manifest.v1.json",
    mime: "application/json",
    bytes: manifestBytes,
  });
  done += 1;
  args.onProgress?.({ label: "sealed folder manifest", done, total });

  const sealedManifestPath = uniquifyPackagePath(`_receiz/${toSafeArtifactName(sealedManifest.filename)}`, usedPaths);
  args.zip.file(sealedManifestPath, toArrayBufferStrict(sealedManifest.bytes));
  packageFilesToBind.push({ path: sealedManifestPath, bytes: sealedManifest.bytes });

  const readmeBytes = new TextEncoder().encode(
    packageReadme({
      title: args.readmeTitle,
      rawCount: args.rawEntries.length,
      sealedCount: args.sealSources.length,
    }),
  );
  const readmePath = uniquifyPackagePath("RECEIZ-PACKAGE-README.txt", usedPaths);
  args.zip.file(readmePath, toArrayBufferStrict(readmeBytes));
  packageFilesToBind.push({ path: readmePath, bytes: readmeBytes });

  const rootManifestEntries = (
    await Promise.all(
      packageFilesToBind.map(async (entry) => ({
        path: normalizeReceizFolderPackagePath(entry.path),
        size: entry.bytes.byteLength,
        sha256: await sha256HexBytes(entry.bytes),
      })),
    )
  ).sort((a, b) => a.path.localeCompare(b.path));

  const rootManifest = buildReceizPackageRootManifest({
    createdAt: nowIso,
    folderManifestPath: sealedManifestPath,
    entries: rootManifestEntries,
  });
  const rootManifestBytes = encodeReceizPackageRootManifest(rootManifest);
  const sealedRootManifest = await sealSource({
    sourcePath: "receiz.package.root.manifest.v1.json",
    sealedDirectory: "",
    filename: "receiz.package.root.manifest.v1.json",
    mime: "application/json",
    bytes: rootManifestBytes,
  });
  args.zip.file("manifest.receizbundle", toArrayBufferStrict(sealedRootManifest.bytes));
  done += 1;
  args.onProgress?.({ label: "sealed root manifest", done, total });
}

function downloadLeaf(path: string): string {
  const normalized = normalizeVaultPath(path, "vault-file");
  return normalized.split("/").pop() || "vault-file";
}

export async function buildVerifiableReceizVaultDownload(args: {
  packageBytes: Uint8Array;
  filename: string;
  onProgress?: (progress: VaultSealedDownloadProgress) => void;
}): Promise<VaultSealedDownload> {
  const JSZipCtor = await loadJSZip();
  const sourceZip = await JSZipCtor.loadAsync(toArrayBufferStrict(args.packageBytes));
  const zip = new JSZipCtor();
  const rawEntries: PackageRawEntry[] = [];

  const reads: Array<Promise<void>> = [];
  sourceZip.forEach((path, entry) => {
    if (entry.dir) return;
    reads.push(
      entry.async("uint8array").then((bytes) => {
        const normalized = normalizeReceizFolderPackagePath(path);
        if (!normalized) return;
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        zip.file(normalized, toArrayBufferStrict(copy));
        rawEntries.push({ path: normalized, bytes: copy });
      }),
    );
  });
  await Promise.all(reads);
  rawEntries.sort((a, b) => a.path.localeCompare(b.path));

  await addSealPackageLayer({
    zip,
    rawEntries,
    sealSources: [
      {
        sourcePath: args.filename,
        sealedDirectory: "sealed/vault",
        filename: args.filename,
        mime: RECEIZ_VAULT_MIME,
        bytes: args.packageBytes,
      },
    ],
    readmeTitle: "Receiz Vault sealed package",
    onProgress: args.onProgress,
  });

  const bytes = await zip.generateAsync({
    type: "uint8array",
    mimeType: RECEIZ_VAULT_MIME,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return { bytes, filename: args.filename, mime: RECEIZ_VAULT_MIME };
}

export async function buildVerifiableReceizVaultRestoreZip(args: {
  files: ReceizVaultRestoredFile[];
  filename: string;
  sealMode?: "all-files" | "manifest-only";
  compressionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  onProgress?: (progress: VaultSealedDownloadProgress) => void;
}): Promise<VaultSealedDownload> {
  const JSZipCtor = await loadJSZip();
  const zip = new JSZipCtor();
  const usedRawPaths = new Set<string>();
  const rawEntries: PackageRawEntry[] = [];
  const sealSources: PackageSealSource[] = [];
  const sealMode = args.sealMode ?? "all-files";

  for (const file of args.files) {
    const rawPath = uniquifyPackagePath(`files/${normalizeVaultPath(file.path)}`, usedRawPaths);
    const rawBytes = new Uint8Array(file.bytes.byteLength);
    rawBytes.set(file.bytes);
    zip.file(rawPath, toArrayBufferStrict(rawBytes));
    rawEntries.push({ path: rawPath, bytes: rawBytes });

    const normalizedPath = normalizeVaultPath(file.path);
    const shouldSealFile = sealMode === "all-files" ||
      normalizedPath === "signal-vault/manifest.json" ||
      normalizedPath === "sports-vault/manifest.json";
    if (!shouldSealFile) continue;

    const { directory } = splitPackagePath(rawPath);
    sealSources.push({
      sourcePath: rawPath,
      sealedDirectory: directory ? `sealed/${directory}` : "sealed/files",
      filename: downloadLeaf(file.path),
      mime: file.mime || "application/octet-stream",
      bytes: rawBytes,
    });
  }

  await addSealPackageLayer({
    zip,
    rawEntries,
    sealSources,
    readmeTitle: "Receiz Vault restore sealed package",
    onProgress: args.onProgress,
  });

  const compressionLevel = args.compressionLevel ?? 6;
  const bytes = await zip.generateAsync({
    type: "uint8array",
    mimeType: "application/zip",
    compression: compressionLevel === 0 ? "STORE" : "DEFLATE",
    ...(compressionLevel === 0 ? {} : { compressionOptions: { level: compressionLevel } }),
  }, (metadata) => {
    args.onProgress?.({
      label: metadata.currentFile || args.filename,
      done: Math.round(metadata.percent),
      total: 100,
    });
  });
  return { bytes, filename: args.filename, mime: "application/zip" };
}

export async function sealReceizVaultRestoredFile(file: ReceizVaultRestoredFile): Promise<VaultSealedDownload> {
  const sealed = await sealSource({
    sourcePath: file.path,
    sealedDirectory: "sealed",
    filename: downloadLeaf(file.path),
    mime: file.mime || "application/octet-stream",
    bytes: file.bytes,
  });
  return {
    bytes: sealed.bytes,
    filename: sealed.filename,
    mime: sealed.contentType,
  };
}
