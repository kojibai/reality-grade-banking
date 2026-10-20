import { deflateSync, inflateSync } from "fflate";

const SECTION_LITERAL = 0;
const SECTION_DEFLATE = 1;
const ISO_PAYLOAD_V2_MAGIC = Uint8Array.of(0x49, 0x42, 0x52, 0x32); // IBR2
const ISO_PAYLOAD_V3_MAGIC = Uint8Array.of(0x49, 0x42, 0x52, 0x33); // IBR3

type Box = Readonly<{
  offset: number;
  size: number;
  headerSize: number;
  type: string;
}>;

type Track = Readonly<{
  handler: string;
  nalLengthBytes: number | null;
  samples: readonly Readonly<{ offset: number; size: number }>[];
}>;

type OrderedSample = Readonly<{
  offset: number;
  size: number;
  nalLengthBytes: number | null;
}>;

export type ReceizIsoBmffDerivabilityReport = Readonly<{
  exactByteLength: number;
  containerAndProofBytes: number;
  mediaRegionBytes: number;
  derivedAvcLengthPrefixBytes: number;
  carriedAvcNalHeaderBytes: number;
  opaqueMediaResidualBytes: number;
}>;

class ChunkWriter {
  private readonly chunks: Uint8Array[] = [];
  private pending: number[] = [];
  private length = 0;

  private flush(): void {
    if (!this.pending.length) return;
    const chunk = Uint8Array.from(this.pending);
    this.chunks.push(chunk);
    this.length += chunk.byteLength;
    this.pending = [];
  }

  byte(value: number): void {
    this.pending.push(value & 0xff);
  }

  varUint(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("RECEIZ_ISO_BMFF_INTEGER_INVALID");
    let remaining = value;
    while (remaining >= 0x80) {
      this.byte((remaining % 0x80) | 0x80);
      remaining = Math.floor(remaining / 0x80);
    }
    this.byte(remaining);
  }

  bytes(value: Uint8Array): void {
    this.flush();
    this.chunks.push(value);
    this.length += value.byteLength;
  }

  finish(): Uint8Array {
    this.flush();
    const output = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  }
}

class ByteReader {
  private cursor = 0;

  constructor(private readonly bytesValue: Uint8Array) {}

  byte(): number {
    if (this.cursor >= this.bytesValue.byteLength) return this.fail();
    return this.bytesValue[this.cursor++]!;
  }

  bytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || this.cursor + length > this.bytesValue.byteLength) return this.fail();
    const value = this.bytesValue.slice(this.cursor, this.cursor + length);
    this.cursor += length;
    return value;
  }

  varUint(): number {
    let value = 0;
    let multiplier = 1;
    for (let index = 0; index < 8; index += 1) {
      const byte = this.byte();
      value += (byte & 0x7f) * multiplier;
      if (!Number.isSafeInteger(value)) return this.fail();
      if ((byte & 0x80) === 0) {
        if (index > 0 && value < 0x80 ** index) return this.fail();
        return value;
      }
      multiplier *= 0x80;
    }
    return this.fail();
  }

  done(): boolean {
    return this.cursor === this.bytesValue.byteLength;
  }

  remainingBytes(): Uint8Array {
    return this.bytes(this.bytesValue.byteLength - this.cursor);
  }

  fail(): never {
    throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  }
}

function ascii4(bytes: Uint8Array, offset: number): string {
  if (offset < 0 || offset + 4 > bytes.byteLength) return "";
  return String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!);
}

function uint32(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.byteLength) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function uint64(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 8 > bytes.byteLength) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  const value = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, false);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return Number(value);
}

function boxesIn(bytes: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset < end) {
    if (offset + 8 > end) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
    const size32 = uint32(bytes, offset);
    const type = ascii4(bytes, offset + 4);
    let size = size32;
    let headerSize = 8;
    if (size32 === 1) {
      size = uint64(bytes, offset + 8);
      headerSize = 16;
    } else if (size32 === 0) {
      size = end - offset;
    }
    if (!/^[\x20-\x7e]{4}$/.test(type) || size < headerSize || offset + size > end) {
      throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
    }
    boxes.push({ offset, size, headerSize, type });
    offset += size;
  }
  if (offset !== end) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return boxes;
}

function children(bytes: Uint8Array, parent: Box): Box[] {
  return boxesIn(bytes, parent.offset + parent.headerSize, parent.offset + parent.size);
}

function directChild(bytes: Uint8Array, parent: Box, type: string): Box | null {
  return children(bytes, parent).find((box) => box.type === type) ?? null;
}

function sampleSizes(bytes: Uint8Array, stbl: Box): number[] {
  const stsz = directChild(bytes, stbl, "stsz");
  if (!stsz || stsz.size < stsz.headerSize + 12) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  const body = stsz.offset + stsz.headerSize;
  const constantSize = uint32(bytes, body + 4);
  const count = uint32(bytes, body + 8);
  if (count > 10_000_000) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  if (constantSize !== 0) return new Array(count).fill(constantSize);
  if (body + 12 + count * 4 !== stsz.offset + stsz.size) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return Array.from({ length: count }, (_, index) => uint32(bytes, body + 12 + index * 4));
}

function chunkOffsets(bytes: Uint8Array, stbl: Box): number[] {
  const table = directChild(bytes, stbl, "stco") ?? directChild(bytes, stbl, "co64");
  if (!table || table.size < table.headerSize + 8) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  const body = table.offset + table.headerSize;
  const count = uint32(bytes, body + 4);
  const width = table.type === "co64" ? 8 : 4;
  if (count > 10_000_000 || body + 8 + count * width !== table.offset + table.size) {
    throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  }
  return Array.from({ length: count }, (_, index) => (
    width === 8 ? uint64(bytes, body + 8 + index * width) : uint32(bytes, body + 8 + index * width)
  ));
}

function samplesPerChunk(bytes: Uint8Array, stbl: Box, chunkCount: number): number[] {
  const stsc = directChild(bytes, stbl, "stsc");
  if (!stsc || stsc.size < stsc.headerSize + 8) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  const body = stsc.offset + stsc.headerSize;
  const count = uint32(bytes, body + 4);
  if (!count || count > chunkCount || body + 8 + count * 12 !== stsc.offset + stsc.size) {
    throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  }
  const entries = Array.from({ length: count }, (_, index) => ({
    firstChunk: uint32(bytes, body + 8 + index * 12),
    count: uint32(bytes, body + 12 + index * 12),
  }));
  if (entries[0]!.firstChunk !== 1) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  const output = new Array<number>(chunkCount);
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const end = (entries[index + 1]?.firstChunk ?? chunkCount + 1) - 1;
    if (!entry.count || entry.firstChunk > end || end > chunkCount) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
    for (let chunk = entry.firstChunk; chunk <= end; chunk += 1) output[chunk - 1] = entry.count;
  }
  if (output.some((value) => !value)) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return output;
}

function avcNalLengthBytes(bytes: Uint8Array, trak: Box): number | null {
  const start = trak.offset + trak.headerSize;
  const end = trak.offset + trak.size;
  for (let offset = start + 4; offset + 9 <= end; offset += 1) {
    if (ascii4(bytes, offset) !== "avcC") continue;
    const size = uint32(bytes, offset - 4);
    if (size < 13 || offset - 4 + size > end || bytes[offset + 4] !== 1) continue;
    return (bytes[offset + 8]! & 0x03) + 1;
  }
  return null;
}

function parseTrack(bytes: Uint8Array, trak: Box): Track {
  const mdia = directChild(bytes, trak, "mdia");
  const minf = mdia && directChild(bytes, mdia, "minf");
  const stbl = minf && directChild(bytes, minf, "stbl");
  const hdlr = mdia && directChild(bytes, mdia, "hdlr");
  if (!mdia || !stbl || !hdlr || hdlr.size < hdlr.headerSize + 12) {
    throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  }
  const handler = ascii4(bytes, hdlr.offset + hdlr.headerSize + 8);
  const sizes = sampleSizes(bytes, stbl);
  const offsets = chunkOffsets(bytes, stbl);
  const perChunk = samplesPerChunk(bytes, stbl, offsets.length);
  const samples: Array<{ offset: number; size: number }> = [];
  let sampleIndex = 0;
  for (let chunkIndex = 0; chunkIndex < offsets.length; chunkIndex += 1) {
    let offset = offsets[chunkIndex]!;
    for (let index = 0; index < perChunk[chunkIndex]!; index += 1) {
      const size = sizes[sampleIndex++];
      if (size === undefined) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
      samples.push({ offset, size });
      offset += size;
    }
  }
  if (sampleIndex !== sizes.length) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
  return { handler, nalLengthBytes: handler === "vide" ? avcNalLengthBytes(bytes, trak) : null, samples };
}

function parseMovie(bytes: Uint8Array, declaredLength = bytes.byteLength): Readonly<{
  mdat: Box;
  bodyStart: number;
  bodyEnd: number;
  samples: readonly OrderedSample[];
}> | null {
  let top: Box[];
  try {
    // Receiz may append proof bytes after the native ISO-BMFF carrier, so walk only
    // complete top-level boxes and stop exactly after the first complete mdat.
    top = [];
    let offset = 0;
    while (offset + 8 <= bytes.byteLength) {
      const size32 = uint32(bytes, offset);
      let size = size32;
      let headerSize = 8;
      if (size32 === 1) {
        size = uint64(bytes, offset + 8);
        headerSize = 16;
      } else if (size32 === 0) {
        return null;
      }
      const type = ascii4(bytes, offset + 4);
      if (!/^[\x20-\x7e]{4}$/.test(type) || size < headerSize || offset + size > declaredLength) return null;
      top.push({ offset, size, headerSize, type });
      offset += size;
      if (type === "mdat") break;
    }
    const moov = top.find((box) => box.type === "moov");
    const mdat = top.find((box) => box.type === "mdat");
    if (!moov || !mdat || moov.offset > mdat.offset) return null;
    const tracks = children(bytes, moov).filter((box) => box.type === "trak").map((trak) => parseTrack(bytes, trak));
    if (!tracks.length || !tracks.some((track) => track.nalLengthBytes !== null)) return null;
    const bodyStart = mdat.offset + mdat.headerSize;
    const bodyEnd = mdat.offset + mdat.size;
    const samples = tracks.flatMap((track) => track.samples.map((sample) => ({ ...sample, nalLengthBytes: track.nalLengthBytes })))
      .sort((left, right) => left.offset - right.offset);
    let cursor = bodyStart;
    for (const sample of samples) {
      if (!sample.size || sample.offset < cursor || sample.offset + sample.size > bodyEnd) return null;
      cursor = sample.offset + sample.size;
    }
    return { mdat, bodyStart, bodyEnd, samples };
  } catch {
    return null;
  }
}

function encodedSection(bytes: Uint8Array): Uint8Array {
  const compressed = bytes.byteLength >= 32 ? deflateSync(bytes, { level: 9 }) : bytes;
  const useDeflate = compressed.byteLength < bytes.byteLength;
  const payload = useDeflate ? compressed : bytes;
  const writer = new ChunkWriter();
  writer.byte(useDeflate ? SECTION_DEFLATE : SECTION_LITERAL);
  writer.varUint(bytes.byteLength);
  writer.varUint(payload.byteLength);
  writer.bytes(payload);
  return writer.finish();
}

function decodedSection(reader: ByteReader): Uint8Array {
  const mode = reader.byte();
  const outputLength = reader.varUint();
  const payload = reader.bytes(reader.varUint());
  if (mode === SECTION_LITERAL) {
    if (payload.byteLength !== outputLength) reader.fail();
    return payload;
  }
  if (mode === SECTION_DEFLATE) {
    const output = inflateSync(payload, { out: new Uint8Array(outputLength + 1) });
    if (output.byteLength !== outputLength) reader.fail();
    return output;
  }
  return reader.fail();
}

function readNalLength(bytes: Uint8Array, offset: number, width: number): number {
  let value = 0;
  for (let index = 0; index < width; index += 1) value = value * 256 + bytes[offset + index]!;
  return value;
}

function writeNalLength(output: Uint8Array, offset: number, width: number, value: number): void {
  for (let index = width - 1; index >= 0; index -= 1) {
    output[offset + index] = value & 0xff;
    value = Math.floor(value / 256);
  }
  if (value !== 0) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_INVALID");
}

function startsWithBytes(bytes: Uint8Array, expected: Uint8Array): boolean {
  if (bytes.byteLength < expected.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (bytes[index] !== expected[index]) return false;
  }
  return true;
}

function parseAvcSample(sample: Uint8Array, width: number): Uint8Array[] | null {
  const nals: Uint8Array[] = [];
  let offset = 0;
  while (offset < sample.byteLength) {
    if (offset + width > sample.byteLength) return null;
    const length = readNalLength(sample, offset, width);
    offset += width;
    if (!length || offset + length > sample.byteLength) return null;
    nals.push(sample.subarray(offset, offset + length));
    offset += length;
  }
  return offset === sample.byteLength && nals.length ? nals : null;
}

/**
 * Partitions every admitted ISO-BMFF source byte by reconstruction role.
 * This is accounting only: the enclosing sealed proof object remains authority.
 */
export function analyzeIsoBmffDerivability(exactBytes: Uint8Array): ReceizIsoBmffDerivabilityReport | null {
  const movie = parseMovie(exactBytes);
  if (!movie) return null;
  const containerAndProofBytes = movie.bodyStart + (exactBytes.byteLength - movie.bodyEnd);
  const mediaRegionBytes = movie.bodyEnd - movie.bodyStart;
  let derivedAvcLengthPrefixBytes = 0;
  let carriedAvcNalHeaderBytes = 0;
  let opaqueMediaResidualBytes = 0;
  let cursor = movie.bodyStart;
  for (const sample of movie.samples) {
    opaqueMediaResidualBytes += sample.offset - cursor;
    const sampleBytes = exactBytes.subarray(sample.offset, sample.offset + sample.size);
    if (sample.nalLengthBytes === null) {
      opaqueMediaResidualBytes += sample.size;
    } else {
      const nals = parseAvcSample(sampleBytes, sample.nalLengthBytes);
      if (!nals) return null;
      derivedAvcLengthPrefixBytes += nals.length * sample.nalLengthBytes;
      carriedAvcNalHeaderBytes += nals.length;
      opaqueMediaResidualBytes += nals.reduce((sum, nal) => sum + nal.byteLength - 1, 0);
    }
    cursor = sample.offset + sample.size;
  }
  opaqueMediaResidualBytes += movie.bodyEnd - cursor;
  if (
    containerAndProofBytes
      + derivedAvcLengthPrefixBytes
      + carriedAvcNalHeaderBytes
      + opaqueMediaResidualBytes
    !== exactBytes.byteLength
    || derivedAvcLengthPrefixBytes + carriedAvcNalHeaderBytes + opaqueMediaResidualBytes !== mediaRegionBytes
  ) throw new TypeError("RECEIZ_ISO_BMFF_DERIVABILITY_ACCOUNTING_INVALID");
  return Object.freeze({
    exactByteLength: exactBytes.byteLength,
    containerAndProofBytes,
    mediaRegionBytes,
    derivedAvcLengthPrefixBytes,
    carriedAvcNalHeaderBytes,
    opaqueMediaResidualBytes,
  });
}

function encodeAvcSampleV2(metadata: ChunkWriter, media: ChunkWriter, sample: Uint8Array, width: number): boolean {
  const nals = parseAvcSample(sample, width);
  if (!nals) return false;
  metadata.varUint(nals.length);
  for (let index = 0; index < nals.length; index += 1) {
    const nal = nals[index]!;
    if (index + 1 < nals.length) metadata.varUint(nal.byteLength);
  }
  for (const nal of nals) {
    metadata.byte(nal[0]!);
    media.bytes(nal.subarray(1));
  }
  return true;
}

function decodeAvcSample(reader: ByteReader, outputLength: number, width: number): Uint8Array {
  const count = reader.varUint();
  if (!count || count > outputLength) reader.fail();
  const output = new Uint8Array(outputLength);
  let offset = 0;
  for (let index = 0; index < count; index += 1) {
    const length = reader.varUint();
    if (!length || offset + width + length > outputLength) reader.fail();
    writeNalLength(output, offset, width, length);
    offset += width;
    output.set(reader.bytes(length), offset);
    offset += length;
  }
  if (offset !== outputLength) reader.fail();
  return output;
}

function decodeAvcSampleV2(
  metadata: ByteReader,
  media: ByteReader,
  outputLength: number,
  width: number,
): Uint8Array {
  const count = metadata.varUint();
  if (!count || count > Math.floor(outputLength / (width + 1))) metadata.fail();
  const lengths: number[] = [];
  let carriedLength = 0;
  for (let index = 0; index + 1 < count; index += 1) {
    const length = metadata.varUint();
    if (!length) metadata.fail();
    lengths.push(length);
    carriedLength += length;
  }
  const finalLength = outputLength - width * count - carriedLength;
  if (finalLength < 1) metadata.fail();
  lengths.push(finalLength);
  const headers = Array.from({ length: count }, () => metadata.byte());
  const output = new Uint8Array(outputLength);
  let offset = 0;
  for (let index = 0; index < count; index += 1) {
    const length = lengths[index]!;
    writeNalLength(output, offset, width, length);
    offset += width;
    output[offset] = headers[index]!;
    offset += 1;
    output.set(media.bytes(length - 1), offset);
    offset += length - 1;
  }
  if (offset !== outputLength) metadata.fail();
  return output;
}

function parseMovieFromPrefix(prefix: Uint8Array, bodyLength: number): ReturnType<typeof parseMovie> {
  // The exact prefix carries every authority-bearing table and the mdat header.
  // The declared extent validates offsets without allocating placeholder media.
  return parseMovie(prefix, prefix.byteLength + bodyLength);
}

function declaredMdatBodyLength(prefix: Uint8Array): number | null {
  try {
    let offset = 0;
    while (offset + 8 <= prefix.byteLength) {
      const size32 = uint32(prefix, offset);
      const type = ascii4(prefix, offset + 4);
      const headerSize = size32 === 1 ? 16 : 8;
      const size = size32 === 1 ? uint64(prefix, offset + 8) : size32;
      if (size32 === 0 || size < headerSize) return null;
      if (type === "mdat") return offset + headerSize === prefix.byteLength ? size - headerSize : null;
      if (offset + size > prefix.byteLength) return null;
      offset += size;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeIsoBmffReversiblePayload(exactBytes: Uint8Array): Uint8Array | null {
  const movie = parseMovie(exactBytes);
  if (!movie) return null;
  const prefix = exactBytes.slice(0, movie.bodyStart);
  const suffix = exactBytes.slice(movie.bodyEnd);
  const metadata = new ChunkWriter();
  const media = new ChunkWriter();
  let cursor = movie.bodyStart;
  for (const sample of movie.samples) {
    media.bytes(exactBytes.subarray(cursor, sample.offset));
    const sampleBytes = exactBytes.subarray(sample.offset, sample.offset + sample.size);
    if (sample.nalLengthBytes !== null
      && !encodeAvcSampleV2(metadata, media, sampleBytes, sample.nalLengthBytes)) return null;
    if (sample.nalLengthBytes === null) media.bytes(sampleBytes);
    cursor = sample.offset + sample.size;
  }
  media.bytes(exactBytes.subarray(cursor, movie.bodyEnd));
  const transformedMedia = media.finish();
  const writer = new ChunkWriter();
  writer.bytes(ISO_PAYLOAD_V3_MAGIC);
  const prefixSection = encodedSection(prefix);
  writer.varUint(prefixSection.byteLength);
  writer.bytes(prefixSection);
  const suffixSection = encodedSection(suffix);
  writer.varUint(suffixSection.byteLength);
  writer.bytes(suffixSection);
  const metadataSection = encodedSection(metadata.finish());
  writer.varUint(metadataSection.byteLength);
  writer.bytes(metadataSection);
  writer.bytes(transformedMedia);
  return writer.finish();
}

function assembleExactObject(prefix: Uint8Array, body: Uint8Array, suffix: Uint8Array, originalLength: number): Uint8Array {
  const output = new Uint8Array(originalLength);
  output.set(prefix, 0);
  output.set(body, prefix.byteLength);
  output.set(suffix, prefix.byteLength + body.byteLength);
  return output;
}

function decodeIsoBmffReversiblePayloadV1(payload: Uint8Array, originalLength: number): Uint8Array {
  const reader = new ByteReader(payload);
  const bodyLength = reader.varUint();
  const prefixReader = new ByteReader(reader.bytes(reader.varUint()));
  const prefix = decodedSection(prefixReader);
  if (!prefixReader.done()) prefixReader.fail();
  const suffixReader = new ByteReader(reader.bytes(reader.varUint()));
  const suffix = decodedSection(suffixReader);
  if (!suffixReader.done()) suffixReader.fail();
  const mediaReader = new ByteReader(reader.bytes(reader.varUint()));
  if (!reader.done() || prefix.byteLength + bodyLength + suffix.byteLength !== originalLength) reader.fail();
  const movie = parseMovieFromPrefix(prefix, bodyLength);
  if (!movie) return reader.fail();
  if (movie.bodyStart !== prefix.byteLength || movie.bodyEnd !== prefix.byteLength + bodyLength) return reader.fail();
  const body = new Uint8Array(bodyLength);
  let outputCursor = 0;
  let absoluteCursor = movie.bodyStart;
  for (const sample of movie.samples) {
    const gap = sample.offset - absoluteCursor;
    body.set(mediaReader.bytes(gap), outputCursor);
    outputCursor += gap;
    const decoded = sample.nalLengthBytes === null
      ? mediaReader.bytes(sample.size)
      : decodeAvcSample(mediaReader, sample.size, sample.nalLengthBytes);
    body.set(decoded, outputCursor);
    outputCursor += decoded.byteLength;
    absoluteCursor = sample.offset + sample.size;
  }
  const tail = movie.bodyEnd - absoluteCursor;
  body.set(mediaReader.bytes(tail), outputCursor);
  outputCursor += tail;
  if (!mediaReader.done() || outputCursor !== bodyLength) mediaReader.fail();
  return assembleExactObject(prefix, body, suffix, originalLength);
}

export function decodeIsoBmffReversiblePayload(payload: Uint8Array, originalLength?: number): Uint8Array {
  const isV3 = startsWithBytes(payload, ISO_PAYLOAD_V3_MAGIC);
  if (!isV3 && !startsWithBytes(payload, ISO_PAYLOAD_V2_MAGIC)) {
    if (originalLength === undefined) throw new TypeError("RECEIZ_ISO_BMFF_COORDINATE_LENGTH_REQUIRED");
    return decodeIsoBmffReversiblePayloadV1(payload, originalLength);
  }
  const reader = new ByteReader(payload.slice(ISO_PAYLOAD_V2_MAGIC.byteLength));
  const declaredBodyLength = isV3 ? null : reader.varUint();
  const prefixReader = new ByteReader(reader.bytes(reader.varUint()));
  const prefix = decodedSection(prefixReader);
  if (!prefixReader.done()) prefixReader.fail();
  const suffixReader = new ByteReader(reader.bytes(reader.varUint()));
  const suffix = decodedSection(suffixReader);
  if (!suffixReader.done()) suffixReader.fail();
  const metadataSectionReader = new ByteReader(reader.bytes(reader.varUint()));
  const metadataReader = new ByteReader(decodedSection(metadataSectionReader));
  if (!metadataSectionReader.done()) metadataSectionReader.fail();
  const mediaReader = new ByteReader(isV3 ? reader.remainingBytes() : reader.bytes(reader.varUint()));
  const bodyLength = declaredBodyLength
    ?? (originalLength === undefined
      ? declaredMdatBodyLength(prefix)
      : originalLength - prefix.byteLength - suffix.byteLength);
  if (bodyLength === null) return reader.fail();
  const resolvedOriginalLength = originalLength ?? prefix.byteLength + bodyLength + suffix.byteLength;
  if (!Number.isSafeInteger(bodyLength) || bodyLength < 0) reader.fail();
  if (!reader.done() || prefix.byteLength + bodyLength + suffix.byteLength !== resolvedOriginalLength) reader.fail();
  const movie = parseMovieFromPrefix(prefix, bodyLength);
  if (!movie) return reader.fail();
  if (movie.bodyStart !== prefix.byteLength || movie.bodyEnd !== prefix.byteLength + bodyLength) return reader.fail();
  const body = new Uint8Array(bodyLength);
  let outputCursor = 0;
  let absoluteCursor = movie.bodyStart;
  for (const sample of movie.samples) {
    const gap = sample.offset - absoluteCursor;
    body.set(mediaReader.bytes(gap), outputCursor);
    outputCursor += gap;
    const decoded = sample.nalLengthBytes === null
      ? mediaReader.bytes(sample.size)
      : decodeAvcSampleV2(metadataReader, mediaReader, sample.size, sample.nalLengthBytes);
    body.set(decoded, outputCursor);
    outputCursor += decoded.byteLength;
    absoluteCursor = sample.offset + sample.size;
  }
  const tail = movie.bodyEnd - absoluteCursor;
  body.set(mediaReader.bytes(tail), outputCursor);
  outputCursor += tail;
  if (!metadataReader.done() || !mediaReader.done() || outputCursor !== bodyLength) mediaReader.fail();
  return assembleExactObject(prefix, body, suffix, resolvedOriginalLength);
}
