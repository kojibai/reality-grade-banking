import {RECEIZ_RELATED_ORIGINS} from '../auth/relatedOrigins';
export const PBI_EXPECTED_ORIGIN = "https://receiz.com";
export const PBI_RP_ID = "receiz.com";

const DEFAULT_ALLOWED_ORIGINS = ["https://receiz.com", "https://www.receiz.com"] as const;

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function pbiAllowedOrigins(): string[] {
  const configured = (process.env.PBI_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...RECEIZ_RELATED_ORIGINS, ...configured]));
}

export function isAllowedPbiOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return pbiAllowedOrigins().includes(normalized);
}
