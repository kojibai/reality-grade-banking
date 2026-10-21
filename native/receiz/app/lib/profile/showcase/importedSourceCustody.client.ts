"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { completeBlobCustodyTransaction, blobCustodyRequestResult } from "@/app/lib/transport/blobCustodyTransactions.client";
import { EXACT_BYTE_BLOCK_MAX_BYTES, parseExactByteBlockReference, readExactByteBlocks, writeExactByteBlocks, type ExactByteBlockReference, type ExactByteBlockResolver, type ExactByteBlockWriter } from "@/app/lib/transport/exactByteBlocks";
import {
  openImportedProofSource, reopenImportedProofSource, parseImportedProofSourceReference, requireOpenedImportedProofSource, writeImportedProofSourceReference,
  type ImportedProofSourceDescriptor, type ImportedProofSourceReference, type ImportedProofSourceOptions,
  type OpenedImportedProofSource,
  type ImportedProofSourceColdSpool,
} from "./importedSource";

export const IMPORTED_SOURCE_CUSTODY_DB = "receiz-imported-source-custody-v1";
const PREFIX = "IMPORTED_SOURCE_CUSTODY";
type Segment = Readonly<{ sha256: string; byteLength: number }>;
type CompleteSource = Readonly<{ key: string; reference: ImportedProofSourceReference; segments: readonly Segment[];
  nested?: readonly ImportedProofSourceReference[];
  resources?: readonly ExactByteBlockReference[];
  presentation?: Readonly<{ payload: ExactByteBlockReference; payloadSha256: string; payloadMimeType: string; payloadFilename: string }> }>;

function sourceKey(source: ImportedProofSourceDescriptor): string {
  return JSON.stringify([source.artifactSha256, source.byteLength, source.filename, source.mimeType]);
}
function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error(`${PREFIX}_UNAVAILABLE`));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMPORTED_SOURCE_CUSTODY_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("segments", { keyPath: "sha256" });
      request.result.createObjectStore("sources", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`${PREFIX}_OPEN_FAILED`));
    request.onblocked = () => reject(new Error(`${PREFIX}_OPEN_BLOCKED`));
  });
}
async function readRecord(store: string, key: string): Promise<unknown> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(store, "readonly");
    const completion = completeBlobCustodyTransaction(transaction, PREFIX);
    // Observe both promises immediately: a failed request also aborts its tx.
    const [value] = await Promise.all([
      blobCustodyRequestResult(transaction.objectStore(store).get(key), PREFIX), completion,
    ]);
    return value;
  } finally { database.close(); }
}
async function writeRecord(store: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(store, "readwrite");
    const completion = completeBlobCustodyTransaction(transaction, PREFIX);
    try { transaction.objectStore(store).put(value); }
    catch (error) { transaction.abort(); await completion.catch(() => {}); throw error; }
    await completion;
  } finally { database.close(); }
}
async function readSegment(descriptor: Segment): Promise<Blob> {
  if (!descriptor || !/^[0-9a-f]{64}$/.test(descriptor.sha256)
    || !Number.isSafeInteger(descriptor.byteLength) || descriptor.byteLength <= 0
    || descriptor.byteLength > EXACT_BYTE_BLOCK_MAX_BYTES) throw new TypeError(`${PREFIX}_SEGMENT_INVALID`);
  const value = await readRecord("segments", descriptor.sha256) as { sha256?: unknown; byteLength?: unknown; blob?: unknown } | undefined;
  if (!value) throw new TypeError(`${PREFIX}_SEGMENT_MISSING`);
  if (value.sha256 !== descriptor.sha256 || value.byteLength !== descriptor.byteLength
    || !(value.blob instanceof Blob) || value.blob.size !== descriptor.byteLength
    || bytesToHex(sha256(new Uint8Array(await value.blob.arrayBuffer()))) !== descriptor.sha256) {
    throw new TypeError(`${PREFIX}_SEGMENT_INVALID`);
  }
  return value.blob;
}

/** Explicit browser composition; generic/server source readers never import IDB.
 * Records locate exact bytes only. A cold storage record must still pass the
 * enclosing canonical verifier and privacy inspection. Restarted Showcase
 * first paint must compose its existing admitted projection custody separately;
 * it must not call this cold verifier for every navigation. */
export function createImportedProofSourceCustody() {
  const admitted = new Map<string, OpenedImportedProofSource>();
  const retain = (source: OpenedImportedProofSource) => {
    requireOpenedImportedProofSource(source);
    const key = sourceKey(source.descriptor);
    if (!admitted.has(key)) admitted.set(key, source);
    return admitted.get(key)!;
  };
  const createColdSpool = (): ImportedProofSourceColdSpool => {
    const segments: Segment[] = [];
    return {
      async writeSegment(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const segment = Object.freeze({ sha256: bytesToHex(sha256(bytes)), byteLength: bytes.byteLength });
        await writeRecord("segments", { ...segment, blob });
        const stored = await readSegment(segment);
        segments.push(segment);
        return stored;
      },
      async complete(reference) {
        const key = sourceKey(reference);
        const existing = await readRecord("sources", key) as CompleteSource | undefined;
        await writeRecord("sources", { ...(existing?.key === key ? existing : {}), key, reference, segments } satisfies CompleteSource);
      },
    };
  };
  return Object.freeze({
    retain,
    /** Same bounded exact-byte store used by imported source custody. This does
     * not admit an Original or mark a source complete. */
    async writeBlock(reference:ExactByteBlockReference,bytes:Uint8Array){
      reference=parseExactByteBlockReference(reference);
      if(bytes.length!==reference.byteLength||bytes.length===0||bytes.length>EXACT_BYTE_BLOCK_MAX_BYTES||bytesToHex(sha256(bytes))!==reference.sha256)throw new TypeError(`${PREFIX}_SEGMENT_INVALID`);
      await writeRecord("segments",{sha256:reference.sha256,byteLength:reference.byteLength,blob:new Blob([bytes.slice().buffer as ArrayBuffer])});
    },
    createColdSpool,
    /** Initial selected-source admission already verified the enclosing proof.
     * Complete durable custody before exposing placement; never verify it again. */
    async hold(source: OpenedImportedProofSource): Promise<ImportedProofSourceReference> {
      requireOpenedImportedProofSource(source);
      const nested: ImportedProofSourceReference[] = [];
      for (const child of source.referencedSources ?? []) nested.push(await this.hold(child));
      const segments: Segment[] = [];
      const reference = await writeImportedProofSourceReference(source, async (ref, bytes) => {
        const segment = { sha256: ref.sha256, byteLength: ref.byteLength };
        await writeRecord("segments", { ...segment, blob: new Blob([bytes.slice().buffer as ArrayBuffer]) });
        await readSegment(segment);
        if (ref.kind === "bytes") segments.push(segment);
      });
      const resources:ExactByteBlockReference[]=[];
      for(const file of source.projection.bankAsset?.composer?.files??[]){
        const body=source.composerResources?.[file.id];if(!body)throw new Error(`${PREFIX}_RESOURCE_MISSING`);
        const root=await writeExactByteBlocks(body,this.writeBlock);
        if(JSON.stringify(root)!==JSON.stringify(file.bytes))throw new TypeError(`${PREFIX}_RESOURCE_BINDING_INVALID`);
        resources.push(root);
      }
      const payload = await writeExactByteBlocks(source.payload, async (ref, bytes) => {
        await writeRecord("segments", { sha256: ref.sha256, byteLength: ref.byteLength,
          blob: new Blob([bytes.slice().buffer as ArrayBuffer]) });
      });
      await writeRecord("sources", { key: sourceKey(reference), reference, segments, nested, resources,
        presentation: { payload, payloadSha256: source.projection.payloadSha256,
          payloadMimeType: source.projection.payloadMimeType, payloadFilename: source.projection.payloadFilename } } satisfies CompleteSource);
      retain(source);
      return reference;
    },
    /** Realizes exact accepted source/payload custody after restart, beneath an
     * already-admitted Original. No canonical proof work runs during render. */
    async readAdmittedPresentation(value: ImportedProofSourceReference, expected: Readonly<{
      payloadSha256: string; payloadByteLength: number; payloadMimeType: string; payloadFilename: string;
    }>) {
      const expectedPayloadSha256 = expected.payloadSha256;
      const reference = parseImportedProofSourceReference(value);
      const known = admitted.get(sourceKey(reference));
      if (known && known.projection.payloadSha256 === expectedPayloadSha256
        && known.projection.payloadByteLength === expected.payloadByteLength
        && known.projection.payloadMimeType === expected.payloadMimeType
        && known.projection.payloadFilename === expected.payloadFilename) return {
        exactArtifact: known.exactArtifact, payload: known.payload, payloadFilename: known.projection.payloadFilename,
        payloadMimeType: known.projection.payloadMimeType,
      };
      const stored = await readRecord("sources", sourceKey(reference)) as CompleteSource | undefined;
      if (!stored?.presentation || stored.key !== sourceKey(reference)
        || sourceKey(parseImportedProofSourceReference(stored.reference)) !== sourceKey(reference)
        || stored.presentation.payloadSha256 !== expectedPayloadSha256
        || stored.presentation.payload.contentByteLength !== expected.payloadByteLength
        || stored.presentation.payloadMimeType !== expected.payloadMimeType
        || stored.presentation.payloadFilename !== expected.payloadFilename) return null;
      const realize = async (root: ExactByteBlockReference, expectedHash: string, expectedBytes: number, mime: string) => {
        if (root.contentByteLength !== expectedBytes) throw new TypeError(`${PREFIX}_EXACT_BINDING_MISMATCH`);
        const blobs: Blob[] = []; const hash = sha256.create();
        for await (const bytes of readExactByteBlocks(root, async ref => {
          const blob = await readSegment(ref);
          if (ref.kind === "bytes") blobs.push(blob);
          return new Uint8Array(await blob.arrayBuffer());
        }, { component: "admitted imported source presentation", maxContentBytes: expectedBytes, maxBlockReads: 131_072 })) {
          hash.update(bytes);
        }
        if (bytesToHex(hash.digest()) !== expectedHash) throw new TypeError(`${PREFIX}_EXACT_BINDING_MISMATCH`);
        return new Blob(blobs, { type: mime });
      };
      return { exactArtifact: await realize(reference.bytes, reference.artifactSha256, reference.byteLength, reference.mimeType),
        payload: await realize(stored.presentation.payload, expectedPayloadSha256, expected.payloadByteLength, expected.payloadMimeType),
        payloadFilename: stored.presentation.payloadFilename, payloadMimeType: stored.presentation.payloadMimeType };
    },
    /** Export only the exact closure referenced by an admitted public source.
     * Missing held blocks fail; remote bytes never silently fill local custody. */
    async resolveBlock(ref: ExactByteBlockReference): Promise<Uint8Array> {
      return new Uint8Array(await (await readSegment(ref)).arrayBuffer());
    },
    async exportBlocks(value: ImportedProofSourceReference, write: ExactByteBlockWriter) {
      const pending = [parseImportedProofSourceReference(value)];
      const seen = new Set<string>();
      while (pending.length) {
      const reference = pending.pop()!;
      if (seen.has(sourceKey(reference))) continue;
      if (seen.size >= 32) throw new Error("IMPORTED_SOURCE_NESTED_EXPORT_BUDGET");
      seen.add(sourceKey(reference));
      const stored = await readRecord("sources", sourceKey(reference)) as CompleteSource | undefined;
      pending.push(...(stored?.nested ?? []).map(parseImportedProofSourceReference));
      for(const root of [reference.bytes,...(stored?.resources??[]).map(parseExactByteBlockReference)])
      for await (const _bytes of readExactByteBlocks(root, async ref => {
        const blob = await readSegment(ref);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await write(ref, bytes);
        return bytes;
      }, { component: "imported source export", maxContentBytes: Math.max(reference.byteLength,64*1024*1024), maxBlockReads: 131_072 })) { void _bytes; /* Complete exact closure before the caller publishes its root. */ }
      }
    },
    async reopen(value: ImportedProofSourceReference, resolver: ExactByteBlockResolver, options: ImportedProofSourceOptions = {}) {
      const reference = parseImportedProofSourceReference(value);
      const known = admitted.get(sourceKey(reference));
      if (known) return known;
      const opened = await reopenImportedProofSource(reference, resolver, {
        ...options, coldSpool: createColdSpool(), nestedColdSpool: createColdSpool });
      await this.hold(opened);
      return retain(opened);
    },
    async readHeld(value: ImportedProofSourceReference, options: ImportedProofSourceOptions = {}) {
      const reference = parseImportedProofSourceReference(value);
      const key = sourceKey(reference);
      const known = admitted.get(key);
      if (known) return known;
      const record = await readRecord("sources", key) as CompleteSource | undefined;
      if (!record) return null;
      const stored = parseImportedProofSourceReference(record.reference);
      if (record.key !== key || sourceKey(stored) !== key || !Array.isArray(record.segments)
        || record.segments.length === 0 || record.segments.length > reference.byteLength) throw new TypeError(`${PREFIX}_RECORD_INVALID`);
      const blobs: Blob[] = [];
      let byteLength = 0;
      const hash = sha256.create();
      for (const segment of record.segments) {
        const blob = await readSegment(segment);
        byteLength += blob.size;
        if (byteLength > reference.byteLength) throw new TypeError(`${PREFIX}_RECORD_INVALID`);
        hash.update(new Uint8Array(await blob.arrayBuffer()));
        blobs.push(blob);
      }
      if (byteLength !== reference.byteLength || bytesToHex(hash.digest()) !== reference.artifactSha256) throw new TypeError(`${PREFIX}_EXACT_BINDING_MISMATCH`);
      const opened = await openImportedProofSource(new File(blobs, reference.filename, { type: reference.mimeType }), {
        ...options, resolveSourceBlock: ref => this.resolveBlock(ref), nestedColdSpool: createColdSpool });
      if (sourceKey(opened.descriptor) !== key) throw new TypeError(`${PREFIX}_EXACT_BINDING_MISMATCH`);
      return retain(opened);
    },
  });
}
