// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { usePublicNetwork } from '../src/receiz/usePublicNetwork';
import { parsePublicNetworkPage, type PublicSource } from '../src/receiz/public-network';
const network = vi.hoisted(() => ({ read: vi.fn() }));
const cache = vi.hoisted(() => ({ load: vi.fn(), seed: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/public-network', async original => ({ ...await original<typeof import('../src/receiz/public-network')>(), readPublicNetworkPage: network.read }));
vi.mock('../src/receiz/public-network-cache', () => ({ loadPublicNetworkCache: cache.load, loadPublicNetworkSeed: cache.seed, savePublicNetworkCache: cache.save }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => { network.read.mockReset(); cache.load.mockReset().mockResolvedValue(null); cache.seed.mockReset().mockResolvedValue(null); cache.save.mockReset().mockResolvedValue(undefined); });
function page(source: PublicSource, ids: string[] = [], cursor: string | null = null) {
  return { source, records: parsePublicNetworkPage('actions', { ok: true, actions: ids.map(id => ({ id, actionKind: 'record', summary: `Record ${id}`, pulse: 100 })), nextCursor: cursor }).records.map(item => ({ ...item, source, id: `${source}:${item.sourceId}` })), nextCursor: cursor, total: null, complete: cursor === null };
}
async function observe(run: (read: () => ReturnType<typeof usePublicNetwork>) => Promise<void>) {
  let state!: ReturnType<typeof usePublicNetwork>; const root = createRoot(document.createElement('div'));
  function Probe() { state = usePublicNetwork(); return null; }
  try { await act(async () => { root.render(<Probe />); }); await run(() => state); } finally { act(() => root.unmount()); }
}
it('updates other public sources when one is unavailable', async () => {
  network.read.mockImplementation(async (source: PublicSource) => { if (source === 'wallet') throw new Error('Unavailable'); return page(source, [source]); });
  await observe(async read => { expect(read().records).toHaveLength(3); expect(read().sources.wallet.status).toBe('error'); expect(read().sources.actions.status).toBe('live'); });
});
it('stops repeated source cursors instead of looping forever', async () => {
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['older'] : ['head'], '42') : page(source));
  await observe(async read => { await act(async () => { await read().loadMore(); }); expect(read().sources.actions.error).toContain('cursor'); const calls = network.read.mock.calls.length; await act(async () => { await read().loadMore(); }); expect(network.read.mock.calls.length).toBe(calls); });
});
it('head refresh preserves historical records and the in-progress older cursor', async () => {
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['older'] : ['head'], cursor ? '20' : '42') : page(source));
  await observe(async read => { await act(async () => { await read().loadMore(); }); await act(async () => { await read().refresh(); }); expect(read().records.some(item => item.sourceId === 'older')).toBe(true); expect(read().sources.actions.cursor).toBe('20'); });
});
it('fills the gap between an incomplete recent cache and the complete public seed', async () => {
  cache.load.mockResolvedValue({ records: page('actions', ['head']).records, capturedAt: null, coverage: [{ source: 'actions', complete: false }] });
  cache.seed.mockResolvedValue({ records: page('actions', ['older']).records, capturedAt: null, coverage: [{ source: 'actions', complete: true }] });
  network.read.mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['gap', 'older'] : ['head'], cursor ? null : '42') : page(source));
  await observe(async read => { expect(read().records.map(item => item.sourceId)).toEqual(expect.arrayContaining(['head', 'gap', 'older'])); expect(read().sources.actions.complete).toBe(true); });
});

it('persists the complete anchor separately so interrupted catch-up resumes after reload', async () => {
  vi.useFakeTimers();
  try {
    const seed = { records: page('actions', ['old']).records, capturedAt: null, coverage: [{ source: 'actions', complete: true }] };
    cache.seed.mockResolvedValue(seed);
    network.read.mockImplementation(async (source: PublicSource, cursor?: string) => {
      if (source !== 'actions') return page(source);
      if (cursor) throw new Error('Interrupted');
      return page(source, ['new'], 'gap');
    });
    await observe(async read => {
      expect(read().sources.actions.status).toBe('stale');
      await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    });
    const saved = structuredClone(cache.save.mock.calls.at(-1)![0]);
    cache.load.mockResolvedValue(saved);
    network.read.mockClear().mockImplementation(async (source: PublicSource, cursor?: string) => source === 'actions' ? page(source, cursor ? ['missing', 'old'] : ['new'], cursor ? null : 'gap') : page(source));
    await observe(async read => {
      expect(read().records.map(row => row.sourceId)).toEqual(expect.arrayContaining(['new', 'missing', 'old']));
      expect(read().sources.actions.status).toBe('live');
      expect(network.read.mock.calls.some(([source, cursor]) => source === 'actions' && cursor === 'gap')).toBe(true);
    });
  } finally { vi.useRealTimers(); }
});
