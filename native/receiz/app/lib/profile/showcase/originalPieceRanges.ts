import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { EXACT_BYTE_BLOCK_MAX_BYTES } from "../../../../packages/receiz-sdk/src/exactByteBlocks";

export type OriginalByteRange = Readonly<{ offset: number; byteLength: number }>;
export type OriginalPiece = OriginalByteRange & Readonly<{ sha256: string; ownerReceizId: string }>;
export type OriginalPieceLayout = Readonly<{
  originalSha256: string;
  byteLength: number;
  pieces: readonly OriginalPiece[];
}>;
export type OriginalPieceBytes = OriginalPiece & Readonly<{ bytes: Blob }>;

function fail(reason: string): never { throw new TypeError(`ORIGINAL_PIECE_${reason}`); }
const hex = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
const owner = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,127}\.receiz\.id$/u.test(value);
const end = ({ offset, byteLength }: OriginalByteRange) => offset + byteLength;

export async function digestOriginalPieceBytes(blob: Blob): Promise<string> {
  const digest = sha256.create();
  for (let offset = 0; offset < blob.size; offset += EXACT_BYTE_BLOCK_MAX_BYTES) {
    digest.update(new Uint8Array(await blob.slice(offset, offset + EXACT_BYTE_BLOCK_MAX_BYTES).arrayBuffer()));
  }
  return bytesToHex(digest.digest());
}

function checkedRange(range: OriginalByteRange, size: number) {
  if (!range || !Number.isSafeInteger(range.offset) || range.offset < 0 || !Number.isSafeInteger(range.byteLength)
    || range.byteLength < 1 || end(range) > size) fail("RANGE");
  return { offset: range.offset, byteLength: range.byteLength };
}

export function canonicalOriginalByteRanges(ranges: readonly OriginalByteRange[], size: number): OriginalByteRange[] {
  if (!Number.isSafeInteger(size) || size < 1 || !Array.isArray(ranges) || !ranges.length) fail("RANGE");
  const ordered = Array.from(ranges, range => checkedRange(range, size)).sort((left, right) => left.offset - right.offset);
  if (ordered.some((range, index) => index > 0 && end(ordered[index - 1]!) > range.offset)) fail("RANGE");
  return ordered;
}

export function readOriginalPieceLayout(layout: OriginalPieceLayout): OriginalPieceLayout {
  if (!layout || !hex(layout.originalSha256) || !Number.isSafeInteger(layout.byteLength) || layout.byteLength < 1
    || !Array.isArray(layout.pieces)) fail("COVERAGE");
  let offset = 0;
  const pieces = Array.from(layout.pieces, piece => {
    const range = checkedRange(piece, layout.byteLength);
    if (range.offset !== offset || !hex(piece.sha256) || !owner(piece.ownerReceizId)) fail("COVERAGE");
    offset = end(range);
    return Object.freeze({ ...range, sha256: piece.sha256, ownerReceizId: piece.ownerReceizId });
  });
  if (offset !== layout.byteLength) fail("COVERAGE");
  return Object.freeze({ originalSha256: layout.originalSha256, byteLength: offset, pieces: Object.freeze(pieces) });
}

export async function makeOriginalPieceLayout(original: Blob, initialOwner: string): Promise<OriginalPieceLayout> {
  const originalSha256 = await digestOriginalPieceBytes(original);
  return readOriginalPieceLayout({ originalSha256, byteLength: original.size,
    pieces: [{ offset: 0, byteLength: original.size, sha256: originalSha256, ownerReceizId: initialOwner }] });
}

type PiecePartition = OriginalByteRange & Readonly<{ ownerReceizId: string; previous: OriginalPiece }>;
type PieceSelection = Pick<OriginalPieceLayout, "originalSha256" | "byteLength"> & Readonly<{
  senderReceizId: string; recipientReceizId: string; ranges: readonly OriginalByteRange[];
}>;

function partitionOriginalPieceRanges(current: OriginalPieceLayout, sender: string, recipient: string,
  selection: readonly OriginalByteRange[]): PiecePartition[] {
  const ranges = canonicalOriginalByteRanges(selection, current.byteLength);
  if (!owner(sender) || !owner(recipient) || sender === recipient) fail("OWNER");
  const pieces: PiecePartition[] = [];
  let selected = 0;
  for (const previous of current.pieces) {
    const boundary = end(previous);
    if (!ranges[selected] || ranges[selected]!.offset >= boundary) {
      pieces.push({ offset: previous.offset, byteLength: previous.byteLength, ownerReceizId: previous.ownerReceizId, previous });
      continue;
    }
    if (previous.ownerReceizId !== sender) fail("OWNER");
    let offset = previous.offset;
    const add = (start: number, stop: number, ownerReceizId: string) => {
      if (start < stop) pieces.push({ offset: start, byteLength: stop - start, ownerReceizId, previous });
    };
    while (ranges[selected] && ranges[selected]!.offset < boundary) {
      const range = ranges[selected]!;
      const start = Math.max(offset, range.offset), stop = Math.min(boundary, end(range));
      add(offset, start, sender);
      add(start, stop, recipient);
      offset = stop;
      if (stop !== end(range)) break;
      selected++;
    }
    add(offset, boundary, sender);
  }
  return pieces;
}

/** Replay the exact ownership delta carried by a verified sealed successor. */
export function advanceOriginalPieceLayout(currentInput: OriginalPieceLayout, command: PieceSelection,
  proposed: OriginalPieceLayout): OriginalPieceLayout {
  const current = readOriginalPieceLayout(currentInput);
  const next = readOriginalPieceLayout(proposed);
  if (current.originalSha256 !== command.originalSha256 || next.originalSha256 !== current.originalSha256
    || current.byteLength !== command.byteLength || next.byteLength !== current.byteLength) fail("ORIGINAL");
  const expected = partitionOriginalPieceRanges(current, command.senderReceizId, command.recipientReceizId, command.ranges);
  if (next.pieces.length !== expected.length) fail("TRANSITION");
  for (let index = 0; index < expected.length; index++) {
    const { offset, byteLength, ownerReceizId, previous } = expected[index]!;
    const piece = next.pieces[index]!;
    if (piece.offset !== offset || piece.byteLength !== byteLength || piece.ownerReceizId !== ownerReceizId) fail("TRANSITION");
    if (byteLength === previous.byteLength && piece.sha256 !== previous.sha256) fail("BYTES");
  }
  return next;
}

/** Callers supply the admitted Original and the layout from its canonical ownership head. */
export async function splitOriginalPieceRanges(original: Blob, currentInput: OriginalPieceLayout, sender: string,
  recipient: string, selection: readonly OriginalByteRange[]): Promise<OriginalPieceLayout> {
  const current = readOriginalPieceLayout(currentInput);
  const partition = partitionOriginalPieceRanges(current, sender, recipient, selection);
  if (original.size !== current.byteLength || await digestOriginalPieceBytes(original) !== current.originalSha256) fail("ORIGINAL");
  for (const piece of current.pieces) {
    const digest = piece.byteLength === original.size ? current.originalSha256
      : await digestOriginalPieceBytes(original.slice(piece.offset, end(piece)));
    if (digest !== piece.sha256) fail("BYTES");
  }
  const pieces: OriginalPiece[] = [];
  for (const { previous, offset, byteLength, ownerReceizId } of partition) {
    const sha256 = byteLength === previous.byteLength ? previous.sha256
      : await digestOriginalPieceBytes(original.slice(offset, offset + byteLength));
    pieces.push({ offset, byteLength, ownerReceizId, sha256 });
  }
  return readOriginalPieceLayout({ ...current, pieces });
}

/** Transport may supply pieces in any order. The carried layout supplies the byte order. */
export async function reconstructOriginalPieces(layoutInput: OriginalPieceLayout, supplied: readonly OriginalPieceBytes[]): Promise<Blob> {
  const layout = readOriginalPieceLayout(layoutInput);
  const byOffset = new Map(supplied.map(piece => [piece.offset, piece]));
  if (byOffset.size !== supplied.length || byOffset.size !== layout.pieces.length) fail("COVERAGE");
  const ordered: Blob[] = [];
  for (const expected of layout.pieces) {
    const piece = byOffset.get(expected.offset);
    if (!piece || piece.byteLength !== expected.byteLength || piece.sha256 !== expected.sha256
      || piece.ownerReceizId !== expected.ownerReceizId) fail("COVERAGE");
    if (!(piece.bytes instanceof Blob) || piece.bytes.size !== expected.byteLength
      || await digestOriginalPieceBytes(piece.bytes) !== expected.sha256) fail("BYTES");
    ordered.push(piece.bytes);
  }
  const original = new Blob(ordered);
  if (await digestOriginalPieceBytes(original) !== layout.originalSha256) fail("ORIGINAL");
  return original;
}

export function projectOriginalPieceOwnership(layoutInput: OriginalPieceLayout, ownerReceizId: string) {
  const layout = readOriginalPieceLayout(layoutInput);
  const ranges = layout.pieces.filter(piece => piece.ownerReceizId === ownerReceizId)
    .map(({ offset, byteLength }) => ({ offset, byteLength }));
  const ownedBytes = ranges.reduce((total, range) => total + range.byteLength, 0);
  const hundredths = BigInt(ownedBytes) * 10_000n / BigInt(layout.byteLength);
  const fraction = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/u, "");
  const percentage = ownedBytes > 0 && hundredths === 0n ? "<0.01%" : `${hundredths / 100n}${fraction ? `.${fraction}` : ""}%`;
  return { ownedBytes, totalBytes: layout.byteLength, percentage, ranges };
}
