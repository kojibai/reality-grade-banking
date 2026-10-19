import { useCallback, useEffect, useRef, useState } from 'react';
import { projectKaiSunrise, type KaiSunriseLocation } from './kai-klok-sunrise';

type Status = 'unconfigured' | 'pending' | 'ready' | 'denied' | 'unavailable';

/** Location is optional, session-only, and affects the solar reference alone. */
export function useKaiSunrise(pulse: number) {
  const [preference, setPreference] = useState<'local' | 'greenwich'>('local');
  const [location, setLocation] = useState<KaiSunriseLocation>();
  const [status, setStatus] = useState<Status>('unconfigured');
  const mounted = useRef(true), requested = useRef(false), generation = useRef(0), preferenceRef = useRef(preference);
  const request = useCallback(() => {
    requested.current = true;
    const requestId = ++generation.current;
    if (!navigator.geolocation) { setLocation(undefined); setStatus('unavailable'); return; }
    setStatus('pending');
    try { navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current || requestId !== generation.current) return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setLocation(undefined); setStatus('unavailable'); return; }
      setLocation({ latitude, longitude }); setStatus('ready');
    }, error => {
      if (mounted.current && requestId === generation.current) { setLocation(undefined); setStatus(error.code === 1 ? 'denied' : 'unavailable'); }
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 }); }
    catch { if (mounted.current && requestId === generation.current) { setLocation(undefined); setStatus('unavailable'); } }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // A granted permission can be reused silently. Querying permission never
    // prompts; prompt/unsupported states wait for the explicit button.
    const permissionGeneration = generation.current;
    if (navigator.permissions?.query) void navigator.permissions.query({ name: 'geolocation' }).then(permission => {
      if (mounted.current && generation.current === permissionGeneration && !requested.current && preferenceRef.current === 'local' && permission.state === 'granted') request();
    }).catch(() => {});
    return () => { mounted.current = false; generation.current++; };
  }, [request]);
  const effective = projectKaiSunrise(pulse, preference === 'local' ? location : undefined);
  const clear = () => { generation.current++; requested.current = true; setLocation(undefined); setStatus('unconfigured'); };
  const selectPreference = (next: typeof preference) => { preferenceRef.current = next; setPreference(next); };
  return { ...effective, preference, setPreference: selectPreference, status, request, clear, hasLocation: !!location };
}
