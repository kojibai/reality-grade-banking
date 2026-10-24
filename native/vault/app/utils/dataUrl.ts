const BASE64_BODY_RE = /^[A-Za-z0-9+/=\s]+$/;

export function isBase64DataUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw.toLowerCase().startsWith("data:")) return false;

  const commaIndex = raw.indexOf(",");
  if (commaIndex <= 4 || commaIndex >= raw.length - 1) return false;

  const header = raw.slice(5, commaIndex);
  const tokens = header.split(";").map((token) => token.trim().toLowerCase());
  if (!tokens.some((token) => token === "base64")) return false;

  const payload = raw.slice(commaIndex + 1).replace(/\s+/g, "");
  return payload.length > 0 && BASE64_BODY_RE.test(payload);
}

export function estimateBase64DataUrlLength(byteLength: number, mime: string): number {
  const safeBytes = Number.isFinite(byteLength) && byteLength > 0 ? byteLength : 0;
  const base64Chars = Math.ceil(safeBytes / 3) * 4;
  return `data:${mime};base64,`.length + base64Chars;
}
