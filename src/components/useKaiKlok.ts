import { useCallback, useEffect, useRef, useState } from 'react';
import { KaiTimeSource, msUntilNextPulseBoundary } from '../../native/receiz/app/utils/kai_pulse';
import { kaiBoundary, type KaiBoundary } from './kai-klok-face';
import { kaiPulseMotionFromMicro } from './kai-klok-motion';

function liveSource() {
  const started = performance.now();
  // Reseed the canonical monotonic engine from the current device instant on
  // resume. This covers platforms whose performance timer pauses during sleep.
  return new KaiTimeSource({ ignoreOverride: true, clock: { timeOrigin: Date.now(), now: () => performance.now() - started } });
}

/** Only this small header subtree ticks; one boundary timer, no network. */
export function useKaiKlok(active = true) {
  const sourceRef = useRef<KaiTimeSource | null>(null);
  if (!sourceRef.current) sourceRef.current = liveSource();
  const readPulseMotion = useCallback(() => {
    const before = performance.now(), micro = sourceRef.current!.nowMicroPulses(), after = performance.now();
    return { ...kaiPulseMotionFromMicro(micro), sampledAt: (before + after) / 2 };
  }, []);
  const [sample, setSample] = useState(() => ({ pulse: sourceRef.current!.nowPulse(), boundary: 'none' as KaiBoundary, visible: typeof document === 'undefined' || document.visibilityState !== 'hidden', revision: 0 }));
  useEffect(() => {
    if (!active) return;
    let source = liveSource(), timer: ReturnType<typeof setTimeout> | undefined;
    sourceRef.current = source;
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const tick = (resuming = false) => {
      stop();
      if (document.visibilityState === 'hidden') return;
      const pulse = source.nowPulse();
      setSample(previous => pulse === previous.pulse && previous.visible && !resuming ? previous : { pulse, boundary: resuming ? 'none' : kaiBoundary(previous.pulse, pulse), visible: true, revision: previous.revision + (resuming ? 1 : 0) });
      timer = setTimeout(() => tick(), Math.max(20, msUntilNextPulseBoundary(undefined, source) + 2));
    };
    const pause = () => { stop(); setSample(previous => ({ ...previous, boundary: 'none', visible: false })); };
    const resume = () => { source = liveSource(); sourceRef.current = source; tick(true); };
    const visibility = () => { if (document.visibilityState === 'hidden') pause(); else resume(); };
    tick(true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pagehide', pause);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pagehide', pause);
    };
  }, [active]);
  return { ...sample, readPulseMotion };
}
