import { sha256 } from "@noble/hashes/sha2.js";

const NOTE_STATUS_SCOPE = "receiz_wallet_note_status_v1";
const RECEIZ_APP_ORIGIN = "https://receiz.com";
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64Url(bytes: Uint8Array): string {
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset] ?? 0;
    const second = bytes[offset + 1] ?? 0;
    const third = bytes[offset + 2] ?? 0;
    const combined = (first << 16) | (second << 8) | third;
    output += BASE64URL_ALPHABET[(combined >>> 18) & 63];
    output += BASE64URL_ALPHABET[(combined >>> 12) & 63];
    if (offset + 1 < bytes.length) output += BASE64URL_ALPHABET[(combined >>> 6) & 63];
    if (offset + 2 < bytes.length) output += BASE64URL_ALPHABET[combined & 63];
  }
  return output;
}

export function buildCanonicalWalletNoteStatusLink(noteId: string, noteToken: string): {
  proof: string;
  path: string;
  url: string;
} {
  const cleanId = noteId.trim().toLowerCase();
  const cleanToken = noteToken.trim();
  const proof = bytesToBase64Url(
    sha256(new TextEncoder().encode(`${NOTE_STATUS_SCOPE}:${cleanId}:${cleanToken}`)),
  );
  const path = `/wallet/note/${encodeURIComponent(noteId)}/status/${encodeURIComponent(proof)}`;
  return { proof, path, url: new URL(path, RECEIZ_APP_ORIGIN).toString() };
}
