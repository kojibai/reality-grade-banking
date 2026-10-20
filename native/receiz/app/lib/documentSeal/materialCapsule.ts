import { deflateSync, inflateSync } from "fflate";

import { buildProofBearingReceizVPathFromBundle } from "@/app/lib/documentSeal/proofBearingVLink";
import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";

export const RECEIZ_MATERIAL_FRAGMENT_KEY = "material" as const;
export const RECEIZ_MATERIAL_CAPSULE_PREFIX = "rma2:" as const;
// RMA2 carries the exact length as U32. Do not impose a smaller product limit
// than the browser that already holds the input Uint8Array.
export const MAX_RECEIZ_MATERIAL_CAPSULE_BYTES = 0xffff_ffff;

const HEADER_BYTES = 12;
const COMPRESSED_MAGIC = Uint8Array.of(0x52, 0x4d, 0x41, 0x32); // RMA2
const RAW_MAGIC = Uint8Array.of(0x52, 0x4d, 0x41, 0x33); // RMA3
const MAX_FILENAME_BYTES = 1_024;
const MAX_MIME_BYTES = 256;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export type ReceizMaterialCapsule = Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

export type ReceizRawMaterialCapsuleBlob = Readonly<{
  blob: Blob;
  exactArtifactOffset: number;
  exactArtifactByteLength: number;
  filename: string;
  mimeType: string;
}>;

export type ReceizRawMaterialCapsuleHeader = Readonly<{
  exactArtifactOffset: number;
  exactArtifactByteLength: number;
  filename: string;
  mimeType: string;
}>;

function materialCapsuleProjection(input: Readonly<{
  exactArtifactByteLength: number;
  filename: string;
  mimeType: string;
}>): Readonly<{
  filename: string;
  mimeType: string;
  filenameBytes: Uint8Array;
  mimeBytes: Uint8Array;
}> {
  if (!Number.isSafeInteger(input.exactArtifactByteLength) || input.exactArtifactByteLength < 1) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_EMPTY");
  }
  if (input.exactArtifactByteLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_ADDRESS_SPACE_EXCEEDED");
  }
  const filename = input.filename.trim() || "sealed-material.bin";
  const mimeType = input.mimeType.trim() || "application/octet-stream";
  const filenameBytes = textEncoder.encode(filename);
  const mimeBytes = textEncoder.encode(mimeType);
  if (filenameBytes.byteLength > MAX_FILENAME_BYTES || mimeBytes.byteLength > MAX_MIME_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_PROJECTION_INVALID");
  }
  return Object.freeze({ filename, mimeType, filenameBytes, mimeBytes });
}

/**
 * RMA3 is the bounded-memory composite carrier. The exact sealed Blob remains
 * the source and is referenced by the Blob constructor; no playback byte copy
 * or compression pass enters sealing custody.
 */
export function buildReceizRawMaterialCapsuleBlob(input: Readonly<{
  exactArtifactBlob: Blob;
  filename: string;
  mimeType: string;
}>): ReceizRawMaterialCapsuleBlob {
  const projection = materialCapsuleProjection({
    exactArtifactByteLength: input.exactArtifactBlob.size,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  const header = new Uint8Array(HEADER_BYTES);
  header.set(RAW_MAGIC, 0);
  writeU32(header, 4, input.exactArtifactBlob.size);
  writeU16(header, 8, projection.filenameBytes.byteLength);
  writeU16(header, 10, projection.mimeBytes.byteLength);
  const exactArtifactOffset = HEADER_BYTES
    + projection.filenameBytes.byteLength
    + projection.mimeBytes.byteLength;
  return Object.freeze({
    blob: new Blob([
      Uint8Array.from(header).buffer,
      Uint8Array.from(projection.filenameBytes).buffer,
      Uint8Array.from(projection.mimeBytes).buffer,
      input.exactArtifactBlob,
    ], { type: "application/vnd.receiz.material-capsule" }),
    exactArtifactOffset,
    exactArtifactByteLength: input.exactArtifactBlob.size,
    filename: projection.filename,
    mimeType: projection.mimeType,
  });
}

/** Binary URL payload before base64url projection. Large carriers segment these exact bytes. */
export function encodeReceizMaterialCapsuleBytes(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): Uint8Array {
  const exactArtifactBytes = input.exactArtifactBytes;
  if (!exactArtifactBytes.byteLength) throw new TypeError("RECEIZ_MATERIAL_CAPSULE_EMPTY");
  if (exactArtifactBytes.byteLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_ADDRESS_SPACE_EXCEEDED");
  }
  const { filenameBytes, mimeBytes } = materialCapsuleProjection({
    exactArtifactByteLength: exactArtifactBytes.byteLength,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  const payload = new Uint8Array(filenameBytes.byteLength + mimeBytes.byteLength + exactArtifactBytes.byteLength);
  payload.set(filenameBytes, 0);
  payload.set(mimeBytes, filenameBytes.byteLength);
  payload.set(exactArtifactBytes, filenameBytes.byteLength + mimeBytes.byteLength);
  const compressed = deflateSync(payload, { level: 9 });
  const carried = new Uint8Array(HEADER_BYTES + compressed.byteLength);
  carried.set(COMPRESSED_MAGIC, 0);
  writeU32(carried, 4, exactArtifactBytes.byteLength);
  writeU16(carried, 8, filenameBytes.byteLength);
  writeU16(carried, 10, mimeBytes.byteLength);
  carried.set(compressed, HEADER_BYTES);
  return carried;
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!
  ) >>> 0;
}

function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 8) | bytes[offset + 1]!) >>> 0;
}

function hasMagic(bytes: Uint8Array, magic: Uint8Array): boolean {
  return magic.every((value, index) => bytes[index] === value);
}

export function readReceizRawMaterialCapsuleHeader(
  prefixBytes: Uint8Array,
): ReceizRawMaterialCapsuleHeader {
  if (prefixBytes.byteLength < HEADER_BYTES || !hasMagic(prefixBytes, RAW_MAGIC)) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_HEADER_INVALID");
  }
  const exactArtifactByteLength = readU32(prefixBytes, 4);
  const filenameLength = readU16(prefixBytes, 8);
  const mimeLength = readU16(prefixBytes, 10);
  if (!exactArtifactByteLength || exactArtifactByteLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_INVALID");
  }
  if (!filenameLength || filenameLength > MAX_FILENAME_BYTES || !mimeLength || mimeLength > MAX_MIME_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_PROJECTION_INVALID");
  }
  const exactArtifactOffset = HEADER_BYTES + filenameLength + mimeLength;
  if (prefixBytes.byteLength < exactArtifactOffset) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_HEADER_TRUNCATED");
  }
  return Object.freeze({
    exactArtifactOffset,
    exactArtifactByteLength,
    filename: textDecoder.decode(prefixBytes.subarray(HEADER_BYTES, HEADER_BYTES + filenameLength)),
    mimeType: textDecoder.decode(prefixBytes.subarray(
      HEADER_BYTES + filenameLength,
      exactArtifactOffset,
    )),
  });
}

export function encodeReceizMaterialCapsule(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>): string {
  const carried = encodeReceizMaterialCapsuleBytes(input);
  return `${RECEIZ_MATERIAL_CAPSULE_PREFIX}${base64UrlEncode(carried)}`;
}

export function decodeReceizMaterialCapsuleBytes(carried: Uint8Array): ReceizMaterialCapsule {
  const compressed = hasMagic(carried, COMPRESSED_MAGIC);
  const raw = hasMagic(carried, RAW_MAGIC);
  if (carried.byteLength <= HEADER_BYTES || (!compressed && !raw)) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_HEADER_INVALID");
  }
  const declaredLength = readU32(carried, 4);
  const filenameLength = readU16(carried, 8);
  const mimeLength = readU16(carried, 10);
  if (!declaredLength || declaredLength > MAX_RECEIZ_MATERIAL_CAPSULE_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_INVALID");
  }
  if (!filenameLength || filenameLength > MAX_FILENAME_BYTES || !mimeLength || mimeLength > MAX_MIME_BYTES) {
    throw new RangeError("RECEIZ_MATERIAL_CAPSULE_PROJECTION_INVALID");
  }
  const projectedLength = declaredLength + filenameLength + mimeLength;
  if (raw) {
    const header = readReceizRawMaterialCapsuleHeader(carried);
    if (carried.byteLength !== header.exactArtifactOffset + declaredLength) {
      throw new TypeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_MISMATCH");
    }
    return Object.freeze({
      exactArtifactBytes: carried.subarray(header.exactArtifactOffset),
      filename: header.filename,
      mimeType: header.mimeType,
    });
  }
  const opened = inflateSync(carried.slice(HEADER_BYTES), {
    out: new Uint8Array(projectedLength + 1),
  });
  if (opened.byteLength !== projectedLength) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_LENGTH_MISMATCH");
  }
  return Object.freeze({
    exactArtifactBytes: opened.slice(filenameLength + mimeLength),
    filename: textDecoder.decode(opened.slice(0, filenameLength)),
    mimeType: textDecoder.decode(opened.slice(filenameLength, filenameLength + mimeLength)),
  });
}

export function decodeReceizMaterialCapsule(token: string): ReceizMaterialCapsule {
  const normalized = token.trim();
  if (!normalized.startsWith(RECEIZ_MATERIAL_CAPSULE_PREFIX)) {
    throw new TypeError("RECEIZ_MATERIAL_CAPSULE_SCHEMA_INVALID");
  }
  const carried = base64UrlDecode(normalized.slice(RECEIZ_MATERIAL_CAPSULE_PREFIX.length));
  return decodeReceizMaterialCapsuleBytes(carried);
}

export function buildReceizMaterialVPath(input: Readonly<{
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  proofBundle: ReceizProofBundle;
}>): string {
  const proofPath = buildProofBearingReceizVPathFromBundle(input.proofBundle);
  const fragment = new URLSearchParams({
    [RECEIZ_MATERIAL_FRAGMENT_KEY]: encodeReceizMaterialCapsule(input),
  });
  return `${proofPath}#${fragment.toString()}`;
}

export function buildReceizMaterialVUrl(
  input: Readonly<{
    exactArtifactBytes: Uint8Array;
    filename: string;
    mimeType: string;
    proofBundle: ReceizProofBundle;
  }>,
  publicOrigin = "https://receiz.com",
): string {
  return new URL(buildReceizMaterialVPath(input), publicOrigin).toString();
}

export function readReceizMaterialCapsuleFromLocation(location: Readonly<{
  hash: string;
}>): ReceizMaterialCapsule | null {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const token = new URLSearchParams(hash).get(RECEIZ_MATERIAL_FRAGMENT_KEY);
  return token ? decodeReceizMaterialCapsule(token) : null;
}
