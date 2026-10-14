import { useId, useState, type PointerEvent } from 'react';
export type ChartPeriod = '1W' | '1M' | '1Y' | 'ALL';
export function ValueChart({ values, compact = false, color = 'blue', label = 'Account balance', onInspect, tooltip }: { values: number[]; compact?: boolean; color?: 'blue' | 'green' | 'navy'; label?: string; onInspect?: (value: number) => void; tooltip?: (index: number) => { value: string; label: string } }) {
  const gradient = useId().replace(/:/g, ''), [active, setActive] = useState<number | null>(null);
  if (!values.length || values.some(value => !Number.isFinite(value))) return <div className="chart-empty">History will appear as balances are observed.</div>;
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 1);
  const width = 320, height = compact ? 66 : 124, pad = compact ? 6 : 12;
  const points = values.map((value, i) => ({ x: values.length === 1 ? width / 2 : pad + i / (values.length - 1) * (width - pad * 2), y: max === min ? height / 2 : height - pad - (value - min) / span * (height - pad * 2) }));
  const path = points.map((point, i) => i === 0 ? `M${point.x},${point.y}` : `C${(points[i - 1].x + point.x) / 2},${points[i - 1].y} ${(points[i - 1].x + point.x) / 2},${point.y} ${point.x},${point.y}`).join(' ');
  const last = points.at(-1)!, index = active === null ? null : Math.min(active, values.length - 1), selected = index === null ? undefined : points[index];
  const detail = index === null ? null : tooltip?.(index) ?? { value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(values[index]), label };
  const inspect = (event: PointerEvent<SVGSVGElement>) => { if (compact) return; const bounds = event.currentTarget.getBoundingClientRect(); const next = Math.max(0, Math.min(values.length - 1, Math.round((event.clientX - bounds.left) / bounds.width * (values.length - 1)))); setActive(next); onInspect?.(values[next]); };
  return <div className={`value-chart ${compact ? 'compact' : ''} ${color}`}>
    {selected && detail && <div className="chart-tooltip" role="status" style={{ left: `${Math.max(23, Math.min(77, selected.x / width * 100))}%` }}><strong>{detail.value}</strong><span>{detail.label}</span></div>}
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" tabIndex={compact ? undefined : 0} aria-label={`${label}, from ${values[0]} to ${values.at(-1)}`} onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)} onKeyDown={event => { if (compact || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const next = Math.max(0, Math.min(values.length - 1, (index ?? values.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))); setActive(next); onInspect?.(values[next]); }}>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".19" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
      {points.length > 1 && <path d={`${path} L${last.x},${height} L${points[0].x},${height} Z`} fill={`url(#${gradient})`} />}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={compact ? 2.7 : 2.2} strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={compact ? 0 : 3.3} fill="currentColor" />
      {selected && <g><line x1={selected.x} y1="0" x2={selected.x} y2={height} stroke="currentColor" strokeDasharray="3 3" opacity=".3" /><circle cx={selected.x} cy={selected.y} r="4" fill="currentColor" /></g>}
    </svg>
  </div>;
}
export function Periods({ value, onChange }: { value: ChartPeriod; onChange: (period: ChartPeriod) => void }) { return <div className="periods" aria-label="Chart period">{(['1W', '1M', '1Y', 'ALL'] as const).map(period => <button key={period} aria-pressed={value === period} className={value === period ? 'active' : ''} onClick={() => onChange(period)}>{period}</button>)}</div>; }
