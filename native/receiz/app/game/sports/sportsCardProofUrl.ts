import { deflateSync, inflateSync } from "fflate";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";
import type { SportsArenaCardClaim } from "@/app/lib/game/sportsArenaPacks";

const SPORTS_CARD_PROOF_URL_CODEC = "c1.";
const SPORTS_CARD_PROOF_URL_MAX_ENCODED_LENGTH = 24_000;
const SPORTS_CARD_PROOF_URL_MAX_DECODED_BYTES = 128_000;

export function encodeSportsCardProofUrlClaim(claim: SportsArenaCardClaim): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claim));
  if (bytes.length > SPORTS_CARD_PROOF_URL_MAX_DECODED_BYTES) {
    throw new Error("sports_card_proof_url_claim_too_large");
  }
  const encoded = `${SPORTS_CARD_PROOF_URL_CODEC}${base64UrlEncode(deflateSync(bytes, { level: 9 }))}`;
  if (encoded.length > SPORTS_CARD_PROOF_URL_MAX_ENCODED_LENGTH) {
    throw new Error("sports_card_proof_url_claim_too_large");
  }
  return encoded;
}

export function decodeSportsCardProofUrlClaim(value: string): unknown | null {
  const encoded = value.trim();
  if (
    !encoded.startsWith(SPORTS_CARD_PROOF_URL_CODEC) ||
    encoded.length > SPORTS_CARD_PROOF_URL_MAX_ENCODED_LENGTH
  ) return null;
  try {
    const compressed = base64UrlDecode(encoded.slice(SPORTS_CARD_PROOF_URL_CODEC.length));
    const bytes = inflateSync(compressed, { out: new Uint8Array(SPORTS_CARD_PROOF_URL_MAX_DECODED_BYTES + 1) });
    if (bytes.length > SPORTS_CARD_PROOF_URL_MAX_DECODED_BYTES) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
