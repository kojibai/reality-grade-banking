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
it('shows exact touch tooltips and keeps an isolated live balance point centered', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<ValueChart values={[123]} tooltip={() => ({ value: '$123.00', label: 'Today · Settlement' })} />));
    const svg = host.querySelector('svg')!;
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ left: 0, width: 320 }) });
    act(() => svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 140 })));
    expect(host.textContent).toContain('$123.00'); expect(host.textContent).toContain('Today · Settlement');
    expect(host.querySelector('circle')?.getAttribute('cx')).toBe('160');
    act(() => root.render(<ValueChart values={[]} />));
    expect(host.innerHTML).not.toContain('NaN'); expect(host.innerHTML).not.toContain('undefined');
  } finally { act(() => root.unmount()); }
});
