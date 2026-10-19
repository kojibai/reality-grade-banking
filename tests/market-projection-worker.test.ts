import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
const build = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/market-projection/source', () => ({ parseMarketCapSource: (value: { marketCapProjection: unknown }) => value.marketCapProjection }));
vi.mock('../src/receiz/market-projection/history', () => ({ parseMarketHistory: (value: unknown) => value }));
vi.mock('../src/receiz/market-projection/build-history', () => ({ buildMarketHistory: build }));
const host = { onmessage: null as unknown as (event: { data: Record<string, unknown> }) => Promise<void>, postMessage: vi.fn() };
beforeAll(async () => { vi.stubGlobal('self', host); await import('../src/receiz/market-projection/worker'); });
beforeEach(() => { build.mockReset(); host.postMessage.mockClear(); });
it('publishes only the complete latest snapshot when an older source finishes late', async () => {
  let finish!: (value: unknown) => void;
  build.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ marker: 'new' });
  const first = host.onmessage({ data: { id: 1, source: { marketCapProjection: { serverPulse: 100 } }, history: { marker: 'seed' } } });
  await host.onmessage({ data: { id: 2, source: { marketCapProjection: { serverPulse: 200 } } } });
  finish({ marker: 'old' }); await first;
  expect(host.postMessage.mock.calls).toEqual([[{ id: 2, history: { marker: 'new' } }]]);
  build.mockResolvedValueOnce({ marker: 'newer' });
  await host.onmessage({ data: { id: 3, source: { marketCapProjection: { serverPulse: 300 } } } });
  expect(build.mock.calls.at(-1)?.[1]).toEqual({ marker: 'new' });
});
it('cancellation prevents obsolete work from replacing complete retained curves', async () => {
  let finish!: (value: unknown) => void;
  build.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const work = host.onmessage({ data: { id: 4, source: { marketCapProjection: {} } } });
  await host.onmessage({ data: { id: 5, cancel: true } }); finish({ marker: 'cancelled' }); await work;
  expect(host.postMessage).not.toHaveBeenCalled();
});
it('a failed rebuild reports failure without sending an empty or partial curve', async () => {
  build.mockRejectedValueOnce(new Error('fixture failure'));
  await host.onmessage({ data: { id: 6, source: { marketCapProjection: {} } } });
  expect(host.postMessage.mock.calls).toEqual([[{ id: 6, error: 'Projected market history is unavailable.' }]]);
});
it('acknowledges a retained newer snapshot so the queue can accept fresh operands',async()=>{
 build.mockResolvedValueOnce(null);
 await host.onmessage({data:{id:7,source:{marketCapProjection:{serverPulse:100}},history:{marker:'newer-retained'}}});
 expect(host.postMessage.mock.calls).toEqual([[{id:7,retained:true}]]);
 build.mockResolvedValueOnce({marker:'fresh'});
 await host.onmessage({data:{id:8,source:{marketCapProjection:{serverPulse:300}}}});
 expect(host.postMessage.mock.calls.at(-1)).toEqual([{id:8,history:{marker:'fresh'}}]);
});
