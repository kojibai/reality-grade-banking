import type { SigilMetadataLite } from "@/app/utils/valuation";
import { momentFromUTC } from "@/app/utils/kai_pulse";
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from "@/app/utils/phi-issuance";

export const SPORTS_ARENA_VALUE_USD_PER_BASIS_POINT = 0.0175;
const SPORTS_ARENA_QUOTE_USD_SAMPLE = 100;
const SPORTS_ARENA_VALUE_RATE_META = { ip: { expectedCashflowPhi: [] } } as unknown as SigilMetadataLite;
const SPORTS_ARENA_FALLBACK_USD_PER_PHI = 1 / DEFAULT_ISSUANCE_POLICY.basePhiPerUsd;

function cleanFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function sportsArenaUsdFromValueBasis(valueBasis: number): number {
  return Number((Math.max(0, cleanFinite(valueBasis)) * SPORTS_ARENA_VALUE_USD_PER_BASIS_POINT).toFixed(2));
}

export function sportsArenaSignedUsdCentsFromValueBasis(valueBasis: number): bigint {
  const safe = cleanFinite(valueBasis);
  return BigInt(Math.round(safe * SPORTS_ARENA_VALUE_USD_PER_BASIS_POINT * 100));
}

export function sportsArenaUsdPerPhiAtPulse(pulse: number): number {
  const quote = quotePhiForUsd(
    {
      meta: SPORTS_ARENA_VALUE_RATE_META,
      nowPulse: Math.floor(Math.max(0, cleanFinite(pulse))),
      usd: SPORTS_ARENA_QUOTE_USD_SAMPLE,
      currentStreakDays: 0,
      lifetimeUsdSoFar: 0,
      plannedHoldBeats: 0,
    },
    DEFAULT_ISSUANCE_POLICY,
  );
  return quote.usdPerPhi > 0 && Number.isFinite(quote.usdPerPhi)
    ? quote.usdPerPhi
    : SPORTS_ARENA_FALLBACK_USD_PER_PHI;
}

export function sportsArenaCurrentUsdPerPhi(): number {
  try {
    return sportsArenaUsdPerPhiAtPulse(momentFromUTC(new Date()).pulse);
  } catch {
    return SPORTS_ARENA_FALLBACK_USD_PER_PHI;
  }
}

export function sportsArenaPhiFromUsdValue(usdValue: number, usdPerPhi = sportsArenaCurrentUsdPerPhi()): number {
  const cleanUsd = Math.max(0, cleanFinite(usdValue));
  const cleanRate = cleanFinite(usdPerPhi, SPORTS_ARENA_FALLBACK_USD_PER_PHI);
  if (cleanRate <= 0) return 0;
  return Number((cleanUsd / cleanRate).toFixed(6));
}

export function sportsArenaSignedPhiMicroFromUsdCents(usdCents: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (usdCents === 0n || usdPerPhiMicrocents <= 0n) return 0n;
  const sign = usdCents < 0n ? -1n : 1n;
  const absUsdCents = usdCents < 0n ? -usdCents : usdCents;
  const phiMicro = (absUsdCents * 1_000_000_000_000n + usdPerPhiMicrocents / 2n) / usdPerPhiMicrocents;
  return sign * phiMicro;
}
