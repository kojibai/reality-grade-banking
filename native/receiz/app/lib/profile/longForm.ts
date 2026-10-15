import type { ProfileOriginalLongForm } from "@/app/lib/profile/types";

export const PROFILE_CLAIM_TRANSPORT_TEXT_MAX_CHARS = 4096;
export const PROFILE_LONG_FORM_TITLE_MAX_CHARS = 160;
export const PROFILE_LONG_FORM_TEXT_MAX_CHARS = 100_000;

const HEX64_RE = /^[0-9a-f]{64}$/;

export function normalizeProfileLongFormTitle(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

export function normalizeProfileLongFormText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n?/g, "\n").trim();
}

export function countProfileLongFormWords(value: string): number {
  const normalized = normalizeProfileLongFormText(value);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function coerceProfileOriginalLongForm(value: unknown): ProfileOriginalLongForm | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const text = normalizeProfileLongFormText(typeof record.text === "string" ? record.text : "");
  if (!text || text.length > PROFILE_LONG_FORM_TEXT_MAX_CHARS) return null;

  const title = normalizeProfileLongFormTitle(typeof record.title === "string" ? record.title : null);
  if (title && title.length > PROFILE_LONG_FORM_TITLE_MAX_CHARS) return null;

  const sha256Hex = typeof record.sha256Hex === "string" ? record.sha256Hex.trim().toLowerCase() : "";
  if (!HEX64_RE.test(sha256Hex)) return null;

  const rawWordCount = record.wordCount;
  const wordCount =
    typeof rawWordCount === "number" && Number.isFinite(rawWordCount) && rawWordCount >= 0
      ? Math.trunc(rawWordCount)
      : countProfileLongFormWords(text);

  return {
    title,
    text,
    sha256Hex,
    wordCount,
  };
}
