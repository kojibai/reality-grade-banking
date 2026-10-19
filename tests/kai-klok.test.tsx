// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { KaiKlok } from '../src/components/KaiKlok';
import { projectKaiKlok } from '../src/components/kai-klok';
import { GENESIS_TS, N_DAY_MICRO, epochMsFromPulse } from '../native/receiz/app/utils/kai_pulse';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  act(() => root.render(<KaiKlok />));
  return host;
}

it('matches the exact Mind whole-pulse display, names, and moment color identities', () => {
  const moment = projectKaiKlok(14_717_707);
  expect(moment).toMatchObject({ time: '15:23:06', day: 2, month: 5, year: '2', weekday: 'Aquaris', monthName: 'Kaelus', phase: 'Harmonization', dayColor: '#ff8a3d', monthColor: '#1E90FF', phaseColor: '#ffd600' });
  expect(projectKaiKlok(0)).toMatchObject({ time: '00:00:00', day: 1, month: 1, year: '0', weekday: 'Solhara', monthName: 'Aethon', phase: 'Initialization' });
});

it('retains the exact closure boundary and the zero-based Kai year', () => {
  const firstPulseOfDay = (day: bigint) => Number((day * N_DAY_MICRO + 999_999n) / 1_000_000n);
  expect(projectKaiKlok(firstPulseOfDay(42n) - 1)).toMatchObject({ day: 42, month: 1, year: '0' });
  expect(projectKaiKlok(firstPulseOfDay(42n))).toMatchObject({ day: 1, month: 2, year: '0', monthName: 'Virelai' });
  expect(projectKaiKlok(firstPulseOfDay(336n))).toMatchObject({ day: 1, month: 1, year: '1' });
  expect(projectKaiKlok(firstPulseOfDay(294n))).toMatchObject({ monthName: 'Liora', monthColor: '#00C2FF', monthSwatch: 'linear-gradient(135deg,#00C2FF 0%,#A855F7 48%,#F59E0B 100%)' });
});

it('opens a live, named Kai Klok explanation without requesting any network or account state', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const host = mount(), trigger = host.querySelector('button')!;
  expect(trigger.textContent).toContain('14,717,707');
  expect(trigger.textContent).toContain('D2'); expect(trigger.textContent).toContain('M5'); expect(trigger.textContent).toContain('Y2');
  act(() => trigger.click());
  const panel = host.querySelector('[role="dialog"]')!;
  expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
  expect(panel.textContent).toContain('Kai-Klok KKSv1');
  expect(panel.textContent).toContain('Aquaris'); expect(panel.textContent).toContain('Kaelus');
  expect(panel.textContent).toContain('36 beats'); expect(panel.textContent).toContain('44 steps'); expect(panel.textContent).toContain('11 pulses');
  act(() => vi.advanceTimersByTime(5_240));
  expect(trigger.textContent).toContain('14,717,708'); expect(panel.textContent).toContain('14,717,708');
  expect(fetch).not.toHaveBeenCalled();
  act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('stops hidden work and recomputes from the canonical bridge after a suspended page resumes', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(GENESIS_TS + 2);
  let visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState);
  const host = mount();
  expect(host.querySelector('button')!.textContent).toContain('00:00:00');
  act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(vi.getTimerCount()).toBe(0);
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(host.querySelector('button')!.textContent).toContain('14,717,707');
  expect(vi.getTimerCount()).toBe(1);
});

it('dismisses the nonmodal explanation when keyboard focus leaves it without stealing focus', () => {
  const host = mount(), outside = document.createElement('button'); document.body.append(outside);
  act(() => host.querySelector('button')!.click());
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  act(() => outside.focus());
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
});

it('keeps the verified Kai Klok repository reference inside the deeper system disclosure', () => {
  const host = mount();
  act(() => host.querySelector('button')!.click());
  const reference = host.querySelector('a[href="https://github.com/kojibai/klok"]');
  expect(reference).not.toBeNull();
  expect(reference?.closest('details')?.open).toBe(false);
  expect(reference?.textContent).toContain('Kai Klok technical reference');
  expect(reference?.getAttribute('rel')).toContain('noopener');
  expect(host.querySelector('.kai-header-button a')).toBeNull();
});
