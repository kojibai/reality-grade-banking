// Deterministic amount/quote arithmetic shared by server and offline execution.
// These functions do not admit sources or authorize a financial operation.
import { momentFromUTC } from "@/app/utils/kai_pulse";
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from "@/app/utils/phi-issuance";
import type { SigilMetadataLite } from "@/app/utils/valuation";

const PHI_DECIMALS = 6n;
const USD_CENTS_DECIMALS = 2n;
const RATE_MICROCENTS_DECIMALS = 6n; // 1 microcent = 1e-6 cent
const POW10_CACHE = new Map<bigint, bigint>();
const WALLET_QUOTE_USD_SAMPLE = 100;
const WALLET_RATE_META = { ip: { expectedCashflowPhi: [] } } as unknown as SigilMetadataLite;

function pow10(decimals: bigint): bigint {
  const hit = POW10_CACHE.get(decimals);
  if (hit) return hit;
  let out = 1n;
  for (let i = 0n; i < decimals; i += 1n) out *= 10n;
  POW10_CACHE.set(decimals, out);
  return out;
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
  const fracRaw = fracPart.toString().padStart(Number(decimals), "0");
  return `${sign}${intPart.toString()}.${fracRaw}`;
}

export function parsePhiToMicro(raw: unknown): bigint | null {
  return parseDecimalToScaled(raw, PHI_DECIMALS);
}

export function parseUsdToCents(raw: unknown): bigint | null {
  return parseDecimalToScaled(raw, USD_CENTS_DECIMALS);
}

export function parseUsdPerPhiToMicrocents(raw: unknown): bigint | null {
  const dollarsPerPhi = parseDecimalToScaled(raw, 8n); // USD with 8dp
  if (dollarsPerPhi == null || dollarsPerPhi <= 0n) return null;
  // dollars * 100 cents * 1e6 microcents / dollar
  return (dollarsPerPhi * 100n * pow10(RATE_MICROCENTS_DECIMALS)) / pow10(8n);
}

/** Canonical deterministic historical display quote. An explicit pulse pins
 * a signed quote without making network latency redefine its denomination. */
export function walletUsdPerPhiMicrocentsAtPulse(pulseInput: string): bigint {
  if (!/^(0|[1-9][0-9]{0,15})$/.test(pulseInput)) throw new Error("wallet_quote_unavailable");
  const pulse = Number(pulseInput);
  if (!Number.isSafeInteger(pulse)) throw new Error("wallet_quote_unavailable");
  const quote = quotePhiForUsd(
    {
      meta: WALLET_RATE_META,
      nowPulse: pulse,
      usd: WALLET_QUOTE_USD_SAMPLE,
      currentStreakDays: 0,
      lifetimeUsdSoFar: 0,
      plannedHoldBeats: 0,
    },
    DEFAULT_ISSUANCE_POLICY,
  );
  const usdPerPhi = quote.usdPerPhi;
  if (!Number.isFinite(usdPerPhi) || usdPerPhi <= 0) {
    throw new Error("wallet_quote_unavailable");
  }
  const parsed = parseUsdPerPhiToMicrocents(usdPerPhi.toFixed(8));
  if (!parsed || parsed <= 0n) {
    throw new Error("wallet_quote_unavailable");
  }
  return parsed;
}

export function walletUsdPerPhiMicrocents(): bigint {
  return walletUsdPerPhiMicrocentsAtPulse(String(Math.floor(momentFromUTC(new Date()).pulse)));
}

const PHI_RATE_DENOM = pow10(PHI_DECIMALS + RATE_MICROCENTS_DECIMALS); // 1e12

export function usdCentsFromPhiMicro(phiMicro: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (phiMicro <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  return (phiMicro * usdPerPhiMicrocents + PHI_RATE_DENOM / 2n) / PHI_RATE_DENOM;
}

export function phiMicroFromUsdCents(usdCents: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (usdCents <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  return (usdCents * PHI_RATE_DENOM + usdPerPhiMicrocents / 2n) / usdPerPhiMicrocents;
}

function trimTrailingZeros(decimalText: string): string {
  if (!decimalText.includes(".")) return decimalText;
  return decimalText.replace(/\.?0+$/, "");
}

export function formatPhiFromMicro(phiMicro: bigint): string {
  return trimTrailingZeros(decimalFromScaled(phiMicro, PHI_DECIMALS));
}

export function formatUsdFromCents(usdCents: bigint): string {
  return decimalFromScaled(usdCents, USD_CENTS_DECIMALS);
}

export function walletQuoteSnapshot(usdPerPhiMicrocents: bigint): {
  usdPerPhi: number;
  phiPerUsd: number;
  usdPerPhiMicrocents: string;
} {
  const usdPerPhi = Number(usdPerPhiMicrocents) / 100_000_000;
  const phiPerUsd = usdPerPhi > 0 ? 1 / usdPerPhi : 0;
  return {
    usdPerPhi,
    phiPerUsd,
    usdPerPhiMicrocents: usdPerPhiMicrocents.toString(),
  };
}

export function bigintFromUnknown(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  return null;
}
