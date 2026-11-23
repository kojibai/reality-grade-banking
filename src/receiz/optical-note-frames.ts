const marker = 0x424f4e31;
const headerBytes = 59;
const partBytes = 792;
const maxBytes = 8 * 1024 * 1024;
const sessionBytes = 16;
const kindCode = { request: 1, payment: 2, wallet: 3 } as const;
type Kind = keyof typeof kindCode;
export type OpticalNotePayload = { bytes: Uint8Array; session: Uint8Array };
const equal = (left: Uint8Array, right: Uint8Array) => left.length === right.length && left.every((value, index) => value === right[index]);
const digest = async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer));

export function isOpticalNoteFrame(bytes: Uint8Array) {
  return bytes.length >= 4 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0) === marker;
}

export async function createOpticalNoteFrames(kind: Kind, bytes: Uint8Array, receiver?: Uint8Array) {
  if (!bytes.length || bytes.length > maxBytes) throw Error('BANK_OPTICAL_FRAME_INVALID');
  if (kind === 'payment' && receiver?.length !== sessionBytes) throw Error('BANK_OPTICAL_FRAME_MISMATCH');
  const exact = bytes.slice(), hash = await digest(exact);
  const session = kind === 'payment' ? receiver!.slice() : hash.slice(0, sessionBytes);
  const count = Math.ceil(exact.length / partBytes);
  return { session: session.slice(), count, frame(index: number) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw Error('BANK_OPTICAL_FRAME_INVALID');
    const part = exact.subarray(index * partBytes, (index + 1) * partBytes);
    const frame = new Uint8Array(headerBytes + part.length), header = new DataView(frame.buffer);
    header.setUint32(0, marker);
    header.setUint8(4, kindCode[kind]);
    header.setUint32(5, exact.length);
    header.setUint16(9, index);
    frame.set(session, 11);
    frame.set(hash, 27);
    frame.set(part, headerBytes);
    return frame;
  } };
}

export function readOpticalNoteFrames(kind: Kind, receiver?: Uint8Array) {
  let current: { bytes: Uint8Array; covered: Set<number>; session: Uint8Array; hash: Uint8Array; count: number } | undefined;
  const expected = receiver?.slice();
  return {
    get received() { return current?.covered.size ?? 0; },
    get count() { return current?.count ?? 0; },
    push(frame: Uint8Array) {
      if (!isOpticalNoteFrame(frame) || frame.length <= headerBytes || frame.length > headerBytes + partBytes) throw Error('BANK_OPTICAL_FRAME_INVALID');
      const header = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
      const length = header.getUint32(5), index = header.getUint16(9), offset = index * partBytes;
      const session = frame.subarray(11, 27), hash = frame.subarray(27, headerBytes), part = frame.subarray(headerBytes);
      if (!length || length > maxBytes || offset >= length || part.length !== Math.min(partBytes, length - offset)) throw Error('BANK_OPTICAL_FRAME_INVALID');
      if (header.getUint8(4) !== kindCode[kind] || expected && !equal(session, expected) || kind !== 'payment' && !equal(session, hash.subarray(0, sessionBytes))) throw Error('BANK_OPTICAL_FRAME_MISMATCH');
      const transfer = current ??= { bytes: new Uint8Array(length), covered: new Set(), session: session.slice(), hash: hash.slice(), count: Math.ceil(length / partBytes) };
      if (length !== transfer.bytes.length || !equal(hash, transfer.hash) || !equal(session, transfer.session)) throw Error('BANK_OPTICAL_FRAME_MISMATCH');
      if (transfer.covered.has(index)) {
        if (!equal(part, transfer.bytes.subarray(offset, offset + part.length))) throw Error('BANK_OPTICAL_FRAME_MISMATCH');
        return null;
      }
      transfer.bytes.set(part, offset);
      transfer.covered.add(index);
      if (transfer.covered.size !== transfer.count) return null;
      return digest(transfer.bytes).then(actual => {
        if (!equal(actual, transfer.hash)) throw Error('BANK_OPTICAL_PROOF_MISMATCH');
        return { bytes: transfer.bytes, session: transfer.session };
      });
    },
  };
}
