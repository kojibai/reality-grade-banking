import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
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
  useLayoutEffect(() => {
    const orb = face.current?.querySelector('.orb-spin');
    if (!orb || !visible || reduced || typeof orb.animate !== 'function') return;
    const animation = animateKaiPulseOrb(orb, readMotion, pulse, face.current?.querySelector('.kai-cadence-breath') ?? undefined);
    return () => animation.cancel();
  }, [face, pulse, visible, revision, readMotion, reduced]);
}
