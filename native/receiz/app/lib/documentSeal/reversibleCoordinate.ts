import { deflateSync, inflateSync } from "fflate";

import { decodeReceizMaterialCapsule, encodeReceizMaterialCapsule } from "@/app/lib/documentSeal/materialCapsule";
import { base64UrlDecode, base64UrlEncode, sha256Bytes } from "@/app/utils/sha256";
import {
  analyzeIsoBmffDerivability,
  decodeIsoBmffReversiblePayload,
  encodeIsoBmffReversiblePayload,
  type ReceizIsoBmffDerivabilityReport,
} from "./isoBmffReversible";

export const RECEIZ_REVERSIBLE_COORDINATE_SCHEMA = "receiz.reversible-coordinate.v1" as const;
export const RECEIZ_REVERSIBLE_COORDINATE_PREFIX = "rrc1:" as const;

const MAGIC = Uint8Array.of(0x52, 0x52, 0x43, 0x31); // RRC1
const HEADER_BYTES = MAGIC.byteLength + 2;
const DIGEST_BYTES = 32;
const MODE_LITERAL_RANK = 0;
const MODE_DEFLATE = 1;
const MODE_FIBONACCI = 2;
const MODE_PLAYABLE_URL_RANK = 3;
const MODE_ISO_BMFF = 4;
const MODE_RECURSIVE = 5;
const NODE_LITERAL_RANK = 0;
const NODE_REPEAT_BYTE = 1;
const NODE_REPEAT_PATTERN = 2;
const NODE_DEFLATE = 3;
const FLAG_PLAYABLE_URL = 1 << 0;
const MAX_RECURSION_DEPTH = 1_900;
const MIN_RECURSIVE_INPUT_BYTES = 65_536;
const PLAYABLE_URL_V2_MAGIC = Uint8Array.of(0x50, 0x55, 0x52, 0x32); // PUR2

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

type Candidate = Readonly<{ mode: number; payload: Uint8Array }>;

export type ReceizReversibleCoordinate = Readonly<{
  schema: typeof RECEIZ_REVERSIBLE_COORDINATE_SCHEMA;
  coordinateBytes: Uint8Array;
  coordinateByteLength: number;
  originalByteLength: number;
  mode: "literal-rank" | "deflate" | "fibonacci" | "playable-url-rank" | "iso-bmff" | "recursive";
  kind: "bytes" | "playable-url";
  recursionDepth: number;
}>;

export type ReceizPlayableUrlDerivabilityReport = Readonly<{
  exactPlaybackUrlBytes: number;
  urlRepresentationAndSyntaxBytes: number;
  compactProofBinaryBytes: number;
  materialCapsuleBinaryBytes: number;
  exactSealedArtifactBytes: number;
  filenameBytes: number;
  mimeTypeBytes: number;
  isoBmff: ReceizIsoBmffDerivabilityReport | null;
  coordinateBytes: number;
  coordinateMode: ReceizReversibleCoordinate["mode"];
  coordinateRecursionDepth: number;
}>;

export type DecodeReceizReversibleCoordinateOptions = Readonly<{
  /** A caller resource boundary only. It never changes coordinate truth. */
  maxOutputBytes?: number;
}>;

class Writer {
  private readonly values: number[] = [];

  byte(value: number): void {
    this.values.push(value & 0xff);
  }

  bytes(value: Uint8Array): void {
    for (const byte of value) this.values.push(byte);
  }

  varUint(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("RECEIZ_REVERSIBLE_COORDINATE_INTEGER_INVALID");
    }
    let remaining = value;
    while (remaining >= 0x80) {
      this.byte((remaining % 0x80) | 0x80);
      remaining = Math.floor(remaining / 0x80);
    }
    this.byte(remaining);
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.values);
  }
}

class Reader {
  private offset = 0;

  constructor(private readonly source: Uint8Array) {}

  byte(): number {
    if (this.offset >= this.source.byteLength) this.fail();
    return this.source[this.offset++]!;
  }

  bytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.source.byteLength) this.fail();
    const value = this.source.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  varUint(): number {
    let multiplier = 1;
    let value = 0;
    for (let index = 0; index < 8; index += 1) {
      const byte = this.byte();
      value += (byte & 0x7f) * multiplier;
      if (!Number.isSafeInteger(value)) this.fail();
      if ((byte & 0x80) === 0) {
        if (index > 0 && value < 0x80 ** index) this.fail();
        return value;
      }
      multiplier *= 0x80;
    }
    return this.fail();
  }

  done(): boolean {
    return this.offset === this.source.byteLength;
  }

  fail(): never {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_INVALID");
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function concatBytes(values: readonly Uint8Array[], byteLength = values.reduce((sum, value) => sum + value.byteLength, 0)): Uint8Array {
  const output = new Uint8Array(byteLength);
  let offset = 0;
  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  if (offset !== byteLength) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_MISMATCH");
  return output;
}

function fibonacciPartition(total: number): number[] {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_INVALID");
  }
  if (total === 0) return [];
  const fibonacci = [1, 2];
  while (fibonacci[fibonacci.length - 1]! <= total) {
    const next = fibonacci[fibonacci.length - 1]! + fibonacci[fibonacci.length - 2]!;
    if (!Number.isSafeInteger(next) || next > total) break;
    fibonacci.push(next);
  }
  const parts: number[] = [];
  let remaining = total;
  for (let index = fibonacci.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const value = fibonacci[index]!;
    if (value <= remaining) {
      parts.push(value);
      remaining -= value;
      index -= 1; // Zeckendorf: never admit consecutive Fibonacci members.
    }
  }
  if (remaining !== 0) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_FIBONACCI_INVALID");
  return parts;
}

function fibonacciScalesUpTo(maximum: number): number[] {
  if (!Number.isSafeInteger(maximum) || maximum < 1) return [];
  const values = [1, 2];
  while (true) {
    const next = values[values.length - 1]! + values[values.length - 2]!;
    if (!Number.isSafeInteger(next) || next > maximum) break;
    values.push(next);
  }
  return values;
}

function serializedNode(tag: number, outputLength: number, payload: Uint8Array): Uint8Array {
  const writer = new Writer();
  writer.byte(tag);
  writer.varUint(outputLength);
  writer.varUint(payload.byteLength);
  writer.bytes(payload);
  return writer.finish();
}

function repeatedPattern(bytes: Uint8Array): Uint8Array | null {
  if (bytes.byteLength < 4) return null;
  const maximum = Math.min(144, Math.floor(bytes.byteLength / 2));
  for (const length of fibonacciScalesUpTo(maximum)) {
    if (length === bytes.byteLength || bytes.byteLength % length !== 0) continue;
    let matches = true;
    for (let index = length; index < bytes.byteLength; index += 1) {
      if (bytes[index] !== bytes[index % length]) {
        matches = false;
        break;
      }
    }
    if (matches) return bytes.slice(0, length);
  }
  return null;
}

function encodeNode(bytes: Uint8Array): Uint8Array {
  // For a fixed byte length, the exact byte string is its base-256 enumerative rank.
  const candidates = [serializedNode(NODE_LITERAL_RANK, bytes.byteLength, bytes)];
  if (bytes.byteLength > 1 && bytes.every((value) => value === bytes[0])) {
    candidates.push(serializedNode(NODE_REPEAT_BYTE, bytes.byteLength, bytes.slice(0, 1)));
  }
  const pattern = repeatedPattern(bytes);
  if (pattern) candidates.push(serializedNode(NODE_REPEAT_PATTERN, bytes.byteLength, pattern));
  if (bytes.byteLength >= 32) {
    candidates.push(serializedNode(NODE_DEFLATE, bytes.byteLength, deflateSync(bytes, { level: 9 })));
  }
  return candidates.reduce((best, candidate) => (
    candidate.byteLength < best.byteLength
      || (candidate.byteLength === best.byteLength && candidate[0]! < best[0]!)
      ? candidate
      : best
  ));
}

function encodeFibonacciPayload(bytes: Uint8Array): Uint8Array {
  const writer = new Writer();
  const parts = fibonacciPartition(bytes.byteLength);
  writer.varUint(parts.length);
  let offset = 0;
  for (const length of parts) {
    const node = encodeNode(bytes.slice(offset, offset + length));
    writer.varUint(node.byteLength);
    writer.bytes(node);
    offset += length;
  }
  if (offset !== bytes.byteLength) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_FIBONACCI_INVALID");
  return writer.finish();
}

function packedToken(writer: Writer, token: string, prefixes: readonly string[]): boolean {
  const prefixIndex = prefixes.findIndex((prefix) => token.startsWith(prefix));
  const prefix = prefixIndex >= 0 ? prefixes[prefixIndex]! : "";
  const body = token.slice(prefix.length);
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) return false;
  let ranked: Uint8Array;
  try {
    ranked = base64UrlDecode(body);
  } catch {
    return false;
  }
  if (base64UrlEncode(ranked) !== body) return false;
  writer.byte(prefixIndex + 1);
  writer.varUint(ranked.byteLength);
  writer.bytes(ranked);
  return true;
}

function encodePlayableUrlRank(exactBytes: Uint8Array): Uint8Array | null {
  let exactUrl: string;
  try {
    exactUrl = textDecoder.decode(exactBytes);
  } catch {
    return null;
  }
  let url: URL;
  try {
    url = new URL(exactUrl);
  } catch {
    return null;
  }
  if (url.origin !== "https://receiz.com") return null;
  const route = url.pathname.match(/^\/v\/(\d{8}_\d{4})\/([0-9A-F]{8})\/(\d+)$/);
  if (!route) return null;
  const proofToken = url.searchParams.get("c");
  const materialToken = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash).get("material");
  if (!proofToken || !materialToken || !materialToken.startsWith("rma2:")) return null;
  const pulse = Number(route[3]);
  if (!Number.isSafeInteger(pulse) || pulse < 0) return null;

  const writer = new Writer();
  writer.bytes(PLAYABLE_URL_V2_MAGIC);
  writer.bytes(textEncoder.encode(route[1]!));
  writer.bytes(Uint8Array.from(route[2]!.match(/../g)!.map((hex) => Number.parseInt(hex, 16))));
  writer.varUint(pulse);
  if (!packedToken(writer, proofToken, ["rpb1:", "rpb2:"])) return null;
  let carriedMaterial = false;
  try {
    const capsule = decodeReceizMaterialCapsule(materialToken);
    if (encodeReceizMaterialCapsule(capsule) === materialToken) {
      const isoBmff = encodeIsoBmffReversiblePayload(capsule.exactArtifactBytes);
      if (isoBmff) {
        const filename = textEncoder.encode(capsule.filename);
        const mimeType = textEncoder.encode(capsule.mimeType);
        writer.byte(1);
        writer.varUint(filename.byteLength);
        writer.bytes(filename);
        writer.varUint(mimeType.byteLength);
        writer.bytes(mimeType);
        writer.varUint(isoBmff.byteLength);
        writer.bytes(isoBmff);
        carriedMaterial = true;
      }
    }
  } catch {
    // The generic exact token rank below remains authoritative fallback.
  }
  if (!carriedMaterial) {
    writer.byte(0);
    if (!packedToken(writer, materialToken, ["rma2:"])) return null;
  }
  const payload = writer.finish();

  const rebuilt = decodePlayableUrlRank(payload);
  return rebuilt === exactUrl ? payload : null;
}

function unpackedToken(reader: Reader, prefixes: readonly string[]): string {
  const prefixTag = reader.byte();
  if (prefixTag > prefixes.length) reader.fail();
  const ranked = reader.bytes(reader.varUint());
  const prefix = prefixTag === 0 ? "" : prefixes[prefixTag - 1]!;
  return `${prefix}${base64UrlEncode(ranked)}`;
}

function decodePlayableUrlRankV1(payload: Uint8Array): string {
  const reader = new Reader(payload);
  const slug = textDecoder.decode(reader.bytes(13));
  if (!/^\d{8}_\d{4}$/.test(slug)) reader.fail();
  const code = Array.from(reader.bytes(4), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const pulse = reader.varUint();
  const proofToken = unpackedToken(reader, ["rpb1:", "rpb2:"]);
  const materialToken = unpackedToken(reader, ["rma2:"]);
  if (!reader.done()) reader.fail();
  return `https://receiz.com/v/${slug}/${code}/${pulse}?c=${encodeURIComponent(proofToken)}#material=${encodeURIComponent(materialToken)}`;
}

function decodePlayableUrlRank(payload: Uint8Array): string {
  if (!equalBytes(payload.slice(0, PLAYABLE_URL_V2_MAGIC.byteLength), PLAYABLE_URL_V2_MAGIC)) {
    return decodePlayableUrlRankV1(payload);
  }
  const reader = new Reader(payload.slice(PLAYABLE_URL_V2_MAGIC.byteLength));
  const slug = textDecoder.decode(reader.bytes(13));
  if (!/^\d{8}_\d{4}$/.test(slug)) reader.fail();
  const code = Array.from(reader.bytes(4), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const pulse = reader.varUint();
  const proofToken = unpackedToken(reader, ["rpb1:", "rpb2:"]);
  const materialMode = reader.byte();
  let materialToken: string;
  if (materialMode === 0) {
    materialToken = unpackedToken(reader, ["rma2:"]);
  } else if (materialMode === 1) {
    const filename = textDecoder.decode(reader.bytes(reader.varUint()));
    const mimeType = textDecoder.decode(reader.bytes(reader.varUint()));
    const exactArtifactBytes = decodeIsoBmffReversiblePayload(reader.bytes(reader.varUint()));
    materialToken = encodeReceizMaterialCapsule({ exactArtifactBytes, filename, mimeType });
  } else {
    return reader.fail();
  }
  if (!reader.done()) reader.fail();
  return `https://receiz.com/v/${slug}/${code}/${pulse}?c=${encodeURIComponent(proofToken)}#material=${encodeURIComponent(materialToken)}`;
}

function selectCandidate(bytes: Uint8Array, kind: "bytes" | "playable-url"): Candidate {
  let best: Candidate = { mode: MODE_LITERAL_RANK, payload: bytes };
  const admit = (candidate: Candidate): void => {
    if (candidate.payload.byteLength < best.payload.byteLength
      || (candidate.payload.byteLength === best.payload.byteLength && candidate.mode < best.mode)) {
      best = candidate;
    }
  };
  admit({ mode: MODE_DEFLATE, payload: deflateSync(bytes, { level: 9 }) });
  admit({ mode: MODE_FIBONACCI, payload: encodeFibonacciPayload(bytes) });
  const isoBmff = encodeIsoBmffReversiblePayload(bytes);
  if (isoBmff) admit({ mode: MODE_ISO_BMFF, payload: isoBmff });
  if (kind === "playable-url") {
    const playableUrlRank = encodePlayableUrlRank(bytes);
    if (playableUrlRank) admit({ mode: MODE_PLAYABLE_URL_RANK, payload: playableUrlRank });
  }
  return best;
}

function modeName(mode: number): ReceizReversibleCoordinate["mode"] {
  if (mode === MODE_LITERAL_RANK) return "literal-rank";
  if (mode === MODE_DEFLATE) return "deflate";
  if (mode === MODE_FIBONACCI) return "fibonacci";
  if (mode === MODE_PLAYABLE_URL_RANK) return "playable-url-rank";
  if (mode === MODE_ISO_BMFF) return "iso-bmff";
  if (mode === MODE_RECURSIVE) return "recursive";
  throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_MODE_INVALID");
}

function assertOutputLength(length: number, options?: DecodeReceizReversibleCoordinateOptions): void {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_INVALID");
  }
  if (options?.maxOutputBytes !== undefined) {
    if (!Number.isSafeInteger(options.maxOutputBytes) || options.maxOutputBytes < 0) {
      throw new RangeError("RECEIZ_REVERSIBLE_COORDINATE_LIMIT_INVALID");
    }
    if (length > options.maxOutputBytes) {
      throw new RangeError("RECEIZ_REVERSIBLE_COORDINATE_RESOURCE_LIMIT");
    }
  }
}

function decodeNode(reader: Reader, options?: DecodeReceizReversibleCoordinateOptions): Uint8Array {
  const tag = reader.byte();
  const outputLength = reader.varUint();
  assertOutputLength(outputLength, options);
  const payload = reader.bytes(reader.varUint());
  if (tag === NODE_LITERAL_RANK) {
    if (payload.byteLength !== outputLength) reader.fail();
    return payload;
  }
  if (tag === NODE_REPEAT_BYTE) {
    if (payload.byteLength !== 1 || outputLength < 2) reader.fail();
    return new Uint8Array(outputLength).fill(payload[0]!);
  }
  if (tag === NODE_REPEAT_PATTERN) {
    if (!payload.byteLength || outputLength <= payload.byteLength || outputLength % payload.byteLength !== 0) reader.fail();
    const output = new Uint8Array(outputLength);
    for (let offset = 0; offset < outputLength; offset += payload.byteLength) output.set(payload, offset);
    return output;
  }
  if (tag === NODE_DEFLATE) {
    const output = inflateSync(payload, { out: new Uint8Array(outputLength + 1) });
    if (output.byteLength !== outputLength) reader.fail();
    return output;
  }
  return reader.fail();
}

function decodePayload(mode: number, payload: Uint8Array, originalLength: number, options?: DecodeReceizReversibleCoordinateOptions): Uint8Array {
  if (mode === MODE_LITERAL_RANK) {
    if (payload.byteLength !== originalLength) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_MISMATCH");
    return payload;
  }
  if (mode === MODE_DEFLATE) {
    const output = inflateSync(payload, { out: new Uint8Array(originalLength + 1) });
    if (output.byteLength !== originalLength) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_MISMATCH");
    return output;
  }
  if (mode === MODE_FIBONACCI) {
    const reader = new Reader(payload);
    const count = reader.varUint();
    const expectedParts = fibonacciPartition(originalLength);
    if (count !== expectedParts.length) reader.fail();
    const nodes: Uint8Array[] = [];
    for (let index = 0; index < count; index += 1) {
      const nodeReader = new Reader(reader.bytes(reader.varUint()));
      const node = decodeNode(nodeReader, options);
      if (!nodeReader.done() || node.byteLength !== expectedParts[index]) reader.fail();
      nodes.push(node);
    }
    if (!reader.done()) reader.fail();
    return concatBytes(nodes, originalLength);
  }
  if (mode === MODE_PLAYABLE_URL_RANK) {
    const output = textEncoder.encode(decodePlayableUrlRank(payload));
    if (output.byteLength !== originalLength) {
      throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_LENGTH_MISMATCH");
    }
    return output;
  }
  if (mode === MODE_ISO_BMFF) {
    return decodeIsoBmffReversiblePayload(payload, originalLength);
  }
  throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_MODE_INVALID");
}

function isPlayableReceizMaterialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^\/v\/[^/]+\/[^/]+\/[^/]+\/?$/.test(url.pathname)
      && Boolean(url.searchParams.get("c"))
      && Boolean(new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash).get("material"));
  } catch {
    return false;
  }
}

export async function encodeReceizReversibleCoordinate(
  exactBytes: Uint8Array,
  input: Readonly<{ kind?: "bytes" | "playable-url" }> = {},
): Promise<ReceizReversibleCoordinate> {
  const kind = input.kind ?? "bytes";
  const first = await encodeSingleCoordinate(exactBytes, kind);
  if (exactBytes.byteLength < MIN_RECURSIVE_INPUT_BYTES || first.coordinateByteLength >= exactBytes.byteLength) {
    return first;
  }
  let current = first;
  let depth = 1;
  while (depth < MAX_RECURSION_DEPTH) {
    const next = await encodeSingleCoordinate(current.coordinateBytes, "bytes");
    if (next.coordinateByteLength >= current.coordinateByteLength) break;
    current = next;
    depth += 1;
  }
  if (depth === 1) return first;
  const recursivePayload = new Writer();
  recursivePayload.varUint(depth);
  recursivePayload.varUint(current.coordinateBytes.byteLength);
  recursivePayload.bytes(current.coordinateBytes);
  const recursive = await buildCoordinate(exactBytes, kind, {
    mode: MODE_RECURSIVE,
    payload: recursivePayload.finish(),
  }, depth);
  return recursive.coordinateByteLength < first.coordinateByteLength ? recursive : first;
}

async function encodeSingleCoordinate(
  exactBytes: Uint8Array,
  kind: "bytes" | "playable-url",
): Promise<ReceizReversibleCoordinate> {
  const candidate = selectCandidate(exactBytes, kind);
  return buildCoordinate(exactBytes, kind, candidate, 1);
}

async function buildCoordinate(
  exactBytes: Uint8Array,
  kind: "bytes" | "playable-url",
  candidate: Candidate,
  recursionDepth: number,
): Promise<ReceizReversibleCoordinate> {
  const digest = await sha256Bytes(exactBytes);
  const writer = new Writer();
  writer.bytes(MAGIC);
  writer.byte(candidate.mode);
  writer.byte(kind === "playable-url" ? FLAG_PLAYABLE_URL : 0);
  writer.varUint(exactBytes.byteLength);
  writer.bytes(digest);
  writer.varUint(candidate.payload.byteLength);
  writer.bytes(candidate.payload);
  const coordinateBytes = writer.finish();
  return Object.freeze({
    schema: RECEIZ_REVERSIBLE_COORDINATE_SCHEMA,
    coordinateBytes,
    coordinateByteLength: coordinateBytes.byteLength,
    originalByteLength: exactBytes.byteLength,
    mode: modeName(candidate.mode),
    kind,
    recursionDepth,
  });
}

type ParsedCoordinateEnvelope = Readonly<{
  mode: number;
  flags: number;
  originalLength: number;
  expectedDigest: Uint8Array;
  payload: Uint8Array;
}>;

function parseCoordinateEnvelope(
  coordinateBytes: Uint8Array,
  options?: DecodeReceizReversibleCoordinateOptions,
): ParsedCoordinateEnvelope {
  if (coordinateBytes.byteLength < HEADER_BYTES + DIGEST_BYTES + 2) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_INVALID");
  }
  const reader = new Reader(coordinateBytes);
  if (!equalBytes(reader.bytes(MAGIC.byteLength), MAGIC)) reader.fail();
  const mode = reader.byte();
  modeName(mode);
  const flags = reader.byte();
  if ((flags & ~FLAG_PLAYABLE_URL) !== 0) reader.fail();
  const originalLength = reader.varUint();
  assertOutputLength(originalLength, options);
  const expectedDigest = reader.bytes(DIGEST_BYTES);
  const payload = reader.bytes(reader.varUint());
  if (!reader.done()) reader.fail();
  return { mode, flags, originalLength, expectedDigest, payload };
}

async function decodeSingleCoordinate(
  coordinateBytes: Uint8Array,
  options?: DecodeReceizReversibleCoordinateOptions,
): Promise<Readonly<{ exactBytes: Uint8Array; kind: "bytes" | "playable-url" }>> {
  const { mode, flags, originalLength, expectedDigest, payload } = parseCoordinateEnvelope(coordinateBytes, options);
  if (mode === MODE_RECURSIVE) throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_RECURSION_INVALID");
  const exactBytes = decodePayload(mode, payload, originalLength, options);
  if (!equalBytes(await sha256Bytes(exactBytes), expectedDigest)) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_DIGEST_MISMATCH");
  }
  const kind = (flags & FLAG_PLAYABLE_URL) !== 0 ? "playable-url" : "bytes";
  if (kind === "playable-url" && !isPlayableReceizMaterialUrl(textDecoder.decode(exactBytes))) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PLAYABLE_URL_INVALID");
  }
  return Object.freeze({ exactBytes, kind });
}

export async function decodeReceizReversibleCoordinate(
  coordinateBytes: Uint8Array,
  options?: DecodeReceizReversibleCoordinateOptions,
): Promise<Readonly<{ exactBytes: Uint8Array; kind: "bytes" | "playable-url" }>> {
  const outer = parseCoordinateEnvelope(coordinateBytes, options);
  if (outer.mode !== MODE_RECURSIVE) return decodeSingleCoordinate(coordinateBytes, options);
  const recursiveReader = new Reader(outer.payload);
  const depth = recursiveReader.varUint();
  if (depth < 2 || depth > MAX_RECURSION_DEPTH) recursiveReader.fail();
  let current = recursiveReader.bytes(recursiveReader.varUint());
  if (!recursiveReader.done()) recursiveReader.fail();
  let decoded: Readonly<{ exactBytes: Uint8Array; kind: "bytes" | "playable-url" }> | null = null;
  for (let index = 0; index < depth; index += 1) {
    decoded = await decodeSingleCoordinate(current, options);
    current = decoded.exactBytes;
  }
  if (!decoded || current.byteLength !== outer.originalLength
    || !equalBytes(await sha256Bytes(current), outer.expectedDigest)) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_DIGEST_MISMATCH");
  }
  const kind = (outer.flags & FLAG_PLAYABLE_URL) !== 0 ? "playable-url" : "bytes";
  if (kind === "playable-url" && !isPlayableReceizMaterialUrl(textDecoder.decode(current))) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PLAYABLE_URL_INVALID");
  }
  return Object.freeze({ exactBytes: current, kind });
}

export async function encodeReceizPlayableUrlCoordinate(playableUrl: string): Promise<ReceizReversibleCoordinate> {
  if (!isPlayableReceizMaterialUrl(playableUrl)) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PLAYABLE_URL_INVALID");
  }
  return encodeReceizReversibleCoordinate(textEncoder.encode(playableUrl), { kind: "playable-url" });
}

export async function decodeReceizPlayableUrlCoordinate(
  coordinateBytes: Uint8Array,
  options?: DecodeReceizReversibleCoordinateOptions,
): Promise<string> {
  const decoded = await decodeReceizReversibleCoordinate(coordinateBytes, options);
  if (decoded.kind !== "playable-url") {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PLAYABLE_URL_REQUIRED");
  }
  return textDecoder.decode(decoded.exactBytes);
}

/**
 * Measures derivable representation independently from proof bytes and carried
 * media. It does not verify or replace the sealed proof object; playback still
 * enters through the existing verify-before-extract path after reconstruction.
 */
export async function analyzeReceizPlayableUrlDerivability(
  playableUrl: string,
): Promise<ReceizPlayableUrlDerivabilityReport> {
  if (!isPlayableReceizMaterialUrl(playableUrl)) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PLAYABLE_URL_INVALID");
  }
  const url = new URL(playableUrl);
  const proofToken = url.searchParams.get("c")!;
  const materialToken = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash).get("material")!;
  if (!materialToken.startsWith("rma2:")) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_INLINE_MATERIAL_REQUIRED");
  }
  const proofPrefix = ["rpb1:", "rpb2:"].find((prefix) => proofToken.startsWith(prefix)) ?? "";
  const proofBody = proofToken.slice(proofPrefix.length);
  const compactProofBinaryBytes = base64UrlDecode(proofBody).byteLength;
  if (base64UrlEncode(base64UrlDecode(proofBody)) !== proofBody) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_PROOF_REPRESENTATION_INVALID");
  }
  const materialBody = materialToken.slice("rma2:".length);
  const materialCapsuleBinaryBytes = base64UrlDecode(materialBody).byteLength;
  if (base64UrlEncode(base64UrlDecode(materialBody)) !== materialBody) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_MATERIAL_REPRESENTATION_INVALID");
  }
  const capsule = decodeReceizMaterialCapsule(materialToken);
  if (encodeReceizMaterialCapsule(capsule) !== materialToken) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_MATERIAL_REPRESENTATION_INVALID");
  }
  const exactPlaybackUrlBytes = textEncoder.encode(playableUrl).byteLength;
  const urlRepresentationAndSyntaxBytes = exactPlaybackUrlBytes
    - compactProofBinaryBytes
    - materialCapsuleBinaryBytes;
  if (urlRepresentationAndSyntaxBytes < 0) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_DERIVABILITY_ACCOUNTING_INVALID");
  }
  const coordinate = await encodeReceizPlayableUrlCoordinate(playableUrl);
  return Object.freeze({
    exactPlaybackUrlBytes,
    urlRepresentationAndSyntaxBytes,
    compactProofBinaryBytes,
    materialCapsuleBinaryBytes,
    exactSealedArtifactBytes: capsule.exactArtifactBytes.byteLength,
    filenameBytes: textEncoder.encode(capsule.filename).byteLength,
    mimeTypeBytes: textEncoder.encode(capsule.mimeType).byteLength,
    isoBmff: analyzeIsoBmffDerivability(capsule.exactArtifactBytes),
    coordinateBytes: coordinate.coordinateByteLength,
    coordinateMode: coordinate.mode,
    coordinateRecursionDepth: coordinate.recursionDepth,
  });
}

export function serializeReceizReversibleCoordinate(coordinate: ReceizReversibleCoordinate): string {
  return `${RECEIZ_REVERSIBLE_COORDINATE_PREFIX}${base64UrlEncode(coordinate.coordinateBytes)}`;
}

export function parseReceizReversibleCoordinateToken(token: string): Uint8Array {
  const normalized = token.trim();
  if (!normalized.startsWith(RECEIZ_REVERSIBLE_COORDINATE_PREFIX)) {
    throw new TypeError("RECEIZ_REVERSIBLE_COORDINATE_SCHEMA_INVALID");
  }
  return base64UrlDecode(normalized.slice(RECEIZ_REVERSIBLE_COORDINATE_PREFIX.length));
}
