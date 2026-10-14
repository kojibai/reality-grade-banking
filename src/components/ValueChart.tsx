import { useId, useMemo, useState, type PointerEvent } from 'react';
import { CHART_PERIODS, sampleChartIndices, type ChartPeriod } from '../core/chart-history';
export type { ChartPeriod } from '../core/chart-history';
export function ValueChart({ values, times, compact = false, color = 'blue', label = 'Account balance', onInspect, tooltip }: { values: number[]; times?: number[]; compact?: boolean; color?: 'blue' | 'green' | 'red' | 'navy'; label?: string; onInspect?: (value: number) => void; tooltip?: (index: number) => { value: string; label: string } }) {
  const gradient = useId().replace(/:/g, ''), [active, setActive] = useState<number | null>(null);
  const width = 320, height = compact ? 66 : 124, pad = compact ? 6 : 12;
  const geometry = useMemo(() => {
    if (!values.length || values.some(value => !Number.isFinite(value))) return null;
    let min = values[0], max = values[0]; for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
    const span = Math.max(max - min, 1);
    const timed = times?.length === values.length && times.every((time, index) => Number.isFinite(time) && (!index || time >= times[index - 1])) && times.at(-1)! > times[0];
    const x = (index: number) => values.length === 1 ? width / 2 : pad + (timed ? (times![index] - times![0]) / (times!.at(-1)! - times![0]) : index / (values.length - 1)) * (width - pad * 2);
    const y = (index: number) => max === min ? height / 2 : height - pad - (values[index] - min) / span * (height - pad * 2);
    const points = sampleChartIndices(values, compact ? 96 : 320).map(index => ({ index, x: x(index), y: y(index) }));
    const path = points.map((point, i) => i === 0 ? `M${point.x},${point.y}` : `C${(points[i - 1].x + point.x) / 2},${points[i - 1].y} ${(points[i - 1].x + point.x) / 2},${point.y} ${point.x},${point.y}`).join(' ');
    return { points, path, timed, x, y };
  }, [values, times, compact, height, pad]);
  if (!geometry) return <div className="chart-empty">Value history will appear here.</div>;
  const { points, path } = geometry, last = points.at(-1)!, index = active === null ? null : Math.min(active, values.length - 1);
  const selected = index === null ? null : { x: geometry.x(index), y: geometry.y(index) };
  const detail = index === null ? null : tooltip?.(index) ?? { value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(values[index]), label };
  const inspect = (event: PointerEvent<SVGSVGElement>) => {
    if (compact) return; const bounds = event.currentTarget.getBoundingClientRect(); if (!bounds.width) return;
    const proportion = Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * width - pad) / (width - pad * 2)));
    let next = Math.round(proportion * (values.length - 1));
    if (geometry.timed) { const target = times![0] + proportion * (times!.at(-1)! - times![0]); let lo = 0, hi = times!.length - 1; while (lo < hi) { const mid = (lo + hi) >>> 1; if (times![mid] < target) lo = mid + 1; else hi = mid; } next = lo > 0 && target - times![lo - 1] <= times![lo] - target ? lo - 1 : lo; }
    setActive(next); onInspect?.(values[next]);
  };
  return <div className={`value-chart ${compact ? 'compact' : ''} ${color}`}>
    {selected && detail && <div className="chart-tooltip" role="status" style={{ left: `${Math.max(23, Math.min(77, selected.x / width * 100))}%` }}><strong>{detail.value}</strong><span>{detail.label}</span></div>}
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" tabIndex={compact ? undefined : 0} aria-label={`${label}, from ${values[0]} to ${values.at(-1)}`} onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)} onKeyDown={event => { if (compact || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : Math.max(0, Math.min(values.length - 1, (index ?? values.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))); setActive(next); onInspect?.(values[next]); }}>
      <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".19" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
      {points.length > 1 && <path d={`${path} L${last.x},${height} L${points[0].x},${height} Z`} fill={`url(#${gradient})`} />}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={compact ? 2.7 : 2.2} strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={compact ? 0 : 3.3} fill="currentColor" />
      {selected && <g><line x1={selected.x} y1="0" x2={selected.x} y2={height} stroke="currentColor" strokeDasharray="3 3" opacity=".3" /><circle cx={selected.x} cy={selected.y} r="4" fill="currentColor" /></g>}
    </svg>
  </div>;
}
export function Periods({ value, onChange }: { value: ChartPeriod; onChange: (period: ChartPeriod) => void }) { return <div className="periods" aria-label="Chart period">{CHART_PERIODS.map(period => <button key={period} aria-pressed={value === period} className={value === period ? 'active' : ''} onClick={() => onChange(period)}>{period === 'ALL' ? 'All' : period}</button>)}</div>; }
