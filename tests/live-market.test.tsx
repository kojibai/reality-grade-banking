// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { BankContext } from '../src/core/useBank';
import { createDemoState } from '../src/core/demo';
import { Market } from '../src/features/market/Market';
import { parsePublicMarket } from '../src/receiz/public-market';

const source = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../src/receiz/usePublicMarket', () => ({ usePublicMarket: () => source.value }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount()); document.body.replaceChildren(); history.replaceState({}, '', '#market'); });
function mount() {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  const commit = vi.fn(), open = vi.fn();
  const state = createDemoState();
  act(() => root.render(<BankContext.Provider value={{ state, commit, open, close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Market /></BankContext.Provider>));
  return { host, root, commit, open };
}
function catalog(count = 1001) { return parsePublicMarket({ ok: true, transport: { generatedAt: '2026-10-13T12:00:00Z', publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: count, revision: 'r1' }, publicOriginals: Array.from({ length: count }, (_, i) => ({ id: `public-${i}`, receizId: `asset-${i}`, title: `Public object ${i}`, valueUsd: 5, canonicalHref: `/alice/verified/asset-${i}` })) } }); }
it('searches the whole public catalog beyond one thousand while rendering a bounded initial list', () => {
  source.value = { catalog: catalog(), status: 'live', error: null, refresh: vi.fn() };
  const { host } = mount();
  expect(host.textContent).toContain('1,001 assets');
  expect(host.querySelectorAll('.market-rows .asset-row').length).toBeLessThanOrEqual(50);
  const input = host.querySelector('input')!;
  act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, 'Public object 1000'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(host.textContent).toContain('Public object 1000');
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);
});
it('opens public source details without routing a public object into demo ownership or trades', () => {
  source.value = { catalog: catalog(1), status: 'live', error: null, refresh: vi.fn() };
  const { host, commit, open } = mount();
  act(() => (host.querySelector('.market-rows button') as HTMLButtonElement).click());
  expect(host.querySelector('dialog')?.textContent).toContain('Public source');
  expect(commit).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  expect(host.querySelector('dialog')?.textContent).not.toContain('Preview purchase');
});
it('never falls back to sample assets when the live public source fails', () => {
  source.value = { catalog: null, status: 'error', error: 'Source unavailable', refresh: vi.fn() };
  const { host } = mount();
  expect(host.textContent).toContain('Source unavailable');
  expect(host.textContent).not.toContain('Design archive');
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(0);
});
it('removes objects on full refresh and does not synthesize a chart from a single value', () => {
  source.value = { catalog: catalog(2), status: 'live', error: null, refresh: vi.fn() };
  const { host, root } = mount();
  expect(host.querySelectorAll('.value-chart')).toHaveLength(0);
  source.value = { ...source.value, catalog: catalog(1) };
  act(() => root.render(<BankContext.Provider value={{ state: createDemoState(), commit: vi.fn(), open: vi.fn(), close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Market /></BankContext.Provider>));
  expect(host.querySelectorAll('.market-rows .asset-row')).toHaveLength(1);
});
