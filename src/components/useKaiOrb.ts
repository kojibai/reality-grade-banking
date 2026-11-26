import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { animateKaiPulseOrb, type KaiPulseMotion } from './kai-klok-motion';

export function useKaiOrb(face: RefObject<HTMLDivElement | null>, pulse: number, visible: boolean, revision: number, readMotion: () => KaiPulseMotion) {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const cycle = useRef<ReturnType<typeof animateKaiPulseOrb> | null>(null);
  useLayoutEffect(() => {
    const orb = face.current?.querySelector('.orb-spin');
    if (!orb || !visible || reduced || typeof orb.animate !== 'function') return;
    const animation = animateKaiPulseOrb(orb, readMotion, face.current?.querySelector('.kai-cadence-breath') ?? undefined);
    cycle.current = animation;
    return () => { cycle.current = null; animation.cancel(); };
  }, [face, visible, readMotion, reduced]);
  // The pulse and material share one native phase sample. Keep their
  // compositor objects through boundaries and re-anchor them together.
  useLayoutEffect(() => {
    cycle.current?.reanchor(pulse);
  }, [face, pulse, revision, visible, readMotion, reduced]);
}
