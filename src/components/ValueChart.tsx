import { useId, useState } from 'react';
export type ChartPeriod = '1W' | '1M' | '1Y' | 'ALL';

export function ValueChart({ values, compact = false, color = 'blue', label = 'Account balance', onInspect }: { values: number[]; compact?: boolean; color?: 'blue' | 'green'; label?: string; onInspect?: (value: number) => void }) {
  const gradient = useId().replace(/:/g, '');
  const [active, setActive] = useState<number | null>(null);
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 1);
  const width = 320, height = compact ? 66 : 124, pad = compact ? 6 : 12;
  const points = values.map((value, i) => ({ x: pad + i / Math.max(values.length - 1, 1) * (width - pad * 2), y: height - pad - (value - min) / span * (height - pad * 2) }));
  const path = points.map((point, i) => i === 0 ? `M${point.x},${point.y}` : `C${(points[i - 1].x + point.x) / 2},${points[i - 1].y} ${(points[i - 1].x + point.x) / 2},${point.y} ${point.x},${point.y}`).join(' ');
  const last = points.at(-1)!;
  return <div className={`value-chart ${compact ? 'compact' : ''} ${color}`}><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label}, from ${values[0]} to ${values.at(-1)}`} onPointerMove={event => { if (compact) return; const bounds = event.currentTarget.getBoundingClientRect(); const index = Math.max(0, Math.min(values.length - 1, Math.round((event.clientX - bounds.left) / bounds.width * (values.length - 1)))); setActive(index); onInspect?.(values[index]); }} onPointerLeave={() => setActive(null)}><defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".17" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs><path d={`${path} L${last.x},${height} L${points[0].x},${height} Z`} fill={`url(#${gradient})`} /><path d={path} fill="none" stroke="currentColor" strokeWidth={compact ? 2.7 : 2.2} strokeLinecap="round" /><circle cx={last.x} cy={last.y} r={compact ? 0 : 3.3} fill="currentColor" />{active !== null && <g><line x1={points[active].x} y1="0" x2={points[active].x} y2={height} stroke="currentColor" strokeDasharray="3 3" opacity=".3" /><circle cx={points[active].x} cy={points[active].y} r="4" fill="currentColor" /></g>}</svg></div>;
}

export function Periods({ value, onChange }: { value: ChartPeriod; onChange: (period: ChartPeriod) => void }) { return <div className="periods" aria-label="Chart period">{(['1W', '1M', '1Y', 'ALL'] as const).map(period => <button key={period} aria-pressed={value === period} className={value === period ? 'active' : ''} onClick={() => onChange(period)}>{period}</button>)}</div>; }
