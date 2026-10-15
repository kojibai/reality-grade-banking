import { packBankNoteBytes, unpackBankNoteBytes } from "./compression";
import { encodeBankFundedSource, decodeBankFundedSource } from "./sourceCodec";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import { insertPngTextChunks, readPngTextChunks, stripPngTextChunksByKeyword } from "../../../utils/pngChunks";
import { readBankFundedNoteSource, verifyBankFundedNoteSource, type BankVerifiedFundedNote } from "./fundedNote";
const KEY = "receiz.bank.offline-note.v1";
/** The image is transport. Authority stays in the exact enclosing artifacts and
 * SDK-verified consumption chain it carries. No public ID private key is exported. */
export async function exportBankNoteImage(note: BankVerifiedFundedNote, artworkPngBytes: Uint8Array): Promise<Uint8Array> {
    const source = readBankFundedNoteSource(note), wire = await packBankNoteBytes(new TextEncoder().encode(JSON.stringify(encodeBankFundedSource(source))));
    const image = insertPngTextChunks(stripPngTextChunksByKeyword(artworkPngBytes, KEY).pngBytes, [{ keyword: KEY, text: JSON.stringify({ schema: "receiz.bank.note-image-transport.v1", wire }) }]);
    if (image.length > 8 * 1024 * 1024) throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
    return image;
}
export async function openBankNoteImage(bytes: Uint8Array, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}> = {}): Promise<BankVerifiedFundedNote> {
    if (bytes.length > 8 * 1024 * 1024)
        throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
    const chunks = readPngTextChunks(bytes, { keyword: KEY });
    if (chunks.length !== 1)
        throw Error("BANK_COMPLETE_NOTE_IMAGE_REQUIRED");
    const transport = JSON.parse(chunks[0]!.text);
    if (transport?.schema !== "receiz.bank.note-image-transport.v1" || Object.keys(transport).sort().join("|") !== "schema|wire")
        throw Error("BANK_COMPLETE_NOTE_IMAGE_REQUIRED");
    const source = decodeBankFundedSource(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await unpackBankNoteBytes(transport.wire))));
    return verifyBankFundedNoteSource(source, options);
}
