import { base64UrlDecode } from "./crypto.js";

const ALGORITHM_IDENTIFIER_RE = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const CANONICAL_DECIMAL_RE = /^(0|[1-9][0-9]*)$/;
const CERT_KEY_ID_RE = /^[a-z0-9._:-]{3,64}$/i;
const FILENAME_RE = /^[^\u0000-\u001f/\\]{1,255}$/;
const MIME_RE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const PROOF_CODE_RE = /^[A-Z0-9]{8}$/;
const VERSION_NUMBER_RE = /^[1-9][0-9]*$/;
const KAI_KLOK_RE = /^(?:[0-9]|[12][0-9]|3[0-5]):(?:[0-3][0-9]|4[0-3]) • D(?:[1-9]|[1-3][0-9]|4[0-2])\/M[1-8] • (?:Solhara|Aquaris|Flamora|Verdari|Sonari|Kaelith) • (?:Ignition|Integration|Harmonization|Reflection|Purification|Dream) Ark$/;
const RECEIZ_TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2}) ([01]\d|2[0-3]):([0-5]\d)$/;
const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function isCanonicalAlgorithmIdentifier(value: unknown): value is string {
  return typeof value === "string" && ALGORITHM_IDENTIFIER_RE.test(value);
}

export function isCanonicalBase64Url(value: unknown): value is string {
  if (typeof value !== "string" || !BASE64URL_RE.test(value)) return false;
  const remainder = value.length % 4;
  if (remainder === 1) return false;
  const finalSextet = BASE64URL_ALPHABET.indexOf(value.at(-1)!);
  if (
    (remainder === 2 && (finalSextet & 0b1111) !== 0)
    || (remainder === 3 && (finalSextet & 0b11) !== 0)
  ) return false;
  try {
    base64UrlDecode(value);
    return true;
  } catch {
    return false;
  }
}

export function isCanonicalDecimal(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_DECIMAL_RE.test(value);
}

export function isCanonicalFilename(value: unknown): value is string {
  return typeof value === "string" && value !== "." && value !== ".." && FILENAME_RE.test(value);
}

export function isCanonicalHex(value: unknown, length: number): value is string {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${String(length)}}$`, "i").test(value);
}

export function isCanonicalKaiKlok(value: unknown): value is string {
  return typeof value === "string" && KAI_KLOK_RE.test(value);
}

export function isCanonicalKaiPulse(value: unknown): value is string {
  return isCanonicalDecimal(value);
}

export function isCanonicalKeyId(value: unknown): value is string {
  return typeof value === "string" && CERT_KEY_ID_RE.test(value);
}

export function isCanonicalMime(value: unknown): value is string {
  return typeof value === "string" && MIME_RE.test(value);
}

export function isCanonicalProofCode(value: unknown): value is string {
  return typeof value === "string" && PROOF_CODE_RE.test(value);
}

export function isCanonicalReceizTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RECEIZ_TIMESTAMP_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute;
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function isSafeNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isVersionIdentifier(value: unknown, prefix: string): value is string {
  return typeof value === "string"
    && value.startsWith(prefix)
    && VERSION_NUMBER_RE.test(value.slice(prefix.length));
}
