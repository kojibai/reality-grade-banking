import { packBankRepeatedBytes, unpackBankRepeatedBytes } from "./bytePacking";
import { receizBase64UrlEncode, receizBase64UrlDecode } from "../../../../packages/receiz-sdk/src/identity";
// Keep decoded graphs bounded and leave room for artwork inside the unchanged
// 8 MiB PNG carrier cap. A local-credit successor needs more than the old 4 MiB
// wire budget; the complete output image is independently size-checked.
const MAX_CLEAR = 32 * 1024 * 1024, MAX_WIRE = 6 * 1024 * 1024;
async function collect(stream: ReadableStream<Uint8Array>, max: number) { const reader = stream.getReader(), parts: Uint8Array[] = []; let length = 0; try {
    for (;;) {
        const item = await reader.read();
        if (item.done)
            break;
        length += item.value.length;
        if (length > max)
            throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
        parts.push(item.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
    }
    return bytes;
}
finally {
    await reader.cancel().catch(() => { });
    reader.releaseLock();
} }
/** Lossless transport only. Decompression never admits financial authority. */
export async function packBankNoteBytes(bytes: Uint8Array): Promise<string> { if (bytes.length > MAX_CLEAR)
    throw Error("BANK_NOTE_TRANSPORT_CAPACITY"); const compressed = await collect(new Blob([new Uint8Array(packBankRepeatedBytes(bytes)).buffer]).stream().pipeThrough(new CompressionStream("gzip")), MAX_WIRE); const wire = `gz2.${receizBase64UrlEncode(compressed)}`; if (wire.length > MAX_WIRE - 65536)
    throw Error("BANK_NOTE_TRANSPORT_CAPACITY"); return wire; }
export async function unpackBankNoteBytes(wire: string): Promise<Uint8Array> { if (typeof wire !== "string" || wire.length > MAX_WIRE || !/^gz[12]\./.test(wire))
    throw Error("BANK_NOTE_TRANSPORT_INVALID"); const compressed = receizBase64UrlDecode(wire.slice(4)); const bytes = await collect(new Blob([compressed.slice().buffer]).stream().pipeThrough(new DecompressionStream("gzip")), wire.startsWith("gz2.") ? MAX_CLEAR + 65536 : MAX_CLEAR); return wire.startsWith("gz2.") ? unpackBankRepeatedBytes(bytes) : bytes; }
