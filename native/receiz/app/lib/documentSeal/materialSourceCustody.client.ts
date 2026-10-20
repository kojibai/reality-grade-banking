"use client";

import { completeBlobCustodyTransaction, blobCustodyRequestResult } from "@/app/lib/transport/blobCustodyTransactions.client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { readReceizRawMaterialCapsuleHeader } from "@/app/lib/documentSeal/materialCapsule";
import type {
  BuiltReceizMaterialCompositeBlobTransport,
  ReceizMaterialCompositeBlobProgress,
} from "@/app/lib/documentSeal/materialCompositeTransport";
import {
  openReceizMaterialSourceParts,
  type ReceizMaterialSourceRangeReader,
} from "../../../packages/receiz-sdk/src/materialSourceFamily";
import {
  createReceizCompositeMaterialPresentationUrl,
  readReceizMaterialCompositePackageDigest,
  verifyReceizMaterialCompositeManifest,
  type ReceizMaterialCompositeManifest,
  type ReceizMaterialCompositeSegment,
} from "../../../packages/receiz-sdk/src/materialCompositeTransport";

export const RECEIZ_MATERIAL_SOURCE_CUSTODY_DB = "receiz-material-source-custody-v1" as const;
export const RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE = "families" as const;
export const RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE = "segments" as const;

export type HeldReceizMaterialSourceFamily = Readonly<{
  schema: "receiz.material.source-custody.v1" | "receiz.material.source-custody.v2";
  packageDigest: string;
  sourceUrls: readonly string[];
  storageKind: "content-urls" | "blob-segments";
  authority: Readonly<{
    custodyIsProofAuthority: false;
    storageIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type HeldReceizRawMaterialCapsuleBlob = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  capsuleBlob: Blob;
  exactArtifactBlob: Blob;
  filename: string;
  mimeType: string;
}>;

const HEX64_RE = /^[0-9a-f]{64}$/;
const CUSTODY_DATABASE_VERSION = 2;
const CUSTODY_AUTHORITY = Object.freeze({
  custodyIsProofAuthority: false as const,
  storageIsProofAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

type PersistedBlobFamily = Readonly<{
  schema: "receiz.material.source-custody.v2";
  packageDigest: string;
  headUrl: string;
  sourceUrls: readonly [];
  storageKind: "blob-segments";
  manifest: ReceizMaterialCompositeManifest;
  authority: typeof CUSTODY_AUTHORITY;
}>;

type PersistedBlobSegment = Readonly<{
  key: string;
  packageDigest: string;
  index: number;
  offset: number;
  byteLength: number;
  sha256: string;
  blob: Blob;
}>;

function custodyIndexKey(packageDigest: string): string {
  return `receiz:material-source-held:v1:${packageDigest}`;
}

function segmentKey(packageDigest: string, index: number): string {
  return `${packageDigest}:${index}`;
}

export function hasHeldReceizMaterialSourceFamily(packageDigest: string): boolean {
  if (!HEX64_RE.test(packageDigest) || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(custodyIndexKey(packageDigest)) === "1";
  } catch {
    return false;
  }
}

function openCustodyDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new TypeError("RECEIZ_MATERIAL_SOURCE_CUSTODY_UNAVAILABLE"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECEIZ_MATERIAL_SOURCE_CUSTODY_DB, CUSTODY_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE)) {
        database.createObjectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE, { keyPath: "packageDigest" });
      }
      if (!database.objectStoreNames.contains(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE)) {
        database.createObjectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("RECEIZ_MATERIAL_SOURCE_CUSTODY_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("RECEIZ_MATERIAL_SOURCE_CUSTODY_OPEN_BLOCKED"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return completeBlobCustodyTransaction(transaction, "RECEIZ_MATERIAL_SOURCE_CUSTODY");
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return blobCustodyRequestResult(request, "RECEIZ_MATERIAL_SOURCE_CUSTODY");
}

function coerceHeldFamily(value: unknown): HeldReceizMaterialSourceFamily | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if ((record.schema !== "receiz.material.source-custody.v1"
      && record.schema !== "receiz.material.source-custody.v2")
    || typeof record.packageDigest !== "string"
    || !HEX64_RE.test(record.packageDigest)
    || !Array.isArray(record.sourceUrls)
    || record.sourceUrls.some((url) => typeof url !== "string" || !url)
    || !record.authority
    || typeof record.authority !== "object") return null;
  const storageKind = record.schema === "receiz.material.source-custody.v2"
    ? "blob-segments"
    : "content-urls";
  if (storageKind === "blob-segments"
    && (record.storageKind !== "blob-segments" || record.sourceUrls.length !== 0)) return null;
  const authority = record.authority as Record<string, unknown>;
  if (authority.custodyIsProofAuthority !== false
    || authority.storageIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") return null;
  return Object.freeze({
    schema: record.schema,
    packageDigest: record.packageDigest,
    sourceUrls: Object.freeze([...record.sourceUrls] as string[]),
    storageKind,
    authority: CUSTODY_AUTHORITY,
  });
}

function markHeld(packageDigest: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(custodyIndexKey(packageDigest), "1");
  } catch {
    // IndexedDB is complete; this bounded locator is not proof authority.
  }
}

async function persistHeldFamily(held: HeldReceizMaterialSourceFamily | PersistedBlobFamily): Promise<void> {
  const database = await openCustodyDatabase();
  try {
    const transaction = database.transaction(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE, "readwrite");
    const completion = transactionComplete(transaction);
    transaction.objectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE).put(held);
    await completion;
  } finally {
    database.close();
  }
  markHeld(held.packageDigest);
}

async function readFamilyRecord(packageDigest: string): Promise<unknown> {
  const database = await openCustodyDatabase();
  try {
    const transaction = database.transaction(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE, "readonly");
    const completion = transactionComplete(transaction);
    const result = await requestResult(transaction.objectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_STORE).get(packageDigest));
    await completion;
    return result;
  } finally {
    database.close();
  }
}

async function readBlobFamilyRecord(packageDigest: string): Promise<Readonly<{
  headUrl: string;
  manifest: ReceizMaterialCompositeManifest;
}> | null> {
  const value = await readFamilyRecord(packageDigest);
  const held = coerceHeldFamily(value);
  if (!held || held.storageKind !== "blob-segments") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.headUrl !== "string" || !record.headUrl || !record.manifest) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_FAMILY_INVALID");
  }
  const manifest = await verifyReceizMaterialCompositeManifest(record.manifest);
  if (manifest.packageDigest !== packageDigest || manifest.capsuleEncoding !== "rma3/raw") {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_FAMILY_INVALID");
  }
  return Object.freeze({ headUrl: record.headUrl, manifest });
}

async function readBlobSegmentRecord(
  packageDigest: string,
  descriptor: ReceizMaterialCompositeSegment,
  inspectBytes?: (bytes: Uint8Array) => void,
): Promise<Blob> {
  const database = await openCustodyDatabase();
  let value: unknown;
  try {
    const transaction = database.transaction(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE, "readonly");
    const completion = transactionComplete(transaction);
    value = await requestResult(transaction.objectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE)
      .get(segmentKey(packageDigest, descriptor.index)));
    await completion;
  } finally {
    database.close();
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_SEGMENT_MISSING");
  }
  const segment = value as Partial<PersistedBlobSegment>;
  if (segment.packageDigest !== packageDigest
    || segment.index !== descriptor.index
    || segment.offset !== descriptor.offset
    || segment.byteLength !== descriptor.byteLength
    || segment.sha256 !== descriptor.sha256
    || !(segment.blob instanceof Blob)
    || segment.blob.size !== descriptor.byteLength) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_SEGMENT_INVALID");
  }
  const bytes = new Uint8Array(await segment.blob.arrayBuffer());
  if (bytesToHex(sha256(bytes)) !== descriptor.sha256) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_SEGMENT_INVALID");
  }
  inspectBytes?.(bytes);
  return segment.blob;
}

function packageDigestFromHead(headUrl: string): string {
  const head = new URL(headUrl, "https://receiz.com");
  const tokens = new URLSearchParams(head.hash.slice(1)).getAll("material");
  const packageDigest = tokens.length === 1 ? readReceizMaterialCompositePackageDigest(tokens[0]!) : null;
  if (!packageDigest) throw new TypeError("RECEIZ_MATERIAL_SOURCE_HEAD_INVALID");
  return packageDigest;
}

async function boundBlobFamily(headUrl: string): Promise<Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  packageDigest: string;
}> | null> {
  const packageDigest = packageDigestFromHead(headUrl);
  const family = await readBlobFamilyRecord(packageDigest);
  if (!family) return null;
  const head = new URL(headUrl, "https://receiz.com");
  if (head.pathname !== family.manifest.verifyPath) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_ROUTE_BINDING_REJECTED");
  }
  return Object.freeze({ packageDigest, manifest: family.manifest });
}

/** Admits only a complete verified content-bearing URL family into local custody. */
export async function holdReceizMaterialSourceFamily(input: Readonly<{
  headUrl: string;
  sourceUrls: readonly string[];
}>): Promise<HeldReceizMaterialSourceFamily> {
  const opened = await openReceizMaterialSourceParts(input);
  const held = Object.freeze({
    schema: "receiz.material.source-custody.v1" as const,
    packageDigest: opened.manifest.packageDigest,
    sourceUrls: Object.freeze(input.sourceUrls.length > 0 ? [...input.sourceUrls] : [input.headUrl]),
    storageKind: "content-urls" as const,
    authority: CUSTODY_AUTHORITY,
  });
  await persistHeldFamily(held);
  return held;
}

/**
 * Verifies and admits a raw Blob transport one segment at a time. Each exact
 * segment remains a Blob in its own IndexedDB record; no all-segment byte
 * array and no base64 URL family is ever materialized.
 */
export async function holdReceizMaterialBlobSourceFamily(input: Readonly<{
  proofUrl: string;
  transport: BuiltReceizMaterialCompositeBlobTransport;
  onProgress?: (progress: ReceizMaterialCompositeBlobProgress) => void;
}>): Promise<Readonly<{ headUrl: string; held: HeldReceizMaterialSourceFamily }>> {
  const manifest = await verifyReceizMaterialCompositeManifest(input.transport.manifest);
  if (manifest.capsuleEncoding !== "rma3/raw"
    || manifest.packageDigest !== input.transport.manifest.packageDigest
    || input.transport.capsuleBlob.size !== manifest.capsuleByteLength) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_PLAN_INVALID");
  }
  const proof = new URL(input.proofUrl, "https://receiz.com");
  if (proof.pathname !== manifest.verifyPath) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_ROUTE_BINDING_REJECTED");
  }
  const headUrl = createReceizCompositeMaterialPresentationUrl({
    proofUrl: proof.toString(),
    materialToken: input.transport.token,
  });
  const database = await openCustodyDatabase();
  const capsuleHash = sha256.create();
  let expectedOffset = 0;
  try {
    for (const descriptor of manifest.segments) {
      if (descriptor.offset !== expectedOffset) {
        throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_PLAN_INVALID");
      }
      const blob = input.transport.capsuleBlob.slice(
        descriptor.offset,
        descriptor.offset + descriptor.byteLength,
        "application/octet-stream",
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength !== descriptor.byteLength || bytesToHex(sha256(bytes)) !== descriptor.sha256) {
        throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_SEGMENT_INVALID");
      }
      capsuleHash.update(bytes);
      const transaction = database.transaction(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE, "readwrite");
      const completion = transactionComplete(transaction);
      transaction.objectStore(RECEIZ_MATERIAL_SOURCE_CUSTODY_SEGMENT_STORE).put(Object.freeze({
        key: segmentKey(manifest.packageDigest, descriptor.index),
        packageDigest: manifest.packageDigest,
        index: descriptor.index,
        offset: descriptor.offset,
        byteLength: descriptor.byteLength,
        sha256: descriptor.sha256,
        blob,
      } satisfies PersistedBlobSegment));
      await completion;
      expectedOffset += bytes.byteLength;
      input.onProgress?.(Object.freeze({
        loadedBytes: expectedOffset,
        totalBytes: input.transport.capsuleBlob.size,
      }));
    }
    if (expectedOffset !== manifest.capsuleByteLength
      || bytesToHex(capsuleHash.digest()) !== manifest.capsuleSha256) {
      throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_CAPSULE_INVALID");
    }
  } finally {
    database.close();
  }

  const persisted = Object.freeze({
    schema: "receiz.material.source-custody.v2" as const,
    packageDigest: manifest.packageDigest,
    headUrl,
    sourceUrls: Object.freeze([]) as readonly [],
    storageKind: "blob-segments" as const,
    manifest,
    authority: CUSTODY_AUTHORITY,
  });
  await persistHeldFamily(persisted);
  const held = coerceHeldFamily(persisted);
  if (!held) throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_FAMILY_INVALID");
  return Object.freeze({ headUrl, held });
}

export async function readHeldReceizMaterialSourceFamily(packageDigest: string): Promise<HeldReceizMaterialSourceFamily | null> {
  if (!HEX64_RE.test(packageDigest)) return null;
  let result: unknown;
  try {
    result = await readFamilyRecord(packageDigest);
  } catch {
    return null;
  }
  const held = coerceHeldFamily(result);
  if (held) markHeld(held.packageDigest);
  return held;
}

/** Opens the locally held raw carrier as Blob composition with bounded hashing. */
export async function openHeldReceizRawMaterialCapsuleBlob(headUrl: string): Promise<HeldReceizRawMaterialCapsuleBlob | null> {
  const family = await boundBlobFamily(headUrl);
  if (!family) return null;
  const capsuleHash = sha256.create();
  const blobs: Blob[] = [];
  let header: ReturnType<typeof readReceizRawMaterialCapsuleHeader> | null = null;
  let byteLength = 0;
  for (const descriptor of family.manifest.segments) {
    const blob = await readBlobSegmentRecord(
      family.packageDigest,
      descriptor,
      (bytes) => {
        capsuleHash.update(bytes);
        if (descriptor.index === 0) header = readReceizRawMaterialCapsuleHeader(bytes);
      },
    );
    blobs.push(blob);
    byteLength += blob.size;
  }
  const openedHeader = header as ReturnType<typeof readReceizRawMaterialCapsuleHeader> | null;
  if (!openedHeader
    || byteLength !== family.manifest.capsuleByteLength
    || bytesToHex(capsuleHash.digest()) !== family.manifest.capsuleSha256
    || openedHeader.exactArtifactByteLength !== family.manifest.sealedArtifactByteLength
    || openedHeader.filename !== family.manifest.sealedFilename
    || openedHeader.mimeType !== family.manifest.sealedMimeType
    || openedHeader.exactArtifactOffset + openedHeader.exactArtifactByteLength !== byteLength) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_BLOB_CAPSULE_INVALID");
  }
  const capsuleBlob = new Blob(blobs, { type: "application/vnd.receiz.material-capsule" });
  return Object.freeze({
    manifest: family.manifest,
    capsuleBlob,
    exactArtifactBlob: capsuleBlob.slice(
      openedHeader.exactArtifactOffset,
      openedHeader.exactArtifactOffset + openedHeader.exactArtifactByteLength,
      openedHeader.mimeType,
    ),
    filename: openedHeader.filename,
    mimeType: openedHeader.mimeType,
  });
}

/** Builds the signed-range reader directly over verified IndexedDB Blobs. */
export async function openHeldReceizMaterialSourceRangeReader(input: Readonly<{
  headUrl: string;
  payloadByteLength: number;
}>): Promise<ReceizMaterialSourceRangeReader | null> {
  if (!Number.isSafeInteger(input.payloadByteLength) || input.payloadByteLength <= 0) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_PAYLOAD_LENGTH_INVALID");
  }
  const family = await boundBlobFamily(input.headUrl);
  if (!family) return null;
  const verifiedSegments = new Map<number, Promise<Blob>>();
  const readSegment = (descriptor: ReceizMaterialCompositeSegment): Promise<Blob> => {
    const held = verifiedSegments.get(descriptor.index);
    if (held) return held;
    const reading = readBlobSegmentRecord(family.packageDigest, descriptor);
    verifiedSegments.set(descriptor.index, reading);
    void reading.catch(() => verifiedSegments.delete(descriptor.index));
    return reading;
  };
  const first = family.manifest.segments[0];
  if (!first) throw new TypeError("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
  const firstBlob = await readSegment(first);
  const header = readReceizRawMaterialCapsuleHeader(new Uint8Array(await firstBlob.slice(
    0,
    Math.min(firstBlob.size, 12 + 1_024 + 256),
  ).arrayBuffer()));
  if (header.exactArtifactByteLength !== family.manifest.sealedArtifactByteLength
    || header.filename !== family.manifest.sealedFilename
    || header.mimeType !== family.manifest.sealedMimeType
    || input.payloadByteLength > header.exactArtifactByteLength) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_RAW_CAPSULE_BINDING_INVALID");
  }

  return Object.freeze({
    manifest: family.manifest,
    payloadByteLength: input.payloadByteLength,
    progressiveLedger: family.manifest.materialProgressiveLedger ?? null,
    async readPayloadRange(rangeInput: Readonly<{ offset: number; byteLength: number }>) {
      if (!Number.isSafeInteger(rangeInput.offset) || rangeInput.offset < 0
        || !Number.isSafeInteger(rangeInput.byteLength) || rangeInput.byteLength <= 0
        || rangeInput.offset + rangeInput.byteLength > input.payloadByteLength) {
        throw new TypeError("RECEIZ_MATERIAL_SOURCE_PAYLOAD_RANGE_INVALID");
      }
      const capsuleStart = header.exactArtifactOffset + rangeInput.offset;
      const capsuleEnd = capsuleStart + rangeInput.byteLength;
      const output = new Uint8Array(rangeInput.byteLength);
      let outputOffset = 0;
      for (const descriptor of family.manifest.segments) {
        const overlapStart = Math.max(descriptor.offset, capsuleStart);
        const overlapEnd = Math.min(descriptor.offset + descriptor.byteLength, capsuleEnd);
        if (overlapStart >= overlapEnd) continue;
        const blob = await readSegment(descriptor);
        const bytes = new Uint8Array(await blob.slice(
          overlapStart - descriptor.offset,
          overlapEnd - descriptor.offset,
        ).arrayBuffer());
        output.set(bytes, outputOffset);
        outputOffset += bytes.byteLength;
      }
      if (outputOffset !== output.byteLength) throw new TypeError("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
      return output;
    },
    authority: Object.freeze({
      readerIsProofAuthority: false as const,
      rangeProofRequired: true as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

/** Whole-capsule compatibility path; range playback never calls this. */
export async function resolveHeldReceizMaterialComposite(headUrl: string): Promise<Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  capsuleBytes: Uint8Array;
}> | null> {
  const raw = await openHeldReceizRawMaterialCapsuleBlob(headUrl);
  if (!raw) return null;
  return Object.freeze({
    manifest: raw.manifest,
    capsuleBytes: new Uint8Array(await raw.capsuleBlob.arrayBuffer()),
  });
}
