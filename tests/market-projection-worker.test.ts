import { beforeAll, expect, it, vi } from 'vitest';
vi.mock('../src/receiz/market-projection/source', () => ({ parseMarketCapSource: (value: { marketCapProjection: unknown }) => value.marketCapProjection }));
vi.mock('../src/receiz/market-projection/project', () => ({ marketPeriodPulses: (seed: { serverPulse: number }) => [seed.serverPulse], marketPulseTime: () => 1792000000000, marketCapUsdAtPulse: (seed: { currentUsd: number }) => seed.currentUsd }));
const host = { onmessage: null as unknown as (event: { data: Record<string, unknown> }) => Promise<void>, postMessage: vi.fn() };
beforeAll(async () => { vi.stubGlobal('self', host); await import('../src/receiz/market-projection/worker'); });
it('does not cache an obsolete source after a newer source clears the worker cache', async () => {
  const first = host.onmessage({ data: { id: 1, period: 'ALL', source: { marketCapProjection: { serverPulse: 100, currentUsd: 10 } } } });
  const second = host.onmessage({ data: { id: 2, period: '1D', source: { marketCapProjection: { serverPulse: 200, currentUsd: 20 } } } });
  await Promise.all([first, second]); host.postMessage.mockClear();
  await host.onmessage({ data: { id: 3, period: 'ALL' } });
  expect(host.postMessage.mock.calls.at(-1)?.[0].points[0]).toMatchObject({ pulse: 200, usdCents: '2000' });
});
it('explicit cancellation prevents the old job from caching its final sample', async () => {
  const work = host.onmessage({ data: { id: 4, period: 'ALL', source: { marketCapProjection: { serverPulse: 300, currentUsd: 30 } } } });
  await host.onmessage({ data: { id: 5, cancel: true } }); await work;
  host.postMessage.mockClear(); await host.onmessage({ data: { id: 6, period: 'ALL', source: { marketCapProjection: { serverPulse: 400, currentUsd: 40 } } } });
  expect(host.postMessage.mock.calls.at(-1)?.[0].points[0]).toMatchObject({ pulse: 400, usdCents: '4000' });
});
