import { sha256Hex } from "@/app/utils/sha256";

export const JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION = "jpeg-adobe-xmp-app1-v1" as const;
export const JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v2" as const;
export const JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v3" as const;
export const JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v4" as const;
export const JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v5" as const;
export const JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v6" as const;

export type ReceizJpegArtifactBasisNormalization =
  | typeof JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION
  | typeof JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION
  | typeof JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION
  | typeof JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION
  | typeof JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION
  | typeof JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION;

export type ReceizArtifactBasisDeclaration = Readonly<{
  algorithm: "sha256";
  normalization: ReceizJpegArtifactBasisNormalization;
}>;

export const JPEG_ADOBE_XMP_APP1_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION,
});

export const JPEG_IOS_PHOTOS_CARRIER_V2_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION,
});

export const JPEG_IOS_PHOTOS_CARRIER_V3_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION,
});

export const JPEG_IOS_PHOTOS_CARRIER_V4_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION,
});

export const JPEG_IOS_PHOTOS_CARRIER_V5_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION,
});

export const JPEG_IOS_PHOTOS_CARRIER_V6_ARTIFACT_BASIS: ReceizArtifactBasisDeclaration = Object.freeze({
  algorithm: "sha256",
  normalization: JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION,
});

export type ReceizJpegXmpCarrierAppend = Readonly<{
  namespace: "adobe-xmp-standard" | "adobe-xmp-extended";
  ordinal: number;
  byteLength: number;
  sha256: string;
}>;

export type NormalizedJpegArtifactBasis = Readonly<{
  basisBytes: Uint8Array;
  carrierAppends: readonly ReceizJpegXmpCarrierAppend[];
}>;

const STANDARD_XMP_IDENTIFIER = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
const EXTENDED_XMP_IDENTIFIER = new TextEncoder().encode("http://ns.adobe.com/xmp/extension/\0");
const EXIF_IDENTIFIER = new TextEncoder().encode("Exif\0\0");
const PHOTOSHOP_APP13_IDENTIFIER = new TextEncoder().encode("Photoshop 3.0\0");

function startsWithAt(bytes: Uint8Array, prefix: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + prefix.byteLength > bytes.byteLength) return false;
  for (let index = 0; index < prefix.byteLength; index += 1) {
    if (bytes[offset + index] !== prefix[index]) return false;
  }
  return true;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function canonicalizeExifTrailingNullPadding(
  bytes: Uint8Array,
  markerStart: number,
  markerCodeEnd: number,
  payloadOffset: number,
  segmentEnd: number,
): Uint8Array {
  let trailingNullCount = 0;
  for (let index = segmentEnd - 1; index >= payloadOffset && bytes[index] === 0; index -= 1) {
    trailingNullCount += 1;
  }
  if (trailingNullCount <= 2) return bytes.slice(markerStart, segmentEnd);

  const canonicalEnd = segmentEnd - (trailingNullCount - 2);
  const canonicalDeclaredLength = canonicalEnd - markerCodeEnd;
  return concat([
    bytes.slice(markerStart, markerCodeEnd),
    new Uint8Array([(canonicalDeclaredLength >>> 8) & 0xff, canonicalDeclaredLength & 0xff]),
    bytes.slice(payloadOffset, canonicalEnd),
  ]);
}

const TIFF_TYPE_BYTE_LENGTH = new Map<number, number>([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 4],
  [5, 8],
  [7, 1],
  [9, 4],
  [10, 8],
  [11, 4],
  [12, 8],
]);
const TIFF_PRIMARY_IFD_POINTER_TAGS = new Set([0x8769, 0x8825, 0xa005]);
const PHOTOS_IFD1_TAGS = new Set([0x0103, 0x011a, 0x011b, 0x0128, 0x0201, 0x0202]);
const APPLE_IOS_MAKER_NOTE_IDENTIFIER = new TextEncoder().encode("Apple iOS\0\0");
const APPLE_MAKER_NOTE_ASSET_UUID_TAG = 0x0011;
const APPLE_MAKER_NOTE_PHOTOS_ASSET_TOKEN_TAG = 0x0016;
const EXIF_BRIGHTNESS_VALUE_TAG = 0x9203;
const GPS_ALTITUDE_TAG = 0x0006;
const EXIF_BRIGHTNESS_CANONICAL_SCALE = 10_000_000;
const GPS_ALTITUDE_CANONICAL_SCALE = 100_000;
const CANONICAL_APPLE_ASSET_UUID = new TextEncoder().encode("00000000-0000-0000-0000-000000000000\0");
const APPLE_PHOTOS_ASSET_TOKEN_PREFIX = new Uint8Array([
  0x62, 0x70, 0x6c, 0x69, 0x73, 0x74, 0x30, 0x30, 0x5f, 0x10, 0x1c,
]);
const APPLE_PHOTOS_ASSET_TOKEN_SUFFIX = new Uint8Array([
  0x08,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x27,
]);
const APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH = 28;
const APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH = (
  APPLE_PHOTOS_ASSET_TOKEN_PREFIX.byteLength
  + APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH
  + APPLE_PHOTOS_ASSET_TOKEN_SUFFIX.byteLength
);
const CANONICAL_APPLE_PHOTOS_ASSET_TOKEN = concat([
  APPLE_PHOTOS_ASSET_TOKEN_PREFIX,
  new TextEncoder().encode("A".repeat(APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH)),
  APPLE_PHOTOS_ASSET_TOKEN_SUFFIX,
]);

type TiffEntry = Readonly<{
  tag: number;
  type: number;
  count: number;
  value: number;
  valueByteLength: number;
  valueOffset: number | null;
}>;

type TiffIfd = Readonly<{
  entries: readonly TiffEntry[];
  nextIfdOffset: number;
  tableEnd: number;
  referencedEnd: number;
}>;

function canonicalizeExifAppleMakerNoteAssetIdentifiers(
  bytes: Uint8Array,
  markerStart: number,
  payloadOffset: number,
  segmentEnd: number,
  includePhotosAssetToken: boolean,
): Uint8Array | null {
  const tiffOffset = payloadOffset + EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength
      ? view.getUint16(offset, littleEndian)
      : null
  );
  const uint32 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength
      ? view.getUint32(offset, littleEndian)
      : null
  );
  if (uint16(2) !== 42) return null;

  const findEntry = (
    ifdOffset: number,
    wantedTag: number,
  ): { type: number; count: number; value: number } | null => {
    const count = uint16(ifdOffset);
    if (count === null) return null;
    const tableEnd = ifdOffset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    let found: { type: number; count: number; value: number } | null = null;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      if (tag !== wantedTag) continue;
      if (found) return null;
      found = { type, count: entryCount, value };
    }
    return found;
  };

  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const exifPointer = findEntry(ifd0Offset, 0x8769);
  if (!exifPointer || exifPointer.type !== 4 || exifPointer.count !== 1) return null;
  const makerNoteEntry = findEntry(exifPointer.value, 0x927c);
  if (
    !makerNoteEntry
    || makerNoteEntry.type !== 7
    || makerNoteEntry.count < APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength + 16
  ) {
    return null;
  }

  const makerNoteOffset = makerNoteEntry.value;
  const makerNoteEnd = makerNoteOffset + makerNoteEntry.count;
  if (
    !Number.isSafeInteger(makerNoteEnd)
    || makerNoteOffset < 0
    || makerNoteEnd > tiffLength
    || !startsWithAt(bytes, APPLE_IOS_MAKER_NOTE_IDENTIFIER, tiffOffset + makerNoteOffset)
  ) {
    return null;
  }
  const makerNoteByteOrderOffset = makerNoteOffset + APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength + 1;
  if (
    bytes[tiffOffset + makerNoteOffset + APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength] !== 1
    || bytes[tiffOffset + makerNoteByteOrderOffset] !== 0x4d
    || bytes[tiffOffset + makerNoteByteOrderOffset + 1] !== 0x4d
  ) {
    return null;
  }
  const makerView = new DataView(
    bytes.buffer,
    bytes.byteOffset + tiffOffset + makerNoteOffset,
    makerNoteEntry.count,
  );
  const makerIfdOffset = makerNoteByteOrderOffset + 2 - makerNoteOffset;
  if (makerIfdOffset + 2 > makerNoteEntry.count) return null;
  const makerEntryCount = makerView.getUint16(makerIfdOffset, false);
  const makerTableEnd = makerIfdOffset + 2 + makerEntryCount * 12 + 4;
  if (!Number.isSafeInteger(makerTableEnd) || makerTableEnd > makerNoteEntry.count) return null;

  let assetUuidOffset: number | null = null;
  let photosAssetTokenOffset: number | null = null;
  for (let index = 0; index < makerEntryCount; index += 1) {
    const entryOffset = makerIfdOffset + 2 + index * 12;
    const tag = makerView.getUint16(entryOffset, false);
    const type = makerView.getUint16(entryOffset + 2, false);
    const count = makerView.getUint32(entryOffset + 4, false);
    const value = makerView.getUint32(entryOffset + 8, false);
    if (tag === APPLE_MAKER_NOTE_ASSET_UUID_TAG) {
      if (assetUuidOffset !== null) return null;
      if (
        type !== 2
        || count !== CANONICAL_APPLE_ASSET_UUID.byteLength
        || value < makerTableEnd
        || value + count > makerNoteEntry.count
      ) {
        return null;
      }
      assetUuidOffset = value;
      continue;
    }
    if (includePhotosAssetToken && tag === APPLE_MAKER_NOTE_PHOTOS_ASSET_TOKEN_TAG) {
      if (photosAssetTokenOffset !== null) return null;
      if (
        type !== 7
        || count !== APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH
        || value < makerTableEnd
        || value + count > makerNoteEntry.count
      ) {
        return null;
      }
      photosAssetTokenOffset = value;
    }
  }
  if (assetUuidOffset === null && photosAssetTokenOffset === null) return null;

  if (assetUuidOffset !== null) {
    const uuidBytes = bytes.slice(
      tiffOffset + makerNoteOffset + assetUuidOffset,
      tiffOffset + makerNoteOffset + assetUuidOffset + CANONICAL_APPLE_ASSET_UUID.byteLength,
    );
    const uuidText = new TextDecoder("ascii").decode(uuidBytes.slice(0, -1));
    if (
      uuidBytes[uuidBytes.byteLength - 1] !== 0
      || !/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuidText)
    ) {
      return null;
    }
  }

  if (photosAssetTokenOffset !== null) {
    const tokenBytes = bytes.slice(
      tiffOffset + makerNoteOffset + photosAssetTokenOffset,
      tiffOffset + makerNoteOffset + photosAssetTokenOffset + APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH,
    );
    const tokenTextStart = APPLE_PHOTOS_ASSET_TOKEN_PREFIX.byteLength;
    const tokenTextEnd = tokenTextStart + APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH;
    const tokenText = new TextDecoder("ascii").decode(tokenBytes.slice(tokenTextStart, tokenTextEnd));
    if (
      !startsWithAt(tokenBytes, APPLE_PHOTOS_ASSET_TOKEN_PREFIX, 0)
      || !equalBytes(tokenBytes.slice(tokenTextEnd), APPLE_PHOTOS_ASSET_TOKEN_SUFFIX)
      || !/^[A-Za-z0-9+/]{28}$/.test(tokenText)
    ) {
      return null;
    }
  }

  const canonical = bytes.slice(markerStart, segmentEnd);
  if (assetUuidOffset !== null) {
    const canonicalUuidOffset = tiffOffset + makerNoteOffset + assetUuidOffset - markerStart;
    canonical.set(CANONICAL_APPLE_ASSET_UUID, canonicalUuidOffset);
  }
  if (photosAssetTokenOffset !== null) {
    const canonicalTokenOffset = tiffOffset + makerNoteOffset + photosAssetTokenOffset - markerStart;
    canonical.set(CANONICAL_APPLE_PHOTOS_ASSET_TOKEN, canonicalTokenOffset);
  }
  return canonical;
}

function canonicalizeExifIosPhotosReserializedRationals(
  bytes: Uint8Array,
  markerStart: number,
  payloadOffset: number,
  segmentEnd: number,
): Uint8Array | null {
  const tiffOffset = payloadOffset + EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength
      ? view.getUint16(offset, littleEndian)
      : null
  );
  const uint32 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength
      ? view.getUint32(offset, littleEndian)
      : null
  );
  if (uint16(2) !== 42) return null;

  type LocatedEntry = Readonly<{
    type: number;
    count: number;
    value: number;
    tableEnd: number;
  }>;
  const findEntry = (ifdOffset: number, wantedTag: number): LocatedEntry | null | undefined => {
    const count = uint16(ifdOffset);
    if (count === null) return null;
    const tableEnd = ifdOffset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    let found: LocatedEntry | undefined;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      if (tag !== wantedTag) continue;
      if (found) return null;
      found = { type, count: entryCount, value, tableEnd };
    }
    return found;
  };

  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const exifPointer = findEntry(ifd0Offset, 0x8769);
  const gpsPointer = findEntry(ifd0Offset, 0x8825);
  if (exifPointer === null || gpsPointer === null) return null;
  if (exifPointer && (exifPointer.type !== 4 || exifPointer.count !== 1)) return null;
  if (gpsPointer && (gpsPointer.type !== 4 || gpsPointer.count !== 1)) return null;

  const brightness = exifPointer
    ? findEntry(exifPointer.value, EXIF_BRIGHTNESS_VALUE_TAG)
    : undefined;
  const altitude = gpsPointer
    ? findEntry(gpsPointer.value, GPS_ALTITUDE_TAG)
    : undefined;
  if (brightness === null || altitude === null) return null;
  if (!brightness && !altitude) return null;

  const canonical = bytes.slice(markerStart, segmentEnd);
  const canonicalView = new DataView(canonical.buffer, canonical.byteOffset, canonical.byteLength);
  if (brightness) {
    if (
      brightness.type !== 10
      || brightness.count !== 1
      || brightness.value < brightness.tableEnd
      || brightness.value + 8 > tiffLength
    ) {
      return null;
    }
    const numerator = view.getInt32(brightness.value, littleEndian);
    const denominator = view.getInt32(brightness.value + 4, littleEndian);
    if (denominator <= 0) return null;
    const canonicalNumerator = Math.round(
      (numerator / denominator) * EXIF_BRIGHTNESS_CANONICAL_SCALE,
    );
    if (
      !Number.isSafeInteger(canonicalNumerator)
      || canonicalNumerator < -0x80000000
      || canonicalNumerator > 0x7fffffff
    ) {
      return null;
    }
    const valueOffset = tiffOffset + brightness.value - markerStart;
    canonicalView.setInt32(valueOffset, canonicalNumerator, littleEndian);
    canonicalView.setInt32(valueOffset + 4, EXIF_BRIGHTNESS_CANONICAL_SCALE, littleEndian);
  }
  if (altitude) {
    if (
      altitude.type !== 5
      || altitude.count !== 1
      || altitude.value < altitude.tableEnd
      || altitude.value + 8 > tiffLength
    ) {
      return null;
    }
    const numerator = view.getUint32(altitude.value, littleEndian);
    const denominator = view.getUint32(altitude.value + 4, littleEndian);
    if (denominator === 0) return null;
    const canonicalNumerator = Math.round(
      (numerator / denominator) * GPS_ALTITUDE_CANONICAL_SCALE,
    );
    if (
      !Number.isSafeInteger(canonicalNumerator)
      || canonicalNumerator < 0
      || canonicalNumerator > 0xffffffff
    ) {
      return null;
    }
    const valueOffset = tiffOffset + altitude.value - markerStart;
    canonicalView.setUint32(valueOffset, canonicalNumerator, littleEndian);
    canonicalView.setUint32(valueOffset + 4, GPS_ALTITUDE_CANONICAL_SCALE, littleEndian);
  }
  return canonical;
}

function canonicalizeExifPhotosIfd1(
  bytes: Uint8Array,
  markerStart: number,
  markerCodeEnd: number,
  payloadOffset: number,
  segmentEnd: number,
): Uint8Array | null {
  const tiffOffset = payloadOffset + EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength
      ? view.getUint16(offset, littleEndian)
      : null
  );
  const uint32 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength
      ? view.getUint32(offset, littleEndian)
      : null
  );
  if (uint16(2) !== 42) return null;

  const parseIfd = (offset: number): TiffIfd | null => {
    const count = uint16(offset);
    if (count === null) return null;
    const tableEnd = offset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    const entries: TiffEntry[] = [];
    let referencedEnd = tableEnd;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = offset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      const unitLength = TIFF_TYPE_BYTE_LENGTH.get(type);
      if (!unitLength) return null;
      const valueByteLength = unitLength * entryCount;
      if (!Number.isSafeInteger(valueByteLength)) return null;
      const valueOffset = valueByteLength > 4 ? value : null;
      if (valueOffset !== null) {
        const valueEnd = valueOffset + valueByteLength;
        if (!Number.isSafeInteger(valueEnd) || valueOffset < 0 || valueEnd > tiffLength) return null;
        referencedEnd = Math.max(referencedEnd, valueEnd);
      }
      entries.push({ tag, type, count: entryCount, value, valueByteLength, valueOffset });
    }
    const nextIfdOffset = uint32(tableEnd - 4);
    if (nextIfdOffset === null) return null;
    return { entries, nextIfdOffset, tableEnd, referencedEnd };
  };

  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const ifd0 = parseIfd(ifd0Offset);
  if (!ifd0 || ifd0.nextIfdOffset === 0) return null;

  let primaryReferencedEnd = ifd0.referencedEnd;
  const visited = new Set<number>([ifd0Offset]);
  const pending = ifd0.entries
    .filter((entry) => TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag) && entry.type === 4 && entry.count === 1)
    .map((entry) => entry.value);
  while (pending.length > 0) {
    const childOffset = pending.pop() ?? 0;
    if (childOffset === 0 || visited.has(childOffset)) return null;
    visited.add(childOffset);
    const child = parseIfd(childOffset);
    if (!child || child.nextIfdOffset !== 0) return null;
    primaryReferencedEnd = Math.max(primaryReferencedEnd, child.referencedEnd);
    for (const entry of child.entries) {
      if (TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag) && entry.type === 4 && entry.count === 1) {
        pending.push(entry.value);
      }
    }
  }

  const ifd1Offset = ifd0.nextIfdOffset;
  const ifd1 = parseIfd(ifd1Offset);
  if (!ifd1 || ifd1.nextIfdOffset !== 0 || ifd1.entries.length !== PHOTOS_IFD1_TAGS.size) return null;
  if (ifd1Offset < primaryReferencedEnd) return null;
  for (let offset = primaryReferencedEnd; offset < ifd1Offset; offset += 1) {
    if (bytes[tiffOffset + offset] !== 0) return null;
  }
  const byTag = new Map(ifd1.entries.map((entry) => [entry.tag, entry]));
  if (byTag.size !== PHOTOS_IFD1_TAGS.size) return null;
  for (const tag of PHOTOS_IFD1_TAGS) {
    if (!byTag.has(tag)) return null;
  }

  const compression = byTag.get(0x0103);
  const xResolution = byTag.get(0x011a);
  const yResolution = byTag.get(0x011b);
  const resolutionUnit = byTag.get(0x0128);
  const previewOffsetEntry = byTag.get(0x0201);
  const previewLengthEntry = byTag.get(0x0202);
  if (
    !compression
    || compression.type !== 3
    || compression.count !== 1
    || compression.value >>> 16 !== (littleEndian ? 0 : 6)
    || (littleEndian ? compression.value & 0xffff : compression.value >>> 16) !== 6
    || !xResolution
    || xResolution.type !== 5
    || xResolution.count !== 1
    || xResolution.valueOffset === null
    || !yResolution
    || yResolution.type !== 5
    || yResolution.count !== 1
    || yResolution.valueOffset === null
    || !resolutionUnit
    || resolutionUnit.type !== 3
    || resolutionUnit.count !== 1
    || !previewOffsetEntry
    || previewOffsetEntry.type !== 4
    || previewOffsetEntry.count !== 1
    || !previewLengthEntry
    || previewLengthEntry.type !== 4
    || previewLengthEntry.count !== 1
  ) {
    return null;
  }

  const previewOffset = previewOffsetEntry.value;
  const previewLength = previewLengthEntry.value;
  const previewEnd = previewOffset + previewLength;
  if (
    xResolution.valueOffset !== ifd1.tableEnd
    || yResolution.valueOffset !== xResolution.valueOffset + 8
    || previewOffset !== yResolution.valueOffset + 8
    || !Number.isSafeInteger(previewEnd)
    || previewLength < 4
    || previewEnd > tiffLength
    || bytes[tiffOffset + previewOffset] !== 0xff
    || bytes[tiffOffset + previewOffset + 1] !== 0xd8
    || bytes[tiffOffset + previewEnd - 2] !== 0xff
    || bytes[tiffOffset + previewEnd - 1] !== 0xd9
  ) {
    return null;
  }
  for (let offset = previewEnd; offset < tiffLength; offset += 1) {
    if (bytes[tiffOffset + offset] !== 0) return null;
  }

  let canonicalPrefix = bytes.slice(markerStart, tiffOffset + ifd1Offset);
  const nextIfdPointerOffset = tiffOffset + ifd0.tableEnd - 4 - markerStart;
  canonicalPrefix.fill(0, nextIfdPointerOffset, nextIfdPointerOffset + 4);
  let trailingNullCount = 0;
  for (
    let offset = canonicalPrefix.byteLength - 1;
    offset >= payloadOffset - markerStart && canonicalPrefix[offset] === 0;
    offset -= 1
  ) {
    trailingNullCount += 1;
  }
  if (trailingNullCount > 2) {
    canonicalPrefix = canonicalPrefix.slice(0, canonicalPrefix.byteLength - (trailingNullCount - 2));
  }
  const canonical = canonicalPrefix;
  const canonicalDeclaredLength = canonical.byteLength - (markerCodeEnd - markerStart);
  canonical[markerCodeEnd - markerStart] = (canonicalDeclaredLength >>> 8) & 0xff;
  canonical[markerCodeEnd - markerStart + 1] = canonicalDeclaredLength & 0xff;
  return canonical;
}

const IOS_PWA_CAMERA_ROLL_IFD0_DERIVED_TAG = 0x0213;
const IOS_PWA_CAMERA_ROLL_EXIF_DERIVED_TAGS = new Map<number, Readonly<{
  type: number;
  count: number;
  inlineBytes?: readonly number[];
  inlineShort?: number;
}>>([
  [0x9000, { type: 7, count: 4, inlineBytes: [0x30, 0x32, 0x32, 0x31] }],
  [0x9101, { type: 7, count: 4, inlineBytes: [0x01, 0x02, 0x03, 0x00] }],
  [0xa000, { type: 7, count: 4, inlineBytes: [0x30, 0x31, 0x30, 0x30] }],
  [0xa406, { type: 3, count: 1, inlineShort: 0 }],
]);

function canonicalizeExifIosPwaCameraRollProjection(
  segment: Uint8Array,
): Uint8Array | null {
  const markerStart = 0;
  const markerCodeEnd = 2;
  const payloadOffset = 4;
  const segmentEnd = segment.byteLength;
  if (
    segmentEnd < payloadOffset + EXIF_IDENTIFIER.byteLength + 8
    || segment[0] !== 0xff
    || segment[1] !== 0xe1
    || !startsWithAt(segment, EXIF_IDENTIFIER, payloadOffset)
  ) {
    return null;
  }
  const tiffOffset = payloadOffset + EXIF_IDENTIFIER.byteLength;
  const tiff = segment.slice(tiffOffset);
  const byteOrder = String.fromCharCode(tiff[0] ?? 0, tiff[1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const uint16 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiff.byteLength
      ? view.getUint16(offset, littleEndian)
      : null
  );
  const uint32 = (offset: number): number | null => (
    Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiff.byteLength
      ? view.getUint32(offset, littleEndian)
      : null
  );
  if (uint16(2) !== 42) return null;

  type LocatedIfd = Readonly<{
    offset: number;
    entries: readonly (TiffEntry & Readonly<{ entryOffset: number }>)[];
    nextPointerOffset: number;
    nextIfdOffset: number;
  }>;
  const parseIfd = (offset: number): LocatedIfd | null => {
    const count = uint16(offset);
    if (count === null) return null;
    const nextPointerOffset = offset + 2 + count * 12;
    if (!Number.isSafeInteger(nextPointerOffset) || nextPointerOffset + 4 > tiff.byteLength) {
      return null;
    }
    const entries: Array<TiffEntry & Readonly<{ entryOffset: number }>> = [];
    for (let index = 0; index < count; index += 1) {
      const entryOffset = offset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      const unitLength = TIFF_TYPE_BYTE_LENGTH.get(type);
      if (!unitLength) return null;
      const valueByteLength = unitLength * entryCount;
      if (!Number.isSafeInteger(valueByteLength)) return null;
      const valueOffset = valueByteLength > 4 ? value : null;
      if (
        valueOffset !== null
        && (
          valueOffset < nextPointerOffset + 4
          || valueOffset + valueByteLength > tiff.byteLength
        )
      ) {
        return null;
      }
      entries.push({
        tag,
        type,
        count: entryCount,
        value,
        valueByteLength,
        valueOffset,
        entryOffset,
      });
    }
    const nextIfdOffset = uint32(nextPointerOffset);
    return nextIfdOffset === null
      ? null
      : { offset, entries, nextPointerOffset, nextIfdOffset };
  };

  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const ifd0 = parseIfd(ifd0Offset);
  if (!ifd0 || ifd0.nextIfdOffset === 0) return null;
  const primaryEnd = ifd0.nextIfdOffset;
  const uniqueEntry = (
    ifd: LocatedIfd,
    tag: number,
  ): (TiffEntry & Readonly<{ entryOffset: number }>) | null => {
    const matches = ifd.entries.filter((entry) => entry.tag === tag);
    return matches.length === 1 ? matches[0] : null;
  };
  const exifPointer = uniqueEntry(ifd0, 0x8769);
  const ifd0Derived = uniqueEntry(ifd0, IOS_PWA_CAMERA_ROLL_IFD0_DERIVED_TAG);
  if (
    !exifPointer
    || exifPointer.type !== 4
    || exifPointer.count !== 1
    || !ifd0Derived
    || ifd0Derived.type !== 3
    || ifd0Derived.count !== 1
    || view.getUint16(ifd0Derived.entryOffset + 8, littleEndian) !== 1
  ) {
    return null;
  }
  const exifIfd = parseIfd(exifPointer.value);
  if (!exifIfd || exifIfd.nextIfdOffset !== 0) return null;
  const exifDerivedEntries: Array<TiffEntry & Readonly<{ entryOffset: number }>> = [];
  for (const [tag, expected] of IOS_PWA_CAMERA_ROLL_EXIF_DERIVED_TAGS) {
    const entry = uniqueEntry(exifIfd, tag);
    if (!entry || entry.type !== expected.type || entry.count !== expected.count) return null;
    if (
      expected.inlineBytes
      && !equalBytes(
        tiff.slice(entry.entryOffset + 8, entry.entryOffset + 12),
        new Uint8Array(expected.inlineBytes),
      )
    ) {
      return null;
    }
    if (
      typeof expected.inlineShort === "number"
      && view.getUint16(entry.entryOffset + 8, littleEndian) !== expected.inlineShort
    ) {
      return null;
    }
    exifDerivedEntries.push(entry);
  }

  const ifds: LocatedIfd[] = [];
  const visited = new Set<number>();
  const pending = [ifd0Offset];
  while (pending.length > 0) {
    const ifdOffset = pending.pop() ?? 0;
    if (ifdOffset === 0 || visited.has(ifdOffset)) return null;
    visited.add(ifdOffset);
    const ifd = parseIfd(ifdOffset);
    if (!ifd) return null;
    ifds.push(ifd);
    for (const entry of ifd.entries) {
      if (
        TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag)
        && entry.type === 4
        && entry.count === 1
        && entry.value !== 0
      ) {
        pending.push(entry.value);
      }
    }
    if (ifd.offset !== ifd0Offset && ifd.nextIfdOffset !== 0) return null;
  }

  const deletedEntryOffsets = [
    ifd0Derived.entryOffset,
    ...exifDerivedEntries.map((entry) => entry.entryOffset),
  ].sort((left, right) => left - right);
  const deletedOffsetSet = new Set(deletedEntryOffsets);
  const translateOffset = (oldOffset: number): number => (
    oldOffset - deletedEntryOffsets.filter((deleted) => deleted < oldOffset).length * 12
  );
  const chunks: Uint8Array[] = [];
  let cursor = 0;
  for (const deletedOffset of deletedEntryOffsets) {
    chunks.push(tiff.slice(cursor, deletedOffset));
    cursor = deletedOffset + 12;
  }
  if (cursor > primaryEnd) return null;
  chunks.push(tiff.slice(cursor, primaryEnd));
  const canonicalTiff = concat(chunks);
  const canonicalView = new DataView(
    canonicalTiff.buffer,
    canonicalTiff.byteOffset,
    canonicalTiff.byteLength,
  );
  canonicalView.setUint32(4, translateOffset(ifd0Offset), littleEndian);
  for (const ifd of ifds) {
    const canonicalIfdOffset = translateOffset(ifd.offset);
    const retainedEntries = ifd.entries.filter((entry) => !deletedOffsetSet.has(entry.entryOffset));
    canonicalView.setUint16(canonicalIfdOffset, retainedEntries.length, littleEndian);
    for (const entry of retainedEntries) {
      const canonicalEntryOffset = translateOffset(entry.entryOffset);
      if (
        (
          TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag)
          && entry.type === 4
          && entry.count === 1
        )
        || entry.valueOffset !== null
      ) {
        canonicalView.setUint32(
          canonicalEntryOffset + 8,
          entry.value === 0 ? 0 : translateOffset(entry.value),
          littleEndian,
        );
      }
    }
    canonicalView.setUint32(translateOffset(ifd.nextPointerOffset), 0, littleEndian);
  }
  const canonical = concat([
    segment.slice(markerStart, markerCodeEnd),
    new Uint8Array([0, 0]),
    segment.slice(payloadOffset, tiffOffset),
    canonicalTiff,
  ]);
  const declaredLength = canonical.byteLength - markerCodeEnd;
  canonical[markerCodeEnd] = (declaredLength >>> 8) & 0xff;
  canonical[markerCodeEnd + 1] = declaredLength & 0xff;
  return canonicalizeExifTrailingNullPadding(
    canonical,
    markerStart,
    markerCodeEnd,
    payloadOffset,
    canonical.byteLength,
  );
}

function hasIosPwaCameraRollSegmentOrder(bytes: Uint8Array): boolean {
  let offset = 2;
  let app2Ordinal: number | null = null;
  let photoshopOrdinal: number | null = null;
  let ordinal = 0;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) return false;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    if (isStandaloneMarker(marker)) {
      offset += 2;
      ordinal += 1;
      continue;
    }
    const declaredLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (declaredLength < 2 || offset + 2 + declaredLength > bytes.byteLength) return false;
    const payloadOffset = offset + 4;
    if (marker === 0xe2) {
      if (app2Ordinal !== null) return false;
      app2Ordinal = ordinal;
    }
    if (marker === 0xed && startsWithAt(bytes, PHOTOSHOP_APP13_IDENTIFIER, payloadOffset)) {
      if (photoshopOrdinal !== null) return false;
      photoshopOrdinal = ordinal;
    }
    offset += 2 + declaredLength;
    ordinal += 1;
  }
  // Photos also adds the same strictly classified EXIF/IFD1 projection to
  // JPEGs with no APP2 carrier. In that case no segment-order repair is needed.
  // The caller still requires the complete derived-tag set and validated IFD1.
  return photoshopOrdinal !== null && (app2Ordinal === null || app2Ordinal < photoshopOrdinal);
}

function restoreIosPwaCameraRollSegmentOrder(bytes: Uint8Array): Uint8Array {
  const prefix: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;
  let app2Index = -1;
  let photoshopIndex = -1;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) return bytes;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    if (isStandaloneMarker(marker)) {
      prefix.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    const declaredLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const segmentEnd = offset + 2 + declaredLength;
    if (declaredLength < 2 || segmentEnd > bytes.byteLength) return bytes;
    const payloadOffset = offset + 4;
    prefix.push(bytes.slice(offset, segmentEnd));
    const index = prefix.length - 1;
    if (marker === 0xe2 && app2Index === -1) app2Index = index;
    if (
      marker === 0xed
      && startsWithAt(bytes, PHOTOSHOP_APP13_IDENTIFIER, payloadOffset)
      && photoshopIndex === -1
    ) {
      photoshopIndex = index;
    }
    offset = segmentEnd;
  }
  if (app2Index < 0 || photoshopIndex <= app2Index) return bytes;
  const [photoshop] = prefix.splice(photoshopIndex, 1);
  prefix.splice(app2Index, 0, photoshop);
  return concat([...prefix, bytes.slice(offset)]);
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
}

function xmpNamespaceAt(
  bytes: Uint8Array,
  payloadOffset: number,
): ReceizJpegXmpCarrierAppend["namespace"] | null {
  if (startsWithAt(bytes, STANDARD_XMP_IDENTIFIER, payloadOffset)) return "adobe-xmp-standard";
  if (startsWithAt(bytes, EXTENDED_XMP_IDENTIFIER, payloadOffset)) return "adobe-xmp-extended";
  return null;
}

export async function normalizeJpegAdobeXmpApp1Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION);
}

export async function normalizeJpegIosPhotosCarrierV2Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION);
}

export async function normalizeJpegIosPhotosCarrierV3Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION);
}

export async function normalizeJpegIosPhotosCarrierV4Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION);
}

export async function normalizeJpegIosPhotosCarrierV5Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION);
}

export async function normalizeJpegIosPhotosCarrierV6Basis(
  bytes: Uint8Array,
): Promise<NormalizedJpegArtifactBasis> {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION);
}

export async function recognizeJpegIosPwaCameraRollV6Projection(
  bytes: Uint8Array,
): Promise<Uint8Array | null> {
  const normalized = await normalizeJpegCarrierBasis(
    bytes,
    JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION,
  );
  return normalized.iosPwaCameraRollProjection ? normalized.basisBytes : null;
}

async function normalizeJpegCarrierBasis(
  bytes: Uint8Array,
  normalization: ReceizJpegArtifactBasisNormalization,
): Promise<NormalizedJpegArtifactBasis & Readonly<{ iosPwaCameraRollProjection: boolean }>> {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("jpeg_soi_missing");
  }

  const keptParts: Uint8Array[] = [bytes.slice(0, 2)];
  const carrierSegments: Array<{
    namespace: ReceizJpegXmpCarrierAppend["namespace"];
    bytes: Uint8Array;
  }> = [];
  const photoshopApp13Segments: Uint8Array[] = [];
  let offset = 2;
  let inScan = false;
  let sawSos = false;
  let sawEoi = false;
  const isIosPhotosCarrier = normalization === JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION
    || normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION
    || normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION
    || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION
    || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION;
  const isIosPwaCameraRollProjection = (
    normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION
    && hasIosPwaCameraRollSegmentOrder(bytes)
  );
  let canonicalizedIosPwaCameraRollProjection = false;

  while (offset < bytes.byteLength) {
    if (inScan) {
      const scanStart = offset;
      while (offset < bytes.byteLength) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        if (offset + 1 >= bytes.byteLength) throw new Error("jpeg_scan_truncated");
        const next = bytes[offset + 1];
        if (next === 0x00 || next === 0xff || (next >= 0xd0 && next <= 0xd7)) {
          offset += 2;
          continue;
        }
        break;
      }
      keptParts.push(bytes.slice(scanStart, offset));
      inScan = false;
      continue;
    }

    const markerStart = offset;
    if (bytes[offset] !== 0xff) throw new Error("jpeg_marker_missing");
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.byteLength) throw new Error("jpeg_marker_truncated");
    const marker = bytes[offset];
    offset += 1;
    const markerCodeEnd = offset;
    if (marker === 0x00) throw new Error("jpeg_marker_invalid");

    if (isStandaloneMarker(marker)) {
      keptParts.push(bytes.slice(markerStart, offset));
      if (marker === 0xd9) {
        sawEoi = true;
        if (offset < bytes.byteLength) keptParts.push(bytes.slice(offset));
        offset = bytes.byteLength;
      }
      continue;
    }

    if (offset + 2 > bytes.byteLength) throw new Error("jpeg_segment_length_missing");
    const declaredLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (declaredLength < 2) throw new Error("jpeg_segment_length_invalid");
    const segmentEnd = offset + declaredLength;
    if (segmentEnd > bytes.byteLength) throw new Error("jpeg_segment_truncated");
    const payloadOffset = offset + 2;
    const namespace = marker === 0xe1 ? xmpNamespaceAt(bytes, payloadOffset) : null;
    if (namespace) {
      carrierSegments.push({ namespace, bytes: bytes.slice(markerStart, segmentEnd) });
    } else if (
      isIosPhotosCarrier
      && marker === 0xe1
      && startsWithAt(bytes, EXIF_IDENTIFIER, payloadOffset)
    ) {
      const makerNoteCanonical = (
        normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION
        || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION
        || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION
      )
        ? canonicalizeExifAppleMakerNoteAssetIdentifiers(
            bytes,
            markerStart,
            payloadOffset,
            segmentEnd,
            normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION
              || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION,
          )
        : null;
      const makerNoteSource = makerNoteCanonical
        ? (() => {
            const copy = bytes.slice();
            copy.set(makerNoteCanonical, markerStart);
            return copy;
          })()
        : bytes;
      const reserializedRationalsCanonical = (
        normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION
      )
        ? canonicalizeExifIosPhotosReserializedRationals(
            makerNoteSource,
            markerStart,
            payloadOffset,
            segmentEnd,
          )
        : null;
      const ifd1Source = reserializedRationalsCanonical
        ? (() => {
            const copy = makerNoteSource.slice();
            copy.set(reserializedRationalsCanonical, markerStart);
            return copy;
          })()
        : makerNoteSource;
      const v3Ifd1Canonical = (
        normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION
        || normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION
        || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION
        || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION
      )
        ? canonicalizeExifPhotosIfd1(ifd1Source, markerStart, markerCodeEnd, payloadOffset, segmentEnd)
        : null;
      const pwaCameraRollCanonical = (
        isIosPwaCameraRollProjection
        && v3Ifd1Canonical
      )
        ? canonicalizeExifIosPwaCameraRollProjection(ifd1Source.slice(markerStart, segmentEnd))
        : null;
      if (pwaCameraRollCanonical) canonicalizedIosPwaCameraRollProjection = true;
      keptParts.push(pwaCameraRollCanonical
        ?? v3Ifd1Canonical
        ?? reserializedRationalsCanonical
        ?? makerNoteCanonical
        ?? canonicalizeExifTrailingNullPadding(
          bytes,
          markerStart,
          markerCodeEnd,
          payloadOffset,
          segmentEnd,
        ));
    } else if (
      isIosPhotosCarrier
      && marker === 0xed
      && startsWithAt(bytes, PHOTOSHOP_APP13_IDENTIFIER, payloadOffset)
    ) {
      const segmentBytes = bytes.slice(markerStart, segmentEnd);
      if (!photoshopApp13Segments.some((prior) => equalBytes(prior, segmentBytes))) {
        photoshopApp13Segments.push(segmentBytes);
        keptParts.push(segmentBytes);
      }
    } else {
      keptParts.push(bytes.slice(markerStart, segmentEnd));
    }
    offset = segmentEnd;
    if (marker === 0xda) {
      sawSos = true;
      inScan = true;
    }
  }

  if (!sawSos) throw new Error("jpeg_sos_missing");
  if (!sawEoi) throw new Error("jpeg_eoi_missing");

  const carrierAppends = await Promise.all(
    carrierSegments.map(async (segment, ordinal): Promise<ReceizJpegXmpCarrierAppend> => ({
      namespace: segment.namespace,
      ordinal,
      byteLength: segment.bytes.byteLength,
      sha256: (await sha256Hex(segment.bytes)).toLowerCase(),
    })),
  );

  const basisBytes = concat(keptParts);
  return {
    basisBytes: canonicalizedIosPwaCameraRollProjection
      ? restoreIosPwaCameraRollSegmentOrder(basisBytes)
      : basisBytes,
    carrierAppends,
    iosPwaCameraRollProjection: canonicalizedIosPwaCameraRollProjection,
  };
}
