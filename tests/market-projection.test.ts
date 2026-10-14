import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseMarketCapSource } from '../src/receiz/market-projection/source';
import { marketCapUsdAtPulse, marketPeriodPulses, marketPulseTime } from '../src/receiz/market-projection/project';
const input = JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8'));
const seed = parseMarketCapSource(input);
it('matches independently replayed v129 host Proof Graph values, including all sports rows', () => {
  // Golden outputs independently computed with the actual Receiz host module on this public capture.
  expect(seed.valueRows).toHaveLength(2933); expect(seed.sportsCardsPriced).toBe(1942); expect(seed.cardsInCirculation).toBe(6843);
  expect(marketCapUsdAtPulse(seed, 12053235)).toBe(430677643.6616);
  expect(marketCapUsdAtPulse(seed, 14646306)).toBe(439575532.0109);
  expect(marketCapUsdAtPulse(seed, 14647305)).toBe(437768951.0266);
  expect(marketCapUsdAtPulse(seed, seed.serverPulse)).toBe(437773300.9889);
});
it('samples each requested interval anew with exact first issuance and current endpoints', () => {
  const all = marketPeriodPulses(seed, 'ALL'), day = marketPeriodPulses(seed, '1D'), week = marketPeriodPulses(seed, '1W');
  expect(all[0]).toBe(seed.firstIssuancePulse); expect(day[0]).toBeGreaterThan(week[0]); expect(week[0]).toBeGreaterThan(all[0]);
  expect(all.at(-1)).toBe(seed.serverPulse); expect(day.at(-1)).toBe(seed.serverPulse);
  expect(marketPulseTime(seed.serverPulse) - marketPulseTime(day[0])).toBeCloseTo(86400000, -4);
  expect(all).toHaveLength(64); expect(new Set(all).size).toBe(64);
});
it('refuses missing, duplicate, malformed and nonpublic row sources before projection', () => {
  expect(() => parseMarketCapSource({ ...input, marketCapProjection: { ...seed, valueRows: seed.valueRows.slice(1) } })).toThrow();
  expect(() => parseMarketCapSource({ ...input, marketCapProjection: { ...seed, valueRows: [seed.valueRows[0], ...seed.valueRows.slice(0, -1)] } })).toThrow();
  expect(() => marketCapUsdAtPulse(seed, seed.firstIssuancePulse - 1)).toThrow();
  expect(() => parseMarketCapSource({ ok: false, marketCapProjection: seed })).toThrow();
});
