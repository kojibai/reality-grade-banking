"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { deflateSync, Inflate } from "fflate";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";
import { parseReceizKeyFileText, serializeReceizKeyFile } from "@/app/utils/receizIdentityKey";
import { DURABLE_LOCAL_TRUTH_RANK, readDurableLocalTruthEntriesByPrefix, readDurableLocalTruthItem, writeDurableLocalTruthItem } from "@/app/lib/runtime/localTruthStore";
import type { StoredReceizDeviceIdentity } from "./receizDeviceIdentity";
import { completeBlobCustodyTransaction, blobCustodyRequestResult } from "@/app/lib/transport/blobCustodyTransactions.client";

// Storage mechanics beneath the admitted key proof. These digests do not admit
// identity, sign a new head, or replace the enclosing key/portable-state proof.
export const RECEIZ_IDENTITY_SOURCE_PART_BYTES = 256 * 1024;
export const RECEIZ_IDENTITY_SOURCE_STORAGE_PREFIX = "receiz.auth.receiz-device-identity.source.v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const hex = /^[0-9a-f]{64}$/u;

type SourcePart = Readonly<{ sha256: string; byteLength: number }>;
export type ReceizDeviceIdentitySourceRef = Readonly<{
  schema: "receiz.device.identity.source-ref.v1";
  keyId: string;
  localUid: string;
  sha256: string;
  storage?: "indexeddb";
}>;
type SourceManifest = ReceizDeviceIdentitySourceRef & Readonly<{
  byteLength: number;
  parts: readonly SourcePart[];
}>;
export const RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX = "receiz.auth.receiz-device-identity.source-manifest.v1:";
export const RECEIZ_IDENTITY_SOURCE_DATABASE = "receiz-identity-source-custody-v1";
const openedSources = new WeakMap<Storage, Map<string, StoredReceizDeviceIdentity>>();
export class ReceizIdentitySourceNotRealizedError extends Error {
  constructor() { super("receiz_device_identity_source_not_realized"); }
}
function sourceMemory() {
  const storage = window.localStorage;
  let held = openedSources.get(storage);
  if (!held) { held = new Map(); openedSources.set(storage, held); }
  return held;
}
async function sourceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECEIZ_IDENTITY_SOURCE_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("source");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("receiz_device_identity_source_storage_blocked"));
  });
}
async function sourceRecord(key: string, write?: unknown): Promise<unknown> {
  const db = await sourceDatabase();
  try {
    const tx = db.transaction("source", write === undefined ? "readonly" : "readwrite");
    const complete = completeBlobCustodyTransaction(tx, "receiz_device_identity_source");
    try {
      const request = write === undefined ? tx.objectStore("source").get(key) : tx.objectStore("source").put(write, key);
      const [value] = await Promise.all([blobCustodyRequestResult(request, "receiz_device_identity_source"), complete]);
      return value;
    } catch (error) { await complete.catch(() => {}); throw error; }
  } finally { db.close(); }
}

/** Realization of retained bytes, not a new identity admission or ancestry election. */
export async function realizeReceizDeviceIdentitySource(ref: ReceizDeviceIdentitySourceRef): Promise<void> {
  if (!ref || ref.schema !== "receiz.device.identity.source-ref.v1" || !hex.test(ref.sha256) || !hex.test(ref.keyId)) integrityFailure();
  if (ref.storage !== "indexeddb") { openReceizDeviceIdentitySource(ref); return; }
  const held = sourceMemory().get(ref.sha256);
  if (held) {
    if (held.keyFile.keyId !== ref.keyId || held.localUid !== ref.localUid) integrityFailure();
    return;
  }
  const manifest = await sourceRecord(`manifest:${ref.sha256}`) as SourceManifest | undefined;
  if (!manifest || manifest.sha256 !== ref.sha256 || manifest.keyId !== ref.keyId || manifest.localUid !== ref.localUid
    || manifest.schema !== ref.schema || !Number.isSafeInteger(manifest.byteLength) || manifest.byteLength <= 0
    || !Array.isArray(manifest.parts) || manifest.parts.length !== Math.ceil(manifest.byteLength / RECEIZ_IDENTITY_SOURCE_PART_BYTES)) integrityFailure();
  const chunks: Uint8Array[] = [];
  for (const [index, part] of manifest.parts.entries()) {
    const expected = Math.min(RECEIZ_IDENTITY_SOURCE_PART_BYTES, manifest.byteLength - index * RECEIZ_IDENTITY_SOURCE_PART_BYTES);
    if (!part || !hex.test(part.sha256) || part.byteLength !== expected) integrityFailure();
    const stored = await sourceRecord(`part:${part.sha256}`);
    // Older stores carry Blobs. New writes retain the same exact bytes without
    // invoking the browser's Blob/File storage preparation path.
    const bytes = stored instanceof Uint8Array ? stored
      : stored instanceof Blob ? new Uint8Array(await stored.arrayBuffer())
      : integrityFailure();
    if (bytes.byteLength !== expected) integrityFailure();
    if (digest(bytes) !== part.sha256) integrityFailure();
    chunks.push(bytes);
  }
  const bytes = new Uint8Array(manifest.byteLength);
  let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
  if (digest(bytes) !== ref.sha256) integrityFailure();
  const identity = decodeIdentity(decoder.decode(bytes));
  if (identity.keyFile.keyId !== ref.keyId || identity.localUid !== ref.localUid) integrityFailure();
  sourceMemory().set(ref.sha256, identity);
}

/** Commit complete byte custody/read-back before the compact local register can select it. */
export async function prepareReceizDeviceIdentitySource(identity: StoredReceizDeviceIdentity): Promise<void> {
  if (typeof indexedDB === "undefined") { holdReceizDeviceIdentitySource(identity); return; }
  const wire = wireIdentity(identity);
  const bytes = encoder.encode(wire);
  const ref: ReceizDeviceIdentitySourceRef = { schema: "receiz.device.identity.source-ref.v1", keyId: identity.keyFile.keyId,
    localUid: identity.localUid, sha256: digest(bytes), storage: "indexeddb" };
  const key = RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX + ref.sha256;
  const previous = readDurableLocalTruthItem(key);
  if (previous && (JSON.parse(previous) as ReceizDeviceIdentitySourceRef).storage === "indexeddb") {
    await realizeReceizDeviceIdentitySource(ref);
  } else {
    const parts: SourcePart[] = [];
    for (let offset = 0; offset < bytes.byteLength; offset += RECEIZ_IDENTITY_SOURCE_PART_BYTES) {
      const part = bytes.slice(offset, offset + RECEIZ_IDENTITY_SOURCE_PART_BYTES);
      const descriptor = { sha256: digest(part), byteLength: part.byteLength };
      await sourceRecord(`part:${descriptor.sha256}`, part);
      parts.push(descriptor);
    }
    await sourceRecord(`manifest:${ref.sha256}`, { ...ref, byteLength: bytes.byteLength, parts });
    await realizeReceizDeviceIdentitySource(ref);
  }
  if (wireIdentity(sourceMemory().get(ref.sha256)!) !== wire) integrityFailure();
  const payload = JSON.stringify(ref);
  if (previous === payload) return;
  writeDurableLocalTruthItem(key, payload, { rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source: "receiz-device-identity-source-blob-custody", allowSameRankOverwrite: true });
  if (readDurableLocalTruthItem(key) !== payload) throw new Error("receiz_device_identity_register_write_failed");
}

function integrityFailure(): never {
  throw new Error("receiz_device_identity_source_integrity_failed");
}
function digest(bytes: Uint8Array): string { return bytesToHex(sha256(bytes)); }
function wireIdentity(identity: StoredReceizDeviceIdentity): string {
  const { keyFile, ...record } = identity;
  return JSON.stringify({ identity: record, keyText: serializeReceizKeyFile(keyFile) });
}
function decodeIdentity(wire: string): StoredReceizDeviceIdentity {
  const source = JSON.parse(wire) as { identity?: Partial<StoredReceizDeviceIdentity>; keyText?: string };
  const record = source.identity;
  if (!record || record.schema !== "receiz.device.identity.v1" || typeof source.keyText !== "string"
    || !record.localUid || !record.username || !record.displayName || !record.createdAt || !record.updatedAt) integrityFailure();
  const keyFile = parseReceizKeyFileText(source.keyText);
  if (record.localUid !== keyFile.owner.uid || serializeReceizKeyFile(keyFile) !== source.keyText) integrityFailure();
  return { ...record, keyFile } as StoredReceizDeviceIdentity;
}
function readPart(part: SourcePart): Uint8Array {
  if (!part || !hex.test(part.sha256) || !Number.isSafeInteger(part.byteLength)
    || part.byteLength <= 0 || part.byteLength > RECEIZ_IDENTITY_SOURCE_PART_BYTES) integrityFailure();
  const payload = readDurableLocalTruthItem(RECEIZ_IDENTITY_SOURCE_STORAGE_PREFIX + part.sha256);
  // A bounded compressed part cannot allocate an unbounded inflated source.
  if (!payload || payload.length > (RECEIZ_IDENTITY_SOURCE_PART_BYTES + 1024) * 4 / 3) integrityFailure();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const inflate = new Inflate((chunk) => {
    length += chunk.byteLength;
    if (length > part.byteLength) integrityFailure();
    chunks.push(chunk);
  });
  inflate.push(base64UrlDecode(payload), true);
  if (length !== part.byteLength) integrityFailure();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (digest(bytes) !== part.sha256) integrityFailure();
  return bytes;
}

function openSourceManifest(ref: SourceManifest): StoredReceizDeviceIdentity {
  try {
    if (!ref || ref.schema !== "receiz.device.identity.source-ref.v1" || !hex.test(ref.keyId)
      || !hex.test(ref.sha256) || !Number.isSafeInteger(ref.byteLength) || ref.byteLength <= 0
      || !Array.isArray(ref.parts) || ref.parts.length !== Math.ceil(ref.byteLength / RECEIZ_IDENTITY_SOURCE_PART_BYTES)) integrityFailure();
    // Validate every bounded part before reserving the complete materialization.
    const parts = ref.parts.map((part, index) => {
      const expected = Math.min(RECEIZ_IDENTITY_SOURCE_PART_BYTES, ref.byteLength - index * RECEIZ_IDENTITY_SOURCE_PART_BYTES);
      if (part.byteLength !== expected) integrityFailure();
      return readPart(part);
    });
    const bytes = new Uint8Array(ref.byteLength);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    if (digest(bytes) !== ref.sha256) integrityFailure();
    const identity = decodeIdentity(decoder.decode(bytes));
    if (identity.keyFile.keyId !== ref.keyId || identity.localUid !== ref.localUid) integrityFailure();
    return identity;
  } catch { return integrityFailure(); }
}

export function openReceizDeviceIdentitySource(ref: ReceizDeviceIdentitySourceRef): StoredReceizDeviceIdentity {
  try {
    if (!ref || ref.schema !== "receiz.device.identity.source-ref.v1" || !hex.test(ref.sha256)) integrityFailure();
    const raw = readDurableLocalTruthItem(RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX + ref.sha256);
    if (!raw) integrityFailure();
    const manifest = JSON.parse(raw) as SourceManifest;
    if (manifest.sha256 !== ref.sha256 || manifest.keyId !== ref.keyId || manifest.localUid !== ref.localUid) integrityFailure();
    if (manifest.storage === "indexeddb") {
      const identity = sourceMemory().get(ref.sha256);
      if (!identity) throw new ReceizIdentitySourceNotRealizedError();
      if (identity.keyFile.keyId !== ref.keyId || identity.localUid !== ref.localUid) integrityFailure();
      return identity;
    }
    return openSourceManifest(manifest);
  } catch (error) { if (error instanceof ReceizIdentitySourceNotRealizedError) throw error; return integrityFailure(); }
}

export function holdReceizDeviceIdentitySource(identity: StoredReceizDeviceIdentity): ReceizDeviceIdentitySourceRef {
  const wire = wireIdentity(identity);
  const bytes = encoder.encode(wire);
  const ref: ReceizDeviceIdentitySourceRef = {
    schema: "receiz.device.identity.source-ref.v1", keyId: identity.keyFile.keyId,
    localUid: identity.localUid, sha256: digest(bytes),
  };
  const manifestKey = RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX + ref.sha256;
  if (readDurableLocalTruthItem(manifestKey) !== null) {
    if (wireIdentity(openReceizDeviceIdentitySource(ref)) !== wire) integrityFailure();
    const held = JSON.parse(readDurableLocalTruthItem(manifestKey)!) as ReceizDeviceIdentitySourceRef;
    return held.storage === "indexeddb" ? { ...ref, storage: "indexeddb" } : ref;
  }
  const parts: SourcePart[] = [];
  // Exact bounded writes/read-back first, complete source check next, immutable
  // generation manifest next, active register reference last (caller).
  for (let offset = 0; offset < bytes.byteLength; offset += RECEIZ_IDENTITY_SOURCE_PART_BYTES) {
    const part = bytes.subarray(offset, offset + RECEIZ_IDENTITY_SOURCE_PART_BYTES);
    const descriptor = { sha256: digest(part), byteLength: part.byteLength };
    const key = RECEIZ_IDENTITY_SOURCE_STORAGE_PREFIX + descriptor.sha256;
    const held = readDurableLocalTruthItem(key);
    if (held === null) {
      const payload = base64UrlEncode(deflateSync(part, { level: 9 }));
      writeDurableLocalTruthItem(key, payload, {
        rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock, source: "receiz-device-identity-source",
      });
      if (readDurableLocalTruthItem(key) !== payload) throw new Error("receiz_device_identity_register_write_failed");
    } else {
      readPart(descriptor);
    }
    parts.push(descriptor);
  }
  const manifest: SourceManifest = { ...ref, byteLength: bytes.byteLength, parts };
  if (wireIdentity(openSourceManifest(manifest)) !== wire) throw new Error("receiz_device_identity_register_write_failed");
  const manifestPayload = JSON.stringify(manifest);
  writeDurableLocalTruthItem(manifestKey, manifestPayload, {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock, source: "receiz-device-identity-source-manifest",
  });
  if (readDurableLocalTruthItem(manifestKey) !== manifestPayload) throw new Error("receiz_device_identity_register_write_failed");
  return ref;
}

/** Enumerates exact retained generations for inspection/export, never ancestry election. */
export function listReceizDeviceIdentitySources(keyId?: string): ReceizDeviceIdentitySourceRef[] {
  return readDurableLocalTruthEntriesByPrefix(RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX).flatMap(({ storageKey, entry }) => {
    const manifest = JSON.parse(entry.payload) as SourceManifest;
    if (storageKey !== RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX + manifest.sha256) integrityFailure();
    if (keyId && manifest.keyId !== keyId) return [];
    const ref: ReceizDeviceIdentitySourceRef = {
      schema: manifest.schema, keyId: manifest.keyId, localUid: manifest.localUid, sha256: manifest.sha256,
      ...(manifest.storage === "indexeddb" ? { storage: "indexeddb" as const } : {}),
    };
    openReceizDeviceIdentitySource(ref);
    return [Object.freeze(ref)];
  });
}

export function exportReceizDeviceIdentitySource(ref: ReceizDeviceIdentitySourceRef): string {
  return serializeReceizKeyFile(openReceizDeviceIdentitySource(ref).keyFile);
}
