import { CHART_PERIODS, sampleChartIndices, type ChartPeriod } from '../../core/chart-history';
import type { MarketCapSource } from './source';
import { marketPeriodPulses, marketPulseTime } from './coordinates';
export interface CapitalizationPoint { at: string; pulse: number; usdCents: string; }
export type MarketCapSummary = Omit<MarketCapSource, 'valueRows'>;
export interface MarketHistorySnapshot {
  schema: 'bank.public-market-history.v1';
  basisSha256: string;
  summary: MarketCapSummary;
  series: Record<ChartPeriod, CapitalizationPoint[]>;
}
/** Public chart retention is display data; this digest grants no proof authority. */
export async function marketHistoryBasis(source: MarketCapSource): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ first: source.firstIssuancePulse, rows: source.valueRows }));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export function marketCapSummary(source: MarketCapSource): MarketCapSummary {
  const { valueRows: _rows, ...summary } = source; return summary;
}
export function parseMarketHistory(input: unknown): MarketHistorySnapshot {
  const value = input as MarketHistorySnapshot | null, summary = value?.summary;
  if (value?.schema !== 'bank.public-market-history.v1' || !/^[a-f0-9]{64}$/.test(value.basisSha256) || !summary || summary.schema !== 'receiz.proof_graph.market_cap_projection.v1' || summary.source !== 'market-desk-live-assets.sum + single-card-current-live-value-proof.sum' || !/^[a-f0-9]{64}$/.test(summary.proofObjectHash) || !Number.isFinite(Date.parse(summary.generatedAt)) || !Number.isSafeInteger(summary.firstIssuancePulse) || summary.firstIssuancePulse < 0 || !Number.isSafeInteger(summary.serverPulse) || summary.serverPulse < summary.firstIssuancePulse || summary.serverPulse > 1e10 || !Number.isFinite(summary.currentUsd) || summary.currentUsd < 0 || summary.currentUsd > 1e13 || ![summary.cardsInCirculation, summary.sportsCardsPriced, summary.marketAssetsPriced].every(n => Number.isSafeInteger(n) && n >= 0) || !value.series) throw new Error('Public market chart retention is invalid.');
  if (summary.sportsCardsPriced > summary.cardsInCirculation || summary.marketAssetsPriced + summary.sportsCardsPriced > 10000) throw new Error('Public market chart coverage is invalid.');
  for (const period of CHART_PERIODS) {
    const points = value.series[period];
    if (!Array.isArray(points) || points.length < 1 || points.length > 96 || points[0].pulse !== marketPeriodPulses(summary, period)[0] || points.at(-1)!.pulse !== summary.serverPulse || points.at(-1)!.usdCents !== String(Math.round(summary.currentUsd * 100))) throw new Error('Public market chart interval is incomplete.');
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!Number.isSafeInteger(point.pulse) || point.pulse < summary.firstIssuancePulse || point.pulse > summary.serverPulse || i > 0 && point.pulse <= points[i - 1].pulse || !/^(0|[1-9]\d{0,15})$/.test(point.usdCents) || Date.parse(point.at) !== marketPulseTime(point.pulse)) throw new Error('Public market chart point is invalid.');
    }
    if (period === 'ALL' && points[0].pulse !== summary.firstIssuancePulse) throw new Error('Public market chart issuance point is missing.');
  }
  return value;
}
export function retainMarketInterval(points: CapitalizationPoint[], first: CapitalizationPoint, last: CapitalizationPoint): CapitalizationPoint[] {
  const merged = [first, ...points.filter(point => point.pulse > first.pulse && point.pulse < last.pulse), ...(last.pulse === first.pulse ? [] : [last])];
  return sampleChartIndices(merged.map(point => Number(point.usdCents)), 96).map(index => merged[index]);
}
