import { useEffect, useState } from 'react';
import { KaiTimeSource, msUntilNextPulseBoundary } from '../../native/receiz/app/utils/kai_pulse';

function liveSource() {
  const started = performance.now();
  // Reseed the canonical monotonic engine from the current device instant on
  // resume. This covers platforms whose performance timer pauses during sleep.
  return new KaiTimeSource({ ignoreOverride: true, clock: { timeOrigin: Date.now(), now: () => performance.now() - started } });
}

/** Only this small header subtree ticks; one boundary timer, no network. */
export function useKaiKlok(active = true) {
  const [pulse, setPulse] = useState(() => liveSource().nowPulse());
  useEffect(() => {
    if (!active) return;
    let source = liveSource(), timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const tick = () => {
      stop();
      if (document.visibilityState === 'hidden') return;
      setPulse(source.nowPulse());
      timer = setTimeout(tick, Math.max(20, msUntilNextPulseBoundary(undefined, source) + 2));
    };
    const resume = () => { source = liveSource(); tick(); };
    const visibility = () => { if (document.visibilityState === 'hidden') stop(); else resume(); };
    tick();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pagehide', stop);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pagehide', stop);
    };
  }, [active]);
  return pulse;
}
