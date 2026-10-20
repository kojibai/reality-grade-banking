import { deflateSync, Inflate } from "fflate";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const PREFIX = "receiz.profile.snapshot.deflate15.v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const migrated = new WeakSet<Storage>();

/** Reversible storage mechanics only. Admission and truth rank remain with the
 * existing profile/player readers and durable local truth store. No source is sliced. */
export function encodeProfileSnapshotStorage(raw: string): string {
  const bytes = encoder.encode(raw);
  const compressed = deflateSync(bytes);
  let accumulator = 0;
  let bits = 0;
  const characters: string[] = [];
  for (const byte of compressed) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    if (bits >= 15) {
      bits -= 15;
      characters.push(String.fromCharCode(256 + ((accumulator >>> bits) & 32767)));
    }
  }
  if (bits) characters.push(String.fromCharCode(256 + ((accumulator << (15 - bits)) & 32767)));
  const encoded = `${PREFIX}${compressed.length}:${bytes.length}:${bytesToHex(sha256(bytes))}:${characters.join("")}`;
  return encoded.length < raw.length ? encoded : raw;
}

export function decodeProfileSnapshotStorage(raw: string): string {
  if (!raw.startsWith(PREFIX)) return raw;
  const match = /^(\d+):(\d+):([0-9a-f]{64}):/.exec(raw.slice(PREFIX.length));
  if (!match) throw new Error("profile_snapshot_storage_invalid");
  const compressedLength = Number(match[1]);
  const byteLength = Number(match[2]);
  const packed = raw.slice(PREFIX.length + match[0].length);
  if (!Number.isSafeInteger(compressedLength) || compressedLength < 1 ||
      !Number.isSafeInteger(byteLength) || byteLength < 0 ||
      packed.length !== Math.ceil(compressedLength * 8 / 15)) throw new Error("profile_snapshot_storage_invalid");
  const compressed = new Uint8Array(compressedLength);
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const character of packed) {
    const value = character.charCodeAt(0) - 256;
    if (value < 0 || value > 32767) throw new Error("profile_snapshot_storage_invalid");
    accumulator = (accumulator << 15) | value;
    bits += 15;
    while (bits >= 8 && offset < compressedLength) {
      bits -= 8;
      compressed[offset++] = (accumulator >>> bits) & 255;
    }
  }
  if (offset !== compressedLength || (bits && (accumulator & ((1 << bits) - 1)) !== 0)) {
    throw new Error("profile_snapshot_storage_invalid");
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  const inflate = new Inflate(chunk => {
    length += chunk.length;
    if (length > byteLength) throw new Error("profile_snapshot_storage_length");
    chunks.push(chunk);
  });
  inflate.push(compressed, true);
  if (length !== byteLength) throw new Error("profile_snapshot_storage_length");
  const bytes = new Uint8Array(length);
  offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (bytesToHex(sha256(bytes)) !== match[3]) throw new Error("profile_snapshot_storage_integrity");
  return decoder.decode(bytes);
}

/** Codec-versioned keys keep older JSON-only readers from deleting new custody. */
export function encodedProfileSnapshotStorageKey(key: string): string {
  return `${key}.encoded.v1`;
}

/** Commit and read back complete replacement custody before removing its old
 * representation. Small entries move first so a nearly full store can migrate
 * without evicting any source. Failed writes leave old custody untouched. */
export function compactHeldProfileSnapshotStorage(storage: Storage): void {
  if (migrated.has(storage)) return;
  const moves: { key: string; raw: string; encoded: string }[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || key.endsWith(".encoded.v1") ||
        !/^receiz\.profile\.(?:route|live-player)\.snapshot\./.test(key)) continue;
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const unpacked = decodeProfileSnapshotStorage(raw);
      const parsed = JSON.parse(unpacked) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") continue;
      if (parsed.schema === "receiz.local.truth.v1" && typeof parsed.payload === "string") {
        const source = decodeProfileSnapshotStorage(parsed.payload);
        const payload = encodeProfileSnapshotStorage(source);
        if (decodeProfileSnapshotStorage(payload) !== source) continue;
        moves.push({ key, raw, encoded: JSON.stringify({ ...parsed, payload }) });
      } else if (parsed.version === 1 || parsed.version === 2) {
        const encoded = encodeProfileSnapshotStorage(unpacked);
        if (decodeProfileSnapshotStorage(encoded) === unpacked) moves.push({ key, raw, encoded });
      }
    } catch {
      // Malformed or inaccessible custody is never erased by migration.
    }
  }
  moves.sort((left, right) => left.encoded.length - right.encoded.length);
  for (const { key, raw, encoded } of moves) {
    const destination = encodedProfileSnapshotStorageKey(key);
    try {
      if (storage.getItem(key) !== raw) continue;
      const existing = storage.getItem(destination);
      if (existing !== null && existing !== encoded) continue;
      if (existing === null) storage.setItem(destination, encoded);
      if (storage.getItem(destination) === encoded && storage.getItem(key) === raw) storage.removeItem(key);
    } catch {
      // No deletion until the exact complete replacement has been read back.
    }
  }
  migrated.add(storage);
}
