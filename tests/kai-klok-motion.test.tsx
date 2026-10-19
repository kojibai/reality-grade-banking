// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { KaiKlok } from '../src/components/KaiKlok';
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
  const cycle = animateKaiPulseOrb(orb as unknown as Element, read, 42, breath as unknown as Element);
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
  animateKaiPulseOrb(orb as unknown as Element, () => kaiPulseMotionFromMicro(43_001_000n), 42);
  expect(animation.currentTime).toBe(KAI_PULSE_MOTION_MS);
});

it('resynchronizes in the same pulse on foreground focus and cancels for hidden or reduced-motion state', () => {
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
  act(() => window.dispatchEvent(new Event('focus')));
  expect(initial.cancel).toHaveBeenCalledOnce(); expect(animations).toHaveLength(4);
  expect(animations[2].currentTime).toBeGreaterThan(2500); expect(animations[2].currentTime).toBeLessThan(2700);
  act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(animations[2].cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(animations).toHaveLength(6); expect(vi.getTimerCount()).toBe(1);
  act(() => { media.matches = true; mediaListener(); });
  expect(animations[4].cancel).toHaveBeenCalledOnce(); expect(animations[5].cancel).toHaveBeenCalledOnce();
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
