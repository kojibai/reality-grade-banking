import { buildKaiKlockResponseFromPulseSync } from '../../native/receiz/app/utils/kai_pulse';

// Native fixed-point subdivision rendering, not the rounded PULSE_MS timer
// constant. Every bounded animation is reseeded from authoritative μpulses.
export const KAI_PULSE_MOTION_MS = buildKaiKlockResponseFromPulseSync(0n).subdivisions.kai_pulse.duration * 1000;

export function kaiPulseMotionFromMicro(micro: bigint) {
  const phaseMicro = (micro % 1_000_000n + 1_000_000n) % 1_000_000n;
  const phase = Number(phaseMicro) / 1_000_000;
  return { pulse: Number((micro - phaseMicro) / 1_000_000n), phase, angle: phase * 360, periodMs: KAI_PULSE_MOTION_MS };
}
export type KaiPulseMotion = ReturnType<typeof kaiPulseMotionFromMicro> & { sampledAt?: number };

/** One native pulse, composited by the browser; never an independent loop. */
export function animateKaiPulseOrb(orb: Element, readMotion: () => KaiPulseMotion, material?: Element) {
  const animation = orb.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: KAI_PULSE_MOTION_MS, iterations: 1, easing: 'linear', fill: 'forwards',
  });
  const breath = material?.animate([
    { opacity: .08, transform: 'scale(1)' },
    { opacity: .16, transform: 'scale(1.0015)' },
    { opacity: .08, transform: 'scale(1)' },
  ], { duration: KAI_PULSE_MOTION_MS, iterations: 1, easing: 'ease-in-out', fill: 'forwards' });
  let orbCompletion: Promise<Animation> | undefined, breathCompletion: Promise<Animation> | undefined;
  // Sample the held source at effect commit, after compositor objects exist.
  // If a boundary passed during rendering, hold the top until the native sample
  // catches the display up; never let a stale render start a second time law.
  const reanchor = (displayedPulse: number) => {
    const motion = readMotion();
    const currentTime = motion.pulse === displayedPulse ? motion.phase * motion.periodMs : motion.periodMs;
    animation.currentTime = currentTime;
    if (breath) breath.currentTime = currentTime;
    if (motion.sampledAt !== undefined) {
      // Default document timeline and performance timestamps share a time origin.
      // Pin the timeline immediately so pending animation startup cannot add a
      // render-frame delay to the sampled native phase.
      animation.startTime = motion.sampledAt - currentTime;
      if (breath) breath.startTime = motion.sampledAt - currentTime;
    }
    // A sweep that has reached its end gets a new completion promise on
    // reanchoring. Observe each promise once before a later cancellation.
    if (animation.finished !== orbCompletion) {
      orbCompletion = animation.finished;
      void orbCompletion?.catch(() => {});
    }
    if (breath?.finished !== breathCompletion) {
      breathCompletion = breath?.finished;
      void breathCompletion?.catch(() => {});
    }
  };
  return { reanchor, cancel: () => { animation.cancel(); breath?.cancel(); } };
}
