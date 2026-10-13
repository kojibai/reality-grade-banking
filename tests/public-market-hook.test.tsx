// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { usePublicMarket } from '../src/receiz/usePublicMarket';
import { parsePublicMarket } from '../src/receiz/public-market';
const network = vi.hoisted(() => ({ membership: vi.fn(), quotes: vi.fn() }));
vi.mock('../src/receiz/public-market', async original => ({ ...await original<typeof import('../src/receiz/public-market')>(), fetchPublicMarket: network.membership, fetchPublicQuotes: network.quotes }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it('retains previously obtained public charts until refreshed quotes arrive', async () => {
  const input = { ok: true, transport: { publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: 1, revision: 'r1' }, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', valueUsd: 10 }] } };
  const seed = { ...input, snapshot: { ok: true, data: { schema: 'receiz.market.public-snapshot.v1', liveMarkets: [{ itemId: 'a', visibility: 'public', priceUsd: 10, quoteUsdPerPhi: 1, chart: [{ value: 9 }, { value: 10 }] }] } } };
  let resolveMembership!: (value: ReturnType<typeof parsePublicMarket>) => void;
  let resolveQuotes!: (value: unknown) => void;
  network.membership.mockImplementation(() => new Promise(resolve => { resolveMembership = resolve; }));
  network.quotes.mockImplementation(() => new Promise(resolve => { resolveQuotes = resolve; }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(seed))));
  let observed: ReturnType<typeof usePublicMarket> | undefined;
  const host = document.createElement('div'), root = createRoot(host);
  function Probe() { observed = usePublicMarket(); return null; }
  try {
    await act(async () => { root.render(<Probe />); });
    expect(observed?.catalog?.items[0].chart).toEqual([9, 10]);
    await act(async () => { resolveMembership(parsePublicMarket(input)); });
    expect(observed?.catalog?.items[0].chart).toEqual([9, 10]);
    await act(async () => { resolveQuotes(seed.snapshot); });
    expect(observed?.status).toBe('live');
  } finally { act(() => root.unmount()); }
});
