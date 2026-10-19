// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { KaiKlok } from '../src/components/KaiKlok';
import { projectKaiKlok } from '../src/components/kai-klok';
import { GENESIS_TS, N_DAY_MICRO, epochMsFromPulse } from '../native/receiz/app/utils/kai_pulse';
import { projectCanonicalKaiFace, kaiBoundary } from '../src/components/kai-klok-face';
import { BANK_KAI_PALETTE } from '../src/components/kai-klok-palette';

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
  expect(trigger.textContent).not.toMatch(/kai klok/i);
  act(() => trigger.click());
  const panel = host.querySelector('[role="dialog"]')!;
  expect(panel.textContent).toContain('1 / (3 + √5) Hz');
  expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
  expect(panel.textContent).toContain('Kai-Klok KKSv1');
  expect(panel.textContent).toContain('Aquaris'); expect(panel.textContent).toContain('Kaelus');
  expect(panel.textContent).toContain('36 beats'); expect(panel.textContent).toContain('44 steps'); expect(panel.textContent).toContain('11 pulses');
  expect(panel.querySelector('.center-pulse')?.textContent).toBe('15:23:06');
  expect(panel.querySelector('.center-coordinate-label')?.textContent).toBe('BEAT · STEP · PULSE');
  expect(panel.textContent).not.toMatch(/solar (?:time|reference|ark)|sunrise|greenwich|time reference/i);
  expect(panel.querySelector('.kai-local-time time')?.getAttribute('datetime')).toBe(new Date(Number(epochMsFromPulse(14_717_707n))).toISOString());
  const momentEntries = [...panel.querySelectorAll('.kai-moment-identity > div')].map(entry => entry.textContent);
  expect(momentEntries.map(text => text?.split(' ')[0])).toEqual(['Phase', 'Day', 'Week', 'Month']);
  expect(panel.querySelector('[aria-label="Kai days"] [aria-current]')?.textContent).toContain('Aquaris');
  expect(panel.querySelector('[aria-label="Kai months"] [aria-current]')?.textContent).toContain('Kaelus');
  expect(panel.querySelector('[aria-label="Kai phases"] [aria-current]')?.textContent).toContain('Harmonization');
  expect(panel.querySelector('.kai-moment-identity > div')?.textContent).toBe('Phase 3 of 6Harmonization');
  const headings = [...panel.querySelectorAll('.kai-technical h3')].map(node => node.textContent);
  expect(headings.indexOf('Operational phases')).toBeLessThan(headings.indexOf('Days'));
  expect(panel.querySelector('.kai-face-arcs [aria-current]')?.textContent).toBe('Harmonization');
  expect(panel.querySelector('.kai-face-key')?.textContent).not.toContain('Eternal Kai');
  act(() => vi.advanceTimersByTime(5_240));
  expect(trigger.textContent).toContain('14,717,708'); expect(panel.querySelector('[data-kai-eternal-pulse]')?.textContent).toBe('14,717,708');
  expect(panel.querySelector('.kai-face-global dt')?.textContent).toBe('☤KAI');
  expect(panel.querySelector('.kai-face-readouts')?.textContent).toContain(new Intl.NumberFormat('en-US').format(projectCanonicalKaiFace(14_717_708).canonical.eternalDayPulse));
  expect(panel.querySelector('.center-pulse')?.textContent).toBe('15:23:07');
  expect(host.querySelector('.kai-klok')?.getAttribute('data-kai-boundary')).toBe('pulse');
  expect(fetch).not.toHaveBeenCalled();
  act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('feeds the face only the exact native eternal state', () => {
  const face = projectCanonicalKaiFace(14_717_707);
  expect(face.kaiPulseEternal).toBe(14_717_707);
  expect(face.eternalBeatIndex).toBe(15); expect(face.eternalStepIndex).toBe(23);
  expect(face.canonical.monthIndex).toBe(5);
  expect(Object.keys(face).some(key => /solar|anchor|rotationOverride/i.test(key))).toBe(false);
  expect(Object.keys(face.canonical).some(key => /solar|anchor/i.test(key))).toBe(false);
  expect(face.canonical.eternalStepFraction).toBeGreaterThan(0);
  expect(face.microCyclePercent).toBe(face.canonical.eternalStepFraction * 100);
  const firstM7 = Number((252n * N_DAY_MICRO + 999_999n) / 1_000_000n);
  const seventh = projectCanonicalKaiFace(firstM7);
  expect(seventh.monthLabel).toBe('Noktura'); expect(seventh.canonical.monthIndex).toBe(7);
});

it('ranks native pulse, step, and beat transitions while ignoring stale samples', () => {
  expect(kaiBoundary(10, 11)).toBe('pulse');
  expect(kaiBoundary(11, 12)).toBe('step');
  expect(kaiBoundary(485, 486)).toBe('beat');
  expect(kaiBoundary(486, 486)).toBe('none');
  expect(kaiBoundary(486, 485)).toBe('none');
});

it('explains exact frequency before its reciprocal period and lists seven six-day weeks', () => {
  const host = mount(); act(() => host.querySelector('button')!.click());
  const panel = host.querySelector('[role="dialog"]')!;
  expect(panel.textContent!.indexOf('1 / (3 + √5) Hz')).toBeLessThan(panel.textContent!.indexOf('3 + √5 seconds'));
  const weeks = [...panel.querySelectorAll('.kai-week-legend > li')];
  expect(weeks).toHaveLength(7);
  expect(weeks[0].textContent).toContain('Awakening Flame'); expect(weeks[0].textContent).toContain('D1–D6');
  expect(weeks[3].textContent).toContain('Harmonic Voice'); expect(weeks[3].textContent).toContain('Sapphire blue');
  expect(weeks[6].textContent).toContain('Krowned Light'); expect(weeks[6].textContent).toContain('D37–D42');
  expect(weeks[6].textContent).toContain('White-gold prism');
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
  expect(host.querySelector('.kai-klok')?.getAttribute('data-kai-visible')).toBe('false');
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(host.querySelector('button')!.textContent).toContain('14,717,707');
  expect(host.querySelector('.kai-klok')?.getAttribute('data-kai-boundary')).toBe('none');
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

it('keeps automatic local Chronos without reading location or permissions', async () => {
  const locate = vi.fn(), permission = vi.fn().mockResolvedValue({ state: 'granted' });
  vi.stubGlobal('navigator', { permissions: { query: permission }, geolocation: { getCurrentPosition: locate } });
  const host = mount(); act(() => host.querySelector('button')!.click());
  await act(async () => {});
  expect(host.querySelector('.kai-local-time')?.textContent).toContain('Local Chronos');
  expect(host.querySelector('.kai-local-time time')?.textContent).toBeTruthy();
  expect(host.querySelector('[aria-label="Time reference"]')).toBeNull();
  expect(locate).not.toHaveBeenCalled(); expect(permission).not.toHaveBeenCalled();
});

it('maps every native header ark, day and month to its approved Bankeiz presentation tone', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  for (let i = 0; i < 6; i++) {
    const micro = BigInt(i) * N_DAY_MICRO + BigInt(i * 6 + 2) * N_DAY_MICRO / 36n;
    const pulse = (micro + 999_999n) / 1_000_000n;
    vi.setSystemTime(Number(epochMsFromPulse(pulse)) + 2);
    const host = mount(), style = host.querySelector<HTMLElement>('.kai-klok')!.style;
    expect(style.getPropertyValue('--kai-phase')).toBe(BANK_KAI_PALETTE.light.phases[i]);
    expect(style.getPropertyValue('--kai-day')).toBe(BANK_KAI_PALETTE.light.days[i]);
  }
  for (let i = 0; i < 8; i++) {
    const pulse = (BigInt(i * 42) * N_DAY_MICRO + 999_999n) / 1_000_000n;
    vi.setSystemTime(Number(epochMsFromPulse(pulse)) + 2);
    const host = mount();
    expect(host.querySelector<HTMLElement>('.kai-klok')!.style.getPropertyValue('--kai-month')).toBe(BANK_KAI_PALETTE.light.months[i]);
  }
});
