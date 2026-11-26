// @vitest-environment happy-dom
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { KaiKlok } from '../src/components/KaiKlok';
import { useKaiOrb } from '../src/components/useKaiOrb';
import { animateKaiPulseOrb, kaiPulseMotionFromMicro, KAI_PULSE_MOTION_MS } from '../src/components/kai-klok-motion';
import { epochMsFromPulse } from '../native/receiz/app/utils/kai_pulse';
import { GENESIS_TS } from '../native/receiz/app/utils/kai_pulse';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
afterEach(() => {
  if (root) act(() => root!.unmount()); root = undefined;
  document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
});

it('puts the orb at top on native pulse boundaries and half a turn at the exact μpulse midpoint', () => {
  const pulse = 14_717_707n * 1_000_000n;
  expect(kaiPulseMotionFromMicro(pulse)).toMatchObject({ pulse: 14_717_707, phase: 0, angle: 0 });
  expect(kaiPulseMotionFromMicro(pulse + 500_000n)).toMatchObject({ phase: .5, angle: 180 });
  expect(kaiPulseMotionFromMicro(pulse + 1_000_000n)).toMatchObject({ pulse: 14_717_708, phase: 0, angle: 0 });
  expect(KAI_PULSE_MOTION_MS).toBeCloseTo(5236.067977, 6);
  expect(KAI_PULSE_MOTION_MS).not.toBe(5236);
});

it('samples the held native source after animation creation and aligns one bounded sweep and breath', () => {
  const orbAnimation = { currentTime: 0, startTime: 0, cancel: vi.fn() }, breathAnimation = { currentTime: 0, startTime: 0, cancel: vi.fn() };
  const orb = { animate: vi.fn((_frames: Keyframe[], _options: KeyframeAnimationOptions) => orbAnimation) }, breath = { animate: vi.fn((_frames: Keyframe[], _options: KeyframeAnimationOptions) => breathAnimation) };
  const read = vi.fn(() => {
    expect(orb.animate).toHaveBeenCalledTimes(1); expect(breath.animate).toHaveBeenCalledTimes(1);
    return { ...kaiPulseMotionFromMicro(42_500_000n), sampledAt: 10_000 };
  });
  const cycle = animateKaiPulseOrb(orb as unknown as Element, read, breath as unknown as Element);
  cycle.reanchor(42);
  expect(orbAnimation.currentTime).toBe(KAI_PULSE_MOTION_MS / 2);
  expect(breathAnimation.currentTime).toBe(orbAnimation.currentTime);
  expect(orbAnimation.startTime).toBe(10_000 - KAI_PULSE_MOTION_MS / 2);
  expect(breathAnimation.startTime).toBe(orbAnimation.startTime);
  expect(orb.animate.mock.calls[0]?.[1]).toMatchObject({ duration: KAI_PULSE_MOTION_MS, iterations: 1, easing: 'linear' });
  cycle.cancel(); expect(orbAnimation.cancel).toHaveBeenCalledOnce(); expect(breathAnimation.cancel).toHaveBeenCalledOnce();
});

it('holds the top if a native boundary passed before the effect committed', () => {
  const animation = { currentTime: 0, cancel: vi.fn() };
  const orb = { animate: () => animation };
  animateKaiPulseOrb(orb as unknown as Element, () => kaiPulseMotionFromMicro(43_001_000n)).reanchor(42);
  expect(animation.currentTime).toBe(KAI_PULSE_MOTION_MS);
});

it('samples the native source once per required controller anchor', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { cancel: vi.fn() }; animations.push(animation); return animation; }) });
  let sampledPulse = 42;
  const readMotion = vi.fn(() => ({ ...kaiPulseMotionFromMicro(BigInt(sampledPulse) * 1_000_000n + 500_000n), sampledAt: 1000 }));
  function Orb({ pulse, visible = true, revision }: { pulse: number; visible?: boolean; revision: number }) {
    const face = useRef<HTMLDivElement>(null);
    useKaiOrb(face, pulse, visible, revision, readMotion);
    return <div ref={face}><span className="orb-spin" /><span className="kai-cadence-breath" /></div>;
  }
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<Orb pulse={42} revision={0} />));
  expect(readMotion).toHaveBeenCalledTimes(1); expect(animations).toHaveLength(2);
  act(() => root!.render(<Orb pulse={42} revision={0} />));
  expect(readMotion).toHaveBeenCalledTimes(1);
  act(() => root!.render(<Orb pulse={42} revision={1} />));
  expect(readMotion).toHaveBeenCalledTimes(2); expect(animations).toHaveLength(2);
  sampledPulse = 43;
  act(() => root!.render(<Orb pulse={43} revision={2} />));
  expect(readMotion).toHaveBeenCalledTimes(3); expect(animations).toHaveLength(2);
  act(() => root!.render(<Orb pulse={43} revision={2} visible={false} />));
  expect(readMotion).toHaveBeenCalledTimes(3);
  act(() => root!.render(<Orb pulse={43} revision={3} />));
  expect(readMotion).toHaveBeenCalledTimes(4); expect(animations).toHaveLength(4);
  act(() => root!.unmount()); root = undefined;
  expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
});

it('keeps a running sweep through duplicate focus and resynchronizes once after hidden or reduced-motion state', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  vi.stubGlobal('navigator', {});
  let visibility = 'visible', mediaListener = () => {};
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState);
  const media = { matches: false, addEventListener: (_: string, callback: () => void) => { mediaListener = callback; }, removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  const animations: { currentTime: number; cancel: ReturnType<typeof vi.fn> }[] = [];
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { currentTime: 0, cancel: vi.fn() }; animations.push(animation); return animation; }) });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok />)); act(() => host.querySelector('button')!.click());
  expect(animations).toHaveLength(2);
  const initial = animations[0];
  act(() => vi.advanceTimersByTime(2600));
  for (let i = 0; i < 5; i++) act(() => window.dispatchEvent(new Event('focus')));
  expect(initial.cancel).not.toHaveBeenCalled(); expect(animations).toHaveLength(2);
  act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(initial.cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  act(() => window.dispatchEvent(new Event('pageshow')));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(animations).toHaveLength(4); expect(vi.getTimerCount()).toBe(1);
  expect(animations[2].currentTime).toBeGreaterThan(2500); expect(animations[2].currentTime).toBeLessThan(2700);
  act(() => { media.matches = true; mediaListener(); });
  expect(animations[2].cancel).toHaveBeenCalledOnce(); expect(animations[3].cancel).toHaveBeenCalledOnce();
});

it('reanchors once after pagehide and BFCache return when the performance timer did not advance', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  const animations: { currentTime: number; cancel: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { currentTime: 0, cancel: vi.fn() }; animations.push(animation); return animation; }) });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok />)); act(() => host.querySelector('button')!.click());
  const orb = host.querySelector('.orb-spin');
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(vi.getTimerCount()).toBe(0); expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
  vi.setSystemTime(Number(epochMsFromPulse(14_717_711n)) + 1000);
  const shown = new Event('pageshow'); Object.defineProperty(shown, 'persisted', { value: true });
  act(() => window.dispatchEvent(shown));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(animations).toHaveLength(4); expect(vi.getTimerCount()).toBe(1);
  expect(host.querySelector('.orb-spin')).toBe(orb);
  expect(host.querySelector('.kai-header-button')?.textContent).toContain('14,717,711');
  expect(animations[2].currentTime).toBeGreaterThan(990); expect(animations[2].currentTime).toBeLessThan(1010);
  act(() => root!.unmount()); root = undefined;
  expect(vi.getTimerCount()).toBe(0); expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
});

it('reanchors the same animation on focus-only sleep recovery when performance did not advance', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const animations: { currentTime: number; startTime: number; cancel: ReturnType<typeof vi.fn> }[] = [];
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { currentTime: 0, startTime: 0, cancel: vi.fn() }; animations.push(animation); return animation; }) });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok />)); act(() => host.querySelector('button')!.click());
  const orb = host.querySelector('.orb-spin'), performanceBefore = performance.now();
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 1000);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(performance.now()).toBe(performanceBefore);
  expect(animations).toHaveLength(2); expect(animations[0].cancel).not.toHaveBeenCalled();
  expect(animations[0].currentTime).toBeGreaterThan(990); expect(animations[0].currentTime).toBeLessThan(1010);
  expect(animations[1].currentTime).toBe(animations[0].currentTime);
  expect(animations[0].startTime).toBe(performanceBefore - animations[0].currentTime);
  expect(animations[1].startTime).toBe(animations[0].startTime);
  vi.setSystemTime(Number(epochMsFromPulse(14_717_711n)) + 1000);
  act(() => window.dispatchEvent(new Event('focus')));
  expect(performance.now()).toBe(performanceBefore); expect(vi.getTimerCount()).toBe(1);
  expect(animations).toHaveLength(2); expect(animations[0].cancel).not.toHaveBeenCalled();
  expect(host.querySelector('.orb-spin')).toBe(orb);
  expect(host.querySelector('.kai-header-button')?.textContent).toContain('14,717,711');
  expect(animations[0].currentTime).toBeGreaterThan(990); expect(animations[0].currentTime).toBeLessThan(1010);
  expect(animations[1].currentTime).toBe(animations[0].currentTime);
});

it('keeps one native boundary timer and reanchors the existing orb at the next pulse', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const animations: { currentTime: number; cancel: ReturnType<typeof vi.fn> }[] = [];
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { currentTime: 0, cancel: vi.fn() }; animations.push(animation); return animation; }) });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok />)); act(() => host.querySelector('button')!.click());
  const orb = host.querySelector('.orb-spin');
  expect(vi.getTimerCount()).toBe(1); expect(animations).toHaveLength(2);
  act(() => vi.advanceTimersByTime(5200));
  expect(animations).toHaveLength(2);
  act(() => vi.advanceTimersByTime(40));
  expect(animations).toHaveLength(2); expect(vi.getTimerCount()).toBe(1);
  expect(animations[0].cancel).not.toHaveBeenCalled(); expect(animations[1].cancel).not.toHaveBeenCalled();
  expect(host.querySelector('.orb-spin')).toBe(orb);
  expect(animations[0].currentTime).toBeGreaterThanOrEqual(0); expect(animations[0].currentTime).toBeLessThan(20);
  expect(animations[0].currentTime).toBe(animations[1].currentTime);
  expect(host.querySelector('.kai-header-button')?.textContent).toContain('14,717,708');
});

it('balances motion subscriptions and animation disposal across five explicit open and close visits', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 1000);
  const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener');
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => { const animation = { cancel: vi.fn() }; animations.push(animation); return animation; }) });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok />));
  for (let i = 0; i < 5; i++) {
    act(() => host.querySelector<HTMLButtonElement>('.kai-header-button')!.click());
    expect(host.querySelectorAll('.orb-spin')).toHaveLength(1);
    act(() => host.querySelector<HTMLButtonElement>('.kai-close')!.click());
    expect(host.querySelector('.orb-spin')).toBeNull(); expect(vi.getTimerCount()).toBe(1);
  }
  expect(animations).toHaveLength(10); expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
  expect(media.addEventListener).toHaveBeenCalledTimes(5); expect(media.removeEventListener).toHaveBeenCalledTimes(5);
  act(() => root!.unmount()); root = undefined;
  expect(vi.getTimerCount()).toBe(0);
  for (const event of ['focus', 'pageshow', 'pagehide']) {
    expect(add.mock.calls.filter(([name]) => name === event)).toHaveLength(1);
    expect(remove.mock.calls.filter(([name]) => name === event)).toHaveLength(1);
  }
});

it('reseeds on activation after an inactive device sleep whose performance timer did not advance', () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(GENESIS_TS + 2); vi.stubGlobal('navigator', {});
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<KaiKlok active={false} />));
  expect(vi.getTimerCount()).toBe(0);
  vi.setSystemTime(Number(epochMsFromPulse(14_717_707n)) + 2);
  act(() => root!.render(<KaiKlok active />));
  expect(host.querySelector('.kai-header-button')?.textContent).toContain('14,717,707');
  expect(vi.getTimerCount()).toBe(1);
});
