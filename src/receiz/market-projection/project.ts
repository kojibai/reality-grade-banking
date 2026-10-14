import { computeIntrinsicUnsigned, type SigilMetadataLite } from '@receiz/sdk/valuation';
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from '../canonical-market-issuance';
import type { MarketCapSource, MarketValueRow } from './source';
import type { ChartPeriod } from '../../core/chart-history';
// Canonical public Proof Graph display rules from the v129 Receiz host.
// This projection does not assert historic membership or actual transaction prices.
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const round = (n: number, places = 4) => Number(n.toFixed(places));
const roundPhi = (n: number) => Math.round(n * 1e6) / 1e6;
function hash(input: string) { let h = 2166136261; for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619); return h >>> 0; }
const rateMeta = { ip: { expectedCashflowPhi: [] } } as unknown as SigilMetadataLite;
function rate(pulse: number, meta = rateMeta, computed?: ReturnType<typeof computeIntrinsicUnsigned>) { const quote = quotePhiForUsd({ meta, nowPulse: pulse, usd: 100, currentStreakDays: 0, lifetimeUsdSoFar: 0, plannedHoldBeats: 0 }, DEFAULT_ISSUANCE_POLICY, computed); if (!Number.isFinite(quote.usdPerPhi) || quote.usdPerPhi <= 0) throw new Error('Public valuation quote is unavailable.'); return quote.usdPerPhi; }
function marketValue(row: MarketValueRow, pulse: number, usdPerPhi: number): number {
  const item = row.marketItem!; let phi: number;
  if (item.livePulseSeed?.kind === 'sigil') {
    const seed = item.livePulseSeed, meta = { pulse: seed.claimPulse, kaiPulse: seed.claimPulse, beat: seed.beat, stepIndex: seed.stepIndex, stepsPerBeat: 44, quality: 'high', creatorVerified: seed.creatorVerified, creatorRep: 0, chakraDay: seed.chakraDay ?? undefined, kaiSignature: seed.kaiSignature ?? undefined, userPhiKey: seed.userPhiKey ?? undefined } as SigilMetadataLite;
    const p = Math.max(seed.claimPulse, pulse);
    const computed = computeIntrinsicUnsigned(meta, p);
    phi = Math.max(.000001, roundPhi(computed.unsigned.valuePhi)); usdPerPhi = rate(p, meta, computed);
  } else {
    const base = Math.max(.000001, item.pricePhi || item.priceUsd / Math.max(item.quoteUsdPerPhi, 1)), key = item.pricingSourceKey || item.id;
    const wave = Math.sin(pulse * .173 + hash(`${key}:pulse-a`) % 6283 / 1000) * .56 + Math.cos(pulse * .071 + hash(`${key}:pulse-b`) % 6283 / 1000) * .31 + Math.sin(pulse * .287 + hash(`${key}:pulse-c`) % 6283 / 1000) * .13;
    const amplitude = item.source === 'asset-seal' ? clamp(.008 + Math.abs(item.changePct) / 420, .008, .028) : clamp(.0045 + Math.abs(item.changePct) / 620, .0045, .018);
    phi = Math.max(.000001, roundPhi(base * (1 + wave * amplitude)));
  }
  return Math.round(phi * usdPerPhi * 100) / 100;
}
function sportsValue(row: MarketValueRow, pulse: number, quoteMove: number): number {
  const base = row.baseUsdValue; if (base <= 0 || row.proofTotalValueUsd <= 0) return 0;
  const signal = (hash(`card:${row.seed}`) % 1e6) / 1e6;
  const wave = (Math.sin((pulse + signal * 987) * .19) + 1) / 2, drift = (Math.sin((pulse + signal * 421) * .047) + 1) / 2, trend = (Math.sin((pulse + signal * 193) * .083) + 1) / 2;
  const pressure = round(base * clamp((row.marketUsdValue - base) / base, 0, .18) * .22);
  const carry = base * (.001 + quoteMove * .008 + wave * .0038 + drift * .0014 + trend * .0011 + clamp(Math.max(0, row.scoreDelta) * .0012, 0, .018) + clamp(Math.max(0, base - row.birthUsdValue) / base, 0, .12) * .028) + pressure;
  const live = round(base + round(Math.max(.0001, carry)));
  return round(row.proofTotalValueUsd * live / base);
}
export function marketCapUsdAtPulse(seed: MarketCapSource, pulse: number): number {
  if (!Number.isSafeInteger(pulse) || pulse < seed.firstIssuancePulse) throw new Error('Market projection pulse outside its issuance range.');
  if (pulse === seed.serverPulse) return round(seed.currentUsd);
  const quote = rate(pulse), previous = rate(Math.max(0, pulse - 1)), quoteMove = Math.abs(quote - previous) / previous;
  return round(seed.valueRows.reduce((sum, row) => sum + (row.source === 'market-desk-live-asset' ? marketValue(row, pulse, quote) : sportsValue(row, pulse, quoteMove)), 0));
}
// Same phi-exact UTC presentation bridge as Receiz. UTC is a label, never proof authority.
const T_NUM = 5236067977499789696409173668731276235440618359611525724270897245n, T_DEN = 10n ** 60n;
export function marketPulseTime(pulse: number): number { const n = BigInt(pulse) * T_NUM, q = n / T_DEN, r = n % T_DEN; return Number(1715323541888n + q + (r * 2n > T_DEN || r * 2n === T_DEN && q % 2n === 1n ? 1n : 0n)); }
const daySpans = { '1D': 1, '1W': 7, '1M': 31, '3M': 93, '1Y': 366 };
export function marketPeriodPulses(seed: MarketCapSource, period: ChartPeriod, count = 64): number[] {
  const last = seed.serverPulse, span = period === 'ALL' ? last - seed.firstIssuancePulse : Math.ceil(daySpans[period] * 86400000 / (3 + Math.sqrt(5)) / 1000), first = Math.max(seed.firstIssuancePulse, last - span);
  const size = Math.min(count, last - first + 1);
  return Array.from({ length: size }, (_, i) => size === 1 ? last : Math.round(first + (last - first) * i / (size - 1)));
}
export function projectMarketPeriod(seed: MarketCapSource, period: ChartPeriod) { return marketPeriodPulses(seed, period).map(pulse => ({ at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents: String(Math.round(marketCapUsdAtPulse(seed, pulse) * 100)) })); }
