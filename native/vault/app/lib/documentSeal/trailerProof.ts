import { jcsCanonicalize } from "@/app/utils/jcs";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const RECEIZ_TRAILER_PREFIX = "\n\n--RECEIZ-TRAILER-v1--\n";
export const RECEIZ_TRAILER_SUFFIX = "\n--END-RECEIZ-TRAILER--\n";

const TRAILER_PREFIX_BYTES = textEncoder.encode(RECEIZ_TRAILER_PREFIX);
const TRAILER_SUFFIX_BYTES = textEncoder.encode(RECEIZ_TRAILER_SUFFIX);

function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  for (let i = haystack.length - needle.length; i >= 0; i -= 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  for (let i = Math.max(0, from); i <= haystack.length - needle.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

export function countReceizTrailers(bytes: Uint8Array): number {
  let count = 0;
  let cursor = 0;
  while (cursor <= bytes.length - TRAILER_PREFIX_BYTES.length) {
    const index = indexOfBytes(bytes, TRAILER_PREFIX_BYTES, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + TRAILER_PREFIX_BYTES.length;
  }
  return count;
}

export function stripReceizTrailer(bytes: Uint8Array): { basisBytes: Uint8Array; removedCount: number } {
  let current = bytes;
  let removedCount = 0;

  while (true) {
    const start = lastIndexOfBytes(current, TRAILER_PREFIX_BYTES);
    if (start < 0) break;
    const suffixStart = indexOfBytes(current, TRAILER_SUFFIX_BYTES, start + TRAILER_PREFIX_BYTES.length);
    if (suffixStart < 0) break;
    const trailerEnd = suffixStart + TRAILER_SUFFIX_BYTES.length;
    if (trailerEnd !== current.length) break;
    current = current.slice(0, start);
    removedCount += 1;
  }

  return { basisBytes: current, removedCount };
}

export type ParsedReceizTrailer = Readonly<{
  trailerCount: number;
  basisBytes: Uint8Array;
  bundle: unknown | null;
  parseError: string | null;
}>;

export function parseReceizTrailer(bytes: Uint8Array): ParsedReceizTrailer {
  const trailerCount = countReceizTrailers(bytes);
  if (trailerCount === 0) {
    return { trailerCount: 0, basisBytes: bytes, bundle: null, parseError: "missing_trailer" };
  }

  const start = lastIndexOfBytes(bytes, TRAILER_PREFIX_BYTES);
  if (start < 0) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "missing_trailer_start" };
  }

  const suffixStart = indexOfBytes(bytes, TRAILER_SUFFIX_BYTES, start + TRAILER_PREFIX_BYTES.length);
  if (suffixStart < 0) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "missing_trailer_end" };
  }

  const trailerEnd = suffixStart + TRAILER_SUFFIX_BYTES.length;
  if (trailerEnd !== bytes.length) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "trailer_not_at_end" };
  }

  const jsonBytes = bytes.slice(start + TRAILER_PREFIX_BYTES.length, suffixStart);
  const basisBytes = bytes.slice(0, start);

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(jsonBytes));
  } catch {
    return { trailerCount, basisBytes, bundle: null, parseError: "invalid_trailer_json" };
  }

  return { trailerCount, basisBytes, bundle: parsed, parseError: null };
}

export function appendReceizTrailer(args: { basisBytes: Uint8Array; bundle: unknown }): Uint8Array {
  const json = jcsCanonicalize(args.bundle);
  const trailer = textEncoder.encode(`${RECEIZ_TRAILER_PREFIX}${json}${RECEIZ_TRAILER_SUFFIX}`);
  const out = new Uint8Array(args.basisBytes.length + trailer.length);
  out.set(args.basisBytes, 0);
  out.set(trailer, args.basisBytes.length);
  return out;
}

