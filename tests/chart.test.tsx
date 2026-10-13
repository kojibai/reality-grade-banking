// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { ValueChart } from '../src/components/ValueChart';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('retains a valid chart render when a hovered selection outlives keyboard period activation', () => {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  function PeriodChart() { const [short, setShort] = useState(false); return <><ValueChart values={Array.from({ length: short ? 8 : 24 }, (_, i) => i + 1)} /><button onClick={() => setShort(true)}>1W</button></>; }
  act(() => root.render(<PeriodChart />));
  const button = host.querySelector('button')!; button.focus();
  const svg = host.querySelector('svg')!;
  Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ left: 0, width: 320 }) });
  act(() => svg.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 319 })));
  expect(() => act(() => button.click())).not.toThrow();
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('to 8');
  act(() => root.unmount()); host.remove();
});
