import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { CHART_PERIODS } from '../src/core/chart-history';
import { parseMarketCapSource } from '../src/receiz/market-projection/source';
import { marketHistoryBasis, parseMarketHistory } from '../src/receiz/market-projection/history';
import { buildMarketHistory } from '../src/receiz/market-projection/build-history';
import { marketPeriodPulses } from '../src/receiz/market-projection/coordinates';
const calculate = vi.hoisted(() => vi.fn((source: { serverPulse: number; currentUsd: number }, pulse: number) => pulse === source.serverPulse ? source.currentUsd : pulse));
vi.mock('../src/receiz/market-projection/project', async () => { const coordinates = await import('../src/receiz/market-projection/coordinates'); return { marketCapUsdAtPulse: calculate, ...coordinates }; });
const seed = parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
const shipped = parseMarketHistory(JSON.parse(readFileSync(new URL('../public/receiz-public-chart-history.json', import.meta.url), 'utf8')));
it('ships all six complete genuine public intervals before any network read or worker result', async () => {
  expect(shipped.basisSha256).toBe(await marketHistoryBasis(seed));
  for (const period of CHART_PERIODS) {
    expect(shipped.series[period]).toHaveLength(64);
    expect(shipped.series[period][0].pulse).toBe(marketPeriodPulses(seed, period)[0]);
    expect(shipped.series[period].at(-1)?.usdCents).toBe('43777330099');
  }
  expect(shipped.series.ALL[0].usdCents).toBe('43067764366');
});
it('refreshes a constant public valuation basis without rebuilding historic samples', async () => {
  calculate.mockClear(); const source = { ...seed, serverPulse: seed.serverPulse + 60, currentUsd: seed.currentUsd + 100 };
  const updated = (await buildMarketHistory(source, shipped))!;
  expect(calculate.mock.calls.length).toBeLessThanOrEqual(6);
  for (const period of CHART_PERIODS) {
    expect(updated.series[period][0].pulse).toBe(marketPeriodPulses(source, period)[0]);
    expect(updated.series[period].at(-1)?.usdCents).toBe(String(Math.round(source.currentUsd * 100)));
    expect(updated.series[period].some(point => point.pulse === shipped.series[period][20].pulse && point.usdCents === shipped.series[period][20].usdCents)).toBe(true);
  }
  expect(() => parseMarketHistory(updated)).not.toThrow();
});
it('rebuilds all ranges when a public asset valuation basis changes', async () => {
  calculate.mockClear(); const source = structuredClone(seed); source.valueRows[0].scoreDelta += 1;
  const rebuilt = (await buildMarketHistory(source, shipped))!;
  expect(rebuilt.basisSha256).not.toBe(shipped.basisSha256); expect(calculate.mock.calls.length).toBeGreaterThan(100);
  for (const period of CHART_PERIODS) expect(rebuilt.series[period]).toHaveLength(64);
});
it('rejects stale endpoints, missing ranges, wrong pulse labels and malformed retained values', () => {
  const corrupted = structuredClone(shipped); corrupted.series['1D'][0].at = '2026-01-01T00:00:00Z';
  expect(() => parseMarketHistory(corrupted)).toThrow();
  expect(() => parseMarketHistory({ ...shipped, series: { ALL: shipped.series.ALL } })).toThrow();
  const bad = structuredClone(shipped); bad.series.ALL.at(-1)!.usdCents = 'NaN'; expect(() => parseMarketHistory(bad)).toThrow();
});
it('rejects public chart coverage that exceeds circulation or the source row limit', () => {
  expect(() => parseMarketHistory({ ...shipped, summary: { ...shipped.summary, cardsInCirculation: 0 } })).toThrow();
  expect(() => parseMarketHistory({ ...shipped, summary: { ...shipped.summary, marketAssetsPriced: 1e14 } })).toThrow();
});
