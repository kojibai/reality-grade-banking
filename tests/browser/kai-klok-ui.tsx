import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConsoleShell } from '../../src/components/ConsoleShell';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';

// Interface-only fixture. The optional iframe creates a genuine narrow CSS
// viewport for browser environments whose outer viewport cannot be resized.
const params = new URLSearchParams(location.search), width = params.get('width'), sunrise = params.get('sunrise'), timing = params.has('timing');

// Query-gated browser evidence only. This bounded observer never drives Kai
// state or animation; it measures the actual compositor and DOM over a boundary.
function TimingProbe() {
  const [result, setResult] = useState('Open the Kai Klok, then record a native pulse boundary.');
  const running = useRef(false);
  const record = () => {
    if (running.current) return;
    const orb = document.querySelector('.orb-spin'), material = document.querySelector('.kai-cadence-breath');
    if (!orb || !material) { setResult('Open the Kai Klok first.'); return; }
    running.current = true; setResult('Recording the next native pulse boundary…');
    const start = performance.now(); let initialPulse = '', previous: object | undefined;
    const samples: object[] = [];
    const sample = (frameTime: number) => {
      const animation = orb.getAnimations()[0], breath = material.getAnimations()[0];
      const pulse = document.querySelector('[data-kai-eternal-pulse]')?.textContent ?? '';
      if (!initialPulse) initialPulse = pulse;
      const current = animation?.currentTime;
      const duration = Number(animation?.effect?.getTiming().duration ?? 0);
      const elapsed = typeof current === 'number' ? current : 0;
      const snapshot = { at: performance.now(), frameTime, timelineTime: document.timeline.currentTime, pulse, currentTime: current, startTime: animation?.startTime, breathTime: breath?.currentTime, duration, transform: getComputedStyle(orb).transform };
      if (duration - elapsed < 120 && pulse === initialPulse) { samples.push(snapshot); previous = snapshot; }
      if (pulse !== initialPulse) {
        if (!samples.length && previous) samples.push(previous);
        samples.push(snapshot);
        if (elapsed > 120 || performance.now() - start > 7000) { running.current = false; setResult(JSON.stringify({ initialPulse, precision: 'Browser frame and timer scheduling', samples }, null, 2)); return; }
      }
      previous = snapshot;
      if (performance.now() - start > 7500) { running.current = false; setResult(JSON.stringify({ error: 'No observed boundary', samples }, null, 2)); return; }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  };
  return <aside style={{ position: 'fixed', zIndex: 10000, bottom: 8, left: 8, maxHeight: 180, overflow: 'auto', width: 350, padding: 8, background: 'white' }}><button tabIndex={-1} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }} onClick={record}>Record next pulse</button><pre data-kai-timing-result style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{result}</pre></aside>;
}
if (width === '320' || width === '390' || width === '720') {
  const frame = document.createElement('iframe');
  const childParams = new URLSearchParams(); if (sunrise) childParams.set('sunrise', sunrise); if (timing) childParams.set('timing', '1');
  frame.title = `${width}px Kai Klok viewport`; frame.src = location.pathname + (childParams.size ? `?${childParams}` : '');
  frame.style.cssText = `display:block;width:${width}px;height:844px;border:0;margin:0 auto;background:#fcfbf8`;
  document.getElementById('root')!.append(frame);
} else {
  // Deterministic, interface-only QA. This never opens a real browser location
  // prompt or reads a user's coordinates. Production has no fixture switch.
  if (sunrise === 'success' || sunrise === 'denied' || sunrise === 'unavailable') {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'prompt' }) } });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success: PositionCallback, error: PositionErrorCallback) => {
      setTimeout(() => sunrise === 'success' ? success({ coords: { latitude: 40.7128, longitude: -74.006 } } as GeolocationPosition) : error({ code: sunrise === 'denied' ? 1 : 2 } as GeolocationPositionError), 400);
    } } });
  }
  const noop = () => {};
  createRoot(document.getElementById('root')!).render(<ConsoleShell panel="ledger" onNavigate={noop} onProfile={noop} onDeposit={noop}><h1 className="page-title">Ledger</h1><p className="page-subtitle">Every movement keeps its story.</p><p className="body-copy small-copy">{sunrise ? 'Synthetic sunrise preview · no location permission requested.' : 'Header preview · no account or money connected.'}</p>{timing && <TimingProbe />}</ConsoleShell>);
}
