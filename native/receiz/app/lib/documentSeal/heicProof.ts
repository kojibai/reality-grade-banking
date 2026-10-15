import { jcsCanonicalize } from "@/app/utils/jcs";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export const RECEIZ_HEIC_PROOF_UUID = new Uint8Array([
  0xc0, 0x61, 0x19, 0xbd, 0x6b, 0x98, 0x55, 0x1f,
  0xad, 0x30, 0x6d, 0x23, 0xed, 0xcb, 0x79, 0xd0,
]);
export const RECEIZ_HEIC_PROOF_MAGIC = encoder.encode("receiz.heic.proof.v1\0");

type IsoBox = Readonly<{
  start: number;
  end: number;
  type: string;
  headerLength: number;
}>;

export type ParsedReceizHeicProof = Readonly<{
  basisBytes: Uint8Array;
  proofCount: number;
  bundle: unknown | null;
  parseError: string | null;
}>;

function ascii4(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

function bytesEqualAt(bytes: Uint8Array, expected: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + expected.length > bytes.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function parseTopLevelBoxes(bytes: Uint8Array): IsoBox[] | null {
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes: IsoBox[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const size32 = view.getUint32(offset, false);
    const type = ascii4(bytes, offset + 4);
    let size = size32;
    let headerLength = 8;
    if (size32 === 0) return null;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return null;
      const size64 = view.getBigUint64(offset + 8, false);
      if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(size64);
      headerLength = 16;
    }
    if (size < headerLength || offset + size > bytes.length) return null;
    boxes.push({ start: offset, end: offset + size, type, headerLength });
    offset += size;
  }
  return offset === bytes.length ? boxes : null;
}

function parseProofBox(bytes: Uint8Array, box: IsoBox): { bundle: unknown } | { error: string } | null {
  if (box.type !== "uuid") return null;
  const uuidOffset = box.start + box.headerLength;
  if (!bytesEqualAt(bytes, RECEIZ_HEIC_PROOF_UUID, uuidOffset)) return null;
  const magicOffset = uuidOffset + RECEIZ_HEIC_PROOF_UUID.length;
  if (!bytesEqualAt(bytes, RECEIZ_HEIC_PROOF_MAGIC, magicOffset)) return { error: "heic_receiz_magic_invalid" };
  const lengthOffset = magicOffset + RECEIZ_HEIC_PROOF_MAGIC.length;
  if (lengthOffset + 4 > box.end) return { error: "heic_receiz_json_length_missing" };
  const jsonLength = new DataView(bytes.buffer, bytes.byteOffset + lengthOffset, 4).getUint32(0, false);
  const jsonOffset = lengthOffset + 4;
  if (jsonOffset + jsonLength !== box.end) return { error: "heic_receiz_json_length_invalid" };
  try {
    const jsonText = decoder.decode(bytes.slice(jsonOffset, box.end));
    const bundle = JSON.parse(jsonText) as unknown;
    if (jcsCanonicalize(bundle as Parameters<typeof jcsCanonicalize>[0]) !== jsonText) {
      return { error: "heic_receiz_json_noncanonical" };
    }
    return { bundle };
  } catch {
    return { error: "heic_receiz_json_invalid" };
  }
}

export function parseReceizHeicProof(bytes: Uint8Array): ParsedReceizHeicProof {
  const boxes = parseTopLevelBoxes(bytes);
  if (!boxes || boxes.length === 0 || boxes[0]?.type !== "ftyp") {
    return { basisBytes: bytes.slice(), proofCount: 0, bundle: null, parseError: "heic_container_invalid" };
  }
  const basisParts: Uint8Array[] = [];
  let proofCount = 0;
  let bundle: unknown | null = null;
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]!;
    const parsed = parseProofBox(bytes, box);
    if (parsed && "error" in parsed) {
      return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: parsed.error };
    }
    if (parsed) {
      proofCount += 1;
      if (proofCount !== 1) {
        return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: "heic_receiz_proof_duplicate" };
      }
      if (index !== boxes.length - 1) {
        return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: "heic_receiz_proof_not_final" };
      }
      bundle = parsed.bundle;
    } else {
      basisParts.push(bytes.slice(box.start, box.end));
    }
  }
  return { basisBytes: concat(basisParts), proofCount, bundle, parseError: null };
}

export function appendReceizHeicProof(args: {
  basisBytes: Uint8Array;
  bundle: unknown;
}): Uint8Array {
  const parsed = parseReceizHeicProof(args.basisBytes);
  if (parsed.parseError) throw new Error(parsed.parseError);
  const jsonBytes = encoder.encode(jcsCanonicalize(args.bundle as Parameters<typeof jcsCanonicalize>[0]));
  const payloadLength = RECEIZ_HEIC_PROOF_UUID.length + RECEIZ_HEIC_PROOF_MAGIC.length + 4 + jsonBytes.length;
  const boxLength = 8 + payloadLength;
  if (boxLength > 0xffffffff) throw new Error("heic_receiz_proof_too_large");
  const proofBox = new Uint8Array(boxLength);
  const view = new DataView(proofBox.buffer);
  view.setUint32(0, boxLength, false);
  proofBox.set(encoder.encode("uuid"), 4);
  let offset = 8;
  proofBox.set(RECEIZ_HEIC_PROOF_UUID, offset);
  offset += RECEIZ_HEIC_PROOF_UUID.length;
  proofBox.set(RECEIZ_HEIC_PROOF_MAGIC, offset);
  offset += RECEIZ_HEIC_PROOF_MAGIC.length;
  view.setUint32(offset, jsonBytes.length, false);
  offset += 4;
  proofBox.set(jsonBytes, offset);
  return concat([parsed.basisBytes, proofBox]);
}
