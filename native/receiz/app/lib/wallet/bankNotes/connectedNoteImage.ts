import { insertPngTextChunks, readPngTextChunks, stripPngTextChunksByKeyword } from '../../../utils/pngChunks';
import { receizBase64UrlEncode as enc, receizBase64UrlDecode as dec } from '../../../../packages/receiz-sdk/src/identity';
import { canonicalizeReceizConstitution as canonical } from '../../../../packages/receiz-sdk/src/constitution';
import { readBankConnectedNoteSource, type BankConnectedNoteOptions } from './connectedNote';
const KEY = 'receiz.bank.offline-note.v1', PNG_MAX = 8 * 1024 * 1024, RAW_MAX = 16 * 1024 * 1024, WIRE_MAX = 6 * 1024 * 1024;
const fail = (): never => { throw Error('BANK_CONNECTED_NOTE_IMAGE_INVALID'); };
async function collect(stream: ReadableStream<Uint8Array>, max: number) {
    const reader = stream.getReader(), parts: Uint8Array[] = [];
    let n = 0;
    try {
        for (;;) {
            const next = await reader.read();
            if (next.done)
                break;
            n += next.value.length;
            if (n > max)
                fail();
            parts.push(next.value);
        }
        const bytes = new Uint8Array(n);
        let at = 0;
        for (const p of parts) {
            bytes.set(p, at);
            at += p.length;
        }
        return bytes;
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
}
function transport(bytes: Uint8Array) {
    if (!bytes.length || bytes.length > PNG_MAX)
        fail();
    const chunks = readPngTextChunks(bytes, { keyword: KEY });
    if (chunks.length !== 1)
        fail();
    const raw = chunks[0]!.text, v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).sort().join('|') !== 'schema|wire' || v.schema !== 'receiz.bank.connected-note-image.v1' || raw !== canonical(v) || typeof v.wire !== 'string' || v.wire.length > WIRE_MAX || !/^gz1\.[A-Za-z0-9_-]+$/u.test(v.wire))
        fail();
    return v as {
        schema: 'receiz.bank.connected-note-image.v1';
        wire: string;
    };
}
/** PNG discrimination only. readBankConnectedNoteImage performs source admission. */
export async function isBankConnectedNoteImage(bytes: Uint8Array): Promise<boolean> {
    try {
        transport(bytes);
        return true;
    }
    catch {
        return false;
    }
}
export async function readBankConnectedNoteImage(bytes: Uint8Array, options: BankConnectedNoteOptions = {}) {
    const v = transport(bytes), compressed = dec(v.wire.slice(4));
    if (enc(compressed) !== v.wire.slice(4))
        fail();
    const clear = await collect(new Blob([compressed.slice().buffer]).stream().pipeThrough(new DecompressionStream('gzip')), RAW_MAX);
    return readBankConnectedNoteSource(clear, options);
}
/** Artwork carries a complete exact financial source and pending handover. The
 * scoped Note private key and private account opening never enter the image. */
export async function exportBankConnectedNoteImage(source: Uint8Array, artwork: Uint8Array, options: BankConnectedNoteOptions = {}): Promise<Uint8Array> {
    if (!source.length || source.length > RAW_MAX || !artwork.length || artwork.length > PNG_MAX)
        fail();
    await readBankConnectedNoteSource(source, options);
    const compressed = await collect(new Blob([source.slice().buffer]).stream().pipeThrough(new CompressionStream('gzip')), WIRE_MAX), wire = 'gz1.' + enc(compressed);
    if (wire.length > WIRE_MAX)
        fail();
    const result = insertPngTextChunks(stripPngTextChunksByKeyword(artwork, KEY).pngBytes, [{ keyword: KEY, text: canonical({ schema: 'receiz.bank.connected-note-image.v1', wire }) }]);
    if (result.length > PNG_MAX)
        fail();
    await readBankConnectedNoteImage(result, options);
    return result;
}
