const PHI_DECIMALS = 6n;
const USD_CENTS_DECIMALS = 2n;

export const MARKET_SHARE_SCALE = 1_000_000n;
const PHI_RATE_DENOM = 1_000_000_000_000n;

const POW10_CACHE = new Map<bigint, bigint>();

function pow10(decimals: bigint): bigint {
  const cached = POW10_CACHE.get(decimals);
  if (cached) return cached;
  let value = 1n;
  for (let index = 0n; index < decimals; index += 1n) value *= 10n;
  POW10_CACHE.set(decimals, value);
  return value;
}

function parseBigintLike(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  return fallback;
}

function parseDecimalToScaled(raw: unknown, decimals: bigint): bigint | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim().replace(/,/g, "");
  if (!text) return null;
  const match = text.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;

  const intPart = match[1] ?? "0";
  const fracPart = match[2] ?? "";
  const scale = pow10(decimals);
  const fracPadded = `${fracPart}${"0".repeat(Number(decimals) + 1)}`;
  const fracMain = fracPadded.slice(0, Number(decimals));
  const fracRoundDigit = fracPadded.slice(Number(decimals), Number(decimals) + 1);

  let out = BigInt(intPart) * scale + BigInt(fracMain || "0");
  if (fracRoundDigit >= "5") out += 1n;
  return out;
}

function decimalFromScaled(value: bigint, decimals: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const scale = pow10(decimals);
  const intPart = abs / scale;
  const fracPart = abs % scale;
  if (decimals === 0n) return `${sign}${intPart.toString()}`;
  return `${sign}${intPart.toString()}.${fracPart.toString().padStart(Number(decimals), "0")}`;
}

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

export function parseShareQuantityToMicro(raw: unknown): bigint | null {
  return parseDecimalToScaled(raw, PHI_DECIMALS);
}

export function formatShareQuantityFromMicro(shareQuantityMicro: bigint): string {
  return trimTrailingZeros(decimalFromScaled(shareQuantityMicro, PHI_DECIMALS));
}

export function shareQuantityNumberFromMicro(shareQuantityMicro: bigint): number {
  return Number.parseFloat(formatShareQuantityFromMicro(shareQuantityMicro)) || 0;
}

export function normalizeUsdPriceCents(value: number): bigint {
  const cents = parseDecimalToScaled(value.toFixed(2), USD_CENTS_DECIMALS);
  return cents && cents > 0n ? cents : 0n;
}

export function normalizeUsdPerPhiMicrocents(value: number): bigint {
  const scaled = Math.round(value * 100_000_000);
  return scaled > 0 ? BigInt(scaled) : 0n;
}

export function shareQuantityMicroFromUsdCents(usdCents: bigint, priceUsdCentsPerShare: bigint): bigint {
  if (usdCents <= 0n || priceUsdCentsPerShare <= 0n) return 0n;
  return (usdCents * MARKET_SHARE_SCALE) / priceUsdCentsPerShare;
}

export function usdCentsFromShareQuantityMicro(shareQuantityMicro: bigint, priceUsdCentsPerShare: bigint): bigint {
  if (shareQuantityMicro <= 0n || priceUsdCentsPerShare <= 0n) return 0n;
  return ((shareQuantityMicro * priceUsdCentsPerShare) + MARKET_SHARE_SCALE / 2n) / MARKET_SHARE_SCALE;
}

export function shareMarketValueUsdCents(shareQuantityMicro: bigint, livePriceUsdCents: bigint): bigint {
  return usdCentsFromShareQuantityMicro(shareQuantityMicro, livePriceUsdCents);
}

export function marketPositionUnrealizedUsdCents(args: {
  shareQuantityMicro: bigint;
  livePriceUsdCents: bigint;
  costBasisUsdCents: bigint;
}): bigint {
  return shareMarketValueUsdCents(args.shareQuantityMicro, args.livePriceUsdCents) - args.costBasisUsdCents;
}

export function marketPositionUnrealizedPct(args: {
  shareQuantityMicro: bigint;
  livePriceUsdCents: bigint;
  costBasisUsdCents: bigint;
}): number {
  const pnl = marketPositionUnrealizedUsdCents(args);
  if (args.costBasisUsdCents <= 0n) return 0;
  return Number(pnl) / Number(args.costBasisUsdCents) * 100;
}

export function formatUsdLabelFromCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  return `${sign}$${decimalFromScaled(abs, USD_CENTS_DECIMALS)}`;
}

export function formatPhiLabelFromMicro(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  return `${sign}${formatShareQuantityFromMicro(abs)}`;
}

export function marketNotionalPhiMicroFromUsdCents(usdCents: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (usdCents <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  return (usdCents * PHI_RATE_DENOM + usdPerPhiMicrocents / 2n) / usdPerPhiMicrocents;
}

export function marketNotionalUsdCentsFromPhiMicro(phiMicro: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (phiMicro <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  return (phiMicro * usdPerPhiMicrocents + PHI_RATE_DENOM / 2n) / PHI_RATE_DENOM;
}

export function bigintString(value: unknown): string {
  return parseBigintLike(value).toString();
}

export function bigintLike(value: unknown, fallback = 0n): bigint {
  return parseBigintLike(value, fallback);
}
