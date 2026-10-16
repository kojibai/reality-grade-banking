// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Ledger } from '../src/features/ledger/Ledger';
import { BankContext } from '../src/core/useBank';
import { createDemoState } from '../src/core/demo';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
const network = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../src/receiz/usePublicNetwork', () => ({ usePublicNetwork: () => network.state }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals(); });
function mount() {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  act(() => root.render(<BankContext.Provider value={{ state: createDemoState(), commit: vi.fn(), open: vi.fn(), close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Ledger /></BankContext.Provider>)); return host;
}
function feed(count = 100) { return { records: parsePublicNetworkPage('actions', { ok: true, actions: Array.from({ length: count }, (_, i) => ({ id: String(i), actionKind: 'record', summary: `Public source ${i}`, pulse: i + 1 })), nextCursor: null }).records, sources: {}, bootstrap: false, refresh: vi.fn(), loadMore: vi.fn(), capturedAt: null }; }
it('opens the public activity feed without simulated bank receipts', () => {
  network.state = feed(); const host = mount(); expect(host.textContent).toContain('Public source'); expect(host.textContent).not.toContain('Demo social ledger'); expect(host.textContent).not.toContain('Design archive');
});
it('keeps an unopened identity personal history separate from the public feed and demo', () => {
  network.state = feed(); const host = mount(); act(() => [...host.querySelectorAll('button')].find(button => button.textContent === 'My history')!.click());
  expect(host.textContent).toContain('Open your account'); expect(host.textContent).not.toContain('Public source 99'); expect(host.textContent).not.toContain('Demo receipt');
});
it('appends visible rows automatically before the list end', () => {
  let reveal: ((items: { isIntersecting: boolean }[]) => void) | undefined;
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof reveal) { reveal = callback; } observe() {} disconnect() {} });
  network.state = feed(); const host = mount(); expect(host.querySelectorAll('.ledger-event')).toHaveLength(50);
  act(() => reveal!([{ isIntersecting: true }])); expect(host.querySelectorAll('.ledger-event')).toHaveLength(100);
});
