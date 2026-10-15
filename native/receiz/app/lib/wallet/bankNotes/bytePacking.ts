// Lossless byte transport only. Decoded bytes still require full SDK admission.
// A bounded long-window copy stream removes repeated proof/image bytes before
// gzip (whose 32 KiB window cannot compress a complete multi-artifact graph).
const LIMIT = 32 * 1024 * 1024, WINDOW = 32, STRIDE = 64;
const magic = [66, 76, 90, 49];
const power = Array.from({ length: WINDOW - 1 }).reduce<number>(v => Math.imul(v, 31) >>> 0, 1);
const hashAt = (bytes: Uint8Array, start: number) => { let h = 0; for (let i = 0; i < WINDOW; i++) h = (Math.imul(h, 31) + bytes[start + i]!) >>> 0; return h; };
function integer(value: number): number[] { const result = []; do { const digit = value % 128; value = Math.floor(value / 128); result.push(digit | (value ? 128 : 0)); } while (value); return result; }
export function packBankRepeatedBytes(bytes: Uint8Array): Uint8Array {
    if (bytes.length > LIMIT) throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
    const header = new Uint8Array(8); header.set(magic); new DataView(header.buffer).setUint32(4, bytes.length);
    const parts: Uint8Array[] = [header]; const dictionary = new Map<number, number>(); let cursor = 0, literal = 0, h = bytes.length >= WINDOW ? hashAt(bytes, 0) : 0;
    const flush = (end: number) => { if (end > literal) parts.push(new Uint8Array([0, ...integer(end - literal)]), bytes.subarray(literal, end)); };
    while (cursor + WINDOW <= bytes.length) {
        const prior = dictionary.get(h);
        if (prior !== undefined && prior < cursor && bytes.subarray(cursor, cursor + WINDOW).every((v, i) => v === bytes[prior + i])) {
            let length = WINDOW; while (cursor + length < bytes.length && bytes[cursor + length] === bytes[prior + length]) length++;
            flush(cursor); parts.push(new Uint8Array([1, ...integer(cursor - prior), ...integer(length)]));
            cursor += length; literal = cursor; if (cursor + WINDOW <= bytes.length) h = hashAt(bytes, cursor); continue;
        }
        if (cursor % STRIDE === 0) dictionary.set(h, cursor);
        h = (Math.imul((h - Math.imul(bytes[cursor]!, power)) >>> 0, 31) + (bytes[cursor + WINDOW] ?? 0)) >>> 0; cursor++;
    }
    flush(bytes.length); const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0)); let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; } return output;
}
export function unpackBankRepeatedBytes(bytes: Uint8Array): Uint8Array {
    const invalid = () => Error("BANK_NOTE_TRANSPORT_INVALID");
    if (bytes.length < 8 || magic.some((v, i) => bytes[i] !== v)) throw invalid();
    const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4); if (size > LIMIT) throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
    const result = new Uint8Array(size); let cursor = 8, offset = 0;
    const read = () => { let value = 0, scale = 1; for (let i = 0; i < 5; i++) { if (cursor >= bytes.length) throw invalid(); const byte = bytes[cursor++]!; value += (byte & 127) * scale; if (value > LIMIT) throw invalid(); if (byte < 128) return value; scale *= 128; } throw invalid(); };
    while (cursor < bytes.length) {
        const kind = bytes[cursor++]!, first = read(); if (!first) throw invalid();
        if (kind === 0) { if (first > size - offset || first > bytes.length - cursor) throw invalid(); result.set(bytes.subarray(cursor, cursor + first), offset); cursor += first; offset += first; }
        else if (kind === 1) { const length = read(); if (!length || first > offset || length > size - offset) throw invalid(); for (let i = 0; i < length; i++) { result[offset] = result[offset - first]!; offset++; } }
        else throw invalid();
    }
    if (offset !== size) throw invalid(); return result;
}
